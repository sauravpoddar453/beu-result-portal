'use client';
import React from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function Beu1stSemResultPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark-900)', color: 'var(--text-main)', fontFamily: 'var(--font-sans)' }}>
      <Navbar onGoHome={() => window.location.href = '/'} />
      <main style={{ padding: '6rem 2rem', maxWidth: '900px', margin: '0 auto', lineHeight: '1.8' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '2.5rem', color: 'var(--primary)' }}>
          BEU BTech 1st Semester Result 2026
        </h1>

        <div className="glass" style={{ padding: '2.5rem', borderRadius: '1.5rem', marginBottom: '3rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 600 }}>
            Welcome to the BEU Result Portal, where Bihar Engineering University (BEU) students can check their 1st semester BTech results instantly.
          </p>
          <p style={{ color: 'var(--text-muted)' }}>
            The Bihar Engineering University (BEU) Patna conducts examinations for undergraduate and postgraduate courses, including BTech, B.Pharm, and others throughout the year. The 1st-semester examination is a crucial milestone for every engineering student as it sets the foundation for their academic journey. Students who recently appeared for the BEU 1st semester exams are eagerly awaiting their results to check their SGPA and credit points.
          </p>
        </div>

        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
            How to Check Bihar Engineering University 1st Sem Result 2026
          </h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            Checking your BEU results online is a simple process. Follow these verified steps to access your digital marksheet:
          </p>
          <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '1.1rem' }}>
            <li><strong>Step 1:</strong> Visit the official portal of Bihar Engineering University at beu-bih.ac.in or use our fast sync portal at spcreative.in.</li>
            <li><strong>Step 2:</strong> Look for the "Results" section on the homepage or click on the direct result links provided below.</li>
            <li><strong>Step 3:</strong> Select your course (B.Tech) and chooses the 1st semester from the dropdown list.</li>
            <li><strong>Step 4:</strong> Enter your 11-digit University Registration number accurately. This is the roll number mentioned on your admit card.</li>
            <li><strong>Step 5:</strong> Click on the "Submit" or "Show Result" button. Your result, including subject-wise marks and SGPA, will be displayed on the screen.</li>
          </ol>
        </section>

        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
            Details Mentioned on 1st Semester Marksheet
          </h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
            Your provisional BEU digital marksheet will contain the following essential details. Please verify them carefully for any discrepancies:
          </p>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', color: 'var(--text-muted)' }}>
            <li>Student's Full Name</li>
            <li>Father's and Mother's Name</li>
            <li>Official Registration Number (Roll No)</li>
            <li>College Name and Code</li>
            <li>Subject Codes and Names</li>
            <li>Internal (IA) and External (ESE) Marks</li>
            <li>SGPA (Semester Grade Point Average)</li>
            <li>Result Status (Pass/Fail/Promoted)</li>
          </ul>
        </section>

        <section style={{ marginBottom: '4rem', padding: '2rem', borderRadius: '1rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>
            Important Advice for 1st Year Students
          </h2>
          <p>
            Starting your engineering journey can be challenging. A high SGPA in the first semester builds confidence and helps in maintaining a good overall CGPA throughout the four years. If you are not satisfied with your results, BEU provides options for scrutiny and challenge evaluation. Keep an eye on our "BEU News" section for official dates regarding reassessment.
          </p>
        </section>

        <div style={{ marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Results Portal
          </Link>
        </div>
      </main>
    </div>
  );
}
