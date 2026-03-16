'use client'

import AdminProgress from "./AdminProgress";
import ManagerProgress from "./ManagerProgress";
import { useState, useEffect, useRef } from "react";
import type { ProgressRecord, Course } from "../../Data/types";
import { THUMB_GRADIENTS, CAT_ICONS } from "../Logic/CourseCatalogLogic";
import { exportCSV, exportJSON, exportXLSX, exportPDF, exportPPTX } from "../Logic/ProgressExportLogic";
import api from "../../Services/api.service";

type Role = "admin" | "manager" | "client";

interface ClientProgressProps {
  toast:        (msg: string) => void;
  role?:        Role;
  courses?:     Course[];
  onOpenCourse?:(idx: number) => void;
}

const STATUS_CONFIG: Record<string,{bar:string;dot:string;label:string}> = {
  Completed:    { bar:"linear-gradient(90deg,#10b981,#34d399)", dot:"#10b981", label:"Completed"   },
  "In Progress":{ bar:"linear-gradient(90deg,#6366f1,#818cf8)", dot:"#6366f1", label:"In Progress" },
  "Not Started":{ bar:"linear-gradient(90deg,#d1d5db,#e5e7eb)", dot:"#d1d5db", label:"Not Started" },
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label:string; value:number|string; accent:string }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, padding:"16px 18px", border:"1.5px solid rgba(108,61,214,.08)", boxShadow:"0 1px 4px rgba(0,0,0,.04)", display:"flex", flexDirection:"column", gap:3, flex:1, minWidth:80 }}>
      <span style={{ fontSize:24, fontWeight:800, color:accent, fontFamily:"'DM Serif Display',Georgia,serif", letterSpacing:"-.03em", lineHeight:1 }}>{value}</span>
      <span style={{ fontSize:10, fontWeight:700, color:"#b0a8cc", textTransform:"uppercase", letterSpacing:".09em" }}>{label}</span>
    </div>
  );
}

