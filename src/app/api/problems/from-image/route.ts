import { NextRequest } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { parseUserUploadedProblem } from '@/lib/gemini';
import { requireUser } from '@/lib/auth';
import { ok, fail, handleError } from '@/lib/api/respond';

/**
 * "내 문제 풀기": 문제집 사진 → 문제 본문 추출 후 저장 (source=user_uploaded).
 * 정답은 미리 알 수 없으므로 채점은 매 시도마다 AI가 즉석에서 수행한다.
 * 제출 이미지는 저장하지 않는다.
 */
export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const supabase = await getSupabaseServerClient();
    const { image_base64 } = await request.json();

    if (!image_base64) {
      return fail('문제 사진을 업로드해주세요.');
    }

    const problemText = await parseUserUploadedProblem(image_base64);

    const { data: problem, error: insertError } = await supabase
      .from('problems')
      .insert({
        source: 'user_uploaded',
        content: problemText,
        answer: null,
        solution: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving problem:', insertError);
      return fail('문제 저장에 실패했습니다.', 500);
    }

    return ok({
      problem_id: problem.id,
      problem_text: problem.content,
      source: problem.source,
      created_at: problem.created_at,
    });
  } catch (err) {
    return handleError('POST /api/problems/from-image', err);
  }
}
