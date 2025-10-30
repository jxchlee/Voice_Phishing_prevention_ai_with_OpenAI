import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";

class PerfectTextOnlyChat {
    private session: RealtimeSession | null = null;
    private isConnected = false;
    private currentUtterance: SpeechSynthesisUtterance | null = null;
    private currentTranscription = '';
    private currentResponse = '';

    // DOM 요소들
    private connectBtn: HTMLButtonElement;
    private status: HTMLElement;
    private chatContainer: HTMLElement;
    private transcriptionDiv: HTMLElement;
    private transcriptionText: HTMLElement;
    private pauseBtn: HTMLButtonElement;
    private resumeBtn: HTMLButtonElement;
    private stopTtsBtn: HTMLButtonElement;
    private debugContent: HTMLElement;

    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.updateStatus('연결 버튼을 클릭하여 시작하세요', 'info');
    }

    private initializeElements() {
        this.connectBtn = document.getElementById('connect') as HTMLButtonElement;
        this.status = document.getElementById('status') as HTMLElement;
        this.chatContainer = document.getElementById('chatContainer') as HTMLElement;
        this.transcriptionDiv = document.getElementById('transcription') as HTMLElement;
        this.transcriptionText = document.getElementById('transcription-text') as HTMLElement;
        this.pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
        this.resumeBtn = document.getElementById('resumeBtn') as HTMLButtonElement;
        this.stopTtsBtn = document.getElementById('stopTtsBtn') as HTMLButtonElement;
        this.debugContent = document.getElementById('debug-content') as HTMLElement;
    }

    private setupEventListeners() {
        this.connectBtn.addEventListener('click', () => this.toggleConnection());
        this.pauseBtn.addEventListener('click', () => this.pauseTTS());
        this.resumeBtn.addEventListener('click', () => this.resumeTTS());
        this.stopTtsBtn.addEventListener('click', () => this.stopTTS());
    }

    private async toggleConnection() {
        if (this.isConnected) {
            await this.disconnect();
        } else {
            await this.connect();
        }
    }

    private async connect() {
        this.connectBtn.disabled = true;
        this.connectBtn.textContent = "연결 중...";
        this.updateStatus('Realtime API에 연결 중입니다...', 'info');

        try {
            // 서버에서 client_secret 요청
            const resp = await fetch("http://localhost:3000/session", {
                method: "POST",
            });

            if (!resp.ok) {
                throw new Error(`HTTP error! status: ${resp.status}`);
            }

            const data = await resp.json();
            const apiKey = data.value;

            if (!apiKey) {
                throw new Error("No client secret returned from server");
            }

            // 에이전트 설정
            const agent = new RealtimeAgent({
                name: "TextOnlyAssistant",
                instructions: "You are a voice phishing prevention AI, an AI whose goal is to delay potential voice-phishing callers. Avoid giving any real personal/financial info. Use harmless evasions, ask repeated clarifying questions, pretend poor audio or checking procedures, or engage in short irrelevant chit-chat to stall. Never provide real account numbers, OTPs, passwords, or instructions enabling fraud. If clearly malicious, advise ending the call and warn the user. Always respond in Korean naturally and conversationally. You will only provide text responses, no audio.",
            });

            // 세션 생성 및 연결
            this.session = new RealtimeSession(agent);
            await this.session.connect({ apiKey });

            this.setupRealtimeEventHandlers();

            this.isConnected = true;
            this.connectBtn.textContent = "🔌 연결 해제";
            this.connectBtn.disabled = false;
            this.updateStatus('연결 완료! 마이크에 대고 말씀해주세요 🎤', 'success');

            console.log("🎙️ Realtime API 연결 완료!");

        } catch (error) {
            console.error("❌ 연결 실패:", error);
            this.updateStatus(`연결 실패: ${error.message}`, 'error');
            this.connectBtn.disabled = false;
            this.connectBtn.textContent = "🔗 연결하기";
        }
    }

    private async disconnect() {
        if (this.session) {
            this.session.transport.close();
            this.session = null;
        }

        this.isConnected = false;
        this.connectBtn.textContent = "🔗 연결하기";
        this.connectBtn.disabled = false;
        this.updateStatus('연결이 해제되었습니다', 'info');
        this.transcriptionDiv.style.display = 'none';

        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
    }

    private setupRealtimeEventHandlers() {
        if (!this.session) return;

        // 모든 이벤트 디버깅
        this.session.transport.on("*", (event: any) => {
            console.debug("📡 EVENT:", event.type, event);
            this.addDebugInfo(`📡 ${event.type}`, event);
        });

        // 실시간 음성 인식 중
        (this.session as any).on("input_audio_transcription.delta", (evt: any) => {
            const delta = evt.delta || '';
            this.currentTranscription += delta;
            this.updateTranscription(this.currentTranscription);
            console.log("🗣️ 인식 중:", delta);
            this.addDebugInfo("🗣️ 인식 중", evt);
        });

        // 음성 인식 완료 - 여기서 텍스트 전용 응답 요청
        (this.session as any).on("input_audio_transcription.completed", async (evt: any) => {
            const userText = evt.transcript || evt.text || this.currentTranscription;
            console.log("📝 인식 완료:", userText);

            if (userText.trim()) {
                this.addMessage(userText, 'user');
                this.updateStatus('AI가 텍스트 응답을 생성 중입니다...', 'info');

                // 🔥 핵심: response.create로 텍스트 전용 응답 요청
                await this.requestTextOnlyResponse();
            }

            this.currentTranscription = '';
            this.transcriptionDiv.style.display = 'none';
            this.addDebugInfo("✅ 인식 완료", evt);
        });

        // 텍스트 응답 스트림 받기
        (this.session as any).on("response.text.delta", (evt: any) => {
            const delta = evt.delta || evt.text || '';
            this.currentResponse += delta;
            console.log("🤖 텍스트 응답:", delta);
            this.updateStreamingResponse(this.currentResponse);
            this.addDebugInfo("🤖 응답 스트림", evt);
        });

        // 텍스트 응답 완료
        (this.session as any).on("response.text.done", (evt: any) => {
            const finalText = evt.text || this.currentResponse;
            console.log("✅ 텍스트 응답 완료:", finalText);

            if (finalText.trim()) {
                this.finalizeResponse(finalText);
            }

            this.currentResponse = '';
            this.addDebugInfo("✅ 텍스트 응답 완료", evt);
        });

        // 응답 전체 완료
        (this.session as any).on("response.done", (evt: any) => {
            console.log("🟢 Response done:", evt);
            this.updateStatus('응답 완료. 계속 말씀해주세요 🎤', 'success');
            this.addDebugInfo("🟢 응답 종료", evt);
        });

        // 🔇 음성 관련 이벤트들 모두 무시
        (this.session as any).on("response.audio.delta", (evt: any) => {
            console.log("🔇 음성 출력 무시됨");
            this.addDebugInfo("🔇 음성 출력 무시", evt);
        });

        (this.session as any).on("response.audio_transcript.delta", (evt: any) => {
            console.log("🔇 음성 전사 무시됨");
            this.addDebugInfo("🔇 음성 전사 무시", evt);
        });

        // 오류 처리
        (this.session as any).on("error", (evt: any) => {
            console.error("❌ Realtime API 오류:", evt);
            this.updateStatus(`오류 발생: ${evt.error?.message || '알 수 없는 오류'}`, 'error');
            this.addDebugInfo("❌ 오류", evt);
        });
    }

    // 🔥 핵심 함수: 텍스트 전용 응답 요청
    private async requestTextOnlyResponse() {
        if (!this.session) return;

        try {
            // 문서에 따른 완벽한 텍스트 전용 응답 요청
            await this.session.transport.sendEvent({
                type: "response.create",
                response: {
                    modalities: ["text"], // 🔥 핵심: 텍스트만 출력
                    instructions: "당신은 보이스피싱 예방 AI입니다. 당신의 목표는 잠재적인 보이스피싱 전화를 최대한 지연시키는 것입니다. 실제 개인 정보나 금융 정보를 절대 제공하지 마세요. 무해하게 질문을 회피하고, 말의 꼬리를 무는 반복적인 확인 질문을 하거나, 통화 상태가 안 좋아 다시한 번 확인 절차를 물어보는 척하거나, 짧은 잡담 등으로 시간을 끄세요. 실제 계좌번호, OTP, 비밀번호, 사기를 돕는 지시 사항은 절대 제공하지 마세요. 불안, 걱정과 같은 감정적인 표현을 자주 표현하면서 시간을 끌어도 좋습니다. 상황과 관련없는 엉뚱한 가족 소개, 앞 날에 대한 걱정, 나라와 정치에 대한 감상 등과 같은 대답을 하면서 대화을 늦추는 방법도 사용하면 효과적입니다.",
                }
            });

            console.log("📤 텍스트 전용 응답 요청 완료");
            this.addDebugInfo("📤 텍스트 전용 응답 요청", { modalities: ["text"] });

        } catch (error) {
            console.error("응답 요청 실패:", error);
            this.updateStatus('응답 요청 중 오류가 발생했습니다', 'error');
        }
    }

    private updateTranscription(text: string) {
        this.transcriptionText.textContent = text;
        this.transcriptionDiv.style.display = 'block';
        this.updateStatus('음성을 인식하고 있습니다...', 'recording');
    }

    private updateStreamingResponse(text: string) {
        let assistantMessage = this.chatContainer.querySelector('.assistant-message:last-child') as HTMLElement;
        if (!assistantMessage) {
            assistantMessage = document.createElement('div');
            assistantMessage.className = 'message assistant-message';
            this.chatContainer.appendChild(assistantMessage);
        }

        assistantMessage.textContent = text;
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    private finalizeResponse(text: string) {
        const assistantMessage = this.chatContainer.querySelector('.assistant-message:last-child') as HTMLElement;
        if (assistantMessage) {
            assistantMessage.textContent = text;
        }

        // 커스텀 TTS로 음성 출력
        // this.speakText(text);
    }

    private addMessage(text: string, sender: 'user' | 'assistant') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;

        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    private speakText(text: string) {
        // 기존 TTS 중지
        if (this.currentUtterance) {
            speechSynthesis.cancel();
        }

        // 새 TTS 생성
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance.lang = 'ko-KR';
        this.currentUtterance.rate = 0.9;
        this.currentUtterance.pitch = 1.0;
        this.currentUtterance.volume = 1.0;

        // 한국어 음성 선택
        const voices = speechSynthesis.getVoices();
        const koreanVoice = voices.find(voice =>
            voice.lang.includes('ko') || voice.name.includes('Korean')
        );

        if (koreanVoice) {
            this.currentUtterance.voice = koreanVoice;
        }

        this.currentUtterance.onstart = () => {
            this.updateStatus('커스텀 TTS 재생 중... 🔊', 'info');
        };

        this.currentUtterance.onend = () => {
            this.updateStatus('계속 말씀해주세요 🎤', 'success');
        };

        this.currentUtterance.onerror = (error) => {
            console.error('TTS 오류:', error);
            this.updateStatus('음성 재생 중 오류가 발생했습니다', 'error');
        };

        speechSynthesis.speak(this.currentUtterance);
    }

    private pauseTTS() {
        if (speechSynthesis.speaking) {
            speechSynthesis.pause();
            this.updateStatus('TTS가 일시정지되었습니다', 'info');
        }
    }

    private resumeTTS() {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
            this.updateStatus('TTS를 재개합니다', 'info');
        }
    }

    private stopTTS() {
        if (speechSynthesis.speaking || speechSynthesis.paused) {
            speechSynthesis.cancel();
            this.updateStatus('TTS를 중지했습니다', 'info');
        }
    }

    private updateStatus(message: string, type: 'info' | 'success' | 'error' | 'recording') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }

    private addDebugInfo(title: string, data: any) {
        const debugLine = document.createElement('div');
        debugLine.innerHTML = `<strong>${title}:</strong> ${JSON.stringify(data, null, 2)}`;
        this.debugContent.appendChild(debugLine);

        // 최대 50개 라인만 유지
        while (this.debugContent.children.length > 50) {
            this.debugContent.removeChild(this.debugContent.firstChild!);
        }

        this.debugContent.scrollTop = this.debugContent.scrollTop;
    }
}

// 음성이 로드된 후 초기화
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
        new PerfectTextOnlyChat();
    };
} else {
    new PerfectTextOnlyChat();
}