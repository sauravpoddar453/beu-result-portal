'use client';
import React, { useEffect, useState } from 'react';
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

const Home: React.FC<HomeProps> = ({ onSelectSemester }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [activeFilter, setActiveFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [notices, setNotices] = useState<any[]>([]);
    const [noticesLoading, setNoticesLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);

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

    const allExams: Exam[] = courses.flatMap(c => (c.exams || []).map(e => ({ ...e, courseName: c.courseName })));

    const availableSemesters = [8, 7, 6, 5, 4, 3, 2, 1].filter(sem => 
        allExams.some(e => e.semId === sem)
    );

    const filteredExams = allExams.filter(exam => {
        const matchesSemester = activeFilter === 'all' || exam.semId.toString() === activeFilter;
        const q = searchQuery.toLowerCase().trim();
        if (!q) return matchesSemester;
        const matchesQuery = 
            exam.examName.toLowerCase().includes(q) ||
            exam.session.toLowerCase().includes(q) ||
            exam.examHeld.toLowerCase().includes(q) ||
            (exam.courseName || '').toLowerCase().includes(q) ||
            `sem ${exam.semId}`.toLowerCase().includes(q) ||
            `${exam.semId}th`.toLowerCase().includes(q);
        return matchesSemester && matchesQuery;
    });

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Hero Section */}
            <header style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1 }}>
                        BEU <span style={{ color: 'var(--primary)' }}>B.TECH RESULTS</span> PORTAL
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '1rem', maxWidth: '650px', margin: '1rem auto' }}>
                        Access official Bihar Engineering University B.Tech results with real-time official server synchronization.
                    </p>
                </motion.div>
            </header>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem' }}>
                    <Lucide.Loader2 className="animate-spin" size={48} color="var(--primary)" />
                    <p style={{ color: 'var(--text-muted)' }}>Fetching official B.Tech exam list from BEU server...</p>
                </div>
            ) : error ? (
                <div className="glass" style={{ padding: '3rem', textAlign: 'center', border: '1px solid var(--accent)' }}>
                    <Lucide.AlertCircle size={48} color="var(--accent)" style={{ marginBottom: '1rem' }} />
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>Connection Error</h3>
                    <p style={{ color: 'var(--text-muted)' }}>{error}</p>
                    <button
                        className="premium-btn"
                        style={{ marginTop: '1.5rem', background: 'var(--accent)' }}
                        onClick={() => window.location.reload()}
                    >
                        Retry Connection
                    </button>
                </div>
            ) : (
                <>
                    {/* Search & Semester Filter Section */}
                    <div style={{ maxWidth: '850px', margin: '0 auto 3rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Live Search Input */}
                        <div className="glass" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.9rem 1.25rem',
                            borderRadius: '1.25rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.03)'
                        }}>
                            <Lucide.Search size={22} color="var(--primary)" />
                            <input
                                type="text"
                                placeholder={`Search all ${allExams.length} B.Tech examinations (e.g. 8th Sem, 6th Sem, 2026, Supplementary)...`}
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
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                                >
                                    <Lucide.X size={18} />
                                </button>
                            )}
                        </div>

                        {/* B.Tech Semester Filter Pills */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '0.6rem',
                            flexWrap: 'wrap'
                        }}>
                            <button
                                onClick={() => setActiveFilter('all')}
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '2rem',
                                    border: '1px solid',
                                    borderColor: activeFilter === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                    background: activeFilter === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    color: 'var(--text-main)',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                All B.Tech ({allExams.length})
                            </button>
                            {availableSemesters.map((sem) => {
                                const semCount = allExams.filter(e => e.semId === sem).length;
                                const isSelected = activeFilter === sem.toString();
                                return (
                                    <button
                                        key={`sem-${sem}`}
                                        onClick={() => setActiveFilter(sem.toString())}
                                        style={{
                                            padding: '0.6rem 1.25rem',
                                            borderRadius: '2rem',
                                            border: '1px solid',
                                            borderColor: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                            background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            color: 'var(--text-main)',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        Sem {sem} ({semCount})
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-main)', fontWeight: 800 }}>
                                Available B.Tech Examinations ({filteredExams.length})
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                Click any exam to check and download your official format marksheet directly.
                            </p>
                        </div>
                        <a
                            href="#all-results"
                            style={{
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            View Directory Table <Lucide.ArrowDown size={14} />
                        </a>
                    </div>

                    {/* Exams Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '4rem'
                    }}>
                        <AnimatePresence mode="popLayout">
                            {filteredExams.map((exam, index) => (
                                <motion.div
                                    key={`${exam.id}-${index}`}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.3 }}
                                    whileHover={{ scale: 1.02, translateY: -4 }}
                                    className="glass"
                                    onClick={() => onSelectSemester(exam)}
                                    style={{
                                        padding: '1.75rem',
                                        cursor: 'pointer',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        borderRadius: '1.25rem'
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        padding: '0.4rem 0.9rem',
                                        background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
                                        color: '#fff',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        borderBottomLeftRadius: '1rem'
                                    }}>
                                        {exam.session}
                                    </div>

                                    <div style={{
                                        color: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600
                                    }}>
                                        <Lucide.GraduationCap size={18} />
                                        {exam.courseName || 'BEU'} • Sem {exam.semId}
                                    </div>

                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.35, color: 'var(--text-main)' }}>
                                        {exam.examName}
                                    </h3>

                                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Lucide.Calendar size={13} /> {exam.examHeld}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--secondary)', fontWeight: 600 }}>
                                                <Lucide.CheckCircle size={13} /> {new Date(exam.publishDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>

                                        <div style={{ marginTop: '0.6rem' }}>
                                            <button
                                                className="premium-btn"
                                                style={{ width: '100%', padding: '0.65rem 1rem', fontSize: '0.85rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectSemester(exam);
                                                }}
                                            >
                                                <Lucide.GraduationCap size={16} /> Check Result
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Examination Results Directory Table */}
                    <div id="all-results" className="glass" style={{ marginBottom: '4rem', padding: '2rem', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <h2 style={{ fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 800 }}>
                                        B.Tech Examination Results Directory
                                    </h2>
                                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.7rem', borderRadius: '1rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
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
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: 'var(--text-muted)' }}>
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
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => onSelectSemester(exam)}
                                        >
                                            <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                                {exam.examName}
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--primary)', fontWeight: 600 }}>
                                                {exam.courseName} (Sem {exam.semId})
                                            </td>
                                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                                                {exam.session}
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
                                                    className="premium-btn"
                                                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
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
                                    background: isSubscribed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)',
                                    color: isSubscribed ? 'var(--secondary)' : 'var(--text-main)',
                                    boxShadow: 'none', border: `1px solid ${isSubscribed ? 'var(--secondary)' : 'rgba(255,255,255,0.2)'}`
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
                                        border: '1px solid rgba(255,255,255,0.05)',
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
                        style={{ width: '100%', marginTop: '1.5rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                        View All Updates
                    </button>
                </div>

                {/* Quick Access Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), transparent)' }}>
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
                                    <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        {link.icon} {link.name}
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="glass" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.05), transparent)' }}>
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
            <div className="glass" id="seo-content" style={{ marginTop: '4rem', padding: '3rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <img src="/result.png" alt="BEU result check portal" style={{ width: '100%', maxWidth: '600px', borderRadius: '1rem', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <h1 style={{ fontSize: '1.8rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 800 }}>
                    BEU Result
                </h1>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '1.5rem', fontWeight: 700 }}>
                    Bihar Engineering University Results
                </h2>
                
                <div style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontWeight: 600, color: 'var(--primary)', borderLeft: '4px solid var(--primary)', paddingLeft: '1rem' }}>
                        BEU result check karne ke liye is portal ka use kare. 
                        Yaha aapko semester wise result, latest updates aur direct result links milenge.
                    </p>
                    <p style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                        Yaha se aap BEU result, semester wise result aur latest updates check kar sakte hai.
                    </p>
                    <p>
                        Bihar Engineering University (BEU) releases semester examination results for BTech students every year. Many students face difficulty finding the correct result link quickly. This BEU Result Portal helps students easily access their Bihar Engineering University results online.
                    </p>


                </div>
                
                <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginTop: '3rem', marginBottom: '1.5rem', fontWeight: 800 }}>
                    BEU Result Updates
                </h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    <p>Students searching for the following terms can use this portal to check their results:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
                        {['BEU Result', 'Bihar Engineering University Result', 'BEU BTech Result', 'BEU Semester Result', 'BEU Result Portal'].map(keyword => (
                            <span key={keyword} style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '2rem', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', color: 'var(--secondary)' }}>
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Internal Linking Section */}
                <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 700 }}>Quick Result Access 🔗</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
                        <a href="/beu-result" style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '1rem', fontWeight: 800, padding: '0.4rem 1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.75rem' }}>Check BEU Result 🔥</a>
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
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), transparent)', 
                border: '1px solid rgba(255,255,255,0.05)',
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
                        background: 'linear-gradient(135deg, var(--primary), #a855f7)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '3rem', 
                        fontWeight: 900, 
                        color: 'white',
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
                            <a href="https://instagram.com/spcreative453" target="_blank" rel="noreferrer" className="premium-btn" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2338 75%, #bc1888 100%)' }}>
                                <Lucide.Instagram size={18} /> Instagram
                            </a>
                            <div style={{ 
                                padding: '0.6rem 1.2rem', 
                                background: 'rgba(255,255,255,0.05)', 
                                borderRadius: '0.75rem', 
                                border: '1px solid rgba(255,255,255,0.1)',
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
            <footer style={{ marginTop: '6rem', padding: '4rem 0 2rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
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
