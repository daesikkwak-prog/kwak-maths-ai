import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../../lib/supabase/server';
import type { ApiResponse } from '../../../../../../types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: unitId } = await params;
    const supabase = await getSupabaseServerClient();
    const body = await request.json();

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.answer_type) updateData.answer_type = body.answer_type;
    if (body.formula_required !== undefined) updateData.formula_required = body.formula_required;
    if (body.order !== undefined) updateData.order = body.order;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('units')
      .update(updateData)
      .eq('id', unitId)
      .select()
      .single();

    if (error) {
      console.error('Error updating unit:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update unit' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    } as ApiResponse<typeof data>);
  } catch (err) {
    console.error('Error in PATCH /api/admin/units/[id]:', err);
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
    const { id: unitId } = await params;
    const supabase = await getSupabaseServerClient();

    // 소프트 삭제
    const { error } = await supabase
      .from('units')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', unitId);

    if (error) {
      console.error('Error deleting unit:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete unit' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Unit deleted successfully' },
    } as ApiResponse<any>);
  } catch (err) {
    console.error('Error in DELETE /api/admin/units/[id]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
