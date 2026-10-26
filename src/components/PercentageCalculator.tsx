'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import toast from 'react-hot-toast';

export type CalculatorTab = 'cgpa' | 'sgpa-to-cgpa' | 'sgpa' | 'marks' | 'info';

export interface SemesterEntry {
    sem: number;
    sgpa: string;
    credits: string;
}

interface PercentageCalculatorProps {
    isOpen: boolean;
    onClose: () => void;
    initialCgpa?: string | number | null;
    initialTab?: CalculatorTab;
    initialAllSgpa?: (string | null | undefined)[] | null;
}

export type ConversionFormula = 'beu' | 'aicte' | 'ugc';

export const PercentageCalculator: React.FC<PercentageCalculatorProps> = ({
    isOpen,
    onClose,
    initialCgpa = '',
    initialTab = 'cgpa',
    initialAllSgpa = null
}) => {
    const [activeTab, setActiveTab] = useState<CalculatorTab>(initialTab || 'cgpa');
    
    // CGPA Tab State
    const [cgpa, setCgpa] = useState<string>('');
    const [cgpaFormula, setCgpaFormula] = useState<ConversionFormula>('beu');

    // SGPA to CGPA Tab State
    const [semesters, setSemesters] = useState<SemesterEntry[]>([
        { sem: 1, sgpa: '', credits: '20' },
        { sem: 2, sgpa: '', credits: '20' },
        { sem: 3, sgpa: '', credits: '20' },
        { sem: 4, sgpa: '', credits: '20' },
        { sem: 5, sgpa: '', credits: '20' },
        { sem: 6, sgpa: '', credits: '20' },
        { sem: 7, sgpa: '', credits: '20' },
        { sem: 8, sgpa: '', credits: '20' },
    ]);
    const [useCreditWeights, setUseCreditWeights] = useState<boolean>(false);
    
    // SGPA Tab State
    const [sgpa, setSgpa] = useState<string>('');
    const [sgpaFormula, setSgpaFormula] = useState<ConversionFormula>('beu');
    
    // Marks Tab State
    const [obtainedMarks, setObtainedMarks] = useState<string>('');
    const [totalMarks, setTotalMarks] = useState<string>('750');

    // Sync tab when initialTab changes
    useEffect(() => {
        if (isOpen && initialTab) {
            setActiveTab(initialTab);
        }
    }, [isOpen, initialTab]);

    // Populate initial allSgpa when provided
    useEffect(() => {
        if (isOpen && initialAllSgpa && Array.isArray(initialAllSgpa) && initialAllSgpa.length > 0) {
            setSemesters(prev => prev.map((s, idx) => {
                const val = initialAllSgpa[idx];
                if (val && val !== '-' && val !== 'NA' && val !== 'N/A' && !isNaN(parseFloat(val))) {
                    return { ...s, sgpa: parseFloat(val).toFixed(2) };
                }
                return s;
            }));
        }
    }, [isOpen, initialAllSgpa]);

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

    // Computed SGPA to CGPA calculation
    const validSemesters = semesters.filter(s => {
        const val = parseFloat(s.sgpa);
        return !isNaN(val) && val > 0 && val <= 10;
    });
    const semCount = validSemesters.length;
    let computedCgpa = 0;
    let totalCredits = 0;
    let sgpaToCgpaStep = '';

    if (semCount > 0) {
        if (useCreditWeights) {
            let totalWeightedPoints = 0;
            let credSum = 0;
            validSemesters.forEach(s => {
                const sgpaVal = parseFloat(s.sgpa);
                const credVal = parseFloat(s.credits) || 20;
                totalWeightedPoints += sgpaVal * credVal;
                credSum += credVal;
            });
            computedCgpa = credSum > 0 ? totalWeightedPoints / credSum : 0;
            totalCredits = credSum;
            sgpaToCgpaStep = `∑(SGPA × Credits) / ∑Credits = ${totalWeightedPoints.toFixed(2)} / ${credSum} = ${computedCgpa.toFixed(2)} CGPA`;
        } else {
            const sum = validSemesters.reduce((acc, s) => acc + parseFloat(s.sgpa), 0);
            computedCgpa = sum / semCount;
            sgpaToCgpaStep = `(${validSemesters.map(s => parseFloat(s.sgpa).toFixed(2)).join(' + ')}) / ${semCount} = ${computedCgpa.toFixed(2)} CGPA`;
        }
    }

    const sgpaToCgpaPercentage = computedCgpa * 10;
    const sgpaToCgpaDivision = getDivision(sgpaToCgpaPercentage);

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
                        maxWidth: '580px',
                        background: 'var(--card)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '1.25rem',
                        boxShadow: '0 25px 70px -10px rgba(0, 0, 0, 0.75), 0 0 35px rgba(56, 189, 248, 0.12)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '90vh',
                        position: 'relative'
                    }}
                >
                    {/* Top Accent Gradient Bar */}
                    <div style={{
                        height: '3px',
                        width: '100%',
                        background: 'linear-gradient(90deg, #38BDF8, #F5B301, #38BDF8)',
                        flexShrink: 0
                    }} />

                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1.25rem 1.5rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, transparent 100%)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '0.75rem',
                                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(245, 179, 1, 0.15))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#38BDF8',
                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                boxShadow: '0 4px 12px rgba(56, 189, 248, 0.15)'
                            }}>
                                <Lucide.Calculator size={20} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0, lineHeight: 1.2 }}>
                                    BEU Percentage Calculator
                                </h2>
                                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0 }}>
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
                            { id: 'sgpa-to-cgpa', label: 'SGPA to CGPA', icon: Lucide.Calculator },
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
                                            borderRadius: '1rem',
                                            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(245, 179, 1, 0.08) 100%)',
                                            border: '1px solid rgba(56, 189, 248, 0.38)',
                                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                                    Calculated Percentage
                                                </span>
                                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#38BDF8', lineHeight: 1.1, marginTop: '0.2rem' }}>
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
                                                ★ {cgpaDivision.label}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.6rem' }}>
                                            Formula Applied: <code style={{ color: 'var(--text-main)', fontWeight: 600 }}>{cgpaFormulaText}</code>
                                        </div>

                                        <button
                                            onClick={() => handleCopy(`BEU B.Tech Result:\nCGPA: ${cgpaNum.toFixed(2)}\nPercentage: ${cgpaPct.toFixed(2)}%\nDivision: ${cgpaDivision.label}\nFormula: ${cgpaFormulaText}`)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.45rem',
                                                padding: '0.55rem 1rem',
                                                borderRadius: '0.65rem',
                                                background: 'rgba(56, 189, 248, 0.15)',
                                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                                color: '#38BDF8',
                                                fontSize: '0.82rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                width: '100%',
                                                transition: 'all 0.2s ease'
                                            }}
                                            className="hover-scale"
                                        >
                                            <Lucide.Copy size={15} /> Copy Calculation Breakdown
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* TAB: SGPA to CGPA */}
                        {activeTab === 'sgpa-to-cgpa' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* Top Controls / Info Banner */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(56, 189, 248, 0.08)',
                                    border: '1px solid rgba(56, 189, 248, 0.25)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-main)' }}>
                                            Calculate Overall CGPA from Semester SGPAs
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                            Enter SGPA for your completed semesters (blank semesters are ignored)
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSemesters([
                                                    { sem: 1, sgpa: '7.20', credits: '20' },
                                                    { sem: 2, sgpa: '7.60', credits: '20' },
                                                    { sem: 3, sgpa: '8.10', credits: '20' },
                                                    { sem: 4, sgpa: '8.40', credits: '20' },
                                                    { sem: 5, sgpa: '', credits: '20' },
                                                    { sem: 6, sgpa: '', credits: '20' },
                                                    { sem: 7, sgpa: '', credits: '20' },
                                                    { sem: 8, sgpa: '', credits: '20' },
                                                ]);
                                                toast.success('Sample SGPAs loaded!');
                                            }}
                                            style={{
                                                padding: '0.3rem 0.65rem',
                                                fontSize: '0.72rem',
                                                fontWeight: 600,
                                                borderRadius: '0.45rem',
                                                background: 'rgba(255, 255, 255, 0.08)',
                                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                                color: 'var(--text-main)',
                                                cursor: 'pointer'
                                            }}
                                            className="hover-scale"
                                        >
                                            Sample
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSemesters(prev => prev.map(s => ({ ...s, sgpa: '' })));
                                                toast('Cleared all semester inputs', { icon: '🧹' });
                                            }}
                                            style={{
                                                padding: '0.3rem 0.65rem',
                                                fontSize: '0.72rem',
                                                fontWeight: 600,
                                                borderRadius: '0.45rem',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                                color: '#EF4444',
                                                cursor: 'pointer'
                                            }}
                                            className="hover-scale"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>

                                {/* Calculation Mode Toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                                        Calculation Mode:
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(0, 0, 0, 0.25)', padding: '3px', borderRadius: '0.6rem', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <button
                                            type="button"
                                            onClick={() => setUseCreditWeights(false)}
                                            style={{
                                                padding: '0.35rem 0.7rem',
                                                fontSize: '0.74rem',
                                                fontWeight: 700,
                                                borderRadius: '0.45rem',
                                                border: 'none',
                                                cursor: 'pointer',
                                                background: !useCreditWeights ? '#38BDF8' : 'transparent',
                                                color: !useCreditWeights ? '#0A1128' : 'var(--text-muted)',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            Equal Credits (Simple Avg)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setUseCreditWeights(true)}
                                            style={{
                                                padding: '0.35rem 0.7rem',
                                                fontSize: '0.74rem',
                                                fontWeight: 700,
                                                borderRadius: '0.45rem',
                                                border: 'none',
                                                cursor: 'pointer',
                                                background: useCreditWeights ? '#38BDF8' : 'transparent',
                                                color: useCreditWeights ? '#0A1128' : 'var(--text-muted)',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            Weighted (Credits)
                                        </button>
                                    </div>
                                </div>

                                {/* Semesters Input Grid */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                                    gap: '0.65rem'
                                }}>
                                    {semesters.map((s, idx) => (
                                        <div
                                            key={s.sem}
                                            style={{
                                                padding: '0.65rem',
                                                borderRadius: '0.75rem',
                                                background: s.sgpa ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                border: `1px solid ${s.sgpa ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.35rem',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: s.sgpa ? '#38BDF8' : 'var(--text-main)' }}>
                                                    Sem {s.sem}
                                                </span>
                                                {s.sgpa && (
                                                    <span style={{ fontSize: '0.65rem', color: '#10B981', fontWeight: 700 }}>✓</span>
                                                )}
                                            </div>

                                            <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                step="0.01"
                                                placeholder="SGPA"
                                                value={s.sgpa}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSemesters(prev => prev.map((item, i) => i === idx ? { ...item, sgpa: val } : item));
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.45rem 0.55rem',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                    color: 'var(--text-main)',
                                                    fontSize: '0.95rem',
                                                    fontWeight: 700,
                                                    outline: 'none',
                                                    boxSizing: 'border-box',
                                                    textAlign: 'center'
                                                }}
                                            />

                                            {useCreditWeights && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.1rem' }}>
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cr:</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="0.5"
                                                        placeholder="Credits"
                                                        value={s.credits}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setSemesters(prev => prev.map((item, i) => i === idx ? { ...item, credits: val } : item));
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.25rem 0.35rem',
                                                            borderRadius: '0.4rem',
                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                            background: 'rgba(255, 255, 255, 0.03)',
                                                            color: 'var(--text-main)',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            outline: 'none',
                                                            textAlign: 'center'
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Results Box */}
                                {semCount > 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        style={{
                                            padding: '1.25rem',
                                            borderRadius: '1rem',
                                            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(245, 179, 1, 0.08) 100%)',
                                            border: '1px solid rgba(56, 189, 248, 0.38)',
                                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.85rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                                    Cumulative Grade Point Average (CGPA)
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.2rem' }}>
                                                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#38BDF8', lineHeight: 1 }}>
                                                        {computedCgpa.toFixed(2)}
                                                    </span>
                                                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F5B301' }}>
                                                        ➔ {sgpaToCgpaPercentage.toFixed(2)}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '0.35rem 0.75rem',
                                                    borderRadius: '2rem',
                                                    fontWeight: 700,
                                                    color: sgpaToCgpaDivision.color,
                                                    background: sgpaToCgpaDivision.badgeBg,
                                                    border: `1px solid ${sgpaToCgpaDivision.color}`
                                                }}>
                                                    ★ {sgpaToCgpaDivision.label}
                                                </span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    Based on {semCount} Semester{semCount > 1 ? 's' : ''} {useCreditWeights ? `(${totalCredits} Credits)` : ''}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.6rem' }}>
                                            Formula: <code style={{ color: 'var(--text-main)', fontWeight: 600 }}>{sgpaToCgpaStep}</code>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const text = `BEU Cumulative Result:\n${validSemesters.map(s => `Sem ${s.sem} SGPA: ${parseFloat(s.sgpa).toFixed(2)}`).join('\n')}\nOverall CGPA: ${computedCgpa.toFixed(2)}\nEquivalent Percentage: ${sgpaToCgpaPercentage.toFixed(2)}%\nDivision: ${sgpaToCgpaDivision.label}\nRule: BEU Standard (CGPA × 10)`;
                                                    handleCopy(text);
                                                }}
                                                style={{
                                                    flex: 1,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.45rem',
                                                    padding: '0.55rem 1rem',
                                                    borderRadius: '0.65rem',
                                                    background: 'rgba(56, 189, 248, 0.15)',
                                                    border: '1px solid rgba(56, 189, 248, 0.35)',
                                                    color: '#38BDF8',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                className="hover-scale"
                                            >
                                                <Lucide.Copy size={15} /> Copy CGPA Breakdown
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCgpa(computedCgpa.toFixed(2));
                                                    setActiveTab('cgpa');
                                                    toast.success(`CGPA ${computedCgpa.toFixed(2)} transferred to CGPA to % calculator!`);
                                                }}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.45rem',
                                                    padding: '0.55rem 1rem',
                                                    borderRadius: '0.65rem',
                                                    background: 'rgba(245, 179, 1, 0.15)',
                                                    border: '1px solid rgba(245, 179, 1, 0.35)',
                                                    color: '#F5B301',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                className="hover-scale"
                                                title="View in CGPA to Percentage converter"
                                            >
                                                View in % Tab ➔
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div style={{
                                        padding: '1.5rem',
                                        textAlign: 'center',
                                        borderRadius: '0.85rem',
                                        border: '1px dashed rgba(255, 255, 255, 0.15)',
                                        color: 'var(--text-muted)',
                                        fontSize: '0.84rem'
                                    }}>
                                        Enter SGPA in any of the semester boxes above to calculate your cumulative CGPA.
                                    </div>
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
                                            borderRadius: '1rem',
                                            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(245, 179, 1, 0.08) 100%)',
                                            border: '1px solid rgba(56, 189, 248, 0.38)',
                                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                                    Semester Percentage
                                                </span>
                                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#38BDF8', lineHeight: 1.1, marginTop: '0.2rem' }}>
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
                                                ★ {sgpaDivision.label}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.6rem' }}>
                                            Calculation: <code style={{ color: 'var(--text-main)', fontWeight: 600 }}>{sgpaFormulaText}</code>
                                        </div>

                                        <button
                                            onClick={() => handleCopy(`BEU Semester Result:\nSGPA: ${sgpaNum.toFixed(2)}\nPercentage: ${sgpaPct.toFixed(2)}%\nDivision: ${sgpaDivision.label}\nFormula: ${sgpaFormulaText}`)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.45rem',
                                                padding: '0.55rem 1rem',
                                                borderRadius: '0.65rem',
                                                background: 'rgba(56, 189, 248, 0.15)',
                                                border: '1px solid rgba(56, 189, 248, 0.35)',
                                                color: '#38BDF8',
                                                fontSize: '0.82rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                width: '100%',
                                                transition: 'all 0.2s ease'
                                            }}
                                            className="hover-scale"
                                        >
                                            <Lucide.Copy size={15} /> Copy Calculation Breakdown
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
                                            borderRadius: '1rem',
                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)',
                                            border: '1px solid rgba(16, 185, 129, 0.38)',
                                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                                    Aggregate Percentage
                                                </span>
                                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#10B981', lineHeight: 1.1, marginTop: '0.2rem' }}>
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
                                                ★ {marksDivision.label}
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.6rem' }}>
                                            Formula Applied: <code style={{ color: 'var(--text-main)', fontWeight: 600 }}>({obtNum} / {totNum}) × 100 = {marksPct.toFixed(2)}%</code>
                                        </div>

                                        <button
                                            onClick={() => handleCopy(`BEU Marks Conversion:\nMarks Obtained: ${obtNum} / ${totNum}\nPercentage: ${marksPct.toFixed(2)}%\nDivision: ${marksDivision.label}`)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.45rem',
                                                padding: '0.55rem 1rem',
                                                borderRadius: '0.65rem',
                                                background: 'rgba(16, 185, 129, 0.15)',
                                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                                color: '#10B981',
                                                fontSize: '0.82rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                width: '100%',
                                                transition: 'all 0.2s ease'
                                            }}
                                            className="hover-scale"
                                        >
                                            <Lucide.Copy size={15} /> Copy Calculation Breakdown
                                        </button>
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
