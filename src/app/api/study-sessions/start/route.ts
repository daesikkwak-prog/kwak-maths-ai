import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api/respond';

/** 학습 세션 시작. 이미 열린 세션이 있으면 그것을 재사용한다(중복 카운트 방지). */
export async function POST() {
  try {
    const user = await requireUser();
    const supabase = await getSupabaseServerClient();

    const { data: openSession } = await supabase
      .from('study_time_logs')
      .select('id, session_start')
      .eq('student_id', user.id)
      .is('session_end', null)
      .order('session_start', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openSession) {
      return ok({
        session_id: openSession.id,
        session_start: openSession.session_start,
        resumed: true,
      });
    }

    const { data: log, error } = await supabase
      .from('study_time_logs')
      .insert({ student_id: user.id, session_start: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      console.error('Error starting session:', error);
      return fail('학습 세션 시작에 실패했습니다.', 500);
    }

    return ok({ session_id: log.id, session_start: log.session_start, resumed: false });
  } catch (err) {
    return handleError('POST /api/study-sessions/start', err);
  }
}
