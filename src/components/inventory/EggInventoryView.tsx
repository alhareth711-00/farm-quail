import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { EggBatchRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDataTable } from '../../hooks/useDataTable';
import {
  Layers,
  Package,
  Calendar,
  Clock,
  Sparkles,
  ArrowDownUp,
  Edit3,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Tag,
  Warehouse,
  RotateCcw,
  Search,
  Filter,
  Flame,
  Info,
} from 'lucide-react';

export const EggInventoryView: React.FC = () => {
  const { farmSettings } = useAuth();
  const { toast } = useToast();

  // Queries
  const batches = useLiveQuery(
    () => db.eggBatches.orderBy('productionDate').toArray(),
    []
  );
  const looseSetting = useLiveQuery(() => db.settings.get('looseEggsBalance'), []);
  const looseEggsBalance = looseSetting ? Number(looseSetting.value) || 0 : 0;

  // Filters & Search
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'depleted'>('available');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [editingBatch, setEditingBatch] = useState<EggBatchRecord | null>(null);
  const [editProductionDate, setEditProductionDate] = useState<string>('');
  const [editCagesCount, setEditCagesCount] = useState<number>(0);
  const [editPricePerCage, setEditPricePerCage] = useState<number>(900);
  const [editNotes, setEditNotes] = useState<string>('');

  // New Batch Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newProductionDate, setNewProductionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newCagesCount, setNewCagesCount] = useState<number>(20);
  const [newPricePerCage, setNewPricePerCage] = useState<number>(900);
  const [newNotes, setNewNotes] = useState<string>('');

  // Loose Eggs Adjustment Modal
  const [showLooseModal, setShowLooseModal] = useState<boolean>(false);
  const [customLooseBalance, setCustomLooseBalance] = useState<number>(looseEggsBalance);

  // Sync products stock quantity with warehouse
  const syncProductStock = async () => {
    const allBatches = await db.eggBatches.toArray();
    const totalWarehouseCages = allBatches.reduce(
      (acc, b) => acc + (b.status === 'available' ? b.cagesCount : 0),
      0
    );
    const allProds = await db.products.toArray();
    const prod18 = allProds.find((p) => p.trayCapacity === 18 || p.id === 'prod-tray-18');
    if (prod18) {
      await db.products.update(prod18.id, {
        stockQuantity: totalWarehouseCages,
      });
    }
  };

  // Calculate age of batch in days
  const getBatchAgeDays = (dateStr: string) => {
    const prod = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    prod.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - prod.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Filtered Batches base on Status & Search
  const filteredBatches = React.useMemo(() => {
    if (!batches) return [];

    let list = [...batches];

    if (filterStatus === 'available') {
      list = list.filter((b) => b.cagesCount > 0 && b.status === 'available');
    } else if (filterStatus === 'depleted') {
      list = list.filter((b) => b.cagesCount === 0 || b.status === 'depleted');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.batchCode.toLowerCase().includes(q) ||
          b.productionDate.includes(q) ||
          (b.notes && b.notes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [batches, filterStatus, searchQuery]);

  // Use reusable DataTable Hook for dynamic sorting
  const { sortedData: sortedAndFilteredBatches, SortHeader } = useDataTable(filteredBatches, {
    initialKey: 'productionDate',
    initialDirection: 'asc',
    getters: {
      batchCode: (b) => b.batchCode,
      productionDate: (b) => b.productionDate,
      priority: (b) => b.productionDate,
      ageDays: (b) => getBatchAgeDays(b.productionDate),
      trayCapacity: (b) => b.trayCapacity || 18,
      initialCagesCount: (b) => b.initialCagesCount || 0,
      cagesCount: (b) => b.cagesCount,
      pricePerCage: (b) => b.pricePerCage,
      totalValue: (b) => b.cagesCount * b.pricePerCage,
      source: (b) => b.notes || '',
    },
  });

  // Overall Statistics
  const totalAvailableCages =
    batches
      ?.filter((b) => b.status === 'available')
      .reduce((acc, b) => acc + b.cagesCount, 0) || 0;

  const totalInventoryValue =
    batches
      ?.filter((b) => b.status === 'available')
      .reduce((acc, b) => acc + b.cagesCount * b.pricePerCage, 0) || 0;

  // The first available batch according to FIFO
  const fifoPriorityBatch = React.useMemo(() => {
    if (!batches) return undefined;
    return [...batches]
      .filter((b) => b.cagesCount > 0 && b.status === 'available')
      .sort((a, b) => a.productionDate.localeCompare(b.productionDate))[0];
  }, [batches]);

  // Handle Edit Batch Submit
  const handleSaveEditBatch = async () => {
    if (!editingBatch) return;
    try {
      const newStatus = editCagesCount > 0 ? 'available' : 'depleted';
      await db.eggBatches.update(editingBatch.id, {
        productionDate: editProductionDate,
        cagesCount: Number(editCagesCount),
        pricePerCage: Number(editPricePerCage),
        notes: editNotes.trim(),
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      await syncProductStock();
      toast('تم تحديث بيانات دفعة البيض بنجاح!', 'success');
      setEditingBatch(null);
    } catch (e) {
      console.error(e);
      toast('حدث خطأ أثناء تعديل الدفعة', 'error');
    }
  };

  // Handle Add New Batch Submit
  const handleAddNewBatch = async () => {
    if (newCagesCount <= 0) {
      toast('يرجى إدخال عدد أقفاص صحيح', 'error');
      return;
    }

    try {
      const batchCode = `EB-MAN-${newProductionDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
      const timestamp = new Date().toISOString();

      await db.eggBatches.add({
        id: `batch-${Date.now()}`,
        batchCode,
        productionDate: newProductionDate,
        initialCagesCount: Number(newCagesCount),
        cagesCount: Number(newCagesCount),
        trayCapacity: 18,
        pricePerCage: Number(newPricePerCage),
        source: 'manual_adjustment',
        status: 'available',
        notes: newNotes.trim() || 'توريد يدوي مباشر للمخزن',
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      await syncProductStock();
      toast(`تم توريد ${newCagesCount} قفص إلى المخزن بتاريخ ${newProductionDate}!`, 'success');
      setShowAddModal(false);
      setNewCagesCount(20);
      setNewNotes('');
    } catch (e) {
      console.error(e);
      toast('حدث خطأ أثناء إضافة الدفعة', 'error');
    }
  };

  // Handle Loose Eggs Balance Adjustment
  const handleSaveLooseBalance = async () => {
    try {
      const num = Math.max(0, parseInt(String(customLooseBalance), 10) || 0);
      const convertedCages = Math.floor(num / 18);
      const remaining = num % 18;

      if (convertedCages > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        await db.eggBatches.add({
          id: `batch-loose-${Date.now()}`,
          batchCode: `EB-LOOSE-${todayStr.replace(/-/g, '')}`,
          productionDate: todayStr,
          initialCagesCount: convertedCages,
          cagesCount: convertedCages,
          trayCapacity: 18,
          pricePerCage: 900,
          source: 'accumulated_loose',
          status: 'available',
          notes: `تم تقفيصه آلياً لاكتمال 18 بيضة عند تسوية رصيد المفرد (${num} بيضة)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        await syncProductStock();
        toast(`تم تحويل ${convertedCages} قفص جديد للمخزن لاكتمال العدد! المتبقي: ${remaining} بيضة.`, 'success');
      } else {
        toast(`تم تحديث رصيد البيض المفرد إلى ${remaining} بيضة بنجاح!`, 'success');
      }

      await db.settings.put({ key: 'looseEggsBalance', value: remaining });
      setShowLooseModal(false);
    } catch (e) {
      console.error(e);
      toast('حدث خطأ أثناء تعديل رصيد المفرد', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-soft-glow">
              <Warehouse className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                مخزن أقفاص البيض والتوريد (FIFO Inventory)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة دفعات بيض المائدة • أولوية الصرف للأقدم تاريخاً (First In, First Out) • ترحيل وتراكم البيض المفرد.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCustomLooseBalance(looseEggsBalance);
              setShowLooseModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold hover:bg-sky-100 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>تسوية رصيد المفرد ({looseEggsBalance})</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>إضافة توريد يدوي</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Cages Available */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span>إجمالي أقفاص البيض الجاهزة</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black font-mono text-emerald-800">
              {totalAvailableCages.toLocaleString('ar-SA')}{' '}
              <span className="text-sm font-normal font-almarai text-slate-600">قفص</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              سعة 18 بيضة للقفص الواحد ({totalAvailableCages * 18} بيضة)
            </p>
          </div>
        </div>

        {/* 2. Loose Eggs Accumulated */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-sky-50 to-white border border-sky-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-sky-700 mb-2">
              <span>الرصيد التراكمي للبيض المفرد</span>
              <Sparkles className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-3xl font-black font-mono text-sky-800">
              {looseEggsBalance}{' '}
              <span className="text-sm font-normal font-almarai text-sky-600">بيضة</span>
            </div>
            {/* Progress bar to 18 eggs */}
            <div className="mt-2 space-y-1">
              <div className="w-full bg-sky-200/60 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-600 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((looseEggsBalance / 18) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-sky-600 font-bold">
                <span>التقدم نحو قفص جديد</span>
                <span>{18 - looseEggsBalance} بيضة متبقية</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. FIFO Priority Target Batch */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-300 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-extrabold text-amber-800 mb-1.5">
              <span>أولوية الصرف الأولى (FIFO)</span>
              <ArrowDownUp className="w-4 h-4 text-amber-600 stroke-[2.5]" />
            </div>
            {fifoPriorityBatch ? (
              <>
                <div className="text-xl font-black font-mono text-amber-900 truncate">
                  {fifoPriorityBatch.batchCode}
                </div>
                <div className="text-xs font-bold text-amber-800 mt-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>تاريخ الإنتاج: {fifoPriorityBatch.productionDate}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  المتبقي: <b className="font-mono text-amber-900">{fifoPriorityBatch.cagesCount} قفص</b>{' '}
                  ({getBatchAgeDays(fifoPriorityBatch.productionDate) === 0 ? 'إنتاج اليوم' : `منذ ${getBatchAgeDays(fifoPriorityBatch.productionDate)} أيام`})
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400 font-bold py-2">لا توجد دفعات متاحة حالياً</div>
            )}
          </div>
        </div>

        {/* 4. Total Value in Yemeni Riyal */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span>القيمة التقديرية للمخزون</span>
              <Tag className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-2xl lg:text-3xl font-black font-mono text-teal-700">
              {totalInventoryValue.toLocaleString('ar-SA')}{' '}
              <span className="text-xs font-normal font-almarai text-slate-600">{farmSettings.currency}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              على أساس سعر 900 ريال للقفص (معتمد في POS)
            </p>
          </div>
        </div>
      </div>

      {/* Batches Table & Filter Controls */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-sm text-slate-900">
              جدول دفعات البيض بالمخزن (مرتبة حسب أولوية الصرف للأقدم تاريخاً FIFO)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث برقم الدفعة أو التاريخ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="p-0.5 rounded-xl bg-slate-100 border border-slate-200 flex text-xs">
              <button
                onClick={() => setFilterStatus('available')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  filterStatus === 'available'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                المتاحة بالمخزن
              </button>
              <button
                onClick={() => setFilterStatus('depleted')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  filterStatus === 'depleted'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                المنتهية / المباعة
              </button>
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 text-center">
                <SortHeader field="batchCode" align="right">رقم الدفعة</SortHeader>
                <SortHeader field="productionDate">تاريخ الإنتاج</SortHeader>
                <SortHeader field="priority">أولوية الصرف</SortHeader>
                <SortHeader field="ageDays">عمر الدفعة</SortHeader>
                <SortHeader field="trayCapacity">سعة القفص</SortHeader>
                <SortHeader field="initialCagesCount">الكمية الأصلية</SortHeader>
                <SortHeader field="cagesCount" className="bg-emerald-50/50 text-emerald-950">المتبقي بالمخزن</SortHeader>
                <SortHeader field="pricePerCage">سعر البيع</SortHeader>
                <SortHeader field="totalValue">القيمة الإجمالية</SortHeader>
                <SortHeader field="source">مصدر التوريد</SortHeader>
                <th className="p-3 text-center text-xs font-extrabold text-slate-700">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-center">
              {sortedAndFilteredBatches.length > 0 ? (
                sortedAndFilteredBatches.map((batch, index) => {
                  const isOldestAvailable =
                    fifoPriorityBatch && fifoPriorityBatch.id === batch.id;
                  const ageDays = getBatchAgeDays(batch.productionDate);

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOldestAvailable ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Batch Code */}
                      <td className="p-3 text-right font-almarai font-extrabold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>{batch.batchCode}</span>
                        </div>
                        {batch.notes && (
                          <span className="text-[10px] text-slate-400 block font-normal truncate max-w-xs">
                            {batch.notes}
                          </span>
                        )}
                      </td>

                      {/* Production Date (Editable) */}
                      <td className="p-3 text-center font-bold text-slate-800">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100/80 border border-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{batch.productionDate}</span>
                        </div>
                      </td>

                      {/* FIFO Priority Status */}
                      <td className="p-3 text-center font-almarai">
                        {isOldestAvailable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-sm animate-pulse">
                            <Flame className="w-3 h-3 text-amber-600" />
                            <span>الأقدم للصرف (FIFO)</span>
                          </span>
                        ) : batch.cagesCount > 0 ? (
                          <span className="text-[10px] text-slate-500 font-bold">
                            الترتيب #{index + 1}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">تم الصرف بالكامل</span>
                        )}
                      </td>

                      {/* Batch Age */}
                      <td className="p-3 text-center font-almarai">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            ageDays === 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : ageDays <= 2
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ageDays === 0 ? 'إنتاج اليوم طازج' : `منذ ${ageDays} أيام`}
                        </span>
                      </td>

                      {/* Tray Capacity */}
                      <td className="p-3 text-center text-slate-600">{batch.trayCapacity} بيضة</td>

                      {/* Initial Cages */}
                      <td className="p-3 text-center text-slate-500 font-bold">
                        {batch.initialCagesCount} قفص
                      </td>

                      {/* Remaining Cages */}
                      <td className="p-3 text-center bg-emerald-50/30">
                        <span
                          className={`font-black text-sm px-2.5 py-0.5 rounded-xl ${
                            batch.cagesCount > 0
                              ? 'text-emerald-800 bg-emerald-100/60 font-mono'
                              : 'text-slate-400 bg-slate-100'
                          }`}
                        >
                          {batch.cagesCount} قفص
                        </span>
                      </td>

                      {/* Price Per Cage */}
                      <td className="p-3 text-center font-bold text-slate-800">
                        {batch.pricePerCage} {farmSettings.currency}
                      </td>

                      {/* Total Value */}
                      <td className="p-3 text-center font-black text-slate-900">
                        {(batch.cagesCount * batch.pricePerCage).toLocaleString('ar-SA')}{' '}
                        <span className="text-[10px] font-normal text-slate-500">{farmSettings.currency}</span>
                      </td>

                      {/* Source */}
                      <td className="p-3 text-center font-almarai text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold ${
                            batch.source === 'daily_production'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : batch.source === 'accumulated_loose'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {batch.source === 'daily_production'
                            ? 'إنتاج يومي'
                            : batch.source === 'accumulated_loose'
                            ? 'تحويل من مفرد'
                            : 'تسوية يدوية'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setEditingBatch(batch);
                            setEditProductionDate(batch.productionDate);
                            setEditCagesCount(batch.cagesCount);
                            setEditPricePerCage(batch.pricePerCage);
                            setEditNotes(batch.notes || '');
                          }}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-all font-almarai text-[11px] font-bold flex items-center gap-1 mx-auto"
                          title="تعديل تاريخ الإنتاج والكمية"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400 font-almarai">
                    لا توجد دفعات بيض مطابقة في المخزن حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Edit Batch Details & Production Date */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900">
                  تعديل دفعة البيض ({editingBatch.batchCode})
                </h3>
              </div>
              <button
                onClick={() => setEditingBatch(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Production Date Input (Requirement 2) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  تاريخ إنتاج الدفعة (يمكن تعديله يدوياً):
                </label>
                <input
                  type="date"
                  value={editProductionDate}
                  onChange={(e) => setEditProductionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  سيتم تطبيق تاريخ الإنتاج المعدل فوراً في أولوية الصرف (FIFO) وفي فواتير نقاط البيع.
                </span>
              </div>

              {/* Remaining Cages */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  الرصيد المتبقي من الأقفاص (عبوة 18 بيضة):
                </label>
                <input
                  type="number"
                  min="0"
                  value={editCagesCount}
                  onChange={(e) => setEditCagesCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-black text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Price Per Cage */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  سعر بيع القفص ({farmSettings.currency}):
                </label>
                <input
                  type="number"
                  min="0"
                  value={editPricePerCage}
                  onChange={(e) => setEditPricePerCage(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-black text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات عن الدفعة:</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="ملاحظات تشغيلية عن الدفعة..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveEditBatch}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add Manual Batch */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900">
                  إضافة وتوريد دفعة بيض جديدة للمخزن
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">تاريخ الإنتاج:</label>
                <input
                  type="date"
                  value={newProductionDate}
                  onChange={(e) => setNewProductionDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  عدد الأقفاص الموردة (عبوة 18 بيضة):
                </label>
                <input
                  type="number"
                  min="1"
                  value={newCagesCount}
                  onChange={(e) => setNewCagesCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-black text-slate-800 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  سعر بيع القفص الافتراضي ({farmSettings.currency}):
                </label>
                <input
                  type="number"
                  min="0"
                  value={newPricePerCage}
                  onChange={(e) => setNewPricePerCage(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-black text-slate-800 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">ملاحظات / بيان التوريد:</label>
                <input
                  type="text"
                  placeholder="توريد إضافي، شراء خارجي، تسوية..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddNewBatch}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm"
              >
                تأكيد التوريد للمخزن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Loose Eggs Adjustment */}
      {showLooseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-600" />
                <h3 className="font-black text-base text-slate-900">
                  تسوية رصيد البيض المفرد التراكمي بالمخزن
                </h3>
              </div>
              <button
                onClick={() => setShowLooseModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-500 leading-relaxed">
                يتم ترحيل البيض المفرد بعد التقفيص اليومي إلى هذا الرصيد التراكمي. وعند اكتمال العدد إلى 18 بيضة، يتم تحويلها آلياً إلى قفص جديد يُضاف للمخزن بتاريخ يوم اكتمال العدد.
              </p>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  الرصيد الفعلي للبيض المفرد حالياً (بالحبة):
                </label>
                <input
                  type="number"
                  min="0"
                  value={customLooseBalance}
                  onChange={(e) => setCustomLooseBalance(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-base font-mono font-black text-sky-800 bg-slate-50 focus:bg-white outline-none text-center"
                />
              </div>

              {customLooseBalance >= 18 && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  🎉 الرصيد يبلغ {customLooseBalance} بيضة. سيتم فوراً تحويل {Math.floor(customLooseBalance / 18)} قفص جديد للمخزن وسيتبقى {customLooseBalance % 18} بيضة مفردة!
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLooseModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveLooseBalance}
                className="px-6 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-sm"
              >
                تحديث الرصيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
