import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, RefreshCw, Lightbulb, Zap } from "lucide-react";
import { generateEntertainmentResponse, SYSTEM_PROMPTS } from "../services/geminiService";

export default function FactCard() {
  const [fact, setFact] = useState("هل تعلم؟ الأخطبوط يملك ثلاثة قلوب!");
  const [isLoading, setIsLoading] = useState(false);

  const getNewFact = async () => {
    setIsLoading(true);
    const response = await generateEntertainmentResponse("أريد حقيقة غريبة جديدة", SYSTEM_PROMPTS.FUN_FACTS);
    setFact(response);
    setIsLoading(false);
  };

  const getChallenge = async () => {
    setIsLoading(true);
    const response = await generateEntertainmentResponse(
      "أعطني تحدي مرح وسريع لكسر الملل (مثلاً: ابحث عن شيء أحمر حولك، أو قل جملة صعبة 3 مرات)",
      "أنت رفيق مرح، أعطِ تحديات قصيرة ممتعة وبسيطة للمستخدم باللغة العربية."
    );
    setFact(`تحدي اليوم: ${response}`);
    setIsLoading(false);
  };

  return (
    <motion.div 
      layout
      className="w-full max-w-xl mx-auto glass p-8 rounded-3xl mt-12 relative group overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange via-yellow-400 to-brand-teal" />
      
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-yellow-400/10 rounded-2xl">
          <Lightbulb className="text-yellow-400" size={28} />
        </div>
        <h3 className="text-2xl font-black text-white">كسر الملل</h3>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={fact}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-xl text-slate-200 leading-relaxed mb-8 min-h-[80px]"
          dir="rtl"
        >
          {fact}
        </motion.p>
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={getNewFact}
          disabled={isLoading}
          className="bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={isLoading ? "animate-spin" : ""} size={18} />
          <span>حقيقة غريبة</span>
        </button>
        <button
          onClick={getChallenge}
          disabled={isLoading}
          className="bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 border border-brand-orange/20"
        >
          <Zap size={18} />
          <span>تحدي سريع</span>
        </button>
      </div>

      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <HelpCircle size={150} />
      </div>
    </motion.div>
  );
}
