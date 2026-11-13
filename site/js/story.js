/* =========================================================
   Story — scroll choreography (GSAP ScrollTrigger + Lenis)
   Principles that keep scrolling feeling natural:
   - the page always moves 1:1 with the user's input (no snapping, no hijack)
   - desktop wheels get inertial smoothing (Lenis); touch keeps native momentum
   - text/cards animate on a timer once they come into view, rather than
     being scrubbed to the scroll position, so nothing lags behind the hand
   - only the background 3D world is scroll-linked
   ========================================================= */
(function () {
  "use strict";
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) return; // CSS/IO fallback in main.js keeps the page usable
  gsap.registerPlugin(ST);
  // mobile address bar show/hide resizes the viewport constantly: don't re-layout for it
  ST.config({ ignoreMobileResize: true });
  const touch = matchMedia("(hover: none) and (pointer: coarse)").matches;
  const W = window.World || { setTarget() {}, setOpacity() {}, setZoom() {} };
  const reduced = window.DE && window.DE.reducedMotion;
  document.documentElement.classList.add("gsap-on");

  /* ---------- smooth, inertial wheel scrolling on desktop ---------- */
  let lenis = null;
  if (!touch && !reduced && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on("scroll", ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
  }

  // in-page links glide (Lenis on desktop, native smooth elsewhere)
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    const el = id && id !== "top" ? document.getElementById(id) : null;
    if (id && id !== "top" && !el) return;
    e.preventDefault();
    const navH = document.getElementById("nav").offsetHeight;
    if (lenis) lenis.scrollTo(el || 0, { offset: el ? -navH : 0, duration: 1.2 });
    else window.scrollTo({ top: el ? el.getBoundingClientRect().top + scrollY - navH : 0, behavior: reduced ? "auto" : "smooth" });
    history.replaceState(null, "", id ? "#" + id : location.pathname);
  });

  /* ---------- background world: the only scroll-linked part ---------- */
  ST.create({ trigger: ".hero", start: "top top", end: "bottom top", onUpdate: (s) => W.setZoom(-s.progress * 3.5) });
  document.querySelectorAll(".chapter").forEach((ch) => {
    const shape = +ch.dataset.shape;
    ST.create({ trigger: ch, start: "top bottom", end: "top 40%", onUpdate: (s) => W.setTarget(shape - 1 + s.progress) });
  });
  ST.create({
    trigger: "#about", start: "top bottom", end: "top 25%",
    onUpdate: (s) => { W.setTarget(5 + s.progress); W.setOpacity(1 - 0.5 * s.progress); },
  });

  if (reduced) return; // content simply stays visible

  /* ---------- hero gently recedes as you leave it (desktop only; phones scroll it normally) ---------- */
  if (!touch) gsap.to(".hero__inner", {
    y: -60, opacity: 0, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 10%", scrub: true },
  });
  if (!touch) gsap.to(".hero__stats", {
    y: -30, opacity: 0, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "25% top", end: "bottom 15%", scrub: true },
  });

  /* ---------- chapter headlines: play once in view, reverse when scrolled back ---------- */
  document.querySelectorAll(".chapter").forEach((ch) => {
    const kicker = ch.querySelector(".chapter__kicker");
    const words = ch.querySelectorAll(".chapter__title > span");
    const rest = ch.querySelectorAll(".chapter__body, .chapter__chips");
    gsap.timeline({ scrollTrigger: { trigger: ch, start: touch ? "top 75%" : "top 55%", toggleActions: "play none none reverse" } })
      .from(kicker, { opacity: 0, y: touch ? 0 : 24, duration: 0.45, ease: "power2.out" })
      .from(words, touch
        ? { opacity: 0, stagger: 0.1, duration: 0.5, ease: "power2.out" }
        : { opacity: 0, y: 90, z: -200, rotateX: -70, transformOrigin: "50% 100%", stagger: 0.12, duration: 0.85, ease: "power3.out" }, "-=0.25")
      .from(rest, { opacity: 0, y: touch ? 0 : 30, stagger: 0.1, duration: 0.6, ease: "power2.out" }, "-=0.5");
  });

  /* ---------- content blocks: one-shot entrance as they appear ---------- */
  let side = 1;
  gsap.utils.toArray(".section .reveal:not(.contact__card)").forEach((el) => {
    const isTl = el.classList.contains("tl");
    if (isTl) side *= -1;
    const from = touch
      ? { opacity: 0 }
      : { opacity: 0, y: 70, rotateX: 14, rotateY: isTl ? side * 10 : 0, transformPerspective: 1100, transformOrigin: "50% 100%" };
    gsap.fromTo(el, from, {
      opacity: 1, y: 0, rotateX: 0, rotateY: 0, duration: touch ? 0.6 : 0.9, ease: "power3.out",
      clearProps: touch ? "transform" : "transform,transformPerspective",
      scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" },
    });
  });

  // timeline spine draws itself as you scroll (decorative, direct)
  const tl = document.getElementById("timeline");
  if (tl) gsap.fromTo(tl, { "--spine": 0 }, { "--spine": 1, ease: "none", scrollTrigger: { trigger: tl, start: "top 75%", end: "bottom 60%", scrub: true } });

  // contact card rises into place
  gsap.fromTo(".contact__card", touch ? { opacity: 0 } : { opacity: 0, y: 60, scale: 0.94 },
    { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "power3.out", clearProps: "transform",
      scrollTrigger: { trigger: ".contact", start: "top 80%", toggleActions: "play none none none" } });

  addEventListener("load", () => ST.refresh());
})();
