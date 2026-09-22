import Link from 'next/link';
import LogoutButton from '@/components/common/LogoutButton';
import styles from './StudentLayout.module.css';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>📚 수학 학습 도우미</h1>
        </div>
        <nav className={styles.nav}>
          <Link href="/student/solve" className={styles.navItem}>
            문제풀이
          </Link>
          <Link href="/student/bank" className={styles.navItem}>
            문제은행
          </Link>
          <Link href="/student/stats" className={styles.navItem}>
            공부기록
          </Link>
          <LogoutButton className={styles.logout} />
        </nav>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
