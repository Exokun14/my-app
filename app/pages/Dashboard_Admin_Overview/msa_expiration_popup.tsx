/* ==============================================================
   msa_expiration_popup.tsx  ·  MSA Expiration Details Modal
   Aloha:             per-branch rows in 2-col grid, per-branch license & MSA editing
                      → PUT /api/branches/{branchId}  (single branch)
   Retail/Warehouse:  company-wide card, shared license & MSA editing
                      → PUT /api/branches/{id} for EVERY branch in parallel
                      → then updates all POS devices in local state via onLicenseUpdate
   ============================================================== */

'use client';

import React, { useState, useEffect } from 'react';
import { Client, POSDevice, formatDate } from './dashboard_overview_func';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

interface MSAExpirationPopupProps {
  client:     Client;
  posDevices: POSDevice[];
  onClose:    () => void;
  onLicenseUpdate?: (updatedClient: Partial<Client>, updatedDevices: POSDevice[]) => void;
}

interface DBBranch {
  id:             number;
  company_id:     number;
  branch_name:    string;
  license_number: string | null;
  msa_start_date: string | null;
  msa_end_date:   string | null;
}

/* ── helpers ─────────────────────────────────────────────────── */
function daysLeft(dateStr?: string): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

function statusInfo(days: number | null) {
  if (days === null) return { label: 'UNKNOWN',       color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
  if (days <= 0)     return { label: 'EXPIRED',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  if (days <= 30)    return { label: 'EXPIRING SOON', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  if (days <= 90)    return { label: 'DUE SOON',      color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' };
  return              { label: 'ACTIVE',              color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
}

interface BranchMSA { branch: string; msaStart?: string; msaEnd?: string; }

function getBranchMSAs(client: Client, posDevices: POSDevice[]): BranchMSA[] {
  return (client.branches || []).map(branch => {
    const bd        = posDevices.filter(p => p.branch === branch);
    const ends      = bd.map(p => p.msaEnd).filter(Boolean)   as string[];
    const starts    = bd.map(p => p.msaStart).filter(Boolean) as string[];
    const clientMsa = client.branchMsaDates?.[branch];
    return {
      branch,
      msaStart: clientMsa?.msaStart || (starts.length ? starts.sort()[0]   : undefined),
      msaEnd:   clientMsa?.msaEnd   || (ends.length   ? ends.sort().at(-1) : undefined),
    };
  });
}

/* ── styles ──────────────────────────────────────────────────── */
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1.5px solid rgba(124,58,237,0.25)', fontSize: 12, fontWeight: 600,
  color: '#18103a', background: '#fff', outline: 'none', boxSizing: 'border-box',
  fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s',
};
const dateInputStyle: React.CSSProperties = { ...inputStyle, colorScheme: 'light' as any };
const saveBtnStyle: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontSize: 11.5, fontWeight: 700, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
  color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 5,
  whiteSpace: 'nowrap' as const,
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 8, border: '1.5px solid rgba(124,58,237,0.2)',
  cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
  background: '#f5f3ff', color: '#4a3870', whiteSpace: 'nowrap' as const,
};
const editBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 10px', borderRadius: 7,
  border: '1.5px solid rgba(124,58,237,0.25)', cursor: 'pointer',
  fontSize: 10.5, fontWeight: 700, background: '#f5f3ff', color: '#7c3aed',
  whiteSpace: 'nowrap' as const, flexShrink: 0,
};
const fieldLabelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
  color: '#8e7ec0', textTransform: 'uppercase', marginBottom: 4,
};

/* ── icons ───────────────────────────────────────────────────── */
const PencilIcon   = ({ color = '#7c3aed' }: { color?: string }) => (
  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.6">
    <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/><path d="M8 4l2 2"/>
  </svg>
);
const CheckIcon    = ({ color = '#fff' }: { color?: string }) => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="2">
    <path d="M2 7l4 4 6-6"/>
  </svg>
);
const CalendarIcon = ({ color = '#8e7ec0' }: { color?: string }) => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.5">
    <rect x="1.5" y="2.5" width="11" height="10" rx="1.5"/>
    <path d="M1.5 6h11M5 1.5v2M9 1.5v2"/>
  </svg>
);
const SearchIcon   = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#8e7ec0" strokeWidth="1.5">
    <circle cx="6" cy="6" r="4"/><path d="M10 10l2.5 2.5"/>
  </svg>
);
const SpinnerIcon  = ({ color = '#8e7ec0' }: { color?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5"
    style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>
);

const ErrorBanner = ({ msg }: { msg: string }) => (
  <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#dc2626" strokeWidth="1.5">
      <circle cx="7" cy="7" r="5.5"/><path d="M7 4.5v3M7 9.5v.5"/>
    </svg>
    {msg}
  </div>
);

const SavedPill = ({ visible }: { visible: boolean }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20,
    background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
    fontSize: 10.5, fontWeight: 700,
    opacity: visible ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none', flexShrink: 0,
  }}>
    <CheckIcon color="#16a34a" /> Saved!
  </div>
);

function DateRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#18103a' }}>
        {value ? formatDate(value) : '—'}
      </div>
    </div>
  );
}

function DateField({ label, value, onChange, accent = false }: {
  label: string; value: string; onChange: (v: string) => void; accent?: boolean;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <CalendarIcon color={accent ? '#dc2626' : '#8e7ec0'} />
        <span style={{ ...fieldLabelStyle, color: accent ? '#dc2626' : '#8e7ec0', marginBottom: 0 }}>
          {label}
        </span>
      </div>
      <input
        type="date"
        style={{ ...dateInputStyle, borderColor: accent ? 'rgba(220,38,38,0.3)' : 'rgba(124,58,237,0.25)' }}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function SkeletonRow({ width }: { width: string }) {
  return (
    <div style={{
      height: 14, borderRadius: 6, width,
      background: 'linear-gradient(90deg,#ede9fe 25%,#f5f3ff 50%,#ede9fe 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
    }} />
  );
}

interface EditDraft { license: string; msaStart: string; msaEnd: string; }

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function MSAExpirationPopup({
  client, posDevices, onClose, onLicenseUpdate,
}: MSAExpirationPopupProps) {
  const isAloha = client.cat === 'F&B';
  const font    = "'DM Sans', sans-serif";

  const [searchQuery, setSearchQuery] = useState('');

  /* ══ Fetch branch rows from DB on mount ══════════════════════
     Both modes need this:
       Retail/Warehouse → resolves shared license + MSA dates
       Aloha            → gives us DB ids for the PUT calls
  ═══════════════════════════════════════════════════════════ */
  const [dbBranches, setDbBranches] = useState<DBBranch[]>([]);
  const [dbLoading,  setDbLoading]  = useState(true);

  /* Retail/Warehouse resolved display values */
  const [resolvedLicense,  setResolvedLicense]  = useState(client.licenseId || '');
  const [resolvedMsaStart, setResolvedMsaStart] = useState(client.saStart   || '');
  const [resolvedMsaEnd,   setResolvedMsaEnd]   = useState(client.saEnd     || '');

  /* Aloha: per-branch DB data keyed by branch_name */
  const [alohaBranchData, setAlohaBranchData] = useState<
    Record<string, { license: string; msaStart: string; msaEnd: string }>
  >({});

  useEffect(() => {
    if (!client.id) { setDbLoading(false); return; }

    fetch(`${API_BASE}/api/branches?company_id=${client.id}`, {
      headers: { 'Accept': 'application/json' },
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        return res.json();
      })
      .then((data: { success: boolean; branches: DBBranch[] }) => {
        if (!data.success) return;
        setDbBranches(data.branches);

        if (!isAloha) {
          /* All branches share the same values — pick first non-null */
          const lic   = data.branches.find(b => b.license_number?.trim())?.license_number  ?? '';
          const start = data.branches.find(b => b.msa_start_date?.trim())?.msa_start_date  ?? '';
          const end   = data.branches.find(b => b.msa_end_date?.trim())?.msa_end_date      ?? '';
          if (lic)   setResolvedLicense(lic.trim());
          if (start) setResolvedMsaStart(start.trim());
          if (end)   setResolvedMsaEnd(end.trim());
        } else {
          /* Aloha: build per-branch map */
          const map: Record<string, { license: string; msaStart: string; msaEnd: string }> = {};
          data.branches.forEach(b => {
            map[b.branch_name] = {
              license:  b.license_number || client.branchLicenses?.[b.branch_name] || '',
              msaStart: b.msa_start_date || '',
              msaEnd:   b.msa_end_date   || '',
            };
          });
          setAlohaBranchData(map);
        }
      })
      .catch(err => console.error('[MSAExpirationPopup] branch fetch failed:', err))
      .finally(() => setDbLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  /* ── resolve a branch DB id ─────────────────────────────────
     Prefer client.branchIds (populated by the parent on branch fetch),
     fall back to dbBranches loaded above.
  ── */
  const getBranchDbId = (branchName: string): number | null =>
    client.branchIds?.[branchName]
    ?? dbBranches.find(b => b.branch_name === branchName)?.id
    ?? null;

  /* ── shared PUT helper ──────────────────────────────────────
     Always uses API_BASE so the env variable is respected.
  ── */
  const putBranch = async (
    branchId: number,
    payload: { license_number: string; msa_start_date: string | null; msa_end_date: string | null },
  ) => {
    const res = await fetch(`${API_BASE}/api/branches/${branchId}`, {
      method:  'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message ?? `Branch ${branchId} update failed`);
    }
    return data;
  };

  /* ══════════════════════════════════════════════════════════
     RETAIL / WAREHOUSE — shared edit state
  ══════════════════════════════════════════════════════════ */
  const [editingShared, setEditingShared] = useState(false);
  const [sharedDraft,   setSharedDraft]   = useState<EditDraft>({
    license:  '',
    msaStart: '',
    msaEnd:   '',
  });
  const [sharedSaving,  setSharedSaving]  = useState(false);
  const [sharedError,   setSharedError]   = useState('');
  const [sharedSaved,   setSharedSaved]   = useState(false);

  /* Keep draft in sync once DB data resolves */
  useEffect(() => {
    if (!editingShared) {
      setSharedDraft({
        license:  resolvedLicense,
        msaStart: resolvedMsaStart,
        msaEnd:   resolvedMsaEnd,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedLicense, resolvedMsaStart, resolvedMsaEnd]);

  async function handleSaveShared() {
    const lic = sharedDraft.license.trim();
    if (!lic) { setSharedError('License number is required.'); return; }
    setSharedError('');
    setSharedSaving(true);

    try {
      /* PUT every branch row in parallel */
      await Promise.all(
        dbBranches.map(b =>
          putBranch(b.id, {
            license_number:  lic,
            msa_start_date:  sharedDraft.msaStart || null,
            msa_end_date:    sharedDraft.msaEnd   || null,
          }),
        ),
      );

      /* Update local resolved display values */
      setResolvedLicense(lic);
      if (sharedDraft.msaStart) setResolvedMsaStart(sharedDraft.msaStart);
      if (sharedDraft.msaEnd)   setResolvedMsaEnd(sharedDraft.msaEnd);

      /* Push updated POS devices to parent */
      const updatedDevices = posDevices.map(d => ({
        ...d,
        licenseNumber: lic,
        msaStart: sharedDraft.msaStart || d.msaStart,
        msaEnd:   sharedDraft.msaEnd   || d.msaEnd,
      }));
      onLicenseUpdate?.(
        {
          licenseId: lic,
          saStart:   sharedDraft.msaStart || client.saStart,
          saEnd:     sharedDraft.msaEnd   || client.saEnd,
        },
        updatedDevices,
      );

      setEditingShared(false);
      setSharedSaved(true);
      setTimeout(() => setSharedSaved(false), 2500);

    } catch (err: any) {
      setSharedError(err?.message ?? 'Network error — could not reach the server.');
    } finally {
      setSharedSaving(false);
    }
  }

  /* ══════════════════════════════════════════════════════════
     ALOHA — per-branch edit state
  ══════════════════════════════════════════════════════════ */
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [branchDraft,   setBranchDraft]   = useState<EditDraft>({
    license:  '',
    msaStart: '',
    msaEnd:   '',
  });
  const [branchSaving,  setBranchSaving]  = useState(false);
  const [branchError,   setBranchError]   = useState('');
  const [branchSaved,   setBranchSaved]   = useState<string | null>(null);

  async function handleSaveBranch(branch: string) {
    const lic = branchDraft.license.trim();
    if (!lic) { setBranchError('License number is required.'); return; }
    setBranchError('');
    setBranchSaving(true);

    try {
      const dbId = getBranchDbId(branch);
      if (dbId !== null) {
        await putBranch(dbId, {
          license_number: lic,
          msa_start_date: branchDraft.msaStart || null,
          msa_end_date:   branchDraft.msaEnd   || null,
        });
      } else {
        console.warn(`[MSAExpirationPopup] No DB id for branch "${branch}" — skipping PUT`);
      }

      /* Update local Aloha branch map so UI reflects new values immediately */
      setAlohaBranchData(prev => ({
        ...prev,
        [branch]: {
          license:  lic,
          msaStart: branchDraft.msaStart,
          msaEnd:   branchDraft.msaEnd,
        },
      }));

      /* Push updated POS devices to parent */
      const updatedDevices = posDevices.map(d =>
        d.branch === branch
          ? {
              ...d,
              licenseNumber: lic,
              msaStart: branchDraft.msaStart || d.msaStart,
              msaEnd:   branchDraft.msaEnd   || d.msaEnd,
            }
          : d,
      );
      const prevMsaDates = client.branchMsaDates || {};
      onLicenseUpdate?.(
        {
          branchLicenses: { ...client.branchLicenses, [branch]: lic },
          branchMsaDates: {
            ...prevMsaDates,
            [branch]: {
              msaStart: branchDraft.msaStart || prevMsaDates[branch]?.msaStart,
              msaEnd:   branchDraft.msaEnd   || prevMsaDates[branch]?.msaEnd,
            },
          },
        },
        updatedDevices,
      );

      setEditingBranch(null);
      setBranchSaved(branch);
      setTimeout(() => setBranchSaved(null), 2500);

    } catch (err: any) {
      setBranchError(err?.message ?? 'Network error — could not reach the server.');
    } finally {
      setBranchSaving(false);
    }
  }

  /* ── derived MSA lists for Aloha ── */
  const enrichedBranchMSAs = getBranchMSAs(client, posDevices).map(bm => ({
    ...bm,
    msaStart: alohaBranchData[bm.branch]?.msaStart || bm.msaStart,
    msaEnd:   alohaBranchData[bm.branch]?.msaEnd   || bm.msaEnd,
  }));

  const filteredBranchMSAs = enrichedBranchMSAs.filter(
    b => !searchQuery.trim() || b.branch.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const companyDays   = isAloha ? null : daysLeft(resolvedMsaEnd || undefined);
  const companyStatus = statusInfo(companyDays);

  /* ── Aloha branch card ───────────────────────────────────── */
  const renderBranchCard = ({ branch, msaStart, msaEnd }: BranchMSA) => {
    const days          = daysLeft(msaEnd);
    const status        = statusInfo(days);
    const isEditingThis = editingBranch === branch;
    const dbData        = alohaBranchData[branch];
    const currentLic    = dbData?.license || client.branchLicenses?.[branch] || '';

    return (
      <div key={branch} style={{
        background:  status.bg,
        border:      `1px solid ${status.border}`,
        borderRadius: 12, padding: '13px 14px',
        gridColumn:  isEditingThis ? '1 / -1' : undefined,
      }}>
        {/* Branch name + status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={status.color} strokeWidth="1.6">
              <path d="M7 1.5C5 1.5 3.5 3 3.5 5c0 3.5 3.5 6.5 3.5 6.5S10.5 8.5 10.5 5c0-2-1.5-3.5-3.5-3.5z"/>
              <circle cx="7" cy="5" r="1.2"/>
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#18103a' }}>{branch}</span>
          </div>
          <span style={{
            fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em',
            color: status.color, background: `${status.color}18`,
            border: `1px solid ${status.color}40`, borderRadius: 4, padding: '2px 7px',
          }}>
            {status.label}
          </span>
        </div>

        {/* MSA dates display */}
        {!isEditingThis && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
            <DateRow label="MSA End Date"   value={msaEnd} />
            <div>
              <div style={fieldLabelStyle}>Days Remaining</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: status.color }}>
                {days === null ? '—' : days <= 0 ? 'Expired' : `${days}d`}
              </div>
            </div>
          </div>
        )}

        {/* License section */}
        <div style={{ borderTop: `1px solid ${status.border}`, paddingTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={fieldLabelStyle}>Branch License</div>
            <SavedPill visible={branchSaved === branch} />
          </div>

          {!isEditingThis ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 10px', minWidth: 0,
                background: 'rgba(217,119,6,0.07)',
                border: '1px solid rgba(217,119,6,0.2)', borderRadius: 7,
              }}>
                {dbLoading
                  ? <SpinnerIcon />
                  : (
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="#92400e" strokeWidth="1.5" style={{ flexShrink: 0 }}>
                      <rect x="2" y="5" width="10" height="7" rx="1.5"/>
                      <path d="M5 5V4a2 2 0 0 1 4 0v1"/>
                    </svg>
                  )
                }
                <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {dbLoading
                    ? <span style={{ color: '#b8aed8', fontStyle: 'italic' }}>Loading…</span>
                    : currentLic || <span style={{ color: '#b8aed8', fontWeight: 500 }}>No license set</span>
                  }
                </span>
              </div>
              <button
                disabled={dbLoading}
                style={{ ...editBtnStyle, opacity: dbLoading ? 0.5 : 1, cursor: dbLoading ? 'not-allowed' : 'pointer' }}
                onClick={() => {
                  setEditingBranch(branch);
                  setBranchDraft({
                    license:  currentLic,
                    msaStart: dbData?.msaStart || msaStart || '',
                    msaEnd:   dbData?.msaEnd   || msaEnd   || '',
                  });
                  setBranchError('');
                }}
              >
                <PencilIcon /> Update
              </button>
            </div>
          ) : (
            /* Edit form */
            <div style={{ background: '#fff', border: '1.5px solid rgba(217,119,6,0.25)', borderRadius: 10, padding: '12px' }}>
              <div style={{ marginBottom: 10 }}>
                <div style={fieldLabelStyle}>License Number</div>
                <input
                  style={inputStyle}
                  value={branchDraft.license}
                  onChange={e => setBranchDraft(d => ({ ...d, license: e.target.value }))}
                  placeholder={`e.g. LIC-${branch.replace(/\s+/g,'').toUpperCase().slice(0,4)}-0001`}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Escape') setEditingBranch(null); }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <DateField label="MSA Start Date" value={branchDraft.msaStart} onChange={v => setBranchDraft(d => ({ ...d, msaStart: v }))} />
                <DateField label="MSA End Date"   value={branchDraft.msaEnd}   onChange={v => setBranchDraft(d => ({ ...d, msaEnd: v }))} accent />
              </div>
              {branchError && <ErrorBanner msg={branchError} />}
              <div style={{ fontSize: 9.5, color: '#8e7ec0', marginBottom: 10 }}>
                Saves to database and updates all POS devices in <strong>{branch}</strong>.
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button
                  style={{ ...saveBtnStyle, opacity: branchSaving ? 0.7 : 1, cursor: branchSaving ? 'not-allowed' : 'pointer' }}
                  onClick={() => handleSaveBranch(branch)}
                  disabled={branchSaving}
                >
                  {branchSaving
                    ? <><SpinnerIcon color="#fff" /> Saving…</>
                    : <><CheckIcon /> Save & Apply to POS</>
                  }
                </button>
                <button
                  style={cancelBtnStyle}
                  onClick={() => { setEditingBranch(null); setBranchError(''); }}
                  disabled={branchSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9100,
        background: 'rgba(15,10,35,0.38)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16,
          width: isAloha ? 580 : 460, maxWidth: '94vw', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(15,10,35,0.22), 0 4px 12px rgba(15,10,35,0.1)',
          fontFamily: font, overflow: 'hidden', transition: 'width 0.2s',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(124,58,237,0.1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: '0 0 auto' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#18103a', lineHeight: 1.2 }}>
                MSA Expiration Details
              </div>
              <div style={{ fontSize: 10.5, color: '#8e7ec0', marginTop: 2 }}>
                {isAloha ? 'Per Branch — Aloha Model' : `Company-wide — ${client.cat} Model`}
              </div>
            </div>
            <div style={{ flex: 1 }} />

            {/* Search (Aloha only) */}
            {isAloha && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: '#f5f3ff', border: '1.5px solid rgba(124,58,237,0.18)',
                borderRadius: 8, padding: '6px 10px', width: 160, flexShrink: 0,
              }}>
                <SearchIcon />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search branch…"
                  style={{
                    border: 'none', background: 'transparent', outline: 'none',
                    fontSize: 11.5, fontWeight: 500, color: '#18103a',
                    width: '100%', fontFamily: font,
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#8e7ec0', padding: 0, fontSize: 12 }}
                  >✕</button>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 7,
                border: '1px solid rgba(124,58,237,0.15)', cursor: 'pointer',
                background: '#f5f3ff', color: '#4a3870',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, flexShrink: 0,
              }}
            >✕</button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '14px 16px',
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(124,58,237,0.15) transparent',
        } as React.CSSProperties}>

          {/* ════ ALOHA — 2-col grid ════ */}
          {isAloha && (
            <>
              {filteredBranchMSAs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#8e7ec0', fontSize: 12 }}>
                  No branches match "<strong>{searchQuery}</strong>"
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'start' }}>
                {filteredBranchMSAs.map(bm => renderBranchCard(bm))}
              </div>
            </>
          )}

          {/* ════ RETAIL / WAREHOUSE — single card ════ */}
          {!isAloha && (
            <div style={{
              background: companyStatus.bg, border: `1px solid ${companyStatus.border}`,
              borderRadius: 12, padding: '16px 18px',
            }}>
              {/* Company header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: companyStatus.color + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke={companyStatus.color} strokeWidth="1.4">
                      <rect x="2" y="2" width="5.5" height="5.5" rx="1"/>
                      <rect x="8.5" y="2" width="5.5" height="5.5" rx="1"/>
                      <rect x="2" y="8.5" width="5.5" height="5.5" rx="1"/>
                      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#18103a' }}>{client.name}</div>
                    <div style={{ fontSize: 10, color: '#8e7ec0', marginTop: 1 }}>All Locations</div>
                  </div>
                </div>
                <span style={{
                  fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em',
                  color: companyStatus.color, background: `${companyStatus.color}18`,
                  border: `1px solid ${companyStatus.color}40`, borderRadius: 5, padding: '3px 9px',
                }}>
                  {companyStatus.label}
                </span>
              </div>

              {/* Stats + covered locations (hidden while editing to save space) */}
              {!editingShared && (
                <>
                  {dbLoading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                      {(['MSA START DATE','MSA END DATE','DAYS REMAINING','TOTAL SITES'] as const).map((lbl, i) => (
                        <div key={lbl}>
                          <div style={{ ...fieldLabelStyle, marginBottom: 6 }}>{lbl}</div>
                          <SkeletonRow width={i === 3 ? '40%' : '75%'} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <DateRow label="MSA Start Date" value={resolvedMsaStart || undefined} />
                      <DateRow label="MSA End Date"   value={resolvedMsaEnd   || undefined} />
                      <div>
                        <div style={fieldLabelStyle}>Days Remaining</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: companyStatus.color }}>
                          {companyDays === null ? '—' : companyDays <= 0 ? 'Expired' : `${companyDays} days`}
                        </div>
                      </div>
                      <div>
                        <div style={fieldLabelStyle}>Total Sites</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#18103a' }}>
                          {(client.branches || []).length}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Covered locations */}
                  <div style={{ borderTop: `1px solid ${companyStatus.border}`, paddingTop: 12, marginBottom: 14 }}>
                    <div style={fieldLabelStyle}>Covered Locations</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {(client.branches || []).map(b => (
                        <div key={b} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                          background: '#e0f2fe', color: '#0c4a6e', fontSize: 11, fontWeight: 600,
                          borderRadius: 7, border: '1px solid rgba(2,132,199,0.2)',
                        }}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4">
                            <path d="M6 1.5C4 1.5 2.5 3 2.5 5c0 3 3.5 5.5 3.5 5.5S9.5 8 9.5 5c0-2-1.5-3.5-3.5-3.5z"/>
                            <circle cx="6" cy="5" r="1.2"/>
                          </svg>
                          {b}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Shared license + MSA edit section */}
              <div style={{ borderTop: `1px solid ${companyStatus.border}`, paddingTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={fieldLabelStyle}>Shared License Key & MSA Dates</div>
                    <div style={{ fontSize: 9, color: '#b8aed8', marginTop: 1 }}>
                      Applied to all branches & POS devices
                    </div>
                  </div>
                  <SavedPill visible={sharedSaved} />
                </div>

                {!editingShared ? (
                  /* License chip + Update button */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '9px 14px', minWidth: 0,
                      background: 'rgba(124,58,237,0.06)',
                      border: '1.5px solid rgba(124,58,237,0.18)', borderRadius: 10,
                    }}>
                      {dbLoading
                        ? <SpinnerIcon />
                        : (
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#7c3aed" strokeWidth="1.5" style={{ flexShrink: 0 }}>
                            <rect x="2" y="5" width="10" height="7" rx="1.5"/>
                            <path d="M5 5V4a2 2 0 0 1 4 0v1"/>
                          </svg>
                        )
                      }
                      <span style={{
                        fontSize: 12, fontWeight: 700, color: '#7c3aed',
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {dbLoading
                          ? <span style={{ color: '#b8aed8', fontStyle: 'italic' }}>Fetching license…</span>
                          : resolvedLicense || <span style={{ color: '#b8aed8', fontWeight: 500 }}>No license set</span>
                        }
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, color: '#7c3aed',
                        background: 'rgba(124,58,237,0.08)', padding: '2px 7px',
                        borderRadius: 5, border: '1px solid rgba(124,58,237,0.2)', flexShrink: 0,
                      }}>
                        {posDevices.length} POS
                      </span>
                    </div>
                    <button
                      disabled={dbLoading}
                      style={{ ...editBtnStyle, opacity: dbLoading ? 0.5 : 1, cursor: dbLoading ? 'not-allowed' : 'pointer' }}
                      onClick={() => {
                        setSharedDraft({ license: resolvedLicense, msaStart: resolvedMsaStart, msaEnd: resolvedMsaEnd });
                        setSharedError('');
                        setEditingShared(true);
                      }}
                    >
                      <PencilIcon /> Update
                    </button>
                  </div>
                ) : (
                  /* Edit form */
                  <div style={{ background: '#fff', border: '1.5px solid rgba(124,58,237,0.25)', borderRadius: 10, padding: '14px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={fieldLabelStyle}>License Number</div>
                      <input
                        style={inputStyle}
                        value={sharedDraft.license}
                        onChange={e => setSharedDraft(d => ({ ...d, license: e.target.value }))}
                        placeholder="e.g. LIC-ACE-2025-0099"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Escape') setEditingShared(false); }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      <DateField
                        label="MSA Start Date"
                        value={sharedDraft.msaStart}
                        onChange={v => setSharedDraft(d => ({ ...d, msaStart: v }))}
                      />
                      <DateField
                        label="MSA End Date"
                        value={sharedDraft.msaEnd}
                        onChange={v => setSharedDraft(d => ({ ...d, msaEnd: v }))}
                        accent
                      />
                    </div>
                    {sharedError && <ErrorBanner msg={sharedError} />}
                    <div style={{ fontSize: 9.5, color: '#8e7ec0', marginBottom: 10 }}>
                      Saves to database and updates <strong>all {posDevices.length} POS devices</strong> across every branch.
                    </div>
                    <div style={{ display: 'flex', gap: 7 }}>
                      <button
                        style={{ ...saveBtnStyle, opacity: sharedSaving ? 0.7 : 1, cursor: sharedSaving ? 'not-allowed' : 'pointer' }}
                        onClick={handleSaveShared}
                        disabled={sharedSaving}
                      >
                        {sharedSaving
                          ? <><SpinnerIcon color="#fff" /> Saving…</>
                          : <><CheckIcon /> Save & Apply to All POS</>
                        }
                      </button>
                      <button
                        style={cancelBtnStyle}
                        onClick={() => { setEditingShared(false); setSharedError(''); }}
                        disabled={sharedSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '10px 18px 14px', borderTop: '1px solid rgba(124,58,237,0.08)', background: '#faf9ff', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#8e7ec0" strokeWidth="1.5" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="7" cy="7" r="5.5"/><path d="M7 6v4M7 4.5v.5"/>
            </svg>
            <span style={{ fontSize: 10, color: '#4a3870', lineHeight: 1.5 }}>
              {isAloha
                ? <><strong>Note:</strong> Each branch has its own license and MSA dates. Changes are saved to the database and applied to that branch's POS devices.</>
                : <><strong>Note:</strong> A single shared license and MSA period covers all branches. Updates are saved to all {dbBranches.length} branch records and {posDevices.length} POS devices.</>
              }
            </span>
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