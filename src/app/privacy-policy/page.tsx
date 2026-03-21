'use client';
import React from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark-900)', color: 'var(--text-main)', fontFamily: 'var(--font-sans)' }}>
      <Navbar onGoHome={() => window.location.href = '/'} />
      <main style={{ padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2rem', color: 'var(--primary)' }}>Privacy Policy</h1>
        
        <p style={{ marginBottom: '1.5rem' }}>
          At BEU Result Portal (SP Creative), we respect your privacy. This website collects basic user data like cookies and analytics to improve user experience.
        </p>

        <p style={{ marginBottom: '1.5rem' }}>
          We do not sell or share personal data. Third-party services like Google AdSense may use cookies to serve ads based on your visits to this and other websites.
        </p>

        <p style={{ marginBottom: '1.5rem' }}>
          By using our website, you agree to our privacy policy. If you have any questions, please contact us.
        </p>

        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
