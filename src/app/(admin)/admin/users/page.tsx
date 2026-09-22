'use client';

import { useEffect, useState } from 'react';
import styles from './AdminUsers.module.css';

interface User {
  id: string;
  name: string;
  role: string;
  school_level: string;
  grade: number;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'student',
    school_level: '중',
    grade: 1,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('사용자가 생성되었습니다.');
        setFormData({ name: '', role: 'student', school_level: '중', grade: 1 });
        setShowForm(false);
        fetchUsers();
      } else {
        setError(data.error || '사용자 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
      console.error('Create user error:', err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>사용자 관리</h1>
        <button
          className={styles.createBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ 닫기' : '+ 새 사용자'}
        </button>
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={handleCreateUser}>
          <div className={styles.formGroup}>
            <label>사용자명</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>역할</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="student">학생</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>학급</label>
            <select
              value={formData.school_level}
              onChange={(e) =>
                setFormData({ ...formData, school_level: e.target.value })
              }
            >
              <option value="초">초등학교</option>
              <option value="중">중학교</option>
              <option value="고">고등학교</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>학년</label>
            <select
              value={formData.grade}
              onChange={(e) =>
                setFormData({ ...formData, grade: parseInt(e.target.value) })
              }
            >
              <option value="1">1학년</option>
              <option value="2">2학년</option>
              <option value="3">3학년</option>
            </select>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <button type="submit" className={styles.submitBtn}>
            생성
          </button>
        </form>
      )}

      {loading ? (
        <div className={styles.loading}>로드 중...</div>
      ) : (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>사용자명</th>
                <th>역할</th>
                <th>학급</th>
                <th>학년</th>
                <th>생성일</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>
                    <span
                      className={
                        user.role === 'admin' ? styles.roleAdmin : styles.roleStudent
                      }
                    >
                      {user.role === 'admin' ? '관리자' : '학생'}
                    </span>
                  </td>
                  <td>
                    {user.school_level === '초'
                      ? '초등학교'
                      : user.school_level === '중'
                        ? '중학교'
                        : '고등학교'}
                  </td>
                  <td>{user.grade}학년</td>
                  <td>
                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className={styles.empty}>사용자가 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}
