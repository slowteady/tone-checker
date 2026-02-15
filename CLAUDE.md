# 이 말투 어때 (Check My Tone) - 프로젝트 문서

## 🎯 프로젝트 개요

**서비스명**: 이 말투 어때 (Check My Tone)
**플랫폼**: 앱인토스 (Toss Mini Apps) - 토스 앱 내 미니앱
**목표**: AI 기반 커뮤니케이션 도우미 — 메시지 생성 + 말투 교정
**개발자**: 이용민 (1인 개발)

## 🏗️ 기술 스택

### Core Framework

- **Granite**: 토스 미니앱 프레임워크 (@granite-js/*)
- **React Native**: 0.72.6
- **React**: 18.2.0
- **TypeScript**: 5.8.3

### State Management

- **Zustand**: 5.0.10 (클라이언트 상태)
- **React Query**: 5.90.20 (서버 상태)

### UI & Styling

- **TDS (Toss Design System)**: @toss/tds-react-native 1.3.8
- **TDS Colors**: @toss/tds-colors 0.1.0

### Backend & Database

- **Supabase**: 2.91.1 (PostgreSQL 17)
  - 프로젝트 ID: `ccrqlwfeaklvtwbhdexp`
  - 호스트: `db.ccrqlwfeaklvtwbhdexp.supabase.co`
  - 리전: ap-southeast-1 (싱가포르)

### Developer Tools

- **Sentry**: 7.11.0 (에러 추적)
- **Zod**: 4.3.6 (스키마 검증)
- **ESLint**: 9.17.0
- **Prettier**: 3.4.2

## 📁 프로젝트 구조

```
tone-checker/
├── docs/                          # 기획서, 설계 문서, 구현 계획                     
├── src/
│   ├── pages/
│   │   ├── index.tsx              # 메인 페이지 (분석 입력)
│   │   └── loading/index.tsx      # 로딩/분석 페이지
│   ├── components/
│   │   ├── ResultCard.tsx         # 분석 결과 카드
│   │   ├── AnalysisBottomSheet.tsx # 분석 진행 시트
│   │   ├── AdBottomSheet.tsx      # 광고 시트
│   │   ├── UsageLimitNotice.tsx   # 사용 한도 알림
│   │   ├── SignalCard.tsx         # 신호 카드
│   │   ├── CopyCard.tsx           # 복사 카드
│   │   ├── Progressbar.tsx        # 점수 프로그레스바
│   │   └── ErrorResult.tsx        # 에러 화면
│   ├── hooks/
│   │   ├── useRemainingUsage.ts   # 잔여 사용량 조회
│   │   ├── useDeviceInit.tsx      # 디바이스 초기화
│   │   └── useClipboardCopy.ts    # 클립보드 복사
│   ├── stores/
│   │   ├── form.ts                # 입력 폼 상태
│   │   ├── device.ts              # 디바이스 ID
│   │   └── result.ts              # 분석 결과
│   ├── constants/
│   │   ├── categoryScoresMap.ts   # 분석 카테고리 매핑
│   │   ├── params.ts              # 관계/상황 옵션
│   │   └── endpoint.ts            # API 엔드포인트
│   ├── api/
│   │   └── usage.ts               # Supabase RPC 호출
│   ├── lib/
│   │   ├── schema.ts              # Zod 스키마/타입
│   │   └── sentry.ts              # 에러 추적 유틸
│   └── _app.tsx                   # 앱 루트 컴포넌트
├── pages/
│   ├── index.tsx                  # 라우트 진입점
│   └── _404.tsx                   # 404 페이지
├── granite.config.ts              # Granite 설정
├── package.json
└── tsconfig.json
```

## 🗄️ 데이터베이스 스키마

### `devices` 테이블

익명 사용자를 구분하기 위한 디바이스 테이블 (RLS 활성)

```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  device_id TEXT UNIQUE NOT NULL,  -- 앱에서 생성한 익명 디바이스 ID
  platform TEXT,                    -- 플랫폼 정보
  last_seen_at TIMESTAMPTZ         -- 마지막 접속 시각
);
```

### `daily_usage` 테이블

디바이스별 일자 기준 무료/보상 사용량 집계 테이블 (RLS 활성)

```sql
CREATE TABLE daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,              -- 익명 디바이스 식별자
  date DATE NOT NULL,                   -- 사용량 집계 기준 날짜
  free_limit INTEGER DEFAULT 3,         -- 하루 무료 제공량
  used_count INTEGER DEFAULT 0,         -- 오늘 총 분석 사용 횟수
  rewarded_limit INTEGER DEFAULT 5,     -- 보상 광고 충전 가능 최대 횟수
  rewarded_count INTEGER DEFAULT 0,     -- 광고 시청으로 충전된 횟수
  rewarded_used_count INTEGER DEFAULT 0, -- 보상 사용 횟수
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RPC Functions

```sql
-- 오늘의 사용 현황 조회
rpc_get_today_status(device_id TEXT)

-- 보상 광고 1회 충전
rpc_reward_once(device_id TEXT)
```

## 🔍 톤 분석 카테고리

### 5개 주요 카테고리

```typescript
{
  emotion_attitude: '감정·태도',      // 감정 표현의 적절성
  politeness_respect: '예의·존중',    // 예의와 존중의 수준
  clarity_delivery: '명확·전달력',    // 메시지의 명확성
  context_fit: '상황·관계 적합',      // 상황과 관계에 맞는지
  conflict_safety: '갈등 안정성'      // 갈등 유발 가능성
}
```

### 10개 세부 항목

```typescript
{
  warmth_empathy: '공감도',           // 따뜻함과 공감
  emotional_stability: '안정감',      // 감정적 안정성
  politeness: '예의성',               // 예의 바름
  softness: '부드러움',               // 표현의 부드러움
  non_aggressive: '비공격성',         // 공격성 없음
  conflict_mitigation: '갈등완화',    // 갈등을 완화하는 능력
  clarity: '명확성',                  // 메시지의 명확함
  actionability: '행동명확성',        // 행동 지시의 명확함
  formality_fit: '격식',              // 격식의 적절성
  low_misinterpretation_risk: '의도명확' // 오해 가능성 낮음
}
```

## 🎬 API 구조

### Supabase Edge Functions

```typescript
// 톤 분석 API
POST /analyze-tone
{
  text: string,           // 분석할 텍스트
  relationship: string,   // 관계 (친구, 동료, 상사 등)
  situation: string       // 상황 (요청, 거절, 사과 등)
}

// 사용량 조회
RPC rpc_get_today_status
{
  device_id: string
}

// 보상 광고 충전
RPC rpc_reward_once
{
  device_id: string
}
```

## 💡 비즈니스 로직

### 사용량 관리

- **무료 사용**: 1일 3회 제공
- **보상 광고**: 광고 시청 시 1회 충전 (최대 5회까지)
- **리셋**: 매일 자정(로컬 시간) 사용량 초기화

### 디바이스 식별

- 앱 최초 실행 시 익명 디바이스 ID 생성
- 로컬 저장소에 보관 (재설치 시 새 ID)
- 회원가입/로그인 불필요

## 🛠️ 개발 가이드

### 환경 변수

```bash
# Sentry
SENTRY_DSN=<sentry-dsn>

# Google AdMob
REWARD_AD_ID=<production-ad-id>
REWARD_AD_DEV_ID=<development-ad-id>

# Supabase
SUPABASE_URL=https://ccrqlwfeaklvtwbhdexp.supabase.co
SUPABASE_ANON_KEY=<anon-key>
```

### 개발 서버 실행

```bash
cd tone-checker
npm run dev
```

### 빌드

```bash
npm run build       # 프로덕션 빌드
npm run build:dev   # 개발 빌드
```

### 코드 품질

```bash
npm run typecheck   # TypeScript 타입 체크
npm run lint        # ESLint
npm test            # Jest 테스트
```

## 📋 코딩 컨벤션

### Git 커밋 메시지

```
feat: 새로운 기능 추가
fix: 버그 수정
refactor: 코드 리팩토링
docs: 문서 수정
style: 코드 포맷팅
test: 테스트 추가/수정
chore: 빌드 작업, 패키지 매니저 설정

예시: feat: add AI improvement suggestion
```

### TypeScript

- 모든 파일 TypeScript 사용
- `any` 타입 지양, 명시적 타입 정의
- Zod 스키마로 런타임 검증

### React Query

- 서버 상태는 React Query로 관리
- `useSuspenseQuery` 활용
- `gcTime`, `staleTime` 적절히 설정

### Zustand

- 클라이언트 상태는 Zustand로 관리
- 도메인별로 store 분리 (form, device, result)

### TDS 컴포넌트

- 우선적으로 TDS 컴포넌트 사용
- 커스텀 컴포넌트는 최소화
- 디자인 일관성 유지

## 📝 문서 관리

모든 프로젝트 문서는 `docs/` 폴더에서 관리한다. 외부 도구(Notion 등)는 사용하지 않는다.

```
docs/
└── XX-<topic>.md   # 번호순 정렬 (01-project-overview.md, 02-user-flow.md ...)
```

### 문서 작성 원칙

- 기획/설계/구현 계획은 `docs/`에 번호-주제 형식으로 작성
- 문서는 git으로 버전 관리
- 구현 시 해당 설계 문서를 직접 참조
- 완료된 계획은 삭제하지 않고 이력으로 보존

### 작업 전 필수 참조

- **기능 구현/변경 전** 반드시 `docs/`의 관련 설계 문서를 먼저 읽을 것
- 설계 문서에 정의된 스펙과 일치하는지 확인하면서 작업할 것
- 설계 문서가 없는 새 기능은 구현 전 설계 문서부터 작성할 것

## 🔧 MCP 및 Skills 활용

### 앱인토스 / TDS 문서 조회

**apps-in-toss MCP (AX)를 사용하세요:**

앱인토스 공식 MCP 서버. 미니앱 개발 문서, TDS 컴포넌트, 코드 예제를 직접 제공.

| 도구 | 설명 |
|------|------|
| `search_docs` | 앱인토스 개발 문서 검색 |
| `get_doc` | 문서 전체 내용 조회 |
| `search_tds_rn_docs` | TDS React Native 컴포넌트 문서 검색 |
| `get_tds_rn_doc` | TDS RN 문서 전체 내용 조회 |
| `list_examples` | 코드 예제 목록 조회 |
| `get_example` | 특정 예제 코드 조회 |

```
"앱인토스 광고 API 사용법" → search_docs → get_doc
"TDS Button 컴포넌트" → search_tds_rn_docs → get_tds_rn_doc
"미니앱 예제 코드" → list_examples → get_example
```

### 라이브러리 문의 시

**context7 MCP를 사용하세요:**

```
"React Query의 useSuspenseQuery 예제"
"Zustand store 패턴"
```

### 개발 작업 시

**Skills를 먼저 참고하세요:**

- `superpowers:brainstorming` - 기능 설계 전
- `superpowers:writing-plans` - 구현 계획 수립
- `superpowers:test-driven-development` - 기능 구현 시
- `superpowers:systematic-debugging` - 버그 발생 시
- `superpowers:verification-before-completion` - 완료 전 검증

### 데이터베이스 작업

**Supabase MCP를 사용하세요:**

```
"Supabase에서 오늘 사용자 수 조회해줘"
"daily_usage 테이블에서 광고 시청한 사용자 수"
```

## 🚀 배포

### 앱인토스 배포

Granite CLI를 통해 배포:

```bash
npm run build
# 토스 앱인토스 콘솔에서 업로드
```

### Supabase

- 프로덕션 프로젝트만 사용 (dev/prod 미분리)
- RLS 정책 필수 확인
- 마이그레이션은 Supabase 대시보드에서 수동 적용

## 📚 참고 자료

- [앱인토스 공식 문서](https://developers-apps-in-toss.toss.im/)
- [Granite 문서](https://github.com/toss/apps-in-toss-examples)
- [TDS React Native](https://toss.im/tds)
- [Supabase 문서](https://supabase.com/docs)
