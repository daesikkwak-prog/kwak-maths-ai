import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { getStudentHistory } from '@/lib/stats';
import { ok, handleError } from '@/lib/api/respond';

/** 아직 정답도 포기도 아닌, 풀다 만 문제 목록 (이어풀기 진입점용) */
export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await getSupabaseServerClient();

    const history = await getStudentHistory(supabase, user.id, 200);
    const inProgress = history
      .filter((item) => item.status === 'in_progress')
      .slice(0, 10)
      .map((item) => ({
        problem_id: item.problem_id,
        source: item.source,
        content: item.content,
        unit_name: item.unit_name,
        difficulty: item.difficulty,
        attempt_count: item.attempts.length,
        last_attempt_at: item.last_attempt_at,
      }));

    return ok(inProgress);
  } catch (err) {
    return handleError('GET /api/students/me/in-progress', err);
  }
}
