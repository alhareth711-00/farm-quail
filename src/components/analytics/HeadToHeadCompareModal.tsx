import React, { useState } from 'react';
import { X, ArrowLeftRight, TrendingUp, TrendingDown, Layers, Award, Sparkles } from 'lucide-react';
import type { Battery, BatteryTier, FloorRoom } from '../../types';

export interface HeadToHeadItem {
  id: string;
  name: string;
  type: 'battery' | 'tier' | 'room';
  todayEggs: number;
  yesterdayEggs: number;
  changePct: number;
  layingRate: number;
  totalBirds: number;
  femalesCount: number;
  details?: string;
}

interface HeadToHeadCompareModalProps {
  items: HeadToHeadItem[];
  onClose: () => void;
}

export const HeadToHeadCompareModal: React.FC<HeadToHeadCompareModalProps> = ({
  items,
  onClose,
}) => {
  const [selectedIdA, setSelectedIdA] = useState<string>(items[0]?.id || '');
  const [selectedIdB, setSelectedIdB] = useState<string>(items[1]?.id || items[0]?.id || '');

  const itemA = items.find((i) => i.id === selectedIdA) || items[0];
  const itemB = items.find((i) => i.id === selectedIdB) || items[1] || items[0];

  if (!itemA || !itemB) return null;

  const diffEggs = itemA.todayEggs - itemB.todayEggs;
  const diffRate = itemA.layingRate - itemB.layingRate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-150 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">المقارنة الميدانية المباشرة (Head-to-Head Comparison)</h3>
              <p className="text-[11px] text-slate-300">
                قارن بين أي بطاريتين أو غرفتين جنباً إلى جنب مع كشف الفوارق الإنتاجية فورياً
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto font-almarai text-right">
          {/* Selectors Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <label className="block text-xs font-bold text-emerald-950 mb-1.5">
                الطرف الأول (أ):
              </label>
              <select
                value={selectedIdA}
                onChange={(e) => setSelectedIdA(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-emerald-300 text-xs font-bold bg-white text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.todayEggs} بيضة - {it.layingRate}%)
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200">
              <label className="block text-xs font-bold text-sky-950 mb-1.5">
                الطرف الثاني (ب):
              </label>
              <select
                value={selectedIdB}
                onChange={(e) => setSelectedIdB(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-sky-300 text-xs font-bold bg-white text-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.todayEggs} بيضة - {it.layingRate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Summary Pill */}
          <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>
                فارق الإنتاج:{' '}
                <b className="font-mono text-slate-900">
                  {Math.abs(diffEggs)} بيضة لصالح ({diffEggs >= 0 ? itemA.name : itemB.name})
                </b>
              </span>
            </div>
            <div>
              فارق نسبة البياض:{' '}
              <b className="font-mono text-emerald-700">
                {Math.abs(diffRate)}% ({diffRate >= 0 ? itemA.name : itemB.name} أعلى)
              </b>
            </div>
          </div>

          {/* Comparison Cards Side-by-Side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Card A */}
            <div className="p-5 rounded-3xl bg-white border-2 border-emerald-300 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <span className="font-black text-sm text-emerald-950">{itemA.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  طرف (أ)
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-almarai">إنتاج البيض:</span>
                  <span className="font-black text-lg text-emerald-800">{itemA.todayEggs} بيضة</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-almarai">معدل البياض:</span>
                  <span className="font-bold text-slate-900">{itemA.layingRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-almarai">إناث بياضة:</span>
                  <span className="font-bold text-slate-700">{itemA.femalesCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-almarai">التغير عن الأمس:</span>
                  <span
                    className={`font-bold flex items-center gap-0.5 ${
                      itemA.changePct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {itemA.changePct >= 0 ? `+${itemA.changePct}%` : `${itemA.changePct}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* Card B */}
            <div className="p-5 rounded-3xl bg-white border-2 border-sky-300 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-sky-100 pb-2">
                <span className="font-black text-sm text-sky-950">{itemB.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  طرف (ب)
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-almarai">إنتاج البيض:</span>
                  <span className="font-black text-lg text-sky-800">{itemB.todayEggs} بيضة</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-almarai">معدل البياض:</span>
                  <span className="font-bold text-slate-900">{itemB.layingRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-almarai">إناث بياضة:</span>
                  <span className="font-bold text-slate-700">{itemB.femalesCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-almarai">التغير عن الأمس:</span>
                  <span
                    className={`font-bold flex items-center gap-0.5 ${
                      itemB.changePct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {itemB.changePct >= 0 ? `+${itemB.changePct}%` : `${itemB.changePct}%`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors"
          >
            إغلاق المقارنة
          </button>
        </div>
      </div>
    </div>
  );
};
