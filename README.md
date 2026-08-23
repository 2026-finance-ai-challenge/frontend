# KART Frontend

국내 금융시장 정보를 탐색하고 AI 인사이트를 확인할 수 있는 KART 프론트엔드입니다.
현재 화면 데이터는 백엔드 연결 없이 하드코딩되어 있습니다.

## 로컬 실행

### 사전 준비

- Node.js `20.19.0` 이상 또는 `22.12.0` 이상
- npm

### 실행 방법

```bash
git clone https://github.com/2026-finance-ai-challenge/frontend.git
cd frontend
npm ci
npm run dev
```

개발 서버가 실행되면 브라우저에서 [http://localhost:5173](http://localhost:5173)에 접속합니다.

이미 저장소를 내려받았다면 `frontend` 디렉터리에서 아래 명령어만 실행하면 됩니다.

```bash
npm ci
npm run dev
```

## 기타 명령어

```bash
# 타입 검사 및 프로덕션 빌드
npm run build

# 타입 검사
npm run lint

# 빌드 결과물 로컬 미리보기
npm run preview
```

프로덕션 빌드 결과물은 `dist` 디렉터리에 생성됩니다.
