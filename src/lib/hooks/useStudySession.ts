'use client';

import { useEffect } from 'react';

/**
 * 학습 시간 측정. 화면 진입 시 세션을 시작하고, 이탈/탭 전환 시 종료한다.
 * 종료 요청은 페이지가 닫히는 중에도 전달되도록 sendBeacon을 사용한다.
 */
export function useStudySession(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const start = () => fetch('/api/study-sessions/start', { method: 'POST' });

    const end = () => {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/study-sessions/end', new Blob([], { type: 'application/json' }));
      } else {
        fetch('/api/study-sessions/end', { method: 'POST', keepalive: true });
      }
    };

    start();

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        end();
      } else if (active) {
        start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', end);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', end);
      end();
    };
  }, [enabled]);
}
