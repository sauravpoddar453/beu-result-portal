'use client';
import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function BeuResult2026Page() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark-900)' }}>
      <Navbar onGoHome={() => window.location.href = '/'} />
      <div style={{ padding: '6rem 2rem', maxWidth: '900px', margin: '0 auto', textAlign: 'center', fontFamily: 'var(--font-sans)', color: 'var(--text-main)', lineHeight: '1.8' }}>
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
          BEU result 2026 jaldi hi release hone wala hai. 
        </p>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '3rem' }}>
          Bihar Engineering University (BEU) Patna conducts undergraduate (B.Tech, B.Pharm) and postgraduate (M.Tech, MBA) examinations throughout the academic year. For the year 2026, students from all across Bihar engineering colleges are eagerly checking for updates on their results. This portal is your primary destination for fast, reliable, and secure result access.
        </p>

        <section className="glass" style={{ padding: '2.5rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', background: 'rgba(255,255,255,0.02)', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ height: '8px', width: '8px', backgroundColor: 'var(--primary)', borderRadius: '50%' }}></span>
            How to Check BEU Result 2026 Online
          </h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            To check your Bihar Engineering University results, students must follow a few simple steps. The university usually publishes results on its official website, and our portal synchronizes with the data to provide a seamless checking experience:
          </p>
          <ol style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '1.1rem' }}>
            <li><strong>Official Site:</strong> Visit the BEU official site beu-bih.ac.in or simply use our direct result links on the home page.</li>
            <li><strong>Select Course:</strong> Navigate to the result tab and Choose "B.Tech" from the course list.</li>
            <li><strong>Registration Number:</strong> Enter your 11-digit Registration Number (Roll Number) as provided by the university.</li>
            <li><strong>Show Result:</strong> Click on the "Submit" or "Show Result" button to instantly calculate your SGPA/CGPA and view subject marks.</li>
          </ol>
        </section>

        <section style={{ textAlign: 'left', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                About BEU Result 2026 Updates
            </h2>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                Bihar Engineering University (BEU), established by the Government of Bihar, is the premier authority for engineering education in the state. Thousands of students from prestigious colleges like PCE Purnea, BCE Bhagalpur, and MIT Muzaffarpur depend on the official BEU results for their career progression. In 2026, the university aims to further modernize its result publishing process, ensuring less downtime and higher accuracy.
                Whether you are in your 1st, 2nd, 3rd, or final year of engineering, our portal will provide dedicated support for every semester result.
            </p>
            <p style={{ color: 'var(--text-muted)' }}>
                We also provide updates about internal marks (Sessional/IA), practical marks, and official marksheets. Stay tuned to our portal for the official 2026 result release dates.
            </p>
        </section>

        <div style={{ marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Home Result Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
