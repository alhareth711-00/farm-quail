import { db } from '../db';
import type {
  Account,
  JournalEntry,
  JournalEntryLine,
  OrderInvoice,
  ExpenseRecord,
  ReceiptVoucher,
  Customer,
  YearEndClosingRecord,
} from '../types';

/**
 * Custom Error for unbalanced journal entries
 */
export class AccountingBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountingBalanceError';
  }
}

/**
 * شجرة الحسابات القياسية المعتمدة للمزرعة
 * Standard Chart of Accounts for Quail Farm ERP
 */
export const DEFAULT_CHART_OF_ACCOUNTS: Omit<Account, 'currentBalance' | 'createdAt'>[] = [
  // ================= 1. الأصول (ASSETS) =================
  {
    id: 'acc-10101',
    code: '10101',
    name: 'الصندوق الرئيسي (كاش)',
    type: 'asset',
    subType: 'cash',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'النقدية المقبوضة والمصروفة من صندوق المزرعة الرئيسي',
  },
  {
    id: 'acc-10102',
    code: '10102',
    name: 'محفظة الكريمي (حاسب / إم فلوس)',
    type: 'asset',
    subType: 'bank_wallet',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'حساب محفظة بنك الكريمي للمبيعات والتحصيلات الإلكترونية',
  },
  {
    id: 'acc-10103',
    code: '10103',
    name: 'محفظة جيب (Jeeb)',
    type: 'asset',
    subType: 'bank_wallet',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'حساب محفظة جيب الرقمية',
  },
  {
    id: 'acc-10104',
    code: '10104',
    name: 'محفظة جوالي (Jawali)',
    type: 'asset',
    subType: 'bank_wallet',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'حساب محفظة جوالي الإلكترونية',
  },
  {
    id: 'acc-10105',
    code: '10105',
    name: 'الحساب البنكي الجاري',
    type: 'asset',
    subType: 'bank_wallet',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'الحساب البنكي الرسمي للمزرعة',
  },
  {
    id: 'acc-10201',
    code: '10201',
    name: 'العملاء والذمم المدينة (Accounts Receivable)',
    type: 'asset',
    subType: 'receivable',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'المبالغ المستحقة على العملاء مقابل مبيعات آجلة',
  },
  {
    id: 'acc-10301',
    code: '10301',
    name: 'مخزون بيض المائدة والتفريخ',
    type: 'asset',
    subType: 'inventory',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'قيمة مخزون أطباق بيض المائدة وبيض التفريخ المخصب',
  },
  {
    id: 'acc-10302',
    code: '10302',
    name: 'مخزون لحوم السمان والطيور الحية',
    type: 'asset',
    subType: 'inventory',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'قيمة مخزون سمان اللحم المجهز والمجمد والطيور الحية',
  },
  {
    id: 'acc-10303',
    code: '10303',
    name: 'مخزون الأعلاف والمستلزمات',
    type: 'asset',
    subType: 'inventory',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'رصيد أكياس الأعلاف والأدوية في المستودع',
  },

  // ================= 2. الخصوم والالتزامات (LIABILITIES) =================
  {
    id: 'acc-20101',
    code: '20101',
    name: 'الموردون والذمم الدائنة (Accounts Payable)',
    type: 'liability',
    subType: 'payable',
    normalBalance: 'credit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'المبالغ المستحقة لموردي الأعلاف والصيصان والأدوية',
  },
  {
    id: 'acc-20201',
    code: '20201',
    name: 'مستحقات رواتب وأجور الموظفين',
    type: 'liability',
    subType: 'payroll_payable',
    normalBalance: 'credit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'الرواتب والأجور المستحقة لعمال وموظفي المزرعة',
  },

  // ================= 3. حقوق الملكية (EQUITY) =================
  {
    id: 'acc-30101',
    code: '30101',
    name: 'رأس مال المزرعة',
    type: 'equity',
    subType: 'capital',
    normalBalance: 'credit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'رأس المال الأساسي المستثمر في تأسيس المزرعة',
  },
  {
    id: 'acc-30201',
    code: '30201',
    name: 'الأرباح المحتجزة / المدورة',
    type: 'equity',
    subType: 'retained_earnings',
    normalBalance: 'credit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'صافي الأرباح المتراكمة من الدورات السابقة',
  },

  // ================= 4. الإيرادات (REVENUES) =================
  {
    id: 'acc-40101',
    code: '40101',
    name: 'إيرادات مبيعات بيض المائدة',
    type: 'revenue',
    subType: 'sales',
    normalBalance: 'credit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'عائدات بيع أطباق بيض المائدة (أطباق 12، 18، 24، 30)',
  },
  {
    id: 'acc-40102',
    code: '40102',
    name: 'إيرادات مبيعات بيض التفريخ المخصب',
    type: 'revenue',
    subType: 'sales',
    normalBalance: 'credit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'عائدات بيع بيض سمان مخصب للحضانات والتفريخ',
  },
  {
    id: 'acc-40103',
    code: '40103',
    name: 'إيرادات مبيعات لحوم السمان والطيور الحية',
    type: 'revenue',
    subType: 'sales',
    normalBalance: 'credit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'عائدات بيع سمان اللحم والمذبوح والطيور الحية',
  },
  {
    id: 'acc-40104',
    code: '40104',
    name: 'إيرادات مبيعات عامة (المتجر ونقاط البيع)',
    type: 'revenue',
    subType: 'sales',
    normalBalance: 'credit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'حساب المبيعات الرئيسي المستخدم في فواتير نقاط البيع (POS)',
  },
  {
    id: 'acc-40201',
    code: '40201',
    name: 'إيرادات خدمات التوصيل والنقل',
    type: 'revenue',
    subType: 'services',
    normalBalance: 'credit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'رسوم وعائدات خدمة توصيل ونقل الطلبيات للعملاء',
  },

  // ================= 5. المصروفات (EXPENSES) =================
  {
    id: 'acc-50101',
    code: '50101',
    name: 'مصروفات شراء واستخدام الأعلاف',
    type: 'expense',
    subType: 'cogs',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'تكلفة وتغذية قطعان السمان (بادي، نامي، بياض إنتاجي)',
  },
  {
    id: 'acc-50102',
    code: '50102',
    name: 'مصروفات الأدوية واللقاحات البيطرية',
    type: 'expense',
    subType: 'cogs',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'تكاليف الفيتامينات، المضادات، والمطهرات البيطرية',
  },
  {
    id: 'acc-50103',
    code: '50103',
    name: 'مصروفات المحروقات وبترول التوصيل',
    type: 'expense',
    subType: 'opex',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'تكاليف بترول دراجات التوصيل أو وقود مولدات المزرعة',
  },
  {
    id: 'acc-50104',
    code: '50104',
    name: 'مصروفات رواتب وأجور العمال والموظفين',
    type: 'expense',
    subType: 'payroll',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'الرواتب والأجور الشهرية واليوميات المصروفة',
  },
  {
    id: 'acc-50105',
    code: '50105',
    name: 'مصروفات صيانة الأقفاص والمعدات',
    type: 'expense',
    subType: 'maintenance',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'صيانة البطاريات، الشفاطات، وخلايا التبريد والمولدات',
  },
  {
    id: 'acc-50106',
    code: '50106',
    name: 'مصروفات كهرباء ومياه وتشغيل',
    type: 'expense',
    subType: 'utilities',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'فواتير المياه، الكهرباء، والخدمات التشغيلية',
  },
  {
    id: 'acc-50107',
    code: '50107',
    name: 'مصروفات إدارية ونثريات عامة',
    type: 'expense',
    subType: 'general',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'المصروفات النثرية والقرطاسية والمصروفات المتنوعة',
  },
  {
    id: 'acc-50108',
    code: '50108',
    name: 'مصروفات نشارة الخشب ومستلزمات التعبئة والأطباق',
    type: 'expense',
    subType: 'packaging',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'تكاليف نشارة خشب العنابر، كراتين البيض، والأطباق البلاستيكية والورقية',
  },
  {
    id: 'acc-50201',
    code: '50201',
    name: 'الخصم المسموح به للعملاء (Sales Discount)',
    type: 'expense',
    subType: 'sales_discount',
    normalBalance: 'debit',
    currency: 'YER',
    isSystem: true,
    isActive: true,
    description: 'قيمة الخصومات الممنوحة للعملاء في فواتير المبيعات',
  },
];

