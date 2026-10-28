'use client';
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Exam {
    id: number;
    courseid: number;
    examName: string;
    publishDate: string;
    session: string;
    batchYear: string;
    semId: number;
    examHeld: string;
    examId?: string;
    courseName?: string;
}

interface Course {
    courseid: number;
    courseName: string;
    exams: Exam[];
}

interface HomeProps {
    onSelectSemester: (exam: Exam) => void;
    onOpenCalculator?: (options?: any) => void;
    onOpenLeaderboard?: () => void;
}

/**
 * Animated number counter that counts up smoothly when visible
 */
const AnimatedCounter: React.FC<{ value: number; duration?: number }> = ({ value, duration = 800 }) => {
    const [displayVal, setDisplayVal] = useState(value);
    const prevValRef = useRef(value);

    useEffect(() => {
        let startTime: number | null = null;
        let animationFrame: number;
        const startVal = prevValRef.current;
        const diff = value - startVal;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setDisplayVal(Math.round(startVal + diff * easeOut));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setDisplayVal(value);
                prevValRef.current = value;
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <span>{displayVal}</span>;
};

/**
 * Skeleton shimmer cards shown while exam data is loading
 */
const SkeletonCards: React.FC = () => (
    <div className="exams-grid">
        {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass" style={{
                padding: '1.25rem',
                borderRadius: '1rem',
                height: '210px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                border: '1px solid var(--border)'
            }}>
                <div className="skeleton-bar" style={{ width: '45%', height: '16px', borderRadius: '4px' }} />
                <div className="skeleton-bar" style={{ width: '85%', height: '22px', borderRadius: '4px', marginTop: '0.2rem' }} />
                <div className="skeleton-bar" style={{ width: '60%', height: '14px', borderRadius: '4px' }} />
                <div style={{ marginTop: 'auto' }}>
                    <div className="skeleton-bar" style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
                </div>
            </div>
        ))}
    </div>
);

/**
 * Interactive Exam Card with responsive typography, hover lift & depth
 */
interface ExamCardProps {
    exam: Exam;
    index: number;
    batchKey: string;
    onSelectSemester: (exam: Exam) => void;
}

const ExamCard: React.FC<ExamCardProps> = ({ exam, index, batchKey, onSelectSemester }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{
                delay: Math.min(index * 0.02, 0.18),
                duration: 0.3,
                layout: { duration: 0.25 }
            }}
            onClick={() => onSelectSemester(exam)}
            className="exam-card"
        >
            {/* Top-Right Corner Batch Badge */}
            <div className="exam-card-badge">
                <span>Batch {batchKey}</span>
                <span style={{ opacity: 0.82 }}>({exam.session})</span>
            </div>

            {/* Accent Cyan Icon and Course/Semester Label */}
            <div className="exam-card-course">
                <Lucide.GraduationCap size={15} color="#38BDF8" />
                <span>{exam.courseName || 'B.Tech'} • Sem {exam.semId}</span>
            </div>

            {/* Exam Title: Pure White & Bold */}
            <h3 className="exam-card-title">
                {exam.examName}
            </h3>

            {/* Date / Meta Text: Muted #94A3B8 & Verified Green */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.76rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Lucide.Calendar size={13} color="#94A3B8" /> {exam.examHeld}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#10B981', fontWeight: 600 }}>
                        <Lucide.CheckCircle size={13} color="#10B981" /> {new Date(exam.publishDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                </div>

                {/* Outline / Ghost Check Result Button: 40px height, full-width, white text */}
                <button
                    className="check-result-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelectSemester(exam);
                    }}
                >
                    <Lucide.GraduationCap size={15} /> Check Result
                </button>
            </div>
        </motion.div>
    );
};

