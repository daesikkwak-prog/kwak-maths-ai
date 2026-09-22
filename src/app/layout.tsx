import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '수학 학습 도우미 - AI 과외',
  description: '초/중/고 학생 대상 AI 수학 문제풀이 학습 웹앱',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
