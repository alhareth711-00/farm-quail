// ==========================================
// QUAIL FARM ERP & OPERATIONS MANAGEMENT SYSTEM
// Comprehensive TypeScript Data Types - Enterprise Specification
// ==========================================

export type UserRole = 'manager' | 'worker';

export interface UserSession {
  role: UserRole;
  name: string;
  pin: string;
}

// --- 1. Battery Cages & Tiers ---
export const STRICT_ARABIC_BATTERY_ORDER = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س'
] as const;

export type ArabicBatteryLetter = typeof STRICT_ARABIC_BATTERY_ORDER[number];

export interface BatteryTier {
  id: string;
  batteryId: string;
  tierNumber: 1 | 2 | 3 | 4; // Top to bottom (1 to 4)
  capacity: number; // Max 30 birds
  malesCount: number;
  femalesCount: number;
  
  // Bird Age & Production Lifecycle Tracking (متابعة عمر الطيور ودورة البياض)
  housingDate?: string; // YYYY-MM-DD تاريخ التسكين بالدور
  hatchDate?: string; // YYYY-MM-DD تاريخ الفقس الأصلي للقطيع إن عُرف
  initialAgeWeeks?: number; // عمر الطيور عند التسكين بالأسابيع (الافتراضي 6 أسابيع للبياض)
  targetLayingLifespanWeeks?: number; // العمر الإنتاجي المستهدف قبل التحويل للبيع لاحم (افتراضي 42 أسبوع)

  notes?: string;
  updatedAt: string;
}

export interface Battery {
  id: string;
  name: string; // e.g. "أ", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س"
  tiersCount: number; // 4
  createdAt: string;
  notes?: string;
}

export interface TierMortalityRecord {
  id: string;
  batteryId: string;
  tierId: string;
  date: string; // YYYY-MM-DD
  malesMortality: number;
  femalesMortality: number;
  cullingCount: number; // استبعاد
  reason?: string;
  recordedBy: string;
  createdAt: string;
}

// --- 2. Floor Rearing Rooms & Sections ---
export type RoomPurpose = 'layers' | 'fattening' | 'brooding' | 'quarantine' | 'annex';
export type RoomCategory = 'room' | 'quarantine' | 'annex';

export interface FloorRoom {
  id: string;
  name: string; // "غرفة 1" to "غرفة 7", "قسم المعزولات", "قسم الملحقات"
  category: RoomCategory;
  purpose: RoomPurpose; // أمهات بياض، تسمين لحم، تحضين كتاكيت، عزل طيور، ملحقات
  housingDate: string; // YYYY-MM-DD (تاريخ التسكين)

  // Bird Age & Production Lifecycle Tracking (متابعة عمر الطيور ودورة البياض/التسمين)
  hatchDate?: string; // YYYY-MM-DD تاريخ الفقس
  initialAgeWeeks?: number; // العمر عند التسكين (بالأسابيع للبياض أو الأيام للتسمين)
  targetLayingLifespanWeeks?: number; // العمر الإنتاجي المستهدف قبل البيع لاحم (افتراضي 42 أسبوع للبياض، أو 5 أسابيع للتسمين)

  malesCount: number;
  femalesCount: number;
  capacity: number;
  areaSquareMeters: number;
  status: 'active' | 'empty' | 'cleaning' | 'isolated';
  notes?: string;
  createdAt: string;
}

export interface RoomMortalityRecord {
  id: string;
  roomId: string;
  date: string;
  malesMortality: number;
  femalesMortality: number;
  cullingCount: number;
  reason?: string;
  recordedBy: string;
  createdAt: string;
}

// --- 3. Environmental & Equipment Tracking ---
export type EquipmentType = 
  | 'exhaust_fans' // الشفاطات / المراوح
  | 'cooling_pads' // خلايا ومضخات التبريد
  | 'heaters' // السخانات والدفايات
  | 'lighting' // الإضاءة والمؤقتات
  | 'water_pumps' // مضخات المياه
  | 'other'; // معدات أخرى

export type EquipmentRunStatus = 'running' | 'stopped' | 'maintenance';

