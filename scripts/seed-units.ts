import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';
import { UNITS } from './unit-data';

/**
 * 학년별 단원 시드 (초1~고3).
 * 교육과정 대단원 기준이며, 1·2학기를 합치고 학기별로 반복되는 동일 단원명은 하나로 통합했다.
 * 여러 번 실행해도 이미 등록된 단원은 건너뛴다.
 *
 * formula_required(풀이 과정 필수):
 *   초1~초2는 단순 연산·세기·분류가 대부분이라 false,
 *   초3 이상은 true. 등록 후 관리자 화면에서 단원별로 조정 가능.
 */
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FORMULA_NOT_REQUIRED = new Set(['초1', '초2']);

async function main() {
  const { data: grades, error } = await supabase
    .from('active_options')
    .select('id, value')
    .eq('type', 'grade');

  if (error) throw error;

  const gradeMap = new Map((grades || []).map((g) => [g.value as string, g.id as string]));

  let inserted = 0;
  let skipped = 0;

  for (const [gradeValue, names] of Object.entries(UNITS)) {
    const gradeId = gradeMap.get(gradeValue);
    if (!gradeId) {
      console.log(`⚠️  ${gradeValue}: 학년 선택지가 없어 건너뜁니다.`);
      continue;
    }

    const { data: existing } = await supabase
      .from('active_units')
      .select('name')
      .eq('grade_option_id', gradeId);

    const have = new Set((existing || []).map((u) => u.name as string));

    const rows = names
      .map((name, i) => ({
        grade_option_id: gradeId,
        name,
        answer_type: 'subjective',
        formula_required: !FORMULA_NOT_REQUIRED.has(gradeValue),
        order: i + 1,
      }))
      .filter((row) => !have.has(row.name));

    skipped += names.length - rows.length;

    if (rows.length === 0) {
      console.log(`✅ ${gradeValue}: 이미 모두 등록됨 (${names.length}개)`);
      continue;
    }

    const { error: insertError } = await supabase.from('units').insert(rows);
    if (insertError) throw insertError;

    inserted += rows.length;
    console.log(`✅ ${gradeValue}: ${rows.length}개 추가`);
  }

  console.log(`\n🎉 총 ${inserted}개 추가, ${skipped}개 건너뜀`);
}

main().catch((err) => {
  console.error('❌ 단원 시드 실패:', err.message || err);
  process.exit(1);
});
