'use client';

import React, { useState, useEffect } from 'react';
import { POSDevice, Client, getBranchLicense } from './dashboard_overview_func';
import {
  MBtnS, MBtnP, MBtnXS,
  POSFormFields, POSFormData, BLANK_POS_FORM,
} from './popup_shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

interface Props {
  branch: string;
  client: Client;
  posDevices: POSDevice[];
  branchMsaStart?: string;
  branchMsaEnd?: string;
  branchDbId?: number;
  onClose: () => void;
  onAddPOS: (branch: string, posData: Omit<POSFormData, never>) => void;
  onEditPOS: (posId: string, posData: Omit<POSFormData, never>) => void;
  onRemovePOS: (posId: string) => void;
  onDeleteBranch?: (branch: string) => void;
}

function resolveBranchLicense(client: Client, branch: string, posDevices: POSDevice[]): string {
  const fromMap = client.branchLicenses?.[branch]?.trim();
  if (fromMap) return fromMap;
  if (client.cat !== 'F&B' && client.branchLicenses) {
    const anyShared = Object.values(client.branchLicenses).find(v => v?.trim());
    if (anyShared) return anyShared.trim();
  }
  if (client.licenseId?.trim()) return client.licenseId.trim();
  const fromPOS = posDevices.find(p => p.branch === branch && p.licenseNumber?.trim());
  if (fromPOS) return fromPOS.licenseNumber.trim();
  return '';
}

