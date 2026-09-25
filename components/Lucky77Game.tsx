import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { db, auth } from '../firebase';
import { 
  doc, getDoc, updateDoc, setDoc, addDoc, collection, 
  serverTimestamp, increment, deleteDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useLanguage } from '../LanguageContext';

interface Lucky77GameProps {
  onClose: () => void;
  userBalance: number;
  onUpdateBalance: (amount: number) => void;
}

// 9 segments for exact probability distribution:
// 4 x Watermelon (Pays x2)
// 4 x Plum (Pays x2)
// 1 x "Lucky 77" (Pays x8)
const WHEEL_SECTORS = [
  { id: 'lucky77', emoji: '🎰', color: '#f59e0b', isWin77: true, multiplier: 8, name: 'Lucky 77', enName: 'Lucky 77' },
  { id: 'watermelon', emoji: '🍉', color: '#10b981', isWin77: false, multiplier: 2, name: 'بطيخ', enName: 'Watermelon' },
  { id: 'plum', emoji: '🍇', color: '#8b5cf6', isWin77: false, multiplier: 2, name: 'برقوق', enName: 'Plum' },
  { id: 'watermelon', emoji: '🍉', color: '#10b981', isWin77: false, multiplier: 2, name: 'بطيخ', enName: 'Watermelon' },
  { id: 'plum', emoji: '🍇', color: '#8b5cf6', isWin77: false, multiplier: 2, name: 'برقوق', enName: 'Plum' },
  { id: 'watermelon', emoji: '🍉', color: '#10b981', isWin77: false, multiplier: 2, name: 'بطيخ', enName: 'Watermelon' },
  { id: 'plum', emoji: '🍇', color: '#8b5cf6', isWin77: false, multiplier: 2, name: 'برقوق', enName: 'Plum' },
  { id: 'watermelon', emoji: '🍉', color: '#10b981', isWin77: false, multiplier: 2, name: 'بطيخ', enName: 'Watermelon' },
  { id: 'plum', emoji: '🍇', color: '#8b5cf6', isWin77: false, multiplier: 2, name: 'برقوق', enName: 'Plum' },
];

const CHIPS_CONFIG = [
  { value: 1000, label: '1K', colors: 'from-pink-500 via-rose-600 to-pink-800', border: 'border-pink-300/40 text-pink-100', textShadow: 'shadow-pink-500/50' },
  { value: 10000, label: '10K', colors: 'from-amber-400 via-yellow-500 to-amber-700', border: 'border-yellow-200/50 text-amber-500 shadow-amber-500/50' },
  { value: 100000, label: '100K', colors: 'from-emerald-400 via-green-600 to-green-800', border: 'border-emerald-300/40 text-emerald-100' },
  { value: 500000, label: '500K', colors: 'from-cyan-400 via-blue-600 to-blue-800', border: 'border-cyan-300/40 text-cyan-100' }
];

// Module-level shared AudioContext for ultra-responsive sound effects with absolutely zero lag
let sharedSfxCtx: AudioContext | null = null;
const getSharedSfxCtx = () => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedSfxCtx) {
      sharedSfxCtx = new AudioContextClass();
    }
    if (sharedSfxCtx.state === 'suspended') {
      sharedSfxCtx.resume().catch(() => {});
    }
    return sharedSfxCtx;
  } catch (err) {
    console.warn("Shared AudioContext creation failed", err);
    return null;
  }
};

