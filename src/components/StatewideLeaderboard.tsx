'use client';
import React, { useState, useEffect, useMemo } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface StudentTopper {
  rank: number;
  regNo: string;
  name: string;
  college: string;
  course: string;
  semester: string;
  sgpa: string;
  cgpa: string;
  status: string;
  numericSgpa: number | null;
  numericCgpa: number | null;
  rankingScore: number | null;
  examName?: string;
}

interface CollegeRanking {
  rank: number;
  college: string;
  totalStudents: number;
  passedCount: number;
  passPercentage: number;
  avgSgpa: number;
  highestSgpa: number;
  topStudent: {
    name: string;
    regNo: string;
    sgpa: string;
    course: string;
  } | null;
}

interface LeaderboardData {
  status: number;
  totalMatched: number;
  overview: {
    totalStudents: number;
    totalColleges: number;
    avgSgpa: string;
    passPercentage: string;
    highestScore: number | string;
  };
  toppers: StudentTopper[];
  collegeRankings: CollegeRanking[];
}

interface StatewideLeaderboardProps {
  onBack: () => void;
  onViewStudentResult: (regNo: string, semester?: string) => void;
}

const COURSES_LIST = [
  { id: 'all', label: 'All Branches' },
  { id: 'COMPUTER SCIENCE & ENGINEERING', label: 'CSE' },
  { id: 'CIVIL ENGINEERING', label: 'Civil' },
  { id: 'MECHANICAL ENGINEERING', label: 'Mechanical' },
  { id: 'ELECTRICAL ENGINEERING', label: 'Electrical (EE)' },
  { id: 'ELECTRONICS & COMMUNICATION ENGINEERING', label: 'ECE' },
  { id: 'ELECTRICAL & ELECTRONICS ENGINEERING', label: 'EEE' },
  { id: 'INFORMATION TECHNOLOGY', label: 'IT' },
  { id: 'Computer Science and Engineering (Artificial Intelligence)', label: 'CSE (AI)' },
  { id: 'Computer Science and Engineering (Artificial Intelligence and Machine Learning)', label: 'CSE (AI & ML)' },
  { id: 'Computer Science and Engineering (Data Science)', label: 'CSE (Data Science)' },
  { id: 'Computer Science and Engineering (Cyber Security)', label: 'CSE (Cyber Security)' },
];

