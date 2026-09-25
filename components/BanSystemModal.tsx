import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, updateDoc, doc, deleteField, orderBy, addDoc, serverTimestamp, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageContext';

interface BanSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

export const BanSystemModal: React.FC<BanSystemModalProps> = ({ isOpen, onClose }) => {
  const { language: currentLang, t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [bannedDevices, setBannedDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [banTargetType, setBanTargetType] = useState<'account' | 'device'>('account');
  const [showAdminBanError, setShowAdminBanError] = useState(false);
  const [protectionMessage, setProtectionMessage] = useState('');

  const adminUser = users.find(u => u.id === auth.currentUser?.uid);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchBannedDevices();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), orderBy("displayName", "asc"));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBannedDevices = async () => {
    try {
      const snap = await getDocs(collection(db, "bannedDevices"));
      setBannedDevices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const isDeviceBanned = (deviceId?: string) => {
    if (!deviceId) return false;
    const banInfo = bannedDevices.find(d => d.id === deviceId);
    if (!banInfo || !banInfo.banUntil) return false;
    return new Date(banInfo.banUntil) > new Date();
  };

  const handleDeviceBan = async (uid: string, days: number | 'permanent') => {
    const userToBan = users.find(u => u.id === uid);
    if (!userToBan) return;

    if (uid === auth.currentUser?.uid) {
      setProtectionMessage(t("عذراً لا يمكنك حظر جهازك الخاص", "Sorry, you cannot ban your own device"));
      setShowAdminBanError(true);
      return;
    }

    if (userToBan.email === 'admin@yalla.com') {
      setProtectionMessage(t("عذراً لا يمكنك حظر جهاز المدير الرسمي.", "Sorry, you cannot ban the official administrator's device."));
      setShowAdminBanError(true);
      return;
    }

    const deviceIdToBan = userToBan.deviceId || ("dev_" + uid);

    let banUntil: string;
    if (days === 'permanent') {
      banUntil = '2099-01-01T00:00:00Z';
    } else {
      const date = new Date();
      date.setDate(date.getDate() + days);
      banUntil = date.toISOString();
    }

    try {
      await setDoc(doc(db, "bannedDevices", deviceIdToBan), {
        banUntil,
        bannedBy: auth.currentUser?.uid,
        bannedUser: uid,
        bannedUserName: userToBan.displayName || 'User',
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, "users", uid), { isDeviceBanned: true, deviceBanUntil: banUntil });

      await addDoc(collection(db, "banLogs"), {
        action: 'device_ban',
        adminId: auth.currentUser?.uid,
        adminName: adminUser?.displayName || t('مسؤول', 'Admin'),
        adminPhoto: adminUser?.animatedAvatar || adminUser?.photoURL || auth.currentUser?.photoURL || null,
        targetId: uid,
        targetName: (userToBan?.displayName || t('مستخدم', 'User')) + ` (${t('جهاز', 'Device')})`,
        targetPhoto: userToBan?.animatedAvatar || userToBan?.photoURL || null,
        duration: days,
        banUntil: banUntil,
        timestamp: serverTimestamp()
      });

      alert(t("تم حظر الهاتف بنجاح", "Device banned successfully"));
      fetchUsers();
      fetchBannedDevices();
      setSelectedUserId(null);
    } catch (e) {
      console.error(e);
      alert(t("حدث خطأ", "An error occurred"));
    }
  };

  const handleDeviceUnban = async (uid: string) => {
    const userToUnban = users.find(u => u.id === uid);
    if (!userToUnban) return;
    
    const deviceIdToUnban = userToUnban.deviceId || ("dev_" + uid);

    try {
      await deleteDoc(doc(db, "bannedDevices", deviceIdToUnban));
      await updateDoc(doc(db, "users", uid), { isDeviceBanned: deleteField(), deviceBanUntil: deleteField() });

      await addDoc(collection(db, "banLogs"), {
        action: 'device_unban',
        adminId: auth.currentUser?.uid,
        adminName: adminUser?.displayName || t('مسؤول', 'Admin'),
        adminPhoto: adminUser?.animatedAvatar || adminUser?.photoURL || auth.currentUser?.photoURL || null,
        targetId: uid,
        targetName: (userToUnban?.displayName || t('مستخدم', 'User')) + ` (${t('جهاز', 'Device')})`,
        targetPhoto: userToUnban?.animatedAvatar || userToUnban?.photoURL || null,
        timestamp: serverTimestamp()
      });

      alert(t("تم فك حظر الهاتف بنجاح", "Device ban lifted successfully"));
      fetchUsers();
      fetchBannedDevices();
      setSelectedUserId(null);
    } catch (e) {
      console.error(e);
      alert(t("حدث خطأ", "An error occurred"));
    }
  };

  const handleBan = async (uid: string, days: number | 'permanent') => {
    const userToBan = users.find(u => u.id === uid);
    
    if (uid === auth.currentUser?.uid) {
      setProtectionMessage(t("عذراً لا يمكنك حظر نفسك", "Sorry, you cannot ban yourself"));
      setShowAdminBanError(true);
      return;
    }

    if (userToBan?.email === 'admin@yalla.com') {
      setProtectionMessage(t("عذراً لا يمكنك حظر هذا الحساب فهو حساب المدير الرسمي.", "Sorry, you cannot ban the official administrator account."));
      setShowAdminBanError(true);
      return;
    }

    let banUntil: string;
    if (days === 'permanent') {
      banUntil = '2099-01-01T00:00:00Z';
    } else {
      const date = new Date();
      date.setDate(date.getDate() + days);
      banUntil = date.toISOString();
    }

    try {
      await updateDoc(doc(db, "users", uid), { banUntil });
      
      await addDoc(collection(db, "banLogs"), {
        action: 'ban',
        adminId: auth.currentUser?.uid,
        adminName: adminUser?.displayName || t('مسؤول', 'Admin'),
        adminPhoto: adminUser?.animatedAvatar || adminUser?.photoURL || auth.currentUser?.photoURL || null,
        targetId: uid,
        targetName: userToBan?.displayName || t('مستخدم', 'User'),
        targetPhoto: userToBan?.animatedAvatar || userToBan?.photoURL || null,
        duration: days,
        banUntil: banUntil,
        timestamp: serverTimestamp()
      });

      alert(t("تم الحظر بنجاح", "User banned successfully"));
      fetchUsers();
      setSelectedUserId(null);
    } catch (e) {
      alert(t("حدث خطأ", "An error occurred"));
    }
  };

  const handleUnban = async (uid: string) => {
    const userToUnban = users.find(u => u.id === uid);
    try {
      await updateDoc(doc(db, "users", uid), { banUntil: deleteField() });
      
      await addDoc(collection(db, "banLogs"), {
        action: 'unban',
        adminId: auth.currentUser?.uid,
        adminName: adminUser?.displayName || t('مسؤول', 'Admin'),
        adminPhoto: adminUser?.animatedAvatar || adminUser?.photoURL || auth.currentUser?.photoURL || null,
        targetId: uid,
        targetName: userToUnban?.displayName || t('مستخدم', 'User'),
        targetPhoto: userToUnban?.animatedAvatar || userToUnban?.photoURL || null,
        timestamp: serverTimestamp()
      });

      alert(t("تم فك الحظر", "Ban lifted successfully"));
      fetchUsers();
      setSelectedUserId(null);
    } catch (e) {
      alert(t("حدث خطأ", "An error occurred"));
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
    u.customId?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-[#1a0b2e] w-full max-w-[360px] h-[80vh] rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden shadow-2xl animate-in zoom-in">
        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-red-600/5">
          <h3 className="text-white font-black text-sm">{t('نظام حظر المستخدمين', 'User Ban System')}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 text-white flex items-center justify-center border border-white/10"><i className="fas fa-times"></i></button>
        </header>

        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <i className={`fas fa-search absolute ${currentLang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/20 text-xs`}></i>
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder={t("ابحث عن الاسم أو الـ ID...", "Search name or ID...")} 
              className={`w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 ${currentLang === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4'} text-xs text-white outline-none focus:border-purple-500/40`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-20"><i className="fas fa-spinner animate-spin text-purple-500"></i></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-white/20 text-xs">{t("لا يوجد مستخدمين", "No users found")}</div>
          ) : filteredUsers.map(u => {
            const hasPhoneBan = isDeviceBanned(u.deviceId || "dev_" + u.id);
            return (
              <div key={u.id} className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={u.animatedAvatar || u.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-white truncate">{u.displayName}</p>
                    <p className={`text-[9px] font-bold ${u.banUntil ? 'text-red-400' : 'text-purple-400'}`}>ID: {u.customId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Device ban button */}
                  <button 
                    onClick={() => {
                      if (u.id === auth.currentUser?.uid) {
                        setProtectionMessage(t("عذراً لا يمكنك حظر نفسك", "Sorry, you cannot ban yourself"));
                        setShowAdminBanError(true);
                        return;
                      }
                      if (u.email === 'admin@yalla.com') {
                        setProtectionMessage(t("عذراً لا يمكنك حظر هذا الحساب فهو حساب المدير الرسمي.", "Sorry, you cannot ban the official administrator account."));
                        setShowAdminBanError(true);
                        return;
                      }
                      setBanTargetType('device');
                      setSelectedUserId(selectedUserId === u.id && banTargetType === 'device' ? null : u.id);
                    }} 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${hasPhoneBan ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}
                    title={t("حظر الهاتف", "Ban Device")}
                  >
                    <i className="fas fa-mobile-alt"></i>
                  </button>

                  {/* Account ban button */}
                  <button 
                    onClick={() => {
                      if (u.id === auth.currentUser?.uid) {
                        setProtectionMessage(t("عذراً لا يمكنك حظر نفسك", "Sorry, you cannot ban yourself"));
                        setShowAdminBanError(true);
                        return;
                      }
                      if (u.email === 'admin@yalla.com') {
                        setProtectionMessage(t("عذراً لا يمكنك حظر هذا الحساب فهو حساب المدير الرسمي.", "Sorry, you cannot ban the official administrator account."));
                        setShowAdminBanError(true);
                        return;
                      }
                      setBanTargetType('account');
                      setSelectedUserId(selectedUserId === u.id && banTargetType === 'account' ? null : u.id);
                    }} 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${u.banUntil ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}
                    title={t("حظر الحساب", "Ban Account")}
                  >
                    <i className={`fas ${u.banUntil ? 'fa-user-slash' : 'fa-ban'}`}></i>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {showAdminBanError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowAdminBanError(false)}
            >
              <motion.div 
                className="bg-[#1a0b2e]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 w-full max-w-[300px] text-center shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-4">
                  <i className="fas fa-shield-halved text-2xl"></i>
                </div>
                <h4 className="text-white font-black text-sm mb-2">{t("تنبيه حماية", "Protection Warning")}</h4>
                <p className="text-white/60 text-[11px] leading-relaxed mb-6 font-bold">{protectionMessage}</p>
                <button 
                  onClick={() => setShowAdminBanError(false)}
                  className="w-full py-3 bg-purple-600 text-white text-xs font-black rounded-xl active:scale-95 transition-transform"
                >
                  {t("فهمت ذلك", "I understand")}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedUserId && (
            <motion.div 
              initial={{ y: 100 }} 
              animate={{ y: 0 }} 
              exit={{ y: 100 }}
              className="bg-[#0d051a] border-t border-white/10 p-6 space-y-4 shadow-2xl rounded-t-[2rem]"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-black text-white">
                  {banTargetType === 'device' ? t("خيارات حظر الهاتف", "Device Ban Options") : t("خيارات حظر الحساب", "Account Ban Options")}
                </span>
                <button onClick={() => setSelectedUserId(null)} className="text-white/40 text-[10px]">{t("إلغاء", "Cancel")}</button>
              </div>
              <p className="text-[9.5px] text-white/40 font-bold leading-normal">
                {banTargetType === 'device' 
                  ? t("سيؤدي هذا إلى منع هذا الهاتف بالكامل من تسجيل الدخول أو إنشاء حسابات جديدة.", "This will entirely block this device from logging in or creating new accounts.") 
                  : t("سيؤدي هذا إلى حظر حساب المستخدم المحدد فقط.", "This will ban only the specified user account.")
                }
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => banTargetType === 'device' ? handleDeviceBan(selectedUserId, 1) : handleBan(selectedUserId, 1)} className="py-2.5 bg-white/5 text-white text-[10px] font-black rounded-xl border border-white/10 active:scale-95">{t("يوم واحد", "1 Day")}</button>
                <button onClick={() => banTargetType === 'device' ? handleDeviceBan(selectedUserId, 7) : handleBan(selectedUserId, 7)} className="py-2.5 bg-white/5 text-white text-[10px] font-black rounded-xl border border-white/10 active:scale-95">{t("أسبوع واحد", "1 Week")}</button>
                <button onClick={() => banTargetType === 'device' ? handleDeviceBan(selectedUserId, 30) : handleBan(selectedUserId, 30)} className="py-2.5 bg-white/5 text-white text-[10px] font-black rounded-xl border border-white/10 active:scale-95">{t("شهر واحد", "1 Month")}</button>
                <button onClick={() => banTargetType === 'device' ? handleDeviceBan(selectedUserId, 365) : handleBan(selectedUserId, 365)} className="py-2.5 bg-white/5 text-white text-[10px] font-black rounded-xl border border-white/10 active:scale-95">{t("سنة كاملة", "1 Full Year")}</button>
                <button onClick={() => banTargetType === 'device' ? handleDeviceBan(selectedUserId, 'permanent') : handleBan(selectedUserId, 'permanent')} className="py-2.5 bg-red-600/20 text-red-500 text-[10px] font-black rounded-xl border border-red-600/30 active:scale-95 col-span-2">{t("حظر نهائي", "Permanent Ban")}</button>
                <button onClick={() => banTargetType === 'device' ? handleDeviceUnban(selectedUserId) : handleUnban(selectedUserId)} className="py-2.5 bg-green-600/20 text-green-400 text-[10px] font-black rounded-xl border border-green-600/30 active:scale-95 col-span-2">{t("فك الحظر", "Lift Ban Status")}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
