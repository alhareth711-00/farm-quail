import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type {
  IncubationBatch,
  BroodingBatch,
  BroodingWeeklyRate,
  FeedStock,
  FeedType,
} from '../../types';
import { DEFAULT_BROODING_RATES } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import confetti from 'canvas-confetti';
import {
  EggFried,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Eye,
  ArrowRight,
  TrendingUp,
  Percent,
  Flame,
  Thermometer,
  Wind,
  Settings,
  Zap,
  Layers,
  Baby,
  Skull,
  GraduationCap,
  Info,
  Save,
  RefreshCw,
  Package,
} from 'lucide-react';

export const IncubatorTrackerView: React.FC = () => {
  const { toast } = useToast();
  const { farmSettings, userName } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  // Top Section Tab
  const [activeTab, setActiveTab] = useState<'brooding' | 'incubation' | 'schedule_settings'>('brooding');

  // Queries
  const incubationBatches = useLiveQuery(() => db.incubationBatches.toArray(), []);
  const broodingBatches = useLiveQuery(() => db.broodingBatches.toArray(), []);
  const feedStocks = useLiveQuery(() => db.feedStock.toArray(), []);
  const feedScheduleSetting = useLiveQuery(() => db.settings.get('broodingFeedSchedule'), []);

  // Active Weekly Rates (from settings or defaults)
  const activeRates: BroodingWeeklyRate[] = React.useMemo(() => {
    if (feedScheduleSetting?.value?.rates && Array.isArray(feedScheduleSetting.value.rates)) {
      return feedScheduleSetting.value.rates;
    }
    return DEFAULT_BROODING_RATES;
  }, [feedScheduleSetting]);

  // Modals for Incubation
  const [showAddIncBatchModal, setShowAddIncBatchModal] = useState(false);
  const [activeBatchForCandling, setActiveBatchForCandling] = useState<IncubationBatch | null>(null);
  const [activeBatchForHatch, setActiveBatchForHatch] = useState<IncubationBatch | null>(null);

  // Incubation Form state
  const [incBatchNumber, setIncBatchNumber] = useState('');
  const [incubatorName, setIncubatorName] = useState('فقاسة الصقر الذكية 1000');
  const [incEggCount, setIncEggCount] = useState(500);
  const [incStartDate, setIncStartDate] = useState(todayStr);
  const [incNotes, setIncNotes] = useState('');

  // Candling Form
  const [fertileEggsInput, setFertileEggsInput] = useState(0);
  const [infertileEggsInput, setInfertileEggsInput] = useState(0);

  // Hatch Form
  const [hatchedChicksInput, setHatchedChicksInput] = useState(0);
  const [weakChicksInput, setWeakChicksInput] = useState(0);
  const [deadInShellInput, setDeadInShellInput] = useState(0);
  const [autoTransferToBrooder, setAutoTransferToBrooder] = useState(true);

  // Modals for Brooding
  const [showAddBroodModal, setShowAddBroodModal] = useState(false);
  const [showScheduleSettingsModal, setShowScheduleSettingsModal] = useState(false);
  const [activeBatchForMortality, setActiveBatchForMortality] = useState<BroodingBatch | null>(null);
  const [mortalityQtyInput, setMortalityQtyInput] = useState(1);
  const [mortalityNotesInput, setMortalityNotesInput] = useState('');

  // Add Brooding Form state
  const [broodBatchNumber, setBroodBatchNumber] = useState('');
  const [broodSource, setBroodSource] = useState('تفريخ داخلي (الفقاسات)');
  const [broodHatchDate, setBroodHatchDate] = useState(todayStr);
  const [broodChicksCount, setBroodChicksCount] = useState(500);
  const [broodLocation, setBroodLocation] = useState('حضانة تدفئة رقم 1');
  const [broodFeedType, setBroodFeedType] = useState<FeedType>('starter_24_27');
  const [broodNotes, setBroodNotes] = useState('');

  // Schedule Settings Form (Custom Grams / Day)
  const [editRates, setEditRates] = useState<BroodingWeeklyRate[]>(DEFAULT_BROODING_RATES);

  // --- Helper Calculations for Brooding ---

  // Helper: Get grams per chick for given age in days
  const getGramsPerChickForAge = (ageDays: number, rates: BroodingWeeklyRate[]): number => {
    if (ageDays <= 7) return rates.find((r) => r.weekNumber === 1)?.defaultGramsPerChickDay ?? 6.5;
    if (ageDays <= 14) return rates.find((r) => r.weekNumber === 2)?.defaultGramsPerChickDay ?? 12.0;
    if (ageDays <= 21) return rates.find((r) => r.weekNumber === 3)?.defaultGramsPerChickDay ?? 16.5;
    if (ageDays <= 28) return rates.find((r) => r.weekNumber === 4)?.defaultGramsPerChickDay ?? 21.0;
    return rates.find((r) => r.weekNumber === 5)?.defaultGramsPerChickDay ?? 25.0;
  };

  // Helper: Get Phase Info for Brooding Batch
  const getBroodingInfo = (batch: BroodingBatch) => {
    const start = new Date(batch.hatchDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const ageDays = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const isPhase1 = ageDays <= 21;
    const isPhase2 = ageDays >= 22 && ageDays <= 38;
    const isGraduated = ageDays > 38;

    const currentWeek =
      ageDays <= 7 ? 1 : ageDays <= 14 ? 2 : ageDays <= 21 ? 3 : ageDays <= 28 ? 4 : 5;

    const gramsToday = getGramsPerChickForAge(ageDays, activeRates);
    const dailyKg = Math.round(((batch.currentChicksCount * gramsToday) / 1000) * 100) / 100;

    const feedObj = feedStocks?.find((f) => f.feedType === batch.selectedFeedType);
    const bagWeight = feedObj?.bagWeightKg || 50;
    const costPerBag = feedObj?.costPerBag || (batch.selectedFeedType === 'starter_24_27' ? 29000 : 27000);
    const unitCost = costPerBag / bagWeight;
    const dailyCost = Math.round(dailyKg * unitCost);

    const isDeductedToday = batch.lastFeedDeductionDate === todayStr;
    const progressPercent = Math.min(100, Math.round((ageDays / 38) * 100));

    return {
      ageDays,
      currentWeek,
      isPhase1,
      isPhase2,
      isGraduated,
      gramsToday,
      dailyKg,
      dailyCost,
      feedObj,
      isDeductedToday,
      progressPercent,
    };
  };

  // Incubation Progress helper
  const calculateBatchProgress = (batch: IncubationBatch) => {
    const start = new Date(batch.startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const currentDay = Math.min(
      17,
      Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1)
    );
    const progressPercent = Math.min(100, Math.round((currentDay / 17) * 100));

    const isCandlingDue = currentDay >= 7 && currentDay <= 10 && !batch.candlingDone;
    const isTransferDue = currentDay >= 14 && batch.status !== 'transferred' && batch.status !== 'hatched';
    const isHatchDue = currentDay >= 17 && !batch.hatchedDone;

    const fertilityRate =
      batch.candlingDone && batch.eggCount > 0
        ? Math.round((batch.fertileEggs / batch.eggCount) * 100)
        : null;

    const hatchabilityRate =
      batch.hatchedDone && batch.fertileEggs > 0
        ? Math.round((batch.hatchedChicks / batch.fertileEggs) * 100)
        : null;

    return {
      currentDay,
      progressPercent,
      isCandlingDue,
      isTransferDue,
      isHatchDue,
      fertilityRate,
      hatchabilityRate,
    };
  };

  // Summary Statistics
  const activeBroodingList = broodingBatches?.filter((b) => b.status === 'active') || [];
  const totalChicks = activeBroodingList.reduce((acc, b) => acc + (b.currentChicksCount || 0), 0);

  const phase1Batches = activeBroodingList.filter((b) => {
    const age = Math.max(1, Math.floor((new Date().getTime() - new Date(b.hatchDate).getTime()) / 86400000) + 1);
    return age <= 21;
  });
  const phase1Chicks = phase1Batches.reduce((acc, b) => acc + (b.currentChicksCount || 0), 0);

  const phase2Batches = activeBroodingList.filter((b) => {
    const age = Math.max(1, Math.floor((new Date().getTime() - new Date(b.hatchDate).getTime()) / 86400000) + 1);
    return age >= 22 && age <= 38;
  });
  const phase2Chicks = phase2Batches.reduce((acc, b) => acc + (b.currentChicksCount || 0), 0);

  const totalDailyBroodKg = activeBroodingList.reduce((acc, b) => {
    const info = getBroodingInfo(b);
    return acc + info.dailyKg;
  }, 0);

  const totalDailyBroodCost = activeBroodingList.reduce((acc, b) => {
    const info = getBroodingInfo(b);
    return acc + info.dailyCost;
  }, 0);

  // --- Handlers for Brooding Operations ---

  // 1. Deduct feed for a single batch
  const handleDeductBatchFeed = async (batch: BroodingBatch) => {
    const info = getBroodingInfo(batch);
    const feedStock = await db.feedStock.where('feedType').equals(batch.selectedFeedType).first();

    if (!feedStock) {
      toast('نوع العلف المحدد غير مسجل في المستودع', 'error');
      return;
    }

    if (feedStock.totalKg < info.dailyKg) {
      toast(
        `⚠️ رصيد المستودع من (${feedStock.name}) هو ${feedStock.totalKg} كغم، وغير كافٍ للاستهلاك اليومي المطلوب (${info.dailyKg} كغم)!`,
        'error'
      );
      return;
    }

    try {
      const newTotalKg = Math.max(0, Math.round((feedStock.totalKg - info.dailyKg) * 100) / 100);
      const newBags = Math.floor(newTotalKg / feedStock.bagWeightKg);

      await db.feedStock.update(feedStock.id, {
        totalKg: newTotalKg,
        bagsCount: newBags,
      });

      const phaseLabel = info.isPhase1
        ? 'المرحلة 1: تدفئة'
        : info.isPhase2
        ? 'المرحلة 2: بطاريات تحضين'
        : 'مكتملة التحضين';

      await db.feedConsumption.add({
        id: `fc-brood-${Date.now()}-${batch.id}`,
        date: todayStr,
        targetType: 'room',
        targetId: batch.id,
        targetName: `دفعة تحضين (${batch.batchNumber}) - ${phaseLabel} (عمر ${info.ageDays} يوم)`,
        feedType: batch.selectedFeedType,
        bagsUsed: Math.round((info.dailyKg / feedStock.bagWeightKg) * 100) / 100,
        kgUsed: info.dailyKg,
        costAmount: info.dailyCost,
        birdsCount: batch.currentChicksCount,
        notes: `خصم استهلاك يومي لصيصان التحضين (${batch.batchNumber}) بعمر ${info.ageDays} يوم بمعدل ${info.gramsToday} جم/طير (${feedStock.name})`,
        recordedBy: userName || 'مشرف التحضين والتغذية',
        createdAt: new Date().toISOString(),
      });

      await db.broodingBatches.update(batch.id, {
        lastFeedDeductionDate: todayStr,
        totalFeedConsumedKg: (batch.totalFeedConsumedKg || 0) + info.dailyKg,
        updatedAt: new Date().toISOString(),
      });

      toast(
        `✅ تم خصم استهلاك اليوم (${info.dailyKg} كغم من ${feedStock.name}) لدفعة (${batch.batchNumber}) بنجاح! التكلفة: ${info.dailyCost.toLocaleString('ar-SA')} ${farmSettings.currency}`,
        'success'
      );
    } catch (err: any) {
      console.error('Error deducting brooding feed:', err);
      toast('تعذر خصم العلف، يرجى المحاولة لاحقاً', 'error');
    }
  };

  // 2. Bulk deduct feed for all active brooding batches
  const handleBulkDeductAllBrooding = async () => {
    const unDeductedBatches = activeBroodingList.filter((b) => b.lastFeedDeductionDate !== todayStr);
    if (unDeductedBatches.length === 0) {
      toast('جميع دفعات التحضين النشطة تم خصم استهلاكها لليوم بالفعل!', 'info');
      return;
    }

    let successCount = 0;
    let totalDeductedKg = 0;

    for (const batch of unDeductedBatches) {
      const info = getBroodingInfo(batch);
      const feedStock = await db.feedStock.where('feedType').equals(batch.selectedFeedType).first();

      if (feedStock && feedStock.totalKg >= info.dailyKg) {
        const newTotalKg = Math.max(0, Math.round((feedStock.totalKg - info.dailyKg) * 100) / 100);
        const newBags = Math.floor(newTotalKg / feedStock.bagWeightKg);

        await db.feedStock.update(feedStock.id, {
          totalKg: newTotalKg,
          bagsCount: newBags,
        });

        await db.feedConsumption.add({
          id: `fc-brood-${Date.now()}-${batch.id}`,
          date: todayStr,
          targetType: 'room',
          targetId: batch.id,
          targetName: `دفعة تحضين (${batch.batchNumber}) - عمر ${info.ageDays} يوم`,
          feedType: batch.selectedFeedType,
          bagsUsed: Math.round((info.dailyKg / feedStock.bagWeightKg) * 100) / 100,
          kgUsed: info.dailyKg,
          costAmount: info.dailyCost,
          birdsCount: batch.currentChicksCount,
          notes: `خصم جماعي يومي لدفعة (${batch.batchNumber}) بمعدل ${info.gramsToday} جم/طير`,
          recordedBy: userName || 'مشرف التحضين والتغذية',
          createdAt: new Date().toISOString(),
        });

        await db.broodingBatches.update(batch.id, {
          lastFeedDeductionDate: todayStr,
          totalFeedConsumedKg: (batch.totalFeedConsumedKg || 0) + info.dailyKg,
          updatedAt: new Date().toISOString(),
        });

        successCount++;
        totalDeductedKg += info.dailyKg;
      }
    }

    if (successCount > 0) {
      toast(
        `⚡ تم خصم استهلاك اليوم لـ ${successCount} دفعات تحضين بإجمالي ${Math.round(totalDeductedKg * 100) / 100} كغم علف بنجاح!`,
        'success'
      );
    } else {
      toast('تعذر خصم العلف الجماعي بسبب عدم كفاية رصيد المستودع', 'error');
    }
  };

  // 3. Switch Feed Type for a batch
  const handleSwitchFeedType = async (batchId: string, newType: FeedType) => {
    await db.broodingBatches.update(batchId, {
      selectedFeedType: newType,
      updatedAt: new Date().toISOString(),
    });
    const label = newType === 'starter_24_27' ? 'علف بادي 24-27%' : 'علف نامي 20-22%';
    toast(`تم تحديث نوع العلف للدفعة إلى (${label})`, 'info');
  };

  // 4. Record Mortality
  const handleSaveMortality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchForMortality) return;

    const qty = Math.max(1, Math.floor(Number(mortalityQtyInput)));
    if (qty > activeBatchForMortality.currentChicksCount) {
      toast('عدد النفوق أكبر من عدد الكتاكيت الحية المتوفرة بالدفعة!', 'error');
      return;
    }

    const newCurrent = activeBatchForMortality.currentChicksCount - qty;
    const newTotalMortality = activeBatchForMortality.mortalityCount + qty;

    await db.broodingBatches.update(activeBatchForMortality.id, {
      currentChicksCount: newCurrent,
      mortalityCount: newTotalMortality,
      updatedAt: new Date().toISOString(),
    });

    // Also log to detailed mortality
    await db.detailedMortality.add({
      id: `dm-brood-${Date.now()}`,
      date: todayStr,
      time: new Date().toTimeString().slice(0, 5),
      description: `نفوق كتاكيت تحضين دفعة (${activeBatchForMortality.batchNumber}) - ${mortalityNotesInput || 'نفوق اعتيادي'}`,
      gender: 'mixed',
      locationType: 'room',
      roomName: activeBatchForMortality.locationName,
      exactLocationText: activeBatchForMortality.locationName,
      quantity: qty,
      disposalMethod: 'burial',
      recordedBy: userName || 'عامل التحضين',
      createdAt: new Date().toISOString(),
    });

    toast(`تم تسجيل نفوق ${qty} كتكوت. المتبقي الحي: ${newCurrent} كتكوت`, 'warning');
    setActiveBatchForMortality(null);
  };

  // 5. Open and Save Add Brooding Batch
  const handleOpenAddBroodModal = () => {
    const nextNum = `BRD-2026-00${(broodingBatches?.length || 0) + 1}`;
    setBroodBatchNumber(nextNum);
    setBroodSource('تفريخ داخلي (الفقاسات)');
    setBroodHatchDate(todayStr);
    setBroodChicksCount(500);
    setBroodLocation('حضانة تدفئة رقم 1 (غرفة 5)');
    setBroodFeedType('starter_24_27');
    setBroodNotes('');
    setShowAddBroodModal(true);
  };

  const handleSaveNewBroodBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broodBatchNumber.trim() || broodChicksCount <= 0) return;

    const newBatch: BroodingBatch = {
      id: `brd-${Date.now()}`,
      batchNumber: broodBatchNumber.trim(),
      source: broodSource.trim(),
      hatchDate: broodHatchDate,
      initialChicksCount: Number(broodChicksCount),
      currentChicksCount: Number(broodChicksCount),
      mortalityCount: 0,
      sexType: 'unsexed',
      locationName: broodLocation.trim(),
      selectedFeedType: broodFeedType,
      totalFeedConsumedKg: 0,
      status: 'active',
      notes: broodNotes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.broodingBatches.add(newBatch);
    toast(`تم إنشاء دفعة التحضين (${newBatch.batchNumber}) بعدد ${newBatch.initialChicksCount} كتكوت بنجاح!`, 'success');
    setShowAddBroodModal(false);
  };

  // 6. Save Schedule Settings (Customize grams per chick per day)
  const handleOpenScheduleSettings = () => {
    setEditRates([...activeRates]);
    setShowScheduleSettingsModal(true);
  };

  const handleSaveScheduleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.settings.put({
      key: 'broodingFeedSchedule',
      value: { rates: editRates },
    });
    toast('تم حفظ جدول استهلاك الأعلاف المعياري لجميع أسابيع التحضين بنجاح!', 'success');
    setShowScheduleSettingsModal(false);
  };

  const handleResetScheduleDefaults = () => {
    setEditRates(DEFAULT_BROODING_RATES);
  };

  // --- Handlers for Incubation Operations ---

  const handleOpenAddIncModal = () => {
    setIncBatchNumber(`INC-2026-00${(incubationBatches?.length || 0) + 1}`);
    setIncubatorName('فقاسة الصقر الذكية 1000');
    setIncEggCount(500);
    setIncStartDate(todayStr);
    setIncNotes('');
    setShowAddIncBatchModal(true);
  };

  const handleSaveNewIncBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incBatchNumber.trim() || incEggCount <= 0) return;

    const start = new Date(incStartDate);
    const candling = new Date(start);
    candling.setDate(candling.getDate() + 8);

    const transfer = new Date(start);
    transfer.setDate(transfer.getDate() + 14);

    const hatch = new Date(start);
    hatch.setDate(hatch.getDate() + 17);

    const newBatch: IncubationBatch = {
      id: `inc-${Date.now()}`,
      batchNumber: incBatchNumber.trim(),
      incubatorName: incubatorName.trim(),
      eggCount: Number(incEggCount),
      startDate: incStartDate,
      candlingDate: candling.toISOString().split('T')[0],
      transferDate: transfer.toISOString().split('T')[0],
      hatchDate: hatch.toISOString().split('T')[0],
      candlingDone: false,
      fertileEggs: 0,
      infertileEggs: 0,
      hatchedDone: false,
      hatchedChicks: 0,
      weakChicks: 0,
      deadInShell: 0,
      status: 'incubating',
      notes: incNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    await db.incubationBatches.add(newBatch);
    toast(`تم إنشاء الدفعة (${newBatch.batchNumber}) وتوليد الجدول الزمني للـ 17 يوماً بنجاح!`, 'success');
    setShowAddIncBatchModal(false);
  };

  const handleSaveCandling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchForCandling) return;

    const fertile = Number(fertileEggsInput);
    const infertile = Number(infertileEggsInput);

    if (fertile + infertile > activeBatchForCandling.eggCount) {
      toast('مجموع البيض المخصب وغير المخصب أكبر من إجمالي بيض الدفعة!', 'error');
      return;
    }

    await db.incubationBatches.update(activeBatchForCandling.id, {
      candlingDone: true,
      fertileEggs: fertile,
      infertileEggs: infertile,
      status: 'candled',
    });

    const fertilityRate = Math.round((fertile / activeBatchForCandling.eggCount) * 100);
    toast(`تم تسجيل الفحص الضوئي بنجاح! نسبة الخصوبة: ${fertilityRate}%`, 'success');
    setActiveBatchForCandling(null);
  };

  const handleTransferToBaskets = async (batch: IncubationBatch) => {
    if (confirm(`هل تم إيقاف التقليب ونقل بيض الدفعة (${batch.batchNumber}) إلى سلات الفقاس (اليوم 14)؟`)) {
      await db.incubationBatches.update(batch.id, {
        status: 'transferred',
      });
      toast(`تم تأكيد النقل لسلات الفقاس وخفض الحرارة ورفع الرطوبة للدفعة ${batch.batchNumber}`, 'success');
    }
  };

  const handleSaveHatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchForHatch) return;

    const healthy = Number(hatchedChicksInput);
    const weak = Number(weakChicksInput);
    const dead = Number(deadInShellInput);

    await db.incubationBatches.update(activeBatchForHatch.id, {
      hatchedDone: true,
      hatchedChicks: healthy,
      weakChicks: weak,
      deadInShell: dead,
      status: 'hatched',
    });

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });

    const hatchRate =
      activeBatchForHatch.fertileEggs > 0
        ? Math.round((healthy / activeBatchForHatch.fertileEggs) * 100)
        : Math.round((healthy / activeBatchForHatch.eggCount) * 100);

    // If auto-transfer to brooder is checked, create a Phase 1 Brooding Batch
    if (autoTransferToBrooder && healthy > 0) {
      const nextBroodNum = `BRD-${activeBatchForHatch.batchNumber.replace('INC-', '')}`;
      await db.broodingBatches.add({
        id: `brd-${Date.now()}`,
        batchNumber: nextBroodNum,
        incubationBatchId: activeBatchForHatch.id,
        source: `تفريخ داخلي (${activeBatchForHatch.incubatorName})`,
        hatchDate: todayStr,
        initialChicksCount: healthy,
        currentChicksCount: healthy,
        mortalityCount: 0,
        sexType: 'unsexed',
        locationName: 'حضانة تدفئة رقم 1',
        selectedFeedType: 'starter_24_27',
        totalFeedConsumedKg: 0,
        status: 'active',
        notes: `نقل مباشر من فقاسة (${activeBatchForHatch.batchNumber}) بنسبة فقس ${hatchRate}%`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast(
        `🎉 تم تسجيل اكتمال الفقس (${healthy} صوص سليم) وتحويل الكتاكيت تلقائياً إلى دفعة تحضين (${nextBroodNum} - المرحلة 1 تدفئة)!`,
        'success'
      );
    } else {
      toast(
        `مبروك! تم اكتمال الفقس بنجاح وخروج ${healthy} صوص سليم (نسبة الفقس: ${hatchRate}%)!`,
        'success'
      );
    }

    setActiveBatchForHatch(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <EggFried className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              إدارة الفقاسات والتحضين المرحلي (Hatchery & Phased Brooding)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            نظام متكامل لتفريخ البيض (17 يوماً) وتحضين الكتاكيت المرحلي (1-21 يوم تدفئة | 22-38 يوم فطام وبطاريات) مع حساب استهلاك الأعلاف التصاعدي بدقة.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleOpenScheduleSettings}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            title="تعديل جدول استهلاك الجرامات الافتراضي لكل أسبوع"
          >
            <Settings className="w-4 h-4 text-purple-600" />
            <span>معايير الاستهلاك (⚙️)</span>
          </button>
          <button
            onClick={handleOpenAddBroodModal}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
            title="إدخال دفعة كتاكيت جديدة في حضانات التدفئة"
          >
            <Flame className="w-4 h-4" />
            <span>+ دفعة تحضين كتاكيت</span>
          </button>
          <button
            onClick={handleOpenAddIncModal}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
            title="إدخال دفعة بيض جديدة في الفقاسات"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ دفعة بيض للفقاسة</span>
          </button>
        </div>
      </div>

      {/* Top Overview KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Total Chicks */}
        <div className="p-4 rounded-3xl glass-card border border-slate-200/80 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">إجمالي صيصان التحضين</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Baby className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {totalChicks.toLocaleString('ar-SA')}
            </div>
            <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full inline-block mt-1">
              مختلط الجنسين (Unsexed)
            </span>
          </div>
        </div>

        {/* Card 2: Phase 1 Chicks */}
        <div className="p-4 rounded-3xl glass-card border border-amber-200 bg-amber-50/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900">المرحلة 1: حضانات تدفئة</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-950 font-mono">
              {phase1Chicks.toLocaleString('ar-SA')}
            </div>
            <span className="text-[10px] text-amber-800 font-bold mt-1 block">
              عمر 1-21 يوم ({phase1Batches.length} دفعات)
            </span>
          </div>
        </div>

        {/* Card 3: Phase 2 Chicks */}
        <div className="p-4 rounded-3xl glass-card border border-sky-200 bg-sky-50/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-900">المرحلة 2: بطاريات أوسع</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center">
              <Wind className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-sky-950 font-mono">
              {phase2Chicks.toLocaleString('ar-SA')}
            </div>
            <span className="text-[10px] text-sky-800 font-bold mt-1 block">
              عمر 22-38 يوم ({phase2Batches.length} دفعات)
            </span>
          </div>
        </div>

        {/* Card 4: Daily Feed Demand */}
        <div className="p-4 rounded-3xl glass-card border border-emerald-200 bg-emerald-50/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-900">استهلاك العلف اليومي</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-950 font-mono">
              {Math.round(totalDailyBroodKg * 100) / 100} <span className="text-xs">كغم</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
              تكلفة تقديرية: {totalDailyBroodCost.toLocaleString('ar-SA')} {farmSettings.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('brooding')}
          className={`pb-3 px-4 font-black text-xs sm:text-sm flex items-center gap-2 transition-all relative ${
            activeTab === 'brooding'
              ? 'text-amber-600 border-b-2 border-amber-500'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-500" />
          <span>دفعات التحضين المرحلي واستهلاك الأعلاف</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono font-bold">
            {activeBroodingList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('incubation')}
          className={`pb-3 px-4 font-black text-xs sm:text-sm flex items-center gap-2 transition-all relative ${
            activeTab === 'incubation'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <EggFried className="w-4 h-4 text-purple-600" />
          <span>سجل ودورات الفقاسات (17 يوماً)</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-mono font-bold">
            {incubationBatches?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('schedule_settings')}
          className={`pb-3 px-4 font-black text-xs sm:text-sm flex items-center gap-2 transition-all relative ${
            activeTab === 'schedule_settings'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4 text-indigo-600" />
          <span>جدول الاستهلاك المعياري ودليل التغذية</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PHASED BROODING & FEED CONSUMPTION SYSTEM */}
      {/* ========================================================= */}
      {activeTab === 'brooding' && (
        <div className="space-y-5">
          {/* Bulk Action Header Banner */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-slate-50 border border-amber-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500 text-white shrink-0 shadow-sm">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900">
                  الأتمتة اليومية لتغذية دفعات التحضين (استهلاك تصاعدي حسب العمر)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  يُحسب استهلاك كل دفعة تلقائياً: (عدد الكتاكيت الحية × معدل جرامات اليوم) ويُخصم من رصيد العلف المختار في المستودع.
                </p>
              </div>
            </div>

            <button
              onClick={handleBulkDeductAllBrooding}
              disabled={activeBroodingList.length === 0}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs flex items-center gap-2 shadow-apple transition-all whitespace-nowrap shrink-0"
              title="خصم استهلاك اليوم لجميع دفعات التحضين التي لم يتم خصمها اليوم بعد"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>⚡ خصم استهلاك اليوم لجميع الدفعات ({Math.round(totalDailyBroodKg * 100) / 100} كغم)</span>
            </button>
          </div>

          {/* Brooding Batch Cards */}
          {activeBroodingList && activeBroodingList.length > 0 ? (
            <div className="space-y-4">
              {activeBroodingList.map((batch) => {
                const info = getBroodingInfo(batch);

                return (
                  <div
                    key={batch.id}
                    className="p-6 rounded-3xl glass-panel border border-slate-200/80 bg-white space-y-4 shadow-sm hover:border-amber-300 transition-all"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${
                            info.isPhase1
                              ? 'bg-amber-100 text-amber-800'
                              : info.isPhase2
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {info.isPhase1 ? <Flame className="w-6 h-6" /> : info.isPhase2 ? <Wind className="w-6 h-6" /> : <GraduationCap className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-black text-base text-slate-900">
                              {batch.batchNumber} • {batch.locationName}
                            </h3>

                            {/* Phase Badge */}
                            <span
                              className={`text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                                info.isPhase1
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : info.isPhase2
                                  ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              {info.isPhase1 ? (
                                <>
                                  <Flame className="w-3 h-3 text-amber-600" />
                                  <span>المرحلة الأولى: حضانات تدفئة (عمر {info.ageDays} يوم)</span>
                                </>
                              ) : info.isPhase2 ? (
                                <>
                                  <Wind className="w-3 h-3 text-sky-600" />
                                  <span>المرحلة الثانية: بطاريات تحضين أوسع (عمر {info.ageDays} يوم)</span>
                                </>
                              ) : (
                                <>
                                  <GraduationCap className="w-3 h-3 text-emerald-600" />
                                  <span>مكتملة التحضين (عمر {info.ageDays} يوم - جاهزة للفرز)</span>
                                </>
                              )}
                            </span>

                            {/* Unsexed Badge */}
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                              مختلط الجنسين (Unsexed)
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
                            <span>تاريخ الفقس: <b className="font-mono text-slate-700">{batch.hatchDate}</b></span>
                            <span>• المصدر: <b>{batch.source}</b></span>
                            {info.isPhase1 && (
                              <span className="text-amber-800 font-bold">
                                • التدفئة المطلوبة: {activeRates.find((r) => r.weekNumber === info.currentWeek)?.recommendedTempC || '35°C - 28°C'}
                              </span>
                            )}
                            {info.isPhase2 && (
                              <span className="text-sky-800 font-bold">• بدون تدفئة (فطام حراري وتجهيز للفرز)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Badge: Daily Consumption Rate */}
                      <div className="flex items-center gap-2">
                        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-right">
                          <span className="text-[10px] text-slate-500 font-bold block">
                            معدل اليوم (الأسبوع {info.currentWeek}):
                          </span>
                          <span className="text-base font-black font-mono text-amber-800">
                            {info.gramsToday} جم / كتكوت
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar (38 Days Cycle) */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>تقدم دورة التحضين: اليوم {info.ageDays} من 38 يوماً</span>
                        </span>
                        <span className="font-mono text-slate-800">{info.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200 relative">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-sky-500 rounded-full transition-all duration-500"
                          style={{ width: `${info.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                        <span>يوم 1 (تدفئة 35°C)</span>
                        <span className="text-amber-700 font-bold">اليوم 21 (نهاية التدفئة)</span>
                        <span className="text-sky-700 font-bold">اليوم 22 (بطاريات تحضين وفطام)</span>
                        <span className="text-emerald-700 font-bold">اليوم 38 (جاهزية الفرز والتجنيس)</span>
                      </div>
                    </div>

                    {/* Batch Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100 text-xs">
                      {/* Current Chicks */}
                      <div>
                        <span className="text-slate-500 block text-[11px]">الكتاكيت الحية:</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black text-slate-900 font-mono">
                            {batch.currentChicksCount.toLocaleString('ar-SA')}
                          </span>
                          <span className="text-[10px] text-slate-400">كتكوت</span>
                        </div>
                        <span className="text-[10px] text-slate-400">بدأت بـ {batch.initialChicksCount}</span>
                      </div>

                      {/* Cumulative Mortality */}
                      <div>
                        <span className="text-slate-500 block text-[11px]">النفوق التراكمي:</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black text-rose-700 font-mono">
                            {batch.mortalityCount}
                          </span>
                          <span className="text-[10px] text-rose-500">
                            ({Math.round((batch.mortalityCount / batch.initialChicksCount) * 100)}%)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBatchForMortality(batch);
                            setMortalityQtyInput(1);
                            setMortalityNotesInput('');
                          }}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-800 underline mt-0.5"
                        >
                          + تسجيل نفوق
                        </button>
                      </div>

                      {/* Selected Feed Type Selector */}
                      <div>
                        <span className="text-slate-500 block text-[11px] mb-1">نوع العلف المخصص:</span>
                        <select
                          value={batch.selectedFeedType}
                          onChange={(e) => handleSwitchFeedType(batch.id, e.target.value as FeedType)}
                          className={`w-full py-1 px-2 rounded-xl text-xs font-bold border transition-all ${
                            batch.selectedFeedType === 'starter_24_27'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-teal-50 text-teal-900 border-teal-300'
                          }`}
                        >
                          <option value="starter_24_27">بادي 24-27% (كتاكيت)</option>
                          <option value="grower_fattening">نامي 20-22% (تسمين/فطام)</option>
                        </select>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          رصيد المستودع: {info.feedObj?.bagsCount || 0} كيس
                        </span>
                      </div>

                      {/* Today's Consumption Demand & Cost */}
                      <div>
                        <span className="text-slate-500 block text-[11px]">استهلاك اليوم المقدر:</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-black text-amber-800 font-mono">
                            {info.dailyKg}
                          </span>
                          <span className="text-[10px] text-slate-500">كغم</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold block">
                          التكلفة: {info.dailyCost.toLocaleString('ar-SA')} {farmSettings.currency}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400 text-[11px]">
                          إجمالي استهلاك العلف التراكمي: <b className="font-mono text-slate-700">{Math.round((batch.totalFeedConsumedKg || 0) * 10) / 10} كغم</b>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Daily Deduction Button */}
                        {info.isDeductedToday ? (
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تم خصم استهلاك اليوم ({info.dailyKg} كغم)</span>
                            </span>
                            <button
                              onClick={() => handleDeductBatchFeed(batch)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
                              title="تسجيل استهلاك إضافي إذا لزم"
                            >
                              إضافة خصم آخر
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDeductBatchFeed(batch)}
                            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all"
                            title="خصم كمية العلف اليومية تلقائياً من المستودع وقيد التكلفة التشغيلية"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>⚡ تسجيل وخصم استهلاك اليوم ({info.dailyKg} كغم)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl glass-panel text-slate-400 bg-white border border-slate-200 space-y-3">
              <Baby className="w-12 h-12 mx-auto text-amber-500/50" />
              <p className="text-sm font-bold text-slate-700">لا توجد دفعات تحضين نشطة حالياً</p>
              <p className="text-xs text-slate-500">
                انقر على زر "+ دفعة تحضين كتاكيت" لبدء رعاية دفعة جديدة، أو قُم بتفريخ بيض من قسم الفقاسات.
              </p>
              <button
                onClick={handleOpenAddBroodModal}
                className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إدخال دفعة تحضين الآن</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: INCUBATION CYCLES (17 DAYS) */}
      {/* ========================================================= */}
      {activeTab === 'incubation' && (
        <div className="space-y-6">
          {incubationBatches && incubationBatches.length > 0 ? (
            incubationBatches.map((batch) => {
              const {
                currentDay,
                progressPercent,
                isCandlingDue,
                isTransferDue,
                isHatchDue,
                fertilityRate,
                hatchabilityRate,
              } = calculateBatchProgress(batch);

              return (
                <div
                  key={batch.id}
                  className="p-6 rounded-3xl glass-panel border border-slate-200/80 bg-white space-y-5 shadow-sm"
                >
                  {/* Top Row: Batch Info & Status */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-base shrink-0">
                        {batch.batchNumber.split('-').pop() || 'D'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-900">
                            {batch.batchNumber} - {batch.incubatorName}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              batch.status === 'hatched'
                                ? 'bg-emerald-100 text-emerald-800'
                                : batch.status === 'transferred'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {batch.status === 'hatched'
                              ? 'اكتمل الفقس'
                              : batch.status === 'transferred'
                              ? 'في سلات الفقاس (أيام التفقيس)'
                              : 'قيد التقليب والتحضين'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          تاريخ الإدخال: <b className="font-mono text-slate-700">{batch.startDate}</b> • عدد البيض المدخل:{' '}
                          <b className="font-mono text-slate-900 text-sm">{batch.eggCount} بيضة</b>
                        </div>
                      </div>
                    </div>

                    {/* Rates Badges */}
                    <div className="flex items-center gap-3">
                      {fertilityRate !== null && (
                        <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-right">
                          <div className="text-[10px] text-emerald-700 font-bold">نسبة الخصوبة</div>
                          <div className="text-base font-black text-emerald-800 font-mono">
                            {fertilityRate}%
                          </div>
                        </div>
                      )}

                      {hatchabilityRate !== null && (
                        <div className="px-3.5 py-2 rounded-2xl bg-teal-50 border border-teal-200 text-right">
                          <div className="text-[10px] text-teal-700 font-bold">نسبة الفقس الفعلية</div>
                          <div className="text-base font-black text-teal-800 font-mono">
                            {hatchabilityRate}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 17-Day Visual Timeline Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span>تقدم دورة التفريخ: اليوم {currentDay} من 17</span>
                      </span>
                      <span className="font-mono text-purple-700">{progressPercent}%</span>
                    </div>

                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* 3 Milestones Markers */}
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <div
                        className={`p-2.5 rounded-2xl border text-xs ${
                          batch.candlingDone
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : isCandlingDue
                            ? 'bg-amber-50 border-amber-300 text-amber-900 animate-pulse font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="text-[10px] font-bold">المرحلة 1: الفحص الضوئي</div>
                        <div className="font-mono font-semibold">اليوم 7-10 ({batch.candlingDate})</div>
                        <div className="text-[10px] mt-0.5">
                          {batch.candlingDone
                            ? `تم الفحص (${batch.fertileEggs} مخصب)`
                            : isCandlingDue
                            ? 'حان موعد الفحص الآن!'
                            : 'قريباً'}
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded-2xl border text-xs ${
                          batch.status === 'transferred' || batch.hatchedDone
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : isTransferDue
                            ? 'bg-blue-50 border-blue-300 text-blue-900 animate-pulse font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="text-[10px] font-bold">المرحلة 2: نقل لسلات الفقاس</div>
                        <div className="font-mono font-semibold">اليوم 14 ({batch.transferDate})</div>
                        <div className="text-[10px] mt-0.5">
                          {batch.status === 'transferred' || batch.hatchedDone
                            ? 'تم النقل وإيقاف التقليب'
                            : isTransferDue
                            ? 'حان موعد النقل الآن!'
                            : 'قريباً'}
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded-2xl border text-xs ${
                          batch.hatchedDone
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : isHatchDue
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 animate-pulse font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="text-[10px] font-bold">المرحلة 3: يوم الفقس</div>
                        <div className="font-mono font-semibold">اليوم 17 ({batch.hatchDate})</div>
                        <div className="text-[10px] mt-0.5">
                          {batch.hatchedDone
                            ? `اكتمل (${batch.hatchedChicks} صوص سليم)`
                            : isHatchDue
                            ? 'يوم الفقس! سجل النتائج'
                            : 'قريباً'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this Batch */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      {batch.notes ? `ملاحظات: ${batch.notes}` : ''}
                    </div>

                    <div className="flex items-center gap-2">
                      {!batch.candlingDone && (
                        <button
                          onClick={() => {
                            setActiveBatchForCandling(batch);
                            setFertileEggsInput(Math.round(batch.eggCount * 0.85));
                            setInfertileEggsInput(Math.round(batch.eggCount * 0.15));
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold flex items-center gap-1.5 transition-colors border border-purple-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>تسجيل الفحص الضوئي</span>
                        </button>
                      )}

                      {batch.status !== 'transferred' && batch.status !== 'hatched' && (
                        <button
                          onClick={() => handleTransferToBaskets(batch)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold flex items-center gap-1.5 transition-colors border border-blue-200"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>تأكيد النقل للسلات (اليوم 14)</span>
                        </button>
                      )}

                      {!batch.hatchedDone && (
                        <button
                          onClick={() => {
                            setActiveBatchForHatch(batch);
                            const basis = batch.candlingDone ? batch.fertileEggs : batch.eggCount;
                            setHatchedChicksInput(Math.round(basis * 0.88));
                            setWeakChicksInput(10);
                            setDeadInShellInput(Math.round(basis * 0.1));
                            setAutoTransferToBrooder(true);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>تسجيل اكتمال الفقس (اليوم 17)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center rounded-3xl glass-panel text-slate-400 bg-white border border-slate-200">
              <EggFried className="w-12 h-12 mx-auto mb-3 opacity-40 text-purple-600" />
              <p className="text-sm font-bold">لا توجد دفعات بيض في الفقاسات حالياً</p>
              <p className="text-xs mt-1">انقر على "إدخال دفعة بيض جديدة" لبدء دورة التفريخ</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: FEED SCHEDULE STANDARDS & GUIDE */}
      {/* ========================================================= */}
      {activeTab === 'schedule_settings' && (
        <div className="space-y-5">
          <div className="p-5 rounded-3xl glass-panel border border-slate-200/80 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-sm text-slate-800">
                  دليل وجدول التغذية المعياري لصيصان السمان (معايير الجرامات لكل يوم/أسبوع)
                </h3>
              </div>
              <button
                onClick={handleOpenScheduleSettings}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>تعديل معايير الجرامات (⚙️)</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              ينمو صوص السمان بوتيرة متسارعة؛ لذا يرتفع معدل استهلاكه اليومي من العلف تدريجياً من 5-8 جرامات في الأسبوع الأول ليصل إلى 25 جراماً بنهاية فترة التحضين والفطام قبل الفرز.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-extrabold uppercase">
                  <tr>
                    <th className="p-3.5">الأسبوع والعمر</th>
                    <th className="p-3.5">مرحلة التحضين</th>
                    <th className="p-3.5">بيئة التدفئة والحرارة</th>
                    <th className="p-3.5">نوع العلف الموصى به</th>
                    <th className="p-3.5 text-center">معدل الاستهلاك المعياري</th>
                    <th className="p-3.5 text-center">استهلاك 100 كتكوت/يوم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRates.map((rate) => {
                    const isP1 = rate.phase === 'phase1_heated';
                    return (
                      <tr key={rate.weekNumber} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{rate.label}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isP1 ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'
                            }`}
                          >
                            {rate.phaseLabel}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-700">{rate.recommendedTempC}</td>
                        <td className="p-3.5 text-slate-700">{rate.recommendedFeed}</td>
                        <td className="p-3.5 text-center font-mono font-black text-amber-900 text-sm">
                          {rate.defaultGramsPerChickDay} جم / طير / يوم
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-emerald-800">
                          {Math.round(((rate.defaultGramsPerChickDay * 100) / 1000) * 100) / 100} كغم / يوم
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                <strong>توجيه تربية:</strong> القطيع في كلتا المرحلتين يُعتبر <strong>"مختلط الجنسين (Unsexed)"</strong> لتعذر التجنيس المبكر. عند بلوغ عمر 38 يوماً، يتم الفرز النهائي حيث تُنقل الإناث لإنتاج البيض ويُنقل الذكور والفائض للتسمين والذبح.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* Modal: Add New Brooding Batch */}
      {showAddBroodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-white">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">إدخال دفعة كتاكيت تحضين جديدة</h3>
                  <p className="text-[11px] text-slate-500">كتاكيت حديثة الفقس في حضانات التدفئة</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBroodModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewBroodBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم أو كود الدفعة: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={broodBatchNumber}
                  onChange={(e) => setBroodBatchNumber(e.target.value)}
                  className="w-full glass-input font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عدد الكتاكيت: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={broodChicksCount}
                    onChange={(e) => setBroodChicksCount(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الفقس وبدء التحضين: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={broodHatchDate}
                    onChange={(e) => setBroodHatchDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الموقع / الحضانة:
                  </label>
                  <input
                    type="text"
                    required
                    value={broodLocation}
                    onChange={(e) => setBroodLocation(e.target.value)}
                    placeholder="حضانة تدفئة 1"
                    className="w-full glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع العلف المخصص:
                  </label>
                  <select
                    value={broodFeedType}
                    onChange={(e) => setBroodFeedType(e.target.value as FeedType)}
                    className="w-full glass-input text-xs font-bold"
                  >
                    <option value="starter_24_27">علف بادي 24-27% (موصى به)</option>
                    <option value="grower_fattening">علف نامي 20-22%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">مصدر الكتاكيت:</label>
                <input
                  type="text"
                  value={broodSource}
                  onChange={(e) => setBroodSource(e.target.value)}
                  placeholder="تفريخ داخلي أو مورد خارجي"
                  className="w-full glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  value={broodNotes}
                  onChange={(e) => setBroodNotes(e.target.value)}
                  placeholder="حرارة الحضانة، برنامج الفيتامينات الافتتاحي..."
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-apple transition-all"
                >
                  حفظ وتسكين الدفعة
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBroodModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Custom Feed Schedule Settings */}
      {showScheduleSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    تعديل معايير جدول استهلاك الأعلاف
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تخصيص معدل الجرامات لكل كتكوت حسب الأسبوع
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleSettingsModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveScheduleSettings} className="space-y-4">
              <div className="space-y-3">
                {editRates.map((r, idx) => (
                  <div
                    key={r.weekNumber}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{r.label}</div>
                      <div className="text-[10px] text-slate-500">
                        {r.phaseLabel} • {r.recommendedTempC}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        step="0.5"
                        required
                        value={r.defaultGramsPerChickDay}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditRates((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, defaultGramsPerChickDay: val } : item
                            )
                          );
                        }}
                        className="w-20 glass-input text-center font-mono font-black text-sm text-amber-900 py-1"
                      />
                      <span className="text-[11px] font-bold text-slate-500">جم / يوم</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetScheduleDefaults}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>استعادة المعايير الافتراضية</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ التعديلات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowScheduleSettingsModal(false)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Mortality for Brooding Batch */}
      {activeBatchForMortality && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <Skull className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">تسجيل نفوق صيصان</h3>
                  <p className="text-[11px] text-slate-500">
                    الدفعة: {activeBatchForMortality.batchNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveBatchForMortality(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMortality} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عدد الصيصان النافقة: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={activeBatchForMortality.currentChicksCount}
                  required
                  value={mortalityQtyInput}
                  onChange={(e) => setMortalityQtyInput(Number(e.target.value))}
                  className="w-full glass-input text-center text-xl font-mono font-black text-rose-700"
                  autoFocus
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  العدد الحي الحالي بالدفعة: {activeBatchForMortality.currentChicksCount} كتكوت
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب النفوق وملاحظات:</label>
                <input
                  type="text"
                  value={mortalityNotesInput}
                  onChange={(e) => setMortalityNotesInput(e.target.value)}
                  placeholder="مثال: ضعف مناعة، اختناق تدفئة، دهس..."
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-sm transition-all"
                >
                  تأكيد وخصم من العدد الحي
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBatchForMortality(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Incubation Batch */}
      {showAddIncBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-purple-600">
                <EggFried className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">إدخال دفعة بيض جديدة في الفقاسة</h3>
              </div>
              <button
                onClick={() => setShowAddIncBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewIncBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم أو كود الدفعة</label>
                <input
                  type="text"
                  required
                  value={incBatchNumber}
                  onChange={(e) => setIncBatchNumber(e.target.value)}
                  className="w-full glass-input font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم أو رقم الفقاسة</label>
                <input
                  type="text"
                  required
                  value={incubatorName}
                  onChange={(e) => setIncubatorName(e.target.value)}
                  placeholder="مثال: فقاسة الصقر 1"
                  className="w-full glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عدد البيض المدخل</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={incEggCount}
                    onChange={(e) => setIncEggCount(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الإدخال</label>
                  <input
                    type="date"
                    required
                    value={incStartDate}
                    onChange={(e) => setIncStartDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 text-xs text-purple-900 space-y-1">
                <div className="font-bold">سيقوم النظام بجدولة تلقائية كالتالي:</div>
                <div>• الفحص الضوئي: اليوم 8</div>
                <div>• النقل لسلات الفقاس: اليوم 14</div>
                <div>• الفقس وخروج الصوص: اليوم 17</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات الدفعة (مصدر البيض)</label>
                <textarea
                  rows={2}
                  value={incNotes}
                  onChange={(e) => setIncNotes(e.target.value)}
                  placeholder="بيض أمهات بطارية أ وب، أو مورد خارجي..."
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  حفظ وبدء دورة التفريخ
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddIncBatchModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Candling Record */}
      {activeBatchForCandling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-purple-600">
                <Eye className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">تسجيل الفحص الضوئي (Candling Check)</h3>
              </div>
              <button
                onClick={() => setActiveBatchForCandling(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              الدفعة: {activeBatchForCandling.batchNumber} (إجمالي البيض المدخل: {activeBatchForCandling.eggCount} بيضة)
            </p>

            <form onSubmit={handleSaveCandling} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البيض المخصب (السليم)</label>
                  <input
                    type="number"
                    min="0"
                    max={activeBatchForCandling.eggCount}
                    required
                    value={fertileEggsInput}
                    onChange={(e) => setFertileEggsInput(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">غير مخصب (لايح/فاسد)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={infertileEggsInput}
                    onChange={(e) => setInfertileEggsInput(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold text-rose-700"
                  />
                </div>
              </div>

              {fertileEggsInput > 0 && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex justify-between items-center text-emerald-950 font-bold">
                  <span>نسبة الخصوبة المحسوبة:</span>
                  <span className="text-base font-black font-mono text-emerald-800">
                    {Math.round((fertileEggsInput / activeBatchForCandling.eggCount) * 100)}%
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  حفظ نتيجة الفحص
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBatchForCandling(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Hatch Complete (Day 17) */}
      {activeBatchForHatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">تسجيل نتائج الفقس وخروج الصوص (اليوم 17)</h3>
              </div>
              <button
                onClick={() => setActiveBatchForHatch(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              الدفعة: {activeBatchForHatch.batchNumber} (البيض المخصب:{' '}
              {activeBatchForHatch.fertileEggs || activeBatchForHatch.eggCount})
            </p>

            <form onSubmit={handleSaveHatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الصوص الفاقس السليم (نخب أول)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={hatchedChicksInput}
                  onChange={(e) => setHatchedChicksInput(Number(e.target.value))}
                  className="w-full glass-input text-center text-xl font-mono font-black text-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">صوص ضعيف / فرز ثانٍ</label>
                  <input
                    type="number"
                    min="0"
                    value={weakChicksInput}
                    onChange={(e) => setWeakChicksInput(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ميت داخل البيضة</label>
                  <input
                    type="number"
                    min="0"
                    value={deadInShellInput}
                    onChange={(e) => setDeadInShellInput(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold"
                  />
                </div>
              </div>

              {hatchedChicksInput > 0 && (
                <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-xs flex justify-between items-center text-teal-950 font-bold">
                  <span>نسبة الفقس الفعلية:</span>
                  <span className="text-base font-black font-mono text-teal-800">
                    {activeBatchForHatch.fertileEggs > 0
                      ? Math.round((hatchedChicksInput / activeBatchForHatch.fertileEggs) * 100)
                      : Math.round((hatchedChicksInput / activeBatchForHatch.eggCount) * 100)}%
                  </span>
                </div>
              )}

              {/* Checkbox: Auto-transfer to Brooder */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-950">
                    تحويل الصوص مباشرة إلى دفعة تحضين (المرحلة 1: تدفئة)
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoTransferToBrooder}
                  onChange={(e) => setAutoTransferToBrooder(e.target.checked)}
                  className="w-4 h-4 accent-amber-600 rounded"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  اعتماد اكتمال الفقس
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBatchForHatch(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
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
