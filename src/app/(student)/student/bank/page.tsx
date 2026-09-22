'use client';

import { useRouter } from 'next/navigation';
import styles from './Bank.module.css';

export default function ProblemBank() {
  const router = useRouter();

  const difficulties = [
    { value: '하', label: '하 (쉬움)', emoji: '😊' },
    { value: '중', label: '중 (보통)', emoji: '🙂' },
    { value: '상', label: '상 (어려움)', emoji: '😰' },
  ];

  const handleSelect = (difficulty: string) => {
    router.push(`/student/solve?difficulty=${difficulty}`);
  };

  return (
    <div className={styles.container}>
      <h1>📚 문제은행</h1>
      <p className={styles.subtitle}>난이도를 선택하고 문제를 풀어보세요</p>

      <div className={styles.difficultyGrid}>
        {difficulties.map((diff) => (
          <button
            key={diff.value}
            className={styles.difficultyCard}
            onClick={() => handleSelect(diff.value)}
          >
            <div className={styles.emoji}>{diff.emoji}</div>
            <h3>{diff.label}</h3>
            <p>이 난이도로 시작하기</p>
          </button>
        ))}
      </div>

      <div className={styles.tips}>
        <h2>💡 팁</h2>
        <ul>
          <li>
            <strong>쉬운 문제(하):</strong> 기초 개념을 확인하고 싶을 때
          </li>
          <li>
            <strong>보통 문제(중):</strong> 균형있는 난이도로 실력 점검
          </li>
          <li>
            <strong>어려운 문제(상):</strong> 심화 학습 및 도전적인 문제
          </li>
        </ul>
      </div>
    </div>
  );
}
