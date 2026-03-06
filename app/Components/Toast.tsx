'use client'

import { useEffect, useState } from "react";

interface ToastProps {
  msg: string;
  visible: boolean;
}

export default function Toast({ msg, visible }: ToastProps) {
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

  const isError = msg.toLowerCase().startsWith("error") || msg.toLowerCase().includes("failed");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap');

        .toast-wrap {
          position: fixed;
          top: 28px;
          right: 28px;
          z-index: 99999;
          pointer-events: none;
        }

        .toast-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 20px 11px 14px;
          background: #ffffff;
          border: 1.5px solid ${isError ? "rgba(220,38,38,0.2)" : "rgba(124,58,237,0.2)"};
          border-radius: 100px;
          box-shadow:
            0 4px 20px ${isError ? "rgba(220,38,38,0.1)" : "rgba(124,58,237,0.12)"},
            0 1px 4px rgba(0,0,0,0.06),
            0 0 0 4px ${isError ? "rgba(220,38,38,0.04)" : "rgba(124,58,237,0.04)"};
          animation: toast-enter 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
          position: relative;
          overflow: hidden;
        }
        .toast-pill.toast-exit {
          animation: toast-exit 0.3s ease forwards;
        }

        /* shimmer sweep */
        .toast-pill::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, ${isError ? "rgba(220,38,38,0.04)" : "rgba(124,58,237,0.05)"}, transparent);
          animation: toast-sweep 1.8s ease-in-out 1;
        }

        .toast-icon {
          width: 20px; height: 20px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: ${isError ? "rgba(220,38,38,0.08)" : "rgba(20,184,166,0.1)"};
          animation: toast-icon-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;
        }
        .toast-icon svg {
          width: 11px; height: 11px;
          stroke: ${isError ? "#dc2626" : "#14b8a6"};
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }

        .toast-text {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 400;
          color: #4a3d6e;
          letter-spacing: 0.2px;
          white-space: nowrap;
          max-width: 280px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .toast-text strong {
          color: ${isError ? "#dc2626" : "#7c3aed"};
          font-weight: 500;
        }

        .toast-accent {
          position: absolute;
          bottom: 0; left: 20%; right: 20%;
          height: 2px;
          background: linear-gradient(90deg, transparent, ${isError ? "#dc2626" : "#7c3aed"}, ${isError ? "#f87171" : "#14b8a6"}, transparent);
          border-radius: 1px;
          animation: toast-accent-fade 1.8s ease-in-out 1 forwards;
        }

        @keyframes toast-enter {
          from { opacity: 0; transform: translateY(-16px) scale(0.88); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes toast-exit {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(-10px) scale(0.94); }
        }
        @keyframes toast-icon-pop {
          from { opacity: 0; transform: scale(0.4); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes toast-sweep {
          0%   { left: -60%; }
          100% { left: 140%; }
        }
        @keyframes toast-accent-fade {
          0%   { opacity: 1; transform: scaleX(1); }
          70%  { opacity: 1; transform: scaleX(1); }
          100% { opacity: 0; transform: scaleX(0.4); }
        }
      `}</style>

      <div className="toast-wrap">
        <div className={`toast-pill${exiting ? " toast-exit" : ""}`}>
          <div className="toast-icon">
            {isError ? (
              <svg viewBox="0 0 12 12">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            ) : (
              <svg viewBox="0 0 12 12">
                <path d="M2 6.5l3 3 5-5" />
              </svg>
            )}
          </div>
          <div className="toast-text">
            <strong>{msg}</strong>
          </div>
          <div className="toast-accent" />
        </div>
      </div>
    </>
  );
}