export default function StatewideLeaderboard({ onBack, onViewStudentResult }: StatewideLeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'toppers' | 'colleges'>('toppers');
  const [batch, setBatch] = useState<string>('all');
  const [semester, setSemester] = useState<string>('all');
  const [course, setCourse] = useState<string>('all');
  const [metric, setMetric] = useState<'sgpa' | 'cgpa'>('sgpa');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<LeaderboardData | null>(null);

  // Fetch leaderboard data
  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (batch !== 'all') params.append('batch', batch);
      if (semester !== 'all') params.append('semester', semester);
      if (course !== 'all') params.append('course', course);
      params.append('metric', metric);
      params.append('limit', '100');

      const res = await fetch(`/api/statewide-leaderboard?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load leaderboard data');
      const json = await res.json();
      if (json.status === 200) {
        setData(json);
      } else {
        toast.error(json.error || 'Could not fetch rankings');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Network error loading leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [batch, semester, course, metric]);

  // Client-side search filtering
  const filteredToppers = useMemo(() => {
    if (!data?.toppers) return [];
    if (!searchQuery.trim()) return data.toppers;
    const q = searchQuery.toLowerCase();
    return data.toppers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.regNo.toLowerCase().includes(q) ||
      s.college.toLowerCase().includes(q) ||
      s.course.toLowerCase().includes(q)
    );
  }, [data?.toppers, searchQuery]);

  const filteredColleges = useMemo(() => {
    if (!data?.collegeRankings) return [];
    if (!searchQuery.trim()) return data.collegeRankings;
    const q = searchQuery.toLowerCase();
    return data.collegeRankings.filter(c =>
      c.college.toLowerCase().includes(q) ||
      (c.topStudent && c.topStudent.name.toLowerCase().includes(q))
    );
  }, [data?.collegeRankings, searchQuery]);

  const topThree = useMemo(() => {
    return filteredToppers.slice(0, 3);
  }, [filteredToppers]);

  const remainingToppers = useMemo(() => {
    return filteredToppers.slice(3);
  }, [filteredToppers]);

  return (
    <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '1rem' }}>
      
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <button
          onClick={onBack}
          type="button"
          className="hover-scale glass"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.1rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            color: 'var(--text-main)',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Lucide.ArrowLeft size={16} />
          <span>Back to Result Portal</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#10B981',
            background: 'rgba(16, 185, 129, 0.12)',
            padding: '0.35rem 0.75rem',
            borderRadius: '1rem',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }}></span>
            Live BEU Statewide Database
          </span>
        </div>
      </div>

      {/* Main Banner Hero */}
      <div
        className="glass"
        style={{
          padding: 'clamp(1.5rem, 3vw, 2.25rem)',
          borderRadius: '1.25rem',
          border: '1px solid var(--border)',
          background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.08) 0%, rgba(56, 189, 248, 0.05) 100%)',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ maxWidth: '780px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#F59E0B', fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            <Lucide.Trophy size={16} />
            <span>Bihar Engineering University (BEU) Merit Board</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.2, margin: '0 0 0.75rem 0' }}>
            Statewide Toppers & College Rankings
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
            Real-time merit rankings across all 38+ Government and Affiliated Engineering Colleges in Bihar. Compare performance by branch, semester, and college.
          </p>
        </div>

        {/* Overview Stat Counters */}
        {data?.overview && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginTop: '1.75rem'
          }}>
            <div className="glass" style={{ padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid var(--border)', background: 'var(--card)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>CANDIDATES ANALYZED</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                {data.overview.totalStudents.toLocaleString()}+
              </div>
            </div>

            <div className="glass" style={{ padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid var(--border)', background: 'var(--card)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>COLLEGES REPRESENTED</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38BDF8', marginTop: '0.2rem' }}>
                {data.overview.totalColleges} Colleges
              </div>
            </div>

            <div className="glass" style={{ padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid var(--border)', background: 'var(--card)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATE AVG SGPA</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981', marginTop: '0.2rem' }}>
                {data.overview.avgSgpa}
              </div>
            </div>

            <div className="glass" style={{ padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid var(--border)', background: 'var(--card)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>OVERALL PASS RATE</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.2rem' }}>
                {data.overview.passPercentage}%
              </div>
            </div>

            <div className="glass" style={{ padding: '0.85rem 1rem', borderRadius: '0.85rem', border: '1px solid var(--border)', background: 'var(--card)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>HIGHEST STATE SCORE</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#EC4899', marginTop: '0.2rem' }}>
                {data.overview.highestScore}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Switcher: State Toppers vs College Rankings */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('toppers')}
          type="button"
          style={{
            padding: '0.7rem 1.4rem',
            borderRadius: '0.85rem',
            border: activeTab === 'toppers' ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: activeTab === 'toppers' ? 'var(--primary)' : 'var(--card)',
            color: activeTab === 'toppers' ? '#fff' : 'var(--text-main)',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: activeTab === 'toppers' ? '0 4px 14px rgba(var(--primary-rgb), 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Lucide.Medal size={18} />
          <span>Statewide Student Toppers</span>
        </button>

        <button
          onClick={() => setActiveTab('colleges')}
          type="button"
          style={{
            padding: '0.7rem 1.4rem',
            borderRadius: '0.85rem',
            border: activeTab === 'colleges' ? '1px solid #38BDF8' : '1px solid var(--border)',
            background: activeTab === 'colleges' ? '#0284C7' : 'var(--card)',
            color: activeTab === 'colleges' ? '#fff' : 'var(--text-main)',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: activeTab === 'colleges' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Lucide.Building2 size={18} />
          <span>College Standings & Rankings</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        className="glass"
        style={{
          padding: '1.25rem',
          borderRadius: '1rem',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
          
          {/* Batch Selector */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
              BATCH
            </label>
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.65rem',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, rgba(255,255,255,0.05))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Batches</option>
              <option value="22">Batch 2022-26</option>
              <option value="23">Batch 2023-27</option>
              <option value="24">Batch 2024-28</option>
              <option value="25">Batch 2025-29</option>
            </select>
          </div>

          {/* Semester Selector */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
              SEMESTER
            </label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.65rem',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, rgba(255,255,255,0.05))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Semesters</option>
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
              <option value="3">3rd Semester</option>
              <option value="4">4th Semester</option>
              <option value="5">5th Semester</option>
              <option value="6">6th Semester</option>
              <option value="7">7th Semester</option>
              <option value="8">8th Semester</option>
            </select>
          </div>

          {/* Branch Selector */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
              BRANCH / COURSE
            </label>
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.65rem',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, rgba(255,255,255,0.05))',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {COURSES_LIST.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Metric Toggle */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>
              RANK BY
            </label>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setMetric('sgpa')}
                style={{
                  flex: 1,
                  padding: '0.62rem 0.5rem',
                  borderRadius: '0.65rem',
                  border: metric === 'sgpa' ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: metric === 'sgpa' ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
                  color: metric === 'sgpa' ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                SGPA
              </button>
              <button
                type="button"
                onClick={() => setMetric('cgpa')}
                style={{
                  flex: 1,
                  padding: '0.62rem 0.5rem',
                  borderRadius: '0.65rem',
                  border: metric === 'cgpa' ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: metric === 'cgpa' ? 'rgba(var(--primary-rgb), 0.15)' : 'transparent',
                  color: metric === 'cgpa' ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                CGPA
              </button>
            </div>
          </div>
        </div>

        {/* Live Search Input */}
        <div style={{ position: 'relative' }}>
          <Lucide.Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={activeTab === 'toppers' ? "Search student name, roll number, college or branch..." : "Search college name or top student..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 2.6rem',
              borderRadius: '0.75rem',
              border: '1px solid var(--border)',
              background: 'var(--input-bg, rgba(255,255,255,0.03))',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              type="button"
              style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <Lucide.X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Loading Shimmer */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="loader" style={{ margin: '0 auto 1.5rem auto' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 600 }}>
            Analyzing Bihar Engineering University records...
          </p>
        </div>
      )}

      {/* Tab 1: Student Toppers */}
      {!loading && activeTab === 'toppers' && (
        <>
          {/* Top 3 Podium (Shown if at least 3 toppers found) */}
          {topThree.length >= 3 && !searchQuery && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2.5rem',
              alignItems: 'end'
            }}>
              {/* Silver - Rank 2 */}
              <div
                className="glass hover-scale"
                style={{
                  padding: '1.5rem',
                  borderRadius: '1.25rem',
                  border: '1px solid rgba(148, 163, 184, 0.4)',
                  background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.1) 0%, var(--card) 100%)',
                  textAlign: 'center',
                  position: 'relative'
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#94A3B8', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', fontSize: '1.4rem', fontWeight: 900, boxShadow: '0 4px 12px rgba(148, 163, 184, 0.4)' }}>
                  🥈
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>STATE RANK #2</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.35rem 0 0.2rem 0' }}>{topThree[1].name}</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{topThree[1].college.split(',')[0]}</div>
                <div style={{ display: 'inline-block', padding: '0.35rem 0.85rem', borderRadius: '1rem', background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', fontWeight: 800, fontSize: '0.95rem' }}>
                  SGPA: {topThree[1].sgpa}
                </div>
                <div style={{ marginTop: '0.85rem' }}>
                  <button
                    onClick={() => onViewStudentResult(topThree[1].regNo, topThree[1].semester)}
                    type="button"
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 700 }}
                  >
                    View Marksheet
                  </button>
                </div>
              </div>

              {/* Gold - Rank 1 */}
              <div
                className="glass hover-scale"
                style={{
                  padding: '1.85rem 1.5rem',
                  borderRadius: '1.35rem',
                  border: '2px solid rgba(245, 158, 11, 0.5)',
                  background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.15) 0%, var(--card) 100%)',
                  textAlign: 'center',
                  position: 'relative',
                  transform: 'scale(1.03)',
                  boxShadow: '0 12px 30px -8px rgba(245, 158, 11, 0.25)'
                }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F59E0B', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', fontSize: '1.7rem', fontWeight: 900, boxShadow: '0 6px 16px rgba(245, 158, 11, 0.5)' }}>
                  👑
                </div>
                <div style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>🥇 BIHAR TOPPER (RANK #1)</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', margin: '0.4rem 0 0.2rem 0' }}>{topThree[0].name}</h2>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>{topThree[0].college.split(',')[0]}</div>
                <div style={{ display: 'inline-block', padding: '0.45rem 1.1rem', borderRadius: '1.5rem', background: '#F59E0B', color: '#000', fontWeight: 900, fontSize: '1.15rem', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
                  SGPA: {topThree[0].sgpa}
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => onViewStudentResult(topThree[0].regNo, topThree[0].semester)}
                    type="button"
                    style={{ fontSize: '0.82rem', padding: '0.5rem 1.1rem', borderRadius: '0.6rem', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 800 }}
                  >
                    View Official Marksheet
                  </button>
                </div>
              </div>

              {/* Bronze - Rank 3 */}
              <div
                className="glass hover-scale"
                style={{
                  padding: '1.5rem',
                  borderRadius: '1.25rem',
                  border: '1px solid rgba(217, 119, 6, 0.4)',
                  background: 'linear-gradient(180deg, rgba(217, 119, 6, 0.1) 0%, var(--card) 100%)',
                  textAlign: 'center',
                  position: 'relative'
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#D97706', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', fontSize: '1.4rem', fontWeight: 900, boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)' }}>
                  🥉
                </div>
                <div style={{ fontSize: '0.72rem', color: '#D97706', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>STATE RANK #3</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: '0.35rem 0 0.2rem 0' }}>{topThree[2].name}</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{topThree[2].college.split(',')[0]}</div>
                <div style={{ display: 'inline-block', padding: '0.35rem 0.85rem', borderRadius: '1rem', background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8', fontWeight: 800, fontSize: '0.95rem' }}>
                  SGPA: {topThree[2].sgpa}
                </div>
                <div style={{ marginTop: '0.85rem' }}>
                  <button
                    onClick={() => onViewStudentResult(topThree[2].regNo, topThree[2].semester)}
                    type="button"
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 700 }}
                  >
                    View Marksheet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Full Merit Table (Ranks 1 to 100) */}
          <div
            className="glass"
            style={{
              borderRadius: '1.25rem',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              background: 'var(--card)'
            }}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Statewide Merit Board ({filteredToppers.length} Students)
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Ranked by highest {metric.toUpperCase()} across all engineering colleges in Bihar
                </p>
              </div>
            </div>

            {filteredToppers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                <Lucide.SearchX size={44} style={{ color: 'var(--text-muted)', opacity: 0.6, marginBottom: '0.75rem' }} />
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>No matching students found</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Try clearing search keywords or changing filters.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '0.85rem 1.25rem', width: '70px' }}>Rank</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Student Name & Roll No</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>College</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Branch</th>
                      <th style={{ padding: '0.85rem 1.25rem' }}>Sem</th>
                      <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Score ({metric.toUpperCase()})</th>
                      <th style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredToppers.map((student, idx) => {
                      const isTop3 = student.rank <= 3;
                      const rankBadgeColor = student.rank === 1 ? '#F59E0B' : (student.rank === 2 ? '#94A3B8' : (student.rank === 3 ? '#D97706' : 'var(--text-muted)'));

                      return (
                        <tr
                          key={`${student.regNo}-${idx}`}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: isTop3 ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {/* Rank */}
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 900 }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isTop3 ? rankBadgeColor : 'rgba(255, 255, 255, 0.06)',
                              color: isTop3 ? (student.rank === 1 ? '#000' : '#fff') : 'var(--text-main)',
                              fontSize: '0.82rem',
                              fontWeight: 800
                            }}>
                              {student.rank === 1 ? '🥇' : (student.rank === 2 ? '🥈' : (student.rank === 3 ? '🥉' : `#${student.rank}`))}
                            </div>
                          </td>

                          {/* Student Details */}
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>{student.name}</div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.15rem' }}>{student.regNo}</div>
                          </td>

                          {/* College */}
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{student.college.split(',')[0]}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{student.college.split(',').slice(1).join(',')}</div>
                          </td>

                          {/* Branch */}
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '0.4rem', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)' }}>
                              {student.course}
                            </span>
                          </td>

                          {/* Sem */}
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                            Sem {student.semester}
                          </td>

                          {/* SGPA / CGPA */}
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <span style={{
                              fontSize: '1rem',
                              fontWeight: 900,
                              color: (student.numericSgpa || 0) >= 8.5 ? '#10B981' : ((student.numericSgpa || 0) >= 7.5 ? '#38BDF8' : 'var(--text-main)')
                            }}>
                              {metric === 'cgpa' ? student.cgpa : student.sgpa}
                            </span>
                          </td>

                          {/* Action */}
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                            <button
                              onClick={() => onViewStudentResult(student.regNo, student.semester)}
                              type="button"
                              className="hover-scale"
                              style={{
                                padding: '0.4rem 0.85rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'var(--text-main)',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Marksheet
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab 2: College Standings */}
      {!loading && activeTab === 'colleges' && (
        <div
          className="glass"
          style={{
            borderRadius: '1.25rem',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            background: 'var(--card)'
          }}
        >
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Bihar Engineering Colleges Standings ({filteredColleges.length} Colleges)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Ranked by Average SGPA of enrolled students across the university
              </p>
            </div>
          </div>

          {filteredColleges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Lucide.SearchX size={44} style={{ color: 'var(--text-muted)', opacity: 0.6, marginBottom: '0.75rem' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>No colleges found</h4>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.85rem 1.25rem', width: '70px' }}>Rank</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>College Name</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Students Analyzed</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Pass Rate</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Avg SGPA</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>College Topper</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredColleges.map((col, idx) => {
                    const isTop3 = col.rank <= 3;
                    const medal = col.rank === 1 ? '🥇' : (col.rank === 2 ? '🥈' : (col.rank === 3 ? '🥉' : `#${col.rank}`));

                    return (
                      <tr
                        key={`${col.college}-${idx}`}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isTop3 ? 'rgba(56, 189, 248, 0.04)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* Rank */}
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 900 }}>
                          <span style={{ fontSize: isTop3 ? '1.1rem' : '0.85rem', fontWeight: 800 }}>
                            {medal}
                          </span>
                        </td>

                        {/* College Name */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                            {col.college}
                          </div>
                        </td>

                        {/* Total Students */}
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {col.totalStudents} Candidates
                        </td>

                        {/* Pass Rate */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div style={{ flex: 1, minWidth: '60px', height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
                              <div style={{ width: `${col.passPercentage}%`, height: '100%', background: col.passPercentage >= 75 ? '#10B981' : (col.passPercentage >= 50 ? '#F59E0B' : '#EF4444') }} />
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: col.passPercentage >= 75 ? '#10B981' : '#F59E0B' }}>
                              {col.passPercentage}%
                            </span>
                          </div>
                        </td>

                        {/* Avg SGPA */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            fontSize: '1rem',
                            fontWeight: 900,
                            color: col.avgSgpa >= 7.0 ? '#10B981' : (col.avgSgpa >= 6.0 ? '#38BDF8' : 'var(--text-main)')
                          }}>
                            {col.avgSgpa.toFixed(2)}
                          </span>
                        </td>

                        {/* College Topper */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          {col.topStudent ? (
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                                👑 {col.topStudent.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 700 }}>
                                SGPA: {col.topStudent.sgpa} ({col.topStudent.course.split(' ')[0]})
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
