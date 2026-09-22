-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'admin')),
  school_level VARCHAR(10) NOT NULL CHECK (school_level IN ('초', '중', '고')),
  grade INT NOT NULL CHECK (grade >= 1 AND grade <= 3),
  my_problem_formula_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_role ON users(role);

-- AI Rules table
CREATE TABLE ai_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level VARCHAR(10) NOT NULL CHECK (level IN ('common', '초', '중', '고')),
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMP NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(level, deleted_at)
);

CREATE INDEX idx_ai_rules_level ON ai_rules(level, is_active);

-- Options table (선택지: 학년, 난이도)
CREATE TABLE options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('grade', 'difficulty')),
  value VARCHAR(100) NOT NULL,
  "order" INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMP NULL,
  UNIQUE(type, value, deleted_at)
);

CREATE INDEX idx_options_type ON options(type, is_active);

-- Units table (단원, 학년 종속)
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade_option_id UUID NOT NULL REFERENCES options(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  answer_type VARCHAR(20) NOT NULL CHECK (answer_type IN ('subjective', 'objective')),
  formula_required BOOLEAN NOT NULL DEFAULT true,
  "order" INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_units_grade_option_id ON units(grade_option_id, is_active);
CREATE INDEX idx_units_order ON units("order");

-- Problems table
CREATE TABLE problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source VARCHAR(20) NOT NULL CHECK (source IN ('ai_generated', 'user_uploaded')),
  grade_option_id UUID REFERENCES options(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  difficulty_option_id UUID REFERENCES options(id) ON DELETE SET NULL,
  answer TEXT,
  solution TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_problems_source ON problems(source, is_active);
CREATE INDEX idx_problems_unit_id ON problems(unit_id, is_active);
CREATE INDEX idx_problems_grade_option_id ON problems(grade_option_id, is_active);

-- Attempts table
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  attempt_no INT NOT NULL CHECK (attempt_no >= 1),
  is_correct BOOLEAN NOT NULL,
  gave_up BOOLEAN NOT NULL DEFAULT false,
  issue_summary TEXT,
  final_solution_text TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, problem_id, attempt_no)
);

CREATE INDEX idx_attempts_student_id ON attempts(student_id, created_at);
CREATE INDEX idx_attempts_problem_id ON attempts(problem_id);
CREATE INDEX idx_attempts_is_correct ON attempts(is_correct);
CREATE INDEX idx_attempts_gave_up ON attempts(gave_up);

-- Study Time Logs table
CREATE TABLE study_time_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_start TIMESTAMP NOT NULL,
  session_end TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_study_time_logs_student_id ON study_time_logs(student_id, session_start);
CREATE INDEX idx_study_time_logs_session_range ON study_time_logs(session_start, session_end);

-- Policy: 소프트 삭제 쿼리용 뷰
CREATE VIEW active_users AS
SELECT * FROM users WHERE is_active = true AND deleted_at IS NULL;

CREATE VIEW active_ai_rules AS
SELECT * FROM ai_rules WHERE is_active = true AND deleted_at IS NULL;

CREATE VIEW active_options AS
SELECT * FROM options WHERE is_active = true AND deleted_at IS NULL;

CREATE VIEW active_units AS
SELECT * FROM units WHERE is_active = true AND deleted_at IS NULL;

CREATE VIEW active_problems AS
SELECT * FROM problems WHERE is_active = true AND deleted_at IS NULL;

-- 샘플 데이터 (옵션, AI 기준)
INSERT INTO options (type, value, "order") VALUES
  ('grade', '초1', 1),
  ('grade', '초2', 2),
  ('grade', '초3', 3),
  ('grade', '초4', 4),
  ('grade', '초5', 5),
  ('grade', '초6', 6),
  ('grade', '중1', 7),
  ('grade', '중2', 8),
  ('grade', '중3', 9),
  ('grade', '고1', 10),
  ('grade', '고2', 11),
  ('grade', '고3', 12),
  ('difficulty', '하', 1),
  ('difficulty', '중', 2),
  ('difficulty', '상', 3)
ON CONFLICT DO NOTHING;

INSERT INTO ai_rules (level, content) VALUES
  ('common', '너는 수학 과외 선생님이다. 학생의 풀이를 단계별로 검토하고, 정답을 직접 말하지 말고 다음 단계를 유도하는 질문을 제공하라.'),
  ('초', '초등학교 수준의 문제를 출제하고, 기초 연산과 도형 이해에 중점을 둔다.'),
  ('중', '중학교 수준의 문제를 출제하고, 방정식, 함수, 기하를 포함한다.'),
  ('고', '고등학교 수준의 문제를 출제하고, 미적분, 삼각함수 등 심화 내용을 포함한다.')
ON CONFLICT DO NOTHING;
