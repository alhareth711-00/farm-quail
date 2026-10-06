import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { EggProductionLog, Battery, BatteryTier, FloorRoom } from '../../types';
import { STRICT_ARABIC_BATTERY_ORDER } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Egg,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Layers,
  Sparkles,
  TrendingUp,
  Save,
  Package,
  AlertTriangle,
  RotateCcw,
  Grid,
  Warehouse,
  History,
  CheckSquare,
  FileSpreadsheet,
  Tag,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { calculateFlockAgeInfo } from '../../utils/birdAgeUtils';

export const EggProductionLogView: React.FC = () => {
  const { farmSettings, updateSettings } = useAuth();
  const { toast } = useToast();

  const batteries = useLiveQuery(() => db.batteries.toArray(), []);
  const tiers = useLiveQuery(() => db.tiers.toArray(), []);
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);
  const logs = useLiveQuery(() => db.eggLogs.reverse().sortBy('collectionDate'), []);
  const looseSetting = useLiveQuery(() => db.settings.get('looseEggsBalance'), []);
  const accumulatedLoose = looseSetting ? Number(looseSetting.value) || 0 : 0;

  const todayStr = new Date().toISOString().split('T')[0];

  // View Mode: 'grid' = Rapid Matrix Entry (Default), 'history' = Previous Logs Table
  const [viewMode, setViewMode] = useState<'grid' | 'history'>('grid');

  // Unified Evening Session Inputs
  const [entryDate, setEntryDate] = useState<string>(todayStr);
  const [collectionTime, setCollectionTime] = useState<string>('17:30'); // فترة مسائية موحدة
  const [recordedBy, setRecordedBy] = useState<string>('عامل المزرعة');

  // Matrix Inputs state: key = tierId or roomId, value = eggs count string/number
  const [tierCounts, setTierCounts] = useState<Record<string, number>>({});
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
  const [totalBrokenEggs, setTotalBrokenEggs] = useState<number>(0);
  const [traySize, setTraySize] = useState<number>(18); // الافتراضي 18 بيضة للسوق اليمني
  const [traySalePrice, setTraySalePrice] = useState<number>(farmSettings.defaultTrayPrice || 900);
  const [entryNotes, setEntryNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Synchronize custom tray sale price when traySize changes
  useEffect(() => {
    if (traySize === 18) {
      setTraySalePrice(farmSettings.defaultTrayPrice || 900);
    } else {
      db.products.toArray().then((allProds) => {
        const p = allProds.find((prod) => prod.trayCapacity === traySize);
        if (p) {
          setTraySalePrice(p.retailPrice);
        } else {
          setTraySalePrice(traySize === 12 ? 600 : traySize === 24 ? 1200 : traySize === 30 ? 1500 : 900);
        }
      }).catch((e) => {
        console.warn('Error fetching tray price for size:', e);
      });
    }
  }, [traySize, farmSettings.defaultTrayPrice]);

  // History filtering
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTarget, setFilterTarget] = useState<string>('all');

  // Sorted batteries strictly according to Arabic Alphabetical order:
  // (أ، ب، ت، ث، ج، ح، خ، د، ذ، ر، ز، س)
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

  // Load existing logs for the selected date to pre-populate the matrix
  useEffect(() => {
    if (!logs) return;
    const logsOnDate = logs.filter((l) => l.collectionDate === entryDate);

    const initialTierCounts: Record<string, number> = {};
    const initialRoomCounts: Record<string, number> = {};
    let brokenSum = 0;

    logsOnDate.forEach((log) => {
      if (log.targetType === 'tier') {
        initialTierCounts[log.targetId] = log.actualEggs;
      } else if (log.targetType === 'room' || log.targetType === 'quarantine') {
        initialRoomCounts[log.targetId] = log.actualEggs;
      }
      brokenSum += log.brokenEggs || 0;
    });

    setTierCounts(initialTierCounts);
    setRoomCounts(initialRoomCounts);
    setTotalBrokenEggs(brokenSum);
  }, [entryDate, logs]);

  // Tier value change handler
  const handleTierCountChange = (tierId: string, val: string) => {
    const num = val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0);
    setTierCounts((prev) => ({ ...prev, [tierId]: num }));
  };

  // Room value change handler
  const handleRoomCountChange = (roomId: string, val: string) => {
    const num = val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0);
    setRoomCounts((prev) => ({ ...prev, [roomId]: num }));
  };

  // Quick reset for matrix inputs
  const handleClearMatrix = () => {
    if (confirm('هل أنت متأكد من تصفير حقول إدخال اليوم الحالية؟')) {
      setTierCounts({});
      setRoomCounts({});
      setTotalBrokenEggs(0);
      setEntryNotes('');
      toast('تم تصفير الجدول', 'info');
    }
  };

  // Aggregated totals in real-time
  const totalBatteryEggs = Object.values(tierCounts).reduce((acc, val) => acc + (val || 0), 0);
  const totalRoomEggs = Object.values(roomCounts).reduce((acc, val) => acc + (val || 0), 0);
  const grossTotalEggs = totalBatteryEggs + totalRoomEggs;
  const netMarketableEggs = Math.max(0, grossTotalEggs - Number(totalBrokenEggs));
  const packagedTraysCount = Math.floor(netMarketableEggs / traySize);
  const looseEggsRemaining = netMarketableEggs % traySize;

  // Total females in cages and rooms
  const totalBatteryFemales = tiers?.reduce((acc, t) => acc + t.femalesCount, 0) || 1;
  const totalRoomFemales =
    rooms
      ?.filter((r) => r.purpose === 'layers')
      .reduce((acc, r) => acc + r.femalesCount, 0) || 1;
  const totalFarmFemales = totalBatteryFemales + totalRoomFemales;

  const farmLayingRate = Math.round((grossTotalEggs / totalFarmFemales) * 100);

  // Save all matrix data in one transaction to Dexie
  const handleSaveDailyMatrix = async () => {
    if (grossTotalEggs === 0) {
      toast('يرجى إدخال إنتاج البيض في خانات الشبوك أو الغرف قبل الحفظ', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const recordsToSave: EggProductionLog[] = [];
      const timestamp = new Date().toISOString();

      // Distribute broken eggs proportionally across non-zero targets or place on first non-zero
      let remainingBrokenToAllocate = Number(totalBrokenEggs);

      // 1. Process Battery Tiers
      for (const bat of sortedBatteries) {
        const batTiers = tiers?.filter((t) => t.batteryId === bat.id) || [];
        for (const tier of batTiers) {
          const eggs = tierCounts[tier.id] || 0;
          if (eggs > 0) {
            // Allocate broken portion
            const brokenPortion =
              grossTotalEggs > 0
                ? Math.min(eggs, Math.round((eggs / grossTotalEggs) * Number(totalBrokenEggs)))
                : 0;
            remainingBrokenToAllocate -= brokenPortion;

            const marketable = Math.max(0, eggs - brokenPortion);
            const females = tier.femalesCount;
            const layingRate = females > 0 ? (eggs / females) * 100 : 0;

            recordsToSave.push({
              id: `egg-tier-${tier.id}-${entryDate}`,
              targetType: 'tier',
              targetId: tier.id,
              targetName: `بطارية (${bat.name}) - الدور ${tier.tierNumber}`,
              collectionDate: entryDate,
              collectionTime: collectionTime,
              session: 'evening', // فترة مسائية موحدة
              actualEggs: eggs,
              brokenEggs: brokenPortion,
              marketableEggs: marketable,
              packagedTraysCount: Math.floor(marketable / traySize),
              traySize: traySize,
              liveFemalesCount: females,
              layingRatePercent: Math.round(layingRate * 10) / 10,
              elapsedHoursFromLastCollection: 24,
              normalized24hYield: eggs,
              hasIntervalWarning: false,
              recordedBy: recordedBy,
              systemRecordedAt: timestamp,
              notes: entryNotes,
            });
          }
        }
      }

      // 2. Process Floor Rooms
      if (rooms) {
        for (const room of rooms) {
          const eggs = roomCounts[room.id] || 0;
          if (eggs > 0) {
            const brokenPortion =
              grossTotalEggs > 0
                ? Math.min(eggs, Math.round((eggs / grossTotalEggs) * Number(totalBrokenEggs)))
                : 0;
            remainingBrokenToAllocate -= brokenPortion;

            const marketable = Math.max(0, eggs - brokenPortion);
            const females = room.femalesCount;
            const layingRate = females > 0 ? (eggs / females) * 100 : 0;

            recordsToSave.push({
              id: `egg-room-${room.id}-${entryDate}`,
              targetType: room.category === 'quarantine' ? 'quarantine' : 'room',
              targetId: room.id,
              targetName: `${room.name} (${room.purpose === 'layers' ? 'أمهات بياض' : room.purpose})`,
              collectionDate: entryDate,
              collectionTime: collectionTime,
              session: 'evening', // فترة مسائية موحدة
              actualEggs: eggs,
              brokenEggs: brokenPortion,
              marketableEggs: marketable,
              packagedTraysCount: Math.floor(marketable / traySize),
              traySize: traySize,
              liveFemalesCount: females,
              layingRatePercent: Math.round(layingRate * 10) / 10,
              elapsedHoursFromLastCollection: 24,
              normalized24hYield: eggs,
              hasIntervalWarning: false,
              recordedBy: recordedBy,
              systemRecordedAt: timestamp,
              notes: entryNotes,
            });
          }
        }
      }

      // Save / Overwrite in Dexie for the day
      await db.eggLogs.bulkPut(recordsToSave);

      // --- Transfer to Egg Warehouse & Batches (ترحيل الأقفاص والمفرد للمخزن وتطبيق FIFO) ---
      const todayPackagedCount = Math.floor(netMarketableEggs / traySize);
      const todayLooseCount = netMarketableEggs % traySize;

      // 1. Transfer today's packaged cages
      if (todayPackagedCount > 0) {
        const batchId = `eb-prod-${entryDate}`;
        const existingBatch = await db.eggBatches.get(batchId);
        if (existingBatch) {
          await db.eggBatches.update(batchId, {
            initialCagesCount: todayPackagedCount,
            cagesCount: todayPackagedCount,
            pricePerCage: traySalePrice,
            notes: `إنتاج يوم ${entryDate} المعياري (الصافي: ${netMarketableEggs} بيضة)`,
            updatedAt: timestamp,
          });
        } else {
          await db.eggBatches.add({
            id: batchId,
            batchCode: `EB-${entryDate.replace(/-/g, '')}-01`,
            productionDate: entryDate,
            initialCagesCount: todayPackagedCount,
            cagesCount: todayPackagedCount,
            trayCapacity: traySize,
            pricePerCage: traySalePrice,
            source: 'daily_production',
            status: 'available',
            notes: `إنتاج يوم ${entryDate} المعياري (الصافي: ${netMarketableEggs} بيضة)`,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
      }

      // 2. Transfer loose eggs with accumulation and auto-conversion upon reaching 18 eggs
      const prevLooseRecord = await db.settings.get('looseEggsBalance');
      const prevLoose = prevLooseRecord ? Number(prevLooseRecord.value) || 0 : 0;
      const totalLoose = prevLoose + todayLooseCount;
      const cagesFromLoose = Math.floor(totalLoose / traySize);
      const newRemainingLoose = totalLoose % traySize;

      // If full 18-egg cage is completed from loose balance, auto-create cage batch on completion date
      if (cagesFromLoose > 0) {
        const looseBatchId = `eb-loose-${entryDate}-${Date.now().toString().slice(-4)}`;
        await db.eggBatches.add({
          id: looseBatchId,
          batchCode: `EB-LOOSE-${entryDate.replace(/-/g, '')}`,
          productionDate: entryDate, // تاريخ يوم اكتمال العدد
          initialCagesCount: cagesFromLoose,
          cagesCount: cagesFromLoose,
          trayCapacity: traySize,
          pricePerCage: traySalePrice,
          source: 'accumulated_loose',
          status: 'available',
          notes: `تم تقفيصه آلياً لاكتمال ${traySize} بيضة من الرصيد التراكمي للمفرد (كان ${prevLoose} + أضيف ${todayLooseCount} اليوم)`,
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }

      // Update loose balance in settings
      await db.settings.put({ key: 'looseEggsBalance', value: newRemainingLoose });

      // 3. Re-sync total available stock of prod-tray-18 in products table
      try {
        const allBatches = await db.eggBatches.toArray();
        const totalWarehouseCages = allBatches.reduce(
          (acc, b) => acc + (b.status === 'available' ? b.cagesCount : 0),
          0
        );
        const allProds = await db.products.toArray();
        const prod18 = allProds.find((p) => p.trayCapacity === 18 || p.id === 'prod-tray-18');
        if (prod18) {
          await db.products.update(prod18.id, {
            stockQuantity: totalWarehouseCages,
            retailPrice: traySalePrice,
          });
        }
      } catch (prodSyncErr) {
        console.warn('Product sync warning:', prodSyncErr);
      }

      let toastMsg = `تم بنجاح حفظ وتثبيت إنتاج يوم ${entryDate}! تم توريد ${todayPackagedCount} قفص إلى مخزن البيض.`;
      if (todayLooseCount > 0) {
        toastMsg += ` وترحيل ${todayLooseCount} بيضة مفردة للمخزن.`;
      }
      if (cagesFromLoose > 0) {
        toastMsg += ` 🎉 اكتملت ${traySize} بيضة مفردة وتم تحويل ${cagesFromLoose} قفص إضافي للمخزن آلياً!`;
      }
      toastMsg += ` الرصيد التراكمي للمفرد بالمخزن: ${newRemainingLoose} بيضة.`;

      toast(toastMsg, 'success');
    } catch (err: any) {
      console.error('handleSaveDailyMatrix error:', err);
      toast(`حدث خطأ أثناء حفظ البيانات: ${err?.message || err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await db.eggLogs.delete(id);
      toast('تم حذف السجل بنجاح', 'info');
    }
  };

  // Filtered logs for History tab
  const filteredLogs = logs?.filter((log) => {
    if (filterTarget !== 'all') {
      if (filterTarget === 'tiers' && log.targetType !== 'tier') return false;
      if (filterTarget === 'rooms' && log.targetType !== 'room') return false;
    }
    if (filterDate && log.collectionDate !== filterDate) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Egg className="w-6 h-6 text-emerald-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              جدول الإدخال السريع اليومي لإنتاج البيض (Rapid Grid Entry)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            دفتر المزرعة اليومي • فترة مسائية موحدة • إدخال مصفوفي مباشر للشبوك والغرف مع خصم المكسر وتقفيص الأطباق.
          </p>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-2xl bg-white border border-slate-200 flex shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'grid'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>جدول الإدخال اليومي (الدفتر)</span>
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'history'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>سجل الأيام السابقة</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Shift & Unified Evening Session Control Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Input */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">تاريخ الجمع:</span>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Unified Evening Collection Time */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-700">وقت الجمع المسائي الموحد:</span>
                <input
                  type="time"
                  value={collectionTime}
                  onChange={(e) => setCollectionTime(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-sky-500 outline-none"
                />
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-extrabold">
                  فترة مسائية موحدة
                </span>
              </div>

              {/* Collector / Worker */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">القائم بالجمع:</span>
                <input
                  type="text"
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white outline-none w-32"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mr-auto">
              <button
                type="button"
                onClick={handleClearMatrix}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تصفير الخانات</span>
              </button>
            </div>
          </div>

          {/* Section 1: Battery Cages Matrix (قسم الشبوك - البطاريات أ إلى س) */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    مصفوفة الشبوك (البطاريات من أ إلى س - الترتيب الهجائي الرسمي)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    أدخل عدد البيض المجموع لكل دور مباشرة (استخدم زر Tab أو Enter للتنقل الفوري بين الخانات).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">إجمالي بيض الشبوك اليوم:</span>
                <span className="font-mono text-emerald-700 font-black text-base bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                  {totalBatteryEggs.toLocaleString('ar-SA')} بيضة
                </span>
              </div>
            </div>

            {/* Batteries Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-extrabold border-b border-slate-200 text-center">
                    <th className="p-3 w-28 text-right pr-4">البطارية (أ-س)</th>
                    <th className="p-3 w-32 bg-emerald-50/50 text-emerald-950">الدور 1 (العلوي)</th>
                    <th className="p-3 w-32">الدور 2</th>
                    <th className="p-3 w-32 bg-slate-50/80">الدور 3</th>
                    <th className="p-3 w-32 bg-emerald-50/50 text-emerald-950">الدور 4 (السفلي)</th>
                    <th className="p-3 w-32 bg-slate-200/60 font-black">إجمالي البطارية</th>
                    <th className="p-3 w-28 text-slate-500 font-bold">نسبة البياض</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {sortedBatteries.map((bat, bIndex) => {
                    const batTiers =
                      tiers
                        ?.filter((t) => t.batteryId === bat.id)
                        .sort((a, b) => a.tierNumber - b.tierNumber) || [];

                    const t1 = batTiers.find((t) => t.tierNumber === 1);
                    const t2 = batTiers.find((t) => t.tierNumber === 2);
                    const t3 = batTiers.find((t) => t.tierNumber === 3);
                    const t4 = batTiers.find((t) => t.tierNumber === 4);

                    const count1 = t1 ? tierCounts[t1.id] || 0 : 0;
                    const count2 = t2 ? tierCounts[t2.id] || 0 : 0;
                    const count3 = t3 ? tierCounts[t3.id] || 0 : 0;
                    const count4 = t4 ? tierCounts[t4.id] || 0 : 0;

                    const batTotal = count1 + count2 + count3 + count4;
                    const batFemales = batTiers.reduce((acc, t) => acc + t.femalesCount, 0);
                    const batRate = batFemales > 0 ? Math.round((batTotal / batFemales) * 100) : 0;

                    const t1Age = t1 ? calculateFlockAgeInfo({
                      housingDate: t1.housingDate,
                      initialAgeWeeks: t1.initialAgeWeeks,
                      targetLifespanWeeks: t1.targetLayingLifespanWeeks,
                      purpose: 'layers',
                    }) : null;
                    const t2Age = t2 ? calculateFlockAgeInfo({
                      housingDate: t2.housingDate,
                      initialAgeWeeks: t2.initialAgeWeeks,
                      targetLifespanWeeks: t2.targetLayingLifespanWeeks,
                      purpose: 'layers',
                    }) : null;
                    const t3Age = t3 ? calculateFlockAgeInfo({
                      housingDate: t3.housingDate,
                      initialAgeWeeks: t3.initialAgeWeeks,
                      targetLifespanWeeks: t3.targetLayingLifespanWeeks,
                      purpose: 'layers',
                    }) : null;
                    const t4Age = t4 ? calculateFlockAgeInfo({
                      housingDate: t4.housingDate,
                      initialAgeWeeks: t4.initialAgeWeeks,
                      targetLifespanWeeks: t4.targetLayingLifespanWeeks,
                      purpose: 'layers',
                    }) : null;

                    return (
                      <tr
                        key={bat.id}
                        className="hover:bg-slate-50/80 transition-colors group text-center"
                      >
                        {/* Battery Identifier */}
                        <td className="p-2.5 text-right font-almarai font-extrabold text-slate-900 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs shadow-sm">
                              {bat.name}
                            </span>
                            <span className="text-xs">بطارية ({bat.name})</span>
                          </div>
                        </td>

                        {/* Tier 1 */}
                        <td className={`p-2 bg-emerald-50/20 ${t1Age?.isEndOfCycle ? 'bg-rose-50/50' : ''}`}>
                          {t1 ? (
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                max="35"
                                value={tierCounts[t1.id] ?? ''}
                                placeholder="0"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleTierCountChange(t1.id, e.target.value)}
                                className={`w-full text-center py-2 px-1 font-mono font-bold text-sm bg-white border rounded-xl outline-none transition-all shadow-sm ${
                                  t1Age?.isEndOfCycle
                                    ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-rose-900'
                                    : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                                }`}
                              />
                              {t1Age && (
                                <div className="mt-1 flex flex-col items-center leading-tight" title={t1Age.meatConversionNotice}>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${t1Age.badgeBgClass} ${t1Age.badgeTextClass}`}>
                                    {t1Age.ageWeeks} أسب
                                  </span>
                                  {t1Age.isEndOfCycle ? (
                                    <span className="text-[9px] text-rose-700 font-black flex items-center gap-0.5 mt-0.5">
                                      <Flame className="w-2.5 h-2.5" /> جاهز لاحم
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-500 font-bold mt-0.5">
                                      متبقي {t1Age.remainingWeeks} أسب
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Tier 2 */}
                        <td className={`p-2 ${t2Age?.isEndOfCycle ? 'bg-rose-50/50' : ''}`}>
                          {t2 ? (
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                max="35"
                                value={tierCounts[t2.id] ?? ''}
                                placeholder="0"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleTierCountChange(t2.id, e.target.value)}
                                className={`w-full text-center py-2 px-1 font-mono font-bold text-sm bg-white border rounded-xl outline-none transition-all shadow-sm ${
                                  t2Age?.isEndOfCycle
                                    ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-rose-900'
                                    : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                                }`}
                              />
                              {t2Age && (
                                <div className="mt-1 flex flex-col items-center leading-tight" title={t2Age.meatConversionNotice}>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${t2Age.badgeBgClass} ${t2Age.badgeTextClass}`}>
                                    {t2Age.ageWeeks} أسب
                                  </span>
                                  {t2Age.isEndOfCycle ? (
                                    <span className="text-[9px] text-rose-700 font-black flex items-center gap-0.5 mt-0.5">
                                      <Flame className="w-2.5 h-2.5" /> جاهز لاحم
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-500 font-bold mt-0.5">
                                      متبقي {t2Age.remainingWeeks} أسب
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Tier 3 */}
                        <td className={`p-2 bg-slate-50/40 ${t3Age?.isEndOfCycle ? 'bg-rose-50/50' : ''}`}>
                          {t3 ? (
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                max="35"
                                value={tierCounts[t3.id] ?? ''}
                                placeholder="0"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleTierCountChange(t3.id, e.target.value)}
                                className={`w-full text-center py-2 px-1 font-mono font-bold text-sm bg-white border rounded-xl outline-none transition-all shadow-sm ${
                                  t3Age?.isEndOfCycle
                                    ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-rose-900'
                                    : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                                }`}
                              />
                              {t3Age && (
                                <div className="mt-1 flex flex-col items-center leading-tight" title={t3Age.meatConversionNotice}>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${t3Age.badgeBgClass} ${t3Age.badgeTextClass}`}>
                                    {t3Age.ageWeeks} أسب
                                  </span>
                                  {t3Age.isEndOfCycle ? (
                                    <span className="text-[9px] text-rose-700 font-black flex items-center gap-0.5 mt-0.5">
                                      <Flame className="w-2.5 h-2.5" /> جاهز لاحم
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-500 font-bold mt-0.5">
                                      متبقي {t3Age.remainingWeeks} أسب
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Tier 4 */}
                        <td className={`p-2 bg-emerald-50/20 ${t4Age?.isEndOfCycle ? 'bg-rose-50/50' : ''}`}>
                          {t4 ? (
                            <div className="flex flex-col items-center">
                              <input
                                type="number"
                                min="0"
                                max="35"
                                value={tierCounts[t4.id] ?? ''}
                                placeholder="0"
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleTierCountChange(t4.id, e.target.value)}
                                className={`w-full text-center py-2 px-1 font-mono font-bold text-sm bg-white border rounded-xl outline-none transition-all shadow-sm ${
                                  t4Age?.isEndOfCycle
                                    ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-rose-900'
                                    : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                                }`}
                              />
                              {t4Age && (
                                <div className="mt-1 flex flex-col items-center leading-tight" title={t4Age.meatConversionNotice}>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${t4Age.badgeBgClass} ${t4Age.badgeTextClass}`}>
                                    {t4Age.ageWeeks} أسب
                                  </span>
                                  {t4Age.isEndOfCycle ? (
                                    <span className="text-[9px] text-rose-700 font-black flex items-center gap-0.5 mt-0.5">
                                      <Flame className="w-2.5 h-2.5" /> جاهز لاحم
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-500 font-bold mt-0.5">
                                      متبقي {t4Age.remainingWeeks} أسب
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Battery Total */}
                        <td className="p-2 bg-slate-100/50 font-black text-slate-900 text-sm">
                          <span
                            className={
                              batTotal > 0
                                ? 'text-emerald-700 font-extrabold'
                                : 'text-slate-400'
                            }
                          >
                            {batTotal}
                          </span>
                        </td>

                        {/* Battery Laying Rate */}
                        <td className="p-2 text-xs">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              batRate >= 65
                                ? 'bg-emerald-100 text-emerald-800'
                                : batRate > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'text-slate-400'
                            }`}
                          >
                            {batRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Floor Rearing Rooms (قسم الغرف من 1 إلى 7 + المعزولات + الملحقات) */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    جدول إنتاج الغرف الأرضية (من غرفة 1 إلى غرفة 7، والمعزولات، والملحقات)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تسجيل إنتاج بيض الغرف البياضة وأي بيض مجموع من أقسام التحضين أو المعزولات.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">إجمالي بيض الغرف اليوم:</span>
                <span className="font-mono text-sky-700 font-black text-base bg-sky-50 px-3 py-1 rounded-xl border border-sky-200">
                  {totalRoomEggs.toLocaleString('ar-SA')} بيضة
                </span>
              </div>
            </div>

            {/* Rooms Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {rooms?.map((room) => {
                const roomEggVal = roomCounts[room.id] || 0;
                const isLayers = room.purpose === 'layers';
                const rate =
                  room.femalesCount > 0
                    ? Math.round((roomEggVal / room.femalesCount) * 100)
                    : 0;

                const roomAge = calculateFlockAgeInfo({
                  hatchDate: room.hatchDate,
                  housingDate: room.housingDate,
                  initialAgeWeeks: room.initialAgeWeeks,
                  targetLifespanWeeks: room.targetLayingLifespanWeeks,
                  purpose: room.purpose,
                });

                return (
                  <div
                    key={room.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      roomAge.isEndOfCycle
                        ? 'bg-rose-50/50 border-rose-200'
                        : isLayers
                        ? 'bg-sky-50/40 border-sky-200'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-black text-xs text-slate-900">{room.name}</div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isLayers
                            ? 'bg-emerald-100 text-emerald-800'
                            : room.category === 'quarantine'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isLayers ? 'أمهات بياض' : room.category === 'quarantine' ? 'معزولات' : 'تحضين/تسمين'}
                      </span>
                    </div>

                    {/* Room Flock Age & Meat Culling Countdown */}
                    <div className="flex items-center justify-between bg-white/80 px-2 py-1 rounded-xl border border-slate-200/60 mb-2.5 text-[10px]" title={roomAge.meatConversionNotice}>
                      <span className={`px-1.5 py-0.5 rounded font-extrabold ${roomAge.badgeBgClass} ${roomAge.badgeTextClass}`}>
                        {roomAge.ageWeeks > 0 ? `${roomAge.ageWeeks} أسبوع` : `${roomAge.ageDays} يوم`} • {roomAge.phaseLabel}
                      </span>
                      {roomAge.isEndOfCycle ? (
                        <span className="text-rose-700 font-extrabold flex items-center gap-0.5">
                          <Flame className="w-3 h-3" /> للبيع لاحم
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">
                          متبقي {room.purpose === 'fattening' ? `${roomAge.remainingDays} يوم` : `${roomAge.remainingWeeks} أسبوع`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={roomCounts[room.id] ?? ''}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleRoomCountChange(room.id, e.target.value)}
                        className="flex-1 text-center py-2 px-2 font-mono font-black text-base bg-white border border-slate-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all shadow-sm"
                      />
                      <span className="text-xs text-slate-500 font-bold shrink-0">بيضة</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>إناث: {room.femalesCount}</span>
                      {isLayers && rate > 0 && (
                        <span className="font-mono text-sky-700 font-bold">بياض: {rate}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Bottom Calculation, Broken Egg Deduction & Packaging Bar */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-apple space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black">
                    ملخص الفرز اليومي، خصم المكسر، وتقفيص الأطباق
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  حساب فوري للإنتاج الصافي وتوزيع التقفيص بسعة 18 بيضة (الافتراضي للسوق اليمني).
                </p>
              </div>

              {/* Tray Capacity Selector */}
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-2xl border border-white/15">
                <Package className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200">سعة الطبق للتقفيص:</span>
                <select
                  value={traySize}
                  onChange={(e) => setTraySize(Number(e.target.value))}
                  className="bg-slate-800 text-white text-xs font-bold font-mono px-2 py-1 rounded-xl border border-white/20 outline-none"
                >
                  <option value={18}>18 بيضة (القياسي لليمن)</option>
                  <option value={12}>12 بيضة</option>
                  <option value={24}>24 بيضة</option>
                  <option value={30}>30 بيضة</option>
                </select>
              </div>
            </div>

            {/* Calculations KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* 1. Gross Total */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                <span className="text-xs text-slate-400 block mb-1">إجمالي المجموع الكلي</span>
                <div className="text-2xl lg:text-3xl font-black font-mono text-white">
                  {grossTotalEggs.toLocaleString('ar-SA')}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  شبوك: {totalBatteryEggs} | غرف: {totalRoomEggs}
                </div>
              </div>

              {/* 2. Broken Eggs Input Field */}
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border-2 border-rose-400/40 text-center">
                <span className="text-xs font-bold text-rose-300 block mb-1">
                  إجمالي البيض المكسر (يخصم آلياً)
                </span>
                <input
                  type="number"
                  min="0"
                  max={grossTotalEggs}
                  value={totalBrokenEggs || ''}
                  placeholder="0"
                  onChange={(e) => setTotalBrokenEggs(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full text-center py-1 font-mono font-black text-xl lg:text-2xl bg-rose-950/60 border border-rose-400/50 rounded-xl text-rose-200 outline-none focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-[10px] text-rose-300/80 mt-1 block">
                  استبعاد الكسر والشرخ
                </span>
              </div>

              {/* 3. Net Marketable Eggs */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border-2 border-emerald-400/50 text-center">
                <span className="text-xs font-black text-emerald-300 block mb-1">
                  إنتاج البيض الصافي
                </span>
                <div className="text-2xl lg:text-3xl font-black font-mono text-emerald-400">
                  {netMarketableEggs.toLocaleString('ar-SA')}
                </div>
                <div className="text-[10px] text-emerald-300/80 mt-1">
                  البيض السليم للتسويق
                </div>
              </div>

              {/* 4. Packaged Trays & Loose Accumulation */}
              <div className="p-3.5 rounded-2xl bg-sky-500/15 border border-sky-400/40 text-center flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-sky-300 block mb-1">
                    تقفيص أقفاص ({traySize} بيضة)
                  </span>
                  <div className="text-2xl lg:text-3xl font-black font-mono text-sky-400">
                    {packagedTraysCount} <span className="text-xs font-almarai font-normal">قفص</span>
                  </div>
                  <div className="text-[10px] text-sky-300/80 mt-1">
                    + {looseEggsRemaining} بيضة مفردة
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-sky-400/20 text-[10px] text-sky-200">
                  <div className="flex justify-between items-center">
                    <span>رصيد المخزن المفرد:</span>
                    <b className="font-mono text-white">{accumulatedLoose} بيضة</b>
                  </div>
                  {Math.floor((accumulatedLoose + looseEggsRemaining) / traySize) > 0 ? (
                    <div className="mt-1 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-bold text-[9px]">
                      🎉 سيكتمل {Math.floor((accumulatedLoose + looseEggsRemaining) / traySize)} قفص إضافي فور الحفظ!
                    </div>
                  ) : (
                    <div className="mt-0.5 text-slate-400 text-[9px]">
                      (متبقي {traySize - ((accumulatedLoose + looseEggsRemaining) % traySize)} بيضة لقفص جديد)
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Custom Tray Price & Estimated Revenue */}
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-400/50 text-center flex flex-col justify-between col-span-2 sm:col-span-1">
                <div>
                  <span className="text-xs font-bold text-amber-300 block mb-1">
                    سعر بيع الطبق المخصص
                  </span>
                  <div className="flex items-center justify-center gap-1.5 my-0.5">
                    <input
                      type="number"
                      min="0"
                      value={traySalePrice || ''}
                      onChange={(e) => setTraySalePrice(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      title="تخصيص سعر بيع الطبق واحتساب القيمة التسويقية فورياً"
                      className="w-20 text-center py-0.5 font-mono font-black text-lg bg-slate-900 border border-amber-400/60 rounded-xl text-amber-300 outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                    />
                    <span className="text-[10px] font-bold text-amber-300 shrink-0">{farmSettings.currency}</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-amber-400/20">
                  <div className="text-[10px] text-amber-200 leading-tight">
                    عائد متوقع: <b className="font-mono text-xs text-white">{(packagedTraysCount * traySalePrice).toLocaleString('ar-SA')}</b> {farmSettings.currency}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const allProds = await db.products.toArray();
                      const prod = allProds.find((p) => p.trayCapacity === traySize || (traySize === 18 && p.id === 'prod-tray-18'));
                      if (prod) {
                        await db.products.update(prod.id, { retailPrice: traySalePrice });
                      }
                      if (traySize === 18) {
                        await updateSettings({ ...farmSettings, defaultTrayPrice: traySalePrice });
                      }
                      toast(`تم اعتماد سعر ${traySalePrice} ${farmSettings.currency} للطبق في المتجر ونقاط البيع!`, 'success');
                    }}
                    className="mt-0.5 text-[9px] text-amber-300 hover:text-white underline font-bold block"
                  >
                    تثبيت كسعر معتمد في POS ←
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Operational Notes & Save Button */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <input
                type="text"
                placeholder="ملاحظات تشغيلية عن إنتاج اليوم (اختياري)..."
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
                className="flex-1 w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-400 outline-none focus:bg-white/15"
              />

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveDailyMatrix}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 transition-all shrink-0 active:scale-95 disabled:opacity-50"
              >
                <Save className="w-5 h-5 stroke-[2.5]" />
                <span>حفظ وتثبيت إنتاج اليوم بالكامل في الدفتر</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History & Previous Logs Table */
        <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="font-black text-sm text-slate-900">سجل إدخالات الإنتاج السابقة ومراجعتها</h3>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono"
              />
              <button
                onClick={() => setFilterDate('')}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                عرض كل التواريخ
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">المكان</th>
                  <th className="p-3 text-center">المجموع الكلي</th>
                  <th className="p-3 text-center text-rose-600">المكسر</th>
                  <th className="p-3 text-center text-emerald-700 font-black">الصافي</th>
                  <th className="p-3 text-center">تقفيص أطباق</th>
                  <th className="p-3 text-center">نسبة البياض</th>
                  <th className="p-3">القائم بالجمع</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs && filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {log.collectionDate} <span className="text-[10px] text-slate-400">({log.collectionTime})</span>
                      </td>
                      <td className="p-3 font-bold text-slate-800">{log.targetName}</td>
                      <td className="p-3 text-center font-mono font-bold">{log.actualEggs}</td>
                      <td className="p-3 text-center font-mono text-rose-600 font-bold">
                        {log.brokenEggs || 0}
                      </td>
                      <td className="p-3 text-center font-mono text-emerald-700 font-black">
                        {log.marketableEggs || log.actualEggs}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {log.packagedTraysCount ? `${log.packagedTraysCount} طبق (${log.traySize || 18}ب)` : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-teal-700">
                        {log.layingRatePercent}%
                      </td>
                      <td className="p-3 text-slate-600">{log.recordedBy}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      لا توجد سجلات إنتاج مسجلة لهذا التاريخ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
