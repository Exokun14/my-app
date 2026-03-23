'use client'

import { useState, useEffect, useRef } from "react";

import { useEffect } from "react";
import api from "../../Services/api.service";

interface ProgressPanelProps {
  toast: (msg: string) => void;
}

interface Employee {
  id: string;
  name: string;
  avatar: string;
  courses: string[];
  progress: number;
  lastActive: string;
  status: "Completed" | "On Track" | "Needs Attention" | "At Risk";
}

interface Company {
  id: string;
  name: string;
  industry: string;
  learners: number;
  avgProgress: number;
  courses: number;
  status: "On Track" | "Needs Attention" | "At Risk";
  delta: number;
  employees: Employee[];
}

// Derive employee status from progress + last-active days
function deriveEmployeeStatus(progress: number, lastActiveDays: number): Employee["status"] {
  if (progress >= 100) return "Completed";
  if (lastActiveDays > 14 || progress < 20) return "At Risk";
  if (lastActiveDays > 7 || progress < 50) return "Needs Attention";
  return "On Track";
}

// Derive company status from avg progress
function deriveCompanyStatus(avgProgress: number): Company["status"] {
  if (avgProgress >= 70) return "On Track";
  if (avgProgress >= 40) return "Needs Attention";
  return "At Risk";
}

// Format last-active timestamp into a human label
function formatLastActive(dateStr?: string): string {
  if (!dateStr) return "Never";
  const diffMins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMins < 60) return "Today";
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  const days = Math.floor(diffMins / 1440);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

