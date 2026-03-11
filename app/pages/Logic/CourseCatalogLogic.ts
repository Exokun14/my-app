import { useState } from "react";
import type { Course, Module } from "../../Data/types";
import type { Activity } from "../Learning_Module/ActivityBuilderPanel";
import api from "../../Services/api.service";

// ── Stage system ──────────────────────────────────────────────────────────────
// draft | review_ready | unpublished  →  Workspace tab
// published                           →  Catalog tab
// template                            →  Templates tab
export type CourseStage =
  | "draft"
  | "review_ready"
  | "published"
  | "unpublished"
  | "template";

export interface CourseCatalogProps {
  courses:       Course[];
  setCourses:    React.Dispatch<React.SetStateAction<Course[]>>;
  categories:    string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  toast:         (msg: string) => void;
  onOpenCourse:  (idx: number) => void;
  publishedActivities: Activity[];
  onCourseCreated?: (newCourseIdx: number) => void;
  newCoursePromptIdx?: number | null;
  onNewCoursePromptConsumed?: () => void;
}

export const THUMB_GRADIENTS = [
  ["#4c1d95","#0d9488"],["#0c4a6e","#065f46"],["#831843","#4c1d95"],
  ["#78350f","#dc2626"],["#064e3b","#0c4a6e"],["#1e3a8a","#4c1d95"],
  ["#9d174d","#78350f"],["#134e4a","#1e3a8a"],
];

export const THUMB_PATTERNS = [
  `radial-gradient(rgba(255,255,255,0.12) 1px,transparent 1px)`,
  `repeating-linear-gradient(45deg,rgba(255,255,255,0.06) 0,rgba(255,255,255,0.06) 1px,transparent 1px,transparent 14px)`,
  `repeating-linear-gradient(-45deg,rgba(255,255,255,0.06) 0,rgba(255,255,255,0.06) 1px,transparent 1px,transparent 14px)`,
  `repeating-linear-gradient(0deg,rgba(255,255,255,0.05) 0,rgba(255,255,255,0.05) 1px,transparent 1px,transparent 18px),repeating-linear-gradient(90deg,rgba(255,255,255,0.05) 0,rgba(255,255,255,0.05) 1px,transparent 1px,transparent 18px)`,
];

export const CAT_ICONS: Record<string, string> = {
  "POS Training":"🖥️","Food Safety":"🍽️","Customer Service":"🎯",
  "HR & Compliance":"📋","Sales":"📈","Operations":"⚙️","Finance":"💰","Leadership":"🏆",
};

export const CARD_STYLES = `
.cc3-card {
  border-radius:18px; overflow:hidden; background:#fff;
  border:1px solid rgba(109,40,217,0.08);
  box-shadow:0 2px 14px rgba(109,40,217,0.07);
  cursor:pointer; display:flex; flex-direction:column;
  transition:transform .24s cubic-bezier(0.16,1,0.3,1),box-shadow .24s,border-color .18s;
}
.cc3-card:hover {
  transform:translateY(-6px) scale(1.01);
  box-shadow:0 22px 56px rgba(109,40,217,0.18);
  border-color:rgba(109,40,217,0.22);
}
.cc3-tpl-card {
  border-radius:18px; overflow:hidden; background:#fafaf8;
  border:1.5px dashed rgba(14,165,233,0.35);
  box-shadow:0 2px 10px rgba(14,165,233,0.07);
  display:flex; flex-direction:column;
  transition:transform .24s cubic-bezier(0.16,1,0.3,1),box-shadow .24s,border-color .18s;
}
.cc3-tpl-card:hover {
  transform:translateY(-5px) scale(1.01);
  box-shadow:0 18px 48px rgba(14,165,233,0.16);
  border-color:rgba(14,165,233,0.65);
}
.cc3-overlay { opacity:0; transition:opacity .22s ease; }
.cc3-tpl-card:hover .cc3-overlay { opacity:1; }
.cc3-card:hover .cc3-overlay     { opacity:1; }
.cc3-emoji { transition:transform .24s cubic-bezier(0.16,1,0.3,1); }
.cc3-card:hover .cc3-emoji     { transform:scale(1.14) translateY(-4px); }
.cc3-tpl-card:hover .cc3-emoji { transform:scale(1.14) translateY(-4px); }
.cc3-shine {
  position:absolute; inset:0;
  background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.14) 50%,transparent 65%);
  transform:translateX(-100%); transition:transform .55s ease;
}
.cc3-card:hover .cc3-shine     { transform:translateX(100%); }
.cc3-tpl-card:hover .cc3-shine { transform:translateX(100%); }
.cc3-btn { transition:background .13s,transform .13s,box-shadow .13s; }
.cc3-btn:hover { transform:translateY(-1px); box-shadow:0 3px 10px rgba(0,0,0,0.1); }
@keyframes cc3-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
`;

