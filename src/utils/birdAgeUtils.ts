// ==========================================
// QUAIL FLOCK AGE & LAYING LIFECYCLE UTILITIES
// معايير وحسابات أعمار طيور السمان والتحويل للبيع لاحم
// ==========================================

import type { RoomPurpose } from '../types';

export interface FlockAgeParams {
  housingDate?: string; // YYYY-MM-DD
  hatchDate?: string; // YYYY-MM-DD
  initialAgeWeeks?: number;
  targetLifespanWeeks?: number;
  purpose?: RoomPurpose | 'layers';
}

export type LifecyclePhase =
  | 'growing' // شبابات قبل البياض
  | 'onset' // بداية التبشير
  | 'peak' // قمة الإنتاج
  | 'stable' // إنتاج مستقر
  | 'late' // أواخر الإنتاج
  | 'culled_meat'; // نهاية الدورة وجاهزة للبيع لاحم

export interface FlockAgeInfo {
  ageWeeks: number;
  ageDays: number;
  ageMonths: string;
  targetLifespanWeeks: number;
  remainingWeeks: number;
  remainingDays: number;
  progressPercent: number;
  isEndOfCycle: boolean;
  isNearEnd: boolean;
  phase: LifecyclePhase;
  phaseLabel: string;
  statusBadgeText: string;
  badgeBgClass: string;
  badgeTextClass: string;
  badgeBorderClass: string;
  // Meat Conversion Info
  meatConversionNotice: string;
}

/**
 * Calculates current flock age and laying lifecycle countdown.
 * Quail Layer Lifecycle:
 * - Onset of laying: 6-7 weeks (42-50 days)
 * - Peak production: 10-24 weeks
 * - Stable laying: 25-36 weeks
 * - Late laying: 37-41 weeks
 * - End of laying & ready for meat sale: >= 42 weeks (~10 months)
 */
