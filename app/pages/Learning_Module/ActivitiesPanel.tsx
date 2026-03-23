'use client'

import { ACT_META, getActivityItemCount, type Activity } from "./ActivityBuilderPanel";
import "../../globals.css";

interface ActivitiesPanelProps {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  toast: (msg: string) => void;
}

const PANEL_STYLES = `
  @keyframes act-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }

  .act-card {
    border-radius:14px; overflow:hidden;
    background:#fff;
    border:1.5px solid rgba(109,40,217,0.08);
    box-shadow:0 2px 8px rgba(109,40,217,0.05);
    transition:all .2s; cursor:pointer;
    display:flex; flex-direction:column;
  }
  .act-card:hover {
    border-color:rgba(109,40,217,0.2);
    transform:translateY(-2px);
    box-shadow:0 8px 24px rgba(109,40,217,0.12);
  }

  /* Left accent stripe */
  .act-card-spine {
    height:5px; flex-shrink:0;
    transition:height .2s;
  }
  .act-card:hover .act-card-spine { height:7px; }

  .act-card-body { padding:14px 15px; display:flex; align-items:flex-start; gap:12px; flex:1; }

  .act-icon {
    width:44px; height:44px; border-radius:11px; flex-shrink:0;
    display:flex; align-items:center; justify-content:center;
    font-size:22px; border:1.5px solid transparent;
    transition:transform .2s;
  }
  .act-card:hover .act-icon { transform:scale(1.06); }

  .act-status-pill {
    padding:3px 9px; border-radius:20px;
    font-size:9.5px; font-weight:700;
    text-transform:uppercase; letter-spacing:.05em;
    white-space:nowrap; flex-shrink:0;
  }

  .act-card-foot {
    padding:10px 15px; display:flex; gap:7px;
    border-top:1px solid rgba(109,40,217,0.06);
    background:rgba(109,40,217,0.02);
  }

  .act-btn-edit {
    flex:1; padding:7px 0; border-radius:8px;
    border:1.5px solid rgba(124,58,237,0.2);
    background:rgba(124,58,237,0.04); color:#7c3aed;
    font-size:11px; font-weight:700; cursor:pointer;
    font-family:'DM Sans',sans-serif;
    display:flex; align-items:center; justify-content:center; gap:5px;
    transition:all .15s;
  }
  .act-btn-edit:hover { background:rgba(124,58,237,0.1); border-color:rgba(124,58,237,0.35); }

  .act-btn-del {
    width:34px; height:34px; border-radius:8px;
    border:1.5px solid rgba(239,68,68,0.18);
    background:rgba(239,68,68,0.04); color:#dc2626;
    cursor:pointer; display:flex; align-items:center; justify-content:center;
    transition:all .15s; flex-shrink:0;
  }
  .act-btn-del:hover { background:rgba(239,68,68,0.1); border-color:rgba(239,68,68,0.3); }

  .act-section-hdr {
    display:flex; align-items:center; gap:10px;
    margin-bottom:13px;
  }
  .act-section-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .act-section-label { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; }
  .act-section-count {
    padding:2px 9px; border-radius:20px;
    font-size:10px; font-weight:700;
    margin-left:2px;
  }
`;

