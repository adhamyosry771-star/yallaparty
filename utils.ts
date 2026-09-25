/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const WEALTH_THRESHOLDS = [
  1000000, 1106770, 1224941, 1355729, 1500481, 1660688, 1838000, 2034244, 2251442, 2491830,
  2757884, 3052344, 3378244, 3738942, 4138153, 4579988, 5068995, 5610208, 6209205, 6872173,
  7605943, 8418054, 9316800, 10311291, 11411516, 12628415, 13974958, 15465236, 17114551, 18939524,
  20958214, 23190248, 25657000, 28381775, 31390018, 34709544, 38370805, 42407181, 46855297, 51755379,
  57151667, 63092891, 69632825, 76830935, 84752138, 93467750, 103056665, 113606805, 125216872, 137998459,
  152078555, 167602504, 184737448, 203676321, 224642462, 247894919, 273734495, 302510624, 334629221, 370561614,
  410854656, 456142071, 507157119, 564746676, 629886878, 703700516, 787477307, 882696188, 991051902, 1114484058,
  1255211863, 1415773665, 1599074450, 1808440499, 2047681992, 2321164846, 2633892019, 2991595389, 3400839133, 3869138485,
  4405098233, 5018571869, 5720842164, 6524827774, 7445318915, 8499247709, 9705997066, 11087754113, 12669912459, 14481531012,
  16555856396, 18930914115, 21650182309, 24763354869, 28327215263, 32406636141, 37075731295, 42419175484, 48533719515, 55529926354
];

const CHARISMA_THRESHOLDS = [
  100000, 113333, 128458, 145585, 165000, 187000, 211933, 240194, 272223, 308518,
  349653, 396273, 449112, 509000, 576867, 653775, 740960, 839757, 951731, 1078635,
  1222442, 1385437, 1570188, 1779545, 2016839, 2285751, 2590506, 2935930, 3327393, 3771043,
  4273837, 4843640, 5489438, 6221516, 7051052, 7991146, 9056631, 10263836, 11632363, 13183204,
  14941019, 16933115, 19190977, 21749310, 24649168, 27935745, 31660321, 35882142, 40665111, 46087311,
  52232490, 59201089, 67104500, 76051761, 86200000, 97691888, 110717441, 125480749, 142211531, 161173238,
  182662000, 207018500, 234621000, 265903000, 301353000, 341535000, 387076000, 438685000, 497175000, 563465000,
  638587000, 723730000, 820235000, 929598000, 1053535000, 1194015000, 1353215000, 1533635000, 1738115000, 1970250000,
  2232950000, 2530650000, 2868000000, 3251000000, 3685000000, 4177000000, 4735000000, 5366000000, 6083000000, 6894000000,
  7813000000, 8855000000, 10035000000, 11370000000, 12890000000, 14610000000, 16560000000, 18770000000, 21270000000, 25000000000
];

export const getWealthLevelInfo = (xp: number = 0) => getLevelInfo(xp, WEALTH_THRESHOLDS, 'wealth');
export const getCharismaLevelInfo = (xp: number = 0) => getLevelInfo(xp, CHARISMA_THRESHOLDS, 'charisma');

const getLevelInfo = (xp: number = 0, thresholds: number[], type: 'wealth' | 'charisma') => {
  let currentLevel = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) {
      currentLevel = i + 1;
    } else {
      break;
    }
  }
  
  const currentXPThreshold = currentLevel === 0 ? 0 : thresholds[currentLevel - 1];
  const nextXPThreshold = currentLevel >= 100 ? currentXPThreshold : thresholds[currentLevel];
  
  const xpInCurrentLevel = xp - currentXPThreshold;
  const xpRequiredForNext = nextXPThreshold - currentXPThreshold;
  
  const progress = currentLevel >= 100 || xpRequiredForNext === 0 
    ? 100 
    : Math.min(100, (xpInCurrentLevel / xpRequiredForNext) * 100);

  // Tiers and Colors
  const wealthConfig = [
    { name: 'مبتدئ ثروة', color: 'text-slate-400' },
    { name: 'عامل', color: 'text-stone-400' },
    { name: 'موظف', color: 'text-orange-400' },
    { name: 'مدير', color: 'text-amber-400' },
    { name: 'مستثمر', color: 'text-yellow-400' },
    { name: 'مليونير', color: 'text-emerald-400' },
    { name: 'ملياردير', color: 'text-cyan-400' },
    { name: 'إمبراطور', color: 'text-blue-400' },
    { name: 'ملك المال', color: 'text-indigo-400' },
    { name: 'الأسطورة', color: 'text-violet-400' }
  ];

  const charismaConfig = [
    { name: 'مبتدئ جاذبية', color: 'text-slate-400' },
    { name: 'ودود', color: 'text-rose-400' },
    { name: 'محبوب', color: 'text-pink-400' },
    { name: 'جذاب', color: 'text-fuchsia-400' },
    { name: 'فاتن', color: 'text-purple-400' },
    { name: 'متألق', color: 'text-violet-400' },
    { name: 'نجم', color: 'text-indigo-400' },
    { name: 'مشهور', color: 'text-blue-400' },
    { name: 'ساحر', color: 'text-cyan-400' },
    { name: 'الأسطورة', color: 'text-teal-400' }
  ];

  const categoryIndex = Math.min(9, Math.max(0, Math.floor((currentLevel > 0 ? currentLevel - 1 : 0) / 10)));
  const config = type === 'wealth' ? wealthConfig : charismaConfig;
  const { name, color } = config[categoryIndex];
  
  const tier = {
    name,
    color,
    bg: `${color.replace('text-', 'bg-')}/10`,
    bar: `${color.replace('text-', 'bg-')}`,
    border: `${color.replace('text-', 'border-')}/20`,
    glow: `${color.replace('text-', 'shadow-')}/20`
  };

  return {
    level: currentLevel,
    progress,
    xpRemaining: Math.max(0, nextXPThreshold - xp),
    nextXPThreshold,
    tier
  };
};
