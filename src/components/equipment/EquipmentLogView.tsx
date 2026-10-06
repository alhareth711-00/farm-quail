import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { EquipmentLog, EquipmentType, EquipmentRunStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Fan,
  Plus,
  Clock,
  Thermometer,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Lightbulb,
  Cpu,
  Trash2,
  X,
  Building,
  Power,
  Layers,
} from 'lucide-react';

export const EquipmentLogView: React.FC = () => {
  const { userName } = useAuth();
  const { toast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];
  const timeNowStr = new Date().toTimeString().slice(0, 5);

  const equipmentLogs = useLiveQuery(
    () => db.equipmentLogs.reverse().sortBy('date'),
    []
  );
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);
  const batteries = useLiveQuery(() => db.batteries.toArray(), []);

  // Filter
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(timeNowStr);
  const [locationCategory, setLocationCategory] = useState<'room' | 'battery' | 'quarantine' | 'annex'>('room');
  const [selectedLocationId, setSelectedLocationId] = useState('room-1');
  const [equipmentType, setEquipmentType] = useState<EquipmentType>('exhaust_fans');
  const [customEquipmentName, setCustomEquipmentName] = useState('');
  const [status, setStatus] = useState<EquipmentRunStatus>('running');
  const [operatingHours, setOperatingHours] = useState<number>(8);
  const [tempCelsius, setTempCelsius] = useState<number>(24);
  const [humidity, setHumidity] = useState<number>(55);
  const [notes, setNotes] = useState('');

  const equipmentTypeLabels: Record<EquipmentType, { label: string; icon: React.ReactNode }> = {
    exhaust_fans: { label: 'الشفاطات / المراوح', icon: <Fan className="w-4 h-4 text-sky-600" /> },
    cooling_pads: { label: 'خلايا ومضخات التبريد', icon: <Droplets className="w-4 h-4 text-teal-600" /> },
    heaters: { label: 'السخانات والدفايات', icon: <Flame className="w-4 h-4 text-amber-600" /> },
    lighting: { label: 'الإضاءة والمؤقتات', icon: <Lightbulb className="w-4 h-4 text-yellow-600" /> },
    water_pumps: { label: 'مضخات المياه والتعقيم', icon: <Droplets className="w-4 h-4 text-blue-600" /> },
    other: { label: 'معدات وأجهزة أخرى', icon: <Cpu className="w-4 h-4 text-purple-600" /> },
  };

  const handleOpenAddModal = () => {
    setDate(todayStr);
    setTime(new Date().toTimeString().slice(0, 5));
    setLocationCategory('room');
    if (rooms && rooms.length > 0) setSelectedLocationId(rooms[0].id);
    setEquipmentType('exhaust_fans');
    setCustomEquipmentName('');
    setStatus('running');
    setOperatingHours(8);
    setTempCelsius(24);
    setHumidity(55);
    setNotes('');
    setShowAddModal(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();

    let locName = '';
    if (locationCategory === 'room' || locationCategory === 'quarantine' || locationCategory === 'annex') {
      const rm = rooms?.find((r) => r.id === selectedLocationId);
      locName = rm ? rm.name : 'غرفة';
    } else {
      const bat = batteries?.find((b) => b.id === selectedLocationId);
      locName = bat ? `عنبر البطاريات (${bat.name})` : 'عنبر البطاريات';
    }

    const newLog: EquipmentLog = {
      id: `eq-${Date.now()}`,
      date,
      time,
      locationType: locationCategory,
      locationId: selectedLocationId,
      locationName: locName,
      equipmentType,
      equipmentCustomName: equipmentType === 'other' ? customEquipmentName.trim() : undefined,
      status,
      operatingHours: Number(operatingHours),
      temperatureCelsius: Number(tempCelsius),
      humidityPercent: Number(humidity),
      notes: notes.trim(),
      operator: userName,
      createdAt: new Date().toISOString(),
    };

    await db.equipmentLogs.add(newLog);
    toast('تم تسجيل حالة تشغيل المعدة في السجل البيئي بنجاح!', 'success');
    setShowAddModal(false);
  };

  const handleDeleteLog = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      await db.equipmentLogs.delete(id);
      toast('تم حذف السجل بنجاح', 'info');
    }
  };

  const filteredLogs = equipmentLogs?.filter((l) => {
    if (filterType !== 'all' && l.equipmentType !== filterType) return false;
    if (filterLocation !== 'all' && l.locationType !== filterLocation) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Fan className="w-6 h-6 text-sky-600 animate-spin-slow" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              السجل البيئي ومتابعة تشغيل المعدات (Equipment & Environmental Log)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            سجل تشغيل الشفاطات والمراوح، خلايا التبريد، السخانات، الإضاءة، والمعدات الأخرى مع رصد الحرارة والرطوبة في الغرف والمعزولات.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>تسجيل تشغيل معدة</span>
        </button>
      </div>

      {/* KPI Cards: Active Equipment Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl glass-card border border-sky-200 bg-sky-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-900">الشفاطات والمراوح قيد التشغيل</span>
            <Fan className="w-5 h-5 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-950 font-mono">
            {equipmentLogs?.filter((l) => l.equipmentType === 'exhaust_fans' && l.status === 'running' && l.date === todayStr).length || 0}
          </div>
          <div className="text-[11px] text-sky-800 mt-1">
            في غرف التربية والبطاريات اليوم
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-teal-200 bg-teal-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-teal-900">خلايا ومضخات التبريد</span>
            <Droplets className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-950 font-mono">
            {equipmentLogs?.filter((l) => l.equipmentType === 'cooling_pads' && l.status === 'running' && l.date === todayStr).length || 0}
          </div>
          <div className="text-[11px] text-teal-800 mt-1">
            تبريد العنابر النشط
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900">سخانات التحضين</span>
            <Flame className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">
            {equipmentLogs?.filter((l) => l.equipmentType === 'heaters' && l.status === 'running' && l.date === todayStr).length || 0}
          </div>
          <div className="text-[11px] text-amber-800 mt-1">
            تدفئة غرف التحضين (غرفة 6 و 7)
          </div>
        </div>

        <div className="p-5 rounded-3xl glass-card border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">متوسط حرارة العنابر</span>
            <Thermometer className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            23°C - 24°C
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            ضمن النطاق المثالي لسمان البياض
          </div>
        </div>
      </div>

      {/* Filter and Log Table */}
      <div className="rounded-3xl glass-panel p-5 border border-slate-200/80 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600">تصفية السجل:</span>

            {/* Equipment Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="glass-input text-xs py-1.5"
            >
              <option value="all">جميع المعدات</option>
              <option value="exhaust_fans">الشفاطات / المراوح</option>
              <option value="cooling_pads">خلايا ومضخات التبريد</option>
              <option value="heaters">السخانات والدفايات</option>
              <option value="lighting">الإضاءة والمؤقتات</option>
              <option value="water_pumps">مضخات المياه</option>
              <option value="other">أجهزة أخرى</option>
            </select>

            {/* Location Filter */}
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="glass-input text-xs py-1.5"
            >
              <option value="all">كافة الأقسام والعنابر</option>
              <option value="room">غرف التربية (1-7)</option>
              <option value="quarantine">قسم المعزولات</option>
              <option value="annex">قسم الملحقات</option>
              <option value="battery">عنبر البطاريات</option>
            </select>
          </div>

          <span className="text-xs font-mono text-slate-400">
            عدد السجلات: {filteredLogs?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">التاريخ والوقت</th>
                <th className="p-3.5">الموقع / الغرفة</th>
                <th className="p-3.5">المعدة المسجلة</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">وقت التشغيل</th>
                <th className="p-3.5 text-center">الحرارة / الرطوبة</th>
                <th className="p-3.5">المسؤول والملاحظات</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs && filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const eq = equipmentTypeLabels[log.equipmentType] || {
                    label: log.equipmentType,
                    icon: <Cpu className="w-4 h-4" />,
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-slate-900">{log.date}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{log.time}</span>
                        </div>
                      </td>

                      <td className="p-3.5 font-bold text-slate-800">
                        {log.locationName}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900">
                          {eq.icon}
                          <span>
                            {log.equipmentType === 'other' && log.equipmentCustomName
                              ? log.equipmentCustomName
                              : eq.label}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            log.status === 'running'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'stopped'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.status === 'running'
                            ? 'قيد التشغيل'
                            : log.status === 'stopped'
                            ? 'متوقف'
                            : 'تحت الصيانة'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center font-mono font-bold text-slate-700">
                        {log.operatingHours ? `${log.operatingHours} ساعة` : '-'}
                      </td>

                      <td className="p-3.5 text-center font-mono">
                        <span className="text-rose-700 font-bold">{log.temperatureCelsius || 24}°C</span>
                        <span className="text-slate-300 mx-1">|</span>
                        <span className="text-blue-700 font-bold">{log.humidityPercent || 55}%</span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-700 text-[11px]">{log.operator}</div>
                        {log.notes && (
                          <div className="text-[10px] text-slate-400 line-clamp-1">{log.notes}</div>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    لا توجد سجلات تشغيل للمعدات مسجلة حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Equipment Log */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sky-600">
                <Fan className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل تشغيل معدة في السجل البيئي
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-4">
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
                    وقت التشغيل / الرصد
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

              {/* Location category selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  القسم المستهدف
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLocationCategory('room');
                      const rms = rooms?.filter((r) => r.category === 'room');
                      if (rms && rms.length > 0) setSelectedLocationId(rms[0].id);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      locationCategory === 'room'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    غرف (1-7)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationCategory('quarantine');
                      const q = rooms?.find((r) => r.category === 'quarantine');
                      if (q) setSelectedLocationId(q.id);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      locationCategory === 'quarantine'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    المعزولات
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationCategory('annex');
                      const a = rooms?.find((r) => r.category === 'annex');
                      if (a) setSelectedLocationId(a.id);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      locationCategory === 'annex'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    الملحقات
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocationCategory('battery');
                      if (batteries && batteries.length > 0) setSelectedLocationId(batteries[0].id);
                    }}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      locationCategory === 'battery'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    البطاريات (أ-س)
                  </button>
                </div>
              </div>

              {/* Sub-location selector */}
              {locationCategory === 'room' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اختر الغرفة المحددة
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full glass-input text-xs"
                  >
                    {rooms
                      ?.filter((r) => r.category === 'room')
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.purpose === 'layers' ? 'أمهات بياض' : r.purpose === 'fattening' ? 'تسمين' : 'تحضين'})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {locationCategory === 'battery' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اختر البطارية
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full glass-input text-xs"
                  >
                    {batteries?.map((b) => (
                      <option key={b.id} value={b.id}>
                        بطارية ({b.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Equipment Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نوع المعدة
                  </label>
                  <select
                    value={equipmentType}
                    onChange={(e) => setEquipmentType(e.target.value as any)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="exhaust_fans">الشفاطات / المراوح</option>
                    <option value="cooling_pads">خلايا ومضخات التبريد</option>
                    <option value="heaters">السخانات والدفايات</option>
                    <option value="lighting">الإضاءة والمؤقتات</option>
                    <option value="water_pumps">مضخات المياه والتعقيم</option>
                    <option value="other">أجهزة ومعدات أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    حالة التشغيل
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full glass-input text-xs font-bold"
                  >
                    <option value="running">قيد التشغيل (Running)</option>
                    <option value="stopped">متوقف (Stopped)</option>
                    <option value="maintenance">تحت الصيانة (Maintenance)</option>
                  </select>
                </div>
              </div>

              {/* If other equipment */}
              {equipmentType === 'other' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم ووصف المعدة الأخرى
                  </label>
                  <input
                    type="text"
                    required
                    value={customEquipmentName}
                    onChange={(e) => setCustomEquipmentName(e.target.value)}
                    placeholder="مثال: جهاز تعقيم الأشعة فوق البنفسجية أو مولد كهرباء"
                    className="w-full glass-input text-xs"
                  />
                </div>
              )}

              {/* Runtime and Environment */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    وقت التشغيل (ساعة)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الحرارة (°C)
                  </label>
                  <input
                    type="number"
                    value={tempCelsius}
                    onChange={(e) => setTempCelsius(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold text-rose-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرطوبة (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={humidity}
                    onChange={(e) => setHumidity(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold text-blue-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات التشغيل أو الصيانة
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="سرعة المراوح، فحص السيور، تنظيف الفلاتر..."
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  حفظ في السجل البيئي
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
