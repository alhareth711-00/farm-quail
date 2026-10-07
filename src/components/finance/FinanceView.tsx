import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { ExpenseRecord, ExpenseCategory, FarmPurchaseRecord, CustomExpenseCategory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { recordExpenseJournalEntry } from '../../services/accountingService';
import {
  WalletCards,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Calendar,
  X,
  CreditCard,
  FileSpreadsheet,
  Receipt,
  Trash2,
  Fuel,
  ShoppingBag,
  Tag,
  Package,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Building2,
  Boxes,
  Clock,
  ArrowDownLeft,
  FolderPlus,
  FileText,
} from 'lucide-react';

export const FinanceView: React.FC = () => {
  const { farmSettings, userName } = useAuth();
  const { toast } = useToast();

  // Database Queries
  const expenses = useLiveQuery(() => db.expenses.reverse().sortBy('date'), []);
  const invoices = useLiveQuery(() => db.invoices.toArray(), []);
  const vouchers = useLiveQuery(() => db.receiptVouchers.toArray(), []);
  const purchases = useLiveQuery(() => db.purchases.reverse().sortBy('date'), []);
  const customCategories = useLiveQuery(() => db.customCategories.toArray(), []);

  // Filter Period
  const [period, setPeriod] = useState<'today' | 'month' | 'year' | 'all'>('month');
  const [activeTab, setActiveTab] = useState<'expenses' | 'purchases'>('expenses');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [purchaseSearch, setPurchaseSearch] = useState<string>('');

  // Add Expense Modal State
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('feed_purchase');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expDescription, setExpDescription] = useState('');
  const [expRecipient, setExpRecipient] = useState('');
  const [expPaidFrom, setExpPaidFrom] = useState<'cash_box' | 'bank_account'>('cash_box');
  const [expRef, setExpRef] = useState('');

  // Manage Categories Modal State
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Independent Farm Purchase Modal State
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [purchDate, setPurchDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchItemName, setPurchItemName] = useState('');
  const [purchQuantity, setPurchQuantity] = useState<number | ''>('');
  const [purchUnit, setPurchUnit] = useState('كيس');
  const [purchUnitPrice, setPurchUnitPrice] = useState<number | ''>('');
  const [purchTotalAmount, setPurchTotalAmount] = useState<number>(0);
  const [purchSupplier, setPurchSupplier] = useState('');
  const [purchPaidFrom, setPurchPaidFrom] = useState<'cash_box' | 'bank_account' | 'credit'>('cash_box');
  const [purchInvoiceRef, setPurchInvoiceRef] = useState('');
  const [purchNotes, setPurchNotes] = useState('');

  // Date filtering helper
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
  const currentYearStr = todayStr.slice(0, 4); // YYYY

  const isDateInPeriod = (dateStr: string) => {
    if (period === 'all') return true;
    if (period === 'today') return dateStr === todayStr;
    if (period === 'month') return dateStr.startsWith(currentMonthStr);
    if (period === 'year') return dateStr.startsWith(currentYearStr);
    return true;
  };

  // Filtered lists
  const periodInvoices = invoices?.filter((inv) => isDateInPeriod(inv.date)) || [];
  const periodExpenses = expenses?.filter((e) => isDateInPeriod(e.date)) || [];
  const periodPurchases = purchases?.filter((p) => isDateInPeriod(p.date)) || [];

  // Totals
  const totalRevenue = periodInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalExpenses = periodExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalPurchases = periodPurchases.reduce((acc, p) => acc + p.totalAmount, 0);

  // Cash vs Credit purchases breakdown
  const cashPurchases = periodPurchases.filter((p) => p.paidFrom === 'cash_box').reduce((acc, p) => acc + p.totalAmount, 0);
  const bankPurchases = periodPurchases.filter((p) => p.paidFrom === 'bank_account').reduce((acc, p) => acc + p.totalAmount, 0);
  const creditPurchases = periodPurchases.filter((p) => p.paidFrom === 'credit').reduce((acc, p) => acc + p.totalAmount, 0);

  // Net Profit: Revenue - (Operating Expenses + Purchases)
  const netProfit = totalRevenue - (totalExpenses + totalPurchases);
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

  // Base Category classification breakdown
  const baseCategoryLabels: Record<string, string> = {
    feed_purchase: 'شراء واستخدام أعلاف',
    salaries_advances: 'سلف ورواتب الموظفين',
    medications_vitamins: 'أدوية وفيتامينات وتحصينات',
    packaging_bedding: 'نشارة وأطباق تعبئة كرتونية',
    utilities_maintenance: 'كهرباء ومياه وصيانة عنابر',
    delivery_petrol: 'بترول التوصيل / المتر وقود',
    other: 'مصروفات تشغيلية أخرى',
  };

  // Helper to resolve custom or base category labels
  const getCategoryLabel = (cat: string) => {
    if (baseCategoryLabels[cat]) return baseCategoryLabels[cat];
    const foundCustom = customCategories?.find((c) => c.name === cat || c.id === cat);
    return foundCustom ? foundCustom.name : cat;
  };

  // Auto-calculate purchase total
  const handleQuantityChange = (qtyVal: number | '') => {
    setPurchQuantity(qtyVal);
    const q = typeof qtyVal === 'number' ? qtyVal : 0;
    const p = typeof purchUnitPrice === 'number' ? purchUnitPrice : 0;
    setPurchTotalAmount(q * p);
  };

  const handleUnitPriceChange = (priceVal: number | '') => {
    setPurchUnitPrice(priceVal);
    const q = typeof purchQuantity === 'number' ? purchQuantity : 0;
    const p = typeof priceVal === 'number' ? priceVal : 0;
    setPurchTotalAmount(q * p);
  };

  // 1. Save Operational Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expAmount);
    if (amountNum <= 0 || !expDescription.trim()) {
      toast('يرجى إدخال مبلغ وبيان صحيح للمصروف', 'error');
      return;
    }

    const newExp: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      date: expDate,
      category: expCategory,
      amount: amountNum,
      description: expDescription.trim(),
      recipient: expRecipient.trim() || undefined,
      invoiceOrBillRef: expRef.trim() || undefined,
      paidFrom: expPaidFrom,
      recordedBy: userName,
      createdAt: new Date().toISOString(),
    };

    await db.expenses.add(newExp);

    // Record automated double-entry journal entry for expense
    try {
      await recordExpenseJournalEntry(newExp);
    } catch (accErr) {
      console.warn('Accounting expense journal error:', accErr);
    }

    toast(`تم تسجيل سند الصرف بمبلغ ${amountNum.toLocaleString('ar-SA')} ${farmSettings.currency}!`, 'success');
    setShowAddExpenseModal(false);
    setExpAmount('');
    setExpDescription('');
    setExpRecipient('');
    setExpRef('');
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      await db.expenses.delete(id);
      toast('تم حذف المصروف بنجاح', 'info');
    }
  };

  // 2. Save Custom Expense Category
  const handleSaveCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast('يرجى إدخال اسم التصنيف', 'error');
      return;
    }

    // Check duplicate
    const exists = customCategories?.some(
      (c) => c.name.trim().toLowerCase() === newCatName.trim().toLowerCase()
    );
    if (exists || baseCategoryLabels[newCatName.trim()]) {
      toast('هذا التصنيف موجود بالفعل', 'warning');
      return;
    }

    const newCat: CustomExpenseCategory = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      description: newCatDesc.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    await db.customCategories.add(newCat);
    toast(`تم إضافة تصنيف المصروفات "${newCat.name}" بنجاح!`, 'success');
    setNewCatName('');
    setNewCatDesc('');
  };

  const handleDeleteCustomCategory = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف تصنيف "${name}"؟`)) {
      await db.customCategories.delete(id);
      toast(`تم حذف التصنيف "${name}"`, 'info');
    }
  };

  // 3. Save Independent Farm Purchase Record
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(purchQuantity);
    const unitPrice = Number(purchUnitPrice);
    const total = purchTotalAmount > 0 ? purchTotalAmount : qty * unitPrice;

    if (!purchItemName.trim() || qty <= 0 || total <= 0) {
      toast('يرجى إدخال اسم البضاعة، الكمية، والسعر الإفرادي بشكل صحيح', 'error');
      return;
    }

    const newPurch: FarmPurchaseRecord = {
      id: `purch-${Date.now()}`,
      date: purchDate,
      itemName: purchItemName.trim(),
      quantity: qty,
      unitPrice: unitPrice,
      totalAmount: total,
      unit: purchUnit.trim() || 'وحدة',
      supplier: purchSupplier.trim() || undefined,
      paidFrom: purchPaidFrom,
      invoiceRef: purchInvoiceRef.trim() || undefined,
      notes: purchNotes.trim() || undefined,
      recordedBy: userName,
      createdAt: new Date().toISOString(),
    };

    await db.purchases.add(newPurch);
    toast(
      `تم تسجيل فاتورة الشراء لـ "${newPurch.itemName}" بقيمة ${newPurch.totalAmount.toLocaleString('ar-SA')} ${farmSettings.currency}!`,
      'success'
    );

    // Reset Form
    setPurchItemName('');
    setPurchQuantity('');
    setPurchUnitPrice('');
    setPurchTotalAmount(0);
    setPurchSupplier('');
    setPurchInvoiceRef('');
    setPurchNotes('');
    setShowAddPurchaseModal(false);
  };

  const handleDeletePurchase = async (id: string, itemName: string) => {
    if (confirm(`هل أنت متأكد من حذف سجل الشراء لـ "${itemName}"؟`)) {
      await db.purchases.delete(id);
      toast(`تم حذف سجل الشراء لـ "${itemName}" بنجاح`, 'info');
    }
  };

  // Filtered purchases by search
  const filteredPurchases = periodPurchases.filter((p) => {
    if (!purchaseSearch.trim()) return true;
    const q = purchaseSearch.trim().toLowerCase();
    return (
      p.itemName.toLowerCase().includes(q) ||
      (p.supplier && p.supplier.toLowerCase().includes(q)) ||
      (p.invoiceRef && p.invoiceRef.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <WalletCards className="w-6 h-6 text-emerald-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              المصروفات والمالية والأرباح (Finance & P&L)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تقرير الأرباح والخسائر الشامل (P&L)، إدارة بنود وتصنيفات المصروفات المخصصة، وسجل مشتريات المزرعة المستقل.
          </p>
        </div>

        {/* Action Buttons & Period Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Filter Tabs */}
          <div className="p-1 rounded-2xl bg-white border border-slate-200 flex shadow-sm">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'today' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'month' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'year' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا العام
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
          </div>

          {/* Button: Add / Manage Categories */}
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 border border-slate-300/80 shadow-sm transition-all"
            title="إدارة وإنشاء بنود وتصنيفات مخصصة للمصروفات"
          >
            <Tag className="w-4 h-4 text-indigo-600" />
            <span>إضافة تصنيف مصروفات</span>
          </button>

          {/* Button: Independent Farm Purchases */}
          <button
            onClick={() => {
              setPurchDate(new Date().toISOString().split('T')[0]);
              setPurchItemName('');
              setPurchQuantity('');
              setPurchUnit('كيس');
              setPurchUnitPrice('');
              setPurchTotalAmount(0);
              setPurchSupplier('');
              setPurchPaidFrom('cash_box');
              setPurchInvoiceRef('');
              setPurchNotes('');
              setShowAddPurchaseModal(true);
            }}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            title="تسجيل بضائع ومستلزمات وأعلاف المزرعة في السجل المستقل"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>+ مشتريات</span>
          </button>

          {/* Button: Add Expense Voucher */}
          <button
            onClick={() => {
              setExpDate(new Date().toISOString().split('T')[0]);
              setExpAmount('');
              setExpCategory('feed_purchase');
              setExpDescription('');
              setExpRecipient('');
              setExpRef('');
              setExpPaidFrom('cash_box');
              setShowAddExpenseModal(true);
            }}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            title="تسجيل سند صرف مالي جديد"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>تسجيل سند صرف</span>
          </button>
        </div>
      </div>

      {/* Financial Overview KPI Cards (P&L Summary) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-3xl glass-card border border-emerald-200/80 bg-emerald-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-900">إجمالي الإيرادات (المبيعات)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono">
            {totalRevenue.toLocaleString('ar-SA')} {farmSettings.currency}
          </div>
          <div className="text-[11px] text-emerald-800 mt-1">
            عدد الفواتير الصادرة: <b className="font-mono">{periodInvoices.length}</b>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="p-5 rounded-3xl glass-card border border-rose-200/80 bg-rose-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-900">المصروفات التشغيلية (سندات الصرف)</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-950 font-mono">
            {totalExpenses.toLocaleString('ar-SA')} {farmSettings.currency}
          </div>
          <div className="text-[11px] text-rose-800 mt-1">
            عدد سندات الصرف: <b className="font-mono">{periodExpenses.length}</b>
          </div>
        </div>

        {/* Farm Purchases */}
        <div className="p-5 rounded-3xl glass-card border border-amber-200/80 bg-amber-50/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900">مشتريات المزرعة المستقلة</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">
            {totalPurchases.toLocaleString('ar-SA')} {farmSettings.currency}
          </div>
          <div className="text-[11px] text-amber-800 mt-1">
            عدد فواتير المشتريات: <b className="font-mono">{periodPurchases.length}</b>
          </div>
        </div>

        {/* Net Operating Profit */}
        <div
          className={`p-5 rounded-3xl glass-card border ${
            netProfit >= 0
              ? 'border-teal-200/80 bg-teal-50/40 text-teal-950'
              : 'border-rose-200/80 bg-rose-50/40 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold">صافي الربح الفعلي (Net Profit)</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                netProfit >= 0 ? 'bg-teal-600' : 'bg-rose-600'
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono">
            {netProfit.toLocaleString('ar-SA')} {farmSettings.currency}
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1 opacity-85">
            <span>{netProfit >= 0 ? 'فترة رابحة بامتياز' : 'فترة عجز تشغيلي'}</span>
            <span className="font-mono font-bold">هامش: {profitMargin}%</span>
          </div>
        </div>
      </div>

      {/* Main Records Area with Sub-Tabs */}
      <div className="space-y-4">
        {/* Navigation Tabs between Operating Expenses & Farm Purchases */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                activeTab === 'expenses'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>المصروفات وسندات الصرف</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'expenses' ? 'bg-rose-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {periodExpenses.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('purchases')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                activeTab === 'purchases'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>سجل مشتريات المزرعة المستقل</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'purchases' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {periodPurchases.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-400 hidden sm:block">
            {activeTab === 'expenses' ? 'سجل المصروفات اليومية وسندات الصرف' : 'سجل بضائع وأعلاف ومستلزمات المزرعة المستقل'}
          </div>
        </div>

        {/* TAB 1: OPERATIONAL EXPENSES */}
        {activeTab === 'expenses' && (
          <div className="rounded-3xl glass-panel p-5 border border-slate-200/80 space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-600" />
                <h3 className="font-extrabold text-sm text-slate-800">
                  سجل المصروفات وسندات الصرف المفصلة
                </h3>
              </div>

              {/* Filter by Category (Includes Base & Custom) */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-slate-500 font-bold whitespace-nowrap">التصنيف:</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="glass-input text-xs py-1.5 w-full sm:w-60"
                >
                  <option value="all">جميع التصنيفات</option>
                  <optgroup label="التصنيفات الأساسية">
                    {Object.entries(baseCategoryLabels).map(([cat, label]) => (
                      <option key={cat} value={cat}>
                        {label}
                      </option>
                    ))}
                  </optgroup>
                  {customCategories && customCategories.length > 0 && (
                    <optgroup label="التصنيفات المخصصة">
                      {customCategories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">تاريخ الصرف</th>
                    <th className="p-3.5">التصنيف</th>
                    <th className="p-3.5">بيان المصروف</th>
                    <th className="p-3.5">المستلم / المورد</th>
                    <th className="p-3.5">طريقة الدفع</th>
                    <th className="p-3.5 text-center">المبلغ</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodExpenses && periodExpenses.length > 0 ? (
                    periodExpenses
                      .filter((e) => filterCategory === 'all' || e.category === filterCategory)
                      .map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-slate-900">{e.date}</td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] border border-slate-200">
                              {getCategoryLabel(e.category)}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-800">{e.description}</td>
                          <td className="p-3.5 text-slate-600">{e.recipient || '-'}</td>
                          <td className="p-3.5">
                            <span className="text-[11px] text-slate-500">
                              {e.paidFrom === 'cash_box' ? 'الصندوق النقدي' : 'الحساب البنكي'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-black text-rose-700 text-sm">
                            {e.amount.toLocaleString('ar-SA')} {farmSettings.currency}
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleDeleteExpense(e.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="حذف هذا المصروف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        لا توجد مصروفات مسجلة للفترة المحددة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: INDEPENDENT FARM PURCHASES */}
        {activeTab === 'purchases' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Purchases Specific Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500">مشتريات نقداً (من الصندوق)</span>
                  <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                    {cashPurchases.toLocaleString('ar-SA')} {farmSettings.currency}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  كاش
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500">مشتريات عبر الحساب البنكي</span>
                  <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                    {bankPurchases.toLocaleString('ar-SA')} {farmSettings.currency}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  بنك
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500">مشتريات آجلة (دين على المزرعة)</span>
                  <div className="text-lg font-black text-amber-700 font-mono mt-0.5">
                    {creditPurchases.toLocaleString('ar-SA')} {farmSettings.currency}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                  آجل
                </div>
              </div>
            </div>

            {/* Purchases Table & Search */}
            <div className="rounded-3xl glass-panel p-5 border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800">
                      تقرير تفصيلي بمشتريات المزرعة المستقلة
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      سجل البضائع، الأعلاف، الأطباق، ومستلزمات الإنتاج مع السعر الإفرادي والكمية.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={purchaseSearch}
                      onChange={(e) => setPurchaseSearch(e.target.value)}
                      placeholder="بحث باسم البضاعة، المورد، الفاتورة..."
                      className="glass-input text-xs pr-8 py-1.5 w-full"
                    />
                  </div>

                  <button
                    onClick={() => setShowAddPurchaseModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>شراء جديد</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">تاريخ الشراء</th>
                      <th className="p-3.5">اسم البضاعة / الصنف</th>
                      <th className="p-3.5 text-center">الكمية والوحدة</th>
                      <th className="p-3.5 text-center">السعر الإفرادي</th>
                      <th className="p-3.5 text-center">الإجمالي</th>
                      <th className="p-3.5">المورد / المحل</th>
                      <th className="p-3.5">طريقة السداد</th>
                      <th className="p-3.5">رقم الفاتورة</th>
                      <th className="p-3.5">المسجل</th>
                      <th className="p-3.5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPurchases && filteredPurchases.length > 0 ? (
                      filteredPurchases.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-slate-900">{p.date}</td>
                          <td className="p-3.5">
                            <span className="font-bold text-slate-900 block">{p.itemName}</span>
                            {p.notes && <span className="text-[10px] text-slate-500 block truncate max-w-xs">{p.notes}</span>}
                          </td>
                          <td className="p-3.5 text-center font-bold text-slate-800">
                            <span className="font-mono text-sm">{p.quantity.toLocaleString('ar-SA')}</span>{' '}
                            <span className="text-[11px] text-slate-500">{p.unit || 'وحدة'}</span>
                          </td>
                          <td className="p-3.5 text-center font-mono font-bold text-slate-700">
                            {p.unitPrice.toLocaleString('ar-SA')} {farmSettings.currency}
                          </td>
                          <td className="p-3.5 text-center font-mono font-black text-emerald-700 text-sm">
                            {p.totalAmount.toLocaleString('ar-SA')} {farmSettings.currency}
                          </td>
                          <td className="p-3.5 text-slate-700 font-semibold">{p.supplier || '-'}</td>
                          <td className="p-3.5">
                            {p.paidFrom === 'cash_box' && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                نقداً (الصندوق)
                              </span>
                            )}
                            {p.paidFrom === 'bank_account' && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                                حساب بنكي
                              </span>
                            )}
                            {p.paidFrom === 'credit' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                                آجل (دين)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-slate-600">{p.invoiceRef || '-'}</td>
                          <td className="p-3.5 text-slate-500 text-[11px]">{p.recordedBy}</td>
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleDeletePurchase(p.id, p.itemName)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="حذف هذا السجل"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400">
                          لا توجد عمليات شراء مسجلة للفترة المحددة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD OPERATIONAL EXPENSE */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <Receipt className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل سند صرف / مصروف تشغيلي
                </h3>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الصرف
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ المصروف ({farmSettings.currency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full glass-input text-center text-lg font-mono font-bold text-rose-700"
                    placeholder="0"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    تصنيف المصروف
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddExpenseModal(false);
                      setShowAddCategoryModal(true);
                    }}
                    className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>إضافة تصنيف جديد</span>
                  </button>
                </div>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="w-full glass-input text-xs"
                >
                  <optgroup label="التصنيفات الأساسية">
                    {Object.entries(baseCategoryLabels).map(([cat, label]) => (
                      <option key={cat} value={cat}>
                        {label}
                      </option>
                    ))}
                  </optgroup>
                  {customCategories && customCategories.length > 0 && (
                    <optgroup label="التصنيفات المخصصة">
                      {customCategories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  بيان الصرف وتفاصيل البند
                </label>
                <input
                  type="text"
                  required
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="مثال: أجور صيانة دورية للشفاطات، وجبة عمال"
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الجهة المستلمة
                  </label>
                  <input
                    type="text"
                    value={expRecipient}
                    onChange={(e) => setExpRecipient(e.target.value)}
                    placeholder="اسم المورد أو العامل"
                    className="w-full glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    طريقة السداد
                  </label>
                  <select
                    value={expPaidFrom}
                    onChange={(e) => setExpPaidFrom(e.target.value as any)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="cash_box">الصندوق النقدي بالمزرعة</option>
                    <option value="bank_account">الحساب البنكي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الفاتورة أو الإيصال الخارجي (إن وجد)
                </label>
                <input
                  type="text"
                  value={expRef}
                  onChange={(e) => setExpRef(e.target.value)}
                  placeholder="مثال: سند صرف رقم 402"
                  className="w-full glass-input text-xs font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  اعتماد سند الصرف
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE & ADD EXPENSE CATEGORIES */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <Tag className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  إدارة وتصنيف بنود المصروفات المخصصة
                </h3>
              </div>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form to add a new custom category */}
            <form onSubmit={handleSaveCustomCategory} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <FolderPlus className="w-4 h-4 text-indigo-600" />
                <span>إضافة بند / تصنيف جديد للمصروفات</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  اسم التصنيف أو البند المخصص <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="مثال: إيجار هناجر، نقل وشحن بضائع، فحص مخبري بيطري"
                  className="w-full glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  الوصف أو الغرض من البند (اختياري)
                </label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="ملاحظات حول المصروفات التابعة لهذا البند"
                  className="w-full glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>حفظ التصنيف الجديد</span>
              </button>
            </form>

            {/* List of Custom Categories */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>التصنيفات المخصصة الحالية ({customCategories?.length || 0})</span>
              </h4>

              {customCategories && customCategories.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {customCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-indigo-200 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{cat.name}</div>
                        {cat.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{cat.description}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomCategory(cat.id, cat.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="حذف هذا التصنيف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-400">
                  لم يتم إضافة تصنيفات مخصصة بعد. أضف بنودك الخاصة من النموذج أعلاه.
                </div>
              )}

              {/* Default System Categories (Read-only list) */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-2">
                  التصنيفات الافتراضية الثابتة للنظام:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(baseCategoryLabels).map((lbl, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-semibold"
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddCategoryModal(false)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD INDEPENDENT FARM PURCHASE */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <ShoppingBag className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل مشتريات مستلزمات وبضائع المزرعة
                </h3>
              </div>
              <button
                onClick={() => setShowAddPurchaseModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4">
              {/* Row 1: Date & Item Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الشراء <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={purchDate}
                    onChange={(e) => setPurchDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم البضاعة / الصنف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={purchItemName}
                    onChange={(e) => setPurchItemName(e.target.value)}
                    placeholder="مثال: علف بادي سمان 24%، أطباق بيض 18 بيضة"
                    className="w-full glass-input text-xs font-bold"
                    autoFocus
                  />
                </div>
              </div>

              {/* Row 2: Quantity, Unit, Unit Price, Total */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                <div className="text-[11px] font-black text-emerald-900 flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الكمية واحتساب إجمالي الفاتورة آلياً</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      الكمية <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      value={purchQuantity}
                      onChange={(e) => handleQuantityChange(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full glass-input text-center text-sm font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      الوحدة
                    </label>
                    <select
                      value={purchUnit}
                      onChange={(e) => setPurchUnit(e.target.value)}
                      className="w-full glass-input text-xs"
                    >
                      <option value="كيس">كيس</option>
                      <option value="طبق">طبق</option>
                      <option value="كرتون">كرتون</option>
                      <option value="حبة">حبة / عدد</option>
                      <option value="لتر">لتر</option>
                      <option value="كغم">كغم</option>
                      <option value="طن">طن</option>
                      <option value="متر">متر</option>
                      <option value="برميل">برميل</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      السعر الإفرادي <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={purchUnitPrice}
                      onChange={(e) => handleUnitPriceChange(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="w-full glass-input text-center text-sm font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                      الإجمالي المحسوب
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={purchTotalAmount || ''}
                      onChange={(e) => setPurchTotalAmount(Number(e.target.value))}
                      className="w-full glass-input text-center text-sm font-mono font-black text-emerald-700 bg-white"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-emerald-800 text-left font-mono">
                  الإجمالي: <b>{purchTotalAmount.toLocaleString('ar-SA')}</b> {farmSettings.currency}
                </div>
              </div>

              {/* Row 3: Supplier, Payment Method, Invoice Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المورد / المحل التجاري
                  </label>
                  <input
                    type="text"
                    value={purchSupplier}
                    onChange={(e) => setPurchSupplier(e.target.value)}
                    placeholder="اسم المورد أو الشركة"
                    className="w-full glass-input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    طريقة السداد <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={purchPaidFrom}
                    onChange={(e) => setPurchPaidFrom(e.target.value as any)}
                    className="w-full glass-input text-xs font-bold"
                  >
                    <option value="cash_box">نقداً من الصندوق (كاش)</option>
                    <option value="bank_account">تحويل من الحساب البنكي</option>
                    <option value="credit">آجل / دين على المزرعة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الفاتورة / السند
                  </label>
                  <input
                    type="text"
                    value={purchInvoiceRef}
                    onChange={(e) => setPurchInvoiceRef(e.target.value)}
                    placeholder="مثال: فاتورة 7812"
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
              </div>

              {/* Row 4: Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات وبيان البضاعة
                </label>
                <input
                  type="text"
                  value={purchNotes}
                  onChange={(e) => setPurchNotes(e.target.value)}
                  placeholder="ملاحظات حول جودة الصنف، تاريخ الصلاحية، أو الاستخدام"
                  className="w-full glass-input text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  حفظ وتثبيت سجل المشتريات
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPurchaseModal(false)}
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
