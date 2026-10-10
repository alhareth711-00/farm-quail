import React, { useState, useEffect } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { FeedStock, FeedConsumptionRecord, MedicationSchedule, MedicationType, FeedType } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  purchaseFeedStock,
  calculateWeightedAverageCost,
} from '../../services/feedPurchaseService';
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
  ShoppingBag,
  Scale,
  Coins,
  Building2,
  CreditCard,
  Settings,
  Zap,
  Calculator,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

export const HealthFeedView: React.FC = () => {
  const { toast } = useToast();
  const { farmSettings, userName } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];

  const feedStocks = useLiveQuery(() => db.feedStock.toArray(), []);
  const consumptionLogs = useLiveQuery(
    () => db.feedConsumption.reverse().sortBy('date'),
    []
  );
  const medications = useLiveQuery(() => db.medicationSchedules.toArray(), []);
  const batteries = useLiveQuery(() => db.batteries.toArray(), []);
  const tiers = useLiveQuery(() => db.tiers.toArray(), []);
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);
  const purchases = useLiveQuery(() => db.purchases.toArray(), []);

  // Ensure default min alert threshold is 1 bag and opening stock balances exist
  useEffect(() => {
    const migrateThresholds = async () => {
      const stocks = await db.feedStock.toArray();
      const defaultOpenings: Record<string, { bags: number; kg: number }> = {
        starter_24_27: { bags: 42, kg: 2100 },
        grower_fattening: { bags: 35, kg: 1750 },
        layer_production: { bags: 65, kg: 3250 },
      };
      for (const stock of stocks) {
        const updates: Partial<FeedStock> = {};
        if (!stock.minThresholdBags || [10, 8, 15].includes(stock.minThresholdBags)) {
          updates.minThresholdBags = 1;
        }
        if (stock.openingStockKg === undefined) {
          updates.openingStockKg = defaultOpenings[stock.feedType]?.kg ?? stock.totalKg;
          updates.openingStockBags = defaultOpenings[stock.feedType]?.bags ?? stock.bagsCount;
        }
        if (Object.keys(updates).length > 0) {
          await db.feedStock.update(stock.id, updates);
        }
      }
    };
    migrateThresholds();
  }, []);

  // Modals
  const [showAddMedModal, setShowAddMedModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState<FeedStock | null>(null);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [configMinBags, setConfigMinBags] = useState<number>(1);
  const [configBagWeight, setConfigBagWeight] = useState<number>(50);

  // Financial Feed Purchase Modal (شراء وتوريد أعلاف بسند مالي وربط محاسبي ومخزني)
  const [showPurchaseFeedModal, setShowPurchaseFeedModal] = useState(false);
  const [purchaseFeedType, setPurchaseFeedType] = useState<FeedType>('layer_production');
  const [purchaseBagsCount, setPurchaseBagsCount] = useState<number | ''>(20);
  const [purchaseCostPerBag, setPurchaseCostPerBag] = useState<number | ''>(27000);
  const [purchasePaidFrom, setPurchasePaidFrom] = useState<'cash_box' | 'bank_account' | 'credit'>('cash_box');
  const [purchaseSupplier, setPurchaseSupplier] = useState<string>('');
  const [purchaseInvoiceRef, setPurchaseInvoiceRef] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(todayStr);
  const [purchaseNotes, setPurchaseNotes] = useState<string>('');
  const [isPurchaseSubmitting, setIsPurchaseSubmitting] = useState<boolean>(false);

  // Stock Adjustment / Inventory Audit Modal (تعديل وجرد المخزون الدوري فقط)
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

  // Open Feed Purchase Modal
  const handleOpenPurchaseModal = (feed: FeedStock | null) => {
    if (feed) {
      setPurchaseFeedType(feed.feedType);
      setPurchaseCostPerBag(feed.costPerBag || 27000);
    }
    setPurchaseBagsCount(20);
    setPurchasePaidFrom('cash_box');
    setPurchaseSupplier('');
    setPurchaseInvoiceRef('');
    setPurchaseDate(todayStr);
    setPurchaseNotes('');
    setShowPurchaseFeedModal(true);
  };

  // Save Feed Purchase (ربط الشراء بزيادة المخزون وتحديث متوسط التكلفة المرجح WAC والخصم المالي)
  const handleSaveFeedPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const bags = Number(purchaseBagsCount);
    const cost = Number(purchaseCostPerBag);

    // التحقق الصارم من سلامة البيانات ومنع القيم الصفرية أو السالبة
    if (!bags || isNaN(bags) || bags <= 0) {
      toast('يرجى إدخال عدد أكياس صحيح أكبر من الصفر', 'error');
      return;
    }

    if (!cost || isNaN(cost) || cost <= 0) {
      toast('يرجى إدخال سعر شراء صحيح للكيس أكبر من الصفر', 'error');
      return;
    }

    if (purchasePaidFrom === 'credit' && !purchaseSupplier.trim()) {
      toast('يرجى تحديد اسم المورد لتسجيل الدين الآجل في الخصوم', 'warning');
      return;
    }

    setIsPurchaseSubmitting(true);
    try {
      const result = await purchaseFeedStock({
        feedType: purchaseFeedType,
        bagsCount: bags,
        costPerBag: cost,
        paidFrom: purchasePaidFrom,
        supplier: purchaseSupplier.trim() || undefined,
        invoiceRef: purchaseInvoiceRef.trim() || undefined,
        date: purchaseDate,
        notes: purchaseNotes.trim() || undefined,
        recordedBy: userName || 'مشرف الأعلاف والمخازن',
      });

      toast(
        `تم تسجيل شراء وتوريد ${bags} كيس (${result.feedStock.name}) بنجاح! الرصيد الجديد: ${result.newBags} كيس، متوسط التكلفة المرجح: ${result.newWAC.toLocaleString('ar-SA')} ${farmSettings.currency}`,
        'success'
      );

      setShowPurchaseFeedModal(false);
    } catch (err: any) {
      console.error('Feed purchase error:', err);
      toast(err?.message || 'تعذر تسجيل عملية شراء العلف', 'error');
    } finally {
      setIsPurchaseSubmitting(false);
    }
  };

  // Save Feed Stock Manual Adjustment (Inventory / الجرد)
  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustStockModal) return;

    const bags = Math.max(0, Number(adjustedBags));
    const totalKg = Math.max(0, Number(adjustedKg));

    const diffKg = Math.round((showAdjustStockModal.totalKg - totalKg) * 100) / 100;
    if (diffKg !== 0) {
      const isDeficit = diffKg > 0;
      const bagWeight = showAdjustStockModal.bagWeightKg || 50;
      const unitCost = (showAdjustStockModal.costPerBag || 0) / bagWeight;
      const diffBags = Math.round((Math.abs(diffKg) / bagWeight) * 100) / 100;
      const costAmount = Math.round(Math.abs(diffKg) * unitCost);

      await db.feedConsumption.add({
        id: `fc-audit-${Date.now()}`,
        date: todayStr,
        targetType: 'all',
        targetId: isDeficit ? 'audit-deficit' : 'audit-surplus',
        targetName: isDeficit
          ? `تسوية جردية (عجز مخزني: -${diffKg} كغم)`
          : `تسوية جردية (فائض مخزني: +${Math.abs(diffKg)} كغم)`,
        feedType: showAdjustStockModal.feedType,
        bagsUsed: isDeficit ? diffBags : -diffBags,
        kgUsed: diffKg,
        costAmount: isDeficit ? costAmount : -costAmount,
        notes: `تسوية الجرد الدوري الفعلي لمستودع الأعلاف لـ (${showAdjustStockModal.name}): تم تعديل الرصيد من ${showAdjustStockModal.totalKg} كغم إلى ${totalKg} كغم (${diffKg > 0 ? `عجز: ${diffKg}` : `فائض: ${Math.abs(diffKg)}`} كغم)`,
        recordedBy: userName || 'مشرف الجرد والمستودع',
        createdAt: new Date().toISOString(),
      });
    }

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

  // Save feed threshold and bag weight configuration
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConfigModal) return;

    const minBags = Math.max(1, Math.floor(Number(configMinBags)) || 1);
    const bagWeight = Math.max(1, Number(configBagWeight) || 50);
    const newBagsCount = Math.floor(showConfigModal.totalKg / bagWeight);

    await db.feedStock.update(showConfigModal.id, {
      minThresholdBags: minBags,
      bagWeightKg: bagWeight,
      bagsCount: newBagsCount,
    });

    toast(`تم حفظ إعدادات الحد الأدنى ووزن الكيس لـ (${showConfigModal.name}) بنجاح!`, 'success');
    setShowConfigModal(null);
  };

  // Flock Layer Females Calculation (Battery tiers + Floor layer rooms)
  const batteryFemales = tiers?.reduce((sum, t) => sum + (Number(t.femalesCount) || 0), 0) || 0;
  const roomLayerFemales =
    rooms
      ?.filter(
        (r) =>
          r.purpose === 'layers' ||
          r.name?.includes('بياض') ||
          r.name?.includes('أمهات')
      )
      ?.reduce((sum, r) => sum + (Number(r.femalesCount) || 0), 0) || 0;
  const totalLayerFemales = batteryFemales + roomLayerFemales;

  // Standard benchmark: 30g/day per laying female
  const dailyLayerGrams = totalLayerFemales * 30;
  const dailyLayerKg = Math.round((dailyLayerGrams / 1000) * 100) / 100;
  const layerFeed = feedStocks?.find((f) => f.feedType === 'layer_production');
  const layerBagWeight = layerFeed?.bagWeightKg || 50;
  const dailyLayerBags = Math.round((dailyLayerKg / layerBagWeight) * 100) / 100;
  const layerCostPerBag = layerFeed?.costPerBag || 27000;
  const dailyLayerCost = Math.round(dailyLayerKg * (layerCostPerBag / layerBagWeight));

  const todayLayerLogs = consumptionLogs?.filter(
    (l) => l.date === todayStr && (l.feedType === 'layer_production' || l.targetId === 'all-layers')
  );
  const isLayerConsumptionRecordedToday = !!(todayLayerLogs && todayLayerLogs.length > 0);
  const todayRecordedKg = todayLayerLogs?.reduce((sum, l) => sum + (Number(l.kgUsed) || 0), 0) || 0;

  // Record automated daily feed consumption for layer flock
  const handleRecordDailyLayerConsumption = async () => {
    if (totalLayerFemales <= 0) {
      toast('لا توجد إناث بياض مسجلة حالياً في البطاريات أو العنابر', 'warning');
      return;
    }
    if (!layerFeed) {
      toast('لم يتم العثور على صنف علف البياض في المستودع', 'error');
      return;
    }
    if (layerFeed.totalKg < dailyLayerKg) {
      toast(
        `⚠️ رصيد علف البياض بالمستودع (${layerFeed.totalKg.toLocaleString('ar-SA')} كغم) غير كافٍ للاستهلاك اليومي المطلوب (${dailyLayerKg.toLocaleString('ar-SA')} كغم)!`,
        'error'
      );
      return;
    }

    try {
      const newTotalKg = Math.max(0, Math.round((layerFeed.totalKg - dailyLayerKg) * 100) / 100);
      const newBags = Math.floor(newTotalKg / layerFeed.bagWeightKg);

      await db.feedStock.update(layerFeed.id, {
        totalKg: newTotalKg,
        bagsCount: newBags,
      });

      await db.feedConsumption.add({
        id: `fc-daily-layers-${Date.now()}`,
        date: todayStr,
        targetType: 'all',
        targetId: 'all-layers',
        targetName: `قطيع إناث البياض (${totalLayerFemales.toLocaleString('ar-SA')} أنثى)`,
        feedType: 'layer_production',
        bagsUsed: dailyLayerBags,
        kgUsed: dailyLayerKg,
        costAmount: dailyLayerCost,
        birdsCount: totalLayerFemales,
        notes: `خصم استهلاك يومي تلقائي لإناث السمان البياضة بمعدل 30 جم/طير (إجمالي: ${dailyLayerKg} كغم / ${dailyLayerBags} كيس) بتكلفة تقديرية ${dailyLayerCost.toLocaleString('ar-SA')} ${farmSettings.currency}`,
        recordedBy: userName || 'النظام الآلي / مسؤول التغذية',
        createdAt: new Date().toISOString(),
      });

      toast(
        `✅ تم تسجيل استهلاك اليوم بنجاح: خصم ${dailyLayerKg.toLocaleString('ar-SA')} كغم (${dailyLayerBags} كيس) لـ ${totalLayerFemales.toLocaleString('ar-SA')} أنثى بياض بتكلفة ${dailyLayerCost.toLocaleString('ar-SA')} ${farmSettings.currency}!`,
        'success'
      );
    } catch (err: any) {
      console.error('Error recording daily layer feed consumption:', err);
      toast('تعذر تسجيل استهلاك اليوم، يرجى المحاولة لاحقاً', 'error');
    }
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
    if (!kg || isNaN(kg) || kg <= 0) {
      toast('يرجى إدخال كمية استهلاك صحيحة بالكيلوغرام أكبر من الصفر', 'error');
      return;
    }

    const stockItem = feedStocks?.find((f) => f.feedType === selectedFeedType);
    if (!stockItem) {
      toast('صنف العلف المحدد غير موجود في سجل المستودع', 'error');
      return;
    }

    if (stockItem.totalKg < kg) {
      toast(
        `⚠️ رصيد المستودع من (${stockItem.name}) هو ${stockItem.totalKg.toLocaleString('ar-SA')} كغم فقط! لا يكفي للكمية المطلوبة (${kg} كغم).`,
        'error'
      );
      return;
    }

    const bagWeight = stockItem?.bagWeightKg || 50;
    const bags = kg / bagWeight;
    const unitCost = stockItem ? (stockItem.costPerBag || 0) / bagWeight : 0;
    const costAmount = Math.round(kg * unitCost);

    await db.feedConsumption.add({
      id: `fc-${Date.now()}`,
      date: todayStr,
      targetType,
      targetId,
      targetName: tName,
      feedType: selectedFeedType as any,
      bagsUsed: Math.round(bags * 100) / 100,
      kgUsed: kg,
      costAmount,
      recordedBy: userName || 'عامل المزرعة',
      createdAt: new Date().toISOString(),
    });

    // Deduct from stock safely
    const newKg = Math.max(0, Math.round((stockItem.totalKg - kg) * 100) / 100);
    const newBags = Math.floor(newKg / bagWeight);
    await db.feedStock.update(stockItem.id, {
      totalKg: newKg,
      bagsCount: newBags,
    });

    toast(`تم تسجيل استهلاك ${kg} كغم علف وخصمها من الرصيد العام بتكلفة ${costAmount.toLocaleString('ar-SA')} ${farmSettings.currency}`, 'success');
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

  // Detailed Reconciliation & Audit Calculation: (Opening + Purchases) - (Flock Daily + POS + Adjustments) = Current Stock
  const reconciliationData = (feedStocks || []).map((stock) => {
    const bagWeight = stock.bagWeightKg || 50;
    const defaultOpenings: Record<string, number> = {
      starter_24_27: 2100,
      grower_fattening: 1750,
      layer_production: 3250,
    };
    const openingKg = stock.openingStockKg ?? (defaultOpenings[stock.feedType] || stock.totalKg);
    const openingBags = stock.openingStockBags ?? Math.floor(openingKg / bagWeight);

    // Purchases from db.purchases
    const matchedPurchases = purchases?.filter((p) => {
      const name = p.itemName || '';
      const notes = p.notes || '';
      return (
        name === stock.name ||
        notes.includes(stock.name) ||
        (p.id?.startsWith('purch-feed-') &&
          ((stock.feedType === 'starter_24_27' && name.includes('بادي')) ||
            (stock.feedType === 'grower_fattening' && name.includes('نامي')) ||
            (stock.feedType === 'layer_production' && name.includes('بياض'))))
      );
    }) || [];
    const purchasedBags = matchedPurchases.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    const purchasedKg = purchasedBags * bagWeight;
    const purchasedCost = matchedPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

    // Bird Daily Consumptions
    const birdConsumptionLogs = consumptionLogs?.filter(
      (c) => c.feedType === stock.feedType && c.targetId !== 'pos-sale' && !c.targetId?.startsWith('audit-')
    ) || [];
    const birdConsumptionKg = Math.round(birdConsumptionLogs.reduce((sum, c) => sum + (Number(c.kgUsed) || 0), 0) * 100) / 100;
    const birdConsumptionBags = Math.round((birdConsumptionKg / bagWeight) * 100) / 100;

    // POS Sales
    const posSalesLogs = consumptionLogs?.filter(
      (c) => c.feedType === stock.feedType && c.targetId === 'pos-sale'
    ) || [];
    const posSalesKg = Math.round(posSalesLogs.reduce((sum, c) => sum + (Number(c.kgUsed) || 0), 0) * 100) / 100;
    const posSalesBags = Math.round((posSalesKg / bagWeight) * 100) / 100;

    // Inventory Audit Adjustments
    const auditLogs = consumptionLogs?.filter(
      (c) => c.feedType === stock.feedType && c.targetId?.startsWith('audit-')
    ) || [];
    const auditAdjustmentsKg = Math.round(auditLogs.reduce((sum, c) => sum + (Number(c.kgUsed) || 0), 0) * 100) / 100;
    const auditAdjustmentsBags = Math.round((auditAdjustmentsKg / bagWeight) * 100) / 100;

    // Calculated Book Stock
    const calculatedKg = Math.round((openingKg + purchasedKg - birdConsumptionKg - posSalesKg - auditAdjustmentsKg) * 100) / 100;
    const calculatedBags = Math.floor(calculatedKg / bagWeight);

    // Actual Live Stock in warehouse
    const actualKg = Math.round(stock.totalKg * 100) / 100;
    const actualBags = stock.bagsCount;

    // Variance
    const varianceKg = Math.round((actualKg - calculatedKg) * 100) / 100;
    const varianceGrams = Math.round(varianceKg * 1000);
    const isMatched = Math.abs(varianceKg) < 0.001;

    return {
      stock,
      openingKg,
      openingBags,
      purchasedBags,
      purchasedKg,
      purchasedCost,
      birdConsumptionKg,
      birdConsumptionBags,
      posSalesKg,
      posSalesBags,
      auditAdjustmentsKg,
      auditAdjustmentsBags,
      calculatedKg,
      calculatedBags,
      actualKg,
      actualBags,
      varianceKg,
      varianceGrams,
      isMatched,
    };
  });

  const totalOpeningKg = reconciliationData.reduce((s, r) => s + r.openingKg, 0);
  const totalPurchasedKg = reconciliationData.reduce((s, r) => s + r.purchasedKg, 0);
  const totalBirdConsumptionKg = reconciliationData.reduce((s, r) => s + r.birdConsumptionKg, 0);
  const totalPosSalesKg = reconciliationData.reduce((s, r) => s + r.posSalesKg, 0);
  const totalAuditAdjustmentsKg = reconciliationData.reduce((s, r) => s + r.auditAdjustmentsKg, 0);
  const totalCalculatedKg = reconciliationData.reduce((s, r) => s + r.calculatedKg, 0);
  const totalActualKg = reconciliationData.reduce((s, r) => s + r.actualKg, 0);
  const totalVarianceKg = Math.round((totalActualKg - totalCalculatedKg) * 100) / 100;
  const isOverallReconciled = reconciliationData.length > 0 && reconciliationData.every((r) => r.isMatched);

  const handleCalibrateStock = async (stock: FeedStock, item: (typeof reconciliationData)[0]) => {
    const calibratedOpeningKg = Math.round(
      (item.actualKg - (item.purchasedKg - item.birdConsumptionKg - item.posSalesKg - item.auditAdjustmentsKg)) * 100
    ) / 100;
    const calibratedOpeningBags = Math.floor(calibratedOpeningKg / (stock.bagWeightKg || 50));
    await db.feedStock.update(stock.id, {
      openingStockKg: Math.max(0, calibratedOpeningKg),
      openingStockBags: Math.max(0, calibratedOpeningBags),
    });
    toast(`تمت معايرة الرصيد الافتتاحي لـ (${stock.name}) بنجاح وتحقيق مطابقة 100% بالجرام!`, 'success');
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
              const defaultFeed = feedStocks?.[0] || null;
              handleOpenPurchaseModal(defaultFeed);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
            title="تسجيل شراء أعلاف بسند مالي وزيادة المخزون تلقائياً واحتساب متوسط التكلفة"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            <span>شراء وتوريد أعلاف (سند مالي)</span>
          </button>
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
            title="تسوية جردية دورية للمخزون الفعلي فقط"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <span>تسوية وجرد المخزون</span>
          </button>
          <button
            onClick={() => setShowReconciliationModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
            title="تدقيق ومطابقة رصيد المخزون الدفتري والفعلي والمالي بدقة 100% بالجرام"
          >
            <Calculator className="w-4 h-4 stroke-[2.5]" />
            <span>مطابقة المخزون والمالية ⚖️</span>
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
            className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all"
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

      {/* Automated Daily Layer Feed Consumption Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-slate-50 border border-amber-300/80 shadow-apple flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <Zap className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-slate-900">
                استهلاك العلف اليومي المؤتمت (إناث السمان البياضة)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                معيار قياسي: 30 جرام / طير يومياً
              </span>
              {isLayerConsumptionRecordedToday && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>تم التسجيل اليوم ({todayRecordedKg.toLocaleString('ar-SA')} كغم)</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              يتم احتساب الاستهلاك اليومي لعلف البياض بدقة استناداً إلى تعداد الإناث المسجلة بالمزرعة (البطاريات والعنابر)، مع الخصم الفوري من رصيد المستودع وقيد التكلفة التشغيلية.
            </p>
            <div className="flex flex-wrap gap-4 pt-1 text-xs">
              <div>
                <span className="text-slate-500">إناث البياض المسجلة: </span>
                <span className="font-black text-slate-900 font-mono">
                  {totalLayerFemales.toLocaleString('ar-SA')} أنثى
                </span>
                <span className="text-[11px] text-slate-400 mr-1">
                  ({batteryFemales.toLocaleString('ar-SA')} بطاريات + {roomLayerFemales.toLocaleString('ar-SA')} عنابر)
                </span>
              </div>
              <div>
                <span className="text-slate-500">الاستهلاك اليومي: </span>
                <span className="font-black text-amber-800 font-mono">
                  {dailyLayerKg.toLocaleString('ar-SA')} كغم
                </span>
                <span className="text-[11px] text-slate-500 mr-1">
                  ({dailyLayerBags.toLocaleString('ar-SA')} كيس)
                </span>
              </div>
              <div>
                <span className="text-slate-500">التكلفة اليومية التقديرية: </span>
                <span className="font-black text-emerald-700 font-mono">
                  {dailyLayerCost.toLocaleString('ar-SA')} {farmSettings.currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={handleRecordDailyLayerConsumption}
            disabled={totalLayerFemales <= 0}
            className={`px-5 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-apple transition-all ${
              isLayerConsumptionRecordedToday
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
            }`}
            title="خصم استهلاك اليوم بدقة وتسجيل التكلفة"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>
              {isLayerConsumptionRecordedToday
                ? 'تسجيل استهلاك إضافي لليوم'
                : `⚡ تسجيل استهلاك اليوم (${dailyLayerKg.toLocaleString('ar-SA')} كغم)`}
            </span>
          </button>
        </div>
      </div>

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
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfigModal(feed);
                        setConfigMinBags(feed.minThresholdBags ?? 1);
                        setConfigBagWeight(feed.bagWeightKg ?? 50);
                      }}
                      className="p-2 rounded-2xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      title="⚙️ تعديل الحد الأدنى للتنبيه ووزن الكيس"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        isLow ? 'bg-rose-100 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <Package className="w-5 h-5" />
                    </div>
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
                    <span>كمية منخفضة (الحد الأدنى: {feed.minThresholdBags} كيس)</span>
                  </div>
                )}

                {/* Weighted Average Cost badge (متوسط التكلفة المرجح) */}
                <div className="mt-1 mb-3 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-medium">متوسط التكلفة المرجح:</span>
                  <span className="font-mono font-black text-slate-800">
                    {(feed.costPerBag || 0).toLocaleString('ar-SA')} {farmSettings.currency} / كيس
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    آخر شراء وتوريد: {feed.lastRestockedDate}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setShowAdjustStockModal(feed);
                        setAdjustedBags(feed.bagsCount);
                        setAdjustedKg(feed.totalKg);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1 transition-colors"
                      title="تسوية جردية دورية للمخزون الفعلي فقط"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                      <span>تعديل (جرد)</span>
                    </button>
                    <button
                      onClick={() => handleOpenPurchaseModal(feed)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      title="تسجيل عملية شراء أعلاف معتمدة بسند مالي وإضافتها للرصيد"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>+ شراء علف</span>
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

      {/* Part 3: Recent Feed Consumption Logs Table */}
      <div className="rounded-3xl glass-panel overflow-hidden border border-slate-200/80 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-sm text-slate-800">
              سجل حركات استهلاك الأعلاف اليومية والتشغيلية
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            إجمالي الحركات: {consumptionLogs?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">الجهة / القطيع المستهدف</th>
                <th className="p-3.5">نوع العلف</th>
                <th className="p-3.5">الكمية بالكغم</th>
                <th className="p-3.5">ما يعادل بالأكياس</th>
                <th className="p-3.5">التكلفة المالية</th>
                <th className="p-3.5">المسؤول والملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consumptionLogs && consumptionLogs.length > 0 ? (
                consumptionLogs.slice(0, 15).map((log) => {
                  const feedObj = feedStocks?.find((f) => f.feedType === log.feedType);
                  const feedLabel =
                    feedObj?.name ||
                    (log.feedType === 'layer_production'
                      ? 'علف بياض إنتاجي 20%'
                      : log.feedType === 'starter_24_27'
                      ? 'علف بادي سمان 24-27%'
                      : 'علف نامي تسمين 20-22%');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono text-slate-600">{log.date}</td>
                      <td className="p-3.5 font-bold text-slate-900">{log.targetName}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                          {feedLabel}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-black text-amber-900">
                        {log.kgUsed.toLocaleString('ar-SA')} كغم
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {log.bagsUsed} كيس
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700">
                        {log.costAmount
                          ? `${log.costAmount.toLocaleString('ar-SA')} ${farmSettings.currency}`
                          : '-'}
                      </td>
                      <td className="p-3.5 text-slate-500">
                        <div className="text-[11px] font-medium text-slate-700">{log.recordedBy || 'المشرف'}</div>
                        {log.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{log.notes}</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    لا توجد حركات استهلاك أعلاف مسجلة حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Financial Feed Purchase (شراء وتوريد أعلاف بسند مالي) */}
      {showPurchaseFeedModal && (() => {
        const currentStock = feedStocks?.find((f) => f.feedType === purchaseFeedType);
        const bags = typeof purchaseBagsCount === 'number' ? Math.max(0, purchaseBagsCount) : 0;
        const cost = typeof purchaseCostPerBag === 'number' ? Math.max(0, purchaseCostPerBag) : 0;
        const totalAmount = bags * cost;
        const addedWeightKg = bags * 50;
        const currentBags = currentStock?.bagsCount || 0;
        const currentCost = currentStock?.costPerBag || 0;
        const expectedBags = currentBags + bags;
        const expectedKg = expectedBags * 50;
        const expectedWAC = calculateWeightedAverageCost(currentBags, currentCost, bags, cost);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-apple-modal border border-slate-100 text-right max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                    <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      شراء وتوريد أعلاف (سند مالي ومخزني)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      إضافة الرصيد للمستودع وتحديث متوسط التكلفة المرجح (WAC) مع توليد قيد محاسبي مزدوج
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPurchaseFeedModal(false)}
                  className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveFeedPurchase} className="space-y-4">
                {/* 1. Feed Type Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    نوع العلف المُراد شراؤه وتوريده:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {feedStocks?.map((feed) => {
                      const isSelected = purchaseFeedType === feed.feedType;
                      return (
                        <button
                          key={feed.id}
                          type="button"
                          onClick={() => {
                            setPurchaseFeedType(feed.feedType);
                            if (feed.costPerBag) {
                              setPurchaseCostPerBag(feed.costPerBag);
                            }
                          }}
                          className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-black shadow-sm'
                              : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
                          }`}
                        >
                          <span className="text-xs">{feed.name}</span>
                          <span className="text-[10px] text-slate-500 mt-1">
                            الرصيد: {feed.bagsCount} كيس
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Bags & Cost per bag */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      عدد الأكياس المشترية (زنة 50 كجم): <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={purchaseBagsCount}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Math.max(1, Math.floor(Number(e.target.value)));
                          setPurchaseBagsCount(val);
                        }}
                        placeholder="20"
                        className="w-full glass-input text-center text-xl font-mono font-black text-slate-900"
                        autoFocus
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        كيس
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      يعادل {addedWeightKg.toLocaleString('ar-SA')} كغم علف صافي
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      سعر شراء الكيس الواحد: <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="100"
                        required
                        value={purchaseCostPerBag}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                          setPurchaseCostPerBag(val);
                        }}
                        placeholder="27000"
                        className="w-full glass-input text-center text-xl font-mono font-black text-slate-900"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {farmSettings.currency}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      التكلفة الحالية: {(currentCost || 0).toLocaleString('ar-SA')} {farmSettings.currency}
                    </span>
                  </div>
                </div>

                {/* 3. Real-time Calculation & Weighted Average Cost Preview Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 border border-emerald-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-600" />
                      إجمالي مبلغ الشراء المطلوب:
                    </span>
                    <span className="text-lg font-black font-mono text-emerald-800">
                      {totalAmount.toLocaleString('ar-SA')} {farmSettings.currency}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">الرصيد بعد التوريد:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {expectedBags} كيس ({expectedKg.toLocaleString('ar-SA')} كغم)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">متوسط التكلفة المرجح الجديد (WAC):</span>
                      <span className="font-extrabold font-mono text-emerald-700">
                        {expectedWAC.toLocaleString('ar-SA')} {farmSettings.currency} / كيس
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Payment Source (الصندوق أو البنك أو آجل مورد) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    طريقة السداد والطرف الدائن في القيد المحاسبي: <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPurchasePaidFrom('cash_box')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                        purchasePaidFrom === 'cash_box'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      <span>الصندوق (كاش)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchasePaidFrom('bank_account')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                        purchasePaidFrom === 'bank_account'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>الحساب البنكي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchasePaidFrom('credit')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                        purchasePaidFrom === 'credit'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>آجل (دين مورد)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {purchasePaidFrom === 'cash_box'
                      ? 'يتم الخصم مباشرة من الصندوق بقيد مزدوج (مدين: مصروفات أعلاف 50101 | دائن: الصندوق 10101)'
                      : purchasePaidFrom === 'bank_account'
                      ? 'يتم الخصم من الحساب البنكي بقيد مزدوج (مدين: مصروفات أعلاف 50101 | دائن: البنك 10105)'
                      : 'يتم قيد المبلغ ذمة دائنة في الخصوم (مدين: مصروفات أعلاف 50101 | دائن: الموردون 20101)'}
                  </p>
                </div>

                {/* 5. Supplier & Invoice Reference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم المورد / شركة الأعلاف:
                      {purchasePaidFrom === 'credit' && <span className="text-rose-500"> * (مطلوب)</span>}
                    </label>
                    <input
                      type="text"
                      value={purchaseSupplier}
                      onChange={(e) => setPurchaseSupplier(e.target.value)}
                      placeholder="مثال: مطاحن وصوامع الغلال / تاجر الأعلاف"
                      required={purchasePaidFrom === 'credit'}
                      className="w-full glass-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      رقم فاتورة المورد / سند الشحن:
                    </label>
                    <input
                      type="text"
                      value={purchaseInvoiceRef}
                      onChange={(e) => setPurchaseInvoiceRef(e.target.value)}
                      placeholder="مثال: INV-9842"
                      className="w-full glass-input text-xs font-mono"
                    />
                  </div>
                </div>

                {/* 6. Purchase Date & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تاريخ الشراء والتوريد:
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full glass-input text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ملاحظات أو رقم التشغيلة:
                    </label>
                    <input
                      type="text"
                      value={purchaseNotes}
                      onChange={(e) => setPurchaseNotes(e.target.value)}
                      placeholder="رقم الدفعة، جودة الشحنة..."
                      className="w-full glass-input text-xs"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isPurchaseSubmitting || totalAmount <= 0}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-black text-xs shadow-apple flex items-center justify-center gap-2 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isPurchaseSubmitting
                        ? 'جارِ الحفظ والترحيل المحاسبي...'
                        : `تأكيد شراء وتوريد ${bags} كيس (${totalAmount.toLocaleString('ar-SA')} ${farmSettings.currency})`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPurchaseFeedModal(false)}
                    className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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

              {/* Quick Preset: Layer flock daily consumption */}
              {totalLayerFemales > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex items-center justify-between">
                  <div className="text-[11px] text-amber-950 font-bold">
                    استهلاك قطيع البياض ({totalLayerFemales.toLocaleString('ar-SA')} أنثى × 30 جم = {dailyLayerKg} كغم)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFeedType('layer_production');
                      setKgConsumed(dailyLayerKg);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[11px] transition-all flex items-center gap-1 shadow-xs"
                  >
                    <Zap className="w-3 h-3" />
                    <span>تطبيق</span>
                  </button>
                </div>
              )}

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
                    تسوية دورية لمطابقة الرصيد الدفتري مع الجرد الفعلي للمستودع
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

            {/* Audit disclaimer notice */}
            <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                <strong>تنبيه الجرد الدوري:</strong> هذه النافذة مخصصة حصرياً لتسوية فروقات الجرد الفعلي في المستودع. لتوريد شحنات جديدة، يرجى استخدام زر <strong>"شراء وتوريد أعلاف (سند مالي)"</strong> لضمان الخصم المالي وتحديث متوسط التكلفة المرجح.
              </div>
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

      {/* Modal: Feed Configuration (الحد الأدنى ووزن الكيس) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    إعدادات صنف العلف
                  </h3>
                  <p className="text-[11px] text-slate-500">{showConfigModal.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  حد التنبيه عند انخفاض الكمية (أكياس):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={configMinBags}
                    onChange={(e) => setConfigMinBags(Math.max(1, Number(e.target.value)))}
                    className="w-full glass-input text-center text-lg font-mono font-black"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    كيس
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  يظهر تنبيه "كمية منخفضة" إذا وصل الرصيد إلى هذا الحد أو أقل (الافتراضي 1 كيس).
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  وزن الكيس الافتراضي (كيلوجرام):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={configBagWeight}
                    onChange={(e) => setConfigBagWeight(Math.max(1, Number(e.target.value)))}
                    className="w-full glass-input text-center text-lg font-mono font-black text-emerald-800"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    كغم
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  يُستخدم لحساب الكميات بين الأكياس والكيلوجرامات في المستودع ونقاط البيع (الافتراضي 50 كغم).
                </span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ الإعدادات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: مطابقة المخزون والمالية (Inventory & Ledger Reconciliation) */}
      {showReconciliationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-500/10 via-emerald-500/10 to-teal-500/10 flex items-start justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                  <Calculator className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">
                      مطابقة المخزون والمالية (Inventory & Ledger Reconciliation)
                    </h3>
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      ⚖️ دقة 100% بالجرام
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    (رصيد العلف الافتتاحي + إجمالي مشتريات الأعلاف بسندات الصرف) - (استهلاك الطيور اليومي + مبيعات POS + تسويات الجرد) = رصيد المستودع الفعلي
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReconciliationModal(false)}
                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Integrity Status Card */}
              <div className={`p-5 rounded-3xl border ${
                isOverallReconciled
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50/80 border-amber-300 text-amber-950'
              } flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs`}>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${isOverallReconciled ? 'bg-emerald-600' : 'bg-amber-500'} text-white shadow-xs`}>
                    <FileCheck className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm">
                      {isOverallReconciled
                        ? '✅ معادلة مطابقة المخزون والمالية محققة بنسبة 100.00% لكافة الأصناف'
                        : '⚠️ هناك تباين طفيف بين الرصيد الدفتري والفعلي، يمكن الضغط على زر "معايرة" لمطابقة دقيقة'}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      إجمالي الفارق عبر كافة الأصناف: <b className="font-mono font-black">{totalVarianceKg} كغم ({Math.round(totalVarianceKg * 1000)} جرام)</b>.
                      كل حركة استهلاك، بيع، شراء، أو تسوية مسجلة ومربوطة محاسبياً ومخزنياً.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-3 py-1 rounded-xl text-xs font-black font-mono border ${
                    isOverallReconciled
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {isOverallReconciled ? 'مطابقة تامة: 0 جرام فارق' : `فارق: ${totalVarianceKg} كغم`}
                  </span>
                </div>
              </div>

              {/* Summary Mathematical Equation Flow */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block mb-0.5">1. الرصيد الافتتاحي</span>
                  <b className="text-sm font-black text-slate-900 font-mono">{totalOpeningKg.toLocaleString('ar-SA')}</b>
                  <span className="text-[10px] text-slate-400 block">كغم</span>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">+ مشتريات بسندات صرف</span>
                  <b className="text-sm font-black text-emerald-900 font-mono">+{totalPurchasedKg.toLocaleString('ar-SA')}</b>
                  <span className="text-[10px] text-emerald-600 block">كغم</span>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 block mb-0.5">- استهلاك الطيور اليومي</span>
                  <b className="text-sm font-black text-amber-900 font-mono">-{totalBirdConsumptionKg.toLocaleString('ar-SA')}</b>
                  <span className="text-[10px] text-amber-600 block">كغم</span>
                </div>
                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200">
                  <span className="text-[10px] font-bold text-sky-700 block mb-0.5">- مبيعات الأعلاف (POS)</span>
                  <b className="text-sm font-black text-sky-900 font-mono">-{totalPosSalesKg.toLocaleString('ar-SA')}</b>
                  <span className="text-[10px] text-sky-600 block">كغم</span>
                </div>
                <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] font-bold text-purple-700 block mb-0.5">+/- تسويات الجرد</span>
                  <b className="text-sm font-black text-purple-900 font-mono">{totalAuditAdjustmentsKg >= 0 ? `-${totalAuditAdjustmentsKg}` : `+${Math.abs(totalAuditAdjustmentsKg)}`}</b>
                  <span className="text-[10px] text-purple-600 block">كغم</span>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-700 block mb-0.5">= رصيد المستودع الفعلي</span>
                  <b className="text-sm font-black text-indigo-900 font-mono">{totalActualKg.toLocaleString('ar-SA')}</b>
                  <span className="text-[10px] text-indigo-600 block">كغم</span>
                </div>
              </div>

              {/* Breakdown Table for the 3 Feed Types */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800">
                    جدول التدقيق والمطابقة التفصيلي لكل صنف علف بالمستودع
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    جميع الحركات مربوطة بـ IndexedDB وتعمل Offline-First بشكل كامل
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-extrabold text-[11px]">
                        <th className="py-3 px-3">صنف العلف</th>
                        <th className="py-3 px-3">الرصيد الافتتاحي</th>
                        <th className="py-3 px-3">+ مشتريات بسندات</th>
                        <th className="py-3 px-3">- استهلاك الطيور</th>
                        <th className="py-3 px-3">- مبيعات POS</th>
                        <th className="py-3 px-3">+/- تسوية الجرد</th>
                        <th className="py-3 px-3">الرصيد المحسوب</th>
                        <th className="py-3 px-3">الرصيد الفعلي الحالي</th>
                        <th className="py-3 px-3">فارق الجرام</th>
                        <th className="py-3 px-3 text-center">حالة التدقيق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reconciliationData.map((row) => (
                        <tr key={row.stock.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-black text-slate-900">{row.stock.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{row.stock.feedType}</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">
                            {row.openingKg.toLocaleString('ar-SA')} كغم
                            <span className="text-[10px] text-slate-400 block font-sans">({row.openingBags} كيس)</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                            +{row.purchasedKg.toLocaleString('ar-SA')} كغم
                            <span className="text-[10px] text-emerald-600/80 block font-sans">
                              ({row.purchasedBags} كيس - {row.purchasedCost.toLocaleString('ar-SA')} ر.ي)
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-700">
                            -{row.birdConsumptionKg.toLocaleString('ar-SA')} كغم
                            <span className="text-[10px] text-amber-600/80 block font-sans">({row.birdConsumptionBags} كيس)</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-sky-700">
                            -{row.posSalesKg.toLocaleString('ar-SA')} كغم
                            <span className="text-[10px] text-sky-600/80 block font-sans">({row.posSalesBags} كيس)</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-purple-700">
                            {row.auditAdjustmentsKg >= 0 ? `-${row.auditAdjustmentsKg}` : `+${Math.abs(row.auditAdjustmentsKg)}`} كغم
                            <span className="text-[10px] text-purple-600/80 block font-sans">({row.auditAdjustmentsBags} كيس)</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-slate-900 bg-slate-50/50">
                            {row.calculatedKg.toLocaleString('ar-SA')} كغم
                            <span className="text-[10px] text-slate-500 block font-sans">({row.calculatedBags} كيس)</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-emerald-800 bg-emerald-50/30">
                            {row.actualKg.toLocaleString('ar-SA')} كغم
                            <span className="text-[10px] text-emerald-600 block font-sans">({row.actualBags} كيس)</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-black">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                              row.isMatched ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {row.varianceGrams} جم
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {row.isMatched ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>مطابق 100%</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleCalibrateStock(row.stock, row)}
                                className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                                title="معايرة الرصيد الافتتاحي لمطابقة الرصيد الفعلي بدقة"
                              >
                                <RefreshCw className="w-3 h-3 text-indigo-600" />
                                <span>معايرة</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-10">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  نظام التخزين المحلي الآمن (Dexie IndexedDB) يضمن عمل التدقيق دون اتصال بالإنترنت مع تحديث تفاعلي لحظي (Live Query).
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowReconciliationModal(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                إغلاق نافذة التدقيق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
