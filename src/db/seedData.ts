import { db } from './index';
import type {
  Battery,
  BatteryTier,
  FloorRoom,
  FeedStock,
  Product,
  Customer,
  FarmSettings,
  MedicationSchedule,
  IncubationBatch,
  EggProductionLog,
  ExpenseRecord,
  OrderInvoice,
  EquipmentLog,
  DailyCashRegister,
  DetailedMortalityRecord,
  ReceiptVoucher,
  Employee,
} from '../types';

import { STRICT_ARABIC_BATTERY_ORDER } from '../types';

export const defaultSettings: FarmSettings = {
  farmName: 'مزرعة سبأ لإنتاج وتفريخ السمان',
  ownerName: 'م. يحيى الشامي',
  phone: '771234567',
  address: 'الجمهورية اليمنية - صنعاء',
  currency: 'ريال يمني',
  defaultTrayPrice: 900,
  defaultWholesaleTrayPrice: 800,
  taxNumber: '10987654',
  receiptFooterMessage: 'شكراً لتعاملكم معنا - طيور وبيض سمان طازج يومياً 100%',
  managerPin: '1234',
  workerPin: '0000',
};

// 12 Battery Names in Strict Arabic Alphabetical Order (أ إلى س)
export const batteryAlphabetNames = [...STRICT_ARABIC_BATTERY_ORDER];

/**
 * Request persistent storage from the browser (Chromium / Edge / Firefox)
 * to guarantee that IndexedDB data is never evicted under storage pressure.
 */
export async function enablePersistentStorage(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.log('IndexedDB persistent storage granted:', granted);
        return granted;
      }
      return true;
    }
  } catch (e) {
    console.warn('Could not request persistent storage:', e);
  }
  return false;
}

