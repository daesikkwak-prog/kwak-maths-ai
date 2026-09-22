'use client';

import { useEffect, useState } from 'react';
import TrendChart from '@/components/student/TrendChart';
import HistoryList from '@/components/student/HistoryList';
import type { HistoryItem, StudentStats } from '@/types';
import styles from './Stats.module.css';

export default function StudentStatsPage() {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          fetch('/api/students/me/stats'),
          fetch('/api/students/me/history'),
        ]);
        const statsJson = await statsRes.json();
        const historyJson = await historyRes.json();

        if (statsJson.success) setStats(statsJson.data);
        else setError(statsJson.error || '통계를 불러오지 못했습니다.');

        if (historyJson.success) setHistory(historyJson.data || []);
      } catch {
        setError('통계를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className={styles.container}>로드 중...</div>;

  return (
    <div className={styles.container}>
      <h1>📊 공부기록</h1>

      {error && <div className={styles.error}>{error}</div>}

      {stats && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.label}>푼 문제 수</div>
              <div className={styles.value}>{stats.total_problems_solved}개</div>
              <div className={styles.sub}>총 {stats.total_attempts}회 시도</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.label}>정답률</div>
              <div className={styles.value}>{stats.correct_rate}%</div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progress}
                  style={{ width: `${Math.min(stats.correct_rate, 100)}%` }}
                />
              </div>
              <div className={styles.sub}>맞힌 문제 {stats.correct_problems}개</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.label}>학습 시간</div>
              <div className={styles.value}>
                {Math.floor(stats.study_time_minutes / 60)}시간 {stats.study_time_minutes % 60}분
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.label}>포기한 문제</div>
              <div className={styles.value}>{stats.give_up_count}개</div>
            </div>
          </div>

          <section className={styles.section}>
            <h2>📈 정답률 추이</h2>
            <TrendChart data={stats.trend} />
          </section>

          <section className={styles.section}>
            <h2>📚 취약한 단원</h2>
            {stats.vulnerable_units.length > 0 ? (
              <div className={styles.unitsList}>
                {stats.vulnerable_units.map((unit) => (
                  <div key={unit.unit_id} className={styles.unitItem}>
                    <div className={styles.unitName}>{unit.unit_name}</div>
                    <div className={styles.unitStats}>
                      <span className={styles.correctRate}>{unit.correct_rate}%</span>
                      <span className={styles.attempts}>
                        {unit.correct_problems}/{unit.total_problems}문제
                      </span>
                    </div>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progress}
                        style={{ width: `${Math.min(unit.correct_rate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>단원이 지정된 문제를 풀면 여기에 표시돼요.</p>
            )}
          </section>

          <section className={styles.section}>
            <h2>📝 문제별 기록</h2>
            <HistoryList items={history} />
          </section>
        </>
      )}
    </div>
  );
}
