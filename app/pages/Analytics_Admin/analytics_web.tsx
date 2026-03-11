'use client';

// ─────────────────────────────────────────────
//  analytics_web.tsx
//  Ticket Analytics — GeniéX CRM
//  Design & layout only — all logic in analytics_func.ts
// ─────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef, CSSProperties } from 'react';
import {
  Period,
  KpiData,
  TeamEntry,
  CategoryEntry,
  ClientEntry,
  BacklogData,
  TrendData,
  InsightData,
  AnalyticsPayload,
  buildAnalyticsData,
  buildDonutArcs,
  exportReport,
  getDefaultCustomRange,
  validateCustomRange,
  parseCustomRange,
  getKpiAccent,
  getKpiDeltaStyle,
  getTeamAccent,
  getTeamBg,
  buildBacklogStatItems,
  buildTrendChartPoints,
  getTeamSharePct,
  getTeamBarWidthPct,
  getCategoryBarWidthPct,
} from './analytics_func';
import Header from "../Header_Web/header";
import Sidebar from "../Sidebar_Web/sidebar";

// ── Layout constants ──────────────────────────
const HEADER_H = 52;

// ── Design tokens ─────────────────────────────
const C = {
  purple:   '#7c3aed',
  purpleD:  '#5b21b6',
  purpleLt: '#ede9fe',
  teal:     '#0d9488',
  amber:    '#d97706',
  red:      '#dc2626',
  green:    '#16a34a',
  t1:       '#18103a',
  t2:       '#4a3870',
  t3:       '#8e7ec0',
  t4:       '#b8aed8',
  surface:  '#ffffff',
  surface2: '#f2f0fb',
  border:   'rgba(124,58,237,0.1)',
  borderMd: 'rgba(124,58,237,0.22)',
};

const font      = "'DM Sans', sans-serif";
const serifFont = "'DM Serif Display', serif";

// ── Global CSS for page shell transition ──────
const ANALYTICS_CSS = `
  .an-page-shell {
    position:   fixed;
    top:        ${HEADER_H}px;
    left:       var(--gxh-sw, 220px);
    right:      0;
    bottom:     0;
    transition: left 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: ${font};
    color:      #18103a;
    background: #f8f7ff;
    display:    flex;
    flex-direction: column;
    overflow:   hidden;
  }
`;

// ── Shared style snippets ─────────────────────
const card: CSSProperties = {
  background:   C.surface,
  border:       `1px solid ${C.border}`,
  borderRadius: 14,
  padding:      '20px 20px 16px',
};

const summaryBlock: CSSProperties = {
  background:   C.surface2,
  borderRadius: 10,
  padding:      '12px 14px',
  marginTop:    14,
};

const summaryTitle: CSSProperties = {
  fontSize:      9.5,
  fontWeight:    700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color:         C.t3,
  marginBottom:  6,
};

const summaryText: CSSProperties = {
  fontSize:   11.5,
  color:      C.t2,
  lineHeight: 1.65,
};

const badgePill: CSSProperties = {
  fontSize:      9,
  fontWeight:    700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  padding:       '4px 10px',
  borderRadius:  20,
  background:    C.surface2,
  border:        `1px solid ${C.border}`,
  color:         C.t3,
  whiteSpace:    'nowrap' as const,
};

// ══════════════════════════════════════════════
//  PeriodBar
// ══════════════════════════════════════════════
interface PeriodBarProps {
  period:   Period;
  onPeriod: (p: Period, from?: Date, to?: Date) => void;
  onExport: () => void;
}

