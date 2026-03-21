import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './Providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'BEU Result | Bihar Engineering University Result Portal',
  description: 'Check BEU Result 2026 for all semesters. Bihar Engineering University ke sabhi results yaha check kare. Fast result portal.',
  keywords: 'BEU Result, BEU result 2026, Bihar Engineering University, BEU BTech Result, BEU Result Portal, BEU 2026 Result',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-595LTKF6LG"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-595LTKF6LG');
          `,
        }}
      />
      <body className={`antialiased`}>
        <Providers>
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-dark-800)',
                color: 'var(--text-main)',
                border: '1px solid var(--glass-border)',
              },
            }}
          />
          {children}
        </Providers>
      </body>
    </html>
  );
}
