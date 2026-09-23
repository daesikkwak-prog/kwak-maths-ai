'use client';

import { useState } from 'react';
import type { HistoryItem } from '@/types';
import styles from './HistoryList.module.css';
import ProblemFigure from './ProblemFigure';

const STATUS_LABEL: Record<HistoryItem['status'], string> = {
  correct: '✅ 정답',
  gave_up: '🏳️ 포기',
  in_progress: '⏳ 푸는 중',
};

/** 문제별 상세 기록. 제출 이미지는 저장하지 않으므로 텍스트 기록만 보여준다. */
export default function HistoryList({ items }: { items: HistoryItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (items.length === 0) {
    return <div className={styles.empty}>아직 푼 문제가 없어요.</div>;
  }

  return (
    <div className={styles.list}>
      {items.map((item) => {
        const open = openId === item.problem_id;
        return (
          <div key={item.problem_id} className={styles.item}>
            <button
              className={styles.header}
              onClick={() => setOpenId(open ? null : item.problem_id)}
            >
              <div className={styles.headerMain}>
                <span className={styles.status}>{STATUS_LABEL[item.status]}</span>
                <span className={styles.preview}>
                  {item.content ? item.content.slice(0, 60) : '(문제 본문 없음)'}
                  {item.content && item.content.length > 60 ? '…' : ''}
                </span>
              </div>
              <div className={styles.meta}>
                {item.unit_name && <span>{item.unit_name}</span>}
                {item.difficulty && <span>난이도 {item.difficulty}</span>}
                <span>{item.attempts.length}회 시도</span>
                <span>{item.last_attempt_at.slice(0, 10)}</span>
              </div>
            </button>

            {open && (
              <div className={styles.detail}>
                <section>
                  <h4>문제</h4>
                  <p className={styles.text}>{item.content || '(없음)'}</p>
                  <ProblemFigure svg={item.figure_svg} />
                </section>

                {item.answer && (
                  <section>
                    <h4>정답</h4>
                    <p className={styles.text}>{item.answer}</p>
                  </section>
                )}

                {item.solution && (
                  <section>
                    <h4>풀이</h4>
                    <p className={styles.text}>{item.solution}</p>
                  </section>
                )}

                <section>
                  <h4>시도별 피드백</h4>
                  <ol className={styles.attempts}>
                    {item.attempts.map((a) => (
                      <li key={a.attempt_no}>
                        <span className={styles.attemptNo}>{a.attempt_no}차</span>
                        <span>{a.issue_summary}</span>
                        {a.is_correct && <span className={styles.correct}>정답</span>}
                        {a.gave_up && <span className={styles.gaveUp}>포기</span>}
                      </li>
                    ))}
                  </ol>
                </section>

                {item.attempts.find((a) => a.final_solution_text) && (
                  <section>
                    <h4>내가 쓴 최종 풀이</h4>
                    <p className={styles.text}>
                      {item.attempts.find((a) => a.final_solution_text)?.final_solution_text}
                    </p>
                  </section>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
