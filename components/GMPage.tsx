import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { 
  collection, addDoc, serverTimestamp, onSnapshot, 
  query, orderBy, deleteDoc, doc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useLanguage } from '../LanguageContext';

interface GMPageProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBanSystem: () => void;
  onOpenBanLogs: () => void;
  onOpenGiveItems: () => void;
  onOpenRoomsManagement: () => void;
  onOpenRoomReports: () => void;
  language?: string;
}

export const GMPage: React.FC<GMPageProps> = ({ 
  isOpen, onClose, onOpenBanSystem, onOpenBanLogs, 
  onOpenGiveItems, onOpenRoomsManagement, onOpenRoomReports,
  language = 'ar'
}) => {
  const { language: currentLang, t } = useLanguage();
  const [view, setView] = useState<'menu' | 'banners'>('menu');
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) {
      setCurrentSlideIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % banners.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [banners]);

  useEffect(() => {
    if (!isOpen || view !== 'banners') return;

    const q = query(collection(db, "banners"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setBanners(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [isOpen, view]);

  const handlePublishBanner = async () => {
    if (!bannerImage || !bannerImage.trim()) return alert(t("يرجى إدخال رابط صورة البنر", "Please specify a banner image URL"));
    setIsPublishing(true);
    try {
      await addDoc(collection(db, "banners"), {
        title: bannerTitle,
        imageUrl: bannerImage,
        createdAt: serverTimestamp()
      });
      setBannerTitle('');
      setBannerImage(null);
      alert(t("تم نشر البنر بنجاح", "Banner published successfully"));
    } catch (e) {
      console.error(e);
      alert(t("خطأ في النشر", "Failed to publish"));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (confirm(t("هل تريد حذف هذا البنر؟", "Delete this banner?"))) {
      try {
        await deleteDoc(doc(db, "banners", id));
      } catch (e) {
        alert(t("خطأ في الحذف", "Failed to delete"));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ x: currentLang === 'ar' ? '100%' : '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: currentLang === 'ar' ? '100%' : '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[550] bg-[#0d051a] flex flex-col"
      dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <header className="p-6 border-b border-white/5 flex items-center gap-4 bg-blue-600/5">
        <button 
          onClick={view === 'banners' ? () => setView('menu') : onClose} 
          className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white border border-white/10 active:scale-90 transition-all"
        >
          <i className={`fas ${view === 'banners' ? (currentLang === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left') : (currentLang === 'ar' ? 'fa-chevron-right' : 'fa-chevron-left')}`}></i>
        </button>
        <div>
          <h2 className="text-lg font-black text-white">
            {view === 'banners' ? t('إدارة البنرات', 'Manage Banners') : t('نظام المدير العام', 'General Manager Panel')}
          </h2>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
            {view === 'banners' ? 'Banner Management' : 'General Manager Panel'}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {view === 'menu' ? (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl mb-4">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500 text-xl">
                    <i className="fas fa-shield-halved"></i>
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm">{t('مرحباً بالسيد المدير', 'Welcome, Administrator')}</h3>
                    <p className="text-white/40 text-[10px] font-bold">{t('لديك كامل الصلاحيات لإدارة المحتوى والمستخدمين.', 'You have full administration privileges.')}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 text-start">
                <button 
                  onClick={() => setView('banners')}
                  className="w-full flex items-center gap-4 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-emerald-500/20 group text-start"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                    <i className="fas fa-images text-xl"></i>
                  </div>
                  <div className="flex flex-col items-start text-start min-w-0">
                    <span className="font-black text-sm text-emerald-100 tracking-wide">{t('إدارة البنرات المتحركه', 'Manage Sliding Banners')}</span>
                    <span className="text-[10px] text-emerald-500/60 font-bold truncate w-full">{t('رفع صور بنرات جديدة لواجهة التطبيق', 'Upload home banner slide images')}</span>
                  </div>
                </button>

                <button 
                  onClick={onOpenBanSystem}
                  className="w-full flex items-center gap-4 p-5 bg-red-500/10 border border-red-500/20 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-red-500/20 group text-start"
                >
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                    <i className="fas fa-user-slash text-xl"></i>
                  </div>
                  <div className="flex flex-col items-start text-start min-w-0">
                    <span className="font-black text-sm text-red-100 tracking-wide">{t('نظام حظر المستخدمين', 'User Ban System')}</span>
                    <span className="text-[10px] text-red-500/60 font-bold truncate w-full">{t('إدارة عمليات الحظر وفك الحظر', 'Ban and unban application users')}</span>
                  </div>
                </button>

                <button 
                  onClick={onOpenBanLogs}
                  className="w-full flex items-center gap-4 p-5 bg-orange-500/10 border border-orange-500/20 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-orange-500/20 group text-start"
                >
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                    <i className="fas fa-history text-xl"></i>
                  </div>
                  <div className="flex flex-col items-start text-start min-w-0">
                    <span className="font-black text-sm text-orange-100 tracking-wide">{t('سجلات الحظر', 'Ban Operations Logs')}</span>
                    <span className="text-[10px] text-orange-500/60 font-bold truncate w-full">{t('عرض تاريخ جميع عمليات الحظر', 'View the history of all user bans')}</span>
                  </div>
                </button>

                <button 
                  onClick={onOpenGiveItems}
                  className="w-full flex items-center gap-4 p-5 bg-purple-500/10 border border-purple-500/20 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-purple-500/20 group text-start"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-500 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                    <i className="fas fa-gift text-xl"></i>
                  </div>
                  <div className="flex flex-col items-start text-start min-w-0">
                    <span className="font-black text-sm text-purple-100 tracking-wide">{t('إعطاء عناصر المتجر', 'Grant Store Items')}</span>
                    <span className="text-[10px] text-purple-500/60 font-bold truncate w-full">{t('منح إطارات أو دخوليات أو خلفيات للمستخدمين', 'Grant custom profile frames, room entries, or wallpapers')}</span>
                  </div>
                </button>

                <button 
                  onClick={onOpenRoomsManagement}
                  className="w-full flex items-center gap-4 p-5 bg-blue-500/10 border border-blue-500/20 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-blue-500/20 group text-start"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                    <i className="fas fa-door-open text-xl"></i>
                  </div>
                  <div className="flex flex-col items-start text-start min-w-0">
                    <span className="font-black text-sm text-blue-100 tracking-wide">{t('إدارة وحذف الغرف', 'Rooms Management')}</span>
                    <span className="text-[10px] text-blue-500/60 font-bold truncate w-full">{t('تحذير أصحاب الغرف أو حذفها نهائياً', 'Warn room owners or terminate active rooms')}</span>
                  </div>
                </button>

                <button 
                  onClick={onOpenRoomReports}
                  className="w-full flex items-center gap-4 p-5 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-amber-500/20 group text-start"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
                    <i className="fas fa-file-invoice text-xl"></i>
                  </div>
                  <div className="flex flex-col items-start text-start min-w-0">
                    <span className="font-black text-sm text-amber-100 tracking-wide">{t('استلام بلاغات الغرف', 'Receive Room Reports')}</span>
                    <span className="text-[10px] text-amber-500/60 font-bold truncate w-full">{t('مراجعة البلاغات المقدمة ضد الغرف', 'Investigate user reports and complaints against channels')}</span>
                  </div>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="banners"
              initial={{ opacity: 0, x: currentLang === 'ar' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: currentLang === 'ar' ? 20 : -20 }}
              className="space-y-6"
            >
              <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[100px] -mr-16 -mt-16"></div>
                
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <i className="fas fa-paper-plane text-emerald-400"></i>
                  {t('إضافة بنر جديد', 'Add New Banner')}
                </h3>

                <div className="space-y-4">
                  <input 
                    type="text" 
                    value={bannerTitle} 
                    onChange={e => setBannerTitle(e.target.value)} 
                    placeholder={t('عنوان البنر (اختياري)...', 'Banner Title (optional)...')} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-emerald-500/30 font-bold"
                  />
                  
                  <input 
                    type="text" 
                    value={bannerImage || ''} 
                    onChange={e => setBannerImage(e.target.value)} 
                    placeholder={t('أدخل رابط البنر المباشر هنا...', 'Enter direct banner image URL here...')} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-emerald-500/30 font-bold text-left placeholder:text-white/20"
                    dir="ltr"
                  />

                  {bannerImage && bannerImage.trim() !== '' && (
                    <div className="w-full aspect-[792/236] rounded-2xl overflow-hidden border border-white/10 relative bg-black/40 animate-fade-in">
                      <img src={bannerImage} className="w-full h-full object-cover" alt="Banner Preview" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x250/100623/FFF?text=Image+URL+Preview'; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex flex-col justify-end">
                        <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest">{t('معاينة البنر المباشر', 'Direct Banner Preview')}</span>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handlePublishBanner}
                    disabled={isPublishing || !bannerImage || !bannerImage.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isPublishing ? (
                      <i className="fas fa-spinner animate-spin"></i>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        <span>{t('نشر البنر', 'Publish Banner')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest">{t('البنرات النشطة حالياً', 'Currently Active Banners')}</h4>
                </div>

                {banners.length > 0 ? (
                  <div className="w-full aspect-[792/236] rounded-3xl overflow-hidden relative shadow-2xl border border-white/10 bg-black/40 group">
                    {/* Sliding Banners rendering exactly like home slider */}
                    {banners.map((banner, index) => (
                      <div 
                        key={banner.id} 
                        className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlideIndex ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                      >
                        <img src={banner.imageUrl} className="w-full h-full object-cover" alt={banner.title} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent p-5 flex flex-col justify-end">
                          <h4 className="font-black text-sm text-white text-shadow-sm">{banner.title || t('بدون عنوان', 'Untitled')}</h4>
                          <p className="text-[9px] text-emerald-400 mt-1 font-bold uppercase tracking-widest">{t('بنر متحرك نشط', 'Active Sliding Banner')}</p>
                        </div>

                        {/* Slide specific delete button */}
                        <div className="absolute top-4 right-4 z-30 flex gap-2">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBanner(banner.id);
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90"
                            title={t('حذف هذا البنر', 'Delete this banner')}
                          >
                            <i className="fas fa-trash-alt text-xs"></i>
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Navigation Buttons */}
                    {banners.length > 1 && (
                      <>
                        <button 
                          type="button"
                          onClick={() => setCurrentSlideIndex(prev => (prev - 1 + banners.length) % banners.length)}
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-xl bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                        >
                          <i className="fas fa-chevron-left text-xs"></i>
                        </button>
                        <button 
                          type="button"
                          onClick={() => setCurrentSlideIndex(prev => (prev + 1) % banners.length)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-xl bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all"
                        >
                          <i className="fas fa-chevron-right text-xs"></i>
                        </button>

                        {/* Indicators dots */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 bg-black/30 px-3 py-1.5 rounded-full">
                          {banners.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setCurrentSlideIndex(i)}
                              className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentSlideIndex ? 'bg-emerald-400 w-3' : 'bg-white/40'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="py-20 text-center opacity-20 flex flex-col items-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                    <i className="fas fa-images text-4xl mb-2"></i>
                    <p className="text-[10px] font-black uppercase tracking-widest">{t('لا توجد بنرات حالياً', 'No banners found')}</p>
                  </div>
                )}

                {/* Individual list details for easy management / jumping */}
                {banners.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-56 overflow-y-auto pr-1">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{t('قائمة البنرات لسهولة التحكم', 'Banners Control List')}</p>
                    {banners.map((banner, index) => (
                      <div 
                        key={banner.id}
                        onClick={() => setCurrentSlideIndex(index)}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer ${index === currentSlideIndex ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                      >
                        <img src={banner.imageUrl} className="w-16 h-8 rounded-lg object-cover bg-black/40 border border-white/10" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{banner.title || t('بدون عنوان', 'Untitled')}</p>
                          <p className="text-[9px] text-white/30 truncate text-left" dir="ltr">{banner.imageUrl}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBanner(banner.id);
                          }}
                          className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all active:scale-95"
                        >
                          <i className="fas fa-trash-alt text-[10px]"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <footer className="p-8 text-center bg-gradient-to-t from-blue-600/5 to-transparent">
      </footer>
    </motion.div>
  );
};

