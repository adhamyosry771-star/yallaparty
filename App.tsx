
import React, { useState, useEffect, useRef } from 'react';
import { Room, ChatMessage } from './types';
import { RoomCard } from './components/RoomCard';
import { VoiceRoom } from './components/VoiceRoom';
import { Login } from './components/Login';
import { registerBackAction } from './backButtonManager';
import { SetupProfile } from './components/SetupProfile';
import { NewsPage } from './components/NewsPage';
import { MessagesPage } from './components/MessagesPage';
import { ProfilePage } from './components/ProfilePage';
import { CreateRoomModal } from './components/CreateRoomModal';
import { NotificationsPage } from './components/NotificationsPage';
import { BanModal } from './components/BanModal';
import { RoomBanModal } from './components/RoomBanModal';
import { CarnivalEventPage } from './components/CarnivalEventPage';
import { WealthLeaderboardPage } from './components/WealthLeaderboardPage';
// @ts-ignore
import carnivalBannerUrl from './src/assets/images/carnival_banner_1780918603249.png';
import { auth, db } from './firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, onSnapshot, collection, query, orderBy, limit, addDoc, serverTimestamp, deleteDoc, updateDoc, getDocs, getDoc, deleteField, where, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useLanguage } from './LanguageContext';

const getDeviceId = () => {
  let devId = localStorage.getItem('yalla_device_id');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('yalla_device_id', devId);
  }
  return devId;
};

const safeJsonStringify = (obj: any): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
      if (typeof value.path === 'string' && value.firestore) {
        return value.path;
      }
    }
    return value;
  });
};

const sanitizeFirestoreData = (val: any, seen = new WeakSet()): any => {
  if (val === null || val === undefined) {
    return val;
  }
  if (typeof val !== 'object') {
    return val;
  }
  if (seen.has(val)) {
    return '[Circular]';
  }
  seen.add(val);
  if (typeof val.path === 'string' && val.firestore) {
    return val.path;
  }
  if (typeof val.toDate === 'function' && typeof val.toMillis === 'function') {
    return val; 
  }
  if (Array.isArray(val)) {
    return val.map(item => sanitizeFirestoreData(item, seen));
  }
  if (val instanceof Date) {
    return val;
  }
  const cleaned: any = {};
  for (const key of Object.keys(val)) {
    cleaned[key] = sanitizeFirestoreData(val[key], seen);
  }
  return cleaned;
};

