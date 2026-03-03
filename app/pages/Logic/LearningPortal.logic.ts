import type { ChapterType, LPCourse, FlatChapter, Segment } from "../../Data/types";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const SPARK_COLORS = [
  "#f59e0b", "#7c3aed", "#0d9488", "#ec4899",
  "#3b82f6", "#10b981", "#f97316", "#8b5cf6",
];

export const TYPE_CONFIG: Record<ChapterType, { label: string; color: string; bg: string; ico: string }> = {
  lesson:     { label: "Lesson",     color: "#0284c7", bg: "#e0f2fe", ico: "📖" },
  quiz:       { label: "Quiz",       color: "#7c3aed", bg: "#ede9fe", ico: "❓" },
  assessment: { label: "Assessment", color: "#d97706", bg: "#fef3c7", ico: "📋" },
};

export const PORTAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

.lp-wrap { font-family: 'Plus Jakarta Sans', sans-serif; }
.lp-wrap *, .lp-wrap *::before, .lp-wrap *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Scrollbar */
.lp-wrap * { scrollbar-width: thin; scrollbar-color: rgba(109,40,217,0.12) transparent; }
.lp-wrap ::-webkit-scrollbar { width: 4px; }
.lp-wrap ::-webkit-scrollbar-thumb { background: rgba(109,40,217,0.14); border-radius: 4px; }

/* ── Keyframes ── */
@keyframes lp-fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes lp-slideIn  { from{opacity:0;transform:translateX(-14px)} to{opacity:1;transform:translateX(0)} }
@keyframes lp-slideDown{ from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
@keyframes lp-popIn    { 0%{opacity:0;transform:scale(0.7)} 60%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
@keyframes lp-checkPop { 0%{transform:scale(0) rotate(-20deg)} 70%{transform:scale(1.2) rotate(4deg)} 100%{transform:scale(1) rotate(0)} }
@keyframes lp-spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes lp-toastIn  { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
@keyframes lp-portalIn { 0%{opacity:0;transform:scale(0.97) translateY(14px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
@keyframes lp-portalOut{ 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(0.97) translateY(12px)} }
@keyframes lp-heroIn   { 0%{opacity:0;transform:translateY(22px)} 100%{opacity:1;transform:translateY(0)} }
@keyframes lp-waveBar  { from{transform:scaleX(0);transform-origin:left} to{transform:scaleX(1)} }
@keyframes lp-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }

/* ── View transitions ── */
.lp-portal-enter  { animation: lp-portalIn 0.42s cubic-bezier(0.16,1,0.3,1) both; }
.lp-portal-exit   { animation: lp-portalOut 0.26s ease forwards; }
.lp-hero-enter    { animation: lp-heroIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.06s both; }
.lp-sidebar-enter { animation: lp-slideIn 0.2s cubic-bezier(0.16,1,0.3,1) both; }

/* ── Sidebar module header ── */
.lp-mod-head { transition: background 0.15s ease; }
.lp-mod-head:hover { background: rgba(109,40,217,0.05) !important; }

/* ── Sidebar chapter item ── */
.lp-ch-item { transition: background 0.14s ease, transform 0.14s ease; }
.lp-ch-item:hover:not(.active) { background: rgba(109,40,217,0.04) !important; transform: translateX(2px); }

/* ── Nav prev/next buttons ── */
.lp-nav-btn { transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease; }
.lp-nav-btn:not(:disabled):hover { transform: translateY(-2px); filter: brightness(1.06); }
.lp-nav-btn:not(:disabled):active { transform: scale(0.97); }

/* ── Primary CTA / complete button ── */
.lp-complete-btn { position: relative; overflow: hidden; transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease; }
.lp-complete-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,58,237,0.38); filter: brightness(1.06); }
.lp-complete-btn:active { transform: scale(0.97); }
.lp-complete-btn::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent); transform:translateX(-100%); transition:transform 0.5s ease; }
.lp-complete-btn:hover::after { transform: translateX(100%); }

/* ── Quiz options ── */
.lp-quiz-opt { transition: transform 0.12s ease, box-shadow 0.12s ease; }
.lp-quiz-opt:not(.submitted):hover { transform: translateX(2px); box-shadow: 0 2px 10px rgba(109,40,217,0.09); }

