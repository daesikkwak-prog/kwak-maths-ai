import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api/respond';

/** 문제 본문 조회 (새로고침 후에도 풀던 문제를 다시 볼 수 있도록). 정답/풀이는 제외. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUser();

    const { id } = await params;
    const supabase = await getSupabaseServerClient();

    const { data: problem } = await supabase
      .from('active_problems')
      .select('id, source, content, unit_id, grade_option_id, difficulty_option_id, created_at')
      .eq('id', id)
      .maybeSingle();

    if (!problem) return fail('문제를 찾을 수 없습니다.', 404);

    return ok({
      problem_id: problem.id,
      problem_text: problem.content,
      source: problem.source,
      created_at: problem.created_at,
    });
  } catch (err) {
    return handleError('GET /api/problems/[id]', err);
  }
}
