import React, { useState, useRef } from 'react';
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
  Layers,
  Check,
  ArrowRight,
  Sparkles,
  DollarSign,
  Tag,
  Eye,
} from 'lucide-react';

interface ProductsManagementViewProps {
  onNavigateToPOS?: () => void;
}

export const categoryMeta: Record<
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

  // Live query for products
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

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    category: ProductCategory;
    unit: string;
    trayCapacity?: 12 | 18 | 24 | 30;
    retailPrice: number;
    wholesalePrice: number;
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
      stockQuantity: product.stockQuantity || 0,
      barcode: product.barcode || '',
      imageUrl: product.imageUrl || '',
      isActive: product.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Handle Image File Upload (converts to Base64 Data URL)
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
        toast('تم تحميل الصورة بنجاح!', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  // Save (Create or Update) Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast('يرجى إدخال اسم المنتج', 'warning');
      return;
    }

    try {
      if (editingProduct) {
        // Update existing product
        await db.products.update(editingProduct.id, {
          name: formData.name.trim(),
          category: formData.category,
          unit: formData.unit.trim() || 'طبق',
          trayCapacity:
            formData.category === 'table_eggs' ? formData.trayCapacity : undefined,
          retailPrice: Number(formData.retailPrice) || 0,
          wholesalePrice: Number(formData.wholesalePrice) || 0,
          stockQuantity: Number(formData.stockQuantity) || 0,
          barcode: formData.barcode.trim() || undefined,
          imageUrl: formData.imageUrl.trim() || undefined,
          isActive: formData.isActive,
        });

        toast(`تم تحديث بيانات المنتج (${formData.name}) بنجاح! سينعكس فوراً في نقاط البيع.`, 'success');
      } else {
        // Add new product
        const newProduct: Product = {
          id: `prod-${Date.now()}`,
          name: formData.name.trim(),
          category: formData.category,
          unit: formData.unit.trim() || 'طبق',
          trayCapacity:
            formData.category === 'table_eggs' ? formData.trayCapacity : undefined,
          retailPrice: Number(formData.retailPrice) || 0,
          wholesalePrice: Number(formData.wholesalePrice) || 0,
          stockQuantity: Number(formData.stockQuantity) || 0,
          barcode: formData.barcode.trim() || undefined,
          imageUrl: formData.imageUrl.trim() || undefined,
          isActive: formData.isActive,
        };

        await db.products.add(newProduct);
        toast(`تمت إضافة المنتج (${newProduct.name}) بنجاح! وهو متاح الآن في نقاط البيع.`, 'success');
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast('حدث خطأ أثناء حفظ المنتج', 'error');
    }
  };

  // Toggle Product Active Status
  const handleToggleProductActive = async (product: Product) => {
    const updatedStatus = !product.isActive;
    await db.products.update(product.id, { isActive: updatedStatus });
    toast(
      `تم ${updatedStatus ? 'تفعيل' : 'تعطيل'} ظهور المنتج (${product.name}) في نقاط البيع`,
      'info'
    );
  };

  // Delete Product
  const handleDeleteProduct = async () => {
    if (!deleteConfirmProduct) return;

    try {
      await db.products.delete(deleteConfirmProduct.id);
      toast(`تم حذف المنتج (${deleteConfirmProduct.name}) بنجاح!`, 'success');
      setDeleteConfirmProduct(null);
    } catch (err) {
      console.error(err);
      toast('حدث خطأ أثناء حذف المنتج', 'error');
    }
  };

  // Restore Default Products
  const handleRestoreDefaults = async () => {
    if (confirm('هل أنت متأكد من رغبتك في استعادة وتحديث المنتجات الافتراضية للمزرعة؟')) {
      try {
        await initializeDatabase(true);
        toast('تم استعادة وتحديث كتالوج المنتجات الافتراضية بنجاح!', 'success');
      } catch (err) {
        console.error(err);
        toast('حدث خطأ أثناء استعادة المنتجات', 'error');
      }
    }
  };

  // Filtered Products List
  const filteredProducts = React.useMemo(() => {
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
  }, [products, selectedCategory, stockFilter, searchQuery]);

  // Overall Catalog Statistics
  const stats = React.useMemo(() => {
    if (!products || products.length === 0) {
      return {
        totalCount: 0,
        eggCount: 0,
        meatAndBirdsCount: 0,
        totalInventoryValue: 0,
        lowStockCount: 0,
      };
    }

    const totalCount = products.length;
    const eggCount = products.filter(
      (p) => p.category === 'table_eggs' || p.category === 'hatching_eggs'
    ).length;
    const meatAndBirdsCount = products.filter(
      (p) => p.category === 'meat' || p.category === 'live_birds'
    ).length;
    const lowStockCount = products.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= 20
    ).length;
    const totalInventoryValue = products.reduce(
      (sum, p) => sum + (p.stockQuantity || 0) * (p.retailPrice || 0),
      0
    );

    return {
      totalCount,
      eggCount,
      meatAndBirdsCount,
      totalInventoryValue,
      lowStockCount,
    };
  }, [products]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* 1. Header & Main Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              إدارة المنتجات وكتالوج المبيعات
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة كافة أصناف المزرعة، تخصيص الأسعار (تجزئة وجملة)، المخزون، والصور، مع ربط حي وتلقائي بشاشة نقاط البيع (POS).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToPOS && (
            <button
              onClick={onNavigateToPOS}
              className="px-4 py-2 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>شاشة نقاط البيع (POS)</span>
            </button>
          )}

          <button
            onClick={handleRestoreDefaults}
            className="px-3 py-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            title="استعادة كتالوج المنتجات الافتراضية"
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

      {/* 2. Top KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Products */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">إجمالي الأصناف المسجلة</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-slate-900 font-mono">
                {stats.totalCount}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">منتج/صنف</span>
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5 font-bold">جاهزة للبيع في المتجر</p>
          </div>
        </div>

        {/* Card 2: Egg Products */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Egg className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">أصناف بيض المائدة والتفريخ</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-amber-600 font-mono">
                {stats.eggCount}
              </span>
              <span className="text-[10px] text-amber-800 font-bold">أصناف</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold">عبوات 18، 12، 24، 30 بيضة</p>
          </div>
        </div>

        {/* Card 3: Meat & Live Birds */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">اللحوم المجهزة والطيور الحية</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-rose-600 font-mono">
                {stats.meatAndBirdsCount}
              </span>
              <span className="text-[10px] text-rose-800 font-bold">أصناف</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-bold">مفرغ بالكيلو، جامبو، حي</p>
          </div>
        </div>

        {/* Card 4: Inventory Valuation */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">القيمة التقديرية للمخزون</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-teal-700 font-mono">
                {stats.totalInventoryValue.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">{farmSettings.currency}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
              {stats.lowStockCount > 0 ? `⚠️ ${stats.lowStockCount} أصناف منخفضة الرصيد` : 'جميع الأصناف متوفرة'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Control Bar */}
      <div className="p-4 sm:p-5 rounded-3xl glass-panel border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Bar */}
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

        {/* Category & Stock Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
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

      {/* 4. Products Table */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <h3 className="font-black text-sm text-slate-900">
              قائمة المنتجات المعروضة ({filteredProducts.length} صنف)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            أي تعديل في السعر أو المخزون ينعكس فورياً في شاشة نقاط البيع (POS)
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
                <th className="p-3 text-center">المخزون المتاح</th>
                <th className="p-3 text-center">سعر التجزئة (قطاعي)</th>
                <th className="p-3 text-center">سعر الجملة</th>
                <th className="p-3 text-center">الحالة بالمتجر</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const meta = categoryMeta[prod.category] || categoryMeta.table_eggs;
                  const isEgg = prod.category === 'table_eggs' || prod.category === 'hatching_eggs';

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-50/80 transition-colors group"
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
                                // Fallback if image fails to load
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

                      {/* Name & Tray Details */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
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

                      {/* Retail Price */}
                      <td className="p-3 text-center">
                        <span className="font-mono text-sm font-black text-emerald-700">
                          {prod.retailPrice?.toLocaleString('en-US')}
                        </span>
                        <span className="text-[10px] text-slate-400 mr-1 font-bold">
                          {farmSettings.currency}
                        </span>
                        {prod.id === 'prod-tray-18' && (
                          <span className="text-[9px] text-emerald-600 block font-bold">
                            (السعر الافتراضي)
                          </span>
                        )}
                      </td>

                      {/* Wholesale Price */}
                      <td className="p-3 text-center">
                        <span className="font-mono text-sm font-black text-slate-800">
                          {prod.wholesalePrice?.toLocaleString('en-US')}
                        </span>
                        <span className="text-[10px] text-slate-400 mr-1 font-bold">
                          {farmSettings.currency}
                        </span>
                      </td>

                      {/* Active Status in POS */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleProductActive(prod)}
                          className={`text-xs px-2.5 py-1 rounded-xl font-bold transition-all flex items-center justify-center gap-1 mx-auto ${
                            prod.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                          title="انقر لتفعيل أو تعطيل ظهور المنتج في نقاط البيع"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              prod.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{prod.isActive !== false ? 'مفعل بالمتجر' : 'معطل'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-600 transition-all"
                            title="تعديل بيانات المنتج والأسعار والصورة"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmProduct(prod)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all"
                            title="حذف هذا المنتج"
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
                  <td colSpan={9} className="p-12 text-center text-slate-400 space-y-3">
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
                    {editingProduct ? `تعديل المنتج: ${editingProduct.name}` : 'إضافة منتج وصنف جديد'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    أي تعديل في السعر أو المخزون ينعكس فوراً في شاشة نقاط البيع (POS).
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

              {/* Pricing (Retail & Wholesale) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سعر التجزئة (قطاعي) <span className="text-rose-500">*</span>
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
                      className="w-full glass-input text-xs py-2.5 font-mono font-bold pl-12"
                    />
                    <span className="text-[10px] font-bold text-slate-400 absolute left-3 top-3">
                      {farmSettings.currency}
                    </span>
                  </div>
                </div>

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
                      className="w-full glass-input text-xs py-2.5 font-mono font-bold pl-12"
                    />
                    <span className="text-[10px] font-bold text-slate-400 absolute left-3 top-3">
                      {farmSettings.currency}
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
                    تفعيل المنتج في نقاط البيع (POS)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    عند التفعيل، يظهر هذا المنتج تلقائياً في قائمة البيع وإصدار الفواتير.
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

      {/* 6. Modal: Delete Product Confirmation */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-slate-900">
                  تأكيد حذف المنتج
                </h3>
              </div>
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف الصنف <b className="text-slate-900">({deleteConfirmProduct.name})</b> نهائياً من قائمة المنتجات؟
              </p>
              <p className="text-[11px] text-slate-400">
                سيختفي هذا الصنف فوراً من شاشة نقاط البيع (POS).
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDeleteProduct}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm transition-all"
                >
                  نعم، حذف المنتج
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmProduct(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
