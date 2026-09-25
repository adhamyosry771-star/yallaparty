
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Room } from '../types';
import { db } from '../firebase';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;
  return url.match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('video');
};

interface RoomCardProps {
  room: Room;
  design: any;
  onClick: (room: Room) => void;
  frameUrl?: string;
}

export const RoomCard: React.FC<RoomCardProps> = ({ room, design, onClick, frameUrl }) => {
  const [ownerData, setOwnerData] = useState<any>(room.owner);

  useEffect(() => {
    // Listen to real-time updates for the owner profile
    const ownerId = room.owner?.id || (room.owner as any)?.uid;
    if (!ownerId) return;

    const unsub = onSnapshot(doc(db, "users", ownerId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setOwnerData({
          id: snapshot.id,
          name: data.displayName || data.name || room.owner.name,
          avatar: data.photoURL || data.avatar || room.owner.avatar,
          animatedAvatar: data.animatedAvatar || null,
        });
      }
    });

    return () => unsub();
  }, [room.owner?.id, (room.owner as any)?.uid]);

  return (
    <div 
      onClick={() => onClick(room)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      className="relative rounded-3xl cursor-default bg-[#0d051a] aspect-[1/1.1] transform-gpu select-none"
    >
      {/* Container for image and overlays to prevent border-radius clipping/blur bugs */}
      <div 
        className="absolute inset-0 rounded-3xl overflow-hidden transform-gpu isolate"
        style={{
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          maskImage: 'radial-gradient(white, black)',
        }}
      >
        {/* صورة الروم تملأ المربع بالكامل */}
        <img 
          src={room.coverImage} 
          alt={room.title} 
          draggable={false}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none ${room.isLocked ? 'blur-[0.6px]' : ''}`} 
        />
        
        {/* Lock Overlay */}
        {room.isLocked && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="w-[39px] h-[39px] rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-2xl -translate-y-2.5">
              <i className="fas fa-lock text-[15px]"></i>
            </div>
          </div>
        )}

        {/* تدرج لوني لجعل النصوص واضحة */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent ${room.isLocked ? 'backdrop-blur-[0.5px]' : ''}`}></div>
      </div>
      
      {/* بيانات الغرفة في الأسفل */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-1.5 z-10">
        <h3 className="font-black text-[13px] text-white leading-tight truncate drop-shadow-xl">
          {room.title}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full border border-white/20 overflow-hidden shadow-lg bg-black/20 pointer-events-none select-none">
              {ownerData.animatedAvatar ? (
                isVideoUrl(ownerData.animatedAvatar) ? (
                  <video src={ownerData.animatedAvatar} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={ownerData.animatedAvatar} draggable={false} className="w-full h-full object-cover pointer-events-none select-none" />
                )
              ) : (
                <img src={ownerData.avatar} draggable={false} className="w-full h-full object-cover pointer-events-none select-none" />
              )}
            </div>
            <span className="text-[10px] text-white/90 font-bold truncate opacity-95">
              {ownerData.name}
            </span>
          </div>
          {/* عرض أيقونة الموجات مباشرة بدون تأخير */}
          <div className="flex items-center justify-center p-1 rounded-lg bg-black/20 backdrop-blur-sm">
            {design?.waveRoomIcon ? (
              <motion.img 
                src={design.waveRoomIcon} 
                className="w-4 h-4 object-contain pointer-events-none select-none" 
                alt="wave" 
                draggable={false}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              />
            ) : (
              <i className="fas fa-volume-up text-[10px] text-purple-400"></i>
            )}
          </div>
        </div>
      </div>

      {frameUrl && !room.isSecretClub && (
        <img 
          src={frameUrl} 
          className="absolute -inset-[6px] w-[calc(100%+12px)] h-[calc(100%+12px)] max-w-none object-fill pointer-events-none select-none z-30" 
          alt="Room Frame" 
          draggable={false}
        />
      )}
    </div>
  );
};

const SafeImage: React.FC<{ src: string; className?: string; alt?: string; fallback: React.ReactNode }> = ({ src, className, alt, fallback }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [src]);

  if (error) return <>{fallback}</>;

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 border border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 shadow-xl`}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </div>
  );
};
