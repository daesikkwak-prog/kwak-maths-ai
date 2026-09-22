# 프로젝트 세팅 가이드

## 1. Supabase 프로젝트 생성 및 환경변수 설정

### 1.1 Supabase 프로젝트 생성
1. https://supabase.com 접속
2. "New Project" 클릭
3. 프로젝트명: `kwak-maths-ai`
4. 리전: Asia (Singapore 추천)
5. 비밀번호 설정 (기억해두기)
6. 프로젝트 생성 대기 (2-3분)

### 1.2 API Keys 확보
1. Supabase 대시보드 → Settings → API
2. `Project URL` 복사 → `NEXT_PUBLIC_SUPABASE_URL`
3. `anon` public key 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. `service_role` secret key 복사 → `SUPABASE_SERVICE_ROLE_KEY`

### 1.3 DB 스키마 적용
1. Supabase 대시보드 → SQL Editor
2. "New Query" 클릭
3. `supabase/schema.sql` 전체 내용 복사 & 붙여넣기
4. "Run" 클릭 (모든 테이블 생성)

## 2. Gemini API 설정

### 2.1 API Key 발급
1. https://aistudio.google.com 접속 (Google 계정 필요)
2. "Get API Key" 클릭
3. "Create API key in new project" 클릭
4. API Key 복사 → `GEMINI_API_KEY`

## 3. 로컬 환경 설정

### 3.1 .env.local 파일 생성
프로젝트 루트에 `.env.local` 파일 생성:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3.2 개발 서버 실행
```bash
npm run dev
```
브라우저에서 http://localhost:3000 접속

## 4. 기본 계정 생성

### 4.1 관리자 계정 생성
Supabase Auth 대시보드에서 직접 생성하거나, API 구현 후 사용:
```javascript
POST /api/auth/admin/create-user
{
  "name": "admin001",
  "email": "admin@example.com",
  "password": "your_password",
  "role": "admin"
}
```

### 4.2 학생 계정 생성 (관리자만 가능)
```javascript
POST /api/auth/admin/create-user
{
  "name": "student001",
  "email": "student@example.com",
  "password": "your_password",
  "role": "student",
  "school_level": "중",
  "grade": 1,
  "my_problem_formula_required": true
}
```

## 5. 테스트

### 5.1 API 테스트
```bash
curl http://localhost:3000/api/health
```
응답:
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-09-22T..."
}
```

### 5.2 Supabase 연결 확인
브라우저 콘솔에서:
```javascript
import { createClient } from '@supabase/supabase-js';
const client = createClient(url, key);
const { data } = await client.from('active_options').select('*');
console.log(data);
```

## 문제 해결

### "NEXT_PUBLIC_SUPABASE_URL is required"
→ .env.local 파일 확인 및 개발 서버 재시작

### Supabase 연결 실패
→ Supabase 프로젝트 상태 확인, API Keys 재확인

### Gemini API 에러
→ API Key 유효성 확인, Google Cloud 프로젝트 설정 확인
