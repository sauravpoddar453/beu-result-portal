import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "BEU BTech Result 2026 | Check All Semesters",
  description: "Check BEU result for BTech all semesters. Bihar Engineering University result portal.",
};

export default function BeuResultPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>BEU BTech Result 2026</h1>
      <p>Welcome to the official Bihar Engineering University (BEU) Result portal for BTech students. Here you can check your semester results easily.</p>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
          Go back to Home to Check Result
        </Link>
      </div>
    </div>
  );
}
