import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ShieldAlert, 
  UserCheck, 
  Lock, 
  KeyRound, 
  X, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export const Header: React.FC = () => {
  const { role, isManager, switchRole, farmSettings } = useAuth();
  const { toast } = useToast();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for active withdrawal periods (Bio-security alerts)
  const activeWithdrawals = useLiveQuery(async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    return await db.medicationSchedules
      .filter((m) => m.hasWithdrawal && !!m.withdrawalEndDate && m.withdrawalEndDate >= todayStr)
      .toArray();
  }, []);

  const handleRoleToggle = () => {
    if (isManager) {
      // Switching to worker requires no PIN
      switchRole('worker');
      toast('تم التبديل إلى وضع عامل المزرعة (الواجهة التشغيلية المبسطة)', 'info');
    } else {
      // Switching to manager requires PIN
      setShowPinModal(true);
      setPinInput('');
      setPinError(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await switchRole('manager', pinInput);
    if (success) {
      setShowPinModal(false);
      setPinInput('');
      toast('مرحباً بك مجدداً يا مدير المزرعة! تم تفعيل كامل الصلاحيات والبيانات المالية', 'success');
    } else {
      setPinError(true);
      toast('رمز PIN غير صحيح! الرمز الافتراضي هو 1234', 'error');
    }
  };

  const formattedDate = currentTime.toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 transition-all">
        <div className="flex items-center justify-between gap-4">
          {/* Farm Title & Time */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  {farmSettings.farmName}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  نظام السمان الذكي v2.0
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                <span>{formattedDate}</span>
                <span>•</span>
                <span className="font-mono text-emerald-600">{formattedTime}</span>
              </div>
            </div>
          </div>

          {/* Center: Bio-Security Withdrawal Caution Banner if active */}
          {activeWithdrawals && activeWithdrawals.length > 0 && (
            <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-900 text-xs font-semibold animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                تحذير أمان حيوي: فترة سحب دواء نشطة حتى{' '}
                <span className="underline font-bold font-mono">
                  {activeWithdrawals[0].withdrawalEndDate}
                </span>{' '}
                ({activeWithdrawals[0].name})
              </span>
            </div>
          )}

          {/* User Role Switcher Pill */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRoleToggle}
              className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 shadow-sm ${
                isManager
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-apple-hover'
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:shadow-apple-hover'
              }`}
              title="انقر لتبديل وضع الصلاحيات (مدير / عامل)"
            >
              {isManager ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>مدير المزرعة (صلاحيات كاملة)</span>
                  <Lock className="w-3.5 h-3.5 opacity-80" />
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>عامل المزرعة (الوضع التشغيلي)</span>
                  <KeyRound className="w-3.5 h-3.5 opacity-80" />
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Manager PIN Access Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-apple-modal border border-slate-100 text-right">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              تسجيل دخول مدير المزرعة
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              أدخل رمز PIN للمدير لفتح لوحة التحكم والبيانات المالية ونقاط البيع (الرمز الافتراضي: 1234)
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="• • • •"
                  autoFocus
                  className={`w-full text-center text-2xl tracking-widest font-mono py-2.5 rounded-2xl border ${
                    pinError
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500'
                  }`}
                />
                {pinError && (
                  <p className="text-[11px] text-rose-600 mt-1 text-center font-medium">
                    الرمز غير صحيح، يرجى المحاولة مرة أخرى
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  تأكيد الدخول
                </button>
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