export function calculateFlockAgeInfo(params: FlockAgeParams): FlockAgeInfo {
  const {
    housingDate,
    hatchDate,
    initialAgeWeeks = 6,
    targetLifespanWeeks = 42,
    purpose = 'layers',
  } = params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let ageDays = 0;
  let ageWeeks = 0;

  if (hatchDate) {
    const hatch = new Date(hatchDate);
    hatch.setHours(0, 0, 0, 0);
    const diff = Math.max(0, today.getTime() - hatch.getTime());
    ageDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    ageWeeks = Math.floor(ageDays / 7);
  } else if (housingDate) {
    const housing = new Date(housingDate);
    housing.setHours(0, 0, 0, 0);
    const diff = Math.max(0, today.getTime() - housing.getTime());
    const daysSinceHousing = Math.floor(diff / (1000 * 60 * 60 * 24));
    ageDays = initialAgeWeeks * 7 + daysSinceHousing;
    ageWeeks = Math.floor(ageDays / 7);
  } else {
    ageWeeks = Math.max(1, initialAgeWeeks);
    ageDays = ageWeeks * 7;
  }

  const ageMonths = (ageWeeks / 4.345).toFixed(1);
  const effectiveTarget = Math.max(ageWeeks, targetLifespanWeeks);
  const remainingWeeks = Math.max(0, targetLifespanWeeks - ageWeeks);
  const remainingDays = remainingWeeks * 7;
  const progressPercent = Math.min(
    100,
    Math.round((ageWeeks / Math.max(1, targetLifespanWeeks)) * 100)
  );

  const isEndOfCycle = ageWeeks >= targetLifespanWeeks;
  const isNearEnd = remainingWeeks <= 4 && !isEndOfCycle;

  // Determine Lifecycle Phase
  let phase: LifecyclePhase = 'stable';
  let phaseLabel = 'إنتاج مستقر';
  let badgeBgClass = 'bg-emerald-50';
  let badgeTextClass = 'text-emerald-800';
  let badgeBorderClass = 'border-emerald-200';
  let meatNotice = '';

  if (purpose === 'fattening') {
    // Fattening cycle: target is ~35 days (5 weeks)
    if (ageDays >= 35) {
      phase = 'culled_meat';
      phaseLabel = 'جاهز للذبح والتوزيع (لحم)';
      badgeBgClass = 'bg-rose-100';
      badgeTextClass = 'text-rose-900';
      badgeBorderClass = 'border-rose-300';
      meatNotice = 'وزن مثالي جاهز للذبح والتوزيع الفوري';
    } else {
      phase = 'growing';
      phaseLabel = `تسمين لحم (${35 - ageDays} يوم متبقي للذبح)`;
      badgeBgClass = 'bg-amber-50';
      badgeTextClass = 'text-amber-800';
      badgeBorderClass = 'border-amber-200';
      meatNotice = `متبقي ${35 - ageDays} يوماً للوصول للوزن المستهدف`;
    }
  } else if (purpose === 'brooding') {
    phase = 'growing';
    phaseLabel = 'تحضين صيصان وكتاكيت';
    badgeBgClass = 'bg-sky-50';
    badgeTextClass = 'text-sky-800';
    badgeBorderClass = 'border-sky-200';
    meatNotice = 'مرحلة رعاية أولية';
  } else {
    // Layers Lifecycle
    if (ageWeeks < 6) {
      phase = 'growing';
      phaseLabel = 'شبابات قبل البياض';
      badgeBgClass = 'bg-blue-50';
      badgeTextClass = 'text-blue-800';
      badgeBorderClass = 'border-blue-200';
      meatNotice = `متبقي ${6 - ageWeeks} أسبوع حتى بدء التبشير بالبيض`;
    } else if (ageWeeks <= 10) {
      phase = 'onset';
      phaseLabel = 'بداية التبشير بالبيض 🌱';
      badgeBgClass = 'bg-teal-50';
      badgeTextClass = 'text-teal-800';
      badgeBorderClass = 'border-teal-200';
      meatNotice = `متبقي ${remainingWeeks} أسبوع للتحويل لاحم`;
    } else if (ageWeeks <= 24) {
      phase = 'peak';
      phaseLabel = 'قمة الإنتاج والذروة 🌟';
      badgeBgClass = 'bg-emerald-100';
      badgeTextClass = 'text-emerald-900 font-extrabold';
      badgeBorderClass = 'border-emerald-300';
      meatNotice = `متبقي ${remainingWeeks} أسبوع للبيع لاحم`;
    } else if (ageWeeks <= 36) {
      phase = 'stable';
      phaseLabel = 'إنتاج بياض مستقر';
      badgeBgClass = 'bg-emerald-50';
      badgeTextClass = 'text-emerald-800';
      badgeBorderClass = 'border-emerald-200';
      meatNotice = `متبقي ${remainingWeeks} أسبوع للبيع لاحم`;
    } else if (ageWeeks < targetLifespanWeeks) {
      phase = 'late';
      phaseLabel = 'أواخر دورة البياض ⏳';
      badgeBgClass = 'bg-amber-100';
      badgeTextClass = 'text-amber-900';
      badgeBorderClass = 'border-amber-300';
      meatNotice = `تنبيه: متبقي ${remainingWeeks} أسبوع فقط حتى التنسيق والبيع لاحم`;
    } else {
      phase = 'culled_meat';
      phaseLabel = '⚠️ نهاية دورة البياض - جاهزة للبيع لاحم';
      badgeBgClass = 'bg-rose-100';
      badgeTextClass = 'text-rose-900 font-black animate-pulse';
      badgeBorderClass = 'border-rose-400';
      meatNotice = 'انتهى العمر الاقتصادي للبيض! يوصى بالفرز والتحويل للبيع لاحم فوراً';
    }
  }

  const statusBadgeText = isEndOfCycle
    ? `عمر ${ageWeeks} أسبوع • موعد التحويل للبيع لاحم`
    : `عمر ${ageWeeks} أسبوع • متبقي ${remainingWeeks} أسبوع للبيع لاحم`;

  return {
    ageWeeks,
    ageDays,
    ageMonths,
    targetLifespanWeeks,
    remainingWeeks,
    remainingDays,
    progressPercent,
    isEndOfCycle,
    isNearEnd,
    phase,
    phaseLabel,
    statusBadgeText,
    badgeBgClass,
    badgeTextClass,
    badgeBorderClass,
    meatConversionNotice: meatNotice,
  };
}

/**
 * Returns age bracket for aggregate comparison analysis
 */
export function getFlockAgeBracket(ageWeeks: number): {
  id: string;
  name: string;
  expectedLayingRate: string;
} {
  if (ageWeeks < 10) {
    return {
      id: 'onset',
      name: 'تبشير وبداية بياض (6 - 10 أسابيع)',
      expectedLayingRate: '50 - 65%',
    };
  }
  if (ageWeeks <= 24) {
    return {
      id: 'peak',
      name: 'قمة الإنتاج والذروة (11 - 24 أسبوع)',
      expectedLayingRate: '75 - 88%',
    };
  }
  if (ageWeeks <= 36) {
    return {
      id: 'stable',
      name: 'إنتاج مستقر ومنتظم (25 - 36 أسبوع)',
      expectedLayingRate: '65 - 75%',
    };
  }
  return {
    id: 'late_culled',
    name: 'أواخر الإنتاج والتنسيق (37+ أسبوع)',
    expectedLayingRate: '40 - 58% (موعد البيع لاحم)',
  };
}
