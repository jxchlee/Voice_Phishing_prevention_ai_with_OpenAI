import os
import requests
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import io

load_dotenv()

app = Flask(__name__)
CORS(app)  # 브라우저에서 직접 호출할 수 있도록 CORS 허용

API_KEY = os.getenv("SUPERTONE_API_KEY")
# VOICE_ID = "hxVwCRpvnRUbSNcDRvxucE"
VOICE_ID = "uRAbBLo6VEjhgDyKFPjxZU"
URL = f"https://supertoneapi.com/v1/text-to-speech/{VOICE_ID}"

@app.route('/tts', methods=['POST'])
def text_to_speech():
    try:
        # 요청에서 텍스트 받기
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        print(f"🎤 TTS 요청: {text[:50]}...")
        
        # Supertone API 호출
        payload = {
            "text": text,
            "language": "ko",
            "style": "neutral",
            "model": "sona_speech_1",
            "word_gap": 0.2,
            "sentence_gap": 0.2,
        }
        
        headers = {
            "x-sup-api-key": API_KEY,
            "Content-Type": "application/json"
        }
        
        response = requests.post(URL, json=payload, headers=headers)
        
        if response.status_code != 200:
            print("❌ Supertone API 오류:", response.text)
            return jsonify({'error': 'TTS API failed'}), 500
        
        print("✅ 음성 생성 완료, 브라우저로 전송...")
        
        # 파일 저장 없이 메모리에서 직접 전송
        audio_data = io.BytesIO(response.content)
        audio_data.seek(0)
        
        return send_file(
            audio_data,
            mimetype='audio/wav',
            as_attachment=False,
            download_name='tts_output.wav'
        )
        
    except Exception as e:
        print(f"❌ 서버 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'TTS 서버가 정상 작동 중입니다! 🎤'})

if __name__ == '__main__':
    print("🚀 TTS 서버 시작...")
    print("📍 http://localhost:5000/tts")
    print("📍 http://localhost:5000/health")
    app.run(host='0.0.0.0', port=5000, debug=True)