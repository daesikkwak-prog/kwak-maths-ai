import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
import { generateSolutionExplanation } from '../../../../../lib/gemini';
import type { ApiResponse } from '../../../../../types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: problemId } = await params;
    const supabase = await getSupabaseServerClient();
    const body = await request.json();
    const { student_id } = body;

    if (!student_id) {
      return NextResponse.json(
        { success: false, error: 'student_id is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 문제 정보 조회
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('*')
      .eq('id', problemId)
      .single();

    if (problemError || !problem) {
      return NextResponse.json(
        { success: false, error: 'Problem not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // 해당 문제의 시도 횟수 확인
    const { data: attempts, error: attemptsError } = await supabase
      .from('attempts')
      .select('*')
      .eq('student_id', student_id)
      .eq('problem_id', problemId);

    if (attemptsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch attempts' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    const attemptCount = attempts?.length || 0;

    // 3회 미만 시도 검증
    if (attemptCount < 3) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot give up before 3 attempts (current: ${attemptCount})`,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // AI 규칙 조회
    const { data: aiRules, error: rulesError } = await supabase
      .from('active_ai_rules')
      .select('*');

    if (rulesError || !aiRules) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch AI rules' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // 정답과 설명 생성 (AI 생성 문제인 경우)
    let explanation = problem.solution || '';
    if (problem.source === 'ai_generated' && !explanation) {
      const problemContext = `문제: ${problem.id} (${problem.grade_option_id})`;
      explanation = await generateSolutionExplanation(problemContext, problem.answer || '', aiRules);
    }

    // 포기 처리: 최종 시도 기록 생성
    const { data: finalAttempt, error: insertError } = await supabase
      .from('attempts')
      .insert({
        student_id,
        problem_id: problemId,
        attempt_no: attemptCount + 1,
        is_correct: false,
        gave_up: true,
        issue_summary: '포기',
        final_solution_text: explanation,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error recording give-up:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to record give-up' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        attempt_id: finalAttempt.id,
        attempt_no: finalAttempt.attempt_no,
        gave_up: true,
        answer: problem.answer,
        explanation,
        message: '문제를 포기했습니다. 위의 정답과 설명을 참고하세요.',
      },
    } as ApiResponse<any>);
  } catch (err) {
    console.error('Error in POST /api/problems/[id]/give-up:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
