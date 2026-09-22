import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../../lib/supabase/server';
import type { ApiResponse } from '../../../../../types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'student_id is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // 학생의 모든 시도 조회
    const { data: attempts, error: attemptsError } = await supabase
      .from('attempts')
      .select('*')
      .eq('student_id', studentId);

    if (attemptsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch attempts' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // 통계 계산
    const totalAttempts = attempts?.length || 0;
    const correctAttempts = attempts?.filter((a) => a.is_correct).length || 0;
    const giveUpCount = attempts?.filter((a) => a.gave_up).length || 0;
    const correctRate = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

    // 학습 시간 조회
    const { data: studyLogs, error: logsError } = await supabase
      .from('study_time_logs')
      .select('*')
      .eq('student_id', studentId);

    if (logsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch study logs' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // 학습 시간 계산 (분 단위)
    let totalStudyTime = 0;
    if (studyLogs) {
      studyLogs.forEach((log) => {
        if (log.session_start && log.session_end) {
          const start = new Date(log.session_start).getTime();
          const end = new Date(log.session_end).getTime();
          totalStudyTime += (end - start) / (1000 * 60); // 분으로 변환
        }
      });
    }

    // 단원별 취약점 분석
    const unitStats = new Map<string, { correct: number; total: number }>();

    if (attempts) {
      for (const attempt of attempts) {
        // 각 시도의 문제 단원 정보 조회
        const { data: problem } = await supabase
          .from('problems')
          .select('unit_id')
          .eq('id', attempt.problem_id)
          .single();

        if (problem?.unit_id) {
          const current = unitStats.get(problem.unit_id) || { correct: 0, total: 0 };
          current.total += 1;
          if (attempt.is_correct) {
            current.correct += 1;
          }
          unitStats.set(problem.unit_id, current);
        }
      }
    }

    // 단원 이름과 함께 변환
    const vulnerabilities = [];
    for (const [unitId, stats] of unitStats.entries()) {
      const { data: unit } = await supabase
        .from('units')
        .select('name')
        .eq('id', unitId)
        .single();

      if (unit) {
        vulnerabilities.push({
          unit_name: unit.name,
          correct_rate: (stats.correct / stats.total) * 100,
          total_attempts: stats.total,
        });
      }
    }

    // 취약한 것부터 정렬
    vulnerabilities.sort((a, b) => a.correct_rate - b.correct_rate);

    return NextResponse.json({
      success: true,
      data: {
        total_problems_solved: totalAttempts,
        correct_rate: Math.round(correctRate * 100) / 100,
        give_up_count: giveUpCount,
        study_time_minutes: Math.round(totalStudyTime),
        vulnerable_units: vulnerabilities.slice(0, 5), // 상위 5개
      },
    } as ApiResponse<any>);
  } catch (err) {
    console.error('Error in GET /api/students/me/stats:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
