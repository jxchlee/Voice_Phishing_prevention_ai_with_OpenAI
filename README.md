# 🎤 Korean Voice Chat with Custom TTS

OpenAI Realtime API를 사용한 한국어 음성 대화 시스템입니다. 음성 입력을 받아 텍스트 응답을 생성하고, 커스텀 TTS로 음성을 출력합니다.

## 🎥 데모 영상

[![Anti Voice Phishing Demo](https://img.youtube.com/vi/wRz_R1ABQJo/maxresdefault.jpg)](https://youtu.be/wRz_R1ABQJo)

*클릭하여 데모 영상을 시청하세요*

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
git clone https://github.com/jxchlee/Voice_Phishing_prevention_ai_with_OpenAI.git
cd Voice_Phishing_prevention_ai_with_OpenAI

```

### 2. TTS 서버 설정 (Supertone API)

```bash
cd tts
python start_tts.py
```

필요한 경우 `.env` 파일을 생성하고 SUPERTONE API 키를 설정하세요:

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
├── server/                 # Express 서버 (백엔드 + TTS 프록시)
│   ├── server.js          # Realtime API 세션 생성 + TTS 프록시
│   ├── package.json
│   └── .env              # OpenAI API 키 (생성 필요)
├── client/               # Vite + TypeScript 클라이언트
│   ├── src/
│   │   └── main.ts      # Realtime API 클라이언트 + TTS 통합
│   ├── index.html       # 메인 UI
│   ├── package.json
│   └── vite.config.ts
├── tts/                  # Supertone TTS 서버
│   ├── tts_server.py    # Flask TTS 서버
│   ├── start_tts.py     # TTS 서버 시작 스크립트
│   ├── requirements.txt # Python 의존성
│   ├── tts.py          # 원본 TTS 테스트 코드
│   └── .env            # Supertone API 키
├── README.md
└── .gitignore
```

## 🔧 기술적 구현

### 핵심: 세션 업데이트로 텍스트 전용 설정

```javascript
// 연결 후 세션을 텍스트 전용으로 업데이트
const event = {
    type: "session.update",
    session: {
        type: "realtime",
        model: "gpt-4o-realtime-preview-2024-12-17",
        output_modalities: ["text"], // 🔥 텍스트만 출력
        instructions: "한국어로 자연스럽게 응답해주세요."
    }
};
await this.session.transport.sendEvent(event);
```

### TTS 통합 아키텍처

```
브라우저 → Node.js 서버 → Python TTS 서버 → Supertone API
   ↑                                              ↓
   ← 음성 데이터 (파일 저장 없이 직접 스트리밍) ←
```

## 🎯 사용법

1. **연결하기** 버튼 클릭
2. 마이크 권한 허용
3. 자연스럽게 한국어로 말하기
4. AI가 텍스트로 응답 생성
5. 브라우저 TTS로 음성 출력
6. 계속 대화하기

## 🔄 Supertone TTS 통합

### 현재 구현: Supertone API

이 프로젝트는 **Supertone API**를 사용하여 고품질 한국어 TTS를 제공합니다:

- **음성 품질**: 자연스러운 한국어 발음
- **실시간 처리**: 파일 저장 없이 메모리에서 직접 스트리밍
- **중복 방지**: TTS 재생 중 새로운 요청 자동 무시

### TTS 서버 구조

```python
# tts/tts_server.py - Flask 서버
@app.route('/tts', methods=['POST'])
def text_to_speech():
    # Supertone API 호출
    response = requests.post(SUPERTONE_URL, json=payload, headers=headers)
    
    # 파일 저장 없이 메모리에서 직접 전송
    audio_data = io.BytesIO(response.content)
    return send_file(audio_data, mimetype='audio/wav')
```

### 다른 TTS 서비스로 교체

`tts/tts_server.py`에서 Supertone API 부분만 교체하면 됩니다:

- **Google Cloud TTS**: `google-cloud-texttospeech`
- **Amazon Polly**: `boto3`
- **Azure Speech**: `azure-cognitiveservices-speech`
- **로컬 TTS**: Coqui TTS, Tacotron2 등

## 🛠️ 개발 환경

### 백엔드
- **Node.js**: 18.x 이상
- **Express**: 5.x
- **OpenAI Agents**: 0.2.1

### 프론트엔드
- **TypeScript**: 5.x
- **Vite**: 7.x

### TTS 서버
- **Python**: 3.7 이상
- **Flask**: 2.3.x
- **Supertone API**: 최신 버전

## 📋 요구사항

- **OpenAI API 키** (Realtime API 접근 권한 필요)
- **Supertone API 키** (TTS 서비스용)
- **Python 3.7+** (TTS 서버용)
- **Node.js 18+** (백엔드 서버용)
- **마이크 권한** (HTTPS 또는 localhost에서만 작동)
- **모던 브라우저** (Chrome, Firefox, Safari, Edge)

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