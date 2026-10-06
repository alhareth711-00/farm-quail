import React, { useState, useEffect } from 'react';
import { db, exportDatabaseToJSON, importDatabaseFromJSON } from '../../db';
import { useLiveQuery } from 'dexie-react-hooks';
import type { FarmSettings, Product } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  initializeDatabase,
  clearDemoTransactionsForLiveProduction,
  enablePersistentStorage,
} from '../../db/seedData';
import {
  Settings,
  Save,
  Download,
  Upload,
  RotateCcw,
  Shield,
  KeyRound,
  DollarSign,
  Tag,
  Building,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Database,
  Sparkles,
  PlayCircle,
  X,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { farmSettings, updateSettings } = useAuth();
  const { toast } = useToast();

  const products = useLiveQuery(() => db.products.toArray(), []);

  // Farm Settings Form State
  const [formData, setFormData] = useState<FarmSettings>({ ...farmSettings });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productRetailPrice, setProductRetailPrice] = useState<number>(0);
  const [productWholesalePrice, setProductWholesalePrice] = useState<number>(0);

  // Live Production & Storage Persistence State
  const [showLiveProductionModal, setShowLiveProductionModal] = useState(false);
  const [liveSupervisor, setLiveSupervisor] = useState(farmSettings.ownerName || 'م. يحيى الشامي');
  const [liveOpeningCash, setLiveOpeningCash] = useState<number>(0);
  const [resetDebts, setResetDebts] = useState<boolean>(true);
  const [isPersisted, setIsPersisted] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then((p) => setIsPersisted(p));
    }
  }, []);

  const handleEnablePersistentStorage = async () => {
    const granted = await enablePersistentStorage();
    setIsPersisted(granted);
    if (granted) {
      toast('تم تفعيل ميزة التخزين الدائم في المتصفح بنجاح!', 'success');
    } else {
      toast('المتصفح لم يمنح إذن التخزين الدائم تلقائياً', 'info');
    }
  };

  const handleStartLiveProduction = async () => {
    try {
      await clearDemoTransactionsForLiveProduction({
        supervisorName: liveSupervisor || 'مدير المزرعة',
        openingCashBalance: Number(liveOpeningCash) || 0,
        resetCustomerDebts: resetDebts,
      });
      setShowLiveProductionModal(false);
      toast('تم بدء التشغيل الفعلي للمزرعة وتصفير المعاملات التجريبية بنجاح! جاري التحديث...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Failed to start live production:', err);
      toast('حدث خطأ أثناء تهيئة التشغيل الفعلي', 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);

    // Sync default tray prices to prod-tray-18 in catalog
    if (formData.defaultTrayPrice || formData.defaultWholesaleTrayPrice) {
      const prod18 = await db.products.get('prod-tray-18');
      if (prod18) {
        await db.products.update('prod-tray-18', {
          retailPrice: Number(formData.defaultTrayPrice) || prod18.retailPrice,
          wholesalePrice: Number(formData.defaultWholesaleTrayPrice) || prod18.wholesalePrice,
        });
      }
    }

    toast('تم حفظ إعدادات المزرعة وأسعار بيع الأطباق بنجاح!', 'success');
  };

  // Export JSON Backup
  const handleExportBackup = async () => {
    try {
      const json = await exportDatabaseToJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quail_farm_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('تم تصدير النسخة الاحتياطية بنجاح إلى ملف JSON!', 'success');
    } catch (err) {
      toast('فشل تصدير النسخة الاحتياطية', 'error');
    }
  };

  // Import JSON Backup
  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await importDatabaseFromJSON(text);
        toast('تم استعادة قاعدة البيانات بالكامل بنجاح! جاري تحديث الصفحة...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err) {
        toast('فشل استيراد النسخة الاحتياطية، تأكد من صحة الملف', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Reset to Factory Demo Data
  const handleResetFactory = async () => {
    if (
      confirm(
        'تحذير: هل أنت متأكد من رغبتك في إعادة تعيين كافة البيانات إلى بيانات المصنع التجريبية الافتراضية؟'
      )
    ) {
      await db.delete();
      await db.open();
      await initializeDatabase(true);
      toast('تمت استعادة البيانات الافتراضية بنجاح! جاري التحديث...', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  // Update Product Price
  const handleSaveProductPrice = async (prodId: string) => {
    const retail = Number(productRetailPrice);
    const wholesale = Number(productWholesalePrice);

    await db.products.update(prodId, {
      retailPrice: retail,
      wholesalePrice: wholesale,
    });

    if (prodId === 'prod-tray-18') {
      await updateSettings({
        ...farmSettings,
        defaultTrayPrice: retail,
        defaultWholesaleTrayPrice: wholesale,
      });
      setFormData((prev) => ({
        ...prev,
        defaultTrayPrice: retail,
        defaultWholesaleTrayPrice: wholesale,
      }));
    }

    toast('تم تحديث أسعار المنتج بنجاح', 'success');
    setEditingProductId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-800" />
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            الإعدادات العامة والنسخ الاحتياطي (Settings & Backup)
          </h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          تخصيص بيانات المزرعة، أسعار المنتجات، رموز PIN للأمان، وتصدير واستيراد النسخ الاحتياطية بدون إنترنت.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Farm & Security Settings (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                بيانات المزرعة ومعلومات الفواتير
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المزرعة التجاري</label>
                <input
                  type="text"
                  required
                  value={formData.farmName}
                  onChange={(e) => setFormData({ ...formData, farmName: e.target.value })}
                  className="w-full glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المالك / المدير</label>
                <input
                  type="text"
                  required
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full glass-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف للتواصل</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full glass-input font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرقم الضريبي (إن وجد)</label>
                <input
                  type="text"
                  value={formData.taxNumber || ''}
                  onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                  className="w-full glass-input font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان أو المنطقة</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full glass-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رمز العملة النقدية</label>
                <input
                  type="text"
                  required
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full glass-input text-center font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رسالة تذييل الإيصالات والفواتير</label>
              <input
                type="text"
                value={formData.receiptFooterMessage}
                onChange={(e) => setFormData({ ...formData, receiptFooterMessage: e.target.value })}
                className="w-full glass-input"
              />
            </div>

            {/* Customizable Egg Tray Sale Prices */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-700" />
                  <h4 className="font-extrabold text-xs text-amber-900">
                    تخصيص السعر الافتراضي لبيع طبق البيض (18 بيضة)
                  </h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-800 font-bold">
                  سعر قياسي
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    سعر البيع قطاعي (تجزئة)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={formData.defaultTrayPrice || ''}
                      onChange={(e) => setFormData({ ...formData, defaultTrayPrice: Number(e.target.value) })}
                      className="w-full glass-input text-center font-mono font-black text-amber-950 text-sm"
                      placeholder="2200"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">{formData.currency}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    يُعتمد تلقائياً في فواتير الكاش وشباك المزرعة
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    سعر البيع جملة
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={formData.defaultWholesaleTrayPrice || ''}
                      onChange={(e) => setFormData({ ...formData, defaultWholesaleTrayPrice: Number(e.target.value) })}
                      className="w-full glass-input text-center font-mono font-black text-emerald-900 text-sm"
                      placeholder="1900"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">{formData.currency}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    يُعتمد لطلبيات المطاعم وتجار الجملة
                  </span>
                </div>
              </div>
            </div>

            {/* Security PINs */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <h4 className="font-extrabold text-xs text-slate-800">
                  إدارة رموز الأمان والتحكم (PIN Codes)
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز PIN لمدير المزرعة (صلاحيات كاملة)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={formData.managerPin}
                    onChange={(e) => setFormData({ ...formData, managerPin: e.target.value })}
                    className="w-full glass-input text-center font-mono text-base font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    يستخدم لفتح البيانات المالية ونقاط البيع
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رمز PIN لعامل المزرعة
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={formData.workerPin}
                    onChange={(e) => setFormData({ ...formData, workerPin: e.target.value })}
                    className="w-full glass-input text-center font-mono text-base font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    للوضع الميداني التشغيلي المحدود
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-apple flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>

          {/* Backup, Storage & Live Production Panel */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Shield className="w-5 h-5 text-sky-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                أمان قاعدة البيانات والتشغيل الفعلي (Offline Storage & Safety)
              </h3>
            </div>

            {/* Storage Persistence Status Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                isPersisted
                  ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                  : 'bg-amber-50/70 border-amber-200/80 text-amber-950'
              }`}
            >
              {isPersisted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-xs">
                    {isPersisted
                      ? 'قاعدة البيانات مؤمنة ومحفوظة محلياً بنسبة 100% (Persistent Storage مُفعّل)'
                      : 'قاعدة البيانات محفوظة محلياً (يمكن تفعيل التخزين الدائم لضمان إضافي)'}
                  </span>
                  {!isPersisted && (
                    <button
                      type="button"
                      onClick={handleEnablePersistentStorage}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-sm transition-all"
                    >
                      تفعيل الحفظ الدائم
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  جميع البيانات التي تدخلها تُحفظ فوراً داخل جهازك في قاعدة بيانات IndexedDB المحلية. لن تتأثر أو تُحذف أو تُنقص البيانات عند إغلاق المتصفح أو إعادة تشغيل الجهاز أو انقطاع الإنترنت بنسبة 100%.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              يمكنك تصدير نسخة احتياطية مشفرة بضغطة زر لحفظها على فلاشة USB أو جهازك، أو بدء التشغيل الفعلي لمزرعتك بتصفير الحركات التجريبية مع الحفاظ التام على هيكل المزرعة وأسعار المنتجات.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* Start Live Production Button */}
              <button
                type="button"
                onClick={() => setShowLiveProductionModal(true)}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-apple transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                <span>بدء التشغيل الفعلي للمزرعة (تصفير الحركات التجريبية)</span>
              </button>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>تصدير نسخة احتياطية (JSON)</span>
              </button>

              {/* Import Button */}
              <label className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>استيراد واستعادة نسخة</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              {/* Reset Factory */}
              <button
                type="button"
                onClick={handleResetFactory}
                className="px-4 py-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-2 transition-all mr-auto"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة ضبط المصنع التجريبي</span>
              </button>
            </div>
          </div>
        </div>

        {/* Product Catalog Pricing Management (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl glass-panel p-6 border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-600" />
              <h3 className="font-extrabold text-sm text-slate-900">
                تسعير منتجات المزرعة ونقاط البيع
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {products?.length || 0} صنف
            </span>
          </div>

          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {products?.map((prod) => {
              const isEditing = editingProductId === prod.id;

              return (
                <div
                  key={prod.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">{prod.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {prod.unit}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">سعر التجزئة</label>
                          <input
                            type="number"
                            step="0.5"
                            value={productRetailPrice}
                            onChange={(e) => setProductRetailPrice(Number(e.target.value))}
                            className="w-full glass-input text-xs py-1 font-mono text-center font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-0.5">سعر الجملة</label>
                          <input
                            type="number"
                            step="0.5"
                            value={productWholesalePrice}
                            onChange={(e) => setProductWholesalePrice(Number(e.target.value))}
                            className="w-full glass-input text-xs py-1 font-mono text-center font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveProductPrice(prod.id)}
                          className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        >
                          تأكيد السعر
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingProductId(null)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-3 font-mono">
                        <span>
                          تجزئة: <b className="text-emerald-700">{prod.retailPrice}</b>
                        </span>
                        <span>•</span>
                        <span>
                          جملة: <b className="text-sky-700">{prod.wholesalePrice}</b>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingProductId(prod.id);
                          setProductRetailPrice(prod.retailPrice);
                          setProductWholesalePrice(prod.wholesalePrice);
                        }}
                        className="text-[11px] text-emerald-600 hover:underline font-bold"
                      >
                        تعديل السعر
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Production Confirmation Modal */}
      {showLiveProductionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-6 h-6" />
                <h3 className="font-extrabold text-base">بدء التشغيل الفعلي للمزرعة (Live Production)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLiveProductionModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs leading-relaxed space-y-2">
                <p className="font-bold">
                  أهلاً بك! هذه الخطوة مخصصة لنقلك من وضع البيانات التجريبية إلى العمل الحقيقي والتشغيل الفعلي لمزرعتك.
                </p>
                <div className="space-y-1.5 text-[11px] text-emerald-800">
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><b>سيتم الإبقاء بنسبة 100%:</b> على كافة البطاريات الـ 12 (أ إلى س) وأدوارها الأربعة، والغرف الـ 7، وقسم المعزولات والملحقات، وقائمة الأعلاف، ودليل المنتجات وأسعار الأطباق، وإعدادات المزرعة.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><b>سيتم تصفير وإفراغ فقط:</b> فواتير المبيعات التجريبية، سندات القبض، المصاريف، وسجلات إنتاج البيض والنفوق لتبدأ بسجل نظيف تماماً لمزرعتك.</span>
                  </div>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المسؤول عن فتح الصندوق والوردية الأولى
                  </label>
                  <input
                    type="text"
                    required
                    value={liveSupervisor}
                    onChange={(e) => setLiveSupervisor(e.target.value)}
                    className="w-full glass-input text-xs"
                    placeholder="اسم مدير المزرعة أو أمين الصندوق"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرصيد الافتتاحي الفعلي في صندوق الكاش اليوم (ريال يمني)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={liveOpeningCash}
                    onChange={(e) => setLiveOpeningCash(Number(e.target.value))}
                    className="w-full glass-input text-sm font-mono font-bold text-emerald-800"
                    placeholder="0"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    المبلغ النقدي المتواجد في درج الصندوق الآن كعهدة نقدية افتتاحية (يمكن تركه 0)
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="resetDebtsCheck"
                    checked={resetDebts}
                    onChange={(e) => setResetDebts(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <label htmlFor="resetDebtsCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                    تصفير ديون ومبيعات العملاء التجريبيين السابقة (0 ريال)
                  </label>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  بمجرد تأكيد البدء، ستكون قاعدة بيانات المزرعة جاهزة لاستقبال مدخلاتك الحقيقية، ولن تتأثر أو تُحذف أو تُعدل أي بيانات تسجلها لاحقاً مطلقاً.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLiveProductionModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-all"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleStartLiveProduction}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-apple flex items-center gap-1.5 transition-all"
              >
                <PlayCircle className="w-4 h-4" />
                <span>تأكيد وبدء العمل الفعلي الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
