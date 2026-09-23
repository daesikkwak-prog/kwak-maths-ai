-- 004: active_problems 뷰에 figure_svg 반영
-- Supabase SQL Editor에서 실행할 것
--
-- Postgres는 CREATE VIEW ... SELECT * 시점의 컬럼 목록을 고정한다.
-- 003에서 problems.figure_svg를 추가했지만 뷰는 그대로라 뷰로 조회하면
-- "column active_problems.figure_svg does not exist" 오류가 났다.
-- (001에서 content 컬럼을 추가했을 때와 같은 이유로 뷰를 다시 만든다)

DROP VIEW IF EXISTS active_problems;
CREATE VIEW active_problems AS
SELECT * FROM problems WHERE is_active = true AND deleted_at IS NULL;
