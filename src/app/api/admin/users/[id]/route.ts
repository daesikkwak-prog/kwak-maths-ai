import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole, usernameToEmail } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api/respond';

/** 계정 정보/비밀번호 수정 (관리자 전용). 학생은 본인 정보를 수정할 수 없다. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('admin');

    const { id: userId } = await params;
    const supabase = await getSupabaseServerClient();
    const body = await request.json();

    const { data: target } = await supabase
      .from('users')
      .select('id, name, auth_user_id')
      .eq('id', userId)
      .maybeSingle();

    if (!target) return fail('사용자를 찾을 수 없습니다.', 404);

    const updateData: Record<string, unknown> = {};
    if (body.school_level) updateData.school_level = body.school_level;
    if (body.grade !== undefined) updateData.grade = body.grade;
    if (body.my_problem_formula_required !== undefined) {
      updateData.my_problem_formula_required = body.my_problem_formula_required;
    }

    // 비밀번호 변경: Auth 계정이 없으면(마이그레이션 이전 계정) 이 시점에 생성해 연결한다
    if (body.password) {
      if (String(body.password).length < 6) {
        return fail('비밀번호는 6자 이상이어야 합니다.');
      }

      if (target.auth_user_id) {
        const { error: pwError } = await supabase.auth.admin.updateUserById(
          target.auth_user_id,
          { password: body.password }
        );
        if (pwError) {
          console.error('Error updating password:', pwError);
          return fail('비밀번호 변경에 실패했습니다.', 500);
        }
      } else {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: usernameToEmail(target.name),
          password: body.password,
          email_confirm: true,
          user_metadata: { name: target.name },
        });
        if (authError || !authUser?.user) {
          console.error('Error creating auth user:', authError);
          return fail('인증 계정 생성에 실패했습니다.', 500);
        }
        updateData.auth_user_id = authUser.user.id;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return fail('수정할 항목이 없습니다.');
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return fail('사용자 수정에 실패했습니다.', 500);
    }

    return ok(data);
  } catch (err) {
    return handleError('PATCH /api/admin/users/[id]', err);
  }
}

/** 소프트 삭제 (실제 DELETE 금지). Auth 계정은 로그인만 차단한다. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireRole('admin');
    const { id: userId } = await params;

    if (admin.id === userId) {
      return fail('본인 계정은 삭제할 수 없습니다.');
    }

    const supabase = await getSupabaseServerClient();

    const { data: target } = await supabase
      .from('users')
      .select('id, auth_user_id')
      .eq('id', userId)
      .maybeSingle();

    if (!target) return fail('사용자를 찾을 수 없습니다.', 404);

    const { error } = await supabase
      .from('users')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      return fail('사용자 삭제에 실패했습니다.', 500);
    }

    // 기록 보존을 위해 Auth 계정도 삭제하지 않고 로그인만 막는다
    if (target.auth_user_id) {
      await supabase.auth.admin.updateUserById(target.auth_user_id, {
        ban_duration: '876000h',
      });
    }

    return ok({ message: '사용자가 삭제되었습니다.' });
  } catch (err) {
    return handleError('DELETE /api/admin/users/[id]', err);
  }
}
