import React, { useState } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Customer, ReceiptVoucher, OrderInvoice, VoucherPaymentType } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { recordReceiptVoucherJournalEntry } from '../../services/accountingService';
import {
  Users,
  Plus,
  Receipt,
  Phone,
  MapPin,
  Clock,
  ArrowDownLeft,
  DollarSign,
  X,
  CreditCard,
  FileText,
  FileSignature,
  Search,
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { farmSettings, userName } = useAuth();
  const { toast } = useToast();

  const customers = useLiveQuery(() => db.customers.toArray(), []);
  const invoices = useLiveQuery(() => db.invoices.toArray(), []);
  const vouchers = useLiveQuery(() => db.receiptVouchers.reverse().sortBy('date'), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custType, setCustType] = useState<Customer['type']>('wholesale');
  const [custAddress, setCustAddress] = useState('');
  const [custInitialDebt, setCustInitialDebt] = useState(0);

  // Receipt Voucher (سند قبض) Modal
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherAmount, setVoucherAmount] = useState(0);
  const [voucherPaymentType, setVoucherPaymentType] = useState<VoucherPaymentType>('cash');
  const [voucherNotes, setVoucherNotes] = useState('');

  // Add Customer
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) return;

    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: custName.trim(),
      phone: custPhone.trim(),
      type: custType,
      address: custAddress.trim(),
      currentDebt: Number(custInitialDebt),
      totalPurchases: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };

    await db.customers.add(newCust);
    toast(`تمت إضافة العميل (${newCust.name}) بنجاح!`, 'success');
    setShowAddCustomerModal(false);
  };

  // Submit Receipt Voucher (سند قبض لسداد دين)
  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || voucherAmount <= 0) return;

    const amt = Number(voucherAmount);
    const voucherNum = `RV-${Date.now().toString().slice(-6)}`;

    const newVoucher: ReceiptVoucher = {
      id: `rv-${Date.now()}`,
      voucherNumber: voucherNum,
      date: new Date().toISOString().split('T')[0],
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      amount: amt,
      paymentType: voucherPaymentType,
      notes: voucherNotes.trim(),
      recordedBy: userName,
      createdAt: new Date().toISOString(),
    };

    await db.receiptVouchers.add(newVoucher);

    // Record automated double-entry journal entry for debt collection
    try {
      await recordReceiptVoucherJournalEntry(newVoucher);
    } catch (accErr) {
      console.warn('Accounting voucher entry error:', accErr);
    }

    // Deduct from customer debt
    const updatedDebt = Math.max(0, selectedCustomer.currentDebt - amt);
    await db.customers.update(selectedCustomer.id, {
      currentDebt: updatedDebt,
    });

    toast(
      `تم إصدار سند القبض بمبلغ ${amt} ${farmSettings.currency} وخصمها من ديون العميل!`,
      'success'
    );
    setShowVoucherModal(false);
    setSelectedCustomer((prev) => (prev ? { ...prev, currentDebt: updatedDebt } : null));
  };

  // Invoices for selected customer
  const customerInvoices = invoices?.filter((inv) => inv.customerId === selectedCustomer?.id) || [];
  const customerVouchers = vouchers?.filter((v) => v.customerId === selectedCustomer?.id) || [];

  const filteredCustomers = customers?.filter((c) => {
    if (searchQuery.trim() && !c.name.includes(searchQuery.trim()) && !c.phone.includes(searchQuery.trim())) {
      return false;
    }
    return true;
  });

  const totalOutstandingDebt = customers?.reduce((acc, c) => acc + c.currentDebt, 0) || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              العملاء وكشوف الحسابات والديون (Customers & Debt)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة عملاء الجملة والتجزئة، تتبع المبيعات الآجلة، وسندات القبض لإطفاء الديون.
          </p>
        </div>

        <button
          onClick={() => {
            setCustName('');
            setCustPhone('');
            setCustAddress('');
            setCustInitialDebt(0);
            setShowAddCustomerModal(true);
          }}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      {/* Debt Summary Banner */}
      <div className="p-4 rounded-3xl bg-slate-900 text-white flex items-center justify-between gap-4 shadow-apple">
        <div>
          <div className="text-xs font-semibold text-slate-400">إجمالي الديون الآجلة في ذمة العملاء</div>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
            {totalOutstandingDebt.toLocaleString('ar-SA')} {farmSettings.currency}
          </div>
        </div>
        <div className="text-xs text-slate-400">
          عدد العملاء المسجلين: <b className="text-white font-mono">{customers?.length || 0} عميل</b>
        </div>
      </div>

      {/* Main Grid: Customer List (Left) + Detailed Ledger (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input pr-10 text-xs py-2"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredCustomers?.map((cust) => {
              const isSelected = selectedCustomer?.id === cust.id;

              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-300 shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-extrabold text-sm text-slate-900">{cust.name}</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cust.currentDebt > 0
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {cust.currentDebt > 0
                        ? `عليه: ${cust.currentDebt} ${farmSettings.currency}`
                        : 'خالص'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-mono">{cust.phone || 'بدون هاتف'}</span>
                    <span>
                      إجمالي السحبيات: <b className="font-mono">{cust.totalPurchases}</b>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Statement & Ledger (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl glass-panel p-6 border border-slate-200/80 space-y-5">
          {selectedCustomer ? (
            <>
              {/* Customer Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{selectedCustomer.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    {selectedCustomer.phone && (
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedCustomer.phone}
                      </span>
                    )}
                    {selectedCustomer.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {selectedCustomer.address}
                      </span>
                    )}
                  </div>
                </div>

                {/* Issue Receipt Voucher Button */}
                {selectedCustomer.currentDebt > 0 && (
                  <button
                    onClick={() => {
                      setVoucherAmount(selectedCustomer.currentDebt);
                      setVoucherNotes('');
                      setShowVoucherModal(true);
                    }}
                    className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>إصدار سند قبض (سداد دين)</span>
                  </button>
                )}
              </div>

              {/* Debt & Totals Stat */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 text-rose-950">
                  <div className="text-[11px] font-bold text-rose-800">الرصيد المتبقي (الديون الحالية)</div>
                  <div className="text-2xl font-black font-mono mt-0.5 text-rose-900">
                    {selectedCustomer.currentDebt} {farmSettings.currency}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800">
                  <div className="text-[11px] font-bold text-slate-500">إجمالي المشتريات التاريخية</div>
                  <div className="text-2xl font-black font-mono mt-0.5">
                    {selectedCustomer.totalPurchases} {farmSettings.currency}
                  </div>
                </div>
              </div>

              {/* Invoices History */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>سجل الفواتير السابقة</span>
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">رقم الفاتورة</th>
                        <th className="p-2.5">التاريخ</th>
                        <th className="p-2.5 text-center">الإجمالي</th>
                        <th className="p-2.5 text-center">المدفوع</th>
                        <th className="p-2.5 text-center">المتبقي</th>
                        <th className="p-2.5 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerInvoices.length > 0 ? (
                        customerInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono">
                              <div className="font-bold text-slate-800">{inv.invoiceNumber}</div>
                              {inv.manualInvoiceNumber && (
                                <div className="text-[10px] text-amber-800 font-sans font-bold flex items-center gap-1 mt-0.5">
                                  <FileSignature className="w-3 h-3 text-amber-600" />
                                  <span>يدوي: {inv.manualInvoiceNumber}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 font-mono">{inv.date}</td>
                            <td className="p-2.5 text-center font-mono font-bold">
                              {inv.totalAmount}
                            </td>
                            <td className="p-2.5 text-center font-mono text-emerald-700">
                              {inv.paidAmount}
                            </td>
                            <td className="p-2.5 text-center font-mono text-rose-700">
                              {inv.remainingAmount}
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  inv.remainingAmount === 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {inv.remainingAmount === 0 ? 'مسدد' : 'آجل'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            لا توجد فواتير مسجلة لهذا العميل
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Receipt Vouchers History */}
              {customerVouchers.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h4 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>سندات القبض المسددة</span>
                  </h4>

                  <div className="space-y-1.5">
                    {customerVouchers.map((v) => (
                      <div
                        key={v.id}
                        className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs font-mono"
                      >
                        <div>
                          <b className="text-emerald-900">{v.voucherNumber}</b> • {v.date} ({v.paymentType === 'cash' ? 'نقدي' : 'تحويل بنكي'})
                        </div>
                        <div className="font-black text-emerald-800">
                          +{v.amount} {farmSettings.currency}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">
              اختر عميلاً من القائمة لعرض كشف الحساب والديون والفواتير السابقة
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Add Customer */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">إضافة عميل جديد</h3>
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل أو المؤسسة</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="مثال: مطعم شواية السمان"
                  className="w-full glass-input"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف / الجوال</label>
                  <input
                    type="text"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full glass-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع العميل</label>
                  <select
                    value={custType}
                    onChange={(e) => setCustType(e.target.value as any)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="wholesale">جملة (مطاعم ومتاجر)</option>
                    <option value="retail">تجزئة (أفراد)</option>
                    <option value="distributor">موزع معتمد</option>
                    <option value="farm">مزرعة تفريخ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان أو الحي</label>
                <input
                  type="text"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="المدينة والشارع..."
                  className="w-full glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رصيد دين سابق افتتاح (إن وجد)</label>
                <input
                  type="number"
                  min="0"
                  value={custInitialDebt}
                  onChange={(e) => setCustInitialDebt(Number(e.target.value))}
                  className="w-full glass-input text-center font-mono font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  حفظ العميل
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Receipt Voucher (سند قبض) */}
      {showVoucherModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <Receipt className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  إصدار سند قبض لسداد مديونية
                </h3>
              </div>
              <button
                onClick={() => setShowVoucherModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              العميل: <b className="text-slate-900">{selectedCustomer.name}</b> (المديونية الحالية:{' '}
              <b className="text-rose-700 font-mono">{selectedCustomer.currentDebt} {farmSettings.currency}</b>)
            </p>

            <form onSubmit={handleSaveVoucher} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  المبلغ المحصل (سند القبض)
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedCustomer.currentDebt}
                  required
                  value={voucherAmount}
                  onChange={(e) => setVoucherAmount(Number(e.target.value))}
                  className="w-full glass-input text-center text-xl font-mono font-black text-emerald-800"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  طريقة السداد
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => setVoucherPaymentType('cash')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                      voucherPaymentType === 'cash'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    نقداً للصندوق
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherPaymentType('kuraimi')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                      voucherPaymentType === 'kuraimi'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    محفظة الكريمي
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherPaymentType('jeeb')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                      voucherPaymentType === 'jeeb'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    محفظة جيب
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherPaymentType('jawali')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all ${
                      voucherPaymentType === 'jawali'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    محفظة جوالي
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoucherPaymentType('bank')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all col-span-2 ${
                      voucherPaymentType === 'bank'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    إيداع / تحويل بنكي
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أو رقم الحوالة
                </label>
                <textarea
                  rows={2}
                  value={voucherNotes}
                  onChange={(e) => setVoucherNotes(e.target.value)}
                  placeholder="سداد دفعة أسبوعية..."
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  اعتماد سند القبض وإطفاء الدين
                </button>
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
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
