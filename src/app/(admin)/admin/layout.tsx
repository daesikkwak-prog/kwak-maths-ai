import Link from 'next/link';
import styles from './AdminLayout.module.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <h1>관리자</h1>
          <p>Math AI</p>
        </div>

        <nav className={styles.nav}>
          <Link href="/admin" className={styles.navItem}>
            📊 대시보드
          </Link>
          <Link href="/admin/ai-rules" className={styles.navItem}>
            🤖 AI 규칙 관리
          </Link>
          <Link href="/admin/users" className={styles.navItem}>
            👥 사용자 관리
          </Link>
          <Link href="/admin/units" className={styles.navItem}>
            📚 단원 관리
          </Link>
          <Link href="/admin/students" className={styles.navItem}>
            📈 학생 기록
          </Link>
        </nav>

        <div className={styles.footer}>
          <Link href="/" className={styles.logout}>
            🚪 로그아웃
          </Link>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
