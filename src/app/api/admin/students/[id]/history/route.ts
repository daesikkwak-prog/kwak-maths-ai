import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { getStudentHistory } from '@/lib/stats';
import { ok, handleError } from '@/lib/api/respond';

/** 관리자: 학생별 문제 상세 기록 조회 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('admin');

    const { id: studentId } = await params;
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 50;
    const supabase = await getSupabaseServerClient();

    return ok(await getStudentHistory(supabase, studentId, limit));
  } catch (err) {
    return handleError('GET /api/admin/students/[id]/history', err);
  }
}
