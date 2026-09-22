import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../lib/supabase/server';
import type { ApiResponse } from '../../../../../../types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const supabase = await getSupabaseServerClient();
    const body = await request.json();

    // 업데이트 가능한 필드만 허용
    const updateData: any = {};
    if (body.school_level) updateData.school_level = body.school_level;
    if (body.grade !== undefined) updateData.grade = body.grade;
    if (body.my_problem_formula_required !== undefined) {
      updateData.my_problem_formula_required = body.my_problem_formula_required;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update user' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    } as ApiResponse<typeof data>);
  } catch (err) {
    console.error('Error in PATCH /api/admin/users/[id]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const supabase = await getSupabaseServerClient();

    // 소프트 삭제
    const { error } = await supabase
      .from('users')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete user' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'User deleted successfully' },
    } as ApiResponse<any>);
  } catch (err) {
    console.error('Error in DELETE /api/admin/users/[id]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
