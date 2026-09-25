import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageContext';

interface RoomBanModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
}

export const RoomBanModal: React.FC<RoomBanModalProps> = ({ isOpen, onClose, roomName }) => {
  const { language, t } = useLanguage();

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
                <i className="fas fa-door-closed text-2xl text-red-400"></i>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-white font-black text-lg">{t("عذراً، لا يمكنك الدخول", "Sorry, you cannot enter")}</h3>
                <p className="text-white/60 text-xs leading-relaxed font-bold">
                  {t("لا يمكنك الدخول لقد تم طردك من الغرفة", "You cannot enter, you have been kicked/banned from this room")}
                </p>
              </div>

              <div className="w-full space-y-3 bg-black/20 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-white/40 uppercase">{t("اسم الغرفة", "Room Name")}</span>
                  <span className="text-[11px] font-black text-purple-400">{roomName}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2">
                  <span className="text-[10px] font-black text-white/40 uppercase">{t("الحالة", "Status")}</span>
                  <span className="text-[10px] font-black text-red-400 font-bold">{t("مطرود / محظور", "Kicked / Banned")}</span>
                </div>
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
