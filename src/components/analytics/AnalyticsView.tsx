import React, { useState, useMemo } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { STRICT_ARABIC_BATTERY_ORDER } from '../../types';
import {
  LineChart,
  Egg,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Grid,
  Warehouse,
  Calendar,
  Sparkles,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Package,
  Layers,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Award,
  Zap,
  Flame,
  Clock,
} from 'lucide-react';
import { calculateFlockAgeInfo, getFlockAgeBracket } from '../../utils/birdAgeUtils';

export const AnalyticsView: React.FC = () => {
  const eggLogs = useLiveQuery(() => db.eggLogs.toArray(), []);
  const batteries = useLiveQuery(() => db.batteries.toArray(), []);
  const tiers = useLiveQuery(() => db.tiers.toArray(), []);
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);

  // Main Analytics Tab: 'overall' | 'batteries' | 'rooms'
  const [activeTab, setActiveTab] = useState<'overall' | 'batteries' | 'rooms'>('overall');

  // Timeframe selector
  const [timeframe, setTimeframe] = useState<'7days' | '14days' | '30days'>('7days');
  const [chartViewMode, setChartViewMode] = useState<'bars' | 'curve'>('bars');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Strictly sorted batteries
  const sortedBatteries = useMemo(() => {
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

  // Build daily data series for the past N days
  const daysCount = timeframe === '7days' ? 7 : timeframe === '14days' ? 14 : 30;

  const pastDates: string[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    pastDates.push(d.toISOString().split('T')[0]);
  }

  const seriesData = pastDates.map((dateStr) => {
    const logsOnDate = eggLogs?.filter((l) => l.collectionDate === dateStr) || [];
    const batteryEggs = logsOnDate
      .filter((l) => l.targetType === 'tier')
      .reduce((acc, l) => acc + l.actualEggs, 0);
    const roomEggs = logsOnDate
      .filter((l) => l.targetType === 'room' || l.targetType === 'quarantine')
      .reduce((acc, l) => acc + l.actualEggs, 0);
    const brokenEggs = logsOnDate.reduce((acc, l) => acc + (l.brokenEggs || 0), 0);
    const totalEggs = batteryEggs + roomEggs;
    const netMarketable = Math.max(0, totalEggs - brokenEggs);

    const dayObj = new Date(dateStr);
    const label = dayObj.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });

    return {
      date: dateStr,
      label,
      totalEggs,
      netMarketable,
      brokenEggs,
      batteryEggs,
      roomEggs,
    };
  });

  // Calculate average of previous days (excluding today)
  const previousDays = seriesData.slice(0, seriesData.length - 1);
  const avgPreviousEggs =
    previousDays.length > 0
      ? Math.round(previousDays.reduce((a, b) => a + b.totalEggs, 0) / previousDays.length)
      : 0;

  const todayData = seriesData[seriesData.length - 1] || {
    totalEggs: 0,
    netMarketable: 0,
    brokenEggs: 0,
    batteryEggs: 0,
    roomEggs: 0,
  };
  const yesterdayData = seriesData[seriesData.length - 2] || {
    totalEggs: 0,
    netMarketable: 0,
    brokenEggs: 0,
    batteryEggs: 0,
    roomEggs: 0,
  };

  const todayTotalEggs = todayData.totalEggs;

  // Day-over-day changes percentage
  const calcChange = (curr: number, prev: number) => {
    if (!prev || prev === 0) return 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const totalChangePct = calcChange(todayTotalEggs, yesterdayData.totalEggs);
  const batteryChangePct = calcChange(todayData.batteryEggs, yesterdayData.batteryEggs);
  const roomChangePct = calcChange(todayData.roomEggs, yesterdayData.roomEggs);

  // Drop detection (> 15% drop compared to previous average)
  const isSuddenDrop =
    avgPreviousEggs > 20 &&
    todayTotalEggs > 0 &&
    todayTotalEggs < avgPreviousEggs * 0.85;

  const dropPercent =
    avgPreviousEggs > 0 ? Math.round(((avgPreviousEggs - todayTotalEggs) / avgPreviousEggs) * 100) : 0;

  const rawMax = Math.max(...seriesData.map((d) => d.totalEggs), 100);
  const chartMax = Math.ceil(rawMax / 50) * 50;
  const maxVal = chartMax;
  const yAxisTicks = [
    chartMax,
    Math.round(chartMax * 0.75),
    Math.round(chartMax * 0.5),
    Math.round(chartMax * 0.25),
    0,
  ];

  // ==========================================
  // Tab 2 Data: Battery Cages Performance & Tiers Analysis
  // ==========================================
  const batteryStats = useMemo(() => {
    if (!sortedBatteries || !tiers || !eggLogs) return [];

    const todayTierLogs = eggLogs.filter((l) => l.collectionDate === todayStr && l.targetType === 'tier');
    const yesterdayTierLogs = eggLogs.filter((l) => l.collectionDate === yesterdayStr && l.targetType === 'tier');

    return sortedBatteries.map((bat) => {
      const batTiers = tiers.filter((t) => t.batteryId === bat.id).sort((a, b) => a.tierNumber - b.tierNumber);
      const totalFemales = batTiers.reduce((acc, t) => acc + t.femalesCount, 0);
      const totalBirds = batTiers.reduce((acc, t) => acc + t.malesCount + t.femalesCount, 0);

      // Today's eggs for this battery
      const batTodayLogs = todayTierLogs.filter((l) => batTiers.some((t) => t.id === l.targetId));
      const todayEggs = batTodayLogs.reduce((acc, l) => acc + l.actualEggs, 0);

      // Yesterday's eggs
      const batYesterdayLogs = yesterdayTierLogs.filter((l) => batTiers.some((t) => t.id === l.targetId));
      const yesterdayEggs = batYesterdayLogs.reduce((acc, l) => acc + l.actualEggs, 0);

      const changePct = calcChange(todayEggs, yesterdayEggs);
      const layingRate = totalFemales > 0 ? Math.round((todayEggs / totalFemales) * 100) : 0;

      // Tier Breakdown for this battery
      const tierDetails = batTiers.map((t) => {
        const tLog = batTodayLogs.find((l) => l.targetId === t.id);
        const tEggs = tLog ? tLog.actualEggs : 0;
        const tRate = t.femalesCount > 0 ? Math.round((tEggs / t.femalesCount) * 100) : 0;
        const tAgeInfo = calculateFlockAgeInfo({
          housingDate: t.housingDate,
          initialAgeWeeks: t.initialAgeWeeks,
          targetLifespanWeeks: t.targetLayingLifespanWeeks,
          purpose: 'layers',
        });
        return {
          tierId: t.id,
          tierNumber: t.tierNumber,
          eggs: tEggs,
          females: t.femalesCount,
          rate: tRate,
          ageInfo: tAgeInfo,
        };
      });

      return {
        battery: bat,
        totalBirds,
        totalFemales,
        todayEggs,
        yesterdayEggs,
        changePct,
        layingRate,
        tierDetails,
      };
    });
  }, [sortedBatteries, tiers, eggLogs, todayStr, yesterdayStr]);

  // Overall tier vertical efficiency (الدور 1 مقابل 2 مقابل 3 مقابل 4 على مستوى كافة البطاريات)
  const verticalTierEfficiency = useMemo(() => {
    const tierSums: Record<number, { eggs: number; females: number }> = {
      1: { eggs: 0, females: 0 },
      2: { eggs: 0, females: 0 },
      3: { eggs: 0, females: 0 },
      4: { eggs: 0, females: 0 },
    };

    batteryStats.forEach((bat) => {
      bat.tierDetails.forEach((td) => {
        if (tierSums[td.tierNumber]) {
          tierSums[td.tierNumber].eggs += td.eggs;
          tierSums[td.tierNumber].females += td.females;
        }
      });
    });

    return [1, 2, 3, 4].map((num) => {
      const data = tierSums[num];
      const rate = data.females > 0 ? Math.round((data.eggs / data.females) * 100) : 0;
      return {
        tierNumber: num,
        name: num === 1 ? 'الدور 1 (العلوي)' : num === 4 ? 'الدور 4 (السفلي)' : `الدور ${num}`,
        eggs: data.eggs,
        females: data.females,
        rate,
      };
    });
  }, [batteryStats]);

  // Best battery today
  const bestBattery = [...batteryStats].sort((a, b) => b.todayEggs - a.todayEggs)[0];

  // ==========================================
  // Tab 3 Data: Floor Rooms Independent Performance
  // ==========================================
  const roomStats = useMemo(() => {
    if (!rooms || !eggLogs) return [];

    const todayRoomLogs = eggLogs.filter((l) => l.collectionDate === todayStr && l.targetType !== 'tier');
    const yesterdayRoomLogs = eggLogs.filter((l) => l.collectionDate === yesterdayStr && l.targetType !== 'tier');

    return rooms.map((room) => {
      const totalBirds = room.malesCount + room.femalesCount;
      const isLayers = room.purpose === 'layers';

      const todayLog = todayRoomLogs.find((l) => l.targetId === room.id);
      const yesterdayLog = yesterdayRoomLogs.find((l) => l.targetId === room.id);

      const todayEggs = todayLog ? todayLog.actualEggs : 0;
      const yesterdayEggs = yesterdayLog ? yesterdayLog.actualEggs : 0;

      const changePct = calcChange(todayEggs, yesterdayEggs);
      const rate = room.femalesCount > 0 ? Math.round((todayEggs / room.femalesCount) * 100) : 0;

      const roomAgeInfo = calculateFlockAgeInfo({
        hatchDate: room.hatchDate,
        housingDate: room.housingDate,
        initialAgeWeeks: room.initialAgeWeeks,
        targetLifespanWeeks: room.targetLayingLifespanWeeks,
        purpose: room.purpose,
      });

      return {
        room,
        totalBirds,
        todayEggs,
        yesterdayEggs,
        changePct,
        rate,
        isLayers,
        ageDays: roomAgeInfo.ageDays,
        ageWeeks: roomAgeInfo.ageWeeks,
        ageInfo: roomAgeInfo,
      };
    });
  }, [rooms, eggLogs, todayStr, yesterdayStr]);

  // ==========================================
  // Comparative Analytics: Egg Production by Flock Age Groups
  // مقارنة معدل إنتاج البيض حسب الفئات العمرية للقطيع
  // ==========================================
  const ageBracketAnalysis = useMemo(() => {
    const brackets = [
      {
        id: 'onset',
        title: 'تبشير وبداية بياض (6 - 10 أسابيع)',
        expectedRate: '50 - 65%',
        expectedMin: 50,
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
        progressBarClass: 'bg-teal-500',
        bgCardClass: 'bg-teal-50/40 border-teal-200',
        description: 'مرحلة بدء النضج الجنسي ووضع أولى البيضات للسمان',
      },
      {
        id: 'peak',
        title: 'قمة الإنتاج والذروة (11 - 24 أسبوع)',
        expectedRate: '75 - 88%',
        expectedMin: 75,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        progressBarClass: 'bg-emerald-500',
        bgCardClass: 'bg-emerald-50/40 border-emerald-200',
        description: 'أعلى معدل وضع للبيض وأقصى كفاءة اقتصادية مستمرة',
      },
      {
        id: 'stable',
        title: 'إنتاج مستقر ومنتظم (25 - 36 أسبوع)',
        expectedRate: '65 - 75%',
        expectedMin: 65,
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
        progressBarClass: 'bg-sky-500',
        bgCardClass: 'bg-sky-50/40 border-sky-200',
        description: 'معدل إنتاج بيض ثابت ومستقر مع تماسك قشرة البيض',
      },
      {
        id: 'late_culled',
        title: 'أواخر الإنتاج والتنسيق (37+ أسبوع)',
        expectedRate: '40 - 58%',
        expectedMin: 40,
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        progressBarClass: 'bg-amber-500',
        bgCardClass: 'bg-amber-50/40 border-amber-200',
        description: 'انخفاض البياض الطبيعي ونهاية الدورة للتحويل للبيع لاحم',
      },
    ];

    interface LayerGroupItem {
      name: string;
      females: number;
      todayEggs: number;
      ageWeeks: number;
      isEndOfCycle: boolean;
      remainingWeeks: number;
    }

    const layerGroups: LayerGroupItem[] = [];

    // Add Battery Tiers
    batteryStats.forEach((bat) => {
      bat.tierDetails.forEach((td) => {
        if (td.females > 0) {
          layerGroups.push({
            name: `بطارية ${bat.battery.name} - الدور ${td.tierNumber}`,
            females: td.females,
            todayEggs: td.eggs,
            ageWeeks: td.ageInfo.ageWeeks,
            isEndOfCycle: td.ageInfo.isEndOfCycle,
            remainingWeeks: td.ageInfo.remainingWeeks,
          });
        }
      });
    });

    // Add Floor Layer Rooms
    roomStats
      .filter((r) => r.isLayers && r.room.femalesCount > 0)
      .forEach((rs) => {
        layerGroups.push({
          name: rs.room.name,
          females: rs.room.femalesCount,
          todayEggs: rs.todayEggs,
          ageWeeks: rs.ageInfo.ageWeeks,
          isEndOfCycle: rs.ageInfo.isEndOfCycle,
          remainingWeeks: rs.ageInfo.remainingWeeks,
        });
      });

    return brackets.map((b) => {
      const matchingGroups = layerGroups.filter((g) => {
        const bracket = getFlockAgeBracket(g.ageWeeks);
        return bracket.id === b.id;
      });

      const groupsCount = matchingGroups.length;
      const totalFemales = matchingGroups.reduce((acc, g) => acc + g.females, 0);
      const totalEggs = matchingGroups.reduce((acc, g) => acc + g.todayEggs, 0);
      const rate = totalFemales > 0 ? Math.round((totalEggs / totalFemales) * 100) : 0;
      const culledCount = matchingGroups.filter((g) => g.isEndOfCycle).length;

      return {
        ...b,
        groupsCount,
        totalFemales,
        totalEggs,
        actualRate: rate,
        culledCount,
        matchingGroups,
      };
    });
  }, [batteryStats, roomStats]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LineChart className="w-6 h-6 text-emerald-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              التحليلات والمقارنات والإنذار المبكر (Production Analytics)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تبويبات تحليلية متخصصة للشبوك والغرف والإنتاج الكلي العام، كشف الهبوط المفاجئ، ومقارنات التغير اليومي.
          </p>
        </div>

        {/* Timeframe pills */}
        <div className="p-1 rounded-2xl bg-white border border-slate-200 flex shadow-sm">
          <button
            onClick={() => setTimeframe('7days')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === '7days' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            آخر 7 أيام
          </button>
          <button
            onClick={() => setTimeframe('14days')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === '14days' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            آخر 14 يوماً
          </button>
          <button
            onClick={() => setTimeframe('30days')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeframe === '30days' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
            }`}
          >
            آخر 30 يوماً
          </button>
        </div>
      </div>

      {/* Modular Analytics Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('overall')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'overall'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/15 translate-y-[-1px]'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>الإنتاج الكلي العام والمقارنات</span>
        </button>

        <button
          onClick={() => setActiveTab('batteries')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'batteries'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15 translate-y-[-1px]'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>تحليل إنتاج الشبوك/البطاريات (أ - س)</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all ${
            activeTab === 'rooms'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/15 translate-y-[-1px]'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>تحليل إنتاج الغرف الأرضية (1 إلى 7)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERALL COMBINED PRODUCTION ANALYTICS                  */}
      {/* ============================================================== */}
      {activeTab === 'overall' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Sudden Drop Alert Banner if detected */}
          {isSuddenDrop ? (
            <div className="p-5 rounded-3xl bg-rose-500/10 border-2 border-rose-300 text-rose-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-pulse">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-rose-600 text-white shrink-0 shadow-sm mt-0.5">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-black text-sm flex items-center gap-2">
                    <span>إنذار مبكر: رصد هبوط مفاجئ في إنتاج البيض اليوم ({dropPercent}%)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-extrabold">
                      يتطلب التدخل
                    </span>
                  </div>
                  <div className="text-xs text-rose-900 mt-1 leading-relaxed">
                    إنتاج اليوم ({todayTotalEggs} بيضة) أقل من المعدل الأسبوعي ({avgPreviousEggs} بيضة). يرجى مراجعة checklist الفحص السريع أدناه لتدارك المشاكل البيئية أو الصحية قبل تفاقمها.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">
                  استقرار منحنى الإنتاج: متوسط إنتاج المزرعة متوازن ومطابق للمعايير القياسية.
                </span>
              </div>
              <span className="text-xs text-emerald-800 font-mono font-bold">
                المتوسط الأسبوعي: {avgPreviousEggs} بيضة/يوم
              </span>
            </div>
          )}

          {/* Real-time Counters Grid with Day-over-Day Trends */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Today Total Net */}
            <div className="p-5 rounded-3xl glass-card border border-emerald-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600">إجمالي إنتاج اليوم الصافي</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                      totalChangePct >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {totalChangePct >= 0 ? (
                      <TrendingUp className="w-3 h-3 stroke-[3]" />
                    ) : (
                      <TrendingDown className="w-3 h-3 stroke-[3]" />
                    )}
                    <span>{totalChangePct >= 0 ? `+${totalChangePct}% صعود` : `${totalChangePct}% هبوط`}</span>
                  </span>
                  <Egg className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {todayData.netMarketable.toLocaleString('ar-SA')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>مقارنة بالأمس: <b className="font-mono">{yesterdayData.netMarketable} بيضة</b></span>
                <span className="text-[10px] text-rose-600 font-mono font-bold">
                  (مكسر: {todayData.brokenEggs} بيضة)
                </span>
              </div>
            </div>

            {/* Battery Cages Contribution */}
            <div className="p-5 rounded-3xl glass-card border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600">عنبر أقفاص البطاريات (الشبوك أ-س)</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                      batteryChangePct >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {batteryChangePct >= 0 ? (
                      <TrendingUp className="w-3 h-3 stroke-[3]" />
                    ) : (
                      <TrendingDown className="w-3 h-3 stroke-[3]" />
                    )}
                    <span>{batteryChangePct >= 0 ? `+${batteryChangePct}% صعود` : `${batteryChangePct}% هبوط`}</span>
                  </span>
                  <Grid className="w-5 h-5 text-teal-600" />
                </div>
              </div>
              <div className="text-3xl font-black text-teal-800 font-mono">
                {todayData.batteryEggs.toLocaleString('ar-SA')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>
                  نسبة المساهمة: <b className="font-mono">{todayTotalEggs > 0 ? Math.round((todayData.batteryEggs / todayTotalEggs) * 100) : 0}%</b>
                </span>
                <span className="text-[10px] text-slate-400">أمس: {yesterdayData.batteryEggs}</span>
              </div>
            </div>

            {/* Floor Rooms Contribution */}
            <div className="p-5 rounded-3xl glass-card border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600">عنبر التربية الأرضية (الغرف)</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                      roomChangePct >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {roomChangePct >= 0 ? (
                      <TrendingUp className="w-3 h-3 stroke-[3]" />
                    ) : (
                      <TrendingDown className="w-3 h-3 stroke-[3]" />
                    )}
                    <span>{roomChangePct >= 0 ? `+${roomChangePct}% صعود` : `${roomChangePct}% هبوط`}</span>
                  </span>
                  <Warehouse className="w-5 h-5 text-sky-600" />
                </div>
              </div>
              <div className="text-3xl font-black text-sky-800 font-mono">
                {todayData.roomEggs.toLocaleString('ar-SA')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>
                  نسبة المساهمة: <b className="font-mono">{todayTotalEggs > 0 ? Math.round((todayData.roomEggs / todayTotalEggs) * 100) : 0}%</b>
                </span>
                <span className="text-[10px] text-slate-400">أمس: {yesterdayData.roomEggs}</span>
              </div>
            </div>
          </div>

          {/* Interactive Chart Visualization (Stacked Bars & Smooth Curve) */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-5 bg-white shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    منحنى الإنتاج اليومي المقارن (البطاريات مقابل التربية الأرضية)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    تتبع أداء الحظائر يومياً مع المقارنة البصرية المباشرة
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Chart Mode Toggle */}
                <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex">
                  <button
                    onClick={() => setChartViewMode('bars')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      chartViewMode === 'bars'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>أعمدة بيانية</span>
                  </button>
                  <button
                    onClick={() => setChartViewMode('curve')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                      chartViewMode === 'curve'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LineChart className="w-3.5 h-3.5 text-emerald-600" />
                    <span>منحنى انسيابي</span>
                  </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-xs font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block shadow-xs" />
                    <span className="text-slate-700">البطاريات (أقفاص)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-sky-500 inline-block shadow-xs" />
                    <span className="text-slate-700">التربية الأرضية (غرف)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Mode 1: Modern Stacked Bars */}
            {chartViewMode === 'bars' && (
              <div className="pt-2 pb-2 select-none animate-fadeIn">
                <div className="relative h-[220px] w-full border-b border-slate-200">
                  {/* Y-Axis Horizontal Gridlines & Labels */}
                  {yAxisTicks.map((tick, tIdx) => {
                    const topPct = (tIdx / (yAxisTicks.length - 1)) * 100;
                    return (
                      <div
                        key={tIdx}
                        className="absolute w-full border-b border-dashed border-slate-200/80 flex items-center justify-between"
                        style={{ top: `${topPct}%` }}
                      >
                        <span className="text-[10px] font-mono font-bold text-slate-400 select-none pr-1">
                          {tick}
                        </span>
                      </div>
                    );
                  })}

                  {/* Bars Flex Track */}
                  <div className="absolute inset-0 flex items-end justify-between gap-1 sm:gap-3 px-6 z-10">
                    {seriesData.map((item, idx) => {
                      const chartTrackHeight = 190;
                      const totalPx = Math.round((item.totalEggs / chartMax) * chartTrackHeight);
                      const roomPx = Math.round((item.roomEggs / chartMax) * chartTrackHeight);
                      const batteryPx = Math.round((item.batteryEggs / chartMax) * chartTrackHeight);
                      const isToday = item.date === todayStr;

                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-[11px] p-2.5 rounded-2xl pointer-events-none whitespace-nowrap z-30 shadow-apple font-mono text-right border border-slate-700">
                            <div className="font-bold text-slate-200">{item.date} ({item.label})</div>
                            <div className="text-emerald-400 font-black">
                              الإجمالي: {item.totalEggs.toLocaleString('ar-SA')} بيضة (صافي: {item.netMarketable})
                            </div>
                            <div className="text-[10px] text-slate-300 flex items-center justify-between gap-2 mt-0.5">
                              <span>أقفاص: {item.batteryEggs}</span>
                              <span>غرف: {item.roomEggs}</span>
                              {item.brokenEggs > 0 && <span className="text-rose-400">مكسر: {item.brokenEggs}</span>}
                            </div>
                          </div>

                          {/* Value on top of bar */}
                          <div className={`text-[11px] font-mono font-black text-center mb-1.5 transition-all group-hover:scale-110 ${
                            isToday ? 'text-emerald-700 scale-105' : 'text-slate-700'
                          }`}>
                            {item.totalEggs > 0 ? item.totalEggs : '0'}
                          </div>

                          {/* Stacked Bar with guaranteed pixel height */}
                          <div
                            className={`w-full max-w-[40px] sm:max-w-[48px] rounded-t-xl overflow-hidden shadow-xs flex flex-col justify-end transition-all duration-300 group-hover:shadow-md ${
                              isToday ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
                            }`}
                            style={{ height: `${Math.max(totalPx, item.totalEggs > 0 ? 8 : 3)}px` }}
                          >
                            {/* Room Eggs Bar (Sky blue - stacked on top) */}
                            {roomPx > 0 && (
                              <div
                                className="w-full bg-sky-500 hover:bg-sky-400 transition-colors"
                                style={{ height: `${roomPx}px` }}
                                title={`غرف التربية: ${item.roomEggs}`}
                              />
                            )}
                            {/* Battery Cages Bar (Emerald green - at bottom) */}
                            {batteryPx > 0 && (
                              <div
                                className="w-full bg-emerald-600 hover:bg-emerald-500 transition-colors"
                                style={{ height: `${batteryPx}px` }}
                                title={`أقفاص البطاريات: ${item.batteryEggs}`}
                              />
                            )}
                            {/* Empty state zero line */}
                            {totalPx === 0 && (
                              <div className="w-full bg-slate-300 h-[3px]" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* X-Axis Date Labels */}
                <div className="flex justify-between items-center px-6 pt-2">
                  {seriesData.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 text-center truncate text-[11px] font-bold ${
                        item.date === todayStr ? 'text-emerald-700 font-black' : 'text-slate-600'
                      }`}
                    >
                      <div>{item.label}</div>
                      {item.date === todayStr && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold inline-block mt-0.5">
                          اليوم
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View Mode 2: Smooth SVG Curve (منحنى بياني انسيابي) */}
            {chartViewMode === 'curve' && (
              <div className="pt-2 pb-2 select-none animate-fadeIn">
                <div className="relative h-[220px] w-full border-b border-slate-200">
                  {/* Gridlines */}
                  {yAxisTicks.map((tick, tIdx) => {
                    const topPct = (tIdx / (yAxisTicks.length - 1)) * 100;
                    return (
                      <div
                        key={tIdx}
                        className="absolute w-full border-b border-dashed border-slate-200/80 flex items-center justify-between"
                        style={{ top: `${topPct}%` }}
                      >
                        <span className="text-[10px] font-mono font-bold text-slate-400 select-none pr-1">
                          {tick}
                        </span>
                      </div>
                    );
                  })}

                  {/* SVG Area & Lines */}
                  {(() => {
                    const svgW = 760;
                    const svgH = 200;
                    const padX = 40;
                    const padY = 20;
                    const plotW = svgW - padX * 2;
                    const plotH = svgH - padY * 2;
                    const n = seriesData.length;

                    // Coordinates helper
                    const getX = (i: number) => padX + (i / Math.max(n - 1, 1)) * plotW;
                    const getY = (val: number) => padY + plotH - (val / chartMax) * plotH;

                    // Path generator
                    const totalPoints = seriesData.map((d, i) => `${getX(i)},${getY(d.totalEggs)}`).join(' ');
                    const batteryPoints = seriesData.map((d, i) => `${getX(i)},${getY(d.batteryEggs)}`).join(' ');
                    const roomPoints = seriesData.map((d, i) => `${getX(i)},${getY(d.roomEggs)}`).join(' ');

                    // Area paths (closed polygon)
                    const areaTotal = `M ${getX(0)},${svgH - padY} L ${seriesData
                      .map((d, i) => `${getX(i)},${getY(d.totalEggs)}`)
                      .join(' L ')} L ${getX(n - 1)},${svgH - padY} Z`;

                    return (
                      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full overflow-visible z-10 relative">
                        <defs>
                          <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="roomGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Gradient Area under curve */}
                        <path d={areaTotal} fill="url(#totalGradient)" />

                        {/* Polyline: Room Eggs (Sky blue) */}
                        <polyline
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray="4 2"
                          points={roomPoints}
                        />

                        {/* Polyline: Total / Battery curve (Emerald green) */}
                        <polyline
                          fill="none"
                          stroke="#059669"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={totalPoints}
                        />

                        {/* Data dots */}
                        {seriesData.map((d, i) => {
                          const cx = getX(i);
                          const cyTotal = getY(d.totalEggs);
                          const isToday = d.date === todayStr;

                          return (
                            <g key={i} className="group cursor-pointer">
                              {/* Pulse circle for today */}
                              {isToday && (
                                <circle cx={cx} cy={cyTotal} r="9" className="fill-emerald-400/40 animate-ping" />
                              )}
                              <circle
                                cx={cx}
                                cy={cyTotal}
                                r={isToday ? '6' : '4.5'}
                                className="fill-white stroke-emerald-600 stroke-[3] group-hover:r-7 transition-all"
                              />
                              <text
                                x={cx}
                                y={cyTotal - 10}
                                textAnchor="middle"
                                className="text-[10px] font-mono font-black fill-slate-800"
                              >
                                {d.totalEggs}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    );
                  })()}
                </div>

                {/* X-Axis Date Labels */}
                <div className="flex justify-between items-center px-6 pt-2">
                  {seriesData.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 text-center truncate text-[11px] font-bold ${
                        item.date === todayStr ? 'text-emerald-700 font-black' : 'text-slate-600'
                      }`}
                    >
                      <div>{item.label}</div>
                      {item.date === todayStr && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold inline-block mt-0.5">
                          اليوم
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Flock Age Brackets & Laying Comparison (مقارنة معدل إنتاج البيض حسب الفئات العمرية للقطيع) */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    مقارنة معدل إنتاج البيض حسب الفئات العمرية للقطيع (Age-Based Production Benchmarks)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تتبع أداء المجموعات في كل مرحلة عمرية، مقارنتها بالمعدل القياسي، ومتابعة جاهزية الطيور للتحويل للبيع لاحم.
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-xl">
                دورة البياض الاقتصادية للسمان: 42 أسبوعاً (~10 أشهر)
              </div>
            </div>

            {/* 4 Age Brackets Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ageBracketAnalysis.map((bracket) => (
                <div
                  key={bracket.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${bracket.bgCardClass}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${bracket.badgeClass}`}>
                        {bracket.title}
                      </span>
                      {bracket.culledCount > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5" /> {bracket.culledCount} جاهزة للبيع
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 leading-snug mb-3">
                      {bracket.description}
                    </p>

                    <div className="space-y-2 bg-white/70 p-2.5 rounded-xl border border-slate-200/60 mb-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] text-slate-600 font-bold">معدل البياض الفعلي:</span>
                        <span className={`font-mono text-base font-black ${
                          bracket.actualRate >= bracket.expectedMin
                            ? 'text-emerald-700'
                            : bracket.actualRate > 0
                            ? 'text-amber-700'
                            : 'text-slate-400'
                        }`}>
                          {bracket.actualRate}%
                        </span>
                      </div>

                      {/* Progress Bar vs Expected */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${bracket.progressBarClass}`}
                          style={{ width: `${Math.min(100, bracket.actualRate)}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                        <span>المعيار القياسي:</span>
                        <span className="font-mono font-bold text-slate-700">{bracket.expectedRate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] font-mono text-slate-600">
                    <span>{bracket.groupsCount} أدوار / غرف</span>
                    <span className="font-bold text-slate-900">{bracket.totalEggs} بيضة اليوم</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnostic Checklist for sudden drops */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <h3 className="font-black text-sm text-slate-900">
                دليل الفحص والإنذار المبكر (Troubleshooting & Diagnostic Checklist)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-900 mb-1">1. خطوط مياه الشرب</div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  فحص حلمات الشرب الأوتوماتيكية للتأكد من عدم انسدادها، وانقطاع المياه حتى لساعات قليلة يسبب هبوطاً حاداً في البيض.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-900 mb-1">2. ساعات الإضاءة والتحكم</div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  التأكد من مؤقت الإضاءة (16-17 ساعة إضاءة يومياً) لتنشيط الهرمونات المبيضية في طائر السمان البياض.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-900 mb-1">3. نسبة البروتين والكالسيوم</div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  التأكد من استخدام علف بياض 20% بروتين مع كربونات الكالسيوم أو بودرة البلاط لتكوين قشرة البيض الصلبة.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="font-bold text-slate-900 mb-1">4. الإجهاد الحراري والتهوية</div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  فحص خلايا التبريد ودرجة حرارة العنبر (المثالي 21-24 مئوية) وتقديم فيتامين C ومضادات الإجهاد عند اشتداد الحرارة.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BATTERY CAGES DETAILED ANALYTICS (أ إلى س)               */}
      {/* ============================================================== */}
      {activeTab === 'batteries' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary KPIs for Battery Cages */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي إنتاج الشبوك اليوم</span>
              <div className="text-3xl font-black font-mono text-emerald-800">
                {todayData.batteryEggs.toLocaleString('ar-SA')} <span className="text-xs font-normal">بيضة</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                من 12 بطارية مسجلة (أ - س)
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block mb-1">متوسط نسبة بياض الشبوك</span>
              <div className="text-3xl font-black font-mono text-teal-700">
                {batteryStats.length > 0
                  ? Math.round(
                      batteryStats.reduce((a, b) => a + b.layingRate, 0) / batteryStats.length
                    )
                  : 0}
                %
              </div>
              <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                المعيار القياسي: 65 - 75%
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-1">
                <Award className="w-4 h-4 text-amber-500" />
                <span>أعلى بطارية إنتاجاً اليوم</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                بطارية ({bestBattery?.battery.name || 'أ'})
              </div>
              <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                {bestBattery?.todayEggs || 0} بيضة • معدل {bestBattery?.layingRate || 0}%
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block mb-1">توزيع الأدوار الرأسية</span>
              <div className="text-xs space-y-1 font-mono">
                {verticalTierEfficiency.map((vt) => (
                  <div key={vt.tierNumber} className="flex justify-between items-center">
                    <span className="text-slate-600 font-almarai">{vt.name}:</span>
                    <span className="font-bold text-slate-900">{vt.eggs} بيضة ({vt.rate}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strict Arabic Alphabetical Performance Table (أ إلى س) */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900">
                  كشف الأداء اليومي المفصل لكل بطارية وأدوارها الأربعة (مرتب هجائياً: أ إلى س)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                تحديث لحظي • تاريخ اليوم: {todayStr}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                    <th className="p-3 text-right">البطارية (أ-س)</th>
                    <th className="p-3">إجمالي الطيور</th>
                    <th className="p-3">إنتاج اليوم</th>
                    <th className="p-3">إنتاج الأمس</th>
                    <th className="p-3">التغير اليومي</th>
                    <th className="p-3">معدل البياض</th>
                    <th className="p-3 text-center bg-emerald-50/50">الدور 1 (العلوي)</th>
                    <th className="p-3 text-center">الدور 2</th>
                    <th className="p-3 text-center bg-slate-50">الدور 3</th>
                    <th className="p-3 text-center bg-emerald-50/50">الدور 4 (السفلي)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-center font-mono">
                  {batteryStats.map((item) => (
                    <tr key={item.battery.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-right font-almarai font-extrabold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                            {item.battery.name}
                          </span>
                          <span>بطارية ({item.battery.name})</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 font-bold">{item.totalBirds}</td>
                      <td className="p-3 font-black text-sm text-emerald-800">{item.todayEggs}</td>
                      <td className="p-3 text-slate-400">{item.yesterdayEggs}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center gap-0.5 ${
                            item.changePct >= 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.changePct >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          <span>{item.changePct >= 0 ? `+${item.changePct}%` : `${item.changePct}%`}</span>
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                            item.layingRate >= 65
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.layingRate >= 45
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.layingRate}%
                        </span>
                      </td>

                      {/* Tier breakdowns */}
                      {item.tierDetails.map((td) => (
                        <td key={td.tierNumber} className="p-2.5">
                          <span className="font-bold text-slate-800 text-xs">{td.eggs}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">({td.rate}%)</span>
                          <div className="mt-1 flex flex-col items-center">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${td.ageInfo.badgeBgClass} ${td.ageInfo.badgeTextClass}`}>
                              {td.ageInfo.ageWeeks} أسب
                            </span>
                            {td.ageInfo.isEndOfCycle ? (
                              <span className="text-[8px] text-rose-700 font-black flex items-center gap-0.5 mt-0.5">
                                <Flame className="w-2.5 h-2.5" /> جاهز لاحم
                              </span>
                            ) : (
                              <span className="text-[8px] text-slate-400 font-bold mt-0.5">
                                متبقي {td.ageInfo.remainingWeeks} أسب
                              </span>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: FLOOR ROOMS DETAILED INDEPENDENT ANALYTICS               */}
      {/* ============================================================== */}
      {activeTab === 'rooms' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary KPIs for Floor Rooms */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي إنتاج الغرف اليوم</span>
              <div className="text-3xl font-black font-mono text-sky-800">
                {todayData.roomEggs.toLocaleString('ar-SA')} <span className="text-xs font-normal">بيضة</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                من 7 غرف تربية أرضية + قسم المعزولات
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block mb-1">معدل التغير عن أمس</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black font-mono text-slate-900">
                  {roomChangePct >= 0 ? `+${roomChangePct}%` : `${roomChangePct}%`}
                </span>
                <span
                  className={`p-1.5 rounded-xl ${
                    roomChangePct >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {roomChangePct >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                أمس: {yesterdayData.roomEggs} بيضة
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block mb-1">غرف الأمهات البياضة النشطة</span>
              <div className="text-3xl font-black font-mono text-emerald-800">
                {roomStats.filter((r) => r.isLayers).length} <span className="text-xs font-normal">غرف</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                تنتج بكفاءة قياسية
              </span>
            </div>
          </div>

          {/* Rooms Table */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-sky-600" />
                <h3 className="font-black text-sm text-slate-900">
                  أداء غرف التربية الأرضية المستقل (غرفة 1 إلى 7 والمعزولات والملحقات)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                تتبع الأعمار ومعدلات الإنتاج
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                    <th className="p-3 text-right">الغرفة / القسم</th>
                    <th className="p-3">الغرض</th>
                    <th className="p-3">العمر الحالي</th>
                    <th className="p-3">إجمالي القطيع</th>
                    <th className="p-3">إنتاج بيض اليوم</th>
                    <th className="p-3">إنتاج الأمس</th>
                    <th className="p-3">التغير اليومي</th>
                    <th className="p-3">معدل البياض</th>
                    <th className="p-3 text-center">دورة القطيع وموعد البيع لاحم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-center font-mono">
                  {roomStats.map((item) => (
                    <tr key={item.room.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-right font-almarai font-extrabold text-slate-900">
                        {item.room.name}
                      </td>
                      <td className="p-3 font-almarai">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isLayers
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.room.purpose === 'fattening'
                              ? 'bg-amber-100 text-amber-800'
                              : item.room.purpose === 'brooding'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.isLayers
                            ? 'أمهات بياض'
                            : item.room.purpose === 'fattening'
                            ? 'تسمين لحم'
                            : item.room.purpose === 'brooding'
                            ? 'تحضين كتاكيت'
                            : 'معزولات'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-almarai">
                        {item.ageWeeks > 0 ? `${item.ageWeeks} أسبوع` : `${item.ageDays} يوم`}
                      </td>
                      <td className="p-3 font-bold text-slate-700">{item.totalBirds} طائر</td>
                      <td className="p-3 font-black text-sm text-sky-800">
                        {item.todayEggs > 0 ? item.todayEggs : '-'}
                      </td>
                      <td className="p-3 text-slate-400">
                        {item.yesterdayEggs > 0 ? item.yesterdayEggs : '-'}
                      </td>
                      <td className="p-3">
                        {item.todayEggs > 0 || item.yesterdayEggs > 0 ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center gap-0.5 ${
                              item.changePct >= 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.changePct >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            <span>{item.changePct >= 0 ? `+${item.changePct}%` : `${item.changePct}%`}</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {item.isLayers ? (
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                              item.rate >= 65
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.rate}%
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="p-3 font-almarai text-xs">
                        <div className="flex flex-col items-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${item.ageInfo.badgeBgClass} ${item.ageInfo.badgeTextClass}`}
                          >
                            {item.ageInfo.phaseLabel}
                          </span>
                          {item.ageInfo.isEndOfCycle ? (
                            <span className="text-[10px] text-rose-700 font-black flex items-center gap-1 mt-1 animate-pulse">
                              <Flame className="w-3 h-3" /> جاهزة للبيع لاحم فوراً
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-bold mt-0.5">
                              {item.room.purpose === 'fattening'
                                ? `متبقي ${item.ageInfo.remainingDays} يوم للذبح`
                                : `متبقي ${item.ageInfo.remainingWeeks} أسبوع للبيع`}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
