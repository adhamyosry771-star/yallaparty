
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useLanguage } from '../LanguageContext';

const CPAdmin: React.FC = () => {
  const { t } = useLanguage();
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [middleIconUrl, setMiddleIconUrl] = useState<string | null>(null);
  const [rectangleUrl, setRectangleUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const rectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "cp_config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBackgroundUrl(data.backgroundUrl || null);
        setMiddleIconUrl(data.middleIconUrl || null);
        setRectangleUrl(data.rectangleUrl || null);
      }
    });
    return unsub;
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const isVideoUrl = (url: string | null) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "settings", "cp_config"), {
        backgroundUrl: backgroundUrl,
        middleIconUrl: middleIconUrl,
        rectangleUrl: rectangleUrl
      }, { merge: true });
      alert(t("تم حفظ إعدادات صفحة CP بنجاح", "CP page settings saved successfully"));
    } catch (e) {
      alert(t("حدث خطأ أثناء الحفظ", "An error occurred while saving"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/20 flex items-center justify-center text-rose-500 border border-rose-500/20">
            <i className="fas fa-heart text-xl"></i>
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{t("إعدادات الـ CP", "CP Settings")}</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{t("تخصيص مظهر صفحة الارتباط", "Customize Relationship Page Appearance")}</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mr-2">{t("خلفية صفحة الـ CP", "CP Page Background")}</label>
          
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-black/40 border-2 border-dashed border-white/10 flex flex-col items-center justify-center group">
            {backgroundUrl ? (
              isVideoUrl(backgroundUrl) ? (
                <video src={backgroundUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={backgroundUrl} className="w-full h-full object-cover" />
              )
            ) : (
              <div className="flex flex-col items-center gap-2 opacity-20">
                <i className="fas fa-image text-4xl text-white"></i>
                <p className="text-[10px] font-black text-white uppercase tracking-widest">{t("اختر صورة أو فيديو", "Choose Image or Video")}</p>
              </div>
            )}
            
            <button 
              onClick={() => bgInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm"
            >
              <i className="fas fa-camera text-white text-2xl"></i>
            </button>
          </div>
          
          <input 
            type="file" 
            ref={bgInputRef} 
            className="hidden" 
            accept="image/*,video/*" 
            onChange={(e) => handleImageSelect(e, setBackgroundUrl)} 
          />

          <div className="space-y-2">
            <label className="text-[9px] font-black text-white/30 uppercase mr-2 tracking-widest">{t("أو ضع رابط مباشر", "Or enter a direct link")}</label>
            <input 
              type="text" 
              value={backgroundUrl || ''} 
              onChange={e => setBackgroundUrl(e.target.value)} 
              placeholder="https://..." 
              className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-[10px] text-white outline-none font-mono focus:border-rose-500/40" 
            />
          </div>
        </div>

        {/* Middle Icon Config */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mr-2">{t("أيقونة القلب (الوسط)", "Heart Icon (Center)")}</label>
          
          <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden bg-black/40 border-2 border-dashed border-white/10 flex flex-col items-center justify-center group">
            {middleIconUrl ? (
              <img src={middleIconUrl} className="w-full h-full object-contain" />
            ) : (
              <i className="fas fa-heart text-2xl text-rose-500 opacity-40"></i>
            )}
            
            <button 
              onClick={() => iconInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm"
            >
              <i className="fas fa-camera text-white text-lg"></i>
            </button>
          </div>
          
          <input 
            type="file" 
            ref={iconInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => handleImageSelect(e, setMiddleIconUrl)} 
          />

          <div className="space-y-2">
            <label className="text-[9px] font-black text-white/30 uppercase mr-2 tracking-widest">{t("أو ضع رابط صورة متحركة (APNG/GIF)", "Or enter an animated image link (APNG/GIF)")}</label>
            <input 
              type="text" 
              value={middleIconUrl || ''} 
              onChange={e => setMiddleIconUrl(e.target.value)} 
              placeholder="https://..." 
              className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-[10px] text-white outline-none font-mono focus:border-rose-500/40" 
            />
          </div>
        </div>

        {/* Rectangle Config */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mr-2">{t("مستطيل الـ CP (للبروفايل)", "CP Rectangle (For Profile)")}</label>
          
          <div className="relative aspect-[4/1] w-full border-2 border-dashed border-white/10 flex flex-col items-center justify-center group overflow-visible">
            {rectangleUrl ? (
              <img src={rectangleUrl} className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-1 opacity-20">
                <i className="fas fa-vector-square text-xl text-white"></i>
                <p className="text-[8px] font-black text-white uppercase tracking-widest">{t("اختر المستطيل", "Choose Rectangle")}</p>
              </div>
            )}
            
            <button 
              onClick={() => rectInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm"
            >
              <i className="fas fa-camera text-white text-lg"></i>
            </button>
          </div>
          
          <input 
            type="file" 
            ref={rectInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => handleImageSelect(e, setRectangleUrl)} 
          />

          <div className="space-y-2">
            <label className="text-[9px] font-black text-white/30 uppercase mr-2 tracking-widest">{t("أو ضع رابط صورة", "Or enter image link")}</label>
            <input 
              type="text" 
              value={rectangleUrl || ''} 
              onChange={e => setRectangleUrl(e.target.value)} 
              placeholder="https://..." 
              className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-[10px] text-white outline-none font-mono focus:border-rose-500/40" 
            />
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-rose-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all border border-white/10"
        >
          {isSaving ? <i className="fas fa-spinner animate-spin"></i> : <span>{t("حفظ الخلفية الجديدة", "Save New Settings")}</span>}
        </button>
      </div>
    </div>
  );
};

export default CPAdmin;
