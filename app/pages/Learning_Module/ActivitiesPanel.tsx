'use client'

import { ACT_META, getActivityItemCount, type Activity } from "./ActivityBuilderPanel";
import "../../globals.css";

interface ActivitiesPanelProps {
  activities: Activity[];
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
  toast: (msg: string) => void;
}

export default function ActivitiesPanel({ activities, onEdit, onDelete, toast }: ActivitiesPanelProps) {
  const published = activities.filter(a => a.status === "published");
  const drafts    = activities.filter(a => a.status === "draft");

  const ActivityCard = ({ activity }: { activity: Activity }) => {
    const meta      = ACT_META[activity.type];
    const itemCount = getActivityItemCount(activity);

    return (
      <div
        style={{
          background:"var(--surface,#fff)",
          border:"1.5px solid var(--border,rgba(124,58,237,0.1))",
          borderRadius:12, padding:16, transition:"all 0.2s", cursor:"pointer",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor  = "rgba(124,58,237,0.3)";
          e.currentTarget.style.transform    = "translateY(-2px)";
          e.currentTarget.style.boxShadow    = "0 4px 12px rgba(124,58,237,0.12)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor  = "rgba(124,58,237,0.1)";
          e.currentTarget.style.transform    = "translateY(0)";
          e.currentTarget.style.boxShadow    = "none";
        }}
      >
        {/* Top row */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:12 }}>
          <div style={{
            width:48, height:48, borderRadius:10,
            background:meta.bg, color:meta.color,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:24, flexShrink:0,
          }}>
            {meta.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{
              fontSize:14, fontWeight:700, color:"var(--t1,#18103a)",
              marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            }}>
              {activity.title || "Untitled Activity"}
            </div>
            <div style={{
              fontSize:11, color:"var(--t3,#a89dc8)",
              textTransform:"uppercase", letterSpacing:"0.05em", fontWeight:600,
            }}>
              {meta.label} · {itemCount} item{itemCount === 1 ? "" : "s"}
            </div>
            {/* Media badge */}
            {activity.media && (
              <div style={{ fontSize:10, color:"#0d9488", fontWeight:600, marginTop:3 }}>
                📎 {activity.media.name}
              </div>
            )}
          </div>
          <div style={{
            padding:"4px 10px", borderRadius:6,
            fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em",
            background: activity.status === "published" ? "#d1fae5" : "#fef3c7",
            color:       activity.status === "published" ? "#065f46" : "#92400e",
            flexShrink:0,
          }}>
            {activity.status ?? "draft"}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", gap:8 }}>
          <button
            onClick={e => { e.stopPropagation(); onEdit(activity); }}
            style={{
              flex:1, padding:"8px 12px", borderRadius:8,
              border:"1.5px solid rgba(124,58,237,0.2)",
              background:"rgba(124,58,237,0.04)", color:"var(--purple,#7c3aed)",
              fontSize:11, fontWeight:600, cursor:"pointer", transition:"all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.08)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.04)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.2)"; }}
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ display:"inline", marginRight:4 }}>
              <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/>
            </svg>
            Edit
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              if (confirm(`Delete "${activity.title}"?`)) {
                onDelete(activity.id);
                toast("Activity deleted");
              }
            }}
            style={{
              padding:"8px 12px", borderRadius:8,
              border:"1.5px solid rgba(239,68,68,0.2)",
              background:"rgba(239,68,68,0.05)", color:"#dc2626",
              fontSize:11, fontWeight:600, cursor:"pointer", transition:"all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.05)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ display:"inline" }}>
              <path d="M2 3.5h10M5 3.5V2h4v1.5M5.5 6v4M8.5 6v4M3 3.5l.7 8h6.6l.7-8"/>
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // ─── Section header helper ──────────────────────────────────────────────────
  const SectionHeader = ({ color, label, count }: { color: string; label: string; count: number }) => (
    <div style={{
      fontSize:12, fontWeight:700, color:"var(--t2,#4a3870)",
      textTransform:"uppercase", letterSpacing:"0.05em",
      marginBottom:12, display:"flex", alignItems:"center", gap:8,
    }}>
      <div style={{ width:6, height:6, borderRadius:"50%", background:color }} />
      {label} ({count})
    </div>
  );

  return (
    <>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, flexShrink:0 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700, color:"var(--t1)", letterSpacing:"-0.01em" }}>
            Activity Library
          </div>
          <div style={{ fontSize:11, color:"var(--t3)", marginTop:2 }}>
            {activities.length} total · {published.length} published · {drafts.length} draft{drafts.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:"auto" }}>
        {activities.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"var(--t3,#a89dc8)" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🧩</div>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>No activities yet</div>
            <div style={{ fontSize:12 }}>Click "Activity Builder" to create your first activity</div>
          </div>
        ) : (
          <>
            {published.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <SectionHeader color="#16a34a" label="Published" count={published.length} />
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14 }}>
                  {published.map(activity => <ActivityCard key={activity.id} activity={activity} />)}
                </div>
              </div>
            )}

            {drafts.length > 0 && (
              <div>
                <SectionHeader color="#d97706" label="Drafts" count={drafts.length} />
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14 }}>
                  {drafts.map(activity => <ActivityCard key={activity.id} activity={activity} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
