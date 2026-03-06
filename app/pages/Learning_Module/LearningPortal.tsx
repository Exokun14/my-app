'use client'

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  LPCourse, LPModule, LPChapter, Segment, Particle,
  LandingProps, LearningPortalProps, SegQuizProps,
} from "../../Data/types";
import {
  SPARK_COLORS, TYPE_CONFIG, PORTAL_STYLES,
  buildFlatChapters, getChapterKey, getAnswerKey,
  getProgressPct, calcQuizScore, isQuizPassed, getQuizOptStyle,
} from "../Logic/LearningPortal.logic";
import COURSE_DATA from "../../Data/test_data.json";

const COURSE = COURSE_DATA.LP_COURSE as LPCourse;

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLE CANVAS
// ─────────────────────────────────────────────────────────────────────────────
function ParticleCanvas({ trigger, originRef }: { trigger: number; originRef: React.RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rafRef    = useRef<number>(0);
  const idRef     = useRef(0);

  const burst = useCallback((x: number, y: number) => {
    for (let i = 0; i < 64; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5.5;
      particles.current.push({
        id: idRef.current++, x, y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2.5,
        color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
        size: 3 + Math.random() * 5.5, life: 1,
        decay: 0.016 + Math.random() * 0.02,
        shape: (["circle", "star", "spark"] as const)[Math.floor(Math.random() * 3)],
      });
    }
  }, []);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current; if (!canvas) return;
    let ox = window.innerWidth / 2, oy = window.innerHeight / 2;
    if (originRef?.current) {
      const r = originRef.current.getBoundingClientRect();
      ox = r.left + r.width / 2; oy = r.top + r.height / 2;
    }
    burst(ox, oy);
    const draw = () => {
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.filter(p => p.life > 0);
      for (const p of particles.current) {
        ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); ctx.fill();
        } else if (p.shape === "spark") {
          ctx.lineWidth = p.size / 3; ctx.beginPath(); ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2); ctx.stroke();
        } else {
          ctx.translate(p.x, p.y); ctx.rotate(p.life * 10); ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            ctx.lineTo(Math.cos(a) * p.size, Math.sin(a) * p.size);
            ctx.lineTo(Math.cos(a + Math.PI / 4) * p.size * 0.4, Math.sin(a + Math.PI / 4) * p.size * 0.4);
          }
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.vx *= 0.98; p.life -= p.decay;
      }
      if (particles.current.length > 0) rafRef.current = requestAnimationFrame(draw);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [trigger]);

  useEffect(() => {
    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width  = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    resize(); window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEGMENT RENDERERS
// ─────────────────────────────────────────────────────────────────────────────
function SegIntro({ seg }: { seg: Segment }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#f5f3ff,#e0f2fe)", border: "1px solid rgba(2,132,199,0.15)", borderRadius: 14, padding: "22px 26px", marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#0284c7", marginBottom: 8 }}>Introduction</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 21, fontWeight: 600, color: "#0f0a2a", lineHeight: 1.25, marginBottom: 10 }}>{seg.heading}</div>
      <p style={{ fontSize: 14, lineHeight: 1.8, color: "#3b1f7a", margin: 0 }}>{seg.body}</p>
    </div>
  );
}

function SegText({ seg }: { seg: Segment }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {seg.heading && <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#0f0a2a", marginBottom: 10 }}>{seg.heading}</h3>}
      <p style={{ fontSize: 13.5, lineHeight: 1.82, color: "#2d1f5e", margin: 0 }}>{seg.body}</p>
    </div>
  );
}

function SegKeyPoints({ seg }: { seg: Segment }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {seg.heading && <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#0f0a2a", marginBottom: 12 }}>{seg.heading}</h3>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(seg.points ?? []).map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 15px", background: "#fff", border: "1px solid rgba(109,40,217,0.1)", borderRadius: 10, transition: "transform .15s, box-shadow .15s", cursor: "default" }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateX(3px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 3px 14px rgba(109,40,217,0.09)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#7c3aed,#0d9488)", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
            <span style={{ fontSize: 13, lineHeight: 1.55, color: "#2d1f5e", paddingTop: 2 }}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SegCallout({ seg }: { seg: Segment }) {
  const styles = {
    tip:     { bg: "#f0fdf4", border: "rgba(22,163,74,0.25)",  icon: "💡", label: "Tip",     labelColor: "#15803d", textColor: "#14532d" },
    warning: { bg: "#fffbeb", border: "rgba(217,119,6,0.3)",   icon: "⚠️", label: "Warning", labelColor: "#b45309", textColor: "#78350f" },
    info:    { bg: "#eff6ff", border: "rgba(59,130,246,0.25)", icon: "ℹ️", label: "Note",    labelColor: "#1d4ed8", textColor: "#1e3a5f" },
  };
  const s = styles[seg.variant ?? "info"];
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", gap: 14 }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: s.labelColor, marginBottom: 5 }}>{s.label}{seg.heading ? ` — ${seg.heading}` : ""}</div>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: s.textColor, margin: 0 }}>{seg.body}</p>
      </div>
    </div>
  );
}

function SegCards({ seg }: { seg: Segment }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {seg.heading && <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#0f0a2a", marginBottom: 12 }}>{seg.heading}</h3>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
        {(seg.cards ?? []).map((c, i) => (
          <div key={i}
            style={{ background: "#fff", border: "1px solid rgba(109,40,217,0.1)", borderRadius: 12, padding: "14px 16px", transition: "all .18s", cursor: "default" }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "translateY(-3px)"; el.style.boxShadow = "0 6px 22px rgba(109,40,217,0.1)"; el.style.borderColor = "rgba(109,40,217,0.2)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = "none"; el.style.boxShadow = "none"; el.style.borderColor = "rgba(109,40,217,0.1)"; }}>
            <div style={{ fontSize: 24, marginBottom: 9 }}>{c.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f0a2a", marginBottom: 5 }}>{c.title}</div>
            <div style={{ fontSize: 11, color: "#7c65a8", lineHeight: 1.55 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SegSteps({ seg }: { seg: Segment }) {
  const steps = seg.steps ?? [];
  return (
    <div style={{ marginBottom: 16 }}>
      {seg.heading && <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#0f0a2a", marginBottom: 14 }}>{seg.heading}</h3>}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", gap: 16, position: "relative" }}>
            {i < steps.length - 1 && <div style={{ position: "absolute", left: 17, top: 40, width: 2, height: "calc(100% - 16px)", background: "linear-gradient(to bottom,rgba(109,40,217,0.2),transparent)", zIndex: 0 }} />}
            <div style={{ flexShrink: 0, zIndex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#0d9488)", color: "#fff", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(124,58,237,0.3)" }}>{step.num}</div>
            </div>
            <div style={{ paddingBottom: 20, paddingTop: 4, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f0a2a", marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: 12.5, color: "#7c65a8", lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SegTable({ seg }: { seg: Segment }) {
  return (
    <div style={{ marginBottom: 16, overflowX: "auto" }}>
      {seg.heading && <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, color: "#0f0a2a", marginBottom: 12 }}>{seg.heading}</h3>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {(seg.headers ?? []).map((h, i) => (
              <th key={i} style={{ padding: "9px 14px", textAlign: "left", fontSize: 9, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: "#7c65a8", background: "#f8f7ff", borderBottom: "2px solid rgba(109,40,217,0.12)", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(seg.rows ?? []).map((row, ri) => (
            <tr key={ri}
              onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "#f8f7ff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "10px 14px", fontSize: 12.5, color: "#2d1f5e", borderBottom: "1px solid rgba(109,40,217,0.07)", fontWeight: ci === 0 ? 600 : 400 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SegQuizIntro({ seg }: { seg: Segment }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#1e1b4b,#4c1d95)", borderRadius: 14, padding: "20px 24px", marginBottom: 16, color: "#fff" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>Knowledge Check</div>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, fontWeight: 700, marginBottom: 8 }}>{seg.heading}</div>
      <p style={{ fontSize: 12.5, opacity: 0.75, lineHeight: 1.7, margin: 0 }}>{seg.body}</p>
    </div>
  );
}

function SegQuiz({ seg, chKey, quizAnswers, setQuizAnswers, quizSubmitted, setQuizSubmitted, onPass }: SegQuizProps) {
  const submitted  = quizSubmitted.has(chKey);
  const questions  = seg.questions ?? [];
  const allAnswered = questions.every((_, qi) => quizAnswers[getAnswerKey(chKey, qi)] !== undefined);

  const submit = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!allAnswered) return;
    setQuizSubmitted(prev => { const n = new Set(prev); n.add(chKey); return n; });
    if (isQuizPassed(seg, quizAnswers, chKey)) onPass(e.currentTarget);
  };

  const sc  = submitted ? calcQuizScore(questions, quizAnswers, chKey) : 0;
  const pct = submitted ? Math.round(sc / questions.length * 100) : 0;

  return (
    <div>
      {submitted && (
        <div style={{ background: pct >= 70 ? "linear-gradient(135deg,#064e3b,#0f766e)" : "linear-gradient(135deg,#1e1b4b,#4c1d95)", borderRadius: 14, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, animation: "lp-slideDown .4s ease" }}>
          <span style={{ fontSize: 36 }}>{pct >= 70 ? "🏆" : pct >= 50 ? "⭐" : "📚"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{pct >= 70 ? "Passed! Well done" : "Keep studying and try again"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginTop: 3 }}>{sc} / {questions.length} correct · {pct}%</div>
          </div>
          <div style={{ width: 72 }}>
            <div style={{ height: 6, background: "rgba(255,255,255,.2)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#34d399,#a78bfa)", borderRadius: 6, transition: "width .8s ease" }} />
            </div>
          </div>
        </div>
      )}

      {questions.map((q, qi) => (
        <div key={qi} style={{ background: "#fff", border: "1px solid rgba(109,40,217,0.09)", borderRadius: 14, padding: "16px 18px", marginBottom: 12, boxShadow: "0 2px 12px rgba(109,40,217,0.05)", animation: `lp-fadeUp .2s ease ${qi * .06}s both` }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#ede9fe", color: "#7c3aed", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{qi + 1}</div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "#0f0a2a", lineHeight: 1.45, margin: 0 }}>{q.q}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingLeft: 38 }}>
            {q.opts.map((opt, oi) => {
              const s = getQuizOptStyle(q.ans, qi, oi, quizAnswers[getAnswerKey(chKey, qi)], submitted);
              return (
                <div key={oi}
                  className={`lp-quiz-opt${submitted ? " submitted" : ""}`}
                  onClick={() => !submitted && setQuizAnswers(prev => ({ ...prev, [getAnswerKey(chKey, qi)]: oi }))}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: s.bg, border: `1.5px solid ${s.border}`, cursor: submitted ? "default" : "pointer", userSelect: "none" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${s.border}`, background: s.rb, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                    {s.dot && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <span style={{ fontSize: 13, color: s.color, fontWeight: s.dot ? 600 : 400, flex: 1 }}>{opt}</span>
                  {submitted && s.tag && <span style={{ fontSize: 11, fontWeight: 800, color: s.color, marginLeft: "auto" }}>{s.tag}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted && (
        <button
          onClick={submit}
          disabled={!allAnswered}
          style={{ padding: "12px 28px", borderRadius: 11, border: "none", background: allAnswered ? "linear-gradient(135deg,#7c3aed,#0d9488)" : "#e2dff5", color: allAnswered ? "#fff" : "#a89dc8", fontSize: 13, fontWeight: 700, cursor: allAnswered ? "pointer" : "not-allowed", fontFamily: "'Plus Jakarta Sans',sans-serif", marginTop: 4, transition: "transform .15s, box-shadow .15s" }}
          onMouseEnter={e => { if (allAnswered) { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(13,148,136,0.4)"; } }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}>
          Submit Answers →
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LANDING SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function LandingScreen({ onEnter, onBack, completedCount, totalChapters }: LandingProps) {
  const progressPct = getProgressPct(completedCount, totalChapters);
  const totalMods   = COURSE.modules.length;
  const totalChs    = COURSE.modules.reduce((a, m) => a + m.chapters.length, 0);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Top bar */}
      <div style={{ padding: "14px 28px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(109,40,217,0.08)", flexShrink: 0, background: "rgba(255,255,255,0.9)" }}>
        <button className="lp-back-btn" onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9, border: "1px solid rgba(109,40,217,0.15)", background: "transparent", color: "#6d28d9", fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 1L3 6l5 5"/></svg>
          Back to Catalog
        </button>
        <div style={{ flex: 1 }} />
        {completedCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#7c65a8" }}>
            <div style={{ width: 100, height: 4, background: "#e9e6f8", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg,#7c3aed,#0d9488)", borderRadius: 4 }} />
            </div>
            <span style={{ fontWeight: 600 }}>{progressPct}% done</span>
          </div>
        )}
      </div>

      {/* Hero */}
      <div className="lp-hero-enter" style={{ background: "linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)", padding: "52px 40px", position: "relative", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(124,58,237,0.3),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(13,148,136,0.25),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 44, animation: "lp-bounce 3s ease-in-out infinite" }}>{COURSE.emoji}</span>
            <div style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)", letterSpacing: ".08em", textTransform: "uppercase" }}>
              {COURSE.category}
            </div>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 700, color: "#fff", lineHeight: 1.15, marginBottom: 12, letterSpacing: "-0.02em" }}>{COURSE.title}</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 24, maxWidth: 500 }}>
            Master the fundamentals of point-of-sale systems — from hardware basics to end-of-day procedures. Earn your POS Fundamentals certificate upon completion.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
            {[{ ico: "⏱️", val: COURSE.duration }, { ico: "📦", val: `${totalMods} Modules` }, { ico: "📄", val: `${totalChs} Chapters` }, { ico: "🎓", val: "Certificate" }].map((stat, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
                <span>{stat.ico}</span><span>{stat.val}</span>
              </div>
            ))}
          </div>
          <button
            onClick={onEnter}
            style={{ padding: "14px 36px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#7c3aed,#0d9488)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: "0 8px 32px rgba(124,58,237,0.5)", transition: "transform .15s, box-shadow .15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 40px rgba(124,58,237,0.6)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "none"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(124,58,237,0.5)"; }}>
            {completedCount > 0 ? "Continue Learning" : "Start Learning"}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 7h10M8 3l4 4-4 4"/></svg>
          </button>
        </div>
      </div>

      {/* Module list */}
      <div style={{ padding: "30px 40px", flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#7c65a8", marginBottom: 18 }}>Course Modules</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {COURSE.modules.map((m, mi) => (
            <div key={mi} className="lp-mod-card"
              onClick={onEnter}
              style={{ background: "#fff", border: "1px solid rgba(109,40,217,0.1)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, animation: `lp-fadeUp .3s ease ${mi * 0.08}s both` }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${m.color}18`, border: `2px solid ${m.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {mi === 0 ? "🚀" : mi === 1 ? "💳" : "📊"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f0a2a", marginBottom: 3 }}>{m.title}</div>
                <div style={{ fontSize: 11, color: "#7c65a8" }}>{m.chapters.length} chapters · {m.chapters.map(c => TYPE_CONFIG[c.type].ico).join(" ")}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} />
                <span style={{ fontSize: 11, color: "#7c65a8", fontWeight: 500 }}>Module {mi + 1}</span>
              </div>
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="#c4bdd8" strokeWidth="1.8"><path d="M1 1l6 6-6 6"/></svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PORTAL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LearningPortal({ onBack }: LearningPortalProps) {
  const allChapters   = buildFlatChapters(COURSE);
  const totalChapters = allChapters.length;

  const [view,          setView]          = useState<"landing" | "course">("landing");
  const [viewExiting,   setViewExiting]   = useState(false);
  const [selMod,        setSelMod]        = useState(0);
  const [selCh,         setSelCh]         = useState(0);
  const [expandedMods,  setExpandedMods]  = useState<Set<number>>(new Set([0]));
  const [completed,     setCompleted]     = useState<Set<string>>(new Set());
  const [quizAnswers,   setQuizAnswers]   = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Set<string>>(new Set());
  const [sparkTrigger,  setSparkTrigger]  = useState(0);
  const [completeBanner, setCompleteBanner] = useState(false);
  const [allDone,       setAllDone]       = useState(false);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);

  const contentRef = useRef<HTMLDivElement>(null);
  const originRef  = useRef<HTMLElement | null>(null);

  const mod    = COURSE.modules[selMod];
  const ch     = mod?.chapters[selCh];
  const chKey  = getChapterKey(selMod, selCh);
  const isDone = completed.has(chKey);

  const curFlat    = allChapters.findIndex(x => x.mi === selMod && x.ci === selCh);
  const isFirst    = curFlat === 0;
  const isLast     = curFlat === allChapters.length - 1;
  const progressPct = getProgressPct(completed.size, totalChapters);

  // Inject styles once
  useEffect(() => {
    if (document.getElementById("lp-styles-v2")) return;
    const el = document.createElement("style");
    el.id = "lp-styles-v2";
    el.textContent = PORTAL_STYLES;
    document.head.appendChild(el);
  }, []);

  useEffect(() => { contentRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [selMod, selCh]);

  useEffect(() => {
    if (completed.size === totalChapters && totalChapters > 0) {
      setAllDone(true);
      setTimeout(() => setAllDone(false), 5000);
    }
  }, [completed]);

  const enterCourse = () => {
    setViewExiting(true);
    setTimeout(() => { setViewExiting(false); setView("course"); }, 280);
  };

  const exitCourse = () => {
    setViewExiting(true);
    setTimeout(() => { setViewExiting(false); setView("landing"); }, 280);
  };

  const markComplete = (el?: HTMLElement) => {
    if (isDone) return;
    setCompleted(prev => { const n = new Set(prev); n.add(chKey); return n; });
    if (el) originRef.current = el;
    setSparkTrigger(t => t + 1);
    setCompleteBanner(true);
    setTimeout(() => setCompleteBanner(false), 2400);
  };

  const navigate = (dir: 1 | -1) => {
    const next = allChapters[curFlat + dir];
    if (!next) return;
    setSelMod(next.mi); setSelCh(next.ci);
    setExpandedMods(prev => { const n = new Set(prev); n.add(next.mi); return n; });
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectChapter = (mi: number, ci: number) => {
    setSelMod(mi); setSelCh(ci);
    setExpandedMods(prev => { const n = new Set(prev); n.add(mi); return n; });
  };

  const toggleMod = (mi: number) => {
    setExpandedMods(prev => { const n = new Set(prev); n.has(mi) ? n.delete(mi) : n.add(mi); return n; });
  };

  const hasQuiz   = ch?.segments?.some(s => s.type === "quiz") ?? false;
  const quizSeg   = ch?.segments?.find(s => s.type === "quiz");
  const quizPassed = quizSeg && quizSubmitted.has(chKey)
    ? isQuizPassed(quizSeg, quizAnswers, chKey)
    : false;

  const chType = ch ? TYPE_CONFIG[ch.type] : TYPE_CONFIG.lesson;

  return (
    <div className="lp-wrap" style={{ display: "flex", flexDirection: "column", height: "100%", background: "#faf9ff", overflow: "hidden" }}>
      <ParticleCanvas trigger={sparkTrigger} originRef={originRef} />

      <div
        className={viewExiting ? "lp-portal-exit" : "lp-portal-enter"}
        style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {view === "landing" ? (
          <LandingScreen
            onEnter={enterCourse}
            onBack={onBack ?? (() => {})}
            completedCount={completed.size}
            totalChapters={totalChapters}
          />
        ) : (
          <>
            {/* ══ TOP RAIL ══ */}
            <div style={{ height: 52, flexShrink: 0, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.97)", borderBottom: "1px solid rgba(109,40,217,0.08)", padding: "0 20px", gap: 10, position: "relative", zIndex: 100, backdropFilter: "blur(20px)" }}>
              <button className="lp-back-btn"
                onClick={exitCourse}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 8, border: "1px solid rgba(109,40,217,0.15)", background: "transparent", color: "#6d28d9", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1L2 5l5 4"/></svg>
                Overview
              </button>

              <div style={{ width: 1, height: 18, background: "rgba(109,40,217,0.1)" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#7c65a8" }}>
                <span style={{ fontWeight: 600, color: "#0f0a2a" }}>{COURSE.emoji} {COURSE.title}</span>
              </div>
              <div style={{ flex: 1 }} />

              {/* Progress */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 10, color: "#7c65a8" }}>{completed.size}/{totalChapters}</div>
                <div style={{ width: 140, height: 5, background: "#e9e6f8", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg,#7c3aed,#0d9488)", borderRadius: 5, transition: "width .6s ease" }} />
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>{progressPct}%</div>
              </div>

              <div style={{ width: 1, height: 18, background: "rgba(109,40,217,0.1)" }} />
              <button
                className="lp-sidebar-toggle"
                onClick={() => setSidebarOpen(v => !v)}
                style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(109,40,217,0.07)", border: "1px solid rgba(109,40,217,0.12)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="13" height="11" viewBox="0 0 13 11" fill="none" stroke="#7c3aed" strokeWidth="1.8"><path d="M1 1h11M1 5.5h11M1 10h11"/></svg>
              </button>
            </div>

            {/* ══ ALL DONE BANNER ══ */}
            {allDone && (
              <div style={{ background: "linear-gradient(135deg,#064e3b,#065f46,#047857)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 14, animation: "lp-slideDown .4s ease", flexShrink: 0 }}>
                <span style={{ fontSize: 26, animation: "lp-spin 2s linear infinite" }}>🏆</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#6ee7b7" }}>Course Complete!</div>
                  <div style={{ fontSize: 10, color: "#a7f3d0" }}>You've finished all {totalChapters} chapters. Your certificate is ready!</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {["🎉", "⭐", "✨", "🌟"].map((em, i) => <span key={i} style={{ fontSize: 18, animation: `lp-bounce ${.5 + i * .15}s ease-in-out infinite` }}>{em}</span>)}
                </div>
              </div>
            )}

            {/* ══ BODY ══ */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

              {/* ── SIDEBAR ── */}
              {sidebarOpen && (
                <div style={{ width: 246, flexShrink: 0, borderRight: "1px solid rgba(109,40,217,0.08)", background: "#f8f7ff", display: "flex", flexDirection: "column", overflow: "hidden", animation: "lp-slideIn .2s ease" }}>
                  {/* Course card */}
                  <div style={{ background: "linear-gradient(135deg,#3b0764,#6d28d9 55%,#0f766e)", padding: "13px 14px", flexShrink: 0 }}>
                    <div style={{ fontSize: 20, marginBottom: 5, animation: "lp-bounce 3s ease-in-out infinite" }}>{COURSE.emoji}</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 1 }}>{COURSE.title}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,.55)", marginBottom: 8 }}>{COURSE.category} · {COURSE.duration}</div>
                    <div style={{ background: "rgba(255,255,255,.18)", height: 4, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progressPct}%`, background: "#fff", borderRadius: 4, transition: "width .6s ease" }} />
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)", marginTop: 3 }}>{progressPct}% · {completed.size}/{totalChapters}</div>
                  </div>

                  <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
                    {COURSE.modules.map((m, mi) => {
                      const modDoneCount = m.chapters.filter((_, ci) => completed.has(getChapterKey(mi, ci))).length;
                      const modFull   = modDoneCount === m.chapters.length;
                      const modActive = selMod === mi;
                      const expanded  = expandedMods.has(mi);
                      const modPct    = m.chapters.length > 0 ? Math.round(modDoneCount / m.chapters.length * 100) : 0;

                      return (
                        <div key={mi} style={{ marginBottom: 3 }}>
                          <div
                            className="lp-mod-head"
                            onClick={() => toggleMod(mi)}
                            style={{ padding: "8px 9px", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, userSelect: "none", position: "relative", overflow: "hidden", background: modActive ? "#ede9fe" : modFull ? "#d1fae5" : "transparent" }}>
                            {modPct > 0 && !modFull && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${modPct}%`, background: "rgba(109,40,217,0.06)", borderRadius: 10 }} />}
                            <div style={{ width: 21, height: 21, borderRadius: 6, background: modFull ? "#059669" : modActive ? m.color : "#e2dff5", color: modFull || modActive ? "#fff" : "#6b5fa0", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, transition: "all .2s" }}>
                              {modFull ? "✓" : mi + 1}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: modFull ? "#065f46" : modActive ? "#5b21b6" : "#18103a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                              <div style={{ fontSize: 9, color: modFull ? "#059669" : "#a89dc8", marginTop: 1 }}>{modDoneCount}/{m.chapters.length} chapters</div>
                            </div>
                            <svg width="7" height="5" viewBox="0 0 8 6" fill="none" stroke={modActive ? m.color : "#a89dc8"} strokeWidth="1.8" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0, zIndex: 1 }}><path d="M1 1l3 4 3-4"/></svg>
                          </div>

                          {expanded && (
                            <div style={{ paddingLeft: 8, marginTop: 2 }}>
                              {m.chapters.map((c, ci) => {
                                const key    = getChapterKey(mi, ci);
                                const done   = completed.has(key);
                                const active = selMod === mi && selCh === ci;
                                const tc     = TYPE_CONFIG[c.type];
                                return (
                                  <div key={ci}
                                    className={`lp-ch-item${active ? " active" : ""}`}
                                    onClick={() => selectChapter(mi, ci)}
                                    style={{ padding: "6px 8px", borderRadius: 8, marginBottom: 2, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: active ? "#fff" : "transparent", border: `1px solid ${active ? "rgba(109,40,217,0.16)" : "transparent"}`, boxShadow: active ? "0 1px 8px rgba(109,40,217,0.09)" : "none" }}>
                                    <div style={{ width: 17, height: 17, borderRadius: 5, background: done ? "#059669" : tc.bg, color: done ? "#fff" : tc.color, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
                                      {done ? "✓" : ci + 1}
                                    </div>
                                    <span style={{ flex: 1, fontSize: 10, fontWeight: active ? 600 : 400, color: active ? "#5b21b6" : done ? "#6b7280" : "#18103a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: done ? "line-through" : "none", opacity: done ? 0.65 : 1 }}>
                                      {c.title}
                                    </span>
                                    <span style={{ fontSize: 10, opacity: 0.55, flexShrink: 0 }}>{tc.ico}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── MAIN CONTENT ── */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Chapter progress stripe */}
                <div style={{ height: 3, background: "#e9e6f8", flexShrink: 0 }}>
                  <div style={{ height: "100%", width: `${totalChapters > 0 ? ((curFlat + (isDone ? 1 : .5)) / totalChapters * 100) : 0}%`, background: "linear-gradient(90deg,#7c3aed,#0d9488)", transition: "width .5s cubic-bezier(.4,0,.2,1)", boxShadow: "0 0 5px rgba(124,58,237,0.4)" }} />
                </div>

                {/* Complete banner */}
                {completeBanner && (
                  <div style={{ background: "linear-gradient(90deg,#7c3aed,#0d9488)", padding: "8px 24px", display: "flex", alignItems: "center", gap: 10, animation: "lp-slideDown .35s ease", flexShrink: 0 }}>
                    <span style={{ fontSize: 16, animation: "lp-checkPop .4s ease" }}>✅</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Chapter complete! Keep going 🎯</span>
                  </div>
                )}

                {/* Chapter header bar */}
                {ch && (
                  <div style={{ borderBottom: "1px solid rgba(109,40,217,0.08)", padding: "0 28px", height: 48, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: "#fff" }}>
                    <span style={{ padding: "3px 9px", borderRadius: 6, background: chType.bg, color: chType.color, fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>{chType.ico} {chType.label}</span>
                    <div style={{ width: 1, height: 16, background: "rgba(109,40,217,0.1)" }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0f0a2a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.title}</span>
                    {isDone && <span style={{ padding: "3px 8px", borderRadius: 6, background: "#d1fae5", color: "#059669", fontSize: 9.5, fontWeight: 700, animation: "lp-popIn .3s ease", flexShrink: 0 }}>✓ Done</span>}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 9.5, color: "#a89dc8", whiteSpace: "nowrap" }}>{mod.title} · Ch. {selCh + 1}/{mod.chapters.length}</span>
                    <div style={{ width: 1, height: 16, background: "rgba(109,40,217,0.1)" }} />
                    <span style={{ fontSize: 9.5, color: "#a89dc8", whiteSpace: "nowrap" }}>{curFlat + 1} / {totalChapters}</span>
                  </div>
                )}

                {/* Scrollable content */}
                <div ref={contentRef} style={{ flex: 1, overflowY: "auto", padding: "26px 34px 20px", display: "flex", flexDirection: "column" }}>
                  {ch ? (
                    <>
                      {ch.segments?.map((seg, si) => (
                        <div key={si} style={{ animation: `lp-fadeUp .25s ease ${si * .06}s both` }}>
                          {seg.type === "intro"      && <SegIntro      seg={seg} />}
                          {seg.type === "text"       && <SegText       seg={seg} />}
                          {seg.type === "keypoints"  && <SegKeyPoints  seg={seg} />}
                          {seg.type === "callout"    && <SegCallout    seg={seg} />}
                          {seg.type === "cards"      && <SegCards      seg={seg} />}
                          {seg.type === "steps"      && <SegSteps      seg={seg} />}
                          {seg.type === "table"      && <SegTable      seg={seg} />}
                          {seg.type === "quiz_intro" && <SegQuizIntro  seg={seg} />}
                          {seg.type === "quiz" && (
                            <SegQuiz
                              seg={seg} chKey={chKey}
                              quizAnswers={quizAnswers}   setQuizAnswers={setQuizAnswers}
                              quizSubmitted={quizSubmitted} setQuizSubmitted={setQuizSubmitted}
                              onPass={(el) => markComplete(el)}
                            />
                          )}
                        </div>
                      ))}

                      {/* Mark complete for lessons */}
                      {!hasQuiz && !isDone && (
                        <div style={{ marginTop: 28, animation: "lp-fadeUp .3s ease" }}>
                          <button
                            ref={originRef as React.RefObject<HTMLButtonElement>}
                            className="lp-complete-btn"
                            onClick={e => markComplete(e.currentTarget)}
                            style={{ padding: "12px 28px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#7c3aed,#0d9488)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 7.5l3 3 7-7"/></svg>
                            Mark as Complete
                          </button>
                        </div>
                      )}

                      {/* Done nudge */}
                      {isDone && !hasQuiz && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: "#d1fae5", border: "1px solid rgba(5,150,105,0.2)", marginTop: 24, animation: "lp-fadeUp .3s ease" }}>
                          <span style={{ fontSize: 18 }}>✅</span>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#065f46" }}>Chapter completed!</span>
                          {!isLast && (
                            <button className="lp-nav-btn" onClick={() => navigate(1)}
                              style={{ marginLeft: "auto", padding: "7px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#7c3aed,#0d9488)", color: "#fff", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
                              Next Chapter →
                            </button>
                          )}
                        </div>
                      )}

                      <div style={{ height: 40 }} />
                    </>
                  ) : (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#a89dc8", fontSize: 13 }}>Select a chapter to begin</div>
                  )}
                </div>

                {/* ── FOOTER NAV ── */}
                <div style={{ padding: "10px 28px", borderTop: "1px solid rgba(109,40,217,0.08)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: "#fff" }}>
                  <button className="lp-nav-btn"
                    onClick={() => navigate(-1)}
                    disabled={isFirst}
                    style={{ padding: "8px 20px", borderRadius: 10, border: "1px solid rgba(109,40,217,0.18)", background: "#fff", color: isFirst ? "#d4d0e8" : "#7c3aed", fontSize: 12, fontWeight: 600, cursor: isFirst ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
                    ← Previous
                  </button>

                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{ fontSize: 10, color: "#a89dc8" }}>{curFlat + 1} of {totalChapters} chapters</div>
                    <div style={{ width: "55%", height: 3, background: "#e9e6f8", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${((curFlat + 1) / totalChapters) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#0d9488)", borderRadius: 3, transition: "width .4s ease" }} />
                    </div>
                  </div>

                  <button className="lp-nav-btn"
                    onClick={() => { if (!isDone && !hasQuiz) markComplete(); navigate(1); }}
                    disabled={isLast}
                    style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: isLast ? "#e2dff5" : "linear-gradient(135deg,#7c3aed,#0d9488)", color: isLast ? "#a89dc8" : "#fff", fontSize: 12, fontWeight: 700, cursor: isLast ? "default" : "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}