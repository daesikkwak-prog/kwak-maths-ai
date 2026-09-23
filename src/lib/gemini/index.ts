import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiResponse, AIRule, AIRuleLevel, Attempt, SchoolLevel } from '@/types';

// 모델명은 환경변수로 덮어쓸 수 있다 (모델 단종 시 코드 수정 없이 교체)
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * JSON을 받는 호출은 응답 형식을 JSON으로 고정한다.
 * 코드펜스·설명 문장을 만들지 않아 응답이 짧고 빨라지며 파싱도 안정적이다.
 */
function getModel(jsonMode = false) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }
  return client.getGenerativeModel({
    model: MODEL,
    ...(jsonMode ? { generationConfig: { responseMimeType: 'application/json' } } : {}),
  });
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

/**
 * 화면에 그대로 뿌리는 텍스트라 LaTeX가 섞이면 "$4\\text{cm}$"처럼 보인다.
 * (그래도 섞여 오면 화면에서 lib/utils/math-text.ts가 한 번 더 정리한다)
 */
const PLAIN_MATH_RULE = `수식 표기 규칙: LaTeX나 마크다운을 절대 쓰지 마세요. $, \\frac, \\text, ^, _, ** 금지.
일반 텍스트와 유니코드 기호로만 쓰세요. (예: 4cm, 1/2, x², √2, π, 30°, 3×4, 12÷3, ≤, ∠ABC)`;

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
 * 도형·그래프처럼 그림이 필요한 문제는 SVG 그림(figure_svg)도 함께 생성한다.
 */
export async function generateProblem(
  grade: string,
  unit: string,
  difficulty: string,
  aiRules: AIRule[],
  /** 취약 유형 보강 출제 지시 (없으면 일반 출제) */
  weaknessNote = ''
): Promise<{ problem: string; answer: string; solution: string; figure_svg: string }> {
  const prompt = `
당신은 수학 문제 출제 전문가입니다.

${buildRuleSection(aiRules, gradeToSchoolLevel(grade))}

다음 조건으로 수학 문제를 1개 출제해주세요:
- 학년: ${grade}
- 단원: ${unit}
- 난이도: ${difficulty}
${weaknessNote ? `\n${weaknessNote}\n` : ''}
주의사항:
- 정답은 채점 기준이 되므로 명확하고 유일해야 합니다.
- ${PLAIN_MATH_RULE}
- 도형, 각도, 좌표평면, 그래프, 수직선, 시계, 표, 길이 비교처럼 그림이 있어야 이해되는 문제라면
  말로 길게 설명하지 말고 반드시 figure_svg에 실제 그림을 SVG로 그려주세요.
  (예: "지름이 6cm인 원" → 원을 그리고 지름 선분과 "6cm" 표시를 그림 안에 넣기)
- 그림이 필요 없는 문제(단순 계산, 일반 문장제)라면 figure_svg는 빈 문자열("")로 두세요.

figure_svg 작성 규칙:
- <svg 로 시작해 </svg> 로 끝나는 SVG 마크업 하나만 넣습니다. 설명 문장을 섞지 마세요.
- 반드시 viewBox를 지정하고(예: viewBox="0 0 400 300"), width/height 속성은 넣지 마세요.
- script, foreignObject, image, 외부 링크(href), 이벤트 속성(onclick 등)은 절대 사용 금지입니다.
- 변의 길이, 각도, 좌표, 점 이름(A, B, C) 등 문제에 필요한 값은 <text>로 그림 안에 표기하세요.
- 선은 stroke="#333" stroke-width="2", 글자는 font-size="16" fill="#333", 배경은 투명하게.
- 구해야 하는 값은 그림에 정답을 쓰지 말고 "?" 또는 x로 표시하세요.
- 그림은 간결하게: 도형 요소 15개 이내, SVG 전체 1000자 이내. 장식·그림자·그라데이션 금지.
- 문제 본문에서는 "그림과 같이"처럼 그림을 가리켜도 됩니다.

응답 형식 (JSON):
{
  "problem": "문제 본문",
  "figure_svg": "<svg viewBox=\\"0 0 400 300\\">...</svg> 또는 빈 문자열",
  "answer": "정답 (숫자나 식)",
  "solution": "단계별 풀이 과정"
}

반드시 JSON 형식으로만 응답하세요.
  `.trim();

  const result = await getModel(true).generateContent(prompt);
  const parsed = extractJson<{
    problem: string;
    answer: string;
    solution: string;
    figure_svg?: string;
  }>(result.response.text());

  return { ...parsed, figure_svg: parsed.figure_svg || '' };
}

