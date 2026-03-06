'use client'

import { useEffect, useState, useRef } from "react";
import loaderContent from "../Data/loader-content.json";

type LoadingStage = 'courses' | 'activities' | 'categories' | 'done';
type Phase = 'idle' | 'exiting' | 'gone';

interface InitialLoaderProps {
  onComplete?: () => void;
  stage?: LoadingStage;
  minDisplayTime?: number; // ms — loader won't exit until this has elapsed (default 2500)
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

const STAGE_LABELS: Record<LoadingStage, string> = {
  courses:    'Gathering your courses',
  activities: 'Syncing activities',
  categories: 'Organizing categories',
  done:       'Ready to go',
};


export default function InitialLoader({ onComplete, stage = 'courses', minDisplayTime = 2500 }: InitialLoaderProps) {
  const [phase, setPhase]                     = useState<Phase>('idle');
  const [displayProgress, setDisplayProgress] = useState(0);
  const [dotCount, setDotCount]               = useState(0);
  const [flipIndex, setFlipIndex]             = useState(0);
  const [flipState, setFlipState]             = useState<'visible' | 'out' | 'in'>('visible');
  const [pipIndex, setPipIndex]               = useState(0);
  const [scanLine, setScanLine]               = useState(0);
  const [glitchActive, setGlitchActive]       = useState(false);

  const flipTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitScheduledRef  = useRef(false);
  const rootRef           = useRef<HTMLDivElement>(null);
  // Both gates must be true before exit begins
  const minTimeElapsedRef = useRef(false);
  const stageIsDoneRef    = useRef(false);

  const tryExit = useRef(() => {});
  tryExit.current = () => {
    if (!minTimeElapsedRef.current || !stageIsDoneRef.current) return;
    if (exitScheduledRef.current) return;
    exitScheduledRef.current = true;
    setDisplayProgress(100);
    // Brief hold at 100% so user reads "Ready to go"
    setTimeout(() => setPhase('exiting'), 550);
  };

  const [flipWords, setFlipWords] = useState<string[]>(loaderContent.flipWords.slice(0, 4));
  const [quote, setQuote]         = useState(loaderContent.quotes[0]);

  useEffect(() => {
    setFlipWords(pickRandom(loaderContent.flipWords, 4));
    const pool = loaderContent.quotes;
    setQuote(pool[Math.floor(Math.random() * pool.length)]);
  }, []);

  // ── Progress bar ─────────────────────────────────────────────────────────────
  const stageProgress: Record<LoadingStage, number> = {
    courses: 25, activities: 60, categories: 85, done: 100,
  };
  const targetProgress = stageProgress[stage];

  useEffect(() => {
    if (displayProgress >= targetProgress) return;
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        const next = prev + Math.ceil((targetProgress - prev) * 0.07);
        if (next >= targetProgress) { clearInterval(interval); return targetProgress; }
        return next;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [targetProgress]);

  // Gate 1: minimum display time
  useEffect(() => {
    const t = setTimeout(() => {
      minTimeElapsedRef.current = true;
      tryExit.current();
    }, minDisplayTime);
    return () => clearTimeout(t);
  }, []);

  // Gate 2: stage done
  useEffect(() => {
    if (stage !== 'done') return;
    stageIsDoneRef.current = true;
    tryExit.current();
  }, [stage]);

  // ── Exit animation — runs directly on the root element ──────────────────────
  // Animating the root itself means there is no separate layer, no gap, no flash.
  // The element covers the screen until the very last frame, then onfinish fires
  // which sets phase='gone' (return null) and calls onComplete simultaneously.
  useEffect(() => {
    if (phase !== 'exiting') return;
    const el = rootRef.current;
    if (!el) return;

    const anim = el.animate(
      [
        { opacity: 1, transform: 'scale(1)',        filter: 'blur(0px)' },
        { opacity: 1, transform: 'scale(1.018)',    filter: 'blur(0px)',   offset: 0.15 },
        { opacity: 0, transform: 'scale(1.06)',     filter: 'blur(18px)',  offset: 0.7  },
        { opacity: 0, transform: 'scale(1.1)',      filter: 'blur(32px)'                },
      ],
      { duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' }
    );

    anim.onfinish = () => {
      setPhase('gone');
      onComplete?.();
    };

    return () => anim.cancel();
  }, [phase]);

  // ── Cycling dots ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setDotCount(d => (d + 1) % 4), 420);
    return () => clearInterval(interval);
  }, []);

  // ── Flip word ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const scheduleFlip = () => {
      flipTimerRef.current = setTimeout(() => {
        setFlipState('out');
        setTimeout(() => {
          setFlipIndex(i => {
            const next = (i + 1) % flipWords.length;
            if (next === 0) { setFlipWords(pickRandom(loaderContent.flipWords, 4)); setPipIndex(0); }
            else { setPipIndex(next); }
            return next;
          });
          setFlipState('in');
          setTimeout(() => { setFlipState('visible'); scheduleFlip(); }, 380);
        }, 320);
      }, 2200);
    };
    scheduleFlip();
    return () => { if (flipTimerRef.current) clearTimeout(flipTimerRef.current); };
  }, []);

  // ── Scan line ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    let frame: number;
    let pos = 0;
    const tick = () => { pos = (pos + 0.35) % 112; setScanLine(pos); frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // ── Glitch ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const schedule = () => {
      const t = setTimeout(() => {
        setGlitchActive(true);
        setTimeout(() => { setGlitchActive(false); schedule(); }, 160);
      }, 3200 + Math.random() * 3500);
      return () => clearTimeout(t);
    };
    schedule();
  }, []);

  if (phase === 'gone') return null;

  const dots = '.'.repeat(dotCount);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

        .il-root {
          position: fixed; inset: 0; z-index: 99999;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          background: #fafaf9; overflow: hidden;
        }

        /* Subtle purple radial glow that follows cursor */
        .il-root::after {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(
            220px circle at var(--mx, 50%) var(--my, 50%),
            rgba(124, 58, 237, 0.09) 0%,
            transparent 100%
          );
          pointer-events: none; z-index: 0;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .il-root:hover::after { opacity: 1; }

        /* Background */
        .il-bg { position: absolute; inset: 0; pointer-events: none; }
        .il-orb {
          position: absolute; border-radius: 50%; filter: blur(90px);
          animation: il-float 7s ease-in-out infinite alternate;
        }
        .il-orb-1 {
          width: 560px; height: 560px;
          background: radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%);
          top: -200px; left: -180px;
        }
        .il-orb-2 {
          width: 440px; height: 440px;
          background: radial-gradient(circle, rgba(20,184,166,0.11) 0%, transparent 70%);
          bottom: -120px; right: -120px; animation-delay: -3.5s;
        }
        .il-orb-3 {
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(139,92,246,0.09) 0%, transparent 70%);
          top: 45%; left: 55%; animation-delay: -1.5s;
        }
        .il-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px);
          background-size: 52px 52px;
          mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 20%, transparent 100%);
        }

        .il-scan {
          position: absolute; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.25) 30%, rgba(20,184,166,0.35) 50%, rgba(124,58,237,0.25) 70%, transparent 100%);
          filter: blur(1px); pointer-events: none; z-index: 1;
        }
        .il-corner {
          position: absolute; width: 22px; height: 22px;
          border-color: rgba(124,58,237,0.18); border-style: solid;
        }
        .il-corner-tl { top: 24px; left: 24px; border-width: 1.5px 0 0 1.5px; }
        .il-corner-tr { top: 24px; right: 24px; border-width: 1.5px 1.5px 0 0; }
        .il-corner-bl { bottom: 24px; left: 24px; border-width: 0 0 1.5px 1.5px; }
        .il-corner-br { bottom: 24px; right: 24px; border-width: 0 1.5px 1.5px 0; }

        .il-particles { position: absolute; inset: 0; pointer-events: none; }
        .il-particle  { position: absolute; border-radius: 50%; animation: il-particle-rise linear infinite; }

        .il-content {
          position: relative; z-index: 2;
          display: flex; flex-direction: column; align-items: center;
        }
        .il-icon-wrap { position: relative; width: 104px; height: 104px; margin-bottom: 34px; }
        .il-icon-ring-outer {
          position: absolute; inset: -10px; border-radius: 50%;
          border: 1px solid rgba(124,58,237,0.07); animation: il-spin 14s linear infinite;
        }
        .il-icon-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1.5px solid rgba(124,58,237,0.17); animation: il-spin 9s linear infinite;
        }
        .il-icon-ring-2 {
          position: absolute; inset: 10px; border-radius: 50%;
          border: 1px dashed rgba(20,184,166,0.19); animation: il-spin 6s linear infinite reverse;
        }
        .il-icon-core {
          position: absolute; inset: 20px; border-radius: 50%;
          background: linear-gradient(135deg, rgba(124,58,237,0.92), rgba(20,184,166,0.82));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 36px rgba(124,58,237,0.26), 0 2px 8px rgba(124,58,237,0.12);
          animation: il-glow-pulse 2.4s ease-in-out infinite;
        }
        .il-icon-core svg { width: 26px; height: 26px; color: white; }
        .il-orbit  { position: absolute; inset: -4px; animation: il-spin 3.2s linear infinite; }
        .il-orbit-dot {
          position: absolute; width: 7px; height: 7px; background: #7c3aed; border-radius: 50%;
          top: 0; left: 50%; transform: translateX(-50%);
          box-shadow: 0 0 10px rgba(124,58,237,0.65), 0 0 0 3px rgba(124,58,237,0.1);
        }
        .il-orbit-2 { position: absolute; inset: -4px; animation: il-spin 5s linear infinite reverse; }
        .il-orbit-dot-2 {
          position: absolute; width: 5px; height: 5px; background: #14b8a6; border-radius: 50%;
          bottom: 0; left: 50%; transform: translateX(-50%);
          box-shadow: 0 0 8px rgba(20,184,166,0.6);
        }
        .il-title-row { display: flex; align-items: baseline; gap: 12px; margin-bottom: 5px; }
        .il-title-static {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 44px; font-weight: 400; font-style: italic;
          color: #1a1230; letter-spacing: -0.5px; line-height: 1; white-space: nowrap;
          opacity: 0; animation: il-fade-in 0.7s ease 0.2s forwards;
        }
        .il-flip-box {
          perspective: 700px; display: inline-block; overflow: hidden;
          height: 52px; vertical-align: bottom;
          opacity: 0; transform: translateY(18px);
          animation: il-rise 0.7s ease 0.28s forwards;
        }
        .il-flip-phrase {
          display: inline-block; white-space: nowrap;
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 44px; font-weight: 400; font-style: normal;
          background: linear-gradient(135deg, #7c3aed 0%, #14b8a6 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; line-height: 1.18;
          transform-origin: 50% 0%; backface-visibility: hidden; will-change: transform, opacity;
        }
        .il-flip-phrase.visible { opacity: 1; transform: rotateX(0deg) translateY(0); }
        .il-flip-phrase.out { animation: il-flip-out 0.3s cubic-bezier(0.55,0,1,0.45) forwards; }
        .il-flip-phrase.in  { animation: il-flip-in  0.36s cubic-bezier(0,0.55,0.45,1) forwards; }
        .il-subtitle {
          font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 300;
          color: rgba(26,18,48,0.28); letter-spacing: 3px; text-transform: uppercase;
          margin-bottom: 32px; opacity: 0; animation: il-rise 0.7s ease 0.38s forwards;
        }
        .il-quote-wrap {
          width: 320px; text-align: center; margin-bottom: 32px;
          opacity: 0; animation: il-rise 0.7s ease 0.5s forwards;
        }
        .il-quote-rule {
          width: 28px; height: 1px;
          background: linear-gradient(90deg, rgba(124,58,237,0.3), rgba(20,184,166,0.3));
          margin: 0 auto 10px;
        }
        .il-quote-line {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 15px; font-style: italic; font-weight: 400;
          color: rgba(26,18,48,0.58); line-height: 1.65; margin-bottom: 8px; display: block;
        }
        .il-quote-author {
          font-family: 'DM Mono', monospace; font-size: 9px; font-weight: 400;
          color: rgba(124,58,237,0.42); letter-spacing: 2.5px; text-transform: uppercase;
        }
        .il-stats {
          display: flex; gap: 24px; margin-bottom: 30px;
          opacity: 0; animation: il-rise 0.7s ease 0.55s forwards;
        }
        .il-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .il-stat-value {
          font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500;
          color: #7c3aed; line-height: 1; letter-spacing: 0.3px;
        }
        .il-stat-label {
          font-family: 'DM Mono', monospace; font-size: 9px; font-weight: 300;
          color: rgba(26,18,48,0.26); letter-spacing: 2px; text-transform: uppercase;
        }
        .il-stat-divider { width: 1px; height: 28px; background: rgba(124,58,237,0.09); align-self: center; }
        .il-progress-wrap { width: 300px; opacity: 0; animation: il-rise 0.7s ease 0.65s forwards; }
        .il-progress-bar-bg {
          width: 100%; height: 2px; background: rgba(124,58,237,0.08); border-radius: 2px;
          overflow: visible; position: relative; margin-bottom: 14px;
        }
        .il-progress-bar-fill {
          height: 100%; border-radius: 2px;
          background: linear-gradient(90deg, #7c3aed, #14b8a6);
          transition: width 0.3s cubic-bezier(0.4,0,0.2,1); position: relative;
        }
        .il-progress-bar-fill::after {
          content: ''; position: absolute;
          right: -1px; top: 50%; transform: translateY(-50%);
          width: 7px; height: 7px; border-radius: 50%; background: #7c3aed;
          box-shadow: 0 0 12px rgba(124,58,237,0.7), 0 0 0 3px rgba(124,58,237,0.1);
        }
        .il-progress-glow {
          position: absolute; top: -4px; left: 0; height: 10px; border-radius: 5px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.14), transparent);
          transition: width 0.3s cubic-bezier(0.4,0,0.2,1); filter: blur(4px);
        }
        .il-progress-meta { display: flex; justify-content: space-between; align-items: center; }
        .il-status {
          font-family: 'DM Mono', monospace; font-size: 10px;
          color: rgba(26,18,48,0.3); letter-spacing: 1.5px;
        }
        .il-percent {
          font-family: 'DM Mono', monospace; font-size: 11px;
          color: #7c3aed; font-weight: 500; opacity: 0.8;
        }
        .il-stages {
          display: flex; gap: 7px; margin-top: 18px;
          opacity: 0; animation: il-rise 0.7s ease 0.75s forwards;
        }
        .il-stage-pip {
          width: 26px; height: 3px; border-radius: 2px; background: rgba(124,58,237,0.09);
          transition: background 0.5s ease, transform 0.4s ease, width 0.4s ease;
        }
        .il-stage-pip.active { background: linear-gradient(90deg, #7c3aed, #14b8a6); transform: scaleY(1.6); width: 38px; }
        .il-stage-pip.done   { background: rgba(20,184,166,0.32); }
        .il-tag {
          position: absolute; bottom: 26px;
          font-family: 'DM Mono', monospace; font-size: 9px;
          color: rgba(26,18,48,0.13); letter-spacing: 3px; text-transform: uppercase;
        }

        @keyframes il-float {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(28px,18px) scale(1.08); }
        }
        @keyframes il-spin { to { transform: rotate(360deg); } }
        @keyframes il-glow-pulse {
          0%,100% { box-shadow: 0 8px 36px rgba(124,58,237,0.26), 0 2px 8px rgba(124,58,237,0.12); }
          50%      { box-shadow: 0 14px 52px rgba(124,58,237,0.4), 0 4px 18px rgba(124,58,237,0.16), 0 0 0 10px rgba(124,58,237,0.05); }
        }
        @keyframes il-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes il-fade-in { to { opacity: 1; } }
        @keyframes il-particle-rise {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          10%  { opacity: 1; } 90% { opacity: 0.4; }
          100% { transform: translateY(-100vh) translateX(var(--drift,20px)); opacity: 0; }
        }
        @keyframes il-flip-out {
          0%   { opacity: 1; transform: rotateX(0deg) translateY(0); }
          100% { opacity: 0; transform: rotateX(-88deg) translateY(-6px); }
        }
        @keyframes il-flip-in {
          0%   { opacity: 0; transform: rotateX(88deg) translateY(6px); }
          100% { opacity: 1; transform: rotateX(0deg) translateY(0); }
        }
        @keyframes il-glitch {
          0%   { transform: translate(0,0);     clip-path: inset(0 0 85% 0); }
          25%  { transform: translate(-3px,1px); clip-path: inset(35% 0 45% 0); }
          50%  { transform: translate(3px,-1px); clip-path: inset(65% 0 15% 0); }
          75%  { transform: translate(-1px,2px); clip-path: inset(15% 0 65% 0); }
          100% { transform: translate(0,0);      clip-path: none; }
        }
      `}</style>

      <div
        className="il-root"
        ref={rootRef}
        onMouseMove={e => {
          const el = rootRef.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
          el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
        }}
      >
        <div className="il-scan" style={{ top: `${scanLine}%` }} />
        <div className="il-corner il-corner-tl" />
        <div className="il-corner il-corner-tr" />
        <div className="il-corner il-corner-bl" />
        <div className="il-corner il-corner-br" />

        <div className="il-bg">
          <div className="il-orb il-orb-1" />
          <div className="il-orb il-orb-2" />
          <div className="il-orb il-orb-3" />
          <div className="il-grid" />
        </div>

        <div className="il-particles">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="il-particle" style={{
              left: `${4 + (i * 4.1) % 92}%`,
              bottom: `${(i * 13) % 25}%`,
              animationDuration: `${4.5 + (i * 0.65) % 6}s`,
              animationDelay: `${(i * 0.28) % 4}s`,
              ['--drift' as any]: `${((i % 5) - 2) * 22}px`,
              width: i % 3 === 0 ? '3px' : '2px',
              height: i % 3 === 0 ? '3px' : '2px',
              background: i % 2 === 0 ? 'rgba(124,58,237,0.28)' : 'rgba(20,184,166,0.24)',
            }} />
          ))}
        </div>

        <div className="il-content">
          <div className="il-icon-wrap">
            <div className="il-icon-ring-outer" />
            <div className="il-icon-ring" />
            <div className="il-icon-ring-2" />
            <div className="il-icon-core">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div className="il-orbit"><div className="il-orbit-dot" /></div>
            <div className="il-orbit-2"><div className="il-orbit-dot-2" /></div>
          </div>

          <div className="il-title-row">
            <span className={`il-title-static${glitchActive ? ' glitch' : ''}`}>Learning</span>
            <div className="il-flip-box">
              <span className={`il-flip-phrase ${flipState}`}>{flipWords[flipIndex]}</span>
            </div>
          </div>

          <p className="il-subtitle">Preparing your workspace</p>

          <div className="il-quote-wrap">
            <div className="il-quote-rule" />
            <span className="il-quote-line">"{quote.line}"</span>
            <span className="il-quote-author">— {quote.author}</span>
          </div>

          <div className="il-stats">
            <div className="il-stat">
              <span className="il-stat-value">Beta v0.1</span>
              <span className="il-stat-label">Version</span>
            </div>
            <div className="il-stat-divider" />
            <div className="il-stat">
              <span className="il-stat-value">GenieX</span>
              <span className="il-stat-label">Powered by</span>
            </div>
            <div className="il-stat-divider" />
            <div className="il-stat">
              <span className="il-stat-value" style={{ color: '#14b8a6' }}>Live</span>
              <span className="il-stat-label">Status</span>
            </div>
          </div>

          <div className="il-progress-wrap">
            <div className="il-progress-bar-bg">
              <div className="il-progress-bar-fill" style={{ width: `${displayProgress}%` }} />
              <div className="il-progress-glow" style={{ width: `${displayProgress}%` }} />
            </div>
            <div className="il-progress-meta">
              <span className="il-status">{STAGE_LABELS[stage]}{dots}</span>
              <span className="il-percent">{displayProgress}%</span>
            </div>
          </div>

          <div className="il-stages">
            {flipWords.map((_, i) => (
              <div
                key={i}
                className={['il-stage-pip', i === pipIndex ? 'active' : '', i < pipIndex ? 'done' : ''].filter(Boolean).join(' ')}
              />
            ))}
          </div>
        </div>

        <span className="il-tag">GenieX CRM</span>
      </div>
    </>
  );
}
