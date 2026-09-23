'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import InProgressList from '@/components/student/InProgressList';
import { useSession } from '@/lib/hooks/useSession';
import { WEAKNESS_RATE_THRESHOLD } from '@/lib/problems/weakness';
import styles from './Bank.module.css';

interface Option {
  id: string;
  value: string;
}

interface Unit {
  id: string;
  name: string;
  answer_type: string;
  formula_required: boolean;
  /** 이 단원에서 한 번에 맞힌 비율(%) — 완료 문제가 적으면 null */
  correct_rate: number | null;
  completed_problems: number;
  /** true면 비슷한 유형으로 보강 출제된다 */
  is_weak: boolean;
}

export default function ProblemBank() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [grades, setGrades] = useState<Option[]>([]);
  const [difficulties, setDifficulties] = useState<Option[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [gradeId, setGradeId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [difficultyId, setDifficultyId] = useState('');

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [gradeRes, diffRes] = await Promise.all([
        fetch('/api/options?type=grade'),
        fetch('/api/options?type=difficulty'),
      ]);
      const gradeJson = await gradeRes.json();
      const diffJson = await diffRes.json();

      if (gradeJson.success) setGrades(gradeJson.data || []);
      if (diffJson.success) setDifficulties(diffJson.data || []);
    })();
  }, []);

  // 학생 프로필의 학년을 기본값으로 선택 (변경 가능)
  useEffect(() => {
    if (!user || grades.length === 0 || gradeId) return;
    const myGrade = `${user.school_level}${user.grade}`;
    const matched = grades.find((g) => g.value === myGrade);
    if (matched) setGradeId(matched.id);
  }, [user, grades, gradeId]);

  const loadUnits = useCallback(async (selectedGradeId: string) => {
    const res = await fetch(`/api/units?grade_option_id=${selectedGradeId}`);
    const json = await res.json();
    setUnits(json.success ? json.data || [] : []);
  }, []);

  useEffect(() => {
    if (gradeId) {
      loadUnits(gradeId);
      setUnitId('');
    } else {
      setUnits([]);
    }
  }, [gradeId, loadUnits]);

  const handleGenerate = async () => {
    if (!gradeId || !difficultyId) {
      setError('학년과 난이도를 선택해주세요.');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/problems/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade_option_id: gradeId,
          unit_id: unitId || null,
          difficulty_option_id: difficultyId,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error || '문제 생성에 실패했습니다.');
        return;
      }

      router.push(
        `/student/solve?problem_id=${json.data.problem_id}${json.data.targeted_weakness ? '&boost=1' : ''}`
      );
    } catch {
      setError('문제 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  if (sessionLoading) return <div className={styles.container}>로드 중...</div>;

  const selectedUnit = units.find((u) => u.id === unitId);

  return (
    <div className={styles.container}>
      <h1>📚 문제은행</h1>
      <p className={styles.subtitle}>조건을 고르면 AI가 새 문제를 만들어줘요</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.inProgress}>
        <InProgressList />
      </div>

      <div className={styles.card}>
        <div className={styles.field}>
          <label>학년</label>
          <select value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
            <option value="">선택하세요</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>
                {g.value}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label>단원</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            disabled={!gradeId}
          >
            <option value="">{units.length ? '학년 전체 범위' : '등록된 단원 없음'}</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.correct_rate !== null ? ` (정답률 ${u.correct_rate}%)` : ''}
                {u.is_weak ? ' 🎯' : ''}
              </option>
            ))}
          </select>
          {selectedUnit && (
            <span className={styles.unitHint}>
              {selectedUnit.answer_type === 'objective' ? '객관식' : '주관식'} ·{' '}
              {selectedUnit.formula_required ? '풀이 과정 필수' : '답만 써도 인정'}
            </span>
          )}
          {selectedUnit?.is_weak && (
            <span className={styles.weakHint}>
              🎯 이 유형은 한 번에 맞힌 비율이 {selectedUnit.correct_rate}%예요. {WEAKNESS_RATE_THRESHOLD}%가
              될 때까지 틀렸던 문제와 비슷한 유형으로 출제돼요.
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label>난이도</label>
          <div className={styles.difficultyRow}>
            {difficulties.map((d) => (
              <button
                key={d.id}
                type="button"
                className={d.id === difficultyId ? styles.difficultyActive : styles.difficulty}
                onClick={() => setDifficultyId(d.id)}
              >
                {d.value}
              </button>
            ))}
          </div>
        </div>

        <button className={styles.generateBtn} onClick={handleGenerate} disabled={generating}>
          {generating ? 'AI가 문제를 만드는 중...' : '문제 받기'}
        </button>
      </div>
    </div>
  );
}
