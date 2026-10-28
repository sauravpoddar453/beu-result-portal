'use client';
import React, { useState, useRef, useEffect } from 'react';
import * as Lucide from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface StoryResultCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    name?: string;
    rollNo?: string;
    college?: string;
    course?: string;
    semester?: string;
    sgpa?: string | number;
    cgpa?: string | number;
    status?: string;
    theorySubjects?: any[];
    practicalSubjects?: any[];
  } | null;
}

type ThemeKey = 'neon' | 'gold' | 'emerald' | 'purple';

const THEMES: Record<ThemeKey, {
  name: string;
  badge: string;
  bgGradStart: string;
  bgGradEnd: string;
  accent: string;
  cardGlow: string;
  pillBg: string;
  pillBorder: string;
}> = {
  neon: {
    name: 'Cyber Cyan',
    badge: '🌌 Neon',
    bgGradStart: '#0B132B',
    bgGradEnd: '#1C2541',
    accent: '#38BDF8',
    cardGlow: 'rgba(56, 189, 248, 0.35)',
    pillBg: 'rgba(56, 189, 248, 0.15)',
    pillBorder: 'rgba(56, 189, 248, 0.4)'
  },
  gold: {
    name: 'Topper Gold',
    badge: '👑 Prestige',
    bgGradStart: '#1A1404',
    bgGradEnd: '#2D1F08',
    accent: '#F59E0B',
    cardGlow: 'rgba(245, 158, 11, 0.35)',
    pillBg: 'rgba(245, 158, 11, 0.15)',
    pillBorder: 'rgba(245, 158, 11, 0.4)'
  },
  emerald: {
    name: 'Emerald Pro',
    badge: '💎 Emerald',
    bgGradStart: '#041812',
    bgGradEnd: '#092C23',
    accent: '#10B981',
    cardGlow: 'rgba(16, 185, 129, 0.35)',
    pillBg: 'rgba(16, 185, 129, 0.15)',
    pillBorder: 'rgba(16, 185, 129, 0.4)'
  },
  purple: {
    name: 'Cosmic Violet',
    badge: '🔮 Cosmic',
    bgGradStart: '#140826',
    bgGradEnd: '#240F42',
    accent: '#A855F7',
    cardGlow: 'rgba(168, 85, 247, 0.35)',
    pillBg: 'rgba(168, 85, 247, 0.15)',
    pillBorder: 'rgba(168, 85, 247, 0.4)'
  }
};

