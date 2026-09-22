'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './Options.module.css';

interface Option {
  id: string;
  type: 'grade' | 'difficulty';
  value: string;
  order: number;
}

const TYPE_LABEL: Record<Option['type'], string> = {
  grade: '학년',
  difficulty: '난이도',
};

export default function AdminOptions() {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newType, setNewType] = useState<Option['type']>('grade');
  const [newValue, setNewValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOptions = useCallback(async () => {
    const res = await fetch('/api/admin/options');
    const json = await res.json();
    if (json.success) setOptions(json.data || []);
    else setError(json.error || '선택지를 불러오지 못했습니다.');
  }, []);

  useEffect(() => {
    fetchOptions().finally(() => setLoading(false));
  }, [fetchOptions]);

  const byType = (type: Option['type']) =>
    options.filter((o) => o.type === type).sort((a, b) => a.order - b.order);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const order = byType(newType).length + 1;
      const res = await fetch('/api/admin/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType, value: newValue, order }),
      });
      const json = await res.json();

      if (json.success) {
        setSuccess(`${TYPE_LABEL[newType]} '${newValue}' 추가됨`);
        setNewValue('');
        fetchOptions();
      } else {
        setError(json.error || '추가에 실패했습니다.');
      }
    } catch {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRename = async (option: Option) => {
    const value = window.prompt(`'${option.value}'의 새 이름`, option.value);
    if (!value || value === option.value) return;

    setError('');
    setSuccess('');

    const res = await fetch(`/api/admin/options/${option.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    const json = await res.json();

    if (json.success) {
      setSuccess('이름이 변경되었습니다.');
      fetchOptions();
    } else {
      setError(json.error || '변경에 실패했습니다.');
    }
  };

  const move = async (option: Option, direction: -1 | 1) => {
    const list = byType(option.type);
    const index = list.findIndex((o) => o.id === option.id);
    const target = list[index + direction];
    if (!target) return;

    setError('');
    setSuccess('');

    // 두 항목의 순서를 맞바꾼다
    await Promise.all([
      fetch(`/api/admin/options/${option.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: target.order }),
      }),
      fetch(`/api/admin/options/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: option.order }),
      }),
    ]);

    fetchOptions();
  };

  /** 소프트 삭제. 해당 학년을 쓰는 단원이 남아 있으면 서버가 막는다. */
  const handleDelete = async (option: Option) => {
    if (!window.confirm(`'${option.value}'을(를) 삭제할까요?`)) return;

    setError('');
    setSuccess('');

    const res = await fetch(`/api/admin/options/${option.id}`, { method: 'DELETE' });
    const json = await res.json();

    if (json.success) {
      setSuccess(`'${option.value}'이(가) 삭제되었습니다.`);
      fetchOptions();
    } else {
      setError(json.error || '삭제에 실패했습니다.');
    }
  };

  if (loading) return <div className={styles.container}>로드 중...</div>;

  return (
    <div className={styles.container}>
      <h1>선택지 관리</h1>
      <p className={styles.subtitle}>
        학생이 문제은행에서 고르는 학년·난이도 목록입니다. 학년은 단원 관리의 기준이 됩니다.
      </p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <form className={styles.addForm} onSubmit={handleCreate}>
        <select value={newType} onChange={(e) => setNewType(e.target.value as Option['type'])}>
          <option value="grade">학년</option>
          <option value="difficulty">난이도</option>
        </select>
        <input
          type="text"
          value={newValue}
          placeholder={newType === 'grade' ? '예: 중1' : '예: 최상'}
          onChange={(e) => setNewValue(e.target.value)}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? '추가 중...' : '추가'}
        </button>
      </form>

      <div className={styles.columns}>
        {(['grade', 'difficulty'] as const).map((type) => (
          <section key={type} className={styles.card}>
            <h2>{TYPE_LABEL[type]}</h2>
            {byType(type).length === 0 ? (
              <p className={styles.empty}>등록된 항목이 없습니다.</p>
            ) : (
              <ul className={styles.list}>
                {byType(type).map((option, idx, arr) => (
                  <li key={option.id}>
                    <span className={styles.value}>{option.value}</span>
                    <div className={styles.rowActions}>
                      <button onClick={() => move(option, -1)} disabled={idx === 0} title="위로">
                        ↑
                      </button>
                      <button
                        onClick={() => move(option, 1)}
                        disabled={idx === arr.length - 1}
                        title="아래로"
                      >
                        ↓
                      </button>
                      <button onClick={() => handleRename(option)}>이름</button>
                      <button className={styles.danger} onClick={() => handleDelete(option)}>
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
