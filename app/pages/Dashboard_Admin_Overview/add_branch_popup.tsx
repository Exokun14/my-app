'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Client, isAlohaType } from './dashboard_overview_func';

interface AddBranchPopupProps {
  client:  Client;
  onAdd:   (branchName: string, license?: string, msaStart?: string, msaEnd?: string) => void;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

interface DBBranchLimiter {
  id:             number;
  company_id:     number;
  branch_counter: number;
  branch_limiter: number;
}

export default function AddBranchPopup({ client, onAdd, onClose }: AddBranchPopupProps) {
  const isAloha = isAlohaType(client.cat);

  const [branchName,    setBranchName]    = useState('');
  const [branchLicense, setBranchLicense] = useState('');
  const [msaStart,      setMsaStart]      = useState('');
  const [msaEnd,        setMsaEnd]        = useState('');
  const [shake,         setShake]         = useState(false);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [submitError,   setSubmitError]   = useState('');

  const [existingSharedLicense, setExistingSharedLicense] = useState<string>('');
  const [existingMsaStart,      setExistingMsaStart]      = useState<string>('');
  const [existingMsaEnd,        setExistingMsaEnd]        = useState<string>('');
  const [msaAutoApplied,        setMsaAutoApplied]        = useState(false);
  const [licenseLoading,        setLicenseLoading]        = useState(false);

  const [limiterRow,     setLimiterRow]     = useState<DBBranchLimiter | null>(null);
  const [limiterLoading, setLimiterLoading] = useState(!isAloha); // only load for non-Aloha

  /* User-entered branch limit — only shown when no license exists yet */
  const [branchLimitInput, setBranchLimitInput] = useState<string>('');

  /* Active / Inactive toggle — maps to implementation_date in DB
     Active  = today's date stored in implementation_date
     Inactive = null (default) */
  const [isActive, setIsActive] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 80);
    /* Branch limiter is only relevant for non-Aloha (Retail/Warehouse) companies */
    if (!isAloha) {
      fetchBranchLimiter();
      fetchExistingBranchData();
    }
  }, []);

  /* ── Fetch branch_limiter row for this company ── */
  const fetchBranchLimiter = async () => {
    setLimiterLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/branch-limiter?company_id=${client.id}`, {
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.length > 0) {
        setLimiterRow(data.data[0]);
        const saved = data.data[0].branch_limiter;
        if (saved > 0) setBranchLimitInput(String(saved));
      }
    } catch (err: any) {
      console.error('[AddBranchPopup] fetchBranchLimiter error:', err?.message);
    } finally {
      setLimiterLoading(false);
    }
  };

  /* ── Fetch existing branch data (license + MSA) for non-Aloha ── */
  const fetchExistingBranchData = async () => {
    setLicenseLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/branches?company_id=${client.id}`, {
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();

      if (res.ok && data.success && data.branches?.length > 0) {
        const withLicense = [...data.branches].reverse().find((b: any) => b.license_number?.trim());
        if (withLicense) {
          setExistingSharedLicense(withLicense.license_number.trim());
          setBranchLicense(withLicense.license_number.trim());
        }

        const withMsa = [...data.branches].reverse().find((b: any) => b.msa_start_date?.trim() || b.msa_end_date?.trim());
        if (withMsa) {
          const start = withMsa.msa_start_date?.trim() ?? '';
          const end   = withMsa.msa_end_date?.trim()   ?? '';
          setExistingMsaStart(start);
          setExistingMsaEnd(end);
          if (start) { setMsaStart(start); setMsaAutoApplied(true); }
          if (end)   { setMsaEnd(end);     setMsaAutoApplied(true); }
        }
      }
    } catch (err: any) {
      console.error('[AddBranchPopup] fetchExistingBranchData error:', err?.message);
    } finally {
      setLicenseLoading(false);
    }
  };

  /* ── Derived values ── */
  const counter       = limiterRow?.branch_counter ?? 0;
  const limiter       = limiterRow?.branch_limiter ?? 0;
  const limitSet      = limiter > 0;
  const atLimit       = limitSet && counter >= limiter;
  const nearLimit     = limitSet && !atLimit && (limiter - counter) === 1;
  const usagePct      = limitSet ? Math.min(100, Math.round((counter / limiter) * 100)) : 0;

  const retailHasLicense   = !isAloha && !!existingSharedLicense;
  const retailNeedsLicense = !isAloha && !existingSharedLicense && !licenseLoading;

  /*
   * CARD  → license already exists (Aloha always, non-Aloha after first branch)
   * INPUT → no license yet on non-Aloha (first branch — user sets their own cap)
   */
  const showLimiterCard = retailHasLicense;  // Retail/Warehouse with existing license only — hidden for Aloha
  const showLimitInput  = retailNeedsLicense;

  const msaStartChanged = msaAutoApplied && msaStart !== existingMsaStart;
  const msaEndChanged   = msaAutoApplied && msaEnd   !== existingMsaEnd;

  const licenseRequired = isAloha || (retailNeedsLicense && !licenseLoading);

  const canSubmit =
    branchName.trim().length > 0 &&
    (!licenseRequired || branchLicense.trim().length > 0) &&
    !licenseLoading &&
    !atLimit;

  const alreadyExists = (client.branches || [])
    .map(b => b.toLowerCase())
    .includes(branchName.trim().toLowerCase());

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 400); };

  /* ── Save branch_limiter cap to DB ── */
  const saveBranchLimit = async (limitValue: number) => {
    if (!limiterRow) return;
    try {
      await fetch(`${API_BASE}/api/branch-limiter/${limiterRow.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ branch_limiter: limitValue }),
      });
    } catch (err: any) {
      console.error('[AddBranchPopup] saveBranchLimit error:', err?.message);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || (alreadyExists && branchName.trim())) { triggerShake(); return; }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      /* Save branch limit if user entered one on the first-setup input */
      const parsedLimit = parseInt(branchLimitInput, 10);
      if (showLimitInput && !isNaN(parsedLimit) && parsedLimit > 0) {
        await saveBranchLimit(parsedLimit);
      }

      const body = new FormData();
      body.append('company_id',  String(client.id));
      body.append('branch_name', branchName.trim());
      if (branchLicense.trim()) body.append('license_number', branchLicense.trim());
      if (msaStart.trim())      body.append('msa_start_date', msaStart.trim());
      if (msaEnd.trim())        body.append('msa_end_date',   msaEnd.trim());
      /* implementation_date: today if Active, omit if Inactive (server stores null) */
      if (isActive) {
        body.append('implementation_date', new Date().toISOString().split('T')[0]);
      }

      const res  = await fetch(`${API_BASE}/api/branches`, {
        method: 'POST', headers: { 'Accept': 'application/json' }, body,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        /* ── Branch limit reached (server-side enforcement) ── */
        if (data.limit_reached) {
          setLimiterRow(prev => prev
            ? { ...prev, branch_counter: data.branch_counter, branch_limiter: data.branch_limiter }
            : prev
          );
          setSubmitError(data.message);
          triggerShake();
          return;
        }
        const msg = data.errors
          ? Object.values(data.errors as Record<string, string[]>).flat().join(' ')
          : data.message || `Server error ${res.status}`;
        setSubmitError(data.errors ? `Validation error: ${msg}` : msg);
        triggerShake();
        return;
      }

      /* Trigger server-side counter sync */
      try {
        await fetch(`${API_BASE}/api/branch-limiter?company_id=${client.id}`, {
          headers: { 'Accept': 'application/json' },
        });
      } catch { /* non-critical */ }

      onAdd(
        branchName.trim(),
        branchLicense.trim() || undefined,
        msaStart.trim()      || undefined,
        msaEnd.trim()        || undefined,
      );
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Network error — could not reach the server.');
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  const font = "'DM Sans', sans-serif";

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    borderRadius: 9, fontSize: 13, fontFamily: font,
    outline: 'none', transition: 'border-color 0.15s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: '#4a3870', marginBottom: 6, letterSpacing: '0.04em',
  };
  const dateStyle = (auto: boolean, changed: boolean): React.CSSProperties => ({
    ...inputBase,
    background: auto && !changed ? '#eff6ff' : '#f5f3ff',
    border: `1.5px solid ${msaEnd && msaStart && msaEnd < msaStart ? '#ef4444' : auto && !changed ? 'rgba(2,132,199,0.35)' : 'rgba(124,58,237,0.2)'}`,
    color:  auto && !changed ? '#0c4a6e' : '#18103a',
    fontWeight: auto && !changed ? 600 : 400,
  });

  const usageAccent =
    atLimit || nearLimit ? '#dc2626' :
    usagePct >= 70      ? '#d97706' :
    '#7c3aed';

  const industryLabel = isAloha ? 'Aloha' : client.cat;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(15,10,35,0.38)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: 480, maxWidth: '96vw', boxShadow: '0 24px 60px rgba(15,10,35,0.22)', fontFamily: font, overflow: 'hidden', animation: shake ? 'shake 0.38s ease' : undefined }}
      >

        {/* ── Header ── */}
        <div style={{ background: 'linear-gradient(135deg,#7c3aed 0%,#0d9488 100%)', padding: '18px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.6">
                <path d="M7 1.5C5 1.5 3.5 3 3.5 5c0 3.5 3.5 6.5 3.5 6.5S10.5 8.5 10.5 5c0-2-1.5-3.5-3.5-3.5z"/>
                <circle cx="7" cy="5" r="1.3"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Add Branch</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>{client.name} &mdash; {industryLabel}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ══ CASE A: license exists → Total Branches CARD ══ */}
          {showLimiterCard && !limiterLoading && (
            atLimit ? (
              /* Blocked */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 16px', background: 'rgba(220,38,38,0.04)', border: '1.5px dashed rgba(220,38,38,0.28)', borderRadius: 10, textAlign: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.4">
                  <circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 15.5v.5"/>
                </svg>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626' }}>Branch Limit Reached</div>
                <div style={{ fontSize: 11.5, color: '#8e7ec0', lineHeight: 1.6 }}>
                  This company has reached its maximum of <strong style={{ color: '#18103a' }}>{limiter}</strong> branch{limiter !== 1 ? 'es' : ''}.
                  Please contact your account manager to increase the quota.
                </div>
              </div>
            ) : (
              /* Usage card */
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: `${usageAccent}0d`, border: `1.5px solid ${usageAccent}40`, borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: `${usageAccent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={usageAccent} strokeWidth="1.5">
                    <path d="M8 1.5C5.8 1.5 4 3.3 4 5.5c0 3.3 4 8 4 8s4-4.7 4-8c0-2.2-1.8-4-4-4z"/>
                    <circle cx="8" cy="5.5" r="1.5"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: usageAccent === '#7c3aed' ? '#4a3870' : usageAccent }}>
                      Total Branches
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 900, lineHeight: 1, color: usageAccent === '#7c3aed' ? '#18103a' : usageAccent }}>{counter}</span>
                      <span style={{ fontSize: 12, fontWeight: 400, color: '#b8aed8' }}>/</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#8e7ec0' }}>{limitSet ? limiter : '∞'}</span>
                    </div>
                  </div>
                  {limitSet && (
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(124,58,237,0.1)', overflow: 'hidden', marginBottom: 4 }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${usagePct}%`, background: usagePct >= 90 ? '#dc2626' : usagePct >= 70 ? '#d97706' : '#16a34a', transition: 'width 0.5s ease-in-out' }} />
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: usageAccent === '#7c3aed' ? '#8e7ec0' : usageAccent, fontWeight: nearLimit ? 700 : 400 }}>
                    {!limitSet
                      ? 'No branch limit set for this company.'
                      : nearLimit
                      ? `⚠ Only 1 slot remaining — this will be the last branch you can add.`
                      : `${limiter - counter} slot${limiter - counter !== 1 ? 's' : ''} remaining`}
                  </div>
                </div>
              </div>
            )
          )}

          {/* Loading skeleton for card */}
          {showLimiterCard && limiterLoading && (
            <div style={{ height: 66, borderRadius: 10, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          )}

          {/* ══ Rest of form — hidden when at limit ══ */}
          {!atLimit && (
            <>
              {/* Branch Name + Branch Limit inline (2-col when limit input is shown) */}
              <div style={{ display: 'grid', gridTemplateColumns: showLimitInput ? '1fr 1fr' : '1fr', gap: 10, alignItems: 'start' }}>
                {/* Branch Name */}
                <div>
                  <label style={labelStyle}>BRANCH NAME</label>
                  <input
                    ref={nameRef}
                    value={branchName}
                    onChange={e => setBranchName(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="e.g. Makati, BGC…"
                    style={{ ...inputBase, background: '#f5f3ff', border: `1.5px solid ${alreadyExists && branchName.trim() ? '#ef4444' : 'rgba(124,58,237,0.2)'}`, color: '#18103a' }}
                  />
                  {alreadyExists && branchName.trim() && (
                    <div style={{ fontSize: 10.5, color: '#ef4444', marginTop: 4 }}>A branch with this name already exists.</div>
                  )}
                </div>

                {/* Branch Limit — only when no license exists yet */}
                {showLimitInput && (
                  <div>
                    <label style={labelStyle}>
                      BRANCH LIMIT
                      <span style={{ marginLeft: 5, fontSize: 9, fontWeight: 400, color: '#8e7ec0', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        min={1}
                        placeholder="e.g. 10"
                        value={branchLimitInput}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === '' || (/^\d+$/.test(v) && parseInt(v, 10) > 0)) setBranchLimitInput(v);
                        }}
                        onKeyDown={handleKey}
                        style={{ ...inputBase, background: '#f5f3ff', border: '1.5px solid rgba(124,58,237,0.2)', color: '#18103a', paddingRight: 66 }}
                      />
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9.5, fontWeight: 700, color: '#b8aed8', pointerEvents: 'none', userSelect: 'none' }}>
                        branches
                      </span>
                    </div>
                    <style>{`input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}input[type=number]{-moz-appearance:textfield}`}</style>
                  </div>
                )}
              </div>

              {/* ── Aloha license ── */}
              {isAloha && (
                <div>
                  <label style={{ ...labelStyle, color: '#92400e' }}>
                    BRANCH LICENSE NUMBER
                    <span style={{ marginLeft: 5, fontWeight: 400, color: '#d97706', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>(required — unique per branch)</span>
                  </label>
                  <input
                    value={branchLicense} onChange={e => setBranchLicense(e.target.value)} onKeyDown={handleKey}
                    placeholder="e.g. LIC-SBX-MKT-0112…"
                    style={{ ...inputBase, background: '#fffbeb', border: '1.5px solid rgba(217,119,6,0.3)', color: '#92400e' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#d97706" strokeWidth="1.5"><circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/></svg>
                    <span style={{ fontSize: 10, color: '#d97706' }}>Each Aloha branch requires its own unique license key.</span>
                  </div>
                </div>
              )}

              {/* ── Non-Aloha loading ── */}
              {!isAloha && licenseLoading && (
                <div style={{ padding: '12px', background: '#f5f3ff', borderRadius: 9, border: '1.5px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e7ec0" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  <span style={{ fontSize: 11, color: '#8e7ec0', fontWeight: 500 }}>Checking for existing license &amp; dates…</span>
                </div>
              )}

              {/* ── Non-Aloha: license found (auto-applied) ── */}
              {retailHasLicense && (
                <div>
                  <label style={{ ...labelStyle, color: '#075985' }}>
                    SHARED LICENSE NUMBER
                    <span style={{ marginLeft: 5, fontWeight: 400, color: '#0284c7', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>(auto-applied from existing branches)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input value={branchLicense} readOnly style={{ ...inputBase, background: '#eff6ff', border: '1.5px solid rgba(2,132,199,0.35)', color: '#0c4a6e', fontWeight: 700, paddingRight: 90, cursor: 'default' }} />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 700, background: 'rgba(2,132,199,0.12)', color: '#0284c7', border: '1px solid rgba(2,132,199,0.25)', borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap' }}>AUTO-APPLIED</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#0284c7" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/></svg>
                    <span style={{ fontSize: 10, color: '#0284c7' }}>This shared license is automatically applied to all {client.cat} branches under this company.</span>
                  </div>
                </div>
              )}

              {/* ── Non-Aloha: no license yet (user enters) ── */}
              {retailNeedsLicense && (
                <div>
                  <label style={{ ...labelStyle, color: '#075985' }}>
                    SHARED LICENSE NUMBER
                    <span style={{ marginLeft: 5, fontWeight: 400, color: '#0284c7', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>(required — will apply to all branches)</span>
                  </label>
                  <input
                    value={branchLicense} onChange={e => setBranchLicense(e.target.value)} onKeyDown={handleKey}
                    placeholder="e.g. LIC-SHARED-0001…"
                    style={{ ...inputBase, background: '#eff6ff', border: '1.5px solid rgba(2,132,199,0.3)', color: '#075985' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#0284c7" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/></svg>
                    <span style={{ fontSize: 10, color: '#0284c7' }}>This will become the shared license for <strong>all</strong> {client.cat} branches under this company.</span>
                  </div>
                </div>
              )}

              {/* ── MSA Dates ── */}
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#7c3aed" strokeWidth="1.5"><rect x="2" y="3.5" width="12" height="10" rx="1.5"/><path d="M2 6.5h12M5.5 2v3M10.5 2v3"/></svg>
                  MSA DATES
                  {!isAloha && msaAutoApplied && <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(2,132,199,0.1)', color: '#0284c7', border: '1px solid rgba(2,132,199,0.25)', borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap' }}>AUTO-APPLIED · EDITABLE</span>}
                  {(isAloha || !msaAutoApplied) && <span style={{ fontWeight: 400, color: '#8e7ec0', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>(optional — auto-filled to new POS)</span>}
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: !isAloha && msaAutoApplied && !msaStartChanged ? '#0284c7' : '#8e7ec0', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Start Date
                      {!isAloha && msaAutoApplied && !msaStartChanged && <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(2,132,199,0.1)', color: '#0284c7', borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(2,132,199,0.2)' }}>AUTO</span>}
                      {!isAloha && msaStartChanged && <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(124,58,237,0.2)' }}>EDITED</span>}
                    </div>
                    <input type="date" value={msaStart} onChange={e => setMsaStart(e.target.value)} style={dateStyle(msaAutoApplied, msaStartChanged)} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: !isAloha && msaAutoApplied && !msaEndChanged ? '#0284c7' : '#8e7ec0', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      End Date
                      {!isAloha && msaAutoApplied && !msaEndChanged && <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(2,132,199,0.1)', color: '#0284c7', borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(2,132,199,0.2)' }}>AUTO</span>}
                      {!isAloha && msaEndChanged && <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(124,58,237,0.2)' }}>EDITED</span>}
                    </div>
                    <input type="date" value={msaEnd} onChange={e => setMsaEnd(e.target.value)} style={{ ...dateStyle(msaAutoApplied, msaEndChanged), borderColor: msaEnd && msaStart && msaEnd < msaStart ? '#ef4444' : msaAutoApplied && !msaEndChanged ? 'rgba(2,132,199,0.35)' : 'rgba(124,58,237,0.2)' }} />
                  </div>
                </div>

                {msaEnd && msaStart && msaEnd < msaStart && <div style={{ fontSize: 10.5, color: '#ef4444', marginTop: 4 }}>End date must be after start date.</div>}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 6 }}>
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={!isAloha && msaAutoApplied ? '#0284c7' : '#7c3aed'} strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/>
                  </svg>
                  {!isAloha && msaAutoApplied
                    ? <span style={{ fontSize: 10, color: '#0284c7' }}>Dates auto-applied from your existing branches. You can change them — only this branch will use the new dates.</span>
                    : <span style={{ fontSize: 10, color: '#7c3aed' }}>These dates will be automatically applied to any new POS added to this branch.</span>
                  }
                </div>

                {!isAloha && msaAutoApplied && (msaStartChanged || msaEndChanged) && (
                  <button onClick={() => { setMsaStart(existingMsaStart); setMsaEnd(existingMsaEnd); }}
                    style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: '#0284c7', background: 'rgba(2,132,199,0.08)', border: '1px solid rgba(2,132,199,0.22)', cursor: 'pointer', fontFamily: font }}>
                    <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 7a5 5 0 1 0 1.5-3.5"/><path d="M2 3v4h4"/></svg>
                    Reset to auto-applied dates
                  </button>
                )}
              </div>

              {submitError && (
                <div style={{ padding: '9px 12px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, fontSize: 11, color: '#dc2626', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠</span>{submitError}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 20px 18px', display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>

          {/* ── Active / Inactive toggle ── */}
          <button
            type="button"
            onClick={() => setIsActive(v => !v)}
            disabled={isSubmitting}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '7px 13px', borderRadius: 9, cursor: isSubmitting ? 'not-allowed' : 'pointer',
              border: `1.5px solid ${isActive ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.28)'}`,
              background: isActive ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.05)',
              fontFamily: font, transition: 'all 0.18s', opacity: isSubmitting ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            {/* Toggle track */}
            <span style={{
              position: 'relative', display: 'inline-block',
              width: 34, height: 18, borderRadius: 9, flexShrink: 0,
              background: isActive ? '#16a34a' : '#dc2626',
              transition: 'background 0.2s',
            }}>
              {/* Knob */}
              <span style={{
                position: 'absolute', top: 2,
                left: isActive ? 16 : 2,
                width: 14, height: 14, borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                transition: 'left 0.18s',
              }} />
            </span>
            {/* Label + dot */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: isActive ? '#16a34a' : '#dc2626',
              }} />
              <span style={{
                fontSize: 11.5, fontWeight: 700,
                color: isActive ? '#15803d' : '#b91c1c',
                letterSpacing: '0.02em',
              }}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </span>
          </button>

          {/* Cancel + Submit */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} disabled={isSubmitting}
              style={{ padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.15)', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontFamily: font, opacity: isSubmitting ? 0.6 : 1 }}>
              Cancel
            </button>
            {!atLimit && (
              <button onClick={handleSubmit} disabled={!canSubmit || (alreadyExists && !!branchName.trim()) || isSubmitting}
                style={{ padding: '8px 22px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff', background: isSubmitting ? 'linear-gradient(135deg,#a78bfa,#5eead4)' : canSubmit && !(alreadyExists && branchName.trim()) ? 'linear-gradient(135deg,#7c3aed,#0d9488)' : '#c4b5fd', border: 'none', cursor: canSubmit && !(alreadyExists && branchName.trim()) && !isSubmitting ? 'pointer' : 'not-allowed', boxShadow: canSubmit && !isSubmitting ? '0 2px 10px rgba(124,58,237,0.28)' : 'none', fontFamily: font, transition: 'all 0.15s', opacity: canSubmit || isSubmitting ? 1 : 0.55, minWidth: 110 }}>
                {isSubmitting
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Saving…</span>
                  : '+ Add Branch'}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
    </div>
  );
}