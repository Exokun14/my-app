'use client';

import React, { useState, useEffect } from 'react';
import {
  DBBranch, POSDevice,
  useClickOutside,
} from './overview_func';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface DBPosMachineRow {
  id:               number;
  branch_id:        number;
  model:            string;
  serial_number:    string;
  operating_system: string;
  warranty_date:    string | null;
}

interface DBPeripheralRow {
  id:            number;
  pos_id:        number;
  model_name:    string;
  serial_number: string | null;
  warranty_date: string | null;
}

interface PeripheralItem {
  id:           string;
  model:        string;
  serial:       string;
  warrantyDate: string;
}
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  branch:            DBBranch;
  companyId:         number;
  companyName:       string;
  isAloha:           boolean;
  onClose:           () => void;
  onViewPeripherals: (posId: string, posModel: string, peripherals: PeripheralItem[]) => void;
}

export default function BranchModal({
  branch, companyId, companyName, isAloha, onClose, onViewPeripherals,
}: Props) {
  const ref        = useClickOutside<HTMLDivElement>(onClose);
  const branchName = branch.branch_name ?? 'Branch';

  // ── POS detail ───────────────────────────────────────────────────────────
  const [selectedPos, setSelectedPos] = useState<POSDevice | null>(null);

  // ── License ──────────────────────────────────────────────────────────────
  const [branchLicense,  setBranchLicense]  = useState<string>(branch.license_number?.trim() || '');
  const [licenseLoading, setLicenseLoading] = useState<boolean>(!branch.license_number?.trim());

  // ── POS ──────────────────────────────────────────────────────────────────
  const [dbPosDevices, setDbPosDevices] = useState<POSDevice[]>([]);
  const [posLoading,   setPosLoading]   = useState(true);

  // ── Company total POS ─────────────────────────────────────────────────────
  const [companyTotalPos,   setCompanyTotalPos]   = useState<number | null>(null);
  const [companyPosLoading, setCompanyPosLoading] = useState(true);

  // ── Peripherals ───────────────────────────────────────────────────────────
  const [peripheralsMap,     setPeripheralsMap]     = useState<Record<string, PeripheralItem[]>>({});
  const [peripheralsLoading, setPeripheralsLoading] = useState(false);

  // ── MSA from branch row ───────────────────────────────────────────────────
  const msaStart = branch.msa_start_date ?? '';
  const msaEnd   = branch.msa_end_date   ?? '';
  const implDate = branch.implementation_date ?? null;

  // ── Fetch peripherals ─────────────────────────────────────────────────────
  const fetchPeripherals = async (posIds: string[]) => {
    if (!posIds.length) return;
    setPeripheralsLoading(true);
    try {
      const results = await Promise.all(
        posIds.map(async posId => {
          const res  = await fetch(`${API_BASE}/api/peripherals?pos_id=${posId}`, { headers: { Accept: 'application/json' } });
          const data = await res.json();
          if (!res.ok || !data.success) return { posId, items: [] as PeripheralItem[] };
          const items: PeripheralItem[] = (data.peripherals ?? []).map((r: DBPeripheralRow) => ({
            id:           String(r.id),
            model:        r.model_name    ?? '',
            serial:       r.serial_number ?? '',
            warrantyDate: r.warranty_date ?? '',
          }));
          return { posId, items };
        }),
      );
      setPeripheralsMap(prev => {
        const next = { ...prev };
        results.forEach(({ posId, items }) => { next[posId] = items; });
        return next;
      });
    } catch (err) {
      console.error('[BranchModal] fetchPeripherals failed:', err);
    } finally {
      setPeripheralsLoading(false);
    }
  };

  // ── Fetch branch POS ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!branch.id) { setPosLoading(false); return; }

    const loadData = async () => {
      try {
        // POS for this branch
        const posRes  = await fetch(`${API_BASE}/api/pos?branch_id=${branch.id}`, { headers: { Accept: 'application/json' } });
        const posData = await posRes.json();
        if (posRes.ok && posData.success) {
          const mapped: POSDevice[] = (posData.pos_machines ?? []).map((r: DBPosMachineRow) => ({
            id:            String(r.id),
            model:         r.model            ?? 'Unknown',
            licenseNumber: branchLicense      || '',
            serial:        r.serial_number    ?? '—',
            os:            r.operating_system ?? '—',
            branch:        branchName,
            status:        'online' as const,
            msaStart:      msaStart || undefined,
            msaEnd:        msaEnd   || undefined,
            warranty:      r.warranty_date ?? undefined,
          }));
          setDbPosDevices(mapped);
          await fetchPeripherals(mapped.map(p => p.id));
        }

        // Company-wide license fallback (non-Aloha: any branch's license)
        if (!branchLicense) {
          setLicenseLoading(true);
          const brRes  = await fetch(`${API_BASE}/api/branches?company_id=${companyId}`, { headers: { Accept: 'application/json' } });
          const brData = await brRes.json();
          if (brRes.ok && brData.success) {
            const target = isAloha
              ? brData.branches.find((b: any) => b.branch_name === branchName && b.license_number?.trim())
              : [...brData.branches].reverse().find((b: any) => b.license_number?.trim());
            if (target?.license_number) setBranchLicense(target.license_number.trim());
          }
          setLicenseLoading(false);
        }

        // Company total POS
        setCompanyPosLoading(true);
        const allBrRes  = await fetch(`${API_BASE}/api/branches?company_id=${companyId}`, { headers: { Accept: 'application/json' } });
        const allBrData = await allBrRes.json();
        if (allBrRes.ok && allBrData.success) {
          let total = 0;
          await Promise.all(
            allBrData.branches.map(async (b: any) => {
              try {
                const pRes  = await fetch(`${API_BASE}/api/pos?branch_id=${b.id}`, { headers: { Accept: 'application/json' } });
                const pData = await pRes.json();
                if (pRes.ok && pData.success) total += (pData.pos_machines ?? []).length;
              } catch { /* skip */ }
            }),
          );
          setCompanyTotalPos(total);
        }
      } catch (err) {
        console.error('[BranchModal] init fetch failed:', err);
      } finally {
        setPosLoading(false);
        setCompanyPosLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch.id]);

  // ── Derived values ────────────────────────────────────────────────────────
  const branchPosStat  = posLoading        ? '…' : dbPosDevices.length;
  const companyPosStat = companyPosLoading ? '…' : companyTotalPos !== null ? companyTotalPos : 0;

  const headerGrad = isAloha
    ? 'linear-gradient(135deg,#d97706,#f59e0b)'
    : 'linear-gradient(135deg,#0284c7,#0ea5e9)';

  const licenseColor  = isAloha ? '#d97706' : '#7c3aed';
  const licenseBg     = isAloha ? 'rgba(217,119,6,0.05)'   : 'rgba(124,58,237,0.05)';
  const licenseBorder = isAloha ? 'rgba(217,119,6,0.22)'   : 'rgba(124,58,237,0.18)';
  const licenseIcon   = isAloha ? '#d97706'                : '#7c3aed';
  const badgeStyle: React.CSSProperties = isAloha
    ? { background: 'rgba(217,119,6,0.15)', color: '#92400e', border: '1px solid rgba(217,119,6,0.3)' }
    : { background: 'rgba(124,58,237,0.12)', color: '#4c1d95', border: '1px solid rgba(124,58,237,0.22)' };

  return (
    <>
      <div
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,7,36,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10002, padding: 20,
          fontFamily: "'DM Sans',sans-serif",
        }}
      >
        <div
          ref={ref}
          style={{
            width: 660, maxWidth: '96vw', maxHeight: '92vh',
            background: '#fff', borderRadius: 18,
            boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 20px', background: headerGrad, flexShrink: 0,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.5">
                <path d="M9 2C6.2 2 4 4.2 4 7c0 4.5 5 9 5 9s5-4.5 5-9c0-2.8-2.2-5-5-5z"/>
                <circle cx="9" cy="7" r="1.8"/>
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{branchName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                {companyName}
              </div>
            </div>

            {/* Active / Inactive status badge (read-only) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                background: implDate ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)',
                border: `1px solid ${implDate ? 'rgba(22,163,74,0.5)' : 'rgba(220,38,38,0.5)'}`,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: implDate ? '#4ade80' : '#f87171',
                  boxShadow: implDate ? '0 0 5px rgba(74,222,128,0.7)' : '0 0 5px rgba(248,113,113,0.7)',
                }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
                  {implDate ? 'Active' : 'Inactive'}
                </span>
              </div>
              {implDate && (
                <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                  since {fmt(implDate)}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 1l9 9M10 1L1 10"/>
              </svg>
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, padding: '18px 20px' }}>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              <StatCard value={companyPosStat} label="POS Machines" color="#0d9488" bg="rgba(13,148,136,0.07)" border="rgba(13,148,136,0.18)" loading={companyPosLoading} />
            </div>

            {/* License Banner */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: licenseBg,
              border: `1.5px solid ${licenseBorder}`,
              borderRadius: 12, padding: '12px 16px',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: isAloha ? 'rgba(217,119,6,0.12)' : 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke={licenseIcon} strokeWidth="1.5">
                  <circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/>
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: isAloha ? '#92400e' : '#4c1d95' }}>
                    Active License
                  </span>
                  <span style={{ ...badgeStyle, fontSize: 8.5, fontWeight: 700, padding: '2px 8px', borderRadius: 5, letterSpacing: '0.06em' }}>
                    {isAloha ? 'Unique per branch' : 'Shared — all branches'}
                  </span>
                </div>

                {licenseLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={licenseIcon} strokeWidth="2.5"
                      style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    <span style={{ fontSize: 12, color: '#8e7ec0', fontStyle: 'italic' }}>Fetching license…</span>
                  </div>
                ) : branchLicense ? (
                  <div style={{ fontSize: 15, fontWeight: 800, color: licenseColor, letterSpacing: '0.02em', wordBreak: 'break-all' }}>
                    {branchLicense}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, fontStyle: 'italic', color: '#b8aed8', fontWeight: 400 }}>No license assigned yet.</div>
                )}

                <div style={{ fontSize: 10, color: '#8e7ec0', marginTop: 4, lineHeight: 1.5 }}>
                  {isAloha
                    ? `This license is exclusively assigned to the ${branchName} branch.`
                    : `This shared license applies to all branches under ${companyName}.`}
                </div>
              </div>

              {/* MSA dates + Implementation date */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
                borderLeft: `1px solid ${licenseBorder}`,
                paddingLeft: 16, marginLeft: 4,
              }}>
                {msaStart && (
                  <div>
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 3, color: licenseColor, opacity: 0.8 }}>MSA Start</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#18103a', whiteSpace: 'nowrap' as const }}>{fmt(msaStart)}</div>
                  </div>
                )}
                {msaEnd && (
                  <div>
                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 3, color: licenseColor, opacity: 0.8 }}>MSA End</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#18103a', whiteSpace: 'nowrap' as const }}>{fmt(msaEnd)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* POS Devices */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8e7ec0', letterSpacing: '0.13em', textTransform: 'uppercase' as const }}>
                  POS Devices at this Branch
                </span>
                <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                  {posLoading ? '…' : dbPosDevices.length}
                </span>
              </div>

              {/* Loading skeleton */}
              {posLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2].map(i => (
                    <div key={i} style={{ borderRadius: 12, border: '1px solid rgba(124,58,237,0.1)', padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <div style={{ width: '40%', height: 12, borderRadius: 5, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                        <div style={{ width: '65%', height: 10, borderRadius: 5, background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!posLoading && dbPosDevices.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: '#8e7ec0', fontSize: 12, background: '#f2f0fb', borderRadius: 12, border: '1.5px dashed rgba(124,58,237,0.22)' }}>
                  No POS machines assigned to this branch yet.
                </div>
              )}

              {/* POS rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dbPosDevices.map(pos => {
                  const posPeripherals = peripheralsMap[pos.id] ?? [];
                  const pCount         = posPeripherals.length;

                  return (
                    <div
                      key={pos.id}
                      style={{ borderRadius: 12, border: '1px solid rgba(124,58,237,0.1)', overflow: 'hidden', background: '#fff', transition: 'all 0.15s' }}
                    >
                      <div
                        onClick={() => setSelectedPos(pos)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f8f7ff'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#fff'; }}
                      >
                        {/* POS icon */}
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5">
                            <rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/>
                          </svg>
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#18103a', marginBottom: 4 }}>{pos.model}</div>
                          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                            {[
                              { label: 'S/N', val: pos.serial || '—' },
                              { label: 'OS',  val: (pos.os || '—').split(' — ')[0] },
                            ].map(({ label, val }) => (
                              <span key={label} style={{ fontSize: 10.5, color: '#8e7ec0' }}>
                                <span style={{ fontWeight: 600, color: '#4a3870' }}>{label}: </span>{val}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Peripherals button + chevron */}
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => onViewPeripherals(pos.id, pos.model, posPeripherals)}
                            disabled={peripheralsLoading}
                            title="View Peripherals & Accessories"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '5px 10px', borderRadius: 8, fontSize: 10.5, fontWeight: 600,
                              color:      pCount > 0 ? '#5b21b6' : '#8e7ec0',
                              background: pCount > 0 ? '#ede9fe'  : '#f2f0fb',
                              border: `1px solid ${pCount > 0 ? 'rgba(124,58,237,0.28)' : 'rgba(124,58,237,0.14)'}`,
                              cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.14s',
                            }}
                            onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#ede9fe'; el.style.borderColor = 'rgba(124,58,237,0.35)'; el.style.color = '#5b21b6'; }}
                            onMouseLeave={e => { const el = e.currentTarget; el.style.background = pCount > 0 ? '#ede9fe' : '#f2f0fb'; el.style.borderColor = pCount > 0 ? 'rgba(124,58,237,0.28)' : 'rgba(124,58,237,0.14)'; el.style.color = pCount > 0 ? '#5b21b6' : '#8e7ec0'; }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                            Peripherals
                            {pCount > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, borderRadius: 20, background: '#7c3aed', color: '#fff', fontSize: 8.5, fontWeight: 800, padding: '0 4px' }}>
                                {pCount}
                              </span>
                            )}
                          </button>

                          <div style={{ width: 1, height: 22, background: 'rgba(124,58,237,0.12)', flexShrink: 0 }} />
                          <div
                            onClick={() => setSelectedPos(pos)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.12)', cursor: 'pointer', transition: 'all 0.14s', flexShrink: 0 }}
                            onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#ede9fe'; el.style.borderColor = 'rgba(124,58,237,0.3)'; }}
                            onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#f2f0fb'; el.style.borderColor = 'rgba(124,58,237,0.12)'; }}
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#8e7ec0" strokeWidth="1.6"><path d="M4 2l4 4-4 4"/></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{
            flexShrink: 0, borderTop: '1px solid rgba(124,58,237,0.1)',
            background: '#f8f7ff', padding: '12px 20px',
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <button
              onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '7px 22px', borderRadius: 9,
                border: '1.5px solid rgba(124,58,237,0.2)',
                background: '#fff', fontSize: 12, fontWeight: 600, color: '#4a3870',
                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f3ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* POS Detail popup — renders on top of BranchModal */}
      {selectedPos && (
        <POSDetailPopup
          pos={selectedPos}
          companyName={companyName}
          isAloha={isAloha}
          posIndex={dbPosDevices.findIndex(p => p.id === selectedPos.id) + 1}
          onClose={() => setSelectedPos(null)}
        />
      )}

      <style>{`
        @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </>
  );
}

// ── Stat card sub-component ────────────────────────────────────────────────────
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

// ── POS Detail Popup ───────────────────────────────────────────────────────────
function POSDetailPopup({ pos, companyName, isAloha, posIndex, onClose }: {
  pos:         POSDevice;
  companyName: string;
  isAloha:     boolean;
  posIndex:    number;
  onClose:     () => void;
}) {
  const warrantyDisplay = pos.warranty
    ? new Date(pos.warranty).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  const specs = [
    { label: 'Device Model',   value: pos.model },
    { label: 'License Number', value: pos.licenseNumber || '—' },
    { label: 'Serial Number',  value: pos.serial || '—' },
    { label: 'OS Version',     value: pos.os },
    { label: 'Warranty Date',  value: warrantyDisplay },
    { label: 'Branch',         value: pos.branch },
  ];

  const getValueColor = (label: string): string => {
    if (label === 'License Number') return isAloha ? '#d97706' : '#7c3aed';
    if (label === 'Serial Number')  return '#0d9488';
    if (label === 'OS Version')     return '#7c3aed';
    return '#18103a';
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,7,36,0.5)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10003, padding: 20,
        fontFamily: "'DM Sans',sans-serif",
      }}
    >
      <div style={{
        width: 460, maxWidth: '96vw',
        background: '#fff', borderRadius: 18,
        boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
          background: 'linear-gradient(135deg,#0f766e,#0284c7)', flexShrink: 0,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="13" rx="2"/><path d="M2 10h20M12 16v3M8 19h8"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{pos.model}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {companyName} · {pos.branch} · {isAloha ? 'Aloha' : 'Retail'}
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.18)', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            #{posIndex}
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.18)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)'; }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px' }}>
          {/* License type pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: isAloha ? 'rgba(217,119,6,0.1)' : 'rgba(124,58,237,0.08)',
            border: `1px solid ${isAloha ? 'rgba(217,119,6,0.22)' : 'rgba(124,58,237,0.18)'}`,
            borderRadius: 20, padding: '3px 10px', marginBottom: 14,
            fontSize: 9.5, fontWeight: 700,
            color: isAloha ? '#92400e' : '#4c1d95',
            letterSpacing: '0.06em', textTransform: 'uppercase' as const,
          }}>
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h4M11 6.5V8"/>
            </svg>
            {isAloha ? 'Branch-specific license' : 'Shared license (all branches)'}
          </div>

          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b8aed8', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(124,58,237,0.1)' }}>
            DEVICE SPECIFICATIONS
          </div>

          <div style={{ background: '#f2f0fb', borderRadius: 12, border: '1px solid rgba(124,58,237,0.1)', overflow: 'hidden' }}>
            {specs.map((row, i) => (
              <div key={row.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 16px', gap: 16,
                borderBottom: i < specs.length - 1 ? '1px solid rgba(124,58,237,0.1)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'rgba(124,58,237,0.015)',
              }}>
                <span style={{ fontSize: 11.5, color: '#8e7ec0', fontWeight: 500, flexShrink: 0, minWidth: 120 }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: getValueColor(row.label), textAlign: 'right', wordBreak: 'break-all' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid rgba(124,58,237,0.1)', background: '#f8f7ff', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 22px', borderRadius: 9, border: '1.5px solid rgba(124,58,237,0.2)', background: '#fff', fontSize: 12, fontWeight: 600, color: '#4a3870', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f3ff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}