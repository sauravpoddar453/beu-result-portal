'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Dashboard from '@/components/Dashboard';
import Home from '@/components/Home';
import PercentageCalculator from '@/components/PercentageCalculator';
import StatewideLeaderboard from '@/components/StatewideLeaderboard';

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
  const [view, setView] = useState<'home' | 'dashboard' | 'leaderboard'>('home');
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [searchedRegNo, setSearchedRegNo] = useState<string>('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcScore, setCalcScore] = useState<string | number | null>(null);
  const [calcTab, setCalcTab] = useState<any>('cgpa');
  const [calcAllSgpa, setCalcAllSgpa] = useState<(string | null | undefined)[] | null>(null);

  const handleOpenCalculator = (options?: { score?: string | number; tab?: any; allSgpa?: (string | null | undefined)[] } | string | number) => {
    if (typeof options === 'string' || typeof options === 'number') {
      setCalcScore(options);
      setCalcTab('cgpa');
    } else if (options && typeof options === 'object') {
      if (options.score !== undefined) setCalcScore(options.score);
      if (options.tab) setCalcTab(options.tab);
      if (options.allSgpa) setCalcAllSgpa(options.allSgpa);
    } else {
      setCalcTab('cgpa');
    }
    setShowCalculator(true);
  };

  const handleSelectSemester = (exam: any) => {
    setSelectedExam(exam);
    setSearchedRegNo('');
    setView('dashboard');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenLeaderboard = () => {
    setView('leaderboard');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleViewStudentResult = (regNo: string, semester?: string) => {
    setSearchedRegNo(regNo);
    const semNum = semester ? parseInt(semester.replace(/\D/g, ''), 10) || 1 : 1;
    const batchYear = regNo.length >= 2 ? `20${regNo.substring(0, 2)}` : '2024';
    setSelectedExam({
      semId: semNum,
      batchYear,
      examName: `B.Tech Semester ${semNum} Examination`,
      session: batchYear,
      id: semNum
    });
    setView('dashboard');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGoHome = () => {
    setView('home');
    setSelectedExam(null);
    setSearchedRegNo('');
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
      <Navbar
        onGoHome={handleGoHome}
        onOpenCalculator={() => handleOpenCalculator()}
        onOpenLeaderboard={handleOpenLeaderboard}
      />

      <main style={{ position: 'relative', zIndex: 1, paddingTop: 'clamp(0.75rem, 2vw, 1.75rem)' }}>
        {/* Hidden SEO Section */}
        <section style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          <h1>BEU Result</h1>
          <p>
            Check Bihar Engineering University (BEU) B.Tech result for all semesters.
            Fast and easy result portal.
          </p>
        </section>

        {/* Gentle Page Transition between Home, Marksheet Dashboard, & Statewide Leaderboard */}
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <Home
                onSelectSemester={handleSelectSemester}
                onOpenCalculator={() => handleOpenCalculator()}
                onOpenLeaderboard={handleOpenLeaderboard}
              />
            </motion.div>
          )}

          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <Dashboard
                selectedExam={selectedExam}
                initialRegNo={searchedRegNo}
                onBack={handleGoHome}
                onOpenCalculator={handleOpenCalculator}
              />
            </motion.div>
          )}

          {view === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <StatewideLeaderboard
                onBack={handleGoHome}
                onViewStudentResult={handleViewStudentResult}
              />
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
          setCalcAllSgpa(null);
        }}
        initialCgpa={calcScore}
        initialTab={calcTab}
        initialAllSgpa={calcAllSgpa}
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
