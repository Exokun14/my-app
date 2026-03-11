// ─────────────────────────────────────────────
//  analytics_func.ts
//  All data, types, and computation logic for
//  the Ticket Analytics page (GeniéX CRM)
// ─────────────────────────────────────────────

// ── Types ──────────────────────────────────────

export type Period = 'week' | 'month' | 'quarter' | 'custom';

export interface KpiData {
  label: string;
  num: number | string;
  unit: string;
  delta: string;
  dir: 'up' | 'dn' | 'flat';
  sub: string;
  bar: number; // 0–100
  cls: 'kpi-purple' | 'kpi-green' | 'kpi-red' | 'kpi-amber' | 'kpi-teal';
}

export interface FindingItem {
  cls: 'warn' | 'crit' | 'good' | 'info';
  icon: string;
  label: string;
}

export interface InsightData {
  text: string;
  findings: FindingItem[];
}

export interface TeamEntry {
  id: string;
  name: string;
  icon: string;
  color: string;
  colorLt: string;
  cls: string;
  desc: string;
  tickets: number;
  open: number;
  escalated: number;
  resolved: number;
  closeRate: number;
}

export interface CategoryEntry {
  label: string;
  n: number;
  color: string;
  change: number;
  dir: 'up' | 'dn' | 'flat';
}

export interface ClientEntry {
  label: string;
  pct: number;
  color: string;
}

export interface BacklogData {
  fresh: number;
  aging: number;
  overdue: number;
  total: number;
  freshPct: number;
  agingPct: number;
  overduePct: number;
  summary: string;
}

export interface TrendData {
  newTickets: number[];
  resolved: number[];
  critical: number[];
  totalNew: number;
  totalRes: number;
  backlogDelta: number;
  days: number;
  summary: string;
  badge: string;
}

export interface AnalyticsPayload {
  periodLabel: string;
  totalTix: number;
  openCrit: number;
  avgRes: number;
  closeRate: number;
  escalRate: number;
  kpis: KpiData[];
  insight: InsightData;
  trend: TrendData;
  teams: TeamEntry[];
  teamSummary: string;
  categories: CategoryEntry[];
  catTotal: number;
  catSummary: string;
  clients: ClientEntry[];
  clientSummary: string;
  backlog: BacklogData;
}

// ── Static data ─────────────────────────────────

export const TEAMS_BASE = [
  {
    id: 'retail-pro',
    name: 'Retail Pro',
    icon: '🛍️',
    color: '#7c3aed',
    colorLt: 'rgba(124,58,237,0.12)',
    cls: 'retail-pro',
    desc: 'Retail Pro POS system support',
  },
  {
    id: 'aloha-ncr',
    name: 'Aloha NCR',
    icon: '🍽️',
    color: '#0d9488',
    colorLt: 'rgba(13,148,136,0.12)',
    cls: 'aloha-ncr',
    desc: 'Aloha / NCR restaurant POS support',
  },
  {
    id: 'hardware',
    name: 'Hardware',
    icon: '🔧',
    color: '#d97706',
    colorLt: 'rgba(217,119,6,0.12)',
    cls: 'hardware',
    desc: 'Hardware installation & repair',
  },
] as const;

export const CLIENT_DATA: ClientEntry[] = [
  { label: 'Popeyes',      pct: 38, color: '#0d9488' },
  { label: 'Ace Hardware', pct: 25, color: '#d97706' },
  { label: 'Starbucks',    pct: 16, color: '#7c3aed' },
  { label: 'SM Markets',   pct: 12, color: '#0284c7' },
  { label: 'Others',       pct:  9, color: '#6b7280' },
];

// ── Period helpers ──────────────────────────────

