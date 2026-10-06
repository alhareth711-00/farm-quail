import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { NavTab } from '../layout/Sidebar';
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
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { isManager, farmSettings } = useAuth();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Live queries from IndexedDB
  const batteries = useLiveQuery(() => db.batteries.toArray(), []);
  const tiers = useLiveQuery(() => db.tiers.toArray(), []);
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);
  const eggLogs = useLiveQuery(() => db.eggLogs.toArray(), []);
  const incubations = useLiveQuery(() => db.incubationBatches.toArray(), []);
  const invoices = useLiveQuery(() => db.invoices.toArray(), []);
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);
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
            <button
              onClick={() => onNavigate('cash_register')}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all"
            >
              <Coins className="w-4 h-4" />
              <span>مطابقة الصندوق والوردية</span>
            </button>
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
        <div className="p-5 rounded-3xl glass-card relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">إجمالي قطيع المزرعة الحي</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Bird className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {totalFlockBirds.toLocaleString('ar-SA')}
            </span>
            <span className="text-xs font-bold text-slate-400">طائر سمان</span>
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
    </div>
  );
};