export interface EquipmentLog {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  locationType: 'room' | 'battery' | 'quarantine' | 'annex';
  locationId: string;
  locationName: string; // e.g. "غرفة 2" or "عنبر البطاريات (أ-س)" or "قسم المعزولات"
  equipmentType: EquipmentType;
  equipmentCustomName?: string; // اسم المعدة عند اختيار أخرى
  status: EquipmentRunStatus; // تشغيل / إيقاف / صيانة
  operatingHours?: number; // وقت وساعات التشغيل
  temperatureCelsius?: number; // درجة الحرارة بالعنبر
  humidityPercent?: number; // نسبة الرطوبة
  notes?: string;
  operator: string; // القائم بالتشغيل
  createdAt: string;
}

// --- 4. Advanced Egg Production Log ---
export type CollectionSession = 'morning' | 'evening' | 'noon' | 'other';

export interface EggProductionLog {
  id: string;
  targetType: 'tier' | 'room' | 'quarantine';
  targetId: string;
  targetName: string; // e.g., "بطارية أ - الدور 1" or "غرفة 3"
  collectionDate: string; // YYYY-MM-DD (supports backdated entry)
  collectionTime: string; // HH:mm (exact hour & minute)
  session: CollectionSession; // صبوحي / مسائي / ظهيرة
  actualEggs: number; // إجمالي البيض المجموع الكلي
  brokenEggs: number; // إجمالي البيض المكسر / مشروخ (يخصم تلقائياً)
  marketableEggs: number; // إنتاج البيض الإجمالي الصافي = actualEggs - brokenEggs
  packagedTraysCount?: number; // عدد تقفيص الأطباق (الأطباق المغلفة والجاهزة اليوم)
  traySize?: number; // سعة الطبق الافتراضية للتقفيص (مثلاً 30 أو 24)
  liveFemalesCount: number; // عدد الإناث الحية وقت الجمع
  layingRatePercent: number; // معدل البياض = (actualEggs / liveFemalesCount) * 100
  
  // Normalized 24-Hour Yield fields
  elapsedHoursFromLastCollection: number; // الفارق الزمني بالساعات عن آخر جمعة
  normalized24hYield: number; // الإنتاج المعياري لـ 24 ساعة = (actualEggs / elapsedHours) * 24
  hasIntervalWarning: boolean; // تنبيه إذا كان الفارق يختلف عن 24 ساعة بأكثر من ساعتين
  warningReason?: string;

  recordedBy: string;
  systemRecordedAt: string; // ISO string audit trail of actual input time
  notes?: string;
}

// --- 4.1 Egg Warehouse & Inventory Batches (مخزن البيض ودفعات الإنتاج وتطبيق FIFO) ---
export interface EggBatchRecord {
  id: string;
  batchCode: string; // e.g. "EB-2026-10-05"
  productionDate: string; // YYYY-MM-DD (تاريخ إنتاج الدفعة)
  cagesCount: number; // الرصيد المتبقي الحالي من الأقفاص/الأطباق
  initialCagesCount: number; // الكمية الأصلية الموردة
  trayCapacity: number; // سعة القفص (18 بيضة افتراضياً)
  pricePerCage: number; // سعر بيع القفص (افتراضي 900 ريال)
  source: 'daily_production' | 'accumulated_loose' | 'manual_adjustment'; // مصدر التوريد
  status: 'available' | 'depleted'; // متاح / منتهي
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LooseEggsInventory {
  balance: number; // الرصيد التراكمي للبيض المفرد (أقل من 18)
  lastUpdated: string;
}


// --- 5. Hatchery & Incubation ---
export type IncubationStatus = 'incubating' | 'candled' | 'transferred' | 'hatched' | 'completed' | 'cancelled';

export interface IncubationBatch {
  id: string;
  batchNumber: string; // e.g. "INC-2026-001"
  incubatorName: string;
  eggCount: number; // عدد البيض المدخل
  startDate: string; // YYYY-MM-DD
  candlingDate: string; // Day 7-10 (default Day 8)
  transferDate: string; // Day 14 (نقل لسلات الفقاس)
  hatchDate: string; // Day 17 (يوم الفقس)
  
  candlingDone: boolean;
  fertileEggs: number; // البيض المخصب
  infertileEggs: number; // بيض غير مخصب (لايح/فاسد)
  
