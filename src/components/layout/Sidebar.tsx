import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Grid,
  Warehouse,
  Egg,
  EggFried,
  Scale,
  HeartPulse,
  ShoppingCart,
  Users,
  WalletCards,
  LineChart,
  Settings,
  ShieldCheck,
  HardDriveDownload,
  Fan,
  Skull,
  Coins,
  UserCheck,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'batteries'
  | 'rooms'
  | 'equipment'
  | 'mortality'
  | 'egg_production'
  | 'egg_inventory'
  | 'incubation'
  | 'fattening'
  | 'health_feed'
  | 'cash_register'
  | 'pos'
  | 'customers'
  | 'employees_payroll'
  | 'finance'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { isManager, isWorker } = useAuth();

  const primaryNavItems: { id: NavTab; label: string; icon: React.ReactNode; managerOnly?: boolean }[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'batteries',
      label: 'عنبر البطاريات (الأقفاص)',
      icon: <Grid className="w-5 h-5" />,
    },
    {
      id: 'rooms',
      label: 'عنبر التربية الأرضية',
      icon: <Warehouse className="w-5 h-5" />,
    },
    {
      id: 'equipment',
      label: 'السجل البيئي والمعدات',
      icon: <Fan className="w-5 h-5" />,
    },
    {
      id: 'mortality',
      label: 'سجل النفوق التفصيلي',
      icon: <Skull className="w-5 h-5" />,
    },
    {
      id: 'egg_production',
      label: 'سجل إنتاج البيض المعياري',
      icon: <Egg className="w-5 h-5" />,
    },
    {
      id: 'egg_inventory',
      label: 'مخزن أقفاص البيض (FIFO)',
      icon: <Warehouse className="w-5 h-5" />,
    },
    {
      id: 'incubation',
      label: 'إدارة الفقاسات والتحضين',
      icon: <EggFried className="w-5 h-5" />,
    },
    {
      id: 'fattening',
      label: 'التسمين واللحوم والمجزرة',
      icon: <Scale className="w-5 h-5" />,
    },
    {
      id: 'health_feed',
      label: 'الأعلاف والسجل الصحي',
      icon: <HeartPulse className="w-5 h-5" />,
    },
    {
      id: 'cash_register',
      label: 'مطابقة الصندوق والوردية',
      icon: <Coins className="w-5 h-5" />,
    },
    {
      id: 'pos',
      label: 'نقاط البيع والفواتير',
      icon: <ShoppingCart className="w-5 h-5" />,
      managerOnly: true,
    },
    {
      id: 'customers',
      label: 'العملاء وكشوف الحسابات',
      icon: <Users className="w-5 h-5" />,
      managerOnly: true,
    },
    {
      id: 'employees_payroll',
      label: 'سحبيات ورواتب الموظفين',
      icon: <UserCheck className="w-5 h-5" />,
      managerOnly: true,
    },
    {
      id: 'finance',
      label: 'المصروفات والمالية والأرباح',
      icon: <WalletCards className="w-5 h-5" />,
      managerOnly: true,
    },
    {
      id: 'analytics',
      label: 'التحليلات والمقارنات',
      icon: <LineChart className="w-5 h-5" />,
      managerOnly: true,
    },
    {
      id: 'settings',
      label: 'الإعدادات والنسخ الاحتياطي',
      icon: <Settings className="w-5 h-5" />,
      managerOnly: true,
    },
  ];

  const visibleItems = primaryNavItems.filter((item) => (isManager ? true : !item.managerOnly));

  return (
    <aside className="w-64 bg-white/70 backdrop-blur-xl border-l border-slate-200/80 flex flex-col h-screen shrink-0 select-none">
      {/* Brand logo & emblem */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-400 flex items-center justify-center text-white shadow-soft-glow">
          <Egg className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div>
          <div className="font-extrabold text-slate-800 text-sm leading-tight">
            نظام سمان ERP
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            إدارة المزرعة المتكاملة
          </div>
        </div>
      </div>

      {/* Mode Badge Info */}
      <div className="px-4 py-2.5">
        <div
          className={`p-2.5 rounded-2xl text-xs flex items-center gap-2 border transition-all ${
            isManager
              ? 'bg-emerald-50/70 border-emerald-200/60 text-emerald-900'
              : 'bg-sky-50/70 border-sky-200/60 text-sky-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
          <div className="text-[11px] leading-tight font-medium">
            {isManager ? (
              <span>وضع المدير (البيانات المالية مفعلة)</span>
            ) : (
              <span>وضع العامل (التسجيل الميداني فقط)</span>
            )}
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-right duration-200 ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 translate-x-[-2px]'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <span
                className={`transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              >
                {item.icon}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Info */}
      <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 text-center font-medium">
        <span>يعمل محلياً 100% Offline-First</span>
      </div>
    </aside>
  );
};
