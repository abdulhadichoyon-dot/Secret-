export type MessageRole = "user" | "model";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
}

export type WebRTCRole = "host" | "guest" | null;
export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export interface P2PMessage {
  id: string;
  sender: "me" | "peer";
  text?: string;
  file?: {
    name: string;
    type: string;
    size: number;
    data: string; // base64
  };
  timestamp: number;
}
