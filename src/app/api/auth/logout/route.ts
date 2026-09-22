import { NextResponse } from 'next/server';
import { SESSION_COOKIE, ROLE_COOKIE } from '@/lib/auth';
import type { ApiResponse } from '@/types';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    data: { message: '로그아웃되었습니다.' },
  } as ApiResponse<any>);

  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  response.cookies.set(ROLE_COOKIE, '', { path: '/', maxAge: 0 });

  return response;
}
