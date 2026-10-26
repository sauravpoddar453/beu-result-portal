'use client';
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import * as Lucide from 'lucide-react';

interface NavbarProps {
    onGoHome: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onGoHome }) => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <nav
            className={`glass nav-container ${isScrolled ? 'nav-scrolled' : ''}`}
            style={{
                position: 'sticky',
                top: '0.75rem',
                zIndex: 50,
                margin: isScrolled ? '0.5rem auto 1rem' : '1.25rem auto 1.5rem',
                maxWidth: '1200px',
                padding: isScrolled ? '0.6rem 1.6rem' : '0.8rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '1.25rem',
                border: isScrolled ? '1px solid rgba(var(--primary-rgb), 0.35)' : '1px solid var(--border)',
                boxShadow: isScrolled 
                    ? '0 16px 36px -8px rgba(0, 0, 0, 0.5), 0 0 20px -4px var(--primary-glow)' 
                    : 'var(--glass-shadow)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
        >
            <div
                onClick={onGoHome}
                style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', cursor: 'pointer' }}
            >
                <div style={{
                    background: 'white',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px var(--primary-glow)',
                    overflow: 'hidden',
                    padding: '2px',
                    transition: 'transform 0.2s ease'
                }} className="hover-scale">
                    <img src="/beu-logo.jpg" alt="BEU Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        letterSpacing: '0.02em',
                        lineHeight: 1.1
                    }}>
                        BEU PORTAL
                    </span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.12em' }}>
                        PREMIUM
                    </span>
                </div>
            </div>

            <div className="nav-links-container" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <a
                    href="#all-results"
                    onClick={onGoHome}
                    style={{ textDecoration: 'none', color: 'var(--text-main)', fontSize: '0.82rem', fontWeight: 700, transition: 'color 0.2s ease' }}
                    className="hover-scale"
                >
                    B.Tech Results
                </a>
                <a
                    href="https://beu.intelliexams.com/beuexams/LoginScreens/frmStudentLoginPage.aspx"
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, transition: 'color 0.2s ease' }}
                    className="hover-scale"
                >
                    ERP
                </a>
                
                <a 
                    href="https://github.com/sauravpoddar453/beu-result-portal" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                        color: 'var(--text-main)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', padding: '0.45rem', borderRadius: '50%',
                        transition: 'all 0.2s ease', border: '1px solid var(--border)'
                    }}
                    className="hover-scale"
                    title="View Source on GitHub"
                >
                    <Lucide.Github size={17} />
                </a>

                <a 
                    href="https://instagram.com/spcreative453" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                        color: 'var(--text-main)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', padding: '0.45rem', borderRadius: '50%',
                        transition: 'all 0.2s ease', border: '1px solid var(--border)'
                    }}
                    className="hover-scale"
                    title="Follow on Instagram"
                >
                    <Lucide.Instagram size={17} />
                </a>

                {/* Theme Toggle with smooth rotation & color transitions */}
                <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    style={{ 
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        cursor: 'pointer', 
                        color: 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.45rem',
                        borderRadius: '50%',
                        transition: 'all 0.3s ease'
                    }}
                    className="hover-scale"
                    title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                    aria-label="Toggle Color Theme"
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: theme === 'dark' ? 'rotate(0deg)' : 'rotate(360deg)'
                    }}>
                        {theme === 'dark' ? (
                            <Lucide.Sun size={17} color="var(--primary)" />
                        ) : (
                            <Lucide.Moon size={17} color="var(--primary)" />
                        )}
                    </div>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
