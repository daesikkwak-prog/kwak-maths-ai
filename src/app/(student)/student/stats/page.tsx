'use client';

import { useEffect, useState } from 'react';
import styles from './Stats.module.css';

export default function StudentStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/students/me/stats?student_id=test-student-001');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>📊 공부기록</h1>

      {loading ? (
        <div className={styles.loading}>로드 중...</div>
      ) : stats ? (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.label}>푼 문제 수</div>
              <div className={styles.value}>{stats.total_problems_solved}개</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.label}>정답률</div>
              <div className={styles.value}>{stats.correct_rate.toFixed(1)}%</div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progress}
                  style={{ width: `${Math.min(stats.correct_rate, 100)}%` }}
                />
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.label}>학습 시간</div>
              <div className={styles.value}>
                {Math.floor(stats.study_time_minutes / 60)}시간
                {stats.study_time_minutes % 60}분
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.label}>포기한 문제</div>
              <div className={styles.value}>{stats.give_up_count}개</div>
            </div>
          </div>

          {stats.vulnerable_units && stats.vulnerable_units.length > 0 && (
            <div className={styles.vulnerabilities}>
              <h2>📚 취약한 단원</h2>
              <div className={styles.unitsList}>
                {stats.vulnerable_units.map((unit: any, idx: number) => (
                  <div key={idx} className={styles.unitItem}>
                    <div className={styles.unitName}>{unit.unit_name}</div>
                    <div className={styles.unitStats}>
                      <div className={styles.correctRate}>
                        {unit.correct_rate.toFixed(1)}%
                      </div>
                      <div className={styles.attempts}>
                        {unit.total_attempts}회 시도
                      </div>
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
            </div>
          )}
        </>
      ) : (
        <div className={styles.empty}>📈 아직 풀이 기록이 없습니다.</div>
      )}
    </div>
  );
}
