import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { generateProblem } from '@/lib/gemini';
import { requireUser } from '@/lib/auth';
import { buildWeaknessNote, getWeaknessContext } from '@/lib/problems/weakness';
import { sanitizeSvg } from '@/lib/utils/svg';
import { ok, fail, handleError } from '@/lib/api/respond';

/** 문제은행 출제: 학년/단원/난이도 기반 AI 출제 (정답·풀이 함께 생성 후 고정 저장) */
export async function POST(request: NextRequest) {
  try {
    const student = await requireUser();

    const supabase = await getSupabaseServerClient();
    const { grade_option_id, unit_id, difficulty_option_id } = await request.json();

    if (!grade_option_id || !difficulty_option_id) {
      return fail('학년과 난이도를 선택해주세요.');
    }

    const { data: gradeOption } = await supabase
      .from('options')
      .select('value')
      .eq('id', grade_option_id)
      .maybeSingle();

    const { data: diffOption } = await supabase
      .from('options')
      .select('value')
      .eq('id', difficulty_option_id)
      .maybeSingle();

    if (!gradeOption || !diffOption) {
      return fail('올바르지 않은 학년 또는 난이도입니다.');
    }

    let unitName = '';
    if (unit_id) {
      const { data: unit } = await supabase
        .from('units')
        .select('name')
        .eq('id', unit_id)
        .maybeSingle();
      if (unit) unitName = unit.name;
    }

    const { data: aiRules, error: rulesError } = await supabase
      .from('active_ai_rules')
      .select('*');

    if (rulesError || !aiRules) {
      return fail('AI 기준 조회에 실패했습니다.', 500);
    }

    // 이 유형을 아직 어려워하면(한 번에 맞힌 비율 기준 미만) 비슷한 유형으로 보강 출제한다
    const weakness = await getWeaknessContext(supabase, student.id, {
      unitId: unit_id || null,
      gradeOptionId: grade_option_id,
    });

    const aiResponse = await generateProblem(
      gradeOption.value,
      unitName || '학년 전체 범위',
      diffOption.value,
      aiRules,
      buildWeaknessNote(weakness)
    );

    const figureSvg = sanitizeSvg(aiResponse.figure_svg);

    const { data: problem, error: insertError } = await supabase
      .from('problems')
      .insert({
        source: 'ai_generated',
        grade_option_id,
        unit_id: unit_id || null,
        difficulty_option_id,
        content: aiResponse.problem,
        figure_svg: figureSvg || null,
        answer: aiResponse.answer,
        solution: aiResponse.solution,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting problem:', insertError);
      return fail('문제 저장에 실패했습니다.', 500);
    }

    // 정답/풀이는 학생에게 내려보내지 않는다
    return ok({
      problem_id: problem.id,
      problem_text: problem.content,
      figure_svg: figureSvg,
      source: problem.source,
      created_at: problem.created_at,
      targeted_weakness: weakness.is_weak,
      unit_correct_rate: weakness.correct_rate,
    });
  } catch (err) {
    return handleError('POST /api/problems/generate', err);
  }
}
