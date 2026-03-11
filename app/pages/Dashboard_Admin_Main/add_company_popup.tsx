'use client';

import React, { useState } from 'react';
import { Client, ACCOUNT_MANAGERS, buildNewClient } from './DshAdmFunc';

/* ─── Local types ───────────────────────────────────────────────────────────── */
interface AltContact { name: string; email: string; phone: string; }
interface SiteSeat   { name: string; seats: string; }
interface FnbBranch  { name: string; keysPerStore: string; }
interface AddClientFormState {
  logoUrl: string; logoPreview: string; name: string; cat: string;
  contact: string; email: string; phone: string; accountManager: string;
  altContacts: AltContact[]; siteSeats: SiteSeat[]; fnbBranches: FnbBranch[];
}

const BLANK: AddClientFormState = {
  logoUrl: '', logoPreview: '', name: '', cat: '', contact: '',
  email: '', phone: '', accountManager: '', altContacts: [], siteSeats: [], fnbBranches: [],
};

/** Custom select arrow — SVG data-URI */
const SELECT_STYLE: React.CSSProperties = {
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a76bc' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 11px center',
  paddingRight: 26,
  cursor: 'pointer',
};

/* ─── Props ─────────────────────────────────────────────────────────────────── */
interface AddCompanyPopupProps {
  onAdd: (client: Client) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   AddCompanyPopup
   Self-contained — manages its own form state, builds the client, then calls
   onAdd(newClient) so the parent can prepend it to the list.
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function AddCompanyPopup({ onAdd, onClose, showToast }: AddCompanyPopupProps) {
  const [form, setForm] = useState<AddClientFormState>(BLANK);

  const MAX_ALT = 2;
  const isFnB = form.cat === 'F&B';
  const isRW  = form.cat === 'Retail' || form.cat === 'Warehouse';

  const upd    = (f: AddClientFormState) => setForm(f);
  const set    = (k: keyof AddClientFormState, v: string) => upd({ ...form, [k]: v });
  const setAlt = (i: number, f: keyof AltContact, v: string) =>
    upd({ ...form, altContacts: form.altContacts.map((a, j) => j === i ? { ...a, [f]: v } : a) });
  const addAlt = () => form.altContacts.length < MAX_ALT &&
    upd({ ...form, altContacts: [...form.altContacts, { name: '', email: '', phone: '' }] });
  const rmAlt  = (i: number) => upd({ ...form, altContacts: form.altContacts.filter((_, j) => j !== i) });

  const setSS  = (i: number, f: keyof SiteSeat, v: string) =>
    upd({ ...form, siteSeats: form.siteSeats.map((s, j) => j === i ? { ...s, [f]: v } : s) });
  const addSS  = () => upd({ ...form, siteSeats: [...form.siteSeats, { name: '', seats: '' }] });
  const rmSS   = (i: number) => upd({ ...form, siteSeats: form.siteSeats.filter((_, j) => j !== i) });

  const setFB  = (i: number, f: keyof FnbBranch, v: string) =>
    upd({ ...form, fnbBranches: form.fnbBranches.map((b, j) => j === i ? { ...b, [f]: v } : b) });
  const addFB  = () => upd({ ...form, fnbBranches: [...form.fnbBranches, { name: '', keysPerStore: '' }] });
  const rmFB   = (i: number) => upd({ ...form, fnbBranches: form.fnbBranches.filter((_, j) => j !== i) });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const r = new FileReader();
    r.onload = ev => upd({ ...form, logoPreview: ev.target?.result as string, logoUrl: '' });
    r.readAsDataURL(file);
  };

