/* ============ HELPERS ============ */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============ NAV: SCROLL STATE + BURGER ============ */
const nav = document.querySelector('.nav');
const burger = document.querySelector('.nav__burger');
const navLinks = document.querySelector('.nav__links');

const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

burger.addEventListener('click', () => {
  const open = burger.classList.toggle('is-open');
  navLinks.classList.toggle('is-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
});

navLinks.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => {
    burger.classList.remove('is-open');
    navLinks.classList.remove('is-open');
    document.body.style.overflow = '';
  })
);

/* ============ REVEAL ON SCROLL ============ */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* ============ SHOWREEL: hide the block if the reel file is absent ============ */
const reelVideo = document.querySelector('.reel__video');
if (reelVideo) {
  reelVideo.addEventListener('error', () => {
    const block = document.getElementById('showreel');
    if (block) block.hidden = true;
  });
}

/* ============ HERO: FLOW-FIELD PARTICLES ============ */
const canvas = document.getElementById('heroCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  let particles = [];
  let rafId = null;
  let running = false;

  const COUNT = () => Math.min(120, Math.floor((W * H) / 14000));
  const COLORS = ['108,140,255', '176,108,255', '55,211,196'];

  const rand = (a, b) => a + Math.random() * (b - a);

  function makeParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: rand(-0.3, 0.3),
      vy: rand(-0.3, 0.3),
      r: rand(0.6, 2.2),
      color: COLORS[(Math.random() * COLORS.length) | 0],
      a: rand(0.25, 0.8),
      life: rand(200, 600),
    };
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    particles = Array.from({ length: COUNT() }, makeParticle);
  }

  /* simple pseudo flow field: layered sines */
  function fieldAngle(x, y, t) {
    return (
      Math.sin(x * 0.0016 + t * 0.00022) +
      Math.cos(y * 0.0019 - t * 0.00018)
    ) * Math.PI;
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);

    // soft glow blobs
    const g1 = ctx.createRadialGradient(W * 0.22, H * 0.25, 0, W * 0.22, H * 0.25, W * 0.4);
    g1.addColorStop(0, 'rgba(108,140,255,0.10)');
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createRadialGradient(W * 0.85, H * 0.8, 0, W * 0.85, H * 0.8, W * 0.35);
    g2.addColorStop(0, 'rgba(176,108,255,0.08)');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, W, H);

    // connections
    const linkDist = 110;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < linkDist * linkDist) {
          const alpha = (1 - Math.sqrt(d2) / linkDist) * 0.12;
          ctx.strokeStyle = `rgba(${p.color},${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    // particles
    for (const p of particles) {
      const a = fieldAngle(p.x, p.y, t);
      p.vx += Math.cos(a) * 0.015;
      p.vy += Math.sin(a) * 0.015;
      // damping + speed cap
      p.vx *= 0.985; p.vy *= 0.985;
      const sp = Math.hypot(p.vx, p.vy);
      const maxSp = 1.4;
      if (sp > maxSp) { p.vx = (p.vx / sp) * maxSp; p.vy = (p.vy / sp) * maxSp; }
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;

      // wrap / respawn
      if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
      if (p.life < 0) Object.assign(p, makeParticle(), { x: Math.random() * W, y: Math.random() * H });

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.a})`;
      ctx.fill();
    }

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || prefersReducedMotion) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // pause when hero is off-screen (saves battery)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    }, { threshold: 0.05 }).observe(canvas);
  }

  resize();
  if (prefersReducedMotion) {
    // draw a single static frame for reduced-motion users
    frame(0);
    cancelAnimationFrame(rafId);
    running = false;
  }
}
