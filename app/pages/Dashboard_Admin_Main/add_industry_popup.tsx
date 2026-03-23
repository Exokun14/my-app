/* ==============================================================
   add_industry_popup.tsx  ·  Add Industry Modal
   - Live preview matches the exact Aloha/Retail/Warehouse stat card
   - Color field: hex ONLY (#rrggbb or #rgb) — color names forbidden
   - Native color picker swatch + hex text input in sync
   ============================================================== */

'use client';

import React, { useState, useEffect, useRef } from 'react';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
export interface IndustryCard {
  id:         number;
  icon:       string;
  title:      string;
  sub_title:  string | null;
  count:      number;
  tickets:    number;
  color:      string | null;
  created_at: string;
}

interface AddIndustryPopupProps {
  onAdd:     (card: IndustryCard) => void;
  onClose:   () => void;
  showToast: (msg: string) => void;
}

/* ─── Emoji presets ──────────────────────────────────────────────────────────── */
const EMOJI_PRESETS = [
  '🍔', '🛍️', '📦', '🏭', '🏪', '🏬', '🚗', '✈️',
  '💊', '🏥', '🎮', '📱', '💻', '🎨', '🏗️', '🌾',
  '🍕', '☕', '🏋️', '📚', '💰', '🎯', '🔧', '🌐',
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost';

/* ─── Hex validation ─────────────────────────────────────────────────────────── */

/** Returns true if the string is a valid hex color: #rgb or #rrggbb */
function isValidHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim());
}

/**
 * Normalise a 3-digit hex (#abc) to 6-digit (#aabbcc).
 * Returns the input unchanged if it's already 6-digit.
 */
