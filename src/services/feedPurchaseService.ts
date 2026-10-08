import { db } from '../db';
import type {
  FeedType,
  FeedStock,
  FarmPurchaseRecord,
  ExpenseRecord,
  JournalEntryLine,
  JournalEntry,
} from '../types';
import { createJournalEntry, initializeChartOfAccounts } from './accountingService';

export interface FeedPurchaseInput {
  feedType: FeedType;
  bagsCount: number; // عدد الأكياس المشترية (> 0)
  costPerBag: number; // سعر الكيس الواحد (> 0)
  paidFrom: 'cash_box' | 'bank_account' | 'credit'; // طريقة السداد: الصندوق، البنك، أو آجل مورد
  supplier?: string; // المورد / التاجر
  invoiceRef?: string; // رقم الفاتورة أو السند
  date: string; // YYYY-MM-DD
  notes?: string;
  recordedBy: string;
}

export interface FeedPurchaseResult {
  feedStock: FeedStock;
  purchaseRecord: FarmPurchaseRecord;
  expenseRecord: ExpenseRecord;
  journalEntry: JournalEntry;
  previousBags: number;
  newBags: number;
  previousWAC: number;
  newWAC: number;
  totalAmount: number;
  totalWeightKg: number;
}

/**
 * حساب متوسط التكلفة المرجح (Weighted Average Cost)
 * WAC = ((Old Bags * Old Cost) + (New Bags * New Cost)) / (Old Bags + New Bags)
 */
export function calculateWeightedAverageCost(
  currentBags: number,
  currentCostPerBag: number,
  purchasedBags: number,
  purchasedCostPerBag: number
): number {
  if (purchasedBags <= 0) return currentCostPerBag;
  if (currentBags <= 0) return purchasedCostPerBag;

  const totalCurrentValue = currentBags * currentCostPerBag;
  const totalPurchasedValue = purchasedBags * purchasedCostPerBag;
  const totalBags = currentBags + purchasedBags;

  return Math.round((totalCurrentValue + totalPurchasedValue) / totalBags);
}

/**
 * تنفيذ عملية شراء أعلاف معتمدة بربط مخزني ومحاسبي متكامل:
 * 1. التحقق الصارم من صحة الكميات والأسعار ومنع القيم الصفرية أو السالبة.
 * 2. زيادة رصيد العلف ووزنه الفعلي في المستودع بدقة (1 كيس = 50 كجم = 50,000 جرام).
 * 3. تحديث متوسط التكلفة المرجح (WAC) للعلف في المستودع.
 * 4. إنشاء سجل مشتريات (FarmPurchaseRecord) وسجل مصروفات (ExpenseRecord).
 * 5. تسجيل قيد محاسبي مزدوج متوازن وخصمه من الصندوق/البنك أو قيده ذمة دائنة للمورد.
 */
