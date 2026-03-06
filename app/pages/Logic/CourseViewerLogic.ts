import { useState, useEffect, useRef, useCallback } from "react";
import type { Course, Module, ChapterType, ChapterTypeMeta, Particle } from "../../Data/types";

// ─── Constants ────────────────────────────────────────────────────────────────

export const TM: Record<ChapterType, ChapterTypeMeta> = {
  lesson:     { c: "#0284c7", bg: "#e0f2fe", lbl: "Lesson",     ico: "📖" },
  quiz:       { c: "#7c3aed", bg: "#ede9fe", lbl: "Quiz",       ico: "❓" },
  assessment: { c: "#d97706", bg: "#fef3c7", lbl: "Assessment", ico: "📝" },
};

export const SPARK_COLORS = [
  "#f59e0b","#7c3aed","#0d9488","#ec4899",
  "#3b82f6","#10b981","#f97316","#8b5cf6",
];

export const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

@keyframes cv2-fadeIn    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes cv2-slideIn   { from{opacity:0;transform:translateX(-14px)} to{opacity:1;transform:translateX(0)} }
@keyframes cv2-slideDown { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
@keyframes cv2-popIn     { 0%{opacity:0;transform:scale(0.7)} 60%{transform:scale(1.15)} 100%{opacity:1;transform:scale(1)} }
@keyframes cv2-bounce    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
@keyframes cv2-checkPop  { 0%{transform:scale(0) rotate(-20deg)} 70%{transform:scale(1.3) rotate(5deg)} 100%{transform:scale(1) rotate(0)} }
@keyframes cv2-spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes cv2-shimmer   { 0%{background-position:-200% center} 100%{background-position:200% center} }
@keyframes cv2-heroIn    { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
@keyframes cv2-viewIn    { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
@keyframes cv2-viewOut   { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-10px)} }
@keyframes cv2-flip      { 0%{transform:rotateY(0deg)} 100%{transform:rotateY(180deg)} }
@keyframes cv2-flipBack  { 0%{transform:rotateY(180deg)} 100%{transform:rotateY(0deg)} }
@keyframes cv2-segIn     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

.cv2-view-enter { animation: cv2-viewIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
.cv2-view-exit  { animation: cv2-viewOut 0.25s ease forwards; }
.cv2-mod-head:hover { background: rgba(109,40,217,0.06) !important; }
.cv2-ch-item { transition: background .14s, transform .12s, box-shadow .12s; }
.cv2-ch-item:hover:not(.cv2-active) { background: rgba(109,40,217,0.05) !important; transform: translateX(3px); }
.cv2-nav-btn { transition: transform .12s, box-shadow .12s, filter .12s; }
.cv2-nav-btn:not(:disabled):hover { transform: translateY(-2px); filter: brightness(1.06); }
.cv2-nav-btn:not(:disabled):active { transform: scale(0.97); }
.cv2-complete-btn { position:relative; overflow:hidden; transition: transform .15s, box-shadow .15s, filter .15s; }
.cv2-complete-btn:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(124,58,237,0.45); filter:brightness(1.08); }
.cv2-complete-btn:active { transform:scale(0.97); }
.cv2-complete-btn::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent); transform:translateX(-100%); transition:transform .45s; }
.cv2-complete-btn:hover::after { transform:translateX(100%); }
.cv2-quiz-opt { transition: background .12s, border-color .12s, transform .1s, box-shadow .11s; }
.cv2-quiz-opt:hover:not(.cv2-submitted) { transform:translateX(3px); box-shadow:0 2px 12px rgba(109,40,217,0.12); }
.cv2-back-btn { transition: all .14s; }
.cv2-back-btn:hover { background: rgba(109,40,217,0.12) !important; transform: translateX(-2px); }
.cv2-mod-card { transition: transform .18s, box-shadow .18s, border-color .18s; cursor:pointer; }
.cv2-mod-card:hover { transform:translateY(-4px); box-shadow:0 14px 38px rgba(109,40,217,0.14); border-color:rgba(109,40,217,0.22); }
.cv2-submit-btn { transition: transform .15s, box-shadow .15s, filter .15s; }
.cv2-submit-btn:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(13,148,136,0.4); filter:brightness(1.07); }
.cv2-submit-btn:not(:disabled):active { transform:scale(0.97); }
.cv2-sidebar-toggle { transition: all .15s; }
.cv2-sidebar-toggle:hover { background: rgba(109,40,217,0.12) !important; }
.cv2-acc-item { transition: background .14s; }
.cv2-acc-item:hover { background: rgba(109,40,217,0.04) !important; }
.cv2-match-btn { transition: all .14s; }
.cv2-match-btn:hover:not(:disabled) { transform:scale(1.04); }
.cv2-check-item { transition: background .14s, transform .12s; }
.cv2-check-item:hover { background: rgba(21,128,61,0.04) !important; }

