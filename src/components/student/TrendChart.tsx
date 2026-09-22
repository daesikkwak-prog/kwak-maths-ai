'use client';

import type { TrendPoint } from '@/types';
import styles from './TrendChart.module.css';

/** 시간에 따른 정답률 추이 (외부 차트 라이브러리 없이 인라인 SVG로 그린다) */
export default function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return <div className={styles.empty}>아직 추이를 그릴 기록이 없어요.</div>;
  }

  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 32, left: 40 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const x = (i: number) =>
    padding.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (rate: number) => padding.top + plotH - (rate / 100) * plotH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.correct_rate).toFixed(1)}`)
    .join(' ');

  // 라벨이 겹치지 않도록 최대 6개만 표시
  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className={styles.wrapper}>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg} role="img" aria-label="정답률 추이">
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tick)}
              y2={y(tick)}
              className={styles.grid}
            />
            <text x={padding.left - 8} y={y(tick) + 4} className={styles.axisLabel} textAnchor="end">
              {tick}
            </text>
          </g>
        ))}

        <path d={linePath} className={styles.line} fill="none" />

        {data.map((d, i) => (
          <g key={d.date}>
            <circle cx={x(i)} cy={y(d.correct_rate)} r={4} className={styles.dot}>
              <title>{`${d.date} · 정답률 ${d.correct_rate}% (${d.correct_problems}/${d.total_problems})`}</title>
            </circle>
            {i % labelStep === 0 && (
              <text x={x(i)} y={height - 10} className={styles.axisLabel} textAnchor="middle">
                {d.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
