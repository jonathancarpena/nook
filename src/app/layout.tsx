import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'The Halloween Games — 24 enter. Only one survives.',
    template: '%s · The Halloween Games',
  },
  description:
    'A night of mystery, mayhem, and a little friendly betrayal. Four rounds. Twenty-four contestants. One Halloween champion.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
