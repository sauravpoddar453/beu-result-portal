import React from 'react';
import { motion } from 'framer-motion';

const Analytics: React.FC = () => {
    const stats = [
        { label: 'Uni Rank', value: '#12', trend: 'Top 1%' },
        { label: 'Batch Avg', value: '7.42', trend: 'Above Avg' },
        { label: 'Credits Done', value: '112', trend: '85%' },
        { label: 'Next Exam', value: 'Mar 15', trend: '32 Days' },
    ];

    return (
        <section id="stats" style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
                {stats.map((stat, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="glass"
                        style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}
                    >
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</p>
                        <h3 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>{stat.value}</h3>
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>
                            {stat.trend}
                        </span>
                    </motion.div>
                ))}
            </div>

            <div className="glass" style={{ padding: '2rem', background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>University Insights</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    Based on the current semester data, the overall student performance has improved by 4.2% compared to last year.
                    The Computer Science department holds the highest average SGPA of 7.84.
                    Next major update from BEU is expected in mid-March.
                </p>
            </div>
        </section>
    );
};

export default Analytics;
