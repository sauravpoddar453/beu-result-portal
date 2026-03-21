import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './Providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'BEU Result 2025 | Check Bihar Engineering University BTech Results Online',
  description: 'Check BEU Result 2025 online. Fast and easy Bihar Engineering University result portal to check BTech semester results, SGPA and CGPA.',
  keywords: 'BEU Result, BEU BTech Result, Bihar Engineering University Result, BEU Result Portal, BEU Result 2025',
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
