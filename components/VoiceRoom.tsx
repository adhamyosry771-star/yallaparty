
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../LanguageContext';
import { Room, Gift, ChatMessage } from '../types';
import { GIFTS as STATIC_GIFTS } from '../constants';
import { auth, db } from '../firebase';
import { FruitsGame } from './FruitsGame';
import { AviatorGame } from './AviatorGame';
import { Lucky77Game } from './Lucky77Game';
import { getWealthLevelInfo, getCharismaLevelInfo } from '../utils';
import { FlagIcon } from './ProfilePage';
import { doc, onSnapshot, updateDoc, getDocs, collection, query, where, orderBy, limit, addDoc, serverTimestamp, Timestamp, increment, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { registerBackAction } from '../backButtonManager';
import AgoraRTC from 'agora-rtc-sdk-ng';

interface VoiceRoomProps {
  room: Room & { roomBackground?: string; roomIdDisplay?: string; description?: string; micCount?: number };
  onLeave: () => void;
  onKicked?: (roomName: string) => void;
  onMinimize: () => void;
  onOpenWallet?: () => void;
  onOpenChat?: (otherUid: string) => void;
  micStates: any[];
  setMicStates: React.Dispatch<React.SetStateAction<any[]>>;
  isMicMuted: boolean;
  setIsMicMuted: React.Dispatch<React.SetStateAction<boolean>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isMinimized?: boolean;
}

import { saveTrackToDB, deleteTrackFromDB, loadTracksFromDBForRoom, loadTracksFromDBForUser, getAudioDuration } from './audioDatabase';

const DEFAULT_TRACKS: any[] = [];

function hashStringTo32BitInt(str: string): number {
  let hash = 0;
  if (!str) return 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash) || 999;
}

interface UserOnMic {
  uid: string;
  displayName: string;
  photoURL: string;
  customId?: string;
  currentFrame?: string | null;
  animatedAvatar?: string | null;
}

type GiftTab = 'normal' | 'lucky' | 'cp' | 'famous' | 'country' | 'vip' | 'birthday';
type SelectionMode = 'manual' | 'all-room' | 'all-mic';

const SafeImage: React.FC<{ src: string; className?: string; alt?: string; fallback: React.ReactNode; spinnerSize?: string }> = ({ src, className, alt, fallback, spinnerSize = 'w-4 h-4' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [src]);

  if (error) return <>{fallback}</>;

  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className={`${spinnerSize} border border-purple-500/30 border-t-purple-500 rounded-full animate-spin`}></div>
        </div>
      )}
      <img
        src={src}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </div>
  );
};

interface FlyingGiftItemData {
  id: string;
  icon: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  recipientId: string;
}

const FlyingGiftItem: React.FC<{
  item: FlyingGiftItemData;
  onComplete: () => void;
}> = ({ item, onComplete }) => {
  const [animStage, setAnimStage] = useState<'start' | 'flying' | 'absorbed'>('start');

  useEffect(() => {
    const t1 = setTimeout(() => setAnimStage('flying'), 30);
    const t2 = setTimeout(() => setAnimStage('absorbed'), 750);
    const t3 = setTimeout(() => onComplete(), 980);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const currentPos = animStage === 'start'
    ? { x: item.startX, y: item.startY, scale: 0.35, opacity: 0 }
    : animStage === 'flying'
      ? { x: item.targetX, y: item.targetY, scale: 1.2, opacity: 1 }
      : { x: item.targetX, y: item.targetY, scale: 0.05, opacity: 0 };

  return (
    <div 
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: `${currentPos.x}px`,
        top: `${currentPos.y}px`,
        transform: `translate(-50%, -50%) scale(${currentPos.scale})`,
        opacity: currentPos.opacity,
        transitionProperty: 'left, top, transform, opacity',
        transitionDuration: animStage === 'start' ? '0.08s' : animStage === 'flying' ? '0.72s' : '0.22s',
        transitionTimingFunction: animStage === 'flying' ? 'cubic-bezier(0.25, 0.9, 0.25, 1)' : 'ease-out'
      }}
    >
      <div className="relative flex items-center justify-center">
        {item.icon.startsWith('http') ? (
          <img src={item.icon} className="w-12 h-12 object-contain select-none" alt="gift" />
        ) : (
          <span className="text-4xl select-none">{item.icon}</span>
        )}
      </div>
    </div>
  );
};

