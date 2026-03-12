'use client'
/**
 * RetailTicketsPage.tsx  —  Retail / Nike / Popeyes
 *
 * WHAT CHANGED vs original:
 *  ✕ Removed: TICKETS hardcoded constant
 *  ✓ Added:   useEffect that calls ticketsAPI.getAll({ company_id }) on mount
 *  ✓ Added:   notificationsAPI wired for notification panel
 *  ✓ Added:   Loading skeleton; empty-state fallback
 *  ✓ Kept:    Analytics carousel data (TREND_DATA, CATEGORIES, COMMON_ISSUES)
 *             remains static — no backend endpoint exists yet for those.
 *             All UI, tabs, modals, charts unchanged.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header  from "../Header_Client/header_client";
import "../../globals.css";
import {
  ticketsAPI, notificationsAPI, formatRole,
  type AuthUser, type Ticket, type Notification,
} from "../../Services/api.service";

type CPView = "overview"|"tickets"|"users"|"settings"|"learning";
type TabKey  = "open"|"pending"|"closed";

interface UINotif {
  id:number; type:"warn"|"error"|"info"|"success"|"purple";
  title:string; desc:string; time:string; read:boolean;
}

// ── static analytics data (no API endpoint yet) ───────────────────────────────
const TREND_DATA = [
  {month:"Jan",tickets:18},{month:"Feb",tickets:24},{month:"Mar",tickets:19},
  {month:"Apr",tickets:31},{month:"May",tickets:27},{month:"Jun",tickets:22},
];
const CATEGORIES = [
  {name:"Hardware",count:14,color:"#7c3aed"},{name:"Software",count:9,color:"#0d9488"},
  {name:"Network",count:6,color:"#d97706"},{name:"Other",count:4,color:"#dc2626"},
];
const COMMON_ISSUES = [
  "POS terminal not responding","Receipt printer jam","Network connectivity issues",
  "Software update failures","Card reader malfunction",
];

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtDate=(s?:string|null)=>s?new Date(s).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"—";
const initials=(name:string)=>{const p=name.trim().split(/\s+/);return p.length===1?p[0].slice(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();};
const toUINotif=(n:Notification):UINotif=>({
  id:n.id??0,
  type:({warning:"warn",alert:"error",info:"info",success:"success"} as Record<string,UINotif["type"]>)[n.type??"info"]??"info",
  title:n.title??"Notification", desc:n.message,
  time:n.created_at?new Date(n.created_at).toLocaleDateString():"", read:n.read??false,
});

const Sk=({w="100%",h=14,r=6}:{w?:string|number;h?:number;r?:number})=>(
  <div style={{width:w,height:h,borderRadius:r,background:"linear-gradient(90deg,#f0eeff 25%,#e8e4fc 50%,#f0eeff 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite"}}/>
);
function useOutside<T extends HTMLElement>(cb:()=>void){
  const ref=useRef<T>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))cb();};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[cb]);
  return ref;
}

// ── priority badge ────────────────────────────────────────────────────────────
const PriorityBadge:React.FC<{p:string}>=({p})=>{
  const map:Record<string,{bg:string;color:string}>={
    high:  {bg:"#fee2e2",color:"#dc2626"},
    medium:{bg:"#fef3c7",color:"#d97706"},
    low:   {bg:"#dcfce7",color:"#16a34a"},
  };
  const c=map[p?.toLowerCase()]??{bg:"#f1f5f9",color:"#64748b"};
  return<span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:5,background:c.bg,color:c.color,letterSpacing:"0.4px",textTransform:"uppercase"}}>{p||"—"}</span>;
};

// ── main ──────────────────────────────────────────────────────────────────────
interface Props{onNavigate:(v:CPView)=>void;onLogout?:()=>void;user?:AuthUser|null;}

const RetailTicketsPage:React.FC<Props>=({onNavigate,onLogout,user:propUser})=>{
  const companyId=propUser?.company_id??null;

  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [notifs,   setNotifs]   = useState<UINotif[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [activeTab,   setActiveTab]   = useState<TabKey>("open");
  const [selTicket,   setSelTicket]   = useState<Ticket|null>(null);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [search,      setSearch]      = useState("");

  const headerUser={
    initials:propUser?initials(propUser.name):"??",
    name:propUser?.name??"User",
    role:formatRole(propUser?.role)??"User",
  };

  // ── FETCH ─────────────────────────────────────────────────
  const loadAll=useCallback(async()=>{
    if(!companyId){setLoading(false);return;}
    setLoading(true);
    try{
      const [tR,nR]=await Promise.all([
        ticketsAPI.getAll({company_id:companyId}),
        notificationsAPI.getAll(),
      ]);
      if(tR.success&&tR.data) setTickets(tR.data);
      if(nR.success&&nR.data) setNotifs(nR.data.map(toUINotif));
    }finally{setLoading(false);}
  },[companyId]);

  useEffect(()=>{loadAll();},[loadAll]);

  const markRead=async(id:number)=>{await notificationsAPI.markRead(id);setNotifs(ns=>ns.map(n=>n.id===id?{...n,read:true}:n));};
  const markAllRead=async()=>{await notificationsAPI.markAllRead();setNotifs(ns=>ns.map(n=>({...n,read:true})));};

  // derived
  const unread=notifs.filter(n=>!n.read).length;
  const tabTickets=tickets.filter(t=>{
    const s=(t.status??"").toLowerCase();
    if(activeTab==="open")    return s==="open";
    if(activeTab==="pending") return s==="pending"||s==="in_progress"||s==="in progress";
    return s==="closed"||s==="resolved";
  });
  const filtered=tabTickets.filter(t=>
    !search||t.title?.toLowerCase().includes(search.toLowerCase())||t.id?.toString().includes(search)
  );

  const openCount   = tickets.filter(t=>(t.status??"").toLowerCase()==="open").length;
  const pendingCount= tickets.filter(t=>{const s=(t.status??"").toLowerCase();return s==="pending"||s==="in_progress"||s==="in progress";}).length;
  const closedCount = tickets.filter(t=>{const s=(t.status??"").toLowerCase();return s==="closed"||s==="resolved";}).length;

  // analytics carousel items
  const carouselItems=[
    // KPIs
    <div key="kpi" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,height:"100%"}}>
      {[["Total",tickets.length,"#6d28d9","si-p"],["Open",openCount,"#dc2626","si-r"],["Pending",pendingCount,"#d97706","si-key"],["Resolved",closedCount,"#16a34a","si-t"]].map(([label,val,color])=>(
        <div key={label as string} style={{background:"#fff",borderRadius:10,padding:"10px 12px",border:"1px solid rgba(124,58,237,0.1)",display:"flex",flexDirection:"column",justifyContent:"center"}}>
          <div style={{fontSize:22,fontWeight:900,color:color as string,lineHeight:1}}>{loading?<Sk w={30} h={22}/>:val}</div>
          <div style={{fontSize:10,color:"#8e7ec0",marginTop:4,fontWeight:600}}>{label}</div>
        </div>
      ))}
    </div>,
    // Volume trend (static)
    <div key="trend" style={{display:"flex",flexDirection:"column",height:"100%",justifyContent:"space-between"}}>
      <div style={{fontSize:11,fontWeight:700,color:"#18103a",marginBottom:6}}>Volume Trend</div>
      <div style={{display:"flex",alignItems:"flex-end",gap:6,flex:1}}>
        {TREND_DATA.map(d=>{
          const max=Math.max(...TREND_DATA.map(x=>x.tickets));
          const pct=(d.tickets/max)*100;
          return(
            <div key={d.month} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span style={{fontSize:9,fontWeight:700,color:"#0369a1"}}>{d.tickets}</span>
              <div style={{width:"100%",background:"linear-gradient(180deg,#7c3aed,#6d28d9)",borderRadius:"4px 4px 0 0",height:`${pct}%`,minHeight:4,transition:"height 0.4s"}}/>
              <span style={{fontSize:8,color:"#8e7ec0"}}>{d.month}</span>
            </div>
          );
        })}
      </div>
    </div>,
    // Categories (static)
    <div key="cats" style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{fontSize:11,fontWeight:700,color:"#18103a",marginBottom:8}}>Categories</div>
      {CATEGORIES.map(c=>(
        <div key={c.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <span style={{fontSize:10,fontWeight:600,color:"#4a3870",minWidth:60}}>{c.name}</span>
          <div style={{flex:1,height:6,background:"#f0eeff",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",background:c.color,borderRadius:3,width:`${(c.count/Math.max(...CATEGORIES.map(x=>x.count)))*100}%`}}/>
          </div>
          <span style={{fontSize:10,fontWeight:700,color:c.color,minWidth:16}}>{c.count}</span>
        </div>
      ))}
    </div>,
  ];

  return(
    <div style={{display:"flex",height:"100vh",background:"var(--bg)",overflow:"hidden"}}>
      <Sidebar activePage="tickets" onNavigate={onNavigate as (v:string)=>void}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <Header user={headerUser} notificationCount={unread} onNotificationClick={()=>setNotifOpen(o=>!o)} onLogout={onLogout}/>
        <div className="gx-main"><div className="gx-view">
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:10,padding:"14px 20px",overflow:"hidden",minHeight:0}}>

            {/* PAGE HEADER */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <div>
                <div style={{fontSize:18,fontWeight:800,color:"#18103a"}}>Support Tickets</div>
                <div style={{fontSize:11.5,color:"#8e7ec0",marginTop:2}}>Manage and track all support requests</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:10,flex:1,minHeight:0}}>
              {/* LEFT: ticket list */}
              <div className="gx-card" style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
                {/* TABS */}
                <div style={{display:"flex",gap:0,borderBottom:"1px solid rgba(124,58,237,0.1)",flexShrink:0,marginBottom:0}}>
                  {(["open","pending","closed"] as TabKey[]).map(tab=>{
                    const counts={open:openCount,pending:pendingCount,closed:closedCount};
                    return(
                      <button key={tab} onClick={()=>setActiveTab(tab)}
                        style={{flex:1,padding:"10px 0",fontSize:11.5,fontWeight:activeTab===tab?700:500,color:activeTab===tab?"#6d28d9":"#8e7ec0",background:"none",border:"none",borderBottom:activeTab===tab?"2.5px solid #6d28d9":"2.5px solid transparent",cursor:"pointer",textTransform:"capitalize",transition:"all 0.15s"}}>
                        {tab} <span style={{fontSize:10,background:activeTab===tab?"#ede9fe":"#f1f5f9",color:activeTab===tab?"#6d28d9":"#94a3b8",padding:"1px 6px",borderRadius:10,marginLeft:4}}>{loading?"…":counts[tab]}</span>
                      </button>
                    );
                  })}
                </div>
                {/* SEARCH */}
                <div style={{padding:"10px 14px",borderBottom:"1px solid rgba(124,58,237,0.06)",flexShrink:0}}>
                  <div style={{position:"relative"}}>
                    <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#8e7ec0" strokeWidth="1.5"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tickets…"
                      style={{width:"100%",paddingLeft:28,padding:"7px 12px 7px 28px",border:"1.5px solid rgba(124,58,237,0.12)",borderRadius:8,fontSize:11.5,color:"#18103a",background:"#f8f7ff",outline:"none",fontFamily:"inherit"}}/>
                  </div>
                </div>
                {/* LIST */}
                <div style={{overflowY:"auto",flex:1}}>
                  {loading?(
                    <div style={{display:"flex",flexDirection:"column",gap:8,padding:"10px 14px"}}>
                      {Array.from({length:5}).map((_,i)=><Sk key={i} h={64} r={10}/>)}
                    </div>
                  ):filtered.length===0?(
                    <div style={{textAlign:"center",padding:32,color:"#8e7ec0",fontSize:12}}>No {activeTab} tickets found.</div>
                  ):(
                    <div style={{display:"flex",flexDirection:"column",gap:0}}>
                      {filtered.map((t,i)=>(
                        <div key={t.id??i} onClick={()=>setSelTicket(t)}
                          style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",borderBottom:"1px solid rgba(124,58,237,0.06)",cursor:"pointer",background:selTicket?.id===t.id?"#faf9ff":"#fff",transition:"background 0.12s"}}
                          onMouseEnter={e=>(e.currentTarget.style.background="#faf9ff")}
                          onMouseLeave={e=>(e.currentTarget.style.background=selTicket?.id===t.id?"#faf9ff":"#fff")}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:{open:"#dc2626",pending:"#d97706",in_progress:"#d97706",closed:"#16a34a",resolved:"#16a34a"}[((t.status??"").toLowerCase()) as string]??"#94a3b8",marginTop:5,flexShrink:0}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                              <span style={{fontSize:12,fontWeight:700,color:"#18103a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title??"Untitled"}</span>
                              <PriorityBadge p={t.priority??""}/>
                            </div>
                            <div style={{fontSize:10.5,color:"#8e7ec0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.description??""}</div>
                            <div style={{fontSize:10,color:"#b8aed8",marginTop:3}}>{fmtDate(t.created_at)} · #{t.id}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: analytics + detail */}
              <div style={{display:"flex",flexDirection:"column",gap:10,minHeight:0}}>
                {/* Analytics carousel */}
                <div className="gx-card" style={{flexShrink:0,position:"relative",overflow:"hidden",minHeight:160}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#18103a"}}>Analytics</span>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>setCarouselIdx(i=>(i-1+carouselItems.length)%carouselItems.length)} style={{width:22,height:22,borderRadius:6,border:"1px solid rgba(124,58,237,0.15)",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#6d28d9" strokeWidth="2"><path d="M7 2L4 5l3 3"/></svg>
                      </button>
                      <button onClick={()=>setCarouselIdx(i=>(i+1)%carouselItems.length)} style={{width:22,height:22,borderRadius:6,border:"1px solid rgba(124,58,237,0.15)",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#6d28d9" strokeWidth="2"><path d="M3 2l3 3-3 3"/></svg>
                      </button>
                    </div>
                  </div>
                  <div style={{height:130}}>{carouselItems[carouselIdx]}</div>
                  <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:6}}>
                    {carouselItems.map((_,i)=>(
                      <div key={i} onClick={()=>setCarouselIdx(i)} style={{width:carouselIdx===i?16:6,height:6,borderRadius:3,background:carouselIdx===i?"#6d28d9":"#ede9fe",cursor:"pointer",transition:"all 0.2s"}}/>
                    ))}
                  </div>
                </div>

                {/* Common issues */}
                <div className="gx-card" style={{flexShrink:0}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#18103a",marginBottom:8}}>Common Issues</div>
                  {COMMON_ISSUES.map((issue,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:i<COMMON_ISSUES.length-1?"1px solid rgba(124,58,237,0.06)":"none"}}>
                      <div style={{width:20,height:20,borderRadius:6,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:9,fontWeight:700,color:"#0369a1"}}>{i+1}</span>
                      </div>
                      <span style={{fontSize:10.5,color:"#4a3870",fontWeight:500}}>{issue}</span>
                    </div>
                  ))}
                </div>

                {/* Ticket detail */}
                {selTicket&&(
                  <div className="gx-card" style={{flex:1,minHeight:0,overflowY:"auto"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#18103a"}}>Ticket Detail</span>
                      <button onClick={()=>setSelTicket(null)} style={{width:22,height:22,borderRadius:6,border:"1px solid rgba(124,58,237,0.15)",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#0369a1"}}>✕</button>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:"#18103a",marginBottom:4}}>{selTicket.title}</div>
                    <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                      <PriorityBadge p={selTicket.priority??""}/>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:5,background:"#f0eeff",color:"#0369a1",textTransform:"capitalize"}}>{selTicket.status}</span>
                    </div>
                    <div style={{fontSize:11,color:"#8e7ec0",marginBottom:10,lineHeight:1.5}}>{selTicket.description??""}</div>
                    {[["Ticket ID",`#${selTicket.id}`],["Created",fmtDate(selTicket.created_at)],["Updated",fmtDate(selTicket.updated_at)],["Category",selTicket.category??"—"]].map(([k,v])=>(
                      <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(124,58,237,0.06)"}}>
                        <span style={{fontSize:10.5,color:"#8e7ec0"}}>{k}</span>
                        <span style={{fontSize:10.5,color:"#18103a",fontWeight:600}}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div></div>

        {notifOpen&&<NotifPanel notifs={notifs} onRead={markRead} onMarkAll={markAllRead} onClose={()=>setNotifOpen(false)}/>}
      </div>
    </div>
  );
};

// ── Notification Panel (identical to OverviewPage) ────────────────────────────
const NICONS:Record<string,React.ReactNode>={
  warn:   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5.5V8M8 10.5v.5"/></svg>,
  error:  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M6 6l4 4M10 6l-4 4"/></svg>,
  info:   <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5.5v.5"/></svg>,
  success:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8.5l3.5 3.5 6.5-6.5"/></svg>,
  purple: <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>,
};
const NotifPanel:React.FC<{notifs:UINotif[];onRead:(id:number)=>void;onMarkAll:()=>void;onClose:()=>void}>=({notifs,onRead,onMarkAll,onClose})=>{
  const ref=useOutside<HTMLDivElement>(onClose);
  const unread=notifs.filter(n=>!n.read).length;
  return(
    <div className="gx-notif-panel" ref={ref}>
      <div className="gx-np-hdr">
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span className="gx-np-title">Notifications</span>
          <span className={`gx-np-unread${unread===0?" all-read":""}`}>{unread>0?`${unread} unread`:"All read"}</span>
        </div>
        <button className="gx-np-mark" onClick={onMarkAll}>Mark all as read</button>
      </div>
      <div className="gx-notif-list">
        {notifs.length===0&&<div style={{textAlign:"center",padding:20,color:"#8e7ec0",fontSize:12}}>No notifications.</div>}
        {notifs.map(n=>(
          <div key={n.id} className={`gx-ni${n.read?"":" unread"}`} onClick={()=>onRead(n.id)}>
            <div className={`gx-ni-ico ni-${n.type}`}>{NICONS[n.type]}</div>
            <div className="gx-ni-body"><div className="gx-ni-title">{n.title}</div><div className="gx-ni-desc">{n.desc}</div><div className="gx-ni-time">{n.time}</div></div>
            {!n.read&&<div className="gx-ni-dot"/>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RetailTicketsPage;
