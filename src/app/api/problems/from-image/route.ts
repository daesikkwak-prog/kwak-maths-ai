import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';
import { parseUserUploadedProblem } from '../../../../lib/gemini';
import type { ApiResponse } from '../../../../types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const body = await request.json();
    const { image_base64 } = body;

    if (!image_base64) {
      return NextResponse.json(
        { success: false, error: 'image_base64 is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Gemini로 이미지에서 문제 텍스트 추출
    const problemText = await parseUserUploadedProblem(image_base64);

    // 문제 저장 (정답 없음)
    const { data: problem, error: insertError } = await supabase
      .from('problems')
      .insert({
        source: 'user_uploaded',
        answer: null,
        solution: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving problem:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save problem' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        problem_id: problem.id,
        problem_text: problemText,
        created_at: problem.created_at,
      },
    } as ApiResponse<typeof data>);
  } catch (err) {
    console.error('Error in POST /api/problems/from-image:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
