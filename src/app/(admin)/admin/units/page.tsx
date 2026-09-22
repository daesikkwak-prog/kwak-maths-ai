'use client';

import { useCallback, useEffect, useState } from 'react';
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

const emptyForm = {
  name: '',
  answer_type: 'subjective',
  formula_required: true,
  order: 1,
};

export default function Units() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  /** 수정 중인 단원 id. null이면 새 단원 등록 모드. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/options?type=grade');
        const json = await res.json();
        if (json.success) {
          const list: Grade[] = json.data || [];
          setGrades(list);
          if (list.length > 0) setSelectedGrade(list[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fetchUnits = useCallback(async () => {
    if (!selectedGrade) return;
    const res = await fetch(`/api/admin/units?grade_option_id=${selectedGrade}`);
    const json = await res.json();
    if (json.success) setUnits(json.data || []);
  }, [selectedGrade]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const startCreate = () => {
    setEditingId(null);
    setFormData({ ...emptyForm, order: units.length + 1 });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const startEdit = (unit: Unit) => {
    setEditingId(unit.id);
    setFormData({
      name: unit.name,
      answer_type: unit.answer_type,
      formula_required: unit.formula_required,
      order: unit.order,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch(
        editingId ? `/api/admin/units/${editingId}` : '/api/admin/units',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            editingId ? formData : { ...formData, grade_option_id: selectedGrade }
          ),
        }
      );
      const json = await res.json();

      if (json.success) {
        setSuccess(editingId ? '단원이 수정되었습니다.' : '단원이 생성되었습니다.');
        closeForm();
        fetchUnits();
      } else {
        setError(json.error || '처리에 실패했습니다.');
      }
    } catch {
      setError('서버 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  /** 소프트 삭제 — 이 단원으로 출제된 기존 문제/통계는 그대로 유지된다. */
  const handleDelete = async (unit: Unit) => {
    if (!window.confirm(`'${unit.name}' 단원을 삭제할까요? (기존 문제 기록은 유지됩니다)`)) {
      return;
    }

    setError('');
    setSuccess('');

    const res = await fetch(`/api/admin/units/${unit.id}`, { method: 'DELETE' });
    const json = await res.json();

    if (json.success) {
      setSuccess(`'${unit.name}' 단원이 삭제되었습니다.`);
      if (editingId === unit.id) closeForm();
      fetchUnits();
    } else {
      setError(json.error || '삭제에 실패했습니다.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>단원 관리</h1>
        <button className={styles.createBtn} onClick={showForm ? closeForm : startCreate}>
          {showForm ? '✕ 닫기' : '+ 새 단원'}
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>로드 중...</div>
      ) : (
        <>
          <div className={styles.gradeSelector}>
            <label>학년 선택:</label>
            <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.value}
                </option>
              ))}
            </select>
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          {showForm && (
            <form className={styles.form} onSubmit={handleSubmit}>
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
                  onChange={(e) => setFormData({ ...formData, answer_type: e.target.value })}
                >
                  <option value="subjective">주관식</option>
                  <option value="objective">객관식</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>표시 순서</label>
                <input
                  type="number"
                  min={1}
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                />
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

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? '처리 중...' : editingId ? '수정' : '생성'}
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
                    <span>{unit.answer_type === 'subjective' ? '주관식' : '객관식'}</span>
                  </div>
                  <div>
                    <strong>풀이 필수:</strong>
                    <span>{unit.formula_required ? '예' : '아니오'}</span>
                  </div>
                  <div>
                    <strong>순서:</strong>
                    <span>{unit.order}</span>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button onClick={() => startEdit(unit)}>수정</button>
                  <button className={styles.danger} onClick={() => handleDelete(unit)}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
            {units.length === 0 && <div className={styles.empty}>단원이 없습니다.</div>}
          </div>
        </>
      )}
    </div>
  );
}
