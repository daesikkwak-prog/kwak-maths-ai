import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { getStudentHistory } from '@/lib/stats';
import { ok, handleError } from '@/lib/api/respond';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const limit = Number(request.nextUrl.searchParams.get('limit')) || 50;
    const supabase = await getSupabaseServerClient();
    return ok(await getStudentHistory(supabase, user.id, limit));
  } catch (err) {
    return handleError('GET /api/students/me/history', err);
  }
}
