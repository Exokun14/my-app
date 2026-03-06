/* ==============================================================
   FORGOT PASSWORD PAGE  ·  forgotPs.tsx
   Tailwind-first. The <style> block is kept only for things
   Tailwind cannot express: custom keyframes, arbitrary
   backdrop-filter values, pseudo-class overrides on dynamic
   inline-style properties, and the canvas/shard rules.
   No forgot_styles.css import needed.
   ============================================================== */

'use client';

import { useRouter } from 'next/navigation';
import { useForgotPassword } from './Forgotpslogic';

export default function ForgotPassword() {
  const router = useRouter();

  const {
    email,
    emailError,
    modalOpen,
    displayEmail,
    otpValues,
    otpErrors,
    verified,
    timer,
    canvasRef,
    cardWrapperRef,
    shardContainerRef,
    otpRefs,
    formatTimer,
    handleSendCode,
    handleEmailChange,
    handleOtpChange,
    handleOtpKeyDown,
    handleOtpPaste,
    handleVerify,
    handleCloseModal,
    handleResend,
  } = useForgotPassword();

  /* ─────────────────────────────────────────────────────────────
     Slim global style block — only what Tailwind cannot do
  ───────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@200;300;400;500&display=swap');

        /* ── Keyframes ── */
        @keyframes gxBlobDrift {
          0%   { transform: translate(0,0) scale(1); }
          100% { transform: translate(30px,-40px) scale(1.1); }
        }
        @keyframes gxCardIn {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes gxShimmer {
          0%,100% { transform: translateX(-120%); }
          50%     { transform: translateX(120%); }
        }
        @keyframes gxFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gxFloatShard {
          0%   { transform: translateY(110vh) rotate(0deg) skewX(10deg); opacity: 0; }
          5%   { opacity: 0.8; }
          95%  { opacity: 0.6; }
          100% { transform: translateY(-20vh) rotate(360deg) skewX(-10deg); opacity: 0; }
        }
        @keyframes fpModalIn {
          from { opacity: 0; transform: scale(0.94) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fpSuccessPop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fpOtpShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(6px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Animation helpers ── */
        .anim-card-in   { animation: gxCardIn  0.9s cubic-bezier(0.16,1,0.3,1) both; }
        .anim-shimmer   { animation: gxShimmer 4s ease-in-out infinite; }
        .anim-fade-up-1 { animation: gxFadeUp  0.7s 0.05s both; }
        .anim-fade-up-2 { animation: gxFadeUp  0.7s 0.10s both; }
        .anim-fade-up-3 { animation: gxFadeUp  0.7s 0.18s both; }
        .anim-fade-up-4 { animation: gxFadeUp  0.7s 0.26s both; }
        .anim-fade-up-5 { animation: gxFadeUp  0.7s 0.30s both; }
        .anim-fade-up-6 { animation: gxFadeUp  0.7s 0.36s both; }
        .anim-fade-up-7 { animation: gxFadeUp  0.7s 0.42s both; }
        .anim-modal-in  { animation: fpModalIn 0.35s cubic-bezier(0.34,1.56,0.64,1); }
        .anim-success   { animation: fpSuccessPop 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        .anim-otp-shake { animation: fpOtpShake 0.4s ease; }
        .anim-spin      { animation: spin 0.75s linear infinite; }
        .blob-1 { animation: gxBlobDrift 12s ease-in-out infinite alternate; }
        .blob-2 { animation: gxBlobDrift 15s ease-in-out infinite alternate; }
        .blob-3 { animation: gxBlobDrift 10s ease-in-out infinite alternate; }
        .blob-4 { animation: gxBlobDrift 18s ease-in-out infinite alternate; }

        /* ── Shard particles ── */
        .gx-shard {
          position: absolute;
          background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(14,165,233,0.08));
          backdrop-filter: blur(6px);
          border: 1px solid rgba(124,58,237,0.15);
          border-radius: 2px;
          animation: gxFloatShard linear infinite;
          transform-origin: center;
        }

        /* ── Ripple canvas ── */
        #rippleCanvas {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 10;
        }

        /* ── Interactive overrides ── */
        .fp-email-input:focus {
          outline: none;
          background: rgba(255,255,255,0.98) !important;
          border-color: rgba(109,40,217,0.6) !important;
          box-shadow: 0 0 0 3px rgba(109,40,217,0.12), 0 0 20px rgba(109,40,217,0.06) !important;
          transform: translateY(-1px);
        }
        .fp-otp-cell:focus {
          outline: none;
          border-color: rgba(109,40,217,0.7) !important;
          box-shadow: 0 0 0 3px rgba(109,40,217,0.18), 0 0 20px rgba(109,40,217,0.12) !important;
          transform: translateY(-2px) scale(1.06);
        }
        .fp-btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 40px rgba(139,92,246,0.65),
                      0 0 20px rgba(46,196,165,0.3),
                      0 1px 0 rgba(255,255,255,0.15) inset !important;
        }
        .fp-back-link:hover  { color: #7c3aed !important; }
        .fp-resend-btn:hover { color: #a78bfa !important; }

        input::placeholder { color: #8b7ab8; }

        /* ── Custom font helpers ── */
        .font-cormorant { font-family: 'Cormorant Garamond', serif; }
        .font-jost      { font-family: 'Jost', sans-serif; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════
          BACKGROUND
          ════════════════════════════════════════════════════════════ */}
      <div
        className="fixed inset-0 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 35%, #dde8ff 65%, #f0f4ff 100%)' }}
      >
        {/* Ambient blobs */}
        <div className="absolute rounded-full blob-1"
          style={{ width:600, height:600, top:'-15%', left:'-20%', opacity:0.55, filter:'blur(80px)',
            background:'radial-gradient(circle, rgba(124,58,237,0.25), transparent)' }} />
        <div className="absolute rounded-full blob-2"
          style={{ width:500, height:500, bottom:'-15%', right:'-15%', opacity:0.55, filter:'blur(80px)',
            background:'radial-gradient(circle, rgba(14,165,233,0.2), transparent)' }} />
        <div className="absolute rounded-full blob-3"
          style={{ width:400, height:400, top:'35%', left:'55%', opacity:0.55, filter:'blur(80px)',
            background:'radial-gradient(circle, rgba(99,102,241,0.2), transparent)' }} />
        <div className="absolute rounded-full blob-4"
          style={{ width:300, height:300, top:'10%', right:'10%', opacity:0.55, filter:'blur(80px)',
            background:'radial-gradient(circle, rgba(14,165,233,0.15), transparent)' }} />

        {/* Lattice grid */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(14,165,233,0.05) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }} />

        {/* Crystal shards (injected by hook) */}
        <div ref={shardContainerRef} className="absolute inset-0" />
      </div>

      {/* ── Ripple canvas ── */}
      <canvas ref={canvasRef} id="rippleCanvas" />

      {/* ════════════════════════════════════════════════════════════
          FORGOT PASSWORD CARD
          ════════════════════════════════════════════════════════════ */}
      <div
        className="fixed inset-0 flex items-center justify-center z-100 py-10 overflow-y-auto"
        style={{ perspective: 1200 }}
      >
        <div
          ref={cardWrapperRef}
          className="relative my-10"
          style={{ transformStyle: 'preserve-3d', transition: 'transform 0.15s ease' }}
        >
          {/* Card shell */}
          <div
            className="relative overflow-hidden anim-card-in"
            style={{
              width: 520,
              padding: '48px 44px 44px',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(237,233,254,0.85) 50%, rgba(224,242,254,0.8) 100%)',
              backdropFilter: 'blur(32px) saturate(150%)',
              WebkitBackdropFilter: 'blur(32px) saturate(150%)',
              border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: 24,
              boxShadow: `0 0 0 1px rgba(124,58,237,0.1),
                          0 20px 60px rgba(124,58,237,0.15),
                          0 4px 20px rgba(14,165,233,0.12),
                          0 1px 0 rgba(255,255,255,0.9) inset,
                          0 -1px 0 rgba(124,58,237,0.08) inset`,
            }}
          >
            {/* Top highlight line */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), rgba(124,58,237,0.3), rgba(14,165,233,0.3), transparent)' }} />

            {/* Glass overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%)' }} />

            {/* Shimmer sweep */}
            <div className="absolute inset-0 pointer-events-none rounded-3xl anim-shimmer"
              style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)' }} />

            {/* ── Back link ──────────────────────────────────────── */}
            <button
              type="button"
              className="fp-back-link font-jost flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 mb-6 anim-fade-up-1 transition-colors duration-200"
              style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b4fa0', }}
              onClick={() => router.push('/pages/Login')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to Login
            </button>

            {/* ── Logo row ───────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-7 overflow-hidden anim-fade-up-2" style={{ height: 46, marginBottom: 32, marginTop: 15 }}>
              <img
                src="/img_assets/genieX_branding.png"
                alt="GenieX Logo"
                className="object-contain block shrink-0"
                style={{ width: 142, height: 172, marginTop: -58, marginBottom: -58 }}
              />
              <div className="shrink-0"
                style={{ width: 1, height: 28, margin: '0 4px',
                  background: 'linear-gradient(to bottom, transparent, rgba(139,92,246,0.5), transparent)' }} />
              <span className="font-jost"
                style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#3b2270' }}>
                Recovery
              </span>
            </div>

            {/* ── Heading + key icon ─────────────────────────────── */}
            <div className="flex items-start justify-between gap-4 mb-7 anim-fade-up-3">
              <div className="flex-1">
                <h1 className="font-cormorant m-0 mb-2.5"
                  style={{ fontSize: 38, fontWeight: 300, color: '#0f0730', lineHeight: 1.1, marginBottom: 11 }}>
                  Forgot your{' '}
                  <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#0284c7' }}>password?</em>
                </h1>
                <p className="font-jost m-0"
                  style={{ fontSize: 13, fontWeight: 400, color: '#3b2270', letterSpacing: '0.04em', lineHeight: 1.6, marginBottom: 36 }}>
                  No worries — we'll send a recovery code to the email associated with your account.
                </p>
              </div>

              {/* Animated key SVG */}
              <svg className="shrink-0 mt-1" style={{ width: 72, height: 72 }} viewBox="0 0 82 82" fill="none">
                <circle cx="30" cy="36" r="16" stroke="url(#kg1)" strokeWidth="3" fill="rgba(237,233,254,0.6)" />
                <circle cx="30" cy="36" r="8"  stroke="url(#kg2)" strokeWidth="2" fill="none" />
                <path d="M42 36 L66 36 L66 44 L58 44 L58 52 L50 52 L50 44 L42 44 Z"
                  fill="rgba(237,233,254,0.7)" stroke="url(#kg1)" strokeWidth="2" strokeLinejoin="round" />
                <path d="M64 14 L65.5 18 L69 14 L65.5 10 Z" fill="rgba(124,58,237,0.5)" opacity="0.7" />
                <path d="M72 20 L73 22.5 L75 20 L73 17.5 Z" fill="rgba(46,196,165,0.6)" opacity="0.8" />
                <path d="M18 16 L19 18 L21 16 L19 14 Z" fill="rgba(46,196,165,0.5)" opacity="0.6" />
                <defs>
                  <linearGradient id="kg1" x1="14" y1="20" x2="66" y2="52">
                    <stop stopColor="#7c3aed" /><stop offset="1" stopColor="#2ec4a5" />
                  </linearGradient>
                  <linearGradient id="kg2" x1="22" y1="28" x2="38" y2="44">
                    <stop stopColor="#a855f7" /><stop offset="1" stopColor="#0284c7" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* ── Email field ────────────────────────────────────── */}
            <div className="anim-fade-up-4">
              <label className="block mb-2 font-jost"
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3b2270', marginBottom: 5 }}>
                Email Address
              </label>
              <div className="relative mb-2">
                <input
                  className="fp-email-input font-jost block w-full"
                  type="email"
                  placeholder="Enter your email here...."
                  autoComplete="email"
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  onFocus={() => {
                    const line = document.getElementById('emailLine');
                    if (line) {
                      (line as HTMLElement).style.width = '0';
                      (line as HTMLElement).style.left = '50%';
                    }
                  }}
                  onBlur={() => {
                    const line = document.getElementById('emailLine');
                    if (line) {
                      (line as HTMLElement).style.width = '100%';
                      (line as HTMLElement).style.left = '0';
                    }
                  }}
                  style={{
                    padding: '13px 12px',
                    fontSize: 14, fontWeight: 300, color: '#1e1048',
                    background: 'rgba(255,255,255,0.8)',
                    border: `1px solid ${emailError ? 'rgba(239,68,68,0.6)' : 'rgba(124,58,237,0.2)'}`,
                    borderBottom: `1px solid ${emailError ? 'rgba(239,68,68,0.7)' : 'rgba(124,58,237,0.4)'}`,
                    borderRadius: 10,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    boxShadow: emailError
                      ? '0 0 0 3px rgba(239,68,68,0.1)'
                      : '0 1px 0 rgba(255,255,255,0.8) inset',
                    transition: 'all 0.3s ease',
                    animation: emailError ? 'fpOtpShake 0.4s ease' : 'none',
                  }}
                />

                {/* ── Animated gradient underline (matches login username field) ── */}
                <div
                  id="emailLine"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: 2,
                    width: '100%',
                    borderRadius: '0 0 10px 10px',
                    transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1), left 0.45s cubic-bezier(0.4,0,0.2,1)',
                    background: emailError
                      ? 'linear-gradient(90deg, #ef4444, #f87171)'
                      : 'linear-gradient(90deg, #6d28d9, #a78bfa, #0284c7)',
                    pointerEvents: 'none',
                  }}
                />
              </div>

              {emailError && (
                <p className="font-jost mt-1.5 m-0"
                  style={{ fontSize: 12, color: 'rgba(239,68,68,0.9)' }}>
                  Please enter a valid email address.
                </p>
              )}
            </div>

            {/* Helper text */}
            <p className="font-jost mt-3 mb-6 m-0 anim-fade-up-5"
              style={{ fontSize: 12, fontWeight: 400, color: '#6b4fa0', lineHeight: 1.6, marginTop: 5, marginBottom: 28 }}>
              Enter the email associated with your account and we'll send you a 6-digit verification code.
            </p>

            {/* ── Send Code button ───────────────────────────────── */}
            <button
              className="fp-btn-primary font-jost relative overflow-hidden w-full border-none cursor-pointer mb-4 anim-fade-up-6 transition-all duration-200"
              onClick={handleSendCode}
              style={{
                padding: '15px',
                fontSize: 12, fontWeight: 500,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: 'white',
                background: 'linear-gradient(135deg, #7c3aed 0%, #2ec4a5 100%)',
                borderRadius: 12,
                boxShadow: '0 4px 24px rgba(139,92,246,0.5), 0 1px 0 rgba(255,255,255,0.15) inset',
                marginBottom: 18,
              }}
            >
              {/* Gloss overlay */}
              <span className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), transparent)' }} />
              Send Verification
            </button>

            {/* ── Security tag ───────────────────────────────────── */}
            <div className="flex items-center justify-center gap-2 font-jost anim-fade-up-7"
              style={{ fontSize: 9.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b4fa0' }}>
              <div className="rounded-full" style={{ width: 4, height: 4, background: '#6d28d9' }} />
              AES-256 Encrypted
              <div className="rounded-full" style={{ width: 4, height: 4, background: '#6d28d9' }} />
              Secure Session
              <div className="rounded-full" style={{ width: 4, height: 4, background: '#6d28d9' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          OTP MODAL
          ════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-10000"
          style={{
            background: 'rgba(5,2,15,0.65)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
          onClick={e => { if (e.target === e.currentTarget) handleCloseModal(); }}
        >
          <div
            className="relative overflow-hidden anim-modal-in"
            style={{
              width: 420, maxWidth: '92vw',
              padding: '40px 36px 36px',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(237,233,254,0.9) 50%, rgba(224,242,254,0.88) 100%)',
              backdropFilter: 'blur(32px) saturate(150%)',
              WebkitBackdropFilter: 'blur(32px) saturate(150%)',
              border: '1px solid rgba(124,58,237,0.18)',
              borderRadius: 22,
              boxShadow: `0 0 0 1px rgba(124,58,237,0.08),
                          0 24px 64px rgba(124,58,237,0.2),
                          0 4px 24px rgba(14,165,233,0.1),
                          0 1px 0 rgba(255,255,255,0.9) inset`,
            }}
          >
            {/* Top highlight */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), rgba(124,58,237,0.3), rgba(14,165,233,0.3), transparent)' }} />

            {/* Shimmer */}
            <div className="absolute inset-0 pointer-events-none anim-shimmer"
              style={{ borderRadius: 22, background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)' }} />

            {/* Back button */}
            <button
              className="fp-back-link font-jost flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 mb-6 transition-colors duration-200"
              style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b4fa0' }}
              onClick={handleCloseModal}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>

            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1">
                <h2 className="font-cormorant m-0 mb-2"
                  style={{ fontSize: 32, fontWeight: 300, color: '#0f0730', lineHeight: 1.1, marginTop: 15, marginBottom: 5 }}>
                  Check your <em style={{ fontStyle: 'italic', color: '#0284c7' }}>email.</em>
                </h2>
                <p className="font-jost m-0" style={{ fontSize: 13, color: '#3b2270', marginTop: 8 }}>
                  We sent a 6-digit verification code to
                </p>
                <p className="font-jost mt-1 m-0"
                  style={{ fontSize: 14, fontWeight: 500, color: '#6d28d9', letterSpacing: '0.02em' }}>
                  {displayEmail}
                </p>
              </div>

              {/* Envelope SVG */}
              <svg className="shrink-0" style={{ width: 68, height: 68, marginTop: 25, marginRight: 21 }} viewBox="0 0 88 88" fill="none">
                <rect x="10" y="26" width="68" height="48" rx="6"
                  fill="rgba(237,233,254,0.8)" stroke="url(#eg1)" strokeWidth="2" />
                <path d="M10 32 L44 56 L78 32"
                  stroke="url(#eg1)" strokeWidth="2" fill="none" strokeLinecap="round" />
                <rect x="22" y="40" width="45" height="18" rx="4"
                  fill="rgba(255,255,255,0.9)" stroke="rgba(124,58,237,0.3)" strokeWidth="1.2" />
                <text x="25" y="53" fontFamily="monospace" fontSize="10" fill="#7c3aed" fontWeight="600">
                  105 285
                </text>
                <path d="M76 16 L77.2 20 L81 16 L77.2 12 Z" fill="#7c3aed" opacity="0.7" />
                <path d="M14 18 L15 21 L18 18 L15 15 Z" fill="#2ec4a5" opacity="0.7" />
                <defs>
                  <linearGradient id="eg1" x1="10" y1="26" x2="78" y2="74">
                    <stop stopColor="#7c3aed" /><stop offset="1" stopColor="#2ec4a5" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* ── OTP inputs  OR  verified state ──────────────────── */}
            {!verified ? (
              <>
                {/* OTP digit row */}
                <div className="flex justify-center gap-2.5 my-6">
                  {otpValues.map((val, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el; }}
                      className={`fp-otp-cell font-cormorant text-center cursor-text transition-all duration-200${otpErrors[i] ? ' anim-otp-shake' : ''}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onPaste={e => handleOtpPaste(i, e)}
                      style={{
                        width: 51, height: 54,
                        fontSize: 24, fontWeight: 400,
                        color: val ? '#1e1048' : '#8b7ab8',
                        background: val
                          ? 'linear-gradient(135deg, rgba(237,233,254,0.95), rgba(224,242,254,0.9))'
                          : 'rgba(255,255,255,0.75)',
                        border: `1.5px solid ${
                          otpErrors[i] ? 'rgba(239,68,68,0.6)'
                          : val        ? 'rgba(109,40,217,0.5)'
                                       : 'rgba(124,58,237,0.2)'}`,
                        borderRadius: 12,
                        boxShadow: otpErrors[i]
                          ? '0 0 0 3px rgba(239,68,68,0.15)'
                          : val
                            ? '0 0 0 2px rgba(109,40,217,0.1), 0 4px 12px rgba(124,58,237,0.12)'
                            : '0 1px 0 rgba(255,255,255,0.8) inset',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        marginBottom: 25,
                        marginTop: 55,
                      }}
                    />
                  ))}
                </div>

                {/* Verify button */}
                <button
                  className="fp-btn-primary font-jost relative overflow-hidden w-full border-none cursor-pointer mb-4 transition-all duration-200"
                  onClick={handleVerify}
                  style={{
                    padding: '14px',
                    fontSize: 12, fontWeight: 500,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: 'white',
                    background: 'linear-gradient(135deg, #7c3aed 0%, #2ec4a5 100%)',
                    borderRadius: 12,
                    boxShadow: '0 4px 24px rgba(139,92,246,0.5), 0 1px 0 rgba(255,255,255,0.15) inset',
                  }}
                >
                  <span className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), transparent)' }} />
                  Verify
                </button>

                {/* Resend row */}
                <p className="font-jost text-center m-0" style={{ fontSize: 13, color: '#6b4fa0', marginTop: 8 }}>
                  Didn't receive the code?{' '}
                  {timer > 0 ? (
                    <span className="inline-flex items-center gap-1 font-jost"
                      style={{ fontSize: 13, fontWeight: 500, color: '#a78bfa' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {formatTimer(timer)}
                    </span>
                  ) : (
                    <button
                      className="fp-resend-btn font-jost bg-transparent border-none cursor-pointer p-0 underline transition-colors duration-200"
                      style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9' }}
                      onClick={handleResend}
                    >
                      Resend
                    </button>
                  )}
                </p>
              </>
            ) : (
              /* ── Verified success state ── */
              <div className="flex flex-col items-center gap-3 py-4">
                <div
                  className="flex items-center justify-center rounded-full anim-success"
                  style={{
                    width: 56, height: 56,
                    background: 'linear-gradient(135deg, #7c3aed, #2ec4a5)',
                    boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
                    marginTop: 40,
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    width="24" height="24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <div className="font-cormorant"
                  style={{ fontSize: 26, fontWeight: 300, color: '#0f0730',  }}>
                  Code <em style={{ fontStyle: 'italic', color: '#0284c7' }}>verified!</em>
                </div>

                <div className="font-jost flex items-center gap-1.5"
                  style={{ fontSize: 13, color: '#6b4fa0' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" className="anim-spin">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Redirecting to reset your password…
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}