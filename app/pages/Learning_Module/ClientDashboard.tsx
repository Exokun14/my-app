'use client'

import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
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

function MiniRing({ pct, size = 36, stroke = 3 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <defs>
        <linearGradient id="lvRG3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6c3dd6" /><stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(108,61,214,.1)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#lvRG3)" strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ animation:"lvRing .9s cubic-bezier(.16,1,.3,1) .2s both" }}/>
    </svg>
  );
}

// ─── AI Banner ────────────────────────────────────────────────────────────────
function AIBanner({ courses, onOpenCourse, onGoToCatalog }: {
  courses: Course[]; onOpenCourse:(i:number)=>void; onGoToCatalog:()=>void;
}) {
  const enrolled   = courses.filter(c => c.enrolled || (c.progress??0)>0);
  const completed  = courses.filter(c => c.completed || (c.progress??0)>=100);
  const inProg     = enrolled.filter(c => !c.completed && (c.progress??0)>0 && (c.progress??0)<100);
  const notStarted = courses.filter(c => !(c.enrolled||(c.progress??0)>0));
  const avg = enrolled.length ? Math.round(enrolled.reduce((s,c)=>s+(c.progress??0),0)/enrolled.length) : 0;
  const rec    = inProg[0] ?? notStarted[0] ?? null;
  const recIdx = rec ? courses.indexOf(rec) : -1;
  const h = new Date().getHours();
  const greet = h<12 ? "Good morning" : h<17 ? "Good afternoon" : "Good evening";

  const summary = !enrolled.length
    ? "You haven't started any courses yet. Explore the catalog — your journey begins with one click."
    : completed.length===enrolled.length
    ? `Incredible — all ${completed.length} enrolled course${completed.length!==1?"s":""} complete! Discover what's next.`
    : inProg.length && avg>=70
    ? `You're nearly there — ${avg}% average across ${inProg.length} active course${inProg.length!==1?"s":""}. Push to the finish!`
    : inProg.length
    ? `${inProg.length} course${inProg.length!==1?"s":""} in progress at ${avg}% avg. Consistency is the secret.`
    : `Enrolled in ${enrolled.length} course${enrolled.length!==1?"s":""}. Pick one and start your streak today.`;

  return (
    <div className="lv-hero">
      <div className="lv-hero-orb lv-hero-orb1"/>
      <div className="lv-hero-orb lv-hero-orb2"/>
      <div className="lv-hero-inner">
        <div className="lv-hero-left">
          <div className="lv-hero-badge">
            <div className="lv-ai-dot"/>
            <span>AI Learning Companion</span>
          </div>
          <div className="lv-hero-greet">{greet},<br/><em>learner</em> 👋</div>
          <p className="lv-hero-summary">{summary}</p>
        </div>
        <div className="lv-hero-right">
          <div className="lv-hero-pills">
            {enrolled.length>0 && (
              <div className="lv-hero-pill v">
                <span className="lv-hero-pill-n">{avg}%</span>
                <span className="lv-hero-pill-l">avg progress</span>
              </div>
            )}
            {completed.length>0 && (
              <div className="lv-hero-pill g">
                <span className="lv-hero-pill-n">{completed.length}</span>
                <span className="lv-hero-pill-l">completed</span>
              </div>
            )}
            {inProg.length>0 && (
              <div className="lv-hero-pill t">
                <span className="lv-hero-pill-n">{inProg.length}</span>
                <span className="lv-hero-pill-l">in progress</span>
              </div>
            )}
          </div>
          {rec && recIdx>=0 ? (
            <div className="lv-hero-cta" onClick={()=>onOpenCourse(recIdx)}>
              <div className="lv-hero-cta-ico">{inProg.includes(rec)?"▶":"🎯"}</div>
              <div className="lv-hero-cta-text">
                <div className="lv-hero-cta-lbl">{inProg.includes(rec)?"Continue where you left off":"Recommended for you"}</div>
                <div className="lv-hero-cta-name">{rec.title}</div>
              </div>
              <div className="lv-hero-cta-arr">→</div>
            </div>
          ) : notStarted.length>0 && (
            <button className="lv-hero-browse" onClick={onGoToCatalog}>
              🗂️ Browse Catalog →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stat chip with portal dropdown ──────────────────────────────────────────
function StatChip({ n, label, emoji, cls, delay, courses, onOpenCourse }: {
  n:number; label:string; emoji:string; cls:string; delay:string;
  courses:Course[]; onOpenCourse:(i:number)=>void;
}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState<{top:number;left:number;width:number}>({top:0,left:0,width:0});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    if(!open) return;
    const handler = (e: MouseEvent) => {
      if(ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return ()=>document.removeEventListener("mousedown", handler);
  },[open]);

  useEffect(()=>{
    if(!open) return;
    const update = () => {
      if(!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 5, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return ()=>{
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  },[open]);

  const handleToggle = () => {
    if(!ref.current || items.length === 0) return;
    const r = ref.current.getBoundingClientRect();
    setDropPos({ top: r.bottom + 5, left: r.left, width: r.width });
    setOpen(o => !o);
  };

  const items = courses
    .map((c,i)=>({c,i}))
    .filter(({c})=>{
      const pct=c.progress??0, done=c.completed||pct>=100, enr=c.enrolled||pct>0;
      if(label==="Enrolled")    return enr;
      if(label==="In Progress") return enr&&!done;
      if(label==="Completed")   return done;
      if(label==="Available")   return !enr;
      return false;
    });

  const dropdown = open && items.length > 0 && typeof document !== "undefined"
    ? createPortal(
        <div
          className="lv-dstat-drop"
          style={{ position:"fixed", top:dropPos.top, left:dropPos.left, width:Math.max(dropPos.width, 220), zIndex:9999 }}
          onMouseDown={e=>e.stopPropagation()}
        >
          <div className="lv-dstat-drop-head">{label}</div>
          {items.map(({c,i},idx)=>{
            const pct=c.progress??0;
            const done=c.completed||pct>=100;
            const g=THUMB_GRADIENTS[i%THUMB_GRADIENTS.length];
            const ic=CAT_ICONS[c.cat]||c.thumbEmoji||"📚";
            return (
              <div key={idx} className="lv-dstat-row"
                onClick={e=>{e.stopPropagation();onOpenCourse(i);setOpen(false);}}>
                <div className="lv-dstat-row-thumb" style={{background:`linear-gradient(135deg,${g[0]},${g[1]})`}}>
                  <span style={{fontSize:12}}>{ic}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="lv-dstat-row-name">{c.title}</div>
                  {pct>0 && (
                    <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3}}>
                      <div style={{flex:1,height:2.5,borderRadius:2,background:"rgba(108,61,214,.08)",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:done?"linear-gradient(90deg,#059669,#0d9488)":"linear-gradient(90deg,#6c3dd6,#a78bfa)",borderRadius:2}}/>
                      </div>
                      <span style={{fontSize:9,fontWeight:700,color:done?"#059669":"#6c3dd6",flexShrink:0}}>
                        {done?"✓":pct+"%"}
                      </span>
                    </div>
                  )}
                </div>
                <svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="#9ca3af" strokeWidth="2" style={{flexShrink:0}}>
                  <path d="M5 2l4 5-4 5"/>
                </svg>
              </div>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={ref} className={`lv-dstat ${cls}`} style={{ animationDelay:delay }}>
      <div className="lv-dstat-inner" onClick={handleToggle}
        style={{ cursor:items.length>0?"pointer":"default" }}>
        <div className="lv-dstat-ico">{emoji}</div>
        <div style={{flex:1}}>
          <div className="lv-dstat-num">{n}</div>
          <div className="lv-dstat-lbl">{label}</div>
        </div>
        {items.length>0 && (
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#9ca3af" strokeWidth="2.2"
            style={{ flexShrink:0, transition:"transform .2s", transform:open?"rotate(180deg)":"none" }}>
            <path d="M2 5l5 5 5-5"/>
          </svg>
        )}
      </div>
      {dropdown}
    </div>
  );
}

function TimeChip({ avg, totalTime, delay }: { avg:number; totalTime:number; delay:string }) {
  return (
    <div className="lv-dstat sr" style={{ animationDelay:delay }}>
      <div className="lv-dstat-inner" style={{cursor:"default"}}>
        <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <MiniRing pct={avg}/>
          <div style={{position:"absolute",fontSize:8,fontWeight:800,color:"#6c3dd6",lineHeight:1}}>{avg}%</div>
        </div>
        <div>
          <div className="lv-dstat-num" style={{color:"#6c3dd6"}}>{fmtTime(totalTime)}</div>
          <div className="lv-dstat-lbl">Time spent</div>
        </div>
      </div>
    </div>
  );
}

// ─── Carousel ─────────────────────────────────────────────────────────────────
const SLIDE_GRADS = [
  ["#4c1d95","#7c3aed"],["#0c4a6e","#0369a1"],["#064e3b","#0d9488"],
  ["#78350f","#b45309"],["#7f1d1d","#b91c1c"],["#1e1b4b","#4338ca"],
  ["#134e4a","#0f766e"],["#3b0764","#7e22ce"],
];
const ACCENTS = ["#a78bfa","#67e8f9","#6ee7b7","#fcd34d","#fca5a5","#c4b5fd","#7dd3fc","#86efac"];

function Carousel({ courses, onOpenCourse, onGoToCatalog }: {
  courses:Course[]; onOpenCourse:(i:number)=>void; onGoToCatalog:()=>void;
}) {
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const featured = [
    ...courses.filter(c=>!c.completed&&(c.progress??0)>0&&(c.progress??0)<100),
    ...courses.filter(c=>!(c.enrolled||(c.progress??0)>0)),
    ...courses.filter(c=>c.completed||(c.progress??0)>=100),
  ].slice(0,8);
  const go = useCallback((n:number)=>setActive(((n%featured.length)+featured.length)%featured.length),[featured.length]);
  useEffect(()=>{timer.current=setTimeout(()=>go(active+1),5500);return()=>clearTimeout(timer.current);},[active,go]);
  if(!featured.length) return null;

  const c   = featured[active];
  const ri  = courses.indexOf(c);
  const pct = c.progress??0;
  const done = c.completed===true||pct>=100, enr=c.enrolled===true||pct>0;
  const g   = SLIDE_GRADS[active%SLIDE_GRADS.length];
  const pat = THUMB_PATTERNS[ri%THUMB_PATTERNS.length];
  const ic  = CAT_ICONS[c.cat]||c.thumbEmoji||"📚";
  const acc = ACCENTS[active%ACCENTS.length];
  const mc  = c.modules?.length??0;

  return (
    <div className="lv-car2">
      <div className="lv-sh" style={{marginBottom:12}}>
        <div style={{width:3,height:14,borderRadius:2,background:"linear-gradient(#6c3dd6,#0d9488)",flexShrink:0}}/>
        <span className="lv-sh-title">Featured</span>
        <span className="lv-sh-sub">· {featured.length} picks</span>
        <div className="lv-sh-pip"/>
        <button className="lv-car-all" onClick={onGoToCatalog}>All →</button>
      </div>

      <div className="lv-car2-card" onClick={()=>onOpenCourse(ri)}>
        <div className="lv-car2-thumb" style={{background:`linear-gradient(145deg,${g[0]},${g[1]})`}}>
          <div style={{position:"absolute",inset:0,backgroundImage:pat,backgroundSize:"18px 18px",opacity:0.1}}/>
          <div style={{position:"absolute",top:"-20%",right:"-5%",width:130,height:130,borderRadius:"50%",background:`radial-gradient(circle,${acc}35 0%,transparent 65%)`,pointerEvents:"none"}}/>
          <div style={{position:"absolute",right:8,bottom:-10,fontSize:80,opacity:0.1,userSelect:"none",lineHeight:1,filter:"blur(0.5px)",transform:"rotate(-5deg)"}}>{ic}</div>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.52) 0%,transparent 55%)"}}/>
          <div style={{position:"absolute",top:12,right:12,width:38,height:38,borderRadius:10,background:"rgba(255,255,255,.15)",backdropFilter:"blur(8px)",border:"1.5px solid rgba(255,255,255,.22)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
            {ic}
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"10px 14px 10px"}}>
            <div style={{fontSize:9,fontWeight:500,textTransform:"uppercase",letterSpacing:".08em",color:"rgba(255,255,255,.5)",marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
              {c.cat||"General"}{mc>0&&<><span style={{width:2,height:2,borderRadius:"50%",background:"rgba(255,255,255,.35)",display:"inline-block"}}/>{mc} modules</>}
            </div>
            <div style={{fontFamily:"'DM Serif Display',Georgia,serif",fontSize:15,fontWeight:400,fontStyle:"italic",color:"#fff",lineHeight:1.3,textShadow:"0 2px 8px rgba(0,0,0,.3)",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
              {c.title}
            </div>
          </div>
        </div>

        <div className="lv-car2-body">
          {enr&&pct>0 && (
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:10,fontWeight:500,color:"var(--ink3)",textTransform:"uppercase",letterSpacing:".06em"}}>Progress</span>
                <span style={{fontSize:10,fontWeight:700,color:done?"#059669":"var(--vio)"}}>{pct}%</span>
              </div>
              <div style={{height:4,borderRadius:4,background:"rgba(108,61,214,.08)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:done?"linear-gradient(90deg,#059669,#0d9488)":"linear-gradient(90deg,var(--vio),var(--teal))",borderRadius:4}}/>
              </div>
            </div>
          )}
          {c.desc && (
            <div style={{fontSize:11,color:"var(--ink3)",lineHeight:1.6,marginBottom:10,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
              {c.desc}
            </div>
          )}
          <div style={{display:"flex",gap:5,marginBottom:11,flexWrap:"wrap"}}>
            {c.time && (
              <span style={{display:"flex",alignItems:"center",gap:3,fontSize:10,fontWeight:500,color:"var(--ink3)",padding:"3px 8px",borderRadius:999,background:"var(--surf2)",border:"1px solid var(--bd)"}}>
                <svg width="8" height="8" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3l2 1.2"/></svg>
                {c.time}
              </span>
            )}
            {enr && (
              <span style={{fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:999,background:done?"rgba(5,150,105,.07)":"rgba(108,61,214,.07)",color:done?"#059669":"var(--vio)",border:`1px solid ${done?"rgba(5,150,105,.15)":"rgba(108,61,214,.15)"}`}}>
                {done?"✓ Completed":`${pct}% done`}
              </span>
            )}
          </div>
          <button
            className={`lv-car2-cta${done?" done":enr?" enr":" new"}`}
            onClick={e=>{e.stopPropagation();onOpenCourse(ri);}}
          >
            {done?"✓ Review":enr?"▶ Continue":"+ Enroll"}
          </button>
        </div>
      </div>

      <div className="lv-car2-nav">
        <div className="lv-car2-dots">
          {featured.map((_,i)=>(
            <div key={i} className={`lv-car2-dot${active===i?" on":""}`} onClick={()=>go(i)}/>
          ))}
        </div>
        <div style={{display:"flex",gap:5}}>
          <button className="lv-car2-arr" onClick={e=>{e.stopPropagation();go(active-1);}}>
            <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 2L5 7l4 5"/></svg>
          </button>
          <button className="lv-car2-arr" onClick={e=>{e.stopPropagation();go(active+1);}}>
            <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 2l4 5-4 5"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Recent Courses ───────────────────────────────────────────────────────────
function RecentCourses({ courses, onOpenCourse }: {
  courses:Course[]; onOpenCourse:(i:number)=>void;
}) {
  const recent = courses
    .map((c,i)=>({c,i}))
    .filter(({c})=>(c.enrolled||(c.progress??0)>0))
    .sort((a,b)=>(b.c.progress??0)-(a.c.progress??0))
    .slice(0,4);
  if(!recent.length) return null;
  return (
    <div style={{marginTop:20}}>
      <div className="lv-sh" style={{marginBottom:10}}>
        <div style={{width:3,height:14,borderRadius:2,background:"linear-gradient(#6c3dd6,#0d9488)",flexShrink:0}}/>
        <span className="lv-sh-title">Recent Courses</span>
        <span className="lv-sh-sub">{recent.length} active</span>
        <div className="lv-sh-pip"/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {recent.map(({c,i},idx)=>{
          const pct=c.progress??0, done=c.completed||pct>=100;
          const g=THUMB_GRADIENTS[i%THUMB_GRADIENTS.length];
          const ic=CAT_ICONS[c.cat]||c.thumbEmoji||"📚";
          return (
            <div key={idx} className="lv-strip-card" style={{animationDelay:`${idx*.06}s`}} onClick={()=>onOpenCourse(i)}>
              <div className="lv-strip-thumb" style={{background:`linear-gradient(135deg,${g[0]},${g[1]})`}}>
                <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 30% 30%,rgba(255,255,255,.18),transparent 65%)"}}/>
                <span style={{position:"relative",zIndex:1,fontSize:16}}>{ic}</span>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div className="lv-strip-name">{c.title}</div>
                <div className="lv-strip-bar-wrap">
                  {done
                    ? <span style={{fontSize:10,fontWeight:600,color:"#059669",display:"flex",alignItems:"center",gap:4}}>
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2"><path d="M2 8l4 4 8-8"/></svg>
                        Completed
                      </span>
                    : <>
                        <div className="lv-strip-bar"><div className="lv-strip-fill" style={{width:`${pct}%`,animationDelay:`${.18+idx*.06}s`}}/></div>
                        <span className="lv-strip-pct">{pct}%</span>
                      </>
                  }
                </div>
              </div>
              <button className="lv-strip-btn" onClick={e=>{e.stopPropagation();onOpenCourse(i);}}>
                <svg width="7" height="7" viewBox="0 0 18 18" fill="white"><path d="M6 3.5l9 5.5-9 5.5V3.5z"/></svg>
              </button>
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
  const inProg    = enrolled.filter(c=>!c.completed&&(c.progress??0)>0&&(c.progress??0)<100);
  const avg       = enrolled.length ? Math.round(enrolled.reduce((s,c)=>s+(c.progress??0),0)/enrolled.length) : 0;
  const totalTime = courses.reduce((s,c)=>s+(c.time_spent??0),0);

  const CHIPS = [
    { n:enrolled.length,  label:"Enrolled",    emoji:"📚", cls:"sv", delay:"0s"   },
    { n:inProg.length,    label:"In Progress", emoji:"⚡", cls:"sa", delay:".06s" },
    { n:completed.length, label:"Completed",   emoji:"✅", cls:"sg", delay:".12s" },
    { n:courses.filter(c=>!(c.enrolled||(c.progress??0)>0)).length, label:"Available", emoji:"🔓", cls:"sb", delay:".18s" },
  ];

  return (
    <>
      <style>{DASH_CSS}</style>
      <div className="lv-dash-grid">
        <div className="lv-dash-left lv-scroll">
          <AIBanner courses={courses} onOpenCourse={onOpenCourse} onGoToCatalog={onGoToCatalog}/>
          <div className="lv-dash-stats">
            {CHIPS.map((s,i)=>(
              <StatChip key={i} {...s} courses={courses} onOpenCourse={onOpenCourse}/>
            ))}
            <TimeChip avg={avg} totalTime={totalTime} delay=".24s"/>
          </div>
          <RecentCourses courses={courses} onOpenCourse={onOpenCourse}/>
        </div>
        <div className="lv-dash-right">
          <Carousel courses={courses} onOpenCourse={onOpenCourse} onGoToCatalog={onGoToCatalog}/>
        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const DASH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

@keyframes lvFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes lvPop    { from{opacity:0;transform:scale(.97)}       to{opacity:1;transform:scale(1)} }
@keyframes lvSlide  { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
@keyframes lvBar    { from{width:0!important}                    to{} }
@keyframes lvRing   { from{stroke-dasharray:0 999}               to{} }
@keyframes lv-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(.75)} }

/* ── Variables & base ─────────────────────────────────────────────────────── */
.lv-dash-grid {
  --ink:  #1e293b;
  --ink2: #475569;
  --ink3: #94a3b8;
  --surf: #ffffff;
  --surf2:#f8fafc;
  --bd:   #f1f5f9;
  --vio:  #6c3dd6;
  --teal: #0d9488;
  font-family: 'DM Sans', sans-serif;
  flex:1 1 0; min-height:0;
  display:flex; gap:18px;
  overflow:visible;
}

/* ── Layout ───────────────────────────────────────────────────────────────── */
.lv-dash-left {
  flex:1 1 0; min-width:0;
  display:flex; flex-direction:column;
  overflow-y:auto; overflow-x:visible;
}
.lv-dash-right {
  flex:0 0 276px; width:276px;
  display:flex; flex-direction:column; min-height:0;
  border-left:1.5px solid var(--bd);
  padding-left:18px;
}
.lv-scroll::-webkit-scrollbar { width:4px; }
.lv-scroll::-webkit-scrollbar-track { background:transparent; }
.lv-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }

/* ── Section header ───────────────────────────────────────────────────────── */
.lv-sh { display:flex; align-items:center; gap:7px; }
.lv-sh-title { font-size:13px; font-weight:700; color:var(--ink); letter-spacing:-.01em; }
.lv-sh-sub   { font-size:12px; font-weight:500; color:var(--ink3); }
.lv-sh-pip   { flex:1; }
.lv-car-all  {
  font-size:12px; font-weight:600; color:var(--vio);
  background:none; border:none; cursor:pointer; padding:0;
  font-family:'DM Sans',sans-serif; transition:opacity .15s;
}
.lv-car-all:hover { opacity:.65; }

/* ── Hero Banner ──────────────────────────────────────────────────────────── */
.lv-hero {
  position:relative; border-radius:20px; overflow:hidden;
  background:linear-gradient(135deg,#1e0b4b 0%,#2d1472 45%,#0d3d38 100%);
  margin-bottom:14px; padding:22px 22px 20px;
  box-shadow:0 4px 24px rgba(108,61,214,.18), 0 1px 4px rgba(0,0,0,.08);
  animation:lvFadeUp .45s cubic-bezier(.16,1,.3,1) both;
  flex-shrink:0;
}
.lv-hero-orb { position:absolute; border-radius:50%; pointer-events:none; }
.lv-hero-orb1 {
  width:220px; height:220px; top:-60px; right:-40px;
  background:radial-gradient(circle,rgba(124,58,237,.35) 0%,transparent 70%);
}
.lv-hero-orb2 {
  width:160px; height:160px; bottom:-50px; left:10%;
  background:radial-gradient(circle,rgba(13,148,136,.28) 0%,transparent 70%);
}
.lv-hero-inner {
  position:relative; z-index:1;
  display:flex; gap:18px; align-items:flex-start;
}
.lv-hero-left  { flex:1; min-width:0; }
.lv-hero-right { flex-shrink:0; display:flex; flex-direction:column; gap:10px; align-items:flex-end; min-width:180px; }

.lv-hero-badge {
  display:inline-flex; align-items:center; gap:6px;
  padding:3px 10px; border-radius:999px; margin-bottom:10px;
  background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.15);
  font-size:9px; font-weight:600; color:rgba(255,255,255,.65);
  letter-spacing:.07em; text-transform:uppercase;
}
.lv-ai-dot {
  width:6px; height:6px; border-radius:50%; background:#c4b5fd;
  box-shadow:0 0 5px rgba(196,181,253,.7);
  animation:lv-pulse 2s ease-in-out infinite;
}
.lv-hero-greet {
  font-family:'DM Serif Display',serif;
  font-size:22px; font-weight:400; font-style:italic;
  line-height:1.25; color:#fff; margin-bottom:8px;
}
.lv-hero-greet em { font-style:italic; color:#c4b5fd; }
.lv-hero-summary { font-size:12.5px; font-weight:400; color:rgba(255,255,255,.6); line-height:1.65; margin:0; }

.lv-hero-pills { display:flex; gap:7px; flex-wrap:wrap; justify-content:flex-end; }
.lv-hero-pill {
  padding:7px 13px; border-radius:12px; text-align:center;
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); min-width:62px;
}
.lv-hero-pill.v { border-color:rgba(196,181,253,.25); background:rgba(124,58,237,.18); }
.lv-hero-pill.g { border-color:rgba(110,231,183,.2);  background:rgba(13,148,136,.18); }
.lv-hero-pill.t { border-color:rgba(103,232,249,.2);  background:rgba(8,145,178,.18); }
.lv-hero-pill-n { display:block; font-size:18px; font-weight:800; color:#fff; line-height:1; letter-spacing:-.03em; }
.lv-hero-pill-l { display:block; font-size:9px; font-weight:500; color:rgba(255,255,255,.5); margin-top:2px; text-transform:uppercase; letter-spacing:.06em; }

.lv-hero-cta {
  display:flex; align-items:center; gap:10px;
  padding:10px 13px; border-radius:12px; cursor:pointer; width:100%;
  background:rgba(255,255,255,.1); border:1.5px solid rgba(255,255,255,.16);
  transition:all .16s; backdrop-filter:blur(6px);
}
.lv-hero-cta:hover { background:rgba(255,255,255,.16); border-color:rgba(255,255,255,.26); transform:translateX(-2px); }
.lv-hero-cta-ico  { font-size:16px; flex-shrink:0; }
.lv-hero-cta-lbl  { font-size:9px; font-weight:600; color:rgba(255,255,255,.5); letter-spacing:.07em; text-transform:uppercase; margin-bottom:2px; }
.lv-hero-cta-name { font-size:12px; font-weight:700; color:#fff; }
.lv-hero-cta-arr  { margin-left:auto; color:rgba(255,255,255,.45); font-size:15px; transition:transform .16s; }
.lv-hero-cta:hover .lv-hero-cta-arr { transform:translateX(3px); }
.lv-hero-browse {
  width:100%; padding:9px 14px; border-radius:11px; cursor:pointer;
  background:rgba(255,255,255,.1); border:1.5px solid rgba(255,255,255,.16);
  color:rgba(255,255,255,.8); font-size:12px; font-weight:600;
  font-family:'DM Sans',sans-serif; transition:all .15s;
}
.lv-hero-browse:hover { background:rgba(255,255,255,.16); }

/* ── Stat chips ───────────────────────────────────────────────────────────── */
.lv-dash-stats {
  display:grid; grid-template-columns:repeat(2,1fr);
  gap:7px; margin-bottom:0; flex-shrink:0;
}
.lv-dash-stats .lv-dstat.sr { grid-column:1/-1; }

.lv-dstat {
  border-radius:14px;
  background:var(--surf); border:1.5px solid var(--bd);
  box-shadow:0 1px 3px rgba(0,0,0,.04);
  position:relative; overflow:hidden;
  animation:lvPop .4s cubic-bezier(.16,1,.3,1) both;
  transition:box-shadow .18s, border-color .18s;
}
.lv-dstat:hover { box-shadow:0 3px 12px rgba(0,0,0,.07); border-color:#e2e8f0; }
.lv-dstat::before {
  content:''; position:absolute; top:0; left:0; right:0; height:2.5px;
  border-radius:14px 14px 0 0; pointer-events:none;
}
.lv-dstat.sv::before { background:linear-gradient(90deg,#6c3dd6,#a78bfa); }
.lv-dstat.sa::before { background:linear-gradient(90deg,#d97706,#fbbf24); }
.lv-dstat.sg::before { background:linear-gradient(90deg,#059669,#34d399); }
.lv-dstat.sb::before { background:linear-gradient(90deg,#2563eb,#60a5fa); }
.lv-dstat.sr::before { background:linear-gradient(90deg,#6c3dd6,#0d9488); }
.lv-dstat-inner { padding:11px 13px; display:flex; align-items:center; gap:10px; }
.lv-dstat-ico  { font-size:16px; flex-shrink:0; }
.lv-dstat-num  { font-size:22px; font-weight:800; color:var(--ink); line-height:1; letter-spacing:-.04em; }
.lv-dstat-lbl  { font-size:10px; font-weight:500; color:var(--ink3); margin-top:1px; text-transform:uppercase; letter-spacing:.05em; }

/* ── Dropdown ─────────────────────────────────────────────────────────────── */
.lv-dstat-drop {
  border-radius:14px; background:#fff;
  border:1.5px solid #f1f5f9;
  box-shadow:0 8px 28px rgba(108,61,214,.1), 0 2px 6px rgba(0,0,0,.06);
  animation:lvFadeUp .18s cubic-bezier(.16,1,.3,1) both;
  max-height:240px; overflow-y:auto;
}
.lv-dstat-drop::-webkit-scrollbar { width:3px; }
.lv-dstat-drop::-webkit-scrollbar-thumb { background:#ddd6fe; border-radius:3px; }
.lv-dstat-drop-head {
  padding:8px 13px 7px;
  font-size:9.5px; font-weight:700; color:#94a3b8;
  text-transform:uppercase; letter-spacing:.08em;
  border-bottom:1px solid #f8fafc;
}
.lv-dstat-row {
  display:flex; align-items:center; gap:10px;
  padding:9px 13px; cursor:pointer; transition:background .12s;
  border-bottom:1px solid #f8fafc;
}
.lv-dstat-row:last-child { border-bottom:none; }
.lv-dstat-row:hover { background:#faf5ff; }
.lv-dstat-row-thumb {
  width:30px; height:30px; border-radius:8px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; overflow:hidden;
}
.lv-dstat-row-name {
  font-size:12px; font-weight:600; color:#1e293b;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

/* ── Recent courses ───────────────────────────────────────────────────────── */
.lv-strip-card {
  display:flex; align-items:center; gap:10px;
  padding:10px 12px; border-radius:12px;
  background:var(--surf); border:1.5px solid var(--bd);
  cursor:pointer; transition:all .15s;
  animation:lvSlide .3s cubic-bezier(.16,1,.3,1) both;
}
.lv-strip-card:hover { border-color:rgba(108,61,214,.2); transform:translateX(3px); box-shadow:0 2px 10px rgba(108,61,214,.07); }
.lv-strip-thumb {
  width:36px; height:36px; border-radius:10px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  position:relative; overflow:hidden;
}
.lv-strip-name { font-size:12px; font-weight:600; color:var(--ink); margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lv-strip-bar-wrap { display:flex; align-items:center; gap:5px; }
.lv-strip-bar  { flex:1; height:3px; border-radius:3px; background:rgba(108,61,214,.08); overflow:hidden; }
.lv-strip-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,var(--vio),var(--teal)); animation:lvBar .7s cubic-bezier(.16,1,.3,1) both; }
.lv-strip-pct  { font-size:10px; font-weight:700; color:var(--vio); flex-shrink:0; }
.lv-strip-btn {
  flex-shrink:0; width:26px; height:26px; border-radius:8px; border:none; cursor:pointer;
  background:linear-gradient(135deg,var(--vio),#4f1eb8); color:#fff;
  display:flex; align-items:center; justify-content:center;
  transition:all .15s; box-shadow:0 2px 8px rgba(108,61,214,.24);
}
.lv-strip-btn:hover { transform:scale(1.08); box-shadow:0 4px 12px rgba(108,61,214,.32); }

/* ── Carousel ─────────────────────────────────────────────────────────────── */
.lv-car2 { flex:1 1 0; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
.lv-car2-card {
  flex:1 1 0; min-height:0; border-radius:18px; overflow:hidden;
  border:1.5px solid var(--bd);
  box-shadow:0 2px 12px rgba(108,61,214,.07), 0 1px 3px rgba(0,0,0,.04);
  display:flex; flex-direction:column; cursor:pointer;
  transition:box-shadow .2s, transform .2s; background:var(--surf);
}
.lv-car2-card:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(108,61,214,.13); }
.lv-car2-thumb {
  flex:0 0 52%; position:relative; overflow:hidden;
  transition:transform .6s cubic-bezier(.16,1,.3,1);
}
.lv-car2-card:hover .lv-car2-thumb { transform:scale(1.03); }
.lv-car2-body {
  flex:1; padding:14px 15px 12px;
  display:flex; flex-direction:column; background:var(--surf);
}
.lv-car2-cta {
  width:100%; padding:8px 14px; border-radius:10px; border:none; cursor:pointer;
  font-size:12px; font-weight:700; font-family:'DM Sans',sans-serif;
  display:flex; align-items:center; justify-content:center; gap:5px;
  transition:all .15s; margin-top:auto;
}
.lv-car2-cta:hover { transform:translateY(-1px); filter:brightness(1.05); }
.lv-car2-cta.new  { background:rgba(108,61,214,.07); color:var(--vio); border:1.5px solid rgba(108,61,214,.13); }
.lv-car2-cta.new:hover { background:rgba(108,61,214,.12); }
.lv-car2-cta.enr  { background:linear-gradient(135deg,var(--vio),#4f1eb8); color:#fff; box-shadow:0 3px 10px rgba(108,61,214,.3); }
.lv-car2-cta.done { background:linear-gradient(135deg,#065f46,#0d9488); color:#fff; box-shadow:0 3px 10px rgba(13,148,136,.28); }
.lv-car2-nav {
  display:flex; align-items:center; justify-content:space-between;
  padding:9px 0 0; flex-shrink:0;
}
.lv-car2-dots { display:flex; gap:4px; align-items:center; }
.lv-car2-dot  { width:5px; height:5px; border-radius:3px; cursor:pointer; background:rgba(108,61,214,.14); transition:all .22s cubic-bezier(.16,1,.3,1); }
.lv-car2-dot.on { width:18px; background:linear-gradient(90deg,var(--vio),var(--teal)); box-shadow:0 1px 5px rgba(108,61,214,.26); }
.lv-car2-arr {
  width:27px; height:27px; border-radius:8px;
  border:1.5px solid var(--bd); background:var(--surf);
  color:var(--ink3); display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .14s;
}
.lv-car2-arr:hover { border-color:rgba(108,61,214,.25); color:var(--vio); background:rgba(108,61,214,.04); }
`;
