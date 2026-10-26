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

const Home: React.FC<HomeProps> = ({ onSelectSemester }) => {
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

                    {/* Section Header with Animated Counter & Sliding Arrow Link */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 className="section-header-title">
                                Available B.Tech Examinations (<AnimatedCounter value={filteredExams.length} />)
                            </h2>
                            <p className="section-header-desc">
                                Click any exam to check and download your official format marksheet directly.
                            </p>
                        </div>
                        <a
                            href="#all-results"
                            className="hover-arrow-link"
                            style={{
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transition: 'color 0.2s ease'
                            }}
                        >
                            <span>View Directory Table</span>
                            <span className="arrow-icon" style={{ display: 'inline-flex', transition: 'transform 0.2s ease' }}>
                                <Lucide.ArrowDown size={14} />
                            </span>
                        </a>
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

                    {/* Examination Results Directory Table */}
                    <div id="all-results" className="glass responsive-table-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 800 }}>
                                        B.Tech Examination Results Directory
                                    </h2>
                                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '1rem', background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--primary)', fontWeight: 700, border: '1px solid rgba(var(--primary-rgb), 0.3)' }}>
                                        All Published B.Tech Exams
                                    </span>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
                                    Select any examination below to search and view complete student marksheet.
                                </p>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                        <th style={{ padding: '0.85rem 1rem' }}>Examinations Name</th>
                                        <th style={{ padding: '0.85rem 1rem' }}>Course</th>
                                        <th style={{ padding: '0.85rem 1rem' }}>Batch / Session</th>
                                        <th style={{ padding: '0.85rem 1rem' }}>Exam Held</th>
                                        <th style={{ padding: '0.85rem 1rem' }}>Published Date</th>
                                        <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExams.map((exam, i) => (
                                        <tr
                                            key={`dir-${exam.id}-${i}`}
                                            style={{
                                                borderBottom: '1px solid var(--border)',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s ease'
                                            }}
                                            onClick={() => onSelectSemester(exam)}
                                        >
                                            <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                {exam.examName}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--primary)', fontWeight: 600 }}>
                                                {exam.courseName} (Sem {exam.semId})
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem' }}>
                                                <span style={{ 
                                                    display: 'inline-block',
                                                    padding: '0.2rem 0.55rem',
                                                    borderRadius: '0.5rem',
                                                    background: 'rgba(var(--primary-rgb), 0.12)',
                                                    color: 'var(--primary)',
                                                    fontWeight: 700,
                                                    fontSize: '0.78rem',
                                                    marginRight: '0.4rem'
                                                }}>
                                                    Batch {getExamBatch(exam.session)}
                                                </span>
                                                <span style={{ color: 'var(--text-muted)' }}>{exam.session}</span>
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                                                {exam.examHeld}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--secondary)', fontWeight: 500 }}>
                                                {new Date(exam.publishDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectSemester(exam);
                                                    }}
                                                    className="check-result-btn"
                                                    style={{ height: '32px', padding: '0 0.85rem', fontSize: '0.78rem', width: 'auto', display: 'inline-flex', margin: '0 auto' }}
                                                >
                                                    <Lucide.Search size={13} /> View Result
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

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
                
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginTop: '3rem', marginBottom: '1.5rem', fontWeight: 800 }}>
                    BEU Result Updates
                </h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    <p>Students searching for the following terms can use this portal to check their results:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
                        {['BEU Result', 'Bihar Engineering University Result', 'BEU BTech Result', 'BEU Semester Result', 'BEU Result Portal'].map(keyword => (
                            <span key={keyword} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '2rem', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--secondary)' }}>
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Internal Linking Section */}
                <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                    <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 700 }}>Quick Result Access 🔗</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
                        <a href="/beu-result" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '1rem', fontWeight: 800, padding: '0.4rem 1rem', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '0.75rem' }}>Check BEU Result 🔥</a>
                        <a href="/beu-4th-sem-result" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>4th Sem Result</a>
                        <a href="/beu-6th-sem-result" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>6th Sem Result</a>
                        <a href="/beu-notification" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>BEU News</a>
                    </div>
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
