import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
import type { ApiResponse } from '../../../../../types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const body = await request.json();
    const { student_id } = body;

    if (!student_id) {
      return NextResponse.json(
        { success: false, error: 'student_id is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 세션 시작 기록
    const { data: log, error } = await supabase
      .from('study_time_logs')
      .insert({
        student_id,
        session_start: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting session:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to start session' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        session_id: log.id,
        session_start: log.session_start,
      },
    } as ApiResponse<any>);
  } catch (err) {
    console.error('Error in POST /api/study-sessions/start:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
