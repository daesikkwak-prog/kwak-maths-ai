'use client';

import { useEffect, useState } from 'react';
import styles from './Units.module.css';

interface Unit {
  id: string;
  name: string;
  answer_type: string;
  formula_required: boolean;
  grade_option_id: string;
  order: number;
}

interface Grade {
  id: string;
  value: string;
}

export default function Units() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    answer_type: 'subjective',
    formula_required: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchGrades();
  }, []);

  useEffect(() => {
    if (selectedGrade) {
      fetchUnits();
    }
  }, [selectedGrade]);

  const fetchGrades = async () => {
    try {
      const res = await fetch('/api/options?type=grade');
      const data = await res.json();
      if (data.success) {
        const gradeList = data.data || [];
        setGrades(gradeList);
        if (gradeList.length > 0) {
          setSelectedGrade(gradeList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch grades:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    if (!selectedGrade) return;
    try {
      const res = await fetch(`/api/admin/units?grade_option_id=${selectedGrade}`);
      const data = await res.json();
      if (data.success) {
        setUnits(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch units:', err);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          grade_option_id: selectedGrade,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('단원이 생성되었습니다.');
        setFormData({ name: '', answer_type: 'subjective', formula_required: true });
        setShowForm(false);
        fetchUnits();
      } else {
        setError(data.error || '단원 생성에 실패했습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
      console.error('Create unit error:', err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>단원 관리</h1>
        <button
          className={styles.createBtn}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ 닫기' : '+ 새 단원'}
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>로드 중...</div>
      ) : (
        <>
          <div className={styles.gradeSelector}>
            <label>학년 선택:</label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.value}
                </option>
              ))}
            </select>
          </div>

          {showForm && (
            <form className={styles.form} onSubmit={handleCreateUnit}>
              <div className={styles.formGroup}>
                <label>단원명</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>문제 유형</label>
                <select
                  value={formData.answer_type}
                  onChange={(e) =>
                    setFormData({ ...formData, answer_type: e.target.value })
                  }
                >
                  <option value="subjective">주관식</option>
                  <option value="objective">객관식</option>
                </select>
              </div>

              <div className={styles.checkboxGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.formula_required}
                    onChange={(e) =>
                      setFormData({ ...formData, formula_required: e.target.checked })
                    }
                  />
                  풀이 과정 필수
                </label>
              </div>

              {error && <div className={styles.error}>{error}</div>}
              {success && <div className={styles.success}>{success}</div>}

              <button type="submit" className={styles.submitBtn}>
                생성
              </button>
            </form>
          )}

          <div className={styles.unitsGrid}>
            {units.map((unit) => (
              <div key={unit.id} className={styles.unitCard}>
                <h3>{unit.name}</h3>
                <div className={styles.details}>
                  <div>
                    <strong>유형:</strong>
                    <span>
                      {unit.answer_type === 'subjective' ? '주관식' : '객관식'}
                    </span>
                  </div>
                  <div>
                    <strong>풀이 필수:</strong>
                    <span>{unit.formula_required ? '예' : '아니오'}</span>
                  </div>
                </div>
              </div>
            ))}
            {units.length === 0 && (
              <div className={styles.empty}>단원이 없습니다.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
