# CLAUDE.md — 프로젝트 작업 기록

> 새 세션을 시작할 때 이 파일을 먼저 읽고, "완료된 작업"과 "남은 작업"을 확인한 뒤 이어서 진행할 것.
> 상세 요구사항/DB/API 스펙은 `DESIGN.md` 참고.

## 프로젝트 한 줄 요약
초/중/고 학생 대상 AI(Gemini) 수학 문제풀이 학습 웹앱. Next.js + Supabase + Vercel, 가정용(학생 3명 내외).

## 기술 스택
- Frontend/Backend: Next.js (Vercel 배포)
- DB/Auth: Supabase (Postgres + Auth)
- LLM: Google Gemini API (Vision 입력 지원 모델)
- 입력 기기: 갤럭시탭 + S펜, 카메라 촬영

## 핵심 정책 (절대 잊지 말 것)
- 학생이 제출한 풀이 **이미지는 저장하지 않는다**. AI 분석 후 텍스트 요약만 남기고 폐기.
- 대화 컨텍스트는 토큰 절약을 위해 [이전 시도 텍스트 요약 전체] + [최신 이미지 1장]만 Gemini에 전송.
- 모든 "삭제"는 소프트 삭제(`is_active=false`, `deleted_at`). 실제 DELETE 금지.
- 문제은행(AI 출제) 문제는 생성 시 정답/풀이를 함께 생성해 **고정 저장**, 이후 채점은 저장된 정답 기준(재계산 X).
- "내 문제 풀기"(사용자 업로드 문제)는 정답을 미리 알 수 없으므로 매 시도 AI가 즉석 채점 (위 규칙의 예외).
- 학생 계정은 관리자만 생성/수정 (회원가입 없음, 학생 자가 정보수정 불가).
- 포기하기는 같은 문제에서 3회 이상 시도해야 활성화, 클릭 시 확인 모달("넌 아직 할 수 있어. 정말 포기할거야?") 통과해야 처리.
- 객관식 문제도 풀이과정(식) 필수가 원칙. 단, `units.formula_required` / `users.my_problem_formula_required` 설정에 따라 예외 허용.

---

## 완료된 작업

- [x] 전체 요구사항 정의 (학생 3기능 + 관리자 4기능)
- [x] AI 기준 구조 확정 (공통 + 초/중/고, 자유서술)
- [x] 입력 방식 확정 (이미지 통일: 업로드/캔버스)
- [x] 대화 컨텍스트/토큰 절약 전략 확정
- [x] 문제은행 출제 방식 확정 (선택지 기반 + AI 즉석 생성 + 정답 고정)
- [x] "내 문제 풀기" 기능 정의 (문제집 사진, 객관식 대응, 식 필수 여부 정책)
- [x] 포기 기능 정의 (3회 이상 시도 + 확인 모달)
- [x] 사용자 관리 정책 확정 (관리자 전용 계정 생성)
- [x] 단원 관리 구조 확정 (학년 종속, 유형/식필수여부)
- [x] 공부기록(통계) 항목 및 상세 기록 구조 확정
- [x] DB 스키마 설계 (users, ai_rules, options, units, problems, attempts, study_time_logs)
- [x] 소프트 삭제 정책 전체 테이블 적용
- [x] API 엔드포인트 목록 정리 (`DESIGN.md` 7장)
- [x] 와이어프레임 9개 화면 작성 (claude.ai Design 아트보드)
- [x] 설계 문서(`DESIGN.md`) 작성

## 남은 작업 (개발 진행)

