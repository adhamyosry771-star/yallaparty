import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, deleteDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageContext';

interface RoomReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

export const RoomReportsModal: React.FC<RoomReportsModalProps> = ({ isOpen, onClose }) => {
  const { language: currentLang, t } = useLanguage();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(q, (snap) => {
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, (err) => {
        console.error(err);
        setLoading(false);
      });
      return () => unsub();
    }
  }, [isOpen]);

  const handleRemoveReport = async (reportId: string) => {
    if (!window.confirm(t("هل أنت متأكد من حذف هذا البلاغ؟", "Are you sure you want to delete this report?"))) return;
    try {
      await deleteDoc(doc(db, "reports", reportId));
    } catch (e) {
      alert(t("حدث خطأ أثناء حذف البلاغ", "An error occurred while deleting the report"));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1a0b2e] w-full max-w-[450px] h-[85vh] rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden shadow-2xl"
      >
        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-amber-600/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
              <i className="fas fa-file-invoice"></i>
            </div>
            <div className="text-start">
              <h3 className="text-white font-black text-sm">{t("بلاغات الغرف", "Room Reports")}</h3>
              <p className="text-[9px] text-amber-300/50 font-bold uppercase tracking-wider">Room Reports Center</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 text-white/40 flex items-center justify-center border border-white/10 active:scale-95">
            <i className="fas fa-times text-xs"></i>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20"><i className="fas fa-circle-notch animate-spin text-amber-500 text-2xl"></i></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-20 text-white/20 text-xs">{t("لا يوجد بلاغات حالياً", "No reports currently found")}</div>
          ) : reports.map(report => (
            <div key={report.id} className="bg-white/5 border border-white/5 rounded-3xl p-4 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-white/5 flex-shrink-0">
                    <i className="fas fa-bullhorn text-sm"></i>
                  </div>
                  <div className="text-start min-w-0">
                    <p className="text-[11px] font-black text-white truncate">{report.roomName}</p>
                    <p className="text-[9px] font-bold text-white/40">Room ID: {report.roomId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveReport(report.id)}
                  className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center active:scale-90 transition-all border border-red-500/10 flex-shrink-0"
                >
                  <i className="fas fa-trash-alt text-[10px]"></i>
                </button>
              </div>

              <div className="p-3 bg-black/20 rounded-2xl space-y-3 text-start">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-amber-500/60 transition-all">{t("السبب:", "Reason:")}</span>
                    <span className="text-[10px] font-black text-red-400">{report.reason}</span>
                  </div>
                  <p className="text-[10px] font-bold text-white/60 leading-relaxed">"{report.details}"</p>
                </div>

                <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-start">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/20 uppercase">{t("صاحب الغرفة", "Room Owner")}</span>
                    <span className="text-[9px] font-bold text-white/60">ID: {report.roomOwnerCustomId || t('مجهول', 'Unknown')}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/20 uppercase">{t("المُبلغ", "Reporter")}</span>
                    <span className="text-[9px] font-bold text-white/60">ID: {report.reporterCustomId || t('مجهول', 'Unknown')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1 px-1">
                <div className="flex items-center gap-1.5 text-white/20">
                  <i className="fas fa-clock text-[8px]"></i>
                  <span className="text-[8px] font-bold">{report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString(currentLang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { numberingSystem: 'latn' }) : t('جاري التحميل...', 'Loading...')}</span>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter">Report #{report.id.slice(-4)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
