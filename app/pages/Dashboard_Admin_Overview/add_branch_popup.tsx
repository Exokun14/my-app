'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Client } from './dashboard_overview_func';

interface AddBranchPopupProps {
  client:  Client;
  onAdd:   (branchName: string, license?: string, msaStart?: string, msaEnd?: string) => void;
  onClose: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

export default function AddBranchPopup({ client, onAdd, onClose }: AddBranchPopupProps) {
  const isAloha = client.cat === 'F&B';

  const [branchName,    setBranchName]    = useState('');
  const [branchLicense, setBranchLicense] = useState('');
  const [msaStart,      setMsaStart]      = useState('');
  const [msaEnd,        setMsaEnd]        = useState('');
  const [shake,         setShake]         = useState(false);
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [submitError,   setSubmitError]   = useState('');

  /* ── Retail/Warehouse: track whether a shared license + MSA dates exist in DB ── */
  const [existingSharedLicense,  setExistingSharedLicense]  = useState<string>('');
  const [existingMsaStart,       setExistingMsaStart]       = useState<string>('');
  const [existingMsaEnd,         setExistingMsaEnd]         = useState<string>('');
  const [msaAutoApplied,         setMsaAutoApplied]         = useState(false);
  const [licenseLoading,         setLicenseLoading]         = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  /* ── On mount: for Retail/Warehouse, query DB for existing license + MSA dates ── */
  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 80);
    if (!isAloha) {
      fetchExistingBranchData();
    }
  }, []);

  const fetchExistingBranchData = async () => {
    setLicenseLoading(true);
    try {
      console.log('[AddBranchPopup] Fetching existing branch data for company_id:', client.id);

      const res  = await fetch(`${API_BASE}/api/branches?company_id=${client.id}`, {
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();

      console.log('[AddBranchPopup] Existing branches response:', data);

      if (res.ok && data.success && data.branches?.length > 0) {
        /* Find the last branch that has a license_number */
        const withLicense = [...data.branches]
          .reverse()
          .find((b: any) => b.license_number?.trim());

        if (withLicense) {
          console.log('[AddBranchPopup] Found existing shared license:', withLicense.license_number);
          setExistingSharedLicense(withLicense.license_number.trim());
          setBranchLicense(withLicense.license_number.trim());
        } else {
          console.log('[AddBranchPopup] No existing license found for this company.');
        }

        /* Find the last branch that has MSA dates — independent of license */
        const withMsa = [...data.branches]
          .reverse()
          .find((b: any) => b.msa_start_date?.trim() || b.msa_end_date?.trim());

        if (withMsa) {
          const start = withMsa.msa_start_date?.trim() ?? '';
          const end   = withMsa.msa_end_date?.trim()   ?? '';
          console.log('[AddBranchPopup] Found existing MSA dates:', { start, end });

          setExistingMsaStart(start);
          setExistingMsaEnd(end);

          /* Pre-fill the inputs */
          if (start) { setMsaStart(start); setMsaAutoApplied(true); }
          if (end)   { setMsaEnd(end);     setMsaAutoApplied(true); }
        } else {
          console.log('[AddBranchPopup] No existing MSA dates found for this company.');
        }
      }
    } catch (err: any) {
      console.error('[AddBranchPopup] fetchExistingBranchData error:', err?.message);
    } finally {
      setLicenseLoading(false);
    }
  };

  /* ── Derived flags ── */
  const retailHasLicense   = !isAloha && !!existingSharedLicense;
  const retailNeedsLicense = !isAloha && !existingSharedLicense && !licenseLoading;

  /* Track if user has manually changed a pre-filled date */
  const msaStartChanged = msaAutoApplied && msaStart !== existingMsaStart;
  const msaEndChanged   = msaAutoApplied && msaEnd   !== existingMsaEnd;

  const licenseRequiredInForm = isAloha || (retailNeedsLicense && !licenseLoading);

  const canSubmit =
    branchName.trim().length > 0 &&
    (!licenseRequiredInForm || branchLicense.trim().length > 0) &&
    !licenseLoading;

  const alreadyExists = (client.branches || [])
    .map(b => b.toLowerCase())
    .includes(branchName.trim().toLowerCase());

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleSubmit = async () => {
    if (!canSubmit || (alreadyExists && branchName.trim())) {
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const resolvedLicense = branchLicense.trim();

      const body = new FormData();
      body.append('company_id',  String(client.id));
      body.append('branch_name', branchName.trim());

      if (resolvedLicense)  body.append('license_number', resolvedLicense);
      if (msaStart.trim())  body.append('msa_start_date', msaStart.trim());
      if (msaEnd.trim())    body.append('msa_end_date',   msaEnd.trim());

      console.log('[AddBranchPopup] Submitting to:', `${API_BASE}/api/branches`);
      console.log('[AddBranchPopup] Payload:', {
        company_id:     client.id,
        branch_name:    branchName.trim(),
        license_number: resolvedLicense || null,
        msa_start_date: msaStart.trim() || null,
        msa_end_date:   msaEnd.trim()   || null,
      });

      const res  = await fetch(`${API_BASE}/api/branches`, {
        method:  'POST',
        headers: { 'Accept': 'application/json' },
        body,
      });

      const data = await res.json();
      console.log('[AddBranchPopup] API response:', data);

      if (!res.ok || !data.success) {
        if (data.errors) {
          const messages = Object.values(data.errors as Record<string, string[]>).flat().join(' ');
          console.error('[AddBranchPopup] Validation errors:', data.errors);
          setSubmitError(`Validation error: ${messages}`);
        } else {
          const msg = data.message || `Server error ${res.status}`;
          console.error('[AddBranchPopup] Insert failed:', msg);
          setSubmitError(msg);
        }
        triggerShake();
        return;
      }

      console.log('[AddBranchPopup] Branch saved to DB with id:', data.id);

      onAdd(
        branchName.trim(),
        resolvedLicense || undefined,
        msaStart.trim() || undefined,
        msaEnd.trim()   || undefined,
      );

    } catch (err: any) {
      const msg = err?.message ?? 'Network error — could not reach the server. Is Laravel running?';
      console.error('[AddBranchPopup] Fetch exception:', msg);
      setSubmitError(msg);
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  /* ─── styles ──────────────────────────────────────────────── */
  const font = "'DM Sans', sans-serif";

  const inputBase: React.CSSProperties = {
    width:        '100%',
    boxSizing:    'border-box',
    padding:      '9px 12px',
    borderRadius: 9,
    fontSize:     13,
    fontFamily:   font,
    outline:      'none',
    transition:   'border-color 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    display:       'block',
    fontSize:      11,
    fontWeight:    700,
    color:         '#4a3870',
    marginBottom:  6,
    letterSpacing: '0.04em',
  };

  /* Date input style — turns blue-tinted when auto-applied, reverts to purple on edit */
  const dateInputStyle = (isAutoApplied: boolean, hasChanged: boolean): React.CSSProperties => ({
    ...inputBase,
    background:  isAutoApplied && !hasChanged ? '#eff6ff' : '#f5f3ff',
    border:      `1.5px solid ${
      msaEnd && msaStart && msaEnd < msaStart
        ? '#ef4444'
        : isAutoApplied && !hasChanged
          ? 'rgba(2,132,199,0.35)'
          : 'rgba(124,58,237,0.2)'
    }`,
    color:       isAutoApplied && !hasChanged ? '#0c4a6e' : '#18103a',
    fontWeight:  isAutoApplied && !hasChanged ? 600 : 400,
  });

  return (
    <div
      onClick={onClose}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         9000,
        background:     'rgba(15,10,35,0.38)',
        backdropFilter: 'blur(3px)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   '#fff',
          borderRadius: 16,
          width:        400,
          maxWidth:     '92vw',
          boxShadow:    '0 24px 60px rgba(15,10,35,0.22), 0 4px 12px rgba(15,10,35,0.1)',
          fontFamily:   font,
          overflow:     'hidden',
          animation:    shake ? 'shake 0.38s ease' : undefined,
        }}
      >

        {/* ── Header ── */}
        <div style={{
          background:     'linear-gradient(135deg,#7c3aed 0%,#0d9488 100%)',
          padding:        '18px 20px 16px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width:          32,
              height:         32,
              borderRadius:   8,
              background:     'rgba(255,255,255,0.18)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.6">
                <path d="M7 1.5C5 1.5 3.5 3 3.5 5c0 3.5 3.5 6.5 3.5 6.5S10.5 8.5 10.5 5c0-2-1.5-3.5-3.5-3.5z"/>
                <circle cx="7" cy="5" r="1.3"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Add Branch</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
                {client.name} &mdash; {isAloha ? 'Aloha' : client.cat}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width:          28,
              height:         28,
              borderRadius:   7,
              border:         'none',
              cursor:         'pointer',
              background:     'rgba(255,255,255,0.15)',
              color:          '#fff',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       15,
              fontWeight:     700,
              lineHeight:     1,
            }}
          >✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Branch Name */}
          <div>
            <label style={labelStyle}>BRANCH NAME</label>
            <input
              ref={nameRef}
              value={branchName}
              onChange={e => setBranchName(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. Makati, BGC Main, Cebu…"
              style={{
                ...inputBase,
                background: '#f5f3ff',
                border:     `1.5px solid ${alreadyExists && branchName.trim() ? '#ef4444' : 'rgba(124,58,237,0.2)'}`,
                color:      '#18103a',
              }}
            />
            {alreadyExists && branchName.trim() && (
              <div style={{ fontSize: 10.5, color: '#ef4444', marginTop: 4 }}>
                A branch with this name already exists.
              </div>
            )}
          </div>

          {/* ══ LICENSE SECTION ══ */}

          {/* Case A — Aloha: always ask for a unique per-branch license */}
          {isAloha && (
            <div>
              <label style={{ ...labelStyle, color: '#92400e' }}>
                BRANCH LICENSE NUMBER
                <span style={{ marginLeft: 5, fontWeight: 400, color: '#d97706', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>
                  (required — unique per branch)
                </span>
              </label>
              <input
                value={branchLicense}
                onChange={e => setBranchLicense(e.target.value)}
                onKeyDown={handleKey}
                placeholder="e.g. LIC-SBX-MKT-0112…"
                style={{
                  ...inputBase,
                  background: '#fffbeb',
                  border:     '1.5px solid rgba(217,119,6,0.3)',
                  color:      '#92400e',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#d97706" strokeWidth="1.5">
                  <circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/>
                </svg>
                <span style={{ fontSize: 10, color: '#d97706' }}>
                  Each Aloha branch requires its own unique license key.
                </span>
              </div>
            </div>
          )}

          {/* Case B — Retail/WH: loading skeleton */}
          {!isAloha && licenseLoading && (
            <div style={{
              padding:      '12px',
              background:   '#f5f3ff',
              borderRadius: 9,
              border:       '1.5px solid rgba(124,58,237,0.15)',
              display:      'flex',
              alignItems:   'center',
              gap:          10,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8e7ec0" strokeWidth="2.5"
                style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span style={{ fontSize: 11, color: '#8e7ec0', fontWeight: 500 }}>
                Checking for existing license &amp; dates…
              </span>
            </div>
          )}

          {/* Case C — Retail/WH: existing license found → pre-filled, readonly */}
          {retailHasLicense && (
            <div>
              <label style={{ ...labelStyle, color: '#075985' }}>
                SHARED LICENSE NUMBER
                <span style={{ marginLeft: 5, fontWeight: 400, color: '#0284c7', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>
                  (auto-applied from existing branches)
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  value={branchLicense}
                  readOnly
                  style={{
                    ...inputBase,
                    background:   '#eff6ff',
                    border:       '1.5px solid rgba(2,132,199,0.35)',
                    color:        '#0c4a6e',
                    fontWeight:   700,
                    paddingRight: 90,
                    cursor:       'default',
                  }}
                />
                <span style={{
                  position:      'absolute',
                  right:         10,
                  top:           '50%',
                  transform:     'translateY(-50%)',
                  fontSize:      9,
                  fontWeight:    700,
                  background:    'rgba(2,132,199,0.12)',
                  color:         '#0284c7',
                  border:        '1px solid rgba(2,132,199,0.25)',
                  borderRadius:  5,
                  padding:       '2px 7px',
                  whiteSpace:    'nowrap',
                  letterSpacing: '0.05em',
                }}>
                  AUTO-APPLIED
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#0284c7" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/>
                </svg>
                <span style={{ fontSize: 10, color: '#0284c7' }}>
                  This shared license is automatically applied to all {client.cat} branches under this company.
                </span>
              </div>
            </div>
          )}

          {/* Case D — Retail/WH: no license in DB yet → ask once */}
          {retailNeedsLicense && (
            <div>
              <label style={{ ...labelStyle, color: '#075985' }}>
                SHARED LICENSE NUMBER
                <span style={{ marginLeft: 5, fontWeight: 400, color: '#0284c7', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>
                  (required — will apply to all branches)
                </span>
              </label>
              <input
                value={branchLicense}
                onChange={e => setBranchLicense(e.target.value)}
                onKeyDown={handleKey}
                placeholder="e.g. LIC-SHARED-0001…"
                style={{
                  ...inputBase,
                  background: '#eff6ff',
                  border:     '1.5px solid rgba(2,132,199,0.3)',
                  color:      '#075985',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="#0284c7" strokeWidth="1.5">
                  <circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/>
                </svg>
                <span style={{ fontSize: 10, color: '#0284c7' }}>
                  This will become the shared license for <strong>all</strong> {client.cat} branches under this company.
                </span>
              </div>
            </div>
          )}

          {/* ══ MSA DATES SECTION ══ */}
          <div>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#7c3aed" strokeWidth="1.5">
                <rect x="2" y="3.5" width="12" height="10" rx="1.5"/>
                <path d="M2 6.5h12M5.5 2v3M10.5 2v3"/>
              </svg>
              MSA DATES

              {/* Show badge only for Retail/WH when dates were auto-filled */}
              {!isAloha && msaAutoApplied && (
                <span style={{
                  fontSize:      9,
                  fontWeight:    700,
                  background:    'rgba(2,132,199,0.1)',
                  color:         '#0284c7',
                  border:        '1px solid rgba(2,132,199,0.25)',
                  borderRadius:  5,
                  padding:       '2px 7px',
                  letterSpacing: '0.05em',
                  whiteSpace:    'nowrap',
                }}>
                  AUTO-APPLIED · EDITABLE
                </span>
              )}

              {/* For Aloha or no existing dates */}
              {(isAloha || !msaAutoApplied) && (
                <span style={{ fontWeight: 400, color: '#8e7ec0', fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>
                  (optional — auto-filled to new POS)
                </span>
              )}
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           5,
                  fontSize:      10,
                  fontWeight:    600,
                  color:         !isAloha && msaAutoApplied && !msaStartChanged ? '#0284c7' : '#8e7ec0',
                  marginBottom:  4,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  Start Date
                  {!isAloha && msaAutoApplied && !msaStartChanged && (
                    <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(2,132,199,0.1)', color: '#0284c7', borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(2,132,199,0.2)' }}>
                      AUTO
                    </span>
                  )}
                  {!isAloha && msaStartChanged && (
                    <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(124,58,237,0.2)' }}>
                      EDITED
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    value={msaStart}
                    onChange={e => setMsaStart(e.target.value)}
                    style={dateInputStyle(msaAutoApplied, msaStartChanged)}
                  />
                </div>
              </div>

              <div>
                <div style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           5,
                  fontSize:      10,
                  fontWeight:    600,
                  color:         !isAloha && msaAutoApplied && !msaEndChanged ? '#0284c7' : '#8e7ec0',
                  marginBottom:  4,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  End Date
                  {!isAloha && msaAutoApplied && !msaEndChanged && (
                    <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(2,132,199,0.1)', color: '#0284c7', borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(2,132,199,0.2)' }}>
                      AUTO
                    </span>
                  )}
                  {!isAloha && msaEndChanged && (
                    <span style={{ fontSize: 8, fontWeight: 700, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 4, padding: '1px 5px', border: '1px solid rgba(124,58,237,0.2)' }}>
                      EDITED
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={msaEnd}
                  onChange={e => setMsaEnd(e.target.value)}
                  style={{
                    ...dateInputStyle(msaAutoApplied, msaEndChanged),
                    borderColor: msaEnd && msaStart && msaEnd < msaStart
                      ? '#ef4444'
                      : msaAutoApplied && !msaEndChanged
                        ? 'rgba(2,132,199,0.35)'
                        : 'rgba(124,58,237,0.2)',
                  }}
                />
              </div>
            </div>

            {msaEnd && msaStart && msaEnd < msaStart && (
              <div style={{ fontSize: 10.5, color: '#ef4444', marginTop: 4 }}>
                End date must be after start date.
              </div>
            )}

            {/* Helper text — context-aware */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 6 }}>
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={!isAloha && msaAutoApplied ? '#0284c7' : '#7c3aed'} strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/>
              </svg>
              {!isAloha && msaAutoApplied ? (
                <span style={{ fontSize: 10, color: '#0284c7' }}>
                  Dates auto-applied from your existing branches. You can change them for this branch — only this branch will use the new dates.
                </span>
              ) : (
                <span style={{ fontSize: 10, color: '#7c3aed' }}>
                  These dates will be automatically applied to any new POS added to this branch.
                </span>
              )}
            </div>

            {/* Reset button — only shown when auto-applied and at least one field was edited */}
            {!isAloha && msaAutoApplied && (msaStartChanged || msaEndChanged) && (
              <button
                onClick={() => { setMsaStart(existingMsaStart); setMsaEnd(existingMsaEnd); }}
                style={{
                  marginTop:    8,
                  display:      'inline-flex',
                  alignItems:   'center',
                  gap:          5,
                  padding:      '4px 10px',
                  borderRadius: 6,
                  fontSize:     10,
                  fontWeight:   600,
                  color:        '#0284c7',
                  background:   'rgba(2,132,199,0.08)',
                  border:       '1px solid rgba(2,132,199,0.22)',
                  cursor:       'pointer',
                  fontFamily:   font,
                  transition:   'all 0.14s',
                }}
              >
                <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M2 7a5 5 0 1 0 1.5-3.5"/><path d="M2 3v4h4"/>
                </svg>
                Reset to auto-applied dates
              </button>
            )}
          </div>

          {/* ── Error Banner ── */}
          {submitError && (
            <div style={{
              padding:      '9px 12px',
              background:   'rgba(220,38,38,0.07)',
              border:       '1px solid rgba(220,38,38,0.25)',
              borderRadius: 8,
              fontSize:     11,
              color:        '#dc2626',
              display:      'flex',
              gap:          6,
              alignItems:   'flex-start',
            }}>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠</span>
              {submitError}
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div style={{
          padding:        '12px 20px 18px',
          display:        'flex',
          gap:            8,
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding:      '8px 18px',
              borderRadius: 8,
              fontSize:     12,
              fontWeight:   600,
              color:        '#4a3870',
              background:   '#f2f0fb',
              border:       '1px solid rgba(124,58,237,0.15)',
              cursor:       isSubmitting ? 'not-allowed' : 'pointer',
              fontFamily:   font,
              opacity:      isSubmitting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || (alreadyExists && !!branchName.trim()) || isSubmitting}
            style={{
              padding:      '8px 22px',
              borderRadius: 8,
              fontSize:     12,
              fontWeight:   700,
              color:        '#fff',
              background:   isSubmitting
                ? 'linear-gradient(135deg,#a78bfa,#5eead4)'
                : canSubmit && !(alreadyExists && branchName.trim())
                  ? 'linear-gradient(135deg,#7c3aed,#0d9488)'
                  : '#c4b5fd',
              border:       'none',
              cursor:       canSubmit && !(alreadyExists && branchName.trim()) && !isSubmitting
                ? 'pointer' : 'not-allowed',
              boxShadow:    canSubmit && !isSubmitting
                ? '0 2px 10px rgba(124,58,237,0.28)' : 'none',
              fontFamily:   font,
              transition:   'all 0.15s',
              opacity:      canSubmit || isSubmitting ? 1 : 0.55,
              minWidth:     110,
            }}
          >
            {isSubmitting ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ animation: 'spin 0.75s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Saving…
              </span>
            ) : '+ Add Branch'}
          </button>
        </div>
      </div>

      {/* animations */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}