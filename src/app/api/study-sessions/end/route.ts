import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
import type { ApiResponse } from '../../../../../types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const body = await request.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { success: false, error: 'session_id is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 세션 종료 기록
    const { data: log, error } = await supabase
      .from('study_time_logs')
      .update({
        session_end: new Date().toISOString(),
      })
      .eq('id', session_id)
      .select()
      .single();

    if (error) {
      console.error('Error ending session:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to end session' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // 학습 시간 계산
    const startTime = new Date(log.session_start).getTime();
    const endTime = new Date(log.session_end).getTime();
    const studyTimeMinutes = Math.round((endTime - startTime) / (1000 * 60));

    return NextResponse.json({
      success: true,
      data: {
        session_id: log.id,
        session_end: log.session_end,
        study_time_minutes: studyTimeMinutes,
      },
    } as ApiResponse<any>);
  } catch (err) {
    console.error('Error in POST /api/study-sessions/end:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
