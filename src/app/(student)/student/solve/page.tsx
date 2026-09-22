'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SolutionCanvas, { SolutionCanvasHandle } from '@/components/student/SolutionCanvas';
import ConfirmGiveUpModal from '@/components/student/ConfirmGiveUpModal';
import InProgressList from '@/components/student/InProgressList';
import { useSession } from '@/lib/hooks/useSession';
import { useStudySession } from '@/lib/hooks/useStudySession';
import { compressImage, fileToBase64, validateImageFile } from '@/lib/utils/image';
import { MAX_IMAGE_SIZE, MIN_ATTEMPTS_FOR_GIVE_UP, RESIZE_QUALITY, RESIZE_WIDTH } from '@/lib/constants';
import styles from './Solve.module.css';

interface AttemptResult {
  attempt_no: number;
  is_correct: boolean;
  issue_summary: string;
  final_solution_text: string | null;
  feedback: string;
  can_give_up: boolean;
}

type InputMode = 'canvas' | 'photo';

function SolvePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: sessionLoading } = useSession();

  const [problemId, setProblemId] = useState<string>(searchParams.get('problem_id') || '');
  const [problemText, setProblemText] = useState<string>('');
  const [problemSource, setProblemSource] = useState<string>('');
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [latest, setLatest] = useState<AttemptResult | null>(null);
  const [giveUpResult, setGiveUpResult] = useState<{ answer: string; explanation: string } | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>('canvas');
  const [loadingProblem, setLoadingProblem] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [givingUp, setGivingUp] = useState(false);
  const [showGiveUpModal, setShowGiveUpModal] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef<SolutionCanvasHandle>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const myProblemInputRef = useRef<HTMLInputElement>(null);

  // 문제풀이 화면에 머무는 동안을 학습 시간으로 기록
  useStudySession(!!user);

  const solved = latest?.is_correct || !!giveUpResult;
  const attemptCount = attempts.length;
  const canGiveUp = !solved && attemptCount >= MIN_ATTEMPTS_FOR_GIVE_UP;

  /** 문제 본문과 기존 시도 기록을 불러온다 (새로고침/링크 진입 대응) */
  const loadProblem = useCallback(async (id: string) => {
    setLoadingProblem(true);
    setError('');
    try {
      const [problemRes, attemptsRes] = await Promise.all([
        fetch(`/api/problems/${id}`),
        fetch(`/api/attempts?problem_id=${id}`),
      ]);

      const problemJson = await problemRes.json();
      const attemptsJson = await attemptsRes.json();

      if (!problemJson.success) {
        setError(problemJson.error || '문제를 불러오지 못했습니다.');
        return;
      }

      setProblemText(problemJson.data.problem_text || '');
      setProblemSource(problemJson.data.source || '');

      if (attemptsJson.success) {
        const list: AttemptResult[] = (attemptsJson.data || []).map((a: any) => ({
          attempt_no: a.attempt_no,
          is_correct: a.is_correct,
          issue_summary: a.issue_summary,
          final_solution_text: a.final_solution_text,
          feedback: '',
          can_give_up: false,
        }));
        setAttempts(list);
        const gaveUp = (attemptsJson.data || []).find((a: any) => a.gave_up);
        if (gaveUp) setGiveUpResult({ answer: '', explanation: '이미 포기한 문제입니다.' });
      }
    } catch {
      setError('문제를 불러오지 못했습니다.');
    } finally {
      setLoadingProblem(false);
    }
  }, []);

  useEffect(() => {
    if (problemId) loadProblem(problemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  const resetProblemState = () => {
    setAttempts([]);
    setLatest(null);
    setGiveUpResult(null);
    setError('');
    canvasRef.current?.clear();
  };

  /** "내 문제 풀기": 문제집 사진 → 문제 등록 */
  const handleMyProblemUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const invalid = validateImageFile(file, MAX_IMAGE_SIZE);
    if (invalid) {
      setError(invalid);
      return;
    }

    setLoadingProblem(true);
    setError('');
    try {
      const raw = await fileToBase64(file);
      const compressed = await compressImage(raw, RESIZE_WIDTH, RESIZE_QUALITY);

      const res = await fetch('/api/problems/from-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: compressed }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error || '문제 등록에 실패했습니다.');
        return;
      }

      resetProblemState();
      setProblemId(json.data.problem_id);
      setProblemText(json.data.problem_text);
      setProblemSource(json.data.source);
      router.replace(`/student/solve?problem_id=${json.data.problem_id}`);
    } catch {
      setError('문제 등록에 실패했습니다.');
    } finally {
      setLoadingProblem(false);
    }
  };

  const submitImage = async (imageBase64: string) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: problemId, image_base64: imageBase64 }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error || '채점에 실패했습니다.');
        return;
      }

      const result: AttemptResult = json.data;
      setAttempts((prev) => [...prev, result]);
      setLatest(result);
      canvasRef.current?.clear();
    } catch {
      setError('채점에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCanvasSubmit = async () => {
    const dataUrl = canvasRef.current?.toDataURL();
    if (!dataUrl) {
      setError('풀이를 먼저 작성해주세요.');
      return;
    }
    const compressed = await compressImage(dataUrl, RESIZE_WIDTH, RESIZE_QUALITY);
    await submitImage(compressed);
  };

  const handlePhotoSubmit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const invalid = validateImageFile(file, MAX_IMAGE_SIZE);
    if (invalid) {
      setError(invalid);
      return;
    }

    const raw = await fileToBase64(file);
    const compressed = await compressImage(raw, RESIZE_WIDTH, RESIZE_QUALITY);
    await submitImage(compressed);
  };

  const handleGiveUp = async () => {
    setGivingUp(true);
    try {
      const res = await fetch(`/api/problems/${problemId}/give-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error || '포기 처리에 실패했습니다.');
        return;
      }

      setGiveUpResult({ answer: json.data.answer, explanation: json.data.explanation });
      setShowGiveUpModal(false);
    } catch {
      setError('포기 처리에 실패했습니다.');
    } finally {
      setGivingUp(false);
    }
  };

  if (sessionLoading) {
    return <div className={styles.container}>로드 중...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <h1>✏️ 문제풀이</h1>
        <div className={styles.topActions}>
          <input
            ref={myProblemInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleMyProblemUpload}
          />
          <button
            className={styles.btnSecondary}
            onClick={() => myProblemInputRef.current?.click()}
            disabled={loadingProblem}
          >
            📷 내 문제 풀기
          </button>
          <button className={styles.btnSecondary} onClick={() => router.push('/student/bank')}>
            📚 문제은행
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {!problemId ? (
        <>
          <div className={styles.emptyState}>
            <p>풀 문제가 없어요.</p>
            <p className={styles.emptyHint}>
              문제은행에서 새 문제를 받거나, 문제집 사진을 올려 &quot;내 문제 풀기&quot;를 시작하세요.
            </p>
          </div>
          <InProgressList />
        </>
      ) : loadingProblem ? (
        <div className={styles.emptyState}>문제를 불러오는 중...</div>
      ) : (
        <>
          <section className={styles.problemCard}>
            <div className={styles.problemHeader}>
              <span className={styles.badge}>
                {problemSource === 'user_uploaded' ? '내 문제' : 'AI 출제'}
              </span>
              <span className={styles.attemptCount}>시도 {attemptCount}회</span>
            </div>
            <p className={styles.problemText}>{problemText}</p>
          </section>

          {!solved && (
            <section className={styles.solveCard}>
              <div className={styles.tabs}>
                <button
                  className={inputMode === 'canvas' ? styles.tabActive : styles.tab}
                  onClick={() => setInputMode('canvas')}
                >
                  ✏️ 직접 쓰기
                </button>
                <button
                  className={inputMode === 'photo' ? styles.tabActive : styles.tab}
                  onClick={() => setInputMode('photo')}
                >
                  📷 사진 올리기
                </button>
              </div>

              {inputMode === 'canvas' ? (
                <>
                  <SolutionCanvas ref={canvasRef} />
                  <button
                    className={styles.btn}
                    onClick={handleCanvasSubmit}
                    disabled={submitting}
                  >
                    {submitting ? 'AI가 채점 중...' : '풀이 제출하기'}
                  </button>
                </>
              ) : (
                <div className={styles.uploadArea}>
                  <p>풀이를 촬영한 사진을 올려주세요</p>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handlePhotoSubmit}
                  />
                  <button
                    className={styles.btn}
                    onClick={() => photoInputRef.current?.click()}
                    disabled={submitting}
                  >
                    {submitting ? 'AI가 채점 중...' : '📷 사진 선택'}
                  </button>
                </div>
              )}

              <p className={styles.notice}>
                제출한 이미지는 저장하지 않고, AI 분석 결과만 기록으로 남아요.
              </p>
            </section>
          )}

          {latest && (
            <section
              className={latest.is_correct ? styles.feedbackCorrect : styles.feedbackCard}
            >
              <h2>{latest.is_correct ? '🎉 정답이에요!' : '🤔 다시 한번 볼까요?'}</h2>
              <p className={styles.feedbackText}>{latest.feedback}</p>
              {latest.is_correct && latest.final_solution_text && (
                <div className={styles.solutionBox}>
                  <strong>내가 쓴 풀이</strong>
                  <p>{latest.final_solution_text}</p>
                </div>
              )}
            </section>
          )}

          {giveUpResult && (
            <section className={styles.giveUpCard}>
              <h2>📖 정답과 풀이</h2>
              {giveUpResult.answer && (
                <p className={styles.answerLine}>
                  <strong>정답:</strong> {giveUpResult.answer}
                </p>
              )}
              <p className={styles.feedbackText}>{giveUpResult.explanation}</p>
            </section>
          )}

          {attempts.length > 0 && (
            <section className={styles.historyCard}>
              <h3>시도 기록</h3>
              <ol className={styles.historyList}>
                {attempts.map((a) => (
                  <li key={a.attempt_no}>
                    <span className={styles.historyNo}>{a.attempt_no}차</span>
                    <span>{a.issue_summary}</span>
                    {a.is_correct && <span className={styles.correctTag}>정답</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className={styles.bottomActions}>
            {solved ? (
              <button className={styles.btn} onClick={() => router.push('/student/bank')}>
                다음 문제 풀기
              </button>
            ) : (
              <button
                className={styles.giveUpBtn}
                onClick={() => setShowGiveUpModal(true)}
                disabled={!canGiveUp}
                title={
                  canGiveUp
                    ? ''
                    : `${MIN_ATTEMPTS_FOR_GIVE_UP}회 이상 시도해야 포기할 수 있어요`
                }
              >
                포기하기
                {!canGiveUp && ` (${attemptCount}/${MIN_ATTEMPTS_FOR_GIVE_UP}회)`}
              </button>
            )}
          </div>
        </>
      )}

      <ConfirmGiveUpModal
        open={showGiveUpModal}
        loading={givingUp}
        onConfirm={handleGiveUp}
        onCancel={() => setShowGiveUpModal(false)}
      />
    </div>
  );
}

export default function SolvePage() {
  return (
    <Suspense fallback={<div>로드 중...</div>}>
      <SolvePageInner />
    </Suspense>
  );
}
