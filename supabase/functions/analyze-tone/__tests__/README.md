# analyze-tone Edge Function 테스트 가이드

## 사전 준비

### 1. Supabase CLI 설치

```bash
# macOS
brew install supabase/tap/supabase

# 버전 확인
supabase --version
```

### 2. 환경 변수 설정

`supabase/.env.local` 파일을 생성하고 다음 변수를 설정:

```bash
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 테스트 실행

### Step 1: Supabase 로컬 실행

```bash
# 프로젝트 루트에서
supabase start
```

> 처음 실행 시 Docker 이미지 다운로드로 시간이 걸릴 수 있습니다.

### Step 2: Edge Function 로컬 서버 실행

```bash
# 프로젝트 루트에서
supabase functions serve analyze-tone --env-file supabase/.env.local
```

> 서버가 `http://localhost:54321/functions/v1/analyze-tone`에서 실행됩니다.

### Step 3: 테스트 실행

**새 터미널 창을 열고:**

```bash
# 전체 테스트 실행
npm run test:edge

# Watch 모드로 실행 (파일 변경 시 자동 재실행)
npm run test:edge:watch
```

## 테스트 구조

```
__tests__/
├── helpers.ts           # 테스트 헬퍼 함수
├── integration.test.ts  # 통합 테스트
└── README.md           # 이 파일
```

## 테스트 케이스 목록

### 정상 케이스
- ✅ 비즈니스 관계, 중립 상황
- ✅ 개인 관계, 편안한 상황

### 입력 검증 에러
- ✅ 20자 미만 텍스트
- ✅ 800자 초과 텍스트
- ✅ 빈 텍스트
- ✅ device_id 누락
- ✅ 잘못된 relationship
- ✅ 잘못된 situation

### HTTP 메서드 검증
- ✅ GET 요청 (405 에러)

### 응답 스키마 검증
- ✅ suggestions 구조 및 길이 제한
- ✅ signals 구조 및 level 값

## 수동 테스트 (curl)

```bash
# 정상 케이스
curl -X POST http://localhost:54321/functions/v1/analyze-tone \
  -H "Content-Type: application/json" \
  -d '{
    "text": "내일 회의 참석 부탁드립니다",
    "device_id": "test-123",
    "relationship": "business",
    "situation": "neutral",
    "platform": "test"
  }'

# 20자 미만 에러
curl -X POST http://localhost:54321/functions/v1/analyze-tone \
  -H "Content-Type: application/json" \
  -d '{
    "text": "안녕",
    "device_id": "test-123",
    "relationship": "business",
    "situation": "neutral",
    "platform": "test"
  }'
```

## 트러블슈팅

### "Connection refused" 에러

Edge Function 서버가 실행 중인지 확인:

```bash
supabase functions serve analyze-tone --env-file supabase/.env.local
```

### "OPENAI_API_KEY missing" 에러

`.env.local` 파일 경로 및 내용 확인:

```bash
cat supabase/.env.local
```

### Docker 관련 에러

Supabase CLI는 Docker를 사용합니다. Docker Desktop이 실행 중인지 확인하세요.

## 배포 전 체크리스트

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run test:edge` → All tests passed
- [ ] 토스 앱 실기기 테스트 완료
- [ ] 환경 변수 프로덕션 값으로 변경 확인

## 참고

- [Supabase Edge Functions 문서](https://supabase.com/docs/guides/functions)
- [Deno Testing 문서](https://deno.land/manual/testing)