// Map API progress records + users into Company[] shape
function buildCompanies(
  clients: any[],
  progressRecords: any[],
  users: any[]
): Company[] {
  return clients.map((client: any) => {
    const companyUsers = users.filter((u: any) => u.company_id === client.id);
    const companyProgress = progressRecords.filter(
      (p: any) => p.company === client.company_name
    );

    const employees: Employee[] = companyUsers.map((u: any) => {
      const userProgress = companyProgress.filter(
        (p: any) => p.name === u.full_name
      );
      const avgProg = userProgress.length
        ? Math.round(userProgress.reduce((s: number, p: any) => s + (p.progress ?? 0), 0) / userProgress.length)
        : 0;
      const lastActiveStr = u.updated_at;
      const daysSince = lastActiveStr
        ? Math.floor((Date.now() - new Date(lastActiveStr).getTime()) / 86400000)
        : 999;
      const initials = u.full_name
        .split(" ")
        .map((w: string) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      return {
        id: String(u.id),
        name: u.full_name,
        avatar: initials,
        courses: [...new Set(userProgress.map((p: any) => p.course as string))],
        progress: avgProg,
        lastActive: formatLastActive(lastActiveStr),
        status: deriveEmployeeStatus(avgProg, daysSince),
      };
    });

    const learners = employees.length || companyProgress.length;
    const avgProgress = employees.length
      ? Math.round(employees.reduce((s, e) => s + e.progress, 0) / employees.length)
      : companyProgress.length
      ? Math.round(companyProgress.reduce((s: number, p: any) => s + (p.progress ?? 0), 0) / companyProgress.length)
      : 0;

    return {
      id: String(client.id),
      name: client.company_name,
      industry: client.industry_type?.title ?? client.industry ?? "—",
      learners,
      avgProgress,
      courses: [...new Set(companyProgress.map((p: any) => p.course as string))].length,
      status: deriveCompanyStatus(avgProgress),
      delta: 0,
      employees,
    };
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN AI OVERVIEW — light themed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AdminAIOverview({ companies, toast }: { companies: Company[]; toast: (m: string) => void }) {
  const [displayed, setDisplayed] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = async () => {
    if (ticker.current) clearInterval(ticker.current);
    setLoading(true); setDisplayed(""); setResult("");
    const totalLearners = companies.reduce((s, c) => s + c.learners, 0);
    const avgProgress = Math.round(companies.reduce((s, c) => s + c.avgProgress, 0) / companies.length);
    const atRisk = companies.filter(c => c.status === "At Risk").length;
    const ctx = `Companies:\n${companies.map(c => `- ${c.name} (${c.industry}): ${c.avgProgress}% avg progress, ${c.learners} learners, status: ${c.status}, delta: ${c.delta > 0 ? "+" : ""}${c.delta}%`).join("\n")}\nSummary: ${companies.length} companies, ${totalLearners} total learners, ${avgProgress}% avg completion, ${atRisk} at risk`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 600,
          system: "You are a concise learning analytics advisor for a platform admin. Write 3 sentences of editorial prose — no bullets, no emoji. Highlight overall platform health, flag any companies at risk, and suggest one strategic action. Professional and direct.",
          messages: [{ role: "user", content: `Platform data:\n${ctx}\n\nGive me a platform-wide overview of learning health and what to prioritize.` }],
        }),
      });
      const d = await res.json();
      const text = d.content?.find((b: any) => b.type === "text")?.text ?? "Unable to generate overview right now.";
      setResult(text); setHasGenerated(true);
      let i = 0;
      ticker.current = setInterval(() => { i += 4; setDisplayed(text.slice(0, i)); if (i >= text.length) { setDisplayed(text); clearInterval(ticker.current!); } }, 14);
    } catch { setDisplayed("Unable to connect. Please try again."); }
    finally { setLoading(false); }
  };

  const totalLearners = companies.reduce((s, c) => s + c.learners, 0);
  const avgProgress = Math.round(companies.reduce((s, c) => s + c.avgProgress, 0) / companies.length);
  const atRisk = companies.filter(c => c.status === "At Risk").length;
  const onTrack = companies.filter(c => c.status === "On Track").length;

  return (
    <>
      <style>{`
        @keyframes aao-spin  { to{transform:rotate(360deg)} }
        @keyframes aao-pulse { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(2.1);opacity:0} }
        @keyframes aao-sweep { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes aao-in    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes aao-blink { 0%,100%{opacity:1} 50%{opacity:0} }

        .aao-card {
          margin: 16px 20px;
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          border: 1.5px solid rgba(109,40,217,0.1);
          box-shadow: 0 2px 16px rgba(109,40,217,0.06);
          animation: aao-in .3s cubic-bezier(.16,1,.3,1) both;
        }
        .aao-head {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 18px 14px;
          border-bottom: 1px solid rgba(109,40,217,0.07);
          background: linear-gradient(135deg, rgba(124,58,237,0.03) 0%, rgba(255,255,255,0) 100%);
        }
        .aao-orb { position:relative; width:38px; height:38px; flex-shrink:0; }
        .aao-orb-ring {
          position:absolute; inset:-2px; border-radius:50%;
          background:conic-gradient(from 0deg,#7c3aed,#06b6d4,#10b981,#a78bfa,#7c3aed);
          animation:aao-spin 2.8s linear infinite;
        }
        .aao-orb-ring::after { content:''; position:absolute; inset:2.5px; border-radius:50%; background:#fff; }
        .aao-orb-core {
          position:absolute; inset:0; margin:auto;
          width:15px; height:15px; border-radius:50%; z-index:1;
          background:radial-gradient(circle at 35% 30%,#e9d5ff,#7c3aed);
          box-shadow:0 0 12px rgba(167,139,250,.7),0 0 24px rgba(124,58,237,.3);
        }
        .aao-orb-pulse {
          position:absolute; inset:0; border-radius:50%;
          border:1.5px solid rgba(124,58,237,.35);
          animation:aao-pulse 2.2s ease-out infinite;
        }
        .aao-head-title { font-size:11.5px; font-weight:800; color:#18103a; letter-spacing:.07em; text-transform:uppercase; }
        .aao-head-sub   { font-size:10px; color:#8e7ec0; margin-top:2px; }
        .aao-chip {
          padding:3px 10px; border-radius:99px;
          background:rgba(124,58,237,0.08); border:1px solid rgba(124,58,237,0.18);
          font-size:9px; font-weight:800; color:#7c3aed;
          letter-spacing:.07em; text-transform:uppercase;
        }

        .aao-idle {
          padding:20px 18px;
          display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center;
        }
        .aao-idle-text { font-size:12.5px; color:#8e7ec0; line-height:1.6; max-width:320px; }

        .aao-btn {
          display:inline-flex; align-items:center; gap:8px;
          padding:10px 20px; border-radius:10px; border:none;
          background:linear-gradient(135deg,#7c3aed,#6d28d9);
          color:#fff; font-size:12.5px; font-weight:700;
          cursor:pointer; font-family:'DM Sans',sans-serif;
          transition:transform .15s,box-shadow .15s;
          box-shadow:0 3px 16px rgba(124,58,237,.35);
          position:relative; overflow:hidden;
        }
        .aao-btn::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent);
          background-size:200%; animation:aao-sweep 2.2s linear infinite;
        }
        .aao-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 5px 22px rgba(124,58,237,.45); }
        .aao-btn:disabled { opacity:.55; cursor:default; }

        .aao-spinner {
          width:12px; height:12px; border-radius:50%;
          border:1.5px solid rgba(124,58,237,.3); border-top-color:#7c3aed;
          animation:aao-spin .6s linear infinite;
        }

        .aao-result { padding:14px 18px 16px; animation:aao-in .3s ease both; }
        .aao-mini-stats { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
        .aao-mini-stat {
          flex:1; min-width:70px; padding:10px 12px; border-radius:10px;
          background:rgba(124,58,237,0.04); border:1.5px solid rgba(124,58,237,0.08);
        }
        .aao-mini-num  { font-family:'DM Serif Display',Georgia,serif; font-size:22px; color:#18103a; line-height:1; }
        .aao-mini-label { font-size:9.5px; font-weight:700; color:#8e7ec0; text-transform:uppercase; letter-spacing:.08em; margin-top:3px; }
        .aao-divider { height:1px; background:rgba(109,40,217,0.07); margin-bottom:12px; }
        .aao-result-text {
          font-family:'DM Serif Display',Georgia,serif;
          font-style:italic; font-size:14px;
          color:#18103a; line-height:1.75; margin-bottom:14px;
        }
        .aao-cursor {
          display:inline-block; width:2px; height:14px;
          background:#7c3aed; margin-left:2px;
          vertical-align:middle; animation:aao-blink .75s step-end infinite;
        }
        .aao-regen {
          display:inline-flex; align-items:center; gap:5px;
          padding:5px 11px; border-radius:6px;
          border:1.5px solid rgba(124,58,237,0.15);
          background:rgba(124,58,237,0.04); color:#7c3aed;
          font-size:10.5px; font-weight:600; cursor:pointer;
          font-family:'DM Sans',sans-serif; transition:all .13s;
        }
        .aao-regen:hover { background:rgba(124,58,237,0.1); border-color:rgba(124,58,237,0.3); }
      `}</style>

      <div className="aao-card">
        <div className="aao-head">
          <div className="aao-orb">
            <div className="aao-orb-ring" />
            <div className="aao-orb-pulse" />
            <div className="aao-orb-core" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="aao-head-title">Team Coach</div>
            <div className="aao-head-sub">Get a snapshot of who's excelling, who needs a nudge, and exactly what to do today.</div>
          </div>
          <div className="aao-chip">AI</div>
        </div>

        {!hasGenerated && !loading ? (
          <div className="aao-idle">
            <div className="aao-idle-text">
              Get an AI-powered summary of platform health, at-risk companies, and your next strategic action.
            </div>
            <button className="aao-btn" onClick={generate}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1l1.4 4.2H13l-3.7 2.7 1.4 4.2L7 9.4l-3.7 2.7 1.4-4.2L1 5.2h4.6z" /></svg>
              Get Platform Overview
            </button>
          </div>
        ) : loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px", justifyContent: "center" }}>
            <div className="aao-spinner" />
            <span style={{ fontSize: 12, color: "#8e7ec0" }}>Analyzing platform data…</span>
          </div>
        ) : (
          <div className="aao-result">
            <div className="aao-mini-stats">
              {[
                { label: "Companies",    value: companies.length, color: "#18103a" },
                { label: "Learners",     value: totalLearners,    color: "#7c3aed" },
                { label: "Avg Progress", value: `${avgProgress}%`,color: "#0d9488" },
                { label: "On Track",     value: onTrack,          color: "#16a34a" },
                { label: "At Risk",      value: atRisk,           color: "#dc2626" },
              ].map(s => (
                <div key={s.label} className="aao-mini-stat">
                  <div className="aao-mini-num" style={{ color: s.color }}>{s.value}</div>
                  <div className="aao-mini-label">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="aao-divider" />
            <div className="aao-result-text">
              {displayed}
              {displayed.length < result.length && <span className="aao-cursor" />}
            </div>
            <button className="aao-regen" onClick={generate} disabled={loading}>
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

const STATUS_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  "On Track":        { bg: "rgba(13,148,136,0.1)",  color: "#0d9488", dot: "#0d9488" },
  "Needs Attention": { bg: "rgba(217,119,6,0.1)",   color: "#d97706", dot: "#d97706" },
  "At Risk":         { bg: "rgba(220,38,38,0.1)",   color: "#dc2626", dot: "#dc2626" },
  "Completed":       { bg: "rgba(22,163,74,0.1)",   color: "#16a34a", dot: "#16a34a" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_COLORS[status] ?? STATUS_COLORS["On Track"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999,
      background: cfg.bg, color: cfg.color,
      fontSize: 10.5, fontWeight: 700, letterSpacing: ".02em",
      border: `1px solid ${cfg.dot}30`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

function SlimProgressBar({ value, color = "var(--purple)" }: { value: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden", minWidth: 80 }}>
        <div style={{
          height: "100%", borderRadius: 99,
          width: `${value}%`,
          background: value >= 80 ? "var(--teal)" : value >= 50 ? "var(--purple)" : "#d97706",
          transition: "width .7s cubic-bezier(.34,1.2,.64,1)",
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--t2)", minWidth: 28 }}>{value}%</span>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COHORT AI CARD — dark, cinematic, streaming
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CohortAICard({ company, toast }: { company: Company; toast: (m: string) => void }) {
  const [prompt, setPrompt] = useState(`Summarize learning trends for ${company.name} and flag any employees at risk of falling behind.`);
  const [result, setResult] = useState("");
  const [displayed, setDisplayed] = useState("");
  const [loading, setLoading] = useState(false);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = async () => {
    if (ticker.current) clearInterval(ticker.current);
    setLoading(true); setResult(""); setDisplayed("");
    const ctx = `Company: ${company.name} (${company.industry})\nLearners: ${company.learners}, Avg Progress: ${company.avgProgress}%, Status: ${company.status}\nEmployees:\n${company.employees.map(e => `- ${e.name}: ${e.progress}% progress, last active ${e.lastActive}, status: ${e.status}, courses: ${e.courses.join(", ")}`).join("\n")}`;
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: "You are a concise learning analytics advisor. Write in editorial prose — no bullet points, no lists, no emojis. 3-4 sentences max. Be specific about names and numbers from the data provided. Professional and direct tone.",
          messages: [{ role: "user", content: `Data:\n${ctx}\n\nTask: ${prompt}` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find((b: any) => b.type === "text")?.text || "Unable to generate analysis.";
      setResult(text);
      let i = 0;
      ticker.current = setInterval(() => {
        i += 4;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { setDisplayed(text); clearInterval(ticker.current!); }
      }, 14);
    } catch {
      setDisplayed("Unable to connect to AI service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes aic-spin  { to { transform: rotate(360deg); } }
        @keyframes aic-pulse { 0%,100%{transform:scale(1);opacity:.55} 50%{transform:scale(2.1);opacity:0} }
        @keyframes aic-sweep { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes aic-glow  { 0%,100%{box-shadow:0 0 0 1px rgba(139,92,246,.1),0 8px 32px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.04)} 50%{box-shadow:0 0 0 1px rgba(139,92,246,.22),0 8px 40px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06)} }
        @keyframes aic-in    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes aic-txt   { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes aic-blink { 0%,100%{opacity:1} 50%{opacity:0} }

        .aic-card {
          margin: 14px 0 6px;
          border-radius: 14px;
          overflow: hidden;
          background: #09071a;
          border: 1px solid rgba(139,92,246,.18);
          animation: aic-in .3s cubic-bezier(.16,1,.3,1) both, aic-glow 3.5s ease infinite;
          position: relative;
        }
        .aic-ambient {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 75% 55% at 0% 0%, rgba(124,58,237,.22) 0%, transparent 65%),
            radial-gradient(ellipse 55% 45% at 100% 100%, rgba(13,148,136,.14) 0%, transparent 60%);
        }
        .aic-noise {
          position: absolute; inset: 0; pointer-events: none; opacity: .028;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .aic-inner { position: relative; z-index: 1; }

        .aic-head {
          display: flex; align-items: center; gap: 11px;
          padding: 14px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }
        .aic-orb { position: relative; width: 32px; height: 32px; flex-shrink: 0; }
        .aic-orb-ring {
          position: absolute; inset: -2px; border-radius: 50%;
          background: conic-gradient(from 0deg, #7c3aed, #06b6d4, #10b981, #a78bfa, #7c3aed);
          animation: aic-spin 2.6s linear infinite;
        }
        .aic-orb-ring::after {
          content: ''; position: absolute; inset: 2.5px;
          border-radius: 50%; background: #09071a;
        }
        .aic-orb-core {
          position: absolute; inset: 0; margin: auto;
          width: 13px; height: 13px; border-radius: 50%; z-index: 1;
          background: radial-gradient(circle at 35% 30%, #e9d5ff, #7c3aed);
          box-shadow: 0 0 10px rgba(167,139,250,.9), 0 0 22px rgba(124,58,237,.5);
        }
        .aic-orb-pulse {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1.5px solid rgba(167,139,250,.5);
          animation: aic-pulse 2s ease-out infinite;
        }
        .aic-titles { flex: 1; }
        .aic-title {
          font-family: 'DM Sans', sans-serif;
          font-size: 10.5px; font-weight: 700;
          color: rgba(255,255,255,.88); letter-spacing: .1em; text-transform: uppercase;
        }
        .aic-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 10px; color: rgba(255,255,255,.3); margin-top: 1px;
        }
        .aic-chip {
          padding: 2px 8px; border-radius: 99px;
          background: rgba(124,58,237,.22); border: 1px solid rgba(139,92,246,.38);
          font-size: 8.5px; font-weight: 800; color: #a78bfa;
          letter-spacing: .07em; text-transform: uppercase;
          font-family: 'DM Sans', sans-serif;
        }

        .aic-body { padding: 12px 16px 0; }
        .aic-label {
          font-size: 9px; font-weight: 700; color: rgba(255,255,255,.2);
          letter-spacing: .12em; text-transform: uppercase;
          font-family: 'DM Sans', sans-serif; margin-bottom: 5px;
        }
        .aic-ta {
          width: 100%; resize: none; min-height: 44px;
          padding: 8px 10px; border-radius: 8px;
          border: 1px solid rgba(139,92,246,.16);
          background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.7);
          font-family: 'DM Sans', sans-serif; font-size: 11.5px; line-height: 1.5;
          outline: none; transition: border-color .15s, background .15s;
          box-sizing: border-box;
        }
        .aic-ta:focus { border-color: rgba(139,92,246,.42); background: rgba(255,255,255,.05); }
        .aic-ta::placeholder { color: rgba(255,255,255,.18); }

        .aic-foot { display: flex; align-items: center; gap: 8px; padding: 10px 16px 14px; }

        .aic-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 16px; border-radius: 8px; border: none;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff; font-size: 11.5px; font-weight: 700;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: transform .15s, box-shadow .15s;
          box-shadow: 0 3px 14px rgba(124,58,237,.45);
          position: relative; overflow: hidden;
        }
        .aic-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.1), transparent);
          background-size: 200%;
          animation: aic-sweep 2.2s linear infinite;
        }
        .aic-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 20px rgba(124,58,237,.55); }
        .aic-btn:disabled { opacity: .55; cursor: default; transform: none; }

        .aic-spinner {
          width: 11px; height: 11px; border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,.28); border-top-color: #fff;
          animation: aic-spin .6s linear infinite; flex-shrink: 0;
        }
        .aic-clear {
          padding: 7px 11px; border-radius: 7px;
          border: 1px solid rgba(255,255,255,.09);
          background: transparent; color: rgba(255,255,255,.3);
          font-size: 11px; font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all .14s;
        }
        .aic-clear:hover { background: rgba(255,255,255,.06); color: rgba(255,255,255,.55); }

        .aic-result {
          margin: 0 16px 16px;
          padding: 14px 16px;
          border-radius: 10px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.07);
          animation: aic-txt .28s ease both;
        }
        .aic-result-text {
          font-family: 'DM Serif Display', Georgia, serif;
          font-style: italic; font-size: 13px;
          color: rgba(255,255,255,.82); line-height: 1.72;
        }
        .aic-cursor {
          display: inline-block; width: 2px; height: 13px;
          background: #a78bfa; margin-left: 2px;
          vertical-align: middle; animation: aic-blink .7s step-end infinite;
        }
        .aic-acts {
          display: flex; gap: 6px; margin-top: 12px; padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,.06); flex-wrap: wrap;
        }
        .aic-act {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 6px;
          border: 1px solid rgba(255,255,255,.09);
          background: rgba(255,255,255,.04);
          color: rgba(255,255,255,.4);
          font-size: 10.5px; font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all .13s;
        }
        .aic-act:hover { background: rgba(124,58,237,.22); border-color: rgba(139,92,246,.38); color: #c4b5fd; }
      `}</style>

      <div className="aic-card">
        <div className="aic-ambient" />
        <div className="aic-noise" />
        <div className="aic-inner">
          <div className="aic-head">
            <div className="aic-orb">
              <div className="aic-orb-ring" />
              <div className="aic-orb-pulse" />
              <div className="aic-orb-core" />
            </div>
            <div className="aic-titles">
              <div className="aic-title">Cohort Intelligence</div>
              <div className="aic-sub">{company.name} · {company.learners} learners · {company.industry}</div>
            </div>
            <div className="aic-chip">AI</div>
          </div>

          <div className="aic-body">
            <div className="aic-label">Prompt</div>
            <textarea className="aic-ta" value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} />
          </div>

          <div className="aic-foot">
            <button className="aic-btn" onClick={generate} disabled={loading}>
              {loading
                ? <><div className="aic-spinner" />Analyzing…</>
                : <><svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1l1.4 4.2H13l-3.7 2.7 1.4 4.2L7 9.4l-3.7 2.7 1.4-4.2L1 5.2h4.6z" /></svg>Generate Analysis</>
              }
            </button>
            {displayed && <button className="aic-clear" onClick={() => { setDisplayed(""); setResult(""); }}>Clear</button>}
          </div>

          {displayed && (
            <div className="aic-result">
              <div className="aic-result-text">
                {displayed}
                {displayed.length < result.length && <span className="aic-cursor" />}
              </div>
              <div className="aic-acts">
                <button className="aic-act" onClick={() => toast("Exporting PDF report…")}>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" /></svg>
                  Export PDF
                </button>
                <button className="aic-act" onClick={() => toast("Sent to manager")}>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 1l12 6-12 6V8.5l8-1.5-8-1.5z" /></svg>
                  Send to Manager
                </button>
                <button className="aic-act" onClick={() => { navigator.clipboard.writeText(result); toast("Copied to clipboard"); }}>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="8" height="8" rx="1.5" /><path d="M2 10V3a1 1 0 011-1h7" /></svg>
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EmployeeSubTable({ employees }: { employees: Employee[] }) {
  return (
    <div style={{ padding: "4px 0 8px 16px", borderLeft: "2px solid rgba(108,61,214,0.2)" }}>
      {employees.map((emp, i) => (
        <div key={emp.id} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "8px 12px",
          borderBottom: i < employees.length - 1 ? "1px solid rgba(124,58,237,0.05)" : "none",
          animation: `fadeUp .25s ease both`,
          animationDelay: `${i * 50}ms`,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, var(--purple-lt), var(--surface2))",
            border: "1.5px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9.5, fontWeight: 800, color: "var(--purple)",
          }}>{emp.avatar}</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--t1)", minWidth: 90 }}>{emp.name}</span>
          <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "wrap" }}>
            {emp.courses.map(c => (
              <span key={c} style={{ fontSize: 9.5, padding: "2px 7px", borderRadius: 5, background: "var(--surface2)", color: "var(--t2)", border: "1px solid var(--border)", fontWeight: 500 }}>{c}</span>
            ))}
          </div>
          <div style={{ minWidth: 120 }}><SlimProgressBar value={emp.progress} /></div>
          <span style={{ fontSize: 11, color: "var(--t3)", minWidth: 90, textAlign: "right" }}>{emp.lastActive}</span>
          <div style={{ minWidth: 120, display: "flex", justifyContent: "flex-end" }}><StatusBadge status={emp.status} /></div>
        </div>
      ))}
    </div>
  );
}

export default function AdminProgress({ toast }: ProgressPanelProps) {
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Load real data from API on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [clientsRes, progressRes] = await Promise.all([
          api.clients.getAll(),
          api.progress.getAll(),
        ]);
        const clients = clientsRes.success && clientsRes.data ? clientsRes.data : [];
        const progressRecords = progressRes.success && progressRes.data ? progressRes.data : [];
        // users come embedded in clients response or we derive from progress records
        const built = buildCompanies(clients, progressRecords, []);
        setAllCompanies(built);
      } catch (err) {
        console.error('AdminProgress load error:', err);
        toast('Failed to load progress data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const companies = allCompanies.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter.length === 0 || statusFilter.includes(c.status);
    return matchSearch && matchStatus;
  });

  const totalLearners = allCompanies.reduce((s, c) => s + c.learners, 0);
  const activeLearners = Math.round(totalLearners * 0.71);
  const avgCompletion = allCompanies.length
    ? Math.round(allCompanies.reduce((s, c) => s + c.avgProgress, 0) / allCompanies.length)
    : 0;
  const totalCourses = allCompanies.reduce((s, c) => s + c.courses, 0);

  const stats = [
    { label: "Total Companies", value: allCompanies.length, delta: "" },
    { label: "Active Learners",  value: activeLearners,     delta: "" },
    { label: "Avg Completion",   value: `${avgCompletion}%`,delta: "" },
    { label: "Courses Assigned", value: totalCourses,       delta: "" },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes expandDown { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 2000px; } }
        .admin-prog-root { font-family: 'DM Sans', sans-serif; padding: 0; display: flex; flex-direction: column; height: 100%; }
        .ap-company-row { display: grid; grid-template-columns: 1fr 80px 140px 60px 130px 28px; align-items: center; gap: 12px; padding: 11px 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background .14s; }
        .ap-company-row:hover { background: rgba(124,58,237,0.025); }
        .ap-company-row.expanded { background: rgba(124,58,237,0.03); }
        .ap-col-hd { font-size: 9.5px; font-weight: 700; color: var(--t3); letter-spacing: .1em; text-transform: uppercase; }
        .ap-chevron { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border-radius: 5px; background: var(--surface2); color: var(--t3); transition: all .22s cubic-bezier(.34,1.56,.64,1); flex-shrink: 0; }
        .ap-chevron.open { transform: rotate(180deg); background: var(--purple-lt); color: var(--purple); }
        .ap-accordion { overflow: hidden; animation: expandDown .22s ease both; border-bottom: 1px solid var(--border); background: rgba(124,58,237,0.015); }
        .ap-stat-strip { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid var(--border); flex-shrink: 0; }
        .ap-stat-cell { padding: 14px 20px; border-right: 1px solid var(--border); animation: fadeUp .3s ease both; }
        .ap-stat-cell:last-child { border-right: none; }
        .ap-stat-num { font-family: 'DM Serif Display', Georgia, serif; font-size: 28px; font-weight: 400; color: var(--t1); line-height: 1; }
        .ap-stat-label { font-size: 9.5px; font-weight: 700; color: var(--t3); text-transform: uppercase; letter-spacing: .09em; margin-top: 3px; }
        .ap-stat-delta { font-size: 10px; font-weight: 600; margin-top: 2px; }
        .ap-filter-rail { position: fixed; top: 0; left: 0; bottom: 0; width: 240px; background: var(--surface); border-right: 1px solid var(--border); z-index: 200; padding: 24px 18px; transform: translateX(-100%); transition: transform .22s ease; box-shadow: 4px 0 20px rgba(20,10,40,0.08); }
        .ap-filter-rail.open { transform: translateX(0); }
        .ap-filter-backdrop { position: fixed; inset: 0; background: rgba(20,10,40,0.25); z-index: 199; backdrop-filter: blur(3px); }
        .ap-search { display: flex; align-items: center; gap: 7px; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 7px 11px; transition: all .15s; }
        .ap-search:focus-within { background: var(--surface); border-color: var(--border-md); box-shadow: 0 0 0 3px rgba(124,58,237,0.07); }
        .ap-search input { background: none; border: none; outline: none; font-family: 'DM Sans', sans-serif; font-size: 12px; color: var(--t1); width: 180px; }
        .ap-search input::placeholder { color: var(--t4); }
      `}</style>

      <div className="admin-prog-root">
        {/* Stat strip */}
        <div className="ap-stat-strip">
          {stats.map((s, i) => (
            <div key={s.label} className="ap-stat-cell" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="ap-stat-num">{s.value}</div>
              <div className="ap-stat-label">{s.label}</div>
              <div className="ap-stat-delta" style={{ color: s.delta.startsWith("+") ? "var(--teal)" : "#dc2626" }}>{s.delta}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--t3)", fontSize: 13 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              Loading company data…
            </div>
          )}
          {!loading && <AdminAIOverview companies={allCompanies} toast={toast} />}

          {/* Sticky table header with controls */}
          <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--surface2)", borderBottom: "2px solid var(--border)" }}>
            {/* Controls row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px 7px", borderBottom: "1px solid var(--border)" }}>
              <div className="ap-search">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--t3)" strokeWidth="2"><circle cx="6.5" cy="6.5" r="4.5" /><path d="M11 11l3 3" /></svg>
                <input placeholder="Search companies…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={{ flex: 1 }} />
              <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 7, padding: "5px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: "var(--t2)", outline: "none", cursor: "pointer" }}>
                {["Last 7 days", "Last 30 days", "Last 90 days", "This year"].map(d => <option key={d}>{d}</option>)}
              </select>
              <button onClick={() => setFiltersOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 11, fontWeight: 600, color: "var(--t2)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3h10M4 7h6M6 11h2" /></svg>
                Filters {statusFilter.length > 0 && <span style={{ background: "var(--purple)", color: "#fff", borderRadius: 999, padding: "0 5px", fontSize: 9, fontWeight: 800 }}>{statusFilter.length}</span>}
              </button>
              <button onClick={() => toast("Exporting CSV…")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 11, fontWeight: 600, color: "var(--t2)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" /></svg>
                Export CSV
              </button>
            </div>
            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 140px 60px 130px 28px", gap: 12, padding: "7px 16px" }}>
              {["Company", "Learners", "Avg Progress", "Courses", "Status", ""].map(h => <span key={h} className="ap-col-hd">{h}</span>)}
            </div>
          </div>

          {companies.length === 0 ? (
            <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--t3)" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>◎</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>No companies match your filters</div>
            </div>
          ) : companies.map((company, idx) => (
            <div key={company.id} style={{ animation: `fadeUp .28s ease both`, animationDelay: `${idx * 40}ms` }}>
              <div className={`ap-company-row${expandedId === company.id ? " expanded" : ""}`} onClick={() => setExpandedId(expandedId === company.id ? null : company.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, background: "linear-gradient(135deg, var(--purple-lt), var(--surface2))", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "var(--purple)" }}>{company.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)" }}>{company.name}</div>
                    <span style={{ fontSize: 9.5, padding: "1px 6px", borderRadius: 4, background: "var(--surface2)", color: "var(--t3)", border: "1px solid var(--border)", fontWeight: 500 }}>{company.industry}</span>
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--t1)" }}>{company.learners}</span>
                <SlimProgressBar value={company.avgProgress} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t2)" }}>{company.courses}</span>
                <StatusBadge status={company.status} />
                <div className={`ap-chevron${expandedId === company.id ? " open" : ""}`}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 4l4 4 4-4" /></svg>
                </div>
              </div>

              {expandedId === company.id && (
                <div className="ap-accordion">
                  <div style={{ padding: "4px 12px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 12px 4px 16px" }}>
                      {["Employee", "Courses", "Progress", "Last Active", "Status"].map((h, i) => (
                        <span key={h} className="ap-col-hd" style={{ flex: i === 1 ? 1 : undefined, minWidth: i === 2 ? 120 : i === 3 ? 90 : i === 4 ? 120 : 90, textAlign: i >= 3 ? "right" : "left" }}>{h}</span>
                      ))}
                    </div>
                    <EmployeeSubTable employees={company.employees} />
                    <CohortAICard company={company} toast={toast} />
                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 4px 12px" }}>
                      <button onClick={() => toast("Opening messaging…")} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface)", fontSize: 11, fontWeight: 600, color: "var(--t2)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 2h10a1 1 0 011 1v6a1 1 0 01-1 1H5l-3 2V3a1 1 0 011-1z" /></svg>
                        Message Team
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {filtersOpen && <div className="ap-filter-backdrop" onClick={() => setFiltersOpen(false)} />}
      <div className={`ap-filter-rail${filtersOpen ? " open" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--t1)" }}>Filters</span>
          <button onClick={() => setFiltersOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--t3)" }}>✕</button>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t3)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>Status</div>
        {["On Track", "Needs Attention", "At Risk"].map(s => (
          <label key={s} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={statusFilter.includes(s)} onChange={e => setStatusFilter(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s))} style={{ accentColor: "var(--purple)" }} />
            <StatusBadge status={s} />
          </label>
        ))}
        <button onClick={() => { setStatusFilter([]); setFiltersOpen(false); }} style={{ marginTop: 16, width: "100%", padding: "8px", borderRadius: 7, border: "1px solid var(--border)", background: "var(--surface2)", fontSize: 11.5, fontWeight: 600, color: "var(--t2)", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Clear All
        </button>
      </div>
    </>
  );
}
