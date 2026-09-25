import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

export default function Header() {
  return (
    <header className="py-8 px-6 flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="w-20 h-20 bg-brand-orange rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-brand-orange/20 rotate-12"
      >
        <Sparkles className="text-white w-10 h-10" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-5xl font-black tracking-tight mb-2 bg-gradient-to-r from-brand-orange to-brand-purple bg-clip-text text-transparent"
      >
        وناسة AI
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-slate-400 max-w-md text-lg font-medium"
      >
        رفيقك الذكي لكسر الملل والبحث عن الفرفشة
      </motion.p>
    </header>
  );
}
