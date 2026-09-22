import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';

/**
 * 최초 관리자 계정 생성 스크립트.
 * 사용법: npx tsx scripts/create-admin.ts <사용자명> <비밀번호>
 */
loadEnv();

const AUTH_EMAIL_DOMAIN = 'kwak-maths.local';

function usernameToEmail(username: string) {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  return `${normalized}@${AUTH_EMAIL_DOMAIN}`;
}

async function main() {
  const [name, password] = process.argv.slice(2);

  if (!name || !password) {
    console.error('사용법: npx tsx scripts/create-admin.ts <사용자명> <비밀번호>');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('비밀번호는 6자 이상이어야 합니다.');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: existing } = await supabase
    .from('users')
    .select('id, auth_user_id')
    .eq('name', name)
    .maybeSingle();

  const email = usernameToEmail(name);

  if (existing?.auth_user_id) {
    const { error } = await supabase.auth.admin.updateUserById(existing.auth_user_id, {
      password,
    });
    if (error) throw error;
    console.log(`✅ 기존 계정 '${name}'의 비밀번호를 변경했습니다.`);
    return;
  }

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'admin' },
  });
  if (authError) throw authError;

  if (existing) {
    const { error } = await supabase
      .from('users')
      .update({ auth_user_id: authUser.user.id })
      .eq('id', existing.id);
    if (error) throw error;
    console.log(`✅ 기존 계정 '${name}'에 인증 계정을 연결했습니다.`);
    return;
  }

  const { error } = await supabase.from('users').insert({
    id: authUser.user.id,
    auth_user_id: authUser.user.id,
    name,
    role: 'admin',
    school_level: '중',
    grade: 1,
    my_problem_formula_required: true,
  });
  if (error) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw error;
  }

  console.log(`✅ 관리자 계정 '${name}' 생성 완료. 로그인 아이디: ${name}`);
}

main().catch((err) => {
  console.error('❌ 실패:', err.message || err);
  process.exit(1);
});
