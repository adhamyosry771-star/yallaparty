
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageContext';

interface BanLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

export const BanLogsModal: React.FC<BanLogsModalProps> = ({ isOpen, onClose }) => {
  const { language: currentLang, t } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, "banLogs"), orderBy("timestamp", "desc"), limit(100));
    const unsubLogs = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const uQ = query(collection(db, "users"));
    const unsubUsers = onSnapshot(uQ, (snap) => {
      const map: Record<string, any> = {};
      snap.docs.forEach(doc => {
        map[doc.id] = doc.data();
      });
      setUsersMap(map);
    });

    return () => {
      unsubLogs();
      unsubUsers();
    };
  }, [isOpen]);

  const filteredLogs = logs.filter(log => {
    const search = searchTerm.toLowerCase();
    return (
      log.adminId?.toLowerCase().includes(search) ||
      log.adminName?.toLowerCase().includes(search) ||
      log.targetId?.toLowerCase().includes(search) ||
      log.targetName?.toLowerCase().includes(search)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-[#1a0b2e] w-full max-w-[400px] h-[80vh] rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden shadow-2xl animate-in zoom-in">
        <header className="p-6 border-b border-white/5 flex flex-col gap-4">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                <i className="fas fa-history"></i>
              </div>
              <h3 className="text-white font-black text-sm">{t('سجل عمليات الحظر', 'Ban Operations Log')}</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 text-white flex items-center justify-center border border-white/10">
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div className="relative group">
            <div className={`absolute ${currentLang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-orange-500 transition-colors`}>
              <i className="fas fa-search text-xs"></i>
            </div>
            <input 
              type="text" 
              placeholder={t("ابحث عن اسم أو ID...", "Search name or ID...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full bg-white/5 border border-white/10 rounded-xl py-2.5 ${currentLang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-white text-[11px] font-bold focus:outline-none focus:border-orange-500/50 transition-all`}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <i className="fas fa-circle-notch animate-spin text-purple-500 text-2xl"></i>
              <span className="text-[10px] text-white/40 font-bold">{t("جاري تحميل السجلات...", "Loading record history...")}</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <i className="fas fa-clipboard-list text-4xl text-white/5"></i>
              <p className="text-white/20 text-[10px] font-bold">{t("لا توجد عمليات تطابق بحثك", "No records match search parameters")}</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg ${log.action === 'ban' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                      {log.action === 'ban' ? t('عملية حظر', 'Banned') : t('فك حظر', 'Unbanned')}
                    </span>
                    <span className="text-[9px] text-white/40 font-bold">
                      {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString(currentLang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { numberingSystem: 'latn' }) : ''}
                    </span>
                  </div>
                  <i className={`fas ${log.action === 'ban' ? 'fa-user-slash text-red-500/40' : 'fa-user-check text-green-500/40'} text-xs`}></i>
                </div>

                {(() => {
                  const adminLive = usersMap[log.adminId];
                  const targetLive = usersMap[log.targetId];
                  const adminPhoto = adminLive?.animatedAvatar || adminLive?.photoURL || log.adminPhoto || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>";
                  const targetPhoto = targetLive?.animatedAvatar || targetLive?.photoURL || log.targetPhoto || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>";
                  const adminNameText = adminLive?.displayName || log.adminName || t('مسؤول', 'Admin');
                  const targetNameText = targetLive?.displayName || log.targetName || t('مستخدم', 'User');

                  const isVideoUrl = (url?: string | null) => {
                    if (!url) return false;
                    return url.includes('mp4') || url.includes('webm') || url.includes('mov') || url.includes('video') || url.includes('data:video');
                  };

                  return (
                    <div className="grid grid-cols-2 gap-4 pt-1 text-start">
                      <div className="space-y-1">
                        <p className="text-[8px] text-white/30 font-black uppercase text-start">{t('المسؤول', 'Admin')}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border border-white/10 overflow-hidden flex-shrink-0 bg-purple-950">
                            {isVideoUrl(adminPhoto) ? (
                              <video src={adminPhoto} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            ) : (
                              <img src={adminPhoto} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-white truncate text-start">{adminNameText}</p>
                            <p className="text-[7px] text-white/30 font-mono truncate select-all text-start">{log.adminId}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] text-white/30 font-black uppercase text-start">{t('المستهدف', 'Target')}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full border border-white/10 overflow-hidden flex-shrink-0 bg-purple-950">
                            {isVideoUrl(targetPhoto) ? (
                              <video src={targetPhoto} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            ) : (
                              <img src={targetPhoto} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0">
                             <p className="text-[10px] font-black text-white truncate text-start">{targetNameText}</p>
                             <p className="text-[7px] text-white/30 font-mono truncate select-all text-start">{log.targetId}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {log.action === 'ban' && (
                  <div className="pt-2 border-t border-white/5 flex gap-4">
                    <div className="flex-1">
                      <p className="text-[8px] text-white/30 font-black mb-0.5 text-start">{t('مدة الحظر', 'Ban Duration')}</p>
                      <p className="text-[9px] text-orange-400 font-black text-start">
                        {log.duration === 'permanent' ? t('حظر نهائي', 'Permanent') : (currentLang === 'ar' ? `${log.duration} يوم` : `${log.duration} Days`)}
                      </p>
                    </div>
                    <div className="flex-1 text-start">
                      <p className={`text-[8px] text-white/30 font-black mb-0.5 ${currentLang === 'ar' ? 'text-left' : 'text-right'}`}>{t('ينتهي في', 'Expires At')}</p>
                      <p className={`text-[9px] text-white/60 font-medium ${currentLang === 'ar' ? 'text-left' : 'text-right'}`}>
                        {new Date(log.banUntil).toLocaleString(currentLang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { numberingSystem: 'latn' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
