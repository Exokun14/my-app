/* ==============================================================
   LOGIN USER PAGE  ·  logUser.tsx
   ============================================================== */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  initShards,
  initCardTilt,
  initSignInRipple,
  initSocialRipple,
  initSwipeGestures,
} from "./loginUtils";
import RippleCanvas from "../../Effects/RippleCanvas";

/* ── Local account store ─────────────────────────────────── */
// role: "admin" → DashboardAdmin.tsx  |  role: "client" → OverviewPage.tsx
const LOCAL_ACCOUNTS = [
  { username: "Dhenzel@gmail.com", password: "Dhenzel@123", role: "admin"  as const },
  { username: "Kelly@gmail.com",   password: "Kelly@123",   role: "admin"  as const },
  { username: "Rain@gmail.com",    password: "Rain@123",    role: "client" as const },
];

export type UserRole = "admin" | "client";

/* ── Prop types ──────────────────────────────────────────── */
interface LoginAdminProps {
  /** Called on successful login; passes the authenticated user's role */
  onLoginSuccess: (role: UserRole) => void;
}

/* ══════════════════════════════════════════════════════════
   RESOLUTION TIER SYSTEM
   ══════════════════════════════════════════════════════════ */
type Tier = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "4k";

function getTier(w: number): Tier {
  if (w <= 360)  return "xs";
  if (w <= 480)  return "sm";
  if (w <= 768)  return "md";
  if (w <= 1024) return "lg";
  if (w <= 1440) return "xl";
  if (w <= 1920) return "2xl";
  return "4k";
}

interface Tokens {
  cardMaxW: number; cardPadX: number; cardPadY: number; radius: number;
  logoW: number; logoH: number; logoNudge: number; logoRowH: number; logoRowMb: number;
  h1: number; sub: number; lbl: number;
  inputPy: number; inputPx: number; inputFs: number;
  headingMt: number; headingMb: number; fieldMb: number;
  optionsMt: number; signinMt: number; signinMb: number; dividerMy: number;
  btnPy: number; btnFs: number; socialPy: number;
}

const T: Record<Tier, Tokens> = {
  xs:    { cardMaxW:320,  cardPadX:18,  cardPadY:22,  radius:16, logoW:80,  logoH:97,  logoNudge:32, logoRowH:28, logoRowMb:14, h1:22, sub:11, lbl:10, inputPy:10, inputPx:9,  inputFs:13, headingMt:10, headingMb:12, fieldMb:10, optionsMt:2,  signinMt:14, signinMb:7,  dividerMy:9,  btnPy:12, btnFs:11, socialPy:9  },
  sm:    { cardMaxW:380,  cardPadX:22,  cardPadY:28,  radius:18, logoW:95,  logoH:115, logoNudge:38, logoRowH:32, logoRowMb:18, h1:26, sub:12, lbl:10, inputPy:11, inputPx:10, inputFs:13, headingMt:12, headingMb:15, fieldMb:12, optionsMt:2,  signinMt:18, signinMb:9,  dividerMy:11, btnPy:13, btnFs:11, socialPy:10 },
  md:    { cardMaxW:460,  cardPadX:32,  cardPadY:36,  radius:20, logoW:115, logoH:140, logoNudge:46, logoRowH:38, logoRowMb:24, h1:32, sub:12, lbl:11, inputPy:12, inputPx:11, inputFs:14, headingMt:18, headingMb:18, fieldMb:14, optionsMt:3,  signinMt:22, signinMb:10, dividerMy:13, btnPy:14, btnFs:11, socialPy:11 },
  lg:    { cardMaxW:490,  cardPadX:38,  cardPadY:44,  radius:22, logoW:128, logoH:155, logoNudge:52, logoRowH:42, logoRowMb:30, h1:36, sub:13, lbl:11, inputPy:12, inputPx:11, inputFs:14, headingMt:22, headingMb:22, fieldMb:16, optionsMt:3,  signinMt:24, signinMb:11, dividerMy:14, btnPy:14, btnFs:12, socialPy:11 },
  xl:    { cardMaxW:520,  cardPadX:44,  cardPadY:52,  radius:24, logoW:142, logoH:172, logoNudge:58, logoRowH:46, logoRowMb:36, h1:40, sub:13, lbl:11, inputPy:13, inputPx:12, inputFs:14, headingMt:28, headingMb:28, fieldMb:20, optionsMt:4,  signinMt:28, signinMb:12, dividerMy:16, btnPy:15, btnFs:12, socialPy:11 },
  "2xl": { cardMaxW:570,  cardPadX:50,  cardPadY:58,  radius:26, logoW:160, logoH:194, logoNudge:65, logoRowH:50, logoRowMb:40, h1:46, sub:14, lbl:12, inputPy:14, inputPx:13, inputFs:15, headingMt:30, headingMb:30, fieldMb:22, optionsMt:4,  signinMt:30, signinMb:13, dividerMy:17, btnPy:16, btnFs:13, socialPy:12 },
  "4k":  { cardMaxW:640,  cardPadX:58,  cardPadY:66,  radius:30, logoW:185, logoH:224, logoNudge:75, logoRowH:58, logoRowMb:46, h1:54, sub:16, lbl:13, inputPy:16, inputPx:15, inputFs:16, headingMt:34, headingMb:34, fieldMb:24, optionsMt:5,  signinMt:34, signinMb:14, dividerMy:19, btnPy:18, btnFs:14, socialPy:13 },
};

