'use client'

/**
 * CourseModuleModal.tsx  (updated)
 * ────────────────────────────────────────────────────────────────────────────
 * Changes from original:
 *  • The "Activities" tab now launches the full-screen ActivityManager
 *    instead of the in-panel segment editors.
 *  • Passing activities back from ActivityManager → chapter.content.segments
 *  • All segment/activity types are imported from ActivityManager.tsx
 * ────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Course, Module, Chapter, ChapterType, ChapterMedia, MediaType } from "../../Data/types";
import ActivityManager, { type Activity } from "./ActivityManager";

interface Props {
  open:      boolean;
  course:    Course | null;
  courseIdx: number | null;
  onClose:   () => void;
  onSave:    (idx: number, modules: Module[]) => void;
  toast:     (msg: string) => void;
}

function dc<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

const TM: Record<ChapterType, { c: string; bg: string; lbl: string; ico: string }> = {
  lesson:     { c: "#0284c7", bg: "#e0f2fe", lbl: "Lesson",     ico: "📖" },
  quiz:       { c: "#7c3aed", bg: "#ede9fe", lbl: "Quiz",       ico: "❓" },
  assessment: { c: "#d97706", bg: "#fef3c7", lbl: "Assessment", ico: "📝" },
};

const IN: React.CSSProperties = {
  width:"100%", border:"1px solid rgba(124,58,237,0.14)", borderRadius:8,
  padding:"7px 10px", fontSize:12.5, background:"#f5f3ff", outline:"none",
  color:"#18103a", fontFamily:"inherit",
};
const LBL: React.CSSProperties = {
  fontSize:9.5, fontWeight:700, letterSpacing:".1em",
  textTransform:"uppercase", color:"#8e7ec0", display:"block", marginBottom:4,
};

function blankChapter(type: ChapterType = "lesson"): Chapter {
  return {
    title:"", type, done:false,
    content:{
      title:"", type,
      body:      type==="lesson" ? "" : undefined,
      questions: type!=="lesson" ? [{q:"",opts:["","","",""],ans:0}] : undefined,
      media:     {type:"none",url:""},
      segments:  [],
    } as any,
  };
}
function blankModule(): Module {
  return { title:"", done:false, chapters:[blankChapter("lesson")] };
}
function videoEmbed(url: string): string | null {
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
function presentationEmbed(url: string): string | null {
  if (!url?.trim()) return null;
  const gs = url.match(/docs\.google\.com\/presentation\/d\/([^/?]+)/);
  if (gs) return `https://docs.google.com/presentation/d/${gs[1]}/embed?start=false&loop=false`;
  const gd = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  if (url.includes("onedrive.live")||url.includes("sharepoint.com"))
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  return null;
}

const Grip = () => (
  <svg width="7" height="12" viewBox="0 0 7 12" fill="#c4bdd8" style={{ flexShrink:0, cursor:"grab" }}>
    <circle cx="2" cy="2" r="1"/><circle cx="5" cy="2" r="1"/>
    <circle cx="2" cy="6" r="1"/><circle cx="5" cy="6" r="1"/>
    <circle cx="2" cy="10" r="1"/><circle cx="5" cy="10" r="1"/>
  </svg>
);

// ─── ACTIVITY TYPE META (display only) ───────────────────────────────────────
const ACT_TYPE_ICONS: Record<string, string> = {
  accordion:"🗂️", flashcard:"🃏", fillblank:"✏️",
  checklist:"☑️", hotspot:"🎯", matching:"🔗",
};
const ACT_TYPE_COLORS: Record<string, { color:string; bg:string }> = {
  accordion: { color:"#0284c7", bg:"#e0f2fe" },
  flashcard: { color:"#7c3aed", bg:"#ede9fe" },
  fillblank: { color:"#0f766e", bg:"#ccfbf1" },
  checklist: { color:"#15803d", bg:"#dcfce7" },
  hotspot:   { color:"#d97706", bg:"#fef3c7" },
  matching:  { color:"#9333ea", bg:"#f3e8ff" },
};

export default function CourseModuleModal({ open, course, courseIdx, onClose, onSave, toast }: Props) {
  const [modules,     setModules]     = useState<Module[]>([]);
  const [selMod,      setSelMod]      = useState(0);
  const [selCh,       setSelCh]       = useState(0);
  const [inited,      setInited]      = useState(false);
  const [activeTab,   setActiveTab]   = useState<"content"|"activities">("content");
  // Activity manager state
  const [actMgrOpen,  setActMgrOpen]  = useState(false);

  // Drag state
  const [chDragSrc,   setChDragSrc]   = useState<{ mi: number; ci: number } | null>(null);
  const [chDragOver,  setChDragOver]  = useState<number | null>(null);
  const [modDragSrc,  setModDragSrc]  = useState<number | null>(null);
  const [modDragOver, setModDragOver] = useState<number | null>(null);

  useEffect(() => {
    if (open && course && !inited) {
      setModules(dc(course.modules?.length ? course.modules : [blankModule()]));
      setSelMod(0); setSelCh(0); setInited(true);
    }
    if (!open && inited) setInited(false);
  }, [open, course, inited]);

  if (!open || !course || courseIdx === null) return null;

  const mod = modules[selMod];
  const ch  = mod?.chapters[selCh];
  const chKey = `${selMod}-${selCh}`;

  // ── Segment helpers ────────────────────────────────────────────────────────
  const getActivities = (): Activity[] => (ch?.content as any)?.segments ?? [];
  const setActivities = (acts: Activity[]) => {
    const u = dc(modules);
    (u[selMod].chapters[selCh].content as any).segments = acts;
    setModules(u);
  };

  // ── Module ops ─────────────────────────────────────────────────────────────
  const addMod = () => {
    const u = [...modules, blankModule()];
    setModules(u); setSelMod(u.length-1); setSelCh(0);
  };
  const delModAt = (mi: number) => {
    if (modules.length===1) { toast("Need at least one module."); return; }
    const u = modules.filter((_,i)=>i!==mi);
    setModules(u); setSelMod(Math.min(mi,u.length-1)); setSelCh(0);
  };
  const updModTitle = (mi: number, v: string) => {
    const u = dc(modules); u[mi].title=v; setModules(u);
  };
  const moveMod = (from: number, to: number) => {
    if (to<0||to>=modules.length) return;
    const u = dc(modules); const [r]=u.splice(from,1); u.splice(to,0,r);
    setModules(u); setSelMod(to);
  };

  // ── Chapter ops ────────────────────────────────────────────────────────────
  const addCh = (type: ChapterType) => {
    const u = dc(modules); u[selMod].chapters.push(blankChapter(type));
    setModules(u); setSelCh(u[selMod].chapters.length-1);
  };
  const delLastCh = () => {
    const len = modules[selMod].chapters.length;
    if (len===1) { toast("Need at least one chapter."); return; }
    const u = dc(modules); u[selMod].chapters.splice(len-1,1);
    setModules(u); setSelCh(Math.min(selCh,u[selMod].chapters.length-1));
  };
  const delChAt = (ci: number) => {
    if (modules[selMod].chapters.length===1) { toast("Need at least one chapter."); return; }
    const u = dc(modules); u[selMod].chapters.splice(ci,1);
    setModules(u); setSelCh(Math.min(selCh,u[selMod].chapters.length-1));
  };
  const moveCh = (from: number, to: number) => {
    if (to<0||to>=modules[selMod].chapters.length) return;
    const u = dc(modules); const [r]=u[selMod].chapters.splice(from,1); u[selMod].chapters.splice(to,0,r);
    setModules(u); setSelCh(to);
  };
  const updChField = (field: "title"|"type", val: string) => {
    const u = dc(modules); const c = u[selMod].chapters[selCh];
    if (field==="title") { c.title=val; c.content.title=val; }
    else {
      const t = val as ChapterType; c.type=t; c.content.type=t;
      c.content.body      = t==="lesson" ? (c.content.body??"") : undefined;
      c.content.questions = t!=="lesson" ? (c.content.questions??[{q:"",opts:["","","",""],ans:0}]) : undefined;
      c.content.media   ??= {type:"none",url:""};
      (c.content as any).segments ??= [];
    }
    setModules(u);
  };
  const updBody = (v: string) => {
    const u=dc(modules); u[selMod].chapters[selCh].content.body=v; setModules(u);
  };
  const updMedia = (media: ChapterMedia) => {
    const u=dc(modules); u[selMod].chapters[selCh].content.media=media; setModules(u);
  };

  // ── Quiz ops ───────────────────────────────────────────────────────────────
  const addQ = () => {
    const u=dc(modules); u[selMod].chapters[selCh].content.questions??=[];
    u[selMod].chapters[selCh].content.questions!.push({q:"",opts:["","","",""],ans:0});
    setModules(u);
  };
  const delQ = (qi: number) => {
    const u=dc(modules); const qs=u[selMod].chapters[selCh].content.questions!;
    if (qs.length===1) { toast("Need at least one question."); return; }
    qs.splice(qi,1); setModules(u);
  };
  const updQ = (qi: number, field: "q"|"ans", val: string|number) => {
    const u=dc(modules); const q=u[selMod].chapters[selCh].content.questions![qi];
    if (field==="q") q.q=val as string; else q.ans=val as number;
    setModules(u);
  };
  const updOpt = (qi: number, oi: number, val: string) => {
    const u=dc(modules); u[selMod].chapters[selCh].content.questions![qi].opts[oi]=val; setModules(u);
  };

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onChDragStart = (ci: number) => setChDragSrc({ mi:selMod, ci });
  const onChDragOver  = (e: React.DragEvent, ci: number) => { e.preventDefault(); setChDragOver(ci); };
  const onChDrop      = (ci: number) => {
    if (chDragSrc&&chDragSrc.mi===selMod&&chDragSrc.ci!==ci) moveCh(chDragSrc.ci,ci);
    setChDragSrc(null); setChDragOver(null);
  };
  const onChDragEnd   = () => { setChDragSrc(null); setChDragOver(null); };
  const onModDragStart = (e: React.DragEvent, mi: number) => { e.stopPropagation(); setModDragSrc(mi); };
  const onModDragOver  = (e: React.DragEvent, mi: number) => { e.preventDefault(); e.stopPropagation(); setModDragOver(mi); };
  const onModDrop      = (e: React.DragEvent, mi: number) => {
    e.stopPropagation();
    if (modDragSrc!==null&&modDragSrc!==mi) moveMod(modDragSrc,mi);
    setModDragSrc(null); setModDragOver(null);
  };
  const onModDragEnd   = () => { setModDragSrc(null); setModDragOver(null); };

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = () => {
    for (const m of modules) {
      if (!m.title.trim()) { toast("All modules need a title."); return; }
      for (const c of m.chapters) {
        if (!c.title.trim()) { toast("All chapters need a title."); return; }
        if (c.type!=="lesson") {
          const qs=c.content.questions??[];
          if (!qs.length) { toast("Quiz/Assessment needs at least one question."); return; }
          for (const q of qs)
            if (!q.q.trim()||q.opts.some(o=>!o.trim())) { toast("Fill all question fields."); return; }
        }
      }
    }
    onSave(courseIdx, modules);
    toast(`Modules saved for "${course.title}"!`);
    onClose();
  };

  const media    = ch?.content.media ?? { type:"none" as MediaType, url:"" };
  const vidEmbed = media.type==="video" ? videoEmbed(media.url) : null;
  const pptEmbed = media.type==="presentation" ? presentationEmbed(media.url) : null;
  const directVid = media.type==="video" && /\.(mp4|webm|ogg)(\?|$)/i.test(media.url);
  const totalCh  = modules.reduce((s,m)=>s+m.chapters.length,0);
  const activities = getActivities();

  const BTN = (active?: boolean): React.CSSProperties => ({
    padding:"4px 10px", borderRadius:7, cursor:"pointer", fontSize:10.5, fontWeight:600,
    border:`1px solid ${active?"rgba(124,58,237,0.35)":"rgba(124,58,237,0.14)"}`,
    background:active?"#ede9fe":"#fff", color:active?"#6d28d9":"#8e7ec0",
    transition:"all .12s",
  });

  return (
    <>
      {/* ── Activity Manager — rendered via portal to escape modal stacking context ── */}
      {actMgrOpen && typeof document !== "undefined" && createPortal(
        <ActivityManager
          initialActivities={activities}
          onSave={acts => {
            setActivities(acts);
            setActMgrOpen(false);
            toast(`${acts.length} activit${acts.length===1?"y":"ies"} saved!`);
          }}
          onClose={() => setActMgrOpen(false)}
        />,
        document.body
      )}

      <div
        style={{ position:"fixed", inset:0, background:"rgba(8,4,24,0.65)", backdropFilter:"blur(12px)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:12 }}
        onClick={e=>e.target===e.currentTarget&&onClose()}
      >
        <div style={{ background:"#fff", borderRadius:20, width:"min(100%,1180px)", height:"min(100%,760px)", display:"flex", flexDirection:"column", boxShadow:"0 40px 100px rgba(8,4,24,0.3),0 0 0 1px rgba(124,58,237,0.12)", overflow:"hidden" }}>

          {/* ── HEADER ── */}
          <div style={{ background:"linear-gradient(135deg,#3b0764 0%,#6d28d9 50%,#0f766e 100%)", padding:"13px 18px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.18)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.5"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13.5, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{course.title} — Modules</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.6)", marginTop:1 }}>{modules.length} module{modules.length!==1?"s":""} · {totalCh} chapter{totalCh!==1?"s":""} total</div>
            </div>
            <button onClick={save} style={{ background:"rgba(255,255,255,0.92)", color:"#4c1d95", border:"none", borderRadius:9, padding:"6px 14px", fontSize:11.5, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7.5l3 3 7-7"/></svg>
              Save Modules
            </button>
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:8, border:"none", background:"rgba(255,255,255,0.15)", color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 1l9 9M9 1L1 9"/></svg>
            </button>
          </div>

          {/* ── BODY ── */}
          <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

            {/* COL 1: Modules */}
            <div style={{ width:188, flexShrink:0, borderRight:"1px solid rgba(124,58,237,0.08)", display:"flex", flexDirection:"column", background:"#f8f7ff" }}>
              <div style={{ padding:"10px 12px 6px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
                <span style={LBL}>Modules</span>
                <button onClick={addMod} style={{ width:24, height:24, borderRadius:7, background:"#ede9fe", color:"#7c3aed", border:"none", cursor:"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:600 }}>+</button>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:"0 8px 4px" }}>
                {modules.map((m,mi) => {
                  const active=selMod===mi, isDragging=modDragSrc===mi, isOver=modDragOver===mi&&modDragSrc!==mi;
                  return (
                    <div key={mi} draggable
                      onDragStart={e=>onModDragStart(e,mi)} onDragOver={e=>onModDragOver(e,mi)}
                      onDrop={e=>onModDrop(e,mi)} onDragEnd={onModDragEnd}
                      onClick={()=>{ setSelMod(mi); setSelCh(0); setActiveTab("content"); }}
                      style={{ padding:"8px 10px", borderRadius:10, marginBottom:3, cursor:"grab", background:active?"#ede9fe":isOver?"#f0eeff":"transparent", border:`1px solid ${active?"rgba(124,58,237,0.22)":isOver?"rgba(124,58,237,0.4)":"transparent"}`, opacity:isDragging?0.28:1, userSelect:"none" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <Grip />
                        <div style={{ width:22, height:22, borderRadius:6, background:active?"#7c3aed":"#e2dff5", color:active?"#fff":"#6b5fa0", fontSize:9.5, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{mi+1}</div>
                        <span style={{ fontSize:11.5, fontWeight:600, color:active?"#5b21b6":"#18103a", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {m.title||<em style={{ opacity:.45, fontWeight:400 }}>Untitled</em>}
                        </span>
                        <button onClick={e=>{ e.stopPropagation(); delModAt(mi); }} style={{ width:16, height:16, border:"none", background:"transparent", color:"#c4bdd8", cursor:"pointer", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:4 }}>✕</button>
                      </div>
                      <div style={{ fontSize:9.5, color:"#a89dc8", marginTop:3, paddingLeft:29 }}>{m.chapters.length} chapter{m.chapters.length!==1?"s":""}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding:"8px 12px", borderTop:"1px solid rgba(124,58,237,0.08)", display:"flex", alignItems:"center", justifyContent:"center", gap:10, flexShrink:0 }}>
                <button onClick={()=>delModAt(modules.length-1)} style={{ width:28, height:28, borderRadius:8, background:"#fee2e2", color:"#dc2626", border:"none", cursor:"pointer", fontSize:18, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                <span style={{ fontSize:13, fontWeight:700, color:"#18103a", minWidth:28, textAlign:"center" }}>{modules.length}</span>
                <button onClick={addMod} style={{ width:28, height:28, borderRadius:8, background:"#ede9fe", color:"#7c3aed", border:"none", cursor:"pointer", fontSize:18, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
              </div>
            </div>

            {/* COL 2: Chapters */}
            <div style={{ width:210, flexShrink:0, borderRight:"1px solid rgba(124,58,237,0.08)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
              {mod ? (
                <>
                  <div style={{ padding:"9px 12px 8px", flexShrink:0, borderBottom:"1px solid rgba(124,58,237,0.07)" }}>
                    <label style={LBL}>Module Title</label>
                    <input value={mod.title} onChange={e=>updModTitle(selMod,e.target.value)} placeholder="e.g. Getting Started" style={{ ...IN, padding:"6px 9px", fontSize:11.5 }} />
                  </div>
                  <div style={{ padding:"8px 12px 5px", flexShrink:0 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                      <span style={LBL}>Chapters</span>
                      <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <button onClick={delLastCh} style={{ width:26, height:26, borderRadius:7, background:"#fee2e2", color:"#dc2626", border:"none", cursor:"pointer", fontSize:16, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
                        <span style={{ fontSize:13, fontWeight:700, color:"#18103a", minWidth:22, textAlign:"center" }}>{mod.chapters.length}</span>
                        <button onClick={()=>addCh("lesson")} style={{ width:26, height:26, borderRadius:7, background:"#ede9fe", color:"#7c3aed", border:"none", cursor:"pointer", fontSize:16, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:4 }}>
                      {(["lesson","quiz","assessment"] as ChapterType[]).map(t=>(
                        <button key={t} onClick={()=>addCh(t)} title={`Add ${TM[t].lbl}`}
                          style={{ flex:1, padding:"5px 2px", borderRadius:7, border:`1px dashed ${TM[t].c}44`, background:TM[t].bg+"55", color:TM[t].c, fontSize:8.5, fontWeight:600, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, lineHeight:1 }}>
                          <span style={{ fontSize:13 }}>{TM[t].ico}</span>{TM[t].lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex:1, overflowY:"auto", padding:"4px 8px 10px" }}>
                    {mod.chapters.map((c,ci) => {
                      const meta=TM[c.type], isSelected=selCh===ci, isDragging=chDragSrc?.mi===selMod&&chDragSrc.ci===ci, isOver=chDragOver===ci&&chDragSrc?.ci!==ci;
                      const actCount = ((c.content as any).segments?.length??0);
                      return (
                        <div key={ci} draggable
                          onDragStart={()=>onChDragStart(ci)} onDragOver={e=>onChDragOver(e,ci)}
                          onDrop={()=>onChDrop(ci)} onDragEnd={onChDragEnd}
                          onClick={()=>{ setSelCh(ci); setActiveTab("content"); }}
                          style={{ padding:"7px 9px", borderRadius:9, marginBottom:3, cursor:"grab", background:isSelected?"#fff":isOver?"#f0eeff":"transparent", border:`1px solid ${isSelected?"rgba(124,58,237,0.16)":isOver?"rgba(124,58,237,0.4)":"transparent"}`, boxShadow:isSelected?"0 2px 8px rgba(124,58,237,0.09)":"none", opacity:isDragging?0.25:1, userSelect:"none" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <Grip />
                            <div style={{ width:20, height:20, borderRadius:5, background:meta.bg, color:meta.c, fontSize:8.5, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{ci+1}</div>
                            <span style={{ fontSize:11, fontWeight:500, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#18103a" }}>
                              {c.title||<em style={{ opacity:.4 }}>Untitled</em>}
                            </span>
                            <button onClick={e=>{ e.stopPropagation(); delChAt(ci); }} style={{ width:15, height:15, borderRadius:4, border:"none", background:"transparent", color:"#c4bdd8", cursor:"pointer", fontSize:9, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                          </div>
                          <div style={{ fontSize:8, marginTop:3, paddingLeft:23, display:"flex", gap:5, alignItems:"center" }}>
                            <span style={{ color:meta.c, fontWeight:700, textTransform:"uppercase" as const, letterSpacing:".07em" }}>{meta.ico} {meta.lbl}</span>
                            {actCount>0 && <span style={{ background:"#ede9fe", color:"#7c3aed", borderRadius:4, padding:"0 5px", fontSize:8, fontWeight:700 }}>+{actCount} 🧩</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#a89dc8", fontSize:12 }}>Select a module ←</div>
              )}
            </div>

            {/* COL 3: Editor */}
            <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", background:"#faf9ff" }}>
              {ch ? (
                <>
                  {/* Tab bar */}
                  <div style={{ display:"flex", alignItems:"center", gap:0, padding:"0 18px", borderBottom:"1px solid rgba(124,58,237,0.08)", background:"#fff", flexShrink:0 }}>
                    {(["content","activities"] as const).map(t => (
                      <button key={t} onClick={()=>setActiveTab(t)}
                        style={{ padding:"10px 16px", border:"none", background:"transparent", borderBottom:`2.5px solid ${activeTab===t?"#7c3aed":"transparent"}`, color:activeTab===t?"#7c3aed":"#a89dc8", fontSize:12, fontWeight:activeTab===t?700:500, cursor:"pointer", transition:"all .15s", display:"flex", alignItems:"center", gap:6 }}>
                        {t==="content"    && <>✏️ Content</>}
                        {t==="activities" && (
                          <>🧩 Activities
                            {activities.length > 0 && <span style={{ background:"#ede9fe", color:"#7c3aed", borderRadius:10, padding:"1px 7px", fontSize:9.5, fontWeight:700 }}>{activities.length}</span>}
                          </>
                        )}
                      </button>
                    ))}
                  </div>

                  <div style={{ flex:1, overflowY:"auto", padding:"14px 18px", display:"flex", flexDirection:"column", gap:13 }}>

                    {/* ── CONTENT TAB ── */}
                    {activeTab==="content" && (
                      <>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ fontSize:10, color:"#a89dc8", display:"flex", alignItems:"center", gap:4, flex:1 }}>
                            <span>{mod.title||"Module"}</span>
                            <span>›</span>
                            <span style={{ color:TM[ch.type].c, fontWeight:700 }}>{TM[ch.type].ico} {TM[ch.type].lbl}</span>
                          </div>
                          <button onClick={()=>setSelCh(i=>Math.max(0,i-1))} disabled={selCh===0} style={{ ...BTN(false), color:selCh===0?"#d4d0e8":"#7c3aed", cursor:selCh===0?"default":"pointer" }}>← Prev</button>
                          <span style={{ fontSize:10.5, color:"#8e7ec0", fontWeight:600 }}>{selCh+1}/{mod.chapters.length}</span>
                          <button onClick={()=>setSelCh(i=>Math.min(mod.chapters.length-1,i+1))} disabled={selCh===mod.chapters.length-1} style={{ ...BTN(false), color:selCh===mod.chapters.length-1?"#d4d0e8":"#7c3aed", cursor:selCh===mod.chapters.length-1?"default":"pointer" }}>Next →</button>
                        </div>

                        {/* Title + type */}
                        <div style={{ display:"flex", gap:10 }}>
                          <div style={{ flex:1 }}>
                            <label style={LBL}>Chapter Title *</label>
                            <input value={ch.title} onChange={e=>updChField("title",e.target.value)} placeholder="e.g. Welcome & Overview" style={IN} />
                          </div>
                          <div style={{ minWidth:148 }}>
                            <label style={LBL}>Type *</label>
                            <select value={ch.type} onChange={e=>updChField("type",e.target.value)} style={{ ...IN, cursor:"pointer" }}>
                              <option value="lesson">📖 Lesson</option>
                              <option value="quiz">❓ Quiz</option>
                              <option value="assessment">📝 Assessment</option>
                            </select>
                          </div>
                        </div>

                        {/* Media */}
                        <div style={{ background:"#fff", border:"1px solid rgba(124,58,237,0.1)", borderRadius:11, padding:"12px 14px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9 }}>
                            <span style={{ ...LBL, margin:0 }}>Media</span>
                            <div style={{ display:"flex", gap:5, marginLeft:"auto" }}>
                              {(["none","video","presentation"] as MediaType[]).map(t=>(
                                <button key={t} onClick={()=>updMedia({type:t,url:media.url,label:media.label})}
                                  style={{ padding:"3px 10px", borderRadius:6, border:`1px solid ${media.type===t?"rgba(124,58,237,0.4)":"rgba(124,58,237,0.1)"}`, background:media.type===t?"#ede9fe":"#fff", color:media.type===t?"#6d28d9":"#8e7ec0", fontSize:10, fontWeight:600, cursor:"pointer" }}>
                                  {t==="none"?"None":t==="video"?"🎬 Video":"📊 Slides"}
                                </button>
                              ))}
                            </div>
                          </div>
                          {media.type!=="none" && (
                            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                              <input value={media.url} onChange={e=>updMedia({...media,url:e.target.value})}
                                placeholder={media.type==="video"?"YouTube · Vimeo · direct .mp4 URL…":"Google Slides · OneDrive URL…"} style={IN} />
                              <input value={media.label??""} onChange={e=>updMedia({...media,label:e.target.value})}
                                placeholder="Label (optional)" style={{ ...IN, fontSize:11 }} />
                              {media.url.trim() && (
                                <div style={{ borderRadius:9, overflow:"hidden", background:"#111", position:"relative", aspectRatio:"16/9" }}>
                                  {media.type==="video"&&directVid ? <video src={media.url} controls style={{ width:"100%",height:"100%",display:"block" }} />
                                  :media.type==="video"&&vidEmbed ? <iframe src={vidEmbed} style={{ width:"100%",height:"100%",border:"none",display:"block" }} allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowFullScreen title="Video" />
                                  :media.type==="presentation"&&pptEmbed ? <iframe src={pptEmbed} style={{ width:"100%",height:"100%",border:"none",display:"block" }} allowFullScreen title="Presentation" />
                                  : <div style={{ minHeight:80,display:"flex",alignItems:"center",justifyContent:"center",color:"#8e7ec0",background:"#f5f3ff",fontSize:11 }}>Preview not available</div>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Lesson body */}
                        {ch.type==="lesson" && (
                          <div>
                            <label style={LBL}>Content Body (HTML supported)</label>
                            <textarea value={ch.content.body??""} onChange={e=>updBody(e.target.value)}
                              placeholder={"<p>Enter lesson content here...</p>"}
                              rows={9} style={{ ...IN, fontFamily:"ui-monospace,'Fira Code',monospace", resize:"vertical", lineHeight:1.65, fontSize:11.5, padding:"10px 12px" }} />
                          </div>
                        )}

                        {/* Quiz / Assessment */}
                        {(ch.type==="quiz"||ch.type==="assessment") && (
                          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                              <label style={LBL}>Questions ({(ch.content.questions??[]).length})</label>
                              <button onClick={addQ} style={{ background:"#ede9fe", color:"#7c3aed", border:"none", borderRadius:7, padding:"5px 12px", fontSize:10.5, fontWeight:700, cursor:"pointer" }}>+ Add Question</button>
                            </div>
                            {(ch.content.questions??[]).map((q,qi) => (
                              <div key={qi} style={{ background:"#fff", border:"1px solid rgba(124,58,237,0.1)", borderRadius:12, padding:"12px 14px" }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                                  <div style={{ width:24, height:24, borderRadius:7, background:ch.type==="assessment"?"#fef3c7":"#ede9fe", color:ch.type==="assessment"?"#b45309":"#7c3aed", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{qi+1}</div>
                                  <input value={q.q} onChange={e=>updQ(qi,"q",e.target.value)} placeholder="Type your question…"
                                    style={{ flex:1, border:"1px solid rgba(124,58,237,0.12)", borderRadius:7, padding:"6px 9px", fontSize:12, background:"#f8f7ff", outline:"none", color:"#18103a", fontFamily:"inherit" }} />
                                  <button onClick={()=>delQ(qi)} style={{ width:26, height:26, borderRadius:7, border:"none", background:"#fee2e2", color:"#dc2626", cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                                </div>
                                <div style={{ display:"flex", flexDirection:"column", gap:6, paddingLeft:32 }}>
                                  {q.opts.map((opt,oi) => (
                                    <div key={oi} style={{ display:"flex", alignItems:"center", gap:8 }}>
                                      <input type="radio" name={`ans-${selMod}-${selCh}-${qi}`} checked={q.ans===oi} onChange={()=>updQ(qi,"ans",oi)}
                                        style={{ accentColor:"#7c3aed", width:14, height:14, flexShrink:0, cursor:"pointer" }} />
                                      <input value={opt} onChange={e=>updOpt(qi,oi,e.target.value)}
                                        placeholder={`Option ${oi+1}${q.ans===oi?" ✓ correct":""}`}
                                        style={{ flex:1, border:`1.5px solid ${q.ans===oi?"rgba(22,163,74,0.5)":"rgba(124,58,237,0.1)"}`, borderRadius:7, padding:"5px 9px", fontSize:11.5, background:q.ans===oi?"#f0fdf4":"#fff", outline:"none", color:"#18103a", fontFamily:"inherit" }} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* ── ACTIVITIES TAB ── */}
                    {activeTab==="activities" && (
                      <>
                        <div style={{ background:"linear-gradient(135deg,#1e1245,#4c1d95 55%,#064e3b)", borderRadius:14, padding:"18px 20px", display:"flex", alignItems:"center", gap:16 }}>
                          <div style={{ fontSize:38 }}>🧩</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14.5, fontWeight:700, color:"#fff", marginBottom:4 }}>Interactive Activities</div>
                            <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.6)", lineHeight:1.6 }}>
                              Build accordions, flashcards, fill-in-blanks, checklists, and matching exercises in the full-screen Activity Builder.
                            </div>
                          </div>
                          <button
                            onClick={() => setActMgrOpen(true)}
                            style={{ padding:"11px 22px", borderRadius:11, border:"none", background:"rgba(255,255,255,0.92)", color:"#4c1d95", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0, transition:"all .14s" }}
                            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background="#fff";(e.currentTarget as HTMLElement).style.transform="translateY(-2px)";}}
                            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.92)";(e.currentTarget as HTMLElement).style.transform="none";}}>
                            {activities.length > 0 ? "✏️ Edit Activities" : "✨ Open Activity Builder"}
                          </button>
                        </div>

                        {/* Summary of current activities */}
                        {activities.length > 0 ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            <div style={{ fontSize:10.5, fontWeight:600, color:"#8e7ec0", letterSpacing:".06em", textTransform:"uppercase" as const }}>
                              {activities.length} activit{activities.length===1?"y":"ies"} attached to this chapter
                            </div>
                            {activities.map((act, i) => {
                              const typeMeta = ACT_TYPE_COLORS[act.type] ?? { color:"#6d28d9", bg:"#ede9fe" };
                              const icon = ACT_TYPE_ICONS[act.type] ?? "🧩";
                              return (
                                <div key={act.id || i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:11, background:"#fff", border:`1px solid ${typeMeta.color}18` }}>
                                  <div style={{ width:36, height:36, borderRadius:10, background:typeMeta.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{icon}</div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ fontSize:13, fontWeight:600, color:"#0f0a2a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{act.title || act.type}</div>
                                    <div style={{ fontSize:10.5, color:typeMeta.color, fontWeight:600, textTransform:"capitalize" as const }}>{act.type}</div>
                                  </div>
                                  <span style={{ fontSize:9.5, color:"#a89dc8" }}>#{i+1}</span>
                                </div>
                              );
                            })}
                            <button onClick={() => setActMgrOpen(true)}
                              style={{ padding:"9px", borderRadius:10, border:"1.5px dashed rgba(109,40,217,0.25)", background:"#f5f3ff", color:"#6d28d9", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                              ✏️ Edit in Activity Builder →
                            </button>
                          </div>
                        ) : (
                          <div style={{ textAlign:"center", padding:"32px 20px", color:"#c4bdd8", background:"#fff", border:"1px dashed rgba(124,58,237,0.15)", borderRadius:12 }}>
                            <div style={{ fontSize:32, marginBottom:8 }}>🎯</div>
                            <div style={{ fontSize:13, fontWeight:600, color:"#a89dc8", marginBottom:6 }}>No activities yet</div>
                            <div style={{ fontSize:11.5, lineHeight:1.65 }}>Open the Activity Builder to add<br/>interactive exercises to this chapter.</div>
                          </div>
                        )}
                      </>
                    )}

                  </div>
                </>
              ) : (
                <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, color:"#a89dc8" }}>
                  <span style={{ fontSize:40, opacity:.3 }}>📖</span>
                  <span style={{ fontSize:12 }}>Select a chapter to edit</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
