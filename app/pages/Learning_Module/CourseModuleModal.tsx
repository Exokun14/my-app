'use client'

import { useState, useEffect } from "react";
import type { Course, Module, Chapter, ChapterType, ChapterMedia, MediaType } from "../../Data/types";
import { ActivityBuilderTrigger, type Activity } from "./ActivityBuilderPanel";

interface Props {
  open:      boolean;
  course:    Course | null;
  courseIdx: number | null;
  onClose:   () => void;
  onSave:    (idx: number, modules: Module[]) => void;
  toast:     (msg: string) => void;
}

function dc<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

const TM: Record<ChapterType, { c:string; bg:string; border:string; lbl:string; ico:string }> = {
  lesson:     { c:"#0284c7", bg:"#e0f2fe", border:"rgba(2,132,199,0.22)",   lbl:"Lesson",     ico:"📖" },
  quiz:       { c:"#7c3aed", bg:"#ede9fe", border:"rgba(124,58,237,0.22)",  lbl:"Quiz",       ico:"❓" },
  assessment: { c:"#d97706", bg:"#fef3c7", border:"rgba(217,119,6,0.22)",   lbl:"Assessment", ico:"📝" },
};

// Activity display handled in ActivityBuilderPanel

// ── Shared styles ─────────────────────────────────────────────────────────────
const IN: React.CSSProperties = {
  width:"100%", border:"1.5px solid rgba(109,40,217,0.15)", borderRadius:10,
  padding:"10px 14px", fontSize:13.5, background:"#fff", outline:"none",
  color:"#18103a", fontFamily:"'Plus Jakarta Sans',sans-serif",
  transition:"border-color .18s,box-shadow .18s",
};
const LBL: React.CSSProperties = {
  fontSize:10, fontWeight:700, letterSpacing:".1em",
  textTransform:"uppercase" as const, color:"#a89dc8", display:"block", marginBottom:7,
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

.mb * { box-sizing:border-box; margin:0; padding:0; }
.mb { font-family:'Plus Jakarta Sans',sans-serif; }
.mb * { scrollbar-width:thin; scrollbar-color:rgba(109,40,217,0.14) transparent; }
.mb ::-webkit-scrollbar { width:4px; }
.mb ::-webkit-scrollbar-thumb { background:rgba(109,40,217,0.18); border-radius:4px; }

@keyframes mb-in     { from{opacity:0;transform:translateY(16px) scale(.985)} to{opacity:1;transform:none} }
@keyframes mb-out    { from{opacity:1;transform:none} to{opacity:0;transform:translateY(10px) scale(.985)} }
@keyframes mb-slide  { from{opacity:0;transform:translateX(22px)} to{opacity:1;transform:none} }
@keyframes mb-up     { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
@keyframes mb-pop    { 0%{opacity:0;transform:scale(.78)} 70%{transform:scale(1.07)} 100%{opacity:1;transform:none} }
@keyframes mb-pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes mb-spin   { to{transform:rotate(360deg)} }

.mb-enter  { animation:mb-in   .46s cubic-bezier(.16,1,.3,1) both; }
.mb-exit   { animation:mb-out  .26s ease forwards; }
.mb-slide  { animation:mb-slide .3s cubic-bezier(.16,1,.3,1) both; }
.mb-up     { animation:mb-up    .26s cubic-bezier(.16,1,.3,1) both; }
.mb-pulse  { animation:mb-pulse 2.2s ease infinite; }

/* ── Module accordion row ── */
.mb-mod {
  border-radius:12px; overflow:hidden; margin-bottom:5px;
  border:1px solid transparent; transition:border-color .18s,box-shadow .18s;
}
.mb-mod.active { border-color:rgba(109,40,217,0.16); box-shadow:0 2px 14px rgba(109,40,217,0.08); }

.mb-mod-hd {
  display:flex; align-items:center; gap:9px; padding:10px 12px;
  cursor:pointer; border-radius:11px;
  transition:background .15s;
  user-select:none;
}
.mb-mod-hd:hover { background:rgba(109,40,217,0.05); }
.mb-mod.active .mb-mod-hd { background:#fff; border-radius:12px 12px 0 0; }

/* ── Chapter item inside accordion ── */
.mb-ch-item {
  display:flex; align-items:center; gap:7px;
  padding:8px 12px 8px 36px; cursor:pointer;
  border-radius:0; border-left:0;
  transition:background .13s,transform .12s;
  position:relative;
}
.mb-ch-item::before {
  content:''; position:absolute; left:16px; top:50%; transform:translateY(-50%);
  width:8px; height:1.5px; background:rgba(109,40,217,0.2);
}
.mb-ch-item:hover { background:rgba(109,40,217,0.04); transform:translateX(2px); }
.mb-ch-item.active { background:#f0eeff; }
.mb-ch-item.active::before { background:#7c3aed; }

/* ── Input focus ── */
.mb input:focus,.mb textarea:focus,.mb select:focus {
  border-color:rgba(109,40,217,0.45)!important;
  box-shadow:0 0 0 3px rgba(109,40,217,0.07)!important;
  outline:none!important; background:#fff!important;
}

/* ── Tab ── */
.mb-tab {
  padding:13px 20px; border:none; background:transparent; cursor:pointer;
  font-family:'Plus Jakarta Sans',sans-serif; font-size:13px; font-weight:500;
  color:#a89dc8; border-bottom:2.5px solid transparent;
  transition:color .14s,border-color .14s;
  display:flex; align-items:center; gap:7px; white-space:nowrap; flex-shrink:0;
}
.mb-tab.on { color:#7c3aed; border-bottom-color:#7c3aed; font-weight:700; }
.mb-tab:hover:not(.on) { color:#6d28d9; }

/* ── Primary button ── */
.mb-btn-p {
  position:relative; overflow:hidden;
  padding:10px 22px; border-radius:11px; border:none; cursor:pointer;
  font-family:'Plus Jakarta Sans',sans-serif; font-size:13px; font-weight:700;
  background:linear-gradient(135deg,#7c3aed,#0d9488); color:#fff;
  box-shadow:0 3px 16px rgba(124,58,237,0.28);
  display:flex; align-items:center; gap:8px;
  transition:transform .14s,box-shadow .14s,filter .14s;
}
.mb-btn-p:hover { transform:translateY(-2px); box-shadow:0 7px 24px rgba(124,58,237,0.36); filter:brightness(1.06); }
.mb-btn-p:active { transform:scale(.97); }
.mb-btn-p::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent); transform:translateX(-100%); transition:transform .5s; }
.mb-btn-p:hover::after { transform:translateX(100%); }

/* ── Secondary ghost button ── */
.mb-btn-s {
  padding:8px 16px; border-radius:10px; cursor:pointer;
  font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; font-weight:600;
  border:1.5px solid rgba(109,40,217,0.2); background:#fff; color:#6d28d9;
  transition:background .13s,border-color .13s,transform .12s;
  display:flex; align-items:center; gap:6px;
}
.mb-btn-s:hover { background:#f5f3ff; border-color:rgba(109,40,217,0.35); transform:translateY(-1px); }
.mb-btn-s:disabled { opacity:.3; cursor:default; transform:none; }

/* ── Grip ── */
.mb-grip { cursor:grab; flex-shrink:0; opacity:.35; transition:opacity .14s; }
.mb-mod-hd:hover .mb-grip, .mb-ch-item:hover .mb-grip { opacity:.65; }

/* ── Add chapter mini-chips ── */
.mb-addch {
  flex:1; padding:7px 3px; border-radius:9px; cursor:pointer;
  display:flex; flex-direction:column; align-items:center; gap:2px;
  font-family:'Plus Jakarta Sans',sans-serif; font-size:9px; font-weight:700; line-height:1;
  transition:transform .12s,box-shadow .12s;
}
.mb-addch:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.1); }

/* ── Media type btn ── */
.mb-media-btn {
  padding:6px 14px; border-radius:9px; font-size:11.5px; font-weight:600; cursor:pointer;
  font-family:'Plus Jakarta Sans',sans-serif;
  transition:background .13s,border-color .13s,transform .11s;
}
.mb-media-btn:hover { transform:translateY(-1px); }

/* ── Question card ── */
.mb-q-card {
  background:#fff; border:1.5px solid rgba(109,40,217,0.09); border-radius:14px;
  padding:16px 18px; transition:box-shadow .14s,border-color .14s;
  animation:mb-up .2s ease both;
}
.mb-q-card:hover { box-shadow:0 4px 18px rgba(109,40,217,0.08); border-color:rgba(109,40,217,0.18); }

/* ── Activity card ── */
.mb-act-card {
  display:flex; align-items:center; gap:12px; padding:12px 16px; border-radius:12px;
  background:#fff; border:1px solid rgba(109,40,217,0.09);
  transition:border-color .14s,box-shadow .14s,transform .13s;
}
.mb-act-card:hover { border-color:rgba(109,40,217,0.22); box-shadow:0 3px 14px rgba(109,40,217,0.08); transform:translateX(3px); }

/* ── Nav prev / next ── */
.mb-nav {
  padding:7px 14px; border-radius:9px; font-size:11.5px; font-weight:600; cursor:pointer;
  font-family:'Plus Jakarta Sans',sans-serif;
  border:1.5px solid rgba(109,40,217,0.18); background:#fff; color:#6d28d9;
  transition:background .13s,border-color .13s,transform .12s;
  display:flex; align-items:center; gap:5px;
}
.mb-nav:hover:not(:disabled) { background:#f5f3ff; border-color:rgba(109,40,217,0.32); }
.mb-nav.prev:hover:not(:disabled) { transform:translateX(-3px); }
.mb-nav.next:hover:not(:disabled) { transform:translateX(3px); }
.mb-nav:disabled { opacity:.28; cursor:default; }

/* ── Section heading ── */
.mb-section-hd {
  font-size:10.5px; font-weight:700; color:#a89dc8;
  letter-spacing:.1em; text-transform:uppercase; margin-bottom:14px;
}

/* ── Empty state ── */
.mb-empty {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  flex:1; gap:12px; color:#c4bdd8; padding:40px; text-align:center;
  animation:mb-up .3s ease both;
}
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function blankChapter(type:ChapterType="lesson"):Chapter {
  return { title:"", type, done:false, content:{ title:"", type,
    body:type==="lesson"?"":undefined,
    questions:type!=="lesson"?[{q:"",opts:["","","",""],ans:0}]:undefined,
    media:{type:"none",url:""}, segments:[],
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

const GripIcon = () => (
  <svg className="mb-grip" width="7" height="12" viewBox="0 0 7 12" fill="#b8b0d4">
    <circle cx="2" cy="2" r="1"/><circle cx="5" cy="2" r="1"/>
    <circle cx="2" cy="6" r="1"/><circle cx="5" cy="6" r="1"/>
    <circle cx="2" cy="10" r="1"/><circle cx="5" cy="10" r="1"/>
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────
export default function CourseModuleModal({ open, course, courseIdx, onClose, onSave, toast }: Props) {
  const [modules,    setModules]    = useState<Module[]>([]);
  const [selMod,     setSelMod]     = useState(0);
  const [selCh,      setSelCh]      = useState(0);
  const [inited,     setInited]     = useState(false);
  const [activeTab,  setActiveTab]  = useState<"content"|"activities">("content");
  // activity builder handled inline via ActivityBuilderTrigger
  const [exiting,    setExiting]    = useState(false);
  const [editorKey,  setEditorKey]  = useState(0);  // triggers re-animation

  // Drag state
  const [chDragSrc,   setChDragSrc]   = useState<{mi:number;ci:number}|null>(null);
  const [chDragOver,  setChDragOver]  = useState<{mi:number;ci:number}|null>(null);
  const [modDragSrc,  setModDragSrc]  = useState<number|null>(null);
  const [modDragOver, setModDragOver] = useState<number|null>(null);

  useEffect(() => {
    if (open && course && !inited) {
      setModules(dc(course.modules?.length ? course.modules : [blankModule()]));
      setSelMod(0); setSelCh(0); setInited(true); setExiting(false);
    }
    if (!open && inited) setInited(false);
  }, [open, course, inited]);

  if (!open || !course || courseIdx === null) return null;

  const mod = modules[selMod];
  const ch  = mod?.chapters[selCh];

  // ── Navigation helpers ───────────────────────────────────────────────────
  const gotoChapter = (mi:number, ci:number) => {
    setSelMod(mi); setSelCh(ci); setActiveTab("content"); setEditorKey(k => k+1);
  };
  const gotoMod = (mi:number) => {
    setSelMod(mi); setSelCh(0); setActiveTab("content"); setEditorKey(k => k+1);
  };

  // ── Activity helpers ─────────────────────────────────────────────────────
  const getActivities = (): Activity[] => (ch?.content as any)?.segments ?? [];
  const setActivities = (acts:Activity[]) => {
    const u=dc(modules); (u[selMod].chapters[selCh].content as any).segments=acts; setModules(u);
  };

  // ── Module ops ───────────────────────────────────────────────────────────
  const addMod = () => {
    const u = [...modules, blankModule()]; setModules(u); gotoMod(u.length-1);
  };
  const delModAt = (mi:number) => {
    if (modules.length===1) { toast("Need at least one module."); return; }
    const u = modules.filter((_,i)=>i!==mi); setModules(u);
    gotoMod(Math.min(mi, u.length-1));
  };
  const updModTitle = (mi:number, v:string) => { const u=dc(modules); u[mi].title=v; setModules(u); };
  const moveMod = (from:number, to:number) => {
    if (to<0||to>=modules.length) return;
    const u=dc(modules); const[r]=u.splice(from,1); u.splice(to,0,r);
    setModules(u); setSelMod(to);
  };

  // ── Chapter ops ──────────────────────────────────────────────────────────
  const addCh = (type:ChapterType) => {
    const u=dc(modules); u[selMod].chapters.push(blankChapter(type));
    setModules(u); gotoChapter(selMod, u[selMod].chapters.length-1);
  };
  const delChAt = (mi:number, ci:number) => {
    if (modules[mi].chapters.length===1) { toast("Need at least one chapter."); return; }
    const u=dc(modules); u[mi].chapters.splice(ci,1); setModules(u);
    if (mi===selMod) setSelCh(Math.min(selCh, u[mi].chapters.length-1));
  };
  const moveCh = (from:number, to:number) => {
    if (to<0||to>=modules[selMod].chapters.length) return;
    const u=dc(modules); const[r]=u[selMod].chapters.splice(from,1); u[selMod].chapters.splice(to,0,r);
    setModules(u); setSelCh(to);
  };
  const updChField = (field:"title"|"type", val:string) => {
    const u=dc(modules); const c=u[selMod].chapters[selCh];
    if (field==="title") { c.title=val; c.content.title=val; }
    else {
      const t=val as ChapterType; c.type=t; c.content.type=t;
      c.content.body      = t==="lesson"?(c.content.body??""):undefined;
      c.content.questions = t!=="lesson"?(c.content.questions??[{q:"",opts:["","","",""],ans:0}]):undefined;
      c.content.media   ??= {type:"none",url:""};
      (c.content as any).segments ??= [];
    }
    setModules(u);
  };
  const updBody  = (v:string) => { const u=dc(modules); u[selMod].chapters[selCh].content.body=v; setModules(u); };
  const updMedia = (m:ChapterMedia) => { const u=dc(modules); u[selMod].chapters[selCh].content.media=m; setModules(u); };

  // ── Quiz ops ─────────────────────────────────────────────────────────────
  const addQ    = () => { const u=dc(modules); u[selMod].chapters[selCh].content.questions??=[]; u[selMod].chapters[selCh].content.questions!.push({q:"",opts:["","","",""],ans:0}); setModules(u); };
  const delQ    = (qi:number) => { const u=dc(modules); const qs=u[selMod].chapters[selCh].content.questions!; if(qs.length===1){toast("Need at least one question.");return;} qs.splice(qi,1); setModules(u); };
  const updQ    = (qi:number, field:"q"|"ans", val:string|number) => { const u=dc(modules); const q=u[selMod].chapters[selCh].content.questions![qi]; if(field==="q")q.q=val as string; else q.ans=val as number; setModules(u); };
  const updOpt  = (qi:number, oi:number, val:string) => { const u=dc(modules); u[selMod].chapters[selCh].content.questions![qi].opts[oi]=val; setModules(u); };

  // ── Drag ─────────────────────────────────────────────────────────────────
  const onChDragStart = (mi:number, ci:number) => setChDragSrc({mi,ci});
  const onChDragOver  = (e:React.DragEvent, mi:number, ci:number) => { e.preventDefault(); setChDragOver({mi,ci}); };
  const onChDrop      = (mi:number, ci:number) => { if(chDragSrc&&chDragSrc.mi===mi&&chDragSrc.ci!==ci) moveCh(chDragSrc.ci,ci); setChDragSrc(null); setChDragOver(null); };
  const onChDragEnd   = () => { setChDragSrc(null); setChDragOver(null); };
  const onModDragStart = (e:React.DragEvent, mi:number) => { e.stopPropagation(); setModDragSrc(mi); };
  const onModDragOver  = (e:React.DragEvent, mi:number) => { e.preventDefault(); e.stopPropagation(); setModDragOver(mi); };
  const onModDrop      = (e:React.DragEvent, mi:number) => { e.stopPropagation(); if(modDragSrc!==null&&modDragSrc!==mi) moveMod(modDragSrc,mi); setModDragSrc(null); setModDragOver(null); };
  const onModDragEnd   = () => { setModDragSrc(null); setModDragOver(null); };

  // ── Save / Close ─────────────────────────────────────────────────────────
  const save = () => {
    for (const m of modules) {
      if (!m.title.trim()) { toast("All modules need a title."); return; }
      for (const c of m.chapters) {
        if (!c.title.trim()) { toast("All chapters need a title."); return; }
        if (c.type!=="lesson") {
          const qs=c.content.questions??[];
          if (!qs.length) { toast("Quiz/Assessment needs at least one question."); return; }
          for (const q of qs) if (!q.q.trim()||q.opts.some(o=>!o.trim())) { toast("Fill all question fields."); return; }
        }
      }
    }
    onSave(courseIdx, modules);
    toast(`Modules saved for "${course.title}"!`);
    handleClose();
  };
  const handleClose = () => { setExiting(true); setTimeout(()=>{ setExiting(false); onClose(); }, 260); };

  // ── Derived ──────────────────────────────────────────────────────────────
  const media     = ch?.content.media ?? { type:"none" as MediaType, url:"" };
  const vidEmbed  = media.type==="video" ? videoEmbed(media.url) : null;
  const pptEmbed  = media.type==="presentation" ? presentationEmbed(media.url) : null;
  const directVid = media.type==="video" && /\.(mp4|webm|ogg)(\?|$)/i.test(media.url);
  const totalCh   = modules.reduce((s,m)=>s+m.chapters.length, 0);
  const totalActs = modules.reduce((s,m)=>s+m.chapters.reduce((s2,c)=>s2+((c.content as any).segments?.length??0),0), 0);
  const activities = getActivities();
  const chMeta     = ch ? TM[ch.type] : null;

  // ── Flat chapter list for prev/next ──────────────────────────────────────
  const allChapters: {mi:number;ci:number}[] = modules.flatMap((m,mi) => m.chapters.map((_,ci) => ({mi,ci})));
  const flatIdx = allChapters.findIndex(x => x.mi===selMod && x.ci===selCh);
  const prevCh  = flatIdx > 0 ? allChapters[flatIdx-1] : null;
  const nextCh  = flatIdx < allChapters.length-1 ? allChapters[flatIdx+1] : null;

  // ── Completion stats ─────────────────────────────────────────────────────
  let filledChapters = 0;
  modules.forEach(m => m.chapters.forEach(c => { if(c.title.trim()) filledChapters++; }));
  const progressPct = totalCh > 0 ? Math.round((filledChapters/totalCh)*100) : 0;

  return (
    <>
      <style>{S}</style>

      {/* ActivityBuilderPanel rendered via ActivityBuilderTrigger portal */}

      {/* ══ FULL-SCREEN SHELL ═══════════════════════════════════════════════ */}
      <div className="mb" style={{ position:"fixed", inset:0, zIndex:600, background:"#faf9ff", display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Ambient light orbs — identical to wizard */}
        <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:0 }}>
          <div style={{ position:"absolute", top:"-8%", right:"10%", width:440, height:440, borderRadius:"50%", background:"radial-gradient(circle,rgba(109,40,217,0.055),transparent 68%)" }}/>
          <div style={{ position:"absolute", bottom:"-7%", left:"5%", width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(13,148,136,0.06),transparent 68%)" }}/>
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(109,40,217,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(109,40,217,0.022) 1px,transparent 1px)", backgroundSize:"52px 52px" }}/>
        </div>

        <div className={exiting ? "mb-exit" : "mb-enter"} style={{ display:"flex", flexDirection:"column", flex:1, overflow:"hidden", position:"relative", zIndex:1 }}>

          {/* ══ TOP BAR ════════════════════════════════════════════════════ */}
          <div style={{ display:"flex", alignItems:"center", padding:"0 28px", height:58, flexShrink:0, background:"rgba(255,255,255,0.96)", backdropFilter:"blur(16px)", borderBottom:"1px solid rgba(109,40,217,0.09)", boxShadow:"0 1px 0 rgba(109,40,217,0.05)" }}>

            {/* Logo + title */}
            <div style={{ display:"flex", alignItems:"center", gap:11, flexShrink:0 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 12px rgba(124,58,237,0.28)", flexShrink:0 }}>
                <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="1.6"><path d="M2 4l5-2 5 2v4c0 2-2 3.5-5 4.5-3-1-5-2.5-5-4.5V4z"/></svg>
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#0f0a2a", letterSpacing:"-0.01em" }}>Module Builder</div>
                <div style={{ fontSize:10, color:"#a89dc8", marginTop:1 }}>{course.title}</div>
              </div>
            </div>

            {/* Progress bar — same as wizard */}
            <div style={{ flex:1, margin:"0 36px" }}>
              <div style={{ height:5, borderRadius:4, background:"#e9e6f8", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#7c3aed,#0d9488)", width:`${progressPct}%`, transition:"width .6s cubic-bezier(.16,1,.3,1)" }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                <span style={{ fontSize:9.5, fontWeight:600, color:"#a89dc8", letterSpacing:".05em", textTransform:"uppercase" }}>{modules.length} module{modules.length!==1?"s":""} · {totalCh} chapter{totalCh!==1?"s":""}{totalActs>0?` · ${totalActs} activities`:""}</span>
                <span style={{ fontSize:9.5, fontWeight:700, color: progressPct===100?"#10b981":"#7c3aed" }}>{progressPct}% titled</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <button className="mb-btn-p" onClick={save}>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 7.5l3 3 7-7"/></svg>
                Save Modules
              </button>
              <button onClick={handleClose}
                style={{ width:32, height:32, borderRadius:9, border:"1.5px solid rgba(109,40,217,0.15)", background:"#f5f3ff", color:"#7c65a8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"background .13s,border-color .13s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="#ede9fe";e.currentTarget.style.borderColor="rgba(109,40,217,0.3)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#f5f3ff";e.currentTarget.style.borderColor="rgba(109,40,217,0.15)";}}>
                <svg width="10" height="10" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M1 1l9 9M10 1L1 10"/></svg>
              </button>
            </div>
          </div>

          {/* ══ BODY ════════════════════════════════════════════════════════ */}
          <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

            {/* ──────────────────────────────────────────────────────────────
                LEFT SIDEBAR  –  Module accordion navigator (like wizard steps)
            ────────────────────────────────────────────────────────────── */}
            <div style={{ width:280, flexShrink:0, display:"flex", flexDirection:"column", borderRight:"1px solid rgba(109,40,217,0.09)", background:"#f5f3ff", overflow:"hidden" }}>

              {/* Sidebar header */}
              <div style={{ padding:"22px 18px 12px", flexShrink:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#a89dc8", letterSpacing:".12em", textTransform:"uppercase" }}>Course Structure</div>
                    <div style={{ fontSize:10, color:"#c4bdd8", marginTop:2 }}>Click a chapter to edit it</div>
                  </div>
                  <button onClick={addMod}
                    style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", borderRadius:9, background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"#fff", border:"none", cursor:"pointer", fontSize:11, fontWeight:700, boxShadow:"0 2px 10px rgba(124,58,237,0.28)", transition:"transform .13s,box-shadow .13s" }}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 5px 16px rgba(124,58,237,0.38)";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 10px rgba(124,58,237,0.28)";}}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.2"><path d="M5 1v8M1 5h8"/></svg>
                    Module
                  </button>
                </div>
              </div>

              {/* Accordion module list */}
              <div style={{ flex:1, overflowY:"auto", padding:"0 12px 16px" }}>
                {modules.map((m, mi) => {
                  const isActiveMod = selMod===mi;
                  const isDragOver  = modDragOver===mi && modDragSrc!==mi;
                  const isDragging  = modDragSrc===mi;
                  const acts = m.chapters.reduce((s,c)=>s+((c.content as any).segments?.length??0),0);

                  return (
                    <div key={mi} draggable
                      className={`mb-mod${isActiveMod?" active":""}`}
                      onDragStart={e=>onModDragStart(e,mi)} onDragOver={e=>onModDragOver(e,mi)}
                      onDrop={e=>onModDrop(e,mi)} onDragEnd={onModDragEnd}
                      style={{ opacity:isDragging?.25:1, borderColor:isDragOver?"rgba(109,40,217,0.5)":"" }}>

                      {/* Module header row — click to expand */}
                      <div className="mb-mod-hd" onClick={() => gotoMod(mi)}>
                        <GripIcon/>
                        {/* Number with gradient when active */}
                        <div style={{ width:26, height:26, borderRadius:8, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10.5, fontWeight:700, background:isActiveMod?"linear-gradient(135deg,#7c3aed,#5b21b6)":"#e2dff5", color:isActiveMod?"#fff":"#7c65a8", boxShadow:isActiveMod?"0 2px 8px rgba(124,58,237,0.3)":"none", transition:"all .22s" }}>{mi+1}</div>

                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12.5, fontWeight:700, color:isActiveMod?"#4c1d95":"#18103a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", transition:"color .2s" }}>
                            {m.title || <em style={{ opacity:.4, fontWeight:400, fontSize:12 }}>Untitled module</em>}
                          </div>
                          <div style={{ fontSize:9.5, color:"#a89dc8", marginTop:2, display:"flex", gap:6 }}>
                            <span>{m.chapters.length} ch{m.chapters.length!==1?"apters":"apter"}</span>
                            {acts>0 && <span style={{ color:"#10b981" }}>· {acts} 🧩</span>}
                          </div>
                        </div>

                        {/* Pulse when active */}
                        {isActiveMod && <div className="mb-pulse" style={{ width:6, height:6, borderRadius:"50%", background:"#7c3aed", boxShadow:"0 0 6px rgba(124,58,237,0.6)", flexShrink:0 }}/>}

                        {/* Chevron */}
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#c4bdd8" strokeWidth="2" style={{ transition:"transform .22s", transform:isActiveMod?"rotate(180deg)":"none", flexShrink:0 }}><path d="M2 4l4 4 4-4"/></svg>

                        <button onClick={e=>{e.stopPropagation();delModAt(mi);}}
                          style={{ width:18, height:18, border:"none", background:"transparent", color:"#c4bdd8", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:4, flexShrink:0, transition:"color .12s" }}
                          onMouseEnter={e=>e.currentTarget.style.color="#dc2626"}
                          onMouseLeave={e=>e.currentTarget.style.color="#c4bdd8"}>✕</button>
                      </div>

                      {/* ── Expanded: chapter list ── */}
                      {isActiveMod && (
                        <div style={{ background:"#f9f8ff", borderTop:"1px solid rgba(109,40,217,0.07)", paddingBottom:6 }}>
                          {m.chapters.map((c, ci) => {
                            const meta = TM[c.type];
                            const isSel = selCh===ci;
                            const isChDragOver = chDragOver?.mi===mi && chDragOver.ci===ci && chDragSrc?.ci!==ci;
                            const isChDragging = chDragSrc?.mi===mi && chDragSrc.ci===ci;
                            const actCt = ((c.content as any).segments?.length??0);
                            return (
                              <div key={ci} draggable
                                className={`mb-ch-item${isSel?" active":""}`}
                                onDragStart={()=>onChDragStart(mi,ci)} onDragOver={e=>onChDragOver(e,mi,ci)}
                                onDrop={()=>onChDrop(mi,ci)} onDragEnd={onChDragEnd}
                                onClick={()=>gotoChapter(mi,ci)}
                                style={{ opacity:isChDragging?.22:1, borderLeft:isChDragOver?"2px solid #7c3aed":"2px solid transparent" }}>
                                <GripIcon/>
                                <div style={{ width:18, height:18, borderRadius:5, background:meta.bg, color:meta.c, fontSize:8, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{ci+1}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontSize:11.5, fontWeight:isSel?600:500, color:isSel?"#18103a":"#4a3880", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                    {c.title || <em style={{ opacity:.38, fontWeight:400 }}>Untitled</em>}
                                  </div>
                                  <div style={{ fontSize:8.5, marginTop:1, display:"flex", gap:4, alignItems:"center" }}>
                                    <span style={{ color:meta.c, fontWeight:700, textTransform:"uppercase", letterSpacing:".05em" }}>{meta.ico} {meta.lbl}</span>
                                    {actCt>0 && <span style={{ background:"#ede9fe", color:"#7c3aed", borderRadius:4, padding:"0 4px", fontSize:7.5, fontWeight:700 }}>+{actCt}</span>}
                                  </div>
                                </div>
                                <button onClick={e=>{e.stopPropagation();delChAt(mi,ci);}}
                                  style={{ width:14, height:14, border:"none", background:"transparent", color:"#d4d0e8", cursor:"pointer", fontSize:9, display:"flex", alignItems:"center", justifyContent:"center", borderRadius:3, flexShrink:0, transition:"color .12s" }}
                                  onMouseEnter={e=>e.currentTarget.style.color="#dc2626"}
                                  onMouseLeave={e=>e.currentTarget.style.color="#d4d0e8"}>✕</button>
                              </div>
                            );
                          })}

                          {/* Add chapter row */}
                          <div style={{ padding:"6px 12px 4px 34px" }}>
                            <div style={{ display:"flex", gap:5 }}>
                              {(["lesson","quiz","assessment"] as ChapterType[]).map(t => (
                                <button key={t} className="mb-addch" onClick={()=>addCh(t)}
                                  style={{ border:`1px dashed ${TM[t].c}55`, background:TM[t].bg+"44", color:TM[t].c }}>
                                  <span style={{ fontSize:13 }}>{TM[t].ico}</span>{TM[t].lbl}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sidebar footer — module ± controls */}
              <div style={{ padding:"10px 16px", borderTop:"1px solid rgba(109,40,217,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexShrink:0 }}>
                <span style={{ fontSize:11, color:"#a89dc8", fontWeight:600 }}>{modules.length} module{modules.length!==1?"s":""}</span>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>delModAt(modules.length-1)}
                    style={{ width:28, height:28, borderRadius:8, background:"#fee2e2", color:"#dc2626", border:"1px solid rgba(220,38,38,0.12)", cursor:"pointer", fontSize:17, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", transition:"transform .12s" }}
                    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="none"}>−</button>
                  <button onClick={addMod}
                    style={{ width:28, height:28, borderRadius:8, background:"#ede9fe", color:"#7c3aed", border:"1px solid rgba(109,40,217,0.18)", cursor:"pointer", fontSize:17, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", transition:"transform .12s" }}
                    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="none"}>+</button>
                </div>
              </div>
            </div>

            {/* ──────────────────────────────────────────────────────────────
                RIGHT EDITOR  –  Full spacious editing area
            ────────────────────────────────────────────────────────────── */}
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#fff" }}>
              {ch && chMeta ? (
                <>
                  {/* ── Editor top bar: tabs + context ── */}
                  <div style={{ display:"flex", alignItems:"center", padding:"0 32px", borderBottom:"1px solid rgba(109,40,217,0.09)", background:"#fff", flexShrink:0 }}>
                    <button className={`mb-tab${activeTab==="content"?" on":""}`} onClick={()=>setActiveTab("content")}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M2 3.5h10M2 7h8M2 10.5h6"/></svg>
                      Content
                    </button>

                    {/* Right — Activities button + chapter type badge + breadcrumb */}
                    <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
                      <ActivityBuilderTrigger
                        activities={activities}
                        onSave={acts => { setActivities(acts); toast(`${acts.length} activit${acts.length===1?"y":"ies"} saved!`); }}
                        chapterLabel={ch?.title || `Chapter ${selCh + 1}`}
                      />
                      <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background:chMeta.bg, color:chMeta.c, border:`1.5px solid ${chMeta.border}`, fontSize:11.5, fontWeight:700 }}>
                        {chMeta.ico} {chMeta.lbl}
                      </span>
                      <span style={{ fontSize:10.5, color:"#c4bdd8" }}>
                        {mod.title||"Module"} <span style={{ margin:"0 3px" }}>›</span>
                        <span style={{ color:"#7c65a8", fontWeight:600 }}>{ch.title||"Untitled chapter"}</span>
                      </span>
                    </div>
                  </div>

                  {/* ── Module title field (contextual, right above chapter editor) ── */}
                  <div style={{ padding:"12px 32px 0", borderBottom:"1px solid rgba(109,40,217,0.07)", background:"#faf9ff", flexShrink:0 }}>
                    <div style={{ display:"flex", gap:12, alignItems:"flex-end", paddingBottom:12 }}>
                      <div style={{ minWidth:200 }}>
                        <label style={{ ...LBL, marginBottom:4 }}>Module Title</label>
                        <input value={mod.title} onChange={e=>updModTitle(selMod,e.target.value)}
                          placeholder="e.g. Getting Started"
                          style={{ ...IN, fontSize:13, padding:"8px 12px", background:"#fff" }}/>
                      </div>
                      <div style={{ fontSize:10.5, color:"#a89dc8", paddingBottom:10, fontWeight:600 }}>
                        Chapter {selCh+1} of {mod.chapters.length}
                      </div>
                      <div style={{ marginLeft:"auto", display:"flex", gap:6, paddingBottom:4 }}>
                        <button className="mb-nav prev" disabled={!prevCh}
                          onClick={()=>prevCh&&gotoChapter(prevCh.mi,prevCh.ci)}>
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M8 2L4 6l4 4"/></svg>
                          {prevCh && prevCh.mi!==selMod ? `← Module ${prevCh.mi+1}` : "← Prev"}
                        </button>
                        <button className="mb-nav next" disabled={!nextCh}
                          onClick={()=>nextCh&&gotoChapter(nextCh.mi,nextCh.ci)}>
                          {nextCh && nextCh.mi!==selMod ? `Module ${nextCh.mi+1} →` : "Next →"}
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M4 2l4 4-4 4"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Main editor scroll body ── */}
                  <div key={editorKey} className="mb-slide" style={{ flex:1, overflowY:"auto", padding:"28px 32px 40px", display:"flex", flexDirection:"column", gap:24 }}>

                    {/* ══ CONTENT TAB ══════════════════════════════════════════ */}
                    {activeTab==="content" && (
                      <>
                        {/* ── Chapter identity ── */}
                        <section>
                          <div className="mb-section-hd">
                            <span style={{ color:"rgba(124,58,237,0.7)" }}>01 </span>Chapter Identity
                          </div>
                          <div style={{ display:"flex", gap:16 }}>
                            <div style={{ flex:1 }}>
                              <label style={LBL}>Title <span style={{ color:"#dc2626" }}>*</span></label>
                              <input value={ch.title} onChange={e=>updChField("title",e.target.value)}
                                placeholder="e.g. Welcome & Overview"
                                style={{ ...IN, fontSize:15, fontWeight:600, padding:"12px 15px" }}/>
                            </div>
                            <div style={{ minWidth:172 }}>
                              <label style={LBL}>Type <span style={{ color:"#dc2626" }}>*</span></label>
                              <select value={ch.type} onChange={e=>updChField("type",e.target.value)}
                                style={{ ...IN, cursor:"pointer", padding:"12px 15px", appearance:"none", WebkitAppearance:"none", backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none' stroke='%237c3aed' stroke-width='1.8'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center" }}>
                                <option value="lesson">📖 Lesson</option>
                                <option value="quiz">❓ Quiz</option>
                                <option value="assessment">📝 Assessment</option>
                              </select>
                            </div>
                          </div>
                        </section>

                        {/* ── Media ── */}
                        <section>
                          <div className="mb-section-hd">
                            <span style={{ color:"rgba(13,148,136,0.7)" }}>02 </span>Media
                          </div>
                          <div style={{ background:"#faf9ff", border:"1px solid rgba(109,40,217,0.1)", borderRadius:16, padding:"18px 20px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                              <span style={{ fontSize:12.5, color:"#7c65a8", fontWeight:600 }}>Attach media to this chapter</span>
                              <div style={{ display:"flex", gap:7, marginLeft:"auto" }}>
                                {(["none","video","presentation"] as MediaType[]).map(t => (
                                  <button key={t} className="mb-media-btn"
                                    onClick={()=>updMedia({type:t, url:media.url, label:media.label})}
                                    style={{ border:`1.5px solid ${media.type===t?"rgba(109,40,217,0.4)":"rgba(109,40,217,0.13)"}`, background:media.type===t?"#ede9fe":"#fff", color:media.type===t?"#6d28d9":"#8e7ec0" }}>
                                    {t==="none"?"None":t==="video"?"🎬 Video":"📊 Slides"}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {media.type!=="none" && (
                              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                                <input value={media.url} onChange={e=>updMedia({...media,url:e.target.value})}
                                  placeholder={media.type==="video"?"YouTube · Vimeo · direct .mp4 URL…":"Google Slides · OneDrive URL…"}
                                  style={IN}/>
                                <input value={media.label??""} onChange={e=>updMedia({...media,label:e.target.value})}
                                  placeholder="Caption / label (optional)" style={{ ...IN, fontSize:12.5 }}/>
                                {media.url.trim() && (
                                  <div style={{ borderRadius:13, overflow:"hidden", background:"#111", aspectRatio:"16/9" }}>
                                    {media.type==="video"&&directVid ? <video src={media.url} controls style={{ width:"100%",height:"100%",display:"block" }}/>
                                    :media.type==="video"&&vidEmbed  ? <iframe src={vidEmbed} style={{ width:"100%",height:"100%",border:"none",display:"block" }} allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowFullScreen title="Video"/>
                                    :media.type==="presentation"&&pptEmbed ? <iframe src={pptEmbed} style={{ width:"100%",height:"100%",border:"none",display:"block" }} allowFullScreen title="Presentation"/>
                                    :<div style={{ minHeight:90,display:"flex",alignItems:"center",justifyContent:"center",color:"#8e7ec0",background:"#f5f3ff",fontSize:12 }}>Preview not available</div>}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </section>

                        {/* ── Lesson body ── */}
                        {ch.type==="lesson" && (
                          <section>
                            <div className="mb-section-hd">
                              <span style={{ color:"rgba(2,132,199,0.7)" }}>03 </span>
                              Lesson Content <span style={{ fontWeight:400, fontSize:10, color:"#c4bdd8", letterSpacing:0 }}>· HTML supported</span>
                            </div>
                            <textarea value={ch.content.body??""} onChange={e=>updBody(e.target.value)}
                              placeholder={"<p>Enter lesson content here...</p>\n<h2>Subheading</h2>\n<p>More content…</p>"}
                              rows={14}
                              style={{ ...IN, fontFamily:"ui-monospace,'Fira Code',monospace", resize:"vertical", lineHeight:1.72, fontSize:12.5, padding:"14px 16px" }}/>
                          </section>
                        )}

                        {/* ── Quiz / Assessment ── */}
                        {(ch.type==="quiz"||ch.type==="assessment") && (
                          <section>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                              <div>
                                <div className="mb-section-hd" style={{ marginBottom:3 }}>
                                  <span style={{ color:ch.type==="assessment"?"rgba(217,119,6,0.7)":"rgba(124,58,237,0.7)" }}>03 </span>Questions
                                </div>
                                <div style={{ fontSize:11, color:"#c4bdd8" }}>{(ch.content.questions??[]).length} question{(ch.content.questions??[]).length!==1?"s":""} · select the radio to mark correct answer</div>
                              </div>
                              <button className="mb-btn-p" onClick={addQ} style={{ padding:"8px 18px", fontSize:12 }}>+ Add Question</button>
                            </div>
                            <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
                              {(ch.content.questions??[]).map((q,qi) => (
                                <div key={qi} className="mb-q-card">
                                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                                    <div style={{ width:28, height:28, borderRadius:8, background:ch.type==="assessment"?"#fef3c7":"#ede9fe", color:ch.type==="assessment"?"#b45309":"#7c3aed", fontSize:11.5, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{qi+1}</div>
                                    <input value={q.q} onChange={e=>updQ(qi,"q",e.target.value)} placeholder="Type your question…"
                                      style={{ flex:1, border:"1.5px solid rgba(109,40,217,0.12)", borderRadius:10, padding:"9px 13px", fontSize:13.5, background:"#faf9ff", outline:"none", color:"#18103a", fontFamily:"'Plus Jakarta Sans',sans-serif", transition:"border-color .15s" }}/>
                                    <button onClick={()=>delQ(qi)} style={{ width:30, height:30, borderRadius:9, border:"1px solid rgba(220,38,38,0.15)", background:"#fee2e2", color:"#dc2626", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                                  </div>
                                  <div style={{ display:"flex", flexDirection:"column", gap:8, paddingLeft:38 }}>
                                    {q.opts.map((opt,oi) => (
                                      <div key={oi} style={{ display:"flex", alignItems:"center", gap:10 }}>
                                        <input type="radio" name={`ans-${selMod}-${selCh}-${qi}`} checked={q.ans===oi} onChange={()=>updQ(qi,"ans",oi)}
                                          style={{ accentColor:"#7c3aed", width:16, height:16, flexShrink:0, cursor:"pointer" }}/>
                                        <input value={opt} onChange={e=>updOpt(qi,oi,e.target.value)}
                                          placeholder={`Option ${oi+1}${q.ans===oi?" ✓ correct":""}`}
                                          style={{ flex:1, border:`1.5px solid ${q.ans===oi?"rgba(22,163,74,0.45)":"rgba(109,40,217,0.1)"}`, borderRadius:10, padding:"8px 12px", fontSize:13, background:q.ans===oi?"#f0fdf4":"#fff", outline:"none", color:"#18103a", fontFamily:"'Plus Jakarta Sans',sans-serif", transition:"border-color .14s,background .14s" }}/>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        )}
                      </>
                    )}

                    {/* Activities are now accessible via the 🧩 Activities button in the header above */}

                  </div>
                </>
              ) : (
                /* Empty state — no chapter selected */
                <div className="mb-empty">
                  <div style={{ width:72, height:72, borderRadius:20, background:"#f5f3ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, boxShadow:"0 3px 16px rgba(109,40,217,0.09)" }}>📖</div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#a89dc8" }}>No chapter selected</div>
                  <div style={{ fontSize:13, color:"#c4bdd8", lineHeight:1.7 }}>
                    Pick a chapter from the sidebar to start editing,<br/>or add a new chapter inside any module.
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
