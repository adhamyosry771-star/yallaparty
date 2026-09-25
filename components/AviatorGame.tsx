import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  doc, updateDoc, setDoc, addDoc, collection, 
  serverTimestamp, increment, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db, auth } from '../firebase';
import { useLanguage } from '../LanguageContext';

interface AviatorGameProps {
  onClose: () => void;
  userBalance: number;
  onUpdateBalance: (amount: number) => void;
}

const QUICK_AMOUNTS = [1000, 10000, 100000, 500000];

export const AviatorGame: React.FC<AviatorGameProps> = ({ onClose, userBalance, onUpdateBalance }) => {
  const { language, t } = useLanguage();

  // Game States: 'betting' (countdown before launch) | 'flying' (multiplier increasing) | 'crashed' (plane exploded/flew away)
  const [gameState, setGameState] = useState<'betting' | 'flying' | 'crashed'>('betting');
  const [timeLeft, setTimeLeft] = useState(15); // countdown seconds
  
  // Real-time Flight States
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [placedBetAmount, setPlacedBetAmount] = useState<number | null>(null);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [winAmount, setWinAmount] = useState<number | null>(null);

  // User Betting configurations
  const [betInput, setBetInput] = useState(0);
  const [activeQuickAmount, setActiveQuickAmount] = useState<number | null>(null);
  const [isAutoCashEnabled, setIsAutoCashEnabled] = useState(false);
  const [autoCashMultiplier, setAutoCashMultiplier] = useState(2);
  const [autoCashInput, setAutoCashInput] = useState("2");

  // Stats & History
  const [history, setHistory] = useState<number[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const userStatsRef = useRef<any>(null);

  // UI States
  const [isEngineHumming, setIsEngineHumming] = useState(false);

  // Timing refs
  const gameTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const targetCrashPointRef = useRef<number>(1.50);

  // Audio Context (Dynamic Web Audio API synthesizers for real audio fx)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Synchronized refs to avoid stale closures in recursive requestAnimationFrame tick loops
  const placedBetAmountRef = useRef<number | null>(null);
  const hasCashedOutRef = useRef<boolean>(false);
  const gameStateRef = useRef<'betting' | 'flying' | 'crashed'>('betting');
  const isAutoCashEnabledRef = useRef<boolean>(false);
  const autoCashMultiplierRef = useRef<number>(2.00);
  const winAmountRef = useRef<number | null>(null);

  useEffect(() => { placedBetAmountRef.current = placedBetAmount; }, [placedBetAmount]);
  useEffect(() => { hasCashedOutRef.current = hasCashedOut; }, [hasCashedOut]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { isAutoCashEnabledRef.current = isAutoCashEnabled; }, [isAutoCashEnabled]);
  useEffect(() => { autoCashMultiplierRef.current = autoCashMultiplier; }, [autoCashMultiplier]);
  useEffect(() => { winAmountRef.current = winAmount; }, [winAmount]);

  // Load User Stats for logging / rigging
  useEffect(() => {
    let unsubDoc: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }
      if (user) {
        unsubDoc = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserStats(data);
            userStatsRef.current = data;
            
            // Real-time dynamic flight constraint updates
            if (gameStateRef.current === 'flying') {
              const maxMultRaw = data.aviatorMaxMultiplier;
              const maxMult = (maxMultRaw !== undefined && maxMultRaw !== null) ? parseFloat(String(maxMultRaw)) : null;
              if (maxMult !== null && !isNaN(maxMult) && maxMult > 1.0) {
                // To keep the flight exactly or close to the target without breaking small numbers:
                // We pick a random value between 92% and 100% of maxMult (with safety bounds)
                const minPossible = maxMult * 0.92;
                const lowerBound = Math.max(1.05, minPossible);
                let liveCrashValue = parseFloat((lowerBound + Math.random() * (maxMult - lowerBound)).toFixed(2));
                
                targetCrashPointRef.current = liveCrashValue;
                console.log("[Aviator Debug] Live admin changes applied with dynamic variance to:", targetCrashPointRef.current);
              }
            }
          }
        });
      } else {
        setUserStats(null);
        userStatsRef.current = null;
      }
    });
    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  // Web Audio Synthesizer Functions
  const initAudio = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch (e) {
      console.warn("Audio Context init support failed", e);
    }
  };

  const startEngineSound = () => {
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, ctx.currentTime); // Deep hum

      // Low pass filter to make it sound muffled/bass heavy like an airplane cockpit in distance
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.5);

      osc.start();

      oscillatorRef.current = osc;
      gainNodeRef.current = gain;
      setIsEngineHumming(true);
    } catch (e) {}
  };

  const updateEnginePitch = (multiplier: number) => {
    try {
      if (oscillatorRef.current && audioCtxRef.current) {
        const pitch = 60 + (multiplier - 1.0) * 45; // Raise pitch as plane goes faster
        oscillatorRef.current.frequency.setValueAtTime(Math.min(pitch, 600), audioCtxRef.current.currentTime);
      }
    } catch (e) {}
  };

  const stopEngineSound = () => {
    try {
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
        oscillatorRef.current = null;
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }
      setIsEngineHumming(false);
    } catch (e) {}
  };

  const playCashOutSound = () => {
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      // Beautiful clean high dual chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.frequency.setValueAtTime(659.25, now); // E5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {}
  };

  const playCrashSound = () => {
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      // Low explosive boom
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.8);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(now + 0.8);
    } catch (e) {}
  };

  // Run countdown when in betting status
  useEffect(() => {
    if (gameState === 'betting') {
      if (timeLeft > 0) {
        gameTimerRef.current = window.setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      } else {
        launchPlane();
      }
    }
    return () => {
      if (gameTimerRef.current) clearTimeout(gameTimerRef.current);
    };
  }, [timeLeft, gameState]);

  // Handle active plane engine sound cycle
  useEffect(() => {
    return () => stopEngineSound();
  }, []);

  // Compute a smart, unpredictable but structured Crash Point
  const rollCrashPoint = (): number => {
    const stats = userStatsRef.current;
    
    // 1. Calculate general candidate roll (normal or rigged win/loss)
    let candidateRoll = 1.50;
    
    if (stats?.fruitsForcedLoss) {
      // Force quick crash to secure system gold balances
      candidateRoll = parseFloat((1.01 + Math.random() * 0.15).toFixed(2));
    } else if (stats?.fruitsForcedWin) {
      // Reward user with high index guarantee
      candidateRoll = parseFloat((4 + Math.random() * 15).toFixed(2));
    } else {
      const randVal = Math.random() * 100;
      if (randVal < 5) {
        // 5% instant quick explosion: 1.00x to 1.05x
        candidateRoll = parseFloat((1.00 + Math.random() * 0.05).toFixed(2));
      } else if (randVal < 20) {
        // 15% very low: 1.05x to 1.30x
        candidateRoll = parseFloat((1.05 + Math.random() * 0.25).toFixed(2));
      } else if (randVal < 55) {
        // 35% medium small (e.g., around 1.30x to 2.20x)
        candidateRoll = parseFloat((1.30 + Math.random() * 0.90).toFixed(2));
      } else if (randVal < 85) {
        // 30% mid multipliers: 2.20x to 5.50x
        candidateRoll = parseFloat((2.20 + Math.random() * 3.30).toFixed(2));
      } else {
        // 15% high multipliers up to 15.00x (e.g., 5.50x to 15.00x)
        candidateRoll = parseFloat((5.50 + Math.random() * 9.50).toFixed(2));
      }
    }

    // 2. Load maxMultiplier strategy constraint and apply it as the final, overriding rule
    const maxMultRaw = stats?.aviatorMaxMultiplier;
    const maxMult = (maxMultRaw !== undefined && maxMultRaw !== null) ? parseFloat(String(maxMultRaw)) : null;

    let finalRoll = candidateRoll;
    if (maxMult !== null && !isNaN(maxMult) && maxMult > 1.0) {
      // To keep the flight exactly or close to the target without breaking small numbers:
      // We pick a random value between 92% and 100% of maxMult (with safety bounds)
      const minPossible = maxMult * 0.92;
      const lowerBound = Math.max(1.05, minPossible);
      finalRoll = parseFloat((lowerBound + Math.random() * (maxMult - lowerBound)).toFixed(2));
    }
    
    console.log("[Aviator Debug] rollCrashPoint - candidate:", candidateRoll, "maxMult:", maxMult, "finalRoll:", finalRoll);
    return parseFloat(finalRoll.toFixed(2));
  };

  // Take off
  const launchPlane = () => {
    initAudio();
    const crashAt = rollCrashPoint();
    targetCrashPointRef.current = crashAt;
    
    // Set active values
    setGameState('flying');
    gameStateRef.current = 'flying';
    
    setCurrentMultiplier(1.00);
    
    setHasCashedOut(false);
    hasCashedOutRef.current = false;
    
    setWinAmount(null);
    winAmountRef.current = null;
    
    startTimeRef.current = Date.now();

    // Sound
    startEngineSound();

    // Start rendering frame loop
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      
      // Compute beautiful exponential curve speed multiplier
      const elapsedSec = elapsed / 1000;
      const nextMultiplier = 1.00 + Math.pow(elapsedSec, 1.25) * 0.06;
      const formatted = parseFloat(nextMultiplier.toFixed(2));

      // Auto cashout logic
      const currentBet = placedBetAmountRef.current;
      const currentHasCashed = hasCashedOutRef.current;
      const currentIsAutoEnabled = isAutoCashEnabledRef.current;
      const currentAutoMult = autoCashMultiplierRef.current;

      if (currentBet && !currentHasCashed && currentIsAutoEnabled) {
        // If the current multiplier formatted is >= autoCashMultiplier
        // OR if we are about to crash but the actual crash point is >= autoCashMultiplier
        if (formatted >= currentAutoMult || (formatted >= targetCrashPointRef.current && targetCrashPointRef.current >= currentAutoMult)) {
          triggerCashOut(currentAutoMult);
        }
      }

      if (formatted >= targetCrashPointRef.current) {
        // Crashed / Left the atmosphere!
        handleCrash();
      } else {
        setCurrentMultiplier(formatted);
        updateEnginePitch(formatted);
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  // Perform a manual or auto cashout
  const triggerCashOut = (cashoutAt: number) => {
    const currentBet = placedBetAmountRef.current;
    const currentHasCashed = hasCashedOutRef.current;
    const currentGameState = gameStateRef.current;

    if (!currentBet || currentHasCashed || currentGameState !== 'flying') return;
    
    setHasCashedOut(true);
    hasCashedOutRef.current = true;
    
    const winCoins = Math.floor(currentBet * cashoutAt);
    setWinAmount(winCoins);
    winAmountRef.current = winCoins;
    
    playCashOutSound();

    // Increment actual balance
    onUpdateBalance(winCoins);

    // Save logs into Firestore
    const user = auth.currentUser;
    if (user) {
      (async () => {
        try {
          // Increment total win balances for transparency (coins balance is already updated via onUpdateBalance)
          await updateDoc(doc(db, "users", user.uid), {
            fruitsTotalWin: increment(winCoins),
            aviatorTotalWin: increment(winCoins)
          });
        } catch (e) {
          console.error("Failed to commit database changes during cashout:", e);
        }
      })();
    }
  };

  // Handle Crash Event
  const handleCrash = () => {
    stopEngineSound();
    playCrashSound();
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setGameState('crashed');
    gameStateRef.current = 'crashed';
    
    setCurrentMultiplier(targetCrashPointRef.current);

    // Record history
    setHistory(prev => [targetCrashPointRef.current, ...prev].slice(0, 8));

    // Complete background database telemetry
    const user = auth.currentUser;
    const currentBet = placedBetAmountRef.current;
    if (user && currentBet) {
      (async () => {
        try {
          const currentHasCashed = hasCashedOutRef.current;
          const currentWin = winAmountRef.current;
          const winSum = currentHasCashed && currentWin ? currentWin : 0;
          const profit = currentBet - winSum;

          // Increment global systems counters
          await setDoc(doc(db, "settings", "aviatorGame"), {
            totalRounds: increment(1),
            totalVolume: increment(currentBet),
            totalProfit: increment(profit)
          }, { merge: true });
        } catch (e) {}
      })();
    }

    // Prepare next game
    setTimeout(() => {
      setPlacedBetAmount(null);
      placedBetAmountRef.current = null;
      
      // Auto-clear bet inputs to zero at the start of each new round
      setBetInput(0);
      setActiveQuickAmount(null);

      setGameState('betting');
      gameStateRef.current = 'betting';
      
      setTimeLeft(15);
    }, 4500);
  };

  // Betting Actions
  const handleBtnPlaceBet = async () => {
    if (gameStateRef.current !== 'betting') return;
    if (placedBetAmountRef.current !== null) return; // already bet placed
    if (userBalance < betInput || betInput <= 0) return;

    setPlacedBetAmount(betInput);
    placedBetAmountRef.current = betInput;
    
    onUpdateBalance(-betInput);

    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          fruitsTotalBet: increment(betInput),
          aviatorTotalBet: increment(betInput)
        });
      } catch (e) {}
    }
  };

  // Cleanup Ref Frames on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Compute coordinates for SVG line based on multiplier progress
  const getProgressPercent = () => {
    if (gameState !== 'flying') return 0;
    // Normalize percentage based on target crash point
    const value = (currentMultiplier - 1.0) / (targetCrashPointRef.current - 1.0 || 1.0);
    return Math.min(value * 100, 95);
  };

  // Color coding of previous pill results helper
  const getMultColor = (val: number) => {
    if (val < 2.00) return 'bg-white/10 text-slate-300';
    if (val < 10.00) return 'bg-purple-600/30 text-purple-400 border border-purple-500/20';
    return 'bg-amber-400/20 text-yellow-400 border border-amber-400/30 font-extrabold';
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end bg-transparent animate-in fade-in duration-300">
      <style>{`
        @keyframes slideGrid {
          0% { background-position: 0px 0px; }
          100% { background-position: -28px 0px; }
        }
        .scrolling-trading-grid {
          background-image: 
            linear-gradient(to right, rgba(168, 85, 247, 0.22) 1.5px, transparent 1.5px),
            linear-gradient(to bottom, rgba(168, 85, 247, 0.22) 1.5px, transparent 1.5px);
          background-size: 28px 28px;
          animation: slideGrid ${gameState === 'flying' ? Math.max(0.4, 2.8 / Math.sqrt(currentMultiplier)) : 8}s linear infinite;
        }
        .floating-plane {
          transform: translate(-50%, -50%) rotate(-10deg);
        }
        @keyframes slideBars {
          0% { transform: translateX(0); }
          100% { transform: translateX(-28px); }
        }
        .scrolling-bars {
          animation: slideBars ${gameState === 'flying' ? Math.max(0.4, 2.8 / Math.sqrt(currentMultiplier)) : 8}s linear infinite;
        }
      `}</style>

      {/* Tap backdrop to exit safely IF they do not have an active pending bet flying */}
      <div 
        className="absolute inset-0 z-0 cursor-default bg-black/20" 
        onClick={() => {
          if (gameState === 'flying' && placedBetAmount && !hasCashedOut) {
            // Cannot escape in the middle of active betting flights to prevent UI exploitation
            return;
          }
          onClose();
        }} 
      />

      {/* Main Dashboard Panel */}
      <div className="relative z-10 w-full max-w-md mx-auto bg-slate-950/85 border-t border-white/10 rounded-t-[2.5rem] shadow-none flex flex-col overflow-hidden h-[85%]" dir="ltr">
        
        {/* Decorative sliding handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-4 mb-2 flex-shrink-0"></div>

        {/* Dynamic Header */}
        <header className="px-6 py-2 flex items-center justify-between bg-transparent">
          <div className="flex flex-col items-start">
            <h2 className="text-sm font-black text-rose-500 flex items-center gap-1">
              <i className="fas fa-plane-departure text-[11px] flex-shrink-0"></i>
              <span>{t("لعبة الطائرة", "AVIATOR CRASH")}</span>
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <i className="fas fa-coins text-yellow-500 text-[10px]"></i>
              <span className="text-[11px] font-mono font-bold text-yellow-400">{userBalance.toLocaleString('en-US')}</span>
            </div>
          </div>
          <button 
            onClick={() => {
              if (gameState === 'flying' && placedBetAmount && !hasCashedOut) return;
              onClose();
            }}
            disabled={gameState === 'flying' && !!placedBetAmount && !hasCashedOut}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-20"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </header>

        {/* Pinned Prior Multiplier History Section - Outer transparent container with a solid border line */}
        <div className="mx-3 my-1 py-1 px-3 border border-white/10 rounded-xl bg-transparent flex items-center gap-2 overflow-x-auto scrollbar-hide select-none flex-shrink-0 z-20 min-h-[30px] justify-center">
          {history.length > 0 ? (
            history.map((val, idx) => (
              <span 
                key={idx} 
                className={`text-[9px] font-mono font-black py-1 px-2.5 rounded-xl whitespace-nowrap shadow-none ${getMultColor(val)}`}
              >
                {val.toFixed(2)}x
              </span>
            ))
          ) : (
            <span className="text-[10px] font-bold text-white/30 text-center select-none w-full py-0.5">
              {t("لا توجد نتائج الآن", "No results yet")}
            </span>
          )}
        </div>

        {/* Content body */}
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto scrollbar-hide select-none">

          {/* Top Flight Arena Viewport */}
          <div className="relative bg-slate-900/40 rounded-[2rem] border border-white/5 min-h-[230px] max-h-[300px] flex-1 overflow-hidden flex flex-col justify-between p-4 shadow-inner">
            
            {/* Ambient Scrolling trading grid lines */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.35] scrolling-trading-grid z-0"></div>

            {/* Top Multiplier Readout Panel - Futuristic Trading HUD */}
            <div className="w-full z-10 select-none">
              {gameState === 'betting' && (
                <div className="flex flex-col items-start bg-slate-950/40 border border-white/5 rounded-2xl px-4 py-3 backdrop-blur-md">
                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest leading-none">{t("متبقي على طيران الطائرة", "NEXT LAUNCH")}</span>
                  <div className="text-2xl font-black text-white leading-none mt-1.5 flex items-center gap-1.5">
                    <i className="fas fa-clock text-xs text-rose-500 flex-shrink-0"></i>
                    <span>{timeLeft} {t("ثانية", "Sec")}</span>
                  </div>
                </div>
              )}
               
              {gameState === 'flying' && (
                <div className="w-full flex justify-between items-center bg-purple-500/10 border border-purple-500/25 rounded-2xl px-4 py-2.5 backdrop-blur-md shadow-lg animate-in fade-in duration-300">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-purple-400 uppercase tracking-wider">{t("الوضع الحالي لتشغيل", "FLIGHT STATE")}</span>
                    <p className="text-[10px] font-black text-white">{t("نشطة ومثبتة", "CRUISING")}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">{t("معامل الربح الحالي", "MULTIPLIER")}</span>
                    <span className="text-2xl font-black font-mono text-emerald-400 leading-none mt-1.5 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]">{currentMultiplier.toFixed(2)}x</span>
                  </div>
                </div>
              )}

              {gameState === 'crashed' && (
                <div className="w-full flex justify-between items-center bg-rose-500/10 border border-rose-500/25 rounded-2xl px-4 py-2.5 backdrop-blur-md shadow-lg">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider">{t("ارتفاع التحطم", "EXPLODED AT")}</span>
                    <p className="text-[10px] font-black text-rose-500">{t("طارت الطائرة!", "FLEW AWAY")}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">{t("ارتفاع التحطم", "FINAL POINT")}</span>
                    <span className="text-2xl font-black font-mono text-rose-500 leading-none mt-1.5 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]">{currentMultiplier.toFixed(2)}x</span>
                  </div>
                </div>
              )}
            </div>

            {/* Flight Central Dynamic Status Presentation */}
            <div className="flex-1 flex items-center justify-center relative min-h-[140px] z-10 w-full">
              
              <AnimatePresence mode="wait">
                {gameState === 'betting' && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex flex-col items-center gap-1.5 text-center px-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-1 animate-none">
                      <i className="fas fa-plane text-2xl text-rose-500 flex-shrink-0"></i>
                    </div>
                    <h3 className="text-xs font-black text-white">{t("اكتب رهانك الآن", "Place Your Bet")}</h3>
                    <p className="text-[9px] font-bold text-white/40 tracking-wide">{t("الرهان يبدأ خلال بضع ثواني...", "Take off countdown starting shortly...")}</p>
                  </motion.div>
                )}

                {gameState === 'flying' && (
                  <div className="w-full h-full absolute inset-0 overflow-hidden">
                    {/* Live Trading thresholds inside chart context */}
                    <div className="absolute left-3 top-1/4 h-px w-[85%] border-b border-white/[0.04] border-dashed flex items-center justify-between text-[7px] font-mono text-white/20 select-none">
                      <span>3.50x</span>
                      <span>RESISTANCE LEVEL</span>
                    </div>
                    <div className="absolute left-3 top-2/4 h-px w-[85%] border-b border-white/[0.04] border-dashed flex items-center justify-between text-[7px] font-mono text-white/20 select-none">
                      <span>2.00x</span>
                      <span>MIDWAY TARGET</span>
                    </div>
                    <div className="absolute left-3 top-3/4 h-px w-[85%] border-b border-white/[0.04] border-dashed flex items-center justify-between text-[7px] font-mono text-white/20 select-none">
                      <span>1.20x</span>
                      <span>SUPPORT LINE</span>
                    </div>

                    {/* Seamless stock market candlesticks sliding from right to left */}
                    <div className="absolute inset-x-0 bottom-2 h-[80px] pointer-events-none flex items-end justify-end overflow-hidden z-0 opacity-40">
                      <div className="scrolling-bars flex items-end pr-10 min-w-[200%]">
                        {[...Array(30)].map((_, i) => {
                          const hPercent = [22, 38, 52, 28, 42, 60, 72, 48, 32, 55, 70, 48, 18, 42, 65, 80, 38, 28, 55, 45][i % 20];
                          const isGreen = i % 3 !== 0;
                          return (
                            <div key={i} className="flex flex-col items-center flex-shrink-0" style={{ width: '14px' }}>
                              <div className={`w-[1px] h-5 ${isGreen ? 'bg-emerald-500/50' : 'bg-rose-500/50'} flex-shrink-0`}></div>
                              <div 
                                style={{ height: `${hPercent}px` }} 
                                className={`w-2 rounded-sm ${isGreen ? 'bg-gradient-to-t from-emerald-500/30 to-emerald-400/60 border border-emerald-500/40' : 'bg-gradient-to-t from-rose-500/30 to-rose-400/60 border border-rose-500/40'} flex-shrink-0`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Vector Candlestick Path Drawing */}
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full absolute inset-0 z-0 pointer-events-none">
                      <defs>
                        <linearGradient id="tradingAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="rgba(244, 63, 94, 0.2)" />
                          <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                      {/* Shaded Area of the Stock Chart */}
                      <path 
                        d="M 0,85 C 25,82 50,65 80,45 L 80,100 L 0,100 Z" 
                        fill="url(#tradingAreaGradient)"
                        className="opacity-75"
                      />
                      {/* Glowing neon trading path line connecting to airplane */}
                      <path 
                        d="M 0,85 C 25,82 50,65 80,45" 
                        fill="none" 
                        stroke="rgb(244, 63, 94)" 
                        strokeWidth="2.5" 
                        className="drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                      />
                      {/* Projection line targeting forward axis */}
                      <line 
                        x1="80" 
                        y1="45" 
                        x2="100" 
                        y2="45" 
                        stroke="rgba(244, 63, 94, 0.35)" 
                        strokeWidth="1" 
                        strokeDasharray="2,2" 
                      />
                    </svg>

                    {/* Cruising Airplane situated perfectly at the right of the trading board */}
                    <div 
                      style={{ 
                        position: 'absolute',
                        left: '80%',
                        top: '45%',
                      }}
                      className="w-12 h-12 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10 pointer-events-none floating-plane flex-shrink-0"
                    >
                      <i className="fas fa-plane text-2xl text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.95)] transform flex-shrink-0"></i>
                      {/* Glowing Thruster trailing sparks */}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 flex gap-0.5 items-center pr-1 opacity-80 scale-75 flex-shrink-0">
                        <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping flex-shrink-0"></span>
                        <span className="w-1 h-1 bg-rose-500 rounded-full animate-ping delay-75 flex-shrink-0"></span>
                      </div>
                    </div>
                  </div>
                )}

                {gameState === 'crashed' && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1.05, opacity: 1 }}
                    className="flex flex-col items-center text-center px-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center mb-2">
                      <span className="text-3xl">💥</span>
                    </div>
                    <h3 className="text-lg font-black text-rose-500 uppercase tracking-widest">{t("طارت الطائرة!", "FLEW AWAY!")}</h3>
                    <p className="text-[11px] font-bold text-white/50">{t("لقد تحطمت الطائرة عند معامل", "The flight went out of reach at")} <span className="text-rose-400 font-mono font-black">{currentMultiplier.toFixed(2)}x</span></p>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

          {/* Active Cashout display if they won in current round */}
          {gameState === 'flying' && hasCashedOut && winAmount && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 shadow-lg"
            >
              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">{t("تم استرداد المبلغ بنجاح", "SUCCESSFUL CASHOUT")}</h4>
              <p className="text-sm font-black text-white leading-none mt-1">
                {t("مبروك! ربحت ", "Congrats! You retrieved ")}
                <span className="text-yellow-400 font-mono">{winAmount.toLocaleString('en-US')}</span> 
                {" " + t("كوينز", "Coins")}
              </p>
            </motion.div>
          )}

          {/* Core Interactive Betting Controls Panel */}
          <div className="bg-slate-900/60 rounded-[2rem] border border-white/5 p-4 flex flex-col gap-4">
            
            {/* Auto Cashout toggle section */}
            <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-black text-white/80 uppercase tracking-wide">{t("السحب التلقائي للأرباح", "AUTO CASH-OUT")}</span>
                <span className="text-[8px] font-medium text-white/30">{t("اسحب الرهان تلقائياً عند معامل معين", "Secure prize automatically")}</span>
              </div>
              <div className="flex items-center gap-2.5">
                {isAutoCashEnabled && (
                  <div className={`flex items-center gap-1 border border-white/10 rounded-xl px-2.5 py-1 bg-black/40 h-8 transition-opacity ${placedBetAmount !== null ? 'opacity-40' : ''}`}>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      disabled={placedBetAmount !== null}
                      value={autoCashInput}
                      onChange={(e) => {
                        let rawVal = e.target.value;
                        const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
                        const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
                        for (let i = 0; i < 10; i++) {
                          rawVal = rawVal.replace(new RegExp(arabicDigits[i], 'g'), String(i))
                                         .replace(new RegExp(persianDigits[i], 'g'), String(i));
                        }
                        const val = rawVal.replace(/[^0-9.]/g, '');
                        // Ensure only a single dot
                        const parts = val.split('.');
                        const cleaned = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
                        setAutoCashInput(cleaned);
                        const parsed = parseFloat(cleaned);
                        if (!isNaN(parsed) && parsed >= 1.01) {
                          setAutoCashMultiplier(parsed);
                        }
                      }}
                      onBlur={() => {
                        let parsed = parseFloat(autoCashInput);
                        if (isNaN(parsed) || parsed < 1.01) {
                          parsed = 2;
                        } else if (parsed > 1000) {
                          parsed = 1000;
                        }
                        // Set without decimals if it is an integer, or with necessary decimals up to 2 places
                        const formatted = Number(parsed.toFixed(2)).toString();
                        setAutoCashInput(formatted);
                        setAutoCashMultiplier(parsed);
                      }}
                      className="w-12 bg-transparent border-none outline-none text-right font-mono text-xs text-purple-400 font-extrabold pr-0.5 disabled:cursor-not-allowed"
                      dir="ltr"
                      lang="en"
                    />
                    <span className="text-[9px] font-black text-white/30">x</span>
                  </div>
                )}
                <button 
                  onClick={() => setIsAutoCashEnabled(!isAutoCashEnabled)}
                  disabled={placedBetAmount !== null}
                  className={`w-12 h-7 rounded-full transition-all flex items-center p-1 ${isAutoCashEnabled ? 'bg-purple-600 justify-end' : 'bg-white/10 justify-start'} ${placedBetAmount !== null ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <motion.div layout className="w-5 h-5 rounded-full bg-white shadow-md"></motion.div>
                </button>
              </div>
            </div>

            {/* Quick pre-configured bet value selectors */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{t("مبلغ الرهان", "BET AMOUNT")}</span>
                {placedBetAmount !== null && (
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                    <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">{t("مقدار الرهان الحالي: ", "ACTIVE BET: ")}{placedBetAmount.toLocaleString('en-US')}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {QUICK_AMOUNTS.map(amount => {
                  const isActive = activeQuickAmount === amount;
                  return (
                    <button
                      key={amount}
                      onClick={() => {
                        if (placedBetAmount !== null) return; // ignore during active flights
                        setBetInput(prev => prev + amount);
                        setActiveQuickAmount(amount);
                      }}
                      disabled={placedBetAmount !== null}
                      className={`py-2.5 rounded-xl border text-[11px] font-black font-mono transition-all duration-200 transform active:scale-95
                        ${isActive 
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md scale-95' 
                          : 'bg-white/5 border-white/5 text-purple-200 hover:bg-white/10'
                        }
                        disabled:opacity-30
                      `}
                    >
                      {amount >= 1000000 ? `${amount/1000000}M` : `${amount/1000}k`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual custom value input scrollbar range */}
            <div className="grid grid-cols-12 gap-2 items-center bg-black/40 border border-white/5 rounded-2xl px-3 py-2.5 transition-all select-none">
              <div className="col-span-6 text-[10px] font-black text-white/40 uppercase tracking-wider">
                {t("الرهان المتراكم", "ACCUMULATED BET")}
              </div>
              
              <div className="col-span-6 text-right">
                <span className="font-mono text-sm font-black text-white/80 pr-1 select-none pointer-events-none">
                  {(betInput || 0).toLocaleString('en-US')}
                </span>
              </div>
            </div>

            {/* Central Giant Execution Core CTA control */}
            <div className="space-y-2">
              <button 
                onClick={() => {
                  if (gameState === 'betting') {
                    if (placedBetAmount === null && userBalance >= betInput && betInput > 0) {
                      handleBtnPlaceBet();
                    }
                  } else if (gameState === 'flying') {
                    if (placedBetAmount !== null && !hasCashedOut && !isAutoCashEnabled) {
                      triggerCashOut(currentMultiplier);
                    }
                  }
                }}
                disabled={
                  (gameState === 'betting' && (placedBetAmount !== null || userBalance < betInput || betInput <= 0)) ||
                  (gameState === 'flying' && (!placedBetAmount || hasCashedOut || isAutoCashEnabled)) ||
                  (gameState === 'crashed')
                }
                className={`max-w-[280px] w-full py-3 rounded-2xl mx-auto font-black tracking-widest uppercase transition-all duration-300 flex flex-col items-center justify-center select-none shadow-xl border text-center min-h-[48px]
                  ${gameState === 'betting'
                    ? (placedBetAmount !== null 
                        ? 'bg-slate-800 text-purple-400 border-purple-500/10 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white active:scale-95 border-purple-500/30'
                      )
                    : gameState === 'flying'
                    ? (!placedBetAmount || hasCashedOut || isAutoCashEnabled
                        ? 'bg-slate-800 text-white/20 border-white/5 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-[0.98] border-emerald-500/30 shadow-none'
                      )
                    : 'bg-rose-950/20 text-rose-500 border-rose-500/20 cursor-not-allowed'
                  }
                `}
              >
                {gameState === 'betting' && (
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <span>
                      {placedBetAmount !== null 
                        ? t("بانتظار الإقلاع في الجولة التالية...", "WAITING FOR DEPARTURE...") 
                        : t("تأكيد رهان الطيران الآن", "BET FOR NEXT FLIGHT")
                      }
                    </span>
                  </div>
                )}
 
                {gameState === 'flying' && (
                  <div className="flex flex-col items-center justify-center">
                    {!placedBetAmount ? (
                      <span className="text-xs uppercase tracking-wide">{t("شاهد طيران الطيارة...", "WATCHING ACTIVE FLIGHT...")}</span>
                    ) : hasCashedOut ? (
                      <span className="text-xs uppercase tracking-wide text-emerald-400">{t("تم استلام الأرباح لديك", "RETRIEVED TO SECURITY WALLET")}</span>
                    ) : isAutoCashEnabled ? (
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="tracking-wide text-xs uppercase text-purple-400 font-bold">{t("السحب التلقائي نشط", "AUTO-CASH ACTIVE")}</span>
                        <span className="text-white/50 font-mono text-[10px] leading-none">
                          {t("سيتم السحب عند", "Auto-cash target:")} {autoCashMultiplier.toFixed(2)}x
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="tracking-wide text-xs uppercase opacity-95">{t("سحب الأرباح الآن", "CASH OUT NOW")}</span>
                        <span className="text-yellow-300 font-mono text-xs leading-none">
                          {(placedBetAmount * currentMultiplier).toLocaleString('en-US')} {t("كوينز", "Coins")} (x{currentMultiplier.toFixed(2)})
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {gameState === 'crashed' && (
                  <span className="text-xs font-black text-rose-500">
                    ⚠️ {t("برجاء الانتظار لجولة رهان جديدة...", "ROUND ENDED. RELOADING COCKPIT...")}
                  </span>
                )}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