  hatchedDone: boolean;
  hatchedChicks: number; // الصوص الفاقس السليم (نخب أول)
  weakChicks: number; // صوص ضعيف / فرز ثاني
  deadInShell: number; // ميت داخل البيضة

  status: IncubationStatus;
  notes?: string;
  createdAt: string;
}

// --- 6. Fattening & Meat Production ---
export interface FatteningBatch {
  id: string;
  batchCode: string; // e.g. "FAT-2026-01"
  roomId: string;
  roomName: string;
  initialBirdCount: number;
  currentBirdCount: number;
  startDate: string;
  targetWeightGrams: number; // Target: 200 - 250 g at 35-42 days
  status: 'growing' | 'ready_for_slaughter' | 'slaughtered';
  notes?: string;
}

export interface FatteningWeightSample {
  id: string;
  batchId: string;
  weekNumber: number; // 1 to 6
  sampleDate: string;
  sampleCount: number; // عدد الطيور التي وزنت عينة
  avgWeightGrams: number; // متوسط الوزن بالجرام
  notes?: string;
}

export interface SlaughterRecord {
  id: string;
  batchId?: string;
  date: string;
  birdsCount: number; // عدد الطيور المحولة للمجزرة
  liveWeightKg: number; // وزن الطيور الحي (كغم)
  dressedWeightKg: number; // الوزن الصافي بعد الذبح والتنظيف (كغم)
  dressingPercentage: number; // نسبة التصافي = (dressedWeightKg / liveWeightKg) * 100
  pairsCount: number; // أجواز سمان مجهزة
  meatKgRemaining: number; // كغم لحم سمان مفرغ/مبرد
  meatType: 'fresh_pairs' | 'frozen_pairs' | 'meat_kg';
  addedToInventory: boolean;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

// --- 7. Health, Feed & Bio-Security ---
export type FeedType = 'starter_24_27' | 'grower_fattening' | 'layer_production';

export interface FeedStock {
  id: string;
  feedType: FeedType;
  name: string; // "بادي سمان 24-27%", "نامي وتسمين", "بياض إنتاجي"
  bagsCount: number; // أكياس متوفرة
  bagWeightKg: number; // 50 kg default
  totalKg: number;
  costPerBag: number;
  minThresholdBags: number; // تنبيه عند هبوط الرصيد
  lastRestockedDate: string;
}

export interface FeedConsumptionRecord {
  id: string;
  date: string;
  targetType: 'battery' | 'room' | 'quarantine';
  targetId: string;
  targetName: string;
  feedType: FeedType;
  bagsUsed: number;
  kgUsed: number;
  recordedBy: string;
  createdAt: string;
}

export type MedicationType = 'vitamin' | 'antibiotic' | 'vaccine' | 'supplement';

export interface MedicationSchedule {
  id: string;
  name: string; // "فيتامين AD3E للخصوبة", "هـ-سيلينيوم", "فيتامين C للإجهاد الحراري", "خل تفاح", "مضاد حيوي تنفسي"
  type: MedicationType;
  targetType: 'all' | 'battery' | 'room' | 'quarantine';
  targetId?: string;
  targetName: string;
  dosage: string; // e.g. "1 مل / لتر ماء"
  startDate: string;
  durationDays: number;
  endDate: string;
  
  // Bio-Security: Withdrawal Period (فترة التحريم وسحب الدواء)
  hasWithdrawal: boolean;
  withdrawalDays: number;
  withdrawalEndDate?: string; // date until which meat/eggs cannot be sold
  withdrawalActive: boolean;

