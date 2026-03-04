'use client'

import { useState, useEffect } from "react";
import {
  LessonBlocks, blankContentBlock,
  type LessonBlock, type Activity, ACT_META,
} from "./ActivityBuilderPanel";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ChapterType = "lesson" | "quiz" | "assessment";
export type BlockType = "content" | "media" | "activity";

export interface ChapterMedia { type: "none"|"video"|"presentation"; url: string; label?: string; }
export interface QuizQuestion  { q: string; opts: string[]; ans: number; }

export interface UnifiedBlock {
  id: string;
  type: BlockType;
  // Content block
  title?: string;
  body?: string;
  // Media block
  mediaType?: "none"|"video"|"presentation";
  mediaUrl?: string;
  mediaLabel?: string;
  // Activity block
  activity?: Activity;
}

export interface ChapterContent {
  title:      string;
  type:       ChapterType;
  body?:      string;
  media:      ChapterMedia;
  questions?: QuizQuestion[];
  blocks?:    UnifiedBlock[];  // NEW: unified blocks for lessons
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
  publishedActivities: Activity[];
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

function blankUnifiedBlock(type: BlockType): UnifiedBlock {
  const base = { id: mkId(), type };
  if (type === "content") return { ...base, title: "", body: "" };
  if (type === "media") return { ...base, mediaType: "video" as const, mediaUrl: "", mediaLabel: "" };
  return base; // activity
}

function blankChapter(type:ChapterType="lesson"):Chapter {
  return { title:"", type, done:false, content:{
    title:"", type, body:undefined,
    questions: type!=="lesson" ? [{q:"",opts:["","","",""],ans:0}] : undefined,
    media: {type:"none",url:""},
    blocks: type==="lesson" ? [] : undefined,
  } as any };
}
function blankModule():Module { return { title:"", done:false, chapters:[blankChapter()] }; }

// Migration: Convert old segments format to new blocks format
function migrateOldFormat(modules: Module[]): Module[] {
  return modules.map(mod => ({
    ...mod,
    chapters: mod.chapters.map(ch => {
      if (ch.type !== "lesson") return ch;
      
      // Check if already using new format
      if (ch.content.blocks && Array.isArray(ch.content.blocks)) return ch;
      
      // Migrate from old segments format
      const oldSegments = (ch.content as any).segments as LessonBlock[] | undefined;
      if (!oldSegments || oldSegments.length === 0) {
        return { ...ch, content: { ...ch.content, blocks: [] } };
      }
      
      // Convert old LessonBlock format to new UnifiedBlock format
      const newBlocks: UnifiedBlock[] = oldSegments.map(seg => {
        if (seg.kind === "content") {
          return {
            id: seg.id,
            type: "content" as const,
            title: "", // Old format didn't have titles
            body: seg.body || ""
          };
        } else {
          // activity
          return {
            id: seg.id,
            type: "activity" as const,
            activity: seg.activity
          };
        }
      });
      
      return {
        ...ch,
        content: {
          ...ch.content,
          blocks: newBlocks
        }
      };
    })
  }));
}

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

.cmm-fs {
  position:fixed; inset:0; z-index:1001;
  display:flex; flex-direction:column;
  background:var(--bg,#f8f7ff);
  animation:cmm-in .24s cubic-bezier(.16,1,.3,1) both;
}

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
  display:flex; align-items:center; justifycontent:center;
}
.cmm-hdr-text { flex-shrink:0; }
.cmm-hdr-title { font-size:14px; font-weight:700; color:var(--t1,#18103a); line-height:1.2; }
.cmm-hdr-sub   { font-size:11px; color:var(--t3,#8e7ec0); margin-top:1px; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cmm-hdr-divider { width:1px; height:28px; background:var(--border); flex-shrink:0; }
.cmm-hdr-prog { display:flex; flex-direction:column; gap:4px; width:140px; flex-shrink:0; }
.cmm-hdr-prog-bar { height:4px; border-radius:4px; background:var(--border,rgba(124,58,237,0.1)); overflow:hidden; }
.cmm-hdr-prog-fill { height:100%; border-radius:4px; background:linear-gradient(90deg,var(--purple,#7c3aed),var(--teal,#0d9488)); transition:width .5s cubic-bezier(.16,1,.3,1); }
.cmm-hdr-prog-lbl { font-size:9.5px; font-weight:600; color:var(--t3,#a89dc8); text-align:right; }

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

.cmm-body { flex:1; display:flex; overflow:hidden; }

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
.cmm-sb-title { font-size:13px; font-weight:700; color:var(--t1,#18103a); margin-bottom:4px; letter-spacing:-.01em; }
.cmm-sb-sub { font-size:10.5px; color:var(--t3,#a89dc8); }
.cmm-sb-scroll { flex:1; overflow-y:auto; padding:12px; }

.cmm-mod-card {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(109,40,217,0.1));
  border-radius:12px; padding:12px; margin-bottom:10px;
  transition:all .15s; cursor:pointer;
}
.cmm-mod-card:hover { border-color:rgba(109,40,217,0.25); background:#faf9ff; transform:translateX(2px); }
.cmm-mod-card.sel { border-color:var(--purple,#7c3aed); background:#f0ebff; box-shadow:0 2px 10px rgba(124,58,237,0.12); }

.cmm-ch-item {
  display:flex; align-items:center; gap:8px;
  padding:7px 9px; border-radius:8px; background:var(--bg,#faf9ff);
  border:1.5px solid var(--border,rgba(109,40,217,0.08));
  margin-bottom:6px; cursor:pointer; transition:all .14s;
}
.cmm-ch-item:hover:not(.sel) { background:#f5f3ff; border-color:rgba(109,40,217,0.18); transform:translateX(2px); }
.cmm-ch-item.sel { border-color:var(--purple,#7c3aed); background:#ede9fe; }

.cmm-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
.cmm-canvas { flex:1; overflow-y:auto; padding:24px; }

.cmm-field { margin-bottom:16px; }
.cmm-lbl { display:block; font-size:11.5px; font-weight:700; color:var(--t2,#4a3870); margin-bottom:7px; letter-spacing:.02em; text-transform:uppercase; }
.cmm-input, .cmm-sel, .cmm-ta {
  width:100%; padding:10px 12px; border-radius:8px;
  border:1.5px solid var(--border,rgba(109,40,217,0.1));
  background:var(--surface,#fff); color:var(--t1,#18103a);
  font-size:13px; font-family:inherit; transition:all .15s;
}
.cmm-input:focus, .cmm-sel:focus, .cmm-ta:focus {
  outline:none; border-color:var(--purple,#7c3aed);
  box-shadow:0 0 0 3px rgba(124,58,237,0.08);
}
.cmm-ta { resize:vertical; line-height:1.55; }

.cmm-actions {
  display:flex; align-items:center; gap:10px; padding:14px 24px;
  background:linear-gradient(135deg,rgba(124,58,237,0.04),rgba(13,148,136,0.04));
  border-bottom:1px solid var(--border,rgba(124,58,237,0.1));
}
.cmm-actions-title { flex:1; font-size:14px; font-weight:700; color:var(--t1,#18103a); }
.cmm-action-btn {
  display:flex; align-items:center; gap:6px;
  padding:8px 14px; border-radius:8px;
  background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488));
  color:#fff; font-size:12px; font-weight:600;
  border:none; cursor:pointer; font-family:inherit;
  transition:all .2s; box-shadow:0 2px 8px rgba(124,58,237,0.2);
}
.cmm-action-btn:hover { transform:translateY(-2px); box-shadow:0 4px 14px rgba(124,58,237,0.3); }
.cmm-action-btn:active { transform:translateY(0); }
.cmm-action-btn.secondary {
  background:linear-gradient(135deg,#0d9488,#0284c7);
}

.cmm-foot {
  height:56px; flex-shrink:0;
  display:flex; align-items:center; gap:10px; padding:0 24px;
  background:var(--surface,#fff);
  border-top:1px solid var(--border,rgba(124,58,237,0.1));
  box-shadow:0 -1px 6px rgba(124,58,237,0.04);
}

.btn { display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:8px; font-size:12px; font-weight:600; border:none; cursor:pointer; font-family:inherit; transition:all .15s; }
.btn svg { width:13px; height:13px; }
.btn-s { background:transparent; color:var(--t2,#4a3870); border:1.5px solid var(--border,rgba(109,40,217,0.12)); }
.btn-s:hover { background:rgba(124,58,237,0.04); border-color:rgba(109,40,217,0.2); }
.btn-p { background:linear-gradient(135deg,var(--purple,#7c3aed),var(--teal,#0d9488)); color:#fff; border:none; }
.btn-p:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(124,58,237,0.3); }
.btn-p:active { transform:translateY(0); }
.btn-sm { padding:6px 12px; font-size:11px; }
.btn-sm svg { width:11px; height:11px; }

.cmm-media { margin-top:12px; border-radius:10px; overflow:hidden; border:1.5px solid var(--border); }
.cmm-media iframe { width:100%; height:360px; border:none; display:block; }

/* Unified block styles */
.ub-block {
  background:var(--surface,#fff);
  border:1.5px solid var(--border,rgba(124,58,237,0.1));
  border-radius:12px; padding:16px; margin-bottom:14px;
  transition:all .15s; cursor:move;
}
.ub-block:hover { border-color:rgba(124,58,237,0.2); box-shadow:0 2px 10px rgba(124,58,237,0.08); }
.ub-block.dragging { opacity:0.5; }
.ub-block.drag-over { border-color:var(--purple); border-style:dashed; }

.ub-header {
  display:flex; align-items:center; gap:10px; margin-bottom:12px;
}
.ub-type-badge {
  padding:4px 10px; border-radius:7px;
  font-size:10px; font-weight:700; text-transform:uppercase;
  letter-spacing:.06em;
}
.ub-handle {
  width:24px; height:24px; border-radius:6px;
  background:rgba(124,58,237,0.08); color:var(--t3);
  display:flex; align-items:center; justify-content:center;
  font-size:12px; cursor:grab; margin-left:auto;
}
.ub-handle:active { cursor:grabbing; }
.ub-del {
  width:24px; height:24px; border-radius:6px;
  border:1.5px solid rgba(239,68,68,0.2);
  background:rgba(239,68,68,0.05); color:#dc2626;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; font-size:14px; transition:all .15s;
}
.ub-del:hover { background:rgba(239,68,68,0.1); }

/* Activity selection panel */
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
  const [closing,  setClosing]  = useState(false);
  const [activityPanelOpen, setActivityPanelOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(()=>{ 
    if(open&&course){ 
      const rawModules = course.modules ? dc(course.modules) : [blankModule()];
      const migratedModules = migrateOldFormat(rawModules);
      setModules(migratedModules); 
      setStep(0); 
      setSelMod(0); 
      setSelCh(0); 
      setClosing(false);
      console.log('CourseModuleModal opened - modules:', migratedModules);
      console.log('CourseModuleModal - publishedActivities:', publishedActivities);
    } 
  },[open,course]); // Removed publishedActivities from dependencies

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

  // Unified blocks handlers
  const getBlocks = () => {
    const blocks = (c?.content.blocks || []) as UnifiedBlock[];
    console.log('getBlocks called - current chapter:', c?.title, 'blocks:', blocks);
    return blocks;
  };
  const setBlocks = (blocks: UnifiedBlock[]) => {
    console.log('setBlocks called - selMod:', selMod, 'selCh:', selCh, 'blocks:', blocks);
    const u = [...modules];
    u[selMod].chapters[selCh].content.blocks = blocks as any;
    console.log('Updated modules:', u);
    setModules(u);
  };

  const addBlock = (type: BlockType) => {
    if (!c || c.type !== "lesson") return;
    let newBlock: UnifiedBlock;
    if (type === "activity") {
      if (publishedActivities.length === 0) {
        toast("No published activities available. Create and publish activities first.");
        return;
      }
      setActivityPanelOpen(true);
      return;
    }
    newBlock = blankUnifiedBlock(type);
    const currentBlocks = getBlocks();
    console.log('Current blocks:', currentBlocks);
    console.log('Adding new block:', newBlock);
    const updatedBlocks = [...currentBlocks, newBlock];
    console.log('Updated blocks:', updatedBlocks);
    setBlocks(updatedBlocks);
    toast(`${type.charAt(0).toUpperCase() + type.slice(1)} block added`);
  };

  const handleSelectActivity = (activity: Activity) => {
    const newBlock: UnifiedBlock = {
      id: mkId(),
      type: "activity",
      activity: dc(activity)
    };
    const currentBlocks = getBlocks();
    console.log('Adding activity block:', newBlock);
    console.log('Current blocks before activity:', currentBlocks);
    const updatedBlocks = [...currentBlocks, newBlock];
    console.log('Updated blocks after activity:', updatedBlocks);
    setBlocks(updatedBlocks);
    setActivityPanelOpen(false);
    toast(`Activity "${activity.title}" added`);
  };

  const updateBlock = (idx: number, updates: Partial<UnifiedBlock>) => {
    const blocks = [...getBlocks()];
    blocks[idx] = { ...blocks[idx], ...updates };
    setBlocks(blocks);
  };

  const deleteBlock = (idx: number) => {
    setBlocks(getBlocks().filter((_, i) => i !== idx));
    toast("Block deleted");
  };

  // Drag & drop
  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    
    const blocks = [...getBlocks()];
    const [removed] = blocks.splice(dragIdx, 1);
    blocks.splice(dropIdx, 0, removed);
    setBlocks(blocks);
    setDragIdx(null);
    setDragOverIdx(null);
    toast("Block reordered");
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  // Quiz handlers
  const updChCont=(mi:number,ci:number,k:keyof ChapterContent,v:any)=>{ const u=[...modules]; u[mi].chapters[ci].content={...u[mi].chapters[ci].content,[k]:v}; setModules(u); };

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
            <button className={`cmm-wstep${step===0?" on":""}${step>0?" done":""}`} onClick={()=>setStep(0)}>
              <div className="cmm-wstep-n">{step>0?"✓":"1"}</div>
              Structure
            </button>
            <button className={`cmm-wstep${step===1?" on":""}${step>1?" done":""}`} onClick={()=>{if(!step0done){toast("Complete structure first");return;}setStep(1);}}>
              <div className="cmm-wstep-n">{step>1?"✓":"2"}</div>
              Content
            </button>
            <button className={`cmm-wstep${step===2?" on":""}`} onClick={()=>{if(!step0done){toast("Complete structure first");return;}setStep(2);}}>
              <div className="cmm-wstep-n">3</div>
              Review
            </button>
          </div>
          <div style={{flex:1}}/>
          <div className="cmm-hdr-prog">
            <div className="cmm-hdr-prog-bar">
              <div className="cmm-hdr-prog-fill" style={{width:`${progressPct}%`}}/>
            </div>
            <div className="cmm-hdr-prog-lbl">{titledCh} / {totalCh} titled</div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="cmm-body">

          {/* Sidebar */}
          <div className="cmm-sb">
            <div className="cmm-sb-hdr">
              <div className="cmm-sb-title">Course Structure</div>
              <div className="cmm-sb-sub">{modules.length} module{modules.length!==1?"s":""} · {totalCh} chapter{totalCh!==1?"s":""}</div>
            </div>
            <div className="cmm-sb-scroll">
              {modules.map((mod,mi)=>(
                <div key={mi} className={`cmm-mod-card${selMod===mi?" sel":""}`} onClick={()=>{setSelMod(mi);setSelCh(0);}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <div style={{width:24,height:24,borderRadius:7,background:"var(--purple,#7c3aed)",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{mi+1}</div>
                    <div style={{flex:1,fontSize:12.5,fontWeight:700,color:mod.title?"var(--t1,#18103a)":"var(--t3,#c4bdd8)"}}>{mod.title||<em>Untitled module</em>}</div>
                    <button onClick={(e)=>{e.stopPropagation();delMod(mi);}} style={{width:22,height:22,borderRadius:6,border:"1.5px solid rgba(239,68,68,0.15)",background:"rgba(239,68,68,0.05)",color:"#dc2626",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>×</button>
                  </div>
                  {mod.chapters.map((ch,ci)=>{
                    const meta=TM[ch.type];
                    return(
                      <div key={ci} className={`cmm-ch-item${selMod===mi&&selCh===ci?" sel":""}`} onClick={(e)=>{e.stopPropagation();setSelMod(mi);setSelCh(ci);}}>
                        <div style={{width:20,height:20,borderRadius:6,background:meta.bg,color:meta.c,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ci+1}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11.5,fontWeight:600,color:ch.title?"var(--t1,#18103a)":"var(--t3,#c4bdd8)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.title||<em>Untitled</em>}</div>
                          <div style={{fontSize:9,color:meta.c,fontWeight:700,marginTop:1}}>{meta.ico} {meta.lbl}</div>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={(e)=>{e.stopPropagation();addCh(mi);}} style={{width:"100%",padding:"6px",marginTop:6,borderRadius:7,border:"1.5px dashed var(--border,rgba(109,40,217,0.2))",background:"transparent",color:"var(--purple,#7c3aed)",fontSize:10.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Chapter</button>
                </div>
              ))}
              <button onClick={addMod} style={{width:"100%",padding:"10px",borderRadius:10,border:"1.5px dashed var(--border,rgba(109,40,217,0.2))",background:"var(--surface,#fff)",color:"var(--purple,#7c3aed)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",marginTop:8}}>+ Add Module</button>
            </div>
          </div>

          {/* Main Content */}
          <div className="cmm-main">
            
            {/* Step 0: Structure */}
            {step===0 && (
              <>
                {m&&c&&(
                  <>
                    <div className="cmm-actions" style={{background:"linear-gradient(to right,rgba(124,58,237,0.03),rgba(13,148,136,0.03))"}}>
                      <div className="cmm-actions-title">Module & Chapter Details</div>
                    </div>
                    <div className="cmm-canvas">
                      <div className="cmm-field">
                        <label className="cmm-lbl">Module {selMod+1} Title</label>
                        <input className="cmm-input" value={m.title} onChange={e=>updMod(selMod,"title",e.target.value)} placeholder="e.g., Introduction to POS Systems"/>
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
              </>
            )}

            {/* Step 1: Content editing */}
            {step===1 && (
              c ? (
                <>
                  {/* Action bar */}
                  {c.type==="lesson" && (
                    <div className="cmm-actions">
                      <div className="cmm-actions-title">{c.title||"Untitled Chapter"}</div>
                      <button className="cmm-action-btn" onClick={()=>addBlock("content")}>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round"><path d="M7 1v12M1 7h12"/></svg>
                        Content
                      </button>
                      <button className="cmm-action-btn secondary" onClick={()=>addBlock("media")}>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="12" height="8" rx="1"/><path d="M5 6l4 2.5-4 2.5V6z"/></svg>
                        Media
                      </button>
                      <button className="cmm-action-btn" style={{background:"linear-gradient(135deg,#d97706,#7c3aed)"}} onClick={()=>addBlock("activity")}>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="8" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="1.5" y="8" width="4.5" height="4.5" rx="1"/><path d="M10.25 8v4.5M8 10.25h4.5"/></svg>
                        Activity
                      </button>
                    </div>
                  )}

                  <div className="cmm-canvas">
                    {/* Lesson: Unified blocks */}
                    {c.type==="lesson" ? (
                      <div>
                        {(() => {
                          const blocks = getBlocks();
                          console.log('Rendering blocks for chapter:', c.title, 'blocks:', blocks);
                          return blocks.length === 0 ? (
                          <div style={{textAlign:"center",padding:"60px 20px",color:"var(--t3,#a89dc8)",fontSize:13}}>
                            <div style={{fontSize:42,marginBottom:12}}>📝</div>
                            <div style={{fontWeight:600,marginBottom:6}}>No content blocks yet</div>
                            <div style={{fontSize:11.5}}>Use the buttons above to add content, media, or activities</div>
                          </div>
                        ) : (
                          blocks.map((block,idx)=>(
                            <div
                              key={block.id}
                              className={`ub-block${dragIdx===idx?" dragging":""}${dragOverIdx===idx?" drag-over":""}`}
                              draggable
                              onDragStart={()=>handleDragStart(idx)}
                              onDragOver={(e)=>handleDragOver(e,idx)}
                              onDrop={(e)=>handleDrop(e,idx)}
                              onDragEnd={handleDragEnd}
                            >
                              <div className="ub-header">
                                <div className="ub-type-badge" style={{
                                  background: block.type==="content" ? "#e0f2fe" : block.type==="media" ? "#fef3c7" : "#ede9fe",
                                  color: block.type==="content" ? "#0284c7" : block.type==="media" ? "#d97706" : "#7c3aed"
                                }}>
                                  {block.type==="content"&&"📝 Content"}
                                  {block.type==="media"&&"🎥 Media"}
                                  {block.type==="activity"&&"🧩 Activity"}
                                </div>
                                <div style={{flex:1}}/>
                                <div className="ub-handle">⋮⋮</div>
                                <button className="ub-del" onClick={()=>deleteBlock(idx)}>×</button>
                              </div>

                              {/* Content block */}
                              {block.type==="content"&&(
                                <div>
                                  <div className="cmm-field" style={{marginBottom:10}}>
                                    <input
                                      value={block.title||""}
                                      onChange={e=>updateBlock(idx,{title:e.target.value})}
                                      placeholder="Content block title..."
                                      className="cmm-input"
                                      style={{fontWeight:600}}
                                    />
                                  </div>
                                  <textarea
                                    value={block.body||""}
                                    onChange={e=>updateBlock(idx,{body:e.target.value})}
                                    placeholder="Enter content text..."
                                    className="cmm-ta"
                                    rows={4}
                                  />
                                </div>
                              )}

                              {/* Media block */}
                              {block.type==="media"&&(
                                <div>
                                  <div className="cmm-field" style={{marginBottom:10}}>
                                    <select className="cmm-sel" value={block.mediaType||"video"} onChange={e=>updateBlock(idx,{mediaType:e.target.value as any})}>
                                      <option value="video">🎥 Video</option>
                                      <option value="presentation">📊 Presentation</option>
                                    </select>
                                  </div>
                                  <div className="cmm-field">
                                    <input className="cmm-input" value={block.mediaUrl||""} onChange={e=>updateBlock(idx,{mediaUrl:e.target.value})} placeholder="YouTube, Vimeo, Google Drive, etc."/>
                                  </div>
                                  {block.mediaUrl&&(
                                    <div className="cmm-media">
                                      {block.mediaType==="video"&&videoEmbed(block.mediaUrl)&&<iframe src={videoEmbed(block.mediaUrl)!} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>}
                                      {block.mediaType==="presentation"&&presentationEmbed(block.mediaUrl)&&<iframe src={presentationEmbed(block.mediaUrl)!}/>}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Activity block */}
                              {block.type==="activity"&&block.activity&&(
                                <div style={{padding:"10px 12px",borderRadius:8,background:"rgba(124,58,237,0.04)",border:"1.5px solid rgba(124,58,237,0.12)"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                                    <div style={{fontSize:20}}>{ACT_META[block.activity.type]?.icon||"🧩"}</div>
                                    <div style={{flex:1}}>
                                      <div style={{fontSize:13,fontWeight:700,color:"var(--t1,#18103a)"}}>{block.activity.title}</div>
                                      <div style={{fontSize:10.5,color:"var(--t3,#a89dc8)",marginTop:2}}>{ACT_META[block.activity.type]?.label||block.activity.type}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        );
                        })()}
                      </div>
                    ) : (
                      /* Quiz/Assessment */
                      <div>
                        <div className="cmm-field">
                          <label className="cmm-lbl">Chapter Body (optional)</label>
                          <textarea className="cmm-ta" value={c.content.body??""} onChange={e=>updChCont(selMod,selCh,"body",e.target.value)} placeholder="Add introductory text..." rows={6}/>
                        </div>
                        <div style={{marginTop:20}}>
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
                          const blocks = (ch.content.blocks||[]) as UnifiedBlock[];
                          const acts  = blocks.filter(b=>b.type==="activity").length;
                          const contents= blocks.filter(b=>b.type==="content").length;
                          const medias= blocks.filter(b=>b.type==="media").length;
                          return (
                            <div key={ci} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,background:"var(--bg,#faf9ff)",border:`1.5px solid ${ch.title?"var(--border,#ede9f6)":"rgba(220,38,38,0.18)"}`}}>
                              <div style={{width:22,height:22,borderRadius:6,background:meta.bg,color:meta.c,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ci+1}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:600,color:ch.title?"var(--t1,#18103a)":"var(--red,#dc2626)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                  {ch.title||<em>Missing title!</em>}
                                </div>
                                <div style={{fontSize:9.5,color:"var(--t3)",marginTop:1,display:"flex",gap:5,alignItems:"center"}}>
                                  <span style={{color:meta.c,fontWeight:700,textTransform:"uppercase",letterSpacing:".04em"}}>{meta.ico} {meta.lbl}</span>
                                  {ch.type==="lesson"&&blocks.length>0&&<span>· {contents}📝 {medias}🎥 {acts}🧩</span>}
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
            <button className="btn btn-p btn-sm" onClick={()=>{if(step===0&&!step0done){toast("Complete titles first");return;}setStep((step+1) as 0|1|2);}}>
              Next
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 1l4 4-4 4"/></svg>
            </button>
          ) : (
            <button className="btn btn-p btn-sm" onClick={save}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 7L5.5 12 2 8.7"/></svg>
              Save Modules
            </button>
          )}
        </div>

        {/* Activity Selection Panel */}
        {activityPanelOpen && (
          <div className="cmm-activity-panel" onClick={()=>setActivityPanelOpen(false)}>
            <div className="cmm-activity-modal" onClick={e=>e.stopPropagation()}>
              <div className="cmm-activity-modal-hdr">
                <div className="cmm-activity-modal-title">Select an Activity</div>
                <div className="cmm-activity-modal-sub">Choose from your published activities</div>
              </div>
              <div className="cmm-activity-modal-body">
                {publishedActivities.length===0?(
                  <div style={{textAlign:"center",padding:"40px 20px",color:"var(--t3,#a89dc8)",fontSize:13}}>
                    <div style={{fontSize:32,marginBottom:8}}>🧩</div>
                    <div>No published activities available</div>
                  </div>
                ):(
                  <div className="cmm-activity-grid">
                    {publishedActivities.map(act=>{
                      const meta=ACT_META[act.type];
                      return(
                        <div key={act.id} className="cmm-activity-card" onClick={()=>handleSelectActivity(act)}>
                          <div className="cmm-activity-card-icon" style={{background:meta.bg,color:meta.color}}>{meta.icon}</div>
                          <div className="cmm-activity-card-title">{act.title}</div>
                          <div className="cmm-activity-card-type">{meta.label}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="cmm-activity-modal-foot">
                <button className="btn btn-s btn-sm" onClick={()=>setActivityPanelOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>{/* /cmm-fs */}
    </>
  );
}
