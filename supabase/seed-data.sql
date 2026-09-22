-- Insert options (학년, 난이도)
INSERT INTO options (type, value, "order") VALUES
  ('grade', '초1', 1),
  ('grade', '초2', 2),
  ('grade', '초3', 3),
  ('grade', '초4', 4),
  ('grade', '초5', 5),
  ('grade', '초6', 6),
  ('grade', '중1', 7),
  ('grade', '중2', 8),d
  ('grade', '중3', 9),
  ('grade', '고1', 10),
  ('grade', '고2', 11),
  ('grade', '고3', 12),
  ('difficulty', '하', 1),
  ('difficulty', '중', 2),
  ('difficulty', '상', 3)
ON CONFLICT DO NOTHING;

-- Insert AI rules
INSERT INTO ai_rules (level, content) VALUES
  ('common', '너는 수학 과외 선생님이다. 학생의 풀이를 단계별로 검토하고, 정답을 직접 말하지 말고 다음 단계를 유도하는 질문을 제공하라.'),
  ('초', '초등학교 수준의 문제를 출제하고, 기초 연산과 도형 이해에 중점을 둔다.'),
  ('중', '중학교 수준의 문제를 출제하고, 방정식, 함수, 기하를 포함한다.'),
  ('고', '고등학교 수준의 문제를 출제하고, 미적분, 삼각함수 등 심화 내용을 포함한다.')
ON CONFLICT DO NOTHING;
