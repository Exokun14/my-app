'use client'

import type { Course, Chapter, ChapterType, CourseViewerProps, CourseViewerLandingProps, ContentProps } from "../../Data/types";
import type { Activity as Segment } from "./ActivityManager";
import {
  TM, STYLES,
  videoEmbed, presentationEmbed,
  calcQuizScore, isAllAnswered, checkFillBlank,
  useInjectStyles, useAccordion, useFlashcards, useFillBlank,
  useChecklist, useMatchingGame, useParticleCanvas, useCourseViewer,
} from "../Logic/CourseViewerLogic";

// ─── Particle canvas ──────────────────────────────────────────────────────────
function ParticleCanvas({ trigger, originEl }: { trigger: number; originEl: React.RefObject<HTMLElement | null> }) {
  const canvasRef = useParticleCanvas(trigger, originEl);
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }} />;
}

// ─── Interactive Segment Renderers ────────────────────────────────────────────

function SegAccordion({ seg }: { seg: Segment }) {
  const { open, toggle } = useAccordion();
  const items = seg.items ?? [];
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(2,132,199,0.14)", borderRadius: 14, overflow: "hidden", animation: "cv2-segIn .3s ease" }}>
      <div style={{ padding: "11px 16px", borderBottom: "1px solid rgba(2,132,199,0.1)", display: "flex", alignItems: "center", gap: 8, background: "#f0f9ff" }}>
        <span style={{ fontSize: 14 }}>🗂️</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0284c7" }}>{seg.title || "Accordion"}</span>
        <span style={{ marginLeft: "auto", fontSize: 9.5, color: "#a89dc8" }}>{items.length} items</span>
      </div>
      {items.map((item, i) => (
        <div key={i} className="cv2-acc-item" style={{ borderBottom: i < items.length - 1 ? "1px solid rgba(2,132,199,0.08)" : "none" }}>
          <div onClick={() => toggle(i)} style={{ padding: "11px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", background: open === i ? "#e0f2fe" : "transparent" }}>
            <span style={{ fontSize: 12 }}>❓</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0c4a6e" }}>{item.q}</span>
            <svg width="10" height="7" viewBox="0 0 10 7" fill="#0284c7" style={{ flexShrink: 0, transform: open === i ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="M1 1l4 4 4-4"/></svg>
          </div>
          {open === i && (
            <div style={{ padding: "0 16px 14px 38px", fontSize: 13, color: "#2d4a6a", lineHeight: 1.7, animation: "cv2-fadeIn .2s ease" }}>{item.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function SegFlashcards({ seg }: { seg: Segment }) {
  const cards = seg.cards ?? [];
  const { cur, flipped, flip, next, prev } = useFlashcards(cards.length);
  if (!cards.length) return null;
  const card = cards[cur];
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(124,58,237,0.14)", borderRadius: 14, overflow: "hidden", animation: "cv2-segIn .3s ease" }}>
      <div style={{ padding: "11px 16px", borderBottom: "1px solid rgba(124,58,237,0.1)", display: "flex", alignItems: "center", gap: 8, background: "#f5f3ff" }}>
        <span style={{ fontSize: 14 }}>🃏</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#7c3aed" }}>{seg.title || "Flashcards"}</span>
        <span style={{ marginLeft: "auto", fontSize: 9.5, color: "#a89dc8" }}>{cur + 1} / {cards.length}</span>
      </div>
      <div style={{ padding: "20px" }}>
        <div className="cv2-card-scene" style={{ height: 140, marginBottom: 14 }} onClick={flip}>
          <div className={`cv2-card-inner${flipped ? " flipped" : ""}`} style={{ height: "100%", cursor: "pointer" }}>
            <div className="cv2-card-face" style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", boxShadow: "0 4px 18px rgba(124,58,237,0.3)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.6)", letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 8 }}>Front — tap to flip</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.4 }}>{card.front}</div>
              </div>
            </div>
            <div className="cv2-card-face cv2-card-back" style={{ background: "linear-gradient(135deg,#0d9488,#0f766e)", boxShadow: "0 4px 18px rgba(13,148,136,0.3)" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.6)", letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 8 }}>Back</div>
                <div style={{ fontSize: 13.5, color: "#fff", lineHeight: 1.55 }}>{card.back}</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prev} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(124,58,237,0.2)", background: "#fff", color: "#7c3aed", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>← Prev</button>
          <div style={{ flex: 1, height: 3, background: "#e9e6f8", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((cur + 1) / cards.length) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#0d9488)", borderRadius: 3, transition: "width .3s ease" }} />
          </div>
          <button onClick={next} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#0d9488)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Next →</button>
        </div>
      </div>
    </div>
  );
}

function SegFillBlank({ seg }: { seg: Segment }) {
  const qs = seg.questions ?? [];
  const { inputs, submitted, allFilled, updateInput, submit, reset } = useFillBlank(qs.length);
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(15,118,110,0.14)", borderRadius: 14, overflow: "hidden", animation: "cv2-segIn .3s ease" }}>
      <div style={{ padding: "11px 16px", borderBottom: "1px solid rgba(15,118,110,0.1)", display: "flex", alignItems: "center", gap: 8, background: "#f0fdf9" }}>
        <span style={{ fontSize: 14 }}>✏️</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#0f766e" }}>{seg.title || "Fill in the Blanks"}</span>
      </div>
      <div style={{ padding: "16px" }}>
        {qs.map((q, qi) => {
          const parts   = q.sentence.split("__BLANK__");
          const correct = submitted ? checkFillBlank(inputs, qs, qi) : null;
          return (
            <div key={qi} style={{ marginBottom: qi < qs.length - 1 ? 14 : 0 }}>
              <div style={{ fontSize: 13.5, color: "#0c4a6e", lineHeight: 1.7, display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: 4 }}>
                {parts.map((part, pi) => (
                  <span key={pi} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {part}
                    {pi < parts.length - 1 && (
                      <input
                        value={inputs[qi] ?? ""}
                        onChange={e => updateInput(qi, e.target.value)}
                        disabled={submitted}
                        placeholder="___"
                        style={{ width: 120, border: `2px solid ${submitted ? (correct ? "rgba(22,163,74,0.6)" : "rgba(220,38,38,0.6)") : "rgba(15,118,110,0.3)"}`, borderRadius: 8, padding: "3px 10px", fontSize: 13, background: submitted ? (correct ? "#f0fdf4" : "#fff5f5") : "#fff", outline: "none", color: "#0c4a6e", fontFamily: "inherit", textAlign: "center" as const, transition: "all .2s" }}
                      />
                    )}
                  </span>
                ))}
                {submitted && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: correct ? "#15803d" : "#dc2626", animation: "cv2-popIn .3s ease" }}>
                    {correct ? " ✓ Correct!" : ` ✗ Answer: ${q.blanks[0]}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {!submitted
          ? <button onClick={submit} disabled={!allFilled} style={{ marginTop: 14, padding: "8px 22px", borderRadius: 10, border: "none", background: allFilled ? "linear-gradient(135deg,#0f766e,#0284c7)" : "#e2dff5", color: allFilled ? "#fff" : "#a89dc8", fontSize: 12, fontWeight: 700, cursor: allFilled ? "pointer" : "not-allowed", transition: "all .15s" }}>Check Answers →</button>
          : <button onClick={reset} style={{ marginTop: 14, padding: "8px 22px", borderRadius: 10, border: "1px solid rgba(15,118,110,0.25)", background: "#f0fdf9", color: "#0f766e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Try Again</button>
        }
      </div>
    </div>
  );
}

function SegChecklist({ seg }: { seg: Segment }) {
  const items = seg.checklist ?? [];
  const { checked, doneCount, toggle } = useChecklist(items.length);
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(21,128,61,0.14)", borderRadius: 14, overflow: "hidden", animation: "cv2-segIn .3s ease" }}>
      <div style={{ padding: "11px 16px", borderBottom: "1px solid rgba(21,128,61,0.1)", display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4" }}>
        <span style={{ fontSize: 14 }}>☑️</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#15803d" }}>{seg.title || "Checklist"}</span>
        <span style={{ marginLeft: "auto", fontSize: 9.5, color: doneCount === items.length ? "#15803d" : "#a89dc8", fontWeight: doneCount === items.length ? 700 : 400 }}>
          {doneCount === items.length ? "✅ All done!" : `${doneCount}/${items.length}`}
        </span>
      </div>
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} className="cv2-check-item" onClick={() => toggle(i)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: checked[i] ? "#f0fdf4" : "#faf9ff", border: `1px solid ${checked[i] ? "rgba(21,128,61,0.2)" : "rgba(109,40,217,0.08)"}`, cursor: "pointer", transition: "all .15s" }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${checked[i] ? "#15803d" : "rgba(109,40,217,0.25)"}`, background: checked[i] ? "#15803d" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .18s" }}>
              {checked[i] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="2"><path d="M1 4l3 3 5-6"/></svg>}
            </div>
            <span style={{ fontSize: 13, color: checked[i] ? "#15803d" : "#18103a", textDecoration: checked[i] ? "line-through" : "none", opacity: checked[i] ? 0.7 : 1, transition: "all .15s" }}>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SegMatching({ seg }: { seg: Segment }) {
  const pairs = seg.pairs ?? [];
  const { rightOrder, isMatchedLeft, isMatchedRight, allDone, handleLeft, handleRight, reset, btnStyle } = useMatchingGame(pairs.length);
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(147,51,234,0.14)", borderRadius: 14, overflow: "hidden", animation: "cv2-segIn .3s ease" }}>
      <div style={{ padding: "11px 16px", borderBottom: "1px solid rgba(147,51,234,0.1)", display: "flex", alignItems: "center", gap: 8, background: "#faf5ff" }}>
        <span style={{ fontSize: 14 }}>🔗</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#9333ea" }}>{seg.title || "Matching"}</span>
        <span style={{ marginLeft: "auto", fontSize: 9.5, color: allDone ? "#15803d" : "#a89dc8", fontWeight: allDone ? 700 : 400 }}>
          {allDone ? "🎉 All matched!" : `0/${pairs.length} matched`}
        </span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {pairs.map((p, i) => (
              <button key={i} className="cv2-match-btn" onClick={() => handleLeft(i)} disabled={isMatchedLeft(i)} style={btnStyle("left", i)}>{p.left}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rightOrder.map((origIdx, ri) => (
              <button key={ri} className="cv2-match-btn" onClick={() => handleRight(ri)} disabled={isMatchedRight(ri)} style={btnStyle("right", ri)}>{pairs[origIdx].right}</button>
            ))}
          </div>
        </div>
        {allDone && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d", animation: "cv2-popIn .4s ease" }}>✅ Perfect! All pairs matched.</span>
            <button onClick={reset} style={{ marginLeft: "auto", padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(147,51,234,0.2)", background: "#faf5ff", color: "#9333ea", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Reset</button>
          </div>
        )}
      </div>
    </div>
  );
}

function SegmentRenderer({ seg }: { seg: Segment }) {
  switch (seg.type) {
    case "accordion": return <SegAccordion seg={seg} />;
    case "flashcard": return <SegFlashcards seg={seg} />;
    case "fillblank": return <SegFillBlank seg={seg} />;
    case "checklist":
    case "hotspot":   return <SegChecklist seg={seg} />;
    case "matching":  return <SegMatching seg={seg} />;
    default:          return null;
  }
}

// ─── Landing screen ───────────────────────────────────────────────────────────
function LandingScreen({ course, modules, completedCount, totalChapters, onEnter, onClose }: CourseViewerLandingProps) {
  const progressPct = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
  const totalChs    = modules.reduce((a, m) => a + m.chapters.length, 0);
  const moduleIcons = ["🚀","💳","📊","🎯","📋","🔧"];
  const typeIcons: Record<ChapterType, string> = { lesson: "📖", quiz: "❓", assessment: "📝" };
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:"'Plus Jakarta Sans',sans-serif", background:"#faf9ff" }}>
      <div style={{ height:52, display:"flex", alignItems:"center", padding:"0 24px", gap:10, borderBottom:"1px solid rgba(109,40,217,0.08)", background:"rgba(255,255,255,0.97)", backdropFilter:"blur(16px)", flexShrink:0 }}>
        <button className="cv2-back-btn" onClick={onClose} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", borderRadius:9, border:"1px solid rgba(109,40,217,0.15)", background:"transparent", color:"#6d28d9", fontSize:11.5, fontWeight:600, cursor:"pointer" }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 1L3 6l5 5"/></svg>
          Back to Catalog
        </button>
        <div style={{ width:1, height:18, background:"rgba(109,40,217,0.1)" }} />
        <span style={{ fontSize:11, color:"#7c65a8" }}>Learning Center</span>
        <svg width="5" height="9" viewBox="0 0 5 9" fill="none"><path d="M1 1l3 3.5L1 8" stroke="#c4bdd8" strokeWidth="1.4"/></svg>
        <span style={{ fontSize:11, fontWeight:600, color:"#0f0a2a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{course.title}</span>
        <div style={{ flex:1 }} />
        {completedCount > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:100, height:4, background:"#e9e6f8", borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${progressPct}%`, background:"linear-gradient(90deg,#7c3aed,#0d9488)", borderRadius:4, transition:"width .5s ease" }} />
            </div>
            <span style={{ fontSize:10, color:"#7c65a8", fontWeight:600 }}>{progressPct}%</span>
          </div>
        )}
      </div>
      <div style={{ background:"linear-gradient(135deg,#0f0c29 0%,#1e1b4b 45%,#064e3b 100%)", padding:"44px 40px 40px", position:"relative", overflow:"hidden", flexShrink:0, animation:"cv2-heroIn .5s cubic-bezier(0.16,1,0.3,1) 0.05s both" }}>
        <div style={{ position:"absolute", top:-80, right:-60, width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,0.28),transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-50, left:100, width:240, height:240, borderRadius:"50%", background:"radial-gradient(circle,rgba(13,148,136,0.22),transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.02),transparent)", backgroundSize:"200% 100%", animation:"cv2-shimmer 4s linear infinite", pointerEvents:"none" }} />
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <span style={{ fontSize:46, animation:"cv2-bounce 3s ease-in-out infinite" }}>{course.thumbEmoji||"📚"}</span>
            <div style={{ padding:"4px 12px", borderRadius:20, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", fontSize:9.5, fontWeight:700, color:"rgba(255,255,255,0.75)", letterSpacing:".08em", textTransform:"uppercase" as const }}>{course.cat}</div>
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:36, fontWeight:700, color:"#fff", lineHeight:1.15, marginBottom:10, letterSpacing:"-0.02em" }}>{course.title}</h1>
          <p style={{ fontSize:13.5, color:"rgba(255,255,255,0.6)", lineHeight:1.7, marginBottom:24, maxWidth:520 }}>{course.desc}</p>
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:28, flexWrap:"wrap" as const }}>
            {[{ico:"⏱️",val:course.time},{ico:"📦",val:`${modules.length} Module${modules.length!==1?"s":""}`},{ico:"📄",val:`${totalChs} Chapter${totalChs!==1?"s":""}`},{ico:"🎓",val:"Certificate"}].map((s,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"rgba(255,255,255,0.7)", fontWeight:500 }}><span>{s.ico}</span><span>{s.val}</span></div>
            ))}
          </div>
          <button onClick={onEnter}
            style={{ padding:"13px 34px", borderRadius:12, border:"none", background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", fontSize:13.5, fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:10, fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:"0 8px 32px rgba(124,58,237,0.5)", transition:"transform .15s,box-shadow .15s" }}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-2px)";(e.currentTarget as HTMLElement).style.boxShadow="0 12px 40px rgba(124,58,237,0.6)";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform="none";(e.currentTarget as HTMLElement).style.boxShadow="0 8px 32px rgba(124,58,237,0.5)";}}>
            {completedCount > 0 ? "▶ Continue Learning" : "▶ Start Learning"}
          </button>
        </div>
      </div>
      <div className="cv2-scroll" style={{ flex:1, overflowY:"auto", padding:"24px 40px 32px" }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" as const, color:"#7c65a8", marginBottom:14 }}>Course Modules</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {modules.map((m, mi) => (
            <div key={mi} className="cv2-mod-card" onClick={onEnter}
              style={{ background:"#fff", border:"1px solid rgba(109,40,217,0.09)", borderRadius:14, padding:"15px 18px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 2px 10px rgba(109,40,217,0.05)", animation:`cv2-fadeIn .3s ease ${mi*0.08}s both` }}>
              <div style={{ width:40, height:40, borderRadius:11, background:"linear-gradient(135deg,rgba(124,58,237,0.12),rgba(13,148,136,0.12))", border:"1px solid rgba(109,40,217,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{moduleIcons[mi % moduleIcons.length]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#0f0a2a", marginBottom:3 }}>{m.title}</div>
                <div style={{ fontSize:10.5, color:"#7c65a8" }}>{m.chapters.length} chapter{m.chapters.length!==1?"s":""} · {m.chapters.map(c => typeIcons[c.type]).join(" ")}</div>
              </div>
              <svg width="7" height="13" viewBox="0 0 7 13" fill="none" stroke="#c4bdd8" strokeWidth="1.8"><path d="M1 1l5 5.5L1 12"/></svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Chapter content ──────────────────────────────────────────────────────────
function ChapterContent({ ch, chKey, quizAnswers, setQuizAnswers, quizSubmitted, setQuizSubmitted, onPass, isComplete, isLast, onComplete, onNext }: ContentProps) {
  const isQuizOrAssessment = ch.type === "quiz" || ch.type === "assessment";
  const submitted  = quizSubmitted.has(chKey);
  const questions  = ch.content.questions ?? [];
  const qKey       = (qi: number) => `${chKey}:${qi}`;
  const segments: Segment[] = (ch.content as any).segments ?? [];
  const media      = ch.content.media;
  const vidSrc     = media?.type === "video" ? videoEmbed(media.url) : null;
  const pptSrc     = media?.type === "presentation" ? presentationEmbed(media.url) : null;
  const isDirectVid = media?.type === "video" && /\.(mp4|webm|ogg)(\?|$)/i.test(media.url ?? "");
  const score      = calcQuizScore(questions, quizAnswers, qKey);
  const allAnswered = isAllAnswered(questions, quizAnswers, qKey);

  const submitQuiz = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!allAnswered) return;
    setQuizSubmitted(prev => { const n = new Set(prev); n.add(chKey); return n; });
    onPass(e.currentTarget);
  };

  return (
    <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      {/* Media */}
      {media && media.type !== "none" && media.url?.trim() && (
        <div style={{ marginBottom:24, borderRadius:14, overflow:"hidden", background:"#111", aspectRatio:"16/9", boxShadow:"0 6px 28px rgba(0,0,0,0.18)", animation:"cv2-fadeIn .3s ease" }}>
          {media.type === "video" && isDirectVid
            ? <video src={media.url} controls style={{ width:"100%", height:"100%", display:"block" }} />
            : media.type === "video" && vidSrc
            ? <iframe src={vidSrc} style={{ width:"100%", height:"100%", border:"none", display:"block" }} allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowFullScreen title="Video" />
            : media.type === "presentation" && pptSrc
            ? <iframe src={pptSrc} style={{ width:"100%", height:"100%", border:"none", display:"block" }} allowFullScreen title="Presentation" />
            : <div style={{ width:"100%", height:"100%", minHeight:140, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"#8e7ec0", background:"#f5f3ff" }}>
                <span style={{ fontSize:36 }}>{media.type === "video" ? "🎬" : "📊"}</span>
                <a href={media.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"#7c3aed", textDecoration:"none", fontWeight:600 }}>Open in new tab ↗</a>
              </div>
          }
        </div>
      )}

      {/* Lesson body */}
      {ch.type === "lesson" && ch.content.body && (
        <div className="cv2-lesson-body" style={{ animation:"cv2-fadeIn .25s ease" }} dangerouslySetInnerHTML={{ __html: ch.content.body }} />
      )}
      {ch.type === "lesson" && !ch.content.body && !media?.url?.trim() && (
        <div style={{ padding:"40px 0", textAlign:"center", color:"#c4bdd8", fontSize:13 }}>No content yet for this lesson.</div>
      )}

      {/* Quiz / Assessment */}
      {isQuizOrAssessment && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:"linear-gradient(135deg,#1e1b4b,#4c1d95)", borderRadius:14, padding:"18px 22px", color:"#fff", animation:"cv2-fadeIn .2s ease" }}>
            <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" as const, color:"rgba(255,255,255,0.55)", marginBottom:5 }}>{ch.type === "assessment" ? "Graded Assessment" : "Knowledge Check"}</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700, marginBottom:6 }}>{ch.title}</div>
            <p style={{ fontSize:12, opacity:0.7, margin:0, lineHeight:1.65 }}>{ch.type === "assessment" ? "Score 70% or higher to pass." : "Answer all questions to complete this chapter."}</p>
          </div>
          {submitted && (
            <div style={{ background: score / questions.length >= 0.7 ? "linear-gradient(135deg,#064e3b,#0f766e)" : "linear-gradient(135deg,#1e1b4b,#4c1d95)", borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:14, animation:"cv2-slideDown .4s ease" }}>
              <span style={{ fontSize:34, animation:"cv2-bounce 1s ease-in-out infinite" }}>{score === questions.length ? "🏆" : score / questions.length >= 0.7 ? "⭐" : "📚"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#fff" }}>{score / questions.length >= 0.7 ? "Passed! Well done." : "Keep studying and try again."}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.65)", marginTop:2 }}>{score}/{questions.length} correct · {Math.round(score / questions.length * 100)}%</div>
              </div>
            </div>
          )}
          {questions.map((q, qi) => {
            const chosen = quizAnswers[qKey(qi)], correct = q.ans;
            return (
              <div key={qi} style={{ background:"#fff", border:"1px solid rgba(109,40,217,0.09)", borderRadius:14, padding:"15px 17px", boxShadow:"0 2px 10px rgba(109,40,217,0.05)", animation:`cv2-fadeIn .22s ease ${qi * .06}s both` }}>
                <div style={{ display:"flex", gap:10, marginBottom:13 }}>
                  <div style={{ width:27, height:27, borderRadius:8, background: ch.type === "assessment" ? "#fef3c7" : "#ede9fe", color: ch.type === "assessment" ? "#b45309" : "#7c3aed", fontSize:10.5, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{qi + 1}</div>
                  <p style={{ margin:0, fontSize:13.5, fontWeight:600, color:"#0f0a2a", lineHeight:1.45 }}>{q.q}</p>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:7, paddingLeft:37 }}>
                  {q.opts.map((opt, oi) => {
                    let bg="#f8f7ff", border="rgba(109,40,217,0.1)", color="#18103a", dot=false, rb="transparent", tag: string|null = null;
                    if (submitted) {
                      if (oi === correct)                      { bg="#d1fae5"; border="rgba(5,150,105,0.5)";   color="#065f46"; rb="#059669"; dot=true; tag="✓"; }
                      else if (oi===chosen && chosen!==correct) { bg="#fee2e2"; border="rgba(220,38,38,0.4)";   color="#991b1b"; rb="#dc2626"; dot=true; tag="✗"; }
                    } else if (chosen === oi)                  { bg="#ede9fe"; border="rgba(109,40,217,0.5)";  color="#5b21b6"; rb="#7c3aed"; dot=true; }
                    return (
                      <div key={oi} className={`cv2-quiz-opt${submitted ? " cv2-submitted" : ""}`}
                        onClick={() => !submitted && setQuizAnswers(prev => ({ ...prev, [qKey(qi)]: oi }))}
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 13px", borderRadius:10, background:bg, border:`1.5px solid ${border}`, cursor:submitted?"default":"pointer", userSelect:"none" as const }}>
                        <div style={{ width:17, height:17, borderRadius:"50%", border:`2px solid ${border}`, background:rb, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .14s" }}>
                          {dot && <div style={{ width:7, height:7, borderRadius:"50%", background:"#fff" }} />}
                        </div>
                        <span style={{ fontSize:13, color, fontWeight:dot?600:400, flex:1 }}>{opt}</span>
                        {submitted && tag && <span style={{ fontSize:11, fontWeight:800, color, marginLeft:"auto", animation:"cv2-popIn .3s ease" }}>{tag}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!submitted && (
            <button className="cv2-submit-btn" onClick={submitQuiz} disabled={!allAnswered}
              style={{ padding:"12px 28px", borderRadius:11, border:"none", background: allAnswered ? "linear-gradient(135deg,#7c3aed,#0d9488)" : "#e2dff5", color: allAnswered ? "#fff" : "#a89dc8", fontSize:13, fontWeight:700, cursor: allAnswered ? "pointer" : "not-allowed", alignSelf:"flex-start" as const, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              Submit {ch.type === "assessment" ? "Assessment" : "Quiz"} →
            </button>
          )}
        </div>
      )}

      {/* Interactive Segments */}
      {segments.length > 0 && (
        <div style={{ marginTop:28, display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ height:1, flex:1, background:"linear-gradient(90deg,rgba(124,58,237,0.15),transparent)" }} />
            <span style={{ fontSize:10, fontWeight:700, color:"#a89dc8", letterSpacing:".1em", textTransform:"uppercase" as const, padding:"0 10px" }}>Interactive Activities</span>
            <div style={{ height:1, flex:1, background:"linear-gradient(90deg,transparent,rgba(124,58,237,0.15))" }} />
          </div>
          {segments.map((seg, si) => (
            <div key={seg.id || si} style={{ animation:`cv2-segIn .35s ease ${si * 0.08}s both` }}>
              <SegmentRenderer seg={seg} />
            </div>
          ))}
        </div>
      )}

      {/* Mark complete */}
      {ch.type === "lesson" && !isComplete && (
        <div style={{ marginTop:28 }}>
          <button className="cv2-complete-btn" onClick={e => onComplete(e.currentTarget)}
            style={{ padding:"12px 28px", borderRadius:11, border:"none", background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:8, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 7.5l3 3 7-7"/></svg>
            Mark as Complete
          </button>
        </div>
      )}
      {ch.type === "lesson" && isComplete && (
        <div style={{ marginTop:24, display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:12, background:"#d1fae5", border:"1px solid rgba(5,150,105,0.2)", animation:"cv2-fadeIn .3s ease" }}>
          <span style={{ fontSize:18 }}>✅</span>
          <span style={{ fontSize:12.5, fontWeight:600, color:"#065f46" }}>Chapter completed!</span>
          {!isLast && (
            <button className="cv2-nav-btn" onClick={onNext}
              style={{ marginLeft:"auto", padding:"7px 16px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", fontSize:11.5, fontWeight:700, cursor:"pointer", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              Next Chapter →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main CourseViewer ────────────────────────────────────────────────────────
export default function CourseViewer({ course, onClose, onProgress }: CourseViewerProps) {
  useInjectStyles("cv2-styles", STYLES);

  const {
    modules, totalChapters,
    view, viewExiting,
    selMod, selCh, expandedMods,
    completed, quizAnswers, setQuizAnswers, quizSubmitted, setQuizSubmitted,
    sparkTrigger, completeBanner, allDoneBanner,
    sidebarOpen, setSidebarOpen,
    contentRef, originElRef,
    mod, ch, chKey, isComplete,
    flatIdx, isFirst, isLast, progressPct,
    enterCourse, backToLanding, markComplete, navigate, toggleModule, selectChapter,
  } = useCourseViewer(course, onClose, onProgress);

  const chMeta = ch ? TM[ch.type] : TM.lesson;

  return (
    <>
      <ParticleCanvas trigger={sparkTrigger} originEl={originElRef} />
      <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", flexDirection:"column", background:"#faf9ff" }}>
        <div className={viewExiting ? "cv2-view-exit" : "cv2-view-enter"} style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

          {view === "landing" && (
            <LandingScreen course={course} modules={modules} completedCount={completed.size} totalChapters={totalChapters} onEnter={enterCourse} onClose={onClose} />
          )}

          {view === "course" && (
            <>
              {/* Header */}
              <div style={{ background:"linear-gradient(135deg,#1e1b4b 0%,#4c1d95 50%,#065f46 100%)", padding:"11px 18px", display:"flex", alignItems:"center", gap:10, flexShrink:0, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)", backgroundSize:"200% 100%", animation:"cv2-shimmer 4s linear infinite", pointerEvents:"none" }} />
                <button className="cv2-back-btn" onClick={backToLanding} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.18)", background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.85)", fontSize:11, fontWeight:600, cursor:"pointer", zIndex:1, flexShrink:0 }}>
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 1L1 4.5L6 8"/></svg>
                  Overview
                </button>
                <button className="cv2-sidebar-toggle" onClick={() => setSidebarOpen(v => !v)} style={{ width:30, height:30, borderRadius:8, background:"rgba(255,255,255,0.12)", border:"none", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1, flexShrink:0 }}>
                  <svg width="13" height="11" viewBox="0 0 13 11" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 1h11M1 5.5h11M1 10h11"/></svg>
                </button>
                <div style={{ width:30, height:30, borderRadius:8, background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, animation:"cv2-bounce 3s ease-in-out infinite", zIndex:1, flexShrink:0 }}>{course.thumbEmoji || "📚"}</div>
                <div style={{ flex:1, minWidth:0, zIndex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{course.title}</div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.5)", marginTop:1 }}>{completed.size}/{totalChapters} chapters · {progressPct}%</div>
                </div>
                <div style={{ flexShrink:0, zIndex:1 }}>
                  <div style={{ width:120, height:5, background:"rgba(255,255,255,0.15)", borderRadius:5, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${progressPct}%`, background:"linear-gradient(90deg,#a78bfa,#34d399)", borderRadius:5, transition:"width .6s ease" }} />
                  </div>
                  <div style={{ fontSize:8.5, color:"rgba(255,255,255,0.4)", textAlign:"right" as const, marginTop:2 }}>{progressPct}%</div>
                </div>
                <button onClick={onClose}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.18)", background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.85)", fontSize:11, fontWeight:600, cursor:"pointer", zIndex:1, flexShrink:0, transition:"all .14s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}>
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 1L3 6l5 5"/></svg>
                  Catalog
                </button>
              </div>

              {allDoneBanner && (
                <div style={{ background:"linear-gradient(135deg,#064e3b,#065f46,#047857)", padding:"10px 22px", display:"flex", alignItems:"center", gap:12, animation:"cv2-slideDown .4s ease", flexShrink:0 }}>
                  <span style={{ fontSize:24, animation:"cv2-spin 2s linear infinite" }}>🏆</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:"#6ee7b7" }}>Course Complete!</div>
                    <div style={{ fontSize:10, color:"#a7f3d0" }}>You've finished all {totalChapters} chapters. Outstanding work!</div>
                  </div>
                  <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
                    {["🎉","⭐","✨","🌟"].map((e, i) => <span key={i} style={{ fontSize:17, animation:`cv2-bounce ${.5 + i * .15}s ease-in-out infinite` }}>{e}</span>)}
                  </div>
                </div>
              )}

              <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
                {/* Sidebar */}
                {sidebarOpen && (
                  <div className="cv2-scroll" style={{ width:238, flexShrink:0, borderRight:"1px solid rgba(124,58,237,0.08)", background:"#f8f7ff", display:"flex", flexDirection:"column", overflow:"hidden", animation:"cv2-slideIn .2s ease" }}>
                    <div style={{ background:"linear-gradient(135deg,#3b0764,#6d28d9 55%,#0f766e)", padding:"12px 14px", flexShrink:0 }}>
                      <div style={{ fontSize:9.5, color:"rgba(255,255,255,.5)", marginBottom:3 }}>{course.cat} · {course.time}</div>
                      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:13.5, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{course.title}</div>
                      <div style={{ background:"rgba(255,255,255,.18)", height:3, borderRadius:3, overflow:"hidden", marginTop:8 }}>
                        <div style={{ height:"100%", width:`${progressPct}%`, background:"#fff", borderRadius:3, transition:"width .6s ease" }} />
                      </div>
                      <div style={{ fontSize:8.5, color:"rgba(255,255,255,.45)", marginTop:2 }}>{progressPct}% · {completed.size}/{totalChapters}</div>
                    </div>
                    <div style={{ flex:1, overflowY:"auto", padding:"8px 6px" }}>
                      {modules.map((m, mi) => {
                        const modDone   = m.chapters.every((_, ci) => completed.has(`${mi}:${ci}`));
                        const modActive = selMod === mi;
                        const expanded  = expandedMods.has(mi);
                        const modChDone = m.chapters.filter((_, ci) => completed.has(`${mi}:${ci}`)).length;
                        const modPct    = m.chapters.length > 0 ? Math.round(modChDone / m.chapters.length * 100) : 0;
                        return (
                          <div key={mi} style={{ marginBottom:3 }}>
                            <div className="cv2-mod-head" onClick={() => toggleModule(mi)}
                              style={{ padding:"8px 9px", borderRadius:10, cursor:"pointer", background: modActive ? "#ede9fe" : modDone ? "#d1fae5" : "transparent", display:"flex", alignItems:"center", gap:7, userSelect:"none" as const, position:"relative", overflow:"hidden" }}>
                              {modPct > 0 && !modDone && <div style={{ position:"absolute", left:0, top:0, bottom:0, width:`${modPct}%`, background:"rgba(124,58,237,0.06)", borderRadius:10 }} />}
                              <div style={{ width:21, height:21, borderRadius:6, background: modDone ? "#059669" : modActive ? "#7c3aed" : "#e2dff5", color:"#fff", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, zIndex:1, transition:"all .2s" }}>{modDone ? "✓" : mi + 1}</div>
                              <span style={{ flex:1, fontSize:11, fontWeight:600, color: modDone ? "#065f46" : modActive ? "#5b21b6" : "#18103a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", zIndex:1 }}>{m.title || `Module ${mi + 1}`}</span>
                              <span style={{ fontSize:9, color: modDone ? "#059669" : "#a89dc8", zIndex:1, flexShrink:0 }}>{modChDone}/{m.chapters.length}</span>
                              <svg width="7" height="5" viewBox="0 0 8 6" fill="none" stroke={modActive ? "#7c3aed" : "#a89dc8"} strokeWidth="1.8" style={{ flexShrink:0, transform: expanded ? "rotate(180deg)" : "none", transition:"transform .2s", zIndex:1 }}><path d="M1 1l3 4 3-4"/></svg>
                            </div>
                            {expanded && (
                              <div style={{ paddingLeft:8, marginTop:2 }}>
                                {m.chapters.map((c, ci) => {
                                  const key    = `${mi}:${ci}`;
                                  const done   = completed.has(key);
                                  const active = selMod === mi && selCh === ci;
                                  const meta   = TM[c.type];
                                  const segCount = ((c.content as any).segments?.length ?? 0);
                                  return (
                                    <div key={ci} className={`cv2-ch-item${active ? " cv2-active" : ""}`}
                                      onClick={() => selectChapter(mi, ci)}
                                      style={{ padding:"6px 8px", borderRadius:8, marginBottom:2, cursor:"pointer", background: active ? "#fff" : "transparent", border:`1px solid ${active ? "rgba(124,58,237,0.16)" : "transparent"}`, boxShadow: active ? "0 1px 8px rgba(124,58,237,0.09)" : "none", display:"flex", alignItems:"center", gap:7 }}>
                                      <div style={{ width:17, height:17, borderRadius:5, background: done ? "#059669" : meta.bg, color: done ? "#fff" : meta.c, fontSize:8, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .2s" }}>{done ? "✓" : ci + 1}</div>
                                      <span style={{ flex:1, fontSize:10.5, fontWeight: active ? 600 : 400, color: active ? "#5b21b6" : done ? "#6b7280" : "#18103a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textDecoration: done ? "line-through" : "none", opacity: done ? 0.65 : 1, transition:"all .2s" }}>{c.title || `Chapter ${ci + 1}`}</span>
                                      {segCount > 0 && <span style={{ fontSize:8, background:"#ede9fe", color:"#7c3aed", borderRadius:4, padding:"1px 4px", fontWeight:700 }}>+{segCount}</span>}
                                      <span style={{ fontSize:10, opacity:.55, flexShrink:0 }}>{meta.ico}</span>
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

                {/* Content area */}
                <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
                  <div style={{ height:3, background:"#e9e6f8", flexShrink:0 }}>
                    <div style={{ height:"100%", width:`${totalChapters > 0 ? ((flatIdx + (isComplete ? 1 : .5)) / totalChapters * 100) : 0}%`, background:"linear-gradient(90deg,#7c3aed,#0d9488)", transition:"width .5s cubic-bezier(.4,0,.2,1)", boxShadow:"0 0 5px rgba(124,58,237,0.4)" }} />
                  </div>
                  {completeBanner && (
                    <div style={{ background:"linear-gradient(90deg,#7c3aed,#0d9488)", padding:"8px 20px", display:"flex", alignItems:"center", gap:10, animation:"cv2-slideDown .35s ease", flexShrink:0 }}>
                      <span style={{ fontSize:16, animation:"cv2-checkPop .4s ease" }}>✅</span>
                      <span style={{ fontSize:11.5, fontWeight:700, color:"#fff" }}>Chapter complete! Keep going 🎯</span>
                    </div>
                  )}
                  {ch && (
                    <div style={{ borderBottom:"1px solid rgba(124,58,237,0.07)", padding:"0 26px", height:46, display:"flex", alignItems:"center", gap:10, flexShrink:0, background:"#fff" }}>
                      <span style={{ padding:"3px 9px", borderRadius:6, background:chMeta.bg, color:chMeta.c, fontSize:9.5, fontWeight:700, letterSpacing:".06em", textTransform:"uppercase" as const }}>{chMeta.ico} {chMeta.lbl}</span>
                      <div style={{ width:1, height:15, background:"rgba(124,58,237,0.1)" }} />
                      <span style={{ fontSize:12.5, fontWeight:600, color:"#0f0a2a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ch.title}</span>
                      {isComplete && <span style={{ padding:"3px 8px", borderRadius:6, background:"#d1fae5", color:"#059669", fontSize:9.5, fontWeight:700, animation:"cv2-popIn .3s ease", flexShrink:0 }}>✓ Done</span>}
                      <div style={{ flex:1 }} />
                      <span style={{ fontSize:9.5, color:"#a89dc8", whiteSpace:"nowrap" }}>{mod.title} · {selCh + 1}/{mod.chapters.length}</span>
                      <div style={{ width:1, height:15, background:"rgba(124,58,237,0.1)" }} />
                      <span style={{ fontSize:9.5, color:"#a89dc8", whiteSpace:"nowrap" }}>{flatIdx + 1}/{totalChapters}</span>
                    </div>
                  )}
                  <div ref={contentRef} className="cv2-scroll" style={{ flex:1, overflowY:"auto", padding:"24px 30px 20px" }}>
                    {ch ? (
                      <>
                        <div style={{ marginBottom:22, animation:"cv2-fadeIn .2s ease" }}>
                          <h2 style={{ fontFamily:"'Playfair Display',serif", margin:0, fontSize:24, fontWeight:800, color:"#0f0a2a", lineHeight:1.2, letterSpacing:"-0.02em" }}>{ch.title || `Chapter ${selCh + 1}`}</h2>
                        </div>
                        <ChapterContent ch={ch} chKey={chKey} quizAnswers={quizAnswers} setQuizAnswers={setQuizAnswers} quizSubmitted={quizSubmitted} setQuizSubmitted={setQuizSubmitted} onPass={el => markComplete(el)} isComplete={isComplete} isLast={isLast} onComplete={markComplete} onNext={() => navigate(1)} />
                        <div style={{ height:40 }} />
                      </>
                    ) : (
                      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#a89dc8", fontSize:13 }}>Select a chapter to begin</div>
                    )}
                  </div>
                  <div style={{ padding:"10px 26px", borderTop:"1px solid rgba(124,58,237,0.07)", display:"flex", alignItems:"center", gap:10, flexShrink:0, background:"#fff" }}>
                    <button className="cv2-nav-btn" onClick={() => navigate(-1)} disabled={isFirst}
                      style={{ padding:"8px 18px", borderRadius:10, border:"1px solid rgba(124,58,237,0.18)", background:"#fff", color: isFirst ? "#d4d0e8" : "#7c3aed", fontSize:12, fontWeight:600, cursor: isFirst ? "default" : "pointer", display:"flex", alignItems:"center", gap:5, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                      ← Previous
                    </button>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <div style={{ fontSize:10, color:"#a89dc8" }}>{flatIdx + 1} of {totalChapters}</div>
                      <div style={{ width:"58%", height:3, background:"#e9e6f8", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${((flatIdx + 1) / totalChapters) * 100}%`, background:"linear-gradient(90deg,#7c3aed,#0d9488)", borderRadius:3, transition:"width .4s ease" }} />
                      </div>
                    </div>
                    <button className="cv2-nav-btn" onClick={() => { if (!isComplete && ch?.type === "lesson") markComplete(); navigate(1); }} disabled={isLast}
                      style={{ padding:"8px 18px", borderRadius:10, border:"none", background: isLast ? "#e2dff5" : "linear-gradient(135deg,#7c3aed,#0d9488)", color: isLast ? "#a89dc8" : "#fff", fontSize:12, fontWeight:700, cursor: isLast ? "default" : "pointer", display:"flex", alignItems:"center", gap:5, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}