import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'user_id';
const ROLE_COOKIE = 'user_role';

/**
 * 화면 단위 접근 제어.
 * 쿠키 유무만 확인하는 1차 방어선이며, 실제 권한 검증은 각 API 라우트에서 수행한다.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userId = request.cookies.get(SESSION_COOKIE)?.value;
  const role = request.cookies.get(ROLE_COOKIE)?.value;

  const isAdminPage = pathname.startsWith('/admin');
  const isStudentPage = pathname.startsWith('/student');

  if (!isAdminPage && !isStudentPage) return NextResponse.next();

  if (!userId) {
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPage && role !== 'admin') {
    return NextResponse.redirect(new URL('/student/solve', request.url));
  }

  if (isStudentPage && role === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/student/:path*'],
};
