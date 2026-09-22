import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { getStudentStats } from '@/lib/stats';
import { ok, fail, handleError } from '@/lib/api/respond';

/** 관리자: 학생별 통계 조회 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('admin');

    const { id: studentId } = await params;
    const supabase = await getSupabaseServerClient();

    const { data: student } = await supabase
      .from('active_users')
      .select('id, name, school_level, grade')
      .eq('id', studentId)
      .maybeSingle();

    if (!student) return fail('학생을 찾을 수 없습니다.', 404);

    const stats = await getStudentStats(supabase, studentId);
    return ok({ student, stats });
  } catch (err) {
    return handleError('GET /api/admin/students/[id]/stats', err);
  }
}
