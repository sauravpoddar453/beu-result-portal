import React from 'react';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

export const metadata = {
  title: "BEU Result 2026 (Coming Soon) | Bihar Engineering University Check Here",
  description: "BEU Result 2026 jaldi hi release hone wala hai. Bihar Engineering University ke sabhi results yaha check kare. Official fast portal.",
};

export default function BeuResult2026Page() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark-900)' }}>
      <Navbar onGoHome={() => window.location.href = '/'} />
      <div style={{ padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center', fontFamily: 'var(--font-sans)', color: 'var(--text-main)', lineHeight: '1.8' }}>
        <div style={{ 
          display: 'inline-block', 
          padding: '0.5rem 1.5rem', 
          background: 'rgba(244, 63, 94, 0.1)', 
          color: 'var(--accent)', 
          borderRadius: '2rem', 
          fontSize: '0.9rem', 
          fontWeight: 800, 
          marginBottom: '2rem',
          border: '1px solid rgba(244, 63, 94, 0.2)'
        }}>
          COMING SOON 🚀
        </div>

        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1.5rem', color: 'var(--primary)' }}>
          BEU Result 2026
        </h1>

        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <img src="/result.png" alt="BEU result 2026 check portal" style={{ width: '100%', maxWidth: '100%', borderRadius: '1.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>

        <p style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
          BEU result jaldi hi release hone wala hai. 
        </p>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
          Yaha se aap direct Bihar Engineering University (BEU) semester results check kar sakenge. Humari API connectivity officially synchronize ho rahi hai.
        </p>

        <section className="glass" style={{ padding: '2.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ height: '8px', width: '8px', backgroundColor: 'var(--primary)', borderRadius: '50%' }}></span>
            How to Check BEU Result 2026
          </h2>
          <ol style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '1.1rem' }}>
            <li>Official website open kare (beu-bih.ac.in) or use our fast portal.</li>
            <li>Apna University Registration Number enter kare.</li>
            <li>Submit button click kare to calculate SGPA/CGPA instantly.</li>
          </ol>
        </section>

        <div style={{ marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
