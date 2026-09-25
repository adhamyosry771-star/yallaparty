/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import Header from "./components/Header";
import AIBot from "./components/AIBot";
import MoodBox from "./components/MoodBox";
import FactCard from "./components/FactCard";

export default function App() {
  return (
    <div className="min-h-screen relative pb-20 overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-orange/10 blur-[120px] rounded-full -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-purple/10 blur-[120px] rounded-full -z-10 animate-pulse delay-700" />
      <div className="absolute top-[30%] right-[10%] w-32 h-32 bg-brand-teal/5 blur-[60px] rounded-full -z-10" />

      <Header />

      <main className="container mx-auto px-4 max-w-6xl">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Chat Bot Column */}
          <div className="lg:col-span-12 xl:col-span-12">
             <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <AIBot />
            </motion.div>
          </div>

          {/* Mood Column */}
          <div className="lg:col-span-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <MoodBox />
            </motion.div>
          </div>

          {/* Facts Column */}
          <div className="lg:col-span-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <FactCard />
            </motion.div>
          </div>
        </section>

        <footer className="mt-20 text-center py-10 border-t border-white/5">
          <p className="text-slate-500 font-medium tracking-widest text-sm flex items-center justify-center gap-2">
            MADE WITH <span className="text-brand-orange">❤</span> BY WANASAH AI
          </p>
        </footer>
      </main>

      {/* Decorative Orbs */}
      <motion.div 
        animate={{ 
          y: [0, -20, 0],
          x: [0, 10, 0]
        }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-1/4 -left-12 w-24 h-24 bg-brand-orange/20 rounded-full blur-2xl pointer-events-none" 
      />
      <motion.div 
        animate={{ 
          y: [0, 20, 0],
          x: [0, -10, 0]
        }} 
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="fixed bottom-1/4 -right-12 w-32 h-32 bg-brand-purple/20 rounded-full blur-2xl pointer-events-none" 
      />
    </div>
  );
}
