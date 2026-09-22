'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalAdmins: 0,
    totalUnits: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, unitsRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/units'),
        ]);

        const usersData = await usersRes.json();
        const unitsData = await unitsRes.json();

        if (usersData.success && unitsData.success) {
          const users = usersData.data || [];
          const students = users.filter((u: any) => u.role === 'student');
          const admins = users.filter((u: any) => u.role === 'admin');

          setStats({
            totalUsers: users.length,
            totalStudents: students.length,
            totalAdmins: admins.length,
            totalUnits: (unitsData.data || []).length,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className={styles.dashboard}>
      <h1>관리자 대시보드</h1>
      <p className={styles.subtitle}>수학 학습 도우미 관리 시스템</p>

      {loading ? (
        <div className={styles.loading}>로드 중...</div>
      ) : (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.icon}>👥</div>
            <div className={styles.content}>
              <h3>전체 사용자</h3>
              <p className={styles.number}>{stats.totalUsers}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.icon}>🎓</div>
            <div className={styles.content}>
              <h3>학생</h3>
              <p className={styles.number}>{stats.totalStudents}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.icon}>🔐</div>
            <div className={styles.content}>
              <h3>관리자</h3>
              <p className={styles.number}>{stats.totalAdmins}</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.icon}>📚</div>
            <div className={styles.content}>
              <h3>단원</h3>
              <p className={styles.number}>{stats.totalUnits}</p>
            </div>
          </div>
        </div>
      )}

      <div className={styles.quickLinks}>
        <h2>빠른 접근</h2>
        <div className={styles.linksGrid}>
          <Link href="/admin/users" className={styles.linkCard}>
            <h4>👥 사용자 관리</h4>
            <p>학생 및 관리자 계정 관리</p>
          </Link>

          <Link href="/admin/ai-rules" className={styles.linkCard}>
            <h4>🤖 AI 규칙</h4>
            <p>AI의 답변 기준 설정</p>
          </Link>

          <Link href="/admin/units" className={styles.linkCard}>
            <h4>📚 단원 관리</h4>
            <p>학년별 단원 관리</p>
          </Link>

          <Link href="/admin/students" className={styles.linkCard}>
            <h4>📈 학생 기록</h4>
            <p>학생별 학습 통계 조회</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
