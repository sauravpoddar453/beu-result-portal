'use client';
import React from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark-900)', color: 'var(--text-main)', fontFamily: 'var(--font-sans)' }}>
      <Navbar onGoHome={() => window.location.href = '/'} />
      <main style={{ padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '2rem', color: 'var(--primary)' }}>Terms and Conditions</h1>
        
        <p style={{ marginBottom: '1.5rem', fontWeight: 600 }}>
          This website is for informational purposes only. We are not affiliated with, authorized, or endorsed by Bihar Engineering University (BEU) Patna or any other official university department.
        </p>

        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
          While we strive for accuracy, users should always verify their results and official notifications from the university's official sources (beu-bih.ac.in). We are not responsible for any data discrepancy or academic consequence resulting from the use of this portal.
        </p>

        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
          Our services are provided "as is" and "as available". We reserve the right to modify, suspend, or discontinue any aspect of our portal at any time without prior notice.
        </p>

        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
          By using our website, you agree to these terms and acknowledge that your use of the portal is at your own risk.
        </p>

        <div style={{ marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