export const Lucky77Game: React.FC<Lucky77GameProps> = ({ onClose, userBalance, onUpdateBalance }) => {
  const { language, t } = useLanguage();
  const [gameState, setGameState] = useState<'betting' | 'spinning' | 'result'>('betting');
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedChip, setSelectedChip] = useState(1000);

  // Real-time local balance tracking to completely prevent click spamming/race condition and negative balances
  const [localBalance, setLocalBalance] = useState(userBalance);
  const localBalanceRef = useRef(userBalance);

  useEffect(() => {
    localBalanceRef.current = userBalance;
    setLocalBalance(userBalance);
  }, [userBalance]);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('lucky77_muted') === 'true';
  });
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [bets, setBets] = useState<Record<string, number>>({
    watermelon: 0,
    lucky77: 0,
    plum: 0,
  });
  const [previousBets, setPreviousBets] = useState<Record<string, number>>({
    watermelon: 0,
    lucky77: 0,
    plum: 0,
  });

  // Wheel Visual Rotation
  const [wheelRotation, setWheelRotation] = useState(0);
  const [winningSectorIdx, setWinningSectorIdx] = useState<number | null>(null);
  const [winAmount, setWinAmount] = useState<number>(0);
  const [history, setHistory] = useState<string[]>([]);

  // Admin and Luck Synchronization
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const userStatsRef = useRef<any>(null);
  const [lucky77ActiveBetId, setLucky77ActiveBetId] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Premium Synthesized Web Audio engine to play rich audio signals without loading external assets
  const playSfx = (type: 'chip' | 'tick' | 'win' | 'lose' | 'modal' | 'warn' | 'clear') => {
    if (isMuted) return;
    try {
      const ctx = getSharedSfxCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === 'chip') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); 
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08); 
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'tick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.04);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'clear') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
      } else if (type === 'modal') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(659.25, now + 0.06);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'warn') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(0.20, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'win') {
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; 
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.18, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.08 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.3);
        });
      } else if (type === 'lose') {
        const notes = [293.66, 220, 146.83]; 
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          gain.gain.setValueAtTime(0.12, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.002, now + idx * 0.12 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.25);
        });
      }
    } catch (e) {
      console.warn("WebAudio context play failed", e);
    }
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('lucky77_muted', String(next));
      return next;
    });
    playSfx('modal');
  };

  // Sync Global Settings & User Admin Statistics
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "lucky77Game"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalSettings(data);
        if (data && Array.isArray(data.history)) {
          setHistory(data.history);
        } else {
          setHistory([]);
        }
      }
    });

    let unsubStats: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubStats) {
        unsubStats();
        unsubStats = null;
      }
      if (user) {
        unsubStats = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserStats(data);
            userStatsRef.current = data;
          }
        });
      } else {
        setUserStats(null);
        userStatsRef.current = null;
      }
    });

    return () => {
      unsubSettings();
      unsubAuth();
      if (unsubStats) unsubStats();
    };
  }, []);

  // Cleanup active bet registry component cleanup
  useEffect(() => {
    return () => {
      if (lucky77ActiveBetId) {
        deleteDoc(doc(db, "lucky77ActiveBets", lucky77ActiveBetId)).catch(() => {});
      }
    };
  }, [lucky77ActiveBetId]);

  // Soothing synthesized ambient game music loop in the background
  useEffect(() => {
    if (isMuted) return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    let ctx: AudioContext | null = null;
    let musicInterval: any = null;
    let step = 0;

    // Soft Game Harp / Music box sequence 
    // Beautiful pentatonic relaxing melody in Eb Major / Ab Lydian
    const chords = [
      [233.08, 293.66, 349.23, 466.16], // Bb Maj
      [261.63, 311.13, 392.00, 523.25], // C min
      [233.08, 293.66, 349.23, 466.16], // Bb Maj
      [207.65, 261.63, 311.13, 415.30], // Ab Maj
    ];

    const melody = [
      // Bb chord tones pricked
      233.08, 349.23, 466.16, 349.23,
      // C min chord tones
      261.63, 392.00, 523.25, 392.00,
      // Bb chord tones
      233.08, 349.23, 466.16, 349.23,
      // Ab Major chord tones
      207.65, 311.13, 415.30, 311.13,
      // Higher charming arpeggios
      466.16, 523.25, 587.33, 698.46,
      523.25, 587.33, 698.46, 783.99,
      698.46, 783.99, 932.33, 1046.50,
      783.99, 698.46, 587.33, 466.16
    ];

    const startMusic = () => {
      try {
        ctx = new AudioContext();
        
        musicInterval = setInterval(() => {
          if (!ctx || ctx.state === 'suspended') return;

          try {
            // Play a soft background bass/pad note once every 4 steps
            if (step % 4 === 0) {
              const chordIdx = Math.floor(step / 4) % chords.length;
              const bassNote = chords[chordIdx][0] / 2; // Low octave roots
              
              const oscBass = ctx.createOscillator();
              const gainBass = ctx.createGain();
              
              oscBass.type = 'sine';
              oscBass.frequency.setValueAtTime(bassNote, ctx.currentTime);
              
              // Substantial gentle bass swell
              gainBass.gain.setValueAtTime(0.06, ctx.currentTime);
              gainBass.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);
              
              oscBass.connect(gainBass);
              gainBass.connect(ctx.destination);
              
              oscBass.start();
              oscBass.stop(ctx.currentTime + 1.8);
            }

            // Play active cute melody plucks
            const freq = melody[step % melody.length];
            const oscMelody = ctx.createOscillator();
            const gainMelody = ctx.createGain();
            
            oscMelody.type = 'triangle';
            oscMelody.frequency.setValueAtTime(freq, ctx.currentTime);
            
            // Rich crystal music box sound
            gainMelody.gain.setValueAtTime(0.04, ctx.currentTime);
            gainMelody.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
            
            // Give it a subtle filter to stay soothing
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1800, ctx.currentTime);
            
            oscMelody.connect(filter);
            filter.connect(gainMelody);
            gainMelody.connect(ctx.destination);
            
            oscMelody.start();
            oscMelody.stop(ctx.currentTime + 0.8);

            step++;
          } catch (err) {
            // Context might close or suspend
          }
        }, 500); // Gentle 120bpm notes
      } catch (e) {
        console.warn("Game background music initializer failed:", e);
      }
    };

    // Auto trigger on mount
    startMusic();

    return () => {
      if (musicInterval) clearInterval(musicInterval);
      if (ctx) {
        ctx.close().catch(() => {});
      }
    };
  }, [isMuted]);

  // Handle countdown interval + Simulated Room betting spikes
  useEffect(() => {
    if (gameState === 'betting') {
      if (timeLeft > 0) {
        // Warn warning beep for last 3 seconds
        if (timeLeft <= 3) {
          playSfx('warn');
        }
        timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      } else {
        triggerWheelSpin();
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, gameState]);



  const triggerWheelSpin = () => {
    if (gameState !== 'betting') return;
    setGameState('spinning');

    // Rigging Outcome Calculation
    const pickWinningSector = () => {
      const candidates = WHEEL_SECTORS.map((_, i) => i);
      const user = auth.currentUser;
      const stats = userStatsRef.current;
      
      if (!user || !stats) {
        return Math.floor(Math.random() * WHEEL_SECTORS.length);
      }

      // Check for Admin Force Override
      const activeBetTypes = Object.keys(bets).filter(key => (bets[key] || 0) > 0);
      if (stats.lucky77ForcedWin && activeBetTypes.length > 0) {
        const winningIndices = WHEEL_SECTORS.map((sec, idx) => ({ sec, idx }))
          .filter(item => activeBetTypes.includes(item.sec.id))
          .map(item => item.idx);
        if (winningIndices.length > 0) {
          return winningIndices[Math.floor(Math.random() * winningIndices.length)];
        }
      }

      const luckPercent = stats.lucky77LuckPercent ?? 100;
      const lossThreshold = (globalSettings?.lossThreshold) ?? 8000000;
      const userProfit = (stats.lucky77TotalWin || 0) - (stats.lucky77TotalBet || 0);
      const isForcedLoss = stats.lucky77ForcedLoss || userProfit >= lossThreshold;
      const difficulty = globalSettings?.globalDifficulty || 'balanced';

      // Pure, unbiased random by default to ensure perfect casino randomness
      const isPureRandom = !stats.lucky77ForcedWin && !stats.lucky77ForcedLoss && (stats.lucky77LuckPercent === undefined || stats.lucky77LuckPercent === 100);
      if (isPureRandom) {
        return Math.floor(Math.random() * WHEEL_SECTORS.length);
      }

      const luckRoll = Math.floor(Math.random() * 100);
      const safeCandidates = candidates.filter(idx => {
        const sector = WHEEL_SECTORS[idx];
        const betAmt = bets[sector.id] || 0;
        const potentialPayout = betAmt * sector.multiplier;

        if (potentialPayout > 0) {
          if (isForcedLoss) return false;
          if (luckRoll > luckPercent) return false;
          if (difficulty === 'hard' && Math.random() > 0.4) return false;
        }
        return true;
      });

      const finalPool = safeCandidates.length > 0 ? safeCandidates : candidates;
      return finalPool[Math.floor(Math.random() * finalPool.length)];
    };

    const targetIndex = pickWinningSector();
    setWinningSectorIdx(targetIndex);

    // Calculate rotation angle
    const degPerSector = 360 / WHEEL_SECTORS.length;
    const targetSectorCenterAngle = targetIndex * degPerSector + (degPerSector / 2);
    // Align physical sector precisely under the top pointer (pointing down at 12 o'clock / 0 degrees)
    // We spin 8 full loops (360 * 8) minus the angle of the target sector center for realistic fast momentum
    const spinDegrees = (360 * 8) - targetSectorCenterAngle;
    setWheelRotation(spinDegrees);

    // Progressive ticking audio simulation matching speed deceleration rate over 5 seconds
    let elapsed = 0;
    let currentDelay = 20; 
    const stepTick = () => {
      playSfx('tick');
      elapsed += currentDelay;
      if (elapsed < 4800) {
        // Logarithmic deceleration to span exactly 5000ms with custom decay factors
        currentDelay = 20 + Math.pow(elapsed / 4800, 3) * 550;
        setTimeout(stepTick, currentDelay);
      }
    };
    setTimeout(stepTick, currentDelay);

    // Conclude spin after visual animation completes (exactly 5.0 seconds)
    setTimeout(() => {
      finalizeRound(targetIndex);
    }, 5000);
  };

  const finalizeRound = (winningIndex: number) => {
    setGameState('result');
    const winningSector = WHEEL_SECTORS[winningIndex];
    setHistory(prev => [winningSector.id, ...prev].slice(0, 15));

    // Payout logic
    const userBetOnWinner = bets[winningSector.id] || 0;
    const finalWinReward = userBetOnWinner * winningSector.multiplier;
    const totalPlacedBet = Object.values(bets).reduce((a, b) => a + b, 0);

    setWinAmount(finalWinReward);

    if (finalWinReward > 0) {
      onUpdateBalance(finalWinReward);
      playSfx('win');
    } else {
      if (totalPlacedBet > 0) {
        playSfx('lose');
      }
    }

    const currentHist = globalSettings?.history || [];
    const updatedHistory = [winningSector.id, ...currentHist].slice(0, 15);

    // Capture stats securely in Firestore
    (async () => {
      try {
        const profitDifference = totalPlacedBet - finalWinReward;
        await setDoc(doc(db, "settings", "lucky77Game"), {
          totalRounds: increment(1),
          totalProfit24h: increment(profitDifference),
          history: updatedHistory
        }, { merge: true });

        const user = auth.currentUser;
        if (user) {
          const statsPayload = {
            lucky77TotalBet: increment(totalPlacedBet),
            lucky77TotalWin: increment(finalWinReward),
            lucky77Rounds: increment(1)
          };
          await updateDoc(doc(db, "users", user.uid), statsPayload);

          // Cleanup active bet registry
          if (lucky77ActiveBetId) {
            await deleteDoc(doc(db, "lucky77ActiveBets", lucky77ActiveBetId));
            setLucky77ActiveBetId(null);
          }
        }
      } catch (err) {
        console.error("Failed to commit Lucky77 stats:", err);
      }
    })();

    setPreviousBets(bets);

    setTimeout(() => {
      setBets({ watermelon: 0, lucky77: 0, plum: 0 });
      setWinningSectorIdx(null);
      setWheelRotation(0);
      setWinAmount(0);
      
      setTimeLeft(15);
      setGameState('betting');
    }, 5000);
  };

  const handleClearBets = () => {
    if (gameState !== 'betting') return;
    const totalPlacedBet = Object.values(bets).reduce((a, b) => a + b, 0);
    if (totalPlacedBet === 0) return;

    localBalanceRef.current += totalPlacedBet;
    setLocalBalance(localBalanceRef.current);
    onUpdateBalance(totalPlacedBet);
    setBets({ watermelon: 0, lucky77: 0, plum: 0 });
    playSfx('clear');

    if (lucky77ActiveBetId) {
      deleteDoc(doc(db, "lucky77ActiveBets", lucky77ActiveBetId)).catch(() => {});
      setLucky77ActiveBetId(null);
    }
  };

  const handlePlaceBet = async (betKey: string) => {
    if (gameState !== 'betting') return;
    if (localBalanceRef.current < selectedChip) {
      alert(t("رصيدك من الكوينزات غير كافٍ للمراهنة", "Your balance of coins is insufficient to place this bet"));
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    localBalanceRef.current -= selectedChip;
    setLocalBalance(localBalanceRef.current);
    onUpdateBalance(-selectedChip);
    setBets(prev => ({
      ...prev,
      [betKey]: (prev[betKey] || 0) + selectedChip
    }));
    playSfx('chip');

    // Register active bet log for administrators panel
    try {
      if (!lucky77ActiveBetId) {
        const activeBetRef = await addDoc(collection(db, "lucky77ActiveBets"), {
          userId: user.uid,
          userName: userStats?.displayName || "لاعب",
          gameMode: 'lucky77',
          watermelon: betKey === 'watermelon' ? selectedChip : 0,
          lucky77: betKey === 'lucky77' ? selectedChip : 0,
          plum: betKey === 'plum' ? selectedChip : 0,
          amount: selectedChip,
          createdAt: serverTimestamp()
        });
        setLucky77ActiveBetId(activeBetRef.id);
      } else {
        const updates: any = {};
        updates[betKey] = increment(selectedChip);
        updates.amount = increment(selectedChip);
        await updateDoc(doc(db, "lucky77ActiveBets", lucky77ActiveBetId), updates);
      }
    } catch (e) {
      console.error("Active bet log error:", e);
    }
  };

  const handleRepeatBet = () => {
    if (gameState !== 'betting') return;
    const previousTotal = Object.values(previousBets).reduce((a, b) => a + b, 0);
    
    if (previousTotal === 0) {
      alert(t("لا توجد مراهنات سابقة لتكرارها", "There is no previous bet layout to repeat"));
      return;
    }
    
    if (localBalanceRef.current < previousTotal) {
      alert(t("الرصيد غير كافٍ لتكرار المراهنات السابقة", "Your balance is insufficient to copy the previous bet"));
      return;
    }

    localBalanceRef.current -= previousTotal;
    setLocalBalance(localBalanceRef.current);
    onUpdateBalance(-previousTotal);
    setBets(previousBets);
    playSfx('chip');

    const user = auth.currentUser;
    if (user) {
      (async () => {
         try {
           if (lucky77ActiveBetId) {
             await deleteDoc(doc(db, "lucky77ActiveBets", lucky77ActiveBetId));
           }
           const activeBetRef = await addDoc(collection(db, "lucky77ActiveBets"), {
             userId: user.uid,
             userName: userStats?.displayName || "لاعب",
             gameMode: 'lucky77',
             watermelon: previousBets.watermelon || 0,
             lucky77: previousBets.lucky77 || 0,
             plum: previousBets.plum || 0,
             amount: previousTotal,
             createdAt: serverTimestamp()
           });
           setLucky77ActiveBetId(activeBetRef.id);
         } catch (e) {}
      })();
    }
  };

  const formatAmount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const totalBetAmount = Object.values(bets).reduce((a, b) => a + b, 0);

  // SVG Helper: generate standard circular arc path for wheel segments
  const describeArcPath = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const startRad = (startAngle - 90) * Math.PI / 180.0;
    const endRad = (endAngle - 90) * Math.PI / 180.0;
    
    const x1 = x + radius * Math.cos(startRad);
    const y1 = y + radius * Math.sin(startRad);
    const x2 = x + radius * Math.cos(endRad);
    const y2 = y + radius * Math.sin(endRad);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", x, y,
      "L", x1, y1,
      "A", radius, radius, 0, largeArcFlag, 1, x2, y2,
      "Z"
    ].join(" ");
  };

  return (
    <div id="lucky77-game-overlay" className="fixed inset-0 z-[1000] flex flex-col justify-end animate-in fade-in duration-300 font-['Cairo']">
      
      {/* Immersive Deep backplate shadows */}
      <div 
        className="absolute inset-0 bg-black/25" 
        onClick={() => { if (totalBetAmount === 0 && gameState === 'betting') onClose(); }} 
      />

      {/* Main Luxury Casino Cabinet */}
      <div id="lucky77-game-container" className="relative w-full max-w-md mx-auto bg-[#170529]/80 border-t border-white/10 rounded-t-[2.5rem] shadow-[0_-15px_40px_rgba(0,0,0,0.9)] h-[90%] flex flex-col overflow-hidden text-right select-none" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        
        {/* Curtains style decorative visual bar */}
        <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-10" />

        {/* Sliding handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1 flex-shrink-0 z-20" />

        {/* Header Section */}
        <div className="px-5 py-3 flex items-center justify-between flex-shrink-0 z-20" dir="ltr">
          {/* Left side: App name (top) and user balance coins (bottom) */}
          <div className="flex flex-col items-start gap-1 select-none">
            <span className="text-[13px] font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-100 uppercase tracking-wider leading-none">
              Lucky 77
            </span>
            <div className="flex items-center gap-1.5 py-0.5">
              <i className="fas fa-coins text-[10px] text-yellow-500"></i>
              <span className="text-[12px] font-black text-yellow-400 font-sans tabular-nums leading-none">
                {localBalance.toLocaleString('en-US')}
              </span>
            </div>
          </div>

          {/* Right side close action: Transparent Circle Look */}
          <div className="flex items-center gap-2">
            {/* Premium Transparent Mute Button */}
            <button 
              id="lucky77-mute-btn"
              onClick={toggleMute} 
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/90 border border-white/10 shadow-sm cursor-pointer"
              title={isMuted ? t("تشغيل الصوت", "Unmute Audio") : t("كتم الصوت", "Mute Audio")}
            >
              <i className={`fas ${isMuted ? "fa-volume-mute" : "fa-volume-up"} text-xs text-center`}></i>
            </button>

            {/* Premium Transparent Exit Button */}
            <button 
              id="lucky77-close-btn"
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition-all border border-white/10 shadow-sm"
            >
              <i className="fas fa-times text-xs text-center"></i>
            </button>
          </div>
        </div>

        {/* Main interactive area content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1 flex flex-col items-center justify-between gap-3 scrollbar-hide z-10">
          
          {/* Section 1: Ornate Golden Steering Wheel */}
          <div className="relative w-full flex flex-col items-center justify-center h-[300px] flex-shrink-0 mt-1 select-none">
            
            {/* Removed purple backdrop light spill */}

            {/* Beautiful Steer-Wheel Ornate Outer Frame */}
            <div className="absolute w-[280px] h-[280px] rounded-full bg-gradient-to-tr from-[#9a7621] via-[#f7d070] to-[#5e450f] p-[5px] shadow-[0_8px_30px_rgba(0,0,0,0.7)] flex items-center justify-center z-10 ring-4 ring-[#140228]/80">
              
              {/* Glowing micro LEDs around the golden wheel frame */}
              {[...Array(16)].map((_, index) => (
                <div 
                  key={index}
                  className={`absolute w-2 h-2 rounded-full border border-black/30 transition-all duration-300
                    ${index % 2 === 0 ? "bg-amber-400" : "bg-transparent border-transparent"}
                  `}
                  style={{
                    transform: `rotate(${index * 22.5}deg) translateY(-134px)`,
                    zIndex: 25
                  }}
                />
              ))}

              {/* Spinning Inner Canvas */}
              <div
                id="lucky77-spinning-wheel"
                className="w-full h-full rounded-full bg-[#120427] overflow-hidden relative"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: gameState === 'spinning' ? 'transform 5.0s cubic-bezier(0.12, 0.95, 0.18, 1)' : 'none',
                  willChange: 'transform'
                }}
              >
                {/* SVG circular sectors */}
                <svg className="w-full h-full transform" viewBox="0 0 200 200">
                  <g>
                    {WHEEL_SECTORS.map((sector, idx) => {
                      const degRange = 360 / WHEEL_SECTORS.length;
                      const startAng = idx * degRange;
                      const endAng = startAng + degRange;
                      const dPath = describeArcPath(100, 100, 100, startAng, endAng);
                      
                      return (
                        <g key={idx}>
                          <path 
                            d={dPath} 
                            fill={sector.isWin77 ? 'url(#win77Grad)' : (idx % 2 === 0 ? '#1b0e36' : '#14082c')} 
                            stroke="#5a3d9944" 
                            strokeWidth="1"
                          />
                        </g>
                      );
                    })}
                  </g>
                  
                  {/* Neon Amber gradient def for Special 77 Segment */}
                  <defs>
                    <linearGradient id="win77Grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#cd1c84" />
                      <stop offset="50%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#fb7185" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Highly beautiful absolute rotated labels */}
                {WHEEL_SECTORS.map((sector, idx) => {
                  const degRange = 360 / WHEEL_SECTORS.length;
                  const middleAngle = idx * degRange + (degRange / 2);
                  const angleDistance = 76; 
                  
                  return (
                    <div 
                      key={idx}
                      className="absolute pb-1"
                      style={{
                        top: '50%',
                        left: '50%',
                        transform: `translate(-50%, -50%) rotate(${middleAngle}deg) translateY(-${angleDistance}px) rotate(-${middleAngle}deg)`,
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 20
                      }}
                    >
                      {sector.isWin77 ? (
                        <div className="flex flex-col items-center select-none active:scale-100 transition-all">
                          {/* Pulsing neon effect for '77' text */}
                          <span className="text-[19px] font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-tighter antialiased font-serif">77</span>
                          <span className="text-[7.5px] bg-yellow-400 text-purple-950 font-black px-1 rounded-full scale-90 -mt-0.5 tracking-tight">x8</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="text-[25px] transform hover:scale-110 duration-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">{sector.emoji}</span>
                          <span className="text-[7.5px] text-white/50 font-black -mt-0.5">x2</span>
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>

              {/* Royal Center Hub Shield - Static (does not rotate) */}
              <div className="absolute w-[76px] h-[76px] rounded-full bg-gradient-to-br from-[#f8d479] via-[#94711d] to-[#4c390a] p-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.6)] z-20 flex items-center justify-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-full h-full rounded-full bg-[#1c0836] flex flex-col items-center justify-center border border-yellow-400/20 shadow-inner">
                  {gameState === 'betting' ? (
                    <>
                      <span className="text-[8px] text-yellow-500 font-extrabold leading-none tracking-widest uppercase mb-1">{t("رهان", "BET")}</span>
                      <span className="text-[18px] font-black text-white tabular-nums tracking-normal leading-none">{timeLeft}</span>
                    </>
                  ) : gameState === 'spinning' ? (
                    <>
                      <span className="text-[8.5px] text-amber-400 font-black leading-none tracking-wide uppercase mb-1">{t("يدور", "SPIN")}</span>
                      <div className="w-3.5 h-3.5 rounded-full border border-yellow-400/35 border-t-yellow-400 animate-spin" />
                    </>
                  ) : (
                    <>
                      {winningSectorIdx !== null ? (
                        <div className="flex flex-col items-center justify-center select-none">
                          <span className="text-[18px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] leading-none mb-0.5">{WHEEL_SECTORS[winningSectorIdx].emoji}</span>
                          <span className="text-[7.5px] font-black text-amber-300 uppercase leading-none">{WHEEL_SECTORS[winningSectorIdx].id === 'lucky77' ? 'Lucky77' : 'X2'}</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-[8px] text-white/40 font-black leading-none tracking-widest uppercase mb-1">SPIN</span>
                          <span className="text-[14px] font-black text-amber-400 tracking-normal leading-none">0</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Premium Golden Pin Needle pin pointer at the top */}
            <div className="absolute top-[10px] z-[35] flex flex-col items-center justify-start pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]">
              {/* Pointer triangle pointing at the active segment */}
              <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-amber-400" />
            </div>
          </div>

          {/* Section 2: Glow-top Horizontal Glass Tube Ticker */}
          <div className="w-full flex-shrink-0 select-none mt-1">
            <div className="relative mx-auto max-w-[90%] bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl py-2 px-3 shadow-[inset_0_2px_5px_rgba(255,255,255,0.05),0_4px_10px_rgba(0,0,0,0.3)] flex items-center">
              
              {/* History Spheres - Stretched & Horizontally Scrollable without "NEW" Label */}
              <div className="w-full overflow-x-auto flex gap-2 items-center justify-start scrollbar-none [&::-webkit-scrollbar]:hidden py-1 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }}>
                {history.map((id, index) => {
                  const isLuck = id === 'lucky77';
                  return (
                    <div 
                      key={index}
                      className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[12px] relative shadow-[inset_-2px_-4px_8px_rgba(0,0,0,0.4),2px_3px_5px_rgba(0,0,0,0.3)] border transition-all duration-300 group hover:scale-110
                        ${isLuck 
                          ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-amber-300 border-yellow-300 ring-1 ring-yellow-400/40 text-yellow-101 font-bold scale-105' 
                          : (id === 'watermelon' 
                              ? 'bg-gradient-to-tr from-emerald-600 to-[#0c311c] border-emerald-500/20 text-white' 
                              : 'bg-gradient-to-tr from-violet-600 to-[#1d0e3a] border-violet-500/20 text-white')
                        }
                      `}
                    >
                      {/* High gloss spherical reflection shine */}
                      <div className="absolute top-0.5 right-1 w-2 h-1.5 bg-white/30 rounded-full filter blur-[0.2px] rotate-12" />
                      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-sans">{isLuck ? '77' : (id === 'watermelon' ? '🍉' : '🍇')}</span>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Section 3: Three Premium Podiums (Odds boards) */}
          <div className="w-full grid grid-cols-3 gap-2 flex-1 max-h-[145px] items-stretch select-none mt-1">
            
            {/* Watermelon x2 Card */}
            <div
              className={`border-[1.5px] rounded-3xl p-1.5 flex flex-col items-center justify-between relative shadow-lg hover:brightness-[1.15] active:scale-[0.98] transition-all cursor-pointer overflow-hidden
                ${gameState !== 'betting' ? 'opacity-[0.80] cursor-default' : ''}
                ${bets.watermelon > 0 
                  ? 'bg-emerald-500/10 border-emerald-400' 
                  : 'bg-[#180d2d]/70 border-emerald-500/10 hover:bg-[#1f103d]/70'
                }
              `}
              onClick={() => handlePlaceBet('watermelon')}
            >
              {/* Card Header total room bet simulated */}
              <div className="w-full flex items-center justify-center gap-0.5 text-[8.5px] font-black text-emerald-400 bg-emerald-500/10 py-1 rounded-t-2xl px-1 font-mono">
                <i className="fas fa-coins text-[7px]" />
                <span>{formatAmount(bets.watermelon)}</span>
              </div>

              {/* Emoji Content */}
              <div className="flex flex-col items-center justify-center py-1">
                <span className="text-3xl drop-shadow-md">🍉</span>
                <span className="text-[10px] font-black text-emerald-400 mt-1 uppercase tracking-wider bg-emerald-500/10 px-1.5 py-0.5 rounded-md leading-none">X2</span>
              </div>

              {/* Bottom active plate for user own bet */}
              <div className={`w-full text-center py-1 rounded-2xl text-[10.5px] font-black font-mono leading-none tracking-tight transition-all
                ${bets.watermelon > 0 ? 'bg-emerald-500 text-white shadow-inner shadow-black/20' : 'bg-black/30 text-white/30'}
              `}>
                {bets.watermelon > 0 ? formatAmount(bets.watermelon) : '0'}
              </div>
            </div>

            {/* Premium Gold Lucky 77 x8 Box */}
            <div
              className={`border-2 rounded-[22px] p-1.5 flex flex-col items-center justify-between relative shadow-2xl hover:brightness-[1.12] active:scale-[0.98] transition-all cursor-pointer overflow-hidden
                ${gameState !== 'betting' ? 'opacity-[0.80] cursor-default' : ''}
                ${bets.lucky77 > 0 
                  ? 'bg-gradient-to-b from-amber-500/15 to-pink-500/15 border-amber-400' 
                  : 'bg-gradient-to-b from-[#ffcf49]/10 to-pink-600/10 border-amber-500/10 hover:from-[#ffcf49]/15'
                }
              `}
              onClick={() => handlePlaceBet('lucky77')}
            >
              {/* Card Header total active bet */}
              <div className="w-full flex items-center justify-center gap-0.5 text-[8.5px] font-black text-yellow-400 bg-yellow-500/10 py-1 rounded-t-2xl px-1 font-mono">
                <span>{formatAmount(bets.lucky77)}</span>
              </div>

              {/* Slot logo text */}
              <div className="flex flex-col items-center justify-center pt-1.5 pb-0.5">
                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-serif italic py-0.5 leading-none">77</span>
                <span className="text-[10px] font-black text-amber-300 mt-1 uppercase tracking-wider bg-amber-500/15 px-1.5 py-0.5 rounded-md leading-none">X8</span>
              </div>

              {/* Bottom active plate */}
              <div className={`w-full text-center py-1 rounded-2xl text-[10.5px] font-black font-mono leading-none tracking-tight transition-all mt-1
                ${bets.lucky77 > 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-extrabold shadow-inner shadow-black/20' : 'bg-black/40 text-amber-400/30'}
              `}>
                {bets.lucky77 > 0 ? formatAmount(bets.lucky77) : '0'}
              </div>
            </div>

            {/* Plum x2 Box */}
            <div
              className={`border-[1.5px] rounded-3xl p-1.5 flex flex-col items-center justify-between relative shadow-lg hover:brightness-[1.12] active:scale-[0.98] transition-all cursor-pointer overflow-hidden
                ${gameState !== 'betting' ? 'opacity-[0.80] cursor-default' : ''}
                ${bets.plum > 0 
                  ? 'bg-violet-500/10 border-violet-400' 
                  : 'bg-[#180d2d]/70 border-violet-500/10 hover:bg-[#1f103d]/70'
                }
              `}
              onClick={() => handlePlaceBet('plum')}
            >
              {/* Card Header total room bet simulated */}
              <div className="w-full flex items-center justify-center gap-0.5 text-[8.5px] font-black text-violet-400 bg-violet-500/10 py-1 rounded-t-2xl px-1 font-mono">
                <i className="fas fa-coins text-[7px]" />
                <span>{formatAmount(bets.plum)}</span>
              </div>

              {/* Emoji Content */}
              <div className="flex flex-col items-center justify-center py-1">
                <span className="text-3xl drop-shadow-md">🍇</span>
                <span className="text-[10px] font-black text-violet-400 mt-1 uppercase tracking-wider bg-violet-500/10 px-1.5 py-0.5 rounded-md leading-none">X2</span>
              </div>

              {/* Bottom active plate for user own bet */}
              <div className={`w-full text-center py-1 rounded-2xl text-[10.5px] font-black font-mono leading-none tracking-tight transition-all
                ${bets.plum > 0 ? 'bg-violet-500 text-white shadow-inner shadow-black/20' : 'bg-black/30 text-white/30'}
              `}>
                {bets.plum > 0 ? formatAmount(bets.plum) : '0'}
              </div>
            </div>

          </div>

          {/* Section 4: Betting Selector & Tactile Chips Tray */}
          <div className="w-full space-y-3 pt-2 flex-shrink-0 select-none pb-2 bg-black/20 p-3 rounded-[1.75rem] border border-white/5">
            
            {/* Legend label bar */}
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">
                {t("اختر مبلغ الرهان", "CHOOSE CHIP TO BET")}
              </span>
              {gameState === 'result' && winAmount > 0 ? (
                <span className="text-[11px] font-black text-green-400 capitalize tracking-wider leading-none flex items-center gap-1.5">
                  <span>{t("مبارك ربحت: ", "Congrats! You Won: ")}</span>
                  <span className="font-sans font-black">+{winAmount.toLocaleString('en-US')}</span>
                  <i className="fas fa-coins text-[10px] text-yellow-400 -mt-0.5" />
                </span>
              ) : (
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider leading-none flex items-center gap-1">
                  <span>{t("المراهنة بالجولة: ", "Current Bet: ")}</span>
                  <span className="font-mono font-black">{totalBetAmount.toLocaleString('en-US')}</span>
                  <i className="fas fa-coins text-[9.5px] text-yellow-500 -mt-0.5" />
                </span>
              )}
            </div>

            {/* Interactive Tactile Chips Tray */}
            <div className="px-1 py-1">
              
              {/* Detailed Dual-line standard casino jetons - stretched to full width */}
              <div className="grid grid-cols-4 gap-4 px-1">
                {CHIPS_CONFIG.map(chip => {
                  const isSelected = selectedChip === chip.value;
                  return (
                    <button
                      key={chip.value}
                      onClick={() => { playSfx('chip'); setSelectedChip(chip.value); }}
                      className={`relative aspect-square rounded-full overflow-hidden flex flex-col items-center justify-center transition-all duration-300 outline-none
                        ${isSelected 
                          ? 'scale-110 -translate-y-1 shadow-[0_8px_20px_rgba(245,158,11,0.25)] ring-2 ring-yellow-400' 
                          : 'opacity-85 hover:opacity-100 hover:scale-105 shadow-[0_4px_10px_rgba(0,0,0,0.4)]'
                        }
                      `}
                    >
                      {/* Realistic 3D Chip Background layer */}
                      <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${chip.colors} border-2 border-black/30 flex items-center justify-center p-[2px]`}>
                        <div className="w-full h-full rounded-full border border-white/25 flex items-center justify-center relative">
                          {/* Inner dashed ring characteristic of real clay chips */}
                          <div className="absolute inset-1 rounded-full border border-dashed border-white/20" />
                          
                          {/* Visual light reflection glare shine inside the ring */}
                          <div className="absolute top-[10%] right-[12%] w-[25%] h-[12%] bg-white/30 rounded-full filter blur-[0.2px] rotate-[22deg]" />
                        </div>
                      </div>

                      {/* Chip Value text label */}
                      <span className="z-10 text-[11px] font-black text-white px-1 py-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-none tracking-tighter">
                        {chip.label}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>

        </div>



        {/* Informative Modal Layer for game rules & statistics odds */}
        <AnimatePresence>
          {showHowToPlay && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6"
            >
              <div className="bg-gradient-to-b from-[#240c3d] to-[#0e001c] w-full max-w-sm rounded-[2rem] border border-yellow-500/30 p-5 text-right flex flex-col gap-4 shadow-2xl relative">
                
                {/* Close modal */}
                <button 
                  onClick={() => { playSfx('modal'); setShowHowToPlay(false); }}
                  className="absolute top-4 left-4 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white active:scale-90 transition-all"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>

                <h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-100 flex items-center gap-2">
                  <i className="fas fa-info-circle text-amber-400"></i>
                  {t("قواعد لعبة Lucky 77", "Lucky 77 Game Rules")}
                </h3>

                <div className="space-y-3.5 text-xs text-white/80 overflow-y-auto max-h-[300px] leading-relaxed scrollbar-hide pr-1">
                  
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <p className="font-extrabold text-white text-[12px] mb-1">{t("1. كيف تلعب؟", "1. How to Play?")}</p>
                    <p className="text-white/70 text-[11px]">{t("اختر قيمة الفيشة من شريط الخيارات بالأسفل، ثم حدد خانة المراهنة التي تفضلها (البطيخ، البرقوق، أو الـ Lucky 77 الإستثنائي).", "Choose your chip value from the tray, and tap the columns to place your bets on segment combinations.")}</p>
                  </div>

                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                    <p className="font-extrabold text-white text-[12px] mb-1">{t("2. نسب الاحتمالات والأرباح:", "2. Winning Odds & Multipliers:")}</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono leading-none">
                      <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                        <span className="text-green-300 font-extrabold block">🍉 {t("بطيخ (Watermelon)", "Watermelon")}</span>
                        <span className="text-white/60 mt-1 block">{t("العدد: 4/8 (50%)", "Ratio: 4 of 8 (50%)")}</span>
                        <span className="text-amber-400 font-black mt-1 block">{t("الربح: X2", "Payout: X2")}</span>
                      </div>
                      <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                        <span className="text-violet-300 font-extrabold block">🍇 {t("برقوق (Plum)", "Plum")}</span>
                        <span className="text-white/60 mt-1 block">{t("العدد: 3/8 (37.5%)", "Ratio: 3 of 8 (37.5%)")}</span>
                        <span className="text-amber-400 font-black mt-1 block">{t("الربح: X2", "Payout: X2")}</span>
                      </div>
                    </div>
                    <div className="bg-[#ec4899]/10 p-2 rounded-xl border border-[#ec4899]/25 text-center">
                      <span className="text-pink-300 font-extrabold text-[11px] block">🎰 Lucky 77 ⚡</span>
                      <p className="text-white/70 text-[9px] mt-1">{t("العدد: 1/8 من العجلة (12.5% احتمالية)", "Ratio: 1 of 8 segments (12.5% odds)")}</p>
                      <span className="text-yellow-400 font-extrabold text-[12px] mt-1.5 block">{t("الربح الأقوى: X8 كاشاوات!!!", "Super Jackpot: x8 payout!!!")}</span>
                    </div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-[11px]">
                    <p className="font-extrabold text-white text-[12px] mb-1">{t("3. تكرار ومسح الرهان", "3. Repeat & Clear Layout")}</p>
                    <p className="text-white/70">{t("استخدم زر 'تكرار' لمضاعفة رهانك السابق فوراً. يتيح لك زر 'مسح' إعادة استرداد الرصيد المراهن به للمحاولة من جديد.", "Repeat allows you to replicate your previous configuration quickly. Clear refunds all current session stakes instantly.")}</p>
                  </div>

                </div>

                <button 
                  onClick={() => { playSfx('modal'); setShowHowToPlay(false); }}
                  className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl text-purple-950 text-xs font-black shadow-lg"
                >
                  {t("حسناً، فهمت", "Got it, Let's Play!")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
