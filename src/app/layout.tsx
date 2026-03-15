import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './Providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'BEU Result Portal',
  description: 'View your BEU results online.',
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