export interface EvaluateParams {
  /** 문제 본문 (AI 출제분 또는 사진에서 추출한 텍스트) */
  problemContent: string;
  /** 문제 그림 SVG (있을 때만 — 그림 속 수치를 읽고 채점해야 하므로 함께 보낸다) */
  figureSvg?: string | null;
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
    figureSvg,
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

  // 그림이 있는 문제는 SVG 소스를 함께 보내 그림 속 수치·기호를 읽게 한다
  const figureSection = figureSvg
    ? `\n[문제 그림 — SVG 소스, 이 그림에 표시된 수치와 기호도 문제 조건입니다]\n${figureSvg}\n`
    : '';

  const formulaSection = formulaRequired
    ? '이 문제는 풀이 과정(식)이 필수입니다. 답만 적혀 있고 과정이 없으면 정답이라도 is_correct를 false로 하고, 과정을 쓰도록 유도하세요.'
    : '이 문제는 풀이 과정(식) 없이 답만 적어도 정답으로 인정합니다.';

  const prompt = `
당신은 수학 과외 선생님입니다. 학생의 풀이 이미지를 보고 채점과 피드백을 해주세요.

${buildRuleSection(aiRules, schoolLevel)}

[문제]
${problemContent || '(문제 본문 없음 — 이미지의 풀이 내용만으로 판단하세요)'}
${figureSection}
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

${PLAIN_MATH_RULE}

응답 형식 (JSON):
{
  "is_correct": true 또는 false,
  "issue_summary": "한 줄 요약",
  "final_solution_text": "정답일 때만 학생 풀이 정리",
  "feedback": "선생님 피드백"
}

반드시 JSON 형식으로만 응답하세요.
  `.trim();

  const result = await getModel(true).generateContent([prompt, toInlineData(studentImage)]);
  return extractJson<GeminiResponse>(result.response.text());
}

/** "내 문제 풀기" — 문제집 사진에서 문제 본문을 텍스트로 추출한다. */
export async function parseUserUploadedProblem(imageBase64: string): Promise<string> {
  const prompt = `
이 이미지에 나타난 수학 문제를 텍스트로 정확하게 옮겨적어주세요.
객관식이면 보기(①②③④⑤)도 함께 옮겨적으세요.
${PLAIN_MATH_RULE}
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
  aiRules: AIRule[],
  /** 문제 그림 SVG (있으면 그림 속 수치까지 보고 풀이한다) */
  figureSvg?: string | null
): Promise<{ answer: string; explanation: string }> {
  const figureSection = figureSvg
    ? `\n[문제 그림 — SVG 소스, 그림에 표시된 수치도 문제 조건입니다]\n${figureSvg}\n`
    : '';

  const prompt = `
당신은 수학 과외 선생님입니다.

${buildRuleSection(aiRules, schoolLevel)}

학생이 3회 이상 시도했지만 정답에 도달하지 못해 포기했습니다.
이제 정답과 쉬운 풀이를 알려주세요.

[문제]
${problemContent || '(문제 본문 없음)'}
${figureSection}
${correctAnswer ? `[정답]\n${correctAnswer}` : '[정답]\n저장된 정답이 없습니다. 직접 풀어 정답을 구하세요.'}

${PLAIN_MATH_RULE}

응답 형식 (JSON):
{
  "answer": "정답",
  "explanation": "학생이 이해할 수 있는 쉬운 단계별 풀이 (300자 이내)"
}

반드시 JSON 형식으로만 응답하세요.
  `.trim();

  const result = await getModel(true).generateContent(prompt);
  return extractJson(result.response.text());
}
