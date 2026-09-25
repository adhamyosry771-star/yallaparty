import React, { useState, useRef, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  signOut,
  updateProfile,
  deleteUser,
  updateEmail,
  updatePassword,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  setDoc,
  where,
  getDocs,
  getDoc,
  increment,
  deleteField,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { registerBackAction } from "../backButtonManager";
import { AdminPanel } from "./AdminPanel";
import { BanSystemModal } from "./BanSystemModal";
import { BanLogsModal } from "./BanLogsModal";
import { GMPage } from "./GMPage";
import { GiveItemsModal } from "./GiveItemsModal";
import { RoomsManagementModal } from "./RoomsManagementModal";
import { RoomReportsModal } from "./RoomReportsModal";
import { AgencyManagementModal } from "./AgencyManagementModal";
import { AgencyWalletModal } from "./AgencyWalletModal";
import { StoreModal } from "./StoreModal";
import { GamesControlPanel } from "./GamesControlPanel";
import { getWealthLevelInfo, getCharismaLevelInfo } from "../utils";
import { useLanguage } from "../LanguageContext";

export const getFlagUrl = (code?: string, flagEmoji?: string) => {
  let finalCode = code?.toUpperCase();
  if (!finalCode && flagEmoji) {
    const emojiMap: { [key: string]: string } = {
      "🇪🇬": "EG", "🇸🇦": "SA", "🇦🇪": "AE", "🇰🇼": "KW", "🇧🇭": "BH", "🇴🇲": "OM",
      "🇶🇦": "QA", "🇯🇴": "JO", "🇱🇧": "LB", "🇮🇶": "IQ", "🇲🇦": "MA", "🇹🇳": "TN",
      "🇩🇿": "DZ", "🇱🇾": "LY", "🇸🇩": "SD", "🇾🇪": "YE", "🇵🇸": "PS", "🇸🇾": "SY",
      "🇲🇷": "MR", "🇸🇴": "SO", "🇩🇯": "DJ", "🇰🇲": "KM", "🇹🇷": "TR", "🇮🇷": "IR",
      "🇺🇸": "US", "🇬🇧": "GB", "🇫🇷": "FR", "🇩🇪": "DE", "🇮🇹": "IT", "🇪🇸": "ES",
      "🇷🇺": "RU", "🇨🇳": "CN", "🇯🇵": "JP", "🇰🇷": "KR", "🇮🇳": "IN", "🇧🇷": "BR",
      "🇨🇦": "CA", "🇦🇺": "AU"
    };
    finalCode = emojiMap[flagEmoji];
  }
  if (!finalCode) return null;
  return `https://flagcdn.com/w80/${finalCode.toLowerCase()}.png`;
};

export const FlagIcon: React.FC<{ code?: string; flagEmoji?: string; className?: string }> = ({ code, flagEmoji, className = "w-6 h-4" }) => {
  const url = getFlagUrl(code, flagEmoji);
  if (!url) {
    return <span className={className}>{flagEmoji}</span>;
  }
  return (
    <img
      src={url}
      alt="flag"
      className={`${className} object-cover rounded shadow-md border border-white/20`}
    />
  );
};

interface ProfilePageProps {
  initialUserData: any;
  forceOpenWallet?: boolean;
  onWalletOpened?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  initialUserData,
  forceOpenWallet,
  onWalletOpened,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isGamesControlPanelOpen, setIsGamesControlPanelOpen] = useState(false);
  const [isGMPageOpen, setIsGMPageOpen] = useState(false);
  const [isGiveItemsOpen, setIsGiveItemsOpen] = useState(false);
  const [isRoomsManagementOpen, setIsRoomsManagementOpen] = useState(false);
  const [isRoomReportsOpen, setIsRoomReportsOpen] = useState(false);
  const [isAgencyManagementOpen, setIsAgencyManagementOpen] = useState(false);
  const [isAgencyWalletOpen, setIsAgencyWalletOpen] = useState(false);
  const [isBanSystemOpen, setIsBanSystemOpen] = useState(false);
  const [isBanLogsOpen, setIsBanLogsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [walletTab, setWalletTab] = useState<"coins" | "diamonds">("coins");
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertAmount, setConvertAmount] = useState("");
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isCPPageOpen, setIsCPPageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<
    "main" | "email" | "password" | "support" | "language"
  >("main");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [liveUserData, setLiveUserData] = useState<any>(initialUserData);
  const [hasUnreadSupport, setHasUnreadSupport] = useState(false);
  const [dynamicFollowersCount, setDynamicFollowersCount] = useState<number>(0);
  const [dynamicFriendsCount, setDynamicFriendsCount] = useState<number>(0);
  const [relationsModal, setRelationsModal] = useState<"friends" | "following" | "followers" | null>(null);
  const [relationsSearch, setRelationsSearch] = useState("");
  const [relationsUsers, setRelationsUsers] = useState<any[]>([]);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [followersList, setFollowersList] = useState<string[]>([]);
  const [friendsList, setFriendsList] = useState<string[]>([]);

  // CP Feature States
  const [partnerData, setPartnerData] = useState<any>(null);
  const [showCPRequestModal, setShowCPRequestModal] = useState(false);
  const [showCPBreakupModal, setShowCPBreakupModal] = useState(false);
  const [partnerSearchId, setPartnerSearchId] = useState("");
  const [isSearchingPartner, setIsSearchingPartner] = useState(false);
  const [showCPConfirmModal, setShowCPConfirmModal] = useState<{
    uid: string;
    name: string;
    photo: string;
  } | null>(null);
  const [cpConfig, setCpConfig] = useState<{ backgroundUrl?: string } | null>(
    null,
  );

  const [defaultImages, setDefaultImages] = useState<any>(null);

  const [newName, setNewName] = useState(initialUserData?.displayName || "");
  const [newBio, setNewBio] = useState(initialUserData?.bio || "");
  const [tempRegion, setTempRegion] = useState<{
    name: string;
    code: string;
    flag: string;
  } | null>(
    initialUserData?.region
      ? {
          name: initialUserData.region,
          code: initialUserData.regionCode || "",
          flag: initialUserData.regionFlag || "",
        }
      : null,
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // Back key interception for ProfilePage nested modal overlays
  useEffect(() => {
    const isAnyModalOpen =
      isStoreOpen ||
      isWalletOpen ||
      isSettingsOpen ||
      isEditModalOpen ||
      isAdminPanelOpen ||
      isGamesControlPanelOpen ||
      isGMPageOpen ||
      isGiveItemsOpen ||
      isRoomsManagementOpen ||
      isRoomReportsOpen ||
      isAgencyManagementOpen ||
      isAgencyWalletOpen ||
      isBanSystemOpen ||
      isBanLogsOpen ||
      showConvertModal ||
      isCPPageOpen ||
      showCPRequestModal ||
      showCPBreakupModal ||
      showCountryPicker ||
      !!showCPConfirmModal;

    if (!isAnyModalOpen) return;

    return registerBackAction(() => {
      if (showCountryPicker) {
        setShowCountryPicker(false);
        return true;
      }
      if (showCPConfirmModal) {
        setShowCPConfirmModal(null);
        return true;
      }
      if (showCPBreakupModal) {
        setShowCPBreakupModal(false);
        return true;
      }
      if (showCPRequestModal) {
        setShowCPRequestModal(false);
        return true;
      }
      if (isCPPageOpen) {
        setIsCPPageOpen(false);
        return true;
      }
      if (showConvertModal) {
        setShowConvertModal(false);
        return true;
      }
      if (isBanLogsOpen) {
        setIsBanLogsOpen(false);
        return true;
      }
      if (isBanSystemOpen) {
        setIsBanSystemOpen(false);
        return true;
      }
      if (isAgencyWalletOpen) {
        setIsAgencyWalletOpen(false);
        return true;
      }
      if (isAgencyManagementOpen) {
        setIsAgencyManagementOpen(false);
        return true;
      }
      if (isRoomReportsOpen) {
        setIsRoomReportsOpen(false);
        return true;
      }
      if (isRoomsManagementOpen) {
        setIsRoomsManagementOpen(false);
        return true;
      }
      if (isGiveItemsOpen) {
        setIsGiveItemsOpen(false);
        return true;
      }
      if (isGMPageOpen) {
        setIsGMPageOpen(false);
        return true;
      }
      if (isGamesControlPanelOpen) {
        setIsGamesControlPanelOpen(false);
        return true;
      }
      if (isAdminPanelOpen) {
        setIsAdminPanelOpen(false);
        return true;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }
      if (isEditModalOpen) {
        setIsEditModalOpen(false);
        return true;
      }
      if (isStoreOpen) {
        setIsStoreOpen(false);
        return true;
      }
      if (isWalletOpen) {
        setIsWalletOpen(false);
        return true;
      }
      if (relationsModal) {
        setRelationsModal(null);
        return true;
      }
      return false;
    });
  }, [
    isStoreOpen,
    isWalletOpen,
    isSettingsOpen,
    isEditModalOpen,
    isAdminPanelOpen,
    isGamesControlPanelOpen,
    isGMPageOpen,
    isGiveItemsOpen,
    isRoomsManagementOpen,
    isRoomReportsOpen,
    isAgencyManagementOpen,
    isAgencyWalletOpen,
    isBanSystemOpen,
    isBanLogsOpen,
    showConvertModal,
    isCPPageOpen,
    showCPRequestModal,
    showCPBreakupModal,
    showCountryPicker,
    showCPConfirmModal,
    relationsModal,
  ]);

  const countries = [
    { name: language === "ar" ? "مصر" : "Egypt", code: "EG", flag: "🇪🇬" },
    {
      name: language === "ar" ? "السعودية" : "Saudi Arabia",
      code: "SA",
      flag: "🇸🇦",
    },
    { name: language === "ar" ? "الإمارات" : "UAE", code: "AE", flag: "🇦🇪" },
    { name: language === "ar" ? "الكويت" : "Kuwait", code: "KW", flag: "🇰🇼" },
    { name: language === "ar" ? "البحرين" : "Bahrain", code: "BH", flag: "🇧🇭" },
    { name: language === "ar" ? "عمان" : "Oman", code: "OM", flag: "🇴🇲" },
    { name: language === "ar" ? "قطر" : "Qatar", code: "QA", flag: "🇶🇦" },
    { name: language === "ar" ? "الأردن" : "Jordan", code: "JO", flag: "🇯🇴" },
    { name: language === "ar" ? "لبنان" : "Lebanon", code: "LB", flag: "🇱🇧" },
    { name: language === "ar" ? "العراق" : "Iraq", code: "IQ", flag: "🇮🇶" },
    { name: language === "ar" ? "المغرب" : "Morocco", code: "MA", flag: "🇲🇦" },
    { name: language === "ar" ? "تونس" : "Tunisia", code: "TN", flag: "🇹🇳" },
    { name: language === "ar" ? "الجزائر" : "Algeria", code: "DZ", flag: "🇩🇿" },
    { name: language === "ar" ? "ليبيا" : "Libya", code: "LY", flag: "🇱🇾" },
    { name: language === "ar" ? "السودان" : "Sudan", code: "SD", flag: "🇸🇩" },
    { name: language === "ar" ? "اليمن" : "Yemen", code: "YE", flag: "🇾🇪" },
    {
      name: language === "ar" ? "فلسطين" : "Palestine",
      code: "PS",
      flag: "🇵🇸",
    },
    { name: language === "ar" ? "سوريا" : "Syria", code: "SY", flag: "🇸🇾" },
    {
      name: language === "ar" ? "موريتانيا" : "Mauritania",
      code: "MR",
      flag: "🇲🇷",
    },
    { name: language === "ar" ? "الصومال" : "Somalia", code: "SO", flag: "🇸🇴" },
    { name: language === "ar" ? "جيبوتي" : "Djibouti", code: "DJ", flag: "🇩🇯" },
    {
      name: language === "ar" ? "جزر القمر" : "Comoros",
      code: "KM",
      flag: "🇰🇲",
    },
    { name: language === "ar" ? "تركيا" : "Turkey", code: "TR", flag: "🇹🇷" },
    { name: language === "ar" ? "إيران" : "Iran", code: "IR", flag: "🇮🇷" },
    {
      name: language === "ar" ? "الولايات المتحدة" : "United States",
      code: "US",
      flag: "🇺🇸",
    },
    {
      name: language === "ar" ? "المملكة المتحدة" : "United Kingdom",
      code: "GB",
      flag: "🇬🇧",
    },
    { name: language === "ar" ? "فرنسا" : "France", code: "FR", flag: "🇫🇷" },
    { name: language === "ar" ? "ألمانيا" : "Germany", code: "DE", flag: "🇩🇪" },
    { name: language === "ar" ? "إيطاليا" : "Italy", code: "IT", flag: "🇮🇹" },
    { name: language === "ar" ? "إسبانيا" : "Spain", code: "ES", flag: "🇪🇸" },
    { name: language === "ar" ? "روسيا" : "Russia", code: "RU", flag: "🇷🇺" },
    { name: language === "ar" ? "الصين" : "China", code: "CN", flag: "🇨🇳" },
    { name: language === "ar" ? "اليابان" : "Japan", code: "JP", flag: "🇯🇵" },
    {
      name: language === "ar" ? "كوريا الجنوبية" : "South Korea",
      code: "KR",
      flag: "🇰🇷",
    },
    { name: language === "ar" ? "الهند" : "India", code: "IN", flag: "🇮🇳" },
    { name: language === "ar" ? "البرازيل" : "Brazil", code: "BR", flag: "🇧🇷" },
    { name: language === "ar" ? "كندا" : "Canada", code: "CA", flag: "🇨🇦" },
    {
      name: language === "ar" ? "أستراليا" : "Australia",
      code: "AU",
      flag: "🇦🇺",
    },
  ];

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");

  // Support Chat States
  const [supportMsg, setSupportMsg] = useState("");
  const [supportChat, setSupportChat] = useState<any[]>([]);
  const supportChatEndRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  const user = auth.currentUser;
  const isOfficialAdmin =
    user?.email === "admin@yalla.com" ||
    user?.email === "adhamyosry56@gmail.com";
  const isAdmin = isOfficialAdmin || liveUserData?.role === "admin";

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!isImageUploading) {
          setLiveUserData(data);
          setNewName(data.displayName || "");
          setNewBio(data.bio || "");
          if (data.region) {
            setTempRegion({
              name: data.region,
              code: data.regionCode || "",
              flag: data.regionFlag || "",
            });
          }
        }
      }
    });
    return () => unsub();
  }, [user, isImageUploading]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users"),
      where("following", "array-contains", user.uid),
    );
    const unsub = onSnapshot(q, (snap) => {
      const followersUids = snap.docs.map((doc) => doc.id);
      setDynamicFollowersCount(followersUids.length);
      setFollowersList(followersUids);

      const myFollowing = liveUserData?.following || [];
      const friendsUids = myFollowing.filter((uid: string) =>
        followersUids.includes(uid),
      );
      setDynamicFriendsCount(friendsUids.length);
      setFriendsList(friendsUids);
    });
    return unsub;
  }, [user, liveUserData?.following]);

  // CP Background Config Listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "cp_config"), (snap) => {
      if (snap.exists()) {
        setCpConfig(snap.data());
      }
    });
    return unsub;
  }, []);

  // Listen for partner data if partnerUid exists
  useEffect(() => {
    if (liveUserData?.partnerUid) {
      const unsubPartner = onSnapshot(
        doc(db, "users", liveUserData.partnerUid),
        (docSnap) => {
          if (docSnap.exists()) {
            setPartnerData(docSnap.data());
          } else {
            setPartnerData(null);
          }
        },
      );
      return unsubPartner;
    } else {
      setPartnerData(null);
    }
  }, [liveUserData?.partnerUid]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "supportChats", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setHasUnreadSupport(!!docSnap.data().unreadByUser);
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!relationsModal || !user) {
      setRelationsUsers([]);
      return;
    }

    const targetUids = 
      relationsModal === "friends"
        ? friendsList
        : relationsModal === "followers"
          ? followersList
          : liveUserData?.following || [];

    if (targetUids.length === 0) {
      setRelationsUsers([]);
      return;
    }

    setIsLoadingRelations(true);

    const fetchUsersDetails = async () => {
      try {
        const chunks: string[][] = [];
        for (let i = 0; i < targetUids.length; i += 30) {
          chunks.push(targetUids.slice(i, i + 30));
        }

        const loadedUsers: any[] = [];
        for (const chunk of chunks) {
          const q = query(
            collection(db, "users"),
            where("uid", "in", chunk)
          );
          const snap = await getDocs(q);
          snap.forEach((doc) => {
            loadedUsers.push({ id: doc.id, ...doc.data() });
          });
        }
        setRelationsUsers(loadedUsers);
      } catch (err) {
        console.error("Error fetching relation users:", err);
      } finally {
        setIsLoadingRelations(false);
      }
    };

    fetchUsersDetails();
  }, [relationsModal, friendsList, followersList, liveUserData?.following, user]);

  useEffect(() => {
    if (user && settingsView === "support") {
      updateDoc(doc(db, "supportChats", user.uid), { unreadByUser: false });
      const q = query(
        collection(db, "supportChats", user.uid, "messages"),
        orderBy("createdAt", "asc"),
      );
      const unsub = onSnapshot(q, (snap) => {
        setSupportChat(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setTimeout(
          () =>
            supportChatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          100,
        );
      });
      return unsub;
    }
  }, [user, settingsView]);

  useEffect(() => {
    if (forceOpenWallet) {
      setIsWalletOpen(true);
      if (onWalletOpened) onWalletOpened();
    }
  }, [forceOpenWallet]);

  const compressImage = (
    base64Str: string,
    maxWidth = 400,
    maxHeight = 400,
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    });
  };

  const isVideoUrl = (url: string | null) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes("video");
  };

  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsImageUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawBase64 = reader.result as string;
        try {
          const compressedBase64 = await compressImage(
            rawBase64,
            field === "headerURL" ? 800 : 400,
            field === "headerURL" ? 400 : 400,
          );
          if (compressedBase64.length > 200000) {
            alert(
              t(
                "حجم الصورة كبير جداً، يرجى اختيار صورة أصغر",
                "The image size is too large, please select a smaller image",
              ),
            );
            setIsImageUploading(false);
            return;
          }
          setLiveUserData((prev: any) => ({
            ...prev,
            [field]: compressedBase64,
          }));
          if (user)
            await updateDoc(doc(db, "users", user.uid), {
              [field]: compressedBase64,
            });
          if (field === "photoURL" && user)
            await updateProfile(user, { photoURL: compressedBase64 });
          setTimeout(() => setIsImageUploading(false), 1000);
          alert(t("تم تحديث الصورة بنجاح", "Image updated successfully"));
        } catch (err) {
          alert(t("حجم الصورة كبير جداً", "The image size is too large"));
          setIsImageUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfileData = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      const updates: any = { displayName: newName, bio: newBio };

      // Check region update limit (3 days)
      if (tempRegion && tempRegion.name !== liveUserData?.region) {
        const lastUpdate = liveUserData?.lastRegionUpdate?.toDate?.() || 0;
        const now = new Date();
        const diffInDays =
          (now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 3600 * 24);

        const isAdmin = user?.email === "admin@yalla.com";
        if (lastUpdate && diffInDays < 3 && !isAdmin) {
          const remainingDays = Math.ceil(3 - diffInDays);
          alert(
            t(
              `يمكنك تغيير الدولة مرة كل 3 أيام. يرجى الانتظار لمدة ${remainingDays} يوم إضافي.`,
              `You can change country once every 3 days. Please wait for ${remainingDays} more day(s).`,
            ),
          );
          setIsUpdating(false);
          return;
        }

        updates.region = tempRegion.name;
        updates.regionCode = tempRegion.code;
        updates.regionFlag = tempRegion.flag;
        updates.lastRegionUpdate = serverTimestamp();
      }

      await updateDoc(doc(db, "users", user.uid), updates);
      await updateProfile(user, { displayName: newName });
      setIsEditModalOpen(false);
      alert(t("تم تحديث البيانات", "Data updated successfully"));
    } catch (err) {
      console.error(err);
      alert(t("حدث خطأ", "An error occurred"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user || !newAccountEmail.trim()) return;
    setIsUpdating(true);
    try {
      await updateEmail(user, newAccountEmail.trim());
      alert(
        t(
          "تم تحديث البريد الإلكتروني بنجاح. يمكنك الآن تسجيل الدخول بالبريد الجديد.",
          "Email updated successfully. You can now log in with the new email.",
        ),
      );
      setNewAccountEmail("");
      setSettingsView("main");
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        alert(
          t(
            "للأمان، يرجى تسجيل الخروج والدخول مرة أخرى قبل تغيير البريد",
            "Security check: Please log out and log back in before changing your email",
          ),
        );
      } else {
        alert(
          t("فشل تحديث البريد: ", "Failed to update email: ") + err.message,
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user || !newAccountPassword.trim()) return;
    setIsUpdating(true);
    try {
      await updatePassword(user, newAccountPassword.trim());
      alert(
        t(
          "تم تحديث كلمة المرور بنجاح. استخدم كلمة المرور الجديدة في المرة القادمة.",
          "Password updated successfully. Use your new password next time.",
        ),
      );
      setNewAccountPassword("");
      setSettingsView("main");
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        alert(
          t(
            "للأمان، يرجى تسجيل الخروج والدخول مرة أخرى قبل تغيير كلمة المرور",
            "Security check: Please log out and log back in before changing your password",
          ),
        );
      } else {
        alert(
          t("فشل تحديث كلمة المرور: ", "Failed to update password: ") +
            err.message,
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Default Images Listener
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "default_images"), (snap) => {
      if (snap.exists()) {
        setDefaultImages(snap.data());
      }
    });
    return unsub;
  }, []);

  const handleSendSupportMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supportMsg.trim()) return;
    if (supportMsg.length > 250)
      return alert(
        t(
          "الرسالة يجب أن لا تتجاوز 250 حرفاً",
          "The message must not exceed 250 characters",
        ),
      );

    try {
      const chatRef = doc(db, "supportChats", user.uid);
      const activePhoto =
        liveUserData?.animatedAvatar ||
        liveUserData?.photoURL ||
        user.photoURL ||
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>";

      await setDoc(
        chatRef,
        {
          userId: user.uid,
          userName: liveUserData?.displayName || user.displayName || "مستخدم",
          userPhoto: activePhoto,
          lastMessage: supportMsg.trim(),
          lastTimestamp: serverTimestamp(),
          unreadByAdmin: true,
          unreadByUser: false,
        },
        { merge: true },
      );

      await addDoc(collection(db, "supportChats", user.uid, "messages"), {
        senderId: user.uid,
        text: supportMsg.trim(),
        createdAt: serverTimestamp(),
      });
      setSupportMsg("");
    } catch (e) {
      alert(t("فشل الإرسال", "Sending failed"));
    }
  };

  const handleSearchPartner = async () => {
    if (!partnerSearchId.trim()) return;
    setIsSearchingPartner(true);
    try {
      const q = query(
        collection(db, "users"),
        where("customId", "==", partnerSearchId.trim()),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        alert(
          t(
            "لم يتم العثور على مستخدم بهذا الـ ID",
            "User with this ID not found",
          ),
        );
      } else {
        const found = snap.docs[0];
        const data = found.data();
        if (found.id === user?.uid)
          return alert(
            t(
              "لا يمكنك طلب الارتباط بنفسك!",
              "You cannot request a relationship with yourself!",
            ),
          );
        if (data.partnerUid)
          return alert(
            t("هذا المستخدم مرتبط بالفعل!", "This user is already coupled!"),
          );

        setShowCPConfirmModal({
          uid: found.id,
          name: data.displayName,
          photo:
            data.photoURL ||
            data.animatedAvatar ||
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>",
        });
        setShowCPRequestModal(false);
      }
    } catch (e) {
      alert(t("خطأ في البحث", "Search error"));
    } finally {
      setIsSearchingPartner(false);
    }
  };

  const handleSendCPRequest = async () => {
    if (!showCPConfirmModal || !user) return;
    if ((liveUserData?.coins || 0) < 50000000)
      return alert(
        t(
          "رصيدك غير كافٍ، تحتاج إلى 50,000,000 كوينز",
          "Your balance is insufficient, you need 50,000,000 coins",
        ),
      );

    setIsUpdating(true);
    try {
      // Deduct coins first
      await updateDoc(doc(db, "users", user.uid), {
        coins: increment(-50000000),
      });

      // Send relationship request notification
      await addDoc(
        collection(db, "users", showCPConfirmModal.uid, "systemNotifications"),
        {
          title: t("طلب ارتباط (CP)", "Couple Relationship Request (CP)"),
          desc: t(
            `تقدم ${liveUserData.displayName} بربط علاقة معك`,
            `${liveUserData.displayName} requested to join a couple with you`,
          ),
          type: "cp_request",
          senderUid: user.uid,
          senderName: liveUserData.displayName,
          icon: "fa-heart",
          createdAt: serverTimestamp(),
        },
      );

      alert(
        t(
          "تم إرسال طلب الارتباط وخصم الكوينز. في حال الرفض ستعود الكوينز لحسابك.",
          "Relationship request sent and coins deducted. If rejected, coins will return to your account.",
        ),
      );
      setShowCPConfirmModal(null);
      setPartnerSearchId("");
    } catch (e) {
      alert(
        t(
          "حدث خطأ أثناء إرسال الطلب",
          "An error occurred while sending the request",
        ),
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmBreakup = async () => {
    if (!user || !liveUserData?.partnerUid) return;
    if ((liveUserData?.coins || 0) < 100000000)
      return alert(
        t(
          "رصيدك غير كافٍ لفك الارتباط، تحتاج إلى 100,000,000 كوينز لتعويض الشريك",
          "Your balance is insufficient, you need 100,000,000 coins to compensate your partner",
        ),
      );

    setIsUpdating(true);
    try {
      const partnerId = liveUserData.partnerUid;

      // 1. Deduct 100M from initiator and break link
      await updateDoc(doc(db, "users", user.uid), {
        coins: increment(-100000000),
        partnerUid: deleteField(),
      });

      // 2. Compensate partner and break link
      await updateDoc(doc(db, "users", partnerId), {
        coins: increment(100000000),
        partnerUid: deleteField(),
      });

      // 3. Send system notification to partner
      await addDoc(collection(db, "users", partnerId, "systemNotifications"), {
        title: t("انفصال وتعويض", "Decoupled & Compensated"),
        desc: t(
          `الشريك الآخر قام بفك العلاقة وقام بتعويضك بمبلغ 100,000,000 عملة ذهبية`,
          `The other partner broke up and compensated you with 100,000,000 gold coins`,
        ),
        icon: "fa-heart-broken",
        createdAt: serverTimestamp(),
      });

      alert(
        t(
          "تم إنهاء العلاقة وتعويض الشريك بنجاح",
          "Successfully decoupled and partner compensated.",
        ),
      );
      setShowCPBreakupModal(false);
      setIsCPPageOpen(false);
    } catch (e) {
      alert(
        t("حدث خطأ أثناء فك الارتباط", "An error occurred while breaking up"),
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConvertDiamonds = async () => {
    if (!user) return;
    const amount = parseInt(convertAmount);
    if (isNaN(amount) || amount <= 0)
      return alert(t("يرجى إدخال مبلغ صحيح", "Please enter a valid amount"));
    if (userDiamonds < amount)
      return alert(
        t("رصيد الماس غير كافٍ", "Your diamonds balance is insufficient"),
      );

    setIsUpdating(true);
    try {
      const receiveCoins = amount;
      await updateDoc(doc(db, "users", user.uid), {
        diamonds: increment(-amount),
        coins: increment(receiveCoins),
      });

      alert(
        t(
          `تم تحويل ${amount.toLocaleString("en-US")} ماسة إلى ${receiveCoins.toLocaleString("en-US")} كوينز بنجاح`,
          `Converted ${amount.toLocaleString("en-US")} diamonds to ${receiveCoins.toLocaleString("en-US")} coins successfully`,
        ),
      );
      setShowConvertModal(false);
      setConvertAmount("");
    } catch (e) {
      alert(t("حدث خطأ أثناء التحويل", "An error occurred during conversion"));
    } finally {
      setIsUpdating(false);
    }
  };

  const userDisplayName =
    liveUserData?.displayName || user?.displayName || "المستخدم";
  const userCustomId =
    liveUserData?.customId ||
    (isOfficialAdmin ? "OFFICIAL" : user?.uid.substring(0, 8));

  const handleCopyId = (idToCopy: string) => {
    if (!idToCopy) return;
    navigator.clipboard.writeText(idToCopy).then(() => {
      alert(t("تم نسخ الآي دي بنجاح!", "ID copied successfully!"));
    }).catch(() => {
      const textArea = document.createElement("textarea");
      textArea.value = idToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert(t("تم نسخ الآي دي بنجاح!", "ID copied successfully!"));
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    });
  };

  const userCoins = liveUserData?.coins || 0;
  const userDiamonds = liveUserData?.diamonds || 0;
  const userCustomIdIcon = liveUserData?.customIdIcon;
  const currentFrame = liveUserData?.currentFrame || null;
  const idX = liveUserData?.profileIdOffsetX ?? liveUserData?.idOffsetX ?? 28;
  const idY = liveUserData?.profileIdOffsetY ?? liveUserData?.idOffsetY ?? 0.5;
  const idFontSizeValue =
    liveUserData?.profileIdFontSize ?? liveUserData?.idFontSize ?? 11;

  const currentActiveAvatar =
    liveUserData?.animatedAvatar ||
    liveUserData?.photoURL ||
    defaultImages?.profileImage ||
    user?.photoURL ||
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>";
  const partnerAvatar =
    partnerData?.animatedAvatar ||
    partnerData?.photoURL ||
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>";

  return (
    <div
      className="flex-1 overflow-y-auto bg-[#1a0b2e] text-purple-50 pb-10"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => handleImageSelect(e, "photoURL")}
      />
      <input
        type="file"
        ref={headerInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => handleImageSelect(e, "headerURL")}
      />

      <div className="relative">
        <div
          className="h-44 w-full overflow-hidden relative group cursor-pointer"
          onClick={() => headerInputRef.current?.click()}
        >
          <img
            src={
              liveUserData?.headerURL ||
              defaultImages?.coverImage ||
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 300'><rect width='600' height='300' fill='%2312071f'/><circle cx='300' cy='150' r='100' fill='%23ffffff' fill-opacity='0.03'/></svg>"
            }
            className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all duration-300"
            alt="Cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a0b2e]/60 to-[#1a0b2e]"></div>
          {isImageUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
              <i className="fas fa-circle-notch animate-spin text-white"></i>
            </div>
          )}
        </div>
        <div className="absolute top-6 left-6 z-30 flex gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-xl flex items-center justify-center border border-white/10 shadow-lg text-white active:scale-95 transition-all"
          >
            <i className="fas fa-pen-to-square text-sm"></i>
          </button>
        </div>
        <div className="absolute top-28 right-6 left-6 flex items-center gap-3 z-20">
          <div
            className="relative flex-shrink-0 group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className={`${currentFrame ? "w-[84px] h-[84px]" : "w-[96px] h-[96px]"} relative flex items-center justify-center transition-all duration-300`}
            >
              <div className="w-[82%] h-[82%] rounded-full border-[3px] border-[#1a0b2e] shadow-2xl overflow-hidden bg-purple-900 z-10 relative">
                {liveUserData?.animatedAvatar ? (
                  isVideoUrl(liveUserData.animatedAvatar) ? (
                    <video
                      src={liveUserData.animatedAvatar}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover bg-slate-900"
                    />
                  ) : (
                    <img
                      src={liveUserData.animatedAvatar}
                      className="w-full h-full object-cover bg-slate-900"
                      alt="Profile"
                    />
                  )
                ) : (
                  <img
                    src={
                      liveUserData?.photoURL ||
                      defaultImages?.profileImage ||
                      user?.photoURL ||
                      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"
                    }
                    className={`w-full h-full object-cover group-hover:opacity-70 transition-all ${isImageUploading ? "opacity-50" : ""}`}
                    alt="Profile"
                  />
                )}
                {isImageUploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-circle-notch animate-spin text-white text-xs"></i>
                  </div>
                )}
              </div>
              {currentFrame && (
                <img
                  src={currentFrame}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 scale-[1.25]"
                  alt="frame"
                />
              )}
            </div>
          </div>
          <div className="flex flex-col min-w-0 flex-1 justify-center translate-y-3">
            <h2 className="text-[20.5px] font-bold text-white drop-shadow-2xl leading-normal -mt-1 pt-1 mb-0.5 truncate flex items-center gap-1.5">
              {userDisplayName}
              {liveUserData?.isVerified && (
                <svg className="w-5 h-5 text-blue-500 fill-current inline-block flex-shrink-0" viewBox="0 0 24 24" title="حساب موثق">
                  <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {userCustomIdIcon ? (
                  <div
                    className="relative w-[90px] h-[28px] flex items-center bg-contain bg-center bg-no-repeat animate-in zoom-in duration-300"
                    style={{ backgroundImage: `url(${userCustomIdIcon})` }}
                  >
                    <span
                      className="font-black text-white tracking-widest text-center w-full block drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                      style={{
                        paddingLeft: `${idX}px`,
                        paddingTop: `${idY}px`,
                        fontSize: `${idFontSizeValue}px`,
                      }}
                    >
                      {userCustomId}
                    </span>
                  </div>
                ) : (
                  <span
                    className={`text-[11px] font-black w-fit ${userCustomId === "OFFICIAL" ? "text-blue-400 bg-blue-500/10 border-blue-500/20" : "text-purple-300 bg-white/5 border-white/5"} px-3 py-1 rounded-xl border tracking-wider`}
                  >
                    ID: {userCustomId}
                  </span>
                )}

                {/* Copy ID Button */}
                <button
                  onClick={() => handleCopyId(userCustomId)}
                  className="w-7 h-7 flex items-center justify-center bg-white/5 text-purple-300 rounded-xl border border-white/5 cursor-pointer shadow-sm"
                  title={t("نسخ الآي دي", "Copy ID")}
                >
                  <i className="fas fa-copy text-[11px]"></i>
                </button>
              </div>

              {/* Gender and Region Info */}
              <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-xl border border-white/5">
                {liveUserData?.gender === "male" ? (
                  <i className="fas fa-mars text-blue-400 text-[10px]"></i>
                ) : liveUserData?.gender === "female" ? (
                  <i className="fas fa-venus text-pink-400 text-[10px]"></i>
                ) : null}
                {liveUserData?.regionFlag && (
                  <FlagIcon code={liveUserData?.regionCode} flagEmoji={liveUserData.regionFlag} className="w-5 h-[14px]" />
                )}
              </div>
            </div>

            {/* Compact Level Badges */}
            <div className="flex gap-2 mt-2 animate-in slide-in-from-left duration-500">
              {/* Wealth Badge */}
              {(() => {
                const info = getWealthLevelInfo(liveUserData?.wealthXP || 0);
                return (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${info.tier.border} ${info.tier.bg} backdrop-blur-md shadow-lg`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full ${info.tier.bar} flex items-center justify-center text-[8px] text-white`}
                    >
                      <i className="fas fa-crown"></i>
                    </div>
                    <span
                      className={`text-[10px] font-black ${info.tier.color}`}
                    >
                      {info.level}
                    </span>
                  </div>
                );
              })()}

              {/* Charisma Badge */}
              {(() => {
                const info = getCharismaLevelInfo(
                  liveUserData?.charismaXP || 0,
                );
                return (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${info.tier.border} ${info.tier.bg} backdrop-blur-md shadow-lg`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full ${info.tier.bar} flex items-center justify-center text-[8px] text-white`}
                    >
                      <i className="fas fa-heart"></i>
                    </div>
                    <span
                      className={`text-[10px] font-black ${info.tier.color}`}
                    >
                      {info.level}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mt-20 relative z-10">
        <div className="grid grid-cols-3 gap-2 w-full">
          {["friends", "following", "followers"].map((type) => {
            const count =
              type === "friends"
                ? dynamicFriendsCount
                : type === "following"
                  ? liveUserData?.following?.length || 0
                  : dynamicFollowersCount;

            return (
              <button
                key={type}
                onClick={() => setRelationsModal(type as "friends" | "following" | "followers")}
                className="bg-white/5 border border-white/5 p-3 rounded-2xl flex flex-col items-center"
              >
                <span className="text-lg font-black text-purple-400">
                  {count}
                </span>
                <span className="text-[9px] text-purple-300/60 font-black mt-1 uppercase">
                  {type === "friends"
                    ? t("أصدقاء", "Friends")
                    : type === "following"
                      ? t("متابعة", "Following")
                      : t("متابعين", "Followers")}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={() => setIsWalletOpen(true)}
            className="w-full flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl active:scale-[0.98] transition-all group hover:bg-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                <i className="fas fa-wallet text-lg"></i>
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white tracking-wide">
                  {t("المحفظة الإلكترونية", "My Wallet")}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-purple-300/60 font-black">
                    {userCoins.toLocaleString("en-US")}{" "}
                    <i className="fas fa-coins text-[8px] text-yellow-500"></i>
                  </span>
                  <span className="text-[10px] text-cyan-300/60 font-black">
                    {userDiamonds.toLocaleString("en-US")}{" "}
                    <i className="fas fa-gem text-[8px] text-cyan-400"></i>
                  </span>
                </div>
              </div>
            </div>
            <i
              className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-white/10`}
            ></i>
          </button>

          {liveUserData?.isAgency && (
            <button
              onClick={() => setIsAgencyWalletOpen(true)}
              className="w-full flex justify-between items-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl active:scale-[0.98] transition-all hover:bg-emerald-500/20 shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <i className="fas fa-vault text-lg"></i>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-sm text-emerald-100 tracking-wide">
                    {t("محفظة وكالة الشحن", "Shipping Agency Wallet")}
                  </span>
                  <span className="text-[10px] text-emerald-500/60 font-bold">
                    {t("رصيد الشحن: ", "Shipping Balance: ")}
                    {(liveUserData.agencyBalance || 0).toLocaleString(
                      "en-US",
                    )}{" "}
                    <i className="fas fa-coins text-[8px]"></i>
                  </span>
                </div>
              </div>
              <i
                className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-emerald-500/30`}
              ></i>
            </button>
          )}

          {/* New Levels Display Section */}
          <div className="flex flex-col gap-3 py-4 animate-in slide-in-from-bottom duration-500">
            <div className="grid grid-cols-2 gap-3">
              {/* Wealth Level Card */}
              {(() => {
                const info = getWealthLevelInfo(liveUserData?.wealthXP || 0);
                return (
                  <div
                    className={`p-4 rounded-[2rem] border ${info.tier.border} ${info.tier.bg} shadow-2xl relative overflow-hidden group transition-all duration-500`}
                  >
                    <div className="flex flex-col gap-2 relative z-10">
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-tighter ${info.tier.color} drop-shadow-md`}
                        >
                          {t("الثروة", "Wealth")}
                        </span>
                        <span
                          className={`text-xs font-black ${info.tier.color}`}
                        >
                          Lvl {info.level}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div
                          className={`h-full transition-all duration-1000 ease-out ${info.tier.bar} ${info.tier.glow} shadow-lg`}
                          style={{ width: `${info.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-black text-white/40 mt-0.5">
                        <span className="truncate">{info.tier.name}</span>
                        <span className="whitespace-nowrap">
                          +{info.xpRemaining.toLocaleString("en-US")}
                        </span>
                      </div>
                    </div>
                    {/* Decorative Background Icon */}
                    <i
                      className={`fas fa-crown absolute -bottom-4 -left-4 text-6xl opacity-[0.07] text-white group-hover:scale-125 transition-transform duration-700 blur-[0.5px]`}
                    ></i>
                  </div>
                );
              })()}

              {/* Charisma Level Card */}
              {(() => {
                const info = getCharismaLevelInfo(
                  liveUserData?.charismaXP || 0,
                );
                return (
                  <div
                    className={`p-4 rounded-[2rem] border ${info.tier.border} ${info.tier.bg} shadow-2xl relative overflow-hidden group transition-all duration-500`}
                  >
                    <div className="flex flex-col gap-2 relative z-10">
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-tighter ${info.tier.color} drop-shadow-md`}
                        >
                          {t("الجاذبية", "Charisma")}
                        </span>
                        <span
                          className={`text-xs font-black ${info.tier.color}`}
                        >
                          Lvl {info.level}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div
                          className={`h-full transition-all duration-1000 ease-out ${info.tier.bar} ${info.tier.glow} shadow-lg`}
                          style={{ width: `${info.progress}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-black text-white/40 mt-0.5">
                        <span className="truncate">{info.tier.name}</span>
                        <span className="whitespace-nowrap">
                          +{info.xpRemaining.toLocaleString("en-US")}
                        </span>
                      </div>
                    </div>
                    {/* Decorative Background Icon */}
                    <i
                      className={`fas fa-heart absolute -bottom-4 -left-4 text-6xl opacity-[0.07] text-white group-hover:scale-125 transition-transform duration-700 blur-[0.5px]`}
                    ></i>
                  </div>
                );
              })()}
            </div>
          </div>

          <button
            onClick={() => setIsStoreOpen(true)}
            className="w-full flex justify-between items-center p-4 bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-2xl active:scale-[0.98] transition-all group hover:from-purple-600/20 hover:to-pink-600/20 shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                <i className="fas fa-store text-lg"></i>
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white tracking-wide">
                  {t("متجر التميز", "Premium Mall")}
                </span>
                <span className="text-[10px] text-pink-300/60 font-black">
                  {t(
                    "إطارات • دخوليات • خلفيات",
                    "Frames • Entrances • Canvas",
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-pink-500/20 text-pink-400 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter">
                {t("جديد", "New")}
              </span>
              <i
                className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-white/10`}
              ></i>
            </div>
          </button>

          {/* New CP Button (Standard style outside) */}
          <button
            onClick={() => setIsCPPageOpen(true)}
            className="w-full flex justify-between items-center p-4 bg-gradient-to-r from-rose-600/10 to-pink-600/10 border border-rose-500/20 rounded-2xl active:scale-[0.98] transition-all group hover:from-rose-600/20 hover:to-pink-600/20 shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                <i className="fas fa-heart text-lg"></i>
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white tracking-wide">
                  {t("CP", "CP")}
                </span>
                <span className="text-[10px] text-rose-300/60 font-black">
                  {t("شريك الأحلام", "Dream Partner")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {liveUserData?.partnerUid && (
                <div className="w-6 h-6 rounded-full overflow-hidden shadow-sm animate-in zoom-in">
                  {isVideoUrl(partnerAvatar) ? (
                    <video
                      src={partnerAvatar}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={partnerAvatar}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}
              <i
                className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-white/10`}
              ></i>
            </div>
          </button>

          {/* Magic Button (Placeholder Design) */}
          <button
            onClick={() => {
              console.log("Magic button clicked");
            }}
            className="w-full flex justify-between items-center p-4 bg-gradient-to-r from-amber-500/5 via-violet-600/5 to-indigo-600/5 border border-amber-500/10 rounded-2xl active:scale-[0.98] transition-all group hover:from-amber-500/12 hover:via-violet-600/12 hover:to-indigo-600/12 shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/5 flex items-center justify-center text-amber-400/80 border border-amber-500/10 relative">
                <div className="relative w-6 h-6">
                  {/* Three stars cluster */}
                  <i className="fas fa-star text-sm absolute bottom-0 left-0 text-amber-400/90"></i>
                  <i className="fas fa-star text-[10px] absolute top-0 right-0 text-amber-300/80"></i>
                  <i className="fas fa-star text-[7px] absolute top-1.5 left-1 text-amber-200/60"></i>
                </div>
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white tracking-wide">
                  Magic
                </span>
                <span className="text-[10px] text-amber-300/40 font-black">
                  {t("ميزة السحر قريباً", "Magical features coming soon")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/10 text-amber-400/60 text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-tighter/50">
                {t("قريباً", "Soon")}
              </span>
              <i
                className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-white/10`}
              ></i>
            </div>
          </button>

          <button
            onClick={() => {
              setIsSettingsOpen(true);
              setSettingsView("main");
            }}
            className="w-full flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl active:scale-[0.98] transition-all group hover:bg-white/10"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-slate-500/20 flex items-center justify-center text-slate-300">
                <i className="fas fa-cog text-lg"></i>
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm text-white tracking-wide">
                  {t("إعدادات الحساب", "Account Settings")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasUnreadSupport && (
                <span className="w-1.5 h-1.5 bg-red-800 rounded-full"></span>
              )}
              <i
                className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-white/10`}
              ></i>
            </div>
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsAdminPanelOpen(true)}
              className="w-full flex justify-between items-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl active:scale-[0.98] transition-all hover:bg-yellow-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                  <i className="fas fa-user-shield text-lg"></i>
                </div>
                <span className="font-bold text-sm text-yellow-100 tracking-wide">
                  {t("لوحة تحكم المسؤول", "Admin Dashboard")}
                </span>
              </div>
              <i
                className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-yellow-500/30`}
              ></i>
            </button>
          )}

          {isOfficialAdmin && (
            <button
              onClick={() => setIsAgencyManagementOpen(true)}
              className="w-full flex justify-between items-center p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl active:scale-[0.98] transition-all hover:bg-indigo-500/20 shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <i className="fas fa-building-shield text-lg"></i>
                </div>
                <span className="font-bold text-sm text-indigo-100 tracking-wide">
                  {t("إدارة وكالات الشحن", "Agency Management")}
                </span>
              </div>
              <i
                className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-indigo-500/30`}
              ></i>
            </button>
          )}

          {(auth.currentUser?.email === "admin@yalla.com" ||
            liveUserData?.isGM) && (
            <button
              onClick={() => setIsGMPageOpen(true)}
              className="w-full flex justify-between items-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl active:scale-[0.98] transition-all hover:bg-blue-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <i className="fas fa-users-cog text-lg"></i>
                </div>
                <span className="font-bold text-sm text-blue-100 tracking-wide">
                  {t("نظام المدير العام", "General Manager System")}
                </span>
              </div>
              <i
                className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-blue-500/30`}
              ></i>
            </button>
          )}

          {(auth.currentUser?.email === "admin@yalla.com" ||
            auth.currentUser?.email === "adhamyosry56@gmail.com" ||
            liveUserData?.canBan) && (
            <button
              onClick={() => setIsBanSystemOpen(true)}
              className="w-full flex justify-between items-center p-4 bg-red-500/10 border border-red-500/20 rounded-2xl active:scale-[0.98] transition-all hover:bg-red-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500">
                  <i className="fas fa-user-slash text-lg"></i>
                </div>
                <span className="font-bold text-sm text-red-100 tracking-wide">
                  {t("نظام حظر المستخدمين", "User Ban System")}
                </span>
              </div>
              <i
                className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-red-500/30`}
              ></i>
            </button>
          )}

          {auth.currentUser?.email === "admin@yalla.com" && (
            <button
              onClick={() => setIsBanLogsOpen(true)}
              className="w-full flex justify-between items-center p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl active:scale-[0.98] transition-all hover:bg-orange-500/20"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                  <i className="fas fa-history text-lg"></i>
                </div>
                <span className="font-bold text-sm text-orange-100 tracking-wide">
                  {t("سجل عمليات الحظر", "Ban Operations Log")}
                </span>
              </div>
              <i
                className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-orange-500/30`}
              ></i>
            </button>
          )}

          {auth.currentUser?.email === "admin@yalla.com" && (
            <button
              onClick={() => setIsGamesControlPanelOpen(true)}
              className="w-full flex justify-between items-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl active:scale-[0.98] transition-all hover:bg-emerald-500/20 shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <i className="fas fa-gamepad text-lg"></i>
                </div>
                <span className="font-bold text-sm text-emerald-100 tracking-wide">
                  {t("لوحة تحكم الألعاب", "Games Control Panel")}
                </span>
              </div>
              <i
                className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-emerald-500/30`}
              ></i>
            </button>
          )}
        </div>
      </div>

      {isWalletOpen && (
        <div className="fixed inset-0 z-[500] bg-[#0d051a]/98 backdrop-blur-2xl flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-[320px] flex flex-col gap-5">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setWalletTab("coins")}
                  className={`text-sm font-black transition-all relative ${walletTab === "coins" ? "text-white" : "text-white/30"}`}
                >
                  {t("الكوينز", "Coins")}
                  {walletTab === "coins" && (
                    <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-yellow-500 rounded-full"></div>
                  )}
                </button>
                <button
                  onClick={() => setWalletTab("diamonds")}
                  className={`text-sm font-black transition-all relative ${walletTab === "diamonds" ? "text-white" : "text-white/30"}`}
                >
                  {t("الماس", "Diamonds")}
                  {walletTab === "diamonds" && (
                    <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-cyan-400 rounded-full"></div>
                  )}
                </button>
              </div>
              <button
                onClick={() => setIsWalletOpen(false)}
                className="w-10 h-10 rounded-full bg-white/5 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            {walletTab === "coins" ? (
              <div className="relative w-full aspect-[1.7/1] rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#cda34b] via-[#b68e41] to-[#735b2e] shadow-2xl p-6 flex flex-col justify-between animate-in zoom-in duration-300">
                <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/5 to-transparent"></div>
                <div className="flex justify-between items-start z-10">
                  <span className="text-[9px] font-black text-[#3d3118] uppercase tracking-[0.2em] opacity-40">
                    Private Wallet
                  </span>
                  <div className="text-[#3d3118] font-black text-sm italic opacity-60">
                    COINS
                  </div>
                </div>
                <div className="flex flex-col items-center z-10">
                  <div className="flex items-center gap-2.5">
                    <i className="fas fa-coins text-[#3d3118] text-2xl opacity-60"></i>
                    <span className="text-3xl font-black text-[#2a2210]">
                      {userCoins.toLocaleString("en-US")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col z-10">
                  <span className="text-[11.5px] font-[855] text-[#2a2210] tracking-widest uppercase truncate flex items-center gap-1">
                    {userDisplayName}
                    {liveUserData?.isVerified && (
                      <svg className="w-3.5 h-3.5 text-blue-500 fill-current inline-block flex-shrink-0" viewBox="0 0 24 24" title="حساب موثق">
                        <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                      </svg>
                    )}
                  </span>
                  <span className="text-[9px] font-bold text-[#3d3118] opacity-60">
                    ID {userCustomId}
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative w-full aspect-[1.7/1] rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#083344] via-[#0e7490] to-[#083344] shadow-2xl p-6 flex flex-col justify-between animate-in zoom-in duration-300">
                <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/10 to-transparent"></div>
                <div className="flex justify-between items-start z-10">
                  <span className="text-[9px] font-black text-cyan-300/40 uppercase tracking-[0.2em]">
                    Private Wallet
                  </span>
                  <div className="text-white font-black text-sm italic opacity-80">
                    DIAMONDS
                  </div>
                </div>
                <div className="flex flex-col items-center z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <i className="fas fa-gem text-white text-xl"></i>
                    </div>
                    <span className="text-3xl font-black text-white drop-shadow-lg">
                      {userDiamonds.toLocaleString("en-US")}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-end z-10 w-full">
                  <div className="flex flex-col items-start text-start">
                    <span className="text-[11.5px] font-[855] text-white tracking-widest uppercase truncate drop-shadow-md flex items-center gap-1">
                      {userDisplayName}
                      {liveUserData?.isVerified && (
                        <svg className="w-3.5 h-3.5 text-blue-500 fill-current inline-block flex-shrink-0" viewBox="0 0 24 24" title="حساب موثق">
                          <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                        </svg>
                      )}
                    </span>
                    <span className="text-[9px] font-bold text-white/80">
                      ID {userCustomId}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowConvertModal(true);
                    }}
                    disabled={userDiamonds <= 0}
                    className="px-3 py-1.5 bg-cyan-400/10 backdrop-blur-md border border-cyan-400/20 rounded-xl text-[9px] font-black text-white shadow-xl active:scale-95 transition-all flex items-center gap-1.5 hover:bg-cyan-400/20 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-arrows-rotate text-[8px]"></i>
                    {t("فك الماس", "Unwrap Diamonds")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Conversion Modal */}
          {showConvertModal && (
            <div className="fixed inset-0 z-[600] bg-[#0d051a]/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-gradient-to-br from-[#083344] via-[#0e7490] to-[#083344] w-full max-w-[320px] rounded-[2.5rem] p-6 shadow-2xl flex flex-col gap-6 relative overflow-hidden animate-in zoom-in duration-300">
                <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

                {/* Mimic Card Header */}
                <div className="flex justify-end items-start z-10 opacity-40">
                  <div className="text-white font-black text-sm italic">
                    DIAMONDS
                  </div>
                </div>

                <div className="text-center space-y-1 z-10">
                  <h4 className="text-white font-black text-xl drop-shadow-lg">
                    {t("فك الماس", "Unwrap Diamonds")}
                  </h4>
                  <p className="text-[10px] text-cyan-200/60 font-bold uppercase tracking-widest">
                    {t("تحويل مباشر بدون رسوم 100%", "Direct conversion, 100% free")}
                  </p>
                </div>

                <div className="space-y-4 z-10">
                  <div className="bg-black/20 backdrop-blur-md p-5 rounded-[2rem] shadow-inner flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-white/40 font-black">
                        {t("الكمية المراد تحويلها", "Amount to Convert")}
                      </span>
                      <div className="h-6 px-2.5 bg-cyan-400/20 rounded-full flex items-center justify-center gap-1 shadow-sm">
                        <span className="text-[9px] text-cyan-300 font-black leading-none">
                          {userDiamonds.toLocaleString("en-US")}
                        </span>
                        <i className="fas fa-gem text-cyan-300 text-[7.5px] leading-none mb-[0.5px]"></i>
                      </div>
                    </div>
                    <div className="relative w-full h-14 bg-cyan-950/40 rounded-2xl flex items-center justify-center transition-all duration-300">
                      <input
                        type="number"
                        min="0"
                        max={userDiamonds}
                        value={convertAmount}
                        onChange={(e) => {
                          const rawVal = e.target.value;
                          // Convert any Arabic/Hindi numerals to standard English numbers
                          const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                          const converted = rawVal.replace(/[٠-٩]/g, (d) => arabicDigits.indexOf(d).toString());
                          const cleaned = converted.replace(/[^0-9]/g, "");
                          
                          if (cleaned === "") {
                            setConvertAmount("");
                            return;
                          }
                          
                          const val = parseInt(cleaned, 10);
                          if (!isNaN(val)) {
                            if (val > userDiamonds) {
                              setConvertAmount(userDiamonds.toString());
                            } else if (val < 0) {
                              setConvertAmount("0");
                            } else {
                              setConvertAmount(val.toString());
                            }
                          } else {
                            setConvertAmount("");
                          }
                        }}
                        onKeyDown={(e) => {
                          // Prevent typing extra digits if the value is already at max
                          const isDigit = /^[0-9٠-٩]$/.test(e.key);
                          if (isDigit) {
                            const currentVal = parseInt(convertAmount || "0", 10);
                            const nextValueStr = (convertAmount || "") + e.key;
                            const nextVal = parseInt(nextValueStr.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString()), 10);
                            if (nextVal > userDiamonds) {
                              e.preventDefault();
                              setConvertAmount(userDiamonds.toString());
                            }
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                        className="w-full h-full bg-transparent text-3xl font-black text-white outline-none text-center placeholder:text-cyan-400/20 py-0 m-0 leading-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none flex items-center justify-center"
                        style={{ boxSizing: "border-box" }}
                      />
                    </div>
                  </div>

                  {convertAmount && parseInt(convertAmount) > 0 && (
                    <div className="flex flex-col items-center gap-2 animate-in slide-in-from-top duration-300">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <i className="fas fa-arrow-down text-cyan-400 text-sm"></i>
                      </div>
                      <div className="bg-yellow-500/10 px-6 py-3 rounded-2xl backdrop-blur-sm shadow-xl">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-yellow-500/60 font-black uppercase mb-1">
                            {t("الرصيد المستلم", "Received Balance")}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-yellow-400">
                              {parseInt(convertAmount).toLocaleString("en-US")}
                            </span>
                            <i className="fas fa-coins text-yellow-500"></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 z-10">
                  <button
                    onClick={handleConvertDiamonds}
                    disabled={
                      isUpdating ||
                      !convertAmount ||
                      parseInt(convertAmount) <= 0
                    }
                    className="flex-[2] bg-white text-[#083344] py-4 rounded-2xl text-xs font-black shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUpdating ? (
                      <i className="fas fa-spinner animate-spin"></i>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        <span>{t("تأكيد الفك", "Confirm Unwrap")}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowConvertModal(false)}
                    className="flex-1 bg-black/20 backdrop-blur-md py-4 rounded-2xl text-xs font-black text-white active:scale-95 transition-all"
                  >
                    {t("تراجع", "Cancel")}
                  </button>
                </div>

                {/* Decorative background gem */}
                <i className="fas fa-gem absolute -bottom-10 -right-10 text-[180px] text-white/5 blur-[2px] transform rotate-12"></i>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CP Internal Page */}
      {isCPPageOpen && (
        <div className="fixed inset-0 z-[550] bg-[#1a0b2e] flex flex-col animate-in slide-in-from-bottom duration-300">
          {/* Dynamic Full Screen Background */}
          <div className="absolute inset-0 z-0">
            {cpConfig?.backgroundUrl ? (
              isVideoUrl(cpConfig.backgroundUrl) ? (
                <video
                  src={cpConfig.backgroundUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={cpConfig.backgroundUrl}
                  className="w-full h-full object-cover"
                />
              )
            ) : (
              <div className="w-full h-full bg-[#1a0b2e]"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
          </div>

          {/* Transparent Minimalist Controls directly over background */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20 pointer-events-none">
            <button
              onClick={() => setIsCPPageOpen(false)}
              className="w-11 h-11 rounded-full bg-black/20 backdrop-blur-xl text-white flex items-center justify-center border border-white/10 active:scale-90 transition-all shadow-2xl pointer-events-auto"
            >
              <i className="fas fa-times"></i>
            </button>
            <h3 className="text-xl font-black text-white drop-shadow-xl pointer-events-auto">
              {t("شريك الأحلام (CP)", "Dream Partner (CP)")}
            </h3>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12 relative z-10">
            <div className="flex items-center justify-center gap-4">
              {/* User Photo Circle */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.3)] overflow-hidden bg-slate-900">
                  {isVideoUrl(currentActiveAvatar) ? (
                    <video
                      src={currentActiveAvatar}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={currentActiveAvatar}
                      className="w-full h-full object-cover"
                      alt="Me"
                    />
                  )}
                </div>
                <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest drop-shadow-lg">
                  {t("أنا", "Me")}
                </span>
              </div>

              {/* Connector Heart Icon */}
              <div
                className={`w-28 h-28 flex items-center justify-center ${liveUserData?.partnerUid ? "animate-pulse" : ""}`}
              >
                {cpConfig?.middleIconUrl ? (
                  <img
                    src={cpConfig.middleIconUrl}
                    className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]"
                  />
                ) : (
                  <i className="fas fa-heart text-rose-500/60 text-6xl drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]"></i>
                )}
              </div>

              {/* Partner Circle or Plus */}
              <div className="flex flex-col items-center gap-3">
                {liveUserData?.partnerUid ? (
                  <div className="w-20 h-20 rounded-full shadow-[0_0_20px_rgba(244,63,94,0.3)] overflow-hidden bg-slate-900 animate-in zoom-in">
                    {isVideoUrl(partnerAvatar) ? (
                      <video
                        src={partnerAvatar}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={partnerAvatar}
                        className="w-full h-full object-cover"
                        alt="Partner"
                      />
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCPRequestModal(true)}
                    className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center text-white/40 active:scale-95 transition-all hover:bg-white/10 group shadow-2xl"
                  >
                    <i className="fas fa-plus text-xl group-hover:text-rose-500 transition-colors"></i>
                  </button>
                )}
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest drop-shadow-lg">
                  {liveUserData?.partnerUid
                    ? partnerData?.displayName
                    : t("إضافة شريك", "Add Partner")}
                </span>
              </div>
            </div>

            {!liveUserData?.partnerUid ? (
              <div className="text-center max-w-[280px] space-y-6">
                <div className="space-y-2">
                  <h4 className="text-white font-black text-base drop-shadow-lg">
                    {t("لم يتم العثور على شريك بعد", "No Partner Found Yet")}
                  </h4>
                  <p className="text-[11px] text-white/60 leading-relaxed font-bold drop-shadow-md">
                    {t(
                      "قم بدعوة صديقك المفضل ليصبح شريك الأحلام الخاص بك وتظهر علاقتكما المميزة في ملفاتكما الشخصية.",
                      "Invite your best friend to become your Dream Partner and show off your special bond on your profiles.",
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setShowCPRequestModal(true)}
                  className="px-10 py-4 bg-rose-500/5 backdrop-blur-md border border-rose-500/20 rounded-2xl text-rose-500 font-black text-xs shadow-2xl active:scale-95 transition-all"
                >
                  {t("بحث عن صديق بالـ ID", "Find Friend by ID")}
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4 animate-in fade-in">
                <p className="text-[11px] text-rose-300 font-black uppercase tracking-widest drop-shadow-lg">
                  {t("لقد وجدت شريك أحلامك!", "You found your dream partner!")}
                </p>
                <button
                  onClick={() => setShowCPBreakupModal(true)}
                  className="bg-black/30 backdrop-blur-md px-6 py-2 rounded-full text-white/60 hover:text-red-400 transition-colors text-[9px] font-black uppercase border border-white/5"
                >
                  {t("إنهاء العلاقة", "End Relationship")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CP Request ID Modal */}
      {showCPRequestModal && (
        <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[#1a0b2e] w-full max-w-[300px] rounded-[2rem] border border-white/10 p-6 shadow-2xl flex flex-col gap-6">
            <div className="text-center space-y-1">
              <h4 className="text-white font-black text-sm">
                {t("ارتباط جديد", "New Connection")}
              </h4>
              <p className="text-[10px] text-white/40 font-bold">
                {t("ادخل ID صديقك المفضل", "Enter your best friend's ID")}
              </p>
            </div>
            <input
              type="text"
              value={partnerSearchId}
              onChange={(e) => setPartnerSearchId(e.target.value)}
              placeholder={t("ID الصديق...", "Friend ID...")}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none text-center font-black"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSearchPartner}
                disabled={isSearchingPartner || !partnerSearchId.trim()}
                className="flex-1 bg-rose-500/5 backdrop-blur-md border border-rose-500/20 py-3.5 rounded-xl text-[11px] font-black text-rose-500 shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {isSearchingPartner ? (
                  <i className="fas fa-spinner animate-spin"></i>
                ) : (
                  t("بحث وإرسال", "Search & Send")
                )}
              </button>
              <button
                onClick={() => setShowCPRequestModal(false)}
                className="flex-1 bg-white/5 py-3.5 rounded-xl text-[11px] font-black text-white border border-white/10 active:scale-95"
              >
                {t("إلغاء", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CP Confirmation Modal (50M Coins) */}
      {showCPConfirmModal && (
        <div className="fixed inset-0 z-[750] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
          <div className="bg-[#1a0b2e] w-full max-w-[320px] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-rose-500 p-1">
              <img
                src={showCPConfirmModal.photo}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div className="space-y-2">
              <h4 className="text-white font-black text-sm">
                {t("تأكيد طلب الارتباط", "Confirm Connection Request")}
              </h4>
              <p className="text-[11px] text-rose-300 font-bold">
                {t(
                  "هل أنت متأكد من طلب الارتباط بـ ",
                  "Are you sure you want to connection link with ",
                )}
                {showCPConfirmModal.name}؟
              </p>
            </div>
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 w-full">
              <p className="text-[10px] text-white/60 font-bold mb-1">
                {t("تكلفة الطلب:", "Request Cost:")}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-black text-yellow-500">
                  50,000,000
                </span>
                <i className="fas fa-coins text-yellow-500 text-sm"></i>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleSendCPRequest}
                disabled={isUpdating}
                className="w-full bg-[#8c52ff] py-4 rounded-2xl text-[12px] font-black text-white shadow-xl active:scale-95 transition-all border border-white/10"
              >
                {isUpdating ? (
                  <i className="fas fa-spinner animate-spin"></i>
                ) : (
                  t("نعم، أرسل الطلب", "Yes, Send Request")
                )}
              </button>
              <button
                onClick={() => setShowCPConfirmModal(null)}
                className="w-full py-3 text-[11px] font-black text-white/40 hover:text-white transition-colors"
              >
                {t("تراجع", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CP Breakup Confirmation Modal (100M Coins Compensation) */}
      {showCPBreakupModal && (
        <div className="fixed inset-0 z-[750] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in">
          <div className="bg-[#1a0b2e] w-full max-w-[320px] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl flex flex-col items-center gap-6 text-center">
            <div className="w-16 h-16 rounded-full border-2 border-red-500 p-1">
              <i className="fas fa-heart-broken text-red-500 text-3xl flex items-center justify-center h-full"></i>
            </div>
            <div className="space-y-2">
              <h4 className="text-white font-black text-sm">
                {t("تأكيد إنهاء العلاقة", "Confirm Dissolution")}
              </h4>
              <p className="text-[11px] text-red-300 font-bold leading-relaxed">
                {t(
                  "سيتم تعويض شريكك بـ 100,000,000 عملة ذهبية مقابل فك الارتباط. هل أنت متأكد؟",
                  "Your partner will be compensated 100M coins for linking dissolution. Are you sure?",
                )}
              </p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 w-full">
              <p className="text-[10px] text-white/60 font-bold mb-1">
                {t("رسوم التعويض:", "Compensation Fee:")}
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl font-black text-yellow-500">
                  100,000,000
                </span>
                <i className="fas fa-coins text-yellow-500 text-sm"></i>
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleConfirmBreakup}
                disabled={isUpdating}
                className="w-full bg-red-600 py-4 rounded-2xl text-[12px] font-black text-white shadow-xl active:scale-95 transition-all border border-white/10"
              >
                {isUpdating ? (
                  <i className="fas fa-spinner animate-spin"></i>
                ) : (
                  t("نعم، فك الارتباط", "Yes, Dissolve Link")
                )}
              </button>
              <button
                onClick={() => setShowCPBreakupModal(false)}
                className="w-full py-3 text-[11px] font-black text-white/40 hover:text-white transition-colors"
              >
                {t("تراجع", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      <StoreModal
        isOpen={isStoreOpen}
        onClose={() => setIsStoreOpen(false)}
        user={user}
        userCoins={userCoins}
        userPhoto={currentActiveAvatar}
        currentFrame={liveUserData?.currentFrame || null}
        currentEntry={liveUserData?.currentEntry || null}
        onOpenWallet={() => {
          setIsStoreOpen(false);
          setIsWalletOpen(true);
        }}
      />

      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        isOfficialAdmin={isOfficialAdmin}
      />

      <GamesControlPanel
        isOpen={isGamesControlPanelOpen}
        onClose={() => setIsGamesControlPanelOpen(false)}
      />

      <GMPage
        isOpen={isGMPageOpen}
        onClose={() => setIsGMPageOpen(false)}
        onOpenBanSystem={() => setIsBanSystemOpen(true)}
        onOpenBanLogs={() => setIsBanLogsOpen(true)}
        onOpenGiveItems={() => setIsGiveItemsOpen(true)}
        onOpenRoomsManagement={() => setIsRoomsManagementOpen(true)}
        onOpenRoomReports={() => setIsRoomReportsOpen(true)}
        language={language}
      />

      <GiveItemsModal
        isOpen={isGiveItemsOpen}
        onClose={() => setIsGiveItemsOpen(false)}
        language={language}
      />

      <RoomsManagementModal
        isOpen={isRoomsManagementOpen}
        onClose={() => setIsRoomsManagementOpen(false)}
        language={language}
      />

      <RoomReportsModal
        isOpen={isRoomReportsOpen}
        onClose={() => setIsRoomReportsOpen(false)}
        language={language}
      />

      <AgencyManagementModal
        isOpen={isAgencyManagementOpen}
        onClose={() => setIsAgencyManagementOpen(false)}
      />
      <AgencyWalletModal
        isOpen={isAgencyWalletOpen}
        onClose={() => setIsAgencyWalletOpen(false)}
        userBalance={liveUserData?.agencyBalance || 0}
      />

      <BanSystemModal
        isOpen={isBanSystemOpen}
        onClose={() => setIsBanSystemOpen(false)}
        language={language}
      />

      <BanLogsModal
        isOpen={isBanLogsOpen}
        onClose={() => setIsBanLogsOpen(false)}
        language={language}
      />

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[550] bg-[#1a0b2e] flex flex-col animate-in slide-in-from-bottom duration-300">
          <header className="p-5 flex justify-between items-center border-b border-white/5 bg-[#0d051a]">
            {settingsView !== "main" ? (
              <button
                onClick={() => setSettingsView("main")}
                className="w-10 h-10 rounded-full bg-white/5 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all"
              >
                <i
                  className={`fas ${language === "ar" ? "fa-arrow-right" : "fa-arrow-left"}`}
                ></i>
              </button>
            ) : (
              <div className="w-10"></div>
            )}

            <h3 className="text-lg font-black text-white">
              {settingsView === "main"
                ? t("إعدادات الحساب", "Account Settings")
                : settingsView === "email"
                  ? t("تغيير بريد الحساب", "Change Account Email")
                  : settingsView === "password"
                    ? t("تغيير كلمة المرور", "Change Password")
                    : settingsView === "language"
                      ? t("لغة التطبيق", "App Language")
                      : t("الدعم الفني", "Technical Support")}
            </h3>

            <button
              onClick={() => {
                setIsSettingsOpen(false);
                setSettingsView("main");
              }}
              className="w-10 h-10 rounded-full bg-white/5 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all"
            >
              <i className="fas fa-times"></i>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col">
            {settingsView === "main" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <button
                  onClick={() => setSettingsView("language")}
                  className="w-full flex justify-between items-center p-5 bg-white/5 border border-white/5 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-white/10 shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-pink-600/20 flex items-center justify-center text-pink-400">
                      <i className="fas fa-globe text-xl"></i>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-black text-sm text-white tracking-wide">
                        {t("اللغة", "Language")}
                      </span>
                      <span className="text-[10px] text-white/30 font-bold">
                        {t(
                          "اختر لغة التطبيق المفضلة",
                          "Choose preferred app language",
                        )}
                      </span>
                    </div>
                  </div>
                  <i
                    className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-white/10`}
                  ></i>
                </button>

                <button
                  onClick={() => setSettingsView("email")}
                  className="w-full flex justify-between items-center p-5 bg-white/5 border border-white/5 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-white/10 shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-blue-600/20 flex items-center justify-center text-blue-400">
                      <i className="fas fa-envelope text-xl"></i>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-black text-sm text-white tracking-wide">
                        {t("تغيير بريد الحساب", "Change Account Email")}
                      </span>
                      <span className="text-[10px] text-white/30 font-bold">
                        {t(
                          "تحديث البريد الإلكتروني الخاص بدخولك",
                          "Update your sign-in email address",
                        )}
                      </span>
                    </div>
                  </div>
                  <i
                    className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-white/10`}
                  ></i>
                </button>

                <button
                  onClick={() => setSettingsView("password")}
                  className="w-full flex justify-between items-center p-5 bg-white/5 border border-white/5 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-white/10 shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-purple-600/20 flex items-center justify-center text-purple-400">
                      <i className="fas fa-key text-xl"></i>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-black text-sm text-white tracking-wide">
                        {t("تغيير كلمة المرور", "Change Password")}
                      </span>
                      <span className="text-[10px] text-white/30 font-bold">
                        {t(
                          "تحديث مفتاح الأمان الخاص بحسابك",
                          "Update your account security key",
                        )}
                      </span>
                    </div>
                  </div>
                  <i
                    className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-white/10`}
                  ></i>
                </button>

                <button
                  onClick={() => setSettingsView("support")}
                  className="w-full flex justify-between items-center p-5 bg-emerald-600/10 border border-emerald-500/20 rounded-[2rem] active:scale-[0.98] transition-all hover:bg-emerald-600/20 shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.2rem] bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                      <i className="fas fa-headset text-xl"></i>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-black text-sm text-white tracking-wide">
                        {t("الدعم الفني", "Technical Support")}
                      </span>
                      <span className="text-[10px] text-emerald-300/60 font-bold">
                        {t(
                          "تواصل مباشر مع فريق الدعم",
                          "Direct contact with support team",
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUnreadSupport && (
                      <span className="w-1.5 h-1.5 bg-red-800 rounded-full"></span>
                    )}
                    <i
                      className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-white/10`}
                    ></i>
                  </div>
                </button>

                <div className="pt-8 mt-8 border-t border-white/5">
                  <button
                    onClick={() => {
                      signOut(auth);
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex justify-between items-center p-4 bg-red-600/10 border border-red-500/20 rounded-full active:scale-[0.98] transition-all hover:bg-red-600/20 shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-red-600/20 flex items-center justify-center text-red-400">
                        <i className="fas fa-sign-out-alt text-lg"></i>
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-sm text-white tracking-wide">
                          {t("تسجيل الخروج من الحساب", "Logout of Account")}
                        </span>
                      </div>
                    </div>
                    <i
                      className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-xs text-white/10`}
                    ></i>
                  </button>
                </div>
              </div>
            )}

            {settingsView === "language" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-3 shadow-xl overflow-hidden">
                  {/* Arabic */}
                  <button
                    onClick={() => setLanguage("ar")}
                    className="w-full flex justify-between items-center p-4 rounded-2xl transition-all hover:bg-white/5 active:scale-95 text-right"
                    style={{ direction: language === "ar" ? "rtl" : "ltr" }}
                  >
                    <span className="font-black text-sm text-white">
                      العربية
                    </span>
                    {language === "ar" && (
                      <i className="fas fa-check text-purple-400 text-sm"></i>
                    )}
                  </button>

                  {/* Thin elegant line */}
                  <div className="h-[1px] bg-white/10 my-1 mx-2"></div>

                  {/* English */}
                  <button
                    onClick={() => setLanguage("en")}
                    className="w-full flex justify-between items-center p-4 rounded-2xl transition-all hover:bg-white/5 active:scale-95 text-right"
                    style={{ direction: language === "ar" ? "rtl" : "ltr" }}
                  >
                    <span className="font-black text-sm text-white">
                      English
                    </span>
                    {language === "en" && (
                      <i className="fas fa-check text-purple-400 text-sm"></i>
                    )}
                  </button>

                  {/* Thin elegant line */}
                  <div className="h-[1px] bg-white/10 my-1 mx-2"></div>

                  {/* Simplified Chinese */}
                  <button
                    onClick={() => setLanguage("zh")}
                    className="w-full flex justify-between items-center p-4 rounded-2xl transition-all hover:bg-white/5 active:scale-95 text-right"
                    style={{ direction: language === "ar" ? "rtl" : "ltr" }}
                  >
                    <span className="font-black text-sm text-white">
                      简体中文 (Chinese)
                    </span>
                    {language === "zh" && (
                      <i className="fas fa-check text-purple-400 text-sm"></i>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-white/40 font-bold text-center px-4 leading-relaxed">
                  {t(
                    "تغيير اللغة سيقوم بتحويل واجهة التطبيق بالكامل مع دعم اتجاه النصوص المناسب.",
                    "Changing language will dynamically convert the entire application interface and layout directions.",
                  )}
                </p>
              </div>
            )}

            {settingsView === "email" && (
              <div className="space-y-6 animate-in slide-in-from-left duration-300">
                <div className="bg-blue-600/10 p-6 rounded-[2rem] border border-blue-500/20">
                  <p className="text-[11px] text-blue-200/70 leading-relaxed font-bold">
                    {t(
                      "* ملاحظة: عند تغيير البريد الإلكتروني، ستحتاج لاستخدامه في المرة القادمة لتسجيل الدخول. تأكد من أن البريد الجديد صالح وتستطيع الوصول إليه.",
                      "* Note: When changing email, you will need to use it next time to log in. Make sure the new email is valid and accessible.",
                    )}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">
                      {t("البريد الإلكتروني الجديد", "New Email Address")}
                    </label>
                    <input
                      type="email"
                      value={newAccountEmail}
                      onChange={(e) => setNewAccountEmail(e.target.value)}
                      placeholder="mail@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-6 text-sm text-white outline-none focus:border-purple-500 transition-all shadow-inner"
                    />
                  </div>
                  <button
                    onClick={handleUpdateEmail}
                    disabled={isUpdating}
                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[1.5rem] text-sm font-black shadow-xl active:scale-95 transition-all border border-white/10 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <i className="fas fa-spinner animate-spin"></i>
                    ) : (
                      t("تأكيد وحفظ البريد الجديد", "Confirm & Save New Email")
                    )}
                  </button>
                </div>
              </div>
            )}

            {settingsView === "password" && (
              <div className="space-y-6 animate-in slide-in-from-left duration-300">
                <div className="bg-purple-600/10 p-6 rounded-[2rem] border border-blue-500/20">
                  <p className="text-[11px] text-purple-200/70 leading-relaxed font-bold">
                    {t(
                      "* ملاحظة: يجب أن تكون كلمة المرور قوية (6 أحرف على الأقل). سيتم تطبيق التغيير فوراً على حسابك.",
                      "* Note: The password must be strong (at least 6 characters). The change will be applied immediately to your account.",
                    )}
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">
                      {t("كلمة المرور الجديدة", "New Password")}
                    </label>
                    <input
                      type="password"
                      value={newAccountPassword}
                      onChange={(e) => setNewAccountPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 px-6 text-sm text-white outline-none focus:border-purple-500 transition-all shadow-inner"
                    />
                  </div>
                  <button
                    onClick={handleUpdatePassword}
                    disabled={isUpdating}
                    className="w-full py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-[1.5rem] text-sm font-black shadow-xl active:scale-95 transition-all border border-white/10 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <i className="fas fa-spinner animate-spin"></i>
                    ) : (
                      t("تأكيد وحفظ كلمة المرور", "Confirm & Save Password")
                    )}
                  </button>
                </div>
              </div>
            )}

            {settingsView === "support" && (
              <div className="flex-1 flex flex-col h-full animate-in slide-in-from-left duration-300">
                <div className="flex-1 overflow-y-auto space-y-4 px-1 py-4 scrollbar-hide min-h-[300px]">
                  {supportChat.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4 mt-20">
                      <i className="fas fa-comments text-5xl"></i>
                      <p className="text-xs font-black text-center max-w-[200px]">
                        {t(
                          "أهلاً بك في الدعم الفني، اكتب رسالتك وسنقوم بالرد عليك في أقرب وقت.",
                          "Welcome to support chat, write your message and we will respond as soon as possible.",
                        )}
                      </p>
                    </div>
                  ) : (
                    supportChat.map((msg, i) => {
                      const isFromMe = msg.senderId === user?.uid;
                      return (
                        <div
                          key={msg.id || i}
                          className={`flex items-start gap-3 ${isFromMe ? "flex-row-reverse" : ""} animate-in fade-in`}
                        >
                          <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 shadow-lg bg-slate-900">
                            {isFromMe ? (
                              liveUserData?.animatedAvatar ? (
                                isVideoUrl(liveUserData.animatedAvatar) ? (
                                  <video
                                    src={liveUserData.animatedAvatar}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <img
                                    src={liveUserData.animatedAvatar}
                                    className="w-full h-full object-cover"
                                  />
                                )
                              ) : (
                                <img
                                  src={
                                    liveUserData?.photoURL ||
                                    user?.photoURL ||
                                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"
                                  }
                                  className="w-full h-full object-cover"
                                />
                              )
                            ) : (
                              <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white">
                                <i className="fas fa-headset text-lg"></i>
                              </div>
                            )}
                          </div>
                          <div
                            className={`flex flex-col ${isFromMe ? "items-end" : "items-start"} max-w-[75%]`}
                          >
                            <span className="text-[9px] font-black text-white/30 mb-1">
                              {isFromMe
                                ? t("أنا", "Me")
                                : t("خدمة العملاء", "Customer Support")}
                            </span>
                            <div
                              className={`px-4 py-3 rounded-2xl text-[12px] font-bold shadow-xl break-words whitespace-pre-wrap ${isFromMe ? "bg-purple-600 text-white rounded-tr-none" : "bg-white/10 text-white rounded-tl-none border border-white/5"}`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={supportChatEndRef} />
                </div>

                <form onSubmit={handleSendSupportMsg} className="mt-4 pb-4">
                  <div className="relative flex items-center gap-3">
                    <div className="relative flex-1">
                      <textarea
                        value={supportMsg}
                        onChange={(e) => {
                          if (e.target.value.length <= 250)
                            setSupportMsg(e.target.value);
                        }}
                        placeholder={t(
                          "اكتب رسالتك للدعم هنا...",
                          "Write your message to support here...",
                        )}
                        className="w-full bg-white/5 border border-white/10 rounded-[1.8rem] py-4 pr-6 pl-14 text-xs text-white outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all shadow-inner h-14 resize-none"
                      />
                      <div className="absolute left-4 bottom-2.5">
                        <span
                          className={`text-[8px] font-black ${supportMsg.length > 240 ? "text-red-500" : "text-white/20"}`}
                        >
                          {supportMsg.length}/250
                        </span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!supportMsg.trim()}
                      className="w-11 h-11 rounded-full bg-purple-600/30 backdrop-blur-md border border-purple-500/20 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-30 flex-shrink-0"
                    >
                      <i className="fas fa-paper-plane text-xs"></i>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[600] bg-[#0d051a]/95 backdrop-blur-xl flex flex-col animate-in fade-in">
          <header className="p-5 flex justify-between items-center border-b border-white/5 bg-[#1a0b2e]">
            <h3 className="text-lg font-black text-white">
              {t("تعديل الملف الشخصي", "Edit Profile")}
            </h3>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="w-10 h-10 rounded-full bg-white/5 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-transform"
            >
              <i className="fas fa-times"></i>
            </button>
          </header>
          <div className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-hide">
            <div className="space-y-2">
              <div className="flex justify-between items-center mr-2 ml-2">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                  {t("الاسم المستعار", "Nickname")}
                </label>
                <span className="text-[9px] font-bold text-white/40">{newName.length}/25</span>
              </div>
              <input
                type="text"
                value={newName}
                maxLength={25}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">
                {t("السيرة الذاتية (Bio)", "Bio")}
              </label>
              <textarea
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white outline-none h-32 resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mr-2">
                {t("البلد / المنطقة", "Country / Region")}
              </label>
              <button
                type="button"
                onClick={() => setShowCountryPicker(true)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white flex items-center justify-between hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  {tempRegion ? (
                    <>
                      <FlagIcon code={tempRegion.code} flagEmoji={tempRegion.flag} className="w-5 h-[14px]" />
                      <span className="font-bold">{tempRegion.name}</span>
                    </>
                  ) : (
                    <span className="text-white/20">
                      {t("اختر بلدك...", "Choose your country...")}
                    </span>
                  )}
                </div>
                <i
                  className={`fas ${language === "ar" ? "fa-chevron-left" : "fa-chevron-right"} text-[10px] text-white/30`}
                ></i>
              </button>
              <p className="text-[9px] text-white/30 font-bold px-2 flex items-center gap-2">
                <i className="fas fa-info-circle text-[8px]"></i>
                {user?.email === "admin@yalla.com" ? (
                  t(
                    "أنت تمتلك صلاحية تغيير الدولة في أي وقت بدون قيود",
                    "You have permission to change country at any time without restrictions"
                  )
                ) : (
                  t(
                    "يمكن تغيير الدولة مرة واحدة فقط كل 3 أيام",
                    "Country can be changed only once every 3 days",
                  )
                )}
              </p>
            </div>
            <button
              onClick={handleUpdateProfileData}
              disabled={isUpdating}
              className="w-full bg-[#8c52ff]/30 backdrop-blur-sm py-4 rounded-2xl font-black text-white shadow-[0_4px_20px_rgba(140,82,255,0.15)] active:scale-95 transition-all border border-[#8c52ff]/40 hover:bg-[#8c52ff]/40"
            >
              {isUpdating ? (
                <i className="fas fa-spinner animate-spin"></i>
              ) : (
                <span>{t("حفظ التغييرات", "Save Changes")}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {relationsModal && (
        <div 
          className="fixed inset-0 z-[700] bg-[#0d051a]/98 backdrop-blur-2xl flex flex-col pt-12 pb-6 px-6 animate-in fade-in" 
          dir={language === "ar" ? "rtl" : "ltr"}
        >
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                setRelationsModal(null);
                setRelationsSearch("");
              }}
              className="w-10 h-10 rounded-full bg-white/5 text-white flex items-center justify-center border border-white/10 active:scale-95 transition-all"
            >
              <i className={`fas ${language === "ar" ? "fa-chevron-right" : "fa-chevron-left"} text-white`}></i>
            </button>
            <h3 className="text-lg font-black text-white">
              {relationsModal === "friends"
                ? t("الأصدقاء", "Friends")
                : relationsModal === "following"
                  ? t("المتابعة", "Following")
                  : t("المتابعون", "Followers")}
            </h3>
            <div className="w-10"></div>
          </div>

          {/* Search bar inside relations modal */}
          <div className="relative mb-4">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-purple-300/40 text-xs"></i>
            <input
              type="text"
              value={relationsSearch}
              onChange={(e) => setRelationsSearch(e.target.value)}
              placeholder={t("ابحث عن الاسم أو الآي دي...", "Search by name or ID...")}
              className={`w-full bg-white/5 border border-white/10 rounded-2xl py-3 ${language === "ar" ? "pr-4 pl-12 text-right" : "pl-4 pr-12 text-left"} text-xs font-bold text-white placeholder-white/30 outline-none focus:border-purple-500/40 transition-all`}
            />
            {relationsSearch && (
              <button
                onClick={() => setRelationsSearch("")}
                className={`absolute ${language === "ar" ? "left-12" : "right-12"} top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors`}
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </div>

          {/* Users List Container */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoadingRelations ? (
              <div className="h-40 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-white/45 font-bold">
                  {t("جاري التحميل...", "Loading...")}
                </p>
              </div>
            ) : (() => {
              const term = relationsSearch.toLowerCase().trim();
              const filteredUsers = relationsUsers.filter((u: any) => {
                if (!term) return true;
                const name = (u.displayName || "").toLowerCase();
                const customId = (u.customId || u.uid || "").toString().toLowerCase();
                return name.includes(term) || customId.includes(term);
              });

              if (filteredUsers.length === 0) {
                return (
                  <div className="h-40 flex flex-col items-center justify-center opacity-40">
                    <i className="fas fa-user-friends text-2xl text-purple-400 mb-2"></i>
                    <p className="text-xs text-white font-bold text-center">
                      {relationsSearch 
                        ? t("لا توجد نتائج مطابقة", "No matching results found") 
                        : t("القائمة فارغة", "No users in this list")}
                    </p>
                  </div>
                );
              }

              return filteredUsers.map((item: any) => (
                <div
                  key={item.uid}
                  className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center justify-between hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.photoURL || "https://space-yalla.web.app/default-avatar.png"}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://space-yalla.web.app/default-avatar.png";
                      }}
                      className="w-11 h-11 rounded-2xl object-cover border border-white/10"
                      alt={item.displayName}
                    />
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="text-xs font-black text-white flex items-center gap-1">
                        {item.displayName}
                        {item.isVerified && (
                          <svg className="w-3.5 h-3.5 text-blue-500 fill-current inline-block flex-shrink-0" viewBox="0 0 24 24" title="حساب موثق">
                            <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                          </svg>
                        )}
                      </span>
                      <span className="text-[10px] text-purple-400 font-bold">
                        ID: {item.customId || item.uid?.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {showCountryPicker && (
        <div
          className="fixed inset-0 z-[700] bg-[#1a0b2e] flex flex-col pt-12"
          dir={language === "ar" ? "rtl" : "ltr"}
        >
          <div className="px-6 flex items-center justify-between mb-6">
            <button
              onClick={() => setShowCountryPicker(false)}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
            >
              <i
                className={`fas ${language === "ar" ? "fa-chevron-right" : "fa-chevron-left"} text-white`}
              ></i>
            </button>
            <h3 className="text-lg font-black text-white">
              {t("اختر بلدك", "Choose Your Country")}
            </h3>
            <div className="w-10"></div>
          </div>

          <div className="px-6 mb-6">
            <div className="relative">
              <i className="fas fa-search absolute right-4 top-1/2 -translate-y-1/2 text-white/20"></i>
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder={t("ابحث عن بلد...", "Search for a country...")}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pr-12 pl-4 text-xs text-white outline-none focus:border-purple-500/40"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-12 space-y-2">
            {filteredCountries.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setTempRegion(c);
                  setShowCountryPicker(false);
                }}
                className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${tempRegion?.code === c.code ? "bg-purple-600/20 border-purple-500" : "bg-white/5 border-white/5 hover:bg-white/10"}`}
              >
                <div className="flex items-center gap-4">
                  <FlagIcon code={c.code} flagEmoji={c.flag} className="w-8 h-[22px]" />
                  <span className="font-bold text-sm text-white">{c.name}</span>
                </div>
                {tempRegion?.code === c.code && (
                  <i className="fas fa-check text-purple-400"></i>
                )}
              </button>
            ))}
            {filteredCountries.length === 0 && (
              <div className="text-center py-12 text-white/40 text-xs">
                {t("لا توجد نتائج للبحث", "No search results found")}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes frame-slow {
          0%, 100% { transform: scale(1.25) rotate(0deg); }
          50% { transform: scale(1.3) rotate(1deg); }
        }
        .animate-frame-slow { animation: frame-slow 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
