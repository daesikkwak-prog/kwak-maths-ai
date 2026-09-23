import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { sanitizeSvg } from '@/lib/utils/svg';
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
      .select('id, source, content, figure_svg, unit_id, grade_option_id, difficulty_option_id, created_at')
      .eq('id', id)
      .maybeSingle();

    if (!problem) return fail('문제를 찾을 수 없습니다.', 404);

    // "같은 유형 다음 문제" 출제에 필요한 조건과 표시용 이름
    let gradeLabel = '';
    let difficultyLabel = '';
    const optionIds = [problem.grade_option_id, problem.difficulty_option_id].filter(
      Boolean
    ) as string[];

    if (optionIds.length > 0) {
      const { data: options } = await supabase
        .from('options')
        .select('id, value')
        .in('id', optionIds);

      gradeLabel = options?.find((o) => o.id === problem.grade_option_id)?.value || '';
      difficultyLabel = options?.find((o) => o.id === problem.difficulty_option_id)?.value || '';
    }

    let unitLabel = '';
    if (problem.unit_id) {
      const { data: unit } = await supabase
        .from('units')
        .select('name')
        .eq('id', problem.unit_id)
        .maybeSingle();
      unitLabel = unit?.name || '';
    }

    return ok({
      problem_id: problem.id,
      problem_text: problem.content,
      figure_svg: sanitizeSvg(problem.figure_svg),
      source: problem.source,
      created_at: problem.created_at,
      grade_option_id: problem.grade_option_id,
      unit_id: problem.unit_id,
      difficulty_option_id: problem.difficulty_option_id,
      grade_label: gradeLabel,
      unit_label: unitLabel,
      difficulty_label: difficultyLabel,
    });
  } catch (err) {
    return handleError('GET /api/problems/[id]', err);
  }
}
