'use client'

import { useState, useEffect, useRef } from "react";

interface ProgressPanelProps {
  toast: (msg: string) => void;
}

interface Chapter { title: string; done: boolean; }

interface CourseAssignment {
  id: string; name: string; started: string; progress: number;
  lastActive: string; status: "On Track" | "Needs Attention" | "At Risk" | "Completed";
  chapters: Chapter[];
}

interface TeamMember {
  id: string; name: string; avatar: string; role: string;
  assignments: CourseAssignment[];
}

const MOCK_TEAM: TeamMember[] = [
  { id:"t1", name:"Sarah Kim", avatar:"SK", role:"Sales Associate", assignments:[
    { id:"a1", name:"POS Training", started:"Mar 1", progress:92, lastActive:"Today", status:"On Track", chapters:[{title:"System Overview",done:true},{title:"Processing Transactions",done:true},{title:"Refunds & Returns",done:true},{title:"End-of-Day Procedures",done:false}] },
    { id:"a2", name:"Customer Service Fundamentals", started:"Feb 20", progress:100, lastActive:"Feb 28", status:"Completed", chapters:[{title:"Communication Skills",done:true},{title:"Handling Complaints",done:true},{title:"Upselling Techniques",done:true}] },
  ]},
  { id:"t2", name:"Marcus Webb", avatar:"MW", role:"Team Lead", assignments:[
    { id:"a3", name:"Leadership Essentials", started:"Feb 14", progress:68, lastActive:"3 days ago", status:"On Track", chapters:[{title:"Motivating Your Team",done:true},{title:"Conflict Resolution",done:true},{title:"Performance Reviews",done:false},{title:"Coaching Techniques",done:false},{title:"Strategic Thinking",done:false}] },
  ]},
  { id:"t3", name:"Priya Nair", avatar:"PN", role:"Cashier", assignments:[
    { id:"a4", name:"POS Training", started:"Mar 3", progress:18, lastActive:"9 days ago", status:"Needs Attention", chapters:[{title:"System Overview",done:true},{title:"Processing Transactions",done:false},{title:"Refunds & Returns",done:false},{title:"End-of-Day Procedures",done:false}] },
    { id:"a5", name:"Compliance 101", started:"Mar 3", progress:0, lastActive:"Never", status:"At Risk", chapters:[{title:"Workplace Policies",done:false},{title:"Data Privacy",done:false},{title:"Safety Procedures",done:false}] },
  ]},
  { id:"t4", name:"Derek Hall", avatar:"DH", role:"Stock Associate", assignments:[
    { id:"a6", name:"Safety Basics", started:"Feb 28", progress:45, lastActive:"5 days ago", status:"Needs Attention", chapters:[{title:"Hazard Identification",done:true},{title:"PPE Usage",done:true},{title:"Emergency Procedures",done:false},{title:"Incident Reporting",done:false}] },
  ]},
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MANAGER AI OVERVIEW — light themed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ManagerAIOverview({ team, toast }: { team: TeamMember[]; toast: (m: string) => void }) {
  const [displayed, setDisplayed] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const allAssignments = team.flatMap(m => m.assignments);
  const completed = allAssignments.filter(a => a.status === "Completed").length;
  const atRisk = team.filter(m => m.assignments.some(a => a.status === "At Risk" || a.status === "Needs Attention")).length;
  const totalAssignments = allAssignments.length;
  const avgProgress = Math.round(allAssignments.reduce((s, a) => s + a.progress, 0) / allAssignments.length);

  const generate = async () => {
    if (ticker.current) clearInterval(ticker.current);
    setLoading(true); setDisplayed(""); setResult("");
    const ctx = team.map(m => `${m.name} (${m.role}): ${m.assignments.map(a => `${a.name} - ${a.progress}% (${a.status}, last active ${a.lastActive})`).join("; ")}`).join("\n");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 600,
          system: "You are a team coaching assistant for a manager. Write 3 sentences of warm, direct prose — no bullets, no emoji. Highlight team progress, name who needs a nudge, and suggest one specific action for the manager to take today. Be personal and actionable.",
          messages: [{ role: "user", content: `My team's learning data:\n${ctx}\n\nGive me a quick overview and what I should focus on today.` }],
        }),
      });
      const d = await res.json();
      const text = d.content?.find((b: any) => b.type === "text")?.text ?? "Unable to generate your overview right now.";
      setResult(text); setHasGenerated(true);
      let i = 0;
      ticker.current = setInterval(() => { i += 4; setDisplayed(text.slice(0, i)); if (i >= text.length) { setDisplayed(text); clearInterval(ticker.current!); } }, 14);
    } catch { setDisplayed("Unable to connect. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @keyframes mao-spin  { to{transform:rotate(360deg)} }
        @keyframes mao-pulse { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(2.1);opacity:0} }
        @keyframes mao-sweep { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes mao-in    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes mao-blink { 0%,100%{opacity:1} 50%{opacity:0} }

        .mao-card {
          margin: 0 0 20px;
          border-radius: 16px; overflow: hidden;
          background: #fff;
          border: 1.5px solid rgba(109,40,217,0.1);
          box-shadow: 0 2px 16px rgba(109,40,217,0.06);
          animation: mao-in .3s cubic-bezier(.16,1,.3,1) both;
        }
        .mao-head {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 18px 14px;
          border-bottom: 1px solid rgba(109,40,217,0.07);
          background: linear-gradient(135deg,rgba(124,58,237,0.03) 0%,rgba(255,255,255,0) 100%);
        }
        .mao-orb { position:relative; width:38px; height:38px; flex-shrink:0; }
        .mao-orb-ring { position:absolute; inset:-2px; border-radius:50%; background:conic-gradient(from 0deg,#7c3aed,#06b6d4,#10b981,#a78bfa,#7c3aed); animation:mao-spin 2.8s linear infinite; }
        .mao-orb-ring::after { content:''; position:absolute; inset:2.5px; border-radius:50%; background:#fff; }
        .mao-orb-core { position:absolute; inset:0; margin:auto; width:15px; height:15px; border-radius:50%; z-index:1; background:radial-gradient(circle at 35% 30%,#e9d5ff,#7c3aed); box-shadow:0 0 12px rgba(167,139,250,.7),0 0 24px rgba(124,58,237,.3); }
        .mao-orb-pulse { position:absolute; inset:0; border-radius:50%; border:1.5px solid rgba(124,58,237,.35); animation:mao-pulse 2.2s ease-out infinite; }
        .mao-chip { padding:3px 10px; border-radius:99px; background:rgba(124,58,237,0.08); border:1px solid rgba(124,58,237,0.18); font-size:9px; font-weight:800; color:#7c3aed; letter-spacing:.07em; text-transform:uppercase; }

        .mao-idle { padding:20px 18px; display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; }
        .mao-idle-text { font-size:12.5px; color:#8e7ec0; line-height:1.6; max-width:320px; }

        .mao-btn {
          display:inline-flex; align-items:center; gap:8px;
          padding:10px 20px; border-radius:10px; border:none;
          background:linear-gradient(135deg,#7c3aed,#6d28d9);
          color:#fff; font-size:12.5px; font-weight:700;
          cursor:pointer; font-family:'DM Sans',sans-serif;
          transition:transform .15s,box-shadow .15s;
          box-shadow:0 3px 16px rgba(124,58,237,.35);
          position:relative; overflow:hidden;
        }
        .mao-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent); background-size:200%; animation:mao-sweep 2.2s linear infinite; }
        .mao-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 5px 22px rgba(124,58,237,.45); }
        .mao-btn:disabled { opacity:.55; cursor:default; }

        .mao-spinner { width:12px; height:12px; border-radius:50%; border:1.5px solid rgba(124,58,237,.3); border-top-color:#7c3aed; animation:mao-spin .6s linear infinite; }

        .mao-result { padding:14px 18px 16px; animation:mao-in .3s ease both; }
        .mao-mini-stats { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
        .mao-mini-stat { flex:1; min-width:70px; padding:10px 12px; border-radius:10px; background:rgba(124,58,237,0.04); border:1.5px solid rgba(124,58,237,0.08); }
        .mao-mini-num  { font-family:'DM Serif Display',Georgia,serif; font-size:22px; color:#18103a; line-height:1; }
        .mao-mini-label { font-size:9.5px; font-weight:700; color:#8e7ec0; text-transform:uppercase; letter-spacing:.08em; margin-top:3px; }
        .mao-divider { height:1px; background:rgba(109,40,217,0.07); margin-bottom:12px; }
        .mao-result-text { font-family:'DM Serif Display',Georgia,serif; font-style:italic; font-size:14px; color:#18103a; line-height:1.75; margin-bottom:14px; }
        .mao-cursor { display:inline-block; width:2px; height:14px; background:#7c3aed; margin-left:2px; vertical-align:middle; animation:mao-blink .75s step-end infinite; }
        .mao-regen { display:inline-flex; align-items:center; gap:5px; padding:5px 11px; border-radius:6px; border:1.5px solid rgba(124,58,237,0.15); background:rgba(124,58,237,0.04); color:#7c3aed; font-size:10.5px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .13s; }
        .mao-regen:hover { background:rgba(124,58,237,0.1); border-color:rgba(124,58,237,0.3); }
      `}</style>

      <div className="mao-card">
        <div className="mao-head">
          <div className="mao-orb">
            <div className="mao-orb-ring" />
            <div className="mao-orb-pulse" />
            <div className="mao-orb-core" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "#18103a", letterSpacing: ".07em", textTransform: "uppercase" as const }}>Your AI Team Coach</div>
            <div style={{ fontSize: 10, color: "#8e7ec0", marginTop: 2 }}>Personalized overview of your team's progress</div>
          </div>
          <div className="mao-chip">AI</div>
        </div>

        {!hasGenerated && !loading ? (
          <div className="mao-idle">
            <div className="mao-idle-text">Get a snapshot of who's excelling, who needs a nudge, and exactly what to do today.</div>
            <button className="mao-btn" onClick={generate}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1l1.4 4.2H13l-3.7 2.7 1.4 4.2L7 9.4l-3.7 2.7 1.4-4.2L1 5.2h4.6z" /></svg>
              Get Team Overview
            </button>
          </div>
        ) : loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px", justifyContent: "center" }}>
            <div className="mao-spinner" />
            <span style={{ fontSize: 12, color: "#8e7ec0" }}>Analyzing your team…</span>
          </div>
        ) : (
          <div className="mao-result">
            <div className="mao-mini-stats">
              {[
                { label: "Team Members", value: team.length,        color: "#18103a" },
                { label: "Assignments",  value: totalAssignments,   color: "#7c3aed" },
                { label: "Completed",    value: completed,          color: "#0d9488" },
                { label: "Avg Progress", value: `${avgProgress}%`,  color: "#d97706" },
                { label: "Need Nudge",   value: atRisk,             color: "#dc2626" },
              ].map(s => (
                <div key={s.label} className="mao-mini-stat">
                  <div className="mao-mini-num" style={{ color: s.color }}>{s.value}</div>
                  <div className="mao-mini-label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mao-divider" />
            <div className="mao-result-text">
              {displayed}
              {displayed.length < result.length && <span className="mao-cursor" />}
            </div>
            <button className="mao-regen" onClick={generate} disabled={loading}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 7a5 5 0 015-5 5 5 0 014.33 2.5M12 7a5 5 0 01-5 5 5 5 0 01-4.33-2.5M12 3v3h-3M2 11V8h3" /></svg>
              Regenerate
            </button>
          </div>
        )}
      </div>
    </>
  );
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const STATUS_COLORS: Record<string,{bg:string;color:string;dot:string}> = {
  "On Track":       {bg:"rgba(13,148,136,0.1)", color:"#0d9488",dot:"#0d9488"},
  "Needs Attention":{bg:"rgba(217,119,6,0.1)",  color:"#d97706",dot:"#d97706"},
  "At Risk":        {bg:"rgba(220,38,38,0.1)",  color:"#dc2626",dot:"#dc2626"},
  "Completed":      {bg:"rgba(22,163,74,0.1)",  color:"#16a34a",dot:"#16a34a"},
};
function StatusBadge({status}:{status:string}) {
  const c=STATUS_COLORS[status]??STATUS_COLORS["On Track"];
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:999,background:c.bg,color:c.color,fontSize:10.5,fontWeight:700,letterSpacing:".02em",border:`1px solid ${c.dot}30`}}><span style={{width:5,height:5,borderRadius:"50%",background:c.dot,flexShrink:0}}/>{status}</span>;
}
function ProgressBar({value}:{value:number}) {
  return <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{flex:1,height:5,background:"var(--border)",borderRadius:99,overflow:"hidden",minWidth:80}}><div style={{height:"100%",borderRadius:99,width:`${value}%`,background:value>=100?"var(--teal)":value>=60?"var(--purple)":"#d97706",transition:"width .7s cubic-bezier(.34,1.2,.64,1)"}}/></div><span style={{fontSize:11,fontWeight:700,color:"var(--t2)",minWidth:28}}>{value}%</span></div>;
}

type AiHistory = {label:string;content:string};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI NUDGE PANEL — dark, cinematic, fixed bottom-right
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AINudgePanel({ team, toast }: { team: TeamMember[]; toast: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string|null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState(team[0]?.id ?? "");
  const [history, setHistory] = useState<AiHistory[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const ticker = useRef<ReturnType<typeof setInterval>|null>(null);

  const teamContext = team.map(m=>`${m.name} (${m.role}): ${m.assignments.map(a=>`${a.name} - ${a.progress}% (${a.status}, last active ${a.lastActive})`).join("; ")}`).join("\n");
  const selectedMember = team.find(m=>m.id===selectedEmployee);

  const runAction = async (label:string, promptText:string) => {
    if (ticker.current) clearInterval(ticker.current);
    setLoading(true); setActiveAction(label); setDisplayed("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:"You are a concise team coaching assistant. Write in editorial prose — no bullet points, no emojis, no filler. Be specific, professional, and direct. 3–5 sentences max unless drafting a message.",
          messages:[{role:"user",content:`Team data:\n${teamContext}\n\n${promptText}`}] }),
      });
      const data = await res.json();
      const text = data.content?.find((b:any)=>b.type==="text")?.text || "No response.";
      const entry:AiHistory = {label, content:text};
      setHistory(prev=>{const next=[entry,...prev].slice(0,3); setActiveTab(0); return next;});
      let i=0;
      ticker.current = setInterval(()=>{ i+=4; setDisplayed(text.slice(0,i)); if(i>=text.length){setDisplayed(text);clearInterval(ticker.current!);} },14);
    } catch {
      setHistory(prev=>[{label,content:"Unable to connect. Please try again."},...prev].slice(0,3));
    } finally { setLoading(false); setActiveAction(null); }
  };

  const actions = [
    {label:"Who needs attention?", icon:"⚠", prompt:"Scan the team data and identify the 2–3 employees most at risk. For each, give a one-line reason."},
    {label:"Draft check-in",        icon:"✉", prompt:`Write a professional, warm check-in nudge for ${selectedMember?.name??""} (${selectedMember?.role}). Courses: ${selectedMember?.assignments.map(a=>`${a.name} at ${a.progress}%, last active ${a.lastActive}`).join("; ")}. Under 80 words.`},
    {label:"Weekly summary",        icon:"◈", prompt:"One-paragraph weekly summary of the team's learning activity — completions, progress, who excelled. Suitable for Slack."},
  ];

  const currentText = activeTab===0 && displayed ? displayed : history[activeTab]?.content ?? "";
  const stillTyping = activeTab===0 && displayed.length>0 && displayed.length<(history[0]?.content?.length??0);

  return (
    <>
      <style>{`
        @keyframes ainp-spin  { to{transform:rotate(360deg)} }
        @keyframes ainp-pulse { 0%,100%{transform:scale(1);opacity:.5} 50%{transform:scale(2.1);opacity:0} }
        @keyframes ainp-sweep { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes ainp-up    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ainp-txt   { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ainp-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes ainp-glow  { 0%,100%{box-shadow:0 -4px 24px rgba(124,58,237,.18),0 0 0 1px rgba(139,92,246,.1)} 50%{box-shadow:0 -4px 36px rgba(124,58,237,.3),0 0 0 1px rgba(139,92,246,.22)} }

        .ainp-wrap { position:fixed; bottom:0; right:24px; width:330px; z-index:100; font-family:'DM Sans',sans-serif; }

        .ainp-bar { display:flex; align-items:center; gap:9px; padding:11px 16px; border-radius:12px 12px 0 0; background:#09071a; border:1px solid rgba(139,92,246,.2); border-bottom:none; cursor:pointer; animation:ainp-glow 3s ease infinite; transition:all .2s; width:100%; }
        .ainp-bar:hover { padding-bottom:14px; }
        .ainp-bar-orb { position:relative; width:24px; height:24px; flex-shrink:0; }
        .ainp-bar-ring { position:absolute; inset:-2px; border-radius:50%; background:conic-gradient(from 0deg,#7c3aed,#06b6d4,#10b981,#a78bfa,#7c3aed); animation:ainp-spin 2.5s linear infinite; }
        .ainp-bar-ring::after { content:''; position:absolute; inset:2px; border-radius:50%; background:#09071a; }
        .ainp-bar-core { position:absolute; inset:0; margin:auto; width:10px; height:10px; border-radius:50%; z-index:1; background:radial-gradient(circle at 35% 30%,#e9d5ff,#7c3aed); box-shadow:0 0 8px rgba(167,139,250,.9); }
        .ainp-bar-label { font-size:12px; font-weight:700; color:rgba(255,255,255,.88); }
        .ainp-bar-chip { margin-left:auto; padding:2px 8px; border-radius:99px; background:rgba(124,58,237,.25); border:1px solid rgba(139,92,246,.35); font-size:9px; font-weight:800; color:#a78bfa; letter-spacing:.06em; text-transform:uppercase; }

        .ainp-panel { background:#09071a; border:1px solid rgba(139,92,246,.2); border-radius:14px 14px 0 0; overflow:hidden; animation:ainp-up .22s cubic-bezier(.16,1,.3,1) both; position:relative; }
        .ainp-ambient { position:absolute; inset:0; pointer-events:none; background:radial-gradient(ellipse 80% 40% at 0% 0%,rgba(124,58,237,.2) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 100% 100%,rgba(13,148,136,.12) 0%,transparent 60%); }
        .ainp-noise { position:absolute; inset:0; pointer-events:none; opacity:.025; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); }
        .ainp-inner { position:relative; z-index:1; }

        .ainp-head { display:flex; align-items:center; gap:10px; padding:13px 15px 11px; border-bottom:1px solid rgba(255,255,255,.05); }
        .ainp-head-orb { position:relative; width:30px; height:30px; flex-shrink:0; }
        .ainp-head-ring { position:absolute; inset:-2px; border-radius:50%; background:conic-gradient(from 0deg,#7c3aed,#06b6d4,#10b981,#a78bfa,#7c3aed); animation:ainp-spin 2.5s linear infinite; }
        .ainp-head-ring::after { content:''; position:absolute; inset:2px; border-radius:50%; background:#09071a; }
        .ainp-head-core { position:absolute; inset:0; margin:auto; width:12px; height:12px; border-radius:50%; z-index:1; background:radial-gradient(circle at 35% 30%,#e9d5ff,#7c3aed); box-shadow:0 0 10px rgba(167,139,250,.9),0 0 20px rgba(124,58,237,.4); }
        .ainp-head-pulse { position:absolute; inset:0; border-radius:50%; border:1.5px solid rgba(167,139,250,.5); animation:ainp-pulse 2s ease-out infinite; }
        .ainp-head-label { flex:1; font-size:11px; font-weight:700; color:rgba(255,255,255,.88); letter-spacing:.07em; text-transform:uppercase; }
        .ainp-close { background:none; border:none; cursor:pointer; color:rgba(255,255,255,.3); font-size:16px; line-height:1; padding:2px 4px; border-radius:5px; transition:color .14s; }
        .ainp-close:hover { color:rgba(255,255,255,.6); }

        .ainp-picker-wrap { padding:10px 14px 0; }
        .ainp-picker-label { font-size:9px; font-weight:700; color:rgba(255,255,255,.22); letter-spacing:.12em; text-transform:uppercase; margin-bottom:5px; }
        .ainp-picker { width:100%; background:rgba(255,255,255,.04); border:1px solid rgba(139,92,246,.16); border-radius:7px; padding:6px 9px; font-family:'DM Sans',sans-serif; font-size:11.5px; color:rgba(255,255,255,.7); outline:none; cursor:pointer; }
        .ainp-picker option { background:#1a1040; }

        .ainp-actions { padding:10px 14px; display:flex; flex-direction:column; gap:5px; }
        .ainp-action { display:flex; align-items:center; gap:9px; padding:9px 11px; border-radius:8px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.04); color:rgba(255,255,255,.6); font-size:11.5px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .14s; text-align:left; position:relative; overflow:hidden; }
        .ainp-action:hover:not(:disabled) { background:rgba(124,58,237,.2); border-color:rgba(139,92,246,.32); color:rgba(255,255,255,.88); }
        .ainp-action.active { background:rgba(124,58,237,.22); border-color:rgba(139,92,246,.38); color:#c4b5fd; }
        .ainp-action:disabled { opacity:.5; cursor:default; }
        .ainp-action-icon { font-size:13px; width:18px; text-align:center; flex-shrink:0; }
        .ainp-action-spin { margin-left:auto; width:11px; height:11px; border-radius:50%; border:1.5px solid rgba(167,139,250,.3); border-top-color:#a78bfa; animation:ainp-spin .6s linear infinite; flex-shrink:0; }

        .ainp-result-wrap { border-top:1px solid rgba(255,255,255,.05); padding:10px 14px 14px; }
        .ainp-tabs { display:flex; gap:4px; margin-bottom:8px; }
        .ainp-tab { padding:2px 9px; border-radius:5px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.04); color:rgba(255,255,255,.35); font-size:9.5px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .14s; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:90px; }
        .ainp-tab.active { background:rgba(124,58,237,.25); border-color:rgba(139,92,246,.38); color:#a78bfa; }
        .ainp-result-label { font-size:9px; font-weight:700; color:rgba(139,92,246,.7); text-transform:uppercase; letter-spacing:.1em; margin-bottom:6px; }
        .ainp-result-text { font-family:'DM Serif Display',Georgia,serif; font-style:italic; font-size:12px; color:rgba(255,255,255,.78); line-height:1.7; max-height:130px; overflow-y:auto; animation:ainp-txt .28s ease both; }
        .ainp-cursor { display:inline-block; width:2px; height:12px; background:#a78bfa; margin-left:2px; vertical-align:middle; animation:ainp-blink .7s step-end infinite; }
        .ainp-result-acts { display:flex; gap:5px; margin-top:9px; padding-top:8px; border-top:1px solid rgba(255,255,255,.05); }
        .ainp-result-btn { display:inline-flex; align-items:center; gap:4px; padding:4px 9px; border-radius:5px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.04); color:rgba(255,255,255,.35); font-size:10.5px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .13s; }
        .ainp-result-btn:hover { background:rgba(124,58,237,.2); border-color:rgba(139,92,246,.35); color:#c4b5fd; }
      `}</style>

      <div className="ainp-wrap">
        {open ? (
          <div className="ainp-panel">
            <div className="ainp-ambient"/>
            <div className="ainp-noise"/>
            <div className="ainp-inner">
              <div className="ainp-head">
                <div className="ainp-head-orb">
                  <div className="ainp-head-ring"/>
                  <div className="ainp-head-pulse"/>
                  <div className="ainp-head-core"/>
                </div>
                <div className="ainp-head-label">AI Insights</div>
                <button className="ainp-close" onClick={()=>setOpen(false)}>×</button>
              </div>

              <div className="ainp-picker-wrap">
                <div className="ainp-picker-label">Check-in for</div>
                <select className="ainp-picker" value={selectedEmployee} onChange={e=>setSelectedEmployee(e.target.value)}>
                  {team.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div className="ainp-actions">
                {actions.map(a=>(
                  <button key={a.label} onClick={()=>runAction(a.label,a.prompt)} disabled={loading} className={`ainp-action${activeAction===a.label?" active":""}`}>
                    <span className="ainp-action-icon">{a.icon}</span>
                    {a.label}
                    {activeAction===a.label&&loading&&<div className="ainp-action-spin"/>}
                  </button>
                ))}
              </div>

              {history.length>0&&(
                <div className="ainp-result-wrap">
                  {history.length>1&&(
                    <div className="ainp-tabs">
                      {history.map((h,i)=>(
                        <button key={i} onClick={()=>setActiveTab(i)} className={`ainp-tab${activeTab===i?" active":""}`}>{h.label}</button>
                      ))}
                    </div>
                  )}
                  <div className="ainp-result-label">{history[activeTab]?.label}</div>
                  <div className="ainp-result-text">
                    {currentText}
                    {stillTyping&&<span className="ainp-cursor"/>}
                  </div>
                  <div className="ainp-result-acts">
                    <button className="ainp-result-btn" onClick={()=>{navigator.clipboard.writeText(history[activeTab]?.content??"");toast("Copied");}}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="8" height="8" rx="1.5"/><path d="M2 10V3a1 1 0 011-1h7"/></svg>Copy
                    </button>
                    <button className="ainp-result-btn" onClick={()=>toast("Sent to Slack")}>
                      <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 1l12 6-12 6V8.5l8-1.5-8-1.5z"/></svg>Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button className="ainp-bar" onClick={()=>setOpen(true)}>
            <div className="ainp-bar-orb">
              <div className="ainp-bar-ring"/>
              <div className="ainp-bar-core"/>
            </div>
            <span className="ainp-bar-label">AI Insights</span>
            <span className="ainp-bar-chip">3 actions</span>
          </button>
        )}
      </div>
    </>
  );
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function ManagerProgress({ toast }: ProgressPanelProps) {
  const [expandedRow, setExpandedRow] = useState<string|null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(()=>{setMounted(true);},[]);

  const onTrack = MOCK_TEAM.filter(m=>m.assignments.every(a=>a.status!=="At Risk"&&a.status!=="Needs Attention")).length;
  const needsAttention = MOCK_TEAM.filter(m=>m.assignments.some(a=>a.status==="Needs Attention"||a.status==="At Risk")).length;
  const stats = [{label:"Team Members",value:MOCK_TEAM.length},{label:"On Track",value:onTrack},{label:"Needs Attention",value:needsAttention}];

  return (
    <>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes expandDown{from{opacity:0;max-height:0}to{opacity:1;max-height:1000px}}
        .mgr-prog-root{font-family:'DM Sans',sans-serif;display:flex;flex-direction:column;height:100%;padding-bottom:56px;}
        .mgr-row{display:grid;grid-template-columns:1fr 1fr 100px 140px 110px 120px 28px;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background .14s;}
        .mgr-row:hover{background:rgba(124,58,237,0.025);}
        .mgr-row.expanded{background:rgba(124,58,237,0.03);}
        .mgr-col-hd{font-size:9.5px;font-weight:700;color:var(--t3);letter-spacing:.1em;text-transform:uppercase;}
        .mgr-chevron{width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:var(--surface2);color:var(--t3);transition:all .22s cubic-bezier(.34,1.56,.64,1);flex-shrink:0;}
        .mgr-chevron.open{transform:rotate(180deg);background:var(--purple-lt);color:var(--purple);}
        .mgr-accordion{overflow:hidden;animation:expandDown .22s ease both;border-bottom:1px solid var(--border);background:rgba(124,58,237,0.015);}
        .mgr-stat-strip{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--border);flex-shrink:0;}
        .mgr-stat-cell{padding:14px 22px;border-right:1px solid var(--border);animation:fadeUp .3s ease both;}
        .mgr-stat-cell:last-child{border-right:none;}
        .mgr-stat-num{font-family:'DM Serif Display',Georgia,serif;font-size:30px;font-weight:400;color:var(--t1);line-height:1;}
        .mgr-stat-label{font-size:9.5px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:.09em;margin-top:3px;}
        .chapter-check{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(124,58,237,0.04);font-size:11.5px;color:var(--t2);}
        .chapter-check:last-child{border-bottom:none;}
      `}</style>

      <div className="mgr-prog-root">
        {/* Page Header */}
        <div style={{ padding:"28px 20px 16px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:20 }}>
            <div>
              <h1 style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:28, fontWeight:400, color:"#0f172a", margin:0, letterSpacing:"-.03em", lineHeight:1.1 }}>My Team's Progress</h1>
              <p style={{ margin:"5px 0 0", fontSize:13, color:"#64748b" }}>Track assignments, completions, and engagement across your team.</p>
            </div>
            <button onClick={()=>setAssignModalOpen(true)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:7,border:"none",background:"var(--purple)",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 2px 10px rgba(124,58,237,0.25)"}}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v5M4.5 7h5"/></svg>+ Assign Course
            </button>
          </div>
          <ManagerAIOverview team={MOCK_TEAM} toast={toast} />
        </div>

        <div className="mgr-stat-strip">
          {stats.map((s,i)=>(
            <div key={s.label} className="mgr-stat-cell" style={{animationDelay:`${i*60}ms`}}>
              <div className="mgr-stat-num">{s.value}</div>
              <div className="mgr-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{flex:1,overflowY:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 100px 140px 110px 120px 28px",gap:10,padding:"9px 16px",borderBottom:"2px solid var(--border)",background:"var(--surface2)",position:"sticky",top:0,zIndex:2}}>
            {["Employee","Course","Started","Progress","Last Active","Status",""].map(h=><span key={h} className="mgr-col-hd">{h}</span>)}
          </div>

          {MOCK_TEAM.map((member,mIdx)=>(
            <div key={member.id} style={{animation:`fadeUp .28s ease both`,animationDelay:`${mIdx*50}ms`}}>
              <div style={{padding:"7px 16px 4px",borderBottom:"1px solid rgba(124,58,237,0.05)",display:"flex",alignItems:"center",gap:8,background:"rgba(124,58,237,0.015)"}}>
                <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,var(--purple-lt),var(--surface2))",border:"1.5px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"var(--purple)"}}>{member.avatar}</div>
                <span style={{fontSize:11.5,fontWeight:700,color:"var(--t1)"}}>{member.name}</span>
                <span style={{fontSize:10.5,color:"var(--t3)"}}>{member.role}</span>
              </div>
              {member.assignments.map(asgn=>{
                const rowKey=`${member.id}--${asgn.id}`;
                const isExpanded=expandedRow===rowKey;
                return (
                  <div key={asgn.id}>
                    <div className={`mgr-row${isExpanded?" expanded":""}`} onClick={()=>setExpandedRow(isExpanded?null:rowKey)}>
                      <span style={{fontSize:11.5,color:"var(--t3)",fontStyle:"italic"}}>{member.name}</span>
                      <span style={{fontSize:12,fontWeight:600,color:"var(--t1)"}}>{asgn.name}</span>
                      <span style={{fontSize:11.5,color:"var(--t2)"}}>{asgn.started}</span>
                      <ProgressBar value={asgn.progress}/>
                      <span style={{fontSize:11.5,color:"var(--t2)"}}>{asgn.lastActive}</span>
                      <StatusBadge status={asgn.status}/>
                      <div className={`mgr-chevron${isExpanded?" open":""}`}><svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4l4 4 4-4"/></svg></div>
                    </div>
                    {isExpanded&&(
                      <div className="mgr-accordion">
                        <div style={{padding:"8px 16px 12px 40px"}}>
                          <div style={{fontSize:9.5,fontWeight:700,color:"var(--t3)",textTransform:"uppercase",letterSpacing:".08em",marginBottom:6}}>
                            Chapters — {asgn.chapters.filter(c=>c.done).length}/{asgn.chapters.length} Completed
                          </div>
                          {asgn.chapters.map((ch,i)=>(
                            <div key={i} className="chapter-check">
                              {ch.done?<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--teal)" strokeWidth="2"><circle cx="8" cy="8" r="6"/><path d="M5 8l2 2 4-4"/></svg>:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--t4)" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/></svg>}
                              <span style={{color:ch.done?"var(--t2)":"var(--t3)"}}>{ch.title}</span>
                              {!ch.done&&<span style={{marginLeft:"auto",fontSize:9.5,color:"var(--t4)",fontWeight:500}}>Not started</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <AINudgePanel team={MOCK_TEAM} toast={toast}/>

      {assignModalOpen&&(
        <div style={{position:"fixed",inset:0,background:"rgba(20,10,40,0.4)",backdropFilter:"blur(6px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setAssignModalOpen(false)}>
          <div style={{background:"var(--surface)",borderRadius:14,width:420,padding:24,boxShadow:"0 20px 60px rgba(20,10,40,0.2)",animation:"fadeUp .22s ease both"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:15,fontWeight:700,color:"var(--t1)",marginBottom:4}}>Assign a Course</div>
            <p style={{fontSize:12,color:"var(--t3)",marginBottom:16}}>Select a team member and course to assign.</p>
            <button onClick={()=>{setAssignModalOpen(false);toast("Course assigned successfully");}} style={{width:"100%",padding:"9px",borderRadius:8,border:"none",background:"var(--purple)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>Assign (Demo)</button>
          </div>
        </div>
      )}
    </>
  );
}
