#!/usr/bin/env python3
"""
Supertone TTS 서버 시작 스크립트
"""

import subprocess
import sys
import os

def install_requirements():
    """필요한 패키지 설치"""
    print("📦 필요한 패키지를 설치합니다...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ 패키지 설치 완료!")
    except subprocess.CalledProcessError as e:
        print(f"❌ 패키지 설치 실패: {e}")
        sys.exit(1)

def check_env():
    """환경 변수 확인"""
    if not os.path.exists('.env'):
        print("❌ .env 파일이 없습니다!")
        print("💡 .env 파일을 생성하고 SUPERTONE_API_KEY를 설정하세요.")
        sys.exit(1)
    
    from dotenv import load_dotenv
    load_dotenv()
    
    if not os.getenv("SUPERTONE_API_KEY"):
        print("❌ SUPERTONE_API_KEY가 설정되지 않았습니다!")
        sys.exit(1)
    
    print("✅ 환경 변수 확인 완료!")

def start_server():
    """TTS 서버 시작"""
    print("🚀 Supertone TTS 서버를 시작합니다...")
    print("📍 http://localhost:5000/tts")
    print("📍 http://localhost:5000/health")
    print("⏹️  종료하려면 Ctrl+C를 누르세요")
    
    try:
        subprocess.run([sys.executable, "tts_server.py"])
    except KeyboardInterrupt:
        print("\n👋 TTS 서버를 종료합니다.")

if __name__ == "__main__":
    print("🎤 Supertone TTS 서버 설정 중...")
    install_requirements()
    check_env()
    start_server()