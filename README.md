# KART Frontend

국내 금융시장 정보를 탐색하고 AI 인사이트를 확인할 수 있는 KART 프론트엔드입니다.
화면은 K-Market Navigator Backend의 `/api/v1` 계약과 연결되어 있습니다. 시세·AI 데이터가 없을 때 임의의 값을 만들지 않고 로딩, 빈 상태 또는 오류 상태를 표시합니다.

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

기본 개발 API 주소는 `https://168.107.61.81`이며 Vite가 `/api` 요청을 프록시합니다. 로컬 Backend를 사용하려면 아래처럼 지정합니다.

```bash
VITE_DEV_API_TARGET=http://127.0.0.1:8080 npm run dev
```

Vercel에서는 `vercel.json`이 같은 출처의 `/api/*` 요청을 Backend로 프록시합니다. Backend가 CORS를 허용하지 않으므로 Vercel의 `VITE_API_BASE_URL`은 등록하지 않습니다. 값이 이미 있다면 삭제해야 합니다.

별도 도메인에서 CORS가 설정된 Backend를 직접 호출할 때만 다음 변수를 사용합니다.

```bash
VITE_API_BASE_URL=https://your-backend.example.com
```

브라우저에는 Backend URL만 노출되며 OpenAI, KIS, KRX, OpenDART 키는 절대 설정하지 않습니다.

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

## 브랜치 운영

- 기능 작업: `ENH/*` 브랜치
- 통합 대상: `develop`
- 운영 승격: 검증 완료 후 담당자 승인 시에만 `develop`에서 `main`으로 승격
