import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { evaluateAttempt } from '@/lib/gemini';
import { requireUser, requireSelfOrAdmin } from '@/lib/auth';
import { resolveProblemPolicy } from '@/lib/problems/context';
import { ok, fail, handleError } from '@/lib/api/respond';
import { MIN_ATTEMPTS_FOR_GIVE_UP } from '@/lib/constants';
import type { Attempt } from '@/types';

// Gemini 호출이 20~50초까지 걸려 기본 제한(10초)으로는 중간에 끊긴다
export const maxDuration = 60;

/**
 * 풀이 이미지 제출 → Gemini 채점/피드백 → attempts 기록.
 * 제출 이미지는 저장하지 않고, 회차별 텍스트 요약(issue_summary)만 누적한다.
 */
export async function POST(request: NextRequest) {
  try {
    const student = await requireUser();

    const supabase = await getSupabaseServerClient();
    const { problem_id, image_base64 } = await request.json();

    if (!problem_id || !image_base64) {
      return fail('문제와 풀이 이미지가 필요합니다.');
    }

      // active_problems 뷰는 컬럼 추가 시 재생성해야 해서, 같은 조건을 직접 걸어 조회한다
    const { data: problem } = await supabase
      .from('problems')
      .select('*')
      .eq('id', problem_id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle();

    if (!problem) return fail('문제를 찾을 수 없습니다.', 404);

    const { data: existingAttempts, error: attemptsError } = await supabase
      .from('attempts')
      .select('*')
      .eq('student_id', student.id)
      .eq('problem_id', problem_id)
      .order('attempt_no', { ascending: true });

    if (attemptsError) return fail('시도 기록 조회에 실패했습니다.', 500);

    const attempts = (existingAttempts || []) as Attempt[];

    if (attempts.some((a) => a.is_correct || a.gave_up)) {
      return fail('이미 완료된 문제입니다.');
    }

    const { data: aiRules, error: rulesError } = await supabase
      .from('active_ai_rules')
      .select('*');

    if (rulesError || !aiRules) return fail('AI 기준 조회에 실패했습니다.', 500);

    const policy = await resolveProblemPolicy(supabase, problem, student);

    const evaluation = await evaluateAttempt({
      problemContent: problem.content || '',
      figureSvg: problem.figure_svg,
      answer: problem.answer,
      solution: problem.solution,
      formulaRequired: policy.formulaRequired,
      schoolLevel: policy.schoolLevel,
      previousAttempts: attempts,
      aiRules,
      studentImage: image_base64,
    });

    const nextAttemptNo = attempts.length + 1;

    const { data: attempt, error: insertError } = await supabase
      .from('attempts')
      .insert({
        student_id: student.id,
        problem_id,
        attempt_no: nextAttemptNo,
        is_correct: evaluation.is_correct,
        gave_up: false,
        issue_summary: evaluation.issue_summary,
        final_solution_text: evaluation.is_correct
          ? evaluation.final_solution_text ?? null
          : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting attempt:', insertError);
      return fail('시도 기록 저장에 실패했습니다.', 500);
    }

    return ok({
      attempt_id: attempt.id,
      attempt_no: attempt.attempt_no,
      is_correct: attempt.is_correct,
      issue_summary: attempt.issue_summary,
      final_solution_text: attempt.final_solution_text,
      feedback: evaluation.feedback,
      can_give_up: !attempt.is_correct && nextAttemptNo >= MIN_ATTEMPTS_FOR_GIVE_UP,
    });
  } catch (err) {
    return handleError('POST /api/attempts', err);
  }
}

/** 특정 문제의 시도 기록 조회. 학생은 본인 기록만 볼 수 있다. */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const problemId = searchParams.get('problem_id');
    const requestedStudentId = searchParams.get('student_id');

    if (!problemId) return fail('problem_id는 필수입니다.');

    // student_id 미지정 시 본인 기록. 지정 시 본인 또는 관리자만 조회 가능.
    const user = requestedStudentId
      ? await requireSelfOrAdmin(requestedStudentId)
      : await requireUser();
    const studentId = requestedStudentId || user.id;

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('problem_id', problemId)
      .eq('student_id', studentId)
      .order('attempt_no', { ascending: true });

    if (error) return fail('시도 기록 조회에 실패했습니다.', 500);

    return ok(data);
  } catch (err) {
    return handleError('GET /api/attempts', err);
  }
}
