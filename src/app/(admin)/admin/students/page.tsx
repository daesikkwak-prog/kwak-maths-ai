'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './AdminStudents.module.css';

interface Student {
  id: string;
  name: string;
  school_level: string;
  grade: number;
  created_at: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/users?role=student');
        const json = await res.json();
        if (json.success) setStudents(json.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className={styles.container}>
      <h1>📈 학생 기록</h1>
      <p className={styles.subtitle}>학생을 선택하면 통계와 문제별 상세 기록을 볼 수 있습니다.</p>

      {loading ? (
        <div className={styles.loading}>로드 중...</div>
      ) : students.length === 0 ? (
        <div className={styles.empty}>등록된 학생이 없습니다.</div>
      ) : (
        <div className={styles.grid}>
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/admin/students/${student.id}`}
              className={styles.card}
            >
              <h3>{student.name}</h3>
              <p>
                {student.school_level}
                {student.grade}학년
              </p>
              <span className={styles.link}>기록 보기 →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
