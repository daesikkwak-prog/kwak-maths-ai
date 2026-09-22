# 수학 학습 도우미 - 설계 문서

## 1. 개요

초/중/고등학생을 대상으로 한 AI 기반 수학 문제풀이 학습 웹앱.
학생은 문제를 풀며 AI(Gemini)로부터 과외 선생님처럼 단계별 힌트를 받고,
관리자는 AI의 답변 기준·계정·단원 등을 관리한다.

- 형태: 웹 애플리케이션 (Next.js, Vercel 배포)
- DB/Auth: Supabase
- LLM: Google Gemini API
- 사용 규모: 가정용, 학생 3명 내외
- 주 입력 기기: 갤럭시탭 + S펜 (캔버스 입력), 카메라 촬영(파일 업로드)

---

## 2. 사용자 유형 및 기능 요약

### 학생
1. 문제풀이 도우미 (AI 문제은행 출제 + 내 문제 풀기 겸용)
2. 문제은행 (학년/단원/난이도 선택 → AI 즉석 출제)
3. 공부기록(통계)

### 관리자
1. AI 기준 관리 (공통 + 초/중/고 레벨별)
2. 사용자 관리 (계정 생성/수정, 학생 자가수정 불가)
3. 단원 관리 (학년/유형/식 필수 여부)
4. 학생별 공부기록(통계) 조회

---

## 3. 입력 방식

모든 AI 입력은 **이미지**로 통일한다.
1. 파일 업로드 (사진 촬영본)
2. 캔버스에 펜/마우스로 그린 후 이미지로 변환

전송 전 이미지는 리사이즈/압축하여 토큰 사용량을 줄인다.
**제출된 이미지는 서버에 저장하지 않는다** — AI 분석 후 텍스트 요약만 남기고 폐기한다.

---

## 4. 학생 기능 상세

### 4.1 문제풀이 도우미 (대화형 반복 피드백)

흐름:
1. 학생이 문제은행에서 문제를 받거나, "내 문제 풀기"로 문제집 사진을 업로드
2. 학생이 캔버스에 풀이 작성 또는 사진 제출
3. AI가 이미지를 분석해 과외 선생님처럼 피드백
   - 정답을 직접 말하지 않고, 틀린 부분을 짚고 다음 단계를 유도하는 질문 제공
4. 학생이 다시 풀어 제출 → 3번 반복 (**시도 횟수 제한 없음**)
5. 정답에 도달하거나, 학생이 포기를 선택하면 종료

**토큰 절약을 위한 컨텍스트 관리**
- 매 턴 Gemini에 전송하는 내용: [공통 AI기준 + 레벨별 기준] + [문제 정보] + [이전 시도들의 텍스트 요약] + [최신 제출 이미지 1장]만 전송
- 이전 시도 이미지는 저장하지 않고, 그 회차에 AI가 지적한 내용을 한 줄 요약(`issue_summary`)으로 변환해 누적

**포기 기능**
- 같은 문제에 대해 AI 도움을 받아 **3회 이상 시도한 경우에만** "포기하기" 버튼 활성화
- 클릭 시 확인창 노출: "넌 아직 할 수 있어. 정말 포기할거야?" → "예" 선택 시에만 포기 처리
- 포기 처리 시 AI가 정답 + 쉬운 풀이 설명을 제공

**객관식 대응**
- 문제집 문제 등은 객관식일 수 있음
- 객관식이어도 답만 쓰는 것은 허용하지 않으며, **풀이 과정(식) 필수**
- 단, 너무 단순한 연산(예: 초등 저학년 "1+1")은 식이 필요 없을 수 있으므로,
  단원별로 관리자가 "식 필수 여부"를 설정 (`units.formula_required`)
- "내 문제 풀기"(사진으로 업로드한 문제집 문제)는 학년/단원을 알 수 없으므로,
  **학생 계정별 설정**(`users.my_problem_formula_required`)을 기준으로 식 필수 여부를 판단

