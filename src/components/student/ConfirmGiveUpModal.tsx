'use client';

import styles from './ConfirmGiveUpModal.module.css';

interface Props {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 포기 확인 모달 — "예"를 눌러야만 포기가 처리된다. */
export default function ConfirmGiveUpModal({ open, loading, onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.icon}>💪</div>
        <h2 className={styles.title}>넌 아직 할 수 있어. 정말 포기할거야?</h2>
        <p className={styles.desc}>
          포기하면 정답과 풀이를 보여주고, 이 문제는 &quot;포기한 문제&quot;로 기록돼요.
        </p>
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onCancel} disabled={loading}>
            아니오, 더 풀어볼래요
          </button>
          <button className={styles.confirm} onClick={onConfirm} disabled={loading}>
            {loading ? '처리 중...' : '예, 포기할래요'}
          </button>
        </div>
      </div>
    </div>
  );
}
