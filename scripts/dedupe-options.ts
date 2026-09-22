import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';

/**
 * 중복 선택지/AI기준 정리.
 * UNIQUE(type, value, deleted_at)는 deleted_at이 NULL이면 중복을 막지 못해
 * (Postgres에서 NULL끼리는 서로 다른 값으로 취급) 시드가 두 번 실행되며 중복이 생겼다.
 * 가장 먼저 만들어진 행만 남기고 나머지는 소프트 삭제한다.
 */
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function dedupe(
  table: string,
  keyOf: (row: any) => string,
  orderColumn: string
) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .is('deleted_at', null)
    .order(orderColumn, { ascending: true });

  if (error) throw error;

  const seen = new Set<string>();
  const dupIds: string[] = [];

  for (const row of data || []) {
    const key = keyOf(row);
    if (seen.has(key)) dupIds.push(row.id);
    else seen.add(key);
  }

  if (dupIds.length === 0) {
    console.log(`✅ ${table}: 중복 없음 (${seen.size}건)`);
    return;
  }

  // UNIQUE(..., deleted_at) 제약 때문에 같은 시각으로 여러 건을 지우면 충돌한다.
  // 행마다 1ms씩 다른 시각을 부여해 하나씩 처리한다.
  const base = Date.now();
  for (const [i, id] of dupIds.entries()) {
    const { error: updateError } = await supabase
      .from(table)
      .update({ is_active: false, deleted_at: new Date(base + i).toISOString() })
      .eq('id', id);
    if (updateError) throw updateError;
  }
  console.log(`🧹 ${table}: 중복 ${dupIds.length}건 정리 (남은 ${seen.size}건)`);
}

async function main() {
  await dedupe('options', (r) => `${r.type}:${r.value}`, 'id');
  await dedupe('ai_rules', (r) => r.level, 'id');
}

main().catch((err) => {
  console.error('❌ 실패:', err.message || err);
  process.exit(1);
});
