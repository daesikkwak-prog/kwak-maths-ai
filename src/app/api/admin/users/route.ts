import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole, usernameToEmail } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api/respond';

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin');

    const supabase = await getSupabaseServerClient();
    const role = request.nextUrl.searchParams.get('role'); // 'student' | 'admin'

    let query = supabase.from('active_users').select('*');
    if (role) query = query.eq('role', role);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return fail('사용자 목록 조회에 실패했습니다.', 500);

    return ok(data);
  } catch (err) {
    return handleError('GET /api/admin/users', err);
  }
}

/**
 * 계정 생성 (관리자 전용, 학생 자가가입 없음).
 * Supabase Auth 계정을 먼저 만들고, 같은 id로 users 행을 생성한다.
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole('admin');

    const body = await request.json();
    const { name, password, role, school_level, grade, my_problem_formula_required } = body;

    if (!name || !password || !role || !school_level || grade === undefined) {
      return fail('사용자명, 비밀번호, 권한, 학교급, 학년은 필수입니다.');
    }
    if (String(password).length < 6) {
      return fail('비밀번호는 6자 이상이어야 합니다.');
    }
    if (role !== 'student' && role !== 'admin') {
      return fail('권한은 student 또는 admin이어야 합니다.');
    }

    const supabase = await getSupabaseServerClient();

    // 소프트 삭제된 계정도 Auth 계정과 이름을 계속 점유하므로 함께 확인한다
    const { data: duplicate } = await supabase
      .from('users')
      .select('id, deleted_at')
      .eq('name', name)
      .maybeSingle();

    if (duplicate) {
      return fail(
        duplicate.deleted_at
          ? '삭제된 계정이 같은 사용자명을 사용 중입니다. 다른 이름을 입력하세요.'
          : '이미 사용 중인 사용자명입니다.'
      );
    }

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: usernameToEmail(name),
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });

    if (authError || !authUser?.user) {
      console.error('Error creating auth user:', authError);
      return fail(
        `인증 계정 생성에 실패했습니다.${authError?.message ? ` (${authError.message})` : ''}`,
        500
      );
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        auth_user_id: authUser.user.id,
        name,
        role,
        school_level,
        grade,
        my_problem_formula_required: my_problem_formula_required ?? true,
      })
      .select()
      .single();

    if (error) {
      // users 행 생성 실패 시 Auth 계정이 남지 않도록 롤백
      await supabase.auth.admin.deleteUser(authUser.user.id);
      console.error('Error creating user:', error);
      return fail('사용자 생성에 실패했습니다.', 500);
    }

    return ok(user);
  } catch (err) {
    return handleError('POST /api/admin/users', err);
  }
}
