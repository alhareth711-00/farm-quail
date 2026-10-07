import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type {
  Account,
  JournalEntry,
  AccountType,
  Customer,
  YearEndClosingRecord,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  initializeChartOfAccounts,
  createJournalEntry,
  getTrialBalance,
  getAccountLedger,
  getCustomerLedger,
  getIncomeStatementReport,
  performYearEndClosing,
  getYearEndClosingHistory,
  type AccountLedgerReport,
  type CustomerLedgerReport,
  type IncomeStatementReport,
} from '../../services/accountingService';
import {
  Scale,
  Plus,
  BookOpen,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Building2,
  Coins,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRightLeft,
  DollarSign,
  PieChart,
  Trash2,
  Printer,
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  User,
  WalletCards,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Info,
} from 'lucide-react';

const accountTypeLabels: Record<
  AccountType,
  { label: string; bg: string; text: string; border: string }
> = {
  asset: {
    label: 'أصول (Assets)',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  liability: {
    label: 'خصوم (Liabilities)',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
  },
  equity: {
    label: 'حقوق ملكية (Equity)',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  revenue: {
    label: 'إيرادات (Revenue)',
    bg: 'bg-teal-50',
    text: 'text-teal-800',
    border: 'border-teal-200',
  },
  expense: {
    label: 'مصروفات (Expense)',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
};

export const AccountingView: React.FC = () => {
  const { farmSettings, userName } = useAuth();
  const { toast } = useToast();

  // Active view tab
  // 'ledger' = كشف الحساب
  // 'income_statement' = قائمة الدخل
  // 'year_end_closing' = الإقفال السنوي
  // 'trial_balance' = ميزان المراجعة
  // 'accounts' = شجرة الحسابات
  // 'journal' = دفتر اليومية العامة
  const [activeTab, setActiveTab] = useState<
    'ledger' | 'income_statement' | 'year_end_closing' | 'trial_balance' | 'accounts' | 'journal'
  >('ledger');

  // Live queries from Dexie database
  const accounts = useLiveQuery(async () => {
    const list = await db.accounts.toArray();
    if (list.length === 0) {
      return await initializeChartOfAccounts(true);
    }
    return list;
  }, []);

  const journalEntries = useLiveQuery(
    () => db.journalEntries.reverse().sortBy('date'),
    []
  );

  const customers = useLiveQuery(() => db.customers.toArray(), []);

  // ---------------------------------------------------------------------------
  // 1. STATE FOR LEDGER (كشف الحساب)
  // ---------------------------------------------------------------------------
  const [ledgerTargetType, setLedgerTargetType] = useState<'account' | 'customer'>('account');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('acc-10101'); // Default Cash Box
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [ledgerStartDate, setLedgerStartDate] = useState<string>('');
  const [ledgerEndDate, setLedgerEndDate] = useState<string>('');
  const [accountLedgerData, setAccountLedgerData] = useState<AccountLedgerReport | null>(null);
  const [customerLedgerData, setCustomerLedgerData] = useState<CustomerLedgerReport | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [isLedgerLoading, setIsLedgerLoading] = useState<boolean>(false);

  // Set default customer when loaded
  useEffect(() => {
    if (customers && customers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  // Load ledger data
  const loadLedger = async () => {
    setIsLedgerLoading(true);
    try {
      if (ledgerTargetType === 'account') {
        if (!selectedAccountId) return;
        const rep = await getAccountLedger(
          selectedAccountId,
          ledgerStartDate || undefined,
          ledgerEndDate || undefined
        );
        setAccountLedgerData(rep);
      } else {
        if (!selectedCustomerId) return;
        const rep = await getCustomerLedger(
          selectedCustomerId,
          ledgerStartDate || undefined,
          ledgerEndDate || undefined
        );
        setCustomerLedgerData(rep);
      }
    } catch (err: any) {
      console.error('Ledger load error:', err);
      toast(err?.message || 'تعذر تحميل كشف الحساب', 'error');
    } finally {
      setIsLedgerLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [ledgerTargetType, selectedAccountId, selectedCustomerId, ledgerStartDate, ledgerEndDate, journalEntries]);

  // ---------------------------------------------------------------------------
  // 2. STATE FOR INCOME STATEMENT (قائمة الدخل)
  // ---------------------------------------------------------------------------
  const now = new Date();
  const currentYearStr = now.getFullYear().toString();
  const [incStartDate, setIncStartDate] = useState<string>(`${currentYearStr}-01-01`);
  const [incEndDate, setIncEndDate] = useState<string>(now.toISOString().split('T')[0]);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementReport | null>(null);
  const [isIncomeLoading, setIsIncomeLoading] = useState<boolean>(false);

  const loadIncomeStatement = async () => {
    setIsIncomeLoading(true);
    try {
      const rep = await getIncomeStatementReport(incStartDate, incEndDate);
      setIncomeStatement(rep);
    } catch (err: any) {
      console.error('Income statement error:', err);
      toast(err?.message || 'تعذر توليد قائمة الدخل', 'error');
    } finally {
      setIsIncomeLoading(false);
    }
  };

  useEffect(() => {
    loadIncomeStatement();
  }, [incStartDate, incEndDate, journalEntries]);

  // ---------------------------------------------------------------------------
  // 3. STATE FOR YEAR-END CLOSING (الإقفال السنوي)
  // ---------------------------------------------------------------------------
  const [closingYear, setClosingYear] = useState<number>(now.getFullYear());
  const [closingDate, setClosingDate] = useState<string>(now.toISOString().split('T')[0]);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [showClosingConfirmModal, setShowClosingConfirmModal] = useState<boolean>(false);
  const [closingConfirmText, setClosingConfirmText] = useState<string>('');
  const [closingHistory, setClosingHistory] = useState<YearEndClosingRecord[]>([]);
  const [isClosingExecuting, setIsClosingExecuting] = useState<boolean>(false);

  const loadClosingHistory = async () => {
    const list = await getYearEndClosingHistory();
    setClosingHistory(list);
  };

  useEffect(() => {
    loadClosingHistory();
  }, [activeTab]);

  // Closing summary metrics
  const closingPreview = useMemo(() => {
    if (!accounts) {
      return { totalRevenues: 0, totalExpenses: 0, netIncome: 0, retainedEarnings: 0, canClose: false };
    }
    const revs = accounts.filter((a) => a.type === 'revenue');
    const exps = accounts.filter((a) => a.type === 'expense');
    const retained = accounts.find((a) => a.code === '30201');

    const totalRevenues = revs.reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);
    const totalExpenses = exps.reduce((sum, a) => sum + Math.abs(a.currentBalance), 0);
    const netIncome = totalRevenues - totalExpenses;
    const retainedEarnings = retained ? retained.currentBalance : 0;
    const canClose = totalRevenues > 0 || totalExpenses > 0;

    return { totalRevenues, totalExpenses, netIncome, retainedEarnings, canClose };
  }, [accounts]);

  const handleExecuteYearEndClosing = async () => {
    const expectedConfirmation = `إقفال ${closingYear}`;
    if (closingConfirmText.trim() !== expectedConfirmation) {
      toast(`يرجى كتابة عبارة التأكيد بدقة: "${expectedConfirmation}" للمتابعة`, 'error');
      return;
    }

    setIsClosingExecuting(true);
    try {
      const result = await performYearEndClosing({
        fiscalYear: closingYear,
        closingDate,
        closedBy: userName || 'المدير المالي',
        notes: closingNotes.trim() || undefined,
      });

      toast(
        `تم إقفال السنة المالية (${closingYear}) بنجاح بقيد رقم (${result.closingEntry.entryNumber}) وترحيل ${
          result.netIncome >= 0 ? 'صافي الربح' : 'صافي الخسارة'
        } (${result.netIncome.toLocaleString('ar-SA')} ${farmSettings.currency}) إلى الأرباح المحتجزة!`,
        'success'
      );

      setShowClosingConfirmModal(false);
      setClosingConfirmText('');
      setClosingNotes('');
      await loadClosingHistory();
      await initializeChartOfAccounts();
    } catch (err: any) {
      console.error('Closing error:', err);
      toast(err?.message || 'تعذر تنفيذ الإقفال السنوي', 'error');
    } finally {
      setIsClosingExecuting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. CHART OF ACCOUNTS & GENERAL JOURNAL STATE
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [journalFilterType, setJournalFilterType] = useState<string>('all');

  // Manual Journal Entry Modal State
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryDesc, setEntryDesc] = useState('');
  const [entryLines, setEntryLines] = useState<
    { accountId: string; debit: number | ''; credit: number | ''; description: string }[]
  >([
    { accountId: 'acc-10101', debit: '', credit: '', description: '' },
    { accountId: 'acc-40104', debit: '', credit: '', description: '' },
  ]);

  // Handle restoring / re-seeding chart of accounts
  const handleResetAccounts = async () => {
    if (confirm('هل ترغب في إعادة ضبط وتهيئة شجرة الحسابات المحاسبية الافتراضية؟')) {
      try {
        await initializeChartOfAccounts(true);
        toast('تمت تهيئة وتحديث شجرة الحسابات بنجاح!', 'success');
      } catch (err) {
        console.error(err);
        toast('حدث خطأ أثناء تهيئة الحسابات', 'error');
      }
    }
  };

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((acc) => {
      if (selectedTypeFilter !== 'all' && acc.type !== selectedTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = acc.name.toLowerCase().includes(q);
        const matchCode = acc.code.includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [accounts, selectedTypeFilter, searchQuery]);

  // Filtered journal entries
  const filteredEntries = useMemo(() => {
    if (!journalEntries) return [];
    return journalEntries.filter((entry) => {
      if (journalFilterType !== 'all' && entry.referenceType !== journalFilterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDesc = entry.description.toLowerCase().includes(q);
        const matchNum = entry.entryNumber.toLowerCase().includes(q);
        const matchRef = entry.referenceNumber?.toLowerCase().includes(q);
        const matchManual = entry.manualInvoiceNumber?.toLowerCase().includes(q);
        if (!matchDesc && !matchNum && !matchRef && !matchManual) return false;
      }
      return true;
    });
  }, [journalEntries, journalFilterType, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalAccs = accounts?.length || 0;
    const totalEntries = journalEntries?.length || 0;
    const totalDebits =
      journalEntries?.reduce((sum, j) => sum + (j.totalDebit || 0), 0) || 0;
    const totalCredits =
      journalEntries?.reduce((sum, j) => sum + (j.totalCredit || 0), 0) || 0;

    const cashAcc = accounts?.find((a) => a.id === 'acc-10101');
    const receivablesAcc = accounts?.find((a) => a.id === 'acc-10201');
    const payablesAcc = accounts?.find((a) => a.id === 'acc-20101');
    const salesAcc = accounts?.find((a) => a.id === 'acc-40104');

    return {
      totalAccs,
      totalEntries,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      cashBalance: cashAcc?.currentBalance || 0,
      receivablesBalance: receivablesAcc?.currentBalance || 0,
      payablesBalance: payablesAcc?.currentBalance || 0,
      salesBalance: salesAcc?.currentBalance || 0,
    };
  }, [accounts, journalEntries]);

  // Manual Modal Calculations
  const modalTotalDebit = entryLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const modalTotalCredit = entryLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const modalDifference = Math.abs(modalTotalDebit - modalTotalCredit);
  const isModalBalanced = modalDifference < 0.01 && modalTotalDebit > 0;

  const handleAddLine = () => {
    setEntryLines((prev) => [
      ...prev,
      { accountId: accounts?.[0]?.id || 'acc-10101', debit: '', credit: '', description: '' },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    if (entryLines.length <= 2) {
      toast('لا يمكن حذف السطر، يجب أن يحتوي القيد على طرفين على الأقل', 'warning');
      return;
    }
    setEntryLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (
    index: number,
    field: 'accountId' | 'debit' | 'credit' | 'description',
    val: any
  ) => {
    setEntryLines((prev) => {
      const updated = [...prev];
      if (field === 'debit') {
        updated[index] = { ...updated[index], debit: val, credit: val ? '' : updated[index].credit };
      } else if (field === 'credit') {
        updated[index] = { ...updated[index], credit: val, debit: val ? '' : updated[index].debit };
      } else {
        updated[index] = { ...updated[index], [field]: val };
      }
      return updated;
    });
  };

  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isModalBalanced) {
      toast('لا يمكن حفظ القيد: القيد غير متوازن رياضياً (المدين لا يساوي الدائن)!', 'error');
      return;
    }
    if (!entryDesc.trim()) {
      toast('يرجى إدخال شرح أو بيان واضح للقيد', 'error');
      return;
    }

    try {
      const completeLines = entryLines.map((l) => {
        const acc = accounts?.find((a) => a.id === l.accountId);
        return {
          accountId: l.accountId,
          accountCode: acc?.code || '10000',
          accountName: acc?.name || 'حساب',
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description.trim() || entryDesc.trim(),
        };
      });

      await createJournalEntry({
        date: entryDate,
        description: entryDesc.trim(),
        referenceType: 'manual_entry',
        lines: completeLines,
        createdBy: userName || 'محاسب النظام',
      });

      toast('تم ترحيل وحفظ القيد المحاسبي بنجاح وتحديث أرصدة الحسابات!', 'success');
      setShowAddEntryModal(false);
      setEntryDesc('');
      setEntryLines([
        { accountId: 'acc-10101', debit: '', credit: '', description: '' },
        { accountId: 'acc-40104', debit: '', credit: '', description: '' },
      ]);
    } catch (err: any) {
      console.error(err);
      toast(err?.message || 'فشل في حفظ القيد', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // FILTERED LEDGER TRANSACTIONS FOR TABLE SEARCH
  // ---------------------------------------------------------------------------
  const displayedLedgerTransactions = useMemo(() => {
    const raw =
      ledgerTargetType === 'account'
        ? accountLedgerData?.transactions || []
        : customerLedgerData?.transactions || [];

    if (!ledgerSearch.trim()) return raw;
    const q = ledgerSearch.toLowerCase().trim();
    return raw.filter(
      (t) =>
        t.description?.toLowerCase().includes(q) ||
        t.referenceNumber?.toLowerCase().includes(q) ||
        t.manualInvoiceNumber?.toLowerCase().includes(q) ||
        t.partyName?.toLowerCase().includes(q)
    );
  }, [ledgerTargetType, accountLedgerData, customerLedgerData, ledgerSearch]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn select-none">
      {/* Top Main Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-soft-glow">
              <Scale className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                التقارير المالية وشجرة الحسابات والإقفال (Financial Reports & Ledger)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                كشف الحساب (Ledger)، قائمة الدخل (P&L)، دورة الإقفال السنوي، وشجرة الحسابات واليومية العامة.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Strict Balance Health Indicator */}
          <div
            className={`px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-2 border shadow-sm ${
              stats.isBalanced
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse'
            }`}
          >
            {stats.isBalanced ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>الدفاتر متوازنة (مدين = دائن)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>تنبيه: عدم توازن بالدفاتر!</span>
              </>
            )}
          </div>

          {/* Quick Manual Entry Button */}
          <button
            onClick={() => setShowAddEntryModal(true)}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-apple transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ قيد يومية يدوي</span>
          </button>
        </div>
      </div>

      {/* Top Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'ledger'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>كشف حساب (Ledger)</span>
        </button>

        <button
          onClick={() => setActiveTab('income_statement')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'income_statement'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>قائمة الدخل (Income Statement)</span>
        </button>

        <button
          onClick={() => setActiveTab('year_end_closing')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'year_end_closing'
              ? 'border-rose-600 text-rose-700 bg-rose-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>الإقفال السنوي (Year-end Closing)</span>
          {closingHistory.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-sans">
              {closingHistory.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'trial_balance'
              ? 'border-blue-600 text-blue-700 bg-blue-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>ميزان المراجعة (Trial Balance)</span>
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'accounts'
              ? 'border-violet-600 text-violet-700 bg-violet-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>شجرة الحسابات ({accounts?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`pb-3 px-4 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'journal'
              ? 'border-amber-600 text-amber-700 bg-amber-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>دفتر اليومية العامة ({journalEntries?.length || 0})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 1. TAB: كشف الحساب (LEDGER STATEMENT) */}
      {/* ===================================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Controls Card */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Target Type Selector: Account vs Customer */}
              <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 w-fit">
                <button
                  onClick={() => setLedgerTargetType('account')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                    ledgerTargetType === 'account'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>كشف حساب صندوق / بنك / حساب مالي</span>
                </button>
                <button
                  onClick={() => setLedgerTargetType('customer')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                    ledgerTargetType === 'customer'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>كشف حساب عميل (مبيعات وسداد ديون)</span>
                </button>
              </div>

              {/* Print Button */}
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>طباعة كشف الحساب المعتمد</span>
              </button>
            </div>

            {/* Filter Controls Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              {/* Account or Customer Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {ledgerTargetType === 'account' ? 'اختر الحساب المالي *' : 'اختر العميل *'}
                </label>
                {ledgerTargetType === 'account' ? (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  >
                    <optgroup label="النقدية والصناديق والبنوك (الأصول المتداولة)">
                      {accounts
                        ?.filter((a) => a.code.startsWith('101'))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name} (رصيد: {a.currentBalance.toLocaleString()} {farmSettings.currency})
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="العملاء والذمم المدينة">
                      {accounts
                        ?.filter((a) => a.code.startsWith('102'))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="باقي الحسابات">
                      {accounts
                        ?.filter((a) => !a.code.startsWith('101') && !a.code.startsWith('102'))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                ) : (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  >
                    {customers?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.currentDebt > 0 ? `(المديونية: ${c.currentDebt.toLocaleString()} ${farmSettings.currency})` : '(خالص)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  من تاريخ (اختياري)
                </label>
                <input
                  type="date"
                  value={ledgerStartDate}
                  onChange={(e) => setLedgerStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  إلى تاريخ (اختياري)
                </label>
                <input
                  type="date"
                  value={ledgerEndDate}
                  onChange={(e) => setLedgerEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-bold">فترات سريعة:</span>
              <button
                onClick={() => {
                  const mStart = `${now.toISOString().slice(0, 7)}-01`;
                  setLedgerStartDate(mStart);
                  setLedgerEndDate(now.toISOString().split('T')[0]);
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
              >
                الشهر الحالي
              </button>
              <button
                onClick={() => {
                  const yStart = `${currentYearStr}-01-01`;
                  setLedgerStartDate(yStart);
                  setLedgerEndDate(now.toISOString().split('T')[0]);
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
              >
                السنة الحالية ({currentYearStr})
              </button>
              <button
                onClick={() => {
                  setLedgerStartDate('');
                  setLedgerEndDate('');
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
              >
                كل الحركات التاريخية
              </button>
            </div>
          </div>

          {/* Ledger Summary Metric Cards */}
          {(() => {
            const currentReport =
              ledgerTargetType === 'account' ? accountLedgerData : customerLedgerData;
            if (!currentReport) return null;

            return (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">
                    الرصيد الافتتاحي
                  </span>
                  <div className="text-lg font-black text-slate-900 font-sans">
                    {currentReport.openingBalance.toLocaleString('ar-SA')}{' '}
                    <span className="text-[10px] font-bold text-slate-400 font-sans">
                      {farmSettings.currency}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                  <span className="text-[11px] font-bold text-blue-500 block mb-1">
                    إجمالي المدين (+)
                  </span>
                  <div className="text-lg font-black text-blue-600 font-sans">
                    {currentReport.totalDebit.toLocaleString('ar-SA')}{' '}
                    <span className="text-[10px] font-bold text-blue-400 font-sans">
                      {farmSettings.currency}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                  <span className="text-[11px] font-bold text-emerald-500 block mb-1">
                    إجمالي الدائن (-)
                  </span>
                  <div className="text-lg font-black text-emerald-600 font-sans">
                    {currentReport.totalCredit.toLocaleString('ar-SA')}{' '}
                    <span className="text-[10px] font-bold text-emerald-400 font-sans">
                      {farmSettings.currency}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">
                    صافي حركة الفترة
                  </span>
                  <div className="text-lg font-black text-slate-900 font-sans">
                    {currentReport.netMovement.toLocaleString('ar-SA')}{' '}
                    <span className="text-[10px] font-bold text-slate-400 font-sans">
                      {farmSettings.currency}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-indigo-50 border border-indigo-200 shadow-sm col-span-2 md:col-span-1">
                  <span className="text-[11px] font-extrabold text-indigo-700 block mb-1">
                    الرصيد النهائي المستحق
                  </span>
                  <div className="text-xl font-black text-indigo-900 font-sans">
                    {currentReport.endingBalance.toLocaleString('ar-SA')}{' '}
                    <span className="text-[10px] font-bold text-indigo-500 font-sans">
                      {farmSettings.currency}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Transactions Ledger Table */}
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden space-y-3 p-4">
            {/* Search inside ledger */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="ابحث برقم المرجع، الفاتورة اليدوية، البيان..."
                className="w-full pr-10 pl-4 py-2 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-extrabold">
                    <th className="py-3 px-4">التاريخ والوقت</th>
                    <th className="py-3 px-4">نوع الحركة والمرجع</th>
                    <th className="py-3 px-4">رقم الفاتورة اليدوية 📝</th>
                    <th className="py-3 px-4">البيان والشرح</th>
                    <th className="py-3 px-4">الطرف المقابل</th>
                    <th className="py-3 px-4 text-left">مدين (Debit)</th>
                    <th className="py-3 px-4 text-left">دائن (Credit)</th>
                    <th className="py-3 px-4 text-left">الرصيد بعد الحركة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayedLedgerTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                        <div className="font-bold">لا توجد حركات مالية مسجلة لهذا الحساب في الفترة المحددة</div>
                      </td>
                    </tr>
                  ) : (
                    displayedLedgerTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-500 whitespace-nowrap">
                          {tx.date} {tx.time && <span className="text-[10px] text-slate-400 font-mono">({tx.time})</span>}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          <span className="text-[10px] text-slate-400 block font-sans">{tx.referenceType}</span>
                          {tx.referenceNumber || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {tx.manualInvoiceNumber ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-800 text-[11px] font-mono font-bold border border-sky-200">
                              📝 {tx.manualInvoiceNumber}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-sm truncate">
                          {tx.description}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {tx.partyName || '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-mono font-bold text-blue-600">
                          {tx.debit > 0 ? tx.debit.toLocaleString('ar-SA') : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-mono font-bold text-emerald-600">
                          {tx.credit > 0 ? tx.credit.toLocaleString('ar-SA') : '-'}
                        </td>
                        <td className="py-3 px-4 text-left font-mono font-black text-slate-900 bg-slate-50/50">
                          {tx.runningBalance.toLocaleString('ar-SA')}{' '}
                          <span className="text-[9px] font-bold text-slate-400 font-sans">
                            {farmSettings.currency}
                          </span>
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

      {/* ===================================================================== */}
      {/* 2. TAB: قائمة الدخل (INCOME STATEMENT) */}
      {/* ===================================================================== */}
      {activeTab === 'income_statement' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Date Range Selector */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-600">الفترة المالية:</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={incStartDate}
                  onChange={(e) => setIncStartDate(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-bold"
                />
                <span className="text-xs text-slate-400">إلى</span>
                <input
                  type="date"
                  value={incEndDate}
                  onChange={(e) => setIncEndDate(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 font-bold"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const mStart = `${now.toISOString().slice(0, 7)}-01`;
                    setIncStartDate(mStart);
                    setIncEndDate(now.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 text-xs rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                >
                  الشهر الحالي
                </button>
                <button
                  onClick={() => {
                    setIncStartDate(`${currentYearStr}-01-01`);
                    setIncEndDate(now.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1 text-xs rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
                >
                  السنة الحالية ({currentYearStr})
                </button>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>طباعة قائمة الدخل الرسمية</span>
            </button>
          </div>

          {/* Income Statement Visual Dashboard Cards */}
          {incomeStatement && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Card 1: Net Revenues */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  صافي الإيرادات (المبيعات)
                </span>
                <div className="text-xl font-black text-emerald-600 font-sans">
                  {incomeStatement.netRevenues.toLocaleString('ar-SA')}{' '}
                  <span className="text-[10px] font-bold text-emerald-400 font-sans">
                    {farmSettings.currency}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  شاملة التوصيل ومخصومة الخصم
                </div>
              </div>

              {/* Card 2: COGS */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  تكلفة المبيعات (COGS)
                </span>
                <div className="text-xl font-black text-amber-600 font-sans">
                  {incomeStatement.totalCogs.toLocaleString('ar-SA')}{' '}
                  <span className="text-[10px] font-bold text-amber-400 font-sans">
                    {farmSettings.currency}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  التكلفة التقديرية للمنتجات
                </div>
              </div>

              {/* Card 3: Gross Profit */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  مجمل الربح (Gross Profit)
                </span>
                <div className="text-xl font-black text-blue-600 font-sans">
                  {incomeStatement.grossProfit.toLocaleString('ar-SA')}{' '}
                  <span className="text-[10px] font-bold text-blue-400 font-sans">
                    {farmSettings.currency}
                  </span>
                </div>
                <div className="text-[10px] text-blue-600 font-bold mt-1">
                  هامش مجمل: {incomeStatement.grossMarginPct}%
                </div>
              </div>

              {/* Card 4: Operating Expenses */}
              <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  المصروفات التشغيلية
                </span>
                <div className="text-xl font-black text-rose-600 font-sans">
                  {incomeStatement.totalOperatingExpenses.toLocaleString('ar-SA')}{' '}
                  <span className="text-[10px] font-bold text-rose-400 font-sans">
                    {farmSettings.currency}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  أعلاف، رواتب، صيانة، وقود
                </div>
              </div>

              {/* Card 5: Net Income */}
              <div
                className={`p-4 rounded-3xl border shadow-sm ${
                  incomeStatement.netIncome >= 0
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <span className="text-[11px] font-extrabold text-slate-600 block mb-1">
                  صافي الربح / الخسارة النهائي
                </span>
                <div
                  className={`text-2xl font-black font-sans ${
                    incomeStatement.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {incomeStatement.netIncome.toLocaleString('ar-SA')}{' '}
                  <span className="text-[10px] font-bold font-sans">
                    {farmSettings.currency}
                  </span>
                </div>
                <div
                  className={`text-[10px] font-extrabold mt-1 ${
                    incomeStatement.netIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  هامش صافي الربح: {incomeStatement.netMarginPct}%
                </div>
              </div>
            </div>
          )}

          {/* Official Printable Statement Table */}
          {incomeStatement && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-6">
              <div className="text-center pb-4 border-b border-slate-200">
                <h3 className="text-lg font-black text-slate-900">
                  {farmSettings.farmName || 'مزرعة السمان النموذجية'}
                </h3>
                <h4 className="text-sm font-bold text-slate-600 mt-0.5">
                  قائمة الدخل والأرباح والخسائر (Income Statement)
                </h4>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  {incomeStatement.periodLabel}
                </div>
              </div>

              <div className="space-y-6 text-xs text-slate-800">
                {/* 1. Operating Revenues */}
                <div>
                  <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded-xl font-black text-slate-900 mb-2">
                    <span>1. إيرادات النشاط التشغيلي (Revenues)</span>
                    <span className="font-mono text-emerald-700">
                      {incomeStatement.totalRevenues.toLocaleString('ar-SA')} {farmSettings.currency}
                    </span>
                  </div>
                  <div className="pr-4 space-y-1.5">
                    {incomeStatement.revenues.map((r) => (
                      <div key={r.code} className="flex justify-between text-slate-600 py-1 border-b border-slate-50">
                        <span>• {r.name}</span>
                        <span className="font-mono font-bold text-slate-800">{r.amount.toLocaleString('ar-SA')} {farmSettings.currency}</span>
                      </div>
                    ))}
                    {incomeStatement.salesDiscounts > 0 && (
                      <div className="flex justify-between text-rose-600 py-1 border-b border-slate-50 font-bold">
                        <span>• يطرح: الخصم المسموح به للعملاء</span>
                        <span className="font-mono">-{incomeStatement.salesDiscounts.toLocaleString('ar-SA')} {farmSettings.currency}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-slate-900 pt-2">
                      <span>= صافي إيرادات المبيعات</span>
                      <span className="font-mono text-emerald-600">{incomeStatement.netRevenues.toLocaleString('ar-SA')} {farmSettings.currency}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Cost of Goods Sold */}
                <div>
                  <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded-xl font-black text-slate-900 mb-2">
                    <span>2. تكلفة المبيعات (Cost of Goods Sold - COGS)</span>
                    <span className="font-mono text-amber-700">
                      {incomeStatement.totalCogs.toLocaleString('ar-SA')} {farmSettings.currency}
                    </span>
                  </div>
                  <div className="pr-4 space-y-1.5">
                    {incomeStatement.cogsItems.map((c) => (
                      <div key={c.code} className="flex justify-between text-slate-600 py-1 border-b border-slate-50">
                        <span>• {c.name}</span>
                        <span className="font-mono font-bold text-slate-800">{c.amount.toLocaleString('ar-SA')} {farmSettings.currency}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gross Profit Banner */}
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex justify-between font-black text-blue-900 text-sm">
                  <span>= مجمل الربح (Gross Profit)</span>
                  <span className="font-mono">{incomeStatement.grossProfit.toLocaleString('ar-SA')} {farmSettings.currency} ({incomeStatement.grossMarginPct}%)</span>
                </div>

                {/* 3. Operating Expenses */}
                <div>
                  <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded-xl font-black text-slate-900 mb-2">
                    <span>3. المصروفات التشغيلية والإدارية (Operating Expenses)</span>
                    <span className="font-mono text-rose-700">
                      {incomeStatement.totalOperatingExpenses.toLocaleString('ar-SA')} {farmSettings.currency}
                    </span>
                  </div>
                  <div className="pr-4 space-y-1.5">
                    {incomeStatement.operatingExpenses.map((exp) => (
                      <div key={exp.code} className="flex justify-between text-slate-600 py-1 border-b border-slate-50">
                        <span>• {exp.name}</span>
                        <span className="font-mono font-bold text-slate-800">{exp.amount.toLocaleString('ar-SA')} {farmSettings.currency}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Net Income Banner */}
                <div
                  className={`p-4 rounded-2xl border-2 flex justify-between items-center font-black text-base ${
                    incomeStatement.netIncome >= 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div>
                    <span>صافي الربح التشغيلي للفترة (Net Income)</span>
                    <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {incomeStatement.netIncome >= 0 ? 'فائض أرباح تشغيلية محققة' : 'عجز خسائر تشغيلية'}
                    </div>
                  </div>
                  <div className="text-xl font-mono">
                    {incomeStatement.netIncome.toLocaleString('ar-SA')} {farmSettings.currency}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. TAB: الإقفال السنوي (YEAR-END CLOSING) */}
      {/* ===================================================================== */}
      {activeTab === 'year_end_closing' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Important Safety Warning Alert */}
          <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-sm space-y-2">
            <div className="flex items-center gap-2.5 font-black text-sm text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 stroke-[2.5]" />
              <span>تحذير مالي هام وضوابط دورة الإقفال السنوي (Year-end Closing)</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed">
              عملية الإقفال السنوي هي إجراء محاسبي رسمي يقوم برمجياً بـ{' '}
              <strong>تصفير كافة حسابات الإيرادات والمصروفات</strong> وترحيل صافي
              الربح أو الخسارة نهائياً إلى حساب <strong>"الأرباح المحتجزة / المدورة" (30201)</strong> ضمن حقوق الملكية.
              تبدأ السنة المالية الجديدة بأرصدة الأصول والخصوم فقط. يرجى التأكد التام من اكتمال تسجيل كافة الفواتير وسندات القبض والصرف قبل البدء.
            </p>
          </div>

          {/* Current Year Closing Preview Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  إقفال السنة المالية: {closingYear}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  معاينة الأرصدة الاسمية التي سيتم تصفيرها وترحيلها إلى حساب حقوق الملكية.
                </p>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-600">السنة المالية:</span>
                <input
                  type="number"
                  min="2020"
                  max="2050"
                  value={closingYear}
                  onChange={(e) => setClosingYear(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold font-mono w-24 text-center"
                />
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
                <span className="text-xs font-bold text-teal-700 block mb-1">
                  1. إجمالي الإيرادات المراد تصفيرها
                </span>
                <div className="text-xl font-black text-teal-900 font-sans">
                  {closingPreview.totalRevenues.toLocaleString('ar-SA')}{' '}
                  <span className="text-[10px] font-bold text-teal-600 font-sans">
                    {farmSettings.currency}
                  </span>
                </div>
                <div className="text-[10px] text-teal-700 mt-1">تُقفل من الدائن إلى المدين</div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="text-xs font-bold text-rose-700 block mb-1">
                  2. إجمالي المصروفات المراد تصفيرها
                </span>
                <div className="text-xl font-black text-rose-900 font-sans">
                  {closingPreview.totalExpenses.toLocaleString('ar-SA')}{' '}
                  <span className="text-[10px] font-bold text-rose-600 font-sans">
                    {farmSettings.currency}
                  </span>
                </div>
                <div className="text-[10px] text-rose-700 mt-1">تُقفل من المدين إلى الدائن</div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <span className="text-xs font-bold text-blue-700 block mb-1">
                  3. صافي الربح المرحل (Net Profit)
                </span>
                <div className="text-xl font-black text-blue-900 font-sans">
                  {closingPreview.netIncome.toLocaleString('ar-SA')}{' '}
                  <span className="text-[10px] font-bold text-blue-600 font-sans">
                    {farmSettings.currency}
                  </span>
                </div>
                <div className="text-[10px] text-blue-700 mt-1">يُرحل إلى الأرباح المحتجزة</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 text-white">
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  4. رصيد الأرباح المحتجزة بعد الإقفال
                </span>
                <div className="text-xl font-black text-emerald-400 font-sans">
                  {(closingPreview.retainedEarnings + closingPreview.netIncome).toLocaleString('ar-SA')}{' '}
                  <span className="text-[10px] font-bold text-slate-400 font-sans">
                    {farmSettings.currency}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  الرصيد السابق: {closingPreview.retainedEarnings.toLocaleString('ar-SA')}
                </div>
              </div>
            </div>

            {/* Closing Button & Action Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-600">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>توليد قيد إقفال متوازن آلياً (Closing Journal Entry)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  سيتم توليد قيد اليومية الرسمي بقيمة إجمالي الإيرادات والمصروفات بالتساوي بنسبة 100%.
                </p>
              </div>

              <button
                disabled={!closingPreview.canClose}
                onClick={() => {
                  setClosingConfirmText('');
                  setShowClosingConfirmModal(true);
                }}
                className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all ${
                  closingPreview.canClose
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>بدء إجراءات إقفال السنة المالية ({closingYear})</span>
              </button>
            </div>
          </div>

          {/* Audit History of Year-End Closings */}
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>سجل وتاريخ الإقفالات السنوية السابقة (Audit Trail)</span>
            </h3>

            {closingHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                لم يتم تنفيذ أي إقفال سنوي سابق حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[11px]">
                      <th className="py-2.5 px-3">السنة المالية</th>
                      <th className="py-2.5 px-3">تاريخ ووقت الإقفال</th>
                      <th className="py-2.5 px-3">المسؤول عن الإقفال</th>
                      <th className="py-2.5 px-3 text-left">إجمالي الإيرادات المقفلة</th>
                      <th className="py-2.5 px-3 text-left">إجمالي المصروفات المقفلة</th>
                      <th className="py-2.5 px-3 text-left">صافي الربح المرحل</th>
                      <th className="py-2.5 px-3 text-center">رقم قيد الإقفال</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {closingHistory.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{rec.fiscalYear}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{rec.closingDate}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-bold">{rec.closedBy}</td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-teal-600">
                          {rec.totalRevenues.toLocaleString('ar-SA')} {farmSettings.currency}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-bold text-rose-600">
                          {rec.totalExpenses.toLocaleString('ar-SA')} {farmSettings.currency}
                        </td>
                        <td className="py-2.5 px-3 text-left font-mono font-black text-emerald-600">
                          {rec.netIncome.toLocaleString('ar-SA')} {farmSettings.currency}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600">
                          {rec.closingJournalEntryNumber}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. TAB: ميزان المراجعة (TRIAL BALANCE) */}
      {/* ===================================================================== */}
      {activeTab === 'trial_balance' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Trial Balance Health Banner */}
          <div
            className={`p-5 rounded-3xl border flex items-center justify-between ${
              stats.isBalanced
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}
          >
            <div>
              <div className="font-black text-base flex items-center gap-2">
                {stats.isBalanced ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>ميزان المراجعة متوازن تماماً (Total Debits == Total Credits)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <span>تنبيه: ميزان المراجعة غير متوازن! يوجد فارق بين المدين والدائن</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                تطابق إجمالي الأرصدة المدينة مع الدائنة يثبت صحة جميع قيود اليومية وعدم وجود أخطاء في الدفاتر.
              </p>
            </div>
            <div className="text-left font-mono font-black text-lg">
              {stats.totalDebits.toLocaleString('ar-SA')}{' '}
              <span className="text-xs font-sans text-slate-400">{farmSettings.currency}</span>
            </div>
          </div>

          {/* Accounts Breakdown Table */}
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-extrabold">
                    <th className="py-3 px-4">كود الحساب</th>
                    <th className="py-3 px-4">اسم الحساب</th>
                    <th className="py-3 px-4">نوع الحساب</th>
                    <th className="py-3 px-4 text-left">الرصيد المدين (Debit)</th>
                    <th className="py-3 px-4 text-left">الرصيد الدائن (Credit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts
                    ?.sort((a, b) => a.code.localeCompare(b.code))
                    .map((acc) => {
                      const isDebit = acc.normalBalance === 'debit';
                      const bal = acc.currentBalance;
                      const debitVal = isDebit && bal > 0 ? bal : !isDebit && bal < 0 ? Math.abs(bal) : 0;
                      const creditVal = !isDebit && bal > 0 ? bal : isDebit && bal < 0 ? Math.abs(bal) : 0;

                      return (
                        <tr key={acc.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">{acc.code}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{acc.name}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                                accountTypeLabels[acc.type].bg
                              } ${accountTypeLabels[acc.type].text} ${accountTypeLabels[acc.type].border}`}
                            >
                              {accountTypeLabels[acc.type].label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-left font-mono font-bold text-blue-600">
                            {debitVal > 0 ? debitVal.toLocaleString('ar-SA') : '-'}
                          </td>
                          <td className="py-3 px-4 text-left font-mono font-bold text-emerald-600">
                            {creditVal > 0 ? creditVal.toLocaleString('ar-SA') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. TAB: شجرة الحسابات (CHART OF ACCOUNTS) */}
      {/* ===================================================================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Controls Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الحساب أو الكود..."
                  className="w-full pr-10 pl-4 py-2 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="py-2 px-3 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none"
              >
                <option value="all">كل الأنواع</option>
                <option value="asset">الأصول</option>
                <option value="liability">الخصوم</option>
                <option value="equity">حقوق الملكية</option>
                <option value="revenue">الإيرادات</option>
                <option value="expense">المصروفات</option>
              </select>
            </div>

            <button
              onClick={handleResetAccounts}
              className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>إعادة تهيئة الشجرة</span>
            </button>
          </div>

          {/* Accounts Table */}
          <div className="rounded-3xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-extrabold">
                    <th className="py-3 px-4">كود الحساب</th>
                    <th className="py-3 px-4">اسم الحساب</th>
                    <th className="py-3 px-4">النوع</th>
                    <th className="py-3 px-4">الطبيعة المحاسبية</th>
                    <th className="py-3 px-4 text-left">الرصيد الحالي</th>
                    <th className="py-3 px-4">الوصف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{acc.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{acc.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${
                            accountTypeLabels[acc.type].bg
                          } ${accountTypeLabels[acc.type].text} ${accountTypeLabels[acc.type].border}`}
                        >
                          {accountTypeLabels[acc.type].label}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-500">
                        {acc.normalBalance === 'debit' ? 'مدين (Debit)' : 'دائن (Credit)'}
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-black text-slate-900">
                        {acc.currentBalance.toLocaleString('ar-SA')}{' '}
                        <span className="text-[10px] text-slate-400 font-sans">{farmSettings.currency}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {acc.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. TAB: دفتر اليومية العامة (GENERAL JOURNAL) */}
      {/* ===================================================================== */}
      {activeTab === 'journal' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Controls Bar */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث برقم القيد، البيان، المرجع، الفاتورة اليدوية..."
                  className="w-full pr-10 pl-4 py-2 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none"
                />
              </div>

              <select
                value={journalFilterType}
                onChange={(e) => setJournalFilterType(e.target.value)}
                className="py-2 px-3 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none"
              >
                <option value="all">كل أنواع القيود</option>
                <option value="sale_invoice">فواتير مبيعات</option>
                <option value="receipt_voucher">سندات قبض</option>
                <option value="expense">سندات صرف ومصروفات</option>
                <option value="manual_entry">قيود يدوية</option>
                <option value="year_end_closing">إقفال سنوي</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddEntryModal(true)}
              className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>إضافة قيد يومية يدوي</span>
            </button>
          </div>

          {/* Entries Cards / Table List */}
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200">
                      {entry.entryNumber}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {entry.date} {entry.time}
                    </span>
                    {entry.manualInvoiceNumber && (
                      <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 text-[10px] font-mono font-bold border border-sky-200">
                        📝 يدوي: {entry.manualInvoiceNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      المسجل: {entry.createdBy}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      قيد متوازن ✓
                    </span>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-900">{entry.description}</div>

                {/* Lines Table */}
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] font-bold">
                        <th className="py-2 px-3">كود الحساب</th>
                        <th className="py-2 px-3">اسم الحساب</th>
                        <th className="py-2 px-3">البيان</th>
                        <th className="py-2 px-3 text-left">مدين (Debit)</th>
                        <th className="py-2 px-3 text-left">دائن (Credit)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entry.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="py-2 px-3 font-mono font-bold text-slate-600">{l.accountCode}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{l.accountName}</td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">{l.description || '-'}</td>
                          <td className="py-2 px-3 text-left font-mono font-bold text-blue-600">
                            {l.debit > 0 ? l.debit.toLocaleString('ar-SA') : '-'}
                          </td>
                          <td className="py-2 px-3 text-left font-mono font-bold text-emerald-600">
                            {l.credit > 0 ? l.credit.toLocaleString('ar-SA') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. MODAL: تأكيد الإقفال السنوي الصارم (YEAR-END CLOSING CONFIRM MODAL) */}
      {/* ===================================================================== */}
      {showClosingConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <Lock className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-base font-black text-slate-900">
                  تأكيد الإقفال السنوي للسنة المالية ({closingYear})
                </h3>
              </div>
              <button
                onClick={() => setShowClosingConfirmModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-2">
              <div className="font-black flex items-center gap-1.5 text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>إجراء نهائي لا يمكن الرجوع عنه تلقائياً:</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                سيتم تصفير كافة حسابات الإيرادات والمصروفات وترحيل صافي{' '}
                {closingPreview.netIncome >= 0 ? 'الأرباح' : 'الخسائر'} بمبلغ (
                <strong>{closingPreview.netIncome.toLocaleString('ar-SA')} {farmSettings.currency}</strong>) إلى حساب الأرباح المحتجزة.
              </p>
            </div>

            {/* Type to Confirm Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                لتأكيد الإقفال، اكتب العبارة التالية بدقة في المربع أدناه:
              </label>
              <div className="p-2 rounded-xl bg-slate-100 font-mono text-center font-black text-slate-800 text-xs mb-2 select-all">
                إقفال {closingYear}
              </div>
              <input
                type="text"
                value={closingConfirmText}
                onChange={(e) => setClosingConfirmText(e.target.value)}
                placeholder={`اكتب "إقفال ${closingYear}" هنا...`}
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-center font-bold"
              />
            </div>

            {/* Notes Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ملاحظات أو توصيات مجلس الإدارة (اختياري)
              </label>
              <input
                type="text"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="مثال: تم إقرار الحسابات الختامية وترحيل الأرباح لدورة 2026..."
                className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                disabled={closingConfirmText.trim() !== `إقفال ${closingYear}` || isClosingExecuting}
                onClick={handleExecuteYearEndClosing}
                className={`flex-1 py-2.5 rounded-2xl font-extrabold text-xs shadow-apple transition-all flex items-center justify-center gap-1.5 ${
                  closingConfirmText.trim() === `إقفال ${closingYear}` && !isClosingExecuting
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>{isClosingExecuting ? 'جاري الإقفال...' : 'تأكيد وتنفيذ الإقفال النهائي'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowClosingConfirmModal(false)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. MODAL: قيد يومية يدوي (MANUAL JOURNAL ENTRY MODAL) */}
      {/* ===================================================================== */}
      {showAddEntryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-scaleUp max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-600">
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <h3 className="text-base font-black text-slate-900">إضافة قيد يومية محاسبي يدوي</h3>
              </div>
              <button
                onClick={() => setShowAddEntryModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ القيد *</label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-2xl bg-slate-50 border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البيان والشرح العام للقيد *</label>
                  <input
                    type="text"
                    required
                    value={entryDesc}
                    onChange={(e) => setEntryDesc(e.target.value)}
                    placeholder="مثال: تسوية نقدية، إثبات أصل، قيد تسوية..."
                    className="w-full px-3.5 py-2 text-xs rounded-2xl bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>

              {/* Lines Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>أطراف القيد (المدين والدائن) *</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-indigo-600 hover:text-indigo-700 font-extrabold flex items-center gap-1 text-[11px]"
                  >
                    + إضافة سطر آخر
                  </button>
                </div>

                <div className="space-y-2">
                  {entryLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                      {/* Account Selector */}
                      <select
                        value={line.accountId}
                        onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-white border border-slate-200 text-xs font-bold"
                      >
                        {accounts?.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                      </select>

                      {/* Debit */}
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="مدين"
                        value={line.debit}
                        onChange={(e) =>
                          handleLineChange(
                            idx,
                            'debit',
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        className="w-24 py-1.5 px-2 rounded-xl bg-white border border-slate-200 font-mono text-center font-bold text-blue-600"
                      />

                      {/* Credit */}
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="دائن"
                        value={line.credit}
                        onChange={(e) =>
                          handleLineChange(
                            idx,
                            'credit',
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        className="w-24 py-1.5 px-2 rounded-xl bg-white border border-slate-200 font-mono text-center font-bold text-emerald-600"
                      />

                      {/* Remove Line */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Balance Validator Bar */}
              <div
                className={`p-3 rounded-2xl border text-xs flex items-center justify-between font-bold ${
                  isModalBalanced
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <div>إجمالي المدين: {modalTotalDebit.toLocaleString()} | إجمالي الدائن: {modalTotalCredit.toLocaleString()}</div>
                <div>{isModalBalanced ? 'القيد متوازن تماماً ✓' : `غير متوازن! الفارق: ${modalDifference.toLocaleString()}`}</div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!isModalBalanced}
                  className={`flex-1 py-2.5 rounded-2xl font-extrabold text-xs shadow-apple transition-all ${
                    isModalBalanced
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  حفظ وترحيل القيد المحاسبي
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEntryModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
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
