# Kwak Maths AI — 수학 학습 도우미

초/중/고 학생이 캔버스나 사진으로 풀이를 제출하면, AI(Gemini)가 과외 선생님처럼 채점하고 다음 단계를 유도하는 학습 웹앱입니다. 가정용(학생 3명 내외)으로 만들어졌습니다.

- 설계 문서: `.claude/design.md`
- 작업 기록/체크리스트: `.claude/claude.md`
- 세팅 방법: `SETUP_GUIDE.md`

## 기술 스택

- **Next.js 15 (App Router) + TypeScript** — 프론트엔드와 API 라우트를 한 프로젝트에서 처리
- **Supabase** — Postgres + Auth
- **Google Gemini** — 문제 출제, 풀이 채점(Vision), 해설 생성
- **배포**: Vercel
- **입력 기기**: 갤럭시탭 + S펜(캔버스 필기), 카메라 촬영

## 주요 기능

### 학생
- **문제풀이** — 캔버스 필기 또는 사진으로 풀이 제출 → AI 피드백 → 반복 (시도 횟수 제한 없음)
- **문제은행** — 학년/단원/난이도를 고르면 AI가 즉석 출제 (정답·풀이를 함께 생성해 고정 저장)
- **같은 유형 다음 문제** — 문제를 끝내면 같은 학년·단원·난이도로 바로 다음 문제 출제
- **그림 있는 문제** — 도형·그래프·수직선처럼 그림이 필요한 문제는 AI가 SVG 그림을 함께 생성
- **취약 유형 보강** — 유형별 "한 번에 맞힌 비율"이 80% 미만이면 틀렸던 문제와 비슷한 유형으로 출제
- **내 문제 풀기** — 문제집 사진을 올리면 문제를 인식해 같은 흐름으로 풀이
- **포기하기** — 같은 문제 3회 이상 시도 시에만 활성화, 확인 모달 통과 후 정답·해설 제공
- **공부기록** — 푼 문제 수, 정답률, 학습 시간, 포기 문제 수, 단원별 취약점, 정답률 추이, 문제별 상세 기록

### 관리자
- **AI 기준 관리** — 공통 + 초/중/고 레벨별 자유 서술 기준
- **사용자 관리** — 계정 생성/비밀번호 설정/삭제 (학생 자가가입·자가수정 없음)
- **단원 관리** — 학년별 단원, 주관식/객관식, 풀이 과정(식) 필수 여부
- **학생별 공부기록** — 학생 선택 후 통계와 시도 이력 조회

## 핵심 정책

- 제출한 **풀이 이미지는 저장하지 않는다.** AI 분석 후 회차별 텍스트 요약(`issue_summary`)만 남긴다.
- Gemini에는 [AI 기준 + 문제 + 이전 시도 요약 전체 + 최신 이미지 1장]만 전송한다 (토큰 절약).
- 모든 삭제는 소프트 삭제(`is_active=false`, `deleted_at`). 실제 DELETE 금지.
- 문제은행 문제는 생성 시 정답을 고정 저장하고, 이후 채점은 그 정답 기준으로만 한다.
- 문제 그림(`figure_svg`)도 출제 시점에 고정 저장하며, AI가 만든 마크업은 저장·표시 전에 정리(sanitize)한다.
- "내 문제 풀기"는 정답을 미리 알 수 없으므로 매 시도 AI가 즉석 채점한다 (위 규칙의 예외).

## 프로젝트 구조

```
src/
├── app/
│   ├── (admin)/admin/          # 관리자 화면 (대시보드, AI기준, 사용자, 단원, 학생기록)
│   ├── (student)/student/      # 학생 화면 (문제풀이, 문제은행, 공부기록)
│   ├── api/                    # API 라우트
│   │   ├── auth/               # 로그인/로그아웃/세션
│   │   ├── problems/           # 출제, 사진 등록, 조회, 포기
│   │   ├── attempts/           # 풀이 제출·채점, 시도 이력
│   │   ├── students/me/        # 본인 통계·기록
│   │   ├── study-sessions/     # 학습 시간 기록
│   │   └── admin/              # 사용자·단원·선택지·AI기준·학생기록
│   └── page.tsx                # 로그인
├── components/
│   ├── common/                 # 로그인 폼, 로그아웃 버튼
│   └── student/                # 필기 캔버스, 포기 모달, 추이 그래프, 기록 목록
├── lib/
│   ├── auth/                   # 세션 조회 및 권한 검증
│   ├── api/                    # API 응답·예외 처리 헬퍼
│   ├── gemini/                 # 프롬프트 조립 및 응답 파싱
│   ├── stats/                  # 통계·기록 집계 (학생/관리자 공용)
│   ├── problems/               # 식 필수 여부 등 문제 정책
│   ├── supabase/               # 서버/브라우저 클라이언트
│   ├── hooks/                  # 세션, 학습시간 훅
│   └── utils/image.ts          # 이미지 압축·변환
├── middleware.ts               # 화면 접근 제어
└── types/index.ts              # 공용 타입

supabase/
├── schema.sql                  # 신규 프로젝트용 전체 스키마
├── migrations/                 # 기존 프로젝트용 증분 마이그레이션
└── disable-rls.sql             # 개발용 RLS 비활성화

scripts/                        # 시드, 관리자 생성, DB 점검, Gemini 연결 확인
```

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
npm run check-db   # 스키마/데이터/계정 점검
```

최초 세팅(마이그레이션 적용, 관리자 계정 생성)은 `SETUP_GUIDE.md`를 따르세요.

## API 엔드포인트

| 구분 | 엔드포인트 |
| --- | --- |
| 인증 | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| 문제 | `POST /api/problems/generate`, `POST /api/problems/from-image`, `GET /api/problems/:id`, `POST /api/problems/:id/give-up` |
| 풀이 | `POST /api/attempts`, `GET /api/attempts?problem_id=` |
| 선택지 | `GET /api/options?type=`, `GET /api/units?grade_option_id=` |
| 공부기록 | `GET /api/students/me/stats`, `GET /api/students/me/history`, `POST /api/study-sessions/start`, `POST /api/study-sessions/end` |
| 관리자 | `/api/admin/users`, `/api/admin/units`, `/api/admin/options`, `/api/admin/ai-rules`, `/api/admin/students/:id/stats`, `/api/admin/students/:id/history` |
