import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedDatabase() {
  console.log('🌱 Seeding database...\n');

  try {
    // 1. Insert options (학년)
    console.log('📝 Inserting grade options...');
    const grades = [
      { type: 'grade', value: '초1', order: 1 },
      { type: 'grade', value: '초2', order: 2 },
      { type: 'grade', value: '초3', order: 3 },
      { type: 'grade', value: '초4', order: 4 },
      { type: 'grade', value: '초5', order: 5 },
      { type: 'grade', value: '초6', order: 6 },
      { type: 'grade', value: '중1', order: 7 },
      { type: 'grade', value: '중2', order: 8 },
      { type: 'grade', value: '중3', order: 9 },
      { type: 'grade', value: '고1', order: 10 },
      { type: 'grade', value: '고2', order: 11 },
      { type: 'grade', value: '고3', order: 12 },
    ];

    const { error: gradeError } = await supabase.from('options').upsert(grades);
    if (gradeError) throw gradeError;
    console.log('✅ Grade options inserted\n');

    // 2. Insert difficulty options
    console.log('📝 Inserting difficulty options...');
    const difficulties = [
      { type: 'difficulty', value: '하', order: 1 },
      { type: 'difficulty', value: '중', order: 2 },
      { type: 'difficulty', value: '상', order: 3 },
    ];

    const { error: diffError } = await supabase.from('options').upsert(difficulties);
    if (diffError) throw diffError;
    console.log('✅ Difficulty options inserted\n');

    // 3. Insert AI rules
    console.log('📝 Inserting AI rules...');
    const aiRules = [
      {
        level: 'common',
        content:
          '너는 수학 과외 선생님이다. 학생의 풀이를 단계별로 검토하고, 정답을 직접 말하지 말고 다음 단계를 유도하는 질문을 제공하라.',
      },
      {
        level: '초',
        content: '초등학교 수준의 문제를 출제하고, 기초 연산과 도형 이해에 중점을 둔다.',
      },
      {
        level: '중',
        content: '중학교 수준의 문제를 출제하고, 방정식, 함수, 기하를 포함한다.',
      },
      {
        level: '고',
        content: '고등학교 수준의 문제를 출제하고, 미적분, 삼각함수 등 심화 내용을 포함한다.',
      },
    ];

    const { error: ruleError } = await supabase.from('ai_rules').upsert(aiRules);
    if (ruleError) throw ruleError;
    console.log('✅ AI rules inserted\n');

    // 4. Verify data
    console.log('🔍 Verifying data...');
    const { data: optionsData, error: optionsErr } = await supabase
      .from('options')
      .select('*');
    if (optionsErr) throw optionsErr;
    console.log(`✅ Options count: ${optionsData?.length || 0}`);

    const { data: rulesData, error: rulesErr } = await supabase.from('ai_rules').select('*');
    if (rulesErr) throw rulesErr;
    console.log(`✅ AI Rules count: ${rulesData?.length || 0}`);

    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
