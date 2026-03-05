'use client'

import { useEffect, useState } from "react";

type LoadingStage = 'courses' | 'activities' | 'categories' | 'done';

interface InitialLoaderProps {
  onComplete?: () => void;
  stage?: LoadingStage;  // driven by parent
}

export default function InitialLoader({ onComplete, stage = 'courses' }: InitialLoaderProps) {
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');
  const [displayProgress, setDisplayProgress] = useState(0);
  const [dotCount, setDotCount] = useState(0);

  // Map stage → target progress value
  const stageProgress: Record<LoadingStage, number> = {
    courses:    25,
    activities: 60,
    categories: 85,
    done:       100,
  };

  const stageLabel: Record<LoadingStage, string> = {
    courses:    'Loading courses',
    activities: 'Loading activities',
    categories: 'Loading categories',
    done:       'Almost ready',
  };

  const targetProgress = stageProgress[stage];

  // Animate displayProgress toward targetProgress smoothly
  useEffect(() => {
    if (displayProgress >= targetProgress) return;

    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        const next = prev + Math.ceil((targetProgress - prev) * 0.08);
        if (next >= targetProgress) {
          clearInterval(interval);
          return targetProgress;
        }
        return next;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [targetProgress]);

  // When stage becomes 'done': fill to 100 then exit
  useEffect(() => {
    if (stage !== 'done') return;

    // Ensure we hit 100 then trigger exit
    const fillTimer = setTimeout(() => {
      setDisplayProgress(100);
    }, 150);

    const exitTimer = setTimeout(() => {
      setPhase('exit');
      setTimeout(() => onComplete?.(), 550);
    }, 700);

    return () => { clearTimeout(fillTimer); clearTimeout(exitTimer); };
  }, [stage]);

  // Cycling dots
  useEffect(() => {
    const interval = setInterval(() => setDotCount(d => (d + 1) % 4), 400);
    return () => clearInterval(interval);
  }, []);

  const dots = '.'.repeat(dotCount);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

        .il-root {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .il-root.exit {
          opacity: 0;
          transform: scale(1.03);
          pointer-events: none;
        }

        .il-bg { position: absolute; inset: 0; pointer-events: none; }

        .il-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: il-float 6s ease-in-out infinite alternate;
        }
        .il-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%);
          top: -150px; left: -150px; animation-delay: 0s;
        }
        .il-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(20,184,166,0.14) 0%, transparent 70%);
          bottom: -100px; right: -100px; animation-delay: -3s;
        }
        .il-orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%);
          top: 50%; left: 60%; animation-delay: -1.5s;
        }

        .il-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
        }

        .il-particles { position: absolute; inset: 0; pointer-events: none; }
        .il-particle {
          position: absolute;
          border-radius: 50%;
          animation: il-particle-rise linear infinite;
        }

        .il-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .il-icon-wrap {
          position: relative;
          width: 96px; height: 96px;
          margin-bottom: 32px;
        }
        .il-icon-ring {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(124,58,237,0.25);
          animation: il-spin 8s linear infinite;
        }
        .il-icon-ring-2 {
          position: absolute; inset: 8px;
          border-radius: 50%;
          border: 1px solid rgba(20,184,166,0.2);
          animation: il-spin 5s linear infinite reverse;
        }
        .il-icon-core {
          position: absolute; inset: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(124,58,237,0.9), rgba(20,184,166,0.8));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 32px rgba(124,58,237,0.3), 0 2px 8px rgba(124,58,237,0.15);
          animation: il-glow-pulse 2s ease-in-out infinite;
        }
        .il-icon-core svg { width: 28px; height: 28px; color: white; }

        .il-orbit { position: absolute; inset: -4px; animation: il-spin 3s linear infinite; }
        .il-orbit-dot {
          position: absolute;
          width: 6px; height: 6px;
          background: #7c3aed; border-radius: 50%;
          top: 0; left: 50%; transform: translateX(-50%);
          box-shadow: 0 0 8px rgba(124,58,237,0.6);
        }

        .il-title {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 42px; font-weight: 400; font-style: italic;
          color: #1a1230; letter-spacing: -0.5px; line-height: 1;
          margin-bottom: 6px;
          opacity: 0; transform: translateY(16px);
          animation: il-rise 0.7s ease 0.2s forwards;
        }
        .il-title em {
          font-style: normal;
          background: linear-gradient(135deg, #7c3aed, #14b8a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .il-subtitle {
          font-family: 'DM Mono', monospace;
          font-size: 11px; font-weight: 300;
          color: rgba(26,18,48,0.35);
          letter-spacing: 3px; text-transform: uppercase;
          margin-bottom: 48px;
          opacity: 0;
          animation: il-rise 0.7s ease 0.4s forwards;
        }

        .il-progress-wrap { width: 280px; opacity: 0; animation: il-rise 0.7s ease 0.6s forwards; }
        .il-progress-bar-bg {
          width: 100%; height: 2px;
          background: rgba(124,58,237,0.1);
          border-radius: 2px; overflow: visible; position: relative;
          margin-bottom: 16px;
        }
        .il-progress-bar-fill {
          height: 100%; border-radius: 2px;
          background: linear-gradient(90deg, #7c3aed, #14b8a6);
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .il-progress-bar-fill::after {
          content: ''; position: absolute;
          right: -1px; top: 50%; transform: translateY(-50%);
          width: 6px; height: 6px; border-radius: 50%;
          background: #7c3aed;
          box-shadow: 0 0 10px rgba(124,58,237,0.6), 0 0 0 3px rgba(124,58,237,0.1);
        }
        .il-progress-glow {
          position: absolute; top: -3px; left: 0;
          height: 8px; border-radius: 4px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.15), transparent);
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          filter: blur(3px);
        }
        .il-progress-meta { display: flex; justify-content: space-between; align-items: center; }
        .il-status {
          font-family: 'DM Mono', monospace; font-size: 10px;
          color: rgba(26,18,48,0.38); letter-spacing: 1px;
          transition: opacity 0.3s ease;
        }
        .il-percent {
          font-family: 'DM Mono', monospace; font-size: 11px;
          color: #7c3aed; font-weight: 500; opacity: 0.8;
        }

        .il-tag {
          position: absolute; bottom: 32px;
          font-family: 'DM Mono', monospace;
          font-size: 10px; color: rgba(26,18,48,0.18);
          letter-spacing: 2px; text-transform: uppercase;
        }

        @keyframes il-float {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(30px,20px) scale(1.1); }
        }
        @keyframes il-spin { to { transform: rotate(360deg); } }
        @keyframes il-glow-pulse {
          0%,100% { box-shadow: 0 8px 32px rgba(124,58,237,0.3), 0 2px 8px rgba(124,58,237,0.15); }
          50%      { box-shadow: 0 12px 48px rgba(124,58,237,0.45), 0 4px 16px rgba(124,58,237,0.2), 0 0 0 8px rgba(124,58,237,0.06); }
        }
        @keyframes il-rise { to { opacity: 1; transform: translateY(0); } }
        @keyframes il-particle-rise {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(-100vh) translateX(var(--drift,20px)); opacity: 0; }
        }
      `}</style>

      <div className={`il-root${phase === 'exit' ? ' exit' : ''}`}>
        <div className="il-bg">
          <div className="il-orb il-orb-1" />
          <div className="il-orb il-orb-2" />
          <div className="il-orb il-orb-3" />
          <div className="il-grid" />
        </div>

        <div className="il-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="il-particle"
              style={{
                left: `${5 + (i * 4.7) % 90}%`,
                bottom: `${(i * 17) % 30}%`,
                animationDuration: `${4 + (i * 0.7) % 6}s`,
                animationDelay: `${(i * 0.3) % 4}s`,
                ['--drift' as any]: `${((i % 5) - 2) * 20}px`,
                width: i % 3 === 0 ? '3px' : '2px',
                height: i % 3 === 0 ? '3px' : '2px',
                background: i % 2 === 0 ? 'rgba(124,58,237,0.35)' : 'rgba(20,184,166,0.3)',
              }}
            />
          ))}
        </div>

        <div className="il-content">
          <div className="il-icon-wrap">
            <div className="il-icon-ring" />
            <div className="il-icon-ring-2" />
            <div className="il-icon-core">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="il-orbit">
              <div className="il-orbit-dot" />
            </div>
          </div>

          <h1 className="il-title">Learning <em>Center</em></h1>
          <p className="il-subtitle">Preparing your workspace</p>

          <div className="il-progress-wrap">
            <div className="il-progress-bar-bg">
              <div className="il-progress-bar-fill" style={{ width: `${displayProgress}%` }} />
              <div className="il-progress-glow" style={{ width: `${displayProgress}%` }} />
            </div>
            <div className="il-progress-meta">
              <span className="il-status">{stageLabel[stage]}{dots}</span>
              <span className="il-percent">{displayProgress}%</span>
            </div>
          </div>
        </div>

        <span className="il-tag">LMS Platform</span>
      </div>
    </>
  );
}
