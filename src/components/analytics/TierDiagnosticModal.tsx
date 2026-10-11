import React from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Skull,
  Droplets,
  Lightbulb,
  Thermometer,
  Layers,
  Activity,
  ArrowRight,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import type { Battery, BatteryTier, DetailedMortalityRecord } from '../../types';

export interface TierDiagnosticData {
  battery: Battery;
  tier: BatteryTier;
  targetDate: string;
  todayEggs: number;
  yesterdayEggs: number;
  changePct: number;
  layingRate: number;
  totalFemales: number;
  totalMales: number;
  ageWeeks: number;
  isEndOfCycle: boolean;
  historyDays: { date: string; label: string; eggs: number; rate: number }[];
  siblingTiers: {
    tierNumber: number;
    eggs: number;
    rate: number;
    females: number;
    isCurrent: boolean;
  }[];
  recentMortalities: DetailedMortalityRecord[];
}

interface TierDiagnosticModalProps {
  data: TierDiagnosticData | null;
  onClose: () => void;
}

export const TierDiagnosticModal: React.FC<TierDiagnosticModalProps> = ({ data, onClose }) => {
  if (!data) return null;

  const {
    battery,
    tier,
    targetDate,
    todayEggs,
    yesterdayEggs,
    changePct,
    layingRate,
    totalFemales,
    totalMales,
    ageWeeks,
    isEndOfCycle,
    historyDays,
    siblingTiers,
    recentMortalities,
  } = data;

  // Sibling tiers stats
  const otherTiers = siblingTiers.filter((st) => !st.isCurrent);
  const avgOtherEggs =
    otherTiers.length > 0
      ? Math.round(otherTiers.reduce((a, b) => a + b.eggs, 0) / otherTiers.length)
      : 0;
  const avgOtherRate =
    otherTiers.length > 0
      ? Math.round(otherTiers.reduce((a, b) => a + b.rate, 0) / otherTiers.length)
      : 0;

  // Diagnostic heuristics (تحليل الذكاء الإداري والبيطري للسبب المحتمل)
  const isDropSignificant = changePct <= -15 || (avgOtherRate > 0 && layingRate < avgOtherRate - 15);
  const isIsolatedToThisTier = avgOtherRate >= 65 && layingRate < 55;
  const totalTierMortality = recentMortalities.reduce((acc, m) => acc + m.quantity, 0);
  const hasMortality = totalTierMortality > 0;

  // Diagnostic Insights
  const diagnosticPoints: { title: string; desc: string; type: 'danger' | 'warning' | 'info' | 'success' }[] = [];

  if (hasMortality) {
    diagnosticPoints.push({
      title: `تزامن الهبوط مع وفيات مسجلة (${totalTierMortality} طائر نافق)`,
      desc: 'تم تسجيل حالات نفوق في هذا الدور خلال الأيام الأخيرة. قد يشير هذا إلى إصابة ميكروبية معوية (مثل الكوكسيديا أو الكولاي) أو صدمة تسمم علفي أو عطل عطش مائي.',
      type: 'danger',
    });
  }

  if (tier.tierNumber === 4 && isIsolatedToThisTier) {
    diagnosticPoints.push({
      title: 'شذوذ في الدور السفلي (الدور 4)',
      desc: 'الدور السفلي هو الأكثر عرضة لضعف الإضاءة (أقل من 20 لوكس) وبرودة الأرضية الشتوية وتراكم غبار الأرضية على حلمات الشرب الأوتوماتيكية.',
      type: 'warning',
    });
  } else if (tier.tierNumber === 1 && isIsolatedToThisTier) {
    diagnosticPoints.push({
      title: 'شذوذ في الدور العلوي (الدور 1)',
      desc: 'الدور العلوي قريب من السقف ويتعرض لحرارة مرتفعة في النهار وتيار هواء مباشر من مراوح السحب أو فتحات التهوية، مما يسبب إجهاداً حرارياً سريعاً.',
      type: 'warning',
    });
  } else if (isIsolatedToThisTier) {
    diagnosticPoints.push({
      title: 'المشكلة موضعية ومحصورة في هذا الدور فقط',
      desc: `بقية أدوار البطارية (${battery.name}) تعمل بمعدل جيد (${avgOtherRate}%) بينما هذا الدور تراجع إلى (${layingRate}%). هذا يستبعد تماماً مشاكل العلف العام، ويؤكد وجود خلل موضعي في حلمات مياه هذا الدور، أو احتراق لمبة الإضاءة أمامه.`,
      type: 'warning',
    });
  } else if (isDropSignificant && !isIsolatedToThisTier) {
    diagnosticPoints.push({
      title: `هبوط شامل على مستوى كامل بطارية (${battery.name})`,
      desc: 'جميع أدوار البطارية متأثرة بنفس النسبة تقريباً. يرجى فحص محبس التغذية المائي الرئيسي لخط البطارية، والتأكد من عدم وجود صوت مزعج أو قطط أو إزعاج مباشر في هذه الحارة.',
      type: 'warning',
    });
  }

  if (isEndOfCycle) {
    diagnosticPoints.push({
      title: `عمر القطيع متقدم (${ageWeeks} أسبوعاً)`,
      desc: 'القطيع شارف على نهاية الدورة الإنتاجية الاقتصادية (أكثر من 37 أسبوعاً). التراجع هنا طبيعي فسيولوجياً ويُنصح بجدولة التحويل للبيع لاحم.',
      type: 'info',
    });
  }

  if (diagnosticPoints.length === 0) {
    diagnosticPoints.push({
      title: 'مؤشرات الدور مستقرة وطبيعية',
      desc: 'إنتاج البيض ومعدل البياض ضمن الحدود القياسية ولا توجد دلائل على مشاكل بيئية أو صحية في هذا الدور.',
      type: 'success',
    });
  }

  // Mini Chart max
  const maxHistoryEggs = Math.max(...historyDays.map((h) => h.eggs), 35);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-150 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-black text-lg">
              {battery.name}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base">
                  فحص وتشخيص: بطارية ({battery.name}) - الدور {tier.tierNumber}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                  {tier.tierNumber === 1 ? 'العلوي' : tier.tierNumber === 4 ? 'السفلي' : `دور ${tier.tierNumber}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                تاريخ التحليل: <b className="text-white font-mono">{targetDate}</b> • إجمالي الطيور: {totalFemales} أنثى + {totalMales} ذكور ({ageWeeks} أسبوعاً)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-right font-almarai">
          {/* Top KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5">إنتاج البيض اليوم</span>
              <div className="text-2xl font-black font-mono text-emerald-800">{todayEggs}</div>
              <span className="text-[10px] text-slate-400 font-mono">أمس: {yesterdayEggs}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5">التغير عن الأمس</span>
              <div
                className={`text-2xl font-black font-mono flex items-center justify-center gap-0.5 ${
                  changePct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {changePct >= 0 ? <TrendingUp className="w-4 h-4 stroke-[3]" /> : <TrendingDown className="w-4 h-4 stroke-[3]" />}
                <span>{changePct >= 0 ? `+${changePct}%` : `${changePct}%`}</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {changePct >= 0 ? 'صعود/استقرار' : 'تراجع'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5">معدل البياض الفعلي</span>
              <div
                className={`text-2xl font-black font-mono ${
                  layingRate >= 65 ? 'text-emerald-700' : layingRate >= 50 ? 'text-amber-700' : 'text-rose-700'
                }`}
              >
                {layingRate}%
              </div>
              <span className="text-[10px] text-slate-400">المعيار: 65 - 75%</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5">النافق المسجل حديثاً</span>
              <div
                className={`text-2xl font-black font-mono flex items-center justify-center gap-1 ${
                  hasMortality ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {hasMortality && <Skull className="w-4 h-4" />}
                <span>{totalTierMortality}</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {hasMortality ? 'حالات مسجلة' : 'لا يوجد نافق'}
              </span>
            </div>
          </div>

          {/* 7-Day History Trend Mini Chart */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>سجل إنتاج هذا الدور خلال الأيام السابقة (Last 7 Days Trend)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">القيم بالبيضة</span>
            </div>

            <div className="flex items-end justify-between gap-2 h-28 pt-4 px-2 border-b border-slate-200">
              {historyDays.map((item, idx) => {
                const heightPct = Math.max(10, Math.round((item.eggs / maxHistoryEggs) * 100));
                const isTarget = item.date === targetDate;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <span
                      className={`text-[10px] font-mono font-bold mb-1 transition-transform group-hover:scale-110 ${
                        isTarget ? 'text-emerald-700 font-black' : 'text-slate-600'
                      }`}
                    >
                      {item.eggs}
                    </span>
                    <div
                      className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                        isTarget
                          ? 'bg-emerald-600 shadow-sm ring-2 ring-emerald-400/50'
                          : item.eggs >= 25
                          ? 'bg-teal-500/80 group-hover:bg-teal-600'
                          : 'bg-amber-500/80 group-hover:bg-amber-600'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] text-slate-500 mt-1 truncate max-w-full font-mono">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sibling Tiers Vertical Comparison */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>مقارنة الدور مع بقية أدوار نفس البطارية ({battery.name})</span>
              </div>
              <span className="text-[10px] text-slate-400">
                متوسط باقي الأدوار: <b className="text-slate-700 font-mono">{avgOtherEggs} بيضة ({avgOtherRate}%)</b>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {siblingTiers.map((st) => (
                <div
                  key={st.tierNumber}
                  className={`p-3 rounded-xl border transition-all ${
                    st.isCurrent
                      ? 'bg-emerald-50/90 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-[11px] font-extrabold text-slate-700 mb-1">
                    <span>الدور {st.tierNumber}</span>
                    {st.isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
                    )}
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900">{st.eggs} بيضة</div>
                  <div
                    className={`text-[10px] font-bold font-mono mt-0.5 ${
                      st.rate >= 65 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    نسبة: {st.rate}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Linked Mortality Log (if any) */}
          {hasMortality && (
            <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-900">
                <Skull className="w-4 h-4 text-rose-600" />
                <span>سجل وفيات مسجل في هذا الدور ({recentMortalities.length} بلاغ)</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {recentMortalities.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-white border border-rose-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{m.description}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {m.date} {m.time} • {m.exactLocationText}
                      </span>
                    </div>
                    <span className="font-mono font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg">
                      {m.quantity} طائر
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Root Cause & Action Checklist */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 to-white border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>نتائج التشخيص الذكي والتوصيات التنفيذية:</span>
            </div>

            <div className="space-y-2">
              {diagnosticPoints.map((dp, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    dp.type === 'danger'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : dp.type === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : dp.type === 'info'
                      ? 'bg-sky-50 border-sky-200 text-sky-950'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div className="font-extrabold flex items-center gap-1.5 mb-0.5">
                    {dp.type === 'danger' || dp.type === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{dp.title}</span>
                  </div>
                  <p className="text-[11px] opacity-90">{dp.desc}</p>
                </div>
              ))}
            </div>

            {/* Quick action buttons for the farm manager */}
            <div className="pt-2 border-t border-amber-200/60">
              <div className="text-[11px] font-bold text-slate-700 mb-2">
                خطوات الفحص الميداني المقترحة فورياً:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>1. ضغط حلمات ماء الشرب والتأكد من تدفق الماء</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>2. فحص لمبة الإضاءة المقابلة لهذا الدور</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>3. قياس درجة حرارة الدور وفحص تيار الهواء</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>4. فحص استهلاك العلف ورؤية نشاط الطيور</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            تم إجراء التحليل بربط سجلات الإنتاج والنافق التلقائي
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            إغلاق نافذة الفحص
          </button>
        </div>
      </div>
    </div>
  );
};
