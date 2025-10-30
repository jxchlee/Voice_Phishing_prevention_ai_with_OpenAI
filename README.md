# 🎤 Korean Voice Chat with Custom TTS

OpenAI Realtime API를 사용한 한국어 음성 대화 시스템입니다. 음성 입력을 받아 텍스트 응답을 생성하고, 커스텀 TTS로 음성을 출력합니다.

## ✨ 주요 특징

- 🎤 **실시간 음성 입력**: OpenAI Realtime API의 고품질 음성 인식
- 📝 **텍스트 전용 응답**: `modalities: ["text"]` 설정으로 텍스트만 출력
- 🔊 **커스텀 TTS**: 브라우저 TTS (외부 TTS 모델로 쉽게 교체 가능)
- 🇰🇷 **한국어 최적화**: 한국어 음성 인식 및 자연스러운 응답
- ⚡ **실시간 스트리밍**: 응답을 실시간으로 스트리밍하여 표시
- 🔧 **디버깅 지원**: 모든 이벤트를 실시간으로 확인 가능

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone <repository-url>
cd korean-voice-chat
```

### 2. TTS 서버 설정 (Supertone API)

```bash
cd tts
python start_tts.py
```

필요한 경우 `.env` 파일을 생성하고 OpenAI API 키를 설정하세요:

```env
./tts/.env(supertone 사용 시)
SUPERTONE_API_KEY=your_api_key_here
```

TTS 서버가 `http://localhost:5000`에서 실행됩니다.

### 3. Node.js 서버 설정

새 터미널에서:

```bash
cd server
npm install
```

`.env` 파일을 생성하고 OpenAI API 키를 설정하세요:

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```


서버 실행:

```bash
node server.js
```

### 4. 클라이언트 설정

새 터미널에서:

```bash
cd client
npm install
npm run dev
```

### 5. 접속

브라우저에서 `http://localhost:5173`에 접속하세요.

## 🏗️ 프로젝트 구조

```
korean-voice-chat/
├── server/                 # Express 서버
│   ├── server.js          # Realtime API 세션 생성
│   ├── package.json
│   └── .env              # OpenAI API 키 (생성 필요)
├── client/               # Vite + TypeScript 클라이언트
│   ├── src/
│   │   └── main.ts      # Realtime API 클라이언트 로직
│   ├── index.html       # 메인 UI
│   ├── package.json
│   └── vite.config.ts
├── README.md
└── .gitignore
```

## 🔧 기술적 구현

### 핵심: 텍스트 전용 응답 요청

```javascript
// 음성 인식 완료 시 텍스트 전용 응답 요청
await this.session.transport.sendEvent({
    type: "response.create",
    response: {
        modalities: ["text"], // 🔥 텍스트만 출력
        instructions: "한국어로 자연스럽게 응답해주세요. 텍스트로만 응답하세요.",
    }
});
```

### 이벤트 처리 흐름

1. `input_audio_transcription.delta` → 실시간 음성 인식
2. `input_audio_transcription.completed` → 인식 완료 → 텍스트 응답 요청
3. `response.text.delta` → 실시간 텍스트 스트리밍
4. `response.text.done` → 텍스트 완료 → 커스텀 TTS 실행
5. `response.audio.*` → 모든 음성 출력 이벤트 무시

## 🎯 사용법

1. **연결하기** 버튼 클릭
2. 마이크 권한 허용
3. 자연스럽게 한국어로 말하기
4. AI가 텍스트로 응답 생성
5. 브라우저 TTS로 음성 출력
6. 계속 대화하기

## 🔄 커스텀 TTS 연동

현재는 브라우저 내장 TTS를 사용하지만, `speakText()` 함수를 수정하여 다음과 같은 TTS 모델로 교체할 수 있습니다:

### 외부 TTS API
- Google Cloud Text-to-Speech
- Amazon Polly
- Microsoft Azure Speech Services

### 로컬 TTS 모델
- Coqui TTS
- Tacotron2
- FastSpeech2

### 구현 예시

```javascript
private async speakText(text: string) {
    // 외부 TTS API 호출 예시
    const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'ko-KR-female' })
    });
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
}
```

## 🛠️ 개발 환경

- **Node.js**: 18.x 이상
- **TypeScript**: 5.x
- **Vite**: 7.x
- **OpenAI Agents**: 0.2.1

## 📋 요구사항

- OpenAI API 키 (Realtime API 접근 권한 필요)
- 마이크 권한 (HTTPS 또는 localhost에서만 작동)
- 모던 브라우저 (Chrome, Firefox, Safari, Edge)

## 🐛 문제 해결

### 마이크 권한 오류
- HTTPS 또는 localhost에서만 마이크 접근 가능
- 브라우저 설정에서 마이크 권한 확인

### 연결 실패
- OpenAI API 키가 올바른지 확인
- Realtime API 접근 권한이 있는지 확인
- 네트워크 연결 상태 확인

### 음성 인식 안됨
- 마이크가 제대로 작동하는지 확인
- 조용한 환경에서 명확하게 발음
- 디버그 창에서 이벤트 로그 확인

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 지원

문제가 있거나 질문이 있으시면 Issue를 생성해주세요.

---

**Made with ❤️ for Korean Voice AI Applications**