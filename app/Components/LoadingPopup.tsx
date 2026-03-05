'use client'

import { useEffect, useState } from "react";

interface LoadingPopupProps {
  visible: boolean;
  message?: string;
}

export default function LoadingPopup({ visible, message = "Loading..." }: LoadingPopupProps) {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (visible) {
      setExiting(false);
      setShow(true);
    } else {
      if (show) {
        setExiting(true);
        const t = setTimeout(() => { setShow(false); setExiting(false); }, 350);
        return () => clearTimeout(t);
      }
    }
  }, [visible]);

  if (!show) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');

        .lp-wrap {
          position: fixed;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          pointer-events: none;
        }

        .lp-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 20px 11px 14px;
          background: #ffffff;
          border: 1.5px solid rgba(124,58,237,0.2);
          border-radius: 100px;
          box-shadow:
            0 4px 20px rgba(124,58,237,0.12),
            0 1px 4px rgba(0,0,0,0.06),
            0 0 0 4px rgba(124,58,237,0.04);
          animation: lp-enter 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
          position: relative;
          overflow: hidden;
        }
        .lp-pill.lp-exit {
          animation: lp-exit 0.3s ease forwards;
        }

        /* shimmer sweep across the pill */
        .lp-pill::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.05), transparent);
          animation: lp-sweep 1.8s ease-in-out infinite;
        }

        /* ── Spinner ── */
        .lp-spinner {
          position: relative;
          width: 20px; height: 20px;
          flex-shrink: 0;
        }
        .lp-spinner-track {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(124,58,237,0.1);
        }
        .lp-spinner-arc {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: #7c3aed;
          border-right-color: rgba(124,58,237,0.35);
          animation: lp-spin 0.65s linear infinite;
        }
        .lp-spinner-dot {
          position: absolute;
          width: 5px; height: 5px;
          background: #14b8a6;
          border-radius: 50%;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 6px rgba(20,184,166,0.6);
          animation: lp-dot-pulse 1.4s ease-in-out infinite;
        }

        /* ── Text ── */
        .lp-text {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 400;
          color: #4a3d6e;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }
        .lp-text strong {
          color: #7c3aed;
          font-weight: 500;
        }

        /* ── Bottom accent line ── */
        .lp-accent {
          position: absolute;
          bottom: 0; left: 20%; right: 20%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #7c3aed, #14b8a6, transparent);
          border-radius: 1px;
          animation: lp-accent-pulse 1.5s ease-in-out infinite;
        }

        @keyframes lp-enter {
          from { opacity: 0; transform: translateY(14px) scale(0.88); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lp-exit {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(8px) scale(0.94); }
        }
        @keyframes lp-spin { to { transform: rotate(360deg); } }
        @keyframes lp-dot-pulse {
          0%,100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          50%      { opacity: 0.3; transform: translate(-50%,-50%) scale(0.5); }
        }
        @keyframes lp-sweep {
          0%   { left: -60%; }
          100% { left: 140%; }
        }
        @keyframes lp-accent-pulse {
          0%,100% { opacity: 0.5; transform: scaleX(0.7); }
          50%      { opacity: 1; transform: scaleX(1); }
        }
      `}</style>

      <div className="lp-wrap">
        <div className={`lp-pill${exiting ? ' lp-exit' : ''}`}>
          <div className="lp-spinner">
            <div className="lp-spinner-track" />
            <div className="lp-spinner-arc" />
            <div className="lp-spinner-dot" />
          </div>
          <div className="lp-text">
            <strong>{message}</strong>
          </div>
          <div className="lp-accent" />
        </div>
      </div>
    </>
  );
}
