import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "BEU Result 2026: How to Check Bihar Engineering University Result",
  description: "Learn how to check BEU result 2026 online. Follow easy steps to view your Bihar Engineering University semester results.",
};

export default function HowToCheckResultPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', fontFamily: 'sans-serif', lineHeight: '1.6' }}>
      <h1>BEU Result 2026: How to Check Bihar Engineering University Result</h1>
      <p>If you are a student of Bihar Engineering University (BEU) and waiting for your B.Tech results, this guide will help you check your results smoothly.</p>
      
      <h2>Steps to Check BEU Result</h2>
      <ol>
        <li>Visit the official BEU result portal or use our fast portal <Link href="/">here</Link>.</li>
        <li>Enter your University Registration Number.</li>
        <li>Select your semester from the dropdown list.</li>
        <li>Click on the <strong>Search Result</strong> or similar button to view your marks.</li>
      </ol>

      <h2>Semester Result Details</h2>
      <p>The result page will typically show your subjects, marks obtained in internal and external exams, SGPA, and your overall pass/fail status.</p>

      <h2>Recent Updates</h2>
      <p>Keep visiting this portal to get the latest updates on when new BEU results are published for different semesters.</p>

      <div style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
          Go back to Home to Check Result
        </Link>
      </div>
    </div>
  );
}
