import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env';

loadEnv();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: options } = await supabase
    .from('active_options')
    .select('id, value')
    .eq('type', 'grade')
    .order('order');

  const { data: units } = await supabase
    .from('active_units')
    .select('grade_option_id, name, order')
    .order('order');

  for (const grade of options || []) {
    const list = (units || []).filter((u) => u.grade_option_id === grade.id);
    console.log(`${grade.value}: ${list.length}개 ${list.map((u) => u.name).join(', ')}`);
  }
}

main();
