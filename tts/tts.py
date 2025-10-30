import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("SUPERTONE_API_KEY")
VOICE_ID = "hxVwCRpvnRUbSNcDRvxucE"  # 네 voice_id

URL = f"https://supertoneapi.com/v1/text-to-speech/{VOICE_ID}"

text = "아, 죄송한데요… 저는 그런 통장을 만든 적이 전혀 없어요. 혹시 어떤 은행이고 언제라고 하시는지 조금만 자세히 알 수 있을까요? 최근에 제 개인정보가 어떻게 쓰였는지 전혀 몰라서 당황스럽네요. 일단 제가 도와드릴 수 있는 건 최대한 도와드겠으니 차근차근 알려주세요."

payload = {
    "text": text,
    "language": "ko",
    "style": "neutral",
    "model": "sona_speech_1",
    "word_gap": 0.5,
    "sentence_gap":0.5,
}

headers = {
    "x-sup-api-key": API_KEY,
    "Content-Type": "application/json"
}

print("🎤 TTS 요청 중...")

response = requests.post(URL, json=payload, headers=headers)

if response.status_code != 200:
    print("❌ 오류:", response.text)
else:
    print("✅ 음성 생성 완료, 파일 저장합니다...")
    with open("output.wav", "wb") as f:
        f.write(response.content)
    print("🎧 output.wav 저장 완료! 재생해보세요.")