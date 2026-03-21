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

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    return (
        <nav className="glass nav-container" style={{
            margin: '1.5rem',
            padding: '0.75rem 2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '1.25rem',
            border: '1px solid rgba(255,255,255,0.08)'
        }}>
            <div
                onClick={onGoHome}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
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
                    padding: '2px'
                }}>
                    <img src="/beu-logo.jpg" alt="BEU Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: 'var(--text-main)',
                        letterSpacing: '0.02em',
                        lineHeight: 1
                    }}>
                        BEU PORTAL
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em' }}>
                        PREMIUM
                    </span>
                </div>
            </div>

            <div className="nav-links-container" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <a href="https://beu.intelliexams.com/beuexams/LoginScreens/frmStudentLoginPage.aspx" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>ERP</a>
                <a href="https://beu-bih.ac.in/tpo/Overview" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>TPO</a>
                <a href="https://beu-bih.ac.in/grievance/user-submit" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Grievance</a>
                
                <a 
                    href="https://github.com/sauravpoddar453/beu-result-portal" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                        color: 'var(--text-main)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', padding: '0.4rem', borderRadius: '50%',
                        transition: 'all 0.2s ease'
                    }}
                    className="hover-scale"
                    title="View Source on GitHub"
                >
                    <Lucide.Github size={18} />
                </a>

                <a 
                    href="https://instagram.com/spcreative453" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                        color: 'var(--text-main)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', padding: '0.4rem', borderRadius: '50%',
                        transition: 'all 0.2s ease'
                    }}
                    className="hover-scale"
                    title="Follow on Instagram"
                >
                    <Lucide.Instagram size={18} />
                </a>

                <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    style={{ 
                        background: 'transparent', border: 'none', cursor: 'pointer', 
                        color: 'var(--text-main)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', padding: '0.4rem', borderRadius: '50%'
                    }}
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? <Lucide.Sun size={18} /> : <Lucide.Moon size={18} />}
                </button>

                <a href="https://beu-bih.ac.in/" target="_blank" rel="noreferrer">
                    <button className="premium-btn" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '1rem' }}>
                        Official Site
                    </button>
                </a>
            </div>
        </nav>
    );
};

export default Navbar;
