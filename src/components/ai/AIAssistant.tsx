import { useState, useRef, useEffect } from "react";
import { Send, Terminal, Loader2, Zap, Network, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types";

type ModelAlias = "pro" | "flash" | "lite";

export function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<ModelAlias>("flash");
  const [useThinking, setUseThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: inputText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const payloadMessages = [...messages, userMsg];
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          modelAlias: model,
          thinking: useThinking
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "API error");
      }

      const data = await res.json();
      
      const aiMsg: ChatMessage = {
         id: crypto.randomUUID(),
         role: "model",
         text: data.text
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "model",
        text: `Error: ${err.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full mx-auto font-sans text-slate-300 gap-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-5 flex flex-wrap gap-4 items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-900 flex items-center justify-center text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]">
             <Terminal className="w-5 h-5" />
           </div>
           <div>
             <h2 className="font-bold tracking-tight text-lg text-white">CipherAI Core</h2>
             <span className="text-[10px] uppercase text-emerald-500 font-mono tracking-widest">Encrypted Local Tunnel</span>
           </div>
        </div>
        
        <div className="flex bg-[#0B0E14] p-1.5 rounded-xl border border-slate-800">
           <button 
             onClick={() => setModel("lite")}
             className={cn("flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all rounded-lg", model === "lite" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}
           >
             <Zap className="w-4 h-4" /> <span className="hidden sm:inline">Low-Latency</span>
           </button>
           <button 
             onClick={() => setModel("flash")}
             className={cn("flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all rounded-lg", model === "flash" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-300")}
           >
             <Network className="w-4 h-4" /> <span className="hidden sm:inline">Balanced</span>
           </button>
           <button 
             onClick={() => setModel("pro")}
             className={cn("flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all rounded-lg", model === "pro" ? "bg-emerald-500/20 text-emerald-400 shadow-sm" : "text-slate-500 hover:text-slate-300")}
           >
             <BrainCircuit className="w-4 h-4" /> <span className="hidden sm:inline">Deep Analysis</span>
           </button>
        </div>

        {model === "pro" && (
           <label className="flex items-center gap-2 text-xs font-bold text-slate-400 mx-2 cursor-pointer cursor-allowed">
             <input type="checkbox" checked={useThinking} onChange={(e) => setUseThinking(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
             ENABLE HIGH THINKING
           </label>
        )}
      </div>

      <div className="flex flex-col flex-1 bg-[#161B22] border border-slate-800 rounded-3xl p-5 min-h-0">
        <div className="flex-1 overflow-y-auto pr-2 pb-2 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="flex flex-col gap-1 max-w-[80%] opacity-60 mt-10 mx-auto text-center">
              <div className="bg-slate-800 p-4 rounded-2xl text-sm font-sans mx-auto max-w-sm">
                Secure terminal to CipherAI initialized. All processing routed through encrypted proxy. Ready for intelligence queries.
              </div>
            </div>
          )}
          {messages.map((msg) => (
             <div key={msg.id} className={cn("flex flex-col gap-1 max-w-[85%] font-sans", msg.role === "user" ? "items-end ml-auto" : "mr-auto")}>
                 <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed",
                    msg.role === "user" 
                      ? "bg-emerald-600 text-white rounded-tr-none" 
                      : "bg-slate-800 text-slate-300 rounded-tl-none whitespace-pre-wrap"
                  )}>
                    {msg.text}
                 </div>
             </div>
          ))}
          {isLoading && (
            <div className="flex flex-col gap-1 max-w-[85%] font-sans mr-auto">
               <div className="p-4 rounded-2xl text-sm bg-slate-800 text-slate-400 rounded-tl-none flex items-center gap-3 w-fit">
                 <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                 <span>Processing query via secure tunnel...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-4 bg-[#0B0E14] rounded-2xl p-2 pl-4 border border-slate-800 flex items-center gap-2 shrink-0 focus-within:border-emerald-500/50 transition-colors">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Query CipherAI..."
            disabled={isLoading}
            className="flex-grow bg-transparent outline-none text-sm text-slate-100 min-w-0 disabled:opacity-50"
          />
          <button 
            onClick={sendMessage}
            disabled={!inputText.trim() || isLoading}
            className="p-3 bg-emerald-500 rounded-xl text-[#0B0E14] font-bold disabled:opacity-50 hover:bg-emerald-400 transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