export default function StoryResultCardModal({ isOpen, onClose, result }: StoryResultCardModalProps) {
  const [themeKey, setThemeKey] = useState<ThemeKey>('neon');
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen || !result) return null;

  const currentTheme = THEMES[themeKey];
  const numSgpa = parseFloat(result.sgpa?.toString() || '0');
  const percentage = (numSgpa * 10).toFixed(1);
  const collegeName = result.college ? result.college.split(',')[0].trim() : 'Engineering College';
  const subjects = [ ...(result.theorySubjects || []), ...(result.practicalSubjects || []) ];
  const topSubjects = subjects.filter(s => s.grade && s.grade !== 'F' && s.grade !== 'P').slice(0, 3);

  // Generate High-Res 1080x1920 Story Image using HTML5 Canvas
  const generateAndDownloadCanvas = () => {
    try {
      setDownloading(true);
      const width = 1080;
      const height = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, currentTheme.bgGradStart);
      bgGrad.addColorStop(1, currentTheme.bgGradEnd);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Ambient radial lighting
      const radGrad = ctx.createRadialGradient(width / 2, 450, 50, width / 2, 450, 600);
      radGrad.addColorStop(0, currentTheme.cardGlow);
      radGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle border card outline
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 4;
      ctx.strokeRect(60, 60, width - 120, height - 120);

      // Header Tag: University Name
      ctx.textAlign = 'center';
      ctx.fillStyle = currentTheme.accent;
      ctx.font = 'bold 34px sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('BIHAR ENGINEERING UNIVERSITY, PATNA', width / 2, 170);

      // Subheading Badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '600 30px sans-serif';
      ctx.fillText('OFFICIAL SEMESTER RESULT CARD', width / 2, 225);

      // Decorative separator line
      ctx.strokeStyle = currentTheme.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 120, 260);
      ctx.lineTo(width / 2 + 120, 260);
      ctx.stroke();

      // Student Name Box
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText(result.name || 'Student', width / 2, 380);

      // Reg No & College
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 36px monospace';
      ctx.fillText(`ROLL NO: ${result.rollNo || ''}`, width / 2, 440);

      ctx.fillStyle = currentTheme.accent;
      ctx.font = 'bold 38px sans-serif';
      ctx.fillText(collegeName.toUpperCase(), width / 2, 510);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '500 32px sans-serif';
      ctx.fillText(result.course || 'B.Tech Engineering', width / 2, 560);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '600 30px sans-serif';
      ctx.fillText(result.semester || 'Semester Examination', width / 2, 605);

      // Central SGPA Glow Pedestal Card
      const cardY = 670;
      const cardH = 460;
      const cardW = 920;
      const cardX = (width - cardW) / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = currentTheme.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 32);
      ctx.fill();
      ctx.stroke();

      // Inside Card: Title
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.font = 'bold 32px sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('SEMESTER GRADE POINT AVERAGE', width / 2, cardY + 70);

      // Big SGPA Number
      ctx.fillStyle = currentTheme.accent;
      ctx.font = '900 160px sans-serif';
      ctx.fillText(result.sgpa?.toString() || '0.00', width / 2, cardY + 230);

      // Equivalent Percentage & Status Pill
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(`${percentage}% Score`, width / 2, cardY + 310);

      // Division Pill
      const divisionText = numSgpa >= 7.5 ? '★ First Class with Distinction' : (numSgpa >= 6.0 ? 'First Division' : 'Passed');
      ctx.fillStyle = currentTheme.accent;
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(divisionText, width / 2, cardY + 380);

      // Subject Highlights Box (if available)
      if (topSubjects.length > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 34px sans-serif';
        ctx.fillText('🏆 KEY SUBJECT ACHIEVEMENTS', width / 2, 1230);

        topSubjects.forEach((sub, i) => {
          const sy = 1300 + (i * 75);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
          ctx.beginPath();
          ctx.roundRect(120, sy - 40, width - 240, 60, 16);
          ctx.fill();

          ctx.textAlign = 'left';
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '600 28px sans-serif';
          const subTitle = (sub.name || 'Subject').substring(0, 38);
          ctx.fillText(subTitle, 150, sy);

          ctx.textAlign = 'right';
          ctx.fillStyle = currentTheme.accent;
          ctx.font = 'bold 30px sans-serif';
          ctx.fillText(`Grade: ${sub.grade}`, width - 150, sy);
        });
      }

      // Footer Branding
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('BEU RESULT PORTAL', width / 2, 1720);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '500 26px sans-serif';
      ctx.fillText('Official Bihar Engineering University Marksheet Records Verified', width / 2, 1765);

      ctx.fillStyle = currentTheme.accent;
      ctx.font = 'bold 24px monospace';
      ctx.fillText('beuresult.in • Fast & Direct Results', width / 2, 1805);

      // Download triggered via blob
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BEU_Result_Story_${result.rollNo || 'Card'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Story Card downloaded successfully!');
        setDownloading(false);
      }, 'image/png', 0.95);

    } catch (err) {
      console.error(err);
      toast.error('Could not generate story image');
      setDownloading(false);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `🎓 *My BEU Exam Result*\n👤 *Student:* ${result.name}\n🔢 *Roll No:* ${result.rollNo}\n🏛️ *College:* ${collegeName}\n📚 *Branch:* ${result.course}\n⭐ *SGPA:* ${result.sgpa} (${percentage}%)\n\nCheck official marksheet on BEU Result Portal!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.82)',
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
          maxWidth: '520px',
          maxHeight: '94vh',
          borderRadius: '1.25rem',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.1rem 1.4rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: 'var(--card)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lucide.Sparkles size={18} color="#F59E0B" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Instagram & WhatsApp Story Card
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <Lucide.X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
          
          {/* Theme Palette Switcher */}
          <div style={{ display: 'flex', gap: '0.45rem', width: '100%', justifyContent: 'center' }}>
            {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
              const th = THEMES[key];
              const isSelected = themeKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setThemeKey(key)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '1.5rem',
                    border: isSelected ? `2px solid ${th.accent}` : '1px solid var(--border)',
                    background: isSelected ? th.pillBg : 'rgba(255, 255, 255, 0.04)',
                    color: isSelected ? th.accent : 'var(--text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  className="hover-scale"
                >
                  {th.badge}
                </button>
              );
            })}
          </div>

          {/* Phone-Shaped Live Story Card Preview */}
          <div
            style={{
              width: '100%',
              maxWidth: '340px',
              aspectRatio: '9 / 16',
              borderRadius: '1.5rem',
              background: `linear-gradient(135deg, ${currentTheme.bgGradStart} 0%, ${currentTheme.bgGradEnd} 100%)`,
              border: `2px solid ${currentTheme.accent}44`,
              boxShadow: `0 16px 40px ${currentTheme.cardGlow}`,
              padding: '1.5rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box'
            }}
          >
            {/* Top Glow Ambient */}
            <div style={{
              position: 'absolute',
              top: '-40px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '200px',
              height: '140px',
              borderRadius: '50%',
              background: currentTheme.accent,
              opacity: 0.2,
              filter: 'blur(35px)',
              pointerEvents: 'none'
            }} />

            {/* Header */}
            <div>
              <div style={{ fontSize: '0.62rem', fontWeight: 900, color: currentTheme.accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                BIHAR ENGINEERING UNIVERSITY
              </div>
              <div style={{ fontSize: '0.58rem', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 600, marginTop: '0.15rem' }}>
                OFFICIAL EXAMINATION RECORD
              </div>
            </div>

            {/* Middle Bio */}
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', margin: '0 0 0.2rem 0', lineHeight: 1.2 }}>
                {result.name}
              </h2>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.8)', fontFamily: 'monospace' }}>
                {result.rollNo}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: currentTheme.accent, marginTop: '0.35rem' }}>
                {collegeName}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                {result.course}
              </div>
            </div>

            {/* Hero SGPA Badge */}
            <div style={{
              padding: '1.1rem 0.85rem',
              borderRadius: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: `1.5px solid ${currentTheme.accent}`,
              boxShadow: `0 6px 20px ${currentTheme.cardGlow}`
            }}>
              <div style={{ fontSize: '0.64rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 800, letterSpacing: '0.08em' }}>
                SEMESTER SGPA
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: currentTheme.accent, lineHeight: 1.05, margin: '0.2rem 0' }}>
                {result.sgpa}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fff' }}>
                {percentage}% Score
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: currentTheme.accent, marginTop: '0.2rem' }}>
                {numSgpa >= 7.5 ? '★ Distinction' : 'First Class'}
              </div>
            </div>

            {/* Footer Watermark */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>
                BEU RESULT PORTAL
              </div>
              <div style={{ fontSize: '0.58rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                Verified Official Marksheet
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <button
              onClick={generateAndDownloadCanvas}
              disabled={downloading}
              type="button"
              className="premium-btn hover-scale"
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '0.85rem',
                fontSize: '0.92rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: currentTheme.accent,
                color: '#000',
                border: 'none',
                cursor: downloading ? 'not-allowed' : 'pointer'
              }}
            >
              {downloading ? (
                <>
                  <Lucide.Loader2 size={18} className="animate-spin" />
                  <span>Generating High-Res Image...</span>
                </>
              ) : (
                <>
                  <Lucide.Download size={18} />
                  <span>Download Story Image (PNG)</span>
                </>
              )}
            </button>

            <button
              onClick={handleShareWhatsApp}
              type="button"
              className="hover-scale"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.85rem',
                fontSize: '0.86rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                background: '#25D366',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Lucide.Share2 size={16} />
              <span>Share Summary to WhatsApp</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