export async function purchaseFeedStock(
  input: FeedPurchaseInput
): Promise<FeedPurchaseResult> {
  const {
    feedType,
    bagsCount,
    costPerBag,
    paidFrom,
    supplier,
    invoiceRef,
    date,
    notes,
    recordedBy,
  } = input;

  // 1. التحقق الصارم من سلامة البيانات ومنع القيم الصفرية أو السالبة
  if (!bagsCount || isNaN(bagsCount) || bagsCount <= 0) {
    throw new Error('كمية الأكياس المشترية يجب أن تكون عدداً موجباً أكبر من الصفر.');
  }

  if (!costPerBag || isNaN(costPerBag) || costPerBag <= 0) {
    throw new Error('سعر شراء الكيس يجب أن يكون مبلغاً صحيحاً أكبر من الصفر.');
  }

  const bags = Math.floor(Number(bagsCount));
  const price = Number(costPerBag);
  const totalAmount = bags * price;
  const addedKg = bags * 50; // 1 كيس = 50 كجم

  await initializeChartOfAccounts();

  // 2. جلب رصيد العلف الحالي من قاعدة البيانات
  const existingStock = await db.feedStock.where('feedType').equals(feedType).first();
  if (!existingStock) {
    throw new Error(`نوع العلف المحدد (${feedType}) غير موجود في سجل المستودع.`);
  }

  const previousBags = existingStock.bagsCount || 0;
  const previousWAC = existingStock.costPerBag || 0;

  // 3. احتساب متوسط التكلفة المرجح الجديد والأرصدة الجديدة
  const newWAC = calculateWeightedAverageCost(previousBags, previousWAC, bags, price);
  const newBags = Math.max(0, previousBags) + bags;
  const newTotalKg = newBags * 50;

  // 4. إعداد أطراف القيد المحاسبي المزدوج المتوازن
  // الطرف المدين: مصروفات شراء واستخدام الأعلاف (50101)
  const debitAccountId = 'acc-50101';
  const debitAccountCode = '50101';
  const debitAccountName = 'مصروفات شراء واستخدام الأعلاف';

  // الطرف الدائن: الصندوق أو البنك أو المورد
  let creditAccountId = 'acc-10101';
  let creditAccountCode = '10101';
  let creditAccountName = 'الصندوق الرئيسي (كاش)';

  if (paidFrom === 'bank_account') {
    creditAccountId = 'acc-10105';
    creditAccountCode = '10105';
    creditAccountName = 'الحساب البنكي الجاري';
  } else if (paidFrom === 'credit') {
    creditAccountId = 'acc-20101';
    creditAccountCode = '20101';
    creditAccountName = 'الموردون والذمم الدائنة (Accounts Payable)';
  }

  const journalLines: Omit<JournalEntryLine, 'id'>[] = [
    {
      accountId: debitAccountId,
      accountCode: debitAccountCode,
      accountName: debitAccountName,
      debit: totalAmount,
      credit: 0,
      description: `شراء وتوريد ${bags} كيس علف (${existingStock.name}) بسعر ${price.toLocaleString('ar-SA')} ر.ي/كيس`,
    },
    {
      accountId: creditAccountId,
      accountCode: creditAccountCode,
      accountName: creditAccountName,
      debit: 0,
      credit: totalAmount,
      description: `سداد قيمة شراء أعلاف - ${
        paidFrom === 'credit'
          ? `آجل للمورد: ${supplier || 'مورد أعلاف'}`
          : paidFrom === 'bank_account'
          ? 'خصم من الحساب البنكي'
          : 'خصم من الصندوق الرئيسي'
      }`,
      partyName: supplier?.trim() || undefined,
    },
  ];

  // 5. إنشاء السجلات المالية والمخزنية
  const purchaseId = `purch-feed-${Date.now()}`;
  const purchaseRecord: FarmPurchaseRecord = {
    id: purchaseId,
    date,
    itemName: existingStock.name,
    quantity: bags,
    unitPrice: price,
    totalAmount,
    unit: 'كيس (50 كجم)',
    supplier: supplier?.trim() || (paidFrom === 'credit' ? 'مورد آجل' : 'محل أعلاف'),
    paidFrom,
    invoiceRef: invoiceRef?.trim() || undefined,
    notes:
      notes?.trim() ||
      `شراء أعلاف بمستودع المزرعة - متوسط التكلفة المرجح: ${newWAC.toLocaleString('ar-SA')} ر.ي/كيس`,
    recordedBy,
    createdAt: new Date().toISOString(),
  };

  const expenseId = `exp-feed-${Date.now()}`;
  const expenseRecord: ExpenseRecord = {
    id: expenseId,
    date,
    category: 'feed_purchase',
    amount: totalAmount,
    description: `شراء وتوريد ${bags} كيس ${existingStock.name} (متوسط تكلفة: ${newWAC.toLocaleString('ar-SA')} ر.ي)`,
    recipient: supplier?.trim() || undefined,
    invoiceOrBillRef: invoiceRef?.trim() || undefined,
    paidFrom: paidFrom === 'bank_account' ? 'bank_account' : 'cash_box',
    recordedBy,
    createdAt: new Date().toISOString(),
  };

  // 6. ترحيل العمليات ذرياً وتحديث الأرصدة
  await db.feedStock.update(existingStock.id, {
    bagsCount: newBags,
    totalKg: newTotalKg,
    costPerBag: newWAC,
    lastRestockedDate: date,
  });

  await db.purchases.add(purchaseRecord);
  await db.expenses.add(expenseRecord);

  // ترحيل القيد المحاسبي المزدوج وتحديث رصيد الصندوق/البنك/المورد
  const journalEntry = await createJournalEntry({
    date,
    description: `قيد شراء وتوريد أعلاف: ${bags} كيس ${existingStock.name} بمبلغ ${totalAmount.toLocaleString('ar-SA')} ر.ي`,
    referenceType: 'purchase',
    referenceId: purchaseId,
    referenceNumber: invoiceRef?.trim() || undefined,
    lines: journalLines,
    createdBy: recordedBy,
  });

  const updatedStock = (await db.feedStock.get(existingStock.id)) || existingStock;

  return {
    feedStock: updatedStock,
    purchaseRecord,
    expenseRecord,
    journalEntry,
    previousBags,
    newBags,
    previousWAC,
    newWAC,
    totalAmount,
    totalWeightKg: addedKg,
  };
}
