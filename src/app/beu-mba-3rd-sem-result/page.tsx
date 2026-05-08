import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "BEU MBA 3rd Semester Result",
  description: "Check official BEU MBA 3rd semester results online. Fast Bihar Engineering University result portal.",
};

export default function ResultPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>BEU MBA 3rd Semester Result</h1>
      <p>Welcome to the official portal to check the Bihar Engineering University (BEU) 3rd semester MBA results.</p>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
          Go back to Home to Check Result
        </Link>
      </div>
    </div>
  );
}
