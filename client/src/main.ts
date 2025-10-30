import { RealtimeAgent, RealtimeSession } from "@openai/agents/realtime";

class PerfectTextOnlyChat {
    private session: RealtimeSession | null = null;
    private isConnected = false;
    private currentUtterance: SpeechSynthesisUtterance | null = null;
    private currentTranscription = '';
    private currentResponse = '';
    private currentAudio: HTMLAudioElement | null = null;
    private isPlayingTTS = false;

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

            // 에이전트 설정. 실제 api로 반영 안됨. 프론트에서 보는 용도
            const agent = new RealtimeAgent({
                name: "TextOnlyAssistant",
                instructions: "You are an AI designed to prevent voice phishing.",
            });

            // 세션 생성 및 연결
            this.session = new RealtimeSession(agent);
            await this.session.connect({ apiKey });

            // 🔥 핵심: 연결 후 세션을 텍스트 전용으로 업데이트
            await this.updateSessionToTextOnly();

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
        // this.session.transport.on("*", (event: any) => {
        //     console.debug("📡 EVENT:", event.type, event);
        //     this.addDebugInfo(`📡 ${event.type}`, event);
        // });

        // 원하는 이벤트 사용
        this.session.transport.on("*", (event: any) => {
            if (event.type === "response.output_text.done") {
                this.addDebugInfo(`📡 ${event.type}`, event);
                console.log("📝 최종 텍스트 응답:", event.text);
                // 필요한 작업을 여기에 작성
                // 예: 화면에 표시하거나 변수에 저장
            }
        });

        // 텍스트 응답 완료
        this.session.transport.on("response.output_text.done", (evt: any) => {
            const finalText = evt.text || this.currentResponse;
            console.log("✅ 텍스트 응답 완료:", finalText);

            // 🔥 TTS 재생 중이면 응답 무시
            if (this.isPlayingTTS) {
                console.log("🔇 TTS 재생 중이므로 새로운 응답 무시");
                this.addDebugInfo("🔇 응답 무시 (TTS 재생 중)", evt);
            } else {
                this.finalizeResponse(finalText);
            }
        });

        // // 응답 전체 완료
        // (this.session as any).on("response.done", (evt: any) => {
        //     console.log("🟢 Response done:", evt);
        //     this.updateStatus('응답 완료. 계속 말씀해주세요 🎤', 'success');
        //     this.addDebugInfo("🟢 응답 종료", evt);
        // });

        // // 🔇 음성 관련 이벤트들 모두 무시
        // (this.session as any).on("response.audio.delta", (evt: any) => {
        //     console.log("🔇 음성 출력 무시됨");
        //     this.addDebugInfo("🔇 음성 출력 무시", evt);
        // });

        // (this.session as any).on("response.audio_transcript.delta", (evt: any) => {
        //     console.log("🔇 음성 전사 무시됨");
        //     this.addDebugInfo("🔇 음성 전사 무시", evt);
        // });

        // (this.session as any).on("response.output_audio_transcript.delta", (evt: any) => {
        //     console.log("🔇 출력 음성 전사 무시됨");
        //     this.addDebugInfo("🔇 출력 음성 전사 무시", evt);
        // });

        // (this.session as any).on("response.output_audio.delta", (evt: any) => {
        //     console.log("🔇 출력 음성 무시됨");
        //     this.addDebugInfo("🔇 출력 음성 무시", evt);
        // });