### 4.2 내 문제 풀기

- 문제풀이 화면 상단에 "내 문제 풀기" 버튼으로 진입 (별도 화면 전환이 아닌 같은 플로우 내 진입점)
- 문제 사진을 업로드하면, 이후 흐름은 AI 문제은행 문제와 동일하게 진행
- AI가 만든 문제가 아니므로 정답/풀이를 미리 저장할 수 없음 → 매 시도마다 AI가 그 자리에서 채점 (기존 "정답 고정" 방식의 예외)

### 4.3 문제은행 (AI 출제)

- 학생이 선택하는 조건: **학년 / 단원 / 난이도** (텍스트 입력이 아닌 선택지 방식, 관리자가 등록)
- 학년은 학생 프로필의 학년이 **기본값**으로 자동 선택되나, 변경 가능
- 조건 선택 후 AI가 즉석에서 문제를 생성하며, **정답과 풀이도 함께 생성해 저장** (이후 채점은 저장된 정답 기준으로 고정, 매번 재계산하지 않음 → 토큰 절약 + 채점 일관성 확보)

### 4.4 공부기록 (통계)

표시 항목:
- 푼 문제 수
- 정답률
- 학습 시간
- 포기한 문제 수
- 단원별 취약점 (자주 틀리는 단원, 오답률 순)
- 시간에 따른 성적(정답률) 추이 그래프

문제별 상세 기록:
- 문제 내용 + 정답/풀이 (AI 생성본)
- 시도별 AI 피드백 요약 이력 (예: 1차 "부호 오류" → 2차 "계산 순서 오류" → 3차 "정답")
- 정답에 도달한 마지막 시도에는, 학생이 최종적으로 작성한 풀이를 AI가 텍스트로 옮겨 적은 `final_solution_text` 표시
- 제출 이미지 자체는 저장하지 않으므로 보여주지 않음

---

## 5. 관리자 기능 상세

### 5.1 AI 기준 관리
- 자유 서술 텍스트 방식
- 공통 기준(모든 학생 공통) + 초/중/고 레벨별 기준을 각각 별도 입력
- 실제 Gemini에 전달되는 프롬프트 = 공통 기준 + 해당 학생 레벨 기준 조합

### 5.2 사용자 관리
- 학생 계정은 **관리자만 생성** (회원가입 없음)
- 입력 항목: 사용자 이름(로그인 아이디), 비밀번호, 학교급(초/중/고), 학년, "내 문제 풀기 - 식 필수 여부"
- 비밀번호 설정/변경도 관리자만 수행, 학생은 본인 정보 수정 불가
- Supabase Auth 사용 (관리자 API로 계정 생성)

### 5.3 단원 관리
- 학년에 종속된 단원 목록 관리
- 단원별로 다음을 함께 설정:
  - 적용 학년
  - 문제 유형 (주관식/객관식)
  - 풀이 과정(식) 필수 여부

### 5.4 학생별 공부기록 조회
- 학생 선택 → 해당 학생의 통계 및 문제별 상세 기록(시도 이력 포함) 조회

### 5.5 삭제 정책
- 모든 삭제는 실제 DELETE가 아닌 **소프트 삭제** (`is_active=false`, `deleted_at` 기록)
- 목록 조회 시 기본적으로 `is_active=true`만 표시
- 기존 문제/통계 기록은 참조 무결성이 깨지지 않도록 유지

---

## 6. 데이터베이스 설계 (Supabase / Postgres)

