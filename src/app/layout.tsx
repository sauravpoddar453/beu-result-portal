import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './Providers';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'BEU Result Portal | Check Bihar Engineering University Results Online',
  description: 'Check BEU BTech results online. Fast and simple Bihar Engineering University result portal for students.',
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
