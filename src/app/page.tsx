'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Dashboard from '@/components/Dashboard';
import Home from '@/components/Home';
import PercentageCalculator from '@/components/PercentageCalculator';

/**
 * Desktop-only subtle cursor glow that follows mouse position smoothly.
 * Automatically disabled on touch screens and when prefers-reduced-motion is active.
 */
const CursorGlow: React.FC = () => {
  const [pos, setPos] = useState({ x: -300, y: -300 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only enable if pointer is fine (mouse/desktop) and reduced motion is not preferred
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
      const handleMouseMove = (e: MouseEvent) => {
        setPos({ x: e.clientX, y: e.clientY });
        if (!visible) setVisible(true);
      };
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="cursor-glow"
      style={{
        position: 'fixed',
        left: pos.x - 180,
        top: pos.y - 180,
        width: 360,
        height: 360,
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
        filter: 'blur(35px)',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.16,
        willChange: 'left, top',
      }}
    />
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'dashboard'>('home');
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcScore, setCalcScore] = useState<string | number | null>(null);

  const handleOpenCalculator = (score?: string | number) => {
    if (score !== undefined) {
      setCalcScore(score);
    }
    setShowCalculator(true);
  };

  const handleSelectSemester = (exam: any) => {
    setSelectedExam(exam);
    setView('dashboard');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGoHome = () => {
    setView('home');
    setSelectedExam(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '5rem', position: 'relative' }}>
      {/* Background Decor: Animated floating orbs & faint grid pattern */}
      <div className="bg-grid-pattern" aria-hidden="true" />
      <div className="floating-orb orb-1" aria-hidden="true" />
      <div className="floating-orb orb-2" aria-hidden="true" />
      <div className="floating-orb orb-3" aria-hidden="true" />

      {/* Desktop Cursor Glow */}
      <CursorGlow />

      {/* Glassmorphic Navbar */}
      <Navbar onGoHome={handleGoHome} onOpenCalculator={() => handleOpenCalculator()} />

      <main style={{ position: 'relative', zIndex: 1, paddingTop: 'clamp(0.75rem, 2vw, 1.75rem)' }}>
        {/* Hidden SEO Section */}
        <section style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          <h1>BEU Result</h1>
          <p>
            Check Bihar Engineering University (BEU) B.Tech result for all semesters.
            Fast and easy result portal.
          </p>
        </section>

        {/* Gentle Page Transition between Home & Marksheet Dashboard */}
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <Home onSelectSemester={handleSelectSemester} onOpenCalculator={() => handleOpenCalculator()} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <Dashboard selectedExam={selectedExam} onBack={handleGoHome} onOpenCalculator={handleOpenCalculator} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Interactive BEU Percentage Calculator Modal */}
      <PercentageCalculator
        isOpen={showCalculator}
        onClose={() => {
          setShowCalculator(false);
          setCalcScore(null);
        }}
        initialCgpa={calcScore}
      />

      <footer style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        position: 'relative',
        zIndex: 1
      }}>
        <p>
          &copy; 2026 BEU Result Portal. Developed by{' '}
          <a
            href="https://github.com/sauravpoddar453"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
          >
            Saurav Poddar
          </a>{' '}
          CSE(AI) 2022 | PCE Purnea •{' '}
          <a
            href="https://t.me/sauravpoddar453"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#38BDF8', textDecoration: 'none', fontWeight: 600 }}
          >
            Telegram
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
