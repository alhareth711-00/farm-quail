import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { DetailedMortalityRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDataTable } from '../../hooks/useDataTable';
import {
  Skull,
  Plus,
  Clock,
  MapPin,
  AlertTriangle,
  Grid,
  Warehouse,
  ShieldAlert,
  Trash2,
  X,
  Search,
  Filter,
} from 'lucide-react';

export const MortalityLogView: React.FC = () => {
  const { userName } = useAuth();
  const { toast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];
  const timeNowStr = new Date().toTimeString().slice(0, 5);

  const mortalityLogs = useLiveQuery(
    () => db.detailedMortality.reverse().sortBy('date'),
    []
  );
  const batteries = useLiveQuery(() => db.batteries.toArray(), []);
  const tiers = useLiveQuery(() => db.tiers.toArray(), []);
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);
  const broodingBatches = useLiveQuery(() => db.broodingBatches.toArray(), []);

  // Filter
  const [filterGender, setFilterGender] = useState<string>('all');
  const [filterLocationType, setFilterLocationType] = useState<string>('all');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(timeNowStr);
  const [description, setDescription] = useState('طبيعي / مفاجئ');
  const [mortalityReason, setMortalityReason] = useState('طبيعي / مفاجئ');
  const [ageAtDeathText, setAgeAtDeathText] = useState('طير بالغ');
  const [gender, setGender] = useState<'male' | 'female' | 'mixed' | 'unidentified'>('female');
  const [locationType, setLocationType] = useState<'battery' | 'room' | 'quarantine' | 'annex' | 'brooding'>('battery');
  
  // Specific battery location
  const [selectedBatteryId, setSelectedBatteryId] = useState('');
  const [selectedTierNumber, setSelectedTierNumber] = useState<1 | 2 | 3 | 4>(1);
  const [cageNumber, setCageNumber] = useState('قفص 1');

  // Specific room location
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Specific brooding batch location
  const [selectedBroodingBatchId, setSelectedBroodingBatchId] = useState('');

  const [quantity, setQuantity] = useState<number>(1);
  const [disposalMethod, setDisposalMethod] = useState<'burial' | 'incineration' | 'quarantine_transfer' | 'other'>('burial');
  const [notes, setNotes] = useState('');

  const handleOpenAddModal = () => {
    setDate(todayStr);
    setTime(new Date().toTimeString().slice(0, 5));
    setDescription('طبيعي / مفاجئ');
    setMortalityReason('طبيعي / مفاجئ');
    setAgeAtDeathText('طير بالغ');
    setGender('female');
    setLocationType('battery');
    if (batteries && batteries.length > 0) setSelectedBatteryId(batteries[0].id);
    setSelectedTierNumber(1);
    setCageNumber('قفص 1');
    if (rooms && rooms.length > 0) setSelectedRoomId(rooms[0].id);
    setQuantity(1);
    setDisposalMethod('burial');
    setNotes('');
    setShowAddModal(true);
  };

  const handleOpenBroodingMortality = () => {
    setDate(todayStr);
    setTime(new Date().toTimeString().slice(0, 5));
    setDescription('نفوق صيصان تحضين');
    setMortalityReason('ضعف صوص اعتيادي');
    setAgeAtDeathText('كتكوت تحضين');
    setGender('mixed');
    setLocationType('brooding');
    const activeBatch = broodingBatches?.find((b) => b.status === 'active') || broodingBatches?.[0];
    if (activeBatch) setSelectedBroodingBatchId(activeBatch.id);
    setQuantity(1);
    setDisposalMethod('burial');
    setNotes('');
    setShowAddModal(true);
  };

  const handleSaveMortality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || isNaN(quantity) || quantity <= 0) {
      toast('يرجى إدخال عدد صحيح للطيور النافقة أكبر من الصفر', 'error');
      return;
    }

    let batName: string | undefined = undefined;
    let rmName: string | undefined = undefined;
    let exactLocationText = '';
    let finalAgeAtDeath = ageAtDeathText || 'طير بالغ';
    let finalAgeAtDeathDays: number | undefined = undefined;
    let broodId: string | undefined = undefined;
    let broodNum: string | undefined = undefined;

    if (locationType === 'brooding') {
      const bBatch = broodingBatches?.find((b) => b.id === selectedBroodingBatchId);
      if (!bBatch) {
        toast('يرجى اختيار دفعة التحضين المستهدفة', 'error');
        return;
      }
      if (quantity > bBatch.currentChicksCount) {
        toast(
          `⚠️ عدد الكتاكيت النافقة المدخل (${quantity}) أكبر من الرصيد المتوفر بالدفعة (${bBatch.currentChicksCount})!`,
          'error'
        );
        return;
      }

      // Calculate chick age in days at the chosen date
      const hDate = new Date(bBatch.hatchDate);
      const mDate = new Date(date || todayStr);
      const ageDays = Math.max(1, Math.floor((mDate.getTime() - hDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      finalAgeAtDeath = `عمر ${ageDays} يوم (الأسبوع ${Math.min(5, Math.ceil(ageDays / 7))})`;
      finalAgeAtDeathDays = ageDays;
      broodId = bBatch.id;
      broodNum = bBatch.batchNumber;
      rmName = bBatch.locationName;
      exactLocationText = `حضانة كتاكيت - دفعة (${bBatch.batchNumber}) - ${bBatch.locationName}`;

      // Deduct from brooding batch
      await db.broodingBatches.update(bBatch.id, {
        currentChicksCount: Math.max(0, bBatch.currentChicksCount - quantity),
        mortalityCount: (bBatch.mortalityCount || 0) + quantity,
        updatedAt: new Date().toISOString(),
      });
    } else if (locationType === 'battery') {
      const bat = batteries?.find((b) => b.id === selectedBatteryId);
      batName = bat?.name || 'أ';
      exactLocationText = `بطارية (${batName}) - الدور ${selectedTierNumber} - ${cageNumber}`;

      // Deduct from tier live birds
      const targetTier = tiers?.find(
        (t) => t.batteryId === selectedBatteryId && t.tierNumber === selectedTierNumber
      );
      if (targetTier) {
        const available = gender === 'male' ? targetTier.malesCount : targetTier.femalesCount;
        if (quantity > available) {
          toast(
            `⚠️ عدد الطيور النافقة المدخل (${quantity}) أكبر من الرصيد المتوفر في هذا الدور (${available})!`,
            'error'
          );
          return;
        }

        if (gender === 'male') {
          await db.tiers.update(targetTier.id, {
            malesCount: Math.max(0, targetTier.malesCount - quantity),
          });
        } else {
          await db.tiers.update(targetTier.id, {
            femalesCount: Math.max(0, targetTier.femalesCount - quantity),
          });
        }
      }
    } else {
      const rm = rooms?.find((r) => r.id === selectedRoomId);
      rmName = rm?.name || 'غرفة';
      exactLocationText = `${rmName}`;

      // Deduct from room live birds
      if (rm) {
        const available = gender === 'male' ? rm.malesCount : rm.femalesCount;
        if (quantity > available) {
          toast(
            `⚠️ عدد الطيور النافقة المدخل (${quantity}) أكبر من الرصيد المتوفر في هذه الغرفة (${available})!`,
            'error'
          );
          return;
        }

        if (gender === 'male') {
          await db.rooms.update(rm.id, {
            malesCount: Math.max(0, rm.malesCount - quantity),
          });
        } else {
          await db.rooms.update(rm.id, {
            femalesCount: Math.max(0, rm.femalesCount - quantity),
          });
        }
      }
    }

    const record: DetailedMortalityRecord = {
      id: `dm-${Date.now()}`,
      date,
      time,
      description: notes.trim() ? `${mortalityReason.trim()} (${notes.trim()})` : mortalityReason.trim(),
      gender: locationType === 'brooding' ? 'mixed' : gender,
      locationType,
      batteryName: batName,
      tierNumber: locationType === 'battery' ? selectedTierNumber : undefined,
      cageNumber: locationType === 'battery' ? cageNumber : undefined,
      roomName: rmName,
      exactLocationText,
      quantity: Number(quantity),
      disposalMethod,
      mortalityReason: mortalityReason.trim(),
      ageAtDeath: finalAgeAtDeath,
      ageAtDeathDays: finalAgeAtDeathDays,
      broodingBatchId: broodId,
      broodingBatchNumber: broodNum,
      recordedBy: userName || 'مشرف المزرعة',
      createdAt: new Date().toISOString(),
    };

    await db.detailedMortality.add(record);
    toast(`تم تسجيل النافق في [${exactLocationText}] وخصمه من القطيع بنجاح!`, 'success');
    setShowAddModal(false);
  };

  const handleDeleteRecord = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await db.detailedMortality.delete(id);
      toast('تم حذف السجل بنجاح', 'info');
    }
  };

  const filteredLogs = React.useMemo(() => {
    return (
      mortalityLogs?.filter((l) => {
        if (filterGender !== 'all' && l.gender !== filterGender) return false;
        if (filterLocationType !== 'all' && l.locationType !== filterLocationType) return false;
        return true;
      }) || []
    );
  }, [mortalityLogs, filterGender, filterLocationType]);

  const { sortedData: sortedMortalityLogs, SortHeader } = useDataTable(filteredLogs, {
    initialKey: 'dateTime',
    initialDirection: 'desc',
    getters: {
      dateTime: (l) => `${l.date} ${l.time}`,
      mortalityReason: (l) => l.mortalityReason || l.description || '',
      ageAtDeath: (l) => l.ageAtDeathDays ?? (l.ageAtDeath || ''),
      quantity: (l) => Number(l.quantity) || 0,
      description: (l) => l.description || '',
      gender: (l) => l.gender || '',
      location: (l) => l.exactLocationText || '',
      disposalMethod: (l) => l.disposalMethod || '',
      recordedBy: (l) => l.recordedBy || '',
    },
  });

  const totalMortalityToday =
    mortalityLogs?.filter((l) => l.date === todayStr).reduce((acc, l) => acc + l.quantity, 0) || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Skull className="w-6 h-6 text-rose-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              سجل النفوق التفصيلي والتشريح (Detailed Mortality Log)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل دقيق للنافق بالبيان، الجنس (ذكر/أنثى)، والمكان الدقيق (رقم البطارية، الدور، والقفص، أو رقم الغرفة والمعزولات) مع الخصم التلقائي.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenBroodingMortality}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
          >
            <span className="text-sm">🐣</span>
            <span>تسجيل نفوق صيصان التحضين</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>تسجيل نافق قطيع جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl glass-card border border-rose-200 bg-rose-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-900">إجمالي النافق المسجل اليوم</span>
            <Skull className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-3xl font-black text-rose-950 font-mono">
            {totalMortalityToday} طائر
          </div>
          <div className="text-[11px] text-rose-700 mt-1">
            كافة أقسام المزرعة اليوم
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900">نفوق صيصان التحضين</span>
            <span className="text-base">🐣</span>
          </div>
          <div className="text-3xl font-black text-amber-950 font-mono">
            {mortalityLogs?.filter((l) => l.locationType === 'brooding' && l.date === todayStr).reduce((a, b) => a + b.quantity, 0) || 0} صوص
          </div>
          <div className="text-[11px] text-amber-700 mt-1">
            في أقسام وحضانات الصيصان اليوم
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">نفوق الشبوك / البطاريات</span>
            <Grid className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            {mortalityLogs?.filter((l) => l.locationType === 'battery' && l.date === todayStr).reduce((a, b) => a + b.quantity, 0) || 0} طائر
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            في بطاريات الأقفاص اليوم
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">نفوق الغرف والمعزولات</span>
            <Warehouse className="w-5 h-5 text-sky-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            {mortalityLogs?.filter((l) => l.locationType !== 'battery' && l.locationType !== 'brooding' && l.date === todayStr).reduce((a, b) => a + b.quantity, 0) || 0} طائر
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            في التربية الأرضية وقسم العزل اليوم
          </div>
        </div>
      </div>

      {/* Table & Filter */}
      <div className="rounded-3xl glass-panel p-5 border border-slate-200/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">تصفية السجل:</span>

            {/* Gender Filter */}
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="glass-input text-xs py-1.5"
            >
              <option value="all">كافة الأجناس</option>
              <option value="female">إناث فقط</option>
              <option value="male">ذكور فقط</option>
              <option value="mixed">مختلط</option>
            </select>

            {/* Location Type Filter */}
            <select
              value={filterLocationType}
              onChange={(e) => setFilterLocationType(e.target.value)}
              className="glass-input text-xs py-1.5"
            >
              <option value="all">كافة الأماكن</option>
              <option value="brooding">حضانات الكتاكيت (التحضين) 🐣</option>
              <option value="battery">أقفاص البطاريات</option>
              <option value="room">غرف التربية (1-7)</option>
              <option value="quarantine">قسم المعزولات</option>
            </select>
          </div>

          <span className="text-xs font-mono text-slate-400">
            إجمالي السجلات: {sortedMortalityLogs.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
              <tr>
                <SortHeader field="dateTime" align="right">التاريخ والوقت</SortHeader>
                <SortHeader field="mortalityReason" align="right">سبب النفوق</SortHeader>
                <SortHeader field="ageAtDeath" align="center">العمر عند النفوق</SortHeader>
                <SortHeader field="description" align="right">البيان / الأعراض الملاحظة</SortHeader>
                <SortHeader field="gender">الجنس</SortHeader>
                <SortHeader field="location" align="right">المكان الدقيق (قفص ودور / غرفة / حضانة)</SortHeader>
                <SortHeader field="quantity">العدد</SortHeader>
                <SortHeader field="disposalMethod" align="right">الإجراء المتخذ</SortHeader>
                <SortHeader field="recordedBy" align="right">المسجل</SortHeader>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMortalityLogs && sortedMortalityLogs.length > 0 ? (
                sortedMortalityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono">
                      <div className="font-bold text-slate-900">{log.date}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{log.time}</span>
                      </div>
                    </td>

                    {/* New column: سبب النفوق */}
                    <td className="p-3.5">
                      <span className="text-xs font-bold text-slate-800 bg-slate-100/90 border border-slate-200 px-2.5 py-1 rounded-xl inline-block shadow-2xs">
                        {log.mortalityReason || log.description?.split('(')[0]?.trim() || 'طبيعي / مفاجئ'}
                      </span>
                    </td>

                    {/* New column: العمر عند النفوق */}
                    <td className="p-3.5 text-center font-mono">
                      {log.ageAtDeath ? (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            log.locationType === 'brooding'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}
                        >
                          {log.ageAtDeath}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-sans">طير بالغ</span>
                      )}
                    </td>

                    <td className="p-3.5 font-bold text-slate-800">
                      {log.description}
                    </td>

                    <td className="p-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.gender === 'female'
                            ? 'bg-rose-100 text-rose-800'
                            : log.gender === 'male'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.gender === 'female' ? 'أنثى' : log.gender === 'male' ? 'ذكر' : 'مختلط'}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{log.exactLocationText}</span>
                      </div>
                    </td>

                    <td className="p-3.5 text-center font-mono font-black text-rose-700 text-sm">
                      {log.quantity}
                    </td>

                    <td className="p-3.5 text-slate-600 text-[11px]">
                      {log.disposalMethod === 'burial'
                        ? 'دفن صحي'
                        : log.disposalMethod === 'incineration'
                        ? 'حرق وإتلاف'
                        : 'تحويل للمختبر / عزل'}
                    </td>

                    <td className="p-3.5 text-slate-500 font-medium">
                      {log.recordedBy}
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteRecord(log.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    لا توجد حالات نفوق مسجلة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Detailed Mortality */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <Skull className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل نافق تفصيلي وتحديد المكان الدقيق
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMortality} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ التسجيل
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوقت
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full glass-input text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* Location Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الموقع الرئيسي
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLocationType('brooding');
                      setGender('mixed');
                      setMortalityReason('ضعف صوص اعتيادي');
                      if (broodingBatches && broodingBatches.length > 0 && !selectedBroodingBatchId) {
                        setSelectedBroodingBatchId(broodingBatches[0].id);
                      }
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      locationType === 'brooding'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>🐣</span>
                    <span>حضانات التحضين</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationType('battery');
                      if (gender === 'mixed') setGender('female');
                      setMortalityReason('طبيعي / مفاجئ');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      locationType === 'battery'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    أقفاص البطاريات
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationType('room');
                      if (gender === 'mixed') setGender('female');
                      setMortalityReason('طبيعي / مفاجئ');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      locationType === 'room'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    غرف التربية (1-7)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationType('quarantine');
                      if (gender === 'mixed') setGender('female');
                      setMortalityReason('طبيعي / مفاجئ');
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      locationType === 'quarantine'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    قسم المعزولات
                  </button>
                </div>
              </div>

              {/* Specific Location Fields */}
              {locationType === 'brooding' ? (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">اختيار دفعة التحضين المستهدفة:</span>
                    <span className="text-xs bg-amber-200 text-amber-900 font-mono px-2 py-0.5 rounded-lg font-bold">
                      {broodingBatches?.filter((b) => b.status === 'active').length || 0} دفعة نشطة
                    </span>
                  </div>

                  {broodingBatches && broodingBatches.length > 0 ? (
                    <select
                      value={selectedBroodingBatchId}
                      onChange={(e) => setSelectedBroodingBatchId(e.target.value)}
                      className="w-full glass-input text-xs font-bold text-slate-800 bg-white"
                    >
                      {broodingBatches.map((b) => {
                        const hDate = new Date(b.hatchDate);
                        const mDate = new Date(date || todayStr);
                        const ageCalc = Math.max(
                          1,
                          Math.floor((mDate.getTime() - hDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        );
                        return (
                          <option key={b.id} value={b.id}>
                            {b.batchNumber} - {b.locationName} (عمر {ageCalc} يوم | الحي: {b.currentChicksCount})
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="text-xs text-rose-600 font-bold p-2 bg-rose-50 rounded-xl">
                      لا توجد أي دفعات تحضين مسجلة بالنظام حالياً!
                    </div>
                  )}

                  {/* Active batch info summary card */}
                  {(() => {
                    const bBatch =
                      broodingBatches?.find((b) => b.id === selectedBroodingBatchId) || broodingBatches?.[0];
                    if (!bBatch) return null;
                    const hDate = new Date(bBatch.hatchDate);
                    const mDate = new Date(date || todayStr);
                    const ageCalc = Math.max(
                      1,
                      Math.floor((mDate.getTime() - hDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                    );
                    return (
                      <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-[11px] space-y-1">
                        <div className="flex justify-between text-slate-700">
                          <span>الموقع الحالي:</span>
                          <span className="font-bold">{bBatch.locationName}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>تاريخ الفقس:</span>
                          <span className="font-mono font-bold">{bBatch.hatchDate}</span>
                        </div>
                        <div className="flex justify-between text-amber-800">
                          <span>العمر المحسوب عند تاريخ النفوق:</span>
                          <span className="font-mono font-bold">
                            {ageCalc} يوم (الأسبوع {Math.min(5, Math.ceil(ageCalc / 7))})
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-100">
                          <span>الرصيد الحي المتاح بالدفعة:</span>
                          <span className="font-mono font-black text-rose-600 text-xs">
                            {bBatch.currentChicksCount} كتكوت
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : locationType === 'battery' ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-[11px] font-bold text-slate-700">
                    تحديد المكان الدقيق في عنبر البطاريات:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">رقم البطارية</label>
                      <select
                        value={selectedBatteryId}
                        onChange={(e) => setSelectedBatteryId(e.target.value)}
                        className="w-full glass-input text-xs py-1.5"
                      >
                        {batteries?.map((b) => (
                          <option key={b.id} value={b.id}>
                            بطارية ({b.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">رقم الدور (1-4)</label>
                      <select
                        value={selectedTierNumber}
                        onChange={(e) => setSelectedTierNumber(Number(e.target.value) as any)}
                        className="w-full glass-input text-xs py-1.5"
                      >
                        <option value={1}>الدور 1 (علوي)</option>
                        <option value={2}>الدور 2</option>
                        <option value={3}>الدور 3</option>
                        <option value={4}>الدور 4 (سفلي)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">رقم القفص</label>
                      <input
                        type="text"
                        value={cageNumber}
                        onChange={(e) => setCageNumber(e.target.value)}
                        placeholder="قفص 1"
                        className="w-full glass-input text-xs py-1.5 font-mono text-center"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اختر الغرفة أو القسم
                  </label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full glass-input text-xs"
                  >
                    {rooms?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الجنس
                  </label>
                  {locationType === 'brooding' ? (
                    <input
                      type="text"
                      disabled
                      value="مختلط (صوص تحضين)"
                      className="w-full glass-input text-xs font-bold bg-amber-50/50 text-amber-900 border-amber-200"
                    />
                  ) : (
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full glass-input text-xs font-bold"
                    >
                      <option value="female">أنثى</option>
                      <option value="male">ذكر</option>
                      <option value="mixed">مختلط</option>
                      <option value="unidentified">غير محدد</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    العدد النافق <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-black text-rose-700"
                  />
                </div>
              </div>

              {/* Cause & Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  سبب النفوق <span className="text-rose-500">*</span>
                </label>
                {locationType === 'brooding' ? (
                  <select
                    value={mortalityReason}
                    onChange={(e) => setMortalityReason(e.target.value)}
                    className="w-full glass-input text-xs mb-2 font-bold bg-white"
                  >
                    <option value="ضعف صوص اعتيادي">ضعف صوص اعتيادي (طفرة أو حجم صغير)</option>
                    <option value="خلل في التدفئة / انخفاض الحرارة">خلل في التدفئة / انخفاض الحرارة</option>
                    <option value="تزاحم ودهس واختناق">تزاحم ودهس واختناق</option>
                    <option value="عدم امتصاص كيس المح">عدم امتصاص كيس المح (Omphalitis)</option>
                    <option value="مرض معوي أو إسهال">مرض معوي أو إسهال</option>
                    <option value="مرض تنفسي">مرض تنفسي</option>
                    <option value="عوامل بيئية / تهوية ورطوبة">عوامل بيئية / تهوية ورطوبة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                ) : (
                  <select
                    value={mortalityReason}
                    onChange={(e) => setMortalityReason(e.target.value)}
                    className="w-full glass-input text-xs mb-2 font-bold bg-white"
                  >
                    <option value="طبيعي / مفاجئ">طبيعي / مفاجئ</option>
                    <option value="إجهاد حراري">إجهاد حراري</option>
                    <option value="انسداد بيضة (Egg Bound)">انسداد بيضة (Egg Bound)</option>
                    <option value="تزاحم / دهس في الأركان">تزاحم / دهس في الأركان</option>
                    <option value="افتراس أو جروح">افتراس أو جروح</option>
                    <option value="أعراض تنفسية">أعراض تنفسية</option>
                    <option value="ضعف عام واستبعاد">ضعف عام واستبعاد (Culling)</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                )}
              </div>

              {/* Age at Death (if not brooding, allow custom) */}
              {locationType !== 'brooding' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    العمر عند النفوق (تقديري / وصفي)
                  </label>
                  <input
                    type="text"
                    value={ageAtDeathText}
                    onChange={(e) => setAgeAtDeathText(e.target.value)}
                    placeholder="مثال: طير بالغ، أو عمر 16 أسبوع..."
                    className="w-full glass-input text-xs font-bold"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات تشريحية أو أعراض إضافية
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات تشريحية أو أعراض إضافية..."
                  className="w-full glass-input text-xs"
                />
              </div>

              {/* Disposal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الإجراء المتخذ والتخلص الصحي
                </label>
                <select
                  value={disposalMethod}
                  onChange={(e) => setDisposalMethod(e.target.value as any)}
                  className="w-full glass-input text-xs"
                >
                  <option value="burial">دفن صحي مع جير حي</option>
                  <option value="incineration">حرق وإتلاف في المحرقة</option>
                  <option value="quarantine_transfer">نقل لقسم المعزولات للتشخيص</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  تأكيد وخصم النافق من الموقع المحدد
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