  status: 'scheduled' | 'active' | 'completed';
  notes?: string;
  recordedBy: string;
}

// --- 8. Detailed Mortality Record ---
export interface DetailedMortalityRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  description: string; // البيان / السبب / الأعراض
  gender: 'male' | 'female' | 'mixed' | 'unidentified'; // ذكر / أنثى / مختلط
  locationType: 'battery' | 'room' | 'quarantine' | 'annex';
  batteryName?: string; // أ، ب، ج... حتى س
  tierNumber?: 1 | 2 | 3 | 4; // رقم الدور
  cageNumber?: string; // رقم القفص
  roomName?: string; // غرفة 1 إلى 7، قسم المعزولات، الملحقات
  exactLocationText: string; // البيان الدقيق للمكان
  quantity: number; // العدد
  disposalMethod: 'burial' | 'incineration' | 'quarantine_transfer' | 'other'; // الإجراء المتخذ
  recordedBy: string;
  createdAt: string;
}

// --- 9. POS, Products, Customers & Sales ---
export type ProductCategory = 
  | 'table_eggs' 
  | 'hatching_eggs' 
  | 'live_birds' 
  | 'meat' 
  | 'feed_supplies' 
  | 'service';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unit: string; // طبق, حبة, جوز, كغم, كيس, خدمة
  trayCapacity?: 12 | 18 | 24 | 30; // for table eggs (الافتراضي 18 بيضة)
  retailPrice: number; // سعر التجزئة
  wholesalePrice: number; // سعر الجملة
  costPrice?: number; // التكلفة التقديرية (لحساب هوامش الأرباح)
  stockQuantity: number;
  barcode?: string;
  imageUrl?: string; // صورة المنتج (URL أو Base64)
  isActive: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type: 'retail' | 'wholesale' | 'distributor' | 'farm';
  address?: string;
  currentDebt: number; // الرصيد المتبقي عليه
  totalPurchases: number;
  createdAt: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  costPrice?: number; // التكلفة التقديرية للقطعة في الفاتورة لحساب الأرباح
  total: number;
  productionDate?: string; // تاريخ إنتاج البيض المباع من الدفعات المتوفرة
  batchId?: string; // معرف الدفعة المصروفة
}

export type PaymentMethod = 
  | 'cash' // نقداً (كاش)
  | 'credit' // آجل (حساب عميل)
  | 'kuraimi' // محفظة الكريمي (حاسب / إم فلوس)
  | 'jeeb' // محفظة جيب (Jeeb)
  | 'jawali' // محفظة جوالي (Jawali)
  | 'partial'; // دفع جزئي

export interface OrderInvoice {
  id: string;
  invoiceNumber: string; // "INV-2026-0001"
  manualInvoiceNumber?: string; // رقم الفاتورة اليدوية / الدفترية الموقعة من العميل
  date: string;
  time: string;
  customerId?: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number; // الدين الجديد المضاف
  totalCost?: number; // إجمالي التكلفة التقديرية للفاتورة
  estimatedProfit?: number; // إجمالي هامش الربح المقدر (totalAmount - totalCost - deliveryFee)
  paymentMethod: PaymentMethod;
  notes?: string;
  cashierName: string;
  createdAt: string;
}

export type VoucherPaymentType = 'cash' | 'bank' | 'kuraimi' | 'jeeb' | 'jawali';

export interface ReceiptVoucher {
  id: string;
  voucherNumber: string; // "RV-2026-001"
  date: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentType: VoucherPaymentType;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

// --- 10. Expenses & Financial P&L ---
export type ExpenseCategory = 
  | 'delivery_petrol' // بترول التوصيل / المتر
  | 'feed_purchase' // شراء واستخدام أعلاف
  | 'salaries_advances' // سحبيات وسلف ورواتب العمال
  | 'medications_vitamins' // أدوية وفيتامينات
  | 'packaging_bedding' // نشارة وأطباق تعبئة
  | 'utilities_maintenance' // فواتير كهرباء ومياه وصيانة
  | 'other'
  | string;

export interface CustomExpenseCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  recipient?: string; // المستلم
  invoiceOrBillRef?: string;
  paidFrom: 'cash_box' | 'bank_account';
  recordedBy: string;
  createdAt: string;
}

// --- 10.1 Independent Farm Purchases Log (سجل المشتريات المستقل) ---
export interface FarmPurchaseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  itemName: string; // اسم البضاعة / الصنف
  quantity: number; // الكمية
  unitPrice: number; // السعر الإفرادي
  totalAmount: number; // الإجمالي = الكمية × السعر الإفرادي
  unit?: string; // الوحدة (كيس, حبة, كرتون, لتر, كغم, طن, متر)
  supplier?: string; // المورد / المحل
  paidFrom: 'cash_box' | 'bank_account' | 'credit'; // طريقة السداد
  invoiceRef?: string; // رقم الفاتورة أو الإيصال
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

