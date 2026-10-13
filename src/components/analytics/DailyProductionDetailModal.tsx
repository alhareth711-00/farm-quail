import React from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Egg,
  Layers,
  Grid,
  Warehouse,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Award,
  Package,
  Skull,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { DetailedMortalityRecord } from '../../types';

export interface DailyProductionDetailData {
  date: string;
  dayName: string;
  isToday: boolean;
  hasLogs: boolean;

  // Timing & Sessions
  primaryCollectionTime: string;
  sessions: string[];
  collectors: string[];
  elapsedHours: number;
  normalized24hYield: number;
  hasIntervalWarning: boolean;
  intervalWarningReason?: string;

  // Quantities
  grossEggs: number;
  netMarketableEggs: number;
  brokenEggs: number;
  brokenRatePct: number;
  packagedTraysCount: number;
  looseEggsRemaining: number;
  traySize: number;
  overallLayingRate: number;

  // Day-over-Day
  prevDate: string;
  prevGrossEggs: number;
  prevNetEggs: number;
  dayChangePct: number;

  // Batteries & Rooms
  batteryEggs: number;
  roomEggs: number;
  batteryPercentage: number;
  roomPercentage: number;

  batteriesSummary: {
    batteryId: string;
    batteryName: string;
    totalEggs: number;
    femalesCount: number;
    layingRate: number;
    isTopPerformer?: boolean;
    tiers: { tierNumber: number; eggs: number; rate: number }[];
  }[];

  roomsSummary: {
    roomId: string;
    roomName: string;
    eggs: number;
    birdsCount: number;
  }[];

  // Correlations
  mortalityCount: number;
  mortalityRecords: DetailedMortalityRecord[];

  feedUsedKg: number;
  feedUsedBags: number;
  feedGramsPerEgg: number;

  notes: string[];
}

interface DailyProductionDetailModalProps {
  data: DailyProductionDetailData | null;
  onClose: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  onNavigateToEggLogs?: () => void;
}

