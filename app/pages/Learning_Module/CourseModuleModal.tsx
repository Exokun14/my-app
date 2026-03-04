'use client'

import { useState, useEffect } from "react";
import {
  LessonBlocks, blankContentBlock,
  type LessonBlock, type Activity, ACT_META,
} from "./ActivityBuilderPanel";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ChapterType = "lesson" | "quiz" | "assessment";

export interface ChapterMedia { type: "none"|"video"|"presentation"; url: string; label?: string; }
export interface QuizQuestion  { q: string; opts: string[]; ans: number; }
export interface ChapterContent {
  title:     string;
  type:      ChapterType;
  body?:     string;
  media:     ChapterMedia;
  questions?: QuizQuestion[];
  segments?: LessonBlock[];
}
export interface Chapter { title:string; type:ChapterType; done:boolean; content:ChapterContent; }
export interface Module  { title:string; done:boolean; chapters:Chapter[]; }

export interface CourseModuleModalProps {
  open:       boolean;
  course:     { title:string; modules?:Module[] } | null;
  courseIdx:  number | null;
  onClose:    () => void;
  onSave:     (idx:number, modules:Module[]) => void;
  toast:      (msg:string) => void;
  publishedActivities: Activity[]; // NEW: Pass published activities
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TM: Record<ChapterType, { c:string; bg:string; border:string; lbl:string; ico:string }> = {
  lesson:     { c:"#0284c7", bg:"#e0f2fe", border:"rgba(2,132,199,0.2)",   lbl:"Lesson",     ico:"📖" },
  quiz:       { c:"#7c3aed", bg:"#ede9fe", border:"rgba(109,40,217,0.2)",  lbl:"Quiz",       ico:"❓" },
  assessment: { c:"#d97706", bg:"#fef3c7", border:"rgba(217,119,6,0.2)",   lbl:"Assessment", ico:"📝" },
};
type MediaType = "none"|"video"|"presentation";

// ─── Utils ────────────────────────────────────────────────────────────────────
function dc<T>(v:T):T { return JSON.parse(JSON.stringify(v)); }
function mkId(): string { return Math.random().toString(36).slice(2, 9); }

function blankChapter(type:ChapterType="lesson"):Chapter {
  return { title:"", type, done:false, content:{
    title:"", type, body:undefined,
    questions: type!=="lesson" ? [{q:"",opts:["","","",""],ans:0}] : undefined,
    media: {type:"none",url:""},
    segments: type==="lesson" ? [blankContentBlock()] : [] as any,
  } as any };
}
function blankModule():Module { return { title:"", done:false, chapters:[blankChapter()] }; }

function videoEmbed(url:string):string|null {
  if(!url?.trim()) return null;
  const yt=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if(yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vi=url.match(/vimeo\.com\/(\d+)/); if(vi) return `https://player.vimeo.com/video/${vi[1]}`;
  const gd=url.match(/drive\.google\.com\/file\/d\/([^/?]+)/); if(gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  if(/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return url;
  return null;
}
function presentationEmbed(url:string):string|null {
  if(!url?.trim()) return null;
  const gs=url.match(/docs\.google\.com\/presentation\/d\/([^/?]+)/);
  if(gs) return `https://docs.google.com/presentation/d/${gs[1]}/embed?start=false&loop=false`;
  const gd=url.match(/drive\.google\.com\/file\/d\/([^/?]+)/); if(gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  if(url.includes("onedrive.live")||url.includes("sharepoint.com"))
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  return null;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const S = `
@keyframes cmm-in  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
@keyframes cmm-up  { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
@keyframes cmm-tab { from{opacity:0;transform:translateX(5px)} to{opacity:1;transform:none} }

/* ── Full-screen container ── */
.cmm-fs {
  position:fixed; inset:0; z-index:1001;
  display:flex; flex-direction:column;
  background:var(--bg,#f8f7ff);
  animation:cmm-in .24s cubic-bezier(.16,1,.3,1) both;
}

/* ── Header bar ── */
.cmm-hdr {
  height:60px; flex-shrink:0;
  display:flex; align-items:center; gap:14px; padding:0 24px;
  background:var(--surface,#fff);
  border-bottom:1px solid var(--border,rgba(124,58,237,0.1));
  box-shadow:0 1px 6px rgba(124,58,237,0.04);
}
.cmm-hdr-ico {
  width:36px; height:36px; border-radius:10px; flex-shrink:0;
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  display:flex; align-items:center; justify-content:center;
}
.cmm-hdr-text { flex-shrink:0; }
.cmm-hdr-title { font-size:14px; font-weight:700; color:var(--t1,#18103a); line-height:1.2; }
.cmm-hdr-sub   { font-size:11px; color:var(--t3,#8e7ec0); margin-top:1px; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cmm-hdr-divider { width:1px; height:28px; background:var(--border); flex-shrink:0; }
.cmm-hdr-prog { display:flex; flex-direction:column; gap:4px; width:140px; flex-shrink:0; }
.cmm-hdr-prog-bar { height:4px; border-radius:4px; background:var(--border,rgba(124,58,237,0.1)); overflow:hidden; }
.cmm-hdr-prog-fill { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--purple,#7c3aed),var(--teal,#0d9488)); transition:width .5s cubic-bezier(.16,1,.3,1); }
.cmm-hdr-prog-lbl { font-size:9.5px; font-weight:600; color:var(--t3,#a89dc8); text-align:right; }

/* ── Step wizard ── */
.cmm-wizard {
  display:flex; align-items:center;
  background:var(--surface2,#f2f0fb);
  border:1px solid var(--border); border-radius:10px; padding:3px; gap:1px;
}
.cmm-wstep {
  display:flex; align-items:center; gap:6px;
  padding:5px 14px; border-radius:7px;
  font-size:11.5px; font-weight:600; color:var(--t3,#8e7ec0);
  cursor:pointer; border:none; background:transparent; font-family:inherit;
  transition:all .15s; white-space:nowrap;
}
.cmm-wstep:hover:not(.on) { color:var(--t2,#4a3870); background:rgba(124,58,237,0.04); }
.cmm-wstep.on  { background:var(--surface,#fff); color:var(--purple,#7c3aed); box-shadow:0 1px 5px rgba(124,58,237,0.12); }
.cmm-wstep.done { color:var(--teal,#0d9488); }
.cmm-wstep-n {
  width:18px; height:18px; border-radius:50%;
  font-size:9px; font-weight:700;
  display:flex; align-items:center; justify-content:center; flex-shrink:0;
  background:rgba(124,58,237,0.1); color:var(--t3,#a89dc8);
  transition:all .15s;
}
.cmm-wstep.on .cmm-wstep-n  { background:var(--purple,#7c3aed); color:#fff; }
.cmm-wstep.done .cmm-wstep-n { background:var(--teal,#0d9488); color:#fff; }

/* ── Body layout ── */
.cmm-body { flex:1; display:flex; overflow:hidden; }

/* ── Sidebar (Structure) ── */
.cmm-sb {
  width:320px; flex-shrink:0;
  display:flex; flex-direction:column;
  background:var(--surface,#fff);
  border-right:1px solid var(--border,rgba(124,58,237,0.1));
}
.cmm-sb-hdr {
  padding:16px 18px; border-bottom:1px solid var(--border,rgba(124,58,237,0.08));
  background:linear-gradient(to bottom, rgba(124,58,237,0.02), transparent);
}
.cmm-sb-hdr-title { font-size:12px; font-weight:700; color:var(--t1,#18103a); text-transform:uppercase; letter-spacing:.05em; }
.cmm-sb-hdr-sub { font-size:10px; color:var(--t3,#a89dc8); margin-top:2px; }

.cmm-sb-body { flex:1; overflow-y:auto; padding:12px; }

/* Module card in sidebar */
.cmm-mod {
  background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:10px; padding:10px 12px; margin-bottom:8px;
  transition:all .15s; cursor:pointer;
}
.cmm-mod:hover { border-color:rgba(124,58,237,0.2); background:#f5f3ff; }
.cmm-mod.sel { border-color:var(--purple,#7c3aed); background:#f5f3ff; box-shadow:0 2px 8px rgba(124,58,237,0.12); }
.cmm-mod-hdr { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.cmm-mod-n {
  width:24px; height:24px; border-radius:6px; flex-shrink:0;
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; font-size:10px; font-weight:700;
  display:flex; align-items:center; justify-content:center;
}
.cmm-mod-title {
  flex:1; font-size:12px; font-weight:700; color:var(--t1,#18103a);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.cmm-mod-title.empty { color:var(--t3,#c4bdd8); font-style:italic; }
.cmm-mod-del {
  width:20px; height:20px; border-radius:5px; border:none;
  background:transparent; cursor:pointer; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  transition:all .15s; color:var(--t3,#a89dc8);
}
.cmm-mod-del:hover { background:rgba(239,68,68,0.1); color:#dc2626; }

/* Chapter card in sidebar */
.cmm-ch {
  display:flex; align-items:center; gap:7px;
  padding:6px 8px; border-radius:6px;
  border:1px solid transparent;
  transition:all .15s; cursor:pointer;
  margin-bottom:3px;
}
.cmm-ch:hover { background:rgba(124,58,237,0.04); }
.cmm-ch.sel { background:#f0ebff; border-color:rgba(124,58,237,0.2); }
.cmm-ch-n {
  width:18px; height:18px; border-radius:4px; flex-shrink:0;
  font-size:9px; font-weight:700;
  display:flex; align-items:center; justify-content:center;
}
.cmm-ch-title {
  flex:1; font-size:11px; font-weight:600; color:var(--t1,#18103a);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.cmm-ch-title.empty { color:var(--t3,#c4bdd8); font-style:italic; }
.cmm-ch-del {
  width:18px; height:18px; border-radius:4px; border:none;
  background:transparent; cursor:pointer; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  opacity:0; transition:all .15s; color:var(--t3,#a89dc8);
}
.cmm-ch:hover .cmm-ch-del { opacity:1; }
.cmm-ch-del:hover { background:rgba(239,68,68,0.1); color:#dc2626; }

.cmm-sb-add {
  padding:12px 18px; border-top:1px solid var(--border);
  background:linear-gradient(to top, rgba(124,58,237,0.02), transparent);
}
.cmm-sb-add-btn {
  width:100%; padding:9px 12px; border-radius:8px;
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; font-size:11.5px; font-weight:700; text-align:center;
  border:none; cursor:pointer; font-family:inherit;
  transition:all .2s; box-shadow:0 2px 8px rgba(124,58,237,0.25);
  display:flex; align-items:center; justify-content:center; gap:6px;
}
.cmm-sb-add-btn:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(124,58,237,0.35); }
.cmm-sb-add-btn:active { transform:translateY(0); }

/* ── Main content area ── */
.cmm-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }

/* Action bar at top of content */
.cmm-actions {
  display:flex; align-items:center; gap:8px;
  padding:12px 20px;
  background:var(--surface,#fff);
  border-bottom:1px solid var(--border,rgba(124,58,237,0.08));
}
.cmm-actions-title {
  font-size:11px; font-weight:700; color:var(--t2,#4a3870);
  text-transform:uppercase; letter-spacing:.06em; margin-right:auto;
}
.cmm-action-btn {
  padding:7px 14px; border-radius:8px;
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; font-size:11px; font-weight:700;
  border:none; cursor:pointer; font-family:inherit;
  transition:all .2s; box-shadow:0 2px 6px rgba(124,58,237,0.2);
  display:flex; align-items:center; gap:5px;
}
.cmm-action-btn:hover { transform:translateY(-1px); box-shadow:0 3px 10px rgba(124,58,237,0.3); }
.cmm-action-btn:active { transform:translateY(0); }
.cmm-action-btn.secondary {
  background:linear-gradient(135deg,#0284c7,#0d9488);
  box-shadow:0 2px 6px rgba(2,132,199,0.2);
}
.cmm-action-btn.secondary:hover { box-shadow:0 3px 10px rgba(2,132,199,0.3); }

.cmm-canvas {
  flex:1; overflow-y:auto; padding:20px 24px;
}

/* ── Tabs (Content/Media/etc) ── */
.cmm-tabs {
  display:flex; gap:2px; padding:3px; background:var(--surface2,#f2f0fb);
  border:1px solid var(--border); border-radius:9px;
  margin-bottom:16px;
}
.cmm-tab {
  flex:1; padding:7px 12px; border-radius:6px;
  font-size:11.5px; font-weight:600; color:var(--t3,#8e7ec0);
  text-align:center; cursor:pointer; border:none;
  background:transparent; font-family:inherit;
  transition:all .15s;
}
.cmm-tab:hover:not(.on) { color:var(--t2,#4a3870); background:rgba(124,58,237,0.04); }
.cmm-tab.on { background:var(--surface,#fff); color:var(--purple,#7c3aed); box-shadow:0 1px 4px rgba(124,58,237,0.1); }

/* Form inputs */
.cmm-field { margin-bottom:14px; }
.cmm-lbl { display:block; font-size:11.5px; font-weight:700; color:var(--t2,#4a3870); margin-bottom:6px; }
.cmm-input, .cmm-ta, .cmm-sel {
  width:100%; padding:9px 12px; border-radius:8px;
  border:1.5px solid var(--border,rgba(109,40,217,0.1));
  background:var(--surface,#fff); color:var(--t1,#18103a);
  font-size:12px; font-family:inherit; transition:all .15s;
}
.cmm-input:focus, .cmm-ta:focus, .cmm-sel:focus {
  outline:none; border-color:var(--purple,#7c3aed);
  box-shadow:0 0 0 3px rgba(124,58,237,0.08);
}
.cmm-ta { resize:vertical; min-height:80px; line-height:1.5; }

/* ── Footer ── */
.cmm-foot {
  height:64px; flex-shrink:0;
  display:flex; align-items:center; gap:10px; padding:0 24px;
  background:var(--surface,#fff);
  border-top:1px solid var(--border,rgba(124,58,237,0.1));
  box-shadow:0 -1px 6px rgba(124,58,237,0.04);
}

/* Buttons */
.btn { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:8px; font-size:12px; font-weight:600; border:none; cursor:pointer; font-family:inherit; transition:all .15s; }
.btn svg { width:13px; height:13px; }
.btn-s { background:transparent; color:var(--t2,#4a3870); border:1.5px solid var(--border,rgba(109,40,217,0.12)); }
.btn-s:hover { background:rgba(124,58,237,0.04); border-color:rgba(109,40,217,0.2); }
.btn-p { background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488)); color:#fff; border:none; }
.btn-p:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(124,58,237,0.3); }
.btn-p:active { transform:translateY(0); }
.btn-sm { padding:6px 12px; font-size:11px; }
.btn-sm svg { width:11px; height:11px; }

/* Lesson-only notice */
.cmm-lesson-only {
  display:flex; align-items:flex-start; gap:7px;
  padding:10px 12px; border-radius:8px;
  background:rgba(124,58,237,0.04);
  border:1.5px solid rgba(124,58,237,0.1);
  font-size:11px; color:var(--t2,#4a3870); line-height:1.5;
}

/* Media embed */
.cmm-media { margin-top:12px; border-radius:10px; overflow:hidden; border:1.5px solid var(--border); }
.cmm-media iframe { width:100%; height:360px; border:none; display:block; }

/* Activity Selection Panel */
.cmm-activity-panel {
  position:fixed; inset:0; z-index:1002;
  background:rgba(24,16,58,0.4); backdrop-filter:blur(4px);
  display:flex; align-items:center; justify-content:center;
  animation:cmm-in .2s ease both;
}
.cmm-activity-modal {
  background:var(--surface,#fff);
  border-radius:16px;
  width:90%; max-width:700px; max-height:85vh;
  display:flex; flex-direction:column;
  box-shadow:0 20px 60px rgba(124,58,237,0.25);
  animation:cmm-up .3s cubic-bezier(.16,1,.3,1) both;
}
.cmm-activity-modal-hdr {
  padding:20px 24px;
  border-bottom:1px solid var(--border,rgba(124,58,237,0.1));
}
.cmm-activity-modal-title {
  font-size:16px; font-weight:800; color:var(--t1,#18103a);
  margin-bottom:4px;
}
.cmm-activity-modal-sub {
  font-size:11.5px; color:var(--t3,#a89dc8);
}
.cmm-activity-modal-body {
  flex:1; overflow-y:auto; padding:20px 24px;
}
.cmm-activity-grid {
  display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr));
  gap:12px;
}
.cmm-activity-card {
  padding:14px; border-radius:10px; cursor:pointer;
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  background:var(--bg,#faf9ff); transition:all .15s;
  display:flex; flex-direction:column; gap:8px;
}
.cmm-activity-card:hover {
  border-color:rgba(124,58,237,0.3);
  background:#f5f3ff;
  transform:translateY(-2px);
  box-shadow:0 4px 12px rgba(124,58,237,0.12);
}
.cmm-activity-card-icon {
  width:40px; height:40px; border-radius:9px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:20px;
}
.cmm-activity-card-title {
  font-size:12.5px; font-weight:700; color:var(--t1,#18103a);
}
.cmm-activity-card-type {
  font-size:10px; color:var(--t3,#a89dc8); text-transform:uppercase;
  letter-spacing:.04em; font-weight:600;
}
.cmm-activity-modal-foot {
  padding:16px 24px;
  border-top:1px solid var(--border,rgba(124,58,237,0.1));
  display:flex; justify-content:flex-end;
}
`;

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function CourseModuleModal({ 
  open, 
  course, 
  courseIdx, 
  onClose, 
  onSave, 
  toast,
  publishedActivities = [] 
}: CourseModuleModalProps) {
  const [modules,  setModules]  = useState<Module[]>([]);
  const [step,     setStep]     = useState<0|1|2>(0);
  const [selMod,   setSelMod]   = useState(0);
  const [selCh,    setSelCh]    = useState(0);
  const [tab,      setTab]      = useState<"content"|"media"|"quiz">("content");
  const [closing,  setClosing]  = useState(false);
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);

  useEffect(()=>{ 
    if(open&&course){ 
      setModules(course.modules?dc(course.modules):[blankModule()]); 
      setStep(0); 
      setSelMod(0); 
      setSelCh(0); 
      setTab("content"); 
      setClosing(false); 
    } 
  },[open,course]);

  if(!open||!course||courseIdx===null) return null;

  const m = modules[selMod];
  const c = m?.chapters[selCh];

  // Progress
  const totalCh = modules.reduce((s,m)=>s+m.chapters.length,0);
  const titledCh = modules.reduce((s,m)=>s+m.chapters.filter(c=>c.title.trim()).length,0);
  const progressPct = totalCh>0?Math.round((titledCh/totalCh)*100):0;
  const step0done = modules.every(m=>m.title.trim()&&m.chapters.every(c=>c.title.trim()));

  // Footer
  let footerNote = "";
  let footerNoteColor = "var(--t3,#a89dc8)";
  if(step===0) {
    if(!step0done) { footerNote="⚠️ All modules and chapters need titles"; footerNoteColor="#d97706"; }
    else { footerNote="✓ Structure complete"; footerNoteColor="var(--teal,#0d9488)"; }
  } else if(step===1) {
    footerNote=`Editing ${modules.length} module${modules.length!==1?"s":""}, ${totalCh} chapter${totalCh!==1?"s":""}`;
  } else {
    footerNote=`Ready to save ${totalCh} chapter${totalCh!==1?"s":""}`;
  }

  // Handlers
  const handleClose=()=>{setClosing(true);setTimeout(onClose,150);};
  const save=()=>{ if(courseIdx===null)return; onSave(courseIdx,modules); handleClose(); toast("Modules saved successfully!"); };
  const addMod=()=>setModules([...modules,blankModule()]);
  const delMod=(mi:number)=>{ if(modules.length<=1){toast("Need at least one module.");return;} setModules(modules.filter((_,i)=>i!==mi)); if(selMod>=modules.length-1)setSelMod(Math.max(0,modules.length-2)); };
  const updMod=(mi:number,k:keyof Module,v:any)=>setModules(modules.map((x,i)=>i===mi?{...x,[k]:v}:x));
  const addCh=(mi:number)=>{ const u=[...modules]; u[mi].chapters.push(blankChapter()); setModules(u); setSelCh(u[mi].chapters.length-1); };
  const delCh=(mi:number,ci:number)=>{ if(modules[mi].chapters.length<=1){toast("Module needs at least one chapter.");return;} const u=[...modules]; u[mi].chapters.splice(ci,1); setModules(u); if(selCh>=u[mi].chapters.length)setSelCh(Math.max(0,u[mi].chapters.length-1)); };
  const updCh=(mi:number,ci:number,k:keyof Chapter,v:any)=>{ const u=[...modules]; u[mi].chapters[ci]={...u[mi].chapters[ci],[k]:v}; setModules(u); };
  const updChCont=(mi:number,ci:number,k:keyof ChapterContent,v:any)=>{ const u=[...modules]; u[mi].chapters[ci].content={...u[mi].chapters[ci].content,[k]:v}; setModules(u); };

  // Add content block
  const handleAddContent = () => {
    if (!c || c.type !== "lesson") return;
    const u = [...modules];
    const segs = (u[selMod].chapters[selCh].content.segments || []) as LessonBlock[];
    u[selMod].chapters[selCh].content.segments = [...segs, blankContentBlock()] as any;
    setModules(u);
    toast("Content block added");
  };

  // Add activity
  const handleAddActivity = () => {
    if (!c || c.type !== "lesson") return;
    if (publishedActivities.length === 0) {
      toast("No published activities available. Create and publish activities first.");
      return;
    }
    setActivityPanelOpen(true);
  };

  // Select activity
  const handleSelectActivity = (activity: Activity) => {
    const u = [...modules];
    const segs = (u[selMod].chapters[selCh].content.segments || []) as LessonBlock[];
    u[selMod].chapters[selCh].content.segments = [
      ...segs, 
      { id: mkId(), kind: "activity", activity: dc(activity) }
    ] as any;
    setModules(u);
    setActivityPanelOpen(false);
    toast(`Activity "${activity.title}" added`);
  };

  return (
    <>
      <style>{S}</style>
      <div className={`cmm-fs${closing?" closing":""}`}>

        {/* ── Header ── */}
        <div className="cmm-hdr">
          <div className="cmm-hdr-ico">📚</div>
          <div className="cmm-hdr-text">
            <div className="cmm-hdr-title">Course Modules</div>
            <div className="cmm-hdr-sub">{course.title}</div>
          </div>
          <div className="cmm-hdr-divider"/>
          <div className="cmm-wizard">
            {[{n:1,l:"Structure"},{n:2,l:"Content"},{n:3,l:"Review"}].map((s,i)=>(
              <button key={i} className={`cmm-wstep${step===i?" on":""}${step>i?" done":""}`} onClick={()=>setStep(i as 0|1|2)}>
                <div className="cmm-wstep-n">{step>i?"✓":s.n}</div>
                {s.l}
              </button>
            ))}
          </div>
          <div style={{flex:1}}/>
          <div className="cmm-hdr-prog">
            <div className="cmm-hdr-prog-bar"><div className="cmm-hdr-prog-fill" style={{width:`${progressPct}%`}}/></div>
            <div className="cmm-hdr-prog-lbl">{progressPct}% titled</div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="cmm-body">

          {/* ── Sidebar (Structure) ── */}
          {step<2 && (
            <div className="cmm-sb">
              <div className="cmm-sb-hdr">
                <div className="cmm-sb-hdr-title">Structure</div>
                <div className="cmm-sb-hdr-sub">{modules.length} module{modules.length!==1?"s":""} · {totalCh} chapter{totalCh!==1?"s":""}</div>
              </div>
              <div className="cmm-sb-body">
                {modules.map((mod,mi)=>(
                  <div key={mi} className={`cmm-mod${selMod===mi?" sel":""}`} onClick={()=>{setSelMod(mi);setSelCh(0);}}>
                    <div className="cmm-mod-hdr">
                      <div className="cmm-mod-n">{mi+1}</div>
                      <div className={`cmm-mod-title${mod.title.trim()?"":" empty"}`}>
                        {mod.title.trim()||"Untitled module"}
                      </div>
                      <button className="cmm-mod-del" onClick={e=>{e.stopPropagation();delMod(mi);}}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
                      </button>
                    </div>
                    {mod.chapters.map((ch,ci)=>{
                      const meta=TM[ch.type];
                      return (
                        <div key={ci} className={`cmm-ch${selMod===mi&&selCh===ci?" sel":""}`} onClick={e=>{e.stopPropagation();setSelMod(mi);setSelCh(ci);}}>
                          <div className="cmm-ch-n" style={{background:meta.bg,color:meta.c}}>{ci+1}</div>
                          <div className={`cmm-ch-title${ch.title.trim()?"":" empty"}`}>
                            {ch.title.trim()||"Untitled chapter"}
                          </div>
                          <button className="cmm-ch-del" onClick={e=>{e.stopPropagation();delCh(mi,ci);}}>
                            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="cmm-sb-add">
                <button className="cmm-sb-add-btn" onClick={addMod}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 1v12M1 7h12"/></svg>
                  Add Module
                </button>
              </div>
            </div>
          )}

          {/* ── Main Content Area ── */}
          <div className="cmm-main">

            {/* Step 0: Structure editing */}
            {step===0 && m && c && (
              <>
                <div className="cmm-actions">
                  <div className="cmm-actions-title">Module {selMod+1} · Chapter {selCh+1}</div>
                  <button className="cmm-action-btn secondary" onClick={()=>addCh(selMod)}>
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 1v12M1 7h12"/></svg>
                    Add Chapter
                  </button>
                </div>
                <div className="cmm-canvas">
                  <div className="cmm-field">
                    <label className="cmm-lbl">Module {selMod+1} Title</label>
                    <input className="cmm-input" value={m.title} onChange={e=>updMod(selMod,"title",e.target.value)} placeholder="e.g., Introduction to the System"/>
                  </div>
                  <div className="cmm-field">
                    <label className="cmm-lbl">Chapter {selCh+1} Title</label>
                    <input className="cmm-input" value={c.title} onChange={e=>updCh(selMod,selCh,"title",e.target.value)} placeholder="e.g., Basic Concepts"/>
                  </div>
                  <div className="cmm-field">
                    <label className="cmm-lbl">Chapter Type</label>
                    <select className="cmm-sel" value={c.type} onChange={e=>{
                      const t=e.target.value as ChapterType;
                      const u=[...modules];
                      u[selMod].chapters[selCh]={...blankChapter(t),title:c.title};
                      setModules(u);
                    }}>
                      <option value="lesson">📖 Lesson</option>
                      <option value="quiz">❓ Quiz</option>
                      <option value="assessment">📝 Assessment</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Step 1: Content editing */}
            {step===1 && (
              c ? (
                <>
                  {/* Action bar with gradient buttons */}
                  {c.type==="lesson" && (
                    <div className="cmm-actions">
                      <div className="cmm-actions-title">{c.title||"Untitled Chapter"}</div>
                      <button className="cmm-action-btn" onClick={handleAddContent}>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 1v12M1 7h12"/></svg>
                        Add Content
                      </button>
                      <button className="cmm-action-btn secondary" onClick={handleAddActivity}>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="8" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="1.5" y="8" width="4.5" height="4.5" rx="1"/><path d="M10.25 8v4.5M8 10.25h4.5"/></svg>
                        Add Activity
                      </button>
                    </div>
                  )}

                  <div className="cmm-canvas">
                    <div className="cmm-tabs">
                      <button className={`cmm-tab${tab==="content"?" on":""}`} onClick={()=>setTab("content")}>Content</button>
                      <button className={`cmm-tab${tab==="media"?" on":""}`} onClick={()=>setTab("media")}>Media</button>
                      {c.type!=="lesson"&&<button className={`cmm-tab${tab==="quiz"?" on":""}`} onClick={()=>setTab("quiz")}>Questions</button>}
                    </div>

                    {/* Content tab */}
                    {tab==="content"&&(
                      c.type==="lesson" ? (
                        <div>
                          <LessonBlocks
                            blocks={(c.content.segments||[]) as LessonBlock[]}
                            onChange={segs=>updChCont(selMod,selCh,"segments",segs)}
                          />
                        </div>
                      ) : (
                        <div className="cmm-field">
                          <label className="cmm-lbl">Chapter Body (optional)</label>
                          <textarea className="cmm-ta" value={c.content.body??""} onChange={e=>updChCont(selMod,selCh,"body",e.target.value)} placeholder="Add introductory text..." rows={6}/>
                        </div>
                      )
                    )}

                    {/* Media tab */}
                    {tab==="media"&&(
                      <>
                        <div className="cmm-field">
                          <label className="cmm-lbl">Media Type</label>
                          <select className="cmm-sel" value={c.content.media.type} onChange={e=>updChCont(selMod,selCh,"media",{...c.content.media,type:e.target.value as MediaType})}>
                            <option value="none">None</option>
                            <option value="video">🎥 Video</option>
                            <option value="presentation">📊 Presentation</option>
                          </select>
                        </div>
                        {c.content.media.type!=="none"&&(
                          <>
                            <div className="cmm-field">
                              <label className="cmm-lbl">Media URL</label>
                              <input className="cmm-input" value={c.content.media.url} onChange={e=>updChCont(selMod,selCh,"media",{...c.content.media,url:e.target.value})} placeholder="YouTube, Vimeo, Google Drive, etc."/>
                            </div>
                            {c.content.media.url&&(
                              <div className="cmm-media">
                                {c.content.media.type==="video"&&videoEmbed(c.content.media.url)&&<iframe src={videoEmbed(c.content.media.url)!} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>}
                                {c.content.media.type==="presentation"&&presentationEmbed(c.content.media.url)&&<iframe src={presentationEmbed(c.content.media.url)!}/>}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* Quiz tab */}
                    {tab==="quiz"&&c.type!=="lesson"&&(
                      <div>
                        {(c.content.questions??[]).map((q,qi)=>{
                          const updQ=(k:keyof QuizQuestion,v:any)=>{ const u=[...modules]; u[selMod].chapters[selCh].content.questions![qi]={...q,[k]:v}; setModules(u); };
                          const updOpt=(oi:number,v:string)=>{ const u=[...modules]; u[selMod].chapters[selCh].content.questions![qi].opts[oi]=v; setModules(u); };
                          return (
                            <div key={qi} style={{background:"var(--surface,#fff)",border:"1.5px solid var(--border,rgba(109,40,217,0.1))",borderRadius:10,padding:14,marginBottom:12}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                                <div style={{width:26,height:26,borderRadius:7,background:"linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488))",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{qi+1}</div>
                                <input value={q.q} onChange={e=>updQ("q",e.target.value)} placeholder={`Question ${qi+1}`} className="cmm-input" style={{flex:1}}/>
                                <button onClick={()=>{const u=[...modules];u[selMod].chapters[selCh].content.questions!.splice(qi,1);setModules(u);}} style={{width:26,height:26,borderRadius:7,border:"1.5px solid rgba(239,68,68,0.2)",background:"rgba(239,68,68,0.05)",color:"#dc2626",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0}}>×</button>
                              </div>
                              <div style={{display:"flex",flexDirection:"column",gap:7,paddingLeft:33}}>
                                {q.opts.map((opt,oi)=>(
                                  <div key={oi} style={{display:"flex",alignItems:"center",gap:9}}>
                                    <input type="radio" name={`ans-${qi}`} checked={q.ans===oi} onChange={()=>updQ("ans",oi)} style={{accentColor:"var(--purple,#7c3aed)",width:15,height:15,flexShrink:0,cursor:"pointer"}}/>
                                    <input value={opt} onChange={e=>updOpt(oi,e.target.value)}
                                      placeholder={`Option ${oi+1}${q.ans===oi?" ✓ correct":""}`}
                                      className="cmm-input"
                                      style={{border:`1.5px solid ${q.ans===oi?"rgba(22,163,74,0.45)":"var(--border,rgba(109,40,217,0.1))"}`,background:q.ans===oi?"#f0fdf4":"#fff"}}/>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        <button onClick={()=>{const u=[...modules];u[selMod].chapters[selCh].content.questions!.push({q:"",opts:["","","",""],ans:0});setModules(u);}} style={{width:"100%",padding:"10px",borderRadius:8,border:"1.5px dashed var(--border,rgba(109,40,217,0.2))",background:"var(--surface,#fff)",color:"var(--purple,#7c3aed)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Question</button>
                        <div className="cmm-lesson-only" style={{marginTop:12}}>
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--t3)" strokeWidth="1.5" style={{flexShrink:0,marginTop:1}}>
                            <circle cx="8" cy="8" r="6"/><path d="M8 7v4"/><circle cx="8" cy="5.5" r=".6" fill="var(--t3)"/>
                          </svg>
                          <span>Interactive activities are available on <strong>Lesson</strong> chapters only.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--t3)",fontSize:13}}>
                  Select a chapter to edit
                </div>
              )
            )}

            {/* Step 2: Review */}
            {step===2 && (
              <div className="cmm-canvas">
                <div style={{maxWidth:680,margin:"0 auto"}}>
                  {/* Course summary card */}
                  <div style={{background:"var(--surface,#fff)",borderRadius:14,padding:"20px 22px",border:"1.5px solid var(--border,rgba(109,40,217,0.1))",marginBottom:16,boxShadow:"0 2px 10px rgba(124,58,237,0.05)"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                      <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📚</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:17,fontWeight:800,color:"var(--t1,#18103a)",letterSpacing:"-.02em"}}>{course.title}</div>
                        <div style={{fontSize:11.5,color:"var(--t3,#a89dc8)",marginTop:3}}>
                          {modules.length} module{modules.length!==1?"s":""} · {totalCh} chapter{totalCh!==1?"s":""}
                        </div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:22,fontWeight:800,color:progressPct===100?"var(--teal,#0d9488)":"var(--purple,#7c3aed)"}}>{progressPct}%</div>
                        <div style={{fontSize:9.5,color:"var(--t3)",fontWeight:600,textTransform:"uppercase",letterSpacing:".06em"}}>titled</div>
                      </div>
                    </div>
                    <div style={{height:6,borderRadius:6,background:"var(--border,#ede9f6)",overflow:"hidden"}}>
                      <div style={{height:"100%",borderRadius:6,background:"linear-gradient(90deg,var(--purple,#7c3aed),var(--teal,#0d9488))",width:`${progressPct}%`,transition:"width .5s"}}/>
                    </div>
                  </div>

                  {/* Module review cards */}
                  {modules.map((mod,mi) => (
                    <div key={mi} style={{background:"var(--surface,#fff)",borderRadius:12,padding:"14px 16px",border:"1.5px solid var(--border,rgba(109,40,217,0.1))",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <div style={{width:28,height:28,borderRadius:8,background:"var(--purple,#7c3aed)",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{mi+1}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13.5,fontWeight:700,color:mod.title?"var(--t1,#18103a)":"var(--t3,#c4bdd8)"}}>
                            {mod.title||<em>Untitled module</em>}
                          </div>
                          <div style={{fontSize:10.5,color:"var(--t3,#a89dc8)",marginTop:2}}>{mod.chapters.length} chapter{mod.chapters.length!==1?"s":""}</div>
                        </div>
                        <button className="btn btn-s btn-sm" style={{fontSize:11}}
                          onClick={()=>{setSelMod(mi);setSelCh(0);setStep(0);}}>Edit</button>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:5}}>
                        {mod.chapters.map((ch,ci) => {
                          const meta  = TM[ch.type];
                          const segs  = (ch.content as any).segments ?? [];
                          const acts  = segs.filter((s:any)=>s.kind==="activity").length;
                          const blocks= segs.filter((s:any)=>s.kind==="content").length;
                          return (
                            <div key={ci} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,background:"var(--bg,#faf9ff)",border:`1.5px solid ${ch.title?"var(--border,#ede9f6)":"rgba(220,38,38,0.18)"}`}}>
                              <div style={{width:22,height:22,borderRadius:6,background:meta.bg,color:meta.c,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ci+1}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:600,color:ch.title?"var(--t1,#18103a)":"var(--red,#dc2626)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                  {ch.title||<em>Missing title!</em>}
                                </div>
                                <div style={{fontSize:9.5,color:"var(--t3)",marginTop:1,display:"flex",gap:5,alignItems:"center"}}>
                                  <span style={{color:meta.c,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>{meta.ico} {meta.lbl}</span>
                                  {ch.type==="lesson"&&blocks>0&&<span>· {blocks} block{blocks!==1?"s":""}</span>}
                                  {acts>0&&<span style={{color:"var(--purple,#7c3aed)"}}>· {acts} 🧩</span>}
                                  {ch.type!=="lesson"&&<span>· {(ch.content.questions??[]).length} Q</span>}
                                </div>
                              </div>
                              <button className="btn btn-s btn-sm" style={{fontSize:10,padding:"3px 9px"}}
                                onClick={()=>{setSelMod(mi);setSelCh(ci);setStep(1);}}>Edit</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>{/* /cmm-main */}
        </div>{/* /cmm-body */}

        {/* ── Footer ── */}
        <div className="cmm-foot">
          <div style={{fontSize:10.5,color:footerNoteColor,flex:1,fontWeight:500}}>{footerNote}</div>
          <button className="btn btn-s btn-sm" onClick={handleClose}>Cancel</button>
          {step>0 && (
            <button className="btn btn-s btn-sm" onClick={()=>setStep((step-1) as 0|1|2)}>
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 1L3 5l4 4"/></svg>
              Back
            </button>
          )}
          {step<2 ? (
            <button className="btn btn-p btn-sm"
              style={{padding:"8px 20px",fontSize:12.5,borderRadius:10,boxShadow:"0 3px 12px rgba(124,58,237,0.25)"}}
              onClick={()=>{
                if(step===0&&!step0done){toast("Name all modules and chapters first.");return;}
                setStep((step+1) as 0|1|2);
              }}>
              Continue
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 7h8M8 4l3 3-3 3"/></svg>
            </button>
          ) : (
            <button className="btn btn-p btn-sm"
              style={{padding:"8px 22px",fontSize:12.5,borderRadius:10,boxShadow:"0 3px 12px rgba(124,58,237,0.3)"}}
              onClick={save}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>
              Save Modules
            </button>
          )}
        </div>

      </div>{/* /cmm-fs */}

      {/* Activity Selection Panel */}
      {activityPanelOpen && (
        <div className="cmm-activity-panel" onClick={e => e.target === e.currentTarget && setActivityPanelOpen(false)}>
          <div className="cmm-activity-modal">
            <div className="cmm-activity-modal-hdr">
              <div className="cmm-activity-modal-title">Select Activity</div>
              <div className="cmm-activity-modal-sub">
                Choose from {publishedActivities.length} published activit{publishedActivities.length === 1 ? "y" : "ies"}
              </div>
            </div>
            <div className="cmm-activity-modal-body">
              {publishedActivities.length === 0 ? (
                <div style={{textAlign:"center",padding:"40px 20px",color:"var(--t3)"}}>
                  <div style={{fontSize:40,marginBottom:12}}>🧩</div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--t2)",marginBottom:6}}>No Published Activities</div>
                  <div style={{fontSize:11.5}}>Create and publish activities in the Activity Builder first.</div>
                </div>
              ) : (
                <div className="cmm-activity-grid">
                  {publishedActivities.map(activity => {
                    const meta = ACT_META[activity.type];
                    return (
                      <div
                        key={activity.id}
                        className="cmm-activity-card"
                        onClick={() => handleSelectActivity(activity)}
                      >
                        <div className="cmm-activity-card-icon" style={{
                          background: meta.bg,
                          border: `1.5px solid ${meta.border}`,
                          color: meta.color
                        }}>
                          {meta.icon}
                        </div>
                        <div className="cmm-activity-card-title">{activity.title}</div>
                        <div className="cmm-activity-card-type">{meta.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="cmm-activity-modal-foot">
              <button className="btn btn-s btn-sm" onClick={() => setActivityPanelOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
