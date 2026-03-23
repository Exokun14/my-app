'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  InfoData, COUNTRY_CODES, DEFAULT_INFO,
  useClickOutside,
} from './overview_func';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

// ─── Embedded session store ───────────────────────────────────────────────────
let _storedInfo: InfoData = { ...DEFAULT_INFO };
export function getStoredInfo(): InfoData { return { ..._storedInfo }; }
export function saveStoredInfo(d: InfoData): void { _storedInfo = { ...d }; }
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  data?: InfoData;
  companyId?: number | null;    // ← needed to call PUT /api/companies/{id}
  onSave: (data: InfoData) => void;
  onClose: () => void;
}

interface AltContactEntry { name: string; email: string; phoneCode: string; phoneDigits: string; }

type SaveState = 'idle' | 'saving' | 'success' | 'error';

// ─── Country Code Picker ──────────────────────────────────────────────────────
function CountryCodePicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = COUNTRY_CODES.find(c => c.code === value) ?? COUNTRY_CODES[0];
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ede9fe', border: 'none', borderRight: '1px solid rgba(124,58,237,0.18)', borderRadius: '7px 0 0 7px', padding: '0 10px', fontSize: 12, fontWeight: 700, color: '#4a3870', fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' as const, height: '100%', minWidth: 88 }}>
        <span style={{ fontSize: 14 }}>{selected.flag}</span>
        <span>{selected.code}</span>
        <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 8, height: 8, marginLeft: 2, opacity: 0.6 }}><path d="M1 1l4 4 4-4" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 10001, background: '#fff', borderRadius: 10, border: '1px solid rgba(124,58,237,0.18)', boxShadow: '0 8px 28px rgba(20,10,40,0.14)', maxHeight: 210, overflowY: 'auto', minWidth: 130 }}>
          {COUNTRY_CODES.map(c => (
            <button key={c.code} type="button" onClick={() => { onChange(c.code); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', background: c.code === value ? '#ede9fe' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: c.code === value ? 700 : 500, color: c.code === value ? '#5b21b6' : '#18103a', fontFamily: 'inherit', textAlign: 'left' as const }}
              onMouseEnter={e => { if (c.code !== value) (e.currentTarget as HTMLButtonElement).style.background = '#f5f3ff'; }}
              onMouseLeave={e => { if (c.code !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
              <span style={{ fontSize: 15 }}>{c.flag}</span>
              <span>{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function parsePhone(phone: string): [string, string] {
  const match = phone.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    const code   = COUNTRY_CODES.find(c => c.code === match[1]) ? match[1] : '+63';
    const digits = match[2].replace(/\D/g, '').slice(0, 11);
    return [code, digits];
  }
  return ['+63', phone.replace(/\D/g, '').slice(0, 11)];
}

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch {
    const snippet = text.slice(0, 200).replace(/<[^>]+>/g, '').trim().slice(0, 120);
    throw new Error(`Server error (HTTP ${res.status})${snippet ? `: ${snippet}` : '.'}`);
  }
}

// ─── Section wrapper (must be top-level — not inside the component — to avoid
//     remounting on every keystroke and losing input focus) ──────────────────
function Section({ icon, label, badge, action, children }: {
  icon: string; label: string; badge?: string;
  action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(124,58,237,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{icon}</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#18103a' }}>{label}</span>
        {badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', color: '#8e7ec0' }}>{badge}</span>}
        {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function EditInfoModal({ data, companyId, onSave, onClose }: Props) {
  const seed = data ?? getStoredInfo();
  const [form, setForm]           = useState<InfoData>(seed);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const ref = useClickOutside<HTMLDivElement>(onClose);

  const [phoneCode,   setPhoneCode]   = useState('+63');
  const [phoneDigits, setPhoneDigits] = useState('');
  const fullPhone = phoneDigits ? `${phoneCode} ${phoneDigits}` : '';

  useEffect(() => {
    const [code, digits] = parsePhone(form.phone ?? '');
    setPhoneCode(code); setPhoneDigits(digits);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const MAX_ALT = 2;
  const [alts, setAlts] = useState<AltContactEntry[]>(() => {
    const arr: AltContactEntry[] = [];
    if (form.altContactPerson) {
      const [c, d] = parsePhone(form.altPhone ?? '');
      arr.push({ name: form.altContactPerson, email: form.altEmail, phoneCode: c, phoneDigits: d });
    }
    if (form.altContactPerson2) {
      const [c, d] = parsePhone(form.altPhone2 ?? '');
      arr.push({ name: form.altContactPerson2, email: form.altEmail2, phoneCode: c, phoneDigits: d });
    }
    return arr;
  });

  // ── Shared styles ──────────────────────────────────────────────────────────
  const FIn: React.CSSProperties     = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.18)', background: '#f2f0fb', color: '#18103a', fontSize: 12.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.14s' };
  const FInHint: React.CSSProperties  = { ...FIn, paddingRight: 36 };
  const FLbl: React.CSSProperties    = { fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.4)', marginBottom: 5, display: 'block' };
  const MBtnXS: React.CSSProperties  = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(124,58,237,0.18)', background: '#f2f0fb', color: '#4a3870', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
  const MBtnS: React.CSSProperties   = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.18)', background: '#fff', color: '#4a3870', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
  const MBtnP: React.CSSProperties   = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 10px rgba(124,58,237,0.3)' };

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.storeName.trim())     { setSaveError('Company name is required.');   setSaveState('error'); return; }
    if (!form.contactPerson.trim()) { setSaveError('Contact person is required.'); setSaveState('error'); return; }
    if (!form.email.trim())         { setSaveError('Email is required.');          setSaveState('error'); return; }
    if (!phoneDigits.trim())        { setSaveError('Phone is required.');          setSaveState('error'); return; }

    const saved: InfoData = {
      ...form,
      phone:             fullPhone || form.phone,
      altContactPerson:  alts[0]?.name  || '',
      altEmail:          alts[0]?.email || '',
      altPhone:          alts[0] ? (alts[0].phoneDigits ? `${alts[0].phoneCode} ${alts[0].phoneDigits}` : '') : '',
      altContactPerson2: alts[1]?.name  || '',
      altEmail2:         alts[1]?.email || '',
      altPhone2:         alts[1] ? (alts[1].phoneDigits ? `${alts[1].phoneCode} ${alts[1].phoneDigits}` : '') : '',
    };

    // No companyId — local-only update (fallback)
    if (!companyId) {
      saveStoredInfo(saved);
      onSave(saved);
      onClose();
      return;
    }

    setSaveState('saving');
    setSaveError('');

    try {
      const fd = new FormData();
      fd.append('company_name',   saved.storeName.trim());
      fd.append('contact_person', saved.contactPerson.trim());
      fd.append('email',          saved.email.trim());
      fd.append('phone',          saved.phone);
      fd.append('krunch_id',       saved.krunchNum?.trim()      ?? '');
      fd.append('activation_code', saved.activationCode?.trim() ?? '');
      if (saved.accountManager?.trim()) fd.append('account_manager', saved.accountManager.trim());
      fd.append('alt_contacts', JSON.stringify(
        alts.filter(a => a.name.trim()).map(a => ({
          name:  a.name,
          email: a.email,
          phone: a.phoneDigits ? `${a.phoneCode} ${a.phoneDigits}` : '',
        }))
      ));
      fd.append('_method', 'PUT');

      const res  = await fetch(`${API_BASE}/api/companies/${companyId}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
      const json = await safeJson(res);
      if (!res.ok || !json.success) throw new Error((json.message as string) ?? `Server error ${res.status}`);

      setSaveState('success');
      saveStoredInfo(saved);
      onSave(saved);
      setTimeout(() => { setSaveState('idle'); onClose(); }, 850);

    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Unexpected error. Please try again.');
      setSaveState('error');
    }
  };

  const saveBtnContent = () => {
    if (saveState === 'saving') return (
      <>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        Saving…
      </>
    );
    if (saveState === 'success') return (
      <><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>Saved!</>
    );
    return (
      <><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12"><path d="M2 7.5l3.5 3.5 6.5-7"/></svg>Save Changes</>
    );
  };

  const saveBtnStyle: React.CSSProperties = {
    ...MBtnP,
    opacity: saveState === 'saving' ? 0.75 : 1,
    background: saveState === 'success'
      ? 'linear-gradient(135deg,#16a34a,#15803d)'
      : (MBtnP as React.CSSProperties).background as string,
    transition: 'background 0.25s, opacity 0.2s',
    pointerEvents: saveState === 'saving' ? 'none' : 'auto',
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,7,36,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
      <div ref={ref} style={{ width: 660, maxWidth: '96vw', maxHeight: '92vh', background: '#fff', borderRadius: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.22)', overflow: 'visible', fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', flexShrink: 0, borderRadius: '18px 18px 0 0' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6"><path d="M12.5 2.5l3 3L5 16H2v-3L12.5 2.5z"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Edit General Information</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {form.storeName || 'Your Company'} — update contact &amp; account details
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ══ PRIMARY CONTACT ══ */}
          <Section icon="👤" label="Primary Contact">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={FLbl}>Store / Company Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input style={FIn} type="text" value={form.storeName}
                  onChange={e => setForm({ ...form, storeName: e.target.value })}
                  onFocus={e => (e.target.style.borderColor = 'rgba(124,58,237,0.5)')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(124,58,237,0.18)')} />
              </div>
              <div>
                <label style={FLbl}>Contact Person <span style={{ color: '#dc2626' }}>*</span></label>
                <input style={FIn} type="text" value={form.contactPerson}
                  onChange={e => setForm({ ...form, contactPerson: e.target.value })}
                  onFocus={e => (e.target.style.borderColor = 'rgba(124,58,237,0.5)')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(124,58,237,0.18)')} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={FLbl}>Email <span style={{ color: '#dc2626' }}>*</span></label>
                <input style={FIn} type="email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  onFocus={e => (e.target.style.borderColor = 'rgba(124,58,237,0.5)')}
                  onBlur={e  => (e.target.style.borderColor = 'rgba(124,58,237,0.18)')} />
              </div>
              <div>
                <label style={FLbl}>Phone <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ display: 'flex', height: 36, borderRadius: 8, border: '1px solid rgba(124,58,237,0.18)', background: '#f2f0fb', overflow: 'visible' }}>
                  <CountryCodePicker value={phoneCode} onChange={setPhoneCode} />
                  <input type="tel" inputMode="numeric" placeholder="9171234567" value={phoneDigits}
                    onChange={e => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 11))} maxLength={11}
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: '0 10px', fontFamily: 'inherit', fontSize: 12.5, color: '#18103a', outline: 'none', width: 0 }} />
                </div>
                {phoneDigits && <div style={{ fontSize: 10, color: '#0d9488', fontWeight: 500, marginTop: 3 }}>Stored as: <strong>{fullPhone}</strong></div>}
              </div>
            </div>
          </Section>

          {/* ══ LICENSE & ACTIVATION ══ */}
          <Section icon="🔑" label="License &amp; Activation">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={FLbl}>Krunch Number</label>
                <div style={{ position: 'relative' }}>
                  <input style={FInHint} type="text" placeholder="e.g. KRN-00123" value={form.krunchNum}
                    onChange={e => setForm({ ...form, krunchNum: e.target.value })}
                    onFocus={e => (e.target.style.borderColor = 'rgba(124,58,237,0.5)')}
                    onBlur={e  => (e.target.style.borderColor = 'rgba(124,58,237,0.18)')} />
                  <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#c4b5fd" strokeWidth="1.4"><circle cx="5.5" cy="8" r="3.5"/><path d="M8.5 8h6M12 6.5V8"/></svg>
                  </div>
                </div>
              </div>
              <div>
                <label style={FLbl}>Activation Code</label>
                <div style={{ position: 'relative' }}>
                  <input style={FInHint} type="text" placeholder="e.g. ACT-2024-XXXX" value={form.activationCode}
                    onChange={e => setForm({ ...form, activationCode: e.target.value })}
                    onFocus={e => (e.target.style.borderColor = 'rgba(124,58,237,0.5)')}
                    onBlur={e  => (e.target.style.borderColor = 'rgba(124,58,237,0.18)')} />
                  <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#c4b5fd" strokeWidth="1.4"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ══ ALTERNATE CONTACTS ══ */}
          <Section icon="📋" label="Alternate Contact" badge={`${alts.length} / ${MAX_ALT}`}
            action={alts.length < MAX_ALT
              ? <button style={MBtnXS} onClick={() => setAlts(prev => [...prev, { name: '', email: '', phoneCode: '+63', phoneDigits: '' }])}>
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" width="10" height="10"><path d="M6 1v10M1 6h10"/></svg>
                  Add Contact
                </button>
              : <span style={{ fontSize: 10, color: '#b8aed8', fontStyle: 'italic' }}>Max {MAX_ALT} reached</span>
            }
          >
            {alts.length === 0 && (
              <div style={{ textAlign: 'center' as const, padding: '16px 0', color: '#8e7ec0', fontSize: 12, background: '#f2f0fb', borderRadius: 10, border: '1.5px dashed rgba(124,58,237,0.22)' }}>
                No alternate contacts.{' '}
                <span onClick={() => setAlts([{ name: '', email: '', phoneCode: '+63', phoneDigits: '' }])} style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>Add one</span>
              </div>
            )}
            {alts.map((alt, idx) => {
              const altFullPhone = alt.phoneDigits ? `${alt.phoneCode} ${alt.phoneDigits}` : '';
              return (
                <div key={idx} style={{ background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Alternate Contact {idx + 1}</span>
                    <button style={{ ...MBtnXS, background: '#fee2e2', color: '#dc2626', border: 'none' }}
                      onClick={() => setAlts(prev => prev.filter((_, i) => i !== idx))}>Remove</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={FLbl}>Full Name</label>
                      <input style={FIn} type="text" placeholder="Contact person" value={alt.name}
                        onChange={e => setAlts(prev => prev.map((a, i) => i === idx ? { ...a, name: e.target.value } : a))}
                        onFocus={ev => (ev.target.style.borderColor = 'rgba(124,58,237,0.5)')}
                        onBlur={ev  => (ev.target.style.borderColor = 'rgba(124,58,237,0.18)')} />
                    </div>
                    <div>
                      <label style={FLbl}>Email</label>
                      <input style={FIn} type="email" placeholder="email@company.com" value={alt.email}
                        onChange={e => setAlts(prev => prev.map((a, i) => i === idx ? { ...a, email: e.target.value } : a))}
                        onFocus={ev => (ev.target.style.borderColor = 'rgba(124,58,237,0.5)')}
                        onBlur={ev  => (ev.target.style.borderColor = 'rgba(124,58,237,0.18)')} />
                    </div>
                    <div style={{ gridColumn: '1' }}>
                      <label style={FLbl}>Phone</label>
                      <div style={{ display: 'flex', height: 36, borderRadius: 8, border: '1px solid rgba(124,58,237,0.18)', background: '#f2f0fb', overflow: 'visible' }}>
                        <CountryCodePicker
                          value={alt.phoneCode}
                          onChange={code => setAlts(prev => prev.map((a, i) => i === idx ? { ...a, phoneCode: code } : a))}
                        />
                        <input
                          type="tel" inputMode="numeric" placeholder="9171234567"
                          value={alt.phoneDigits}
                          onChange={e => setAlts(prev => prev.map((a, i) => i === idx ? { ...a, phoneDigits: e.target.value.replace(/\D/g, '').slice(0, 11) } : a))}
                          maxLength={11}
                          style={{ flex: 1, background: 'transparent', border: 'none', padding: '0 10px', fontFamily: 'inherit', fontSize: 12.5, color: '#18103a', outline: 'none', width: 0 }}
                        />
                      </div>
                      {alt.phoneDigits && (
                        <div style={{ fontSize: 10, color: '#0d9488', fontWeight: 500, marginTop: 3 }}>
                          Stored as: <strong>{altFullPhone}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </Section>
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 20px', borderTop: '1px solid rgba(124,58,237,0.1)', background: '#f8f7ff', flexShrink: 0, borderRadius: '0 0 18px 18px' }}>
          {saveState === 'error' && saveError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: 11.5, fontWeight: 500 }}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" width="13" height="13"><circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7M7 9.5h.01"/></svg>
              {saveError}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button style={MBtnS} onClick={onClose} disabled={saveState === 'saving'}>Cancel</button>
            <button style={saveBtnStyle} onClick={handleSave}>{saveBtnContent()}</button>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}