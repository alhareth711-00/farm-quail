import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Battery, BatteryTier } from '../../types';
import { STRICT_ARABIC_BATTERY_ORDER } from '../../types';
import { useToast } from '../../context/ToastContext';
import { calculateFlockAgeInfo } from '../../utils/birdAgeUtils';
import {
  Grid,
  Plus,
  AlertTriangle,
  FileText,
  Skull,
  Egg,
  X,
  ChevronDown,
  Layers,
  Heart,
  Save,
  CheckCircle2,
  Clock,
  Flame,
  Calendar,
  Trash2,
} from 'lucide-react';

export const BatteryGridView: React.FC = () => {
  const { toast } = useToast();

  const batteries = useLiveQuery(() => db.batteries.toArray(), []);
  const tiers = useLiveQuery(() => db.tiers.toArray(), []);

  const [selectedBatteryId, setSelectedBatteryId] = useState<string>('bat-1');
  const [showQuickBatteryMatrix, setShowQuickBatteryMatrix] = useState(false);

  // Modals state
  const [showAddBatteryModal, setShowAddBatteryModal] = useState(false);
  const [newBatteryName, setNewBatteryName] = useState('');

  // Remove Battery / Tiers state
  const [showRemoveBatteryModal, setShowRemoveBatteryModal] = useState(false);
  const [targetBatteryIdToRemove, setTargetBatteryIdToRemove] = useState<string>('');
  const [removeMode, setRemoveMode] = useState<'full_battery' | 'remove_tiers'>('full_battery');
  const [selectedTiersToRemove, setSelectedTiersToRemove] = useState<string[]>([]);

  const [activeTierForNotes, setActiveTierForNotes] = useState<BatteryTier | null>(null);
  const [tierNoteText, setTierNoteText] = useState('');

  const [activeTierForMortality, setActiveTierForMortality] = useState<BatteryTier | null>(null);
  const [mortalityMales, setMortalityMales] = useState(0);
  const [mortalityFemales, setMortalityFemales] = useState(0);
  const [mortalityCulling, setMortalityCulling] = useState(0);
  const [mortalityReason, setMortalityReason] = useState('طبيعي / مفاجئ');

  const [activeTierForEggs, setActiveTierForEggs] = useState<BatteryTier | null>(null);
  const [tierEggCount, setTierEggCount] = useState(0);
  const [tierBrokenEggs, setTierBrokenEggs] = useState(0);
  const [tierEggTime, setTierEggTime] = useState('08:00');
  const [tierEggSession, setTierEggSession] = useState<'morning' | 'evening' | 'noon'>('morning');

  const [editingBirdsTier, setEditingBirdsTier] = useState<BatteryTier | null>(null);
  const [editMales, setEditMales] = useState(0);
  const [editFemales, setEditFemales] = useState(0);
  const [editHousingDate, setEditHousingDate] = useState('');
  const [editInitialAge, setEditInitialAge] = useState(6);
  const [editTargetLifespan, setEditTargetLifespan] = useState(42);

  // Strict Arabic Alphabetical Sorting for Batteries (أ إلى س)
  const sortedBatteries = React.useMemo(() => {
    if (!batteries) return [];
    return [...batteries].sort((a, b) => {
      const idxA = (STRICT_ARABIC_BATTERY_ORDER as readonly string[]).indexOf(a.name);
      const idxB = (STRICT_ARABIC_BATTERY_ORDER as readonly string[]).indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [batteries]);

  // Active battery
  const currentBattery = sortedBatteries.find((b) => b.id === selectedBatteryId) || sortedBatteries[0];
  const currentTiers =
    tiers
      ?.filter((t) => t.batteryId === currentBattery?.id)
      .sort((a, b) => a.tierNumber - b.tierNumber) || [];

  // Add new Battery
  const handleAddBattery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatteryName.trim()) return;

    const bId = `bat-${Date.now()}`;
    const newBat: Battery = {
      id: bId,
      name: newBatteryName.trim(),
      tiersCount: 4,
      createdAt: new Date().toISOString(),
      notes: `بطارية ${newBatteryName.trim()}`,
    };

    // create 4 tiers automatically
    const newTiers: BatteryTier[] = [1, 2, 3, 4].map((num) => ({
      id: `tier-${bId}-${num}`,
      batteryId: bId,
      tierNumber: num as 1 | 2 | 3 | 4,
      capacity: 30,
      malesCount: 7,
      femalesCount: 21,
      updatedAt: new Date().toISOString(),
    }));

    await db.batteries.add(newBat);
    await db.tiers.bulkAdd(newTiers);

    toast(`تم إضافة البطارية (${newBatteryName.trim()}) بنجاح مع 4 أدوار!`, 'success');
    setShowAddBatteryModal(false);
    setNewBatteryName('');
    setSelectedBatteryId(bId);
  };

  // Remove Battery or Specific Tiers
  const handleRemoveBatteryOrTiers = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBat = sortedBatteries.find((b) => b.id === targetBatteryIdToRemove);
    if (!targetBat) return;

    if (removeMode === 'full_battery') {
      // 1. Delete full battery and its tiers
      await db.tiers.where('batteryId').equals(targetBat.id).delete();
      await db.batteries.delete(targetBat.id);
      await db.tierMortalities.where('batteryId').equals(targetBat.id).delete();

      toast(`تم حذف البطارية (${targetBat.name}) وكافة أدوارها بالكامل وتحديث سعة العنبر!`, 'success');

      // Update selected battery to another existing one
      const remainingBats = sortedBatteries.filter((b) => b.id !== targetBat.id);
      if (remainingBats.length > 0) {
        setSelectedBatteryId(remainingBats[0].id);
      }
      setShowRemoveBatteryModal(false);
    } else {
      // 2. Remove specific tiers
      if (selectedTiersToRemove.length === 0) {
        toast('يرجى تحديد دور واحد على الأقل لإزالته!', 'error');
        return;
      }

      const batTiers = tiers?.filter((t) => t.batteryId === targetBat.id) || [];
      if (selectedTiersToRemove.length >= batTiers.length) {
        toast('لا يمكن إزالة جميع الأدوار عبر هذا الخيار؛ يرجى اختيار (حذف البطارية بالكامل) بدلاً من ذلك!', 'error');
        return;
      }

      await db.tiers.bulkDelete(selectedTiersToRemove);
      const remainingTiersCount = batTiers.length - selectedTiersToRemove.length;
      await db.batteries.update(targetBat.id, {
        tiersCount: remainingTiersCount,
      });

      const updatedCapacity = remainingTiersCount * 30;
      toast(`تمت إزالة الأدوار المحددة (${selectedTiersToRemove.length} دور) بنجاح وتحديث سعة البطارية (${targetBat.name}) إلى ${updatedCapacity} طائر!`, 'success');
      setShowRemoveBatteryModal(false);
      setSelectedTiersToRemove([]);
    }
  };

  // Save Tier Notes
  const handleSaveNotes = async () => {
    if (!activeTierForNotes) return;
    await db.tiers.update(activeTierForNotes.id, {
      notes: tierNoteText,
      updatedAt: new Date().toISOString(),
    });
    toast('تم حفظ ملاحظات الدور بنجاح', 'success');
    setActiveTierForNotes(null);
  };

  // Submit Mortality & Culling
  const handleSaveMortality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTierForMortality) return;

    const totalToDeductMales = Number(mortalityMales);
    const totalToDeductFemales = Number(mortalityFemales) + Number(mortalityCulling);

    if (totalToDeductMales > activeTierForMortality.malesCount) {
      toast('عدد نفوق الذكور أكبر من عدد الذكور الحالي في الدور!', 'error');
      return;
    }
    if (totalToDeductFemales > activeTierForMortality.femalesCount) {
      toast('عدد نفوق/استبعاد الإناث أكبر من عدد الإناث الحالي في الدور!', 'error');
      return;
    }

    // Record in tierMortalities table
    await db.tierMortalities.add({
      id: `tmort-${Date.now()}`,
      batteryId: activeTierForMortality.batteryId,
      tierId: activeTierForMortality.id,
      date: new Date().toISOString().split('T')[0],
      malesMortality: totalToDeductMales,
      femalesMortality: Number(mortalityFemales),
      cullingCount: Number(mortalityCulling),
      reason: mortalityReason,
      recordedBy: 'عامل المزرعة',
      createdAt: new Date().toISOString(),
    });

    // Deduct live birds from tier
    await db.tiers.update(activeTierForMortality.id, {
      malesCount: activeTierForMortality.malesCount - totalToDeductMales,
      femalesCount: activeTierForMortality.femalesCount - totalToDeductFemales,
      updatedAt: new Date().toISOString(),
    });

    toast('تم تسجيل النفوق وخصم الطيور من الدور بنجاح', 'success');
    setActiveTierForMortality(null);
    setMortalityMales(0);
    setMortalityFemales(0);
    setMortalityCulling(0);
  };

  // Submit Tier Quick Egg Production
  const handleSaveTierEggs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTierForEggs) return;

    const actual = Number(tierEggCount);
    const broken = Number(tierBrokenEggs);
    const marketable = Math.max(0, actual - broken);
    const females = activeTierForEggs.femalesCount;
    const layingRate = females > 0 ? (actual / females) * 100 : 0;

    const bat = batteries?.find((b) => b.id === activeTierForEggs.batteryId);
    const targetName = `بطارية ${bat?.name || ''} - الدور ${activeTierForEggs.tierNumber}`;

    await db.eggLogs.add({
      id: `egg-${Date.now()}`,
      targetType: 'tier',
      targetId: activeTierForEggs.id,
      targetName,
      collectionDate: new Date().toISOString().split('T')[0],
      collectionTime: tierEggTime,
      session: tierEggSession,
      actualEggs: actual,
      brokenEggs: broken,
      marketableEggs: marketable,
      packagedTraysCount: Math.floor(marketable / 30),
      traySize: 30,
      liveFemalesCount: females,
      layingRatePercent: Math.round(layingRate * 10) / 10,
      elapsedHoursFromLastCollection: 24,
      normalized24hYield: actual,
      hasIntervalWarning: false,
      recordedBy: 'عامل المزرعة',
      systemRecordedAt: new Date().toISOString(),
    });

    toast(`تم تسجيل إنتاج ${actual} بيضة للدور ${activeTierForEggs.tierNumber} بمعدل بياض ${Math.round(layingRate)}%!`, 'success');
    setActiveTierForEggs(null);
    setTierEggCount(0);
    setTierBrokenEggs(0);
  };

  // Update Birds Population Count & Age Lifecycle
  const handleSaveBirdsEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBirdsTier) return;

    await db.tiers.update(editingBirdsTier.id, {
      malesCount: Number(editMales),
      femalesCount: Number(editFemales),
      housingDate: editHousingDate || undefined,
      initialAgeWeeks: Number(editInitialAge) || 6,
      targetLayingLifespanWeeks: Number(editTargetLifespan) || 42,
      updatedAt: new Date().toISOString(),
    });

    toast('تم تحديث أعداد وأعمار الطيور بالدور بنجاح!', 'success');
    setEditingBirdsTier(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header & Battery Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Grid className="w-6 h-6 text-emerald-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              عنبر أقفاص البطاريات (Battery Cages)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة دقيقة لكل بطارية وأدوارها الأربعة، نسب التلقيح، الإنتاج اليومي، والنفوق.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Remove Battery / Tiers Button */}
          <button
            onClick={() => {
              setTargetBatteryIdToRemove(currentBattery?.id || (sortedBatteries[0]?.id ?? ''));
              setSelectedTiersToRemove([]);
              setRemoveMode('full_battery');
              setShowRemoveBatteryModal(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all"
            title="إزالة بطارية بالكامل أو إزالة أدوار محددة منها وتحديث الطاقة الاستيعابية"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>إزالة بطارية</span>
          </button>

          {/* Prominent Add Battery Button */}
          <button
            onClick={() => setShowAddBatteryModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إضافة بطارية جديدة</span>
          </button>
        </div>
      </div>

      {/* Battery Quick Matrix Toggle & Count */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>إجمالي البطاريات في العنبر:</span>
          <span className="font-mono text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
            {batteries?.length || 0} بطارية (أ - س)
          </span>
        </div>

        <button
          onClick={() => setShowQuickBatteryMatrix(!showQuickBatteryMatrix)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            showQuickBatteryMatrix
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>{showQuickBatteryMatrix ? 'إخفاء الشبكة الكاملة' : 'عرض شبكة البطاريات الكاملة (15 بطارية)'}</span>
        </button>
      </div>

      {/* Quick Matrix Grid for all batteries */}
      {showQuickBatteryMatrix && (
        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 animate-fadeIn">
          <div className="text-xs font-bold text-slate-600 mb-3 flex items-center justify-between">
            <span>اختر بطارية من شبكة العنابر (أ - س):</span>
            <span className="text-[11px] text-slate-400">انقر للتنقل الفوري للبطارية</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
            {sortedBatteries.map((bat) => {
              const isSelected = bat.id === currentBattery?.id;
              const batTiers = tiers?.filter((t) => t.batteryId === bat.id) || [];
              const totalBirds = batTiers.reduce((a, t) => a + t.malesCount + t.femalesCount, 0);

              return (
                <button
                  key={bat.id}
                  onClick={() => {
                    setSelectedBatteryId(bat.id);
                  }}
                  className={`p-2.5 rounded-2xl text-center border transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-extrabold translate-y-[-2px]'
                      : 'bg-white hover:bg-emerald-50/70 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="text-base font-black mb-0.5">{bat.name}</div>
                  <div className={`text-[10px] font-mono ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {totalBirds} طائر
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Battery Tabs Selection Bar (Horizontal Scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-thin">
        {sortedBatteries.map((bat) => {
          const isSelected = bat.id === currentBattery?.id;
          const batTiers = tiers?.filter((t) => t.batteryId === bat.id) || [];
          const totalBirds = batTiers.reduce((a, t) => a + t.malesCount + t.femalesCount, 0);

          return (
            <button
              key={bat.id}
              onClick={() => setSelectedBatteryId(bat.id)}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all shrink-0 ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 translate-y-[-2px]'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center font-black text-xs ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {bat.name}
              </div>
              <span>بطارية ({bat.name})</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalBirds} طائر
              </span>
            </button>
          );
        })}
      </div>

      {/* Battery Overview Header Info */}
      {currentBattery && (
        <div className="p-4 rounded-3xl bg-emerald-50/60 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-soft">
              {currentBattery.name}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                بطارية أقفاص رقم ({currentBattery.name})
              </h3>
              <div className="text-xs text-slate-500">
                السعة القصوى الإجمالية: {currentTiers.reduce((a, t) => a + t.capacity, 0)} طيراً ({currentTiers.length} أدوار × 30 طير/دور)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              إجمالي الطيور الحية: <span className="font-mono text-emerald-700 font-extrabold">
                {currentTiers.reduce((a, t) => a + t.malesCount + t.femalesCount, 0)}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              إجمالي الذكور: <span className="font-mono text-blue-700 font-extrabold">
                {currentTiers.reduce((a, t) => a + t.malesCount, 0)}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm">
              إجمالي الإناث: <span className="font-mono text-rose-700 font-extrabold">
                {currentTiers.reduce((a, t) => a + t.femalesCount, 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4 Vertical Tiers (arranged 1 to 4 from top to bottom) */}
      <div className="space-y-4">
        {currentTiers.map((tier) => {
          const totalBirds = tier.malesCount + tier.femalesCount;
          const isOverCapacity = totalBirds > tier.capacity;
          const capacityPercent = Math.round((totalBirds / tier.capacity) * 100);

          // Male to Female Ratio
          const ratio = tier.malesCount > 0 ? (tier.femalesCount / tier.malesCount).toFixed(1) : '0';
          // Ideal is around 1:2.5 to 1:3.5 (e.g. 1:3)
          const ratioNum = parseFloat(ratio);
          const isUnbalancedRatio =
            tier.malesCount === 0 || ratioNum < 2.3 || ratioNum > 3.7;

          // Calculate Flock Age & Meat-Conversion Countdown
          const ageInfo = calculateFlockAgeInfo({
            housingDate: tier.housingDate,
            hatchDate: tier.hatchDate,
            initialAgeWeeks: tier.initialAgeWeeks,
            targetLifespanWeeks: tier.targetLayingLifespanWeeks,
            purpose: 'layers',
          });

          return (
            <div
              key={tier.id}
              className={`p-5 rounded-3xl glass-card transition-all relative overflow-hidden border ${
                isOverCapacity
                  ? 'border-rose-300 bg-rose-50/30'
                  : ageInfo.isEndOfCycle
                  ? 'border-rose-200 bg-rose-50/20'
                  : 'border-slate-200/80 bg-white/90'
              }`}
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                {/* Tier Number & Occupancy Info */}
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center justify-center shrink-0 shadow-apple">
                    <span className="text-[10px] text-slate-300 font-medium">الدور</span>
                    <span className="text-lg font-black leading-none font-mono">
                      {tier.tierNumber}
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-extrabold text-base text-slate-900">
                        الدور {tier.tierNumber} {tier.tierNumber === 1 ? '(العلوي)' : tier.tierNumber === 4 ? '(السفلي)' : ''}
                      </h4>
                      {isOverCapacity && (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          تجاوز السعة القصوى ({totalBirds}/30)!
                        </span>
                      )}
                      {/* Phase Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${ageInfo.badgeBgClass} ${ageInfo.badgeTextClass} ${ageInfo.badgeBorderClass}`}>
                        {ageInfo.phaseLabel}
                      </span>
                    </div>

                    {/* Bird Breakdown & Ratio */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1">
                      <span>
                        العدد: <b className="text-slate-900 font-mono text-sm">{totalBirds}</b> / {tier.capacity} طائر
                      </span>
                      <span>•</span>
                      <span className="text-blue-700">
                        ذكور: <b className="font-mono font-bold">{tier.malesCount}</b>
                      </span>
                      <span>•</span>
                      <span className="text-rose-700">
                        إناث: <b className="font-mono font-bold">{tier.femalesCount}</b>
                      </span>
                      <span>•</span>
                      {/* Mating Ratio Indicator */}
                      <span
                        className={`px-2 py-0.5 rounded-lg font-bold font-mono text-[11px] flex items-center gap-1 ${
                          isUnbalancedRatio
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                        title={
                          isUnbalancedRatio
                            ? 'تنبيه: نسبة التلقيح غير مثالية للتزاوج (المثالي 1 ذكر : 3 إناث)'
                            : 'نسبة تلقيح مثالية (1 : 3)'
                        }
                      >
                        <Heart className="w-3 h-3" />
                        نسبة 1 : {ratio}
                        {isUnbalancedRatio && (
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                        )}
                      </span>
                    </div>

                    {/* Dedicated Age & Meat-Conversion Countdown Banner */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
                      {/* Age display */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 font-bold">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>عمر القطيع:</span>
                        <span className="font-mono text-emerald-800 font-black">
                          {ageInfo.ageWeeks} أسبوع ({ageInfo.ageDays} يوم)
                        </span>
                      </div>

                      {/* Remaining Laying Period to Meat Sale */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                        ageInfo.isEndOfCycle
                          ? 'bg-rose-100 border-rose-300 text-rose-900 animate-pulse'
                          : ageInfo.isNearEnd
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      }`}>
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        <span>التحويل للبيع لاحم:</span>
                        {ageInfo.isEndOfCycle ? (
                          <span className="font-black text-rose-700">⚠️ انتهى البياض - جاهزة للبيع لاحم</span>
                        ) : (
                          <span>
                            متبقي <b className="font-mono font-black text-sm">{ageInfo.remainingWeeks}</b> أسبوع
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bars visual (Occupancy + Laying Lifespan) */}
                <div className="w-full lg:w-56 space-y-2">
                  {/* Occupancy bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5 font-medium">
                      <span>نسبة الإشغال</span>
                      <span className="font-mono font-bold">{capacityPercent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverCapacity
                            ? 'bg-rose-500'
                            : capacityPercent >= 90
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, capacityPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Laying lifecycle progress bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-0.5 font-medium">
                      <span>انقضاء دورة البياض</span>
                      <span className="font-mono font-bold">{ageInfo.progressPercent}% ({ageInfo.ageWeeks}/{ageInfo.targetLifespanWeeks} أسبوع)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ageInfo.isEndOfCycle
                            ? 'bg-rose-600'
                            : ageInfo.isNearEnd
                            ? 'bg-amber-500'
                            : 'bg-teal-500'
                        }`}
                        style={{ width: `${ageInfo.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons for this Tier */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Quick Egg Log */}
                  <button
                    onClick={() => {
                      setActiveTierForEggs(tier);
                      setTierEggCount(0);
                      setTierBrokenEggs(0);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200/80 transition-colors"
                  >
                    <Egg className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تسجيل بيض</span>
                  </button>

                  {/* Mortality / Culling */}
                  <button
                    onClick={() => {
                      setActiveTierForMortality(tier);
                      setMortalityMales(0);
                      setMortalityFemales(0);
                      setMortalityCulling(0);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1.5 border border-rose-200/80 transition-colors"
                  >
                    <Skull className="w-3.5 h-3.5 text-rose-600" />
                    <span>نفوق / استبعاد</span>
                  </button>

                  {/* Edit Bird Count & Age */}
                  <button
                    onClick={() => {
                      setEditingBirdsTier(tier);
                      setEditMales(tier.malesCount);
                      setEditFemales(tier.femalesCount);
                      setEditHousingDate(tier.housingDate || new Date().toISOString().split('T')[0]);
                      setEditInitialAge(tier.initialAgeWeeks || 6);
                      setEditTargetLifespan(tier.targetLayingLifespanWeeks || 42);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    تعديل الطيور والعمر
                  </button>

                  {/* Notes Drawer/Modal */}
                  <button
                    onClick={() => {
                      setActiveTierForNotes(tier);
                      setTierNoteText(tier.notes || '');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>ملاحظات {tier.notes ? '•' : ''}</span>
                  </button>
                </div>
              </div>

              {/* Tier Notes Display preview if present */}
              {tier.notes && (
                <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-600 flex items-center gap-2">
                  <span className="font-bold text-slate-400">ملاحظة:</span>
                  <span>{tier.notes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal 1: Add New Battery */}
      {showAddBatteryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                <Grid className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowAddBatteryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              إضافة بطارية أقفاص جديدة
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              سيتم إنشاء البطارية مع 4 أدوار عمودية تلقائياً بسعة 30 طيراً لكل دور.
            </p>

            <form onSubmit={handleAddBattery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم أو رمز البطارية (مثال: "هـ" أو "خط الإنتاج 5")
                </label>
                <input
                  type="text"
                  required
                  value={newBatteryName}
                  onChange={(e) => setNewBatteryName(e.target.value)}
                  placeholder="مثال: هـ"
                  className="w-full glass-input"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  إنشاء وتفعيل البطارية
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBatteryModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Tier Notes Modal */}
      {activeTierForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                ملاحظات الدور {activeTierForNotes.tierNumber} (بطارية {currentBattery?.name})
              </h3>
              <button
                onClick={() => setActiveTierForNotes(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={4}
              value={tierNoteText}
              onChange={(e) => setTierNoteText(e.target.value)}
              placeholder="اكتب ملاحظاتك عن هذا الدور هنا (مثال: سلوك الطيور، خطوط المياه، الشهية، نشاط التلقيح)..."
              className="w-full glass-input text-xs"
              autoFocus
            />

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>حفظ الملاحظة</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTierForNotes(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Mortality & Culling */}
      {activeTierForMortality && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <Skull className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل نفوق واستبعاد (الدور {activeTierForMortality.tierNumber})
                </h3>
              </div>
              <button
                onClick={() => setActiveTierForMortality(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              سيتم خصم الأعداد المسجلة تلقائياً من إجمالي قطيع هذا الدور.
            </p>

            <form onSubmit={handleSaveMortality} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نفوق ذكور (المتوفر: {activeTierForMortality.malesCount})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={activeTierForMortality.malesCount}
                    value={mortalityMales}
                    onChange={(e) => setMortalityMales(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نفوق إناث (المتوفر: {activeTierForMortality.femalesCount})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={activeTierForMortality.femalesCount}
                    value={mortalityFemales}
                    onChange={(e) => setMortalityFemales(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  استبعاد طيور مريضة/ضعيفة (Culling)
                </label>
                <input
                  type="number"
                  min="0"
                  value={mortalityCulling}
                  onChange={(e) => setMortalityCulling(Number(e.target.value))}
                  className="w-full glass-input text-center font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  السبب أو الأعراض الملاحظة
                </label>
                <select
                  value={mortalityReason}
                  onChange={(e) => setMortalityReason(e.target.value)}
                  className="w-full glass-input text-xs"
                >
                  <option value="طبيعي / مفاجئ">طبيعي / مفاجئ</option>
                  <option value="إجهاد حراري">إجهاد حراري</option>
                  <option value="افتراس أو جروح">افتراس أو جروح</option>
                  <option value="أعراض تنفسية">أعراض تنفسية</option>
                  <option value="انسداد بيضة (Egg Bound)">انسداد بيضة (Egg Bound)</option>
                  <option value="أسباب أخرى">أسباب أخرى</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  تأكيد وخصم من القطيع
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTierForMortality(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Quick Egg Production Logger */}
      {activeTierForEggs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Egg className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل بيض (الدور {activeTierForEggs.tierNumber})
                </h3>
              </div>
              <button
                onClick={() => setActiveTierForEggs(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTierEggs} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    إجمالي البيض المجموع
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={tierEggCount || ''}
                    onChange={(e) => setTierEggCount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full glass-input text-center text-lg font-mono font-bold"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    بيض مكسور / مشروخ
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tierBrokenEggs}
                    onChange={(e) => setTierBrokenEggs(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    فترة الجمع
                  </label>
                  <select
                    value={tierEggSession}
                    onChange={(e) => setTierEggSession(e.target.value as any)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="morning">صباحي (الجمعة الأولى)</option>
                    <option value="evening">مسائي (الجمعة الثانية)</option>
                    <option value="noon">ظهيرة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ساعة الجمع
                  </label>
                  <input
                    type="time"
                    value={tierEggTime}
                    onChange={(e) => setTierEggTime(e.target.value)}
                    className="w-full glass-input text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* Instant Laying rate calculation preview */}
              {tierEggCount > 0 && activeTierForEggs.femalesCount > 0 && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between text-emerald-900">
                  <span>معدل البياض التقديري للدور:</span>
                  <span className="font-mono font-extrabold text-sm text-emerald-700">
                    {Math.round((tierEggCount / activeTierForEggs.femalesCount) * 100)}%
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  حفظ الإنتاج
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTierForEggs(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Edit Birds Population & Age Lifecycle */}
      {editingBirdsTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  تعديل أعداد وأعمار طيور الدور {editingBirdsTier.tierNumber}
                </h3>
              </div>
              <button
                onClick={() => setEditingBirdsTier(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBirdsEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عدد الذكور
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editMales}
                    onChange={(e) => setEditMales(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عدد الإناث
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFemales}
                    onChange={(e) => setEditFemales(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold text-rose-700"
                  />
                </div>
              </div>

              {/* Age & Lifecycle Settings */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span>متابعة عمر الطيور ودورة التحويل للبيع لاحم</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    تاريخ تسكين الطيور في هذا الدور
                  </label>
                  <input
                    type="date"
                    value={editHousingDate}
                    onChange={(e) => setEditHousingDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      العمر عند التسكين (أسابيع)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={editInitialAge}
                      onChange={(e) => setEditInitialAge(Number(e.target.value))}
                      className="w-full glass-input text-center font-mono font-bold text-xs"
                      placeholder="6"
                    />
                    <span className="text-[9px] text-slate-400">الافتراضي 6 أسابيع للبياض</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      عمر التحويل لاحم (أسابيع)
                    </label>
                    <input
                      type="number"
                      min="20"
                      max="60"
                      value={editTargetLifespan}
                      onChange={(e) => setEditTargetLifespan(Number(e.target.value))}
                      className="w-full glass-input text-center font-mono font-bold text-xs"
                      placeholder="42"
                    />
                    <span className="text-[9px] text-slate-400">الافتراضي 42 أسبوع (~10 أشهر)</span>
                  </div>
                </div>

                {/* Live Preview Box */}
                {(() => {
                  const previewAge = calculateFlockAgeInfo({
                    housingDate: editHousingDate,
                    initialAgeWeeks: editInitialAge,
                    targetLifespanWeeks: editTargetLifespan,
                    purpose: 'layers',
                  });
                  return (
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 text-[11px] space-y-1">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-600">العمر المحسوب اليوم:</span>
                        <span className="font-mono text-emerald-800">{previewAge.ageWeeks} أسبوع ({previewAge.ageDays} يوم)</span>
                      </div>
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-slate-600">المرحلة الإنتاجية:</span>
                        <span className="text-teal-700">{previewAge.phaseLabel}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold pt-1 border-t border-slate-100">
                        <span className="text-slate-600">المدة المتبقية للبيع لاحم:</span>
                        {previewAge.isEndOfCycle ? (
                          <span className="text-rose-700 font-black">⚠️ جاهزة للبيع لاحم فوراً</span>
                        ) : (
                          <span className="text-amber-800 font-mono font-black">{previewAge.remainingWeeks} أسبوع ({previewAge.remainingDays} يوم)</span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex justify-between font-mono">
                <span>الإجمالي: {Number(editMales) + Number(editFemales)} طائر</span>
                <span>السعة: 30 طيراً</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  حفظ التعديل
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBirdsTier(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Remove Battery or Specific Tiers */}
      {showRemoveBatteryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    إزالة بطارية أو تقليص الأدوار
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    اختر إما حذف البطارية بالكامل أو إزالة أدوار محددة منها وتحديث سعة العنبر
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRemoveBatteryModal(false)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRemoveBatteryOrTiers} className="space-y-4 pt-4">
              {/* Select Target Battery */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البطارية المستهدفة:
                </label>
                <select
                  value={targetBatteryIdToRemove}
                  onChange={(e) => {
                    setTargetBatteryIdToRemove(e.target.value);
                    setSelectedTiersToRemove([]);
                  }}
                  className="w-full glass-input text-xs py-2 font-bold"
                >
                  {sortedBatteries.map((b) => (
                    <option key={b.id} value={b.id}>
                      بطارية ({b.name}) - {tiers?.filter((t) => t.batteryId === b.id).length || 0} أدوار
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Mode Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نوع عملية الإزالة:
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setRemoveMode('full_battery')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                      removeMode === 'full_battery'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    حذف البطارية بالكامل
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoveMode('remove_tiers')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                      removeMode === 'remove_tiers'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    إزالة أدوار محددة فقط
                  </button>
                </div>
              </div>

              {/* Mode 1: Full Battery Deletion Details */}
              {removeMode === 'full_battery' && (() => {
                const b = sortedBatteries.find((x) => x.id === targetBatteryIdToRemove);
                const bTiers = tiers?.filter((t) => t.batteryId === targetBatteryIdToRemove) || [];
                const bBirds = bTiers.reduce((acc, t) => acc + t.malesCount + t.femalesCount, 0);
                const bCapacity = bTiers.reduce((acc, t) => acc + t.capacity, 0);

                return (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>تنبيه: سيتم حذف البطارية بالكامل نهائياً</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      سيتم إزالة البطارية <b>({b?.name})</b> وجميع أدوارها (<b>{bTiers.length} أدوار</b>) ومسح بياناتها وسجلاتها.
                    </p>
                    <div className="pt-2 border-t border-rose-200/60 flex justify-between text-[11px] font-mono font-bold text-rose-900">
                      <span>الطيور الموجودة حالياً: {bBirds} طائر</span>
                      <span>السعة التي ستُخصم: {bCapacity} طائر</span>
                    </div>
                  </div>
                );
              })()}

              {/* Mode 2: Specific Tiers Removal */}
              {removeMode === 'remove_tiers' && (() => {
                const b = sortedBatteries.find((x) => x.id === targetBatteryIdToRemove);
                const bTiers = tiers?.filter((t) => t.batteryId === targetBatteryIdToRemove)
                  .sort((a, b) => a.tierNumber - b.tierNumber) || [];

                const remainingCount = bTiers.length - selectedTiersToRemove.length;
                const remainingCap = remainingCount * 30;

                return (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700">
                      اختر الأدوار المطلوب إزالتها من البطارية ({b?.name}):
                    </label>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {bTiers.map((tier) => {
                        const isChecked = selectedTiersToRemove.includes(tier.id);
                        const tierBirds = tier.malesCount + tier.femalesCount;

                        return (
                          <label
                            key={tier.id}
                            className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-rose-50 border-rose-300 shadow-xs'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTiersToRemove((prev) => [...prev, tier.id]);
                                  } else {
                                    setSelectedTiersToRemove((prev) => prev.filter((id) => id !== tier.id));
                                  }
                                }}
                                className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                              />
                              <div>
                                <span className="font-extrabold text-xs text-slate-900">
                                  الدور {tier.tierNumber} {tier.tierNumber === 1 ? '(العلوي)' : tier.tierNumber === 4 ? '(السفلي)' : ''}
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  سعة: {tier.capacity} طائر
                                </span>
                              </div>
                            </div>

                            <span className="font-mono text-xs font-bold text-slate-700">
                              {tierBirds} طائر حالي
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Capacity preview */}
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex justify-between items-center">
                      <span className="font-bold text-amber-900">
                        الطاقة الاستيعابية المتبقية للبطارية:
                      </span>
                      <span className="font-mono font-black text-amber-900">
                        {remainingCap} طائر ({remainingCount} أدوار)
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={removeMode === 'remove_tiers' && selectedTiersToRemove.length === 0}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs shadow-apple flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {removeMode === 'full_battery'
                      ? 'تأكيد حذف البطارية بالكامل'
                      : `تأكيد إزالة (${selectedTiersToRemove.length}) دور وتحديث السعة`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRemoveBatteryModal(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
