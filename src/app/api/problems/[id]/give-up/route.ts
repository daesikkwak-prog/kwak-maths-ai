import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { generateSolutionExplanation } from '@/lib/gemini';
import { requireUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api/respond';
import { MIN_ATTEMPTS_FOR_GIVE_UP } from '@/lib/constants';
import type { Attempt } from '@/types';

// Gemini 호출이 20~50초까지 걸려 기본 제한(10초)으로는 중간에 끊긴다
export const maxDuration = 60;

/** 포기 처리: 3회 이상 시도한 경우에만 허용, 정답 + 쉬운 풀이 제공. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const student = await requireUser();

    const { id: problemId } = await params;
    const supabase = await getSupabaseServerClient();

    const { data: problem } = await supabase
      .from('active_problems')
      .select('*')
      .eq('id', problemId)
      .maybeSingle();

    if (!problem) return fail('문제를 찾을 수 없습니다.', 404);

    const { data: attemptRows, error: attemptsError } = await supabase
      .from('attempts')
      .select('*')
      .eq('student_id', student.id)
      .eq('problem_id', problemId)
      .order('attempt_no', { ascending: true });

    if (attemptsError) return fail('시도 기록 조회에 실패했습니다.', 500);

    const attempts = (attemptRows || []) as Attempt[];

    if (attempts.some((a) => a.is_correct || a.gave_up)) {
      return fail('이미 완료된 문제입니다.');
    }

    if (attempts.length < MIN_ATTEMPTS_FOR_GIVE_UP) {
      return fail(
        `${MIN_ATTEMPTS_FOR_GIVE_UP}회 이상 시도해야 포기할 수 있습니다. (현재 ${attempts.length}회)`
      );
    }

    const { data: aiRules, error: rulesError } = await supabase
      .from('active_ai_rules')
      .select('*');

    if (rulesError || !aiRules) return fail('AI 기준 조회에 실패했습니다.', 500);

    // 저장된 정답/풀이가 있으면 그대로 사용, 없으면(내 문제 풀기) AI가 즉석 생성
    let answer = problem.answer || '';
    let explanation = problem.solution || '';

    if (!answer || !explanation) {
      const generated = await generateSolutionExplanation(
        problem.content || '',
        answer,
        student.school_level,
        aiRules,
        problem.figure_svg
      );
      answer = answer || generated.answer;
      explanation = generated.explanation;

      // user_uploaded 문제는 이때 구한 정답/풀이를 기록으로 남긴다
      if (problem.source === 'user_uploaded') {
        await supabase
          .from('problems')
          .update({ answer, solution: explanation })
          .eq('id', problemId);
      }
    }

    const { data: finalAttempt, error: insertError } = await supabase
      .from('attempts')
      .insert({
        student_id: student.id,
        problem_id: problemId,
        attempt_no: attempts.length + 1,
        is_correct: false,
        gave_up: true,
        issue_summary: '포기',
        final_solution_text: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error recording give-up:', insertError);
      return fail('포기 처리에 실패했습니다.', 500);
    }

    return ok({
      attempt_id: finalAttempt.id,
      attempt_no: finalAttempt.attempt_no,
      gave_up: true,
      answer,
      explanation,
      message: '문제를 포기했습니다. 정답과 풀이를 확인하세요.',
    });
  } catch (err) {
    return handleError('POST /api/problems/[id]/give-up', err);
  }
}