const Home: React.FC<HomeProps> = ({ onSelectSemester, onOpenCalculator, onOpenLeaderboard }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [, setSelectedCourseId] = useState<number | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [notices, setNotices] = useState<any[]>([]);
    const [noticesLoading, setNoticesLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);



    // Typewriter Rotating Placeholder State
    const rotatingPlaceholders = [
        "Search 8th Sem Examination...",
        "Search B.Tech 2026...",
        "Search Batch 2022-26...",
        "Search Supplementary results...",
        "Search 1st, 2nd, 3rd, 4th Sem...",
        "Search 28 B.Tech examinations..."
    ];
    const [placeholderText, setPlaceholderText] = useState(rotatingPlaceholders[0]);

    useEffect(() => {
        let index = 0;
        let charIndex = 0;
        let isDeleting = false;
        let timeoutId: any;

        const type = () => {
            const currentFull = rotatingPlaceholders[index];
            if (isDeleting) {
                setPlaceholderText(currentFull.substring(0, charIndex - 1));
                charIndex--;
                if (charIndex <= 0) {
                    isDeleting = false;
                    index = (index + 1) % rotatingPlaceholders.length;
                    timeoutId = setTimeout(type, 500);
                    return;
                }
                timeoutId = setTimeout(type, 35);
            } else {
                setPlaceholderText(currentFull.substring(0, charIndex + 1));
                charIndex++;
                if (charIndex >= currentFull.length) {
                    isDeleting = true;
                    timeoutId = setTimeout(type, 2200);
                    return;
                }
                timeoutId = setTimeout(type, 70);
            }
        };

        timeoutId = setTimeout(type, 1000);
        return () => clearTimeout(timeoutId);
    }, []);

    // Load subscription status from localStorage
    useEffect(() => {
        const savedStatus = localStorage.getItem('beu_notifications_enabled');
        if (savedStatus === 'true') {
            setIsSubscribed(true);
        }
    }, []);

    const handleSubscribe = () => {
        const newStatus = !isSubscribed;
        if (newStatus) {
            toast.success("Push Notifications Enabled! You will be instantly notified of new BEU results.", { icon: '🔔', duration: 4000 });
        } else {
            toast.success("Notifications Disabled.");
        }
        setIsSubscribed(newStatus);
        localStorage.setItem('beu_notifications_enabled', String(newStatus));
    };

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await fetch('/api/proxy?url=' + encodeURIComponent('https://beu-bih.ac.in/backend/v1/result/sem-get'));
                if (!response.ok) throw new Error('Failed to fetch exams');
                const data = await response.json();
                
                // Strictly filter for B.Tech courses only (removes M.Tech, B.Arch, MBA, etc.)
                const btechCourses = (Array.isArray(data) ? data : []).filter((c: any) => 
                    c.courseName && c.courseName.toLowerCase().includes('b.tech')
                );
                setCourses(btechCourses);
                if (btechCourses.length > 0) {
                    const targetCourse = btechCourses[0];
                    setSelectedCourseId(targetCourse.courseid);

                    if (targetCourse.exams && targetCourse.exams.length > 0) {
                        const latest = targetCourse.exams[0];
                        setTimeout(() => {
                            toast(`Latest Published: ${latest.examName}`, {
                                icon: '🚀',
                                duration: 6000,
                            });
                        }, 500);
                    }
                }
            } catch (err) {
                console.error(err);
                setError('Unable to fetch official exam list. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        const fetchNotices = async () => {
            try {
                const response = await fetch('/api/proxy?url=' + encodeURIComponent('https://beu-bih.ac.in/backend/v1/notice/get-notice-board'));
                if (response.ok) {
                    const data = await response.json();
                    setNotices(data.slice(0, 6)); // Top 6 notices
                }
            } catch (err) {
                console.error('Notice fetch error:', err);
            } finally {
                setNoticesLoading(false);
            }
        };

        fetchExams();
        fetchNotices();
    }, []);

    const getExamBatch = (session: string): string => {
        if (!session) return 'Other';
        const match = session.match(/^20(2[2-5])/);
        if (match) {
            return match[1]; // '22', '23', '24', '25'
        }
        return 'Other';
    };

    // Strictly filter to only include Batches 22, 23, 24, 25
    const allExams: Exam[] = courses.flatMap(c => 
        (c.exams || [])
            .filter(e => getExamBatch(e.session) !== 'Other')
            .map(e => ({ ...e, courseName: c.courseName }))
    );

    const batchMetadata: { [key: string]: { label: string; session: string } } = {
        '22': { label: 'Batch 22', session: '2022-26' },
        '23': { label: 'Batch 23', session: '2023-27' },
        '24': { label: 'Batch 24', session: '2024-28' },
        '25': { label: 'Batch 25', session: '2025-29' },
    };

    const availableBatches = ['22', '23', '24', '25'].filter(b => 
        allExams.some(e => getExamBatch(e.session) === b)
    );

    const filteredExams = allExams.filter(exam => {
        const batchKey = getExamBatch(exam.session);
        const matchesBatch = activeFilter === 'all' || batchKey === activeFilter;
        const q = searchQuery.toLowerCase().trim();
        if (!q) return matchesBatch;
        const matchesQuery = 
            exam.examName.toLowerCase().includes(q) ||
            exam.session.toLowerCase().includes(q) ||
            exam.examHeld.toLowerCase().includes(q) ||
            (exam.courseName || '').toLowerCase().includes(q) ||
            `sem ${exam.semId}`.toLowerCase().includes(q) ||
            `${exam.semId}th`.toLowerCase().includes(q) ||
            `batch ${batchKey}`.toLowerCase().includes(q);
        return matchesBatch && matchesQuery;
    });

    return (
        <div className="page-container">
            {/* Hero Section with Staggered Fade-Up & Text Shimmer */}
            <header style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '1rem' }}>
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.12,
                                delayChildren: 0.05
                            }
                        }
                    }}
                >
                    <motion.div
                        variants={{
                            hidden: { opacity: 0, y: -15 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                        }}
                        className="hero-pill"
                    >
                        <Lucide.GraduationCap size={16} color="#38BDF8" /> B.Tech Examination Portal
                    </motion.div>

                    <motion.h1
                        variants={{
                            hidden: { opacity: 0, y: 15 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
                        }}
                        className="hero-title"
                    >
                        BEU <span className="shimmer-text">RESULTS</span> Portal
                    </motion.h1>

                    <motion.p
                        variants={{
                            hidden: { opacity: 0, y: 15 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
                        }}
                        className="hero-subtitle"
                    >
                        Instant access to official Bihar Engineering University semester results and marksheet records.
                    </motion.p>

                    {onOpenLeaderboard && (
                        <motion.div
                            variants={{
                                hidden: { opacity: 0, y: 15 },
                                visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
                            }}
                            style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center' }}
                        >
                            <button
                                onClick={onOpenLeaderboard}
                                type="button"
                                className="hover-scale"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.65rem',
                                    padding: '0.7rem 1.4rem',
                                    borderRadius: '2rem',
                                    border: '1px solid rgba(245, 158, 11, 0.45)',
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(56, 189, 248, 0.1) 100%)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.88rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.15)',
                                    backdropFilter: 'blur(10px)'
                                }}
                            >
                                <span style={{ fontSize: '1.1rem' }}>🏆</span>
                                <span>Bihar Statewide Toppers & College Rankings</span>
                                <span style={{
                                    background: '#F59E0B',
                                    color: '#000',
                                    fontSize: '0.68rem',
                                    fontWeight: 900,
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '0.8rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    Live
                                </span>
                                <Lucide.ChevronRight size={16} color="var(--text-muted)" />
                            </button>
                        </motion.div>
                    )}

                </motion.div>
            </header>

            {loading ? (
                <div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
                        <Lucide.Loader2 className="animate-spin" size={36} color="var(--primary)" />
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Fetching official B.Tech exam list from BEU server...</p>
                    </div>
                    <SkeletonCards />
                </div>
            ) : error ? (
                <div className="glass" style={{ padding: '3rem', textAlign: 'center', border: '1px solid var(--accent)' }}>
                    <Lucide.AlertCircle size={48} color="var(--accent)" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Connection Error</h3>
                    <p style={{ color: 'var(--text-muted)' }}>{error}</p>
                    <button
                        className="premium-btn"
                        style={{ marginTop: '1.5rem', background: 'var(--accent)', color: '#fff' }}
                        onClick={() => window.location.reload()}
                    >
                        Retry Connection
                    </button>
                </div>
            ) : (
                <>
                    {/* Search & Batch Filter Section */}
                    <div className="search-filter-section">
                        {/* Live Search Input with Glowing Focus & Pulsing Icon */}
                        <div className="glass search-input-wrapper">
                            <Lucide.Search className="search-pulse-icon" size={20} color="#38BDF8" />
                            <input
                                type="text"
                                placeholder={searchQuery ? '' : placeholderText}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-main)',
                                    width: '100%',
                                    outline: 'none',
                                    fontSize: '0.95rem'
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                    title="Clear search"
                                >
                                    <Lucide.X size={18} />
                                </button>
                            )}
                        </div>

                        {/* B.Tech Batch Filter Chips with Sliding Active Pill */}
                        <div className="filter-chips-container">
                            <motion.button
                                onClick={() => setActiveFilter('all')}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                className="filter-chip-btn"
                                style={{
                                    borderColor: activeFilter === 'all' ? 'var(--primary)' : 'var(--border)',
                                    color: activeFilter === 'all' ? 'var(--btn-text)' : 'var(--text-main)',
                                }}
                            >
                                {activeFilter === 'all' && (
                                    <motion.div
                                        layoutId="activeFilterPill"
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'var(--primary)',
                                            borderRadius: '2rem',
                                            zIndex: -1
                                        }}
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                All Batches (<AnimatedCounter value={allExams.length} />)
                            </motion.button>

                            {availableBatches.map((batch) => {
                                const batchCount = allExams.filter(e => getExamBatch(e.session) === batch).length;
                                const isSelected = activeFilter === batch;
                                const meta = batchMetadata[batch];
                                return (
                                    <motion.button
                                        key={`batch-${batch}`}
                                        onClick={() => setActiveFilter(batch)}
                                        title={meta ? `${meta.label} (${meta.session})` : `Batch ${batch}`}
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        className="filter-chip-btn"
                                        style={{
                                            borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                                            color: isSelected ? 'var(--btn-text)' : 'var(--text-main)',
                                        }}
                                    >
                                        {isSelected && (
                                            <motion.div
                                                layoutId="activeFilterPill"
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    background: 'var(--primary)',
                                                    borderRadius: '2rem',
                                                    zIndex: -1
                                                }}
                                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                        Batch {batch} (<AnimatedCounter value={batchCount} />)
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section Header with Animated Counter */}
                    <div id="all-results" style={{ marginBottom: '2rem' }}>
                        <div>
                            <h2 className="section-header-title">
                                Available B.Tech Examinations (<AnimatedCounter value={filteredExams.length} />)
                            </h2>
                            <p className="section-header-desc">
                                Click any exam to check and download your official format marksheet directly.
                            </p>
                        </div>
                    </div>

                    {/* Fluid Responsive Exams Grid */}
                    <div className="exams-grid">
                        <AnimatePresence mode="popLayout">
                            {filteredExams.map((exam, index) => (
                                <ExamCard
                                    key={`${exam.id}-${index}`}
                                    exam={exam}
                                    index={index}
                                    batchKey={getExamBatch(exam.session)}
                                    onSelectSemester={onSelectSemester}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </>
            )}

            {/* =========================================================================
                NEW SECTION: Statewide Rankings & Academic Toolkit
                Showcases all recently added features:
                1. Statewide Topper Leaderboard & College Rankings
                2. Target CGPA Simulator & Planner
                3. BEU Grace & Promotion Rules
                4. Story Marksheets & Multi-Semester Transcript
               ========================================================================= */}
            <section
                id="academic-toolkit"
                style={{
                    marginTop: '3.5rem',
                    marginBottom: '3rem',
                    position: 'relative'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.35rem 0.9rem',
                        borderRadius: '2rem',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(56, 189, 248, 0.12))',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        color: 'var(--text-main)',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        marginBottom: '0.85rem'
                    }}>
                        <span style={{ fontSize: '1rem' }}>✨</span>
                        <span>New Features • Academic Suite</span>
                    </div>

                    <h2 style={{
                        fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
                        fontWeight: 900,
                        color: 'var(--text-main)',
                        letterSpacing: '-0.02em',
                        marginBottom: '0.6rem'
                    }}>
                        Statewide Rankings & Academic Toolkit
                    </h2>
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.98rem',
                        maxWidth: '680px',
                        margin: '0 auto',
                        lineHeight: 1.6
                    }}>
                        Explore university-wide topper rank lists, simulate your required CGPA goals, check official BEU promotion rules, and generate shareable story marksheets.
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem',
                    width: '100%'
                }}>
                    {/* Card 1: Statewide Leaderboard */}
                    <motion.div
                        whileHover={{ y: -5, boxShadow: '0 12px 30px rgba(245, 158, 11, 0.18)' }}
                        transition={{ duration: 0.2 }}
                        className="glass"
                        style={{
                            padding: '1.85rem',
                            borderRadius: '1.25rem',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.08) 0%, rgba(18, 28, 61, 0.5) 100%)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '-15px',
                            right: '-15px',
                            opacity: 0.08,
                            color: '#F59E0B'
                        }}>
                            <Lucide.Trophy size={110} />
                        </div>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '1rem',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(245, 158, 11, 0.4)'
                                }}>
                                    <Lucide.Trophy size={24} color="#F59E0B" />
                                </div>
                                <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '1rem',
                                    background: 'rgba(245, 158, 11, 0.18)',
                                    color: '#F59E0B',
                                    border: '1px solid rgba(245, 158, 11, 0.3)'
                                }}>
                                    38+ Colleges
                                </span>
                            </div>

                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
                                Statewide Toppers & Rankings
                            </h3>
                            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                                Live rank list across all BEU engineering colleges. Compare college performance, pass percentage, and top rankers.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🥇</span> <span>Top 10 Statewide Rankers & Scorecards</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🏛️</span> <span>College-wise Distinction & Pass %</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🔍</span> <span>Filter by Batch, Semester & Branch</span>
                                </div>
                            </div>
                        </div>

                        {onOpenLeaderboard && (
                            <button
                                type="button"
                                onClick={onOpenLeaderboard}
                                className="hover-scale"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.85rem',
                                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                    color: '#000',
                                    fontWeight: 800,
                                    fontSize: '0.88rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                                }}
                            >
                                <span>Explore Leaderboard</span>
                                <Lucide.ArrowRight size={16} />
                            </button>
                        )}
                    </motion.div>

                    {/* Card 2: Target CGPA Planner */}
                    <motion.div
                        whileHover={{ y: -5, boxShadow: '0 12px 30px rgba(16, 185, 129, 0.18)' }}
                        transition={{ duration: 0.2 }}
                        className="glass"
                        style={{
                            padding: '1.85rem',
                            borderRadius: '1.25rem',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(18, 28, 61, 0.5) 100%)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '-15px',
                            right: '-15px',
                            opacity: 0.08,
                            color: '#10B981'
                        }}>
                            <Lucide.Target size={110} />
                        </div>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '1rem',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(16, 185, 129, 0.4)'
                                }}>
                                    <Lucide.Target size={24} color="#10B981" />
                                </div>
                                <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '1rem',
                                    background: 'rgba(16, 185, 129, 0.18)',
                                    color: '#10B981',
                                    border: '1px solid rgba(16, 185, 129, 0.3)'
                                }}>
                                    Goal Setting
                                </span>
                            </div>

                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
                                Target CGPA Planner
                            </h3>
                            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                                Want to graduate with 8.0+ CGPA or First Class? Calculate the exact required SGPA in upcoming semesters to hit your dream target.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🎯</span> <span>Real-time Required SGPA Forecast</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>⚖️</span> <span>Credit-Weighted Multi-Sem Calculations</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>⚡</span> <span>Instant Feasibility & Goal Guidance</span>
                                </div>
                            </div>
                        </div>

                        {onOpenCalculator && (
                            <button
                                type="button"
                                onClick={() => onOpenCalculator({ tab: 'target-cgpa' })}
                                className="hover-scale"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.85rem',
                                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                    color: '#FFFFFF',
                                    fontWeight: 800,
                                    fontSize: '0.88rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                <span>Launch Target Planner</span>
                                <Lucide.ArrowRight size={16} />
                            </button>
                        )}
                    </motion.div>

                    {/* Card 3: BEU Grace & Promotion Rules */}
                    <motion.div
                        whileHover={{ y: -5, boxShadow: '0 12px 30px rgba(56, 189, 248, 0.18)' }}
                        transition={{ duration: 0.2 }}
                        className="glass"
                        style={{
                            padding: '1.85rem',
                            borderRadius: '1.25rem',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            background: 'linear-gradient(145deg, rgba(56, 189, 248, 0.08) 0%, rgba(18, 28, 61, 0.5) 100%)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '-15px',
                            right: '-15px',
                            opacity: 0.08,
                            color: '#38BDF8'
                        }}>
                            <Lucide.ShieldCheck size={110} />
                        </div>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '1rem',
                                    background: 'rgba(56, 189, 248, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(56, 189, 248, 0.4)'
                                }}>
                                    <Lucide.ShieldCheck size={24} color="#38BDF8" />
                                </div>
                                <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '1rem',
                                    background: 'rgba(56, 189, 248, 0.18)',
                                    color: '#38BDF8',
                                    border: '1px solid rgba(56, 189, 248, 0.3)'
                                }}>
                                    University Guide
                                </span>
                            </div>

                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
                                Grace Marks & Promotion
                            </h3>
                            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                                Official regulations simplified: know exactly how BEU 5-mark grace works, Year Back criteria, and ATKT semester promotion rules.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>⚖️</span> <span>Official 5-Mark Grace Policy</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>🚫</span> <span>Year-Back vs ATKT Carryover Rules</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📚</span> <span>Minimum Credit Requirements by Year</span>
                                </div>
                            </div>
                        </div>

                        {onOpenCalculator && (
                            <button
                                type="button"
                                onClick={() => onOpenCalculator({ tab: 'grace-rules' })}
                                className="hover-scale"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.85rem',
                                    background: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
                                    color: '#FFFFFF',
                                    fontWeight: 800,
                                    fontSize: '0.88rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 15px rgba(56, 189, 248, 0.3)'
                                }}
                            >
                                <span>Check Promotion Rules</span>
                                <Lucide.ArrowRight size={16} />
                            </button>
                        )}
                    </motion.div>

                    {/* Card 4: Story Marksheet Cards & Multi-Sem Journey */}
                    <motion.div
                        whileHover={{ y: -5, boxShadow: '0 12px 30px rgba(236, 72, 153, 0.18)' }}
                        transition={{ duration: 0.2 }}
                        className="glass"
                        style={{
                            padding: '1.85rem',
                            borderRadius: '1.25rem',
                            border: '1px solid rgba(236, 72, 153, 0.3)',
                            background: 'linear-gradient(145deg, rgba(236, 72, 153, 0.08) 0%, rgba(18, 28, 61, 0.5) 100%)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '-15px',
                            right: '-15px',
                            opacity: 0.08,
                            color: '#EC4899'
                        }}>
                            <Lucide.Sparkles size={110} />
                        </div>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '1rem',
                                    background: 'rgba(236, 72, 153, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(236, 72, 153, 0.4)'
                                }}>
                                    <Lucide.Sparkles size={24} color="#EC4899" />
                                </div>
                                <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '1rem',
                                    background: 'rgba(236, 72, 153, 0.18)',
                                    color: '#EC4899',
                                    border: '1px solid rgba(236, 72, 153, 0.3)'
                                }}>
                                    Viral Format
                                </span>
                            </div>

                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
                                Story Cards & Transcript
                            </h3>
                            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '1.25rem' }}>
                                Celebrate your success with aesthetic Instagram & WhatsApp story result cards, or view your complete 4-year semester SGPA trajectory.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📱</span> <span>9:16 Instagram & WhatsApp Story Cards</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📈</span> <span>Multi-Semester Progression Curve</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>📥</span> <span>High-Res PNG & Official Transcript</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                const el = document.getElementById('all-results');
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            className="hover-scale"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.85rem',
                                background: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
                                color: '#FFFFFF',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                boxShadow: '0 4px 15px rgba(236, 72, 153, 0.3)'
                            }}
                        >
                            <span>Check Result to Create Card</span>
                            <Lucide.ArrowUp size={16} />
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* Dynamic Notices & Quick Links Section */}
            <div className="notices-grid">
                {/* Notice Board */}
                <div className="glass" style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h3 style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.2rem' }}>
                            <Lucide.Zap size={22} color="var(--primary)" />
                            Latest Result Updates
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {noticesLoading && <Lucide.Loader2 className="animate-spin" size={18} color="var(--primary)" />}
                            
                            <button
                                type="button"
                                onClick={handleSubscribe}
                                className="premium-btn"
                                style={{
                                    padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '2rem',
                                    background: isSubscribed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                                    color: isSubscribed ? 'var(--secondary)' : 'var(--text-main)',
                                    boxShadow: 'none', border: `1px solid ${isSubscribed ? 'var(--secondary)' : 'var(--border)'}`
                                }}
                            >
                                {isSubscribed ? (
                                    <><Lucide.BellRing size={14} style={{ marginRight: '0.4rem' }} /> Subscribed</>
                                ) : (
                                    <><Lucide.Bell size={14} style={{ marginRight: '0.4rem' }} /> Get Notifications</>
                                )}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {notices.map((notice, idx) => (
                            <a
                                key={idx}
                                href={`https://beu-bih.ac.in/backend/${notice.link}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ textDecoration: 'none' }}
                            >
                                <motion.div
                                    whileHover={{ x: 5, background: 'rgba(255,255,255,0.05)' }}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--border)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                                        {notice.noticedate}
                                    </div>
                                    <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.4 }}>
                                        {notice.board}
                                    </div>
                                </motion.div>
                            </a>
                        ))}
                    </div>
                    <button
                        onClick={() => window.open('https://beu-bih.ac.in/notice/notice-board', '_blank')}
                        style={{ width: '100%', marginTop: '1.5rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                        View All Updates
                    </button>
                </div>

                {/* Quick Access Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), transparent)' }}>
                        <h3 style={{ color: 'var(--text-main)', marginBottom: '1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Lucide.Link2 size={20} color="var(--primary)" />
                            Quick Links
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            {[
                                { name: 'Syllabus', url: 'https://beu-bih.ac.in/academic/syllabus', icon: <Lucide.Book size={16} /> },
                                { name: 'Academic Cal', url: 'https://beu-bih.ac.in/academic/academic-calendar', icon: <Lucide.CalendarClock size={16} /> },
                                { name: 'Exam Schedule', url: 'https://beu-bih.ac.in/examination/examination-schedule', icon: <Lucide.ClipboardList size={16} /> },
                                { name: 'TPO Portal', url: 'https://beu-bih.ac.in/tpo/Overview', icon: <Lucide.Briefcase size={16} /> }
                            ].map((link, i) => (
                                <a key={i} href={link.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                                    <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)' }}>
                                        {link.icon} {link.name}
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08), transparent)' }}>
                        <h3 style={{ color: 'var(--text-main)', marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Lucide.LifeBuoy size={20} color="var(--accent)" />
                            Student Support
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                            Facing issues with your results or portal? Reach out to the official university helpdesk.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                <Lucide.Phone size={16} color="var(--accent)" /> 0612-2385475
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                <Lucide.Mail size={16} color="var(--accent)" /> info@beu-bih.ac.in
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SEO Content Section */}
            <div className="glass seo-box" id="seo-content">
                <h1 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 800 }}>
                    BEU Result
                </h1>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '1.5rem', fontWeight: 700 }}>
                    Bihar Engineering University Results
                </h2>
                
                <div style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontWeight: 600, color: 'var(--primary)', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem' }}>
                        Use this dedicated student portal to check Bihar Engineering University (BEU) semester results, access real-time university notifications, and view authentic marksheets directly.
                    </p>
                    <p style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                        Instant access to official B.Tech examination scorecards, branch performance statistics, and verified university results across Bihar engineering colleges.
                    </p>
                    <p>
                        Bihar Engineering University (BEU), Patna releases semester examination results for undergraduate engineering students throughout the academic year. This portal provides an accelerated, mobile-optimized platform ensuring students can easily check, verify, and print their official marksheet records online without server interruptions.
                    </p>
                </div>
            </div>

            {/* About the Developer Section */}
            <div className="glass" style={{ 
                marginTop: '4rem', 
                padding: '3rem', 
                borderRadius: '1rem', 
                background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.05), transparent)', 
                border: '1px solid var(--border)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ 
                    position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1, color: 'var(--primary)'
                }}>
                    <Lucide.Code2 size={120} />
                </div>
                
                <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Lucide.UserCircle2 size={28} color="var(--primary)" />
                    Meet the Developer
                </h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
                    <div style={{ 
                        width: '120px', 
                        height: '120px', 
                        borderRadius: '2rem', 
                        background: 'linear-gradient(135deg, var(--primary), var(--accent))', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '3rem', 
                        fontWeight: 900, 
                        color: 'var(--btn-text)',
                        boxShadow: '0 10px 25px var(--primary-glow)',
                        transform: 'rotate(-5deg)'
                    }}>
                        SP
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '280px' }}>
                        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                            Saurav Poddar
                        </h3>
                        <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                            Full Stack Developer • CSE (Artificial Intelligence)
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '600px' }}>
                            Student at <strong>Purnea College of Engineering, Purnea</strong> (Batch 2022-26). 
                            Focused on building high-performance web applications and AI-integrated systems for Bihar's engineering community.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                            <a href="https://github.com/sauravpoddar453" target="_blank" rel="noreferrer" className="premium-btn" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
                                <Lucide.Github size={18} /> GitHub
                            </a>
                            <a href="https://instagram.com/spcreative453" target="_blank" rel="noreferrer" className="premium-btn" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2338 75%, #bc1888 100%)', color: '#fff' }}>
                                <Lucide.Instagram size={18} /> Instagram
                            </a>
                            <a href="https://t.me/sauravpoddar453" target="_blank" rel="noreferrer" className="premium-btn" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', background: '#0088cc', color: '#fff' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
                                </svg>
                                Telegram
                            </a>
                            <div style={{ 
                                padding: '0.6rem 1.2rem', 
                                background: 'rgba(255,255,255,0.04)', 
                                borderRadius: '0.75rem', 
                                border: '1px solid var(--border)',
                                color: 'var(--text-muted)',
                                fontSize: '0.85rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.4rem',
                                minWidth: '220px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Lucide.Mail size={16} /> <a href="mailto:sauravpoddar453@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>sauravpoddar453@gmail.com</a>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Lucide.Mail size={16} /> <a href="mailto:sauravpoddar645@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>sauravpoddar645@gmail.com</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer style={{ marginTop: '6rem', padding: '4rem 0 2rem 0', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                    © {new Date().getFullYear()} BEU PORTAL • DIRECT API SYNC WITH BEU BIHAR
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    <Link href="/privacy-policy" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textDecoration: 'none' }}>Privacy Policy</Link>
                    <Link href="/terms" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textDecoration: 'none' }}>Terms & Conditions</Link>
                    <Link href="/about" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textDecoration: 'none' }}>About us</Link>
                    <Link href="/contact" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textDecoration: 'none' }}>Contact</Link>
                </div>
            </footer>
        </div>
    );
};

export default Home;
