import React, { useState, useRef, useMemo } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Product, ProductCategory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { initializeDatabase } from '../../db/seedData';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Egg,
  Bird,
  Scale,
  HeartPulse,
  Truck,
  CheckCircle2,
  X,
  AlertTriangle,
  Save,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Layers,
  Power,
  PauseCircle,
  PlayCircle,
  ShieldAlert,
  Percent,
  Coins,
  Check,
} from 'lucide-react';

interface ProductsManagementViewProps {
  onNavigateToPOS?: () => void;
}

const categoryMeta: Record<
  ProductCategory,
  { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
> = {
  table_eggs: {
    label: 'بيض المائدة (أطباق)',
    icon: <Egg className="w-4 h-4 text-emerald-600" />,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  hatching_eggs: {
    label: 'بيض تفريخ مخصب',
    icon: <Egg className="w-4 h-4 text-sky-600" />,
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
  },
  meat: {
    label: 'لحوم سمان مجهزة',
    icon: <Scale className="w-4 h-4 text-rose-600" />,
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  live_birds: {
    label: 'طيور سمان حية',
    icon: <Bird className="w-4 h-4 text-amber-600" />,
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  feed_supplies: {
    label: 'أعلاف ومستلزمات',
    icon: <HeartPulse className="w-4 h-4 text-purple-600" />,
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  service: {
    label: 'خدمات وتوصيل',
    icon: <Truck className="w-4 h-4 text-slate-600" />,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
};

export const ProductsManagementView: React.FC<ProductsManagementViewProps> = ({
  onNavigateToPOS,
}) => {
  const { farmSettings } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Live Query: Reactive State Management directly bound to IndexedDB
  const products = useLiveQuery(async () => {
    const all = await db.products.toArray();
    if (all.length === 0) {
      await initializeDatabase(true);
      return await db.products.toArray();
    }
    return all;
  }, []);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);

  // Form State (includes costPrice for profit margin calculations)
  const [formData, setFormData] = useState<{
    name: string;
    category: ProductCategory;
    unit: string;
    trayCapacity?: 12 | 18 | 24 | 30;
    retailPrice: number;
    wholesalePrice: number;
    costPrice: number;
    stockQuantity: number;
    barcode: string;
    imageUrl: string;
    isActive: boolean;
  }>({
    name: '',
    category: 'table_eggs',
    unit: 'طبق',
    trayCapacity: 18,
    retailPrice: 900,
    wholesalePrice: 800,
    costPrice: 600,
    stockQuantity: 100,
    barcode: '',
    imageUrl: '',
    isActive: true,
  });

  // Filter categories list
  const categoriesList: { id: string; label: string }[] = [
    { id: 'all', label: 'جميع الأقسام' },
    { id: 'table_eggs', label: 'بيض المائدة (أطباق)' },
    { id: 'hatching_eggs', label: 'بيض تفريخ مخصب' },
    { id: 'meat', label: 'لحوم سمان مجهزة' },
    { id: 'live_birds', label: 'طيور سمان حية' },
    { id: 'feed_supplies', label: 'أعلاف ومستلزمات' },
    { id: 'service', label: 'خدمات وتوصيل' },
  ];

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'table_eggs',
      unit: 'طبق',
      trayCapacity: 18,
      retailPrice: 900,
      wholesalePrice: 800,
      costPrice: 600,
      stockQuantity: 100,
      barcode: '',
      imageUrl: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      unit: product.unit || 'طبق',
      trayCapacity: product.trayCapacity || 18,
      retailPrice: product.retailPrice || 0,
      wholesalePrice: product.wholesalePrice || 0,
      costPrice: product.costPrice !== undefined ? product.costPrice : 0,
      stockQuantity: product.stockQuantity || 0,
      barcode: product.barcode || '',
      imageUrl: product.imageUrl || '',
      isActive: product.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Handle Image File Upload (converts offline to Base64)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast('حجم الصورة كبير، يرجى اختيار صورة أقل من 2 ميجابايت', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
        toast('تم تحميل صورة المنتج بنجاح!', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  // 2. CRUD Operations (State Management with Reactive Dexie Sync)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast('يرجى إدخال اسم المنتج', 'warning');
      return;
    }

    const cost = Number(formData.costPrice) || 0;
    const retail = Number(formData.retailPrice) || 0;
    const wholesale = Number(formData.wholesalePrice) || 0;
    const stock = Number(formData.stockQuantity) || 0;

    try {
      if (editingProduct) {
        // Update existing product
        await db.products.update(editingProduct.id, {
          name: formData.name.trim(),
          category: formData.category,
          unit: formData.unit.trim() || 'طبق',
          trayCapacity:
            formData.category === 'table_eggs' ? formData.trayCapacity : undefined,
          retailPrice: retail,
          wholesalePrice: wholesale,
          costPrice: cost,
          stockQuantity: stock,
          barcode: formData.barcode.trim() || undefined,
          imageUrl: formData.imageUrl.trim() || undefined,
          isActive: formData.isActive,
        });

        toast(
          `تم تحديث بيانات الصنف (${formData.name}) بنجاح! التغييرات منعكسة فوراً في نقاط البيع.`,
          'success'
        );
      } else {
        // Create new product
        const newProduct: Product = {
          id: `prod-${Date.now()}`,
          name: formData.name.trim(),
          category: formData.category,
          unit: formData.unit.trim() || 'طبق',
          trayCapacity:
            formData.category === 'table_eggs' ? formData.trayCapacity : undefined,
          retailPrice: retail,
          wholesalePrice: wholesale,
          costPrice: cost,
          stockQuantity: stock,
          barcode: formData.barcode.trim() || undefined,
          imageUrl: formData.imageUrl.trim() || undefined,
          isActive: formData.isActive,
        };

        await db.products.add(newProduct);
        toast(
          `تمت إضافة المنتج الجديد (${newProduct.name}) بنجاح! وهو متاح فوراً في شاشة البيع.`,
          'success'
        );
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast('حدث خطأ أثناء حفظ المنتج', 'error');
    }
  };

  // Toggle Product Active / Suspended Status
  const handleToggleProductActive = async (product: Product) => {
    const updatedStatus = !product.isActive;
    await db.products.update(product.id, { isActive: updatedStatus });
    toast(
      `تم ${updatedStatus ? 'تفعيل' : 'إيقاف وتعطيل'} ظهور المنتج (${product.name}) في نقاط البيع`,
      updatedStatus ? 'success' : 'info'
    );
  };

  // Safe Deletion: Permanent Delete
  const handleConfirmPermanentDelete = async () => {
    if (!deleteConfirmProduct) return;

    try {
      await db.products.delete(deleteConfirmProduct.id);
      toast(`تم حذف الصنف (${deleteConfirmProduct.name}) نهائياً من قاعدة البيانات!`, 'success');
      setDeleteConfirmProduct(null);
    } catch (err) {
      console.error(err);
      toast('حدث خطأ أثناء حذف المنتج', 'error');
    }
  };

  // Safe Deletion: Deactivate instead of Delete
  const handleDeactivateInsteadOfDelete = async () => {
    if (!deleteConfirmProduct) return;

    try {
      await db.products.update(deleteConfirmProduct.id, { isActive: false });
      toast(
        `تم إيقاف وتعطيل المنتج (${deleteConfirmProduct.name}) بأمان مع الحفاظ على سجلاته ومخزونه`,
        'success'
      );
      setDeleteConfirmProduct(null);
    } catch (err) {
      console.error(err);
      toast('حدث خطأ أثناء إيقاف المنتج', 'error');
    }
  };

  // Restore Default Products
  const handleRestoreDefaults = async () => {
    if (confirm('هل أنت متأكد من رغبتك في استعادة وتحديث كتالوج المنتجات الافتراضية للمزرعة؟')) {
      try {
        await initializeDatabase(true);
        toast('تم استعادة وتحديث كتالوج المنتجات الافتراضية بنجاح مع التكاليف والأسعار!', 'success');
      } catch (err) {
        console.error(err);
        toast('حدث خطأ أثناء استعادة المنتجات', 'error');
      }
    }
  };

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((prod) => {
      // Category filter
      if (selectedCategory !== 'all' && prod.category !== selectedCategory) {
        return false;
      }

      // Stock filter
      if (stockFilter === 'in_stock' && prod.stockQuantity <= 0) return false;
      if (stockFilter === 'low_stock' && (prod.stockQuantity > 20 || prod.stockQuantity <= 0))
        return false;

      // Status filter (Active / Inactive)
      if (statusFilter === 'active' && prod.isActive === false) return false;
      if (statusFilter === 'inactive' && prod.isActive !== false) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = prod.name.toLowerCase().includes(query);
        const matchBarcode = prod.barcode ? prod.barcode.toLowerCase().includes(query) : false;
        const matchUnit = prod.unit ? prod.unit.toLowerCase().includes(query) : false;
        if (!matchName && !matchBarcode && !matchUnit) return false;
      }

      return true;
    });
  }, [products, selectedCategory, stockFilter, statusFilter, searchQuery]);

  // 3. Overall Catalog Financial Statistics & Profit Margins
  const stats = useMemo(() => {
    if (!products || products.length === 0) {
      return {
        totalCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        eggCount: 0,
        totalInventoryCost: 0,
        totalInventoryRetailValue: 0,
        totalExpectedProfit: 0,
        overallProfitMarginPct: 0,
        lowStockCount: 0,
      };
    }

    const totalCount = products.length;
    const activeCount = products.filter((p) => p.isActive !== false).length;
    const inactiveCount = products.filter((p) => p.isActive === false).length;
    const eggCount = products.filter(
      (p) => p.category === 'table_eggs' || p.category === 'hatching_eggs'
    ).length;
    const lowStockCount = products.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= 20
    ).length;

    // Total cost value of on-hand inventory
    const totalInventoryCost = products.reduce(
      (sum, p) => sum + (p.stockQuantity || 0) * (p.costPrice || 0),
      0
    );

    // Total retail sales value of on-hand inventory
    const totalInventoryRetailValue = products.reduce(
      (sum, p) => sum + (p.stockQuantity || 0) * (p.retailPrice || 0),
      0
    );

    // Total expected gross profit from inventory
    const totalExpectedProfit = Math.max(0, totalInventoryRetailValue - totalInventoryCost);
    const overallProfitMarginPct =
      totalInventoryRetailValue > 0
        ? Math.round((totalExpectedProfit / totalInventoryRetailValue) * 100)
        : 0;

    return {
      totalCount,
      activeCount,
      inactiveCount,
      eggCount,
      totalInventoryCost,
      totalInventoryRetailValue,
      totalExpectedProfit,
      overallProfitMarginPct,
      lowStockCount,
    };
  }, [products]);

  // Form Live Profit Calculation Helpers
  const formRetailProfit = formData.retailPrice - (formData.costPrice || 0);
  const formRetailMarginPct =
    formData.retailPrice > 0
      ? Math.round((formRetailProfit / formData.retailPrice) * 100)
      : 0;

  const formWholesaleProfit = formData.wholesalePrice - (formData.costPrice || 0);
  const formWholesaleMarginPct =
    formData.wholesalePrice > 0
      ? Math.round((formWholesaleProfit / formData.wholesalePrice) * 100)
      : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* 1. Header & Main Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              إدارة المنتجات وهوامش الأرباح
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة شاملة لكتالوج المزرعة، التكلفة التقديرية، أسعار التجزئة والجملة، واحتساب هوامش الأرباح التلقائي مع ربط حي وديناميكي بنقاط البيع (POS).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToPOS && (
            <button
              onClick={onNavigateToPOS}
              className="px-4 py-2 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <ShoppingCart className="w-4 h-4 text-sky-600" />
              <span>شاشة نقاط البيع (POS)</span>
            </button>
          )}

          <button
            onClick={handleRestoreDefaults}
            className="px-3 py-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            title="استعادة كتالوج المنتجات الافتراضية مع التكاليف والأسعار"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>إضافة منتج جديد</span>
          </button>
        </div>
      </div>

      {/* 2. Top KPI Stats Cards with Profit Margins & Valuation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Products & Active/Inactive breakdown */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">إجمالي الأصناف والمنتجات</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-slate-900 font-mono">
                {stats.totalCount}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">صنف</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] font-bold">
              <span className="text-emerald-700 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {stats.activeCount} نشط بالمتجر
              </span>
              {stats.inactiveCount > 0 && (
                <span className="text-slate-400 flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  {stats.inactiveCount} موقوف
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Estimated Inventory Cost */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">قيمة المخزون بسعر التكلفة</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-rose-700 font-mono">
                {stats.totalInventoryCost.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">{farmSettings.currency}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">التكلفة التقديرية للأصناف المخزنة</p>
          </div>
        </div>

        {/* Card 3: Inventory Retail Sales Valuation */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">القيمة التقديرية بسعر البيع</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-sky-700 font-mono">
                {stats.totalInventoryRetailValue.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">{farmSettings.currency}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">إجمالي المبيعات المتوقعة قطاعي</p>
          </div>
        </div>

        {/* Card 4: Expected Profit Margin */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">هامش الربح المتوقع من المخزون</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-teal-700 font-mono">
                {stats.totalExpectedProfit.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">{farmSettings.currency}</span>
            </div>
            <p className="text-[10px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
              <Percent className="w-3 h-3 stroke-[2.5]" />
              <span>متوسط هامش الربح: {stats.overallProfitMarginPct}%</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Filters, Search & Status Control Bar */}
      <div className="p-4 sm:p-5 rounded-3xl glass-panel border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="بحث باسم المنتج، الصنف، الوحدة، أو الباركود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 shadow-xs"
            />
          </div>

          {/* Status & Stock Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter (Active / Suspended) */}
            <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>المفعلة فقط</span>
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  statusFilter === 'inactive'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>الموقوفة</span>
              </button>
            </div>

            {/* Stock Filter Dropdown */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white outline-none"
            >
              <option value="all">كل حالات المخزون</option>
              <option value="in_stock">المتوفر فقط</option>
              <option value="low_stock">منخفض الرصيد (أقل من 20)</option>
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Products CRUD Table */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <h3 className="font-black text-sm text-slate-900">
              قائمة المنتجات المعروضة ({filteredProducts.length} صنف)
            </h3>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>متزامنة حياً ولحظياً مع شاشة نقطة البيع (POS) دون إعادة تحميل الصفحة</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3 text-center">الصورة</th>
                <th className="p-3">اسم المنتج / الصنف</th>
                <th className="p-3">التصنيف</th>
                <th className="p-3 text-center">الوحدة</th>
                <th className="p-3 text-center">المخزون</th>
                <th className="p-3 text-center">التكلفة التقديرية</th>
                <th className="p-3 text-center">سعر التجزئة (مفرد)</th>
                <th className="p-3 text-center">سعر الجملة</th>
                <th className="p-3 text-center">حالة البيع (POS)</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const meta = categoryMeta[prod.category] || categoryMeta.table_eggs;
                  const cost = prod.costPrice || 0;
                  const retailProfit = (prod.retailPrice || 0) - cost;
                  const retailMarginPct =
                    prod.retailPrice > 0 ? Math.round((retailProfit / prod.retailPrice) * 100) : 0;
                  const wholesaleProfit = (prod.wholesalePrice || 0) - cost;
                  const wholesaleMarginPct =
                    prod.wholesalePrice > 0
                      ? Math.round((wholesaleProfit / prod.wholesalePrice) * 100)
                      : 0;

                  return (
                    <tr
                      key={prod.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        prod.isActive === false ? 'bg-slate-50/50 opacity-80' : ''
                      }`}
                    >
                      {/* Product Image / Icon */}
                      <td className="p-3 text-center">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto shadow-2xs relative">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400">
                              {meta.icon}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Name & Details */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`font-extrabold ${
                              prod.isActive === false
                                ? 'text-slate-500 line-through decoration-slate-300'
                                : 'text-slate-900 group-hover:text-emerald-700'
                            } transition-colors`}
                          >
                            {prod.name}
                          </span>
                          {prod.trayCapacity && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                              {prod.trayCapacity} بيضة
                            </span>
                          )}
                        </div>
                        {prod.barcode && (
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            كود: {prod.barcode}
                          </span>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl border ${meta.bg} ${meta.text} ${meta.border}`}
                        >
                          {meta.icon}
                          <span>{meta.label}</span>
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="p-3 text-center font-bold text-slate-600">
                        {prod.unit}
                      </td>

                      {/* Stock Quantity */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-sm font-black text-slate-900">
                            {prod.stockQuantity}
                          </span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              prod.stockQuantity > 20
                                ? 'bg-emerald-500'
                                : prod.stockQuantity > 0
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-rose-500'
                            }`}
                            title={
                              prod.stockQuantity > 20
                                ? 'متوفر'
                                : prod.stockQuantity > 0
                                ? 'رصيد منخفض'
                                : 'نافذ'
                            }
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block font-bold">
                          {prod.stockQuantity > 20
                            ? 'متوفر'
                            : prod.stockQuantity > 0
                            ? 'رصيد منخفض'
                            : 'نفذ من المخزون'}
                        </span>
                      </td>

                      {/* Estimated Cost Price */}
                      <td className="p-3 text-center">
                        <span className="font-mono text-sm font-black text-rose-700">
                          {cost > 0 ? cost.toLocaleString('en-US') : '0'}
                        </span>
                        <span className="text-[10px] text-slate-400 mr-1 font-bold">
                          {farmSettings.currency}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-medium">
                          (تكلفة الوحدة)
                        </span>
                      </td>

                      {/* Retail Price with Profit Margin */}
                      <td className="p-3 text-center">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="font-mono text-sm font-black text-emerald-700">
                            {prod.retailPrice?.toLocaleString('en-US')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {farmSettings.currency}
                          </span>
                        </div>
                        {cost > 0 && (
                          <div
                            className={`text-[10px] font-mono font-bold mt-0.5 ${
                              retailProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            <span>
                              {retailProfit >= 0 ? `+${retailProfit.toLocaleString('en-US')}` : retailProfit.toLocaleString('en-US')}
                            </span>
                            <span className="text-[9px] opacity-80 mr-0.5">
                              ({retailMarginPct}%)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Wholesale Price with Profit Margin */}
                      <td className="p-3 text-center">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="font-mono text-sm font-black text-slate-800">
                            {prod.wholesalePrice?.toLocaleString('en-US')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {farmSettings.currency}
                          </span>
                        </div>
                        {cost > 0 && (
                          <div
                            className={`text-[10px] font-mono font-bold mt-0.5 ${
                              wholesaleProfit >= 0 ? 'text-sky-700' : 'text-rose-600'
                            }`}
                          >
                            <span>
                              {wholesaleProfit >= 0 ? `+${wholesaleProfit.toLocaleString('en-US')}` : wholesaleProfit.toLocaleString('en-US')}
                            </span>
                            <span className="text-[9px] opacity-80 mr-0.5">
                              ({wholesaleMarginPct}%)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Active / Suspended Status Toggle */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleProductActive(prod)}
                          className={`text-xs px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 mx-auto ${
                            prod.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                          }`}
                          title="انقر لتفعيل أو إيقاف ظهور المنتج في نقاط البيع (POS)"
                        >
                          {prod.isActive !== false ? (
                            <>
                              <PlayCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                              <span>مفعل بالمتجر</span>
                            </>
                          ) : (
                            <>
                              <PauseCircle className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
                              <span>موقوف مؤقتاً</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-600 transition-all"
                            title="تعديل بيانات المنتج، التكلفة، الأسعار، أو الصورة"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmProduct(prod)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all"
                            title="إيقاف أو حذف هذا المنتج بشكل آمن"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 space-y-3">
                    <Package className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-600">
                      لا توجد منتجات مطابقة لخيارات البحث أو التصنيف المحدد
                    </p>
                    <button
                      onClick={handleOpenAddModal}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة منتج جديد الآن</span>
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal: Add / Edit Product (نافذة إضافة وتعديل المنتج) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-apple-modal border border-slate-100 text-right max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600">
                <Package className="w-6 h-6 stroke-[2.2]" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingProduct ? `تعديل الصنف: ${editingProduct.name}` : 'إضافة صنف ومنتج جديد'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    أي تعديل في التكلفة، الأسعار، أو المخزون ينعكس فورياً في نقاط البيع (POS).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProduct} className="space-y-4 pt-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المنتج / الصنف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: طبق بيض سمان سوبر، كرتون لحم سمان مجهز..."
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full glass-input text-xs py-2.5 font-bold"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تصنيف المنتج
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: e.target.value as ProductCategory,
                      }))
                    }
                    className="w-full glass-input text-xs py-2.5"
                  >
                    <option value="table_eggs">بيض المائدة (أطباق)</option>
                    <option value="hatching_eggs">بيض تفريخ مخصب</option>
                    <option value="meat">لحوم سمان مجهزة</option>
                    <option value="live_birds">طيور سمان حية</option>
                    <option value="feed_supplies">أعلاف ومستلزمات</option>
                    <option value="service">خدمات وتوصيل</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    وحدة القياس / البيع
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="طبق، حبة، جوز، كغم، كيس..."
                    value={formData.unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                    className="w-full glass-input text-xs py-2.5"
                  />
                </div>
              </div>

              {/* Tray Capacity (if table eggs) */}
              {formData.category === 'table_eggs' && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    سعة الطبق (عدد البيضات لكل طبق)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[12, 18, 24, 30].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, trayCapacity: size as any }))
                        }
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          formData.trayCapacity === size
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {size} بيضة
                        {size === 18 && <span className="block text-[9px] opacity-90">القياسي</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Image Section (Upload file or URL) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>صورة المنتج (تظهر في نقاط البيع والكتالوج)</span>
                  </label>
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: '' }))}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      إزالة الصورة
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Image Preview Box */}
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-slate-200 shrink-0 flex items-center justify-center shadow-xs">
                    {formData.imageUrl ? (
                      <img
                        src={formData.imageUrl}
                        alt="معاينة"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    {/* File Upload Button */}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>رفع صورة من جهازك</span>
                      </button>
                    </div>

                    {/* Or URL input */}
                    <div className="relative">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                      <input
                        type="url"
                        placeholder="أو ضع رابط صورة خارجي (URL)..."
                        value={formData.imageUrl}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
                        }
                        className="w-full pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono placeholder-slate-400 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Section (Estimated Cost, Retail, Wholesale) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-black text-slate-800 block">
                  التسعير واحتساب التكلفة التقديرية
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Estimated Cost */}
                  <div>
                    <label className="block text-xs font-bold text-rose-800 mb-1">
                      التكلفة التقديرية <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.costPrice}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            costPrice: Number(e.target.value),
                          }))
                        }
                        className="w-full glass-input text-xs py-2.5 font-mono font-bold pl-12 text-rose-700 bg-white"
                      />
                      <span className="text-[10px] font-bold text-slate-400 absolute left-3 top-3">
                        {farmSettings.currency}
                      </span>
                    </div>
                  </div>

                  {/* Retail Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      سعر التجزئة (مفرد) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.retailPrice}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            retailPrice: Number(e.target.value),
                          }))
                        }
                        className="w-full glass-input text-xs py-2.5 font-mono font-bold pl-12 bg-white"
                      />
                      <span className="text-[10px] font-bold text-slate-400 absolute left-3 top-3">
                        {farmSettings.currency}
                      </span>
                    </div>
                  </div>

                  {/* Wholesale Price */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      سعر الجملة <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.wholesalePrice}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            wholesalePrice: Number(e.target.value),
                          }))
                        }
                        className="w-full glass-input text-xs py-2.5 font-mono font-bold pl-12 bg-white"
                      />
                      <span className="text-[10px] font-bold text-slate-400 absolute left-3 top-3">
                        {farmSettings.currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Profit Margin Calculator Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      formRetailProfit >= 0
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <span className="font-bold">هامش ربح التجزئة:</span>
                    <span className="font-mono font-black">
                      {formRetailProfit.toLocaleString('en-US')} {farmSettings.currency} (
                      {formRetailMarginPct}%)
                    </span>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      formWholesaleProfit >= 0
                        ? 'bg-sky-50 border-sky-200 text-sky-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}
                  >
                    <span className="font-bold">هامش ربح الجملة:</span>
                    <span className="font-mono font-black">
                      {formWholesaleProfit.toLocaleString('en-US')} {farmSettings.currency} (
                      {formWholesaleMarginPct}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Quantity & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الكمية المتاحة في المخزون
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        stockQuantity: Number(e.target.value),
                      }))
                    }
                    className="w-full glass-input text-xs py-2.5 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الباركود / رمز الصنف (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 628100123456"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, barcode: e.target.value }))
                    }
                    className="w-full glass-input text-xs py-2.5 font-mono"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    تفعيل الصنف في نقاط البيع (POS)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    عند التفعيل، يظهر هذا المنتج تلقائياً في شاشة المبيعات وإصدار الفواتير.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    formData.isActive ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-all ${
                      formData.isActive ? 'right-6' : 'right-1'
                    }`}
                  />
                </button>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-apple flex items-center justify-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingProduct ? 'حفظ التعديلات وتحديث نقاط البيع' : 'إضافة المنتج فوراً'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Safe Delete Confirmation (الحذف الآمن وإيقاف المنتج) */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-slate-900">
                  إدارة الصنف والحذف الآمن
                </h3>
              </div>
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                هل ترغب في إيقاف أو حذف الصنف{' '}
                <b className="text-slate-900">({deleteConfirmProduct.name})</b>؟
              </p>

              {/* Warning if stock > 0 */}
              {deleteConfirmProduct.stockQuantity > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">تنبيه أمان المخزون:</span>
                    <span>
                      هذا المنتج يحتوي على رصيد متاح في المخزن قدره{' '}
                      <b className="font-mono font-bold">
                        {deleteConfirmProduct.stockQuantity} {deleteConfirmProduct.unit}
                      </b>
                      . يوصى باختيار <b>"إيقاف الصنف مؤقتاً"</b> لتجنب فقدان حركات المخزون والفواتير السابقة.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                {/* Safe Option: Deactivate instead of Delete */}
                <button
                  type="button"
                  onClick={handleDeactivateInsteadOfDelete}
                  className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <PauseCircle className="w-4 h-4" />
                  <span>إيقاف الصنف مؤقتاً (موصى به - يحافظ على السجلات)</span>
                </button>

                {/* Permanent Delete Option */}
                <button
                  type="button"
                  onClick={handleConfirmPermanentDelete}
                  className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تأكيد الحذف النهائي من قاعدة البيانات</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteConfirmProduct(null)}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  إلغاء الأمر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
