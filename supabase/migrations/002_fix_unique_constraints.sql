-- 002: 중복 데이터 방지
-- UNIQUE(type, value, deleted_at)는 deleted_at이 NULL일 때 중복을 막지 못한다
-- (Postgres는 NULL끼리 서로 다른 값으로 취급). 부분 유니크 인덱스로 교체한다.
-- 주의: 실행 전 기존 중복을 정리해야 한다 → npx tsx scripts/dedupe-options.ts

ALTER TABLE options DROP CONSTRAINT IF EXISTS options_type_value_deleted_at_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_options_unique_active
  ON options(type, value) WHERE deleted_at IS NULL;

ALTER TABLE ai_rules DROP CONSTRAINT IF EXISTS ai_rules_level_deleted_at_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_rules_unique_active
  ON ai_rules(level) WHERE deleted_at IS NULL;

-- 사용자명(로그인 아이디)도 활성 계정 기준으로만 유일해야 한다
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_name_active
  ON users(name) WHERE deleted_at IS NULL;
