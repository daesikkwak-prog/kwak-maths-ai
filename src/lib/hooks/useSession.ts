'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SchoolLevel, UserRole } from '@/types';

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
  school_level: SchoolLevel;
  grade: number;
  my_problem_formula_required: boolean;
}

/** 현재 로그인 사용자. 세션이 없으면 로그인 화면으로 보낸다. */
export function useSession() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (cancelled) return;

        if (json.success) {
          setUser(json.data);
        } else {
          router.replace('/');
        }
      } catch {
        if (!cancelled) router.replace('/');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, loading };
}
