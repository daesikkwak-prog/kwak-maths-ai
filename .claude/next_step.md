# NEXT_STEP.md — CLI 세션 시작 가이드

> 이 파일은 Claude Code(CLI)에서 개발을 시작할 때 가장 먼저 읽는 파일입니다.
> 함께 전달된 `DESIGN.md`(전체 설계), `CLAUDE.md`(정책 요약 + 작업 체크리스트)를 이어서 참고하세요.
> 설계 단계(요구사항/DB/API/와이어프레임)는 이미 끝났고, 지금부터는 **실제 구현 단계**입니다.

## 시작 전 확인
- [ ] `DESIGN.md`, `CLAUDE.md`를 프로젝트 루트에 두었는지 확인 (이후 세션에서도 계속 참고)
- [ ] Supabase 프로젝트를 이미 만들어두셨는지, 아니면 지금 만들지 확인
- [ ] Gemini API Key 준비 여부 확인

## 진행 순서 (하나씩 완료 후 CLAUDE.md 체크리스트 갱신)

### 1단계 — 프로젝트 초기 세팅
- [ ] Next.js 프로젝트 생성 (App Router, TypeScript 사용 권장)
- [ ] Git 저장소 초기화
- [ ] `.env.local` 구성: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`
- [ ] Supabase JS 클라이언트 설치 및 연결 확인

### 2단계 — DB 스키마 반영
- [ ] `DESIGN.md` 6장의 테이블(users, ai_rules, options, units, problems, attempts, study_time_logs)을 Supabase SQL로 작성
- [ ] FK 관계 설정 (options → units → problems, users/problems → attempts)
- [ ] 모든 테이블에 `is_active`, `deleted_at` 컬럼 반영 (소프트 삭제 정책)
- [ ] 마이그레이션 적용 및 Supabase 대시보드에서 확인

### 3단계 — 인증
- [ ] Supabase Auth 연동
- [ ] 관리자가 학생 계정을 생성하는 서버 사이드 로직 (Auth Admin API 사용, 학생 자가가입 없음)
- [ ] 로그인/로그아웃 API 구현

### 4단계 — Gemini 연동 핵심 로직
- [ ] 이미지 압축/리사이즈 유틸 함수 구현 (전송 전 처리)
- [ ] 프롬프트 조립 함수: [공통 AI기준 + 레벨별 기준] + [문제 정보] + [이전 시도 텍스트 요약 전체] + [최신 이미지 1장]
- [ ] Gemini 응답에서 "채점 결과 / issue_summary / (정답 시) final_solution_text" 파싱

### 5단계 — API Routes 구현
`DESIGN.md` 7장 목록을 기준으로 하나씩 구현. 추천 순서:
1. `/api/admin/*` (선택지, 단원, 사용자, AI기준) — 나머지 기능의 기반 데이터가 되므로 먼저
2. `/api/options`, `/api/units` (조회용)
3. `/api/problems/generate`
4. `/api/attempts` (제출/채점), `/api/problems/:id/give-up`
5. `/api/problems/from-image` (내 문제 풀기)
6. `/api/students/me/stats`, `/api/students/me/history`
7. `/api/admin/students/:id/*`

### 6단계 — 프론트엔드 화면 구현
와이어프레임(`DESIGN.md` 8장 링크) 순서대로:
1. 관리자 화면부터 먼저 구현 (계정/단원/AI기준을 미리 넣어둬야 학생 화면 테스트 가능)
2. 학생 - 문제은행
3. 학생 - 문제풀이 (캔버스, 업로드, AI 피드백, 포기 모달)
4. 학생 - 내 문제 풀기
5. 학생 - 공부기록

### 7단계 — 마무리
- [ ] 학습시간 세션 시작/종료 로직
- [ ] Vercel 배포 연동 및 환경변수 설정
- [ ] 실제 갤럭시탭 + S펜으로 캔버스 입력 테스트
- [ ] 소프트 삭제/식필수여부/포기조건 등 핵심 정책 동작 검증

## 진행하면서 지킬 것
- 매 단계 완료 시 `CLAUDE.md`의 "완료된 작업"/"남은 작업" 체크리스트와 "작업 로그"를 갱신
- 정책(이미지 미저장, 토큰 절약 컨텍스트 구성, 소프트 삭제, 정답 고정 방식 등)은 `CLAUDE.md` 상단 "핵심 정책" 그대로 유지
- 설계와 다르게 구현해야 하는 상황이 생기면, 그 이유를 `CLAUDE.md` 작업 로그에 남기고 `DESIGN.md`도 함께 갱신