  const handleSave = () => {
    const f = form, fnb = f.cat === 'F&B';
    const seats    = fnb ? 0 : f.siteSeats.reduce((s, x) => s + (parseInt(x.seats) || 0), 0);
    const keys     = fnb && f.fnbBranches.length > 0 ? parseInt(f.fnbBranches[0].keysPerStore) || 0 : undefined;
    const site     = fnb ? (f.fnbBranches[0]?.name || '') : (f.siteSeats[0]?.name || '');
    const branches = fnb
      ? f.fnbBranches.map(b => b.name.trim()).filter(Boolean)
      : f.siteSeats.map(s => s.name.trim()).filter(Boolean);

    const newClient = buildNewClient(
      f.name, f.contact, f.email, f.phone, f.cat, site, seats,
      f.accountManager, f.logoUrl, f.altContacts.filter(a => a.name.trim()),
      fnb ? keys : undefined,
    );
    if (!newClient) { showToast('Please fill in all required fields.'); return; }
    if (branches.length > 0) (newClient as any).branches = branches;

    onAdd(newClient);
    showToast(`Company "${newClient.name}" added successfully!`);
    onClose();
  };

  const logoSrc = form.logoPreview || form.logoUrl;
  const canSave = !!(form.name.trim() && form.cat && form.contact.trim() && form.email.trim());

