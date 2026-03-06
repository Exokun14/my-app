// ============================================================
//  Forgotpslogic.ts  –  All interactive logic for the Forgot Password page
// ============================================================



import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Ripple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useForgotPassword() {

  // ── State ────────────────────────────────────────────────────────────────────
  const [email,        setEmail       ] = useState<string>('');
  const [emailError,   setEmailError  ] = useState<boolean>(false);
  const [modalOpen,    setModalOpen   ] = useState<boolean>(false);
  const [displayEmail, setDisplayEmail] = useState<string>('');
  const [otpValues,    setOtpValues   ] = useState<string[]>(Array(6).fill(''));
  const [otpErrors,    setOtpErrors   ] = useState<boolean[]>(Array(6).fill(false));
  const [verified,     setVerified    ] = useState<boolean>(false);
  const [timer,        setTimer       ] = useState<number>(0);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const canvasRef         = useRef<HTMLCanvasElement>(null);
  const cursorRef         = useRef<HTMLDivElement>(null);
  const trailRef          = useRef<HTMLDivElement>(null);
  const cardWrapperRef    = useRef<HTMLDivElement>(null);
  const shardContainerRef = useRef<HTMLDivElement>(null);
  const otpRefs           = useRef<(HTMLInputElement | null)[]>([]);
  const ripples           = useRef<Ripple[]>([]);
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const mx                = useRef<number>(0);
  const my                = useRef<number>(0);

  // ── Internal helpers ─────────────────────────────────────────────────────────

  const spawnRipple = (x: number, y: number, color = 'rgba(124,58,237,') => {
    ripples.current.push({
      x, y, r: 0,
      maxR: 140 + Math.random() * 100,
      alpha: 0.55,
      color,
    });
  };

  const isValidEmail = (v: string) =>
    v.includes('@') && v.trim().length > 3;

  const formatTimer = (s: number) =>
    `0:${s.toString().padStart(2, '0')}`;

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let secs = 30;
    setTimer(secs);
    timerRef.current = setInterval(() => {
      secs--;
      setTimer(secs);
      if (secs <= 0) clearInterval(timerRef.current!);
    }, 1000);
  };

  // ── Effects ──────────────────────────────────────────────────────────────────

  /** Custom cursor tracking */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.current = e.clientX;
      my.current = e.clientY;
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top  = `${e.clientY}px`;
      }
      setTimeout(() => {
        if (trailRef.current) {
          trailRef.current.style.left = `${mx.current}px`;
          trailRef.current.style.top  = `${my.current}px`;
        }
      }, 80);
    };
    const onDown = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = 'translate(-50%,-50%) scale(1.6)';
        cursorRef.current.style.opacity   = '0.7';
      }
    };
    const onUp = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = 'translate(-50%,-50%) scale(1)';
        cursorRef.current.style.opacity   = '1';
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup',   onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup',   onUp);
    };
  }, []);

  /** Ripple canvas RAF loop */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const onResize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const onClick = (e: MouseEvent) => {
      for (let i = 0; i < 4; i++) {
        setTimeout(() =>
          spawnRipple(
            e.clientX, e.clientY,
            i % 2 === 0 ? 'rgba(124,58,237,' : 'rgba(46,196,165,'
          ), i * 70);
      }
    };
    document.addEventListener('click', onClick);

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = ripples.current.length - 1; i >= 0; i--) {
        const r = ripples.current[i];
        r.r     += 3;
        r.alpha -= 0.012;
        if (r.alpha <= 0) { ripples.current.splice(i, 1); continue; }
        const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r);
        g.addColorStop(0.70, `${r.color}0)`);
        g.addColorStop(0.85, `${r.color}${r.alpha})`);
        g.addColorStop(1,    `${r.color}0)`);
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('click', onClick);
      cancelAnimationFrame(animId);
    };
  }, []);

  /** Crystal shards injection */
  useEffect(() => {
    const container = shardContainerRef.current;
    if (!container) return;
    for (let i = 0; i < 22; i++) {
      const s = document.createElement('div');
      s.className = 'gx-shard';
      const w = 20 + Math.random() * 60;
      const h = 8  + Math.random() * 20;
      s.style.cssText = [
        `width:${w}px`,
        `height:${h}px`,
        `left:${Math.random() * 100}%`,
        `animation-duration:${12 + Math.random() * 16}s`,
        `animation-delay:${-Math.random() * 20}s`,
        `opacity:${0.3 + Math.random() * 0.5}`,
        `transform:rotate(${Math.random() * 360}deg)`,
      ].join(';');
      container.appendChild(s);
    }
    return () => { container.innerHTML = ''; };
  }, []);

  /** 3-D card tilt on mouse move */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!cardWrapperRef.current) return;
      const cx   = window.innerWidth  / 2;
      const cy   = window.innerHeight / 2;
      const rotX = -((e.clientY - cy) / cy) * 8;
      const rotY =  ((e.clientX - cx) / cx) * 8;
      cardWrapperRef.current.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    };
    const onLeave = () => {
      if (!cardWrapperRef.current) return;
      cardWrapperRef.current.style.transform  = 'rotateX(0) rotateY(0)';
      cardWrapperRef.current.style.transition = 'transform 0.6s ease';
      setTimeout(() => {
        if (cardWrapperRef.current)
          cardWrapperRef.current.style.transition = 'transform 0.15s ease';
      }, 600);
    };
    document.addEventListener('mousemove',  onMove);
    document.addEventListener('mouseleave', onLeave);
    return () => {
      document.removeEventListener('mousemove',  onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  // ── Event handlers ───────────────────────────────────────────────────────────

  const handleSendCode = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isValidEmail(email)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setDisplayEmail(email);
    setModalOpen(true);
    setOtpValues(Array(6).fill(''));
    setOtpErrors(Array(6).fill(false));
    setVerified(false);
    startTimer();
    spawnRipple(e.clientX, e.clientY, 'rgba(46,196,165,');
    setTimeout(() => otpRefs.current[0]?.focus(), 450);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) setEmailError(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...otpValues];
    next[index] = digit;
    setOtpValues(next);
    if (digit && index < 5)
      setTimeout(() => otpRefs.current[index + 1]?.focus(), 0);
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const next      = [...otpValues];
      next[index - 1] = '';
      setOtpValues(next);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next   = [...otpValues];
    pasted.split('').forEach((ch, j) => {
      if (index + j < 6) next[index + j] = ch;
    });
    setOtpValues(next);
    const focusIdx = Math.min(index + pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  const handleVerify = (e: React.MouseEvent<HTMLButtonElement>) => {
    const code = otpValues.join('');
    if (code.length < 6) {
      setOtpErrors(otpValues.map(v => !v));
      setTimeout(() => setOtpErrors(Array(6).fill(false)), 500);
      return;
    }
    spawnRipple(e.clientX, e.clientY, 'rgba(46,196,165,');
    setVerified(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setOtpValues(Array(6).fill(''));
    setOtpErrors(Array(6).fill(false));
    setVerified(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(0);
  };

  const handleResend = () => {
    setOtpValues(Array(6).fill(''));
    setOtpErrors(Array(6).fill(false));
    spawnRipple(mx.current, my.current, 'rgba(124,58,237,');
    startTimer();
    setTimeout(() => otpRefs.current[0]?.focus(), 0);
  };

  // ── Return everything the UI needs ───────────────────────────────────────────

  return {
    // state
    email,
    emailError,
    modalOpen,
    displayEmail,
    otpValues,
    otpErrors,
    verified,
    timer,
    // refs
    canvasRef,
    cursorRef,
    trailRef,
    cardWrapperRef,
    shardContainerRef,
    otpRefs,
    // helpers
    formatTimer,
    // handlers
    handleSendCode,
    handleEmailChange,
    handleOtpChange,
    handleOtpKeyDown,
    handleOtpPaste,
    handleVerify,
    handleCloseModal,
    handleResend,
  };
}