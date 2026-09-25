
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, doc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useLanguage } from '../LanguageContext';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSecretClub?: boolean;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, isSecretClub }) => {
  const { language, t } = useLanguage();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [availableBgs, setAvailableBgs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [showBgSelector, setShowBgSelector] = useState(false);

  const isVideoUrl = (url?: string | null) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
  };

  useEffect(() => {
    let unsubscribeUser: any;
    if (isOpen) {
      const fetchAllBgs = async () => {
        const publicSnapshot = await getDocs(collection(db, "roomBackgrounds"));
        const publicBgs = publicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        let ownedBgs: any[] = [];
        const user = auth.currentUser;
        if (user) {
          const inventorySnapshot = await getDocs(query(
            collection(db, "users", user.uid, "inventory"), 
            where("type", "==", "background"),
            where("isEquipped", "==", true)
          ));
          const now = new Date();
          ownedBgs = inventorySnapshot.docs.map(doc => {
            const data = doc.data();
            let remainingDays = 0;
            if (data.expiresAt) {
              const exp = data.expiresAt.toDate();
              const diff = exp.getTime() - now.getTime();
              remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
            }
            return { 
              id: doc.id, 
              imageUrl: data.imageUrl || data.videoUrl, 
              name: data.name,
              isOwned: true,
              remainingDays
            };
          });
        }

        const combined = [...publicBgs];
        ownedBgs.forEach(obg => {
          if (!combined.some(c => c.imageUrl === obg.imageUrl)) {
            combined.push(obg);
          }
        });

        setAvailableBgs(combined);
      };
      fetchAllBgs();

      const user = auth.currentUser;
      if (user) {
        unsubscribeUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
          if (docSnap.exists()) setCurrentUserData(docSnap.data());
        });
      }
    }
    return () => { if (unsubscribeUser) unsubscribeUser(); };
  }, [isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCoverImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!title || !coverImage || !selectedBg) return alert(t("يرجى إكمال جميع البيانات واختيار خلفية", "Please complete all fields and choose a background"));
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      const customId = currentUserData?.customId || user?.uid.substring(0, 8);
      await addDoc(collection(db, "rooms"), {
        title,
        description,
        coverImage,
        roomBackground: selectedBg,
        roomIdDisplay: customId,
        owner: {
          id: user?.uid,
          uid: user?.uid, // keep for backward compatibility if needed
          name: currentUserData?.displayName || user?.displayName || t('مستخدم جديد', 'New User'),
          avatar: currentUserData?.photoURL || user?.photoURL || '',
          customId: customId
        },
        participantsCount: 1,
        createdAt: serverTimestamp(),
        isSecretClub: !!isSecretClub
      });
      onClose();
      setTitle(''); setDescription(''); setCoverImage(null); setSelectedBg(null);
      alert(isSecretClub ? t("تم إنشاء غرفة النادي السري بنجاح!", "Secret Club room created successfully!") : t("تم إنشاء الغرفة بنجاح!", "Room created successfully!"));
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-[#1a0b2e] animate-in slide-in-from-bottom duration-300 flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0d051a]/50 backdrop-blur-md">
        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white"><i className="fas fa-times"></i></button>
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          {isSecretClub && <i className="fas fa-user-secret text-amber-400"></i>}
          <span>{isSecretClub ? t("إنشاء غرفة النادي السري", "Create Secret Club Room") : t("إنشاء غرفة صوتية", "Create Voice Room")}</span>
        </h2>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
        {!showBgSelector ? (
          <>
            <div className="flex flex-col items-center gap-4">
              <label className="relative cursor-pointer group">
                <div className="w-32 h-32 rounded-[2.5rem] bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:bg-white/10">
                  {coverImage ? <img src={coverImage} className="w-full h-full object-cover" alt="Cover" /> : (
                    <div className="flex flex-col items-center text-purple-300/40"><i className="fas fa-camera text-2xl mb-2"></i><span className="text-[10px] font-black uppercase">{t("صورة الغرفة", "Room Image")}</span></div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center mr-2">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{t("اسم الغرفة", "Room Name")}</label>
                  <span className="text-[9px] font-bold text-white/40">{title.length}/16</span>
                </div>
                <input 
                  type="text" 
                  value={title} 
                  maxLength={16}
                  onChange={(e) => setTitle(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-purple-500 transition-all shadow-inner" 
                  placeholder={t("مثلاً: سهرة الوناسة...", "e.g., Chill night...")} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">{t("وصف الغرفة", "Room Description")}</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none h-24 focus:border-purple-500 transition-all shadow-inner" 
                  placeholder={t("وصف ترحيبي لزوار الغرفة...", "A welcoming description for your visitors...")} 
                />
              </div>

              <div className="flex items-center gap-3 px-2 py-1">
                <div className="w-10 h-10 rounded-full border-2 border-purple-500/30 overflow-hidden bg-purple-900 shadow-lg">
                  {currentUserData?.animatedAvatar ? (
                    isVideoUrl(currentUserData.animatedAvatar) ? (
                      <video src={currentUserData.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={currentUserData.animatedAvatar} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <img src={currentUserData?.photoURL || auth.currentUser?.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-black text-white">{currentUserData?.displayName || auth.currentUser?.displayName || t('المستخدم', 'User')}</span>
                  <span className="text-[9px] text-purple-400 font-bold uppercase tracking-wider">{t("المنشئ", "Creator")} (ID: {currentUserData?.customId})</span>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">{t("خلفية الغرفة", "Room Background")}</label>
                <button 
                  onClick={() => setShowBgSelector(true)}
                  className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-[1.5rem] active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-14 rounded-lg overflow-hidden border border-white/20 bg-black/40">
                      {selectedBg ? (
                        isVideoUrl(selectedBg) ? (
                          <video src={selectedBg} muted className="w-full h-full object-cover" />
                        ) : (
                          <img src={selectedBg} className="w-full h-full object-cover" />
                        )
                      ) : <div className="w-full h-full flex items-center justify-center opacity-20"><i className="fas fa-image"></i></div>}
                    </div>
                    <span className="text-sm font-black text-white">{t("اختر خلفية مميزة لغرفتك", "Choose a unique background")}</span>
                  </div>
                  <i className={`fas ${language === 'ar' ? 'fa-chevron-left' : 'fa-chevron-right'} text-purple-400`}></i>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-left">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowBgSelector(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white"><i className={`fas ${language === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left'}`}></i></button>
              <h3 className="text-sm font-black text-white">{t("اختر خلفية الغرفة", "Select Room Background")}</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {availableBgs.map((bg) => (
                <div key={bg.id} onClick={() => { setSelectedBg(bg.imageUrl); setShowBgSelector(false); }} className={`relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${selectedBg === bg.imageUrl ? 'border-purple-500 scale-95 shadow-lg' : 'border-transparent opacity-60'}`}>
                  {isVideoUrl(bg.imageUrl) ? (
                    <video src={bg.imageUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={bg.imageUrl} className="w-full h-full object-cover" alt="Background" />
                  )}
                  {bg.remainingDays !== undefined && (
                    <div className="absolute top-2 right-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[8px] font-black px-2 py-0.5 rounded-lg shadow-xl z-20 flex items-center gap-0.5">
                      <span className="text-purple-300">{bg.remainingDays}</span>
                      <span className="opacity-80">{t("يوم", "days")}</span>
                    </div>
                  )}
                  {selectedBg === bg.imageUrl && <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center"><i className="fas fa-check-circle text-white text-xl"></i></div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-[#0d051a]/50 backdrop-blur-md border-t border-white/5">
        <button onClick={handleCreate} disabled={isLoading || showBgSelector} className={`w-full ${isSecretClub ? 'bg-gradient-to-r from-amber-600 via-purple-600 to-amber-600' : 'bg-gradient-to-r from-purple-600 to-pink-600'} py-4 rounded-2xl font-black text-white shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50`}>
          {isLoading ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-magic"></i><span>{isSecretClub ? t("إطلاق الغرفة السرية الآن", "Launch Secret Room Now") : t("إطلاق الغرفة الآن", "Launch Room Now")}</span></>}
        </button>
      </div>
    </div>
  );
};
