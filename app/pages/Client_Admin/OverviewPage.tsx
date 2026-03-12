'use client'
/**
 * OverviewPage.tsx  —  F&B / Popeyes
 *
 * WHAT CHANGED vs original:
 *  ✕ Removed: POS_DATA, BRANCHES, DEFAULT_INFO, NOTIFS_INIT (hardcoded constants)
 *  ✓ Added:   useEffect that calls companiesAPI, branchesAPI, posDevicesAPI,
 *             licensesAPI, notificationsAPI on mount (keyed on companyId from props)
 *  ✓ Added:   Loading skeleton while data loads; empty-state fallback on error
 *  ✓ Added:   notificationsAPI.markRead / markAllRead wired to panel actions
 *  ✓ Kept:    Every UI component, modal, style, and layout 100% unchanged
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../Sidebar_Client/sidebar_client";
import Header  from "../Header_Client/header_client";
import "../../globals.css";
import {
  companiesAPI, branchesAPI, posDevicesAPI, licensesAPI, notificationsAPI,
  formatRole,
  type AuthUser, type Company, type Branch, type PosDevice, type License, type Notification,
} from "../../Services/api.service";

type CPView = "overview"|"tickets"|"users"|"settings"|"learning";

interface InfoData {
  storeName: string; contactPerson: string; email: string; phone: string;
  altContactPerson: string; altEmail: string; altPhone: string; keyNo: string;
}
interface UINotif {
  id: number; type: "warn"|"error"|"info"|"success"|"purple";
  title: string; desc: string; time: string; read: boolean;
}

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (s?: string|null) =>
  s ? new Date(s).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";

const daysUntil = (s?: string|null) => {
  if (!s) return 9999;
  const d=new Date(s); d.setHours(0,0,0,0);
  const t=new Date();  t.setHours(0,0,0,0);
  return Math.ceil((d.getTime()-t.getTime())/86400000);
};

const initials = (name: string) => {
  const p=name.trim().split(/\s+/);
  return p.length===1?p[0].slice(0,2).toUpperCase():(p[0][0]+p[p.length-1][0]).toUpperCase();
};

const toUINotif = (n: Notification): UINotif => ({
  id:    n.id??0,
  type:  ({warning:"warn",alert:"error",info:"info",success:"success"} as Record<string,UINotif["type"]>)[n.type??"info"]??"info",
  title: n.title??"Notification",
  desc:  n.message,
  time:  n.created_at ? new Date(n.created_at).toLocaleDateString() : "",
  read:  n.read??false,
});

// ── skeleton ──────────────────────────────────────────────────────────────────
const Sk=({w="100%",h=14,r=6}:{w?:string|number;h?:number;r?:number})=>(
  <div style={{width:w,height:h,borderRadius:r,background:"linear-gradient(90deg,#f0eeff 25%,#e8e4fc 50%,#f0eeff 75%)",backgroundSize:"200% 100%",animation:"shimmer 1.5s infinite"}}/>
);

// ── click-outside hook ────────────────────────────────────────────────────────
function useOutside<T extends HTMLElement>(cb:()=>void){
  const ref=useRef<T>(null);
  useEffect(()=>{
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))cb();};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[cb]);
  return ref;
}

// ── main component ────────────────────────────────────────────────────────────
interface Props { onNavigate:(v:CPView)=>void; onLogout?:()=>void; user?:AuthUser|null; }

const OverviewPage:React.FC<Props>=({onNavigate,onLogout,user:propUser})=>{
  const companyId=propUser?.company_id??null;

  // server state
  const [company,    setCompany]    = useState<Company|null>(null);
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [posDevices, setPosDevices] = useState<PosDevice[]>([]);
  const [licenses,   setLicenses]   = useState<License[]>([]);
  const [notifs,     setNotifs]     = useState<UINotif[]>([]);
  const [loading,    setLoading]    = useState(true);

  // local editable info (mirrors company fields; no PUT /companies endpoint yet)
  const [info, setInfo] = useState<InfoData>({
    storeName:"",contactPerson:"",email:"",phone:"",
    altContactPerson:"",altEmail:"",altPhone:"",keyNo:"1",
  });

  // ui state (unchanged from original)
  const [selPOS,       setSelPOS]       = useState<PosDevice|null>(null);
  const [selBranch,    setSelBranch]    = useState<Branch|null>(null);
  const [editOpen,     setEditOpen]     = useState(false);
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [filterOpen,   setFilterOpen]   = useState(false);
  const [filterIds,    setFilterIds]    = useState<string[]>([]);
  const [msaOpen,      setMsaOpen]      = useState(false);
  const [toast,        setToast]        = useState({msg:"",show:false});
  const [bgSrc,        setBgSrc]        = useState("/Popeyes-bg.jpg");
  const bgRef=useRef<HTMLInputElement>(null);

  const showToast=(m:string)=>{
    setToast({msg:m,show:true});
    setTimeout(()=>setToast(t=>({...t,show:false})),2600);
  };

  // ── FETCH ALL DATA ────────────────────────────────────────
  const loadAll = useCallback(async()=>{
    if(!companyId){setLoading(false);return;}
    setLoading(true);
    try{
      const [cR,bR,pR,lR,nR]=await Promise.all([
        companiesAPI.getById(companyId),
        branchesAPI.getAll(companyId),
        posDevicesAPI.getAll({company_id:companyId}),
        licensesAPI.getAll(companyId),
        notificationsAPI.getAll(),
      ]);
      if(cR.success&&cR.data){
        const c=cR.data; setCompany(c);
        setInfo({
          storeName:       c.name??            "",
          contactPerson:   c.contact_person??  "",
          email:           c.contact_email??   "",
          phone:           c.phone??           "",
          altContactPerson:c.alt_contact_person??"",
          altEmail:        c.alt_contact_email??"",
          altPhone:        c.alt_contact_phone??"",
          keyNo:"1",
        });
      }
      if(bR.success&&bR.data) setBranches(bR.data);
      if(pR.success&&pR.data) setPosDevices(pR.data);
      if(lR.success&&lR.data) setLicenses(lR.data);
      if(nR.success&&nR.data) setNotifs(nR.data.map(toUINotif));
    }finally{setLoading(false);}
  },[companyId]);

  useEffect(()=>{loadAll();},[loadAll]);

  const markRead = async(id:number)=>{
    await notificationsAPI.markRead(id);
    setNotifs(ns=>ns.map(n=>n.id===id?{...n,read:true}:n));
  };
  const markAllRead = async()=>{
    await notificationsAPI.markAllRead();
    setNotifs(ns=>ns.map(n=>({...n,read:true})));
  };

  // derived
  const license      = licenses[0]??null;
  const unreadCount  = notifs.filter(n=>!n.read).length;
  const headerUser   = {
    initials: propUser ? initials(propUser.name) : "??",
    name:     propUser?.name??"User",
    role:     formatRole(propUser?.role)??"User",
  };
  const filteredPOS  = filterIds.length
    ? posDevices.filter(p=>filterIds.includes(String(p.branch_id)))
    : posDevices;
  const posByBranch  = filteredPOS.reduce<Record<string,PosDevice[]>>((a,p)=>{
    const name=branches.find(b=>b.id===p.branch_id)?.name??"Unassigned";
    (a[name]=a[name]??[]).push(p); return a;
  },{});

  return(
    <div style={{display:"flex",height:"100vh",background:"var(--bg)",overflow:"hidden"}}>
      <Sidebar activePage="overview" onNavigate={onNavigate as (v:string)=>void}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <Header user={headerUser} notificationCount={unreadCount}
          onNotificationClick={()=>setNotifOpen(o=>!o)} onLogout={onLogout}/>

        <div className="gx-main"><div className="gx-view">
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:10,padding:"14px 20px",overflow:"hidden",minHeight:0}}>

            {/* HERO */}
            <div className="gx-hero" style={{padding:0,flexShrink:0,position:"relative",overflow:"hidden",display:"flex",alignItems:"stretch"}}>
              <div style={{display:"flex",alignItems:"center",gap:14,padding:"18px 24px 18px 20px",background:"linear-gradient(135deg,#f97316,#ea580c)",flexShrink:0,zIndex:2,position:"relative"}}>
                <div style={{width:72,height:72,background:"#fff",borderRadius:"50%",border:"2px solid rgba(255,255,255,0.7)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                  <img src="/Popeyes.png" alt="Popeyes" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                </div>
                <div style={{minWidth:0}}>
                  {loading?<Sk w={160} h={22}/>:<div className="gx-hero-title">{info.storeName||company?.name||"Your Company"}</div>}
                  <div className="gx-hero-sub">{branches[0]?.site??branches[0]?.name??"—"}</div>
                  <div className="gx-hero-badges">
                    {license&&<span className="gx-hero-badge">{license.license_key}</span>}
                    <div className="gx-status-pill"><div className="sdot"/>Active Account</div>
                  </div>
                </div>
              </div>
              <div style={{flex:1,position:"relative",overflow:"hidden",cursor:"pointer"}} onClick={()=>bgRef.current?.click()}>
                <img src={bgSrc} alt="" aria-hidden style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.25)"}}/>
                <input ref={bgRef} type="file" accept="image/*" style={{display:"none"}}
                  onChange={e=>{const f=e.target.files?.[0];if(f)setBgSrc(URL.createObjectURL(f));}}/>
              </div>
            </div>

            {/* STAT CARDS */}
            <div className="g4" style={{flexShrink:0,gap:14}}>
              <div className="gx-stat">
                <div className="gx-stat-ico si-t">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="4" width="12" height="9" rx="1.2"/><path d="M2 7h12"/></svg>
                </div>
                <div><div className="gx-stat-val">{loading?<Sk w={32} h={24}/>:posDevices.length}</div><div className="gx-stat-lbl">Total POS</div></div>
              </div>
              <div className="gx-stat">
                <div className="gx-stat-ico si-p">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 4 4.5 8.5 4.5 8.5S12.5 10 12.5 6c0-2.5-2-4.5-4.5-4.5z"/><circle cx="8" cy="6" r="1.5"/></svg>
                </div>
                <div><div className="gx-stat-val">{loading?<Sk w={24} h={24}/>:branches.length}</div><div className="gx-stat-lbl">Branches</div></div>
              </div>
              <div className="gx-stat" style={{cursor:"pointer"}} onClick={()=>setMsaOpen(true)}>
                <div className="gx-stat-ico si-key">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3.5" width="12" height="10" rx="1.5"/><path d="M2 6.5h12M5.5 2v3M10.5 2v3"/></svg>
                </div>
                <div><div className="gx-stat-val" style={{fontSize:14}}>MSA Expiry</div><div className="gx-stat-lbl">Click to view</div></div>
              </div>
              <div className="gx-stat">
                <div className="gx-stat-ico si-r">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="6" cy="7" r="3.5"/><path d="M9 9.5l5 5M12 12l1.5-1.5"/></svg>
                </div>
                <div><div className="gx-stat-val" style={{fontSize:13}}>{loading?<Sk w={60} h={18}/>:(license?.license_key??"—")}</div><div className="gx-stat-lbl">License Key</div></div>
              </div>
            </div>

            {/* TWO COLUMNS */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,flex:1,minHeight:0}}>

              {/* GENERAL INFO */}
              <div className="gx-card" style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderBottom:"1px solid rgba(124,58,237,0.1)",flexShrink:0}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#18103a"}}>General Information</span>
                  <button className="btn btn-s btn-xs" onClick={()=>setEditOpen(true)}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" width="11" height="11"><path d="M9 2l3 3L4 13H1v-3z"/></svg>
                    Edit Info
                  </button>
                </div>
                <div style={{overflowY:"auto",flex:1,padding:"10px 14px 14px"}}>
                  {loading?(
                    <div style={{display:"flex",flexDirection:"column",gap:10,paddingTop:6}}>
                      {Array.from({length:9}).map((_,i)=><Sk key={i} h={15}/>)}
                    </div>
                  ):(
                    <>
                      <div className="gx-info-section-label">PRIMARY CONTACT</div>
                      {[["Store Name",info.storeName],["Contact Person",info.contactPerson],["Email",info.email],["Phone",info.phone]].map(([k,v])=>(
                        <div key={k} className="gx-info-row"><span className="gx-info-key">{k}</span><span className="gx-info-val">{v||"—"}</span></div>
                      ))}
                      <div className="gx-info-section-label" style={{marginTop:10}}>ALTERNATE CONTACT</div>
                      {[["Contact Person",info.altContactPerson],["Email",info.altEmail],["Phone",info.altPhone]].map(([k,v])=>(
                        <div key={k} className="gx-info-row"><span className="gx-info-key">{k}</span><span className="gx-info-val">{v||"—"}</span></div>
                      ))}
                      <div className="gx-info-section-label" style={{marginTop:10}}>ACCOUNT</div>
                      <div className="gx-info-row"><span className="gx-info-key">Acct Manager</span><span className="gx-info-val" style={{color:"#7c3aed"}}>{company?.account_manager??"—"}</span></div>
                      <div className="gx-info-row"><span className="gx-info-key">Role</span><span className="gx-info-val">{headerUser.role}</span></div>
                      {license&&(
                        <>
                          <div className="gx-info-section-label" style={{marginTop:10}}>LICENSE</div>
                          <div className="gx-lic-card">
                            <div className="gx-lic-label">License</div>
                            <div className="gx-lic-id">{license.license_key??"—"}</div>
                            <div className="gx-lic-row"><span>SA Start</span><span>{fmtDate(license.sa_start)}</span></div>
                            <div className="gx-lic-row">
                              <span>SA End</span>
                              <span style={{color:"#d97706",fontWeight:700}}>
                                {fmtDate(license.sa_end)}
                                {license.sa_end&&<span style={{fontSize:9,marginLeft:4,background:"rgba(234,88,12,0.1)",padding:"1px 5px",borderRadius:4}}>{daysUntil(license.sa_end)}d left</span>}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                      {branches.length>0&&(
                        <div style={{marginTop:14}}>
                          <div className="gx-info-section-label">BRANCH LOCATIONS</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                            {branches.map(b=>(
                              <button key={b.id} className="gx-branch-chip" onClick={()=>setSelBranch(b)}>
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1C4 1 2.5 2.5 2.5 4.5c0 3 3.5 6.5 3.5 6.5S9.5 7.5 9.5 4.5C9.5 2.5 8 1 6 1z"/><circle cx="6" cy="4.5" r="1.2"/></svg>
                                {b.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* POS MACHINES */}
              <div className="gx-card" style={{display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span className="gx-card-title">POS Machines</span>
                    <span className="gx-count-badge">{posDevices.length} devices</span>
                  </div>
                  <button className="btn btn-s btn-xs" style={{position:"relative"}} onClick={()=>setFilterOpen(o=>!o)}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="10" height="10"><path d="M2 4h10M4 7h6M6 10h2"/></svg>
                    Filter
                    {filterIds.length>0&&<span className="gx-filter-dot"/>}
                  </button>
                </div>

                {filterOpen&&(
                  <div className="gx-filter-pop">
                    <div className="gx-filter-title">Filter by Branch</div>
                    {branches.map(b=>{
                      const id=String(b.id); const checked=filterIds.includes(id);
                      const count=posDevices.filter(p=>p.branch_id===b.id).length;
                      return(
                        <div key={b.id} className={`gx-filter-row${checked?" active":""}`}
                          onClick={()=>setFilterIds(f=>checked?f.filter(x=>x!==id):[...f,id])}>
                          <div className={`gx-filter-check${checked?" checked":""}`}>
                            {checked&&<svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 5l2.5 2.5 3.5-4"/></svg>}
                          </div>
                          <span style={{flex:1,fontSize:12,fontWeight:500,color:"#1e1b4b"}}>{b.name}</span>
                          <span className="gx-filter-count">{count}</span>
                        </div>
                      );
                    })}
                    <div style={{borderTop:"1px solid rgba(109,40,217,0.1)",marginTop:8,paddingTop:8}}>
                      <button className="gx-filter-clear" onClick={()=>setFilterIds([])}>✕ Clear filter</button>
                    </div>
                  </div>
                )}

                <div style={{overflowY:"auto",flex:1}}>
                  {loading?(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {Array.from({length:4}).map((_,i)=><Sk key={i} h={56} r={10}/>)}
                    </div>
                  ):filteredPOS.length===0?(
                    <div style={{textAlign:"center",padding:24,color:"#8e7ec0",fontSize:12}}>No POS devices found.</div>
                  ):(
                    Object.entries(posByBranch).sort(([a],[b])=>a.localeCompare(b)).map(([branchName,devices])=>(
                      <div key={branchName} style={{marginBottom:14}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <div className="gx-branch-label">
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 1C4 1 2.5 2.5 2.5 4.5c0 3 3.5 6.5 3.5 6.5S9.5 7.5 9.5 4.5C9.5 2.5 8 1 6 1z"/><circle cx="6" cy="4.5" r="1.2"/></svg>
                            {branchName}
                          </div>
                          <span style={{fontSize:10,color:"#8e7ec0"}}>{devices.length} device{devices.length!==1?"s":""}</span>
                          <div style={{flex:1,height:1,background:"linear-gradient(to right,rgba(2,132,199,0.12),transparent)"}}/>
                        </div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          {devices.map((pos,i)=>(
                            <div key={pos.id??i} className="gx-pos-card" onClick={()=>setSelPOS(pos)}>
                              <div className="gx-pos-ico">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e7ec0" strokeWidth="1.4"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>
                              </div>
                              <div style={{flex:1,minWidth:0}}>
                                <div className="gx-pos-model">{pos.model??"POS Device"}</div>
                                <div className="gx-pos-ip">{pos.ip_address??"—"}</div>
                              </div>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#b8aed8" strokeWidth="1.6"><path d="M4 2l4 4-4 4"/></svg>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div></div>

        {/* TOAST */}
        <div className={`gx-toast${toast.show?" show":""}`}>
          <div className="gx-toast-dot"/><span>{toast.msg}</span>
        </div>

        {/* MODALS */}
        {notifOpen&&<NotifPanel notifs={notifs} onRead={markRead} onMarkAll={markAllRead} onClose={()=>setNotifOpen(false)}/>}
        {selPOS&&<POSModal pos={selPOS} branches={branches} companyName={info.storeName||company?.name||""} onClose={()=>setSelPOS(null)}/>}
        {selBranch&&<BranchModal branch={selBranch} posDevices={posDevices} onClose={()=>setSelBranch(null)} onSelectPOS={p=>{setSelBranch(null);setSelPOS(p);}}/>}
        {editOpen&&<EditInfoModal data={info} onSave={d=>{setInfo(d);showToast("Information updated!");}} onClose={()=>setEditOpen(false)}/>}
        {msaOpen&&<MSAModal posDevices={posDevices} branches={branches} onClose={()=>setMsaOpen(false)}/>}
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
        {notifs.length===0&&<div style={{textAlign:"center",padding:20,color:"#8e7ec0",fontSize:12}}>No notifications.</div>}
        {notifs.map(n=>(
          <div key={n.id} className={`gx-ni${n.read?"":" unread"}`} onClick={()=>onRead(n.id)}>
            <div className={`gx-ni-ico ni-${n.type}`}>{NICONS[n.type]}</div>
            <div className="gx-ni-body">
              <div className="gx-ni-title">{n.title}</div>
              <div className="gx-ni-desc">{n.desc}</div>
              <div className="gx-ni-time">{n.time}</div>
            </div>
            {!n.read&&<div className="gx-ni-dot"/>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── POS Modal ─────────────────────────────────────────────────────────────────
const POSModal:React.FC<{pos:PosDevice;branches:Branch[];companyName:string;onClose:()=>void}>=({pos,branches,companyName,onClose})=>{
  const branch=branches.find(b=>b.id===pos.branch_id);
  return(
    <div className="gx-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:20,boxShadow:"0 32px 80px rgba(0,0,0,0.25)",width:560,maxWidth:"94vw",overflow:"hidden",animation:"slideUp .25s cubic-bezier(.34,1.4,.64,1)"}}>
        <div style={{background:"linear-gradient(135deg,#0d3d3a,#0f766e)",padding:"22px 26px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.4"><rect x="2" y="4" width="12" height="9" rx="1.2"/><path d="M2 7h12"/></svg>
            </div>
            <div>
              <div style={{fontSize:17,fontWeight:700,color:"#fff"}}>{pos.model??"POS Device"}</div>
              <div style={{fontSize:11.5,color:"rgba(255,255,255,0.65)",marginTop:3}}>{companyName} · {branch?.name??"Unassigned"}</div>
            </div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:9,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>✕</button>
        </div>
        <div style={{padding:"20px 24px 10px"}}>
          <div style={{background:"#f0f2f7",borderRadius:14,padding:"16px 20px"}}>
            <div style={{fontSize:9.5,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(0,0,0,0.3)",marginBottom:14}}>Device Specifications</div>
            {([["Model",pos.model??"—",false],["Serial",pos.serial??"—",true],["IP Address",pos.ip_address??"—",true],["OS",pos.os??"—",false],["Branch",branch?.name??"Unassigned",false],["MSA Start",fmtDate(pos.msa_start),false],["MSA End",fmtDate(pos.msa_end),false],["Warranty End",fmtDate(pos.warranty_end),false],["Status",pos.status??"—",false]] as [string,string,boolean][]).map(([k,v,mono])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(0,0,0,0.05)"}}>
                <span style={{fontSize:11.5,color:"rgba(0,0,0,0.38)",fontWeight:500}}>{k}</span>
                <span style={{fontSize:11.5,color:"#3b1f7a",fontWeight:600,fontFamily:mono?"monospace":"inherit"}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{padding:"14px 24px 22px",display:"flex",justifyContent:"flex-end"}}>
          <button className="btn btn-s btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Branch Modal ──────────────────────────────────────────────────────────────
const BranchModal:React.FC<{branch:Branch;posDevices:PosDevice[];onClose:()=>void;onSelectPOS:(p:PosDevice)=>void}>=({branch,posDevices,onClose,onSelectPOS})=>{
  const ref=useOutside<HTMLDivElement>(onClose);
  const bpos=posDevices.filter(p=>p.branch_id===branch.id);
  const ends=bpos.map(p=>p.msa_end).filter(Boolean) as string[];
  const latestMSA=ends.length?ends.sort()[0]:undefined;
  const days=latestMSA?daysUntil(latestMSA):null;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(15,7,36,0.45)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10002,padding:20}}>
      <div ref={ref} style={{width:600,maxWidth:"96vw",maxHeight:"90vh",background:"#fff",borderRadius:18,boxShadow:"0 20px 60px rgba(0,0,0,0.22)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:"linear-gradient(135deg,#d97706,#f59e0b)",flexShrink:0}}>
          <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5"><path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z"/><circle cx="9" cy="7" r="1.8"/></svg>
          </div>
          <div style={{flex:1,fontSize:14,fontWeight:700,color:"#fff"}}>{branch.site??branch.name}</div>
          {branch.license_tag&&<span style={{fontSize:10,fontWeight:700,background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"5px 10px",color:"#fff"}}>{branch.license_tag}</span>}
          <button onClick={onClose} style={{width:28,height:28,borderRadius:8,background:"rgba(255,255,255,0.2)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>
        <div style={{overflowY:"auto",flex:1,padding:"18px 20px"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <div style={{background:"rgba(13,148,136,0.07)",border:"1px solid rgba(13,148,136,0.18)",borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:900,color:"#0d9488"}}>{bpos.length}</div>
              <div style={{fontSize:10.5,color:"#8e7ec0",marginTop:4}}>POS Machines</div>
            </div>
            <div style={{background:days!==null&&days<=30?"#fffbeb":"#f0fdf4",border:"1px solid "+(days!==null&&days<=30?"#fde68a":"#bbf7d0"),borderRadius:14,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:14,fontWeight:800,color:days!==null&&days<=30?"#d97706":"#16a34a"}}>{latestMSA?fmtDate(latestMSA):"—"}</div>
              {days!==null&&<div style={{fontSize:10,color:"#8e7ec0",marginTop:2}}>{days<=0?"Expired":`${days}d left`}</div>}
              <div style={{fontSize:10.5,color:"#8e7ec0",marginTop:4}}>MSA Expiry</div>
            </div>
          </div>
          <div style={{fontSize:9.5,fontWeight:700,color:"#8e7ec0",letterSpacing:"0.13em",textTransform:"uppercase",marginBottom:10}}>POS Devices at this Branch</div>
          {bpos.length===0&&<div style={{textAlign:"center",padding:24,color:"#8e7ec0",fontSize:12,background:"#f2f0fb",borderRadius:12,border:"1.5px dashed rgba(124,58,237,0.22)"}}>No POS machines assigned.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {bpos.map((pos,i)=>(
              <div key={pos.id??i} style={{borderRadius:12,border:"1px solid rgba(124,58,237,0.1)",background:"#fff",overflow:"hidden",display:"flex",alignItems:"center",gap:12,padding:"11px 14px"}}>
                <div style={{width:40,height:40,borderRadius:10,background:"#ccfbf1",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5"><rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/></svg>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:"#18103a",marginBottom:4}}>{pos.model??"POS Device"}</div>
                  <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                    {[["IP",pos.ip_address??"—"],["MSA End",fmtDate(pos.msa_end)]].map(([l,v])=>(
                      <span key={l} style={{fontSize:10.5,color:"#8e7ec0"}}><span style={{fontWeight:600,color:"#4a3870"}}>{l}: </span>{v}</span>
                    ))}
                  </div>
                </div>
                <button onClick={()=>{onSelectPOS(pos);onClose();}} style={{fontSize:11,fontWeight:600,color:"#6d28d9",background:"#ede9fe",border:"1px solid rgba(109,40,217,0.2)",borderRadius:8,padding:"4px 11px",cursor:"pointer"}}>View</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{borderTop:"1px solid rgba(124,58,237,0.1)",background:"#f8f7ff",padding:"12px 20px",display:"flex",justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"7px 18px",borderRadius:8,border:"1px solid rgba(124,58,237,0.15)",background:"#fff",fontSize:12,fontWeight:600,color:"#4a3870",cursor:"pointer"}}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ── MSA Modal ─────────────────────────────────────────────────────────────────
const MSAModal:React.FC<{posDevices:PosDevice[];branches:Branch[];onClose:()=>void}>=({posDevices,branches,onClose})=>{
  const ref=useOutside<HTMLDivElement>(onClose);
  const rows=branches.map(b=>{
    const bpos=posDevices.filter(p=>p.branch_id===b.id);
    const ends=bpos.map(p=>p.msa_end).filter(Boolean) as string[];
    const msaEnd=ends.length?ends.sort()[0]:undefined;
    const days=msaEnd?daysUntil(msaEnd):null;
    const status:(typeof rows[number]["status"])=days===null?"active":days<=0?"overdue":days<=30?"expiring":"active";
    return{branch:b.name,msaEnd,days,status};
  }).sort((a,b)=>(a.days??9999)-(b.days??9999));
  type Status="active"|"expiring"|"overdue";
  const C:Record<Status,{bg:string;border:string;badge:string;badgeBg:string;label:string}>={
    active:  {bg:"#f0fdf4",border:"#bbf7d0",badge:"#16a34a",badgeBg:"#dcfce7",label:"ACTIVE"},
    expiring:{bg:"#fffbeb",border:"#fde68a",badge:"#d97706",badgeBg:"#fef3c7",label:"EXPIRING"},
    overdue: {bg:"#fff1f2",border:"#fecaca",badge:"#e11d48",badgeBg:"#ffe4e6",label:"EXPIRED"},
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
      <div ref={ref} style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:600,maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <div style={{padding:"20px 24px",borderBottom:"1px solid var(--bdr)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:18,fontWeight:700,color:"var(--c1)"}}>MSA Expiration Details</div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--bdr)",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3l10 10M13 3L3 13"/></svg>
          </button>
        </div>
        <div style={{padding:"20px 24px",overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:12}}>
          {rows.length===0&&<div style={{textAlign:"center",color:"#8e7ec0",padding:24}}>No MSA data available.</div>}
          {rows.map((row,i)=>{const c=C[row.status as Status];return(
            <div key={i} style={{padding:"14px 16px",borderRadius:12,border:`1.5px solid ${c.border}`,background:c.bg}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <span style={{fontSize:13,fontWeight:700,color:"#18103a"}}>{row.branch}</span>
                <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:6,background:c.badgeBg,color:c.badge,letterSpacing:"0.4px"}}>{c.label}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><div style={{fontSize:10,color:"var(--c3)",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>MSA End Date</div><div style={{fontSize:13,fontWeight:600,color:"var(--c1)"}}>{fmtDate(row.msaEnd)}</div></div>
                <div><div style={{fontSize:10,color:"var(--c3)",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px",fontWeight:600}}>Days Remaining</div><div style={{fontSize:13,fontWeight:600,color:c.badge}}>{row.days===null?"—":row.days<=0?"Expired":`${row.days} days`}</div></div>
              </div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
};

// ── Edit Info Modal ───────────────────────────────────────────────────────────
const EditInfoModal:React.FC<{data:InfoData;onSave:(d:InfoData)=>void;onClose:()=>void}>=({data,onSave,onClose})=>{
  const [form,setForm]=useState<InfoData>({...data});
  const set=(k:keyof InfoData)=>(e:React.ChangeEvent<HTMLInputElement>)=>setForm(f=>({...f,[k]:e.target.value}));
  const inp:React.CSSProperties={width:"100%",padding:"9px 12px",border:"1.5px solid var(--bdr)",borderRadius:10,fontSize:12.5,color:"#3b1f7a",fontWeight:500,background:"var(--surf2)",outline:"none",fontFamily:"inherit"};
  const lbl:React.CSSProperties={fontSize:12,fontWeight:600,color:"rgba(0,0,0,0.4)",marginBottom:5,display:"block"};
  return(
    <div className="gx-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:18,boxShadow:"0 24px 64px rgba(109,40,217,0.18)",width:480,maxWidth:"94vw",maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",animation:"slideUp .25s cubic-bezier(.34,1.4,.64,1)"}}>
        <div style={{background:"linear-gradient(135deg,#3b0764,#6d28d9,#0f766e)",padding:"18px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Edit Client Information</div>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:8,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{padding:"6px 22px 16px",overflowY:"auto",flex:1}}>
          <div className="gx-modal-section-label" style={{color:"#6d28d9"}}>Primary Contact</div>
          <div style={{marginBottom:12}}><label style={lbl}>Store Name</label><input style={inp} value={form.storeName} onChange={set("storeName")}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={lbl}>Contact Person</label><input style={inp} value={form.contactPerson} onChange={set("contactPerson")}/></div>
            <div><label style={lbl}>Email</label><input style={inp} value={form.email} onChange={set("email")} type="email"/></div>
          </div>
          <div style={{marginBottom:12}}><label style={lbl}>Phone</label><input style={inp} value={form.phone} onChange={set("phone")}/></div>
          <div className="gx-modal-section-label" style={{color:"#0f766e",marginTop:18}}>Alternate Contact</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={lbl}>Contact Person</label><input style={inp} value={form.altContactPerson} onChange={set("altContactPerson")}/></div>
            <div><label style={lbl}>Email</label><input style={inp} value={form.altEmail} onChange={set("altEmail")} type="email"/></div>
          </div>
          <div style={{marginBottom:12}}><label style={lbl}>Phone</label><input style={inp} value={form.altPhone} onChange={set("altPhone")}/></div>
        </div>
        <div style={{padding:"12px 22px 18px",borderTop:"1px solid var(--bdr)",display:"flex",justifyContent:"flex-end",gap:8}}>
          <button className="btn btn-s btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-p btn-sm" onClick={()=>{onSave(form);onClose();}}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11"><path d="M2.5 7.5l3 3 6-6"/></svg>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;
