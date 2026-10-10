import Dexie, { type Table } from 'dexie';
import type {
  Battery,
  BatteryTier,
  TierMortalityRecord,
  FloorRoom,
  RoomMortalityRecord,
  EggProductionLog,
  IncubationBatch,
  FatteningBatch,
  FatteningWeightSample,
  SlaughterRecord,
  FeedStock,
  FeedConsumptionRecord,
  MedicationSchedule,
  Product,
  Customer,
  OrderInvoice,
  ReceiptVoucher,
  ExpenseRecord,
  EquipmentLog,
  DailyCashRegister,
  DetailedMortalityRecord,
  EggBatchRecord,
  FarmPurchaseRecord,
  CustomExpenseCategory,
  Employee,
  EmployeeAttendanceRecord,
  EmployeeAdvanceRecord,
  SalaryPaymentRecord,
  Account,
  JournalEntry,
  BroodingBatch,
  FlockTransferRecord,
} from '../types';

export class QuailFarmDB extends Dexie {
  batteries!: Table<Battery, string>;
  tiers!: Table<BatteryTier, string>;
  tierMortalities!: Table<TierMortalityRecord, string>;
  rooms!: Table<FloorRoom, string>;
  roomMortalities!: Table<RoomMortalityRecord, string>;
  eggLogs!: Table<EggProductionLog, string>;
  eggBatches!: Table<EggBatchRecord, string>;
  incubationBatches!: Table<IncubationBatch, string>;
  broodingBatches!: Table<BroodingBatch, string>;
  fatteningBatches!: Table<FatteningBatch, string>;
  fatteningWeights!: Table<FatteningWeightSample, string>;
  slaughterRecords!: Table<SlaughterRecord, string>;
  feedStock!: Table<FeedStock, string>;
  feedConsumption!: Table<FeedConsumptionRecord, string>;
  medicationSchedules!: Table<MedicationSchedule, string>;
  products!: Table<Product, string>;
  customers!: Table<Customer, string>;
  invoices!: Table<OrderInvoice, string>;
  receiptVouchers!: Table<ReceiptVoucher, string>;
  expenses!: Table<ExpenseRecord, string>;
  settings!: Table<{ key: string; value: any }, string>;
  equipmentLogs!: Table<EquipmentLog, string>;
  cashRegisters!: Table<DailyCashRegister, string>;
  detailedMortality!: Table<DetailedMortalityRecord, string>;
  purchases!: Table<FarmPurchaseRecord, string>;
  customCategories!: Table<CustomExpenseCategory, string>;
  employees!: Table<Employee, string>;
  employeeAttendance!: Table<EmployeeAttendanceRecord, string>;
  employeeAdvances!: Table<EmployeeAdvanceRecord, string>;
  salaryPayments!: Table<SalaryPaymentRecord, string>;
  accounts!: Table<Account, string>;
  journalEntries!: Table<JournalEntry, string>;
  flockTransfers!: Table<FlockTransferRecord, string>;

  constructor() {
    super('QuailFarmERP_DB');
    this.version(1).stores({
      batteries: 'id, name, createdAt',
      tiers: 'id, batteryId, tierNumber',
      tierMortalities: 'id, batteryId, tierId, date',
      rooms: 'id, name, purpose, status',
      roomMortalities: 'id, roomId, date',
      eggLogs: 'id, targetType, targetId, collectionDate, collectionTime, hasIntervalWarning',
      incubationBatches: 'id, batchNumber, startDate, hatchDate, status',
      fatteningBatches: 'id, batchCode, roomId, status',
      fatteningWeights: 'id, batchId, weekNumber, sampleDate',
      slaughterRecords: 'id, batchId, date',
      feedStock: 'id, feedType',
      feedConsumption: 'id, date, targetType, targetId',
      medicationSchedules: 'id, status, withdrawalActive, startDate, endDate',
      products: 'id, category, isActive',
      customers: 'id, name, type',
      invoices: 'id, invoiceNumber, date, customerId, paymentMethod',
      receiptVouchers: 'id, voucherNumber, date, customerId',
      expenses: 'id, date, category',
      settings: 'key',
      equipmentLogs: 'id, date, locationType, equipmentType, status',
      cashRegisters: 'id, date, shiftSupervisor, status',
      detailedMortality: 'id, date, locationType, gender',
    });

    this.version(2).stores({
      eggBatches: 'id, batchCode, productionDate, status, source',
      products: 'id, category, trayCapacity, isActive',
    });

    this.version(3).stores({
      eggBatches: 'id, batchCode, productionDate, status, source',
      products: 'id, category, trayCapacity, isActive',
    });

    this.version(4).stores({
      purchases: 'id, date, itemName, supplier, paidFrom',
      customCategories: 'id, name',
    });

    this.version(5).stores({
      purchases: 'id, date, itemName, supplier, paidFrom',
      customCategories: 'id, name',
    });

    this.version(6).stores({
      employees: 'id, name, status, role',
      employeeAttendance: 'id, employeeId, date, status',
      employeeAdvances: 'id, employeeId, date',
      salaryPayments: 'id, employeeId, month, paymentDate',
    });

    this.version(7).stores({
      accounts: 'id, code, name, type, subType, normalBalance, isActive',
      journalEntries: 'id, entryNumber, date, referenceType, referenceId, status',
    });

    this.version(8).stores({
      broodingBatches: 'id, batchNumber, phase, status, hatchDate',
    });

    this.version(9).stores({
      flockTransfers: 'id, date, batchId, destinationType, destinationId, gender',
    });
  }
}

export const db = new QuailFarmDB();

// Full JSON Backup Export
export async function exportDatabaseToJSON(): Promise<string> {
  const exportData: Record<string, any[]> = {};
  const tables = db.tables;

  for (const table of tables) {
    exportData[table.name] = await table.toArray();
  }

  return JSON.stringify(
    {
      version: 2,
      appName: 'QuailFarmERP',
      exportedAt: new Date().toISOString(),
      data: exportData,
    },
    null,
    2
  );
}

// Full JSON Restore Import
export async function importDatabaseFromJSON(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.data) {
      throw new Error('ملف النسخ الاحتياطي غير صالح');
    }

    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        if (parsed.data[table.name]) {
          await table.clear();
          await table.bulkAdd(parsed.data[table.name]);
        }
      }
    });

    return true;
  } catch (err) {
    console.error('Failed to import database:', err);
    throw err;
  }
}
