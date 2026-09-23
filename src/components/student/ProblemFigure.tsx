'use client';

import { sanitizeSvg } from '@/lib/utils/svg';
import styles from './ProblemFigure.module.css';

/**
 * 문제에 딸린 그림(SVG)을 보여준다.
 * 서버에서 한 번 걸러 저장하지만, 그리는 시점에도 한 번 더 정리해 안전하게 넣는다.
 */
export default function ProblemFigure({ svg }: { svg: string | null | undefined }) {
  const safe = sanitizeSvg(svg);
  if (!safe) return null;

  return (
    <div className={styles.figure} role="img" aria-label="문제 그림">
      <div dangerouslySetInnerHTML={{ __html: safe }} />
    </div>
  );
}
