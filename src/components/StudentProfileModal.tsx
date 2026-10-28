'use client';
import React, { useState, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface SubjectInfo {
  code: string;
  name: string;
  grade: string;
  credit: string;
  total: string | number;
}

interface SemesterRecord {
  id?: string;
  semester: number;
  isSupplementary?: boolean;
  semesterLabel: string;
  examName: string;
  examHeld: string;
  sgpa: string;
  cgpa: string;
  numericSgpa: number | null;
  numericCgpa: number | null;
  status: string;
  totalSubjects: number;
  backlogsCount: number;
  failedSubjects: { code: string; name: string; grade: string }[];
  subjects: SubjectInfo[];
}

interface StudentProfile {
  regNo: string;
  name: string;
  fatherName: string;
  motherName: string;
  college: string;
  course: string;
  totalSemestersAppeared: number;
  avgSgpa: string;
  latestCgpa: string;
  totalBacklogs: number;
}

interface StudentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  regNo: string;
  onSelectSemesterExam?: (semesterNum: number) => void;
}

export default function StudentProfileModal({
  isOpen,
  onClose,
  regNo,
  onSelectSemesterExam
}: StudentProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [semesters, setSemesters] = useState<SemesterRecord[]>([]);
  const [expandedSem, setExpandedSem] = useState<string | number | null>(null);

  // Deduplicate semesters for the 1..8 milestone progression bar chart
  const progressionBars = React.useMemo(() => {
    const semMap = new Map<number, SemesterRecord>();
    for (const sem of semesters) {
      const existing = semMap.get(sem.semester);
      if (!existing || (sem.numericSgpa !== null && (existing.numericSgpa === null || sem.numericSgpa >= existing.numericSgpa))) {
        semMap.set(sem.semester, sem);
      }
    }
    return Array.from(semMap.values()).sort((a, b) => a.semester - b.semester);
  }, [semesters]);

  useEffect(() => {
    if (!isOpen || !regNo) return;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/student-profile?regNo=${encodeURIComponent(regNo)}`);
        const json = await res.json();
        if (json.status === 200) {
          setProfile(json.student);
          setSemesters(json.semesters || []);
          if (json.semesters?.length > 0) {
            setExpandedSem(json.semesters[json.semesters.length - 1].semester);
          }
        } else {
          toast.error(json.message || 'Profile records not found in database');
        }
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to load student progression history');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isOpen, regNo]);

  if (!isOpen) return null;

  const handlePrintTranscript = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!profile) return;
    const text = `🎓 *BEU Academic Performance Summary*\n👤 *Student:* ${profile.name}\n🔢 *Roll No:* ${profile.regNo}\n🏛️ *College:* ${profile.college}\n📚 *Branch:* ${profile.course}\n⭐ *Latest CGPA:* ${profile.latestCgpa}\n📈 *Average SGPA:* ${profile.avgSgpa}\n\nCheck official marksheet on BEU Portal!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        className="glass"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          borderRadius: '1.25rem',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: 'var(--card)',
          zIndex: 10,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '0.65rem',
              background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.2) 0%, rgba(56, 189, 248, 0.15) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              border: '1px solid rgba(var(--primary-rgb), 0.3)'
            }}>
              <Lucide.TrendingUp size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                4-Year Academic Progression & Transcript
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Consolidated multi-semester performance analytics
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handlePrintTranscript}
              type="button"
              className="hover-scale"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border)',
                color: 'var(--text-main)',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '0.45rem 0.85rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Print Consolidated Transcript"
            >
              <Lucide.Printer size={14} />
              <span>Print Transcript</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              type="button"
              className="hover-scale"
              style={{
                background: '#25D366',
                border: 'none',
                color: '#fff',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '0.45rem 0.85rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Share on WhatsApp"
            >
              <Lucide.Share2 size={14} />
              <span>Share</span>
            </button>

            <button
              onClick={onClose}
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.35rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Lucide.X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Lucide.Loader2 className="animate-spin" size={36} color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                Compiling multi-semester student profile...
              </p>
            </div>
          ) : !profile ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Lucide.AlertCircle size={40} color="var(--accent)" style={{ margin: '0 auto 0.75rem auto' }} />
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>No Multi-Semester Records Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Ensure this registration number exists in the university database.
              </p>
            </div>
          ) : (
            <>
              {/* Student Bio Card */}
              <div
                className="glass"
                style={{
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.08) 0%, rgba(56, 189, 248, 0.04) 100%)',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                      {profile.name}
                    </h3>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                      REG NO: {profile.regNo}
                    </div>
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-main)', fontWeight: 600, marginTop: '0.4rem' }}>
                      🏛️ {profile.college}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700, marginTop: '0.2rem' }}>
                      🎓 {profile.course}
                    </div>
                  </div>

                  {/* Summary Metric Pills */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div className="glass" style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card)', textAlign: 'center', minWidth: '90px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>OVERALL CGPA</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#10B981', marginTop: '0.15rem' }}>
                        {profile.latestCgpa}
                      </div>
                    </div>

                    <div className="glass" style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card)', textAlign: 'center', minWidth: '90px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>AVG SGPA</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#38BDF8', marginTop: '0.15rem' }}>
                        {profile.avgSgpa}
                      </div>
                    </div>

                    <div className="glass" style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--card)', textAlign: 'center', minWidth: '90px' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>BACKLOGS</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: profile.totalBacklogs > 0 ? '#EF4444' : '#10B981', marginTop: '0.15rem' }}>
                        {profile.totalBacklogs}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SGPA Progression Visual Chart */}
              <div
                className="glass"
                style={{
                  padding: '1.25rem',
                  borderRadius: '1rem',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Lucide.BarChart3 size={16} color="var(--primary)" />
                    <span>Semester-wise SGPA Progression Bar</span>
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Scale: 0.0 to 10.0
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', height: '170px', padding: '0 0.5rem 0.5rem 0.5rem' }}>
                  {progressionBars.map((sem, pIdx) => {
                    const sgpaNum = sem.numericSgpa || 0;
                    const heightPercent = Math.min((sgpaNum / 10) * 100, 100);
                    const barColor = sgpaNum >= 8.0 ? '#10B981' : (sgpaNum >= 7.0 ? '#38BDF8' : (sgpaNum >= 6.0 ? '#F59E0B' : '#EF4444'));
                    const isSelected = expandedSem === sem.semester || (typeof expandedSem === 'string' && expandedSem.includes(`sem-${sem.semester}`));

                    return (
                      <div
                        key={`prog-bar-sem-${sem.semester}-${pIdx}`}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          height: '100%',
                          justifyContent: 'flex-end',
                          cursor: 'pointer'
                        }}
                        onClick={() => setExpandedSem(expandedSem === sem.semester ? null : sem.semester)}
                        title={`Click to view Sem ${sem.semester} details`}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: barColor, marginBottom: '0.35rem' }}>
                          {sem.sgpa}
                        </span>
                        <div style={{
                          width: '100%',
                          maxWidth: '42px',
                          height: `${heightPercent}%`,
                          background: `linear-gradient(180deg, ${barColor} 0%, rgba(255,255,255,0.05) 100%)`,
                          borderRadius: '6px 6px 0 0',
                          border: `1px solid ${barColor}`,
                          transition: 'all 0.3s ease',
                          boxShadow: isSelected ? `0 0 16px ${barColor}` : `0 4px 12px ${barColor}33`,
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                        }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: isSelected ? 800 : 700, color: isSelected ? 'var(--primary)' : 'var(--text-muted)', marginTop: '0.4rem' }}>
                          Sem {sem.semester}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Semester Records Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Semester-Wise Marksheet Breakdown ({semesters.length} Semesters Available)
                </h4>

                {semesters.map((sem, sIdx) => {
                  const rowKey = sem.id || `breakdown-sem-${sem.semester}-${sIdx}`;
                  const isExpanded = expandedSem === sem.semester || expandedSem === rowKey;

                  return (
                    <div
                      key={rowKey}
                      className="glass"
                      style={{
                        borderRadius: '0.85rem',
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Accordion Row */}
                      <div
                        onClick={() => setExpandedSem(isExpanded ? null : rowKey)}
                        style={{
                          padding: '0.9rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '0.4rem',
                            background: sem.isSupplementary ? 'rgba(245, 158, 11, 0.15)' : 'rgba(var(--primary-rgb), 0.12)',
                            color: sem.isSupplementary ? '#F59E0B' : 'var(--primary)',
                            fontSize: '0.78rem',
                            fontWeight: 800
                          }}>
                            Sem {sem.semester} {sem.isSupplementary ? '(Special)' : ''}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                            {sem.examName}
                          </span>
                          {sem.examHeld && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              ({sem.examHeld})
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#10B981' }}>
                              SGPA: {sem.sgpa}
                            </span>
                            {sem.cgpa !== 'N/A' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                (CGPA: {sem.cgpa})
                              </span>
                            )}
                          </div>

                          <Lucide.ChevronDown
                            size={16}
                            style={{
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s ease',
                              color: 'var(--text-muted)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Expanded Subject List */}
                      {isExpanded && (
                        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '0.4rem 0' }}>Code</th>
                                <th style={{ padding: '0.4rem 0' }}>Subject Name</th>
                                <th style={{ padding: '0.4rem 0', textAlign: 'center' }}>Grade</th>
                                <th style={{ padding: '0.4rem 0', textAlign: 'right' }}>Credit</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sem.subjects.map((sub, subIdx) => {
                                const isFail = sub.grade === 'F' || sub.grade === 'FAIL';
                                return (
                                  <tr key={`${rowKey}-sub-${sub.code || subIdx}-${subIdx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                    <td style={{ padding: '0.5rem 0', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{sub.code}</td>
                                    <td style={{ padding: '0.5rem 0', color: 'var(--text-main)', fontWeight: 600 }}>{sub.name}</td>
                                    <td style={{ padding: '0.5rem 0', textAlign: 'center' }}>
                                      <span style={{
                                        fontWeight: 800,
                                        fontSize: '0.78rem',
                                        color: isFail ? '#EF4444' : '#10B981',
                                        padding: '0.15rem 0.4rem',
                                        borderRadius: '0.3rem',
                                        background: isFail ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'
                                      }}>
                                        {sub.grade}
                                      </span>
                                    </td>
                                    <td style={{ padding: '0.5rem 0', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700 }}>{sub.credit}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>

                          {onSelectSemesterExam && (
                            <div style={{ marginTop: '0.85rem', textAlign: 'right' }}>
                              <button
                                onClick={() => {
                                  onSelectSemesterExam(sem.semester);
                                  onClose();
                                }}
                                type="button"
                                style={{
                                  fontSize: '0.76rem',
                                  padding: '0.35rem 0.75rem',
                                  borderRadius: '0.4rem',
                                  border: '1px solid var(--border)',
                                  background: 'transparent',
                                  color: 'var(--primary)',
                                  cursor: 'pointer',
                                  fontWeight: 700
                                }}
                              >
                                Open Full Semester {sem.semester} Marksheet →
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
