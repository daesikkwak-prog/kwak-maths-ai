import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
import type { ApiResponse } from '../../../../../types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role'); // 'student' 또는 'admin'

    let query = supabase.from('active_users').select('*');

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    } as ApiResponse<typeof data>);
  } catch (err) {
    console.error('Error in GET /api/admin/users:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const body = await request.json();
    const { name, role, school_level, grade, my_problem_formula_required } = body;

    if (!name || !role || !school_level || grade === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'name, role, school_level, and grade are required',
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 사용자 생성
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        role,
        school_level,
        grade,
        my_problem_formula_required: my_problem_formula_required ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create user' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    } as ApiResponse<typeof user>);
  } catch (err) {
    console.error('Error in POST /api/admin/users:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
