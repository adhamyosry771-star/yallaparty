
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, deleteDoc, doc, addDoc, serverTimestamp, orderBy, where, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../LanguageContext';

interface RoomsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

const OwnerName: React.FC<{ userId: string }> = ({ userId }) => {
  const { language, t } = useLanguage();
  const [name, setName] = useState(language === 'ar' ? 'جاري التحميل...' : 'Loading...');

  useEffect(() => {
    if (!userId) return;
    const unsub = onSnapshot(doc(db, "users", userId), (snap) => {
      if (snap.exists()) {
        setName(snap.data().displayName || (language === 'ar' ? 'بدون اسم' : 'Unnamed'));
      } else {
        setName(language === 'ar' ? 'مستخدم غير معروف' : 'Unknown User');
      }
    });
    return () => unsub();
  }, [userId, language]);

  return <span>{name}</span>;
};

export const RoomsManagementModal: React.FC<RoomsManagementModalProps> = ({ isOpen, onClose }) => {
  const { language: currentLang, t } = useLanguage();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const q = query(collection(db, "rooms"));
      const unsub = onSnapshot(q, (snap) => {
        const roomsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        roomsData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        setRooms(roomsData);
        setLoading(false);
      }, (err) => {
        console.error(err);
        setLoading(false);
      });
      return () => unsub();
    }
  }, [isOpen]);

  const handleWarnOwner = async (room: any) => {
    if (isProcessing) return;
    const ownerId = room.owner?.uid || room.ownerId; 
    if (!ownerId) {
      alert(t("لم يتم العثور على صاحب الغرفة", "Room owner not found"));
      return;
    }
    setIsProcessing(`warn-${room.id}`);
    try {
      await addDoc(collection(db, "users", ownerId, "systemNotifications"), {
        title: "⚠️ " + t("تنبيه هام بخصوص غرفتك", "Important Warning Regarding Your Room"),
        desc: t("تنبيه لقد تلقينا بلاغات عديده على غرفتك في الفتره الحاليه برجاء الالتزام بقواعد المجتمع وإلا سيتم حظر الحساب وتجميد الغرفه نتمني لكم الاستمتاع بلحظاتكم المميزه هنا", "Warning: We have received several reports on your room recently. Please adhere to the community guidelines or your account will be banned and room suspended. We wish you wonderful moments here."),
        icon: "fas fa-exclamation-triangle",
        type: "warning",
        createdAt: serverTimestamp()
      });
      alert(t("تم إرسال التحذير بنجاح لصاحب الغرفة", "Warning successfully sent to the room owner"));
    } catch (e) {
      alert(t("حدث خطأ أثناء إرسال التحذير", "An error occurred while sending the warning"));
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm(t("هل أنت متأكد من حذف هذه الغرفة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.", "Are you sure you want to permanently delete this room? This action cannot be undone."))) return;
    if (isProcessing) return;
    setIsProcessing(`delete-${roomId}`);
    try {
      await deleteDoc(doc(db, "rooms", roomId));
      setRooms(prev => prev.filter(r => r.id !== roomId));
      alert(t("تم حذف الغرفة نهائياً", "Room deleted permanently"));
    } catch (e) {
      alert(t("حدث خطأ أثناء حذف الغرفة", "An error occurred while deleting the room"));
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredRooms = rooms.filter(r => 
    r.title?.toLowerCase().includes(search.toLowerCase()) || 
    r.owner?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" dir={currentLang === 'ar' ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1a0b2e] w-full max-w-[450px] h-[85vh] rounded-[2.5rem] border border-white/10 flex flex-col overflow-hidden shadow-2xl"
      >
        <header className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-600/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500">
              <i className="fas fa-door-open"></i>
            </div>
            <div className="text-start">
              <h3 className="text-white font-black text-sm">{t("إدارة الغرف", "Rooms Management")}</h3>
              <p className="text-[9px] text-blue-300/50 font-bold uppercase tracking-wider">Room Management</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 text-white/40 flex items-center justify-center border border-white/10 active:scale-95">
            <i className="fas fa-times text-xs"></i>
          </button>
        </header>

        <div className="p-4 border-b border-white/5 bg-blue-500/5">
          <div className="relative group">
            <div className={`absolute ${currentLang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors`}>
              <i className="fas fa-search text-xs"></i>
            </div>
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder={t("البحث عن اسم الغرفة أو صاحبها...", "Search room name or owner...")} 
              className={`w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 ${currentLang === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4'} text-xs text-white outline-none focus:border-blue-500/40 text-start`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20"><i className="fas fa-circle-notch animate-spin text-blue-500 text-2xl"></i></div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-20 text-white/20 text-xs">{t("لا يوجد غرف حالياً", "No rooms currently found")}</div>
          ) : filteredRooms.map(room => (
            <div key={room.id} className="bg-white/5 border border-white/5 rounded-3xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-400 border border-white/5 overflow-hidden flex-shrink-0">
                  {room.coverImage ? (
                    <img src={room.coverImage} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-users text-xl"></i>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-sm font-black text-white truncate">{room.title}</p>
                  <p className="text-[10px] font-bold text-white/40">
                    {t("بواسطة: ", "By: ")}
                    <OwnerName userId={room.owner?.uid || room.ownerId} />
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleWarnOwner(room)}
                  disabled={isProcessing === `warn-${room.id}`}
                  className="py-3 rounded-xl bg-orange-500/10 text-orange-500 text-[10px] font-black border border-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-orange-500/20 disabled:opacity-50"
                >
                  {isProcessing === `warn-${room.id}` ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-bullhorn"></i><span>{t("تحذير", "Warn Owner")}</span></>}
                </button>
                <button 
                  onClick={() => handleDeleteRoom(room.id)}
                  disabled={isProcessing === `delete-${room.id}`}
                  className="py-3 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black border border-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-red-500/20 disabled:opacity-50"
                >
                   {isProcessing === `delete-${room.id}` ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-trash-alt"></i><span>{t("حذف نهائي", "Delete")}</span></>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
