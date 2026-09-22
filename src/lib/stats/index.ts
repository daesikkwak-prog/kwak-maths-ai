import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Attempt,
  HistoryItem,
  StudentStats,
  TrendPoint,
  UnitStat,
} from '@/types';

interface AttemptWithProblem extends Attempt {
  problems: {
    id: string;
    source: string;
    content: string | null;
    answer: string | null;
    solution: string | null;
    unit_id: string | null;
    grade_option_id: string | null;
    difficulty_option_id: string | null;
  } | null;
}

/** 문제 단위로 시도들을 묶는다. 통계와 상세 기록이 같은 기준을 쓰도록 공용화. */
async function loadAttempts(
  supabase: SupabaseClient,
  studentId: string
): Promise<AttemptWithProblem[]> {
  const { data, error } = await supabase
    .from('attempts')
    .select(
      `*, problems ( id, source, content, answer, solution, unit_id, grade_option_id, difficulty_option_id )`
    )
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });

  if (error) throw new Error('시도 기록 조회에 실패했습니다.');
  return (data || []) as AttemptWithProblem[];
}

function groupByProblem(attempts: AttemptWithProblem[]) {
  const byProblem = new Map<string, AttemptWithProblem[]>();
  for (const attempt of attempts) {
    const list = byProblem.get(attempt.problem_id) || [];
    list.push(attempt);
    byProblem.set(attempt.problem_id, list);
  }
  return byProblem;
}

function problemStatus(list: Attempt[]): 'correct' | 'gave_up' | 'in_progress' {
  if (list.some((a) => a.is_correct)) return 'correct';
  if (list.some((a) => a.gave_up)) return 'gave_up';
  return 'in_progress';
}

/** 학년/난이도/단원 id → 표시 이름 매핑 테이블 */
async function loadLabels(supabase: SupabaseClient) {
  const [{ data: options }, { data: units }] = await Promise.all([
    supabase.from('options').select('id, value'),
    supabase.from('units').select('id, name'),
  ]);

  return {
    options: new Map((options || []).map((o: any) => [o.id, o.value as string])),
    units: new Map((units || []).map((u: any) => [u.id, u.name as string])),
  };
}

export async function getStudentStats(
  supabase: SupabaseClient,
  studentId: string
): Promise<StudentStats> {
  const attempts = await loadAttempts(supabase, studentId);
  const byProblem = groupByProblem(attempts);
  const labels = await loadLabels(supabase);

  let correctProblems = 0;
  let giveUpCount = 0;

  const unitAgg = new Map<string, { correct: number; total: number }>();
  const dayAgg = new Map<string, { correct: number; total: number }>();

  for (const [, list] of byProblem) {
    const status = problemStatus(list);
    if (status === 'correct') correctProblems += 1;
    if (status === 'gave_up') giveUpCount += 1;

    // 진행 중인 문제는 아직 결과가 정해지지 않았으므로 비율 집계에서 제외
    if (status === 'in_progress') continue;

    const unitId = list[0].problems?.unit_id;
    if (unitId) {
      const agg = unitAgg.get(unitId) || { correct: 0, total: 0 };
      agg.total += 1;
      if (status === 'correct') agg.correct += 1;
      unitAgg.set(unitId, agg);
    }

    const day = list[list.length - 1].created_at.slice(0, 10);
    const dayStat = dayAgg.get(day) || { correct: 0, total: 0 };
    dayStat.total += 1;
    if (status === 'correct') dayStat.correct += 1;
    dayAgg.set(day, dayStat);
  }

  const { data: studyLogs } = await supabase
    .from('study_time_logs')
    .select('session_start, session_end')
    .eq('student_id', studentId);

  let studyMinutes = 0;
  for (const log of studyLogs || []) {
    if (!log.session_start || !log.session_end) continue;
    const diff =
      new Date(log.session_end).getTime() - new Date(log.session_start).getTime();
    if (diff > 0) studyMinutes += diff / 60000;
  }

  const vulnerableUnits: UnitStat[] = [...unitAgg.entries()]
    .map(([unitId, agg]) => ({
      unit_id: unitId,
      unit_name: labels.units.get(unitId) || '(삭제된 단원)',
      total_problems: agg.total,
      correct_problems: agg.correct,
      correct_rate: Math.round((agg.correct / agg.total) * 1000) / 10,
    }))
    .sort((a, b) => a.correct_rate - b.correct_rate);

  const trend: TrendPoint[] = [...dayAgg.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, agg]) => ({
      date,
      total_problems: agg.total,
      correct_problems: agg.correct,
      correct_rate: Math.round((agg.correct / agg.total) * 1000) / 10,
    }));

  const gradedProblems = correctProblems + giveUpCount;

  return {
    total_problems_solved: byProblem.size,
    correct_problems: correctProblems,
    correct_rate:
      gradedProblems > 0
        ? Math.round((correctProblems / gradedProblems) * 1000) / 10
        : 0,
    give_up_count: giveUpCount,
    total_attempts: attempts.length,
    study_time_minutes: Math.round(studyMinutes),
    vulnerable_units: vulnerableUnits.slice(0, 5),
    trend,
  };
}

/** 문제별 상세 기록 (시도별 AI 피드백 요약 이력 포함). 제출 이미지는 저장하지 않아 표시하지 않는다. */
export async function getStudentHistory(
  supabase: SupabaseClient,
  studentId: string,
  limit = 50
): Promise<HistoryItem[]> {
  const attempts = await loadAttempts(supabase, studentId);
  const byProblem = groupByProblem(attempts);
  const labels = await loadLabels(supabase);

  const items: HistoryItem[] = [];

  for (const [problemId, list] of byProblem) {
    const problem = list[0].problems;
    const status = problemStatus(list);
    const correctAttempt = list.find((a) => a.is_correct);

    items.push({
      problem_id: problemId,
      source: (problem?.source as HistoryItem['source']) || 'ai_generated',
      content: problem?.content ?? null,
      // 정답/풀이는 문제를 끝낸 뒤에만 공개한다
      answer: status === 'in_progress' ? null : problem?.answer ?? null,
      solution: status === 'in_progress' ? null : problem?.solution ?? null,
      unit_name: problem?.unit_id ? labels.units.get(problem.unit_id) ?? null : null,
      difficulty: problem?.difficulty_option_id
        ? labels.options.get(problem.difficulty_option_id) ?? null
        : null,
      grade: problem?.grade_option_id
        ? labels.options.get(problem.grade_option_id) ?? null
        : null,
      status,
      attempts: list.map((a) => ({
        attempt_no: a.attempt_no,
        is_correct: a.is_correct,
        gave_up: a.gave_up,
        issue_summary: a.issue_summary,
        final_solution_text: a.final_solution_text,
        created_at: a.created_at,
      })),
      last_attempt_at: list[list.length - 1].created_at,
    });
  }

  return items
    .sort((a, b) => b.last_attempt_at.localeCompare(a.last_attempt_at))
    .slice(0, limit);
}
