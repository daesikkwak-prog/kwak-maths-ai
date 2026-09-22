import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import type { ApiResponse } from '../../../../types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Username and password are required',
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 사용자 조회
    const { data: user, error: userError } = await supabase
      .from('active_users')
      .select('id, name, role, school_level, grade')
      .eq('name', username)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid username or password',
        } as ApiResponse<null>,
        { status: 401 }
      );
    }

    // TODO: 실제 비밀번호 검증은 Supabase Auth 또는 해시 기반 검증 필요
    // 현재는 테스트용으로 비밀번호 검증을 스킵

    // 응답에 사용자 정보 포함
    const response = NextResponse.json(
      {
        success: true,
        data: {
          user_id: user.id,
          username: user.name,
          role: user.role,
          school_level: user.school_level,
          grade: user.grade,
        },
      } as ApiResponse<any>
    );

    // 쿠키에 사용자 정보 저장 (간단한 세션)
    response.cookies.set('user_id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1주
    });

    response.cookies.set('user_role', user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    console.error('Error in POST /api/auth/login:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
