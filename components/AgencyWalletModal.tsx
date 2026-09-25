import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment, addDoc, serverTimestamp, getDoc, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageContext';

interface AgencyWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  userBalance: number;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  let errStr = '';
  try {
    errStr = JSON.stringify(errInfo);
  } catch (stringifyErr) {
    errStr = String(errInfo.error || "Unknown Error");
  }
  console.error('Firestore Error: ', errStr);
  throw new Error(errStr);
}

export const AgencyWalletModal: React.FC<AgencyWalletModalProps> = ({ isOpen, onClose, userBalance }) => {
  const { language, t } = useLanguage();
  const [view, setView] = useState<'ship' | 'history'>('ship');
  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [shipAmount, setShipAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "agencyDesign"), (snap) => {
      if (snap.exists()) {
        setBackgroundUrl(snap.data().backgroundUrl || '');
      }
    });
    return () => unsub();
  }, []);

  const isVideoUrl = (url: string | null) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
  };

  const fetchHistory = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setLoadingHistory(true);
    try {
      // Simplified query to avoid index errors in Firestore
      const q = query(
        collection(db, "agencyTransactions"), 
        where("agentUid", "==", uid),
        limit(100)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort and filter client-side to avoid complex index requirements
      const sorted = docs
        .filter((tx: any) => tx.type === "agency_to_user")
        .sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

      setTransactions(sorted);
    } catch (e: any) {
      console.error("Fetch history error:", e);
      alert(t("حدث خطأ أثناء تحميل السجلات: ", "An error occurred while loading logs: ") + (e.message || ""));
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (view === 'history') {
      fetchHistory();
    }
  }, [view]);

  const handleSearch = async () => {
    const term = searchId.trim();
    if (!term) return;
    setSearching(true);
    setFoundUser(null);
    try {
      const q = query(collection(db, "users"), where("customId", "==", term));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        alert(t("لم يتم العثور على مستخدم بهذا الـ ID", "User with this ID not found"));
      } else {
        setFoundUser({ uid: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (e) {
      console.error("Search error:", e);
      handleFirestoreError(e, OperationType.LIST, 'users');
    } finally {
      setSearching(false);
    }
  };

  const handleShipGold = async () => {
    if (isProcessing) return;
    
    const amount = parseInt(shipAmount);
    if (!shipAmount || isNaN(amount) || amount <= 0) {
      alert(t("يرجى إدخال مبلغ صحيح", "Please enter a valid amount"));
      return;
    }
    
    if (amount > userBalance) {
      alert(t("رصيد وكالتك غير كافٍ", "Your agency balance is insufficient"));
      return;
    }
    
    if (!foundUser) {
      alert(t("يرجى البحث عن مستخدم أولاً", "Please search for a user first"));
      return;
    }

    setIsProcessing(true);
    
    try {
      const agentUid = auth.currentUser?.uid;
      if (!agentUid) throw new Error("يجب تسجيل الدخول أولاً");

      const agentRef = doc(db, "users", agentUid);
      const targetRef = doc(db, "users", foundUser.uid);
      
      const agentSnap = await getDoc(agentRef);
      if (!agentSnap.exists()) {
        throw new Error("بيانات الوكيل غير موجودة");
      }

      const currentAgencyBalance = agentSnap.data().agencyBalance || 0;
      if (currentAgencyBalance < amount) {
        alert(t("رصيدك الحالي غير كافٍ", "Your current balance is insufficient"));
        setIsProcessing(false);
        return;
      }

      // Execute updates
      await updateDoc(agentRef, {
        agencyBalance: increment(-amount)
      });

      await updateDoc(targetRef, {
        coins: increment(amount)
      });

      await addDoc(collection(db, "agencyTransactions"), {
        type: 'agency_to_user',
        agentUid: agentUid,
        agentName: agentSnap.data().displayName || 'وكيل',
        targetUid: foundUser.uid,
        targetName: foundUser.displayName,
        targetCustomId: foundUser.customId || 'N/A',
        amount: amount,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "users", foundUser.uid, "systemNotifications"), {
        title: t("تهانينا!", "Congratulations!"),
        desc: t(`تهانينا قمت بإعادة الشحن ${amount.toLocaleString('en-US')} كوينز من وكيل شحن (${agentSnap.data().displayName || 'وكيل'}) (ID_${agentSnap.data().customId || 'N/A'})`, `Congratulations! You recharged ${amount.toLocaleString('en-US')} Coins from shipping agent (${agentSnap.data().displayName || 'Agent'}) (ID_${agentSnap.data().customId || 'N/A'})`),
        icon: 'fa-coins',
        type: 'agency_shipping',
        createdAt: serverTimestamp()
      });

      // Play success sound
      const audio = new Audio('https://cdn.pixabay.com/audio/2022/03/24/audio_77ce98305c.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Audio error:', err));

      setShowSuccess(true);

      setShipAmount('');
      setFoundUser(null);
      setSearchId('');
    } catch (e: any) {
      console.error("Shipping execution error:", e);
      alert(t("فشلت العملية: ", "The process failed: ") + (e.message || t("خطأ غير متوقع", "Unexpected error")));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={`fixed inset-0 z-[999] ${backgroundUrl ? '' : 'bg-[#0f172a]'} flex flex-col overflow-hidden`} 
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Custom Background */}
          {backgroundUrl && (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[#0f172a]">
              <div className="absolute inset-0 bg-black/70 z-10"></div>
              {isVideoUrl(backgroundUrl) ? (
                <video 
                  src={backgroundUrl} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <img 
                  src={backgroundUrl} 
                  className="w-full h-full object-cover" 
                  alt="" 
                />
              )}
            </div>
          )}

          {/* Content Wrapper */}
          <div className="relative z-20 flex flex-col h-full overflow-hidden">
            {/* Header */}
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/40 to-transparent safe-top">
            <div className="flex items-center gap-3">
              <button 
                onClick={view === 'history' ? () => setView('ship') : onClose} 
                className="w-10 h-10 rounded-xl bg-white/5 text-white flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
              >
                <i className={`fas ${view === 'history' ? (language === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left') : (language === 'ar' ? 'fa-chevron-right' : 'fa-chevron-left')} text-sm`}></i>
              </button>
              <div className="flex flex-col">
                <h3 className="text-base font-black text-white tracking-tight">
                  {view === 'history' ? t('سجل الشحن', 'Shipping History') : t('محفظة الوكالة', 'Agency Wallet')}
                </h3>
                <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">
                  {view === 'history' ? 'Shipping History' : 'Agency Wallet'}
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setView('history')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all bg-emerald-500/20 text-emerald-400 border border-emerald-500/10`}
            >
              <i className="fas fa-file-lines text-base"></i>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-xl mx-auto w-full scrollbar-hide">
            {view === 'ship' ? (
              <>
                {/* Balance Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-emerald-600 to-teal-800 p-6 rounded-[2rem] shadow-xl border border-white/20 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full_mr-24_mt-24 blur-2xl opacity-50 group-hover:scale-110 transition-transform duration-1000"></div>
                  
                  <div className="relative z-10 flex justify-between items-center">
                    <div>
                      <label className="text-[9px] font-black text-white/70 mb-1 uppercase tracking-[0.2em] block">{t("الرصيد المتاح", "Available Balance")}</label>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{userBalance.toLocaleString('en-US')}</span>
                        <span className="text-xs font-bold text-emerald-200">{t("ذهب", "Gold")}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                      <i className="fas fa-coins text-xl text-emerald-400"></i>
                    </div>
                  </div>
                </motion.div>

                {/* Shipping Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mr-1">
                    <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t("إجراء عملية شحن", "Create Shipping Transaction")}</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <i className={`fas fa-id-card absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/20 text-xs`}></i>
                        <input 
                          type="text" 
                          value={searchId} 
                          onChange={e => {
                            setSearchId(e.target.value);
                            if (!e.target.value.trim()) setFoundUser(null);
                          }} 
                          placeholder={t("رقم الـ ID للمستلم...", "Recipient ID...")} 
                          className={`w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3 ${language === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-xs text-white placeholder:text-white/30 outline-none focus:border-emerald-500/30 transition-all font-bold`}
                        />
                      </div>
                      <button 
                        onClick={handleSearch} 
                        disabled={searching}
                        className="bg-emerald-600 hover:bg-emerald-500 px-6 rounded-2xl text-white font-black text-xs active:scale-95 transition-all disabled:opacity-50"
                      >
                        {searching ? <i className="fas fa-spinner animate-spin"></i> : t('بحث', 'Search')}
                      </button>
                    </div>

                    {foundUser && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/[0.02] border border-white/10 rounded-[1.5rem] p-5 space-y-5"
                      >
                        <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                          <div className="relative">
                            {foundUser.animatedAvatar ? (
                              isVideoUrl(foundUser.animatedAvatar) ? (
                                <video src={foundUser.animatedAvatar} autoPlay loop muted playsInline className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                              ) : (
                                <img src={foundUser.animatedAvatar} className="w-12 h-12 rounded-2xl object-cover border border-white/10" alt="" />
                              )
                            ) : (
                              <img src={foundUser.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-12 h-12 rounded-2xl object-cover border border-white/10" alt="" />
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white w-5 h-5 rounded-lg flex items-center justify-center border-2 border-[#0f172a]">
                              <i className="fas fa-check text-[8px]"></i>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">{foundUser.displayName}</h4>
                            <span className="text-[10px] font-bold text-emerald-400">ID: {foundUser.customId}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                            <div className="relative">
                              <i className={`fas fa-coins absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-emerald-500/30 text-[10px]`}></i>
                              <input 
                                type="number" 
                                inputMode="numeric"
                                value={shipAmount}
                                onChange={e => setShipAmount(e.target.value)}
                                placeholder={t("كمية الذهب...", "Gold amount...")}
                                className={`w-full bg-black/20 border border-white/5 rounded-xl py-3 ${language === 'ar' ? 'pr-10' : 'pl-10'} px-4 text-white placeholder:text-white/30 font-black outline-none focus:border-emerald-500/30 text-sm`}
                              />
                            </div>
                            
                            <div className="flex items-center h-12">
                              <button 
                                onClick={handleShipGold}
                                disabled={isProcessing || !shipAmount}
                                className={`bg-emerald-500 hover:bg-emerald-400 px-8 rounded-xl text-white font-black text-sm active:scale-95 transition-all shadow-lg flex items-center justify-center h-11 min-w-[100px] ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {isProcessing ? t('جاري...', 'Processing...') : t('شحن', 'Ship')}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex gap-2 items-center">
                          <i className="fas fa-info-circle text-[10px] text-blue-500"></i>
                          <p className="text-[9px] text-blue-200/70 font-bold leading-tight">{t("سيتم خصم المبلغ من رصيد وكالتك وإضافته فوراً للمستلم.", "The amount will be deducted from your agency balance and added to the recipient immediately.")}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="p-5 bg-white/[0.02] rounded-[1.5rem] border border-white/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-shield-halved text-emerald-500 text-[10px]"></i>
                    <h5 className="text-[9px] font-black text-white/40 uppercase tracking-widest">{t("ملاحظة أمنية", "Security Notice")}</h5>
                  </div>
                  <p className="text-[10px] text-white/30 font-bold leading-relaxed">
                    {t("يتم تسجيل جميع عمليات الشحن في سجلات النظام لضمان الشفافية والأمان.", "All shipping operations are recorded in systemic logs to ensure safety and transparency.")}
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 mr-1">
                    <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t("السجلات الأخيرة", "Recent Logs")}</h4>
                  </div>
                  <button onClick={fetchHistory} className="text-[9px] font-black text-emerald-500 flex items-center gap-1">
                    <i className={`fas fa-rotate ${loadingHistory ? 'animate-spin' : ''}`}></i>
                    {t("تحديث", "Refresh")}
                  </button>
                </div>

                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                    <i className="fas fa-spinner animate-spin text-2xl text-emerald-500"></i>
                    <p className="text-xs font-bold text-white/50">{t("جاري تحميل السجلات...", "Loading logs...")}</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50 grayscale">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                      <i className="fas fa-folder-open text-2xl"></i>
                    </div>
                    <p className="text-xs font-bold text-white/50">{t("لا توجد عمليات شحن حتى الآن", "No shipping transactions yet")}</p>
                  </div>
                ) : (
                  <div className="space-y-4 px-1">
                    {transactions.map((tx, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={tx.id}
                        className="bg-white/5 border border-white/5 rounded-3xl p-5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-inner">
                            <i className="fas fa-arrow-up-right-from-square text-sm"></i>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <h4 className="text-sm font-black text-white">{tx.targetName}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-white/50 font-bold bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                ID: {tx.targetCustomId || 'N/A'}
                              </span>
                            </div>
                            <div className="text-[9px] text-white/30 font-bold mt-1 flex items-center gap-2">
                              <i className="far fa-clock text-[8px]"></i>
                              {tx.createdAt?.toDate ? new Date(tx.createdAt.toDate()).toLocaleString(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: 'numeric',
                                month: 'short',
                                numberingSystem: 'latn'
                              }) : t('قيد المعالجة...', 'Processing...')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          <div className="bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-2">
                            <span className="text-sm font-black text-emerald-400">+{tx.amount.toLocaleString('en-US')}</span>
                            <i className="fas fa-coins text-[10px] text-emerald-500"></i>
                          </div>
                          <span className="text-[8px] text-white/10 font-black tracking-widest mr-1">SUCCESS</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="h-20"></div>
          </div>

          {/* Success Notification Inside Modal */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-[#0f172a]/90 backdrop-blur-2xl w-full max-w-[320px] rounded-[2.5rem] border border-white/10 p-10 flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden text-center"
                >
                  <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-500/20 to-transparent"></div>
                  
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 z-10">
                    <i className="fas fa-check-circle text-4xl"></i>
                  </div>

                  <div className="z-10 space-y-2">
                    <h3 className="text-lg font-black text-white">{t("تمت العمليه بنجاح", "Operation Completed Successfully")}</h3>
                    <p className="text-[11px] font-bold text-white/70 leading-relaxed">
                      {t("تم تحويل الرصيد بنجاح", "The balance has been successfully transferred")}
                    </p>
                  </div>

                  <button 
                    onClick={() => setShowSuccess(false)}
                    className="w-full py-4 bg-emerald-600/20 text-emerald-300 font-black text-xs rounded-2xl border border-emerald-500/30 active:scale-95 transition-all z-10"
                  >
                    {t("رائع", "Awesome")}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
