'use client'

import { useEffect, useState } from "react";

interface CourseCompletionStatsProps {
  open: boolean;
  onClose: () => void;
  courseName: string;
  stats: {
    totalChapters: number;
    completedChapters: number;
    totalQuizzes: number;
    quizScores: number[];
    totalAssessments: number;
    assessmentScores: Array<{ score: number; passed: boolean }>;
    timeSpent: number; // minutes
    completionDate: string;
  };
}

const STYLES = `
@keyframes statsPopIn { 
  from { opacity:0; transform:scale(0.9) translateY(20px) } 
  to { opacity:1; transform:scale(1) translateY(0) } 
}
@keyframes statsCountUp { 
  from { opacity:0; transform:translateY(10px) } 
  to { opacity:1; transform:translateY(0) } 
}
@keyframes statsPulse { 
  0%, 100% { transform:scale(1) } 
  50% { transform:scale(1.05) } 
}
@keyframes statsShine {
  0% { background-position: -200% 0 }
  100% { background-position: 200% 0 }
}

.stats-overlay {
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,0.7);
  backdrop-filter:blur(8px);
  display:flex; align-items:center; justify-content:center;
  animation:fadeIn 0.3s ease;
  padding:20px;
}
.stats-modal {
  background:var(--surface,#fff);
  border-radius:24px;
  box-shadow:0 20px 60px rgba(0,0,0,0.3);
  max-width:600px; width:100%;
  overflow:hidden;
  animation:statsPopIn 0.5s cubic-bezier(0.16,1,0.3,1);
}
.stats-header {
  background:linear-gradient(135deg,#7c3aed,#0d9488);
  padding:32px 28px;
  text-align:center;
  position:relative;
  overflow:hidden;
}
.stats-header::before {
  content:'';
  position:absolute; inset:0;
  background:linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation:statsShine 3s infinite;
  background-size:200% 100%;
}
.stats-trophy {
  font-size:72px;
  animation:statsPulse 2s ease infinite;
  margin-bottom:16px;
  filter:drop-shadow(0 4px 12px rgba(0,0,0,0.2));
}
.stats-title {
  font-size:26px; font-weight:900;
  color:#fff; letter-spacing:-0.02em;
  margin-bottom:8px;
}
.stats-subtitle {
  font-size:14px; color:rgba(255,255,255,0.9);
}
.stats-body {
  padding:28px;
}
.stats-grid {
  display:grid; grid-template-columns:1fr 1fr;
  gap:16px; margin-bottom:24px;
}
.stats-card {
  padding:18px;
  border-radius:14px;
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  background:var(--bg,#faf9ff);
  animation:statsCountUp 0.6s ease both;
  position:relative;
  overflow:hidden;
}
.stats-card-icon {
  font-size:28px;
  margin-bottom:10px;
}
.stats-card-value {
  font-size:32px; font-weight:900;
  color:var(--t1,#18103a);
  margin-bottom:4px;
  animation:statsCountUp 0.8s ease both;
}
.stats-card-label {
  font-size:11.5px; font-weight:600;
  color:var(--t3,#a89dc8);
  text-transform:uppercase;
  letter-spacing:0.05em;
}
.stats-assessment {
  padding:20px;
  border-radius:14px;
  margin-bottom:16px;
  animation:statsCountUp 0.7s ease both;
}
.stats-assessment.passed {
  background:rgba(13,148,136,0.08);
  border:1.5px solid rgba(13,148,136,0.2);
}
.stats-assessment.failed {
  background:rgba(220,38,38,0.06);
  border:1.5px solid rgba(220,38,38,0.2);
}
.stats-assessment-header {
  display:flex; align-items:center; gap:12px;
  margin-bottom:12px;
}
.stats-assessment-icon {
  width:44px; height:44px;
  border-radius:12px;
  display:flex; align-items:center; justify-content:center;
  font-size:22px; flex-shrink:0;
}
.stats-assessment-icon.passed {
  background:var(--teal,#0d9488);
}
.stats-assessment-icon.failed {
  background:#dc2626;
}
.stats-assessment-title {
  flex:1;
  font-size:14px; font-weight:700;
}
.stats-assessment-title.passed {
  color:var(--teal,#0d9488);
}
.stats-assessment-title.failed {
  color:#dc2626;
}
.stats-assessment-score {
  font-size:26px; font-weight:900;
}
.stats-assessment-score.passed {
  color:var(--teal,#0d9488);
}
.stats-assessment-score.failed {
  color:#dc2626;
}
.stats-score-bar {
  height:8px;
  border-radius:8px;
  background:rgba(0,0,0,0.05);
  overflow:hidden;
  margin-top:10px;
}
.stats-score-fill {
  height:100%;
  border-radius:8px;
  transition:width 1s cubic-bezier(0.16,1,0.3,1);
  position:relative;
}
.stats-score-fill.passed {
  background:linear-gradient(90deg,#0d9488,#16a34a);
}
.stats-score-fill.failed {
  background:linear-gradient(90deg,#dc2626,#ef4444);
}
.stats-score-fill::after {
  content:'';
  position:absolute; inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);
  animation:statsShine 2s infinite;
  background-size:200% 100%;
}
.stats-footer {
  padding:0 28px 28px;
}
.stats-button {
  width:100%; padding:14px;
  border-radius:12px; border:none;
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; font-size:14px; font-weight:700;
  cursor:pointer; transition:all 0.2s;
  box-shadow:0 4px 14px rgba(124,58,237,0.3);
}
.stats-button:hover {
  transform:translateY(-2px);
  box-shadow:0 6px 20px rgba(124,58,237,0.4);
}
`;

