import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api/respond';

/** 선택지(학년/난이도) 목록 */
export async function GET(request: NextRequest) {
  try {
    await requireRole('admin');

    const supabase = await getSupabaseServerClient();
    const type = request.nextUrl.searchParams.get('type');

    let query = supabase.from('active_options').select('*');
    if (type) query = query.eq('type', type);

    const { data, error } = await query.order('order', { ascending: true });
    if (error) return fail('선택지 조회에 실패했습니다.', 500);

    return ok(data);
  } catch (err) {
    return handleError('GET /api/admin/options', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole('admin');

    const { type, value, order } = await request.json();

    if (!type || !value) return fail('종류와 값은 필수입니다.');
    if (type !== 'grade' && type !== 'difficulty') {
      return fail('종류는 grade 또는 difficulty여야 합니다.');
    }

    const supabase = await getSupabaseServerClient();

    const { data: duplicate } = await supabase
      .from('active_options')
      .select('id')
      .eq('type', type)
      .eq('value', value)
      .maybeSingle();

    if (duplicate) return fail('이미 등록된 선택지입니다.');

    const { data, error } = await supabase
      .from('options')
      .insert({ type, value, order: order ?? 999 })
      .select()
      .single();

    if (error) {
      console.error('Error creating option:', error);
      return fail('선택지 생성에 실패했습니다.', 500);
    }

    return ok(data);
  } catch (err) {
    return handleError('POST /api/admin/options', err);
  }
}
