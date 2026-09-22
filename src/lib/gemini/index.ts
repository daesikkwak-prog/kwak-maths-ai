import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeminiResponse, AIRule, Problem, Attempt } from '@/types';

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function generateProblem(
  grade: string,
  unit: string,
  difficulty: string,
  aiRules: AIRule[]
): Promise<{ answer: string; solution: string; problem: string }> {
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const commonRule = aiRules.find((r) => r.level === 'common');
  const levelRule = aiRules.find((r) => r.level === grade.slice(0, 1));

  const prompt = `
당신은 수학 문제 출제 전문가입니다.

[공통 기준]
${commonRule?.content || 'N/A'}

[${grade} 기준]
${levelRule?.content || 'N/A'}

다음 조건으로 수학 문제를 출제해주세요:
- 학년: ${grade}
- 단원: ${unit}
- 난이도: ${difficulty}

응답 형식 (JSON):
{
  "problem": "문제를 이미지처럼 자연스럽게 서술",
  "answer": "정답 (숫자나 식)",
  "solution": "상세한 풀이 과정"
}

반드시 JSON 형식으로만 응답하세요.
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) throw new Error('Invalid Gemini response format');

  return JSON.parse(jsonMatch[0]);
}

export async function evaluateAttempt(
  problemAnswer: string,
  problemSolution: string,
  studentImage: string, // Base64
  problemContext: string,
  previousAttempts: Attempt[],
  aiRules: AIRule[]
): Promise<GeminiResponse> {
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const commonRule = aiRules.find((r) => r.level === 'common');
  const attemptHistory = previousAttempts
    .map(
      (a) =>
        `시도 ${a.attempt_no}: ${a.issue_summary}${a.is_correct ? ' (정답)' : ''}`
    )
    .join('\n');

  const prompt = `
당신은 수학 과외 선생님입니다. 학생의 풀이를 평가하고 피드백을 제공해야 합니다.

[평가 기준]
${commonRule?.content || 'N/A'}

[문제 정보]
${problemContext}

[정답 및 풀이]
답: ${problemAnswer}
풀이: ${problemSolution}

[이전 시도 기록]
${attemptHistory || '첫 시도'}

학생의 최신 풀이(이미지)를 분석하고, 다음을 판단해주세요:

1. 정답 여부 (is_correct: true/false)
2. 한 줄 요약 (issue_summary: 예: "계산 순서 오류", "부호 실수", "정답" 등)
3. 정답이 맞으면, 학생이 작성한 풀이를 텍스트로 정리 (final_solution_text)
4. 피드백 (정답이 아니면 다음 단계를 유도하는 질문, 정답이면 칭찬)

응답 형식 (JSON):
{
  "is_correct": boolean,
  "issue_summary": "한 줄 요약",
  "final_solution_text": "학생 풀이 정리 (정답일 때만)",
  "feedback": "선생님 피드백"
}

반드시 JSON 형식으로만 응답하세요.
  `;

  const imageData = {
    inlineData: {
      data: studentImage.split(',')[1] || studentImage, // Base64
      mimeType: 'image/jpeg',
    },
  };

  const result = await model.generateContent([prompt, imageData]);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) throw new Error('Invalid Gemini response format');

  return JSON.parse(jsonMatch[0]);
}

export async function parseUserUploadedProblem(
  imageBase64: string
): Promise<string> {
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
이 이미지에 나타난 수학 문제를 텍스트로 정확하게 옮겨적어주세요.
수식은 가능한 한 자연스럽게 표현하되, 수식 표기가 필요하면 LaTeX 형식을 사용할 수 있습니다.
문제 설명만 제공하고, 답이나 풀이는 포함하지 마세요.
  `;

  const imageData = {
    inlineData: {
      data: imageBase64.split(',')[1] || imageBase64,
      mimeType: 'image/jpeg',
    },
  };

  const result = await model.generateContent([prompt, imageData]);
  return result.response.text();
}

export async function generateSolutionExplanation(
  problemContext: string,
  correctAnswer: string,
  aiRules: AIRule[]
): Promise<string> {
  const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const commonRule = aiRules.find((r) => r.level === 'common');

  const prompt = `
당신은 수학 과외 선생님입니다.

[평가 기준]
${commonRule?.content || 'N/A'}

학생이 3번 이상 시도했지만 정답에 못 미쳤습니다. 이제 정답과 간단한 풀이를 제공해주세요.

[문제]
${problemContext}

[정답]
${correctAnswer}

간단하고 명확한 풀이를 제공해주세요. (200자 이내)
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
