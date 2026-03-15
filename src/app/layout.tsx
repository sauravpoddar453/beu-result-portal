import type { Metadata } from 'next';
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
