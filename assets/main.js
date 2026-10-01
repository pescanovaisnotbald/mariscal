(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* nav: solid after hero, hide on scroll down */
  const nav = document.querySelector('.nav');
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 80);
    nav.classList.toggle('hide', y > lastY && y > 400);
    lastY = y;
  }, { passive: true });

  /* reveal on scroll */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.rv,.img-mask').forEach((el) => io.observe(el));

  /* hero media: Apple-style expand + inner parallax, smoothed with lerp */
  const media = document.querySelector('.hero-media');
  const frame = media && media.querySelector('.frame');
  if (media && !reduce) {
    let cur = 0, curPy = 0, dirty = true;
    addEventListener('scroll', () => { dirty = true; }, { passive: true });
    addEventListener('resize', () => { dirty = true; });
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const tick = () => {
      if (dirty) {
        const vh = innerHeight, r = frame.getBoundingClientRect();
        const target = ease(Math.min(Math.max(1 - (r.top - vh * .06) / (vh * .6), 0), 1));
        const mid = Math.min(Math.max((r.top + r.height / 2 - vh / 2) / vh, -1), 1);
        const tPy = -mid * r.height * .1;
        cur += (target - cur) * .12; curPy += (tPy - curPy) * .12;
        media.style.setProperty('--p', cur.toFixed(4));
        media.style.setProperty('--py', curPy.toFixed(2) + 'px');
        if (Math.abs(target - cur) < .001 && Math.abs(tPy - curPy) < .1) dirty = false;
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  /* count-up for the figures */
  document.querySelectorAll('[data-count]').forEach((el) => {
    if (reduce) return;
    const end = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, suf = el.dataset.suffix || '';
    const fmt = (v) => v.toFixed(dec).replace('.', ',') + suf;
    el.textContent = fmt(0);
    new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return; o.disconnect();
      const t0 = performance.now(), D = 1600;
      const step = (t) => { const k = Math.min((t - t0) / D, 1); el.textContent = fmt(end * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, { threshold: .6 }).observe(el);
  });

  /* subtle hero parallax */
  const wm = document.querySelector('.wordmark');
  if (wm && !reduce) {
    addEventListener('scroll', () => {
      const y = Math.min(scrollY, innerHeight);
      wm.style.transform = `translateY(${y * .18}px)`;
      wm.style.opacity = 1 - y / (innerHeight * .9);
    }, { passive: true });
  }

  /* reviews carousel: auto-scroll, pause on hover, click = faster */
  const rail = document.querySelector('.rail');
  const track = document.querySelector('.track');
  if (rail && track && reduce) rail.classList.add('rail-static');
  else if (rail && track) {
    [...track.children].forEach((c) => track.appendChild(c.cloneNode(true)));
    [...track.children].slice(0, track.children.length / 2).forEach((c) => c.setAttribute('aria-hidden', 'false'));
    [...track.children].slice(track.children.length / 2).forEach((c) => c.setAttribute('aria-hidden', 'true'));

    const BASE = 38;            // px/s
    let x = 0, speed = BASE, boost = 0, hover = false, visible = true, last = performance.now();
    let drag = null;
    const half = () => track.scrollWidth / 2;

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(rail);
    rail.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hover = true; });
    rail.addEventListener('pointerleave', () => { hover = false; });

    rail.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, moved: 0 }; });
    addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x; drag.x = e.clientX; drag.moved += Math.abs(dx);
      if (drag.moved > 6) { x -= dx; rail.style.cursor = 'grabbing'; }
    });
    addEventListener('pointercancel', () => { drag = null; rail.style.cursor = ''; });
    addEventListener('pointerup', () => {
      if (drag && drag.moved <= 6) boost = Math.min(boost + 520, 1400); // click → faster, then eases back
      drag = null; rail.style.cursor = '';
    });

    const loop = (t) => {
      const dt = Math.min((t - last) / 1000, .05); last = t;
      if (visible) {
        const target = hover || drag ? 0 : BASE + boost;
        speed += (target - speed) * Math.min(dt * 5, 1);   // smooth pause / resume
        boost *= Math.pow(.35, dt);                         // decay of click boost
        x += speed * dt;
        const h = half();
        if (h) { x = ((x % h) + h) % h; }
        track.style.transform = `translate3d(${-x}px,0,0)`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* shops accordion + map */
  const shops = [...document.querySelectorAll('.shop')];
  const frames = [...document.querySelectorAll('.map iframe')];
  const activate = (i) => {
    shops.forEach((s, k) => {
      s.classList.toggle('on', k === i);
      s.querySelector('button').setAttribute('aria-expanded', k === i);
    });
    frames.forEach((f, k) => {
      if (k === i && !f.src) f.src = f.dataset.src;
      f.classList.toggle('show', k === i);
    });
  };
  shops.forEach((s, i) => s.querySelector('button').addEventListener('click', () => activate(i)));
  if (shops.length) {
    const mapIO = new IntersectionObserver(([e]) => { if (e.isIntersecting) { activate(0); mapIO.disconnect(); } }, { rootMargin: '300px' });
    mapIO.observe(document.querySelector('.map'));
  }
})();