const App: React.FC = () => {
  const { language, t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showRoomBanModal, setShowRoomBanModal] = useState(false);
  const [kickedRoomName, setKickedRoomName] = useState("");
  const [banUntil, setBanUntil] = useState<string | null>(null);
  const [deviceBanUntil, setDeviceBanUntil] = useState<string | null>(null);
  const [isProfileSetup, setIsProfileSetup] = useState(false);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordRoom, setPasswordRoom] = useState<Room | null>(null);
  const [joiningPassword, setJoiningPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'news' | 'messages' | 'me'>('home');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCarnivalPage, setShowCarnivalPage] = useState(false);
  const [showWealthLeaderboard, setShowWealthLeaderboard] = useState(false);
  const [leaderboardMode, setLeaderboardMode] = useState<'wealth' | 'charisma'>('wealth');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showHasRoomError, setShowHasRoomError] = useState(false);
  const [shouldOpenWalletOnProfile, setShouldOpenWalletOnProfile] = useState(false);
  
  const [showSecretClubPasswordModal, setShowSecretClubPasswordModal] = useState(false);
  const [secretClubPasswordInput, setSecretClubPasswordInput] = useState('');
  const [secretClubPasswordError, setSecretClubPasswordError] = useState('');
  const [showSecretClubWelcomeModal, setShowSecretClubWelcomeModal] = useState(false);
  const [isInSecretClub, setIsInSecretClub] = useState(false);
  const [isCreateSecretRoom, setIsCreateSecretRoom] = useState(false);
  const [hasRoomErrorCustomMsg, setHasRoomErrorCustomMsg] = useState('');
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPrivateCount, setUnreadPrivateCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(() => {
    return parseInt(localStorage.getItem('last_read_notifications') || '0');
  });

  const [roomMicStates, setRoomMicStates] = useState<any[]>(Array(15).fill({ status: 'open', user: null }));
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>([]);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [banners2, setBanners2] = useState<any[]>([]);
  const [secretClubBanners, setSecretClubBanners] = useState<any[]>([]);
  const [secretClubBanners2, setSecretClubBanners2] = useState<any[]>([]);
  const [designSettings, setDesignSettings] = useState<any>(null);
  const [topWealthUsers, setTopWealthUsers] = useState<any[]>([]);
  const [topCharismaUsers, setTopCharismaUsers] = useState<any[]>([]);
  const [defaultImages, setDefaultImages] = useState<any>(null);
  const [carnivalSettings, setCarnivalSettings] = useState<any>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [currentBannerIndex2, setCurrentBannerIndex2] = useState(0);
  const [currentSecretClubBannerIndex, setCurrentSecretClubBannerIndex] = useState(0);
  const [currentSecretClubBannerIndex2, setCurrentSecretClubBannerIndex2] = useState(0);

  // تتبع العناصر التي تمت معالجة انتهاء صلاحيتها لمنع التكرار
  const processedExpirations = useRef<Set<string>>(new Set());

  // منطق الفقاعة العائمة
  const [bubblePos, setBubblePos] = useState({ x: window.innerWidth - 85, y: window.innerHeight - 220 });
  const isDragging = useRef(false);
  const hasMoved = useRef(false); 
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const unsubDesign = onSnapshot(doc(db, "settings", "design"), (docSnap) => {
      if (docSnap.exists()) setDesignSettings(docSnap.data());
    });
    const unsubDefaultImages = onSnapshot(doc(db, "settings", "default_images"), (snap) => {
      if (snap.exists()) setDefaultImages(snap.data());
    });
    const unsubCarnival = onSnapshot(doc(db, "settings", "carnival"), (snap) => {
      if (snap.exists()) setCarnivalSettings(snap.data());
    });

    const unsubWealth = onSnapshot(query(collection(db, "users"), orderBy("wealthXP", "desc"), limit(5)), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setTopWealthUsers(list);
    }, (error) => {
      console.warn("Could not load top wealth users real-time:", error);
    });

    const unsubCharisma = onSnapshot(query(collection(db, "users"), orderBy("charismaXP", "desc"), limit(5)), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setTopCharismaUsers(list);
    }, (error) => {
      console.warn("Could not load top charisma users real-time:", error);
    });

    // منع النسخ والقص وتحديد النصوص بشكل كامل لجميع عناصر التطبيق
    const handlePreventCopy = (e: ClipboardEvent) => {
      if (auth.currentUser?.email === 'admin@yalla.com') return;
      e.preventDefault();
    };
    const handlePreventSelect = (e: Event) => {
      if (auth.currentUser?.email === 'admin@yalla.com') return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
    };

    // منع زر الفأرة الأيمن والضغط المطول بالكامل لمنع حفظ أو تحميل الصور والملفات
    const handleContextMenu = (e: MouseEvent) => {
      if (auth.currentUser?.email === 'admin@yalla.com') return;
      e.preventDefault();
    };

    // منع سحب الصور تماما لمنع تصفحها أو تحميلها
    const handleDragStart = (e: DragEvent) => {
      if (auth.currentUser?.email === 'admin@yalla.com') return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'IMG' || target.tagName === 'IMAGE' || target.tagName === 'svg' || target.style.backgroundImage)) {
        e.preventDefault();
      }
    };

    document.addEventListener('copy', handlePreventCopy);
    document.addEventListener('cut', handlePreventCopy);
    document.addEventListener('selectstart', handlePreventSelect);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      unsubDesign();
      unsubDefaultImages();
      unsubCarnival();
      if (typeof unsubWealth === 'function') unsubWealth();
      if (typeof unsubCharisma === 'function') unsubCharisma();
      document.removeEventListener('copy', handlePreventCopy);
      document.removeEventListener('cut', handlePreventCopy);
      document.removeEventListener('selectstart', handlePreventSelect);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  useEffect(() => {
    if (user?.email === 'admin@yalla.com') {
      document.body.classList.add('admin-user');
    } else {
      document.body.classList.remove('admin-user');
    }
  }, [user]);

  const isVideoUrl = (url?: string | null) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
  };

  // Real-time listener for current device ban
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
            signOut(auth).catch(console.error);
            return;
          }
        }
      }
      setDeviceBanUntil(null);
    });
    return () => unsub();
  }, []);

  // 1. Auth Listener (Runs once)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      const devId = getDeviceId();
      setLoading(true);
      
      // Device Ban check
      try {
        const devSnap = await getDoc(doc(db, "bannedDevices", devId));
        if (devSnap.exists()) {
          const devData = devSnap.data();
          if (devData.banUntil) {
            const banDate = new Date(devData.banUntil);
            if (banDate > new Date()) {
              setBanUntil(devData.banUntil);
              setDeviceBanUntil(devData.banUntil);
              setShowBanModal(true);
              await signOut(auth);
              setLoading(false);
              return;
            }
          }
        }
      } catch (devError) {
        console.error("Device ban check error:", devError);
      }

      if (currentUser) {
        try {
          // Store deviceId on successful check
          await setDoc(doc(db, "users", currentUser.uid), { deviceId: devId }, { merge: true });

          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.banUntil) {
              const banDate = new Date(data.banUntil);
              if (banDate > new Date()) {
                setBanUntil(data.banUntil);
                setShowBanModal(true);
                await signOut(auth);
                setLoading(false);
                return;
              }
            }
          }
          setUser(currentUser);
        } catch (e) {
          console.error("Auth check error:", e);
          setUser(currentUser);
        }
      } else {
        setUser(null);
        setUserData(null);
        setIsProfileSetup(false);
        setActiveTab('home');
        setLoading(false);
      }
    });
    return unsubscribeAuth;
  }, []);

  // 2. User Data & Inventory Listener (Runs when user changes)
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const unsubscribeUserDoc = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // Ban check
        if (data.banUntil) {
          const banDate = new Date(data.banUntil);
          const now = new Date();
          if (banDate > now) {
            setBanUntil(data.banUntil);
            setShowBanModal(true);
            await signOut(auth);
            setLoading(false);
            return;
          }
        }

        // Self-healing: shrink document if size approaches Firestore 1MB limits to prevent Quota Exceeded errors
        try {
          const docString = safeJsonStringify(data);
          if (docString.length > 700000) { // More than 700KB (strict limit is 1MB)
            console.warn("User document size is extremely large: " + docString.length + " bytes. Pruning base64 fields to prevent Firestore limit crash!");
            const prunes: any = {};
            if (data.headerURL && data.headerURL.startsWith("data:")) {
              prunes.headerURL = deleteField();
            }
            if (data.animatedAvatar && data.animatedAvatar.startsWith("data:")) {
              prunes.animatedAvatar = deleteField();
            }
            if (docString.length > 900000) {
              // Extremely critical size, prune photoURL if it's base64, replacing it with a lighter random image
              if (data.photoURL && data.photoURL.startsWith("data:")) {
                prunes.photoURL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>";
              }
            }
            if (Object.keys(prunes).length > 0) {
              await updateDoc(doc(db, "users", user.uid), prunes);
              alert(t("تنبيه: تم تحسين مساحة التخزين لملفك الشخصي بنجاح لمنع توقف الحساب متجاوز الحد الأقصى.", "Warning: Your profile storage has been optimized to prevent account suspension. Massive images were removed."));
            }
          }
        } catch (shrinkErr) {
          console.error("Error running user self-healing shrink scheme:", shrinkErr);
        }

        if (user.email && data.email !== user.email) {
          updateDoc(doc(db, "users", user.uid), { email: user.email });
        }
        const sanitizedData = sanitizeFirestoreData(data);
        setUserData(sanitizedData);
        // Check if profile is setup: either has a displayName in Firestore, or has a customId, or has one in Auth
        setIsProfileSetup(!!data.displayName || !!data.customId || !!user.displayName);
      } else {
        // If doc doesn't exist, check Auth profile as a fallback for external logins
        setIsProfileSetup(!!user.displayName);
      }
      setLoading(false);
    });

    const unsubscribeInventory = onSnapshot(collection(db, "users", user.uid, "inventory"), async (snap) => {
      const now = new Date();
      const userDocRef = doc(db, "users", user.uid);

      for (const itemDoc of snap.docs) {
        const item = itemDoc.data();
        const itemId = itemDoc.id;

        if (item.expiresAt && !processedExpirations.current.has(itemId)) {
          const expiration = item.expiresAt.toDate();
          if (expiration < now) {
            processedExpirations.current.add(itemId);
            const itemTypeLabel = item.type === 'frame' ? t('الإطار', 'Frame') : item.type === 'entry' ? t('الدخولية', 'Entrance') : t('الخلفية', 'Background');
            const itemIcon = item.type === 'frame' ? 'fa-id-badge' : item.type === 'entry' ? 'fa-door-open' : 'fa-image';

            try {
              await addDoc(collection(db, "users", user.uid, "systemNotifications"), {
                title: t("انتهت صلاحية العنصر", "Item Expired"),
                desc: language === 'ar' 
                  ? `تم انتهاء وقت ${itemTypeLabel} الخاص بك: "${item.name}". يمكنك التوجه للمتجر للحصول عليه مرة أخرى.`
                  : `Your ${itemTypeLabel} has expired: "${item.name}". You can head to the store to get it again.`,
                icon: itemIcon,
                createdAt: serverTimestamp()
              });

              const updates: any = {};
              if (item.type === 'frame' && userData?.currentFrame === item.imageUrl) updates.currentFrame = null;
              if (item.type === 'entry' && userData?.currentEntry === item.videoUrl) updates.currentEntry = null;
              if (item.type === 'background') {
                try {
                  const publicBgsSnapshot = await getDocs(query(collection(db, "roomBackgrounds"), limit(1)));
                  const defaultBgUrl = !publicBgsSnapshot.empty ? publicBgsSnapshot.docs[0].data().imageUrl : null;
                  
                  if (userData?.currentRoomBackground === item.imageUrl || item.isEquipped) {
                    updates.currentRoomBackground = defaultBgUrl;
                  }

                  // Also proactively find all rooms owned by the user and update if utilizing this background
                  const roomsSnap = await getDocs(query(
                    collection(db, "rooms"),
                    where("owner.uid", "==", user.uid)
                  ));
                  for (const roomDoc of roomsSnap.docs) {
                    const rData = roomDoc.data();
                    if (rData.roomBackground === item.imageUrl) {
                      await updateDoc(roomDoc.ref, {
                        roomBackground: defaultBgUrl
                      });
                    }
                  }
                } catch (e) {
                  console.error("Error resetting room backgrounds in expiration check:", e);
                  updates.currentRoomBackground = null;
                }
              }

              if (Object.keys(updates).length > 0) await updateDoc(userDocRef, updates);
              await deleteDoc(itemDoc.ref);
            } catch (err) {
              console.error("Error processing expired item:", err);
              processedExpirations.current.delete(itemId);
            }
          }
        }
      }
    });

    return () => {
      unsubscribeUserDoc();
      unsubscribeInventory();
    };
  }, [user]);

  // 3. Notifications & Social Listener
  useEffect(() => {
    if (!user) return;

    const unsubscribeOfficial = onSnapshot(collection(db, "officialNotifications"), (snap) => {
      const newOfficial = snap.docs.filter(doc => {
        const data = doc.data();
        const createdAt = typeof data.createdAt?.toMillis === 'function'
          ? data.createdAt.toMillis()
          : (data.createdAt ? new Date(data.createdAt).getTime() : 0);
        return createdAt > lastReadTimestamp;
      }).length;
      
      const unsubscribeSystem = onSnapshot(collection(db, "users", user.uid, "systemNotifications"), (sysSnap) => {
        const newSystem = sysSnap.docs.filter(doc => {
          const data = doc.data();
          const createdAt = typeof data.createdAt?.toMillis === 'function'
            ? data.createdAt.toMillis()
            : (data.createdAt ? new Date(data.createdAt).getTime() : 0);
          return createdAt > lastReadTimestamp;
        }).length;
        setUnreadCount(newOfficial + newSystem);
      });

      return () => unsubscribeSystem();
    });

    return () => unsubscribeOfficial();
  }, [user, lastReadTimestamp]);

  // Listen for unread private messages
  useEffect(() => {
    if (!user) {
      setUnreadPrivateCount(0);
      return;
    }
    const chatsRef = collection(db, "privateChats");
    const q = query(chatsRef, where("participants", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      let sum = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const unreadMsgCount = data[`unread_${user.uid}`] || 0;
        sum += unreadMsgCount;
      });
      setUnreadPrivateCount(sum);
    }, (err) => {
      console.error("Error listening for unread private chats:", err);
    });
    return () => unsub();
  }, [user]);

  // 4. Global Data Listeners (Rooms, Banners)
  useEffect(() => {
    const bannersQuery = query(collection(db, "banners"), orderBy("createdAt", "desc"), limit(5));
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
      const dbBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const carnivalBannerItem = {
        id: 'carnival_event',
        title: language === 'ar' ? 'مكافأة كرنفال الافتتاح 🎪 احصل على 10 مليون عملة مجاناً!' : 'Opening Carnival Reward 🎪 Get 10,000,000 Free Coins!',
        imageUrl: carnivalSettings?.bannerUrl || carnivalBannerUrl,
        isEvent: true
      };
      setBanners([carnivalBannerItem, ...dbBanners]);
    });

    const banners2Query = query(collection(db, "banners2"), orderBy("createdAt", "desc"), limit(5));
    const unsubscribeBanners2 = onSnapshot(banners2Query, (snapshot) => {
      const dbBanners2 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBanners2(dbBanners2);
    });

    const secretClubBannersQuery = query(collection(db, "secretClubBanners"), orderBy("createdAt", "desc"), limit(10));
    const unsubscribeSecretClubBanners = onSnapshot(secretClubBannersQuery, (snapshot) => {
      const dbClubBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSecretClubBanners(dbClubBanners);
    });

    const secretClubBanners2Query = query(collection(db, "secretClubBanners2"), orderBy("createdAt", "desc"), limit(10));
    const unsubscribeSecretClubBanners2 = onSnapshot(secretClubBanners2Query, (snapshot) => {
      const dbClubBanners2 = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSecretClubBanners2(dbClubBanners2);
    });

    const roomsQuery = query(collection(db, "rooms"), orderBy("createdAt", "desc"), limit(150));
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setRooms(fetchedRooms.reverse());
    });

    return () => {
      unsubscribeBanners();
      unsubscribeBanners2();
      unsubscribeSecretClubBanners();
      unsubscribeSecretClubBanners2();
      unsubscribeRooms();
    };
  }, [language, carnivalSettings]);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex(prev => (prev + 1) % banners.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [banners]);

  useEffect(() => {
    if (banners2.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex2(prev => (prev + 1) % banners2.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [banners2]);

  useEffect(() => {
    if (secretClubBanners.length > 1) {
      const interval = setInterval(() => {
        setCurrentSecretClubBannerIndex(prev => (prev + 1) % secretClubBanners.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [secretClubBanners]);

  useEffect(() => {
    if (secretClubBanners2.length > 1) {
      const interval = setInterval(() => {
        setCurrentSecretClubBannerIndex2(prev => (prev + 1) % secretClubBanners2.length);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [secretClubBanners2]);

  // Back key event interceptors for App-level state
  useEffect(() => {
    if (showCarnivalPage) {
      return registerBackAction(() => {
        setShowCarnivalPage(false);
        return true;
      });
    }
  }, [showCarnivalPage]);

  useEffect(() => {
    if (showWealthLeaderboard) {
      return registerBackAction(() => {
        setShowWealthLeaderboard(false);
        return true;
      });
    }
  }, [showWealthLeaderboard]);

  useEffect(() => {
    if (showNotifications) {
      return registerBackAction(() => {
        setShowNotifications(false);
        return true;
      });
    }
  }, [showNotifications]);

  useEffect(() => {
    if (isCreateModalOpen) {
      return registerBackAction(() => {
        setIsCreateModalOpen(false);
        return true;
      });
    }
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (showPasswordPrompt) {
      return registerBackAction(() => {
        setShowPasswordPrompt(false);
        setPasswordRoom(null);
        return true;
      });
    }
  }, [showPasswordPrompt]);

  useEffect(() => {
    if (showHasRoomError) {
      return registerBackAction(() => {
        setShowHasRoomError(false);
        return true;
      });
    }
  }, [showHasRoomError]);

  useEffect(() => {
    if (showSecretClubPasswordModal) {
      return registerBackAction(() => {
        setShowSecretClubPasswordModal(false);
        return true;
      });
    }
  }, [showSecretClubPasswordModal]);

  useEffect(() => {
    if (showSecretClubWelcomeModal) {
      return registerBackAction(() => {
        setShowSecretClubWelcomeModal(false);
        return true;
      });
    }
  }, [showSecretClubWelcomeModal]);

  useEffect(() => {
    if (isInSecretClub) {
      return registerBackAction(() => {
        setIsInSecretClub(false);
        return true;
      });
    }
  }, [isInSecretClub]);

  useEffect(() => {
    if (activeTab !== 'home' && !showNotifications) {
      return registerBackAction(() => {
        setActiveTab('home');
        return true;
      });
    }
  }, [activeTab, showNotifications]);

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    const now = Date.now();
    setLastReadTimestamp(now);
    setUnreadCount(0);
    localStorage.setItem('last_read_notifications', now.toString());
  };

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    dragOffset.current = {
      x: clientX - bubblePos.x,
      y: clientY - bubblePos.y
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      hasMoved.current = true;
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
      
      const nextX = Math.min(Math.max(0, clientX - dragOffset.current.x), window.innerWidth - 64);
      const nextY = Math.min(Math.max(0, clientY - dragOffset.current.y), window.innerHeight - 64);
      
      setBubblePos({ x: nextX, y: nextY });
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove);
    window.addEventListener('touchend', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [bubblePos]);

  const handleRoomClick = (room: Room) => {
    // Check if user is banned from this room
    if (room.bannedUsers && user?.uid && room.bannedUsers.includes(user.uid)) {
      setKickedRoomName(room.title || room.name || t("الغرفة", "the room"));
      setShowRoomBanModal(true);
      return;
    }

    // If room is locked and user is not owner
    const isAdmin = user?.email === 'admin@yalla.com' || userData?.email === 'admin@yalla.com';
    if (room.isLocked && room.owner?.uid !== user?.uid && !isAdmin) {
      setPasswordRoom(room);
      setShowPasswordPrompt(true);
      setJoiningPassword('');
      return;
    }
    enterRoom(room);
  };

  const enterRoom = (room: Room) => {
    if (activeRoom && activeRoom.id === room.id) {
      setIsMinimized(false);
    } else {
      setRoomMicStates(Array(15).fill({ status: 'open', user: null }));
      setIsMicMuted(true);
      setRoomMessages([]); 
      setActiveRoom(room);
      setIsMinimized(false);
    }
  };

  const verifyPassword = () => {
    if (passwordRoom && joiningPassword === passwordRoom.password) {
      setShowPasswordPrompt(false);
      enterRoom(passwordRoom);
      setPasswordRoom(null);
    } else {
      alert(t("كلمة المرور غير صحيحة", "Incorrect Password"));
    }
  };

  const handleLeaveRoom = () => {
    setActiveRoom(null);
    setIsMinimized(false);
    setRoomMessages([]); // تصفير الرسائل عند الخروج النهائي
  };

  if (loading) return (
    <div className="min-h-screen bg-[#1a0b2e] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (showBanModal && banUntil) {
    return (
      <div className="min-h-screen bg-[#1a0b2e]">
        <BanModal 
          isOpen={showBanModal} 
          onClose={() => {
            setShowBanModal(false);
            setBanUntil(null);
            setUser(null);
          }} 
          banUntil={banUntil} 
        />
      </div>
    );
  }

  if (!user) return <Login onLoginSuccess={() => {}} />;
  if (!isProfileSetup) return <SetupProfile onComplete={() => setIsProfileSetup(true)} />;

  const finalUserPhoto = userData?.photoURL || defaultImages?.profileImage || user?.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>";

  return (
    <div className={`min-h-screen max-w-md mx-auto bg-[#1a0b2e] shadow-2xl relative overflow-hidden flex flex-col border-x border-white/5 ${(!showNotifications && !showCarnivalPage && !showWealthLeaderboard) ? 'pb-16' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Secret Club Custom Background (Static or Animated) - In Home tab only */}
      {isInSecretClub && activeTab === 'home' && !showNotifications && !showCarnivalPage && !showWealthLeaderboard && designSettings?.secretClubBg && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {isVideoUrl(designSettings.secretClubBg) ? (
            <video 
              src={designSettings.secretClubBg} 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover" 
            />
          ) : (
            <img 
              src={designSettings.secretClubBg} 
              className="w-full h-full object-cover" 
              alt="Secret Club Background" 
            />
          )}
          {/* نسبة بسيطة من اللون الأسود عشان الأيقونات تظهر بوضوح زي خلفيات الغرفة */}
          <div className="absolute inset-0 bg-black/45 pointer-events-none"></div>
        </div>
      )}

      {activeTab === 'home' && !showNotifications && !showCarnivalPage && !showWealthLeaderboard && (
        <header className={`px-5 py-3 flex justify-between items-center sticky top-0 z-10 ${isInSecretClub ? 'bg-transparent' : 'bg-[#1a0b2e]/90 backdrop-blur-md'} transition-colors duration-300`}>
          <h1 className="text-lg font-black tracking-tighter bg-gradient-to-r from-purple-400 via-pink-500 via-fuchsia-500 to-purple-400 bg-clip-text text-transparent animate-gradient-x">Yalla Party</h1>
          <div className="flex gap-2">
            {userData?.hasSecretClub && (
              <button 
                className="w-8 h-8 relative bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-white active:scale-90 transition-all hover:bg-white/10"
                title={isInSecretClub ? t("الخروج من النادي السري", "Exit Secret Club") : t("النادي السري", "Secret Club")}
                onClick={() => {
                  if (isInSecretClub) {
                    setIsInSecretClub(false);
                  } else {
                    setSecretClubPasswordInput('');
                    setSecretClubPasswordError('');
                    setShowSecretClubPasswordModal(true);
                  }
                }}
              >
                <i className="fas fa-user-secret text-xs"></i>
              </button>
            )}
            <button 
              className="w-8 h-8 relative bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-white active:scale-90 transition-all"
              onClick={() => {}}
            >
              <i className="fas fa-search text-xs"></i>
            </button>
            <button 
              onClick={handleOpenNotifications}
              className="w-8 h-8 relative bg-white/5 rounded-xl flex items-center justify-center border border-white/10 text-white active:scale-90 transition-all"
            >
              <i className="fas fa-bell text-xs"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 bg-red-500/90 rounded-full border border-[#1a0b2e] flex items-center justify-center text-[8px] font-black text-white shadow-sm pointer-events-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <div 
              className="w-8 h-8 rounded-full border border-purple-500/50 p-0.5 overflow-hidden cursor-pointer shadow-lg active:scale-90 transition-transform bg-white/5" 
              onClick={() => setActiveTab('me')}
            >
              {userData?.animatedAvatar ? (
                isVideoUrl(userData.animatedAvatar) ? (
                  <video src={userData.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full rounded-full object-cover" />
                ) : (
                  <img src={userData.animatedAvatar} className="w-full h-full rounded-full object-cover" alt="My Profile" />
                )
              ) : (
                <img 
                  src={finalUserPhoto} 
                  className="w-full h-full rounded-full object-cover" 
                  alt="My Profile" 
                  loading="eager"
                />
              )}
            </div>
          </div>
        </header>
      )}

      {showNotifications ? (
        <NotificationsPage onBack={() => setShowNotifications(false)} />
      ) : showWealthLeaderboard ? (
        <WealthLeaderboardPage onBack={() => setShowWealthLeaderboard(false)} designSettings={designSettings} defaultImages={defaultImages} mode={leaderboardMode} />
      ) : showCarnivalPage ? (
        <CarnivalEventPage onBack={() => setShowCarnivalPage(false)} userData={userData} carnivalSettings={carnivalSettings} designSettings={designSettings} />
      ) : (
        <>
          {activeTab === 'home' && (
            <main className="flex-1 overflow-y-auto px-4 py-2 space-y-6 relative z-10">
              {/* تم تقليل حواف البنر من rounded-[2.5rem] إلى rounded-2xl */}
              {(() => {
                const activeBanners = isInSecretClub ? secretClubBanners : banners;
                const activeBannerIndex = isInSecretClub ? currentSecretClubBannerIndex : currentBannerIndex;
                const setActiveBannerIndex = isInSecretClub ? setCurrentSecretClubBannerIndex : setCurrentBannerIndex;

                return (
                  <div className="w-full h-32 rounded-2xl overflow-hidden relative shadow-2xl border border-white/5 bg-white/5 group">
                    {activeBanners.length > 0 ? activeBanners.map((banner, index) => (
                      <div 
                        key={banner.id} 
                        onClick={() => {
                          if (!isInSecretClub && banner.isEvent) {
                            setShowCarnivalPage(true);
                          }
                        }}
                        className={`absolute inset-0 transition-opacity duration-1000 ${index === activeBannerIndex ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${!isInSecretClub && banner.isEvent ? 'cursor-pointer' : ''}`}
                      >
                        <img src={banner.imageUrl} className="w-full h-full object-cover" />
                        {(!banner.isEvent || isInSecretClub) && banner.title && (
                          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e]/90 via-transparent to-transparent p-5 flex flex-col justify-end">
                            <h4 className="font-black text-sm text-white text-shadow-sm">{banner.title}</h4>
                          </div>
                        )}
                      </div>
                    )) : <div className="h-full flex items-center justify-center opacity-20"><i className="fas fa-images"></i></div>}

                    {activeBanners.length > 1 && (
                      <>
                        {/* Left click area to navigate to NEXT banner image */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActiveBannerIndex(prev => (prev + 1) % activeBanners.length);
                          }}
                          className="absolute top-0 bottom-0 left-0 w-[45%] z-20 cursor-pointer"
                          title="التالي"
                        />
                        {/* Right click area to navigate to PREVIOUS banner image */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActiveBannerIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length);
                          }}
                          className="absolute top-0 bottom-0 right-0 w-[45%] z-20 cursor-pointer"
                          title="السابق"
                        />
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Menu Buttons & Voice Rooms wrapper with tight top spacing */}
              <div className="space-y-2.5 w-full">
                {/* Menu Buttons Grid with native size/borderless design */}
                {(designSettings?.menuBox1Url || designSettings?.menuBox2Url) && (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {designSettings?.menuBox1Url && (
                      <div 
                        onClick={() => {
                          setLeaderboardMode('wealth');
                          setShowWealthLeaderboard(true);
                        }} 
                        className="w-full relative hover:opacity-[0.88] active:scale-[0.98] transition-all bg-transparent p-0 cursor-pointer select-none"
                      >
                        <img 
                          src={designSettings.menuBox1Url} 
                          className="w-full h-auto block" 
                          alt="Menu Button 1" 
                        />
                        <PodiumOverlay mode="wealth" designSettings={designSettings} allUsers={topWealthUsers} />
                      </div>
                    )}

                    {designSettings?.menuBox2Url && (
                      <div 
                        onClick={() => {
                          setLeaderboardMode('charisma');
                          setShowWealthLeaderboard(true);
                        }} 
                        className="w-full relative hover:opacity-[0.88] active:scale-[0.98] transition-all bg-transparent p-0 cursor-pointer select-none"
                      >
                        <img 
                          src={designSettings.menuBox2Url} 
                          className="w-full h-auto block" 
                          alt="Menu Button 2" 
                        />
                        <PodiumOverlay mode="charisma" designSettings={designSettings} allUsers={topCharismaUsers} />
                      </div>
                    )}
                  </div>
                )}

                <section>
                  <h2 className="text-base font-black text-white mb-3">
                    {isInSecretClub ? t("غرف النادي السري", "Secret Club Rooms") : t("غرف صوتية", "Voice Rooms")}
                  </h2>
                
                {(() => {
                  let orderedRooms = rooms.filter(r => isInSecretClub ? !!r.isSecretClub : !r.isSecretClub);
                  
                  // Find pinned rooms in the live rooms array
                  const pinned1 = !isInSecretClub && designSettings?.topRoom1Id ? orderedRooms.find(r => r.id === designSettings.topRoom1Id) : null;
                  const pinned2 = !isInSecretClub && designSettings?.topRoom2Id ? orderedRooms.find(r => r.id === designSettings.topRoom2Id) : null;
                  const pinned3 = !isInSecretClub && designSettings?.topRoom3Id ? orderedRooms.find(r => r.id === designSettings.topRoom3Id) : null;
                  const pinned4 = !isInSecretClub && designSettings?.topRoom4Id ? orderedRooms.find(r => r.id === designSettings.topRoom4Id) : null;

                  // Exclude pinned rooms from their original index positions to avoid duplicates
                  if (pinned1) orderedRooms = orderedRooms.filter(r => r.id !== pinned1.id);
                  if (pinned2) orderedRooms = orderedRooms.filter(r => r.id !== pinned2.id);
                  if (pinned3) orderedRooms = orderedRooms.filter(r => r.id !== pinned3.id);
                  if (pinned4) orderedRooms = orderedRooms.filter(r => r.id !== pinned4.id);

                  const finalRooms: any[] = [];

                  // Position 0 (Top 1)
                  if (pinned1) {
                    finalRooms.push(pinned1);
                  } else {
                    const firstVal = orderedRooms.shift();
                    if (firstVal) finalRooms.push(firstVal);
                  }

                  // Position 1 (Top 2)
                  if (pinned2) {
                    finalRooms.push(pinned2);
                  } else {
                    const firstVal = orderedRooms.shift();
                    if (firstVal) finalRooms.push(firstVal);
                  }

                  // Position 2 (Top 3)
                  if (pinned3) {
                    finalRooms.push(pinned3);
                  } else {
                    const firstVal = orderedRooms.shift();
                    if (firstVal) finalRooms.push(firstVal);
                  }

                  // Position 3 (Top 4)
                  if (pinned4) {
                    finalRooms.push(pinned4);
                  } else {
                    const firstVal = orderedRooms.shift();
                    if (firstVal) finalRooms.push(firstVal);
                  }

                  // Append rest of rooms
                  finalRooms.push(...orderedRooms);

                  if (finalRooms.length === 0) {
                    return (
                      <div className="py-10 px-4 rounded-2xl border border-white/5 bg-white/5 text-center flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-300/60">
                          <i className={`fas ${isInSecretClub ? 'fa-user-secret' : 'fa-headphones'} text-xl`}></i>
                        </div>
                        <h4 className="text-xs font-black text-white">
                          {isInSecretClub ? t("لا توجد غرف في النادي السري حالياً", "No rooms in Secret Club currently") : t("لا توجد غرف حالياً", "No rooms currently")}
                        </h4>
                        <p className="text-[10px] text-white/40 font-bold max-w-xs">
                          {isInSecretClub 
                            ? t("اضغط على زر (+) بالأسفل لإنشاء غرفة خاصة بالنادي السري", "Click (+) below to create a Secret Club room")
                            : t("اضغط على زر (+) بالأسفل لإنشاء غرفة جديدة", "Click (+) below to create a new room")}
                        </p>
                      </div>
                    );
                  }

                  const top4Rooms = finalRooms.slice(0, 4);
                  const remainingRooms = finalRooms.slice(4);

                  return (
                    <div className="space-y-4">
                      {/* Grid for top 4 rooms in the forefront */}
                      {top4Rooms.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {top4Rooms.map((room, index) => {
                            let frameUrl = undefined;
                            if (!isInSecretClub && !room.isSecretClub) {
                              if (index === 0) frameUrl = designSettings?.roomFrameTop1 || undefined;
                              else if (index === 1) frameUrl = designSettings?.roomFrameTop2 || undefined;
                              else if (index === 2) frameUrl = designSettings?.roomFrameTop3 || undefined;
                              else if (index === 3) frameUrl = designSettings?.roomFrameTop4 || undefined;
                            }
                            return (
                              <RoomCard 
                                key={room.id} 
                                room={room} 
                                design={designSettings} 
                                frameUrl={frameUrl} 
                                onClick={handleRoomClick} 
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* Secondary Banner Slider (matching width & height aspect ratio perfectly) */}
                      {(() => {
                        const activeBanners2 = isInSecretClub ? secretClubBanners2 : banners2;
                        const activeBannerIndex2 = isInSecretClub ? currentSecretClubBannerIndex2 : currentBannerIndex2;
                        const setActiveBannerIndex2 = isInSecretClub ? setCurrentSecretClubBannerIndex2 : setCurrentBannerIndex2;

                        return (
                          <div className="w-full aspect-[792/236] h-auto rounded-2xl overflow-hidden relative shadow-lg border border-white/5 bg-white/5 group">
                            {activeBanners2.length > 0 ? (
                              <>
                                {activeBanners2.map((banner, index) => (
                                  <div 
                                    key={banner.id} 
                                    className={`absolute inset-0 transition-opacity duration-1000 ${index === activeBannerIndex2 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                                  >
                                    <img src={banner.imageUrl} className="w-full h-full object-cover" />
                                    {banner.title && (
                                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e]/90 via-transparent to-transparent px-4 py-2 flex flex-col justify-end">
                                        <h4 className="font-black text-[10px] text-white text-shadow-sm">{banner.title}</h4>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                
                                {activeBanners2.length > 1 && (
                                  <>
                                    {/* Left click area to navigate to NEXT banner image */}
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setActiveBannerIndex2(prev => (prev + 1) % activeBanners2.length);
                                      }}
                                      className="absolute top-0 bottom-0 left-0 w-[45%] z-20 cursor-pointer"
                                      title="التالي"
                                    />
                                    {/* Right click area to navigate to PREVIOUS banner image */}
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setActiveBannerIndex2(prev => (prev - 1 + activeBanners2.length) % activeBanners2.length);
                                      }}
                                      className="absolute top-0 bottom-0 right-0 w-[45%] z-20 cursor-pointer"
                                      title="السابق"
                                    />
                                  </>
                                )}
                              </>
                            ) : (
                              // If empty, keep it quiet and clean as requested: (فاضي ما تحطش فيه صور)
                              <div className="h-full flex items-center justify-center opacity-10">
                                <i className="fas fa-images text-sm" />
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Grid for other remaining rooms of the application */}
                      {remainingRooms.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {remainingRooms.map((room) => (
                            <RoomCard 
                              key={room.id} 
                              room={room} 
                              design={designSettings} 
                              onClick={handleRoomClick} 
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </section>
            </div>
          </main>
          )}

          {activeTab === 'news' && <NewsPage />}
          {activeTab === 'messages' && <MessagesPage db={db} user={user} currentUserData={userData} defaultImages={defaultImages} />}
          {activeTab === 'me' && <ProfilePage initialUserData={userData} forceOpenWallet={shouldOpenWalletOnProfile} onWalletOpened={() => setShouldOpenWalletOnProfile(false)} />}
        </>
      )}

      {!showNotifications && !showCarnivalPage && !showWealthLeaderboard && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto h-16 bg-[#0d051a]/98 backdrop-blur-xl border-t border-white/5 flex justify-around items-center px-2 z-50 rounded-t-3xl">
          <button onClick={() => { setActiveTab('home'); setShowNotifications(false); }} className={`flex flex-col items-center gap-0.5 ${activeTab === 'home' && !showNotifications ? 'text-purple-400' : 'text-purple-300/30'}`}><i className="fas fa-home text-sm"></i><span className="text-[8px] font-black uppercase">{t("الرئيسية", "Home")}</span></button>
          <button onClick={() => { setActiveTab('news'); setShowNotifications(false); }} className={`flex flex-col items-center gap-0.5 ${activeTab === 'news' ? 'text-purple-400' : 'text-purple-300/30'}`}><i className="fas fa-newspaper text-sm"></i><span className="text-[8px] font-black uppercase">{t("أخبار", "News")}</span></button>
          <div className="relative -top-3 flex flex-col items-center gap-1">
            <button 
              onClick={() => {
                if (isInSecretClub) {
                  const userHasSecretRoom = rooms.some(r => r.owner?.uid === user?.uid && !!r.isSecretClub);
                  if (userHasSecretRoom) {
                    setHasRoomErrorCustomMsg(t("عذراً لديك غرفة بالفعل في النادي السري", "Sorry, you already have a room in the Secret Club"));
                    setShowHasRoomError(true);
                  } else {
                    setIsCreateSecretRoom(true);
                    setIsCreateModalOpen(true);
                  }
                } else {
                  const userHasRoom = rooms.some(r => r.owner?.uid === user?.uid && !r.isSecretClub);
                  if (userHasRoom) {
                    setHasRoomErrorCustomMsg(t("عذراً لديك غرفة بالفعل", "Sorry, you already have a room"));
                    setShowHasRoomError(true);
                  } else {
                    setIsCreateSecretRoom(false);
                    setIsCreateModalOpen(true);
                  }
                }
              }} 
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg flex items-center justify-center text-lg active:scale-90 transition-transform text-white"
            >
              <i className="fas fa-plus"></i>
            </button>
            <span className="text-[8px] font-black uppercase text-purple-300/60">{t("إنشاء", "Create")}</span>
          </div>
          <button 
            onClick={() => { setActiveTab('messages'); setShowNotifications(false); }} 
            className={`flex flex-col items-center gap-0.5 ${activeTab === 'messages' ? 'text-purple-400' : 'text-purple-300/30'}`}
          >
            <div className="relative">
              <i className="fas fa-comment-dots text-sm"></i>
              {unreadPrivateCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-[#0d051a]">
                  {unreadPrivateCount}
                </span>
              )}
            </div>
            <span className="text-[8px] font-black uppercase">{t("رسائل", "Messages")}</span>
          </button>
          <button onClick={() => { setActiveTab('me'); setShowNotifications(false); }} className={`flex flex-col items-center gap-0.5 ${activeTab === 'me' ? 'text-purple-400' : 'text-purple-300/30'}`}><i className="fas fa-user text-sm"></i><span className="text-[8px] font-black uppercase">{t("أنا", "Me")}</span></button>
        </nav>
      )}

      {isMinimized && activeRoom && (
        <div 
          className="fixed z-[300] flex flex-col items-start gap-1 touch-none group"
          style={{ left: bubblePos.x, top: bubblePos.y }}
        >
          {/* زر إغلاق شفاف فوق الفقاعة مباشرة */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleLeaveRoom();
            }}
            className="w-6 h-6 bg-black/30 backdrop-blur-md text-white/80 rounded-full flex items-center justify-center shadow-lg active:scale-75 transition-all z-[310] border border-white/10 hover:bg-red-500/50"
          >
            <i className="fas fa-times text-[10px]"></i>
          </button>
          
          <div 
            onMouseDown={onMouseDown}
            onTouchStart={onMouseDown}
            onClick={() => {
              if (!hasMoved.current) setIsMinimized(false);
            }}
            className="w-16 h-16 rounded-full border-[3px] border-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-move overflow-hidden bg-[#1a0b2e] active:scale-95 transition-all animate-slow-rotate relative"
          >
            <img src={activeRoom.coverImage} className="w-full h-full object-cover pointer-events-none select-none" alt="minimized" />
            <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-transparent pointer-events-none"></div>
          </div>
        </div>
      )}

      <CreateRoomModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsCreateSecretRoom(false);
        }} 
        isSecretClub={isCreateSecretRoom}
      />
      
      <AnimatePresence>
        {showHasRoomError && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowHasRoomError(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a0b2e]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 w-full max-w-[300px] text-center shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 mx-auto mb-4">
                <i className="fas fa-exclamation-triangle text-2xl"></i>
              </div>
              <h4 className="text-white font-black text-sm mb-2">{t("تنبيه", "Warning")}</h4>
              <p className="text-white/60 text-[11px] leading-relaxed mb-6 font-bold">
                {hasRoomErrorCustomMsg || t("عذراً لديك غرفة بالفعل", "Sorry, you already have a room")}
              </p>
              <button 
                onClick={() => setShowHasRoomError(false)}
                className="w-full py-3 bg-purple-600 text-white text-xs font-black rounded-xl active:scale-95 transition-transform"
              >
                {t("فهمت ذلك", "I understand")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showPasswordPrompt && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-[320px] bg-[#2d0f4d]/90 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <header className="p-5 flex justify-between items-center border-b border-white/5">
              <h3 className="text-white font-black text-sm">{t("هذه الغرفة مغلقة", "This room is locked")}</h3>
              <button onClick={() => setShowPasswordPrompt(false)} className="text-white/40 hover:text-white transition-colors">
                <i className="fas fa-times text-xs"></i>
              </button>
            </header>
            
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden shadow-lg border border-white/10">
                  <img src={passwordRoom?.coverImage} className="w-full h-full object-cover" />
                </div>
                <h4 className="text-white font-black text-xs">{passwordRoom?.title}</h4>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest pl-2">{t("أدخل كلمة المرور", "Enter Password")}</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={joiningPassword}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length <= 6) setJoiningPassword(val);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-sm font-black text-white outline-none focus:border-purple-500/40 transition-all shadow-inner tracking-[0.5em]"
                  placeholder="••••••"
                />
              </div>

              <button 
                onClick={verifyPassword}
                disabled={joiningPassword.length !== 6}
                className="w-full bg-purple-600/20 border border-purple-500/40 backdrop-blur-md py-4 rounded-2xl font-black text-[11px] text-white shadow-xl active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-door-open"></i>
                <span>{t("دخول الغرفة", "Enter Room")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تعديل هنا: الغرفة تبقى نشطة في الـ DOM ولكنها تختفي عند التصغير للحفاظ على حالتها وعدم تكرار الترحيب */}
      {activeRoom && (
        <div className={isMinimized ? "hidden" : "contents"}>
          <VoiceRoom 
            key={activeRoom.id}
            room={activeRoom as any} 
            onLeave={handleLeaveRoom} 
            onKicked={(roomName) => {
              setKickedRoomName(roomName);
              setShowRoomBanModal(true);
            }}
            onMinimize={() => setIsMinimized(true)}
            onOpenWallet={() => { setActiveTab('me'); setIsMinimized(false); setShouldOpenWalletOnProfile(true); handleLeaveRoom(); }}
            onOpenChat={(otherUid: string) => {
              setActiveTab('messages');
              setIsMinimized(false);
              localStorage.setItem("autoOpenChatWith", otherUid);
              window.dispatchEvent(new CustomEvent("triggerAutoOpenChat", { detail: otherUid }));
            }}
            micStates={roomMicStates}
            setMicStates={setRoomMicStates}
            isMicMuted={isMicMuted}
            setIsMicMuted={setIsMicMuted}
            messages={roomMessages}
            setMessages={setRoomMessages}
            isMinimized={isMinimized}
          />
        </div>
      )}



      <RoomBanModal 
        isOpen={showRoomBanModal} 
        onClose={() => setShowRoomBanModal(false)} 
        roomName={kickedRoomName} 
      />

      {/* Secret Club Password Entry Modal */}
      {showSecretClubPasswordModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setShowSecretClubPasswordModal(false);
            setSecretClubPasswordInput('');
            setSecretClubPasswordError('');
          }}
        >
          <div 
            className="bg-[#1a0b2e]/65 border border-white/15 rounded-3xl p-6 shadow-2xl backdrop-blur-xl w-full max-w-xs text-center relative animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                setShowSecretClubPasswordModal(false);
                setSecretClubPasswordInput('');
                setSecretClubPasswordError('');
              }}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all text-xs"
            >
              <i className="fas fa-times"></i>
            </button>

            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3 text-white shadow-inner">
              <i className="fas fa-user-secret text-xl"></i>
            </div>

            <h3 className="text-sm font-black text-white mb-1">
              {t("النادي السري", "Secret Club")}
            </h3>
            <p className="text-[11px] text-white/50 mb-4 font-medium">
              {t("يرجى إدخال باسورد الدخول للمتابعة", "Please enter the entry password to continue")}
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              setSecretClubPasswordError('');
              const trimmed = secretClubPasswordInput.trim();
              const expected = String(userData?.secretClubPassword || '').trim();

              if (!trimmed) {
                setSecretClubPasswordError(t("يرجى إدخال باسورد الدخول", "Please enter the password"));
                return;
              }

              if (expected && trimmed !== expected) {
                setSecretClubPasswordError(t("باسورد الدخول غير صحيح!", "Incorrect password!"));
                return;
              }

              // Matches! Open success welcome window
              setShowSecretClubPasswordModal(false);
              setSecretClubPasswordInput('');
              setSecretClubPasswordError('');
              setShowSecretClubWelcomeModal(true);
            }}>
              <div className="relative mb-3">
                <input 
                  type="password"
                  value={secretClubPasswordInput}
                  onChange={(e) => {
                    setSecretClubPasswordInput(e.target.value);
                    if (secretClubPasswordError) setSecretClubPasswordError('');
                  }}
                  placeholder={t("باسورد الدخول...", "Password...")}
                  autoFocus
                  className="w-full bg-white/10 border border-white/15 rounded-2xl py-2.5 px-4 text-xs text-white text-center tracking-widest placeholder:tracking-normal placeholder:text-white/30 outline-none focus:border-purple-400/50 transition-all font-mono backdrop-blur-sm"
                />
              </div>

              {secretClubPasswordError && (
                <p className="text-[10px] text-rose-400 font-bold mb-3 animate-pulse">
                  {secretClubPasswordError}
                </p>
              )}

              <button 
                type="submit"
                className="w-full bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-black py-2.5 rounded-2xl border border-white/15 transition-all shadow-lg backdrop-blur-sm"
              >
                {t("تأكيد", "Confirm")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Secret Club Welcome Modal */}
      {showSecretClubWelcomeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowSecretClubWelcomeModal(false)}
        >
          <div 
            className="bg-[#1a0b2e]/65 border border-white/15 rounded-3xl p-6 shadow-2xl backdrop-blur-xl w-full max-w-xs text-center relative animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowSecretClubWelcomeModal(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all text-xs"
            >
              <i className="fas fa-times"></i>
            </button>

            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto mb-3 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <i className="fas fa-check-circle text-2xl"></i>
            </div>

            <h3 className="text-sm font-black text-white mb-2">
              {t("النادي السري", "Secret Club")}
            </h3>
            
            <p className="text-xs text-white/90 font-bold mb-6 leading-relaxed">
              {t("تم الدخول بنجاح استمتع بوقتك وافعل ما تريد", "Entered successfully, enjoy your time and do whatever you want")}
            </p>

            <button 
              onClick={() => {
                setShowSecretClubWelcomeModal(false);
                setIsInSecretClub(true);
              }}
              className="w-full bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-black py-2.5 rounded-2xl border border-white/15 transition-all shadow-lg backdrop-blur-sm"
            >
              {t("دخول النادي السري", "Enter Secret Club")}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-slow-rotate {
          animation: slowRotate 8s linear infinite;
        }
        @keyframes gradientX {
          0% { background-position: 200% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% auto;
          animation: gradientX 4s linear infinite;
        }
      `}</style>
    </div>
  );
};

// Component for rendering Top 1, Top 2, and Top 3 user avatars and customizable podium frames on the main buttons
const PodiumOverlay: React.FC<{ mode: 'wealth' | 'charisma', designSettings: any, allUsers: any[] }> = ({ mode, designSettings, allUsers }) => {
  const { t } = useLanguage();
  
  const getTop3Users = (mode: 'wealth' | 'charisma') => {
    const list = [...allUsers]
      .map(u => ({ ...u, score: mode === 'charisma' ? (u.charismaXP || 0) : (u.wealthXP || 0) }))
      .sort((a, b) => b.score - a.score);

    // Mock fallbacks
    const fallbackTop1 = {
      id: "mock-1",
      displayName: t("أدهم يسري", "Adham Yosry"),
      photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
    };
    const fallbackTop2 = {
      id: "mock-2",
      displayName: t("رائد فضاء", "Space Traveler"),
      photoURL: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150"
    };
    const fallbackTop3 = {
      id: "mock-3",
      displayName: t("مستكشف", "Explorer"),
      photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
    };

    return [
      list[0] || fallbackTop1,
      list[1] || fallbackTop2,
      list[2] || fallbackTop3
    ];
  };

  const getUserAvatar = (userObj: any) => {
    if (!userObj) return "https://space-yalla.web.app/default-avatar.png";
    if (userObj.animatedAvatar && String(userObj.animatedAvatar).trim() !== "") {
      return userObj.animatedAvatar;
    }
    if (userObj.photoURL && String(userObj.photoURL).trim() !== "") {
      return userObj.photoURL;
    }
    if (userObj.profileImage && String(userObj.profileImage).trim() !== "") {
      return userObj.profileImage;
    }
    if (userObj.userImage && String(userObj.userImage).trim() !== "") {
      return userObj.userImage;
    }
    if (userObj.avatar && String(userObj.avatar).trim() !== "") {
      return userObj.avatar;
    }
    return "https://space-yalla.web.app/default-avatar.png";
  };

  const renderAvatar = (userObj: any, sizeClass: string) => {
    const url = getUserAvatar(userObj);
    const isVid = url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
    
    if (isVid) {
      return (
        <video 
          src={url}
          autoPlay
          loop
          muted
          playsInline
          className={`${sizeClass} rounded-full object-cover relative z-0`}
        />
      );
    }
    
    return (
      <img 
        referrerPolicy="no-referrer"
        src={url} 
        className={`${sizeClass} rounded-full object-cover relative z-0`} 
        alt="Avatar"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "https://space-yalla.web.app/default-avatar.png";
        }}
      />
    );
  };

  const top3 = getTop3Users(mode);
  const top1User = top3[0];
  const top2User = top3[1];
  const top3User = top3[2];

  // Load configured custom podium frames
  const f1 = designSettings?.top1PodiumFrame || "";
  const f2 = designSettings?.top2PodiumFrame || "";
  const f3 = designSettings?.top3PodiumFrame || "";

  return (
    <div className="absolute inset-y-0 right-[5px] z-10 pointer-events-none flex items-center justify-center">
      {/* Trio Arrangement: Rank 2, Rank 1, Rank 3 */}
      <div className="flex items-end justify-center h-full pb-[10%] gap-1">
        
        {/* Rank 2 - Left */}
        <div className="flex flex-col items-center relative">
          <div className="relative w-[27px] h-[27px] flex items-center justify-center">
            {renderAvatar(top2User, "w-[21px] h-[21px]")}
            {f2 ? (
              <img 
                referrerPolicy="no-referrer"
                src={f2} 
                className="absolute inset-0 w-full h-full object-contain z-10 scale-[1.14] pointer-events-none" 
                alt="Rank 2 Frame"
              />
            ) : (
              <div className="absolute inset-0 rounded-full border border-slate-300 z-10 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Rank 1 - Center (Elevated) */}
        <div className="flex flex-col items-center relative pb-1">
          <div className="relative w-[34px] h-[34px] flex items-center justify-center">
            {renderAvatar(top1User, "w-[26px] h-[26px]")}
            {f1 ? (
              <img 
                referrerPolicy="no-referrer"
                src={f1} 
                className="absolute inset-0 w-full h-full object-contain z-10 scale-[1.14] pointer-events-none" 
                alt="Rank 1 Frame"
              />
            ) : (
              <div className="absolute inset-0 rounded-full border border-yellow-400 z-10 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Rank 3 - Right */}
        <div className="flex flex-col items-center relative">
          <div className="relative w-[27px] h-[27px] flex items-center justify-center">
            {renderAvatar(top3User, "w-[21px] h-[21px]")}
            {f3 ? (
              <img 
                referrerPolicy="no-referrer"
                src={f3} 
                className="absolute inset-0 w-full h-full object-contain z-10 scale-[1.14] pointer-events-none" 
                alt="Rank 3 Frame"
              />
            ) : (
              <div className="absolute inset-0 rounded-full border border-amber-600 z-10 pointer-events-none" />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;
