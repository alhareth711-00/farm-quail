import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { NavTab } from '../layout/Sidebar';
import type { BroodingWeeklyRate } from '../../types';
import { DEFAULT_BROODING_RATES } from '../../types';
import {
  Egg,
  TrendingUp,
  TrendingDown,
  Bird,
  DollarSign,
  EggFried,
  AlertTriangle,
  PlusCircle,
  ArrowUpRight,
  Warehouse,
  Grid,
  CheckCircle2,
  Calendar,
  Sparkles,
  Package,
  Fan,
  Coins,
  Skull,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  Wheat,
  Scale,
  Utensils,
  PieChart,
  Activity,
  Check,
  Layers,
  Info,
  X,
  Flame,
  Wind,
  Baby,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { isManager, farmSettings } = useAuth();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);
  const currentDayOfMonth = today.getDate();

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Feed Analytics Modal State
  const [showFeedAnalyticsModal, setShowFeedAnalyticsModal] = useState(false);
  const [feedTimeframe, setFeedTimeframe] = useState<'today' | 'month'>('today');

  // Live queries from IndexedDB
  const batteries = useLiveQuery(() => db.batteries.toArray(), []);
  const tiers = useLiveQuery(() => db.tiers.toArray(), []);
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);
  const eggLogs = useLiveQuery(() => db.eggLogs.toArray(), []);
  const incubations = useLiveQuery(() => db.incubationBatches.toArray(), []);
  const invoices = useLiveQuery(() => db.invoices.toArray(), []);
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);
  const feedStocks = useLiveQuery(() => db.feedStock.toArray(), []);
  const feedConsumptions = useLiveQuery(() => db.feedConsumption.toArray(), []);
  const broodingBatches = useLiveQuery(() => db.broodingBatches.toArray(), []);
  const feedScheduleSetting = useLiveQuery(() => db.settings.get('broodingFeedSchedule'), []);
  const activeWithdrawals = useLiveQuery(
    () =>
      db.medicationSchedules
        .filter((m) => m.hasWithdrawal && !!m.withdrawalEndDate && m.withdrawalEndDate >= todayStr)
        .toArray(),
    [todayStr]
  );

  // Flock Calculations
  const totalBatteryBirds =
    tiers?.reduce((acc, t) => acc + (t.malesCount + t.femalesCount), 0) || 0;
  const totalBatteryFemales = tiers?.reduce((acc, t) => acc + t.femalesCount, 0) || 0;

  const totalRoomBirds =
    rooms?.reduce((acc, r) => acc + (r.malesCount + r.femalesCount), 0) || 0;
  const totalRoomFemales =
    rooms
      ?.filter((r) => r.purpose === 'layers')
      .reduce((acc, r) => acc + r.femalesCount, 0) || 0;

  const totalFlockBirds = totalBatteryBirds + totalRoomBirds;
  const totalLayingHens = totalBatteryFemales + totalRoomFemales;

  // Today's eggs & packaging
  const todayEggLogs = eggLogs?.filter((l) => l.collectionDate === todayStr) || [];
  const todayEggsTotal = todayEggLogs.reduce((acc, l) => acc + l.actualEggs, 0);
  const todayBrokenTotal = todayEggLogs.reduce((acc, l) => acc + (l.brokenEggs || 0), 0);
  const todayNetEggs = Math.max(0, todayEggsTotal - todayBrokenTotal);
  const todayPackagedTrays = todayEggLogs.reduce((acc, l) => acc + (l.packagedTraysCount || 0), 0);

  const todayBatteryEggs = todayEggLogs
    .filter((l) => l.targetType === 'tier')
    .reduce((acc, l) => acc + l.actualEggs, 0);
  const todayRoomEggs = todayEggLogs
    .filter((l) => l.targetType === 'room')
    .reduce((acc, l) => acc + l.actualEggs, 0);

  // Yesterday's eggs
  const yesterdayEggLogs = eggLogs?.filter((l) => l.collectionDate === yesterdayStr) || [];
  const yesterdayEggsTotal = yesterdayEggLogs.reduce((acc, l) => acc + l.actualEggs, 0);
  const yesterdayBatteryEggs = yesterdayEggLogs
    .filter((l) => l.targetType === 'tier')
    .reduce((acc, l) => acc + l.actualEggs, 0);
  const yesterdayRoomEggs = yesterdayEggLogs
    .filter((l) => l.targetType === 'room')
    .reduce((acc, l) => acc + l.actualEggs, 0);

  // Day-over-day changes percentage
  const calcChangePct = (curr: number, prev: number) => {
    if (prev <= 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  };

  const totalChangePct = calcChangePct(todayEggsTotal, yesterdayEggsTotal);
  const batteryChangePct = calcChangePct(todayBatteryEggs, yesterdayBatteryEggs);
  const roomChangePct = calcChangePct(todayRoomEggs, yesterdayRoomEggs);

  // Laying rate %
  const generalLayingRate =
    totalLayingHens > 0 ? Math.round((todayEggsTotal / totalLayingHens) * 100) : 0;

  // Financials today (Manager only)
  const todayInvoices = invoices?.filter((inv) => inv.date === todayStr) || [];
  const todayRevenue = todayInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const todayCashCollected = todayInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);

  // Active incubations
  const activeIncubationsList =
    incubations?.filter((b) => b.status === 'incubating' || b.status === 'candled') || [];

  // --- Feed Consumption & Financial Analytics Calculations ---
  const activeRates: BroodingWeeklyRate[] = useMemo(() => {
    if (feedScheduleSetting?.value?.rates && Array.isArray(feedScheduleSetting.value.rates)) {
      return feedScheduleSetting.value.rates;
    }
    return DEFAULT_BROODING_RATES;
  }, [feedScheduleSetting]);

  const getGramsPerChickForAge = (ageDays: number, rates: BroodingWeeklyRate[]): number => {
    if (ageDays <= 7) return rates.find((r) => r.weekNumber === 1)?.defaultGramsPerChickDay ?? 6.5;
    if (ageDays <= 14) return rates.find((r) => r.weekNumber === 2)?.defaultGramsPerChickDay ?? 12.0;
    if (ageDays <= 21) return rates.find((r) => r.weekNumber === 3)?.defaultGramsPerChickDay ?? 16.5;
    if (ageDays <= 28) return rates.find((r) => r.weekNumber === 4)?.defaultGramsPerChickDay ?? 21.0;
    return rates.find((r) => r.weekNumber === 5)?.defaultGramsPerChickDay ?? 25.0;
  };

  // Feed Stock Info
  const starterStock = feedStocks?.find((f) => f.feedType === 'starter_24_27');
  const starterCostPerBag = starterStock?.costPerBag || 29000;
  const starterBagWeight = starterStock?.bagWeightKg || 50;
  const starterCostPerKg = starterCostPerBag / starterBagWeight;
  const starterAvailableBags = starterStock?.bagsCount || 0;

  const growerStock = feedStocks?.find((f) => f.feedType === 'grower_fattening');
  const growerCostPerBag = growerStock?.costPerBag || 27000;
  const growerBagWeight = growerStock?.bagWeightKg || 50;
  const growerCostPerKg = growerCostPerBag / growerBagWeight;
  const growerAvailableBags = growerStock?.bagsCount || 0;

  const layerStock = feedStocks?.find((f) => f.feedType === 'layer_production');
  const layerCostPerBag = layerStock?.costPerBag || 25500;
  const layerBagWeight = layerStock?.bagWeightKg || 50;
  const layerCostPerKg = layerCostPerBag / layerBagWeight;
  const layerAvailableBags = layerStock?.bagsCount || 0;

  // 1. Starter Flock & Rates (Phase 1 brooding: 1-21 days)
  const phase1Brood = broodingBatches?.filter((b) => {
    if (b.status !== 'active') return false;
    const age = Math.max(1, Math.floor((today.getTime() - new Date(b.hatchDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return age <= 21;
  }) || [];
  const p1ChicksCount = phase1Brood.reduce((acc, b) => acc + b.currentChicksCount, 0);

  const p1EstimatedDailyKg = phase1Brood.reduce((acc, b) => {
    const age = Math.max(1, Math.floor((today.getTime() - new Date(b.hatchDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const g = getGramsPerChickForAge(age, activeRates);
    return acc + (b.currentChicksCount * g) / 1000;
  }, 0);
  const p1EstimatedDailyCost = p1EstimatedDailyKg * starterCostPerKg;
  const p1EstimatedDailyBags = p1EstimatedDailyKg / starterBagWeight;

  const starterTodayLogs = feedConsumptions?.filter((c) => c.date === todayStr && c.feedType === 'starter_24_27') || [];
  const starterKgLoggedToday = starterTodayLogs.reduce((a, c) => a + c.kgUsed, 0);
  const starterCostLoggedToday = starterTodayLogs.reduce((a, c) => a + (c.costAmount || c.kgUsed * starterCostPerKg), 0);
  const starterBagsLoggedToday = starterTodayLogs.reduce((a, c) => a + c.bagsUsed, 0);

  const p1KgToday = starterKgLoggedToday > 0 ? starterKgLoggedToday : Math.round(p1EstimatedDailyKg * 10) / 10;
  const p1CostToday = starterCostLoggedToday > 0 ? starterCostLoggedToday : Math.round(p1EstimatedDailyCost);
  const p1BagsToday = starterBagsLoggedToday > 0 ? starterBagsLoggedToday : Math.round(p1EstimatedDailyBags * 100) / 100;

  const starterMonthLogs = feedConsumptions?.filter((c) => c.date.startsWith(currentMonthStr) && c.feedType === 'starter_24_27') || [];
  const p1KgMonth = starterMonthLogs.length > 0
    ? starterMonthLogs.reduce((a, c) => a + c.kgUsed, 0)
    : Math.round(p1EstimatedDailyKg * currentDayOfMonth * 10) / 10;
  const p1CostMonth = starterMonthLogs.length > 0
    ? starterMonthLogs.reduce((a, c) => a + (c.costAmount || c.kgUsed * starterCostPerKg), 0)
    : Math.round(p1EstimatedDailyCost * currentDayOfMonth);
  const p1BagsMonth = Math.round((p1KgMonth / starterBagWeight) * 100) / 100;

  // 2. Grower Flock & Rates (Phase 2 brooding 22-38 days + Fattening meat birds)
  const phase2Brood = broodingBatches?.filter((b) => {
    if (b.status !== 'active') return false;
    const age = Math.max(1, Math.floor((today.getTime() - new Date(b.hatchDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return age > 21;
  }) || [];
  const p2ChicksCount = phase2Brood.reduce((acc, b) => acc + b.currentChicksCount, 0);
  const fatteningBirdsCount = rooms?.filter((r) => r.purpose === 'fattening').reduce((acc, r) => acc + r.malesCount + r.femalesCount, 0) || 0;
  const totalGrowerBirds = p2ChicksCount + fatteningBirdsCount;

  const p2BroodKg = phase2Brood.reduce((acc, b) => {
    const age = Math.max(1, Math.floor((today.getTime() - new Date(b.hatchDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const g = getGramsPerChickForAge(age, activeRates);
    return acc + (b.currentChicksCount * g) / 1000;
  }, 0);
  const fatteningKg = (fatteningBirdsCount * 26) / 1000;
  const growerEstimatedDailyKg = p2BroodKg + fatteningKg;
  const growerEstimatedDailyCost = growerEstimatedDailyKg * growerCostPerKg;
  const growerEstimatedDailyBags = growerEstimatedDailyKg / growerBagWeight;

  const growerTodayLogs = feedConsumptions?.filter((c) => c.date === todayStr && c.feedType === 'grower_fattening') || [];
  const growerKgLoggedToday = growerTodayLogs.reduce((a, c) => a + c.kgUsed, 0);
  const growerCostLoggedToday = growerTodayLogs.reduce((a, c) => a + (c.costAmount || c.kgUsed * growerCostPerKg), 0);
  const growerBagsLoggedToday = growerTodayLogs.reduce((a, c) => a + c.bagsUsed, 0);

  const growerKgToday = growerKgLoggedToday > 0 ? growerKgLoggedToday : Math.round(growerEstimatedDailyKg * 10) / 10;
  const growerCostToday = growerCostLoggedToday > 0 ? growerCostLoggedToday : Math.round(growerEstimatedDailyCost);
  const growerBagsToday = growerBagsLoggedToday > 0 ? growerBagsLoggedToday : Math.round(growerEstimatedDailyBags * 100) / 100;

  const growerMonthLogs = feedConsumptions?.filter((c) => c.date.startsWith(currentMonthStr) && c.feedType === 'grower_fattening') || [];
  const growerKgMonth = growerMonthLogs.length > 0
    ? growerMonthLogs.reduce((a, c) => a + c.kgUsed, 0)
    : Math.round(growerEstimatedDailyKg * currentDayOfMonth * 10) / 10;
  const growerCostMonth = growerMonthLogs.length > 0
    ? growerMonthLogs.reduce((a, c) => a + (c.costAmount || c.kgUsed * growerCostPerKg), 0)
    : Math.round(growerEstimatedDailyCost * currentDayOfMonth);
  const growerBagsMonth = Math.round((growerKgMonth / growerBagWeight) * 100) / 100;

  // 3. Layer Flock & Rates (Laying females standard 30g/day)
  const layerEstimatedDailyKg = (totalLayingHens * 30) / 1000;
  const layerEstimatedDailyCost = layerEstimatedDailyKg * layerCostPerKg;
  const layerEstimatedDailyBags = layerEstimatedDailyKg / layerBagWeight;

  const layerTodayLogs = feedConsumptions?.filter((c) => c.date === todayStr && c.feedType === 'layer_production') || [];
  const layerKgLoggedToday = layerTodayLogs.reduce((a, c) => a + c.kgUsed, 0);
  const layerCostLoggedToday = layerTodayLogs.reduce((a, c) => a + (c.costAmount || c.kgUsed * layerCostPerKg), 0);
  const layerBagsLoggedToday = layerTodayLogs.reduce((a, c) => a + c.bagsUsed, 0);

  const layerKgToday = layerKgLoggedToday > 0 ? layerKgLoggedToday : Math.round(layerEstimatedDailyKg * 10) / 10;
  const layerCostToday = layerCostLoggedToday > 0 ? layerCostLoggedToday : Math.round(layerEstimatedDailyCost);
  const layerBagsToday = layerBagsLoggedToday > 0 ? layerBagsLoggedToday : Math.round(layerEstimatedDailyBags * 100) / 100;

  const layerMonthLogs = feedConsumptions?.filter((c) => c.date.startsWith(currentMonthStr) && c.feedType === 'layer_production') || [];
  const layerKgMonth = layerMonthLogs.length > 0
    ? layerMonthLogs.reduce((a, c) => a + c.kgUsed, 0)
    : Math.round(layerEstimatedDailyKg * currentDayOfMonth * 10) / 10;
  const layerCostMonth = layerMonthLogs.length > 0
    ? layerMonthLogs.reduce((a, c) => a + (c.costAmount || c.kgUsed * layerCostPerKg), 0)
    : Math.round(layerEstimatedDailyCost * currentDayOfMonth);
  const layerBagsMonth = Math.round((layerKgMonth / layerBagWeight) * 100) / 100;

  // Overall Totals
  const totalFeedKgToday = Math.round((p1KgToday + growerKgToday + layerKgToday) * 10) / 10;
  const totalFeedCostToday = p1CostToday + growerCostToday + layerCostToday;
  const totalFeedBagsToday = Math.round((p1BagsToday + growerBagsToday + layerBagsToday) * 100) / 100;

  const totalFeedKgMonth = Math.round((p1KgMonth + growerKgMonth + layerKgMonth) * 10) / 10;
  const totalFeedCostMonth = p1CostMonth + growerCostMonth + layerCostMonth;
  const totalFeedBagsMonth = Math.round((p1BagsMonth + growerBagsMonth + layerBagsMonth) * 100) / 100;

  // Financial Returns Comparison (العائد مقابل تكلفة الأعلاف)
  const defaultTrayPrice = farmSettings.defaultTrayPrice || 900;
  const estimatedEggRevenueToday = Math.round((todayNetEggs / 30) * defaultTrayPrice);
  const recordedSalesToday = todayRevenue;
  const totalDailyEstimatedGrossRevenue =
    estimatedEggRevenueToday + (recordedSalesToday > estimatedEggRevenueToday ? recordedSalesToday - estimatedEggRevenueToday : 0);
  const dailyFeedMargin = totalDailyEstimatedGrossRevenue - totalFeedCostToday;
  const feedCostRatioPct = totalDailyEstimatedGrossRevenue > 0
    ? Math.round((totalFeedCostToday / totalDailyEstimatedGrossRevenue) * 100)
    : 0;

  // Monthly returns for feed comparison
  const monthInvoices = invoices?.filter((inv) => inv.date.startsWith(currentMonthStr)) || [];
  const monthRevenue = monthInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const monthEggRevenue = Math.round(estimatedEggRevenueToday * currentDayOfMonth);
  const totalMonthEstimatedGrossRevenue = monthEggRevenue + (monthRevenue > monthEggRevenue ? (monthRevenue - monthEggRevenue) : 0);
  const monthFeedMargin = totalMonthEstimatedGrossRevenue - totalFeedCostMonth;
  const monthFeedCostRatioPct = totalMonthEstimatedGrossRevenue > 0
    ? Math.round((totalFeedCostMonth / totalMonthEstimatedGrossRevenue) * 100)
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Bio-security Alert Banner if active */}
      {activeWithdrawals && activeWithdrawals.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-300 text-amber-950 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">
                تنبيه أمان حيوي وفترة تحريم نشطة (Withdrawal Period)
              </div>
              <div className="text-xs text-amber-800">
                هناك علاج/مضاد حيوي نشط على قطيع المزرعة. يمنع بيع اللحم أو البيض الخاص بهذا القطيع حتى تاريخ{' '}
                <span className="font-mono font-bold">{activeWithdrawals[0].withdrawalEndDate}</span>.
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('health_feed')}
            className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shrink-0 transition-colors"
          >
            عرض جدول الأدوية
          </button>
        </div>
      )}

      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-600/90 via-teal-600/90 to-sky-600/90 p-6 rounded-3xl text-white shadow-apple">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-emerald-200" />
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
              لوحة التحكم الذكية والمطابقة الميدانية
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            مرحباً بك في {farmSettings.farmName}
          </h2>
          <p className="text-xs text-emerald-50/90 mt-1 max-w-xl">
            15 بطارية أقفاص (أ-س)، 7 غرف تربية أرضية، قسم المعزولات، السجل البيئي، ومطابقة الصندوق الآلية.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('egg_production')}
            className="px-4 py-2.5 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all"
          >
            <Egg className="w-4 h-4 text-emerald-600" />
            <span>تسجيل جمعة بيض وفرز</span>
          </button>
          <button
            onClick={() => onNavigate('equipment')}
            className="px-4 py-2.5 rounded-2xl bg-sky-700/80 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 transition-all border border-sky-400/40"
          >
            <Fan className="w-4 h-4" />
            <span>السجل البيئي والمعدات</span>
          </button>
          <button
            onClick={() => onNavigate('mortality')}
            className="px-4 py-2.5 rounded-2xl bg-rose-700/80 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 transition-all border border-rose-400/40"
          >
            <Skull className="w-4 h-4" />
            <span>سجل النفوق التفصيلي</span>
          </button>
          {isManager && (
            <>
              <button
                onClick={() => onNavigate('products')}
                className="px-4 py-2.5 rounded-2xl bg-teal-700/80 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 transition-all border border-teal-400/40"
              >
                <Package className="w-4 h-4" />
                <span>إدارة المنتجات والأسعار</span>
              </button>
              <button
                onClick={() => onNavigate('cash_register')}
                className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all"
              >
                <Coins className="w-4 h-4" />
                <span>مطابقة الصندوق والوردية</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Egg Yield with Daily Change Arrow */}
        <div className="p-5 rounded-3xl glass-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">إنتاج البيض الصافي اليوم</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Egg className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {todayNetEggs.toLocaleString('ar-SA')}
            </span>
            <span className="text-xs font-bold text-slate-400">بيضة صافية</span>
          </div>

          {/* Daily Change Arrow */}
          <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1">
              <span className="text-slate-400">مقارنة بأمس:</span>
              <span
                className={`font-mono font-bold flex items-center gap-0.5 ${
                  totalChangePct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {totalChangePct >= 0 ? (
                  <>
                    <ArrowUp className="w-3.5 h-3.5 stroke-[3]" />
                    <span>+{totalChangePct}% صعود</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{totalChangePct}% هبوط</span>
                  </>
                )}
              </span>
            </div>
            <span className="text-slate-400 text-[10px] font-mono">
              أمس: {yesterdayEggsTotal}
            </span>
          </div>
        </div>

        {/* Card 2: Packaged Trays Today */}
        <div className="p-5 rounded-3xl glass-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">تقفيص وتغليف الأطباق اليوم</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {todayPackagedTrays.toLocaleString('ar-SA')}
            </span>
            <span className="text-xs font-bold text-slate-400">طبق جاهز</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
            <span>مكسر مستبعد: <b className="text-rose-700 font-mono">{todayBrokenTotal}</b></span>
            <span>بياض: <b className="text-teal-700 font-mono">{generalLayingRate}%</b></span>
          </div>
        </div>

        {/* Card 3: Total Living Flock */}
        <div className="p-5 rounded-3xl glass-card relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">إجمالي قطيع المزرعة الحي</span>
              <button
                type="button"
                onClick={() => setShowFeedAnalyticsModal(true)}
                className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
                title="تحليل استهلاك وتكاليف الأعلاف للقطيع 🌾"
              >
                <Wheat className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>تحليل الأعلاف 🌾</span>
              </button>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Bird className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono">
                {totalFlockBirds.toLocaleString('ar-SA')}
              </span>
              <span className="text-xs font-bold text-slate-400">طائر سمان</span>
            </div>
            <button
              type="button"
              onClick={() => setShowFeedAnalyticsModal(true)}
              className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200/60 flex items-center gap-1 transition-colors"
              title="انقر لفتح تفاصيل استهلاك وتكاليف الأعلاف"
            >
              <Utensils className="w-3 h-3 text-amber-600" />
              <span>{Math.round(totalFeedKgToday)} كغم علف/يوم</span>
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span>البطاريات (15): <b>{totalBatteryBirds}</b></span>
            <span>الغرف (7+معزولات): <b>{totalRoomBirds}</b></span>
          </div>
        </div>

        {/* Card 4: Daily Revenue / Cash (Manager Only) */}
        {isManager ? (
          <div className="p-5 rounded-3xl glass-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">مبيعات اليوم النقدية</span>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono">
                {todayRevenue.toLocaleString('ar-SA')}
              </span>
              <span className="text-xs font-bold text-slate-500">{farmSettings.currency}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span>المحصل نقداً: <b className="text-emerald-700">{todayCashCollected}</b></span>
              <button
                onClick={() => onNavigate('cash_register')}
                className="text-amber-700 font-bold hover:underline"
              >
                جرد الصندوق ←
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-3xl glass-card relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">الفقاسات النشطة</span>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <EggFried className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono">
                {activeIncubationsList.length}
              </span>
              <span className="text-xs font-bold text-slate-400">دفعات قيد التفريخ</span>
            </div>
            <div className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              بيوض قيد الحضانة: <b>{activeIncubationsList.reduce((a, b) => a + b.eggCount, 0)}</b>
            </div>
          </div>
        )}
      </div>

      {/* Requirement 3: Instant Visual Comparison: الغرف مقابل الشبوك مع أسهم التغير اليومي */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Egg className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-sm text-slate-900">
              المقارنة البصرية الفورية لإنتاج اليوم: الشبوك (البطاريات) مقابل الغرف (التربية الأرضية)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            تحديث مباشر بلحظته • تاريخ اليوم: {todayStr}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Battery Cages (الشبوك) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-200/80 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-emerald-950">
                    إنتاج الشبوك (أقفاص البطاريات أ-س)
                  </h4>
                  <div className="text-[11px] text-emerald-800">
                    15 بطارية مسجلة • 4 أدوار عمودية
                  </div>
                </div>
              </div>

              {/* Day Change Badge */}
              <div
                className={`px-3 py-1 rounded-full font-mono font-bold text-xs flex items-center gap-1 border ${
                  batteryChangePct >= 0
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border-rose-300'
                }`}
              >
                {batteryChangePct >= 0 ? (
                  <>
                    <ArrowUp className="w-3.5 h-3.5 stroke-[3] text-emerald-700" />
                    <span>+{batteryChangePct}% صعود</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3.5 h-3.5 stroke-[3] text-rose-700" />
                    <span>{batteryChangePct}% هبوط</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono">
                {todayBatteryEggs.toLocaleString('ar-SA')}
              </span>
              <span className="text-xs font-bold text-slate-500">بيضة اليوم</span>
              <span className="text-[11px] text-slate-400 font-mono mr-auto">
                (أمس: {yesterdayBatteryEggs} بيضة)
              </span>
            </div>

            {/* Visual ratio bar */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                <span>نسبة المساهمة من إنتاج المزرعة</span>
                <span className="font-mono font-bold">
                  {todayEggsTotal > 0 ? Math.round((todayBatteryEggs / todayEggsTotal) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${todayEggsTotal > 0 ? (todayBatteryEggs / todayEggsTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 2. Floor Rearing Rooms (الغرف) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 to-blue-500/5 border border-sky-200/80 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-sky-950">
                    إنتاج الغرف (عنبر التربية الأرضية)
                  </h4>
                  <div className="text-[11px] text-sky-800">
                    7 غرف تربية + قسم المعزولات
                  </div>
                </div>
              </div>

              {/* Day Change Badge */}
              <div
                className={`px-3 py-1 rounded-full font-mono font-bold text-xs flex items-center gap-1 border ${
                  roomChangePct >= 0
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border-rose-300'
                }`}
              >
                {roomChangePct >= 0 ? (
                  <>
                    <ArrowUp className="w-3.5 h-3.5 stroke-[3] text-emerald-700" />
                    <span>+{roomChangePct}% صعود</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3.5 h-3.5 stroke-[3] text-rose-700" />
                    <span>{roomChangePct}% هبوط</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono">
                {todayRoomEggs.toLocaleString('ar-SA')}
              </span>
              <span className="text-xs font-bold text-slate-500">بيضة اليوم</span>
              <span className="text-[11px] text-slate-400 font-mono mr-auto">
                (أمس: {yesterdayRoomEggs} بيضة)
              </span>
            </div>

            {/* Visual ratio bar */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                <span>نسبة المساهمة من إنتاج المزرعة</span>
                <span className="font-mono font-bold">
                  {todayEggsTotal > 0 ? Math.round((todayRoomEggs / todayEggsTotal) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${todayEggsTotal > 0 ? (todayRoomEggs / todayEggsTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Overview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Battery Cages Quick Overview */}
        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid className="w-5 h-5 text-emerald-600" />
              <h3 className="font-black text-slate-800 text-sm">عنبر البطاريات (15 بطارية: أ-س)</h3>
            </div>
            <button
              onClick={() => onNavigate('batteries')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
            >
              <span>عرض الكل</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {batteries?.slice(0, 6).map((bat) => {
              const batTiers = tiers?.filter((t) => t.batteryId === bat.id) || [];
              const batBirds = batTiers.reduce((a, t) => a + t.malesCount + t.femalesCount, 0);

              return (
                <div
                  key={bat.id}
                  onClick={() => onNavigate('batteries')}
                  className="p-3 rounded-2xl bg-slate-50/80 hover:bg-emerald-50/60 border border-slate-200/60 transition-all cursor-pointer text-center group"
                >
                  <div className="w-7 h-7 mx-auto rounded-xl bg-white border border-slate-200 group-hover:border-emerald-500 font-black text-xs flex items-center justify-center text-slate-900 group-hover:text-emerald-700 mb-1">
                    {bat.name}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-slate-700">
                    {batBirds} طائر
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Column: Floor Rearing Rooms Overview */}
        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-sky-600" />
              <h3 className="font-black text-slate-800 text-sm">عنبر التربية (7 غرف + المعزولات)</h3>
            </div>
            <button
              onClick={() => onNavigate('rooms')}
              className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1"
            >
              <span>عرض الكل</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {rooms?.slice(0, 3).map((room) => {
              const total = room.malesCount + room.femalesCount;

              const purposeLabels: Record<string, { label: string; color: string }> = {
                layers: { label: 'أمهات بياض', color: 'bg-emerald-100 text-emerald-800' },
                fattening: { label: 'تسمين لحم', color: 'bg-amber-100 text-amber-800' },
                brooding: { label: 'تحضين صوص', color: 'bg-sky-100 text-sky-800' },
                quarantine: { label: 'معزولات', color: 'bg-rose-100 text-rose-800' },
                annex: { label: 'ملحقات', color: 'bg-purple-100 text-purple-800' },
              };

              const badge = purposeLabels[room.purpose] || { label: room.purpose, color: 'bg-slate-100' };

              return (
                <div
                  key={room.id}
                  onClick={() => onNavigate('rooms')}
                  className="p-3 rounded-2xl bg-slate-50/80 hover:bg-sky-50/60 border border-slate-200/60 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900 group-hover:text-sky-700">
                      {room.name}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-700">{total} طائر</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Environmental & Equipment Quick Check */}
        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fan className="w-5 h-5 text-teal-600" />
              <h3 className="font-black text-slate-800 text-sm">السجل البيئي والمعدات</h3>
            </div>
            <button
              onClick={() => onNavigate('equipment')}
              className="text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1"
            >
              <span>فتح السجل</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-100 space-y-2 text-xs">
            <div className="flex justify-between items-center text-teal-950 font-bold">
              <span>حالة تهوية الغرف والشفاطات:</span>
              <span className="text-emerald-700 font-black">منتظمة (24°C)</span>
            </div>
            <div className="flex justify-between items-center text-teal-900 text-[11px]">
              <span>مضخات خلايا التبريد:</span>
              <span>تعمل آلياً بالظهيرة</span>
            </div>
            <div className="flex justify-between items-center text-teal-900 text-[11px]">
              <span>دفايات التحضين (غرفة 6 و 7):</span>
              <span>34°C مضبوطة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: تحليل استهلاك وتكاليف الأعلاف للقطيع */}
      {showFeedAnalyticsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 flex items-start justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
                  <Wheat className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">تحليل استهلاك وتكاليف الأعلاف للقطيع</h3>
                    <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                      🌾 منظومة التغذية الذكية
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    تحليل تفصيلي لاستهلاك وتكاليف الأعلاف اليومية والشهرية مع مؤشرات الكفاءة الاقتصادية والعائد
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Timeframe Switcher */}
                <div className="bg-slate-100 p-1 rounded-2xl flex items-center text-xs font-bold border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setFeedTimeframe('today')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      feedTimeframe === 'today'
                        ? 'bg-white text-emerald-800 shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>استهلاك اليوم</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedTimeframe('month')}
                    className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                      feedTimeframe === 'month'
                        ? 'bg-white text-emerald-800 shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <PieChart className="w-3.5 h-3.5 text-teal-600" />
                    <span>الشهر الحالي</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFeedAnalyticsModal(false)}
                  className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Financial Efficiency & Returns Comparison */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white shadow-lg space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white">مقارنة الكفاءة المالية: العائد مقابل تكلفة العلف</h4>
                      <p className="text-[11px] text-emerald-200/80">
                        {feedTimeframe === 'today'
                          ? 'مقارنة الإنفاق على الأعلاف اليومية مقابل إيرادات إنتاج البيض والمبيعات المحققة'
                          : `المؤشرات التراكمية لشهر ${currentMonthStr} مقابل مبيعات وإنتاج الشهر`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-300">نسبة تكلفة العلف من العائد:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-black ${
                      (feedTimeframe === 'today' ? feedCostRatioPct : monthFeedCostRatioPct) <= 50
                        ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    }`}>
                      {feedTimeframe === 'today' ? feedCostRatioPct : monthFeedCostRatioPct}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
                  {/* Total Feed Cost */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                    <span className="text-[11px] text-slate-300 block mb-1">
                      {feedTimeframe === 'today' ? 'إجمالي تكلفة العلف اليوم' : 'إجمالي تكلفة العلف الشهرية'}
                    </span>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-xl font-black text-amber-300">
                        {(feedTimeframe === 'today' ? totalFeedCostToday : totalFeedCostMonth).toLocaleString('ar-SA')}
                      </span>
                      <span className="text-[10px] text-slate-300">ر.ي</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      يعادل {(feedTimeframe === 'today' ? totalFeedKgToday : totalFeedKgMonth).toLocaleString('ar-SA')} كغم ({(feedTimeframe === 'today' ? totalFeedBagsToday : totalFeedBagsMonth)} كيس)
                    </span>
                  </div>

                  {/* Estimated Gross Revenue */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                    <span className="text-[11px] text-slate-300 block mb-1">
                      {feedTimeframe === 'today' ? 'العائد التقديري للإنتاج اليوم' : 'إجمالي عائد الإنتاج والمبيعات'}
                    </span>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-xl font-black text-emerald-300">
                        {(feedTimeframe === 'today' ? totalDailyEstimatedGrossRevenue : totalMonthEstimatedGrossRevenue).toLocaleString('ar-SA')}
                      </span>
                      <span className="text-[10px] text-slate-300">ر.ي</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {feedTimeframe === 'today'
                        ? `إنتاج: ${todayNetEggs} بيضة (${Math.round((todayNetEggs / 30) * 10) / 10} طبق)`
                        : `مبيعات مسجلة: ${monthRevenue.toLocaleString('ar-SA')} ر.ي`}
                    </span>
                  </div>

                  {/* Feed Net Margin */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                    <span className="text-[11px] text-slate-300 block mb-1">
                      {feedTimeframe === 'today' ? 'هامش ربح العلف اليومي' : 'هامش ربح العلف الشهري'}
                    </span>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className={`text-xl font-black ${
                        (feedTimeframe === 'today' ? dailyFeedMargin : monthFeedMargin) >= 0 ? 'text-teal-300' : 'text-rose-300'
                      }`}>
                        {(feedTimeframe === 'today' ? dailyFeedMargin : monthFeedMargin).toLocaleString('ar-SA')}
                      </span>
                      <span className="text-[10px] text-slate-300">ر.ي</span>
                    </div>
                    <span className="text-[10px] text-emerald-300/80 mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                      {(feedTimeframe === 'today' ? dailyFeedMargin : monthFeedMargin) >= 0 ? 'عائد إيجابي بعد تكلفة العلف' : 'تكلفة العلف تفوق الإيراد الحالي'}
                    </span>
                  </div>

                  {/* Flock Total Fed */}
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                    <span className="text-[11px] text-slate-300 block mb-1">إجمالي القطيع المتغذّي</span>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-xl font-black text-white">
                        {(p1ChicksCount + totalGrowerBirds + totalLayingHens).toLocaleString('ar-SA')}
                      </span>
                      <span className="text-[10px] text-slate-300">طائر/صوص</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      بياض: {totalLayingHens} | نامي/لحم: {totalGrowerBirds} | صوص 1: {p1ChicksCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Three Feed Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Starter Feed */}
                <div className="p-5 rounded-3xl bg-amber-50/50 border border-amber-200/80 flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                          <Flame className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">علف بادي (24-27%)</h4>
                          <span className="text-[10px] font-bold text-amber-800">حضانات التدفئة (المرحلة 1)</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                        عمر 1-21 يوم
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-amber-200/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">الكمية المستهلكة:</span>
                        <span className="font-mono font-black text-amber-950 text-sm">
                          {(feedTimeframe === 'today' ? p1KgToday : p1KgMonth).toLocaleString('ar-SA')} كغم
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">ما يعادل بالأكياس:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {(feedTimeframe === 'today' ? p1BagsToday : p1BagsMonth)} كيس ({starterBagWeight} كغم)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                        <span className="text-slate-600 font-bold">التكلفة المالية:</span>
                        <span className="font-mono font-black text-amber-700 text-sm">
                          {(feedTimeframe === 'today' ? p1CostToday : p1CostMonth).toLocaleString('ar-SA')} ر.ي
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] space-y-1.5 text-slate-600 px-1">
                      <div className="flex justify-between">
                        <span>القطيع المستفيد:</span>
                        <b className="font-mono text-slate-900">{p1ChicksCount} صوص</b>
                      </div>
                      <div className="flex justify-between">
                        <span>سعر الكيس في المستودع:</span>
                        <b className="font-mono text-slate-900">{starterCostPerBag.toLocaleString('ar-SA')} ر.ي</b>
                      </div>
                      <div className="flex justify-between">
                        <span>الرصيد المتاح بالمخزن:</span>
                        <b className={`font-mono ${starterAvailableBags <= 1 ? 'text-rose-600 font-black' : 'text-slate-900'}`}>
                          {starterAvailableBags} كيس
                        </b>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/60 text-[10px] text-amber-900/80 bg-amber-100/50 p-2.5 rounded-xl">
                    💡 يعتمد معدل التحضين التدريجي (6.5 إلى 16.5 جرام/صوص/يوم حسب الأسبوع).
                  </div>
                </div>

                {/* 2. Grower Feed */}
                <div className="p-5 rounded-3xl bg-teal-50/50 border border-teal-200/80 flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                          <Wind className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">علف نامي (20-22%)</h4>
                          <span className="text-[10px] font-bold text-teal-800">تحضين مرحلة 2 + تسمين</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full">
                        عمر 22-38 يوم
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-teal-200/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">الكمية المستهلكة:</span>
                        <span className="font-mono font-black text-teal-950 text-sm">
                          {(feedTimeframe === 'today' ? growerKgToday : growerKgMonth).toLocaleString('ar-SA')} كغم
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">ما يعادل بالأكياس:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {(feedTimeframe === 'today' ? growerBagsToday : growerBagsMonth)} كيس ({growerBagWeight} كغم)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                        <span className="text-slate-600 font-bold">التكلفة المالية:</span>
                        <span className="font-mono font-black text-teal-700 text-sm">
                          {(feedTimeframe === 'today' ? growerCostToday : growerCostMonth).toLocaleString('ar-SA')} ر.ي
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] space-y-1.5 text-slate-600 px-1">
                      <div className="flex justify-between">
                        <span>القطيع المستفيد:</span>
                        <b className="font-mono text-slate-900">{totalGrowerBirds} طائر ({p2ChicksCount} صوص + {fatteningBirdsCount} لحم)</b>
                      </div>
                      <div className="flex justify-between">
                        <span>سعر الكيس في المستودع:</span>
                        <b className="font-mono text-slate-900">{growerCostPerBag.toLocaleString('ar-SA')} ر.ي</b>
                      </div>
                      <div className="flex justify-between">
                        <span>الرصيد المتاح بالمخزن:</span>
                        <b className={`font-mono ${growerAvailableBags <= 1 ? 'text-rose-600 font-black' : 'text-slate-900'}`}>
                          {growerAvailableBags} كيس
                        </b>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-teal-200/60 text-[10px] text-teal-900/80 bg-teal-100/50 p-2.5 rounded-xl">
                    💡 يغطي مرحلة الترييش والنمو السريع وطيور التسمين بمعدل 21-26 جم/طائر/يوم.
                  </div>
                </div>

                {/* 3. Layer Feed */}
                <div className="p-5 rounded-3xl bg-emerald-50/50 border border-emerald-200/80 flex flex-col justify-between space-y-4 relative overflow-hidden">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Egg className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm">علف بياض (20%)</h4>
                          <span className="text-[10px] font-bold text-emerald-800">إناث السمان البياضة</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full">
                        30 جم/طير/يوم
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-emerald-200/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">الكمية المستهلكة:</span>
                        <span className="font-mono font-black text-emerald-950 text-sm">
                          {(feedTimeframe === 'today' ? layerKgToday : layerKgMonth).toLocaleString('ar-SA')} كغم
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">ما يعادل بالأكياس:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {(feedTimeframe === 'today' ? layerBagsToday : layerBagsMonth)} كيس ({layerBagWeight} كغم)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                        <span className="text-slate-600 font-bold">التكلفة المالية:</span>
                        <span className="font-mono font-black text-emerald-700 text-sm">
                          {(feedTimeframe === 'today' ? layerCostToday : layerCostMonth).toLocaleString('ar-SA')} ر.ي
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] space-y-1.5 text-slate-600 px-1">
                      <div className="flex justify-between">
                        <span>القطيع المستفيد:</span>
                        <b className="font-mono text-slate-900">{totalLayingHens} أنثى بياضة</b>
                      </div>
                      <div className="flex justify-between">
                        <span>سعر الكيس في المستودع:</span>
                        <b className="font-mono text-slate-900">{layerCostPerBag.toLocaleString('ar-SA')} ر.ي</b>
                      </div>
                      <div className="flex justify-between">
                        <span>الرصيد المتاح بالمخزن:</span>
                        <b className={`font-mono ${layerAvailableBags <= 1 ? 'text-rose-600 font-black' : 'text-slate-900'}`}>
                          {layerAvailableBags} كيس
                        </b>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-200/60 text-[10px] text-emerald-900/80 bg-emerald-100/50 p-2.5 rounded-xl">
                    💡 معيار الإنتاج: 30 جرام لكل أنثى بياضة يومياً لضمان استقرار نسبة البيض ({generalLayingRate}%).
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0 z-10">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  إجمالي الاستهلاك {feedTimeframe === 'today' ? 'اليومي' : 'الشهري'}:{' '}
                  <b className="font-mono font-black text-slate-900">
                    {(feedTimeframe === 'today' ? totalFeedKgToday : totalFeedKgMonth).toLocaleString('ar-SA')} كغم
                  </b>{' '}
                  بتكلفة{' '}
                  <b className="font-mono font-black text-emerald-700">
                    {(feedTimeframe === 'today' ? totalFeedCostToday : totalFeedCostMonth).toLocaleString('ar-SA')} ر.ي
                  </b>
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowFeedAnalyticsModal(false);
                    onNavigate('health_feed');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Warehouse className="w-4 h-4" />
                  <span>مستودع الأعلاف والصحة</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowFeedAnalyticsModal(false);
                    onNavigate('incubation');
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Baby className="w-4 h-4" />
                  <span>إدارة التحضين والفقاسات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFeedAnalyticsModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
