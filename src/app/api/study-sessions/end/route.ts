import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api/respond';

/** 학습 세션 종료. session_id 미지정 시 본인의 열린 세션을 종료한다. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const supabase = await getSupabaseServerClient();

    let sessionId: string | undefined;
    try {
      sessionId = (await request.json())?.session_id;
    } catch {
      sessionId = undefined; // sendBeacon 등 본문이 없는 요청 허용
    }

    let query = supabase
      .from('study_time_logs')
      .update({ session_end: new Date().toISOString() })
      .eq('student_id', user.id)
      .is('session_end', null);

    if (sessionId) query = query.eq('id', sessionId);

    const { data, error } = await query.select();

    if (error) {
      console.error('Error ending session:', error);
      return fail('학습 세션 종료에 실패했습니다.', 500);
    }

    const log = data?.[0];
    if (!log) return ok({ message: '종료할 세션이 없습니다.', study_time_minutes: 0 });

    const minutes = Math.round(
      (new Date(log.session_end).getTime() - new Date(log.session_start).getTime()) / 60000
    );

    return ok({
      session_id: log.id,
      session_end: log.session_end,
      study_time_minutes: minutes,
    });
  } catch (err) {
    return handleError('POST /api/study-sessions/end', err);
  }
}
