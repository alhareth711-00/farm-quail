import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { initializeDatabase } from './db/seedData';

// Layout
import { Header } from './components/layout/Header';
import { Sidebar, type NavTab } from './components/layout/Sidebar';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { BatteryGridView } from './components/batteries/BatteryGridView';
import { RoomsView } from './components/rooms/RoomsView';
import { EggProductionLogView } from './components/eggProduction/EggProductionLogView';
import { EggInventoryView } from './components/inventory/EggInventoryView';
import { IncubatorTrackerView } from './components/incubation/IncubatorTrackerView';
import { FatteningMeatView } from './components/fattening/FatteningMeatView';
import { HealthFeedView } from './components/healthFeed/HealthFeedView';
import { POSView } from './components/pos/POSView';
import { CustomersView } from './components/customers/CustomersView';
import { ProductsManagementView } from './components/products/ProductsManagementView';
import { FinanceView } from './components/finance/FinanceView';
import { CashRegisterView } from './components/finance/CashRegisterView';
import { EquipmentLogView } from './components/equipment/EquipmentLogView';
import { MortalityLogView } from './components/mortality/MortalityLogView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { SettingsView } from './components/settings/SettingsView';
import { EmployeesPayrollView } from './components/payroll/EmployeesPayrollView';

const MainAppContent: React.FC = () => {
  const { isManager } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isDbReady, setIsDbReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setIsDbReady(true))
      .catch((err) => {
        console.error('Database init error:', err);
        setIsDbReady(true);
      });
  }, []);

  // Ensure worker cannot stay on manager tabs
  useEffect(() => {
    const managerTabs: NavTab[] = ['pos', 'products', 'customers', 'finance', 'analytics', 'settings'];
    if (!isManager && managerTabs.includes(activeTab)) {
      setActiveTab('dashboard');
      toast('تم تحويلك إلى لوحة التحكم (البيانات المالية مقتصرة على وضع المدير)', 'info');
    }
  }, [isManager, activeTab, toast]);

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">جاري تهيئة قاعدة بيانات نظام السمان الذكي...</p>
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
      case 'batteries':
        return <BatteryGridView />;
      case 'rooms':
        return <RoomsView />;
      case 'equipment':
        return <EquipmentLogView />;
      case 'mortality':
        return <MortalityLogView />;
      case 'egg_production':
        return <EggProductionLogView />;
      case 'egg_inventory':
        return <EggInventoryView />;
      case 'incubation':
        return <IncubatorTrackerView />;
      case 'fattening':
        return <FatteningMeatView />;
      case 'health_feed':
        return <HealthFeedView />;
      case 'cash_register':
        return <CashRegisterView />;
      case 'pos':
        return <POSView />;
      case 'products':
        return <ProductsManagementView onNavigateToPOS={() => setActiveTab('pos')} />;
      case 'customers':
        return <CustomersView />;
      case 'employees_payroll':
        return <EmployeesPayrollView />;
      case 'finance':
        return <FinanceView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 antialiased overflow-hidden font-almarai selection:bg-emerald-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainAppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
