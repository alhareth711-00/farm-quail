import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type {
  ExpenseRecord,
  ExpenseCategory,
  FarmPurchaseRecord,
  CustomExpenseCategory,
  ReceiptVoucher,
  VoucherPaymentType,
  OrderInvoice,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  recordExpenseJournalEntry,
  recordReceiptVoucherJournalEntry,
} from '../../services/accountingService';
import {
  WalletCards,
  Plus,
  Receipt,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  X,
  CreditCard,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Tag,
  Scale,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Phone,
  Trash2,
  ExternalLink,
  Coins,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface FinanceViewProps {
  onNavigateToAccounting?: () => void;
  onNavigateToPOS?: () => void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  onNavigateToAccounting,
  onNavigateToPOS,
}) => {
  const { farmSettings, userName } = useAuth();
  const { toast } = useToast();

  // Database Live Queries
  const expenses = useLiveQuery(() => db.expenses.reverse().sortBy('date'), []);
  const invoices = useLiveQuery(() => db.invoices.reverse().sortBy('date'), []);
  const vouchers = useLiveQuery(() => db.receiptVouchers.reverse().sortBy('date'), []);
  const customers = useLiveQuery(() => db.customers.toArray(), []);
  const purchases = useLiveQuery(() => db.purchases.reverse().sortBy('date'), []);
  const customCategories = useLiveQuery(() => db.customCategories.toArray(), []);
  const accounts = useLiveQuery(() => db.accounts.toArray(), []);

  // Main Tab State:
  // 'receipts' = سندات القبض
  // 'expenses' = سندات الصرف والمصروفات
  // 'invoices' = سجل الفواتير وحالة الدفع
  // 'purchases' = مشتريات المزرعة
  // 'pl_summary' = تقرير الأرباح والخسائر
  const [activeTab, setActiveTab] = useState<
    'receipts' | 'expenses' | 'invoices' | 'purchases' | 'pl_summary'
  >('receipts');

  // Period Filter
  const [period, setPeriod] = useState<'today' | 'month' | 'year' | 'all'>('month');

  // Search & Filters per Tab
  const [receiptSearch, setReceiptSearch] = useState('');
  const [receiptPaymentFilter, setReceiptPaymentFilter] = useState<string>('all');

  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');

  // Invoices Tab Filters: crucial search by manual invoice number!
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [invoiceMethodFilter, setInvoiceMethodFilter] = useState<string>('all');

  const [purchaseSearch, setPurchaseSearch] = useState('');

  // -------------------------------------------------------------
  // Modals States
  // -------------------------------------------------------------
  // 1. Receipt Voucher Modal
  const [showAddReceiptModal, setShowAddReceiptModal] = useState(false);
  const [recCustomerId, setRecCustomerId] = useState('');
  const [recAmount, setRecAmount] = useState<number | ''>('');
  const [recPaymentType, setRecPaymentType] = useState<VoucherPaymentType>('cash');
  const [recDate, setRecDate] = useState(new Date().toISOString().split('T')[0]);
  const [recNotes, setRecNotes] = useState('');

  // 2. Expense Voucher Modal
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('feed_purchase');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expDescription, setExpDescription] = useState('');
  const [expRecipient, setExpRecipient] = useState('');
  const [expPaidFrom, setExpPaidFrom] = useState<'cash_box' | 'bank_account'>('cash_box');
  const [expRef, setExpRef] = useState('');

  // 3. Custom Category Modal
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // 4. Farm Purchase Modal
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

  // 5. Selected Invoice Modal for Details & Print
  const [selectedInvoice, setSelectedInvoice] = useState<OrderInvoice | null>(null);

  // 6. Selected Voucher Modal for Details & Print
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<ReceiptVoucher | null>(null);

  // -------------------------------------------------------------
  // Date Filtering Helper
  // -------------------------------------------------------------
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);
  const currentYearStr = todayStr.slice(0, 4);

  const isDateInPeriod = (dateStr: string) => {
    if (!dateStr) return true;
    if (period === 'all') return true;
    if (period === 'today') return dateStr === todayStr;
    if (period === 'month') return dateStr.startsWith(currentMonthStr);
    if (period === 'year') return dateStr.startsWith(currentYearStr);
    return true;
  };

  // Filtered collections by period
  const periodInvoices = invoices?.filter((inv) => isDateInPeriod(inv.date)) || [];
  const periodExpenses = expenses?.filter((e) => isDateInPeriod(e.date)) || [];
  const periodVouchers = vouchers?.filter((v) => isDateInPeriod(v.date)) || [];
  const periodPurchases = purchases?.filter((p) => isDateInPeriod(p.date)) || [];

  // Global Financial KPIs
  const totalInvoicedSales = periodInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  const totalPaidInvoices = periodInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
  const totalRemainingInvoices = periodInvoices.reduce((sum, inv) => sum + (Number(inv.remainingAmount) || 0), 0);

  const totalReceiptsAmount = periodVouchers.reduce((sum, v) => sum + (Number(v.amount) || 0), 0);
  const totalExpensesAmount = periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalPurchasesAmount = periodPurchases.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

  // Cash Box balance from Chart of Accounts
  const cashAccount = accounts?.find((a) => a.code === '10101');
  const cashBalance = cashAccount ? cashAccount.currentBalance : 0;

  // Total Customer Debt from Customers table
  const totalCustomerDebt = customers?.reduce((sum, c) => sum + (Number(c.currentDebt) || 0), 0) || 0;

  // Net Profit
  const netProfit = totalInvoicedSales - (totalExpensesAmount + totalPurchasesAmount);
  const profitMargin = totalInvoicedSales > 0 ? Math.round((netProfit / totalInvoicedSales) * 100) : 0;

  // Base Category Labels dictionary
  const baseCategoryLabels: Record<string, string> = {
    feed_purchase: 'شراء واستخدام أعلاف',
    packaging_bedding: 'نشارة خشب وأطباق تعبئة',
    utilities_maintenance: 'صيانة عنابر وأقفاص ومعدات',
    salaries_advances: 'سلف وأجور ورواتب العمال',
    delivery_petrol: 'بترول ومحروقات التوصيل والمولد',
    medications_vitamins: 'أدوية وفيتامينات ولقاحات',
    electricity_water: 'فواتير كهرباء ومياه وتشغيل',
    other: 'مصروفات تشغيلية أخرى',
  };

  const getCategoryLabel = (cat: string) => {
    if (baseCategoryLabels[cat]) return baseCategoryLabels[cat];
    const foundCustom = customCategories?.find((c) => c.name === cat || c.id === cat);
    return foundCustom ? foundCustom.name : cat;
  };

  // Payment method badge helper
  const renderPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <Coins className="w-3.5 h-3.5" />
            <span>نقداً (الصندوق)</span>
          </span>
        );
      case 'credit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>آجل (دين عميل)</span>
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>دفع جزئي</span>
          </span>
        );
      case 'kuraimi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <Building2 className="w-3.5 h-3.5" />
            <span>محفظة الكريمي</span>
          </span>
        );
      case 'jeeb':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
            <WalletCards className="w-3.5 h-3.5" />
            <span>محفظة جيب</span>
          </span>
        );
      case 'jawali':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
            <CreditCard className="w-3.5 h-3.5" />
            <span>محفظة جوالي</span>
          </span>
        );
      case 'bank':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold border border-sky-200">
            <Building2 className="w-3.5 h-3.5" />
            <span>حساب بنكي</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
            {method}
          </span>
        );
    }
  };

  // Invoice payment status helper
  const getInvoicePaymentStatus = (inv: OrderInvoice) => {
    const remaining = Number(inv.remainingAmount) || 0;
    const paid = Number(inv.paidAmount) || 0;

    if (remaining <= 0 || inv.paymentMethod === 'cash' || inv.paymentMethod === 'kuraimi' || inv.paymentMethod === 'jeeb' || inv.paymentMethod === 'jawali') {
      return {
        status: 'paid',
        label: 'مدفوعة بالكامل',
        badge: (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>مدفوعة</span>
          </span>
        ),
      };
    }

    if (paid === 0 && remaining > 0) {
      return {
        status: 'unpaid',
        label: 'غير مدفوعة (آجل)',
        badge: (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>غير مدفوعة</span>
          </span>
        ),
      };
    }

    return {
      status: 'partial',
      label: 'مدفوعة جزئياً',
      badge: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          <span>مدفوعة جزئياً</span>
        </span>
      ),
    };
  };

  // -------------------------------------------------------------
  // ACTIONS & HANDLERS
  // -------------------------------------------------------------

  // 1. Save Receipt Voucher (سند قبض وتحصيل دين عميل)
  const handleSaveReceiptVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(recAmount);
    if (!recCustomerId || amountNum <= 0) {
      toast('يرجى اختيار العميل وتحديد مبلغ سند القبض بشكل صحيح', 'error');
      return;
    }

    const selectedCust = customers?.find((c) => c.id === recCustomerId);
    if (!selectedCust) {
      toast('العميل المحدد غير موجود', 'error');
      return;
    }

    const voucherNum = `RV-${Date.now().toString().slice(-6)}`;
    const newVoucher: ReceiptVoucher = {
      id: `rv-${Date.now()}`,
      voucherNumber: voucherNum,
      date: recDate,
      customerId: selectedCust.id,
      customerName: selectedCust.name,
      amount: amountNum,
      paymentType: recPaymentType,
      notes: recNotes.trim() || undefined,
      recordedBy: userName || 'محاسب المالية',
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Add to receipt vouchers table
      await db.receiptVouchers.add(newVoucher);

      // 2. Automated Double-Entry Journal Entry
      await recordReceiptVoucherJournalEntry(newVoucher);

      // 3. Deduct debt from customer profile
      const newDebt = Math.max(0, (Number(selectedCust.currentDebt) || 0) - amountNum);
      await db.customers.update(selectedCust.id, {
        currentDebt: newDebt,
      });

      toast(
        `تم إصدار سند القبض (${voucherNum}) بمبلغ ${amountNum.toLocaleString('ar-SA')} ${farmSettings.currency} وخصمها من ذمة العميل بنجاح!`,
        'success'
      );

      // Reset Form & Close Modal
      setShowAddReceiptModal(false);
      setRecCustomerId('');
      setRecAmount('');
      setRecNotes('');
    } catch (err: any) {
      console.error('Error saving receipt voucher:', err);
      toast(err?.message || 'تعذر إصدار سند القبض', 'error');
    }
  };

  // 2. Save Operational Expense (سند صرف ومصروفات تشغيلية)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(expAmount);
    if (amountNum <= 0 || !expDescription.trim()) {
      toast('يرجى إدخال مبلغ صحيح وبيان واضح لسند الصرف', 'error');
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
      recordedBy: userName || 'محاسب المزرعة',
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Save to expenses table
      await db.expenses.add(newExp);

      // 2. Automated Double-Entry Journal Entry (Debits Expense, Credits Cash Box/Bank)
      await recordExpenseJournalEntry(newExp);

      toast(
        `تم تسجيل سند الصرف بمبلغ ${amountNum.toLocaleString('ar-SA')} ${farmSettings.currency} وخصمها من ${
          expPaidFrom === 'cash_box' ? 'الصندوق الرئيسي (كاش)' : 'الحساب البنكي'
        } بنجاح!`,
        'success'
      );

      setShowAddExpenseModal(false);
      setExpAmount('');
      setExpDescription('');
      setExpRecipient('');
      setExpRef('');
    } catch (err: any) {
      console.error('Error recording expense:', err);
      toast(err?.message || 'تعذر تسجيل سند الصرف', 'error');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      await db.expenses.delete(id);
      toast('تم حذف المصروف بنجاح', 'info');
    }
  };

  // 3. Save Custom Category
  const handleSaveCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast('يرجى إدخال اسم التصنيف', 'error');
      return;
    }

    const exists = customCategories?.some(
      (c) => c.name.trim().toLowerCase() === newCatName.trim().toLowerCase()
    );
    if (exists || baseCategoryLabels[newCatName.trim()]) {
      toast('هذا التصنيف موجود مسبقاً', 'warning');
      return;
    }

    const newCat: CustomExpenseCategory = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      description: newCatDesc.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    await db.customCategories.add(newCat);
    toast(`تم إضافة تصنيف "${newCat.name}" بنجاح!`, 'success');
    setShowAddCategoryModal(false);
    setNewCatName('');
    setNewCatDesc('');
  };

  // 4. Save Independent Farm Purchase
  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(purchQuantity);
    const unitPrice = Number(purchUnitPrice);
    const total = purchTotalAmount > 0 ? purchTotalAmount : qty * unitPrice;

    if (!purchItemName.trim() || qty <= 0 || total <= 0) {
      toast('يرجى إدخال اسم الصنف والكمية والسعر بشكل صحيح', 'error');
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
      `تم تسجيل فاتورة الشراء لـ "${newPurch.itemName}" بقيمة ${total.toLocaleString('ar-SA')} ${farmSettings.currency}!`,
      'success'
    );

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
      toast(`تم حذف سجل الشراء لـ "${itemName}"`, 'info');
    }
  };

  // Shortcut: Open Receipt Modal for a specific unpaid/partial invoice
  const handleOpenReceiptForInvoice = (inv: OrderInvoice) => {
    if (inv.customerId) {
      setRecCustomerId(inv.customerId);
    }
    const rem = Number(inv.remainingAmount) || 0;
    setRecAmount(rem > 0 ? rem : '');
    setRecNotes(`سداد متبقي فاتورة بيع: ${inv.invoiceNumber}${inv.manualInvoiceNumber ? ` (يدوي: ${inv.manualInvoiceNumber})` : ''}`);
    setShowAddReceiptModal(true);
  };

  // -------------------------------------------------------------
  // Filtered Lists for Each Tab
  // -------------------------------------------------------------

  // Filtered Receipt Vouchers
  const filteredReceipts = periodVouchers.filter((v) => {
    if (receiptPaymentFilter !== 'all' && v.paymentType !== receiptPaymentFilter) return false;
    if (receiptSearch.trim()) {
      const q = receiptSearch.trim().toLowerCase();
      const matchNum = v.voucherNumber?.toLowerCase().includes(q);
      const matchCust = v.customerName?.toLowerCase().includes(q);
      const matchNotes = v.notes?.toLowerCase().includes(q);
      if (!matchNum && !matchCust && !matchNotes) return false;
    }
    return true;
  });

  // Filtered Expenses
  const filteredExpenses = periodExpenses.filter((e) => {
    if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) return false;
    if (expenseSearch.trim()) {
      const q = expenseSearch.trim().toLowerCase();
      const matchDesc = e.description?.toLowerCase().includes(q);
      const matchRec = e.recipient?.toLowerCase().includes(q);
      const matchRef = e.invoiceOrBillRef?.toLowerCase().includes(q);
      if (!matchDesc && !matchRec && !matchRef) return false;
    }
    return true;
  });

  // Filtered Invoices: CRITICAL search by manualInvoiceNumber
  const filteredInvoices = periodInvoices.filter((inv) => {
    // Status Filter
    const st = getInvoicePaymentStatus(inv).status;
    if (invoiceStatusFilter !== 'all' && st !== invoiceStatusFilter) return false;

    // Payment Method Filter
    if (invoiceMethodFilter !== 'all' && inv.paymentMethod !== invoiceMethodFilter) return false;

    // Search query: supports manualInvoiceNumber, invoiceNumber, customerName, notes
    if (invoiceSearch.trim()) {
      const q = invoiceSearch.trim().toLowerCase();
      const matchManual = inv.manualInvoiceNumber?.toLowerCase().includes(q);
      const matchNumber = inv.invoiceNumber?.toLowerCase().includes(q);
      const matchCustomer = inv.customerName?.toLowerCase().includes(q);
      const matchNotes = inv.notes?.toLowerCase().includes(q);
      if (!matchManual && !matchNumber && !matchCustomer && !matchNotes) return false;
    }

    return true;
  });

  // Filtered Purchases
  const filteredPurchases = periodPurchases.filter((p) => {
    if (!purchaseSearch.trim()) return true;
    const q = purchaseSearch.trim().toLowerCase();
    return (
      p.itemName?.toLowerCase().includes(q) ||
      (p.supplier && p.supplier.toLowerCase().includes(q)) ||
      (p.invoiceRef && p.invoiceRef.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  // Selected customer for Receipt Modal live debt preview
  const selectedCustomerInModal = customers?.find((c) => c.id === recCustomerId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn select-none">
      {/* ========================================================= */}
      {/* 1. Header & Quick Actions */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-soft-glow">
              <WalletCards className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                المالية والمحاسبة (Finance & Accounting)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                سندات القبض لتحصيل الديون، سندات الصرف والمصروفات، وسجل الفواتير وحالة الدفع.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Period Selector & Quick Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter */}
          <div className="p-1 rounded-2xl bg-white border border-slate-200/80 flex shadow-sm">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'today'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'month'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setPeriod('year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'year'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              هذا العام
            </button>
            <button
              onClick={() => setPeriod('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                period === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل
            </button>
          </div>

          {/* Jump to Chart of Accounts */}
          {onNavigateToAccounting && (
            <button
              onClick={onNavigateToAccounting}
              className="px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 border border-slate-200 shadow-sm transition-all"
              title="الانتقال إلى شجرة الحسابات والقيود اليومية"
            >
              <Scale className="w-4 h-4 text-emerald-600" />
              <span>شجرة الحسابات</span>
            </button>
          )}

          {/* New Receipt Voucher Button */}
          <button
            onClick={() => {
              setRecCustomerId('');
              setRecAmount('');
              setRecNotes('');
              setShowAddReceiptModal(true);
            }}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-apple transition-all"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[3]" />
            <span>+ سند قبض</span>
          </button>

          {/* New Expense Voucher Button */}
          <button
            onClick={() => {
              setExpAmount('');
              setExpDescription('');
              setExpRecipient('');
              setExpRef('');
              setShowAddExpenseModal(true);
            }}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-apple transition-all"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[3]" />
            <span>+ سند صرف</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Top Summary KPI Cards */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cash Box Balance */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-1">
              رصيد الصندوق الرئيسي (كاش)
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {cashBalance.toLocaleString('ar-SA')}{' '}
              <span className="text-xs font-bold text-slate-400 font-sans">
                {farmSettings.currency}
              </span>
            </div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              <span>مباشر من شجرة الحسابات</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Coins className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* Card 2: Total Customer Receivables (Outstanding Debt) */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-1">
              إجمالي مديونية العملاء (الذمم المدينة)
            </span>
            <div className="text-2xl font-black text-rose-600 tracking-tight">
              {totalCustomerDebt.toLocaleString('ar-SA')}{' '}
              <span className="text-xs font-bold text-rose-400 font-sans">
                {farmSettings.currency}
              </span>
            </div>
            <div className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>ديون مستحقة للتحصيل</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <User className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* Card 3: Receipts Collected */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-1">
              المقبوضات المحصلة ({period === 'month' ? 'الشهر' : period === 'today' ? 'اليوم' : 'الفترة'})
            </span>
            <div className="text-2xl font-black text-teal-600 tracking-tight">
              {totalReceiptsAmount.toLocaleString('ar-SA')}{' '}
              <span className="text-xs font-bold text-teal-400 font-sans">
                {farmSettings.currency}
              </span>
            </div>
            <div className="text-[11px] text-teal-600 font-bold mt-1 flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>{periodVouchers.length} سند قبض مسجل</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Receipt className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* Card 4: Operating Expenses */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block mb-1">
              المصروفات التشغيلية ({period === 'month' ? 'الشهر' : period === 'today' ? 'اليوم' : 'الفترة'})
            </span>
            <div className="text-2xl font-black text-amber-600 tracking-tight">
              {totalExpensesAmount.toLocaleString('ar-SA')}{' '}
              <span className="text-xs font-bold text-amber-400 font-sans">
                {farmSettings.currency}
              </span>
            </div>
            <div className="text-[11px] text-amber-600 font-bold mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>{periodExpenses.length} سند صرف مسجل</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <WalletCards className="w-6 h-6 stroke-[2]" />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Section Navigation Tabs */}
      {/* ========================================================= */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('receipts')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'receipts'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4" />
          <span>سندات القبض (تحصيل الديون)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-sans">
            {filteredReceipts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'expenses'
              ? 'border-rose-600 text-rose-700 bg-rose-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>سندات الصرف والمصروفات</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-sans">
            {filteredExpenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'invoices'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>سجل الفواتير وحالة الدفع</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-sans">
            {filteredInvoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'purchases'
              ? 'border-amber-600 text-amber-700 bg-amber-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>مشتريات المزرعة</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-sans">
            {filteredPurchases.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pl_summary')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'pl_summary'
              ? 'border-sky-600 text-sky-700 bg-sky-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>تقرير الأرباح والخسائر (P&L)</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 4. TAB 1: سندات القبض (Receipt Vouchers) */}
      {/* ========================================================= */}
      {activeTab === 'receipts' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={receiptSearch}
                  onChange={(e) => setReceiptSearch(e.target.value)}
                  placeholder="ابحث برقم سند القبض، اسم العميل، البيان..."
                  className="w-full pr-10 pl-4 py-2 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Payment Type Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={receiptPaymentFilter}
                  onChange={(e) => setReceiptPaymentFilter(e.target.value)}
                  className="py-2 px-3 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="all">كل طرق القبض</option>
                  <option value="cash">نقداً (الصندوق)</option>
                  <option value="kuraimi">محفظة الكريمي</option>
                  <option value="jeeb">محفظة جيب</option>
                  <option value="jawali">محفظة جوالي</option>
                  <option value="bank">حساب بنكي</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setRecCustomerId('');
                setRecAmount('');
                setRecNotes('');
                setShowAddReceiptModal(true);
              }}
              className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إصدار سند قبض جديد</span>
            </button>
          </div>

          {/* Receipts Table */}
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">رقم السند</th>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">اسم العميل</th>
                    <th className="py-3 px-4">طريقة القبض</th>
                    <th className="py-3 px-4 text-left">المبلغ المستلم</th>
                    <th className="py-3 px-4">الملاحظات / البيان</th>
                    <th className="py-3 px-4">المسجل</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                        <div className="font-bold">لا توجد سندات قبض مسجلة في هذه الفترة</div>
                        <div className="text-[11px] mt-1">
                          اضغط على "إصدار سند قبض جديد" لتسجيل دفعات العملاء وإطفاء ديونهم.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((voucher) => (
                      <tr key={voucher.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                          {voucher.voucherNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-500">
                          {voucher.date}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          {voucher.customerName}
                        </td>
                        <td className="py-3.5 px-4">
                          {renderPaymentBadge(voucher.paymentType)}
                        </td>
                        <td className="py-3.5 px-4 text-left font-black text-slate-900 font-sans text-sm">
                          {Number(voucher.amount).toLocaleString('ar-SA')}{' '}
                          <span className="text-[11px] font-bold text-slate-400">
                            {farmSettings.currency}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {voucher.notes || 'تسديد دفعة حساب آجل'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {voucher.recordedBy}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedVoucherForPrint(voucher)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                            title="طباعة / معاينة سند القبض"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. TAB 2: سندات الصرف والمصروفات (Expense Vouchers) */}
      {/* ========================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  placeholder="ابحث بالبيان، المستلم، رقم السند أو الفاتورة..."
                  className="w-full pr-10 pl-4 py-2 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  className="py-2 px-3 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="all">كل تصنيفات المصروفات</option>
                  <option value="feed_purchase">شراء واستخدام أعلاف</option>
                  <option value="packaging_bedding">نشارة خشب وأطباق تعبئة</option>
                  <option value="utilities_maintenance">صيانة عنابر وأقفاص</option>
                  <option value="salaries_advances">رواتب وأجور وسلف</option>
                  <option value="delivery_petrol">بترول ومحروقات التوصيل</option>
                  <option value="medications_vitamins">أدوية وفيتامينات</option>
                  <option value="electricity_water">كهرباء ومياه وتشغيل</option>
                  {customCategories?.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  <option value="other">أخرى</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 border border-slate-200 transition-all"
              >
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>+ تصنيف مخصص</span>
              </button>

              <button
                onClick={() => {
                  setExpAmount('');
                  setExpDescription('');
                  setExpRecipient('');
                  setExpRef('');
                  setShowAddExpenseModal(true);
                }}
                className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>تسجيل سند صرف</span>
              </button>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">التصنيف</th>
                    <th className="py-3 px-4">البيان / تفاصيل الصرف</th>
                    <th className="py-3 px-4">المستلم</th>
                    <th className="py-3 px-4">رقم المرجع / الفاتورة</th>
                    <th className="py-3 px-4">جهة الخصم</th>
                    <th className="py-3 px-4 text-left">المبلغ المصروف</th>
                    <th className="py-3 px-4">المسجل</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <WalletCards className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                        <div className="font-bold">لا توجد سندات صرف ومصروفات مسجلة في هذه الفترة</div>
                        <div className="text-[11px] mt-1">
                          اضغط على "تسجيل سند صرف" لإثبات المصروفات التشغيلية وخصمها من الصندوق.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-500">
                          {exp.date}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl bg-slate-100 text-slate-800 text-[11px] font-extrabold border border-slate-200">
                            {getCategoryLabel(exp.category)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 max-w-sm truncate">
                          {exp.description}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {exp.recipient || '-'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          {exp.invoiceOrBillRef || '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          {exp.paidFrom === 'bank_account' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 text-[11px] font-bold border border-sky-200">
                              <Building2 className="w-3 h-3" />
                              <span>البنك</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                              <Coins className="w-3 h-3" />
                              <span>الصندوق الرئيسي (كاش)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-left font-black text-rose-600 font-sans text-sm">
                          {Number(exp.amount).toLocaleString('ar-SA')}{' '}
                          <span className="text-[11px] font-bold text-rose-400">
                            {farmSettings.currency}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {exp.recordedBy}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            title="حذف المصروف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. TAB 3: سجل الفواتير وحالة الدفع (Invoices Register) */}
      {/* ========================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Controls Bar with Manual Invoice Number Highlighted Search */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Prominent Search with specific emphasis on manual invoice number */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-indigo-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="ابحث بـ 'رقم الفاتورة اليدوية' (الموقعة من العميل)، أو رقم الفاتورة الآلي، أو اسم العميل..."
                  className="w-full pr-10 pl-4 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              {/* Status & Method Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-bold">الحالة:</span>
                  <select
                    value={invoiceStatusFilter}
                    onChange={(e) => setInvoiceStatusFilter(e.target.value as any)}
                    className="py-2 px-3 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">كل الحالات</option>
                    <option value="paid">مدفوعة بالكامل 🟢</option>
                    <option value="unpaid">غير مدفوعة (آجل) 🔴</option>
                    <option value="partial">مدفوعة جزئياً 🟡</option>
                  </select>
                </div>

                {/* Method Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-bold">طريقة السداد:</span>
                  <select
                    value={invoiceMethodFilter}
                    onChange={(e) => setInvoiceMethodFilter(e.target.value)}
                    className="py-2 px-3 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="all">الكل</option>
                    <option value="cash">نقداً</option>
                    <option value="credit">آجل</option>
                    <option value="partial">دفع جزئي</option>
                    <option value="kuraimi">محفظة الكريمي</option>
                    <option value="jeeb">محفظة جيب</option>
                    <option value="jawali">محفظة جوالي</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Status Count Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400 font-bold">ملخص الفواتير المعروضة:</span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold">
                الإجمالي: {filteredInvoices.length} فاتورة
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                مدفوعة:{' '}
                {
                  filteredInvoices.filter(
                    (inv) => getInvoicePaymentStatus(inv).status === 'paid'
                  ).length
                }
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 font-bold border border-rose-200">
                غير مدفوعة:{' '}
                {
                  filteredInvoices.filter(
                    (inv) => getInvoicePaymentStatus(inv).status === 'unpaid'
                  ).length
                }
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 font-bold border border-amber-200">
                مدفوعة جزئياً:{' '}
                {
                  filteredInvoices.filter(
                    (inv) => getInvoicePaymentStatus(inv).status === 'partial'
                  ).length
                }
              </span>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">رقم الفاتورة الآلي</th>
                    <th className="py-3 px-4">رقم الفاتورة اليدوية 📝</th>
                    <th className="py-3 px-4">التاريخ والوقت</th>
                    <th className="py-3 px-4">العميل</th>
                    <th className="py-3 px-4 text-left">إجمالي الفاتورة</th>
                    <th className="py-3 px-4 text-left">المدفوع</th>
                    <th className="py-3 px-4 text-left">المتبقي (دين)</th>
                    <th className="py-3 px-4 text-center">حالة الدفع</th>
                    <th className="py-3 px-4 text-center">طريقة السداد</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                        <div className="font-bold">لا توجد فواتير مطابقة لبحثك</div>
                        <div className="text-[11px] mt-1">
                          جرب تغيير معايير البحث أو اختيار فترة زمنية أخرى.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const payStatus = getInvoicePaymentStatus(inv);
                      const remaining = Number(inv.remainingAmount) || 0;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Invoice Auto Number */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {inv.invoiceNumber}
                          </td>

                          {/* Manual Invoice Number (Highlighted) */}
                          <td className="py-3.5 px-4">
                            {inv.manualInvoiceNumber ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 text-sky-800 text-xs font-mono font-bold border border-sky-200">
                                <span>📝 {inv.manualInvoiceNumber}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono">-</span>
                            )}
                          </td>

                          {/* Date & Time */}
                          <td className="py-3.5 px-4 text-slate-500 font-medium">
                            <div>{inv.date}</div>
                            {inv.time && <div className="text-[10px] text-slate-400 font-mono">{inv.time}</div>}
                          </td>

                          {/* Customer Name */}
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">
                            {inv.customerName}
                          </td>

                          {/* Total Amount */}
                          <td className="py-3.5 px-4 text-left font-black text-slate-900 font-sans text-sm">
                            {Number(inv.totalAmount).toLocaleString('ar-SA')}{' '}
                            <span className="text-[10px] font-bold text-slate-400">
                              {farmSettings.currency}
                            </span>
                          </td>

                          {/* Paid Amount */}
                          <td className="py-3.5 px-4 text-left font-bold text-emerald-600 font-sans">
                            {Number(inv.paidAmount).toLocaleString('ar-SA')}{' '}
                            <span className="text-[10px] font-bold text-emerald-400">
                              {farmSettings.currency}
                            </span>
                          </td>

                          {/* Remaining Amount */}
                          <td className="py-3.5 px-4 text-left font-bold font-sans">
                            {remaining > 0 ? (
                              <span className="text-rose-600 font-black">
                                {remaining.toLocaleString('ar-SA')}{' '}
                                <span className="text-[10px] font-bold text-rose-400">
                                  {farmSettings.currency}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>

                          {/* Payment Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {payStatus.badge}
                          </td>

                          {/* Payment Method Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {renderPaymentBadge(inv.paymentMethod)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View / Print Details */}
                              <button
                                onClick={() => setSelectedInvoice(inv)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                title="عرض تفاصيل الفاتورة"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>

                              {/* Pay Remaining Debt Action (for unpaid or partial invoices) */}
                              {remaining > 0 && (
                                <button
                                  onClick={() => handleOpenReceiptForInvoice(inv)}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-extrabold flex items-center gap-1 transition-all"
                                  title="إصدار سند قبض لسداد متبقي هذه الفاتورة"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                  <span>قبض المتبقي</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. TAB 4: مشتريات المزرعة المستقلة (Farm Purchases) */}
      {/* ========================================================= */}
      {activeTab === 'purchases' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={purchaseSearch}
                onChange={(e) => setPurchaseSearch(e.target.value)}
                placeholder="ابحث باسم البضاعة، المورد، رقم الفاتورة..."
                className="w-full pr-10 pl-4 py-2 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>

            <button
              onClick={() => {
                setPurchItemName('');
                setPurchQuantity('');
                setPurchUnitPrice('');
                setPurchTotalAmount(0);
                setPurchSupplier('');
                setPurchInvoiceRef('');
                setPurchNotes('');
                setShowAddPurchaseModal(true);
              }}
              className="px-4 py-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>تسجيل فاتورة شراء بضائع</span>
            </button>
          </div>

          {/* Purchases Table */}
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-extrabold tracking-wider">
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">اسم الصنف / البضاعة</th>
                    <th className="py-3 px-4">الكمية والوحدة</th>
                    <th className="py-3 px-4">السعر الإفرادي</th>
                    <th className="py-3 px-4 text-left">إجمالي الفاتورة</th>
                    <th className="py-3 px-4">المورد</th>
                    <th className="py-3 px-4">طريقة السداد</th>
                    <th className="py-3 px-4">رقم الفاتورة / المرجع</th>
                    <th className="py-3 px-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                        <div className="font-bold">لا توجد مشتريات مسجلة في هذه الفترة</div>
                        <div className="text-[11px] mt-1">
                          اضغط على "تسجيل فاتورة شراء بضائع" لإثبات توريدات المزرعة ومشتريات المستلزمات.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((purch) => (
                      <tr key={purch.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-500">{purch.date}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">{purch.itemName}</td>
                        <td className="py-3.5 px-4 font-mono">
                          {purch.quantity} {purch.unit}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600">
                          {purch.unitPrice.toLocaleString('ar-SA')} {farmSettings.currency}
                        </td>
                        <td className="py-3.5 px-4 text-left font-black text-slate-900 font-sans text-sm">
                          {purch.totalAmount.toLocaleString('ar-SA')}{' '}
                          <span className="text-[10px] font-bold text-slate-400">
                            {farmSettings.currency}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{purch.supplier || '-'}</td>
                        <td className="py-3.5 px-4">
                          {purch.paidFrom === 'cash_box' && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                              الصندوق (كاش)
                            </span>
                          )}
                          {purch.paidFrom === 'bank_account' && (
                            <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 text-[11px] font-bold border border-sky-200">
                              البنك
                            </span>
                          )}
                          {purch.paidFrom === 'credit' && (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                              آجل (موردين)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500">{purch.invoiceRef || '-'}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDeletePurchase(purch.id, purch.itemName)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            title="حذف سجل الشراء"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. TAB 5: تقرير الأرباح والخسائر الشامل (P&L Summary) */}
      {/* ========================================================= */}
      {activeTab === 'pl_summary' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main Financial Statement Card */}
          <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-apple relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <span className="px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-bold border border-white/10 inline-block mb-2">
                  بيان الدخل والأرباح الشامل (P&L Statement)
                </span>
                <h3 className="text-2xl font-black">
                  صافي الأرباح التشغيلية:{' '}
                  <span className={netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {netProfit.toLocaleString('ar-SA')} {farmSettings.currency}
                  </span>
                </h3>
              </div>
              <div className="text-left">
                <span className="text-xs text-slate-400 block font-medium">هامش الربح التقديري</span>
                <div className="text-3xl font-black text-amber-400 font-mono mt-0.5">
                  {profitMargin}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs text-slate-400 block font-medium">إجمالي المبيعات (الإيرادات)</span>
                <div className="text-xl font-black text-emerald-400 mt-1 font-sans">
                  {totalInvoicedSales.toLocaleString('ar-SA')} {farmSettings.currency}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">من فواتير المبيعات ونقاط البيع</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs text-slate-400 block font-medium">المصروفات التشغيلية</span>
                <div className="text-xl font-black text-rose-400 mt-1 font-sans">
                  {totalExpensesAmount.toLocaleString('ar-SA')} {farmSettings.currency}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">أعلاف، صيانة، وقود، ورواتب</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs text-slate-400 block font-medium">مشتريات المستلزمات والبضائع</span>
                <div className="text-xl font-black text-amber-400 mt-1 font-sans">
                  {totalPurchasesAmount.toLocaleString('ar-SA')} {farmSettings.currency}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">توريدات ومشتريات المزرعة المستقلة</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. MODAL: سند قبض جديد (New Receipt Voucher Modal) */}
      {/* ========================================================= */}
      {showAddReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    إصدار سند قبض جديد (تحصيل دين عميل)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تسجيل دفعة مستلمة وربطها تلقائياً بمديونية العميل والصندوق.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddReceiptModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceiptVoucher} className="space-y-4">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اختيار العميل *
                </label>
                <select
                  required
                  value={recCustomerId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setRecCustomerId(cid);
                    const cust = customers?.find((c) => c.id === cid);
                    if (cust && (!recAmount || recAmount === 0)) {
                      setRecAmount(cust.currentDebt > 0 ? cust.currentDebt : '');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                >
                  <option value="">-- اختر العميل من القائمة --</option>
                  {customers?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.currentDebt > 0 ? `(المديونية: ${c.currentDebt.toLocaleString()} ${farmSettings.currency})` : '(لا توجد ديون)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Debt Quick Card */}
              {selectedCustomerInModal && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">المديونية المستحقة الحالية:</span>
                    <span className="text-sm font-black text-rose-600 font-sans">
                      {selectedCustomerInModal.currentDebt.toLocaleString('ar-SA')} {farmSettings.currency}
                    </span>
                  </div>
                  {selectedCustomerInModal.currentDebt > 0 && (
                    <button
                      type="button"
                      onClick={() => setRecAmount(selectedCustomerInModal.currentDebt)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-extrabold transition-all"
                    >
                      ⚡ سداد كامل الدين
                    </button>
                  )}
                </div>
              )}

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ المستلم * ({farmSettings.currency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="أدخل المبلغ المقبوض..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ السند *
                  </label>
                  <input
                    type="date"
                    required
                    value={recDate}
                    onChange={(e) => setRecDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Payment Destination Account */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  طريقة القبض / الحساب المستلم (مدين) *
                </label>
                <select
                  value={recPaymentType}
                  onChange={(e) => setRecPaymentType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold"
                >
                  <option value="cash">الصندوق الرئيسي (كاش) - 10101</option>
                  <option value="kuraimi">محفظة الكريمي (حاسب / إم فلوس) - 10102</option>
                  <option value="jeeb">محفظة جيب (Jeeb) - 10103</option>
                  <option value="jawali">محفظة جوالي (Jawali) - 10104</option>
                  <option value="bank">الحساب البنكي الجاري - 10105</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البيان والملاحظات
                </label>
                <input
                  type="text"
                  value={recNotes}
                  onChange={(e) => setRecNotes(e.target.value)}
                  placeholder="مثال: تسديد دفعة من الحساب الآجل - فاتورة رقم..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Accounting Effect Live Preview Alert */}
              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-[11px] text-emerald-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الأثر المحاسبي التلقائي للقيد المزدوج:</span>
                </div>
                <div className="text-[10px] text-emerald-700 leading-relaxed">
                  • من حـ/ {recPaymentType === 'cash' ? 'الصندوق الرئيسي (كاش)' : 'المحفظة / البنك'} [مدين: زيادة الأصول النقدية]
                  <br />
                  • إلى حـ/ العملاء والذمم المدينة [دائن: تخفيض دين العميل بمقدار المبلغ]
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs shadow-apple transition-all"
                >
                  حفظ وترحيل سند القبض
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddReceiptModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 10. MODAL: سند صرف ومصروفات (Expense Voucher Modal) */}
      {/* ========================================================= */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    تسجيل سند صرف مالي (مصروفات تشغيلية)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    إثبات المصروف في دفتر الأستاذ وخصمه مباشرة من حساب الصندوق.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تصنيف المصروف *
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold"
                  >
                    <option value="feed_purchase">🌾 شراء واستخدام أعلاف</option>
                    <option value="packaging_bedding">🪵 نشارة خشب وأطباق تعبئة</option>
                    <option value="utilities_maintenance">🔧 صيانة عنابر وأقفاص</option>
                    <option value="salaries_advances">👥 رواتب وسلف العمال</option>
                    <option value="delivery_petrol">⛽ بترول ومحروقات التوصيل</option>
                    <option value="medications_vitamins">💊 أدوية وفيتامينات ولقاحات</option>
                    <option value="electricity_water">💡 كهرباء ومياه وتشغيل</option>
                    {customCategories?.map((c) => (
                      <option key={c.id} value={c.name}>
                        🏷️ {c.name}
                      </option>
                    ))}
                    <option value="other">📦 مصروفات ونثريات أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التاريخ *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold"
                  />
                </div>
              </div>

              {/* Amount & Paid From Account */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ المصروف * ({farmSettings.currency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 15,000"
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    جهة الخصم (دائن) *
                  </label>
                  <select
                    value={expPaidFrom}
                    onChange={(e) => setExpPaidFrom(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-bold"
                  >
                    <option value="cash_box">الصندوق الرئيسي (كاش) - 10101</option>
                    <option value="bank_account">الحساب البنكي / المحفظة - 10105</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البيان والغرض من الصرف *
                </label>
                <input
                  type="text"
                  required
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="مثال: شراء 10 أكياس علف بادي سمان 24%، أو صيانة دينمو الشفاط..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              {/* Recipient & Ref */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المستلم (اختياري)
                  </label>
                  <input
                    type="text"
                    value={expRecipient}
                    onChange={(e) => setExpRecipient(e.target.value)}
                    placeholder="اسم المورد أو العامل المستلم"
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الفاتورة أو الإيصال (اختياري)
                  </label>
                  <input
                    type="text"
                    value={expRef}
                    onChange={(e) => setExpRef(e.target.value)}
                    placeholder="رقم الفاتورة الورقية"
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-mono"
                  />
                </div>
              </div>

              {/* Accounting Live Preview */}
              <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/80 text-[11px] text-rose-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                  <span>الأثر المحاسبي التلقائي للقيد المزدوج:</span>
                </div>
                <div className="text-[10px] text-rose-700 leading-relaxed">
                  • من حـ/ {getCategoryLabel(expCategory)} [مدين: إثبات المصروف]
                  <br />
                  • إلى حـ/ {expPaidFrom === 'cash_box' ? 'الصندوق الرئيسي (كاش)' : 'الحساب البنكي'} [دائن: خصم وتخفيض رصيد النقدية]
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-extrabold text-xs shadow-apple transition-all"
                >
                  حفظ وترحيل سند الصرف
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 11. MODAL: تفاصيل الفاتورة ومعاينتها (Invoice Details Modal) */}
      {/* ========================================================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    تفاصيل الفاتورة: {selectedInvoice.invoiceNumber}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{selectedInvoice.date} {selectedInvoice.time}</span>
                    <span>• الكاشير: {selectedInvoice.cashierName}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Crucial Manual Invoice Number Banner */}
            {selectedInvoice.manualInvoiceNumber && (
              <div className="p-3.5 mb-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  <div>
                    <span className="text-[11px] text-sky-700 font-bold block">رقم الفاتورة اليدوية الموقعة من العميل:</span>
                    <span className="text-base font-black text-sky-900 font-mono tracking-wider">
                      {selectedInvoice.manualInvoiceNumber}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-sky-100 text-sky-800 text-[10px] font-bold">
                  سند دفتري ورقي
                </span>
              </div>
            )}

            {/* Customer & Status Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">العميل:</span>
                <span className="font-extrabold text-slate-900">{selectedInvoice.customerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">طريقة السداد:</span>
                <div>{renderPaymentBadge(selectedInvoice.paymentMethod)}</div>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">حالة الدفع:</span>
                <div>{getInvoicePaymentStatus(selectedInvoice).badge}</div>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">المتبقي كدين:</span>
                <span className="font-black text-rose-600 font-sans">
                  {Number(selectedInvoice.remainingAmount || 0).toLocaleString('ar-SA')} {farmSettings.currency}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden mb-4">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[11px]">
                    <th className="py-2.5 px-3">المنتج</th>
                    <th className="py-2.5 px-3 text-center">الكمية</th>
                    <th className="py-2.5 px-3 text-left">السعر</th>
                    <th className="py-2.5 px-3 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.productName}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.quantity} {item.unit}</td>
                      <td className="py-2.5 px-3 text-left font-mono">{item.unitPrice.toLocaleString('ar-SA')} {farmSettings.currency}</td>
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900">{item.total.toLocaleString('ar-SA')} {farmSettings.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>المجموع الفرعي:</span>
                <span className="font-mono">{Number(selectedInvoice.subtotal || 0).toLocaleString('ar-SA')} {farmSettings.currency}</span>
              </div>
              {Number(selectedInvoice.deliveryFee || 0) > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>رسوم التوصيل:</span>
                  <span className="font-mono">+{Number(selectedInvoice.deliveryFee).toLocaleString('ar-SA')} {farmSettings.currency}</span>
                </div>
              )}
              {Number(selectedInvoice.discount || 0) > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>الخصم الممنوح:</span>
                  <span className="font-mono">-{Number(selectedInvoice.discount).toLocaleString('ar-SA')} {farmSettings.currency}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-black text-sm pt-2 border-t border-slate-200">
                <span>الإجمالي النهائي للفاتورة:</span>
                <span className="font-mono">{Number(selectedInvoice.totalAmount || 0).toLocaleString('ar-SA')} {farmSettings.currency}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>المبلغ المدفوع نقدياً / بالمحفظة:</span>
                <span className="font-mono">{Number(selectedInvoice.paidAmount || 0).toLocaleString('ar-SA')} {farmSettings.currency}</span>
              </div>
              {Number(selectedInvoice.remainingAmount || 0) > 0 && (
                <div className="flex justify-between text-rose-600 font-black">
                  <span>المتبقي في ذمة العميل (دين):</span>
                  <span className="font-mono">{Number(selectedInvoice.remainingAmount).toLocaleString('ar-SA')} {farmSettings.currency}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 flex items-center justify-between gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الفاتورة</span>
              </button>

              {Number(selectedInvoice.remainingAmount || 0) > 0 && (
                <button
                  onClick={() => {
                    handleOpenReceiptForInvoice(selectedInvoice);
                    setSelectedInvoice(null);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                  <span>قبض المتبقي بسند قبض</span>
                </button>
              )}

              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 12. MODAL: سند قبض للطباعة (Voucher Print Modal) */}
      {/* ========================================================= */}
      {selectedVoucherForPrint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">
                  سند قبض رسمي ({selectedVoucherForPrint.voucherNumber})
                </h3>
              </div>
              <button
                onClick={() => setSelectedVoucherForPrint(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Voucher Paper */}
            <div className="p-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 space-y-3 text-xs">
              <div className="text-center pb-2 border-b border-slate-200">
                <div className="text-base font-black text-slate-900">{farmSettings.farmName || 'مزرعة السمان النموذجية'}</div>
                <div className="text-[11px] text-slate-500 font-medium">سند قبض مالي (Receipt Voucher)</div>
              </div>

              <div className="flex justify-between text-slate-600 pt-1">
                <span>رقم السند: <strong className="font-mono text-slate-900">{selectedVoucherForPrint.voucherNumber}</strong></span>
                <span>التاريخ: <strong className="font-mono text-slate-900">{selectedVoucherForPrint.date}</strong></span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div className="text-slate-600 mb-1">استلمنا من السيد / الأخ:</div>
                <div className="text-sm font-black text-slate-900">{selectedVoucherForPrint.customerName}</div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="text-emerald-700 text-[11px] font-bold">مبلغ وقدره:</div>
                  <div className="text-lg font-black text-emerald-900 font-sans">
                    {Number(selectedVoucherForPrint.amount).toLocaleString('ar-SA')} {farmSettings.currency}
                  </div>
                </div>
                <div>{renderPaymentBadge(selectedVoucherForPrint.paymentType)}</div>
              </div>

              <div className="text-slate-600">
                وذلك عن: <span className="font-bold text-slate-800">{selectedVoucherForPrint.notes || 'تسديد دفعة حساب آجل'}</span>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                <div>المستلم: <strong>{selectedVoucherForPrint.recordedBy}</strong></div>
                <div>التوقيع / الختم: ______________</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="pt-4 flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-apple flex items-center justify-center gap-1.5 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند</span>
              </button>
              <button
                onClick={() => setSelectedVoucherForPrint(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 13. MODAL: إضافة تصنيف مخصص للمصروفات */}
      {/* ========================================================= */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">إضافة تصنيف مصروفات جديد</h3>
              </div>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم التصنيف *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="مثال: إيجار العنابر، صيانة المولدات..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الوصف (اختياري)</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="وصف مختصر للبنود المندرجة تحت هذا التصنيف"
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-apple transition-all"
                >
                  إضافة التصنيف
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 14. MODAL: تسجيل فاتورة شراء بضائع ومستلزمات */}
      {/* ========================================================= */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">تسجيل فاتورة شراء بضائع ومستلزمات</h3>
              </div>
              <button
                onClick={() => setShowAddPurchaseModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم البضاعة / الصنف *</label>
                  <input
                    type="text"
                    required
                    value={purchItemName}
                    onChange={(e) => setPurchItemName(e.target.value)}
                    placeholder="مثال: علف بادي، كراتين بيض..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التاريخ *</label>
                  <input
                    type="date"
                    required
                    value={purchDate}
                    onChange={(e) => setPurchDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الكمية *</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={purchQuantity}
                    onChange={(e) => {
                      const q = e.target.value === '' ? '' : Number(e.target.value);
                      setPurchQuantity(q);
                      const qNum = typeof q === 'number' ? q : 0;
                      const pNum = typeof purchUnitPrice === 'number' ? purchUnitPrice : 0;
                      setPurchTotalAmount(qNum * pNum);
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الوحدة</label>
                  <input
                    type="text"
                    value={purchUnit}
                    onChange={(e) => setPurchUnit(e.target.value)}
                    placeholder="كيس، كرتون..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السعر الإفرادي *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={purchUnitPrice}
                    onChange={(e) => {
                      const p = e.target.value === '' ? '' : Number(e.target.value);
                      setPurchUnitPrice(p);
                      const qNum = typeof purchQuantity === 'number' ? purchQuantity : 0;
                      const pNum = typeof p === 'number' ? p : 0;
                      setPurchTotalAmount(qNum * pNum);
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Total Calculated */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">إجمالي فاتورة الشراء:</span>
                <span className="text-base font-black text-slate-900 font-sans">
                  {purchTotalAmount.toLocaleString('ar-SA')} {farmSettings.currency}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المورد / التاجر</label>
                  <input
                    type="text"
                    value={purchSupplier}
                    onChange={(e) => setPurchSupplier(e.target.value)}
                    placeholder="اسم المحل أو المورد"
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة السداد</label>
                  <select
                    value={purchPaidFrom}
                    onChange={(e) => setPurchPaidFrom(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none font-bold"
                  >
                    <option value="cash_box">الصندوق (كاش)</option>
                    <option value="bank_account">الحساب البنكي</option>
                    <option value="credit">آجل (دين مورد)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الفاتورة الورقية (اختياري)</label>
                <input
                  type="text"
                  value={purchInvoiceRef}
                  onChange={(e) => setPurchInvoiceRef(e.target.value)}
                  placeholder="رقم الفاتورة أو السند"
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-apple transition-all"
                >
                  حفظ فاتورة الشراء
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPurchaseModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
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
