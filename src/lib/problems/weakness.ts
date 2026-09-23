import type { SupabaseClient } from '@supabase/supabase-js';

/** 이 비율 미만이면 "아직 약한 유형"으로 보고 비슷한 유형을 다시 출제한다 (%) */
export const WEAKNESS_RATE_THRESHOLD = 80;
/** 판정에 필요한 최소 완료 문제 수 — 표본이 적으면 판정하지 않는다 */
export const WEAKNESS_MIN_PROBLEMS = 3;

/** 프롬프트에 넣을 최근 오답 문제 수 / 지적 요약 수 */
const RECENT_WRONG_LIMIT = 3;
const RECENT_ISSUE_LIMIT = 6;
/** 오답 문제 본문은 프롬프트에 이만큼만 넣는다 (토큰 절약) */
const WRONG_PROBLEM_CHARS = 150;

export interface UnitMastery {
  /** 완료(정답 또는 포기)한 문제 수 */
  completed: number;
  /** 첫 시도에 맞힌 문제 수 */
  mastered: number;
  /** 한 번에 맞힌 비율(%) — 표본이 모자라면 null */
  correct_rate: number | null;
  /** 보강 출제 대상 여부 */
  is_weak: boolean;
}

export interface WeaknessContext extends UnitMastery {
  /** 최근 오답에서 반복된 지적 사항 */
  issue_summaries: string[];
  /** 최근 틀렸거나 여러 번 만에 맞힌 문제 본문 */
  recent_wrong_problems: string[];
}

interface ScopedAttempt {
  problem_id: string;
  attempt_no: number;
  is_correct: boolean;
  gave_up: boolean;
  issue_summary: string | null;
  created_at: string;
  problems: { id: string; content: string | null; unit_id: string | null } | null;
}

const emptyContext: WeaknessContext = {
  completed: 0,
  mastered: 0,
  correct_rate: null,
  is_weak: false,
  issue_summaries: [],
  recent_wrong_problems: [],
};

/** 학생의 시도 기록을 단원 또는 학년 범위로 불러온다. */
async function loadScopedAttempts(
  supabase: SupabaseClient,
  studentId: string,
  scope: { unitId?: string | null; gradeOptionId?: string | null }
): Promise<ScopedAttempt[]> {
  let query = supabase
    .from('attempts')
    .select(
      'problem_id, attempt_no, is_correct, gave_up, issue_summary, created_at, problems!inner ( id, content, unit_id )'
    )
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });

  if (scope.unitId) {
    query = query.eq('problems.unit_id', scope.unitId);
  } else if (scope.gradeOptionId) {
    query = query.eq('problems.grade_option_id', scope.gradeOptionId);
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error loading weakness attempts:', error);
    return [];
  }
  return (data || []) as unknown as ScopedAttempt[];
}

interface ProblemRollup {
  attempts: ScopedAttempt[];
  status: 'correct' | 'gave_up' | 'in_progress';
  /** 첫 시도에 맞혔는가 */
  mastered: boolean;
  lastAt: string;
  content: string | null;
}

function rollupByProblem(attempts: ScopedAttempt[]): Map<string, ProblemRollup> {
  const byProblem = new Map<string, ScopedAttempt[]>();
  for (const attempt of attempts) {
    const list = byProblem.get(attempt.problem_id) || [];
    list.push(attempt);
    byProblem.set(attempt.problem_id, list);
  }

  const rollups = new Map<string, ProblemRollup>();
  for (const [problemId, list] of byProblem) {
    const sorted = [...list].sort((a, b) => a.attempt_no - b.attempt_no);
    const status = sorted.some((a) => a.is_correct)
      ? 'correct'
      : sorted.some((a) => a.gave_up)
        ? 'gave_up'
        : 'in_progress';

    rollups.set(problemId, {
      attempts: sorted,
      status,
      mastered: status === 'correct' && sorted[0].is_correct,
      lastAt: sorted[sorted.length - 1].created_at,
      content: sorted[0].problems?.content ?? null,
    });
  }
  return rollups;
}