export default function BranchDetailPopup({
  branch, client, posDevices,
  branchMsaStart, branchMsaEnd,
  branchDbId,
  onClose, onAddPOS, onEditPOS, onRemovePOS, onDeleteBranch,
}: Props) {
  const isAloha  = client.cat === 'F&B';
  const isRetail = client.cat === 'Retail';

  const [branchLicense, setBranchLicense] = useState<string>(
    () => resolveBranchLicense(client, branch, posDevices),
  );
  const [licenseLoading, setLicenseLoading] = useState<boolean>(
    () => !resolveBranchLicense(client, branch, posDevices),
  );

  useEffect(() => {
    const local = resolveBranchLicense(client, branch, posDevices);
    if (local) {
      setBranchLicense(local);
      setLicenseLoading(false);
      return;
    }
    setLicenseLoading(true);
    fetch(`${API_BASE}/api/branches?company_id=${client.id}`, {
      headers: { 'Accept': 'application/json' },
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) return;
        const target = isAloha
          ? data.branches.find((b: any) => b.branch_name === branch && b.license_number?.trim())
          : [...data.branches].reverse().find((b: any) => b.license_number?.trim());
        if (target?.license_number) {
          setBranchLicense(target.license_number.trim());
        }
      })
      .catch(err => console.error('[BranchDetailPopup] license fetch failed:', err))
      .finally(() => setLicenseLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, branch]);

  const derivedMsaStart = branchMsaStart
    ?? (() => {
      const starts = posDevices.filter(p => p.branch === branch && p.msaStart).map(p => p.msaStart!);
      return starts.length ? starts.sort()[0] : '';
    })();
  const derivedMsaEnd = branchMsaEnd
    ?? (() => {
      const ends = posDevices.filter(p => p.branch === branch && p.msaEnd).map(p => p.msaEnd!);
      return ends.length ? ends.sort().at(-1)! : '';
    })();

  const getInitialPosForm = (): POSFormData => ({
    ...BLANK_POS_FORM,
    licenseNumber: branchLicense,
    msaStart: derivedMsaStart,
    msaEnd:   derivedMsaEnd,
  });

  const [showAddForm,  setShowAddForm]  = useState(false);
  const [posForm,      setPosForm]      = useState<POSFormData>({
    ...BLANK_POS_FORM,
    licenseNumber: resolveBranchLicense(client, branch, posDevices),
    msaStart: derivedMsaStart,
    msaEnd:   derivedMsaEnd,
  });
  const [formError,   setFormError]   = useState('');
  const [isSavingPos, setIsSavingPos] = useState(false);

  useEffect(() => {
    if (branchLicense && !posForm.licenseNumber) {
      setPosForm(prev => ({ ...prev, licenseNumber: branchLicense }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchLicense]);

  const [editingPosId,  setEditingPosId]  = useState<string | null>(null);
  const [editForm,      setEditForm]      = useState<POSFormData>(BLANK_POS_FORM);
  const [editError,     setEditError]     = useState('');
  const [isSavingEdit,  setIsSavingEdit]  = useState(false);

  const [confirmRemoveId,     setConfirmRemoveId]     = useState<string | null>(null);
  const [confirmDeleteBranch, setConfirmDeleteBranch] = useState(false);

  /* ── DB POS devices for this branch ── */
  const [dbPosDevices,      setDbPosDevices]      = useState<POSDevice[]>([]);
  const [posLoading,        setPosLoading]        = useState(true);

  /* ── Company-wide total POS count ── */
  const [companyTotalPos,   setCompanyTotalPos]   = useState<number | null>(null);
  const [companyPosLoading, setCompanyPosLoading] = useState(true);

  /* ── Fetch helpers ── */
  const resolveBranchDbId = async (): Promise<number | null> => {
    if (branchDbId) return branchDbId;
    try {
      const res  = await fetch(`${API_BASE}/api/branches?company_id=${client.id}`, { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (!res.ok || !data.success) return null;
      const found = data.branches.find((b: { branch_name: string; id: number }) => b.branch_name === branch);
      return found ? found.id : null;
    } catch { return null; }
  };

  const fetchBranchPos = async (bId: number) => {
    const res  = await fetch(`${API_BASE}/api/pos?branch_id=${bId}`, { headers: { 'Accept': 'application/json' } });
    const data = await res.json();
    if (!res.ok || !data.success) return;
    const mapped: POSDevice[] = (data.pos_machines ?? []).map((row: any) => ({
      id:            String(row.id),
      model:         row.model            ?? 'Unknown',
      licenseNumber: branchLicense        || '',
      ip:            row.ip_address       ?? '—',
      os:            row.operating_system ?? '—',
      branch,
      status:        'online' as const,
      msaStart:      derivedMsaStart      || undefined,
      msaEnd:        derivedMsaEnd        || undefined,
    }));
    setDbPosDevices(mapped);
  };

  const fetchCompanyTotalPos = async () => {
    setCompanyPosLoading(true);
    try {
      const brRes  = await fetch(`${API_BASE}/api/branches?company_id=${client.id}`, { headers: { 'Accept': 'application/json' } });
      const brData = await brRes.json();
      if (!brRes.ok || !brData.success) return;
      let total = 0;
      await Promise.all(
        brData.branches.map(async (b: any) => {
          try {
            const pRes  = await fetch(`${API_BASE}/api/pos?branch_id=${b.id}`, { headers: { 'Accept': 'application/json' } });
            const pData = await pRes.json();
            if (pRes.ok && pData.success) total += (pData.pos_machines ?? []).length;
          } catch { /* skip */ }
        })
      );
      setCompanyTotalPos(total);
    } catch (err) {
      console.error('[BranchDetailPopup] company POS total fetch failed:', err);
    } finally {
      setCompanyPosLoading(false);
    }
  };

  /* ── Initial data load ── */
  useEffect(() => {
    if (!client.id) { setPosLoading(false); setCompanyPosLoading(false); return; }

    const init = async () => {
      const bId = await resolveBranchDbId();
      if (bId) {
        try { await fetchBranchPos(bId); }
        catch (err) { console.error('[BranchDetailPopup] POS fetch failed:', err); }
      }
      setPosLoading(false);
      await fetchCompanyTotalPos();
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchDbId, client.id, branch, branchLicense]);

  /* Use DB devices when available, fall back to prop devices for this branch */
  const branchPOS = posLoading
    ? []
    : dbPosDevices.length > 0
      ? dbPosDevices
      : posDevices.filter(d => d.branch === branch);

  /* Stat card values */
  const companyPosStat = companyPosLoading ? '…' : companyTotalPos !== null ? companyTotalPos : client.posCount;
  const branchPosStat  = posLoading ? '…' : branchPOS.length;
  const totalBranches  = (client.branches || []).length;

  const headerGrad = isAloha
    ? 'linear-gradient(135deg,#d97706,#f59e0b)'
    : isRetail
    ? 'linear-gradient(135deg,#0284c7,#0ea5e9)'
    : 'linear-gradient(135deg,#0d9488,#14b8a6)';

  const licenseReadOnly = !isAloha;

  /* ── Add POS ── */
 const handleSaveAdd = async () => {
  if (!posForm.licenseNumber.trim()) { setFormError('License number is required.'); return; }
  if (!posForm.ip.trim())            { setFormError('IP address is required.'); return; }
  setFormError('');
  setIsSavingPos(true);

  try {
    const dbBranchId = await resolveBranchDbId();
    if (!dbBranchId) {
      setFormError('Could not resolve branch record. Please try again.');
      setIsSavingPos(false);
      return;
    }

    // ✅ REMOVED: the internal fetch POST /api/pos — the parent's onAddPOS handles DB insert
    // Only call onAddPOS; it will POST to the DB via handleAddPOSFromBranch
    onAddPOS(branch, posForm);
    setPosForm(getInitialPosForm());
    setShowAddForm(false);

    setPosLoading(true);
    await fetchBranchPos(dbBranchId);
    setPosLoading(false);
    await fetchCompanyTotalPos();

  } catch (err: any) {
    setFormError(err?.message ?? 'Network error — could not reach the server.');
  } finally {
    setIsSavingPos(false);
  }
};

  /* ── Edit POS — open form ── */
  const startEdit = (pos: POSDevice) => {
    setEditingPosId(pos.id);
    setEditForm({
      model:         pos.model,
      licenseNumber: pos.licenseNumber || branchLicense,
      ip:            pos.ip,
      os:            pos.os,
      msaStart:      pos.msaStart || '',
      msaEnd:        pos.msaEnd   || '',
      warrantyDate:  '',
    });
    setEditError('');
    setConfirmRemoveId(null);
    setShowAddForm(false);
    setConfirmDeleteBranch(false);
  };

  /* ── Edit POS — save to DB ── */
  const handleSaveEdit = async () => {
    if (!editForm.licenseNumber.trim()) { setEditError('License number is required.'); return; }
    if (!editForm.ip.trim())            { setEditError('IP address is required.'); return; }
    setEditError('');
    setIsSavingEdit(true);

    try {
      const posId = editingPosId!;
      const body  = new FormData();
      body.append('model',            editForm.model);
      body.append('ip_address',       editForm.ip);
      body.append('operating_system', editForm.os);
      body.append('_method',          'PUT');

      const res  = await fetch(`${API_BASE}/api/pos/${posId}`, {
        method:  'POST',
        headers: { 'Accept': 'application/json' },
        body,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const msg = data.errors
          ? Object.values(data.errors as Record<string, string[]>).flat().join(' ')
          : data.message ?? `Server error ${res.status}`;
        setEditError(msg);
        setIsSavingEdit(false);
        return;
      }

      setDbPosDevices(prev =>
        prev.map(p =>
          p.id === posId
            ? { ...p, model: editForm.model, ip: editForm.ip, os: editForm.os }
            : p,
        ),
      );
      onEditPOS(posId, editForm);
      setEditingPosId(null);

    } catch (err: any) {
      setEditError(err?.message ?? 'Network error — could not reach the server.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  /* ── Remove POS ── */
  const handleRemove = (posId: string) => {
    onRemovePOS(posId);
    setDbPosDevices(prev => prev.filter(p => p.id !== posId));
    setConfirmRemoveId(null);
    if (editingPosId === posId) setEditingPosId(null);
    setCompanyTotalPos(prev => prev !== null ? Math.max(0, prev - 1) : null);
  };

  const handleDeleteBranch = () => {
    onDeleteBranch?.(branch);
    onClose();
  };

  const catLabel = isAloha ? 'Aloha' : client.cat;

  const licenseBadgeStyle: React.CSSProperties = isAloha
    ? { background: 'rgba(217,119,6,0.15)', color: '#92400e', border: '1px solid rgba(217,119,6,0.3)' }
    : { background: 'rgba(124,58,237,0.12)', color: '#4c1d95', border: '1px solid rgba(124,58,237,0.22)' };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,7,36,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div style={{
        width: 620, maxWidth: '96vw', maxHeight: '90vh',
        background: '#fff', borderRadius: 18,
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
        overflow: 'hidden', fontFamily: "'DM Sans',sans-serif",
        display: 'flex', flexDirection: 'column',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
          background: headerGrad, flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z"/>
              <circle cx="9" cy="7" r="1.8"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{branch}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {client.name} · {catLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1l9 9M10 1L1 10"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, padding: '18px 20px' }}>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isAloha ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10 }}>
            <StatCard
              value={companyPosStat}
              label="POS Machines"
              color="#0d9488"
              bg="rgba(13,148,136,0.07)"
              border="rgba(13,148,136,0.18)"
              loading={companyPosLoading}
            />
            {isAloha ? (
              <MSAExpiryCard posDevices={branchPOS} />
            ) : (
              <>
                <StatCard
                  value={branchPosStat}
                  label="Seats"
                  color="#0284c7"
                  bg="rgba(2,132,199,0.07)"
                  border="rgba(2,132,199,0.18)"
                  loading={posLoading}
                />
                <StatCard
                  value={totalBranches}
                  label="Total Branches"
                  color="#7c3aed"
                  bg="#ede9fe"
                  border="rgba(124,58,237,0.18)"
                />
              </>
            )}
          </div>

          {/* Active License Banner */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: isAloha ? 'rgba(217,119,6,0.05)' : 'rgba(124,58,237,0.05)',
            border: `1.5px solid ${isAloha ? 'rgba(217,119,6,0.22)' : 'rgba(124,58,237,0.18)'}`,
            borderRadius: 12, padding: '12px 16px',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              background: isAloha ? 'rgba(217,119,6,0.12)' : 'rgba(124,58,237,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke={isAloha ? '#d97706' : '#7c3aed'} strokeWidth="1.5">
                <circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: isAloha ? '#92400e' : '#4c1d95' }}>
                  Active License
                </span>
                <span style={{ ...licenseBadgeStyle, fontSize: 8.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, letterSpacing: '0.06em' }}>
                  {isAloha ? 'Unique per branch' : 'Shared — all branches'}
                </span>
              </div>
              {licenseLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isAloha ? '#d97706' : '#7c3aed'} strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  <span style={{ fontSize: 12, color: '#8e7ec0', fontStyle: 'italic' }}>Fetching license…</span>
                </div>
              ) : branchLicense ? (
                <div style={{ fontSize: 15, fontWeight: 800, color: isAloha ? '#d97706' : '#7c3aed', letterSpacing: '0.02em', wordBreak: 'break-all' }}>
                  {branchLicense}
                </div>
              ) : (
                <div style={{ fontSize: 12, fontStyle: 'italic', color: '#b8aed8', fontWeight: 400 }}>
                  No license assigned to this branch yet.
                </div>
              )}
              <div style={{ fontSize: 10, color: '#8e7ec0', marginTop: 4, lineHeight: 1.5 }}>
                {isAloha
                  ? `This license is exclusively assigned to the ${branch} branch.`
                  : `This shared license is automatically applied to all branches under ${client.name}.`}
              </div>
            </div>
          </div>

          {/* MSA Dates */}
          {(derivedMsaStart || derivedMsaEnd) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: '#f8f7ff', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 10, padding: '10px 14px' }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#7c3aed" strokeWidth="1.5">
                <rect x="2" y="3.5" width="12" height="10" rx="1.5"/><path d="M2 6.5h12M5.5 2v3M10.5 2v3"/>
              </svg>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {derivedMsaStart && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#8e7ec0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>MSA Start</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>
                      {new Date(derivedMsaStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                )}
                {derivedMsaEnd && (
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#8e7ec0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>MSA End</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>
                      {new Date(derivedMsaEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── POS Devices List ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8e7ec0', letterSpacing: '0.13em', textTransform: 'uppercase' }}>
                POS Devices at this Branch
              </span>
              <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                {posLoading ? '…' : branchPOS.length}
              </span>
              <div style={{ flex: 1 }} />
              {!showAddForm && !editingPosId && (
                <button
                  onClick={() => {
                    setPosForm({ ...BLANK_POS_FORM, licenseNumber: branchLicense, msaStart: derivedMsaStart, msaEnd: derivedMsaEnd });
                    setShowAddForm(true);
                    setConfirmRemoveId(null);
                    setConfirmDeleteBranch(false);
                  }}
                  style={{ ...MBtnP, fontSize: 10.5, padding: '6px 12px', gap: 5 }}
                >
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="9" height="9"><path d="M6 1v10M1 6h10"/></svg>
                  Add POS
                </button>
              )}
            </div>

            {/* Add POS Form */}
            {showAddForm && (
              <div style={{ background: 'rgba(124,58,237,0.04)', border: '1.5px solid rgba(124,58,237,0.18)', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7c3aed' }}>New POS Device — {branch}</span>
                  <button style={{ ...MBtnXS, background: '#f2f0fb', color: '#4a3870' }}
                    onClick={() => { setShowAddForm(false); setFormError(''); setPosForm(getInitialPosForm()); }}
                    disabled={isSavingPos}>
                    ✕ Cancel
                  </button>
                </div>
                <POSFormFields form={posForm} onChange={setPosForm} error={formError} licenseReadOnly={licenseReadOnly} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button style={MBtnS}
                    onClick={() => { setShowAddForm(false); setFormError(''); setPosForm(getInitialPosForm()); }}
                    disabled={isSavingPos}>
                    Cancel
                  </button>
                  <button
                    style={{ ...MBtnP, boxShadow: '0 2px 10px rgba(124,58,237,0.3)', opacity: isSavingPos ? 0.7 : 1, cursor: isSavingPos ? 'not-allowed' : 'pointer' }}
                    onClick={handleSaveAdd}
                    disabled={isSavingPos}
                  >
                    {isSavingPos ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite' }}>
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        </svg>
                        Saving…
                      </>
                    ) : (
                      <><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="11" height="11"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>Save POS</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {posLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {[1, 2].map(i => (
                  <div key={i} style={{ borderRadius: 12, border: '1px solid rgba(124,58,237,0.1)', padding: '14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <div style={{ width: '40%', height: 12, borderRadius: 5, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                      <div style={{ width: '65%', height: 10, borderRadius: 5, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!posLoading && branchPOS.length === 0 && !showAddForm && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#8e7ec0', fontSize: 12, background: '#f2f0fb', borderRadius: 12, border: '1.5px dashed rgba(124,58,237,0.22)' }}>
                No POS machines assigned to this branch yet.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {branchPOS.map((pos) => (
                <div key={pos.id}>
                  {editingPosId === pos.id ? (
                    /* ── Edit form ── */
                    <div style={{ background: 'rgba(13,148,136,0.04)', border: '1.5px solid rgba(13,148,136,0.22)', borderRadius: 14, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0d9488' }}>Edit {pos.model}</span>
                        <button style={{ ...MBtnXS, background: '#f2f0fb', color: '#4a3870' }} onClick={() => { setEditingPosId(null); setEditError(''); }} disabled={isSavingEdit}>
                          ✕ Cancel
                        </button>
                      </div>
                      <POSFormFields form={editForm} onChange={setEditForm} error={editError} licenseReadOnly={licenseReadOnly} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button style={MBtnS} onClick={() => { setEditingPosId(null); setEditError(''); }} disabled={isSavingEdit}>Cancel</button>
                        <button
                          style={{
                            ...MBtnP,
                            background: 'linear-gradient(135deg,#0d9488,#0284c7)',
                            boxShadow: '0 2px 10px rgba(13,148,136,0.3)',
                            opacity: isSavingEdit ? 0.7 : 1,
                            cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                          }}
                          onClick={handleSaveEdit}
                          disabled={isSavingEdit}
                        >
                          {isSavingEdit ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite' }}>
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                              </svg>
                              Saving…
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="11" height="11"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── POS row — license badge REMOVED ── */
                    <div style={{
                      borderRadius: 12,
                      border: confirmRemoveId === pos.id ? '1.5px solid #dc2626' : '1px solid rgba(124,58,237,0.1)',
                      overflow: 'hidden', background: '#fff', transition: 'border-color 0.15s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
                        {/* Icon */}
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5">
                            <rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/>
                          </svg>
                        </div>

                        {/* Info — model name only, no license badge */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#18103a', marginBottom: 4 }}>
                            {pos.model}
                          </div>
                          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {[{ label: 'IP', val: pos.ip || '—' }, { label: 'OS', val: pos.os || '—' }].map(({ label, val }) => (
                              <span key={label} style={{ fontSize: 10.5, color: '#8e7ec0' }}>
                                <span style={{ fontWeight: 600, color: '#4a3870' }}>{label}: </span>{val}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                          <button
                            onClick={() => startEdit(pos)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.18)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.14s' }}
                            onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#ede9fe'; el.style.borderColor = 'rgba(124,58,237,0.35)'; }}
                            onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#f2f0fb'; el.style.borderColor = 'rgba(124,58,237,0.18)'; }}
                          >
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M8 1l3 3L4 11H1V8z"/></svg>
                            Edit
                          </button>
                          <button
                            onClick={() => setConfirmRemoveId(confirmRemoveId === pos.id ? null : pos.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fee2e2', border: '1px solid rgba(220,38,38,0.2)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.14s' }}
                            onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#fecaca'; el.style.borderColor = 'rgba(220,38,38,0.4)'; }}
                            onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#fee2e2'; el.style.borderColor = 'rgba(220,38,38,0.2)'; }}
                          >
                            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" width="10" height="10"><path d="M2 3h8M5 3V2h2v1M10 3l-.8 7H2.8L2 3"/></svg>
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Confirm remove banner */}
                      {confirmRemoveId === pos.id && (
                        <div style={{ background: '#fee2e2', borderTop: '1px solid rgba(220,38,38,0.18)', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#dc2626" strokeWidth="1.6"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/></svg>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', flex: 1 }}>Remove {pos.model}? This cannot be undone.</span>
                          <button style={{ ...MBtnXS, background: '#fff', color: '#4a3870' }} onClick={() => setConfirmRemoveId(null)}>Cancel</button>
                          <button style={{ ...MBtnXS, background: '#dc2626', color: '#fff', border: 'none', boxShadow: '0 1px 6px rgba(220,38,38,0.3)' }} onClick={() => handleRemove(pos.id)}>
                            Confirm Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(124,58,237,0.1)', background: '#f8f7ff', overflow: 'hidden' }}>
          {confirmDeleteBranch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', background: '#fee2e2', borderBottom: '1px solid rgba(220,38,38,0.18)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#dc2626" strokeWidth="1.6"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/></svg>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#dc2626', flex: 1 }}>
                Delete <strong>"{branch}"</strong>? This will also remove all {branchPOS.length} POS device{branchPOS.length !== 1 ? 's' : ''}. This cannot be undone.
              </span>
              <button style={{ ...MBtnXS, background: '#fff', color: '#4a3870', flexShrink: 0 }} onClick={() => setConfirmDeleteBranch(false)}>Cancel</button>
              <button style={{ ...MBtnXS, flexShrink: 0, background: '#dc2626', color: '#fff', border: 'none', boxShadow: '0 1px 6px rgba(220,38,38,0.3)', fontWeight: 700 }} onClick={handleDeleteBranch}>
                Confirm Delete
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px' }}>
            {onDeleteBranch && !confirmDeleteBranch ? (
              <button
                onClick={() => { setConfirmDeleteBranch(true); setConfirmRemoveId(null); setShowAddForm(false); setEditingPosId(null); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#fecaca'; el.style.borderColor = 'rgba(220,38,38,0.45)'; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#fee2e2'; el.style.borderColor = 'rgba(220,38,38,0.25)'; }}
              >
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" width="11" height="11"><path d="M2 3h8M5 3V2h2v1M10 3l-.8 7H2.8L2 3"/></svg>
                Delete Branch
              </button>
            ) : <div />}
            <button style={MBtnS} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}

/* ── Helper components ── */
function StatCard({ value, label, color, bg, border, loading }: {
  value: number | string; label: string;
  color: string; bg: string; border: string; loading?: boolean;
}) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '14px 16px', border: `1px solid ${border}`, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>
        {loading ? <span style={{ fontSize: 16, opacity: 0.5 }}>…</span> : value}
      </div>
      <div style={{ fontSize: 10.5, color: '#8e7ec0', marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function MSAExpiryCard({ posDevices }: { posDevices: POSDevice[] }) {
  const ends   = posDevices.map(p => p.msaEnd).filter(Boolean) as string[];
  const msaEnd = ends.length ? ends.sort().at(-1) : undefined;
  const days: number | null = (() => {
    if (!msaEnd) return null;
    const end = new Date(msaEnd); const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - now.getTime()) / 86400000);
  })();
  const status = (() => {
    if (days === null) return { label: 'UNKNOWN',       color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
    if (days <= 0)     return { label: 'EXPIRED',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
    if (days <= 30)    return { label: 'EXPIRING SOON', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
    if (days <= 90)    return { label: 'DUE SOON',      color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' };
    return                    { label: 'ACTIVE',        color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  })();
  const displayDate = msaEnd
    ? new Date(msaEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';
  const daysText = days === null ? null : days <= 0 ? 'Expired' : `${days}d left`;
  return (
    <div style={{ background: status.bg, borderRadius: 14, padding: '14px 16px', border: `1px solid ${status.border}`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 7.5, fontWeight: 800, letterSpacing: '0.06em', color: status.color, background: status.color + '18', border: `1px solid ${status.color}40`, borderRadius: 4, padding: '2px 5px', whiteSpace: 'nowrap' }}>{status.label}</span>
      <div style={{ fontSize: 14, fontWeight: 800, color: status.color, lineHeight: 1.3, marginTop: 6 }}>{displayDate}</div>
      {daysText && <div style={{ fontSize: 10, fontWeight: 700, color: status.color, opacity: 0.8, marginTop: 2 }}>{daysText}</div>}
      <div style={{ fontSize: 10.5, color: '#8e7ec0', marginTop: 4, fontWeight: 500 }}>MSA Expiry</div>
    </div>
  );
}