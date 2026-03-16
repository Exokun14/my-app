'use client'

import { useState, useRef, useCallback, useMemo, useId } from "react";
import type { Course } from "../../Data/types";
import { THUMB_GRADIENTS, THUMB_PATTERNS, CAT_ICONS } from "../Logic/CourseCatalogLogic";

interface DashboardProps {
  courses: Course[];
  onOpenCourse: (idx: number) => void;
  onGoToCatalog: () => void;
}

function fmtTime(mins: number) {
  if (!mins || mins < 1) return "0m";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── MiniRing ─────────────────────────────────────────────────────────────────
function MiniRing({ pct, size = 48, stroke = 4 }: { pct: number; size?: number; stroke?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gid = `rg${uid}`;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min((pct / 100) * circ, circ);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)", flexShrink: 0, display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(124,58,237,.1)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray .9s cubic-bezier(.16,1,.3,1)" }} />
    </svg>
  );
}

// ─── AI Banner ────────────────────────────────────────────────────────────────
function AIBanner({ courses, onOpenCourse, onGoToCatalog }: {
  courses: Course[]; onOpenCourse:(i:number)=>void; onGoToCatalog:()=>void;
}) {
  const enrolled   = courses.filter(c => c.enrolled || (c.progress??0)>0);
  const completed  = courses.filter(c => c.completed || (c.progress??0)>=100);
  // FIX: a course is "In Progress" once enrolled, even at 0% — progress only
  // updates after the first chapter is completed due to React state batching.
  const inProg     = enrolled.filter(c => !c.completed && (c.progress??0)<100);
  const notStarted = courses.filter(c => !(c.enrolled||(c.progress??0)>0));
  const avg = enrolled.length ? Math.round(enrolled.reduce((s,c)=>s+(c.progress??0),0)/enrolled.length) : 0;
  const rec    = inProg[0] ?? notStarted[0] ?? null;
  const recIdx = rec ? courses.indexOf(rec) : -1;
  const hr = new Date().getHours();
  const greet = hr<12 ? "Good morning" : hr<17 ? "Good afternoon" : "Good evening";

  const insight = !enrolled.length
    ? "Start your first course — I'll track your progress and surface what matters most."
    : completed.length===enrolled.length
    ? `You've completed all ${completed.length} enrolled courses. Ready for your next challenge?`
    : inProg.length && avg>=70
    ? `You're at ${avg}% average — I think you can finish ${inProg.length} course${inProg.length>1?"s":""} this week.`
    : inProg.length
    ? `${inProg.length} course${inProg.length>1?"s":""} in progress. Consistent learners finish ${Math.round(3+avg/25)}x faster.`
    : `You're enrolled in ${enrolled.length} course${enrolled.length>1?"s":""}. I recommend starting today.`;

  return (
    <div className="db-hero">
      <div className="db-hero-mesh" />
      <div className="db-hero-glow db-hero-glow1" />
      <div className="db-hero-glow db-hero-glow2" />

      <div className="db-hero-inner">
        {/* Left */}
        <div className="db-hero-left">
          <div className="db-ai-badge">
            <div className="db-ai-badge-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L9.5 9.5H2L8 14l-2.5 7.5L12 17l6.5 4.5L16 14l6-4.5h-7.5z" fill="white"/>
              </svg>
            </div>
            <span>AI Learning Companion</span>
            <div className="db-ai-pulse" />
          </div>

          <div className="db-hero-greet">{greet}, <em>learner</em> 👋</div>
          <p className="db-hero-insight">{insight}</p>

          <div className="db-hero-stats">
            {enrolled.length > 0 && (
              <div className="db-hstat db-hstat-v">
                <span className="db-hstat-n">{avg}%</span>
                <span className="db-hstat-l">avg progress</span>
              </div>
            )}
            {completed.length > 0 && (
              <div className="db-hstat db-hstat-g">
                <span className="db-hstat-n">{completed.length}</span>
                <span className="db-hstat-l">completed</span>
              </div>
            )}
            {inProg.length > 0 && (
              <div className="db-hstat db-hstat-t">
                <span className="db-hstat-n">{inProg.length}</span>
                <span className="db-hstat-l">in progress</span>
              </div>
            )}
          </div>
        </div>

        {/* Right — AI rec */}
        <div className="db-hero-right">
          <div className="db-ai-rec-label">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="#7c3aed">
              <path d="M12 2L9.5 9.5H2L8 14l-2.5 7.5L12 17l6.5 4.5L16 14l6-4.5h-7.5z"/>
            </svg>
            AI Pick for you
          </div>
          {rec && recIdx >= 0 ? (
            <div className="db-ai-rec" onClick={() => onOpenCourse(recIdx)}>
              <div className="db-ai-rec-thumb"
                style={{ background: `linear-gradient(135deg,${THUMB_GRADIENTS[recIdx%THUMB_GRADIENTS.length][0]},${THUMB_GRADIENTS[recIdx%THUMB_GRADIENTS.length][1]})` }}>
                <span style={{fontSize:20}}>{CAT_ICONS[rec.cat]||rec.thumbEmoji||"📚"}</span>
              </div>
              <div className="db-ai-rec-body">
                <div className="db-ai-rec-tag">{inProg.includes(rec) ? "Continue" : "Start now"}</div>
                <div className="db-ai-rec-title">{rec.title}</div>
                {(rec.progress??0) > 0 && (
                  <div className="db-ai-rec-bar">
                    <div className="db-ai-rec-fill" style={{width:`${rec.progress}%`}}/>
                  </div>
                )}
              </div>
              <div className="db-ai-rec-arr">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4"/>
                </svg>
              </div>
            </div>
          ) : (
            <button className="db-ai-browse" onClick={onGoToCatalog}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/>
                <rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>
              </svg>
              Browse Catalog
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StatChip ─────────────────────────────────────────────────────────────────
const CHIP_CFG: Record<string,{accent:string;bg:string;border:string}> = {
  sv: { accent:"#7c3aed", bg:"rgba(124,58,237,.05)",  border:"rgba(124,58,237,.13)" },
  sa: { accent:"#d97706", bg:"rgba(217,119,6,.05)",   border:"rgba(217,119,6,.15)"  },
  sg: { accent:"#059669", bg:"rgba(5,150,105,.05)",   border:"rgba(5,150,105,.15)"  },
  sb: { accent:"#2563eb", bg:"rgba(37,99,235,.05)",   border:"rgba(37,99,235,.13)"  },
};

function StatChip({ n, label, emoji, cls, delay, courses, onOpenCourse }: {
  n:number; label:string; emoji:string; cls:string; delay:string;
  courses:Course[]; onOpenCourse:(i:number)=>void;
}) {
  const [open, setOpen] = useState(false);
  const cfg = CHIP_CFG[cls] ?? CHIP_CFG.sv;

  const items = courses.map((c,i)=>({c,i})).filter(({c}) => {
    const pct=c.progress??0, done=c.completed||pct>=100, enr=c.enrolled||pct>0;
    if(label==="Enrolled")    return enr;
    if(label==="In Progress") return enr&&!done&&(c.progress??0)<100;
    if(label==="Completed")   return done;
    if(label==="Available")   return !enr;
    return false;
  });

  return (
    <div className="db-chip" style={{
      animationDelay: delay,
      "--ca": cfg.accent, "--cbg": cfg.bg, "--cbr": cfg.border
    } as React.CSSProperties}>
      <div className="db-chip-face" onClick={() => items.length>0 && setOpen(o=>!o)}
        style={{ cursor: items.length>0?"pointer":"default" }}>
        <div className="db-chip-left">
          <span className="db-chip-emoji">{emoji}</span>
          <div>
            <div className="db-chip-num">{n}</div>
            <div className="db-chip-lbl">{label}</div>
          </div>
        </div>
        {items.length > 0 && (
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"
            style={{ flexShrink:0, transition:"transform .22s", transform:open?"rotate(180deg)":"none", color: cfg.accent }}>
            <path d="M2 5l5 5 5-5"/>
          </svg>
        )}
      </div>
      <div className="db-chip-expand" style={{ maxHeight: open ? `${items.length*52+36}px` : 0 }}>
        <div className="db-chip-xhead">{label} · {items.length}</div>
        {items.map(({c,i},idx) => {
          const pct=c.progress??0, done=c.completed||pct>=100;
          const g=THUMB_GRADIENTS[i%THUMB_GRADIENTS.length];
          const ic=CAT_ICONS[c.cat]||c.thumbEmoji||"📚";
          return (
            <div key={idx} className="db-chip-row"
              onClick={e=>{e.stopPropagation();onOpenCourse(i);setOpen(false);}}>
              <div className="db-chip-row-th" style={{background:`linear-gradient(135deg,${g[0]},${g[1]})`}}>
                <span style={{fontSize:11}}>{ic}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div className="db-chip-row-name">{c.title}</div>
                {pct>0&&<div style={{display:"flex",alignItems:"center",gap:4,marginTop:3}}>
                  <div style={{flex:1,height:2,borderRadius:2,background:"rgba(0,0,0,.06)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:done?"linear-gradient(90deg,#059669,#0d9488)":"linear-gradient(90deg,#7c3aed,#a78bfa)",borderRadius:2}}/>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,color:done?"#059669":cfg.accent,flexShrink:0}}>{done?"✓":pct+"%"}</span>
                </div>}
              </div>
              <svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="#c4c4d0" strokeWidth="2"><path d="M5 2l4 5-4 5"/></svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TimeChip ─────────────────────────────────────────────────────────────────
function TimeChip({ avg, totalTime, delay }: { avg:number; totalTime:number; delay:string }) {
  return (
    <div className="db-chip db-chip-wide" style={{ animationDelay:delay, "--ca":"#7c3aed", "--cbg":"rgba(124,58,237,.04)", "--cbr":"rgba(124,58,237,.12)" } as React.CSSProperties}>
      <div className="db-chip-face" style={{cursor:"default"}}>
        <div className="db-chip-left">
          <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <MiniRing pct={avg} size={48} stroke={4}/>
            <div style={{position:"absolute",fontSize:8,fontWeight:800,color:"#7c3aed",lineHeight:1}}>{avg}%</div>
          </div>
          <div>
            <div className="db-chip-num">{fmtTime(totalTime)}</div>
            <div className="db-chip-lbl">Total time spent</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Recent Courses ───────────────────────────────────────────────────────────
function RecentCourses({ courses, onOpenCourse }: { courses:Course[]; onOpenCourse:(i:number)=>void }) {
  const recent = courses
    .map((c,i)=>({c,i}))
    .filter(({c})=>(c.enrolled||(c.progress??0)>0))
    .sort((a,b)=>(b.c.progress??0)-(a.c.progress??0))
    .slice(0,5);
  if(!recent.length) return null;

  return (
    <div className="db-recent">
      <div className="db-section-head">
        <span className="db-section-title">Recent</span>
        <span className="db-section-count">{recent.length} active</span>
      </div>
      <div className="db-strip-list">
        {recent.map(({c,i},idx)=>{
          const pct=c.progress??0, done=c.completed||pct>=100;
          const g=THUMB_GRADIENTS[i%THUMB_GRADIENTS.length];
          const ic=CAT_ICONS[c.cat]||c.thumbEmoji||"📚";
          return (
            <div key={idx} className="db-strip" style={{animationDelay:`${idx*.05}s`}} onClick={()=>onOpenCourse(i)}>
              <div className="db-strip-accent" style={{background:`linear-gradient(to bottom,${g[0]},${g[1]})`}}/>
              <div className="db-strip-thumb" style={{background:`linear-gradient(135deg,${g[0]},${g[1]})`}}>
                <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 35% 35%,rgba(255,255,255,.22),transparent 65%)"}}/>
                <span style={{fontSize:18,position:"relative",zIndex:1}}>{ic}</span>
              </div>
              <div className="db-strip-body">
                <div className="db-strip-cat">{c.cat||"Course"}</div>
                <div className="db-strip-title">{c.title}</div>
                <div className="db-strip-prog">
                  {done
                    ? <span className="db-strip-done"><svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="#059669" strokeWidth="2.2"><path d="M2 7l4 4 6-6"/></svg>Completed</span>
                    : <><div className="db-strip-track"><div className="db-strip-fill" style={{width:`${pct}%`,background:`linear-gradient(90deg,${g[0]},${g[1]})`}}/></div><span className="db-strip-pct">{pct}%</span></>
                  }
                </div>
              </div>
              <div className="db-strip-right">
                <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <MiniRing pct={pct} size={36} stroke={3}/>
                  <div style={{position:"absolute",fontSize:7,fontWeight:800,color:"#7c3aed",lineHeight:1}}>{pct}%</div>
                </div>
                <button className="db-strip-btn" onClick={e=>{e.stopPropagation();onOpenCourse(i);}}>
                  <svg width="7" height="7" viewBox="0 0 18 18" fill="white"><path d="M5 3.5l10 5.5-10 5.5V3.5z"/></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Featured Shelf (vertical scroll, light cards) ────────────────────────────
const SHELF_GRADS = [
  ["#4c1d95","#7c3aed"],["#0c4a6e","#0369a1"],["#064e3b","#0d9488"],
  ["#78350f","#b45309"],["#1e1b4b","#4338ca"],["#134e4a","#0f766e"],
  ["#3b0764","#7e22ce"],["#7f1d1d","#b91c1c"],
];

function FeaturedShelf({ courses, onOpenCourse, onGoToCatalog }: {
  courses:Course[]; onOpenCourse:(i:number)=>void; onGoToCatalog:()=>void;
}) {
  const featured = useMemo(()=>[
    ...courses.filter(c=>!c.completed&&(c.progress??0)>0&&(c.progress??0)<100),
    ...courses.filter(c=>!(c.enrolled||(c.progress??0)>0)),
    ...courses.filter(c=>c.completed||(c.progress??0)>=100),
  ].slice(0,6),[courses]);

  if(!featured.length) return null;

  return (
    <div className="db-shelf">
      <div className="db-section-head" style={{marginBottom:12}}>
        <span className="db-section-title">Featured</span>
        <span className="db-section-count">· {featured.length}</span>
        <div style={{flex:1}}/>
        <button className="db-shelf-all" onClick={onGoToCatalog}>View all →</button>
      </div>

      <div className="db-shelf-scroll">
        {featured.map((c,idx)=>{
          const ri=courses.indexOf(c);
          const pct=c.progress??0;
          const done=c.completed===true||pct>=100, enr=c.enrolled===true||pct>0;
          const g=SHELF_GRADS[idx%SHELF_GRADS.length];
          const pat=THUMB_PATTERNS[ri%THUMB_PATTERNS.length];
          const ic=CAT_ICONS[c.cat]||c.thumbEmoji||"📚";

          return (
            <div key={idx} className="db-shelf-card" onClick={()=>onOpenCourse(ri)}>
              <div style={{position:"absolute",inset:0,background:`linear-gradient(155deg,${g[0]},${g[1]})`}}/>
              <div style={{position:"absolute",inset:0,backgroundImage:pat,backgroundSize:"16px 16px",opacity:.07}}/>
              <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.04) 55%,transparent 100%)"}}/>
              <div style={{position:"absolute",top:"14%",left:"50%",transform:"translateX(-50%)",fontSize:44,opacity:.2,userSelect:"none",filter:"drop-shadow(0 4px 16px rgba(0,0,0,.4))"}}>{ic}</div>
              <div style={{position:"relative",zIndex:1,marginTop:"auto",padding:"0 11px 11px"}}>
                <div style={{fontSize:8,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"rgba(255,255,255,.5)",marginBottom:4}}>{c.cat||"Course"}</div>
                <div className="db-shelf-title">{c.title}</div>
                {enr&&pct>0&&(
                  <div style={{marginBottom:7}}>
                    <div style={{height:2,borderRadius:2,background:"rgba(255,255,255,.15)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:done?"rgba(110,231,183,.8)":"rgba(196,181,253,.8)",borderRadius:2}}/>
                    </div>
                  </div>
                )}
                <button className={`db-shelf-cta${done?" done":enr?" enr":" new"}`}
                  onClick={e=>{e.stopPropagation();onOpenCourse(ri);}}>
                  {done?"✓ Review":enr?"▶ Continue":"+ Enroll"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dashboard root ───────────────────────────────────────────────────────────
export default function Dashboard({ courses, onOpenCourse, onGoToCatalog }: DashboardProps) {
  const enrolled  = courses.filter(c=>c.enrolled||(c.progress??0)>0);
  const completed = courses.filter(c=>c.completed||(c.progress??0)>=100);
  const inProg    = enrolled.filter(c=>!c.completed&&(c.progress??0)<100);
  const avg       = enrolled.length ? Math.round(enrolled.reduce((s,c)=>s+(c.progress??0),0)/enrolled.length) : 0;
  const totalTime = courses.reduce((s,c)=>s+(c.time_spent??0),0);

  const CHIPS = [
    {n:enrolled.length,  label:"Enrolled",    emoji:"📚", cls:"sv", delay:"0s"},
    {n:inProg.length,    label:"In Progress", emoji:"⚡", cls:"sa", delay:".05s"},
    {n:completed.length, label:"Completed",   emoji:"✅", cls:"sg", delay:".1s"},
    {n:courses.filter(c=>!(c.enrolled||(c.progress??0)>0)).length, label:"Available", emoji:"🔓", cls:"sb", delay:".15s"},
  ];

  return (
    <>
      <style>{DASH_CSS}</style>
      <div className="db-root">
        <div className="db-left">
          <AIBanner courses={courses} onOpenCourse={onOpenCourse} onGoToCatalog={onGoToCatalog}/>
          <div className="db-chips-grid">
            {CHIPS.map((s,i)=>(<StatChip key={i} {...s} courses={courses} onOpenCourse={onOpenCourse}/>))}
            <TimeChip avg={avg} totalTime={totalTime} delay=".2s"/>
          </div>
          <RecentCourses courses={courses} onOpenCourse={onOpenCourse}/>
        </div>
        <div className="db-right">
          <FeaturedShelf courses={courses} onOpenCourse={onOpenCourse} onGoToCatalog={onGoToCatalog}/>
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const DASH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');

@keyframes db-up   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
@keyframes db-pop  { 0%{opacity:0;transform:scale(.96)} 60%{transform:scale(1.01)} 100%{opacity:1;transform:none} }
@keyframes db-in   { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }
@keyframes db-bar  { from{width:0!important} to{} }
@keyframes db-pulse{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.65)} }

/* ── Root layout ─────────────────────────────────────────────────────────── */
.db-root {
  font-family: 'DM Sans', system-ui, sans-serif;
  flex: 1 1 0; min-height: 0;
  display: flex; gap: 20px;
}
.db-left {
  flex: 1 1 0; min-width: 0; min-height: 0;
  display: flex; flex-direction: column; gap: 14px;
  overflow-y: auto; overflow-x: hidden; padding-right: 2px;
}
.db-left::-webkit-scrollbar { width: 3px; }
.db-left::-webkit-scrollbar-thumb { background: rgba(124,58,237,.15); border-radius: 3px; }
.db-right {
  flex: 0 0 256px; width: 256px;
  display: flex; flex-direction: column; min-height: 0;
  border-left: 1.5px solid rgba(124,58,237,.09);
  padding-left: 20px;
}

/* ── Section header ──────────────────────────────────────────────────────── */
.db-section-head { display:flex; align-items:center; gap:6px; margin-bottom:10px; }
.db-section-title { font-size:10px; font-weight:800; color:#18103a; text-transform:uppercase; letter-spacing:.1em; }
.db-section-count { font-size:11px; font-weight:500; color:#8e7ec0; }

/* ── AI HERO ─────────────────────────────────────────────────────────────── */
.db-hero {
  position: relative; border-radius: 18px; overflow: hidden;
  background: #ffffff;
  border: 1.5px solid rgba(124,58,237,.12);
  box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 8px 32px rgba(124,58,237,.07);
  flex-shrink: 0;
  animation: db-up .4s cubic-bezier(.16,1,.3,1) both;
}
.db-hero-mesh {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 90% 60% at 105% -5%, rgba(124,58,237,.06) 0%, transparent 55%),
    radial-gradient(ellipse 70% 70% at -5% 110%, rgba(13,148,136,.04) 0%, transparent 55%);
}
.db-hero-glow { position: absolute; border-radius: 50%; pointer-events: none; }
.db-hero-glow1 {
  width: 300px; height: 300px; top: -110px; right: -70px;
  background: radial-gradient(circle, rgba(124,58,237,.07) 0%, transparent 60%);
}
.db-hero-glow2 {
  width: 220px; height: 220px; bottom: -90px; left: 3%;
  background: radial-gradient(circle, rgba(13,148,136,.05) 0%, transparent 60%);
}
.db-hero-inner {
  position: relative; z-index: 1;
  display: flex; gap: 0; align-items: stretch;
}
.db-hero-left {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column;
  padding: 22px 20px 20px 22px;
}
.db-hero-right {
  flex-shrink: 0; width: 210px;
  display: flex; flex-direction: column; gap: 8px;
  border-left: 1.5px solid rgba(124,58,237,.08);
  padding: 22px 18px 20px;
}

/* AI badge */
.db-ai-badge {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 4px 12px 4px 5px; border-radius: 999px; margin-bottom: 14px;
  background: linear-gradient(135deg, rgba(124,58,237,.07), rgba(13,148,136,.04));
  border: 1px solid rgba(124,58,237,.16);
  font-size: 9.5px; font-weight: 700; color: #7c3aed;
  letter-spacing: .06em; text-transform: uppercase;
  width: fit-content;
}
.db-ai-badge-icon {
  width: 22px; height: 22px; border-radius: 7px;
  background: linear-gradient(135deg, #7c3aed, #0d9488);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; box-shadow: 0 2px 6px rgba(124,58,237,.3);
}
.db-ai-pulse {
  width: 6px; height: 6px; border-radius: 50%; background: #7c3aed;
  box-shadow: 0 0 0 3px rgba(124,58,237,.15);
  animation: db-pulse 2s ease-in-out infinite; margin-left: 2px;
}

/* Greeting */
.db-hero-greet {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 27px; font-weight: 400; font-style: italic;
  color: #18103a; line-height: 1.2; margin-bottom: 9px;
}
.db-hero-greet em { color: #7c3aed; }

/* Insight */
.db-hero-insight {
  font-size: 13px; line-height: 1.65; color: #4a3870;
  margin: 0 0 18px; max-width: 440px;
}

/* Stat pills */
.db-hero-stats { display: flex; gap: 7px; flex-wrap: wrap; }
.db-hstat {
  padding: 8px 14px; border-radius: 10px; text-align: center;
  border: 1.5px solid; min-width: 74px;
}
.db-hstat-v { background: rgba(124,58,237,.05); border-color: rgba(124,58,237,.16); }
.db-hstat-g { background: rgba(5,150,105,.05);  border-color: rgba(5,150,105,.16); }
.db-hstat-t { background: rgba(13,148,136,.05); border-color: rgba(13,148,136,.16); }
.db-hstat-n { display:block; font-size:20px; font-weight:800; line-height:1; letter-spacing:-.03em; }
.db-hstat-v .db-hstat-n { color: #7c3aed; }
.db-hstat-g .db-hstat-n { color: #059669; }
.db-hstat-t .db-hstat-n { color: #0d9488; }
.db-hstat-l { display:block; font-size:9px; font-weight:600; margin-top:3px; text-transform:uppercase; letter-spacing:.07em; color:#8e7ec0; }

/* AI rec label */
.db-ai-rec-label {
  display: flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 800; color: #7c3aed;
  text-transform: uppercase; letter-spacing: .1em;
}

/* AI rec card */
.db-ai-rec {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 11px 11px; border-radius: 14px; cursor: pointer;
  background: linear-gradient(135deg, rgba(124,58,237,.04), rgba(13,148,136,.02));
  border: 1.5px solid rgba(124,58,237,.12);
  transition: all .18s; flex: 1;
}
.db-ai-rec:hover {
  background: linear-gradient(135deg, rgba(124,58,237,.09), rgba(13,148,136,.05));
  border-color: rgba(124,58,237,.22); transform: translateX(2px);
}
.db-ai-rec-thumb {
  width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,.14);
}
.db-ai-rec-body { flex: 1; min-width: 0; }
.db-ai-rec-tag { font-size:8.5px; font-weight:700; color:#7c3aed; text-transform:uppercase; letter-spacing:.08em; margin-bottom:3px; }
.db-ai-rec-title { font-size:12px; font-weight:600; color:#18103a; line-height:1.35; margin-bottom:7px; }
.db-ai-rec-bar { height:3px; border-radius:3px; background:rgba(124,58,237,.1); overflow:hidden; }
.db-ai-rec-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,#7c3aed,#0d9488); }
.db-ai-rec-arr { flex-shrink:0; color:#8e7ec0; margin-top:2px; transition:transform .18s, color .18s; }
.db-ai-rec:hover .db-ai-rec-arr { transform:translateX(3px); color:#7c3aed; }

.db-ai-browse {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 10px; border-radius: 12px; cursor: pointer;
  background: rgba(124,58,237,.05); border: 1.5px solid rgba(124,58,237,.13);
  color: #7c3aed; font-size: 12px; font-weight: 600;
  font-family: 'DM Sans', sans-serif; transition: all .15s;
}
.db-ai-browse:hover { background: rgba(124,58,237,.1); }

/* ── STAT CHIPS ──────────────────────────────────────────────────────────── */
.db-chips-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 8px; flex-shrink: 0;
}
.db-chip-wide { grid-column: 1 / -1; }

.db-chip {
  border-radius: 14px; overflow: hidden; background: #fff;
  border: 1.5px solid var(--cbr, rgba(124,58,237,.12));
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
  animation: db-pop .38s cubic-bezier(.16,1,.3,1) both;
  position: relative;
}
.db-chip::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: var(--ca, #7c3aed); border-radius: 14px 14px 0 0;
}
.db-chip-face {
  display: flex; align-items: center; justify-content: space-between;
  padding: 13px 14px 13px 13px;
}
.db-chip-left { display: flex; align-items: center; gap: 12px; }
.db-chip-emoji { font-size: 20px; line-height: 1; }
.db-chip-num {
  font-size: 28px; font-weight: 800; line-height: 1;
  letter-spacing: -.05em; color: var(--ca, #7c3aed);
}
.db-chip-lbl {
  font-size: 9.5px; font-weight: 600; color: #8e7ec0;
  text-transform: uppercase; letter-spacing: .07em; margin-top: 1px;
}

/* Inline expand */
.db-chip-expand {
  overflow: hidden; transition: max-height .3s cubic-bezier(.16,1,.3,1); max-height: 0;
}
.db-chip-xhead {
  padding: 7px 13px 5px; font-size: 9px; font-weight: 700; color: #b0a8cc;
  text-transform: uppercase; letter-spacing: .1em;
  border-top: 1px solid rgba(124,58,237,.07);
}
.db-chip-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; cursor: pointer;
  border-top: 1px solid rgba(124,58,237,.04); transition: background .12s;
}
.db-chip-row:hover { background: var(--cbg, rgba(124,58,237,.04)); }
.db-chip-row-th {
  width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.db-chip-row-name { font-size:12px; font-weight:600; color:#18103a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* ── RECENT COURSES ──────────────────────────────────────────────────────── */
.db-recent { flex-shrink: 0; }
.db-strip-list { display: flex; flex-direction: column; gap: 6px; }

.db-strip {
  display: flex; align-items: center; gap: 11px;
  background: #fff; border-radius: 13px;
  border: 1.5px solid rgba(124,58,237,.09);
  padding: 10px 12px 10px 0;
  cursor: pointer; overflow: hidden; position: relative; min-height: 70px;
  transition: box-shadow .15s, border-color .15s, transform .15s;
  animation: db-in .3s cubic-bezier(.16,1,.3,1) both;
}
.db-strip:hover {
  border-color: rgba(124,58,237,.2);
  box-shadow: 0 4px 18px rgba(124,58,237,.08);
  transform: translateX(3px);
}
.db-strip-accent {
  width: 3px; align-self: stretch; flex-shrink: 0; border-radius: 0 3px 3px 0;
}
.db-strip-thumb {
  width: 44px; height: 44px; border-radius: 11px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,.12);
}
.db-strip-body { flex: 1; min-width: 0; }
.db-strip-cat {
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .09em; color: #8e7ec0; margin-bottom: 3px;
}
.db-strip-title {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 14px; font-weight: 400; font-style: italic;
  color: #18103a; line-height: 1.25;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 5px;
}
.db-strip-prog { display: flex; align-items: center; gap: 6px; }
.db-strip-track { flex:1; height:3px; border-radius:3px; background:rgba(124,58,237,.08); overflow:hidden; }
.db-strip-fill  { height:100%; border-radius:3px; animation:db-bar .7s cubic-bezier(.16,1,.3,1) both; }
.db-strip-pct   { font-size:10px; font-weight:700; color:#7c3aed; flex-shrink:0; }
.db-strip-done  { font-size:10px; font-weight:600; color:#059669; display:flex; align-items:center; gap:4px; }
.db-strip-right { flex-shrink:0; display:flex; flex-direction:column; align-items:center; gap:5px; padding-right:2px; }
.db-strip-btn {
  width: 24px; height: 24px; border-radius: 7px; border: none; cursor: pointer;
  background: linear-gradient(135deg, #7c3aed, #4f1eb8);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 6px rgba(124,58,237,.28); transition: all .14s;
}
.db-strip-btn:hover { transform: scale(1.1); box-shadow: 0 3px 10px rgba(124,58,237,.38); }

/* ── FEATURED SHELF ──────────────────────────────────────────────────────── */
.db-shelf { flex:1 1 0; min-height:0; display:flex; flex-direction:column; }
.db-shelf-all {
  font-size:11px; font-weight:600; color:#7c3aed;
  background:none; border:none; cursor:pointer; padding:0;
  font-family:'DM Sans',sans-serif; transition:opacity .15s;
}
.db-shelf-all:hover { opacity:.65; }

.db-shelf-scroll {
  display: flex; flex-direction: column; gap: 8px;
  overflow-y: auto; overflow-x: hidden;
  flex: 1 1 0; min-height: 0; padding-right: 2px;
}
.db-shelf-scroll::-webkit-scrollbar { width: 3px; }
.db-shelf-scroll::-webkit-scrollbar-thumb { background: rgba(124,58,237,.15); border-radius:3px; }

.db-shelf-card {
  flex-shrink: 0; height: 128px; border-radius: 16px; overflow: hidden;
  position: relative; display: flex; flex-direction: column;
  cursor: pointer; box-shadow: 0 2px 14px rgba(0,0,0,.14);
  transition: transform .18s, box-shadow .18s;
}
.db-shelf-card:hover { transform: scale(1.02) translateX(2px); box-shadow: 0 6px 24px rgba(0,0,0,.22); }

.db-shelf-title {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 13px; font-weight: 400; font-style: italic;
  color: #fff; line-height: 1.3; margin-bottom: 8px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.db-shelf-cta {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 7px; border: none; cursor: pointer;
  font-size: 10px; font-weight: 700; font-family: 'DM Sans', sans-serif;
  transition: filter .14s; width: fit-content;
}
.db-shelf-cta.new  { background:rgba(255,255,255,.2); color:#fff; border:1px solid rgba(255,255,255,.28); }
.db-shelf-cta.enr  { background:rgba(124,58,237,.9); color:#fff; }
.db-shelf-cta.done { background:rgba(13,148,136,.9); color:#fff; }
.db-shelf-cta:hover { filter:brightness(1.12); }
`;
