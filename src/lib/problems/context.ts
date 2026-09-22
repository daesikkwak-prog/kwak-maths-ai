import type { SupabaseClient } from '@supabase/supabase-js';
import type { SchoolLevel, User } from '@/types';

export interface ProblemPolicy {
  formulaRequired: boolean;
  schoolLevel: SchoolLevel;
}

/**
 * 풀이 과정(식) 필수 여부 판단.
 * - AI 문제은행 문제: 단원 설정(units.formula_required)
 * - 단원 정보가 없는 문제 / 내 문제 풀기: 학생 계정 설정(users.my_problem_formula_required)
 */
export async function resolveProblemPolicy(
  supabase: SupabaseClient,
  problem: { source: string; unit_id: string | null },
  student: Pick<User, 'school_level' | 'my_problem_formula_required'>
): Promise<ProblemPolicy> {
  let formulaRequired = student.my_problem_formula_required;

  if (problem.source === 'ai_generated' && problem.unit_id) {
    const { data: unit } = await supabase
      .from('units')
      .select('formula_required')
      .eq('id', problem.unit_id)
      .maybeSingle();

    if (unit) formulaRequired = unit.formula_required;
  }

  return { formulaRequired, schoolLevel: student.school_level };
}