function normaliseHex(hex: string): string {
  const h = hex.trim();
  if (/^#[0-9A-Fa-f]{3}$/.test(h)) {
    const [, r, g, b] = h.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return h.toLowerCase();
}

/* ─── Shared styles ──────────────────────────────────────────────────────────── */
const inp: React.CSSProperties = {
  background: '#f2f0fb',
  border: '1px solid rgba(124,58,237,0.1)',
  borderRadius: 8,
  padding: '8px 11px',
  fontFamily: 'DM Sans,sans-serif',
  fontSize: 12.5,
  color: '#18103a',
  outline: 'none',
  transition: 'all 0.16s',
  width: '100%',
  boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  color: '#4a3870',
  letterSpacing: '0.04em',
  display: 'block',
  marginBottom: 5,
};

/* ══════════════════════════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════════════════════════ */
export default function AddIndustryPopup({ onAdd, onClose, showToast }: AddIndustryPopupProps) {
  const [icon,            setIcon]            = useState('🏢');
  const [title,           setTitle]           = useState('');
  const [subTitle,        setSubTitle]        = useState('');

  /* ── Hex color state ── */
  const [hexInput,        setHexInput]        = useState('#7c3aed');
  const [hexValid,        setHexValid]        = useState(true);

  const [isSaving,        setIsSaving]        = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [customEmoji,     setCustomEmoji]     = useState('');

  const emojiRef   = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef   = useRef<HTMLDivElement>(null);
  const pickerRef  = useRef<HTMLInputElement>(null);

  /* Animate in */
  useEffect(() => {
    requestAnimationFrame(() => {
      if (overlayRef.current) overlayRef.current.style.opacity = '1';
      if (modalRef.current) {
        modalRef.current.style.opacity = '1';
        modalRef.current.style.transform = 'translateY(0) scale(1)';
      }
    });
  }, []);

  /* Close emoji picker on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* Escape to close */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  /* Validate hex on every keystroke */
  useEffect(() => {
    setHexValid(isValidHex(hexInput));
  }, [hexInput]);

  /* The resolved hex (normalised) used for preview + save */
  const resolvedHex = hexValid ? normaliseHex(hexInput) : '#7c3aed';

  const cc = {
    bg:     resolvedHex + '14',
    border: resolvedHex + 'aa',
    iconBg: resolvedHex + '1a',
  };

  const canSave = !!(title.trim()) && hexValid && !isSaving;

  /* ── Handle hex text input change ── */
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    /* Auto-prepend # if user types without it */
    if (v.length > 0 && v[0] !== '#') v = '#' + v;
    setHexInput(v);
  };

  /* ── Handle native color picker change → update hex text field ── */
  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHexInput(e.target.value.toLowerCase());
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!title.trim()) { showToast('Please enter an industry title.'); return; }
    if (!hexValid)     { showToast('Please enter a valid hex color (e.g. #7c3aed).'); return; }
    setIsSaving(true);
    const finalHex = normaliseHex(hexInput);
    try {
      const res = await fetch(`${API_BASE}/api/industry-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          icon:      icon,
          title:     title.trim(),
          sub_title: subTitle.trim() || null,
          color:     finalHex,
          count:     0,
          tickets:   0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(`Error: ${data?.message ?? `Server error (${res.status})`}`); setIsSaving(false); return; }
      onAdd({
        id:         data.id ?? Date.now(),
        icon,
        title:      title.trim(),
        sub_title:  subTitle.trim() || null,
        count:      0,
        tickets:    0,
        color:      finalHex,
        created_at: new Date().toISOString(),
      });
      showToast(`Industry "${title.trim()}" added successfully!`);
      onClose();
    } catch { showToast('Network error — could not reach the server.'); }
    finally   { setIsSaving(false); }
  };

  /* ── Live Preview Card ── */
  const PreviewCard = () => (
    <div style={{
      borderRadius: 16, background: '#fff',
      border: `1.5px solid ${cc.border}`,
      padding: '13px 16px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      boxShadow: `0 2px 8px ${resolvedHex}22`,
      minHeight: 158, width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          background: cc.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, lineHeight: 1,
        }}>
          {icon}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 800, letterSpacing: '0.04em',
          textTransform: 'uppercase',
          background: cc.bg, color: resolvedHex,
          padding: '5px 13px', borderRadius: 20,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160,
        }}>
          {title || 'TITLE'}
        </span>
      </div>
      <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', color: resolvedHex, marginBottom: 4 }}>
        0
      </div>
      <div style={{ fontSize: 11, fontWeight: 500, color: resolvedHex + '99', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {subTitle || 'Sub title here'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderTop: `1px solid ${cc.border}`, marginTop: 8, paddingTop: 8, fontSize: 10.5, fontWeight: 600, color: resolvedHex, opacity: 0.75 }}>
        <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="7" cy="7" r="5.5"/><path d="M7 4.5V7l1.5.9"/>
        </svg>
        0 tickets
      </div>
    </div>
  );

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(18,10,50,0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        opacity: 0, transition: 'opacity 0.22s ease',
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '100%', maxWidth: 700,
          background: '#fff', borderRadius: 20,
          boxShadow: '0 32px 80px rgba(18,10,50,0.22), 0 0 0 1px rgba(124,58,237,0.1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          opacity: 0, transform: 'translateY(14px) scale(0.97)',
          transition: 'opacity 0.26s cubic-bezier(0.16,1,0.3,1), transform 0.26s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '18px 22px 15px', background: 'linear-gradient(135deg,#5b21b6,#0d9488)', display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏭</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Add New Industry</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>Create a new industry category card for the Company Database</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.14)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l9 9M10 1L1 10"/></svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

          {/* Left: form */}
          <div style={{ width: 280, flexShrink: 0, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16, borderRight: '1px solid rgba(124,58,237,0.08)', overflowY: 'auto' }}>

            {/* Icon picker */}
            <div>
              <label style={lbl}>Industry Icon</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div ref={emojiRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(o => !o)}
                    style={{
                      width: 48, height: 48, borderRadius: 12, fontSize: 24,
                      background: cc.iconBg,
                      border: `2px solid ${showEmojiPicker ? resolvedHex : cc.border}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s', flexShrink: 0,
                      boxShadow: showEmojiPicker ? `0 0 0 3px ${resolvedHex}30` : 'none',
                    }}
                  >
                    {icon}
                  </button>

                  {showEmojiPicker && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#fff', borderRadius: 14, border: '1px solid rgba(124,58,237,0.15)', boxShadow: '0 10px 32px rgba(18,10,50,0.14)', padding: 12, marginTop: 6, width: 248 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#8e7ec0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Quick pick</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, marginBottom: 10 }}>
                        {EMOJI_PRESETS.map(e => (
                          <button key={e} type="button" onClick={() => { setIcon(e); setShowEmojiPicker(false); }}
                            style={{ width: 26, height: 26, fontSize: 16, borderRadius: 7, border: e === icon ? `1.5px solid ${resolvedHex}` : '1.5px solid transparent', background: e === icon ? cc.iconBg : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}
                            onMouseEnter={ev => { (ev.currentTarget as HTMLButtonElement).style.background = '#f2f0fb'; }}
                            onMouseLeave={ev => { (ev.currentTarget as HTMLButtonElement).style.background = e === icon ? cc.iconBg : 'transparent'; }}
                          >{e}</button>
                        ))}
                      </div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: '#8e7ec0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Or type any emoji</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input style={{ ...inp, flex: 1, fontSize: 18, textAlign: 'center', padding: '5px 8px' }} placeholder="✏️" value={customEmoji} onChange={e => setCustomEmoji(e.target.value)} maxLength={4} />
                        <button type="button" onClick={() => { if (customEmoji.trim()) { setIcon(customEmoji.trim()); setShowEmojiPicker(false); setCustomEmoji(''); } }} style={{ padding: '5px 12px', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Use</button>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#8e7ec0', lineHeight: 1.5 }}>Click to<br/>choose emoji</div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={lbl}>
                Industry Title <span style={{ color: '#dc2626' }}>*</span>
                <span style={{ marginLeft: 4, fontSize: 9, color: '#8e7ec0', fontWeight: 400, fontStyle: 'italic' }}>(badge label)</span>
              </label>
              <input style={{ ...inp, fontSize: 12 }} type="text" placeholder="e.g. Food & Beverage" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
            </div>

            {/* Sub title */}
            <div>
              <label style={lbl}>
                Sub Title
                <span style={{ marginLeft: 4, fontSize: 9, color: '#8e7ec0', fontWeight: 400, fontStyle: 'italic' }}>(below count)</span>
              </label>
              <input style={{ ...inp, fontSize: 12 }} type="text" placeholder="e.g. Aloha POS System" value={subTitle} onChange={e => setSubTitle(e.target.value)} maxLength={150} />
            </div>

            {/* ── Card Color — hex only ── */}
            <div>
              <label style={lbl}>
                Card Color <span style={{ color: '#dc2626' }}>*</span>
                <span style={{ marginLeft: 4, fontSize: 9, color: '#8e7ec0', fontWeight: 400, fontStyle: 'italic' }}>(hex only)</span>
              </label>

              {/* Row: color picker swatch + hex input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                {/* Native color picker — hidden input triggered by the swatch */}
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: hexValid ? resolvedHex : '#e5e7eb',
                    border: `2.5px solid ${hexValid ? resolvedHex + '66' : '#d1d5db'}`,
                    boxShadow: hexValid ? `0 0 0 3px ${resolvedHex}22, 0 2px 8px ${resolvedHex}44` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onClick={() => pickerRef.current?.click()}
                  title="Open color picker"
                >
                  <input
                    ref={pickerRef}
                    type="color"
                    value={hexValid ? resolvedHex : '#7c3aed'}
                    onChange={handlePickerChange}
                    style={{
                      position: 'absolute', inset: 0,
                      width: '100%', height: '100%',
                      opacity: 0, cursor: 'pointer',
                      border: 'none', padding: 0,
                    }}
                  />
                </div>

                {/* Hex text input */}
                <input
                  style={{
                    ...inp,
                    flex: 1,
                    fontFamily: '"Courier New", monospace',
                    fontSize: 13,
                    letterSpacing: '0.04em',
                    padding: '8px 10px',
                    borderColor: !hexValid && hexInput.trim() ? '#fca5a5' : 'rgba(124,58,237,0.1)',
                    background:  !hexValid && hexInput.trim() ? '#fef2f2'  : '#f2f0fb',
                    textTransform: 'lowercase' as const,
                  }}
                  type="text"
                  placeholder="#7c3aed"
                  value={hexInput}
                  onChange={handleHexChange}
                  maxLength={7}
                  spellCheck={false}
                />
              </div>

              {/* Validation message */}
              <div style={{ marginTop: 5, fontSize: 10, fontWeight: 500, height: 14 }}>
                {!hexValid && hexInput.trim() ? (
                  <span style={{ color: '#ef4444' }}>⚠ Must be a valid hex — e.g. #7c3aed or #fff</span>
                ) : hexValid ? (
                  <span style={{ color: resolvedHex, fontWeight: 700 }}>✓ {resolvedHex}</span>
                ) : (
                  <span style={{ color: '#b8aed8' }}>Enter a hex color code</span>
                )}
              </div>


            </div>

          </div>

          {/* Right: live preview */}
          <div style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10, background: '#faf9ff' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: '#8e7ec0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Preview</div>
            <PreviewCard />
            <div style={{ fontSize: 9.5, color: '#b8aed8', lineHeight: 1.5 }}>
              Count &amp; tickets update as companies are assigned.
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '12px 22px 14px', borderTop: '1px solid rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1, fontSize: 10.5, color: '#b8aed8', fontStyle: 'italic' }}>
            {isSaving ? '⏳ Saving…'
              : !title.trim()  ? 'Fill in the required title field (*)'
              : !hexValid      ? 'Enter a valid hex color (*)'
              : `✓ Ready — "${title}" will be added`
            }
          </div>
          <button onClick={onClose} disabled={isSaving} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, color: '#4a3870', background: '#f2f0fb', border: '1px solid rgba(124,58,237,0.1)', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.5 : 1 }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!canSave}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 22px', borderRadius: 8, border: 'none', fontSize: 11.5, fontWeight: 600, color: 'white', background: isSaving ? 'linear-gradient(135deg,#a78bfa,#5eead4)' : 'linear-gradient(135deg,#7c3aed,#0d9488)', boxShadow: '0 3px 14px rgba(124,58,237,0.32)', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.55, transition: 'all 0.16s' }}
          >
            {isSaving ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.75s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ width: 12, height: 12 }}><path d="M7 1v12M1 7h12"/></svg>
                Add Industry
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}