```
users
- id (PK)
- name                          -- 로그인 아이디
- role                          -- student | admin
- school_level                  -- 초 | 중 | 고
- grade
- my_problem_formula_required   -- boolean, "내 문제 풀기" 시 식 필수 여부
- is_active, deleted_at
(비밀번호는 Supabase Auth에서 관리)

ai_rules
- id (PK)
- level              -- common | 초 | 중 | 고
- content            -- 자유 서술 텍스트
- is_active, deleted_at, updated_at

options              -- 단순 선택지 (학년/난이도)
- id (PK)
- type               -- grade | difficulty
- value              -- 예: "중1", "상"
- order
- is_active, deleted_at

units                 -- 단원 (학년 종속)
- id (PK)
- grade_option_id (FK -> options.id, type='grade')
- name                -- 예: "이차방정식"
- answer_type         -- subjective | objective
- formula_required    -- boolean
- order
- is_active, deleted_at

problems
- id (PK)
- source              -- ai_generated | user_uploaded
- grade_option_id (FK -> options.id, nullable)
- unit_id (FK -> units.id, nullable)         -- user_uploaded는 null 가능
- difficulty_option_id (FK -> options.id, nullable)
- answer              -- nullable (user_uploaded는 미리 저장 안 됨)
- solution            -- nullable
- created_at
- is_active, deleted_at

attempts
- id (PK)
- student_id (FK -> users.id)
- problem_id (FK -> problems.id)
- attempt_no
- is_correct
- gave_up                    -- boolean
- issue_summary              -- 해당 회차에 AI가 지적한 내용 (예: "계산 순서 오류")
- final_solution_text        -- nullable, 정답 도달 시 AI가 텍스트로 정리한 최종 풀이
- created_at

study_time_logs
- id (PK)
- student_id (FK -> users.id)
- session_start
- session_end
```

관계:
```
options ──< units (grade_option_id)
units ──< problems (unit_id)
options ──< problems (grade_option_id, difficulty_option_id)
users ──< attempts >── problems
users ──< study_time_logs
```

---

## 7. API 엔드포인트 (Next.js API Routes)

### 인증
- `POST /api/auth/login`
- `POST /api/auth/logout`

### 학생 - 문제풀이
- `POST /api/problems/generate` — 학년/단원/난이도 기반 AI 출제 (정답/풀이 함께 생성·저장)
- `POST /api/problems/from-image` — "내 문제 풀기" 문제 사진 등록 (`source=user_uploaded`)
- `POST /api/attempts` — 풀이 이미지 제출 → 압축 → Gemini 채점/피드백 → `attempts` 기록
- `GET /api/attempts?problem_id=` — 특정 문제의 시도 기록 조회
- `POST /api/problems/:id/give-up` — 포기 처리 (3회 이상 시도 검증) → 정답/풀이 설명 반환

### 학생 - 선택지
- `GET /api/options?type=grade|difficulty`
- `GET /api/units?grade_option_id=`

### 학생 - 공부기록
- `GET /api/students/me/stats`
- `GET /api/students/me/history`
- `POST /api/study-sessions/start`
- `POST /api/study-sessions/end`

### 관리자 - AI 기준
- `GET /api/admin/ai-rules`
- `PATCH /api/admin/ai-rules/:level`

### 관리자 - 사용자 관리
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id` (소프트 삭제)

### 관리자 - 선택지/단원 관리
- `POST /api/admin/options`, `PATCH /api/admin/options/:id`, `DELETE /api/admin/options/:id`
- `POST /api/admin/units`, `PATCH /api/admin/units/:id`, `DELETE /api/admin/units/:id`

### 관리자 - 학생별 기록
- `GET /api/admin/students/:id/stats`
- `GET /api/admin/students/:id/history`

---

## 8. 화면 목록 (와이어프레임)

와이어프레임 아트보드: https://claude.ai/artifact/KiLaFg72WH5jzTny6mrZht

1. 학생 - 문제풀이 화면 (Main)
2. 포기 확인 모달 (ConfirmGiveUp)
3. 학생 - 문제은행 (ProblemBank)
4. 내 문제 풀기 - 문제 사진 입력 (MyProblemInput)
5. 관리자 - AI 기준 관리 (AdminAIRules)
6. 관리자 - 사용자 관리 (AdminUsers)
7. 관리자 - 단원 관리 (AdminUnits)
8. 학생 - 공부기록 (StudentStats)
9. 관리자 - 학생별 공부기록 (AdminStudentStats)
