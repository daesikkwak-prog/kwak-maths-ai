'use client';

import { useEffect, useState, useRef } from 'react';
import styles from './Solve.module.css';

export default function SolveProblems() {
  const [step, setStep] = useState<'select' | 'solve' | 'result'>('select');
  const [problemId, setProblemId] = useState<string>('');
  const [grades, setGrades] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
        setGrades(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch grades:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await fetch(`/api/units?grade_option_id=${selectedGrade}`);
      const data = await res.json();
      if (data.success) {
        setUnits(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch units:', err);
    }
  };

  const handleGenerateProblem = async () => {
    if (!selectedGrade || !selectedDifficulty) {
      alert('학년과 난이도를 선택하세요.');
      return;
    }

    setUploading(true);
    try {
      const res = await fetch('/api/problems/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade_option_id: selectedGrade,
          unit_id: selectedUnit || null,
          difficulty_option_id: selectedDifficulty,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProblemId(data.data.problem_id);
        setAttempts([]);
        setStep('solve');
      }
    } catch (err) {
      alert('문제 생성에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const res = await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: 'test-student-001', // TODO: Replace with actual user ID
            problem_id: problemId,
            image_base64: base64,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setAttempts([...attempts, data.data]);
          setResult(data.data);
          setStep('result');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('이미지 제출에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      {step === 'select' && (
        <div className={styles.selectStep}>
          <h1>문제 선택</h1>
          <div className={styles.grid}>
            <div>
              <label>학년</label>
              <select
                value={selectedGrade}
                onChange={(e) => {
                  setSelectedGrade(e.target.value);
                  setSelectedUnit('');
                }}
              >
                <option value="">선택하세요</option>
                {grades.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.value}
                  </option>
                ))}
              </select>
            </div>

            {units.length > 0 && (
              <div>
                <label>단원 (선택)</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                >
                  <option value="">전체</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label>난이도</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="">선택하세요</option>
                <option value="하">하</option>
                <option value="중">중</option>
                <option value="상">상</option>
              </select>
            </div>
          </div>

          <button
            className={styles.btn}
            onClick={handleGenerateProblem}
            disabled={uploading}
          >
            {uploading ? '생성 중...' : '문제 생성'}
          </button>
        </div>
      )}

      {step === 'solve' && (
        <div className={styles.solveStep}>
          <h1>풀이 제출</h1>
          <div className={styles.uploadArea}>
            <p>📸 풀이 이미지를 제출하세요</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadImage}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <button
              className={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '제출 중...' : '📷 사진 업로드'}
            </button>
          </div>

          {attempts.length > 0 && (
            <div className={styles.attempts}>
              <h3>시도 기록</h3>
              {attempts.map((attempt, idx) => (
                <div key={idx} className={styles.attemptCard}>
                  <strong>시도 {idx + 1}:</strong>
                  <p>{attempt.issue_summary}</p>
                  {attempt.is_correct && (
                    <span className={styles.correct}>✅ 정답</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'result' && result && (
        <div className={styles.resultStep}>
          <h1>{result.is_correct ? '🎉 정답입니다!' : '다시 풀어보세요'}</h1>
          <div className={styles.resultCard}>
            <p><strong>피드백:</strong> {result.feedback}</p>
            {result.is_correct && (
              <p><strong>풀이:</strong> {result.final_solution_text}</p>
            )}
          </div>

          <div className={styles.actions}>
            <button
              className={styles.btn}
              onClick={() => setStep('select')}
            >
              다른 문제 풀기
            </button>
            {!result.is_correct && (
              <button
                className={styles.btnSecondary}
                onClick={() => setStep('solve')}
              >
                다시 제출
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