/**
 * 1. تهيئة شجرة الحسابات الأساسية في قاعدة البيانات
 */
export async function initializeChartOfAccounts(forceRefresh = false): Promise<Account[]> {
  const existingCount = await db.accounts.count();

  if (existingCount === 0 || forceRefresh) {
    const nowIso = new Date().toISOString();
    const accountsToInsert: Account[] = DEFAULT_CHART_OF_ACCOUNTS.map((acc) => ({
      ...acc,
      currentBalance: 0,
      createdAt: nowIso,
    }));

    await db.accounts.bulkPut(accountsToInsert);
    return await db.accounts.toArray();
  }

  // Ensure system accounts are not missing
  for (const def of DEFAULT_CHART_OF_ACCOUNTS) {
    const existing = await db.accounts.get(def.id);
    if (!existing) {
      await db.accounts.put({
        ...def,
        currentBalance: 0,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return await db.accounts.toArray();
}

/**
 * 2. دالة تسجيل قيد يومية محاسبي مزدوج (مع فرض شرط التوازن الصارم)
 * Strict Double-Entry Bookkeeping Rule: Total Debit MUST equal Total Credit
 */
export async function createJournalEntry(entryInput: {
  date: string;
  time?: string;
  description: string;
  referenceType: JournalEntry['referenceType'];
  referenceId?: string;
  referenceNumber?: string;
  manualInvoiceNumber?: string;
  lines: Omit<JournalEntryLine, 'id'>[];
  createdBy?: string;
}): Promise<JournalEntry> {
  const lines = entryInput.lines;

  if (!lines || lines.length < 2) {
    throw new AccountingBalanceError(
      'القيد المحاسبي المزدوج يجب أن يتكون من طرفين على الأقل (طرف مدين وطرف دائن).'
    );
  }

  // Calculate Totals
  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

  // ⚠️ الشرط الإلزامي: منع حفظ أي قيد إذا لم يكن متوازناً (إجمالي المدين = إجمالي الدائن)
  const difference = Math.abs(totalDebit - totalCredit);
  if (difference > 0.01) {
    throw new AccountingBalanceError(
      `لا يمكن حفظ العملية: القيد المحاسبي غير متوازن! إجمالي المدين (${totalDebit.toLocaleString(
        'en-US'
      )}) لا يساوي إجمالي الدائن (${totalCredit.toLocaleString('en-US')}) - الفارق: ${difference.toFixed(
        2
      )} ر.ي.`
    );
  }

  const now = new Date();
  const entryId = `jv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const entryNumber = `JV-${now.getFullYear()}-${Date.now().toString().slice(-6)}`;

  const completeLines: JournalEntryLine[] = lines.map((l, idx) => ({
    ...l,
    id: `${entryId}-line-${idx + 1}`,
    debit: Number(l.debit) || 0,
    credit: Number(l.credit) || 0,
  }));

  const newEntry: JournalEntry = {
    id: entryId,
    entryNumber,
    date: entryInput.date || now.toISOString().split('T')[0],
    time: entryInput.time || now.toTimeString().slice(0, 5),
    description: entryInput.description.trim(),
    referenceType: entryInput.referenceType,
    referenceId: entryInput.referenceId,
    referenceNumber: entryInput.referenceNumber,
    manualInvoiceNumber: entryInput.manualInvoiceNumber,
    lines: completeLines,
    totalDebit,
    totalCredit,
    isBalanced: true,
    status: 'posted',
    createdBy: entryInput.createdBy || 'النظام المحاسبي الآلي',
    createdAt: now.toISOString(),
  };

  // Perform inside an atomic transaction: save entry & update account balances
  await db.transaction('rw', [db.accounts, db.journalEntries], async () => {
    // 1. Save journal entry
    await db.journalEntries.add(newEntry);

    // 2. Update each affected account's balance
    for (const line of completeLines) {
      const account = await db.accounts.get(line.accountId);
      if (account) {
        let balanceDelta = 0;
        if (account.normalBalance === 'debit') {
          // Normal balance is Debit: Debits increase it, Credits decrease it
          balanceDelta = line.debit - line.credit;
        } else {
          // Normal balance is Credit: Credits increase it, Debits decrease it
          balanceDelta = line.credit - line.debit;
        }

        const updatedBalance = (account.currentBalance || 0) + balanceDelta;
        await db.accounts.update(account.id, { currentBalance: updatedBalance });
      }
    }
  });

  return newEntry;
}

/**
 * 3. دالة تسجيل قيد مبيعات آلي متوازن عند أي عملية بيع
 * Automated Sales Journal Entry Function
 *
 * القواعد المحاسبية الصارمة:
 * - البيع نقداً:
 *     من حـ/ الصندوق الرئيسي (10101)  [مدين]
 *     إلى حـ/ إيرادات المبيعات (40104) [دائن]
 *
 * - البيع آجل (دين عميل):
 *     من حـ/ العملاء والذمم المدينة (10201) [مدين]
 *     إلى حـ/ إيرادات المبيعات (40104)      [دائن]
 *
 * - الدفع عبر المحافظ الإلكترونية (الكريمي، جيب، جوالي):
 *     من حـ/ محفظة الدفع المختارة [مدين]
 *     إلى حـ/ إيرادات المبيعات    [دائن]
 *
 * - الدفع الجزئي:
 *     من حـ/ الصندوق (المبلغ المدفوع)     [مدين]
 *     من حـ/ العملاء (المتبقي كدين آجل)   [مدين]
 *     إلى حـ/ إيرادات المبيعات            [دائن]
 *
 * - في حال وجود خصم مسموح به (Discount) أو رسوم توصيل (Delivery Fee):
 *     من حـ/ الخصم المسموح به (50201)    [مدين]
 *     إلى حـ/ إيرادات التوصيل (40201)     [دائن]
 *
 * معادلة التوازن المحاسبي:
 * (المدفوع + المتبقي + الخصم) = (المجموع الفرعي + رسوم التوصيل)
 * إجمالي المدين = إجمالي الدائن 100%
 */
export async function recordSaleJournalEntry(invoice: OrderInvoice): Promise<JournalEntry> {
  // Ensure chart of accounts is seeded
  await initializeChartOfAccounts();

  const lines: Omit<JournalEntryLine, 'id'>[] = [];
  const totalAmount = Number(invoice.totalAmount) || 0;
  const paidAmount = Number(invoice.paidAmount) || 0;
  const remainingAmount = Number(invoice.remainingAmount) || 0;
  const discount = Number(invoice.discount) || 0;
  const deliveryFee = Number(invoice.deliveryFee) || 0;
  const subtotal = Number(invoice.subtotal) || 0;

  // Determine Debit Account for Payment Method
  let cashAccountId = 'acc-10101'; // Default: Cash Box
  let cashAccountCode = '10101';
  let cashAccountName = 'الصندوق الرئيسي (كاش)';

  if (invoice.paymentMethod === 'kuraimi') {
    cashAccountId = 'acc-10102';
    cashAccountCode = '10102';
    cashAccountName = 'محفظة الكريمي (حاسب / إم فلوس)';
  } else if (invoice.paymentMethod === 'jeeb') {
    cashAccountId = 'acc-10103';
    cashAccountCode = '10103';
    cashAccountName = 'محفظة جيب (Jeeb)';
  } else if (invoice.paymentMethod === 'jawali') {
    cashAccountId = 'acc-10104';
    cashAccountCode = '10104';
    cashAccountName = 'محفظة جوالي (Jawali)';
  }

  // --- 1. الطرف المدين (DEBIT SIDE) ---

  // أ. إذا تم دفع مبلغ نقدي أو عبر محفظة
  if (paidAmount > 0) {
    lines.push({
      accountId: cashAccountId,
      accountCode: cashAccountCode,
      accountName: cashAccountName,
      debit: paidAmount,
      credit: 0,
      description: `قبض نقدي/إلكتروني - فاتورة مبيعات ${invoice.invoiceNumber}`,
      partyId: invoice.customerId,
      partyName: invoice.customerName,
    });
  }

  // ب. إذا كان هناك مبلغ آجل (دين على العميل)
  if (remainingAmount > 0) {
    lines.push({
      accountId: 'acc-10201',
      accountCode: '10201',
      accountName: 'العملاء والذمم المدينة (Accounts Receivable)',
      debit: remainingAmount,
      credit: 0,
      description: `ذمة آجلة على العميل (${invoice.customerName}) - فاتورة ${invoice.invoiceNumber}${
        invoice.manualInvoiceNumber ? ` [فاتورة يدوية: ${invoice.manualInvoiceNumber}]` : ''
      }`,
      partyId: invoice.customerId,
      partyName: invoice.customerName,
    });
  }

  // ج. إذا كان هناك خصم ممنوح للعميل
  if (discount > 0) {
    lines.push({
      accountId: 'acc-50201',
      accountCode: '50201',
      accountName: 'الخصم المسموح به للعملاء (Sales Discount)',
      debit: discount,
      credit: 0,
      description: `خصم تجاري ممنوح للعميل (${invoice.customerName}) - فاتورة ${invoice.invoiceNumber}`,
      partyId: invoice.customerId,
      partyName: invoice.customerName,
    });
  }

  // --- 2. الطرف الدائن (CREDIT SIDE) ---

  // أ. إيرادات المبيعات (قيمة البضاعة المباعة قبل رسوم التوصيل والخصم)
  const salesRevenueAmount = subtotal > 0 ? subtotal : totalAmount;
  lines.push({
    accountId: 'acc-40104',
    accountCode: '40104',
    accountName: 'إيرادات مبيعات عامة (المتجر ونقاط البيع)',
    debit: 0,
    credit: salesRevenueAmount,
    description: `إيراد مبيعات بضاعة - فاتورة ${invoice.invoiceNumber}`,
    partyId: invoice.customerId,
    partyName: invoice.customerName,
  });

  // ب. إيرادات خدمة التوصيل والنقل (إذا وجدت)
  if (deliveryFee > 0) {
    lines.push({
      accountId: 'acc-40201',
      accountCode: '40201',
      accountName: 'إيرادات خدمات التوصيل والنقل',
      debit: 0,
      credit: deliveryFee,
      description: `إيراد رسوم نقل وتوصيل - فاتورة ${invoice.invoiceNumber}`,
      partyId: invoice.customerId,
      partyName: invoice.customerName,
    });
  }

  const desc = `قيد مبيعات ${
    invoice.paymentMethod === 'credit'
      ? 'آجلة'
      : invoice.paymentMethod === 'partial'
      ? 'جزئية'
      : 'نقدية'
  } - فاتورة رقم ${invoice.invoiceNumber} للعميل: ${invoice.customerName}${
    invoice.manualInvoiceNumber ? ` (رقم الفاتورة اليدوية: ${invoice.manualInvoiceNumber})` : ''
  }`;

  return await createJournalEntry({
    date: invoice.date,
    time: invoice.time,
    description: desc,
    referenceType: 'sale_invoice',
    referenceId: invoice.id,
    referenceNumber: invoice.invoiceNumber,
    manualInvoiceNumber: invoice.manualInvoiceNumber,
    lines,
    createdBy: invoice.cashierName || 'نظام الكاشير الآلي POS',
  });
}

/**
 * 4. دالة تسجيل قيد مصروف آلي متوازن
 * Automated Expense Journal Entry Function
 */
export async function recordExpenseJournalEntry(expense: ExpenseRecord): Promise<JournalEntry> {
  await initializeChartOfAccounts();

  const amount = Number(expense.amount) || 0;
  if (amount <= 0) {
    throw new Error('مبلغ المصروف يجب أن يكون أكبر من الصفر.');
  }

  // Determine Expense Account based on category
  let expenseAccountId = 'acc-50107'; // Default general
  let expenseAccountCode = '50107';
  let expenseAccountName = 'مصروفات إدارية ونثريات عامة';

  switch (expense.category) {
    case 'feed_purchase':
      expenseAccountId = 'acc-50101';
      expenseAccountCode = '50101';
      expenseAccountName = 'مصروفات شراء واستخدام الأعلاف';
      break;
    case 'medication_supplies':
    case 'medications_vitamins':
      expenseAccountId = 'acc-50102';
      expenseAccountCode = '50102';
      expenseAccountName = 'مصروفات الأدوية واللقاحات البيطرية';
      break;
    case 'delivery_petrol':
      expenseAccountId = 'acc-50103';
      expenseAccountCode = '50103';
      expenseAccountName = 'مصروفات المحروقات وبترول التوصيل';
      break;
    case 'salaries_advances':
      expenseAccountId = 'acc-50104';
      expenseAccountCode = '50104';
      expenseAccountName = 'مصروفات رواتب وأجور وسلفيات العمال';
      break;
    case 'equipment_maintenance':
    case 'utilities_maintenance':
      expenseAccountId = 'acc-50105';
      expenseAccountCode = '50105';
      expenseAccountName = 'مصروفات صيانة الأقفاص والمعدات والعنابر';
      break;
    case 'electricity_water':
      expenseAccountId = 'acc-50106';
      expenseAccountCode = '50106';
      expenseAccountName = 'مصروفات كهرباء ومياه وتشغيل';
      break;
    case 'packaging_bedding':
      expenseAccountId = 'acc-50108';
      expenseAccountCode = '50108';
      expenseAccountName = 'مصروفات نشارة الخشب ومستلزمات التعبئة والأطباق';
      break;
  }

  // Payment source account (Credit)
  const paidFromAccountId =
    expense.paidFrom === 'bank_account' ? 'acc-10105' : 'acc-10101';
  const paidFromAccount = await db.accounts.get(paidFromAccountId);

  const lines: Omit<JournalEntryLine, 'id'>[] = [
    // الطرف المدين: المصروف
    {
      accountId: expenseAccountId,
      accountCode: expenseAccountCode,
      accountName: expenseAccountName,
      debit: amount,
      credit: 0,
      description: expense.description || 'صرف مصروف للمزرعة',
    },
    // الطرف الدائن: الصندوق أو البنك
    {
      accountId: paidFromAccountId,
      accountCode: paidFromAccount?.code || '10101',
      accountName: paidFromAccount?.name || 'الصندوق الرئيسي (كاش)',
      debit: 0,
      credit: amount,
      description: `دفع مصروف نقداً/بنك - سند ${expense.invoiceOrBillRef || expense.id}`,
    },
  ];

  return await createJournalEntry({
    date: expense.date,
    description: `قيد صرف مصروف: ${expenseAccountName} - ${expense.description || ''}`,
    referenceType: 'expense',
    referenceId: expense.id,
    referenceNumber: expense.invoiceOrBillRef,
    lines,
    createdBy: expense.recordedBy || 'محاسب المزرعة',
  });
}

/**
 * 5. دالة تسجيل قيد سند قبض وتحصيل دين من عميل
 * Automated Receipt Voucher Journal Entry (Customer Debt Collection)
 *
 * القيد:
 * من حـ/ الصندوق الرئيسي أو المحفظة البنكية [مدين]
 * إلى حـ/ العملاء والذمم المدينة            [دائن - تخفيض دين العميل]
 */
export async function recordReceiptVoucherJournalEntry(voucher: ReceiptVoucher): Promise<JournalEntry> {
  await initializeChartOfAccounts();

  const amount = Number(voucher.amount) || 0;
  if (amount <= 0) {
    throw new Error('مبلغ سند القبض يجب أن يكون أكبر من الصفر.');
  }

  // Determine target account based on voucher payment type
  let debitAccountId = 'acc-10101';
  let debitAccountCode = '10101';
  let debitAccountName = 'الصندوق الرئيسي (كاش)';

  if (voucher.paymentType === 'kuraimi') {
    debitAccountId = 'acc-10102';
    debitAccountCode = '10102';
    debitAccountName = 'محفظة الكريمي (حاسب / إم فلوس)';
  } else if (voucher.paymentType === 'jeeb') {
    debitAccountId = 'acc-10103';
    debitAccountCode = '10103';
    debitAccountName = 'محفظة جيب (Jeeb)';
  } else if (voucher.paymentType === 'jawali') {
    debitAccountId = 'acc-10104';
    debitAccountCode = '10104';
    debitAccountName = 'محفظة جوالي (Jawali)';
  } else if (voucher.paymentType === 'bank') {
    debitAccountId = 'acc-10105';
    debitAccountCode = '10105';
    debitAccountName = 'الحساب البنكي الجاري';
  }

  const lines: Omit<JournalEntryLine, 'id'>[] = [
    // الطرف المدين: الصندوق / المحفظة
    {
      accountId: debitAccountId,
      accountCode: debitAccountCode,
      accountName: debitAccountName,
      debit: amount,
      credit: 0,
      description: `قبض وتحصيل دفعة نقدية من العميل (${voucher.customerName}) - سند قبض ${voucher.voucherNumber}`,
      partyId: voucher.customerId,
      partyName: voucher.customerName,
    },
    // الطرف الدائن: حساب العميل (تخفيض الذمة المدينة)
    {
      accountId: 'acc-10201',
      accountCode: '10201',
      accountName: 'العملاء والذمم المدينة (Accounts Receivable)',
      debit: 0,
      credit: amount,
      description: `سداد وتخفيض مديونية العميل (${voucher.customerName}) - سند قبض ${voucher.voucherNumber}`,
      partyId: voucher.customerId,
      partyName: voucher.customerName,
    },
  ];

  return await createJournalEntry({
    date: voucher.date,
    description: `قيد سند قبض وتحصيل دين من العميل: ${voucher.customerName} - سند ${voucher.voucherNumber}`,
    referenceType: 'receipt_voucher',
    referenceId: voucher.id,
    referenceNumber: voucher.voucherNumber,
    lines,
    createdBy: voucher.recordedBy || 'محاسب المزرعة',
  });
}

/**
 * 6. ميزان المراجعة الحسابي (Trial Balance)
 * للتأكد من توازن كامل دفتر الأستاذ العام في النظام
 */
export async function getTrialBalance(): Promise<{
  accounts: {
    code: string;
    name: string;
    type: Account['type'];
    debitBalance: number;
    creditBalance: number;
  }[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  difference: number;
}> {
  await initializeChartOfAccounts();
  const allAccounts = await db.accounts.toArray();
  const sortedAccounts = allAccounts.sort((a, b) => a.code.localeCompare(b.code));

  let totalDebits = 0;
  let totalCredits = 0;

  const resultAccounts = sortedAccounts.map((acc) => {
    let debitBalance = 0;
    let creditBalance = 0;

    if (acc.normalBalance === 'debit') {
      if (acc.currentBalance >= 0) {
        debitBalance = acc.currentBalance;
      } else {
        creditBalance = Math.abs(acc.currentBalance);
      }
    } else {
      if (acc.currentBalance >= 0) {
        creditBalance = acc.currentBalance;
      } else {
        debitBalance = Math.abs(acc.currentBalance);
      }
    }

    totalDebits += debitBalance;
    totalCredits += creditBalance;

    return {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debitBalance,
      creditBalance,
    };
  });

  const difference = Math.abs(totalDebits - totalCredits);
  return {
    accounts: resultAccounts,
    totalDebits,
    totalCredits,
    isBalanced: difference < 0.01,
    difference,
  };
}

// =========================================================================
// 7. كشف الحساب (Ledger Statements: Accounts & Customers)
// =========================================================================

export interface LedgerTransaction {
  id: string;
  date: string;
  time?: string;
  referenceType: string;
  referenceNumber?: string;
  manualInvoiceNumber?: string;
  description: string;
  partyName?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface AccountLedgerReport {
  account: Account;
  startDate?: string;
  endDate?: string;
  openingBalance: number;
  transactions: LedgerTransaction[];
  totalDebit: number;
  totalCredit: number;
  netMovement: number;
  endingBalance: number;
}

/**
 * استخراج كشف حساب مالي تفصيلي لحساب من شجرة الحسابات (الصندوق، البنك، الذمم...)
 */
export async function getAccountLedger(
  accountIdOrCode: string,
  startDate?: string,
  endDate?: string
): Promise<AccountLedgerReport> {
  await initializeChartOfAccounts();

  // Find account
  const account = await db.accounts
    .filter((a) => a.id === accountIdOrCode || a.code === accountIdOrCode)
    .first();

  if (!account) {
    throw new Error(`الحساب المالي (${accountIdOrCode}) غير موجود في شجرة الحسابات.`);
  }

  // Fetch all journal entries ordered chronologically
  const entries = await db.journalEntries.orderBy('date').toArray();
  entries.sort((a, b) => {
    const timeA = `${a.date} ${a.time || '00:00'}`;
    const timeB = `${b.date} ${b.time || '00:00'}`;
    return timeA.localeCompare(timeB);
  });

  let openingBalance = 0;
  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  const transactions: LedgerTransaction[] = [];

  for (const entry of entries) {
    // Find matching line in this entry
    const matchedLine = entry.lines.find(
      (l) => l.accountId === account.id || l.accountCode === account.code
    );

    if (!matchedLine) continue;

    const debit = Number(matchedLine.debit) || 0;
    const credit = Number(matchedLine.credit) || 0;

    // In double-entry:
    // Debit accounts: debit adds, credit subtracts
    // Credit accounts: credit adds, debit subtracts
    const delta =
      account.normalBalance === 'debit' ? debit - credit : credit - debit;

    // Check if entry is before startDate
    if (startDate && entry.date < startDate) {
      openingBalance += delta;
      continue;
    }

    // Check if entry is after endDate
    if (endDate && entry.date > endDate) {
      continue;
    }

    // If starting calculation for the filtered period
    if (transactions.length === 0) {
      runningBalance = openingBalance;
    }

    runningBalance += delta;
    totalDebit += debit;
    totalCredit += credit;

    transactions.push({
      id: `${entry.id}-${matchedLine.id || Math.random()}`,
      date: entry.date,
      time: entry.time,
      referenceType: entry.referenceType,
      referenceNumber: entry.referenceNumber || entry.entryNumber,
      manualInvoiceNumber: entry.manualInvoiceNumber,
      description: matchedLine.description || entry.description,
      partyName: matchedLine.partyName,
      debit,
      credit,
      runningBalance,
    });
  }

  // If no transactions in period, runningBalance equals openingBalance
  if (transactions.length === 0) {
    runningBalance = openingBalance;
  }

  return {
    account,
    startDate,
    endDate,
    openingBalance,
    transactions,
    totalDebit,
    totalCredit,
    netMovement: account.normalBalance === 'debit' ? totalDebit - totalCredit : totalCredit - totalDebit,
    endingBalance: runningBalance,
  };
}

export interface CustomerLedgerReport {
  customer: Customer;
  startDate?: string;
  endDate?: string;
  openingBalance: number;
  transactions: LedgerTransaction[];
  totalDebit: number; // إجمالي الفواتير والمستحقات (تزيد الدين)
  totalCredit: number; // إجمالي المدفوعات وسندات القبض (تخفض الدين)
  netMovement: number;
  endingBalance: number; // الرصيد النهائي المستحق على العميل
}

/**
 * استخراج كشف حساب عميل معتمد يوضح المبيعات وسندات القبض والرصيد النهائي
 */
export async function getCustomerLedger(
  customerId: string,
  startDate?: string,
  endDate?: string
): Promise<CustomerLedgerReport> {
  const customer = await db.customers.get(customerId);
  if (!customer) {
    throw new Error('العميل المحدد غير موجود في قاعدة البيانات.');
  }

  // Invoices for this customer
  const customerInvoices = await db.invoices
    .where('customerId')
    .equals(customerId)
    .sortBy('date');

  // Receipt Vouchers for this customer
  const customerVouchers = await db.receiptVouchers
    .where('customerId')
    .equals(customerId)
    .sortBy('date');

  // Combine into unified chronological ledger items
  type RawCustomerMovement = {
    date: string;
    time?: string;
    type: 'invoice' | 'voucher';
    refNum: string;
    manualRef?: string;
    description: string;
    debit: number; // charges to customer (invoices)
    credit: number; // payments by customer (vouchers / cash at POS)
  };

  const rawMovements: RawCustomerMovement[] = [];

  // 1. Process invoices
  for (const inv of customerInvoices) {
    const total = Number(inv.totalAmount) || 0;
    const paid = Number(inv.paidAmount) || 0;

    // If customer paid part or all at checkout, record total as debit and cash paid as immediate credit
    rawMovements.push({
      date: inv.date,
      time: inv.time,
      type: 'invoice',
      refNum: inv.invoiceNumber,
      manualRef: inv.manualInvoiceNumber,
      description: `فاتورة مبيعات (${inv.items.map((i) => i.productName).join('، ')})`,
      debit: total,
      credit: paid,
    });
  }

  // 2. Process receipt vouchers (subsequent debt payments)
  for (const v of customerVouchers) {
    rawMovements.push({
      date: v.date,
      time: '12:00',
      type: 'voucher',
      refNum: v.voucherNumber,
      description: `سند قبض نقدي / محفظة: ${v.notes || 'سداد دفعة من الحساب الآجل'}`,
      debit: 0,
      credit: Number(v.amount) || 0,
    });
  }

  // Sort movements chronologically
  rawMovements.sort((a, b) => {
    const timeA = `${a.date} ${a.time || '00:00'}`;
    const timeB = `${b.date} ${b.time || '00:00'}`;
    return timeA.localeCompare(timeB);
  });

  let openingBalance = 0;
  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  const transactions: LedgerTransaction[] = [];

  for (const mov of rawMovements) {
    const delta = mov.debit - mov.credit;

    if (startDate && mov.date < startDate) {
      openingBalance += delta;
      continue;
    }

    if (endDate && mov.date > endDate) {
      continue;
    }

    if (transactions.length === 0) {
      runningBalance = openingBalance;
    }

    runningBalance += delta;
    totalDebit += mov.debit;
    totalCredit += mov.credit;

    transactions.push({
      id: `${mov.type}-${mov.refNum}`,
      date: mov.date,
      time: mov.time,
      referenceType: mov.type === 'invoice' ? 'فاتورة مبيعات' : 'سند قبض',
      referenceNumber: mov.refNum,
      manualInvoiceNumber: mov.manualRef,
      description: mov.description,
      partyName: customer.name,
      debit: mov.debit,
      credit: mov.credit,
      runningBalance,
    });
  }

  if (transactions.length === 0) {
    runningBalance = openingBalance;
  }

  return {
    customer,
    startDate,
    endDate,
    openingBalance,
    transactions,
    totalDebit,
    totalCredit,
    netMovement: totalDebit - totalCredit,
    endingBalance: runningBalance,
  };
}

// =========================================================================
// 8. قائمة الدخل (Income Statement / P&L)
// =========================================================================

export interface IncomeStatementLine {
  code: string;
  name: string;
  amount: number;
}

export interface IncomeStatementReport {
  startDate: string;
  endDate: string;
  periodLabel: string;
  revenues: IncomeStatementLine[];
  totalRevenues: number;
  salesDiscounts: number;
  netRevenues: number;
  cogsItems: IncomeStatementLine[];
  totalCogs: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: IncomeStatementLine[];
  totalOperatingExpenses: number;
  netIncome: number;
  netMarginPct: number;
}

/**
 * حساب وتوليد قائمة الدخل لحساب صافي الربح خلال فترة يحددها المستخدم
 */
export async function getIncomeStatementReport(
  startDate: string,
  endDate: string
): Promise<IncomeStatementReport> {
  // Fetch invoices in date range
  const periodInvoices = await db.invoices
    .filter((inv) => inv.date >= startDate && inv.date <= endDate)
    .toArray();

  // Fetch expenses in date range
  const periodExpenses = await db.expenses
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .toArray();

  // 1. Revenues Breakdown
  let eggSales = 0;
  let meatSales = 0;
  let generalSales = 0;
  let deliveryRevenues = 0;
  let salesDiscounts = 0;
  let calculatedCogs = 0;

  for (const inv of periodInvoices) {
    deliveryRevenues += Number(inv.deliveryFee) || 0;
    salesDiscounts += Number(inv.discount) || 0;
    calculatedCogs += Number(inv.totalCost) || 0;

    for (const item of inv.items) {
      const itemTotal = Number(item.total) || 0;
      const lowerName = item.productName.toLowerCase();
      if (lowerName.includes('بيض') || lowerName.includes('طبق')) {
        eggSales += itemTotal;
      } else if (lowerName.includes('سمان') || lowerName.includes('لحم') || lowerName.includes('حي') || lowerName.includes('مذبوح')) {
        meatSales += itemTotal;
      } else {
        generalSales += itemTotal;
      }
    }
  }

  const revenues: IncomeStatementLine[] = [
    { code: '40101', name: 'إيرادات مبيعات بيض المائدة والمخصب', amount: eggSales },
    { code: '40103', name: 'إيرادات مبيعات سمان اللحم والطيور الحية', amount: meatSales },
  ];
  if (generalSales > 0) {
    revenues.push({ code: '40104', name: 'إيرادات مبيعات المتجر ونقاط البيع', amount: generalSales });
  }
  if (deliveryRevenues > 0) {
    revenues.push({ code: '40201', name: 'إيرادات خدمات التوصيل والنقل', amount: deliveryRevenues });
  }

  const grossRevenues = eggSales + meatSales + generalSales + deliveryRevenues;
  const netRevenues = Math.max(0, grossRevenues - salesDiscounts);

  // 2. Cost of Goods Sold (COGS)
  const cogsItems: IncomeStatementLine[] = [];
  if (calculatedCogs > 0) {
    cogsItems.push({
      code: '50000',
      name: 'تكلفة البضاعة المباعة التقديرية (COGS)',
      amount: calculatedCogs,
    });
  }

  const totalCogs = calculatedCogs;
  const grossProfit = netRevenues - totalCogs;
  const grossMarginPct = netRevenues > 0 ? Math.round((grossProfit / netRevenues) * 100) : 0;

  // 3. Operating Expenses Breakdown
  const expensesByCategory: Record<string, number> = {};
  for (const exp of periodExpenses) {
    const cat = exp.category || 'other';
    expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (Number(exp.amount) || 0);
  }

  const categoryNames: Record<string, { code: string; name: string }> = {
    feed_purchase: { code: '50101', name: 'مصروفات شراء واستخدام الأعلاف' },
    medications_vitamins: { code: '50102', name: 'مصروفات الأدوية واللقاحات البيطرية' },
    delivery_petrol: { code: '50103', name: 'مصروفات المحروقات وبترول التوصيل' },
    salaries_advances: { code: '50104', name: 'مصروفات رواتب وأجور وسلفيات العمال' },
    utilities_maintenance: { code: '50105', name: 'مصروفات صيانة العنابر والأقفاص والمعدات' },
    electricity_water: { code: '50106', name: 'مصروفات كهرباء ومياه وتشغيل' },
    packaging_bedding: { code: '50108', name: 'مصروفات نشارة الخشب والأطباق وكراتين التعبئة' },
    other: { code: '50107', name: 'مصروفات إدارية ونثريات عامة' },
  };

  const operatingExpenses: IncomeStatementLine[] = Object.entries(expensesByCategory).map(
    ([catKey, amt]) => {
      const meta = categoryNames[catKey] || { code: '50107', name: catKey };
      return {
        code: meta.code,
        name: meta.name,
        amount: amt,
      };
    }
  );

  const totalOperatingExpenses = operatingExpenses.reduce((sum, item) => sum + item.amount, 0);
  const netIncome = grossProfit - totalOperatingExpenses;
  const netMarginPct = netRevenues > 0 ? Math.round((netIncome / netRevenues) * 100) : 0;

  return {
    startDate,
    endDate,
    periodLabel: `من ${startDate} إلى ${endDate}`,
    revenues,
    totalRevenues: grossRevenues,
    salesDiscounts,
    netRevenues,
    cogsItems,
    totalCogs,
    grossProfit,
    grossMarginPct,
    operatingExpenses,
    totalOperatingExpenses,
    netIncome,
    netMarginPct,
  };
}

// =========================================================================
// 9. دورة الإقفال السنوي المحاسبية (Year-End Closing)
// =========================================================================

/**
 * تنفيذ عملية الإقفال السنوي وإقفال حسابات الإيرادات والمصروفات
 * وترحيل صافي الربح / الخسارة إلى حساب "الأرباح المحتجزة / المدورة" (30201)
 */
export async function performYearEndClosing(options: {
  fiscalYear: number;
  closingDate: string;
  closedBy: string;
  notes?: string;
}): Promise<{
  closingEntry: JournalEntry;
  auditRecord: YearEndClosingRecord;
  netIncome: number;
}> {
  const { fiscalYear, closingDate, closedBy, notes } = options;

  await initializeChartOfAccounts();

  // 1. Verify if year is already closed
  const existingClosingsSetting = await db.settings.get('fiscal_year_closings');
  const closingsList: YearEndClosingRecord[] = existingClosingsSetting?.value || [];

  const alreadyClosed = closingsList.some((c) => c.fiscalYear === fiscalYear);
  if (alreadyClosed) {
    throw new Error(`السنة المالية (${fiscalYear}) تم إقفالها مسبقاً ولا يمكن تكرار إقفال نفس السنة!`);
  }

  // 2. Fetch all accounts
  const allAccounts = await db.accounts.toArray();

  // Filter revenue & expense accounts that have active balances
  const revenueAccounts = allAccounts.filter(
    (a) => a.type === 'revenue' && Math.abs(a.currentBalance) > 0.001
  );
  const expenseAccounts = allAccounts.filter(
    (a) => a.type === 'expense' && Math.abs(a.currentBalance) > 0.001
  );

  if (revenueAccounts.length === 0 && expenseAccounts.length === 0) {
    throw new Error('لا توجد أرصدة إيرادات أو مصروفات حالية لإقفالها. كافة الحسابات الاسمية مصفّرة بالفعل.');
  }

  // Find Retained Earnings Account
  const retainedAccount = allAccounts.find((a) => a.code === '30201' || a.id === 'acc-30201');
  if (!retainedAccount) {
    throw new Error('حساب الأرباح المحتجزة (30201) غير موجود في شجرة الحسابات.');
  }

  const retainedEarningsBefore = retainedAccount.currentBalance;

  // 3. Compute totals
  let totalRevenues = 0;
  let totalExpenses = 0;

  const lines: Omit<JournalEntryLine, 'id'>[] = [];

  // Close Revenue Accounts:
  // Revenue accounts have credit balances -> Debit them to bring to zero
  for (const rev of revenueAccounts) {
    const bal = Math.abs(rev.currentBalance);
    totalRevenues += bal;
    lines.push({
      accountId: rev.id,
      accountCode: rev.code,
      accountName: rev.name,
      debit: bal,
      credit: 0,
      description: `إقفال حساب ${rev.name} وتصفيره للسنة المالية ${fiscalYear}`,
    });
  }

  // Close Expense Accounts:
  // Expense accounts have debit balances -> Credit them to bring to zero
  for (const exp of expenseAccounts) {
    const bal = Math.abs(exp.currentBalance);
    totalExpenses += bal;
    lines.push({
      accountId: exp.id,
      accountCode: exp.code,
      accountName: exp.name,
      debit: 0,
      credit: bal,
      description: `إقفال حساب ${exp.name} وتصفيره للسنة المالية ${fiscalYear}`,
    });
  }

  // Net Income = Revenues - Expenses
  const netIncome = totalRevenues - totalExpenses;

  // Transfer to Retained Earnings (Equity):
  if (netIncome > 0) {
    // Net Profit -> Credit Retained Earnings (increases equity)
    lines.push({
      accountId: retainedAccount.id,
      accountCode: retainedAccount.code,
      accountName: retainedAccount.name,
      debit: 0,
      credit: netIncome,
      description: `ترحيل صافي أرباح السنة المالية ${fiscalYear} إلى الأرباح المحتجزة`,
    });
  } else if (netIncome < 0) {
    // Net Loss -> Debit Retained Earnings (decreases equity)
    const lossAmount = Math.abs(netIncome);
    lines.push({
      accountId: retainedAccount.id,
      accountCode: retainedAccount.code,
      accountName: retainedAccount.name,
      debit: lossAmount,
      credit: 0,
      description: `ترحيل صافي خسائر السنة المالية ${fiscalYear} وتخفيض الأرباح المحتجزة`,
    });
  }

  // 4. Create and post closing journal entry (Strictly balanced double-entry)
  const closingEntry = await createJournalEntry({
    date: closingDate,
    description: `قيد الإقفال السنوي الشامل للسنة المالية ${fiscalYear} وترحيل صافي ${
      netIncome >= 0 ? 'الأرباح' : 'الخسائر'
    } إلى الأرباح المحتجزة`,
    referenceType: 'year_end_closing',
    referenceNumber: `CLOSE-${fiscalYear}`,
    lines,
    createdBy: closedBy || 'المدير المالي',
  });

  const retainedEarningsAfter = retainedEarningsBefore + netIncome;

  // 5. Save audit record in settings
  const auditRecord: YearEndClosingRecord = {
    id: `close-${fiscalYear}-${Date.now()}`,
    fiscalYear,
    closingDate,
    closedAt: new Date().toISOString(),
    closedBy: closedBy || 'المدير المالي',
    totalRevenues,
    totalExpenses,
    netIncome,
    retainedEarningsBefore,
    retainedEarningsAfter,
    closingJournalEntryId: closingEntry.id,
    closingJournalEntryNumber: closingEntry.entryNumber,
    notes: notes || undefined,
  };

  closingsList.push(auditRecord);
  await db.settings.put({
    key: 'fiscal_year_closings',
    value: closingsList,
  });

  return {
    closingEntry,
    auditRecord,
    netIncome,
  };
}

/**
 * جلب سجل وسجل عمليات الإقفال السنوي السابقة
 */
export async function getYearEndClosingHistory(): Promise<YearEndClosingRecord[]> {
  const setting = await db.settings.get('fiscal_year_closings');
  return setting?.value || [];
}

