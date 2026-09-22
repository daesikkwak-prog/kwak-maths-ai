import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';
import { UNITS } from './unit-data';

/** 학년별 단원 순서를 seed-units.ts의 교육과정 순서대로 재정렬한다. */
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: grades } = await supabase
    .from('active_options')
    .select('id, value')
    .eq('type', 'grade');

  const gradeMap = new Map((grades || []).map((g) => [g.value as string, g.id as string]));
  let fixed = 0;

  for (const [gradeValue, names] of Object.entries(UNITS)) {
    const gradeId = gradeMap.get(gradeValue);
    if (!gradeId) continue;

    const { data: units } = await supabase
      .from('active_units')
      .select('id, name, order')
      .eq('grade_option_id', gradeId);

    for (const unit of units || []) {
      const idx = names.indexOf(unit.name);
      const expected = idx === -1 ? 999 : idx + 1;
      if (unit.order === expected) continue;

      await supabase.from('units').update({ order: expected }).eq('id', unit.id);
      console.log(`  ${gradeValue} '${unit.name}': ${unit.order} → ${expected}`);
      fixed += 1;
    }
  }

  console.log(fixed ? `\n✅ ${fixed}건 정렬 수정` : '\n✅ 정렬 이상 없음');
}

main().catch((err) => {
  console.error('❌ 실패:', err.message || err);
  process.exit(1);
});
