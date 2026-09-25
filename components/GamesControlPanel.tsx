import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { 
  doc, updateDoc, collection, query, limit, 
  onSnapshot, setDoc, where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useLanguage } from '../LanguageContext';

interface GamesControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const parseArabicAndEnglishFloat = (str: string): number => {
  if (!str) return NaN;
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  let cleaned = String(str).trim();
  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replace(arabicDigits[i], String(i)).replace(persianDigits[i], String(i));
  }
  cleaned = cleaned.replace(/,/g, '.');
  return parseFloat(cleaned);
};

export const GamesControlPanel: React.FC<GamesControlPanelProps> = ({ isOpen, onClose }) => {
  const { language, t } = useLanguage();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [fruitsGlobalSettings, setFruitsGlobalSettings] = useState<any>({
    lossThreshold: 10000000,
    globalDifficulty: 'balanced', // 'easy', 'balanced', 'hard'
    totalProfit24h: 0,
    totalRounds: 0
  });
  const [fruitsActiveBets, setFruitsActiveBets] = useState<any[]>([]);
  const [fruitsPlayers, setFruitsPlayers] = useState<any[]>([]);
  const [fruitsSearchQuery, setFruitsSearchQuery] = useState('');
  const [fruitsGameIcon, setFruitsGameIcon] = useState<string | null>(null);
  
  // Aviator States
  const [aviatorGlobalSettings, setAviatorGlobalSettings] = useState<any>({
    totalRounds: 0,
    totalProfit: 0,
    totalVolume: 0,
    gameIcon: null
  });
  const [aviatorGameIcon, setAviatorGameIcon] = useState<string | null>(null);
  const [aviatorPlayers, setAviatorPlayers] = useState<any[]>([]);
  const [aviatorSearchQuery, setAviatorSearchQuery] = useState('');
  const [customMultipliersInput, setCustomMultipliersInput] = useState<{[key: string]: string}>({});
  const [saveFeedback, setSaveFeedback] = useState<{[key: string]: boolean}>({});

  // Lucky77 States
  const [lucky77GlobalSettings, setLucky77GlobalSettings] = useState<any>({
    lossThreshold: 8000000,
    globalDifficulty: 'balanced',
    totalProfit24h: 0,
    totalRounds: 0,
    gameIcon: null
  });
  const [lucky77GameIcon, setLucky77GameIcon] = useState<string | null>(null);
  const [lucky77ActiveBets, setLucky77ActiveBets] = useState<any[]>([]);
  const [lucky77Players, setLucky77Players] = useState<any[]>([]);
  const [lucky77SearchQuery, setLucky77SearchQuery] = useState('');

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'fruits' | 'aviator' | 'lucky77'>('fruits');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  useEffect(() => {
    if (!isOpen) return;

    // Listen to users for mapping custom IDs / display names
    const unsubUsers = onSnapshot(query(collection(db, "users"), limit(500)), (snap) => {
      setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.log("Users snapshot error:", err));

    // Listen to global fruits settings
    const unsubFruitsSettings = onSnapshot(doc(db, "settings", "fruitsGame"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFruitsGlobalSettings(data);
        setFruitsGameIcon(data.gameIcon || null);
      }
    }, (err) => console.log("Fruits settings snapshot error:", err));

    // Listen to global aviator settings
    const unsubAviatorSettings = onSnapshot(doc(db, "settings", "aviatorGame"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAviatorGlobalSettings(data);
        setAviatorGameIcon(data.gameIcon || null);
      }
    }, (err) => console.log("Aviator settings snapshot error:", err));

    // Listen to active bets
    const unsubFruitsActiveBets = onSnapshot(collection(db, "fruitsGameActiveBets"), (snap) => {
      setFruitsActiveBets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.log("Fruits active bets snapshot error:", err));

    // Listen to players with active history/total bets
    const unsubFruitsPlayers = onSnapshot(query(collection(db, "users"), where("fruitsTotalBet", ">", 0), limit(100)), (snap) => {
      setFruitsPlayers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.log("Fruits players snapshot error:", err));

    // Listen to players with active history/total bets in Aviator
    const unsubAviatorPlayers = onSnapshot(query(collection(db, "users"), where("aviatorTotalBet", ">", 0), limit(100)), (snap) => {
      setAviatorPlayers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.log("Aviator players snapshot error:", err));

    // Listen to global lucky77 settings
    const unsubLucky77Settings = onSnapshot(doc(db, "settings", "lucky77Game"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLucky77GlobalSettings(data);
        setLucky77GameIcon(data.gameIcon || null);
      }
    }, (err) => console.log("Lucky77 settings snapshot error:", err));

    // Listen to lucky77 active bets
    const unsubLucky77ActiveBets = onSnapshot(collection(db, "lucky77ActiveBets"), (snap) => {
      setLucky77ActiveBets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.log("Lucky77 active bets snapshot error:", err));

    // Listen to players with active history/total bets in Lucky77
    const unsubLucky77Players = onSnapshot(query(collection(db, "users"), where("lucky77TotalBet", ">", 0), limit(100)), (snap) => {
      setLucky77Players(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.log("Lucky77 players snapshot error:", err));

    return () => {
      unsubUsers();
      unsubFruitsSettings();
      unsubAviatorSettings();
      unsubFruitsActiveBets();
      unsubFruitsPlayers();
      unsubAviatorPlayers();
      unsubLucky77Settings();
      unsubLucky77ActiveBets();
      unsubLucky77Players();
    };
  }, [isOpen, refreshTrigger]);

  if (!isOpen) return null;

  const isVideoUrl = (url: string | null) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
  };

  // Compile full user listing for user search and custom luck tuning
  const activeUserIdsFromBets = Array.from(new Set(fruitsActiveBets.map(bet => bet.userId).filter(Boolean)));
  const uniquePlayersMap = new Map<string, any>();
  
  // Always include the current user at the top of Fruits
  const currentUid = auth.currentUser?.uid;
  if (currentUid) {
    const adminUserDoc = allUsers.find(u => u.id === currentUid);
    if (adminUserDoc) {
      uniquePlayersMap.set(currentUid, adminUserDoc);
    }
  }

  fruitsPlayers.forEach(p => {
    if (p && p.id) {
      uniquePlayersMap.set(p.id, p);
    }
  });
  
  activeUserIdsFromBets.forEach(uid => {
    if (uid && !uniquePlayersMap.has(uid)) {
      const userDoc = allUsers.find(u => u.id === uid);
      if (userDoc) {
        uniquePlayersMap.set(uid, userDoc);
      } else {
        const betInfo = fruitsActiveBets.find(b => b.userId === uid);
        uniquePlayersMap.set(uid, {
          id: uid,
          displayName: betInfo?.userName || "لاعب نشط",
          photoURL: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>",
          fruitsTotalBet: betInfo?.amount || 0,
          fruitsTotalWin: 0,
          customId: uid ? uid.substring(0, 8) : ""
        });
      }
    }
  });

  // Always seed general users for fruits so the admin can always find them
  allUsers.slice(0, 50).forEach(u => {
    if (u && u.id && !uniquePlayersMap.has(u.id)) {
      uniquePlayersMap.set(u.id, u);
    }
  });

  if (fruitsSearchQuery.trim()) {
    const searchLower = fruitsSearchQuery.toLowerCase();
    allUsers.forEach(u => {
      const dispName = (u?.displayName || "").toLowerCase();
      const custId = (u?.customId || "").toString().toLowerCase();
      const matches = dispName.includes(searchLower) || custId.includes(searchLower);
      if (matches && u?.id && !uniquePlayersMap.has(u.id)) {
        uniquePlayersMap.set(u.id, u);
      }
    });
  }

  let unifiedFruitsPlayersList = Array.from(uniquePlayersMap.values());

  // Sort current logged-in user at the absolute top of the Fruits control panel
  if (currentUid) {
    unifiedFruitsPlayersList.sort((a, b) => {
      if (a.id === currentUid) return -1;
      if (b.id === currentUid) return 1;
      return 0;
    });
  }

  if (fruitsSearchQuery.trim()) {
    const searchLower = fruitsSearchQuery.toLowerCase();
    unifiedFruitsPlayersList = unifiedFruitsPlayersList.filter(p => {
      const dispName = (p?.displayName || "").toLowerCase();
      const custId = (p?.customId || "").toString().toLowerCase();
      const pId = (p?.id || "").toLowerCase();
      return dispName.includes(searchLower) || custId.includes(searchLower) || pId.includes(searchLower);
    });
  }

  // Compile full user listing for Aviator user search and custom strategy/luck tuning
  const uniqueAviatorPlayersMap = new Map<string, any>();
  
  // ALWAYS add the currently logged-in admin user to Aviator map
  if (currentUid) {
    const adminUserDoc = allUsers.find(u => u.id === currentUid);
    if (adminUserDoc) {
      uniqueAviatorPlayersMap.set(currentUid, adminUserDoc);
    }
  }

  // Seed with actual aviator players
  aviatorPlayers.forEach(p => {
    if (p && p.id) {
      uniqueAviatorPlayersMap.set(p.id, p);
    }
  });
  
  // Seed other general users by default so the listing is never empty
  allUsers.slice(0, 50).forEach(u => {
    if (u && u.id && !uniqueAviatorPlayersMap.has(u.id)) {
      uniqueAviatorPlayersMap.set(u.id, u);
    }
  });

  if (aviatorSearchQuery.trim()) {
    const searchLower = aviatorSearchQuery.toLowerCase();
    allUsers.forEach(u => {
      if (u && u.id) {
        const dispName = (u?.displayName || "").toLowerCase();
        const custId = (u?.customId || "").toString().toLowerCase();
        const matches = dispName.includes(searchLower) || custId.includes(searchLower);
        if (matches && !uniqueAviatorPlayersMap.has(u.id)) {
          uniqueAviatorPlayersMap.set(u.id, u);
        }
      }
    });
  }

  let unifiedAviatorPlayersList = Array.from(uniqueAviatorPlayersMap.values());

  // Sort current logged-in user at the absolute top of the Aviator control panel
  if (currentUid) {
    unifiedAviatorPlayersList.sort((a, b) => {
      if (a.id === currentUid) return -1;
      if (b.id === currentUid) return 1;
      return 0;
    });
  }

  if (aviatorSearchQuery.trim()) {
    const searchLower = aviatorSearchQuery.toLowerCase();
    unifiedAviatorPlayersList = unifiedAviatorPlayersList.filter(p => {
      const dispName = (p?.displayName || "").toLowerCase();
      const custId = (p?.customId || "").toString().toLowerCase();
      const pId = (p?.id || "").toLowerCase();
      return dispName.includes(searchLower) || custId.includes(searchLower) || pId.includes(searchLower);
    });
  }

  // Compile full user listing for Lucky77 user search and custom luck tuning
  const uniqueLucky77PlayersMap = new Map<string, any>();
  
  if (currentUid) {
    const adminUserDoc = allUsers.find(u => u.id === currentUid);
    if (adminUserDoc) {
      uniqueLucky77PlayersMap.set(currentUid, adminUserDoc);
    }
  }

  // Seed with actual lucky77 players
  lucky77Players.forEach(p => {
    if (p && p.id) {
      uniqueLucky77PlayersMap.set(p.id, p);
    }
  });
  
  // Seed other general users by default so the listing is never empty
  allUsers.slice(0, 50).forEach(u => {
    if (u && u.id && !uniqueLucky77PlayersMap.has(u.id)) {
      uniqueLucky77PlayersMap.set(u.id, u);
    }
  });

  if (lucky77SearchQuery.trim()) {
    const searchLower = lucky77SearchQuery.toLowerCase();
    allUsers.forEach(u => {
      if (u && u.id) {
        const dispName = (u?.displayName || "").toLowerCase();
        const custId = (u?.customId || "").toString().toLowerCase();
        const matches = dispName.includes(searchLower) || custId.includes(searchLower);
        if (matches && !uniqueLucky77PlayersMap.has(u.id)) {
          uniqueLucky77PlayersMap.set(u.id, u);
        }
      }
    });
  }

  let unifiedLucky77PlayersList = Array.from(uniqueLucky77PlayersMap.values());

  // Sort current logged-in user at the absolute top of the Lucky77 control panel
  if (currentUid) {
    unifiedLucky77PlayersList.sort((a, b) => {
      if (a.id === currentUid) return -1;
      if (b.id === currentUid) return 1;
      return 0;
    });
  }

  if (lucky77SearchQuery.trim()) {
    const searchLower = lucky77SearchQuery.toLowerCase();
    unifiedLucky77PlayersList = unifiedLucky77PlayersList.filter(p => {
      const dispName = (p?.displayName || "").toLowerCase();
      const custId = (p?.customId || "").toString().toLowerCase();
      const pId = (p?.id || "").toLowerCase();
      return dispName.includes(searchLower) || custId.includes(searchLower) || pId.includes(searchLower);
    });
  }

  return (
    <div className="fixed inset-0 z-[600] bg-[#0d051a]/98 backdrop-blur-2xl flex flex-col h-full overflow-hidden text-right" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <header className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0d051a]">
        <h2 className="text-white font-black text-lg flex items-center gap-2">
          <i className="fas fa-gamepad text-purple-400"></i>
          {t("لوحة تحكم الألعاب", "Games Control Panel")}
        </h2>
        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-95">
          <i className="fas fa-times"></i>
        </button>
      </header>

      {/* Tabs Navigation Bar */}
      <div className="flex bg-black/40 border-b border-white/5 p-1 gap-1">
        <button 
          onClick={() => setActiveTab('fruits')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === 'fruits' 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10' 
              : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          <span>🍓</span>
          <span>{t("لعبة الفواكه", "Fruits Game")}</span>
        </button>
        <button 
          onClick={() => setActiveTab('aviator')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === 'aviator' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/10' 
              : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          <span>✈️</span>
          <span>{t("لعبة الطائرة", "Aviator Game")}</span>
        </button>
        <button 
          onClick={() => setActiveTab('lucky77')}
          className={`flex-1 py-3 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
            activeTab === 'lucky77' 
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/10' 
              : 'text-white/40 hover:text-white/70 hover:bg-white/5'
          }`}
        >
          <span>🎰</span>
          <span>{t("Lucky 77", "Lucky 77")}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
        {/* Unified Game Launch Icons & Previews Section */}
        <div className="bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-amber-950/30 p-5 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <i className="fas fa-images text-purple-400"></i>
              {t("صور وأيقونات تشغيل الألعاب في الغرفة", "Room Game Launch Icons & Previews")}
            </h3>
            <span className="text-[9px] font-black tracking-widest text-white/40 uppercase bg-white/5 px-2.5 py-1 rounded-full border border-white/10">3 {t("ألعاب", "GAMES")}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
            {/* 1. Fruits Icon Config */}
            <div className="bg-[#140624]/60 p-4 rounded-2xl border border-purple-500/10 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-start">
                  <span className="text-sm">🍓</span>
                  <span className="text-xs font-extrabold text-purple-200">{t("لعبة الفواكه", "Fruits Game")}</span>
                </div>
                
                {/* Live Preview */}
                <div className="w-full h-32 rounded-xl bg-purple-950/30 border border-purple-500/20 overflow-hidden flex items-center justify-center relative group">
                  {fruitsGameIcon ? (
                    <img 
                      src={fruitsGameIcon || ''} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%231a0b36"/><text x="50%" y="55%" font-size="24" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff">⚠️ Error</text></svg>';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 opacity-60">
                      <span className="text-4xl">🍓</span>
                      <span className="text-[10px] text-white/50">{t("الأيقونة الافتراضية", "Default Icon")}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded-md text-[8px] font-black text-purple-300 border border-purple-500/20 uppercase">
                    {t("معاينة حية", "Live Preview")}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-white/40 block font-bold text-right">{t("رابط صورة الفواكه:", "Fruits Image URL:")}</label>
                  <input 
                    type="text"
                    value={fruitsGameIcon || ''}
                    onChange={(e) => setFruitsGameIcon(e.target.value)}
                    placeholder={t("ضع رابط الصورة...", "Image URL...")}
                    className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-2.5 text-[10px] font-bold text-white focus:outline-none focus:border-purple-500 text-left truncate"
                  />
                </div>
              </div>

              <button 
                onClick={async () => {
                  try {
                    await setDoc(doc(db, "settings", "fruitsGame"), { gameIcon: fruitsGameIcon }, { merge: true });
                    alert(t("تم حفظ أيقونة لعبة الفواكه بنجاح!", "Fruits game icon saved successfully!"));
                  } catch (err) {}
                }}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-[10px] font-black text-white active:scale-95 transition-all shadow-md mt-auto shadow-purple-600/20 font-sans"
              >
                {t("حفظ صورة الفواكه", "Save Fruits Icon")}
              </button>
            </div>

            {/* 2. Aviator Icon Config */}
            <div className="bg-[#0e0722]/60 p-4 rounded-2xl border border-indigo-500/10 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-start">
                  <span className="text-sm">✈️</span>
                  <span className="text-xs font-extrabold text-indigo-200">{t("لعبة الطائرة", "Aviator Game")}</span>
                </div>
                
                {/* Live Preview */}
                <div className="w-full h-32 rounded-xl bg-indigo-950/30 border border-indigo-500/20 overflow-hidden flex items-center justify-center relative group">
                  {aviatorGameIcon ? (
                    <img 
                      src={aviatorGameIcon || ''} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%230b0525"/><text x="50%" y="55%" font-size="24" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff">⚠️ Error</text></svg>';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 opacity-60">
                      <span className="text-4xl">✈️</span>
                      <span className="text-[10px] text-white/50">{t("الأيقونة الافتراضية", "Default Icon")}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded-md text-[8px] font-black text-indigo-300 border border-indigo-500/20 uppercase">
                    {t("معاينة حية", "Live Preview")}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-white/40 block font-bold text-right">{t("رابط صورة الطائرة:", "Aviator Image URL:")}</label>
                  <input 
                    type="text"
                    value={aviatorGameIcon || ''}
                    onChange={(e) => setAviatorGameIcon(e.target.value)}
                    placeholder={t("ضع رابط الصورة...", "Image URL...")}
                    className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-2.5 text-[10px] font-bold text-white focus:outline-none focus:border-indigo-500 text-left truncate"
                  />
                </div>
              </div>

              <button 
                onClick={async () => {
                  try {
                    await setDoc(doc(db, "settings", "aviatorGame"), { gameIcon: aviatorGameIcon }, { merge: true });
                    alert(t("تم حفظ أيقونة لعبة الطائرة بنجاح!", "Aviator game icon saved successfully!"));
                  } catch (err) {}
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-[10px] font-black text-white active:scale-95 transition-all shadow-md mt-auto shadow-indigo-600/20 font-sans"
              >
                {t("حفظ صورة الطائرة", "Save Aviator Icon")}
              </button>
            </div>

            {/* 3. Lucky77 Icon Config */}
            <div className="bg-[#1f0f05]/60 p-4 rounded-2xl border border-amber-500/10 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-start">
                  <span className="text-sm">🎰</span>
                  <span className="text-xs font-extrabold text-amber-200">{t("لعبة Lucky 77", "Lucky 77 Game")}</span>
                </div>
                
                {/* Live Preview */}
                <div className="w-full h-32 rounded-xl bg-amber-950/30 border border-amber-500/20 overflow-hidden flex items-center justify-center relative group">
                  {lucky77GameIcon ? (
                    <img 
                      src={lucky77GameIcon || ''} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%232b1302"/><text x="50%" y="55%" font-size="24" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff">⚠️ Error</text></svg>';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 opacity-60">
                      <span className="text-4xl">🎰</span>
                      <span className="text-[10px] text-white/50">{t("الأيقونة الافتراضية", "Default Icon")}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded-md text-[8px] font-black text-amber-300 border border-amber-500/20 uppercase">
                    {t("معاينة حية", "Live Preview")}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-white/40 block font-bold text-right">{t("رابط صورة Lucky 77:", "Lucky 77 Image URL:")}</label>
                  <input 
                    type="text"
                    value={lucky77GameIcon || ''}
                    onChange={(e) => setLucky77GameIcon(e.target.value)}
                    placeholder={t("ضع رابط الصورة...", "Image URL...")}
                    className="w-full bg-black/40 border border-white/5 rounded-lg py-1.5 px-2.5 text-[10px] font-bold text-white focus:outline-none focus:border-amber-500 text-left truncate"
                  />
                </div>
              </div>

              <button 
                onClick={async () => {
                  try {
                    await setDoc(doc(db, "settings", "lucky77Game"), { gameIcon: lucky77GameIcon }, { merge: true });
                    alert(t("تم حفظ أيقونة لعبة Lucky 77 بنجاح!", "Lucky 77 game icon saved successfully!"));
                  } catch (err) {}
                }}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 rounded-xl text-[10px] font-black text-white active:scale-95 transition-all shadow-md mt-auto shadow-amber-600/25 font-sans"
              >
                {t("حفظ صورة Lucky 77", "Save Lucky 77 Icon")}
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'fruits' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Section title */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="text-xl">🍓</span>
              <h3 className="text-sm font-black text-white">{t("لعبة الفواكه (Fruits)", "Fruits Game")}</h3>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3 pb-2">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest leading-none">{t("إجمالي الجولات", "Total Rounds")}</p>
                   <i className="fas fa-history text-purple-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none">{fruitsGlobalSettings.totalRounds || 0}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">{t("أرباح 24 ساعة", "24h Profits")}</p>
                   <i className="fas fa-coins text-emerald-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none flex items-center gap-1">
                   {(fruitsGlobalSettings.totalProfit24h || 0).toLocaleString('en-US')} <span className="text-[8px] text-yellow-500 font-black">{t("كوينز", "Coins")}</span>
                 </p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">{t("الرهانات النشطة", "Active Bets")}</p>
                   <i className="fas fa-dice text-orange-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none">{fruitsActiveBets.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString('en-US')}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest leading-none">{t("اللاعبين النشطين", "Active Players")}</p>
                   <i className="fas fa-users text-pink-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none">{new Set(fruitsActiveBets.map(b => b.userId)).size}</p>
              </div>
            </div>



            {/* Global Algorithm Settings */}
            <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/10 space-y-4 shadow-2xl">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <i className="fas fa-cogs text-purple-400 flex-shrink-0"></i>
                {t("خوارزميات اللعبة العامة", "Global Game Algorithms")}
              </h4>
              
              <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-purple-300/80 uppercase tracking-widest pl-2 block">{t("صعوبة اللعبة (لكل المستخدمين)", "Game Difficulty (All Users)")}</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/30 rounded-2xl border border-white/5">
                       {['easy', 'balanced', 'hard'].map(mode => (
                         <button 
                           key={mode}
                           onClick={() => setDoc(doc(db, "settings", "fruitsGame"), { globalDifficulty: mode }, { merge: true })}
                           className={`py-2 rounded-xl text-[10px] font-black transition-all flex flex-col items-center justify-center gap-0.5 border ${
                             fruitsGlobalSettings.globalDifficulty === mode 
                               ? 'bg-purple-600 border-purple-500 text-white shadow-md' 
                               : 'bg-transparent border-transparent text-white/50 hover:text-white/80'
                           }`}
                         >
                           <span className="text-xs">
                             {mode === 'easy' ? '🟢' : mode === 'balanced' ? '🟡' : '🔴'}
                           </span>
                           <span className="text-[9px]">
                             {mode === 'easy' ? t('سهل (ربح)', 'Easy (Win)') : mode === 'balanced' ? t('متوازن', 'Balanced') : t('صعب (خسارة)', 'Hard (Loss)')}
                           </span>
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-purple-300/80 uppercase tracking-widest block">{t("حد تفعيل خوارزمية الخسارة (Threshold)", "Loss Threshold")}</label>
                    <div className="flex gap-2">
                       <input 
                         type="text" 
                         inputMode="numeric"
                         value={fruitsGlobalSettings.lossThreshold ?? 0} 
                         onChange={e => {
                           let rawVal = e.target.value;
                           const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
                           const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
                           for (let i = 0; i < 10; i++) {
                             rawVal = rawVal.replace(new RegExp(arabicDigits[i], 'g'), String(i))
                                            .replace(new RegExp(persianDigits[i], 'g'), String(i));
                           }
                           const cleaned = rawVal.replace(/[^0-9]/g, '');
                           const val = parseInt(cleaned) || 0;
                           setDoc(doc(db, "settings", "fruitsGame"), { lossThreshold: val }, { merge: true });
                         }}
                         placeholder={t("مثلاً: 10000000", "e.g., 10000000")} 
                         className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-purple-500 transition-all font-sans text-left"
                         dir="ltr"
                         lang="en"
                       />
                       <div className="bg-purple-600/30 px-3 flex items-center rounded-xl text-purple-300 text-[10px] font-black border border-purple-500/20">{t("كوينز", "Coins")}</div>
                    </div>
                    <p className="text-[8px] text-white/30 font-bold leading-normal">
                      {t("عندما يصل أرباح المستخدم لهذا المبلغ، ستبدأ الخوارزمية تلقائياً بمنعه وتوجيهه للخسارة لمنع سحب رصيد كبير.", "When a user's profit reaches this threshold, the algorithm will automatically force losses to prevent massive withdrawals.")}
                    </p>
                  </div>
              </div>
            </div>

            {/* Players List with Individual Management */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-[11px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                  <i className="fas fa-users-cog"></i>
                  {t("إدارة اللاعبين المخصصة", "Customized Players Management")}
                </h4>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleRefresh}
                    className="p-1.5 px-3 rounded-full border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/15 active:scale-95 text-[9px] text-purple-300 font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                    title={t("تحديث قائمة اللاعبين", "Refresh players list")}
                  >
                    <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''} text-[9px]`}></i>
                    <span>{t("تحديث", "REFRESH")}</span>
                  </button>
                  <span className="text-[9px] font-black text-white/40 bg-white/5 px-2.5 py-1.5 rounded-full border border-white/10 uppercase font-sans">
                    {`${unifiedFruitsPlayersList.length} ${t("لاعب", "Players")}`}
                  </span>
                </div>
              </div>

              {/* Search Player Input */}
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-300/30 text-[10px]">
                  <i className="fas fa-search"></i>
                </span>
                <input 
                  type="text" 
                  value={fruitsSearchQuery} 
                  onChange={(e) => setFruitsSearchQuery(e.target.value)} 
                  placeholder={t("بحث عن لاعب لتوجيهه للمكسب/الخسارة...", "Search for player to override win/loss status...")} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-10 pl-4 text-[11px] font-bold text-white outline-none focus:border-purple-500/40 shadow-inner" 
                />
              </div>

              {unifiedFruitsPlayersList.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-[2rem] border border-white/5 opacity-50 flex flex-col items-center justify-center gap-2">
                  <i className="fas fa-users-slash text-2xl text-purple-400"></i>
                  <p className="text-[11px] font-black text-white/40">{t("لا يوجد لاعبين مطابقين للبحث حالياً", "No matching players found")}</p>
                </div>
              ) : unifiedFruitsPlayersList.map(player => {
                const netProfit = (player.fruitsTotalWin || 0) - (player.fruitsTotalBet || 0);
                return (
                  <div key={player.id} className="bg-gradient-to-b from-white/5 to-white/[0.02] p-4 rounded-[2rem] border border-white/10 space-y-4 shadow-xl hover:bg-white/10 transition-all animate-in fade-in">
                    {/* Player Info Header */}
                    <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 font-sans">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shadow-lg flex-shrink-0">
                          {player.animatedAvatar ? (
                            isVideoUrl(player.animatedAvatar) ? (
                              <video src={player.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <img src={player.animatedAvatar} className="w-full h-full object-cover rounded-full" />
                            )
                          ) : (
                            <img src={player.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full object-cover rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-xs font-black text-white truncate max-w-[120px]">{player.displayName}</p>
                          <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mt-0.5">ID: {player.customId || (player.id || '').substring(0,8)}</p>
                        </div>
                      </div>
                      
                      <div className="text-left flex-shrink-0">
                         <div className="text-[10px] font-black flex items-center gap-1 justify-end">
                           <span className={netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                             {netProfit >= 0 ? '+' : ''}{Number(netProfit || 0).toLocaleString('en-US')}
                           </span>
                           <i className="fas fa-coins text-[8px] text-yellow-500"></i>
                         </div>
                         <p className="text-[8px] font-bold text-white/25 mt-0.5">{t("إجمالي المراهنة: ", "Total Bet: ")}{Number(player.fruitsTotalBet || 0).toLocaleString('en-US')}</p>
                      </div>
                    </div>

                    {/* Luck Range Slider (Full Width) */}
                    <div className="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-2 font-sans">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">{t("تعديل نسبة الحظ المخصص", "Adjust Custom Luck Percent")}</label>
                        <span className="text-[10px] font-black text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-md border border-purple-500/20">
                          {player.fruitsLuckPercent ?? 100}% {t("حظ", "Luck")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                         <i className="fas fa-percentage text-[10px] text-purple-400/40"></i>
                         <input 
                            type="range" min="0" max="100" 
                            value={player.fruitsLuckPercent ?? 100} 
                            onChange={e => updateDoc(doc(db, "users", player.id), { fruitsLuckPercent: parseInt(e.target.value) })}
                            className="flex-1 accent-purple-500 h-1.5 bg-white/10 rounded-full appearance-none outline-none cursor-pointer"
                         />
                      </div>
                    </div>

                    {/* Forced Loss Manual Override (Full Width) */}
                    <div className="flex items-center justify-between gap-3 bg-black/20 p-3 rounded-2xl border border-white/5 font-sans">
                      <div className="flex flex-col gap-0.5 min-w-0 text-right">
                        <span className="text-[10px] font-black text-white/80">{t("خسارة إجبارية فورية", "Forced Direct Loss")}</span>
                        <span className="text-[8px] text-white/30 font-bold truncate">{t("إجبار اللاعب على خسارة جميع رهاناته بالتأديب", "Force player to lose all subsequent bets as penalty")}</span>
                      </div>
                      <button 
                        onClick={() => updateDoc(doc(db, "users", player.id), { fruitsForcedLoss: !player.fruitsForcedLoss, fruitsForcedWin: false })}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1.5 shadow-md ${
                          player.fruitsForcedLoss 
                            ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                            : 'bg-white/5 text-white/55 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <i className={`fas ${player.fruitsForcedLoss ? 'fa-toggle-on text-red-400' : 'fa-toggle-off text-white/30'}`}></i>
                        {player.fruitsForcedLoss ? t('نشط (خسارة مستمرة)', 'Active Loss') : t('خسارة يدوية', 'Force Loss')}
                      </button>
                    </div>

                    {/* Forced Win Manual Override (Full Width) */}
                    <div className="flex items-center justify-between gap-3 bg-black/20 p-3 rounded-2xl border border-white/5 font-sans">
                      <div className="flex flex-col gap-0.5 min-w-0 text-right">
                        <span className="text-[10px] font-black text-white/80">{t("فوز إجباري فوري", "Forced Direct Win")}</span>
                        <span className="text-[8px] text-white/30 font-bold truncate">{t("إجبار اللاعب على الفوز في أي رهان يضعه", "Force player to score winnings in every bet")}</span>
                      </div>
                      <button 
                        onClick={() => updateDoc(doc(db, "users", player.id), { fruitsForcedWin: !player.fruitsForcedWin, fruitsForcedLoss: false })}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1.5 shadow-md ${
                          player.fruitsForcedWin 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                            : 'bg-white/5 text-white/55 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <i className={`fas ${player.fruitsForcedWin ? 'fa-toggle-on text-emerald-400' : 'fa-toggle-off text-white/30'}`}></i>
                        {player.fruitsForcedWin ? t('نشط (فوز مستمر)', 'Active Win') : t('مكسب إجباري', 'Force Win')}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {activeTab === 'aviator' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Section title */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="text-xl">✈️</span>
              <h3 className="text-sm font-black text-white">{t("لعبة الطائرة (Aviator)", "Aviator Game")}</h3>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3 pb-2">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">{t("إجمالي الجولات", "Total Rounds")}</p>
                   <i className="fas fa-history text-indigo-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none">{Number(aviatorGlobalSettings.totalRounds || 0).toLocaleString('en-US')}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">{t("أرباح المنصة", "Platform Profits")}</p>
                   <i className="fas fa-coins text-emerald-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none flex items-center gap-1">
                   {Number(aviatorGlobalSettings.totalProfit || 0).toLocaleString('en-US')} <span className="text-[8px] text-yellow-500 font-black">{t("كوينز", "Coins")}</span>
                 </p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">{t("حجم التداول", "Total Volume")}</p>
                   <i className="fas fa-chart-line text-orange-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none">{ Number(aviatorGlobalSettings.totalVolume || 0).toLocaleString('en-US') }</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest leading-none">{t("مسجلي الطائرة", "Aviator Registered")}</p>
                   <i className="fas fa-users text-pink-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none">{aviatorPlayers.length}</p>
              </div>
            </div>



            {/* Players List with Individual Management */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                  <i className="fas fa-users-cog"></i>
                  {t("إدارة اللاعبين وبناء الاستراتيجيات", "Players & Strategy Management")}
                </h4>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleRefresh}
                    className="p-1.5 px-3 rounded-full border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/15 active:scale-95 text-[9px] text-indigo-300 font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
                    title={t("تحديث قائمة اللاعبين", "Refresh players list")}
                  >
                    <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''} text-[9px]`}></i>
                    <span>{t("تحديث", "REFRESH")}</span>
                  </button>
                  <span className="text-[9px] font-black text-white/40 bg-white/5 px-2.5 py-1.5 rounded-full border border-white/10 uppercase font-sans">
                    {`${unifiedAviatorPlayersList.length} ${t("لاعب", "Players")}`}
                  </span>
                </div>
              </div>

              {/* Search Player Input */}
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300/30 text-[10px]">
                  <i className="fas fa-search"></i>
                </span>
                <input 
                  type="text" 
                  value={aviatorSearchQuery} 
                  onChange={(e) => setAviatorSearchQuery(e.target.value)} 
                  placeholder={t("بحث عن لاعب بالاسم أو المعرّف لتطبيق استراتيجية الطيران...", "Search for player to apply Aviator flight strategy...")} 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-10 pl-4 text-[11px] font-bold text-white outline-none focus:border-indigo-500/40 shadow-inner" 
                />
              </div>

              {unifiedAviatorPlayersList.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-[2rem] border border-white/5 opacity-50 flex flex-col items-center justify-center gap-2">
                  <i className="fas fa-users-slash text-2xl text-indigo-400"></i>
                  <p className="text-[11px] font-black text-white/40">{t("لا يوجد لاعبين مطابقين للبحث حالياً", "No matching players found")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unifiedAviatorPlayersList.map(player => {
                    const aviTotalBet = player.aviatorTotalBet || 0;
                    const aviTotalWin = player.aviatorTotalWin || 0;
                    const netProfit = aviTotalWin - aviTotalBet;
                    const currentMaxMultiplier = player.aviatorMaxMultiplier;

                    return (
                      <div key={player.id} className="bg-gradient-to-b from-white/5 to-white/[0.02] p-4 rounded-[2rem] border border-white/10 space-y-4 shadow-xl hover:bg-white/10 transition-all animate-in fade-in">
                        {/* Player Info Header */}
                        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 font-sans">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 shadow-lg flex-shrink-0">
                              {player.animatedAvatar ? (
                                isVideoUrl(player.animatedAvatar) ? (
                                  <video src={player.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full object-cover rounded-full" />
                                ) : (
                                  <img src={player.animatedAvatar} className="w-full h-full object-cover rounded-full" />
                                )
                              ) : (
                                <img src={player.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full object-cover rounded-full" />
                              )}
                            </div>
                            <div className="min-w-0 text-right">
                              <p className="text-xs font-black text-white truncate max-w-[120px] flex items-center gap-1.5 justify-end">
                                {player.id === auth.currentUser?.uid && (
                                  <span className="bg-emerald-500/20 text-emerald-300 text-[8px] px-1.5 py-0.5 rounded-md font-sans font-black border border-emerald-500/30 animate-pulse flex-shrink-0">
                                    {t("حسابك الشخصي", "Your Account")}
                                  </span>
                                )}
                                <span className="truncate">{player.displayName}</span>
                              </p>
                              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">ID: {player.customId || (player.id || '').substring(0,8)}</p>
                            </div>
                          </div>
                          
                          <div className="text-left flex-shrink-0">
                             <div className="text-[10px] font-black flex items-center gap-1 justify-end">
                               <span className={netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                 {netProfit >= 0 ? '+' : ''}{Number(netProfit || 0).toLocaleString('en-US')}
                               </span>
                               <i className="fas fa-coins text-[8px] text-yellow-500"></i>
                             </div>
                             <p className="text-[8px] font-bold text-white/25 mt-0.5">{t("مراهنات الطائرة: ", "Aviator Bets: ")}{Number(aviTotalBet || 0).toLocaleString('en-US')}</p>
                          </div>
                        </div>

                        {/* Strategy Quick selectors */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-indigo-300 uppercase tracking-wider block pr-1 text-right">
                            {t("تحديد مضاعف أقصى لطيران الطائرة (استراتيجية محددة للّاعب):", "Select maximum dynamic multiplier cap for the player:")}
                          </label>
                          <div className="grid grid-cols-4 gap-1 p-1 bg-black/30 rounded-2xl border border-white/5 font-sans">
                            {[
                              { label: 'لعب عادي', value: null, icon: '⚡' },
                              { label: 'كراش 1.1x', value: 1.15, icon: '💥' },
                              { label: 'أقصى 1.5x', value: 1.5, icon: '🛡️' },
                              { label: 'أقصى 2.0x', value: 2.0, icon: '⭐' },
                              { label: 'أقصى 3.0x', value: 3.0, icon: '🔥' },
                              { label: 'أقصى 5.0x', value: 5.0, icon: '💎' },
                              { label: 'أقصى 10x', value: 10.0, icon: '👑' },
                              { label: 'أقصى 30x', value: 30.0, icon: '🚀' },
                              { label: 'أقصى 50x', value: 50.0, icon: '🪐' },
                              { label: 'أقصى 100x', value: 100.0, icon: '💯' }
                            ].map((opt, i) => {
                              const isActive = opt.value === null 
                                ? (currentMaxMultiplier === undefined || currentMaxMultiplier === null || currentMaxMultiplier === 0)
                                : (currentMaxMultiplier === opt.value);
                              
                              return (
                                <button
                                  key={i}
                                  onClick={async () => {
                                    await updateDoc(doc(db, "users", player.id), {
                                      aviatorMaxMultiplier: opt.value
                                    });
                                    // Also clear any custom typed value to keep input in sync
                                    setCustomMultipliersInput(prev => {
                                      const next = { ...prev };
                                      delete next[player.id];
                                      return next;
                                    });
                                  }}
                                  className={`py-2 px-1 rounded-xl text-[9px] font-black transition-all flex flex-col items-center justify-center gap-0.5 border ${
                                    isActive 
                                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/10' 
                                      : 'bg-transparent border-transparent text-white/50 hover:text-white/80 hover:bg-white/5 cursor-pointer'
                                  }`}
                                >
                                  <span className="text-[10px]">{opt.icon}</span>
                                  <span className="text-[8px] truncate max-w-full">{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom multiplier value override */}
                        <div className="flex items-center gap-2 bg-black/20 p-3 rounded-2xl border border-white/5 font-sans">
                          <div className="flex-1 min-w-0">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest pl-1 block mb-1 text-right">
                              {t("أو عيّن قيمة مضاعف أقصى مخصصة بالظبط (مثلاً 1.76):", "Or set any exact custom max multiplier cap value:")}
                            </label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                inputMode="decimal"
                                placeholder={t("أدخل القيمة... مثلاً: 4.8", "Enter value... e.g.: 4.8")}
                                value={customMultipliersInput[player.id] !== undefined ? customMultipliersInput[player.id] : (currentMaxMultiplier || '')}
                                onChange={(e) => {
                                  let rawVal = e.target.value;
                                  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
                                  const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
                                  for (let i = 0; i < 10; i++) {
                                    rawVal = rawVal.replace(new RegExp(arabicDigits[i], 'g'), String(i))
                                                   .replace(new RegExp(persianDigits[i], 'g'), String(i));
                                  }
                                  const val = rawVal.replace(/[^0-9.]/g, '');
                                  const parts = val.split('.');
                                  const cleaned = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
                                  setCustomMultipliersInput(prev => ({
                                    ...prev,
                                    [player.id]: cleaned
                                  }));
                                }}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[11px] font-bold text-white focus:outline-none focus:border-indigo-500 text-left"
                                dir="ltr"
                                lang="en"
                              />
                              {(() => {
                                const valStr = customMultipliersInput[player.id] !== undefined
                                  ? customMultipliersInput[player.id]
                                  : (currentMaxMultiplier !== undefined && currentMaxMultiplier !== null ? String(currentMaxMultiplier) : '');
                                
                                const dbValStr = currentMaxMultiplier !== undefined && currentMaxMultiplier !== null ? String(currentMaxMultiplier) : '';
                                const cleanVal = valStr.trim();
                                const cleanDbVal = dbValStr.trim();
                                const isChanged = customMultipliersInput[player.id] !== undefined && cleanVal !== cleanDbVal;

                                return (
                                  <button
                                    onClick={async () => {
                                      const valNum = parseArabicAndEnglishFloat(valStr);
                                      if (isNaN(valNum) || valNum <= 1.0) {
                                        await updateDoc(doc(db, "users", player.id), {
                                          aviatorMaxMultiplier: null
                                        });
                                      } else {
                                        await updateDoc(doc(db, "users", player.id), {
                                          aviatorMaxMultiplier: valNum
                                        });
                                      }
                                      
                                      // Clear custom input so it falls back to matching the persistent database value
                                      setCustomMultipliersInput(prev => {
                                        const next = { ...prev };
                                        delete next[player.id];
                                        return next;
                                      });

                                      // Trigger transient confirmation flash
                                      setSaveFeedback(prev => ({ ...prev, [player.id]: true }));
                                      setTimeout(() => {
                                        setSaveFeedback(prev => ({ ...prev, [player.id]: false }));
                                      }, 3000);
                                    }}
                                    className={`px-4 py-2 transition-all active:scale-95 font-black text-[10px] rounded-xl border shadow-md flex items-center justify-center font-bold ${
                                      saveFeedback[player.id]
                                        ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-600 scale-102 font-sans cursor-default'
                                        : isChanged
                                          ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 cursor-pointer'
                                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 font-sans cursor-default'
                                    }`}
                                    disabled={!isChanged && !saveFeedback[player.id]}
                                  >
                                    {saveFeedback[player.id] 
                                      ? t("تم الحفظ بنجاح! ✓", "Saved Successfully! ✓") 
                                      : isChanged 
                                        ? t("حفظ الحد", "SAVE") 
                                        : t("مطبق ومحفوظ ✓", "Active & Saved ✓")}
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Strategy Description Hint */}
                        <div className="bg-indigo-500/5 border border-indigo-500/10 p-2.5 rounded-[1.25rem] flex items-start gap-2 text-right justify-start">
                          <span className="text-xs mt-0.5">⚙️</span>
                          <p className="text-[9px] font-bold text-indigo-300 leading-normal">
                            {currentMaxMultiplier && currentMaxMultiplier > 1 ? (
                              `${t("الاستراتيجية الحالية نشطة:", "Current Strategy Active:")} ${t("الطيارة لن تتخطى مضاعف", "The plane multiplier will never cross")} ${currentMaxMultiplier}x ${t("لهذا اللاعب مطلقاً. وسيتراوح كراش الطائرة تلقائياً بالحظ في حدود هذا الرقم لمنع سحب أرباح طائلة بشكل مشبوه.", "for this user. The plane crash point will play randomly underneath this cap to simulate normal game luck gracefully.")}`
                            ) : (
                              t("خيار اللعب العادي مفعل: هذا اللاعب يخضع للنسب الطبيعية وعوامل الحظ كاملة دون أي محددات أو قيود على الطيران في حسابه.", "Normal play active: This player is subject to standard random seed ratios with complete natural flight bounds and no capped multiplier overrides.")
                            )}
                          </p>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'lucky77' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Section title */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <span className="text-xl">🎰</span>
              <h3 className="text-sm font-black text-white">{t("Lucky 77 Game", "Lucky 77 Game")}</h3>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3 pb-2">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px]">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none">{t("إجمالي الجولات", "Total Rounds")}</p>
                   <i className="fas fa-history text-amber-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none">{Number(lucky77GlobalSettings?.totalRounds || 0).toLocaleString('en-US')}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px]">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">{t("أرباح المنصة", "Platform Profits")}</p>
                   <i className="fas fa-coins text-emerald-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none flex items-center gap-1">
                   {Number(lucky77GlobalSettings?.totalProfit24h || 0).toLocaleString('en-US')} <span className="text-[8px] text-yellow-500 font-black">{t("كوينز", "Coins")}</span>
                 </p>
              </div>
            </div>

            {/* Global Rules Tuning */}
            <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-sliders-h text-amber-400"></i>
                {t("الإعدادات العامة للعبة", "Lucky77 Global Config")}
              </h4>

              {/* Loss Threshold Limit */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/40 block font-black">{t("حد الربح الإجمالي لتنشيط الإصابة الإلزامية", "Loss Threshold Trigger (Coins)")}</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                    placeholder="8,000,000"
                    defaultValue={lucky77GlobalSettings?.lossThreshold || 8000000}
                    id="lucky77-loss-threshold"
                  />
                  <button
                    onClick={() => {
                      const val = (document.getElementById('lucky77-loss-threshold') as HTMLInputElement)?.value;
                      const parsed = parseInt(val) || 8000000;
                      updateDoc(doc(db, "settings", "lucky77Game"), { lossThreshold: parsed }, { merge: true });
                    }}
                    className="px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black"
                  >
                    {t("تحديث", "Update")}
                  </button>
                </div>
                <p className="text-[8px] text-white/30">{t("إذا تجاوز صافي أرباح اللاعب هذا الحد، تخسر اللعبة رهاناته تلقائياً لحماية مخازن اللعبة.", "Automatic loss forces once a user reaches this threshold of cumulative win profits.")}</p>
              </div>


            </div>

            {/* Active bets logs */}
            <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10 shadow-2xl space-y-4">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <i className="fas fa-history text-amber-500"></i>
                  {t("الرهانات النشطة بالجولة الحالية", "Active Players This Round")}
                </span>
                <span className="text-[9px] bg-amber-600/20 text-amber-400 px-2.5 py-1 rounded-full font-black">
                  {lucky77ActiveBets.length} {t("رهانات نشطة", "Active")}
                </span>
              </h4>

              {lucky77ActiveBets.length === 0 ? (
                <p className="text-[10px] text-white/30 text-start">{t("لا توجد مراهنات نشطة في الجولة الحالية.", "No active bets placed right now.")}</p>
              ) : (
                <div className="space-y-2 border-t border-white/5 pt-2 font-mono">
                  {lucky77ActiveBets.map((bet, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <div className="text-right">
                        <span className="font-sans font-black text-amber-300">{bet.userName}</span>
                        <div className="text-[8px] text-white/40 mt-0.5">ID: {bet.userId?.substring(0,8)}</div>
                      </div>
                      <div className="text-left font-sans flex items-center gap-3">
                        {bet.watermelon > 0 && <span className="text-emerald-400">🍉 {bet.watermelon.toLocaleString('en-US')}</span>}
                        {bet.plum > 0 && <span className="text-violet-400">🍇 {bet.plum.toLocaleString('en-US')}</span>}
                        {bet.lucky77 > 0 && <span className="text-yellow-400">🎰 {bet.lucky77.toLocaleString('en-US')}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User Tweak List for Lucky77 */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-users-cog text-amber-400"></i>
                {t("تعديل حظ اللاعبين فرادياً", "Custom Player Tuning (Lucky77)")}
              </h4>

              {/* Search query input */}
              <div className="relative">
                <input 
                  type="text" 
                  value={lucky77SearchQuery} 
                  onChange={(e) => setLucky77SearchQuery(e.target.value)}
                  placeholder={t("ابحث بالاسم أو ID اللاعب...", "Search by Name or Member ID...")}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white focus:outline-none focus:border-amber-500 text-right placeholder-white/20"
                />
              </div>

              {unifiedLucky77PlayersList.length === 0 ? (
                <p className="text-[10px] text-white/30 text-center">{t("لا يوجد مستخدمين للمطابقة", "No users matching your parameters found")}</p>
              ) : (
                <div className="space-y-3.5">
                  {unifiedLucky77PlayersList.map((player) => {
                    const totalBetAmt = player.lucky77TotalBet || 0;
                    const totalWinAmt = player.lucky77TotalWin || 0;
                    const luckRate = player.lucky77LuckPercent ?? 100;

                    return (
                      <div key={player.id} className="bg-white/5 p-4 rounded-[1.75rem] border border-white/10 shadow-2xl space-y-3 relative overflow-hidden">
                        <div className="flex items-center gap-3 justify-between">
                          <div className="flex items-center gap-2 text-right">
                            <img src={player.photoURL || 'https://via.placeholder.com/150'} className="w-10 h-10 rounded-full border border-white/10 object-cover" />
                            <div>
                              <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                                <span>{player.displayName || 'لاعب'}</span>
                                {player.id === currentUid && (
                                  <span className="text-[7px] text-[#0d051a] bg-amber-400 px-1 py-0.5 rounded-full font-black">أنت</span>
                                )}
                              </div>
                              <div className="text-[9px] text-white/30 font-mono mt-0.5 font-bold">
                                ID: {player.customId || player.id?.substring(0, 8)}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end text-left font-mono">
                            <span className="text-[9px] font-black text-white/25">{t("إحصائيات المراهنات", "Bet Ratios")}</span>
                            <div className="text-[10px] text-white/70 space-y-0.5 mt-0.5 font-bold">
                              <div>{t("إجمالي المراهنات: ", "Total Bet: ")}{totalBetAmt.toLocaleString('en-US')}</div>
                              <div className="text-emerald-400">{t("إجمالي الأرباح: ", "Total Win: ")}{totalWinAmt.toLocaleString('en-US')}</div>
                            </div>
                          </div>
                        </div>

                        {/* Luck Adjuster Slider */}
                        <div className="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-black text-amber-300 flex items-center gap-1">
                              <i className="fas fa-percentage text-[10px]"></i>
                              {t("معدل الحظ المخصص:", "Custom Luck Factor:")}
                            </span>
                            <span className="text-xs font-black text-white font-mono">{luckRate}%</span>
                          </div>
                          
                          <input 
                            type="range"
                            min="0"
                            max="300"
                            step="5"
                            value={luckRate}
                            onChange={(e) => updateDoc(doc(db, "users", player.id), { lucky77LuckPercent: parseInt(e.target.value) })}
                            className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-[8px] text-white/30 text-start">{t("100% نسبة طبيعية. أقل من 100% يقلل فرصته بالفوز تدريجياً. أعلى من 100% يمنحه فوزاً سهلاً متعمداً.", "100% is regular. Under 100% lowers probability. Above 100% increases odds.")}</p>
                        </div>

                        {/* Forced Win / Loss Toggles */}
                        <div className="grid grid-cols-2 gap-2 font-sans">
                          <button
                            onClick={() => updateDoc(doc(db, "users", player.id), { lucky77ForcedWin: !player.lucky77ForcedWin, lucky77ForcedLoss: false })}
                            className={`py-2 px-3 rounded-2xl text-[10px] font-black border transition-all flex items-center justify-center gap-1.5 shadow-md ${
                              player.lucky77ForcedWin 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                : 'bg-white/5 text-white/55 border-white/10'
                            }`}
                          >
                            <i className={`fas ${player.lucky77ForcedWin ? 'fa-toggle-on text-emerald-400' : 'fa-toggle-off text-white/30'}`}></i>
                            {player.lucky77ForcedWin ? t('فوز إجباري نشط', 'Forced Win Active') : t('إجبار فوز', 'Force Win')}
                          </button>
                          
                          <button
                            onClick={() => updateDoc(doc(db, "users", player.id), { lucky77ForcedLoss: !player.lucky77ForcedLoss, lucky77ForcedWin: false })}
                            className={`py-2 px-3 rounded-2xl text-[10px] font-black border transition-all flex items-center justify-center gap-1.5 shadow-md ${
                              player.lucky77ForcedLoss 
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                                : 'bg-white/5 text-white/55 border-white/10'
                            }`}
                          >
                            <i className={`fas ${player.lucky77ForcedLoss ? 'fa-toggle-on text-rose-400' : 'fa-toggle-off text-white/30'}`}></i>
                            {player.lucky77ForcedLoss ? t('خسارة إجبارية نشطة', 'Forced Loss Active') : t('إجبار خسارة', 'Force Loss')}
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
