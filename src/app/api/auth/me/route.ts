import { getCurrentUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api/respond';

/** 현재 로그인한 사용자 정보. 프론트엔드 세션 확인용. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail('로그인이 필요합니다.', 401);

    return ok({
      id: user.id,
      name: user.name,
      role: user.role,
      school_level: user.school_level,
      grade: user.grade,
      my_problem_formula_required: user.my_problem_formula_required,
    });
  } catch (err) {
    return handleError('GET /api/auth/me', err);
  }
}
