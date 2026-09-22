import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiResponse, AIRule, AIRuleLevel, Attempt, SchoolLevel } from '@/types';

// 모델명은 환경변수로 덮어쓸 수 있다 (모델 단종 시 코드 수정 없이 교체)
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }
  return client.getGenerativeModel({ model: MODEL });
}

/** "중2" 같은 학년 값에서 학교급(초/중/고)을 뽑는다. */
export function gradeToSchoolLevel(grade: string): AIRuleLevel {
  const head = grade.trim().charAt(0);
  return head === '초' || head === '중' || head === '고' ? head : 'common';
}

/** 공통 기준 + 해당 레벨 기준을 합쳐 프롬프트 머리말을 만든다. */
function buildRuleSection(aiRules: AIRule[], level: AIRuleLevel | SchoolLevel): string {
  const common = aiRules.find((r) => r.level === 'common')?.content;
  const levelRule = aiRules.find((r) => r.level === level)?.content;

  return [
    `[공통 기준]\n${common || '(설정되지 않음)'}`,
    `[${level === 'common' ? '레벨' : level} 기준]\n${levelRule || '(설정되지 않음)'}`,
  ].join('\n\n');
}

function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI 응답 형식이 올바르지 않습니다.');
  return JSON.parse(match[0]) as T;
}

/** 이미지 base64(data URL 또는 순수 base64)를 Gemini inlineData로 변환한다. */
function toInlineData(imageBase64: string) {
  const match = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.*)$/s);
  return {
    inlineData: {
      data: match ? match[2] : imageBase64,
      mimeType: match ? match[1] : 'image/jpeg',
    },
  };
}

/**
 * 문제은행 출제. 정답/풀이를 함께 생성해 저장하고, 이후 채점은 이 정답을 기준으로 고정한다.
 */
export async function generateProblem(
  grade: string,
  unit: string,
  difficulty: string,
  aiRules: AIRule[]
): Promise<{ problem: string; answer: string; solution: string }> {
  const prompt = `
당신은 수학 문제 출제 전문가입니다.

${buildRuleSection(aiRules, gradeToSchoolLevel(grade))}

다음 조건으로 수학 문제를 1개 출제해주세요:
- 학년: ${grade}
- 단원: ${unit}
- 난이도: ${difficulty}

주의사항:
- 문제는 그림 없이 글로만 읽고 풀 수 있어야 합니다.
- 정답은 채점 기준이 되므로 명확하고 유일해야 합니다.

응답 형식 (JSON):
{
  "problem": "문제 본문",
  "answer": "정답 (숫자나 식)",
  "solution": "단계별 풀이 과정"
}

반드시 JSON 형식으로만 응답하세요.
  `.trim();

  const result = await getModel().generateContent(prompt);
  return extractJson(result.response.text());
}

export interface EvaluateParams {
  /** 문제 본문 (AI 출제분 또는 사진에서 추출한 텍스트) */
  problemContent: string;
  /** 저장된 정답 (user_uploaded는 없음) */
  answer: string | null;
  /** 저장된 풀이 (user_uploaded는 없음) */
  solution: string | null;
  /** 풀이 과정(식) 필수 여부 */
  formulaRequired: boolean;
  /** 학생 학교급 — 레벨별 AI 기준 선택에 사용 */
  schoolLevel: SchoolLevel;
  /** 이전 시도들 (이미지는 저장하지 않고 요약 텍스트만 누적) */
  previousAttempts: Attempt[];
  aiRules: AIRule[];
  /** 최신 제출 이미지 1장 */
  studentImage: string;
}

/**
 * 학생 풀이 채점 + 피드백.
 * 토큰 절약을 위해 [기준 + 문제 + 이전 시도 요약 + 최신 이미지 1장]만 전송한다.
 */
