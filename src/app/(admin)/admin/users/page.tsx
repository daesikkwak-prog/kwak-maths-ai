'use client';

import { useEffect, useState } from 'react';
import styles from './AdminUsers.module.css';

interface User {
  id: string;
  name: string;
  role: string;
  school_level: string;
  grade: number;
  my_problem_formula_required: boolean;
  created_at: string;
}

const emptyForm = {
  name: '',
  password: '',
  role: 'student',
  school_level: '중',
  grade: 1,
  my_problem_formula_required: true,
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const maxGrade = formData.school_level === '초' ? 6 : 3;

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.success) setUsers(json.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        setSuccess(`${formData.name} 계정이 생성되었습니다.`);
        setFormData(emptyForm);
        setShowForm(false);
        fetchUsers();
      } else {
        setError(json.error || '사용자 생성에 실패했습니다.');
      }
    } catch {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  /** 학생은 본인 정보를 수정할 수 없으므로 비밀번호 변경도 관리자가 수행한다. */
  const handleResetPassword = async (user: User) => {
    const password = window.prompt(`${user.name}의 새 비밀번호 (6자 이상)`);
    if (!password) return;

    setError('');
    setSuccess('');

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();

    if (json.success) setSuccess(`${user.name}의 비밀번호가 변경되었습니다.`);
    else setError(json.error || '비밀번호 변경에 실패했습니다.');
  };

  const handleToggleFormula = async (user: User) => {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        my_problem_formula_required: !user.my_problem_formula_required,
      }),
    });
    const json = await res.json();

    if (json.success) fetchUsers();
    else setError(json.error || '설정 변경에 실패했습니다.');
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`${user.name} 계정을 삭제할까요? (기록은 보존됩니다)`)) return;

    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
    const json = await res.json();

    if (json.success) {
      setSuccess(`${user.name} 계정이 삭제되었습니다.`);
      fetchUsers();
    } else {
      setError(json.error || '삭제에 실패했습니다.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>사용자 관리</h1>
        <button className={styles.createBtn} onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ 닫기' : '+ 새 사용자'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {showForm && (
        <form className={styles.form} onSubmit={handleCreateUser}>
          <div className={styles.formGroup}>
            <label>사용자명 (로그인 아이디)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>비밀번호 (6자 이상)</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              minLength={6}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>권한</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="student">학생</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>학교급</label>
            <select
              value={formData.school_level}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  school_level: e.target.value,
                  grade: 1,
                })
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
              onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
            >
              {Array.from({ length: maxGrade }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>
                  {g}학년
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                checked={formData.my_problem_formula_required}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    my_problem_formula_required: e.target.checked,
                  })
                }
              />{' '}
              내 문제 풀기 - 풀이 과정(식) 필수
            </label>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? '생성 중...' : '계정 생성'}
          </button>
        </form>
      )}

      {loading ? (
        <div className={styles.loading}>로드 중...</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>사용자명</th>
              <th>권한</th>
              <th>학년</th>
              <th>식 필수</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.role === 'admin' ? '관리자' : '학생'}</td>
                <td>
                  {user.school_level}
                  {user.grade}
                </td>
                <td>
                  <button
                    className={styles.toggleBtn}
                    onClick={() => handleToggleFormula(user)}
                  >
                    {user.my_problem_formula_required ? '필수' : '선택'}
                  </button>
                </td>
                <td className={styles.actions}>
                  <button onClick={() => handleResetPassword(user)}>비밀번호 변경</button>
                  <button className={styles.danger} onClick={() => handleDelete(user)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