export default function CourseCompletionStats({ 
  open, 
  onClose, 
  courseName, 
  stats 
}: CourseCompletionStatsProps) {
  const [animatedScores, setAnimatedScores] = useState<number[]>([]);

  useEffect(() => {
    if (open) {
      // Animate scores counting up
      stats.assessmentScores.forEach((_, idx) => {
        setTimeout(() => {
          setAnimatedScores(prev => {
            const updated = [...prev];
            updated[idx] = stats.assessmentScores[idx].score;
            return updated;
          });
        }, 500 + idx * 200);
      });
    } else {
      setAnimatedScores([]);
    }
  }, [open, stats.assessmentScores]);

  if (!open) return null;

  const avgQuizScore = stats.quizScores.length > 0
    ? Math.round(stats.quizScores.reduce((a, b) => a + b, 0) / stats.quizScores.length)
    : 0;

  const avgAssessmentScore = stats.assessmentScores.length > 0
    ? Math.round(stats.assessmentScores.reduce((a, b) => a + b.score, 0) / stats.assessmentScores.length)
    : 0;

  const allAssessmentsPassed = stats.assessmentScores.every(a => a.passed);

  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="stats-overlay" onClick={onClose}>
        <div className="stats-modal" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="stats-header">
            <div className="stats-trophy">
              {allAssessmentsPassed ? '🏆' : '📊'}
            </div>
            <div className="stats-title">
              {allAssessmentsPassed ? 'Course Completed!' : 'Course Finished'}
            </div>
            <div className="stats-subtitle">{courseName}</div>
          </div>

          {/* Body */}
          <div className="stats-body">
            
            {/* Stats Grid */}
            <div className="stats-grid">
              <div className="stats-card" style={{ animationDelay: '0.1s' }}>
                <div className="stats-card-icon">✅</div>
                <div className="stats-card-value">{stats.completedChapters}</div>
                <div className="stats-card-label">Chapters Done</div>
              </div>

              <div className="stats-card" style={{ animationDelay: '0.2s' }}>
                <div className="stats-card-icon">⏱️</div>
                <div className="stats-card-value">{formatTime(stats.timeSpent)}</div>
                <div className="stats-card-label">Time Spent</div>
              </div>

              {stats.totalQuizzes > 0 && (
                <div className="stats-card" style={{ animationDelay: '0.3s' }}>
                  <div className="stats-card-icon">❓</div>
                  <div className="stats-card-value">{avgQuizScore}%</div>
                  <div className="stats-card-label">Avg Quiz Score</div>
                </div>
              )}

              {stats.totalAssessments > 0 && (
                <div className="stats-card" style={{ animationDelay: '0.4s' }}>
                  <div className="stats-card-icon">📝</div>
                  <div className="stats-card-value">{avgAssessmentScore}%</div>
                  <div className="stats-card-label">Avg Assessment</div>
                </div>
              )}
            </div>

            {/* Assessment Scores */}
            {stats.assessmentScores.length > 0 && (
              <div>
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 700, 
                  color: 'var(--t1,#18103a)',
                  marginBottom: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Assessment Results
                </div>
                {stats.assessmentScores.map((assessment, idx) => (
                  <div 
                    key={idx} 
                    className={`stats-assessment ${assessment.passed ? 'passed' : 'failed'}`}
                    style={{ animationDelay: `${0.5 + idx * 0.1}s` }}
                  >
                    <div className="stats-assessment-header">
                      <div className={`stats-assessment-icon ${assessment.passed ? 'passed' : 'failed'}`}>
                        {assessment.passed ? '✓' : '✗'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className={`stats-assessment-title ${assessment.passed ? 'passed' : 'failed'}`}>
                          Assessment {idx + 1}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t3,#a89dc8)', marginTop: 2 }}>
                          {assessment.passed ? 'Passed' : 'Failed'}
                        </div>
                      </div>
                      <div className={`stats-assessment-score ${assessment.passed ? 'passed' : 'failed'}`}>
                        {animatedScores[idx] || 0}%
                      </div>
                    </div>
                    <div className="stats-score-bar">
                      <div 
                        className={`stats-score-fill ${assessment.passed ? 'passed' : 'failed'}`}
                        style={{ width: `${animatedScores[idx] || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!allAssessmentsPassed && stats.totalAssessments > 0 && (
              <div style={{
                padding: 16,
                borderRadius: 12,
                background: 'rgba(220,38,38,0.06)',
                border: '1.5px solid rgba(220,38,38,0.2)',
                fontSize: 12,
                color: '#dc2626',
                textAlign: 'center'
              }}>
                ⚠️ Some assessments were not passed. Review and retake to earn completion.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="stats-footer">
            <button className="stats-button" onClick={onClose}>
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
