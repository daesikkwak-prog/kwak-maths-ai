import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase/server';
import type { ApiResponse } from '../../../types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'grade' 또는 'difficulty'

    let query = supabase.from('active_options').select('*');

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('order', { ascending: true });

    if (error) {
      console.error('Error fetching options:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch options',
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    } as ApiResponse<typeof data>);
  } catch (err) {
    console.error('Error in GET /api/options:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
