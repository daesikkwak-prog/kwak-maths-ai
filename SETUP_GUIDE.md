# 프로젝트 세팅 가이드

## 1. 환경변수 (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=...        # Supabase → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # anon public key
SUPABASE_SERVICE_ROLE_KEY=...       # service_role secret key (서버 전용, 노출 금지)
GEMINI_API_KEY=...                  # https://aistudio.google.com 에서 발급
GEMINI_MODEL=                       # 선택. 미지정 시 gemini-3.6-flash
```

## 2. DB 스키마 적용

Supabase 대시보드 → SQL Editor에서 **순서대로** 실행합니다.

| 상황 | 실행할 파일 |
| --- | --- |
| 새 프로젝트 | `supabase/schema.sql` (마이그레이션 내용 포함됨) |
| 기존 프로젝트 | `supabase/migrations/001_problem_content_and_auth.sql` → `002_fix_unique_constraints.sql` → `003_problem_figure_svg.sql` |

> 002를 실행하기 전에 중복 데이터를 먼저 정리해야 합니다: `npx tsx scripts/dedupe-options.ts`

개발 단계에서는 RLS를 끈 상태로 사용합니다 (`supabase/disable-rls.sql`).
서버 라우트가 service_role 키로 접근하고 권한 검증은 애플리케이션에서 수행합니다.

## 3. 기초 데이터 + 관리자 계정

```bash
npm install
npm run seed                                   # 학년/난이도 선택지, AI 기준 기본값
npx tsx scripts/seed-units.ts                  # 초1~고3 교육과정 단원
npx tsx scripts/create-admin.ts admin 비밀번호   # 최초 관리자 계정 (학생 계정은 관리자 화면에서 생성)
npm run check-db                               # 스키마/데이터/계정 상태 점검
```

`npm run check-db`가 모두 ✅ 여야 정상 동작합니다.

## 4. 실행

```bash
npm run dev      # http://localhost:3000
npm run build    # 배포 전 빌드 확인
npm run typecheck
```

## 5. 최초 사용 순서

1. `/` 에서 관리자 계정으로 로그인
2. **단원 관리**에서 학년별 단원 등록 (단원이 없으면 문제은행은 "학년 전체 범위"로만 출제)
3. **AI 기준 관리**에서 공통/초·중·고 기준 확인 및 수정
4. **사용자 관리**에서 학생 계정 생성 (사용자명 + 비밀번호 + 학교급/학년 + 식 필수 여부)
5. 학생 계정으로 로그인 → 문제은행에서 문제를 받아 풀이 제출

## 6. Vercel 배포

**배포 주소: https://kwakmathsai.vercel.app** (Vercel 팀 `kwakpam`, 프로젝트 `kwak_maths_ai`)

### 재배포

```bash
npx vercel --prod --yes
```

### 최초 세팅 / 다른 환경에서 다시 할 때

```bash
npx vercel login
npx vercel link --yes --scope kwakpam
./scripts/setup-vercel-env.sh   # .env.local 값을 production/preview/development에 등록
npx vercel --prod --yes
```

`NEXT_PUBLIC_*`은 Config(평문), 서버 전용 키는 Secret으로 저장됩니다.

> `SUPABASE_SERVICE_ROLE_KEY`에는 `NEXT_PUBLIC_` 접두사를 붙이지 마세요. 붙이면 브라우저로 노출돼 DB 전체 권한이 새어나갑니다.

### 배포 후 확인 항목

- `https://kwakmathsai.vercel.app/api/health` → `{"success":true,...}`
- 관리자 로그인 (세션 쿠키가 `Secure`라 HTTPS에서만 동작 — Vercel은 기본 HTTPS)
- 문제은행에서 문제 출제 1건 (Gemini 키가 프로덕션에 반영됐는지 확인)

### GitHub 자동 배포 (미연결)

`npx vercel git connect`가 실패합니다 — Vercel의 GitHub App이 `daesikkwak-prog/kwak-maths-ai`에
설치돼 있지 않기 때문입니다. 푸시할 때마다 자동 배포를 원하면
vercel.com → 프로젝트 → Settings → Git에서 저장소를 연결하세요.
연결 전에는 위 `npx vercel --prod --yes`로 수동 배포합니다.

## 유용한 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run seed` | 기초 데이터 시드 (여러 번 실행해도 안전) |
| `npm run check-db` | 마이그레이션/데이터/계정 점검 |
| `npm run create-admin -- <아이디> <비번>` | 관리자 생성 또는 비밀번호 재설정 |
| `npx tsx scripts/test-gemini.ts` | Gemini API Key·모델 연결 확인 |
| `curl localhost:3000/api/health` | 서버 동작 확인 |
| `npx tsx scripts/seed-units.ts` | 초1~고3 교육과정 단원 시드 |
| `npx tsx scripts/check-units.ts` | 학년별 등록 단원 확인 |
| `npx tsx scripts/fix-unit-order.ts` | 단원 표시 순서를 교육과정 순서로 재정렬 |
| `npx tsx scripts/dedupe-options.ts` | 중복 선택지/AI기준 정리 |
| `./scripts/setup-vercel-env.sh` | Vercel 환경변수 일괄 등록 |

## 문제 해결

| 증상 | 원인/해결 |
| --- | --- |
| 로그인 시 "비밀번호가 설정되지 않은 계정입니다" | 마이그레이션 이전에 만든 계정. 관리자 화면에서 비밀번호 변경, 또는 `create-admin` 스크립트 실행 |
| 문제 생성 시 저장 실패 | `problems.content` 컬럼 누락 → 마이그레이션 001 실행 |
| 문제에 그림이 나오지 않음 | `problems.figure_svg` 컬럼 누락 → 마이그레이션 003 실행 |
| Gemini 404 (`model is no longer available`) | 모델 단종. `GEMINI_MODEL` 환경변수로 최신 모델 지정 |
| 선택지가 중복 표시됨 | `npx tsx scripts/dedupe-options.ts` 실행 후 마이그레이션 002 적용 |
| 계정 생성 시 "삭제된 계정이 같은 사용자명을 사용 중입니다" | 소프트 삭제된 계정이 이름과 Auth 계정을 계속 점유합니다. 다른 이름을 쓰세요 |
| 단원 목록이 비어 있음 | `npx tsx scripts/seed-units.ts` (초1~고3 교육과정 단원 121개) |
