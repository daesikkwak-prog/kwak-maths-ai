-- 001: 문제 본문 저장 컬럼 추가 + 인증 연동 + 학년 제약 수정
-- Supabase SQL Editor에서 실행할 것

-- 1) problems.content : AI가 출제했거나 사진에서 추출한 "문제 본문"
--    (기존에는 정답/풀이만 저장되어 문제 자체를 다시 보여줄 수 없었음)
ALTER TABLE problems ADD COLUMN IF NOT EXISTS content TEXT;

-- 2) 사용자 계정별 Supabase Auth 연결 (비밀번호는 Auth에서 관리)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- 3) 학년 제약 수정: 초등은 1~6학년까지 존재 (기존 1~3 제약은 오류)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_grade_check;
ALTER TABLE users ADD CONSTRAINT users_grade_check CHECK (grade >= 1 AND grade <= 6);

-- 4) 뷰는 SELECT * 로 정의되어 있어 컬럼 추가가 자동 반영되지 않으므로 재생성
DROP VIEW IF EXISTS active_users;
CREATE VIEW active_users AS
SELECT * FROM users WHERE is_active = true AND deleted_at IS NULL;

DROP VIEW IF EXISTS active_problems;
CREATE VIEW active_problems AS
SELECT * FROM problems WHERE is_active = true AND deleted_at IS NULL;
