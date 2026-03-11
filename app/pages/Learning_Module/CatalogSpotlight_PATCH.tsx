// ─────────────────────────────────────────────────────────────────────────────
// PATCH: Add this component to your ClientCatalog.tsx
// Then render <CatalogSpotlight courses={courses} onOpenCourse={onOpenCourse} />
// at the TOP of your catalog, above the filter chips and grid.
// ─────────────────────────────────────────────────────────────────────────────

import { THUMB_GRADIENTS, CAT_ICONS } from "../Logic/CourseCatalogLogic";
import type { Course } from "../../Data/types";

// ─── Spotlight: 1 hero card + 2 stacked side cards ───────────────────────────
// Better than a carousel because: scannable at a glance, no auto-play disruption,
// shows 3 courses at once, works on any screen width.
export function CatalogSpotlight({
  courses,
  onOpenCourse,
}: {
  courses: Course[];
  onOpenCourse: (idx: number) => void;
}) {
  // Priority: in-progress first, then new, then completed
  const ordered = [
    ...courses.filter(c => (c.progress ?? 0) > 0 && !c.completed),
    ...courses.filter(c => !(c.enrolled || (c.progress ?? 0) > 0) && !c.completed),
    ...courses.filter(c => c.completed),
  ];

  const spotlight = ordered.slice(0, 3);
  if (spotlight.length === 0) return null;

  const hero = spotlight[0];
  const heroIdx = courses.indexOf(hero);
  const heroGrad = THUMB_GRADIENTS[heroIdx % THUMB_GRADIENTS.length];
  const heroIcon = CAT_ICONS[hero.cat] || hero.thumbEmoji || "📚";
  const heroPct = hero.progress ?? 0;
  const heroDone = hero.completed || heroPct >= 100;
  const heroEnr = hero.enrolled || heroPct > 0;

  const sides = spotlight.slice(1);

  return (
    <>
      <style>{`
        @keyframes spot-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .spot-hero { animation: spot-in .35s cubic-bezier(.16,1,.3,1) both; }
        .spot-side { animation: spot-in .35s cubic-bezier(.16,1,.3,1) both; }
        .spot-side:nth-child(2) { animation-delay:.06s; }

        .spot-hero-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .spot-side-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(108,61,214,.14) !important; border-color: rgba(108,61,214,.22) !important; }
        .spot-side-card { transition: all .18s; }
      `}</style>

      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        {/* Section label */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          <span style={{ fontSize:10, fontWeight:800, color:"#b0a8cc", textTransform:"uppercase", letterSpacing:".1em" }}>
            Featured
          </span>
          <div style={{ flex:1, height:1, background:"linear-gradient(90deg,rgba(108,61,214,.1),transparent)" }} />
        </div>

        {/* Layout: hero (wider) + side stack */}
        <div style={{ display:"flex", gap:12, alignItems:"stretch", minHeight:180 }}>

          {/* ── Hero card ── */}
          <div className="spot-hero"
            onClick={() => onOpenCourse(heroIdx)}
            style={{
              flex:"0 0 56%", borderRadius:16, overflow:"hidden", position:"relative",
              background:`linear-gradient(145deg,${heroGrad[0]},${heroGrad[1]})`,
              cursor:"pointer", minHeight:180,
            }}>
            {/* Radial highlight */}
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 75% 50% at 50% -5%, rgba(255,255,255,.2) 0%, transparent 65%)", pointerEvents:"none" }} />
            {/* Bottom scrim */}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,.04) 55%, transparent 100%)", pointerEvents:"none" }} />
            {/* Big icon */}
            <div style={{ position:"absolute", right:22, top:"50%", transform:"translateY(-50%)", fontSize:80, opacity:.2, userSelect:"none", filter:"drop-shadow(0 8px 24px rgba(0,0,0,.35))" }}>
              {heroIcon}
            </div>
            {/* "FEATURED" pill */}
            <div style={{ position:"absolute", top:12, left:12, padding:"3px 9px", borderRadius:20, background:"rgba(255,255,255,.15)", backdropFilter:"blur(6px)", border:"1px solid rgba(255,255,255,.2)", fontSize:8.5, fontWeight:800, color:"rgba(255,255,255,.9)", letterSpacing:".1em", textTransform:"uppercase" }}>
              ★ Featured
            </div>

            {/* Content */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"16px 18px" }}>
              <div style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,.55)", textTransform:"uppercase", letterSpacing:".1em", marginBottom:4 }}>{hero.cat}</div>
              <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:18, fontWeight:400, fontStyle:"italic", color:"#fff", lineHeight:1.3, marginBottom:heroEnr&&heroPct>0?10:12 }}>
                {hero.title}
              </div>
              {hero.desc && (
                <div style={{ fontSize:11, color:"rgba(255,255,255,.65)", lineHeight:1.5, marginBottom:10, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                  {hero.desc}
                </div>
              )}
              {heroEnr && heroPct > 0 && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.6)" }}>Progress</span>
                    <span style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,.85)" }}>{heroPct}%</span>
                  </div>
                  <div style={{ height:3, borderRadius:3, background:"rgba(255,255,255,.18)", overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${heroPct}%`, background:heroDone?"rgba(110,231,183,.85)":"rgba(255,255,255,.8)", borderRadius:3, transition:"width .5s" }} />
                  </div>
                </div>
              )}
              <button className="spot-hero-btn"
                onClick={e => { e.stopPropagation(); onOpenCourse(heroIdx); }}
                style={{
                  padding:"7px 16px", borderRadius:9, border:"none", cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif", fontSize:11.5, fontWeight:700,
                  background: heroDone ? "rgba(16,185,129,.9)" : heroEnr ? "rgba(99,102,241,.9)" : "rgba(255,255,255,.18)",
                  color:"#fff", backdropFilter:"blur(4px)", transition:"all .15s",
                }}>
                {heroDone ? "✓ Review Course" : heroEnr ? `▶ Continue · ${heroPct}%` : "+ Enroll Now"}
              </button>
            </div>
          </div>

          {/* ── Side cards (stacked) ── */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
            {sides.map((c, si) => {
              const realIdx = courses.indexOf(c);
              const grad = THUMB_GRADIENTS[realIdx % THUMB_GRADIENTS.length];
              const icon = CAT_ICONS[c.cat] || c.thumbEmoji || "📚";
              const pct = c.progress ?? 0;
              const done = c.completed || pct >= 100;
              const enr = c.enrolled || pct > 0;

              return (
                <div key={si} className="spot-side spot-side-card"
                  onClick={() => onOpenCourse(realIdx)}
                  style={{
                    flex:1, borderRadius:12, overflow:"hidden", display:"flex",
                    background:"#fff", border:"1.5px solid rgba(108,61,214,.09)",
                    boxShadow:"0 1px 5px rgba(0,0,0,.04)", cursor:"pointer",
                  }}>
                  {/* Left thumbnail strip */}
                  <div style={{ width:72, position:"relative", background:`linear-gradient(145deg,${grad[0]},${grad[1]})`, flexShrink:0 }}>
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, opacity:.6 }}>{icon}</div>
                  </div>
                  {/* Right content */}
                  <div style={{ flex:1, padding:"10px 12px", display:"flex", flexDirection:"column", justifyContent:"space-between", minWidth:0 }}>
                    <div>
                      <div style={{ fontSize:8.5, fontWeight:800, color:"#b0a8cc", textTransform:"uppercase", letterSpacing:".09em", marginBottom:3 }}>{c.cat}</div>
                      <div style={{ fontFamily:"'DM Serif Display',Georgia,serif", fontSize:13, fontStyle:"italic", color:"#18103a", lineHeight:1.35, marginBottom:4, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                        {c.title}
                      </div>
                    </div>
                    <div>
                      {enr && pct > 0 && (
                        <div style={{ marginBottom:6 }}>
                          <div style={{ height:2.5, borderRadius:3, background:"rgba(108,61,214,.08)", overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${pct}%`, background:done?"#10b981":"linear-gradient(90deg,#6c3dd6,#0d9488)", borderRadius:3 }} />
                          </div>
                        </div>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); onOpenCourse(realIdx); }}
                        style={{
                          padding:"4px 10px", borderRadius:6, border:"none", cursor:"pointer",
                          fontFamily:"'DM Sans',sans-serif", fontSize:10, fontWeight:700,
                          background: done
                            ? "linear-gradient(135deg,#065f46,#0d9488)"
                            : enr
                            ? "linear-gradient(135deg,#6c3dd6,#4f1eb8)"
                            : "rgba(108,61,214,.07)",
                          color: done || enr ? "#fff" : "#6c3dd6",
                          transition:"all .15s",
                        }}>
                        {done ? "✓ Review" : enr ? `▶ Continue · ${pct}%` : "+ Enroll"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* If only 1 side card, fill the gap with a "Browse all" nudge */}
            {sides.length < 2 && (
              <div style={{ flex:1, borderRadius:12, border:"1.5px dashed rgba(108,61,214,.12)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:11, color:"#b0a8cc", fontWeight:600 }}>More below ↓</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
