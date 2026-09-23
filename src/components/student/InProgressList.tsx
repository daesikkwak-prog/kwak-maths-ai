'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toReadableMath } from '@/lib/utils/math-text';
import styles from './InProgressList.module.css';

interface InProgressProblem {
  problem_id: string;
  source: string;
  content: string | null;
  unit_name: string | null;
  difficulty: string | null;
  attempt_count: number;
  last_attempt_at: string;
}

/** 정답도 포기도 아닌 채로 남은 문제를 이어서 풀 수 있게 보여준다. */
export default function InProgressList({ currentProblemId }: { currentProblemId?: string }) {
  const router = useRouter();
  const [items, setItems] = useState<InProgressProblem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/students/me/in-progress');
        const json = await res.json();
        if (json.success) setItems(json.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = items.filter((item) => item.problem_id !== currentProblemId);

  if (loading || visible.length === 0) return null;

  return (
    <section className={styles.wrapper}>
      <h3>⏳ 풀다 만 문제</h3>
      <ul className={styles.list}>
        {visible.map((item) => {
          const preview = toReadableMath(item.content);
          return (
          <li key={item.problem_id}>
            <button onClick={() => router.push(`/student/solve?problem_id=${item.problem_id}`)}>
              <span className={styles.preview}>
                {preview ? preview.slice(0, 50) : '(문제 본문 없음)'}
                {preview.length > 50 ? '…' : ''}
              </span>
              <span className={styles.meta}>
                {item.unit_name && <span>{item.unit_name}</span>}
                {item.difficulty && <span>난이도 {item.difficulty}</span>}
                <span>{item.attempt_count}회 시도</span>
              </span>
            </button>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
