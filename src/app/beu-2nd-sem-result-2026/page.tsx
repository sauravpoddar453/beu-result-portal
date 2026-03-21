'use client';
import React from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function Beu2ndSemResultPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark-900)', color: 'var(--text-main)', fontFamily: 'var(--font-sans)' }}>
      <Navbar onGoHome={() => window.location.href = '/'} />
      <main style={{ padding: '6rem 2rem', maxWidth: '900px', margin: '0 auto', lineHeight: '1.8' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '2.5rem', color: 'var(--primary)' }}>
          BEU BTech 2nd Semester Result 2026
        </h1>

        <div className="glass" style={{ padding: '2.5rem', borderRadius: '1.5rem', marginBottom: '3rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600 }}>
            Welcome to the official BEU 2nd Semester Result Portal. Here, Bihar Engineering University (BEU) students can check their BTech results with high speed and reliability.
          </p>
          <p style={{ color: 'var(--text-muted)' }}>
            The 2nd semester of BTech is an essential part of the first-year curriculum in Bihar's engineering colleges. It marks the transition for students from school-level basic subjects to technical core engineering foundation courses. For thousands of students who appeared for the BEU 2nd semester exams across diversas engineering streams like CSE, ECE, Civil, Mechanical, and others, the result day is a significant event.
          </p>
        </div>

        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
            Simple Steps to Check BEU 2nd Semester BTech Result 2026
          </h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            Follow these verified steps to access your digital result from the university's database:
          </p>
          <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '1.1rem' }}>
            <li><strong>Step 1:</strong> Visit the official portal beu-bih.ac.in or for a faster experience, use our direct result link at spcreative.in/beu-2nd-sem-result.</li>
            <li><strong>Step 2:</strong> Locate and click on the "Examination Results" menu on the university website.</li>
            <li><strong>Step 3:</strong> In the selection list, pick your course (B.Tech) and select the specific 2nd semester from the choices provided.</li>
            <li><strong>Step 4:</strong> Input your 11-digit University Registration number (Roll Number) as printed on your admit card or ID card.</li>
            <li><strong>Step 5:</strong> Click on the "Submit" or "Show Result" button to generate your semester marksheet on the fly.</li>
          </ol>
        </section>

        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
            Information Displayed on Your 2nd Sem Result
          </h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            Verify that your digital marksheet includes the following official information correctly:
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', color: 'var(--text-muted)' }}>
            <li>Proper Academic Session and Exam Held Year (2026)</li>
            <li>Full Name of the Candidate</li>
            <li>Parent's Names correctly spelled</li>
            <li>College and Department Name (e.g., PCE Purnea, BCE Bhagalpur)</li>
            <li>Internal Marks (IA/Sessional) out of the prescribed total</li>
            <li>External Theory Marks (ESE) and Practical Marks</li>
            <li>Final SGPA and cumulative CGPA (if available)</li>
            <li>Detailed Result Status (PASSED, PPROMOTED, or FAILEX)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '4rem', padding: '2.5rem', borderRadius: '1rem', background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.1)' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--secondary)' }}>
            Next Steps After 2nd Semester Results
          </h2>
          <p>
            Congratulations to all students who cleared their second-semester exams! You are now officially moving towards your 3rd semester, which usually marks the beginning of CORE engineering subjects. Ensure you have collected your physical marksheets from your respective college offices once the official university distribution begins. For students with backlogs, don't worry—the university will conduct special carry/supplementary exams soon.
          </p>
        </section>

        <div style={{ marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Results Hub
          </Link>
        </div>
      </main>
    </div>
  );
}