function summarizeMastery(rollups: Map<string, ProblemRollup>): UnitMastery {
  let completed = 0;
  let mastered = 0;

  for (const [, rollup] of rollups) {
    if (rollup.status === 'in_progress') continue; // 아직 결과가 정해지지 않음
    completed += 1;
    if (rollup.mastered) mastered += 1;
  }

  const enough = completed >= WEAKNESS_MIN_PROBLEMS;
  const rate = enough ? Math.round((mastered / completed) * 1000) / 10 : null;

  return {
    completed,
    mastered,
    correct_rate: rate,
    is_weak: rate !== null && rate < WEAKNESS_RATE_THRESHOLD,
  };
}

/**
 * 선택한 유형(단원, 없으면 학년 전체)에 대한 학생의 숙련도와 오답 맥락.
 * "한 번에 맞힌 비율"이 기준치 미만이면 비슷한 유형으로 보강 출제한다.
 */
export async function getWeaknessContext(
  supabase: SupabaseClient,
  studentId: string,
  scope: { unitId?: string | null; gradeOptionId?: string | null }
): Promise<WeaknessContext> {
  const attempts = await loadScopedAttempts(supabase, studentId, scope);
  if (attempts.length === 0) return emptyContext;

  const rollups = rollupByProblem(attempts);
  const mastery = summarizeMastery(rollups);

  if (!mastery.is_weak) {
    return { ...mastery, issue_summaries: [], recent_wrong_problems: [] };
  }

  // 최근에 어려워한 문제부터 (포기했거나 여러 번 만에 맞힌 문제)
  const struggled = [...rollups.values()]
    .filter((r) => r.status !== 'in_progress' && !r.mastered)
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));

  const issues: string[] = [];
  for (const rollup of struggled) {
    for (const attempt of rollup.attempts) {
      const summary = attempt.issue_summary?.trim();
      if (!summary || summary === '정답' || summary === '포기') continue;
      if (!issues.includes(summary)) issues.push(summary);
      if (issues.length >= RECENT_ISSUE_LIMIT) break;
    }
    if (issues.length >= RECENT_ISSUE_LIMIT) break;
  }

  const wrongProblems = struggled
    .slice(0, RECENT_WRONG_LIMIT)
    .map((r) => (r.content || '').replace(/\s+/g, ' ').trim().slice(0, WRONG_PROBLEM_CHARS))
    .filter(Boolean);

  return { ...mastery, issue_summaries: issues, recent_wrong_problems: wrongProblems };
}

/** 학년 내 모든 단원의 숙련도 (문제은행 화면에서 유형별 표시용) */
export async function getUnitMasteryMap(
  supabase: SupabaseClient,
  studentId: string,
  gradeOptionId: string
): Promise<Map<string, UnitMastery>> {
  const attempts = await loadScopedAttempts(supabase, studentId, { gradeOptionId });

  const byUnit = new Map<string, ScopedAttempt[]>();
  for (const attempt of attempts) {
    const unitId = attempt.problems?.unit_id;
    if (!unitId) continue;
    const list = byUnit.get(unitId) || [];
    list.push(attempt);
    byUnit.set(unitId, list);
  }

  const result = new Map<string, UnitMastery>();
  for (const [unitId, list] of byUnit) {
    result.set(unitId, summarizeMastery(rollupByProblem(list)));
  }
  return result;
}

/** 보강 출제용 프롬프트 조각. 보강 대상이 아니면 빈 문자열. */
export function buildWeaknessNote(ctx: WeaknessContext): string {
  if (!ctx.is_weak) return '';

  const lines = [
    '[취약 유형 보강 출제]',
    `이 학생은 이 유형을 아직 어려워합니다. (한 번에 맞힌 비율 ${ctx.correct_rate}% / 완료 ${ctx.completed}문제)`,
  ];

  if (ctx.issue_summaries.length > 0) {
    lines.push(`자주 틀리는 부분: ${ctx.issue_summaries.join(', ')}`);
  }

  if (ctx.recent_wrong_problems.length > 0) {
    lines.push('최근에 어려워한 문제:');
    ctx.recent_wrong_problems.forEach((p, i) => lines.push(`  ${i + 1}) ${p}`));
  }

  lines.push(
    '위 문제들과 같은 개념·같은 유형을 묻되, 숫자와 상황을 바꾼 새 문제를 출제하세요.',
    '위 문제를 그대로 반복하지 말고, 난이도는 비슷하거나 아주 조금 쉽게 잡으세요.',
    '자주 틀리는 부분을 반드시 다시 짚게 되는 구조로 만드세요.'
  );

  return lines.join('\n');
}
