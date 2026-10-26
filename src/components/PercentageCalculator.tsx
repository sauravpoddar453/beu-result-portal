'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import toast from 'react-hot-toast';

interface PercentageCalculatorProps {
    isOpen: boolean;
    onClose: () => void;
    initialCgpa?: string | number | null;
}

export type ConversionFormula = 'beu' | 'aicte' | 'ugc';

export const PercentageCalculator: React.FC<PercentageCalculatorProps> = ({
    isOpen,
    onClose,
    initialCgpa = ''
}) => {
    const [activeTab, setActiveTab] = useState<'cgpa' | 'sgpa' | 'marks' | 'info'>('cgpa');
    
    // CGPA Tab State
    const [cgpa, setCgpa] = useState<string>('');
    const [cgpaFormula, setCgpaFormula] = useState<ConversionFormula>('beu');
    
    // SGPA Tab State
    const [sgpa, setSgpa] = useState<string>('');
    const [sgpaFormula, setSgpaFormula] = useState<ConversionFormula>('beu');
    
    // Marks Tab State
    const [obtainedMarks, setObtainedMarks] = useState<string>('');
    const [totalMarks, setTotalMarks] = useState<string>('750');

    // Populate initial CGPA when modal opens
    useEffect(() => {
        if (isOpen && initialCgpa) {
            const parsed = parseFloat(initialCgpa.toString());
            if (!isNaN(parsed) && parsed > 0 && parsed <= 10) {
                setCgpa(parsed.toFixed(2));
            }
        }
    }, [isOpen, initialCgpa]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    // Helper: calculate percentage from score and formula
    const calculateScorePercentage = (scoreVal: number, formula: ConversionFormula): { percentage: number; formulaText: string } => {
        if (isNaN(scoreVal) || scoreVal <= 0) return { percentage: 0, formulaText: '' };
        
        if (formula === 'beu') {
            // BEU / AKU 10-point scale: Score * 10
            return {
                percentage: scoreVal * 10,
                formulaText: `${scoreVal.toFixed(2)} × 10 = ${(scoreVal * 10).toFixed(2)}%`
            };
        } else if (formula === 'aicte') {
            // AICTE formula: (Score - 0.75) * 10
            const res = Math.max(0, (scoreVal - 0.75) * 10);
            return {
                percentage: res,
                formulaText: `(${scoreVal.toFixed(2)} - 0.75) × 10 = ${res.toFixed(2)}%`
            };
        } else {
            // UGC / CBSE formula: Score * 9.5
            return {
                percentage: scoreVal * 9.5,
                formulaText: `${scoreVal.toFixed(2)} × 9.5 = ${(scoreVal * 9.5).toFixed(2)}%`
            };
        }
    };

    // Helper: get division classification
    const getDivision = (pct: number): { label: string; color: string; badgeBg: string } => {
        if (pct >= 75) return { label: 'First Class with Distinction', color: '#F5B301', badgeBg: 'rgba(245, 179, 1, 0.15)' };
        if (pct >= 60) return { label: 'First Division (First Class)', color: '#10B981', badgeBg: 'rgba(16, 185, 129, 0.15)' };
        if (pct >= 50) return { label: 'Second Division (Second Class)', color: '#38BDF8', badgeBg: 'rgba(56, 189, 248, 0.15)' };
        if (pct >= 40) return { label: 'Pass Division', color: '#94A3B8', badgeBg: 'rgba(148, 163, 184, 0.15)' };
        return { label: 'Below Passing Grade', color: '#EF4444', badgeBg: 'rgba(239, 68, 68, 0.15)' };
    };

    // Computed CGPA result
    const cgpaNum = parseFloat(cgpa);
    const { percentage: cgpaPct, formulaText: cgpaFormulaText } = calculateScorePercentage(cgpaNum, cgpaFormula);
    const cgpaDivision = getDivision(cgpaPct);

    // Computed SGPA result
    const sgpaNum = parseFloat(sgpa);
    const { percentage: sgpaPct, formulaText: sgpaFormulaText } = calculateScorePercentage(sgpaNum, sgpaFormula);
    const sgpaDivision = getDivision(sgpaPct);

    // Computed Marks result
    const obtNum = parseFloat(obtainedMarks);
    const totNum = parseFloat(totalMarks);
    const marksPct = (!isNaN(obtNum) && !isNaN(totNum) && totNum > 0) ? (obtNum / totNum) * 100 : 0;
    const marksDivision = getDivision(marksPct);

    // Copy to clipboard
    const handleCopy = (text: string) => {
        if (!navigator.clipboard) {
            toast.error('Clipboard access not supported');
            return;
        }
        navigator.clipboard.writeText(text);
        toast.success('Calculation copied to clipboard!');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                    background: 'rgba(5, 10, 25, 0.78)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 15 }}
                    transition={{ duration: 0.24, ease: 'easeOut' }}
                    className="glass"
                    style={{
                        width: '100%',
                        maxWidth: '560px',
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '1.25rem',
                        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '90vh'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid var(--border)',
                        background: 'rgba(255, 255, 255, 0.02)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '0.75rem',
                                background: 'rgba(var(--primary-rgb), 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary)',
                                border: '1px solid rgba(var(--primary-rgb), 0.3)'
                            }}>
                                <Lucide.Calculator size={20} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, lineHeight: 1.2 }}>
                                    BEU Percentage Calculator
                                </h2>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                    Official CGPA & SGPA to Percentage Converter
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '0.4rem',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                            }}
                            className="hover-scale"
                            title="Close calculator"
                        >
                            <Lucide.X size={20} />
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div style={{
                        display: 'flex',
                        padding: '0.5rem 1rem',
                        gap: '0.4rem',
                        background: 'rgba(0, 0, 0, 0.15)',
                        borderBottom: '1px solid var(--border)',
                        overflowX: 'auto'
                    }}>
                        {[
                            { id: 'cgpa', label: 'CGPA to %', icon: Lucide.Award },
                            { id: 'sgpa', label: 'SGPA to %', icon: Lucide.TrendingUp },
                            { id: 'marks', label: 'Marks to %', icon: Lucide.Percent },
                            { id: 'info', label: 'BEU Guidelines', icon: Lucide.Info },
                        ].map((tab) => {
                            const IconComponent = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.45rem',
                                        padding: '0.5rem 0.85rem',
                                        borderRadius: '0.65rem',
                                        fontSize: '0.82rem',
                                        fontWeight: isActive ? 700 : 500,
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: isActive ? 'var(--primary)' : 'transparent',
                                        color: isActive ? 'var(--btn-text)' : 'var(--text-muted)',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.18s ease'
                                    }}
                                >
                                    <IconComponent size={14} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Scrollable Tab Content */}
                    <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                        {/* TAB 1: CGPA to Percentage */}
                        {activeTab === 'cgpa' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                                        Enter Cumulative Grade Point Average (CGPA)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            step="0.01"
                                            placeholder="e.g. 7.83"
                                            value={cgpa}
                                            onChange={(e) => setCgpa(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem 1rem',
                                                borderRadius: '0.75rem',
                                                border: '1px solid var(--border)',
                                                background: 'rgba(255, 255, 255, 0.04)',
                                                color: 'var(--text-main)',
                                                fontSize: '1.1rem',
                                                fontWeight: 700,
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        {cgpa && (
                                            <button
                                                onClick={() => setCgpa('')}
                                                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                            >
                                                <Lucide.X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Quick CGPA Presets */}
                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                                        {['6.50', '7.00', '7.50', '7.83', '8.00', '8.50', '9.00'].map((preset) => (
                                            <button
                                                key={preset}
                                                onClick={() => setCgpa(preset)}
                                                style={{
                                                    padding: '0.2rem 0.55rem',
                                                    fontSize: '0.75rem',
                                                    borderRadius: '0.45rem',
                                                    border: '1px solid var(--border)',
                                                    background: cgpa === preset ? 'rgba(var(--primary-rgb), 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                                    color: cgpa === preset ? 'var(--primary)' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Formula Choice */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                                        Conversion Formula Rule
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                        {[
                                            { id: 'beu', name: 'BEU Standard (CBCS 10-Point)', formula: 'CGPA × 10', badge: 'Official & Most Common' },
                                            { id: 'aicte', name: 'AICTE Standard Formula', formula: '(CGPA - 0.75) × 10', badge: 'PSU / Central Exams' },
                                            { id: 'ugc', name: 'UGC / CBSE Standard', formula: 'CGPA × 9.5', badge: 'General Academic' },
                                        ].map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => setCgpaFormula(item.id as ConversionFormula)}
                                                style={{
                                                    padding: '0.65rem 0.85rem',
                                                    borderRadius: '0.75rem',
                                                    border: `1px solid ${cgpaFormula === item.id ? 'var(--primary)' : 'var(--border)'}`,
                                                    background: cgpaFormula === item.id ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                                            {item.name}
                                                        </span>
                                                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '1rem', background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', fontWeight: 700 }}>
                                                            {item.badge}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        Formula: <b>{item.formula}</b>
                                                    </span>
                                                </div>
                                                <input
                                                    type="radio"
                                                    checked={cgpaFormula === item.id}
                                                    onChange={() => setCgpaFormula(item.id as ConversionFormula)}
                                                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Results Box */}
                                {cgpaNum > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            padding: '1.25rem',
                                            borderRadius: '0.85rem',
                                            background: 'rgba(var(--primary-rgb), 0.08)',
                                            border: '1px solid rgba(var(--primary-rgb), 0.3)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                                                    Calculated Percentage
                                                </span>
                                                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1, marginTop: '0.2rem' }}>
                                                    {cgpaPct.toFixed(2)}%
                                                </div>
                                            </div>

                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '2rem',
                                                fontWeight: 700,
                                                color: cgpaDivision.color,
                                                background: cgpaDivision.badgeBg,
                                                border: `1px solid ${cgpaDivision.color}`
                                            }}>
                                                {cgpaDivision.label}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.6rem' }}>
                                            Step: <code style={{ color: 'var(--text-main)', fontWeight: 600 }}>{cgpaFormulaText}</code>
                                        </div>

                                        <button
                                            onClick={() => handleCopy(`BEU B.Tech Result:\nCGPA: ${cgpaNum.toFixed(2)}\nPercentage: ${cgpaPct.toFixed(2)}%\nDivision: ${cgpaDivision.label}\nFormula: ${cgpaFormulaText}`)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.45rem',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.6rem',
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-main)',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                width: '100%'
                                            }}
                                            className="hover-scale"
                                        >
                                            <Lucide.Copy size={14} /> Copy Calculation
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: SGPA to Percentage */}
                        {activeTab === 'sgpa' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                                        Enter Semester Grade Point Average (SGPA)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.01"
                                        placeholder="e.g. 8.22"
                                        value={sgpa}
                                        onChange={(e) => setSgpa(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            border: '1px solid var(--border)',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            color: 'var(--text-main)',
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                                        Use this to convert individual semester SGPA into an equivalent percentage.
                                    </p>
                                </div>

                                {/* Formula Choice */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                                        Conversion Rule
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                                        {[
                                            { id: 'beu', name: 'BEU Standard: SGPA × 10' },
                                            { id: 'aicte', name: 'AICTE Standard: (SGPA - 0.75) × 10' },
                                            { id: 'ugc', name: 'UGC Scale: SGPA × 9.5' },
                                        ].map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => setSgpaFormula(item.id as ConversionFormula)}
                                                style={{
                                                    padding: '0.65rem 0.85rem',
                                                    borderRadius: '0.75rem',
                                                    border: `1px solid ${sgpaFormula === item.id ? 'var(--primary)' : 'var(--border)'}`,
                                                    background: sgpaFormula === item.id ? 'rgba(var(--primary-rgb), 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                                    {item.name}
                                                </span>
                                                <input
                                                    type="radio"
                                                    checked={sgpaFormula === item.id}
                                                    onChange={() => setSgpaFormula(item.id as ConversionFormula)}
                                                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Results Box */}
                                {sgpaNum > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            padding: '1.25rem',
                                            borderRadius: '0.85rem',
                                            background: 'rgba(56, 189, 248, 0.08)',
                                            border: '1px solid rgba(56, 189, 248, 0.3)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                                                    Semester Percentage
                                                </span>
                                                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#38BDF8', lineHeight: 1.1, marginTop: '0.2rem' }}>
                                                    {sgpaPct.toFixed(2)}%
                                                </div>
                                            </div>

                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '2rem',
                                                fontWeight: 700,
                                                color: sgpaDivision.color,
                                                background: sgpaDivision.badgeBg,
                                                border: `1px solid ${sgpaDivision.color}`
                                            }}>
                                                {sgpaDivision.label}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.6rem' }}>
                                            Calculation: <code style={{ color: 'var(--text-main)', fontWeight: 600 }}>{sgpaFormulaText}</code>
                                        </div>

                                        <button
                                            onClick={() => handleCopy(`BEU Semester Result:\nSGPA: ${sgpaNum.toFixed(2)}\nPercentage: ${sgpaPct.toFixed(2)}%\nDivision: ${sgpaDivision.label}\nFormula: ${sgpaFormulaText}`)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.45rem',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.6rem',
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                border: '1px solid var(--border)',
                                                color: 'var(--text-main)',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                width: '100%'
                                            }}
                                            className="hover-scale"
                                        >
                                            <Lucide.Copy size={14} /> Copy Calculation
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* TAB 3: Total Marks to Percentage */}
                        {activeTab === 'marks' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                                        Total Marks Obtained
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="e.g. 550"
                                        value={obtainedMarks}
                                        onChange={(e) => setObtainedMarks(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            border: '1px solid var(--border)',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            color: 'var(--text-main)',
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.45rem' }}>
                                        Maximum Aggregate Marks
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="e.g. 750"
                                        value={totalMarks}
                                        onChange={(e) => setTotalMarks(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            border: '1px solid var(--border)',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            color: 'var(--text-main)',
                                            fontSize: '1rem',
                                            fontWeight: 700,
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                                        {['650', '700', '750', '800', '1000'].map((preset) => (
                                            <button
                                                key={preset}
                                                onClick={() => setTotalMarks(preset)}
                                                style={{
                                                    padding: '0.2rem 0.55rem',
                                                    fontSize: '0.75rem',
                                                    borderRadius: '0.45rem',
                                                    border: '1px solid var(--border)',
                                                    background: totalMarks === preset ? 'rgba(var(--primary-rgb), 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                                    color: totalMarks === preset ? 'var(--primary)' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                Max: {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {marksPct > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            padding: '1.25rem',
                                            borderRadius: '0.85rem',
                                            background: 'rgba(16, 185, 129, 0.08)',
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                                                    Aggregate Percentage
                                                </span>
                                                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#10B981', lineHeight: 1.1, marginTop: '0.2rem' }}>
                                                    {marksPct.toFixed(2)}%
                                                </div>
                                            </div>

                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '2rem',
                                                fontWeight: 700,
                                                color: marksDivision.color,
                                                background: marksDivision.badgeBg,
                                                border: `1px solid ${marksDivision.color}`
                                            }}>
                                                {marksDivision.label}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.6rem' }}>
                                            Formula: ({obtNum} / {totNum}) × 100 = <b>{marksPct.toFixed(2)}%</b>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* TAB 4: BEU Guidelines */}
                        {activeTab === 'info' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                <div style={{ padding: '0.85rem', borderRadius: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)' }}>
                                    <h4 style={{ color: 'var(--text-main)', margin: '0 0 0.35rem 0', fontSize: '0.92rem', fontWeight: 700 }}>
                                        🎓 BEU Patna Grading Guidelines (CBCS)
                                    </h4>
                                    <p style={{ margin: 0 }}>
                                        Bihar Engineering University (BEU) operates on a 10-point Choice Based Credit System (CBCS).
                                        Official BEU marksheets list semester SGPA, cumulative CGPA, and subject-wise aggregate marks.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <strong style={{ color: 'var(--text-main)' }}>Commonly Used Formulas:</strong>
                                    <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                                        <li>
                                            <b>BEU Standard Scale (CGPA × 10):</b> For a 10-point scale, multiplying CGPA by 10 is the universally adopted metric by engineering colleges in Bihar.
                                        </li>
                                        <li>
                                            <b>AICTE Conversion Formula ((CGPA - 0.75) × 10):</b> Specified by AICTE in certain national recruitment exams (GATE, PSUs, State PSCs).
                                        </li>
                                        <li>
                                            <b>Aggregate Marks Formula:</b> (Total Marks Obtained / Maximum Total Marks) × 100.
                                        </li>
                                    </ul>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <strong style={{ color: 'var(--text-main)' }}>Standard Division Classification:</strong>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.25rem' }}>
                                        <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(245, 179, 1, 0.1)', border: '1px solid rgba(245, 179, 1, 0.25)', color: '#F5B301', fontSize: '0.78rem', fontWeight: 600 }}>
                                            &ge; 75%: Distinction (1st Class)
                                        </div>
                                        <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10B981', fontSize: '0.78rem', fontWeight: 600 }}>
                                            &ge; 60%: First Division
                                        </div>
                                        <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', color: '#38BDF8', fontSize: '0.78rem', fontWeight: 600 }}>
                                            &ge; 50%: Second Division
                                        </div>
                                        <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(148, 163, 184, 0.1)', border: '1px solid rgba(148, 163, 184, 0.25)', color: '#CBD5E1', fontSize: '0.78rem', fontWeight: 600 }}>
                                            &ge; 40%: Pass Class
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '0.85rem 1.5rem',
                        borderTop: '1px solid var(--border)',
                        background: 'rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            BEU Result Portal &bull; Free Student Tool
                        </span>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '0.45rem 1.15rem',
                                borderRadius: '0.6rem',
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-main)',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                            className="hover-scale"
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PercentageCalculator;
