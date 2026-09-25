
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useLanguage } from '../LanguageContext';

interface NotificationItemProps {
  id: string;
  icon: string;
  title: string;
  desc: string;
  time: string;
  image?: string;
  isOfficial?: boolean;
  type?: string;
  senderUid?: string;
  senderName?: string;
  onRefresh?: () => void;
  likes?: string[];
}

const NotificationItem: React.FC<NotificationItemProps> = ({ id, icon, title, desc, time, image, isOfficial, type, senderUid, senderName, likes = [] }) => {
  const { language, t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const currentUser = auth.currentUser;
  
  const isMediaIcon = typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('data:'));
  
  const isVideo = (url: string) => {
    return typeof url === 'string' && (url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video'));
  };

  const likesArray = Array.isArray(likes) ? likes : [];
  const didLike = currentUser ? likesArray.includes(currentUser.uid) : false;
  const likesCount = likesArray.length;

  const handleLikeToggle = async () => {
    if (!currentUser || !isOfficial) return;
    const docRef = doc(db, "officialNotifications", id);
    try {
      let updatedLikes: string[] = [];
      if (didLike) {
        updatedLikes = likesArray.filter(uid => uid !== currentUser.uid);
      } else {
        updatedLikes = [...likesArray, currentUser.uid];
      }
      await updateDoc(docRef, { likes: updatedLikes });
    } catch (e) {
      console.error("Error updating likes:", e);
    }
  };

  const handleCPAction = async (action: 'accept' | 'reject') => {
    if (!currentUser || isProcessing) return;
    setIsProcessing(true);
    try {
      if (action === 'accept') {
        // Link both users
        await updateDoc(doc(db, "users", currentUser.uid), { partnerUid: senderUid });
        await updateDoc(doc(db, "users", senderUid!), { partnerUid: currentUser.uid });
        
        // Notify sender
        await updateDoc(doc(db, "users", senderUid!), {
          lastNotification: language === 'ar' 
            ? `وافق ${currentUser.displayName} على طلب الارتباط!` 
            : `${currentUser.displayName} accepted the bond request!`
        });

        alert(t("مبروك! تم الارتباط بنجاح.", "Congratulations! Bonded successfully."));
      } else {
        // Refund 50,000,000 coins to sender
        await updateDoc(doc(db, "users", senderUid!), {
          coins: increment(50000000)
        });
        
        alert(t("تم رفض الطلب وإعادة الكوينز للمرسل.", "Request declined and coins refunded to sender."));
      }
      
      // Delete request notification
      await deleteDoc(doc(db, "users", currentUser.uid, "systemNotifications", id));
    } catch (e) {
      alert(t("خطأ في معالجة الطلب", "Error processing the request"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/5 rounded-[2.2rem] overflow-hidden flex flex-col animate-in fade-in h-auto">
      {image && (
        <div className="w-full h-40 overflow-hidden relative">
          <img src={image} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e]/60 to-transparent"></div>
        </div>
      )}
      <div className="p-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-[14px] font-black text-white truncate pr-2">{t(title || '')}</h4>
              <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter flex-shrink-0">{time}</span>
            </div>
            <p className="text-[12px] text-white/50 leading-relaxed font-medium whitespace-pre-wrap break-words">
              {t(desc || '')}
            </p>
          </div>
        </div>

        {isOfficial && (
          <div className="flex justify-end mt-1">
            <motion.button 
              whileTap={{ scale: 0.8 }}
              animate={didLike ? { scale: [1, 1.35, 0.95, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              onClick={handleLikeToggle}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black transition-colors ${
                didLike 
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30' 
                  : 'bg-white/5 text-white/40 border border-white/5 hover:text-white/60 hover:bg-white/10'
              }`}
            >
              <motion.i 
                animate={didLike ? { scale: [1, 1.5, 0.85, 1.25, 1], rotate: [0, -15, 15, -10, 0] } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.45 }}
                className={`${didLike ? 'fas fa-heart' : 'far fa-heart'} text-[11px] ${didLike ? 'text-rose-500' : ''}`}
              />
              <span className="font-bold">{likesCount}</span>
            </motion.button>
          </div>
        )}

        {type === 'cp_request' && (
          <div className="flex gap-3 mt-2 animate-in slide-in-from-bottom-1">
            <button 
              onClick={() => handleCPAction('accept')} 
              disabled={isProcessing}
              className="flex-1 bg-rose-600 py-3 rounded-xl text-[11px] font-black text-white shadow-lg active:scale-95 transition-all border border-rose-500/20"
            >
              {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : t('موافقه', 'Accept')}
            </button>
            <button 
              onClick={() => handleCPAction('reject')} 
              disabled={isProcessing}
              className="flex-1 bg-white/5 py-3 rounded-xl text-[11px] font-black text-white border border-white/10 active:scale-95 transition-all"
            >
              {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : t('رفض', 'Decline')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface NotificationsPageProps {
  onBack: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onBack }) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'official' | 'system'>('official');
  const [officialMsgs, setOfficialMsgs] = useState<any[]>([]);
  const [systemMsgs, setSystemMsgs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentUser = auth.currentUser;

  useEffect(() => {
    // جلب الرسائل الرسمية العامة
    const officialQ = query(collection(db, "officialNotifications"), orderBy("createdAt", "desc"));
    const unsubOfficial = onSnapshot(officialQ, (snap) => {
      setOfficialMsgs(snap.docs.map(doc => {
        const data = doc.data();
        let timeStr = language === 'ar' ? 'الآن' : 'Now';
        if (data.createdAt) {
          try {
            const date = typeof data.createdAt.toDate === 'function'
              ? data.createdAt.toDate()
              : new Date(data.createdAt);
            timeStr = date.toLocaleDateString(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { day: 'numeric', month: 'numeric', numberingSystem: 'latn' });
          } catch (e) {
            console.error("Error parsing official notification date:", e);
          }
        }
        return { id: doc.id, ...data, time: timeStr };
      }));
      setIsLoading(false);
    });

    // جلب رسائل النظام الخاصة بالمستخدم
    let unsubSystem: any;
    if (currentUser) {
      const systemQ = query(collection(db, "users", currentUser.uid, "systemNotifications"), orderBy("createdAt", "desc"));
      unsubSystem = onSnapshot(systemQ, (snap) => {
        setSystemMsgs(snap.docs.map(doc => {
          const data = doc.data();
          let timeStr = language === 'ar' ? 'الآن' : 'Now';
          if (data.createdAt) {
            try {
              const date = typeof data.createdAt.toDate === 'function'
                ? data.createdAt.toDate()
                : new Date(data.createdAt);
              timeStr = date.toLocaleTimeString(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', { hour: '2-digit', minute: '2-digit', numberingSystem: 'latn' });
            } catch (e) {
              console.error("Error parsing system notification date:", e);
            }
          }
          return { id: doc.id, ...data, time: timeStr };
        }));
      });
    }

    return () => {
      unsubOfficial();
      if (unsubSystem) unsubSystem();
    };
  }, [currentUser, language]);

  return (
    <div className="flex-1 flex flex-col bg-[#1a0b2e] overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="px-5 py-4 flex items-center gap-4 bg-[#1a0b2e]/90 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white active:scale-90 transition-all">
          <i className={`fas ${language === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left'}`}></i>
        </button>
        <h2 className="text-xl font-black text-white tracking-tight">{t("التنبيهات", "Notifications")}</h2>
      </header>

      <div className="px-5 py-6">
        <div className="bg-white/5 p-1.5 rounded-[1.8rem] flex items-center border border-white/5 backdrop-blur-sm">
          <button 
            onClick={() => setActiveTab('official')}
            className={`flex-1 py-3.5 rounded-[1.4rem] text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'official' ? 'bg-purple-600/30 backdrop-blur-md text-white border border-purple-500/30 shadow-xl' : 'text-white/40 hover:text-white/60'}`}
          >
            {t("الرسائل الرسمية", "Official")}
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-3.5 rounded-[1.4rem] text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'system' ? 'bg-blue-600/30 backdrop-blur-md text-white border border-blue-500/30 shadow-xl' : 'text-white/40 hover:text-white/60'}`}
          >
            {t("رسائل النظام", "System Messages")}
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pb-10 space-y-5 scrollbar-hide">
        {isLoading ? (
          <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : activeTab === 'official' ? (
          officialMsgs.length > 0 ? (
            officialMsgs.map((msg) => (
              <NotificationItem key={msg.id} {...msg} isOfficial />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <i className="fas fa-bell-slash text-5xl mb-4"></i>
              <p className="text-xs font-black uppercase tracking-widest">{t("لا توجد رسائل رسمية", "No official messages")}</p>
            </div>
          )
        ) : (
          systemMsgs.length > 0 ? (
            systemMsgs.map((msg) => (
              <NotificationItem key={msg.id} {...msg} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <i className="fas fa-robot text-5xl mb-4"></i>
              <p className="text-xs font-black uppercase tracking-widest">{t("لا توجد رسائل نظام", "No system messages")}</p>
            </div>
          )
        )}
      </main>
    </div>
  );
};