/* ── Back / ghost buttons ── */
.lp-back-btn { transition: background 0.14s ease, transform 0.14s ease; }
.lp-back-btn:hover { background: rgba(109,40,217,0.06) !important; transform: translateX(-1px); }

/* ── Landing module cards ── */
.lp-mod-card { transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; cursor: pointer; }
.lp-mod-card:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(109,40,217,0.11); border-color: rgba(109,40,217,0.2) !important; }

/* ── Sidebar toggle ── */
.lp-sidebar-toggle { transition: background 0.14s ease; }
.lp-sidebar-toggle:hover { background: rgba(109,40,217,0.09) !important; }

/* ── Content segment hover states ── */
.lp-kp-item  { transition: transform 0.14s ease, box-shadow 0.14s ease; cursor: default; }
.lp-kp-item:hover  { transform: translateX(3px); box-shadow: 0 3px 14px rgba(109,40,217,0.08); }

.lp-seg-card { transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease; cursor: default; }
.lp-seg-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(109,40,217,0.09); border-color: rgba(109,40,217,0.2) !important; }

.lp-table-row { transition: background 0.12s ease; }
.lp-table-row:hover { background: #f8f7ff !important; }

/* ── Toast notification ── */
.lp-toast { animation: lp-toastIn 0.28s cubic-bezier(0.16,1,0.3,1) both; }

/* ── Floating emoji (gentle, non-distracting) ── */
.lp-float { animation: lp-float 3s ease-in-out infinite; }
.lp-float-2 { animation: lp-float 3.4s ease-in-out 0.5s infinite; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// PURE UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Build the flat ordered list of all chapters across modules */
export function buildFlatChapters(course: LPCourse): FlatChapter[] {
  return course.modules.flatMap((m, mi) =>
    m.chapters.map((c, ci) => ({ mi, ci, mid: m.id, cid: c.id }))
  );
}

/** Generate the key used to track a chapter's completion / quiz state */
export function getChapterKey(mi: number, ci: number): string {
  return `${mi}:${ci}`;
}

/** Generate the key used to track a single quiz answer */
export function getAnswerKey(chKey: string, qi: number): string {
  return `${chKey}:${qi}`;
}

/** Calculate overall progress percentage */
export function getProgressPct(completedSize: number, totalChapters: number): number {
  return totalChapters > 0 ? Math.round((completedSize / totalChapters) * 100) : 0;
}

/** Calculate raw quiz score for a chapter */
export function calcQuizScore(
  questions: { q: string; opts: string[]; ans: number }[],
  answers:   Record<string, number>,
  chKey:     string
): number {
  return questions.filter((q, qi) => answers[getAnswerKey(chKey, qi)] === q.ans).length;
}

/** Determine whether a quiz has been passed (≥70%) */
export function isQuizPassed(
  seg:      Segment,
  answers:  Record<string, number>,
  chKey:    string
): boolean {
  const questions = seg.questions ?? [];
  if (questions.length === 0) return false;
  return calcQuizScore(questions, answers, chKey) / questions.length >= 0.7;
}

/** Get the option display style state for a quiz option */
export interface QuizOptStyle {
  bg:    string;
  border: string;
  color: string;
  rb:    string;
  dot:   boolean;
  tag:   string | null;
}

export function getQuizOptStyle(
  ans:       number,
  qi:        number,
  oi:        number,
  chosen:    number | undefined,
  submitted: boolean
): QuizOptStyle {
  if (submitted) {
    if (oi === ans)
      return { bg: "#d1fae5", border: "rgba(5,150,105,0.45)",  color: "#065f46", rb: "#059669", dot: true,  tag: "✓" };
    if (oi === chosen && chosen !== ans)
      return { bg: "#fee2e2", border: "rgba(220,38,38,0.35)",  color: "#991b1b", rb: "#dc2626", dot: true,  tag: "✗" };
    return   { bg: "#f8f7ff", border: "rgba(109,40,217,0.09)", color: "#18103a", rb: "transparent", dot: false, tag: null };
  }
  if (chosen === oi)
    return   { bg: "#ede9fe", border: "rgba(109,40,217,0.45)", color: "#5b21b6", rb: "#7c3aed", dot: true,  tag: null };
  return     { bg: "#faf9ff", border: "rgba(109,40,217,0.09)", color: "#18103a", rb: "transparent", dot: false, tag: null };
}
