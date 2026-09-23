-- 003: 문제 그림(SVG) 저장 컬럼 추가
-- Supabase SQL Editor에서 실행할 것
--
-- 도형/그래프/수직선처럼 그림이 있어야 이해되는 문제는 AI가 문제와 함께
-- SVG 그림을 생성한다. 문제 본문처럼 출제 시점에 고정 저장한다.

ALTER TABLE problems ADD COLUMN IF NOT EXISTS figure_svg TEXT;
