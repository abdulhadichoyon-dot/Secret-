/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Shield, Cpu } from "lucide-react";
import { P2PChat } from "@/components/p2p/P2PChat";
import { AIAssistant } from "@/components/ai/AIAssistant";
import { cn } from "@/lib/utils";

export default function App() {
  const [activeTab, setActiveTab] = useState<"p2p" | "ai">("p2p");

  return (
    <div className="h-screen bg-[#0B0E14] text-slate-300 font-sans flex flex-col gap-4 p-4 md:p-6 overflow-hidden">
      {/* Top Navigation / Status Bar */}
      <div className="flex justify-between items-center bg-[#161B22] border border-slate-800 rounded-2xl px-6 py-4 shrink-0 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
          <h1 className="text-xl font-bold tracking-tight text-white">CIPHER <span className="text-emerald-500">NODE</span></h1>
        </div>
        
        <nav className="flex items-center gap-2 p-1 bg-slate-900/50 rounded-lg border border-slate-800">
           <button
             onClick={() => setActiveTab("p2p")}
             className={cn(
               "px-4 py-2 rounded text-sm font-medium transition-all flex items-center gap-2",
               activeTab === "p2p" ? "bg-emerald-500 text-[#0B0E14]" : "text-slate-500 hover:text-slate-300"
             )}
           >
             <Shield className="w-4 h-4" /> <span className="hidden sm:inline">Secure Link (P2P)</span>
           </button>
           <button
             onClick={() => setActiveTab("ai")}
             className={cn(
               "px-4 py-2 rounded text-sm font-medium transition-all flex items-center gap-2",
               activeTab === "ai" ? "bg-emerald-500 text-[#0B0E14]" : "text-slate-500 hover:text-slate-300"
             )}
           >
             <Cpu className="w-4 h-4" /> <span className="hidden sm:inline">CipherAI Assistant</span>
           </button>
        </nav>

        <div className="hidden lg:flex gap-8 items-center text-sm font-mono">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-slate-500">Network Status</span>
            <span className="text-emerald-400">Serverless / WebRTC Active</span>
          </div>
          <div className="h-8 w-[1px] bg-slate-800"></div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-slate-500">Encryption</span>
            <span className="text-emerald-400">P2P Secure Channel</span>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-hidden flex flex-col min-h-0">
         {activeTab === "p2p" ? <P2PChat /> : <AIAssistant />}
      </main>
    </div>
  );
}
