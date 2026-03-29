// app/layout.tsx
import type { Metadata } from 'next';
import { DM_Sans, DM_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'BetongGold AI — KI-Immobilienberater',
  description: 'Professionelle KI-gestützte Immobilienanalyse mit Finanzierung, Business Plan, KPI-Dashboard und Portfolio-Management.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'BetongGold AI — KI-Immobilienberater',
    description: 'Professionelle KI-gestützte Immobilienanalyse mit Finanzierung, Business Plan, KPI-Dashboard und Portfolio-Management.',
    type: 'website',
    locale: 'de_DE',
    siteName: 'BetongGold AI',
  },
  twitter: {
    card: 'summary',
    title: 'BetongGold AI — KI-Immobilienberater',
    description: 'Professionelle KI-gestützte Immobilienanalyse für den deutschen Markt.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${dmSans.variable} ${dmMono.variable} ${playfair.variable}`}>
      <body className="bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}
