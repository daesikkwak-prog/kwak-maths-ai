import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';

/** DB 마이그레이션 적용 여부 및 기초 데이터 상태를 점검한다. */
loadEnv();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ .env.local에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');
    process.exit(1);
  }

  const supabase = createClient(url, key);
  let allOk = true;

  const check = async (label: string, fn: () => Promise<string | null>) => {
    try {
      const problem = await fn();
      if (problem) {
        allOk = false;
        console.log(`❌ ${label}: ${problem}`);
      } else {
        console.log(`✅ ${label}`);
      }
    } catch (err: any) {
      allOk = false;
      console.log(`❌ ${label}: ${err.message || err}`);
    }
  };

  await check('problems.content 컬럼', async () => {
    const { error } = await supabase.from('problems').select('content').limit(1);
    return error ? '마이그레이션 001 미적용 (supabase/migrations/001_*.sql 실행 필요)' : null;
  });

  await check('users.auth_user_id 컬럼', async () => {
    const { error } = await supabase.from('users').select('auth_user_id').limit(1);
    return error ? '마이그레이션 001 미적용' : null;
  });

  await check('active_problems 뷰에 content 반영', async () => {
    const { error } = await supabase.from('active_problems').select('content').limit(1);
    return error ? '뷰 재생성 필요 (마이그레이션 001의 DROP/CREATE VIEW 부분)' : null;
  });

  await check('선택지(학년/난이도) 데이터', async () => {
    const { data, error } = await supabase.from('active_options').select('type');
    if (error) return error.message;
    const grades = (data || []).filter((o) => o.type === 'grade').length;
    const diffs = (data || []).filter((o) => o.type === 'difficulty').length;
    return grades && diffs ? null : `학년 ${grades}개 / 난이도 ${diffs}개 — npm run seed 필요`;
  });

  await check('AI 기준 데이터', async () => {
    const { data, error } = await supabase.from('active_ai_rules').select('level');
    if (error) return error.message;
    const levels = new Set((data || []).map((r) => r.level));
    const missing = ['common', '초', '중', '고'].filter((l) => !levels.has(l));
    return missing.length ? `누락된 기준: ${missing.join(', ')}` : null;
  });

  await check('관리자 계정', async () => {
    const { data, error } = await supabase
      .from('active_users')
      .select('id')
      .eq('role', 'admin');
    if (error) return error.message;
    return data && data.length > 0
      ? null
      : '관리자 계정 없음 — npx tsx scripts/create-admin.ts <아이디> <비밀번호>';
  });

  await check('단원 데이터', async () => {
    const { data, error } = await supabase.from('active_units').select('id');
    if (error) return error.message;
    return data && data.length > 0 ? null : '등록된 단원 없음 — 관리자 화면에서 등록하세요';
  });

  console.log(allOk ? '\n🎉 모든 점검 통과' : '\n⚠️  위 항목을 처리한 뒤 다시 실행하세요.');
}

main().catch((err) => {
  console.error('❌ 점검 실패:', err.message || err);
  process.exit(1);
});
