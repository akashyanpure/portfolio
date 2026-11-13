/* =========================================================
   Shared utilities + page chrome
   ========================================================= */
(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tiny canvas engine shared by all animations ---------- */
  function createScene(canvas, frame) {
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, dpr = 1, raf = 0, last = 0, t = 0, visible = false, fn = frame;

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reducedMotion) renderStill();
    }
    function step(dt) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      t += dt;
      fn(ctx, w, h, dt, t);
    }
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      step(dt);
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (raf || reducedMotion || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; }
    function renderStill() {
      // Advance the simulation silently so the still frame shows something meaningful.
      for (let i = 0; i < 240; i++) step(1 / 60);
    }

    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      visible ? start() : stop();
    }, { threshold: 0.05 }).observe(canvas);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    resize();

    return {
      setFrame(newFn) { fn = newFn; t = 0; if (reducedMotion) renderStill(); },
      get size() { return { w, h }; },
    };
  }

  /* ---------- drawing helpers ---------- */
  const C = {
    cyan: "#22d3ee", violet: "#a78bfa", pink: "#f472b6", green: "#4ade80",
    amber: "#fbbf24", red: "#f87171", text: "#e7edf7", muted: "#8d9bb2",
    dim: "#5b6880", line: "rgba(148,163,184,0.18)", panel: "rgba(13,19,35,0.92)",
  };
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function box(ctx, x, y, w, h, opts = {}) {
    const { color = C.cyan, fill = C.panel, glow = 0, r = 10, label, sub, font = 12, align = "center" } = opts;
    ctx.save();
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = fill; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.2; ctx.strokeStyle = color; ctx.globalAlpha = 0.85; ctx.stroke();
    ctx.globalAlpha = 1;
    if (label) {
      ctx.fillStyle = C.text; ctx.textAlign = align; ctx.textBaseline = "middle";
      ctx.font = `600 ${font}px "JetBrains Mono", monospace`;
      const tx = align === "center" ? x + w / 2 : x + 10;
      ctx.fillText(label, tx, y + h / 2 - (sub ? 7 : 0));
      if (sub) {
        ctx.fillStyle = C.muted; ctx.font = `500 ${Math.max(9, font - 2.5)}px "JetBrains Mono", monospace`;
        ctx.fillText(sub, tx, y + h / 2 + 9);
      }
    }
    ctx.restore();
  }
  function text(ctx, s, x, y, opts = {}) {
    const { color = C.muted, size = 11, weight = 500, align = "left", base = "middle" } = opts;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
    ctx.font = `${weight} ${size}px "JetBrains Mono", monospace`;
    ctx.fillText(s, x, y);
  }
  function dot(ctx, x, y, r, color, glow = 8) {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = glow;
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function line(ctx, pts, color = C.line, width = 1.2, dash = null, offset = 0) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width;
    if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = offset; }
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke(); ctx.restore();
  }
  /** Point at distance fraction p (0..1) along a polyline. */
  function along(pts, p) {
    let total = 0; const segs = [];
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push(l); total += l;
    }
    let d = Math.max(0, Math.min(1, p)) * total;
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i] || i === segs.length - 1) {
        const k = segs[i] ? Math.min(1, d / segs[i]) : 0;
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k, i];
      }
      d -= segs[i];
    }
    return [pts[0][0], pts[0][1], 0];
  }
  function bezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  }
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  window.DE = { createScene, C, rr, box, text, dot, line, along, bezier, ease, clamp01, rand, pick, reducedMotion };

  /* =========================================================
     Page chrome
     ========================================================= */
  document.getElementById("year").textContent = new Date().getFullYear();

  // nav
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => {
    if (e.target.closest("a")) { links.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); }
  });

  // scroll progress + nav state
  const progress = document.querySelector(".scroll-progress");
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    nav.classList.toggle("is-scrolled", scrollY > 20);
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // active section in nav
  const sectionLinks = [...links.querySelectorAll('a[href^="#"]')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        sectionLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id));
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll("main section[id]").forEach((s) => io.observe(s));

  // cursor glow (pointer devices only)
  const glow = document.querySelector(".cursor-glow");
  if (matchMedia("(pointer: fine)").matches && !reducedMotion) {
    addEventListener("pointermove", (e) => {
      glow.style.opacity = "1";
      glow.style.left = e.clientX + "px"; glow.style.top = e.clientY + "px";
    }, { passive: true });
  }

  // reveal on scroll
  const rio = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-visible"); rio.unobserve(en.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => rio.observe(el));

  // counters
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target, to = +el.dataset.to, t0 = performance.now();
      cio.unobserve(el);
      if (reducedMotion) { el.textContent = to; return; }
      (function tick(now) {
        const p = Math.min(1, (now - t0) / 1400);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  });
  document.querySelectorAll(".count").forEach((el) => cio.observe(el));

  // typed rotating phrases
  const phrases = [
    "real-time streaming pipelines",
    "governed lakehouse layers",
    "LLM-ready data for GenAI",
    "Airflow + dbt on Snowflake",
    "infrastructure as code",
    "self-service analytics",
  ];
  const typedEl = document.getElementById("typed");
  if (reducedMotion) typedEl.textContent = phrases[0];
  else {
    let pi = 0, ci = 0, del = false;
    (function type() {
      const s = phrases[pi];
      ci += del ? -1 : 1;
      typedEl.textContent = s.slice(0, ci);
      let delay = del ? 28 : 55;
      if (!del && ci === s.length) { del = true; delay = 1800; }
      else if (del && ci === 0) { del = false; pi = (pi + 1) % phrases.length; delay = 300; }
      setTimeout(type, delay);
    })();
  }

  // terminal: career as an Airflow DAG run
  const term = document.getElementById("terminal");
  const L = (html) => html;
  const termLines = [
    L('<span class="t-pink">$</span> airflow dags trigger <span class="t-cyan">career_pipeline</span>'),
    L('<span class="t-dim">[scheduler] DAG run created · run_id=manual__akash</span>'),
    L(''),
    L('<span class="t-violet">▸</span> ubisoft_qa_testing      <span class="t-dim">2018</span>     <span class="t-green">✓ success</span>'),
    L('<span class="t-violet">▸</span> be_computer_eng         <span class="t-dim">2018</span>     <span class="t-green">✓ success</span>'),
    L('<span class="t-violet">▸</span> finiq_software_dev      <span class="t-dim">2019-20</span>  <span class="t-green">✓ success</span>'),
    L('<span class="t-violet">▸</span> msc_data_science        <span class="t-dim">2021</span>     <span class="t-green">✓ success</span>'),
    L('<span class="t-violet">▸</span> nayaone_ml_and_gpt3     <span class="t-dim">2021-22</span>  <span class="t-green">✓ success</span>'),
    L('<span class="t-violet">▸</span> norstella_data_platform <span class="t-dim">2022→</span>    <span class="t-cyan">● running</span>'),
    L(''),
    L('<span class="t-dim">upstream_failed=0  retries=0  sla_missed=0</span>'),
    L('<span class="t-amber">⧗</span> next downstream task: <span class="t-cyan">join_your_team</span> <span class="t-dim">(awaiting trigger)</span>'),
  ];
  let termStarted = false;
  const tio = new IntersectionObserver((en) => {
    if (!en[0].isIntersecting || termStarted) return;
    termStarted = true;
    if (reducedMotion) { term.innerHTML = termLines.join("\n"); return; }
    let i = 0;
    (function next() {
      term.innerHTML = termLines.slice(0, i + 1).join("\n") + (i < termLines.length - 1 ? '\n<span class="caret">▌</span>' : "");
      i++;
      if (i < termLines.length) setTimeout(next, i < 3 ? 420 : 260);
    })();
  }, { threshold: 0.3 });
  tio.observe(term);

  // phones show one ring: its chips take turns swapping to the outer-ring names,
  // so every technology still appears around the photo
  const mqSmall = matchMedia("(max-width: 560px)");
  const innerChips = [...document.querySelectorAll(".orbit:not(.orbit--outer) .orbit__chip")];
  const outerNames = [...document.querySelectorAll(".orbit--outer .orbit__chip")].map((c) => c.textContent);
  const originalNames = innerChips.map((c) => c.textContent);
  let swapTimer = 0;
  function startSwap() {
    clearInterval(swapTimer);
    innerChips.forEach((c, i) => { c.textContent = originalNames[i]; c.classList.remove("is-swap"); });
    if (!mqSmall.matches || reducedMotion || !innerChips.length) return;
    const queue = outerNames.slice();
    let tick = 0;
    swapTimer = setInterval(() => {
      const chip = innerChips[tick++ % innerChips.length];
      chip.classList.add("is-swap");
      setTimeout(() => {
        queue.push(chip.textContent);
        chip.textContent = queue.shift();
        chip.classList.remove("is-swap");
      }, 380);
    }, 1300);
  }
  mqSmall.addEventListener("change", startSwap);
  startSwap();

  // back-to-top button with scroll-progress ring
  const toTop = document.getElementById("toTop");
  const toTopRing = document.getElementById("toTopProgress");
  const RING = 2 * Math.PI * 21;
  function updateToTop() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, scrollY / max) : 0;
    toTop.classList.toggle("is-visible", scrollY > innerHeight * 0.8);
    toTopRing.style.strokeDashoffset = String(RING * (1 - p));
  }
  addEventListener("scroll", updateToTop, { passive: true });
  updateToTop();
  toTop.addEventListener("click", () => {
    if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.4 });
    else window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    history.replaceState(null, "", location.pathname + location.search);
  });

  // copy email
  const copyBtn = document.getElementById("copyEmail");
  copyBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(copyBtn.dataset.email); copyBtn.textContent = "Copied ✓"; }
    catch { copyBtn.textContent = copyBtn.dataset.email; }
    setTimeout(() => (copyBtn.textContent = "Copy email"), 2200);
  });
})();
