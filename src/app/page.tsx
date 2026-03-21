'use client';
import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Dashboard from '@/components/Dashboard';
import Home from '@/components/Home';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'dashboard'>('home');
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const handleSelectSemester = (exam: any) => {
    setSelectedExam(exam);
    setView('dashboard');
  };

  const handleGoHome = () => {
    setView('home');
    setSelectedExam(null);
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '5rem' }}>
      <Navbar onGoHome={handleGoHome} />
      <main>
        {/* Static Content for SEO Crowling (Hidden but Effective) */}
        <section style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            <h1>BEU Result 2026</h1>
            <p>
                Check Bihar Engineering University (BEU) result 2026 for all semesters. 
                Fast and easy result portal.
            </p>
        </section>
        {view === 'home' ? (
          <Home onSelectSemester={handleSelectSemester} />
        ) : (
          <Dashboard selectedExam={selectedExam} onBack={handleGoHome} />
        )}
      </main>

      {/* Background Decor */}
      <div style={{
        position: 'fixed',
        top: '20%',
        left: '-10%',
        width: '40vw',
        height: '40vw',
        background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
        zIndex: -1,
        opacity: 0.3
      }} />
      <div style={{
        position: 'fixed',
        bottom: '10%',
        right: '-10%',
        width: '35vw',
        height: '35vw',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 70%)',
        zIndex: -1,
        opacity: 0.2
      }} />

      <footer style={{
        textAlign: 'center',
        padding: '2rem',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <p>&copy; 2026 BEU Result Portal. Developed by <a href="https://github.com/sauravpoddar453" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Saurav Poddar</a> CSE(AI) 2022 | PCE Purnea</p>
      </footer>
    </div>
  );
};

export default App;
