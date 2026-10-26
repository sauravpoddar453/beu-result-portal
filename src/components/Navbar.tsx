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
        <header
            className="nav-wrapper"
            style={{
                backdropFilter: isScrolled ? 'blur(16px)' : 'none',
                WebkitBackdropFilter: isScrolled ? 'blur(16px)' : 'none',
            }}
        >
            <nav
                className="glass nav-container"
                style={{
                    boxShadow: isScrolled 
                        ? '0 10px 25px -5px rgba(0, 0, 0, 0.45)' 
                        : 'var(--glass-shadow)',
                    background: 'var(--card)',
                    transition: 'box-shadow 0.25s ease'
                }}
            >
                <div
                    onClick={onGoHome}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                >
                    <div className="nav-logo-box hover-scale" style={{
                        background: 'white',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        overflow: 'hidden',
                        padding: '2px',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                    }}>
                        <img src="/beu-logo.jpg" alt="BEU Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="nav-brand-title" style={{
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            color: 'var(--text-main)',
                            letterSpacing: '0.02em',
                            lineHeight: 1.1
                        }}>
                            BEU PORTAL
                        </span>
                        <span style={{ fontSize: '0.62rem', color: '#38BDF8', fontWeight: 700, letterSpacing: '0.12em' }}>
                            PREMIUM
                        </span>
                    </div>
                </div>

                <div className="nav-links-container" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                    <a
                        href="#all-results"
                        onClick={onGoHome}
                        style={{ textDecoration: 'none', color: 'var(--text-main)', fontSize: '0.84rem', fontWeight: 700, transition: 'color 0.2s ease' }}
                        className="hover-scale nav-link-results"
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

                    <a 
                        href="https://t.me/sauravpoddar453" 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ 
                            color: 'var(--text-main)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', padding: '0.45rem', borderRadius: '50%',
                            transition: 'all 0.2s ease', border: '1px solid var(--border)'
                        }}
                        className="hover-scale"
                        title="Connect on Telegram"
                    >
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                            <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
                        </svg>
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
        </header>
    );
};

export default Navbar;
