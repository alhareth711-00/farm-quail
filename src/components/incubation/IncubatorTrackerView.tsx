import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { IncubationBatch, IncubationStatus } from '../../types';
import { useToast } from '../../context/ToastContext';
import confetti from 'canvas-confetti';
import {
  EggFried,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Eye,
  ArrowRight,
  TrendingUp,
  Percent,
} from 'lucide-react';

export const IncubatorTrackerView: React.FC = () => {
  const { toast } = useToast();
  const batches = useLiveQuery(() => db.incubationBatches.toArray(), []);

  // Modals
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [activeBatchForCandling, setActiveBatchForCandling] = useState<IncubationBatch | null>(null);
  const [activeBatchForHatch, setActiveBatchForHatch] = useState<IncubationBatch | null>(null);

  // Add Batch Form
  const [batchNumber, setBatchNumber] = useState(`INC-2026-00${(batches?.length || 0) + 1}`);
  const [incubatorName, setIncubatorName] = useState('فقاسة الصقر الذكية 1000');
  const [eggCount, setEggCount] = useState(500);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Candling Form
  const [fertileEggsInput, setFertileEggsInput] = useState(0);
  const [infertileEggsInput, setInfertileEggsInput] = useState(0);

  // Hatch Form
  const [hatchedChicksInput, setHatchedChicksInput] = useState(0);
  const [weakChicksInput, setWeakChicksInput] = useState(0);
  const [deadInShellInput, setDeadInShellInput] = useState(0);

  // Day calculation helper
  const calculateBatchProgress = (batch: IncubationBatch) => {
    const start = new Date(batch.startDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const currentDay = Math.min(
      17,
      Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1)
    );
    const progressPercent = Math.min(100, Math.round((currentDay / 17) * 100));

    // Milestone statuses
    const isCandlingDue = currentDay >= 7 && currentDay <= 10 && !batch.candlingDone;
    const isTransferDue = currentDay >= 14 && batch.status !== 'transferred' && batch.status !== 'hatched';
    const isHatchDue = currentDay >= 17 && !batch.hatchedDone;

    // Rates
    const fertilityRate =
      batch.candlingDone && batch.eggCount > 0
        ? Math.round((batch.fertileEggs / batch.eggCount) * 100)
        : null;

    const hatchabilityRate =
      batch.hatchedDone && batch.fertileEggs > 0
        ? Math.round((batch.hatchedChicks / batch.fertileEggs) * 100)
        : null;

    return {
      currentDay,
      progressPercent,
      isCandlingDue,
      isTransferDue,
      isHatchDue,
      fertilityRate,
      hatchabilityRate,
    };
  };

  const handleOpenAddModal = () => {
    setBatchNumber(`INC-2026-00${(batches?.length || 0) + 1}`);
    setIncubatorName('فقاسة الصقر الذكية 1000');
    setEggCount(500);
    setStartDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setShowAddBatchModal(true);
  };

  // Automatic schedule generation (Day 8 candling, Day 14 transfer, Day 17 hatch)
  const handleSaveNewBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNumber.trim() || eggCount <= 0) return;

    const start = new Date(startDate);
    
    // Candling Day 8
    const candling = new Date(start);
    candling.setDate(candling.getDate() + 8);

    // Transfer Day 14
    const transfer = new Date(start);
    transfer.setDate(transfer.getDate() + 14);

    // Hatch Day 17
    const hatch = new Date(start);
    hatch.setDate(hatch.getDate() + 17);

    const newBatch: IncubationBatch = {
      id: `inc-${Date.now()}`,
      batchNumber: batchNumber.trim(),
      incubatorName: incubatorName.trim(),
      eggCount: Number(eggCount),
      startDate,
      candlingDate: candling.toISOString().split('T')[0],
      transferDate: transfer.toISOString().split('T')[0],
      hatchDate: hatch.toISOString().split('T')[0],
      candlingDone: false,
      fertileEggs: 0,
      infertileEggs: 0,
      hatchedDone: false,
      hatchedChicks: 0,
      weakChicks: 0,
      deadInShell: 0,
      status: 'incubating',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    await db.incubationBatches.add(newBatch);
    toast(`تم إنشاء الدفعة (${newBatch.batchNumber}) وتوليد الجدول الزمني للـ 17 يوماً بنجاح!`, 'success');
    setShowAddBatchModal(false);
  };

  // Submit Candling
  const handleSaveCandling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchForCandling) return;

    const fertile = Number(fertileEggsInput);
    const infertile = Number(infertileEggsInput);

    if (fertile + infertile > activeBatchForCandling.eggCount) {
      toast('مجموع البيض المخصب وغير المخصب أكبر من إجمالي بيض الدفعة!', 'error');
      return;
    }

    await db.incubationBatches.update(activeBatchForCandling.id, {
      candlingDone: true,
      fertileEggs: fertile,
      infertileEggs: infertile,
      status: 'candled',
    });

    const fertilityRate = Math.round((fertile / activeBatchForCandling.eggCount) * 100);
    toast(`تم تسجيل الفحص الضوئي بنجاح! نسبة الخصوبة: ${fertilityRate}%`, 'success');
    setActiveBatchForCandling(null);
  };

  // Confirm Transfer to Hatcher Baskets (Day 14)
  const handleTransferToBaskets = async (batch: IncubationBatch) => {
    if (confirm(`هل تم إيقاف التقليب ونقل بيض الدفعة (${batch.batchNumber}) إلى سلات الفقاس (اليوم 14)؟`)) {
      await db.incubationBatches.update(batch.id, {
        status: 'transferred',
      });
      toast(`تم تأكيد النقل لسلات الفقاس وخفض الحرارة ورفع الرطوبة للدفعة ${batch.batchNumber}`, 'success');
    }
  };

  // Submit Hatching (Day 17)
  const handleSaveHatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBatchForHatch) return;

    const healthy = Number(hatchedChicksInput);
    const weak = Number(weakChicksInput);
    const dead = Number(deadInShellInput);

    await db.incubationBatches.update(activeBatchForHatch.id, {
      hatchedDone: true,
      hatchedChicks: healthy,
      weakChicks: weak,
      deadInShell: dead,
      status: 'hatched',
    });

    // Fire celebration confetti!
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });

    const hatchRate =
      activeBatchForHatch.fertileEggs > 0
        ? Math.round((healthy / activeBatchForHatch.fertileEggs) * 100)
        : Math.round((healthy / activeBatchForHatch.eggCount) * 100);

    toast(
      `مبروك! تم اكتمال الفقس بنجاح وخروج ${healthy} صوص سليم (نسبة الفقس: ${hatchRate}%)!`,
      'success'
    );
    setActiveBatchForHatch(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <EggFried className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              إدارة الفقاسات والتحضين (Hatchery & Incubation)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            جدول زمني تلقائي لدورة تفريخ السمان (17 يوماً)، تتبع الفحص الضوئي، نسبة الخصوبة، ونسبة الفقس الفعلية.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>إدخال دفعة بيض جديدة</span>
        </button>
      </div>

      {/* Batches Cards */}
      <div className="space-y-6">
        {batches && batches.length > 0 ? (
          batches.map((batch) => {
            const {
              currentDay,
              progressPercent,
              isCandlingDue,
              isTransferDue,
              isHatchDue,
              fertilityRate,
              hatchabilityRate,
            } = calculateBatchProgress(batch);

            return (
              <div
                key={batch.id}
                className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-5"
              >
                {/* Top Row: Batch Info & Status */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-base shrink-0">
                      {batch.batchNumber.split('-').pop() || 'D'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-slate-900">
                          {batch.batchNumber} - {batch.incubatorName}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            batch.status === 'hatched'
                              ? 'bg-emerald-100 text-emerald-800'
                              : batch.status === 'transferred'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {batch.status === 'hatched'
                            ? 'اكتمل الفقس'
                            : batch.status === 'transferred'
                            ? 'في سلات الفقاس (أيام التفقيس)'
                            : 'قيد التقليب والتحضين'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        تاريخ الإدخال: <b className="font-mono text-slate-700">{batch.startDate}</b> • عدد البيض المدخل:{' '}
                        <b className="font-mono text-slate-900 text-sm">{batch.eggCount} بيضة</b>
                      </div>
                    </div>
                  </div>

                  {/* Rates Badges */}
                  <div className="flex items-center gap-3">
                    {fertilityRate !== null && (
                      <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-right">
                        <div className="text-[10px] text-emerald-700 font-bold">نسبة الخصوبة</div>
                        <div className="text-base font-black text-emerald-800 font-mono">
                          {fertilityRate}%
                        </div>
                      </div>
                    )}

                    {hatchabilityRate !== null && (
                      <div className="px-3.5 py-2 rounded-2xl bg-teal-50 border border-teal-200 text-right">
                        <div className="text-[10px] text-teal-700 font-bold">نسبة الفقس الفعلية</div>
                        <div className="text-base font-black text-teal-800 font-mono">
                          {hatchabilityRate}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 17-Day Visual Timeline Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <span>تقدم دورة التفريخ: اليوم {currentDay} من 17</span>
                    </span>
                    <span className="font-mono text-purple-700">{progressPercent}%</span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* 3 Milestones Markers */}
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    {/* Milestone 1: Candling */}
                    <div
                      className={`p-2.5 rounded-2xl border text-xs ${
                        batch.candlingDone
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : isCandlingDue
                          ? 'bg-amber-50 border-amber-300 text-amber-900 animate-pulse font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="text-[10px] font-bold">المرحلة 1: الفحص الضوئي</div>
                      <div className="font-mono font-semibold">اليوم 7-10 ({batch.candlingDate})</div>
                      <div className="text-[10px] mt-0.5">
                        {batch.candlingDone
                          ? `تم الفحص (${batch.fertileEggs} مخصب)`
                          : isCandlingDue
                          ? 'حان موعد الفحص الآن!'
                          : 'قريباً'}
                      </div>
                    </div>

                    {/* Milestone 2: Transfer to Baskets */}
                    <div
                      className={`p-2.5 rounded-2xl border text-xs ${
                        batch.status === 'transferred' || batch.hatchedDone
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : isTransferDue
                          ? 'bg-blue-50 border-blue-300 text-blue-900 animate-pulse font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="text-[10px] font-bold">المرحلة 2: نقل لسلات الفقاس</div>
                      <div className="font-mono font-semibold">اليوم 14 ({batch.transferDate})</div>
                      <div className="text-[10px] mt-0.5">
                        {batch.status === 'transferred' || batch.hatchedDone
                          ? 'تم النقل وإيقاف التقليب'
                          : isTransferDue
                          ? 'حان موعد النقل الآن!'
                          : 'قريباً'}
                      </div>
                    </div>

                    {/* Milestone 3: Hatch Day */}
                    <div
                      className={`p-2.5 rounded-2xl border text-xs ${
                        batch.hatchedDone
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : isHatchDue
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 animate-pulse font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="text-[10px] font-bold">المرحلة 3: يوم الفقس</div>
                      <div className="font-mono font-semibold">اليوم 17 ({batch.hatchDate})</div>
                      <div className="text-[10px] mt-0.5">
                        {batch.hatchedDone
                          ? `اكتمل (${batch.hatchedChicks} صوص سليم)`
                          : isHatchDue
                          ? 'يوم الفقس! سجل النتائج'
                          : 'قريباً'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar for this Batch */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    {batch.notes ? `ملاحظات: ${batch.notes}` : ''}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Candling Button */}
                    {!batch.candlingDone && (
                      <button
                        onClick={() => {
                          setActiveBatchForCandling(batch);
                          setFertileEggsInput(Math.round(batch.eggCount * 0.85));
                          setInfertileEggsInput(Math.round(batch.eggCount * 0.15));
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold flex items-center gap-1.5 transition-colors border border-purple-200"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>تسجيل الفحص الضوئي</span>
                      </button>
                    )}

                    {/* Transfer to Baskets Button */}
                    {batch.status !== 'transferred' && batch.status !== 'hatched' && (
                      <button
                        onClick={() => handleTransferToBaskets(batch)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold flex items-center gap-1.5 transition-colors border border-blue-200"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>تأكيد النقل للسلات (اليوم 14)</span>
                      </button>
                    )}

                    {/* Complete Hatch Button */}
                    {!batch.hatchedDone && (
                      <button
                        onClick={() => {
                          setActiveBatchForHatch(batch);
                          const basis = batch.candlingDone ? batch.fertileEggs : batch.eggCount;
                          setHatchedChicksInput(Math.round(basis * 0.88));
                          setWeakChicksInput(10);
                          setDeadInShellInput(Math.round(basis * 0.1));
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>تسجيل اكتمال الفقس (اليوم 17)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-3xl glass-panel text-slate-400">
            <EggFried className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-bold">لا توجد دفعات بيض في الفقاسات حالياً</p>
            <p className="text-xs mt-1">انقر على "إدخال دفعة بيض جديدة" لبدء دورة التفريخ</p>
          </div>
        )}
      </div>

      {/* Modal 1: Add Batch */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-purple-600">
                <EggFried className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  إدخال دفعة بيض جديدة في الفقاسة
                </h3>
              </div>
              <button
                onClick={() => setShowAddBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم أو كود الدفعة
                </label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full glass-input font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم أو رقم الفقاسة
                </label>
                <input
                  type="text"
                  required
                  value={incubatorName}
                  onChange={(e) => setIncubatorName(e.target.value)}
                  placeholder="مثال: فقاسة الصقر 1"
                  className="w-full glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    عدد البيض المدخل
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={eggCount}
                    onChange={(e) => setEggCount(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الإدخال
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 text-xs text-purple-900 space-y-1">
                <div className="font-bold">سيقوم النظام بجدولة تلقائية كالتالي:</div>
                <div>• الفحص الضوئي: اليوم 8</div>
                <div>• النقل لسلات الفقاس: اليوم 14</div>
                <div>• الفقس وخروج الصوص: اليوم 17</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات الدفعة (مصدر البيض)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="بيض أمهات بطارية أ وب، أو مورد خارجي..."
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  حفظ وبدء التحضين
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Candling Record */}
      {activeBatchForCandling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-purple-600">
                <Eye className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل الفحص الضوئي (Candling Check)
                </h3>
              </div>
              <button
                onClick={() => setActiveBatchForCandling(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              الدفعة: {activeBatchForCandling.batchNumber} (إجمالي البيض المدخل:{' '}
              {activeBatchForCandling.eggCount} بيضة)
            </p>

            <form onSubmit={handleSaveCandling} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    البيض المخصب (السليم)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={activeBatchForCandling.eggCount}
                    required
                    value={fertileEggsInput}
                    onChange={(e) => setFertileEggsInput(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    غير مخصب (لايح/فاسد)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={infertileEggsInput}
                    onChange={(e) => setInfertileEggsInput(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold text-rose-700"
                  />
                </div>
              </div>

              {fertileEggsInput > 0 && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex justify-between items-center text-emerald-950 font-bold">
                  <span>نسبة الخصوبة المحسوبة:</span>
                  <span className="text-base font-black font-mono text-emerald-800">
                    {Math.round((fertileEggsInput / activeBatchForCandling.eggCount) * 100)}%
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  حفظ واعتماد نتيجة الفحص
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBatchForCandling(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Hatch Complete (Day 17) */}
      {activeBatchForHatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل نتائج الفقس وخروج الصوص (اليوم 17)
                </h3>
              </div>
              <button
                onClick={() => setActiveBatchForHatch(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              الدفعة: {activeBatchForHatch.batchNumber} (البيض المخصب:{' '}
              {activeBatchForHatch.fertileEggs || activeBatchForHatch.eggCount})
            </p>

            <form onSubmit={handleSaveHatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الصوص الفاقس السليم (نخب أول جاهز للتحضين)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={hatchedChicksInput}
                  onChange={(e) => setHatchedChicksInput(Number(e.target.value))}
                  className="w-full glass-input text-center text-xl font-mono font-black text-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    صوص ضعيف / فرز ثانٍ
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={weakChicksInput}
                    onChange={(e) => setWeakChicksInput(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ميت داخل البيضة (Dead in shell)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deadInShellInput}
                    onChange={(e) => setDeadInShellInput(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold"
                  />
                </div>
              </div>

              {hatchedChicksInput > 0 && (
                <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-xs flex justify-between items-center text-teal-950 font-bold">
                  <span>نسبة الفقس الفعلية (Hatchability):</span>
                  <span className="text-base font-black font-mono text-teal-800">
                    {activeBatchForHatch.fertileEggs > 0
                      ? Math.round((hatchedChicksInput / activeBatchForHatch.fertileEggs) * 100)
                      : Math.round((hatchedChicksInput / activeBatchForHatch.eggCount) * 100)}%
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  اعتماد اكتمال الفقس
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBatchForHatch(null)}
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
