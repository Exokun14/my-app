'use client'

import AdminProgress from "./AdminProgress";
import ManagerProgress from "./ManagerProgress";
import { useState, useEffect, useRef } from "react";
import type { ProgressRecord } from "../../Data/types";
import api from "../../Services/api.service";

type Role = "admin" | "manager" | "client";

interface ClientProgressProps {
  toast: (msg: string) => void;
  role?: Role;
}

const STATUS_CONFIG: Record<string,{bar:string;badge:string;dot:string;label:string}> = {
  Completed:    {bar:"linear-gradient(90deg,#10b981,#34d399)", badge:"bg-emerald-50 text-emerald-700 border-emerald-200", dot:"#10b981", label:"Completed"},
  "In Progress":{bar:"linear-gradient(90deg,#6366f1,#818cf8)", badge:"bg-indigo-50 text-indigo-700 border-indigo-200",   dot:"#6366f1", label:"In Progress"},
  "Not Started":{bar:"linear-gradient(90deg,#d1d5db,#e5e7eb)", badge:"bg-slate-50 text-slate-500 border-slate-200",     dot:"#d1d5db", label:"Not Started"},
};

function StatCard({label,value,accent}:{label:string;value:number|string;accent:string}) {
  return (
    <div style={{background:"#fff",borderRadius:16,padding:"18px 22px",border:"1px solid #f1f5f9",boxShadow:"0 1px 3px rgba(0,0,0,.05)",display:"flex",flexDirection:"column",gap:4,minWidth:100,flex:1}}>
      <span style={{fontSize:22,fontWeight:800,color:accent,fontFamily:"'DM Serif Display',Georgia,serif",letterSpacing:"-.03em"}}>{value}</span>
      <span style={{fontSize:11,fontWeight:500,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".07em"}}>{label}</span>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEARNER AI OVERVIEW — light themed (matches AdminAIOverview)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LearnerAIOverview({ data, toast }: { data: ProgressRecord[]; toast: (m: string) => void }) {
  const [displayed, setDisplayed] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const ticker = useRef<ReturnType<typeof setInterval>|null>(null);

  const generate = async () => {
    if (ticker.current) clearInterval(ticker.current);
    setLoading(true); setDisplayed(""); setResult("");
    const completed = data.filter(r=>r.status==="Completed").length;
    const inProgress = data.filter(r=>r.status==="In Progress").length;
    const avg = data.length ? Math.round(data.reduce((s,r)=>s+r.progress,0)/data.length) : 0;
    const ctx = data.length
      ? `Courses:\n${data.map(r=>`- ${r.course}: ${r.progress}% (${r.status})`).join("\n")}\nSummary: ${completed} completed, ${inProgress} in progress, avg ${avg}%`
      : "No courses enrolled yet.";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:600,
          system:"You are a personal learning coach. Write 3 sentences of warm, motivating editorial prose — no bullets, no emoji. Acknowledge progress made, highlight what to focus on next, and end with one specific encouragement. Be personal and direct.",
          messages:[{role:"user",content:`My learning data:\n${ctx}\n\nGive me a personal overview of where I stand and what to focus on.`}] }),
      });
      const d = await res.json();
      const text = d.content?.find((b:any)=>b.type==="text")?.text ?? "Unable to generate your overview right now.";
      setResult(text); setHasGenerated(true);
      let i=0;
      ticker.current = setInterval(()=>{ i+=4; setDisplayed(text.slice(0,i)); if(i>=text.length){setDisplayed(text);clearInterval(ticker.current!);} },14);
    } catch { setDisplayed("Unable to connect. Please try again."); }
    finally { setLoading(false); }
  };

  const completed  = data.filter(r=>r.status==="Completed").length;
  const inProgress = data.filter(r=>r.status==="In Progress").length;
  const avgProgress = data.length ? Math.round(data.reduce((s,r)=>s+r.progress,0)/data.length) : 0;

  return (
    <>
      <style>{`
        @keyframes laio-spin  { to{transform:rotate(360deg)} }
        @keyframes laio-pulse { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(2.1);opacity:0} }
        @keyframes laio-sweep { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes laio-in    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes laio-blink { 0%,100%{opacity:1} 50%{opacity:0} }

        .laio-card {
          margin-bottom: 24px;
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          border: 1.5px solid rgba(109,40,217,0.1);
          box-shadow: 0 2px 16px rgba(109,40,217,0.06);
          animation: laio-in .3s cubic-bezier(.16,1,.3,1) both;
        }
        .laio-head {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 18px 14px;
          border-bottom: 1px solid rgba(109,40,217,0.07);
          background: linear-gradient(135deg, rgba(124,58,237,0.03) 0%, rgba(255,255,255,0) 100%);
        }
        .laio-orb { position:relative; width:38px; height:38px; flex-shrink:0; }
        .laio-orb-ring {
          position:absolute; inset:-2px; border-radius:50%;
          background:conic-gradient(from 0deg,#7c3aed,#06b6d4,#10b981,#a78bfa,#7c3aed);
          animation:laio-spin 2.8s linear infinite;
        }
        .laio-orb-ring::after { content:''; position:absolute; inset:2.5px; border-radius:50%; background:#fff; }
        .laio-orb-core {
          position:absolute; inset:0; margin:auto;
          width:15px; height:15px; border-radius:50%; z-index:1;
          background:radial-gradient(circle at 35% 30%,#e9d5ff,#7c3aed);
          box-shadow:0 0 12px rgba(167,139,250,.7),0 0 24px rgba(124,58,237,.3);
        }
        .laio-orb-pulse {
          position:absolute; inset:0; border-radius:50%;
          border:1.5px solid rgba(124,58,237,.35);
          animation:laio-pulse 2.2s ease-out infinite;
        }
        .laio-head-title { font-size:11.5px; font-weight:800; color:#18103a; letter-spacing:.07em; text-transform:uppercase; }
        .laio-head-sub   { font-size:10px; color:#8e7ec0; margin-top:2px; }
        .laio-chip {
          padding:3px 10px; border-radius:99px;
          background:rgba(124,58,237,0.08); border:1px solid rgba(124,58,237,0.18);
          font-size:9px; font-weight:800; color:#7c3aed;
          letter-spacing:.07em; text-transform:uppercase;
        }

        .laio-idle {
          padding:20px 18px;
          display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center;
        }
        .laio-idle-text { font-size:12.5px; color:#8e7ec0; line-height:1.6; max-width:320px; }

        .laio-btn {
          display:inline-flex; align-items:center; gap:8px;
          padding:10px 20px; border-radius:10px; border:none;
          background:linear-gradient(135deg,#7c3aed,#6d28d9);
          color:#fff; font-size:12.5px; font-weight:700;
          cursor:pointer; font-family:'DM Sans',sans-serif;
          transition:transform .15s,box-shadow .15s;
          box-shadow:0 3px 16px rgba(124,58,237,.35);
          position:relative; overflow:hidden;
        }
        .laio-btn::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);
          background-size:200%; animation:laio-sweep 2.2s linear infinite;
        }
        .laio-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 5px 22px rgba(124,58,237,.45); }
        .laio-btn:disabled { opacity:.55; cursor:default; }

        .laio-spinner {
          width:12px; height:12px; border-radius:50%;
          border:1.5px solid rgba(124,58,237,.3); border-top-color:#7c3aed;
          animation:laio-spin .6s linear infinite;
        }

        .laio-result { padding:14px 18px 16px; animation:laio-in .3s ease both; }
        .laio-mini-stats { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
        .laio-mini-stat {
          flex:1; min-width:70px; padding:10px 12px; border-radius:10px;
          background:rgba(124,58,237,0.04); border:1.5px solid rgba(124,58,237,0.08);
        }
        .laio-mini-num  { font-family:'DM Serif Display',Georgia,serif; font-size:22px; color:#18103a; line-height:1; }
        .laio-mini-label { font-size:9.5px; font-weight:700; color:#8e7ec0; text-transform:uppercase; letter-spacing:.08em; margin-top:3px; }
        .laio-divider { height:1px; background:rgba(109,40,217,0.07); margin-bottom:12px; }
        .laio-result-text {
          font-family:'DM Serif Display',Georgia,serif;
          font-style:italic; font-size:14px;
          color:#18103a; line-height:1.75; margin-bottom:14px;
        }
        .laio-cursor {
          display:inline-block; width:2px; height:14px;
          background:#7c3aed; margin-left:2px;
          vertical-align:middle; animation:laio-blink .75s step-end infinite;
        }
        .laio-regen {
          display:inline-flex; align-items:center; gap:5px;
          padding:5px 11px; border-radius:6px;
          border:1.5px solid rgba(124,58,237,0.15);
          background:rgba(124,58,237,0.04); color:#7c3aed;
          font-size:10.5px; font-weight:600; cursor:pointer;
          font-family:'DM Sans',sans-serif; transition:all .13s;
        }
        .laio-regen:hover { background:rgba(124,58,237,0.1); border-color:rgba(124,58,237,0.3); }
      `}</style>

      <div className="laio-card">
        <div className="laio-head">
          <div className="laio-orb">
            <div className="laio-orb-ring"/>
            <div className="laio-orb-pulse"/>
            <div className="laio-orb-core"/>
          </div>
          <div style={{ flex: 1 }}>
            <div className="laio-head-title">Your AI Learning Coach</div>
            <div className="laio-head-sub">Personalized overview of your progress</div>
          </div>
          <div className="laio-chip">AI</div>
        </div>

        {!hasGenerated && !loading ? (
          <div className="laio-idle">
            <div className="laio-idle-text">
              Get a personalized analysis of where you stand, what's slipping, and exactly what to tackle next.
            </div>
            <button className="laio-btn" onClick={generate}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1l1.4 4.2H13l-3.7 2.7 1.4 4.2L7 9.4l-3.7 2.7 1.4-4.2L1 5.2h4.6z"/></svg>
              Get My Overview
            </button>
          </div>
        ) : loading ? (
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"20px", justifyContent:"center" }}>
            <div className="laio-spinner"/>
            <span style={{ fontSize:12, color:"#8e7ec0" }}>Analyzing your learning journey…</span>
          </div>
        ) : (
          <div className="laio-result">
            <div className="laio-mini-stats">
              {[
                { label:"Courses",     value:data.length,   color:"#18103a" },
                { label:"Completed",   value:completed,     color:"#16a34a" },
                { label:"In Progress", value:inProgress,    color:"#7c3aed" },
                { label:"Avg Progress",value:`${avgProgress}%`, color:"#0d9488" },
              ].map(s => (
                <div key={s.label} className="laio-mini-stat">
                  <div className="laio-mini-num" style={{ color:s.color }}>{s.value}</div>
                  <div className="laio-mini-label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="laio-divider"/>
            <div className="laio-result-text">
              {displayed}
              {displayed.length < result.length && <span className="laio-cursor"/>}
            </div>
            <button className="laio-regen" onClick={generate} disabled={loading}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 7a5 5 0 015-5 5 5 0 014.33 2.5M12 7a5 5 0 01-5 5 5 5 0 01-4.33-2.5M12 3v3h-3M2 11V8h3"/></svg>
              Regenerate
            </button>
          </div>
        )}
      </div>
    </>
  );
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ClientLearnerProgress({ toast }: { toast: (msg: string) => void }) {
  const [data, setData] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await api.progress.getAll();
        if (r.success && r.data) setData(r.data as ProgressRecord[]);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const safe = data || [];
  const completed  = safe.filter(r=>r.status==="Completed").length;
  const inProgress = safe.filter(r=>r.status==="In Progress").length;
  const avgProgress = safe.length ? Math.round(safe.reduce((s,r)=>s+r.progress,0)/safe.length) : 0;

  const rows = safe.filter(r =>
    (filter==="All"||r.status===filter) &&
    (!search||r.course.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        .prog-root{font-family:'DM Sans',sans-serif;background:#f8fafc;min-height:100vh;padding:32px 28px;box-sizing:border-box;}
        .prog-chip{padding:6px 14px;border-radius:999px;border:1.5px solid #e2e8f0;background:#fff;font-size:12px;font-weight:600;color:#64748b;cursor:pointer;transition:all .18s ease;font-family:'DM Sans',sans-serif;letter-spacing:.01em;}
        .prog-chip:hover{border-color:#6366f1;color:#6366f1;background:#eef2ff;}
        .prog-chip.active{background:#6366f1;color:#fff;border-color:#6366f1;box-shadow:0 2px 8px rgba(99,102,241,.3);}
        .prog-search{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:8px 14px;transition:border-color .15s;}
        .prog-search:focus-within{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.1);}
        .prog-search input{border:none;outline:none;font-size:13px;color:#1e293b;background:transparent;font-family:'DM Sans',sans-serif;width:180px;}
        .prog-search input::placeholder{color:#94a3b8;}
        .prog-table{width:100%;border-collapse:separate;border-spacing:0;}
        .prog-table thead tr th{padding:10px 16px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:#94a3b8;text-align:left;background:#f8fafc;border-bottom:1px solid #f1f5f9;}
        .prog-row{transition:background .15s;cursor:default;}
        .prog-row td{padding:13px 16px;border-bottom:1px solid #f8fafc;vertical-align:middle;}
        .prog-row:hover td{background:#fafbff;}
        .prog-row:last-child td{border-bottom:none;}
        .prog-bar-track{height:6px;background:#f1f5f9;border-radius:99px;overflow:hidden;width:120px;}
        .prog-bar-fill{height:100%;border-radius:99px;transition:width .6s cubic-bezier(.34,1.56,.64,1);}
        .prog-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px 3px 7px;border-radius:999px;font-size:11px;font-weight:600;border:1.5px solid;}
        .export-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;font-size:12.5px;font-weight:600;color:#475569;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif;}
        .export-btn:hover{border-color:#6366f1;color:#6366f1;background:#eef2ff;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp .35s ease both;}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .skeleton{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:800px 100%;animation:shimmer 1.4s infinite;border-radius:6px;}
      `}</style>
      <div className="prog-root">
        <div className="fade-up" style={{marginBottom:28}}>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div>
              <h1 style={{fontFamily:"'DM Serif Display',Georgia,serif",fontSize:30,fontWeight:400,color:"#0f172a",margin:0,letterSpacing:"-.03em",lineHeight:1.1}}>My Learning Progress</h1>
              <p style={{margin:"6px 0 0",fontSize:13.5,color:"#64748b",fontWeight:400}}>Track your courses, milestones, and achievements.</p>
            </div>
            <button className="export-btn" onClick={()=>toast("Exporting…")}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2"/></svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* AI Overview — shown when data is loaded */}
        {!loading && <LearnerAIOverview data={safe} toast={toast} />}

        {!loading && (
          <div className="fade-up" style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap",animationDelay:".05s"}}>
            <StatCard label="Total Courses" value={safe.length}    accent="#0f172a"/>
            <StatCard label="Completed"     value={completed}      accent="#10b981"/>
            <StatCard label="In Progress"   value={inProgress}     accent="#6366f1"/>
            <StatCard label="Avg. Progress" value={`${avgProgress}%`} accent="#f59e0b"/>
          </div>
        )}

        <div className="fade-up" style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap",animationDelay:".1s"}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",flex:1}}>
            {["All","In Progress","Completed","Not Started"].map(f=>(
              <button key={f} className={`prog-chip${filter===f?" active":""}`} onClick={()=>setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="prog-search">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M11 11l3 3"/></svg>
            <input placeholder="Search courses…" value={search} onChange={e=>setSearch(e.target.value)}/>
            {search&&<button onClick={()=>setSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",padding:0,lineHeight:1}}>×</button>}
          </div>
        </div>

        <div className="fade-up" style={{background:"#fff",borderRadius:18,border:"1px solid #f1f5f9",boxShadow:"0 2px 12px rgba(0,0,0,.04)",overflow:"hidden",animationDelay:".15s"}}>
          {loading ? (
            <div style={{padding:"24px 16px"}}>
              {[...Array(5)].map((_,i)=>(
                <div key={i} style={{display:"flex",gap:12,marginBottom:14,alignItems:"center"}}>
                  <div className="skeleton" style={{height:14,width:"30%",animationDelay:`${i*.07}s`}}/>
                  <div className="skeleton" style={{height:8,width:"20%",borderRadius:99}}/>
                  <div className="skeleton" style={{height:12,width:"12%"}}/>
                  <div className="skeleton" style={{height:12,width:"12%"}}/>
                  <div className="skeleton" style={{height:22,width:"14%",borderRadius:99}}/>
                </div>
              ))}
            </div>
          ) : (
            <div style={{overflowX:"auto"}}>
              <table className="prog-table">
                <thead><tr><th>Course</th><th>Progress</th><th>Started</th><th>Completed</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.length===0 ? (
                    <tr><td colSpan={5}>
                      <div style={{textAlign:"center",padding:"56px 20px"}}>
                        <p style={{fontSize:14,fontWeight:600,color:"#334155",margin:"0 0 4px"}}>{safe.length===0?"No courses yet":"No results found"}</p>
                        <p style={{fontSize:12.5,color:"#94a3b8",margin:0}}>{safe.length===0?"Start a course to track your progress here.":"Try a different search or filter."}</p>
                      </div>
                    </td></tr>
                  ) : rows.map((r,i)=>{
                    const cfg=STATUS_CONFIG[r.status]??STATUS_CONFIG["Not Started"];
                    return (
                      <tr key={i} className="prog-row">
                        <td>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#eef2ff,#e0e7ff)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.8"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
                            </div>
                            <span style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{r.course}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div className="prog-bar-track"><div className="prog-bar-fill" style={{width:`${r.progress}%`,background:cfg.bar}}/></div>
                            <span style={{fontSize:11.5,fontWeight:700,color:"#475569",minWidth:30}}>{r.progress}%</span>
                          </div>
                        </td>
                        <td style={{fontSize:12,color:"#64748b"}}>
                          {r.started?<span style={{display:"flex",alignItems:"center",gap:5}}><svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M5 1v2M11 1v2M2 7h12"/></svg>{r.started}</span>:<span style={{color:"#cbd5e1"}}>—</span>}
                        </td>
                        <td style={{fontSize:12,color:"#64748b"}}>
                          {r.completed?<span style={{display:"flex",alignItems:"center",gap:5}}><svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#10b981" strokeWidth="2"><path d="M2 8l4 4 8-8"/></svg>{r.completed}</span>:<span style={{color:"#cbd5e1"}}>—</span>}
                        </td>
                        <td>
                          <span className="prog-badge" style={{borderColor:cfg.dot+"40",background:cfg.dot+"12",color:cfg.dot}}>
                            <span style={{width:6,height:6,borderRadius:"50%",background:cfg.dot,flexShrink:0}}/>
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
          {!loading&&rows.length>0&&(
            <div style={{padding:"10px 18px",borderTop:"1px solid #f8fafc",fontSize:11.5,color:"#94a3b8",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>Showing <strong style={{color:"#475569"}}>{rows.length}</strong> of <strong style={{color:"#475569"}}>{safe.length}</strong> courses</span>
              {filter!=="All"&&<button onClick={()=>{setFilter("All");setSearch("");}} style={{background:"none",border:"none",cursor:"pointer",color:"#6366f1",fontSize:11.5,fontWeight:600,padding:0,fontFamily:"inherit"}}>Clear filters</button>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function ClientProgress({ toast, role = "client" }: ClientProgressProps) {
  if (role==="admin")   return <AdminProgress   toast={toast}/>;
  if (role==="manager") return <ManagerProgress toast={toast}/>;
  return <ClientLearnerProgress toast={toast}/>;
}
