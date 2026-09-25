import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Smile, Frown, Zap, Coffee, Ghost, Loader2, Sparkles } from "lucide-react";
import { generateEntertainmentResponse, SYSTEM_PROMPTS } from "../services/geminiService";

const MOODS = [
  { id: "happy", label: "مروّق", icon: Smile, color: "bg-yellow-400" },
  { id: "bored", label: "طفشان", icon: Frown, color: "bg-blue-400" },
  { id: "energetic", label: "متحمس", icon: Zap, color: "bg-orange-500" },
  { id: "chill", label: "هادي", icon: Coffee, color: "bg-teal-500" },
  { id: "spooky", label: "رعب", icon: Ghost, color: "bg-purple-600" },
];

export default function MoodBox() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMoodSelect = async (mood: string, label: string) => {
    setSelectedMood(mood);
    setIsLoading(true);
    const response = await generateEntertainmentResponse(
      `أنا أشعر بالآن بـ: ${label}. ماذا تقترح علي؟`,
      SYSTEM_PROMPTS.MOOD_SUGGESTER
    );
    setSuggestions(response);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6">
      <h2 className="text-2xl font-bold mb-6 text-center text-slate-200">بشرنا.. كيف المزاج اليوم؟</h2>
      <div className="flex flex-wrap justify-center gap-4 mb-10">
        {MOODS.map((mood) => {
          const Icon = mood.icon;
          return (
            <motion.button
              key={mood.id}
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMoodSelect(mood.id, mood.label)}
              className={`flex flex-col items-center p-6 rounded-3xl transition-all ${
                selectedMood === mood.id 
                ? `${mood.color} text-white shadow-xl shadow-${mood.id}/20` 
                : "glass text-slate-300 hover:text-slate-100"
              }`}
            >
              <Icon size={32} className="mb-2" />
              <span className="font-bold">{mood.label}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {(isLoading || suggestions) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-dark p-8 rounded-[40px] border-brand-teal/20 relative overflow-hidden"
          >
            {isLoading ? (
              <div className="flex flex-col items-center py-10">
                <Loader2 className="animate-spin text-brand-teal mb-4" size={48} />
                <p className="text-xl font-medium text-slate-300">نختار لك الأفضل...</p>
              </div>
            ) : (
              <div className="relative z-10" dir="rtl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-brand-teal/20 flex items-center justify-center">
                    <Sparkles size={20} className="text-brand-teal" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">مقترحات "وناسة" لك:</h3>
                </div>
                <div className="text-lg text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {suggestions}
                </div>
              </div>
            )}
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-teal/10 blur-3xl rounded-full" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
