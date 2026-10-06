import React, { useState, useMemo } from 'react';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type {
  Employee,
  EmployeeAttendanceRecord,
  EmployeeAdvanceRecord,
  AttendanceStatus,
  ExpenseRecord,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  UserPlus,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Edit,
  Plus,
  Search,
  FileText,
  Printer,
  ArrowDownLeft,
  Wallet,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Zap,
  TrendingDown,
  X,
  CreditCard,
  Briefcase,
  Phone,
  Calculator,
  RotateCcw,
} from 'lucide-react';

export const EmployeesPayrollView: React.FC = () => {
  const { farmSettings, userName } = useAuth();
  const { toast } = useToast();

  // Selected Month (YYYY-MM)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState<'ledger' | 'attendance' | 'advances' | 'employees'>('ledger');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live queries
  const employees = useLiveQuery(() => db.employees.toArray(), []) || [];
  const allAttendance = useLiveQuery(() => db.employeeAttendance.reverse().sortBy('date'), []) || [];
  const allAdvances = useLiveQuery(() => db.employeeAdvances.reverse().sortBy('date'), []) || [];

  // Filtered by selected month
  const monthAttendance = useMemo(() => {
    return allAttendance.filter((a) => a.date.startsWith(selectedMonth));
  }, [allAttendance, selectedMonth]);

  const monthAdvances = useMemo(() => {
    return allAdvances.filter((a) => a.date.startsWith(selectedMonth));
  }, [allAdvances, selectedMonth]);

  // Modal States
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedEmployeeForStatement, setSelectedEmployeeForStatement] = useState<Employee | null>(null);

  // Employee Form State
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('عامل عنابر وإنتاج');
  const [empPhone, setEmpPhone] = useState('');
  const [empMonthlySalary, setEmpMonthlySalary] = useState<number | ''>('');
  const [empDailyWage, setEmpDailyWage] = useState<number | ''>('');
  const [empHireDate, setEmpHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [empStatus, setEmpStatus] = useState<'active' | 'inactive'>('active');
  const [empNotes, setEmpNotes] = useState('');

  // Attendance Form State
  const [attEmployeeId, setAttEmployeeId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('present_full');
  const [attNotes, setAttNotes] = useState('');

  // Advance Form State
  const [advEmployeeId, setAdvEmployeeId] = useState('');
  const [advDate, setAdvDate] = useState(new Date().toISOString().split('T')[0]);
  const [advAmount, setAdvAmount] = useState<number | ''>('');
  const [advPaidFrom, setAdvPaidFrom] = useState<'cash_box' | 'bank_account'>('cash_box');
  const [advReason, setAdvReason] = useState('');
  const [advReceiptRef, setAdvReceiptRef] = useState('');
  const [advSyncToExpenses, setAdvSyncToExpenses] = useState(true);

  // Auto-calculate daily wage when monthly salary changes (Salary / 30)
  const handleSalaryChange = (val: number | '') => {
    setEmpMonthlySalary(val);
    if (typeof val === 'number' && val > 0) {
      setEmpDailyWage(Math.round(val / 30));
    } else {
      setEmpDailyWage('');
    }
  };

  // Automated Payroll Ledger Calculations for each Employee
  const payrollLedger = useMemo(() => {
    return employees.map((emp) => {
      const empAttendance = monthAttendance.filter((a) => a.employeeId === emp.id);
      const fullAbsences = empAttendance.filter((a) => a.status === 'absent_full');
      const halfDays = empAttendance.filter((a) => a.status === 'half_day');
      const fullDaysPresent = empAttendance.filter((a) => a.status === 'present_full');

      const totalDeductions = empAttendance.reduce((acc, a) => acc + (a.deductionAmount || 0), 0);
      const empAdvances = monthAdvances.filter((a) => a.employeeId === emp.id);
      const totalAdvances = empAdvances.reduce((acc, a) => acc + a.amount, 0);

      // (الراتب الأساسي - إجمالي الخصومات والغيابات - إجمالي السحبيات = المتبقي من الراتب)
      const netRemaining = emp.monthlySalary - totalDeductions - totalAdvances;

      return {
        employee: emp,
        fullAbsencesCount: fullAbsences.length,
        halfDaysCount: halfDays.length,
        fullPresentCount: fullDaysPresent.length,
        totalDeductions,
        totalAdvances,
        netRemaining,
        empAttendance,
        empAdvances,
      };
    });
  }, [employees, monthAttendance, monthAdvances]);

  // Overall Month Statistics
  const activeEmployees = employees.filter((e) => e.status === 'active');
  const totalBaseSalaries = activeEmployees.reduce((acc, e) => acc + e.monthlySalary, 0);
  const totalMonthDeductions = payrollLedger.reduce((acc, p) => acc + p.totalDeductions, 0);
  const totalMonthAdvances = payrollLedger.reduce((acc, p) => acc + p.totalAdvances, 0);
  const totalNetRemaining = payrollLedger.reduce((acc, p) => acc + p.netRemaining, 0);

  // Month navigation helper
  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  // --- 1. Handlers: Employee CRUD ---
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmpName('');
    setEmpRole('عامل عنابر وإنتاج');
    setEmpPhone('');
    setEmpMonthlySalary('');
    setEmpDailyWage('');
    setEmpHireDate(new Date().toISOString().split('T')[0]);
    setEmpStatus('active');
    setEmpNotes('');
    setShowAddEmployeeModal(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpName(emp.name);
    setEmpRole(emp.role);
    setEmpPhone(emp.phone || '');
    setEmpMonthlySalary(emp.monthlySalary);
    setEmpDailyWage(emp.dailyWage);
    setEmpHireDate(emp.hireDate);
    setEmpStatus(emp.status);
    setEmpNotes(emp.notes || '');
    setShowAddEmployeeModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const salary = Number(empMonthlySalary);
    const wage = Number(empDailyWage);

    if (!empName.trim() || salary <= 0 || wage <= 0) {
      toast('يرجى إدخال اسم الموظف والراتب الشهري واليومية بشكل صحيح', 'error');
      return;
    }

    if (editingEmployee) {
      await db.employees.update(editingEmployee.id, {
        name: empName.trim(),
        role: empRole.trim(),
        phone: empPhone.trim() || undefined,
        monthlySalary: salary,
        dailyWage: wage,
        hireDate: empHireDate,
        status: empStatus,
        notes: empNotes.trim() || undefined,
      });
      toast(`تم تحديث بيانات الموظف "${empName}" بنجاح!`, 'success');
    } else {
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        name: empName.trim(),
        role: empRole.trim(),
        phone: empPhone.trim() || undefined,
        monthlySalary: salary,
        dailyWage: wage,
        hireDate: empHireDate,
        status: empStatus,
        notes: empNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      await db.employees.add(newEmp);
      toast(`تمت إضافة الموظف "${empName}" بنجاح!`, 'success');
    }

    setShowAddEmployeeModal(false);
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الموظف "${name}"؟ سيتم حذف بياناته وسجلاته المرتبطة.`)) {
      await db.employees.delete(id);
      // Clean up linked attendance and advances
      const atts = await db.employeeAttendance.where('employeeId').equals(id).toArray();
      for (const a of atts) await db.employeeAttendance.delete(a.id);
      const advs = await db.employeeAdvances.where('employeeId').equals(id).toArray();
      for (const a of advs) await db.employeeAdvances.delete(a.id);
      toast(`تم حذف الموظف "${name}" بنجاح`, 'info');
    }
  };

  // --- 2. Handlers: Attendance Tracking ---
  const handleOpenAttendanceModal = (empId?: string) => {
    setAttEmployeeId(empId || (activeEmployees.length > 0 ? activeEmployees[0].id : ''));
    setAttDate(new Date().toISOString().split('T')[0]);
    setAttStatus('present_full');
    setAttNotes('');
    setShowAttendanceModal(true);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attEmployeeId) {
      toast('يرجى اختيار الموظف', 'error');
      return;
    }

    const targetEmp = employees.find((emp) => emp.id === attEmployeeId);
    if (!targetEmp) return;

    // Calculate deduction amount strictly:
    // حضور كامل: 0
    // غياب كامل: يومية كاملة
    // نصف دوام: نصف اليومية المقررة
    let deduction = 0;
    if (attStatus === 'absent_full') {
      deduction = targetEmp.dailyWage;
    } else if (attStatus === 'half_day') {
      deduction = Math.round(targetEmp.dailyWage / 2);
    }

    // Check if an attendance record already exists for this employee on this date
    const existing = await db.employeeAttendance
      .where('employeeId')
      .equals(attEmployeeId)
      .and((rec) => rec.date === attDate)
      .first();

    if (existing) {
      await db.employeeAttendance.update(existing.id, {
        status: attStatus,
        deductionAmount: deduction,
        notes: attNotes.trim() || undefined,
        recordedBy: userName,
      });
      toast(`تم تحديث حالة دوام "${targetEmp.name}" ليوم ${attDate}`, 'info');
    } else {
      const newAtt: EmployeeAttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeId: targetEmp.id,
        employeeName: targetEmp.name,
        date: attDate,
        status: attStatus,
        deductionAmount: deduction,
        notes: attNotes.trim() || undefined,
        recordedBy: userName,
        createdAt: new Date().toISOString(),
      };
      await db.employeeAttendance.add(newAtt);
      toast(`تم تسجيل دوام "${targetEmp.name}" بنجاح!`, 'success');
    }

    setShowAttendanceModal(false);
  };

  const handleDeleteAttendance = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف سجل هذا الدوام؟')) {
      await db.employeeAttendance.delete(id);
      toast('تم حذف السجل بنجاح', 'info');
    }
  };

  // Quick Daily Attendance for all active staff (Present Full for today)
  const handleQuickMarkAllPresentToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    let addedCount = 0;

    for (const emp of activeEmployees) {
      const existing = await db.employeeAttendance
        .where('employeeId')
        .equals(emp.id)
        .and((rec) => rec.date === today)
        .first();

      if (!existing) {
        await db.employeeAttendance.add({
          id: `att-${Date.now()}-${emp.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          date: today,
          status: 'present_full',
          deductionAmount: 0,
          notes: 'تحضير سريع اعتيادي لليوم',
          recordedBy: userName,
          createdAt: new Date().toISOString(),
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      toast(`تم تسجيل حضور كامل لـ ${addedCount} موظف اليوم! يمكنك تعديل الغائبين فقط.`, 'success');
    } else {
      toast('تم تحضير جميع الموظفين مسبقاً لهذا اليوم.', 'info');
    }
  };

  // --- 3. Handlers: Cash Advances ---
  const handleOpenAdvanceModal = (empId?: string) => {
    setAdvEmployeeId(empId || (activeEmployees.length > 0 ? activeEmployees[0].id : ''));
    setAdvDate(new Date().toISOString().split('T')[0]);
    setAdvAmount('');
    setAdvPaidFrom('cash_box');
    setAdvReason('');
    setAdvReceiptRef('');
    setAdvSyncToExpenses(true);
    setShowAdvanceModal(true);
  };

  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(advAmount);
    if (!advEmployeeId || amount <= 0) {
      toast('يرجى اختيار الموظف وإدخال مبلغ السحبية', 'error');
      return;
    }

    const targetEmp = employees.find((emp) => emp.id === advEmployeeId);
    if (!targetEmp) return;

    const advId = `adv-${Date.now()}`;
    const newAdv: EmployeeAdvanceRecord = {
      id: advId,
      employeeId: targetEmp.id,
      employeeName: targetEmp.name,
      date: advDate,
      amount,
      paidFrom: advPaidFrom,
      reason: advReason.trim() || undefined,
      receiptRef: advReceiptRef.trim() || undefined,
      recordedBy: userName,
      createdAt: new Date().toISOString(),
    };

    await db.employeeAdvances.add(newAdv);

    // Synchronize to db.expenses so Cash Register and P&L account for the cash outflow automatically
    if (advSyncToExpenses) {
      const newExp: ExpenseRecord = {
        id: `exp-${Date.now()}`,
        date: advDate,
        category: 'salaries_advances',
        amount,
        description: `سحبية وسلفة نقدية للموظف: ${targetEmp.name} ${advReason ? `(${advReason.trim()})` : ''}`,
        recipient: targetEmp.name,
        invoiceOrBillRef: advReceiptRef.trim() || `سند سحبية ${advId}`,
        paidFrom: advPaidFrom,
        recordedBy: userName,
        createdAt: new Date().toISOString(),
      };
      await db.expenses.add(newExp);
    }

    toast(`تم تسجيل سحبية بمبلغ ${amount.toLocaleString('ar-SA')} ${farmSettings.currency} للموظف "${targetEmp.name}"!`, 'success');
    setShowAdvanceModal(false);
  };

  const handleDeleteAdvance = async (id: string, empName: string, amount: number) => {
    if (confirm(`هل أنت متأكد من حذف سحبية ${empName} بمبلغ ${amount.toLocaleString('ar-SA')} ${farmSettings.currency}؟`)) {
      await db.employeeAdvances.delete(id);
      toast('تم حذف السحبية بنجاح', 'info');
    }
  };

  // Filtered Ledger by search
  const filteredLedger = payrollLedger.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return item.employee.name.toLowerCase().includes(q) || item.employee.role.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn font-almarai">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                سحبيات ورواتب الموظفين (Payroll & Staff)
              </h2>
              <p className="text-xs text-slate-500">
                إدارة بيانات الموظفين، متابعة الحضور والغياب اليومي مع الخصم التلقائي، وحساب السحبيات وصافي الرواتب المتبقية.
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Navigator */}
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              title="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-mono font-black text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{selectedMonth}</span>
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
              title="الشهر التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Mark All Present Button */}
          <button
            onClick={handleQuickMarkAllPresentToday}
            className="px-3 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            title="تسجيل حضور كامل لجميع الموظفين اليوم بضغطة واحدة"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>تحضير سريع لليوم</span>
          </button>

          {/* Record Attendance */}
          <button
            onClick={() => handleOpenAttendanceModal()}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>تسجيل دوام / غياب</span>
          </button>

          {/* Record Cash Advance */}
          <button
            onClick={() => handleOpenAdvanceModal()}
            className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <DollarSign className="w-4 h-4 stroke-[3]" />
            <span>+ سحبية نقدية</span>
          </button>

          {/* Add Employee */}
          <button
            onClick={handleOpenAddEmployee}
            className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ إضافة موظف</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Automated Payroll Summary for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Base Salaries */}
        <div className="p-5 rounded-3xl glass-card border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600">إجمالي الرواتب الأساسية</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalBaseSalaries.toLocaleString('ar-SA')} {farmSettings.currency}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            عدد الكادر النشط: <b className="font-mono text-slate-800">{activeEmployees.length}</b> موظف
          </div>
        </div>

        {/* 2. Absence & Half-day Deductions */}
        <div className="p-5 rounded-3xl glass-card border border-rose-200/80 bg-rose-50/30 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-900">إجمالي خصومات الغياب ونصف الدوام</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-950 font-mono">
            -{totalMonthDeductions.toLocaleString('ar-SA')} {farmSettings.currency}
          </div>
          <div className="text-[11px] text-rose-800 mt-1">
            مخصومة آلياً بناءً على اليوميات المقررة
          </div>
        </div>

        {/* 3. Cash Advances */}
        <div className="p-5 rounded-3xl glass-card border border-amber-200/80 bg-amber-50/30 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900">إجمالي السحبيات النقدية المصروفة</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">
            -{totalMonthAdvances.toLocaleString('ar-SA')} {farmSettings.currency}
          </div>
          <div className="text-[11px] text-amber-800 mt-1">
            عدد سندات السحب: <b className="font-mono">{monthAdvances.length}</b> عملية سحب
          </div>
        </div>

        {/* 4. Net Remaining Salaries */}
        <div
          className={`p-5 rounded-3xl glass-card border shadow-xs ${
            totalNetRemaining >= 0
              ? 'border-emerald-200/80 bg-emerald-50/40 text-emerald-950'
              : 'border-rose-200/80 bg-rose-50/40 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold">المتبقي من الرواتب المستحقة للصرف</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                totalNetRemaining >= 0 ? 'bg-emerald-600' : 'bg-rose-600'
              }`}
            >
              <DollarSign className="w-4 h-4 stroke-[3]" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono">
            {totalNetRemaining.toLocaleString('ar-SA')} {farmSettings.currency}
          </div>
          <div className="text-[11px] mt-1 font-bold opacity-85">
            {totalNetRemaining >= 0 ? 'مستحقات واجبة الصرف نهاية الشهر' : 'تجاوز بالسحبيات مستحق للمزرعة'}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                activeTab === 'ledger'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>جدول احتساب الرواتب الآلي</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'ledger' ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {employees.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                activeTab === 'attendance'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-300'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>سجل الحضور والغياب اليومي</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'attendance' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {monthAttendance.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('advances')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                activeTab === 'advances'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>سجل السحبيات النقدية</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === 'advances' ? 'bg-amber-800 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {monthAdvances.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all ${
                activeTab === 'employees'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>بيانات وملفات الموظفين</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو المسمى..."
              className="glass-input text-xs pr-8 py-1.5 w-full"
            />
          </div>
        </div>

        {/* TAB 1: AUTOMATED PAYROLL LEDGER TABLE (Core User Request) */}
        {activeTab === 'ledger' && (
          <div className="rounded-3xl glass-panel p-5 border border-slate-200/80 space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span>جدول مسير الرواتب والاحتساب الآلي لشهر ({selectedMonth})</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  معادلة الاحتساب الآلي: <b>(الراتب الأساسي - إجمالي الخصومات والغيابات - إجمالي السحبيات = المتبقي من الراتب)</b>
                </p>
              </div>

              <div className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-900 px-3 py-1.5 rounded-xl font-bold">
                الغياب الكامل = خصم يومية كاملة | نصف الدوام = خصم نصف يومية
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">الموظف والمسمى</th>
                    <th className="p-3.5 text-center">الراتب الأساسي</th>
                    <th className="p-3.5 text-center">قيمة اليومية</th>
                    <th className="p-3.5 text-center">أيام الغياب ونصف الدوام</th>
                    <th className="p-3.5 text-center text-rose-700">إجمالي الخصومات (-)</th>
                    <th className="p-3.5 text-center text-amber-700">إجمالي السحبيات (-)</th>
                    <th className="p-3.5 text-center text-emerald-800">المتبقي من الراتب (=)</th>
                    <th className="p-3.5 text-center">كشف الحساب والإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLedger && filteredLedger.length > 0 ? (
                    filteredLedger.map((item) => (
                      <tr key={item.employee.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Employee Name & Role */}
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900 text-xs">{item.employee.name}</div>
                          <div className="text-[11px] text-slate-500">{item.employee.role}</div>
                        </td>

                        {/* Base Monthly Salary */}
                        <td className="p-3.5 text-center font-mono font-bold text-slate-800 text-xs">
                          {item.employee.monthlySalary.toLocaleString('ar-SA')} {farmSettings.currency}
                        </td>

                        {/* Daily Wage */}
                        <td className="p-3.5 text-center font-mono font-bold text-slate-600 text-xs">
                          {item.employee.dailyWage.toLocaleString('ar-SA')} {farmSettings.currency}
                        </td>

                        {/* Absences Breakdown Badges */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {item.fullAbsencesCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px]">
                                {item.fullAbsencesCount} غياب كامل
                              </span>
                            ) : null}

                            {item.halfDaysCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px]">
                                {item.halfDaysCount} نصف دوام
                              </span>
                            ) : null}

                            {item.fullAbsencesCount === 0 && item.halfDaysCount === 0 ? (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                لا يوجد غياب
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Total Deductions */}
                        <td className="p-3.5 text-center font-mono font-black text-rose-700 text-sm">
                          {item.totalDeductions > 0
                            ? `-${item.totalDeductions.toLocaleString('ar-SA')} ${farmSettings.currency}`
                            : '0'}
                        </td>

                        {/* Total Advances */}
                        <td className="p-3.5 text-center font-mono font-black text-amber-700 text-sm">
                          {item.totalAdvances > 0
                            ? `-${item.totalAdvances.toLocaleString('ar-SA')} ${farmSettings.currency}`
                            : '0'}
                        </td>

                        {/* Net Remaining Salary */}
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-3 py-1 rounded-xl font-mono font-black text-sm inline-block ${
                              item.netRemaining > 0
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : item.netRemaining === 0
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-rose-100 text-rose-900 border border-rose-300'
                            }`}
                          >
                            {item.netRemaining.toLocaleString('ar-SA')} {farmSettings.currency}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedEmployeeForStatement(item.employee)}
                              className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center gap-1 transition-colors border border-indigo-200"
                              title="عرض كشف حساب ومسير راتب مفصل للموظف"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>كشف راتب</span>
                            </button>

                            <button
                              onClick={() => handleOpenAdvanceModal(item.employee.id)}
                              className="p-1 rounded-lg text-amber-600 hover:bg-amber-50"
                              title="تسجيل سحبية سريعة"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenAttendanceModal(item.employee.id)}
                              className="p-1 rounded-lg text-slate-600 hover:bg-slate-100"
                              title="تسجيل دوام / غياب"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        لا يوجد موظفون مسجلون. اضغط على "+ إضافة موظف" لإضافة كادر المزرعة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ATTENDANCE & ABSENCE LOG */}
        {activeTab === 'attendance' && (
          <div className="rounded-3xl glass-panel p-5 border border-slate-200/80 space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>سجل الحضور والغياب اليومي لشهر ({selectedMonth})</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  متابعة حالة الدوام وحساب الخصم تلقائياً (غياب كامل = يومية كاملة، نصف دوام = نصف يومية).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleQuickMarkAllPresentToday}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>تحضير سريع لليوم</span>
                </button>

                <button
                  onClick={() => handleOpenAttendanceModal()}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>تسجيل حالة دوام</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">التاريخ</th>
                    <th className="p-3.5">اسم الموظف</th>
                    <th className="p-3.5 text-center">حالة الدوام</th>
                    <th className="p-3.5 text-center">مبلغ الخصم المحسوب</th>
                    <th className="p-3.5">ملاحظات وسبب الغياب</th>
                    <th className="p-3.5">المسجل</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthAttendance && monthAttendance.length > 0 ? (
                    monthAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900">{rec.date}</td>
                        <td className="p-3.5 font-bold text-slate-900">{rec.employeeName}</td>
                        <td className="p-3.5 text-center">
                          {rec.status === 'present_full' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>حضور كامل</span>
                            </span>
                          )}
                          {rec.status === 'absent_full' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-[10px] inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>غياب كامل (خصم يومية)</span>
                            </span>
                          )}
                          {rec.status === 'half_day' && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] inline-flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              <span>نصف دوام (خصم 50%)</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono font-black text-xs">
                          {rec.deductionAmount > 0 ? (
                            <span className="text-rose-700">
                              -{rec.deductionAmount.toLocaleString('ar-SA')} {farmSettings.currency}
                            </span>
                          ) : (
                            <span className="text-slate-400">0 (لا يوجد خصم)</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-600">{rec.notes || '-'}</td>
                        <td className="p-3.5 text-slate-400 text-[11px]">{rec.recordedBy}</td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleDeleteAttendance(rec.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="حذف هذا السجل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        لا توجد سجلات دوام مسجلة لهذا الشهر. اضغط "تحضير سريع لليوم" للبدء.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ADVANCES LOG */}
        {activeTab === 'advances' && (
          <div className="rounded-3xl glass-panel p-5 border border-slate-200/80 space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-600" />
                  <span>سجل السحبيات والسلف النقدية لشهر ({selectedMonth})</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  توثيق المبالغ المسحوبة مقدماً من قبل الموظفين وتاريخ صرفها وسبب السحبية.
                </p>
              </div>

              <button
                onClick={() => handleOpenAdvanceModal()}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل سحبية جديدة</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">تاريخ السحب</th>
                    <th className="p-3.5">اسم الموظف</th>
                    <th className="p-3.5 text-center">المبلغ المسحوب</th>
                    <th className="p-3.5">طريقة الصرف</th>
                    <th className="p-3.5">بيان وسبب السحبية</th>
                    <th className="p-3.5">رقم السند</th>
                    <th className="p-3.5">المسجل</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthAdvances && monthAdvances.length > 0 ? (
                    monthAdvances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900">{adv.date}</td>
                        <td className="p-3.5 font-bold text-slate-900">{adv.employeeName}</td>
                        <td className="p-3.5 text-center font-mono font-black text-amber-700 text-sm">
                          {adv.amount.toLocaleString('ar-SA')} {farmSettings.currency}
                        </td>
                        <td className="p-3.5">
                          <span className="text-[11px] text-slate-600 font-semibold">
                            {adv.paidFrom === 'cash_box' ? 'الصندوق النقدي' : 'حساب بنكي'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-700">{adv.reason || '-'}</td>
                        <td className="p-3.5 font-mono text-slate-500">{adv.receiptRef || '-'}</td>
                        <td className="p-3.5 text-slate-400 text-[11px]">{adv.recordedBy}</td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleDeleteAdvance(adv.id, adv.employeeName, adv.amount)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="حذف هذه السحبية"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        لا توجد سحبيات مسجلة لهذا الشهر.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: EMPLOYEE PROFILES */}
        {activeTab === 'employees' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  ملفات وبيانات موظفي المزرعة ({employees.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  تحديد الراتب الشهري، وقيمة اليومية المقررة، وأرقام التواصل.
                </p>
              </div>

              <button
                onClick={handleOpenAddEmployee}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة موظف جديد</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900">{emp.name}</h4>
                        <span className="text-[11px] text-slate-500 block">{emp.role}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {emp.status === 'active' ? 'نشط' : 'متوقف'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">الراتب الأساسي:</span>
                      <b className="font-mono text-slate-900">
                        {emp.monthlySalary.toLocaleString('ar-SA')} {farmSettings.currency}
                      </b>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">اليومية المقررة:</span>
                      <b className="font-mono text-indigo-700">
                        {emp.dailyWage.toLocaleString('ar-SA')} {farmSettings.currency}
                      </b>
                    </div>
                    {emp.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">الهاتف:</span>
                        <span className="font-mono text-slate-700">{emp.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">تاريخ التعيين:</span>
                      <span className="font-mono text-slate-700">{emp.hireDate}</span>
                    </div>
                  </div>

                  {emp.notes && (
                    <div className="text-[11px] text-slate-500 bg-white p-2 rounded-xl border border-slate-100 truncate">
                      {emp.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setSelectedEmployeeForStatement(emp)}
                      className="text-xs text-indigo-600 hover:underline font-bold flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>كشف الحساب والراتب</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditEmployee(emp)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT EMPLOYEE */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <UserPlus className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingEmployee ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddEmployeeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الموظف الكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="مثال: صالح أحمد الحميري"
                  className="w-full glass-input text-xs font-bold"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المسمى الوظيفي <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="مشرف عنبر وتشغيل">مشرف عنبر وتشغيل</option>
                    <option value="عامل عنابر وإنتاج">عامل عنابر وإنتاج</option>
                    <option value="مسؤول تغذية وأعلاف">مسؤول تغذية وأعلاف</option>
                    <option value="فني صيانة وتبريد">فني صيانة وتبريد</option>
                    <option value="سائق وموزع مبيعات">سائق وموزع مبيعات</option>
                    <option value="عامل تحضين وفقاسات">عامل تحضين وفقاسات</option>
                    <option value="محاسب وأمين صندوق">محاسب وأمين صندوق</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="77XXXXXXX"
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
              </div>

              {/* Salary & Daily Wage (With auto calculation) */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-black text-indigo-900">
                  <span>الراتب واليومية المقررة</span>
                  <span className="text-[10px] text-indigo-700 font-normal">
                    (تُحسب اليومية تلقائياً: الراتب / 30 يوماً مع إمكانية التعديل)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      الراتب الشهري ({farmSettings.currency}) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={empMonthlySalary}
                      onChange={(e) => handleSalaryChange(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="150000"
                      className="w-full glass-input text-center text-sm font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-900 mb-1">
                      قيمة اليومية المستحقة ({farmSettings.currency}) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={empDailyWage}
                      onChange={(e) => setEmpDailyWage(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="5000"
                      className="w-full glass-input text-center text-sm font-mono font-black text-indigo-700 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ بدء العمل (التعيين)
                  </label>
                  <input
                    type="date"
                    required
                    value={empHireDate}
                    onChange={(e) => setEmpHireDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الحالة
                  </label>
                  <select
                    value={empStatus}
                    onChange={(e) => setEmpStatus(e.target.value as any)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="active">نشط (على رأس العمل)</option>
                    <option value="inactive">متوقف / منتهي العقد</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات
                </label>
                <input
                  type="text"
                  value={empNotes}
                  onChange={(e) => setEmpNotes(e.target.value)}
                  placeholder="ملاحظات حول سكن العامل، العهد، أوقات الراحة"
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  {editingEmployee ? 'حفظ التعديلات' : 'إضافة الموظف'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD ATTENDANCE & ABSENCE */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل حالة الدوام والغياب
                </h3>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الموظف <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={attEmployeeId}
                  onChange={(e) => setAttEmployeeId(e.target.value)}
                  className="w-full glass-input text-xs font-bold"
                >
                  <option value="">-- اختر الموظف --</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role}) - اليومية: {emp.dailyWage.toLocaleString('ar-SA')} {farmSettings.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تاريخ اليوم <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="w-full glass-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  حالة الدوام <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAttStatus('present_full')}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      attStatus === 'present_full'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-black shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                    <div className="text-xs">حضور كامل</div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">خصم 0</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttStatus('half_day')}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      attStatus === 'half_day'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 font-black shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                    <div className="text-xs">نصف دوام</div>
                    <div className="text-[10px] text-amber-700 mt-0.5">خصم 50%</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAttStatus('absent_full')}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      attStatus === 'absent_full'
                        ? 'border-rose-500 bg-rose-50 text-rose-900 font-black shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <XCircle className="w-4 h-4 mx-auto mb-1 text-rose-600" />
                    <div className="text-xs">غياب كامل</div>
                    <div className="text-[10px] text-rose-700 mt-0.5">خصم يومية</div>
                  </button>
                </div>
              </div>

              {/* Deduction Feedback Preview */}
              {attEmployeeId && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-600">قيمة الخصم الذي سيُطبق:</span>
                  <span className="font-mono font-black text-sm">
                    {(() => {
                      const emp = employees.find((e) => e.id === attEmployeeId);
                      if (!emp) return '0';
                      if (attStatus === 'present_full') return '0 ريال (حضور كامل)';
                      if (attStatus === 'half_day')
                        return `-${Math.round(emp.dailyWage / 2).toLocaleString('ar-SA')} ${farmSettings.currency} (نصف يومية)`;
                      return `-${emp.dailyWage.toLocaleString('ar-SA')} ${farmSettings.currency} (يومية كاملة)`;
                    })()}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أو سبب الغياب (اختياري)
                </label>
                <input
                  type="text"
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.target.value)}
                  placeholder="مثال: إذن مسبق، ظرف عائلي، تأخر"
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
                >
                  تثبيت حالة الدوام
                </button>
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD CASH ADVANCE */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Wallet className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  تسجيل سحبية نقدية للموظف
                </h3>
              </div>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdvance} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الموظف المستفيد <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={advEmployeeId}
                  onChange={(e) => setAdvEmployeeId(e.target.value)}
                  className="w-full glass-input text-xs font-bold"
                >
                  <option value="">-- اختر الموظف --</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} (الراتب: {emp.monthlySalary.toLocaleString('ar-SA')} {farmSettings.currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ السحب <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={advDate}
                    onChange={(e) => setAdvDate(e.target.value)}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المبلغ المسحوب ({farmSettings.currency}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={advAmount}
                    onChange={(e) => setAdvAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="10000"
                    className="w-full glass-input text-center text-base font-mono font-black text-amber-700"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    طريقة الصرف
                  </label>
                  <select
                    value={advPaidFrom}
                    onChange={(e) => setAdvPaidFrom(e.target.value as any)}
                    className="w-full glass-input text-xs"
                  >
                    <option value="cash_box">نقداً من الصندوق (كاش)</option>
                    <option value="bank_account">تحويل بنكي / محفظة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم السند / الإيصال
                  </label>
                  <input
                    type="text"
                    value={advReceiptRef}
                    onChange={(e) => setAdvReceiptRef(e.target.value)}
                    placeholder="سند رقم..."
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  بيان وسبب السحبية
                </label>
                <input
                  type="text"
                  value={advReason}
                  onChange={(e) => setAdvReason(e.target.value)}
                  placeholder="مثال: سلفة علاجية، مصاريف شخصية، مقدماً من الراتب"
                  className="w-full glass-input text-xs"
                />
              </div>

              {/* Checkbox: Sync to cash expenses */}
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 cursor-pointer text-xs font-bold text-amber-900">
                <input
                  type="checkbox"
                  checked={advSyncToExpenses}
                  onChange={(e) => setAdvSyncToExpenses(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span>خصم المبلغ آلياً من رصيد الصندوق النقدي وتسجيل سند صرف مالي</span>
              </label>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  اعتماد السحبية النقدية
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DETAILED EMPLOYEE STATEMENT / PAYSLIP MODAL */}
      {selectedEmployeeForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-apple-modal border border-slate-100 text-right max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <FileText className="w-6 h-6" />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    كشف حساب ومسير راتب مفصل للموظف
                  </h3>
                  <span className="text-xs text-slate-500">
                    عن شهر: <b className="font-mono text-slate-800">{selectedMonth}</b> | {farmSettings.farmName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>

                <button
                  onClick={() => setSelectedEmployeeForStatement(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Employee Info Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">اسم الموظف:</span>
                <b className="text-slate-900 text-sm">{selectedEmployeeForStatement.name}</b>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">المسمى الوظيفي:</span>
                <span className="text-slate-800 font-bold">{selectedEmployeeForStatement.role}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">الراتب الأساسي:</span>
                <b className="font-mono text-slate-900">
                  {selectedEmployeeForStatement.monthlySalary.toLocaleString('ar-SA')} {farmSettings.currency}
                </b>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">قيمة اليومية:</span>
                <b className="font-mono text-indigo-700">
                  {selectedEmployeeForStatement.dailyWage.toLocaleString('ar-SA')} {farmSettings.currency}
                </b>
              </div>
            </div>

            {/* Calculations Breakdown Box */}
            {(() => {
              const ledgerItem = payrollLedger.find((l) => l.employee.id === selectedEmployeeForStatement.id);
              if (!ledgerItem) return null;

              return (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">الراتب الأساسي</span>
                      <b className="font-mono text-slate-900">
                        {ledgerItem.employee.monthlySalary.toLocaleString('ar-SA')}
                      </b>
                    </div>
                    <div>
                      <span className="text-rose-700 block text-[10px]">(-) خصومات الغياب</span>
                      <b className="font-mono text-rose-700">
                        -{ledgerItem.totalDeductions.toLocaleString('ar-SA')}
                      </b>
                    </div>
                    <div>
                      <span className="text-amber-700 block text-[10px]">(-) إجمالي السحبيات</span>
                      <b className="font-mono text-amber-700">
                        -{ledgerItem.totalAdvances.toLocaleString('ar-SA')}
                      </b>
                    </div>
                    <div>
                      <span className="text-emerald-900 block text-[10px]">(=) الصافي المتبقي</span>
                      <b className="font-mono text-sm text-emerald-800 font-black">
                        {ledgerItem.netRemaining.toLocaleString('ar-SA')} {farmSettings.currency}
                      </b>
                    </div>
                  </div>

                  {/* Attendance Log Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>تفاصيل أيام الغياب ونصف الدوام والخصومات ({ledgerItem.empAttendance.length} سجل)</span>
                    </h4>

                    {ledgerItem.empAttendance.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-right">
                          <thead className="bg-slate-100 text-slate-600 font-bold">
                            <tr>
                              <th className="p-2.5">التاريخ</th>
                              <th className="p-2.5">الحالة</th>
                              <th className="p-2.5 text-center">مبلغ الخصم</th>
                              <th className="p-2.5">البيان والملاحظات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ledgerItem.empAttendance.map((a) => (
                              <tr key={a.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono">{a.date}</td>
                                <td className="p-2.5">
                                  {a.status === 'present_full' && <span className="text-emerald-700 font-bold">حضور كامل</span>}
                                  {a.status === 'half_day' && <span className="text-amber-700 font-bold">نصف دوام</span>}
                                  {a.status === 'absent_full' && <span className="text-rose-700 font-bold">غياب كامل</span>}
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-rose-700">
                                  {a.deductionAmount > 0 ? `-${a.deductionAmount.toLocaleString('ar-SA')} ${farmSettings.currency}` : '0'}
                                </td>
                                <td className="p-2.5 text-slate-500">{a.notes || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 text-slate-400 text-xs text-center">
                        لا توجد غيابات أو خصومات مسجلة لهذا الموظف خلال الشهر.
                      </div>
                    )}
                  </div>

                  {/* Advances Log Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-amber-600" />
                      <span>تفاصيل السحبيات والسلف النقدية المصروفة ({ledgerItem.empAdvances.length} سحبية)</span>
                    </h4>

                    {ledgerItem.empAdvances.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-right">
                          <thead className="bg-slate-100 text-slate-600 font-bold">
                            <tr>
                              <th className="p-2.5">تاريخ السحب</th>
                              <th className="p-2.5 text-center">المبلغ</th>
                              <th className="p-2.5">طريقة الصرف</th>
                              <th className="p-2.5">البيان وسبب السحب</th>
                              <th className="p-2.5">رقم السند</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ledgerItem.empAdvances.map((adv) => (
                              <tr key={adv.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono">{adv.date}</td>
                                <td className="p-2.5 text-center font-mono font-black text-amber-700">
                                  {adv.amount.toLocaleString('ar-SA')} {farmSettings.currency}
                                </td>
                                <td className="p-2.5 text-slate-600">
                                  {adv.paidFrom === 'cash_box' ? 'الصندوق' : 'بنك'}
                                </td>
                                <td className="p-2.5 text-slate-700">{adv.reason || '-'}</td>
                                <td className="p-2.5 font-mono text-slate-500">{adv.receiptRef || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 text-slate-400 text-xs text-center">
                        لا توجد سحبيات نقدية مسجلة لهذا الموظف خلال الشهر.
                      </div>
                    )}
                  </div>

                  {/* Signature Footer for printed slip */}
                  <div className="pt-6 mt-6 border-t border-slate-200 grid grid-cols-3 text-center text-xs text-slate-600 font-bold">
                    <div>توقيع الموظف المستلم: ________</div>
                    <div>المسؤول المالي: ________</div>
                    <div>اعتماد مدير المزرعة: ________</div>
                  </div>
                </div>
              );
            })()}

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmployeeForStatement(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