export async function migrateMissingAgeFields() {
  try {
    const today = new Date();
    const daysAgo = (days: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    const allTiers = await db.tiers.toArray();
    for (const t of allTiers) {
      if (!t.housingDate) {
        const tierAgeWeeks = t.tierNumber === 1 ? 16 : t.tierNumber === 2 ? 22 : t.tierNumber === 3 ? 34 : 41;
        const daysHoused = Math.max(1, (tierAgeWeeks - 6) * 7);
        await db.tiers.update(t.id, {
          housingDate: daysAgo(daysHoused),
          initialAgeWeeks: 6,
          targetLayingLifespanWeeks: 42,
        });
      }
    }

    const allRooms = await db.rooms.toArray();
    for (const r of allRooms) {
      if (!r.targetLayingLifespanWeeks) {
        const isFattening = r.purpose === 'fattening';
        await db.rooms.update(r.id, {
          initialAgeWeeks: isFattening ? 0 : 6,
          targetLayingLifespanWeeks: isFattening ? 5 : 42,
        });
      }
    }
  } catch (err) {
    console.warn('Migration for missing age fields skipped:', err);
  }
}

export async function migrateEggWarehouseInventory() {
  try {
    const today = new Date();
    const daysAgo = (days: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
    };

    // 1. Ensure farm settings has defaultTrayPrice = 900
    const settingsRecord = await db.settings.get('farmSettings');
    if (settingsRecord?.value) {
      if (settingsRecord.value.defaultTrayPrice !== 900) {
        await db.settings.put({
          key: 'farmSettings',
          value: {
            ...settingsRecord.value,
            defaultTrayPrice: 900,
            defaultWholesaleTrayPrice: 800,
          },
        });
      }
    }

    // 2. Ensure prod-tray-18 retailPrice is 900
    const prod18 = await db.products.get('prod-tray-18');
    if (prod18 && prod18.retailPrice !== 900) {
      await db.products.update('prod-tray-18', {
        retailPrice: 900,
        wholesalePrice: 800,
      });
    }

    // 3. Ensure looseEggsBalance is initialized in settings
    const looseSetting = await db.settings.get('looseEggsBalance');
    if (!looseSetting) {
      await db.settings.put({
        key: 'looseEggsBalance',
        value: 11, // رصيد افتتاحي 11 بيضة مفردة
      });
    }

    // 4. Ensure eggBatches has initial batches if empty
    const batchesCount = await db.eggBatches.count();
    if (batchesCount === 0) {
      await db.eggBatches.bulkPut([
        {
          id: `batch-${Date.now()}-1`,
          batchCode: `EB-${daysAgo(2).replace(/-/g, '')}-01`,
          productionDate: daysAgo(2),
          cagesCount: 35,
          initialCagesCount: 50,
          trayCapacity: 18,
          pricePerCage: 900,
          source: 'daily_production',
          status: 'available',
          notes: 'دفعة سابقة - أولوية الصرف الأولى (FIFO)',
          createdAt: new Date(daysAgo(2)).toISOString(),
          updatedAt: new Date(daysAgo(2)).toISOString(),
        },
        {
          id: `batch-${Date.now()}-2`,
          batchCode: `EB-${daysAgo(1).replace(/-/g, '')}-01`,
          productionDate: daysAgo(1),
          cagesCount: 55,
          initialCagesCount: 60,
          trayCapacity: 18,
          pricePerCage: 900,
          source: 'daily_production',
          status: 'available',
          notes: 'إنتاج الأمس - جاهز للتسويق',
          createdAt: new Date(daysAgo(1)).toISOString(),
          updatedAt: new Date(daysAgo(1)).toISOString(),
        },
        {
          id: `batch-${Date.now()}-3`,
          batchCode: `EB-${daysAgo(0).replace(/-/g, '')}-01`,
          productionDate: daysAgo(0),
          cagesCount: 60,
          initialCagesCount: 60,
          trayCapacity: 18,
          pricePerCage: 900,
          source: 'daily_production',
          status: 'available',
          notes: 'إنتاج اليوم الطازج',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);

      // Sync prod-tray-18 stockQuantity
      const totalAvailableCages = 35 + 55 + 60;
      if (prod18) {
        await db.products.update('prod-tray-18', {
          stockQuantity: totalAvailableCages,
        });
      }
    }
  } catch (err) {
    console.warn('Egg inventory migration skipped/error:', err);
  }
}

export async function migratePurchasesAndCategories() {
  try {
    const customCatsCount = await db.customCategories.count();
    if (customCatsCount === 0) {
      await db.customCategories.bulkPut([
        { id: 'cat-1', name: 'أعلاف وتغذية', description: 'شراء الأعلاف المركزة والمواد الخام', createdAt: new Date().toISOString() },
        { id: 'cat-2', name: 'أدوية وتحصينات وبيطرة', description: 'أدوية وفيتامينات ومطهرات الأمان الحيوي', createdAt: new Date().toISOString() },
        { id: 'cat-3', name: 'كراتين وأطباق تعبئة', description: 'أطباق سمان 18 بيضة، أكياس وكراتين شحن', createdAt: new Date().toISOString() },
        { id: 'cat-4', name: 'وقود وبترول وغاز', description: 'ديزل المولدات، بترول النقل والتدفئة', createdAt: new Date().toISOString() },
        { id: 'cat-5', name: 'صيانة ومعدات وتمديدات', description: 'قطع غيار شفاطات، خلايا تبريد وحلمات مياه', createdAt: new Date().toISOString() },
        { id: 'cat-6', name: 'أجور وسحبيات عمال', description: 'رواتب وسلف ومكافآت كادر المزرعة', createdAt: new Date().toISOString() },
      ]);
    }

    const purchasesCount = await db.purchases.count();
    if (purchasesCount === 0) {
      const today = new Date();
      const daysAgo = (days: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - days);
        return d.toISOString().split('T')[0];
      };
      await db.purchases.bulkPut([
        {
          id: `purch-1`,
          date: daysAgo(5),
          itemName: 'علف بادي سمان بروتين 24%',
          quantity: 50,
          unitPrice: 16500,
          totalAmount: 825000,
          unit: 'كيس 50 كغم',
          supplier: 'شركة البركة للأعلاف - صنعاء',
          paidFrom: 'bank_account',
          invoiceRef: 'INV-FEED-992',
          notes: 'شحنة علف بادي لتغذية أفواج التحضين والتسمين',
          recordedBy: 'م. يحيى الشامي',
          createdAt: new Date(daysAgo(5)).toISOString(),
        },
        {
          id: `purch-2`,
          date: daysAgo(3),
          itemName: 'أطباق بلاستيك شفافة سعة 18 بيضة',
          quantity: 2000,
          unitPrice: 45,
          totalAmount: 90000,
          unit: 'طبق',
          supplier: 'مصنع البلاستيك الوطني',
          paidFrom: 'cash_box',
          invoiceRef: 'RCP-8812',
          notes: 'أطباق مخصصة لتعبئة إنتاج بيض المائدة المعياري 18 بيضة',
          recordedBy: 'م. صالح الحميري',
          createdAt: new Date(daysAgo(3)).toISOString(),
        },
        {
          id: `purch-3`,
          date: daysAgo(1),
          itemName: 'فيتامين هـ + سيلينيوم (AD3E) مستورد',
          quantity: 10,
          unitPrice: 6500,
          totalAmount: 65000,
          unit: 'عبوة 1 لتر',
          supplier: 'صيدلية النماء البيطرية',
          paidFrom: 'cash_box',
          invoiceRef: 'VET-334',
          notes: 'جرعة منشطة لقطيع البياض لرفع الخصوبة وإنتاج البيض',
          recordedBy: 'د. عمار الصبري',
          createdAt: new Date(daysAgo(1)).toISOString(),
        },
      ]);
    }
  } catch (err) {
    console.warn('Purchases and categories migration skipped/error:', err);
  }
}

export async function migrateEmployeesAndPayroll() {
  try {
    const empCount = await db.employees.count();
    if (empCount === 0) {
      const today = new Date();
      const daysAgo = (days: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - days);
        return d.toISOString().split('T')[0];
      };

      const initialEmployees: Employee[] = [
        {
          id: 'emp-1',
          name: 'م. صالح الحميري',
          role: 'مشرف العنابر والتشغيل الفني',
          phone: '777112233',
          monthlySalary: 180000,
          dailyWage: 6000,
          hireDate: '2025-01-15',
          status: 'active',
          notes: 'المسؤول عن جرد الأعلاف ومطابقة الوردية وسجلات الإنتاج',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'emp-2',
          name: 'عبده علي الرازحي',
          role: 'مسؤول التغذية وجمع البيض',
          phone: '772334455',
          monthlySalary: 120000,
          dailyWage: 4000,
          hireDate: '2025-03-01',
          status: 'active',
          notes: 'عنبر البطاريات أ - س وعنابر التربية الأرضية',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'emp-3',
          name: 'محمد ناصر القادري',
          role: 'فني صيانة ونظافة وأمان حيوي',
          phone: '774556677',
          monthlySalary: 105000,
          dailyWage: 3500,
          hireDate: '2025-04-10',
          status: 'active',
          notes: 'صيانة خطوط المياه والحلمات وتطهير الساحات',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'emp-4',
          name: 'بشير عبده الحيمي',
          role: 'سائق وموزع مبيعات خارجي',
          phone: '771998877',
          monthlySalary: 135000,
          dailyWage: 4500,
          hireDate: '2025-02-20',
          status: 'active',
          notes: 'توزيع كراتين وأطباق البيض وطيور السمان للمحلات والمطاعم',
          createdAt: new Date().toISOString(),
        },
      ];

      await db.employees.bulkPut(initialEmployees);

      // Seed initial sample attendance records for this month
      await db.employeeAttendance.bulkPut([
        {
          id: 'att-1',
          employeeId: 'emp-2',
          employeeName: 'عبده علي الرازحي',
          date: daysAgo(3),
          status: 'half_day',
          deductionAmount: 2000,
          notes: 'استئذان نصف يوم لظرف عائلي',
          recordedBy: 'م. يحيى الشامي',
          createdAt: new Date(daysAgo(3)).toISOString(),
        },
        {
          id: 'att-2',
          employeeId: 'emp-3',
          employeeName: 'محمد ناصر القادري',
          date: daysAgo(2),
          status: 'absent_full',
          deductionAmount: 3500,
          notes: 'غياب كامل بدون إذن مسبق',
          recordedBy: 'م. يحيى الشامي',
          createdAt: new Date(daysAgo(2)).toISOString(),
        },
      ]);

      // Seed initial sample advances records for this month
      await db.employeeAdvances.bulkPut([
        {
          id: 'adv-1',
          employeeId: 'emp-1',
          employeeName: 'م. صالح الحميري',
          date: daysAgo(4),
          amount: 25000,
          paidFrom: 'cash_box',
          reason: 'سحبية سلفة عائلية منتصف الشهر',
          receiptRef: 'ADV-101',
          recordedBy: 'م. يحيى الشامي',
          createdAt: new Date(daysAgo(4)).toISOString(),
        },
        {
          id: 'adv-2',
          employeeId: 'emp-2',
          employeeName: 'عبده علي الرازحي',
          date: daysAgo(6),
          amount: 15000,
          paidFrom: 'cash_box',
          reason: 'سحبية مصاريف شخصية',
          receiptRef: 'ADV-102',
          recordedBy: 'م. يحيى الشامي',
          createdAt: new Date(daysAgo(6)).toISOString(),
        },
      ]);
    }
  } catch (err) {
    console.warn('Employees and payroll migration skipped/error:', err);
  }
}

export async function initializeDatabase(forceRefresh = false) {
  // 0. Ensure persistent offline browser storage
  await enablePersistentStorage();

  // 0.1 Check if database has already been initialized.
  // If already initialized and not forceRefresh, run non-destructive migration and EXIT.
  const initFlag = await db.settings.get('isDatabaseInitialized');
  if (initFlag?.value === true && !forceRefresh) {
    await migrateMissingAgeFields();
    await migrateEggWarehouseInventory();
    await migratePurchasesAndCategories();
    await migrateEmployeesAndPayroll();
    return;
  }

  const batteriesCount = await db.batteries.count();
  const roomsCount = await db.rooms.count();
  const existingBat3 = await db.batteries.get('bat-3');

  // Reseed batteries only if completely empty or forced
  const needsBatteryReseed = batteriesCount === 0 || forceRefresh;

  // 1. Settings update or initialize with Yemeni currency & tray price
  const existingSettings = await db.settings.get('farmSettings');
  if (
    !existingSettings ||
    !existingSettings.value ||
    existingSettings.value.currency !== 'ريال يمني' ||
    !existingSettings.value.defaultTrayPrice
  ) {
    await db.settings.put({
      key: 'farmSettings',
      value: existingSettings?.value
        ? {
            ...existingSettings.value,
            currency: 'ريال يمني',
            address: 'الجمهورية اليمنية - صنعاء',
            defaultTrayPrice: existingSettings.value.defaultTrayPrice || 2200,
            defaultWholesaleTrayPrice: existingSettings.value.defaultWholesaleTrayPrice || 1900,
            farmName: existingSettings.value.farmName || 'مزرعة سبأ لإنتاج وتفريخ السمان',
            ownerName: existingSettings.value.ownerName || 'م. يحيى الشامي',
          }
        : defaultSettings,
    });
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const daysAgo = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  // 2. Reseed batteries & tiers in strict Arabic order if needed
  if (needsBatteryReseed || forceRefresh) {
    await db.batteries.clear();
    await db.tiers.clear();

    const batteries: Battery[] = [];
    const tiers: BatteryTier[] = [];

    for (let i = 0; i < batteryAlphabetNames.length; i++) {
      const letter = batteryAlphabetNames[i];
      const bId = `bat-${i + 1}`;
      batteries.push({
        id: bId,
        name: letter,
        tiersCount: 4,
        createdAt: new Date().toISOString(),
        notes: `عنبر الأقفاص - بطارية (${letter})`,
      });

      // 4 vertical tiers per battery (الدور 1، 2، 3، 4)
      for (let t = 1; t <= 4; t++) {
        const tierId = `tier-${bId}-${t}`;
        const males = 7;
        const females = t === 4 ? 20 : 21;
        const tierAgeWeeks = t === 1 ? 16 : t === 2 ? 22 : t === 3 ? 34 : (i % 2 === 0 ? 43 : 28);
        const daysHoused = Math.max(1, (tierAgeWeeks - 6) * 7);
        tiers.push({
          id: tierId,
          batteryId: bId,
          tierNumber: t as 1 | 2 | 3 | 4,
          capacity: 30,
          malesCount: males,
          femalesCount: females,
          housingDate: daysAgo(daysHoused),
          initialAgeWeeks: 6,
          targetLayingLifespanWeeks: 42,
          notes: t === 1 ? 'الدور العلوي' : undefined,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await db.batteries.bulkAdd(batteries);
    await db.tiers.bulkAdd(tiers);
  }

  // 3. 7 Floor Rooms + قسم المعزولات + قسم الملحقات
  if (roomsCount === 0 || forceRefresh) {
    await db.rooms.clear();

    const rooms: FloorRoom[] = [
      {
        id: 'room-1',
        name: 'غرفة 1',
        category: 'room',
        purpose: 'layers',
        housingDate: daysAgo(60),
        malesCount: 35,
        femalesCount: 115,
        capacity: 200,
        areaSquareMeters: 25,
        status: 'active',
        notes: 'أمهات بياض أرضي - دورة إنتاجية 1',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'room-2',
        name: 'غرفة 2',
        category: 'room',
        purpose: 'layers',
        housingDate: daysAgo(45),
        malesCount: 40,
        femalesCount: 120,
        capacity: 200,
        areaSquareMeters: 25,
        status: 'active',
        notes: 'أمهات بياض أرضي - دورة إنتاجية 2',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'room-3',
        name: 'غرفة 3',
        category: 'room',
        purpose: 'layers',
        housingDate: daysAgo(30),
        malesCount: 30,
        femalesCount: 95,
        capacity: 200,
        areaSquareMeters: 25,
        status: 'active',
        notes: 'أمهات بياض أرضي - شبابات بياض',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'room-4',
        name: 'غرفة 4',
        category: 'room',
        purpose: 'fattening',
        housingDate: daysAgo(21),
        malesCount: 120,
        femalesCount: 130,
        capacity: 300,
        areaSquareMeters: 30,
        status: 'active',
        notes: 'عنبر تسمين لحم - عمر 3 أسابيع (متوسط الوزن 165 جم)',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'room-5',
        name: 'غرفة 5',
        category: 'room',
        purpose: 'fattening',
        housingDate: daysAgo(35),
        malesCount: 140,
        femalesCount: 140,
        capacity: 300,
        areaSquareMeters: 30,
        status: 'active',
        notes: 'دفعة تسمين جاهزة للذبح والتوزيع - وزن 240 جم',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'room-6',
        name: 'غرفة 6',
        category: 'room',
        purpose: 'brooding',
        housingDate: daysAgo(7),
        malesCount: 150,
        femalesCount: 150,
        capacity: 350,
        areaSquareMeters: 25,
        status: 'active',
        notes: 'تحضين صيصان عمر أسبوع - تحصين ومتابعة حرارة الحضانة',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'room-7',
        name: 'غرفة 7',
        category: 'room',
        purpose: 'brooding',
        housingDate: daysAgo(2),
        malesCount: 180,
        femalesCount: 180,
        capacity: 400,
        areaSquareMeters: 25,
        status: 'active',
        notes: 'تحضين كتاكيت حديثة الفقس - حرارة 34 مئوية',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'room-quarantine',
        name: 'قسم المعزولات',
        category: 'quarantine',
        purpose: 'quarantine',
        housingDate: daysAgo(14),
        malesCount: 6,
        femalesCount: 12,
        capacity: 60,
        areaSquareMeters: 12,
        status: 'isolated',
        notes: 'قسم العزل والحجر الصحي ومتابعة الطيور الضعيفة والمستبعدة',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'room-annex',
        name: 'قسم الملحقات',
        category: 'annex',
        purpose: 'annex',
        housingDate: daysAgo(100),
        malesCount: 0,
        femalesCount: 0,
        capacity: 0,
        areaSquareMeters: 50,
        status: 'active',
        notes: 'مستودع البيض المبرد، غرفة الفرز والتقفيص، ومستودع الأعلاف والمعدات',
        createdAt: new Date().toISOString(),
      },
    ];

    await db.rooms.bulkAdd(rooms);
  }

  // 4. Feed Stock - Yemeni Market pricing (25,500 - 29,000 YER per 50kg bag)
  const firstFeed = await db.feedStock.toCollection().first();
  const feedsCount = await db.feedStock.count();
  if (feedsCount === 0 || forceRefresh) {
    await db.feedStock.clear();
    const feeds: FeedStock[] = [
      {
        id: 'feed-1',
        feedType: 'starter_24_27',
        name: 'بادي سمان كتاكيت (بروتين 24-27%)',
        bagsCount: 42,
        bagWeightKg: 50,
        totalKg: 2100,
        costPerBag: 29000,
        minThresholdBags: 10,
        lastRestockedDate: daysAgo(4),
      },
      {
        id: 'feed-2',
        feedType: 'grower_fattening',
        name: 'نامي وتسمين سمان (بروتين 20-22%)',
        bagsCount: 35,
        bagWeightKg: 50,
        totalKg: 1750,
        costPerBag: 27000,
        minThresholdBags: 8,
        lastRestockedDate: daysAgo(5),
      },
      {
        id: 'feed-3',
        feedType: 'layer_production',
        name: 'بياض إنتاجي سمان مع كالسيوم (بروتين 20%)',
        bagsCount: 65,
        bagWeightKg: 50,
        totalKg: 3250,
        costPerBag: 25500,
        minThresholdBags: 15,
        lastRestockedDate: daysAgo(2),
      },
    ];
    await db.feedStock.bulkPut(feeds);
  }

  // 5. Equipment Tracking Logs
  const eqCount = await db.equipmentLogs.count();
  if (eqCount === 0 || forceRefresh) {
    await db.equipmentLogs.clear();
    const initialEquipmentLogs: EquipmentLog[] = [
      {
        id: 'eq-1',
        date: todayStr,
        time: '08:00',
        locationType: 'room',
        locationId: 'room-2',
        locationName: 'غرفة 2 (أمهات بياض)',
        equipmentType: 'exhaust_fans',
        status: 'running',
        operatingHours: 8,
        temperatureCelsius: 23,
        humidityPercent: 55,
        notes: 'تشغيل الشفاط الرئيسي رقم 1 و 2 على السرعة المتوسطة',
        operator: 'عامل التشغيل',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'eq-2',
        date: todayStr,
        time: '11:30',
        locationType: 'battery',
        locationId: 'bat-1',
        locationName: 'عنبر أقفاص البطاريات (أ-س)',
        equipmentType: 'cooling_pads',
        status: 'running',
        operatingHours: 5,
        temperatureCelsius: 24,
        humidityPercent: 62,
        notes: 'تشغيل مضخة خلايا التبريد الكرتونية لخفض حرارة الظهيرة',
        operator: 'مسؤول الصيانة',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'eq-3',
        date: todayStr,
        time: '06:00',
        locationType: 'room',
        locationId: 'room-7',
        locationName: 'غرفة 7 (تحضين صوص عمر 3 أيام)',
        equipmentType: 'heaters',
        status: 'running',
        operatingHours: 12,
        temperatureCelsius: 34,
        humidityPercent: 60,
        notes: 'دفايات التحضين تعمل بانتظام مع ثيرموستات 34 درجة',
        operator: 'عامل الوردية',
        createdAt: new Date().toISOString(),
      },
    ];
    await db.equipmentLogs.bulkPut(initialEquipmentLogs);
  }

  // 6. Detailed Mortality Log
  const mortCount = await db.detailedMortality.count();
  if (mortCount === 0 || forceRefresh) {
    await db.detailedMortality.clear();
    const initialDetailedMortality: DetailedMortalityRecord[] = [
      {
        id: 'dm-1',
        date: daysAgo(1),
        time: '09:15',
        description: 'انسداد بيضة (Egg Bound) ونزيف داخلي',
        gender: 'female',
        locationType: 'battery',
        batteryName: 'ب',
        tierNumber: 2,
        cageNumber: 'قفص 3',
        exactLocationText: 'بطارية (ب) - الدور 2 - قفص 3',
        quantity: 1,
        disposalMethod: 'burial',
        recordedBy: 'عامل المزرعة',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'dm-2',
        date: todayStr,
        time: '07:30',
        description: 'إجهاد وضعف عام واستبعاد',
        gender: 'female',
        locationType: 'quarantine',
        roomName: 'قسم المعزولات',
        exactLocationText: 'قسم المعزولات - حظيرة 1',
        quantity: 1,
        disposalMethod: 'incineration',
        recordedBy: 'طبيب المزرعة',
        createdAt: new Date().toISOString(),
      },
    ];
    await db.detailedMortality.bulkPut(initialDetailedMortality);
  }

  // 7. Customers (Yemeni Market Names, Phones, and Balances)
  const custCount = await db.customers.count();
  if (custCount === 0 || forceRefresh) {
    await db.customers.clear();
    const initialCustomers: Customer[] = [
      {
        id: 'cust-1',
        name: 'مطعم الشيباني الحديث (صنعاء - حدة)',
        phone: '777112233',
        type: 'wholesale',
        address: 'صنعاء - شارع حدة',
        currentDebt: 65000,
        totalPurchases: 450000,
        createdAt: daysAgo(40),
      },
      {
        id: 'cust-2',
        name: 'سوبرماركت الهدى (الأصبحي)',
        phone: '773445566',
        type: 'wholesale',
        address: 'صنعاء - حي الأصبحي',
        currentDebt: 42000,
        totalPurchases: 320000,
        createdAt: daysAgo(30),
      },
      {
        id: 'cust-3',
        name: 'فندق وسبا سبأ السياحي',
        phone: '770998877',
        type: 'wholesale',
        address: 'صنعاء - شارع علي عبدالمغني',
        currentDebt: 0,
        totalPurchases: 280000,
        createdAt: daysAgo(25),
      },
      {
        id: 'cust-4',
        name: 'عميل نقدي مباشر (كاش)',
        phone: '770000000',
        type: 'retail',
        address: 'نقطة بيع المزرعة - صنعاء',
        currentDebt: 0,
        totalPurchases: 185000,
        createdAt: daysAgo(60),
      },
      {
        id: 'cust-5',
        name: 'محلات البركة لتجارة البيض والدواجن',
        phone: '775667788',
        type: 'wholesale',
        address: 'صنعاء - شارع تعز',
        currentDebt: 95000,
        totalPurchases: 540000,
        createdAt: daysAgo(45),
      },
    ];
    await db.customers.bulkPut(initialCustomers);
  }

  // 8. Products Catalog - All strictly in Yemeni Riyal
  const firstProd = await db.products.toCollection().first();
  const prodCount = await db.products.count();
  if (prodCount === 0 || forceRefresh) {
    await db.products.clear();
    const products: Product[] = [
      {
        id: 'prod-tray-18',
        name: 'طبق بيض مائدة سمان (18 بيضة) - السعة القياسية',
        category: 'table_eggs',
        unit: 'طبق',
        trayCapacity: 18,
        retailPrice: 900,
        wholesalePrice: 800,
        costPrice: 600,
        stockQuantity: 150,
        isActive: true,
      },
      {
        id: 'prod-tray-12',
        name: 'طبق بيض مائدة (12 بيضة)',
        category: 'table_eggs',
        unit: 'طبق',
        trayCapacity: 12,
        retailPrice: 1500,
        wholesalePrice: 1300,
        costPrice: 950,
        stockQuantity: 75,
        isActive: true,
      },
      {
        id: 'prod-tray-24',
        name: 'طبق بيض مائدة (24 بيضة)',
        category: 'table_eggs',
        unit: 'طبق',
        trayCapacity: 24,
        retailPrice: 2900,
        wholesalePrice: 2500,
        costPrice: 1900,
        stockQuantity: 90,
        isActive: true,
      },
      {
        id: 'prod-tray-30',
        name: 'طبق بيض مائدة كبير (30 بيضة)',
        category: 'table_eggs',
        unit: 'طبق',
        trayCapacity: 30,
        retailPrice: 3600,
        wholesalePrice: 3200,
        costPrice: 2400,
        stockQuantity: 110,
        isActive: true,
      },
      {
        id: 'prod-fertile-egg',
        name: 'بيض سمان مخصب للتفريخ (بالحبة)',
        category: 'hatching_eggs',
        unit: 'حبة',
        retailPrice: 200,
        wholesalePrice: 160,
        costPrice: 110,
        stockQuantity: 800,
        isActive: true,
      },
      {
        id: 'prod-fertile-tray-30',
        name: 'طبق بيض مخصب للتفريخ (30 بيضة)',
        category: 'hatching_eggs',
        unit: 'طبق',
        trayCapacity: 30,
        retailPrice: 5500,
        wholesalePrice: 4800,
        costPrice: 3500,
        stockQuantity: 55,
        isActive: true,
      },
      {
        id: 'prod-live-hen',
        name: 'طائر سمان حي (أنثى بياضة منتجة)',
        category: 'live_birds',
        unit: 'طائر',
        retailPrice: 1600,
        wholesalePrice: 1350,
        costPrice: 1000,
        stockQuantity: 180,
        isActive: true,
      },
      {
        id: 'prod-live-male',
        name: 'طائر سمان حي (ذكر مخصب نشط)',
        category: 'live_birds',
        unit: 'طائر',
        retailPrice: 1100,
        wholesalePrice: 900,
        costPrice: 700,
        stockQuantity: 95,
        isActive: true,
      },
      {
        id: 'prod-live-pair',
        name: 'زوج سمان حي (ذكر + أنثى)',
        category: 'live_birds',
        unit: 'جوز',
        retailPrice: 2600,
        wholesalePrice: 2200,
        costPrice: 1650,
        stockQuantity: 85,
        isActive: true,
      },
      {
        id: 'prod-meat-pair-fresh',
        name: 'جوز سمان مذبوح ومجهز طازج (جامبو)',
        category: 'meat',
        unit: 'جوز',
        retailPrice: 3200,
        wholesalePrice: 2700,
        costPrice: 2100,
        stockQuantity: 120,
        isActive: true,
      },
      {
        id: 'prod-meat-pair-frozen',
        name: 'جوز سمان مذبوح مجمد (عبوة محكمة)',
        category: 'meat',
        unit: 'جوز',
        retailPrice: 3000,
        wholesalePrice: 2500,
        costPrice: 2000,
        stockQuantity: 160,
        isActive: true,
      },
      {
        id: 'prod-meat-kg',
        name: 'لحم سمان مفرغ بالكيلو (صافي)',
        category: 'meat',
        unit: 'كغم',
        retailPrice: 6500,
        wholesalePrice: 5500,
        costPrice: 4200,
        stockQuantity: 70,
        isActive: true,
      },
      {
        id: 'prod-feed-layer',
        name: 'كيس علف بياض سمان 50 كجم',
        category: 'feed_supplies',
        unit: 'كيس',
        retailPrice: 28000,
        wholesalePrice: 26500,
        costPrice: 24500,
        stockQuantity: 65,
        isActive: true,
      },
      {
        id: 'prod-delivery-service',
        name: 'خدمة نقل وتوصيل طلبات / المتر',
        category: 'service',
        unit: 'خدمة',
        retailPrice: 3000,
        wholesalePrice: 2500,
        costPrice: 1800,
        stockQuantity: 999,
        isActive: true,
      },
    ];
    await db.products.bulkPut(products);
  }

  // 9. Invoices - Strictly in Yemeni Riyal with Yemeni Payment Methods
  const firstInv = await db.invoices.toCollection().first();
  const invCount = await db.invoices.count();
  if (invCount === 0 || forceRefresh) {
    await db.invoices.clear();
    const initialInvoices: OrderInvoice[] = [
      {
        id: 'inv-101',
        invoiceNumber: 'INV-2026-001',
        date: todayStr,
        time: '09:30',
        customerId: 'cust-2',
        customerName: 'سوبرماركت الهدى (الأصبحي)',
        items: [
          {
            productId: 'prod-tray-18',
            productName: 'طبق بيض مائدة سمان (18 بيضة) - السعة القياسية',
            quantity: 20,
            unit: 'طبق',
            unitPrice: 2200,
            total: 44000,
          },
        ],
        subtotal: 44000,
        deliveryFee: 0,
        discount: 0,
        totalAmount: 44000,
        paidAmount: 44000,
        remainingAmount: 0,
        paymentMethod: 'kuraimi',
        notes: 'سداد فوري عبر محفظة الكريمي - رقم العملية KRM-882194',
        cashierName: 'م. يحيى الشامي',
        createdAt: `${todayStr}T09:30:00.000Z`,
      },
      {
        id: 'inv-102',
        invoiceNumber: 'INV-2026-002',
        date: todayStr,
        time: '11:15',
        customerId: 'cust-4',
        customerName: 'عميل نقدي مباشر (كاش)',
        items: [
          {
            productId: 'prod-tray-18',
            productName: 'طبق بيض مائدة سمان (18 بيضة) - السعة القياسية',
            quantity: 5,
            unit: 'طبق',
            unitPrice: 2200,
            total: 11000,
          },
          {
            productId: 'prod-meat-pair-fresh',
            productName: 'جوز سمان مذبوح ومجهز طازج (جامبو)',
            quantity: 2,
            unit: 'جوز',
            unitPrice: 3200,
            total: 6400,
          },
          {
            productId: 'prod-delivery-service',
            productName: 'خدمة نقل وتوصيل طلبات / المتر',
            quantity: 1,
            unit: 'خدمة',
            unitPrice: 2600,
            total: 2600,
          },
        ],
        subtotal: 20000,
        deliveryFee: 0,
        discount: 0,
        totalAmount: 20000,
        paidAmount: 20000,
        remainingAmount: 0,
        paymentMethod: 'cash',
        notes: 'مبيعات شباك نقداً - استلام كاش لخزينة الصندوق',
        cashierName: 'م. يحيى الشامي',
        createdAt: `${todayStr}T11:15:00.000Z`,
      },
      {
        id: 'inv-103',
        invoiceNumber: 'INV-2026-003',
        date: todayStr,
        time: '14:40',
        customerId: 'cust-1',
        customerName: 'مطعم الشيباني الحديث (صنعاء - حدة)',
        items: [
          {
            productId: 'prod-meat-pair-fresh',
            productName: 'جوز سمان مذبوح ومجهز طازج (جامبو)',
            quantity: 15,
            unit: 'جوز',
            unitPrice: 3200,
            total: 48000,
          },
          {
            productId: 'prod-tray-18',
            productName: 'طبق بيض مائدة سمان (18 بيضة) - السعة القياسية',
            quantity: 10,
            unit: 'طبق',
            unitPrice: 2200,
            total: 22000,
          },
        ],
        subtotal: 70000,
        deliveryFee: 0,
        discount: 0,
        totalAmount: 70000,
        paidAmount: 20000,
        remainingAmount: 50000,
        paymentMethod: 'credit',
        notes: 'طلبية مطعم - مدفوع 20,000 كاش والباقي 50,000 آجل على الحساب',
        cashierName: 'م. يحيى الشامي',
        createdAt: `${todayStr}T14:40:00.000Z`,
      },
      {
        id: 'inv-104',
        invoiceNumber: 'INV-2026-004',
        date: daysAgo(1),
        time: '16:00',
        customerId: 'cust-5',
        customerName: 'محلات البركة لتجارة البيض والدواجن',
        items: [
          {
            productId: 'prod-tray-18',
            productName: 'طبق بيض مائدة سمان (18 بيضة) - السعة القياسية',
            quantity: 30,
            unit: 'طبق',
            unitPrice: 1900,
            total: 57000,
          },
        ],
        subtotal: 57000,
        deliveryFee: 0,
        discount: 0,
        totalAmount: 57000,
        paidAmount: 57000,
        remainingAmount: 0,
        paymentMethod: 'jawali',
        notes: 'تحويل إلكتروني عبر محفظة جوالي - إشعار JWL-77192',
        cashierName: 'م. يحيى الشامي',
        createdAt: `${daysAgo(1)}T16:00:00.000Z`,
      },
      {
        id: 'inv-105',
        invoiceNumber: 'INV-2026-005',
        date: daysAgo(1),
        time: '17:30',
        customerId: 'cust-4',
        customerName: 'عميل نقدي مباشر (كاش)',
        items: [
          {
            productId: 'prod-tray-18',
            productName: 'طبق بيض مائدة سمان (18 بيضة) - السعة القياسية',
            quantity: 10,
            unit: 'طبق',
            unitPrice: 2200,
            total: 22000,
          },
        ],
        subtotal: 22000,
        deliveryFee: 0,
        discount: 0,
        totalAmount: 22000,
        paidAmount: 22000,
        remainingAmount: 0,
        paymentMethod: 'jeeb',
        notes: 'سداد عبر محفظة جيب كاك بنك - إشعار JEEB-44910',
        cashierName: 'م. يحيى الشامي',
        createdAt: `${daysAgo(1)}T17:30:00.000Z`,
      },
    ];
    await db.invoices.bulkPut(initialInvoices);
  }

  // 10. Receipt Vouchers (سندات القبض بالريال اليمني)
  const rvCount = await db.receiptVouchers.count();
  if (rvCount === 0 || forceRefresh) {
    await db.receiptVouchers.clear();
    const initialVouchers: ReceiptVoucher[] = [
      {
        id: 'rv-101',
        voucherNumber: 'RV-2026-001',
        date: todayStr,
        customerId: 'cust-1',
        customerName: 'مطعم الشيباني الحديث (صنعاء - حدة)',
        amount: 35000,
        paymentType: 'kuraimi',
        notes: 'سداد دفعة من الحساب الجاري عبر خدمة حاسب الكريمي',
        recordedBy: 'م. يحيى الشامي',
        createdAt: `${todayStr}T10:00:00.000Z`,
      },
      {
        id: 'rv-102',
        voucherNumber: 'RV-2026-002',
        date: daysAgo(1),
        customerId: 'cust-2',
        customerName: 'سوبرماركت الهدى (الأصبحي)',
        amount: 25000,
        paymentType: 'cash',
        notes: 'دفعة نقدية كاش مقبوضة لخزينة الصندوق',
        recordedBy: 'م. يحيى الشامي',
        createdAt: `${daysAgo(1)}T12:00:00.000Z`,
      },
    ];
    await db.receiptVouchers.bulkPut(initialVouchers);
  }

  // 11. Expenses - All strictly in Yemeni Riyal
  const expCount = await db.expenses.count();
  if (expCount === 0 || forceRefresh) {
    await db.expenses.clear();
    const initialExpenses: ExpenseRecord[] = [
      {
        id: 'exp-1',
        date: todayStr,
        category: 'delivery_petrol',
        amount: 15000,
        description: 'بترول التوصيل / المتر لسيارة التوزيع للمطاعم والمحلات',
        recipient: 'محطة سبأ للمشتقات النفطية - الستين',
        invoiceOrBillRef: 'FUEL-7791',
        paidFrom: 'cash_box',
        recordedBy: 'م. يحيى الشامي',
        createdAt: `${todayStr}T08:30:00.000Z`,
      },
      {
        id: 'exp-2',
        date: todayStr,
        category: 'packaging_bedding',
        amount: 12000,
        description: 'شراء أطباق بيض سمان كرتونية فارغة سعة 18 بيضة (500 طبق)',
        recipient: 'مطابع ومصنع كرتون الأمل - صنعاء',
        invoiceOrBillRef: 'PKG-1142',
        paidFrom: 'cash_box',
        recordedBy: 'م. يحيى الشامي',
        createdAt: `${todayStr}T10:15:00.000Z`,
      },
      {
        id: 'exp-3',
        date: daysAgo(1),
        category: 'feed_purchase',
        amount: 51000,
        description: 'شراء كيسين علف بياض إنتاجي 50 كجم مع التوصيل',
        recipient: 'مؤسسة آزال للأعلاف والدواجن',
        invoiceOrBillRef: 'FEED-8831',
        paidFrom: 'bank_account',
        recordedBy: 'م. يحيى الشامي',
        createdAt: `${daysAgo(1)}T09:00:00.000Z`,
      },
      {
        id: 'exp-4',
        date: daysAgo(1),
        category: 'medications_vitamins',
        amount: 16500,
        description: 'فيتامينات AD3E وأملاح معدنية ومضاد سموم فطرية',
        recipient: 'صيدلية اليمن البيطرية الحديثة',
        invoiceOrBillRef: 'VET-4412',
        paidFrom: 'cash_box',
        recordedBy: 'م. يحيى الشامي',
        createdAt: `${daysAgo(1)}T11:45:00.000Z`,
      },
      {
        id: 'exp-5',
        date: daysAgo(1),
        category: 'salaries_advances',
        amount: 20000,
        description: 'سلفة أسبوعية لعامل العنابر والبطاريات',
        recipient: 'عامل المزرعة (أحمد)',
        invoiceOrBillRef: 'ADV-09',
        paidFrom: 'cash_box',
        recordedBy: 'م. يحيى الشامي',
        createdAt: `${daysAgo(1)}T17:00:00.000Z`,
      },
    ];
    await db.expenses.bulkPut(initialExpenses);
  }

  // 12. Daily Cash Shift Reconciliation - Yemeni Rial
  const cashRegCount = await db.cashRegisters.count();
  if (cashRegCount === 0 || forceRefresh) {
    await db.cashRegisters.clear();
    const initialCashRegisters: DailyCashRegister[] = [
      {
        id: 'cash-reg-1',
        date: daysAgo(1),
        shiftSupervisor: 'م. صالح الحميري',
        openingBalance: 180000,
        cashSales: 85000,
        cashVouchers: 25000,
        cashExpenses: 48500,
        expectedClosingBalance: 241500,
        actualClosingBalance: 241500,
        difference: 0,
        kuraimiSales: 44000,
        jeebSales: 22000,
        jawaliSales: 57000,
        status: 'balanced',
        notes: 'إغلاق الوردية مطابق تماماً ولا يوجد أي عجز أو فائض',
        closedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'cash-reg-2',
        date: todayStr,
        shiftSupervisor: 'م. صالح الحميري',
        openingBalance: 241500, // Opening from yesterday
        cashSales: 40000,
        cashVouchers: 0,
        cashExpenses: 27000,
        expectedClosingBalance: 254500,
        actualClosingBalance: 254500,
        difference: 0,
        kuraimiSales: 44000,
        jeebSales: 0,
        jawaliSales: 0,
        status: 'balanced',
        notes: 'جرد الصندوق اليومي متطابق مع المقبوضات النقدية والمصاريف',
        closedAt: new Date().toISOString(),
      },
    ];
    await db.cashRegisters.bulkPut(initialCashRegisters);
  }

  // 13. Update Egg Production Logs with Packaging of 18 eggs
  const eggLogs = await db.eggLogs.toArray();
  for (const log of eggLogs) {
    if (!log.packagedTraysCount || log.traySize !== 18) {
      const net = Math.max(0, log.actualEggs - (log.brokenEggs || 0));
      const trays = Math.floor(net / 18);
      await db.eggLogs.update(log.id, {
        marketableEggs: net,
        packagedTraysCount: trays,
        traySize: 18,
      });
    }
  }

  // 14. Mark database as permanently initialized so reloads never overwrite user data
  await db.settings.put({
    key: 'isDatabaseInitialized',
    value: true,
  });
  await db.settings.put({
    key: 'databaseInitializedAt',
    value: new Date().toISOString(),
  });

  console.log('✅ قاعدة البيانات مُقفلة ومحفوظة بنجاح - تم تفعيل الحفظ الدائم بدون إنترنت!');
}

export interface StartLiveProductionOptions {
  supervisorName?: string;
  openingCashBalance?: number;
  resetCustomerDebts?: boolean;
}

/**
 * Clear test transactions and initialize live farm operation.
 * Keeps all farm setup (12 batteries أ-س, 7 rooms, feeds, products, prices, farm settings)
 * and wipes dummy invoices, expenses, mortality records, and egg logs so the user starts with a clean slate.
 */
export async function clearDemoTransactionsForLiveProduction(
  options: StartLiveProductionOptions = {}
) {
  const {
    supervisorName = 'مدير المزرعة',
    openingCashBalance = 0,
    resetCustomerDebts = true,
  } = options;

  // 1. Clear operational transaction logs
  await db.invoices.clear();
  await db.receiptVouchers.clear();
  await db.expenses.clear();
  await db.purchases.clear();
  await db.eggLogs.clear();
  await db.equipmentLogs.clear();
  await db.detailedMortality.clear();
  await db.tierMortalities.clear();
  await db.roomMortalities.clear();
  await db.feedConsumption.clear();
  await db.medicationSchedules.clear();
  await db.incubationBatches.clear();
  await db.fatteningBatches.clear();
  await db.fatteningWeights.clear();
  await db.slaughterRecords.clear();
  await db.employeeAdvances.clear();
  await db.employeeAttendance.clear();
  await db.salaryPayments.clear();

  // 2. Clear & initialize Daily Cash Register
  await db.cashRegisters.clear();
  const todayStr = new Date().toISOString().split('T')[0];
  await db.cashRegisters.put({
    id: `cash-reg-${Date.now()}`,
    date: todayStr,
    shiftSupervisor: supervisorName,
    openingBalance: openingCashBalance,
    cashSales: 0,
    cashVouchers: 0,
    cashExpenses: 0,
    expectedClosingBalance: openingCashBalance,
    actualClosingBalance: openingCashBalance,
    difference: 0,
    kuraimiSales: 0,
    jeebSales: 0,
    status: 'balanced',
    notes: 'بداية التشغيل الفعلي للمزرعة - الصندوق مفتوح ومطابق',
    closedAt: new Date().toISOString(),
  });

  // 3. Reset customer debts if requested, keeping customer profiles intact
  if (resetCustomerDebts) {
    const custs = await db.customers.toArray();
    for (const c of custs) {
      await db.customers.update(c.id, {
        currentDebt: 0,
        totalPurchases: 0,
      });
    }
  }

  // 4. Ensure initialization lock flag is set
  await db.settings.put({ key: 'isDatabaseInitialized', value: true });
  await db.settings.put({
    key: 'liveProductionStatus',
    value: {
      isLive: true,
      startedAt: new Date().toISOString(),
      startedBy: supervisorName,
      openingCash: openingCashBalance,
    },
  });

  console.log('✅ تم تصفير المعاملات التجريبية وبدء التشغيل الفعلي للمزرعة بنجاح!');
}

