import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase/server';
import { evaluateAttempt } from '../../../lib/gemini';
import type { ApiResponse, GeminiResponse } from '../../../types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const body = await request.json();
    const { student_id, problem_id, image_base64 } = body;

    if (!student_id || !problem_id || !image_base64) {
      return NextResponse.json(
        {
          success: false,
          error: 'student_id, problem_id, and image_base64 are required',
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 문제 정보 조회
    const { data: problem, error: problemError } = await supabase
      .from('problems')
      .select('*')
      .eq('id', problem_id)
      .single();

    if (problemError || !problem) {
      return NextResponse.json(
        { success: false, error: 'Problem not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // 기존 시도 조회
    const { data: existingAttempts, error: attemptsError } = await supabase
      .from('attempts')
      .select('*')
      .eq('student_id', student_id)
      .eq('problem_id', problem_id)
      .order('attempt_no', { ascending: false });

    if (attemptsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch attempts' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    const nextAttemptNo = (existingAttempts?.length || 0) + 1;

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

    // Gemini로 채점
    const evaluation = await evaluateAttempt(
      problem.answer || '',
      problem.solution || '',
      image_base64,
      problem.source === 'ai_generated' ? `문제: 미제공 (AI 생성)` : '사용자 업로드 문제',
      existingAttempts || [],
      aiRules
    );

    // 시도 기록 저장
    const { data: attempt, error: insertError } = await supabase
      .from('attempts')
      .insert({
        student_id,
        problem_id,
        attempt_no: nextAttemptNo,
        is_correct: evaluation.is_correct,
        gave_up: false,
        issue_summary: evaluation.issue_summary,
        final_solution_text: evaluation.is_correct ? evaluation.final_solution_text : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting attempt:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save attempt' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        attempt_id: attempt.id,
        attempt_no: attempt.attempt_no,
        is_correct: attempt.is_correct,
        issue_summary: attempt.issue_summary,
        final_solution_text: attempt.final_solution_text,
        feedback: evaluation.feedback,
        can_give_up: nextAttemptNo >= 3, // 3회 이상 시도 후 포기 가능
      },
    } as ApiResponse<any>);
  } catch (err) {
    console.error('Error in POST /api/attempts:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const problemId = searchParams.get('problem_id');
    const studentId = searchParams.get('student_id');

    if (!problemId) {
      return NextResponse.json(
        { success: false, error: 'problem_id is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    let query = supabase.from('attempts').select('*').eq('problem_id', problemId);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query.order('attempt_no', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch attempts' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    } as ApiResponse<typeof data>);
  } catch (err) {
    console.error('Error in GET /api/attempts:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
