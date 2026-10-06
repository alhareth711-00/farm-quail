import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { DailyCashRegister, ExpenseRecord, ExpenseCategory } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Coins,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Calendar,
  Wallet,
  Receipt,
  RotateCcw,
  Sparkles,
  X,
  Trash2,
} from 'lucide-react';

export const CashRegisterView: React.FC = () => {
  const { farmSettings, userName } = useAuth();
  const { toast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  const cashRegisters = useLiveQuery(
    () => db.cashRegisters.reverse().sortBy('date'),
    []
  );
  const invoices = useLiveQuery(() => db.invoices.toArray(), []);
  const vouchers = useLiveQuery(() => db.receiptVouchers.toArray(), []);
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);
  const purchases = useLiveQuery(() => db.purchases.toArray(), []);

  // Today's automated figures
  const todayInvoices = invoices?.filter((inv) => inv.date === todayStr) || [];
  const todayCashSales = todayInvoices
    .filter((inv) => inv.paymentMethod === 'cash')
    .reduce((acc, inv) => acc + inv.paidAmount, 0);

  const todayKuraimiSales = todayInvoices
    .filter((inv) => inv.paymentMethod === 'kuraimi')
    .reduce((acc, inv) => acc + inv.paidAmount, 0);

  const todayJeebSales = todayInvoices
    .filter((inv) => inv.paymentMethod === 'jeeb')
    .reduce((acc, inv) => acc + inv.paidAmount, 0);

  const todayJawaliSales = todayInvoices
    .filter((inv) => inv.paymentMethod === 'jawali')
    .reduce((acc, inv) => acc + inv.paidAmount, 0);

  const todayEWalletsTotal = todayKuraimiSales + todayJeebSales + todayJawaliSales;

  const todayVouchers = vouchers?.filter((v) => v.date === todayStr && v.paymentType === 'cash') || [];
  const todayCashVouchers = todayVouchers.reduce((acc, v) => acc + v.amount, 0);

  const todayExpensesList = expenses?.filter((e) => e.date === todayStr && e.paidFrom === 'cash_box') || [];
  const todayCashPurchasesList = purchases?.filter((p) => p.date === todayStr && p.paidFrom === 'cash_box') || [];
  const todayCashExpenses =
    todayExpensesList.reduce((acc, e) => acc + e.amount, 0) +
    todayCashPurchasesList.reduce((acc, p) => acc + p.totalAmount, 0);

  // Find yesterday's closing cash balance
  const previousRegisters = cashRegisters?.filter((r) => r.date < todayStr) || [];
  const lastYesterdayRegister = previousRegisters.length > 0 ? previousRegisters[0] : null;
  const autoOpeningBalance = lastYesterdayRegister ? lastYesterdayRegister.actualClosingBalance : 1500;

  // Active register record for today if exists
  const todayRegister = cashRegisters?.find((r) => r.date === todayStr);

  // Form states
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftSupervisor, setShiftSupervisor] = useState(userName || 'م. عبدالله القحطاني');
  const [openingBalance, setOpeningBalance] = useState<number>(autoOpeningBalance);
  const [actualClosingBalance, setActualClosingBalance] = useState<number>(
    autoOpeningBalance + todayCashSales + todayCashVouchers - todayCashExpenses
  );
  const [shiftNotes, setShiftNotes] = useState('');

  // Calculations for shift closure
  const expectedClosing = openingBalance + todayCashSales + todayCashVouchers - todayCashExpenses;
  const difference = actualClosingBalance - expectedClosing;
  const reconciliationStatus: 'balanced' | 'surplus' | 'deficit' =
    difference === 0 ? 'balanced' : difference > 0 ? 'surplus' : 'deficit';

  const handleOpenShiftModal = () => {
    setShiftSupervisor(userName || 'م. عبدالله القحطاني');
    setOpeningBalance(todayRegister ? todayRegister.openingBalance : autoOpeningBalance);
    const exp = (todayRegister ? todayRegister.openingBalance : autoOpeningBalance) + todayCashSales + todayCashVouchers - todayCashExpenses;
    setActualClosingBalance(todayRegister ? todayRegister.actualClosingBalance : exp);
    setShiftNotes(todayRegister?.notes || '');
    setShowShiftModal(true);
  };

  const handleSaveShiftRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const reg: DailyCashRegister = {
      id: todayRegister ? todayRegister.id : `cash-reg-${Date.now()}`,
      date: todayStr,
      shiftSupervisor: shiftSupervisor.trim(),
      openingBalance: Number(openingBalance),
      cashSales: todayCashSales,
      cashVouchers: todayCashVouchers,
      cashExpenses: todayCashExpenses,
      expectedClosingBalance: expectedClosing,
      actualClosingBalance: Number(actualClosingBalance),
      difference,
      status: reconciliationStatus,
      kuraimiSales: todayKuraimiSales,
      jeebSales: todayJeebSales,
      jawaliSales: todayJawaliSales,
      notes: shiftNotes.trim(),
      closedAt: new Date().toISOString(),
    };

    if (todayRegister) {
      await db.cashRegisters.put(reg);
      toast('تم تحديث مطابقة الصندوق اليومي بنجاح!', 'success');
    } else {
      await db.cashRegisters.add(reg);
      toast('تم إغلاق ومطابقة الصندوق اليومي بنجاح!', 'success');
    }

    setShowShiftModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              الإدارة النقدية ومطابقة الصندوق والوردية (Daily Cash Drawer)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            جرد ومطابقة الكاش اليومي آلياً: رصيد أمس الافتتاحي + المقبوضات - المصروفات = الرصيد المتوقع ومطابقة الفارق.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cash Drawer Closing Button */}
          <button
            onClick={handleOpenShiftModal}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
          >
            <Wallet className="w-4 h-4" />
            <span>{todayRegister ? 'تحديث جرد صندوق اليوم' : 'إغلاق ومطابقة كاش اليوم'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Cash Balance Flow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Opening Balance */}
        <div className="p-4 rounded-3xl glass-card border border-slate-200">
          <div className="text-[10px] font-bold text-slate-500 mb-1">1. المتبقي في الصندوق من أمس (افتتاحي)</div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {(todayRegister ? todayRegister.openingBalance : autoOpeningBalance).toLocaleString('ar-SA')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">رصيد إغلاق الأمس الفعلي</div>
        </div>

        {/* 2. Cash Inflow */}
        <div className="p-4 rounded-3xl glass-card border border-emerald-200 bg-emerald-50/30">
          <div className="text-[10px] font-bold text-emerald-800 mb-1">2. مقبوضات المبيعات وسندات القبض (+)</div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            +{(todayCashSales + todayCashVouchers).toLocaleString('ar-SA')}
          </div>
          <div className="text-[10px] text-emerald-600 mt-1">
            مبيعات نقدي: {todayCashSales} | سندات: {todayCashVouchers}
          </div>
        </div>

        {/* 3. Cash Expenses */}
        <div className="p-4 rounded-3xl glass-card border border-rose-200 bg-rose-50/30">
          <div className="text-[10px] font-bold text-rose-800 mb-1">3. المصروفات النقدية من الصندوق (-)</div>
          <div className="text-2xl font-black text-rose-700 font-mono">
            -{todayCashExpenses.toLocaleString('ar-SA')}
          </div>
          <div className="text-[10px] text-rose-600 mt-1">
            شراء أعلاف، بترول، سلف، إلخ
          </div>
        </div>

        {/* 4. Expected Balance */}
        <div className="p-4 rounded-3xl glass-card border border-sky-200 bg-sky-50/30">
          <div className="text-[10px] font-bold text-sky-800 mb-1">4. الرصيد المتوقع بالصندوق (=)</div>
          <div className="text-2xl font-black text-sky-900 font-mono">
            {expectedClosing.toLocaleString('ar-SA')}
          </div>
          <div className="text-[10px] text-sky-600 mt-1">{farmSettings.currency} المفترض وجودها</div>
        </div>

        {/* 5. Actual Balance & Reconciliation Result */}
        <div
          className={`p-4 rounded-3xl glass-card border ${
            todayRegister
              ? todayRegister.difference === 0
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                : todayRegister.difference > 0
                ? 'border-teal-300 bg-teal-50 text-teal-950'
                : 'border-rose-300 bg-rose-50 text-rose-950'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="text-[10px] font-bold mb-1">5. الرصيد الفعلي وحالة المطابقة</div>
          <div className="text-2xl font-black font-mono">
            {(todayRegister ? todayRegister.actualClosingBalance : expectedClosing).toLocaleString('ar-SA')}
          </div>
          <div className="text-[10px] font-extrabold mt-1">
            {todayRegister ? (
              todayRegister.difference === 0 ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> مطابق تام (0 فارق)
                </span>
              ) : todayRegister.difference > 0 ? (
                <span className="text-teal-700">فائض نقدي: +{todayRegister.difference} {farmSettings.currency}</span>
              ) : (
                <span className="text-rose-700">عجز نقدي: {todayRegister.difference} {farmSettings.currency}</span>
              )
            ) : (
              <span className="text-slate-500">بانتظار جرد نهاية اليوم</span>
            )}
          </div>
        </div>
      </div>

      {/* Yemeni E-Wallets Dedicated Status Bar */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70 border border-blue-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-blue-950">
              حركة المحافظ الإلكترونية اليمنية اليوم (أرصدة مستقلة عن صندوق الكاش)
            </h4>
            <span className="text-[10px] text-blue-800">
              إجمالي المحصل إلكترونياً: <b className="font-mono text-blue-900">{todayEWalletsTotal.toLocaleString('ar-SA')} {farmSettings.currency}</b>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-blue-200 shadow-sm flex items-center gap-1.5 text-blue-900">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            <span className="font-almarai font-normal text-slate-600">الكريمي:</span>
            <span>{todayKuraimiSales.toLocaleString('ar-SA')} {farmSettings.currency}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white border border-purple-200 shadow-sm flex items-center gap-1.5 text-purple-900">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
            <span className="font-almarai font-normal text-slate-600">جيب (Jeeb):</span>
            <span>{todayJeebSales.toLocaleString('ar-SA')} {farmSettings.currency}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white border border-teal-200 shadow-sm flex items-center gap-1.5 text-teal-900">
            <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
            <span className="font-almarai font-normal text-slate-600">جوالي (Jawali):</span>
            <span>{todayJawaliSales.toLocaleString('ar-SA')} {farmSettings.currency}</span>
          </div>
        </div>
      </div>

      {/* Shift Supervisor Info Banner */}
      <div className="p-4 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-apple">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">المسؤول عن وردية اليوم:</div>
            <div className="text-sm font-extrabold text-white">
              {todayRegister?.shiftSupervisor || userName || 'م. عبدالله القحطاني'}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-300 font-mono">
          التاريخ: <b className="text-white">{todayStr}</b> • حالة الجرد:{' '}
          <b className="text-emerald-400">
            {todayRegister ? (todayRegister.difference === 0 ? 'تم الإغلاق بنجاح' : 'يوجد فارق') : 'قيد التشغيل'}
          </b>
        </div>
      </div>

      {/* Historical Cash Register Closings */}
      <div className="rounded-3xl glass-panel p-5 border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-sm text-slate-900">
              سجل إغلاقات الصندوق ومطابقة الوردية التاريخية
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            عدد السجلات: {cashRegisters?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">تاريخ الوردية</th>
                <th className="p-3.5">المسؤول عن الوردية</th>
                <th className="p-3.5 text-center">افتتاحي أمس</th>
                <th className="p-3.5 text-center">مبيعات وسندات (+)</th>
                <th className="p-3.5 text-center">المصروفات (-)</th>
                <th className="p-3.5 text-center">الرصيد المتوقع</th>
                <th className="p-3.5 text-center">الرصيد الفعلي</th>
                <th className="p-3.5 text-center">فارق المطابقة</th>
                <th className="p-3.5 text-center">حالة الصندوق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cashRegisters && cashRegisters.length > 0 ? (
                cashRegisters.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{reg.date}</td>
                    <td className="p-3.5 font-bold text-slate-800">{reg.shiftSupervisor}</td>
                    <td className="p-3.5 text-center font-mono">{reg.openingBalance}</td>
                    <td className="p-3.5 text-center font-mono font-bold text-emerald-700">
                      +{(reg.cashSales || 0) + (reg.cashVouchers || 0)}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-rose-700">
                      -{reg.cashExpenses}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-sky-800">
                      {reg.expectedClosingBalance}
                    </td>
                    <td className="p-3.5 text-center font-mono font-black text-slate-900 text-sm">
                      {reg.actualClosingBalance}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold">
                      {reg.difference === 0 ? (
                        <span className="text-emerald-700 font-black">0</span>
                      ) : reg.difference > 0 ? (
                        <span className="text-teal-700">+{reg.difference} (فائض)</span>
                      ) : (
                        <span className="text-rose-700">{reg.difference} (عجز)</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          reg.difference === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : reg.difference > 0
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {reg.difference === 0 ? 'مطابق تماماً' : reg.difference > 0 ? 'فائض' : 'عجز'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    لا توجد إغلاقات سابقة مسجلة للصندوق
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Shift Cash Closing & Reconciliation */}
      {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Wallet className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  إغلاق ومطابقة الصندوق اليومي والوردية
                </h3>
              </div>
              <button
                onClick={() => setShowShiftModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShiftRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المسؤول عن الوردية / اليوم
                </label>
                <input
                  type="text"
                  required
                  value={shiftSupervisor}
                  onChange={(e) => setShiftSupervisor(e.target.value)}
                  className="w-full glass-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المتبقي من أمس (رصيد افتتاحي)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Number(e.target.value))}
                    className="w-full glass-input text-center font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ الإغلاق
                  </label>
                  <input
                    type="date"
                    disabled
                    value={todayStr}
                    className="w-full glass-input text-center font-mono bg-slate-100 text-slate-500"
                  />
                </div>
              </div>

              {/* Automatic Cash breakdown review */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>+ مقبوضات المبيعات النقدية اليوم:</span>
                  <span className="font-mono font-bold text-emerald-700">+{todayCashSales} {farmSettings.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>+ سندات القبض النقدية المحصلة:</span>
                  <span className="font-mono font-bold text-emerald-700">+{todayCashVouchers} {farmSettings.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>- المصروفات النقدية من الصندوق:</span>
                  <span className="font-mono font-bold text-rose-700">-{todayCashExpenses} {farmSettings.currency}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200 text-slate-900">
                  <span>الرصيد المحسوب المتوقع في الصندوق:</span>
                  <span className="font-mono text-sm text-sky-800">{expectedClosing} {farmSettings.currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المتبقي في الصندوق نهاية اليوم (الرصيد الفعلي بعد الجرد)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={actualClosingBalance}
                  onChange={(e) => setActualClosingBalance(Number(e.target.value))}
                  className="w-full glass-input text-center text-xl font-mono font-black text-slate-900"
                  autoFocus
                />
              </div>

              {/* Difference and Reconciliation Feedback */}
              <div
                className={`p-3 rounded-2xl border text-xs flex items-center justify-between font-bold ${
                  difference === 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : difference > 0
                    ? 'bg-teal-50 border-teal-300 text-teal-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <span>نتيجة مطابقة الصندوق:</span>
                <span className="font-mono text-sm font-black">
                  {difference === 0
                    ? 'مطابق تماماً (لا عجز ولا فائض)'
                    : difference > 0
                    ? `فائض نقدي: +${difference} ${farmSettings.currency}`
                    : `عجز نقدي: ${difference} ${farmSettings.currency}`}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات إغلاق الوردية
                </label>
                <textarea
                  rows={2}
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="ملاحظات تسليم الصندوق أو تفصيل الفوارق إن وجدت..."
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  تأكيد واعتماد إغلاق الصندوق
                </button>
                <button
                  type="button"
                  onClick={() => setShowShiftModal(false)}
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
