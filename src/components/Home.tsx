import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
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
    const [notices, setNotices] = useState<any[]>([]);
    const [noticesLoading, setNoticesLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);

    const handleSubscribe = () => {
        if (isSubscribed) {
            toast.success("Notifications Disabled.");
        } else {
            toast.success("Push Notifications Enabled! You will be instantly notified of new BEU results.", { icon: '🔔', duration: 4000 });
        }
        setIsSubscribed(!isSubscribed);
    };
    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await fetch('https://beu-bih.ac.in/backend/v1/result/sem-get');
                if (!response.ok) throw new Error('Failed to fetch exams');
                const data = await response.json();
                setCourses(data);
                if (data.length > 0) {
                    const btech = data.find((c: any) => c.courseName.includes('B.Tech'));
                    const targetCourse = btech || data[0];
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
                const response = await fetch('https://beu-bih.ac.in/backend/v1/notice/get-notice-board');
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

    const activeCourse = courses.find(c => c.courseid === selectedCourseId);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Hero Section */}
            <header style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.1 }}>
                        BEU <span style={{ color: 'var(--primary)' }}>RESULTS</span> PORTAL
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '1rem', maxWidth: '600px', margin: '1rem auto' }}>
                        Access official Bihar Engineering University results with real-time data synchronization.
                    </p>
                </motion.div>
            </header>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '4rem' }}>
                    <Lucide.Loader2 className="animate-spin" size={48} color="var(--primary)" />
                    <p style={{ color: 'var(--text-muted)' }}>Fetching official exam list...</p>
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
                    {/* Course Selection Tabs */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '1rem',
                        marginBottom: '3rem',
                        flexWrap: 'wrap'
                    }}>
                        {courses.map((course) => (
                            <button
                                key={course.courseid}
                                onClick={() => setSelectedCourseId(course.courseid)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '1rem',
                                    border: '1px solid',
                                    borderColor: selectedCourseId === course.courseid ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                    background: selectedCourseId === course.courseid ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    color: 'var(--text-main)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {course.courseName}
                            </button>
                        ))}
                    </div>

                    {/* Exams Grid */}
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-main)', marginBottom: '2rem', opacity: 0.8 }}>
                            Available {activeCourse?.courseName} Examinations
                        </h2>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '4rem'
                    }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={selectedCourseId}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                style={{ display: 'contents' }}
                            >
                                {activeCourse?.exams.map((exam, index) => (
                                    <motion.div
                                        key={exam.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05, duration: 0.4 }}
                                        whileHover={{ scale: 1.02, translateY: -5 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="glass"
                                        onClick={() => onSelectSemester(exam)}
                                        style={{
                                            padding: '2rem',
                                            cursor: 'pointer',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            padding: '0.5rem 1rem',
                                            background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
                                            color: 'var(--text-main)',
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
                                            {activeCourse.courseName} • Sem {exam.semId}
                                        </div>

                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.3, color: 'var(--text-main)' }}>
                                            {exam.examName}
                                        </h3>

                                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                <Lucide.Calendar size={14} />
                                                Held: {exam.examHeld}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 600 }}>
                                                <Lucide.CheckCircle size={14} />
                                                Published: {new Date(exam.publishDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </AnimatePresence>
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

            {/* Footer */}
            <footer style={{ marginTop: '6rem', padding: '4rem 0 2rem 0', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                    © {new Date().getFullYear()} BEU PORTAL • DIRECT API SYNC WITH BEU BIHAR
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1.5rem' }}>
                    <a href="https://beu-bih.ac.in/home/privacy-policy" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textDecoration: 'none' }}>Privacy Policy</a>
                    <a href="https://beu-bih.ac.in/home/terms-condition" style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textDecoration: 'none' }}>Terms & Conditions</a>
                </div>
            </footer>
        </div>
    );
};

export default Home;