export async function evaluateAttempt(params: EvaluateParams): Promise<GeminiResponse> {
  const {
    problemContent,
    answer,
    solution,
    formulaRequired,
    schoolLevel,
    previousAttempts,
    aiRules,
    studentImage,
  } = params;

  const attemptHistory = previousAttempts
    .map((a) => `시도 ${a.attempt_no}: ${a.issue_summary}${a.is_correct ? ' (정답)' : ''}`)
    .join('\n');

  // 저장된 정답이 있으면 그 기준으로 채점(재계산 X), 없으면(내 문제 풀기) 즉석 채점
  const answerSection = answer
    ? `[채점 기준 — 이 정답을 기준으로만 채점하세요]\n정답: ${answer}\n모범 풀이: ${solution || '(없음)'}`
    : `[채점 기준]\n이 문제는 학생이 직접 올린 문제라 정답이 미리 저장되어 있지 않습니다.\n문제를 직접 풀어 정답을 구한 뒤, 학생의 풀이와 비교해 채점하세요.`;

  const formulaSection = formulaRequired
    ? '이 문제는 풀이 과정(식)이 필수입니다. 답만 적혀 있고 과정이 없으면 정답이라도 is_correct를 false로 하고, 과정을 쓰도록 유도하세요.'
    : '이 문제는 풀이 과정(식) 없이 답만 적어도 정답으로 인정합니다.';

  const prompt = `
당신은 수학 과외 선생님입니다. 학생의 풀이 이미지를 보고 채점과 피드백을 해주세요.

${buildRuleSection(aiRules, schoolLevel)}

[문제]
${problemContent || '(문제 본문 없음 — 이미지의 풀이 내용만으로 판단하세요)'}

${answerSection}

[풀이 과정 요구사항]
${formulaSection}

[이전 시도 기록]
${attemptHistory || '첫 시도'}

판단할 내용:
1. 정답 여부 (is_correct)
2. 이번 회차 지적 사항 한 줄 요약 (issue_summary: 예 "계산 순서 오류", "부호 실수", "정답")
3. 정답이면 학생이 작성한 풀이를 텍스트로 옮겨 정리 (final_solution_text)
4. 피드백 (오답이면 정답을 절대 직접 알려주지 말고, 틀린 지점을 짚어 다음 단계를 유도하는 질문. 정답이면 칭찬)

응답 형식 (JSON):
{
  "is_correct": true 또는 false,
  "issue_summary": "한 줄 요약",
  "final_solution_text": "정답일 때만 학생 풀이 정리",
  "feedback": "선생님 피드백"
}

반드시 JSON 형식으로만 응답하세요.
  `.trim();

  const result = await getModel().generateContent([prompt, toInlineData(studentImage)]);
  return extractJson<GeminiResponse>(result.response.text());
}

/** "내 문제 풀기" — 문제집 사진에서 문제 본문을 텍스트로 추출한다. */
export async function parseUserUploadedProblem(imageBase64: string): Promise<string> {
  const prompt = `
이 이미지에 나타난 수학 문제를 텍스트로 정확하게 옮겨적어주세요.
객관식이면 보기(①②③④⑤)도 함께 옮겨적으세요.
수식은 자연스럽게 표현하되, 필요하면 LaTeX 표기를 사용해도 됩니다.
문제 본문만 제공하고, 답이나 풀이는 포함하지 마세요.
  `.trim();

  const result = await getModel().generateContent([prompt, toInlineData(imageBase64)]);
  return result.response.text().trim();
}

/** 포기 처리 시 제공할 정답 + 쉬운 풀이 설명. */
export async function generateSolutionExplanation(
  problemContent: string,
  correctAnswer: string,
  schoolLevel: SchoolLevel,
  aiRules: AIRule[]
): Promise<{ answer: string; explanation: string }> {
  const prompt = `
당신은 수학 과외 선생님입니다.

${buildRuleSection(aiRules, schoolLevel)}

학생이 3회 이상 시도했지만 정답에 도달하지 못해 포기했습니다.
이제 정답과 쉬운 풀이를 알려주세요.

[문제]
${problemContent || '(문제 본문 없음)'}

${correctAnswer ? `[정답]\n${correctAnswer}` : '[정답]\n저장된 정답이 없습니다. 직접 풀어 정답을 구하세요.'}

응답 형식 (JSON):
{
  "answer": "정답",
  "explanation": "학생이 이해할 수 있는 쉬운 단계별 풀이 (300자 이내)"
}

반드시 JSON 형식으로만 응답하세요.
  `.trim();

  const result = await getModel().generateContent(prompt);
  return extractJson(result.response.text());
}
