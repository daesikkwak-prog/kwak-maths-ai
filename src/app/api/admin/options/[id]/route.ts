import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api/respond';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('admin');

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.value !== undefined) updateData.value = body.value;
    if (body.order !== undefined) updateData.order = body.order;

    if (Object.keys(updateData).length === 0) return fail('수정할 항목이 없습니다.');

    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from('options')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating option:', error);
      return fail('선택지 수정에 실패했습니다.', 500);
    }

    return ok(data);
  } catch (err) {
    return handleError('PATCH /api/admin/options/[id]', err);
  }
}

/** 소프트 삭제. 해당 학년을 쓰는 단원이 남아 있으면 막는다. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole('admin');

    const { id } = await params;
    const supabase = await getSupabaseServerClient();

    const { data: linkedUnits } = await supabase
      .from('active_units')
      .select('id')
      .eq('grade_option_id', id)
      .limit(1);

    if (linkedUnits && linkedUnits.length > 0) {
      return fail('이 학년을 사용하는 단원이 있어 삭제할 수 없습니다.');
    }

    const { error } = await supabase
      .from('options')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error deleting option:', error);
      return fail('선택지 삭제에 실패했습니다.', 500);
    }

    return ok({ message: '선택지가 삭제되었습니다.' });
  } catch (err) {
    return handleError('DELETE /api/admin/options/[id]', err);
  }
}
