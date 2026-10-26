'use client';
import React, { useState, useRef, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface DashboardProps {
    selectedExam?: any;
    onBack?: () => void;
}

const toRoman = (num: number): string => {
    const romanMap: { [key: number]: string } = {
        1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII'
    };
    return romanMap[num] || num.toString();
};

const Dashboard: React.FC<DashboardProps> = ({ selectedExam, onBack }) => {
    const [regNumber, setRegNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [showNotFound, setShowNotFound] = useState(false);
    const pdfRef = useRef<HTMLDivElement>(null);

    // Dynamic Batch Detection from Reg Number
    // BEU Reg Numbers usually start with batch year digits, e.g., "22..." meaning 2022 batch.
    const detectedBatchYear = (regNumber && regNumber.length >= 2) 
        ? `20${regNumber.substring(0, 2)}` 
        : selectedExam?.batchYear;

    const [branchData, setBranchData] = useState<any>(null);
    const [loadingBranch, setLoadingBranch] = useState(false);
    const [branchSearch, setBranchSearch] = useState('');
    const [branchSort, setBranchSort] = useState<'rank' | 'cgpa' | 'roll'>('rank');

    const fetchBranchStats = async (targetReg: string, semNum: number | string) => {
        try {
            setLoadingBranch(true);
            const res = await fetch(`/api/branch-leaderboard?regNo=${encodeURIComponent(targetReg)}&semester=${encodeURIComponent(semNum.toString())}`);
            if (res.ok) {
                const json = await res.json();
                if (json.status === 200) {
                    setBranchData(json);
                } else {
                    setBranchData(null);
                }
            }
        } catch (e) {
            console.error('Leaderboard error:', e);
            setBranchData(null);
        } finally {
            setLoadingBranch(false);
        }
    };

    const handleSearch = async (overrideRegNo?: string | React.MouseEvent | React.KeyboardEvent, overrideExam?: any) => {
        const targetRegNo = typeof overrideRegNo === 'string' ? overrideRegNo : regNumber;
        if (!targetRegNo) {
            setError('Please enter a registration number');
            toast.error('Please enter a Registration Number!');
            return;
        }
        if (typeof overrideRegNo === 'string') setRegNumber(targetRegNo);

        setError('');
        setShowNotFound(false);
        setLoading(true);
        setResult(null);
        
        const searchToast = toast.loading('Searching University Records...');

        const currentExam = overrideExam || selectedExam;
        const year = currentExam?.batchYear || '2024';
        const semester = toRoman(currentExam?.semId || 0);
        const examHeld = encodeURIComponent(currentExam?.examHeld || '');
        const examId = currentExam?.examId || currentExam?.id || '';
        const examName = encodeURIComponent(currentExam?.examName || currentExam?.name || '');

        try {
            // Official BEU API Call
            // Note: In a production app, this might need a proxy for CORS, but we'll attempt direct fetch
            const url = `/api/fetch-result?year=${year}&redg_no=${targetRegNo}&semester=${semester}&exam_held=${examHeld}&exam_id=${examId}&exam_name=${examName}`;

            const response = await fetch(url);

            if (response.ok) {
                const json = await response.json();

                // Check for official success message or status
                if (json.status !== 200 || !json.data) {
                    throw new Error(json.message || 'Result not found');
                }

                const data = json.data;
                const theory = (data.theorySubjects && data.theorySubjects.length > 0)
                    ? data.theorySubjects
                    : (data.subjects ? data.subjects.filter((s: any) => !s.code?.endsWith('P')) : []);
                const practical = (data.practicalSubjects && data.practicalSubjects.length > 0)
                    ? data.practicalSubjects
                    : (data.subjects ? data.subjects.filter((s: any) => s.code?.endsWith('P')) : []);

                // Map official data to our UI structure
                setResult({
                    name: data.name,
                    rollNo: data.regNo || data.redg_no || targetRegNo,
                    fatherName: data.fatherName || data.father_name || 'N/A',
                    motherName: data.motherName || data.mother_name || 'N/A',
                    college: data.college || data.college_name,
                    course: data.course || 'B.Tech',
                    semester: data.semester || `${currentExam?.semId}th Semester`,
                    sgpa: data.sgpa || 'N/A',
                    allSgpa: data.allSgpa || (data.sgpa ? [data.sgpa] : []),
                    cgpa: data.cgpa || 'N/A',
                    status: data.status || data.fail_any || 'PASSED',
                    theorySubjects: theory?.map((d: any) => ({
                        code: d.code,
                        name: d.name,
                        ese: d.ese || 'N/A',
                        ia: d.ia || 'N/A',
                        total: d.total || (d.point !== undefined ? d.point.toString() : 'N/A'),
                        grade: d.grade,
                        credit: d.credit
                    })) || [],
                    practicalSubjects: practical?.map((d: any) => ({
                        code: d.code,
                        name: d.name,
                        ese: d.ese || 'N/A',
                        ia: d.ia || 'N/A',
                        total: d.total || (d.point !== undefined ? d.point.toString() : 'N/A'),
                        grade: d.grade,
                        credit: d.credit
                    })) || []
                });

                fetchBranchStats(targetRegNo, currentExam?.semId || 1);
                setShowNotFound(false);
                toast.success('Result Found!', { id: searchToast });
                return;
            } else {
                const errJson = await response.json().catch(() => ({}));
                if (errJson.error === 'CAPTCHA_REQUIRED') {
                    // Try DB fallback before giving up
                    try {
                        const dbRes = await fetch(`/api/result/${targetRegNo}?semester=${semester}&examId=${examId}&examName=${examName}`);
                        if (dbRes.ok) {
                            const dbData = await dbRes.json();
                            const dbTheory = (dbData.theorySubjects && dbData.theorySubjects.length > 0)
                                ? dbData.theorySubjects
                                : (dbData.subjects ? dbData.subjects.filter((s: any) => !s.code?.endsWith('P')) : []);
                            const dbPractical = (dbData.practicalSubjects && dbData.practicalSubjects.length > 0)
                                ? dbData.practicalSubjects
                                : (dbData.subjects ? dbData.subjects.filter((s: any) => s.code?.endsWith('P')) : []);

                            setResult({
                                name: dbData.name,
                                rollNo: dbData.regNo,
                                fatherName: dbData.fatherName || 'N/A',
                                motherName: dbData.motherName || 'N/A',
                                college: dbData.college,
                                course: dbData.course || 'Computer Science and Engineering',
                                semester: dbData.semester || `${(overrideExam || selectedExam)?.semId || 6}th Semester`,
                                sgpa: dbData.sgpa?.toString() || 'N/A',
                                allSgpa: dbData.allSgpa || (dbData.sgpa ? [dbData.sgpa.toString()] : []),
                                cgpa: dbData.cgpa?.toString() || 'N/A',
                                status: dbData.status || 'PASSED',
                                theorySubjects: dbTheory.map((s: any) => ({
                                    code: s.code,
                                    name: s.name,
                                    ese: s.ese || 'N/A',
                                    ia: s.ia || 'N/A',
                                    total: s.total || (s.point !== undefined ? s.point.toString() : 'N/A'),
                                    grade: s.grade,
                                    credit: s.credit
                                })),
                                practicalSubjects: dbPractical.map((s: any) => ({
                                    code: s.code,
                                    name: s.name,
                                    ese: s.ese || 'N/A',
                                    ia: s.ia || 'N/A',
                                    total: s.total || (s.point !== undefined ? s.point.toString() : 'N/A'),
                                    grade: s.grade,
                                    credit: s.credit
                                }))
                            });
                            fetchBranchStats(targetRegNo, currentExam?.semId || (overrideExam || selectedExam)?.semId || 1);
                            setShowNotFound(false);
                            toast.success('Result loaded from database backup!', { id: searchToast });
                            return;
                        } else {
                            const errData = await dbRes.json().catch(() => ({}));
                            if (errData.isSupplementaryNotFound) {
                                setShowNotFound(false);
                                setLoading(false);
                                setError(errData.message);
                                toast.error(errData.message, { id: searchToast, duration: 6000 });
                                return;
                            }
                        }
                    } catch (dbErr) {
                        console.error('Local database lookup failed:', dbErr);
                    }

                    setShowNotFound(true);
                    throw new Error('BEU university server requires Cloudflare verification for live un-cached results.');
                }
                throw new Error(errJson.error || 'Official server is currently unresponsive.');
            }
        } catch (err: any) {
            console.error(err);

            // Additional attempt to load from database backup
            try {
                const dbRes = await fetch(`/api/result/${targetRegNo}?semester=${semester}&examId=${examId}&examName=${examName}`);
                if (dbRes.ok) {
                    const dbData = await dbRes.json();
                    const dbTheory = (dbData.theorySubjects && dbData.theorySubjects.length > 0)
                        ? dbData.theorySubjects
                        : (dbData.subjects ? dbData.subjects.filter((s: any) => !s.code?.endsWith('P')) : []);
                    const dbPractical = (dbData.practicalSubjects && dbData.practicalSubjects.length > 0)
                        ? dbData.practicalSubjects
                        : (dbData.subjects ? dbData.subjects.filter((s: any) => s.code?.endsWith('P')) : []);

                    setResult({
                        name: dbData.name,
                        rollNo: dbData.regNo,
                        fatherName: dbData.fatherName || 'N/A',
                        motherName: dbData.motherName || 'N/A',
                        college: dbData.college,
                        course: dbData.course || 'Computer Science and Engineering',
                        semester: dbData.semester || `${(overrideExam || selectedExam)?.semId || 6}th Semester`,
                        sgpa: dbData.sgpa?.toString() || 'N/A',
                        allSgpa: dbData.allSgpa || (dbData.sgpa ? [dbData.sgpa.toString()] : []),
                        cgpa: dbData.cgpa?.toString() || 'N/A',
                        status: dbData.status || 'PASSED',
                        theorySubjects: dbTheory.map((s: any) => ({
                            code: s.code,
                            name: s.name,
                            ese: s.ese || 'N/A',
                            ia: s.ia || 'N/A',
                            total: s.total || (s.point !== undefined ? s.point.toString() : 'N/A'),
                            grade: s.grade,
                            credit: s.credit
                        })),
                        practicalSubjects: dbPractical.map((s: any) => ({
                            code: s.code,
                            name: s.name,
                            ese: s.ese || 'N/A',
                            ia: s.ia || 'N/A',
                            total: s.total || (s.point !== undefined ? s.point.toString() : 'N/A'),
                            grade: s.grade,
                            credit: s.credit
                        }))
                    });
                    fetchBranchStats(targetRegNo, currentExam?.semId || (overrideExam || selectedExam)?.semId || 1);
                    setShowNotFound(false);
                    toast.success('Result loaded from database backup!', { id: searchToast });
                    return;
                } else {
                    const errData = await dbRes.json().catch(() => ({}));
                    if (errData.isSupplementaryNotFound) {
                        setShowNotFound(false);
                        setLoading(false);
                        setError(errData.message);
                        toast.error(errData.message, { id: searchToast, duration: 6000 });
                        return;
                    }
                }
            } catch (dbErr) {
                console.error('Local database lookup failed:', dbErr);
            }

            setShowNotFound(true);
            setError(err.message || 'Result not found or university server required verification.');
            toast.error(err.message || 'Result Not Found', { id: searchToast });
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        // We rely on native browser print -> Save as PDF.
        // This avoids html2canvas crashing on backdrop-filter (glassmorphism) and keeps text selectable.
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handleNextStudent = () => {
        if (!regNumber || isNaN(Number(regNumber))) return;
        const nextReg = (Number(regNumber) + 1).toString();
        handleSearch(nextReg);
    };

    const handlePrevStudent = () => {
        if (!regNumber || isNaN(Number(regNumber))) return;
        const prevReg = (Number(regNumber) - 1).toString();
        handleSearch(prevReg);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
            <div className="no-print" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                {onBack && (
                    <button
                        onClick={onBack}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-main)',
                            padding: '0.5rem',
                            borderRadius: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="Back to Home"
                    >
                        <Lucide.ArrowLeft size={20} />
                    </button>
                )}
                {selectedExam && (
                    <div style={{
                        background: 'linear-gradient(45deg, var(--primary), #a855f7)',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '2rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'white',
                        boxShadow: '0 4px 12px var(--primary-glow)'
                    }}>
                        {selectedExam.examName.split('Examination')[0].trim().toUpperCase()}
                    </div>
                )}
            </div>

            <header className="no-print" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    BEU <span style={{ color: 'var(--primary)' }}>PRECISION</span>
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>Official University Result Engine</p>
            </header>

            <div className="no-print" style={{ position: 'relative', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button className="premium-btn" onClick={handlePrevStudent} style={{ flexShrink: 0, padding: '0.8rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }} title="Previous Student">
                        <Lucide.ChevronLeft size={18} />
                    </button>
                    <div className="glass" style={{ flexGrow: 1, padding: '0.4rem', display: 'flex', gap: '0.5rem', borderRadius: '1.25rem' }}>
                        <input
                            type="text"
                            className="premium-input"
                            placeholder="Registration No (e.g. 21101110001)"
                            value={regNumber}
                            onKeyPress={(e: any) => e.key === 'Enter' && handleSearch()}
                            onChange={(e) => setRegNumber(e.target.value)}
                            style={{ border: 'none', background: 'transparent', width: '100%' }}
                        />
                        <button className="premium-btn" onClick={handleSearch} disabled={loading} style={{ flexShrink: 0 }}>
                            {loading ? <Lucide.Loader2 className="animate-spin" size={18} /> : <Lucide.Search size={18} />}
                        </button>
                    </div>
                    <button className="premium-btn" onClick={handleNextStudent} style={{ flexShrink: 0, padding: '0.8rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }} title="Next Student">
                        <Lucide.ChevronRight size={18} />
                    </button>
                </div>
                {showNotFound && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="glass"
                        style={{ 
                            padding: '1.5rem', 
                            marginTop: '1.5rem', 
                            borderRadius: '1rem',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.05)',
                            textAlign: 'center',
                            maxWidth: '650px',
                            margin: '1.5rem auto 0'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#ef4444', marginBottom: '0.5rem' }}>
                            <Lucide.AlertCircle size={22} />
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Record Not Found</h4>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0', lineHeight: 1.5 }}>
                            The marksheet for Registration Number <b>{regNumber}</b> ({selectedExam?.examName || 'this exam'}) is not found in database records. Please double check the Registration Number or verify if the result was published.
                        </p>
                    </motion.div>
                )}
                {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: 'var(--accent)', textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem' }}>{error}</motion.div>}
            </div>

            <AnimatePresence>
                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="student-card" style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <motion.div 
                            animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }} 
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            style={{ display: 'inline-block', marginBottom: '1rem' }}
                        >
                            <Lucide.Scan size={48} color="var(--primary)" />
                        </motion.div>
                        <h3 style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 600 }}>Searching University Records...</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Retrieving student marksheet</p>
                    </motion.div>
                )}

                {result && !loading && (
                    <motion.div ref={pdfRef} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="student-card marksheet-container" style={{ background: '#fff', color: '#000', borderRadius: '4px', border: '1px solid #000', padding: '1.5rem', fontFamily: 'Arial, "Segoe UI", sans-serif', maxWidth: '850px', margin: '0 auto', position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                        <style>{`
                            @media print {
                                @page {
                                    size: A4 portrait;
                                    margin: 8mm;
                                }
                                body {
                                    background: #fff !important;
                                    color: #000 !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                }
                                .no-print {
                                    display: none !important;
                                }
                                .marksheet-container {
                                    border: 1px solid #000 !important;
                                    box-shadow: none !important;
                                    padding: 10mm !important;
                                    width: 100% !important;
                                    max-width: 100% !important;
                                    margin: 0 !important;
                                }
                                .official-table th, .official-table td {
                                    border: 1px solid #000 !important;
                                }
                                .bg-secondary-beu {
                                    background-color: #6c757d !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                    color: #fff !important;
                                }
                                .text-danger-beu {
                                    color: #dc3545 !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }
                                .watermark-wrapper {
                                    opacity: 0.08 !important;
                                    -webkit-print-color-adjust: exact !important;
                                    print-color-adjust: exact !important;
                                }
                            }

                            .official-table { width: 100%; border-collapse: collapse; margin-bottom: 0.85rem; font-size: 0.82rem; color: #000; }
                            .official-table th, .official-table td { border: 1px solid #000; padding: 0.32rem 0.45rem; text-align: left; }
                            .official-table th { text-align: center; font-weight: bold; background: #f8f9fa; color: #000; }
                            .official-table .center { text-align: center; }
                            .bg-secondary-beu { background-color: #6c757d; color: #fff; font-weight: 700; padding: 0.35rem 0.5rem; margin: 0.75rem 0 0 0; font-size: 0.82rem; letter-spacing: 0.5px; }
                            .text-danger-beu { color: #dc3545; font-weight: 700; }
                            .watermark-overlay { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%); font-size: 55px; color: rgba(200, 0, 0, 0.08); z-index: 0; pointer-events: none; user-select: none; font-weight: 900; letter-spacing: 4px; }
                            .watermark-wrapper { position: absolute; top: 38%; left: 50%; transform: translate(-50%, -50%); z-index: 0; text-align: center; opacity: 0.08; pointer-events: none; user-select: none; width: 80%; }
                            .watermark-logo { border-radius: 50%; width: 130px; margin: 0 auto 0.5rem auto; display: block; }
                            .watermark-text { color: #dc3545; font-weight: 900; font-size: 1.3rem; white-space: nowrap; text-transform: uppercase; margin: 0; }
                        `}</style>

                        {/* Top Watermark Overlay */}
                        <div className="watermark-overlay no-print">WEB COPY</div>

                        {/* Background Watermark */}
                        <div className="watermark-wrapper">
                            <img src="/beu-logo.jpg" alt="" className="watermark-logo" />
                            <h1 className="watermark-text">BIHAR ENGINEERING UNIVERSITY, PATNA</h1>
                        </div>

                        {/* Official Header */}
                        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '2px solid #000', paddingBottom: '0.75rem' }}>
                            <img src="/beu-logo.jpg" alt="BEU Logo" style={{ width: '95px', height: '95px', objectFit: 'contain', flexShrink: 0 }} />
                            <div style={{ textAlign: 'center', width: '100%', padding: '0 0.5rem' }}>
                                <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0', color: '#000', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                    Bihar Engineering University, Patna
                                </h1>
                                <h2 className="text-danger-beu" style={{ fontSize: '1.05rem', margin: '0.3rem 0 0 0', fontWeight: 700 }}>
                                    {selectedExam?.examName || `${result.course || 'B.Tech.'} ${result.semester || '6th Semester'} Examination`}
                                </h2>
                            </div>
                            <div style={{ width: '95px', flexShrink: 0 }} /> {/* Spacer for balance */}
                        </div>

                        {/* Details Table */}
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <table className="official-table">
                                <tbody>
                                    <tr>
                                        <td style={{ width: '25%' }}><strong>Semester:</strong></td>
                                        <td style={{ width: '25%' }}>{toRoman(result?.semester ? parseInt(result.semester) : (selectedExam?.semId || 6))}</td>
                                        <td style={{ width: '25%' }}><strong>Examination (Month/Year):</strong></td>
                                        <td style={{ width: '25%' }}>{result.examHeld || selectedExam?.examHeld || 'November/2025'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Registration No:</strong></td>
                                        <td colSpan={3} style={{ fontWeight: 700 }}>{result.rollNo}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Student Name:</strong></td>
                                        <td colSpan={3} style={{ fontWeight: 700 }}>{result.name}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Father's Name:</strong></td>
                                        <td>{result.fatherName || 'N/A'}</td>
                                        <td><strong>Mother's Name:</strong></td>
                                        <td>{result.motherName || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>College Name:</strong></td>
                                        <td colSpan={3}>{result.college}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Course Name:</strong></td>
                                        <td colSpan={3}>{result.course}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Theory Subjects */}
                            <div className="bg-secondary-beu">THEORY</div>
                            <table className="official-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '15%' }}>Subject Code</th>
                                        <th style={{ width: '45%' }}>Subject Name</th>
                                        <th style={{ width: '8%' }}>ESE</th>
                                        <th style={{ width: '8%' }}>IA</th>
                                        <th style={{ width: '8%' }}>Total</th>
                                        <th style={{ width: '8%' }}>Grade</th>
                                        <th style={{ width: '8%' }}>Credit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.theorySubjects && result.theorySubjects.length > 0 ? result.theorySubjects.map((sub: any, idx: number) => (
                                        <tr key={`th-${idx}`}>
                                            <td className="center">{sub.code}</td>
                                            <td>{sub.name}</td>
                                            <td className="center">{sub.ese}</td>
                                            <td className="center">{sub.ia}</td>
                                            <td className="center">{sub.total}</td>
                                            <td className="center" style={{ fontWeight: 700 }}>{sub.grade}</td>
                                            <td className="center">{sub.credit}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={7} className="center">No theory subjects recorded</td></tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Practical Subjects */}
                            {result.practicalSubjects && result.practicalSubjects.length > 0 && (
                                <>
                                    <div className="bg-secondary-beu">PRACTICAL</div>
                                    <table className="official-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '15%' }}>Subject Code</th>
                                                <th style={{ width: '45%' }}>Subject Name</th>
                                                <th style={{ width: '8%' }}>ESE</th>
                                                <th style={{ width: '8%' }}>IA</th>
                                                <th style={{ width: '8%' }}>Total</th>
                                                <th style={{ width: '8%' }}>Grade</th>
                                                <th style={{ width: '8%' }}>Credit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.practicalSubjects.map((sub: any, idx: number) => (
                                                <tr key={`pr-${idx}`}>
                                                    <td className="center">{sub.code}</td>
                                                    <td>{sub.name}</td>
                                                    <td className="center">{sub.ese}</td>
                                                    <td className="center">{sub.ia}</td>
                                                    <td className="center">{sub.total}</td>
                                                    <td className="center" style={{ fontWeight: 700 }}>{sub.grade}</td>
                                                    <td className="center">{sub.credit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {/* SGPA / CGPA */}
                            <div className="bg-secondary-beu">SGPA / CGPA</div>
                            <table className="official-table" style={{ textAlign: 'center' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'center', width: '12%' }}>Semester</th>
                                        <th>I</th>
                                        <th>II</th>
                                        <th>III</th>
                                        <th>IV</th>
                                        <th>V</th>
                                        <th>VI</th>
                                        <th>VII</th>
                                        <th>VIII</th>
                                        <th style={{ width: '14%' }}>Cur. CGPA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ fontWeight: 700, textAlign: 'center' }}>SGPA</td>
                                        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                                            <td key={`sgpa-${i}`} className="center">
                                                {result.allSgpa && result.allSgpa[i] ? result.allSgpa[i] : '-'}
                                            </td>
                                        ))}
                                        <td className="center" style={{ fontWeight: 700 }}>{result.cgpa}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Remarks */}
                            <div style={{ border: '1px solid #000', padding: '0.45rem 0.6rem', margin: '0.75rem 0', fontSize: '0.85rem' }}>
                                <strong style={{ color: '#000' }}>Remarks: &nbsp;&nbsp;</strong>
                                <span className="text-danger-beu">
                                    {result.status || 'PASS'}
                                </span>
                            </div>

                            {/* Notes */}
                            <div style={{ marginTop: '0.5rem' }}>
                                <strong style={{ fontSize: '0.82rem', color: '#000' }}>Note:</strong>
                                <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', fontSize: '0.72rem', lineHeight: '1.4', margin: '0.2rem 0 0 0', color: '#222' }}>
                                    <li><b>ESE:</b> End Semester Exam</li>
                                    <li><b>IA:</b> Internal Assessment</li>
                                    <li><b>SGPA:</b> Semester Grade Point Average</li>
                                    <li><b>CGPA:</b> Cumulative Grade Point Average</li>
                                    <li><b>AB:</b> Absent</li>
                                    <li><b>NA:</b> Not Applicable</li>
                                    <li><b>N/A:</b> Not Available</li>
                                    <li><b>NE:</b> Not Eligible for Assessment/Exam</li>
                                    <li><b>*:</b> Passed Under Regulation(UR)</li>
                                    <li><b>CA:</b> Cancellation of Assessment</li>
                                    <li><b>UMC:</b> Unfair Mean Case</li>
                                    <li><b>WEB COPY:</b> Not valid for official purpose.</li>
                                    <li>University does not own for errors or omissions, if any, in the statement.</li>
                                </ul>
                            </div>

                            {/* Print / Download Button */}
                            <div className="no-print" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                                <button
                                    className="premium-btn"
                                    onClick={handlePrint}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        padding: '0.75rem 1.8rem',
                                        fontSize: '0.95rem',
                                        borderRadius: '2rem',
                                        boxShadow: '0 6px 20px var(--primary-glow)'
                                    }}
                                >
                                    <Lucide.Printer size={18} />
                                    Download Marksheet (PDF)
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Branch Analytics & Peer Leaderboard (Only SGPA & CGPA) */}
                {result && !loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="no-print"
                        style={{ maxWidth: '850px', margin: '2.5rem auto 0 auto' }}
                    >
                        {loadingBranch && (
                            <div className="glass" style={{ padding: '2rem', textAlign: 'center', borderRadius: '1.25rem', marginBottom: '2rem' }}>
                                <Lucide.Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 0.75rem auto', color: 'var(--primary)' }} />
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                                    Loading Branch Leaderboard & Classmate Standing...
                                </p>
                            </div>
                        )}

                        {branchData && branchData.branchInfo && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                
                                {/* Header Card */}
                                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                                                <div style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', padding: '0.45rem', borderRadius: '0.6rem', display: 'flex', color: 'white' }}>
                                                    <Lucide.Trophy size={20} />
                                                </div>
                                                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                                                    Branch Standing & Peer Analytics
                                                </h2>
                                            </div>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                                                <strong style={{ color: 'var(--text-main)' }}>{branchData.branchInfo.course}</strong> &bull; {branchData.branchInfo.college} &bull; Semester {branchData.branchInfo.semester}
                                            </p>
                                        </div>

                                        {/* Current Student Standing Badge */}
                                        {branchData.currentStudent && (
                                            <div style={{
                                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(168, 85, 247, 0.15))',
                                                border: '1px solid rgba(59, 130, 246, 0.35)',
                                                borderRadius: '1rem',
                                                padding: '0.75rem 1.25rem',
                                                textAlign: 'right'
                                            }}>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                                    Your Branch Standing
                                                </div>
                                                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--primary)' }}>
                                                    Rank #{branchData.currentStudent.rank} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>of {branchData.currentStudent.total}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats Grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                        gap: '0.75rem',
                                        marginTop: '1.25rem',
                                        paddingTop: '1.25rem',
                                        borderTop: '1px solid var(--glass-border)'
                                    }}>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Class Strength</div>
                                            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>{branchData.branchInfo.totalStudents}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Average SGPA</div>
                                            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.2rem' }}>{branchData.branchInfo.avgSgpa}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Branch Highest SGPA</div>
                                            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981', marginTop: '0.2rem' }}>{branchData.branchInfo.highestSgpa}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Branch Lowest SGPA</div>
                                            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.2rem' }}>{branchData.branchInfo.lowestSgpa}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.75rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pass Rate</div>
                                            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981', marginTop: '0.2rem' }}>{branchData.branchInfo.passPercentage}%</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Toppers and Lowest Highlights Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
                                    
                                    {/* 👑 Branch Toppers Card */}
                                    <div className="glass" style={{ padding: '1.25rem', borderRadius: '1.25rem', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f59e0b' }}>
                                            <Lucide.Crown size={20} />
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Branch Toppers (Top SGPA)</h3>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            {branchData.toppers && branchData.toppers.map((t: any, idx: number) => {
                                                const medalColor = idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : '#cd7f32';
                                                const isCurrent = t.regNo === result.rollNo;
                                                return (
                                                    <div
                                                        key={`topper-${t.regNo}`}
                                                        onClick={() => handleSearch(t.regNo)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '0.65rem 0.9rem',
                                                            background: isCurrent ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                            border: isCurrent ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--glass-border)',
                                                            borderRadius: '0.75rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        title="Click to view full marksheet"
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <span style={{
                                                                width: '26px',
                                                                height: '26px',
                                                                borderRadius: '50%',
                                                                background: medalColor,
                                                                color: '#000',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 800,
                                                                fontSize: '0.8rem'
                                                            }}>
                                                                {idx + 1}
                                                            </span>
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                                                    {t.name} {isCurrent && <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}> (You)</span>}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.regNo}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#10b981' }}>
                                                                SGPA: {t.sgpa}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                CGPA: {t.cgpa}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 📉 Lowest Scorers Card */}
                                    <div className="glass" style={{ padding: '1.25rem', borderRadius: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#ef4444' }}>
                                            <Lucide.TrendingDown size={20} />
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Lower SGPA Range</h3>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            {branchData.lowest && branchData.lowest.map((l: any, idx: number) => {
                                                const isCurrent = l.regNo === result.rollNo;
                                                return (
                                                    <div
                                                        key={`lowest-${l.regNo}`}
                                                        onClick={() => handleSearch(l.regNo)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '0.65rem 0.9rem',
                                                            background: isCurrent ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                            border: isCurrent ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--glass-border)',
                                                            borderRadius: '0.75rem',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        title="Click to view full marksheet"
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <span style={{
                                                                width: '26px',
                                                                height: '26px',
                                                                borderRadius: '50%',
                                                                background: 'rgba(239, 68, 68, 0.2)',
                                                                color: '#ef4444',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 700,
                                                                fontSize: '0.75rem'
                                                            }}>
                                                                #{l.rank}
                                                            </span>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                                                    {l.name} {isCurrent && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}> (You)</span>}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{l.regNo}</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ef4444' }}>
                                                                SGPA: {l.sgpa}
                                                            </div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                CGPA: {l.cgpa}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* 📋 All Branch Students List (ONLY SGPA & CGPA) */}
                                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1.25rem', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Lucide.Users size={18} color="var(--primary)" />
                                                All Branch Students (SGPA & CGPA Only)
                                            </h3>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                                                Showing {branchData.students.length} students &bull; Click any student to view their marksheet
                                            </p>
                                        </div>

                                        {/* Filter & Sort Controls */}
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <div style={{ position: 'relative', minWidth: '200px' }}>
                                                <Lucide.Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input
                                                    type="text"
                                                    placeholder="Filter name or roll..."
                                                    value={branchSearch}
                                                    onChange={(e) => setBranchSearch(e.target.value)}
                                                    style={{
                                                        padding: '0.45rem 0.75rem 0.45rem 2rem',
                                                        borderRadius: '0.6rem',
                                                        border: '1px solid var(--glass-border)',
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        color: 'var(--text-main)',
                                                        fontSize: '0.82rem',
                                                        outline: 'none',
                                                        width: '100%'
                                                    }}
                                                />
                                            </div>

                                            <select
                                                value={branchSort}
                                                onChange={(e: any) => setBranchSort(e.target.value)}
                                                style={{
                                                    padding: '0.45rem 0.75rem',
                                                    borderRadius: '0.6rem',
                                                    border: '1px solid var(--glass-border)',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    color: 'var(--text-main)',
                                                    fontSize: '0.82rem',
                                                    outline: 'none'
                                                }}
                                            >
                                                <option value="rank">Sort by SGPA (Rank)</option>
                                                <option value="cgpa">Sort by CGPA</option>
                                                <option value="roll">Sort by Roll Number</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                                                    <th style={{ padding: '0.6rem 0.75rem', width: '8%', textAlign: 'center' }}>Rank</th>
                                                    <th style={{ padding: '0.6rem 0.75rem', width: '22%' }}>Reg. No</th>
                                                    <th style={{ padding: '0.6rem 0.75rem', width: '30%' }}>Student Name</th>
                                                    <th style={{ padding: '0.6rem 0.75rem', width: '13%', textAlign: 'center' }}>SGPA</th>
                                                    <th style={{ padding: '0.6rem 0.75rem', width: '13%', textAlign: 'center' }}>CGPA</th>
                                                    <th style={{ padding: '0.6rem 0.75rem', width: '14%', textAlign: 'center' }}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {branchData.students
                                                    .filter((s: any) => {
                                                        if (!branchSearch) return true;
                                                        const q = branchSearch.toLowerCase();
                                                        return s.name.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q);
                                                    })
                                                    .sort((a: any, b: any) => {
                                                        if (branchSort === 'cgpa') {
                                                            return (b.numericCgpa || 0) - (a.numericCgpa || 0);
                                                        }
                                                        if (branchSort === 'roll') {
                                                            return a.regNo.localeCompare(b.regNo);
                                                        }
                                                        return a.rank - b.rank;
                                                    })
                                                    .map((s: any) => {
                                                        const isCurrent = s.regNo === result.rollNo;
                                                        const isPassed = (s.status || '').toUpperCase() === 'PASSED' || (s.status || '').toUpperCase() === 'PASS';
                                                        return (
                                                            <tr
                                                                key={`row-${s.regNo}`}
                                                                onClick={() => handleSearch(s.regNo)}
                                                                style={{
                                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                                                    background: isCurrent ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                                                                    cursor: 'pointer',
                                                                    transition: 'background 0.15s ease'
                                                                }}
                                                                title="Click to view marksheet"
                                                            >
                                                                <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>
                                                                    {s.rank <= 3 ? (
                                                                        <span style={{
                                                                            background: s.rank === 1 ? '#f59e0b' : s.rank === 2 ? '#94a3b8' : '#cd7f32',
                                                                            color: '#000',
                                                                            borderRadius: '50%',
                                                                            width: '20px',
                                                                            height: '20px',
                                                                            display: 'inline-flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: '0.75rem'
                                                                        }}>
                                                                            {s.rank}
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ color: 'var(--text-muted)' }}>#{s.rank}</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', color: isCurrent ? 'var(--primary)' : 'var(--text-main)', fontWeight: isCurrent ? 700 : 500 }}>
                                                                    {s.regNo}
                                                                </td>
                                                                <td style={{ padding: '0.65rem 0.75rem', fontWeight: isCurrent ? 700 : 500, color: 'var(--text-main)' }}>
                                                                    {s.name}
                                                                    {isCurrent && (
                                                                        <span style={{
                                                                            marginLeft: '0.5rem',
                                                                            background: 'var(--primary)',
                                                                            color: 'white',
                                                                            fontSize: '0.65rem',
                                                                            padding: '0.15rem 0.4rem',
                                                                            borderRadius: '1rem',
                                                                            fontWeight: 700
                                                                        }}>
                                                                            You
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 800, color: s.numericSgpa && s.numericSgpa >= 8.0 ? '#10b981' : s.numericSgpa && s.numericSgpa >= 6.5 ? '#3b82f6' : '#f59e0b' }}>
                                                                    {s.sgpa}
                                                                </td>
                                                                <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-main)' }}>
                                                                    {s.cgpa}
                                                                </td>
                                                                <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                                                                    <span style={{
                                                                        fontSize: '0.7rem',
                                                                        fontWeight: 700,
                                                                        padding: '0.2rem 0.5rem',
                                                                        borderRadius: '1rem',
                                                                        background: isPassed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                        color: isPassed ? '#10b981' : '#ef4444'
                                                                    }}>
                                                                        {s.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