// ── Readiness score ───────────────────────────────────────────────────────────
export function computeReadiness(c: Course): {
  score: number;
  canPromote: boolean;
  checks: { label: string; ok: boolean; warn?: boolean; detail: string }[];
} {
  const modCount     = c.modules?.length ?? 0;
  const chCount      = c.modules?.reduce((s, m) => s + m.chapters.length, 0) ?? 0;
  const hasTitle     = !!c.title?.trim();
  const hasDesc      = !!c.desc?.trim();
  const hasCat       = !!c.cat?.trim();
  const hasDur       = !!c.time?.trim();
  const hasMods      = modCount > 0;
  const hasChaps     = chCount > 0;
  const hasCompanies = (c.companies?.length ?? 0) > 0;

  const checks = [
    { label:"Title",              ok: hasTitle,     detail: hasTitle     ? c.title  : "Missing title" },
    { label:"Category",           ok: hasCat,       detail: hasCat       ? c.cat    : "No category" },
    { label:"Modules",            ok: hasMods,      detail: hasMods      ? `${modCount} module${modCount!==1?"s":""}` : "No modules added" },
    { label:"Chapters",           ok: hasChaps,     detail: hasChaps     ? `${chCount} chapter${chCount!==1?"s":""}` : "No chapters in modules" },
    { label:"Description",        ok: hasDesc,      warn:true, detail: hasDesc      ? "Provided"  : "No description" },
    { label:"Duration",           ok: hasDur,       warn:true, detail: hasDur       ? c.time      : "Duration not set" },
    { label:"Companies assigned", ok: hasCompanies, warn:true, detail: hasCompanies ? `${c.companies!.length} assigned` : "No companies yet" },
  ];

  const canPromote = checks.filter(ch => !ch.warn).every(ch => ch.ok);
  const score      = Math.round((checks.filter(ch => ch.ok).length / checks.length) * 100);
  return { score, canPromote, checks };
}

// ── Stage helpers ─────────────────────────────────────────────────────────────
export function getCourseStage(c: Course): CourseStage {
  if ((c as any).stage) return (c as any).stage as CourseStage;
  return c.active ? "published" : "draft";          // backwards-compat
}

export function isWorkspaceCourse(c: Course): boolean {
  const s = getCourseStage(c);
  return s === "draft" || s === "review_ready" || s === "unpublished";
}

export function isCatalogCourse(c: Course): boolean {
  return getCourseStage(c) === "published";
}

export function isTemplateCourse(c: Course): boolean {
  return getCourseStage(c) === "template";
}

