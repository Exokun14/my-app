'use client'

import { useState, useEffect, useRef, useCallback } from "react";
import type { Course } from "../../Data/types";
import type { Activity } from "./ActivityBuilderPanel";
import { THUMB_GRADIENTS, THUMB_PATTERNS, CAT_ICONS } from "../Logic/CourseCatalogLogic";

interface DashboardProps {
  courses: Course[];
  onOpenCourse: (idx: number) => void;
  onGoToCatalog: () => void;
}

function fmtTime(mins: number) {
  if (!mins || mins < 1) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function MiniRing({ pct, size = 44, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <defs>
        <linearGradient id="lvRG" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6c3dd6" /><stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(108,61,214,.1)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#lvRG)" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ animation: "lvRing .9s cubic-bezier(.16,1,.3,1) .2s both" }} />
    </svg>
  );
}

function AIBanner({ courses, onOpenCourse, onGoToCatalog }: {
  courses: Course[]; onOpenCourse: (i: number) => void; onGoToCatalog: () => void;
}) {
  const enrolled = courses.filter(c => c.enrolled || (c.progress ?? 0) > 0);
  const completed = courses.filter(c => c.completed || (c.progress ?? 0) >= 100);
  const inProg = enrolled.filter(c => !c.completed && (c.progress ?? 0) > 0 && (c.progress ?? 0) < 100);
  const notStarted = courses.filter(c => !(c.enrolled || (c.progress ?? 0) > 0));
  const avg = enrolled.length ? Math.round(enrolled.reduce((s, c) => s + (c.progress ?? 0), 0) / enrolled.length) : 0;
  const rec = inProg.length > 0 ? inProg.reduce((b, c) => ((c.progress ?? 0) > (b.progress ?? 0) ? c : b), inProg[0]) : notStarted[0] ?? null;
  const recIdx = rec ? courses.indexOf(rec) : -1;
  const h = new Date().getHours();
  const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const summary = !enrolled.length
    ? "You haven't started any courses yet. Explore the catalog — your journey begins with one click."
    : completed.length === enrolled.length
      ? `Incredible — all ${completed.length} enrolled course${completed.length !== 1 ? "s" : ""} complete! Discover what's next.`
      : inProg.length && avg >= 70
        ? `You're nearly there — ${avg}% average across ${inProg.length} active course${inProg.length !== 1 ? "s" : ""}. Push to the finish!`
        : inProg.length
          ? `${inProg.length} course${inProg.length !== 1 ? "s" : ""} in progress at ${avg}% avg. Consistency is the secret.`
          : `Enrolled in ${enrolled.length} course${enrolled.length !== 1 ? "s" : ""}. Pick one and start your streak today.`;
  const chips = [
    enrolled.length > 0 && { ico: "📈", txt: <><strong>{avg}% avg progress</strong> across {enrolled.length} course{enrolled.length !== 1 ? "s" : ""}</> },
    completed.length > 0 && { ico: "🏆", txt: <><strong>{completed.length} completed</strong> — great work!</> },
    inProg.length > 0 && { ico: "⚡", txt: <><strong>{inProg.length} in progress</strong> right now</> },
    !enrolled.length && { ico: "🚀", txt: <><strong>{courses.length} courses</strong> ready to explore</> },
  ].filter(Boolean).slice(0, 3) as { ico: string; txt: React.ReactNode }[];
  return (
    <div className="lv-ai">
      <div className="lv-ai-side" />
      <div className="lv-ai-tint" />
      <div className="lv-ai-body">
        <div className="lv-ai-pill"><div className="lv-ai-dot" />AI Learning Companion</div>
        <div className="lv-ai-hello">{greet}, <b>learner</b> 👋</div>
        <div className="lv-ai-text">{summary}</div>
        {chips.length > 0 && (
          <div className="lv-ai-chips">
            {chips.map((c, i) => (
              <div key={i} className="lv-ai-chip">
                <span className="lv-ai-chip-ico">{c.ico}</span>
                <div className="lv-ai-chip-txt">{c.txt}</div>
              </div>
            ))}
          </div>
        )}
        {rec && recIdx >= 0
          ? <div className="lv-ai-rec" onClick={() => onOpenCourse(recIdx)}>
            <span className="lv-ai-rec-ico">{inProg.includes(rec) ? "▶️" : "🎯"}</span>
            <div>
              <div className="lv-ai-rec-lbl">{inProg.includes(rec) ? "Continue where you left off" : "Recommended for you"}</div>
              <div className="lv-ai-rec-name">{rec.title}</div>
            </div>
            <div className="lv-ai-rec-arr">→</div>
          </div>
          : notStarted.length > 0 &&
          <button onClick={onGoToCatalog} style={{ width: "100%", padding: "10px 14px", borderRadius: 11, background: "rgba(108,61,214,.07)", border: "1.5px solid rgba(108,61,214,.14)", color: "#6c3dd6", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Sora',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all .16s" }}>
            🗂️ Browse Course Catalog →
          </button>
        }
      </div>
    </div>
  );
}

// ─── Carousel ─────────────────────────────────────────────────────────────────
const SLIDE_GRADS = [
  ["#4c1d95", "#7c3aed"], ["#0c4a6e", "#0369a1"], ["#064e3b", "#0d9488"],
  ["#78350f", "#b45309"], ["#7f1d1d", "#b91c1c"], ["#1e1b4b", "#4338ca"],
  ["#134e4a", "#0f766e"], ["#3b0764", "#7e22ce"],
];
const ACCENTS = ["#a78bfa", "#67e8f9", "#6ee7b7", "#fcd34d", "#fca5a5", "#c4b5fd", "#7dd3fc", "#86efac"];

export function Carousel({ courses, onOpenCourse, onGoToCatalog }: {
  courses: Course[]; onOpenCourse: (i: number) => void; onGoToCatalog: () => void;
}) {
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const featured = [
    ...courses.filter(c => !c.completed && (c.progress ?? 0) > 0 && (c.progress ?? 0) < 100),
    ...courses.filter(c => !(c.enrolled || (c.progress ?? 0) > 0)),
    ...courses.filter(c => c.completed || (c.progress ?? 0) >= 100),
  ].slice(0, 8);
  const go = useCallback((n: number) => setActive(((n % featured.length) + featured.length) % featured.length), [featured.length]);
  useEffect(() => { timer.current = setTimeout(() => go(active + 1), 5500); return () => clearTimeout(timer.current); }, [active, go]);
  if (!featured.length) return null;
  return (
    <div className="lv-car">
      <div className="lv-sh">
        <div style={{ width: 3, height: 14, borderRadius: 2, background: "linear-gradient(#6c3dd6,#0d9488)", flexShrink: 0 }} />
        <span className="lv-sh-title">Featured Courses</span>
        <span className="lv-sh-sub">· {featured.length} picks</span>
        <div className="lv-sh-pip" />
      </div>
      <div className="lv-car-window">
        <div className="lv-car-track" style={{ transform: `translateX(-${active * 100}%)` }}>
          {featured.map((c, i) => {
            const ri = courses.indexOf(c), pct = c.progress ?? 0;
            const done = c.completed === true || pct >= 100, enr = c.enrolled === true || pct > 0;
            const g = SLIDE_GRADS[i % SLIDE_GRADS.length];
            const pat = THUMB_PATTERNS[ri % THUMB_PATTERNS.length];
            const ic = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
            const accent = ACCENTS[i % ACCENTS.length];
            const mc = c.modules?.length ?? 0;
            return (
              <div key={i} className="lv-car-slide" onClick={() => onOpenCourse(ri)}>
                {/* colourful bg — full bleed left side */}
                <div className="lv-car-bg" style={{ background: `linear-gradient(140deg,${g[0]},${g[1]})` }}>
                  <div style={{ position: "absolute", inset: 0, backgroundImage: pat, backgroundSize: "20px 20px", opacity: 0.12 }} />
                  <div style={{ position: "absolute", right: "38%", bottom: "-10%", fontSize: 160, opacity: 0.06, userSelect: "none", lineHeight: 1, filter: "blur(1px)", transform: "rotate(-8deg)" }}>{ic}</div>
                  <div style={{ position: "absolute", right: "40%", top: "-20%", width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle,${accent}22 0%,transparent 65%)`, pointerEvents: "none" }} />
                </div>
                {/* white-fade scrim */}
                <div className="lv-car-scrim" />
                {/* top accent */}
                <div className="lv-car-accent" style={{ background: `linear-gradient(90deg,${accent},transparent 55%)` }} />
                {/* content split */}
                <div className="lv-car-content">
                  {/* LEFT */}
                  <div className="lv-car-l">
                    <div className="lv-car-eyebrow">
                      <div className="lv-car-eyebrow-dot" />
                      {c.cat || "General"}
                      {mc > 0 && <><div className="lv-car-eyebrow-dot" />{mc} module{mc !== 1 ? "s" : ""}</>}
                    </div>
                    <div className="lv-car-title">{c.title}</div>
                    {c.desc && <div className="lv-car-desc">{c.desc}</div>}
                    <div className="lv-car-pills">
                      {c.time && (
                        <div className="lv-car-pill">
                          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5" /><path d="M7 4v3l2 1.2" /></svg>
                          {c.time}
                        </div>
                      )}
                      {enr && pct > 0 && (
                        <div className="lv-car-prog-pill">
                          <div className="lv-car-prog-bar">
                            <div className="lv-car-prog-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${accent},#34d399)` }} />
                          </div>
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.8)" }}>{pct}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* RIGHT white panel */}
                  <div className="lv-car-r">
                    <div className="lv-car-emoji">{ic}</div>
                    {enr && (
                      <div className="lv-car-status-badge" style={{ background: done ? "rgba(22,163,74,.12)" : "rgba(108,61,214,.1)", color: done ? "#15803d" : "#6c3dd6" }}>
                        {done ? "✓ Completed" : `${pct}% done`}
                      </div>
                    )}
                    <button
                      className={`lv-car-cta${done ? " done" : enr ? " enr" : " new"}`}
                      onClick={e => { e.stopPropagation(); onOpenCourse(ri); }}
                    >
                      {done ? "✓ Review" : enr ? "▶ Continue" : "+ Enroll"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/*
          FIX: arrows now use absolute left/right positioning relative to
          the coloured area only. Right arrow is placed before the white
          panel starts (~196px from right edge) so it never overlaps it.
          Left arrow stays near the left edge of the colour area.
        */}
        <button
          className="lv-car-btn l"
          onClick={e => { e.stopPropagation(); go(active - 1); }}
        >‹</button>
        <button
          className="lv-car-btn r"
          onClick={e => { e.stopPropagation(); go(active + 1); }}
        >›</button>
      </div>
      <div className="lv-car-ctrl">
        <div className="lv-car-dots">{featured.map((_, i) => <div key={i} className={`lv-car-dot${active === i ? " on" : ""}`} onClick={() => go(i)} />)}</div>
        <span className="lv-car-count">{active + 1} / {featured.length}</span>
        <button className="lv-car-all" onClick={onGoToCatalog}>All courses →</button>
      </div>
    </div>
  );
}

// ─── Dashboard export ─────────────────────────────────────────────────────────
export default function Dashboard({ courses, onOpenCourse, onGoToCatalog }: DashboardProps) {
  const enrolled = courses.filter(c => c.enrolled || (c.progress ?? 0) > 0);
  const completed = courses.filter(c => c.completed || (c.progress ?? 0) >= 100);
  const inProg = enrolled.filter(c => !c.completed && (c.progress ?? 0) > 0 && (c.progress ?? 0) < 100);
  const avg = enrolled.length ? Math.round(enrolled.reduce((s, c) => s + (c.progress ?? 0), 0) / enrolled.length) : 0;
  const totalTime = courses.reduce((s, c) => s + (c.time_spent ?? 0), 0);
  return (
    <div className="lv-scroll">
      <AIBanner courses={courses} onOpenCourse={onOpenCourse} onGoToCatalog={onGoToCatalog} />

      {/* Stats */}
      <div className="lv-stats">
        {([
          { n: enrolled.length, l: "Enrolled", e: "📚", cls: "sv", d: "0s" },
          { n: inProg.length, l: "In Progress", e: "⚡", cls: "sa", d: ".06s" },
          { n: completed.length, l: "Completed", e: "✅", cls: "sg", d: ".12s" },
          { n: courses.filter(c => !(c.enrolled || (c.progress ?? 0) > 0)).length, l: "Available", e: "🔓", cls: "sb", d: ".18s" },
        ] as const).map((s, i) => (
          <div key={i} className={`lv-stat ${s.cls}`} style={{ animationDelay: s.d }}>
            <div className="lv-stat-inner">
              <div className="lv-stat-ico">{s.e}</div>
              <div>
                <div className="lv-stat-num">{s.n}</div>
                <div className="lv-stat-lbl">{s.l}</div>
              </div>
            </div>
          </div>
        ))}
        <div className="lv-ring-stat">
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MiniRing pct={avg} />
            <div style={{ position: "absolute", fontSize: 10, fontWeight: 900, color: "#6c3dd6", lineHeight: 1 }}>{avg}%</div>
          </div>
          <div>
            <div className="lv-ring-val">{fmtTime(totalTime)}</div>
            <div className="lv-ring-lbl">Time · avg</div>
          </div>
        </div>
      </div>

      {/* Continue learning */}
      {inProg.length > 0 && (
        <>
          <div className="lv-sh" style={{ marginBottom: 9 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: "linear-gradient(#6c3dd6,#0d9488)", flexShrink: 0 }} />
            <span className="lv-sh-title">Continue Learning</span>
            <span className="lv-sh-sub">{inProg.length} in progress</span>
            <div className="lv-sh-pip" />
          </div>
          <div className="lv-continue" style={{ marginBottom: 20 }}>
            {inProg.slice(0, 4).map((c, i) => {
              const ri = courses.indexOf(c), pct = c.progress ?? 0;
              const g = THUMB_GRADIENTS[ri % THUMB_GRADIENTS.length];
              const ic = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
              return (
                <div key={i} className="lv-cont" style={{ animationDelay: `${i * .07}s` }} onClick={() => onOpenCourse(ri)}>
                  <div className="lv-cont-thumb" style={{ background: `linear-gradient(135deg,${g[0]},${g[1]})` }}>
                    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 30%,rgba(255,255,255,.18),transparent 65%)" }} />
                    <span style={{ position: "relative", zIndex: 1 }}>{ic}</span>
                  </div>
                  <div className="lv-cont-body">
                    <div className="lv-cont-name">{c.title}</div>
                    <div className="lv-cont-pct">{pct}% complete</div>
                    <div className="lv-cont-bar"><div className="lv-cont-fill" style={{ width: `${pct}%`, animationDelay: `${.22 + i * .07}s` }} /></div>
                  </div>
                  <button className="lv-cont-btn" onClick={e => { e.stopPropagation(); onOpenCourse(ri); }}>
                    <svg width="7" height="7" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z" /></svg>
                    Resume
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Carousel courses={courses} onOpenCourse={onOpenCourse} onGoToCatalog={onGoToCatalog} />
    </div>
  );
}