        // 오류 처리
        (this.session as any).on("error", (evt: any) => {
            console.error("❌ Realtime API 오류:", evt);
            this.updateStatus(`오류 발생: ${evt.error?.message || '알 수 없는 오류'}`, 'error');
            this.addDebugInfo("❌ 오류", evt);
        });
    }

    // 🔥 핵심 함수: 세션을 텍스트 전용으로 업데이트
    private async updateSessionToTextOnly() {
        if (!this.session) return;

        try {
            const event = {
                type: "session.update",
                session: {
                    type: "realtime", // 🔥 필수 파라미터 추가
                    model: "gpt-4o-realtime-preview-2024-12-17", // 모델도 명시
                    output_modalities: ["text"], // 🔥 텍스트만 출력
                    instructions: "당신은 보이스피싱 예방을 위한 사람입니다. 당신의 목표는 전화를 최대한 지연시켜 상대의 시간을 낭비하게 하는 것입니다. 대답은 2문장 이내로 해야합니다. 뒤의 예제 내용도 2문장 내에 포함 시킬 수 있도록 하세요. 말의 꼬리를 무는 반복적인 확인 질문을 해도 좋습니다. 상황과 관련있는 짧은 잡담, 가족 소개, 앞 날에 대한 걱정, 나라와 정치에 대한 감상 등과 같은 내용도 추가하면서 대화를 늦추는 방법도 사용하면 효과적입니다. 실제 계좌번호, OTP, 비밀번호와 같은 정보를 요구하면 실제로 존재하지 않는 가짜 정보를 제시하고 사기를 돕는 지시 사항은 따라하는 척만 해주세요. 말하는게 자연스러울 수 있도록 구어체를 구사하세요."
                }
            };

            await this.session.transport.sendEvent(event);
            console.log("🔥 세션을 텍스트 전용으로 업데이트 완료");
            this.addDebugInfo("🔥 세션 업데이트", event);

        } catch (error) {
            console.error("세션 업데이트 실패:", error);
            this.updateStatus('세션 업데이트 중 오류가 발생했습니다', 'error');
        }
    }

    // 🔥 핵심 함수: 텍스트 전용 응답 요청
    private async requestTextOnlyResponse() {
        if (!this.session) return;

        try {
            // 이제 session.update로 이미 텍스트 전용으로 설정되어 있으므로 
            // response.create에서 modalities 설정 불필요
            await this.session.transport.sendEvent({
                type: "response.create",
                response: {
                    // modalities는 세션 레벨에서 이미 설정됨
                }
            });

            console.log("📤 텍스트 전용 응답 요청 완료");
            this.addDebugInfo("📤 텍스트 전용 응답 요청", {});

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
        console.log("text " + text)
        // 커스텀 TTS로 음성 출력
        this.speakText(text);
    }

    private addMessage(text: string, sender: 'user' | 'assistant') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;

        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    private async speakText(text: string) {
        // 🔥 이미 TTS가 재생 중이면 새로운 요청 무시
        if (this.isPlayingTTS) {
            console.log("�  TTS 재생 중이므로 새로운 TTS 요청 무시");
            return;
        }

        try {
            this.isPlayingTTS = true;
            this.updateStatus('Supertone TTS 생성 중... 🎤', 'info');
            console.log(`🎤 TTS 요청: ${text.substring(0, 50)}...`);

            // Node.js 서버의 TTS 엔드포인트로 요청
            const response = await fetch('http://localhost:3000/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                throw new Error(`TTS 요청 실패: ${response.status}`);
            }

            // 음성 데이터를 Blob으로 받기
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            // Audio 객체로 바로 재생 (파일 저장 없음!)
            this.currentAudio = new Audio(audioUrl);

            this.currentAudio.onloadstart = () => {
                this.updateStatus('Supertone TTS 재생 중... 🔊', 'info');
            };

            this.currentAudio.onended = () => {
                this.isPlayingTTS = false;
                this.currentAudio = null;
                this.updateStatus('계속 말씀해주세요 🎤', 'success');
                URL.revokeObjectURL(audioUrl); // 메모리 정리
            };

            this.currentAudio.onerror = (error) => {
                console.error('TTS 재생 오류:', error);
                this.isPlayingTTS = false;
                this.currentAudio = null;
                this.updateStatus('음성 재생 중 오류가 발생했습니다', 'error');
                URL.revokeObjectURL(audioUrl);
            };

            // 🔥 재생 중 상태 추적
            this.currentAudio.onpause = () => {
                this.isPlayingTTS = false;
            };

            this.currentAudio.onplay = () => {
                this.isPlayingTTS = true;
            };

            await this.currentAudio.play();
            console.log("✅ Supertone TTS 재생 시작");

        } catch (error) {
            console.error('TTS 오류:', error);
            this.isPlayingTTS = false;
            this.updateStatus(`TTS 오류: ${error.message}`, 'error');

            // 실패 시 브라우저 TTS로 폴백
            console.log("🔄 브라우저 TTS로 폴백...");
            this.fallbackToSpeechSynthesis(text);
        }
    }

    // 🔥 현재 재생 중인 TTS 중지
    private stopCurrentTTS() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }

        // 브라우저 TTS도 중지
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }

        this.isPlayingTTS = false;
    }

    private fallbackToSpeechSynthesis(text: string) {
        // 기존 브라우저 TTS (폴백용)
        if (this.currentUtterance) {
            speechSynthesis.cancel();
        }

        this.currentUtterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance.lang = 'ko-KR';
        this.currentUtterance.rate = 0.9;
        this.currentUtterance.pitch = 1.0;
        this.currentUtterance.volume = 1.0;

        const voices = speechSynthesis.getVoices();
        const koreanVoice = voices.find(voice =>
            voice.lang.includes('ko') || voice.name.includes('Korean')
        );

        if (koreanVoice) {
            this.currentUtterance.voice = koreanVoice;
        }

        this.currentUtterance.onstart = () => {
            this.updateStatus('브라우저 TTS 재생 중... 🔊', 'info');
        };

        this.currentUtterance.onend = () => {
            this.updateStatus('계속 말씀해주세요 🎤', 'success');
        };

        speechSynthesis.speak(this.currentUtterance);
    }

    private pauseTTS() {
        if (this.currentAudio && !this.currentAudio.paused) {
            this.currentAudio.pause();
            this.updateStatus('TTS가 일시정지되었습니다', 'info');
        } else if (speechSynthesis.speaking) {
            speechSynthesis.pause();
            this.updateStatus('TTS가 일시정지되었습니다', 'info');
        }
    }

    private resumeTTS() {
        if (this.currentAudio && this.currentAudio.paused) {
            this.currentAudio.play();
            this.updateStatus('TTS를 재개합니다', 'info');
        } else if (speechSynthesis.paused) {
            speechSynthesis.resume();
            this.updateStatus('TTS를 재개합니다', 'info');
        }
    }

    private stopTTS() {
        this.stopCurrentTTS();
        this.updateStatus('TTS를 중지했습니다', 'info');
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