export function stageBadge(stage: CourseStage) {
  switch (stage) {
    case "published":    return { label:"Published",    bg:"rgba(13,148,136,0.12)",  color:"#0d9488", dot:"#0d9488" };
    case "review_ready": return { label:"Review Ready", bg:"rgba(124,58,237,0.1)",   color:"#7c3aed", dot:"#7c3aed" };
    case "unpublished":  return { label:"Unpublished",  bg:"rgba(100,116,139,0.1)",  color:"#475569", dot:"#94a3b8" };
    case "template":     return { label:"Template",     bg:"rgba(14,165,233,0.1)",   color:"#0ea5e9", dot:"#0ea5e9" };
    default:             return { label:"Draft",        bg:"rgba(217,119,6,0.1)",    color:"#d97706", dot:"#d97706" };
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useCourseCatalog({
  courses,
  setCourses,
  toast,
  onOpenCourse,
}: Pick<CourseCatalogProps, "courses" | "setCourses" | "toast" | "onOpenCourse">) {
  const [activeView,           setActiveView]           = useState<"workspace"|"catalog"|"templates">("workspace");
  const [search,               setSearch]               = useState("");
  const [activeCat,            setActiveCat]            = useState("All");
  const [workspaceStageFilter, setWorkspaceStageFilter] = useState<"All"|"draft"|"review_ready"|"unpublished">("All");
  const [filterOn,             setFilterOn]             = useState(true);
  const [editOpen,             setEditOpen]             = useState(false);
  const [editIdx,              setEditIdx]              = useState<number|null>(null);
  const [modOpen,              setModOpen]              = useState(false);
  const [modIdx,               setModIdx]               = useState<number|null>(null);
  const [deleteConfirmOpen,    setDeleteConfirmOpen]    = useState(false);
  const [deleteIdx,            setDeleteIdx]            = useState<number|null>(null);
  const [deleteTyped,          setDeleteTyped]          = useState("");
  const [promoteIdx,           setPromoteIdx]           = useState<number|null>(null);
  const [unpublishIdx,         setUnpublishIdx]         = useState<number|null>(null);
  const [cloningIdx,           setCloningIdx]           = useState<number|null>(null);

  // ── Filtered lists ────────────────────────────────────────────────────────
  const srch = (c: Course) =>
    !search ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.desc?.toLowerCase().includes(search.toLowerCase());

  const workspaceCourses = courses.filter(c => {
    if (!isWorkspaceCourse(c)) return false;
    const stageOk = workspaceStageFilter === "All" || getCourseStage(c) === workspaceStageFilter;
    return stageOk && srch(c);
  });

  const catalogCourses = courses.filter(c =>
    isCatalogCourse(c) && (activeCat === "All" || c.cat === activeCat) && srch(c)
  );

  const templateCourses = courses.filter(c => isTemplateCourse(c) && srch(c));

  // ── Edit / save ───────────────────────────────────────────────────────────
  const handleEditSave = async (data: Course) => {
    try {
      if (editIdx !== null) {
        const existing = courses[editIdx];
        if (!existing.id) { toast('Cannot update: no ID'); return; }
        const res = await api.courses.update(existing.id, data);
        if (res.success) {
          setCourses(prev => prev.map((c, i) => i === editIdx ? { ...c, ...data } : c));
          toast('Course updated');
        } else {
          toast(`Error: ${res.error}`); return;
        }
      } else {
        const res = await api.courses.create(data);
        if (res.success && res.data) {
          setCourses(prev => [...prev, { ...data, id: res.data!.id }]);
          toast('Course created');
        } else {
          toast(`Error: ${res.error}`); return;
        }
      }
      setEditOpen(false); setEditIdx(null);
    } catch { toast('Failed to save'); }
  };

  // ── Promote (workspace → catalog) ────────────────────────────────────────
  const openPromote    = (idx: number) => setPromoteIdx(idx);
  const cancelPromote  = () => setPromoteIdx(null);
  const confirmPromote = async () => {
    if (promoteIdx === null) return;
    const course = courses[promoteIdx];
    try {
      if (course.id) await api.courses.update(course.id, { ...course, active: true, stage: "published" });
      setCourses(prev => prev.map((c, i) => i === promoteIdx ? { ...c, active: true, stage: "published" } : c));
      toast(`"${course.title}" is now live in the Catalog!`);
      setPromoteIdx(null);
    } catch { toast('Failed to publish'); }
  };

  // ── Unpublish (catalog → workspace as "unpublished") ─────────────────────
  const openUnpublish    = (idx: number) => setUnpublishIdx(idx);
  const cancelUnpublish  = () => setUnpublishIdx(null);
  const confirmUnpublish = async () => {
    if (unpublishIdx === null) return;
    const course = courses[unpublishIdx];
    try {
      if (course.id) await api.courses.update(course.id, { ...course, active: false, stage: "unpublished" });
      setCourses(prev => prev.map((c, i) => i === unpublishIdx ? { ...c, active: false, stage: "unpublished" } : c));
      toast(`"${course.title}" moved back to Workspace.`);
      setUnpublishIdx(null);
    } catch { toast('Failed to unpublish'); }
  };

  // ── Clone template → new draft ───────────────────────────────────────────
  const cloneTemplate = async (idx: number) => {
    const course = courses[idx];
    if (!course.id) { toast('Cannot clone: no ID'); return; }
    setCloningIdx(idx);
    try {
      const res = await api.courses.clone(course.id);
      if (res.success && res.data) {
        const newCourse = res.data.course ?? { ...course, id: res.data.id, title: course.title + ' (Copy)', stage: 'draft', active: false };
        setCourses(prev => [...prev, newCourse]);
        toast(`"${newCourse.title}" created as a Draft in Workspace.`);
      } else {
        toast(`Error: ${res.error || 'Clone failed'}`);
      }
    } catch { toast('Failed to clone template'); }
    finally { setCloningIdx(null); }
  };

  // ── Delete (name-confirmation, available from Workspace + Templates) ──────
  const handleDelete = (idx: number) => { setDeleteTyped(""); setDeleteIdx(idx); setDeleteConfirmOpen(true); };
  const cancelDelete = () => { setDeleteConfirmOpen(false); setDeleteIdx(null); setDeleteTyped(""); };
  const confirmDelete = async () => {
    if (deleteIdx === null) return;
    const course = courses[deleteIdx];
    if (deleteTyped.trim().toLowerCase() !== course.title.trim().toLowerCase()) {
      toast("Name doesn't match — deletion cancelled."); return;
    }
    try {
      if (course.id) {
        const res = await api.courses.delete(course.id);
        if (!res.success) { toast(`Error: ${res.error}`); return; }
      }
      toast(`"${course.title}" deleted.`);
      setCourses(prev => prev.filter((_, i) => i !== deleteIdx));
      setDeleteConfirmOpen(false); setDeleteIdx(null); setDeleteTyped("");
    } catch { toast('Failed to delete'); }
  };

  // ── Modules ───────────────────────────────────────────────────────────────
  const handleModSave = async (idx: number, modules: Module[]) => {
    const course = courses[idx];
    setCourses(prev => prev.map((c, i) => i === idx ? { ...c, modules } : c));
    try {
      if (course.id) {
        const res = await api.courses.updateModules(course.id, modules);
        toast(res.success ? 'Modules updated' : `Error: ${res.error}`);
      }
    } catch { toast('Failed to save modules'); }
  };

  const handleCourseProgress = async (courseIdx: number, percent: number, timeSpent: number) => {
    const course = courses[courseIdx];
    if (!course?.id) return;
    const isCompleted = percent >= 100;
    const isEnrolled  = percent > 0;
    setCourses(prev => prev.map((c, i) =>
      i === courseIdx
        ? { ...c, progress: percent, completed: isCompleted, enrolled: isEnrolled, time_spent: (c.time_spent ?? 0) + timeSpent }
        : c
    ));
    try { await api.courses.updateProgress(course.id, { progress: percent, enrolled: isEnrolled, completed: isCompleted, time_spent: timeSpent }); } catch {}
    try {
      const status   = isCompleted ? 'Completed' : 'In Progress';
      const today    = new Date().toISOString().split('T')[0];
      const existing = (course as any)._progressId;
      if (existing) {
        await api.progress.update(existing, { progress: percent, status, time_spent: (course.time_spent ?? 0) + timeSpent, ...(isCompleted ? { completed: today } : {}) });
      } else {
        const result = await api.progress.create({ name: 'Current User', company: (course.companies?.[0] ?? 'Unknown'), course: course.title, progress: percent, started: today, status, time_spent: timeSpent, ...(isCompleted ? { completed: today } : {}) });
        if (result.success && result.data?.id) {
          setCourses(prev => prev.map((c, i) => i === courseIdx ? { ...c, _progressId: result.data!.id } : c));
        }
      }
    } catch {}
  };

  const openViewer  = (idx: number) => onOpenCourse(idx);
  const openEdit    = (idx: number) => { setEditIdx(idx);  setEditOpen(true); };
  const openModules = (idx: number) => { setModIdx(idx);   setModOpen(true); };
  const closeEdit   = () => { setEditOpen(false); setEditIdx(null); };
  const closeMod    = () => { setModOpen(false);  setModIdx(null); };

  return {
    activeView, setActiveView,
    search, setSearch,
    activeCat, setActiveCat,
    workspaceStageFilter, setWorkspaceStageFilter,
    filterOn, setFilterOn,
    editOpen, editIdx,
    modOpen, modIdx,
    deleteConfirmOpen, deleteIdx, deleteTyped, setDeleteTyped,
    promoteIdx, unpublishIdx, cloningIdx,
    workspaceCourses, catalogCourses, templateCourses,
    handleEditSave, handleDelete, confirmDelete, cancelDelete,
    handleModSave, openViewer, handleCourseProgress,
    openEdit, openModules, closeEdit, closeMod,
    openPromote, cancelPromote, confirmPromote,
    openUnpublish, cancelUnpublish, confirmUnpublish,
    cloneTemplate,
  };
}
