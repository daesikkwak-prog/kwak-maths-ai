import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../lib/supabase/server';
import type { ApiResponse } from '../../../../../../types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ level: string }> }
) {
  try {
    const { level } = await params;
    const supabase = await getSupabaseServerClient();
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'content is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 기존 규칙 찾기
    const { data: existingRule } = await supabase
      .from('ai_rules')
      .select('id')
      .eq('level', level)
      .eq('is_active', true)
      .single();

    let result;
    if (existingRule) {
      // 기존 규칙 업데이트
      result = await supabase
        .from('ai_rules')
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRule.id)
        .select()
        .single();
    } else {
      // 새 규칙 생성
      result = await supabase
        .from('ai_rules')
        .insert({
          level,
          content,
          is_active: true,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating AI rule:', result.error);
      return NextResponse.json(
        { success: false, error: 'Failed to update AI rule' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    } as ApiResponse<typeof result.data>);
  } catch (err) {
    console.error('Error in PATCH /api/admin/ai-rules/[level]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