function PeriodBar({ period, onPeriod, onExport }: PeriodBarProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setShowCustom(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleCustom = () => {
    if (!showCustom) {
      const { dateFrom: df, dateTo: dt } = getDefaultCustomRange();
      setDateFrom(df);
      setDateTo(dt);
    }
    setShowCustom(s => !s);
  };

  const applyCustom = () => {
    const error = validateCustomRange(dateFrom, dateTo);
    if (error) { alert(error); return; }
    const { from, to } = parseCustomRange(dateFrom, dateTo);
    onPeriod('custom', from, to);
    setShowCustom(false);
  };

  const chipStyle = (active: boolean): CSSProperties => ({
    display:      'inline-flex',
    alignItems:   'center',
    gap:          4,
    padding:      '5px 14px',
    borderRadius: 20,
    fontSize:     11.5,
    fontWeight:   600,
    border:       active ? `1.5px solid ${C.purple}` : '1.5px solid rgba(124,58,237,0.16)',
    background:   active ? C.purple : '#fff',
    color:        active ? '#fff' : C.t2,
    cursor:       'pointer',
    fontFamily:   font,
    boxShadow:    active ? '0 2px 10px rgba(124,58,237,0.3)' : 'none',
    transition:   'all .14s',
    userSelect:   'none' as const,
  });

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'week',    label: '7D'  },
    { key: 'month',   label: '30D' },
    { key: 'quarter', label: '90D' },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap relative">
      <span className="text-[11px] font-bold tracking-widest uppercase mr-1" style={{ color: C.t3 }}>
        PERIOD
      </span>

      {PERIODS.map(({ key, label }) => (
        <button key={key} onClick={() => onPeriod(key)} style={chipStyle(period === key)}>
          {label}
        </button>
      ))}

      <div ref={dropRef} className="relative">
        <button onClick={toggleCustom} style={chipStyle(period === 'custom')}>
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="1.5" y="2.5" width="11" height="10" rx="1.5"/>
            <path d="M1.5 6h11M4.5 1v3M9.5 1v3"/>
          </svg>
          Custom
          <svg
            width="9" height="9" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: showCustom ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
          >
            <path d="M1 1l4 4 4-4"/>
          </svg>
        </button>

        {showCustom && (
          <div
            className="absolute right-0 z-50 bg-white rounded-2xl"
            style={{
              top:       'calc(100% + 8px)',
              padding:   '16px 20px',
              border:    `1.5px solid ${C.borderMd}`,
              boxShadow: '0 8px 30px rgba(124,58,237,0.14)',
              minWidth:  420,
            }}
          >
            <div className="flex items-end gap-3">
              {[
                { lbl: 'From', val: dateFrom, set: setDateFrom },
                { lbl: 'To',   val: dateTo,   set: setDateTo   },
              ].map(({ lbl, val, set }) => (
                <div key={lbl} className="flex flex-col gap-1.5" style={{ flex: '1 1 0' }}>
                  <label
                    className="text-[8.5px] font-bold tracking-widest uppercase"
                    style={{ color: C.t3 }}
                  >
                    {lbl}
                  </label>
                  <input
                    type="date"
                    value={val}
                    onChange={e => set(e.target.value)}
                    className="rounded-[7px] text-[11.5px] outline-none w-full"
                    style={{
                      padding:    '6px 10px',
                      border:     `1px solid ${C.border}`,
                      fontFamily: font,
                      color:      C.t1,
                      background: C.surface2,
                      boxSizing:  'border-box',
                    }}
                  />
                </div>
              ))}

              <span
                className="text-sm font-semibold shrink-0"
                style={{ color: C.t4, paddingBottom: 8, lineHeight: 1 }}
              >
                →
              </span>

              <button
                onClick={applyCustom}
                className="shrink-0 rounded-full text-[11px] font-bold text-white cursor-pointer border-none"
                style={{
                  padding:      '7px 18px',
                  background:   C.purple,
                  fontFamily:   font,
                  whiteSpace:   'nowrap',
                  marginBottom: 1,
                }}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onExport}
        className="inline-flex items-center gap-1.5 rounded-lg text-[11.5px] font-semibold text-white border-none cursor-pointer ml-1"
        style={{
          padding:    '7px 16px',
          background: 'linear-gradient(135deg,#7c3aed,#0d9488)',
          boxShadow:  '0 2px 10px rgba(124,58,237,0.28)',
          fontFamily: font,
        }}
      >
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12">
          <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2"/>
        </svg>
        Export Report
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════
//  KpiCard
// ══════════════════════════════════════════════
function KpiCard({ kpi }: { kpi: KpiData }) {
  const accent = getKpiAccent(kpi.cls);
  const { bg: deltaBg, color: deltaColor } = getKpiDeltaStyle(kpi.dir);

  return (
    <div
      className="relative overflow-hidden cursor-default rounded-[14px]"
      style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '20px 20px 16px' }}
    >
      <div
        className="absolute -top-10 -right-10 w-27.5 h-27.5 rounded-full opacity-[0.06] pointer-events-none"
        style={{ background: accent }}
      />

      <div className="text-[9.5px] font-bold tracking-widest uppercase mb-3" style={{ color: C.t3 }}>
        {kpi.label}
      </div>

      <div className="flex items-end gap-2 mb-3">
        <div className="text-[32px] font-extrabold leading-none tracking-tight" style={{ color: accent }}>
          {kpi.num}
        </div>
        {kpi.unit && (
          <div className="text-[12px] font-semibold pb-1" style={{ color: C.t3 }}>{kpi.unit}</div>
        )}
      </div>

      <div
        className="inline-flex items-center gap-0.75 text-[10px] font-bold px-2 py-0.75 rounded-full mb-2"
        style={{ background: deltaBg, color: deltaColor }}
      >
        {kpi.dir === 'up' ? '▲' : '▼'} {kpi.delta}
      </div>

      <div className="text-[10.5px] mb-3" style={{ color: C.t3 }}>{kpi.sub}</div>

      <div className="h-0.75 rounded-sm overflow-hidden" style={{ background: C.surface2 }}>
        <div
          className="h-full rounded-sm transition-[width] duration-700 ease-in-out"
          style={{ background: accent, width: `${kpi.bar}%` }}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  InsightBanner
// ══════════════════════════════════════════════
const FINDING_STYLES: Record<string, CSSProperties> = {
  warn: { background: 'rgba(217,119,6,0.08)',  border: '1px solid rgba(217,119,6,0.25)',  color: '#92400e' },
  crit: { background: 'rgba(220,38,38,0.08)',  border: '1px solid rgba(220,38,38,0.22)',  color: '#7f1d1d' },
  good: { background: 'rgba(22,163,74,0.08)',  border: '1px solid rgba(22,163,74,0.22)',  color: '#14532d' },
  info: { background: 'rgba(2,132,199,0.08)',  border: '1px solid rgba(2,132,199,0.22)',  color: '#075985' },
};

function InsightBanner({ insight }: { insight: InsightData }) {
  return (
    <div
      className="flex items-start gap-4 rounded-[14px] shrink-0"
      style={{
        padding:    '16px 20px',
        background: 'linear-gradient(135deg,rgba(124,58,237,0.07),rgba(13,148,136,0.05))',
        border:     '1px solid rgba(124,58,237,0.18)',
      }}
    >
      <div
        className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center mt-0.5"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 3px 10px rgba(124,58,237,0.3)' }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6">
          <circle cx="9" cy="9" r="6.5"/>
          <path d="M6.5 9h5M9 6.5v5"/>
          <path d="M9 3v1M9 14v1M3 9H2M16 9h-1M4.4 4.4l.7.7M12.9 12.9l.7.7M4.4 13.6l.7-.7M12.9 5.1l.7-.7"/>
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[12px] font-bold" style={{ color: C.t1 }}>AI Summary &amp; Key Findings</span>
          <span
            className="text-[8.5px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
            style={{ background: C.purpleLt, color: C.purpleD }}
          >
            Auto-generated
          </span>
        </div>

        <div className="text-[11.5px] leading-relaxed mb-3" style={{ color: C.t2 }}>
          {insight.text}
        </div>

        <div className="flex gap-2 flex-wrap">
          {insight.findings.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 text-[10.5px] font-semibold rounded-full"
              style={{ ...FINDING_STYLES[f.cls], padding: '6px 14px' }}
            >
              {f.icon} {f.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  TrendChart
// ══════════════════════════════════════════════
function TrendChart({ trend }: { trend: TrendData }) {
  const { mkPts, mkArea, gridYs, W, H } = buildTrendChartPoints(trend);

  return (
    <div style={card}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[12.5px] font-bold mb-0.5" style={{ color: C.t1 }}>Ticket Volume Trend</div>
          <div className="text-[10px]" style={{ color: C.t3 }}>Daily new &amp; closed tickets — last {trend.days} days</div>
        </div>
        <span style={badgePill}>{trend.badge}</span>
      </div>

      <div className="relative" style={{ height: 120 }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {gridYs.map((y, i) => (
            <line key={i} x1="0" y1={y} x2={W} y2={y} stroke="rgba(124,58,237,0.07)" strokeWidth="1"/>
          ))}
          <line x1="0" y1={H} x2={W} y2={H} stroke="rgba(124,58,237,0.1)" strokeWidth="1"/>
          <path d={mkArea(trend.resolved)}   fill="#16a34a" fillOpacity="0.07"/>
          <path d={mkArea(trend.newTickets)} fill="#7c3aed" fillOpacity="0.07"/>
          <polyline points={mkPts(trend.resolved)}   fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points={mkPts(trend.newTickets)} fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points={mkPts(trend.critical)}   fill="none" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2"/>
        </svg>
      </div>

      <div className="flex gap-4 flex-wrap mt-3">
        {[['#7c3aed','New'],['#16a34a','Resolved'],['#dc2626','Critical']].map(([col,lbl]) => (
          <div key={lbl} className="flex items-center gap-1.5 text-[10px]" style={{ color: C.t2 }}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: col }}/>
            {lbl}
          </div>
        ))}
      </div>

      <div style={summaryBlock}>
        <div style={summaryTitle}>📊 Trend Summary</div>
        <div style={summaryText}>{trend.summary}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  TeamsChart
// ══════════════════════════════════════════════
function TeamCard({ team, totalTix, maxTix }: { team: TeamEntry; totalTix: number; maxTix: number }) {
  const accent = getTeamAccent(team.cls);
  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        padding:    '13px 16px 13px 20px',
        border:     `1px solid ${C.border}`,
        background: getTeamBg(team.cls),
      }}
    >
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: accent }}/>

      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{ background: team.colorLt }}
        >
          {team.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold leading-tight" style={{ color: C.t1 }}>{team.name}</div>
          <div className="text-[9.5px] mt-0.5" style={{ color: C.t3 }}>{team.desc}</div>
        </div>
        <div className="flex gap-4 shrink-0">
          {[
            { n: team.tickets,         l: 'Total',  col: accent  },
            { n: team.open,            l: 'Open',   col: C.red   },
            { n: `${team.closeRate}%`, l: 'Closed', col: C.green },
          ].map(({ n, l, col }) => (
            <div key={l} className="text-center">
              <div className="text-[15px] font-extrabold leading-none tracking-tight" style={{ color: col }}>{n}</div>
              <div className="text-[8.5px] font-semibold mt-1" style={{ color: C.t3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.75 rounded overflow-hidden" style={{ background: C.surface2 }}>
          <div
            className="h-full rounded transition-[width] duration-700 ease-in-out"
            style={{ background: accent, width: `${getTeamBarWidthPct(team.tickets, maxTix)}%` }}
          />
        </div>
        <div className="text-[10px] font-bold shrink-0" style={{ color: C.t2, minWidth: 32, textAlign: 'right' }}>
          {getTeamSharePct(team.tickets, totalTix)}%
        </div>
      </div>
    </div>
  );
}

function TeamsChart({ teams, totalTix, summary }: { teams: TeamEntry[]; totalTix: number; summary: string }) {
  const maxTix = Math.max(...teams.map(t => t.tickets));
  return (
    <div className="flex flex-col" style={card}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[12.5px] font-bold mb-0.5" style={{ color: C.t1 }}>Tickets by Product Team</div>
          <div className="text-[10px]" style={{ color: C.t3 }}>Volume split across support teams</div>
        </div>
        <span style={badgePill}>3 Teams</span>
      </div>
      <div className="flex flex-col gap-3">
        {teams.map(t => <TeamCard key={t.id} team={t} totalTix={totalTix} maxTix={maxTix}/>)}
      </div>
      <div style={summaryBlock}>
        <div style={summaryTitle}>👥 Team Findings</div>
        <div style={summaryText}>{summary}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  CategoryChart
// ══════════════════════════════════════════════
function CategoryChart({ categories, catTotal, catSummary }: { categories: CategoryEntry[]; catTotal: number; catSummary: string }) {
  return (
    <div className="flex flex-col" style={card}>
      <div className="mb-4">
        <div className="text-[12.5px] font-bold mb-0.5" style={{ color: C.t1 }}>Tickets by Category</div>
        <div className="text-[10px]" style={{ color: C.t3 }}>Volume &amp; week-over-week change</div>
      </div>
      <div>
        {categories.map((c, idx) => (
          <div
            key={c.label}
            className="flex items-center"
            style={{
              gap:          0,
              padding:      '5px 0',
              borderBottom: idx < categories.length - 1 ? `1px solid ${C.border}` : 'none',
            }}
          >
            <div className="rounded-[3px] shrink-0" style={{ width: 11, height: 11, background: c.color, marginRight: 12 }}/>
            <div className="font-medium" style={{ fontSize: 12, color: C.t1, flex: '1 1 0', minWidth: 0, paddingRight: 14 }}>
              {c.label}
            </div>
            <div className="rounded overflow-hidden shrink-0" style={{ width: 96, height: 6, background: C.surface2, marginRight: 14 }}>
              <div className="h-full rounded opacity-75" style={{ background: c.color, width: `${getCategoryBarWidthPct(c.n, catTotal)}%` }}/>
            </div>
            <div className="font-bold text-right shrink-0" style={{ fontSize: 12.5, color: C.t1, width: 26, marginRight: 12 }}>
              {c.n}
            </div>
            <div className="font-semibold text-right shrink-0" style={{ fontSize: 10.5, color: c.dir === 'up' ? C.red : c.dir === 'dn' ? C.green : C.t3, width: 54 }}>
              {c.change > 0 ? `▲ +${c.change}%` : c.change < 0 ? `▼ ${c.change}%` : '—'}
            </div>
          </div>
        ))}
      </div>
      <div style={summaryBlock}>
        <div style={summaryTitle}>🔍 Category Findings</div>
        <div style={summaryText}>{catSummary}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  ClientDonut
// ══════════════════════════════════════════════
function ClientDonut({ clients, totalTix, clientSummary }: { clients: ClientEntry[]; totalTix: number; clientSummary: string }) {
  const r = 38, cx = 50, cy = 50;
  const arcs = buildDonutArcs(clients, r);
  return (
    <div className="flex flex-col" style={card}>
      <div className="mb-4">
        <div className="text-[12.5px] font-bold mb-0.5" style={{ color: C.t1 }}>Tickets by Client</div>
        <div className="text-[10px]" style={{ color: C.t3 }}>Share of total volume</div>
      </div>

      <div className="flex items-center gap-5">
        <svg viewBox="0 0 100 100" width="112" className="shrink-0">
          {arcs.map((a, i) => (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none" stroke={a.color} strokeWidth="18"
              strokeDasharray={`${a.arc} ${a.gap}`}
              strokeDashoffset={a.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          ))}
          <circle cx={cx} cy={cy} r="27" fill="white"/>
          <text x={cx} y={cy - 5} textAnchor="middle" fontSize="9" fill={C.t1} fontWeight="800">Total</text>
          <text x={cx} y={cy + 9} textAnchor="middle" fontSize="13" fill={C.purple} fontWeight="800">{totalTix}</text>
        </svg>

        <div className="flex-1 flex flex-col gap-2">
          {clients.map(cl => (
            <div key={cl.label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-xs shrink-0" style={{ background: cl.color }}/>
              <div className="text-[11px] font-medium flex-1" style={{ color: C.t2 }}>{cl.label}</div>
              <div className="w-14 h-1 rounded overflow-hidden" style={{ background: C.surface2 }}>
                <div className="h-full rounded" style={{ background: cl.color, width: `${cl.pct}%` }}/>
              </div>
              <div className="text-[11px] font-bold text-right" style={{ color: C.t1, minWidth: 34 }}>{cl.pct}%</div>
            </div>
          ))}
        </div>
      </div>

      <div style={summaryBlock}>
        <div style={summaryTitle}>🏢 Client Findings</div>
        <div style={summaryText}>{clientSummary}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  BacklogHealth
// ══════════════════════════════════════════════
function BacklogHealth({ backlog }: { backlog: BacklogData }) {
  const items = buildBacklogStatItems(backlog);
  return (
    <div className="flex flex-col" style={card}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[12.5px] font-bold mb-0.5" style={{ color: C.t1 }}>Backlog Health</div>
          <div className="text-[10px]" style={{ color: C.t3 }}>Open ticket age &amp; risk breakdown</div>
        </div>
        <span style={badgePill}>Live</span>
      </div>

      <div className="flex gap-2.5 mb-3">
        {items.map(({ n, label, sub, bg, bdr, col }) => (
          <div
            key={label}
            className="flex-1 rounded-[10px] text-center"
            style={{ padding: '12px 8px', background: bg, border: `1px solid ${bdr}` }}
          >
            <div className="text-[26px] font-extrabold leading-none tracking-tight" style={{ color: col }}>{n}</div>
            <div className="text-[9px] font-bold tracking-wide uppercase mt-1" style={{ color: C.t3 }}>{label}</div>
            <div className="text-[9px] mt-0.5" style={{ color: C.t3 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="flex h-2 rounded overflow-hidden gap-0.5 mb-1.5">
        {[
          { pct: backlog.freshPct,   col: C.green },
          { pct: backlog.agingPct,   col: C.amber },
          { pct: backlog.overduePct, col: C.red   },
        ].map(({ pct, col }, i) => (
          <div
            key={i}
            className="h-full rounded transition-[width] duration-700 ease-in-out"
            style={{ background: col, width: `${pct}%` }}
          />
        ))}
      </div>

      <div className="flex justify-between text-[9px]" style={{ color: C.t3 }}>
        <span>🟢 {backlog.freshPct}% fresh</span>
        <span>🟡 {backlog.agingPct}% aging</span>
        <span>🔴 {backlog.overduePct}% overdue</span>
      </div>

      <div style={summaryBlock}>
        <div style={summaryTitle}>🩺 Backlog Findings</div>
        <div style={summaryText}>{backlog.summary}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
//  AnalyticsPage — default export
// ══════════════════════════════════════════════
export default function AnalyticsPage() {
  const [period, setPeriodState] = useState<Period>('week');
  const [data,   setData]        = useState<AnalyticsPayload>(() => buildAnalyticsData('week'));

  const handlePeriod = useCallback((p: Period, from?: Date, to?: Date) => {
    setPeriodState(p);
    setData(buildAnalyticsData(p, from, to));
  }, []);

  const handleExport = useCallback(() => exportReport(data), [data]);

  return (
    <>
      {/* Inject transition CSS for the page shell */}
      <style dangerouslySetInnerHTML={{ __html: ANALYTICS_CSS }} />

      <Header />
      <Sidebar />

      {/* Page shell: left tracks --gxh-sw set by Sidebar on collapse/expand */}
      <div className="an-page-shell">
        <div
          className="flex flex-col h-full overflow-hidden"
          style={{ padding: '20px 28px 16px' }}
        >

          <div className="flex items-center gap-3 mb-5 shrink-0">
            <h1
              className="text-[21px] font-normal whitespace-nowrap m-0"
              style={{ fontFamily: serifFont, color: C.t1 }}
            >
              Ticket <em className="italic" style={{ color: C.purple }}>Analytics</em>
            </h1>
            <div
              className="flex-1 h-px"
              style={{ background: 'linear-gradient(to right,rgba(124,58,237,0.15),transparent)' }}
            />
            <PeriodBar period={period} onPeriod={handlePeriod} onExport={handleExport}/>
          </div>

          <div
            className="flex-1 overflow-y-auto flex flex-col min-h-0 pb-2"
            style={{ gap: 14 }}
          >
            <div className="grid grid-cols-2 shrink-0" style={{ gap: 12 }}>
              {data.kpis.map(k => <KpiCard key={k.label} kpi={k}/>)}
            </div>

            <InsightBanner insight={data.insight}/>

            <div className="grid grid-cols-2 shrink-0" style={{ gap: 12 }}>
              <TrendChart trend={data.trend}/>
              <TeamsChart teams={data.teams} totalTix={data.totalTix} summary={data.teamSummary}/>
            </div>

            <div className="grid shrink-0" style={{ gridTemplateColumns: '1.1fr 1fr 1fr', gap: 12 }}>
              <CategoryChart categories={data.categories} catTotal={data.catTotal} catSummary={data.catSummary}/>
              <ClientDonut   clients={data.clients} totalTix={data.totalTix} clientSummary={data.clientSummary}/>
              <BacklogHealth backlog={data.backlog}/>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}