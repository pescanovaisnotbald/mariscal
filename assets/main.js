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

  /* hero: scroll-linked zoom / fade, smoothed with lerp */
  const hero = document.querySelector('.hero');
  if (hero && !reduce) {
    let cur = 0, target = 0;
    const read = () => { target = Math.min(Math.max(scrollY / (hero.offsetHeight * .85), 0), 1); };
    addEventListener('scroll', read, { passive: true }); read();
    const tick = () => {
      cur += (target - cur) * .1;
      hero.style.setProperty('--p', cur.toFixed(4));
      requestAnimationFrame(tick);
    };
    tick();
  }

  /* image parallax inside masks (CSS `translate`, independent of the reveal zoom) */
  const pimgs = [...document.querySelectorAll('.img-mask img')];
  if (pimgs.length && !reduce) {
    let pd = true;
    addEventListener('scroll', () => { pd = true; }, { passive: true });
    addEventListener('resize', () => { pd = true; });
    const ptick = () => {
      if (pd) {
        pd = false;
        const vh = innerHeight;
        pimgs.forEach((img) => {
          const r = img.parentElement.getBoundingClientRect();
          if (r.bottom < -100 || r.top > vh + 100) return;
          const mid = ((r.top + r.height / 2) - vh / 2) / vh;       // -1..1 roughly
          img.style.setProperty('--ty', (-mid * r.height * .07).toFixed(1) + 'px');
        });
      }
      requestAnimationFrame(ptick);
    };
    ptick();
  }

  /* words light up as you scroll */
  document.querySelectorAll('.scrub').forEach((p) => {
    const words = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    const spans = words.map((w) => { const s = document.createElement('span'); s.className = 'w'; s.textContent = w; p.append(s, ' '); return s; });
    if (reduce) { spans.forEach((s) => s.classList.add('on')); return; }
    const upd = () => {
      const r = p.getBoundingClientRect(), vh = innerHeight;
      const k = Math.min(Math.max((vh * .88 - r.top) / (vh * .5 + r.height * .6), 0), 1);
      const n = Math.round(k * spans.length);
      spans.forEach((s, i) => s.classList.toggle('on', i < n));
    };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  });

  /* blog carousel progress bar (mobile) */
  const posts = document.querySelector('.posts'), prog = document.querySelector('.prog');
  if (posts && prog) {
    const upd = () => {
      const max = posts.scrollWidth - posts.clientWidth;
      const w = Math.min(posts.clientWidth / posts.scrollWidth, 1);
      prog.style.setProperty('--w', w.toFixed(3));
      prog.style.setProperty('--x', max > 0 ? (posts.scrollLeft / max).toFixed(3) : 0);
    };
    posts.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
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
