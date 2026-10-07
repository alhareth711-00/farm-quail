import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Product, Customer, OrderInvoice, OrderItem, PaymentMethod } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  FileText,
  DollarSign,
  CreditCard,
  User,
  CheckCircle2,
  X,
  Search,
  Receipt,
  Truck,
  Layers,
  Egg,
  Sparkles,
  Wallet,
  Tag,
  Save,
  Calendar,
  UserPlus,
  Edit2,
  AlertTriangle,
  PackagePlus,
  RefreshCw,
  Package,
} from 'lucide-react';
import { initializeDatabase } from '../../db/seedData';

export const POSView: React.FC = () => {
  const { farmSettings, userName, updateSettings } = useAuth();
  const { toast } = useToast();

  // Load products (handles both boolean true and truthy isActive, auto-seeds if database is empty)
  const products = useLiveQuery(async () => {
    const all = await db.products.toArray();
    if (all.length === 0) {
      await initializeDatabase(true);
      const reloaded = await db.products.toArray();
      return reloaded.filter((p) => p.isActive !== false);
    }
    return all.filter((p) => p.isActive !== false);
  }, []);
  const customers = useLiveQuery(() => db.customers.toArray(), []);
  const invoices = useLiveQuery(() => db.invoices.reverse().sortBy('createdAt'), []);
  const eggBatches = useLiveQuery(() => db.eggBatches.where('status').equals('available').toArray(), []);

  // Sorted egg batches by oldest production date first (FIFO)
  const sortedAvailableEggBatches = React.useMemo(() => {
    if (!eggBatches) return [];
    return [...eggBatches]
      .filter((b) => b.cagesCount > 0)
      .sort((a, b) => a.productionDate.localeCompare(b.productionDate));
  }, [eggBatches]);

  // Cart state
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-4'); // default general cash
  const [priceType, setPriceType] = useState<'retail' | 'wholesale'>('retail');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Search & Category Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Print Preview & Modals
  const [printedInvoice, setPrintedInvoice] = useState<OrderInvoice | null>(null);
  const [printFormat, setPrintFormat] = useState<'thermal_80mm' | 'a4'>('thermal_80mm');
  const [showWalletReportModal, setShowWalletReportModal] = useState<boolean>(false);
  const [showTrayPriceModal, setShowTrayPriceModal] = useState<boolean>(false);
  const [trayPriceForm, setTrayPriceForm] = useState<Record<string, { retail: number; wholesale: number }>>({});

  // Add Product Modal State
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [productFormData, setProductFormData] = useState<{
    name: string;
    category: 'table_eggs' | 'hatching_eggs' | 'meat' | 'live_birds' | 'feed_supplies' | 'service';
    unit: string;
    trayCapacity?: 12 | 18 | 24 | 30;
    retailPrice: number;
    wholesalePrice: number;
    stockQuantity: number;
  }>({
    name: '',
    category: 'table_eggs',
    unit: 'طبق',
    trayCapacity: 18,
    retailPrice: 900,
    wholesalePrice: 800,
    stockQuantity: 100,
  });

  // Mini Customer Modals State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showDeleteCustomerModal, setShowDeleteCustomerModal] = useState(false);

  const [customerFormData, setCustomerFormData] = useState<{
    name: string;
    phone: string;
    type: 'retail' | 'wholesale' | 'distributor' | 'farm';
    address: string;
    currentDebt: number;
    notes: string;
  }>({
    name: '',
    phone: '',
    type: 'retail',
    address: '',
    currentDebt: 0,
    notes: '',
  });

  // Arabic Labels for Payment Methods (Yemeni Market & E-Wallets)
  const paymentMethodLabels: Record<PaymentMethod, string> = {
    cash: 'نقداً (كاش)',
    credit: 'آجل (حساب عميل)',
    kuraimi: 'محفظة الكريمي (حاسب / إم فلوس)',
    jeeb: 'محفظة جيب (Jeeb)',
    jawali: 'محفظة جوالي (Jawali)',
    partial: 'دفع جزئي',
  };

  // Customer selected
  const activeCustomer = customers?.find((c) => c.id === selectedCustomerId) || customers?.[0];

  // Handle Add Customer from POS
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.name.trim()) return;

    const newId = `cust-${Date.now()}`;
    const newCust: Customer = {
      id: newId,
      name: customerFormData.name.trim(),
      phone: customerFormData.phone.trim() || '—',
      type: customerFormData.type,
      address: customerFormData.address.trim(),
      currentDebt: Number(customerFormData.currentDebt) || 0,
      totalPurchases: 0,
      notes: customerFormData.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    await db.customers.add(newCust);
    setSelectedCustomerId(newId);
    setShowAddCustomerModal(false);
    toast(`تم إضافة العميل (${newCust.name}) بنجاح وتعيينه للسلة الحالية!`, 'success');
  };

  // Handle Edit Customer from POS
  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !customerFormData.name.trim()) return;

    await db.customers.update(activeCustomer.id, {
      name: customerFormData.name.trim(),
      phone: customerFormData.phone.trim(),
      type: customerFormData.type,
      address: customerFormData.address.trim(),
      notes: customerFormData.notes.trim(),
    });

    setShowEditCustomerModal(false);
    toast(`تم تحديث بيانات العميل (${customerFormData.name.trim()}) بنجاح!`, 'success');
  };

  // Handle Delete Customer from POS
  const handleDeleteCustomer = async () => {
    if (!activeCustomer) return;
    if (activeCustomer.id === 'cust-1' || activeCustomer.id === 'cust-4') {
      toast('لا يمكن حذف العميل النقدي العام الافتراضي!', 'error');
      setShowDeleteCustomerModal(false);
      return;
    }

    const deletedName = activeCustomer.name;
    await db.customers.delete(activeCustomer.id);
    const fallbackCust = customers?.find((c) => c.id !== activeCustomer.id) || null;
    if (fallbackCust) {
      setSelectedCustomerId(fallbackCust.id);
    }
    setShowDeleteCustomerModal(false);
    toast(`تم حذف العميل (${deletedName}) بنجاح!`, 'success');
  };

  // Handle Add Product from POS
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productFormData.name.trim()) {
      toast('يرجى إدخال اسم المنتج', 'warning');
      return;
    }

    try {
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        name: productFormData.name.trim(),
        category: productFormData.category,
        unit: productFormData.unit.trim() || 'طبق',
        trayCapacity:
          productFormData.category === 'table_eggs' ? productFormData.trayCapacity : undefined,
        retailPrice: Number(productFormData.retailPrice) || 0,
        wholesalePrice: Number(productFormData.wholesalePrice) || 0,
        stockQuantity: Number(productFormData.stockQuantity) || 0,
        isActive: true,
      };

      await db.products.add(newProduct);
      toast(`تمت إضافة المنتج (${newProduct.name}) بنجاح إلى نقاط البيع!`, 'success');
      setShowAddProductModal(false);
      setProductFormData({
        name: '',
        category: 'table_eggs',
        unit: 'طبق',
        trayCapacity: 18,
        retailPrice: 900,
        wholesalePrice: 800,
        stockQuantity: 100,
      });
    } catch (err) {
      console.error(err);
      toast('حدث خطأ أثناء إضافة المنتج', 'error');
    }
  };

  // Handle Restore Default Farm Products
  const handleRestoreDefaultProducts = async () => {
    if (confirm('هل ترغب في استعادة وتحميل قائمة المنتجات الافتراضية للمزرعة؟')) {
      try {
        await initializeDatabase(true);
        toast('تم استعادة وتحديث قائمة المنتجات الافتراضية بنجاح!', 'success');
      } catch (err) {
        console.error(err);
        toast('حدث خطأ أثناء استعادة المنتجات', 'error');
      }
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    const unitPrice = priceType === 'wholesale' ? product.wholesalePrice : product.retailPrice;
    const isEgg = product.trayCapacity === 18 || product.category === 'table_eggs';
    const oldest = sortedAvailableEggBatches[0];

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            quantity: 1,
            unit: product.unit,
            unitPrice,
            total: unitPrice,
            batchId: isEgg && oldest ? 'fifo' : undefined,
            productionDate: isEgg && oldest ? oldest.productionDate : undefined,
          },
        ];
      }
    });
  };

  const updateItemBatch = (productId: string, batchIdOrFifo: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          if (batchIdOrFifo === 'fifo') {
            const oldest = sortedAvailableEggBatches[0];
            return {
              ...item,
              batchId: 'fifo',
              productionDate: oldest ? oldest.productionDate : undefined,
            };
          } else {
            const selected = sortedAvailableEggBatches.find((b) => b.id === batchIdOrFifo);
            return {
              ...item,
              batchId: selected ? selected.id : undefined,
              productionDate: selected ? selected.productionDate : undefined,
            };
          }
        }
        return item;
      })
    );
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = Math.max(0, item.quantity + delta);
            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Custom unit price modification directly in cart
  const updateItemUnitPrice = (productId: string, newPrice: number) => {
    const price = Math.max(0, isNaN(newPrice) ? 0 : newPrice);
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          return {
            ...item,
            unitPrice: price,
            total: item.quantity * price,
          };
        }
        return item;
      })
    );
  };

  // Open & initialize tray prices customization modal
  const handleOpenTrayPriceModal = () => {
    const trayProds =
      products?.filter(
        (p) => p.trayCapacity || p.category === 'table_eggs' || p.category === 'hatching_eggs'
      ) || [];
    const initial: Record<string, { retail: number; wholesale: number }> = {};
    trayProds.forEach((p) => {
      initial[p.id] = { retail: p.retailPrice, wholesale: p.wholesalePrice };
    });
    setTrayPriceForm(initial);
    setShowTrayPriceModal(true);
  };

  // Save customized tray prices across system
  const handleSaveTrayPrices = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const [prodId, prices] of Object.entries(trayPriceForm)) {
        await db.products.update(prodId, {
          retailPrice: Number(prices.retail),
          wholesalePrice: Number(prices.wholesale),
        });
      }

      if (trayPriceForm['prod-tray-18']) {
        await updateSettings({
          ...farmSettings,
          defaultTrayPrice: Number(trayPriceForm['prod-tray-18'].retail),
          defaultWholesaleTrayPrice: Number(trayPriceForm['prod-tray-18'].wholesale),
        });
      }

      // Sync active cart item prices
      setCart((prev) =>
        prev.map((item) => {
          if (trayPriceForm[item.productId]) {
            const newPrice =
              priceType === 'wholesale'
                ? Number(trayPriceForm[item.productId].wholesale)
                : Number(trayPriceForm[item.productId].retail);
            return {
              ...item,
              unitPrice: newPrice,
              total: item.quantity * newPrice,
            };
          }
          return item;
        })
      );

      toast('تم حفظ وتخصيص أسعار أطباق البيض بنجاح في النظام ونقاط البيع!', 'success');
      setShowTrayPriceModal(false);
    } catch (err) {
      console.error(err);
      toast('حدث خطأ أثناء حفظ أسعار الأطباق', 'error');
    }
  };

  const clearCart = () => {
    setCart([]);
    setPaidAmount(0);
    setDeliveryFee(0);
    setDiscount(0);
    setOrderNotes('');
  };

  // Switch price type recalculates cart
  const handlePriceTypeChange = (type: 'retail' | 'wholesale') => {
    setPriceType(type);
    setCart((prev) =>
      prev.map((item) => {
        const prod = products?.find((p) => p.id === item.productId);
        if (!prod) return item;
        const newPrice = type === 'wholesale' ? prod.wholesalePrice : prod.retailPrice;
        return {
          ...item,
          unitPrice: newPrice,
          total: item.quantity * newPrice,
        };
      })
    );
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const totalAmount = Math.max(0, subtotal + Number(deliveryFee) - Number(discount));
  const isDirectFullPaid =
    paymentMethod === 'cash' ||
    paymentMethod === 'kuraimi' ||
    paymentMethod === 'jeeb' ||
    paymentMethod === 'jawali';

  const effectivePaidAmount = isDirectFullPaid
    ? totalAmount
    : paymentMethod === 'credit'
    ? 0
    : Number(paidAmount);
  const remainingAmount = Math.max(0, totalAmount - effectivePaidAmount);

  // Submit Order / Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast('السلة فارغة! أضف بعض المنتجات لإتمام البيع', 'error');
      return;
    }

    const invNumber = `INV-${Date.now().toString().slice(-6)}`;
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toTimeString().slice(0, 5);

    const newInvoice: OrderInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNumber,
      date: dateStr,
      time: timeStr,
      customerId: selectedCustomerId,
      customerName: activeCustomer?.name || 'عميل نقدي عام',
      items: cart,
      subtotal,
      deliveryFee: Number(deliveryFee),
      discount: Number(discount),
      totalAmount,
      paidAmount: effectivePaidAmount,
      remainingAmount,
      paymentMethod,
      notes: orderNotes.trim(),
      cashierName: userName,
      createdAt: today.toISOString(),
    };

    // Save invoice
    await db.invoices.add(newInvoice);

    // Update customer debt if credit/partial
    if (activeCustomer && remainingAmount > 0) {
      await db.customers.update(activeCustomer.id, {
        currentDebt: activeCustomer.currentDebt + remainingAmount,
        totalPurchases: activeCustomer.totalPurchases + totalAmount,
      });
    } else if (activeCustomer) {
      await db.customers.update(activeCustomer.id, {
        totalPurchases: activeCustomer.totalPurchases + totalAmount,
      });
    }

    // Deduct stock for items and direct deduction from egg inventory batches
    for (const item of cart) {
      const prod = products?.find((p) => p.id === item.productId);
      if (prod && prod.category !== 'service') {
        const isEggTray = prod.trayCapacity === 18 || prod.category === 'table_eggs';

        if (isEggTray) {
          let neededQty = item.quantity;

          // 1. If a specific batch was selected (not 'fifo')
          if (item.batchId && item.batchId !== 'fifo') {
            const specificBatch = await db.eggBatches.get(item.batchId);
            if (specificBatch && specificBatch.cagesCount > 0) {
              const deduct = Math.min(specificBatch.cagesCount, neededQty);
              const remaining = specificBatch.cagesCount - deduct;
              await db.eggBatches.update(specificBatch.id, {
                cagesCount: remaining,
                status: remaining === 0 ? 'depleted' : 'available',
                updatedAt: new Date().toISOString(),
              });
              neededQty -= deduct;
            }
          }

          // 2. If 'fifo' or if additional neededQty remains
          if (neededQty > 0) {
            const availableBatches = (await db.eggBatches.where('status').equals('available').toArray())
              .filter((b) => b.cagesCount > 0)
              .sort((a, b) => a.productionDate.localeCompare(b.productionDate));

            for (const b of availableBatches) {
              if (neededQty <= 0) break;
              const deduct = Math.min(b.cagesCount, neededQty);
              const remaining = b.cagesCount - deduct;
              await db.eggBatches.update(b.id, {
                cagesCount: remaining,
                status: remaining === 0 ? 'depleted' : 'available',
                updatedAt: new Date().toISOString(),
              });
              neededQty -= deduct;
            }
          }

          // 3. Keep prod.stockQuantity in sync with sum of remaining eggBatches
          const remainingAllBatches = await db.eggBatches.toArray();
          const totalAvailableCages = remainingAllBatches.reduce(
            (acc, b) => acc + (b.status === 'available' ? b.cagesCount : 0),
            0
          );
          await db.products.update(prod.id, {
            stockQuantity: totalAvailableCages,
          });
        } else {
          // Standard physical item
          await db.products.update(prod.id, {
            stockQuantity: Math.max(0, prod.stockQuantity - item.quantity),
          });
        }
      }
    }

    toast(`تم إتمام الفاتورة ${invNumber} بنجاح!`, 'success');

    // Open print preview
    setPrintedInvoice(newInvoice);
    clearCart();
  };

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Categories list
  const categories = [
    { id: 'all', label: 'الكل' },
    { id: 'table_eggs', label: 'بيض المائدة (أطباق)' },
    { id: 'hatching_eggs', label: 'بيض تفريخ مخصب' },
    { id: 'meat', label: 'لحوم سمان مجهزة' },
    { id: 'live_birds', label: 'طيور سمان حية' },
    { id: 'feed_supplies', label: 'أعلاف ومستلزمات' },
    { id: 'service', label: 'خدمات وتوصيل' },
  ];

  // Filtered products
  const filteredProducts = products?.filter((p) => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (searchQuery.trim() && !p.name.includes(searchQuery.trim())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-sky-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              نقاط البيع والفواتير المتقدمة (POS & Sales)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إصدار فواتير بيض المائدة (أطباق 12، 18، 24، 30)، البيض المخصب، الطيور الحية والمجهزة، مع طباعة الإيصالات الحرارية 80mm وفواتير A4.
          </p>
        </div>

        {/* Actions & Pricing Tier Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Tray Prices Button */}
          <button
            onClick={handleOpenTrayPriceModal}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Tag className="w-4 h-4" />
            <span>تخصيص أسعار بيع الأطباق</span>
          </button>

          {/* E-Wallets Movement Report Button */}
          <button
            onClick={() => setShowWalletReportModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Wallet className="w-4 h-4" />
            <span>حركة المحافظ الإلكترونية والصندوق</span>
          </button>

          {/* Pricing Tier Selector (Retail / Wholesale) */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 px-2">التسعير:</span>
            <button
              onClick={() => handlePriceTypeChange('retail')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                priceType === 'retail'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              سعر التجزئة
            </button>
            <button
              onClick={() => handlePriceTypeChange('wholesale')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                priceType === 'wholesale'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              سعر الجملة
            </button>
          </div>
        </div>
      </div>

      {/* POS Main Grid: Products Catalog (Left/Center) + Cart Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Products Section (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Category Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="بحث في المنتجات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input pr-10 text-xs py-2"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}

              {/* Add Product Button */}
              <button
                onClick={() => setShowAddProductModal(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="إضافة منتج أو صنف جديد للمبيعات"
              >
                <PackagePlus className="w-4 h-4" />
                <span>إضافة منتج</span>
              </button>
            </div>
          </div>

          {/* Product Cards Grid or Empty State */}
          {filteredProducts && filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((prod) => {
                const price = priceType === 'wholesale' ? prod.wholesalePrice : prod.retailPrice;
                const isEgg = prod.category === 'table_eggs' || prod.category === 'hatching_eggs';

                return (
                  <div
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className="p-4 rounded-3xl glass-card border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.98] relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                          {isEgg && <Egg className="w-3 h-3 text-emerald-600" />}
                          <span>{prod.unit}</span>
                          {prod.trayCapacity && (
                            <span className="font-mono text-emerald-800 font-extrabold mr-0.5">
                              ({prod.trayCapacity}ب)
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            prod.stockQuantity > 0 ? 'text-slate-500' : 'text-rose-500'
                          }`}
                        >
                          متاح: {prod.stockQuantity}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 mb-2 group-hover:text-emerald-700 transition-colors">
                        {prod.name}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-base font-black text-emerald-800 font-mono">
                          {price.toLocaleString('en-US')}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 mr-1">
                          {farmSettings.currency}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white flex items-center justify-center transition-all shadow-xs">
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center rounded-3xl bg-white border border-dashed border-slate-200 space-y-4 animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
                <Egg className="w-7 h-7 stroke-[2]" />
              </div>
              <div className="max-w-sm mx-auto">
                <h4 className="text-sm font-black text-slate-900">
                  لا توجد منتجات معروضة في هذا التصنيف حالياً
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  يمكنك استعادة المنتجات الافتراضية بنقرة واحدة أو إضافة منتجات مخصصة جديدة.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>إضافة منتج جديد</span>
                </button>
                <button
                  onClick={handleRestoreDefaultProducts}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>استعادة المنتجات الافتراضية</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cart Drawer (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 rounded-3xl glass-panel p-5 border border-slate-200/80 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-sm">سلة المبيعات</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {cart.length} أصناف
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:underline font-bold"
                >
                  تفريغ السلة
                </button>
              )}
            </div>

            {/* Customer Selector with 3 Mini Action Icons */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-600">
                  العميل:
                </label>
                {/* 3 Mini Icons: Add, Edit, Delete */}
                <div className="flex items-center gap-1.5">
                  {/* 1. Add Customer */}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerFormData({
                        name: '',
                        phone: '',
                        type: 'retail',
                        address: '',
                        currentDebt: 0,
                        notes: '',
                      });
                      setShowAddCustomerModal(true);
                    }}
                    className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                    title="إضافة عميل جديد"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>

                  {/* 2. Edit Customer */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeCustomer) return;
                      setCustomerFormData({
                        name: activeCustomer.name,
                        phone: activeCustomer.phone,
                        type: activeCustomer.type,
                        address: activeCustomer.address || '',
                        currentDebt: activeCustomer.currentDebt || 0,
                        notes: activeCustomer.notes || '',
                      });
                      setShowEditCustomerModal(true);
                    }}
                    disabled={!activeCustomer || activeCustomer.id === 'cust-1' || activeCustomer.id === 'cust-4'}
                    className="p-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="تعديل بيانات العميل المحدد"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* 3. Delete Customer */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeCustomer || activeCustomer.id === 'cust-1' || activeCustomer.id === 'cust-4') return;
                      setShowDeleteCustomerModal(true);
                    }}
                    disabled={!activeCustomer || activeCustomer.id === 'cust-1' || activeCustomer.id === 'cust-4'}
                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="حذف العميل المحدد"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full glass-input text-xs py-1.5"
              >
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.currentDebt > 0 ? `(دين سابق: ${c.currentDebt} ${farmSettings.currency})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Cart Items List */}
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
              {cart.length > 0 ? (
                cart.map((item) => {
                  const orig = products?.find((p) => p.id === item.productId);
                  const isEgg = orig?.trayCapacity === 18 || orig?.category === 'table_eggs';

                  return (
                    <div
                      key={item.productId}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {item.productName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <label className="text-[10px] text-slate-400 font-bold shrink-0">سعر الوحدة:</label>
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice || ''}
                              onChange={(e) => updateItemUnitPrice(item.productId, Number(e.target.value))}
                              title="تخصيص وتعديل سعر بيع هذا البند للطلب الحالي"
                              className="w-20 px-1 py-0.5 text-xs font-mono font-black text-emerald-800 bg-white border border-slate-300 rounded-lg text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-inner"
                            />
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">{farmSettings.currency}</span>
                            {(() => {
                              const catalogPrice = priceType === 'wholesale' ? orig?.wholesalePrice : orig?.retailPrice;
                              if (catalogPrice && item.unitPrice !== catalogPrice) {
                                return (
                                  <span className="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 font-extrabold rounded-md shadow-xs shrink-0">
                                    مخصص
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-slate-200">
                          <button
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-black text-xs px-1 text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="text-slate-400 hover:text-emerald-600 p-0.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-left font-mono font-black text-xs text-slate-900 w-16">
                          {item.total} {farmSettings.currency}
                        </div>

                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-slate-300 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Production Date Batch Selection Field (Requirement 8) */}
                      {isEgg && sortedAvailableEggBatches.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-emerald-600" />
                              <span>تاريخ إنتاج البيض المباع من المخزن:</span>
                            </span>
                            <span className="font-mono text-emerald-800 font-extrabold">
                              {item.productionDate ? `إنتاج: ${item.productionDate}` : 'الأقدم تلقائياً'}
                            </span>
                          </div>
                          <select
                            value={item.batchId || 'fifo'}
                            onChange={(e) => updateItemBatch(item.productId, e.target.value)}
                            className="w-full text-[11px] font-mono font-bold bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-slate-800 outline-none focus:border-emerald-500 shadow-xs"
                          >
                            <option value="fifo">
                              🎯 تلقائي (الأقدم FIFO): {sortedAvailableEggBatches[0].productionDate} ({sortedAvailableEggBatches[0].cagesCount} قفص متاح)
                            </option>
                            {sortedAvailableEggBatches.map((b) => (
                              <option key={b.id} value={b.id}>
                                دفعة {b.productionDate} ({b.batchCode}) - متبقي {b.cagesCount} قفص
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  السلة فارغة. انقر على أي منتج لإضافته.
                </div>
              )}
            </div>
          </div>

          {/* Checkout Controls */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            {/* Delivery & Discount */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                  توصيل / نقل
                </label>
                <input
                  type="number"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="w-full glass-input text-xs py-1 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                  خصم
                </label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-full glass-input text-xs py-1 font-mono text-center text-rose-700"
                />
              </div>
            </div>

            {/* Payment Method Selector (Yemeni Payment Methods & Wallets) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                طريقة الدفع (النقد والمحافظ الإلكترونية)
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  نقداً (كاش)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('kuraimi')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                    paymentMethod === 'kuraimi'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  محفظة الكريمي
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('jeeb')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                    paymentMethod === 'jeeb'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  محفظة جيب
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('jawali')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                    paymentMethod === 'jawali'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  محفظة جوالي
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                    paymentMethod === 'credit'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  آجل (دين عميل)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('partial');
                    setPaidAmount(Math.round(totalAmount / 2));
                  }}
                  className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                    paymentMethod === 'partial'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  دفع جزئي
                </button>
              </div>
            </div>

            {/* Partial amount input if partial */}
            {paymentMethod === 'partial' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  المبلغ المدفوع الآن نقداً
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full glass-input text-center text-base font-mono font-bold"
                />
                <span className="text-[10px] text-amber-800 mt-0.5 block font-bold">
                  المتبقي كدين آجل على العميل: {remainingAmount} {farmSettings.currency}
                </span>
              </div>
            )}

            {/* Summary Totals */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{subtotal} {farmSettings.currency}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>رسوم التوصيل:</span>
                  <span className="font-mono">+{deliveryFee} {farmSettings.currency}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>الخصم الممنوح:</span>
                  <span className="font-mono">-{discount} {farmSettings.currency}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-200">
                <span>الإجمالي النهائي:</span>
                <span className="font-mono text-emerald-800 text-base">
                  {totalAmount} {farmSettings.currency}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-black text-sm shadow-apple flex items-center justify-center gap-2 transition-all"
            >
              <Receipt className="w-4 h-4" />
              <span>إتمام البيع وطباعة الفاتورة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print Preview & Export Modal (80mm Thermal Receipt + A4 Invoice PDF) */}
      {printedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-apple-modal border border-slate-100 text-right max-h-[95vh] overflow-y-auto">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 no-print">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">تنسيق الطباعة:</span>
                <button
                  onClick={() => setPrintFormat('thermal_80mm')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    printFormat === 'thermal_80mm'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  إيصال حراري (80mm)
                </button>
                <button
                  onClick={() => setPrintFormat('a4')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    printFormat === 'a4'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  فاتورة قياسية (A4)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الآن</span>
                </button>
                <button
                  onClick={() => setPrintedInvoice(null)}
                  className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Container */}
            <div id="printable-area" className="flex justify-center p-2">
              {printFormat === 'thermal_80mm' ? (
                /* 80mm Thermal Receipt Layout */
                <div className="w-[320px] bg-white p-4 text-black font-mono text-xs border border-dashed border-slate-300 rounded-xl leading-relaxed">
                  <div className="text-center pb-2 border-b border-dashed border-black">
                    <div className="font-extrabold text-sm mb-1">{farmSettings.farmName}</div>
                    <div className="text-[10px]">{farmSettings.address}</div>
                    <div className="text-[10px]">هاتف: {farmSettings.phone}</div>
                    {farmSettings.taxNumber && (
                      <div className="text-[10px]">الرقم الضريبي: {farmSettings.taxNumber}</div>
                    )}
                  </div>

                  <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[11px]">
                    <div>رقم الفاتورة: <b className="font-bold">{printedInvoice.invoiceNumber}</b></div>
                    <div>التاريخ: {printedInvoice.date} {printedInvoice.time}</div>
                    <div>العميل: {printedInvoice.customerName}</div>
                    <div>الكاشير: {printedInvoice.cashierName}</div>
                  </div>

                  {/* Items */}
                  <div className="py-2 border-b border-dashed border-black">
                    <div className="flex justify-between font-bold pb-1 border-b border-slate-200 text-[10px]">
                      <span>الصنف</span>
                      <span>الكمية × السعر</span>
                      <span>الإجمالي</span>
                    </div>
                    {printedInvoice.items.map((it, idx) => (
                      <div key={idx} className="py-1 text-[11px]">
                        <div className="font-bold">{it.productName}</div>
                        {it.productionDate && (
                          <div className="text-[10px] text-slate-600 font-sans">
                            [تاريخ الإنتاج: {it.productionDate}]
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600 text-[10px]">
                          <span>{it.quantity} {it.unit} × {it.unitPrice}</span>
                          <span className="font-bold text-black">{it.total} {farmSettings.currency}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي:</span>
                      <span>{printedInvoice.subtotal} {farmSettings.currency}</span>
                    </div>
                    {printedInvoice.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span>التوصيل:</span>
                        <span>+{printedInvoice.deliveryFee} {farmSettings.currency}</span>
                      </div>
                    )}
                    {printedInvoice.discount > 0 && (
                      <div className="flex justify-between">
                        <span>الخصم:</span>
                        <span>-{printedInvoice.discount} {farmSettings.currency}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-xs pt-1 border-t border-black">
                      <span>الإجمالي المطلوب:</span>
                      <span>{printedInvoice.totalAmount} {farmSettings.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المدفوع:</span>
                      <span>{printedInvoice.paidAmount} {farmSettings.currency}</span>
                    </div>
                    {printedInvoice.remainingAmount > 0 && (
                      <div className="flex justify-between font-bold text-rose-700">
                        <span>المتبقي (آجل):</span>
                        <span>{printedInvoice.remainingAmount} {farmSettings.currency}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 text-center text-[10px] space-y-1">
                    <div>{farmSettings.receiptFooterMessage}</div>
                    <div className="text-[9px] text-slate-500">نظام إدارة مزارع السمان الذكي ERP</div>
                  </div>
                </div>
              ) : (
                /* Standard A4 Tax / Sales Invoice Layout */
                <div className="w-full bg-white p-6 border border-slate-200 rounded-2xl text-slate-800 text-xs">
                  {/* A4 Header */}
                  <div className="flex justify-between items-start pb-4 border-b-2 border-emerald-600">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 mb-1">
                        {farmSettings.farmName}
                      </h2>
                      <p className="text-slate-500 text-xs">{farmSettings.address}</p>
                      <p className="text-slate-500 text-xs">هاتف: {farmSettings.phone}</p>
                      {farmSettings.taxNumber && (
                        <p className="text-slate-500 text-xs">الرقم الضريبي: {farmSettings.taxNumber}</p>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-black text-emerald-700">فاتورة مبيعات</div>
                      <div className="font-mono font-bold text-slate-800 mt-1">
                        {printedInvoice.invoiceNumber}
                      </div>
                      <div className="text-slate-500 font-mono text-[11px]">
                        التاريخ: {printedInvoice.date} {printedInvoice.time}
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="my-4 p-3 rounded-xl bg-slate-50 border border-slate-100 flex justify-between">
                    <div>
                      <span className="font-bold text-slate-500 block text-[10px]">فاتورة صادرة إلى:</span>
                      <span className="font-bold text-sm text-slate-900">{printedInvoice.customerName}</span>
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-slate-500 block text-[10px]">طريقة الدفع:</span>
                      <span className="font-bold text-emerald-800">
                        {paymentMethodLabels[printedInvoice.paymentMethod] || printedInvoice.paymentMethod}
                      </span>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="w-full text-right mb-4">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">بيان الصنف</th>
                        <th className="p-2.5 text-center">الكمية</th>
                        <th className="p-2.5 text-center">الوحدة</th>
                        <th className="p-2.5 text-center">سعر الوحدة</th>
                        <th className="p-2.5 text-left">المجموع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {printedInvoice.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-bold">
                            <div>{it.productName}</div>
                            {it.productionDate && (
                              <div className="text-[10px] text-slate-500 font-normal">
                                تاريخ الإنتاج: {it.productionDate}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-center">{it.unit}</td>
                          <td className="p-2.5 text-center font-mono">{it.unitPrice}</td>
                          <td className="p-2.5 text-left font-mono font-bold">
                            {it.total} {farmSettings.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals Summary */}
                  <div className="flex justify-end">
                    <div className="w-64 space-y-1.5 text-xs p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex justify-between">
                        <span>المجموع الفرعي:</span>
                        <span className="font-mono">{printedInvoice.subtotal} {farmSettings.currency}</span>
                      </div>
                      {printedInvoice.deliveryFee > 0 && (
                        <div className="flex justify-between">
                          <span>خدمة التوصيل والنقل:</span>
                          <span className="font-mono">+{printedInvoice.deliveryFee} {farmSettings.currency}</span>
                        </div>
                      )}
                      {printedInvoice.discount > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>الخصم الممنوح:</span>
                          <span className="font-mono">-{printedInvoice.discount} {farmSettings.currency}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-sm pt-2 border-t border-slate-300">
                        <span>الإجمالي المطلوب:</span>
                        <span className="font-mono text-emerald-800">
                          {printedInvoice.totalAmount} {farmSettings.currency}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>المبلغ المدفوع:</span>
                        <span className="font-mono">{printedInvoice.paidAmount} {farmSettings.currency}</span>
                      </div>
                      {printedInvoice.remainingAmount > 0 && (
                        <div className="flex justify-between font-bold text-rose-700">
                          <span>المتبقي في ذمة العميل:</span>
                          <span className="font-mono">{printedInvoice.remainingAmount} {farmSettings.currency}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-200 text-center text-slate-500 text-[11px]">
                    {farmSettings.receiptFooterMessage}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: E-Wallets & Daily Cash Movement Report */}
      {showWalletReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-apple-modal border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700">
                <Wallet className="w-6 h-6" />
                <h3 className="text-base font-black text-slate-900">
                  تقرير حركة المحافظ الإلكترونية اليمنية وصندوق الكاش
                </h3>
              </div>
              <button
                onClick={() => setShowWalletReportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Calculations for Today */}
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const todayInvs = invoices?.filter((inv) => inv.date === today) || [];

              const cashTotal = todayInvs
                .filter((inv) => inv.paymentMethod === 'cash')
                .reduce((acc, inv) => acc + inv.paidAmount, 0);

              const kuraimiTotal = todayInvs
                .filter((inv) => inv.paymentMethod === 'kuraimi')
                .reduce((acc, inv) => acc + inv.paidAmount, 0);

              const jeebTotal = todayInvs
                .filter((inv) => inv.paymentMethod === 'jeeb')
                .reduce((acc, inv) => acc + inv.paidAmount, 0);

              const jawaliTotal = todayInvs
                .filter((inv) => inv.paymentMethod === 'jawali')
                .reduce((acc, inv) => acc + inv.paidAmount, 0);

              const creditTotal = todayInvs
                .filter((inv) => inv.paymentMethod === 'credit' || inv.remainingAmount > 0)
                .reduce((acc, inv) => acc + inv.remainingAmount, 0);

              const allTotal = todayInvs.reduce((acc, inv) => acc + inv.totalAmount, 0);

              return (
                <div className="space-y-6 pt-4">
                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* Cash */}
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[11px] font-bold text-emerald-800 block mb-1">
                        صندوق الكاش (نقداً)
                      </span>
                      <div className="text-2xl font-black font-mono text-emerald-900">
                        {cashTotal.toLocaleString('ar-SA')} {farmSettings.currency}
                      </div>
                      <span className="text-[10px] text-emerald-700">حركة النقد المباشرة بالخزينة</span>
                    </div>

                    {/* Kuraimi */}
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                      <span className="text-[11px] font-bold text-blue-800 block mb-1">
                        محفظة الكريمي (حاسب / إم فلوس)
                      </span>
                      <div className="text-2xl font-black font-mono text-blue-900">
                        {kuraimiTotal.toLocaleString('ar-SA')} {farmSettings.currency}
                      </div>
                      <span className="text-[10px] text-blue-700">تحويلات بنك الكريمي</span>
                    </div>

                    {/* Jeeb */}
                    <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                      <span className="text-[11px] font-bold text-purple-800 block mb-1">
                        محفظة جيب - كاك بنك (Jeeb)
                      </span>
                      <div className="text-2xl font-black font-mono text-purple-900">
                        {jeebTotal.toLocaleString('ar-SA')} {farmSettings.currency}
                      </div>
                      <span className="text-[10px] text-purple-700">مدفوعات محفظة جيب</span>
                    </div>

                    {/* Jawali */}
                    <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
                      <span className="text-[11px] font-bold text-teal-800 block mb-1">
                        محفظة جوالي (Jawali)
                      </span>
                      <div className="text-2xl font-black font-mono text-teal-900">
                        {jawaliTotal.toLocaleString('ar-SA')} {farmSettings.currency}
                      </div>
                      <span className="text-[10px] text-teal-700">مدفوعات محفظة جوالي</span>
                    </div>

                    {/* Credit */}
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                      <span className="text-[11px] font-bold text-rose-800 block mb-1">
                        المبيعات الآجلة (ديون اليوم)
                      </span>
                      <div className="text-2xl font-black font-mono text-rose-900">
                        {creditTotal.toLocaleString('ar-SA')} {farmSettings.currency}
                      </div>
                      <span className="text-[10px] text-rose-700">مستحقات مسجلة على كشوف العملاء</span>
                    </div>

                    {/* Grand Total */}
                    <div className="p-4 rounded-2xl bg-slate-900 text-white">
                      <span className="text-[11px] font-bold text-slate-300 block mb-1">
                        إجمالي مبيعات اليوم
                      </span>
                      <div className="text-2xl font-black font-mono text-emerald-400">
                        {allTotal.toLocaleString('ar-SA')} {farmSettings.currency}
                      </div>
                      <span className="text-[10px] text-slate-400">إجمالي الفواتير الصادرة اليوم</span>
                    </div>
                  </div>

                  {/* Today's Transactions List */}
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800 mb-2">
                      فواتير مبيعات اليوم وتوزيع وسائل الدفع ({todayInvs.length} فاتورة):
                    </h4>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">رقم الفاتورة</th>
                            <th className="p-2.5">الوقت</th>
                            <th className="p-2.5">العميل</th>
                            <th className="p-2.5">طريقة الدفع</th>
                            <th className="p-2.5 text-center">المدفوع</th>
                            <th className="p-2.5 text-center">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {todayInvs.length > 0 ? (
                            todayInvs.map((inv) => (
                              <tr key={inv.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono font-bold text-slate-800">{inv.invoiceNumber}</td>
                                <td className="p-2.5 font-mono text-slate-500">{inv.time}</td>
                                <td className="p-2.5 font-bold text-slate-900">{inv.customerName}</td>
                                <td className="p-2.5">
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                      inv.paymentMethod === 'cash'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : inv.paymentMethod === 'kuraimi'
                                        ? 'bg-blue-100 text-blue-800'
                                        : inv.paymentMethod === 'jeeb'
                                        ? 'bg-purple-100 text-purple-800'
                                        : inv.paymentMethod === 'jawali'
                                        ? 'bg-teal-100 text-teal-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {paymentMethodLabels[inv.paymentMethod] || inv.paymentMethod}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-emerald-700">
                                  {inv.paidAmount} {farmSettings.currency}
                                </td>
                                <td className="p-2.5 text-center font-mono font-black text-slate-900">
                                  {inv.totalAmount} {farmSettings.currency}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400">
                                لا توجد فواتير مبيعات مسجلة لليوم حتى الآن
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {/* Modal 3: Customize Egg Tray Prices (تخصيص أسعار أطباق البيض) */}
      {showTrayPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    تخصيص وتعديل أسعار بيع أطباق البيض
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    تعديل أسعار بيع الأطباق في المتجر، نقاط البيع، وفواتير المبيعات فورياً.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTrayPriceModal(false)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTrayPrices} className="space-y-4 pt-4">
              <div className="space-y-3">
                {products
                  ?.filter(
                    (p) => p.trayCapacity || p.category === 'table_eggs' || p.category === 'hatching_eggs'
                  )
                  .map((prod) => {
                    const prices = trayPriceForm[prod.id] || {
                      retail: prod.retailPrice,
                      wholesale: prod.wholesalePrice,
                    };
                    const isDefaultTray = prod.id === 'prod-tray-18';

                    return (
                      <div
                        key={prod.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isDefaultTray
                            ? 'bg-amber-50/60 border-amber-300 shadow-sm'
                            : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Egg className={`w-4 h-4 ${isDefaultTray ? 'text-amber-600' : 'text-slate-500'}`} />
                            <span className="font-extrabold text-xs text-slate-900">
                              {prod.name}
                            </span>
                          </div>
                          {isDefaultTray && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold">
                              الطبق القياسي الافتراضي
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">
                              سعر التجزئة (قطاعي)
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                value={prices.retail || ''}
                                onChange={(e) =>
                                  setTrayPriceForm((prev) => ({
                                    ...prev,
                                    [prod.id]: {
                                      ...prices,
                                      retail: Number(e.target.value),
                                    },
                                  }))
                                }
                                className="w-full text-center py-1.5 px-2 font-mono font-black text-sm bg-white border border-slate-300 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-inner"
                              />
                              <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                {farmSettings.currency}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">
                              سعر الجملة
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                value={prices.wholesale || ''}
                                onChange={(e) =>
                                  setTrayPriceForm((prev) => ({
                                    ...prev,
                                    [prod.id]: {
                                      ...prices,
                                      wholesale: Number(e.target.value),
                                    },
                                  }))
                                }
                                className="w-full text-center py-1.5 px-2 font-mono font-black text-sm bg-white border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-inner"
                              />
                              <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                {farmSettings.currency}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs shadow-apple flex items-center justify-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ واعتماد الأسعار الجديدة في النظام</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowTrayPriceModal(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Add New Customer (إضافة عميل جديد) */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600">
                <UserPlus className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    إضافة عميل جديد
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    تسجيل عميل جديد وتعيينه مباشرة للفاتورة الحالية
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم العميل *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: مطعم الشرق، سوبرماركت الهدى..."
                  value={customerFormData.name}
                  onChange={(e) =>
                    setCustomerFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full glass-input text-xs py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    placeholder="77xxxxxxx"
                    value={customerFormData.phone}
                    onChange={(e) =>
                      setCustomerFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full glass-input text-xs py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    فئة العميل
                  </label>
                  <select
                    value={customerFormData.type}
                    onChange={(e) =>
                      setCustomerFormData((prev) => ({
                        ...prev,
                        type: e.target.value as any,
                      }))
                    }
                    className="w-full glass-input text-xs py-2"
                  >
                    <option value="retail">تجزئة (قطاعي)</option>
                    <option value="wholesale">جملة</option>
                    <option value="distributor">موزع معتمد</option>
                    <option value="farm">مزرعة / شريك</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  العنوان / المنطقة
                </label>
                <input
                  type="text"
                  placeholder="المدينة، الحي، الشارع..."
                  value={customerFormData.address}
                  onChange={(e) =>
                    setCustomerFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="w-full glass-input text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رصيد دين سابق (إن وجد)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={customerFormData.currentDebt || ''}
                    onChange={(e) =>
                      setCustomerFormData((prev) => ({
                        ...prev,
                        currentDebt: Number(e.target.value),
                      }))
                    }
                    className="w-full glass-input text-xs py-2 font-mono"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    {farmSettings.currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات
                </label>
                <input
                  type="text"
                  placeholder="أوقات التوصيل، تفضيلات، شروط السداد..."
                  value={customerFormData.notes}
                  onChange={(e) =>
                    setCustomerFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full glass-input text-xs py-2"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-apple flex items-center justify-center gap-2 transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>حفظ العميل وتعيينه للسلة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Edit Customer (تعديل بيانات عميل موجود) */}
      {showEditCustomerModal && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sky-600">
                <Edit2 className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    تعديل بيانات العميل
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    تحديث بيانات العميل ({activeCustomer.name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditCustomerModal(false)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCustomer} className="space-y-3 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم العميل *
                </label>
                <input
                  type="text"
                  required
                  value={customerFormData.name}
                  onChange={(e) =>
                    setCustomerFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full glass-input text-xs py-2 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    value={customerFormData.phone}
                    onChange={(e) =>
                      setCustomerFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full glass-input text-xs py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    فئة العميل
                  </label>
                  <select
                    value={customerFormData.type}
                    onChange={(e) =>
                      setCustomerFormData((prev) => ({
                        ...prev,
                        type: e.target.value as any,
                      }))
                    }
                    className="w-full glass-input text-xs py-2"
                  >
                    <option value="retail">تجزئة (قطاعي)</option>
                    <option value="wholesale">جملة</option>
                    <option value="distributor">موزع معتمد</option>
                    <option value="farm">مزرعة / شريك</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  العنوان / المنطقة
                </label>
                <input
                  type="text"
                  value={customerFormData.address}
                  onChange={(e) =>
                    setCustomerFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                  className="w-full glass-input text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات
                </label>
                <input
                  type="text"
                  value={customerFormData.notes}
                  onChange={(e) =>
                    setCustomerFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full glass-input text-xs py-2"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shadow-apple flex items-center justify-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditCustomerModal(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 6: Delete Customer Confirmation (حذف عميل) */}
      {showDeleteCustomerModal && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-extrabold text-slate-900">
                  تأكيد حذف العميل
                </h3>
              </div>
              <button
                onClick={() => setShowDeleteCustomerModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف العميل <b className="text-slate-900">({activeCustomer.name})</b> نهائياً من قاعدة البيانات؟
              </p>

              {activeCustomer.currentDebt > 0 && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                  <div className="font-extrabold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>تنبيه: يوجد رصيد مديونية غير مسدد!</span>
                  </div>
                  <div className="text-[11px] text-rose-700 font-mono font-bold">
                    المديونية المسجلة: {activeCustomer.currentDebt.toLocaleString('ar-SA')} {farmSettings.currency}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDeleteCustomer}
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm transition-all"
                >
                  نعم، حذف العميل نهائياً
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteCustomerModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Add New Product (إضافة منتج جديد لنقاط البيع) */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600">
                <PackagePlus className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">إضافة منتج جديد لنقاط البيع</h3>
                  <p className="text-[11px] text-slate-400">
                    أضف صنفاً جديداً للمتجر مع تحديد الأسعار والكمية المتاحة.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المنتج / الصنف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: طبق بيض سمان سوبر، كرتون لحم مجهز..."
                  value={productFormData.name}
                  onChange={(e) =>
                    setProductFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full glass-input text-xs py-2.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تصنيف المنتج
                  </label>
                  <select
                    value={productFormData.category}
                    onChange={(e) =>
                      setProductFormData((prev) => ({
                        ...prev,
                        category: e.target.value as any,
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
                    وحدة البيع
                  </label>
                  <input
                    type="text"
                    placeholder="طبق، حبة، جوز، كغم..."
                    value={productFormData.unit}
                    onChange={(e) =>
                      setProductFormData((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    className="w-full glass-input text-xs py-2.5"
                  />
                </div>
              </div>

              {productFormData.category === 'table_eggs' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سعة الطبق (عدد البيضات في الطبق)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[12, 18, 24, 30].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() =>
                          setProductFormData((prev) => ({ ...prev, trayCapacity: size as any }))
                        }
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          productFormData.trayCapacity === size
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {size} بيضة
                        {size === 18 && <span className="block text-[9px] text-emerald-600">القياسي</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سعر التجزئة ({farmSettings.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productFormData.retailPrice}
                    onChange={(e) =>
                      setProductFormData((prev) => ({
                        ...prev,
                        retailPrice: Number(e.target.value),
                      }))
                    }
                    className="w-full glass-input text-xs py-2.5 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    سعر الجملة ({farmSettings.currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productFormData.wholesalePrice}
                    onChange={(e) =>
                      setProductFormData((prev) => ({
                        ...prev,
                        wholesalePrice: Number(e.target.value),
                      }))
                    }
                    className="w-full glass-input text-xs py-2.5 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الكمية المتاحة في المخزون
                </label>
                <input
                  type="number"
                  min="0"
                  value={productFormData.stockQuantity}
                  onChange={(e) =>
                    setProductFormData((prev) => ({
                      ...prev,
                      stockQuantity: Number(e.target.value),
                    }))
                  }
                  className="w-full glass-input text-xs py-2.5 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-apple flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>إضافة المنتج فوراً</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
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
