// ── CLIENTS ──────────────────────────────────────────────
export type ClientCategory = "F&B" | "Retail" | "Warehouse";
export interface Client { id: number; name: string; cat: ClientCategory; }

// ── COURSES & MODULES ─────────────────────────────────────
export type CourseCategory = "POS" | "Security" | "Management" | string;
export type ChapterType    = "lesson" | "quiz" | "assessment";
export type MediaType      = "none" | "video" | "presentation";

export interface QuizQuestion { q: string; opts: string[]; ans: number; }

export interface ChapterMedia {
  type:   MediaType;
  url:    string;
  label?: string;
}

export interface ChapterContent {
  title:      string;
  type:       ChapterType;
  body?:      string;
  questions?: QuizQuestion[];
  media?:     ChapterMedia;
}

export interface Chapter {
  title: string;
  type:  ChapterType;
  done:  boolean;
  content: ChapterContent;
}

export interface Module {
  title:    string;
  done:     boolean;
  chapters: Chapter[];
}

export interface Course {
  title:       string;
  desc:        string;
  time:        string;
  thumb:       string | null;
  thumbEmoji?: string | null;
  cat:         CourseCategory;
  enrolled:    boolean;
  progress:    number;
  active:      boolean;
  companies?:  string[] | null;
  modules?:    Module[];
}

// ── PROGRESS ─────────────────────────────────────────────
export type ProgressStatus = "Completed" | "In Progress" | "Not Started";
export interface ProgressRecord {
  name:      string;
  company:   string;
  course:    string;
  progress:  number;
  started:   string | null;
  completed: string | null;
  status:    ProgressStatus;
}

// ── LEARNING PORTAL ───────────────────────────────────────
export type SegmentType =
  | "intro" | "text" | "keypoints" | "callout"
  | "cards" | "steps" | "table" | "quiz_intro" | "quiz";

export type CalloutVariant = "tip" | "warning" | "info";

export interface Segment {
  id:        string;
  type:      SegmentType;
  heading?:  string;
  body?:     string;
  variant?:  CalloutVariant;
  points?:   string[];
  cards?:    { icon: string; title: string; desc: string }[];
  steps?:    { num: number; title: string; desc: string }[];
  headers?:  string[];
  rows?:     string[][];
  questions?: { q: string; opts: string[]; ans: number }[];
}

export interface LPChapter {
  id:       string;
  title:    string;
  type:     ChapterType;
  segments: Segment[];
}

export interface LPModule {
  id:       string;
  title:    string;
  color:    string;
  chapters: LPChapter[];
}

export interface LPCourse {
  title:    string;
  emoji:    string;
  category: string;
  duration: string;
  modules:  LPModule[];
}

export interface Particle {
  id:    number;
  x:     number;
  y:     number;
  vx:    number;
  vy:    number;
  color: string;
  size:  number;
  life:  number;
  decay: number;
  shape: "circle" | "star" | "spark";
}

export interface FlatChapter {
  mi:  number;
  ci:  number;
  mid: string;
  cid: string;
}

// ── LEARNING PORTAL PROPS ─────────────────────────────────
export interface LearningPortalProps {
  onBack?: () => void;
}

// ── COURSE VIEWER ──────────────────────────────────────────
/** Shape of one entry in the chapter-type map (TM). */
export interface ChapterTypeMeta {
  c:   string;   // text / accent colour
  bg:  string;   // background colour
  lbl: string;   // human label  e.g. "Lesson"
  ico: string;   // emoji icon
}

/** Props for the top-level CourseViewer component. */
export interface CourseViewerProps {
  course:     Course;
  onClose:    () => void;
  onProgress: (percent: number) => void;
}

/** Props for the landing overview screen inside CourseViewer. */
export interface CourseViewerLandingProps {
  course:          Course;
  modules:         Module[];
  completedCount:  number;
  totalChapters:   number;
  onEnter:         () => void;
  onClose:         () => void;
}

/** Props for the ChapterContent renderer. */
export interface ContentProps {
  ch:               Chapter;
  chKey:            string;
  quizAnswers:      Record<string, number>;
  setQuizAnswers:   React.Dispatch<React.SetStateAction<Record<string, number>>>;
  quizSubmitted:    Set<string>;
  setQuizSubmitted: React.Dispatch<React.SetStateAction<Set<string>>>;
  onPass:           (el: HTMLElement) => void;
  isComplete:       boolean;
  isLast:           boolean;
  onComplete:       (el?: HTMLElement) => void;
  onNext:           () => void;
}

export interface LandingProps {
  onEnter:         () => void;
  onBack:          () => void;
  completedCount:  number;
  totalChapters:   number;
}

export interface SegQuizProps {
  seg:              Segment;
  chKey:            string;
  quizAnswers:      Record<string, number>;
  setQuizAnswers:   React.Dispatch<React.SetStateAction<Record<string, number>>>;
  quizSubmitted:    Set<string>;
  setQuizSubmitted: React.Dispatch<React.SetStateAction<Set<string>>>;
  onPass:           (el: HTMLElement) => void;
}
