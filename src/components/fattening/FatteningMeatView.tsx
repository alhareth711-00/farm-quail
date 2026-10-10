import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { SlaughterRecord, FatteningWeightSample } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Scale,
  Plus,
  UtensilsCrossed,
  PackageCheck,
  TrendingUp,
  Percent,
  Calendar,
  AlertTriangle,
  X,
  CheckCircle2,
  Layers,
} from 'lucide-react';

export const FatteningMeatView: React.FC = () => {
  const { toast } = useToast();

  const rooms = useLiveQuery(
    () => db.rooms.filter((r) => r.purpose === 'fattening').toArray(),
    []
  );
  const slaughterRecords = useLiveQuery(
    () => db.slaughterRecords.reverse().sortBy('date'),
    []
  );
  const products = useLiveQuery(() => db.products.toArray(), []);

  // Modal
  const [showSlaughterModal, setShowSlaughterModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [slaughterDate, setSlaughterDate] = useState(new Date().toISOString().split('T')[0]);
  const [birdsCount, setBirdsCount] = useState(100);
  const [liveWeightKg, setLiveWeightKg] = useState(24); // e.g. 100 birds * 240g = 24kg
  const [dressedWeightKg, setDressedWeightKg] = useState(17.5); // ~73% dressing percentage
  const [meatType, setMeatType] = useState<'fresh_pairs' | 'frozen_pairs' | 'meat_kg'>('fresh_pairs');
  const [notes, setNotes] = useState('');

  // Weekly Weight Sampling Modal
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightRoomId, setWeightRoomId] = useState('');
  const [weekNumber, setWeekNumber] = useState(4);
  const [sampleBirdsCount, setSampleBirdsCount] = useState(20);
  const [avgWeightGrams, setAvgWeightGrams] = useState(215);

  // Dressing percentage helper
  const calcDressingPercentage = (dressed: number, live: number) => {
    if (live <= 0) return 0;
    return Math.round((dressed / live) * 1000) / 10;
  };

  const handleOpenSlaughterModal = () => {
    if (rooms && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
    setSlaughterDate(new Date().toISOString().split('T')[0]);
    setBirdsCount(100);
    setLiveWeightKg(24);
    setDressedWeightKg(17.5);
    setMeatType('fresh_pairs');
    setNotes('');
    setShowSlaughterModal(true);
  };

  // Submit Slaughter and Auto-convert to sellable inventory
  const handleSaveSlaughter = async (e: React.FormEvent) => {
    e.preventDefault();

    const count = Number(birdsCount);
    const live = Number(liveWeightKg);
    const dressed = Number(dressedWeightKg);

    if (!count || isNaN(count) || count <= 0) {
      toast('يرجى إدخال عدد صحيح للطيور المحولة للمجزرة أكبر من الصفر', 'error');
      return;
    }

    if (!live || isNaN(live) || live <= 0 || !dressed || isNaN(dressed) || dressed <= 0) {
      toast('يرجى إدخال وزن حي ووزن مجهز صحيحين أكبر من الصفر', 'error');
      return;
    }

    const targetRoom = rooms?.find((r) => r.id === selectedRoomId);
    if (targetRoom) {
      const roomTotal = targetRoom.malesCount + targetRoom.femalesCount;
      if (count > roomTotal) {
        toast(
          `⚠️ عدد الطيور المطلوب تحويلها (${count}) أكبر من إجمالي الطيور الحية في هذه الغرفة (${roomTotal} طائر)!`,
          'error'
        );
        return;
      }
    }

    const dressingPct = calcDressingPercentage(dressed, live);
    const pairs = Math.floor(count / 2);

    const record: SlaughterRecord = {
      id: `slaughter-${Date.now()}`,
      batchId: selectedRoomId,
      date: slaughterDate,
      birdsCount: count,
      liveWeightKg: live,
      dressedWeightKg: dressed,
      dressingPercentage: dressingPct,
      pairsCount: pairs,
      meatKgRemaining: dressed,
      meatType,
      addedToInventory: true,
      notes: notes.trim(),
      recordedBy: 'مسؤول المجزرة',
      createdAt: new Date().toISOString(),
    };

    // 1. Add slaughter record
    await db.slaughterRecords.add(record);

    // 2. Deduct birds from room
    if (targetRoom) {
      const halfCount = Math.floor(count / 2);
      await db.rooms.update(targetRoom.id, {
        malesCount: Math.max(0, targetRoom.malesCount - halfCount),
        femalesCount: Math.max(0, targetRoom.femalesCount - (count - halfCount)),
      });
    }

    // 3. Automatically add to Products Stock
    if (meatType === 'fresh_pairs') {
      const freshProd = products?.find((p) => p.id === 'prod-meat-pair-fresh');
      if (freshProd) {
        await db.products.update(freshProd.id, {
          stockQuantity: freshProd.stockQuantity + pairs,
        });
      }
    } else if (meatType === 'frozen_pairs') {
      const frozenProd = products?.find((p) => p.id === 'prod-meat-pair-frozen');
      if (frozenProd) {
        await db.products.update(frozenProd.id, {
          stockQuantity: frozenProd.stockQuantity + pairs,
        });
      }
    } else {
      const kgProd = products?.find((p) => p.id === 'prod-meat-kg');
      if (kgProd) {
        await db.products.update(kgProd.id, {
          stockQuantity: kgProd.stockQuantity + Math.round(dressed),
        });
      }
    }

    toast(
      `تم تسجيل عملية الذبح (${count} طائر) ونسبة تصافي ${dressingPct}%، وإضافة ${pairs} جوز لمخزون المبيعات!`,
      'success'
    );
    setShowSlaughterModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-amber-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              قسم التسمين والمجزرة واللحوم (Fattening & Meat Production)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            متابعة أوزان التسمين أسبوعياً (الوزن المستهدف 200-250 جم)، وسجل الذبح والتجهيز مع احتساب نسبة التصافي والتحويل التلقائي للمخزون.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleOpenSlaughterModal}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
          >
            <UtensilsCrossed className="w-4 h-4 stroke-[2.5]" />
            <span>تسجيل عملية ذبح وتجهيز</span>
          </button>
        </div>
      </div>

      {/* Fattening Flock Age & Weight Benchmark Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl glass-card border border-amber-200/80 bg-amber-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900">الوزن المستهدف للذبح</span>
            <Scale className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">200 - 250 جم</div>
          <div className="text-[11px] text-amber-800 mt-1">
            العمر المثالي للذبح: <b className="font-mono">35 إلى 42 يوماً</b> (5 - 6 أسابيع)
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">متوسط نسبة التصافي القياسية</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">72% - 76%</div>
          <div className="text-[11px] text-slate-500 mt-1">
            الوزن الصافي المجهز مقارنة بالوزن الحي لطائر السمان
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">طيور التسمين الحالية</span>
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {rooms?.reduce((acc, r) => acc + r.malesCount + r.femalesCount, 0) || 0} طائر
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            في غرف التربية الأرضية المخصصة للتسمين
          </div>
        </div>
      </div>

      {/* Slaughter & Processing Records Table */}
      <div className="rounded-3xl glass-panel overflow-hidden border border-slate-200/80 space-y-4 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-rose-600" />
            <h3 className="font-extrabold text-sm text-slate-800">
              سجل عمليات الذبح والتجهيز وتحويل المخزون
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            إجمالي العمليات: {slaughterRecords?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">تاريخ الذبح</th>
                <th className="p-3.5">عدد الطيور المذبوحة</th>
                <th className="p-3.5 text-center">الوزن الحي (كغم)</th>
                <th className="p-3.5 text-center">متوسط وزن الطائر الحي</th>
                <th className="p-3.5 text-center">الوزن الصافي (كغم)</th>
                <th className="p-3.5 text-center">نسبة التصافي (%)</th>
                <th className="p-3.5 text-center">الناتج للمخزون</th>
                <th className="p-3.5">نوع التجهيز</th>
                <th className="p-3.5">حالة المخزون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slaughterRecords && slaughterRecords.length > 0 ? (
                slaughterRecords.map((rec) => {
                  const avgLiveGram =
                    rec.birdsCount > 0 ? Math.round((rec.liveWeightKg / rec.birdsCount) * 1000) : 0;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900">{rec.date}</td>
                      <td className="p-3.5 font-black text-rose-700 font-mono text-sm">
                        {rec.birdsCount} طائر
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold">{rec.liveWeightKg} كغم</td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-700">
                        {avgLiveGram} جرام
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-emerald-800">
                        {rec.dressedWeightKg} كغم
                      </td>
                      <td className="p-3.5 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200">
                          {rec.dressingPercentage}%
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-900">
                        {rec.pairsCount} جوز
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {rec.meatType === 'fresh_pairs'
                            ? 'أجواز مبردة طازجة'
                            : rec.meatType === 'frozen_pairs'
                            ? 'أجواز مجمدة'
                            : 'لحم مفرغ بالكيلو'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>أضيف لمخزون المبيعات</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    لا توجد عمليات ذبح مسجلة حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Slaughter & Processing Record */}
      {showSlaughterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <UtensilsCrossed className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل عملية ذبح جديدة واحتساب نسبة التصافي
                </h3>
              </div>
              <button
                onClick={() => setShowSlaughterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlaughter} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اختر فوج / غرفة التسمين
                  </label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full glass-input text-xs"
                  >
                    {rooms?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.malesCount + r.femalesCount} طائر متوفر)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ التحويل والذبح
                  </label>
                  <input
                    type="date"
                    required
                    value={slaughterDate}
                    onChange={(e) => setSlaughterDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  عدد الطيور المحولة للمجزرة
                </label>
                <input
                  type="number"
                  min="2"
                  required
                  value={birdsCount}
                  onChange={(e) => setBirdsCount(Number(e.target.value))}
                  className="w-full glass-input text-center text-lg font-mono font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  يعادل {Math.floor(birdsCount / 2)} جوز سمان مجهز
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوزن الحي الإجمالي (كغم)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={liveWeightKg}
                    onChange={(e) => setLiveWeightKg(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold"
                  />
                  {birdsCount > 0 && liveWeightKg > 0 && (
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      متوسط وزن الطائر الحي: {Math.round((liveWeightKg / birdsCount) * 1000)} جرام
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوزن الصافي المجهز (كغم)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={dressedWeightKg}
                    onChange={(e) => setDressedWeightKg(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold text-emerald-800"
                  />
                  {birdsCount > 0 && dressedWeightKg > 0 && (
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      متوسط وزن الطائر المجهز: {Math.round((dressedWeightKg / birdsCount) * 1000)} جرام
                    </span>
                  )}
                </div>
              </div>

              {/* Automatic Dressing Percentage calculation preview */}
              {liveWeightKg > 0 && dressedWeightKg > 0 && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex justify-between items-center text-emerald-950 font-bold">
                  <span>نسبة التصافي المحسوبة (Dressing %):</span>
                  <span className="text-base font-black font-mono text-emerald-800">
                    {calcDressingPercentage(dressedWeightKg, liveWeightKg)}%
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تحويل الناتج تلقائياً إلى صنف المخزون
                </label>
                <select
                  value={meatType}
                  onChange={(e) => setMeatType(e.target.value as any)}
                  className="w-full glass-input text-xs"
                >
                  <option value="fresh_pairs">جوز سمان مذبوح ومجهز طازج (جامبو)</option>
                  <option value="frozen_pairs">جوز سمان مذبوح مجمد (عبوة محكمة)</option>
                  <option value="meat_kg">لحم سمان مفرغ بالكيلو</option>
                </select>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  سيتم إضافة الرصيد الناتج فوراً لقائمة منتجات نقاط البيع (POS)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات إضافية
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات جودة التنظيف، التعبئة، حرارة التبريد..."
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  تأكيد الذبح وإضافة الناتج للمخزون
                </button>
                <button
                  type="button"
                  onClick={() => setShowSlaughterModal(false)}
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
