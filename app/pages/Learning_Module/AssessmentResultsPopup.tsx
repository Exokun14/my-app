'use client'

import { useState, useEffect } from 'react';

interface AssessmentResultsPopupProps {
  open: boolean;
  score: number;
  passingScore: number;
  passed: boolean;
  attemptsRemaining: number;
  onRetry: () => void;
  onContinue: () => void;
}

const STYLES = `
@keyframes arpFadeIn { 
  from { opacity: 0; } 
  to { opacity: 1; } 
}

@keyframes arpScaleIn { 
  from { 
    opacity: 0; 
    transform: scale(0.96);
  } 
  to { 
    opacity: 1; 
    transform: scale(1);
  } 
}

@keyframes arpSpark {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0);
  }
  10% {
    opacity: 1;
    transform: translate(var(--tx), -5px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc(var(--tx) * 2), -40px) scale(0.2);
  }
}

@keyframes arpShimmer {
  0% { left: -100%; }
  100% { left: 200%; }
}

.arp-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: arpFadeIn 0.2s ease;
  padding: 20px;
}

.arp-modal {
  background: var(--surface, #fff);
  border-radius: 16px;
  border: 1.5px solid var(--border, rgba(124, 58, 237, 0.1));
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  max-width: 460px;
  width: 100%;
  animation: arpScaleIn 0.3s ease;
  overflow: hidden;
}

.arp-header {
  padding: 24px 24px 20px;
  text-align: center;
}

.arp-icon {
  font-size: 56px;
  margin-bottom: 8px;
  display: inline-block;
}

.arp-title {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.arp-title.passed { color: var(--teal, #0d9488); }
.arp-title.failed { color: #dc2626; }

.arp-subtitle {
  font-size: 12px;
  color: var(--t2, #4a3870);
}

.arp-progress-section {
  padding: 32px 24px;
  background: linear-gradient(180deg, var(--bg, #faf9ff) 0%, var(--surface, #fff) 100%);
  border-top: 1px solid var(--border, rgba(124, 58, 237, 0.06));
  border-bottom: 1px solid var(--border, rgba(124, 58, 237, 0.06));
  position: relative;
  overflow: hidden;
}

.arp-progress-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  animation: arpShimmer 2s ease-in-out infinite;
}

.arp-score-display {
  text-align: center;
  margin-bottom: 24px;
}

.arp-score-value {
  font-size: 64px;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 6px;
  transition: color 0.3s ease;
}

.arp-score-value.passed { 
  color: var(--teal, #0d9488);
  text-shadow: 0 2px 12px rgba(13, 148, 136, 0.3);
}

.arp-score-value.failed { 
  color: #dc2626;
  text-shadow: 0 2px 12px rgba(220, 38, 38, 0.3);
}

.arp-score-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--t3, #a89dc8);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.arp-progress-bar-container {
  position: relative;
  width: 100%;
  height: 12px;
  background: rgba(124, 58, 237, 0.1);
  border-radius: 10px;
  overflow: visible;
}

.arp-progress-bar {
  position: relative;
  height: 100%;
  border-radius: 10px;
  transition: width 0.05s linear;
  overflow: hidden;
}

.arp-progress-bar.passed {
  background: linear-gradient(90deg, #0d9488, #16a34a);
  box-shadow: 0 0 20px rgba(13, 148, 136, 0.5);
}

.arp-progress-bar.failed {
  background: linear-gradient(90deg, #dc2626, #ef4444);
  box-shadow: 0 0 20px rgba(220, 38, 38, 0.5);
}

.arp-progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  animation: arpShimmer 1.5s ease-in-out infinite;
}

.arp-sparks {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.arp-spark {
  position: absolute;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  animation: arpSpark 1s ease-out infinite;
  transform: translateY(-50%);
}

.arp-spark:nth-child(1) { --tx: 5px; animation-delay: 0s; left: 10%; color: #fbbf24; }
.arp-spark:nth-child(2) { --tx: -8px; animation-delay: 0.2s; left: 25%; color: #f59e0b; }
.arp-spark:nth-child(3) { --tx: 10px; animation-delay: 0.4s; left: 40%; color: #fbbf24; }
.arp-spark:nth-child(4) { --tx: -6px; animation-delay: 0.6s; left: 55%; color: #f59e0b; }
.arp-spark:nth-child(5) { --tx: 8px; animation-delay: 0.8s; left: 70%; color: #fbbf24; }
.arp-spark:nth-child(6) { --tx: -10px; animation-delay: 1s; left: 85%; color: #f59e0b; }

.arp-body {
  padding: 20px 24px;
}

.arp-info {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1.5px solid;
}

.arp-info.passed {
  background: rgba(13, 148, 136, 0.08);
  border-color: rgba(13, 148, 136, 0.2);
}

.arp-info.failed {
  background: rgba(220, 38, 38, 0.08);
  border-color: rgba(220, 38, 38, 0.2);
}

.arp-info-text {
  font-size: 12px;
  line-height: 1.6;
  font-weight: 500;
}

.arp-info-text.passed { color: #065f46; }
.arp-info-text.failed { color: #7f1d1d; }

.arp-footer {
  padding: 16px 24px 20px;
  display: flex;
  gap: 10px;
}

.arp-btn {
  flex: 1;
  padding: 11px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.arp-btn-retry {
  background: transparent;
  border: 1.5px solid var(--border, rgba(124, 58, 237, 0.2));
  color: var(--t2, #4a3870);
}

.arp-btn-retry:hover {
  background: rgba(124, 58, 237, 0.08);
  border-color: rgba(124, 58, 237, 0.3);
  transform: translateY(-1px);
}

.arp-btn-continue {
  background: linear-gradient(135deg, var(--purple, #7c3aed), var(--teal, #0d9488));
  color: #fff;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
}

.arp-btn-continue:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
}

.arp-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.arp-btn:disabled:hover {
  transform: none;
}
`;

