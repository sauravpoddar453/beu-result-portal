'use client';
import React from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark-900)', color: 'var(--text-main)', fontFamily: 'var(--font-sans)' }}>
      <Navbar onGoHome={() => window.location.href = '/'} />
      <main style={{ padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '2rem', color: 'var(--primary)' }}>About Us</h1>
        
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
          <strong>SP Creative</strong> is an independent, informational portal dedicated to providing the latest updates about <strong>Bihar Engineering University (BEU)</strong> results and academic information.
        </p>

        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
          Our mission is to help engineering students across Bihar easily access their semester results, CGPA/SGPA calculations, and important university notifications. We aim to provide a fast, reliable, and user-friendly alternative to traditional portals.
        </p>

        <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
          We are committed to helping students navigate their academic journey with ease by providing instant result updates and direct links for result searches.
        </p>

        <div style={{ marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
