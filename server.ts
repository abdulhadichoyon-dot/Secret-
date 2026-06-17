import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, modelAlias, thinking } = req.body;
      
      const systemInstruction = 
        "You are CipherAI, a highly secure AI assistant operating within a Serverless P2P WebRTC platform. " +
        "Your responses should be concise, professional, and focus on security, privacy, and answering user queries accurately.";

      // format history
      const history = messages.slice(0, -1).map((m: any) => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const prompt = messages[messages.length - 1].text;

      let modelName = "gemini-3.5-flash";
      if (modelAlias === "pro") modelName = "gemini-3.1-pro-preview";
      if (modelAlias === "lite") modelName = "gemini-3.1-flash-lite";

      const config: any = {
        systemInstruction,
      };

      if (thinking && modelAlias === "pro") {
        config.thinkingConfig = { thinkingBudgetTokens: 1024 };
      }

      const chat = ai.chats.create({
        model: modelName,
        config,
        history,
      });

      const response = await chat.sendMessage({
        message: prompt
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini AI Error:", error);
      let errorMessage = error.message || "Failed to communicate with AI";
      if (errorMessage.includes("leaked") || errorMessage.includes("API key not valid")) {
         errorMessage = "Your Gemini API key was reported as leaked or is invalid. Please update your GEMINI_API_KEY in the AI Studio settings.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
