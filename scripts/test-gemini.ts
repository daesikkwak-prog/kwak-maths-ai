import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadEnv } from './env';

/** Gemini API Key / 모델 연결 확인용 */
loadEnv();

async function main() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('❌ GEMINI_API_KEY가 없습니다.');
    process.exit(1);
  }

  const model = new GoogleGenerativeAI(key).getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.6-flash' });
  const res = await model.generateContent('1+1은? 숫자만 답해.');
  console.log('✅ Gemini 응답:', res.response.text().trim());
}

main().catch((err) => {
  console.error('❌ Gemini 호출 실패:', err.message?.slice(0, 300) || err);
  process.exit(1);
});
