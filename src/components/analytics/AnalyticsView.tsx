import React, { useState, useMemo } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { STRICT_ARABIC_BATTERY_ORDER } from '../../types';
import type { Battery, BatteryTier, FloorRoom, DetailedMortalityRecord } from '../../types';
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
  ArrowLeftRight,
  Skull,
  Search,
  Filter,
  Info,
  HelpCircle,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { calculateFlockAgeInfo, getFlockAgeBracket } from '../../utils/birdAgeUtils';
import { useDataTable } from '../../hooks/useDataTable';
import { TierDiagnosticModal, type TierDiagnosticData } from './TierDiagnosticModal';
import { HeadToHeadCompareModal, type HeadToHeadItem } from './HeadToHeadCompareModal';
import { DailyProductionDetailModal, type DailyProductionDetailData } from './DailyProductionDetailModal';

interface AnalyticsViewProps {
  onNavigateToEggLogs?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigateToEggLogs }) => {
  const eggLogs = useLiveQuery(() => db.eggLogs.toArray(), []);
  const batteries = useLiveQuery(() => db.batteries.toArray(), []);
  const tiers = useLiveQuery(() => db.tiers.toArray(), []);
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);
  const detailedMortality = useLiveQuery(() => db.detailedMortality.toArray(), []);
  const feedConsumptions = useLiveQuery(() => db.feedConsumption.toArray(), []);
  const eggBatches = useLiveQuery(() => db.eggBatches.toArray(), []);

  // Main Analytics Tab: 'overall' | 'batteries' | 'rooms'
  const [activeTab, setActiveTab] = useState<'overall' | 'batteries' | 'rooms'>('overall');

  // Timeframe selector
  const [timeframe, setTimeframe] = useState<'7days' | '14days' | '30days'>('7days');
  const [chartViewMode, setChartViewMode] = useState<'bars' | 'curve'>('bars');

  // Diagnostic Modal State
  const [diagnosticModalData, setDiagnosticModalData] = useState<TierDiagnosticData | null>(null);

  // Daily Production Detail Modal State
  const [showDailyDetailModal, setShowDailyDetailModal] = useState<boolean>(false);

  // Head-to-Head Compare Modal State
  const [showHeadToHeadModal, setShowHeadToHeadModal] = useState<boolean>(false);

  // Today dates
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 1. Detect if today has logs and find latest recorded date
  const { latestRecordedDate, hasTodayLogs, availableDates } = useMemo(() => {
    if (!eggLogs || eggLogs.length === 0) {
      return { latestRecordedDate: todayStr, hasTodayLogs: false, availableDates: [] };
    }
    const datesWithProduction = eggLogs
      .filter((l) => l.actualEggs > 0)
      .map((l) => l.collectionDate);
    const uniqueDates = Array.from(new Set(datesWithProduction)).sort();
    const latest = uniqueDates[uniqueDates.length - 1] || todayStr;
    const todayRecorded = eggLogs.some((l) => l.collectionDate === todayStr && l.actualEggs > 0);
    return {
      latestRecordedDate: latest,
      hasTodayLogs: todayRecorded,
      availableDates: uniqueDates.reverse(),
    };
  }, [eggLogs, todayStr]);

  // Target Analysis Date (default to latest completed day if today is empty, or today if logged)
  const [targetDate, setTargetDate] = useState<string>('');
  const [chartAnchorDate, setChartAnchorDate] = useState<string>('');

  // Sync targetDate and chartAnchorDate when data loads if not already set
  React.useEffect(() => {
    if (!targetDate) {
      const defaultDate = hasTodayLogs ? todayStr : latestRecordedDate;
      setTargetDate(defaultDate);
      if (!chartAnchorDate) {
        setChartAnchorDate(defaultDate);
      }
    }
  }, [hasTodayLogs, latestRecordedDate, todayStr, targetDate, chartAnchorDate]);

  const activeAnalysisDate = targetDate || (hasTodayLogs ? todayStr : latestRecordedDate);

  // Compute previous day relative to activeAnalysisDate
  const prevDate = useMemo(() => {
    const d = new Date(activeAnalysisDate);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, [activeAnalysisDate]);

  // Formatted labels for dates
  const activeDateObj = new Date(activeAnalysisDate);
  const activeDateLabel = activeDateObj.toLocaleDateString('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const isAnalyzingToday = activeAnalysisDate === todayStr;

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

  // Build daily data series for the chart anchored at chartAnchorDate
  const daysCount = timeframe === '7days' ? 7 : timeframe === '14days' ? 14 : 30;

  const pastDates: string[] = useMemo(() => {
    const dates: string[] = [];
    const effectiveAnchor = chartAnchorDate || activeAnalysisDate || todayStr;
    const baseDate = new Date(effectiveAnchor);
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [chartAnchorDate, activeAnalysisDate, todayStr, daysCount]);

  // Select day and adjust chart anchor window if outside current view
  const handleSelectDay = (dateStr: string) => {
    setTargetDate(dateStr);
    if (pastDates.length > 0) {
      const minDate = pastDates[0];
      const maxDate = pastDates[pastDates.length - 1];
      if (dateStr < minDate) {
        // Shift window backward to include date
        const d = new Date(dateStr);
        d.setDate(d.getDate() + daysCount - 1);
        const newAnchor = d.toISOString().split('T')[0];
        setChartAnchorDate(newAnchor > todayStr ? todayStr : newAnchor);
      } else if (dateStr > maxDate) {
        setChartAnchorDate(dateStr > todayStr ? todayStr : dateStr);
      }
    }
  };

  // Step day backward / forward
  const stepDay = (delta: number) => {
    const d = new Date(activeAnalysisDate);
    d.setDate(d.getDate() + delta);
    const nextDateStr = d.toISOString().split('T')[0];
    if (nextDateStr > todayStr) return;
    handleSelectDay(nextDateStr);
  };

  const handleJumpToLatest = () => {
    const latest = hasTodayLogs ? todayStr : latestRecordedDate;
    setTargetDate(latest);
    setChartAnchorDate(latest);
  };

  const canGoNext = activeAnalysisDate < todayStr;
  const canGoPrev = availableDates.length > 0 && activeAnalysisDate > availableDates[availableDates.length - 1];

  // Keyboard navigation support: Left/Right arrows
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowRight') {
        stepDay(-1); // Back in time (RTL right)
      } else if (e.key === 'ArrowLeft') {
        stepDay(1); // Forward in time (RTL left)
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAnalysisDate, todayStr]);

  const seriesData = useMemo(() => {
    return pastDates.map((dateStr) => {
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
  }, [pastDates, eggLogs]);

  // Active target date stats vs its previous day
  const activeDayData = useMemo(() => {
    const logsOnDate = eggLogs?.filter((l) => l.collectionDate === activeAnalysisDate) || [];
    const batteryEggs = logsOnDate
      .filter((l) => l.targetType === 'tier')
      .reduce((acc, l) => acc + l.actualEggs, 0);
    const roomEggs = logsOnDate
      .filter((l) => l.targetType === 'room' || l.targetType === 'quarantine')
      .reduce((acc, l) => acc + l.actualEggs, 0);
    const brokenEggs = logsOnDate.reduce((acc, l) => acc + (l.brokenEggs || 0), 0);
    const totalEggs = batteryEggs + roomEggs;
    const netMarketable = Math.max(0, totalEggs - brokenEggs);

    return {
      totalEggs,
      netMarketable,
      brokenEggs,
      batteryEggs,
      roomEggs,
    };
  }, [eggLogs, activeAnalysisDate]);

  const prevDayData = useMemo(() => {
    const logsOnDate = eggLogs?.filter((l) => l.collectionDate === prevDate) || [];
    const batteryEggs = logsOnDate
      .filter((l) => l.targetType === 'tier')
      .reduce((acc, l) => acc + l.actualEggs, 0);
    const roomEggs = logsOnDate
      .filter((l) => l.targetType === 'room' || l.targetType === 'quarantine')
      .reduce((acc, l) => acc + l.actualEggs, 0);
    const brokenEggs = logsOnDate.reduce((acc, l) => acc + (l.brokenEggs || 0), 0);
    const totalEggs = batteryEggs + roomEggs;
    const netMarketable = Math.max(0, totalEggs - brokenEggs);

    return {
      totalEggs,
      netMarketable,
      brokenEggs,
      batteryEggs,
      roomEggs,
    };
  }, [eggLogs, prevDate]);

  // Previous days average (excluding active day)
  const previousDays = seriesData.slice(0, Math.max(0, seriesData.length - 1));
  const avgPreviousEggs =
    previousDays.length > 0
      ? Math.round(previousDays.reduce((a, b) => a + b.totalEggs, 0) / previousDays.length)
      : 0;

  // Day-over-day changes percentage
  const calcChange = (curr: number, prev: number) => {
    if (!prev || prev === 0) return 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const totalChangePct = calcChange(activeDayData.totalEggs, prevDayData.totalEggs);
  const batteryChangePct = calcChange(activeDayData.batteryEggs, prevDayData.batteryEggs);
  const roomChangePct = calcChange(activeDayData.roomEggs, prevDayData.roomEggs);

  // Detailed statistics and breakdown for the active day deep-dive inspector
  const activeDayDetails: DailyProductionDetailData = useMemo(() => {
    const logsOnDate = eggLogs?.filter((l) => l.collectionDate === activeAnalysisDate) || [];
    const hasLogs = logsOnDate.length > 0 && logsOnDate.some((l) => l.actualEggs > 0);

    const dObj = new Date(activeAnalysisDate);
    const dayName = dObj.toLocaleDateString('ar-SA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const times = Array.from(new Set(logsOnDate.map((l) => l.collectionTime).filter(Boolean)));
    const sessions = Array.from(new Set(logsOnDate.map((l) => l.session).filter(Boolean)));
    const collectors = Array.from(new Set(logsOnDate.map((l) => l.recordedBy).filter(Boolean)));
    const primaryTime = times[0] || '17:30';

    const withElapsed = logsOnDate.filter((l) => l.elapsedHoursFromLastCollection > 0);
    const elapsedHours =
      withElapsed.length > 0
        ? Math.round(
            (withElapsed.reduce((a, b) => a + b.elapsedHoursFromLastCollection, 0) / withElapsed.length) * 10
          ) / 10
        : 24;

    const normalized24hYield = Math.round(
      logsOnDate.reduce((acc, l) => acc + (l.normalized24hYield || l.actualEggs), 0)
    );

    const hasIntervalWarning = logsOnDate.some((l) => l.hasIntervalWarning);
    const intervalWarningReason = logsOnDate.find((l) => l.warningReason)?.warningReason;

    const batteryEggs = logsOnDate
      .filter((l) => l.targetType === 'tier')
      .reduce((acc, l) => acc + l.actualEggs, 0);
    const roomEggs = logsOnDate
      .filter((l) => l.targetType === 'room' || l.targetType === 'quarantine')
      .reduce((acc, l) => acc + l.actualEggs, 0);
    const grossEggs = batteryEggs + roomEggs;
    const brokenEggs = logsOnDate.reduce((acc, l) => acc + (l.brokenEggs || 0), 0);
    const netMarketableEggs = Math.max(0, grossEggs - brokenEggs);
    const brokenRatePct = grossEggs > 0 ? Math.round((brokenEggs / grossEggs) * 1000) / 10 : 0;

    const batchesOnDate = eggBatches?.filter((b) => b.productionDate === activeAnalysisDate) || [];
    const batchCages = batchesOnDate.reduce((acc, b) => acc + b.initialCagesCount, 0);
    const logTrays = logsOnDate.reduce((acc, l) => acc + (l.packagedTraysCount || 0), 0);
    const packagedTraysCount =
      batchCages > 0 ? batchCages : logTrays > 0 ? logTrays : Math.floor(netMarketableEggs / 18);
    const traySize = 18;
    const looseEggsRemaining = Math.max(0, netMarketableEggs - packagedTraysCount * traySize);

    const totalFemales = tiers?.reduce((acc, t) => acc + t.femalesCount, 0) || 0;
    const overallLayingRate = totalFemales > 0 ? Math.round((grossEggs / totalFemales) * 100) : 0;

    const prevLogs = eggLogs?.filter((l) => l.collectionDate === prevDate) || [];
    const prevGross = prevLogs.reduce((acc, l) => acc + l.actualEggs, 0);
    const prevBroken = prevLogs.reduce((acc, l) => acc + (l.brokenEggs || 0), 0);
    const prevNet = Math.max(0, prevGross - prevBroken);
    const dayChangePct = calcChange(grossEggs, prevGross);

    const batteryPercentages = grossEggs > 0 ? Math.round((batteryEggs / grossEggs) * 100) : 0;
    const roomPercentages = grossEggs > 0 ? Math.round((roomEggs / grossEggs) * 100) : 0;

    const batSummary = sortedBatteries.map((bat) => {
      const batTiers = tiers?.filter((t) => t.batteryId === bat.id) || [];
      const bFemales = batTiers.reduce((acc, t) => acc + t.femalesCount, 0);
      const bLogs = logsOnDate.filter((l) => batTiers.some((t) => t.id === l.targetId));
      const bEggs = bLogs.reduce((acc, l) => acc + l.actualEggs, 0);
      const bRate = bFemales > 0 ? Math.round((bEggs / bFemales) * 100) : 0;
      const tierBreakdown = batTiers.map((t) => {
        const tLog = bLogs.find((l) => l.targetId === t.id);
        const tEggs = tLog ? tLog.actualEggs : 0;
        const tRate = t.femalesCount > 0 ? Math.round((tEggs / t.femalesCount) * 100) : 0;
        return { tierNumber: t.tierNumber, eggs: tEggs, rate: tRate };
      });
      return {
        batteryId: bat.id,
        batteryName: bat.name,
        totalEggs: bEggs,
        femalesCount: bFemales,
        layingRate: bRate,
        tiers: tierBreakdown,
      };
    });

    const maxBatEggs = Math.max(...batSummary.map((b) => b.totalEggs), 0);
    const batteriesSummary = batSummary.map((b) => ({
      ...b,
      isTopPerformer: maxBatEggs > 0 && b.totalEggs === maxBatEggs,
    }));

    const rSummary = (rooms || []).map((r) => {
      const rLog = logsOnDate.find((l) => l.targetId === r.id);
      const eggs = rLog ? rLog.actualEggs : 0;
      return {
        roomId: r.id,
        roomName: r.name,
        eggs,
        birdsCount: (r.malesCount + r.femalesCount) || 0,
      };
    });

    const mortRecords = detailedMortality?.filter((m) => m.date === activeAnalysisDate) || [];
    const mortCount = mortRecords.reduce((acc, m) => acc + m.quantity, 0);

    const feedRecords = feedConsumptions?.filter((f) => f.date === activeAnalysisDate) || [];
    const feedKg = feedRecords.reduce((acc, f) => acc + f.kgUsed, 0);
    const feedBags = feedRecords.reduce((acc, f) => acc + f.bagsUsed, 0);
    const feedGramsPerEgg = grossEggs > 0 && feedKg > 0 ? Math.round((feedKg * 1000) / grossEggs) : 0;

    const notesList = Array.from(new Set(logsOnDate.map((l) => l.notes).filter(Boolean))) as string[];

    return {
      date: activeAnalysisDate,
      dayName,
      isToday: activeAnalysisDate === todayStr,
      hasLogs,
      primaryCollectionTime: primaryTime,
      sessions,
      collectors,
      elapsedHours,
      normalized24hYield,
      hasIntervalWarning,
      intervalWarningReason,
      grossEggs,
      netMarketableEggs,
      brokenEggs,
      brokenRatePct,
      packagedTraysCount,
      looseEggsRemaining,
      traySize,
      overallLayingRate,
      prevDate,
      prevGrossEggs: prevGross,
      prevNetEggs: prevNet,
      dayChangePct,
      batteryEggs,
      roomEggs,
      batteryPercentage: batteryPercentages,
      roomPercentage: roomPercentages,
      batteriesSummary,
      roomsSummary: rSummary,
      mortalityCount: mortCount,
      mortalityRecords: mortRecords,
      feedUsedKg: feedKg,
      feedUsedBags: feedBags,
      feedGramsPerEgg,
      notes: notesList,
    };
  }, [
    activeAnalysisDate,
    eggLogs,
    todayStr,
    prevDate,
    eggBatches,
    tiers,
    sortedBatteries,
    rooms,
    detailedMortality,
    feedConsumptions,
  ]);

  // Drop detection (> 15% drop compared to previous average)
  const isSuddenDrop =
    avgPreviousEggs > 20 &&
    activeDayData.totalEggs > 0 &&
    activeDayData.totalEggs < avgPreviousEggs * 0.85;

  const dropPercent =
    avgPreviousEggs > 0
      ? Math.round(((avgPreviousEggs - activeDayData.totalEggs) / avgPreviousEggs) * 100)
      : 0;

  // Chart max calculation
  const rawMax = Math.max(...seriesData.map((d) => d.totalEggs), 100);
  const chartMax = Math.ceil(rawMax / 50) * 50;
  const yAxisTicks = [
    chartMax,
    Math.round(chartMax * 0.75),
    Math.round(chartMax * 0.5),
    Math.round(chartMax * 0.25),
    0,
  ];

  // ==========================================
  // TAB 2 DATA: Battery Cages Performance & Tiers Analysis
  // ==========================================
  const batteryStats = useMemo(() => {
    if (!sortedBatteries || !tiers || !eggLogs) return [];

    const activeTierLogs = eggLogs.filter(
      (l) => l.collectionDate === activeAnalysisDate && l.targetType === 'tier'
    );
    const prevTierLogs = eggLogs.filter(
      (l) => l.collectionDate === prevDate && l.targetType === 'tier'
    );

    return sortedBatteries.map((bat) => {
      const batTiers = tiers
        .filter((t) => t.batteryId === bat.id)
        .sort((a, b) => a.tierNumber - b.tierNumber);
      const totalFemales = batTiers.reduce((acc, t) => acc + t.femalesCount, 0);
      const totalBirds = batTiers.reduce((acc, t) => acc + t.malesCount + t.femalesCount, 0);

      // Active day's eggs for this battery
      const batActiveLogs = activeTierLogs.filter((l) => batTiers.some((t) => t.id === l.targetId));
      const todayEggs = batActiveLogs.reduce((acc, l) => acc + l.actualEggs, 0);

      // Previous day's eggs
      const batPrevLogs = prevTierLogs.filter((l) => batTiers.some((t) => t.id === l.targetId));
      const yesterdayEggs = batPrevLogs.reduce((acc, l) => acc + l.actualEggs, 0);

      const changePct = calcChange(todayEggs, yesterdayEggs);
      const layingRate = totalFemales > 0 ? Math.round((todayEggs / totalFemales) * 100) : 0;

      // Tier Breakdown for this battery
      const tierDetails = batTiers.map((t) => {
        const tLog = batActiveLogs.find((l) => l.targetId === t.id);
        const tEggs = tLog ? tLog.actualEggs : 0;
        const prevTLog = batPrevLogs.find((l) => l.targetId === t.id);
        const tPrevEggs = prevTLog ? prevTLog.actualEggs : 0;
        const tChangePct = calcChange(tEggs, tPrevEggs);

        const tRate = t.femalesCount > 0 ? Math.round((tEggs / t.femalesCount) * 100) : 0;
        const tAgeInfo = calculateFlockAgeInfo({
          housingDate: t.housingDate,
          initialAgeWeeks: t.initialAgeWeeks,
          targetLifespanWeeks: t.targetLayingLifespanWeeks,
          purpose: 'layers',
        });

        // Recent mortality in this tier
        const tierMortalities =
          detailedMortality?.filter(
            (m) =>
              m.locationType === 'battery' &&
              m.batteryName === bat.name &&
              m.tierNumber === t.tierNumber
          ) || [];

        const totalTierMortality = tierMortalities.reduce((acc, m) => acc + m.quantity, 0);

        return {
          tierId: t.id,
          tier: t,
          tierNumber: t.tierNumber,
          eggs: tEggs,
          yesterdayEggs: tPrevEggs,
          changePct: tChangePct,
          females: t.femalesCount,
          males: t.malesCount,
          rate: tRate,
          ageInfo: tAgeInfo,
          mortalityCount: totalTierMortality,
          recentMortalities: tierMortalities,
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
  }, [sortedBatteries, tiers, eggLogs, detailedMortality, activeAnalysisDate, prevDate]);

  // Overall tier vertical efficiency (الدور 1 مقابل 2 مقابل 3 مقابل 4)
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

  // Best battery on active date
  const bestBattery = useMemo(() => {
    return [...batteryStats].sort((a, b) => b.todayEggs - a.todayEggs)[0];
  }, [batteryStats]);

  // CRITICAL TIER EARLY WARNING RADAR (رادار رصد هبوط الأدوار والنافق)
  const criticalTierAlerts = useMemo(() => {
    const alerts: {
      battery: Battery;
      tierNumber: number;
      tierDetail: (typeof batteryStats)[0]['tierDetails'][0];
      reason: string;
      severity: 'critical' | 'warning';
    }[] = [];

    batteryStats.forEach((bat) => {
      bat.tierDetails.forEach((td) => {
        // Condition 1: Drop > 15% from yesterday
        if (td.yesterdayEggs > 10 && td.changePct <= -18) {
          alerts.push({
            battery: bat.battery,
            tierNumber: td.tierNumber,
            tierDetail: td,
            reason: `هبوط حاد في إنتاج البيض بنسبة ${Math.abs(td.changePct)}% عن اليوم السابق`,
            severity: 'critical',
          });
        }
        // Condition 2: Has mortality and lower laying rate
        else if (td.mortalityCount > 0 && td.rate < 60) {
          alerts.push({
            battery: bat.battery,
            tierNumber: td.tierNumber,
            tierDetail: td,
            reason: `تزامن انخفاض البياض (${td.rate}%) مع تسجيل نافق (${td.mortalityCount} طائر)`,
            severity: 'critical',
          });
        }
        // Condition 3: Significant anomaly compared to other tiers in the same battery
        else if (bat.layingRate >= 68 && td.rate < 50 && td.females > 0) {
          alerts.push({
            battery: bat.battery,
            tierNumber: td.tierNumber,
            tierDetail: td,
            reason: `شذوذ موضعي: بياض الدور (${td.rate}%) أقل بكثير من متوسط بطاريته (${bat.layingRate}%)`,
            severity: 'warning',
          });
        }
      });
    });

    return alerts;
  }, [batteryStats]);

  // ==========================================
  // TAB 3 DATA: Floor Rooms Performance
  // ==========================================
  const roomStats = useMemo(() => {
    if (!rooms || !eggLogs) return [];

    const activeRoomLogs = eggLogs.filter(
      (l) => l.collectionDate === activeAnalysisDate && l.targetType !== 'tier'
    );
    const prevRoomLogs = eggLogs.filter(
      (l) => l.collectionDate === prevDate && l.targetType !== 'tier'
    );

    return rooms.map((room) => {
      const totalBirds = room.malesCount + room.femalesCount;
      const isLayers = room.purpose === 'layers';

      const todayLog = activeRoomLogs.find((l) => l.targetId === room.id);
      const prevLog = prevRoomLogs.find((l) => l.targetId === room.id);

      const todayEggs = todayLog ? todayLog.actualEggs : 0;
      const yesterdayEggs = prevLog ? prevLog.actualEggs : 0;

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
  }, [rooms, eggLogs, activeAnalysisDate, prevDate]);

  // ==========================================
  // Comparative Analytics: Egg Production by Flock Age Groups
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

      // Arabic plural formatting helper
      const formatGroupCount = (count: number) => {
        if (count === 1) return 'دور / عنبر واحد';
        if (count === 2) return 'دوران / عنبران';
        if (count >= 3 && count <= 10) return `${count} أدوار / عنابر`;
        return `${count} دوراً / عنبراً`;
      };

      return {
        ...b,
        groupsCount,
        groupsCountText: formatGroupCount(groupsCount),
        totalFemales,
        totalEggs,
        actualRate: rate,
        culledCount,
        matchingGroups,
      };
    });
  }, [batteryStats, roomStats]);

  // Handler to open Tier Diagnostic Modal
  const handleOpenTierDiagnostic = (
    battery: Battery,
    tierDetail: (typeof batteryStats)[0]['tierDetails'][0]
  ) => {
    // Generate 7-day history for this specific tier
    const historyDates: string[] = [];
    const baseDate = new Date(activeAnalysisDate);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      historyDates.push(d.toISOString().split('T')[0]);
    }

    const tierHistory = historyDates.map((dStr) => {
      const dObj = new Date(dStr);
      const lbl = dObj.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
      const tLog = eggLogs?.find(
        (l) => l.collectionDate === dStr && l.targetId === tierDetail.tierId
      );
      const eCount = tLog ? tLog.actualEggs : 0;
      const rVal =
        tierDetail.females > 0 ? Math.round((eCount / tierDetail.females) * 100) : 0;
      return {
        date: dStr,
        label: lbl,
        eggs: eCount,
        rate: rVal,
      };
    });

    // Sibling tiers in this battery
    const batItem = batteryStats.find((b) => b.battery.id === battery.id);
    const siblings =
      batItem?.tierDetails.map((td) => ({
        tierNumber: td.tierNumber,
        eggs: td.eggs,
        rate: td.rate,
        females: td.females,
        isCurrent: td.tierNumber === tierDetail.tierNumber,
      })) || [];

    setDiagnosticModalData({
      battery,
      tier: tierDetail.tier,
      targetDate: activeAnalysisDate,
      todayEggs: tierDetail.eggs,
      yesterdayEggs: tierDetail.yesterdayEggs,
      changePct: tierDetail.changePct,
      layingRate: tierDetail.rate,
      totalFemales: tierDetail.females,
      totalMales: tierDetail.males,
      ageWeeks: tierDetail.ageInfo.ageWeeks,
      isEndOfCycle: tierDetail.ageInfo.isEndOfCycle,
      historyDays: tierHistory,
      siblingTiers: siblings,
      recentMortalities: tierDetail.recentMortalities,
    });
  };

  // Prepare head-to-head items
  const headToHeadItems: HeadToHeadItem[] = useMemo(() => {
    const list: HeadToHeadItem[] = [];

    // Add Batteries
    batteryStats.forEach((bat) => {
      list.push({
        id: `bat-${bat.battery.id}`,
        name: `بطارية (${bat.battery.name})`,
        type: 'battery',
        todayEggs: bat.todayEggs,
        yesterdayEggs: bat.yesterdayEggs,
        changePct: bat.changePct,
        layingRate: bat.layingRate,
        totalBirds: bat.totalBirds,
        femalesCount: bat.totalFemales,
        details: '12 شبكاً - 4 أدوار',
      });
    });

    // Add Rooms
    roomStats
      .filter((r) => r.isLayers)
      .forEach((rs) => {
        list.push({
          id: `room-${rs.room.id}`,
          name: rs.room.name,
          type: 'room',
          todayEggs: rs.todayEggs,
          yesterdayEggs: rs.yesterdayEggs,
          changePct: rs.changePct,
          layingRate: rs.rate,
          totalBirds: rs.totalBirds,
          femalesCount: rs.room.femalesCount,
          details: 'عنبر تربية أرضية',
        });
      });

    return list;
  }, [batteryStats, roomStats]);

  // Sorting for Batteries Table using useDataTable
  const { sortedData: sortedBatteryTable, SortHeader: BatSortHeader } = useDataTable(
    batteryStats,
    {
      initialKey: 'name',
      initialDirection: 'asc',
      getters: {
        name: (b) => b.battery.name,
        totalBirds: (b) => b.totalBirds,
        todayEggs: (b) => b.todayEggs,
        yesterdayEggs: (b) => b.yesterdayEggs,
        changePct: (b) => b.changePct,
        layingRate: (b) => b.layingRate,
        tier1: (b) => b.tierDetails.find((t) => t.tierNumber === 1)?.eggs || 0,
        tier2: (b) => b.tierDetails.find((t) => t.tierNumber === 2)?.eggs || 0,
        tier3: (b) => b.tierDetails.find((t) => t.tierNumber === 3)?.eggs || 0,
        tier4: (b) => b.tierDetails.find((t) => t.tierNumber === 4)?.eggs || 0,
      },
    }
  );

  // Sorting for Rooms Table using useDataTable
  const { sortedData: sortedRoomTable, SortHeader: RoomSortHeader } = useDataTable(
    roomStats,
    {
      initialKey: 'name',
      initialDirection: 'asc',
      getters: {
        name: (r) => r.room.name,
        purpose: (r) => r.room.purpose,
        ageDays: (r) => r.ageDays,
        totalBirds: (r) => r.totalBirds,
        todayEggs: (r) => r.todayEggs,
        yesterdayEggs: (r) => r.yesterdayEggs,
        changePct: (r) => r.changePct,
        rate: (r) => r.rate,
      },
    }
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn font-almarai text-right">
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
            مقارنات دقيقة لإنتاج البيض اليومي، رادار كشف تدهور الأدوار والنافق، وتشخيص فوري للمشاكل الموضعية.
          </p>
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Head-to-Head Compare Button */}
          <button
            onClick={() => setShowHeadToHeadModal(true)}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
            title="المقارنة الميدانية المباشرة بين أي حظيرتين أو بطاريتين"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>مقارنة مباشرة (Head-to-Head)</span>
          </button>

          {/* Timeframe selector */}
          <div className="p-1 rounded-2xl bg-white border border-slate-200 flex shadow-sm">
            <button
              onClick={() => setTimeframe('7days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === '7days' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => setTimeframe('14days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === '14days' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              آخر 14 يوماً
            </button>
            <button
              onClick={() => setTimeframe('30days')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === '30days' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              آخر 30 يوماً
            </button>
          </div>
        </div>
      </div>

      {/* Smart Date Reference Bar (حل مشكلة الصفر والإنذارات الوهمية) */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-300">يوم التحليل النشط:</span>
              <span className="font-black text-emerald-400 font-mono text-sm">
                {activeAnalysisDate} ({activeDateLabel})
              </span>
              {isAnalyzingToday ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  اليوم (مباشر)
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  آخر يوم مسجل مكتمل
                </span>
              )}
            </div>
            {!hasTodayLogs && (
              <p className="text-[11px] text-slate-300 mt-0.5">
                💡 لم يُسجل إنتاج اليوم بعد (بانتظار جمع الوجبة المسائية). يعرض التحليل حالياً أداء آخر يوم مكتمل لمنع المقارنات الصفرية الوهمية.
              </p>
            )}
          </div>
        </div>

        {/* Date Selector Quick Dropdown & Stepping Arrows */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Day Stepping Arrows */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => stepDay(-1)}
              disabled={!canGoPrev}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 text-xs font-bold"
              title="اليوم السابق (سهم لليمين)"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">السابق</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-700 mx-1" />
            <button
              onClick={() => stepDay(1)}
              disabled={!canGoNext}
              className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 text-xs font-bold"
              title="اليوم التالي (سهم لليسار)"
            >
              <span className="hidden sm:inline text-[11px]">التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[11px] text-slate-400">تغيير تاريخ التحليل:</span>
          <select
            value={activeAnalysisDate}
            onChange={(e) => handleSelectDay(e.target.value)}
            className="p-1.5 rounded-xl bg-slate-800 border border-slate-600 text-xs font-mono font-bold text-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {hasTodayLogs && <option value={todayStr}>اليوم: {todayStr} (مكتمل)</option>}
            {!hasTodayLogs && <option value={todayStr}>اليوم: {todayStr} (قيد الانتظار)</option>}
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d} {d === latestRecordedDate ? '★ (آخر تسجيل)' : ''}
              </option>
            ))}
          </select>
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
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all relative ${
            activeTab === 'batteries'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15 translate-y-[-1px]'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>تحليل إنتاج الشبوك/البطاريات (أ - س)</span>
          {criticalTierAlerts.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono font-black animate-pulse">
              {criticalTierAlerts.length}
            </span>
          )}
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
                    <span>إنذار مبكر: رصد هبوط مفاجئ في إنتاج البيض ({dropPercent}%)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-extrabold">
                      يتطلب التدخل
                    </span>
                  </div>
                  <div className="text-xs text-rose-900 mt-1 leading-relaxed">
                    إنتاج اليوم المحلل ({activeDayData.totalEggs} بيضة) أقل من المعدل الأسبوعي ({avgPreviousEggs} بيضة). يرجى مراجعة checklist الفحص السريع أدناه لتدارك المشاكل البيئية أو الصحية قبل تفاقمها.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">
                  استقرار منحنى الإنتاج: متوسط إنتاج المزرعة متوازن ومطابق للمعايير القياسية.
                </span>
              </div>
              <div className="text-xs text-emerald-800 font-mono font-bold flex items-center gap-3">
                <span>المتوسط الأسبوعي: {avgPreviousEggs} بيضة/يوم</span>
                <span className="text-slate-400">|</span>
                <span>المقارنة مع: {prevDate}</span>
              </div>
            </div>
          )}

          {/* Real-time Counters Grid with Day-over-Day Trends */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Day Total Net */}
            <div className="p-5 rounded-3xl glass-card border border-emerald-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600">إجمالي إنتاج اليوم المحلل (الصافي)</span>
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
                {activeDayData.netMarketable.toLocaleString('ar-SA')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>
                  مقارنة باليوم السابق: <b className="font-mono">{prevDayData.netMarketable} بيضة</b>
                </span>
                <span className="text-[10px] text-rose-600 font-mono font-bold">
                  (مكسر: {activeDayData.brokenEggs} بيضة)
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
                {activeDayData.batteryEggs.toLocaleString('ar-SA')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>
                  نسبة المساهمة:{' '}
                  <b className="font-mono">
                    {activeDayData.totalEggs > 0
                      ? Math.round((activeDayData.batteryEggs / activeDayData.totalEggs) * 100)
                      : 0}
                    %
                  </b>
                </span>
                <span className="text-[10px] text-slate-400">اليوم السابق: {prevDayData.batteryEggs}</span>
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
                {activeDayData.roomEggs.toLocaleString('ar-SA')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>
                  نسبة المساهمة:{' '}
                  <b className="font-mono">
                    {activeDayData.totalEggs > 0
                      ? Math.round((activeDayData.roomEggs / activeDayData.totalEggs) * 100)
                      : 0}
                    %
                  </b>
                </span>
                <span className="text-[10px] text-slate-400">اليوم السابق: {prevDayData.roomEggs}</span>
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
                    تتبع أداء الحظائر يومياً مع المقارنة البصرية المباشرة والتنقل السلس
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Column Navigation Stepping Arrows (أسهم التنقل بين الأعمدة البيانية) */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    onClick={() => stepDay(-1)}
                    disabled={!canGoPrev}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-white text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 text-xs font-bold shadow-2xs"
                    title="اليوم السابق (سهم لليمين)"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                    <span>اليوم السابق</span>
                  </button>

                  <span className="px-2.5 py-1 rounded-xl bg-white text-slate-900 font-mono font-black text-xs shadow-xs border border-slate-200/60">
                    {activeAnalysisDate}
                  </span>

                  <button
                    onClick={() => stepDay(1)}
                    disabled={!canGoNext}
                    className="px-2.5 py-1.5 rounded-xl hover:bg-white text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 text-xs font-bold shadow-2xs"
                    title="اليوم التالي (سهم لليسار)"
                  >
                    <span>اليوم التالي</span>
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>

                  <button
                    onClick={handleJumpToLatest}
                    className="px-2 py-1 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-black transition-all"
                    title="الانتقال إلى أحدث يوم مسجل"
                  >
                    أحدث يوم ⚡
                  </button>
                </div>

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

                  {/* Benchmark Average Line (خط متوسط الفترة) */}
                  {avgPreviousEggs > 0 && (
                    <div
                      className="absolute w-full border-t-2 border-dashed border-amber-400/80 z-20 pointer-events-none flex items-center justify-end px-2"
                      style={{
                        top: `${Math.max(5, Math.min(95, 100 - (avgPreviousEggs / chartMax) * 100))}%`,
                      }}
                    >
                      <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md shadow-2xs border border-amber-300">
                        متوسط الفترة: {avgPreviousEggs} بيضة
                      </span>
                    </div>
                  )}

                  {/* Bars Flex Track */}
                  <div className="absolute inset-0 flex items-end justify-between gap-1 sm:gap-3 px-6 z-10">
                    {seriesData.map((item, idx) => {
                      const chartTrackHeight = 190;
                      const totalPx = Math.round((item.totalEggs / chartMax) * chartTrackHeight);
                      const roomPx = Math.round((item.roomEggs / chartMax) * chartTrackHeight);
                      const batteryPx = Math.round((item.batteryEggs / chartMax) * chartTrackHeight);
                      const isActiveDate = item.date === activeAnalysisDate;

                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectDay(item.date)}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                        >
                          {/* Active Indicator Arrow / Badge */}
                          {isActiveDate && (
                            <div className="absolute -top-7 text-[9px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-xs animate-bounce flex items-center gap-0.5 z-30 pointer-events-none">
                              <span>▼ المحدد</span>
                            </div>
                          )}

                          {/* Tooltip on hover */}
                          <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 backdrop-blur-sm text-white text-[11px] p-2.5 rounded-2xl pointer-events-none whitespace-nowrap z-40 shadow-apple font-mono text-right border border-slate-700">
                            <div className="font-bold text-slate-200">
                              {item.date} ({item.label})
                            </div>
                            <div className="text-emerald-400 font-black">
                              الإجمالي: {item.totalEggs.toLocaleString('ar-SA')} بيضة (صافي:{' '}
                              {item.netMarketable})
                            </div>
                            <div className="text-[10px] text-slate-300 flex items-center justify-between gap-2 mt-0.5">
                              <span>أقفاص: {item.batteryEggs}</span>
                              <span>غرف: {item.roomEggs}</span>
                              {item.brokenEggs > 0 && (
                                <span className="text-rose-400">مكسر: {item.brokenEggs}</span>
                              )}
                            </div>
                          </div>

                          {/* Value on top of bar */}
                          <div
                            className={`text-[11px] font-mono font-black text-center mb-1.5 transition-all group-hover:scale-110 ${
                              isActiveDate ? 'text-emerald-700 scale-105' : 'text-slate-700'
                            }`}
                          >
                            {item.totalEggs > 0 ? item.totalEggs : '0'}
                          </div>

                          {/* Stacked Bar with guaranteed pixel height */}
                          <div
                            className={`w-full max-w-[40px] sm:max-w-[48px] rounded-t-xl overflow-hidden shadow-xs flex flex-col justify-end transition-all duration-300 group-hover:shadow-md ${
                              isActiveDate ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
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
                            {totalPx === 0 && <div className="w-full bg-slate-300 h-[3px]" />}
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
                      onClick={() => handleSelectDay(item.date)}
                      className={`flex-1 text-center truncate text-[11px] font-bold cursor-pointer transition-colors hover:text-emerald-700 ${
                        item.date === activeAnalysisDate
                          ? 'text-emerald-700 font-black'
                          : 'text-slate-600'
                      }`}
                    >
                      <div>{item.label}</div>
                      {item.date === activeAnalysisDate && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold inline-block mt-0.5">
                          {item.date === todayStr ? 'اليوم' : 'المحدد'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* View Mode 2: Smooth SVG Curve (منحنى بياني انسيابي تفاعلي) */}
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

                  {/* Benchmark Average Line in Curve Mode */}
                  {avgPreviousEggs > 0 && (
                    <div
                      className="absolute w-full border-t-2 border-dashed border-amber-400/80 z-20 pointer-events-none flex items-center justify-end px-2"
                      style={{
                        top: `${Math.max(5, Math.min(95, 100 - (avgPreviousEggs / chartMax) * 100))}%`,
                      }}
                    >
                      <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md shadow-2xs border border-amber-300">
                        متوسط الفترة: {avgPreviousEggs} بيضة
                      </span>
                    </div>
                  )}

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
                    const totalPoints = seriesData
                      .map((d, i) => `${getX(i)},${getY(d.totalEggs)}`)
                      .join(' ');
                    const batteryPoints = seriesData
                      .map((d, i) => `${getX(i)},${getY(d.batteryEggs)}`)
                      .join(' ');
                    const roomPoints = seriesData
                      .map((d, i) => `${getX(i)},${getY(d.roomEggs)}`)
                      .join(' ');

                    // Area paths (closed polygon)
                    const areaTotal = `M ${getX(0)},${svgH - padY} L ${seriesData
                      .map((d, i) => `${getX(i)},${getY(d.totalEggs)}`)
                      .join(' L ')} L ${getX(n - 1)},${svgH - padY} Z`;

                    return (
                      <svg
                        viewBox={`0 0 ${svgW} ${svgH}`}
                        className="w-full h-full overflow-visible z-10 relative"
                      >
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

                        {/* Smooth lines */}
                        <polyline
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={totalPoints}
                        />
                        <polyline
                          fill="none"
                          stroke="#0ea5e9"
                          strokeWidth="2.5"
                          strokeDasharray="4 4"
                          strokeLinecap="round"
                          points={roomPoints}
                        />
                        <polyline
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2"
                          strokeLinecap="round"
                          points={batteryPoints}
                        />

                        {/* Interactive Data point dots */}
                        {seriesData.map((d, i) => {
                          const cx = getX(i);
                          const cy = getY(d.totalEggs);
                          const isTarget = d.date === activeAnalysisDate;
                          return (
                            <g
                              key={i}
                              className="cursor-pointer group"
                              onClick={() => handleSelectDay(d.date)}
                            >
                              {/* Invisible larger hit circle */}
                              <circle cx={cx} cy={cy} r={16} fill="transparent" />

                              {/* Active Pulse Ring */}
                              {isTarget && (
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={9}
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="2"
                                  strokeDasharray="2 2"
                                  className="animate-spin"
                                />
                              )}

                              <circle
                                cx={cx}
                                cy={cy}
                                r={isTarget ? 6 : 4}
                                className={
                                  isTarget
                                    ? 'fill-white stroke-emerald-600 stroke-[3]'
                                    : 'fill-emerald-600 group-hover:scale-125 transition-transform'
                                }
                              />

                              {/* Value Label on top */}
                              <text
                                x={cx}
                                y={cy - 10}
                                textAnchor="middle"
                                className={`text-[10px] font-mono font-bold ${
                                  isTarget
                                    ? 'fill-emerald-800 font-black'
                                    : 'fill-slate-600 group-hover:fill-emerald-700'
                                }`}
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
                      onClick={() => handleSelectDay(item.date)}
                      className={`flex-1 text-center truncate text-[11px] font-bold cursor-pointer transition-colors hover:text-emerald-700 ${
                        item.date === activeAnalysisDate
                          ? 'text-emerald-700 font-black'
                          : 'text-slate-600'
                      }`}
                    >
                      <div>{item.label}</div>
                      {item.date === activeAnalysisDate && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold inline-block mt-0.5">
                          {item.date === todayStr ? 'اليوم' : 'المحدد'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* INLINE COMPREHENSIVE DAILY PRODUCTION DEEP-DIVE INSPECTOR       */}
          {/* ============================================================== */}
          <div className="p-6 rounded-3xl glass-panel border-2 border-emerald-500/30 bg-gradient-to-b from-white to-emerald-50/20 shadow-xs space-y-5 animate-fadeIn">
            {/* Top Inspector Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <Egg className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-slate-900">
                      كشف وتفاصيل إنتاج يوم: {activeDayDetails.dayName}
                    </h3>
                    <span className="font-mono text-xs font-bold bg-white text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {activeDayDetails.date}
                    </span>
                    {activeDayDetails.isToday && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                        اليوم
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    بيانات جمع البيض، الساعات الفعلية، الجودة، وتوزيع الإنتاج بين البطاريات والغرف لهذا اليوم المختار.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Quick Step Day Arrows */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => stepDay(-1)}
                    disabled={!canGoPrev}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 text-xs font-bold"
                    title="اليوم السابق"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-[11px]">السابق</span>
                  </button>
                  <div className="w-[1px] h-4 bg-slate-300 mx-1" />
                  <button
                    onClick={() => stepDay(1)}
                    disabled={!canGoNext}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 text-xs font-bold"
                    title="اليوم التالي"
                  >
                    <span className="text-[11px]">التالي</span>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Button: Open Detailed Modal */}
                <button
                  onClick={() => setShowDailyDetailModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>عرض التقرير الكامل في نافذة مكبرة</span>
                </button>

                {/* Button: Jump to Egg Production Log */}
                {onNavigateToEggLogs && (
                  <button
                    onClick={onNavigateToEggLogs}
                    className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>سجل البيض المعياري</span>
                  </button>
                )}
              </div>
            </div>

            {/* Content: If today has no logs yet vs has logs */}
            {!activeDayDetails.hasLogs ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <Clock className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-700">لم يتم تسجيل وجبة إنتاج لهذا اليوم بعد</h4>
                <p className="text-xs text-slate-500">
                  بانتظار جمع الوجبة المسائية. يمكنك النقر على أي من الأعمدة البيانية السابقة بالأعلى لرؤية تفاصيلها الكاملة.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 4 Cards Row: Time/Shift, Net Production, Quality/Broken, Packaging/Trays */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Card 1: Time & Shift */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span>وقت الجمع والوجبة</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                        {activeDayDetails.sessions.length > 0 ? (activeDayDetails.sessions[0] === 'evening' ? 'مسائي' : 'صباحي') : 'مسائي'}
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-slate-900 pt-1">
                      {activeDayDetails.primaryCollectionTime}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>الفارق الزمني: <b className="font-mono">{activeDayDetails.elapsedHours} س</b></span>
                      <span>المعياري: <b className="font-mono text-emerald-700">{activeDayDetails.normalized24hYield}</b></span>
                    </div>
                  </div>

                  {/* Card 2: Production Net */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Egg className="w-4 h-4 text-emerald-600" />
                        <span>إنتاج اليوم (الصافي)</span>
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        activeDayDetails.dayChangePct >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        {activeDayDetails.dayChangePct >= 0 ? `+${activeDayDetails.dayChangePct}%` : `${activeDayDetails.dayChangePct}%`}
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-emerald-800 pt-1">
                      {activeDayDetails.netMarketableEggs.toLocaleString('ar-SA')} <span className="text-xs font-normal text-slate-400">بيضة</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>إجمالي المجموع: <b className="font-mono">{activeDayDetails.grossEggs}</b></span>
                      <span>نسبة البياض: <b className="font-mono">{activeDayDetails.overallLayingRate}%</b></span>
                    </div>
                  </div>

                  {/* Card 3: Quality & Broken Eggs */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>البيض المكسور والتالف</span>
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        activeDayDetails.brokenRatePct <= 2 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        {activeDayDetails.brokenRatePct}%
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-rose-700 pt-1">
                      {activeDayDetails.brokenEggs} <span className="text-xs font-normal text-slate-400">بيضة</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>حالة الكسر: <b>{activeDayDetails.brokenRatePct <= 2 ? 'طبيعي وممتاز ✓' : 'مرتفع يتطلب فحص ⚠️'}</b></span>
                    </div>
                  </div>

                  {/* Card 4: Packaged Trays */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-teal-600" />
                        <span>تقفيص الأطباق وتجهيزها</span>
                      </span>
                      <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md">
                        طبق 18 بيضة
                      </span>
                    </div>
                    <div className="text-2xl font-black font-mono text-teal-800 pt-1">
                      {activeDayDetails.packagedTraysCount} <span className="text-xs font-normal text-slate-400">طبق</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                      <span>متبقي فوارغ: <b className="font-mono">{activeDayDetails.looseEggsRemaining} بيضة</b></span>
                      <span>جاهزة للمتجر ✓</span>
                    </div>
                  </div>
                </div>

                {/* Batteries and Rooms Contribution Breakdown */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Grid className="w-4 h-4 text-emerald-600" />
                      <span>تفصيل إنتاج البطاريات والغرف لهذا اليوم:</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-700 font-bold">الشبوك/البطاريات: {activeDayDetails.batteryEggs} بيضة ({activeDayDetails.batteryPercentage}%)</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-sky-700 font-bold">الغرف الأرضية: {activeDayDetails.roomEggs} بيضة ({activeDayDetails.roomPercentage}%)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {activeDayDetails.batteriesSummary.slice(0, 6).map((bat) => (
                      <div
                        key={bat.batteryId}
                        className={`p-2.5 rounded-xl border text-xs ${
                          bat.isTopPerformer
                            ? 'border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-400'
                            : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>{bat.batteryName}</span>
                          {bat.isTopPerformer && <span className="text-amber-500 text-[10px]" title="الأعلى إنتاجاً اليوم">👑</span>}
                        </div>
                        <div className="text-base font-black font-mono text-emerald-800 mt-0.5">
                          {bat.totalEggs} <span className="text-[10px] font-normal text-slate-400">بيضة</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          بياض: {bat.layingRate}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health & Operational Feed / Mortality row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Mortality */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skull className="w-4 h-4 text-rose-500" />
                      <span className="font-bold text-slate-700">النافق المسجل في هذا اليوم:</span>
                    </div>
                    <div className="font-bold">
                      {activeDayDetails.mortalityCount > 0 ? (
                        <span className="text-rose-700 font-mono">+{activeDayDetails.mortalityCount} طيور</span>
                      ) : (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 0 نافق (ممتاز)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Feed */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-slate-700">استهلاك العلف اليومي:</span>
                    </div>
                    <div className="font-bold font-mono text-slate-800">
                      {activeDayDetails.feedUsedKg > 0 ? (
                        <span>{activeDayDetails.feedUsedKg} كغم ({activeDayDetails.feedGramsPerEgg} غرام/بيضة)</span>
                      ) : (
                        <span className="text-slate-400 font-normal">لم يسجل صرف علف اليوم</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Comparative Age Benchmarks (Age-Based Production Benchmarks) */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    مقارنة معدل إنتاج البيض حسب الفئات العمرية للقطيع (Age-Based Production Benchmarks)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    تتبع أداء المجموعات في كل مرحلة عمرية، مقارنتها بالمعيار القياسي، ومتابعة جاهزية الطيور للتحويل للبيع لاحم.
                  </span>
                </div>
              </div>

              <span className="text-xs text-slate-400 font-mono font-bold bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                دورة البياض الاقتصادية للسمان: 42 أسبوعاً (حوالي 10 إلى 11 شهراً)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ageBracketAnalysis.map((bracket) => (
                <div
                  key={bracket.id}
                  className={`p-4 rounded-2xl border ${bracket.bgCardClass} flex flex-col justify-between space-y-3 transition-all hover:shadow-xs`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bracket.badgeClass}`}>
                        {bracket.title}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight mb-2">
                      {bracket.description}
                    </p>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-bold">معدل البياض الفعلي:</span>
                        <span className="font-black font-mono text-sm text-slate-900">
                          {bracket.actualRate}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${bracket.progressBarClass} rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(100, bracket.actualRate)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>المعيار القياسي:</span>
                        <span className="font-mono font-bold text-slate-600">{bracket.expectedRate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] font-mono text-slate-600">
                    <span className="font-almarai font-bold text-slate-700">{bracket.groupsCountText}</span>
                    <span className="font-black text-slate-900">{bracket.totalEggs} بيضة</span>
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
          {/* Critical Tier Radar Banner (رادار كشف تدهور الأدوار والنافق) */}
          {criticalTierAlerts.length > 0 ? (
            <div className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm">
                      رادار الإنذار المبكر: رصد ({criticalTierAlerts.length}) أدوار تتطلب الانتباه والتدخل الميداني!
                    </h4>
                    <p className="text-[11px] text-rose-800">
                      تم رصد هبوط مفاجئ أو شذوذ مقارنة بالأدوار المجاورة أو تسجيل نافق موضعي. انقر على أي دور لفحصه وتشخيصه فوراً:
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {criticalTierAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleOpenTierDiagnostic(alert.battery, alert.tierDetail)}
                    className="p-3 rounded-2xl bg-white border border-rose-200 hover:border-rose-400 hover:shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3 group"
                  >
                    <div>
                      <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center font-mono text-[10px]">
                          {alert.battery.name}
                        </span>
                        <span>
                          بطارية ({alert.battery.name}) - الدور {alert.tierNumber}
                        </span>
                      </div>
                      <p className="text-[10px] text-rose-700 font-bold mt-1 line-clamp-1">
                        {alert.reason}
                      </p>
                    </div>

                    <button className="px-2.5 py-1 rounded-xl bg-rose-100 group-hover:bg-rose-600 group-hover:text-white text-rose-800 text-[10px] font-black shrink-0 transition-colors flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />
                      <span>فحص</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-3xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>رادار الأدوار: كافة أدوار البطاريات الـ 48 تعمل بكفاءة مستقرة دون شذوذ أو انخفاضات حرجة.</span>
              </div>
              <span className="text-[11px] text-emerald-800 font-mono">12 بطارية (أ - س) مستقرة</span>
            </div>
          )}

          {/* Summary KPIs for Battery Cages */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي إنتاج الشبوك اليوم</span>
              <div className="text-3xl font-black font-mono text-emerald-800">
                {activeDayData.batteryEggs.toLocaleString('ar-SA')}{' '}
                <span className="text-xs font-normal">بيضة</span>
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
                <span>أعلى بطارية إنتاجاً</span>
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
                    <span className="font-bold text-slate-900">
                      {vt.eggs} بيضة ({vt.rate}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strict Arabic Alphabetical Performance Table (أ إلى س) with DataTable Sorting */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Grid className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    كشف الأداء اليومي المفصل لكل بطارية وأدوارها الأربعة (انقر على أي دور للفحص والتشخيص)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    يمكنك النقر على أي رأس عمود لترتيب البطاريات تصاعدياً أو تنازلياً
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                تاريخ الكشف: {activeAnalysisDate}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
                    <BatSortHeader field="name" align="right">البطارية (أ-س)</BatSortHeader>
                    <BatSortHeader field="totalBirds">إجمالي الطيور</BatSortHeader>
                    <BatSortHeader field="todayEggs">إنتاج المحلل</BatSortHeader>
                    <BatSortHeader field="yesterdayEggs">اليوم السابق</BatSortHeader>
                    <BatSortHeader field="changePct">التغير اليومي</BatSortHeader>
                    <BatSortHeader field="layingRate">معدل البياض</BatSortHeader>
                    <BatSortHeader field="tier1" className="bg-emerald-50/50">الدور 1 (العلوي)</BatSortHeader>
                    <BatSortHeader field="tier2">الدور 2</BatSortHeader>
                    <BatSortHeader field="tier3" className="bg-slate-50">الدور 3</BatSortHeader>
                    <BatSortHeader field="tier4" className="bg-emerald-50/50">الدور 4 (السفلي)</BatSortHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-center font-mono">
                  {sortedBatteryTable.map((item) => (
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

                      {/* Tier breakdowns clickable cells */}
                      {item.tierDetails.map((td) => {
                        const hasTierDrop = td.changePct <= -18 && td.yesterdayEggs > 5;
                        const hasMortality = td.mortalityCount > 0;

                        return (
                          <td
                            key={td.tierNumber}
                            onClick={() => handleOpenTierDiagnostic(item.battery, td)}
                            title="انقر لفحص وتشخيص أداء هذا الدور وسجل وفياته وتاريخه"
                            className={`p-2.5 cursor-pointer transition-all hover:bg-emerald-100/60 relative ${
                              hasTierDrop ? 'bg-rose-50/80 ring-1 ring-rose-300' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="font-bold text-slate-800 text-xs">{td.eggs}</span>
                              {hasMortality && (
                                <span className="text-[10px] text-rose-600 font-bold" title={`نافق: ${td.mortalityCount}`}>
                                  💀{td.mortalityCount}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              ({td.rate}%)
                            </span>
                            <div className="mt-1 flex flex-col items-center">
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${td.ageInfo.badgeBgClass} ${td.ageInfo.badgeTextClass}`}
                              >
                                {td.ageInfo.ageWeeks} أسبوع
                              </span>
                              {td.ageInfo.isEndOfCycle ? (
                                <span className="text-[8px] text-rose-700 font-black flex items-center gap-0.5 mt-0.5">
                                  <Flame className="w-2.5 h-2.5" /> جاهز لاحم
                                </span>
                              ) : (
                                <span className="text-[8px] text-slate-400 font-bold mt-0.5">
                                  متبقي {td.ageInfo.remainingWeeks} أسبوع
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
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
                {activeDayData.roomEggs.toLocaleString('ar-SA')}{' '}
                <span className="text-xs font-normal">بيضة</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                من 7 غرف تربية أرضية + قسم المعزولات
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block mb-1">معدل التغير عن اليوم السابق</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black font-mono text-slate-900">
                  {roomChangePct >= 0 ? `+${roomChangePct}%` : `${roomChangePct}%`}
                </span>
                <span
                  className={`p-1.5 rounded-xl ${
                    roomChangePct >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {roomChangePct >= 0 ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                اليوم السابق: {prevDayData.roomEggs} بيضة
              </span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200">
              <span className="text-xs text-slate-500 font-bold block mb-1">غرف الأمهات البياضة النشطة</span>
              <div className="text-3xl font-black font-mono text-emerald-800">
                {roomStats.filter((r) => r.isLayers).length}{' '}
                <span className="text-xs font-normal">غرف</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                تنتج بكفاءة قياسية
              </span>
            </div>
          </div>

          {/* Rooms Table with useDataTable sorting */}
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
                    <RoomSortHeader field="name" align="right">الغرفة / القسم</RoomSortHeader>
                    <RoomSortHeader field="purpose">الغرض</RoomSortHeader>
                    <RoomSortHeader field="ageDays">العمر الحالي</RoomSortHeader>
                    <RoomSortHeader field="totalBirds">إجمالي القطيع</RoomSortHeader>
                    <RoomSortHeader field="todayEggs">إنتاج بيض المحلل</RoomSortHeader>
                    <RoomSortHeader field="yesterdayEggs">اليوم السابق</RoomSortHeader>
                    <RoomSortHeader field="changePct">التغير اليومي</RoomSortHeader>
                    <RoomSortHeader field="rate">معدل البياض</RoomSortHeader>
                    <th className="p-3 text-center">دورة القطيع وموعد البيع لاحم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-center font-mono">
                  {sortedRoomTable.map((item) => (
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

      {/* Tier Diagnostic Deep-Dive Modal */}
      <TierDiagnosticModal
        data={diagnosticModalData}
        onClose={() => setDiagnosticModalData(null)}
      />

      {/* Head-to-Head Compare Modal */}
      {showHeadToHeadModal && (
        <HeadToHeadCompareModal
          items={headToHeadItems}
          onClose={() => setShowHeadToHeadModal(false)}
        />
      )}

      {/* Daily Production Detail Modal */}
      {showDailyDetailModal && (
        <DailyProductionDetailModal
          data={activeDayDetails}
          onClose={() => setShowDailyDetailModal(false)}
          onPrevDay={() => stepDay(-1)}
          onNextDay={() => stepDay(1)}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          onNavigateToEggLogs={onNavigateToEggLogs}
        />
      )}
    </div>
  );
};

export default AnalyticsView;