export default function ActivitiesPanel({ activities, onEdit, onDelete, toast }: ActivitiesPanelProps) {
  const published = activities.filter(a => a.status === "published");
  const drafts    = activities.filter(a => a.status === "draft");

  const ActivityCard = ({ activity, animDelay = 0 }: { activity: Activity; animDelay?: number }) => {
    const meta      = ACT_META[activity.type];
    const itemCount = getActivityItemCount(activity);
    const isPub     = activity.status === "published";

    return (
      <div className="act-card" style={{ animation:`act-in .22s ease ${animDelay}s both` }}>
        {/* Accent stripe — gradient from type color */}
        <div className="act-card-spine"
          style={{ background:`linear-gradient(90deg,${meta.color},${meta.color}88)` }} />

        <div className="act-card-body">
          <div className="act-icon"
            style={{ background:meta.bg, borderColor:meta.border, color:meta.color }}>
            {meta.icon}
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:5 }}>
              <div style={{ flex:1, minWidth:0, fontSize:13.5, fontWeight:800, color:"#18103a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:"-.01em" }}>
                {activity.title || "Untitled Activity"}
              </div>
              <span className="act-status-pill"
                style={{
                  background: isPub ? "rgba(13,148,136,0.1)" : "rgba(217,119,6,0.1)",
                  color:      isPub ? "#0d9488"              : "#b45309",
                }}>
                {isPub ? "✓ Published" : "Draft"}
              </span>
            </div>

            <div style={{ fontSize:10.5, color:meta.color, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:activity.media ? 5 : 0 }}>
              {meta.label} · {itemCount} item{itemCount === 1 ? "" : "s"}
            </div>

            {activity.media && (
              <div style={{ fontSize:10, color:"#0d9488", fontWeight:600, marginTop:4, display:"flex", alignItems:"center", gap:4 }}>
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 2H2a1 1 0 00-1 1v7a1 1 0 001 1h8a1 1 0 001-1V7"/><path d="M8 1h3v3M11 1L6 6"/></svg>
                {activity.media.name}
              </div>
            )}
          </div>
        </div>

        <div className="act-card-foot">
          <button className="act-btn-edit" onClick={e => { e.stopPropagation(); onEdit(activity); }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/></svg>
            Edit
          </button>
          <button className="act-btn-del"
            onClick={e => {
              e.stopPropagation();
              if (confirm(`Delete "${activity.title}"?`)) { onDelete(activity.id); toast("Activity deleted"); }
            }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 3.5h10M5 3.5V2h4v1.5M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8"/></svg>
          </button>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ color, label, count, bg }: { color: string; label: string; count: number; bg: string }) => (
    <div className="act-section-hdr">
      <span className="act-section-dot" style={{ background:color }} />
      <span className="act-section-label" style={{ color }}>{label}</span>
      <span className="act-section-count" style={{ background:bg, color }}>{count}</span>
    </div>
  );

  return (
    <>
      <style>{PANEL_STYLES}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14, flexShrink:0 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#18103a", letterSpacing:"-.02em" }}>Activity Library</div>
          <div style={{ fontSize:11, color:"#8e7ec0", marginTop:2 }}>
            {activities.length} total · {published.length} published · {drafts.length} draft{drafts.length === 1 ? "" : "s"}
          </div>
        </div>
        {/* Type distribution badges */}
        <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"flex-end" }}>
          {(Object.keys(ACT_META) as (keyof typeof ACT_META)[])
            .filter(t => activities.some(a => a.type === t))
            .map(t => {
              const meta = ACT_META[t];
              const count = activities.filter(a => a.type === t).length;
              return (
                <span key={t} style={{ padding:"2px 8px", borderRadius:20, background:meta.bg, color:meta.color, fontSize:9.5, fontWeight:700 }}>
                  {meta.icon} {count}
                </span>
              );
            })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:"auto" }}>
        {activities.length === 0 ? (
          <div style={{ textAlign:"center", padding:"56px 20px", color:"#8e7ec0" }}>
            <div style={{ width:64, height:64, borderRadius:18, background:"rgba(124,58,237,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 14px" }}>🧩</div>
            <div style={{ fontSize:15, fontWeight:700, color:"#18103a", marginBottom:6 }}>No activities yet</div>
            <div style={{ fontSize:12 }}>Click "New Activity" to create your first activity</div>
          </div>
        ) : (
          <>
            {published.length > 0 && (
              <div style={{ marginBottom:26 }}>
                <SectionHeader color="#0d9488" label="Published" count={published.length} bg="rgba(13,148,136,0.1)" />
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(285px,1fr))", gap:12 }}>
                  {published.map((a, i) => <ActivityCard key={a.id} activity={a} animDelay={i * 0.04} />)}
                </div>
              </div>
            )}

            {drafts.length > 0 && (
              <div>
                <SectionHeader color="#d97706" label="Drafts" count={drafts.length} bg="rgba(217,119,6,0.1)" />
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(285px,1fr))", gap:12 }}>
                  {drafts.map((a, i) => <ActivityCard key={a.id} activity={a} animDelay={i * 0.04} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