.cv2-card-scene { perspective: 800px; }
.cv2-card-inner { position:relative; width:100%; height:100%; transition:transform .55s cubic-bezier(0.4,0.2,0.2,1); transform-style:preserve-3d; }
.cv2-card-inner.flipped { transform:rotateY(180deg); }
.cv2-card-face { position:absolute; inset:0; backface-visibility:hidden; -webkit-backface-visibility:hidden; border-radius:14px; display:flex; align-items:center; justify-content:center; padding:20px; }
.cv2-card-back { transform:rotateY(180deg); }

.cv2-scroll { scrollbar-width:thin; scrollbar-color:rgba(109,40,217,0.15) transparent; }
.cv2-scroll::-webkit-scrollbar { width:4px; }
.cv2-scroll::-webkit-scrollbar-thumb { background:rgba(109,40,217,0.18); border-radius:4px; }

.cv2-lesson-body .info-box { background:#eff6ff; border:1px solid rgba(59,130,246,0.25); border-radius:10px; padding:11px 15px; margin:12px 0; font-size:13px; line-height:1.6; color:#1e3a5f; }
.cv2-lesson-body h3 { font-family:'Playfair Display',serif; font-size:18px; color:#0f0a2a; margin:18px 0 8px; }
.cv2-lesson-body ul { padding-left:20px; margin:6px 0 10px; }
.cv2-lesson-body li { margin-bottom:5px; font-size:13.5px; line-height:1.7; color:#2d1f5e; }
.cv2-lesson-body p  { font-size:13.5px; line-height:1.82; color:#1e1b4b; margin:0 0 10px; }
.cv2-lesson-body strong { color:#0f0a2a; }
`;

// ─── Pure functions ───────────────────────────────────────────────────────────

export function videoEmbed(url: string): string | null {
  if (!url?.trim()) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  const gd = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return url;
  return null;
}

export function presentationEmbed(url: string): string | null {
  if (!url?.trim()) return null;
  const gs = url.match(/docs\.google\.com\/presentation\/d\/([^/?]+)/);
  if (gs) return `https://docs.google.com/presentation/d/${gs[1]}/embed?start=false&loop=false`;
  const gd = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  if (url.includes("onedrive.live") || url.includes("sharepoint.com"))
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  return null;
}

export function calcQuizScore(
  questions: { ans: number }[],
  quizAnswers: Record<string, number>,
  qKey: (qi: number) => string
): number {
  return questions.filter((q, qi) => quizAnswers[qKey(qi)] === q.ans).length;
}

export function isAllAnswered(
  questions: unknown[],
  quizAnswers: Record<string, number>,
  qKey: (qi: number) => string
): boolean {
  return questions.every((_, qi) => quizAnswers[qKey(qi)] !== undefined);
}

export function checkFillBlank(
  inputs: string[],
  qs: { blanks: string[] }[],
  qi: number
): boolean {
  const val = inputs[qi]?.trim().toLowerCase();
  return qs[qi]?.blanks?.some(b => b.trim().toLowerCase() === val) ?? false;
}

export function matchingBtnStyle(
  side: "left" | "right",
  idx: number,
  selected: { side: "left" | "right"; idx: number } | null,
  matched: [number, number][],
  wrong: [number, number] | null
): React.CSSProperties {
  const isLeft  = side === "left";
  const isMatch = isLeft ? matched.some(([l]) => l === idx) : matched.some(([, r]) => r === idx);
  const isSel   = selected?.side === side && selected?.idx === idx;
  const isWrong = wrong && ((isLeft && wrong[0] === idx) || (!isLeft && wrong[1] === idx));
  return {
    padding: "9px 14px", borderRadius: 10,
    border: `2px solid ${isMatch ? "rgba(21,128,61,0.4)" : isWrong ? "rgba(220,38,38,0.5)" : isSel ? "rgba(124,58,237,0.5)" : "rgba(109,40,217,0.12)"}`,
    background: isMatch ? "#dcfce7" : isWrong ? "#fee2e2" : isSel ? "#ede9fe" : "#fff",
    color:      isMatch ? "#15803d" : isWrong ? "#dc2626" : isSel ? "#6d28d9" : "#18103a",
    fontSize: 12.5, fontWeight: 600, cursor: isMatch ? "default" : "pointer",
    textAlign: "left" as const, opacity: isMatch ? 0.7 : 1, transition: "all .15s",
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useInjectStyles(id: string, css: string) {
  useEffect(() => {
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id; el.textContent = css;
    document.head.appendChild(el);
  }, []);
}

export function useAccordion() {
  const [open, setOpen] = useState<number | null>(null);
  const toggle = (i: number) => setOpen(prev => prev === i ? null : i);
  return { open, toggle };
}

export function useFlashcards(count: number) {
  const [cur,     setCur]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  const flip = () => setFlipped(v => !v);
  const next = () => { setFlipped(false); setTimeout(() => setCur(i => (i + 1) % count), 150); };
  const prev = () => { setFlipped(false); setTimeout(() => setCur(i => (i - 1 + count) % count), 150); };
  return { cur, flipped, flip, next, prev };
}

export function useFillBlank(count: number) {
  const [inputs,    setInputs]    = useState<string[]>(Array(count).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const allFilled   = inputs.every(v => v.trim() !== "");
  const updateInput = (qi: number, value: string) =>
    setInputs(prev => { const u = [...prev]; u[qi] = value; return u; });
  const submit = () => setSubmitted(true);
  const reset  = () => { setInputs(Array(count).fill("")); setSubmitted(false); };
  return { inputs, submitted, allFilled, updateInput, submit, reset };
}

export function useChecklist(count: number) {
  const [checked, setChecked] = useState<boolean[]>(Array(count).fill(false));
  const doneCount = checked.filter(Boolean).length;
  const toggle    = (i: number) =>
    setChecked(prev => { const u = [...prev]; u[i] = !u[i]; return u; });
  return { checked, doneCount, toggle };
}

export function useMatchingGame(pairsLength: number) {
  const [selected, setSelected] = useState<{ side: "left" | "right"; idx: number } | null>(null);
  const [matched,  setMatched]  = useState<[number, number][]>([]);
  const [wrong,    setWrong]    = useState<[number, number] | null>(null);

  const rightOrder = useRef(
    [...Array(pairsLength).keys()].sort(() => Math.random() - 0.5)
  ).current;

  const isMatchedLeft  = (i: number) => matched.some(([l])    => l === i);
  const isMatchedRight = (i: number) => matched.some(([, r]) => r === i);
  const allDone        = matched.length === pairsLength;

  const tryMatch = (li: number, ri: number) => {
    if (rightOrder[ri] === li) { setMatched(m => [...m, [li, ri]]); setWrong(null); }
    else { setWrong([li, ri]); setTimeout(() => setWrong(null), 700); }
    setSelected(null);
  };

  const handleLeft = (i: number) => {
    if (isMatchedLeft(i)) return;
    if (selected?.side === "right") tryMatch(i, selected.idx);
    else setSelected({ side: "left", idx: i });
  };

  const handleRight = (i: number) => {
    if (isMatchedRight(i)) return;
    if (selected?.side === "left") tryMatch(selected.idx, i);
    else setSelected({ side: "right", idx: i });
  };

  const reset    = () => { setMatched([]); setSelected(null); setWrong(null); };
  const btnStyle = (side: "left" | "right", idx: number) =>
    matchingBtnStyle(side, idx, selected, matched, wrong);

  return { rightOrder, isMatchedLeft, isMatchedRight, allDone, handleLeft, handleRight, reset, btnStyle };
}

export function useParticleCanvas(
  trigger:  number,
  originEl: React.RefObject<HTMLElement | null>
) {
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
    if (originEl?.current) {
      const r = originEl.current.getBoundingClientRect();
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
          ctx.lineWidth = p.size / 3; ctx.beginPath();
          ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2); ctx.stroke();
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
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return canvasRef;
}

export function useCourseViewer(
  course:     Course,
  onClose:    () => void,
  onProgress: (percent: number, timeSpent: number) => void
) {
  const modules       = (course.modules ?? []) as Module[];
  const totalChapters = modules.reduce((s, m) => s + m.chapters.length, 0);

  // Chapter-level timer: reset on navigation, never NaN
  const chapterStartRef = useRef(Date.now());
  const calcTimeSpent = () => {
    const ms = Date.now() - chapterStartRef.current;
    return (ms > 0 && !isNaN(ms)) ? Math.floor(ms / 60000) : 0;
  };

  const [view,           setView]           = useState<"landing" | "course">("landing");
  const [viewExiting,    setViewExiting]    = useState(false);
  const [selMod,         setSelMod]         = useState(0);
  const [selCh,          setSelCh]          = useState(0);
  const [expandedMods,   setExpandedMods]   = useState<Set<number>>(new Set([0]));
  const [completed,      setCompleted]      = useState<Set<string>>(new Set());
  const [quizAnswers,    setQuizAnswers]    = useState<Record<string, number>>({});
  const [quizSubmitted,  setQuizSubmitted]  = useState<Set<string>>(new Set());
  const [sparkTrigger,   setSparkTrigger]   = useState(0);
  const [completeBanner, setCompleteBanner] = useState(false);
  const [allDoneBanner,  setAllDoneBanner]  = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(true);

  const contentRef  = useRef<HTMLDivElement>(null);
  const originElRef = useRef<HTMLElement | null>(null);

  const mod        = modules[selMod];
  const ch         = mod?.chapters[selCh];
  const chKey      = `${selMod}:${selCh}`;
  const isComplete = completed.has(chKey);

  let flatIdx = 0;
  for (let m = 0; m < selMod; m++) flatIdx += modules[m].chapters.length;
  flatIdx += selCh;

  const isFirst     = flatIdx === 0;
  const isLast      = flatIdx === totalChapters - 1;
  const progressPct = totalChapters > 0 ? Math.round((completed.size / totalChapters) * 100) : 0;

  useEffect(() => {
    if (totalChapters === 0) return;
    onProgress(Math.round((completed.size / totalChapters) * 100), calcTimeSpent());
    if (completed.size === totalChapters) {
      setAllDoneBanner(true);
      setTimeout(() => setAllDoneBanner(false), 4500);
    }
  }, [completed, totalChapters]);

  useEffect(() => {
    chapterStartRef.current = Date.now();
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [selMod, selCh]);

  const enterCourse = () => {
    setViewExiting(true);
    setTimeout(() => { setViewExiting(false); setView("course"); }, 260);
  };

  const backToLanding = () => {
    setViewExiting(true);
    setTimeout(() => { setViewExiting(false); setView("landing"); }, 260);
  };

  const markComplete = (el?: HTMLElement) => {
    if (completed.has(chKey)) return;
    setCompleted(prev => { const n = new Set(prev); n.add(chKey); return n; });
    if (el) originElRef.current = el;
    setSparkTrigger(t => t + 1);
    setCompleteBanner(true);
    setTimeout(() => setCompleteBanner(false), 2300);
  };

  const navigate = (dir: 1 | -1) => {
    let mi = selMod, ci = selCh + dir;
    if (ci < 0) {
      mi = selMod - 1; if (mi < 0) return;
      ci = modules[mi].chapters.length - 1;
    } else if (ci >= modules[selMod].chapters.length) {
      mi = selMod + 1; if (mi >= modules.length) return;
      ci = 0;
    }
    setSelMod(mi); setSelCh(ci);
    setExpandedMods(prev => { const n = new Set(prev); n.add(mi); return n; });
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleModule = (mi: number) =>
    setExpandedMods(prev => { const n = new Set(prev); n.has(mi) ? n.delete(mi) : n.add(mi); return n; });

  const selectChapter = (mi: number, ci: number) => {
    setSelMod(mi); setSelCh(ci);
    setExpandedMods(prev => { const n = new Set(prev); n.add(mi); return n; });
  };

  return {
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
  };
}