/* ==============================================================
   LOGIN USER PAGE  ·  logUser.tsx
   ============================================================== */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  initShards,
  initSignInRipple,
  initSocialRipple,
  initSwipeGestures,
} from "./loginUtils";
import RippleCanvas from "../../Effects/RippleCanvas";
import clearAuthCookies from "../../Utils/clearAuthCookies";

/* ── Laravel Fortify API ─────────────────────────────────── */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost//";

let _csrfPromise: Promise<void> | null = null;

async function csrfCookie(): Promise<void> {
  if (_csrfPromise) {
    console.log("[Auth][CSRF] Reusing in-flight/cached CSRF fetch");
    return _csrfPromise;
  }
  console.log("[Auth][CSRF] → fetching", `${API_BASE}/sanctum/csrf-cookie`);
  const t0 = performance.now();
  _csrfPromise = fetch(`${API_BASE}/sanctum/csrf-cookie`, { credentials: "include" })
    .then(() => {
      console.log(`[Auth][CSRF] ✅ done in ${(performance.now() - t0).toFixed(0)} ms`);
    })
    .catch((err) => {
      console.error("[Auth][CSRF] ❌ FAILED — is Laravel running?", err);
      _csrfPromise = null;
      throw err;
    });
  return _csrfPromise;
}

if (typeof window !== "undefined") {
  // Hit Laravel's logout endpoint first so the server expires the session
  // cookie from its side — JS alone cannot delete cookies set on a
  // different port (Laravel on :80, Next.js on :3000).
  console.log("[Auth][CSRF] Pre-warming on page load…");
  fetch(`${API_BASE}/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" },
  })
    .catch(() => {}) // ignore — session may already be dead
    .finally(() => {
      clearAuthCookies({ resetCsrf: () => { _csrfPromise = null; } });
      csrfCookie().catch(() => {});
    });
}

function getXsrfToken(): string {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : "";
  if (token) {
    console.log("[Auth][CSRF] XSRF token present:", token.substring(0, 20) + "…");
  } else {
    console.warn("[Auth][CSRF] ⚠️  XSRF-TOKEN cookie missing — request will likely be rejected by Laravel");
  }
  return token;
}

async function fortifyLogin(email: string, password: string, remember: boolean) {
  const t0 = performance.now();
  console.group("[Auth] fortifyLogin");
  console.log("→ email:", email);
  console.log("→ endpoint:", `${API_BASE}/login`);

  const tCsrf0 = performance.now();
  console.log(`[Auth] Awaiting CSRF cookie (pre-warmed = ${_csrfPromise ? "YES ✅" : "NO ❌"})`);
  await csrfCookie();
  console.log(`[Auth] CSRF ready in ${(performance.now() - tCsrf0).toFixed(0)} ms`);

  const xsrfToken = getXsrfToken();

  let res: Response;
  const tLogin0 = performance.now();
  console.log("[Auth] → POST /login …");
  try {
    res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-XSRF-TOKEN": xsrfToken,
      },
      body: JSON.stringify({ email, password, remember }),
    });
  } catch (err) {
    console.error(`[Auth] ❌ POST /login FAILED after ${(performance.now() - tLogin0).toFixed(0)} ms — CORS or network issue:`, err);
    clearAuthCookies({ resetCsrf: () => { _csrfPromise = null; } });
    console.groupEnd();
    throw err;
  }

  console.log(`[Auth] POST /login responded ${res.status} in ${(performance.now() - tLogin0).toFixed(0)} ms`);

  if (res.status === 204 || res.status === 200) {
    const data = await res.json().catch(() => ({}));
    console.log(`[Auth] ✅ Login success — total so far: ${(performance.now() - t0).toFixed(0)} ms`, data);
    console.groupEnd();
    if (data?.two_factor === true) return { status: "2fa" };
    return { status: "ok" };
  }
  if (res.status === 423) {
    console.log("[Auth] 2FA required");
    console.groupEnd();
    return { status: "2fa" };
  }

  const data = await res.json().catch(() => ({}));
  console.error(`[Auth] ❌ Login failed (${res.status}) after ${(performance.now() - t0).toFixed(0)} ms`, data);
  clearAuthCookies({ resetCsrf: () => { _csrfPromise = null; } });
  console.groupEnd();
  const message = data?.message || data?.errors?.email?.[0] || "Invalid credentials.";
  throw new Error(message);
}

// ── FIXED: return the full user object, not just role+industry ────────────────
async function getAuthUser(): Promise<AuthUser> {
  const t0 = performance.now();
  console.log("[Auth] → GET /api/user …");
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/user`, {
      credentials: "include",
      headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" },
    });
  } catch (err) {
    console.error(`[Auth] ❌ GET /api/user FAILED after ${(performance.now() - t0).toFixed(0)} ms`, err);
    clearAuthCookies({ resetCsrf: () => { _csrfPromise = null; } });
    throw err;
  }
  console.log(`[Auth] GET /api/user responded ${res.status} in ${(performance.now() - t0).toFixed(0)} ms`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("[Auth] ❌ /api/user rejected:", body);
    clearAuthCookies({ resetCsrf: () => { _csrfPromise = null; } });
    throw new Error("Could not fetch user.");
  }
  const user: AuthUser = await res.json();
  console.log(`[Auth] ✅ user fetched in ${(performance.now() - t0).toFixed(0)} ms:`, user);
  return user;
}

