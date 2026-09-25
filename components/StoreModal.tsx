import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, collection, query, orderBy, addDoc, serverTimestamp, deleteDoc, Timestamp, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useLanguage } from '../LanguageContext';

interface StoreModalProps {
  isOpen: boolean; 
  onClose: () => void;
  user: any; 
  userCoins: number;
  userPhoto: string;
  currentFrame: string | null;
  currentEntry: string | null;
  onOpenWallet: () => void;
}

export const StoreModal: React.FC<StoreModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  userCoins, 
  userPhoto, 
  currentFrame,
  currentEntry,
  onOpenWallet 
}) => {
  const { language, t } = useLanguage();
  const [storeTab, setStoreTab] = useState<'frames' | 'entries' | 'backgrounds' | 'my_bag'>('frames');
  const [bagTab, setBagTab] = useState<'frames' | 'entries' | 'backgrounds'>('frames');
  const [isStoreLoading, setIsStoreLoading] = useState(true);
  const [storeItems, setStoreItems] = useState<{backgrounds: any[], frames: any[], entries: any[]}>({ backgrounds: [], frames: [], entries: [] });
  const [ownedItems, setOwnedItems] = useState<any[]>([]);
  
  const [purchaseModalItem, setPurchaseModalItem] = useState<any | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [previewEntryVideo, setPreviewEntryVideo] = useState<string | null>(null);

  const isVideoUrl = (url: string) => {
    return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
  };

  const renderProfileMedia = (url: string, className: string) => {
    if (isVideoUrl(url)) {
      return <video src={url} autoPlay loop muted playsInline className={className} />;
    }
    return <img src={url} className={className} alt="Profile" />;
  };

  useEffect(() => {
    if (isOpen) {
      setIsStoreLoading(true);
      const bgsQuery = query(collection(db, "storeBackgrounds"), orderBy("createdAt", "desc"));
      const framesQuery = query(collection(db, "storeFrames"), orderBy("createdAt", "desc"));
      const entriesQuery = query(collection(db, "storeEntries"), orderBy("createdAt", "desc"));

      let bgsLoaded = false;
      let framesLoaded = false;
      let entriesLoaded = false;

      const unsubBgs = onSnapshot(bgsQuery, (snap) => {
        const bgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStoreItems(prev => ({ ...prev, backgrounds: bgs }));
        bgsLoaded = true;
        if (framesLoaded && entriesLoaded) setIsStoreLoading(false);
      }, () => setIsStoreLoading(false));

      const unsubFrames = onSnapshot(framesQuery, (snap) => {
        const frames = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStoreItems(prev => ({ ...prev, frames: frames }));
        framesLoaded = true;
        if (bgsLoaded && entriesLoaded) setIsStoreLoading(false);
      }, () => setIsStoreLoading(false));

      const unsubEntries = onSnapshot(entriesQuery, (snap) => {
        const entries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStoreItems(prev => ({ ...prev, entries: entries }));
        entriesLoaded = true;
        if (bgsLoaded && framesLoaded) setIsStoreLoading(false);
      }, () => setIsStoreLoading(false));

      return () => {
        unsubBgs();
        unsubFrames();
        unsubEntries();
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (user && isOpen) {
       const q = query(collection(db, "users", user.uid, "inventory"), orderBy("purchasedAt", "desc"));
       const unsub = onSnapshot(q, (snap) => {
         const now = new Date();
         const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
           .filter((item: any) => {
             if (item.expiresAt) {
               return item.expiresAt.toDate() > now;
             }
             return true;
           });
         setOwnedItems(items);
       });
       return unsub;
    }
  }, [user, isOpen]);

  const confirmPurchase = async () => {
    if (!user || !purchaseModalItem) return;
    const price = purchaseModalItem.price || 0;
    const duration = purchaseModalItem.durationDays || 7;

    if (userCoins < price) {
      alert(t("رصيدك غير كافٍ لإتمام عملية الشراء!", "Your balance is insufficient to complete the purchase!"));
      setPurchaseModalItem(null);
      return;
    }

    setIsPurchasing(true);
    try {
      const now = new Date();
      
      // Check if user already owns this item and it hasn't expired
      const inventoryRef = collection(db, "users", user.uid, "inventory");
      const q = query(inventoryRef, where("itemId", "==", purchaseModalItem.id));
      const querySnap = await getDocs(q);
      
      let existingItem: any = null;
      querySnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.expiresAt && data.expiresAt.toDate() > now) {
          existingItem = { id: docSnap.id, ...data };
        }
      });

      await updateDoc(doc(db, "users", user.uid), {
        coins: userCoins - price
      });

      if (existingItem) {
        // Aggregate duration
        const currentExpiry = existingItem.expiresAt.toDate();
        const newExpiresAt = new Date(currentExpiry.getTime() + duration * 24 * 60 * 60 * 1000);
        
        await updateDoc(doc(db, "users", user.uid, "inventory", existingItem.id), {
          expiresAt: Timestamp.fromDate(newExpiresAt),
          purchasedAt: serverTimestamp()
        });
        setSuccessMsg(t(`تم تجديد المدة بنجاح! تم إضافة ${duration} أيام إلى مدة العنصر الحالية.`, `Duration renewed successfully! Added ${duration} days to the current item duration.`));
        setShowSuccess(true);
      } else {
        // Fresh purchase
        const expiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
        await addDoc(collection(db, "users", user.uid, "inventory"), {
          itemId: purchaseModalItem.id,
          name: purchaseModalItem.name || 'عنصر',
          imageUrl: purchaseModalItem.imageUrl || null,
          videoUrl: purchaseModalItem.videoUrl || null,
          previewImage: purchaseModalItem.previewImage || null,
          type: purchaseModalItem.type,
          price: price,
          purchasedAt: serverTimestamp(),
          expiresAt: Timestamp.fromDate(expiresAt),
          isEquipped: false 
        });
        setSuccessMsg(t("تم الشراء بنجاح! تم نقل العنصر إلى حقيبتك.", "Purchase successful! The item has been moved to your bag."));
        setShowSuccess(true);
      }

      setPurchaseModalItem(null);
      setStoreTab('my_bag'); 
      setBagTab(purchaseModalItem.type === 'frame' ? 'frames' : purchaseModalItem.type === 'entry' ? 'entries' : 'backgrounds');
    } catch (error) {
      console.error(error);
      alert(t("حدث خطأ أثناء الشراء.", "An error occurred during purchase."));
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleWearItem = async (item: any) => {
    if(!user) return;
    try {
      const updates: any = {};
      if (item.type === 'frame') updates.currentFrame = item.imageUrl;
      if (item.type === 'entry') updates.currentEntry = item.videoUrl;
      
      if (item.type === 'background') {
        await updateDoc(doc(db, "users", user.uid, "inventory", item.id), { isEquipped: true });
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "users", user.uid), updates);
      }
      alert(t("تم الارتداء بنجاح", "Successfully equipped"));
    } catch(e) { 
      alert(t("فشل الارتداء.", "Failed to equip."));
    }
  };

  const handleRemoveItem = async (type: 'frame' | 'entry' | 'background', inventoryId?: string) => {
    if(!user) return;
    try {
      const updates: any = {};
      if (type === 'frame') updates.currentFrame = null;
      if (type === 'entry') updates.currentEntry = null;
      
      if (type === 'background' && inventoryId) {
        await updateDoc(doc(db, "users", user.uid, "inventory", inventoryId), { isEquipped: false });
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "users", user.uid), updates);
      }
      alert(t("تم الخلع بنجاح", "Successfully unequipped"));
    } catch(e) { console.error(e); }
  };

  const getRemainingDays = (expiresAt: any) => {
    if (!expiresAt) return null;
    const now = new Date();
    const exp = expiresAt.toDate();
    const diff = exp.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  if (!isOpen) return null;

  const filteredBagItems = ownedItems.filter(item => {
    if (bagTab === 'frames') return item.type === 'frame';
    if (bagTab === 'entries') return item.type === 'entry';
    if (bagTab === 'backgrounds') return item.type === 'background';
    return false;
  });

  return (
    <div className="fixed inset-0 z-[500] bg-[#0d051a]/98 backdrop-blur-2xl flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="p-5 flex justify-between items-center border-b border-white/5 bg-[#1a0b2e]">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <i className="fas fa-store text-pink-400 text-sm"></i>
          <span>{t("متجر يلا بارتي", "Yalla Party Store")}</span>
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setStoreTab('my_bag')} 
            className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 bg-white/5 text-white active:scale-95 transition-all"
          >
            <i className="fas fa-shopping-bag text-sm"></i>
          </button>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 text-white flex items-center justify-center border border-white/10 hover:bg-white/10 active:scale-95 transition-all"><i className="fas fa-times"></i></button>
        </div>
      </header>
      
      <div className="flex bg-[#1a0b2e] border-b border-white/5">
        {[
          {id: 'frames', name: t('الإطارات', 'Frames')},
          {id: 'entries', name: t('الدخوليات', 'Entries')},
          {id: 'backgrounds', name: t('الخلفيات', 'Backgrounds')}
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setStoreTab(tab.id as any)}
            className={`flex-1 py-5 flex flex-col items-center transition-all relative ${storeTab === tab.id ? 'text-purple-400' : 'text-white/40'}`}
          >
            <span className="text-[12px] font-black tracking-wide">{tab.name}</span>
            {storeTab === tab.id && <div className="absolute bottom-0 w-8 h-1 bg-purple-500 rounded-full"></div>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {isStoreLoading ? (
          <div className="h-full w-full flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-[10px] font-black text-purple-400 uppercase tracking-widest">{t("جاري تحميل المتجر...", "Loading store...")}</p>
          </div>
        ) : (
          <>
            {storeTab === 'my_bag' && (
              <div className="h-full animate-in fade-in flex flex-col">
                  <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl border border-white/5 flex-shrink-0">
                     <button onClick={() => setBagTab('frames')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${bagTab === 'frames' ? 'bg-purple-600/30 text-white shadow-lg border border-purple-500/20' : 'text-white/30'}`}>{t("إطارات", "Frames")}</button>
                     <button onClick={() => setBagTab('entries')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${bagTab === 'entries' ? 'bg-purple-600/30 text-white shadow-lg border border-purple-500/20' : 'text-white/30'}`}>{t("دخوليات", "Entrances")}</button>
                     <button onClick={() => setBagTab('backgrounds')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${bagTab === 'backgrounds' ? 'bg-purple-600/30 text-white shadow-lg border border-purple-500/20' : 'text-white/30'}`}>{t("خلفيات", "Backgrounds")}</button>
                  </div>

                  {filteredBagItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-30 animate-in fade-in zoom-in duration-500">
                      <i className="fas fa-box-open text-6xl mb-4 text-white/20"></i>
                      <p className="text-sm font-black text-white/60 uppercase tracking-widest">{t("لا يوجد شيء هنا", "Nothing here yet")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 pb-10">
                      {filteredBagItems.map((item) => {
                         const isWorn = 
                           item.type === 'frame' ? currentFrame === item.imageUrl : 
                           item.type === 'entry' ? currentEntry === item.videoUrl : 
                           item.isEquipped;
                         const remainingDays = getRemainingDays(item.expiresAt);
                         
                         const mediaContainerClass = 
                           item.type === 'frame' ? 'w-16 h-16' : 
                           item.type === 'background' ? 'w-full aspect-[9/16]' : 
                           'w-full aspect-square';

                         return (
                          <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 animate-in fade-in shadow-xl relative overflow-hidden group transition-all hover:bg-white/10">
                            <div className={`${mediaContainerClass} relative flex items-center justify-center rounded-full`}>
                              {item.type === 'frame' ? (
                                <>
                                  <div className="w-[75%] h-[75%] rounded-full overflow-hidden">
                                    {renderProfileMedia(userPhoto, "w-full h-full object-cover")}
                                  </div>
                                  <img src={item.imageUrl} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 scale-110" alt="frame" />
                                </>
                              ) : item.type === 'background' && isVideoUrl(item.imageUrl || item.videoUrl || '') ? (
                                <video src={item.imageUrl || item.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                              ) : (
                                <img src={item.type === 'entry' ? (item.previewImage || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%232e1a4a'/><path d='M30 40l40 10-40 10z' fill='%23ffffff' fill-opacity='0.4'/></svg>") : item.imageUrl} className="w-full h-full object-cover" alt="media" />
                              )}
                              {item.type === 'entry' && (
                                <button onClick={() => setPreviewEntryVideo(item.videoUrl)} className="absolute inset-0 bg-black/30 flex items-center justify-center group/item">
                                   <i className="fas fa-play text-white opacity-40 text-2xl transition-transform group-hover/item:scale-125"></i>
                                </button>
                              )}
                            </div>
                            <div className="w-full text-center space-y-1">
                              <span className="text-[11px] font-black text-white truncate block">{t(item.name)}</span>
                              <span className="text-[9px] font-black text-purple-400/60 uppercase">{t("متبقي: ", "Remaining: ") + remainingDays + " " + t("يوم", "days")}</span>
                            </div>
                            <button 
                              onClick={() => isWorn ? handleRemoveItem(item.type, item.id) : handleWearItem(item)}
                              className={`w-full py-2.5 rounded-xl text-[10px] font-black active:scale-95 transition-all border backdrop-blur-md ${isWorn ? 'bg-red-500/15 text-red-400 border-red-500/25 shadow-sm' : 'bg-purple-600/15 text-purple-300 border-purple-500/25 shadow-sm'}`}
                            >
                              {isWorn ? t('خلع', 'Unequip') : t('ارتداء', 'Equip')}
                            </button>
                          </div>
                         );
                      })}
                    </div>
                  )}
              </div>
            )}

            {storeTab === 'frames' && (
              <>
                {storeItems.frames.length === 0 ? (
                  <div className="w-full flex flex-col items-center justify-center py-24 opacity-30 animate-in fade-in zoom-in duration-500">
                    <i className="fas fa-box-open text-6xl mb-4 text-white/20"></i>
                    <p className="text-sm font-black text-white/60 uppercase tracking-widest">{t("لا يوجد شيء هنا", "Nothing here yet")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {storeItems.frames.map(frame => (
                      <div key={frame.id} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center gap-2 animate-in fade-in shadow-xl hover:bg-white/10 transition-all">
                        <div className="w-20 h-20 relative flex items-center justify-center group">
                          <div className="w-[75%] h-[75%] rounded-full overflow-hidden">
                            {renderProfileMedia(userPhoto, "w-full h-full object-cover")}
                          </div>
                          <img 
                            src={frame.imageUrl} 
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 scale-110" 
                            alt="frame" 
                          />
                        </div>
                        
                        <div className="w-full space-y-1.5">
                          <div className="text-center">
                            <span className="text-[11px] font-black text-white truncate w-full block opacity-90">{t(frame.name)}</span>
                            <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">{(frame.durationDays || 7) + " " + t("أيام", "days")}</span>
                          </div>
                          <div className="flex items-center gap-1.5 h-7 w-full">
                            <div className="flex-1 h-full flex items-center justify-center gap-1">
                              <span className="text-[10px] font-black text-yellow-500">{frame.price?.toLocaleString('en-US')}</span>
                              <i className="fas fa-coins text-[7px] text-yellow-500"></i>
                            </div>
                            <button 
                              onClick={() => setPurchaseModalItem({...frame, type: 'frame'})} 
                              className="px-3 h-full bg-purple-500/15 text-purple-300 rounded-lg text-[8px] font-black active:scale-95 border border-purple-500/25 transition-all"
                            >
                              {t("شراء", "Buy")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {storeTab === 'entries' && (
              <>
                {storeItems.entries.length === 0 ? (
                  <div className="w-full flex flex-col items-center justify-center py-24 opacity-30 animate-in fade-in zoom-in duration-500">
                    <i className="fas fa-box-open text-6xl mb-4 text-white/20"></i>
                    <p className="text-sm font-black text-white/60 uppercase tracking-widest">{t("لا يوجد شيء هنا", "Nothing here yet")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {storeItems.entries.map(entry => (
                      <div key={entry.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 animate-in fade-in shadow-xl hover:bg-white/10 transition-all relative overflow-hidden group">
                        <button 
                          onClick={() => setPreviewEntryVideo(entry.videoUrl)}
                          className="w-full aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5 shadow-inner relative"
                        >
                          <img src={entry.previewImage} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="preview" />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                             <i className="fas fa-play text-white opacity-40 text-2xl"></i>
                          </div>
                        </button>
                        <div className="w-full space-y-2">
                          <div className="text-center">
                            <span className="text-[12px] font-black text-white truncate w-full block">{t(entry.name)}</span>
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{(entry.durationDays || 7) + " " + t("أيام", "days")}</span>
                          </div>
                          <div className="flex items-center gap-1.5 h-7 w-full">
                            <div className="flex-1 h-full flex items-center justify-center gap-1">
                              <span className="text-[10px] font-black text-yellow-500">{entry.price?.toLocaleString('en-US')}</span>
                              <i className="fas fa-coins text-[7px] text-yellow-500"></i>
                            </div>
                            <button 
                              onClick={() => setPurchaseModalItem({...entry, type: 'entry'})} 
                              className="px-3 h-full bg-purple-500/15 text-purple-300 rounded-lg text-[8px] font-black active:scale-95 border border-purple-500/25 transition-all"
                            >
                              {t("شراء", "Buy")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {storeTab === 'backgrounds' && (
              <>
                {storeItems.backgrounds.length === 0 ? (
                  <div className="w-full flex flex-col items-center justify-center py-24 opacity-30 animate-in fade-in zoom-in duration-500">
                    <i className="fas fa-box-open text-6xl mb-4 text-white/20"></i>
                    <p className="text-sm font-black text-white/60 uppercase tracking-widest">{t("لا يوجد شيء هنا", "Nothing here yet")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {storeItems.backgrounds.map(bg => (
                      <div key={bg.id} className="bg-white/5 border border-white/10 rounded-3xl p-3 flex flex-col gap-3 animate-in fade-in shadow-xl hover:bg-white/10 transition-all relative overflow-hidden group">
                        <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-black/40 border border-white/5 shadow-inner relative">
                          {isVideoUrl(bg.imageUrl || '') ? (
                            <video src={bg.imageUrl} autoPlay loop muted playsInline className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          ) : (
                            <img src={bg.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="preview" />
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className="text-center">
                            <span className="text-[12px] font-black text-white truncate w-full block">{t(bg.name)}</span>
                            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{(bg.durationDays || 7) + " " + t("أيام", "days")}</span>
                          </div>
                          
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[11px] font-black text-yellow-500">{(bg.price || 0).toLocaleString('en-US')}</span>
                            <i className="fas fa-coins text-[8px] text-yellow-500"></i>
                          </div>

                          <button 
                            onClick={() => setPurchaseModalItem({...bg, type: 'background'})} 
                            className="w-full py-2.5 bg-purple-600/15 text-purple-300 rounded-xl text-[10px] font-black active:scale-95 border border-purple-500/25 transition-all"
                          >
                            {t("شراء", "Buy")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <div className="p-5 bg-[#1a0b2e] border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden bg-slate-900 flex-shrink-0">
            {renderProfileMedia(userPhoto, "w-full h-full object-cover")}
          </div>
          <div className="flex items-center gap-1.5">
            <i className="fas fa-coins text-yellow-500 text-xs"></i>
            <span className="text-sm font-black text-white">{userCoins.toLocaleString('en-US')}</span>
          </div>
        </div>
        <button onClick={() => { onClose(); onOpenWallet(); }} className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-[10px] font-black text-purple-400 active:scale-95">{t("شحن رصيد", "Recharge")}</button>
      </div>

      {previewEntryVideo && (
        <div 
          className="fixed inset-0 z-[700] bg-black flex animate-in fade-in duration-300 cursor-pointer"
          onClick={() => setPreviewEntryVideo(null)}
        >
          <video 
            src={previewEntryVideo} 
            autoPlay 
            loop 
            playsInline 
            className="w-full h-full object-cover pointer-events-none"
          />
        </div>
      )}

      {purchaseModalItem && (
        <div className="fixed inset-0 z-[600] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-[#1a0b2e]/80 backdrop-blur-2xl w-full max-w-[320px] rounded-[2.5rem] border border-white/10 p-8 flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-600/20 to-transparent"></div>
            
            <h3 className="text-lg font-black text-white z-10">{t("تأكيد عملية الشراء", "Confirm Purchase")}</h3>
            
            <div className="w-32 h-32 relative flex items-center justify-center z-10">
              {purchaseModalItem.imageUrl ? (
                <>
                  <div className="w-[70%] h-[70%] rounded-full overflow-hidden">
                    {renderProfileMedia(userPhoto, "w-full h-full object-cover")}
                  </div>
                  {isVideoUrl(purchaseModalItem.imageUrl || purchaseModalItem.videoUrl || '') ? (
                    <video src={purchaseModalItem.imageUrl || purchaseModalItem.videoUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-contain z-20 scale-125" />
                  ) : (
                    <img src={purchaseModalItem.imageUrl} className="absolute inset-0 w-full h-full object-contain z-20 scale-125" alt="item" />
                  )}
                </>
              ) : (
                <div className="w-full h-full relative group">
                  <img src={purchaseModalItem.previewImage} className="w-full h-full rounded-2xl object-cover shadow-2xl" alt="item" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
                    <i className="fas fa-video text-white text-xl"></i>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center z-10">
              <p className="text-base font-black text-white mb-1">{t(purchaseModalItem.name)}</p>
              <div className="flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-yellow-500">{(purchaseModalItem.price || 0).toLocaleString('en-US')}</span>
                  <i className="fas fa-coins text-sm text-yellow-500"></i>
                </div>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t("المدة: ", "Duration: ") + (purchaseModalItem.durationDays || 7) + " " + t("أيام", "days")}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full z-10">
              <button 
                onClick={confirmPurchase} 
                disabled={isPurchasing} 
                className="w-full bg-purple-600/20 backdrop-blur-md py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 border border-purple-500/30 hover:bg-purple-600/30"
              >
                {isPurchasing ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-check-circle text-purple-400"></i><span>{t("تأكيد وشراء الآن", "Confirm & Buy Now")}</span></>}
              </button>
              <button 
                onClick={() => setPurchaseModalItem(null)} 
                disabled={isPurchasing} 
                className="w-full bg-white/5 py-4 rounded-2xl font-black text-xs text-white/40 active:scale-95 transition-all border border-white/5"
              >
                {t("تراجع", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[700] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div 
             className="bg-[#1a0b2e]/90 backdrop-blur-2xl w-full max-w-[320px] rounded-[2.5rem] border border-white/10 p-10 flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden text-center"
           >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-500/20 to-transparent"></div>
              
              <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 z-10">
                <i className="fas fa-check-circle text-4xl"></i>
              </div>

              <div className="z-10 space-y-2">
                <h3 className="text-lg font-black text-white">{t("تم بنجاح!", "Completed Successfully!")}</h3>
                <p className="text-[11px] font-bold text-white/60 leading-relaxed">{successMsg}</p>
              </div>

              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full py-4 bg-purple-600/20 text-purple-300 font-black text-xs rounded-2xl border border-purple-500/30 active:scale-95 transition-all z-10"
              >
                {t("رائع", "Awesome")}
              </button>
           </div>
        </div>
      )}
      
      <style>{`
        @keyframes frame-slow {
          0%, 100% { transform: scale(1.1) rotate(0deg); }
          50% { transform: scale(1.15) rotate(1deg); }
        }
        .animate-frame-slow { animation: frame-slow 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