export const VoiceRoom: React.FC<VoiceRoomProps> = ({ 
  room: initialRoom, onLeave, onKicked, onMinimize, onOpenWallet, onOpenChat,
  micStates, setMicStates, isMicMuted, setIsMicMuted,
  messages, setMessages, isMinimized = false
}) => {
  const { language, t } = useLanguage();
  const user = auth.currentUser;
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const [currentRoom, setCurrentRoom] = useState(initialRoom);
  const isRoomOwner = user?.uid === currentRoom.owner?.uid || user?.email === "admin@yalla.com";
  const isRoomModerator = !!(currentRoom.moderators && user?.uid && currentRoom.moderators.includes(user.uid));
  const canManageRoom = isRoomOwner || isRoomModerator;
  const [inputText, setInputText] = useState('');
  const [showGifts, setShowGifts] = useState(false);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showExtraMenu, setShowExtraMenu] = useState(false); 
  const [showGamesMenu, setShowGamesMenu] = useState(false);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showUserData, setShowUserData] = useState(false); 
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [isRoomMuted, setIsRoomMuted] = useState(false); 
  const [showJoinMessage, setShowJoinMessage] = useState(false);
  const [showJoinVideo, setShowJoinVideo] = useState(false);
  const [joinNotifications, setJoinNotifications] = useState<{ id: string, name: string }[]>([]);
  
  // Bar Wealth & Room Info Modals States
  const [showRoomInfoModal, setShowRoomInfoModal] = useState(false);
  const [showBarWealthModal, setShowBarWealthModal] = useState(false);
  const [barWealthLogs, setBarWealthLogs] = useState<any[]>([]);
  const [targetUserIdInput, setTargetUserIdInput] = useState('');
  const [distributionAmountInput, setDistributionAmountInput] = useState('');
  const [isDistributing, setIsDistributing] = useState(false);
  
  // Room Trophy (كأس الغرفة) States
  const [showRoomTrophyModal, setShowRoomTrophyModal] = useState(false);
  const [roomGiftLogs, setRoomGiftLogs] = useState<any[]>([]);
  const [roomTrophyTab, setRoomTrophyTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Calculating supporter lists (Daily, Weekly, Monthly) via useMemo
  const roomTrophyDailyList = useMemo(() => {
    const cutOff = Date.now() - 24 * 60 * 60 * 1000;
    const filtered = roomGiftLogs.filter(log => log.createdAt instanceof Date ? log.createdAt.getTime() >= cutOff : new Date(log.createdAt).getTime() >= cutOff);
    
    const groups: { [uid: string]: any } = {};
    filtered.forEach(log => {
      const uid = log.senderUid;
      if (!uid) return;
      if (!groups[uid]) {
        groups[uid] = {
          uid,
          displayName: log.senderName || t("مستخدم", "User"),
          photoURL: log.senderAvatar || '',
          customId: log.senderCustomId || '',
          customIdIcon: log.senderCustomIdIcon || '',
          idOffsetX: log.senderIdOffsetX !== undefined ? log.senderIdOffsetX : undefined,
          idOffsetY: log.senderIdOffsetY !== undefined ? log.senderIdOffsetY : undefined,
          idFontSize: log.senderIdFontSize !== undefined ? log.senderIdFontSize : undefined,
          amount: 0
        };
      }
      groups[uid].amount += (log.amount || 0);
    });
    return Object.values(groups).sort((a, b) => b.amount - a.amount);
  }, [roomGiftLogs]);

  const roomTrophyWeeklyList = useMemo(() => {
    const cutOff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = roomGiftLogs.filter(log => log.createdAt instanceof Date ? log.createdAt.getTime() >= cutOff : new Date(log.createdAt).getTime() >= cutOff);
    
    const groups: { [uid: string]: any } = {};
    filtered.forEach(log => {
      const uid = log.senderUid;
      if (!uid) return;
      if (!groups[uid]) {
        groups[uid] = {
          uid,
          displayName: log.senderName || t("مستخدم", "User"),
          photoURL: log.senderAvatar || '',
          customId: log.senderCustomId || '',
          customIdIcon: log.senderCustomIdIcon || '',
          idOffsetX: log.senderIdOffsetX !== undefined ? log.senderIdOffsetX : undefined,
          idOffsetY: log.senderIdOffsetY !== undefined ? log.senderIdOffsetY : undefined,
          idFontSize: log.senderIdFontSize !== undefined ? log.senderIdFontSize : undefined,
          amount: 0
        };
      }
      groups[uid].amount += (log.amount || 0);
    });
    return Object.values(groups).sort((a, b) => b.amount - a.amount);
  }, [roomGiftLogs]);

  const roomTrophyMonthlyList = useMemo(() => {
    const cutOff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filtered = roomGiftLogs.filter(log => log.createdAt instanceof Date ? log.createdAt.getTime() >= cutOff : new Date(log.createdAt).getTime() >= cutOff);
    
    const groups: { [uid: string]: any } = {};
    filtered.forEach(log => {
      const uid = log.senderUid;
      if (!uid) return;
      if (!groups[uid]) {
        groups[uid] = {
          uid,
          displayName: log.senderName || t("مستخدم", "User"),
          photoURL: log.senderAvatar || '',
          customId: log.senderCustomId || '',
          customIdIcon: log.senderCustomIdIcon || '',
          idOffsetX: log.senderIdOffsetX !== undefined ? log.senderIdOffsetX : undefined,
          idOffsetY: log.senderIdOffsetY !== undefined ? log.senderIdOffsetY : undefined,
          idFontSize: log.senderIdFontSize !== undefined ? log.senderIdFontSize : undefined,
          amount: 0
        };
      }
      groups[uid].amount += (log.amount || 0);
    });
    return Object.values(groups).sort((a, b) => b.amount - a.amount);
  }, [roomGiftLogs]);

  const roomTrophyTotalAllTime = useMemo(() => {
    return roomGiftLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
  }, [roomGiftLogs]);

  const formatTrophyAmount = (amount: number) => {
    if (amount >= 1000000000) {
      return (amount / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (amount >= 1000) {
      return (amount / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return amount.toString();
  };
  
  // وقت الدخول لفلترة الرسائل القديمة
  const [joinTime] = useState(Timestamp.now());

  // نظام تأثير الهدية المطور
  const [activeGiftEffect, setActiveGiftEffect] = useState<{url: string, id: number} | null>(null);
  const [isGiftMinimized, setIsGiftMinimized] = useState(false);
  const [giftPos, setGiftPos] = useState({ x: 20, y: 150 });
  const isDraggingGift = useRef(false);
  const dragGiftOffset = useRef({ x: 0, y: 0 });
  const giftMoveThreshold = useRef(false);

  const [isEffectsEnabled, setIsEffectsEnabled] = useState(() => {
    return localStorage.getItem('effects_enabled') !== 'false';
  });

  const isEffectsEnabledRef = useRef(isEffectsEnabled);
  isEffectsEnabledRef.current = isEffectsEnabled;
  const animatedMsgIds = useRef<Set<string>>(new Set());

  // Agora RTC Config & Audio Handling
  const agoraClientRef = useRef<any>(null);
  const localAudioTrackRef = useRef<any>(null);
  const localMusicAudioTrackRef = useRef<any>(null);
  const [isAgoraConnected, setIsAgoraConnected] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSpeakers, setActiveSpeakers] = useState<Record<string, boolean>>({});
  const allPresentUsersRef = useRef<any[]>([]);

  // Keep a live ref to isRoomMuted for synchronous access in event listeners
  const isRoomMutedRef = useRef(isRoomMuted);
  useEffect(() => {
    isRoomMutedRef.current = isRoomMuted;
  }, [isRoomMuted]);

  useEffect(() => {
    let isMounted = true;
    let client: any = null;

    const initAgora = async () => {
      try {
        console.log("Setting up Agora RTC client...");
        client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        try {
          client.setAudioProfile("music_standard");
          console.log("Agora client audio profile set to music_standard successfully.");
        } catch (profileErr) {
          console.warn("Failed to set Agora audio profile to music_standard:", profileErr);
        }
        agoraClientRef.current = client;

        client.on("user-published", async (remoteUser: any, mediaType: any) => {
          try {
            await client.subscribe(remoteUser, mediaType);
            if (mediaType === "audio" && isMounted) {
              if (isRoomMutedRef.current) {
                console.log(`Agora remote audio subscribed but NOT played because room is locally muted: ${remoteUser.uid}`);
              } else {
                remoteUser.audioTrack?.play();
                console.log(`Agora remote audio started playing for: ${remoteUser.uid}`);
              }
            }
          } catch (subscribeError) {
            console.error("Agora subscription error:", subscribeError);
          }
        });

        client.on("user-unpublished", async (remoteUser: any, mediaType: any) => {
          if (mediaType === "audio") {
            try {
              remoteUser.audioTrack?.stop();
              console.log(`Agora remote audio stopped playing for: ${remoteUser.uid}`);
            } catch (unpubError) {
              console.error("Error stopping remote audio track:", unpubError);
            }
          }
        });

        // Enable volume indicator to track who is currently speaking
        client.enableAudioVolumeIndicator(200);
        client.on("volume-indicator", (volumes: any[]) => {
          if (!isMounted) return;
          const speakers: Record<string, boolean> = {};
          const currentLocalUser = userRef.current;
          const currentLocalUserUid = currentLocalUser?.uid;
          const allPresent = allPresentUsersRef.current || [];

          volumes.forEach((v: any) => {
            if (v.level > 3) {
              const numericUid = Number(v.uid);
              const isLocalUser = numericUid === 0 || (currentLocalUserUid && numericUid === hashStringTo32BitInt(currentLocalUserUid));
              if (isLocalUser) {
                if (currentLocalUserUid) {
                  speakers[currentLocalUserUid] = true;
                }
              } else {
                // Find matching user from active mic states or all present users
                // by hashing their Firebase UIDs deterministically and checking if they match
                const match = allPresent.find((u: any) => u?.uid && hashStringTo32BitInt(u.uid) === numericUid);
                if (match) {
                  speakers[match.uid] = true;
                } else {
                  // Fallback to checking active mics live ref in case allPresentUsers is updating
                  const currentMicsList = micStatesRef.current || [];
                  const matchedMicUser = currentMicsList.find((m: any) => m?.user?.uid && hashStringTo32BitInt(m.user.uid) === numericUid);
                  if (matchedMicUser) {
                    speakers[matchedMicUser.user.uid] = true;
                  } else {
                    speakers[numericUid.toString()] = true;
                  }
                }
              }
            }
          });
          setActiveSpeakers(speakers);
        });

        const appId = "3c427b50bc824baebaca30a5de42af68";
        const channelName = currentRoom.id;
        
        console.log(`Agora joining channel: ${channelName} with App ID: ${appId}`);
        const integerUid = user?.uid ? hashStringTo32BitInt(user.uid) : null;
        await client.join(appId, channelName, null, integerUid);
        
        if (isMounted) {
          setIsAgoraConnected(true);
          console.log("Agora client joined room channel successfully.");
        }
      } catch (err: any) {
        if (err?.code === "OPERATION_ABORTED" || err?.message?.includes("cancel") || err?.message?.includes("aborted")) {
          console.log("Agora client setup was aborted gracefully (component unmounted or room switched rapidly).");
        } else {
          console.error("Failed to fully initiate Agora Client:", err);
        }
      }
    };

    initAgora();

    return () => {
      isMounted = false;
      const cleanupAgora = async () => {
        if (localAudioTrackRef.current) {
          try {
            localAudioTrackRef.current.stop();
            localAudioTrackRef.current.close();
            console.log("Agora local audio track stopped & closed inside unmount.");
          } catch (err) {
            console.error("Error closing local audio track:", err);
          }
          localAudioTrackRef.current = null;
        }
        if (localMusicAudioTrackRef.current) {
          try {
            localMusicAudioTrackRef.current.stop();
            localMusicAudioTrackRef.current.close();
            console.log("Agora local music audio track stopped & closed inside unmount.");
          } catch (err) {
            console.error("Error closing local music audio track:", err);
          }
          localMusicAudioTrackRef.current = null;
        }
        if (client) {
          try {
            await client.leave();
            console.log("Agora client left the channel successfully inside unmount.");
          } catch (err) {
            console.error("Error leaving Agora client:", err);
          }
        }
      };
      cleanupAgora();
      setIsAgoraConnected(false);
    };
  }, [currentRoom.id, user?.uid]);

  // Synchronize local room muting state with all active Agora remote audio streams
  useEffect(() => {
    const client = agoraClientRef.current;
    if (!client) return;

    try {
      const remoteUsers = client.remoteUsers || [];
      remoteUsers.forEach((remoteUser: any) => {
        if (remoteUser.audioTrack) {
          if (isRoomMuted) {
            try {
              remoteUser.audioTrack.stop();
              console.log(`Locally muted remote user audio track: ${remoteUser.uid}`);
            } catch (muteErr) {
              console.error("Error stopping remote voice track locally:", muteErr);
            }
          } else {
            try {
              remoteUser.audioTrack.play().catch((playErr: any) => {
                console.warn("Autoplay block or error playing unmuted track:", playErr);
              });
              console.log(`Locally unmuted remote user audio track: ${remoteUser.uid}`);
            } catch (unmuteErr) {
              console.error("Error starting remote voice track locally:", unmuteErr);
            }
          }
        }
      });
    } catch (err) {
      console.error("Failed to sync room mute status with remote audio tracks:", err);
    }
  }, [isRoomMuted]);

  // Synchronize mic publishing with whether userIsOnMic and mic is unmuted
  useEffect(() => {
    const client = agoraClientRef.current;
    if (!isAgoraConnected || !client) return;

    let isMounted = true;
    const userIsOnMic = micStates.some(m => m?.user?.uid === user?.uid);
    const shouldPublish = userIsOnMic && !isMicMuted && !isRoomMuted;

    const syncMicPublishing = async () => {
      if (shouldPublish) {
        if (!localAudioTrackRef.current) {
          try {
            console.log("User is on mic & unmuted. Creating microphone track...");
            const track = await AgoraRTC.createMicrophoneAudioTrack({
              AEC: true, // Echo Cancellation
              ANS: true, // Noise Suppression
              AGC: true, // Automatic Gain Control
            });
            if (!isMounted) {
              track.close();
              return;
            }
            localAudioTrackRef.current = track;
            await client.publish(track);
            console.log("Voice track successfully published to Agora channel.");
          } catch (err: any) {
            console.error("Error creating or publishing local mic track:", err);
            if (err.name === "NotAllowedError" || err.code === "PERMISSION_DENIED" || err.message?.includes("Permission denied")) {
              alert("تمت معالجة اتصال الصوت الحقيقي، ولكن لم يتم الحصول على إذن الميكروفون. يرجى تفعيل إذن الميكروفون في المتصفح للحديث.");
            } else {
              alert("خطأ أثناء تفعيل الميكروفون للاتصال الحقيقي: " + (err.message || err));
            }
          }
        } else {
          try {
            await localAudioTrackRef.current.setEnabled(true);
            console.log("Enabled local microphone track.");
          } catch (err) {
            console.error("Error re-enabling local mic track:", err);
          }
        }
      } else {
        if (localAudioTrackRef.current) {
          try {
            console.log("User muted or got off mic. Unpublishing and closing mic track...");
            const track = localAudioTrackRef.current;
            localAudioTrackRef.current = null;
            await client.unpublish(track);
            track.stop();
            track.close();
            console.log("Microphone track unpublished and fully closed.");
          } catch (err) {
            console.error("Error unpublishing microphone tracker:", err);
          }
        }
      }
    };

    syncMicPublishing();

    return () => {
      isMounted = false;
    };
  }, [isAgoraConnected, micStates, isMicMuted, user?.uid, isRoomMuted]);

  // Synchronize custom local music streaming over Agora so other listeners can hear the audio directly
  useEffect(() => {
    const client = agoraClientRef.current;
    if (!isAgoraConnected || !client) return;

    let isMounted = true;
    const userIsOnMic = micStates.some(m => m?.user?.uid === user?.uid);
    // Only stream if user is on mic and music is playing locally
    const shouldStreamMusic = userIsOnMic && isMusicPlaying && !isRoomMuted;

    const syncMusicStreaming = async () => {
      if (shouldStreamMusic) {
        if (!localMusicAudioTrackRef.current && audioRef.current) {
          try {
            console.log("Local user is on mic & playing music. Creating custom Agora music stream...");
            const audio = audioRef.current;
            const captureStream = (audio as any).captureStream || (audio as any).mozCaptureStream;
            if (captureStream) {
              const stream = captureStream.call(audio);
              const audioTracks = stream.getAudioTracks();
              if (audioTracks && audioTracks.length > 0) {
                const musicTrack = AgoraRTC.createCustomAudioTrack({
                  mediaStreamTrack: audioTracks[0],
                });
                if (!isMounted) {
                  musicTrack.close();
                  return;
                }
                try {
                  const agVolume = isRoomMuted ? 0 : Math.round(musicVolume * 100);
                  musicTrack.setVolume(agVolume);
                  console.log("Initialized custom Agora music track volume to:", agVolume);
                } catch (volErr) {
                  console.error("Error setting initial custom music track volume:", volErr);
                }
                localMusicAudioTrackRef.current = musicTrack;
                await client.publish(musicTrack);
                console.log("Successfully published local music stream to Agora channel.");
              } else {
                console.warn("No audio tracks found in the captured media stream.");
              }
            } else {
              console.warn("Browser does not support captureStream on HTMLAudioElement.");
            }
          } catch (err) {
            console.error("Failed to create or publish custom Agora music track:", err);
          }
        }
      } else {
        if (localMusicAudioTrackRef.current) {
          try {
            console.log("Unpublishing and closing custom Agora music stream...");
            const track = localMusicAudioTrackRef.current;
            localMusicAudioTrackRef.current = null;
            await client.unpublish(track);
            track.stop();
            track.close();
            console.log("Custom Agora music stream unpublished and closed.");
          } catch (err) {
            console.error("Error cleaning up custom Agora music stream:", err);
          }
        }
      }
    };

    syncMusicStreaming();

    return () => {
      isMounted = false;
    };
  }, [isAgoraConnected, isMusicPlaying, micStates, user?.uid, isRoomMuted]);

  // Keep a live ref to micStates for synchronous visibility of current mics
  const micStatesRef = useRef(micStates);
  useEffect(() => {
    micStatesRef.current = micStates;
  }, [micStates]);

  useEffect(() => {
    const clearMyMicPresence = async () => {
      if (!user) return;
      if (currentRoom?.musicState?.senderUid === user.uid) {
        try {
          await updateDoc(doc(db, "rooms", currentRoom.id), {
            musicState: {
              playing: false,
              title: "",
              src: "",
              senderUid: "",
              seekPosition: 0
            }
          });
        } catch (musicErr) {
          console.error("Music cleanup error in presence cleanup:", musicErr);
        }
      }
      const currentMics = micStatesRef.current;
      if (!currentMics) return;
      const myMicIndex = currentMics.findIndex(m => m?.user?.uid === user.uid);
      if (myMicIndex !== -1) {
        try {
          await updateDoc(doc(db, "rooms", currentRoom.id, "mics", myMicIndex.toString()), {
            user: null,
            status: 'open',
            receivedCoins: 0
          });
        } catch (err) {
          console.error("Presence cleanup error:", err);
        }
      }
    };

    const handleUnloadOrHide = (e: any) => {
      clearMyMicPresence();
    };

    window.addEventListener('beforeunload', handleUnloadOrHide);
    window.addEventListener('unload', handleUnloadOrHide);
    window.addEventListener('pagehide', handleUnloadOrHide);

    return () => {
      window.removeEventListener('beforeunload', handleUnloadOrHide);
      window.removeEventListener('unload', handleUnloadOrHide);
      window.removeEventListener('pagehide', handleUnloadOrHide);
      clearMyMicPresence();
    };
  }, [currentRoom.id, user?.uid]);

  const [isEntryMinimized, setIsEntryMinimized] = useState(false);
  const [entryPos, setEntryPos] = useState({ x: 20, y: 100 });
  const isDraggingEntry = useRef(false);
  const dragEntryOffset = useRef({ x: 0, y: 0 });
  const entryMoveThreshold = useRef(false);

  const [selectedMicIndex, setSelectedMicIndex] = useState<number | null>(null);
  const [showMicActions, setShowMicActions] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  
  const [profileUserUid, setProfileUserUid] = useState<string | null>(null);
  const [profileUserData, setProfileUserData] = useState<any>(null);
  const [profileFollowersCount, setProfileFollowersCount] = useState<number>(0);
  const [profileFriendsCount, setProfileFriendsCount] = useState<number>(0);
  
  const [giftTab, setGiftTab] = useState<GiftTab>('normal');
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null); 
  const [ownerData, setOwnerData] = useState<any>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [userDataPopupBadges, setUserDataPopupBadges] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const sendingGiftRef = useRef(false);

  const [selectionMode, setSelectionMode] = useState<SelectionMode>('manual');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);

  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [showQuantityMenu, setShowQuantityMenu] = useState(false);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const quantities = [1, 7, 10, 38, 66, 188, 520, 1314, 2628];

  const [designSettings, setDesignSettings] = useState<any>(null);
  const [defaultImages, setDefaultImages] = useState<any>(null);
  const [dynamicEmojis, setDynamicEmojis] = useState<any[]>([]);
  const [dynamicGifts, setDynamicGifts] = useState<Gift[]>([]);

  // Lucky Gifts, Combo & Flying Gift States
  const [showLuckyWinModal, setShowLuckyWinModal] = useState(false);
  const [luckyWinInfo, setLuckyWinInfo] = useState<{ coins: number; multiplier: number; giftName: string; quantity?: number } | null>(null);
  const luckyWinTimeoutRef = useRef<any>(null);

  const [comboActive, setComboActive] = useState(false);
  const [comboCount, setComboCount] = useState(1);
  const [comboProgress, setComboProgress] = useState(100);
  const [comboPressEffect, setComboPressEffect] = useState(false);
  const comboTimerRef = useRef<any>(null);
  const lastGiftDataRef = useRef<{
    gift: Gift;
    recipientIds: Set<string>;
    quantity: number;
  } | null>(null);

  const [flyingGifts, setFlyingGifts] = useState<FlyingGiftItemData[]>([]);
  const [pulsingMicUid, setPulsingMicUid] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (comboTimerRef.current) clearInterval(comboTimerRef.current);
      if (luckyWinTimeoutRef.current) clearTimeout(luckyWinTimeoutRef.current);
    };
  }, []);

  const [editRoomTitle, setEditRoomTitle] = useState(currentRoom.title);
  const [editRoomDescription, setEditRoomDescription] = useState(currentRoom.description || '');
  const [editRoomCover, setEditRoomCover] = useState(currentRoom.coverImage);
  const [editRoomBg, setEditRoomBg] = useState(currentRoom.roomBackground || '');
  const [editRoomTrophyBg, setEditRoomTrophyBg] = useState(currentRoom.roomTrophyBg || '');
  const [editMicCount, setEditMicCount] = useState(currentRoom.micCount || 10);
  const [availableBgs, setAvailableBgs] = useState<any[]>([]);
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);
  const [showBgSelector, setShowBgSelector] = useState(false);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [blacklistUsers, setBlacklistUsers] = useState<any[]>([]);
  const [isLoadingBlacklist, setIsLoadingBlacklist] = useState(false);

  const fetchBlacklistUsers = async () => {
    if (!currentRoom.bannedUsers || currentRoom.bannedUsers.length === 0) {
      setBlacklistUsers([]);
      return;
    }
    setIsLoadingBlacklist(true);
    try {
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const chunks: string[][] = [];
      const tempBanned = [...currentRoom.bannedUsers];
      while (tempBanned.length > 0) {
        chunks.push(tempBanned.splice(0, 10));
      }
      
      let fetched: any[] = [];
      for (const chunk of chunks) {
        const q = query(collection(db, "users"), where("uid", "in", chunk));
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
          fetched.push({ id: docSnap.id, ...docSnap.data() });
        });
      }
      setBlacklistUsers(fetched);
    } catch (err) {
      console.error("Error fetching blacklist users:", err);
    } finally {
      setIsLoadingBlacklist(false);
    }
  };

  useEffect(() => {
    if (showBlacklist) {
      fetchBlacklistUsers();
    }
  }, [showBlacklist, currentRoom.bannedUsers]);

  const handleUnbanUser = async (targetUid: string) => {
    try {
      const { arrayRemove } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await updateDoc(doc(db, "rooms", currentRoom.id), {
        bannedUsers: arrayRemove(targetUid)
      });
      setBlacklistUsers(prev => prev.filter(u => u.uid !== targetUid));
      alert(t("تم إلغاء طرد العضو من الغرفة بنجاح", "User unbanned from room successfully"));
    } catch (err) {
      console.error("Error unbanning user:", err);
      alert(t("فشلت العملية، يرجى المحاولة لاحقاً", "Operation failed, please try again later"));
    }
  };

  const [showModeratorsList, setShowModeratorsList] = useState(false);
  const [moderatorUsers, setModeratorUsers] = useState<any[]>([]);
  const [isLoadingModerators, setIsLoadingModerators] = useState(false);
  const [modSearchQuery, setModSearchQuery] = useState("");
  const [searchedUserForMod, setSearchedUserForMod] = useState<any | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  const fetchModerators = async () => {
    if (!currentRoom.moderators || currentRoom.moderators.length === 0) {
      setModeratorUsers([]);
      return;
    }
    setIsLoadingModerators(true);
    try {
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const chunks: string[][] = [];
      const tempMods = [...currentRoom.moderators];
      while (tempMods.length > 0) {
        chunks.push(tempMods.splice(0, 10));
      }
      
      let fetched: any[] = [];
      for (const chunk of chunks) {
        const q = query(collection(db, "users"), where("uid", "in", chunk));
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
          fetched.push({ id: docSnap.id, ...docSnap.data() });
        });
      }
      setModeratorUsers(fetched);
    } catch (err) {
      console.error("Error fetching room moderators:", err);
    } finally {
      setIsLoadingModerators(false);
    }
  };

  useEffect(() => {
    if (showModeratorsList) {
      fetchModerators();
    }
  }, [showModeratorsList, currentRoom.moderators]);

  const handleSearchUserForMod = async () => {
    if (!modSearchQuery.trim()) {
      alert(t("يرجى إدخال معرف المستخدم المُراد البحث عنه", "Please enter the user ID to search for"));
      return;
    }
    setIsSearchingUser(true);
    setSearchedUserForMod(null);
    try {
      const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const q1 = query(collection(db, "users"), where("customId", "==", modSearchQuery.trim()));
      const snap1 = await getDocs(q1);
      
      if (!snap1.empty) {
        const docSnap = snap1.docs[0];
        setSearchedUserForMod({ id: docSnap.id, ...docSnap.data() });
      } else {
        const q2 = query(collection(db, "users"), where("uid", "==", modSearchQuery.trim()));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          const docSnap = snap2.docs[0];
          setSearchedUserForMod({ id: docSnap.id, ...docSnap.data() });
        } else {
          alert(t("لم يتم العثور على أي مستخدم بهذا الرمز التعريفي", "No user found with this ID"));
        }
      }
    } catch (err) {
      console.error("Error searching user for moderator:", err);
      alert(t("حدث خطأ أثناء البحث، يرجى المحاولة لاحقاً", "An error occurred while searching, please try again later"));
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleAddModerator = async (targetUid: string) => {
    try {
      const { arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await updateDoc(doc(db, "rooms", currentRoom.id), {
        moderators: arrayUnion(targetUid)
      });
      alert(t("تم إضافة المشرف بنجاح", "Moderator added successfully"));
      setSearchedUserForMod(null);
      setModSearchQuery("");
      fetchModerators();
    } catch (err) {
      console.error("Error adding room moderator:", err);
      alert(t("فشل عملية إضافة المشرف", "Failed to add moderator"));
    }
  };

  const handleRemoveModerator = async (targetUid: string) => {
    try {
      const { arrayRemove } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      await updateDoc(doc(db, "rooms", currentRoom.id), {
        moderators: arrayRemove(targetUid)
      });
      alert(t("تم إزالة صلاحيات الإشراف عن العضو بنجاح", "Moderator privileges removed successfully"));
      setModeratorUsers(prev => prev.filter(u => u.uid !== targetUid));
    } catch (err) {
      console.error("Error removing room moderator:", err);
      alert(t("فشل عملية إزالة المشرف", "Failed to remove moderator"));
    }
  };
  const [showReportModal, setShowReportModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [roomPasswordInput, setRoomPasswordInput] = useState(currentRoom.password || '');
  const [showCannotActionAdmin, setShowCannotActionAdmin] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);
  const [reportReason, setReportReason] = useState('اسائة');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [cpConfig, setCpConfig] = useState<any>(null);
  const [fruitsSettings, setFruitsSettings] = useState<any>(null);
  const [aviatorSettings, setAviatorSettings] = useState<any>(null);
  const [lucky77Settings, setLucky77Settings] = useState<any>(null);
  const [popupPartnerData, setPopupPartnerData] = useState<any>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Music Player States & Sync Orchestrator
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [isMusicScanning, setIsMusicScanning] = useState(false);
  
  // Custom local audio file upload tracking list
  const [musicList, setMusicList] = useState<any[]>([]);

  // Load tracks from IndexedDB to always have fresh, valid Object URLs, filtered by the logged-in user
  useEffect(() => {
    let active = true;
    const fetchLocalTracks = async () => {
      const userId = user?.uid || 'anonymous';
      const localTracks = await loadTracksFromDBForUser(userId);
      if (active) {
        setMusicList([...DEFAULT_TRACKS, ...localTracks]);
      }
    };
    fetchLocalTracks();
    return () => {
      active = false;
    };
  }, [currentRoom.id, user?.uid]);

  const handleDeleteTrack = async (trackId: string) => {
    await deleteTrackFromDB(trackId);
    const userId = user?.uid || 'anonymous';
    const localTracks = await loadTracksFromDBForUser(userId);
    setMusicList([...DEFAULT_TRACKS, ...localTracks]);

    const trackToDelete = musicList.find(t => t.id === trackId);
    if (trackToDelete && (currentSongSrc === trackToDelete.src || trackToDelete.name === currentSongTitle)) {
      updateRoomMusicState({ playing: false, src: '', title: '' });
    }
  };
  
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [currentSongTitle, setCurrentSongTitle] = useState('');
  const [currentSongSrc, setCurrentSongSrc] = useState('');
  const [musicSeekPosition, setMusicSeekPosition] = useState(0);
  const [musicDuration, setMusicDuration] = useState(1);
  const isDraggingMusicSeek = useRef(false);

  // Initialize browser audio node
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    const onTimeUpdate = () => {
      if (!isDraggingMusicSeek.current) {
        setMusicSeekPosition(audio.currentTime);
      }
    };

    const onDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setMusicDuration(audio.duration);
      }
    };

    const onEnded = () => {
      setIsMusicPlaying(false);
      
      const onMicIndex = micStatesRef.current.findIndex((m: any) => m?.user?.uid === user?.uid);
      const isRoomOwnerOrMod = isRoomOwner || moderatorUsers.some(u => u.uid === user?.uid) || onMicIndex !== -1;
      
      if (isRoomOwnerOrMod) {
        const currentSrc = audio.src;
        const index = musicList.findIndex(t => t.src === currentSrc || (t.isLocal && audio.src.includes(t.id)));
        if (index !== -1 && index + 1 < musicList.length) {
          const nextTrack = musicList[index + 1];
          updateRoomMusicState({ src: nextTrack.src, title: nextTrack.name, playing: true, seekPosition: 0 });
        } else {
          updateRoomMusicState({ playing: false, seekPosition: 0 });
        }
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audioRef.current = null;
    };
  }, [musicList, isRoomOwner, moderatorUsers, user?.uid]);

  // Handle local player volume updates
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isRoomMuted ? 0 : musicVolume;
    }
    if (localMusicAudioTrackRef.current) {
      try {
        const agVolume = isRoomMuted ? 0 : Math.round(musicVolume * 100);
        localMusicAudioTrackRef.current.setVolume(agVolume);
        console.log("Updated Agora local music audio track volume to:", agVolume);
      } catch (err) {
        console.error("Error setting Agora local music track volume:", err);
      }
    }
  }, [musicVolume, isRoomMuted]);

  // Subscribe and synchronize with Firestore room level musicState
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const ms = currentRoom?.musicState;
    const userIsOnMic = micStates.some(m => m?.user?.uid === user?.uid);

    if (!ms) {
      if (audio.src) {
        audio.pause();
      }
      setIsMusicPlaying(false);
      setCurrentSongTitle('');
      setCurrentSongSrc('');
      return;
    }

    const { src, title, playing, seekPosition, updatedAt, senderUid } = ms;

    setCurrentSongTitle(title || '');
    setCurrentSongSrc(src || '');

    let matchedSrc = src;
    if (src.startsWith('blob:') && senderUid !== user?.uid) {
      const localMatch = musicList.find(t => t.name === title && t.isLocal);
      if (localMatch) {
        matchedSrc = localMatch.src;
      } else {
        matchedSrc = DEFAULT_TRACKS[0]?.src || "";
      }
    }

    if (audio.src !== matchedSrc) {
      audio.src = matchedSrc;
      audio.load();
    }

    // Let music play locally in sync for all members in the room regardless of mic state,
    // so speakers and listeners alike can hear the room music, while avoiding
    // automatic play/pause triggers when joining or leaving a mic.
    const senderIsOnMic = senderUid ? micStates.some(m => m?.user?.uid === senderUid) : false;
    const shouldPlayLocally = playing && senderIsOnMic;
    setIsMusicPlaying(shouldPlayLocally);

    // If Firestore thinks it's playing but the sender is not on the mic,
    // let's auto-rectify the Firestore state to playing: false so new joiners don't get confused
    if (playing && !senderIsOnMic && (userIsOnMic || isRoomOwner)) {
      const rectTimer = setTimeout(() => {
        updateRoomMusicState({ playing: false });
      }, 1500);
      return () => clearTimeout(rectTimer);
    }

    if (shouldPlayLocally) {
      const now = Date.now();
      const latencySeconds = updatedAt ? (now - updatedAt) / 1000 : 0;
      let targetTime = (seekPosition || 0);

      if (latencySeconds > 0 && latencySeconds < 3600) {
        targetTime += latencySeconds;
      }

      if (audio.duration && targetTime > audio.duration) {
        targetTime = targetTime % audio.duration;
      }

      if (Math.abs(audio.currentTime - targetTime) > 3.0) {
        audio.currentTime = Math.max(0, targetTime);
      }

      // Safeguard: Ensure volume is strictly zero if the room itself is muted by user
      audio.volume = isRoomMuted ? 0 : musicVolume;

      audio.play().catch(err => {
        console.warn("Autoplay block or delay waiting for user click:", err);
      });
    } else {
      audio.pause();
      if (seekPosition !== undefined && Math.abs(audio.currentTime - seekPosition) > 1.5) {
        audio.currentTime = seekPosition;
      }
    }
  }, [currentRoom?.musicState, musicList, user?.uid, micStates, isRoomMuted]);

  const updateRoomMusicState = async (updates: { src?: string, title?: string, playing?: boolean, seekPosition?: number }) => {
    try {
      const roomRef = doc(db, "rooms", currentRoom.id);
      const currentMs = currentRoom?.musicState || {};
      
      const newMs = {
        src: updates.src !== undefined ? updates.src : (currentMs.src || ""),
        title: updates.title !== undefined ? updates.title : (currentMs.title || t("جاري تشغيل الموسيقى...", "Music playing...")),
        playing: updates.playing !== undefined ? updates.playing : (currentMs.playing || false),
        seekPosition: updates.seekPosition !== undefined ? updates.seekPosition : (audioRef.current ? audioRef.current.currentTime : 0),
        senderUid: user?.uid || "",
        updatedAt: Date.now()
      };

      await updateDoc(roomRef, {
        musicState: newMs
      });
    } catch (err) {
      console.error("Error updating room music state:", err);
    }
  };

  // Intercept browser back button so it doesn't leave or quit the whole app
  useEffect(() => {
    if (isMinimized) return; // Skip if maximized is not active/minimized is true

    return registerBackAction(() => {
      if (showMusicModal) {
        setShowMusicModal(false);
        return true;
      }
      if (showQuantityMenu) {
        setShowQuantityMenu(false);
        return true;
      }
      if (showSelectionMenu) {
        setShowSelectionMenu(false);
        return true;
      }
      if (showBgSelector) {
        setShowBgSelector(false);
        return true;
      }
      if (showBlacklist) {
        setShowBlacklist(false);
        return true;
      }
      if (showLockModal) {
        setShowLockModal(false);
        return true;
      }
      if (showMicActions) {
        setShowMicActions(false);
        return true;
      }
      if (activeGame) {
        setActiveGame(null);
        return true;
      }
      if (showGamesMenu) {
        setShowGamesMenu(false);
        return true;
      }
      if (showEmojiMenu) {
        setShowEmojiMenu(false);
        return true;
      }
      if (showGifts) {
        setShowGifts(false);
        return true;
      }
      if (showExtraMenu) {
        setShowExtraMenu(false);
        return true;
      }
      if (showRoomSettings) {
        setShowRoomSettings(false);
        return true;
      }
      if (showUserData) {
        setShowUserData(false);
        return true;
      }
      if (showParticipants) {
        setShowParticipants(false);
        return true;
      }
      if (showReportModal) {
        setShowReportModal(false);
        return true;
      }
      if (showReportSuccess) {
        setShowReportSuccess(false);
        return true;
      }
      
      // If none of the specific modal overlays are open, trigger the exit / minimize confirmation dialog
      if (showExitDialog) {
        setShowExitDialog(false);
        return true;
      }
      
      // Open the Keep/Exit dialog inside the room instead of leaving the application!
      setShowExitDialog(true);
      return true;
    });
  }, [
    isMinimized, showQuantityMenu, showSelectionMenu, showBgSelector, showLockModal, 
    showMicActions, activeGame, showGamesMenu, showEmojiMenu, showGifts, 
    showExtraMenu, showRoomSettings, showUserData, showParticipants, 
    showReportModal, showReportSuccess, showExitDialog
  ]);

  const handleUpdateBalance = async (amount: number) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        coins: (currentUserData?.coins || 0) + amount
      });
    } catch (err) {
      console.error("Error updating balance:", err);
    }
  };

  const isVideoUrl = (url?: string) => {
    if (!url) return false;
    return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
  };

  const lastPlayedLuckySoundTimeRef = useRef<number>(0);
  const playLuckyWinAudioEffect = (soundUrl?: string) => {
    try {
      const src = soundUrl || designSettings?.luckyWinSound;
      if (!src) return;
      const audio = new Audio(src);
      audio.volume = isRoomMuted ? 0 : 0.85;
      audio.play().catch(err => {
        console.warn("Autoplay block or delay for lucky win sound:", err);
      });
    } catch (e) {
      console.warn("Error playing lucky win sound effect:", e);
    }
  };

  // مستمع للرسائل الحية مع فلترة للرسائل القديمة
  useEffect(() => {
    const q = query(
      collection(db, "rooms", currentRoom.id, "chat"),
      where("createdAt", ">", joinTime),
      orderBy("createdAt", "asc")
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const liveMsgs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      
      const filteredMsgs = liveMsgs.filter(m => m.type !== 'join');
      setMessages(filteredMsgs);

      // Realtime detection of adding new enter/join messages & lucky win audio broadcast
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          const docData = change.doc.data() as any;
          if (docData.type === 'join') {
            const id = change.doc.id;
            const name = docData.userName;
            
            // Add to live screen notifications
            setJoinNotifications(prev => {
              if (prev.some(item => item.id === id)) return prev;
              return [...prev, { id, name }];
            });
            
            // Auto remove after 3 seconds
            setTimeout(() => {
              setJoinNotifications(prev => prev.filter(item => item.id !== id));
            }, 3000);
          } else if (docData.type === 'lucky_win') {
            // تشغيل صوت الفوز لجميع الموجودين في الغرفة تلقائياً
            if (Date.now() - lastPlayedLuckySoundTimeRef.current > 1500) {
              lastPlayedLuckySoundTimeRef.current = Date.now();
              const soundToPlay = docData.soundUrl || designSettings?.luckyWinSound;
              if (soundToPlay) {
                playLuckyWinAudioEffect(soundToPlay);
              }
            }
          }
        }
      });

      // Trigger gift animations for other users/all users
      if (isEffectsEnabledRef.current) {
        liveMsgs.forEach((msg: any) => {
          if (msg.type === 'gift' && msg.giftAnimation && !animatedMsgIds.current.has(msg.id)) {
            animatedMsgIds.current.add(msg.id);
            setIsGiftMinimized(false);
            setActiveGiftEffect({ url: msg.giftAnimation, id: Date.now() });
          }
        });
      }
    });
    
    return () => unsub();
  }, [currentRoom.id, joinTime]);

  useEffect(() => {
    localStorage.setItem('effects_enabled', isEffectsEnabled.toString());
  }, [isEffectsEnabled]);

  useEffect(() => {
    setShowJoinMessage(true);
    if (currentUserData?.currentEntry && isEffectsEnabled) {
      setShowJoinVideo(true);
      setIsEntryMinimized(false); 
    }
    const msgTimer = setTimeout(() => {
      setShowJoinMessage(false);
    }, 4000);
    return () => clearTimeout(msgTimer);
  }, [currentUserData?.currentEntry]); 

  const renderMessageText = (msgText: string) => {
    if (!msgText) return null;

    const myName = currentUserData?.displayName || user?.displayName || '';
    
    // Gather all unique display names in the room to target them for custom color mentions
    const names = new Set<string>();
    if (myName) names.add(myName);
    if (allPresentUsers) {
      allPresentUsers.forEach(u => {
        if (u.displayName && u.displayName.trim()) names.add(u.displayName.trim());
      });
    }
    if (displayedMics) {
      displayedMics.forEach(mic => {
        if (mic?.user?.displayName && mic?.user?.displayName.trim()) {
          names.add(mic.user.displayName.trim());
        }
      });
    }

    // Sort by descending length so that longer names match and tokenise first e.g. "@Adham Yosry" rather than "@Adham"
    const sortedNames = Array.from(names).sort((a, b) => b.length - a.length);

    let parts: { text: string; isMention: boolean; isMeMention: boolean }[] = [{ text: msgText, isMention: false, isMeMention: false }];

    for (const name of sortedNames) {
      const isMyName = name === myName;
      const searchStr = `@${name}`;
      
      let newParts: typeof parts = [];
      for (const part of parts) {
        if (part.isMention) {
          newParts.push(part);
          continue;
        }

        let text = part.text;
        let index = text.indexOf(searchStr);
        while (index !== -1) {
          if (index > 0) {
            newParts.push({ text: text.substring(0, index), isMention: false, isMeMention: false });
          }
          newParts.push({ text: searchStr, isMention: true, isMeMention: isMyName });
          text = text.substring(index + searchStr.length);
          index = text.indexOf(searchStr);
        }
        if (text.length > 0) {
          newParts.push({ text, isMention: false, isMeMention: false });
        }
      }
      parts = newParts;
    }

    // General fallback for usernames without spaces parsed using non-whitespace regex matching (e.g., @Adham)
    let finalParts: typeof parts = [];
    for (const part of parts) {
      if (part.isMention) {
        finalParts.push(part);
        continue;
      }

      const regex = /(@[^\s]+)/g;
      const splitText = part.text.split(regex);
      for (const segment of splitText) {
        if (segment.startsWith('@') && segment.length > 1) {
          const rawName = segment.substring(1);
          const isMyName = myName && (rawName.toLowerCase() === myName.toLowerCase() || rawName === myName);
          finalParts.push({ text: segment, isMention: true, isMeMention: !!isMyName });
        } else if (segment) {
          finalParts.push({ text: segment, isMention: false, isMeMention: false });
        }
      }
    }

    return (
      <span dir="rtl" className="text-right inline/inline-block text-[12px] leading-tight select-text w-full">
        {finalParts.map((part, idx) => {
          if (part.isMention) {
            let dispText = part.text;
            if (part.isMeMention) {
              dispText = `@${t('أنا', 'Me')}`;
            }
            return (
              <span 
                key={idx} 
                className="font-black text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded-md border border-purple-500/20 mx-0.5 inline-block align-middle cursor-pointer text-right"
                dir="rtl"
              >
                {dispText}
              </span>
            );
          }
          return <span key={idx} className="align-middle inline text-right" dir="rtl">{part.text}</span>;
        })}
      </span>
    );
  };

  const handleEntryPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isEntryMinimized) return;
    isDraggingEntry.current = true;
    entryMoveThreshold.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragEntryOffset.current = { x: clientX - entryPos.x, y: clientY - entryPos.y };
  };

  const handleGiftPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isGiftMinimized) return;
    isDraggingGift.current = true;
    giftMoveThreshold.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragGiftOffset.current = { x: clientX - giftPos.x, y: clientY - giftPos.y };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

      if (isDraggingEntry.current) {
        entryMoveThreshold.current = true;
        const nextX = Math.min(Math.max(10, clientX - dragEntryOffset.current.x), window.innerWidth - 130);
        const nextY = Math.min(Math.max(10, clientY - dragEntryOffset.current.y), window.innerHeight - 230);
        setEntryPos({ x: nextX, y: nextY });
      }

      if (isDraggingGift.current) {
        giftMoveThreshold.current = true;
        const nextX = Math.min(Math.max(10, clientX - dragGiftOffset.current.x), window.innerWidth - 130);
        const nextY = Math.min(Math.max(10, clientY - dragGiftOffset.current.y), window.innerHeight - 230);
        setGiftPos({ x: nextX, y: nextY });
      }
    };

    const handleUp = () => { 
      isDraggingEntry.current = false; 
      isDraggingGift.current = false;
    };

    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [entryPos, giftPos]);

  const toggleEntryMode = () => {
    if (entryMoveThreshold.current) return;
    setIsEntryMinimized(!isEntryMinimized);
  };

  const toggleGiftMode = () => {
    if (giftMoveThreshold.current) return;
    setIsGiftMinimized(!isGiftMinimized);
  };

  useEffect(() => {
    const unsubRoom = onSnapshot(doc(db, "rooms", currentRoom.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        if (data.bannedUsers && user?.uid && data.bannedUsers.includes(user.uid)) {
          if (onKicked) {
            onKicked(data.title || currentRoom.name || t("الغرفة", "the room"));
          } else {
            alert(t("لقد تم طردك من هذه الغرفة", "You have been kicked/banned from this room."));
          }
          onLeave();
          return;
        }

        setCurrentRoom(prev => ({ ...prev, ...data }));
        if (!showRoomSettings) {
          setEditRoomTitle(data.title);
          setEditRoomDescription(data.description || '');
          setEditRoomCover(data.coverImage);
          setEditRoomBg(data.roomBackground || '');
          setEditRoomTrophyBg(data.roomTrophyBg || '');
          setEditMicCount(data.micCount || 10);
        }
      }
    });

    const micsRef = collection(db, "rooms", currentRoom.id, "mics");
    const unsubMics = onSnapshot(micsRef, (snap) => {
      const newMics = Array(currentRoom.micCount || 10).fill({ status: 'open', user: null });
      snap.docs.forEach(doc => {
        const index = parseInt(doc.id);
        if (index < newMics.length) {
          newMics[index] = doc.data();
        }
      });
      setMicStates(newMics);
    });
    return () => {
      unsubRoom();
      unsubMics();
    };
  }, [currentRoom.id, showRoomSettings, currentRoom.micCount]);

  useEffect(() => {
    if (currentRoom.owner?.uid) {
      const unsub = onSnapshot(doc(db, "users", currentRoom.owner.uid), (docSnap) => {
        if (docSnap.exists()) setOwnerData(docSnap.data());
      });
      return unsub;
    }
  }, [currentRoom.owner?.uid]);

  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) setCurrentUserData(docSnap.data());
      });
      return unsub;
    }
  }, [user]);

  useEffect(() => {
    if (!showBarWealthModal || !currentRoom.id) return;
    
    const logsRef = collection(db, "rooms", currentRoom.id, "barWealthLogs");
    const qLogs = query(logsRef, orderBy("createdAt", "desc"));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      const logs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBarWealthLogs(logs);
    }, (err) => {
      console.error("Error fetching bar wealth logs:", err);
    });
    
    return unsubLogs;
  }, [showBarWealthModal, currentRoom.id]);

  useEffect(() => {
    if (!showRoomTrophyModal || !currentRoom.id) return;
    
    const logsRef = collection(db, "rooms", currentRoom.id, "giftLogs");
    const qLogs = query(logsRef, orderBy("createdAt", "desc"), limit(500));
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      const logs = snap.docs.map(doc => {
        const data = doc.data();
        let cAt = new Date();
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === 'function') {
            cAt = data.createdAt.toDate();
          } else if (data.createdAt.seconds) {
            cAt = new Date(data.createdAt.seconds * 1000);
          } else {
            cAt = new Date(data.createdAt);
          }
        }
        return {
          id: doc.id,
          ...data,
          createdAt: cAt
        };
      });
      setRoomGiftLogs(logs);
    }, (err) => {
      console.error("Error fetching room gift logs:", err);
    });
    
    return unsubLogs;
  }, [showRoomTrophyModal, currentRoom.id]);

  // Real-time custom background validation has been disabled because it caused
  // issues for visitors (due to Firestore inventory read restrictions or query delay)
  // which wrongly reverted set backgrounds to the room cover/default images.
  // The background set by the owner now remains persistent and secure.

  const hasSentJoinMessage = useRef(false);

  useEffect(() => {
    if (user && currentUserData && !hasSentJoinMessage.current) {
      hasSentJoinMessage.current = true;
      const sendJoinMsg = async () => {
        try {
          await addDoc(collection(db, "rooms", currentRoom.id, "chat"), {
            userId: user.uid,
            userName: currentUserData.displayName || user.displayName || t('مستخدم جديد', 'New User'),
            text: 'join',
            type: 'join',
            userAvatar: currentUserData?.photoURL || user?.photoURL || '',
            isVerified: !!currentUserData?.isVerified,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Error sending join message:", err);
        }
      };
      sendJoinMsg();
    }
  }, [user, currentUserData, currentRoom.id, t]);

  useEffect(() => {
    if (user) {
      const isMutedInRoom = currentRoom.mutedUsers && currentRoom.mutedUsers.includes(user.uid);
      const myMicIndex = micStates.findIndex(m => m?.user?.uid === user.uid);
      const isMicSlotMuted = myMicIndex !== -1 && micStates[myMicIndex]?.isMuted;
      
      if (isMutedInRoom || isMicSlotMuted) {
        setIsMicMuted(true);
      }
    }
  }, [currentRoom.mutedUsers, micStates, user, setIsMicMuted]);

  useEffect(() => {
    if (profileUserUid) {
      const unsub = onSnapshot(doc(db, "users", profileUserUid), (docSnap) => {
        if (docSnap.exists()) {
          setProfileUserData({ uid: profileUserUid, ...docSnap.data() });
        } else {
          const micUser = micStates.map(m => m?.user).find(u => u?.uid === profileUserUid);
          if (micUser) setProfileUserData(micUser);
        }
      });
      return unsub;
    } else {
      setProfileUserData(null);
    }
  }, [profileUserUid, micStates]);

  useEffect(() => {
    if (!profileUserUid) {
      setProfileFollowersCount(0);
      setProfileFriendsCount(0);
      return;
    }
    const q = query(collection(db, "users"), where("following", "array-contains", profileUserUid));
    const unsub = onSnapshot(q, (snap) => {
      const followersUids = snap.docs.map(doc => doc.id);
      setProfileFollowersCount(followersUids.length);
      
      const targetFollowing = profileUserData?.following || [];
      const friendsUids = targetFollowing.filter((uid: string) => followersUids.includes(uid));
      setProfileFriendsCount(friendsUids.length);
    });
    return unsub;
  }, [profileUserUid, profileUserData?.following]);

  useEffect(() => {
    let unsub: any;
    if (showUserData && profileUserUid) {
      const q = query(collection(db, "users", profileUserUid, "badges"), orderBy("createdAt", "desc"));
      unsub = onSnapshot(q, (snap) => {
        setUserDataPopupBadges(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
    return () => { if (unsub) unsub(); };
  }, [showUserData, profileUserUid]);

  useEffect(() => {
    const unsubDesign = onSnapshot(doc(db, "settings", "design"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDesignSettings(data);
        // Preload core design icons
        if (data.giftButtonIcon) { const img = new Image(); img.src = data.giftButtonIcon; }
        if (data.waveRoomIcon) { const img = new Image(); img.src = data.waveRoomIcon; }
        if (data.comboButtonIcon) { const img = new Image(); img.src = data.comboButtonIcon; }
        if (data.luckyCircleTier1) { const img = new Image(); img.src = data.luckyCircleTier1; }
        if (data.luckyCircleTier2) { const img = new Image(); img.src = data.luckyCircleTier2; }
        if (data.luckyCircleTier3) { const img = new Image(); img.src = data.luckyCircleTier3; }
        if (data.luckyCircleTier4) { const img = new Image(); img.src = data.luckyCircleTier4; }
        if (data.luckyWinSound) { const snd = new Audio(); snd.src = data.luckyWinSound; }
      }
    });
    const unsubDefaultProps = onSnapshot(doc(db, "settings", "default_images"), (snap) => {
      if (snap.exists()) {
        setDefaultImages(snap.data());
      }
    });
    const unsubEmojis = onSnapshot(query(collection(db, "emojis"), orderBy("createdAt", "desc")), (snap) => {
      setDynamicEmojis(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubCp = onSnapshot(doc(db, "settings", "cp_config"), (snap) => {
      if (snap.exists()) setCpConfig(snap.data());
    });
    const unsubGifts = onSnapshot(query(collection(db, "gifts"), orderBy("createdAt", "desc")), (snap) => {
      if (snap.empty) {
        setDynamicGifts(STATIC_GIFTS as any);
      } else {
        const giftsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        setDynamicGifts(giftsData);
        // Preload gift images to avoid delay when opening menu
        giftsData.forEach(gift => {
          if (gift.imageUrl) {
            const img = new Image();
            img.src = gift.imageUrl;
          }
        });
      }
    });
    const unsubFruits = onSnapshot(doc(db, "settings", "fruitsGame"), (snap) => {
      if (snap.exists()) setFruitsSettings(snap.data());
    });
    const unsubAviator = onSnapshot(doc(db, "settings", "aviatorGame"), (snap) => {
      if (snap.exists()) setAviatorSettings(snap.data());
    });
    const unsubLucky77 = onSnapshot(doc(db, "settings", "lucky77Game"), (snap) => {
      if (snap.exists()) setLucky77Settings(snap.data());
    });
    return () => {
      unsubDesign(); unsubDefaultProps(); unsubEmojis(); unsubGifts(); unsubCp(); unsubFruits(); unsubAviator(); unsubLucky77();
    };
  }, []);

  useEffect(() => {
    if (showUserData && profileUserData?.partnerUid) {
      const unsub = onSnapshot(doc(db, "users", profileUserData.partnerUid), (docSnap) => {
        if (docSnap.exists()) setPopupPartnerData(docSnap.data());
      });
      return unsub;
    } else {
      setPopupPartnerData(null);
    }
  }, [showUserData, profileUserData?.partnerUid]);

  useEffect(() => {
    if (showRoomSettings) {
      const fetchAllBgs = async () => {
        const publicSnapshot = await getDocs(collection(db, "roomBackgrounds"));
        const publicBgs = publicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        let ownedBgs: any[] = [];
        if (user) {
          const inventorySnapshot = await getDocs(query(collection(db, "users", user.uid, "inventory"), where("type", "==", "background"), where("isEquipped", "==", true)));
          const now = new Date();
          ownedBgs = inventorySnapshot.docs.map(doc => {
            const data = doc.data();
            let remainingDays = 0;
            if (data.expiresAt) {
              const exp = data.expiresAt.toDate();
              const diff = exp.getTime() - now.getTime();
              remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
            }
            return { id: doc.id, imageUrl: data.imageUrl || data.videoUrl, videoUrl: data.videoUrl || null, name: data.name, isOwned: true, remainingDays };
          });
        }
        const combined = [...publicBgs];
        ownedBgs.forEach(obg => { if (!combined.some(c => c.imageUrl === obg.imageUrl)) combined.push(obg); });
        setAvailableBgs(combined);
      };
      fetchAllBgs();
    } else {
      setShowBgSelector(false);
      setShowBlacklist(false);
      setShowModeratorsList(false);
    }
  }, [showRoomSettings, user]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputText === '') return; 
    
    if (currentRoom.mutedUsers && user?.uid && currentRoom.mutedUsers.includes(user.uid)) {
      alert(t("لقد تم كتمك من الكتابة والدردشة في هذه الغرفة", "You have been muted from chatting in this room."));
      return;
    }

    const myName = currentUserData?.displayName || user?.displayName || '';
    if (myName) {
      const normalizedMyName = myName.trim().toLowerCase();
      const lowerInput = inputText.toLowerCase();
      const nameParts = myName.split(/\s+/).map(p => p.trim().toLowerCase()).filter(p => p.length > 1);
      
      const hasSelfMentionText = lowerInput.includes(`@${normalizedMyName}`);
      const words = inputText.split(/\s+/);
      const hasSelfMentionParts = words.some(word => {
        if (word.startsWith('@')) {
          const rawMentionedWord = word.substring(1).toLowerCase();
          return nameParts.includes(rawMentionedWord);
        }
        return false;
      });

      if (hasSelfMentionText || hasSelfMentionParts) {
        alert(t("لا يمكنك منشنة نفسك في الغرفة", "You cannot mention yourself in the room."));
        return;
      }
    }
    
    try {
      await addDoc(collection(db, "rooms", currentRoom.id, "chat"), {
        userId: user?.uid || 'anonymous',
        userName: currentUserData?.displayName || t('مستخدم', 'User'),
        text: inputText,
        type: 'text',
        userAvatar: currentUserData?.photoURL || user?.photoURL || '',
        isVerified: !!currentUserData?.isVerified,
        createdAt: serverTimestamp()
      });
      setInputText('');
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleDistributeBarWealth = async () => {
    if (isDistributing) return;
    if (!targetUserIdInput.trim()) {
      return alert(t("الرجاء إدخال أيدي المستخدم أولاً", "Please enter user ID first"));
    }
    const chargeAmount = parseInt(distributionAmountInput);
    if (isNaN(chargeAmount) || chargeAmount <= 0) {
      return alert(t("الرجاء إدخال عدد صحيح وصحيح للمبلغ", "Please enter a valid positive integer amount"));
    }
    const currentWealth = currentRoom.barWealth || 0;
    if (currentWealth < chargeAmount) {
      return alert(t("ثروة البار لا تكفي لتنفيذ هذا الإجراء", "The bar wealth has insufficient gold coins"));
    }

    setIsDistributing(true);
    try {
      // Find user by customId or standard uid
      const qUser = query(collection(db, "users"), where("customId", "==", targetUserIdInput.trim()));
      const qSnap = await getDocs(qUser);
      
      let targetUserDoc: any = null;
      if (qSnap.docs.length > 0) {
        const snap = qSnap.docs[0];
        targetUserDoc = { uid: snap.id, ...snap.data() };
      } else {
        // try direct uid lookup
        const directSnap = await getDoc(doc(db, "users", targetUserIdInput.trim()));
        if (directSnap.exists()) {
          targetUserDoc = { uid: directSnap.id, ...directSnap.data() };
        }
      }

      if (!targetUserDoc) {
        setIsDistributing(false);
        return alert(t("المستخدم غير موجود، يرجى التحقق من الأيدي", "User not found, please check the ID"));
      }

      // Check permissions: only room owner or admin can distribute
      if (!isRoomOwner) {
        setIsDistributing(false);
        return alert(t("عذراً، هذا الإجراء متاح فقط لمؤسس الغرفة", "Sorry, this action is only available for the room owner"));
      }

      // Execute transaction updates
      // 1. Decrement room's barWealth
      await updateDoc(doc(db, "rooms", currentRoom.id), {
        barWealth: increment(-chargeAmount)
      });

      // 2. Increment target user's coins
      await updateDoc(doc(db, "users", targetUserDoc.uid), {
        coins: increment(chargeAmount)
      });

      // 3. Add to room's barWealthLogs
      await addDoc(collection(db, "rooms", currentRoom.id, "barWealthLogs"), {
        targetUid: targetUserDoc.uid,
        targetName: targetUserDoc.displayName || t("مستخدم", "User"),
        targetCustomId: targetUserDoc.customId || targetUserDoc.uid.substring(0, 8),
        targetPhoto: targetUserDoc.photoURL || '',
        amount: chargeAmount,
        createdAt: serverTimestamp()
      });

      const ownerName = ownerData?.displayName || currentRoom.owner?.displayName || t("صاحب الغرفة", "Room Owner");
      const remainingWealth = currentWealth - chargeAmount;

      // 4. Send system notification to the recipient
      await addDoc(collection(db, "users", targetUserDoc.uid, "systemNotifications"), {
        title: t("شحن من ثروة البار", "Bar Wealth Coins Gifted"),
        text: language === 'ar' 
          ? `تهانينا! تم شحن ${chargeAmount.toLocaleString('en-US')} كوينز لك من ثروة البار الخاصة بـ "${ownerName}".`
          : `Congratulations! You received ${chargeAmount.toLocaleString('en-US')} coins from the bar wealth of "${ownerName}".`,
        desc: language === 'ar' 
          ? `تهانينا! تم شحن ${chargeAmount.toLocaleString('en-US')} كوينز لك من ثروة البار الخاصة بـ "${ownerName}".`
          : `Congratulations! You received ${chargeAmount.toLocaleString('en-US')} coins from the bar wealth of "${ownerName}".`,
        icon: 'fa-coins',
        createdAt: serverTimestamp(),
        read: false
      });

      alert(t("تهانينا! لقد تم شحن الكوينزات بنجاح إلى المستخدم.", "Congratulations! Coins have been successfully gifted to the user."));
      setTargetUserIdInput('');
      setDistributionAmountInput('');
    } catch (err) {
      console.error("Error distributing bar wealth:", err);
      alert(t("حدث خطأ أثناء التوزيع، يرجى المحاولة لاحقاً", "An error occurred during distribution, please try again later"));
    } finally {
      setIsDistributing(false);
    }
  };

  const triggerGiftFlight = (giftIcon: string, recipientId: string) => {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight * 0.28;

    const micEl = document.querySelector(`[data-mic-user-uid="${recipientId}"]`);
    if (micEl) {
      const rect = micEl.getBoundingClientRect();
      targetX = rect.left + rect.width / 2;
      targetY = rect.top + rect.height / 2;
    }

    const startX = window.innerWidth / 2;
    const startY = window.innerHeight - 80;

    const animId = `fly-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setFlyingGifts(prev => [...prev, {
      id: animId,
      icon: giftIcon,
      startX,
      startY,
      targetX,
      targetY,
      recipientId
    }]);

    // When entering avatar, trigger absorption ripple on mic
    setTimeout(() => {
      setPulsingMicUid(recipientId);
      setTimeout(() => setPulsingMicUid(null), 700);
    }, 750);
  };

  const startComboCountdown = () => {
    if (comboTimerRef.current) clearInterval(comboTimerRef.current);
    const startTime = Date.now();
    const duration = 5000;

    comboTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, ((duration - elapsed) / duration) * 100);
      setComboProgress(remainingPct);

      if (elapsed >= duration) {
        clearInterval(comboTimerRef.current);
        setComboActive(false);
        setComboCount(1);
      }
    }, 50);
  };

  const sendGiftCore = async (
    gift: Gift,
    recipientUserIds: Set<string>,
    quantity: number,
    isComboCall = false
  ) => {
    if (sendingGiftRef.current || isSendingGift) return;
    if (!user) return;

    let finalRecipients = new Set(recipientUserIds);
    if (finalRecipients.size === 0) {
      const defaultRecipient = usersOnMics.find(u => u.uid && u.uid !== user?.uid)?.uid 
        || usersOnMics[0]?.uid 
        || currentRoom.hostId 
        || currentRoom.userId 
        || currentRoom.ownerId 
        || user.uid;
      if (defaultRecipient) {
        finalRecipients = new Set([defaultRecipient]);
        setSelectedUserIds(finalRecipients);
      }
    }

    const totalRecipients = finalRecipients.size;
    if (totalRecipients === 0) {
      alert(t("يرجى اختيار شخص واحد على الأقل لإرسال الهدية", "Please select at least one recipient to send the gift"));
      return;
    }

    const giftValue = gift.price * quantity;
    const totalCost = giftValue * totalRecipients;

    if ((currentUserData?.coins || 0) < totalCost) {
      if (isComboCall) {
        setComboActive(false);
      }
      alert(t("رصيدك غير كافٍ لإرسال الهدية. رصيدك الحالي: ", "Insufficient balance to send the gift. Your balance: ") + (currentUserData?.coins || 0).toLocaleString('en-US') + " 🪙");
      return;
    }

    sendingGiftRef.current = true;
    setIsSendingGift(true);

    try {
      // 1. إطلاق حركة طيران الهدية نحو صورة المستخدم على المايك
      for (const recipientId of Array.from(finalRecipients)) {
        triggerGiftFlight(gift.icon, recipientId);
      }

      // 2. تحديث بيانات المرسل (خصم كوينزات + نقاط ثروة)
      const newWealthXP = (currentUserData?.wealthXP || 0) + totalCost;
      const { level: newWealthLevel } = getWealthLevelInfo(newWealthXP);

      await updateDoc(doc(db, "users", user.uid), {
        coins: increment(-totalCost),
        wealthXP: increment(totalCost),
        wealthLevel: newWealthLevel
      });

      setCurrentUserData((prev: any) => prev ? {
        ...prev,
        coins: Math.max(0, (prev.coins || 0) - totalCost),
        wealthXP: newWealthXP,
        wealthLevel: newWealthLevel
      } : prev);

      // 3. تحديث ثروة البار للغرفة (20% من قيمة الهدية)
      const barWealthIncrement = Math.floor(totalCost * 0.2);
      if (barWealthIncrement > 0) {
        try {
          await updateDoc(doc(db, "rooms", currentRoom.id), {
            barWealth: increment(barWealthIncrement)
          });
        } catch (err) {
          console.error("Error updating room bar wealth:", err);
        }
      }

      // 4. تحديث بيانات المستقبلين (جاذبية + ماس)
      const diamondValue = Math.floor(giftValue * 0.3);
      for (const recipientId of Array.from(finalRecipients)) {
        try {
          const recipientRef = doc(db, "users", recipientId);
          const recipientSnap = await getDoc(recipientRef);
          if (recipientSnap.exists()) {
            const rData = recipientSnap.data();
            const newCharismaXP = (rData.charismaXP || 0) + giftValue;
            const { level: newCharismaLevel } = getCharismaLevelInfo(newCharismaXP);

            await updateDoc(recipientRef, {
              charismaXP: increment(giftValue),
              charismaLevel: newCharismaLevel,
              diamonds: increment(diamondValue)
            });
          }
        } catch (recipErr) {
          console.warn("Could not update recipient doc directly, continuing:", recipErr);
        }

        // تحديث كوينزات المايك في فايرستور
        const micIndex = micStates.findIndex(m => m?.user?.uid === recipientId);
        if (micIndex !== -1) {
          try {
            await updateDoc(doc(db, "rooms", currentRoom.id, "mics", micIndex.toString()), {
              receivedCoins: increment(giftValue)
            });
          } catch (err) {
            console.error("Error updating recipient's mic coins in Firestore:", err);
          }
        }
      }

      setMicStates(prev => prev.map(mic => {
        if (mic?.user && finalRecipients.has(mic.user.uid)) {
          return {
            ...mic,
            receivedCoins: (mic.receivedCoins || 0) + giftValue
          };
        }
        return mic;
      }));

      // 5. إشعار الشات وسجل الهدايا
      const recipientNames = Array.from(recipientUserIds).map(uid => {
        const p = allPresentUsers.find(u => u.uid === uid);
        return p?.displayName || t("مستخدم", "User");
      }).join(language === 'ar' ? '، ' : ', ');

      const giftMsg = {
        userId: user.uid,
        userName: currentUserData?.displayName || t('أنا', 'Me'),
        text: language === 'ar' 
          ? `أرسل ${quantity} ${gift.name} إلى ${recipientNames}` 
          : `sent ${quantity} ${gift.name} to ${recipientNames}`, 
        type: 'gift',
        giftName: gift.name,
        giftAnimation: gift.animation || null,
        userAvatar: currentUserData?.photoURL || user.photoURL || '',
        isVerified: !!currentUserData?.isVerified,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, "rooms", currentRoom.id, "chat"), giftMsg);

      try {
        await addDoc(collection(db, "rooms", currentRoom.id, "giftLogs"), {
          senderUid: user.uid,
          senderName: currentUserData?.displayName || t("مستخدم", "User"),
          senderAvatar: currentUserData?.animatedAvatar || currentUserData?.photoURL || '',
          senderCustomId: currentUserData?.customId || user.uid.substring(0, 8),
          senderCustomIdIcon: currentUserData?.customIdIcon || '',
          senderIdOffsetX: currentUserData?.profileIdOffsetX ?? currentUserData?.idOffsetX ?? 28,
          senderIdOffsetY: currentUserData?.profileIdOffsetY ?? currentUserData?.idOffsetY ?? 0.5,
          senderIdFontSize: currentUserData?.profileIdFontSize ?? currentUserData?.idFontSize ?? 11,
          amount: totalCost,
          createdAt: serverTimestamp()
        });
      } catch (logErr) {
        console.error("Error writing gift log:", logErr);
      }

      if (isEffectsEnabled && gift.animation) {
        setIsGiftMinimized(false); 
        setActiveGiftEffect({ url: gift.animation, id: Date.now() });
      }

      // 6. مردود هدايا الحظ (Lucky Gifts Reward Engine)
      const isLucky = (gift as any).tab === 'lucky';
      if (isLucky) {
        const baseWinRate = gift.luckyRate ?? 80;
        const multipliers = (gift.luckyMultipliers && gift.luckyMultipliers.length > 0)
          ? gift.luckyMultipliers
          : [0.05, 0.5, 1, 2, 5, 10, 25];

        // كل ما زاد الاكس (الكمية X مثلاً 10X، 38X، 66X...) زادت نسبة الحظ وفرص الأرقام الكبرى بشكل ملحوظ
        const effectiveX = Math.max(1, quantity);
        // عند زيادة X، تقترب نسبة الفوز من 99% (مثلاً x10 تعطي قفزة هائلة في نسبة الحظ مقارنة بـ x1)
        const xBoost = 1 - Math.exp(-0.20 * (effectiveX - 1));
        const finalWinRate = Math.min(99.6, baseWinRate + (100 - baseWinRate) * xBoost);

        const roll = Math.random() * 100;
        if (roll <= finalWinRate) {
          const sorted = [...multipliers].sort((a, b) => a - b);
          
          // تعديل أوزان المضاعفات بحيث تقل احتمالية الأرقام الضعيفة وتتضاعف فرص المضاعفات العالية (5x, 10x, 25x, ...)
          const power = Math.max(0.12, 0.85 - Math.min(0.68, Math.log10(effectiveX) * 0.48));
          
          const weights = sorted.map((m) => {
            let baseW = Math.max(1, Math.round(100 / Math.pow(m >= 1 ? m : 1, power)));
            
            // عند ضرب إكس عالي (مثلاً x10 فما فوق)، تقليل نسب المردود الخاسر (أقل من 1x) بشكل كبير
            if (effectiveX >= 5 && m < 1) {
              baseW = Math.max(1, Math.round(baseW / (effectiveX * 1.5)));
            }
            // زيادة وزن المضاعفات الرابحة والكبيرة
            if (effectiveX >= 5 && m >= 1) {
              baseW = Math.round(baseW * (1 + Math.log2(effectiveX) * 0.9));
            }
            if (effectiveX >= 10 && m >= 5) {
              baseW = Math.round(baseW * (1 + Math.log2(effectiveX) * 1.5));
            }
            return Math.max(1, baseW);
          });

          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let r = Math.random() * totalWeight;
          let chosenIdx = 0;
          for (let i = 0; i < weights.length; i++) {
            if (r <= weights[i]) {
              chosenIdx = i;
              break;
            }
            r -= weights[i];
          }

          const chosenMultiplier = sorted[chosenIdx];
          const wonCoins = Math.floor(gift.price * chosenMultiplier * quantity);

          if (wonCoins > 0) {
            // إضافة الكوينزات المكتسبة إلى حساب المرسل مباشرة
            await updateDoc(doc(db, "users", user.uid), {
              coins: increment(wonCoins)
            });

            setCurrentUserData((prev: any) => prev ? {
              ...prev,
              coins: (prev.coins || 0) + wonCoins
            } : prev);

            // إظهار الدائرة الاحتفالية في منتصف الشاشة لمدة ثانيتين
            setLuckyWinInfo({
              coins: wonCoins,
              multiplier: chosenMultiplier,
              giftName: gift.name,
              quantity: quantity
            });
            setShowLuckyWinModal(true);
            if (luckyWinTimeoutRef.current) clearTimeout(luckyWinTimeoutRef.current);
            luckyWinTimeoutRef.current = setTimeout(() => {
              setShowLuckyWinModal(false);
            }, 2000);

            // تشغيل الساوند إفيكت للرابح فوراً وتحديث التوقيت
            playLuckyWinAudioEffect(designSettings?.luckyWinSound);
            lastPlayedLuckySoundTimeRef.current = Date.now();

            // رسالة تهنئة في شات الغرفة مع رابط الساوند إفيكت ليعمل لجميع المستخدمين
            try {
              await addDoc(collection(db, "rooms", currentRoom.id, "chat"), {
                userId: 'system',
                userName: t('هدايا الحظ', 'Lucky Gifts'),
                text: `🎉 مبارك! فاز ${currentUserData?.displayName || t('مستخدم', 'User')} بـ ${wonCoins.toLocaleString('en-US')} كوينز (مضاعف x${chosenMultiplier}${quantity > 1 ? ` مع ضرب ${quantity}X` : ''}) من هدية الحظ ${gift.name}!`,
                type: 'lucky_win',
                soundUrl: designSettings?.luckyWinSound || '',
                userAvatar: currentUserData?.photoURL || '',
                createdAt: serverTimestamp()
              });
            } catch (chatErr) {
              console.error("Error announcing lucky win in chat:", chatErr);
            }
          }
        }
      }

      // 7. تفعيل زر الـ COMBO لتكرار الرمي فوراً
      lastGiftDataRef.current = { gift, recipientIds: new Set(recipientUserIds), quantity };
      setComboActive(true);
      setComboCount(prev => (isComboCall ? prev + 1 : 1));
      setComboProgress(100);
      startComboCountdown();

      if (!isComboCall) {
        setShowGifts(false);
      }

    } catch (err) {
      console.error(err);
      alert(t("حدث خطأ أثناء إرسال الهدية", "An error occurred while sending the gift"));
    } finally {
      sendingGiftRef.current = false;
      setIsSendingGift(false);
    }
  };

  const handleSendGift = async () => {
    if (sendingGiftRef.current || isSendingGift) return;

    let targetGiftId = selectedGiftId;
    if (!targetGiftId && filteredGifts.length > 0) {
      targetGiftId = filteredGifts[0].id;
      setSelectedGiftId(targetGiftId);
    }
    if (!targetGiftId) {
      alert(t("يرجى اختيار هدية أولاً", "Please select a gift first"));
      return;
    }

    let targetRecipients = new Set(selectedUserIds);
    if (targetRecipients.size === 0) {
      const defaultRecipient = usersOnMics.find(u => u.uid && u.uid !== user?.uid)?.uid 
        || usersOnMics[0]?.uid 
        || currentRoom.hostId 
        || currentRoom.userId 
        || currentRoom.ownerId 
        || user?.uid;
      if (defaultRecipient) {
        targetRecipients = new Set([defaultRecipient]);
        setSelectedUserIds(targetRecipients);
      }
    }

    if (targetRecipients.size === 0) {
      alert(t("يرجى اختيار شخص واحد على الأقل لإرسال الهدية", "Please select at least one recipient to send the gift"));
      return;
    }

    const gift = dynamicGifts.find(g => g.id === targetGiftId);
    if (!gift) return;

    await sendGiftCore(gift, targetRecipients, selectedQuantity, false);
  };

  const handleComboClick = async () => {
    if (!lastGiftDataRef.current || isSendingGift || sendingGiftRef.current) return;
    setComboPressEffect(true);
    setTimeout(() => setComboPressEffect(false), 120);
    const { gift, recipientIds, quantity } = lastGiftDataRef.current;
    await sendGiftCore(gift, recipientIds, quantity, true);
  };

  const sendGifEmoji = async (url: string) => {
    const myMicIndex = micStates.findIndex(m => m?.user?.uid === user?.uid);
    if (myMicIndex !== -1) {
      const timestampedUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
      try {
        await updateDoc(doc(db, "rooms", currentRoom.id, "mics", myMicIndex.toString()), {
          activeEmoji: timestampedUrl
        });

        setTimeout(async () => {
          try {
            await updateDoc(doc(db, "rooms", currentRoom.id, "mics", myMicIndex.toString()), {
              activeEmoji: null
            });
          } catch (err) {
            console.error("Error clearing activeEmoji:", err);
          }
        }, 2500);
      } catch (err) {
        console.error("Error sending activeEmoji:", err);
      }
    }
    setShowEmojiMenu(false);
  };

  const handleUpdateRoomSettings = async () => {
    if (!editRoomTitle.trim()) return alert(t("يرجى إدخل اسم للغرفة", "Please enter a room name"));
    setIsUpdatingRoom(true);
    try {
      await updateDoc(doc(db, "rooms", currentRoom.id), { 
        title: editRoomTitle, 
        description: editRoomDescription, 
        coverImage: editRoomCover, 
        roomBackground: editRoomBg, 
        micCount: editMicCount 
      });
      setShowRoomSettings(false);
    } catch (err) { alert(t("حدث خطأ أثناء التحديث", "An error occurred during update")); } finally { setIsUpdatingRoom(false); }
  };

  const handleSendReport = async () => {
    if (!user) return;
    if (reportDetails.length < 5) return alert(t("يرجى شرح ما حدث بمزيد من التفاصيل", "Please explain what happened in more details"));
    
    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, "reports"), { 
        roomId: currentRoom.id, 
        roomName: currentRoom.title, 
        roomOwnerUid: currentRoom.owner?.uid || null,
        roomOwnerCustomId: ownerData?.customId || null,
        reporterUid: user.uid, 
        reporterName: user.displayName, 
        reporterCustomId: currentUserData?.customId || null,
        reason: reportReason, 
        details: reportDetails, 
        createdAt: serverTimestamp() 
      });
      setShowReportModal(false);
      setShowReportSuccess(true);
      setReportDetails('');
    } catch (err) { alert(t("خطأ في إرسال البلاغ", "Error submitting report")); } finally { setIsSubmittingReport(false); }
  };

  const handleToggleLockRoom = async () => {
    if (!user) return;
    setIsUpdatingRoom(true);
    try {
      if (roomPasswordInput.trim()) {
        await updateDoc(doc(db, "rooms", currentRoom.id), {
          isLocked: true,
          password: roomPasswordInput.trim()
        });
      } else {
        await updateDoc(doc(db, "rooms", currentRoom.id), {
          isLocked: false,
          password: null
        });
      }
      setShowLockModal(false);
    } catch (err) {
      alert(t("خطأ في تحديث قفل الغرفة", "Error updating room lock status"));
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  const handleUserExit = async () => {
    if (user) {
      if (currentRoom?.musicState?.senderUid === user.uid) {
        try {
          await updateDoc(doc(db, "rooms", currentRoom.id), {
            musicState: {
              playing: false,
              title: "",
              src: "",
              senderUid: "",
              seekPosition: 0
            }
          });
        } catch (musicErr) {
          console.error("Error clearing music state on exit:", musicErr);
        }
      }
      const userMicIndex = micStates.findIndex(m => m?.user?.uid === user.uid);
      if (userMicIndex !== -1) {
        try {
          await updateDoc(doc(db, "rooms", currentRoom.id, "mics", userMicIndex.toString()), {
            user: null,
            status: 'open',
            receivedCoins: 0
          });
        } catch (err) {
          console.error("Error clearing mic on exit:", err);
        }
      }
    }
    onLeave();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditRoomCover(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleUserSelection = (uid: string) => {
    if (selectionMode !== 'manual') return; 
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(uid)) newSelected.delete(uid); else newSelected.add(uid);
    setSelectedUserIds(newSelected);
  };

  const handleSelectionMode = (mode: SelectionMode) => {
    setSelectionMode(mode);
    setShowSelectionMenu(false);
    if (mode === 'all-room') {
      const allIds = allPresentUsers.map(u => u.uid).filter(Boolean);
      setSelectedUserIds(new Set(allIds));
    } else if (mode === 'all-mic') {
      const micIds = usersOnMics.map(u => u.uid).filter(Boolean);
      setSelectedUserIds(new Set(micIds));
    } else { setSelectedUserIds(new Set()); }
  };

  const handleMicClick = (index: number) => {
    const mic = micStates[index];
    if (!mic) return;

    if (mic.user) {
      if (mic.user.uid === user?.uid) {
        // Clicked own seat: show the mic control menu with "مغادرة المايك", "عرض البيانات", "إلغاء"
        setSelectedMicIndex(index);
        setShowMicActions(true);
      } else {
        // Clicked someone else's seat: directly open their profile
        setProfileUserUid(mic.user.uid);
        setShowUserData(true);
      }
    } else {
      // Empty seat
      if (canManageRoom) {
        setSelectedMicIndex(index);
        setShowMicActions(true);
      } else {
        if (mic.status === 'open') {
          takeMic(index);
        }
      }
    }
  };

  const takeMic = async (index: number) => {
    if (!user) return;
    
    // Find if user is already on another mic and remove them
    const existingMicIndex = micStates.findIndex(m => m?.user?.uid === user.uid);
    if (existingMicIndex !== -1) {
      await updateDoc(doc(db, "rooms", currentRoom.id, "mics", existingMicIndex.toString()), {
        user: null,
        status: 'open',
        receivedCoins: 0
      });
    }

    const micData = {
      user: {
        uid: user.uid,
        displayName: currentUserData?.displayName || user.displayName,
        photoURL: currentUserData?.photoURL || user.photoURL,
        customId: currentUserData?.customId || user.uid.substring(0, 8),
        currentFrame: currentUserData?.currentFrame || null,
        animatedAvatar: currentUserData?.animatedAvatar || null,
        isVerified: !!currentUserData?.isVerified
      },
      status: 'occupied',
      receivedCoins: 0,
      updatedAt: serverTimestamp()
    };

    try {
      await updateDoc(doc(db, "rooms", currentRoom.id, "mics", index.toString()), micData).catch(async (err) => {
        // If doc doesn't exist (first time), use setDoc (well, updateDoc fails if not exists)
        // In our case, we can use setDoc
        const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        await setDoc(doc(db, "rooms", currentRoom.id, "mics", index.toString()), micData);
      });
      setIsMicMuted(false);
      setShowMicActions(false);
    } catch (err) {
      console.error("Error taking mic:", err);
    }
  };

  const toggleLockMic = async (index: number) => {
    const currentStatus = micStates[index]?.status;
    const newStatus = currentStatus === 'locked' ? 'open' : 'locked';
    
    try {
      const micRef = doc(db, "rooms", currentRoom.id, "mics", index.toString());
      await updateDoc(micRef, {
        status: newStatus,
        user: null,
        receivedCoins: 0
      }).catch(async () => {
        const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        await setDoc(micRef, {
          status: newStatus,
          user: null,
          receivedCoins: 0
        });
      });
      setShowMicActions(false);
    } catch (err) {
      console.error("Error toggling mic lock:", err);
    }
  };

  const leaveMic = async (index: number) => {
    try {
      if (currentRoom?.musicState?.senderUid === user?.uid) {
        await updateDoc(doc(db, "rooms", currentRoom.id), {
          musicState: {
            playing: false,
            title: "",
            src: "",
            senderUid: "",
            seekPosition: 0
          }
        });
      }
      await updateDoc(doc(db, "rooms", currentRoom.id, "mics", index.toString()), {
        user: null,
        status: 'open',
        receivedCoins: 0
      });
      setIsMicMuted(true);
      setShowMicActions(false);
    } catch (err) {
      console.error("Error leaving mic:", err);
    }
  };

  const handleAdminAction = async (action: 'kick_mic' | 'mute_mic' | 'mute_room' | 'kick_room') => {
    if (!profileUserData) return;
    const targetUid = profileUserData.uid;
    if (profileUserData?.email === "admin@yalla.com" && user?.email !== "admin@yalla.com") {
      setShowCannotActionAdmin(true);
      setShowAdminMenu(false);
      return;
    }
    if (targetUid === currentRoom.owner?.uid && !isRoomOwner) {
      alert(t("لا يمكن للمشرفين اتخاذ إجراءات ضد مالك الغرفة", "Moderators cannot take actions against the room owner"));
      return;
    }
    const userMicIndex = micStates.findIndex(m => m?.user?.uid === targetUid);

    try {
      if (action === 'kick_mic') {
        if (userMicIndex !== -1) {
          if (currentRoom?.musicState?.senderUid === targetUid) {
            await updateDoc(doc(db, "rooms", currentRoom.id), {
              musicState: {
                playing: false,
                title: "",
                src: "",
                senderUid: "",
                seekPosition: 0
              }
            });
          }
          await updateDoc(doc(db, "rooms", currentRoom.id, "mics", userMicIndex.toString()), {
            user: null,
            status: 'open',
            receivedCoins: 0
          });
          alert(t("تم طرد العضو من المايك بنجاح", "Member kicked from mic successfully"));
        } else {
          alert(t("العضو ليس متواجداً على أي مايك حالياً", "Member is not currently on any mic"));
        }
      } else if (action === 'mute_mic') {
        if (userMicIndex !== -1) {
          const currentMicMute = micStates[userMicIndex]?.isMuted || false;
          await updateDoc(doc(db, "rooms", currentRoom.id, "mics", userMicIndex.toString()), {
            isMuted: !currentMicMute
          });
          alert(!currentMicMute ? t("تم كتم مايك العضو بنجاح", "Member mic muted successfully") : t("تم إلغاء كتم مايك العضو", "Member mic unmuted successfully"));
        } else {
          alert(t("العضو ليس متواجداً على أي مايك حالياً", "Member is not currently on any mic"));
        }
      } else if (action === 'mute_room') {
        const isMuted = currentRoom.mutedUsers && currentRoom.mutedUsers.includes(targetUid);
        const { arrayUnion, arrayRemove } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        await updateDoc(doc(db, "rooms", currentRoom.id), {
          mutedUsers: isMuted ? arrayRemove(targetUid) : arrayUnion(targetUid)
        });
        alert(!isMuted ? t("تم إصمات العضو من الغرفة بنجاح", "Member silenced in room successfully") : t("تم إلغاء إصمات العضو في الغرفة", "Member unsilenced in room successfully"));
      } else if (action === 'kick_room') {
        const isBanned = currentRoom.bannedUsers && currentRoom.bannedUsers.includes(targetUid);
        const { arrayUnion, arrayRemove } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        await updateDoc(doc(db, "rooms", currentRoom.id), {
          bannedUsers: isBanned ? arrayRemove(targetUid) : arrayUnion(targetUid)
        });
        
        // Also kick them from mic if they are on one!
        if (!isBanned && userMicIndex !== -1) {
          if (currentRoom?.musicState?.senderUid === targetUid) {
            await updateDoc(doc(db, "rooms", currentRoom.id), {
              musicState: {
                playing: false,
                title: "",
                src: "",
                senderUid: "",
                seekPosition: 0
              }
            });
          }
          await updateDoc(doc(db, "rooms", currentRoom.id, "mics", userMicIndex.toString()), {
            user: null,
            status: 'open',
            receivedCoins: 0
          });
        }
        alert(!isBanned ? t("تم طرد العضو من الغرفة بنجاح", "Member kicked from room successfully") : t("تم إلغاء طرد العضو من الغرفة", "Member unbanned from room successfully"));
      }
    } catch (err) {
      console.error("Error performing admin action:", err);
      alert(t("فشلت العملية، يرجى المحاولة لاحقاً", "Operation failed, please try again later"));
    } finally {
      setShowAdminMenu(false);
    }
  };

  const handleFollowUser = async () => {
    if (!user || !profileUserData) return;
    try {
      const targetUid = profileUserData.uid;
      const alreadyFollowing = currentUserData?.following?.includes(targetUid);
      
      const firestore = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      const arrayUnion = firestore.arrayUnion;
      const arrayRemove = firestore.arrayRemove;
      
      const userRef = doc(db, "users", user.uid);
      const targetRef = doc(db, "users", targetUid);
      
      await updateDoc(userRef, {
        following: alreadyFollowing ? arrayRemove(targetUid) : arrayUnion(targetUid)
      });
      
      try {
        await updateDoc(targetRef, {
          followers: alreadyFollowing ? arrayRemove(user.uid) : arrayUnion(user.uid)
        });
      } catch (err) {
        console.warn("Could not write followers component directly (this is expected under security rules, it is computed dynamically):", err);
      }
      
      if (!alreadyFollowing) {
        const reqRef = doc(db, "users", targetUid, "followRequests", user.uid);
        await setDoc(reqRef, {
          uid: user.uid,
          displayName: currentUserData?.displayName || user.displayName || 'User',
          photoURL: currentUserData?.photoURL || user.photoURL || '',
          animatedAvatar: currentUserData?.animatedAvatar || '',
          createdAt: serverTimestamp()
        });
      } else {
        try {
          await deleteDoc(doc(db, "users", targetUid, "followRequests", user.uid));
        } catch (e) {
          console.error(e);
        }
      }
      
      // Update local profileUserData state so change is immediate
      setProfileUserData((prev: any) => {
        if (!prev) return prev;
        const currentFollowers = prev.followers || [];
        return {
          ...prev,
          followers: alreadyFollowing 
            ? currentFollowers.filter((id: string) => id !== user.uid)
            : [...currentFollowers, user.uid]
        };
      });
    } catch (err) {
      console.error("Error following/unfollowing user:", err);
    }
  };

  const allPresentUsers: any[] = [];
  if (currentUserData || user) allPresentUsers.push(currentUserData || { uid: user?.uid, displayName: user?.displayName, photoURL: user?.photoURL, customId: user?.uid.substring(0,8), animatedAvatar: currentUserData?.animatedAvatar || null });
  micStates.forEach(mic => { if (mic?.user && !allPresentUsers.find(p => p.uid === mic.user.uid)) allPresentUsers.push(mic.user); });

  useEffect(() => {
    allPresentUsersRef.current = allPresentUsers;
  }, [allPresentUsers]);

  const usersOnMics: UserOnMic[] = micStates.map(mic => mic?.user).filter((u): u is UserOnMic => u !== null && u !== undefined);
  const displayId = ownerData?.customId || currentRoom.roomIdDisplay || currentRoom.owner?.customId || currentRoom.id.substring(0,6);
  const userIsOnMic = micStates.some(m => m?.user?.uid === user?.uid);
  const isCurrentSender = currentRoom?.musicState?.senderUid === user?.uid;
  const profileCustomId = profileUserData?.customId || profileUserData?.uid?.substring(0, 8) || '';
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
  const profileCustomIdIcon = profileUserData?.customIdIcon;
  const pIdX = profileUserData?.profileIdOffsetX ?? profileUserData?.idOffsetX ?? 28;
  const pIdY = profileUserData?.profileIdOffsetY ?? profileUserData?.idOffsetY ?? 0.5;
  const pIdFS = profileUserData?.profileIdFontSize ?? profileUserData?.idFontSize ?? 11;
  const ownerCustomIdIcon = ownerData?.customIdIcon;
  const idX = ownerData?.idOffsetX ?? 28;
  const idY = ownerData?.idOffsetY ?? 0.5;
  const hasRoomCustomId = ownerData?.roomIdOffsetX !== undefined;
  const roomIdX = ownerData?.roomIdOffsetX ?? 28;
  const roomIdY = ownerData?.roomIdOffsetY ?? 0.5;
  const roomIdFS = ownerData?.roomIdFontSize ?? 11;
  const activeMicCount = currentRoom.micCount || 10;
  const displayedMics = micStates.slice(0, activeMicCount);
  const micSizeClass = activeMicCount === 15 ? 'w-[52.5px] h-[52.5px] sm:w-[59px] sm:h-[59px]' : activeMicCount === 10 ? 'w-[54.6px] h-[54.6px] sm:w-[65px] sm:h-[65px]' : 'w-[60px] h-[60px] sm:w-[70px] sm:h-[70px]';
  const micGapClass = (activeMicCount === 15 || activeMicCount === 10) ? 'gap-y-2 gap-x-1 py-2' : 'gap-y-3.5 gap-x-1 py-3';
  const nameContainerWidth = activeMicCount === 15 ? 'w-[49.5px]' : 'w-[54px]';
  const nameTextSize = activeMicCount === 15 ? 'text-[9px]' : 'text-[9.5px]';
  const roomTitle = currentRoom.title || 'الغرفة';
  const roomBg = currentRoom.roomBackground || currentRoom.coverImage;
  const filteredGifts = dynamicGifts.filter(g => (g as any).tab === giftTab || (! (g as any).tab && giftTab === 'normal'));

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden w-full h-full animate-in fade-in duration-300" dir="rtl">
      
      {/* عرض تأثير الهدية المطور */}
      {activeGiftEffect && (
        <div 
          key={activeGiftEffect.id} 
          onMouseDown={isGiftMinimized ? handleGiftPointerDown : undefined}
          onTouchStart={isGiftMinimized ? handleGiftPointerDown : undefined}
          onClick={toggleGiftMode}
          className={`fixed z-[9998] transition-transform duration-500 ease-out cursor-pointer pointer-events-auto flex items-center justify-center ${isGiftMinimized ? 'w-[120px] h-[200px] rounded-3xl border border-white/20 bg-black/30 shadow-2xl overflow-hidden backdrop-blur-sm animate-in slide-in-from-right touch-none' : 'inset-0 bg-transparent animate-in fade-in'}`}
          style={isGiftMinimized ? { transform: `translate(${giftPos.x}px, ${giftPos.y}px)`, top: 0, left: 0 } : {}}
        >
           <div className={`w-full h-full relative flex items-center justify-center ${isGiftMinimized ? 'after:absolute after:inset-0 after:bg-gradient-to-t after:from-black/20 after:to-transparent pointer-events-none' : ''}`}>
             {isVideoUrl(activeGiftEffect.url) ? (
               <video src={activeGiftEffect.url} autoPlay playsInline onEnded={() => setActiveGiftEffect(null)} className="w-full h-full object-cover bg-transparent" />
             ) : (
               <img 
                 src={activeGiftEffect.url} 
                 className={`transition-all duration-300 ${isGiftMinimized ? 'w-full h-full object-cover' : 'max-w-[60%] max-h-[40%] object-contain'}`} 
                 onLoad={() => {
                    if (!isGiftMinimized) {
                      setTimeout(() => {
                        setActiveGiftEffect(null);
                      }, 5500);
                    }
                 }} 
                 alt="Gift Effect" 
               />
             )}
             {isGiftMinimized && (
               <div className="absolute top-2 right-2"><div className="w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-[10px] text-white backdrop-blur-sm border border-white/10"><i className="fas fa-expand"></i></div></div>
             )}
           </div>
        </div>
      )}

      {showJoinVideo && currentUserData?.currentEntry && (
        <div 
          className={`fixed z-[9999] transition-transform duration-300 ease-out shadow-2xl overflow-hidden cursor-pointer touch-none ${isEntryMinimized ? 'w-[120px] h-[200px] rounded-3xl border border-white/20 bg-black/40' : 'inset-0 bg-black'}`} 
          style={isEntryMinimized ? { transform: `translate(${entryPos.x}px, ${entryPos.y}px)`, top: 0, left: 0 } : {}} 
          onMouseDown={handleEntryPointerDown} 
          onTouchStart={handleEntryPointerDown} 
          onClick={toggleEntryMode}
        >
          <video src={currentUserData.currentEntry} autoPlay playsInline onEnded={() => setShowJoinVideo(false)} className="w-full h-full object-cover pointer-events-none" />
          {isEntryMinimized && (
            <div className="absolute top-2 right-2"><div className="w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-[10px] text-white backdrop-blur-sm border border-white/10"><i className="fas fa-expand"></i></div></div>
          )}
        </div>
      )}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-slate-950">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={roomBg}
            initial={{ scale: 0.96, opacity: 0, filter: "blur(20px)" }}
            animate={{ scale: 1, opacity: 0.8, filter: "blur(0px)" }}
            exit={{ scale: 1.12, opacity: 0, filter: "blur(20px)" }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 w-full h-full"
          >
            {isVideoUrl(roomBg) ? (
              <video 
                src={roomBg} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover" 
              />
            ) : (
              <img 
                src={roomBg} 
                className="w-full h-full object-cover" 
                alt="" 
              />
            )}
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/95 z-[2]"></div>
      </div>
      <div className="relative z-10 flex flex-col h-full w-full max-w-md mx-auto font-['Cairo']">
        <div className="pt-4 px-4 pb-0 flex items-start justify-between overflow-visible">
          <div className="flex flex-col items-start gap-1">
            <div 
              onClick={() => setShowRoomInfoModal(true)}
              className="flex items-center gap-2.5 bg-black/60 border-y border-l border-white/10 rounded-l-full rounded-r-none pr-1.5 pl-6 py-1 shadow-2xl relative -mr-4 min-w-[140px] max-w-[220px] cursor-pointer hover:bg-black/80 select-none"
              style={{ cursor: 'pointer' }}
            >
              <div className="w-11 h-11 rounded-lg overflow-hidden border border-white/10 shadow-lg flex-shrink-0">
                <img src={currentRoom.coverImage} className="w-full h-full object-cover" alt="Room" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <h2 className="font-black text-[12px] text-white leading-tight break-words">{roomTitle}</h2>
                <div className="flex items-center gap-1">
                  {ownerCustomIdIcon ? (
                    <div className="relative w-[70px] h-[22px] flex items-center bg-contain bg-center bg-no-repeat mt-0.5 flex-shrink-0" style={{ backgroundImage: `url(${ownerCustomIdIcon})` }}>
                      <span className="font-black text-white tracking-widest text-center w-full block drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" 
                            style={{ 
                              paddingLeft: hasRoomCustomId ? `${roomIdX}px` : `${(idX * 70) / 90}px`, 
                              paddingTop: hasRoomCustomId ? `${roomIdY}px` : `${(idY * 22) / 28}px`,
                              fontSize: hasRoomCustomId ? `${roomIdFS}px` : `${((ownerData?.idFontSize || 10) * 70) / 90}px`
                            }}>
                        {displayId}
                      </span>
                    </div>
                  ) : <span className={`text-[8px] font-black tracking-tighter ${displayId === 'OFFICIAL' ? 'text-blue-400' : 'text-white/40'}`}>ID: {displayId}</span>}
                  {currentRoom.isLocked && <i className="fas fa-lock text-[7px] text-white/70 ml-0.5 -mt-0.5"></i>}
                </div>
              </div>
            </div>

            {/* Room Trophy Rectangle (مستطيل صغير تحت مستطيل الغرفة) */}
            <div 
              onClick={() => setShowRoomTrophyModal(true)}
              className="flex items-center justify-start gap-1.5 bg-black/60 border border-white/10 rounded-l-full rounded-r-none pr-2.5 pl-3.5 shadow-md relative -mr-4 cursor-pointer hover:bg-black/85 select-none h-[29px] animate-in fade-in duration-300 w-auto inline-flex"
              style={{ direction: 'rtl' }}
              title={t("كأس الغرفة", "Room Trophy")}
            >
              {/* Cup icon on the right (first child in RTL) */}
              <div className="flex items-center text-yellow-500">
                <i className="fas fa-trophy text-[11px]"></i>
              </div>
              
              {/* Coins value on the left (second child in RTL) */}
              <div className="flex items-center text-yellow-400 pr-0.5">
                <span className="text-[11px] font-black leading-none">
                  {formatTrophyAmount(roomTrophyTotalAllTime)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => setShowParticipants(true)} className="h-8 px-3 rounded-full bg-black/60 border border-white/10 flex items-center gap-1.5 transition-all shadow-lg">
              <i className="fas fa-users text-white text-[10px]"></i>
              <span className="text-[10px] font-black text-white">{allPresentUsers.length}</span>
            </button>
            <button onClick={() => setShowExitDialog(true)} className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white transition-all shadow-lg">
              <i className="fas fa-ellipsis-h text-xs"></i>
            </button>
          </div>
        </div>
        <div className={`grid grid-cols-5 px-2 transition-all duration-500 ${micGapClass}`}>
          {displayedMics.map((mic, i) => {
            const displayName = mic?.user ? mic.user.displayName : (i + 1).toString();
            const isLongName = displayName.length > 9;
            const coins = mic?.receivedCoins || 0;
            
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <button onClick={() => handleMicClick(i)} className={`${micSizeClass} flex items-center justify-center relative transition-all duration-300 active:scale-90`}>
                  {mic?.user ? (
                    <div 
                      data-mic-user-uid={mic.user.uid}
                      className="w-full h-full relative flex items-center justify-center animate-in zoom-in duration-200"
                    >
                      <div className="w-full h-full rounded-full overflow-hidden border border-white/10 bg-black/20 relative z-10 shadow-lg">
                        {mic.user.animatedAvatar ? (
                          isVideoUrl(mic.user.animatedAvatar) ? (
                            <video src={mic.user.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                          ) : (
                            <img src={mic.user.animatedAvatar} className="w-full h-full object-cover" alt={mic.user.displayName} />
                          )
                        ) : (
                          <img src={mic.user.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full object-cover" alt={mic.user.displayName} />
                        )}
                      </div>
                      {mic.user.currentFrame && <img src={mic.user.currentFrame} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 scale-125" alt="frame" />}

                      {/* تأثير امتصاص الهدية داخل صورة المستخدم على المايك */}
                      {pulsingMicUid === mic.user.uid && (
                        <>
                          <div className="absolute -inset-2.5 rounded-full border-2 border-yellow-300 animate-ping pointer-events-none z-30" style={{ animationDuration: '0.6s' }}></div>
                          <div className="absolute inset-0 rounded-full bg-yellow-400/40 animate-pulse pointer-events-none z-30"></div>
                        </>
                      )}

                      {/* Speaking indicator waves */}
                      {(activeSpeakers[mic.user.uid] || (currentRoom?.musicState?.playing && currentRoom?.musicState?.senderUid === mic.user.uid)) && (
                        <div className="absolute inset-0 pointer-events-none z-0">
                          {/* Inner pulsing glow backdrop */}
                          <div className="absolute inset-0 rounded-full bg-purple-500/10 animate-pulse pointer-events-none"></div>
                          {/* Concentric glowing voice waves expanding outwards */}
                          <div className="absolute -inset-1 rounded-full border border-purple-400/80 animate-ping opacity-75 pointer-events-none" style={{ animationDuration: '1.2s' }}></div>
                          <div className="absolute -inset-2.5 rounded-full border border-pink-500/60 animate-ping opacity-50 pointer-events-none" style={{ animationDuration: '1.8s', animationDelay: '0.2s' }}></div>
                          <div className="absolute -inset-4 rounded-full border border-teal-400/40 animate-ping opacity-30 pointer-events-none" style={{ animationDuration: '2.4s', animationDelay: '0.4s' }}></div>
                        </div>
                      )}
                      
                      {/* Local mic permission active fallback when silent - no background or pulse rings, completely transparent/clean */}
                      {mic.activeEmoji && <div className="absolute inset-[-10%] z-50 flex items-center justify-center pointer-events-none animate-in zoom-in duration-300"><img src={mic.activeEmoji} className="w-full h-full object-contain" alt="reaction" /></div>}
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center animate-in fade-in duration-200">
                      {mic?.status === 'locked' ? (
                        designSettings?.micLockedIcon ? (
                          <img src={designSettings?.micLockedIcon} className="w-full h-full object-contain" alt="locked" />
                        ) : (
                          <i className={`fas fa-lock text-white/20 ${activeMicCount === 15 ? 'text-sm' : 'text-xl'}`}></i>
                        )
                      ) : (
                        designSettings?.micOpenIcon ? (
                          <img src={designSettings?.micOpenIcon} className="w-full h-full object-contain" alt="open" />
                        ) : (
                          <i className={`fas fa-microphone text-white/20 ${activeMicCount === 15 ? 'text-lg' : 'text-2xl'}`}></i>
                        )
                      )}
                    </div>
                  )}
                </button>
                
                <div className="flex flex-col items-center gap-0.5">
                  <div className={`${nameContainerWidth} h-4 px-1.5 py-0.5 rounded-full backdrop-blur-sm border shadow-sm flex justify-center items-center overflow-hidden relative ${mic?.user ? 'bg-black/40 border-white/10' : 'bg-black/20 border-white/5'}`}>
                    {isLongName ? (
                      <div className="flex animate-marquee-infinite items-center">
                        <span className={`font-black text-white/90 whitespace-nowrap px-4 ${nameTextSize} flex items-center gap-0.5`}>
                          {displayName}
                          {mic?.user?.isVerified && (
                            <svg className="w-2.5 h-2.5 text-blue-500 fill-current inline-block flex-shrink-0" viewBox="0 0 24 24">
                              <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                            </svg>
                          )}
                        </span>
                        <span className={`font-black text-white/90 whitespace-nowrap px-4 ${nameTextSize} flex items-center gap-0.5`}>
                          {displayName}
                          {mic?.user?.isVerified && (
                            <svg className="w-2.5 h-2.5 text-blue-500 fill-current inline-block flex-shrink-0" viewBox="0 0 24 24">
                              <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                            </svg>
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className={`font-black text-white/90 text-center ${nameTextSize} flex items-center justify-center gap-0.5`}>
                        {displayName}
                        {mic?.user?.isVerified && (
                          <svg className="w-2.5 h-2.5 text-blue-500 fill-current inline-block flex-shrink-0" viewBox="0 0 24 24">
                            <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                  
                  {mic?.user && (
                    <div className={`min-w-[28px] w-fit h-3.5 bg-black/40 backdrop-blur-md rounded-full border border-yellow-500/20 flex items-center justify-center gap-1 px-2 shadow-inner animate-in slide-in-from-top-1 duration-300`}>
                      <i className="fas fa-gift text-[6px] text-yellow-500"></i>
                      <span className="text-[7.5px] font-black text-yellow-400 tracking-tighter whitespace-nowrap">
                        {coins >= 1000000000 ? `${(coins/1000000000).toFixed(1)}B` : coins >= 1000000 ? `${(coins/1000000).toFixed(1)}M` : coins.toLocaleString('en-US')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>



        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide relative">
          <div className="flex flex-col gap-2 w-full animate-in fade-in duration-500">
            <div className="bg-black/40 rounded-lg p-2 px-3 relative overflow-hidden flex items-center justify-start min-h-[32px] max-w-[85%]"><p className="text-[9px] font-black text-white/80 leading-tight tracking-wide text-start">{t("مرحبا بك في يلا بارتي برجاء الالتزام بقواعد التطبيق والدردشه بشكل لائق يليق بالمجتمع في حال المخالفه سيتم حظر الحساب", "Welcome to Yalla Party! Please adhere to the application rules and chat in an appropriate manner. In case of violation, your account will be banned.")}</p></div>
            {currentRoom.description && <div className="bg-black/50 rounded-lg p-2.5 px-4 relative overflow-hidden flex flex-col items-start justify-center min-h-[32px] w-fit max-w-[85%]"><span className="text-[7px] font-black text-white/40 mb-1 uppercase tracking-tighter">{t("إشعار الغرفة", "Room Announcement")}</span><p className="text-[10px] font-black text-yellow-400 leading-normal tracking-wide text-start whitespace-pre-wrap break-words w-full">{currentRoom.description}</p></div>}
          </div>
          {messages.map(msg => {
            const isMe = msg.userId === user?.uid || msg.userId === 'me' || (currentUserData?.displayName && msg.userName === currentUserData.displayName) || (user?.displayName && msg.userName === user.displayName);

            return (
              <div key={msg.id} className="flex flex-col items-start gap-1 animate-in slide-in-from-right duration-300">
                <span className="font-black text-[10px] text-purple-300/80 mr-2 flex items-center gap-1">
                  {isMe ? t('أنا', 'Me') : msg.userName}
                  {((isMe && currentUserData?.isVerified) || msg.isVerified) && (
                    <svg className="w-3 h-3 text-blue-500 fill-current inline-block flex-shrink-0" viewBox="0 0 24 24" title="حساب موثق">
                      <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                    </svg>
                  )}
                </span>
                <div className={`bg-black/20 backdrop-blur-sm px-3 py-2 rounded-xl max-w-[85%] shadow-sm overflow-hidden ${msg.type === 'gift' ? 'border border-yellow-500/30 bg-yellow-500/5' : ''}`}>
                  {msg.image ? (
                    <img src={msg.image} className="max-w-full max-h-32 object-contain rounded-lg" alt="emoji" />
                  ) : (
                    <span 
                      dir="rtl" 
                      className={`text-[12px] leading-tight text-right block w-full select-text ${msg.type === 'gift' ? 'text-yellow-400 font-black' : 'text-white/95'}`}
                    >
                      {renderMessageText(msg.text)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {joinNotifications.map(notification => (
            <div key={notification.id} className="flex flex-col items-start animate-in fade-in slide-in-from-bottom duration-500">
              <div className="bg-purple-600/30 backdrop-blur-md border border-purple-500/20 px-4 py-1.5 rounded-full shadow-lg">
                <p className="text-[10px] font-black text-white">
                  {t("مرحباً بـ ", "Welcome ")}
                  <span className="text-yellow-400">{notification.name}</span>
                  {t(" لقد دخل الغرفة", " has entered the room")}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="px-3 pb-6 flex items-center gap-2 mt-auto relative">
          {userIsOnMic && (
            <button 
              onClick={() => {
                const isMutedInRoom = currentRoom.mutedUsers && user?.uid && currentRoom.mutedUsers.includes(user.uid);
                const myMicIndex = micStates.findIndex(m => m?.user?.uid === user?.uid);
                const isMicSlotMuted = myMicIndex !== -1 && micStates[myMicIndex]?.isMuted;
                if (isMutedInRoom || isMicSlotMuted) {
                  alert(t("تم كتم المايكروفون الخاص بك من قبل الإدارة", "Your microphone has been muted by the admin."));
                  return;
                }
                setIsMicMuted(!isMicMuted);
              }} 
              className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all bg-white/10 text-white shadow-lg active:scale-90 overflow-hidden flex-shrink-0"
            >
              <i className={`fas ${!isMicMuted ? 'fa-microphone' : 'fa-microphone-slash'} text-sm ${isMicMuted ? 'text-white/30' : 'text-purple-400'}`}></i>
            </button>
          )}
          <div className="flex-1 h-10 flex items-center gap-2">
            <div className="flex-1 h-full relative">
              <form onSubmit={handleSendMessage} className="h-full flex items-center">
                <div className="flex-1 h-full relative">
                  <input ref={chatInputRef} value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={t("تفاعل مع الجميع...", "Interact with everyone...")} className="w-full h-full bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-11 pr-11 pl-11 text-[11px] text-white outline-none placeholder:text-white/30 shadow-lg" />
                  <button type="submit" className={`absolute left-1 top-1 bottom-1 aspect-square rounded-full flex items-center justify-center transition-all duration-500 border border-white/5 ${inputText !== '' ? 'bg-purple-500/30 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-white/5 text-white/10 opacity-40 pointer-events-none'}`}><i className="fas fa-paper-plane text-[10px]"></i></button>
                  <button type="button" onClick={() => setShowEmojiMenu(true)} className="absolute right-1 top-1 bottom-1 aspect-square rounded-full flex items-center justify-center transition-all duration-300 border border-white/5 active:scale-90 bg-white/5 text-white/40"><i className="fas fa-smile text-[12px]"></i></button>
                </div>
              </form>
            </div>
          </div>
          <button onClick={() => {
            if (selectedUserIds.size === 0) {
              const defaultRecipient = usersOnMics.find(u => u.uid && u.uid !== user?.uid)?.uid 
                || usersOnMics[0]?.uid 
                || currentRoom.hostId 
                || currentRoom.userId 
                || currentRoom.ownerId 
                || user?.uid;
              if (defaultRecipient) setSelectedUserIds(new Set([defaultRecipient]));
            }
            if (!selectedGiftId && filteredGifts.length > 0) {
              setSelectedGiftId(filteredGifts[0].id);
            }
            setShowGifts(true);
          }} className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-xl active:scale-90 transition-transform flex-shrink-0 overflow-hidden relative group">
            {/* Custom Icon - covers the background color completely when loaded */}
            {designSettings?.giftButtonIcon && (
              <img 
                src={designSettings.giftButtonIcon} 
                className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-500 z-10" 
                alt="Gift" 
              />
            )}
          </button>
          <div className="relative flex-shrink-0">
            {/* Standalone Games Button */}
            <button 
              onClick={() => setShowGamesMenu(true)} 
              className="absolute bottom-[46px] left-1/2 -translate-x-1/2 w-12 h-12 flex items-center justify-center transition-transform active:scale-90 hover:scale-105 bg-transparent border-0 outline-none p-0 shadow-none appearance-none"
              title={t("الألعاب", "Games")}
            >
              {designSettings === null ? (
                // Invisible placeholder during loading to prevent flash of default icon
                <div className="w-11 h-11 bg-transparent" />
              ) : designSettings?.gamesButtonIcon ? (
                <img 
                  src={designSettings.gamesButtonIcon} 
                  className="w-full h-full object-contain bg-transparent border-0 outline-none" 
                  alt="Games" 
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 shadow-lg">
                  <i className="fas fa-gamepad text-lg"></i>
                </div>
              )}
            </button>
            <button onClick={() => setShowExtraMenu(true)} className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center transition-transform relative group flex-shrink-0"><div className="grid grid-cols-2 gap-[3px] p-2"><div className="w-[6px] h-[6px] rounded-[1px] bg-white opacity-80 group-hover:opacity-100 transition-opacity"></div><div className="w-[6px] h-[6px] rounded-[1px] bg-white opacity-80 group-hover:opacity-100 transition-opacity"></div><div className="w-[6px] h-[6px] rounded-[1px] bg-white opacity-80 group-hover:opacity-100 transition-opacity"></div><div className="w-[6px] h-[6px] rounded-[1px] bg-white opacity-80 group-hover:opacity-100 transition-opacity"></div></div></button>
          </div>
        </div>
      </div>
      
      {showEmojiMenu && (
        <><div className="fixed inset-0 z-[700] bg-black/10 animate-in fade-in" onClick={() => setShowEmojiMenu(false)}></div><div className="fixed bottom-0 left-0 right-0 max-md bg-black/70 border-t border-white/10 animate-slide-up h-[350px] flex flex-col overflow-hidden rounded-t-[1.5rem] shadow-2xl mx-auto z-[710]"><div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 flex-shrink-0"></div><div className="flex-1 overflow-y-auto p-4 scrollbar-hide"><div className="space-y-6">{dynamicEmojis.length > 0 ? (<div><div className="grid grid-cols-4 gap-3">{dynamicEmojis.map((emoji) => (<button key={emoji.id} onClick={() => sendGifEmoji(emoji.imageUrl)} className="aspect-square flex items-center justify-center bg-white/5 rounded-xl transition-all active:scale-90 overflow-hidden border border-white/5"><img src={emoji.imageUrl} className="w-full h-full object-contain" alt="GIF" /></button>))}</div></div>) : (<div className="flex flex-col items-center justify-center py-20 opacity-20"><i className="fas fa-smile text-4xl mb-2"></i><p className="text-[10px] font-black uppercase">{t("لا توجد إيموجيات حالياً", "No emojis currently available")}</p></div>)}</div></div></div></>
      )}

      {showExtraMenu && (
        <><div className="fixed inset-0 z-[105] bg-black/10 animate-in fade-in" onClick={() => setShowExtraMenu(false)}></div><div className="fixed bottom-0 left-0 right-0 max-md mx-auto z-[110] bg-black/60 backdrop-blur-2px border-t border-white/10 animate-slide-up h-[250px] flex flex-col overflow-hidden rounded-t-[1.5rem] shadow-2xl"><div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 flex-shrink-0"></div><div className="p-6 pt-2 grid grid-cols-4 gap-y-3 gap-x-4 flex-1 overflow-y-auto scrollbar-hide mt-2">
          {canManageRoom && (
            <button onClick={() => { setShowRoomSettings(true); setShowExtraMenu(false); }} className="flex flex-col items-center gap-2"><div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80"><i className="fas fa-cog text-xl"></i></div><span className="text-[10px] font-black text-white/60">{t("الإعدادات", "Settings")}</span></button>
          )}
          <button onClick={() => { setShowMusicModal(true); setShowExtraMenu(false); }} className="flex flex-col items-center gap-2"><div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80"><i className="fas fa-music text-xl"></i></div><span className="text-[10px] font-black text-white/60">{t("الموسيقى", "Music")}</span></button><button onClick={() => setIsEffectsEnabled(!isEffectsEnabled)} className="flex flex-col items-center gap-2"><div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all relative ${isEffectsEnabled ? 'text-white/80' : 'text-white/20'}`}><i className="fas fa-wand-magic-sparkles text-xl"></i>{!isEffectsEnabled && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-8 h-0.5 bg-white/40 rotate-45 rounded-full"></div></div>}</div><span className={`text-[10px] font-black ${isEffectsEnabled ? 'text-white/60' : 'text-white/20'}`}>{t("المؤثرات", "Effects")}</span></button><button onClick={() => setIsRoomMuted(!isRoomMuted)} className="flex flex-col items-center gap-2"><div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80"><i className={`fas ${isRoomMuted ? 'fa-volume-xmark' : 'fa-volume-high'} text-xl`}></i></div><span className="text-[10px] font-black text-white/60">{isRoomMuted ? t("إلغاء الكتم", "Unmute") : t("كتم الغرفة", "Mute Room")}</span></button><button className="flex flex-col items-center gap-2"><div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80"><i className="fas fa-share-alt text-xl"></i></div><span className="text-[10px] font-black text-white/60">{t("مشاركة", "Share")}</span></button><button onClick={() => { setShowReportModal(true); setShowExtraMenu(false); }} className="flex flex-col items-center gap-2"><div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80"><i className="fas fa-info-circle text-xl"></i></div><span className="text-[10px] font-black text-white/60">{t("إبلاغ", "Report")}</span></button>

{canManageRoom && (
  <button onClick={() => { setShowLockModal(true); setShowExtraMenu(false); }} className="flex flex-col items-center gap-2">
    <div className={`w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${currentRoom.isLocked ? 'text-white' : 'text-white/80'}`}>
      <i className={`fas ${currentRoom.isLocked ? 'fa-lock' : 'fa-lock-open'} text-xl`}></i>
    </div>
    <span className="text-[10px] font-black text-white/60">{t("قفل الغرفة", "Lock Room")}</span>
  </button>
)}
</div></div></>
      )}

      {showGamesMenu && (
        <>
          <div className="fixed inset-0 z-[120] bg-black/10 animate-in fade-in" onClick={() => setShowGamesMenu(false)}></div>
          <div className="fixed bottom-0 left-0 right-0 max-md mx-auto z-[130] bg-black/60 border-t border-white/10 animate-slide-up h-[250px] flex flex-col overflow-hidden rounded-t-[1.5rem] shadow-2xl">
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 flex-shrink-0"></div>
            <div className="p-6 pt-2 overflow-y-auto scrollbar-hide">
              <h3 className="text-white font-black text-xs mb-3 text-center tracking-tighter">{t("قائمة الألعاب", "Games Menu")}</h3>
              <div className="grid grid-cols-4 gap-y-3 gap-x-4">
                <button 
                  onClick={() => { setActiveGame('fruits'); setShowGamesMenu(false); }}
                  className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
                >
                  <div className={`w-14 h-14 rounded-2xl shadow-lg overflow-hidden ${!fruitsSettings?.gameIcon ? 'bg-gradient-to-br from-orange-400 to-rose-500 p-[1px]' : ''}`}>
                    {fruitsSettings?.gameIcon ? (
                      <img src={fruitsSettings.gameIcon} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full rounded-2xl bg-black/40 flex items-center justify-center border border-white/10">
                        <span className="text-2xl group-hover:scale-110 transition-transform">🍓</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-black text-white/70 tracking-tighter text-center">{t("لعبة الفواكه", "Fruits Game")}</span>
                </button>

                <button 
                  onClick={() => { setActiveGame('aviator'); setShowGamesMenu(false); }}
                  className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
                >
                  <div className={`w-14 h-14 rounded-2xl shadow-lg overflow-hidden ${!aviatorSettings?.gameIcon ? 'bg-gradient-to-br from-rose-500 to-purple-600 p-[1px]' : ''}`}>
                    {aviatorSettings?.gameIcon ? (
                      <img src={aviatorSettings.gameIcon} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full rounded-2xl bg-black/40 flex items-center justify-center border border-white/10">
                        <span className="text-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">✈️</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-black text-white/70 tracking-tighter text-center">{t("لعبة الطائرة", "Aviator Game")}</span>
                </button>

                <button 
                  onClick={() => { setActiveGame('lucky77'); setShowGamesMenu(false); }}
                  className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
                >
                  <div className={`w-14 h-14 rounded-2xl shadow-lg overflow-hidden ${!lucky77Settings?.gameIcon ? 'bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 p-[1px]' : ''}`}>
                    {lucky77Settings?.gameIcon ? (
                      <img src={lucky77Settings.gameIcon} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full rounded-2xl bg-black/40 flex items-center justify-center border border-white/10">
                        <span className="text-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">🎰</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-black text-white/70 tracking-tighter text-center">{t("Lucky 77", "Lucky 77")}</span>
                </button>
                
                {/* Placeholder for future games */}
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 opacity-20">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <i className="fas fa-lock text-xs text-white/40"></i>
                    </div>
                    <span className="text-[10px] font-black text-white/40 tracking-tighter">{t("قريباً", "Soon")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeGame === 'fruits' && (
        <FruitsGame 
          onClose={() => setActiveGame(null)} 
          userBalance={currentUserData?.coins || 0}
          onUpdateBalance={handleUpdateBalance}
        />
      )}

      {activeGame === 'aviator' && (
        <AviatorGame 
          onClose={() => setActiveGame(null)} 
          userBalance={currentUserData?.coins || 0}
          onUpdateBalance={handleUpdateBalance}
        />
      )}

      {activeGame === 'lucky77' && (
        <Lucky77Game 
          onClose={() => setActiveGame(null)} 
          userBalance={currentUserData?.coins || 0}
          onUpdateBalance={handleUpdateBalance}
        />
      )}

      {showRoomSettings && (
        <div className="fixed inset-0 z-[600] bg-[#1a0b2e] flex flex-col animate-in slide-in-from-bottom duration-300" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <header className="p-4 flex items-center justify-between border-b border-white/5 bg-[#0d051a]">
            <button onClick={() => setShowRoomSettings(false)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white active:scale-90 transition-all">
              <i className="fas fa-times"></i>
            </button>
            <h2 className="text-sm font-black text-white">{t("إعدادات الغرفة", "Room Settings")}</h2>
            <button onClick={handleUpdateRoomSettings} disabled={isUpdatingRoom} className="px-4 py-2 rounded-xl bg-purple-600/10 text-purple-400 text-sm font-black active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50">
              {isUpdatingRoom && <i className="fas fa-circle-notch animate-spin text-[10px]"></i>}
              <span>{t("حفظ", "Save")}</span>
            </button>
          </header>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            {!showBgSelector && !showBlacklist && !showModeratorsList ? (
              <>
                <div className="flex flex-col items-center gap-4">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{t("صورة الغرفة", "Room Cover")}</label>
                  <button onClick={() => coverInputRef.current?.click()} className="relative w-32 h-32 rounded-[2.5rem] bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:bg-white/10">
                    <img src={editRoomCover} className="w-full h-full object-cover" alt="Room Cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <i className="fas fa-camera text-white"></i>
                    </div>
                  </button>
                  <input type="file" ref={coverInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center mx-2">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{t("اسم الغرفة", "Room Name")}</label>
                    <span className="text-[9px] font-bold text-white/40">{editRoomTitle.length}/16</span>
                  </div>
                  <input type="text" value={editRoomTitle} maxLength={16} onChange={(e) => setEditRoomTitle(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white outline-none focus:border-purple-500/40 transition-all shadow-inner text-start" placeholder={t("اسم الغرفة...", "Room Name...")} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center mx-2">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{t("وصف الغرفة", "Room Description")}</label>
                    <span className="text-[9px] font-bold text-white/40">{editRoomDescription.length}/250</span>
                  </div>
                  <textarea value={editRoomDescription} maxLength={250} onChange={(e) => setEditRoomDescription(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm text-white outline-none h-32 focus:border-purple-500/40 transition-all shadow-inner text-start" placeholder={t("اكتب وصفاً أو ترحيباً خاصاً لزوار غرفتك...", "Write a description or a special greeting for your room visitors...")} />
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mx-2">{t("عدد الميكروفونات", "Number of Microphones")}</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[5, 10, 15].map((count) => (
                      <button key={count} onClick={() => setEditMicCount(count)} className={`py-3 rounded-2xl font-black text-xs transition-all border ${editMicCount === count ? 'bg-purple-600 text-white border-purple-500 shadow-lg scale-95' : 'bg-white/5 text-white/40 border-white/10'}`}>
                        {count} {t("ميك", "Mics")}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {isRoomOwner && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mx-2">{t("مشرفي الغرفة", "Room Moderators")}</label>
                      <button onClick={() => setShowModeratorsList(true)} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[1.5rem] group active:scale-95 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <i className="fas fa-user-shield text-base"></i>
                          </div>
                          <span className="text-sm font-black text-white">{t("مشرفي الغرفة", "Room Moderators")}</span>
                        </div>
                        <i className={`fas ${language === 'en' ? 'fa-chevron-right' : 'fa-chevron-left'} text-purple-400`}></i>
                      </button>
                    </div>
                  )}

                  {isRoomOwner && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mx-2">{t("القائمة السوداء", "Blacklist")}</label>
                      <button onClick={() => setShowBlacklist(true)} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[1.5rem] group active:scale-95 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                            <i className="fas fa-ban text-base"></i>
                          </div>
                          <span className="text-sm font-black text-white">{t("القائمة السوداء", "Blacklist")}</span>
                        </div>
                        <i className={`fas ${language === 'en' ? 'fa-chevron-right' : 'fa-chevron-left'} text-purple-400`}></i>
                      </button>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest mx-2">{t("خلفية الغرفة", "Room Background")}</label>
                    <button onClick={() => setShowBgSelector(true)} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-[1.5rem] group active:scale-95 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-14 rounded-lg overflow-hidden border border-white/20 bg-black/40">
                          {isVideoUrl(editRoomBg) ? <video src={editRoomBg} muted className="w-full h-full object-cover" /> : <img src={editRoomBg || editRoomCover} className="w-full h-full object-cover" />}
                        </div>
                        <span className="text-sm font-black text-white">{t("اختر خلفية للغرفة", "Select Room Background")}</span>
                      </div>
                      <i className={`fas ${language === 'en' ? 'fa-chevron-right' : 'fa-chevron-left'} text-purple-400`}></i>
                    </button>
                  </div>


                </div>
              </>
            ) : showBgSelector ? (
              <div className="space-y-6 animate-in slide-in-from-left">
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowBgSelector(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white">
                    <i className={`fas ${language === 'en' ? 'fa-arrow-left' : 'fa-arrow-right'} text-xs`}></i>
                  </button>
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{t("اختر الخلفية المفضلة", "Select Preferred Background")}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {availableBgs.map((bg) => (
                    <div key={bg.id} onClick={async () => {
                      setEditRoomBg(bg.imageUrl);
                      setShowBgSelector(false);
                      try {
                        await updateDoc(doc(db, "rooms", currentRoom.id), { roomBackground: bg.imageUrl });
                      } catch (err) {
                        console.error("Error setting background instantly:", err);
                      }
                    }} className={`relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${editRoomBg === bg.imageUrl ? 'border-purple-500 scale-95 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-transparent opacity-60'}`}>
                      {isVideoUrl(bg.imageUrl) ? <video src={bg.imageUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" /> : <img src={bg.imageUrl} className="w-full h-full object-cover" alt="Background" />}
                      {bg.remainingDays !== undefined && (
                        <div className="absolute top-2 right-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[8px] font-black px-2 py-0.5 rounded-lg shadow-xl z-20 flex items-center gap-0.5">
                          <span className="text-purple-300">{bg.remainingDays}</span>
                          <span className="opacity-80">{t("يوم", "Days")}</span>
                        </div>
                      )}
                      {editRoomBg === bg.imageUrl && (
                        <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                          <i className="fas fa-check-circle text-white text-xl"></i>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            ) : showBlacklist ? (
              <div className="space-y-6 animate-in slide-in-from-left" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowBlacklist(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white active:scale-90 transition-all">
                    <i className={`fas ${language === 'en' ? 'fa-arrow-left' : 'fa-arrow-right'} text-xs`}></i>
                  </button>
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{t("القائمة السوداء للغرفة", "Room Blacklist")}</span>
                </div>

                {isLoadingBlacklist ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <i className="fas fa-circle-notch animate-spin text-purple-400 text-xl"></i>
                    <span className="text-xs text-white/40 font-bold">{t("جاري تحميل الأعضاء...", "Loading members...")}</span>
                  </div>
                ) : blacklistUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-center bg-white/5 border border-white/5 rounded-[2rem] p-6">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-1">
                      <i className="fas fa-user-plus text-xl"></i>
                    </div>
                    <h3 className="text-white font-black text-sm">{t("القائمة فارغة", "List is Empty")}</h3>
                    <p className="text-white/40 text-[10px] leading-relaxed font-bold max-w-[200px]">
                      {t("لا يوجد مستخدمون مطرودون من هذه الغرفة حالياً.", "There are no kicked users from this room currently.")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blacklistUsers.map((bUser) => (
                      <div key={bUser.uid} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl animate-in fade-in">
                        <div className="flex items-center gap-3 text-start">
                          <img 
                            src={bUser.avatar || bUser.photoURL || defaultImages?.profileImage || ""} 
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                            alt={bUser.displayName}
                          />
                          <div>
                            <div className="text-xs font-black text-white">{bUser.displayName || t("مستخدم", "User")}</div>
                            {bUser.customId && (
                              <div className="text-[9px] font-bold text-white/45">ID: {bUser.customId}</div>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnbanUser(bUser.uid)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-black tracking-wide active:scale-95 transition-all"
                        >
                          {t("إلغاء الطرد", "Unban")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-left" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowModeratorsList(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white active:scale-90 transition-all">
                    <i className={`fas ${language === 'en' ? 'fa-arrow-left' : 'fa-arrow-right'} text-xs`}></i>
                  </button>
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">{t("مشرفي الغرفة", "Room Moderators")}</span>
                </div>

                {/* Search field */}
                <div className="space-y-2 bg-[#251040]/30 border border-purple-500/10 p-4 rounded-3xl">
                  <label className="text-[9px] font-black text-purple-400 uppercase tracking-widest pl-2">{t("إضافة مشرف جديد عبر الرمز ID", "Add New Moderator via User ID")}</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={modSearchQuery} 
                      onChange={(e) => setModSearchQuery(e.target.value)} 
                      placeholder={t("اكتب ID الخاص بالمستخدم...", "Type User ID...")} 
                      className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-purple-500/40 transition-all text-start"
                    />
                    <button 
                      onClick={handleSearchUserForMod} 
                      disabled={isSearchingUser}
                      className="px-5 py-3 rounded-2xl bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 font-black text-xs active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSearchingUser ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-search"></i>}
                      <span>{t("بحث", "Search")}</span>
                    </button>
                  </div>

                  {searchedUserForMod && (
                    <div className="p-4 bg-white/5 border border-purple-500/10 rounded-2xl animate-in zoom-in duration-200 mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-start">
                        <img 
                          src={searchedUserForMod.avatar || searchedUserForMod.photoURL || defaultImages?.profileImage || ""} 
                          className="w-10 h-10 rounded-full object-cover border border-white/10"
                          alt={searchedUserForMod.displayName}
                        />
                        <div>
                          <div className="text-xs font-black text-white">{searchedUserForMod.displayName || t("مستخدم", "User")}</div>
                          {searchedUserForMod.customId && <div className="text-[9px] font-bold text-white/45">ID: {searchedUserForMod.customId}</div>}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAddModerator(searchedUserForMod.uid)}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black active:scale-95 transition-all"
                      >
                        {t("إضافة مشرف", "Add Admin")}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mx-2">{t("المشرفون الحاليون", "Current Moderators")}</span>
                  {isLoadingModerators ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <i className="fas fa-circle-notch animate-spin text-purple-400 text-xl"></i>
                      <span className="text-xs text-white/40 font-bold">{t("جاري تحميل الأعضاء...", "Loading members...")}</span>
                    </div>
                  ) : moderatorUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center bg-white/5 border border-white/5 rounded-[2rem] p-6">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-1">
                        <i className="fas fa-user-shield text-xl"></i>
                      </div>
                      <h3 className="text-white font-black text-sm">{t("لا يوجد مشرفين", "No Moderators")}</h3>
                      <p className="text-white/40 text-[10px] leading-relaxed font-bold max-w-[200px]">
                        {t("لم يتم تعيين أي مشرفين لهذه الغرفة حتى الآن.", "No moderators have been assigned to this room yet.")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {moderatorUsers.map((mUser) => (
                        <div key={mUser.uid} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl animate-in fade-in">
                          <div className="flex items-center gap-3 text-start">
                            <img 
                              src={mUser.avatar || mUser.photoURL || defaultImages?.profileImage || ""} 
                              className="w-10 h-10 rounded-full object-cover border border-white/10"
                              alt={mUser.displayName}
                            />
                            <div>
                              <div className="text-xs font-black text-white">{mUser.displayName || t("مستخدم", "User")}</div>
                              {mUser.customId && (
                                <div className="text-[9px] font-bold text-white/45">ID: {mUser.customId}</div>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleRemoveModerator(mUser.uid)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-black tracking-wide active:scale-95 transition-all"
                          >
                            {t("إلغاء الإشراف", "Remove Admin")}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/40 p-6 animate-in fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-[320px] bg-[#2d0f4d]/85 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <header className="p-5 flex justify-between items-center">
              <h3 className="text-white font-black text-sm">{t("الابلاغ عن الغرفة", "Report Room")}</h3>
              <button onClick={() => setShowReportModal(false)} className="text-white/40 hover:text-white transition-colors">
                <i className="fas fa-times text-xs"></i>
              </button>
            </header>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest pl-2">{t("سبب البلاغ", "Report Reason")}</label>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {['اباحي', 'اسائة', 'شتائم', 'ترويج'].map(reason => {
                    const translationMap: Record<string, string> = {
                      'اباحي': t('اباحي', 'Pornographic'),
                      'اسائة': t('اسائة', 'Abuse'),
                      'شتائم': t('شتائم', 'Slander'),
                      'ترويج': t('ترويج', 'Promotion')
                    };
                    return (
                      <button 
                        key={reason}
                        onClick={() => setReportReason(reason)}
                        className={`py-2.5 rounded-xl text-[10px] font-black border transition-all backdrop-blur-md ${reportReason === reason ? 'bg-purple-600/40 border-purple-500/50 text-white shadow-lg' : 'bg-white/5 border-white/5 text-white/40'}`}
                      >
                        {translationMap[reason] || reason}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest pl-2">{t("يرجى شرح ما حدث بالتفاصيل", "Please explain in detail what happened")}</label>
                <div className="relative">
                  <textarea 
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value.substring(0, 250))}
                    placeholder={t("اكتب هنا...", "Write here...")}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none h-32 focus:border-purple-500/40 transition-all resize-none shadow-inner text-start"
                  />
                  <div className="absolute bottom-3 left-3 text-[8px] font-black text-white/20">
                    {reportDetails.length}/250
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSendReport}
                disabled={isSubmittingReport || !reportDetails.trim()}
                className="w-full bg-purple-600/30 backdrop-blur-md border border-purple-500/30 py-4 rounded-2xl font-black text-[11px] text-white shadow-xl active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
              >
                {isSubmittingReport ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-paper-plane"></i>}
                <span>{t("تقديم البلاغ", "Submit Report")}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportSuccess && (
        <div className="fixed inset-0 z-[805] flex items-center justify-center bg-black/40 p-6 animate-in fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-[320px] bg-[#2d0f4d]/85 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-8 flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <i className="fas fa-check text-2xl text-purple-400"></i>
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-black text-lg">{t("تم تقديم البلاغ", "Report Submitted")}</h3>
                <p className="text-white/60 text-xs leading-relaxed font-bold">
                  {t("سيتم المراجعه شكرا لك على الحفاظ على بيئة Yalla Party", "It will be reviewed. Thank you for keeping Yalla Party a safe community!")}
                </p>
              </div>
              <button 
                onClick={() => setShowReportSuccess(false)}
                className="w-full bg-purple-600/30 backdrop-blur-md border border-purple-500/30 py-4 rounded-2xl font-black text-[11px] text-white shadow-xl active:scale-95 transition-all"
              >
                {t("حسناً", "Okay")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCannotActionAdmin && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm" onClick={() => setShowCannotActionAdmin(false)}>
          <div 
            className="bg-[#1a0b2e]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 w-full max-w-[300px] text-center shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto mb-4">
              <i className="fas fa-user-shield text-2xl"></i>
            </div>
            <h4 className="text-white font-black text-sm mb-2">{t("ممنوع", "Forbidden")}</h4>
            <p className="text-white/60 text-[11px] leading-relaxed mb-6 font-bold">
              {t("لا يمكنك طرد هذا المستخدم", "You cannot take actions against this user")}
            </p>
            <button 
              onClick={() => setShowCannotActionAdmin(false)}
              className="w-full py-3 bg-purple-600 text-white text-xs font-black rounded-xl active:scale-95"
            >
              {t("فهمت ذلك", "I understand")}
            </button>
          </div>
        </div>
      )}

      {showLockModal && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/40 p-6 animate-in fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-[320px] bg-[#2d0f4d]/85 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <header className="p-5 flex justify-between items-center border-b border-white/5">
              <h3 className="text-white font-black text-sm">{t("إعدادات قفل الغرفة", "Room Lock Settings")}</h3>
              <button onClick={() => setShowLockModal(false)} className="text-white/40 hover:text-white transition-colors">
                <i className="fas fa-times text-xs"></i>
              </button>
            </header>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest pl-2">{t("كلمة مرور الغرفة (6 أرقام)", "Room Password (6 Digits)")}</label>
                <div className="relative">
                  <input 
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={roomPasswordInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length <= 6) setRoomPasswordInput(val);
                    }}
                    placeholder="••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-center text-sm font-black text-white outline-none focus:border-purple-500/40 transition-all shadow-inner tracking-[0.5em]"
                  />
                </div>
                <p className="text-[9px] text-white/40 text-center font-bold italic">{t("اترك الحقل فارغاً إذا كنت تريد فتح الغرفة للجميع", "Leave empty to open the room to everyone")}</p>
              </div>

              <button 
                onClick={handleToggleLockRoom}
                disabled={isUpdatingRoom || (roomPasswordInput.length > 0 && roomPasswordInput.length < 6)}
                className="w-full bg-purple-600/20 border border-purple-500/40 backdrop-blur-md py-4 rounded-2xl font-black text-[11px] text-white shadow-xl active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
              >
                {isUpdatingRoom ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-lock text-[10px]"></i>}
                <span>{roomPasswordInput.trim() ? t('قفل الغرفة الآن', 'Lock Room Now') : t('فتح الغرفة للجميع', 'Open Room to All')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitDialog && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 animate-in fade-in backdrop-blur-sm" onClick={() => setShowExitDialog(false)}>
          <div className="flex flex-col items-center gap-10">
            <div className="flex flex-col items-center gap-3">
              <button onClick={() => { setShowExitDialog(false); onMinimize(); }} className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-90">
                <i className="fas fa-compress-alt text-3xl"></i>
              </button>
              <span className="text-white font-black text-[12px]">{t("احتفاظ", "Keep")}</span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <button onClick={handleUserExit} className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-90">
                <i className="fas fa-sign-out-alt text-3xl"></i>
              </button>
              <span className="text-white font-black text-[12px]">{t("خروج", "Exit")}</span>
            </div>
          </div>
        </div>
      )}

      {showParticipants && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-6 animate-in fade-in" onClick={() => setShowParticipants(false)}>
          <div className="w-full max-w-[300px] bg-[#1a0b2e]/85 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl" dir={language === 'ar' ? 'rtl' : 'ltr'} onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-white font-black text-sm">{t("المتواجدون", "Online")} ({allPresentUsers.length})</h3>
              <button onClick={() => setShowParticipants(false)} className="text-white/40">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
            <div className="max-h-[380px] overflow-y-auto p-3 space-y-2 scrollbar-hide">
              {allPresentUsers.map((u, idx) => (
                <div key={u.uid || idx} className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 border border-white/5">
                  <div className="w-11 h-11 relative flex-shrink-0">
                    {u.animatedAvatar ? (
                      isVideoUrl(u.animatedAvatar) ? (
                        <video src={u.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full rounded-full object-cover border border-white/10" />
                      ) : (
                        <img src={u.animatedAvatar} className="w-full h-full rounded-full object-cover border border-white/10" />
                      )
                    ) : (
                      <img src={u.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full rounded-full object-cover border border-white/10" />
                    )}
                    {u.currentFrame && <img src={u.currentFrame} className="absolute inset-0 w-full h-full object-contain scale-110 z-10" />}
                  </div>
                  <div className="flex-1 min-w-0 text-start">
                    <span className="text-white font-bold text-[11px] truncate flex items-center gap-1">
                      {u.displayName}
                      {u.isVerified && (
                        <svg className="w-3 h-3 text-blue-500 fill-current inline-block flex-shrink-0" viewBox="0 0 24 24" title="حساب موثق">
                          <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                        </svg>
                      )}
                    </span>
                    <span className="text-purple-400 text-[8px] font-black">ID: {u.customId || u.uid?.substring(0,8)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showMicActions && selectedMicIndex !== null && (
        <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/40 animate-in fade-in" onClick={() => setShowMicActions(false)}>
          <div className="w-full max-md bg-black/40 rounded-t-[1.5rem] p-6 pb-10 space-y-4 animate-slide-up border-t border-white/10" dir={language === 'ar' ? 'rtl' : 'ltr'} onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center mb-4">
              <div className="w-12 h-1.5 bg-white/20 rounded-full mb-6"></div>
              <h3 className="text-white font-black text-lg text-center">{t("تحكم المايك", "Mic Control")} {selectedMicIndex + 1}</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {micStates[selectedMicIndex]?.user?.uid === user?.uid ? (
                <>
                  <button onClick={() => leaveMic(selectedMicIndex)} className="w-full py-4 bg-red-500/20 text-red-400 rounded-2xl font-black flex items-center justify-center gap-3 border border-red-500/20 active:scale-95 transition-all">
                    <i className="fas fa-sign-out-alt"></i> {t("مغادرة المايك", "Leave Mic")}
                  </button>
                  <button onClick={() => { setShowMicActions(false); setProfileUserUid(user?.uid || ''); setShowUserData(true); }} className="w-full py-4 bg-blue-600/20 text-blue-400 rounded-2xl font-black flex items-center justify-center gap-3 border border-blue-500/20 active:scale-95 transition-all">
                    <i className="fas fa-id-card"></i> {t("عرض البيانات", "View Profile")}
                  </button>
                </>
              ) : (
                <button onClick={() => takeMic(selectedMicIndex)} className="w-full py-4 bg-purple-600/20 text-purple-400 border border-purple-500/20 rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                  {t("أخذ المايك", "Take Mic")}
                </button>
              )}
              {canManageRoom && micStates[selectedMicIndex]?.user?.uid !== user?.uid && (
                <button onClick={() => toggleLockMic(selectedMicIndex)} className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 border transition-all active:scale-95 ${micStates[selectedMicIndex]?.status === 'locked' ? 'bg-white/10 text-white border-white/20' : 'bg-white/5 text-white/80 border-white/10'}`}>
                  <i className={`fas ${micStates[selectedMicIndex]?.status === 'locked' ? 'fa-lock-open' : 'fa-lock'}`}></i>
                  {micStates[selectedMicIndex]?.status === 'locked' ? t('فتح المايك', 'Unlock Mic') : t('قفل المايك', 'Lock Mic')}
                </button>
              )}
              <button onClick={() => setShowMicActions(false)} className="w-full py-4 bg-white/5 text-white/40 rounded-2xl font-black active:scale-95 transition-all">
                {t("إلغاء", "Cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserData && (
        <><div className="fixed inset-0 z-[350] bg-black/10" onClick={() => { setShowUserData(false); setProfileUserUid(null); setProfileUserData(null); setShowAdminMenu(false); }}></div><div className="fixed bottom-0 left-0 right-0 max-md mx-auto z-[400] bg-black/60 backdrop-blur-2px border-t border-white/10 rounded-t-[1.5rem] animate-slide-up overflow-visible h-[68%] shadow-2xl">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full"></div>
          {profileUserData && (
            <div className="absolute top-4 right-6 z-[420] flex items-center gap-2">
              {/* @ Button */}
              {profileUserData?.uid !== user?.uid && (
                <button 
                  onClick={() => {
                    const nameToMention = profileUserData?.displayName || '';
                    if (nameToMention) {
                      setInputText(prev => prev ? `${prev} @${nameToMention} ` : `@${nameToMention} `);
                    }
                    setShowUserData(false);
                    setProfileUserUid(null);
                    setProfileUserData(null);
                    setShowAdminMenu(false);
                    setTimeout(() => {
                      chatInputRef.current?.focus();
                    }, 100);
                  }}
                  className="bg-purple-600/30 text-purple-200 border border-purple-500/20 hover:bg-purple-600/85 hover:text-white transition-all w-7 h-7 rounded-full flex items-center justify-center font-black text-xs select-none shadow-lg active:scale-90 duration-200 animate-in zoom-in"
                  title={t("منشن", "Mention")}
                >
                  @
                </button>
              )}

              {/* Admin Menu Dropdown Button */}
              {canManageRoom && profileUserData?.uid !== user?.uid && (isRoomOwner || profileUserData?.uid !== currentRoom.owner?.uid) && (
                <div className="relative">
                  <button 
                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                    className="bg-purple-600/30 text-purple-200 border border-purple-500/20 w-7 h-7 rounded-full flex items-center justify-center font-black text-xs select-none shadow-lg animate-in zoom-in"
                    title={t("إدارة العضو", "Manage Member")}
                  >
                    <i className={`fas fa-chevron-down text-[10px] transition-transform duration-200 ${showAdminMenu ? 'rotate-180' : ''}`}></i>
                  </button>
 
                  {/* Dropdown Menu */}
                  {showAdminMenu && (() => {
                    const targetUid = profileUserData.uid;
                    const userMicIndex = micStates.findIndex(m => m?.user?.uid === targetUid);
                    const isTargetMicMuted = userMicIndex !== -1 && micStates[userMicIndex]?.isMuted;
                    const isTargetRoomMuted = currentRoom.mutedUsers && currentRoom.mutedUsers.includes(targetUid);
 
                    return (
                      <div className="absolute top-full right-0 mt-2 w-32 bg-purple-600/60 border border-purple-500/20 rounded-2xl overflow-hidden shadow-2xl z-50 animate-in zoom-in duration-200" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        {/* Kick from Mic */}
                        <button 
                          onClick={() => handleAdminAction('kick_mic')} 
                          className={`w-full py-2.5 px-3 ${language === 'ar' ? 'text-right' : 'text-left'} text-[9px] font-black text-purple-100 hover:bg-purple-600/40 border-b border-purple-500/10 flex items-center gap-1.5 transition-colors`}
                        >
                          <i className="fas fa-arrow-alt-circle-down w-3.5"></i>
                          <span>{t("طرد من المايك", "Kick from Mic")}</span>
                        </button>
                        
                        {/* Mute Mic */}
                        <button 
                          onClick={() => handleAdminAction('mute_mic')} 
                          className={`w-full py-2.5 px-3 ${language === 'ar' ? 'text-right' : 'text-left'} text-[9px] font-black text-purple-100 hover:bg-purple-600/40 border-b border-purple-500/10 flex items-center gap-1.5 transition-colors`}
                        >
                          <i className={`fas ${isTargetMicMuted ? 'fa-microphone' : 'fa-microphone-slash'} w-3.5`}></i>
                          <span>{isTargetMicMuted ? t("إلغاء كتم المايك", "Unmute Mic") : t("كتم المايك", "Mute Mic")}</span>
                        </button>
 
                        {/* Mute Chat/Mouth in room (ONLY allowed for owner) */}
                        {isRoomOwner && (
                          <button 
                            onClick={() => handleAdminAction('mute_room')} 
                            className={`w-full py-2.5 px-3 ${language === 'ar' ? 'text-right' : 'text-left'} text-[9px] font-black text-purple-100 hover:bg-purple-600/40 border-b border-purple-500/10 flex items-center gap-1.5 transition-colors`}
                          >
                            <i className={`fas ${isTargetRoomMuted ? 'fa-comment' : 'fa-comment-slash'} w-3.5`}></i>
                            <span>{isTargetRoomMuted ? t("إلغاء إصمات الغرفة", "Unsilence in Room") : t("إصمات من الغرفة", "Silence in Room")}</span>
                          </button>
                        )}
 
                        {/* Kick from Room */}
                        <button 
                          onClick={() => handleAdminAction('kick_room')} 
                          className={`w-full py-2.5 px-3 ${language === 'ar' ? 'text-right' : 'text-left'} text-[9px] font-black text-purple-100 hover:bg-purple-600/40 flex items-center gap-1.5 transition-colors`}
                        >
                          <i className="fas fa-door-open w-3.5"></i>
                          <span>{t("طرد من الغرفة", "Kick from Room")}</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        {(!profileUserData || profileUserData.uid !== profileUserUid) ? (
          <div className="h-full flex flex-col items-center justify-center p-8 space-y-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/10 animate-ping"></div>
              <div className="absolute inset-2 rounded-full border-t-2 border-r-2 border-purple-500 border-b-2 border-l-2 border-b-transparent border-l-transparent animate-spin"></div>
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-purple-600/30 to-blue-600/30 animate-pulse border border-white/5 flex items-center justify-center">
                <i className="fas fa-user-circle text-purple-400 text-lg"></i>
              </div>
            </div>
            <p className="text-white/40 text-xs font-black tracking-widest text-center animate-pulse">{t("جاري تحميل الملف الشخصي...", "Loading profile...")}</p>
          </div>
        ) : (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {profileUserData?.animatedAvatar ? (
                  isVideoUrl(profileUserData.animatedAvatar) ? (
                    <video src={profileUserData.animatedAvatar} autoPlay loop muted playsInline className="w-24 h-24 rounded-full object-cover bg-transparent" />
                  ) : (
                    <img src={profileUserData.animatedAvatar} className="w-24 h-24 rounded-full object-cover bg-transparent" alt="Profile" />
                  )
                ) : (
                  <img src={profileUserData?.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-24 h-24 rounded-full object-cover" alt="Profile" />
                )}
                {profileUserData?.currentFrame && (<img src={profileUserData.currentFrame} className="absolute inset-0 w-full h-full object-contain z-10 scale-125" alt="frame" />)}
              </div>
            </div>
            <div className="pt-20 px-8 flex flex-col items-center h-full overflow-y-auto overflow-x-hidden scrollbar-hide pb-12">
              <h3 className="text-2xl font-black text-white drop-shadow-lg py-1 mb-2 leading-relaxed relative z-10 flex items-center justify-center gap-1.5">
                {profileUserData?.displayName}
                {profileUserData?.isVerified && (
                  <svg className="w-5 h-5 text-blue-500 fill-current inline-block flex-shrink-0" viewBox="0 0 24 24" title="حساب موثق">
                    <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                  </svg>
                )}
              </h3>
              
              <div className="mb-8 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {profileCustomIdIcon ? (
                      <div className="relative w-[90px] h-[28px] flex items-center bg-contain bg-center bg-no-repeat animate-in zoom-in duration-300" style={{ backgroundImage: `url(${profileCustomIdIcon})` }}>
                        <span className="font-black text-white tracking-widest text-center w-full block drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" 
                              style={{ 
                                paddingLeft: `${pIdX}px`, 
                                paddingTop: `${pIdY}px`,
                                fontSize: `${pIdFS}px`
                              }}>
                          {profileCustomId}
                        </span>
                      </div>
                    ) : (
                      <span className={`text-[11px] font-black w-fit ${profileCustomId === 'OFFICIAL' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-purple-300 bg-white/5 border-white/5'} px-3 py-1 rounded-xl border tracking-wider`}>ID: {profileCustomId}</span>
                    )}

                    {/* Copy ID Button */}
                    <button
                      onClick={() => handleCopyId(profileCustomId)}
                      className="w-7 h-7 flex items-center justify-center bg-white/5 text-purple-300 rounded-xl border border-white/5 cursor-pointer shadow-sm"
                      title={t("نسخ الآي دي", "Copy ID")}
                    >
                      <i className="fas fa-copy text-[11px]"></i>
                    </button>
                  </div>

                  {/* Gender and Region Info */}
                  <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-xl border border-white/5">
                    {profileUserData?.gender === 'male' ? (
                      <i className="fas fa-mars text-blue-400 text-[10px]"></i>
                    ) : profileUserData?.gender === 'female' ? (
                      <i className="fas fa-venus text-pink-400 text-[10px]"></i>
                    ) : null}
                    {profileUserData?.regionFlag && (
                      <FlagIcon code={profileUserData?.regionCode} flagEmoji={profileUserData.regionFlag} className="w-5 h-[14px]" />
                    )}
                  </div>
                </div>

                {/* Compact Level Badges */}
                <div className="flex gap-2 animate-in slide-in-from-top duration-500">
                  {/* Wealth Badge */}
                  {(() => {
                    const info = getWealthLevelInfo(profileUserData?.wealthXP || 0);
                    return (
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${info.tier.border} ${info.tier.bg} backdrop-blur-md shadow-lg`}>
                        <div className={`w-4 h-4 rounded-full ${info.tier.bar} flex items-center justify-center text-[8px] text-white`}>
                          <i className="fas fa-crown"></i>
                        </div>
                        <span className={`text-[10px] font-black ${info.tier.color}`}>{info.level}</span>
                      </div>
                    );
                  })()}

                  {/* Charisma Badge */}
                  {(() => {
                    const info = getCharismaLevelInfo(profileUserData?.charismaXP || 0);
                    return (
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${info.tier.border} ${info.tier.bg} backdrop-blur-md shadow-lg`}>
                        <div className={`w-4 h-4 rounded-full ${info.tier.bar} flex items-center justify-center text-[8px] text-white`}>
                          <i className="fas fa-heart"></i>
                        </div>
                        <span className={`text-[10px] font-black ${info.tier.color}`}>{info.level}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* User Role Badges */}
                {profileUserData?.uid && (profileUserData.uid === currentRoom.owner?.uid || (currentRoom.moderators && currentRoom.moderators.includes(profileUserData.uid))) && (
                  <div className="flex gap-2 mt-0.5">
                    {profileUserData.uid === currentRoom.owner?.uid ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/15 text-purple-300 border border-purple-500/25 rounded-full text-[10px] font-black shadow-sm backdrop-blur-md">
                        <i className="fas fa-user-shield text-[9px] text-purple-400"></i>
                        <span>{t("مالك", "Owner")}</span>
                      </div>
                    ) : (currentRoom.moderators && currentRoom.moderators.includes(profileUserData.uid)) ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/25 rounded-full text-[10px] font-black shadow-sm backdrop-blur-md">
                        <i className="fas fa-user-shield text-[9px] text-amber-400"></i>
                        <span>{t("مشرف", "Moderator")}</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="w-full space-y-6">
                {profileUserData?.uid === user?.uid ? (
                  <div className="flex items-center justify-center gap-10 py-4 border-y border-white/10 w-full animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl font-black text-white">{profileFriendsCount}</span>
                      <span className="text-[11px] text-white/40 font-bold uppercase tracking-widest">{t("أصدقاء", "Friends")}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl font-black text-white">{profileFollowersCount}</span>
                      <span className="text-[11px] text-white/40 font-bold uppercase tracking-widest">{t("متابعين", "Followers")}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl font-black text-white">{profileUserData?.following?.length || 0}</span>
                      <span className="text-[11px] text-white/40 font-bold uppercase tracking-widest">{t("متابعة", "Following")}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-4 py-4 border-y border-white/10 w-full animate-in fade-in duration-300">
                    {/* Follow / Following Button */}
                    <button 
                      onClick={handleFollowUser}
                      className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 bg-white/5 text-white border border-white/5 rounded-2xl shadow-md"
                    >
                      <i className={`fas ${currentUserData?.following?.includes(profileUserData.uid) ? 'fa-user-check' : 'fa-user-plus'} text-purple-400 text-xs`}></i>
                      <span className="text-[10px] font-black tracking-wider leading-none">
                        {currentUserData?.following?.includes(profileUserData.uid) ? t("أتابع", "Following") : t("طلب متابعة", "Follow Request")}
                      </span>
                    </button>

                    {/* Message Button */}
                    <button 
                      onClick={() => {
                        if (onOpenChat && profileUserData?.uid) {
                          onOpenChat(profileUserData.uid);
                          setShowUserData(false);
                          setProfileUserUid(null);
                          setProfileUserData(null);
                        } else {
                          alert(t("فشل فتح المحادثة", "Failed to open chat"));
                        }
                      }}
                      className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 bg-white/5 text-white border border-white/5 rounded-2xl shadow-md"
                    >
                      <i className="fas fa-comment-dots text-purple-400 text-xs"></i>
                      <span className="text-[10px] font-black tracking-wider leading-none">{t("رسالة", "Message")}</span>
                    </button>

                    {/* Gift Button */}
                    <button 
                      onClick={() => {
                        setSelectedUserIds(new Set([profileUserData.uid]));
                        setShowUserData(false);
                        setProfileUserUid(null);
                        setProfileUserData(null);
                        setShowGifts(true);
                      }}
                      className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 bg-white/5 text-white border border-white/5 rounded-2xl shadow-md"
                    >
                      <i className="fas fa-gift text-purple-400 text-xs"></i>
                      <span className="text-[10px] font-black tracking-wider leading-none">{t("هدية", "Gift")}</span>
                    </button>
                  </div>
                )}

                {/* CP Rectangle Section */}
                {cpConfig?.rectangleUrl && (
                  <div className="relative w-full h-32 flex items-center justify-center animate-in zoom-in duration-500 overflow-visible my-4">
                    <img src={cpConfig.rectangleUrl} className="absolute inset-0 w-full h-full object-center object-contain scale-[1.26] drop-shadow-2xl z-0" alt="CP Effect" />
                    <div className="relative w-full flex items-center justify-between px-7 z-10 translate-y-[19px]">
                      {/* Me (Right in RTL) */}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-[49px] h-[49px] rounded-full border-2 border-white/20 overflow-hidden shadow-lg transform">
                          {profileUserData?.animatedAvatar ? (
                            isVideoUrl(profileUserData.animatedAvatar) ? (
                              <video src={profileUserData.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            ) : (
                              <img src={profileUserData.animatedAvatar} className="w-full h-full object-cover" />
                            )
                          ) : (
                            <img src={profileUserData?.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="text-[9px] font-black text-white/60 truncate max-w-[65px] text-center drop-shadow-md">
                          {profileUserData?.displayName || t("العضو", "Member")}
                        </span>
                      </div>
                      
                      {/* Partner / Plus Icon (Left in RTL) */}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-[49px] h-[49px] rounded-full border-2 border-white/20 overflow-hidden shadow-lg transform bg-white/5 backdrop-blur-sm flex items-center justify-center">
                          {popupPartnerData ? (
                            popupPartnerData.animatedAvatar ? (
                              isVideoUrl(popupPartnerData.animatedAvatar) ? (
                                <video src={popupPartnerData.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                              ) : (
                                <img src={popupPartnerData.animatedAvatar} className="w-full h-full object-cover" />
                              )
                            ) : (
                              <img src={popupPartnerData.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full object-cover" />
                            )
                          ) : (
                            <i className="fas fa-user text-white/20 text-xs"></i>
                          )}
                        </div>
                        <span className="text-[9px] font-black text-white/60 truncate max-w-[65px] text-center drop-shadow-md">
                          {popupPartnerData ? (popupPartnerData.displayName || t("شريك", "Partner")) : t("لا يوجد", "None")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}



            <div className="bg-black/20 p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-inner">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-center">{t("الأوسمة والجوائز", "Badges & Medals")}</p>
          <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide px-2">
            {userDataPopupBadges.length > 0 ? (
              userDataPopupBadges.map(badge => (
                <div key={badge.id} className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white/5 rounded-xl border border-white/5 overflow-hidden transition-all duration-500 shadow-lg">
                   <img src={badge.imageUrl} className="w-full h-full object-contain scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" alt="Badge" />
                </div>
              ))
            ) : (
              <div className="w-full text-center py-4">
                 <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{t("لا توجد شارات حالياً", "No badges currently available")}</p>
              </div>
            )}
          </div>
        </div>
        </div>
        </div>
        </>
        )}
        </div>
        </>
      )}

      {showGifts && (
        <>
          <div className="fixed inset-0 z-[700] bg-black/10 animate-in fade-in" onClick={() => setShowGifts(false)}></div>
          <div className="fixed bottom-0 left-0 right-0 max-md bg-black/70 border-t border-white/10 animate-slide-up h-[400px] flex flex-col overflow-hidden rounded-t-[1.5rem] shadow-2xl mx-auto z-[710]">
            <div className="px-5 pt-4 flex items-center justify-between relative">
              <div className="flex items-center gap-2 flex-wrap overflow-visible">
                {(() => {
                  const itemsToShow: any[] = [...usersOnMics];
                  selectedUserIds.forEach(id => {
                    if (!itemsToShow.some(u => u.uid === id)) {
                      const addU = allPresentUsers.find(u => u.uid === id);
                      if (addU) {
                        itemsToShow.push({
                          uid: addU.uid,
                          displayName: addU.displayName,
                          photoURL: addU.photoURL,
                          animatedAvatar: addU.animatedAvatar
                        });
                      }
                    }
                  });
                  const sliced = itemsToShow.slice(0, 6);
                  if (sliced.length > 0) {
                    return sliced.map((u, i) => (
                      <button 
                        key={u.uid || i} 
                        onClick={() => toggleUserSelection(u.uid)} 
                        className={`w-9 h-9 rounded-full relative flex items-center justify-center bg-purple-900 shadow-md transition-all active:scale-90 ${selectedUserIds.has(u.uid) ? 'ring-2 ring-purple-500' : ''}`}
                      >
                        {selectedUserIds.has(u.uid) && (
                          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 rounded-full animate-in zoom-in duration-200">
                             <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center border border-white/20 shadow-lg">
                                <i className="fas fa-check text-[8px] text-white"></i>
                             </div>
                          </div>
                        )}
                        {u.animatedAvatar ? (
                          isVideoUrl(u.animatedAvatar) ? (
                            <video src={u.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full rounded-full object-cover z-10" />
                          ) : (
                            <img src={u.animatedAvatar} className="w-full h-full rounded-full object-cover z-10" />
                          )
                        ) : (
                          <img src={u.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full rounded-full object-cover z-10" />
                        )}
                      </button>
                    ));
                  }
                  return <div className="text-[10px] text-white/40 font-black pr-2">{t("لا يوجد أحد على المايك", "No one is on mic")}</div>;
                })()}
              </div>
              <div className="relative">
                <button onClick={() => setShowSelectionMenu(!showSelectionMenu)} className="w-9 h-9 rounded-full bg-[#1a0b2e]/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 active:scale-95"><i className={`fas fa-chevron-down text-[12px] ${showSelectionMenu ? 'rotate-180' : ''}`}></i></button>
                {showSelectionMenu && (
                  <div className="absolute top-full left-0 mt-2 w-32 bg-[#0d051a]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 animate-in zoom-in duration-200" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    <button onClick={() => handleSelectionMode('manual')} className={`w-full py-3 px-4 ${language === 'ar' ? 'text-right' : 'text-left'} text-[10px] font-black text-white border-b border-white/5 flex items-center justify-between`}><span>{t("تحديد", "Select")}</span>{selectionMode === 'manual' && <i className="fas fa-check text-purple-400 text-[8px]"></i>}</button>
                    <button onClick={() => handleSelectionMode('all-room')} className={`w-full py-3 px-4 ${language === 'ar' ? 'text-right' : 'text-left'} text-[10px] font-black text-white border-b border-white/5 flex items-center justify-between`}><div className="flex items-center gap-2"><i className="fas fa-home text-[10px] opacity-60"></i><span>{t("كل الغرفة", "All Room")}</span></div>{selectionMode === 'all-room' && <i className="fas fa-check text-purple-400 text-[8px]"></i>}</button>
                    <button onClick={() => handleSelectionMode('all-mic')} className={`w-full py-3 px-4 ${language === 'ar' ? 'text-right' : 'text-left'} text-[10px] font-black text-white flex items-center justify-between`}><div className="flex items-center gap-2"><i className="fas fa-microphone text-[10px] opacity-60"></i><span>{t("كل المايك", "All Mics")}</span></div>{selectionMode === 'all-mic' && <i className="fas fa-check text-purple-400 text-[8px]"></i>}</button>
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 mt-3 pb-2">
              <div className="flex items-center justify-between w-full px-1 border-b border-white/10 overflow-x-auto scrollbar-hide gap-1">
                {['normal', 'lucky', 'cp', 'famous', 'country', 'vip', 'birthday'].map((tab) => (
                   <button key={tab} onClick={() => setGiftTab(tab as GiftTab)} className={`relative flex-1 min-w-fit px-2 flex flex-col items-center text-[10px] font-black pb-1.5 whitespace-nowrap ${giftTab === tab ? 'text-purple-400' : 'text-white/40'}`}>
                    {tab === 'normal' ? t('عادية', 'Normal') : tab === 'lucky' ? t('محظوظة', 'Lucky') : tab === 'cp' ? t('CP', 'CP') : tab === 'famous' ? t('مشاهير', 'Famous') : tab === 'country' ? t('دولة', 'Country') : tab === 'vip' ? t('VIP', 'VIP') : t('ميلاد', 'Birthday')}
                    {giftTab === tab && <div className="absolute bottom-0 w-6 h-0.5 bg-purple-400 rounded-full"></div>}
                   </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-1 scrollbar-hide">
              <div className="grid grid-cols-4 gap-2 min-h-[200px]">
                {filteredGifts.length > 0 ? (
                  filteredGifts.map(gift => {
                    const isLongGiftName = gift.name.length > 8;
                    return (
                      <button 
                        key={gift.id} 
                        onClick={() => setSelectedGiftId(gift.id)} 
                        className={`flex flex-col items-center justify-center p-1 py-3 rounded-2xl transition-all duration-300 h-[92px] border relative ${
                          selectedGiftId === gift.id 
                          ? 'bg-purple-600/20 border-purple-500/50' 
                          : 'bg-white/5 border-white/5'
                        }`}
                      >
                        {selectedGiftId === gift.id && (
                          <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none"></div>
                        )}
                        <div className={`text-2xl mb-2 transition-transform duration-300 ${selectedGiftId === gift.id ? 'scale-110' : ''}`}>
                          {gift.icon.startsWith('http') ? <img src={gift.icon} className="w-8 h-8 object-contain" alt={gift.name} /> : gift.icon}
                        </div>
                        <div className="w-full overflow-hidden h-4 flex items-center justify-center mb-0.5 px-1 relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}>
                          {isLongGiftName ? (
                            <div className="flex animate-marquee-infinite">
                              <span className="text-[10px] text-white font-bold whitespace-nowrap pr-8">{gift.name}</span>
                              <span className="text-[10px] text-white font-bold whitespace-nowrap pr-8">{gift.name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-white font-bold truncate text-center">{gift.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-black transition-colors ${selectedGiftId === gift.id ? 'text-yellow-400' : 'text-yellow-500/80'}`}>{gift.price}</span>
                          <i className="fas fa-coins text-yellow-500 text-[8px]"></i>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-4 flex flex-col items-center justify-center py-16 opacity-30 animate-in fade-in zoom-in duration-500">
                    <i className="fas fa-box-open text-5xl mb-3 text-white/20"></i>
                    <p className="text-[11px] font-black text-white/60 uppercase tracking-widest">{t("لا يوجد شيء هنا", "Nothing here")}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 h-20 bg-black/40 border-t border-white/10 flex items-center justify-between py-2.5 overflow-visible">
              <div className="flex items-center gap-2 bg-white/10 rounded-full h-9 px-4 border border-white/10">
                <div className="flex flex-row-reverse items-center gap-2"><span className="text-[13px] text-white font-black">{(currentUserData?.coins || 0).toLocaleString('en-US')}</span><i className="fas fa-coins text-yellow-500 text-[10px]"></i></div>
              </div>
              <div className="flex items-center h-9 w-[131px] relative overflow-visible">
                 <div className="flex items-center h-full w-full rounded-full border border-[#2d1252]/60 overflow-hidden shadow-lg">
                    <div className="basis-1/2 h-full relative bg-[#2d1252]/30">
                       <button onClick={(e) => { e.stopPropagation(); if (selectedGiftId) { setShowQuantityMenu(!showQuantityMenu); } }} className="w-full h-full flex items-center justify-center gap-1 transition-all">
                         <i className={`fas fa-chevron-up text-[7px] text-white/60 ${showQuantityMenu ? 'rotate-180' : ''}`}></i>
                         <span className="text-[9px] font-black text-white/90">x{selectedQuantity}</span>
                       </button>
                       {showQuantityMenu && (
                         <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowQuantityMenu(false)}></div>
                           <div className="relative w-full max-w-[280px] bg-[#0d051a]/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                             <div className="p-4 border-b border-white/5 bg-white/5">
                               <h3 className="text-white text-center text-[13px] font-black uppercase tracking-wider">{t("اختر الكمية", "Select Quantity")}</h3>
                             </div>
                             <div className="p-3 grid grid-cols-2 gap-2">
                              {quantities.map((q) => (
                                <button 
                                  key={q} 
                                  onClick={(e) => { e.stopPropagation(); setSelectedQuantity(q); setShowQuantityMenu(false); }} 
                                  className={`py-3 px-4 rounded-xl text-center text-xs font-black transition-all ${selectedQuantity === q ? 'bg-purple-600/30 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'}`}
                                >
                                  x{q}
                                </button>
                              ))}
                             </div>
                             <div className="p-2 pt-0 pb-4">
                               <button 
                                 onClick={() => setShowQuantityMenu(false)}
                                 className="w-full py-3.5 rounded-xl text-[11px] font-black text-white/50 bg-white/5 hover:text-white transition-all"
                               >
                                  {t("إلغاء", "Cancel")}
                               </button>
                             </div>
                           </div>
                         </div>
                       )}
                    </div>
                    <button onClick={handleSendGift} className="basis-1/2 h-full bg-[#2d1252]/85 text-white text-[9.5px] font-black border-r border-[#2d1252]/60 transition-all">{t("إرسال", "Send")}</button>
                 </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SENSATIONAL HIGH-TECH GLASSMORPHISM AUDIO PLAYER OVERLAY */}
      {showMusicModal && (
        <><div className="fixed inset-0 z-[800] bg-black/10 animate-in fade-in" onClick={() => setShowMusicModal(false)}></div>
        <div className="fixed bottom-0 left-0 right-0 max-md mx-auto z-[810] bg-[#100322]/90 border-t border-white/15 animate-slide-up h-[500px] flex flex-col overflow-hidden rounded-t-[1.8rem] shadow-2xl" dir="rtl">
          <div className="w-12 h-1.5 bg-white/15 rounded-full mx-auto mt-4 mb-2 flex-shrink-0"></div>
          
          <div className="px-5 py-2 flex items-center justify-between border-b border-white/5 pb-4">
            <h3 className="text-white text-[14px] font-black tracking-tight flex items-center gap-2">
              <i className="fas fa-compact-disc text-purple-400 text-sm animate-spin [animation-duration:10s]"></i>
              {t("مشغل الموسيقى", "Music Player")}
            </h3>
            <button 
              onClick={() => setShowMusicModal(false)}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/5 text-white/60 flex items-center justify-center active:scale-90 transition-transform"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
            {isMusicScanning ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-6 animate-in zoom-in duration-300">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-purple-500/10"></div>
                  <div className="absolute inset-2 rounded-full border border-purple-500/10"></div>
                  <div className="absolute inset-4 rounded-full bg-purple-600/10 border border-purple-500/10 flex items-center justify-center">
                    <i className="fas fa-compact-disc text-purple-400 text-4xl animate-spin [animation-duration:3s]"></i>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-white font-black text-sm">{t("جاري البحث عن ملفات الموسيقى...", "Scanning device files...")}</h4>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{t("يرجى اختيار ملفات الصوت الخاصة بك من الاستوديو", "Please choose audio tracks from your device storage")}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Live Controller Panel */}
                <div className="bg-gradient-to-br from-purple-950/25 to-slate-950/25 border border-white/10 rounded-2xl p-4 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-[9px] text-purple-400 font-extrabold uppercase tracking-widest">{t("الملف الحالي", "CURRENT BROADCAST")}</p>
                      <h4 className="text-white font-black text-sm truncate tracking-tight mt-1 flex items-center justify-end gap-1.5" dir="rtl">
                        {userIsOnMic && isCurrentSender ? (
                          <>
                            <i className="fas fa-music text-purple-400 animate-pulse text-xs"></i>
                            <span className="truncate">{currentSongTitle || t("لم يتم تحديد أغنيـة بعد", "Idle / No Active Song")}</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-lock text-white/30 text-[11px]"></i>
                            <span className="text-white/45 font-medium text-xs">{t("مغلقة", "Closed")}</span>
                          </>
                        )}
                      </h4>
                    </div>
                  </div>

                  {/* Progress Slider */}
                  <div className="space-y-1.5 pb-1">
                    <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden group">
                      <input 
                        type="range"
                        min="0"
                        max={musicDuration || 1}
                        value={userIsOnMic && isCurrentSender ? musicSeekPosition : 0}
                        onChange={(e) => {
                          if (!userIsOnMic || !isCurrentSender) return;
                          const val = Number(e.target.value);
                          setMusicSeekPosition(val);
                          if (audioRef.current) {
                            audioRef.current.currentTime = val;
                          }
                        }}
                        onTouchStart={() => { if (userIsOnMic && isCurrentSender) isDraggingMusicSeek.current = true; }}
                        onTouchEnd={() => {
                          if (!userIsOnMic || !isCurrentSender) {
                            alert(t("يجب أن تكون متواجدًا على المايك لتشغيل أو تعديل الموسيقى", "You must be on a mic to play or adjust music"));
                            return;
                          }
                          isDraggingMusicSeek.current = false;
                          updateRoomMusicState({ seekPosition: musicSeekPosition });
                        }}
                        onMouseDown={() => { if (userIsOnMic && isCurrentSender) isDraggingMusicSeek.current = true; }}
                        onMouseUp={() => {
                          if (!userIsOnMic || !isCurrentSender) {
                            alert(t("يجب أن تكون متواجدًا على المايك لتشغيل أو تعديل الموسيقى", "You must be on a mic to play or adjust music"));
                            return;
                          }
                          isDraggingMusicSeek.current = false;
                          updateRoomMusicState({ seekPosition: musicSeekPosition });
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        disabled={!userIsOnMic || !isCurrentSender}
                      />
                      <div 
                        className="h-full bg-gradient-to-l from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${userIsOnMic && isCurrentSender ? ((musicSeekPosition / (musicDuration || 1)) * 100) : 0}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-white/40 font-bold font-mono">
                      <span>{userIsOnMic && isCurrentSender ? `${Math.floor(musicSeekPosition / 60)}:${(Math.floor(musicSeekPosition % 60)).toString().padStart(2, '0')}` : "0:00"}</span>
                      <span>{userIsOnMic && isCurrentSender ? `${Math.floor(musicDuration / 60)}:${(Math.floor(musicDuration % 60)).toString().padStart(2, '0')}` : "0:00"}</span>
                    </div>
                  </div>

                  {/* Controller Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          if (!userIsOnMic || !isCurrentSender) {
                            alert(t("يجب أن تكون متواجدًا على المايك لتشغيل الموسيقى", "You must be on a mic to play music"));
                            return;
                          }
                          const soundState = !isMusicPlaying;
                          updateRoomMusicState({ playing: soundState, seekPosition: audioRef.current ? audioRef.current.currentTime : 0 });
                        }}
                        className="w-10 h-10 rounded-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <i className={`fas ${(userIsOnMic && isMusicPlaying && isCurrentSender) ? 'fa-pause' : 'fa-play'} text-sm`}></i>
                      </button>
                    </div>

                    {/* Volume block */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-purple-300 font-mono min-w-[28px] text-center font-black">
                        {Math.round((userIsOnMic && isCurrentSender ? musicVolume : 0) * 100)}%
                      </span>
                      <i className={`fas ${(userIsOnMic && isCurrentSender && musicVolume === 0) ? 'fa-volume-mute' : (userIsOnMic && isCurrentSender && musicVolume < 0.4) ? 'fa-volume-low' : 'fa-volume-high'} text-white/40 text-xs`}></i>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={userIsOnMic && isCurrentSender ? musicVolume : 0} 
                        onChange={(e) => {
                          if (userIsOnMic && isCurrentSender) {
                            setMusicVolume(Number(e.target.value));
                          }
                        }}
                        className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500" 
                        disabled={!userIsOnMic || !isCurrentSender}
                      />
                    </div>
                  </div>
                </div>

                {/* Playlist Section */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-black text-[11px] tracking-tight uppercase">{t("ملفات الصوت والموسيقى", "Audio & Music Files")}</h4>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const input = document.getElementById('device-music-scanner') as HTMLInputElement;
                          if (input) input.click();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/20 text-[10px] font-black flex items-center gap-1.5 transition-all"
                      >
                        <i className="fas fa-plus"></i>
                        {t("إضافة موسيقى", "Add Music")}
                      </button>
                    </div>
                    <input 
                      type="file" 
                      id="device-music-scanner" 
                      multiple 
                      accept="audio/*" 
                      className="hidden w-0 h-0 opacity-0 absolute pointer-events-none" 
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        
                        setIsMusicScanning(true);
                        await new Promise(resolve => setTimeout(resolve, 800));
                        
                        for (let i = 0; i < files.length; i++) {
                           const file = files[i];
                           const trackId = 'id_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
                           const actualDuration = await getAudioDuration(file);
                           // Save the actual file Blob directly into IndexedDB!
                           await saveTrackToDB({
                             id: trackId,
                             name: file.name.replace(/\.[^/.]+$/, ""),
                             blob: file,
                             duration: actualDuration,
                             roomId: currentRoom.id,
                             userId: user?.uid || 'anonymous'
                           });
                        }
                        
                        // Reload modern live list from IndexedDB freshly
                        const userId = user?.uid || 'anonymous';
                        const localTracks = await loadTracksFromDBForUser(userId);
                        setMusicList([...DEFAULT_TRACKS, ...localTracks]);
                        setIsMusicScanning(false);
                      }}
                    />
                  </div>

                  {musicList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-35 bg-white/2 border border-white/5 rounded-2xl">
                      <i className="fas fa-folder-open text-3xl text-white/50 mb-2"></i>
                      <p className="text-[10px] uppercase font-black">{t("لا توجد موسيقى. اضغط إضافة موسيقى", "Empty Playlist. Click Add Music")}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-hide pr-1">
                      {musicList.map((track) => {
                        const isActive = userIsOnMic && isCurrentSender && (currentSongSrc === track.src || (track.isLocal && currentSongTitle === track.name));
                        return (
                          <div key={track.id} className="relative overflow-hidden rounded-xl bg-transparent">
                            {/* Absolute action overlay under the card on the far left */}
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 z-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTrack(track.id);
                                }}
                                className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 border border-red-500/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
                                title={t("حذف", "Delete")}
                              >
                                <i className="fas fa-trash-alt text-[10px]"></i>
                              </button>
                            </div>

                            {/* Main list item, draggable to the right to reveal delete button */}
                            <motion.div
                              drag="x"
                              dragDirectionLock
                              dragConstraints={{ left: 0, right: 54 }}
                              dragElastic={{ left: 0.05, right: 0.2 }}
                              className="relative z-10 w-full rounded-xl bg-[#100322]"
                            >
                              <button 
                                onClick={() => {
                                  if (!userIsOnMic) {
                                    alert(t("يجب أن تكون متواجدًا على المايك لتشغيل الموسيقى", "You must be on a mic to play music"));
                                    return;
                                  }
                                  updateRoomMusicState({
                                    src: track.src,
                                    title: track.name,
                                    playing: true,
                                    seekPosition: 0
                                  });
                                }}
                                className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-right ${isActive ? 'bg-purple-600/20 border-purple-500/30' : 'bg-white/5 border-white/5 active:scale-98'}`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${isActive ? 'bg-purple-500/30 text-purple-300' : 'bg-white/5 text-white/40'}`}>
                                    <i className={`fas ${isActive && isMusicPlaying ? 'fa-volume-up' : 'fa-music'} text-[10px]`}></i>
                                  </div>
                                  <div className="text-right min-w-0">
                                    <h5 className={`text-xs font-black truncate ${isActive ? 'text-purple-300 font-extrabold' : 'text-white/80'}`}>
                                      {track.name}
                                    </h5>
                                  </div>
                                </div>
                                <div className="text-[10px] text-white/30 font-bold font-mono">
                                  {Math.floor(track.duration / 60)}:{(Math.floor(track.duration % 60)).toString().padStart(2, '0')}
                                </div>
                              </button>
                            </motion.div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div></>
      )}

      {/* ==================== ROOM INFO MODAL (معلومات الغرفة) ==================== */}
      {showRoomInfoModal && (
        <>
          <div className="fixed inset-0 z-[840] bg-black/50" onClick={() => setShowRoomInfoModal(false)}></div>
          <div 
            className="fixed bottom-0 left-0 right-0 max-md mx-auto z-[841] bg-[#0d041e]/80 border-t border-white/10 rounded-t-[2.2rem] p-5 pb-7 shadow-2xl pointer-events-auto flex flex-col font-['Cairo'] text-right animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            {/* Small drag indication handle */}
            <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4 flex-shrink-0"></div>

            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3.5 flex-shrink-0">
              <button 
                onClick={() => setShowRoomInfoModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all active:scale-90"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
              <h3 className="text-white text-[14px] font-black">{t("معلومات الغرفة", "Room Information")}</h3>
              <div className="w-8"></div>
            </div>

            {/* Premium Compact Horizontal Room Card */}
            <div className="bg-purple-600/5 border border-purple-500/10 rounded-2xl p-3 flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shadow-md flex-shrink-0">
                  <img src={currentRoom.coverImage} className="w-full h-full object-cover" alt="Cover" />
                </div>
                <div className="text-right">
                  <h4 className="text-white font-extrabold text-[13px] flex items-center gap-1 leading-tight">
                    {currentRoom.title}
                  </h4>
                  <p className="text-[9px] text-white/40 font-bold uppercase tracking-wider mt-1 select-all" dir="ltr">
                    ID: {displayId}
                  </p>
                </div>
              </div>

              {isRoomOwner && (
                <button 
                  onClick={() => {
                    setShowRoomInfoModal(false);
                    setShowRoomSettings(true);
                  }}
                  className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 flex items-center justify-center transition-all active:scale-90"
                  title={t("تعديل الغرفة", "Edit Room")}
                >
                  <i className="fas fa-cog text-xs"></i>
                </button>
              )}
            </div>

            {/* Bar Wealth Value & Distribution Trigger */}
            <div className="mb-2.5">
              <div 
                onClick={() => {
                  if (isRoomOwner) {
                    setShowRoomInfoModal(false);
                    setShowBarWealthModal(true);
                  } else {
                    alert(t("ثروة البار: تجمع 20% من قيمة الهدايا المرسلة في الغرفة ويمكن لمؤسس الغرفة توزيعها على الأعضاء.", "Bar Wealth: 20% of gifts sent in this room are added here. The room owner can distribute these coins to any user."));
                  }
                }}
                className={`p-3 bg-white/3 rounded-xl border border-white/5 flex flex-col justify-between h-[64px] transition-all w-full ${isRoomOwner ? 'cursor-pointer hover:bg-white/10 active:scale-[0.99]' : 'cursor-default'}`}
              >
                <div className="flex items-center justify-between text-[10px] text-white/40 font-bold">
                  <span className="flex items-center gap-1">
                    <i className="fas fa-coins text-yellow-500 text-[9px]"></i>
                    {t("ثروة البار", "Bar Wealth")}
                  </span>
                  {isRoomOwner && (
                    <span className="text-[7px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-1.5 rounded-full font-black">
                      {t("توزيع", "Distribute")}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-yellow-400 font-extrabold text-[12px]">{currentRoom.barWealth || 0}</span>
                  {isRoomOwner && (
                    <i className="fas fa-chevron-left text-[8px] text-white/20"></i>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata (Country / Bio) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-white/3 rounded-xl border border-white/5">
                <span className="text-white/40 font-black text-[10px]">{t("الدولة", "Country")}</span>
                <div className="flex items-center gap-1.5">
                  {ownerData?.regionFlag && (
                    <FlagIcon code={ownerData?.regionCode} flagEmoji={ownerData.regionFlag} className="w-4 h-[11px]" />
                  )}
                  <span className="text-white/70 font-bold text-[11px]">{ownerData?.region || t("العالم العربي", "Arab World")}</span>
                </div>
              </div>

              <div className="p-2.5 bg-white/3 rounded-xl border border-white/5 text-right flex flex-col gap-1 max-h-[85px] overflow-y-auto scrollbar-hide">
                <span className="text-white/40 font-black text-[10px]">{t("وصف الغرفة", "Room Bio")}</span>
                <p className="text-white/60 text-[10.5px] leading-relaxed break-words font-medium">
                  {currentRoom.description || t("مرحباً بكم في غرفتنا الصوتية المتواضعة! نرجو احترام القواعد والاستمتاع بوقتكم.", "Welcome to our voice room, please respect rules and have a wonderful time!")}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ==================== BAR WEALTH DISTRIBUTION BACKEND MODAL (لوحة ثروة البار) ==================== */}
      {showBarWealthModal && (
         <>
          <div className="fixed inset-0 z-[850] bg-black/50" onClick={() => setShowBarWealthModal(false)}></div>
          <div 
            className="fixed bottom-0 left-0 right-0 max-md mx-auto z-[851] bg-[#0d041e]/80 border-t border-white/10 rounded-t-[2.2rem] p-5 pb-7 shadow-2xl pointer-events-auto flex flex-col font-['Cairo'] text-right h-[75%] max-h-[600px] overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mb-4 flex-shrink-0"></div>

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 flex-shrink-0">
              <button 
                onClick={() => setShowBarWealthModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all active:scale-90"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
              <h3 className="text-white text-[14px] font-black">{t("ثروة البار", "Bar Wealth")}</h3>
              <div className="w-8"></div>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto space-y-3.5 py-4 pr-1 scrollbar-hide">
              {/* Premium Eye-friendly Wealth Balance Block */}
              <div className="bg-purple-600/5 border border-purple-500/10 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                    <i className="fas fa-coins text-lg"></i>
                  </div>
                  <div className="text-right">
                    <span className="text-[20px] font-black text-yellow-400 leading-none">{currentRoom.barWealth || 0}</span>
                    <p className="text-[9px] text-white/40 font-bold tracking-tight mt-0.5">{t("الذهب المتوفر للتوزيع في الغرفة", "Gold available in room")}</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const icon = document.getElementById("bar-wealth-ref-icon-compact");
                    if (icon) {
                      icon.classList.add("animate-spin");
                      setTimeout(() => icon.classList.remove("animate-spin"), 800);
                    }
                  }}
                  className="w-8 h-8 rounded-xl bg-white/5 text-white/40 hover:text-white flex items-center justify-center active:scale-90 transition-all border border-white/5"
                >
                  <i id="bar-wealth-ref-icon-compact" className="fas fa-sync-alt text-[10px]"></i>
                </button>
              </div>

              {/* Input Form Group */}
              <div className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="space-y-1 flex flex-col items-start w-full">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1">
                    {t("أدخل أيدي المستخدم (ID):", "User ID:")}
                  </label>
                  <input 
                    type="text"
                    className="w-full bg-[#13072b]/65 border border-white/10 rounded-xl py-2.5 px-4 text-white text-xs text-right font-black placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                    placeholder={t("أدخل الـ ID المكون من 6 أرقام", "Enter 6-digit User ID")}
                    value={targetUserIdInput}
                    onChange={(e) => setTargetUserIdInput(e.target.value)}
                  />
                </div>

                <div className="space-y-1 flex flex-col items-start w-full">
                  <label className="text-[10px] font-black text-purple-400 uppercase tracking-wider flex items-center gap-1">
                    <i className="fas fa-coins text-[9px]"></i>
                    {t("أدخل رقم التوزيع:", "Distribution Amount:")}
                  </label>
                  <input 
                    type="number"
                    className="w-full bg-[#13072b]/65 border border-white/10 rounded-xl py-2.5 px-4 text-white text-xs text-right font-black placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                    placeholder={t("الرجاء إدخال عدد صحيح", "Enter integer amount")}
                    value={distributionAmountInput}
                    onChange={(e) => setDistributionAmountInput(e.target.value)}
                  />
                </div>

                <div className="pt-1.5">
                  <button 
                    onClick={handleDistributeBarWealth}
                    disabled={isDistributing}
                    className="w-full bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-white font-black text-xs py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    {isDistributing ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                        <span>{t("جاري التوزيع...", "Processing...")}</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane text-[10px]"></i>
                        <span>{t("إرسال الذهب", "Send Coins")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Logs Title */}
              <div className="pt-1 pb-1 border-b border-white/5 flex items-center justify-between">
                <span className="text-[9px] text-white/30 font-black uppercase tracking-wider">{t("سجلات النقل الأخيرة", "Recent transfers")}</span>
                <p className="text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <i className="fas fa-history text-[9px] text-purple-400"></i>
                  {t("سجل التوزيع", "Distribution History")}
                </p>
              </div>

              {/* Logs List Section */}
              <div className="space-y-2 pb-4">
                {barWealthLogs.length === 0 ? (
                  <div className="py-10 text-center text-white/20 text-[11px] font-black uppercase tracking-widest">
                    {t("لا توجد سجلات توزيع بعد", "No transfer history yet")}
                  </div>
                ) : (
                  barWealthLogs.slice(0, 30).map((log) => {
                    const logDateStr = (() => {
                      if (!log.createdAt) return '';
                      const date = log.createdAt.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
                      const pad = (n: number) => n.toString().padStart(2, '0');
                      const h = pad(date.getHours());
                      const m = pad(date.getMinutes());
                      const s = pad(date.getSeconds());
                      const d = pad(date.getDate());
                      const mo = pad(date.getMonth() + 1);
                      const y = date.getFullYear();
                      return `${h}:${m}:${s} ${d}-${mo}-${y}`;
                    })();

                    return (
                      <div key={log.id} className="flex items-center justify-between bg-white/3 border border-white/5 rounded-xl p-2.5 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="text-right min-w-0">
                            <h5 className="text-white font-black text-[11px] truncate leading-tight">{log.targetName}</h5>
                            <p className="text-[8px] text-white/40 font-bold tracking-tight mt-0.5" dir="ltr">ID: {log.targetCustomId}</p>
                          </div>
                        </div>

                        <div className="text-left flex-shrink-0">
                          <div className="flex items-center gap-1 text-red-500 font-extrabold text-[11px] justify-end">
                            <span>-{log.amount}</span>
                            <i className="fas fa-coins text-[9px]"></i>
                          </div>
                          <p className="text-[7.5px] text-white/30 font-bold uppercase tracking-wider mt-0.5 leading-none" dir="ltr">
                            {logDateStr}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showRoomTrophyModal && (
        <div 
          className="fixed inset-0 max-w-md mx-auto z-[841] bg-[#0d041e] flex flex-col font-['Cairo'] text-right overflow-hidden animate-in fade-in duration-300 pointer-events-auto bg-cover bg-center"
          style={(designSettings?.roomTrophyBg || currentRoom?.roomTrophyBg) ? { backgroundImage: `url(${designSettings?.roomTrophyBg || currentRoom?.roomTrophyBg})` } : {}}
          onClick={(e) => e.stopPropagation()}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 bg-transparent">
            <button 
              onClick={() => setShowRoomTrophyModal(false)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all active:scale-90"
            >
              <i className={`fas ${language === 'ar' ? 'fa-chevron-right' : 'fa-chevron-left'} text-sm`}></i>
            </button>
            <h3 className="text-white text-[15px] font-black">{t("كأس الغرفة", "Room Trophy")}</h3>
            <div className="w-10"></div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 scrollbar-hide flex flex-col gap-4">
            
            {/* Solid BG-Black Styled Tab Selectors matching the room title container styling */}
            <div className="grid grid-cols-3 bg-white/5 backdrop-blur-md p-0.5 rounded-full border border-white/10 flex-shrink-0 font-black h-9 w-[85%] max-w-[280px] mx-auto">
              <button 
                onClick={() => setRoomTrophyTab('daily')} 
                style={roomTrophyTab === 'daily' && designSettings?.roomTrophyTabActiveBg ? { backgroundImage: `url(${designSettings.roomTrophyTabActiveBg})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundColor: 'transparent' } : {}}
                className={`py-1 text-[11px] font-black rounded-full transition-all ${
                  roomTrophyTab === 'daily' 
                    ? (designSettings?.roomTrophyTabActiveBg ? 'text-white border-transparent' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/10') 
                    : 'text-white/45 hover:text-white/80'
                }`}
              >
                {t("اليومي", "Daily")}
              </button>
              <button 
                onClick={() => setRoomTrophyTab('weekly')} 
                style={roomTrophyTab === 'weekly' && designSettings?.roomTrophyTabActiveBg ? { backgroundImage: `url(${designSettings.roomTrophyTabActiveBg})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundColor: 'transparent' } : {}}
                className={`py-1 text-[11px] font-black rounded-full transition-all ${
                  roomTrophyTab === 'weekly' 
                    ? (designSettings?.roomTrophyTabActiveBg ? 'text-white border-transparent' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/10') 
                    : 'text-white/45 hover:text-white/80'
                }`}
              >
                {t("الأسبوعي", "Weekly")}
              </button>
              <button 
                onClick={() => setRoomTrophyTab('monthly')} 
                style={roomTrophyTab === 'monthly' && designSettings?.roomTrophyTabActiveBg ? { backgroundImage: `url(${designSettings.roomTrophyTabActiveBg})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundColor: 'transparent' } : {}}
                className={`py-1 text-[11px] font-black rounded-full transition-all ${
                  roomTrophyTab === 'monthly' 
                    ? (designSettings?.roomTrophyTabActiveBg ? 'text-white border-transparent' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/10') 
                    : 'text-white/45 hover:text-white/80'
                }`}
              >
                {t("الشهري", "Monthly")}
              </button>
            </div>

            {/* Supporters Leaderboard List / Empty Box Section */}
            <div className="space-y-3 flex-1 pb-6">
              {(() => {
                const currentList = roomTrophyTab === 'daily' 
                  ? roomTrophyDailyList 
                  : roomTrophyTab === 'weekly' 
                    ? roomTrophyWeeklyList 
                    : roomTrophyMonthlyList;

                if (currentList.length === 0) {
                  return (
                    <div className="py-20 text-center text-white/30 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-3xl bg-white/3 my-2 animate-in fade-in duration-300">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3 flex-shrink-0">
                        <i className="fas fa-box-open text-2xl text-white/20"></i>
                      </div>
                      <p className="text-sm font-black tracking-wide text-white/40 leading-relaxed max-w-[200px] mx-auto text-center" style={{ direction: 'rtl' }}>
                        {t("عذراً هذا الشخص لم يستلم أي هدايا", "Sorry, this person has not received any gifts")}
                      </p>
                    </div>
                  );
                }

                return currentList.map((supporter, idx) => {
                  const rank = idx + 1;

                  // Find user details to check for customIdIcon and currentFrame
                  const details = allPresentUsers.find(u => u.uid === supporter.uid) || 
                                  (supporter.uid === user?.uid ? currentUserData : null) || 
                                  (supporter.uid === currentRoom?.ownerId ? ownerData : null);
                  const supporterCustomIdIcon = details?.customIdIcon || supporter.customIdIcon || '';
                  const sIdX = details?.profileIdOffsetX ?? details?.idOffsetX ?? supporter.idOffsetX ?? 28;
                  const sIdY = details?.profileIdOffsetY ?? details?.idOffsetY ?? supporter.idOffsetY ?? 0.5;
                  const sIdFS = details?.profileIdFontSize ?? details?.idFontSize ?? supporter.idFontSize ?? 11;
                  const supporterCustomId = supporter.customId || details?.customId || '';
                  const supporterCurrentFrame = details?.currentFrame || supporter.currentFrame || '';

                  const itemBgStyle = designSettings?.roomTrophyItemBg 
                    ? { backgroundImage: `url(${designSettings.roomTrophyItemBg})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundColor: 'transparent' } 
                    : {};

                  const itemClass = designSettings?.roomTrophyItemBg
                    ? "flex items-center justify-between p-3.5 relative overflow-hidden transition-all active:scale-[0.98]" 
                    : "flex items-center justify-between bg-white/3 border border-white/5 rounded-xl p-3.5 hover:bg-white/5 transition-colors";

                  return (
                    <div key={supporter.uid} className={itemClass} style={itemBgStyle}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Avatar container that allows frame overflow */}
                        <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
                          <div className="w-full h-full rounded-full overflow-hidden border border-white/10 relative z-10 bg-black/20">
                            <img src={supporter.photoURL || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231a0b2e'/><circle cx='50' cy='35' r='20' fill='%23ffffff' fill-opacity='0.3'/><path d='M25 80c0-15 10-25 25-25s25 10 25 25' fill='%23ffffff' fill-opacity='0.3'/></svg>"} className="w-full h-full object-cover" alt="" />
                          </div>
                          {supporterCurrentFrame && (
                            <img src={supporterCurrentFrame} className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20 scale-[1.35]" alt="frame" />
                          )}
                        </div>

                        <div className="text-right min-w-0 flex flex-col items-start gap-0.5">
                          <h5 className="text-white font-black text-[12.5px] truncate leading-tight flex items-center gap-1">
                            {supporter.displayName}
                          </h5>
                          
                          {supporterCustomIdIcon ? (
                            <div className="relative w-[85px] h-[26.5px] flex items-center bg-contain bg-center bg-no-repeat mt-0.5 select-none" style={{ backgroundImage: `url(${supporterCustomIdIcon})` }}>
                              <span className="font-mono font-black text-white tracking-widest text-center w-full block drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)]" 
                                    style={{ 
                                      paddingLeft: `${sIdX}px`, 
                                      paddingTop: `${sIdY}px`,
                                      fontSize: `${sIdFS - 2.2}px`
                                    }}>
                                {supporterCustomId}
                              </span>
                            </div>
                          ) : (
                            /* Beautiful ID badge without default icon */
                            <div className="flex items-center gap-1 mt-0.5 bg-white/5 border border-white/5 rounded-md px-1.5 py-0.5 w-fit" dir="ltr">
                              <span className="text-[8.5px] text-white/60 font-mono tracking-tight font-black">ID: {supporterCustomId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Gift value spent (removed yellow border/bg rectangle for full numeric flexibility and zero overlap) */}
                      {(() => {
                        const amountStr = supporter.amount.toLocaleString();
                        let coinFontSize = "text-[12.5px]";
                        let coinIconSize = "text-[10.5px]";
                        if (amountStr.length > 8) {
                          coinFontSize = "text-[10px]";
                          coinIconSize = "text-[9px]";
                        } else if (amountStr.length > 6) {
                          coinFontSize = "text-[11.5px]";
                          coinIconSize = "text-[10px]";
                        }
                        return (
                          <div className={`text-left flex-shrink-0 flex items-center gap-1 text-yellow-400 font-extrabold ${coinFontSize} ml-2 pl-1 select-all`}>
                            <span>{amountStr}</span>
                            <i className={`fas fa-coins ${coinIconSize}`}></i>
                          </div>
                        );
                      })()}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* طيران الهدايا نحو صورة المستخدم على المايك */}
      {flyingGifts.map(item => (
        <FlyingGiftItem 
          key={item.id} 
          item={item} 
          onComplete={() => setFlyingGifts(prev => prev.filter(g => g.id !== item.id))} 
        />
      ))}

      {/* دائرة احتفالية في منتصف الشاشة تظهر لمدة ثانيتين عند الفوز بالحظ */}
      {showLuckyWinModal && luckyWinInfo && (() => {
        // تحديد أيقونة الدائرة حسب مضاعف الفوز (4 مستويات للـ X)
        const m = luckyWinInfo.multiplier;
        let activeCircleIcon: string | null = null;
        if (m >= 30 && designSettings?.luckyCircleTier4) {
          activeCircleIcon = designSettings.luckyCircleTier4;
        } else if (m >= 20 && designSettings?.luckyCircleTier3) {
          activeCircleIcon = designSettings.luckyCircleTier3;
        } else if (m >= 10 && designSettings?.luckyCircleTier2) {
          activeCircleIcon = designSettings.luckyCircleTier2;
        } else if (m >= 5 && designSettings?.luckyCircleTier1) {
          activeCircleIcon = designSettings.luckyCircleTier1;
        } else {
          // إذا كان المضاعف أقل من 5، استخدام الدائرة 1 إن وُجدت أو الافتراضي
          activeCircleIcon = designSettings?.luckyCircleTier1 || null;
        }

        return (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center pointer-events-none p-4 animate-in zoom-in-75 duration-300">
            {activeCircleIcon ? (
              <div className="relative w-[410px] h-[410px] sm:w-[460px] sm:h-[460px] -translate-y-64 sm:-translate-y-72 flex flex-col items-center justify-center p-4 text-center overflow-hidden animate-depth-thrust select-none">
                {/* صورة أيقونة الدائرة المخصصة كخلفية دائرية عملاقة مكبرة جداً ومرفوعة عالياً فوق زر الكومبو */}
                <img 
                  src={activeCircleIcon} 
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_0_60px_rgba(234,179,8,0.95)]" 
                  alt="Lucky Win Circle" 
                />
                
                {/* محتوى نصوص الفوز بحجم ملموم ومصغر نسبة للدائرة لإبراز كامل جمال وتفاصيل الأيقونة */}
                <div className="relative z-10 flex flex-col items-center gap-0.5 max-w-[145px]">
                  <h3 className="text-white font-black text-[10px] tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
                    🎉 مبارك ربحت 🎉
                  </h3>
                  
                  <div className="flex items-center gap-1 bg-black/80 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-yellow-400/50 shadow-md my-0.5">
                    <i className="fas fa-coins text-yellow-300 text-[9.5px]"></i>
                    <span className="text-[11px] font-black text-yellow-200 font-mono tracking-wide">
                      +{luckyWinInfo.coins.toLocaleString('en-US')} كوينز
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[7.5px] font-black text-black bg-yellow-300 px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                      مضاعف x{luckyWinInfo.multiplier}{luckyWinInfo.quantity && luckyWinInfo.quantity > 1 ? ` (${luckyWinInfo.quantity}X)` : ''}
                    </span>
                    <span className="text-[8px] font-bold text-white truncate max-w-[80px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {luckyWinInfo.giftName}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-[380px] h-[380px] sm:w-[420px] sm:h-[420px] -translate-y-64 sm:-translate-y-72 rounded-full bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 border-2 border-yellow-200/80 shadow-2xl flex flex-col items-center justify-center p-4 text-center overflow-hidden animate-depth-thrust">
                {/* بدون أيقونة التاج وبحجم كبير مريح ومرفوع عالياً للأعلى */}
                <div className="relative z-10 flex flex-col items-center gap-0.5 max-w-[145px]">
                  <h3 className="text-white font-black text-[10px] tracking-tight drop-shadow-md">
                    🎉 مبارك ربحت 🎉
                  </h3>
                  
                  <div className="flex items-center gap-1 bg-black/70 px-2.5 py-0.5 rounded-full border border-yellow-400/40 my-0.5 shadow-md">
                    <i className="fas fa-coins text-yellow-300 text-[9.5px]"></i>
                    <span className="text-[11px] font-black text-yellow-200 font-mono tracking-wide">
                      +{luckyWinInfo.coins.toLocaleString('en-US')} كوينز
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[7.5px] font-black text-black/90 bg-yellow-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                      مضاعف x{luckyWinInfo.multiplier}{luckyWinInfo.quantity && luckyWinInfo.quantity > 1 ? ` (${luckyWinInfo.quantity}X)` : ''}
                    </span>
                    <span className="text-[8px] font-bold text-white truncate max-w-[80px] drop-shadow-sm">
                      {luckyWinInfo.giftName}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* زر الـ COMBO الدائري أسفل منتصف الغرفة لإعادة الرمي مباشرة */}
      {comboActive && (
        <div 
          onClick={handleComboClick}
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[950] flex items-center justify-center cursor-pointer select-none transition-all duration-100 ease-out active:scale-90 active:translate-y-0.5 active:brightness-110 ${comboPressEffect ? 'scale-90 translate-y-0.5 brightness-110' : 'hover:scale-105'} animate-in zoom-in-75 duration-200`}
          title="COMBO - انقر لإعادة الرمي فوراً"
        >
          <div className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center">
            {/* SVG Progress Circle for countdown in solid vivid purple */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 72 72">
              <circle
                cx="36"
                cy="36"
                r="34"
                className="stroke-purple-950/70"
                strokeWidth="4"
                fill="none"
              />
              <circle
                cx="36"
                cy="36"
                r="34"
                stroke="#a855f7"
                className="transition-all duration-75"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
                strokeDasharray="213.6"
                strokeDashoffset={213.6 - (213.6 * comboProgress) / 100}
              />
            </svg>

            {/* Inner Core Button: Custom Icon or App Theme Colors */}
            {designSettings?.comboButtonIcon ? (
              <div className="w-[64px] h-[64px] rounded-full flex flex-col items-center justify-center relative overflow-hidden select-none shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                <img 
                  src={designSettings.comboButtonIcon} 
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" 
                  alt="Combo" 
                />
                {/* طبقة تظليل خفيفة لضمان وضوح كلمة COMBO والشارة فوق أي خلفية */}
                <div className="absolute inset-0 bg-black/25 pointer-events-none"></div>

                <span className="relative z-10 text-[11px] font-black text-white tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] leading-none uppercase">
                  COMBO
                </span>
                <div className="relative z-10 mt-0.5 h-[16px] min-w-[16px] px-1 bg-black/80 backdrop-blur-xs rounded-full border border-purple-300/40 flex items-center justify-center shadow-sm">
                  <span className="text-[8.5px] font-black text-purple-200 leading-none font-mono">
                    x{comboCount}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-[64px] h-[64px] rounded-full bg-gradient-to-tr from-purple-700 via-fuchsia-600 to-pink-500 border border-fuchsia-200/90 shadow-[0_0_25px_rgba(168,85,247,0.7)] flex flex-col items-center justify-center text-center select-none">
                <span className="text-xs font-black text-white tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] leading-none">
                  COMBO
                </span>
                <div className="mt-0.5 h-[16px] min-w-[16px] px-1 bg-black/70 rounded-full border border-fuchsia-300/40 flex items-center justify-center">
                  <span className="text-[8.5px] font-black text-fuchsia-200 leading-none font-mono">
                    x{comboCount}
                  </span>
                </div>
              </div>
            )}

            {/* Pulsing ring on active */}
            <div className="absolute -inset-1 rounded-full border border-purple-500/40 animate-ping pointer-events-none opacity-40"></div>
          </div>
        </div>
      )}

      <style>{`
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); } 
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } 
        .scrollbar-hide::-webkit-scrollbar { display: none; }

        @keyframes depthThrust {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.18); }
          100% { transform: scale(0.8); }
        }
        .animate-depth-thrust {
          animation: depthThrust 0.75s ease-in-out infinite;
        }
        
        @keyframes marquee-infinite {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-infinite {
          display: flex;
          width: fit-content;
          animation: marquee-infinite 6s linear infinite;
        }
      `}</style>
    </div>
  );
};
