'use client'

// PageTransition
// ─────────────────────────────────────────────────────────────────────────────
// Renders a full-screen overlay matching the loader background (#fafaf9).
// On mount it immediately starts the shard scatter animation using the
// Web Animations API, then calls onDone once the last shard is gone.
//
// Usage in page.tsx:
//   {transitioning && <PageTransition onDone={() => setTransitioning(false)} />}
//
// The overlay sits at z-index 300 (above loader at 200, above dashboard at 1).
// The dashboard renders underneath the whole time — fully painted, just covered.

import { useEffect, useRef } from "react";

interface PageTransitionProps {
  onDone: () => void;
}

const COLS = 10;
const ROWS = 14;

export default function PageTransition({ onDone }: PageTransitionProps) {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const shards = Array.from(layer.querySelectorAll<HTMLElement>('.pt-shard'));
    if (shards.length === 0) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let lastAnim: Animation | null = null;
    let latestEnd = 0;

    shards.forEach((el, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);

      // Each shard knows its screen position so it can fly outward from centre
      const cx    = (col + 0.5) / COLS - 0.5;   // -0.5 … +0.5
      const cy    = (row + 0.5) / ROWS - 0.5;
      const dist  = Math.sqrt(cx * cx + cy * cy);
      const angle = Math.atan2(cy, cx) + (Math.random() - 0.5) * 1.2;
      const speed = 200 + dist * 600 + Math.random() * 160;

      const tx      = Math.cos(angle) * speed;
      const ty      = Math.sin(angle) * speed;
      const rot     = (Math.random() - 0.5) * 42;
      const delay   = Math.random() * 320;           // stagger window
      const dur     = 680 + Math.random() * 300;     // each shard 680–980ms
      const end     = delay + dur;

      const anim = el.animate(
        [
          { transform: 'translate(0,0) rotate(0deg)',                             opacity: 1,   offset: 0    },
          { transform: 'translate(0,0) rotate(0deg)',                             opacity: 1,   offset: 0.08 },
          { transform: `translate(${tx}px,${ty}px) rotate(${rot}deg)`,           opacity: 0,   offset: 1    },
        ],
        {
          duration: dur,
          delay,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      );

      if (end > latestEnd) {
        latestEnd = end;
        lastAnim  = anim;
      }
    });

    // Only call onDone when the very last shard has finished — the browser
    // fires onfinish at the exact frame the animation completes.
    if (lastAnim) {
      (lastAnim as Animation).onfinish = () => onDone();
    }
  }, []);

  // Build the shard grid. Positions are percentage-based so they tile the
  // screen regardless of viewport size. Each shard pair has a very slightly
  // different tint so the grid reads as depth as it flies apart.
  const shards = Array.from({ length: COLS * ROWS }, (_, i) => {
    const col  = i % COLS;
    const row  = Math.floor(i / COLS);
    const even = (col + row) % 2 === 0;
    return { col, row, even };
  });

  return (
    <>
      <style>{`
        .pt-overlay {
          position: fixed; inset: 0;
          z-index: 300;
          pointer-events: none;
          overflow: hidden;
        }
        .pt-shard {
          position: absolute;
          will-change: transform, opacity;
        }
      `}</style>

      <div className="pt-overlay" ref={layerRef}>
        {shards.map(({ col, row, even }, i) => (
          <div
            key={i}
            className="pt-shard"
            style={{
              left:       `${(col  / COLS) * 100}%`,
              top:        `${(row  / ROWS) * 100}%`,
              width:      `${(1   / COLS) * 100 + 0.2}%`,
              height:     `${(1   / ROWS) * 100 + 0.2}%`,
              background: even ? '#fafaf9' : '#f3f0fe',
            }}
          />
        ))}
      </div>
    </>
  );
}
