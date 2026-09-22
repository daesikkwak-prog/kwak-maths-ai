import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { User, UserRole } from '@/types';

/**
 * 학생 계정은 관리자만 생성하므로 이메일을 따로 받지 않는다.
 * 사용자명(로그인 아이디)으로부터 Supabase Auth 계정용 내부 이메일을 만든다.
 */
export const AUTH_EMAIL_DOMAIN = 'kwak-maths.local';

export function usernameToEmail(username: string): string {
  const lower = username.trim().toLowerCase();
  const normalized = lower.replace(/[^a-z0-9._-]/g, '_');

  // 이메일에 쓸 수 없는 문자가 없으면 사용자명을 그대로 쓴다
  if (normalized === lower) {
    return `${normalized}@${AUTH_EMAIL_DOMAIN}`;
  }

  // 한글 이름 등은 치환만 하면 서로 같은 주소가 되어 충돌하므로(예: '곽민준'·'곽민서' → '___')
  // 원본 이름의 해시를 덧붙여 유효하면서 고유한 주소를 만든다
  const hash = createHash('sha256').update(username.trim()).digest('hex').slice(0, 16);
  return `${normalized}-${hash}@${AUTH_EMAIL_DOMAIN}`;
}

export const SESSION_COOKIE = 'user_id';
export const ROLE_COOKIE = 'user_role';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 1주

/** 쿠키에 담긴 세션으로 현재 로그인 사용자를 조회한다. 없으면 null. */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('active_users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as User;
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** 로그인 필수. 미로그인 시 AuthError(401). */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('로그인이 필요합니다.', 401);
  return user;
}

/** 특정 권한 필수. 권한 불일치 시 AuthError(403). */
export async function requireRole(role: UserRole): Promise<User> {
  const user = await requireUser();
  if (user.role !== role) throw new AuthError('권한이 없습니다.', 403);
  return user;
}

/**
 * 학생 본인 또는 관리자만 접근 가능한 자원을 검증한다.
 * 학생이 다른 학생의 기록을 조회하는 것을 막는다.
 */
export async function requireSelfOrAdmin(studentId: string): Promise<User> {
  const user = await requireUser();
  if (user.role !== 'admin' && user.id !== studentId) {
    throw new AuthError('권한이 없습니다.', 403);
  }
  return user;
}
