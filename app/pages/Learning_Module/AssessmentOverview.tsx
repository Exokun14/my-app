'use client'

import { useState } from "react";

interface AssessmentOverviewProps {
  title: string;
  description: string;
  passingScore: number;
  questionCount: number;
  attemptsUsed: number;
  maxAttempts: number;
  previousScores: number[];
  onStart: () => void;
  onClose: () => void;
}

const STYLES = `
@keyframes aoFadeIn { from{opacity:0} to{opacity:1} }
@keyframes aoSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

.ao-overlay {
  position:fixed; inset:0; z-index:2000;
  background:rgba(0,0,0,0.6);
  backdrop-filter:blur(8px);
  display:flex; align-items:center; justify-content:center;
  animation:aoFadeIn 0.3s ease;
  padding:20px;
}
.ao-modal {
  background:var(--surface,#fff);
  border-radius:16px;
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  box-shadow:0 8px 32px rgba(0,0,0,0.15);
  max-width:560px; width:100%;
  animation:aoSlideUp 0.4s cubic-bezier(0.16,1,0.3,1);
}
.ao-header {
  padding:20px 24px;
  border-bottom:1px solid var(--border,rgba(124,58,237,0.08));
  display:flex; align-items:center; gap:12px;
}
.ao-icon {
  width:44px; height:44px; border-radius:11px;
  background:linear-gradient(135deg,#7c3aed,#0d9488);
  display:flex; align-items:center; justify-content:center;
  font-size:22px; flex-shrink:0;
  box-shadow:0 2px 10px rgba(124,58,237,0.25);
}
.ao-header-content {
  flex:1;
}
.ao-title {
  font-size:18px; font-weight:800;
  color:var(--t1,#18103a);
  letter-spacing:-0.02em; margin-bottom:2px;
}
.ao-subtitle {
  font-size:12px; 
  color:var(--t2,#4a3870);
}
.ao-body {
  padding:20px 24px;
}
.ao-section {
  margin-bottom:20px;
}
.ao-section:last-child {
  margin-bottom:0;
}
.ao-section-title {
  font-size:11px; font-weight:700;
  color:var(--t3,#a89dc8);
  text-transform:uppercase;
  letter-spacing:0.05em;
  margin-bottom:10px;
}
.ao-stats {
  display:grid; grid-template-columns:1fr 1fr;
  gap:10px;
}
.ao-stat {
  padding:14px;
  border-radius:10px;
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.08));
}
.ao-stat-value {
  font-size:24px; font-weight:900;
  color:var(--t1,#18103a);
  margin-bottom:3px;
}
.ao-stat-label {
  font-size:10px; font-weight:600;
  color:var(--t3,#a89dc8);
  text-transform:uppercase;
  letter-spacing:0.05em;
}
.ao-warning {
  padding:12px;
  border-radius:10px;
  background:rgba(217,119,6,0.06);
  border:1.5px solid rgba(217,119,6,0.15);
  display:flex; align-items:flex-start; gap:10px;
}
.ao-warning-icon {
  font-size:16px; flex-shrink:0;
  margin-top:2px;
}
.ao-warning-text {
  font-size:11.5px;
  color:#92400e;
  line-height:1.6;
  font-weight:500;
}
.ao-attempts {
  display:flex; flex-direction:column; gap:6px;
}
.ao-attempt {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 12px;
  border-radius:8px;
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.08));
}
.ao-attempt-label {
  font-size:11.5px; font-weight:600;
  color:var(--t2,#4a3870);
}
.ao-attempt-score {
  font-size:15px; font-weight:800;
  display:flex; align-items:center; gap:4px;
}
.ao-attempt-score.passed {
  color:var(--teal,#0d9488);
}
.ao-attempt-score.failed {
  color:#dc2626;
}
.ao-footer {
  padding:16px 24px;
  border-top:1px solid var(--border,rgba(124,58,237,0.08));
  display:flex; gap:10px;
}
.ao-btn {
  flex:1; padding:11px;
  border-radius:9px;
  font-size:13px; font-weight:700;
  cursor:pointer; border:none;
  transition:all 0.15s;
  display:flex; align-items:center; justify-content:center; gap:6px;
}
.ao-btn-secondary {
  background:transparent;
  border:1.5px solid var(--border,rgba(124,58,237,0.15));
  color:var(--t2,#4a3870);
}
.ao-btn-secondary:hover {
  background:rgba(124,58,237,0.06);
}
.ao-btn-primary {
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff;
  box-shadow:0 2px 8px rgba(124,58,237,0.25);
}
.ao-btn-primary:hover {
  transform:translateY(-1px);
  box-shadow:0 4px 14px rgba(124,58,237,0.35);
}
.ao-btn:disabled {
  opacity:0.5; cursor:not-allowed;
}
.ao-btn:disabled:hover {
  transform:none;
}
.ao-no-attempts {
  padding:14px;
  border-radius:10px;
  background:rgba(220,38,38,0.06);
  border:1.5px solid rgba(220,38,38,0.2);
  text-align:center;
}
.ao-no-attempts-title {
  font-size:14px; font-weight:700; 
  color:#dc2626; margin-bottom:4px;
}
.ao-no-attempts-text {
  font-size:11.5px; color:#7f1d1d;
}
`;

