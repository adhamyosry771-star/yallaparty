import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { generateEntertainmentResponse, SYSTEM_PROMPTS } from "../services/geminiService";

interface Message {
  role: "user" | "bot";
  text: string;
}

export default function AIBot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "يا هلا والله! أنا أبو الفضل، تبي حكمة؟ سالفة؟ ولا نكتة تفرقع الضحك؟" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setIsLoading(true);

    const response = await generateEntertainmentResponse(userMsg, SYSTEM_PROMPTS.WISE_MAN);
    setMessages(prev => [...prev, { role: "bot", text: response }]);
    setIsLoading(false);
  };

  return (
    <div className="glass rounded-3xl p-6 flex flex-col h-[500px] w-full max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Bot size={120} />
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 scrollbar-hide">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[80%] p-4 rounded-2xl ${
              msg.role === "user" 
                ? "bg-brand-purple text-white rounded-tr-none" 
                : "bg-white/10 text-slate-100 rounded-tl-none border border-white/5"
            }`}>
              <p className="text-lg leading-relaxed">{msg.text}</p>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 p-4 rounded-2xl animate-pulse flex items-center gap-2 text-slate-400">
              <Loader2 className="animate-spin" size={18} />
              <span>أبو الفضل يفكّر...</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 bg-black/20 p-2 rounded-2xl border border-white/5 focus-within:border-brand-purple/50 transition-colors">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="تحدث مع أبو الفضل..."
          className="flex-1 bg-transparent px-4 py-2 outline-none text-slate-100 placeholder:text-slate-500"
          dir="rtl"
        />
        <button
          onClick={handleSend}
          disabled={isLoading}
          className="bg-brand-purple hover:bg-brand-purple/80 p-3 rounded-xl transition-all active:scale-95 disabled:opacity-50"
        >
          <Send size={20} className="text-white" />
        </button>
      </div>
    </div>
  );
}