  /* ── shared style helpers ── */
  const inp: React.CSSProperties = {
    background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 8,
    padding: '8px 11px', fontFamily: 'DM Sans,sans-serif', fontSize: 12.5,
    color: '#18103a', outline: 'none', transition: 'all 0.16s', width: '100%', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 600, color: '#4a3870',
    letterSpacing: '0.04em', display: 'block', marginBottom: 4,
  };
  const miniBtn = (onClick: () => void, txt: string) => (
    <button
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 10.5, fontWeight: 600, borderRadius: 8, background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', color: '#4a3870', cursor: 'pointer', transition: 'all 0.16s', whiteSpace: 'nowrap' as const }}
    >
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 10, height: 10 }}><path d="M6 1v10M1 6h10"/></svg>
      {txt}
    </button>
  );
  const rmBtn = (onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 5, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
      Remove
    </button>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,10,40,0.4)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="_mIn"
        style={{ background: '#fff', borderRadius: 16, width: 660, maxWidth: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 70px rgba(20,10,40,0.2),0 0 0 1px rgba(124,58,237,0.1)' }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '16px 18px 14px', background: 'linear-gradient(135deg,#5b21b6,#0d9488)', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="1.6"><rect x="2" y="2" width="14" height="14" rx="2"/><path d="M9 6v6M6 9h6"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Add New Company</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 1 }}>Register a new client account with contact &amp; billing info</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.14)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, transition: 'all 0.14s' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* Logo */}
          <Sec icon="🖼️" label="Company Logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 96, height: 96, borderRadius: 18, flexShrink: 0, background: '#f2f0fb', border: '2px dashed rgba(124,58,237,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {logoSrc
                  ? <img src={logoSrc} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} onError={() => upd({ ...form, logoPreview: '', logoUrl: '' })} />
                  : <div style={{ textAlign: 'center', color: '#b8aed8', fontSize: 10, lineHeight: 1.4 }}><div style={{ fontSize: 24, marginBottom: 4 }}>🏢</div>No logo</div>
                }
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div>
                  <label style={lbl}>Upload from device</label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 9, cursor: 'pointer', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', fontSize: 11.5, fontWeight: 600, color: '#4a3870' }}>
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 12, height: 12 }}><path d="M7 1v8M4 4l3-3 3 3M2 11h10"/></svg>
                    Choose File
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
                  </label>
                </div>
                <div>
                  <label style={lbl}>Or paste image URL</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input style={{ ...inp, flex: 1, fontSize: 11.5 }} type="url" placeholder="https://example.com/logo.png" value={form.logoUrl} onChange={e => upd({ ...form, logoUrl: e.target.value, logoPreview: '' })} />
                    {logoSrc && (
                      <button style={{ padding: '3px 8px', fontSize: 10, fontWeight: 600, borderRadius: 5, background: '#fee2e2', color: '#dc2626', border: 'none', cursor: 'pointer', flexShrink: 0 }} onClick={() => upd({ ...form, logoUrl: '', logoPreview: '' })}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Sec>

          {/* Company Info */}
          <Sec icon="🏢" label="Company Information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              <div><label style={lbl}>Company Name <span style={{ color: '#dc2626' }}>*</span></label><input style={inp} type="text" placeholder="e.g. Starbucks PH" value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div>
                <label style={lbl}>Type of Industry <span style={{ color: '#dc2626' }}>*</span></label>
                <select style={{ ...inp, ...SELECT_STYLE }} value={form.cat} onChange={e => set('cat', e.target.value)}>
                  <option value="">Select industry…</option>
                  <option value="F&B">Aloha (Food &amp; Beverage)</option>
                  <option value="Retail">Retail</option>
                  <option value="Warehouse">Warehouse</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              <div><label style={lbl}>Contact Person <span style={{ color: '#dc2626' }}>*</span></label><input style={inp} type="text" placeholder="Full name" value={form.contact} onChange={e => set('contact', e.target.value)} /></div>
              <div><label style={lbl}>Email <span style={{ color: '#dc2626' }}>*</span></label><input style={inp} type="email" placeholder="contact@company.com" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
              <div><label style={lbl}>Phone</label><input style={inp} type="tel" placeholder="+63 2 XXXX XXXX" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div>
                <label style={lbl}>Account Manager</label>
                <select style={{ ...inp, ...SELECT_STYLE }} value={form.accountManager} onChange={e => set('accountManager', e.target.value)}>
                  <option value="">Select…</option>
                  {ACCOUNT_MANAGERS.map(am => <option key={am}>{am}</option>)}
                </select>
              </div>
            </div>
          </Sec>

          {/* Alternate Contacts */}
          <Sec
            icon="📋" label="Alternate Contacts"
            badge={`${form.altContacts.length} / ${MAX_ALT}`}
            action={form.altContacts.length < MAX_ALT ? miniBtn(addAlt, 'Add Contact') : <span style={{ fontSize: 10, color: '#b8aed8', fontStyle: 'italic' }}>Max {MAX_ALT} reached</span>}
          >
            {form.altContacts.length === 0 && (
              <div style={{ textAlign: 'center', padding: 14, color: '#8e7ec0', fontSize: 12, background: '#f2f0fb', borderRadius: 10, border: '1.5px dashed rgba(124,58,237,0.22)' }}>
                No alternate contacts. <span onClick={addAlt} style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>Add one</span>
              </div>
            )}
            {form.altContacts.map((alt, i) => (
              <div key={i} style={{ background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Alternate Contact {i + 1}</span>
                  {rmBtn(() => rmAlt(i))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                  <div><label style={lbl}>Contact Person</label><input style={inp} type="text" placeholder="Full name" value={alt.name} onChange={e => setAlt(i, 'name', e.target.value)} /></div>
                  <div><label style={lbl}>Email</label><input style={inp} type="email" placeholder="email@company.com" value={alt.email} onChange={e => setAlt(i, 'email', e.target.value)} /></div>
                </div>
                <div style={{ maxWidth: '50%' }}><label style={lbl}>Phone</label><input style={inp} type="tel" placeholder="+63 9XX XXX XXXX" value={alt.phone} onChange={e => setAlt(i, 'phone', e.target.value)} /></div>
              </div>
            ))}
          </Sec>

          {/* Sites & Seats — Retail / Warehouse only */}
          {isRW && (
            <Sec icon="🏬" label="Sites & Seats" badge={`${form.siteSeats.length} site${form.siteSeats.length !== 1 ? 's' : ''}`} action={miniBtn(addSS, 'Add Site')} last={!isFnB}>
              <div style={{ background: 'linear-gradient(135deg,rgba(2,132,199,0.06),rgba(13,148,136,0.06))', border: '1px solid rgba(2,132,199,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#0284c7" strokeWidth="1.5"><circle cx="7" cy="7" r="5.5"/><path d="M7 5v2.5l1.5 1"/></svg>
                <span style={{ fontSize: 11, color: '#075985' }}>Add each site location and its seat count. Applies to <strong>Retail</strong> and <strong>Warehouse</strong> companies.</span>
              </div>
              {form.siteSeats.length === 0 && (
                <div style={{ textAlign: 'center', padding: 14, color: '#8e7ec0', fontSize: 12, background: '#f2f0fb', borderRadius: 10, border: '1.5px dashed rgba(124,58,237,0.22)' }}>
                  No sites added yet. <span onClick={addSS} style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>Add one</span>
                </div>
              )}
              {form.siteSeats.map((s, i) => (
                <div key={i} style={{ background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Site {i + 1}</span>
                    {rmBtn(() => rmSS(i))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                    <div><label style={lbl}>Site / Location Name</label><input style={inp} type="text" placeholder="e.g. Makati CBD" value={s.name} onChange={e => setSS(i, 'name', e.target.value)} /></div>
                    <div><label style={lbl}>Seats</label><input style={inp} type="number" min="0" placeholder="0" value={s.seats} onChange={e => setSS(i, 'seats', e.target.value)} /></div>
                  </div>
                </div>
              ))}
              {form.siteSeats.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 2 }}>
                  <span style={{ fontSize: 10.5, color: '#8e7ec0', fontWeight: 500 }}>Total seats: <strong style={{ color: '#18103a' }}>{form.siteSeats.reduce((s, x) => s + (parseInt(x.seats) || 0), 0)}</strong></span>
                </div>
              )}
            </Sec>
          )}

          {/* Branches & Keys — F&B only */}
          {isFnB && (
            <Sec icon="🔑" label="Branches & Keys" badge={`${form.fnbBranches.length} branch${form.fnbBranches.length !== 1 ? 'es' : ''}`} action={miniBtn(addFB, 'Add Branch')} last>
              <div style={{ background: 'linear-gradient(135deg,rgba(217,119,6,0.07),rgba(234,179,8,0.05))', border: '1px solid rgba(217,119,6,0.18)', borderRadius: 10, padding: '10px 14px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#d97706" strokeWidth="1.5"><circle cx="5.5" cy="7" r="3.5"/><path d="M8.5 7h4M11 5.5V7"/></svg>
                <span style={{ fontSize: 11, color: '#92400e' }}>Add each branch with its name and number of keys per store. Applies to <strong>Aloha</strong> companies.</span>
              </div>
              {form.fnbBranches.length === 0 && (
                <div style={{ textAlign: 'center', padding: 14, color: '#8e7ec0', fontSize: 12, background: '#f2f0fb', borderRadius: 10, border: '1.5px dashed rgba(124,58,237,0.22)' }}>
                  No branches added yet. <span onClick={addFB} style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>Add one</span>
                </div>
              )}
              {form.fnbBranches.map((b, i) => (
                <div key={i} style={{ background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Branch {i + 1}</span>
                    {rmBtn(() => rmFB(i))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                    <div><label style={lbl}>Branch Name</label><input style={inp} type="text" placeholder="e.g. Makati Branch" value={b.name} onChange={e => setFB(i, 'name', e.target.value)} /></div>
                    <div><label style={lbl}>Keys per Store</label><input style={inp} type="number" min="0" placeholder="e.g. 3" value={b.keysPerStore} onChange={e => setFB(i, 'keysPerStore', e.target.value)} /></div>
                  </div>
                </div>
              ))}
            </Sec>
          )}

          {!isFnB && !isRW && <div style={{ height: 4 }} />}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 18px 14px', borderTop: '1px solid rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1, fontSize: 10.5, color: '#b8aed8', fontStyle: 'italic' }}>
            {!canSave ? 'Fill in required fields (marked with *)' : '✓ Ready to add company'}
          </div>
          <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: 'pointer', transition: 'all 0.16s' }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 24px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: 'white', border: 'none', cursor: canSave ? 'pointer' : 'not-allowed', background: 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 3px 14px rgba(124,58,237,0.32)', opacity: canSave ? 1 : 0.55, transition: 'all 0.16s' }}>
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ width: 12, height: 12 }}><path d="M7 1v12M1 7h12"/></svg>
            Add Company
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sec — section wrapper used only inside this modal ─────────────────────── */
function Sec({ icon, label, badge, action, children, last }: {
  icon: string; label: string; badge?: string;
  action?: React.ReactNode; children: React.ReactNode; last?: boolean;
}) {
  return (
    <div style={{ padding: '16px 20px', borderBottom: last ? 'none' : '1px solid rgba(124,58,237,0.1)' }}>
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