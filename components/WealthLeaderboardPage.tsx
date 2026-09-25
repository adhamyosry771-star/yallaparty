import React, { useState, useEffect } from 'react';
import { useLanguage } from '../LanguageContext';
import { db } from '../firebase';
import { collection, query, limit, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getWealthLevelInfo, getCharismaLevelInfo } from '../utils';
import { FlagIcon } from './ProfilePage';

interface WealthLeaderboardPageProps {
  onBack: () => void;
  designSettings?: any;
  defaultImages?: any;
  mode?: 'wealth' | 'charisma';
}

const isVideoUrl = (url: string) => {
  if (!url) return false;
  return url.toLowerCase().endsWith('.mp4') || 
         url.toLowerCase().endsWith('.webm') || 
         url.toLowerCase().endsWith('.mov');
};

export const WealthLeaderboardPage: React.FC<WealthLeaderboardPageProps> = ({ 
  onBack, 
  designSettings, 
  defaultImages,
  mode = 'wealth'
}) => {
  const { language, t } = useLanguage();
  const isCharisma = mode === 'charisma';
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const xpField = isCharisma ? "charismaXP" : "wealthXP";
    const q = query(
      collection(db, "users"),
      orderBy(xpField, "desc"),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        usersList.push({ id: docSnap.id, ...data });
      });
      
      setTopUsers(usersList);
      
      // Keep loading until we have synchronized live data to avoid single-user popping
      if (!snapshot.metadata.fromCache || usersList.length > 3) {
        setTimeout(() => {
          setIsLoading(false);
         }, 1200);
      }
    }, (err) => {
      console.error("Error subscribing to top users in real-time:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Dynamic Design Assets with automatic fallback to wealth values
  const eventBg = isCharisma 
    ? (designSettings?.charismaEventBg !== undefined ? designSettings?.charismaEventBg : designSettings?.wealthEventBg) 
    : designSettings?.wealthEventBg;

  const activeTabBg = isCharisma 
    ? (designSettings?.charismaActiveTabBg !== undefined ? designSettings?.charismaActiveTabBg : designSettings?.wealthActiveTabBg) 
    : designSettings?.wealthActiveTabBg;

  const listBgOthers = isCharisma 
    ? (designSettings?.charismaListBgOthers !== undefined ? designSettings?.charismaListBgOthers : designSettings?.wealthListBgOthers) 
    : designSettings?.wealthListBgOthers;

  const wingTop1 = isCharisma 
    ? (designSettings?.charismaWingTop1 !== undefined ? designSettings?.charismaWingTop1 : designSettings?.wealthWingTop1) 
    : designSettings?.wealthWingTop1;
  const wingTop2 = isCharisma 
    ? (designSettings?.charismaWingTop2 !== undefined ? designSettings?.charismaWingTop2 : designSettings?.wealthWingTop2) 
    : designSettings?.wealthWingTop2;
  const wingTop3 = isCharisma 
    ? (designSettings?.charismaWingTop3 !== undefined ? designSettings?.charismaWingTop3 : designSettings?.wealthWingTop3) 
    : designSettings?.wealthWingTop3;

  const frameTop1 = isCharisma 
    ? (designSettings?.charismaFrameTop1 !== undefined ? designSettings?.charismaFrameTop1 : designSettings?.wealthFrameTop1) 
    : designSettings?.wealthFrameTop1;
  const frameTop2 = isCharisma 
    ? (designSettings?.charismaFrameTop2 !== undefined ? designSettings?.charismaFrameTop2 : designSettings?.wealthFrameTop2) 
    : designSettings?.wealthFrameTop2;
  const frameTop3 = isCharisma 
    ? (designSettings?.charismaFrameTop3 !== undefined ? designSettings?.charismaFrameTop3 : designSettings?.wealthFrameTop3) 
    : designSettings?.wealthFrameTop3;

  const xpIcon = isCharisma ? "fas fa-heart text-yellow-500" : "fas fa-coins text-yellow-500";
  const xpColor = isCharisma ? "text-yellow-500 font-extrabold" : "text-yellow-500";

  const getDisplayXP = (user: any) => {
    return isCharisma ? (user.charismaXP || 0) : (user.wealthXP || 0);
  };

  const displayUsers = [...topUsers]
    .map(u => ({ ...u, displayXP: getDisplayXP(u) }))
    .sort((a, b) => b.displayXP - a.displayXP);

  const mockTop1 = {
    id: "mock-1",
    displayName: t("أدهم يسري", "Adham Yosry"),
    wealthXP: 154300,
    charismaXP: 154300,
    displayXP: 154300,
    photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
  };
  const mockTop2 = {
    id: "mock-2",
    displayName: t("رائد فضاء", "Space Traveler"),
    wealthXP: 128400,
    charismaXP: 128400,
    displayXP: 128400,
    photoURL: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150"
  };
  const mockTop3 = {
    id: "mock-3",
    displayName: t("مستكشف", "Explorer"),
    wealthXP: 94200,
    charismaXP: 94200,
    displayXP: 94200,
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
  };

  const top1 = displayUsers[0] || mockTop1;
  const top2 = displayUsers[1] || mockTop2;
  const top3 = displayUsers[2] || mockTop3;
  const restUsers = displayUsers.length > 3 ? displayUsers.slice(3).filter(u => u.displayXP > 0) : [];

  const renderUserAvatar = (userObj: any, sizeClass: string = "w-full h-full rounded-full") => {
    const isVideo = userObj?.animatedAvatar && isVideoUrl(userObj.animatedAvatar);
    
    // Safely extract the avatar photo URL checking all potential fields
    let avatarUrl = "";
    if (userObj?.animatedAvatar && String(userObj.animatedAvatar).trim() !== "") {
      avatarUrl = userObj.animatedAvatar;
    } else if (userObj?.photoURL && String(userObj.photoURL).trim() !== "") {
      avatarUrl = userObj.photoURL;
    } else if (userObj?.profileImage && String(userObj.profileImage).trim() !== "") {
      avatarUrl = userObj.profileImage;
    } else if (userObj?.userImage && String(userObj.userImage).trim() !== "") {
      avatarUrl = userObj.userImage;
    } else if (userObj?.avatar && String(userObj.avatar).trim() !== "") {
      avatarUrl = userObj.avatar;
    } else {
      avatarUrl = defaultImages?.profileImage || "https://space-yalla.web.app/default-avatar.png";
    }
    
    if (isVideo) {
      return (
        <video 
          src={userObj.animatedAvatar} 
          autoPlay 
          loop 
          muted 
          playsInline 
          className={`${sizeClass} object-cover bg-black/40`}
        />
      );
    }
    
    return (
      <img 
        src={avatarUrl} 
        className={`${sizeClass} object-cover bg-black/40`}
        alt={userObj?.displayName || ""} 
        onError={(e) => {
          (e.target as HTMLImageElement).src = defaultImages?.profileImage || "https://space-yalla.web.app/default-avatar.png";
        }}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-[600] flex flex-col bg-[#0d051a] overflow-hidden text-white touch-pan-y" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Dynamic Background Image */}
      {eventBg && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${eventBg})` }}
        />
      )}
      
      {/* Dark overlay to ensure text readability */}
      <div className="absolute inset-0 z-0 bg-black/30 pointer-events-none" />

      {/* Screen Content */}
      <div className="relative z-10 flex flex-col h-full overflow-x-hidden">
        {/* Transparent Header */}
        <header className="p-4 flex items-center justify-between bg-transparent border-0">
          <button 
            onClick={onBack} 
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
          >
            <i className={`fas ${language === 'ar' ? 'fa-chevron-right' : 'fa-chevron-left'} text-sm text-white`}></i>
          </button>
          
          <div className="flex flex-col items-center justify-center">
            <h2 className="text-sm font-black text-white tracking-widest uppercase">
              {isCharisma 
                ? t("قائمة السحر", "Magic Leaderboard") 
                : t("قائمة الثروة", "Wealth Leaderboard")
              }
            </h2>
            {isLoading && (
              <div className="mt-1 animate-fade-in flex justify-center">
                <i className="fas fa-spinner text-[11px] text-white animate-spin"></i>
              </div>
            )}
          </div>
          
          <div className="w-10" />
        </header>

        {/* Filters Tab Panel - Visible only when NOT loading */}
        {!isLoading && (
          <div className="p-4 flex justify-center animate-fade-in font-sans">
            <div className="flex bg-white/5 border border-white/10 backdrop-blur-md p-0.5 rounded-full w-full max-w-[275px]">
              <button 
                onClick={() => setActiveTab('daily')}
                className={`flex-1 py-1 text-[10px] font-black rounded-full transition-all uppercase ${
                  activeTab === 'daily' 
                    ? (activeTabBg ? 'text-white' : 'bg-purple-600 text-white shadow-lg shadow-purple-600/30') 
                    : 'text-purple-300/40 hover:text-white/80'
                }`}
                style={activeTab === 'daily' && activeTabBg ? {
                  backgroundImage: `url(${activeTabBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                } : {}}
              >
                {t("يومية", "Daily")}
              </button>
              <button 
                onClick={() => setActiveTab('weekly')}
                className={`flex-1 py-1 text-[10px] font-black rounded-full transition-all uppercase ${
                  activeTab === 'weekly' 
                    ? (activeTabBg ? 'text-white' : 'bg-purple-600 text-white shadow-lg shadow-purple-600/30') 
                    : 'text-purple-300/40 hover:text-white/80'
                }`}
                style={activeTab === 'weekly' && activeTabBg ? {
                  backgroundImage: `url(${activeTabBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                } : {}}
              >
                {t("أسبوعية", "Weekly")}
              </button>
              <button 
                onClick={() => setActiveTab('monthly')}
                className={`flex-1 py-1 text-[10px] font-black rounded-full transition-all uppercase ${
                  activeTab === 'monthly' 
                    ? (activeTabBg ? 'text-white' : 'bg-purple-600 text-white shadow-lg shadow-purple-600/30') 
                    : 'text-purple-300/40 hover:text-white/80'
                }`}
                style={activeTab === 'monthly' && activeTabBg ? {
                  backgroundImage: `url(${activeTabBg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                } : {}}
              >
                {t("شهرياً", "Monthly")}
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Core List Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 scrollbar-hide flex flex-col touch-pan-y">
          {isLoading ? (
            /* Ambient transition spacer while loading completes */
            <div className="flex-1" />
          ) : displayUsers.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 opacity-40 my-auto">
              <i className="fas fa-crown text-4xl text-purple-400 animate-pulse"></i>
              <p className="text-xs font-black">{t("القائمة فارغة حالياً", "The board is currently empty")}</p>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in font-sans">
              {/* Podium View (Top 3) - Left = Top 2, Center = Top 1, Right = Top 3 */}
              <div 
                className="grid grid-cols-3 gap-1 pt-6 items-end justify-center max-w-[265px] mx-auto relative min-h-[250px] overflow-visible"
                style={{ transform: 'translateY(1%)' }}
              >
                
                {/* Rank 2 (Left Column) */}
                <div className="flex flex-col items-center space-y-2 relative" style={{ transform: 'translateY(185px)' }}>
                  {top2 && (
                    <>
                      <div className="relative w-20 h-20 z-10 flex items-center justify-center">
                        {/* Custom Wing Behind Avatar */}
                        {wingTop2 && (
                           <img 
                             src={wingTop2} 
                             className="absolute left-1/2 -translate-x-1/2 w-[210px] h-[210px] max-w-none object-contain pointer-events-none z-0" 
                             style={{ top: '16px' }}
                             alt="Wing 2"
                           />
                        )}

                        {/* Composite Frame and Avatar wrapper */}
                        <div 
                           className="absolute inset-0 z-10"
                           style={{ transform: 'translateY(22px) scale(1.14)' }}
                        >
                          <div 
                            className="absolute z-10 flex items-center justify-center overflow-hidden rounded-full"
                            style={{ inset: frameTop2 ? '19%' : '0%' }}
                          >
                            {renderUserAvatar(top2, "w-full h-full object-cover rounded-full")}
                          </div>

                          {/* Custom Frame */}
                          {frameTop2 && (
                            <img 
                              src={frameTop2} 
                              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20" 
                              alt="Frame 2"
                            />
                          )}
                        </div>
                      </div>

                      <div className="text-center z-10 w-full px-1 flex flex-col items-center gap-0.5" style={{ transform: 'translateY(24px)' }}>
                        <p className="text-[10px] font-black text-white truncate max-w-[80px] mx-auto text-shadow-sm leading-tight">{top2.displayName}</p>
                        
                        <p className={`text-[8px] font-black ${xpColor} flex items-center justify-center gap-0.5 mt-0.5`}>
                          <i className={`${xpIcon} text-[7px]`}></i>
                          {top2.displayXP.toLocaleString('en-US')}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Rank 1 (Center Column - Elevated) */}
                <div className="flex flex-col items-center space-y-2 relative -top-3 overflow-visible" style={{ transform: 'translateY(73px)' }}>
                  {top1 && (
                    <>
                      <div className="relative w-24 h-24 z-10 flex items-center justify-center">
                        {/* Custom Wing Behind Avatar */}
                        {wingTop1 && (
                          <img 
                            src={wingTop1} 
                            className="absolute -top-26 left-1/2 -translate-x-1/2 w-[310px] h-[310px] max-w-none object-contain pointer-events-none z-0" 
                            alt="Wing 1"
                          />
                        )}

                        {/* Composite Frame and Avatar wrapper */}
                        <div 
                           className="absolute inset-0 z-10"
                           style={{ transform: 'translateY(-48px) scale(1.14)' }}
                        >
                          <div 
                            className="absolute z-10 flex items-center justify-center overflow-hidden rounded-full"
                            style={{ inset: frameTop1 ? '19%' : '0%' }}
                          >
                            {renderUserAvatar(top1, "w-full h-full object-cover rounded-full")}
                          </div>

                          {/* Custom Frame */}
                          {frameTop1 && (
                            <img 
                              src={frameTop1} 
                              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20" 
                              alt="Frame 1"
                            />
                          )}
                        </div>
                      </div>

                      <div className="text-center z-10 w-full px-1 flex flex-col items-center gap-0.5" style={{ transform: 'translateY(-45px)' }}>
                        <p className="text-[11px] font-black text-white truncate max-w-[90px] mx-auto text-shadow-md leading-tight">{top1.displayName}</p>
                        
                        <p className={`text-[9px] font-black ${xpColor} flex items-center justify-center gap-0.5 mt-0.5`}>
                          <i className={`${xpIcon} text-[8px]`}></i>
                          {top1.displayXP.toLocaleString('en-US')}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Rank 3 (Right Column) */}
                <div className="flex flex-col items-center space-y-2 relative" style={{ transform: 'translateY(185px)' }}>
                  {top3 && (
                    <>
                      <div className="relative w-20 h-20 z-10 flex items-center justify-center">
                        {/* Custom Wing Behind Avatar */}
                        {wingTop3 && (
                          <img 
                            src={wingTop3} 
                            className="absolute left-1/2 -translate-x-1/2 w-[210px] h-[210px] max-w-none object-contain pointer-events-none z-0" 
                            style={{ top: '16px' }}
                            alt="Wing 3"
                          />
                        )}

                        {/* Composite Frame and Avatar wrapper */}
                        <div 
                           className="absolute inset-0 z-10"
                           style={{ transform: 'translateY(22px) scale(1.14)' }}
                        >
                          <div 
                            className="absolute z-10 flex items-center justify-center overflow-hidden rounded-full"
                            style={{ inset: frameTop3 ? '19%' : '0%' }}
                          >
                            {renderUserAvatar(top3, "w-full h-full object-cover rounded-full")}
                          </div>

                          {/* Custom Frame */}
                          {frameTop3 && (
                            <img 
                              src={frameTop3} 
                              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20" 
                              alt="Frame 3"
                            />
                          )}
                        </div>
                      </div>

                      <div className="text-center z-10 w-full px-1 flex flex-col items-center gap-0.5" style={{ transform: 'translateY(24px)' }}>
                        <p className="text-[10px] font-black text-white truncate max-w-[80px] mx-auto text-shadow-sm leading-tight">{top3.displayName}</p>
                        
                        <p className={`text-[8px] font-black ${xpColor} flex items-center justify-center gap-0.5 mt-0.5`}>
                          <i className={`${xpIcon} text-[7px]`}></i>
                          {top3.displayXP.toLocaleString('en-US')}
                        </p>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* Ranks 4+ Scroll Area */}
              <div className="space-y-2 max-w-sm mx-auto pt-[275px] pb-8 font-sans">
                {restUsers.map((user, index) => {
                  const rank = index + 4;
                  return (
                    <div 
                      key={user.id} 
                      className="relative w-full overflow-visible active:scale-[0.99] transition-all flex items-center"
                    >
                      {/* Custom Card Rectangle Background if set */}
                      {listBgOthers ? (
                        <img 
                          src={listBgOthers} 
                          className="w-full h-auto min-h-[80px] block pointer-events-none" 
                          alt="Card backplate"
                        />
                      ) : null}

                      {/* Content overlayed precisely on top of the backplate image */}
                      <div className={`${listBgOthers ? 'absolute inset-0 px-5 flex items-center justify-between py-2' : 'relative w-full py-4 px-3 bg-white/5 border border-white/5 rounded-2xl min-h-[80px] flex items-center justify-between'} z-10`}>
                        {/* Left Side: Avatar & Name */}
                        <div className="flex items-center gap-3">
                          {/* Rank indicator */}
                          <span className="text-xs font-black text-white/50 w-5 text-center">{rank}</span>

                          {/* Avatar */}
                          <div className="relative w-10 h-10">
                            {renderUserAvatar(user, "w-full h-full rounded-xl border border-white/10")}
                          </div>

                          {/* Name, ID Icon, Flag & Badges */}
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-xs font-bold text-white truncate max-w-[140px] leading-tight">{user.displayName}</span>
                            
                            {/* User ID and Flag Icon alongside each other */}
                            <div className="flex items-center gap-1.5 bg-transparent">
                              {(() => {
                                const customId = user.customId || user.id?.substring(0, 8) || '';
                                const customIdIcon = user.customIdIcon;
                                const idX = user.idOffsetX ?? 28;
                                const idY = user.idOffsetY ?? 0.5;
                                const idFS = user.idFontSize ?? 10;
                                
                                if (customIdIcon) {
                                  return (
                                    <div 
                                      className="relative w-[65px] h-[20px] flex items-center bg-contain bg-center bg-no-repeat flex-shrink-0 animate-in zoom-in duration-300" 
                                      style={{ backgroundImage: `url(${customIdIcon})` }}
                                    >
                                      <span 
                                        className="font-black text-white tracking-widest text-center w-full block drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                                        style={{ 
                                          paddingLeft: `${(idX * 65) / 90}px`, 
                                          paddingTop: `${(idY * 20) / 28}px`,
                                          fontSize: `${Math.max(7, (idFS * 65) / 90)}px`
                                        }}
                                      >
                                        {customId}
                                      </span>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <span className="text-[9.5px] font-black text-purple-300/80 tracking-normal" dir="ltr">
                                      ID: {customId}
                                    </span>
                                  );
                                }
                              })()}

                              {/* Flag / Globe Icon */}
                              <div className="flex items-center pl-0.5">
                                {user.regionFlag ? (
                                  <FlagIcon code={user.regionCode} flagEmoji={user.regionFlag} className="w-[14px] h-[9px] rounded-[1px] object-cover" />
                                ) : (
                                  <div className="w-3 h-3 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                    <i className="fas fa-globe text-[7px] text-purple-300"></i>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Badges without flag */}
                            <div className="flex items-center gap-1 bg-transparent">
                              {/* Wealth Badge */}
                              {(() => {
                                const info = getWealthLevelInfo(user.wealthXP || 0);
                                return (
                                  <div 
                                    className={`flex items-center gap-1 px-1 py-0.5 rounded-full border ${info.tier.border} ${info.tier.bg} backdrop-blur-sm shadow-sm`}
                                    title={`Wealth Level ${info.level}`}
                                  >
                                    <div className={`w-3 h-3 rounded-full ${info.tier.bar} flex items-center justify-center text-[6px] text-white`}>
                                      <i className="fas fa-crown"></i>
                                    </div>
                                    <span className={`text-[7px] font-black ${info.tier.color}`}>{info.level}</span>
                                  </div>
                                );
                              })()}

                              {/* Charisma Badge */}
                              {(() => {
                                const info = getCharismaLevelInfo(user.charismaXP || 0);
                                return (
                                  <div 
                                    className={`flex items-center gap-1 px-1 py-0.5 rounded-full border ${info.tier.border} ${info.tier.bg} backdrop-blur-sm shadow-sm`}
                                    title={`Charisma Level ${info.level}`}
                                  >
                                    <div className={`w-3 h-3 rounded-full ${info.tier.bar} flex items-center justify-center text-[6px] text-white`}>
                                      <i className="fas fa-heart"></i>
                                    </div>
                                    <span className={`text-[7px] font-black ${info.tier.color}`}>{info.level}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Price / XP Display */}
                        <div className="flex items-center gap-1">
                          <i className={`${xpIcon} text-[8px]`}></i>
                          <span className={`text-[10px] font-black ${xpColor}`}>{user.displayXP.toLocaleString('en-US')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
