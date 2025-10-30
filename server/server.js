import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// CORS 설정
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// Realtime API 세션 생성 엔드포인트
app.post("/session", async (req, res) => {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-4o-realtime-preview-2024-12-17",
          output_modalities: ["text"], // 서버에서 텍스트만 출력하도록 강제

        },
      }),
    });

    console.log("API KEY DETECTED:", OPENAI_API_KEY?.slice(0, 10));
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API Error:", response.status, errorData);
      return res.status(response.status).json({ error: "Failed to create session" });
    }

    const data = await response.json();
    console.log("OpenAI session created successfully");
    res.json(data);
    
  } catch (err) {
    console.error("Session creation error:", err);
    res.status(500).json({ error: "Failed to create client secret" });
  }
});

// TTS 프록시 엔드포인트
app.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    console.log(`🎤 TTS 요청: ${text.substring(0, 50)}...`);

    // Python TTS 서버로 요청 전달
    const ttsResponse = await fetch("http://localhost:5000/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!ttsResponse.ok) {
      throw new Error(`TTS server error: ${ttsResponse.status}`);
    }

    // 음성 데이터를 그대로 브라우저로 전달
    const audioBuffer = await ttsResponse.arrayBuffer();
    
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Length': audioBuffer.byteLength
    });
    
    res.send(Buffer.from(audioBuffer));
    console.log("✅ TTS 음성 데이터 전송 완료");
    
  } catch (err) {
    console.error("TTS proxy error:", err);
    res.status(500).json({ error: "TTS processing failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🎤 TTS endpoint: http://localhost:${PORT}/tts`);
});