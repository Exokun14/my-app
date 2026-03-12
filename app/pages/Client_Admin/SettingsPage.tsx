'use client'
/**
 * SettingsPage.tsx  —  F&B / Popeyes
 *
 * WHAT CHANGED vs original:
 *  ✓ Added:   notificationsAPI wired for notification panel
 *  ✓ Added:   Profile section now reads from propUser (AuthUser) instead of
 *             hardcoded name/email constants
 *  ✓ Kept:    All toggle/section UI, local state for settings unchanged
 *             (no settings API endpoint exists yet — toggles remain local)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header  from "../Header_Client/header_client";
import "../../globals.css";
import {
  notificationsAPI, formatRole,
  type AuthUser, type Notification,
} from "../../Services/api.service";

type CPView = "overview"|"tickets"|"users"|"settings"|"learning";
type SettingsSection = "general"|"notifications"|"security"|"integrations"|"profile"|"billing";

interface UINotif {
  id:number; type:"warn"|"error"|"info"|"success"|"purple";
  title:string; desc:string; time:string; read:boolean;
}

const initials=(name:string)=>{const p=(name??"").trim().split(/\s+/);return p.length===1?p[0].slice(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();};
const toUINotif=(n:Notification):UINotif=>({
  id:n.id??0,
  type:({warning:"warn",alert:"error",info:"info",success:"success"} as Record<string,UINotif["type"]>)[n.type??"info"]??"info",
  title:n.title??"Notification",desc:n.message,
  time:n.created_at?new Date(n.created_at).toLocaleDateString():"",read:n.read??false,
});
function useOutside<T extends HTMLElement>(cb:()=>void){
  const ref=useRef<T>(null);
  useEffect(()=>{const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))cb();};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[cb]);
  return ref;
}

interface Props{onNavigate:(v:CPView)=>void;onLogout?:()=>void;user?:AuthUser|null;}

const SettingsPage:React.FC<Props>=({onNavigate,onLogout,user:propUser})=>{
  const [notifs,    setNotifs]    = useState<UINotif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [section,   setSection]   = useState<SettingsSection>("general");
  const [darkMode,  setDarkMode]  = useState(false);
  const [toast,     setToast]     = useState({msg:"",show:false});

  // notification toggles (local only)
  const [emailAlerts,    setEmailAlerts]    = useState(true);
  const [smsAlerts,      setSmsAlerts]      = useState(false);
  const [systemAlerts,   setSystemAlerts]   = useState(true);
  const [weeklyReport,   setWeeklyReport]   = useState(true);
  const [maintenanceNote,setMaintenanceNote]= useState(false);

  const showToast=(m:string)=>{setToast({msg:m,show:true});setTimeout(()=>setToast(t=>({...t,show:false})),2600);};

  const headerUser={
    initials:propUser?initials(propUser.name):"??",
    name:propUser?.name??"User",
    role:formatRole(propUser?.role)??"User",
  };

  // ── FETCH NOTIFICATIONS ───────────────────────────────────
  const loadNotifs=useCallback(async()=>{
    const res=await notificationsAPI.getAll();
    if(res.success&&res.data) setNotifs(res.data.map(toUINotif));
  },[]);
  useEffect(()=>{loadNotifs();},[loadNotifs]);

  const markRead=async(id:number)=>{await notificationsAPI.markRead(id);setNotifs(ns=>ns.map(n=>n.id===id?{...n,read:true}:n));};
  const markAllRead=async()=>{await notificationsAPI.markAllRead();setNotifs(ns=>ns.map(n=>({...n,read:true})));};

  const unread=notifs.filter(n=>!n.read).length;

  const Toggle:React.FC<{on:boolean;onChange:(v:boolean)=>void}>=({on,onChange})=>(
    <div onClick={()=>onChange(!on)} style={{width:36,height:20,borderRadius:10,background:on?"#6d28d9":"#d1d5db",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
      <div style={{position:"absolute",top:2,left:on?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
    </div>
  );

  const NAV_ITEMS:Array<{key:SettingsSection;label:string;icon:React.ReactNode}> = [
    {key:"general",      label:"General",      icon:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"/></svg>},
    {key:"notifications",label:"Notifications",icon:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6a5 5 0 0110 0v4l1.5 2h-13L3 10V6z"/><path d="M6.5 13.5a1.5 1.5 0 003 0"/></svg>},
    {key:"security",     label:"Security",     icon:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1.5L2 4v5c0 3.5 2.5 5.5 6 6.5 3.5-1 6-3 6-6.5V4z"/></svg>},
    {key:"integrations", label:"Integrations", icon:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>},
    {key:"profile",      label:"Profile",      icon:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 13s2.5-4 6-4 6 4 6 4"/><circle cx="8" cy="6" r="2.5"/></svg>},
    {key:"billing",      label:"Billing",      icon:<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="11" rx="1.5"/><path d="M1 7h14"/></svg>},
  ];

  return(
    <div style={{display:"flex",height:"100vh",background:"var(--bg)",overflow:"hidden"}}>
      <Sidebar activePage="settings" onNavigate={onNavigate as (v:string)=>void}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <Header user={headerUser} notificationCount={unread} onNotificationClick={()=>setNotifOpen(o=>!o)} onLogout={onLogout}/>
        <div className="gx-main"><div className="gx-view">
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:10,padding:"14px 20px",overflow:"hidden",minHeight:0}}>
            <div style={{fontSize:18,fontWeight:800,color:"#18103a",flexShrink:0}}>Settings</div>

            <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:10,flex:1,minHeight:0}}>
              {/* NAV */}
              <div className="gx-card" style={{padding:"8px",display:"flex",flexDirection:"column",gap:2}}>
                {NAV_ITEMS.map(item=>(
                  <button key={item.key} onClick={()=>setSection(item.key)}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,border:"none",background:section===item.key?"#ede9fe":"transparent",color:section===item.key?"#6d28d9":"#4a3870",cursor:"pointer",fontSize:11.5,fontWeight:section===item.key?700:500,transition:"all 0.15s",textAlign:"left"}}>
                    <span style={{color:section===item.key?"#6d28d9":"#8e7ec0"}}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* CONTENT */}
              <div className="gx-card" style={{overflowY:"auto"}}>
                {section==="general"&&(
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#18103a",marginBottom:14}}>General Settings</div>
                    {[["Dark Mode","Enable dark mode across the portal",darkMode,setDarkMode],["Compact View","Use compact spacing in tables","false" as unknown as boolean,(v:boolean)=>v]] .map(([label,desc,val,setter])=>(
                      <div key={label as string} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid rgba(124,58,237,0.06)"}}>
                        <div><div style={{fontSize:12.5,fontWeight:600,color:"#18103a"}}>{label as string}</div><div style={{fontSize:11,color:"#8e7ec0",marginTop:2}}>{desc as string}</div></div>
                        <Toggle on={label==="Dark Mode"?darkMode:false} onChange={v=>{if(label==="Dark Mode")setDarkMode(v);}}/>
                      </div>
                    ))}
                  </div>
                )}
                {section==="notifications"&&(
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#18103a",marginBottom:14}}>Notification Preferences</div>
                    {[
                      ["Email Alerts","Receive ticket and system alerts via email",emailAlerts,setEmailAlerts],
                      ["SMS Alerts","Receive critical alerts via SMS",smsAlerts,setSmsAlerts],
                      ["System Alerts","In-portal system notifications",systemAlerts,setSystemAlerts],
                      ["Weekly Report","Receive weekly summary report",weeklyReport,setWeeklyReport],
                      ["Maintenance Notices","Get notified of scheduled maintenance",maintenanceNote,setMaintenanceNote],
                    ].map(([label,desc,val,setter])=>(
                      <div key={label as string} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid rgba(124,58,237,0.06)"}}>
                        <div><div style={{fontSize:12.5,fontWeight:600,color:"#18103a"}}>{label as string}</div><div style={{fontSize:11,color:"#8e7ec0",marginTop:2}}>{desc as string}</div></div>
                        <Toggle on={val as boolean} onChange={setter as (v:boolean)=>void}/>
                      </div>
                    ))}
                    <button className="btn btn-p btn-sm" style={{marginTop:14}} onClick={()=>showToast("Notification preferences saved!")}>Save Preferences</button>
                  </div>
                )}
                {section==="security"&&(
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#18103a",marginBottom:14}}>Security Settings</div>
                    <div style={{padding:"12px 0",borderBottom:"1px solid rgba(124,58,237,0.06)"}}>
                      <div style={{fontSize:12.5,fontWeight:600,color:"#18103a",marginBottom:8}}>Change Password</div>
                      {["Current Password","New Password","Confirm New Password"].map(p=>(
                        <input key={p} type="password" placeholder={p}
                          style={{width:"100%",padding:"9px 12px",border:"1.5px solid rgba(124,58,237,0.12)",borderRadius:10,fontSize:12,color:"#3b1f7a",background:"#f8f7ff",outline:"none",fontFamily:"inherit",marginBottom:8}}/>
                      ))}
                      <button className="btn btn-p btn-sm" onClick={()=>showToast("Password updated!")}>Update Password</button>
                    </div>
                  </div>
                )}
                {section==="profile"&&(
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:"#18103a",marginBottom:14}}>Profile</div>
                    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18,padding:"14px",background:"#f8f7ff",borderRadius:12,border:"1px solid rgba(124,58,237,0.1)"}}>
                      <div style={{width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#6d28d9,#0f766e)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",flexShrink:0}}>
                        {propUser?initials(propUser.name):"??"}
                      </div>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:"#18103a"}}>{propUser?.name??"—"}</div>
                        <div style={{fontSize:11.5,color:"#8e7ec0"}}>{propUser?.email??"—"}</div>
                        <div style={{fontSize:10,marginTop:3}}><span style={{background:"#ede9fe",color:"#6d28d9",padding:"2px 8px",borderRadius:5,fontWeight:700,fontSize:9.5}}>{formatRole(propUser?.role)}</span></div>
                      </div>
                    </div>
                    {[["Full Name",propUser?.name??""],["Email",propUser?.email??""],["Phone",propUser?.phone??""],["Position",propUser?.position??""]].map(([label,val])=>(
                      <div key={label} style={{marginBottom:10}}>
                        <label style={{fontSize:12,fontWeight:600,color:"rgba(0,0,0,0.4)",marginBottom:5,display:"block"}}>{label}</label>
                        <input defaultValue={val} style={{width:"100%",padding:"9px 12px",border:"1.5px solid rgba(124,58,237,0.12)",borderRadius:10,fontSize:12.5,color:"#3b1f7a",background:"#f8f7ff",outline:"none",fontFamily:"inherit"}}/>
                      </div>
                    ))}
                    <button className="btn btn-p btn-sm" style={{marginTop:6}} onClick={()=>showToast("Profile updated!")}>Save Profile</button>
                  </div>
                )}
                {(section==="integrations"||section==="billing")&&(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:48,color:"#8e7ec0",textAlign:"center"}}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#d4ccf0" strokeWidth="1.5" style={{marginBottom:12}}><circle cx="20" cy="20" r="18"/><path d="M14 26s1.5-3 6-3 6 3 6 3M20 18a3 3 0 100-6 3 3 0 000 6z"/></svg>
                    <div style={{fontSize:13,fontWeight:600,color:"#4a3870",marginBottom:4}}>{section.charAt(0).toUpperCase()+section.slice(1)}</div>
                    <div style={{fontSize:11,color:"#b8aed8"}}>This section is coming soon.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div></div>

        <div className={`gx-toast${toast.show?" show":""}`}><div className="gx-toast-dot"/><span>{toast.msg}</span></div>
        {notifOpen&&<NotifPanel notifs={notifs} onRead={markRead} onMarkAll={markAllRead} onClose={()=>setNotifOpen(false)}/>}
      </div>
    </div>
  );
};

// ── Notification Panel ────────────────────────────────────────────────────────
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

export default SettingsPage;
