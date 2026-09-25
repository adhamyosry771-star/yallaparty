
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { 
  doc, updateDoc, collection, query, limit, deleteDoc, addDoc, 
  serverTimestamp, orderBy, onSnapshot, setDoc, deleteField,
  collectionGroup, where, getDocs, getDoc, Timestamp, startAt, endAt
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import CPAdmin from './CPAdmin';

import { useLanguage } from '../LanguageContext';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isOfficialAdmin: boolean;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose, isOfficialAdmin }) => {
   const { language, t } = useLanguage();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchId, setSearchId] = useState('');
  const [dbSearchResults, setDbSearchResults] = useState<any[]>([]);
  const [isSearchingDB, setIsSearchingDB] = useState(false);
  const [allBanners, setAllBanners] = useState<any[]>([]);
  const [allBanners2, setAllBanners2] = useState<any[]>([]);
  const [allRoomBgs, setAllRoomBgs] = useState<any[]>([]);
  const [allNews, setAllNews] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [allOfficialMsgs, setAllOfficialMsgs] = useState<any[]>([]);
  const [allEmojis, setAllEmojis] = useState<any[]>([]);
  const [allGifts, setAllGifts] = useState<any[]>([]);
  const [allReports, setAllReports] = useState<any[]>([]);
  const [defaultProfileImage, setDefaultProfileImage] = useState<string | null>(null);
  const [defaultCoverImage, setDefaultCoverImage] = useState<string | null>(null);
  const [roomTrophyInputs, setRoomTrophyInputs] = useState<Record<string, string>>({});
  const [trophyBgSearchQuery, setTrophyBgSearchQuery] = useState('');
  const [globalTrophyBg, setGlobalTrophyBg] = useState('');
  const [globalTrophyItemBg, setGlobalTrophyItemBg] = useState('');
  const [globalTrophyTabActiveBg, setGlobalTrophyTabActiveBg] = useState('');

  const [adminTab, setAdminTab] = useState<'users' | 'news' | 'banners' | 'secretClubBanners' | 'secretClubBg' | 'bgs' | 'rooms' | 'secretClubRooms' | 'trophyBg' | 'design' | 'messages' | 'store' | 'emojis' | 'gifts' | 'support' | 'cp' | 'fruits' | 'reports' | 'mainImages' | 'agencyDesign' | 'carnival' | 'roomFrames' | 'roomCenters' | 'wealthDesign' | 'charismaDesign' | 'topFramesDesign' | 'menuButtonsDesign' | 'luckyDesign'>('users');
  const [comboButtonIcon, setComboButtonIcon] = useState<string>('');
  
  // دوائر تنبيه الفوز بالحظ (Lucky Win Alert Circles - 4 Tiers)
  const [luckyCircleTier1, setLuckyCircleTier1] = useState<string>('');
  const [luckyCircleTier2, setLuckyCircleTier2] = useState<string>('');
  const [luckyCircleTier3, setLuckyCircleTier3] = useState<string>('');
  const [luckyCircleTier4, setLuckyCircleTier4] = useState<string>('');
  
  // Top Frames / Podium Frames (اطارات التوبات)
  const [top1PodiumFrame, setTop1PodiumFrame] = useState('');
  const [top2PodiumFrame, setTop2PodiumFrame] = useState('');
  const [top3PodiumFrame, setTop3PodiumFrame] = useState('');
  
  // Room Position / Center Pinned rooms
  const [topRoom1Id, setTopRoom1Id] = useState('');
  const [topRoom2Id, setTopRoom2Id] = useState('');
  const [topRoom3Id, setTopRoom3Id] = useState('');
  const [topRoom4Id, setTopRoom4Id] = useState('');

  // States for beautiful custom room selector modal
  const [isRoomSelectorOpen, setIsRoomSelectorOpen] = useState(false);
  const [activeSlotToSelect, setActiveSlotToSelect] = useState<1 | 2 | 3 | 4 | null>(null);
  const [roomSelectorSearchQuery, setRoomSelectorSearchQuery] = useState('');

  // Carnival Opening Event states
  const [carnivalBannerUrlSetting, setCarnivalBannerUrlSetting] = useState('');
  const [carnivalBgUrl, setCarnivalBgUrl] = useState('');
  const [isCarnivalSaving, setIsCarnivalSaving] = useState(false);
  const [carnivalSettings, setCarnivalSettings] = useState<any>(null);
  const [carnivalCodes, setCarnivalCodes] = useState<any[]>([]);
  const [generatedCode, setGeneratedCode] = useState('');

  // Agency Design States
  const [agencyBackgroundUrl, setAgencyBackgroundUrl] = useState('');
  const [isAgencyDesignSaving, setIsAgencyDesignSaving] = useState(false);
  const [fruitsGlobalSettings, setFruitsGlobalSettings] = useState<any>({
    lossThreshold: 10000000,
    globalDifficulty: 'balanced', // 'easy', 'balanced', 'hard'
    totalProfit24h: 0,
    totalRounds: 0
  });
  const [fruitsActiveBets, setFruitsActiveBets] = useState<any[]>([]);
  const [fruitsPlayers, setFruitsPlayers] = useState<any[]>([]);
  const [fruitsSearchQuery, setFruitsSearchQuery] = useState('');
  
  const [showChargePopup, setShowChargePopup] = useState<string | null>(null);
  const [showDeductPopup, setShowDeductPopup] = useState<string | null>(null);
  const [showIdPopup, setShowIdPopup] = useState<string | null>(null);
  const [showGrantPopup, setShowGrantPopup] = useState<string | null>(null);
  const [showGrantAnimatedPopup, setShowGrantAnimatedPopup] = useState<string | null>(null);
  const [showBadgesPopup, setShowBadgesPopup] = useState<string | null>(null);
  const [showRoomCoverPopup, setShowRoomCoverPopup] = useState<string | null>(null);
  const [showSecretClubModal, setShowSecretClubModal] = useState<{ uid: string; name: string; currentStatus: boolean; currentPassword?: string } | null>(null);
  const [secretClubPasswordVal, setSecretClubPasswordVal] = useState('');

  const [userInventory, setUserInventory] = useState<any[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  
  const [chargeAmount, setChargeAmount] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  
  const [newCustomId, setNewCustomId] = useState('');
  const [newCustomIdIcon, setNewCustomIdIcon] = useState<string | null>(null);
  const [idOffsetX, setIdOffsetX] = useState(28); 
  const [idOffsetY, setIdOffsetY] = useState(0.5); 
  const [idFontSize, setIdFontSize] = useState(11); 

  // Coordinates split states
  const [activeIdTab, setActiveIdTab] = useState<'profile' | 'room'>('profile');
  const [profileIdOffsetX, setProfileIdOffsetX] = useState(28);
  const [profileIdOffsetY, setProfileIdOffsetY] = useState(0.5);
  const [profileIdFontSize, setProfileIdFontSize] = useState(11);
  const [roomIdOffsetX, setRoomIdOffsetX] = useState(28);
  const [roomIdOffsetY, setRoomIdOffsetY] = useState(0.5);
  const [roomIdFontSize, setRoomIdFontSize] = useState(11); 

  const [badgeUrl, setBadgeUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const [msgTitle, setMsgTitle] = useState('');
  const [msgDesc, setMsgDesc] = useState('');
  const [msgImage, setMsgImage] = useState<string | null>(null);

  const [newsTitle, setNewsTitle] = useState('');
  const [newsDesc, setNewsDesc] = useState('');
  const [newsImage, setNewsImage] = useState<string | null>(null);
  
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [bannerTitle2, setBannerTitle2] = useState('');
  const [bannerImage2, setBannerImage2] = useState<string | null>(null);

  const [allSecretClubBanners, setAllSecretClubBanners] = useState<any[]>([]);
  const [allSecretClubBanners2, setAllSecretClubBanners2] = useState<any[]>([]);
  const [secretClubBannerTitle, setSecretClubBannerTitle] = useState('');
  const [secretClubBannerImage, setSecretClubBannerImage] = useState<string | null>(null);
  const [secretClubBannerTitle2, setSecretClubBannerTitle2] = useState('');
  const [secretClubBannerImage2, setSecretClubBannerImage2] = useState<string | null>(null);

  const [secretClubBg, setSecretClubBg] = useState('');
  const [isSavingSecretClubBg, setIsSavingSecretClubBg] = useState(false);

  const [roomBgImage, setRoomBgImage] = useState<string | null>(null);
  const [loginBgImage, setLoginBgImage] = useState<string | null>(null);
  const [loginLogoImage, setLoginLogoImage] = useState<string | null>(null);

  const [micOpenIcon, setMicOpenIcon] = useState<string | null>(null);
  const [micLockedIcon, setMicLockedIcon] = useState<string | null>(null);
  const [waveRoomIcon, setWaveRoomIcon] = useState<string | null>(null);
  const [giftButtonIcon, setGiftButtonIcon] = useState<string | null>(null);
  const [gamesButtonIcon, setGamesButtonIcon] = useState<string | null>(null);

  // Room Frame settings
  const [roomFrameTop1, setRoomFrameTop1] = useState('');
  const [roomFrameTop2, setRoomFrameTop2] = useState('');
  const [roomFrameTop3, setRoomFrameTop3] = useState('');
  const [roomFrameTop4, setRoomFrameTop4] = useState('');

  // Wealth Design settings
  const [wealthWingTop1, setWealthWingTop1] = useState('');
  const [wealthWingTop2, setWealthWingTop2] = useState('');
  const [wealthWingTop3, setWealthWingTop3] = useState('');
  const [wealthFrameTop1, setWealthFrameTop1] = useState('');
  const [wealthFrameTop2, setWealthFrameTop2] = useState('');
  const [wealthFrameTop3, setWealthFrameTop3] = useState('');
  const [wealthListBgOthers, setWealthListBgOthers] = useState('');
  const [wealthEventBg, setWealthEventBg] = useState('');
  const [wealthActiveTabBg, setWealthActiveTabBg] = useState('');

  // Charisma Design settings
  const [charismaWingTop1, setCharismaWingTop1] = useState('');
  const [charismaWingTop2, setCharismaWingTop2] = useState('');
  const [charismaWingTop3, setCharismaWingTop3] = useState('');
  const [charismaFrameTop1, setCharismaFrameTop1] = useState('');
  const [charismaFrameTop2, setCharismaFrameTop2] = useState('');
  const [charismaFrameTop3, setCharismaFrameTop3] = useState('');
  const [charismaListBgOthers, setCharismaListBgOthers] = useState('');
  const [charismaEventBg, setCharismaEventBg] = useState('');
  const [charismaActiveTabBg, setCharismaActiveTabBg] = useState('');

  // Menu Buttons settings
  const [menuBox1Url, setMenuBox1Url] = useState('');
  const [menuBox2Url, setMenuBox2Url] = useState('');

  const [emojiUrl, setEmojiUrl] = useState('');

  // Gift States
  const [giftName, setGiftName] = useState('');
  const [giftPrice, setGiftPrice] = useState('');
  const [giftIcon, setGiftIcon] = useState('');
  const [giftAnimation, setGiftAnimation] = useState('');
  const [giftCategory, setGiftCategory] = useState('normal');
  const [luckyRate, setLuckyRate] = useState<number>(80);
  const [luckyMultipliersPreset, setLuckyMultipliersPreset] = useState<'standard' | 'high' | 'jackpot' | 'custom'>('standard');
  const [customLuckyMultipliers, setCustomLuckyMultipliers] = useState('0.05, 0.5, 1, 2, 5, 10, 25');

  // Grant States
  const [grantType, setGrantType] = useState<'frame' | 'entry' | 'background'>('frame');
  const [grantName, setGrantName] = useState('');
  const [grantUrl, setGrantUrl] = useState('');
  const [grantPreview, setGrantPreview] = useState<string | null>(null);
  const [grantDuration, setGrantDuration] = useState('7');

  // Grant Animated Avatar States
  const [animatedUrl, setAnimatedUrl] = useState('');

  // Room Cover State
  const [animatedRoomCoverUrl, setAnimatedRoomCoverUrl] = useState('');

  const [storeSection, setStoreSection] = useState<'frames' | 'entries' | 'backgrounds'>('frames');
  
  const [frameName, setFrameName] = useState('');
  const [frameUrl, setFrameUrl] = useState('');
  const [framePrice, setFramePrice] = useState('');
  const [frameDuration, setFrameDuration] = useState('7');
  const [storeFrames, setStoreFrames] = useState<any[]>([]);

  const [entryName, setEntryName] = useState('');
  const [entryVideoUrl, setEntryVideoUrl] = useState('');
  const [entryPreviewImage, setEntryPreviewImage] = useState<string | null>(null);
  const [entryPrice, setEntryPrice] = useState('');
  const [entryDuration, setEntryDuration] = useState('7');
  const [storeEntries, setStoreEntries] = useState<any[]>([]);

  const [storeBgName, setStoreBgName] = useState('');
  const [storeBgImage, setStoreBgImage] = useState<string | null>(null);
  const [storeBgPrice, setStoreBgPrice] = useState('');
  const [storeBgDuration, setStoreBgDuration] = useState('7');
  const [storeBackgrounds, setStoreBackgrounds] = useState<any[]>([]);
  const [fruitsGameIcon, setFruitsGameIcon] = useState<string | null>(null);

  // Support State
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [selectedSupportChatId, setSelectedSupportChatId] = useState<string | null>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [adminSupportReply, setAdminSupportReply] = useState('');
  const adminSupportScrollRef = useRef<HTMLDivElement>(null);

  const newsInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef2 = useRef<HTMLInputElement>(null);
  const secretClubBannerInputRef = useRef<HTMLInputElement>(null);
  const secretClubBannerInputRef2 = useRef<HTMLInputElement>(null);
  const secretClubBgInputRef = useRef<HTMLInputElement>(null);
  const roomBgInputRef = useRef<HTMLInputElement>(null);
  const loginBgInputRef = useRef<HTMLInputElement>(null);
  const loginLogoInputRef = useRef<HTMLInputElement>(null);
  const entryPreviewInputRef = useRef<HTMLInputElement>(null);
  const storeBgInputRef = useRef<HTMLInputElement>(null);
  const grantPreviewInputRef = useRef<HTMLInputElement>(null);

  // Added missing refs
  const micOpenInputRef = useRef<HTMLInputElement>(null);
  const micLockedInputRef = useRef<HTMLInputElement>(null);
  const waveRoomInputRef = useRef<HTMLInputElement>(null);
  const giftButtonInputRef = useRef<HTMLInputElement>(null);
  const comboButtonInputRef = useRef<HTMLInputElement>(null);
  const luckyCircle1InputRef = useRef<HTMLInputElement>(null);
  const luckyCircle2InputRef = useRef<HTMLInputElement>(null);
  const luckyCircle3InputRef = useRef<HTMLInputElement>(null);
  const luckyCircle4InputRef = useRef<HTMLInputElement>(null);
  const gamesButtonInputRef = useRef<HTMLInputElement>(null);
  const msgImageRef = useRef<HTMLInputElement>(null);
  const idIconInputRef = useRef<HTMLInputElement>(null);
  const fruitsGameIconInputRef = useRef<HTMLInputElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const unsubUsers = onSnapshot(query(collection(db, "users"), limit(500)), (snap) => {
      setAllUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubNews = onSnapshot(query(collection(db, "news"), orderBy("createdAt", "desc")), (snap) => {
      setAllNews(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubBanners = onSnapshot(query(collection(db, "banners"), orderBy("createdAt", "desc")), (snap) => {
      setAllBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubBanners2 = onSnapshot(query(collection(db, "banners2"), orderBy("createdAt", "desc")), (snap) => {
      setAllBanners2(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSecretClubBanners = onSnapshot(query(collection(db, "secretClubBanners"), orderBy("createdAt", "desc")), (snap) => {
      setAllSecretClubBanners(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSecretClubBanners2 = onSnapshot(query(collection(db, "secretClubBanners2"), orderBy("createdAt", "desc")), (snap) => {
      setAllSecretClubBanners2(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubBgs = onSnapshot(query(collection(db, "roomBackgrounds"), orderBy("createdAt", "desc")), (snap) => {
      setAllRoomBgs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRooms = onSnapshot(query(collection(db, "rooms"), orderBy("createdAt", "desc")), (snap) => {
      setAllRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubOfficialMsgs = onSnapshot(query(collection(db, "officialNotifications"), orderBy("createdAt", "desc")), (snap) => {
      setAllOfficialMsgs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubEmojis = onSnapshot(query(collection(db, "emojis"), orderBy("createdAt", "desc")), (snap) => {
      setAllEmojis(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubGifts = onSnapshot(query(collection(db, "gifts"), orderBy("createdAt", "desc")), (snap) => {
      setAllGifts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubStoreFrames = onSnapshot(query(collection(db, "storeFrames"), orderBy("createdAt", "desc")), (snap) => {
      setStoreFrames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubStoreEntries = onSnapshot(query(collection(db, "storeEntries"), orderBy("createdAt", "desc")), (snap) => {
      setStoreEntries(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubStoreBgs = onSnapshot(query(collection(db, "storeBackgrounds"), orderBy("createdAt", "desc")), (snap) => {
      setStoreBackgrounds(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSupport = onSnapshot(query(collection(db, "supportChats"), orderBy("lastTimestamp", "desc")), (snap) => {
      setSupportChats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubAppearance = onSnapshot(doc(db, "settings", "appearance"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLoginBgImage(data.loginBackground || null);
        setLoginLogoImage(data.loginLogo || null);
      }
    });

    const unsubDesign = onSnapshot(doc(db, "settings", "design"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSecretClubBg(data.secretClubBg || '');
        setGlobalTrophyBg(data.roomTrophyBg || '');
        setGlobalTrophyItemBg(data.roomTrophyItemBg || '');
        setGlobalTrophyTabActiveBg(data.roomTrophyTabActiveBg || '');
        setMicOpenIcon(data.micOpenIcon || null);
        setMicLockedIcon(data.micLockedIcon || null);
        setWaveRoomIcon(data.waveRoomIcon || null);
        setGiftButtonIcon(data.giftButtonIcon || null);
        setComboButtonIcon(data.comboButtonIcon || '');
        setLuckyCircleTier1(data.luckyCircleTier1 || '');
        setLuckyCircleTier2(data.luckyCircleTier2 || '');
        setLuckyCircleTier3(data.luckyCircleTier3 || '');
        setLuckyCircleTier4(data.luckyCircleTier4 || '');
        setGamesButtonIcon(data.gamesButtonIcon || null);
        setRoomFrameTop1(data.roomFrameTop1 || '');
        setRoomFrameTop2(data.roomFrameTop2 || '');
        setRoomFrameTop3(data.roomFrameTop3 || '');
        setRoomFrameTop4(data.roomFrameTop4 || '');
        setTopRoom1Id(data.topRoom1Id || '');
        setTopRoom2Id(data.topRoom2Id || '');
        setTopRoom3Id(data.topRoom3Id || '');
        setTopRoom4Id(data.topRoom4Id || '');
        // Wealth Design
        setWealthWingTop1(data.wealthWingTop1 || '');
        setWealthWingTop2(data.wealthWingTop2 || '');
        setWealthWingTop3(data.wealthWingTop3 || '');
        setWealthFrameTop1(data.wealthFrameTop1 || '');
        setWealthFrameTop2(data.wealthFrameTop2 || '');
        setWealthFrameTop3(data.wealthFrameTop3 || '');
        setWealthListBgOthers(data.wealthListBgOthers || '');
        setWealthEventBg(data.wealthEventBg || '');
        setWealthActiveTabBg(data.wealthActiveTabBg || '');
        // Charisma Design
        setCharismaWingTop1(data.charismaWingTop1 !== undefined ? data.charismaWingTop1 : (data.wealthWingTop1 || ''));
        setCharismaWingTop2(data.charismaWingTop2 !== undefined ? data.charismaWingTop2 : (data.wealthWingTop2 || ''));
        setCharismaWingTop3(data.charismaWingTop3 !== undefined ? data.charismaWingTop3 : (data.wealthWingTop3 || ''));
        setCharismaFrameTop1(data.charismaFrameTop1 !== undefined ? data.charismaFrameTop1 : (data.wealthFrameTop1 || ''));
        setCharismaFrameTop2(data.charismaFrameTop2 !== undefined ? data.charismaFrameTop2 : (data.wealthFrameTop2 || ''));
        setCharismaFrameTop3(data.charismaFrameTop3 !== undefined ? data.charismaFrameTop3 : (data.wealthFrameTop3 || ''));
        setCharismaListBgOthers(data.charismaListBgOthers !== undefined ? data.charismaListBgOthers : (data.wealthListBgOthers || ''));
        setCharismaEventBg(data.charismaEventBg !== undefined ? data.charismaEventBg : (data.wealthEventBg || ''));
        setCharismaActiveTabBg(data.charismaActiveTabBg !== undefined ? data.charismaActiveTabBg : (data.wealthActiveTabBg || ''));
        // Menu Buttons
        setMenuBox1Url(data.menuBox1Url || '');
        setMenuBox2Url(data.menuBox2Url || '');
        // Podium Frames
        setTop1PodiumFrame(data.top1PodiumFrame || '');
        setTop2PodiumFrame(data.top2PodiumFrame || '');
        setTop3PodiumFrame(data.top3PodiumFrame || '');
      }
    });

    const unsubFruitsSettings = onSnapshot(doc(db, "settings", "fruitsGame"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFruitsGlobalSettings(data);
        setFruitsGameIcon(data.gameIcon || null);
      }
    });

    const unsubFruitsActiveBets = onSnapshot(collection(db, "fruitsGameActiveBets"), (snap) => {
      setFruitsActiveBets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubFruitsPlayers = onSnapshot(query(collection(db, "users"), where("fruitsTotalBet", ">", 0), limit(100)), (snap) => {
      setFruitsPlayers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubReports = onSnapshot(query(collection(db, "reports"), orderBy("createdAt", "desc")), (snap) => {
      setAllReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubDefaultImages = onSnapshot(doc(db, "settings", "default_images"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDefaultProfileImage(data.profileImage || null);
        setDefaultCoverImage(data.coverImage || null);
      }
    });

    const unsubAgencyDesign = onSnapshot(doc(db, "settings", "agencyDesign"), (snap) => {
      if (snap.exists()) {
        setAgencyBackgroundUrl(snap.data().backgroundUrl || '');
      }
    });

    const unsubCarnival = onSnapshot(doc(db, "settings", "carnival"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCarnivalBannerUrlSetting(data.bannerUrl || '');
        setCarnivalBgUrl(data.backgroundUrl || '');
        setCarnivalSettings(data);
      }
    });

    const unsubCarnivalCodes = onSnapshot(collection(db, "carnivalCodes"), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setCarnivalCodes(list);
    });

    return () => {
      unsubUsers(); unsubNews(); unsubBanners(); unsubBanners2(); unsubSecretClubBanners(); unsubSecretClubBanners2(); unsubBgs(); unsubRooms(); unsubDesign(); unsubOfficialMsgs(); unsubAppearance(); unsubStoreFrames(); unsubStoreEntries(); unsubStoreBgs(); unsubEmojis(); unsubGifts(); unsubSupport();
      unsubFruitsSettings(); unsubFruitsActiveBets(); unsubFruitsPlayers(); unsubReports(); unsubDefaultImages(); unsubAgencyDesign(); unsubCarnival();
      unsubCarnivalCodes();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const term = searchId.trim();
    if (!term) {
      setDbSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearchingDB(true);
      try {
        const tempResults = new Map<string, any>();

        // 1. Search by exact customId (as string)
        const qCustomIdStr = query(collection(db, "users"), where("customId", "==", term));
        const snap1 = await getDocs(qCustomIdStr);
        snap1.forEach(d => tempResults.set(d.id, { id: d.id, ...d.data() }));

        // 1.1 Search by exact customId (as number if term is numeric)
        const termNum = Number(term);
        if (!isNaN(termNum)) {
          const qCustomIdNum = query(collection(db, "users"), where("customId", "==", termNum));
          const snap2 = await getDocs(qCustomIdNum);
          snap2.forEach(d => tempResults.set(d.id, { id: d.id, ...d.data() }));
        }

        // 2. Search by exact displayName
        const qExactName = query(collection(db, "users"), where("displayName", "==", term));
        const snap4 = await getDocs(qExactName);
        snap4.forEach(d => tempResults.set(d.id, { id: d.id, ...d.data() }));

        // 3. Search by displayName starting with prefix
        try {
          const qDisplayName = query(
            collection(db, "users"),
            orderBy("displayName"),
            startAt(term),
            endAt(term + "\uf8ff"),
            limit(15)
          );
          const snap3 = await getDocs(qDisplayName);
          snap3.forEach(d => tempResults.set(d.id, { id: d.id, ...d.data() }));
        } catch (prefixErr) {
          console.warn("Prefix query displayName failed or needs index:", prefixErr);
        }

        // 4. Search by exact ID/UID
        if (term.length >= 10) {
          try {
            const docRef = doc(db, "users", term);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              tempResults.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
            }
          } catch (e) {
            // Document reference check failed
          }
        }

        setDbSearchResults(Array.from(tempResults.values()));
      } catch (err) {
        console.error("Error searching database:", err);
      } finally {
        setIsSearchingDB(false);
      }
    }, 450); // Debounce search for 450ms

    return () => clearTimeout(delayDebounce);
  }, [searchId, isOpen]);

  useEffect(() => {
    let unsub: any;
    if (selectedSupportChatId) {
      const q = query(collection(db, "supportChats", selectedSupportChatId, "messages"), orderBy("createdAt", "asc"));
      unsub = onSnapshot(q, (snap) => {
        setSupportMessages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTimeout(() => adminSupportScrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      updateDoc(doc(db, "supportChats", selectedSupportChatId), { unreadByAdmin: false });
    }
    return () => { if (unsub) unsub(); };
  }, [selectedSupportChatId]);

  useEffect(() => {
    let unsub: any;
    if (showGrantPopup) {
      unsub = onSnapshot(query(collection(db, "users", showGrantPopup, "inventory"), orderBy("purchasedAt", "desc")), (snap) => {
        setUserInventory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
    return () => { if (unsub) unsub(); };
  }, [showGrantPopup]);

  useEffect(() => {
    let unsub: any;
    if (showBadgesPopup) {
      unsub = onSnapshot(query(collection(db, "users", showBadgesPopup, "badges"), orderBy("createdAt", "desc")), (snap) => {
        setUserBadges(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
    return () => { if (unsub) unsub(); };
  }, [showBadgesPopup]);

  const handleGiveBadge = async () => {
    if (!showBadgesPopup || !badgeUrl.trim()) return alert("يرجى إدخل رابط الشارة");
    setIsPublishing(true);
    try {
      await addDoc(collection(db, "users", showBadgesPopup, "badges"), {
        imageUrl: badgeUrl.trim(),
        createdAt: serverTimestamp()
      });
      setBadgeUrl('');
      alert("تم منح الشارة للمستخدم بنجاح");
    } catch (e) {
      alert("حدث خطأ");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRemoveBadge = async (badgeId: string) => {
    if (!showBadgesPopup) return;
    if (confirm("هل تريد حذف هذه الشارة من بروفايل المستخدم؟")) {
      await deleteDoc(doc(db, "users", showBadgesPopup, "badges", badgeId));
      alert("تم حذف الشارة");
    }
  };

  const handleRemoveReport = async (reportId: string) => {
    if (confirm("هل تريد حذف هذا البلاغ؟")) {
      try {
        await deleteDoc(doc(db, "reports", reportId));
        alert("تم حذف البلاغ");
      } catch (e) {
        alert("خطأ في الحذف");
      }
    }
  };

  const handleRemoveInventoryItem = async (itemId: string, itemUrl: string, itemType: 'frame' | 'entry' | 'background') => {
    if (!showGrantPopup) return;
    if (confirm("هل تريد حذف هذا العنصر من حقيبة المستخدم؟")) {
      try {
        await deleteDoc(doc(db, "users", showGrantPopup, "inventory", itemId));
        
        // Also unequip if currently wearing
        const userDocRef = doc(db, "users", showGrantPopup);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const updates: any = {};
          if (itemType === 'frame' && userData.currentFrame === itemUrl) updates.currentFrame = null;
          if (itemType === 'entry' && userData.currentEntry === itemUrl) updates.currentEntry = null;
          
          if (itemType === 'background') {
            try {
              const bgsSnap = await getDocs(query(collection(db, "roomBackgrounds"), limit(1)));
              const defaultBgUrl = !bgsSnap.empty ? bgsSnap.docs[0].data().imageUrl : null;
              
              if (userData.currentRoomBackground === itemUrl) {
                updates.currentRoomBackground = defaultBgUrl;
              }

              // Reset rooms owned by this user currently using this custom background
              const roomsSnap = await getDocs(query(
                collection(db, "rooms"),
                where("owner.uid", "==", showGrantPopup)
              ));
              for (const roomDoc of roomsSnap.docs) {
                const rData = roomDoc.data();
                if (rData.roomBackground === itemUrl) {
                  await updateDoc(roomDoc.ref, {
                    roomBackground: defaultBgUrl
                  });
                }
              }
            } catch (e) {
              console.error("Error resetting room backgrounds:", e);
              updates.currentRoomBackground = null;
            }
          }
          
          if (Object.keys(updates).length > 0) {
            await updateDoc(userDocRef, updates);
          }
        }
        alert("تم حذف العنصر بنجاح.");
      } catch (err) {
        alert("حدث خطأ أثناء الحذف.");
      }
    }
  };

  const cleanupInventoryAndUsers = async (itemId: string, type: 'frame' | 'entry' | 'background', itemUrl: string) => {
    try {
      let defaultBgUrl: string | null = null;
      if (type === 'background') {
        try {
          const bgsSnap = await getDocs(query(collection(db, "roomBackgrounds"), limit(1)));
          if (!bgsSnap.empty) defaultBgUrl = bgsSnap.docs[0].data().imageUrl;
        } catch (e) {
          console.error("Error fetching default background:", e);
        }

        // Clean up any rooms using this background globally
        try {
          const roomsResetSnap = await getDocs(query(
            collection(db, "rooms"),
            where("roomBackground", "==", itemUrl)
          ));
          for (const rDoc of roomsResetSnap.docs) {
            await updateDoc(rDoc.ref, { roomBackground: defaultBgUrl });
          }
        } catch (e) {
          console.error("Error cleaning up room backgrounds globally:", e);
        }
      }

      const inventoryQuery = query(collectionGroup(db, "inventory"), where("itemId", "==", itemId));
      const snap = await getDocs(inventoryQuery);
      
      const promises = snap.docs.map(async (invDoc) => {
        const userDocRef = invDoc.ref.parent.parent;
        if (userDocRef) {
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const updates: any = {};
            
            if (type === 'frame' && userData.currentFrame === itemUrl) {
              updates.currentFrame = null;
            }
            if (type === 'entry' && userData.currentEntry === itemUrl) {
              updates.currentEntry = null;
            }
            if (type === 'background' && userData.currentRoomBackground === itemUrl) {
              updates.currentRoomBackground = defaultBgUrl;
            }
            
            if (Object.keys(updates).length > 0) {
              await updateDoc(userDocRef, updates);
            }
          }
        }
        await deleteDoc(invDoc.ref);
      });
      
      await Promise.all(promises);
    } catch (err) {
      console.error("Error during global inventory cleanup:", err);
    }
  };

  const isVideoUrl = (url: string | null) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
  };

  const handlePublishGift = async () => {
    if (!giftName || !giftPrice || !giftIcon) return alert("يرجى ملأ البيانات الأساسية للهدايا");
    setIsPublishing(true);
    try {
      let parsedMultipliers: number[] = [0.05, 0.5, 1, 2, 5, 10, 25];
      if (giftCategory === 'lucky') {
        if (luckyMultipliersPreset === 'high') {
          parsedMultipliers = [0.1, 1, 2, 5, 15, 30, 50];
        } else if (luckyMultipliersPreset === 'jackpot') {
          parsedMultipliers = [0.05, 0.2, 1, 5, 10, 25, 50, 100];
        } else if (luckyMultipliersPreset === 'custom') {
          const list = customLuckyMultipliers.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
          if (list.length > 0) parsedMultipliers = list;
        }
      }

      await addDoc(collection(db, "gifts"), {
        name: giftName,
        price: parseInt(giftPrice),
        icon: giftIcon,
        animation: giftAnimation || null,
        tab: giftCategory,
        luckyRate: giftCategory === 'lucky' ? (Number(luckyRate) || 80) : null,
        luckyMultipliers: giftCategory === 'lucky' ? parsedMultipliers : null,
        createdAt: serverTimestamp()
      });
      setGiftName('');
      setGiftPrice('');
      setGiftIcon('');
      setGiftAnimation('');
      setGiftCategory('normal');
      setLuckyRate(80);
      setLuckyMultipliersPreset('standard');
      setCustomLuckyMultipliers('0.05, 0.5, 1, 2, 5, 10, 25');
      alert("تم نشر الهدية بنجاح في صندوق الهدايا");
    } catch (e) {
      alert("خطأ في النشر");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleGrantItem = async () => {
    if (!showGrantPopup || !grantName || !grantUrl || !grantDuration) return alert("يرجى ملأ البيانات الأساسية");
    if (grantType === 'entry' && !grantPreview) return alert("يرجى اختيار صورة معاينة للدخولية");
    
    setIsPublishing(true);
    try {
      const purchasedAt = new Date();
      const expiresAt = new Date(purchasedAt.getTime() + parseInt(grantDuration) * 24 * 60 * 60 * 1000);

      const itemData: any = {
        name: grantName,
        type: grantType,
        purchasedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        isEquipped: grantType === 'background',
        grantedByAdmin: true
      };

      if (grantType === 'frame') {
        itemData.imageUrl = grantUrl;
      } else if (grantType === 'background') {
        if (isVideoUrl(grantUrl)) {
          itemData.videoUrl = grantUrl;
          itemData.imageUrl = grantUrl;
        } else {
          itemData.imageUrl = grantUrl;
        }
      } else {
        itemData.videoUrl = grantUrl;
        itemData.previewImage = grantPreview;
      }

      await addDoc(collection(db, "users", showGrantPopup, "inventory"), itemData);
      
      await addDoc(collection(db, "users", showGrantPopup, "systemNotifications"), {
        title: "هدية خاصة من الإدارة",
        desc: grantType === 'frame' 
          ? `لقد منحتك الإدارة إطاراً مميزة باسم "${grantName}" لمدة ${grantDuration} أيام. تفقدها الآن في إعدادات المتجر!`
          : grantType === 'background' 
            ? `لقد منحتك الإدارة خلفية غرفه مخصصة باسم "${grantName}" لمدة ${grantDuration} أيام. تفقدها الآن في إعدادات الغرفة!`
            : `لقد منحتك الإدارة دخولية مميزة باسم "${grantName}" لمدة ${grantDuration} أيام. تفقدها الآن في إعدادات المتجر!`,
        icon: grantType === 'frame' ? 'fa-id-badge' : grantType === 'background' ? 'fa-image' : 'fa-door-open',
        createdAt: serverTimestamp()
      });

      setGrantName('');
      setGrantUrl('');
      setGrantPreview(null);
      alert("تم منح العنصر للمستخدم بنجاح");
      setShowGrantPopup(null);
    } catch (e) {
      alert("حدث خطأ");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleGrantAnimatedAvatar = async () => {
    if (!showGrantAnimatedPopup) return;
    setIsPublishing(true);
    try {
      const updates: any = {};
      if (animatedUrl.trim()) {
        updates.animatedAvatar = animatedUrl.trim();
      } else {
        updates.animatedAvatar = deleteField();
      }

      await updateDoc(doc(db, "users", showGrantAnimatedPopup), updates);
      
      if (animatedUrl.trim()) {
        await addDoc(collection(db, "users", showGrantAnimatedPopup, "systemNotifications"), {
          title: "صورة متحركة مميزة",
          desc: "لقد تم منحك صوره متحركه مميزة لبروفايلك من قبل الإدارة! استمتع بمظهرك الجديد.",
          icon: "fa-image",
          createdAt: serverTimestamp()
        });
      }

      setShowGrantAnimatedPopup(null);
      setAnimatedUrl('');
      alert(updates.animatedAvatar ? "تم منح الصورة المتحركة بنجاح" : "تم حذف الصورة المتحركة");
    } catch (e) {
      alert("حدث خطأ");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSetAnimatedRoomCover = async () => {
    if (!showRoomCoverPopup || !animatedRoomCoverUrl.trim()) return alert("يرجى إدخال رابط الصورة المتحركة");
    setIsPublishing(true);
    try {
      const room = allRooms.find(r => r.id === showRoomCoverPopup);
      if (!room) return;

      await updateDoc(doc(db, "rooms", showRoomCoverPopup), {
        coverImage: animatedRoomCoverUrl.trim()
      });

      if (room.owner?.uid) {
        await addDoc(collection(db, "users", room.owner.uid, "systemNotifications"), {
          title: "تحديث غلاف الغرفة",
          desc: `لقد قامت الإدارة بمنح غرفتك "${room.title}" غلافاً متحركاً مميزاً وحصرياً. تفقد مظهر غرفتك الجديد الآن!`,
          icon: "fa-image",
          createdAt: serverTimestamp()
        });
      }

      setShowRoomCoverPopup(null);
      setAnimatedRoomCoverUrl('');
      alert("تم تحديث غلاف الغرفة وإرسال تنبيه للمالك");
    } catch (e) {
      alert("حدث خطأ أثناء التحديث");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishFrame = async () => {
    if (!frameName || !frameUrl || !framePrice || !frameDuration) return alert("يرجى ملأ كافة البيانات");
    setIsPublishing(true);
    try {
      await addDoc(collection(db, "storeFrames"), {
        name: frameName,
        imageUrl: frameUrl,
        price: parseInt(framePrice),
        durationDays: parseInt(frameDuration),
        createdAt: serverTimestamp()
      });
      setFrameName('');
      setFrameUrl('');
      setFramePrice('');
      setFrameDuration('7');
      alert("تم نشر الإطار في المتجر بنجاح");
    } catch (e) {
      alert("حدث خطأ أثناء النشر");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishEntry = async () => {
    if (!entryName || !entryVideoUrl || !entryPreviewImage || !entryPrice || !entryDuration) return alert("يرجى ملأ كافة البيانات");
    setIsPublishing(true);
    try {
      await addDoc(collection(db, "storeEntries"), {
        name: entryName,
        videoUrl: entryVideoUrl,
        previewImage: entryPreviewImage,
        price: parseInt(entryPrice),
        durationDays: parseInt(entryDuration),
        createdAt: serverTimestamp()
      });
      setEntryName('');
      setEntryVideoUrl('');
      setEntryPreviewImage(null);
      setEntryPrice('');
      setEntryDuration('7');
      alert("تم نشر الدخولية في المتجر بنجاح");
    } catch (e) {
      alert("حدث خطأ أثناء النشر");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublishStoreBg = async () => {
    if (!storeBgName || !storeBgImage || !storeBgPrice || !storeBgDuration) return alert("يرجى ملأ كافة البيانات");
    setIsPublishing(true);
    try {
      await addDoc(collection(db, "storeBackgrounds"), {
        name: storeBgName,
        imageUrl: storeBgImage,
        price: parseInt(storeBgPrice),
        durationDays: parseInt(storeBgDuration),
        createdAt: serverTimestamp()
      });
      setStoreBgName('');
      setStoreBgImage(null);
      setStoreBgPrice('');
      setStoreBgDuration('7');
      alert("تم نشر الخلفية في المتجر بنجاح");
    } catch (e) {
      alert("حدث خطأ أثناء النشر");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUserUpdate = async (userId: string, data: any) => {
    try {
      await updateDoc(doc(db, "users", userId), data);
      return true;
    } catch (e) { 
      alert("خطأ في التحديث"); 
      return false;
    }
  };

  const handleChargeSubmit = async () => {
    if (!showChargePopup || !chargeAmount) return;
    const targetUser = allUsers.find(u => u.id === showChargePopup);
    if (targetUser) {
      const amountNum = parseInt(chargeAmount);
      const success = await handleUserUpdate(showChargePopup, { 
        coins: (targetUser.coins || 0) + amountNum 
      });
      if (success) { 
        await addDoc(collection(db, "users", showChargePopup, "systemNotifications"), {
          title: "تم شحن محفظتك",
          desc: `تم شحن ${amountNum.toLocaleString('en-US')} كوينز لك من قبل الإدارة. استمتع بالألعاب!`,
          icon: 'fa-coins',
          createdAt: serverTimestamp()
        });
        setShowChargePopup(null); 
        setChargeAmount(''); 
      }
    }
  };

  const handleDeductSubmit = async () => {
    if (!showDeductPopup || !deductAmount) return;
    const targetUser = allUsers.find(u => u.id === showDeductPopup);
    if (targetUser) {
      const amountNum = parseInt(deductAmount);
      if ((targetUser.coins || 0) < amountNum) {
        alert("رصيد المستخدم غير كافٍ للخصم");
        return;
      }
      const success = await handleUserUpdate(showDeductPopup, { 
        coins: (targetUser.coins || 0) - amountNum 
      });
      if (success) { 
        await addDoc(collection(db, "users", showDeductPopup, "systemNotifications"), {
          title: "تم سحب رصيد",
          desc: `تم سحب ${amountNum.toLocaleString('en-US')} كوينز من حسابك من قبل الإدارة.`,
          icon: 'fa-minus-circle',
          createdAt: serverTimestamp()
        });
        setShowDeductPopup(null); 
        setDeductAmount(''); 
        alert("تم خصم الرصيد بنجاح");
      }
    }
  };

  const handleIdUpdateSubmit = async () => {
    if (!showIdPopup || !newCustomId) return;
    const data: any = { 
      customId: newCustomId,
      idOffsetX: profileIdOffsetX,
      idOffsetY: profileIdOffsetY,
      idFontSize: profileIdFontSize,
      profileIdOffsetX: profileIdOffsetX,
      profileIdOffsetY: profileIdOffsetY,
      profileIdFontSize: profileIdFontSize,
      roomIdOffsetX: roomIdOffsetX,
      roomIdOffsetY: roomIdOffsetY,
      roomIdFontSize: roomIdFontSize,
    };
    if (newCustomIdIcon) {
      data.customIdIcon = newCustomIdIcon;
    } else {
      data.customIdIcon = deleteField();
    }
    
    const success = await handleUserUpdate(showIdPopup, data);
    if (success) { 
      try {
        await addDoc(collection(db, "users", showIdPopup, "systemNotifications"), {
          title: "تهنئة بالهوية الجديدة",
          desc: `مبروك تم حصولك على ID مميز وحصري من الإدارة. رقم هويتك الجديد هو: ${newCustomId}`,
          icon: 'fa-id-badge',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to send notification:", err);
      }

      setShowIdPopup(null); 
      setNewCustomId(''); 
      setNewCustomIdIcon(null);
      alert("تم تحديث الـ ID وإرسال رسالة تهنئة للمستخدم");
    }
  };

  const handleGrantBanSystem = async (uid: string, name: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { canBan: !currentStatus });
      
      if (!currentStatus) {
        await addDoc(collection(db, "users", uid, "systemNotifications"), {
          title: "تم منحك صلاحية جديدة",
          desc: "لقد تم منحك الوصول إلى نظام حظر المستخدمين. يمكنك الآن العثور عليه في ملفك الشخصي.",
          icon: "fas fa-user-slash",
          createdAt: serverTimestamp(),
          type: 'canBan_grant',
          read: false
        });
      } else {
        await addDoc(collection(db, "users", uid, "systemNotifications"), {
          title: "تنبيه إداري",
          desc: "تم سحب نظام حظر المستخدمين من الحساب بسبب المخالفه للقوانين",
          icon: "fas fa-user-slash",
          createdAt: serverTimestamp(),
          type: 'canBan_revoke',
          read: false
        });
      }
      
      alert(currentStatus ? "تم سحب الصلاحية بنجاح" : "تم منح الصلاحية بنجاح");
    } catch (e: any) {
      alert(`خطأ: ${e.message || String(e)}`);
    }
  };

  const handleGrantGMSystem = async (uid: string, name: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { isGM: !currentStatus });
      
      if (!currentStatus) {
        await addDoc(collection(db, "users", uid, "systemNotifications"), {
          title: "تم منحك صلاحية جديدة",
          desc: "لقد تم منحك الوصول إلى نظام المدير العام. يمكنك الآن العثور عليه في ملفك الشخصي.",
          icon: "fas fa-user-shield",
          createdAt: serverTimestamp(),
          type: 'gm_grant',
          read: false
        });
      } else {
        await addDoc(collection(db, "users", uid, "systemNotifications"), {
          title: "تنبيه إداري",
          desc: "تم سحب نظام المدير العام من الحساب بسبب المخالفه للقوانين",
          icon: "fas fa-user-shield",
          createdAt: serverTimestamp(),
          type: 'gm_revoke',
          read: false
        });
      }
      
      alert(currentStatus ? "تم سحب صلاحية المدير العام بنجاح" : "تم منح صلاحية المدير العام بنجاح");
    } catch (e: any) {
      alert(`خطأ: ${e.message || String(e)}`);
    }
  };

  const handleToggleVerification = async (uid: string, name: string, currentStatus: boolean) => {
    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, { isVerified: !currentStatus });
      
      if (!currentStatus) {
        await addDoc(collection(db, "users", uid, "systemNotifications"), {
          title: "توثيق الحساب",
          desc: "تهانينا! تم توثيق حسابك بنجاح وحصلت على علامة التوثيق الزرقاء.",
          icon: "fas fa-check-circle",
          createdAt: serverTimestamp(),
          type: 'verification_grant',
          read: false
        });
      } else {
        await addDoc(collection(db, "users", uid, "systemNotifications"), {
          title: "تنبيه إداري",
          desc: "تم إلغاء توثيق حسابك.",
          icon: "fas fa-check-circle",
          createdAt: serverTimestamp(),
          type: 'verification_revoke',
          read: false
        });
      }
      
      alert(currentStatus ? "تم إلغاء توثيق الحساب بنجاح" : "تم توثيق الحساب بنجاح");
    } catch (e: any) {
      alert(`خطأ: ${e.message || String(e)}`);
    }
  };

  const handleSaveSecretClub = async (uid: string, password: string, enable: boolean) => {
    try {
      const userRef = doc(db, "users", uid);
      if (enable) {
        await updateDoc(userRef, { 
          hasSecretClub: true,
          secretClubPassword: password
        });
        await addDoc(collection(db, "users", uid, "systemNotifications"), {
          title: "عضوية سرية خاصة",
          desc: "تهانينا! لقد تم منحك عضوية النادي السري لكبار الشخصيات. يمكنك الآن العثور على الأيقونة في الصفحة الرئيسية.",
          icon: "fas fa-user-secret",
          createdAt: serverTimestamp(),
          type: 'secret_club_grant',
          read: false
        });
        setAllUsers(prev => prev.map(u => u.id === uid ? { ...u, hasSecretClub: true, secretClubPassword: password } : u));
        setDbSearchResults(prev => prev.map(u => u.id === uid ? { ...u, hasSecretClub: true, secretClubPassword: password } : u));
        alert("تم حفظ وتفعيل عضوية النادي السري بنجاح مع تعيين باسورد الدخول");
      } else {
        await updateDoc(userRef, { 
          hasSecretClub: false,
          secretClubPassword: deleteField()
        });
        await addDoc(collection(db, "users", uid, "systemNotifications"), {
          title: "تنبيه إداري",
          desc: "تم سحب عضوية النادي السري من حسابك.",
          icon: "fas fa-user-secret",
          createdAt: serverTimestamp(),
          type: 'secret_club_revoke',
          read: false
        });
        setAllUsers(prev => prev.map(u => u.id === uid ? { ...u, hasSecretClub: false, secretClubPassword: undefined } : u));
        setDbSearchResults(prev => prev.map(u => u.id === uid ? { ...u, hasSecretClub: false, secretClubPassword: undefined } : u));
        alert("تم سحب عضوية النادي السري بنجاح");
      }
    } catch (e: any) {
      alert(`خطأ: ${e.message || String(e)}`);
    }
  };

  const handleAdminSupportReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupportChatId || !adminSupportReply.trim()) return;

    try {
      await addDoc(collection(db, "supportChats", selectedSupportChatId, "messages"), {
        senderId: "SUPPORT_AGENT",
        text: adminSupportReply.trim(),
        createdAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, "supportChats", selectedSupportChatId), {
        lastMessage: adminSupportReply.trim(),
        lastTimestamp: serverTimestamp(),
        unreadByAdmin: false,
        unreadByUser: true
      });
      
      setAdminSupportReply('');
    } catch (e) { alert("خطأ في الرد"); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("تنبيه: حجم الملف كبير جداً (أكبر من 800 كيلوبايت).\nيرجى اختيار صورة/ملف أصغر لحماية أداء قاعدة البيانات وتفادي تهنيج التطبيق.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const saveDesignSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "design"), {
        micOpenIcon,
        micLockedIcon,
        waveRoomIcon,
        giftButtonIcon,
        gamesButtonIcon
      }, { merge: true });
      alert("تم حفظ إعدادات التصميم");
    } catch (e) {
      alert("خطأ في الحفظ");
    }
  };

  const saveRoomFramesSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "design"), {
        roomFrameTop1,
        roomFrameTop2,
        roomFrameTop3,
        roomFrameTop4
      }, { merge: true });
      alert(t("تم حفظ إعدادات إطارات الغرف بنجاح", "Room Frame settings saved successfully"));
    } catch (e) {
      alert(t("خطأ في حفظ إعدادات إطارات الغرف", "Error saving room frame settings"));
    }
  };

  const saveRoomCentersSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "design"), {
        topRoom1Id,
        topRoom2Id,
        topRoom3Id,
        topRoom4Id
      }, { merge: true });
      alert(t("تم حفظ مراكز وترتيب الغرف بنجاح", "Room rankings and positions saved successfully"));
    } catch (e) {
      alert(t("خطأ في حفظ مراكز الغرف", "Error saving room rankings"));
    }
  };

  const saveWealthDesignSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "design"), {
        wealthWingTop1,
        wealthWingTop2,
        wealthWingTop3,
        wealthFrameTop1,
        wealthFrameTop2,
        wealthFrameTop3,
        wealthListBgOthers,
        wealthEventBg,
        wealthActiveTabBg
      }, { merge: true });
      alert("تم حفظ إعدادات تصميم الثروة بنجاح!");
    } catch (e) {
      alert("خطأ في حفظ تصميم الثروة");
    }
  };

  const saveCharismaDesignSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "design"), {
        charismaWingTop1,
        charismaWingTop2,
        charismaWingTop3,
        charismaFrameTop1,
        charismaFrameTop2,
        charismaFrameTop3,
        charismaListBgOthers,
        charismaEventBg,
        charismaActiveTabBg
      }, { merge: true });
      alert("تم حفظ إعدادات تصميم السحر بنجاح!");
    } catch (e) {
      alert("خطأ في حفظ تصميم السحر");
    }
  };

  const saveMenuButtonsSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "design"), {
        menuBox1Url,
        menuBox2Url
      }, { merge: true });
      alert("تم حفظ إعدادات تصميم أزرار القائمة بنجاح!");
    } catch (e) {
      alert("خطأ في حفظ تصميم أزرار القائمة");
    }
  };

  const saveTopFramesSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "design"), {
        top1PodiumFrame,
        top2PodiumFrame,
        top3PodiumFrame
      }, { merge: true });
      alert(t("تم حفظ إعدادات إطارات المراكز بنجاح!", "Top podium frames saved successfully!"));
    } catch (e) {
      alert(t("خطأ في حفظ إعدادات إطارات المراكز", "Error saving top podium frames"));
    }
  };

  const handleSaveLoginSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "appearance"), {
        loginBackground: loginBgImage,
        loginLogo: loginLogoImage
      }, { merge: true });
      alert("تم تحديث إعدادات صفحة تسجيل الدخول بنجاح");
    } catch (e) {
      alert("خطأ أثناء الحفظ");
    }
  };

  const handleSaveDefaultImages = async () => {
    try {
      await setDoc(doc(db, "settings", "default_images"), {
        profileImage: defaultProfileImage,
        coverImage: defaultCoverImage
      }, { merge: true });

      alert("تم تحديث الصور الرئيسية الافتراضية بنجاح");
    } catch (e) {
      alert("خطأ أثناء الحفظ");
    }
  };

  const handleSaveCarnivalSettings = async () => {
    setIsCarnivalSaving(true);
    try {
      await setDoc(doc(db, "settings", "carnival"), {
        bannerUrl: carnivalBannerUrlSetting.trim(),
        backgroundUrl: carnivalBgUrl.trim()
      }, { merge: true });
      alert(t("تم حفظ إعدادات حدث الافتتاح بنجاح", "Opening Event settings saved successfully"));
    } catch (e) {
      console.error(e);
      alert(t("حدث خطأ أثناء الحفظ", "Error saving settings"));
    } finally {
      setIsCarnivalSaving(false);
    }
  };

  const handlePublishEmoji = async () => {
    if (!emojiUrl.trim()) return alert("يرجى إدخال رابط الـ Emoji أولاً");
    setIsPublishing(true);
    try {
      await addDoc(collection(db, "emojis"), {
        imageUrl: emojiUrl.trim(),
        createdAt: serverTimestamp()
      });
      setEmojiUrl('');
      alert("تم نشر الإيموجي بنجاح");
    } catch (e) {
      alert("خطأ في النشر");
    } finally {
      setIsPublishing(false);
    }
  };

  const filteredUsers = (() => {
    const combinedSet = new Map<string, any>();
    
    // Add in-memory users
    allUsers.forEach(u => {
      if (u && u.id) combinedSet.set(u.id, u);
    });
    
    // Add dynamically searched users
    dbSearchResults.forEach(u => {
      if (u && u.id) combinedSet.set(u.id, u);
    });
    
    const unifiedList = Array.from(combinedSet.values());

    const list = searchId.trim() 
      ? unifiedList.filter(u => 
          u.customId?.toString().toLowerCase().includes(searchId.toLowerCase()) || 
          u.displayName?.toLowerCase().includes(searchId.toLowerCase()) ||
          u.id?.toLowerCase().includes(searchId.toLowerCase())
        )
      : unifiedList;

    const myUid = auth.currentUser?.uid;
    const myEmail = 'adhamyosry57@gmail.com';

    list.sort((a, b) => {
      const isMeA = (myUid && a.id === myUid) || a.email === myEmail;
      const isMeB = (myUid && b.id === myUid) || b.email === myEmail;
      if (isMeA && !isMeB) return -1;
      if (!isMeA && isMeB) return 1;
      return 0;
    });

    return list;
  })();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-[#1a0b2e] flex flex-col animate-in slide-in-from-bottom" dir="rtl">
      <input type="file" ref={newsInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setNewsImage)} />
      <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setBannerImage)} />
      <input type="file" ref={bannerInputRef2} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setBannerImage2)} />
      <input type="file" ref={secretClubBannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setSecretClubBannerImage)} />
      <input type="file" ref={secretClubBannerInputRef2} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setSecretClubBannerImage2)} />
      <input type="file" ref={secretClubBgInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleImageSelect(e, setSecretClubBg)} />
      <input type="file" ref={roomBgInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setRoomBgImage)} />
      <input type="file" ref={loginBgInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setLoginBgImage)} />
      <input type="file" ref={loginLogoInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setLoginLogoImage)} />
      <input type="file" ref={entryPreviewInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setEntryPreviewImage)} />
      <input type="file" ref={storeBgInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setStoreBgImage)} />
      <input type="file" ref={grantPreviewInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setGrantPreview)} />
      
      <input type="file" ref={micOpenInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setMicOpenIcon)} />
      <input type="file" ref={micLockedInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setMicLockedIcon)} />
      <input type="file" ref={waveRoomInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setWaveRoomIcon)} />
      <input type="file" ref={comboButtonInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setComboButtonIcon)} />
      <input type="file" ref={luckyCircle1InputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setLuckyCircleTier1)} />
      <input type="file" ref={luckyCircle2InputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setLuckyCircleTier2)} />
      <input type="file" ref={luckyCircle3InputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setLuckyCircleTier3)} />
      <input type="file" ref={luckyCircle4InputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setLuckyCircleTier4)} />
      <input type="file" ref={msgImageRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setMsgImage)} />
      <input type="file" ref={idIconInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setNewCustomIdIcon)} />

      <input type="file" ref={profileImageInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setDefaultProfileImage)} />
      <input type="file" ref={coverImageInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelect(e, setDefaultCoverImage)} />

      {!selectedSupportChatId && (
        <header className="p-4 border-b border-white/10 flex flex-col bg-[#0d051a] sticky top-0 z-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-black text-lg">{t("لوحة المسؤول", "Admin Panel")}</h2>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white"><i className="fas fa-times"></i></button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[
              {id: 'users', label: t('المستخدمين', 'Users')},
              {id: 'support', label: t('محادثات الدعم', 'Support Chats')},
              {id: 'rooms', label: t('الغرف', 'Rooms')},
              {id: 'secretClubRooms', label: t('غرف النادي', 'Club Rooms')},
              {id: 'secretClubBanners', label: t('بنرات النادي', 'Club Banners')},
              {id: 'secretClubBg', label: t('خلفية النادي', 'Club Background')},
              {id: 'trophyBg', label: t('خلفية الكأس', 'Trophy Background')},
              {id: 'news', label: t('الأخبار', 'News')},
              {id: 'banners', label: t('البنرات', 'Banners')},
              {id: 'bgs', label: t('خلفيات مجانية', 'Free Backgrounds')},
              {id: 'store', label: t('المتجر', 'Store')},
              {id: 'emojis', label: t('إيموجي', 'Emoji')},
              {id: 'gifts', label: t('الهدايا', 'Gifts')},
              {id: 'luckyDesign', label: t('تصاميم المحظوظة', 'Lucky Designs')},
              {id: 'mainImages', label: t('الصور الرئيسية', 'Main Images')},
              {id: 'agencyDesign', label: t('تصميم الوكالات', 'Agency Design')},
              {id: 'carnival', label: t('حدث الافتتاح', 'Opening Event')},
              {id: 'reports', label: t('استلام البلاغات', 'Received Reports')},
              {id: 'cp', label: t('CP', 'CP')},
              {id: 'design', label: t('التصميم', 'Design Settings')},
              {id: 'roomFrames', label: t('اطارات الغرف', 'Room Frames')},
              {id: 'roomCenters', label: t('مراكز الغرف', 'Room Centers')},
              {id: 'wealthDesign', label: t('تصميم الثروة', 'Wealth Design')},
              {id: 'charismaDesign', label: t('تصميم السحر', 'Charisma Design')},
              {id: 'menuButtonsDesign', label: t('تصميم أزرار القوائم', 'Menu Buttons Design')},
              {id: 'topFramesDesign', label: t('إطارات التوبات', 'Top Frames')},
              {id: 'messages', label: t('الرسائل', 'Messages')}
            ].map((tab) => (
              <button key={tab.id} onClick={() => setAdminTab(tab.id as any)} className={`flex-shrink-0 px-4 py-2 text-[10px] font-black rounded-xl transition-all uppercase relative ${adminTab === tab.id ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 text-purple-300/60'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </header>
      )}

      <div className={`flex-1 ${selectedSupportChatId ? '' : 'overflow-y-auto p-4 space-y-6 pb-20'}`}>
        {adminTab === 'cp' && <CPAdmin />}
        
        {false /* Moved to GamesControlPanel */ && adminTab === 'fruits' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3 pb-2">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest leading-none">إجمالي الجولات</p>
                   <i className="fas fa-history text-purple-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none">{fruitsGlobalSettings.totalRounds || 0}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">أرباح 24 ساعة</p>
                   <i className="fas fa-coins text-emerald-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none flex items-center gap-1">
                   {(fruitsGlobalSettings.totalProfit24h || 0).toLocaleString('en-US')} <span className="text-[8px] text-yellow-500 font-black">كوينز</span>
                 </p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest leading-none">الرهانات النشطة</p>
                   <i className="fas fa-dice text-orange-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none">{fruitsActiveBets.reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString('en-US')}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[85px] hover:bg-white/10 transition-all">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest leading-none">اللاعبين النشطين</p>
                   <i className="fas fa-users text-pink-400/50 text-[10px]"></i>
                 </div>
                 <p className="text-lg font-black text-white mt-1.5 truncate leading-none">{new Set(fruitsActiveBets.map(b => b.userId)).size}</p>
              </div>
            </div>

            {/* Game Icon Settings */}
            <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/10 space-y-4 shadow-2xl">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <i className="fas fa-image text-pink-400 flex-shrink-0"></i>
                أيقونة اللعبة
              </h4>
              
              <div className="flex items-center gap-4 bg-black/20 p-3 rounded-2xl border border-white/5">
                <div 
                  className={`w-14 h-14 rounded-2xl shadow-lg group relative overflow-hidden flex-shrink-0 ${!fruitsGameIcon ? 'bg-gradient-to-br from-orange-400 to-rose-500 p-[1px]' : ''}`}
                >
                  {fruitsGameIcon ? (
                    <img src={fruitsGameIcon} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <div className="w-full h-full rounded-2xl bg-[#130624] flex items-center justify-center border border-white/10">
                      <span className="text-2xl">🍓</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[10px] text-white/40 font-black">رابط أيقونة اللعبة</p>
                  <input 
                    type="text"
                    value={fruitsGameIcon || ''}
                    onChange={(e) => setFruitsGameIcon(e.target.value)}
                    placeholder="ضع رابط الصورة هنا..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-[11px] font-bold text-white focus:outline-none focus:border-purple-500/50 transition-all truncate"
                  />
                </div>
              </div>

              <button 
                onClick={() => setDoc(doc(db, "settings", "fruitsGame"), { gameIcon: fruitsGameIcon }, { merge: true })}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl text-[11px] font-black text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
              >
                حفظ أيقونة اللعبة
              </button>
            </div>

            {/* Global Algorithm Settings */}
            <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/10 space-y-4 shadow-2xl">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <i className="fas fa-cogs text-purple-400 flex-shrink-0"></i>
                خوارزميات اللعبة العامة
              </h4>
              
              <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-purple-300/80 uppercase tracking-widest pl-2 block">صعوبة اللعبة (لكل المستخدمين)</label>
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
                             {mode === 'easy' ? 'سهل (ربح)' : mode === 'balanced' ? 'متوازن' : 'صعب (خسارة)'}
                           </span>
                         </button>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-purple-300/80 uppercase tracking-widest block">حد تفعيل خوارزمية الخسارة (Threshold)</label>
                    <div className="flex gap-2">
                       <input 
                         type="number" 
                         value={fruitsGlobalSettings.lossThreshold ?? 0} 
                         onChange={e => setDoc(doc(db, "settings", "fruitsGame"), { lossThreshold: parseInt(e.target.value) || 0 }, { merge: true })}
                         placeholder="مثلاً: 10000000" 
                         className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-purple-500 transition-all font-sans"
                       />
                       <div className="bg-purple-600/30 px-3 flex items-center rounded-xl text-purple-300 text-[10px] font-black border border-purple-500/20">كوينز</div>
                    </div>
                    <p className="text-[8px] text-white/30 font-bold leading-normal">
                      عندما يصل أرباح المستخدم لهذا المبلغ، ستبدأ الخوارزمية تلقائياً بمنعه وتوجيهه للخسارة لمنع سحب رصيد كبير.
                    </p>
                  </div>
              </div>
            </div>

            {/* Players List with Individual Management */}
            {(() => {
              // Extract unique user IDs from active bets right now
              const activeUserIdsFromBets = Array.from(new Set(fruitsActiveBets.map(bet => bet.userId)));
              
              // Base players list from the Firestore fruitsPlayers listener
              const uniquePlayersMap = new Map<string, any>();
              
              fruitsPlayers.forEach(p => {
                uniquePlayersMap.set(p.id, p);
              });
              
              // Include active betters
              activeUserIdsFromBets.forEach(uid => {
                if (!uniquePlayersMap.has(uid)) {
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
                      customId: uid.substring(0, 8)
                    });
                  }
                }
              });

              // Apply Search query (add matching from allUsers to unique map so admin can configure any player)
              if (fruitsSearchQuery.trim()) {
                const searchLower = fruitsSearchQuery.toLowerCase();
                allUsers.forEach(u => {
                  const matches = u.displayName?.toLowerCase().includes(searchLower) || u.customId?.toString().toLowerCase().includes(searchLower);
                  if (matches && !uniquePlayersMap.has(u.id)) {
                    uniquePlayersMap.set(u.id, u);
                  }
                });
              }

              let unifiedFruitsPlayersList = Array.from(uniquePlayersMap.values());

              // If search query is applied, filter the output list to match findings
              if (fruitsSearchQuery.trim()) {
                const searchLower = fruitsSearchQuery.toLowerCase();
                unifiedFruitsPlayersList = unifiedFruitsPlayersList.filter(p => 
                  p.displayName?.toLowerCase().includes(searchLower) || 
                  p.customId?.toString().toLowerCase().includes(searchLower) ||
                  p.id.toLowerCase().includes(searchLower)
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-[11px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                      <i className="fas fa-users-cog"></i>
                      إدارة اللاعبين المخصصة
                    </h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => window.location.reload()}
                        className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-600/30 flex items-center justify-center hover:bg-purple-600 hover:text-white transition-all active:scale-[0.93] shadow-md group"
                        title="إعادة تحميل الصفحة"
                      >
                        <i className="fas fa-sync-alt group-hover:rotate-180 transition-transform duration-500 text-[10px]"></i>
                      </button>
                      <span className="text-[9px] font-black text-white/40 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 uppercase font-sans">
                        {`${unifiedFruitsPlayersList.length} لاعب`}
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
                      placeholder="بحث عن لاعب لتوجيهه للمكسب/الخسارة..." 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pr-10 pl-4 text-[11px] font-bold text-white outline-none focus:border-purple-500/40 shadow-inner" 
                    />
                  </div>

                  {unifiedFruitsPlayersList.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-[2rem] border border-white/5 opacity-50 flex flex-col items-center justify-center gap-2">
                      <i className="fas fa-users-slash text-2xl text-purple-400"></i>
                      <p className="text-[11px] font-black text-white/40">لا يوجد لاعبين مطابقين للبحث حالياً</p>
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
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white truncate max-w-[120px]">{player.displayName}</p>
                              <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mt-0.5">ID: {player.customId || player.id.substring(0,8)}</p>
                            </div>
                          </div>
                          
                          <div className="text-left flex-shrink-0">
                             <div className="text-[10px] font-black flex items-center gap-1 justify-end">
                               <span className={netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                 {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString('en-US')}
                               </span>
                               <i className="fas fa-coins text-[8px] text-yellow-500"></i>
                             </div>
                             <p className="text-[8px] font-bold text-white/25 mt-0.5">إجمالي المراهنة: {player.fruitsTotalBet?.toLocaleString('en-US') || 0}</p>
                          </div>
                        </div>

                        {/* Luck Range Slider (Full Width) */}
                        <div className="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-2 font-sans">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">تعديل نسبة الحظ المخصص</label>
                            <span className="text-[10px] font-black text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-md border border-purple-500/20">
                              {player.fruitsLuckPercent ?? 100}% حظ
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
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] font-black text-white/80">خسارة إجبارية فورية</span>
                            <span className="text-[8px] text-white/30 font-bold truncate">إجبار اللاعب على خسارة جميع رهاناته للتأديب</span>
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
                            {player.fruitsForcedLoss ? 'نشط (خسارة مستمرة)' : 'خسارة يدوية'}
                          </button>
                        </div>

                        {/* Forced Win Manual Override (Full Width) */}
                        <div className="flex items-center justify-between gap-3 bg-black/20 p-3 rounded-2xl border border-white/5 font-sans">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] font-black text-white/80">فوز إجباري فوري</span>
                            <span className="text-[8px] text-white/30 font-bold truncate">إجبار اللاعب على الفوز في أي رهان يضعه</span>
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
                            {player.fruitsForcedWin ? 'نشط (فوز مستمر)' : 'مكسب إجباري'}
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
        
        {adminTab === 'support' && (
          <div className="h-full flex flex-col animate-in fade-in">
            {!selectedSupportChatId ? (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">طلبات الدعم الفني</p>
                {supportChats.length === 0 ? (
                  <div className="text-center py-20 opacity-20"><i className="fas fa-headset text-4xl mb-2"></i><p className="text-xs font-bold">لا توجد محادثات حالياً</p></div>
                ) : supportChats.map(chat => (
                  <button 
                    key={chat.id} 
                    onClick={() => setSelectedSupportChatId(chat.id)}
                    className="w-full bg-white/5 p-4 rounded-[2rem] border border-white/10 flex items-center gap-4 active:scale-[0.98] transition-all hover:bg-white/10 text-right relative overflow-hidden h-auto"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10 flex-shrink-0 shadow-lg relative bg-black/10">
                      {isVideoUrl(chat.userPhoto) ? (
                        <video src={chat.userPhoto} autoPlay loop muted playsInline className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <img src={chat.userPhoto} className="w-full h-full object-cover rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-sm text-white">{chat.userName}</span>
                      </div>
                      <p className={`text-[11px] font-bold leading-tight break-words whitespace-pre-wrap ${chat.unreadByAdmin ? 'text-white' : 'text-white/40'}`}>
                        {chat.lastMessage}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                       {chat.unreadByAdmin && (
                          <span className="w-1.5 h-1.5 bg-red-800 rounded-full"></span>
                       )}
                       <i className="fas fa-chevron-left text-[10px] text-white/10"></i>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="fixed inset-0 z-[600] flex flex-col h-full bg-[#1a0b2e] animate-in slide-in-from-left">
                <header className="p-5 border-b border-white/10 flex justify-between items-center bg-[#0d051a]">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 bg-black/15 shadow-lg flex-shrink-0">
                      {(() => {
                        const chatPhoto = supportChats.find(c => c.id === selectedSupportChatId)?.userPhoto;
                        return isVideoUrl(chatPhoto) ? (
                          <video src={chatPhoto} autoPlay loop muted playsInline className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <img src={chatPhoto || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full object-cover rounded-full" />
                        );
                      })()}
                    </div>
                    <div>
                      <h4 className="text-white font-black text-sm">{supportChats.find(c => c.id === selectedSupportChatId)?.userName}</h4>
                      <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-widest">محادثة الدعم المباشرة</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedSupportChatId(null)} className="w-10 h-10 rounded-xl bg-white/5 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all"><i className="fas fa-times"></i></button>
                </header>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide bg-black/20">
                  {supportMessages.map(msg => {
                    const isFromMe = msg.senderId === "SUPPORT_AGENT";
                    return (
                      <div key={msg.id} className={`flex items-start gap-3 ${isFromMe ? 'flex-row-reverse' : ''} animate-in fade-in`}>
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 flex-shrink-0 shadow-lg">
                          {isFromMe ? (
                            <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white"><i className="fas fa-headset text-lg"></i></div>
                          ) : (
                            (() => {
                              const chatPhoto = supportChats.find(c => c.id === selectedSupportChatId)?.userPhoto;
                              return isVideoUrl(chatPhoto) ? (
                                <video src={chatPhoto} autoPlay loop muted playsInline className="w-full h-full object-cover rounded-full" />
                              ) : (
                                <img src={chatPhoto || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full object-cover rounded-full" />
                              );
                            })()
                          )}
                        </div>
                        <div className={`max-w-[75%] flex flex-col ${isFromMe ? 'items-end' : 'items-start'}`}>
                          <span className="text-[8px] font-black text-white/20 mb-1">{isFromMe ? 'أنا (الدعم الفني)' : 'المستخدم'}</span>
                          <div className={`px-4 py-3 rounded-2xl text-[12px] font-bold shadow-xl break-words whitespace-pre-wrap ${isFromMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/10 text-white border border-white/10 rounded-tl-none'}`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={adminSupportScrollRef} />
                </div>

                <form onSubmit={handleAdminSupportReply} className="p-4 pb-6 bg-[#0d051a] border-t border-white/10">
                  <div className="relative flex items-center gap-3">
                    <textarea 
                      value={adminSupportReply} 
                      onChange={e => setAdminSupportReply(e.target.value)}
                      placeholder="اكتب رد الإدارة هنا..." 
                      className="flex-1 bg-white/5 border border-white/10 rounded-[1.8rem] py-3.5 pr-6 pl-14 text-xs text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all shadow-inner h-14 resize-none" 
                    />
                    <button 
                      type="submit" 
                      disabled={!adminSupportReply.trim()}
                      className="w-11 h-11 rounded-full bg-purple-600/30 backdrop-blur-md border border-purple-500/20 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-30 flex-shrink-0"
                    >
                      <i className="fas fa-paper-plane text-xs"></i>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {adminTab === 'agencyDesign' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-4 shadow-2xl">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <i className="fas fa-palette text-emerald-400"></i>
                تصميم محفظة الوكالة
              </h3>
              <p className="text-[10px] text-emerald-400/60 font-bold uppercase tracking-widest">تحكم في مظهر محفظة الوكيل (صورة أو فيديو)</p>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest mr-2">رابط الخلفية (URL)</label>
                  <input 
                    type="text" 
                    value={agencyBackgroundUrl} 
                    onChange={e => setAgencyBackgroundUrl(e.target.value)} 
                    placeholder="رابط صورة أو فيديو (mp4)..." 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none focus:border-emerald-500/40 font-bold" 
                  />
                  <p className="text-[8px] text-white/20 font-bold px-1">يدعم روابط الصور (png, jpg) والروابط المباشرة للفيديوهات (mp4, webm).</p>
                </div>

                {agencyBackgroundUrl && (
                  <div className="w-full aspect-[16/9] bg-black/40 rounded-3xl border border-white/10 overflow-hidden relative">
                    {isVideoUrl(agencyBackgroundUrl) ? (
                      <video src={agencyBackgroundUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={agencyBackgroundUrl} className="w-full h-full object-cover" alt="preview" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">معاينة الخلفية</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={async () => {
                      setIsAgencyDesignSaving(true);
                      try {
                        await setDoc(doc(db, "settings", "agencyDesign"), {
                          backgroundUrl: agencyBackgroundUrl
                        }, { merge: true });
                        alert("تم حفظ التصميم بنجاح");
                      } catch (e) {
                        alert("حدث خطأ أثناء الحفظ");
                      } finally {
                        setIsAgencyDesignSaving(false);
                      }
                    }}
                    disabled={isAgencyDesignSaving}
                    className="bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isAgencyDesignSaving ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-save"></i> <span>حفظ التعديلات</span></>}
                  </button>

                  <button 
                    onClick={async () => {
                      if (confirm("هل تريد العودة للشكل الافتراضي؟")) {
                        setIsAgencyDesignSaving(true);
                        try {
                          await setDoc(doc(db, "settings", "agencyDesign"), {
                            backgroundUrl: ""
                          }, { merge: true });
                          setAgencyBackgroundUrl("");
                          alert("تمت العودة للشكل الافتراضي");
                        } catch (e) {
                          alert("حدث خطأ");
                        } finally {
                          setIsAgencyDesignSaving(false);
                        }
                      }
                    }}
                    disabled={isAgencyDesignSaving}
                    className="bg-white/5 border border-white/10 py-4 rounded-2xl font-black text-xs text-white/60 hover:bg-white/10 active:scale-95 transition-all"
                  >
                    العودة للافتراضي
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {adminTab === 'carnival' && (
          <div className="space-y-6 animate-in fade-in pb-20">
            <div className="bg-[#1d0a33]/85 p-6 rounded-[2.5rem] border border-purple-500/20 space-y-4 shadow-2xl">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <i className="fas fa-gift text-purple-400"></i>
                إعدادات حدث الافتتاح (الكرنفال)
              </h3>
              <p className="text-[10px] text-purple-300/60 font-bold uppercase tracking-widest">تغيير بنر حدث الافتتاح وخلفية صفحة الكرنفال وتخصيصها</p>

              <div className="space-y-4">
                {/* Banner URL setting */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest mr-2">رابط بنر حدث الافتتاح في الصفحة الرئيسية (Banner URL)</label>
                  <input 
                    type="text" 
                    value={carnivalBannerUrlSetting} 
                    onChange={e => setCarnivalBannerUrlSetting(e.target.value)} 
                    placeholder="ضع رابط صورة البنر هنا..." 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 font-bold" 
                  />
                  <p className="text-[8px] text-white/20 font-bold px-1">هذه الصورة ستظهر في شريط البنرات المتحرك بالصفحة الرئيسية كعنصر حدث الافتتاح.</p>
                </div>

                {carnivalBannerUrlSetting && (
                  <div className="w-full aspect-[21/9] bg-black/40 rounded-3xl border border-white/10 overflow-hidden relative">
                    <img src={carnivalBannerUrlSetting} className="w-full h-full object-cover" alt="Banner Preview" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">معاينة صورة البنر</p>
                    </div>
                  </div>
                )}

                {/* Page Background URL setting */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest mr-2">رابط خلفية صفحة حدث الافتتاح (Background Image URL)</label>
                  <input 
                    type="text" 
                    value={carnivalBgUrl} 
                    onChange={e => setCarnivalBgUrl(e.target.value)} 
                    placeholder="ضع رابط صورة الخلفية هنا..." 
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 font-bold" 
                  />
                  <p className="text-[8px] text-white/20 font-bold px-1">سيتم تطبيق هذه الصورة كخلفية لصفحة مهرجان الافتتاح بالكامل بدلاً من اللون الافتراضي.</p>
                </div>

                {carnivalBgUrl && (
                  <div className="w-full aspect-[16/9] bg-black/40 rounded-3xl border border-white/10 overflow-hidden relative">
                    <img src={carnivalBgUrl} className="w-full h-full object-cover" alt="Background Preview" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">معاينة صورة الخلفية</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={handleSaveCarnivalSettings}
                    disabled={isCarnivalSaving}
                    className="bg-purple-600 hover:bg-purple-500 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isCarnivalSaving ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-save"></i> <span>حفظ التعديلات</span></>}
                  </button>

                  <button 
                    onClick={async () => {
                      if (confirm("هل تريد العودة للإعدادات الافتراضية للكرنفال؟")) {
                        setIsCarnivalSaving(true);
                        try {
                          await setDoc(doc(db, "settings", "carnival"), {
                            bannerUrl: "",
                            backgroundUrl: ""
                          }, { merge: true });
                          setCarnivalBannerUrlSetting("");
                          setCarnivalBgUrl("");
                          alert("تمت استعادة الإعدادات الافتراضية بنجاح");
                        } catch (e) {
                          alert("حدث خطأ أثناء الحفظ");
                        } finally {
                          setIsCarnivalSaving(false);
                        }
                      }
                    }}
                    disabled={isCarnivalSaving}
                    className="bg-white/5 border border-white/10 py-4 rounded-2xl font-black text-xs text-white/60 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                  >
                    العودة للافتراضي
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-[#1d0a33]/85 p-6 rounded-[2.5rem] border border-purple-500/20 space-y-4 shadow-2xl mt-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <i className="fas fa-sliders-h text-purple-400"></i>
                حالة وجدول الحدث (الكرنفال)
              </h3>
              <p className="text-[10px] text-purple-300/60 font-bold uppercase tracking-widest">مراقبة حالة الكرنفال، تفعيل أو إيقاف الحدث، وإعادة تشغيل التنازلي لـ 60 يوماً</p>
              
              <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-300">حالة الحدث الحالية:</span>
                  {carnivalSettings?.isStopped ? (
                    <span className="px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full text-[10px] font-black">
                      🔴 متوقف مؤقتاً
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black">
                      🟢 نشط ويعمل
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-bold">تاريخ انتهاء الحدث:</span>
                  <span className="font-mono text-purple-300 font-black">
                    {(() => {
                      if (!carnivalSettings?.endTime) return "2026-08-07T12:00:00Z";
                      const et = carnivalSettings.endTime;
                      let d = new Date();
                      if (typeof et.toDate === 'function') d = et.toDate();
                      else if (et instanceof Date) d = et;
                      else if (typeof et === 'number') d = new Date(et);
                      else if (typeof et === 'string') d = new Date(et);
                      else if (et.seconds) d = new Date(et.seconds * 1000);
                      return d.toLocaleString('ar-EG');
                    })()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={async () => {
                    if (confirm("هل أنت متأكد من إعادة تشغيل الكرنفال؟ سيبدأ عد تنازلي جديد لمدة 60 يوماً من الآن.")) {
                      setIsCarnivalSaving(true);
                      try {
                        const newEndTime = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
                        await setDoc(doc(db, "settings", "carnival"), {
                          endTime: newEndTime
                        }, { merge: true });
                        alert("تمت إعادة تشغيل الحدث بنجاح لمدة 60 يوماً.");
                      } catch (err) {
                        alert("حدث خطأ أثناء ريستارت الحدث");
                      } finally {
                        setIsCarnivalSaving(false);
                      }
                    }
                  }}
                  disabled={isCarnivalSaving}
                  className="bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 py-2.5 px-2 rounded-xl font-black text-[10px] text-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-sync-alt text-[9px]"></i>
                  <span>إعادة تشغيل (60 يوم)</span>
                </button>

                {carnivalSettings?.isStopped ? (
                  <button
                    onClick={async () => {
                      setIsCarnivalSaving(true);
                      try {
                        await setDoc(doc(db, "settings", "carnival"), {
                          isStopped: false
                        }, { merge: true });
                        alert("تم تفعيل الكرنفال بنجاح.");
                      } catch (err) {
                        alert("حدث خطأ");
                      } finally {
                        setIsCarnivalSaving(false);
                      }
                    }}
                    disabled={isCarnivalSaving}
                    className="bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 py-2.5 px-2 rounded-xl font-black text-[10px] text-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <i className="fas fa-play text-[9px]"></i>
                    <span>تشغيل الحدث</span>
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      if (confirm("هل أنت متأكد من إيقاف الحدث بالكامل؟ سيتم منع كل من يدخل إليه مع إظهار رسالة التنبيه.")) {
                        setIsCarnivalSaving(true);
                        try {
                          await setDoc(doc(db, "settings", "carnival"), {
                            isStopped: true
                          }, { merge: true });
                          alert("تم إيقاف الكرنفال بنجاح.");
                        } catch (err) {
                          alert("حدث خطأ");
                        } finally {
                          setIsCarnivalSaving(false);
                        }
                      }
                    }}
                    disabled={isCarnivalSaving}
                    className="bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 py-2.5 px-2 rounded-xl font-black text-[10px] text-rose-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <i className="fas fa-stop text-[9px]"></i>
                    <span>إيقاف الحدث</span>
                  </button>
                )}
              </div>
            </div>

            {/* Carnival Activation Codes Generator Section */}
            <div className="bg-[#1d0a33]/85 p-6 rounded-[2.5rem] border border-purple-500/20 space-y-4 shadow-2xl mt-4 text-right">
              <h3 className="text-sm font-black text-white flex items-center gap-2 justify-start">
                <i className="fas fa-key text-purple-400"></i>
                أكواد تفعيل الكرنفال للمستخدمين
              </h3>
              <p className="text-[10px] text-purple-300/60 font-bold uppercase tracking-widest">توليد وإدارة الأكواد التي يتم منحها للمستخدمين لتفعيل استلام جائزة الـ 10 مليون عملة بعد شحن 2$</p>

              <button
                onClick={async () => {
                  try {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                    let codePart = '';
                    for (let i = 0; i < 6; i++) {
                      codePart += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    const finalCode = `CARNIVAL-${codePart}`;
                    
                    await setDoc(doc(db, "carnivalCodes", finalCode), {
                      code: finalCode,
                      createdAt: serverTimestamp(),
                      used: false,
                      usedBy: null,
                      usedAt: null
                    });
                    
                    setGeneratedCode(finalCode);
                    alert(`تم توليد كود التفعيل بنجاح: ${finalCode}`);
                  } catch (err) {
                    alert("حدث خطأ أثناء توليد الكود");
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 py-3.5 rounded-2xl font-black text-xs text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fas fa-plus animate-pulse"></i>
                <span>توليد كود تفعيل جديد</span>
              </button>

              {generatedCode && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-1">
                  <p className="text-[9px] text-emerald-400 font-black uppercase tracking-wider">الكود المولد الأخير (انسخه لمشاركته):</p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-lg font-mono font-black text-white select-all">{generatedCode}</p>
                    <button
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(generatedCode);
                          alert("تم نسخ الكود بنجاح!");
                        } catch (err) {}
                      }}
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                      title="نسخ الكود"
                    >
                      <i className="fas fa-copy text-xs"></i>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-white/5">
                <h4 className="text-[11px] font-black text-white/50 tracking-wider">الأكواد الفعالة والسجلات:</h4>
                
                {carnivalCodes.length === 0 ? (
                  <p className="text-[10px] text-white/30 text-center py-4">لم يتم توليد أي أكواد بعد.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {carnivalCodes.map((codeItem) => (
                      <div key={codeItem.id} className="bg-black/40 border border-white/5 p-3 rounded-xl flex items-center justify-between text-xs">
                        <div className="text-right">
                          <p className="font-mono font-black text-purple-300 select-all">{codeItem.code}</p>
                          <p className="text-[8px] text-white/40 mt-0.5">
                            تاريخ الإنشاء: {codeItem.createdAt ? new Date(codeItem.createdAt.seconds * 1000).toLocaleString('ar-EG') : 'الآن'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {codeItem.used ? (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/10 rounded-full text-[9px] font-extrabold">
                              مستخدم (UID: {codeItem.usedBy?.substring(0, 6)}...)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded-full text-[9px] font-extrabold">
                              جاهز ومتاح
                            </span>
                          )}

                          <button
                            onClick={() => {
                              try {
                                navigator.clipboard.writeText(codeItem.code);
                                alert("تم نسخ الكود بنجاح!");
                              } catch (err) {}
                            }}
                            className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                            title="نسخ الكود"
                          >
                            <i className="fas fa-copy text-[10px]"></i>
                          </button>

                          <button
                            onClick={async () => {
                              if (confirm("هل أنت متأكد من حذف هذا الكود بالكامل؟")) {
                                try {
                                  await deleteDoc(doc(db, "carnivalCodes", codeItem.id));
                                  alert("تم حذف كود التفعيل بنجاح.");
                                } catch (e) {
                                  alert("حدث خطأ أثناء حذف الكود");
                                }
                              }
                            }}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                            title="حذف الكود"
                          >
                            <i className="fas fa-trash-alt text-[10px]"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'reports' && (
          <div className="space-y-6 animate-in fade-in pb-20">
            <header className="flex flex-col gap-2 mb-2 px-1">
              <h3 className="text-white font-black text-lg">استلام البلاغات الواردة</h3>
              <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">تنبيهات الأمان والخصوصية</p>
            </header>

            {allReports.length === 0 ? (
              <div className="text-center py-24 opacity-20 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <i className="fas fa-shield-alt text-4xl"></i>
                </div>
                <p className="text-xs font-bold font-black tracking-widest opacity-60">لا توجد بلاغات حالياً</p>
                <p className="text-[10px] font-bold mt-1 opacity-40 uppercase">Safe Environment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {allReports.map((report) => (
                  <div key={report.id} className="bg-black/40 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative animate-in zoom-in duration-300">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                            <i className="fas fa-exclamation-triangle text-xl"></i>
                          </div>
                          <div>
                            <h4 className="text-white font-black text-sm">{report.roomName}</h4>
                            <p className="text-[9px] text-white/40 font-bold">Room ID: {report.roomId}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleRemoveReport(report.id)}
                          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-500 transition-colors active:scale-90"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-purple-400 uppercase tracking-widest block">صاحب الغرفة (ID)</label>
                          <div className="text-[11px] font-bold text-white bg-white/5 px-3 py-2 rounded-xl truncate max-w-[120px]">
                            {report.roomOwnerCustomId || (allUsers.find(u => u.id === report.roomOwnerUid)?.customId) || 'غير متوفر'}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-purple-400 uppercase tracking-widest block">مقدم البلاغ (ID)</label>
                          <div className="text-[11px] font-bold text-white bg-white/5 px-3 py-2 rounded-xl truncate max-w-[120px]">
                            {report.reporterCustomId || (allUsers.find(u => u.id === report.reporterUid)?.customId) || 'غير متوفر'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col gap-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">سبب البلاغ: {report.reason}</span>
                          </div>
                          <p className="text-xs font-bold text-white/60 leading-relaxed italic break-words">
                            "{report.details}"
                          </p>
                        </div>
                        
                        <div className="flex justify-end pt-2">
                           <span className="text-[8px] font-black text-white/20 uppercase">
                             تاريخ البلاغ: {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('ar-EG-u-nu-latn', { numberingSystem: 'latn' }) : 'الآن'}
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {adminTab === 'users' && (
          <div className="space-y-4">
            <div className="relative mb-4">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-300/30 text-xs">
                {isSearchingDB ? (
                  <i className="fas fa-spinner animate-spin text-purple-400"></i>
                ) : (
                  <i className="fas fa-search"></i>
                )}
              </span>
              <input type="text" value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="بحث بواسطة الاسم أو الـ ID..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pr-10 pl-4 text-xs text-white outline-none focus:border-purple-500/40 shadow-inner" />
            </div>
            {filteredUsers.map(u => (
              <div key={u.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 overflow-hidden rounded-full border border-white/10 bg-black/10">
                      {u.animatedAvatar ? (
                        isVideoUrl(u.animatedAvatar) ? (
                          <video src={u.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <img src={u.animatedAvatar} className="w-full h-full object-cover rounded-full" />
                        )
                      ) : (
                        <img src={u.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full object-cover rounded-full" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black flex items-center gap-1">
                        {u.displayName}
                        {u.isVerified && (
                          <svg className="w-3.5 h-3.5 text-blue-500 fill-current inline-block flex-shrink-0" viewBox="0 0 24 24" title="حساب موثق">
                            <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                          </svg>
                        )}
                      </p>
                      <p className="text-[9px] text-purple-400">ID: {u.customId}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1">
                      <i className="fas fa-coins text-yellow-500 text-[9px]"></i>
                      <span className="text-xs font-bold">{u.coins || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded ${u.canBan ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-white/20'}`}>
                        {u.canBan ? t('سيستم الحظر نشط', 'Ban system active') : t('بدون نظام حظر', 'No ban system')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded ${u.isGM ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/20'}`}>
                        {u.isGM ? t('نظام المدير نشط', 'GM system active') : t('بدون نظام مدير', 'No GM system')}
                      </span>
                    </div>
                    {u.email && (
                      <p className="text-[8px] text-white/40 font-bold truncate max-w-[100px]" title={u.email}>
                        {u.email}
                      </p>
                    )}
                    <p className="text-[7px] text-white/40 font-bold bg-white/5 px-1 rounded">
                      {t('كلمة المرور:', 'Password:')} <span className="text-purple-400">{u.password || t('غير متوفرة بعد', 'Not available yet')}</span>
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setShowChargePopup(u.id); setChargeAmount(''); }} className="bg-green-600/20 text-green-400 text-[10px] py-2 rounded-xl border border-green-600/30 font-black whitespace-nowrap">{t("شحن", "Charge")}</button>
                  <button onClick={() => { setShowDeductPopup(u.id); setDeductAmount(''); }} className="bg-orange-600/20 text-orange-400 text-[10px] py-2 rounded-xl border border-orange-600/30 font-black whitespace-nowrap">{t("خصم", "Deduct")}</button>
                  <button onClick={() => { 
                    setShowIdPopup(u.id); 
                    setNewCustomId(u.customId || ''); 
                    setNewCustomIdIcon(u.customIdIcon || null);
                    
                    const pX = u.profileIdOffsetX ?? u.idOffsetX ?? 28;
                    const pY = u.profileIdOffsetY ?? u.idOffsetY ?? 0.5;
                    const pS = u.profileIdFontSize ?? u.idFontSize ?? 11;
                    
                    const rX = u.roomIdOffsetX ?? u.idOffsetX ?? 28;
                    const rY = u.roomIdOffsetY ?? u.idOffsetY ?? 0.5;
                    const rS = u.roomIdFontSize ?? u.idFontSize ?? 11;
 
                    setIdOffsetX(pX);
                    setIdOffsetY(pY);
                    setIdFontSize(pS);
 
                    setProfileIdOffsetX(pX);
                    setProfileIdOffsetY(pY);
                    setProfileIdFontSize(pS);
 
                    setRoomIdOffsetX(rX);
                    setRoomIdOffsetY(rY);
                    setRoomIdFontSize(rS);
 
                    setActiveIdTab('profile');
                  }} className="bg-blue-600/20 text-blue-400 text-[10px] py-2 rounded-xl border border-blue-600/30 font-black">تعديل ID</button>
                  <button onClick={() => { setShowBadgesPopup(u.id); setBadgeUrl(''); }} className="bg-emerald-600/20 text-emerald-400 text-[10px] py-2 rounded-xl border border-emerald-600/30 font-black">شارات</button>
                  <button onClick={() => { setShowGrantPopup(u.id); }} className="bg-purple-600/20 text-purple-400 text-[10px] py-2 rounded-xl border border-purple-600/30 font-black">منح مخصص</button>
                  <button onClick={() => { setShowGrantAnimatedPopup(u.id); setAnimatedUrl(u.animatedAvatar || ''); }} className="bg-pink-600/20 text-pink-400 text-[10px] py-2 rounded-xl border border-pink-600/30 font-black">منح صورة متحركة</button>
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGrantBanSystem(u.id, u.displayName, !!u.canBan); }} 
                    className={`${u.canBan ? 'bg-orange-600/40 text-orange-400' : 'bg-orange-600/10 text-orange-500/60'} text-[10px] py-2 rounded-xl border border-orange-600/30 font-black`}
                  >
                    {u.canBan ? 'سحب سيستم الحظر' : 'منح سيستم الحظر'}
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGrantGMSystem(u.id, u.displayName, !!u.isGM); }} 
                    className={`${u.isGM ? 'bg-purple-600/40 text-purple-400' : 'bg-purple-600/10 text-purple-500/60'} text-[10px] py-2 rounded-xl border border-purple-600/30 font-black`}
                  >
                    {u.isGM ? 'سحب نظام المدير' : 'منح نظام المدير'}
                  </button>
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleVerification(u.id, u.displayName, !!u.isVerified); }} 
                    className={`${u.isVerified ? 'bg-blue-600/40 text-blue-400' : 'bg-blue-600/10 text-blue-500/60'} text-[10px] py-2 rounded-xl border border-blue-600/30 font-black`}
                  >
                    {u.isVerified ? 'سحب التوثيق' : 'توثيق'}
                  </button>
                  <button 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      setSecretClubPasswordVal(u.secretClubPassword || '');
                      setShowSecretClubModal({
                        uid: u.id,
                        name: u.displayName || u.name || 'مستخدم',
                        currentStatus: !!u.hasSecretClub,
                        currentPassword: u.secretClubPassword || ''
                      });
                    }} 
                    className={`${u.hasSecretClub ? 'bg-amber-500/30 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]' : 'bg-amber-500/10 text-amber-500/60 border-amber-500/30'} text-[10px] py-2 rounded-xl border font-black transition-all flex items-center justify-center gap-1`}
                  >
                    <i className="fas fa-user-secret text-[10px]"></i>
                    <span>{u.hasSecretClub ? 'سحب / تعديل النادي السري' : 'منح النادي السري'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {adminTab === 'rooms' && (() => {
          const publicRooms = allRooms.filter(r => !r.isSecretClub);
          return (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">
                {t("إدارة الغرف العامة النشطة", "Manage Active Public Rooms")} ({publicRooms.length})
              </p>
              {publicRooms.length === 0 ? (
                <div className="text-center py-20 opacity-20"><i className="fas fa-door-closed text-4xl mb-2"></i><p className="text-xs font-bold">{t("لا توجد غرف عامة نشطة", "No active public rooms")}</p></div>
              ) : publicRooms.map(room => (
                <div key={room.id} className="bg-white/5 rounded-2xl border border-white/10 flex items-stretch gap-4 animate-in fade-in duration-300 overflow-hidden h-24">
                  <div className="w-24 h-full flex-shrink-0 bg-black/40">
                    {isVideoUrl(room.coverImage) ? (
                      <video src={room.coverImage} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={room.coverImage} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 py-3 flex flex-col justify-center min-w-0">
                    <p className="text-xs font-black text-white truncate">{room.title}</p>
                    <p className="text-[9px] text-purple-400 font-bold">ID: {room.roomIdDisplay || room.id.substring(0,8)}</p>
                    <p className="text-[8px] text-white/40 mt-1 truncate">بواسطة: {room.owner?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3">
                    <div className="bg-white/5 px-2 py-1 rounded-lg border border-white/5 flex items-center gap-1 flex-shrink-0">
                      <i className="fas fa-users text-[8px] text-purple-400"></i>
                      <span className="text-[10px] font-black text-white">{room.participantsCount || 0}</span>
                    </div>
                    <button 
                      onClick={() => { setShowRoomCoverPopup(room.id); setAnimatedRoomCoverUrl(room.coverImage || ''); }}
                      className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-600/30 flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
                      title="غلاف متحرك"
                    >
                      <i className="fas fa-magic text-xs"></i>
                    </button>
                    <button 
                      onClick={async () => {
                        if(confirm(`هل تريد حقاً حذف غرفة "${room.title}" نهائياً؟`)) {
                          try {
                            await deleteDoc(doc(db, "rooms", room.id));
                            alert("تم حذف الغرفة بنجاح.");
                          } catch (e: any) {
                            console.error("Error deleting room:", e);
                            alert("حدث خطأ أثناء حذف الغرفة: " + (e.message || e));
                          }
                        }
                      }} 
                      className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 border border-red-600/30 flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {adminTab === 'secretClubRooms' && (() => {
          const clubRooms = allRooms.filter(r => !!r.isSecretClub);
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                  {t("إدارة غرف النادي السري النشطة", "Manage Active Secret Club Rooms")} ({clubRooms.length})
                </p>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 font-bold">
                  {t("النادي السري", "Secret Club")}
                </span>
              </div>
              {clubRooms.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <i className="fas fa-user-secret text-4xl mb-2"></i>
                  <p className="text-xs font-bold">{t("لا توجد غرف في النادي السري حالياً", "No secret club rooms active currently")}</p>
                </div>
              ) : clubRooms.map(room => (
                <div key={room.id} className="bg-white/5 rounded-2xl border border-white/10 flex items-stretch gap-4 animate-in fade-in duration-300 overflow-hidden h-24">
                  <div className="w-24 h-full flex-shrink-0 bg-black/40">
                    {isVideoUrl(room.coverImage) ? (
                      <video src={room.coverImage} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={room.coverImage} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 py-3 flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-black text-white truncate">{room.title}</p>
                      <span className="text-[7.5px] px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex-shrink-0">سري</span>
                    </div>
                    <p className="text-[9px] text-purple-400 font-bold">ID: {room.roomIdDisplay || room.id.substring(0,8)}</p>
                    <p className="text-[8px] text-white/40 mt-1 truncate">بواسطة: {room.owner?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 px-3">
                    <div className="bg-white/5 px-2 py-1 rounded-lg border border-white/5 flex items-center gap-1 flex-shrink-0">
                      <i className="fas fa-users text-[8px] text-purple-400"></i>
                      <span className="text-[10px] font-black text-white">{room.participantsCount || 0}</span>
                    </div>
                    <button 
                      onClick={() => { setShowRoomCoverPopup(room.id); setAnimatedRoomCoverUrl(room.coverImage || ''); }}
                      className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-600/30 flex items-center justify-center active:scale-90 transition-all flex-shrink-0 hover:bg-purple-600/30"
                      title={t("غلاف متحرك", "Animated Cover")}
                    >
                      <i className="fas fa-magic text-xs"></i>
                    </button>
                    <button 
                      onClick={async () => {
                        if(confirm(`هل تريد حقاً حذف غرفة النادي السري "${room.title}" نهائياً؟`)) {
                          try {
                            await deleteDoc(doc(db, "rooms", room.id));
                            alert("تم حذف غرفة النادي السري بنجاح.");
                          } catch (e: any) {
                            console.error("Error deleting secret room:", e);
                            alert("حدث خطأ أثناء حذف الغرفة: " + (e.message || e));
                          }
                        }
                      }} 
                      className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 border border-red-600/30 flex items-center justify-center active:scale-90 transition-all flex-shrink-0 hover:bg-red-600/30"
                      title={t("حذف الغرفة", "Delete Room")}
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {adminTab === 'trophyBg' && (
          <div className="space-y-6">
            <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/10 space-y-4 shadow-2xl">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <i className="fas fa-trophy text-yellow-500"></i>
                {t("إدارة خلفيات الكؤوس العامة", "Manage Global Trophy Background")}
              </h3>
              <p className="text-[11px] text-white/50 leading-relaxed font-bold">
                {t("هنا يمكنك التحكم في الخلفية العامة لصفحة الكأس في جميع الغرف. الرابط الذي تدخله بالأسفل سيطبق كخلفية لصفحة الكأس لدى كل المستخدمين في جميع غرف التطبيق.", "Here you can control the global background for the trophy page across all rooms. The URL you enter below will be applied as the trophy page background for all users in every room of the application.")}
              </p>
            </div>

            <div className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-6 shadow-xl max-w-xl mx-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest-xs">
                  {t("رابط الخلفية العامة للكؤوس (URL)", "Global Trophy Background URL")}
                </label>
                <input 
                  type="text" 
                  value={globalTrophyBg} 
                  onChange={(e) => setGlobalTrophyBg(e.target.value)} 
                  placeholder="https://example.com/global-trophy-bg.jpg" 
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 text-left font-sans font-bold" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest-xs">
                  {t("رابط خلفية مستطيل معلومات الأشخاص (مستطيل الكأس)", "Trophy User Card Rectangle URL")}
                </label>
                <input 
                  type="text" 
                  value={globalTrophyItemBg} 
                  onChange={(e) => setGlobalTrophyItemBg(e.target.value)} 
                  placeholder="https://example.com/user-card-rect.png" 
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 text-left font-sans font-bold" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest-xs">
                  {t("رابط لون (صورة) زر التبويب النشط", "Active Tab Highlight Image URL")}
                </label>
                <input 
                  type="text" 
                  value={globalTrophyTabActiveBg} 
                  onChange={(e) => setGlobalTrophyTabActiveBg(e.target.value)} 
                  placeholder="https://example.com/active-tab-highlight.png" 
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 text-left font-sans font-bold" 
                />
              </div>

              {(globalTrophyBg || globalTrophyItemBg || globalTrophyTabActiveBg) && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest text-center block">
                    {t("معاينة الخلفية والعناصر", "Trophy Graphics Preview")}
                  </label>
                  <div className="relative aspect-[9/16] max-w-[200px] mx-auto rounded-3xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl flex flex-col justify-between p-4">
                    {globalTrophyBg && (
                      <img 
                        src={globalTrophyBg} 
                        className="absolute inset-0 w-full h-full object-cover z-0" 
                        alt="Global Trophy Background Preview" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }} 
                      />
                    )}
                    {/* Mock layout overlay to see how it matches real UI */}
                    <div className="relative z-10 w-full flex justify-between items-center bg-black/40 backdrop-blur-xs p-1.5 rounded-full border border-white/10">
                      <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] text-white"><i className="fas fa-chevron-right"></i></div>
                      <span className="text-[8px] font-black text-white">{t("كأس الغرفة", "Room Trophy")}</span>
                      <div className="w-5"></div>
                    </div>

                    {/* Active tab mock */}
                    <div className="relative z-10 w-full bg-white/5 p-0.5 rounded-full border border-white/10 grid grid-cols-2 text-center text-[7px] font-black">
                      <div 
                        style={globalTrophyTabActiveBg ? { backgroundImage: `url(${globalTrophyTabActiveBg})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' } : {}}
                        className={`py-0.5 rounded-full text-white ${globalTrophyTabActiveBg ? '' : 'bg-yellow-500/20 text-yellow-400'}`}
                      >
                        {t("اليومي", "Daily")}
                      </div>
                      <div className="py-0.5 text-white/50">{t("الأسبوعي", "Weekly")}</div>
                    </div>

                    {/* User list card mock */}
                    <div 
                      style={globalTrophyItemBg ? { backgroundImage: `url(${globalTrophyItemBg})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' } : {}}
                      className={`relative z-10 w-full p-2 rounded-xl flex items-center justify-between text-white ${globalTrophyItemBg ? '' : 'bg-white/5 border border-white/5'}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-white/25 overflow-hidden"></div>
                        <div className="text-right">
                          <div className="text-[7px] font-black leading-none text-white">الاسم هنا</div>
                          <div className="text-[5px] text-white/60 font-mono scale-90 -mx-1">ID: 12345</div>
                        </div>
                      </div>
                      <div className="text-[7px] bg-yellow-500/20 text-yellow-500 font-extrabold px-1 py-0.5 rounded-full">
                        1,000 <i className="fas fa-coins text-[5px]"></i>
                      </div>
                    </div>

                    <div className="relative z-10 w-full bg-black/40 backdrop-blur-xs p-1 rounded-2xl border border-white/10 flex flex-col gap-1 items-center">
                      <div className="w-5 h-5 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-500 text-[8px]"><i className="fas fa-trophy"></i></div>
                      <div className="w-8 h-0.5 bg-white/20 rounded-full"></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 font-black pt-2">
                <button
                  onClick={async () => {
                    try {
                      await setDoc(doc(db, "settings", "design"), {
                        roomTrophyBg: globalTrophyBg.trim(),
                        roomTrophyItemBg: globalTrophyItemBg.trim(),
                        roomTrophyTabActiveBg: globalTrophyTabActiveBg.trim()
                      }, { merge: true });
                      alert(t("تم حفظ أزرار وخلفيات الكأس بنجاح!", "Trophy assets and background saved successfully!"));
                    } catch (error: any) {
                      alert(t("حدث خطأ أثناء الحفظ: ", "Error saving: ") + (error.message || error));
                    }
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl"
                >
                  <i className="fas fa-save text-sm"></i>
                  <span>{t("حفظ تعديلات الكأس", "Save Trophy Designs")}</span>
                </button>

                {(globalTrophyBg || globalTrophyItemBg || globalTrophyTabActiveBg) && (
                  <button
                    onClick={async () => {
                      if (confirm(t("هل أنت متأكد من حذف تعديلات الكأس والرجوع للافتراضي؟", "Are you sure you want to delete custom trophy graphics and revert to defaults?"))) {
                        try {
                          await setDoc(doc(db, "settings", "design"), {
                            roomTrophyBg: deleteField(),
                            roomTrophyItemBg: deleteField(),
                            roomTrophyTabActiveBg: deleteField()
                          }, { merge: true });
                          setGlobalTrophyBg('');
                          setGlobalTrophyItemBg('');
                          setGlobalTrophyTabActiveBg('');
                          alert(t("تم حذف تعديلات الكأس بنجاح والرجوع للافتراضي!", "Trophy designs reverted to default successfully!"));
                        } catch (error: any) {
                          alert(t("حدث خطأ أثناء الحذف: ", "Error deleting: ") + (error.message || error));
                        }
                      }
                    }}
                    className="bg-red-600/20 hover:bg-red-600 border border-red-500/30 hover:border-red-500 text-red-300 hover:text-white px-5 py-4 rounded-2xl text-xs font-black transition-all active:scale-95 flex items-center justify-center"
                    title={t("حذف والرجوع للافتراضي", "Delete and revert to default")}
                  >
                    <i className="fas fa-trash-alt text-sm"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'gifts' && (
          <div className="space-y-6">
            <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/10 space-y-4 shadow-2xl">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <i className="fas fa-gift text-purple-400"></i>
                إضافة هدية جديدة
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">اسم الهدية</label>
                  <input value={giftName} onChange={e => setGiftName(e.target.value)} placeholder="مثلاً: وردة، سيارة..." className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">سعر الهدية (كوينز)</label>
                  <input type="number" value={giftPrice} onChange={e => setGiftPrice(e.target.value)} placeholder="100" className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">رابط الأيقونة (PNG/Emoji)</label>
                  <input value={giftIcon} onChange={e => setGiftIcon(e.target.value)} placeholder="رابط صورة الهدية أو إيموجي..." className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-[10px] text-white outline-none focus:border-purple-500/40 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">رابط الأنيميشن (Gif/Mp4 - اختياري)</label>
                  <input value={giftAnimation} onChange={e => setGiftAnimation(e.target.value)} placeholder="رابط GIF أو فيديو الهدية..." className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-[10px] text-white outline-none focus:border-purple-500/40 font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">القسم في صندوق الهدايا</label>
                  <select 
                    value={giftCategory} 
                    onChange={e => setGiftCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40"
                  >
                    <option value="normal">عادية</option>
                    <option value="lucky">محظوظة (هدايا الحظ)</option>
                    <option value="cp">CP</option>
                    <option value="famous">مشاهير</option>
                    <option value="country">دولة</option>
                    <option value="vip">VIP</option>
                    <option value="birthday">ميلاد</option>
                  </select>
                </div>

                {giftCategory === 'lucky' && (
                  <div className="bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-purple-900/30 p-4 rounded-3xl border border-yellow-500/30 space-y-4 animate-in zoom-in duration-300">
                    <div className="flex items-center justify-between border-b border-yellow-500/20 pb-2">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-dice text-yellow-400 text-sm"></i>
                        <span className="text-xs font-black text-yellow-300">إعدادات نسبة الحظ والمردود</span>
                      </div>
                      <span className="text-[9px] bg-yellow-400/20 text-yellow-300 font-bold px-2 py-0.5 rounded-full border border-yellow-400/30">
                        {luckyRate}% نسبة الفوز
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-black text-yellow-200/80 uppercase tracking-widest">نسبة الحظ (احتمال ربح كوينزات)</label>
                        <span className="text-[10px] font-black text-yellow-400 font-mono">{luckyRate}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="100" 
                        step="5"
                        value={luckyRate} 
                        onChange={e => setLuckyRate(parseInt(e.target.value))} 
                        className="w-full accent-yellow-400 cursor-pointer h-2 bg-white/10 rounded-lg"
                      />
                      <div className="flex justify-between text-[8px] text-white/40 px-1 font-bold">
                        <span>10% (نادر)</span>
                        <span>50% (متوازن)</span>
                        <span>80% (موصى به)</span>
                        <span>100% (فوز دائم)</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-yellow-200/80 uppercase tracking-widest">نموذج مضاعفات المردود</label>
                      <select 
                        value={luckyMultipliersPreset} 
                        onChange={e => setLuckyMultipliersPreset(e.target.value as any)}
                        className="w-full bg-black/40 border border-yellow-500/30 p-3 rounded-2xl text-xs text-white outline-none focus:border-yellow-400"
                      >
                        <option value="standard">قياسي: 0.05x إلى 25x (مثلاً: 100 إلى 50,000 عند رمي 2000)</option>
                        <option value="high">حماسي عالي: 0.1x إلى 50x (مضاعفات قوية)</option>
                        <option value="jackpot">جاكبوت أسطوري: 0.05x إلى 100x</option>
                        <option value="custom">مخصص (أدخل المضاعفات يدوياً)</option>
                      </select>
                    </div>

                    {luckyMultipliersPreset === 'custom' && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-yellow-200/80 uppercase tracking-widest">المضاعفات المخصصة (مفصولة بفاصلة)</label>
                        <input 
                          type="text" 
                          value={customLuckyMultipliers} 
                          onChange={e => setCustomLuckyMultipliers(e.target.value)} 
                          placeholder="مثلاً: 0.05, 0.5, 1, 2, 5, 10, 25" 
                          className="w-full bg-black/40 border border-yellow-500/30 p-3 rounded-2xl text-xs text-white font-mono outline-none"
                        />
                      </div>
                    )}

                    {/* معاينة حية للمردود بالأرقام */}
                    {(() => {
                      const basePrice = parseInt(giftPrice) || 2000;
                      let multipliers = [0.05, 0.5, 1, 2, 5, 10, 25];
                      if (luckyMultipliersPreset === 'high') multipliers = [0.1, 1, 2, 5, 15, 30, 50];
                      if (luckyMultipliersPreset === 'jackpot') multipliers = [0.05, 0.2, 1, 5, 10, 25, 50, 100];
                      if (luckyMultipliersPreset === 'custom') {
                        const customList = customLuckyMultipliers.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
                        if (customList.length > 0) multipliers = customList;
                      }

                      return (
                        <div className="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-2">
                          <p className="text-[9px] font-black text-white/80">
                            معاينة مردود الكوينزات عند رمي الهدية ({basePrice.toLocaleString('en-US')} كوينز):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {multipliers.map((m, idx) => {
                              const coinsWon = Math.floor(basePrice * m);
                              return (
                                <span key={idx} className="bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-lg text-[9px] text-yellow-300 font-bold font-mono">
                                  {m}x = {coinsWon.toLocaleString('en-US')} كوينز
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <button 
                onClick={handlePublishGift}
                disabled={isPublishing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all border border-white/10"
              >
                {isPublishing ? <i className="fas fa-spinner animate-spin"></i> : <span>نشر الهدية الآن</span>}
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">الهدايا الحالية ({allGifts.length})</p>
              <div className="grid grid-cols-2 gap-3">
                {allGifts.map(gift => (
                  <div key={gift.id} className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center gap-2 relative group">
                    <div className="text-3xl mb-1">
                      {gift.icon.startsWith('http') ? (
                        <img src={gift.icon} className="w-10 h-10 object-contain" />
                      ) : gift.icon}
                    </div>
                    <div className="text-center w-full">
                      <p className="text-[10px] font-black text-white truncate w-24 mx-auto">{gift.name}</p>
                      <p className="text-[8px] text-yellow-500 font-bold">{gift.price} كوينز</p>
                      <span className="text-[7px] text-white/30 uppercase">{gift.tab}</span>
                      {gift.tab === 'lucky' && (
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                          <span className="text-[8px] bg-yellow-400/20 text-yellow-300 font-bold px-1.5 py-0.5 rounded-full border border-yellow-400/30">
                            🍀 حظ {gift.luckyRate || 80}%
                          </span>
                          {gift.luckyMultipliers && gift.luckyMultipliers.length > 0 && (
                            <span className="text-[7px] text-yellow-400/70 font-mono truncate max-w-full">
                              مردود حتى {Math.max(...gift.luckyMultipliers)}x
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={async () => {
                        if(confirm("حذف هذه الهدية؟")) {
                          try {
                            await deleteDoc(doc(db, "gifts", gift.id));
                            alert("تم حذف الهدية بنجاح.");
                          } catch (e: any) {
                            console.error("Error deleting gift:", e);
                            alert("حدث خطأ أثناء حذف الهدية: " + (e.message || e));
                          }
                        }
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <i className="fas fa-trash-alt text-[10px]"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'luckyDesign' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* بطاقة زر الكومبو */}
            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-lg flex items-center justify-center">
                    <div className="w-full h-full bg-black/40 rounded-[14px] flex items-center justify-center text-pink-300">
                      <i className="fas fa-redo-alt text-lg"></i>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">أيقونة زر الكومبو (COMBO)</h3>
                    <p className="text-[10px] text-purple-300/80 font-bold uppercase tracking-wider">
                      تخصيص الأيقونة الداخلية لزر الكومبو وحولها الدائرة التنازلية
                    </p>
                  </div>
                </div>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 font-bold px-3 py-1 rounded-full border border-purple-500/30">
                  زر الكومبو
                </span>
              </div>

              {/* بطاقة إدخال أيقونة الكومبو */}
              <div className="space-y-4 bg-black/30 p-5 rounded-3xl border border-white/5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fas fa-image text-purple-400"></i>
                    <span>رابط أيقونة زر الكومبو (PNG / GIF شفاف)</span>
                  </label>
                  <p className="text-[9px] text-white/50 leading-relaxed">
                    ضع رابط الأيقونة التي ستظهر بقلب زر الكومبو، وتلتف حول حوافها الدائرة البنفسجية التي تنقص حسب عداد الثواني مع كلمة COMBO.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={comboButtonIcon}
                    onChange={(e) => setComboButtonIcon(e.target.value)}
                    placeholder="https://.../combo-icon.png (رابط الأيقونة)"
                    className="flex-1 bg-white/5 border border-white/10 py-3.5 px-4 rounded-2xl text-[10px] text-white outline-none focus:border-purple-400/50 transition-all font-mono"
                  />
                  <button 
                    onClick={() => comboButtonInputRef.current?.click()}
                    className="px-4 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-2xl text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                    title="رفع صورة من الجهاز"
                  >
                    <i className="fas fa-upload text-[11px]"></i>
                    <span className="text-[10px]">رفع</span>
                  </button>
                  {comboButtonIcon && (
                    <button 
                      onClick={() => setComboButtonIcon('')}
                      className="px-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-2xl text-red-400 text-xs transition-all"
                      title="مسح الرابط"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>

              {/* المعاينة الحية لزر الكومبو */}
              <div className="bg-black/40 p-6 rounded-3xl border border-white/10 flex flex-col items-center justify-center space-y-4 text-center">
                <p className="text-[10px] font-black text-white/80 uppercase tracking-widest">
                  معاينة حية لزر الكومبو كما يظهر في الغرفة
                </p>

                <div className="relative w-[84px] h-[84px] rounded-full flex items-center justify-center bg-black/60 shadow-inner">
                  <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 84 84">
                    <circle
                      cx="42"
                      cy="42"
                      r="39.5"
                      className="stroke-purple-950/70"
                      strokeWidth="4.5"
                      fill="none"
                    />
                    <circle
                      cx="42"
                      cy="42"
                      r="39.5"
                      stroke="#a855f7"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray="248"
                      strokeDashoffset="62"
                    />
                  </svg>

                  {comboButtonIcon ? (
                    <div className="w-[75px] h-[75px] rounded-full flex flex-col items-center justify-center relative overflow-hidden select-none shadow-md">
                      <img 
                        src={comboButtonIcon} 
                        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" 
                        alt="Combo Preview" 
                      />
                      <div className="absolute inset-0 bg-black/25 pointer-events-none"></div>

                      <span className="relative z-10 text-[11px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-none uppercase">
                        COMBO
                      </span>
                      <div className="relative z-10 mt-0.5 h-[16px] min-w-[16px] px-1 bg-black/80 backdrop-blur-xs rounded-full border border-purple-300/40 flex items-center justify-center shadow-sm">
                        <span className="text-[8.5px] font-black text-purple-200 leading-none font-mono">
                          x3
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-[75px] h-[75px] rounded-full bg-gradient-to-tr from-purple-700 via-fuchsia-600 to-pink-500 border border-fuchsia-200/90 shadow-[0_0_25px_rgba(168,85,247,0.7)] flex flex-col items-center justify-center text-center select-none">
                      <span className="text-xs font-black text-white tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">
                        COMBO
                      </span>
                      <div className="mt-0.5 h-[16px] min-w-[16px] px-1 bg-black/70 rounded-full border border-fuchsia-300/40 flex items-center justify-center">
                        <span className="text-[8.5px] font-black text-fuchsia-200 leading-none font-mono">
                          x3
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="absolute -inset-1 rounded-full border border-purple-500/40 animate-ping pointer-events-none opacity-40"></div>
                </div>
              </div>
            </div>

            {/* بطاقة دوائر تنبيه فوز هدايا الحظ حسب مستويات الـ X */}
            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-lg flex items-center justify-center">
                    <div className="w-full h-full bg-black/40 rounded-[14px] flex items-center justify-center text-yellow-300">
                      <i className="fas fa-trophy text-lg"></i>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">دوائر تنبيه فوز المحظوظة (حسب مضاعف الـ X)</h3>
                    <p className="text-[10px] text-yellow-300/80 font-bold uppercase tracking-wider">
                      أيقونات مخصصة لدوائر التنبيه التي تظهر في منتصف الشاشة حسب مضاعف الفوز وبدون التاج المزيف
                    </p>
                  </div>
                </div>
                <span className="text-[9px] bg-yellow-400/20 text-yellow-300 font-bold px-3 py-1 rounded-full border border-yellow-400/30">
                  4 مستويات
                </span>
              </div>

              {/* شبكة المستويات الأربعة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* المستوى 1: ضعف 5 إلى 10 */}
                <div className="bg-black/30 p-5 rounded-3xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center text-[10px] font-black">1</span>
                      <h4 className="text-xs font-black text-white">الدائرة رقم 1</h4>
                    </div>
                    <span className="text-[9px] font-black bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                      من ضعف 5 لحد 10
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={luckyCircleTier1}
                      onChange={(e) => setLuckyCircleTier1(e.target.value)}
                      placeholder="رابط أيقونة الدائرة 1 (PNG شفافة)..."
                      className="flex-1 bg-white/5 border border-white/10 py-2.5 px-3 rounded-xl text-[10px] text-white outline-none focus:border-blue-400/50 transition-all font-mono"
                    />
                    <button 
                      onClick={() => luckyCircle1InputRef.current?.click()}
                      className="px-3 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 rounded-xl text-white text-[10px] font-bold flex items-center gap-1"
                    >
                      <i className="fas fa-upload text-[10px]"></i>
                      <span>رفع</span>
                    </button>
                    {luckyCircleTier1 && (
                      <button 
                        onClick={() => setLuckyCircleTier1('')}
                        className="px-2.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-xl text-red-400 text-xs"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                  {/* مصغّر المعاينة */}
                  <div className="h-32 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                    {luckyCircleTier1 ? (
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <img src={luckyCircleTier1} className="w-full h-full object-contain pointer-events-none drop-shadow-md" alt="Tier 1" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center">
                          <span className="text-[9px] font-black text-white leading-tight drop-shadow-md">🎉 مبارك ربحت 🎉</span>
                          <span className="text-[8px] font-black text-yellow-300 font-mono mt-0.5">+5,000 كوينز</span>
                          <span className="text-[7.5px] font-black bg-blue-500/80 text-white px-1.5 py-0.2 rounded-full mt-0.5">مضاعف x7</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/40 font-bold">لا يوجد أيقونة مخصصة (يستخدم الافتراضي)</span>
                    )}
                  </div>
                </div>

                {/* المستوى 2: ضعف 10 إلى 20 */}
                <div className="bg-black/30 p-5 rounded-3xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[10px] font-black">2</span>
                      <h4 className="text-xs font-black text-white">الدائرة رقم 2</h4>
                    </div>
                    <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                      من ضعف 10 لحد 20
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={luckyCircleTier2}
                      onChange={(e) => setLuckyCircleTier2(e.target.value)}
                      placeholder="رابط أيقونة الدائرة 2 (PNG شفافة)..."
                      className="flex-1 bg-white/5 border border-white/10 py-2.5 px-3 rounded-xl text-[10px] text-white outline-none focus:border-emerald-400/50 transition-all font-mono"
                    />
                    <button 
                      onClick={() => luckyCircle2InputRef.current?.click()}
                      className="px-3 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 rounded-xl text-white text-[10px] font-bold flex items-center gap-1"
                    >
                      <i className="fas fa-upload text-[10px]"></i>
                      <span>رفع</span>
                    </button>
                    {luckyCircleTier2 && (
                      <button 
                        onClick={() => setLuckyCircleTier2('')}
                        className="px-2.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-xl text-red-400 text-xs"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                  {/* مصغّر المعاينة */}
                  <div className="h-32 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                    {luckyCircleTier2 ? (
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <img src={luckyCircleTier2} className="w-full h-full object-contain pointer-events-none drop-shadow-md" alt="Tier 2" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center">
                          <span className="text-[9px] font-black text-white leading-tight drop-shadow-md">🎉 مبارك ربحت 🎉</span>
                          <span className="text-[8px] font-black text-yellow-300 font-mono mt-0.5">+15,000 كوينز</span>
                          <span className="text-[7.5px] font-black bg-emerald-500/80 text-white px-1.5 py-0.2 rounded-full mt-0.5">مضاعف x15</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/40 font-bold">لا يوجد أيقونة مخصصة (يستخدم الافتراضي)</span>
                    )}
                  </div>
                </div>

                {/* المستوى 3: ضعف 20 إلى 30 */}
                <div className="bg-black/30 p-5 rounded-3xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center text-[10px] font-black">3</span>
                      <h4 className="text-xs font-black text-white">الدائرة رقم 3</h4>
                    </div>
                    <span className="text-[9px] font-black bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-400/30">
                      من ضعف 20 لحد 30
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={luckyCircleTier3}
                      onChange={(e) => setLuckyCircleTier3(e.target.value)}
                      placeholder="رابط أيقونة الدائرة 3 (PNG شفافة)..."
                      className="flex-1 bg-white/5 border border-white/10 py-2.5 px-3 rounded-xl text-[10px] text-white outline-none focus:border-purple-400/50 transition-all font-mono"
                    />
                    <button 
                      onClick={() => luckyCircle3InputRef.current?.click()}
                      className="px-3 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-xl text-white text-[10px] font-bold flex items-center gap-1"
                    >
                      <i className="fas fa-upload text-[10px]"></i>
                      <span>رفع</span>
                    </button>
                    {luckyCircleTier3 && (
                      <button 
                        onClick={() => setLuckyCircleTier3('')}
                        className="px-2.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-xl text-red-400 text-xs"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                  {/* مصغّر المعاينة */}
                  <div className="h-32 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                    {luckyCircleTier3 ? (
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <img src={luckyCircleTier3} className="w-full h-full object-contain pointer-events-none drop-shadow-md" alt="Tier 3" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center">
                          <span className="text-[9px] font-black text-white leading-tight drop-shadow-md">🎉 مبارك ربحت 🎉</span>
                          <span className="text-[8px] font-black text-yellow-300 font-mono mt-0.5">+30,000 كوينز</span>
                          <span className="text-[7.5px] font-black bg-purple-500/80 text-white px-1.5 py-0.2 rounded-full mt-0.5">مضاعف x25</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/40 font-bold">لا يوجد أيقونة مخصصة (يستخدم الافتراضي)</span>
                    )}
                  </div>
                </div>

                {/* المستوى 4: ضعف 30 وما فوق */}
                <div className="bg-black/30 p-5 rounded-3xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center text-[10px] font-black">4</span>
                      <h4 className="text-xs font-black text-white">الدائرة رقم 4</h4>
                    </div>
                    <span className="text-[9px] font-black bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-400/30">
                      من ضعف 30 وما فوق
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={luckyCircleTier4}
                      onChange={(e) => setLuckyCircleTier4(e.target.value)}
                      placeholder="رابط أيقونة الدائرة 4 (PNG شفافة)..."
                      className="flex-1 bg-white/5 border border-white/10 py-2.5 px-3 rounded-xl text-[10px] text-white outline-none focus:border-rose-400/50 transition-all font-mono"
                    />
                    <button 
                      onClick={() => luckyCircle4InputRef.current?.click()}
                      className="px-3 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 rounded-xl text-white text-[10px] font-bold flex items-center gap-1"
                    >
                      <i className="fas fa-upload text-[10px]"></i>
                      <span>رفع</span>
                    </button>
                    {luckyCircleTier4 && (
                      <button 
                        onClick={() => setLuckyCircleTier4('')}
                        className="px-2.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-xl text-red-400 text-xs"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                  {/* مصغّر المعاينة */}
                  <div className="h-36 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                    {luckyCircleTier4 ? (
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <img src={luckyCircleTier4} className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]" alt="Tier 4" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center">
                          <span className="text-[10px] font-black text-white leading-tight drop-shadow-md">🎉 فوز أسطوري 🎉</span>
                          <span className="text-[9px] font-black text-yellow-300 font-mono mt-0.5">+50,000 كوينز</span>
                          <span className="text-[8px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-full mt-1 shadow-sm">مضاعف x35+</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-white/40 font-bold">لا يوجد أيقونة مخصصة (يستخدم الافتراضي)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* أزرار الحفظ والاستعادة لجميع التصاميم */}
              <div className="flex gap-3 pt-3 border-t border-white/10">
                <button 
                  onClick={async () => {
                    try {
                      await setDoc(doc(db, "settings", "design"), {
                        comboButtonIcon: comboButtonIcon.trim(),
                        luckyCircleTier1: luckyCircleTier1.trim(),
                        luckyCircleTier2: luckyCircleTier2.trim(),
                        luckyCircleTier3: luckyCircleTier3.trim(),
                        luckyCircleTier4: luckyCircleTier4.trim(),
                      }, { merge: true });
                      alert("تم حفظ تصاميم المحظوظة وزر الكومبو بنجاح وتطبيقها في جميع الغرف!");
                    } catch (e: any) {
                      console.error("Error saving lucky designs:", e);
                      alert("حدث خطأ أثناء الحفظ: " + (e.message || e));
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 py-4 rounded-2xl font-black text-xs text-black shadow-xl active:scale-95 transition-all border border-yellow-300/40 flex items-center justify-center gap-2"
                >
                  <i className="fas fa-check"></i>
                  <span>حفظ جميع تصاميم المحظوظة</span>
                </button>

                <button 
                  onClick={async () => {
                    if (confirm("هل تريد استعادة جميع تصاميم المحظوظة والكومبو إلى التصاميم الافتراضية؟")) {
                      try {
                        await setDoc(doc(db, "settings", "design"), {
                          comboButtonIcon: '',
                          luckyCircleTier1: '',
                          luckyCircleTier2: '',
                          luckyCircleTier3: '',
                          luckyCircleTier4: '',
                        }, { merge: true });
                        setComboButtonIcon('');
                        setLuckyCircleTier1('');
                        setLuckyCircleTier2('');
                        setLuckyCircleTier3('');
                        setLuckyCircleTier4('');
                        alert("تمت استعادة التصاميم الافتراضية بنجاح!");
                      } catch (e: any) {
                        alert("خطأ: " + (e.message || e));
                      }
                    }
                  }}
                  className="px-6 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 py-4 rounded-2xl font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <i className="fas fa-undo"></i>
                  <span>استعادة الافتراضي</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {adminTab === 'emojis' && (
          <div className="space-y-6">
            <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/10 space-y-4 shadow-2xl">
              <h3 className="text-sm font-black text-white">إضافة GIF Emoji جديد</h3>
              <p className="text-[10px] text-purple-400/60 font-bold uppercase tracking-widest">ستظهر هذه الإيموجيات في قائمة الإيموجي داخل الغرف</p>
              
              <div className="space-y-2">
                <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">رابط الإيموجي (URL)</label>
                <input 
                  type="text"
                  value={emojiUrl}
                  onChange={(e) => setEmojiUrl(e.target.value)}
                  placeholder="ضع رابط الـ GIF هنا (مثلاً: https://...)"
                  className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-2xl text-[10px] text-white outline-none focus:border-purple-500/40 transition-all shadow-inner font-mono" 
                />
              </div>

              {emojiUrl.trim() && (
                <div className="w-full aspect-square bg-black/40 rounded-3xl border border-white/10 flex flex-col items-center justify-center overflow-hidden">
                   <img 
                    src={emojiUrl} 
                    className="w-full h-full object-contain" 
                    alt="Emoji Preview" 
                   />
                   <p className="text-[8px] text-white/20 mt-2 font-black uppercase tracking-widest">معاينة الإيموجي</p>
                </div>
              )}

              <button 
                onClick={handlePublishEmoji}
                disabled={isPublishing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all border border-white/10 flex items-center justify-center gap-3"
              >
                {isPublishing ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-upload"></i><span>نشر الإيموجي الآن</span></>}
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">الإيموجيات الحالية ({allEmojis.length})</p>
              <div className="grid grid-cols-4 gap-3">
                {allEmojis.map(emoji => (
                  <div key={emoji.id} className="relative aspect-square bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center p-2 group overflow-hidden shadow-lg">
                    <img src={emoji.imageUrl} className="w-full h-full object-contain" />
                    <button 
                      onClick={async () => {
                        if(confirm("هل تريد حذف هذا الإيموجي؟")) {
                          try {
                            await deleteDoc(doc(db, "emojis", emoji.id));
                            alert("تم حذف الإيموجي بنجاح.");
                          } catch (e: any) {
                            console.error("Error deleting emoji:", e);
                            alert("حدث خطأ أثناء حذف الإيموجي: " + (e.message || e));
                          }
                        }
                      }}
                      className="absolute inset-0 bg-red-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]"
                    >
                      <i className="fas fa-trash text-white"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'store' && (
          <div className="space-y-6">
            <div className="bg-purple-600/10 p-5 rounded-[2rem] border border-purple-500/20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg">
                <i className="fas fa-store text-xl"></i>
              </div>
              <div>
                <h3 className="text-sm font-black text-white">إدارة المتجر</h3>
                <p className="text-[10px] text-purple-300/60 font-bold">التحكم في محتوى المتجر العام</p>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5">
              {[
                {id: 'frames', label: 'الإطارات', icon: 'fa-id-badge'},
                {id: 'entries', label: 'الدخوليات', icon: 'fa-door-open'},
                {id: 'backgrounds', label: 'الخلفيات'}
              ].map(sec => (
                <button 
                  key={sec.id}
                  onClick={() => setStoreSection(sec.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black transition-all ${storeSection === sec.id ? 'bg-purple-600 text-white shadow-lg' : 'text-white/30'}`}
                >
                  <i className={`fas ${sec.icon}`}></i>
                  <span>{sec.label}</span>
                </button>
              ))}
            </div>

            {storeSection === 'frames' && (
              <div className="space-y-6">
                <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-5">
                   <h4 className="text-xs font-black text-white flex items-center gap-2 mb-2">
                     <i className="fas fa-plus-circle text-purple-400"></i>
                     إضافة إطار جديد للمتجر
                   </h4>
                   
                   <div className="flex flex-col items-center justify-center py-4 bg-black/20 rounded-3xl border border-white/5 relative overflow-hidden h-40">
                      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent"></div>
                      <div className="w-24 h-24 relative flex items-center justify-center z-10">
                        <div className="w-[70%] h-[70%] rounded-full overflow-hidden border-2 border-white/10 bg-purple-900/40">
                          <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>" className="w-full h-full object-cover opacity-30 grayscale" alt="preview" />
                        </div>
                        {frameUrl && (
                          <img src={frameUrl} className="absolute inset-0 w-full h-full object-contain animate-pulse" alt="frame preview" />
                        )}
                      </div>
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mt-3">معاينة حية للإطار</p>
                   </div>

                   <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2">اسم الإطار</label>
                        <input value={frameName} onChange={e => setFrameName(e.target.value)} placeholder="مثلاً: التاج الذهبي..." className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2">رابط صورة العرض (PNG)</label>
                        <input value={frameUrl} onChange={e => setFrameUrl(e.target.value)} placeholder="https://..." className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2">سعر الإطار</label>
                          <input type="number" value={framePrice} onChange={e => setFramePrice(e.target.value)} placeholder="5000" className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2">المدة (بالأيام)</label>
                          <input type="number" value={frameDuration} onChange={e => setFrameDuration(e.target.value)} placeholder="7" className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40" />
                        </div>
                      </div>
                   </div>

                   <button 
                     onClick={handlePublishFrame}
                     disabled={isPublishing}
                     className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all border border-white/10 flex items-center justify-center gap-3"
                   >
                     {isPublishing ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-rocket"></i><span>نشر في المتجر الآن</span></>}
                   </button>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">الإطارات الحالية ({storeFrames.length})</p>
                  <div className="grid grid-cols-2 gap-3">
                    {storeFrames.map(f => (
                      <div key={f.id} className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center gap-3 relative group">
                        <div className="w-16 h-16 relative flex items-center justify-center">
                          <div className="w-[70%] h-[70%] rounded-full bg-white/5 border border-white/10"></div>
                          <img src={f.imageUrl} className="absolute inset-0 w-full h-full object-contain" />
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-white truncate w-24">{f.name}</p>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[11px] font-bold text-yellow-500">{f.price}</span>
                            <i className="fas fa-coins text-[8px] text-yellow-500"></i>
                          </div>
                        </div>
                        <button 
                          onClick={async () => { 
                            if(confirm("حذف الإطار؟ سيتم حذفه من كافة حقائب المستخدمين أيضاً.")) {
                              try {
                                await cleanupInventoryAndUsers(f.id, 'frame', f.imageUrl);
                                await deleteDoc(doc(db, "storeFrames", f.id));
                                alert("تم الحذف بنجاح.");
                              } catch (e: any) {
                                console.error("Error deleting store frame:", e);
                                alert("حدث خطأ أثناء الحذف: " + (e.message || e));
                              }
                            } 
                          }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <i className="fas fa-trash-alt text-[10px]"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {storeSection === 'entries' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6 shadow-2xl">
                   <h4 className="text-sm font-black text-white flex items-center gap-2 mb-2">
                     <i className="fas fa-plus-circle text-purple-400"></i>
                     إضافة دخولية جديدة للمتجر
                   </h4>
                   
                   <div className="flex flex-col items-center justify-center py-4 bg-black/40 rounded-3xl border border-white/5 relative overflow-hidden h-[240px] shadow-inner">
                      {entryVideoUrl ? (
                        <div className="w-full h-full relative group">
                          <video src={entryVideoUrl} autoPlay loop playsInline className="w-full h-full object-contain" />
                        </div>
                      ) : entryPreviewImage ? (
                        <img src={entryPreviewImage} className="w-full h-full object-cover" alt="preview" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 opacity-20">
                          <i className="fas fa-film text-4xl text-white"></i>
                          <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">سيظهر الفيديو هنا عند وضع الرابط</p>
                        </div>
                      )}
                      
                      <button onClick={() => entryPreviewInputRef.current?.click()} className="absolute bottom-4 right-4 w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform z-20 border border-white/10">
                        <i className="fas fa-camera text-sm"></i>
                      </button>
                   </div>

                   <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">اسم الدخولية</label>
                        <input value={entryName} onChange={e => setEntryName(e.target.value)} placeholder="مثلاً: دخول الملك..." className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 transition-all shadow-inner" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">رابط فيديو الدخولية (MP4)</label>
                        <input value={entryVideoUrl} onChange={e => setEntryVideoUrl(e.target.value)} placeholder="ضع رابط الفيديو هنا للمعاينة..." className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-2xl text-[10px] text-white outline-none focus:border-purple-500/40 transition-all shadow-inner font-mono" />
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">سعر الدخولية</label>
                          <input type="number" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="10000" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xs text-white outline-none focus:border-purple-500/40 transition-all shadow-inner" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">المدة (بالأيام)</label>
                          <input type="number" value={entryDuration} onChange={e => setEntryDuration(e.target.value)} placeholder="7" className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 transition-all shadow-inner" />
                        </div>
                      </div>
                   </div>

                   <button onClick={handlePublishEntry} disabled={isPublishing} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-5 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all border border-white/10 flex items-center justify-center gap-3 mt-4">
                     {isPublishing ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-rocket"></i><span>نشر الدخولية الآن</span></>}
                   </button>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">الدخوليات الحالية ({storeEntries.length})</p>
                  <div className="grid grid-cols-2 gap-4">
                    {storeEntries.map(e => (
                      <div key={e.id} className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-center gap-3 relative group overflow-hidden shadow-xl">
                        <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/5 shadow-inner relative">
                          <img src={e.previewImage} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="preview" />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <i className="fas fa-play text-white opacity-40 text-2xl"></i>
                          </div>
                        </div>
                        <div className="text-center w-full">
                          <p className="text-[11px] font-black text-white truncate w-full">{e.name}</p>
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-[11px] font-bold text-yellow-500">{e.price}</span>
                            <i className="fas fa-coins text-[8px] text-yellow-500"></i>
                          </div>
                        </div>
                        <button onClick={async () => { 
                            if(confirm("حذف الدخولية؟")) {
                              try {
                                await cleanupInventoryAndUsers(e.id, 'entry', e.videoUrl);
                                await deleteDoc(doc(db, "storeEntries", e.id));
                                alert("تم الحذف بنجاح.");
                              } catch (e: any) {
                                console.error("Error deleting store entry:", e);
                                alert("حدث خطأ أثناء الحذف: " + (e.message || e));
                              }
                            } 
                          }} className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90">
                          <i className="fas fa-trash-alt text-[10px]"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {storeSection === 'backgrounds' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6 shadow-2xl">
                   <h4 className="text-sm font-black text-white flex items-center gap-2 mb-2">
                     <i className="fas fa-plus-circle text-purple-400"></i>
                     إضافة خلفية جديدة للمتجر
                   </h4>
                   
                   <div className="flex flex-col items-center justify-center py-4 bg-black/40 rounded-3xl border border-white/5 relative overflow-hidden h-[450px] shadow-inner">
                      {storeBgImage ? (
                        <img src={storeBgImage} className="w-full h-full object-cover" alt="bg preview" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 opacity-20">
                          <i className="fas fa-image text-4xl text-white"></i>
                          <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">اختر صورة الخلفية للمعاينة</p>
                        </div>
                      )}
                      
                      <button onClick={() => storeBgInputRef.current?.click()} className="absolute bottom-4 right-4 w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform z-20 border border-white/10">
                        <i className="fas fa-camera text-sm"></i>
                      </button>
                   </div>

                   <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">اسم الخلفية</label>
                        <input value={storeBgName} onChange={e => setStoreBgName(e.target.value)} placeholder="مثلاً: خلفية القمر..." className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 transition-all shadow-inner" />
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">سعر الخلفية</label>
                          <input type="number" value={storeBgPrice} onChange={e => setStoreBgPrice(e.target.value)} placeholder="20000" className="w-full bg-white/5 border border-white/10 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 transition-all shadow-inner" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-purple-400/60 uppercase mr-2 tracking-widest">المدة (بالأيام)</label>
                          <input type="number" value={storeBgDuration} onChange={e => setStoreBgDuration(e.target.value)} placeholder="7" className="w-full bg-white/5 border border-white/10 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 transition-all shadow-inner" />
                        </div>
                      </div>
                   </div>

                   <button onClick={handlePublishStoreBg} disabled={isPublishing} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 py-5 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all border border-white/10 flex items-center justify-center gap-3 mt-4">
                     {isPublishing ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-rocket"></i><span>نشر الخلفية الآن</span></>}
                   </button>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">خلفيات المتجر الحالية ({storeBackgrounds.length})</p>
                  <div className="grid grid-cols-2 gap-4">
                    {storeBackgrounds.map(bg => (
                      <div key={bg.id} className="bg-white/5 p-3 rounded-[2rem] border border-white/5 flex flex-col gap-3 relative group overflow-hidden shadow-xl">
                        <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-black/40 border border-white/5 shadow-inner">
                          <img src={bg.imageUrl} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                          <p className="text-[12px] font-black text-white truncate w-full text-center">{bg.name}</p>
                          <div className="flex items-center justify-center gap-1.5 py-0.5">
                            <span className="text-[11px] font-black text-yellow-500">{(bg.price || 0).toLocaleString('en-US')}</span>
                            <i className="fas fa-coins text-[8px] text-yellow-500"></i>
                          </div>
                        </div>
                        <button onClick={async () => { 
                            if(confirm("هل تريد حذف هذه خلفية؟")) {
                              try {
                                await cleanupInventoryAndUsers(bg.id, 'background', bg.imageUrl);
                                await deleteDoc(doc(db, "storeBackgrounds", bg.id));
                                alert("تم الحذف بنجاح.");
                              } catch (e: any) {
                                console.error("Error deleting store background:", e);
                                alert("حدث خطأ أثناء الحذف: " + (e.message || e));
                              }
                            } 
                          }} className="absolute top-2 right-2 w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90">
                          <i className="fas fa-trash-alt text-[10px]"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {adminTab === 'messages' && (
          <div className="space-y-6">
            <div className="bg-white/5 p-5 rounded-[2.5rem] border border-white/10 space-y-4 shadow-2xl">
              <h3 className="text-sm font-black text-white mb-2">إرسال رسالة رسمية جديدة</h3>
              <div className="space-y-1.5"><label className="text-[9px] font-black text-purple-400/60 uppercase mr-2">عنوان الرسالة</label><input value={msgTitle} onChange={e => setMsgTitle(e.target.value)} placeholder="مثلاً: صيانة طارئة..." className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 shadow-inner" /></div>
              <div className="space-y-1.5"><label className="text-[9px] font-black text-purple-400/60 uppercase mr-2">محتوى الرسالة</label><textarea value={msgDesc} onChange={e => setMsgDesc(e.target.value)} placeholder="اكتب التفاصيل..." className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none h-24 focus:border-purple-500/40 shadow-inner" /></div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2">رابط صورة الرسالة (اختياري)</label>
                <input 
                  type="text" 
                  value={msgImage || ''} 
                  onChange={e => setMsgImage(e.target.value || null)} 
                  placeholder="https://example.com/image.png" 
                  className="w-full bg-white/5 border border-white/10 p-3.5 rounded-2xl text-xs text-white outline-none focus:border-purple-500/40 shadow-inner" 
                />
              </div>
              {msgImage && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-purple-400/60 uppercase mr-2">معاينة الصورة</label>
                  <div className="w-full aspect-video bg-white/5 rounded-[2rem] overflow-hidden border border-white/10 flex items-center justify-center relative group">
                    <img 
                      src={msgImage} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=رابط+غير+صالح"; }} 
                    />
                    <button 
                      onClick={() => setMsgImage(null)} 
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px]"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              )}
              <button onClick={async () => {
                  if (!msgTitle || !msgDesc) return alert("يرجى ملأ العنوان والوصف");
                  await addDoc(collection(db, "officialNotifications"), { title: msgTitle, desc: msgDesc, image: msgImage || null, icon: 'fa-bullhorn', createdAt: serverTimestamp() });
                  setMsgTitle(''); setMsgDesc(''); setMsgImage(null); alert("تم الإرسال");
                }} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all mt-4 border border-white/10">بث الرسالة الآن</button>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">الرسائل النشطة حالياً ({allOfficialMsgs.length})</p>
              {allOfficialMsgs.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <i className="fas fa-bullhorn text-4xl mb-2"></i>
                  <p className="text-xs font-bold">لا توجد رسائل مرسلة حالياً</p>
                </div>
              ) : allOfficialMsgs.map(msg => (
                <div key={msg.id} className="bg-white/5 p-4 rounded-3xl border border-white/10 space-y-3 relative group animate-in fade-in transition-all overflow-hidden shadow-lg">
                  {msg.image && (
                    <div className="w-full h-32 rounded-2xl overflow-hidden mb-2">
                       <img src={msg.image} className="w-full h-full object-cover" alt="notification" />
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-white mb-1 line-clamp-1">{msg.title}</h4>
                      <p className="text-[10px] text-white/50 font-bold whitespace-pre-wrap line-clamp-2">{msg.desc}</p>
                    </div>
                    <button 
                      onClick={async () => {
                        if(confirm("هل تريد حقاً حذف هذه الرسالة من صندوق البريد لجميع التابعين؟")) {
                          await deleteDoc(doc(db, "officialNotifications", msg.id));
                        }
                      }}
                      className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 border border-red-600/30 flex items-center justify-center active:scale-90 transition-all ml-2"
                    >
                      <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                    <i className="far fa-clock text-[8px] text-white/20"></i>
                    <span className="text-[8px] font-bold text-white/20">
                      {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString('ar-EG-u-nu-latn', { numberingSystem: 'latn' }) : 'جاري التحميل...'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'news' && (
          <div className="space-y-6">
            <div className="bg-white/5 p-4 rounded-2xl space-y-3">
              <input value={newsTitle} onChange={e => setNewsTitle(e.target.value)} placeholder="العنوان" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white outline-none" />
              <textarea value={newsDesc} onChange={e => setNewsDesc(e.target.value)} placeholder="الوصف" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-white outline-none h-20" />
              <button onClick={() => newsInputRef.current?.click()} className="w-full bg-white/10 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 text-white">{newsImage ? <i className="fas fa-check text-green-500"></i> : <i className="fas fa-image"></i>} اختر صورة</button>
              <button onClick={async () => {
                if (!newsTitle || !newsImage) return alert("أكمل البيانات");
                await addDoc(collection(db, "news"), { title: newsTitle, desc: newsDesc, image: newsImage, createdAt: serverTimestamp() });
                setNewsTitle(''); setNewsDesc(''); setNewsImage(null); alert("تم الإضافة");
              }} className="w-full bg-purple-600 py-3 rounded-xl text-xs font-black shadow-lg text-white">إضافة الخبر</button>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">الأخبار الحالية ({allNews.length})</p>
              <div className="grid grid-cols-1 gap-4">
                {allNews.map(item => (
                  <div key={item.id} className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/5 group shadow-xl flex gap-4 p-4 text-right">
                    {item.image && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/40 flex-shrink-0">
                        <img src={item.image} className="w-full h-full object-cover" alt={item.title} />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-start min-w-0">
                      <h4 className="text-xs font-black text-white truncate">{item.title}</h4>
                      {item.desc && <p className="text-[10px] font-bold text-white/60 mt-1 line-clamp-2 leading-relaxed">{item.desc}</p>}
                      <span className="text-[8px] font-bold text-white/30 mt-auto pt-2 block">
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString('ar-EG-u-nu-latn', { numberingSystem: 'latn' }) : 'جاري التحميل...'}
                      </span>
                    </div>
                    <button 
                      onClick={async () => { 
                        if(confirm("هل أنت متأكد من حذف هذا الخبر؟")) {
                          try {
                            await deleteDoc(doc(db, "news", item.id));
                            alert("تم الحذف بنجاح.");
                          } catch (e: any) {
                            console.error("Error deleting news:", e);
                            alert("حدث خطأ أثناء حذف الخبر: " + (e.message || e));
                          }
                        }
                      }} 
                      className="absolute top-4 left-4 w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center lg:opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90"
                    >
                      <i className="fas fa-trash-alt text-[10px]"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'banners' && (
          <div className="space-y-8 animate-fade-in pb-10">
            {/* Row 1: البنرات العلوية */}
            <div className="bg-[#180e2d]/60 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">البنرات العلوية (البنر 1)</p>
                <p className="text-[9px] font-bold text-white/40">تظهر في أعلى الصفحة الرئيسية للتطبيق.</p>
              </div>

              <div className="space-y-3">
                <input 
                  value={bannerTitle || ""} 
                  onChange={e => setBannerTitle(e.target.value)} 
                  placeholder="عنوان البنر العلوي (اختياري)" 
                  className="w-full bg-[#100623] border border-white/10 p-3.5 rounded-xl text-xs text-white outline-none focus:border-purple-500/50 transition-all font-bold" 
                />
                
                <button 
                  type="button"
                  onClick={() => bannerInputRef.current?.click()} 
                  className="w-full aspect-[21/9] bg-white/5 hover:bg-white/10 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-purple-500/30 overflow-hidden group transition-all"
                >
                  {bannerImage ? (
                    <img src={bannerImage} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <i className="fas fa-plus text-xl opacity-30 text-white group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] text-white/40 font-bold">رفع صورة البنر العلوي</span>
                    </div>
                  )}
                </button>

                <input 
                  type="text"
                  value={bannerImage || ''} 
                  onChange={e => setBannerImage(e.target.value || null)} 
                  placeholder="أو ضع رابط الصورة المباشر هنا..." 
                  className="w-full bg-[#100623] border border-white/10 p-3 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left" 
                  dir="ltr"
                />

                <button 
                  onClick={async () => {
                    if (!bannerImage) return alert("الرجاء اختيار صورة أو وضع رابط مباشر أولاً");
                    await addDoc(collection(db, "banners"), { title: bannerTitle, imageUrl: bannerImage, createdAt: serverTimestamp() });
                    setBannerTitle(''); 
                    setBannerImage(null); 
                    alert("تم إضافة البنر العلوي بنجاح!");
                  }} 
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 rounded-xl text-xs font-black shadow-lg text-white hover:opacity-95 active:scale-[0.98] transition-all border border-white/10"
                >
                  إضافة البنر العلوي
                </button>
              </div>

              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">البنرات العلوية الحالية ({allBanners.length})</p>
                {allBanners.length === 0 ? (
                  <div className="py-6 text-center text-white/20 text-[10px] font-bold border border-dashed border-white/5 rounded-xl">لا توجد بنرات علوية حالياً</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {allBanners.map(banner => (
                      <div key={banner.id} className="relative aspect-[21/9] rounded-xl overflow-hidden bg-white/5 border border-white/5 group shadow-lg">
                        <img src={banner.imageUrl} className="w-full h-full object-cover" />
                        {banner.title && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                            <p className="text-[9px] font-black text-white truncate">{banner.title}</p>
                          </div>
                        )}
                        <button 
                          onClick={async () => { 
                            if (confirm("هل تريد حذف هذا البنر بالتأكيد؟")) {
                              try {
                                await deleteDoc(doc(db, "banners", banner.id));
                                alert("تم الحذف بنجاح.");
                              } catch (e: any) {
                                console.error("Error deleting banner:", e);
                                alert("حدث خطأ أثناء الحذف: " + (e.message || e));
                              }
                            }
                          }} 
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90"
                        >
                          <i className="fas fa-trash-alt text-[9px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: البنرات السفلية */}
            <div className="bg-[#180e2d]/60 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">البنرات السفلية (البنر 2)</p>
                <p className="text-[9px] font-bold text-white/40">تظهر أسفل الغرف الأربعة المثبتة في الصفحة الرئيسية ويتم تقليل ارتفاعها.</p>
              </div>

              <div className="space-y-3">
                <input 
                  value={bannerTitle2 || ""} 
                  onChange={e => setBannerTitle2(e.target.value)} 
                  placeholder="عنوان البنر السفلي (اختياري)" 
                  className="w-full bg-[#100623] border border-white/10 p-3.5 rounded-xl text-xs text-white outline-none focus:border-pink-500/50 transition-all font-bold" 
                />
                
                <button 
                  type="button"
                  onClick={() => bannerInputRef2.current?.click()} 
                  className="w-full aspect-[792/236] bg-white/5 hover:bg-white/10 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-pink-500/30 overflow-hidden group transition-all"
                >
                  {bannerImage2 ? (
                    <img src={bannerImage2} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <i className="fas fa-plus text-lg opacity-30 text-white group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] text-white/40 font-bold">رفع صورة البنر السفلي</span>
                    </div>
                  )}
                </button>

                <input 
                  type="text"
                  value={bannerImage2 || ''} 
                  onChange={e => setBannerImage2(e.target.value || null)} 
                  placeholder="أو ضع رابط الصورة المباشر هنا..." 
                  className="w-full bg-[#100623] border border-white/10 p-3 rounded-xl text-[10px] text-white outline-none focus:border-pink-500/50 transition-all font-bold placeholder:text-white/20 text-left" 
                  dir="ltr"
                />

                <button 
                  onClick={async () => {
                    if (!bannerImage2) return alert("الرجاء اختيار صورة أو وضع رابط مباشر أولاً");
                    await addDoc(collection(db, "banners2"), { title: bannerTitle2, imageUrl: bannerImage2, createdAt: serverTimestamp() });
                    setBannerTitle2(''); 
                    setBannerImage2(null); 
                    alert("تم إضافة البنر السفلي بنجاح!");
                  }} 
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 py-3.5 rounded-xl text-xs font-black shadow-lg text-white hover:opacity-95 active:scale-[0.98] transition-all border border-white/10"
                >
                  إضافة البنر السفلي
                </button>
              </div>

              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest px-1">البنرات السفلية الحالية ({allBanners2.length})</p>
                {allBanners2.length === 0 ? (
                  <div className="py-6 text-center text-white/20 text-[10px] font-bold border border-dashed border-white/5 rounded-xl">لا توجد بنرات سفلية حالياً</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {allBanners2.map(banner => (
                      <div key={banner.id} className="relative aspect-[792/236] rounded-xl overflow-hidden bg-white/5 border border-white/5 group shadow-lg">
                        <img src={banner.imageUrl} className="w-full h-full object-cover" />
                        {banner.title && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-2.5 flex flex-col justify-end">
                            <p className="text-[8.5px] font-black text-white truncate">{banner.title}</p>
                          </div>
                        )}
                        <button 
                          onClick={async () => { 
                            if (confirm("هل تريد حذف هذا البنر بالتأكيد؟")) {
                              try {
                                await deleteDoc(doc(db, "banners2", banner.id));
                                alert("تم الحذف بنجاح.");
                              } catch (e: any) {
                                console.error("Error deleting banner2:", e);
                                alert("حدث خطأ أثناء الحذف: " + (e.message || e));
                              }
                            }
                          }} 
                          className="absolute top-1 right-1 w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90"
                        >
                          <i className="fas fa-trash-alt text-[8px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'secretClubBanners' && (
          <div className="space-y-8 animate-fade-in pb-10">
            {/* Row 1: البنرات العلوية للنادي السري */}
            <div className="bg-[#180e2d]/60 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                    {t("البنرات العلوية للنادي السري (البنر 1)", "Secret Club Upper Banners (Banner 1)")}
                  </p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 font-bold">
                    {t("النادي السري", "Secret Club")}
                  </span>
                </div>
                <p className="text-[9px] font-bold text-white/40">
                  {t("تظهر في أعلى صفحة النادي السري بدلاً من بنرات الصفحة الرئيسية.", "Displays at the top of the Secret Club instead of home page banners.")}
                </p>
              </div>

              <div className="space-y-3">
                <input 
                  value={secretClubBannerTitle || ""} 
                  onChange={e => setSecretClubBannerTitle(e.target.value)} 
                  placeholder={t("عنوان البنر العلوي للنادي (اختياري)", "Club upper banner title (optional)")}
                  className="w-full bg-[#100623] border border-white/10 p-3.5 rounded-xl text-xs text-white outline-none focus:border-purple-500/50 transition-all font-bold" 
                />
                
                <button 
                  type="button"
                  onClick={() => secretClubBannerInputRef.current?.click()} 
                  className="w-full aspect-[21/9] bg-white/5 hover:bg-white/10 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-purple-500/30 overflow-hidden group transition-all"
                >
                  {secretClubBannerImage ? (
                    <img src={secretClubBannerImage} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <i className="fas fa-plus text-xl opacity-30 text-white group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] text-white/40 font-bold">{t("رفع صورة البنر العلوي للنادي", "Upload club upper banner image")}</span>
                    </div>
                  )}
                </button>

                <input 
                  type="text"
                  value={secretClubBannerImage || ''} 
                  onChange={e => setSecretClubBannerImage(e.target.value || null)} 
                  placeholder={t("أو ضع رابط الصورة المباشر هنا...", "Or paste direct image URL here...")}
                  className="w-full bg-[#100623] border border-white/10 p-3 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left" 
                  dir="ltr"
                />

                <button 
                  onClick={async () => {
                    if (!secretClubBannerImage) return alert(t("الرجاء اختيار صورة أو وضع رابط مباشر أولاً", "Please choose an image or enter a direct URL first"));
                    await addDoc(collection(db, "secretClubBanners"), { title: secretClubBannerTitle, imageUrl: secretClubBannerImage, createdAt: serverTimestamp() });
                    setSecretClubBannerTitle(''); 
                    setSecretClubBannerImage(null); 
                    alert(t("تم إضافة البنر العلوي للنادي بنجاح!", "Club upper banner added successfully!"));
                  }} 
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 rounded-xl text-xs font-black shadow-lg text-white hover:opacity-95 active:scale-[0.98] transition-all border border-white/10"
                >
                  {t("إضافة البنر العلوي للنادي", "Add Club Upper Banner")}
                </button>
              </div>

              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">
                  {t("بنرات النادي العلوية الحالية", "Current Club Upper Banners")} ({allSecretClubBanners.length})
                </p>
                {allSecretClubBanners.length === 0 ? (
                  <div className="py-6 text-center text-white/20 text-[10px] font-bold border border-dashed border-white/5 rounded-xl">
                    {t("لا توجد بنرات علوية للنادي حالياً", "No upper club banners currently")}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {allSecretClubBanners.map(banner => (
                      <div key={banner.id} className="relative aspect-[21/9] rounded-xl overflow-hidden bg-white/5 border border-white/5 group shadow-lg">
                        <img src={banner.imageUrl} className="w-full h-full object-cover" />
                        {banner.title && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                            <p className="text-[9px] font-black text-white truncate">{banner.title}</p>
                          </div>
                        )}
                        <button 
                          onClick={async () => { 
                            if (confirm(t("هل تريد حذف هذا البنر بالتأكيد؟", "Are you sure you want to delete this banner?"))) {
                              try {
                                await deleteDoc(doc(db, "secretClubBanners", banner.id));
                                alert(t("تم الحذف بنجاح.", "Deleted successfully."));
                              } catch (e: any) {
                                console.error("Error deleting secret club banner:", e);
                                alert(t("حدث خطأ أثناء الحذف: ", "Error deleting: ") + (e.message || e));
                              }
                            }
                          }} 
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90"
                        >
                          <i className="fas fa-trash-alt text-[9px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: البنرات السفلية للنادي السري */}
            <div className="bg-[#180e2d]/60 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">
                    {t("البنرات السفلية للنادي السري (البنر 2)", "Secret Club Lower Banners (Banner 2)")}
                  </p>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-pink-600/20 border border-pink-500/30 text-pink-300 font-bold">
                    {t("النادي السري", "Secret Club")}
                  </span>
                </div>
                <p className="text-[9px] font-bold text-white/40">
                  {t("تظهر في منتصف صفحة النادي السري بنفس مقاسات وتنسيق البنرات السفلية.", "Displays in the middle of Secret Club with exact same dimensions.")}
                </p>
              </div>

              <div className="space-y-3">
                <input 
                  value={secretClubBannerTitle2 || ""} 
                  onChange={e => setSecretClubBannerTitle2(e.target.value)} 
                  placeholder={t("عنوان البنر السفلي للنادي (اختياري)", "Club lower banner title (optional)")}
                  className="w-full bg-[#100623] border border-white/10 p-3.5 rounded-xl text-xs text-white outline-none focus:border-pink-500/50 transition-all font-bold" 
                />
                
                <button 
                  type="button"
                  onClick={() => secretClubBannerInputRef2.current?.click()} 
                  className="w-full aspect-[792/236] bg-white/5 hover:bg-white/10 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-pink-500/30 overflow-hidden group transition-all"
                >
                  {secretClubBannerImage2 ? (
                    <img src={secretClubBannerImage2} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <i className="fas fa-plus text-lg opacity-30 text-white group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] text-white/40 font-bold">{t("رفع صورة البنر السفلي للنادي", "Upload club lower banner image")}</span>
                    </div>
                  )}
                </button>

                <input 
                  type="text"
                  value={secretClubBannerImage2 || ''} 
                  onChange={e => setSecretClubBannerImage2(e.target.value || null)} 
                  placeholder={t("أو ضع رابط الصورة المباشر هنا...", "Or paste direct image URL here...")}
                  className="w-full bg-[#100623] border border-white/10 p-3 rounded-xl text-[10px] text-white outline-none focus:border-pink-500/50 transition-all font-bold placeholder:text-white/20 text-left" 
                  dir="ltr"
                />

                <button 
                  onClick={async () => {
                    if (!secretClubBannerImage2) return alert(t("الرجاء اختيار صورة أو وضع رابط مباشر أولاً", "Please choose an image or enter a direct URL first"));
                    await addDoc(collection(db, "secretClubBanners2"), { title: secretClubBannerTitle2, imageUrl: secretClubBannerImage2, createdAt: serverTimestamp() });
                    setSecretClubBannerTitle2(''); 
                    setSecretClubBannerImage2(null); 
                    alert(t("تم إضافة البنر السفلي للنادي بنجاح!", "Club lower banner added successfully!"));
                  }} 
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 py-3.5 rounded-xl text-xs font-black shadow-lg text-white hover:opacity-95 active:scale-[0.98] transition-all border border-white/10"
                >
                  {t("إضافة البنر السفلي للنادي", "Add Club Lower Banner")}
                </button>
              </div>

              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest px-1">
                  {t("بنرات النادي السفلية الحالية", "Current Club Lower Banners")} ({allSecretClubBanners2.length})
                </p>
                {allSecretClubBanners2.length === 0 ? (
                  <div className="py-6 text-center text-white/20 text-[10px] font-bold border border-dashed border-white/5 rounded-xl">
                    {t("لا توجد بنرات سفلية للنادي حالياً", "No lower club banners currently")}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {allSecretClubBanners2.map(banner => (
                      <div key={banner.id} className="relative aspect-[792/236] rounded-xl overflow-hidden bg-white/5 border border-white/5 group shadow-lg">
                        <img src={banner.imageUrl} className="w-full h-full object-cover" />
                        {banner.title && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-2.5 flex flex-col justify-end">
                            <p className="text-[8.5px] font-black text-white truncate">{banner.title}</p>
                          </div>
                        )}
                        <button 
                          onClick={async () => { 
                            if (confirm(t("هل تريد حذف هذا البنر بالتأكيد؟", "Are you sure you want to delete this banner?"))) {
                              try {
                                await deleteDoc(doc(db, "secretClubBanners2", banner.id));
                                alert(t("تم الحذف بنجاح.", "Deleted successfully."));
                              } catch (e: any) {
                                console.error("Error deleting secret club banner2:", e);
                                alert(t("حدث خطأ أثناء الحذف: ", "Error deleting: ") + (e.message || e));
                              }
                            }
                          }} 
                          className="absolute top-1 right-1 w-5 h-5 rounded-md bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-90"
                        >
                          <i className="fas fa-trash-alt text-[8px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'secretClubBg' && (
          <div className="space-y-6 animate-fade-in pb-10">
            {/* Header info */}
            <div className="bg-[#180e2d]/60 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 space-y-3 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <i className="fas fa-image text-purple-400"></i>
                  {t("إدارة خلفية النادي السري", "Manage Secret Club Background")}
                </h3>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 font-bold">
                  {t("خلفية ثابتة / متحركة", "Static / Animated")}
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed font-bold">
                {t(
                  "هنا يمكنك تعيين خلفية مخصصة لصفحة النادي السري (صورة ثابتة، صورة GIF متحركة، أو فيديو MP4/WebM) لتحل مكان اللون الثابت. يتم تطبيق طبقة سوداء بنسبة خفيفة تلقائياً فوق الخلفية لإظهار الأيقونات والنصوص بوضوح كامل مثل خلفيات الغرف.",
                  "Here you can set a custom background for the Secret Club page (static image, animated GIF, or MP4/WebM video) to replace the solid color. A subtle dark overlay is automatically applied so that icons and text remain crisp and visible, just like room backgrounds."
                )}
              </p>
            </div>

            {/* Input and Controls Card */}
            <div className="bg-[#180e2d]/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl max-w-xl mx-auto">
              {/* File upload button */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                  {t("رفع خلفية من الجهاز (صورة / GIF / فيديو)", "Upload background from device (Image / GIF / Video)")}
                </label>
                <button 
                  type="button"
                  onClick={() => secretClubBgInputRef.current?.click()} 
                  className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center gap-3 border-2 border-dashed border-white/10 hover:border-purple-500/30 group transition-all"
                >
                  <i className="fas fa-cloud-upload-alt text-lg text-purple-400 group-hover:scale-110 transition-transform"></i>
                  <span className="text-xs font-bold text-white/70 group-hover:text-white">
                    {t("اضغط لاختيار ملف من جهازك", "Click to select a file from your device")}
                  </span>
                </button>
              </div>

              {/* Direct URL input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                  {t("أو أدخل رابط الخلفية المباشر (URL)", "Or enter direct background URL")}
                </label>
                <input 
                  type="text" 
                  value={secretClubBg || ''} 
                  onChange={(e) => setSecretClubBg(e.target.value)} 
                  placeholder="https://example.com/club-bg.gif (أو .mp4 أو .png)" 
                  className="w-full bg-[#100623] border border-white/10 p-3.5 rounded-xl text-xs text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left" 
                  dir="ltr"
                />
              </div>

              {/* Live Preview Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                    {t("معاينة الخلفية مع طبقة الشفافية السوداء", "Background preview with dark overlay")}
                  </label>
                  {secretClubBg && (
                    <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                      <i className="fas fa-check-circle text-[9px]"></i>
                      {isVideoUrl(secretClubBg) ? t("فيديو متحرك", "Animated Video") : (secretClubBg.includes('.gif') ? t("صورة متحركة GIF", "Animated GIF") : t("صورة ثابتة", "Static Image"))}
                    </span>
                  )}
                </div>

                <div className="w-full h-56 rounded-2xl overflow-hidden relative border border-white/10 bg-black/50 shadow-inner flex items-center justify-center">
                  {secretClubBg ? (
                    <>
                      {isVideoUrl(secretClubBg) ? (
                        <video 
                          src={secretClubBg} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <img 
                          src={secretClubBg} 
                          className="w-full h-full object-cover" 
                          alt="Secret Club Background Preview" 
                        />
                      )}
                      {/* Exact live overlay */}
                      <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center p-4 text-center">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-2 shadow-lg">
                          <i className="fas fa-user-secret text-sm"></i>
                        </div>
                        <p className="text-xs font-black text-white drop-shadow">
                          {t("هكذا ستظهر الأيقونات بوضوح تام", "Icons will appear clearly like this")}
                        </p>
                        <p className="text-[10px] text-purple-300 font-bold mt-1">
                          {t("النادي السري", "Secret Club")} VIP
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white/20">
                      <i className="fas fa-image text-3xl"></i>
                      <p className="text-[11px] font-bold">
                        {t("لا توجد خلفية مخصصة (يتم استخدام اللون الافتراضي)", "No custom background (default solid color is used)")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button 
                  disabled={isSavingSecretClubBg}
                  onClick={async () => {
                    setIsSavingSecretClubBg(true);
                    try {
                      await setDoc(doc(db, "settings", "design"), {
                        secretClubBg: secretClubBg.trim()
                      }, { merge: true });
                      alert(t("تم حفظ خلفية النادي السري بنجاح وتطبيقها فوراً!", "Secret Club background saved successfully!"));
                    } catch (e: any) {
                      console.error("Error saving secret club bg:", e);
                      alert(t("حدث خطأ أثناء الحفظ: ", "Error saving: ") + (e.message || e));
                    } finally {
                      setIsSavingSecretClubBg(false);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 py-3.5 rounded-xl text-xs font-black text-white shadow-xl hover:opacity-95 active:scale-[0.98] transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  {isSavingSecretClubBg ? (
                    <i className="fas fa-spinner animate-spin"></i>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      <span>{t("حفظ خلفية النادي", "Save Club Background")}</span>
                    </>
                  )}
                </button>

                {secretClubBg && (
                  <button 
                    disabled={isSavingSecretClubBg}
                    onClick={async () => {
                      if (confirm(t("هل تريد إزالة خلفية النادي والعودة للون الافتراضي؟", "Do you want to remove club background and revert to default?"))) {
                        setIsSavingSecretClubBg(true);
                        try {
                          await setDoc(doc(db, "settings", "design"), {
                            secretClubBg: ""
                          }, { merge: true });
                          setSecretClubBg('');
                          alert(t("تمت إزالة خلفية النادي والعودة للون الافتراضي بنجاح.", "Club background removed successfully."));
                        } catch (e: any) {
                          console.error("Error clearing secret club bg:", e);
                          alert(t("حدث خطأ: ", "Error: ") + (e.message || e));
                        } finally {
                          setIsSavingSecretClubBg(false);
                        }
                      }
                    }}
                    className="w-full py-3 rounded-xl text-[11px] font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 active:scale-[0.98] transition-all"
                  >
                    {t("حذف الخلفية واستعادة اللون الافتراضي", "Delete background & restore default")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {adminTab === 'bgs' && (
          <div className="space-y-8">
            <div className="bg-white/5 p-4 rounded-2xl space-y-3 border border-white/5 shadow-xl">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">إضافة خلفية غرفة مجانية</p>
              <button onClick={() => roomBgInputRef.current?.click()} className="w-full aspect-[9/16] bg-white/5 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/10 overflow-hidden group">{roomBgImage ? <img src={roomBgImage} className="w-full h-full object-cover" /> : <i className="fas fa-plus text-2xl opacity-20 text-white group-hover:opacity-40 transition-opacity"></i>}</button>
              <button onClick={async () => {
                if (!roomBgImage) return alert("اختر صورة");
                await addDoc(collection(db, "roomBackgrounds"), { imageUrl: roomBgImage, createdAt: serverTimestamp() });
                setRoomBgImage(null); alert("تم الإضافة");
              }} className="w-full bg-purple-600 py-3 rounded-xl text-xs font-black text-white shadow-lg active:scale-95 transition-transform">إضافة الخلفية للغرف</button>
            </div>
            <div className="space-y-4">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">الخلفيات المجانية الحالية ({allRoomBgs.length})</p>
              <div className="grid grid-cols-3 gap-2">{allRoomBgs.map(bg => (
                  <div key={bg.id} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-white/5 border border-white/5 group shadow-lg">{isVideoUrl(bg.imageUrl) ? <video src={bg.imageUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" /> : <img src={bg.imageUrl} className="w-full h-full object-cover" />}<button onClick={async () => { 
                    if(confirm("حذف؟")) {
                      try {
                        await deleteDoc(doc(db, "roomBackgrounds", bg.id));
                        alert("تم الحذف بنجاح.");
                      } catch (e: any) {
                        console.error("Error deleting room background:", e);
                        alert("حدث خطأ أثناء حذف الخلفية: " + (e.message || e));
                      }
                    }
                  }} className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm shadow-lg active:scale-90"><i className="fas fa-trash-alt text-[10px]"></i></button></div>
                ))}</div>
            </div>
          </div>
        )}

        {adminTab === 'mainImages' && (
          <div className="space-y-8 animate-in fade-in pb-10">
            {/* Section 1: Default User Profile & Cover Images */}
            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6 shadow-2xl">
              <h4 className="text-sm font-black text-white flex items-center gap-2 mb-2">
                <i className="fas fa-user-circle text-purple-400"></i>
                إعداد الصور الافتراضية للمستخدمين
              </h4>
              <p className="text-[10px] text-white/40 font-bold -mt-2 pr-2">
                هذه الصور ستوضع تلقائياً لأي مستخدم جديد لا يقوم باختيار صور خاصة به
              </p>

              <div className="grid grid-cols-1 gap-6">
                {/* Default Profile Image */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">الصورة الشخصية الافتراضية</label>
                  <div className="flex flex-col items-center gap-4">
                    <button onClick={() => profileImageInputRef.current?.click()} className="w-24 h-24 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden bg-black/20 group hover:border-purple-500/40 transition-all">
                      {defaultProfileImage ? <img src={defaultProfileImage} className="w-full h-full object-cover" /> : <i className="fas fa-plus text-white/20"></i>}
                    </button>
                    <input 
                      type="text" 
                      value={defaultProfileImage || ''} 
                      onChange={e => setDefaultProfileImage(e.target.value)} 
                      placeholder="رابط الصورة الشخصية..." 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-[10px] text-white outline-none font-mono" 
                    />
                  </div>
                </div>

                {/* Default Cover Image */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">صورة الغلاف الافتراضية</label>
                  <div className="flex flex-col items-center gap-4">
                    <button onClick={() => coverImageInputRef.current?.click()} className="w-full h-32 rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden bg-black/20 group hover:border-purple-500/40 transition-all">
                      {defaultCoverImage ? <img src={defaultCoverImage} className="w-full h-full object-cover" /> : <i className="fas fa-plus text-white/20"></i>}
                    </button>
                    <input 
                      type="text" 
                      value={defaultCoverImage || ''} 
                      onChange={e => setDefaultCoverImage(e.target.value)} 
                      placeholder="رابط صورة الغلاف..." 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-[10px] text-white outline-none font-mono" 
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveDefaultImages} 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-transform border border-white/10 flex items-center justify-center gap-2"
              >
                <i className="fas fa-user-shield"></i>
                حفظ الصور الافتراضية فقط
              </button>
            </div>

            {/* Section 2: Login Page Theme, Logo and Wallpaper Design */}
            <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6 shadow-2xl">
              <h4 className="text-sm font-black text-white flex items-center gap-2 mb-2">
                <i className="fas fa-magic text-cyan-400"></i>
                مظهر وشعار صفحة تسجيل الدخول
              </h4>
              <p className="text-[10px] text-white/40 font-bold -mt-2 pr-2">
                هذه الإعدادات تتحكم بالشعار و الخلفية (صورة أو فيديو MP4 متحرك) لصفحة تسجيل الدخول للتطبيق
              </p>

              <div className="grid grid-cols-1 gap-6">
                {/* Login Logo Image */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mr-2">شعار صفحة تسجيل الدخول (فوق اسم البرنامج)</label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center overflow-hidden bg-[#1a0b2e] shadow-xl p-0">
                      {loginLogoImage ? (
                        <img src={loginLogoImage} className="w-full h-full object-cover" alt="Login Logo" />
                      ) : (
                        <i className="fas fa-gamepad text-2xl text-white"></i>
                      )}
                    </div>
                    <input 
                      type="text" 
                      value={loginLogoImage || ''} 
                      onChange={e => setLoginLogoImage(e.target.value)} 
                      placeholder="رابط شعار صفحة تسجيل الدخول (مثال: PNG)..." 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-[10px] text-white outline-none font-mono" 
                    />
                  </div>
                </div>

                {/* Login Background Image/Video */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mr-2">خلفية صفحة تسجيل الدخول (صورة أو فيديو MP4 متحرك)</label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-full h-32 rounded-3xl border border-white/10 flex items-center justify-center overflow-hidden bg-[#1a0b2e] relative shadow-inner">
                      {loginBgImage ? (
                        isVideoUrl(loginBgImage) ? (
                          <video src={loginBgImage} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : (
                          <img src={loginBgImage} className="w-full h-full object-cover" alt="Login Background" />
                        )
                      ) : (
                        <span className="text-[10px] text-white/20 font-bold">الخلفية الافتراضية للتطبيق</span>
                      )}
                    </div>
                    <input 
                      type="text" 
                      value={loginBgImage || ''} 
                      onChange={e => setLoginBgImage(e.target.value)} 
                      placeholder="رابط خلفية صفحة تسجيل الدخول (صورة أو فيديو MP4)..." 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-[10px] text-white outline-none font-mono" 
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSaveLoginSettings} 
                className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-transform border border-white/10 flex items-center justify-center gap-2"
              >
                <i className="fas fa-paint-brush"></i>
                حفظ مظهر وتسجيل الدخول فقط
              </button>
            </div>
          </div>
        )}

        {adminTab === 'design' && (
          <div className="space-y-6">
            <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center"><p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">تخصيص أيقونات الميكروفونات والكروت</p></div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2"><label className="text-[9px] font-bold text-white/40 mr-2 uppercase tracking-tighter">أيقونة المايك المفتوح</label><button onClick={() => micOpenInputRef.current?.click()} className="w-full h-16 bg-black/40 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center overflow-hidden transition-all hover:bg-black/60">{micOpenIcon ? <img src={micOpenIcon} className="h-10 w-10 object-contain" /> : <i className="fas fa-plus text-white/20"></i>}</button></div>
                <div className="space-y-2"><label className="text-[9px] font-bold text-white/40 mr-2 uppercase tracking-tighter">أيقونة المايك المغلق (Lock)</label><button onClick={() => micLockedInputRef.current?.click()} className="w-full h-16 bg-black/40 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center overflow-hidden transition-all hover:bg-black/60">{micLockedIcon ? <img src={micLockedIcon} className="h-10 w-10 object-contain" /> : <i className="fas fa-plus text-white/20"></i>}</button></div>
                
                {/* Wave Room Feature */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">Wave room (أيقونة الموجات الصوتية)</label>
                  <div className="space-y-3">
                    <button onClick={() => waveRoomInputRef.current?.click()} className="w-full h-16 bg-black/40 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center overflow-hidden transition-all hover:bg-black/60">
                      {waveRoomIcon ? <img src={waveRoomIcon} className="h-full object-contain" alt="wave" /> : <div className="flex flex-col items-center opacity-20"><i className="fas fa-wave-square mb-1"></i><span className="text-[8px] font-black uppercase">اختر الأيقونة</span></div>}
                    </button>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-white/20 ml-2 uppercase">أو ضع رابط الموجات هنا</label>
                      <input 
                        type="text" 
                        value={waveRoomIcon || ''} 
                        onChange={e => setWaveRoomIcon(e.target.value)} 
                        placeholder="https://..." 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Gift Button Customization */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">أيقونة زر الهدايا</label>
                  <div className="space-y-3">
                    <button onClick={() => giftButtonInputRef.current?.click()} className="w-full h-16 bg-black/40 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center overflow-hidden transition-all hover:bg-black/60">
                      {giftButtonIcon ? <img src={giftButtonIcon} className="h-10 w-10 object-contain" alt="gift" /> : <div className="flex flex-col items-center opacity-20"><i className="fas fa-gift mb-1 text-xl"></i><span className="text-[8px] font-black uppercase">اختر الأيقونة</span></div>}
                    </button>
                    <input 
                      type="file" 
                      ref={giftButtonInputRef} 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageSelect(e, setGiftButtonIcon)} 
                    />
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-white/20 ml-2 uppercase">أو ضع رابط الأيقونة هنا</label>
                      <input 
                        type="text" 
                        value={giftButtonIcon || ''} 
                        onChange={e => setGiftButtonIcon(e.target.value)} 
                        placeholder="https://..." 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Games Button Customization */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">{t("أيقونة زر الألعاب (ذراع البلايستيشن)", "Games Button Icon (Gamepad)")}</label>
                  <div className="space-y-3">
                    <button onClick={() => gamesButtonInputRef.current?.click()} className="w-full h-16 bg-black/40 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center overflow-hidden transition-all hover:bg-black/60">
                      {gamesButtonIcon ? <img src={gamesButtonIcon} className="h-10 w-10 object-contain" alt="games" /> : <div className="flex flex-col items-center opacity-20"><i className="fas fa-gamepad mb-1 text-xl"></i><span className="text-[8px] font-black uppercase">اختر الأيقونة</span></div>}
                    </button>
                    <input 
                      type="file" 
                      ref={gamesButtonInputRef} 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageSelect(e, setGamesButtonIcon)} 
                    />
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-white/20 ml-2 uppercase">أو ضع رابط الأيقونة هنا</label>
                      <input 
                        type="text" 
                        value={gamesButtonIcon || ''} 
                        onChange={e => setGamesButtonIcon(e.target.value)} 
                        placeholder="https://..." 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

              </div>
              <button onClick={saveDesignSettings} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-transform border border-white/10">حفظ التغييرات</button>
            </div>
          </div>
        )}

        {adminTab === 'roomFrames' && (
          <div className="space-y-6">
            <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">إطارات الغرف المميزة (Top Rooms)</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 mr-2 uppercase tracking-tighter">إطار الغرفة الأولى (اليمين - Top 1)</label>
                  <input 
                    type="text" 
                    value={roomFrameTop1} 
                    onChange={e => setRoomFrameTop1(e.target.value)} 
                    placeholder="https://... (رابط صورة الإطار)" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none font-mono"
                  />
                  {roomFrameTop1 && (
                    <div className="mt-2 text-center text-[9px] text-white/40 flex items-center gap-2 justify-center">
                      <span>معاينة:</span>
                      <div className="relative w-28 h-16 bg-black/40 rounded border border-white/10 overflow-hidden flex items-center justify-center">
                        <img src={roomFrameTop1} className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10" alt="Preview Frame 1" />
                        <span className="text-[8px] text-white/20">كارت الغرفة</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 mr-2 uppercase tracking-tighter">إطار الغرفة الثانية (اليسار - Top 2)</label>
                  <input 
                    type="text" 
                    value={roomFrameTop2} 
                    onChange={e => setRoomFrameTop2(e.target.value)} 
                    placeholder="https://... (رابط صورة الإطار)" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none font-mono"
                  />
                  {roomFrameTop2 && (
                    <div className="mt-2 text-center text-[9px] text-white/40 flex items-center gap-2 justify-center">
                      <span>معاينة:</span>
                      <div className="relative w-28 h-16 bg-black/40 rounded border border-white/10 overflow-hidden flex items-center justify-center">
                        <img src={roomFrameTop2} className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10" alt="Preview Frame 2" />
                        <span className="text-[8px] text-white/20">كارت الغرفة</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 mr-2 uppercase tracking-tighter block">إطار الغرفة الثالثة (الريدر - الصف الثاني اليمين - Top 3)</label>
                  <input 
                    type="text" 
                    value={roomFrameTop3} 
                    onChange={e => setRoomFrameTop3(e.target.value)} 
                    placeholder="https://... (رابط صورة الإطار)" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none font-mono"
                  />
                  {roomFrameTop3 && (
                    <div className="mt-2 text-center text-[9px] text-white/40 flex items-center gap-2 justify-center">
                      <span>معاينة:</span>
                      <div className="relative w-28 h-16 bg-black/40 rounded border border-white/10 overflow-hidden flex items-center justify-center">
                        <img src={roomFrameTop3} className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10" alt="Preview Frame 3" />
                        <span className="text-[8px] text-white/20">كارت الغرفة</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-white/40 mr-2 uppercase tracking-tighter block">إطار الغرفة الرابعة (اليسار - الصف الثاني - Top 4)</label>
                  <input 
                    type="text" 
                    value={roomFrameTop4} 
                    onChange={e => setRoomFrameTop4(e.target.value)} 
                    placeholder="https://... (رابط صورة الإطار)" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none font-mono"
                  />
                  {roomFrameTop4 && (
                    <div className="mt-2 text-center text-[9px] text-white/40 flex items-center gap-2 justify-center">
                      <span>معاينة:</span>
                      <div className="relative w-28 h-16 bg-black/40 rounded border border-white/10 overflow-hidden flex items-center justify-center">
                        <img src={roomFrameTop4} className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10" alt="Preview Frame 4" />
                        <span className="text-[8px] text-white/20">كارت الغرفة</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={saveRoomFramesSettings} 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-transform border border-white/10"
              >
                حفظ إطارات الغرف
              </button>
            </div>
          </div>
        )}

        {adminTab === 'roomCenters' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-[#180e2d]/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">تحديد مراكز وترتيب الغرف (Top Pinned Rooms)</p>
                <p className="text-[9px] font-bold text-white/40">تتيح لك هذه الميزة تثبيت أي غرف تم إنشاؤها لتظهر في المراكز الأربعة الأولى بالصفحة الرئيسية بشكل دائم.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Slot 1 */}
                {(() => {
                  const room = allRooms.find(r => r.id === topRoom1Id);
                  const title = room ? (room.title || "غرفة بدون عنوان") : "تلقائي (أحدث الغرف نشاطاً)";
                  const bg = room ? (room.coverImage || room.roomBackground) : null;
                  const displayId = room ? (room.roomIdDisplay || room.owner?.customId || room.id.substring(0, 8)) : null;
                  return (
                    <div className="bg-[#140b27] border border-white/5 hover:border-purple-500/20 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black overflow-hidden flex-shrink-0 shadow-inner">
                          {bg ? <img src={bg} className="w-full h-full object-cover" /> : <i className="fas fa-crown text-base" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black text-purple-400 uppercase tracking-tight">المركز الأول (اليمين - Top 1)</p>
                          <h4 className="text-[11px] font-black text-white mt-0.5 truncate">{title}</h4>
                          {displayId && (
                            <p className="text-[9px] font-bold text-white/40 mt-1 flex flex-col gap-0.5">
                              <span>رقم الغرفة (ID): <span className="font-mono text-purple-400 select-all">{room?.roomIdDisplay || room?.owner?.customId || displayId}</span></span>
                              <span>المالك: {room?.owner?.name || "مستخدم"} (ID: <span className="font-mono text-purple-300">{room?.owner?.customId || "N/A"}</span>)</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setActiveSlotToSelect(1);
                          setRoomSelectorSearchQuery('');
                          setIsRoomSelectorOpen(true);
                        }}
                        className="w-full bg-[#1e1035] hover:bg-purple-600/20 text-purple-300 border border-purple-500/10 hover:border-purple-500/30 py-2.5 px-3 rounded-xl text-[9px] font-black transition-all flex items-center justify-center gap-1.5"
                      >
                        <i className="fas fa-exchange-alt text-[8.5px] text-purple-400" />
                        اختيار غرفة للمركز الأول
                      </button>
                    </div>
                  );
                })()}

                {/* Slot 2 */}
                {(() => {
                  const room = allRooms.find(r => r.id === topRoom2Id);
                  const title = room ? (room.title || "غرفة بدون عنوان") : "تلقائي (أحدث الغرف نشاطاً)";
                  const bg = room ? (room.coverImage || room.roomBackground) : null;
                  const displayId = room ? (room.roomIdDisplay || room.owner?.customId || room.id.substring(0, 8)) : null;
                  return (
                    <div className="bg-[#140b27] border border-white/5 hover:border-purple-500/20 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black overflow-hidden flex-shrink-0 shadow-inner">
                          {bg ? <img src={bg} className="w-full h-full object-cover" /> : <i className="fas fa-gem text-base" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black text-purple-400 uppercase tracking-tight">المركز الثاني (اليسار - Top 2)</p>
                          <h4 className="text-[11px] font-black text-white mt-0.5 truncate">{title}</h4>
                          {displayId && (
                            <p className="text-[9px] font-bold text-white/40 mt-1 flex flex-col gap-0.5">
                              <span>رقم الغرفة (ID): <span className="font-mono text-purple-400 select-all">{room?.roomIdDisplay || room?.owner?.customId || displayId}</span></span>
                              <span>المالك: {room?.owner?.name || "مستخدم"} (ID: <span className="font-mono text-purple-300">{room?.owner?.customId || "N/A"}</span>)</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setActiveSlotToSelect(2);
                          setRoomSelectorSearchQuery('');
                          setIsRoomSelectorOpen(true);
                        }}
                        className="w-full bg-[#1e1035] hover:bg-purple-600/20 text-purple-300 border border-purple-500/10 hover:border-purple-500/30 py-2.5 px-3 rounded-xl text-[9px] font-black transition-all flex items-center justify-center gap-1.5"
                      >
                        <i className="fas fa-exchange-alt text-[8.5px] text-purple-400" />
                        اختيار غرفة للمركز الثاني
                      </button>
                    </div>
                  );
                })()}

                {/* Slot 3 */}
                {(() => {
                  const room = allRooms.find(r => r.id === topRoom3Id);
                  const title = room ? (room.title || "غرفة بدون عنوان") : "تلقائي (أحدث الغرف نشاطاً)";
                  const bg = room ? (room.coverImage || room.roomBackground) : null;
                  const displayId = room ? (room.roomIdDisplay || room.owner?.customId || room.id.substring(0, 8)) : null;
                  return (
                    <div className="bg-[#140b27] border border-white/5 hover:border-purple-500/20 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black overflow-hidden flex-shrink-0 shadow-inner">
                          {bg ? <img src={bg} className="w-full h-full object-cover" /> : <i className="fas fa-star text-base" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black text-purple-400 uppercase tracking-tight">المركز الثالث (الريدر - الصف الثاني اليمين - Top 3)</p>
                          <h4 className="text-[11px] font-black text-white mt-0.5 truncate">{title}</h4>
                          {displayId && (
                            <p className="text-[9px] font-bold text-white/40 mt-1 flex flex-col gap-0.5">
                              <span>رقم الغرفة (ID): <span className="font-mono text-purple-400 select-all">{room?.roomIdDisplay || room?.owner?.customId || displayId}</span></span>
                              <span>المالك: {room?.owner?.name || "مستخدم"} (ID: <span className="font-mono text-purple-300">{room?.owner?.customId || "N/A"}</span>)</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setActiveSlotToSelect(3);
                          setRoomSelectorSearchQuery('');
                          setIsRoomSelectorOpen(true);
                        }}
                        className="w-full bg-[#1e1035] hover:bg-purple-600/20 text-purple-300 border border-purple-500/10 hover:border-purple-500/30 py-2.5 px-3 rounded-xl text-[9px] font-black transition-all flex items-center justify-center gap-1.5"
                      >
                        <i className="fas fa-exchange-alt text-[8.5px] text-purple-400" />
                        اختيار غرفة للمركز الثالث
                      </button>
                    </div>
                  );
                })()}

                {/* Slot 4 */}
                {(() => {
                  const room = allRooms.find(r => r.id === topRoom4Id);
                  const title = room ? (room.title || "غرفة بدون عنوان") : "تلقائي (أحدث الغرف نشاطاً)";
                  const bg = room ? (room.coverImage || room.roomBackground) : null;
                  const displayId = room ? (room.roomIdDisplay || room.owner?.customId || room.id.substring(0, 8)) : null;
                  return (
                    <div className="bg-[#140b27] border border-white/5 hover:border-purple-500/20 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black overflow-hidden flex-shrink-0 shadow-inner">
                          {bg ? <img src={bg} className="w-full h-full object-cover" /> : <i className="fas fa-award text-base" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-black text-purple-400 uppercase tracking-tight">المركز الرابع (اليسار - الصف الثاني - Top 4)</p>
                          <h4 className="text-[11px] font-black text-white mt-0.5 truncate">{title}</h4>
                          {displayId && (
                            <p className="text-[9px] font-bold text-white/40 mt-1 flex flex-col gap-0.5">
                              <span>رقم الغرفة (ID): <span className="font-mono text-purple-400 select-all">{room?.roomIdDisplay || room?.owner?.customId || displayId}</span></span>
                              <span>المالك: {room?.owner?.name || "مستخدم"} (ID: <span className="font-mono text-purple-300">{room?.owner?.customId || "N/A"}</span>)</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setActiveSlotToSelect(4);
                          setRoomSelectorSearchQuery('');
                          setIsRoomSelectorOpen(true);
                        }}
                        className="w-full bg-[#1e1035] hover:bg-purple-600/20 text-purple-300 border border-purple-500/10 hover:border-purple-500/30 py-2.5 px-3 rounded-xl text-[9px] font-black transition-all flex items-center justify-center gap-1.5"
                      >
                        <i className="fas fa-exchange-alt text-[8.5px] text-purple-400" />
                        اختيار غرفة للمركز الرابع
                      </button>
                    </div>
                  );
                })()}
              </div>

              <button 
                onClick={saveRoomCentersSettings} 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-transform border border-white/10"
              >
                حفظ ترتيب مراكز الغرف
              </button>
            </div>
          </div>
        )}

        {adminTab === 'wealthDesign' && (
          <div className="space-y-6 animate-fade-in pb-10">
            <div className="bg-[#180e2d]/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">تصميم قائمة الثروة والجاذبية (Leaderboard Assets)</p>
                <p className="text-[9px] font-bold text-white/40">تخصيص ملحقات الأجنحة، الإطارات، والخلفيات لعرض التوب وقوائم الشرف.</p>
              </div>

              {/* Top 1 Configuration */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-crown text-yellow-500 text-[10px]"></i> المركز الأول (TOP 1)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wing Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط ملحق الجناح الخاص بتوب 1</label>
                    <input 
                      type="text" 
                      value={wealthWingTop1} 
                      onChange={e => setWealthWingTop1(e.target.value)} 
                      placeholder="ضع رابط الجناح المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {wealthWingTop1 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الجناح:</span>
                        <img src={wealthWingTop1} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Wing 1 Preview" />
                      </div>
                    )}
                  </div>

                  {/* Frame Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط الإطار الذي سيوضع على الجناح/الأفاتار لتوب 1</label>
                    <input 
                      type="text" 
                      value={wealthFrameTop1} 
                      onChange={e => setWealthFrameTop1(e.target.value)} 
                      placeholder="ضع رابط الإطار المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {wealthFrameTop1 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الإطار:</span>
                        <img src={wealthFrameTop1} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Frame 1 Preview" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top 2 Configuration */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-crown text-slate-300 text-[10px]"></i> المركز الثاني (TOP 2)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wing Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط ملحق الجناح الخاص بتوب 2</label>
                    <input 
                      type="text" 
                      value={wealthWingTop2} 
                      onChange={e => setWealthWingTop2(e.target.value)} 
                      placeholder="ضع رابط الجناح المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {wealthWingTop2 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الجناح:</span>
                        <img src={wealthWingTop2} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Wing 2 Preview" />
                      </div>
                    )}
                  </div>

                  {/* Frame Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط الإطار الذي سيوضع على الجناح/الأفاتار لتوب 2</label>
                    <input 
                      type="text" 
                      value={wealthFrameTop2} 
                      onChange={e => setWealthFrameTop2(e.target.value)} 
                      placeholder="ضع رابط الإطار المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {wealthFrameTop2 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الإطار:</span>
                        <img src={wealthFrameTop2} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Frame 2 Preview" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top 3 Configuration */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-crown text-amber-600 text-[10px]"></i> المركز الثالث (TOP 3)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wing Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط ملحق الجناح الخاص بتوب 3</label>
                    <input 
                      type="text" 
                      value={wealthWingTop3} 
                      onChange={e => setWealthWingTop3(e.target.value)} 
                      placeholder="ضع رابط الجناح المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {wealthWingTop3 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الجناح:</span>
                        <img src={wealthWingTop3} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Wing 3 Preview" />
                      </div>
                    )}
                  </div>

                  {/* Frame Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط الإطار الذي سيوضع على الجناح/الأفاتار لتوب 3</label>
                    <input 
                      type="text" 
                      value={wealthFrameTop3} 
                      onChange={e => setWealthFrameTop3(e.target.value)} 
                      placeholder="ضع رابط الإطار المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {wealthFrameTop3 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الإطار:</span>
                        <img src={wealthFrameTop3} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Frame 3 Preview" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Others Rank 4+ Configuration */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-list-ol text-purple-400 text-[10px]"></i> الرتب الأخرى (توب 4، 5، 6 فما فوق)</h3>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/60">رابط المستطيل/الخلفية لعرض المستخدمين (توب 4 فما فوق)</label>
                  <input 
                    type="text" 
                    value={wealthListBgOthers} 
                    onChange={e => setWealthListBgOthers(e.target.value)} 
                    placeholder="ضع رابط الخلفية المستطيلة هنا..." 
                    className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                    dir="ltr"
                  />
                  {wealthListBgOthers && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                      <span>معاينة المستطيل:</span>
                      <img src={wealthListBgOthers} className="h-10 w-24 object-cover rounded border border-white/10 animate-fade-in" alt="Others Card Preview" />
                    </div>
                  )}
                </div>
              </div>

              {/* Event Background Configuration */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-images text-purple-400 text-[10px]"></i> خلفية صفحة الحدث/لوحة الصدارة (Event Background)</h3>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/60">رابط خلفية صفحة الحدث/لوحة الصدارة</label>
                  <input 
                    type="text" 
                    value={wealthEventBg} 
                    onChange={e => setWealthEventBg(e.target.value)} 
                    placeholder="ضع رابط خلفية الحدث هنا..." 
                    className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                    dir="ltr"
                  />
                  {wealthEventBg && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                      <span>معاينة خلفية الحدث:</span>
                      <img src={wealthEventBg} className="h-16 w-12 object-cover rounded border border-white/10 animate-fade-in" alt="Event Background Preview" />
                    </div>
                  )}
                </div>
              </div>

              {/* Active Tab Background Image Configuration */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-toggle-on text-purple-400 text-[10px]"></i> خلفية التبويب النشط (Active Tab Background)</h3>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/60">رابط صورة التبويب المحدد (يومية/أسبوعية/شهرياً) عند الضغط عليه</label>
                  <input 
                    type="text" 
                    value={wealthActiveTabBg} 
                    onChange={e => setWealthActiveTabBg(e.target.value)} 
                    placeholder="ضع رابط خلفية التبويب النشط هنا..." 
                    className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                    dir="ltr"
                  />
                  {wealthActiveTabBg && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                      <span>معاينة خلفية الدايرة للتبويب:</span>
                      <img src={wealthActiveTabBg} className="h-8 px-4 py-1 bg-white/5 object-contain rounded-full border border-white/10 animate-fade-in" alt="Active Tab Background Preview" />
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={saveWealthDesignSettings}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all border border-white/10 animate-fade-in"
              >
                حفظ تصميم الثروة
              </button>
            </div>
          </div>
        )}

        {adminTab === 'charismaDesign' && (
          <div className="space-y-6 animate-fade-in pb-10">
            <div className="bg-[#180e2d]/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">تصميم قائمة الجاذبية والسحر (Charisma Leaderboard Assets)</p>
                <p className="text-[9px] font-bold text-white/40">تخصيص ملحقات الأجنحة، الإطارات، والخلفيات لعرض التوب وقوائم الشرف للجاذبية.</p>
              </div>

              {/* Top 1 Configuration */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-crown text-yellow-500 text-[10px]"></i> المركز الأول (TOP 1)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wing Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط ملحق الجناح الخاص بتوب 1</label>
                    <input 
                      type="text" 
                      value={charismaWingTop1} 
                      onChange={e => setCharismaWingTop1(e.target.value)} 
                      placeholder="ضع رابط الجناح المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {charismaWingTop1 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الجناح:</span>
                        <img src={charismaWingTop1} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Wing 1 Preview" />
                      </div>
                    )}
                  </div>

                  {/* Frame Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط إطار توب 1</label>
                    <input 
                      type="text" 
                      value={charismaFrameTop1} 
                      onChange={e => setCharismaFrameTop1(e.target.value)} 
                      placeholder="ضع رابط الإطار المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {charismaFrameTop1 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الإطار:</span>
                        <img src={charismaFrameTop1} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Frame 1 Preview" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top 2 Configuration */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-medal text-silver-300 text-[10px]"></i> المركز الثاني (TOP 2)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wing Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط ملحق الجناح الخاص بتوب 2</label>
                    <input 
                      type="text" 
                      value={charismaWingTop2} 
                      onChange={e => setCharismaWingTop2(e.target.value)} 
                      placeholder="ضع رابط الجناح المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {charismaWingTop2 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الجناح:</span>
                        <img src={charismaWingTop2} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Wing 2 Preview" />
                      </div>
                    )}
                  </div>

                  {/* Frame Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط إطار توب 2</label>
                    <input 
                      type="text" 
                      value={charismaFrameTop2} 
                      onChange={e => setCharismaFrameTop2(e.target.value)} 
                      placeholder="ضع رابط الإطار المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {charismaFrameTop2 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الإطار:</span>
                        <img src={charismaFrameTop2} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Frame 2 Preview" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top 3 Configuration */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-medal text-orange-400 text-[10px]"></i> المركز الثالث (TOP 3)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wing Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط ملحق الجناح الخاص بتوب 3</label>
                    <input 
                      type="text" 
                      value={charismaWingTop3} 
                      onChange={e => setCharismaWingTop3(e.target.value)} 
                      placeholder="ضع رابط الجناح المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {charismaWingTop3 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الجناح:</span>
                        <img src={charismaWingTop3} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Wing 3 Preview" />
                      </div>
                    )}
                  </div>

                  {/* Frame Link */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/60">رابط إطار توب 3</label>
                    <input 
                      type="text" 
                      value={charismaFrameTop3} 
                      onChange={e => setCharismaFrameTop3(e.target.value)} 
                      placeholder="ضع رابط الإطار المباشر هنا..." 
                      className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                      dir="ltr"
                    />
                    {charismaFrameTop3 && (
                      <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                        <span>معاينة الإطار:</span>
                        <img src={charismaFrameTop3} className="h-10 w-10 object-contain rounded border border-white/10 animate-fade-in" alt="Frame 3 Preview" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Others Card Backplate */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-id-badge text-purple-400 text-[10px]"></i> خلفية كروت الأشخاص (Card Backplate)</h3>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/60">رابط صورة كرت بقية الأشخاص في القائمة (تحت توب 3)</label>
                  <input 
                    type="text" 
                    value={charismaListBgOthers} 
                    onChange={e => setCharismaListBgOthers(e.target.value)} 
                    placeholder="ضع رابط صورة خلفية الكرت هنا..." 
                    className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                    dir="ltr"
                  />
                  {charismaListBgOthers && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                      <span>معاينة الكرت:</span>
                      <img src={charismaListBgOthers} className="h-10 w-24 object-cover rounded border border-white/10 animate-fade-in" alt="Others Card Preview" />
                    </div>
                  )}
                </div>
              </div>

              {/* Event Background Image */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-image text-purple-400 text-[10px]"></i> الخلفية الكلية لصفحة الفعالية (Event Background)</h3>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/60">رابط الخلفية الكلية لصفحة قائمة المتصدرين كاملة</label>
                  <input 
                    type="text" 
                    value={charismaEventBg} 
                    onChange={e => setCharismaEventBg(e.target.value)} 
                    placeholder="ضع رابط الخلفية المباشر هنا..." 
                    className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                    dir="ltr"
                  />
                  {charismaEventBg && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                      <span>معاينة الخلفية:</span>
                      <img src={charismaEventBg} className="h-16 w-12 object-cover rounded border border-white/10 animate-fade-in" alt="Event Background Preview" />
                    </div>
                  )}
                </div>
              </div>

              {/* Active Tab Background Image */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-toggle-on text-purple-400 text-[10px]"></i> خلفية التبويب النشط (Active Tab Background)</h3>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/60">رابط صورة التبويب المحدد (يومية/أسبوعية/شهرياً) عند الضغط عليه</label>
                  <input 
                    type="text" 
                    value={charismaActiveTabBg} 
                    onChange={e => setCharismaActiveTabBg(e.target.value)} 
                    placeholder="ضع رابط خلفية التبويب النشط هنا..." 
                    className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                    dir="ltr"
                  />
                  {charismaActiveTabBg && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                      <span>معاينة خلفية الدايرة للتبويب:</span>
                      <img src={charismaActiveTabBg} className="h-8 px-4 py-1 bg-white/5 object-contain rounded-full border border-white/10 animate-fade-in" alt="Active Tab Background Preview" />
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={saveCharismaDesignSettings}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all border border-white/10 animate-fade-in"
              >
                حفظ تصميم السحر
              </button>
            </div>
          </div>
        )}

        {adminTab === 'menuButtonsDesign' && (
          <div className="space-y-6 animate-fade-in pb-10">
            <div className="bg-[#180e2d]/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">تصميم أزرار القوائم (Menu Buttons Design)</p>
                <p className="text-[9px] font-bold text-white/40">تخصيص المربعين أو المستطيلين اللذان يظهران تحت البنر العلوي مباشرة في الصفحة الرئيسية.</p>
              </div>

              {/* Menu Button 1 */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-th-large text-purple-400 text-[10px]"></i> المربع/المستطيل الأول (Button 1)</h3>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/60">رابط صورة المربع الأول</label>
                  <input 
                    type="text" 
                    value={menuBox1Url} 
                    onChange={e => setMenuBox1Url(e.target.value)} 
                    placeholder="ضع رابط صورة المربع الأول هنا..." 
                    className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                    dir="ltr"
                  />
                  {menuBox1Url && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                      <span>معاينة:</span>
                      <img src={menuBox1Url} className="h-12 w-24 object-cover rounded border border-white/10 animate-fade-in" alt="Button 1 Preview" />
                    </div>
                  )}
                </div>
              </div>

              {/* Menu Button 2 */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-th-large text-purple-400 text-[10px]"></i> المربع/المستطيل الثاني (Button 2)</h3>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/60">رابط صورة المربع الثاني</label>
                  <input 
                    type="text" 
                    value={menuBox2Url} 
                    onChange={e => setMenuBox2Url(e.target.value)} 
                    placeholder="ضع رابط صورة المربع الثاني هنا..." 
                    className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                    dir="ltr"
                  />
                  {menuBox2Url && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                      <span>معاينة:</span>
                      <img src={menuBox2Url} className="h-12 w-24 object-cover rounded border border-white/10 animate-fade-in" alt="Button 2 Preview" />
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={saveMenuButtonsSettings}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all border border-white/10 animate-fade-in"
              >
                حفظ تصميم أزرار القائمة
              </button>
            </div>
          </div>
        )}

        {adminTab === 'topFramesDesign' && (
          <div className="space-y-6 animate-fade-in pb-10">
            <div className="bg-[#180e2d]/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 space-y-6 shadow-2xl">
              <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">إطارات التوبات / إطارات المراكز للرئيسية (Podium Top Frames)</p>
                <p className="text-[9px] font-bold text-white/40">تخصيص الإطارات التي تظهر حول صور أول ثلاثة مستخدمين على المربعات التبويبية بالصفحة الرئيسية.</p>
              </div>

              {/* Frame Top 1 */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-crown text-yellow-500 text-[10px]"></i> إطار المركز الأول (Top 1 Podium Frame)</h3>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/60">رابط الإطار</label>
                  <input 
                    type="text" 
                    value={top1PodiumFrame} 
                    onChange={e => setTop1PodiumFrame(e.target.value)} 
                    placeholder="ضع رابط صورة إطار المركز الأول..." 
                    className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                    dir="ltr"
                  />
                  {top1PodiumFrame && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                      <span>معاينة:</span>
                      <img src={top1PodiumFrame} className="h-12 w-12 object-contain rounded border border-white/10 animate-fade-in" alt="Top 1 Frame Preview" />
                    </div>
                  )}
                </div>
              </div>

              {/* Frame Top 2 */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-medal text-slate-300 text-[10px]"></i> إطار المركز الثاني (Top 2 Podium Frame)</h3>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/60">رابط الإطار</label>
                  <input 
                    type="text" 
                    value={top2PodiumFrame} 
                    onChange={e => setTop2PodiumFrame(e.target.value)} 
                    placeholder="ضع رابط صورة إطار المركز الثاني..." 
                    className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                    dir="ltr"
                  />
                  {top2PodiumFrame && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                      <span>معاينة:</span>
                      <img src={top2PodiumFrame} className="h-12 w-12 object-contain rounded border border-white/10 animate-fade-in" alt="Top 2 Frame Preview" />
                    </div>
                  )}
                </div>
              </div>

              {/* Frame Top 3 */}
              <div className="bg-[#100623]/40 p-4 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5"><i className="fas fa-award text-amber-700 text-[10px]"></i> إطار المركز الثالث (Top 3 Podium Frame)</h3>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/60">رابط الإطار</label>
                  <input 
                    type="text" 
                    value={top3PodiumFrame} 
                    onChange={e => setTop3PodiumFrame(e.target.value)} 
                    placeholder="ضع رابط صورة إطار المركز الثالث..." 
                    className="w-full bg-[#100623] border border-white/10 py-3 px-4 rounded-xl text-[10px] text-white outline-none focus:border-purple-500/50 transition-all font-bold placeholder:text-white/20 text-left"
                    dir="ltr"
                  />
                  {top3PodiumFrame && (
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-white/40">
                      <span>معاينة:</span>
                      <img src={top3PodiumFrame} className="h-12 w-12 object-contain rounded border border-white/10 animate-fade-in" alt="Top 3 Frame Preview" />
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={saveTopFramesSettings}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-4 rounded-2xl font-black text-xs text-white shadow-xl active:scale-95 transition-all border border-white/10 animate-fade-in"
              >
                حفظ إطارات التوبات
              </button>
            </div>
          </div>
        )}
      </div>

      {showChargePopup && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"><div className="bg-[#1a0b2e] w-full max-w-[280px] rounded-[2rem] border border-white/10 p-6 shadow-2xl flex flex-col gap-4"><h4 className="text-sm font-black text-white text-center">شحن كوينز</h4><input type="number" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} placeholder="الكمية..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none text-center" /><div className="flex gap-2"><button onClick={handleChargeSubmit} className="flex-1 bg-green-600 py-3 rounded-xl text-[10px] font-black text-white">تأكيد</button><button onClick={() => setShowChargePopup(null)} className="flex-1 bg-white/5 py-3 rounded-xl text-[10px] font-black text-white border border-white/10">إلغاء</button></div></div></div>
      )}

      {showDeductPopup && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowDeductPopup(null)}>
          <div className="bg-[#1a0b2e] w-full max-w-[280px] rounded-[2.5rem] border border-white/10 p-6 shadow-2xl flex flex-col gap-5" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-black text-white text-center">خصم كوينز</h4>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-orange-400/60 mr-2 uppercase tracking-widest">عدد الكوينز المراد خصمها</label>
              <input type="number" value={deductAmount} onChange={e => setDeductAmount(e.target.value)} placeholder="المبلغ..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs text-white outline-none text-center shadow-inner" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleDeductSubmit} className="flex-1 bg-orange-600 py-3.5 rounded-xl text-[11px] font-black text-white shadow-lg active:scale-95 transition-all">سحب الرصيد</button>
              <button onClick={() => { setShowDeductPopup(null); setDeductAmount(''); }} className="flex-1 bg-white/5 py-3.5 rounded-xl text-[11px] font-black text-white border border-white/10 active:scale-95 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showSecretClubModal && (
        <div className="fixed inset-0 z-[750] bg-black/50 flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setShowSecretClubModal(null)}>
          <div className="bg-[#1a0b2e]/70 w-full max-w-[300px] rounded-[2rem] border border-white/15 p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <i className="fas fa-user-secret text-xl"></i>
              </div>
              <h4 className="text-sm font-black text-white text-center">
                {showSecretClubModal.currentStatus ? 'إدارة النادي السري' : 'منح النادي السري'}
              </h4>
              <p className="text-[11px] text-white/50 text-center font-bold">
                المستخدم: <span className="text-amber-300">{showSecretClubModal.name}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-amber-400/80 block text-right">
                باسورد دخول النادي السري
              </label>
              <input 
                type="text" 
                value={secretClubPasswordVal} 
                onChange={e => setSecretClubPasswordVal(e.target.value)} 
                placeholder="اكتب كلمة مرور الدخول..." 
                className="w-full bg-transparent border border-white/20 rounded-xl py-3 px-4 text-xs text-white outline-none text-center focus:border-amber-400 font-mono" 
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={async () => {
                  const pass = secretClubPasswordVal.trim();
                  if (!pass) {
                    alert("يرجى كتابة باسورد دخول للمستخدم");
                    return;
                  }
                  await handleSaveSecretClub(showSecretClubModal.uid, pass, true);
                  setShowSecretClubModal(null);
                }} 
                className="w-full bg-amber-600 hover:bg-amber-500 py-3 rounded-xl text-xs font-black text-white shadow-lg active:scale-95 transition-all"
              >
                {showSecretClubModal.currentStatus ? 'حفظ / تحديث الباسورد' : 'تأكيد ومنح النادي السري'}
              </button>

              {showSecretClubModal.currentStatus && (
                <button 
                  onClick={async () => {
                    if (confirm("هل أنت متأكد من سحب عضوية النادي السري من هذا المستخدم؟")) {
                      await handleSaveSecretClub(showSecretClubModal.uid, '', false);
                      setShowSecretClubModal(null);
                    }
                  }} 
                  className="w-full bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 py-2.5 rounded-xl text-xs font-black text-rose-400 active:scale-95 transition-all"
                >
                  سحب النادي السري
                </button>
              )}

              <button 
                onClick={() => setShowSecretClubModal(null)} 
                className="w-full bg-white/5 py-2.5 rounded-xl text-xs font-black text-white/60 border border-white/10 active:scale-95 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {isRoomSelectorOpen && activeSlotToSelect !== null && (
        <div 
          className="fixed inset-0 z-[800] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => { setIsRoomSelectorOpen(false); setActiveSlotToSelect(null); }}
        >
          <div 
            className="bg-[#170a2d] w-full max-w-md rounded-[2.5rem] border border-purple-500/20 p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ direction: 'rtl' }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h4 className="text-sm font-black text-white">تثبيت وتحديد غرف الصدارة</h4>
                <p className="text-[10px] font-bold text-purple-400 mt-0.5">
                  {activeSlotToSelect === 1 && "تحديد الغرفة المثبتة بالمركز الأول (Top 1)"}
                  {activeSlotToSelect === 2 && "تحديد الغرفة المثبتة بالمركز الثاني (Top 2)"}
                  {activeSlotToSelect === 3 && "تحديد الغرفة المثبتة بالمركز الثالث (Top 3)"}
                  {activeSlotToSelect === 4 && "تحديد الغرفة المثبتة بالمركز الرابع (Top 4)"}
                </p>
              </div>
              <button 
                onClick={() => { setIsRoomSelectorOpen(false); setActiveSlotToSelect(null); }}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <i className="fas fa-times text-xs" />
              </button>
            </div>

            {/* Realtime Search Bar */}
            <div className="relative">
              <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-xs" />
              <input 
                type="text" 
                value={roomSelectorSearchQuery} 
                onChange={e => setRoomSelectorSearchQuery(e.target.value)} 
                placeholder="ابحث باسم الغرفة أو الـ ID..." 
                className="w-full bg-[#100623] border border-white/10 rounded-2xl py-3.5 pr-10 pl-4 text-xs text-white outline-none focus:border-purple-500/50 transition-all font-bold"
              />
              {roomSelectorSearchQuery && (
                <button 
                  onClick={() => setRoomSelectorSearchQuery('')} 
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Scrollable Room List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
              {/* Option 1: Automatic / Reset to Default style */}
              <div 
                onClick={() => {
                  if (activeSlotToSelect === 1) setTopRoom1Id('');
                  else if (activeSlotToSelect === 2) setTopRoom2Id('');
                  else if (activeSlotToSelect === 3) setTopRoom3Id('');
                  else if (activeSlotToSelect === 4) setTopRoom4Id('');
                  setIsRoomSelectorOpen(false);
                  setActiveSlotToSelect(null);
                }}
                className="bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all hover:scale-[0.99] active:scale-[0.97]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
                    <i className="fas fa-sync-alt text-sm" />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-purple-300">تلقائي (أحدث الغرف نشاطاً)</h5>
                    <p className="text-[9px] text-white/40 font-bold mt-0.5">تظهر الغرف النشطة تلقائياً بالترتيب الزمني الافتراضي</p>
                  </div>
                </div>
                <div className="text-[10px] font-black text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 h-9 px-5 rounded-xl flex items-center justify-center transition-all whitespace-nowrap flex-shrink-0 shadow-sm active:scale-95">
                  إلغاء التثبيت
                </div>
              </div>

              {/* Filtered Rooms */}
              {(() => {
                const queryFiltered = allRooms.filter(room => {
                  const query = roomSelectorSearchQuery.trim().toLowerCase();
                  if (!query) return true;
                  const roomTitle = (room.title || '').toLowerCase();
                  const roomId = (room.id || '').toLowerCase();
                  const roomIdDisplay = (room.roomIdDisplay || '').toLowerCase();
                  const ownerName = (room.owner?.name || '').toLowerCase();
                  const ownerCustomId = (room.owner?.customId || '').toLowerCase();
                  
                  return roomTitle.includes(query) || 
                         roomId.includes(query) || 
                         roomIdDisplay.includes(query) || 
                         ownerName.includes(query) || 
                         ownerCustomId.includes(query);
                });

                if (queryFiltered.length === 0) {
                  return (
                    <div className="py-12 text-center text-white/20 text-xs font-bold">
                      لا توجد غرف تطابق هذا البحث
                    </div>
                  );
                }

                return queryFiltered.map((room) => {
                  const isCurrent = 
                    (activeSlotToSelect === 1 && topRoom1Id === room.id) ||
                    (activeSlotToSelect === 2 && topRoom2Id === room.id) ||
                    (activeSlotToSelect === 3 && topRoom3Id === room.id) ||
                    (activeSlotToSelect === 4 && topRoom4Id === room.id);

                  return (
                    <div 
                      key={room.id}
                      onClick={() => {
                        if (activeSlotToSelect === 1) setTopRoom1Id(room.id);
                        else if (activeSlotToSelect === 2) setTopRoom2Id(room.id);
                        else if (activeSlotToSelect === 3) setTopRoom3Id(room.id);
                        else if (activeSlotToSelect === 4) setTopRoom4Id(room.id);
                        setIsRoomSelectorOpen(false);
                        setActiveSlotToSelect(null);
                      }}
                      className={`border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all hover:scale-[0.99] active:scale-[0.97] ${
                        isCurrent 
                          ? 'bg-purple-600/20 border-purple-500/80' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {room.coverImage || room.roomBackground ? (
                            <img src={room.coverImage || room.roomBackground} className="w-full h-full object-cover" />
                          ) : (
                            <i className="fas fa-couch text-purple-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-[11px] font-black text-white truncate">{room.title || "غرفة بدون عنوان"}</h5>
                          <p className="text-[9px] font-bold text-white/40 mt-1 flex flex-col gap-0.5">
                            <span>رقم الغرفة (ID): <span className="font-mono text-purple-400 font-black">{room.roomIdDisplay || room.owner?.customId || room.id.substring(0, 8)}</span></span>
                            <span>المالك: {room.owner?.name || "مستخدم"} (ID: <span className="font-mono text-purple-300 font-black">{room.owner?.customId || "N/A"}</span>)</span>
                          </p>
                        </div>
                      </div>
                      
                      {isCurrent ? (
                        <div className="text-[9px] font-black text-purple-400 flex items-center gap-1 bg-purple-500/20 px-2.5 py-1 rounded-lg flex-shrink-0">
                          <i className="fas fa-check text-[8px]" />
                          محدد حالياً
                        </div>
                      ) : (
                        <div className="text-[9px] font-black text-white/30 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 flex-shrink-0 hover:text-white transition-colors">
                          تحديد الغرفة
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {showIdPopup && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6" onClick={() => setShowIdPopup(null)}>
          <div className="bg-[#1a0b2e] w-full max-w-[350px] rounded-[2.5rem] border border-white/10 p-5 sm:p-6 shadow-2xl flex flex-col gap-5 overflow-y-auto max-h-[92vh] scrollbar-hide" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-black text-white text-center font-['Cairo'] tracking-tight">تصميم وتعديل الـ ID المخصص</h4>
            
            <div className="bg-black/40 rounded-[2rem] border border-white/5 p-4 flex flex-col items-center justify-center gap-5 relative overflow-hidden min-h-[190px] py-6 select-none">
               <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent"></div>
               
               {/* Profile Page Preview */}
               <div 
                 onClick={() => setActiveIdTab('profile')}
                 className={`flex flex-col items-center gap-1.5 z-10 p-2.5 rounded-xl transition-all duration-300 w-full cursor-pointer ${activeIdTab === 'profile' ? 'bg-purple-500/10 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'opacity-40 border border-transparent hover:opacity-60'}`}
               >
                 <p className="text-[7.5px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1">
                   {activeIdTab === 'profile' && <span className="w-1 h-1 rounded-full bg-purple-500 animate-ping"></span>}
                   معاينة البروفايل (90 × 28)
                 </p>
                 {newCustomIdIcon ? (
                   <div className="relative w-[90px] h-[28px] flex items-center bg-contain bg-center bg-no-repeat transition-all" style={{ backgroundImage: `url(${newCustomIdIcon})` }}>
                       <span className="font-black text-white tracking-widest text-center w-full block drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" 
                             style={{ 
                               paddingLeft: `${profileIdOffsetX}px`, 
                               paddingTop: `${profileIdOffsetY}px`,
                               fontSize: `${profileIdFontSize}px`
                             }}>
                         {newCustomId || 'ID PREVIEW'}
                       </span>
                    </div>
                 ) : (
                   <span className="text-blue-400 font-black text-[9px] px-2.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">{newCustomId || 'ID PREVIEW'}</span>
                 )}
               </div>

               {/* Voice Room Preview */}
               <div 
                 onClick={() => setActiveIdTab('room')}
                 className={`flex flex-col items-center gap-1.5 z-10 p-2.5 rounded-xl transition-all duration-300 w-full cursor-pointer ${activeIdTab === 'room' ? 'bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'opacity-40 border border-transparent hover:opacity-60'}`}
               >
                 <p className="text-[7.5px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                   {activeIdTab === 'room' && <span className="w-1 h-1 rounded-full bg-cyan-500 animate-ping"></span>}
                   معاينة الغرفة (70 × 22)
                 </p>
                 {newCustomIdIcon ? (
                   <div className="relative w-[70px] h-[22px] flex items-center bg-contain bg-center bg-no-repeat transition-all" style={{ backgroundImage: `url(${newCustomIdIcon})` }}>
                       <span className="font-black text-white tracking-widest text-center w-full block drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                             style={{ 
                               paddingLeft: `${roomIdOffsetX}px`, 
                               paddingTop: `${roomIdOffsetY}px`,
                               fontSize: `${roomIdFontSize}px`
                             }}>
                         {newCustomId || 'ID PREVIEW'}
                       </span>
                    </div>
                 ) : (
                   <span className="text-blue-400 font-black text-[7.5px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/10">{newCustomId || 'ID PREVIEW'}</span>
                 )}
               </div>
            </div>

            <div className="space-y-4">
               {/* Inputs on separate rows to guarantee zero horizontal overflow */}
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-purple-400/60 mr-1 uppercase">الهوية النصية (ID)</label>
                  <input type="text" value={newCustomId} onChange={e => setNewCustomId(e.target.value)} placeholder="ادخل النص هنا..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none font-black shadow-inner" />
               </div>

               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-purple-400/60 mr-1 uppercase">رابط أيقونة الـ ID (PNG)</label>
                  <div className="flex gap-2">
                    <input type="text" value={newCustomIdIcon || ''} onChange={e => setNewCustomIdIcon(e.target.value)} placeholder="رابط مباشر للصورة..." className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none font-mono" />
                    <button onClick={() => idIconInputRef.current?.click()} className="w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 active:scale-90"><i className="fas fa-camera"></i></button>
                  </div>
               </div>

               {/* Segmented Selection with visual premium icons */}
               <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 w-full">
                 <button 
                   type="button" 
                   onClick={() => setActiveIdTab('profile')} 
                   className={`flex-1 py-2 rounded-lg text-[9.5px] font-black transition-all duration-300 ${activeIdTab === 'profile' ? 'bg-purple-600 text-white shadow-md font-extrabold' : 'text-white/40 hover:text-white/60'}`}
                 >
                   <i className="fas fa-user-circle ml-1"></i> البروفايل
                 </button>
                 <button 
                   type="button" 
                   onClick={() => setActiveIdTab('room')} 
                   className={`flex-1 py-2 rounded-lg text-[9.5px] font-black transition-all duration-300 ${activeIdTab === 'room' ? 'bg-cyan-600 text-white shadow-md font-extrabold' : 'text-white/40 hover:text-white/60'}`}
                 >
                   <i className="fas fa-cube ml-1"></i> الغرفة
                 </button>
               </div>

               {/* Dedicated line for font-size to avoid any layout clamping and wrapping */}
               <div className="space-y-1.5">
                  <div className="flex justify-between items-center mr-1">
                    <label className="text-[9px] font-black text-purple-400/60 uppercase">حجم الخط</label>
                    <span className="text-[9px] font-bold text-white/40">
                      تعديل: <span className="text-purple-400 font-extrabold">{activeIdTab === 'profile' ? 'البروفايل' : 'الغرفة'}</span> ({activeIdTab === 'profile' ? profileIdFontSize : roomIdFontSize}px)
                    </span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 h-[46px]">
                     <button 
                       type="button" 
                       onClick={() => {
                         if (activeIdTab === 'profile') {
                           setProfileIdFontSize(prev => Math.max(4, prev - 0.5));
                         } else {
                           setRoomIdFontSize(prev => Math.max(4, prev - 0.5));
                         }
                       }} 
                       className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 active:scale-90"
                     >
                       <i className="fas fa-minus text-[8px]"></i>
                     </button>
                     <input 
                       type="range" 
                       min="4" 
                       max="24" 
                       step="0.5" 
                       value={activeIdTab === 'profile' ? profileIdFontSize : roomIdFontSize} 
                       onChange={e => {
                         const val = parseFloat(e.target.value);
                         if (activeIdTab === 'profile') {
                           setProfileIdFontSize(val);
                         } else {
                           setRoomIdFontSize(val);
                         }
                       }} 
                       className="flex-1 accent-purple-500 h-1 bg-white/10 rounded-full appearance-none cursor-pointer" 
                     />
                     <button 
                       type="button" 
                       onClick={() => {
                         if (activeIdTab === 'profile') {
                           setProfileIdFontSize(prev => Math.min(24, prev + 0.5));
                         } else {
                           setRoomIdFontSize(prev => Math.min(24, prev + 0.5));
                         }
                       }} 
                       className="w-6 h-6 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 active:scale-90"
                     >
                       <i className="fas fa-plus text-[8px]"></i>
                     </button>
                  </div>
               </div>

               {newCustomIdIcon && (
                 <div className="space-y-4 p-4 bg-black/50 rounded-2xl border border-white/5 flex flex-col items-center">
                    <label className="text-[9px] font-black text-white/30 uppercase block text-center mb-1">أزرار تحريك موضع النص</label>
                    <div className="flex flex-col items-center gap-2 relative p-4 bg-white/2 rounded-full border border-white/5">
                        {/* Up button */}
                        <button 
                          type="button"
                          onClick={() => {
                            if (activeIdTab === 'profile') {
                              setProfileIdOffsetY(prev => parseFloat((prev - 0.5).toFixed(1)));
                            } else {
                              setRoomIdOffsetY(prev => parseFloat((prev - 0.5).toFixed(1)));
                            }
                          }} 
                          className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center active:bg-purple-600 active:text-white transition-all transform active:scale-90 border border-white/10 shadow-lg"
                        >
                          <i className="fas fa-chevron-up text-xs"></i>
                        </button>
                        
                        {/* Middle row: Right, central indicator, Left */}
                        <div className="flex gap-10 items-center">
                           <button 
                             type="button"
                             onClick={() => {
                               if (activeIdTab === 'profile') {
                                 setProfileIdOffsetX(prev => parseFloat((prev - 0.5).toFixed(1)));
                               } else {
                                 setRoomIdOffsetX(prev => parseFloat((prev - 0.5).toFixed(1)));
                               }
                             }} 
                             className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center active:bg-purple-600 active:text-white transition-all transform active:scale-90 border border-white/10 shadow-lg"
                           >
                             <i className="fas fa-chevron-right text-xs"></i>
                           </button>
                           
                           {/* Decorative target center dot */}
                           <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex flex-col items-center justify-center text-[7.5px] font-black text-purple-400">
                             <span className="animate-pulse">{activeIdTab === 'profile' ? 'بروفايل' : 'غرفة'}</span>
                           </div>

                           <button 
                             type="button"
                             onClick={() => {
                               if (activeIdTab === 'profile') {
                                 setProfileIdOffsetX(prev => parseFloat((prev + 0.5).toFixed(1)));
                               } else {
                                 setRoomIdOffsetX(prev => parseFloat((prev + 0.5).toFixed(1)));
                               }
                             }} 
                             className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center active:bg-purple-600 active:text-white transition-all transform active:scale-90 border border-white/10 shadow-lg"
                           >
                             <i className="fas fa-chevron-left text-xs"></i>
                           </button>
                        </div>
                        
                        {/* Down button */}
                        <button 
                          type="button"
                          onClick={() => {
                            if (activeIdTab === 'profile') {
                              setProfileIdOffsetY(prev => parseFloat((prev + 0.5).toFixed(1)));
                            } else {
                              setRoomIdOffsetY(prev => parseFloat((prev + 0.5).toFixed(1)));
                            }
                          }} 
                          className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center active:bg-purple-600 active:text-white transition-all transform active:scale-90 border border-white/10 shadow-lg"
                        >
                          <i className="fas fa-chevron-down text-xs"></i>
                        </button>
                    </div>
                    <div className="flex justify-between w-full mt-2 px-4">
                       <span className="text-[9px] font-bold text-purple-400/60">
                         X: <span className="font-mono">{activeIdTab === 'profile' ? profileIdOffsetX : roomIdOffsetX}</span>
                       </span>
                       <span className="text-[9px] font-bold text-purple-400/60">
                         Y: <span className="font-mono">{activeIdTab === 'profile' ? profileIdOffsetY : roomIdOffsetY}</span>
                       </span>
                    </div>
                 </div>
               )}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleIdUpdateSubmit} className="flex-1 bg-purple-600 hover:bg-purple-700 py-3.5 rounded-2xl text-[11px] font-black text-white shadow-lg active:scale-95 transition-all font-['Cairo']">حفظ وتطبيق</button>
              <button onClick={() => { setShowIdPopup(null); setNewCustomIdIcon(null); }} className="flex-1 bg-white/5 py-4 rounded-2xl text-[11px] font-black text-white border border-white/10 active:scale-95 transition-all font-['Cairo']">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showGrantPopup && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowGrantPopup(null)}>
          <div className="bg-[#1a0b2e] w-full max-w-[340px] rounded-[2.5rem] border border-white/10 p-6 shadow-2xl flex flex-col gap-5 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-black text-white text-center">منح عنصر مخصص للمستخدم</h4>
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {['frame', 'entry', 'background'].map((t) => (
                  <button key={t} onClick={() => setGrantType(t as any)} className={`py-2 rounded-xl text-[10px] font-black transition-all border ${grantType === t ? 'bg-purple-600 text-white border-purple-500' : 'bg-white/5 text-white/30 border-white/10'}`}>
                    {t === 'frame' ? 'إطار' : t === 'entry' ? 'دخولية' : 'خلفية'}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-purple-400/60 uppercase mr-1">اسم العنصر</label>
                <input type="text" value={grantName} onChange={e => setGrantName(e.target.value)} placeholder="مثلاً: التاج الملكي..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none shadow-inner" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-purple-400/60 uppercase mr-1">رابط الملف (Gif/Mp4)</label>
                <input type="text" value={grantUrl} onChange={e => setGrantUrl(e.target.value)} placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none font-mono shadow-inner" />
              </div>

              {grantType === 'entry' && (
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-purple-400/60 uppercase mr-1">صورة معاينة الدخولية</label>
                  <div className="flex gap-2">
                    <input type="text" value={grantPreview || ''} onChange={e => setGrantPreview(e.target.value)} placeholder="رابط صورة PNG..." className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none font-mono" />
                    <button onClick={() => grantPreviewInputRef.current?.click()} className="w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 active:scale-90"><i className="fas fa-camera"></i></button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-purple-400/60 uppercase mr-1">المدة (بالأيام)</label>
                <input type="number" value={grantDuration} onChange={e => setGrantDuration(e.target.value)} placeholder="7" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none shadow-inner" />
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-2 border-t border-white/5 pt-4">
              <p className="text-[11px] font-black text-white/80 bg-white/5 p-2 rounded-xl text-center">حقيبة المستخدم (العناصر الحالية)</p>
              
              {/* قسم الإطارات - يظهر فقط عند اختيار إطار */}
              {grantType === 'frame' && (
                <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">الإطارات الحالية ({userInventory.filter(i => i.type === 'frame').length})</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                    {userInventory.filter(i => i.type === 'frame').map(item => (
                      <div key={item.id} className="relative aspect-square bg-white/5 rounded-xl border border-white/5 p-1 flex items-center justify-center group shadow-lg">
                        <div className="w-full h-full relative flex items-center justify-center">
                          <div className="w-2/3 h-2/3 rounded-full bg-white/5 border border-white/20"></div>
                          <img src={item.imageUrl} className="absolute inset-0 w-full h-full object-contain" />
                        </div>
                        <button 
                          onClick={() => handleRemoveInventoryItem(item.id, item.imageUrl, 'frame')}
                          className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-xl z-20"
                        >
                          <i className="fas fa-trash text-white text-xs"></i>
                        </button>
                      </div>
                    ))}
                    {userInventory.filter(i => i.type === 'frame').length === 0 && <div className="col-span-4 text-center py-2 opacity-20 text-[8px] font-bold text-white/50">لا توجد إطارات في حقيبة المستخدم</div>}
                  </div>
                </div>
              )}

              {/* قسم الدخوليات - يظهر فقط عند اختيار دخولية */}
              {grantType === 'entry' && (
                <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">الدخوليات الحالية ({userInventory.filter(i => i.type === 'entry').length})</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                    {userInventory.filter(i => i.type === 'entry').map(item => (
                      <div key={item.id} className="relative aspect-square bg-white/5 rounded-xl border border-white/5 p-1 flex items-center justify-center group shadow-lg overflow-hidden">
                        <img src={item.previewImage || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%232e1a4a'/><path d='M30 40l40 10-40 10z' fill='%23ffffff' fill-opacity='0.4'/></svg>"} className="w-full h-full object-cover rounded-lg" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <i className="fas fa-play text-[8px] text-white/50"></i>
                        </div>
                        <button 
                          onClick={() => handleRemoveInventoryItem(item.id, item.videoUrl || item.imageUrl, 'entry')}
                          className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-xl z-20"
                        >
                          <i className="fas fa-trash text-white text-xs"></i>
                        </button>
                      </div>
                    ))}
                    {userInventory.filter(i => i.type === 'entry').length === 0 && <div className="col-span-4 text-center py-2 opacity-20 text-[8px] font-bold text-white/50">لا توجد دخوليات في حقيبة المستخدم</div>}
                  </div>
                </div>
              )}

              {/* قسم الخلفيات - يظهر فقط عند اختيار خلفية */}
              {grantType === 'background' && (
                <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">خلفيات الغرفة الحالية ({userInventory.filter(i => i.type === 'background').length})</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                    {userInventory.filter(i => i.type === 'background').map(item => (
                      <div key={item.id} className="relative aspect-square bg-white/5 rounded-xl border border-white/5 p-1 flex items-center justify-center group shadow-lg overflow-hidden">
                        <img src={item.imageUrl} className="w-full h-full object-cover rounded-lg" />
                        <button 
                          onClick={() => handleRemoveInventoryItem(item.id, item.imageUrl, 'background')}
                          className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all rounded-xl z-20"
                        >
                          <i className="fas fa-trash text-white text-xs"></i>
                        </button>
                      </div>
                    ))}
                    {userInventory.filter(i => i.type === 'background').length === 0 && <div className="col-span-4 text-center py-2 opacity-20 text-[8px] font-bold text-white/50">لا توجد خلفيات في حقيبة المستخدم</div>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={handleGrantItem} 
                disabled={isPublishing}
                className="flex-1 bg-purple-600 py-4 rounded-2xl text-[11px] font-black text-white shadow-lg active:scale-95 transition-all"
              >
                {isPublishing ? <i className="fas fa-spinner animate-spin"></i> : 'منح العنصر الآن'}
              </button>
              <button onClick={() => setShowGrantPopup(null)} className="flex-1 bg-white/5 py-4 rounded-2xl text-[11px] font-black text-white border border-white/10 active:scale-95 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showGrantAnimatedPopup && (
        <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowGrantAnimatedPopup(null)}>
          <div className="bg-[#1a0b2e] w-full max-w-[300px] rounded-[2rem] border border-white/10 p-5 shadow-2xl flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 bg-pink-500/20 rounded-2xl flex items-center justify-center text-pink-500 mx-auto mb-2 border border-pink-500/20 shadow-lg"><i className="fas fa-image text-xl"></i></div>
              <h4 className="text-sm font-black text-white">إدارة الصورة المتحركة</h4>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">تظهر على المايك والبروفايل</p>
            </div>
            
            <div className="space-y-2">
              <div className="w-full h-32 rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex flex-col items-center justify-center relative">
                {animatedUrl.trim() ? (
                  isVideoUrl(animatedUrl) ? (
                    <video src={animatedUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={animatedUrl} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="opacity-20 flex flex-col items-center gap-1">
                    <i className="fas fa-image text-2xl"></i>
                    <p className="text-[8px] font-black uppercase">معاينة حية</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <label className="text-[8px] font-black text-pink-400/60 mr-1 uppercase">رابط الصورة (GIF/MP4)</label>
                <input type="text" value={animatedUrl} onChange={e => setAnimatedUrl(e.target.value)} placeholder="ضع الرابط هنا..." className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-[10px] text-white outline-none font-mono shadow-inner" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <button onClick={handleGrantAnimatedAvatar} disabled={isPublishing} className="w-full bg-pink-600 py-3 rounded-xl text-[10px] font-black text-white shadow-lg active:scale-95 transition-all">
                {isPublishing ? <i className="fas fa-spinner animate-spin"></i> : (animatedUrl.trim() ? 'حفظ وتحديث' : 'منح الآن')}
              </button>
              {allUsers.find(u => u.id === showGrantAnimatedPopup)?.animatedAvatar && (
                <button 
                  onClick={() => { setAnimatedUrl(''); setTimeout(handleGrantAnimatedAvatar, 100); }} 
                  disabled={isPublishing} 
                  className="w-full bg-red-600/20 text-red-400 py-2.5 rounded-xl text-[10px] font-black border border-red-600/30 active:scale-95 transition-all"
                >
                  حذف الصورة الحالية
                </button>
              )}
              <button onClick={() => setShowGrantAnimatedPopup(null)} className="w-full bg-white/5 py-2 rounded-xl text-[10px] font-black text-white border border-white/10 active:scale-95 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showRoomCoverPopup && (
        <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowRoomCoverPopup(null)}>
          <div className="bg-[#1a0b2e] w-full max-w-[300px] rounded-[2rem] border border-white/10 p-5 shadow-2xl flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-500 mx-auto mb-2 border border-purple-500/20 shadow-lg"><i className="fas fa-magic text-xl"></i></div>
              <h4 className="text-sm font-black text-white">غلاف الغرفة المتحرك</h4>
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">تغيير مظهر الغرفة العام</p>
            </div>
            
            <div className="space-y-2">
              <div className="w-full h-32 rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex flex-col items-center justify-center relative">
                {animatedRoomCoverUrl.trim() ? (
                  isVideoUrl(animatedRoomCoverUrl) ? (
                    <video src={animatedRoomCoverUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={animatedRoomCoverUrl} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="opacity-20 flex flex-col items-center gap-1">
                    <i className="fas fa-film text-2xl"></i>
                    <p className="text-[8px] font-black uppercase">معاينة الغلاف</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <label className="text-[8px] font-black text-purple-400/60 mr-1 uppercase">رابط الغلاف (GIF/MP4)</label>
                <input type="text" value={animatedRoomCoverUrl} onChange={e => setAnimatedRoomCoverUrl(e.target.value)} placeholder="ضع رابط الغلاف هنا..." className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-[10px] text-white outline-none font-mono shadow-inner" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <button onClick={handleSetAnimatedRoomCover} disabled={isPublishing} className="w-full bg-purple-600 py-3 rounded-xl text-[10px] font-black text-white shadow-lg active:scale-95 transition-all">
                {isPublishing ? <i className="fas fa-spinner animate-spin"></i> : 'تحديث غلاف الغرفة'}
              </button>
              <button onClick={() => setShowRoomCoverPopup(null)} className="w-full bg-white/5 py-2 rounded-xl text-[10px] font-black text-white border border-white/10 active:scale-95 transition-all">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {showBadgesPopup && (
        <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowBadgesPopup(null)}>
          <div className="bg-[#1a0b2e] w-full max-w-[380px] max-h-[80vh] rounded-[2.5rem] border border-white/10 p-6 shadow-2xl flex flex-col gap-6 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h4 className="text-sm font-black text-white">إدارة شارات المستخدم</h4>
              <p className="text-[9px] text-white/30 uppercase tracking-widest mt-1">تظهر في بروفايل المستخدم</p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={badgeUrl} 
                  onChange={e => setBadgeUrl(e.target.value)} 
                  placeholder="رابط الشارة (PNG)..." 
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-[10px] text-white outline-none font-mono"
                />
                <button 
                  onClick={handleGiveBadge}
                  disabled={isPublishing}
                  className="px-4 bg-emerald-600 rounded-xl text-[10px] font-black text-white shadow-lg disabled:opacity-50"
                >
                  {isPublishing ? <i className="fas fa-spinner animate-spin"></i> : 'منح'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-hide">
              <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">الشارات الحالية ({userBadges.length})</p>
              <div className="grid grid-cols-4 gap-3">
                {userBadges.map(badge => (
                  <div key={badge.id} className="relative aspect-square bg-white/5 rounded-xl border border-white/5 p-2 flex items-center justify-center group overflow-hidden">
                    <img src={badge.imageUrl} className="w-full h-full object-contain" />
                    <button 
                      onClick={() => handleRemoveBadge(badge.id)}
                      className="absolute inset-0 bg-red-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"
                    >
                      <i className="fas fa-trash text-white text-xs"></i>
                    </button>
                  </div>
                ))}
                {userBadges.length === 0 && (
                  <div className="col-span-4 text-center py-6 opacity-20">
                    <p className="text-[10px] font-bold">لا توجد شارات لدى المستخدم</p>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setShowBadgesPopup(null)} className="w-full py-3 bg-white/5 text-white/40 rounded-xl text-[10px] font-black border border-white/10">إغلاق</button>
          </div>
        </div>
      )}

      <style>{`
        .animate-pulse-slow { animation: pulse 2s infinite ease-in-out; }
        @keyframes pulse { 0%, 100% { transform: scale(1.1); } 50% { transform: scale(1.15); } }
      `}</style>
    </div>
  );
};
