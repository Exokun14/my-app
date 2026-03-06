'use client'

import { useState } from "react";
import type { Course } from "../../Data/types";
import { THUMB_GRADIENTS, THUMB_PATTERNS, CAT_ICONS } from "../Logic/CourseCatalogLogic";

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
      <div style={{ flexShrink: 0 }}>
        <div className="lv-sh" style={{ marginBottom: 8 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: "linear-gradient(#6366f1,#0d9488)", flexShrink: 0 }} />
          <span className="lv-sh-title">Course Catalog</span>
          <span className="lv-sh-sub">· {filtered.length} shown</span>
          <div className="lv-sh-pip" />
          <div className="lv-search">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" />
            </svg>
            <input placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="lv-filters">
          {[{ k: "All", l: "All" }, { k: "New", l: "🆕 New" }, { k: "In Progress", l: "📖 In Progress" }, { k: "Completed", l: "✅ Done" }].map(f => (
            <button
              key={f.k}
              className={`lv-chip${status === f.k ? (f.k === "In Progress" ? " on-t" : " on") : ""}`}
              onClick={() => setStatus(f.k)}
            >
              {f.l}
            </button>
          ))}
          <div className="lv-chip-sep" />
          {cats.map(c => (
            <button key={c} className={`lv-chip${cat === c ? " on" : ""}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="lv-grid-scroll">
        {filtered.length === 0
          ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", gap: 8 }}>
            <div style={{ fontSize: 30 }}>🔍</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>No courses match</div>
            <div style={{ fontSize: 11.5, color: "var(--ink3)", maxWidth: 200, lineHeight: 1.5, textAlign: "center" }}>Try a different filter.</div>
          </div>
          : <div className="lv-grid">
            {filtered.map((c, i) => {
              const ri = courses.indexOf(c), pct = typeof c.progress === "number" ? c.progress : 0;
              const done = c.completed === true || pct >= 100, enr = c.enrolled === true || pct > 0;
              const mc = c.modules?.length ?? 0;
              const chc = c.modules?.reduce((s: number, m: any) => s + m.chapters.length, 0) ?? 0;
              const g = THUMB_GRADIENTS[ri % THUMB_GRADIENTS.length];
              const pat = THUMB_PATTERNS[ri % THUMB_PATTERNS.length];
              const ic = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
              const tl = (c.time_spent ?? 0) > 0 ? fmtTime(c.time_spent ?? 0) : null;
              return (
                <div
                  key={i}
                  className="lv-card"
                  style={{ animationDelay: `${Math.min(i * .04, .4)}s` }}
                  onClick={() => onOpenCourse(ri)}
                >
                  <div className="lv-card-thumb" style={{ background: `linear-gradient(135deg,${g[0]},${g[1]})` }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: pat, backgroundSize: "20px 20px", opacity: 0.28 }} />
                    {enr
                      ? <div className="lv-card-badge" style={{ background: done ? "rgba(22,163,74,.88)" : "rgba(108,61,214,.88)", color: "#fff" }}>{done ? "✓ Done" : `${pct}%`}</div>
                      : <div className="lv-card-badge" style={{ background: "rgba(0,0,0,.26)", color: "rgba(255,255,255,.9)" }}>{c.cat}</div>
                    }
                    <div className="lv-card-emoji">{ic}</div>
                    {pct > 0 && (
                      <div className="lv-card-pbar">
                        <div className="lv-card-pfill" style={{ width: `${pct}%`, background: done ? "rgba(34,197,94,.9)" : "rgba(255,255,255,.85)" }} />
                      </div>
                    )}
                    <div className="lv-card-hover">
                      <div className="lv-card-play">
                        <svg width="10" height="10" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z" /></svg>
                      </div>
                      <span style={{ color: "#fff", fontSize: 9.5, fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,.4)" }}>
                        {done ? "Review" : enr ? `Continue · ${pct}%` : "Enroll Now"}
                      </span>
                      {tl && <span style={{ color: "rgba(255,255,255,.6)", fontSize: 9 }}>⏱ {tl}</span>}
                    </div>
                  </div>

                  <div className="lv-card-body">
                    <div className="lv-card-title">{c.title}</div>
                    <div className="lv-card-desc">{c.desc}</div>
                    {enr && !done && pct > 0 && (
                      <div className="lv-card-prog">
                        <div className="lv-card-prog-bar">
                          <div className="lv-card-prog-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="lv-card-prog-lbl">{pct}% complete</div>
                      </div>
                    )}
                    <div className="lv-card-meta">
                      <svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <circle cx="7" cy="7" r="5.5" /><path d="M7 4v3l2 1.2" />
                      </svg>
                      {c.time}
                      {mc > 0 && (
                        <>
                          <span style={{ width: 2, height: 2, borderRadius: "50%", background: "#d4d0e8", display: "inline-block" }} />
                          <svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="#0d9488" strokeWidth="1.5">
                            <path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z" />
                          </svg>
                          <span style={{ color: "#0d9488", fontWeight: 600 }}>{mc}m · {chc}ch</span>
                        </>
                      )}
                    </div>
                    <button
                      className={`lv-cta${done ? " done" : enr ? " enr" : " new"}`}
                      onClick={e => { e.stopPropagation(); onOpenCourse(ri); }}
                    >
                      {done
                        ? <><svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 7l4 4 6-6" /></svg>Review</>
                        : enr
                          ? <><svg width="8" height="8" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z" /></svg>Continue</>
                          : <><svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M7 2v10M2 7h10" /></svg>Enroll</>
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>
    </>
  );
}
