import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { getUnitMasteryMap } from '@/lib/problems/weakness';
import type { ApiResponse } from '@/types';

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

    // 학생이 조회하면 유형별 숙련도(한 번에 맞힌 비율)를 함께 내려 보강 출제 대상을 표시한다
    const user = await getCurrentUser();
    if (user?.role !== 'student') {
      return NextResponse.json({ success: true, data } as ApiResponse<typeof data>);
    }

    const mastery = await getUnitMasteryMap(supabase, user.id, gradeOptionId);
    const withMastery = (data || []).map((unit: any) => ({
      ...unit,
      correct_rate: mastery.get(unit.id)?.correct_rate ?? null,
      completed_problems: mastery.get(unit.id)?.completed ?? 0,
      is_weak: mastery.get(unit.id)?.is_weak ?? false,
    }));

    return NextResponse.json({
      success: true,
      data: withMastery,
    } as ApiResponse<typeof withMastery>);
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
