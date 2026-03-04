'use client'

import { useState, useEffect, useRef } from "react";
import type { Course } from "../../Data/types";
import { ACT_META, type Activity } from "./ActivityBuilderPanel";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CourseViewerProps {
  course: Course;
  onClose: () => void;
  onProgress: (progress: number, timeSpent?: number) => void;
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
.cv-body {
  flex:1; display:flex; overflow:hidden;
}

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
.cv-sidebar-title {
  font-size:13px; font-weight:700;
  color:var(--t1,#18103a); margin-bottom:4px;
}
.cv-sidebar-subtitle {
  font-size:11px; color:var(--t3,#a89dc8);
}
.cv-sidebar-scroll {
  flex:1; overflow-y:auto; padding:16px;
}

/* Module Card */
.cv-module {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:12px; padding:14px; margin-bottom:12px;
  transition:all 0.15s;
}
.cv-module:hover {
  border-color:rgba(124,58,237,0.2);
  transform:translateX(2px);
}
.cv-module-header {
  display:flex; align-items:center; gap:10px; margin-bottom:10px;
}
.cv-module-num {
  width:28px; height:28px; border-radius:8px;
  background:var(--purple,#7c3aed); color:#fff;
  font-size:12px; font-weight:700;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.cv-module-title {
  flex:1; font-size:13.5px; font-weight:700;
  color:var(--t1,#18103a);
}

/* Chapter Item */
.cv-chapter {
  display:flex; align-items:center; gap:10px;
  padding:10px 12px; border-radius:9px;
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.08));
  margin-bottom:6px; cursor:pointer;
  transition:all 0.14s;
}
.cv-chapter:hover {
  background:#f5f3ff;
  border-color:rgba(124,58,237,0.18);
  transform:translateX(3px);
}
.cv-chapter.active {
  background:linear-gradient(135deg,rgba(124,58,237,0.08),rgba(13,148,136,0.08));
  border-color:var(--purple,#7c3aed);
  box-shadow:0 2px 8px rgba(124,58,237,0.12);
}
.cv-chapter-icon {
  width:24px; height:24px; border-radius:7px;
  font-size:12px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.cv-chapter-content {
  flex:1; min-width:0;
}
.cv-chapter-title {
  font-size:12.5px; font-weight:600;
  color:var(--t1,#18103a);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.cv-chapter-meta {
  font-size:10px; color:var(--t3,#a89dc8);
  margin-top:2px;
}
.cv-chapter-check {
  width:20px; height:20px; border-radius:50%;
  border:2px solid var(--border,rgba(124,58,237,0.2));
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; transition:all 0.2s;
}
.cv-chapter.done .cv-chapter-check {
  background:var(--teal,#0d9488);
  border-color:var(--teal,#0d9488);
  color:#fff;
}

/* Main Content */
.cv-main {
  flex:1; overflow-y:auto; padding:32px;
}
.cv-content-wrapper {
  max-width:800px; margin:0 auto;
  animation:cvSlideIn 0.35s ease both;
}

/* Chapter Header */
.cv-chapter-header {
  display:flex; align-items:flex-start; gap:16px;
  margin-bottom:28px; padding-bottom:20px;
  border-bottom:1px solid var(--border,rgba(124,58,237,0.1));
}
.cv-chapter-header-icon {
  width:52px; height:52px; border-radius:14px;
  font-size:26px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
  box-shadow:0 4px 14px rgba(124,58,237,0.15);
}
.cv-chapter-header-content {
  flex:1;
}
.cv-chapter-header-title {
  font-size:24px; font-weight:800;
  color:var(--t1,#18103a);
  letter-spacing:-0.03em; margin-bottom:6px;
  line-height:1.2;
}
.cv-chapter-header-type {
  font-size:11.5px; font-weight:600;
  color:var(--t3,#a89dc8);
  text-transform:uppercase; letter-spacing:0.05em;
}

/* Content Block */
.cv-block {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:14px; padding:20px; margin-bottom:20px;
  animation:cvFadeIn 0.4s ease both;
}
.cv-block-title {
  font-size:16px; font-weight:700;
  color:var(--t1,#18103a); margin-bottom:12px;
  display:flex; align-items:center; gap:8px;
}
.cv-block-body {
  font-size:14px; color:var(--t2,#4a3870);
  line-height:1.7;
}

/* Media Block */
.cv-media {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:14px; overflow:hidden;
  margin-bottom:20px;
  animation:cvFadeIn 0.4s ease both;
}
.cv-media iframe {
  width:100%; height:450px; border:none; display:block;
}

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
.cv-activity-icon {
  width:44px; height:44px; border-radius:11px;
  font-size:22px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.cv-activity-title {
  flex:1;
  font-size:15px; font-weight:700;
  color:var(--t1,#18103a);
}
.cv-activity-type {
  font-size:10.5px; font-weight:600;
  color:var(--t3,#a89dc8);
  text-transform:uppercase; letter-spacing:0.05em;
}

/* Activity: Accordion */
.cv-accordion-item {
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:10px; margin-bottom:10px;
  overflow:hidden; transition:all 0.15s;
}
.cv-accordion-item:hover {
  border-color:rgba(124,58,237,0.2);
}
.cv-accordion-question {
  padding:14px 16px;
  display:flex; align-items:center; gap:10px;
  cursor:pointer; background:var(--bg,#faf9ff);
  transition:all 0.15s;
}
.cv-accordion-question:hover {
  background:#f5f3ff;
}
.cv-accordion-question.open {
  background:rgba(124,58,237,0.06);
}
.cv-accordion-icon {
  font-size:16px; flex-shrink:0;
}
.cv-accordion-text {
  flex:1; font-size:13.5px; font-weight:600;
  color:var(--t1,#18103a);
}
.cv-accordion-chevron {
  width:16px; height:16px; flex-shrink:0;
  transition:transform 0.2s;
}
.cv-accordion-chevron.open {
  transform:rotate(180deg);
}
.cv-accordion-answer {
  padding:0 16px 16px 48px;
  font-size:13px; color:var(--t2,#4a3870);
  line-height:1.65;
  animation:cvFadeIn 0.2s ease;
}

/* Activity: Flashcards */
.cv-flashcard-container {
  padding:20px;
  background:var(--bg,#faf9ff);
  border-radius:12px;
}
.cv-flashcard {
  height:200px; margin-bottom:20px;
  perspective:1000px; cursor:pointer;
}
.cv-flashcard-inner {
  position:relative; width:100%; height:100%;
  transition:transform 0.6s;
  transform-style:preserve-3d;
}
.cv-flashcard-inner.flipped {
  transform:rotateY(180deg);
}
.cv-flashcard-face {
  position:absolute; width:100%; height:100%;
  backface-visibility:hidden;
  border-radius:12px; padding:24px;
  display:flex; align-items:center; justify-content:center;
  text-align:center;
  box-shadow:0 4px 20px rgba(124,58,237,0.15);
}
.cv-flashcard-front {
  background:linear-gradient(135deg,#7c3aed,#5b21b6);
  color:#fff;
}
.cv-flashcard-back {
  background:linear-gradient(135deg,#0d9488,#0f766e);
  color:#fff;
  transform:rotateY(180deg);
}
.cv-flashcard-label {
  font-size:10px; font-weight:600;
  text-transform:uppercase; letter-spacing:0.1em;
  opacity:0.7; margin-bottom:12px;
}
.cv-flashcard-text {
  font-size:17px; font-weight:700; line-height:1.4;
}
.cv-flashcard-controls {
  display:flex; align-items:center; gap:12px;
}
.cv-flashcard-btn {
  padding:9px 16px; border-radius:9px;
  font-size:12px; font-weight:600;
  cursor:pointer; border:none;
  transition:all 0.15s;
}
.cv-flashcard-btn-prev {
  background:var(--surface,#fff);
  border:1.5px solid rgba(124,58,237,0.2);
  color:var(--purple,#7c3aed);
}
.cv-flashcard-btn-prev:hover {
  background:rgba(124,58,237,0.06);
}
.cv-flashcard-btn-next {
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff;
}
.cv-flashcard-btn-next:hover {
  transform:translateY(-1px);
  box-shadow:0 4px 12px rgba(124,58,237,0.3);
}
.cv-flashcard-progress {
  flex:1; height:4px; border-radius:4px;
  background:rgba(124,58,237,0.1);
  overflow:hidden;
}
.cv-flashcard-progress-bar {
  height:100%; border-radius:4px;
  background:linear-gradient(90deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  transition:width 0.3s ease;
}

/* Activity: Checklist */
.cv-checklist-item {
  display:flex; align-items:center; gap:12px;
  padding:12px 14px; border-radius:9px;
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.08));
  margin-bottom:8px; cursor:pointer;
  transition:all 0.15s;
}
.cv-checklist-item:hover {
  background:#f5f3ff;
  border-color:rgba(124,58,237,0.15);
}
.cv-checklist-item.checked {
  background:rgba(13,148,136,0.06);
  border-color:rgba(13,148,136,0.2);
}
.cv-checklist-checkbox {
  width:22px; height:22px; border-radius:6px;
  border:2px solid var(--border,rgba(124,58,237,0.25));
  flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  transition:all 0.2s;
}
.cv-checklist-item.checked .cv-checklist-checkbox {
  background:var(--teal,#0d9488);
  border-color:var(--teal,#0d9488);
}
.cv-checklist-text {
  flex:1; font-size:13px;
  color:var(--t1,#18103a);
  transition:all 0.2s;
}
.cv-checklist-item.checked .cv-checklist-text {
  color:var(--t3,#a89dc8);
  text-decoration:line-through;
}

/* Quiz */
.cv-quiz {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:14px; padding:24px;
  margin-bottom:20px;
  animation:cvFadeIn 0.4s ease both;
}
.cv-quiz-question {
  margin-bottom:28px;
}
.cv-quiz-number {
  display:inline-flex; align-items:center; justify-content:center;
  width:28px; height:28px; border-radius:8px;
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; font-size:12px; font-weight:700;
  margin-bottom:12px;
}
.cv-quiz-text {
  font-size:15px; font-weight:600;
  color:var(--t1,#18103a); line-height:1.6;
  margin-bottom:16px;
}
.cv-quiz-option {
  display:flex; align-items:center; gap:12px;
  padding:14px 16px; border-radius:10px;
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  margin-bottom:10px; cursor:pointer;
  transition:all 0.15s;
}
.cv-quiz-option:hover {
  background:#f5f3ff;
  border-color:rgba(124,58,237,0.2);
  transform:translateX(2px);
}
.cv-quiz-option.selected {
  background:rgba(124,58,237,0.06);
  border-color:var(--purple,#7c3aed);
}
.cv-quiz-option.correct {
  background:rgba(13,148,136,0.08);
  border-color:var(--teal,#0d9488);
}
.cv-quiz-option.incorrect {
  background:rgba(220,38,38,0.06);
  border-color:#dc2626;
}
.cv-quiz-radio {
  width:20px; height:20px; border-radius:50%;
  border:2px solid var(--border,rgba(124,58,237,0.3));
  flex-shrink:0; transition:all 0.2s;
  position:relative;
}
.cv-quiz-option.selected .cv-quiz-radio {
  border-color:var(--purple,#7c3aed);
  background:var(--purple,#7c3aed);
}
.cv-quiz-option.selected .cv-quiz-radio::after {
  content:'';
  position:absolute;
  top:50%; left:50%;
  transform:translate(-50%,-50%);
  width:8px; height:8px; border-radius:50%;
  background:#fff;
}
.cv-quiz-option-text {
  flex:1; font-size:13px;
  color:var(--t1,#18103a);
}

/* Footer Actions */
.cv-footer {
  padding:20px 32px;
  background:var(--surface,#fff);
  border-top:1px solid var(--border,rgba(124,58,237,0.1));
  display:flex; align-items:center; gap:12px;
  box-shadow:0 -1px 6px rgba(124,58,237,0.04);
}
.cv-footer-info {
  flex:1; font-size:11px;
  color:var(--t3,#a89dc8); font-weight:500;
}
.cv-btn {
  display:inline-flex; align-items:center; gap:8px;
  padding:10px 18px; border-radius:9px;
  font-size:13px; font-weight:600;
  cursor:pointer; border:none;
  transition:all 0.15s;
}
.cv-btn-secondary {
  background:transparent;
  border:1.5px solid var(--border,rgba(124,58,237,0.15));
  color:var(--t2,#4a3870);
}
.cv-btn-secondary:hover {
  background:rgba(124,58,237,0.06);
  border-color:rgba(124,58,237,0.25);
}
.cv-btn-primary {
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; border:none;
  box-shadow:0 2px 8px rgba(124,58,237,0.25);
}
.cv-btn-primary:hover {
  transform:translateY(-1px);
  box-shadow:0 4px 14px rgba(124,58,237,0.35);
}
.cv-btn-primary:active {
  transform:translateY(0);
}
.cv-btn:disabled {
  opacity:0.5; cursor:not-allowed;
}
.cv-btn:disabled:hover {
  transform:none;
}
`;

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CourseViewer({ course, onClose, onProgress }: CourseViewerProps) {
  const modules = (course.modules || []) as Module[];
  const [selMod, setSelMod] = useState(0);
  const [selCh, setSelCh] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [scrollProgress, setScrollProgress] = useState(0);
  const [videoWatched, setVideoWatched] = useState<Record<string, boolean>>({});
  const [startTime] = useState(Date.now());
  const mainRef = useRef<HTMLDivElement>(null);

  const currentModule = modules[selMod];
  const currentChapter = currentModule?.chapters[selCh];

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      if (!mainRef.current) return;
      const element = mainRef.current;
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setScrollProgress(progress);

      // Auto-complete when scrolled to bottom (95% threshold)
      if (progress >= 95 && currentChapter && !currentChapter.done) {
        const blocks = (currentChapter.content.blocks || []) as UnifiedBlock[];
        const hasVideo = blocks.some(b => b.type === 'media');
        
        // If has video, check if video is watched
        if (hasVideo) {
          const allVideosWatched = blocks
            .filter(b => b.type === 'media')
            .every(b => videoWatched[b.id]);
          
          if (allVideosWatched) {
            currentChapter.done = true;
            onProgress(progressPercent);
          }
        } else {
          // No video, just mark complete on scroll
          currentChapter.done = true;
          onProgress(progressPercent);
        }
      }
    };

    const element = mainRef.current;
    if (element) {
      element.addEventListener('scroll', handleScroll);
      return () => element.removeEventListener('scroll', handleScroll);
    }
  }, [currentChapter, videoWatched, onProgress]);

  // Reset scroll when chapter changes
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
      setScrollProgress(0);
    }
  }, [selMod, selCh]);

  const totalChapters = modules.reduce((sum, m) => sum + m.chapters.length, 0);
  const completedChapters = modules.reduce(
    (sum, m) => sum + m.chapters.filter(c => c.done).length,
    0
  );
  const progressPercent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  const markComplete = () => {
    if (!currentChapter) return;
    currentChapter.done = true;
    
    // Calculate time spent (in minutes)
    const timeSpent = Math.floor((Date.now() - startTime) / 60000);
    
    onProgress(progressPercent, timeSpent);
    
    // Move to next chapter
    if (selCh < currentModule.chapters.length - 1) {
      setSelCh(selCh + 1);
    } else if (selMod < modules.length - 1) {
      setSelMod(selMod + 1);
      setSelCh(0);
    }
    
    // Reset state
    setAnswers({});
    setSubmitted(false);
  };

  const handleVideoComplete = (blockId: string) => {
    setVideoWatched(prev => ({ ...prev, [blockId]: true }));
  };

  const goToChapter = (modIdx: number, chIdx: number) => {
    setSelMod(modIdx);
    setSelCh(chIdx);
    setAnswers({});
    setSubmitted(false);
  };

  const TM = {
    lesson: { bg: "#e0f2fe", color: "#0284c7", icon: "📖", label: "Lesson" },
    quiz: { bg: "#ede9fe", color: "#7c3aed", icon: "❓", label: "Quiz" },
    assessment: { bg: "#fef3c7", color: "#d97706", icon: "📝", label: "Assessment" }
  };

  if (!currentChapter) return null;

  const meta = TM[currentChapter.type];
  const blocks = (currentChapter.content.blocks || []) as UnifiedBlock[];
  const questions = currentChapter.content.questions || [];

  return (
    <>
      <style>{STYLES}</style>
      <div className="cv-page">
        
        {/* Header */}
        <div className="cv-header">
          <button className="cv-header-back" onClick={onClose}>
            ←
          </button>
          <div className="cv-header-title">{course.title}</div>
          <div className="cv-header-progress">
            <div className="cv-progress-bar">
              <div className="cv-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="cv-progress-text">{completedChapters} / {totalChapters} completed</div>
          </div>
        </div>

        {/* Body */}
        <div className="cv-body">
          
          {/* Sidebar */}
          <div className="cv-sidebar">
            <div className="cv-sidebar-header">
              <div className="cv-sidebar-title">Course Content</div>
              <div className="cv-sidebar-subtitle">
                {modules.length} module{modules.length !== 1 ? 's' : ''} · {totalChapters} chapters
              </div>
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
                    return (
                      <div
                        key={chIdx}
                        className={`cv-chapter${isActive ? ' active' : ''}${ch.done ? ' done' : ''}`}
                        onClick={() => goToChapter(modIdx, chIdx)}
                      >
                        <div className="cv-chapter-icon" style={{ background: chMeta.bg, color: chMeta.color }}>
                          {chMeta.icon}
                        </div>
                        <div className="cv-chapter-content">
                          <div className="cv-chapter-title">{ch.title}</div>
                          <div className="cv-chapter-meta">{chMeta.label}</div>
                        </div>
                        <div className="cv-chapter-check">
                          {ch.done && '✓'}
                        </div>
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
              
              {/* Chapter Header */}
              <div className="cv-chapter-header">
                <div className="cv-chapter-header-icon" style={{ background: meta.bg, color: meta.color }}>
                  {meta.icon}
                </div>
                <div className="cv-chapter-header-content">
                  <div className="cv-chapter-header-title">{currentChapter.title}</div>
                  <div className="cv-chapter-header-type">{meta.label}</div>
                </div>
              </div>

              {/* Lesson Content */}
              {currentChapter.type === 'lesson' && blocks.map((block, idx) => {
                
                // Content Block
                if (block.type === 'content') {
                  return (
                    <div key={block.id} className="cv-block" style={{ animationDelay: `${idx * 0.05}s` }}>
                      {block.title && (
                        <div className="cv-block-title">
                          <span>📝</span>
                          {block.title}
                        </div>
                      )}
                      <div className="cv-block-body">{block.body}</div>
                    </div>
                  );
                }

                // Media Block
                if (block.type === 'media' && block.mediaUrl) {
                  const embedUrl = block.mediaType === 'video' 
                    ? videoEmbed(block.mediaUrl)
                    : presentationEmbed(block.mediaUrl);
                  
                  return embedUrl ? (
                    <div key={block.id} className="cv-media" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <iframe 
                        src={embedUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        onLoad={() => {
                          // Mark video as "loaded" - assume watched after 10 seconds
                          setTimeout(() => handleVideoComplete(block.id), 10000);
                        }}
                      />
                    </div>
                  ) : null;
                }

                // Activity Block
                if (block.type === 'activity' && block.activity) {
                  const act = block.activity;
                  const actMeta = ACT_META[act.type];

                  return (
                    <div key={block.id} className="cv-activity" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="cv-activity-header">
                        <div className="cv-activity-icon" style={{ background: actMeta.bg, color: actMeta.color }}>
                          {actMeta.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="cv-activity-title">{act.title}</div>
                          <div className="cv-activity-type">{actMeta.label}</div>
                        </div>
                      </div>

                      {/* Accordion */}
                      {act.type === 'accordion' && act.items && act.items.map((item, itemIdx) => {
                        const key = `${block.id}-${itemIdx}`;
                        const isOpen = openAccordions[key];
                        
                        return (
                          <div key={itemIdx} className="cv-accordion-item">
                            <div 
                              className={`cv-accordion-question${isOpen ? ' open' : ''}`}
                              onClick={() => setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }))}
                            >
                              <span className="cv-accordion-icon">💭</span>
                              <span className="cv-accordion-text">{item.q}</span>
                              <svg className={`cv-accordion-chevron${isOpen ? ' open' : ''}`} viewBox="0 0 16 16" fill="var(--purple)">
                                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
                              </svg>
                            </div>
                            {isOpen && (
                              <div className="cv-accordion-answer">{item.a}</div>
                            )}
                          </div>
                        );
                      })}

                      {/* Flashcards */}
                      {act.type === 'flashcard' && act.cards && act.cards.length > 0 && (
                        <div className="cv-flashcard-container">
                          <div className="cv-flashcard" onClick={() => setFlashcardFlipped(!flashcardFlipped)}>
                            <div className={`cv-flashcard-inner${flashcardFlipped ? ' flipped' : ''}`}>
                              <div className="cv-flashcard-face cv-flashcard-front">
                                <div>
                                  <div className="cv-flashcard-label">Front • Tap to flip</div>
                                  <div className="cv-flashcard-text">{act.cards[flashcardIndex].front}</div>
                                </div>
                              </div>
                              <div className="cv-flashcard-face cv-flashcard-back">
                                <div>
                                  <div className="cv-flashcard-label">Back</div>
                                  <div className="cv-flashcard-text">{act.cards[flashcardIndex].back}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="cv-flashcard-controls">
                            <button 
                              className="cv-flashcard-btn cv-flashcard-btn-prev"
                              onClick={() => {
                                setFlashcardIndex(Math.max(0, flashcardIndex - 1));
                                setFlashcardFlipped(false);
                              }}
                              disabled={flashcardIndex === 0}
                            >
                              ← Prev
                            </button>
                            <div className="cv-flashcard-progress">
                              <div 
                                className="cv-flashcard-progress-bar"
                                style={{ width: `${((flashcardIndex + 1) / act.cards.length) * 100}%` }}
                              />
                            </div>
                            <button 
                              className="cv-flashcard-btn cv-flashcard-btn-next"
                              onClick={() => {
                                setFlashcardIndex(Math.min(act.cards.length - 1, flashcardIndex + 1));
                                setFlashcardFlipped(false);
                              }}
                              disabled={flashcardIndex === act.cards.length - 1}
                            >
                              Next →
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Checklist */}
                      {(act.type === 'checklist' || act.type === 'hotspot') && act.checklist && act.checklist.map((item, itemIdx) => {
                        const key = `${block.id}-${itemIdx}`;
                        const isChecked = checkedItems[key];
                        
                        return (
                          <div 
                            key={itemIdx}
                            className={`cv-checklist-item${isChecked ? ' checked' : ''}`}
                            onClick={() => setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))}
                          >
                            <div className="cv-checklist-checkbox">
                              {isChecked && <span style={{ color: '#fff', fontSize: 14 }}>✓</span>}
                            </div>
                            <div className="cv-checklist-text">{item.text}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                return null;
              })}

              {/* Quiz/Assessment Content */}
              {(currentChapter.type === 'quiz' || currentChapter.type === 'assessment') && (
                <div className="cv-quiz">
                  {currentChapter.content.body && (
                    <div style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 24, lineHeight: 1.7 }}>
                      {currentChapter.content.body}
                    </div>
                  )}
                  
                  {questions.map((q, qIdx) => (
                    <div key={qIdx} className="cv-quiz-question">
                      <div className="cv-quiz-number">{qIdx + 1}</div>
                      <div className="cv-quiz-text">{q.q}</div>
                      {q.opts.map((opt, optIdx) => {
                        const isSelected = answers[`q${qIdx}`] === optIdx;
                        const isCorrect = q.ans === optIdx;
                        const showResult = submitted;
                        
                        let optClass = 'cv-quiz-option';
                        if (isSelected) optClass += ' selected';
                        if (showResult && isSelected && !isCorrect) optClass += ' incorrect';
                        if (showResult && isCorrect) optClass += ' correct';
                        
                        return (
                          <div
                            key={optIdx}
                            className={optClass}
                            onClick={() => !submitted && setAnswers(prev => ({ ...prev, [`q${qIdx}`]: optIdx }))}
                          >
                            <div className="cv-quiz-radio" />
                            <div className="cv-quiz-option-text">{opt}</div>
                            {showResult && isCorrect && <span style={{ marginLeft: 'auto', color: 'var(--teal)' }}>✓</span>}
                            {showResult && isSelected && !isCorrect && <span style={{ marginLeft: 'auto', color: '#dc2626' }}>✗</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  
                  {submitted && (
                    <div style={{
                      padding: 16,
                      borderRadius: 10,
                      background: 'rgba(13,148,136,0.08)',
                      border: '1.5px solid rgba(13,148,136,0.2)',
                      marginTop: 20,
                    }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--teal)', marginBottom: 4 }}>
                        Score: {Object.values(answers).filter((ans, idx) => ans === questions[idx]?.ans).length} / {questions.length}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                        {Object.values(answers).filter((ans, idx) => ans === questions[idx]?.ans).length === questions.length
                          ? "Perfect! You've mastered this material."
                          : "Review the incorrect answers and try again."}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="cv-footer">
          <div className="cv-footer-info">
            {currentChapter.done ? '✓ Completed' : `Chapter ${selCh + 1} of ${currentModule.chapters.length}`}
          </div>
          
          {selCh > 0 && (
            <button className="cv-btn cv-btn-secondary" onClick={() => setSelCh(selCh - 1)}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 1L3 5l4 4"/>
              </svg>
              Previous
            </button>
          )}
          
          {(currentChapter.type === 'quiz' || currentChapter.type === 'assessment') && !submitted ? (
            <button 
              className="cv-btn cv-btn-primary"
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(answers).length !== questions.length}
            >
              Submit Answers
            </button>
          ) : (
            <button className="cv-btn cv-btn-primary" onClick={markComplete}>
              {currentChapter.done ? 'Next Chapter' : 'Mark Complete'}
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 1l4 4-4 4"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