// --- 11. Daily Cash Drawer & Shift Reconciliation ---
export interface DailyCashRegister {
  id: string;
  date: string; // YYYY-MM-DD
  shiftSupervisor: string; // المسؤول عن الوردية / اليوم
  openingBalance: number; // المتبقي في الصندوق من أمس (رصيد افتتاحي)
  cashSales: number; // مبيعات الكاش اليوم
  cashVouchers: number; // سندات القبض النقدية اليوم
  cashExpenses: number; // مصاريف الكاش اليوم
  expectedClosingBalance: number; // المتوقع = افتتاحي + مبيعات + سندات - مصاريف
  actualClosingBalance: number; // المتبقي في الصندوق نهاية اليوم (رصيد فعلي)
  difference: number; // الفارق = فعلي - متوقع (0 مطابق، موجب فائض، سالب عجز)
  status: 'balanced' | 'surplus' | 'deficit'; // مطابق / فائض / عجز
  
  // حركة المحافظ الإلكترونية اليمنية (الكريمي، جيب، جوالي)
  kuraimiSales?: number;
  jeebSales?: number;
  jawaliSales?: number;

  notes?: string;
  closedAt: string;
}

// --- 12. Farm Overview & Settings ---
export interface FarmSettings {
  farmName: string;
  ownerName: string;
  phone: string;
  address: string;
  currency: string; // e.g. "ريال يمني", "ريال", "$"
  defaultTrayPrice?: number; // سعر بيع طبق البيض الافتراضي (تجزئة)
  defaultWholesaleTrayPrice?: number; // سعر بيع طبق البيض الافتراضي (جملة)
  taxNumber?: string;
  receiptFooterMessage: string;
  managerPin: string;
  workerPin: string;
}

// --- 13. Employees, Attendance & Payroll Management (سحبيات ورواتب الموظفين) ---
export type AttendanceStatus = 'present_full' | 'absent_full' | 'half_day';

export interface Employee {
  id: string;
  name: string;
  role: string; // المسمى الوظيفي
  phone?: string;
  monthlySalary: number; // الراتب الشهري الأساسي
  dailyWage: number; // قيمة اليومية المستحقة
  hireDate: string; // YYYY-MM-DD
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
}

export interface EmployeeAttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  deductionAmount: number; // 0 for present_full, dailyWage for absent_full, dailyWage/2 for half_day
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface EmployeeAdvanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  amount: number; // مبلغ السحبية
  paidFrom: 'cash_box' | 'bank_account';
  reason?: string; // بيان وسبب السحبية
  receiptRef?: string; // رقم السند
  recordedBy: string;
  createdAt: string;
}

export interface SalaryPaymentRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  baseSalary: number;
  totalDeductions: number;
  totalAdvances: number;
  netPaidAmount: number;
  paymentDate: string;
  paidFrom: 'cash_box' | 'bank_account';
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

// --- 13. Core Accounting: Chart of Accounts & Double-Entry Bookkeeping ---
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type NormalBalance = 'debit' | 'credit';

export interface Account {
  id: string; // e.g. "acc-10101"
  code: string; // e.g. "10101"
  name: string; // e.g. "الصندوق الرئيسي (كاش)"
  type: AccountType;
  subType?: string; // e.g. "cash", "bank_wallet", "receivable", "payable", "sales", "cogs", "opex"
  normalBalance: NormalBalance;
  currentBalance: number;
  currency: string; // "YER"
  parentId?: string;
  isSystem: boolean; // cannot be deleted
  isActive: boolean;
  description?: string;
  createdAt: string;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number; // مدين
  credit: number; // دائن
  description?: string; // بيان السطر
  partyId?: string; // معرف العميل أو المورد إذا وجد
  partyName?: string;
}

export type JournalReferenceType = 
  | 'sale_invoice' 
  | 'receipt_voucher' 
  | 'expense' 
  | 'purchase' 
  | 'salary' 
  | 'manual_entry';

export interface JournalEntry {
  id: string;
  entryNumber: string; // e.g. "JV-2026-0001"
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  description: string;
  referenceType: JournalReferenceType;
  referenceId?: string;
  referenceNumber?: string;
  manualInvoiceNumber?: string; // رقم الفاتورة اليدوية إن وجد
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: 'posted' | 'draft' | 'cancelled';
  createdBy: string;
  createdAt: string;
}
