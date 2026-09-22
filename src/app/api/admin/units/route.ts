import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { handleError } from '@/lib/api/respond';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin');

    const supabase = await getSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const gradeOptionId = searchParams.get('grade_option_id');

    let query = supabase.from('active_units').select('*');

    if (gradeOptionId) {
      query = query.eq('grade_option_id', gradeOptionId);
    }

    const { data, error } = await query.order('order', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch units' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    } as ApiResponse<typeof data>);
  } catch (err) {
    return handleError('GET /api/admin/units', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole('admin');

    const supabase = await getSupabaseServerClient();
    const body = await request.json();
    const { grade_option_id, name, answer_type, formula_required, order } = body;

    if (!grade_option_id || !name || !answer_type) {
      return NextResponse.json(
        {
          success: false,
          error: 'grade_option_id, name, and answer_type are required',
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const { data: unit, error } = await supabase
      .from('units')
      .insert({
        grade_option_id,
        name,
        answer_type,
        formula_required: formula_required ?? true,
        order: order ?? 999,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating unit:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create unit' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: unit,
    } as ApiResponse<typeof unit>);
  } catch (err) {
    return handleError('POST /api/admin/units', err);
  }
}
