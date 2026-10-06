import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { FloorRoom, RoomPurpose, RoomCategory } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Warehouse,
  Plus,
  Egg,
  Skull,
  Utensils,
  Trash2,
  Edit,
  X,
  Calendar,
  Layers,
  HeartPulse,
  TrendingUp,
  ShieldAlert,
  Building,
  Clock,
  Flame,
} from 'lucide-react';
import { calculateFlockAgeInfo } from '../../utils/birdAgeUtils';

export const RoomsView: React.FC = () => {
  const { toast } = useToast();
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);

  // Filter Tab
  const [activeSection, setActiveSection] = useState<'all' | 'rooms' | 'quarantine' | 'annex'>('all');

  // Modals
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<FloorRoom | null>(null);

  // Form states for Add/Edit Room
  const [roomName, setRoomName] = useState('');
  const [roomCategory, setRoomCategory] = useState<RoomCategory>('room');
  const [roomPurpose, setRoomPurpose] = useState<RoomPurpose>('layers');
  const [housingDate, setHousingDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialAgeWeeks, setInitialAgeWeeks] = useState(6);
  const [targetLayingLifespanWeeks, setTargetLayingLifespanWeeks] = useState(42);
  const [malesCount, setMalesCount] = useState(0);
  const [femalesCount, setFemalesCount] = useState(0);
  const [capacity, setCapacity] = useState(300);
  const [areaSquareMeters, setAreaSquareMeters] = useState(25);
  const [notes, setNotes] = useState('');

  // Operational Action Modals
  const [activeRoomForEgg, setActiveRoomForEgg] = useState<FloorRoom | null>(null);
  const [roomEggCount, setRoomEggCount] = useState(0);
  const [roomBrokenEggs, setRoomBrokenEggs] = useState(0);
  const [roomEggSession, setRoomEggSession] = useState<'morning' | 'evening' | 'noon'>('morning');
  const [roomEggTime, setRoomEggTime] = useState('08:30');

  const [activeRoomForMortality, setActiveRoomForMortality] = useState<FloorRoom | null>(null);
  const [roomMortalityMales, setRoomMortalityMales] = useState(0);
  const [roomMortalityFemales, setRoomMortalityFemales] = useState(0);
  const [roomMortalityCulling, setRoomMortalityCulling] = useState(0);
  const [roomMortalityReason, setRoomMortalityReason] = useState('طبيعي / استبعاد');

  const [activeRoomForFeed, setActiveRoomForFeed] = useState<FloorRoom | null>(null);
  const [feedKgUsed, setFeedKgUsed] = useState(10);
  const [feedTypeSelected, setFeedTypeSelected] = useState<'layer_production' | 'grower_fattening' | 'starter_24_27'>('layer_production');

  const calculateAge = (housingDateStr: string) => {
    const housing = new Date(housingDateStr);
    const today = new Date();
    const diffTime = Math.max(0, today.getTime() - housing.getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(days / 7);
    return { days, weeks };
  };

  const handleOpenAddModal = () => {
    setEditingRoom(null);
    setRoomName(`غرفة ${(rooms?.filter((r) => r.category === 'room').length || 0) + 1}`);
    setRoomCategory('room');
    setRoomPurpose('layers');
    setHousingDate(new Date().toISOString().split('T')[0]);
    setInitialAgeWeeks(6);
    setTargetLayingLifespanWeeks(42);
    setMalesCount(30);
    setFemalesCount(100);
    setCapacity(300);
    setAreaSquareMeters(25);
    setNotes('');
    setShowAddRoomModal(true);
  };

  const handleOpenEditModal = (room: FloorRoom) => {
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomCategory(room.category || 'room');
    setRoomPurpose(room.purpose);
    setHousingDate(room.housingDate);
    setInitialAgeWeeks(room.initialAgeWeeks ?? (room.purpose === 'fattening' ? 0 : 6));
    setTargetLayingLifespanWeeks(room.targetLayingLifespanWeeks ?? (room.purpose === 'fattening' ? 5 : 42));
    setMalesCount(room.malesCount);
    setFemalesCount(room.femalesCount);
    setCapacity(room.capacity);
    setAreaSquareMeters(room.areaSquareMeters);
    setNotes(room.notes || '');
    setShowAddRoomModal(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    if (editingRoom) {
      await db.rooms.update(editingRoom.id, {
        name: roomName.trim(),
        category: roomCategory,
        purpose: roomPurpose,
        housingDate,
        initialAgeWeeks: Number(initialAgeWeeks) || 0,
        targetLayingLifespanWeeks: Number(targetLayingLifespanWeeks) || 42,
        malesCount: Number(malesCount),
        femalesCount: Number(femalesCount),
        capacity: Number(capacity),
        areaSquareMeters: Number(areaSquareMeters),
        notes: notes.trim(),
      });
      toast('تم تحديث بيانات الغرفة بنجاح', 'success');
    } else {
      const newRoom: FloorRoom = {
        id: `room-${Date.now()}`,
        name: roomName.trim(),
        category: roomCategory,
        purpose: roomPurpose,
        housingDate,
        initialAgeWeeks: Number(initialAgeWeeks) || 0,
        targetLayingLifespanWeeks: Number(targetLayingLifespanWeeks) || 42,
        malesCount: Number(malesCount),
        femalesCount: Number(femalesCount),
        capacity: Number(capacity),
        areaSquareMeters: Number(areaSquareMeters),
        status: Number(malesCount) + Number(femalesCount) > 0 ? 'active' : 'empty',
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };
      await db.rooms.add(newRoom);
      toast(`تمت إضافة (${newRoom.name}) بنجاح!`, 'success');
    }

    setShowAddRoomModal(false);
  };

  const handleDeleteRoom = async (room: FloorRoom) => {
    const total = room.malesCount + room.femalesCount;
    if (total > 0) {
      toast('لا يمكن حذف غرفة غير فارغة! يرجى نقل الطيور أولاً.', 'error');
      return;
    }

    if (confirm(`هل أنت متأكد من حذف (${room.name})؟`)) {
      await db.rooms.delete(room.id);
      toast('تم الحذف بنجاح', 'info');
    }
  };

  // Submit Room Egg Production
  const handleSaveRoomEgg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomForEgg) return;

    const actual = Number(roomEggCount);
    const broken = Number(roomBrokenEggs);
    const net = Math.max(0, actual - broken);
    const females = activeRoomForEgg.femalesCount;
    const layingRate = females > 0 ? (actual / females) * 100 : 0;
    const trays = Math.floor(net / 30);

    await db.eggLogs.add({
      id: `egg-room-${Date.now()}`,
      targetType: 'room',
      targetId: activeRoomForEgg.id,
      targetName: activeRoomForEgg.name,
      collectionDate: new Date().toISOString().split('T')[0],
      collectionTime: roomEggTime,
      session: roomEggSession,
      actualEggs: actual,
      brokenEggs: broken,
      marketableEggs: net,
      packagedTraysCount: trays,
      traySize: 30,
      liveFemalesCount: females,
      layingRatePercent: Math.round(layingRate * 10) / 10,
      elapsedHoursFromLastCollection: 24,
      normalized24hYield: actual,
      hasIntervalWarning: false,
      recordedBy: 'عامل المزرعة',
      systemRecordedAt: new Date().toISOString(),
    });

    toast(`تم تسجيل إنتاج ${actual} بيضة (الصافي: ${net} بيضة) لـ (${activeRoomForEgg.name})!`, 'success');
    setActiveRoomForEgg(null);
    setRoomEggCount(0);
    setRoomBrokenEggs(0);
  };

  // Submit Room Mortality
  const handleSaveRoomMortality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomForMortality) return;

    const totalToDeductMales = Number(roomMortalityMales);
    const totalToDeductFemales = Number(roomMortalityFemales) + Number(roomMortalityCulling);

    if (totalToDeductMales > activeRoomForMortality.malesCount) {
      toast('عدد نفوق الذكور أكبر من المتوفر!', 'error');
      return;
    }
    if (totalToDeductFemales > activeRoomForMortality.femalesCount) {
      toast('عدد نفوق/استبعاد الإناث أكبر من المتوفر!', 'error');
      return;
    }

    await db.roomMortalities.add({
      id: `rmort-${Date.now()}`,
      roomId: activeRoomForMortality.id,
      date: new Date().toISOString().split('T')[0],
      malesMortality: totalToDeductMales,
      femalesMortality: Number(roomMortalityFemales),
      cullingCount: Number(roomMortalityCulling),
      reason: roomMortalityReason,
      recordedBy: 'عامل المزرعة',
      createdAt: new Date().toISOString(),
    });

    // Also record in detailed mortality table
    await db.detailedMortality.add({
      id: `dm-rm-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      description: roomMortalityReason,
      gender: totalToDeductMales > 0 ? 'male' : 'female',
      locationType: activeRoomForMortality.category === 'quarantine' ? 'quarantine' : 'room',
      roomName: activeRoomForMortality.name,
      exactLocationText: `${activeRoomForMortality.name}`,
      quantity: totalToDeductMales + totalToDeductFemales,
      disposalMethod: 'burial',
      recordedBy: 'عامل المزرعة',
      createdAt: new Date().toISOString(),
    });

    await db.rooms.update(activeRoomForMortality.id, {
      malesCount: activeRoomForMortality.malesCount - totalToDeductMales,
      femalesCount: activeRoomForMortality.femalesCount - totalToDeductFemales,
    });

    toast('تم تسجيل النفوق وخصم الرصيد بنجاح', 'success');
    setActiveRoomForMortality(null);
    setRoomMortalityMales(0);
    setRoomMortalityFemales(0);
    setRoomMortalityCulling(0);
  };

  // Submit Feed Consumption
  const handleSaveRoomFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomForFeed) return;

    const kg = Number(feedKgUsed);
    const bagsUsed = kg / 50;

    await db.feedConsumption.add({
      id: `feed-rec-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      targetType: activeRoomForFeed.category === 'quarantine' ? 'quarantine' : 'room',
      targetId: activeRoomForFeed.id,
      targetName: activeRoomForFeed.name,
      feedType: feedTypeSelected,
      bagsUsed: Math.round(bagsUsed * 100) / 100,
      kgUsed: kg,
      recordedBy: 'عامل المزرعة',
      createdAt: new Date().toISOString(),
    });

    const stockItem = await db.feedStock.where('feedType').equals(feedTypeSelected).first();
    if (stockItem) {
      const newTotalKg = Math.max(0, stockItem.totalKg - kg);
      const newBags = Math.floor(newTotalKg / stockItem.bagWeightKg);
      await db.feedStock.update(stockItem.id, {
        totalKg: newTotalKg,
        bagsCount: newBags,
      });
    }

    toast(`تم تسجيل استهلاك ${kg} كجم علف وخصمه من المستودع`, 'success');
    setActiveRoomForFeed(null);
  };

  const purposeConfig: Record<RoomPurpose, { label: string; bg: string; text: string }> = {
    layers: { label: 'أمهات بياض', bg: 'bg-emerald-100', text: 'text-emerald-800' },
    fattening: { label: 'تسمين لحم', bg: 'bg-amber-100', text: 'text-amber-800' },
    brooding: { label: 'تحضين كتاكيت', bg: 'bg-sky-100', text: 'text-sky-800' },
    quarantine: { label: 'عزل ومتابعة', bg: 'bg-rose-100', text: 'text-rose-800' },
    annex: { label: 'ملحقات ومستودع', bg: 'bg-purple-100 text-purple-800', text: 'text-purple-800' },
  };

  // Filtered rooms
  const filteredRooms = rooms?.filter((r) => {
    if (activeSection === 'rooms') return r.category === 'room';
    if (activeSection === 'quarantine') return r.category === 'quarantine';
    if (activeSection === 'annex') return r.category === 'annex';
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-sky-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              عنبر التربية الأرضية (غرف 1 إلى 7 والمعزولات والملحقات)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            7 غرف تربية أرضية متخصصة، قسم المعزولات لمتابعة الحالات المرضية، وقسم الملحقات للمستودعات وغرفة الفرز.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>إضافة غرفة أو قسم جديد</span>
        </button>
      </div>

      {/* Section Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveSection('all')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          كافة الأقسام ({rooms?.length || 0})
        </button>

        <button
          onClick={() => setActiveSection('rooms')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeSection === 'rooms'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          عنابر التربية (غرفة 1 - 7) ({rooms?.filter((r) => r.category === 'room').length || 0})
        </button>

        <button
          onClick={() => setActiveSection('quarantine')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'quarantine'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-rose-700 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>قسم المعزولات (عزل ومتابعة)</span>
        </button>

        <button
          onClick={() => setActiveSection('annex')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeSection === 'annex'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-purple-700 border border-slate-200'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>قسم الملحقات والمستودعات</span>
        </button>
      </div>

      {/* Rooms Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms?.map((room) => {
          const totalBirds = room.malesCount + room.femalesCount;
          const isOverCapacity = room.capacity > 0 && totalBirds > room.capacity;
          const capacityPercent =
            room.capacity > 0 ? Math.round((totalBirds / room.capacity) * 100) : 0;
          const purpose = purposeConfig[room.purpose] || {
            label: room.purpose,
            bg: 'bg-slate-100',
            text: 'text-slate-800',
          };

          const ageInfo = calculateFlockAgeInfo({
            housingDate: room.housingDate,
            hatchDate: room.hatchDate,
            initialAgeWeeks: room.initialAgeWeeks,
            targetLifespanWeeks: room.targetLayingLifespanWeeks,
            purpose: room.purpose,
          });

          return (
            <div
              key={room.id}
              className={`p-5 rounded-3xl glass-card border transition-all flex flex-col justify-between space-y-4 ${
                room.category === 'quarantine'
                  ? 'border-rose-300 bg-rose-50/20'
                  : room.category === 'annex'
                  ? 'border-purple-300 bg-purple-50/20'
                  : 'border-slate-200/80 bg-white'
              }`}
            >
              {/* Top Row: Name, Purpose & Actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-slate-900">{room.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${purpose.bg} ${purpose.text}`}
                    >
                      {purpose.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(room)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                      title="تعديل الغرفة"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {totalBirds === 0 && room.category === 'room' && (
                      <button
                        onClick={() => handleDeleteRoom(room)}
                        className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="حذف الغرفة الفارغة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Age & Meat-Conversion Countdown (if not annex) */}
                {room.category !== 'annex' && (
                  <div className="space-y-2 mb-3">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                        <Clock className="w-3.5 h-3.5 text-sky-600" />
                        <span>عمر القطيع:</span>
                        <span className="font-mono text-emerald-800 font-black">
                          {ageInfo.ageWeeks} أسبوع ({ageInfo.ageDays} يوم)
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${ageInfo.badgeBgClass} ${ageInfo.badgeTextClass} ${ageInfo.badgeBorderClass}`}>
                        {ageInfo.phaseLabel}
                      </span>
                    </div>

                    {/* Meat / Slaughter Countdown Notice */}
                    <div className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold border transition-all ${
                      ageInfo.isEndOfCycle
                        ? 'bg-rose-100 border-rose-300 text-rose-900 animate-pulse'
                        : ageInfo.isNearEnd
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-600" />
                        <span>{room.purpose === 'fattening' ? 'موعد الذبح والتوزيع:' : 'التحويل للبيع لاحم:'}</span>
                      </div>
                      {ageInfo.isEndOfCycle ? (
                        <span className="font-black text-rose-700">
                          {room.purpose === 'fattening' ? '🍗 جاهز للذبح فوراً' : '⚠️ جاهزة للبيع لاحم'}
                        </span>
                      ) : (
                        <span className="font-mono font-bold">
                          {room.purpose === 'fattening' 
                            ? `متبقي ${Math.max(0, 35 - ageInfo.ageDays)} يوم` 
                            : `متبقي ${ageInfo.remainingWeeks} أسبوع`}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Numbers */}
                {room.category !== 'annex' && (
                  <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-white border border-slate-100 shadow-sm mb-3">
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">الذكور</div>
                      <div className="text-sm font-black text-blue-700 font-mono">
                        {room.malesCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">الإناث</div>
                      <div className="text-sm font-black text-rose-700 font-mono">
                        {room.femalesCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-bold">الإجمالي</div>
                      <div className="text-sm font-black text-slate-900 font-mono">
                        {totalBirds}
                      </div>
                    </div>
                  </div>
                )}

                {/* Capacity Progress */}
                {room.capacity > 0 && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>السعة ({room.capacity} طائر)</span>
                      <span className="font-mono">{capacityPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverCapacity
                            ? 'bg-rose-500'
                            : capacityPercent >= 90
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                        }`}
                        style={{ width: `${Math.min(100, capacityPercent)}%` }}
                      />
                    </div>
                  </div>
                )}

                {room.notes && (
                  <div className="mt-3 text-xs text-slate-500 line-clamp-2">
                    <span className="font-bold">ملاحظات:</span> {room.notes}
                  </div>
                )}
              </div>

              {/* Action Buttons: Egg (if layer), Mortality, Feed */}
              {room.category !== 'annex' && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                  {room.purpose === 'layers' && (
                    <button
                      onClick={() => {
                        setActiveRoomForEgg(room);
                        setRoomEggCount(0);
                        setRoomBrokenEggs(0);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Egg className="w-3.5 h-3.5 text-emerald-600" />
                      <span>تسجيل بيض</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setActiveRoomForMortality(room);
                      setRoomMortalityMales(0);
                      setRoomMortalityFemales(0);
                      setRoomMortalityCulling(0);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Skull className="w-3.5 h-3.5 text-rose-600" />
                    <span>نفوق</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveRoomForFeed(room);
                      setFeedKgUsed(15);
                    }}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Utensils className="w-3.5 h-3.5 text-amber-600" />
                    <span>علف</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Add/Edit Room */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingRoom ? 'تعديل بيانات القسم / الغرفة' : 'إضافة غرفة أو قسم جديد'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddRoomModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الغرفة أو القسم</label>
                  <input
                    type="text"
                    required
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="مثال: غرفة 8"
                    className="w-full glass-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تصنيف القسم</label>
                  <select
                    value={roomCategory}
                    onChange={(e) => setRoomCategory(e.target.value as any)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="room">غرفة تربية أرضية (1-7)</option>
                    <option value="quarantine">قسم المعزولات</option>
                    <option value="annex">قسم الملحقات</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الغرض التشغيلي</label>
                  <select
                    value={roomPurpose}
                    onChange={(e) => setRoomPurpose(e.target.value as RoomPurpose)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="layers">أمهات بياض (إنتاج بيض)</option>
                    <option value="fattening">تسمين لحم (مجزرة)</option>
                    <option value="brooding">تحضين كتاكيت حديثة</option>
                    <option value="quarantine">عزل طيور ومتابعة صحية</option>
                    <option value="annex">مستودع وتعبئة وملحقات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ التسكين</label>
                  <input
                    type="date"
                    required
                    value={housingDate}
                    onChange={(e) => setHousingDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
              </div>

              {/* Flock Age & Lifecycle Settings */}
              {roomCategory !== 'annex' && (
                <div className="p-3.5 rounded-2xl bg-sky-50/50 border border-sky-200/80 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-900">
                    <Clock className="w-4 h-4 text-sky-600" />
                    <span>متابعة عمر القطيع وموعد التحويل للبيع لاحم / الذبح</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        العمر عند التسكين ({roomPurpose === 'fattening' ? 'أيام' : 'أسابيع'})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={initialAgeWeeks}
                        onChange={(e) => setInitialAgeWeeks(Number(e.target.value))}
                        className="w-full glass-input text-center font-mono font-bold text-xs"
                        placeholder={roomPurpose === 'fattening' ? '0' : '6'}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                        العمر المستهدف للبيع لاحم (أسابيع)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={targetLayingLifespanWeeks}
                        onChange={(e) => setTargetLayingLifespanWeeks(Number(e.target.value))}
                        className="w-full glass-input text-center font-mono font-bold text-xs"
                        placeholder={roomPurpose === 'fattening' ? '5' : '42'}
                      />
                    </div>
                  </div>

                  {/* Live Age Preview */}
                  {(() => {
                    const previewAge = calculateFlockAgeInfo({
                      housingDate,
                      initialAgeWeeks,
                      targetLifespanWeeks: targetLayingLifespanWeeks,
                      purpose: roomPurpose,
                    });
                    return (
                      <div className="p-2.5 rounded-xl bg-white border border-sky-200/80 text-[11px] space-y-1">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-slate-600">العمر المحسوب:</span>
                          <span className="font-mono text-emerald-800">{previewAge.ageWeeks} أسبوع ({previewAge.ageDays} يوم)</span>
                        </div>
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-slate-600">المرحلة:</span>
                          <span className="text-teal-700">{previewAge.phaseLabel}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold pt-1 border-t border-slate-100">
                          <span className="text-slate-600">المدة المتبقية للبيع لاحم:</span>
                          {previewAge.isEndOfCycle ? (
                            <span className="text-rose-700 font-black">⚠️ جاهزة للبيع لاحم فوراً</span>
                          ) : (
                            <span className="text-amber-800 font-mono font-black">{previewAge.remainingWeeks} أسبوع ({previewAge.remainingDays} يوم)</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {roomCategory !== 'annex' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عدد الذكور</label>
                    <input
                      type="number"
                      min="0"
                      value={malesCount}
                      onChange={(e) => setMalesCount(Number(e.target.value))}
                      className="w-full glass-input text-center font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">عدد الإناث</label>
                    <input
                      type="number"
                      min="0"
                      value={femalesCount}
                      onChange={(e) => setFemalesCount(Number(e.target.value))}
                      className="w-full glass-input text-center font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">السعة القصوى</label>
                    <input
                      type="number"
                      min="1"
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      className="w-full glass-input text-center font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="سلالة الطيور، نوع الفرشة، حرارة العنبر..."
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  {editingRoom ? 'حفظ التعديلات' : 'إنشاء الغرفة / القسم'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Room Egg Logging */}
      {activeRoomForEgg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Egg className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل إنتاج بيض لـ ({activeRoomForEgg.name})
                </h3>
              </div>
              <button
                onClick={() => setActiveRoomForEgg(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoomEgg} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">إجمالي البيض المجموع</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={roomEggCount || ''}
                    onChange={(e) => setRoomEggCount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full glass-input text-center text-lg font-mono font-bold"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بيض مكسور / فرز (-)</label>
                  <input
                    type="number"
                    min="0"
                    value={roomBrokenEggs}
                    onChange={(e) => setRoomBrokenEggs(Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold text-rose-700"
                  />
                </div>
              </div>

              {roomEggCount > 0 && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between text-emerald-950 font-bold">
                  <span>الإنتاج الصافي المحسوب:</span>
                  <span className="font-mono font-black text-sm text-emerald-800">
                    {Math.max(0, roomEggCount - roomBrokenEggs)} بيضة
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">فترة الجمع</label>
                  <select
                    value={roomEggSession}
                    onChange={(e) => setRoomEggSession(e.target.value as any)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="morning">صباحي (الجمعة 1)</option>
                    <option value="evening">مسائي (الجمعة 2)</option>
                    <option value="noon">ظهيرة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ساعة الجمع</label>
                  <input
                    type="time"
                    value={roomEggTime}
                    onChange={(e) => setRoomEggTime(e.target.value)}
                    className="w-full glass-input text-xs font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  حفظ الإنتاج
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRoomForEgg(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Room Mortality */}
      {activeRoomForMortality && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <Skull className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل نفوق واستبعاد ({activeRoomForMortality.name})
                </h3>
              </div>
              <button
                onClick={() => setActiveRoomForMortality(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoomMortality} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نفوق ذكور (المتوفر: {activeRoomForMortality.malesCount})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={activeRoomForMortality.malesCount}
                    value={roomMortalityMales}
                    onChange={(e) => setRoomMortalityMales(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    نفوق إناث (المتوفر: {activeRoomForMortality.femalesCount})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={activeRoomForMortality.femalesCount}
                    value={roomMortalityFemales}
                    onChange={(e) => setRoomMortalityFemales(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  استبعاد طيور مريضة/ضعيفة (Culling)
                </label>
                <input
                  type="number"
                  min="0"
                  value={roomMortalityCulling}
                  onChange={(e) => setRoomMortalityCulling(Number(e.target.value))}
                  className="w-full glass-input text-center font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  السبب أو التشخيص
                </label>
                <select
                  value={roomMortalityReason}
                  onChange={(e) => setRoomMortalityReason(e.target.value)}
                  className="w-full glass-input text-xs"
                >
                  <option value="طبيعي / استبعاد">طبيعي / استبعاد</option>
                  <option value="إجهاد حراري">إجهاد حراري</option>
                  <option value="تزاحم / دهس">تزاحم / دهس في الأركان</option>
                  <option value="أعراض تنفسية">أعراض تنفسية</option>
                  <option value="أخرى">أخرى</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  تأكيد وخصم من الغرفة
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRoomForMortality(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Feed Intake */}
      {activeRoomForFeed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Utensils className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل استهلاك العلف ({activeRoomForFeed.name})
                </h3>
              </div>
              <button
                onClick={() => setActiveRoomForFeed(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoomFeed} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نوع العلف
                </label>
                <select
                  value={feedTypeSelected}
                  onChange={(e) => setFeedTypeSelected(e.target.value as any)}
                  className="w-full glass-input text-xs"
                >
                  <option value="layer_production">بياض إنتاجي (20% بروتين + كالسيوم)</option>
                  <option value="grower_fattening">نامي وتسمين (20-22% بروتين)</option>
                  <option value="starter_24_27">بادي سمان كتاكيت (24-27% بروتين)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الكمية المستهلكة (كغم)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={feedKgUsed}
                  onChange={(e) => setFeedKgUsed(Number(e.target.value))}
                  className="w-full glass-input text-center text-lg font-mono font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  تسجيل وخصم من المخزن
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRoomForFeed(null)}
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
