'use client'

import { useState } from "react";
import type { Course } from "../../Data/types";
import { THUMB_GRADIENTS, THUMB_PATTERNS, CAT_ICONS, CARD_STYLES } from "../Logic/CourseCatalogLogic";

interface CatalogProps {
  courses: Course[];
  onOpenCourse: (idx: number) => void;
}

function fmtTime(mins: number) {
  if (!mins || mins < 1) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function Catalog({ courses, onOpenCourse }: CatalogProps) {
  const [search, setSearch] = useState(""),
    [cat, setCat] = useState("All"),
    [status, setStatus] = useState("All");

  const cats = ["All", ...Array.from(new Set(courses.map(c => c.cat).filter(Boolean)))];

  const filtered = courses.filter(c => {
    const pct = c.progress ?? 0, done = c.completed || pct >= 100, enr = c.enrolled || pct > 0;
    const cOk = cat === "All" || c.cat === cat;
    const sOk = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.desc?.toLowerCase().includes(search.toLowerCase());
    let stOk = true;
    if (status === "In Progress") stOk = enr && !done;
    if (status === "Completed") stOk = done;
    if (status === "New") stOk = !enr;
    return cOk && sOk && stOk;
  });

  return (
    <>
      <style>{CARD_STYLES}</style>
      <style>{`
        /* ── Client filter bar (matches CourseCatalog sf-bar style) ── */
        .cl-sf-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .cl-sf-section {
          display: flex;
          align-items: center;
          gap: 3px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 3px;
        }
        .cl-sf-divider {
          width: 1px; height: 14px;
          background: var(--border);
          margin: 0 2px;
          flex-shrink: 0;
        }
        .cl-sf-label {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--t4);
          padding: 0 6px;
          flex-shrink: 0;
        }
        .cl-sf-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 500;
          color: var(--t2);
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all .14s;
          background: transparent;
          border: none;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .cl-sf-chip:hover {
          background: var(--surface2);
          color: var(--t1);
        }
        .cl-sf-chip.on {
          background: linear-gradient(135deg, var(--purple), var(--purple-d));
          color: #fff;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(124,58,237,0.25);
        }
        .cl-sf-chip.on-prog {
          background: linear-gradient(135deg, #1d4ed8, #4f46e5);
          color: #fff;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(79,70,229,0.25);
        }
        .cl-sf-chip.on-done {
          background: linear-gradient(135deg, #065f46, #0d9488);
          color: #fff;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(13,148,136,0.25);
        }
        .cl-sf-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

        /* ── CTA button on card body ── */
        .cc3-cta-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          width: 100%;
          padding: 7px 0;
          border-radius: 8px;
          border: none;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all .15s;
          font-family: 'DM Sans', sans-serif;
          margin-top: auto;
        }
        .cc3-cta-btn.new {
          background: linear-gradient(135deg, var(--purple), var(--purple-d));
          color: #fff;
          box-shadow: 0 3px 10px rgba(124,58,237,0.28);
        }
        .cc3-cta-btn.new:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(124,58,237,0.38); }
        .cc3-cta-btn.enr {
          background: linear-gradient(135deg, #1d4ed8, #4f46e5);
          color: #fff;
          box-shadow: 0 3px 10px rgba(79,70,229,0.28);
        }
        .cc3-cta-btn.enr:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(79,70,229,0.38); }
        .cc3-cta-btn.done {
          background: linear-gradient(135deg, #065f46, #0d9488);
          color: #fff;
          box-shadow: 0 3px 10px rgba(13,148,136,0.28);
        }
        .cc3-cta-btn.done:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(13,148,136,0.38); }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--t1)", letterSpacing: "-0.01em" }}>Course Catalog</span>
        <div style={{ flex: 1 }} />
        <div className="search-box" style={{ width: 168, padding: "5px 10px" }}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" />
          </svg>
          <input
            type="text"
            placeholder="Search courses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 11.5 }}
          />
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="cl-sf-bar">
        {/* Status group */}
        <div className="cl-sf-section">
          <span className="cl-sf-label">Status</span>
          <div className="cl-sf-divider" />
          <button className={`cl-sf-chip${status === "All" ? " on" : ""}`} onClick={() => setStatus("All")}>All</button>
          <button
            className={`cl-sf-chip${status === "New" ? " on" : ""}`}
            onClick={() => setStatus("New")}
          >
            <span className="cl-sf-dot" style={{ background: status === "New" ? "rgba(255,255,255,0.8)" : "var(--purple)" }} />
            New
          </button>
          <button
            className={`cl-sf-chip${status === "In Progress" ? " on-prog" : ""}`}
            onClick={() => setStatus("In Progress")}
          >
            <span className="cl-sf-dot" style={{ background: status === "In Progress" ? "rgba(255,255,255,0.8)" : "#4f46e5" }} />
            In Progress
          </button>
          <button
            className={`cl-sf-chip${status === "Completed" ? " on-done" : ""}`}
            onClick={() => setStatus("Completed")}
          >
            <span className="cl-sf-dot" style={{ background: status === "Completed" ? "rgba(255,255,255,0.8)" : "#16a34a" }} />
            Completed
          </button>
        </div>

        {/* Category group */}
        <div className="cl-sf-section">
          <span className="cl-sf-label">Category</span>
          <div className="cl-sf-divider" />
          {cats.map(c => (
            <button
              key={c}
              className={`cl-sf-chip${cat === c ? " on" : ""}`}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="lc-courses-scroll">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(268px,1fr))", gap: 16, padding: "4px 2px 16px" }}>
          {filtered.length === 0 ? (
            <div style={{ gridColumn: "span 3", textAlign: "center", padding: 32, color: "var(--t3)", fontSize: 13 }}>
              No courses found
            </div>
          ) : filtered.map((c, i) => {
            const realIdx = courses.indexOf(c);
            const modCount = c.modules?.length ?? 0;
            const chCount = c.modules?.reduce((s, m) => s + m.chapters.length, 0) ?? 0;
            const grad = THUMB_GRADIENTS[realIdx % THUMB_GRADIENTS.length];
            const pat = THUMB_PATTERNS[realIdx % THUMB_PATTERNS.length];
            const icon = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
            const progPct = typeof c.progress === "number" ? c.progress : 0;
            const isCompleted = c.completed === true || progPct >= 100;
            const isEnrolled = c.enrolled === true || progPct > 0;
            const timeSpentMin = c.time_spent ?? 0;
            const timeLabel = timeSpentMin > 0 ? fmtTime(timeSpentMin) : null;

            return (
              <div
                key={i}
                className="cc3-card"
                style={{ animation: `cc3-up .3s ease ${i * 0.05}s both` }}
                onClick={() => onOpenCourse(realIdx)}
              >
                {/* ── Thumbnail ── */}
                <div style={{ height: 172, position: "relative", overflow: "hidden", background: `linear-gradient(135deg,${grad[0]},${grad[1]})`, flexShrink: 0 }}>
                  <div style={{ position: "absolute", inset: 0, backgroundImage: pat, backgroundSize: "20px 20px", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,255,255,0.14),transparent 70%)", pointerEvents: "none" }} />
                  <div style={{ position: "absolute", bottom: -60, left: -20, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,255,255,0.08),transparent 70%)", pointerEvents: "none" }} />

                  {c.thumb && (
                    <img
                      src={c.thumb}
                      alt={c.title}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, opacity: 0.35, mixBlendMode: "luminosity" }}
                    />
                  )}

                  {/* Category badge (top-left) */}
                  <div style={{ position: "absolute", top: 12, left: 12, padding: "3px 10px", borderRadius: 20, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.92)", letterSpacing: ".06em", textTransform: "uppercase" as const, border: "1px solid rgba(255,255,255,0.14)" }}>
                    {c.cat}
                  </div>

                  {/* Status badge (top-right) — enrollment-aware */}
                  <div style={{ position: "absolute", top: 12, right: 12, padding: "3px 8px", borderRadius: 20, background: isCompleted ? "rgba(21,128,61,0.85)" : isEnrolled ? "rgba(79,70,229,0.85)" : "rgba(0,0,0,0.30)", backdropFilter: "blur(6px)", fontSize: 9, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.85)" }} />
                    {isCompleted ? "Completed" : isEnrolled ? `${progPct}%` : "New"}
                  </div>

                  {/* Emoji icon */}
                  <div className="cc3-emoji" style={{ position: "absolute", bottom: 14, left: 16, fontSize: 52, lineHeight: 1, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.35))", userSelect: "none" as const }}>
                    {icon}
                  </div>

                  {/* Progress bar strip */}
                  {progPct > 0 && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(0,0,0,0.3)" }}>
                      <div style={{ height: "100%", width: `${progPct}%`, background: isCompleted ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.85)", borderRadius: "0 2px 2px 0", transition: "width .5s ease" }} />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="cc3-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="cc3-shine" />
                    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z" /></svg>
                      </div>
                      <span style={{ color: "#fff", fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
                        {isCompleted ? "Review Course" : isEnrolled ? `Continue · ${progPct}%` : "Enroll Now"}
                      </span>
                      {timeLabel && (
                        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 600, letterSpacing: ".04em" }}>
                          ⏱ {timeLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Body ── */}
                <div style={{ padding: "14px 15px 12px", flex: 1, display: "flex", flexDirection: "column" as const }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f0a2a", lineHeight: 1.3, marginBottom: 5 }}>{c.title}</div>
                  <div style={{ fontSize: 11.5, color: "#7c65a8", lineHeight: 1.55, display: "-webkit-box" as const, WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden", marginBottom: 10 }}>{c.desc}</div>

                  {/* In-progress bar (body) */}
                  {isEnrolled && !isCompleted && progPct > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ height: 4, borderRadius: 4, background: "rgba(79,70,229,0.12)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progPct}%`, background: "linear-gradient(90deg,#4f46e5,#7c3aed)", borderRadius: 4, transition: "width .5s ease" }} />
                      </div>
                      <div style={{ fontSize: 10, color: "#4f46e5", fontWeight: 600, marginTop: 3 }}>{progPct}% complete</div>
                    </div>
                  )}

                  {/* Meta row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "#a89dc8" }}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.5" /><path d="M7 4v3l2 1.2" /></svg>
                      {c.time}
                    </span>
                    {modCount > 0 && (
                      <>
                        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#d4d0e8" }} />
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "#0d9488", fontWeight: 600 }}>
                          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z" /></svg>
                          {modCount}m · {chCount}ch
                        </span>
                      </>
                    )}
                    {modCount === 0 && <span style={{ fontSize: 10, color: "#c4bdd8" }}>Demo content</span>}
                  </div>

                  {/* CTA Button */}
                  <button
                    className={`cc3-cta-btn${isCompleted ? " done" : isEnrolled ? " enr" : " new"}`}
                    onClick={e => { e.stopPropagation(); onOpenCourse(realIdx); }}
                  >
                    {isCompleted ? (
                      <><svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 7l4 4 6-6" /></svg>Review Course</>
                    ) : isEnrolled ? (
                      <><svg width="9" height="9" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z" /></svg>Continue</>
                    ) : (
                      <><svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M7 2v10M2 7h10" /></svg>Enroll Now</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
