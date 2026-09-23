'use client';

import { useEffect, useState } from 'react';

/** 오래 걸리는 AI 호출 동안 경과 초를 세어 화면이 멈춘 것처럼 보이지 않게 한다. */
export function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      setSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [active]);

  return seconds;
}
