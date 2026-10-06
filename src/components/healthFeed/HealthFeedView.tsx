import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { FeedStock, FeedConsumptionRecord, MedicationSchedule, MedicationType } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  HeartPulse,
  Plus,
  Utensils,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Calendar,
  X,
  Package,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Save,
} from 'lucide-react';

export const HealthFeedView: React.FC = () => {
  const { toast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  const feedStocks = useLiveQuery(() => db.feedStock.toArray(), []);
  const consumptionLogs = useLiveQuery(
    () => db.feedConsumption.reverse().sortBy('date'),
    []
  );
  const medications = useLiveQuery(() => db.medicationSchedules.toArray(), []);
  const batteries = useLiveQuery(() => db.batteries.toArray(), []);
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);

  // Modals
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState<FeedStock | null>(null);
  const [restockBags, setRestockBags] = useState(20);

  // Stock Adjustment / Inventory Audit Modal
  const [showAdjustStockModal, setShowAdjustStockModal] = useState<FeedStock | null>(null);
  const [adjustedBags, setAdjustedBags] = useState<number>(0);
  const [adjustedKg, setAdjustedKg] = useState<number>(0);

  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [targetType, setTargetType] = useState<'battery' | 'room'>('battery');
  const [targetId, setTargetId] = useState('');
  const [selectedFeedType, setSelectedFeedType] = useState<string>('layer_production');
  const [kgConsumed, setKgConsumed] = useState(25);

  // New Medication Form
  const [medName, setMedName] = useState('');
  const [medType, setMedType] = useState<MedicationType>('vitamin');
  const [targetScope, setTargetScope] = useState<'all' | 'battery' | 'room'>('all');
  const [dosage, setDosage] = useState('1 مل / لتر ماء');
  const [startDate, setStartDate] = useState(todayStr);
  const [durationDays, setDurationDays] = useState(3);
  const [hasWithdrawal, setHasWithdrawal] = useState(false);
  const [withdrawalDays, setWithdrawalDays] = useState(5);
  const [notes, setNotes] = useState('');

  // Quick preset vitamins
  const vitaminPresets = [
    { name: 'فيتامين AD3E للخصوبة وتنشيط المبيض', type: 'vitamin', dosage: '1 مل / لتر ماء', hasW: false, wDays: 0 },
    { name: 'هـ-سيلينيوم (تخصيب وتقوية القشرة)', type: 'vitamin', dosage: '0.5 جم / لتر ماء', hasW: false, wDays: 0 },
    { name: 'فيتامين C لمكافحة الإجهاد الحراري', type: 'vitamin', dosage: '1 جم / لتر ماء وقت الظهيرة', hasW: false, wDays: 0 },
    { name: 'خل تفاح طبيعي (مطهر معوي وهاضم)', type: 'supplement', dosage: '2 مل / لتر ماء', hasW: false, wDays: 0 },
    { name: 'مضاد حيوي (أوكسي تتراسيكلين)', type: 'antibiotic', dosage: '0.5 جم / لتر ماء', hasW: true, wDays: 5 },
  ];

  const applyPreset = (preset: typeof vitaminPresets[0]) => {
    setMedName(preset.name);
    setMedType(preset.type as any);
    setDosage(preset.dosage);
    setHasWithdrawal(preset.hasW);
    setWithdrawalDays(preset.wDays);
  };

  // Save Restock
  const handleSaveRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRestockModal) return;

    const addedBags = Number(restockBags);
    const addedKg = addedBags * showRestockModal.bagWeightKg;

    await db.feedStock.update(showRestockModal.id, {
      bagsCount: showRestockModal.bagsCount + addedBags,
      totalKg: showRestockModal.totalKg + addedKg,
      lastRestockedDate: todayStr,
    });

    toast(`تم توريد ${addedBags} كيس إلى رصيد (${showRestockModal.name}) بنجاح!`, 'success');
    setShowRestockModal(null);
  };

  // Save Feed Stock Manual Adjustment (Inventory / الجرد)
  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustStockModal) return;

    const bags = Math.max(0, Number(adjustedBags));
    const totalKg = Math.max(0, Number(adjustedKg));

    await db.feedStock.update(showAdjustStockModal.id, {
      bagsCount: bags,
      totalKg: totalKg,
      lastRestockedDate: todayStr,
    });

    toast(
      `تم تحديث وتسوية رصيد مخزون (${showAdjustStockModal.name}) يدوياً إلى ${bags} كيس (${totalKg.toLocaleString('ar-SA')} كغم)!`,
      'success'
    );
    setShowAdjustStockModal(null);
  };

  // Save Feed Consumption & Deduct
  const handleSaveConsumption = async (e: React.FormEvent) => {
    e.preventDefault();

    let tName = '';
    if (targetType === 'battery') {
      const bat = batteries?.find((b) => b.id === targetId);
      tName = `بطارية (${bat?.name || 'أ'})`;
    } else {
      const rm = rooms?.find((r) => r.id === targetId);
      tName = rm?.name || 'غرفة';
    }

    const kg = Number(kgConsumed);
    const bags = kg / 50;

    await db.feedConsumption.add({
      id: `fc-${Date.now()}`,
      date: todayStr,
      targetType,
      targetId,
      targetName: tName,
      feedType: selectedFeedType as any,
      bagsUsed: Math.round(bags * 100) / 100,
      kgUsed: kg,
      recordedBy: 'عامل المزرعة',
      createdAt: new Date().toISOString(),
    });

    // Deduct from stock
    const stockItem = feedStocks?.find((f) => f.feedType === selectedFeedType);
    if (stockItem) {
      const newKg = Math.max(0, stockItem.totalKg - kg);
      const newBags = Math.floor(newKg / stockItem.bagWeightKg);
      await db.feedStock.update(stockItem.id, {
        totalKg: newKg,
        bagsCount: newBags,
      });
    }

    toast(`تم تسجيل استهلاك ${kg} كغم علف وخصمها من الرصيد العام`, 'success');
    setShowConsumptionModal(false);
  };

  // Save Medication / Vitamin
  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) return;

    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + Number(durationDays));

    let withdrawalEndDate: string | undefined = undefined;
    let withdrawalActive = false;

    if (hasWithdrawal && Number(withdrawalDays) > 0) {
      const wEnd = new Date(end);
      wEnd.setDate(wEnd.getDate() + Number(withdrawalDays));
      withdrawalEndDate = wEnd.toISOString().split('T')[0];
      withdrawalActive = withdrawalEndDate >= todayStr;
    }

    const newMed: MedicationSchedule = {
      id: `med-${Date.now()}`,
      name: medName.trim(),
      type: medType,
      targetType: targetScope,
      targetName: targetScope === 'all' ? 'جميع عنابر المزرعة' : 'عنبر محدد',
      dosage: dosage.trim(),
      startDate,
      durationDays: Number(durationDays),
      endDate: end.toISOString().split('T')[0],
      hasWithdrawal,
      withdrawalDays: Number(withdrawalDays),
      withdrawalEndDate,
      withdrawalActive,
      status: 'active',
      notes: notes.trim(),
      recordedBy: 'مسؤول الرعاية البيطرية',
    };

    await db.medicationSchedules.add(newMed);
    toast(
      hasWithdrawal
        ? `تم جدولة العلاج وتفعيل تنبيه فترة التحريم (Withdrawal) حتى ${withdrawalEndDate}!`
        : `تمت جدولة وتوزيع الفيتامين بنجاح!`,
      hasWithdrawal ? 'warning' : 'success'
    );
    setShowAddMedModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-emerald-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              السجل الصحي والأعلاف والأمان الحيوي (Health & Feed)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة مخزون الأعلاف وخصم الاستهلاك اليومي، وجدول الفيتامينات، مع التنبيه الذكي بفترة سحب الدواء (Withdrawal Period).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const defaultFeed = feedStocks?.[0];
              if (defaultFeed) {
                setShowAdjustStockModal(defaultFeed);
                setAdjustedBags(defaultFeed.bagsCount);
                setAdjustedKg(defaultFeed.totalKg);
              }
            }}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all"
            title="تعديل كمية مخزون الأعلاف وتحديث الرصيد يدوياً عند الجرد"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>تعديل وجرد المخزون يدوياً</span>
          </button>
          <button
            onClick={() => setShowConsumptionModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Utensils className="w-4 h-4" />
            <span>تسجيل استهلاك علف</span>
          </button>
          <button
            onClick={() => {
              setMedName('');
              setNotes('');
              setShowAddMedModal(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>إضافة جرعة دواء / فيتامين</span>
          </button>
        </div>
      </div>

      {/* Bio-Security Withdrawal Alerts Active Banner */}
      {medications?.some((m) => m.hasWithdrawal && !!m.withdrawalEndDate && m.withdrawalEndDate >= todayStr) && (
        <div className="p-5 rounded-3xl bg-amber-500/15 border-2 border-amber-400 text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500 text-white shrink-0 shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-sm flex items-center gap-2">
                <span>تنبيه أمان حيوي صارم: فترة سحب دواء وتحريم نشطة</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold">
                  نشط الآن
                </span>
              </div>
              <div className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                يمنع قانونياً وصحياً بيع أي بيض أو ذبح أي طيور خاضعة للعلاج قبل انقضاء فترة الأمان الحيوي وتطهير الجسم من المضادات.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Part 1: Feed Stock Warehouse Cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Utensils className="w-5 h-5 text-amber-600" />
          <h3 className="font-extrabold text-slate-800 text-sm">
            مستودع الأعلاف ومتابعة الأرصدة الحالية
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {feedStocks?.map((feed) => {
            const isLow = feed.bagsCount <= feed.minThresholdBags;

            return (
              <div
                key={feed.id}
                className={`p-5 rounded-3xl glass-card border transition-all ${
                  isLow ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200/80 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-black text-base text-slate-900">{feed.name}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      وزن الكيس: {feed.bagWeightKg} كغم
                    </span>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      isLow ? 'bg-rose-100 text-rose-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <Package className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-black text-slate-900 font-mono">
                    {feed.bagsCount}
                  </span>
                  <span className="text-xs font-bold text-slate-500">كيس</span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({feed.totalKg.toLocaleString('ar-SA')} كغم)
                  </span>
                </div>

                {isLow && (
                  <div className="text-[11px] text-rose-700 font-bold mb-3 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>رصيد منخفض (الحد الأدنى: {feed.minThresholdBags} كيس)</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    آخر توريد: {feed.lastRestockedDate}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setShowAdjustStockModal(feed);
                        setAdjustedBags(feed.bagsCount);
                        setAdjustedKg(feed.totalKg);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-850 font-extrabold text-xs flex items-center gap-1 transition-colors"
                      title="تعديل كمية مخزون هذا العلف يدوياً عند الجرد"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>تعديل (جرد)</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowRestockModal(feed);
                        setRestockBags(20);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
                    >
                      + توريد شحنة
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Part 2: Vitamins & Medications Schedule Table */}
      <div className="rounded-3xl glass-panel overflow-hidden border border-slate-200/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-sm text-slate-800">
              جدول التحصينات، الفيتامينات، وفترات سحب الدواء (Withdrawal Periods)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            البرامج المسجلة: {medications?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">اسم العلاج / الفيتامين</th>
                <th className="p-3.5">النوع</th>
                <th className="p-3.5">العنبر المستهدف</th>
                <th className="p-3.5">الجرعة المقررة</th>
                <th className="p-3.5">فترة العلاج</th>
                <th className="p-3.5">فترة سحب الدواء (التحريم)</th>
                <th className="p-3.5 text-center">حالة الأمان الحيوي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {medications && medications.length > 0 ? (
                medications.map((med) => {
                  const isWithdrawalStillActive =
                    med.hasWithdrawal && !!med.withdrawalEndDate && med.withdrawalEndDate >= todayStr;

                  return (
                    <tr
                      key={med.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isWithdrawalStillActive ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="p-3.5 font-bold text-slate-900">{med.name}</td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            med.type === 'antibiotic'
                              ? 'bg-rose-100 text-rose-800'
                              : med.type === 'vitamin'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {med.type === 'antibiotic'
                            ? 'مضاد حيوي'
                            : med.type === 'vitamin'
                            ? 'فيتامين'
                            : 'مكمل غذائي'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700">{med.targetName}</td>
                      <td className="p-3.5 font-bold text-emerald-800">{med.dosage}</td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {med.startDate} ({med.durationDays} أيام)
                      </td>
                      <td className="p-3.5 font-mono">
                        {med.hasWithdrawal ? (
                          <div className="font-bold text-amber-900">
                            {med.withdrawalDays} أيام (حتى {med.withdrawalEndDate})
                          </div>
                        ) : (
                          <span className="text-slate-400">لا يوجد فترة تحريم</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {isWithdrawalStillActive ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-[11px] border border-amber-300 flex items-center justify-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            <span>ممنوع بيع البيض/اللحم</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>آمن للاستهلاك</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    لا توجد برامج علاجية مسجلة حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Restock Feed */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">
                توريد شحنة أعلاف جديدة ({showRestockModal.name})
              </h3>
              <button
                onClick={() => setShowRestockModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عدد الشيكارات الموردة (زنة 50 كجم)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockBags}
                  onChange={(e) => setRestockBags(Number(e.target.value))}
                  className="w-full glass-input text-center text-xl font-mono font-bold"
                  autoFocus
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  يعادل {(restockBags * showRestockModal.bagWeightKg).toLocaleString('ar-SA')} كغم علف
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  تأكيد الإضافة للمستودع
                </button>
                <button
                  type="button"
                  onClick={() => setShowRestockModal(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Record Consumption */}
      {showConsumptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Utensils className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل استهلاك علف وخصمه من المستودع
                </h3>
              </div>
              <button
                onClick={() => setShowConsumptionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConsumption} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('battery');
                    if (batteries && batteries.length > 0) setTargetId(batteries[0].id);
                  }}
                  className={`py-2 rounded-2xl text-xs font-bold border transition-all ${
                    targetType === 'battery'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  عنبر بطاريات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetType('room');
                    if (rooms && rooms.length > 0) setTargetId(rooms[0].id);
                  }}
                  className={`py-2 rounded-2xl text-xs font-bold border transition-all ${
                    targetType === 'room'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  غرفة تربية أرضية
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختر العنبر / الغرفة
                </label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full glass-input text-xs"
                >
                  {targetType === 'battery'
                    ? batteries?.map((b) => (
                        <option key={b.id} value={b.id}>
                          بطارية ({b.name})
                        </option>
                      ))
                    : rooms?.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نوع العلف المسحوب
                </label>
                <select
                  value={selectedFeedType}
                  onChange={(e) => setSelectedFeedType(e.target.value)}
                  className="w-full glass-input text-xs"
                >
                  {feedStocks?.map((f) => (
                    <option key={f.id} value={f.feedType}>
                      {f.name} (المتوفر: {f.bagsCount} كيس)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الكمية المستهلكة (كغم)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={kgConsumed}
                  onChange={(e) => setKgConsumed(Number(e.target.value))}
                  className="w-full glass-input text-center text-xl font-mono font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  تعادل {(kgConsumed / 50).toFixed(2)} كيس
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition-all"
                >
                  تسجيل وخصم من المستودع
                </button>
                <button
                  type="button"
                  onClick={() => setShowConsumptionModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add Medication / Vitamin */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <HeartPulse className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  إضافة برنامج علاجي / فيتامينات جديد
                </h3>
              </div>
              <button
                onClick={() => setShowAddMedModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mb-4">
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                نماذج سريعة شائعة لسمان المزرعة:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {vitaminPresets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-semibold transition-colors"
                  >
                    {p.name.split('(')[0]}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveMedication} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الفيتامين أو الدواء
                </label>
                <input
                  type="text"
                  required
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="مثال: فيتامين AD3E"
                  className="w-full glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تصنيف المادة
                  </label>
                  <select
                    value={medType}
                    onChange={(e) => setMedType(e.target.value as any)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="vitamin">فيتامين مقوي</option>
                    <option value="antibiotic">مضاد حيوي علاجي</option>
                    <option value="vaccine">لقاح / تحصين</option>
                    <option value="supplement">مكمل غذائي / خمائر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الجرعة المحددة
                  </label>
                  <input
                    type="text"
                    required
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="مثال: 1 مل / لتر ماء"
                    className="w-full glass-input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ البداية
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    مدة الإعطاء (بالأيام)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold"
                  />
                </div>
              </div>

              {/* Bio-Security Withdrawal Toggle */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <span className="text-xs font-extrabold text-amber-950">
                      هل يتطلب فترة سحب دواء / فترة تحريم؟ (Withdrawal)
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasWithdrawal}
                    onChange={(e) => setHasWithdrawal(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                </div>

                {hasWithdrawal && (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      عدد أيام فترة التحريم بعد انتهاء العلاج (أيام سحب الدواء)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={withdrawalDays}
                      onChange={(e) => setWithdrawalDays(Number(e.target.value))}
                      className="w-full glass-input text-center font-mono font-bold text-amber-950"
                    />
                    <span className="text-[10px] text-amber-800 mt-1 block">
                      سيقوم النظام بحظر بيع البيض أو تحويل الطيور للمجزرة حتى انتهاء هذه المدة.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات الطبيب البيطري، طريقة التقديم..."
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  حفظ وتفعيل البرنامج الصحي
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddMedModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust / Audit Feed Stock (تعديل كمية مخزون الأعلاف والجرد) */}
      {showAdjustStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    جرد وتعديل رصيد مخزون الأعلاف
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    تعديل كمية المخزون الفعلي يدوياً ومطابقة رصيد المستودع
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAdjustStockModal(null)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="space-y-4 pt-4">
              {/* Select Feed Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نوع العلف المراد جرده:
                </label>
                <select
                  value={showAdjustStockModal.id}
                  onChange={(e) => {
                    const sel = feedStocks?.find((f) => f.id === e.target.value);
                    if (sel) {
                      setShowAdjustStockModal(sel);
                      setAdjustedBags(sel.bagsCount);
                      setAdjustedKg(sel.totalKg);
                    }
                  }}
                  className="w-full glass-input text-xs font-bold py-2"
                >
                  {feedStocks?.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (الرصيد الحالي: {f.bagsCount} كيس / {f.totalKg} كغم)
                    </option>
                  ))}
                </select>
              </div>

              {/* Bags Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرصيد الفعلي بعد الجرد (عدد الأكياس):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={adjustedBags}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAdjustedBags(val);
                      setAdjustedKg(val * showAdjustStockModal.bagWeightKg);
                    }}
                    className="w-full glass-input text-center text-xl font-mono font-black text-slate-900"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    كيس
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  وزن الكيس الافتراضي: {showAdjustStockModal.bagWeightKg} كغم
                </span>
              </div>

              {/* Total Kg Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  إجمالي الوزن الفعلي (كيلوجرام):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={adjustedKg}
                    onChange={(e) => setAdjustedKg(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold text-emerald-800"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    كغم
                  </span>
                </div>
              </div>

              {/* Stock Variance Preview */}
              {(() => {
                const diffBags = Number(adjustedBags) - showAdjustStockModal.bagsCount;
                const diffKg = Number(adjustedKg) - showAdjustStockModal.totalKg;
                return (
                  <div className={`p-3 rounded-2xl border text-xs flex justify-between items-center ${
                    diffBags === 0
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : diffBags > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <span className="font-bold">فارق الجرد عن النظام:</span>
                    <span className="font-mono font-black text-sm">
                      {diffBags > 0 ? `+${diffBags}` : diffBags} كيس ({diffKg > 0 ? `+${diffKg}` : diffKg} كغم)
                    </span>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-xs shadow-apple flex items-center justify-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>اعتماد وحفظ رصيد الجرد الفعلي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdjustStockModal(null)}
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
