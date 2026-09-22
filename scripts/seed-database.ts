import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';

/**
 * 기초 데이터(학년/난이도 선택지, AI 기준) 시드.
 * 여러 번 실행해도 중복이 생기지 않도록 기존 활성 행을 확인한 뒤 없는 것만 넣는다.
 * (options의 UNIQUE(type, value, deleted_at)는 deleted_at이 NULL이면 중복을 막지 못한다)
 */
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GRADES = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const DIFFICULTIES = ['하', '중', '상'];

const AI_RULES = [
  {
    level: 'common',
    content:
      '너는 수학 과외 선생님이다. 학생의 풀이를 단계별로 검토하고, 정답을 직접 말하지 말고 다음 단계를 유도하는 질문을 제공하라.',
  },
  { level: '초', content: '초등학교 수준의 문제를 출제하고, 기초 연산과 도형 이해에 중점을 둔다.' },
  { level: '중', content: '중학교 수준의 문제를 출제하고, 방정식, 함수, 기하를 포함한다.' },
  { level: '고', content: '고등학교 수준의 문제를 출제하고, 미적분, 삼각함수 등 심화 내용을 포함한다.' },
];

async function seedOptions() {
  const { data: existing, error } = await supabase
    .from('active_options')
    .select('type, value');
  if (error) throw error;

  const have = new Set((existing || []).map((o) => `${o.type}:${o.value}`));

  const rows = [
    ...GRADES.map((value, i) => ({ type: 'grade', value, order: i + 1 })),
    ...DIFFICULTIES.map((value, i) => ({ type: 'difficulty', value, order: i + 1 })),
  ].filter((row) => !have.has(`${row.type}:${row.value}`));

  if (rows.length === 0) {
    console.log('✅ 선택지: 이미 모두 등록됨');
    return;
  }

  const { error: insertError } = await supabase.from('options').insert(rows);
  if (insertError) throw insertError;
  console.log(`✅ 선택지 ${rows.length}건 추가`);
}

async function seedAiRules() {
  const { data: existing, error } = await supabase.from('active_ai_rules').select('level');
  if (error) throw error;

  const have = new Set((existing || []).map((r) => r.level));
  const rows = AI_RULES.filter((r) => !have.has(r.level));

  if (rows.length === 0) {
    console.log('✅ AI 기준: 이미 모두 등록됨');
    return;
  }

  const { error: insertError } = await supabase.from('ai_rules').insert(rows);
  if (insertError) throw insertError;
  console.log(`✅ AI 기준 ${rows.length}건 추가`);
}

async function main() {
  console.log('🌱 기초 데이터 시드 시작\n');
  await seedOptions();
  await seedAiRules();
  console.log('\n🎉 완료');
}

main().catch((err) => {
  console.error('❌ 시드 실패:', err.message || err);
  process.exit(1);
});