function compressVertical(tok: Tokens, vh: number): Tokens {
  if (vh >= 700) return tok;
  const r = Math.max(0.6, vh / 700);
  return {
    ...tok,
    cardPadY:  Math.round(tok.cardPadY  * r),
    headingMt: Math.round(tok.headingMt * r),
    headingMb: Math.round(tok.headingMb * r),
    fieldMb:   Math.round(tok.fieldMb   * r),
    signinMt:  Math.round(tok.signinMt  * r),
    signinMb:  Math.round(tok.signinMb  * r),
    dividerMy: Math.round(tok.dividerMy * r),
    logoRowMb: Math.round(tok.logoRowMb * r),
    inputPy:   Math.round(tok.inputPy   * r),
    btnPy:     Math.round(tok.btnPy     * r),
  };
}

/* ══════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════ */
export default function LoginAdmin({ onLoginSuccess }: LoginAdminProps) {
  // FIX: useRouter for "Forgot password?" navigation
  const router = useRouter();

  const cardWrapperRef    = useRef<HTMLDivElement>(null);
  const shardContainerRef = useRef<HTMLDivElement>(null);
  const passInputRef      = useRef<HTMLInputElement>(null);
  const signInBtnRef      = useRef<HTMLButtonElement>(null);
  const usernameInputRef  = useRef<HTMLInputElement>(null);

  const [tier, setTier] = useState<Tier>("xl");
  const [vw,   setVw]   = useState(1280);
  const [vh,   setVh]   = useState(800);

  const [toastMsg,     setToastMsg]     = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [stayChecked,  setStayChecked]  = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measure = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setVw(w); setVh(h); setTier(getTier(w));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", () => setTimeout(measure, 150));
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [measure]);

  const tok         = compressVertical(T[tier], vh);
  const isMobile    = tier === "xs" || tier === "sm";
  const isVeryShort = vh < 560;

  const showToast = (msg: string) => {
    setToastMsg(msg); setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
  };
  const showError  = (msg: string) => { setErrorMsg(msg); setErrorVisible(true); };
  const closeError = () => setErrorVisible(false);

  const handleSignIn = () => {
    const username = usernameInputRef.current?.value.trim() ?? "";
    const password = passInputRef.current?.value ?? "";
    if (!username && !password) { showToast("⚠️  Username and password are required."); return; }
    if (!username) { showToast("⚠️  Please enter your username / email."); return; }
    if (!password) { showToast("⚠️  Please enter your password."); return; }

    const match = LOCAL_ACCOUNTS.find(
      (a) => a.username.toLowerCase() === username.toLowerCase() && a.password === password
    );

    if (!match) {
      showError("The account you entered doesn't exist or the password is incorrect. Please check your credentials and try again.");
      return;
    }

    setIsLoading(true);
    // Short delay for the loading animation, then hand off to parent with the user's role
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(match.role);
    }, 900);
  };

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    if (shardContainerRef.current) initShards(shardContainerRef.current);
    if (cardWrapperRef.current) cleanups.push(initCardTilt(cardWrapperRef.current));
    if (signInBtnRef.current)  cleanups.push(initSignInRipple(signInBtnRef.current));
    initSocialRipple();
    cleanups.push(initSwipeGestures());
    return () => cleanups.forEach((fn) => fn());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter") handleSignIn(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Token-driven style objects (only for values Tailwind can't express) ── */
  const inputBase: React.CSSProperties = {
    paddingTop:    tok.inputPy,
    paddingBottom: tok.inputPy,
    paddingLeft:   tok.inputPx,
    paddingRight:  tok.inputPx,
    fontSize:      tok.inputFs,
    borderRadius:  10,
  };

  return (
    <>
      {/* ════════════════════════════════════════════
          GLOBAL CSS VARIABLES + KEYFRAMES + FONTS
          ════════════════════════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@200;300;400;500&display=swap');

        :root {
          --gx-violet:        #7c3aed;
          --gx-violet-dark:   #6d28d9;
          --gx-violet-deep:   #3b2270;
          --gx-teal:          #2ec4a5;
          --gx-sky:           #0284c7;
          --gx-ink:           #0f0730;
          --gx-ink-soft:      #1e1048;
          --gx-purple-muted:  #6b4fa0;
          --gx-lavender:      #a78bfa;

          --gx-bg-gradient:   linear-gradient(135deg,#f0f4ff 0%,#e8eeff 35%,#dde8ff 65%,#f0f4ff 100%);
          --gx-card-bg:       linear-gradient(145deg,rgba(255,255,255,0.92) 0%,rgba(237,233,254,0.85) 50%,rgba(224,242,254,0.8) 100%);
          --gx-card-border:   rgba(124,58,237,0.15);
          --gx-card-shadow:   0 0 0 1px rgba(124,58,237,0.1),
                              0 20px 60px rgba(124,58,237,0.15),
                              0 4px 20px rgba(14,165,233,0.12),
                              0 1px 0 rgba(255,255,255,0.9) inset,
                              0 -1px 0 rgba(124,58,237,0.08) inset;

          --gx-input-bg:           rgba(255,255,255,0.8);
          --gx-input-bg-focus:     rgba(255,255,255,0.98);
          --gx-input-border:       rgba(124,58,237,0.2);
          --gx-input-border-b:     rgba(124,58,237,0.4);
          --gx-input-border-focus: rgba(109,40,217,0.6);
          --gx-input-shadow:       0 1px 0 rgba(255,255,255,0.8) inset;
          --gx-input-shadow-focus: 0 0 0 3px rgba(109,40,217,0.12),0 0 20px rgba(109,40,217,0.06);
          --gx-underline-grad:     linear-gradient(90deg,#6d28d9,#a78bfa,#0284c7);

          --gx-btn-grad:      linear-gradient(135deg,#7c3aed 0%,#2ec4a5 100%);
          --gx-btn-shadow:    0 4px 24px rgba(139,92,246,0.5),0 1px 0 rgba(255,255,255,0.15) inset;
          --gx-btn-shadow-hv: 0 8px 40px rgba(139,92,246,0.65),0 0 20px rgba(46,196,165,0.3),0 1px 0 rgba(255,255,255,0.15) inset;

          --gx-social-bg:       rgba(255,255,255,0.85);
          --gx-social-bg-hv:    rgba(237,233,254,0.95);
          --gx-social-border:   rgba(109,40,217,0.22);
          --gx-social-border-hv:rgba(109,40,217,0.4);
          --gx-social-shadow:   0 1px 0 rgba(255,255,255,0.9) inset,0 2px 8px rgba(109,40,217,0.06);
          --gx-social-shadow-hv:0 4px 20px rgba(109,40,217,0.18),0 1px 0 rgba(255,255,255,0.9) inset;

          --gx-divider: linear-gradient(to right,transparent,rgba(124,58,237,0.2),transparent);
          --gx-shimmer: linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.4) 50%,transparent 70%);
        }

        *, *::before, *::after { box-sizing: border-box; }

        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes fadeIn       { from { opacity:0; } to { opacity:1; } }
        @keyframes modalPop     { from { opacity:0;transform:scale(0.95) translateY(12px); } to { opacity:1;transform:scale(1) translateY(0); } }
        @keyframes gxCardIn     { from { opacity:0;transform:translateY(30px) scale(0.96); } to { opacity:1;transform:translateY(0) scale(1); } }
        @keyframes gxShimmer    { 0%,100% { transform:translateX(-120%); } 50% { transform:translateX(120%); } }
        @keyframes gxFadeUp     { from { opacity:0;transform:translateY(14px); } to { opacity:1;transform:translateY(0); } }
        @keyframes gxBlobDrift  { 0% { transform:translate(0,0) scale(1); } 100% { transform:translate(30px,-40px) scale(1.1); } }
        @keyframes gxFloatShard { 0%   { transform:translateY(110vh) rotate(0deg) skewX(10deg);opacity:0; }
                                   5%  { opacity:0.8; }
                                   95% { opacity:0.6; }
                                   100%{ transform:translateY(-20vh) rotate(360deg) skewX(-10deg);opacity:0; } }
        @keyframes gxBtnRipple  { to { transform:scale(4);opacity:0; } }

        .gx-font-jost         { font-family:'Jost',sans-serif; }
        .gx-font-cormorant    { font-family:'Cormorant Garamond',serif; }

        .gx-bg-page           { background:var(--gx-bg-gradient); }
        .gx-card-bg           { background:var(--gx-card-bg); }
        .gx-card-border       { border:1px solid var(--gx-card-border); }
        .gx-card-shadow       { box-shadow:var(--gx-card-shadow); }
        .gx-card-in           { animation:gxCardIn 0.9s cubic-bezier(0.16,1,0.3,1) both; }

        .gx-shimmer-layer     { background:var(--gx-shimmer);animation:gxShimmer 4s ease-in-out infinite; }

        .gx-input {
          background:var(--gx-input-bg);
          border:1px solid var(--gx-input-border);
          border-bottom:1px solid var(--gx-input-border-b);
          box-shadow:var(--gx-input-shadow);
          color:var(--gx-ink-soft);
          backdrop-filter:blur(10px);
          -webkit-backdrop-filter:blur(10px);
          transition:all 0.3s ease;
          outline:none;
          display:block;
          width:100%;
        }
        .gx-input::placeholder { color:#8b7ab8; }
        .gx-input:focus {
          background:var(--gx-input-bg-focus);
          border-color:var(--gx-input-border-focus);
          box-shadow:var(--gx-input-shadow-focus);
          transform:translateY(-1px);
        }

        .gx-underline {
          position:absolute;bottom:0;left:0;
          height:2px;width:100%;
          border-radius:0 0 10px 10px;
          transition:width 0.45s cubic-bezier(0.4,0,0.2,1),left 0.45s cubic-bezier(0.4,0,0.2,1);
          background:var(--gx-underline-grad);
          pointer-events:none;
        }
        .gx-input:focus ~ .gx-underline { width:0;left:50%; }

        .gx-btn-signin {
          background:var(--gx-btn-grad);
          box-shadow:var(--gx-btn-shadow);
          transition:transform 0.2s ease,box-shadow 0.2s ease;
        }
        .gx-btn-signin:not(:disabled):hover {
          transform:translateY(-2px);
          box-shadow:var(--gx-btn-shadow-hv);
        }
        .gx-btn-signin:disabled { opacity:0.75;cursor:default; }

        .gx-social-btn {
          background:var(--gx-social-bg);
          border:1.5px solid var(--gx-social-border);
          box-shadow:var(--gx-social-shadow);
          transition:all 0.25s ease;
        }
        .gx-social-btn:hover {
          background:var(--gx-social-bg-hv);
          border-color:var(--gx-social-border-hv);
          transform:translateY(-1px);
          box-shadow:var(--gx-social-shadow-hv);
        }
        .gx-social-btn:active { transform:scale(0.97); }

        .gx-shard {
          position:absolute;
          background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(14,165,233,0.08));
          backdrop-filter:blur(6px);
          border:1px solid rgba(124,58,237,0.15);
          border-radius:2px;
          animation:gxFloatShard linear infinite;
          transform-origin:center;
        }
        .gx-btn-ripple {
          position:absolute;border-radius:50%;
          background:rgba(255,255,255,0.25);transform:scale(0);
          animation:gxBtnRipple 0.6s linear;pointer-events:none;
        }
        #rippleCanvas { position:fixed;inset:0;pointer-events:none;z-index:10; }

        .gx-fade-up-1 { animation:gxFadeUp 0.7s 0.10s both; }
        .gx-fade-up-2 { animation:gxFadeUp 0.7s 0.18s both; }
        .gx-fade-up-3 { animation:gxFadeUp 0.7s 0.26s both; }
        .gx-fade-up-4 { animation:gxFadeUp 0.7s 0.30s both; }
        .gx-fade-up-5 { animation:gxFadeUp 0.7s 0.34s both; }
        .gx-fade-up-6 { animation:gxFadeUp 0.7s 0.40s both; }
        .gx-fade-up-7 { animation:gxFadeUp 0.7s 0.45s both; }
        .gx-fade-up-8 { animation:gxFadeUp 0.7s 0.50s both; }
        .gx-fade-up-9 { animation:gxFadeUp 0.7s 0.56s both; }

        @media (max-width:480px) {
          input[type="text"],input[type="password"],input[type="email"] { font-size:16px !important; }
        }
        @media (hover:none) and (pointer:coarse) {
          [style*="preserve-3d"] { transform:none !important; }
        }
      `}</style>

      {/* ── Background ─────────────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden gx-bg-page">
        {[
          { sz:"clamp(150px,42vw,600px)", c:"rgba(124,58,237,0.25)", pos:{ top:"-15%",  left:"-20%"  }, dur:"12s" },
          { sz:"clamp(120px,34vw,500px)", c:"rgba(14,165,233,0.2)",  pos:{ bottom:"-15%",right:"-15%"}, dur:"15s" },
          { sz:"clamp(100px,27vw,400px)", c:"rgba(99,102,241,0.2)",  pos:{ top:"35%",   left:"55%"   }, dur:"10s" },
          { sz:"clamp(80px,21vw,300px)",  c:"rgba(14,165,233,0.15)", pos:{ top:"10%",   right:"10%"  }, dur:"18s" },
        ].map((b, i) => (
          <div key={i}
            className="absolute rounded-full opacity-55"
            style={{
              width:b.sz, height:b.sz,
              background:`radial-gradient(circle,${b.c},transparent)`,
              filter:"blur(80px)",
              ...b.pos,
              animation:`gxBlobDrift ${b.dur} ease-in-out infinite alternate`,
            }}
          />
        ))}
        <div className="absolute inset-0" style={{
          backgroundImage:`
            linear-gradient(rgba(124,58,237,0.06) 1px,transparent 1px),
            linear-gradient(90deg,rgba(14,165,233,0.05) 1px,transparent 1px)`,
          backgroundSize:"60px 60px",
        }} />
        <div id="shardContainer" ref={shardContainerRef} className="absolute inset-0" />
      </div>

      <RippleCanvas />

      {/* ── Scroll + centering wrapper ─────────────────────── */}
      <div className="fixed inset-0 z-100 overflow-y-auto overflow-x-hidden"
           style={{ WebkitOverflowScrolling:"touch" as any }}>
        <div
          className="flex min-h-full items-center justify-center"
          style={{
            padding: isMobile
              ? `24px ${Math.round(tok.cardPadX * 0.45)}px 40px`
              : `${Math.round(tok.cardPadY * 0.55)}px 20px`,
            perspective: 1200,
          }}
        >
          <div
            ref={cardWrapperRef}
            className="w-full shrink-0"
            style={{
              maxWidth: tok.cardMaxW,
              transformStyle:"preserve-3d",
              transition:"transform 0.15s ease",
            }}
          >
            {/* ══ CARD ═════════════════════════════════════ */}
            <div
              id="loginCard"
              className="relative overflow-hidden w-full gx-card-bg gx-card-border gx-card-shadow gx-card-in"
              style={{
                padding:      `${tok.cardPadY}px ${tok.cardPadX}px`,
                borderRadius: tok.radius,
                backdropFilter:"blur(32px) saturate(150%)",
                WebkitBackdropFilter:"blur(32px) saturate(150%)",
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                   style={{ background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.9),rgba(124,58,237,0.3),rgba(14,165,233,0.3),transparent)" }} />
              <div className="absolute inset-0 pointer-events-none"
                   style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.5) 0%,transparent 50%)" }} />
              <div className="absolute inset-0 pointer-events-none gx-shimmer-layer" />

              {/* ── Logo row ─────────────────────────────── */}
              {!isVeryShort && (
                <div
                  className="flex items-center gap-3 overflow-hidden gx-fade-up-1"
                  style={{ height:tok.logoRowH, marginBottom:tok.logoRowMb }}
                >
                  <img
                    src="/img_assets/genieX_branding.png"
                    alt="GenieX Logo"
                    className="object-contain block shrink-0"
                    style={{
                      width:tok.logoW, height:tok.logoH,
                      marginTop:-tok.logoNudge, marginBottom:-tok.logoNudge,
                    }}
                  />
                  <div className="w-px h-7 shrink-0 mx-1"
                       style={{ background:"linear-gradient(to bottom,transparent,rgba(139,92,246,0.5),transparent)" }} />
                  <span
                    className="gx-font-jost font-medium tracking-[0.15em] uppercase"
                    style={{ fontSize:Math.max(11,tok.lbl), color:"var(--gx-violet-deep)" }}
                  >
                    Login
                  </span>
                </div>
              )}

              {/* ── Heading ──────────────────────────────── */}
              <div
                className="gx-fade-up-2"
                style={{ marginTop: isVeryShort ? 0 : tok.headingMt, marginBottom: tok.headingMb }}
              >
                <h1
                  className="gx-font-cormorant font-light leading-none m-0 mb-1.5"
                  style={{ fontSize:tok.h1, color:"var(--gx-ink)" }}
                >
                  Welcome{" "}
                  <em className="italic font-light" style={{ color:"var(--gx-sky)" }}>Back.</em>
                </h1>
                <p
                  className="m-0 font-normal tracking-wide gx-font-jost"
                  style={{
                    fontSize: tok.sub,
                    marginTop: 6,
                    marginBottom: Math.round(tok.headingMb * 0.5),
                    color:"var(--gx-violet-deep)",
                  }}
                >
                  Sign in to your workspace
                </p>
              </div>

              {/* ── Username field ───────────────────────── */}
              <div className="gx-fade-up-3">
                <label
                  className="block font-semibold tracking-[0.12em] uppercase gx-font-jost"
                  style={{ fontSize:tok.lbl, color:"var(--gx-violet-deep)", marginBottom:5 }}
                >
                  Username/Email
                </label>
                <div className="relative" style={{ marginBottom:tok.fieldMb }}>
                  <input
                    type="text"
                    placeholder="Enter your username or email here...."
                    autoComplete="username"
                    id="usernameInput"
                    ref={usernameInputRef}
                    className="gx-input gx-font-jost font-light"
                    style={{ ...inputBase, borderRadius:10 }}
                  />
                  <div className="gx-underline" id="usernameLine" />
                </div>
              </div>

              {/* ── Password field ───────────────────────── */}
              <div className="gx-fade-up-4">
                <label
                  className="block font-semibold tracking-[0.12em] uppercase gx-font-jost"
                  style={{ fontSize:tok.lbl, color:"var(--gx-violet-deep)", marginBottom:5 }}
                >
                  Password
                </label>
                <div className="relative" style={{ marginBottom:Math.round(tok.fieldMb * 0.6) }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password here...."
                    id="passwordInput"
                    ref={passInputRef}
                    className="gx-input gx-font-jost font-light"
                    style={{ ...inputBase, paddingRight: tok.inputPx + 30, borderRadius:10 }}
                  />
                  <div className="gx-underline" id="passwordLine" />
                  <button
                    id="eyeBtn"
                    type="button"
                    className="absolute top-1/2 -translate-y-1/2 flex items-center p-1 border-none bg-transparent cursor-pointer transition-opacity duration-200"
                    style={{
                      right: tok.inputPx - 2,
                      color: showPassword ? "var(--gx-lavender)" : "var(--gx-violet-deep)",
                      opacity: showPassword ? 1 : 0.6,
                    }}
                    onClick={() => setShowPassword((p) => !p)}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* ── Options row ──────────────────────────── */}
              <div
                className={`flex items-center justify-between gx-fade-up-5 ${tier === "xs" ? "flex-wrap gap-2" : ""}`}
                style={{ marginTop:tok.optionsMt }}
              >
                <label
                  htmlFor="stayCheck"
                  className="flex items-center gap-2 cursor-pointer select-none gx-font-jost font-normal"
                  style={{ fontSize: tok.sub - 1, color:"var(--gx-violet-deep)" }}
                >
                  <input type="checkbox" className="hidden" id="stayCheck"
                         checked={stayChecked} onChange={() => setStayChecked(!stayChecked)} />
                  <div
                    className="relative shrink-0 w-4 h-4 rounded backdrop-blur-sm transition-all duration-200"
                    style={{
                      border:"1px solid rgba(124,58,237,0.4)",
                      background: stayChecked
                        ? "linear-gradient(135deg,#6d28d9,#0284c7)"
                        : "rgba(255,255,255,0.8)",
                    }}
                  >
                    {stayChecked && (
                      <span className="absolute block"
                            style={{ top:2, left:5, width:5, height:9, border:"1.5px solid white", borderTop:"none", borderLeft:"none", transform:"rotate(45deg)" }} />
                    )}
                  </div>
                  Remember me
                </label>

                {/* ── FIX: Forgot password navigates to /pages/Forgot_Password ── */}
                <button
                  type="button"
                  onClick={() => router.push("/pages/Forgot_Password")}
                  className="relative border-none bg-transparent cursor-pointer gx-font-jost font-medium tracking-wide transition-opacity duration-200 group p-0"
                  style={{ fontSize:tok.sub - 1, color:"var(--gx-violet-dark)" }}
                >
                  Forgot password?
                  <span
                    className="absolute -bottom-px left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"
                    style={{ background:"linear-gradient(90deg,#0284c7,#6d28d9)" }}
                  />
                </button>
              </div>

              {/* ── Sign in button ───────────────────────── */}
              <button
                ref={signInBtnRef}
                id="signInBtn"
                onClick={handleSignIn}
                disabled={isLoading}
                className="block w-full relative overflow-hidden border-none cursor-pointer gx-btn-signin gx-font-jost font-medium tracking-[0.2em] uppercase text-white rounded-xl gx-fade-up-6"
                style={{
                  marginTop:   tok.signinMt,
                  marginBottom:tok.signinMb,
                  padding:     `${tok.btnPy}px`,
                  fontSize:    tok.btnFs,
                }}
              >
                <span className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.12),transparent)" }} />
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                         style={{ animation:"spin 0.75s linear infinite" }}>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Signing in…
                  </span>
                ) : "Sign In"}
              </button>

              {/* ── Security tag ─────────────────────────── */}
              {!isVeryShort && (
                <div
                  className="flex items-center justify-center gap-1.5 gx-font-jost font-medium tracking-[0.14em] uppercase mb-0.5 gx-fade-up-7"
                  style={{ fontSize:Math.max(8,tok.lbl - 2), color:"var(--gx-purple-muted)" }}
                >
                  <span className="inline-block w-1 h-1 rounded-full" style={{ background:"var(--gx-violet-dark)" }} />
                  AES-256 Encrypted
                  <span className="inline-block w-1 h-1 rounded-full" style={{ background:"var(--gx-violet-dark)" }} />
                  Secure Session
                  <span className="inline-block w-1 h-1 rounded-full" style={{ background:"var(--gx-violet-dark)" }} />
                </div>
              )}

              {/* ── Divider ──────────────────────────────── */}
              <div
                className="flex items-center gap-3.5 gx-fade-up-8"
                style={{ marginTop:tok.dividerMy, marginBottom:tok.dividerMy }}
              >
                <div className="flex-1 h-px" style={{ background:"var(--gx-divider)" }} />
                <span
                  className="gx-font-jost font-medium tracking-[0.08em]"
                  style={{ fontSize:Math.max(10,tok.lbl - 1), color:"var(--gx-purple-muted)" }}
                >
                  or continue with
                </span>
                <div className="flex-1 h-px" style={{ background:"var(--gx-divider)" }} />
              </div>

              {/* ── Social buttons ───────────────────────── */}
              <div className="grid grid-cols-2 gap-3 gx-fade-up-9">
                <button
                  className="gx-social-btn gx-font-jost font-medium flex items-center justify-center gap-2 overflow-hidden relative cursor-pointer whitespace-nowrap rounded-[10px]"
                  style={{ padding:`${tok.socialPy}px 12px`, fontSize:Math.max(11,tok.sub - 1), color:"var(--gx-ink)", backdropFilter:"blur(10px)" }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
                <button
                  className="gx-social-btn gx-font-jost font-medium flex items-center justify-center gap-2 overflow-hidden relative cursor-pointer whitespace-nowrap rounded-[10px]"
                  style={{ padding:`${tok.socialPy}px 12px`, fontSize:Math.max(11,tok.sub - 1), color:"var(--gx-ink)", backdropFilter:"blur(10px)" }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="shrink-0">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
              </div>

            </div>{/* /card */}
          </div>{/* /tilt wrapper */}
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────── */}
      <div
        className="fixed left-1/2 z-9999 gx-font-jost font-medium text-center"
        style={{
          bottom: isMobile ? 20 : 32,
          transform: `translateX(-50%) translateY(${toastVisible ? 0 : 16}px)`,
          opacity: toastVisible ? 1 : 0,
          pointerEvents: toastVisible ? "auto" : "none",
          transition:"opacity 0.25s ease,transform 0.25s ease",
          background:"rgba(30,20,50,0.92)",
          backdropFilter:"blur(12px)",
          border:"1px solid rgba(124,58,237,0.35)",
          borderRadius:14,
          padding: isMobile ? "10px 16px" : "11px 20px",
          color:"#e9d5ff",
          fontSize: isMobile ? 12 : 13,
          boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
          maxWidth:"calc(100vw - 32px)",
          wordBreak:"break-word",
        }}
      >
        <span className="mr-1.5 text-base">⚠️</span>
        {toastMsg.replace("⚠️  ", "")}
      </div>

      {/* ── Error Modal ────────────────────────────────────── */}
      {errorVisible && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeError(); }}
          className="fixed inset-0 flex items-center justify-center p-4 z-10000"
          style={{
            background:"rgba(5,2,15,0.7)",
            backdropFilter:"blur(8px)",
            animation:"fadeIn 0.2s ease",
          }}
        >
          <div
            className="relative w-full max-w-sm"
            style={{
              background:"rgba(18,10,38,0.97)",
              border:"1px solid rgba(124,58,237,0.25)",
              borderRadius:20,
              padding:"28px 24px 24px",
              boxShadow:"0 20px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(124,58,237,0.1)",
              animation:"modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <button
              onClick={closeError}
              className="absolute top-3.5 right-3.5 flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer transition-all duration-150"
              style={{ background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.15)", color:"rgba(196,168,255,0.5)", fontSize:12 }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background="rgba(124,58,237,0.18)"; el.style.color="#c4a8ff"; el.style.borderColor="rgba(124,58,237,0.4)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background="rgba(124,58,237,0.08)"; el.style.color="rgba(196,168,255,0.5)"; el.style.borderColor="rgba(124,58,237,0.15)"; }}
            >✕</button>

            <div className="flex items-center justify-center mb-4 w-12 h-12 rounded-2xl"
                 style={{ background:"rgba(124,58,237,0.12)", border:"1px solid rgba(124,58,237,0.25)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            </div>

            <div className="text-[15px] font-bold tracking-[-0.01em] mb-1.5" style={{ color:"#ede9fe" }}>
              Login Failed
            </div>
            <p className="text-[13px] leading-relaxed m-0 mb-5.5" style={{ color:"rgba(196,168,255,0.55)" }}>
              {errorMsg}
            </p>

            <button
              onClick={closeError}
              className="block w-full cursor-pointer rounded-xl gx-font-jost font-semibold text-[13px] tracking-[0.01em] transition-all duration-150"
              style={{ padding:"11px 0", border:"1px solid rgba(124,58,237,0.35)", background:"linear-gradient(135deg,rgba(124,58,237,0.2) 0%,rgba(91,33,182,0.25) 100%)", color:"#c4a8ff" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background="linear-gradient(135deg,rgba(124,58,237,0.35) 0%,rgba(91,33,182,0.4) 100%)"; el.style.borderColor="rgba(124,58,237,0.55)"; el.style.color="#ddd6fe"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.background="linear-gradient(135deg,rgba(124,58,237,0.2) 0%,rgba(91,33,182,0.25) 100%)"; el.style.borderColor="rgba(124,58,237,0.35)"; el.style.color="#c4a8ff"; }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}