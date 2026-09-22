import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase/server';
import type { ApiResponse } from '../../../types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const gradeOptionId = searchParams.get('grade_option_id');

    if (!gradeOptionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'grade_option_id is required',
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('active_units')
      .select('*')
      .eq('grade_option_id', gradeOptionId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching units:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch units',
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    } as ApiResponse<typeof data>);
  } catch (err) {
    console.error('Error in GET /api/units:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
