
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageContext';

interface BanModalProps {
  isOpen: boolean;
  onClose: () => void;
  banUntil: string;
}

export const BanModal: React.FC<BanModalProps> = ({ isOpen, onClose, banUntil }) => {
  const { language, t } = useLanguage();
  const banDate = new Date(banUntil);
  const now = new Date();
  const isPermanent = banDate.getFullYear() >= 2090;
  
  const formatDate = (date: Date) => {
    return date.toLocaleString(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      numberingSystem: 'latn'
    });
  };

  const getDurationText = () => {
    if (isPermanent) return t("حظر نهائي", "Permanent Ban");
    const diff = banDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days >= 360) return t("سنة واحدة", "1 Year");
    if (days >= 30) return t("شهر واحد", "1 Month");
    if (days >= 7) return t("أسبوع واحد", "1 Week");
    if (days >= 1) return t("يوم واحد", "1 Day");
    return t("بضع ساعات", "A few hours");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-[320px] bg-[#2d0f4d]/85 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl"
          >
            <div className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <i className="fas fa-user-slash text-2xl text-red-400"></i>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-white font-black text-lg">{t("عذراً، لقد تم حظر حسابك", "Sorry, your account has been banned")}</h3>
                <p className="text-white/60 text-xs leading-relaxed font-bold">
                  {t("تم اتخاذ هذا الإجراء بسبب مخالفة شروط الاستخدام.", "This action was taken due to a violation of our Terms of Service.")}
                </p>
              </div>

              <div className="w-full space-y-3 bg-black/20 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/40 uppercase">{t("مدة الحظر", "Ban Duration")}</span>
                  <span className="text-[11px] font-black text-red-400">{getDurationText()}</span>
                </div>
                {!isPermanent && (
                  <div className="flex justify-between items-center border-t border-white/5 pt-2">
                    <span className="text-[10px] font-black text-white/40 uppercase">{t("ينتهي في", "Expires At")}</span>
                    <span className="text-[10px] font-black text-white/70">{formatDate(banDate)}</span>
                  </div>
                )}
              </div>

              <button 
                onClick={onClose}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-4 rounded-2xl font-black text-[11px] text-white shadow-xl active:scale-95 transition-all"
              >
                {t("إغلاق", "Close")}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
