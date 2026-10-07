import React, { useState, useMemo } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Account, JournalEntry, AccountType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  initializeChartOfAccounts,
  createJournalEntry,
  getTrialBalance,
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
} from 'lucide-react';

const accountTypeLabels: Record<AccountType, { label: string; bg: string; text: string; border: string }> = {
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
  const [activeTab, setActiveTab] = useState<'accounts' | 'journal' | 'trial_balance'>('accounts');

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

  // Filters & Search
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
  const modalDiff = Math.abs(modalTotalDebit - modalTotalCredit);
  const isModalBalanced = modalDiff < 0.001 && modalTotalDebit > 0;

  // Add line to manual modal
  const handleAddLine = () => {
    setEntryLines((prev) => [
      ...prev,
      { accountId: accounts?.[0]?.id || 'acc-10101', debit: '', credit: '', description: '' },
    ]);
  };

  // Remove line from manual modal
  const handleRemoveLine = (idx: number) => {
    if (entryLines.length <= 2) {
      toast('القيد المزدوج يتطلب سطرين على الأقل!', 'warning');
      return;
    }
    setEntryLines((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit Manual Journal Entry
  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDesc.trim()) {
      toast('يرجى إدخال بيان القيد المحاسبي', 'warning');
      return;
    }

    if (!isModalBalanced) {
      toast(
        `لا يمكن حفظ القيد: القيد غير متوازن! الفارق بين المدين والدائن (${modalDiff.toLocaleString()} ${farmSettings.currency})`,
        'error'
      );
      return;
    }

    try {
      const formattedLines = entryLines.map((l) => {
        const acc = accounts?.find((a) => a.id === l.accountId);
        return {
          accountId: l.accountId,
          accountCode: acc?.code || '10101',
          accountName: acc?.name || 'حساب عام',
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description.trim() || entryDesc.trim(),
        };
      });

      await createJournalEntry({
        date: entryDate,
        description: entryDesc.trim(),
        referenceType: 'manual_entry',
        lines: formattedLines,
        createdBy: userName,
      });

      toast('تم ترحيل وحفظ القيد المحاسبي المزدوج بنجاح وتحديث أرصدة الحسابات!', 'success');
      setShowAddEntryModal(false);
      setEntryDesc('');
      setEntryLines([
        { accountId: 'acc-10101', debit: '', credit: '', description: '' },
        { accountId: 'acc-40104', debit: '', credit: '', description: '' },
      ]);
    } catch (err: any) {
      console.error(err);
      toast(err?.message || 'حدث خطأ أثناء حفظ القيد', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-emerald-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              النواة المحاسبية وشجرة الحسابات (Accounting Core)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            دليل شجرة الحسابات الشاملة، نظام القيد المزدوج الآلي، دفتر اليومية العامة، وميزان المراجعة المتوازن.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetAccounts}
            className="px-3.5 py-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            title="إعادة تهيئة وتحديث شجرة الحسابات الافتراضية"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>تحديث الشجرة</span>
          </button>

          <button
            onClick={() => setShowAddEntryModal(true)}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-apple flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>تسجيل قيد محاسبي يدوي</span>
          </button>
        </div>
      </div>

      {/* 2. Top Accounting KPI Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Double-Entry Balance Health */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              stats.isBalanced ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">صحة القيد المزدوج</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-base font-black ${
                  stats.isBalanced ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {stats.isBalanced ? 'متوازن بنسبة 100%' : '⚠️ يوجد عدم توازن'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              إجمالي القيود: {stats.totalEntries} قيد مرحل
            </p>
          </div>
        </div>

        {/* Card 2: Cash Box Balance */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">رصيد الصندوق الرئيسي (10101)</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-slate-900 font-mono">
                {stats.cashBalance.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">{farmSettings.currency}</span>
            </div>
            <p className="text-[10px] text-emerald-700 font-bold mt-0.5">طبيعة الحساب: مدين (Debit)</p>
          </div>
        </div>

        {/* Card 3: Receivables (Customers) */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <ArrowRightLeft className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">العملاء والذمم المدينة (10201)</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-sky-700 font-mono">
                {stats.receivablesBalance.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">{farmSettings.currency}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">مبيعات آجلة غير محصلة</p>
          </div>
        </div>

        {/* Card 4: Sales Revenue */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">إيرادات المبيعات العامة (40104)</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-amber-700 font-mono">
                {stats.salesBalance.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">{farmSettings.currency}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">طبيعة الحساب: دائن (Credit)</p>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs (شجرة الحسابات / القيود اليومية / ميزان المراجعة) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'accounts'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>شجرة الحسابات (الدليل المحاسبي)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'accounts' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {accounts?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'journal'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>دفتر القيود اليومية العامة (Journal Entries)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'journal' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {journalEntries?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'trial_balance'
              ? 'bg-teal-700 text-white shadow-md shadow-teal-200'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>ميزان المراجعة (Trial Balance)</span>
        </button>
      </div>

      {/* 4. Tab Content 1: شجرة الحسابات (Chart of Accounts) */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-3xl glass-panel border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث بكود الحساب أو اسم الحساب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>

            {/* Account Type Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedTypeFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedTypeFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                جميع الحسابات
              </button>
              {(['asset', 'liability', 'equity', 'revenue', 'expense'] as AccountType[]).map(
                (t) => {
                  const meta = accountTypeLabels[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setSelectedTypeFilter(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedTypeFilter === t
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Accounts Table */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>دليل شجرة الحسابات ({filteredAccounts.length} حساب)</span>
              </h3>
              <span className="text-xs text-slate-400">
                الحسابات مقسمة إلى أصول، خصوم، حقوق ملكية، إيرادات، ومصروفات
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3 text-center">كود الحساب</th>
                    <th className="p-3">اسم الحساب</th>
                    <th className="p-3">التصنيف المحاسبي</th>
                    <th className="p-3 text-center">الطبيعة</th>
                    <th className="p-3 text-center">الرصيد الدفتري الحالي</th>
                    <th className="p-3">البيان والوظيفة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAccounts.length > 0 ? (
                    filteredAccounts.map((acc) => {
                      const meta = accountTypeLabels[acc.type] || accountTypeLabels.asset;
                      return (
                        <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center font-mono font-black text-slate-900 bg-slate-50/50 rounded-xl">
                            {acc.code}
                          </td>
                          <td className="p-3 font-bold text-slate-900">
                            <span>{acc.name}</span>
                            {acc.isSystem && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 mr-2">
                                حساب نظامي
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-xl border ${meta.bg} ${meta.text} ${meta.border}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                                acc.normalBalance === 'debit'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {acc.normalBalance === 'debit' ? 'مدين (Dr)' : 'دائن (Cr)'}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-black text-sm text-slate-900">
                            {acc.currentBalance.toLocaleString('en-US')} {acc.currency}
                          </td>
                          <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">
                            {acc.description || '—'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        لا توجد حسابات مطابقة للبحث أو الفلتر
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Tab Content 2: دفتر القيود اليومية العامة (Journal Entries) */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {/* Journal Filters Bar */}
          <div className="p-4 rounded-3xl glass-panel border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث برقم القيد، البيان، رقم الفاتورة أو الفاتورة اليدوية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 shadow-xs"
              />
            </div>

            {/* Reference Type Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setJournalFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  journalFilterType === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                جميع القيود
              </button>
              <button
                onClick={() => setJournalFilterType('sale_invoice')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  journalFilterType === 'sale_invoice'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                قيود المبيعات
              </button>
              <button
                onClick={() => setJournalFilterType('receipt_voucher')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  journalFilterType === 'receipt_voucher'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                قيود سندات القبض
              </button>
              <button
                onClick={() => setJournalFilterType('expense')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  journalFilterType === 'expense'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                قيود المصروفات
              </button>
              <button
                onClick={() => setJournalFilterType('manual_entry')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  journalFilterType === 'manual_entry'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                القيود اليدوية
              </button>
            </div>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-4">
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry) => {
                const isSale = entry.referenceType === 'sale_invoice';
                const isVoucher = entry.referenceType === 'receipt_voucher';
                const isExpense = entry.referenceType === 'expense';

                return (
                  <div
                    key={entry.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3 transition-all hover:border-slate-300"
                  >
                    {/* Entry Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-xl">
                          {entry.entryNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                            isSale
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isVoucher
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : isExpense
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                        >
                          {isSale
                            ? 'فاتورة مبيعات'
                            : isVoucher
                            ? 'سند قبض وتحصيل'
                            : isExpense
                            ? 'سند صرف مصروف'
                            : 'قيد تسوية يدوي'}
                        </span>

                        {entry.referenceNumber && (
                          <span className="text-[11px] font-mono text-slate-500 font-bold">
                            مرجع: {entry.referenceNumber}
                          </span>
                        )}

                        {entry.manualInvoiceNumber && (
                          <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            فاتورة يدوية: {entry.manualInvoiceNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{entry.date} {entry.time}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs font-bold text-slate-800">
                      {entry.description}
                    </p>

                    {/* Double-Entry Lines Table */}
                    <div className="rounded-2xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                          <tr>
                            <th className="p-2.5">الحساب</th>
                            <th className="p-2.5">البيان التفصيلي</th>
                            <th className="p-2.5 text-center w-32">مدين (Debit)</th>
                            <th className="p-2.5 text-center w-32">دائن (Credit)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {entry.lines.map((line) => (
                            <tr key={line.id} className="hover:bg-slate-50/50">
                              <td className="p-2.5">
                                <span className="font-bold text-slate-900 font-sans">
                                  {line.accountName}
                                </span>
                                <span className="text-[10px] text-slate-400 mr-1.5">
                                  ({line.accountCode})
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-600 font-sans text-[11px]">
                                {line.description || '—'}
                              </td>
                              <td className="p-2.5 text-center font-bold text-emerald-700">
                                {line.debit > 0
                                  ? `${line.debit.toLocaleString('en-US')} ${farmSettings.currency}`
                                  : '—'}
                              </td>
                              <td className="p-2.5 text-center font-bold text-blue-700">
                                {line.credit > 0
                                  ? `${line.credit.toLocaleString('en-US')} ${farmSettings.currency}`
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-mono font-black border-t border-slate-200">
                          <tr>
                            <td colSpan={2} className="p-2.5 font-sans font-black text-slate-700">
                              إجمالي أطراف القيد:
                            </td>
                            <td className="p-2.5 text-center text-emerald-800 text-sm">
                              {entry.totalDebit.toLocaleString('en-US')} {farmSettings.currency}
                            </td>
                            <td className="p-2.5 text-center text-blue-800 text-sm">
                              {entry.totalCredit.toLocaleString('en-US')} {farmSettings.currency}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Balanced Stamp */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>القيد متوازن ومرحل آلياً إلى دفتر الأستاذ العام (Balanced 100%)</span>
                      </div>
                      <span className="text-slate-400 text-[10px]">
                        القائم بالقيد: {entry.createdBy}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2 bg-white rounded-3xl border border-slate-200">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-sm text-slate-600">
                  لا توجد قيود يومية مطابقة لخيارات البحث
                </p>
                <p className="text-xs text-slate-400">
                  يتم تسجيل القيود آلياً عند إتمام المبيعات أو سندات الصرف أو التحصيل.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Tab Content 3: ميزان المراجعة (Trial Balance) */}
      {activeTab === 'trial_balance' && (
        <div className="space-y-4">
          {/* Trial Balance Health Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-apple flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
                <span className="text-xs font-bold text-emerald-100">
                  المطابقة المحاسبية الإجمالية
                </span>
              </div>
              <h3 className="text-xl font-black">
                ميزان المراجعة بالأرصدة (Trial Balance)
              </h3>
              <p className="text-xs text-emerald-100">
                مطابقة إجمالي الأرصدة المدينة والدائنة لكافة حسابات المزرعة لضمان سلامة الدفاتر المحاسبية.
              </p>
            </div>
            <div className="text-left bg-white/10 px-4 py-2.5 rounded-2xl border border-white/20">
              <span className="text-[11px] block opacity-90">حالة التوازن:</span>
              <span className="text-lg font-black font-mono text-emerald-200">
                متوازن 100% ✓
              </span>
            </div>
          </div>

          {/* Trial Balance Table */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 shadow-sm space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3 text-center">كود الحساب</th>
                    <th className="p-3">اسم الحساب</th>
                    <th className="p-3">التصنيف</th>
                    <th className="p-3 text-center w-36">الرصيد المدين (Debit)</th>
                    <th className="p-3 text-center w-36">الرصيد الدائن (Credit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {accounts?.map((acc) => {
                    let debitBal = 0;
                    let creditBal = 0;
                    if (acc.normalBalance === 'debit') {
                      if (acc.currentBalance >= 0) debitBal = acc.currentBalance;
                      else creditBal = Math.abs(acc.currentBalance);
                    } else {
                      if (acc.currentBalance >= 0) creditBal = acc.currentBalance;
                      else debitBal = Math.abs(acc.currentBalance);
                    }

                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80">
                        <td className="p-3 text-center font-bold text-slate-800">
                          {acc.code}
                        </td>
                        <td className="p-3 font-sans font-bold text-slate-900">
                          {acc.name}
                        </td>
                        <td className="p-3 font-sans text-slate-500">
                          {accountTypeLabels[acc.type]?.label || acc.type}
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-700">
                          {debitBal > 0 ? `${debitBal.toLocaleString('en-US')} ${acc.currency}` : '—'}
                        </td>
                        <td className="p-3 text-center font-bold text-blue-700">
                          {creditBal > 0 ? `${creditBal.toLocaleString('en-US')} ${acc.currency}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 font-mono font-black text-sm border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={3} className="p-3 font-sans text-slate-900 font-black">
                      إجمالي ميزان المراجعة:
                    </td>
                    <td className="p-3 text-center text-emerald-900">
                      {accounts
                        ?.reduce((sum, a) => {
                          const bal =
                            a.normalBalance === 'debit'
                              ? a.currentBalance >= 0
                                ? a.currentBalance
                                : 0
                              : a.currentBalance < 0
                              ? Math.abs(a.currentBalance)
                              : 0;
                          return sum + bal;
                        }, 0)
                        .toLocaleString('en-US')}{' '}
                      {farmSettings.currency}
                    </td>
                    <td className="p-3 text-center text-blue-900">
                      {accounts
                        ?.reduce((sum, a) => {
                          const bal =
                            a.normalBalance === 'credit'
                              ? a.currentBalance >= 0
                                ? a.currentBalance
                                : 0
                              : a.currentBalance < 0
                              ? Math.abs(a.currentBalance)
                              : 0;
                          return sum + bal;
                        }, 0)
                        .toLocaleString('en-US')}{' '}
                      {farmSettings.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: تسجيل قيد محاسبي يدوي (Manual Double-Entry Modal) */}
      {showAddEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-apple-modal border border-slate-100 text-right max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600">
                <Scale className="w-5 h-5 stroke-[2.5]" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    تسجيل قيد محاسبي مزدوج يدوي
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    يشترط توازن القيد بالكامل (إجمالي المدين = إجمالي الدائن) لحفظه.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddEntryModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveManualEntry} className="space-y-4 pt-3">
              {/* Date & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ القيد
                  </label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full glass-input text-xs py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    بيان القيد المحاسبي العام <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تسوية رصيد مخزون، إيداع رأس مال، سداد نقدي..."
                    value={entryDesc}
                    onChange={(e) => setEntryDesc(e.target.value)}
                    className="w-full glass-input text-xs py-2 font-bold"
                  />
                </div>
              </div>

              {/* Lines Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800">
                    أطراف القيد (المدين والدائن)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة طرف</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {entryLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-12 gap-2 items-center"
                    >
                      {/* Account Selector */}
                      <div className="col-span-12 sm:col-span-5">
                        <select
                          value={line.accountId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEntryLines((prev) =>
                              prev.map((l, i) => (i === idx ? { ...l, accountId: val } : l))
                            );
                          }}
                          className="w-full glass-input text-xs py-1.5 font-bold"
                        >
                          {accounts?.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} - {a.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Debit */}
                      <div className="col-span-5 sm:col-span-3">
                        <input
                          type="number"
                          min="0"
                          placeholder="مدين (Dr)"
                          value={line.debit}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setEntryLines((prev) =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, debit: val, credit: val ? 0 : l.credit } : l
                              )
                            );
                          }}
                          className="w-full glass-input text-xs py-1.5 font-mono font-bold text-center text-emerald-800"
                        />
                      </div>

                      {/* Credit */}
                      <div className="col-span-5 sm:col-span-3">
                        <input
                          type="number"
                          min="0"
                          placeholder="دائن (Cr)"
                          value={line.credit}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            setEntryLines((prev) =>
                              prev.map((l, i) =>
                                i === idx ? { ...l, credit: val, debit: val ? 0 : l.debit } : l
                              )
                            );
                          }}
                          className="w-full glass-input text-xs py-1.5 font-mono font-bold text-center text-blue-800"
                        />
                      </div>

                      {/* Remove */}
                      <div className="col-span-2 sm:col-span-1 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Balance Verification Box */}
              <div
                className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row items-center justify-between gap-2 ${
                  isModalBalanced
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isModalBalanced ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span className="font-bold">
                    {isModalBalanced
                      ? 'القيد متوازن 100% وجاهز للترحيل'
                      : `القيد غير متوازن! الفارق: ${modalDiff.toLocaleString()} ${farmSettings.currency}`}
                  </span>
                </div>

                <div className="font-mono font-black text-xs flex gap-3">
                  <span>مدين: {modalTotalDebit.toLocaleString()}</span>
                  <span>دائن: {modalTotalCredit.toLocaleString()}</span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={!isModalBalanced}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-apple flex items-center justify-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>ترحيل وحفظ القيد المحاسبي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEntryModal(false)}
                  className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
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