export default function AssessmentResultsPopup({
  open,
  score,
  passingScore,
  passed,
  attemptsRemaining,
  onRetry,
  onContinue
}: AssessmentResultsPopupProps) {
  const [displayScore, setDisplayScore] = useState(0);

  // Synchronized animation: score counter and progress bar move together
  useEffect(() => {
    if (!open) {
      setDisplayScore(0);
      return;
    }

    // Animation settings
    const duration = 2000; // 2 seconds total
    const fps = 60; // 60 frames per second for smooth animation
    const totalFrames = (duration / 1000) * fps;
    const increment = score / totalFrames;
    const frameTime = 1000 / fps;
    
    let currentFrame = 0;
    const timer = setInterval(() => {
      currentFrame++;
      const newScore = Math.min(currentFrame * increment, score);
      setDisplayScore(Math.round(newScore));
      
      if (currentFrame >= totalFrames) {
        clearInterval(timer);
        setDisplayScore(score); // Ensure we end exactly at the target score
      }
    }, frameTime);

    return () => clearInterval(timer);
  }, [open, score]);

  if (!open) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div className="arp-overlay" onClick={passed ? onContinue : undefined}>
        <div className="arp-modal" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="arp-header">
            <div className="arp-icon">{passed ? '🎉' : '📊'}</div>
            <div className={`arp-title ${passed ? 'passed' : 'failed'}`}>
              {passed ? 'Assessment Passed!' : 'Assessment Complete'}
            </div>
            <div className="arp-subtitle">
              {passed ? 'Congratulations on your excellent work!' : 'Review your results below'}
            </div>
          </div>

          {/* Progress Section */}
          <div className="arp-progress-section">
            {/* Score Display */}
            <div className="arp-score-display">
              <div className={`arp-score-value ${passed ? 'passed' : 'failed'}`}>
                {displayScore}%
              </div>
              <div className="arp-score-label">Your Score</div>
            </div>

            {/* Progress Bar - Synced with displayScore */}
            <div className="arp-progress-bar-container">
              <div 
                className={`arp-progress-bar ${passed ? 'passed' : 'failed'}`}
                style={{ width: `${displayScore}%` }}
              />
              
              {/* Sparks - only show when bar is filling */}
              {displayScore > 0 && displayScore < score && (
                <div className="arp-sparks">
                  <div className="arp-spark" />
                  <div className="arp-spark" />
                  <div className="arp-spark" />
                  <div className="arp-spark" />
                  <div className="arp-spark" />
                  <div className="arp-spark" />
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="arp-body">
            <div className={`arp-info ${passed ? 'passed' : 'failed'}`}>
              <div className={`arp-info-text ${passed ? 'passed' : 'failed'}`}>
                {passed ? (
                  <>
                    <strong>Excellent!</strong> You scored {score}% which exceeds the passing score of {passingScore}%. 
                    You've demonstrated mastery of this material.
                  </>
                ) : (
                  <>
                    <strong>Score: {score}%</strong> • Passing score: {passingScore}%
                    {attemptsRemaining > 0 ? (
                      <> • You have {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining. 
                      Review the material and try again.</>
                    ) : (
                      <> • No attempts remaining. Please contact your instructor for assistance.</>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="arp-footer">
            {!passed && attemptsRemaining > 0 && (
              <button className="arp-btn arp-btn-retry" onClick={onRetry}>
                🔄 Retry ({attemptsRemaining} left)
              </button>
            )}
            <button 
              className="arp-btn arp-btn-continue" 
              onClick={onContinue}
              style={!passed && attemptsRemaining > 0 ? undefined : { flex: 2 }}
            >
              {passed ? '✓ Continue' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
