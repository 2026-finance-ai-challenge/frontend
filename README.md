# KART Frontend

국내 금융시장 정보를 탐색하고 AI 인사이트를 확인할 수 있는 KART 프론트엔드입니다.
화면은 K-Market Navigator Backend의 `/api/v1` 계약과 연결되어 있습니다. 시세·AI 데이터가 없을 때 임의의 값을 만들지 않고 로딩, 빈 상태 또는 오류 상태를 표시합니다.

## 로컬 실행

### 사전 준비

- Node.js `22.13.0` 이상 (CI는 Node.js `24` 사용)
- npm

### 실행 방법

```bash
git clone https://github.com/2026-finance-ai-challenge/frontend.git
cd frontend
npm ci
npm run dev
```

기본 개발·운영 API 주소는 `https://api.kartkr.cloud`입니다. 로컬 Backend를 사용하려면 아래처럼 지정합니다.

```bash
VITE_API_BASE_URL=http://127.0.0.1:8080 npm run dev
```

Vercel Production은 `main` 브랜치와 연결되어 있고 `api.kartkr.cloud`를 직접 호출합니다. 다른 Backend를 검증할 때만 다음 공개 변수를 바꿉니다.

```bash
VITE_API_BASE_URL=https://api.example.com
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

# 차트·세무 진입점·예측 게이지·국가 선택 회귀 테스트
npm test

# 빌드 결과물 로컬 미리보기
npm run preview
```

프로덕션 빌드 결과물은 `dist` 디렉터리에 생성됩니다.

## 화면 데이터 기준

- 홈과 뉴스 목록은 같은 중요도 정렬 API를 사용한다.
- What/Why/Impact는 EN과 KR 캐시를 분리한다. 캐시가 없을 때만 호버 후 생성을 요청하고 완료 시 새로고침 없이 갱신한다.
- EN 종목 상세는 USD를 주 가격, KRW를 보조 가격으로 표시하며 KR은 반대로 표시한다.
- EN 종목 등락액도 환율을 적용한 USD로 표시한다.
- KOSPI·KOSDAQ과 종목 상세 현재가는 Backend SSE를 구독하며, 1D 10분봉·1W 1시간봉·장기 일봉 차트에 OHLCV 툴팁과 거래량을 표시한다.
- 1D는 09:00~15:30 시간축을 유지한다. 1W·1M·3M·1Y는 API가 반환한 거래봉을 등간격으로 배치해 휴장일·야간의 빈 공간을 제거하며 날짜 라벨도 실제 거래봉에 맞춘다. 휴장일 가격을 생성하거나 거래량 0인 실제 봉을 제거하지 않는다.
- 모든 세율 확인 진입점은 같은 우측 Tax eligibility K-Agent를 사용한다. 이전 `/tax` 주소도 홈과 공통 드로어를 표시하며 세율·문서 상태·비교 결과는 Backend API에서 가져온다.
- 홈·전체 외국인 한도 목록·종목 상세 게이지는 장중에만 예측 범위와 기준점을 직전 보유율에 함께 표시한다. 법정 제한 종목, 당일 예측, 당일 `REGULAR` 시세가 모두 확인되어야 하며 장 마감 시 자동으로 숨긴다. 개장·마감 전환 시 API도 다시 조회한다. 미완료·전일 예측을 대신 표시하거나 값을 생성하지 않는다.
- 장중 예측은 화면이 보일 때 1분 간격으로 다시 조회하며, 백그라운드 탭에서는 중단하고 복귀 시 갱신한다.
- 국적·거주 국가 선택은 선택 가능 국가를 먼저, 같은 그룹은 표시 이름순으로 정렬한다. 현재 미국만 선택할 수 있고 나머지는 준비 중으로 표시한다.
- 뉴스·공시 원문과 정상 번역문만 텍스트 선택을 허용한다. 오류·로딩 안내는 선택되지 않으며 이를 가로지른 선택도 AI 질문에 전달하지 않는다.
- 화면 전환 시 새 페이지의 스크롤을 상단으로 초기화한다.

## 브랜치 운영

- 기능 작업: `feature/*`
- 통합 대상: `develop`
- 운영 승격: 검증 후 `develop` → `main` PR
