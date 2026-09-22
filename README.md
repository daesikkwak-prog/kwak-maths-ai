# Kwak Maths AI - 수학 학습 지원 애플리케이션

아이가 연습장에 작성한 수학 문제를 사진으로 업로드하면, AI가 인식하여 풀이를 도와주거나 유사한 문제를 생성하는 애플리케이션입니다.

## 프로젝트 구조

```
kwak_maths_ai/
├── backend/                 # FastAPI 백엔드
│   ├── main.py             # 메인 애플리케이션
│   ├── config.py           # 설정 (환경변수)
│   ├── database.py         # Supabase 연결
│   ├── requirements.txt    # Python 의존성
│   ├── models/            # Pydantic 데이터 모델
│   │   ├── user.py
│   │   ├── problem.py
│   │   └── record.py
│   └── routes/            # API 엔드포인트
│       ├── auth.py        # 인증 (회원가입/로그인)
│       ├── problems.py    # 문제 업로드/조회
│       ├── students.py    # 학생 기능
│       └── admin.py       # 관리자 기능
│
├── frontend/               # React 프론트엔드
│   ├── package.json
│   └── src/
│       ├── pages/         # 페이지 컴포넌트
│       ├── components/    # 재사용 컴포넌트
│       └── services/      # API 통신
│
├── .env.example           # 환경변수 템플릿
├── .gitignore
└── README.md
```

## 주요 기능

### 학생 권한
- **문제 푸는 거 도와줘** - 업로드된 문제에 대한 풀이 및 설명
- **문제 내줘** - 유사한 난이도의 새로운 문제 자동 생성
- **문제 기록** - 푼 문제의 이력 저장 및 조회

### 관리자 권한
- **LLM 기준 수립** - Gemini API 프롬프트 설정
- **사용자 정보 관리** - 학생/관리자 계정 관리
- **사용자별 기록/통계** - 각 학생의 학습 진도 및 통계

## 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: FastAPI + Python
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API (Vision + Text)
- **Authentication**: Supabase Auth + JWT

## 설정 및 실행

### 1. 백엔드 설정

```bash
cd backend

# 가상환경 생성
python -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate  # Windows

# 의존성 설치
pip install -r requirements.txt
```

### 2. 환경변수 설정

`.env` 파일 생성 (`.env.example` 참고):

```bash
cp .env.example .env
```

필요한 정보:
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_KEY`: Supabase anon 키
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role 키
- `GEMINI_API_KEY`: Google Gemini API 키
- `JWT_SECRET`: 임의의 비밀키

### 3. Supabase 데이터베이스 스키마

Supabase SQL 에디터에서 다음 쿼리 실행:

```sql
-- users 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  role TEXT CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- problems 테이블
CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  recognized_text TEXT,
  solution TEXT,
  problem_type TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- records 테이블
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('solving', 'solved', 'needs_help')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- llm_settings 테이블
CREATE TABLE llm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  setting_name TEXT NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. 백엔드 실행

```bash
python main.py
# 또는
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API 문서: http://localhost:8000/docs

### 5. 프론트엔드 설정

```bash
cd frontend
npm install
npm run dev
```

## API 엔드포인트

### 인증
- `POST /auth/signup` - 회원가입
- `POST /auth/login` - 로그인
- `POST /auth/logout` - 로그아웃

### 문제
- `POST /problems/upload` - 문제 이미지 업로드
- `GET /problems/{problem_id}` - 문제 조회
- `GET /problems/list/{user_id}` - 사용자의 모든 문제 조회
- `PUT /problems/{problem_id}` - 문제 풀이 업데이트

### 학생
- `GET /students/records/{user_id}` - 문제 풀이 기록 조회
- `POST /students/records/{user_id}` - 기록 생성
- `PUT /students/records/{record_id}` - 기록 업데이트
- `GET /students/statistics/{user_id}` - 통계 조회

### 관리자
- `GET /admin/users` - 모든 사용자 조회
- `GET /admin/users/{user_id}` - 특정 사용자 상세 정보
- `PUT /admin/users/{user_id}` - 사용자 정보 업데이트
- `DELETE /admin/users/{user_id}` - 사용자 삭제
- `POST /admin/llm-settings` - LLM 설정 생성
- `GET /admin/llm-settings` - LLM 설정 조회
- `GET /admin/statistics/all` - 전체 통계 조회

## 개발 로드맵

### Phase 1 (현재)
- [ ] 백엔드 기본 구조 완성
- [ ] Supabase 연결 및 스키마 설정
- [ ] API 엔드포인트 구현

### Phase 2
- [ ] 이미지 업로드 및 Gemini Vision OCR 연동
- [ ] 문제 풀이 AI 프롬프트 개발
- [ ] 유사 문제 생성 기능

### Phase 3
- [ ] 프론트엔드 페이지 구현
- [ ] 사용자 인증 UI
- [ ] 이미지 업로드 UI

### Phase 4
- [ ] 통계 대시보드
- [ ] 관리자 패널
- [ ] 배포

## 주의사항

- `.env` 파일은 git에 올라가지 않도록 주의
- Gemini API 키는 안전하게 보관
- Supabase 설정에서 CORS 허용 도메인 설정 필요

## 라이선스

MIT
