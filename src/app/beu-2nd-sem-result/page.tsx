import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "BEU BTech 2nd Semester Result 2026",
  description: "Check BEU BTech 2nd semester results online. Fast Bihar Engineering University result portal.",
};

export default function Beu2ndSemResultPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>BEU BTech 2nd Semester Result 2026</h1>
      <p>Welcome to the official portal to check the Bihar Engineering University (BEU) 2nd semester BTech results.</p>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
          Go back to Home to Check Result
        </Link>
      </div>
    </div>
  );
}