export const DailyProductionDetailModal: React.FC<DailyProductionDetailModalProps> = ({
  data,
  onClose,
  onPrevDay,
  onNextDay,
  canGoNext,
  canGoPrev,
  onNavigateToEggLogs,
}) => {
  if (!data) return null;

  const sessionLabel = (s: string) => {
    switch (s) {
      case 'evening':
        return 'الوجبة المسائية الموحدة (عصراً)';
      case 'morning':
        return 'الوجبة الصباحية (باكراً)';
      case 'noon':
        return 'وجبة الظهيرة';
      default:
        return 'فترة مسائية معتمدة';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-apple-modal border border-slate-100 text-right max-h-[92vh] overflow-y-auto space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
              <Egg className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  تقرير وتشخيص إنتاج يوم: {data.dayName}
                </h3>
                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {data.date}
                </span>
                {data.isToday ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    اليوم
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                كشف متكامل لوقت الجمع والوجبات، جودة البيض، والإنتاج المعياري الموضعي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Prev / Next day arrows inside modal header */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={onPrevDay}
                disabled={!canGoPrev}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="اليوم السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-slate-500 px-2 select-none">
                التنقل بين الأيام
              </span>
              <button
                onClick={onNextDay}
                disabled={!canGoNext}
                className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
                title="اليوم التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!data.hasLogs ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
            <h4 className="font-bold text-sm text-slate-700">لم يتم تسجيل وجبة إنتاج لهذا اليوم بعد</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              بانتظار اكتمال جمع الوجبة المسائية المعتمدة. يمكنك استخدام الأسهم للتنقل واستعراض الأيام السابقة.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Section 1: Collection Time, Shift & Interval */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Box 1: Collection Time */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>وقت جمع الوجبة</span>
                </div>
                <div className="text-lg font-black text-slate-900 font-mono">
                  {data.primaryCollectionTime}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 truncate">
                  {data.sessions.length > 0 ? sessionLabel(data.sessions[0]) : 'فترة مسائية موحدة'}
                </div>
              </div>

              {/* Box 2: Elapsed Hours & Normalized 24h Yield */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>الفارق الزمني والإنتاج المعياري</span>
                </div>
                <div className="text-lg font-black text-slate-900 font-mono">
                  {data.normalized24hYield.toLocaleString('ar-SA')}{' '}
                  <span className="text-[11px] font-normal text-slate-500">بيضة/24س</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>فارق الجمع: {data.elapsedHours} ساعة</span>
                  {data.hasIntervalWarning && (
                    <span className="text-rose-600 font-bold" title={data.intervalWarningReason}>
                      ⚠️ انحراف زمني
                    </span>
                  )}
                </div>
              </div>

              {/* Box 3: Broken Eggs & Damage % */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>البيض المكسور والتالف</span>
                </div>
                <div className="text-lg font-black text-rose-700 font-mono">
                  {data.brokenEggs}{' '}
                  <span className="text-[11px] font-normal text-slate-500">بيضة</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  نسبة الكسر:{' '}
                  <b className={`font-mono ${data.brokenRatePct > 2 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {data.brokenRatePct}%
                  </b>{' '}
                  {data.brokenRatePct <= 2 ? '(طبيعي <2%)' : '(مرتفع ⚠️)'}
                </div>
              </div>

              {/* Box 4: Collector / Recorder */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-1">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>المسؤول عن الجمع</span>
                </div>
                <div className="text-sm font-extrabold text-slate-900 truncate">
                  {data.collectors.length > 0 ? data.collectors.join(', ') : 'مسؤول المزرعة'}
                </div>
                <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>سجل موثق بالنظام</span>
                </div>
              </div>
            </div>

            {/* Section 2: Production KPIs (Gross, Net, Trays, Rate) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* KPI 1: Gross Actual Eggs */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>إجمالي الإنتاج الفعلي (المجموع)</span>
                  <Egg className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {data.grossEggs.toLocaleString('ar-SA')}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <span>مقارنة بأمس:</span>
                  <span
                    className={`font-mono font-bold ${
                      data.dayChangePct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {data.dayChangePct >= 0 ? `+${data.dayChangePct}%` : `${data.dayChangePct}%`}
                  </span>
                </div>
              </div>

              {/* KPI 2: Net Marketable Eggs */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-800 mb-1">
                  <span>الصافي السليم القابل للتسويق</span>
                  <Award className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-800 font-mono">
                  {data.netMarketableEggs.toLocaleString('ar-SA')}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1">
                  بعد خصم {data.brokenEggs} بيضة مكسرة
                </div>
              </div>

              {/* KPI 3: Packaged Trays */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>أطباق البيض المقفصة والمغلفة</span>
                  <Package className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-2xl font-black text-teal-800 font-mono">
                  {data.packagedTraysCount}{' '}
                  <span className="text-xs font-bold text-slate-500 font-sans">طبق</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  سعة {data.traySize} بيضة (متبقي فوارغ: {data.looseEggsRemaining} بيضة)
                </div>
              </div>

              {/* KPI 4: Flock Laying Rate % */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>معدل البياض المرجح للقطيع</span>
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-900 font-mono">
                  {data.overallLayingRate}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  محسوب على إجمالي الإناث الحية
                </div>
              </div>
            </div>

            {/* Section 3: Battery Cages vs Floor Rooms Details */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-extrabold text-xs text-slate-900">
                    توزيع إنتاج اليوم: الشبوك والبطاريات (أ-س) مقابل الغرف الأرضية (1-7)
                  </h4>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-emerald-700">البطاريات: {data.batteryPercentage}%</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-sky-700">الغرف: {data.roomPercentage}%</span>
                </div>
              </div>

              {/* Battery cards grid */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500">تفصيل إنتاج البطاريات لهذا اليوم:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {data.batteriesSummary.map((bat) => (
                    <div
                      key={bat.batteryId}
                      className={`p-3 rounded-xl border bg-white text-xs ${
                        bat.isTopPerformer
                          ? 'border-emerald-300 ring-1 ring-emerald-400 bg-emerald-50/20'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                        <span>{bat.batteryName}</span>
                        {bat.isTopPerformer && (
                          <span className="text-amber-500 text-[10px]" title="الأعلى إنتاجاً">👑</span>
                        )}
                      </div>
                      <div className="text-base font-black font-mono text-emerald-800">
                        {bat.totalEggs}{' '}
                        <span className="text-[10px] font-normal text-slate-400">بيضة</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        نسبة بياض: <b>{bat.layingRate}%</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rooms Summary */}
              {data.roomsSummary.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                  <div className="text-[11px] font-bold text-slate-500">تفصيل إنتاج الغرف الأرضية:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {data.roomsSummary.map((r) => (
                      <div
                        key={r.roomId}
                        className="p-2.5 rounded-xl border border-sky-200 bg-sky-50/30 text-xs text-center"
                      >
                        <div className="font-bold text-slate-700 truncate">{r.roomName}</div>
                        <div className="text-sm font-black font-mono text-sky-800 mt-0.5">
                          {r.eggs} <span className="text-[9px] font-normal text-slate-500">بيضة</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Operational Correlations (Feed & Mortality) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Feed Consumption */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>استهلاك الأعلاف في هذا اليوم</span>
                  </span>
                  <span className="font-mono text-slate-500">
                    {data.feedUsedKg > 0 ? `${data.feedUsedKg} كغم (${data.feedUsedBags} كيس)` : 'لم يسجل صرف'}
                  </span>
                </div>
                {data.feedUsedKg > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs flex justify-between items-center">
                    <span className="text-amber-900 font-bold">معدل العلف / بيضة منتجة:</span>
                    <span className="font-mono font-black text-amber-950">
                      {data.feedGramsPerEgg} غرام/بيضة
                    </span>
                  </div>
                )}
              </div>

              {/* Mortality */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Skull className="w-4 h-4 text-rose-600" />
                    <span>النافق المسجل في هذا اليوم</span>
                  </span>
                  <span className="font-mono font-bold">
                    {data.mortalityCount > 0 ? (
                      <span className="text-rose-700">+{data.mortalityCount} طيور نافقة</span>
                    ) : (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 0 نافق (ممتاز)
                      </span>
                    )}
                  </span>
                </div>
                {data.mortalityRecords.length > 0 && (
                  <div className="space-y-1">
                    {data.mortalityRecords.slice(0, 3).map((m, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] p-1.5 rounded-lg bg-rose-50 border border-rose-200/60 text-rose-900 flex justify-between"
                      >
                        <span>
                          {m.locationType === 'battery'
                            ? `بطارية ${m.batteryName || ''} دور ${m.tierNumber || ''}`
                            : m.roomName || 'غرفة'}
                          : {m.description || 'نافق طبيعي'}
                        </span>
                        <span className="font-mono font-bold">{m.quantity} طير</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Field Notes */}
            {data.notes.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div className="font-bold text-slate-700 mb-1">ملاحظات مسؤول الوردية والجمع:</div>
                <div className="text-slate-600 leading-relaxed font-mono">
                  {data.notes.join(' • ')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          {onNavigateToEggLogs ? (
            <button
              onClick={() => {
                onClose();
                onNavigateToEggLogs();
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>الانتقال إلى سجل إنتاج البيض المعياري الكامل</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">نظام إدارة مزارع السمان الذكي ERP</span>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
