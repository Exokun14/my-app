// ============================================================
//  loginUtils.ts  –  All interactive logic for the Login page
// ============================================================


// ── Types ────────────────────────────────────────────────────
interface Ripple {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: string;
}

// Shared ripple array so canvas & click handlers can reference it
const ripples: Ripple[] = [];

export function spawnRipple(x: number, y: number, color = "rgba(124,58,237,") {
  ripples.push({ x, y, r: 0, maxR: 140 + Math.random() * 100, alpha: 0.55, color });
}

// ── Cursor ───────────────────────────────────────────────────
export function initCursor(cursor: HTMLDivElement, trail: HTMLDivElement) {
  let mx = 0, my = 0;

  const onMove = (e: MouseEvent) => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + "px";
    cursor.style.top = my + "px";
    setTimeout(() => {
      trail.style.left = mx + "px";
      trail.style.top = my + "px";
    }, 80);
  };

  const onDown = () => {
    cursor.style.transform = "translate(-50%,-50%) scale(1.6)";
    cursor.style.opacity = "0.7";
  };

  const onUp = () => {
    cursor.style.transform = "translate(-50%,-50%) scale(1)";
    cursor.style.opacity = "1";
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mousedown", onDown);
  document.addEventListener("mouseup", onUp);

  return () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mousedown", onDown);
    document.removeEventListener("mouseup", onUp);
  };
}

// ── Ripple Canvas ────────────────────────────────────────────
export function initRippleCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener("resize", resize);

  const onClick = (e: MouseEvent) => {
    for (let i = 0; i < 4; i++) {
      setTimeout(
        () => spawnRipple(e.clientX, e.clientY, i % 2 === 0 ? "rgba(124,58,237," : "rgba(46,196,165,"),
        i * 70
      );
    }
  };

  const onTouchStart = (e: TouchEvent) => {
    for (const t of Array.from(e.touches)) spawnRipple(t.clientX, t.clientY, "rgba(124,58,237,");
  };

  const onTouchMove = (e: TouchEvent) => {
    for (const t of Array.from(e.touches)) {
      if (Math.random() < 0.1) spawnRipple(t.clientX, t.clientY, "rgba(46,196,165,");
    }
  };

  document.addEventListener("click", onClick);
  document.addEventListener("touchstart", onTouchStart);
  document.addEventListener("touchmove", onTouchMove);

  let rafId: number;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += 3; r.alpha -= 0.012;
      if (r.alpha <= 0) { ripples.splice(i, 1); continue; }
      const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r);
      grad.addColorStop(0.7, r.color + "0)");
      grad.addColorStop(0.85, r.color + r.alpha + ")");
      grad.addColorStop(1, r.color + "0)");
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    rafId = requestAnimationFrame(animate);
  };
  animate();

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", resize);
    document.removeEventListener("click", onClick);
    document.removeEventListener("touchstart", onTouchStart);
    document.removeEventListener("touchmove", onTouchMove);
  };
}

// ── Crystal Shards ───────────────────────────────────────────
export function initShards(container: HTMLDivElement) {
  for (let i = 0; i < 22; i++) {
    const s = document.createElement("div");
    s.className = "gx-shard";
    const w = 20 + Math.random() * 60;
    const h = 8 + Math.random() * 20;
    s.style.cssText = `
      width:${w}px;height:${h}px;
      left:${Math.random() * 100}%;
      animation-duration:${12 + Math.random() * 16}s;
      animation-delay:${-Math.random() * 20}s;
      opacity:${0.3 + Math.random() * 0.5};
      transform:rotate(${Math.random() * 360}deg);
    `;
    container.appendChild(s);
  }
}

// ── 3-D Card Tilt ────────────────────────────────────────────
export function initCardTilt(cardWrapper: HTMLDivElement) {
  const onMove = (e: MouseEvent) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dx = (e.clientX - cx) / cx;
    const dy = (e.clientY - cy) / cy;
    cardWrapper.style.transform = `rotateX(${-dy * 8}deg) rotateY(${dx * 8}deg)`;
  };

  const onLeave = () => {
    cardWrapper.style.transform = "rotateX(0) rotateY(0)";
    cardWrapper.style.transition = "transform 0.6s ease";
    setTimeout(() => (cardWrapper.style.transition = "transform 0.15s ease"), 600);
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseleave", onLeave);

  return () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseleave", onLeave);
  };
}

// ── Password Toggle ──────────────────────────────────────────
export function initPasswordToggle(eyeBtn: HTMLButtonElement, passInput: HTMLInputElement) {
  let shown = false;
  const handler = () => {
    shown = !shown;
    passInput.type = shown ? "text" : "password";
    eyeBtn.style.color = shown ? "#a78bfa" : "";
  };
  eyeBtn.addEventListener("click", handler);
  return () => eyeBtn.removeEventListener("click", handler);
}

// ── Sign-In Button Ripple ────────────────────────────────────
export function initSignInRipple(btn: HTMLButtonElement) {
  const handler = (e: MouseEvent) => {
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "gx-btn-ripple";
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    spawnRipple(e.clientX, e.clientY, "rgba(46,196,165,");
  };
  btn.addEventListener("click", handler);
  return () => btn.removeEventListener("click", handler);
}

// ── Social Button Ripples ────────────────────────────────────
export function initSocialRipple() {
  document.querySelectorAll<HTMLButtonElement>(".gx-social-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => spawnRipple(e.clientX, e.clientY, "rgba(124,58,237,"));
  });
}

// ── Swipe Gestures ───────────────────────────────────────────
export function initSwipeGestures() {
  let touchStartX = 0, touchStartY = 0;

  const onStart = (e: TouchEvent) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };

  const onEnd = (e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const card = document.getElementById("loginCard") as HTMLElement | null;
    if (!card) return;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      card.style.transition = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";
      card.style.transform = `translateX(${dx > 0 ? 8 : -8}px) scale(1.01)`;
      for (let i = 0; i < 4; i++) {
        setTimeout(
          () => spawnRipple(dx > 0 ? window.innerWidth * 0.2 : window.innerWidth * 0.8, window.innerHeight / 2, "rgba(124,58,237,"),
          i * 60
        );
      }
      setTimeout(() => {
        card.style.transform = "";
        setTimeout(() => (card.style.transition = ""), 400);
      }, 400);
    }
  };

  document.addEventListener("touchstart", onStart);
  document.addEventListener("touchend", onEnd);

  return () => {
    document.removeEventListener("touchstart", onStart);
    document.removeEventListener("touchend", onEnd);
  };
}
