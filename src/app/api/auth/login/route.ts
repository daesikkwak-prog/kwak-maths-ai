import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import {
  usernameToEmail,
  SESSION_COOKIE,
  ROLE_COOKIE,
  SESSION_MAX_AGE,
} from '@/lib/auth';
import { fail, handleError } from '@/lib/api/respond';
import type { ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return fail('사용자명과 비밀번호를 입력하세요.');
    }

    const supabase = await getSupabaseServerClient();

    const { data: user } = await supabase
      .from('active_users')
      .select('id, name, role, school_level, grade, auth_user_id')
      .eq('name', username)
      .maybeSingle();

    if (!user) {
      return fail('사용자명 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    // Auth 계정의 실제 이메일을 조회해서 쓴다.
    // 사용자명 → 이메일 변환 규칙이 바뀌어도 기존 계정이 로그인 불가가 되지 않도록.
    let email = usernameToEmail(user.name);
    if (user.auth_user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(user.auth_user_id);
      if (authUser?.user?.email) email = authUser.user.email;
    }

    // Supabase Auth로 실제 비밀번호 검증
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Auth 계정이 없는 계정(마이그레이션 이전 생성분)은 비밀번호 재설정이 필요하다
      if (!user.auth_user_id) {
        return fail(
          '비밀번호가 설정되지 않은 계정입니다. 관리자에게 비밀번호 설정을 요청하세요.',
          401
        );
      }
      return fail('사용자명 또는 비밀번호가 올바르지 않습니다.', 401);
    }

    const response = NextResponse.json({
      success: true,
      data: {
        user_id: user.id,
        username: user.name,
        role: user.role,
        school_level: user.school_level,
        grade: user.grade,
      },
    } as ApiResponse<any>);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_MAX_AGE,
    };

    response.cookies.set(SESSION_COOKIE, user.id, cookieOptions);
    response.cookies.set(ROLE_COOKIE, user.role, cookieOptions);

    return response;
  } catch (err) {
    return handleError('POST /api/auth/login', err);
  }
}
