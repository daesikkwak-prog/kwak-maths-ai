'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import TrendChart from '@/components/student/TrendChart';
import HistoryList from '@/components/student/HistoryList';
import type { HistoryItem, StudentStats } from '@/types';
import styles from './StudentDetail.module.css';

interface StudentInfo {
  id: string;
  name: string;
  school_level: string;
  grade: number;
}

export default function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, historyRes] = await Promise.all([
          fetch(`/api/admin/students/${id}/stats`),
          fetch(`/api/admin/students/${id}/history`),
        ]);
        const statsJson = await statsRes.json();
        const historyJson = await historyRes.json();

        if (statsJson.success) {
          setStudent(statsJson.data.student);
          setStats(statsJson.data.stats);
        } else {
          setError(statsJson.error || '통계를 불러오지 못했습니다.');
        }

        if (historyJson.success) setHistory(historyJson.data || []);
      } catch {
        setError('통계를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className={styles.container}>로드 중...</div>;

  return (
    <div className={styles.container}>
      <Link href="/admin/students" className={styles.back}>
        ← 학생 목록
      </Link>

      {error && <div className={styles.error}>{error}</div>}

      {student && (
        <h1>
          {student.name}{' '}
          <span className={styles.gradeTag}>
            {student.school_level}
            {student.grade}학년
          </span>
        </h1>
      )}

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
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>단원</th>
                    <th>정답률</th>
                    <th>맞힘/전체</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.vulnerable_units.map((unit) => (
                    <tr key={unit.unit_id}>
                      <td>{unit.unit_name}</td>
                      <td>{unit.correct_rate}%</td>
                      <td>
                        {unit.correct_problems}/{unit.total_problems}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={styles.empty}>집계된 단원 기록이 없습니다.</p>
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
