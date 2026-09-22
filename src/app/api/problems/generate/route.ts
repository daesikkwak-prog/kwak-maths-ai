import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import { generateProblem } from '../../../../lib/gemini';
import type { ApiResponse } from '../../../../types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const body = await request.json();
    const { grade_option_id, unit_id, difficulty_option_id } = body;

    if (!grade_option_id || !difficulty_option_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'grade_option_id and difficulty_option_id are required',
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 학년과 난이도 정보 조회
    const { data: gradeOption, error: gradeError } = await supabase
      .from('options')
      .select('value')
      .eq('id', grade_option_id)
      .single();

    const { data: diffOption, error: diffError } = await supabase
      .from('options')
      .select('value')
      .eq('id', difficulty_option_id)
      .single();

    if (gradeError || diffError) {
      return NextResponse.json(
        { success: false, error: 'Invalid grade or difficulty option' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 단원 정보 조회
    let unitName = '';
    if (unit_id) {
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .select('name')
        .eq('id', unit_id)
        .single();

      if (!unitError && unit) {
        unitName = unit.name;
      }
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

    // Gemini로 문제 생성
    const aiResponse = await generateProblem(
      gradeOption.value,
      unitName || '일반',
      diffOption.value,
      aiRules
    );

    // DB에 문제 저장
    const { data: problem, error: insertError } = await supabase
      .from('problems')
      .insert({
        source: 'ai_generated',
        grade_option_id,
        unit_id: unit_id || null,
        difficulty_option_id,
        answer: aiResponse.answer,
        solution: aiResponse.solution,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting problem:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save problem' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        problem_id: problem.id,
        problem_text: aiResponse.problem,
        created_at: problem.created_at,
      },
    } as ApiResponse<typeof data>);
  } catch (err) {
    console.error('Error in POST /api/problems/generate:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
