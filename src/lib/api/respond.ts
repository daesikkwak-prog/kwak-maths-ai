import { NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth';
import type { ApiResponse } from '@/types';

export function ok<T>(data: T) {
  return NextResponse.json({ success: true, data } as ApiResponse<T>);
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error } as ApiResponse<null>, { status });
}

/** API 라우트의 공통 예외 처리. 인증 실패는 401/403, 그 외는 500. */
export function handleError(context: string, err: unknown) {
  if (err instanceof AuthError) {
    return fail(err.message, err.status);
  }
  console.error(`Error in ${context}:`, err);
  return fail(err instanceof Error ? err.message : '서버 오류가 발생했습니다.', 500);
}
