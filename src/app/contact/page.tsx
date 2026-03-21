'use client';
import React from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Mail, MessageSquare } from 'lucide-react';

export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark-900)', color: 'var(--text-main)', fontFamily: 'var(--font-sans)' }}>
      <Navbar onGoHome={() => window.location.href = '/'} />
      <main style={{ padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '2rem', color: 'var(--primary)' }}>Contact Us</h1>
        
        <p style={{ fontSize: '1.2rem', marginBottom: '3rem', color: 'var(--text-muted)' }}>
          If you have any queries about the BEU result portal, feel free to contact us.
        </p>

        <section className="glass" style={{ padding: '3rem', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.2rem', color: 'var(--text-main)' }}>
              <Mail size={24} color="var(--primary)" />
              <a href="mailto:sauravpoddar453@gmail.com" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}>sauravpoddar453@gmail.com</a>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.2rem', color: 'var(--text-main)' }}>
              <MessageSquare size={24} color="var(--primary)" />
              <a href="https://instagram.com/spcreative453" target="_blank" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}>Instagram: spcreative453</a>
            </div>
          </div>
        </section>

        <div style={{ marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