export default function AssessmentOverview({
  title,
  description,
  passingScore,
  questionCount,
  attemptsUsed,
  maxAttempts,
  previousScores,
  onStart,
  onClose
}: AssessmentOverviewProps) {
  const attemptsRemaining = maxAttempts - attemptsUsed;
  const canAttempt = attemptsRemaining > 0;
  const bestScore = previousScores.length > 0 ? Math.max(...previousScores) : 0;
  const hasPassed = bestScore >= passingScore;

  return (
    <>
      <style>{STYLES}</style>
      <div className="ao-overlay" onClick={onClose}>
        <div className="ao-modal" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="ao-header">
            <div className="ao-icon">📝</div>
            <div className="ao-header-content">
              <div className="ao-title">{title}</div>
              <div className="ao-subtitle">{description}</div>
            </div>
          </div>

          {/* Body */}
          <div className="ao-body">
            
            {/* Stats */}
            <div className="ao-section">
              <div className="ao-section-title">Assessment Details</div>
              <div className="ao-stats">
                <div className="ao-stat">
                  <div className="ao-stat-value">{questionCount}</div>
                  <div className="ao-stat-label">Questions</div>
                </div>
                <div className="ao-stat">
                  <div className="ao-stat-value">{passingScore}%</div>
                  <div className="ao-stat-label">Passing Score</div>
                </div>
                <div className="ao-stat">
                  <div className="ao-stat-value">{attemptsRemaining}</div>
                  <div className="ao-stat-label">Attempts Left</div>
                </div>
                <div className="ao-stat">
                  <div className="ao-stat-value">{bestScore}%</div>
                  <div className="ao-stat-label">Best Score</div>
                </div>
              </div>
            </div>

            {/* Warning */}
            {canAttempt && (
              <div className="ao-section">
                <div className="ao-warning">
                  <div className="ao-warning-icon">⚠️</div>
                  <div className="ao-warning-text">
                    <strong>Important:</strong> You have {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining. 
                    You must score at least {passingScore}% to pass. Make sure you understand the material before starting.
                  </div>
                </div>
              </div>
            )}

            {/* Previous Attempts */}
            {previousScores.length > 0 && (
              <div className="ao-section">
                <div className="ao-section-title">Previous Attempts</div>
                <div className="ao-attempts">
                  {previousScores.map((score, idx) => (
                    <div key={idx} className="ao-attempt">
                      <div className="ao-attempt-label">Attempt {idx + 1}</div>
                      <div className={`ao-attempt-score ${score >= passingScore ? 'passed' : 'failed'}`}>
                        {score}% {score >= passingScore ? <span style={{fontSize:12}}>✓</span> : <span style={{fontSize:12}}>✗</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No attempts left */}
            {!canAttempt && (
              <div className="ao-section">
                <div className="ao-no-attempts">
                  <div className="ao-no-attempts-title">No Attempts Remaining</div>
                  <div className="ao-no-attempts-text">
                    You've used all {maxAttempts} attempts. Please contact your instructor.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="ao-footer">
            <button className="ao-btn ao-btn-secondary" onClick={onClose}>
              Close
            </button>
            <button 
              className="ao-btn ao-btn-primary" 
              onClick={onStart}
              disabled={!canAttempt}
            >
              {hasPassed ? '▶️ Retake' : '▶️ Start Assessment'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