export function getPeriodDays(period: Period, from?: Date, to?: Date): number {
  if (period === 'custom' && from && to) {
    return Math.max(2, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  }
  return period === 'week' ? 7 : period === 'month' ? 30 : 90;
}

export function getPeriodLabel(
  period: Period,
  days: number,
  from?: Date,
  to?: Date,
): string {
  if (period === 'custom' && from && to) {
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(from)} – ${fmt(to)}`;
  }
  return days === 7 ? 'Last 7 days' : days === 30 ? 'Last 30 days' : 'Last 90 days';
}

export function formatCustomChipLabel(from: Date, to: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(from)} – ${fmt(to)}`;
}

// ── Core computation ────────────────────────────

export function buildAnalyticsData(
  period: Period,
  customFrom?: Date,
  customTo?: Date,
): AnalyticsPayload {
  const days = getPeriodDays(period, customFrom, customTo);
  const periodLabel = getPeriodLabel(period, days, customFrom, customTo);
  const scale = days / 30;

  const totalTix  = Math.round(412 * scale);
  const openCrit  = Math.round(54 * Math.min(scale, 1.5));
  const avgRes    = parseFloat((3.8 - (days < 10 ? 0.6 : days > 60 ? 0.4 : 0.3)).toFixed(1));
  const closeRate = days < 10 ? 94 : days > 60 ? 97 : 91;
  const escalRate = days < 10 ? 11 : days > 60 ? 9 : 14;

  // KPIs
  const kpis: KpiData[] = [
    {
      label: 'Total Tickets',
      num: totalTix,
      unit: '',
      delta: '+12%',
      dir: 'dn',
      sub: periodLabel,
      bar: Math.min(95, Math.round(scale * 60 + 20)),
      cls: 'kpi-purple',
    },
    {
      label: 'Avg Resolution',
      num: avgRes,
      unit: 'hrs',
      delta: '-0.4h',
      dir: 'up',
      sub: 'time to close ticket',
      bar: Math.round((1 - avgRes / 8) * 100),
      cls: 'kpi-green',
    },
  ];

  // AI Insight
  const insightMap: Record<string, InsightData> = {
    week: {
      text: `7-day snapshot: ${Math.round(412 * 7 / 30)} tickets handled across 3 product teams. Hardware team is at capacity — most open critical items are hardware-related. Retail Pro saw a 22% POS spike likely tied to a software update. Aloha NCR tickets trending down. Escalation rate at ${escalRate}% is within the 15% target.`,
      findings: [
        { cls: 'warn', icon: '⚠️', label: 'Hardware team at capacity — review staffing' },
        { cls: 'crit', icon: '🔴', label: 'Retail Pro POS issues up 22%' },
        { cls: 'good', icon: '✅', label: 'Aloha NCR tickets trending down' },
        { cls: 'good', icon: '✅', label: `Escalation rate ${escalRate}% — within target` },
      ],
    },
    month: {
      text: `${totalTix} tickets this month across Retail Pro, Aloha NCR, and Hardware teams. Hardware team has the highest escalation rate (18%) — root cause review recommended. Critical ticket resolution avg is 5.2h, breaching the 4h target. Retail Pro closed 94% of tickets within the period.`,
      findings: [
        { cls: 'crit', icon: '🔴', label: 'Hardware escalation rate 18% — above 15% target' },
        { cls: 'warn', icon: '⚠️', label: 'Critical ticket resolution avg 5.2h (target: 4h)' },
        { cls: 'good', icon: '✅', label: 'Retail Pro closure rate: 94%' },
        { cls: 'info', icon: '📊', label: 'Aloha NCR handles 35% of total volume' },
      ],
    },
    quarter: {
      text: `${totalTix} tickets across 90 days — all 3 teams active. Hardware resolution time improved 17% QoQ. Aloha NCR is consistently the highest-volume team. Escalation rate dropped from 16% to ${escalRate}% — training efforts are paying off. Closure rate reached ${closeRate}%.`,
      findings: [
        { cls: 'good', icon: '✅', label: 'Escalation rate down 16% → 9% QoQ' },
        { cls: 'good', icon: '✅', label: 'Hardware resolution time improved 17%' },
        { cls: 'warn', icon: '⚠️', label: 'Aloha NCR volume growing — may need more agents' },
        { cls: 'info', icon: '📈', label: `${closeRate}% closure rate — best quarter on record` },
      ],
    },
  };

  const customInsight: InsightData = {
    text: `Custom range (${periodLabel}): ${totalTix} tickets over ${days} days averaging ${(totalTix / days).toFixed(1)}/day across Retail Pro, Aloha NCR, and Hardware teams. Escalation rate is ${escalRate}%. ${openCrit} tickets remain open — check for aging items needing escalation.`,
    findings: [
      { cls: 'info', icon: '📊', label: `${(totalTix / days).toFixed(1)} avg tickets/day in range` },
      {
        cls: escalRate > 15 ? 'crit' : escalRate > 10 ? 'warn' : 'good',
        icon: escalRate > 15 ? '🔴' : '⚠️',
        label: `Escalation rate: ${escalRate}% (target: <15%)`,
      },
      {
        cls: openCrit > 60 ? 'crit' : 'warn',
        icon: openCrit > 60 ? '🔴' : '⚠️',
        label: `${openCrit} open/critical tickets in range`,
      },
      {
        cls: closeRate >= 95 ? 'good' : 'warn',
        icon: closeRate >= 95 ? '✅' : '⚠️',
        label: `Closure rate: ${closeRate}%`,
      },
    ],
  };

  const insight = period === 'custom' ? customInsight : insightMap[period];

  // Trend chart data
  const newTickets = Array.from({ length: days }, (_, i) =>
    Math.round(8 + Math.sin(i / 3) * 4 + Math.sin(i * 0.7 + 1) * 2 + 3),
  );
  const resolved = newTickets.map((n) => Math.max(2, n - Math.round(Math.random() * 3)));
  const critical = newTickets.map((n) =>
    Math.max(0, Math.round(n * 0.15 + Math.sin(n) * 1.5)),
  );
  const totalNew = newTickets.reduce((a, b) => a + b, 0);
  const totalRes = resolved.reduce((a, b) => a + b, 0);
  const backlogDelta = totalNew - totalRes;

  const trend: TrendData = {
    newTickets,
    resolved,
    critical,
    totalNew,
    totalRes,
    backlogDelta,
    days,
    summary: `${totalNew} tickets created, ${totalRes} resolved over ${days} days. Net backlog change: ${backlogDelta > 0 ? '+' : ''}${backlogDelta}. Peak volume mid-period likely linked to a system update rollout.`,
    badge: period === 'custom' ? `${days}d range` : `${days} days`,
  };

  // Product teams
  const teamsRaw = TEAMS_BASE.map((t, i) => {
    const ratios = [0.38, 0.35, 0.27];
    const critRatios = [0.32, 0.42, 0.26];
    const escalRatios = [0.11, 0.10, 0.22];
    const tickets = Math.round(totalTix * ratios[i]);
    const open = Math.round(openCrit * critRatios[i]);
    const escalated = Math.round(tickets * escalRatios[i]);
    const resolved2 = tickets - open;
    const closeRateT = Math.round((resolved2 / tickets) * 100);
    return { ...t, tickets, open, escalated, resolved: resolved2, closeRate: closeRateT };
  });

  const teamSummary = `Retail Pro handles the most volume (${Math.round(teamsRaw[0].tickets / totalTix * 100)}%). Hardware has the highest open-ticket ratio — check staffing. Aloha NCR is the most efficient with the best closure rate (${teamsRaw[1].closeRate}%).`;

  // Categories
  const categories: CategoryEntry[] = [
    { label: 'POS Hardware',           n: Math.round(142 * scale), color: '#7c3aed', change: +22, dir: 'up'  },
    { label: 'Software / App',         n: Math.round(89  * scale), color: '#0284c7', change:  -8, dir: 'dn'  },
    { label: 'Network / Connectivity', n: Math.round(74  * scale), color: '#0d9488', change:  +5, dir: 'up'  },
    { label: 'Account / Access',       n: Math.round(58  * scale), color: '#d97706', change:  -3, dir: 'dn'  },
    { label: 'Hardware Other',         n: Math.round(32  * scale), color: '#dc2626', change:  +1, dir: 'up'  },
    { label: 'Other',                  n: Math.round(17  * scale), color: '#6b7280', change:   0, dir: 'flat' },
  ];
  const catTotal = categories.reduce((a, b) => a + b.n, 0);
  const catSummary = `POS Hardware dominates at ${Math.round(categories[0].n / catTotal * 100)}% of tickets (+${categories[0].change}%). Software issues declined 8% — recent app updates appear effective. Network tickets rose slightly; monitor for infrastructure concerns.`;

  const clientSummary =
    'Popeyes generates 38% of total volume, primarily POS hardware issues. Ace Hardware grew this period. Top 2 clients account for 63% of all tickets — targeted support plans are recommended.';

  // Backlog health
  const fresh   = Math.round(openCrit * 0.52);
  const aging   = Math.round(openCrit * 0.31);
  const overdue = openCrit - fresh - aging;
  const totalBL = fresh + aging + overdue;
  const backlog: BacklogData = {
    fresh,
    aging,
    overdue,
    total: totalBL,
    freshPct:   Math.round((fresh   / totalBL) * 100),
    agingPct:   Math.round((aging   / totalBL) * 100),
    overduePct: Math.round((overdue / totalBL) * 100),
    summary: `${overdue} tickets have been open >72h and need immediate attention. ${Math.round(overdue / totalBL * 100)}% overdue rate — ${overdue > 8 ? 'escalation is recommended' : 'within acceptable range'}. Ace Hardware and Popeyes hold the most aging items.`,
  };

  return {
    periodLabel,
    totalTix,
    openCrit,
    avgRes,
    closeRate,
    escalRate,
    kpis,
    insight,
    trend,
    teams: teamsRaw,
    teamSummary,
    categories,
    catTotal,
    catSummary,
    clients: CLIENT_DATA,
    clientSummary,
    backlog,
  };
}

// ── SVG trend chart path builder ────────────────

export interface TrendSvgConfig {
  width?: number;
  height?: number;
}

export function buildTrendSvgPaths(
  trend: TrendData,
  config: TrendSvgConfig = {},
): { gridLines: string; lines: string } {
  const W = config.width  ?? 400;
  const H = config.height ?? 120;
  const { newTickets, resolved, critical, days } = trend;
  const maxV = Math.max(...newTickets, ...resolved, ...critical);

  const toY = (v: number) => H - 10 - (v / maxV) * (H - 20);
  const toX = (i: number) => (i / Math.max(days - 1, 1)) * W;

  const mkLine = (
    data: number[],
    col: string,
    fill: boolean,
    dashed: boolean,
  ) => {
    const pts  = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
    const area = fill
      ? `<polygon points="${toX(0)},${H} ${pts} ${toX(days - 1)},${H}" fill="${col}" opacity="0.07"/>`
      : '';
    const strokeW = fill ? 1.8 : 1.4;
    const dash    = dashed ? 'strokeDasharray="4 2"' : '';
    return { area, polyline: `${area}<polyline points="${pts}" fill="none" stroke="${col}" strokeWidth="${strokeW}" strokeLinecap="round" strokeLinejoin="round" ${dash}/>` };
  };

  const gridLines = [25, 50, 75]
    .map((pct) => {
      const y = H - 10 - (pct / 100) * (H - 20);
      return `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="rgba(124,58,237,0.07)" strokeWidth="1"/>`;
    })
    .join('');

  const baseline = `<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="rgba(124,58,237,0.1)" strokeWidth="1"/>`;
  const resolvedLine = mkLine(resolved,     '#16a34a', true,  false);
  const newLine      = mkLine(newTickets,   '#7c3aed', true,  false);
  const critLine     = mkLine(critical,     '#dc2626', false, true);

  return {
    gridLines: gridLines + baseline,
    lines: resolvedLine.polyline + newLine.polyline + critLine.polyline,
  };
}

// ── Donut chart arc builder ─────────────────────

export interface DonutArc {
  color: string;
  arc: number;
  gap: number;
  offset: number;
  label: string;
  pct: number;
}

export function buildDonutArcs(clients: ClientEntry[], radius = 38): DonutArc[] {
  const circ = 2 * Math.PI * radius;
  const arcs: DonutArc[] = [];
  let offset = 0;
  for (const cl of clients) {
    const arc = (cl.pct / 100) * circ;
    arcs.push({ color: cl.color, arc: arc - 2, gap: circ - arc + 2, offset: -offset, label: cl.label, pct: cl.pct });
    offset += arc;
  }
  return arcs;
}

// ── Export helper ───────────────────────────────

export function exportReport(payload: AnalyticsPayload): void {
  const lines = [
    `Ticket Analytics Export — ${payload.periodLabel}`,
    `Total Tickets: ${payload.totalTix}`,
    `Avg Resolution: ${payload.avgRes}h`,
    `Close Rate: ${payload.closeRate}%`,
    `Escalation Rate: ${payload.escalRate}%`,
    '',
    'AI Summary:',
    payload.insight.text,
    '',
    'Findings:',
    ...payload.insight.findings.map((f) => `  ${f.icon} ${f.label}`),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ticket-analytics-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PeriodBar logic ─────────────────────────────

export function getDefaultCustomRange(): { dateFrom: string; dateTo: string } {
  const to = new Date(), from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    dateFrom: from.toISOString().split('T')[0],
    dateTo:   to.toISOString().split('T')[0],
  };
}

export function validateCustomRange(dateFrom: string, dateTo: string): string | null {
  if (!dateFrom || !dateTo) return 'Both dates are required';
  const d1 = new Date(dateFrom), d2 = new Date(dateTo);
  if (d2 <= d1) return 'End date must be after start date';
  return null;
}

export function parseCustomRange(dateFrom: string, dateTo: string): { from: Date; to: Date } {
  return { from: new Date(dateFrom), to: new Date(dateTo) };
}

// ── KPI color map ───────────────────────────────

export const KPI_COLOR_MAP: Record<string, string> = {
  'kpi-purple': '#7c3aed',
  'kpi-green':  '#16a34a',
  'kpi-red':    '#dc2626',
  'kpi-amber':  '#d97706',
  'kpi-teal':   '#0d9488',
};

export function getKpiAccent(cls: string): string {
  return KPI_COLOR_MAP[cls] ?? '#7c3aed';
}

export function getKpiDeltaStyle(dir: 'up' | 'dn' | 'flat'): { bg: string; color: string } {
  if (dir === 'up') return { bg: 'rgba(22,163,74,0.1)',  color: '#16a34a' };
  if (dir === 'dn') return { bg: 'rgba(220,38,38,0.1)',  color: '#dc2626' };
  return                    { bg: 'rgba(100,116,139,0.1)', color: '#64748b' };
}

// ── Team accent helpers ─────────────────────────

export const TEAM_ACCENT: Record<string, string> = {
  'retail-pro': '#7c3aed',
  'aloha-ncr':  '#0d9488',
  'hardware':   '#d97706',
};

export const TEAM_BG: Record<string, string> = {
  'retail-pro': 'rgba(124,58,237,0.04)',
  'aloha-ncr':  'rgba(13,148,136,0.04)',
  'hardware':   'rgba(217,119,6,0.04)',
};

export function getTeamAccent(cls: string): string {
  return TEAM_ACCENT[cls] ?? '#7c3aed';
}

export function getTeamBg(cls: string): string {
  return TEAM_BG[cls] ?? '#ffffff';
}

// ── Backlog stat items builder ──────────────────

export interface BacklogStatItem {
  n: number;
  label: string;
  sub: string;
  bg: string;
  bdr: string;
  col: string;
}

export function buildBacklogStatItems(backlog: BacklogData): BacklogStatItem[] {
  return [
    {
      n: backlog.fresh,
      label: 'Fresh',
      sub: '< 24h open',
      bg:  'rgba(22,163,74,0.07)',
      bdr: 'rgba(22,163,74,0.2)',
      col: '#16a34a',
    },
    {
      n: backlog.aging,
      label: 'Aging',
      sub: '24h – 72h open',
      bg:  'rgba(217,119,6,0.07)',
      bdr: 'rgba(217,119,6,0.2)',
      col: '#d97706',
    },
    {
      n: backlog.overdue,
      label: 'Overdue',
      sub: '> 72h open',
      bg:  'rgba(220,38,38,0.07)',
      bdr: 'rgba(220,38,38,0.2)',
      col: '#dc2626',
    },
  ];
}

// ── Trend chart SVG helpers (used in TrendChart component) ──

export interface TrendChartPoints {
  mkPts:  (d: number[]) => string;
  mkArea: (d: number[]) => string;
  gridYs: number[];
  W: number;
  H: number;
}

export function buildTrendChartPoints(trend: TrendData): TrendChartPoints {
  const W = 400, H = 120;
  const { newTickets, resolved, critical, days } = trend;
  const maxV = Math.max(...newTickets, ...resolved, ...critical);
  const toY  = (v: number) => H - 10 - (v / maxV) * (H - 20);
  const toX  = (i: number) => (i / Math.max(days - 1, 1)) * W;
  const mkPts  = (d: number[]) => d.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const mkArea = (d: number[]) =>
    `M${toX(0)},${H} ` + d.map((v, i) => `L${toX(i)},${toY(v)}`).join(' ') + ` L${toX(days - 1)},${H} Z`;
  const gridYs = [25, 50, 75].map(p => H - 10 - (p / 100) * (H - 20));
  return { mkPts, mkArea, gridYs, W, H };
}

// ── Team ticket share calculator ────────────────

export function getTeamSharePct(teamTickets: number, totalTix: number): number {
  return Math.round((teamTickets / totalTix) * 100);
}

export function getTeamBarWidthPct(teamTickets: number, maxTix: number): number {
  return Math.round((teamTickets / maxTix) * 100);
}

// ── Category bar width calculator ───────────────

export function getCategoryBarWidthPct(n: number, catTotal: number): number {
  return Math.round((n / catTotal) * 100);
}