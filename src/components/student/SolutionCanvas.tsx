'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import styles from './SolutionCanvas.module.css';

export interface SolutionCanvasHandle {
  /** 현재 캔버스를 JPEG data URL로 변환. 아무것도 안 그렸으면 null. */
  toDataURL: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface Stroke {
  points: { x: number; y: number }[];
  width: number;
}

/**
 * 갤럭시탭 + S펜 입력을 위한 필기 캔버스.
 * Pointer Events를 사용해 펜/손가락/마우스를 모두 지원하고, 펜 필압을 선 굵기에 반영한다.
 */
const SolutionCanvas = forwardRef<SolutionCanvasHandle, { height?: number }>(
  function SolutionCanvas({ height = 420 }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strokesRef = useRef<Stroke[]>([]);
    const currentRef = useRef<Stroke | null>(null);
    const [strokeCount, setStrokeCount] = useState(0);

    /** 캔버스를 컨테이너 너비에 맞추고 기존 획을 다시 그린다. */
    const redraw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // AI에 보낼 이미지이므로 배경은 흰색으로 채운다 (투명은 검게 인식됨)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);

      ctx.strokeStyle = '#1a1a1a';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const stroke of strokesRef.current) {
        if (stroke.points.length === 0) continue;
        ctx.lineWidth = stroke.width;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (const point of stroke.points.slice(1)) {
          ctx.lineTo(point.x, point.y);
        }
        if (stroke.points.length === 1) {
          ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y);
        }
        ctx.stroke();
      }
    };

    useEffect(() => {
      redraw();
      window.addEventListener('resize', redraw);
      return () => window.removeEventListener('resize', redraw);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      // 펜은 필압(0~1)에 따라, 그 외 입력은 고정 굵기
      const width = e.pointerType === 'pen' ? 1 + e.pressure * 4 : 2.5;
      currentRef.current = { points: [getPoint(e)], width };
      strokesRef.current.push(currentRef.current);
      redraw();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!currentRef.current) return;
      currentRef.current.points.push(getPoint(e));
      redraw();
    };

    const handlePointerUp = () => {
      if (!currentRef.current) return;
      currentRef.current = null;
      setStrokeCount(strokesRef.current.length);
    };

    const undo = () => {
      strokesRef.current.pop();
      setStrokeCount(strokesRef.current.length);
      redraw();
    };

    const clear = () => {
      strokesRef.current = [];
      setStrokeCount(0);
      redraw();
    };

    useImperativeHandle(ref, () => ({
      toDataURL: () => {
        const canvas = canvasRef.current;
        if (!canvas || strokesRef.current.length === 0) return null;
        return canvas.toDataURL('image/jpeg', 0.8);
      },
      clear,
      isEmpty: () => strokesRef.current.length === 0,
    }));

    return (
      <div className={styles.wrapper}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{ height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <div className={styles.tools}>
          <span className={styles.hint}>✏️ S펜이나 손가락으로 풀이를 쓰세요</span>
          <div className={styles.buttons}>
            <button type="button" onClick={undo} disabled={strokeCount === 0}>
              ↩️ 되돌리기
            </button>
            <button type="button" onClick={clear} disabled={strokeCount === 0}>
              🧹 전체 지우기
            </button>
          </div>
        </div>
      </div>
    );
  }
);

export default SolutionCanvas;