export type UserRole     = "admin" | "user";
export type UserIndustry = "fnb" | "retail" | "warehouse" | null;

// ── FIXED: export the full AuthUser type so page.tsx can use it ───────────────
export interface AuthUser {
  id:           number;
  name:         string;
  email:        string;
  role:         UserRole;
  industry:     UserIndustry;
  company_id:   number | null;
  company_name: string | null;
  position?:    string | null;
  phone?:       string | null;
  status?:      string | null;
}

interface LoginAdminProps {
  // ── FIXED: callback now receives the full AuthUser ────────────────────────
  onLoginSuccess: (role: UserRole, industry: UserIndustry, user: AuthUser) => void;
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
  const router = useRouter();

  const cardWrapperRef    = useRef<HTMLDivElement>(null);
  const shardContainerRef = useRef<HTMLDivElement>(null);
  const passInputRef      = useRef<HTMLInputElement>(null);
  const signInBtnRef      = useRef<HTMLButtonElement>(null);
  const usernameInputRef  = useRef<HTMLInputElement>(null);

  const [tier, setTier] = useState<Tier>("xl");
  const [vh,   setVh]   = useState(800);

  const [toastMsg,        setToastMsg]        = useState("");
  const [toastVisible,    setToastVisible]    = useState(false);
  const [errorMsg,        setErrorMsg]        = useState("");
  const [errorVisible,    setErrorVisible]    = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [showPassword,    setShowPassword]    = useState(false);
  const [stayChecked,     setStayChecked]     = useState(false);
  const [inputFocused,    setInputFocused]    = useState<"username" | "password" | null>(null);
  const [signInHover,     setSignInHover]     = useState(false);
  const [forgotHover,     setForgotHover]     = useState(false);
  const [googleHover,     setGoogleHover]     = useState(false);
  const [githubHover,     setGithubHover]     = useState(false);
  const [closeErrHover,   setCloseErrHover]   = useState(false);
  const [tryAgainHover,   setTryAgainHover]   = useState(false);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measure = useCallback(() => {
    setVh(window.innerHeight);
    setTier(getTier(window.innerWidth));
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

  const handleSignIn = async () => {
    const email    = usernameInputRef.current?.value.trim() ?? "";
    const password = passInputRef.current?.value ?? "";

    if (!email && !password) { showToast("⚠️  Username and password are required."); return; }
    if (!email)    { showToast("⚠️  Please enter your username / email."); return; }
    if (!password) { showToast("⚠️  Please enter your password."); return; }

    setIsLoading(true);
    const tTotal = performance.now();
    console.group("[Auth] handleSignIn — full flow");

    try {
      const result = await fortifyLogin(email, password, stayChecked);

      if (result.status === "2fa") {
        showToast("⚠️  Two-factor authentication required.");
        setIsLoading(false);
        console.groupEnd();
        return;
      }

      const user = await getAuthUser();
      console.log(`[Auth] ✅ Full login flow done in ${(performance.now() - tTotal).toFixed(0)} ms`);
      console.groupEnd();

      // ── FIXED: pass the full user object as the third argument ────────────
      onLoginSuccess(user.role, user.industry ?? null, user);

    } catch (err: any) {
      console.error(`[Auth] ❌ Flow failed after ${(performance.now() - tTotal).toFixed(0)} ms`, err);
      console.groupEnd();
      showError(
        err?.message ||
        "The account you entered doesn't exist or the password is incorrect. Please check your credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    if (shardContainerRef.current) initShards(shardContainerRef.current);
    if (signInBtnRef.current) cleanups.push(initSignInRipple(signInBtnRef.current));
    initSocialRipple();
    cleanups.push(initSwipeGestures());
    return () => cleanups.forEach((fn) => fn());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minimalCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Jost:wght@200;300;400;500&display=swap');

    @keyframes spin        { to { transform:rotate(360deg); } }
    @keyframes fadeIn      { from{opacity:0}to{opacity:1} }
    @keyframes modalPop    { from{opacity:0;transform:scale(0.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes gxCardIn    { from{opacity:0;transform:translateY(30px) scale(0.96)}to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes gxShimmer   { 0%,100%{transform:translateX(-120%)}50%{transform:translateX(120%)} }
    @keyframes gxFadeUp    { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }
    @keyframes gxBlobDrift { 0%{transform:translate(0,0) scale(1)}100%{transform:translate(30px,-40px) scale(1.1)} }
    @keyframes gxFloatShard{
      0%  {transform:translateY(110vh) rotate(0deg) skewX(10deg);opacity:0}
      5%  {opacity:0.8} 95%{opacity:0.6}
      100%{transform:translateY(-20vh) rotate(360deg) skewX(-10deg);opacity:0}
    }
    @keyframes gxBtnRipple { to{transform:scale(4);opacity:0} }

    .gx-card-in     { animation:gxCardIn  0.9s cubic-bezier(0.16,1,0.3,1) both; }
    .gx-shimmer-lyr { animation:gxShimmer 4s  ease-in-out infinite; }

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

    .gx-fade-up-1{animation:gxFadeUp 0.7s 0.10s both}
    .gx-fade-up-2{animation:gxFadeUp 0.7s 0.18s both}
    .gx-fade-up-3{animation:gxFadeUp 0.7s 0.26s both}
    .gx-fade-up-4{animation:gxFadeUp 0.7s 0.30s both}
    .gx-fade-up-5{animation:gxFadeUp 0.7s 0.34s both}
    .gx-fade-up-6{animation:gxFadeUp 0.7s 0.40s both}
    .gx-fade-up-7{animation:gxFadeUp 0.7s 0.45s both}
    .gx-fade-up-8{animation:gxFadeUp 0.7s 0.50s both}
    .gx-fade-up-9{animation:gxFadeUp 0.7s 0.56s both}

    input::placeholder { color:#8b7ab8; }
    @media (max-width:480px) {
      input[type="text"],input[type="password"],input[type="email"]{ font-size:16px !important; }
    }
  `;

  return (
    <>
      <style>{minimalCSS}</style>

      <div className="fixed inset-0 overflow-hidden"
           style={{ background: "linear-gradient(135deg,#f0f4ff 0%,#e8eeff 35%,#dde8ff 65%,#f0f4ff 100%)" }}>

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
              animation:`gxBlobDrift ${b.dur} ease-in-out infinite alternate`,
              ...b.pos,
            }}
          />
        ))}

        <div className="absolute inset-0"
             style={{
               backgroundImage:`linear-gradient(rgba(124,58,237,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.05) 1px,transparent 1px)`,
               backgroundSize:"60px 60px",
             }} />

        <div id="shardContainer" ref={shardContainerRef} className="absolute inset-0" />
      </div>

      <RippleCanvas />

      <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden"
           style={{ WebkitOverflowScrolling: "touch" as any }}>
        <div
          className="flex min-h-full items-center justify-center"
          style={{
            padding: isMobile
              ? `24px ${Math.round(tok.cardPadX * 0.45)}px 40px`
              : `${Math.round(tok.cardPadY * 0.55)}px 20px`,
          }}
        >
          <div
            ref={cardWrapperRef}
            className="w-full shrink-0"
            style={{ maxWidth: tok.cardMaxW }}
          >
            <div
              id="loginCard"
              className="gx-card-in relative overflow-hidden w-full backdrop-blur-2xl"
              style={{
                background:           "linear-gradient(145deg,rgba(255,255,255,0.92) 0%,rgba(237,233,254,0.85) 50%,rgba(224,242,254,0.8) 100%)",
                border:               "1px solid rgba(124,58,237,0.15)",
                boxShadow:            "0 0 0 1px rgba(124,58,237,0.1),0 20px 60px rgba(124,58,237,0.15),0 4px 20px rgba(14,165,233,0.12),0 1px 0 rgba(255,255,255,0.9) inset,0 -1px 0 rgba(124,58,237,0.08) inset",
                borderRadius:         tok.radius,
                padding:              `${tok.cardPadY}px ${tok.cardPadX}px`,
                backdropFilter:       "blur(32px) saturate(150%)",
                WebkitBackdropFilter: "blur(32px) saturate(150%)",
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                   style={{ background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.9),rgba(124,58,237,0.3),rgba(14,165,233,0.3),transparent)" }} />
              <div className="absolute inset-0 pointer-events-none"
                   style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.5) 0%,transparent 50%)" }} />
              <div className="gx-shimmer-lyr absolute inset-0 pointer-events-none"
                   style={{ background:"linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.4) 50%,transparent 70%)" }} />

              {!isVeryShort && (
                <div
                  className="gx-fade-up-1 flex items-center gap-3 overflow-hidden"
                  style={{ height: tok.logoRowH, marginBottom: tok.logoRowMb }}
                >
                  <img
                    src="/img_assets/genieX_branding.png"
                    alt="GenieX Logo"
                    className="object-contain block shrink-0"
                    style={{
                      width:        tok.logoW,
                      height:       tok.logoH,
                      marginTop:    -tok.logoNudge,
                      marginBottom: -tok.logoNudge,
                    }}
                  />
                  <div className="w-px h-7 shrink-0 mx-1"
                       style={{ background:"linear-gradient(to bottom,transparent,rgba(139,92,246,0.5),transparent)" }} />
                  <span
                    className="font-medium tracking-[0.15em] uppercase"
                    style={{ fontFamily:"'Jost',sans-serif", fontSize: Math.max(11, tok.lbl), color:"#3b2270" }}
                  >
                    Login
                  </span>
                </div>
              )}

              <div
                className="gx-fade-up-2"
                style={{ marginTop: isVeryShort ? 0 : tok.headingMt, marginBottom: tok.headingMb }}
              >
                <h1
                  className="font-light leading-none m-0 mb-1.5"
                  style={{ fontFamily:"'Cormorant Garamond',serif", fontSize: tok.h1, color:"#0f0730" }}
                >
                  Welcome{" "}
                  <em className="italic font-light" style={{ color:"#0284c7" }}>Back.</em>
                </h1>
                <p
                  className="m-0 font-normal tracking-wide"
                  style={{
                    fontFamily:"'Jost',sans-serif",
                    fontSize:     tok.sub,
                    marginTop:    6,
                    marginBottom: Math.round(tok.headingMb * 0.5),
                    color:        "#3b2270",
                  }}
                >
                  Sign in to your workspace
                </p>
              </div>

              <form onSubmit={e => { e.preventDefault(); handleSignIn(); }}>

              <div className="gx-fade-up-3">
                <label
                  className="block font-semibold tracking-[0.12em] uppercase"
                  style={{ fontFamily:"'Jost',sans-serif", fontSize: tok.lbl, color:"#3b2270", marginBottom: 5 }}
                >
                  Username/Email
                </label>
                <div className="relative" style={{ marginBottom: tok.fieldMb }}>
                  <input
                    type="text"
                    placeholder="Enter your username or email here...."
                    autoComplete="username"
                    id="usernameInput"
                    ref={usernameInputRef}
                    className="block w-full font-light outline-none transition-all duration-300"
                    style={{
                      fontFamily:           "'Jost',sans-serif",
                      paddingTop:           tok.inputPy,
                      paddingBottom:        tok.inputPy,
                      paddingLeft:          tok.inputPx,
                      paddingRight:         tok.inputPx,
                      fontSize:             tok.inputFs,
                      borderRadius:         10,
                      background:           inputFocused === "username" ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.8)",
                      border:               inputFocused === "username" ? "1px solid rgba(109,40,217,0.6)" : "1px solid rgba(124,58,237,0.2)",
                      borderBottom:         inputFocused === "username" ? "1px solid rgba(109,40,217,0.6)" : "1px solid rgba(124,58,237,0.4)",
                      boxShadow:            inputFocused === "username"
                                              ? "0 0 0 3px rgba(109,40,217,0.12),0 0 20px rgba(109,40,217,0.06)"
                                              : "0 1px 0 rgba(255,255,255,0.8) inset",
                      color:                "#1e1048",
                      backdropFilter:       "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      transform:            inputFocused === "username" ? "translateY(-1px)" : "none",
                    }}
                    onFocus={() => setInputFocused("username")}
                    onBlur={()  => setInputFocused(null)}
                  />
                  <div
                    className="absolute bottom-0 h-0.5 pointer-events-none transition-all duration-[450ms]"
                    style={{
                      left:         inputFocused === "username" ? "50%" : 0,
                      width:        inputFocused === "username" ? 0 : "100%",
                      borderRadius: "0 0 10px 10px",
                      background:   "linear-gradient(90deg,#6d28d9,#a78bfa,#0284c7)",
                      transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
                </div>
              </div>

              <div className="gx-fade-up-4">
                <label
                  className="block font-semibold tracking-[0.12em] uppercase"
                  style={{ fontFamily:"'Jost',sans-serif", fontSize: tok.lbl, color:"#3b2270", marginBottom: 5 }}
                >
                  Password
                </label>
                <div className="relative" style={{ marginBottom: Math.round(tok.fieldMb * 0.6) }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password here...."
                    id="passwordInput"
                    ref={passInputRef}
                    className="block w-full font-light outline-none transition-all duration-300"
                    style={{
                      fontFamily:           "'Jost',sans-serif",
                      paddingTop:           tok.inputPy,
                      paddingBottom:        tok.inputPy,
                      paddingLeft:          tok.inputPx,
                      paddingRight:         tok.inputPx + 30,
                      fontSize:             tok.inputFs,
                      borderRadius:         10,
                      background:           inputFocused === "password" ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.8)",
                      border:               inputFocused === "password" ? "1px solid rgba(109,40,217,0.6)" : "1px solid rgba(124,58,237,0.2)",
                      borderBottom:         inputFocused === "password" ? "1px solid rgba(109,40,217,0.6)" : "1px solid rgba(124,58,237,0.4)",
                      boxShadow:            inputFocused === "password"
                                              ? "0 0 0 3px rgba(109,40,217,0.12),0 0 20px rgba(109,40,217,0.06)"
                                              : "0 1px 0 rgba(255,255,255,0.8) inset",
                      color:                "#1e1048",
                      backdropFilter:       "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      transform:            inputFocused === "password" ? "translateY(-1px)" : "none",
                    }}
                    onFocus={() => setInputFocused("password")}
                    onBlur={()  => setInputFocused(null)}
                  />
                  <div
                    className="absolute bottom-0 h-0.5 pointer-events-none transition-all duration-[450ms]"
                    style={{
                      left:         inputFocused === "password" ? "50%" : 0,
                      width:        inputFocused === "password" ? 0 : "100%",
                      borderRadius: "0 0 10px 10px",
                      background:   "linear-gradient(90deg,#6d28d9,#a78bfa,#0284c7)",
                      transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
                  <button
                    id="eyeBtn"
                    type="button"
                    className="absolute top-1/2 -translate-y-1/2 flex items-center p-1 border-none bg-transparent cursor-pointer transition-opacity duration-200"
                    style={{
                      right:   tok.inputPx - 2,
                      color:   showPassword ? "#a78bfa" : "#3b2270",
                      opacity: showPassword ? 1 : 0.6,
                    }}
                    onClick={() => setShowPassword(p => !p)}
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

              <div
                className={`gx-fade-up-5 flex items-center justify-between ${tier === "xs" ? "flex-wrap gap-2" : ""}`}
                style={{ marginTop: tok.optionsMt }}
              >
                <label
                  htmlFor="stayCheck"
                  className="flex items-center gap-2 cursor-pointer select-none font-normal"
                  style={{ fontFamily:"'Jost',sans-serif", fontSize: tok.sub - 1, color:"#3b2270" }}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    id="stayCheck"
                    checked={stayChecked}
                    onChange={() => setStayChecked(v => !v)}
                  />
                  <div
                    className="relative shrink-0 w-4 h-4 rounded backdrop-blur-sm transition-all duration-200"
                    style={{
                      border:     "1px solid rgba(124,58,237,0.4)",
                      background: stayChecked
                        ? "linear-gradient(135deg,#6d28d9,#0284c7)"
                        : "rgba(255,255,255,0.8)",
                    }}
                  >
                    {stayChecked && (
                      <span
                        className="absolute block"
                        style={{
                          top:2, left:5, width:5, height:9,
                          border:"1.5px solid white",
                          borderTop:"none", borderLeft:"none",
                          transform:"rotate(45deg)",
                        }}
                      />
                    )}
                  </div>
                  Remember me
                </label>

                <button
                  type="button"
                  onClick={() => router.push("/pages/Forgot_Password")}
                  onMouseEnter={() => setForgotHover(true)}
                  onMouseLeave={() => setForgotHover(false)}
                  className="relative border-none bg-transparent cursor-pointer font-medium tracking-wide transition-opacity duration-200 p-0"
                  style={{ fontFamily:"'Jost',sans-serif", fontSize: tok.sub - 1, color:"#6d28d9" }}
                >
                  Forgot password?
                  <span
                    className="absolute -bottom-px left-0 right-0 h-px transition-transform duration-300 origin-left"
                    style={{
                      background: "linear-gradient(90deg,#0284c7,#6d28d9)",
                      transform:  forgotHover ? "scaleX(1)" : "scaleX(0)",
                    }}
                  />
                </button>
              </div>

              <button
                ref={signInBtnRef}
                id="signInBtn"
                type="submit"
                disabled={isLoading}
                onMouseEnter={() => setSignInHover(true)}
                onMouseLeave={() => setSignInHover(false)}
                className="gx-fade-up-6 block w-full relative overflow-hidden border-none cursor-pointer font-medium tracking-[0.2em] uppercase text-white rounded-xl transition-all duration-200 disabled:opacity-75 disabled:cursor-default"
                style={{
                  fontFamily:   "'Jost',sans-serif",
                  marginTop:    tok.signinMt,
                  marginBottom: tok.signinMb,
                  padding:      `${tok.btnPy}px`,
                  fontSize:     tok.btnFs,
                  background:   "linear-gradient(135deg,#7c3aed 0%,#2ec4a5 100%)",
                  boxShadow:    signInHover && !isLoading
                                  ? "0 8px 40px rgba(139,92,246,0.65),0 0 20px rgba(46,196,165,0.3),0 1px 0 rgba(255,255,255,0.15) inset"
                                  : "0 4px 24px rgba(139,92,246,0.5),0 1px 0 rgba(255,255,255,0.15) inset",
                  transform:    signInHover && !isLoading ? "translateY(-2px)" : "none",
                }}
              >
                <span
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{ background:"linear-gradient(135deg,rgba(255,255,255,0.12),transparent)" }}
                />
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
              </form>

              {!isVeryShort && (
                <div
                  className="gx-fade-up-7 flex items-center justify-center gap-1.5 font-medium tracking-[0.14em] uppercase mb-0.5"
                  style={{ fontFamily:"'Jost',sans-serif", fontSize: Math.max(8, tok.lbl - 2), color:"#6b4fa0" }}
                >
                  <span className="inline-block w-1 h-1 rounded-full bg-violet-700" />
                  AES-256 Encrypted
                  <span className="inline-block w-1 h-1 rounded-full bg-violet-700" />
                  Secure Session
                  <span className="inline-block w-1 h-1 rounded-full bg-violet-700" />
                </div>
              )}

              <div
                className="gx-fade-up-8 flex items-center gap-3.5"
                style={{ marginTop: tok.dividerMy, marginBottom: tok.dividerMy }}
              >
                <div className="flex-1 h-px"
                     style={{ background:"linear-gradient(to right,transparent,rgba(124,58,237,0.2),transparent)" }} />
                <span
                  className="font-medium tracking-[0.08em]"
                  style={{ fontFamily:"'Jost',sans-serif", fontSize: Math.max(10, tok.lbl - 1), color:"#6b4fa0" }}
                >
                  or continue with
                </span>
                <div className="flex-1 h-px"
                     style={{ background:"linear-gradient(to right,transparent,rgba(124,58,237,0.2),transparent)" }} />
              </div>

              <div className="gx-fade-up-9 grid grid-cols-2 gap-3">
                <button
                  onMouseEnter={() => setGoogleHover(true)}
                  onMouseLeave={() => setGoogleHover(false)}
                  className="flex items-center justify-center gap-2 overflow-hidden relative cursor-pointer whitespace-nowrap rounded-[10px] font-medium transition-all duration-200"
                  style={{
                    fontFamily:   "'Jost',sans-serif",
                    padding:      `${tok.socialPy}px 12px`,
                    fontSize:     Math.max(11, tok.sub - 1),
                    color:        "#0f0730",
                    backdropFilter:"blur(10px)",
                    background:   googleHover ? "rgba(237,233,254,0.95)" : "rgba(255,255,255,0.85)",
                    border:       googleHover ? "1.5px solid rgba(109,40,217,0.4)" : "1.5px solid rgba(109,40,217,0.22)",
                    boxShadow:    googleHover
                                    ? "0 4px 20px rgba(109,40,217,0.18),0 1px 0 rgba(255,255,255,0.9) inset"
                                    : "0 1px 0 rgba(255,255,255,0.9) inset,0 2px 8px rgba(109,40,217,0.06)",
                    transform:    googleHover ? "translateY(-1px)" : "none",
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>

                <button
                  onMouseEnter={() => setGithubHover(true)}
                  onMouseLeave={() => setGithubHover(false)}
                  className="flex items-center justify-center gap-2 overflow-hidden relative cursor-pointer whitespace-nowrap rounded-[10px] font-medium transition-all duration-200"
                  style={{
                    fontFamily:   "'Jost',sans-serif",
                    padding:      `${tok.socialPy}px 12px`,
                    fontSize:     Math.max(11, tok.sub - 1),
                    color:        "#0f0730",
                    backdropFilter:"blur(10px)",
                    background:   githubHover ? "rgba(237,233,254,0.95)" : "rgba(255,255,255,0.85)",
                    border:       githubHover ? "1.5px solid rgba(109,40,217,0.4)" : "1.5px solid rgba(109,40,217,0.22)",
                    boxShadow:    githubHover
                                    ? "0 4px 20px rgba(109,40,217,0.18),0 1px 0 rgba(255,255,255,0.9) inset"
                                    : "0 1px 0 rgba(255,255,255,0.9) inset,0 2px 8px rgba(109,40,217,0.06)",
                    transform:    githubHover ? "translateY(-1px)" : "none",
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" className="shrink-0">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST */}
      <div
        className="fixed left-1/2 z-[9999] font-medium text-center rounded-2xl transition-all duration-300 ease-in-out"
        style={{
          fontFamily:    "'Jost',sans-serif",
          bottom:        isMobile ? 20 : 32,
          transform:     `translateX(-50%) translateY(${toastVisible ? 0 : 16}px)`,
          opacity:       toastVisible ? 1 : 0,
          pointerEvents: toastVisible ? "auto" : "none",
          background:    "rgba(30,20,50,0.92)",
          backdropFilter:"blur(12px)",
          border:        "1px solid rgba(124,58,237,0.35)",
          padding:       isMobile ? "10px 16px" : "11px 20px",
          color:         "#e9d5ff",
          fontSize:      isMobile ? 12 : 13,
          boxShadow:     "0 8px 32px rgba(0,0,0,0.4)",
          maxWidth:      "calc(100vw - 32px)",
          wordBreak:     "break-word",
        }}
      >
        <span className="mr-1.5 text-base">⚠️</span>
        {toastMsg.replace("⚠️  ", "")}
      </div>

      {/* ERROR MODAL */}
      {errorVisible && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeError(); }}
          className="fixed inset-0 flex items-center justify-center p-4 z-[10000] backdrop-blur-sm"
          style={{ background:"rgba(5,2,15,0.7)", animation:"fadeIn 0.2s ease" }}
        >
          <div
            className="relative w-full max-w-sm rounded-[20px]"
            style={{
              background: "rgba(18,10,38,0.97)",
              border:     "1px solid rgba(124,58,237,0.25)",
              padding:    "28px 24px 24px",
              boxShadow:  "0 20px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(124,58,237,0.1)",
              animation:  "modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <button
              onClick={closeError}
              onMouseEnter={() => setCloseErrHover(true)}
              onMouseLeave={() => setCloseErrHover(false)}
              className="absolute top-3.5 right-3.5 flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer text-xs transition-all duration-150"
              style={{
                background:  closeErrHover ? "rgba(124,58,237,0.18)" : "rgba(124,58,237,0.08)",
                border:      closeErrHover ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(124,58,237,0.15)",
                color:       closeErrHover ? "#c4a8ff" : "rgba(196,168,255,0.5)",
              }}
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
            <p className="text-[13px] leading-relaxed m-0 mb-5" style={{ color:"rgba(196,168,255,0.55)" }}>
              {errorMsg}
            </p>

            <button
              onClick={closeError}
              onMouseEnter={() => setTryAgainHover(true)}
              onMouseLeave={() => setTryAgainHover(false)}
              className="block w-full cursor-pointer rounded-xl font-semibold text-[13px] tracking-[0.01em] transition-all duration-150"
              style={{
                fontFamily: "'Jost',sans-serif",
                padding:    "11px 0",
                border:     tryAgainHover ? "1px solid rgba(124,58,237,0.55)" : "1px solid rgba(124,58,237,0.35)",
                background: tryAgainHover
                              ? "linear-gradient(135deg,rgba(124,58,237,0.35) 0%,rgba(91,33,182,0.4) 100%)"
                              : "linear-gradient(135deg,rgba(124,58,237,0.2) 0%,rgba(91,33,182,0.25) 100%)",
                color:      tryAgainHover ? "#ddd6fe" : "#c4a8ff",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
