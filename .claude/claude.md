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

### 4단계: 인증 API
- [ ] Supabase Auth 연동
- [ ] 로그인/로그아웃 API
- [ ] 관리자 계정 생성 API

### 5단계: 핵심 기능 API
- [ ] 선택지 조회 API (GET /api/options)
- [ ] 단원 조회 API (GET /api/units)
- [ ] 문제 생성 API (POST /api/problems/generate)
- [ ] 풀이 제출/채점 API (POST /api/attempts)
- [ ] 포기 처리 API (POST /api/problems/:id/give-up)
- [ ] 내 문제 풀기 API (POST /api/problems/from-image)

### 6단계: 관리자 API
- [ ] AI 기준 관리 API
- [ ] 사용자 관리 API
- [ ] 단원 관리 API
- [ ] 통계 조회 API

### 7단계: 프론트엔드 화면
- [ ] 관리자 화면 (AI 기준, 사용자, 단원 관리)
- [ ] 학생 - 문제풀이 (캔버스, 업로드, AI 피드백)
- [ ] 학생 - 문제은행
- [ ] 학생 - 내 문제 풀기
- [ ] 학생 - 공부기록

### 8단계: 마무리
- [ ] 전체 기능 통합 테스트
- [ ] Vercel 배포
- [ ] 실 기기 테스트

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
