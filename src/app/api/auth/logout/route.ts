import { NextResponse } from 'next/server';
import type { ApiResponse } from '../../../../types';

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
    } as ApiResponse<any>);

    // 쿠키 삭제
    response.cookies.set('user_id', '', {
      httpOnly: true,
      maxAge: 0,
    });

    response.cookies.set('user_role', '', {
      httpOnly: true,
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error('Error in POST /api/auth/logout:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
