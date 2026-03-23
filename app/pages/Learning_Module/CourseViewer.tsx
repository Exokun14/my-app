'use client'

import { useState, useEffect, useRef } from "react";
import type { Course } from "../../Data/types";
import { ACT_META, type Activity } from "./ActivityBuilderPanel";
import AssessmentOverview from "./AssessmentOverview";
import AssessmentResultsPopup from "./AssessmentResultsPopup";
import LoadingPopup from "../../Components/LoadingPopup";
import api from "../../Services/api.service";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CourseViewerProps {
  course: Course;
  onClose: () => void;
  onProgress: (progress: number, timeSpent?: number, assessmentScore?: number) => void;
  toast: (msg: string) => void;
}

interface UnifiedBlock {
  id: string;
  type: "content" | "media" | "activity";
  title?: string;
  body?: string;
  mediaType?: "video" | "presentation";
  mediaUrl?: string;
  activity?: Activity;
}

interface Chapter {
  title: string;
  type: "lesson" | "quiz" | "assessment";
  done: boolean;
  content: {
    title: string;
    type: string;
    body?: string;
    blocks?: UnifiedBlock[];
    questions?: Array<{ q: string; opts: string[]; ans: number }>;
    media: { type: string; url: string };
  };
}

interface Module {
  title: string;
  done: boolean;
  chapters: Chapter[];
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function videoEmbed(url: string): string | null {
  if (!url?.trim()) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  return url;
}

function presentationEmbed(url: string): string | null {
  if (!url?.trim()) return null;
  const gs = url.match(/docs\.google\.com\/presentation\/d\/([^/?]+)/);
  if (gs) return `https://docs.google.com/presentation/d/${gs[1]}/embed?start=false&loop=false`;
  return url;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const STYLES = `
@keyframes cvSlideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
@keyframes cvFadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes cvPulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
@keyframes cvPopIn {
  0%   { opacity:0; transform:scale(0.86) translateY(20px); }
  60%  { transform:scale(1.03) translateY(-3px); }
  100% { opacity:1; transform:scale(1) translateY(0); }
}

.cv-page {
  position:fixed; inset:0; z-index:1000;
  background:var(--bg,#f8f7ff);
  display:flex; flex-direction:column;
  animation:cvFadeIn 0.3s ease both;
}

/* Header */
.cv-header {
  height:64px; flex-shrink:0;
  background:var(--surface,#fff);
  border-bottom:1px solid var(--border,rgba(124,58,237,0.1));
  display:flex; align-items:center; padding:0 24px; gap:16px;
  box-shadow:0 1px 6px rgba(124,58,237,0.04);
}
.cv-header-back {
  width:36px; height:36px; border-radius:10px;
  background:transparent;
  border:1.5px solid var(--border,rgba(124,58,237,0.15));
  color:var(--t2,#4a3870);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all 0.15s;
  font-size:16px;
}
.cv-header-back:hover {
  background:rgba(124,58,237,0.06);
  border-color:rgba(124,58,237,0.25);
  transform:translateX(-2px);
}
.cv-header-title {
  font-size:16px; font-weight:800;
  color:var(--t1,#18103a); letter-spacing:-0.02em;
}
.cv-header-progress {
  margin-left:auto;
  display:flex; flex-direction:column; gap:4px; width:160px;
}
.cv-progress-bar {
  height:5px; border-radius:5px;
  background:var(--border,rgba(124,58,237,0.1));
  overflow:hidden;
}
.cv-progress-fill {
  height:100%; border-radius:5px;
  background:linear-gradient(90deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  transition:width 0.5s cubic-bezier(0.16,1,0.3,1);
}
.cv-progress-text {
  font-size:10px; font-weight:600;
  color:var(--t3,#a89dc8); text-align:right;
}

/* Body */
.cv-body { flex:1; display:flex; overflow:hidden; }

/* Sidebar */
.cv-sidebar {
  width:320px; flex-shrink:0;
  background:var(--surface,#fff);
  border-right:1px solid var(--border,rgba(124,58,237,0.1));
  display:flex; flex-direction:column;
}
.cv-sidebar-header {
  padding:18px 20px;
  border-bottom:1px solid var(--border,rgba(124,58,237,0.08));
  background:linear-gradient(to bottom,rgba(124,58,237,0.02),transparent);
}
.cv-sidebar-title { font-size:13px; font-weight:700; color:var(--t1,#18103a); margin-bottom:4px; }
.cv-sidebar-subtitle { font-size:11px; color:var(--t3,#a89dc8); }
.cv-sidebar-scroll { flex:1; overflow-y:auto; padding:16px; }

/* Module Card */
.cv-module {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:12px; padding:14px; margin-bottom:12px;
  transition:all 0.15s;
}
.cv-module:hover { border-color:rgba(124,58,237,0.2); transform:translateX(2px); }
.cv-module-header { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.cv-module-num {
  width:28px; height:28px; border-radius:8px;
  background:var(--purple,#7c3aed); color:#fff;
  font-size:12px; font-weight:700;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.cv-module-title { flex:1; font-size:13.5px; font-weight:700; color:var(--t1,#18103a); }

/* Chapter Item */
.cv-chapter {
  display:flex; align-items:center; gap:10px;
  padding:10px 12px; border-radius:9px;
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.08));
  margin-bottom:6px; cursor:pointer; transition:all 0.14s;
}
.cv-chapter:hover { background:#f5f3ff; border-color:rgba(124,58,237,0.18); transform:translateX(3px); }
.cv-chapter.active {
  background:linear-gradient(135deg,rgba(124,58,237,0.08),rgba(13,148,136,0.08));
  border-color:var(--purple,#7c3aed);
  box-shadow:0 2px 8px rgba(124,58,237,0.12);
}
.cv-chapter-icon { width:24px; height:24px; border-radius:7px; font-size:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.cv-chapter-content { flex:1; min-width:0; }
.cv-chapter-title { font-size:12.5px; font-weight:600; color:var(--t1,#18103a); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cv-chapter-meta { font-size:10px; color:var(--t3,#a89dc8); margin-top:2px; }
.cv-chapter-check {
  width:20px; height:20px; border-radius:50%;
  border:2px solid var(--border,rgba(124,58,237,0.2));
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; transition:all 0.2s;
}
.cv-chapter.done .cv-chapter-check { background:var(--teal,#0d9488); border-color:var(--teal,#0d9488); color:#fff; }

/* Main Content */
.cv-main { flex:1; overflow-y:auto; padding:32px; }
.cv-content-wrapper { max-width:800px; margin:0 auto; animation:cvSlideIn 0.35s ease both; }

/* Chapter Header */
.cv-chapter-header {
  display:flex; align-items:flex-start; gap:16px;
  margin-bottom:28px; padding-bottom:20px;
  border-bottom:1px solid var(--border,rgba(124,58,237,0.1));
}
.cv-chapter-header-icon {
  width:52px; height:52px; border-radius:14px; font-size:26px;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
  box-shadow:0 4px 14px rgba(124,58,237,0.15);
}
.cv-chapter-header-content { flex:1; }
.cv-chapter-header-title { font-size:24px; font-weight:800; color:var(--t1,#18103a); letter-spacing:-0.03em; margin-bottom:6px; line-height:1.2; }
.cv-chapter-header-type { font-size:11.5px; font-weight:600; color:var(--t3,#a89dc8); text-transform:uppercase; letter-spacing:0.05em; }

/* Content Block */
.cv-block {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:14px; padding:20px; margin-bottom:20px;
  animation:cvFadeIn 0.4s ease both;
}
.cv-block-title { font-size:16px; font-weight:700; color:var(--t1,#18103a); margin-bottom:12px; display:flex; align-items:center; gap:8px; }
.cv-block-body { font-size:14px; color:var(--t2,#4a3870); line-height:1.7; }

/* Media Block */
.cv-media {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:14px; overflow:hidden; margin-bottom:20px;
  animation:cvFadeIn 0.4s ease both;
}
.cv-media iframe { width:100%; height:450px; border:none; display:block; }

/* Activity Block */
.cv-activity {
  background:var(--surface,#fff);
  border:1.5px solid rgba(124,58,237,0.15);
  border-radius:14px; padding:20px; margin-bottom:20px;
  animation:cvFadeIn 0.4s ease both;
}
.cv-activity-header {
  display:flex; align-items:center; gap:12px;
  padding-bottom:16px; margin-bottom:16px;
  border-bottom:1px solid var(--border,rgba(124,58,237,0.08));
}
.cv-activity-icon { width:44px; height:44px; border-radius:11px; font-size:22px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.cv-activity-title { flex:1; font-size:15px; font-weight:700; color:var(--t1,#18103a); }
.cv-activity-type { font-size:10.5px; font-weight:600; color:var(--t3,#a89dc8); text-transform:uppercase; letter-spacing:0.05em; }

/* Activity: Accordion */
.cv-accordion-item { border:1.5px solid var(--border,rgba(124,58,237,0.1)); border-radius:10px; margin-bottom:10px; overflow:hidden; transition:all 0.15s; }
.cv-accordion-item:hover { border-color:rgba(124,58,237,0.2); }
.cv-accordion-question { padding:14px 16px; display:flex; align-items:center; gap:10px; cursor:pointer; background:var(--bg,#faf9ff); transition:all 0.15s; }
.cv-accordion-question:hover { background:#f5f3ff; }
.cv-accordion-question.open { background:rgba(124,58,237,0.06); }
.cv-accordion-icon { font-size:16px; flex-shrink:0; }
.cv-accordion-text { flex:1; font-size:13.5px; font-weight:600; color:var(--t1,#18103a); }
.cv-accordion-chevron { width:16px; height:16px; flex-shrink:0; transition:transform 0.2s; }
.cv-accordion-chevron.open { transform:rotate(180deg); }
.cv-accordion-answer { padding:0 16px 16px 48px; font-size:13px; color:var(--t2,#4a3870); line-height:1.65; animation:cvFadeIn 0.2s ease; }

/* Activity: Flashcards */
.cv-flashcard-container { padding:20px; background:var(--bg,#faf9ff); border-radius:12px; }
.cv-flashcard { height:200px; margin-bottom:20px; perspective:1000px; cursor:pointer; }
.cv-flashcard-inner { position:relative; width:100%; height:100%; transition:transform 0.6s; transform-style:preserve-3d; }
.cv-flashcard-inner.flipped { transform:rotateY(180deg); }
.cv-flashcard-face { position:absolute; width:100%; height:100%; backface-visibility:hidden; border-radius:12px; padding:24px; display:flex; align-items:center; justify-content:center; text-align:center; box-shadow:0 4px 20px rgba(124,58,237,0.15); }
.cv-flashcard-front { background:linear-gradient(135deg,#7c3aed,#5b21b6); color:#fff; }
.cv-flashcard-back { background:linear-gradient(135deg,#0d9488,#0f766e); color:#fff; transform:rotateY(180deg); }
.cv-flashcard-label { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; opacity:0.7; margin-bottom:12px; }
.cv-flashcard-text { font-size:17px; font-weight:700; line-height:1.4; }
.cv-flashcard-controls { display:flex; align-items:center; gap:12px; }
.cv-flashcard-btn { padding:9px 16px; border-radius:9px; font-size:12px; font-weight:600; cursor:pointer; border:none; transition:all 0.15s; }
.cv-flashcard-btn-prev { background:var(--surface,#fff); border:1.5px solid rgba(124,58,237,0.2); color:var(--purple,#7c3aed); }
.cv-flashcard-btn-prev:hover { background:rgba(124,58,237,0.06); }
.cv-flashcard-btn-next { background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488)); color:#fff; }
.cv-flashcard-btn-next:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(124,58,237,0.3); }
.cv-flashcard-progress { flex:1; height:4px; border-radius:4px; background:rgba(124,58,237,0.1); overflow:hidden; }
.cv-flashcard-progress-bar { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--purple,#7c3aed),var(--teal,#0d9488)); transition:width 0.3s ease; }

/* Activity: Checklist */
.cv-checklist-item { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:9px; background:var(--bg,#faf9ff); border:1.5px solid var(--border,rgba(124,58,237,0.08)); margin-bottom:8px; cursor:pointer; transition:all 0.15s; }
.cv-checklist-item:hover { background:#f5f3ff; border-color:rgba(124,58,237,0.15); }
.cv-checklist-item.checked { background:rgba(13,148,136,0.06); border-color:rgba(13,148,136,0.2); }
.cv-checklist-checkbox { width:22px; height:22px; border-radius:6px; border:2px solid var(--border,rgba(124,58,237,0.25)); flex-shrink:0; display:flex; align-items:center; justify-content:center; transition:all 0.2s; }
.cv-checklist-item.checked .cv-checklist-checkbox { background:var(--teal,#0d9488); border-color:var(--teal,#0d9488); }
.cv-checklist-text { flex:1; font-size:13px; color:var(--t1,#18103a); transition:all 0.2s; }
.cv-checklist-item.checked .cv-checklist-text { color:var(--t3,#a89dc8); text-decoration:line-through; }

/* Quiz */
.cv-quiz {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:14px; padding:24px; margin-bottom:20px;
  animation:cvFadeIn 0.4s ease both;
}
.cv-quiz-question { margin-bottom:28px; }
.cv-quiz-number {
  display:inline-flex; align-items:center; justify-content:center;
  width:28px; height:28px; border-radius:8px;
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; font-size:12px; font-weight:700; margin-bottom:12px;
}
.cv-quiz-text { font-size:15px; font-weight:600; color:var(--t1,#18103a); line-height:1.6; margin-bottom:16px; }
.cv-quiz-option {
  display:flex; align-items:center; gap:12px;
  padding:14px 16px; border-radius:10px;
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  margin-bottom:10px; cursor:pointer; transition:all 0.15s;
}
.cv-quiz-option:hover { background:#f5f3ff; border-color:rgba(124,58,237,0.2); transform:translateX(2px); }
.cv-quiz-option.selected { background:rgba(124,58,237,0.06); border-color:var(--purple,#7c3aed); }
.cv-quiz-option.correct { background:rgba(13,148,136,0.08); border-color:var(--teal,#0d9488); }
.cv-quiz-option.incorrect { background:rgba(220,38,38,0.06); border-color:#dc2626; }
.cv-quiz-radio { width:20px; height:20px; border-radius:50%; border:2px solid var(--border,rgba(124,58,237,0.3)); flex-shrink:0; transition:all 0.2s; position:relative; }
.cv-quiz-option.selected .cv-quiz-radio { border-color:var(--purple,#7c3aed); background:var(--purple,#7c3aed); }
.cv-quiz-option.selected .cv-quiz-radio::after { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:8px; height:8px; border-radius:50%; background:#fff; }
.cv-quiz-option-text { flex:1; font-size:13px; color:var(--t1,#18103a); }

/* ── Quiz Result Popup ──────────────────────────────────────────────────────── */
@keyframes qpOverlayIn { from{opacity:0} to{opacity:1} }
@keyframes qpCardIn {
  0%   { opacity:0; transform:scale(0.82) translateY(32px); }
  55%  { transform:scale(1.04) translateY(-4px); }
  75%  { transform:scale(0.98) translateY(1px); }
  100% { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes qpEmojiIn {
  0%   { opacity:0; transform:scale(0) rotate(-20deg); }
  60%  { transform:scale(1.25) rotate(8deg); }
  80%  { transform:scale(0.92) rotate(-3deg); }
  100% { opacity:1; transform:scale(1) rotate(0deg); }
}
@keyframes qpFadeUp {
  from { opacity:0; transform:translateY(14px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes qpRingFill {
  from { stroke-dasharray: 0 220; }
}
@keyframes qpCountUp {
  from { opacity:0; transform:scale(0.6); }
  to   { opacity:1; transform:scale(1); }
}
@keyframes qpPillIn {
  from { opacity:0; transform:scale(0.7) translateY(6px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes qpShimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes qpPulseRing {
  0%,100% { box-shadow: 0 0 0 0 currentColor; opacity:0.6; }
  50%      { box-shadow: 0 0 0 10px transparent; opacity:1; }
}
@keyframes qpConfettiDrop {
  0%   { transform:translateY(-10px) rotate(0deg) scale(1);   opacity:1; }
  100% { transform:translateY(80px)  rotate(720deg) scale(0); opacity:0; }
}
@keyframes qpBarGrow {
  from { width:0; }
}
@keyframes qpCheckDraw {
  from { stroke-dashoffset: 30; opacity:0; }
  to   { stroke-dashoffset: 0;  opacity:1; }
}
@keyframes qpWobble {
  0%,100% { transform:rotate(0deg); }
  20%     { transform:rotate(-8deg); }
  40%     { transform:rotate(8deg); }
  60%     { transform:rotate(-4deg); }
  80%     { transform:rotate(4deg); }
}

.cv-popup-overlay {
  position:fixed; inset:0; z-index:2000;
  background:rgba(8,4,24,0.58);
  backdrop-filter:blur(12px) saturate(1.4);
  display:flex; align-items:center; justify-content:center;
  padding:20px;
  animation:qpOverlayIn 0.25s ease both;
}
.cv-popup {
  background:#fff;
  border-radius:26px;
  width:min(100%,480px);
  padding:0;
  box-shadow:0 40px 100px rgba(8,4,24,0.28), 0 0 0 1px rgba(124,58,237,0.1);
  animation:qpCardIn 0.5s cubic-bezier(0.16,1,0.3,1) both;
  display:flex; flex-direction:column; align-items:center; text-align:center;
  overflow:hidden; position:relative;
}

/* Coloured top band */
.cv-popup-band {
  width:100%; height:6px; flex-shrink:0;
}

/* Confetti canvas layer */
.cv-popup-confetti {
  position:absolute; inset:0; pointer-events:none; overflow:hidden; border-radius:26px;
}
.cv-confetti-piece {
  position:absolute; top:-10px; width:8px; height:8px; border-radius:2px;
  animation:qpConfettiDrop 1.1s cubic-bezier(0.25,0.46,0.45,0.94) both;
}

.cv-popup-inner { width:100%; padding:28px 32px 32px; display:flex; flex-direction:column; align-items:center; }

/* Emoji */
.cv-popup-emoji {
  font-size:58px; line-height:1; margin-bottom:16px;
  animation:qpEmojiIn 0.55s cubic-bezier(0.16,1,0.3,1) 0.15s both;
  display:inline-block;
}
.cv-popup-emoji.wobble { animation:qpEmojiIn 0.55s cubic-bezier(0.16,1,0.3,1) 0.15s both, qpWobble 0.6s ease 0.75s both; }

/* Title & body */
.cv-popup-title {
  font-size:22px; font-weight:800; letter-spacing:-0.025em; margin-bottom:8px;
  animation:qpFadeUp 0.4s ease 0.3s both;
}
.cv-popup-body {
  font-size:13px; color:var(--t2,#4a3870); line-height:1.68; margin-bottom:24px; max-width:340px;
  animation:qpFadeUp 0.4s ease 0.38s both;
}

/* Score ring */
.cv-popup-score-ring {
  width:110px; height:110px; border-radius:50%;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  position:relative; margin:0 auto 8px;
  animation:qpFadeUp 0.4s ease 0.28s both;
}
.cv-popup-score-ring svg { position:absolute; inset:0; width:100%; height:100%; }
.cv-popup-ring-track { }
.cv-popup-ring-fill { animation:qpRingFill 1.1s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
.cv-popup-score-num {
  font-size:26px; font-weight:900; position:relative; z-index:1; line-height:1;
  animation:qpCountUp 0.4s cubic-bezier(0.16,1,0.3,1) 0.7s both;
  font-variant-numeric:tabular-nums;
}
.cv-popup-score-lbl { font-size:9px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; opacity:.5; position:relative; z-index:1; margin-top:3px; }

/* Progress bar under ring */
.cv-popup-bar-wrap {
  width:160px; height:5px; border-radius:5px; background:rgba(0,0,0,0.06);
  overflow:hidden; margin:12px auto 20px;
  animation:qpFadeUp 0.4s ease 0.5s both;
}
.cv-popup-bar-fill {
  height:100%; border-radius:5px;
  animation:qpBarGrow 1s cubic-bezier(0.16,1,0.3,1) 0.55s both;
}

/* Score breakdown rows */
.cv-popup-breakdown {
  width:100%; display:flex; flex-direction:column; gap:8px;
  margin-bottom:22px;
  animation:qpFadeUp 0.4s ease 0.55s both;
}
.cv-popup-breakdown-row {
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 14px; border-radius:11px; font-size:12.5px; font-weight:600;
}
.cv-popup-breakdown-label { display:flex; align-items:center; gap:7px; }
.cv-popup-breakdown-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.cv-popup-breakdown-val { font-size:13px; font-weight:800; }

/* Pills */
.cv-popup-pills { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-bottom:24px; }
.cv-popup-pill {
  padding:5px 14px; border-radius:20px; font-size:11.5px; font-weight:700;
  animation:qpPillIn 0.35s cubic-bezier(0.16,1,0.3,1) both;
}
.cv-popup-pill:nth-child(1) { animation-delay:0.65s; }
.cv-popup-pill:nth-child(2) { animation-delay:0.72s; }
.cv-popup-pill:nth-child(3) { animation-delay:0.79s; }

/* Actions */
.cv-popup-actions { display:flex; gap:10px; width:100%; animation:qpFadeUp 0.4s ease 0.8s both; }
.cv-popup-btn {
  flex:1; padding:13px 16px; border-radius:13px;
  font-size:13.5px; font-weight:700; cursor:pointer; border:none;
  transition:all .18s; font-family:inherit;
}
.cv-popup-btn-ghost { background:transparent; border:1.5px solid rgba(124,58,237,0.2); color:var(--purple,#7c3aed); }
.cv-popup-btn-ghost:hover { background:rgba(124,58,237,0.06); transform:translateY(-1px); }
.cv-popup-btn-primary {
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; box-shadow:0 2px 10px rgba(124,58,237,0.3);
  background-size:200% auto;
}
.cv-popup-btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(124,58,237,0.42); }
.cv-popup-btn-shimmer {
  background: linear-gradient(90deg, #7c3aed 0%, #0d9488 30%, #a78bfa 50%, #0d9488 70%, #7c3aed 100%);
  background-size:200% auto;
  animation:qpShimmer 2s linear 1.2s 3;
  color:#fff; box-shadow:0 2px 10px rgba(124,58,237,0.3);
}
.cv-popup-btn-shimmer:hover { transform:translateY(-2px); box-shadow:0 8px 22px rgba(124,58,237,0.42); }

/* ── Course Completion Popup ─────────────────────────────────────────────────── */
@keyframes ccOverlayIn  { from{opacity:0} to{opacity:1} }
@keyframes ccCardIn     { 0%{opacity:0;transform:scale(0.78) translateY(40px)} 55%{transform:scale(1.03) translateY(-6px)} 75%{transform:scale(0.98) translateY(2px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
@keyframes ccTrophyBounce {
  0%   { transform:translateY(0) scale(1); }
  15%  { transform:translateY(-18px) scale(1.08); }
  30%  { transform:translateY(0) scale(0.96); }
  45%  { transform:translateY(-10px) scale(1.04); }
  60%  { transform:translateY(0) scale(0.98); }
  75%  { transform:translateY(-5px) scale(1.02); }
  100% { transform:translateY(0) scale(1); }
}
@keyframes ccTrophyFloat{ 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-7px) scale(1.03)} }
@keyframes ccPulseRing  { 0%{transform:scale(0.9);opacity:0.7} 60%{transform:scale(1.18);opacity:0} 100%{transform:scale(1.18);opacity:0} }
@keyframes ccPulseRing2 { 0%{transform:scale(0.9);opacity:0.5} 60%{transform:scale(1.35);opacity:0} 100%{transform:scale(1.35);opacity:0} }
@keyframes ccStatIn     { 0%{opacity:0;transform:translateY(20px) scale(0.88)} 70%{transform:translateY(-3px) scale(1.02)} 100%{opacity:1;transform:translateY(0) scale(1)} }
@keyframes ccModuleIn   { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
@keyframes ccLineGrow   { from{width:0} to{} }
@keyframes ccSparkle    { 0%,100%{opacity:0;transform:scale(0) rotate(0deg)} 50%{opacity:1;transform:scale(1) rotate(180deg)} }
@keyframes ccOrb        { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(12px,-18px) scale(1.08)} 66%{transform:translate(-10px,8px) scale(0.94)} }
@keyframes ccBigConfetti{ 0%{transform:translateY(-20px) rotate(0deg) scale(1);opacity:1} 100%{transform:translateY(110px) rotate(900deg) scale(0.2);opacity:0} }

/* NEW: Score bar + sparks for completion */
@keyframes ccScoreSpark0 { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(-12px,-32px) scale(0)} }
@keyframes ccScoreSpark1 { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(6px,-38px) scale(0)} }
@keyframes ccScoreSpark2 { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(14px,-28px) scale(0)} }
@keyframes ccScoreSpark3 { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(-6px,-42px) scale(0)} }
@keyframes ccScoreSpark4 { 0%{opacity:1;transform:translate(0,0) scale(1)} 100%{opacity:0;transform:translate(10px,-20px) scale(0)} }
@keyframes ccScoreCountIn {
  0% { opacity:0; transform:scale(0.4) translateY(10px); }
  70% { transform:scale(1.1) translateY(-2px); }
  100% { opacity:1; transform:scale(1) translateY(0); }
}
@keyframes ccShimmer {
  0% { left:-100%; }
  100% { left:200%; }
}
@keyframes ccGlowPulse {
  0%,100% { box-shadow: 0 0 20px rgba(124,58,237,0.3), 0 6px 28px rgba(251,191,36,0.25); }
  50%      { box-shadow: 0 0 40px rgba(124,58,237,0.5), 0 8px 40px rgba(251,191,36,0.45); }
}

.cc-overlay {
  position:fixed; inset:0; z-index:3000;
  background:rgba(8,4,24,0.82);
  backdrop-filter:blur(20px) saturate(1.6);
  display:flex; align-items:center; justify-content:center; padding:16px;
  animation:ccOverlayIn 0.3s ease both;
  overflow:hidden;
}

/* Big confetti that falls behind the card, on the overlay itself */
.cc-bg-confetti { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
.cc-bg-piece {
  position:absolute; top:-20px;
  animation:ccBigConfetti linear both;
}

.cc-popup {
  background:#fff; border-radius:24px;
  width:min(100%,480px);
  box-shadow:0 48px 120px rgba(8,4,24,0.4), 0 0 0 1.5px rgba(124,58,237,0.1);
  animation:ccCardIn 0.56s cubic-bezier(0.16,1,0.3,1) 0.05s both;
  overflow:hidden; position:relative;
  max-height:calc(100vh - 32px);
  display:flex; flex-direction:column;
}

/* Gradient top band — taller, more prominent */
.cc-band {
  width:100%; height:5px; flex-shrink:0;
  background:linear-gradient(90deg,#7c3aed 0%,#6366f1 30%,#0d9488 70%,#059669 100%);
  background-size:200% auto;
  animation:qpShimmer 3s linear 0.8s 4;
}

/* Floating colour orbs behind trophy */
.cc-orbs { position:absolute; top:0; left:0; right:0; height:140px; pointer-events:none; overflow:hidden; }
.cc-orb {
  position:absolute; border-radius:50%; filter:blur(32px);
  animation:ccOrb ease-in-out infinite;
}

/* Card confetti (inside card, lighter) */
.cc-confetti { position:absolute; inset:0; pointer-events:none; overflow:hidden; border-radius:28px; }

.cc-inner {
  padding:20px 24px 20px;
  display:flex; flex-direction:column; align-items:center; text-align:center;
  position:relative; z-index:2;
  overflow-y:auto; flex:1;
}

/* Trophy badge with pulsing rings + sparkles */
.cc-badge-wrap {
  position:relative; display:flex; align-items:center; justify-content:center;
  width:80px; height:80px; margin-bottom:12px;
}
.cc-pulse-ring {
  position:absolute; inset:0; border-radius:50%;
  border:2.5px solid rgba(124,58,237,0.35);
  animation:ccPulseRing 1.8s ease-out 0.7s infinite;
}
.cc-pulse-ring-2 {
  position:absolute; inset:0; border-radius:50%;
  border:2px solid rgba(13,148,136,0.25);
  animation:ccPulseRing2 1.8s ease-out 1.1s infinite;
}
.cc-badge {
  width:70px; height:70px; border-radius:50%;
  background:linear-gradient(135deg,rgba(251,191,36,0.18) 0%,rgba(245,158,11,0.12) 100%);
  border:2.5px solid rgba(251,191,36,0.4);
  display:flex; align-items:center; justify-content:center;
  font-size:34px;
  animation:ccTrophyBounce 1s cubic-bezier(0.16,1,0.3,1) 0.18s both,
            ccTrophyFloat 3s ease-in-out 1.4s infinite,
            ccGlowPulse 2.5s ease-in-out 1.4s infinite;
  position:relative; z-index:2;
}

/* Sparkle dots around badge */
.cc-sparkle {
  position:absolute; width:7px; height:7px; border-radius:50%;
  animation:ccSparkle 1.6s ease-in-out infinite;
}

.cc-title {
  font-size:21px; font-weight:900; color:var(--t1,#18103a);
  letter-spacing:-0.03em; margin-bottom:3px; line-height:1.2;
  animation:qpFadeUp 0.45s ease 0.4s both;
}
.cc-subtitle {
  font-size:12.5px; color:var(--t3,#a89dc8); font-weight:600;
  margin-bottom:5px;
  animation:qpFadeUp 0.4s ease 0.48s both;
}
.cc-course-name {
  font-size:11px; color:var(--t3,#a89dc8); font-weight:500;
  margin-bottom:16px; max-width:360px; line-height:1.5;
  padding:4px 12px; border-radius:20px;
  background:rgba(124,58,237,0.06); border:1.5px solid rgba(124,58,237,0.1);
  animation:qpFadeUp 0.4s ease 0.54s both;
}

/* ── Score ring (mirrors quiz popup exactly) ── */
.cc-score-ring-wrap {
  display:flex; flex-direction:column; align-items:center; gap:4px;
  margin-bottom:14px;
  animation:qpFadeUp 0.4s ease 0.44s both;
}
.cc-score-ring {
  width:96px; height:96px; border-radius:50%;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  position:relative;
}
.cc-score-ring svg { position:absolute; inset:0; width:100%; height:100%; }
.cc-ring-track { }
.cc-ring-fill { animation:qpRingFill 1.3s cubic-bezier(0.16,1,0.3,1) 0.5s both; }
.cc-score-num {
  font-size:24px; font-weight:900; position:relative; z-index:1; line-height:1;
  letter-spacing:-0.04em; font-variant-numeric:tabular-nums;
  animation:qpCountUp 0.5s cubic-bezier(0.16,1,0.3,1) 0.9s both;
}
.cc-score-lbl {
  font-size:8px; font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  color:var(--t3,#a89dc8); position:relative; z-index:1; margin-top:2px;
}
.cc-score-sublabel {
  font-size:10px; font-weight:600; color:var(--t3,#a89dc8); letter-spacing:.02em;
}

/* Bar below ring */
.cc-score-bar-wrap {
  width:160px; height:5px; border-radius:6px;
  background:rgba(124,58,237,0.1); overflow:hidden;
  margin:0 auto; animation:qpFadeUp 0.4s ease 0.56s both;
}
.cc-score-bar-fill {
  height:100%; border-radius:6px;
  background:linear-gradient(90deg,#7c3aed,#6366f1,#0d9488);
  box-shadow:0 0 8px rgba(124,58,237,0.4);
  animation:qpBarGrow 1.2s cubic-bezier(0.16,1,0.3,1) 0.6s both;
}

/* Stats — compact */
.cc-stats {
  display:grid; grid-template-columns:repeat(3,1fr); gap:8px;
  width:100%; margin-bottom:14px;
}
.cc-stat {
  padding:11px 8px 10px; border-radius:12px; text-align:center;
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  animation:ccStatIn 0.45s cubic-bezier(0.16,1,0.3,1) both;
  position:relative; overflow:hidden;
}
.cc-stat::before {
  content:''; position:absolute; top:0; left:0; right:0; height:3px;
  border-radius:14px 14px 0 0;
}
.cc-stat:nth-child(1)::before { background:#7c3aed; }
.cc-stat:nth-child(2)::before { background:#0d9488; }
.cc-stat:nth-child(3)::before { background:#d97706; }
.cc-stat:nth-child(1) { animation-delay:0.55s; }
.cc-stat:nth-child(2) { animation-delay:0.67s; }
.cc-stat:nth-child(3) { animation-delay:0.79s; }
.cc-stat-icon { font-size:17px; margin-bottom:5px; }
.cc-stat-val  { font-size:19px; font-weight:900; letter-spacing:-0.03em; line-height:1; margin-bottom:3px; }
.cc-stat-label { font-size:8.5px; font-weight:700; color:var(--t3,#a89dc8); text-transform:uppercase; letter-spacing:.07em; }

/* Modules list */
.cc-modules { width:100%; display:flex; flex-direction:column; gap:5px; margin-bottom:14px; max-height:120px; overflow-y:auto; }
.cc-module-row {
  display:flex; align-items:center; gap:9px;
  padding:7px 12px; border-radius:9px;
  background:rgba(13,148,136,0.04);
  border:1.5px solid rgba(13,148,136,0.12);
  animation:ccModuleIn 0.4s cubic-bezier(0.16,1,0.3,1) both;
  flex-shrink:0;
}
.cc-module-check {
  width:19px; height:19px; border-radius:50%;
  background:var(--teal,#0d9488);
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; font-size:10px; color:#fff;
  box-shadow:0 2px 6px rgba(13,148,136,0.3);
}
.cc-module-name     { flex:1; font-size:11.5px; font-weight:600; color:var(--t1,#18103a); text-align:left; }
.cc-module-chapters { font-size:10.5px; color:var(--t3,#a89dc8); font-weight:500; white-space:nowrap; }

/* CTA */
.cc-cta { display:flex; gap:8px; width:100%; animation:qpFadeUp 0.4s ease 1.1s both; flex-shrink:0; }
.cc-btn {
  flex:1; padding:11px 14px; border-radius:11px;
  font-size:13px; font-weight:800; cursor:pointer; border:none;
  transition:all .2s; font-family:inherit; letter-spacing:-0.01em;
}
.cc-btn-primary {
  background:linear-gradient(90deg,#7c3aed 0%,#6366f1 35%,#0d9488 70%,#059669 100%);
  background-size:200% auto; color:#fff;
  box-shadow:0 4px 18px rgba(124,58,237,0.38);
  animation:qpShimmer 2.8s linear 1.5s 3;
}
.cc-btn-primary:hover { transform:translateY(-3px); box-shadow:0 10px 32px rgba(124,58,237,0.48); }
.cc-btn-primary:active { transform:translateY(-1px); }


/* Footer Actions */
.cv-footer {
  padding:20px 32px;
  background:var(--surface,#fff);
  border-top:1px solid var(--border,rgba(124,58,237,0.1));
  display:flex; align-items:center; gap:12px;
  box-shadow:0 -1px 6px rgba(124,58,237,0.04);
}
.cv-footer-info { flex:1; font-size:11px; color:var(--t3,#a89dc8); font-weight:500; }
.cv-btn { display:inline-flex; align-items:center; gap:8px; padding:10px 18px; border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all 0.15s; }
.cv-btn-secondary { background:transparent; border:1.5px solid var(--border,rgba(124,58,237,0.15)); color:var(--t2,#4a3870); }
.cv-btn-secondary:hover { background:rgba(124,58,237,0.06); border-color:rgba(124,58,237,0.25); }
.cv-btn-primary { background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488)); color:#fff; border:none; box-shadow:0 2px 8px rgba(124,58,237,0.25); }
.cv-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(124,58,237,0.35); }
.cv-btn-primary:active { transform:translateY(0); }
.cv-btn:disabled { opacity:0.5; cursor:not-allowed; }
.cv-btn:disabled:hover { transform:none; }
`;

// ─── Quiz Result Popup ────────────────────────────────────────────────────────
interface QuizPopupProps {
  passed: boolean;
  exhausted: boolean;
  correctCount: number;
  totalCount: number;
  attemptsUsed: number;
  maxAttempts: number;
  onRetry: () => void;
  onContinue: () => void;
}

// Animated counting number
function CountUp({ target, duration = 900, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const from = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <>{display}{suffix}</>;
}

// Animated SVG ring that draws itself
function AnimatedRing({ pct, color, size = 110, stroke = 8, delay = 400 }: { pct: number; color: string; size?: number; stroke?: number; delay?: number }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx   = size / 2;
  const [drawn, setDrawn] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      let start: number | null = null;
      const duration = 1100;
      const step = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setDrawn(eased * pct);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [pct, delay]);

  const dash = (drawn / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:"rotate(-90deg)", position:"absolute", inset:0 }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={stroke} />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

// Confetti pieces (pass only)
function Confetti() {
  const pieces = useRef(
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: `${8 + (i * 83) % 86}%`,
      delay: `${(i * 0.055).toFixed(2)}s`,
      duration: `${0.85 + (i % 5) * 0.14}s`,
      color: ["#7c3aed","#0d9488","#f59e0b","#3b82f6","#ec4899","#10b981"][i % 6],
      size: `${6 + (i % 4) * 2}px`,
    }))
  );
  return (
    <div className="cv-popup-confetti">
      {pieces.current.map(p => (
        <div key={p.id} className="cv-confetti-piece" style={{
          left: p.left,
          width: p.size, height: p.size,
          background: p.color,
          animationDelay: p.delay,
          animationDuration: p.duration,
          borderRadius: p.id % 3 === 0 ? "50%" : p.id % 3 === 1 ? "2px" : "0",
          transform: `rotate(${p.id * 17}deg)`,
        }} />
      ))}
    </div>
  );
}