// ─── Featured course carousel (used inside side-by-side panel) ───────────────
function FeaturedCarousel({ courses, onOpenCourse }: { courses: Course[]; onOpenCourse:(idx:number)=>void }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const featured = [
    ...courses.filter(c => (c.progress??0) > 0 && (c.progress??0) < 100 && !c.completed),
    ...courses.filter(c => !(c.enrolled||(c.progress??0)>0)),
    ...courses.filter(c => c.completed || (c.progress??0) >= 100),
  ].slice(0, 6);

  useEffect(() => {
    if (featured.length < 2) return;
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % featured.length), 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [featured.length]);

  const go = (n: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIdx((idx + n + featured.length) % featured.length);
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % featured.length), 4500);
  };

  if (!featured.length) return null;

  const c = featured[idx];
  const realIdx = courses.indexOf(c);
  const pct = c.progress ?? 0;
  const done = c.completed || pct >= 100;
  const enr  = c.enrolled  || pct > 0;
  const grad = THUMB_GRADIENTS[realIdx % THUMB_GRADIENTS.length];
  const icon = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";

  return (
    <>
      <style>{`
        @keyframes fc-in { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:none} }
        .fc-card { animation: fc-in .32s cubic-bezier(.16,1,.3,1) both; }
      `}</style>
      <div style={{ display:"flex", flexDirection:"column", flex:1, height:"100%" }}>
        {/* Label + dots */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, flexShrink:0 }}>
          <span style={{ fontSize:10, fontWeight:800, color:"#b0a8cc", textTransform:"uppercase", letterSpacing:".1em" }}>Up Next</span>
          <div style={{ display:"flex", gap:5, alignItems:"center" }}>
            {featured.map((_,i) => (
              <button key={i} onClick={() => go(i - idx)}
                style={{ width: i===idx?14:5, height:5, borderRadius:3, border:"none", cursor:"pointer", transition:"all .22s", background: i===idx ? "#6c3dd6" : "rgba(108,61,214,.18)", padding:0 }} />
            ))}
          </div>
        </div>

        <div key={idx} className="fc-card" style={{ borderRadius:14, overflow:"hidden", position:"relative", flex:1, cursor:"pointer", background:`linear-gradient(145deg,${grad[0]},${grad[1]})` }}
          onClick={() => onOpenCourse(realIdx)}>
          <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 80% 55% at 50% -5%, rgba(255,255,255,.18) 0%, transparent 65%)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,.05) 55%, transparent 100%)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", fontSize:60, opacity:.22, userSelect:"none" }}>{icon}</div>

          <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"12px 14px" }}>
            <div style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,.55)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:3 }}>{c.cat}</div>
            <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:15, fontWeight:400, fontStyle:"italic", color:"#fff", lineHeight:1.3, marginBottom:enr&&pct>0?7:8 }}>{c.title}</div>
            {enr && pct > 0 && (
              <div style={{ marginBottom:7 }}>
                <div style={{ height:2.5, borderRadius:3, background:"rgba(255,255,255,.18)", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${pct}%`, background:done?"rgba(110,231,183,.85)":"rgba(255,255,255,.8)", borderRadius:3, transition:"width .5s" }} />
                </div>
              </div>
            )}
            <button onClick={e => { e.stopPropagation(); onOpenCourse(realIdx); }}
              style={{ padding:"4px 12px", borderRadius:7, border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontSize:10.5, fontWeight:700, background: done?"rgba(16,185,129,.9)":enr?"rgba(99,102,241,.9)":"rgba(255,255,255,.18)", color:"#fff", backdropFilter:"blur(4px)" }}>
              {done ? "✓ Review" : enr ? `▶ Continue · ${pct}%` : "+ Enroll Now"}
            </button>
          </div>

          {featured.length > 1 && <>
            <button onClick={e=>{e.stopPropagation();go(-1);}} style={{ position:"absolute", left:6, top:"50%", transform:"translateY(-50%)", width:24, height:24, borderRadius:"50%", border:"1.5px solid rgba(255,255,255,.28)", background:"rgba(0,0,0,.22)", backdropFilter:"blur(4px)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.2"><path d="M9 2L4 7l5 5"/></svg>
            </button>
            <button onClick={e=>{e.stopPropagation();go(1);}} style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", width:24, height:24, borderRadius:"50%", border:"1.5px solid rgba(255,255,255,.28)", background:"rgba(0,0,0,.22)", backdropFilter:"blur(4px)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.2"><path d="M5 2l5 5-5 5"/></svg>
            </button>
          </>}
        </div>
      </div>
    </>
  );
}

// ─── AI overview ──────────────────────────────────────────────────────────────
function LearnerAIOverview({ data, courses }: { data: ProgressRecord[]; courses: Course[] }) {
  const [displayed, setDisplayed] = useState("");
  const [result,    setResult]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);
  const ticker = useRef<ReturnType<typeof setInterval>|null>(null);

  const completed   = data.filter(r => r.status==="Completed").length;
  const inProgress  = data.filter(r => r.status==="In Progress").length;
  const avgProgress = data.length ? Math.round(data.reduce((s,r) => s+r.progress, 0)/data.length) : 0;
  const totalTime   = courses.reduce((s,c) => s+(c.time_spent??0), 0);

  const generate = async () => {
    if (ticker.current) clearInterval(ticker.current);
    setLoading(true); setDisplayed(""); setResult("");
    const ctx = data.length
      ? `${data.map(r=>`- ${r.course}: ${r.progress}% (${r.status})`).join("\n")}\nSummary: ${completed} completed, ${inProgress} in progress, avg ${avgProgress}%, ${totalTime}min total`
      : "No courses enrolled yet.";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:500,
          system:"You are a personal learning coach. Write 3 sentences of warm, direct prose — no bullets, no emoji. Acknowledge progress, highlight what to focus on next, end with a specific encouragement.",
          messages:[{role:"user",content:`My learning data:\n${ctx}\n\nGive me a personal overview.`}]
        }),
      });
      const d = await res.json();
      const text = d.content?.find((b:any)=>b.type==="text")?.text ?? "Unable to generate right now.";
      setResult(text); setDone(true);
      let i = 0;
      ticker.current = setInterval(() => { i+=4; setDisplayed(text.slice(0,i)); if(i>=text.length){setDisplayed(text);clearInterval(ticker.current!);} }, 14);
    } catch { setDisplayed("Unable to connect. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ background:"#fff", borderRadius:14, border:"1.5px solid rgba(108,61,214,.1)", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 2px 12px rgba(108,61,214,.06)" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 16px 12px", borderBottom:"1px solid rgba(108,61,214,.07)", background:"linear-gradient(135deg,rgba(124,58,237,.03),transparent)" }}>
        <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#7c3aed,#0d9488)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 2px 8px rgba(124,58,237,.3)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L9.5 9.5H2L8 14l-2.5 7.5L12 17l6.5 4.5L16 14l6-4.5h-7.5z"/></svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, fontWeight:800, color:"#18103a", letterSpacing:".07em", textTransform:"uppercase" }}>AI Learning Coach</div>
          <div style={{ fontSize:10, color:"#8e7ec0", marginTop:1 }}>Personalized progress analysis</div>
        </div>
        <div style={{ padding:"2px 8px", borderRadius:20, background:"rgba(124,58,237,.08)", border:"1px solid rgba(124,58,237,.18)", fontSize:9, fontWeight:800, color:"#7c3aed", letterSpacing:".07em" }}>AI</div>
      </div>

      {/* Body */}
      {!done && !loading ? (
        <div style={{ padding:"18px 16px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, textAlign:"center", flex:1 }}>
          <p style={{ fontSize:12.5, color:"#8e7ec0", lineHeight:1.6, margin:0, maxWidth:300 }}>
            Get a personalized analysis of where you stand and exactly what to focus on next.
          </p>
          <button onClick={generate} style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"9px 18px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#7c3aed,#4f1eb8)", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", boxShadow:"0 3px 14px rgba(124,58,237,.35)" }}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1l1.4 4.2H13l-3.7 2.7 1.4 4.2L7 9.4l-3.7 2.7 1.4-4.2L1 5.2h4.6z"/></svg>
            Get My Overview
          </button>
        </div>
      ) : loading ? (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"18px 16px", justifyContent:"center", flex:1 }}>
          <div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(124,58,237,.3)", borderTopColor:"#7c3aed", animation:"laio-spin .6s linear infinite" }}/>
          <span style={{ fontSize:12, color:"#8e7ec0" }}>Analyzing your learning journey…</span>
        </div>
      ) : (
        <div style={{ padding:"14px 16px", flex:1, display:"flex", flexDirection:"column" }}>
          {/* Mini stats */}
          <div style={{ display:"flex", gap:6, marginBottom:12 }}>
            {[
              { l:"Courses",     v:data.length,        c:"#18103a" },
              { l:"Completed",   v:completed,           c:"#16a34a" },
              { l:"In Progress", v:inProgress,          c:"#7c3aed" },
              { l:"Avg",         v:`${avgProgress}%`,   c:"#0d9488" },
            ].map(s => (
              <div key={s.l} style={{ flex:1, padding:"8px 10px", borderRadius:10, background:"rgba(124,58,237,.04)", border:"1.5px solid rgba(124,58,237,.07)" }}>
                <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:18, color:s.c, lineHeight:1 }}>{s.v}</div>
                <div style={{ fontSize:9, fontWeight:700, color:"#b0a8cc", textTransform:"uppercase", letterSpacing:".08em", marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ height:1, background:"rgba(108,61,214,.07)", marginBottom:12 }}/>
          <p style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontStyle:"italic", fontSize:13.5, color:"#18103a", lineHeight:1.75, margin:"0 0 12px" }}>
            {displayed}
            {displayed.length < result.length && <span style={{ display:"inline-block", width:2, height:13, background:"#7c3aed", marginLeft:2, verticalAlign:"middle", animation:"laio-blink .75s step-end infinite" }}/>}
          </p>
          <button onClick={generate} disabled={loading} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:6, border:"1.5px solid rgba(124,58,237,.15)", background:"rgba(124,58,237,.04)", color:"#7c3aed", fontSize:10.5, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 7a5 5 0 015-5 5 5 0 014.33 2.5M12 7a5 5 0 01-5 5 5 5 0 01-4.33-2.5M12 3v3h-3M2 11V8h3"/></svg>
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Export menu ─────────────────────────────────────────────────────────────
function ExportMenu({ data, toast }: { data: ProgressRecord[]; toast: (msg: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formats = [
    { label: "CSV",           icon: "📄", ext: "csv",  action: () => { exportCSV(data);        toast("CSV exported!"); } },
    { label: "Excel (XLSX)",  icon: "📊", ext: "xlsx", action: () => { exportXLSX(data);       toast("Excel exported!"); } },
    { label: "PowerPoint",    icon: "📑", ext: "pptx", action: () => { exportPPTX(data);       toast("PowerPoint exported!"); } },
    { label: "PDF",           icon: "📋", ext: "pdf",  action: () => { exportPDF(data);        toast("PDF exported!"); } },
    { label: "JSON",          icon: "🗂️", ext: "json", action: () => { exportJSON(data);       toast("JSON exported!"); } },
  ];

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button className="export-btn" onClick={() => setOpen(o => !o)}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2"/>
        </svg>
        Export
        <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft:2 }}>
          <path d="M3 5l4 4 4-4"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position:"absolute", right:0, top:"calc(100% + 6px)", zIndex:50,
          background:"#fff", borderRadius:12, border:"1.5px solid rgba(108,61,214,.12)",
          boxShadow:"0 8px 28px rgba(108,61,214,.14)", overflow:"hidden", minWidth:170,
        }}>
          <div style={{ padding:"8px 12px 6px", fontSize:9, fontWeight:800, color:"#b0a8cc", textTransform:"uppercase", letterSpacing:".1em" }}>
            Export as
          </div>
          {formats.map(f => (
            <button key={f.ext} onClick={() => { f.action(); setOpen(false); }} style={{
              display:"flex", alignItems:"center", gap:10, width:"100%",
              padding:"9px 14px", border:"none", background:"transparent",
              cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              fontSize:12.5, fontWeight:500, color:"#18103a",
              textAlign:"left", transition:"background .12s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,61,214,.05)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span style={{ fontSize:15 }}>{f.icon}</span>
              {f.label}
              <span style={{ marginLeft:"auto", fontSize:9, fontWeight:700, color:"#b0a8cc", background:"rgba(108,61,214,.06)", padding:"2px 6px", borderRadius:4 }}>
                .{f.ext}
              </span>
            </button>
          ))}
          <div style={{ padding:"6px 12px 8px", borderTop:"1px solid rgba(108,61,214,.07)", fontSize:9.5, color:"#b0a8cc" }}>
            {data.length} course{data.length !== 1 ? "s" : ""} · filtered view
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main learner progress view ───────────────────────────────────────────────
function ClientLearnerProgress({ toast, courses = [], onOpenCourse }: {
  toast: (msg:string) => void;
  courses: Course[];
  onOpenCourse?: (idx:number) => void;
}) {
  const [data,    setData]    = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  // FIX: Added fetchError state so the UI can show what went wrong
  // instead of silently displaying an empty table.
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("All");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setFetchError(null);
      try {
        // FIX: No user_id needed — Laravel Sanctum session cookie scopes
        // this automatically to the logged-in user. Removed the previous
        // silent `catch {}` which was hiding all API errors.
        const r = await api.progress.getAll();
        if (r.success && r.data) {
          setData(r.data as ProgressRecord[]);
        } else {
          // Surface the actual error from the API
          const msg = r.error ?? "Failed to load progress data.";
          console.error("[ClientProgress] ❌ API error:", msg);
          setFetchError(msg);
          toast(`Error: ${msg}`);
        }
      } catch (e) {
        // Surface unexpected network/runtime errors
        const msg = e instanceof Error ? e.message : "Unexpected error loading progress.";
        console.error("[ClientProgress] ❌ Unexpected error:", e);
        setFetchError(msg);
        toast(`Error: ${msg}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const safe = data || [];
  const completed   = safe.filter(r => r.status==="Completed").length;
  const inProgress  = safe.filter(r => r.status==="In Progress").length;
  const avgProgress = safe.length ? Math.round(safe.reduce((s,r) => s+r.progress, 0)/safe.length) : 0;

  const rows = safe.filter(r =>
    (filter==="All" || r.status===filter) &&
    (!search || r.course.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes laio-spin  { to{transform:rotate(360deg)} }
        @keyframes laio-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes prog-up    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes shimmer    { 0%{background-position:-400px 0} 100%{background-position:400px 0} }

        .prog-scroll {
          flex:1 1 0; min-height:0; overflow-y:auto; overflow-x:hidden;
          padding:24px 24px 32px;
          font-family:'DM Sans',sans-serif;
        }
        .prog-scroll::-webkit-scrollbar { width:3px; }
        .prog-scroll::-webkit-scrollbar-thumb { background:rgba(108,61,214,.2); border-radius:3px; }

        .prog-chip { padding:5px 13px; border-radius:20px; border:1.5px solid rgba(108,61,214,.12); background:#fff; font-size:11.5px; font-weight:600; color:#4a3870; cursor:pointer; transition:all .15s; font-family:'DM Sans',sans-serif; }
        .prog-chip:hover { border-color:rgba(108,61,214,.3); color:#6c3dd6; background:rgba(108,61,214,.04); }
        .prog-chip.active { background:linear-gradient(135deg,#6c3dd6,#4f1eb8); color:#fff; border-color:transparent; box-shadow:0 2px 8px rgba(108,61,214,.28); }

        .prog-search { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid rgba(108,61,214,.12); border-radius:10px; padding:7px 12px; transition:all .15s; }
        .prog-search:focus-within { border-color:rgba(108,61,214,.3); box-shadow:0 0 0 3px rgba(108,61,214,.07); }
        .prog-search input { border:none; outline:none; font-size:12px; color:#18103a; background:transparent; font-family:'DM Sans',sans-serif; width:160px; }
        .prog-search input::placeholder { color:#b0a8cc; }

        .prog-table { width:100%; border-collapse:separate; border-spacing:0; }
        .prog-table thead tr th { padding:9px 14px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:#b0a8cc; text-align:left; border-bottom:1.5px solid rgba(108,61,214,.07); }
        .prog-row td { padding:12px 14px; border-bottom:1px solid rgba(108,61,214,.05); vertical-align:middle; }
        .prog-row:hover td { background:rgba(108,61,214,.03); }
        .prog-row:last-child td { border-bottom:none; }

        .prog-bar-track { height:5px; background:rgba(108,61,214,.08); border-radius:99px; overflow:hidden; width:100px; }
        .prog-bar-fill  { height:100%; border-radius:99px; transition:width .6s cubic-bezier(.34,1.56,.64,1); }
        .prog-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px 3px 7px; border-radius:20px; font-size:11px; font-weight:600; border:1.5px solid; }

        .skeleton { background:linear-gradient(90deg,#f4f2fb 25%,#e9e6f5 50%,#f4f2fb 75%); background-size:800px 100%; animation:shimmer 1.4s infinite; border-radius:6px; }

        .export-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:9px; border:1.5px solid rgba(108,61,214,.12); background:#fff; font-size:12px; font-weight:600; color:#4a3870; cursor:pointer; transition:all .15s; font-family:'DM Sans',sans-serif; }
        .export-btn:hover { border-color:rgba(108,61,214,.3); color:#6c3dd6; background:rgba(108,61,214,.04); }
      `}</style>

      <div className="prog-scroll">

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
          <div>
            <h1 style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:26, fontWeight:400, color:"#18103a", margin:0, letterSpacing:"-.03em", lineHeight:1.1 }}>My Learning Progress</h1>
            <p style={{ margin:"5px 0 0", fontSize:12.5, color:"#8e7ec0" }}>Track your courses, milestones, and achievements.</p>
          </div>
          <ExportMenu data={safe} toast={toast} />
        </div>

        {/* FIX: Show a visible error banner if the fetch failed */}
        {fetchError && (
          <div style={{ background:"rgba(239,68,68,.06)", border:"1.5px solid rgba(239,68,68,.2)", borderRadius:12, padding:"12px 16px", marginBottom:18, display:"flex", alignItems:"center", gap:10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            <div>
              <div style={{ fontSize:12.5, fontWeight:700, color:"#dc2626" }}>Could not load progress data</div>
              <div style={{ fontSize:11.5, color:"#ef4444", marginTop:2 }}>{fetchError}</div>
            </div>
            <button onClick={() => { setFetchError(null); setLoading(true); api.progress.getAll().then(r => { if (r.success && r.data) setData(r.data as ProgressRecord[]); else setFetchError(r.error ?? "Failed"); }).catch(e => setFetchError(e?.message ?? "Error")).finally(() => setLoading(false)); }}
              style={{ marginLeft:"auto", padding:"5px 12px", borderRadius:7, border:"1.5px solid rgba(239,68,68,.25)", background:"rgba(239,68,68,.06)", color:"#dc2626", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              Retry
            </button>
          </div>
        )}

        {/* AI overview + Carousel — side by side, grid enforces equal height */}
        {!loading && (
          <div style={{ display:"grid", gridTemplateColumns:"58% 1fr", gap:14, marginBottom:20, flexShrink:0 }}>
            <LearnerAIOverview data={safe} courses={courses} />
            {courses.length > 0 && onOpenCourse && (
              <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
                <FeaturedCarousel courses={courses} onOpenCourse={onOpenCourse} />
              </div>
            )}
          </div>
        )}

        {/* Stat cards */}
        {!loading && (
          <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
            <StatCard label="Total Courses" value={safe.length}        accent="#18103a" />
            <StatCard label="Completed"     value={completed}          accent="#10b981" />
            <StatCard label="In Progress"   value={inProgress}         accent="#6c3dd6" />
            <StatCard label="Avg. Progress" value={`${avgProgress}%`}  accent="#f59e0b" />
          </div>
        )}

        {/* Filters */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, flexWrap:"wrap" }}>
          <div style={{ display:"flex", gap:6, flex:1, flexWrap:"wrap" }}>
            {["All","In Progress","Completed","Not Started"].map(f => (
              <button key={f} className={`prog-chip${filter===f?" active":""}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="prog-search">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#b0a8cc" strokeWidth="2"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
            <input placeholder="Search courses…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#b0a8cc", padding:0, lineHeight:1, fontSize:16 }}>×</button>}
          </div>
        </div>

        {/* Table */}
        <div style={{ background:"#fff", borderRadius:14, border:"1.5px solid rgba(108,61,214,.08)", boxShadow:"0 1px 4px rgba(0,0,0,.04)", overflow:"hidden" }}>
          {loading ? (
            <div style={{ padding:"20px 16px" }}>
              {[...Array(5)].map((_,i) => (
                <div key={i} style={{ display:"flex", gap:12, marginBottom:12, alignItems:"center" }}>
                  <div className="skeleton" style={{ height:13, width:"32%", animationDelay:`${i*.07}s` }}/>
                  <div className="skeleton" style={{ height:6, width:"18%", borderRadius:99 }}/>
                  <div className="skeleton" style={{ height:11, width:"12%" }}/>
                  <div className="skeleton" style={{ height:11, width:"12%" }}/>
                  <div className="skeleton" style={{ height:20, width:"13%", borderRadius:99 }}/>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table className="prog-table">
                <thead>
                  <tr><th>Course</th><th>Progress</th><th>Started</th><th>Completed</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={5}>
                      <div style={{ textAlign:"center", padding:"48px 20px" }}>
                        <div style={{ fontSize:36, marginBottom:10 }}>📭</div>
                        <p style={{ fontSize:13.5, fontWeight:600, color:"#18103a", margin:"0 0 4px" }}>{safe.length===0 ? "No courses yet" : "No results found"}</p>
                        <p style={{ fontSize:12, color:"#8e7ec0", margin:0 }}>{safe.length===0 ? "Start a course to track your progress." : "Try a different filter or search."}</p>
                      </div>
                    </td></tr>
                  ) : rows.map((r, i) => {
                    const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["Not Started"];
                    return (
                      <tr key={i} className="prog-row">
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:30, height:30, borderRadius:8, background:"rgba(108,61,214,.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6c3dd6" strokeWidth="1.8"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
                            </div>
                            <span style={{ fontSize:13, fontWeight:600, color:"#18103a" }}>{r.course}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div className="prog-bar-track"><div className="prog-bar-fill" style={{ width:`${r.progress}%`, background:cfg.bar }}/></div>
                            <span style={{ fontSize:11, fontWeight:700, color:"#4a3870", minWidth:28 }}>{r.progress}%</span>
                          </div>
                        </td>
                        <td style={{ fontSize:11.5, color:"#8e7ec0" }}>
                          {r.started ? <span style={{ display:"flex", alignItems:"center", gap:4 }}><svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1v2M11 1v2M2 7h12"/></svg>{r.started}</span> : <span style={{ color:"#d4cee8" }}>—</span>}
                        </td>
                        <td style={{ fontSize:11.5, color:"#8e7ec0" }}>
                          {r.completed ? <span style={{ display:"flex", alignItems:"center", gap:4 }}><svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#10b981" strokeWidth="2"><path d="M2 8l4 4 8-8"/></svg>{r.completed}</span> : <span style={{ color:"#d4cee8" }}>—</span>}
                        </td>
                        <td>
                          <span className="prog-badge" style={{ borderColor:cfg.dot+"40", background:cfg.dot+"14", color:cfg.dot }}>
                            <span style={{ width:5, height:5, borderRadius:"50%", background:cfg.dot, flexShrink:0 }}/>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loading && rows.length > 0 && (
            <div style={{ padding:"9px 16px", borderTop:"1.5px solid rgba(108,61,214,.06)", fontSize:11, color:"#b0a8cc", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>Showing <strong style={{ color:"#4a3870" }}>{rows.length}</strong> of <strong style={{ color:"#4a3870" }}>{safe.length}</strong></span>
              {filter !== "All" && <button onClick={() => { setFilter("All"); setSearch(""); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#6c3dd6", fontSize:11, fontWeight:700, padding:0, fontFamily:"inherit" }}>Clear filters</button>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function ClientProgress({ toast, role = "client", courses = [], onOpenCourse }: ClientProgressProps) {
  if (role === "admin")   return <AdminProgress   toast={toast} />;
  if (role === "manager") return <ManagerProgress toast={toast} />;
  return <ClientLearnerProgress toast={toast} courses={courses} onOpenCourse={onOpenCourse} />;
}
