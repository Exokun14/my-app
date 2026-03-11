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
      <style>{CATALOG_CSS}</style>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexShrink: 0 }}>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: 18, fontWeight: 400, fontStyle: "italic", color: "var(--token-ink, #18103a)", letterSpacing: "-0.01em" }}>
          Course Catalog
        </span>
        <div style={{ flex: 1 }} />
        <div className="cl-search-box">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 13, height: 13, color: "var(--token-ink3, #8e7ec0)", flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" />
          </svg>
          <input
            type="text"
            placeholder="Search courses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
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
          <button className={`cl-sf-chip${status === "New" ? " on" : ""}`} onClick={() => setStatus("New")}>
            <span className="cl-sf-dot" style={{ background: status === "New" ? "rgba(255,255,255,0.85)" : "var(--token-vio, #6c3dd6)" }} />
            New
          </button>
          <button className={`cl-sf-chip${status === "In Progress" ? " on-prog" : ""}`} onClick={() => setStatus("In Progress")}>
            <span className="cl-sf-dot" style={{ background: status === "In Progress" ? "rgba(255,255,255,0.85)" : "#4f46e5" }} />
            In Progress
          </button>
          <button className={`cl-sf-chip${status === "Completed" ? " on-done" : ""}`} onClick={() => setStatus("Completed")}>
            <span className="cl-sf-dot" style={{ background: status === "Completed" ? "rgba(255,255,255,0.85)" : "#16a34a" }} />
            Completed
          </button>
        </div>

        {/* Category group */}
        <div className="cl-sf-section">
          <span className="cl-sf-label">Category</span>
          <div className="cl-sf-divider" />
          {cats.map(c => (
            <button key={c} className={`cl-sf-chip${cat === c ? " on" : ""}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Masonry grid ── */}
      <div className="cl-masonry-scroll">
        {filtered.length === 0 ? (
          <div className="cl-empty">
            <div className="cl-empty-ico">📭</div>
            <div className="cl-empty-title">Nothing found</div>
            <div className="cl-empty-sub">Try a different filter or search term</div>
          </div>
        ) : (
          <div className="cl-masonry">
            {filtered.map((c, i) => {
              const realIdx = courses.indexOf(c);
              const modCount = c.modules?.length ?? 0;
              const chCount = c.modules?.reduce((s, m) => s + m.chapters.length, 0) ?? 0;
              const grad = THUMB_GRADIENTS[realIdx % THUMB_GRADIENTS.length];
              const pat = THUMB_PATTERNS[realIdx % THUMB_PATTERNS.length];
              const icon = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
              const progPct = typeof c.progress === "number" ? c.progress : 0;
              const isCompleted = c.completed === true || progPct >= 100;
              const isEnrolled = c.enrolled === true || progPct > 0;
              const isFeatured = isEnrolled || isCompleted;
              const timeSpentMin = c.time_spent ?? 0;
              const timeLabel = timeSpentMin > 0 ? fmtTime(timeSpentMin) : null;
              const thumbH = isFeatured ? 200 : 140;

              return (
                <div
                  key={i}
                  className={`cl-card${isFeatured ? " wide" : ""}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => onOpenCourse(realIdx)}
                >
                  {/* ── Thumbnail — full bleed with mask fade ── */}
                  <div className="cl-thumb" style={{ height: thumbH, background: `linear-gradient(135deg,${grad[0]},${grad[1]})` }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: pat, backgroundSize: "20px 20px", pointerEvents: "none", opacity: 0.08 }} />
                    <div style={{ position: "absolute", top: -40, right: -30, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle,rgba(255,255,255,0.14),transparent 70%)", pointerEvents: "none" }} />

                    {c.thumb && (
                      <img src={c.thumb} alt={c.title} loading="lazy"
                        style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, opacity: 0.35, mixBlendMode: "luminosity" }} />
                    )}

                    {/* Category badge */}
                    <div style={{ position: "absolute", top: 12, left: 12, padding: "3px 10px", borderRadius: 20, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(8px)", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,.92)", letterSpacing: ".06em", textTransform: "uppercase" as const, border: "1px solid rgba(255,255,255,0.14)" }}>
                      {c.cat}
                    </div>

                    {/* Status badge */}
                    <div style={{ position: "absolute", top: 12, right: 12, padding: "3px 8px", borderRadius: 20, background: isCompleted ? "rgba(21,128,61,0.85)" : isEnrolled ? "rgba(108,61,214,0.85)" : "rgba(0,0,0,.30)", backdropFilter: "blur(6px)", fontSize: 9, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.85)" }} />
                      {isCompleted ? "Completed" : isEnrolled ? `${progPct}%` : "New"}
                    </div>

                    {/* Large emoji icon */}
                    <div style={{ position: "absolute", bottom: 14, left: 16, fontSize: isFeatured ? 56 : 42, lineHeight: 1, filter: "drop-shadow(0 6px 16px rgba(0,0,0,.35))", userSelect: "none" as const }}>
                      {icon}
                    </div>

                    {/* Progress strip */}
                    {progPct > 0 && (
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(0,0,0,0.3)" }}>
                        <div style={{ height: "100%", width: `${progPct}%`, background: isCompleted ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.85)", borderRadius: "0 2px 2px 0", transition: "width .5s ease" }} />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="cl-overlay" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 8, position: "relative", zIndex: 1 }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z" /></svg>
                        </div>
                        <span style={{ color: "#fff", fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", textShadow: "0 1px 4px rgba(0,0,0,.4)" }}>
                          {isCompleted ? "Review Course" : isEnrolled ? `Continue · ${progPct}%` : "Enroll Now"}
                        </span>
                        {timeLabel && (
                          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 600 }}>
                            ⏱ {timeLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Soft gradient fade from thumb into body — pseudo via inline overlay */}
                    <div className="cl-thumb-fade" style={{ background: `linear-gradient(to bottom, transparent 70%, ${grad[1]}14 100%)` }} />
                  </div>

                  {/* ── Body — gradient bleed pseudo background ── */}
                  <div className="cl-body" style={{ ["--grad-start" as any]: grad[0], ["--grad-end" as any]: grad[1] }}>
                    {/* Soft gradient bleed at top of body */}
                    <div className="cl-body-bleed" style={{ background: `linear-gradient(to bottom, ${grad[1]}14, transparent 40%)` }} />

                    <div style={{ position: "relative", zIndex: 1 }}>
                      {/* DM Serif Display title */}
                      <div className="cl-title">{c.title}</div>
                      <div className="cl-desc">{c.desc}</div>

                      {/* In-progress bar */}
                      {isEnrolled && !isCompleted && progPct > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ height: 4, borderRadius: 4, background: "rgba(108,61,214,.1)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${progPct}%`, background: "linear-gradient(90deg,var(--token-vio,#6c3dd6),var(--token-vio2,#8b5cf6))", borderRadius: 4, transition: "width .5s ease" }} />
                          </div>
                          <div style={{ fontSize: 10, color: "var(--token-vio,#6c3dd6)", fontWeight: 600, marginTop: 3 }}>{progPct}% complete</div>
                        </div>
                      )}

                      {/* Meta row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--token-ink3,#8e7ec0)" }}>
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="5.5" /><path d="M7 4v3l2 1.2" /></svg>
                          {c.time}
                        </span>
                        {modCount > 0 && (
                          <>
                            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--token-bd,rgba(108,61,214,.15))" }} />
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--token-teal,#0d9488)", fontWeight: 600 }}>
                              <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z" /></svg>
                              {modCount}m · {chCount}ch
                            </span>
                          </>
                        )}
                        {modCount === 0 && <span style={{ fontSize: 10, color: "var(--token-ink3,#8e7ec0)" }}>Demo content</span>}
                      </div>

                      {/* CTA Button */}
                      <button
                        className={`cl-cta${isCompleted ? " done" : isEnrolled ? " enr" : " new"}`}
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const CATALOG_CSS = `
/* ── Search box ─────────────────────────────────────────────────────────── */
.cl-search-box {
  display:flex; align-items:center; gap:6px;
  padding:5px 10px; border-radius:9px;
  background:var(--token-surf,#fff);
  border:1.5px solid var(--token-bd,rgba(108,61,214,.1));
  transition:border-color .14s; width:168px;
}
.cl-search-box:focus-within { border-color:rgba(108,61,214,.3); }
.cl-search-box input {
  border:none; outline:none; background:transparent;
  font-size:11.5px; color:var(--token-ink,#18103a); flex:1;
  font-family:'DM Sans',sans-serif;
}
.cl-search-box input::placeholder { color:var(--token-ink3,#8e7ec0); }

/* ── Filter bar ─────────────────────────────────────────────────────────── */
.cl-sf-bar {
  display:flex; align-items:center; gap:6px;
  margin-bottom:14px; flex-shrink:0; flex-wrap:wrap;
}
.cl-sf-section {
  display:flex; align-items:center; gap:3px;
  background:var(--token-surf,#fff);
  border:1px solid var(--token-bd,rgba(108,61,214,.1));
  border-radius:9px; padding:3px;
}
.cl-sf-divider {
  width:1px; height:14px;
  background:var(--token-bd,rgba(108,61,214,.1));
  margin:0 2px; flex-shrink:0;
}
.cl-sf-label {
  font-size:9.5px; font-weight:700;
  letter-spacing:.1em; text-transform:uppercase;
  color:var(--token-ink3,#8e7ec0); padding:0 6px; flex-shrink:0;
}
.cl-sf-chip {
  display:inline-flex; align-items:center; gap:5px;
  font-size:11px; font-weight:500;
  color:var(--token-ink2,#4a3870); padding:4px 10px; border-radius:6px;
  cursor:pointer; transition:all .14s;
  background:transparent; border:none;
  font-family:'DM Sans',sans-serif; white-space:nowrap;
}
.cl-sf-chip:hover { background:var(--token-surf2,#f4f2fb); color:var(--token-ink,#18103a); }
.cl-sf-chip.on {
  background:linear-gradient(135deg,var(--token-vio,#6c3dd6),#4f1eb8);
  color:#fff; font-weight:600;
  box-shadow:0 2px 8px rgba(108,61,214,.25);
}
.cl-sf-chip.on-prog {
  background:linear-gradient(135deg,#1d4ed8,#4f46e5);
  color:#fff; font-weight:600;
  box-shadow:0 2px 8px rgba(79,70,229,.25);
}
.cl-sf-chip.on-done {
  background:linear-gradient(135deg,#065f46,#0d9488);
  color:#fff; font-weight:600;
  box-shadow:0 2px 8px rgba(13,148,136,.25);
}
.cl-sf-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

/* ── Masonry scroll area ─────────────────────────────────────────────────── */
.cl-masonry-scroll {
  flex:1 1 0; min-height:0; overflow-y:auto;
}
.cl-masonry-scroll::-webkit-scrollbar { width:3px; }
.cl-masonry-scroll::-webkit-scrollbar-thumb { background:var(--token-vio3,#c4b5fd); border-radius:3px; }

/* CSS column masonry */
.cl-masonry {
  columns:2; column-gap:14px;
  padding-bottom:24px;
}
@media (max-width:600px) {
  .cl-masonry { columns:1; }
}

/* ── Card ────────────────────────────────────────────────────────────────── */
.cl-card {
  break-inside:avoid;
  display:inline-flex; width:100%; flex-direction:column;
  border-radius:16px; overflow:hidden;
  background:var(--token-surf,#fff);
  border:1.5px solid var(--token-bd,rgba(108,61,214,.1));
  box-shadow:0 1px 6px rgba(0,0,0,.04);
  cursor:pointer; margin-bottom:14px;
  transition:all .18s;
  animation:cl-up .3s cubic-bezier(.16,1,.3,1) both;
}
.cl-card:hover { transform:translateY(-3px); box-shadow:0 10px 28px rgba(108,61,214,.13); border-color:rgba(108,61,214,.22); }
/* Wide/featured cards span both columns */
.cl-card.wide { break-inside:avoid; }

@keyframes cl-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

/* ── Thumbnail ───────────────────────────────────────────────────────────── */
.cl-thumb {
  position:relative; overflow:hidden; flex-shrink:0;
  /* Soft mask fade at bottom edge */
  mask-image:linear-gradient(to bottom, black 70%, transparent 100%);
  -webkit-mask-image:linear-gradient(to bottom, black 70%, transparent 100%);
}
.cl-thumb-fade {
  position:absolute; bottom:0; left:0; right:0; height:40px; pointer-events:none;
}
.cl-overlay {
  opacity:0; transition:opacity .16s;
}
.cl-card:hover .cl-overlay { opacity:1; }

/* ── Body ────────────────────────────────────────────────────────────────── */
.cl-body {
  padding:12px 13px 13px; flex:1; display:flex; flex-direction:column;
  position:relative; overflow:hidden;
}
/* Gradient bleed from thumbnail color at 8% into body top */
.cl-body-bleed {
  position:absolute; top:0; left:0; right:0; height:36px; pointer-events:none;
}
.cl-title {
  font-family:'DM Serif Display',serif;
  font-size:15px; font-weight:400; font-style:italic;
  color:var(--token-ink,#18103a); line-height:1.3; margin-bottom:5px;
}
.cl-desc {
  font-size:12px; color:var(--token-ink3,#8e7ec0); line-height:1.55;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden; margin-bottom:10px; flex:1;
}

/* ── CTA ─────────────────────────────────────────────────────────────────── */
.cl-cta {
  display:flex; align-items:center; justify-content:center; gap:5px;
  width:100%; padding:8px 0; border-radius:9px; border:none;
  font-size:11px; font-weight:700; cursor:pointer;
  transition:all .15s; font-family:'DM Sans',sans-serif;
  margin-top:auto;
}
.cl-cta:hover { transform:translateY(-1px); filter:brightness(1.06); }
.cl-cta.new  {
  background:linear-gradient(135deg,var(--token-vio,#6c3dd6),#4f1eb8);
  color:#fff; box-shadow:0 3px 10px rgba(108,61,214,.28);
}
.cl-cta.new:hover { box-shadow:0 5px 16px rgba(108,61,214,.38); }
.cl-cta.enr  {
  background:linear-gradient(135deg,#1d4ed8,#4f46e5);
  color:#fff; box-shadow:0 3px 10px rgba(79,70,229,.28);
}
.cl-cta.done {
  background:linear-gradient(135deg,#065f46,#0d9488);
  color:#fff; box-shadow:0 3px 10px rgba(13,148,136,.28);
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
.cl-empty {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:64px 32px; text-align:center;
}
.cl-empty-ico {
  font-size:56px; margin-bottom:18px;
  filter:drop-shadow(0 4px 12px rgba(0,0,0,.1));
}
.cl-empty-title {
  font-family:'DM Serif Display',serif; font-size:22px; font-weight:400; font-style:italic;
  color:var(--token-ink,#18103a); margin-bottom:8px;
}
.cl-empty-sub {
  font-size:13px; color:var(--token-ink3,#8e7ec0); line-height:1.6;
}
`;
