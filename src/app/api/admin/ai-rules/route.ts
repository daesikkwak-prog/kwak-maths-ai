import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { handleError } from '@/lib/api/respond';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin');

    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from('active_ai_rules')
      .select('*')
      .order('level', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch AI rules' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    } as ApiResponse<typeof data>);
  } catch (err) {
    return handleError('GET /api/admin/ai-rules', err);
  }
}
