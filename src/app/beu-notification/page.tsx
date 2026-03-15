import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "BEU Result Notification 2025 | Latest Updates",
  description: "Get the latest notification and updates for Bihar Engineering University (BEU) results.",
};

export default function BeuNotificationPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>BEU Result Notification 2025</h1>
      <p>Stay updated with the latest news and notifications regarding Bihar Engineering University results.</p>
      <ul>
        <li>Recent results have been published for 4th and 6th semesters.</li>
        <li>More results are being updated soon.</li>
      </ul>
      <div style={{ marginTop: '2rem' }}>
        <Link href="/" style={{ color: '#0070f3', textDecoration: 'underline' }}>
          Go back to Home to Check Result
        </Link>
      </div>
    </div>
  );
}
