import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../LanguageContext';
import { 
  collection, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  getDoc, 
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface MessagesPageProps {
  db: any;
  user: any;
  currentUserData: any;
  defaultImages?: any;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({ db, user, currentUserData, defaultImages }) => {
  const { language, t } = useLanguage();
  
  // Real-time Follow Requests & Chat data
  const [requests, setRequests] = useState<any[]>([]);
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [otherUsersData, setOtherUsersData] = useState<{ [uid: string]: any }>({});
  
  // UX State
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Listen for follow requests received by the user
  useEffect(() => {
    if (!db || !user?.uid) return;
    const reqsRef = collection(db, "users", user.uid, "followRequests");
    const q = query(reqsRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRequests(list);
    }, (err) => {
      console.error("Error fetching follow requests:", err);
    });
    return () => unsub();
  }, [db, user?.uid]);

  // 2. Listen for active chats containing the user
  useEffect(() => {
    if (!db || !user?.uid) return;
    const chatsRef = collection(db, "privateChats");
    const q = query(chatsRef, where("participants", "array-contains", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort in memory by lastTimestamp desc to survive without compound index
      list.sort((a, b) => {
        const t1 = a.lastTimestamp?.seconds || 0;
        const t2 = b.lastTimestamp?.seconds || 0;
        return t2 - t1;
      });
      setActiveChats(list);
    }, (err) => {
      console.error("Error fetching private chats:", err);
    });
    return () => unsub();
  }, [db, user?.uid]);

  // 3. Listen to users profile info of chat partners in real-time
  useEffect(() => {
    if (!db || activeChats.length === 0 || !user?.uid) return;
    const unsubs: any[] = [];
    activeChats.forEach(chat => {
      const otherUid = chat.participants?.find((p: string) => p !== user.uid);
      if (otherUid && !otherUsersData[otherUid]) {
        const unsubUser = onSnapshot(doc(db, "users", otherUid), (snapshot) => {
          if (snapshot.exists()) {
            setOtherUsersData(prev => ({ ...prev, [otherUid]: snapshot.data() }));
          }
        });
        unsubs.push(unsubUser);
      }
    });
    return () => unsubs.forEach(unsub => unsub());
  }, [db, activeChats, user?.uid]);

  // Listen to users profile info of follow request senders in real-time
  useEffect(() => {
    if (!db || requests.length === 0) return;
    const unsubs: any[] = [];
    requests.forEach(req => {
      const senderUid = req.id || req.uid;
      if (senderUid && !otherUsersData[senderUid]) {
        const unsubUser = onSnapshot(doc(db, "users", senderUid), (snapshot) => {
          if (snapshot.exists()) {
            setOtherUsersData(prev => ({ ...prev, [senderUid]: snapshot.data() }));
          }
        });
        unsubs.push(unsubUser);
      }
    });
    return () => unsubs.forEach(unsub => unsub());
  }, [db, requests]);

  // 4. Listen for chat messages when a chat is opened
  useEffect(() => {
    if (!db || !activeChatId) {
      setMessages([]);
      return;
    }
    const msgsRef = collection(db, "privateChats", activeChatId, "messages");
    const q = query(msgsRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMessages(list);
      // Scroll to bottom
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (err) => {
      console.error("Error fetching messages:", err);
    });
    return () => unsub();
  }, [db, activeChatId]);

  // Update read status when opening a chat
  useEffect(() => {
    if (!db || !activeChatId || !user?.uid) return;
    const markAsRead = async () => {
      try {
        await updateDoc(doc(db, "privateChats", activeChatId), {
          [`unread_${user.uid}`]: 0
        });
      } catch (err) {
        console.error("Error updating unread count:", err);
      }
    };
    markAsRead();
  }, [db, activeChatId, user?.uid]);

  // Auto open private chat trigger (e.g., from room profile comment message buttons)
  useEffect(() => {
    if (!db || !user?.uid) return;
    
    const handleAutoOpen = async (targetUid: string) => {
      const chatId = targetUid < user.uid ? `${targetUid}_${user.uid}` : `${user.uid}_${targetUid}`;
      
      try {
        const chatDocRef = doc(db, "privateChats", chatId);
        const chatSnap = await getDoc(chatDocRef);
        
        if (!chatSnap.exists()) {
          const welcomeMsg = t("مرحباً بك! هيا بنا لندردش.", "Hello! Let's chat.");
          await setDoc(chatDocRef, {
            participants: [user.uid, targetUid],
            lastMessage: welcomeMsg,
            lastSender: user.uid,
            lastTimestamp: serverTimestamp(),
            [`unread_${targetUid}`]: 0,
            [`unread_${user.uid}`]: 0
          }, { merge: true });
          
          await addDoc(collection(db, "privateChats", chatId, "messages"), {
            senderId: user.uid,
            text: welcomeMsg,
            createdAt: serverTimestamp()
          });
        }
        
        setActiveChatId(chatId);
        setShowRequestsPanel(false);
      } catch (err) {
        console.error("Error auto-opening chat:", err);
      }
    };

    const target = localStorage.getItem("autoOpenChatWith");
    if (target) {
      localStorage.removeItem("autoOpenChatWith");
      handleAutoOpen(target);
    }

    const listener = (e: any) => {
      if (e.detail) {
        handleAutoOpen(e.detail);
      }
    };
    window.addEventListener("triggerAutoOpenChat", listener);
    return () => window.removeEventListener("triggerAutoOpenChat", listener);
  }, [db, user?.uid]);

  // Accept follow request logic - highly resilient to database security permission constraints
  const handleAcceptRequest = async (request: any) => {
    if (!db || !user?.uid) return;
    const senderUid = request.uid || request.id;
    if (!senderUid) {
      alert(t("فشل تحديد معرف المستخدم", "Failed to identify user ID"));
      return;
    }
    
    try {
      // 1. Create a unique, deterministic chatId
      const chatId = senderUid < user.uid ? `${senderUid}_${user.uid}` : `${user.uid}_${senderUid}`;
      
      // 2. Send the automated message and create/merge private chat record
      const automatedText = t(
        "لقد قبلت طلب المتابعة الخاص بك، هيا بنا لندردش!", 
        "I have accepted your follow request, let's chat!"
      );
      
      await setDoc(doc(db, "privateChats", chatId), {
        participants: [user.uid, senderUid],
        lastMessage: automatedText,
        lastSender: user.uid,
        lastTimestamp: serverTimestamp(),
        [`unread_${senderUid}`]: 1,
        [`unread_${user.uid}`]: 0
      }, { merge: true });
      
      await addDoc(collection(db, "privateChats", chatId, "messages"), {
        senderId: user.uid,
        text: automatedText,
        createdAt: serverTimestamp()
      });
      
      // 3. Delete the pending request in current user's followRequests subcollection
      try {
        await deleteDoc(doc(db, "users", user.uid, "followRequests", senderUid));
      } catch (err) {
        console.warn("Could not delete follow request object:", err);
      }
      
      // 4. Update local user profile fields (following, followers, friends)
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          following: arrayUnion(senderUid),
          followers: arrayUnion(senderUid),
          friends: arrayUnion(senderUid)
        });
      } catch (err) {
        console.warn("Could not write to local user record with updateDoc:", err);
        try {
          const userRef = doc(db, "users", user.uid);
          await setDoc(userRef, {
            following: arrayUnion(senderUid),
            followers: arrayUnion(senderUid),
            friends: arrayUnion(senderUid)
          }, { merge: true });
        } catch (setErr) {
          console.error("Secondary fallback for local user node failed:", setErr);
        }
      }
      
      // 5. Update sender profile fields (safely wrapped in case write access is blocked by rules)
      try {
        const senderRef = doc(db, "users", senderUid);
        await updateDoc(senderRef, {
          following: arrayUnion(user.uid),
          followers: arrayUnion(user.uid),
          friends: arrayUnion(user.uid)
        });
      } catch (err) {
        console.warn("Could not write to sender user record under security rules (this is expected):", err);
        try {
          const senderRef = doc(db, "users", senderUid);
          await setDoc(senderRef, {
            following: arrayUnion(user.uid),
            followers: arrayUnion(user.uid),
            friends: arrayUnion(user.uid)
          }, { merge: true });
        } catch (setErr) {
          console.warn("Secondary fallback for sender node failed:", setErr);
        }
      }
      
      // 6. Open chat and close requests panel
      setActiveChatId(chatId);
      setShowRequestsPanel(false);
    } catch (err) {
      console.error("Error accepting request:", err);
      // Since we made everything resilient, if we end up here, there's a serious core issue
      alert(t("حدث خطأ أثناء قبول الطلب", "An error occurred while accepting request"));
    }
  };

  // Reject/Decline follow request
  const handleRejectRequest = async (request: any) => {
    if (!db || !user?.uid) return;
    const senderUid = request.uid;
    try {
      await deleteDoc(doc(db, "users", user.uid, "followRequests", senderUid));
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  };

  // Send private text message - extremely robust with no asynchronous blockages and fallback write merging
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!db || !activeChatId || !inputText.trim() || !user?.uid) return;
    
    const textToSend = inputText.trim();
    setInputText("");
    
    try {
      // 1. Immediately extract other user's UID from the deterministic chatId string to optimize speed
      const parts = activeChatId.split('_');
      const otherUid = parts.find(p => p !== user.uid) || "";
      
      // 2. Write summary using setDoc with merge: true FIRST so that parent privateChat document and "participants" exist before message is added
      const chatDocRef = doc(db, "privateChats", activeChatId);
      const updateData: any = {
        participants: [user.uid, otherUid].filter(Boolean),
        lastMessage: textToSend,
        lastSender: user.uid,
        lastTimestamp: serverTimestamp()
      };
      if (otherUid) {
        updateData[`unread_${otherUid}`] = 1;
      }
      
      await setDoc(chatDocRef, updateData, { merge: true });

      // 3. Safely add the message document to the messages subcollection afterparent document existence is guaranteed
      await addDoc(collection(db, "privateChats", activeChatId, "messages"), {
        senderId: user.uid,
        text: textToSend,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Format timestamp helper
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    // Force English numerals for the timestamp
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#1a0b2e] relative select-none">
      {/* 1. Main conversations list screen */}
      {!activeChatId && !showRequestsPanel && (
        <div className="flex-1 overflow-y-auto pb-20">
          <div className="p-6 pb-2">
            <h2 className={`text-2xl font-black text-white tracking-tight ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              {t("الرسائل", "Messages")}
            </h2>
            
            {/* Horizontal Story circles - Modified to write "قريباً" on every circle as requested */}
            <div className="flex gap-5 mt-8 overflow-x-auto pb-4 scrollbar-hide flex-row-reverse" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="flex flex-col items-center gap-2 flex-shrink-0 relative group">
                  <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 p-1 bg-purple-950/40 shadow-xl flex items-center justify-center relative backdrop-blur-sm animate-pulse-slow">
                    <div className="w-full h-full rounded-full bg-[#2d1252]/50 flex items-center justify-center">
                      <i className="fas fa-lock text-purple-400 text-[10px] opacity-40"></i>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20 shadow-sm">
                    {t("قريباً", "Soon")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 px-6 space-y-3">
            {/* Real Follow Requests button item - styled strictly with left text/icon alignment and right badge */}
            <div 
              onClick={() => setShowRequestsPanel(true)} 
              className="flex items-center justify-between gap-4 py-3.5 px-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer shadow-xl active:scale-[0.98] flex-row text-left"
            >
              <div className="flex items-center gap-3">
                <i className="fas fa-user-plus text-purple-400 text-sm flex-shrink-0"></i>
                <div className="flex flex-col items-start text-left">
                  <span className="font-extrabold text-[13px] text-white tracking-tight leading-tight">
                    {t("طلبات المتابعة", "Follow Requests")}
                  </span>
                  <p className="text-[11px] font-bold text-purple-300/60 mt-1 truncate">
                    {requests.length > 0 
                      ? `${t("لديك", "You have")} ${requests.length} ${t("طلب متابعة جديد", "new follow requests")}` 
                      : t("لا توجد طلبات معلقة حالياً", "No pending requests currently")
                    }
                  </p>
                </div>
              </div>

              {/* Action/Notification Badge on the far right */}
              {requests.length > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                  {requests.length}
                </span>
              )}
            </div>

            {/* Private Active Chats List */}
            {activeChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <i className="fas fa-comments text-5xl text-purple-400/40 mb-4 animate-bounce-slow"></i>
                <span className="text-xs font-black text-purple-300">{t("لا توجد محادثات نشطة", "No active conversations")}</span>
              </div>
            ) : (
              activeChats.map(chat => {
                const otherUid = chat.participants?.find((p: string) => p !== user.uid);
                const otherUser = otherUsersData[otherUid] || {};
                const unread = chat[`unread_${user.uid}`] || 0;
                
                return (
                  <div 
                    key={chat.id} 
                    onClick={() => setActiveChatId(chat.id)}
                    className="flex items-center gap-4 py-3.5 px-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer shadow-xl active:scale-[0.98] flex-row text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <img 
                        src={otherUser.animatedAvatar || otherUser.photoURL || defaultImages?.profileImage || ""} 
                        className="w-10 h-10 rounded-full object-cover shadow-2xl border border-white/10" 
                        alt="" 
                      />
                      {otherUser.isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#1a0b2e] rounded-full"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 px-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-extrabold text-[13px] text-white tracking-tight">
                          {otherUser.displayName || t("مستخدم", "User")}
                        </span>
                        <span className="text-[8px] font-black text-purple-400/50 uppercase tracking-tighter">
                          {formatTime(chat.lastTimestamp)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={`text-[11px] font-bold text-purple-300/60 truncate max-w-[190px] ${unread > 0 ? 'text-white font-extrabold opacity-100' : ''}`}>
                          {chat.lastMessage}
                        </p>
                        {unread > 0 && (
                          <span className="bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. Slide over panel: Follow Requests List */}
      {showRequestsPanel && (
        <div className="absolute inset-0 z-50 bg-[#1a0b2e] flex flex-col p-6 overflow-hidden animate-in slide-in-from-right duration-300">
          <div className={`flex items-center justify-between pb-4 border-b border-white/5 ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}>
            <button 
              onClick={() => setShowRequestsPanel(false)}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <i className={`fas ${language === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left'}`}></i>
            </button>
            <h3 className="text-md font-black text-white">{t("طلبات المتابعة", "Follow Requests")}</h3>
            <div className="w-10 h-10 opacity-0"></div>
          </div>

          <div className="flex-1 overflow-y-auto mt-6 space-y-4">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30 h-full">
                <i className="fas fa-user-plus text-5xl text-pink-400 mb-4"></i>
                <span className="text-xs font-black text-purple-300">{t("لا توجد طلبات معلقة", "No pending requests")}</span>
              </div>
            ) : (
              requests.map((req) => {
                const reqSenderData = otherUsersData[req.id || req.uid] || {};
                const displayName = reqSenderData.displayName || req.displayName || t("مستخدم", "User");
                const avatarUrl = reqSenderData.animatedAvatar || reqSenderData.photoURL || req.animatedAvatar || req.photoURL || defaultImages?.profileImage || "";

                return (
                  <div 
                    key={req.id} 
                    className="p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-4 justify-between flex-row text-left"
                  >
                    <div className="flex items-center gap-3 flex-row text-left">
                      <img src={avatarUrl} className="w-12 h-12 rounded-2xl object-cover border border-white/10" alt="" />
                      <div className="text-left">
                        <span className="font-extrabold text-xs text-white block">{displayName}</span>
                        <span className="text-[9px] font-bold text-purple-400/40">{t("يريد متابعتك", "wants to follow you")}</span>
                      </div>
                    </div>
                    
                    {/* Accept (✓) and Reject (✗) Actions */}
                    <div className="flex items-center gap-2">
                      {/* Accept Check */}
                      <button 
                        onClick={() => handleAcceptRequest(req)}
                        className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs shadow-md shadow-emerald-500/10 hover:bg-emerald-600 active:scale-90 transition-all"
                      >
                        <i className="fas fa-check font-black"></i>
                      </button>
                      {/* Decline Close */}
                      <button 
                        onClick={() => handleRejectRequest(req)}
                        className="w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center text-xs shadow-md shadow-red-500/10 hover:bg-red-600 active:scale-90 transition-all"
                      >
                        <i className="fas fa-times font-black"></i>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 3. Slide over panel: Interactive Private Chat Box */}
      {activeChatId && (
        <div className="fixed inset-0 z-[100] w-full h-full bg-[#160a27] flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
          {/* Chat Header */}
          {(() => {
            const chatObj = activeChats.find(c => c.id === activeChatId);
            const otherUid = chatObj?.participants?.find((p: string) => p !== user.uid);
            const otherUser = otherUsersData[otherUid || ''] || {};
            
            return (
              <div className="p-4 bg-[#0d051a]/95 border-b border-white/5 flex items-center justify-between relative flex-row">
                {/* User Info (Circular Avatar + Username next to it) */}
                <div className="flex items-center gap-3 flex-row text-left">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={otherUser.animatedAvatar || otherUser.photoURL || defaultImages?.profileImage || ""} 
                      className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-md" 
                      alt="" 
                    />
                    {otherUser.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0d051a] rounded-full"></span>
                    )}
                  </div>
                  <div className="h-10 flex items-center">
                    <span className="font-extrabold text-sm text-white block">{otherUser.displayName || t("مستخدم", "User")}</span>
                  </div>
                </div>

                {/* Navigation Back Button */}
                <button 
                  onClick={() => setActiveChatId(null)}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white active:scale-90 transition-transform flex-shrink-0"
                >
                  <i className={`fas ${language === 'ar' ? 'fa-arrow-right' : 'fa-arrow-left'}`}></i>
                </button>
              </div>
            );
          })()}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-20">
                <i className="fas fa-feather-alt text-4xl text-purple-400 mb-3 animate-pulse"></i>
                <span className="text-[10px] font-black text-purple-300 leading-none">{t("اكتب رسالة لبدء الدردشة", "Write a message to start chatting")}</span>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-3xl p-3 px-4 text-xs font-bold leading-relaxed shadow-lg backdrop-blur-md border ${isMe ? 'bg-white/5 border-white/10 text-white/90 rounded-br-sm' : 'bg-purple-600/20 text-white border-purple-500/30 rounded-bl-sm'}`}>
                      <p>{msg.text}</p>
                      <span className="text-[8px] font-black opacity-40 float-right mt-1.5 ml-1.5 tracking-tighter">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef}></div>
          </div>

          {/* Messages Input Box */}
          <form onSubmit={handleSendMessage} className="p-4 bg-[#0d051a]/95 border-t border-white/5 flex gap-3 items-center">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t("اكتب رسالة...", "Write a message...")}
              className={`flex-1 bg-white/5 border border-white/5 rounded-2xl py-3 px-4 text-xs font-bold text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-500/50 transition-all ${language === 'ar' ? 'text-right' : 'text-left'}`}
            />
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all"
            >
              <i className={`fas fa-paper-plane text-xs ${language === 'ar' ? 'transform rotate-180' : ''}`}></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
