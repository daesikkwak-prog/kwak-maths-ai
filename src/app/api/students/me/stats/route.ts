import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { getStudentStats } from '@/lib/stats';
import { ok, handleError } from '@/lib/api/respond';

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = await getSupabaseServerClient();
    return ok(await getStudentStats(supabase, user.id));
  } catch (err) {
    return handleError('GET /api/students/me/stats', err);
  }
}