function QuizResultPopup({ passed, exhausted, correctCount, totalCount, attemptsUsed, maxAttempts, onRetry, onContinue }: QuizPopupProps) {
  const pct          = Math.round((correctCount / totalCount) * 100);
  const wrongCount   = totalCount - correctCount;
  const attemptsLeft = maxAttempts - attemptsUsed;

  const cfg = passed ? {
    emoji: "🎉", wobble: true,
    title: "Excellent work!", titleColor: "#0d9488",
    body: `You answered all ${totalCount} questions correctly. You're on a roll — keep it up!`,
    ringColor: "#0d9488", ringBg: "rgba(13,148,136,0.06)",
    bandColor: "linear-gradient(90deg,#0d9488,#059669)",
    statusLabel: "✓ Passed", statusBg: "rgba(13,148,136,0.1)", statusColor: "#0d9488",
    btnClass: "cv-popup-btn-shimmer", btnLabel: "Continue →",
  } : exhausted ? {
    emoji: "📘", wobble: false,
    title: "All attempts used", titleColor: "#d97706",
    body: `You've used all ${maxAttempts} attempts. The chapter is marked complete — review the correct answers and carry on.`,
    ringColor: "#d97706", ringBg: "rgba(217,119,6,0.06)",
    bandColor: "linear-gradient(90deg,#d97706,#f59e0b)",
    statusLabel: "Chapter complete", statusBg: "rgba(217,119,6,0.1)", statusColor: "#d97706",
    btnClass: "cv-popup-btn-primary", btnLabel: "Got it, move on →",
  } : {
    emoji: "💡", wobble: false,
    title: "Not quite right", titleColor: "#7c3aed",
    body: `You got ${correctCount} of ${totalCount} correct. Check the highlighted answers and give it another shot.`,
    ringColor: "#7c3aed", ringBg: "rgba(124,58,237,0.06)",
    bandColor: "linear-gradient(90deg,#7c3aed,#6d28d9)",
    statusLabel: `${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`, statusBg: "rgba(124,58,237,0.1)", statusColor: "#7c3aed",
    btnClass: "cv-popup-btn-primary", btnLabel: "",
  };

  return (
    <div className="cv-popup-overlay">
      <div className="cv-popup">
        {passed && <Confetti />}
        <div className="cv-popup-band" style={{ background: cfg.bandColor }} />
        <div className="cv-popup-inner">
          <div className={`cv-popup-emoji${cfg.wobble ? " wobble" : ""}`}>{cfg.emoji}</div>
          <div className="cv-popup-title" style={{ color: cfg.titleColor }}>{cfg.title}</div>
          <div className="cv-popup-body">{cfg.body}</div>
          <div className="cv-popup-score-ring" style={{ background: cfg.ringBg }}>
            <AnimatedRing pct={pct} color={cfg.ringColor} size={110} stroke={8} delay={350} />
            <div className="cv-popup-score-num" style={{ color: cfg.ringColor }}>
              <CountUp target={pct} duration={950} suffix="%" />
            </div>
            <div className="cv-popup-score-lbl">Score</div>
          </div>
          <div className="cv-popup-bar-wrap">
            <div className="cv-popup-bar-fill" style={{
              width: `${pct}%`,
              background: cfg.ringColor === "#0d9488"
                ? "linear-gradient(90deg,#0d9488,#34d399)"
                : cfg.ringColor === "#d97706"
                ? "linear-gradient(90deg,#d97706,#fbbf24)"
                : "linear-gradient(90deg,#7c3aed,#a78bfa)",
            }} />
          </div>
          <div className="cv-popup-breakdown">
            <div className="cv-popup-breakdown-row" style={{ background:"rgba(13,148,136,0.06)" }}>
              <div className="cv-popup-breakdown-label">
                <div className="cv-popup-breakdown-dot" style={{ background:"#0d9488" }} />
                <span style={{ color:"#0d9488", fontSize:12 }}>Correct</span>
              </div>
              <div className="cv-popup-breakdown-val" style={{ color:"#0d9488" }}>
                <CountUp target={correctCount} duration={800} /> <span style={{ opacity:.5, fontWeight:600 }}>/ {totalCount}</span>
              </div>
            </div>
            {wrongCount > 0 && (
              <div className="cv-popup-breakdown-row" style={{ background:"rgba(220,38,38,0.05)" }}>
                <div className="cv-popup-breakdown-label">
                  <div className="cv-popup-breakdown-dot" style={{ background:"#dc2626" }} />
                  <span style={{ color:"#dc2626", fontSize:12 }}>Incorrect</span>
                </div>
                <div className="cv-popup-breakdown-val" style={{ color:"#dc2626" }}>
                  <CountUp target={wrongCount} duration={800} /> <span style={{ opacity:.5, fontWeight:600 }}>/ {totalCount}</span>
                </div>
              </div>
            )}
          </div>
          <div className="cv-popup-pills">
            <span className="cv-popup-pill" style={{ background:"rgba(124,58,237,0.09)", color:"#7c3aed" }}>
              Attempt {attemptsUsed} / {maxAttempts}
            </span>
            <span className="cv-popup-pill" style={{ background: cfg.statusBg, color: cfg.statusColor }}>
              {cfg.statusLabel}
            </span>
          </div>
          <div className="cv-popup-actions">
            {!passed && !exhausted && (
              <button className="cv-popup-btn cv-popup-btn-ghost" onClick={onRetry}>🔄 Try Again</button>
            )}
            {(passed || exhausted) && (
              <button className={`cv-popup-btn ${cfg.btnClass}`} onClick={onContinue}>
                {cfg.btnLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Course Completion Popup ──────────────────────────────────────────────────
interface CompletionPopupProps {
  course: Course;
  modules: Module[];
  totalChapters: number;
  timeSpentMinutes: number;
  onClose: () => void;
}

function CourseCompletionPopup({ course, modules, totalChapters, timeSpentMinutes, onClose }: CompletionPopupProps) {
  const timeStr = timeSpentMinutes >= 60
    ? `${Math.floor(timeSpentMinutes / 60)}h ${timeSpentMinutes % 60}m`
    : timeSpentMinutes > 0 ? `${timeSpentMinutes}m` : "< 1m";

  // Animated count-up for the score number
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const fps = 60;
    const totalFrames = (duration / 1000) * fps;
    const increment = 100 / totalFrames;
    let currentFrame = 0;
    const timer = setInterval(() => {
      currentFrame++;
      const newScore = Math.min(currentFrame * increment, 100);
      setDisplayScore(Math.round(newScore));
      if (currentFrame >= totalFrames) { clearInterval(timer); setDisplayScore(100); }
    }, 1000 / fps);
    return () => clearInterval(timer);
  }, []);

  // Big confetti behind the card
  const bgPieces = useRef(Array.from({ length: 48 }, (_, i) => ({
    id: i,
    left:     `${(i * 73 + 5) % 98}%`,
    size:     `${5 + (i % 6) * 3}px`,
    color:    ["#7c3aed","#0d9488","#f59e0b","#3b82f6","#ec4899","#10b981","#6366f1","#f97316"][i % 8],
    delay:    `${(i * 0.07).toFixed(2)}s`,
    duration: `${1.0 + (i % 7) * 0.18}s`,
    shape:    i % 4,
  })));

  const sparkles = [
    { top:"-6px",  left:"50%",  color:"#f59e0b", delay:"0.9s",  size:8 },
    { top:"20%",   left:"-8px", color:"#7c3aed", delay:"1.1s",  size:6 },
    { top:"20%",   right:"-8px",color:"#0d9488", delay:"1.3s",  size:7 },
    { bottom:"5%", left:"10%",  color:"#f59e0b", delay:"1.05s", size:5 },
    { bottom:"5%", right:"10%", color:"#6366f1", delay:"1.25s", size:6 },
  ] as const;

  return (
    <div className="cc-overlay">
      {/* Big confetti raining behind the card */}
      <div className="cc-bg-confetti">
        {bgPieces.current.map(p => (
          <div key={p.id} className="cc-bg-piece" style={{
            left: p.left,
            width: p.size, height: p.size,
            background: p.color,
            borderRadius: p.shape === 1 ? "50%" : p.shape === 2 ? "2px" : "0",
            transform: p.shape === 2 ? `rotate(45deg)` : `rotate(${p.id * 23}deg)`,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }} />
        ))}
      </div>

      <div className="cc-popup">
        <div className="cc-band" />

        <div className="cc-orbs">
          <div className="cc-orb" style={{ width:160, height:160, top:-40, left:-40, background:"rgba(124,58,237,0.07)", animationDuration:"7s" }} />
          <div className="cc-orb" style={{ width:120, height:120, top:-20, right:-30, background:"rgba(13,148,136,0.07)", animationDuration:"9s", animationDelay:"2s" }} />
          <div className="cc-orb" style={{ width:80,  height:80,  top:60,  right:20,  background:"rgba(245,158,11,0.06)", animationDuration:"6s", animationDelay:"1s" }} />
        </div>

        <Confetti />

        <div className="cc-inner">
          {/* Trophy with pulsing rings + sparkles */}
          <div className="cc-badge-wrap">
            <div className="cc-pulse-ring" />
            <div className="cc-pulse-ring-2" />
            {sparkles.map((s, i) => (
              <div key={i} className="cc-sparkle" style={{
                ...s, width:s.size, height:s.size,
                background: s.color,
                animationDelay: s.delay,
                animationDuration: `${1.4 + i * 0.2}s`,
              }} />
            ))}
            <div className="cc-badge">🏆</div>
          </div>

          <div className="cc-title">Course Complete! 🎉</div>
          <div className="cc-subtitle">Outstanding achievement — you did it!</div>
          <div className="cc-course-name">{course.title}</div>

          {/* ── Score ring (matches quiz popup style) ── */}
          <div className="cc-score-ring-wrap">
            <div className="cc-score-ring">
              <svg viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="ccRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#7c3aed"/>
                    <stop offset="50%" stopColor="#6366f1"/>
                    <stop offset="100%" stopColor="#0d9488"/>
                  </linearGradient>
                </defs>
                <circle className="cc-ring-track" cx="60" cy="60" r="50"
                  fill="none" stroke="rgba(124,58,237,0.1)" strokeWidth="8"/>
                <circle className="cc-ring-fill" cx="60" cy="60" r="50"
                  fill="none" stroke="url(#ccRingGrad)" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="314 314"
                  transform="rotate(-90 60 60)"/>
              </svg>
              <div className="cc-score-num" style={{ color:"#7c3aed" }}>{displayScore}%</div>
              <div className="cc-score-lbl">Complete</div>
            </div>
            <div className="cc-score-sublabel">100% completion achieved 🎯</div>
            <div className="cc-score-bar-wrap">
              <div className="cc-score-bar-fill" style={{ width:"100%" }} />
            </div>
          </div>

          {/* Stats */}
          <div className="cc-stats">
            <div className="cc-stat">
              <div className="cc-stat-icon">📚</div>
              <div className="cc-stat-val" style={{ color:"#7c3aed" }}>
                <CountUp target={totalChapters} duration={950} />
              </div>
              <div className="cc-stat-label">Chapters</div>
            </div>
            <div className="cc-stat">
              <div className="cc-stat-icon">🧩</div>
              <div className="cc-stat-val" style={{ color:"#0d9488" }}>
                <CountUp target={modules.length} duration={750} />
              </div>
              <div className="cc-stat-label">Modules</div>
            </div>
            <div className="cc-stat">
              <div className="cc-stat-icon">⏱️</div>
              <div className="cc-stat-val" style={{ color:"#d97706", fontSize:16 }}>{timeStr}</div>
              <div className="cc-stat-label">Time spent</div>
            </div>
          </div>

          {/* Modules — each slides in from left with increasing delay */}
          <div className="cc-modules">
            {modules.map((mod, i) => (
              <div key={i} className="cc-module-row" style={{ animationDelay:`${0.95 + i * 0.1}s` }}>
                <div className="cc-module-check">✓</div>
                <div className="cc-module-name">{mod.title}</div>
                <div className="cc-module-chapters">
                  {mod.chapters.length} chapter{mod.chapters.length !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="cc-cta">
            <button className="cc-btn cc-btn-primary" onClick={onClose}>
              🎓 Back to Courses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CourseViewer({ course, onClose, onProgress, toast }: CourseViewerProps) {
  const modules = (course.modules || []) as Module[];
  const [selMod, setSelMod] = useState(0);
  const [selCh,  setSelCh]  = useState(0);
  const [answers,          setAnswers]          = useState<Record<string, number>>({});
  const [submitted,        setSubmitted]        = useState(false);
  const [openAccordions,   setOpenAccordions]   = useState<Record<string, boolean>>({});
  const [flashcardIndex,   setFlashcardIndex]   = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [checkedItems,     setCheckedItems]     = useState<Record<string, boolean>>({});
  const [scrollProgress,   setScrollProgress]   = useState(0);
  const [videoWatched,     setVideoWatched]     = useState<Record<string, boolean>>({});
  const chapterStartRef = useRef(Date.now());
  const totalTimeRef    = useRef(0);
  const calcTimeSpent = () => {
    const ms = Date.now() - chapterStartRef.current;
    if (ms <= 0 || isNaN(ms)) return 0;
    return Math.max(1, Math.round(ms / 1000));
  };

  const [quizAttempts,    setQuizAttempts]    = useState<Record<string, number>>({});
  const [showQuizPopup,   setShowQuizPopup]   = useState(false);
  const [lastCorrectCount,setLastCorrectCount]= useState(0);

  const [viewedFlashcards,       setViewedFlashcards]       = useState<Record<string, Set<number>>>({});
  const [assessmentAttempts,     setAssessmentAttempts]     = useState<Record<string, number>>({});
  const [assessmentScores,       setAssessmentScores]       = useState<Record<string, number[]>>({});
  const [showAssessmentOverview, setShowAssessmentOverview] = useState(false);
  const [takingAssessment,       setTakingAssessment]       = useState(false);
  const [showAssessmentResults,  setShowAssessmentResults]  = useState(false);
  const [lastAssessmentScore,    setLastAssessmentScore]    = useState(0);
  const [wasAlreadyCompleted,    setWasAlreadyCompleted]    = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [savingMsg, setSavingMsg] = useState("Saving progress...");
  const [showCompletionPopup,    setShowCompletionPopup]    = useState(false);

  const [doneChapters, setDoneChapters] = useState<Set<string>>(() => {
    const s = new Set<string>();
    modules.forEach((mod, mi) =>
      mod.chapters.forEach((ch, ci) => { if (ch.done) s.add(`${mi}-${ci}`); })
    );
    return s;
  });

  const mainRef = useRef<HTMLDivElement>(null);

  const currentModule  = modules[selMod];
  const currentChapter = currentModule?.chapters[selCh];
  const chapterKey     = `${selMod}-${selCh}`;
  const MAX_QUIZ_ATTEMPTS       = 3;
  const MAX_ASSESSMENT_ATTEMPTS = 3;

  const currentAttempts           = quizAttempts[chapterKey] ?? 0;
  const currentAssessmentAttempts = assessmentAttempts[chapterKey] ?? 0;
  const previousAssessmentScores  = assessmentScores[chapterKey] ?? [];

  useEffect(() => {
    setWasAlreadyCompleted(modules.every(mod => mod.chapters.every(ch => ch.done)));
  }, []);

  const areAllPreviousChaptersComplete = () => {
    for (let m = 0; m <= selMod; m++) {
      const mod = modules[m];
      const maxCh = m === selMod ? selCh - 1 : mod.chapters.length - 1;
      for (let c = 0; c <= maxCh; c++) { if (!mod.chapters[c].done) return false; }
    }
    return true;
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!mainRef.current) return;
      const el = mainRef.current;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const progress = scrollHeight > 0 ? (el.scrollTop / scrollHeight) * 100 : 0;
      setScrollProgress(progress);

      if (progress >= 95 && currentChapter && !currentChapter.done) {
        if (currentChapter.type === 'quiz' || currentChapter.type === 'assessment') return;
        const blocks = (currentChapter.content.blocks || []) as UnifiedBlock[];
        const hasVideo    = blocks.some(b => b.type === 'media');
        const hasActivity = blocks.some(b => b.type === 'activity');
        if (hasVideo) { const allWatched = blocks.filter(b => b.type === 'media').every(b => videoWatched[b.id]); if (!allWatched) return; }
        if (hasActivity) {
          const allDone = blocks.filter(b => b.type === 'activity' && b.activity).every(b => {
            const act = b.activity!;
            if (act.type === 'flashcard' && act.cards) { const v = viewedFlashcards[b.id]; return v && v.size >= act.cards.length; }
            if (act.type === 'accordion'  && act.items)    return act.items.every((_,idx) => openAccordions[`${b.id}-${idx}`]);
            if ((act.type === 'checklist' || act.type === 'hotspot') && act.checklist) return act.checklist.every((_,idx) => checkedItems[`${b.id}-${idx}`]);
            return true;
          });
          if (!allDone) return;
        }
        markChapterDone(selMod, selCh);
        const total = modules.reduce((s,m)=>s+m.chapters.length,0);
        const done  = modules.reduce((s,m)=>s+m.chapters.filter(c=>c.done).length,0);
        const elapsed = calcTimeSpent();
        totalTimeRef.current += elapsed;
        chapterStartRef.current = Date.now();
        setSaving(true); setSavingMsg("Saving progress...");
        onProgress(total > 0 ? Math.round((done/total)*100) : 0, elapsed);
        setTimeout(()=>setSaving(false), 1200);
      }
    };
    const el = mainRef.current;
    if (el) { el.addEventListener('scroll', handleScroll); return () => el.removeEventListener('scroll', handleScroll); }
  }, [currentChapter, videoWatched, viewedFlashcards, openAccordions, checkedItems, onProgress]);

  useEffect(() => {
    chapterStartRef.current = Date.now();
    if (mainRef.current) { mainRef.current.scrollTop = 0; setScrollProgress(0); }
    setAnswers({});
    setSubmitted(false);
    setShowQuizPopup(false);
    setFlashcardIndex(0);
    setFlashcardFlipped(false);

    if (currentChapter?.type === 'assessment' && !currentChapter.done) {
      if (!areAllPreviousChaptersComplete()) {
        toast("⚠️ Please complete all previous chapters before taking this assessment.");
        if (selCh > 0) setSelCh(selCh - 1);
        return;
      }
      setShowAssessmentOverview(true);
      setTakingAssessment(false);
    }
  }, [selMod, selCh]);

  const totalChapters     = modules.reduce((s,m)=>s+m.chapters.length,0);
  const completedChapters = doneChapters.size;
  const progressPercent   = totalChapters > 0 ? Math.round((completedChapters/totalChapters)*100) : 0;

  const advanceChapter = () => {
    if (selCh < currentModule.chapters.length - 1) setSelCh(selCh + 1);
    else if (selMod < modules.length - 1) { setSelMod(selMod + 1); setSelCh(0); }
  };

  const markChapterDone = (modIdx: number, chIdx: number) => {
    const key = `${modIdx}-${chIdx}`;
    if (modules[modIdx]?.chapters[chIdx]) {
      modules[modIdx].chapters[chIdx].done = true;
    }
    setDoneChapters(prev => { const n = new Set(prev); n.add(key); return n; });
    const chapterId = (modules[modIdx]?.chapters[chIdx] as any)?.id;
    if (chapterId) {
      api.courses.markChapterDone(chapterId).catch(err =>
        console.error('Failed to persist chapter done:', err)
      );
    }
  };

  const saveProgress = (msg = "Saving progress...", score?: number) => {
    const total = modules.reduce((s,m)=>s+m.chapters.length,0);
    const done  = modules.reduce((s,m)=>s+m.chapters.filter(c=>c.done).length,0);
    const elapsed = calcTimeSpent();
    totalTimeRef.current += elapsed;
    chapterStartRef.current = Date.now();
    setSaving(true); setSavingMsg(msg);
    onProgress(total > 0 ? Math.round((done/total)*100) : 0, elapsed, score);
    setTimeout(()=>setSaving(false), 1200);
  };

  const submitQuiz = () => {
    if (!currentChapter) return;
    const qs = currentChapter.content.questions || [];
    if (currentAttempts >= MAX_QUIZ_ATTEMPTS) return;
    const newAttempts  = currentAttempts + 1;
    const correctCount = qs.filter((q,i) => answers[`q${i}`] === q.ans).length;
    const allCorrect   = correctCount === qs.length;
    const exhausted    = !allCorrect && newAttempts >= MAX_QUIZ_ATTEMPTS;
    setQuizAttempts(prev => ({ ...prev, [chapterKey]: newAttempts }));
    setLastCorrectCount(correctCount);
    setSubmitted(true);
    setShowQuizPopup(true);
    if ((allCorrect || exhausted) && !currentChapter.done) {
      markChapterDone(selMod, selCh);
      saveProgress(allCorrect ? "Saving quiz result..." : "Saving progress...");
    }
  };

  const handleQuizPopupContinue = () => {
    setShowQuizPopup(false);
    const isLast = selMod === modules.length - 1 && selCh === currentModule.chapters.length - 1;
    if (isLast && !wasAlreadyCompleted) {
      const elapsed = calcTimeSpent();
      totalTimeRef.current += elapsed;
      chapterStartRef.current = Date.now();
      setSaving(true); setSavingMsg("Completing course...");
      onProgress(100, totalTimeRef.current);
      setTimeout(() => { setSaving(false); setShowCompletionPopup(true); }, 800);
    } else {
      advanceChapter();
    }
  };
  const handleQuizPopupRetry = () => {
    setShowQuizPopup(false);
    setAnswers({});
    setSubmitted(false);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  const markComplete = () => {
    if (!currentChapter || currentChapter.type === 'quiz' || currentChapter.type === 'assessment') return;
    markChapterDone(selMod, selCh);
    const elapsed = calcTimeSpent();
    totalTimeRef.current += elapsed;
    chapterStartRef.current = Date.now();
    const isLast = selMod === modules.length - 1 && selCh === currentModule.chapters.length - 1;
    if (isLast) {
      setSaving(true); setSavingMsg("Completing course...");
      onProgress(100, totalTimeRef.current);
      setTimeout(() => { setSaving(false); setShowCompletionPopup(true); }, 800);
      return;
    }
    saveProgress("Saving progress...");
    advanceChapter();
  };

  const handleStartAssessment = () => { setShowAssessmentOverview(false); setTakingAssessment(true); setAnswers({}); setSubmitted(false); if (mainRef.current) mainRef.current.scrollTop = 0; };
  const handleCloseAssessmentOverview = () => {
    setShowAssessmentOverview(false);
    if (!takingAssessment) {
      if (selCh > 0) setSelCh(selCh - 1);
      else if (selMod > 0) { setSelMod(selMod - 1); setSelCh(modules[selMod-1].chapters.length-1); }
    }
  };
  const handleAssessmentRetry = () => { setShowAssessmentResults(false); setAnswers({}); setSubmitted(false); if (mainRef.current) mainRef.current.scrollTop = 0; };
  const handleAssessmentContinue = () => {
    setShowAssessmentResults(false);
    const passingScore = (currentChapter.content as any).passingScore || 70;
    const passed = lastAssessmentScore >= passingScore;
    if (passed) {
      const isLast = selMod === modules.length - 1 && selCh === currentModule.chapters.length - 1;
      if (isLast) {
        const elapsed = calcTimeSpent();
        totalTimeRef.current += elapsed;
        chapterStartRef.current = Date.now();
        setSaving(true); setSavingMsg("Completing course...");
        onProgress(100, totalTimeRef.current);
        setTimeout(() => { setSaving(false); setShowCompletionPopup(true); }, 800);
      } else {
        advanceChapter();
      }
      setAnswers({}); setSubmitted(false); setTakingAssessment(false);
    } else {
      setTakingAssessment(false); setShowAssessmentOverview(true); setAnswers({}); setSubmitted(false);
    }
  };
  const handleVideoComplete = (blockId: string) => setVideoWatched(prev => ({ ...prev, [blockId]: true }));

  const submitAssessment = () => {
    const qs           = currentChapter.content.questions || [];
    const passingScore = (currentChapter.content as any).passingScore || 70;
    const correct      = qs.filter((q,i) => answers[`q${i}`] === q.ans).length;
    const scorePct     = Math.round((correct / qs.length) * 100);
    setLastAssessmentScore(scorePct);
    setAssessmentScores(prev => ({ ...prev, [chapterKey]: [...(prev[chapterKey]||[]), scorePct] }));
    const newAttempts = currentAssessmentAttempts + 1;
    setAssessmentAttempts(prev => ({ ...prev, [chapterKey]: newAttempts }));
    if (scorePct >= passingScore) {
      markChapterDone(selMod, selCh);
      saveProgress("Saving assessment result...", scorePct);
    }
    setShowAssessmentResults(true);
  };

  const isLastChapter = selMod === modules.length - 1 && selCh === currentModule.chapters.length - 1;
  const goToChapter = (modIdx: number, chIdx: number) => { setSelMod(modIdx); setSelCh(chIdx); };

  const TM = {
    lesson:     { bg:"#e0f2fe", color:"#0284c7", icon:"📖", label:"Lesson" },
    quiz:       { bg:"#ede9fe", color:"#7c3aed", icon:"❓", label:"Quiz" },
    assessment: { bg:"#fef3c7", color:"#d97706", icon:"📝", label:"Assessment" },
  };

  if (!currentChapter) return null;

  const meta      = TM[currentChapter.type];
  const blocks    = (currentChapter.content.blocks || []) as UnifiedBlock[];
  const questions = currentChapter.content.questions || [];

  const quizAllCorrect = submitted && questions.length > 0 && questions.every((q,i) => answers[`q${i}`] === q.ans);
  const quizExhausted  = submitted && !quizAllCorrect && currentAttempts >= MAX_QUIZ_ATTEMPTS;
  const quizCapReached = currentAttempts >= MAX_QUIZ_ATTEMPTS;

  if (currentChapter.type === 'assessment' && showAssessmentOverview) {
    const passingScore = (currentChapter.content as any).passingScore || 70;
    return (
      <>
        <style>{STYLES}</style>
        <AssessmentOverview
          title={currentChapter.title}
          description={currentChapter.content.body || "Complete this assessment to demonstrate your knowledge."}
          passingScore={passingScore}
          questionCount={questions.length}
          attemptsUsed={currentAssessmentAttempts}
          maxAttempts={MAX_ASSESSMENT_ATTEMPTS}
          previousScores={previousAssessmentScores}
          onStart={handleStartAssessment}
          onClose={handleCloseAssessmentOverview}
        />
        <LoadingPopup visible={saving} message={savingMsg} noBlock />
      </>
    );
  }

  // Course completion popup
  if (showCompletionPopup) {
    return (
      <>
        <style>{STYLES}</style>
        <CourseCompletionPopup
          course={course}
          modules={modules}
          totalChapters={totalChapters}
          timeSpentMinutes={Math.round(totalTimeRef.current / 60)}
          onClose={onClose}
        />
      </>
    );
  }

  return (
    <>
      <style>{STYLES}</style>

      {/* ── Quiz Result Popup ── */}
      {showQuizPopup && currentChapter.type === 'quiz' && (
        <QuizResultPopup
          passed={quizAllCorrect}
          exhausted={quizExhausted}
          correctCount={lastCorrectCount}
          totalCount={questions.length}
          attemptsUsed={currentAttempts}
          maxAttempts={MAX_QUIZ_ATTEMPTS}
          onRetry={handleQuizPopupRetry}
          onContinue={handleQuizPopupContinue}
        />
      )}

      {/* ── Full-screen Assessment Mode ── */}
      {currentChapter.type === 'assessment' && takingAssessment ? (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'var(--bg,#f8f7ff)', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'16px 24px', background:'var(--surface,#fff)', borderBottom:'1px solid var(--border,rgba(124,58,237,0.1))', boxShadow:'0 1px 6px rgba(124,58,237,0.04)', display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:44, height:44, borderRadius:11, background:'linear-gradient(135deg,#7c3aed,#0d9488)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0, boxShadow:'0 2px 10px rgba(124,58,237,0.25)' }}>📝</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--t1,#18103a)', marginBottom:2 }}>{currentChapter.title}</div>
              <div style={{ fontSize:11, color:'var(--t3,#a89dc8)', fontWeight:600 }}>Assessment in Progress • {questions.length} Questions • {(currentChapter.content as any).passingScore || 70}% to Pass</div>
            </div>
            <div style={{ padding:'6px 12px', borderRadius:8, background:'rgba(217,119,6,0.08)', border:'1.5px solid rgba(217,119,6,0.2)', fontSize:11, fontWeight:700, color:'#d97706' }}>
              Attempt {currentAssessmentAttempts + 1} / {MAX_ASSESSMENT_ATTEMPTS}
            </div>
          </div>
          <div style={{ flex:1, overflow:'auto', padding:'32px 20px' }}>
            <div style={{ maxWidth:900, margin:'0 auto' }}>
              {currentChapter.content.body && <div style={{ fontSize:14, color:'var(--t2)', marginBottom:24, lineHeight:1.7 }}>{currentChapter.content.body}</div>}
              {(currentChapter.content as any).passingScore && (
                <div style={{ padding:12, borderRadius:10, background:'rgba(217,119,6,0.08)', border:'1.5px solid rgba(217,119,6,0.2)', marginBottom:20, fontSize:12, color:'#92400e', fontWeight:600 }}>
                  ⚠️ Passing Score: {(currentChapter.content as any).passingScore}% • You must score at least this to pass
                </div>
              )}
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="cv-quiz-question">
                  <div className="cv-quiz-number">{qIdx + 1}</div>
                  <div className="cv-quiz-text">{q.q}</div>
                  {q.opts.map((opt, optIdx) => {
                    const isSelected = answers[`q${qIdx}`] === optIdx;
                    return (
                      <div key={optIdx} className={`cv-quiz-option${isSelected ? ' selected' : ''}`} onClick={() => setAnswers(prev => ({ ...prev, [`q${qIdx}`]: optIdx }))}>
                        <div className="cv-quiz-radio" />
                        <div className="cv-quiz-option-text">{opt}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding:'16px 24px', background:'var(--surface,#fff)', borderTop:'1px solid var(--border,rgba(124,58,237,0.1))', display:'flex', alignItems:'center', gap:12, boxShadow:'0 -1px 6px rgba(124,58,237,0.04)' }}>
            <div style={{ flex:1, fontSize:11, color:'var(--t3,#a89dc8)', fontWeight:500 }}>{Object.keys(answers).length} / {questions.length} answered</div>
            <button
              onClick={submitAssessment}
              disabled={Object.keys(answers).length !== questions.length}
              style={{ padding:'10px 18px', borderRadius:9, border:'none', background: Object.keys(answers).length === questions.length ? 'linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488))' : 'var(--border,rgba(124,58,237,0.2))', color: Object.keys(answers).length === questions.length ? '#fff' : 'var(--t3,#a89dc8)', fontSize:13, fontWeight:600, cursor: Object.keys(answers).length === questions.length ? 'pointer' : 'not-allowed', transition:'all 0.15s', boxShadow: Object.keys(answers).length === questions.length ? '0 2px 8px rgba(124,58,237,0.25)' : 'none' }}
            >
              Submit Assessment
            </button>
          </div>
        </div>

      ) : (
        /* ── Normal Course View ── */
        <div className="cv-page">
          {/* Header */}
          <div className="cv-header">
            <button className="cv-header-back" onClick={onClose}>←</button>
            <div className="cv-header-title">{course.title}</div>
            <div className="cv-header-progress">
              <div className="cv-progress-bar"><div className="cv-progress-fill" style={{ width:`${progressPercent}%` }} /></div>
              <div className="cv-progress-text">{completedChapters} / {totalChapters} completed</div>
            </div>
          </div>

          {/* Body */}
          <div className="cv-body">
            {/* Sidebar */}
            <div className="cv-sidebar">
              <div className="cv-sidebar-header">
                <div className="cv-sidebar-title">Course Content</div>
                <div className="cv-sidebar-subtitle">{modules.length} module{modules.length !== 1 ? 's' : ''} · {totalChapters} chapters</div>
              </div>
              <div className="cv-sidebar-scroll">
                {modules.map((mod, modIdx) => (
                  <div key={modIdx} className="cv-module">
                    <div className="cv-module-header">
                      <div className="cv-module-num">{modIdx + 1}</div>
                      <div className="cv-module-title">{mod.title}</div>
                    </div>
                    {mod.chapters.map((ch, chIdx) => {
                      const chMeta = TM[ch.type];
                      const isActive = modIdx === selMod && chIdx === selCh;
                      const isDone   = doneChapters.has(`${modIdx}-${chIdx}`);
                      return (
                        <div key={chIdx} className={`cv-chapter${isActive ? ' active' : ''}${isDone ? ' done' : ''}`} onClick={() => goToChapter(modIdx, chIdx)}>
                          <div className="cv-chapter-icon" style={{ background:chMeta.bg, color:chMeta.color }}>{chMeta.icon}</div>
                          <div className="cv-chapter-content">
                            <div className="cv-chapter-title">{ch.title}</div>
                            <div className="cv-chapter-meta">{chMeta.label}</div>
                          </div>
                          <div className="cv-chapter-check">{isDone && '✓'}</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content */}
            <div className="cv-main" ref={mainRef}>
              <div className="cv-content-wrapper">
                <div className="cv-chapter-header">
                  <div className="cv-chapter-header-icon" style={{ background:meta.bg, color:meta.color }}>{meta.icon}</div>
                  <div className="cv-chapter-header-content">
                    <div className="cv-chapter-header-title">{currentChapter.title}</div>
                    <div className="cv-chapter-header-type">{meta.label}</div>
                  </div>
                </div>

                {/* Lesson Blocks */}
                {currentChapter.type === 'lesson' && blocks.map((block, idx) => {
                  if (block.type === 'content') return (
                    <div key={block.id} className="cv-block" style={{ animationDelay:`${idx*0.05}s` }}>
                      {block.title && <div className="cv-block-title"><span>📝</span>{block.title}</div>}
                      <div className="cv-block-body">{block.body}</div>
                    </div>
                  );
                  if (block.type === 'media' && block.mediaUrl) {
                    const embedUrl = block.mediaType === 'video' ? videoEmbed(block.mediaUrl) : presentationEmbed(block.mediaUrl);
                    return embedUrl ? (
                      <div key={block.id} className="cv-media" style={{ animationDelay:`${idx*0.05}s` }}>
                        <iframe src={embedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen onLoad={() => setTimeout(() => handleVideoComplete(block.id), 10000)} />
                      </div>
                    ) : null;
                  }
                  if (block.type === 'activity' && block.activity) {
                    const act = block.activity;
                    const actMeta = ACT_META[act.type as keyof typeof ACT_META] ?? { bg:"#f3f4f6", color:"#6b7280", icon:"🧩", label: act.type ?? "Activity" };
                    return (
                      <div key={block.id} className="cv-activity" style={{ animationDelay:`${idx*0.05}s` }}>
                        <div className="cv-activity-header">
                          <div className="cv-activity-icon" style={{ background:actMeta.bg, color:actMeta.color }}>{actMeta.icon}</div>
                          <div style={{ flex:1 }}>
                            <div className="cv-activity-title">{act.title}</div>
                            <div className="cv-activity-type">{actMeta.label}</div>
                          </div>
                        </div>
                        {act.type === 'accordion' && act.items && act.items.map((item, itemIdx) => {
                          const key = `${block.id}-${itemIdx}`; const isOpen = openAccordions[key];
                          return (
                            <div key={itemIdx} className="cv-accordion-item">
                              <div className={`cv-accordion-question${isOpen ? ' open' : ''}`} onClick={() => setOpenAccordions(p => ({ ...p, [key]: !p[key] }))}>
                                <span className="cv-accordion-icon">💭</span>
                                <span className="cv-accordion-text">{item.q}</span>
                                <svg className={`cv-accordion-chevron${isOpen ? ' open' : ''}`} viewBox="0 0 16 16" fill="none" stroke="var(--purple,#7c3aed)" strokeWidth="2" strokeLinecap="round"><path d="M4 6l4 4 4-4"/></svg>
                              </div>
                              {isOpen && <div className="cv-accordion-answer">{item.a}</div>}
                            </div>
                          );
                        })}
                        {act.type === 'flashcard' && act.cards && act.cards.length > 0 && (
                          <div className="cv-flashcard-container">
                            <div className="cv-flashcard" onClick={() => { setFlashcardFlipped(!flashcardFlipped); setViewedFlashcards(prev => { const v = new Set(prev[block.id]||[]); v.add(flashcardIndex); return {...prev,[block.id]:v}; }); }}>
                              <div className={`cv-flashcard-inner${flashcardFlipped ? ' flipped' : ''}`}>
                                <div className="cv-flashcard-face cv-flashcard-front"><div><div className="cv-flashcard-label">Front • Tap to flip</div><div className="cv-flashcard-text">{act.cards[flashcardIndex].front}</div></div></div>
                                <div className="cv-flashcard-face cv-flashcard-back"><div><div className="cv-flashcard-label">Back</div><div className="cv-flashcard-text">{act.cards[flashcardIndex].back}</div></div></div>
                              </div>
                            </div>
                            <div className="cv-flashcard-controls">
                              <button className="cv-flashcard-btn cv-flashcard-btn-prev" onClick={e => { e.stopPropagation(); const n=Math.max(0,flashcardIndex-1); setFlashcardIndex(n); setFlashcardFlipped(false); setViewedFlashcards(prev=>{const v=new Set(prev[block.id]||[]);v.add(n);return{...prev,[block.id]:v};}); }} disabled={flashcardIndex===0}>← Prev</button>
                              <div className="cv-flashcard-progress"><div className="cv-flashcard-progress-bar" style={{ width:`${((flashcardIndex+1)/act.cards.length)*100}%` }} /></div>
                              <button className="cv-flashcard-btn cv-flashcard-btn-next" onClick={e => { e.stopPropagation(); const n=Math.min(act.cards.length-1,flashcardIndex+1); setFlashcardIndex(n); setFlashcardFlipped(false); setViewedFlashcards(prev=>{const v=new Set(prev[block.id]||[]);v.add(n);return{...prev,[block.id]:v};}); }} disabled={flashcardIndex===act.cards.length-1}>Next →</button>
                            </div>
                          </div>
                        )}
                        {(act.type === 'checklist' || act.type === 'hotspot') && act.checklist && act.checklist.map((item, itemIdx) => {
                          const key = `${block.id}-${itemIdx}`; const isChecked = checkedItems[key];
                          return (
                            <div key={itemIdx} className={`cv-checklist-item${isChecked ? ' checked' : ''}`} onClick={() => setCheckedItems(p => ({ ...p, [key]: !p[key] }))}>
                              <div className="cv-checklist-checkbox">{isChecked && <span style={{ color:'#fff', fontSize:14 }}>✓</span>}</div>
                              <div className="cv-checklist-text">{item.text}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                })}

                {/* Quiz */}
                {currentChapter.type === 'quiz' && (
                  <div className="cv-quiz">
                    {currentChapter.content.body && <div style={{ fontSize:14, color:'var(--t2)', marginBottom:24, lineHeight:1.7 }}>{currentChapter.content.body}</div>}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
                      <div style={{ padding:'5px 12px', borderRadius:8, background:'rgba(124,58,237,0.07)', border:'1.5px solid rgba(124,58,237,0.15)', fontSize:11.5, fontWeight:700, color:'#7c3aed' }}>
                        Attempt {Math.min(currentAttempts + (submitted ? 0 : 1), MAX_QUIZ_ATTEMPTS)} / {MAX_QUIZ_ATTEMPTS}
                      </div>
                      {quizCapReached && (
                        <div style={{ padding:'5px 12px', borderRadius:8, background:'rgba(217,119,6,0.07)', border:'1.5px solid rgba(217,119,6,0.15)', fontSize:11.5, fontWeight:700, color:'#d97706' }}>
                          Max attempts reached
                        </div>
                      )}
                    </div>
                    {questions.map((q, qIdx) => (
                      <div key={qIdx} className="cv-quiz-question">
                        <div className="cv-quiz-number">{qIdx + 1}</div>
                        <div className="cv-quiz-text">{q.q}</div>
                        {q.opts.map((opt, optIdx) => {
                          const isSelected = answers[`q${qIdx}`] === optIdx;
                          const isCorrect  = q.ans === optIdx;
                          let cls = 'cv-quiz-option';
                          if (isSelected) cls += ' selected';
                          if (submitted && isSelected && !isCorrect) cls += ' incorrect';
                          if (submitted && isCorrect) cls += ' correct';
                          return (
                            <div key={optIdx} className={cls} onClick={() => !submitted && !quizCapReached && setAnswers(p => ({ ...p, [`q${qIdx}`]: optIdx }))}>
                              <div className="cv-quiz-radio" />
                              <div className="cv-quiz-option-text">{opt}</div>
                              {submitted && isCorrect  && <span style={{ marginLeft:'auto', color:'var(--teal,#0d9488)' }}>✓</span>}
                              {submitted && isSelected && !isCorrect && <span style={{ marginLeft:'auto', color:'#dc2626' }}>✗</span>}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="cv-footer">
            <div className="cv-footer-info">{doneChapters.has(chapterKey) ? '✓ Completed' : `Chapter ${selCh + 1} of ${currentModule.chapters.length}`}</div>
            {selCh > 0 && (
              <button className="cv-btn cv-btn-secondary" onClick={() => setSelCh(selCh - 1)}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1L3 5l4 4"/></svg>
                Previous
              </button>
            )}
            {currentChapter.type === 'quiz' && !submitted && !quizCapReached ? (
              <button className="cv-btn cv-btn-primary" onClick={submitQuiz} disabled={Object.keys(answers).length !== questions.length}>
                Submit Answers
              </button>
            ) : currentChapter.type === 'quiz' && quizAllCorrect ? (
              <>
                <button className="cv-btn cv-btn-secondary" onClick={() => { setAnswers({}); setSubmitted(false); setShowQuizPopup(false); if (mainRef.current) mainRef.current.scrollTop = 0; }}>
                  🔄 Retry
                </button>
                <button className="cv-btn cv-btn-primary" onClick={handleQuizPopupContinue}>
                  {isLastChapter ? 'Complete Course' : 'Next Chapter'}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 1l4 4-4 4"/></svg>
                </button>
              </>
            ) : currentChapter.type === 'quiz' && quizExhausted ? (
              <button className="cv-btn cv-btn-primary" onClick={handleQuizPopupContinue}>
                {isLastChapter ? 'Complete Course' : 'Next Chapter'}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 1l4 4-4 4"/></svg>
              </button>
            ) : currentChapter.type !== 'quiz' && currentChapter.type !== 'assessment' ? (
              <button className="cv-btn cv-btn-primary" onClick={markComplete}>
                {doneChapters.has(chapterKey) ? (isLastChapter ? 'Complete Course' : 'Next Chapter') : (isLastChapter ? 'Complete Course' : 'Mark Complete')}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 1l4 4-4 4"/></svg>
              </button>
            ) : null}
          </div>
        </div>
      )}

      {showAssessmentResults && currentChapter?.type === 'assessment' && (
        <AssessmentResultsPopup
          open={showAssessmentResults}
          score={lastAssessmentScore}
          passingScore={(currentChapter.content as any).passingScore || 70}
          passed={lastAssessmentScore >= ((currentChapter.content as any).passingScore || 70)}
          attemptsRemaining={MAX_ASSESSMENT_ATTEMPTS - currentAssessmentAttempts}
          onRetry={handleAssessmentRetry}
          onContinue={handleAssessmentContinue}
        />
      )}

      <LoadingPopup visible={saving} message={savingMsg} noBlock />
    </>
  );
}
