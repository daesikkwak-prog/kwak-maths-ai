'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SolutionCanvas, { SolutionCanvasHandle } from '@/components/student/SolutionCanvas';
import ConfirmGiveUpModal from '@/components/student/ConfirmGiveUpModal';
import InProgressList from '@/components/student/InProgressList';
import ProblemFigure from '@/components/student/ProblemFigure';
import { useSession } from '@/lib/hooks/useSession';
import { useStudySession } from '@/lib/hooks/useStudySession';
import { useElapsedSeconds } from '@/lib/hooks/useElapsedSeconds';
import { postJson } from '@/lib/api/request';
import { compressImage, fileToBase64, validateImageFile } from '@/lib/utils/image';
import { toReadableMath } from '@/lib/utils/math-text';
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

/** 같은 유형으로 다시 출제할 때 필요한 문제의 출제 조건 */
interface ProblemMeta {
  grade_option_id: string | null;
  unit_id: string | null;
  difficulty_option_id: string | null;
  grade_label: string;
  unit_label: string;
  difficulty_label: string;
}

type InputMode = 'canvas' | 'photo';

const emptyMeta: ProblemMeta = {
  grade_option_id: null,
  unit_id: null,
  difficulty_option_id: null,
  grade_label: '',
  unit_label: '',
  difficulty_label: '',
};

function SolvePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: sessionLoading } = useSession();

  const [problemId, setProblemId] = useState<string>(searchParams.get('problem_id') || '');
  const [problemText, setProblemText] = useState<string>('');
  const [problemFigure, setProblemFigure] = useState<string>('');
  const [problemSource, setProblemSource] = useState<string>('');
  const [problemMeta, setProblemMeta] = useState<ProblemMeta>(emptyMeta);
  const [boosted, setBoosted] = useState(searchParams.get('boost') === '1');
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [latest, setLatest] = useState<AttemptResult | null>(null);
  const [giveUpResult, setGiveUpResult] = useState<{ answer: string; explanation: string } | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>('canvas');
  const [loadingProblem, setLoadingProblem] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [givingUp, setGivingUp] = useState(false);
  const [showGiveUpModal, setShowGiveUpModal] = useState(false);
  const [error, setError] = useState('');

  const waiting = generatingNext || submitting || givingUp || loadingProblem;
  const elapsed = useElapsedSeconds(waiting);

  const canvasRef = useRef<SolutionCanvasHandle>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const myProblemInputRef = useRef<HTMLInputElement>(null);

  // 문제풀이 화면에 머무는 동안을 학습 시간으로 기록
  useStudySession(!!user);

  const solved = latest?.is_correct || !!giveUpResult;
  const attemptCount = attempts.length;
  const canGiveUp = !solved && attemptCount >= MIN_ATTEMPTS_FOR_GIVE_UP;
  // AI 출제 문제만 같은 조건으로 다시 출제할 수 있다 (내 문제 풀기는 조건이 없음)
  const canRepeatType = !!problemMeta.grade_option_id && !!problemMeta.difficulty_option_id;
  const typeLabel = [problemMeta.grade_label, problemMeta.unit_label, problemMeta.difficulty_label]
    .filter(Boolean)
    .join(' · ');

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
      setProblemFigure(problemJson.data.figure_svg || '');
      setProblemSource(problemJson.data.source || '');
      setProblemMeta({
        grade_option_id: problemJson.data.grade_option_id ?? null,
        unit_id: problemJson.data.unit_id ?? null,
        difficulty_option_id: problemJson.data.difficulty_option_id ?? null,
        grade_label: problemJson.data.grade_label || '',
        unit_label: problemJson.data.unit_label || '',
        difficulty_label: problemJson.data.difficulty_label || '',
      });

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
    setProblemFigure('');
    setProblemMeta(emptyMeta);
    setError('');
    canvasRef.current?.clear();
  };

  /** "다음 문제": 방금 푼 문제와 같은 조건(학년·단원·난이도)으로 바로 다시 출제 */
  const handleNextProblem = async () => {
    if (!canRepeatType) {
      router.push('/student/bank');
      return;
    }

    setGeneratingNext(true);
    setError('');
    try {
      const json = await postJson('/api/problems/generate', {
        grade_option_id: problemMeta.grade_option_id,
        unit_id: problemMeta.unit_id,
        difficulty_option_id: problemMeta.difficulty_option_id,
      });

      if (!json.success) {
        setError(json.error || '다음 문제를 만들지 못했습니다.');
        return;
      }

      resetProblemState();
      setBoosted(!!json.data.targeted_weakness);
      setProblemId(json.data.problem_id);
      router.replace(
        `/student/solve?problem_id=${json.data.problem_id}${json.data.targeted_weakness ? '&boost=1' : ''}`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setGeneratingNext(false);
    }
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

      const json = await postJson('/api/problems/from-image', { image_base64: compressed });

      if (!json.success) {
        setError(json.error || '문제 등록에 실패했습니다.');
        return;
      }

      resetProblemState();
      setBoosted(false);
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
      const json = await postJson('/api/attempts', {
        problem_id: problemId,
        image_base64: imageBase64,
      });

      if (!json.success) {
        setError(json.error || '채점에 실패했습니다.');
        return;
      }

      const result: AttemptResult = json.data;
      setAttempts((prev) => [...prev, result]);
      setLatest(result);
      canvasRef.current?.clear();
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
      const json = await postJson(`/api/problems/${problemId}/give-up`, {});

      if (!json.success) {
        setError(json.error || '포기 처리에 실패했습니다.');
        return;
      }

      setGiveUpResult({ answer: json.data.answer, explanation: json.data.explanation });
      setShowGiveUpModal(false);
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
            disabled={loadingProblem || generatingNext}
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
      ) : loadingProblem || generatingNext ? (
        <div className={styles.emptyState}>
          {generatingNext ? (
            <>
              <p>AI가 다음 문제를 만드는 중... {elapsed}초</p>
              <p className={styles.emptyHint}>
                문제와 그림을 함께 만드느라 20~40초쯤 걸려요.
              </p>
            </>
          ) : (
            '문제를 불러오는 중...'
          )}
        </div>
      ) : (
        <>
          <section className={styles.problemCard}>
            <div className={styles.problemHeader}>
              <span className={styles.badge}>
                {problemSource === 'user_uploaded' ? '내 문제' : 'AI 출제'}
              </span>
              <span className={styles.attemptCount}>시도 {attemptCount}회</span>
            </div>
            {typeLabel && <p className={styles.typeLabel}>{typeLabel}</p>}
            {boosted && (
              <p className={styles.boostNotice}>
                🎯 아직 어려워하는 유형이라 비슷한 문제로 한 번 더 연습해요
              </p>
            )}
            <p className={styles.problemText}>{toReadableMath(problemText)}</p>
            <ProblemFigure svg={problemFigure} />
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
                    {submitting ? `AI가 채점 중... ${elapsed}초` : '풀이 제출하기'}
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
                    {submitting ? `AI가 채점 중... ${elapsed}초` : '📷 사진 선택'}
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
              <p className={styles.feedbackText}>{toReadableMath(latest.feedback)}</p>
              {latest.is_correct && latest.final_solution_text && (
                <div className={styles.solutionBox}>
                  <strong>내가 쓴 풀이</strong>
                  <p>{toReadableMath(latest.final_solution_text)}</p>
                </div>
              )}
            </section>
          )}

          {giveUpResult && (
            <section className={styles.giveUpCard}>
              <h2>📖 정답과 풀이</h2>
              {giveUpResult.answer && (
                <p className={styles.answerLine}>
                  <strong>정답:</strong> {toReadableMath(giveUpResult.answer)}
                </p>
              )}
              <p className={styles.feedbackText}>{toReadableMath(giveUpResult.explanation)}</p>
            </section>
          )}

          {attempts.length > 0 && (
            <section className={styles.historyCard}>
              <h3>시도 기록</h3>
              <ol className={styles.historyList}>
                {attempts.map((a) => (
                  <li key={a.attempt_no}>
                    <span className={styles.historyNo}>{a.attempt_no}차</span>
                    <span>{toReadableMath(a.issue_summary)}</span>
                    {a.is_correct && <span className={styles.correctTag}>정답</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className={styles.bottomActions}>
            {solved ? (
              <div className={styles.nextRow}>
                <button
                  className={styles.btn}
                  onClick={handleNextProblem}
                  disabled={generatingNext}
                >
                  {generatingNext
                    ? `AI가 다음 문제를 만드는 중... ${elapsed}초`
                    : canRepeatType
                      ? '➡️ 같은 유형 다음 문제'
                      : '다음 문제 풀기'}
                </button>
                {canRepeatType && (
                  <button
                    className={styles.btnSecondary}
                    onClick={() => router.push('/student/bank')}
                    disabled={generatingNext}
                  >
                    📚 다른 유형 고르기
                  </button>
                )}
              </div>
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