### 1단계: 프로젝트 세팅 ✅
- [x] Next.js 프로젝트 초기 세팅 (App Router, TypeScript)
- [x] 폴더 구조 구성 (src/app, lib, types, components)
- [x] package.json 설정 (Supabase, Gemini, Next.js)
- [x] TypeScript 타입 정의 (types/index.ts)
- [x] 상수 정의 (lib/constants/index.ts)
- [x] Supabase 클라이언트 생성 (lib/supabase/*.ts)
- [x] Gemini API 유틸 생성 (lib/gemini/index.ts)
- [x] 이미지 처리 유틸 구현 (lib/utils/image.ts)

### 2단계: 개발 환경 구성 ✅
- [x] npm install 실행 (148MB)
- [x] Supabase 프로젝트 생성 및 접속 정보 확보
- [x] Gemini API Key 발급
- [x] .env.local 파일 작성
- [x] 로컬 개발 서버 실행 확인 (localhost:3000)

### 3단계: DB 스키마 반영 ✅
- [x] Supabase SQL 작성 (schema.sql)
- [x] 테이블 생성 및 마이그레이션
- [x] FK 관계 설정
- [x] RLS 비활성화 (개발용)
- [x] 초기 데이터 로드 (옵션, AI 규칙) via seed-database.ts

### 4단계: 인증 API ✅
- [x] Supabase Auth 연동 (관리자가 계정 생성 시 Auth 계정 동시 생성)
- [x] 로그인/로그아웃 API (실제 비밀번호 검증)
- [x] 세션 쿠키 + `/api/auth/me`
- [x] 미들웨어 기반 화면 접근 제어 (`src/middleware.ts`)
- [x] API 라우트별 권한 검증 (`requireUser` / `requireRole` / `requireSelfOrAdmin`)

### 5단계: 핵심 기능 API ✅
- [x] 선택지 조회 (GET /api/options)
- [x] 단원 조회 (GET /api/units)
- [x] 문제 생성 (POST /api/problems/generate) — 문제 본문·정답·풀이 고정 저장
- [x] 문제 조회 (GET /api/problems/:id)
- [x] 풀이 제출/채점 (POST /api/attempts) — 식 필수 여부/레벨별 기준 반영
- [x] 시도 기록 조회 (GET /api/attempts?problem_id=)
- [x] 포기 처리 (POST /api/problems/:id/give-up) — 3회 이상 검증
- [x] 내 문제 풀기 (POST /api/problems/from-image)

### 6단계: 관리자 API ✅
- [x] AI 기준 관리 (GET/PATCH)
- [x] 사용자 관리 (GET/POST/PATCH/DELETE, 비밀번호 설정·변경 포함)
- [x] 단원 관리 (GET/POST/PATCH/DELETE)
- [x] 선택지 관리 (GET/POST/PATCH/DELETE)
- [x] 학생별 통계/기록 조회 (/api/admin/students/:id/stats, /history)

### 7단계: 프론트엔드 화면 ✅
- [x] 로그인 (redirect 파라미터 지원)
- [x] 관리자 - 대시보드 / AI 기준 / 사용자 / 단원
- [x] 관리자 - 학생별 공부기록 (목록 + 상세)
- [x] 학생 - 문제은행 (학년 기본값 + 단원/난이도 선택)
- [x] 학생 - 문제풀이 (S펜 캔버스 + 사진 업로드, 이미지 압축, AI 피드백, 포기 모달)
- [x] 학생 - 내 문제 풀기 (문제풀이 화면 내 진입점)
- [x] 학생 - 공부기록 (통계 + 정답률 추이 그래프 + 문제별 상세 기록)

### 8단계: 마무리
- [x] 학습시간 세션 시작/종료 로직 (문제풀이 화면 체류 시간 기준)
- [x] 빌드/타입체크 통과
- [x] DB 마이그레이션 001/002 적용
- [x] 관리자 계정 생성 (admin)
- [x] 핵심 흐름 검증 (로그인 → 출제 → Vision 채점 → 통계/기록, 식 필수 정책 분기 포함)

---

## 남은 작업 목록 (2026-09-22 점검 기준)

### 1. 데이터 입력 — 앱이 제 기능을 하려면 선행 필요
- [ ] 단원 등록 (현재 중1 '일차방정식' 1건만 존재 — API 검증용으로 생성한 실데이터)
- [ ] 실제 학생 계정 생성
- [ ] AI 기준 문구를 원하는 지도 방식/말투로 수정 (현재는 시드 기본값)
- [ ] admin 비밀번호 변경 (초기값 admin123)

### 2. 실기기 검증
- [ ] 갤럭시탭 + S펜 필기 (필압 반영, 필기 중 스크롤 방지)
- [ ] 카메라 촬영 업로드 경로
- [ ] 내 문제 풀기 — 실제 문제집 사진 OCR 품질
- [ ] 포기하기 3회 충족 후 해설 생성 (3회 미만 차단은 검증 완료)
- [ ] 학습시간 기록 (탭 전환/이탈 기준이라 브라우저 실사용 확인 필요)

### 3. 배포 ✅
- [x] 프로덕션 빌드/구동 검증 (next build + next start, Secure 쿠키 동작 확인)
- [x] Vercel 프로젝트 연결 (`kwakpam/kwak_maths_ai`)
- [x] 환경변수 4개 등록 (NEXT_PUBLIC_* = Config, 서버 키 = Secret, 3개 환경 모두)
- [x] 프로덕션 배포 — **https://kwakmathsai.vercel.app**
- [x] 배포본 검증 (health, 미인증 차단, 관리자 로그인, Gemini 출제 1건)
- [ ] GitHub 자동 배포 연결 — Vercel GitHub App 미설치로 `vercel git connect` 실패.
      대시보드 Settings → Git에서 연결하면 푸시 시 자동 배포. 그 전에는 `npx vercel --prod --yes`로 수동 배포

### 4. 설계에 있으나 화면이 없던 것
- [x] 단원 수정/삭제 화면 (API만 있고 화면은 등록·목록뿐이었음)
- [x] 선택지(학년/난이도) 관리 화면
- [x] 풀다 만 문제 이어풀기 진입점

### 5. 운영·보안 판단 필요
- [ ] RLS 비활성화 상태 유지 여부 — 모든 접근이 service_role 키를 쓰는 서버 라우트를 거치고 권한은 앱에서 검증
- [ ] 세션 쿠키가 서명 없는 user_id — 쿠키 위조 시 타 계정 접근 가능. 외부 공개 시 Supabase Auth 토큰 기반으로 전환 필요
- [ ] Gemini 비정형 응답 시 재시도 로직 없음

### 6. 잔재 정리
- [x] `.backup_backend/`, `.backup_frontend/` (폐기된 FastAPI 구조)
- [x] `src/app/api/test/route.ts` (디버그 라우트)
- [x] `supabase/seed-data.sql` (schema.sql·시드 스크립트와 중복)

---

## 작업 로그

<!-- 이후 작업 세션마다 아래에 날짜와 함께 추가할 것 -->

### 2026-09-22 (설계 단계)
- 요구사항 정리, DB 설계, 와이어프레임, API 설계까지 완료
- 설계 문서 작성 완료

### 2026-09-22 (개발 단계 착수)
- Next.js 프로젝트 구조 재구성 (backend/frontend 분리 → Next.js 통합)
- 폴더 구조 생성: src/app, lib, types, components 등
- 핵심 파일 작성 완료:
  - package.json, tsconfig.json, next.config.js
  - src/app/layout.tsx, page.tsx, globals.css
  - src/types/index.ts (모든 데이터 타입)
  - src/lib/constants/index.ts
  - src/lib/supabase/{client.ts, server.ts}
  - src/lib/gemini/index.ts (AI 프롬프트 + 채점 로직)
  - src/lib/utils/image.ts (이미지 압축/변환)
  - src/app/api/health/route.ts

### 2026-09-22 (Supabase & Gemini 연동)
- npm install 완료 (Next.js 15.5.25, 148MB)
- Supabase 프로젝트 생성 완료
- Gemini API Key 발급 완료
- .env.local 구성 (URL, Keys)
- Supabase 스키마 생성 (schema.sql 실행)
- RLS 비활성화 (개발용)
- 초기 데이터 로드 (seed-database.ts via tsx)
  - Options: 12개 학년 + 3개 난이도 = 15개
  - AI Rules: common, 초, 중, 고 = 4개
- Dev 서버 실행 중 (localhost:3000)
- 다음: API Routes 구현 시작

### 2026-09-22 (구현 점검 및 누락 기능 보완)

개발 상태를 점검한 결과 빌드가 깨져 있고 핵심 기능이 미구현이라 다음을 보완:

**빌드/타입**
- 모든 상대경로 import를 `@/` 별칭으로 교체 (존재하지 않는 경로로 19개 파일 컴파일 실패 상태였음)
- `typeof data` 참조 오류, `@supabase/auth-helpers-nextjs`의 없는 export 사용 수정
- `npx tsc --noEmit` / `next build` 통과 확인

**DB**
- `problems.content` 컬럼 추가 — 문제 본문을 저장하지 않아 문제를 다시 보여줄 수 없고 채점 컨텍스트도 비어 있었음
- `users.auth_user_id` 추가 (Supabase Auth 연결)
- `users.grade` 제약 1~3 → 1~6 (초등 4~6학년 계정 생성 불가 버그)
- 부분 유니크 인덱스로 교체 — `UNIQUE(..., deleted_at)`는 NULL 중복을 막지 못해 시드 중복 75건 발생, `scripts/dedupe-options.ts`로 정리

**인증**
- 로그인이 비밀번호를 검증하지 않던 문제 해결 (Supabase Auth `signInWithPassword`)
- 계정 생성 시 Auth 계정 동시 생성, 관리자만 비밀번호 설정/변경
- 미들웨어 + 라우트별 권한 검증 추가. 학생은 타인 기록 조회 불가

**기능**
- 프론트엔드의 하드코딩된 `student_id: 'test-student-001'` 제거 → 실제 세션 사용
- S펜 필기 캔버스 구현 (설계상 주 입력 방식인데 미구현이었음)
- 전송 전 이미지 압축 적용 (`compressImage` 유틸이 있었으나 호출되지 않았음)
- 포기하기 버튼 + 확인 모달, 내 문제 풀기 진입점, 문제 본문 표시 추가
- 학습시간 세션 시작/종료를 화면에 연결 (기록이 항상 0이었음)
- 통계를 시도 단위 → 문제 단위로 수정, 정답률 추이 그래프·문제별 상세 기록 추가
- 관리자용 학생별 공부기록 화면 신규 구현

**외부 연동**
- Gemini 모델 `gemini-2.0-flash` 단종(404) 확인 → `gemini-3.6-flash`로 교체, `GEMINI_MODEL` 환경변수로 재정의 가능

**남은 일**: Supabase SQL Editor에서 마이그레이션 001·002 실행 → `npm run check-db` → 관리자 계정 생성 → 통합 테스트

### 2026-09-22 (배포)

- 잔재 정리(백업 디렉터리, /api/test, 중복 seed-data.sql) 및 누락 화면 보완
  (단원 수정/삭제, 선택지 관리, 이어풀기 진입점) 후 커밋·푸시
- Vercel 배포 완료: https://kwakmathsai.vercel.app
  - 처음 `vercel link`가 이전 팀명으로 프로젝트를 만들어 삭제 후 `kwakpam` 스코프로 재연결
  - `vercel env add`가 자격증명처럼 보이는 값에서 프롬프트를 띄워 멈추는 문제 →
    `--value` + 다중 환경 + `--force --yes` 방식으로 스크립트 수정 (호출 12회 → 4회)
  - CLI가 중복 환경변수를 삭제하지 못해(multiple_envs) REST API로 정리
- 배포본에서 관리자 로그인 및 Gemini 출제까지 정상 동작 확인
