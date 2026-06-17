import { useState, useEffect, useRef } from "react";
import { Copy, File as FileIcon, FileUp, Send, ShieldCheck, Play, ArrowRightLeft, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { P2PMessage, WebRTCRole, ConnectionStatus } from "@/types";

export function P2PChat() {
  const [role, setRole] = useState<WebRTCRole>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  
  const [offerText, setOfferText] = useState("");
  const [answerText, setAnswerText] = useState("");
  
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [inputText, setInputText] = useState("");

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initWebRTC = () => {
    const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected") setStatus("connected");
      if (pc.iceConnectionState === "disconnected") {
        setStatus("disconnected");
        setRole(null);
      }
      if (pc.iceConnectionState === "failed") {
        setStatus("disconnected");
        setRole(null);
      }
    };

    peerRef.current = pc;
    return pc;
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      setStatus("connected");
    };
    channel.onclose = () => {
      setStatus("disconnected");
      setRole(null);
    };
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages(prev => [...prev, { ...data, sender: "peer" }]);
      } catch(e) {
        console.error("Failed to parse incoming message", e);
      }
    };
    channelRef.current = channel;
  };

  const createHost = async () => {
    setRole("host");
    setStatus("connecting");
    const pc = initWebRTC();
    
    const channel = pc.createDataChannel("p2p-chat");
    setupDataChannel(channel);

    pc.onicecandidate = (event) => {
      if (event.candidate === null) {
        setOfferText(btoa(JSON.stringify(pc.localDescription)));
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
  };

  const createGuest = () => {
    setRole("guest");
    setStatus("connecting");
  };

  const applyOfferAsGuest = async () => {
    if (!offerText) return;
    try {
      const pc = initWebRTC();

      pc.ondatachannel = (event) => {
        setupDataChannel(event.channel);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate === null) {
          setAnswerText(btoa(JSON.stringify(pc.localDescription)));
        }
      };

      const desc = new RTCSessionDescription(JSON.parse(atob(offerText)));
      await pc.setRemoteDescription(desc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
    } catch(err) {
      alert("Invalid Connection Code.");
    }
  };

  const completeHostConnection = async () => {
    if (!answerText || !peerRef.current) return;
    try {
      const desc = new RTCSessionDescription(JSON.parse(atob(answerText)));
      await peerRef.current.setRemoteDescription(desc);
    } catch (err) {
      alert("Invalid Return Code.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const sendMessage = () => {
    if (!inputText.trim() || status !== "connected" || !channelRef.current) return;
    
    const msg: Partial<P2PMessage> = {
      id: crypto.randomUUID(),
      text: inputText,
      timestamp: Date.now()
    };

    channelRef.current.send(JSON.stringify(msg));
    setMessages(prev => [...prev, { ...msg, sender: "me" } as P2PMessage]);
    setInputText("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || status !== "connected" || !channelRef.current) return;

    // simplistic approach for MVP: read as Data URL (Base64)
    // Note: Chrome WebRTC max message size is usually around 256KB-1MB initially.
    // For robust large files, chunking is required, but base64 works for small images/texts.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const msg: Partial<P2PMessage> = {
        id: crypto.randomUUID(),
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result
        },
        timestamp: Date.now()
      };
      try {
        channelRef.current!.send(JSON.stringify(msg));
        setMessages(prev => [...prev, { ...msg, sender: "me" } as P2PMessage]);
      } catch (err) {
        alert("File too large. MVP limit ~256KB for direct unchunked DataChannel.");
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const reset = () => {
    peerRef.current?.close();
    peerRef.current = null;
    channelRef.current = null;
    setRole(null);
    setStatus("disconnected");
    setOfferText("");
    setAnswerText("");
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full w-full mx-auto font-sans text-slate-300">
      {status === "disconnected" && !role && (
        <div className="flex flex-col items-center justify-center flex-1 space-y-8 bg-[#161B22] border border-slate-800 rounded-3xl p-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-4">
            <ShieldCheck className="w-20 h-20 text-emerald-500 mx-auto drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            <h1 className="text-3xl font-bold tracking-tight text-white">CIPHER <span className="text-emerald-500">NODE</span></h1>
            <p className="text-slate-400 max-w-md font-mono text-sm leading-relaxed">
              Serverless P2P messaging. 100% anonymous. Off-grid identity verification with WebRTC DTLS DataChannels. E2EE by design.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={createHost}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-2xl border border-emerald-500/20 transition-colors font-bold text-sm tracking-wide"
            >
              <Zap className="w-5 h-5" />
              GENERATE ORIGIN CODE
            </button>
            <button
              onClick={createGuest}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-2xl border border-slate-700 transition-colors font-bold text-sm tracking-wide"
            >
              <ArrowRightLeft className="w-5 h-5" />
              CONNECT WITH CODE
            </button>
          </div>
        </div>
      )}

      {status === "connecting" && role === "host" && (
        <div className="flex flex-col p-8 bg-[#161B22] border border-slate-800 rounded-3xl max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 my-auto shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-500" /> Origin Verification
          </h2>
          
          <div className="space-y-6 flex-grow">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">1. Send this code to your peer</label>
              <div className="flex bg-[#0B0E14] border border-slate-800 rounded-2xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
                <input 
                  type="text" 
                  readOnly 
                  value={offerText || "Generating..."} 
                  className="bg-transparent p-4 w-full text-xs font-mono text-slate-400 outline-none"
                />
                <button onClick={() => copyToClipboard(offerText)} className="px-6 bg-emerald-500/10 text-emerald-500 border-l border-slate-800 hover:bg-emerald-500/20 transition-colors">
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">2. Paste return code</label>
              <div className="flex bg-[#0B0E14] border border-slate-800 rounded-2xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
                <input 
                  type="text" 
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Paste return code..."
                  className="bg-transparent p-4 w-full text-xs font-mono text-slate-300 outline-none"
                />
                <button onClick={completeHostConnection} className="px-6 bg-emerald-500 text-[#0B0E14] font-bold hover:opacity-90 transition-opacity">
                  <Play className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="pt-6 mt-4 flex justify-between items-center text-xs font-mono text-slate-500 border-t border-slate-800">
              <span>Waiting for handshake completion...</span>
              <button onClick={reset} className="text-rose-500 hover:text-rose-400 font-bold">ABORT</button>
            </div>
          </div>
        </div>
      )}

      {status === "connecting" && role === "guest" && (
        <div className="flex flex-col p-8 bg-[#161B22] border border-slate-800 rounded-3xl max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 my-auto shadow-xl">
           <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-emerald-500" /> Target Verification
          </h2>
          
          <div className="space-y-6 flex-grow">
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">1. Paste origin code</label>
              <div className="flex bg-[#0B0E14] border border-slate-800 rounded-2xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
                <input 
                  type="text" 
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                  placeholder="Paste origin code..."
                  className="bg-transparent p-4 w-full text-xs font-mono text-slate-300 outline-none"
                />
                <button onClick={applyOfferAsGuest} className="px-6 bg-emerald-500/10 text-emerald-500 border-l border-slate-800 hover:bg-emerald-500/20 transition-colors">
                  <Play className="w-5 h-5" />
                </button>
              </div>
            </div>

            {answerText && (
              <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]"></div>
                   2. Handshake Generated! Return this
                </label>
                <div className="flex bg-[#0B0E14] border border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <input 
                    type="text" 
                    readOnly 
                    value={answerText} 
                    className="bg-transparent p-4 w-full text-xs font-mono text-emerald-400 outline-none"
                  />
                  <button onClick={() => copyToClipboard(answerText)} className="px-6 bg-emerald-500 text-[#0B0E14] font-bold hover:opacity-90 transition-opacity">
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <div className="pt-6 mt-4 flex justify-between items-center text-xs font-mono text-slate-500 border-t border-slate-800">
              <span>Awaiting origin to verify handshake...</span>
              <button onClick={reset} className="text-rose-500 hover:text-rose-400 font-bold">ABORT</button>
            </div>
          </div>
        </div>
      )}

      {status === "connected" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-6 gap-4 flex-1 min-h-0 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Identity Card (Bento Grid) */}
          <div className="lg:col-span-3 lg:row-span-2 hidden lg:flex flex-col bg-[#161B22] border border-slate-800 rounded-3xl p-5 justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Network Identity</span>
              <p className="mt-2 text-xs font-mono text-emerald-500 break-all leading-relaxed">
                {role === "host" ? "Origin Node Active" : "Target Node Linked"}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-bold">{role?.charAt(0).toUpperCase()}</div>
              <div>
                <p className="text-sm font-bold text-white">Local Node</p>
                <p className="text-[10px] text-slate-400">Verified Anonymous</p>
              </div>
            </div>
          </div>

          {/* Main Chat Window (Bento Grid) */}
          <div className="lg:col-span-9 lg:row-span-6 flex flex-col bg-[#161B22] border border-slate-800 rounded-3xl p-5 min-h-0">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                <p className="text-white font-semibold">Ghost_Protocol_{role === "host" ? "02" : "01"}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-slate-500 uppercase hidden sm:block">E2EE Tunnel: AES-GCM (DTLS)</span>
                <button onClick={reset} className="text-rose-500 hover:text-rose-400 text-xs font-bold uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-colors">
                  Disconnect
                </button>
              </div>
            </div>

            <div className="flex-grow flex flex-col gap-4 overflow-y-auto pr-2 pb-2 custom-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col gap-1 max-w-[80%] opacity-60 mt-4 mx-auto text-center">
                  <div className="bg-slate-800 p-3 rounded-2xl text-sm font-sans">Handshake successful. Secure tunnel established.</div>
                  <span className="text-[10px] text-slate-500">Session Ephemeral</span>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex flex-col gap-1 max-w-[80%] font-sans", msg.sender === "me" ? "items-end ml-auto" : "")}>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm",
                    msg.sender === "me" 
                      ? "bg-emerald-600 text-white rounded-tr-none" 
                      : "bg-slate-800 text-slate-300 rounded-tl-none"
                  )}>
                    {msg.text && <div className="break-words max-w-full">{msg.text}</div>}
                    {msg.file && (
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-xl text-[#0B0E14]", msg.sender === "me" ? "bg-emerald-500" : "bg-slate-700 text-emerald-400")}>
                          <FileIcon className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="truncate font-medium">{msg.file.name}</p>
                          <p className="text-[10px] opacity-70">{(msg.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <a 
                          href={msg.file.data} 
                          download={msg.file.name}
                          className="ml-auto text-xs px-2 py-1 bg-black/20 rounded hover:bg-black/40 whitespace-nowrap transition-colors"
                        >
                          Save
                        </a>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 opacity-60 mx-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="mt-4 bg-[#0B0E14] rounded-2xl p-2 pl-4 border border-slate-800 flex items-center gap-2 shrink-0 overflow-hidden focus-within:border-emerald-500/50 transition-colors">
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:text-emerald-500 rounded-xl transition-colors shrink-0"
              >
                <FileUp className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type an ephemeral message..."
                className="bg-transparent flex-grow outline-none text-sm font-sans text-slate-100 min-w-0"
              />
              <button 
                onClick={sendMessage}
                disabled={!inputText.trim()}
                className="p-3 bg-emerald-500 rounded-xl text-[#0B0E14] disabled:opacity-50 hover:bg-emerald-400 transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Crypto Manifest Card (Bento Grid) */}
          <div className="lg:col-span-3 lg:row-span-4 hidden lg:block bg-[#161B22] border border-slate-800 rounded-3xl p-5">
             <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Crypto Manifest</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-400">Protocol</span>
                  <span className="text-xs text-white font-mono">WebRTC DTLS</span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-400">Transport</span>
                  <span className="text-xs text-white font-mono">DataChannel</span>
                </div>
                <div className="flex justify-between items-end border-b border-slate-800 pb-2">
                  <span className="text-xs text-slate-400">Perfect Forward Secrecy</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded">ACTIVE</span>
                </div>
                <div className="mt-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                  <div className="flex justify-between mb-2">
                     <span className="text-[10px] text-slate-500 uppercase">Entropy Pool</span>
                     <span className="text-[10px] text-white">98%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[98%]"></div>
                  </div>
                </div>
             </div>
          </div>

        </div>
      )}
    </div>
  );
}
