/* =========================================================
   Story — Apple-style scroll choreography (GSAP ScrollTrigger)
   - hero title scales/fades away as the 3D world zooms in
   - each chapter morphs the world into its shape, and its
     headline words flip in from depth, then exit
   - every content block below tilts in from 3D space
   ========================================================= */
(function () {
  "use strict";
  const gsap = window.gsap, ST = window.ScrollTrigger;
  if (!gsap || !ST) return; // CSS/IO fallback in main.js keeps the page usable
  gsap.registerPlugin(ST);
  const W = window.World || { setTarget() {}, setOpacity() {}, setZoom() {} };
  const reduced = window.DE && window.DE.reducedMotion;
  const root = document.documentElement;
  root.classList.add("gsap-on");

  if (reduced) {
    // still drive the world's shape from scroll, but no motion-heavy effects
    document.querySelectorAll(".chapter").forEach((ch) => {
      const shape = +ch.dataset.shape;
      ST.create({ trigger: ch, start: "top 60%", end: "bottom 40%", onToggle: (s) => s.isActive && W.setTarget(shape) });
    });
    ST.create({ trigger: "#about", start: "top 70%", onEnter: () => { W.setTarget(6); W.setOpacity(0.5); }, onLeaveBack: () => { W.setTarget(5); W.setOpacity(1); } });
    return;
  }

  /* ---------- hero exit ---------- */
  gsap.to(".hero__inner", {
    scale: 1.12, y: -80, opacity: 0, filter: "blur(6px)", ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 15%", scrub: true },
  });
  gsap.to(".hero__stats", {
    y: -40, opacity: 0, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "20% top", end: "bottom 20%", scrub: true },
  });
  ST.create({ trigger: ".hero", start: "top top", end: "bottom top", scrub: true, onUpdate: (s) => W.setZoom(-s.progress * 3.5) });

  /* ---------- chapters ---------- */
  document.querySelectorAll(".chapter").forEach((ch) => {
    const shape = +ch.dataset.shape;
    // morph into this chapter's shape while it scrolls into view
    ST.create({
      trigger: ch, start: "top bottom", end: "top 40%",
      onUpdate: (s) => W.setTarget(shape - 1 + s.progress),
    });

    const inner = ch.querySelector(".chapter__inner");
    const kicker = ch.querySelector(".chapter__kicker");
    const words = ch.querySelectorAll(".chapter__title > span");
    const rest = ch.querySelectorAll(".chapter__body, .chapter__chips");
    gsap.timeline({ scrollTrigger: { trigger: ch, start: "top 75%", end: "bottom bottom", scrub: 0.5 } })
      .from(kicker, { opacity: 0, y: 30, duration: 0.4 })
      .from(words, { opacity: 0, y: 110, z: -260, rotateX: -80, transformOrigin: "50% 100%", stagger: 0.18, duration: 0.6, ease: "power3.out" }, "<0.1")
      .from(rest, { opacity: 0, y: 50, stagger: 0.15, duration: 0.6 }, "-=0.3")
      .to({}, { duration: 1.0 })
      .to(inner, { opacity: 0, y: -90, z: -120, rotateX: 14, filter: "blur(4px)", duration: 0.6, ease: "power2.in" });
  });

  /* ---------- leaving the story: world becomes an ambient ring ---------- */
  ST.create({
    trigger: "#about", start: "top bottom", end: "top 25%",
    onUpdate: (s) => { W.setTarget(5 + s.progress); W.setOpacity(1 - 0.5 * s.progress); },
  });

  /* ---------- 3D entrance for every content block ---------- */
  let side = 1;
  gsap.utils.toArray(".section .reveal:not(.contact__card)").forEach((el) => {
    const isTl = el.classList.contains("tl");
    if (isTl) side *= -1;
    gsap.fromTo(el,
      { opacity: 0, y: 120, z: -180, rotateX: 20, rotateY: isTl ? side * 16 : 0, transformPerspective: 1100, transformOrigin: "50% 100%" },
      { opacity: 1, y: 0, z: 0, rotateX: 0, rotateY: 0, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 102%", end: "top 62%", scrub: 0.7 } });
  });

  // timeline spine draws itself as you scroll
  const tl = document.getElementById("timeline");
  if (tl) {
    gsap.fromTo(tl, { "--spine": 0 }, { "--spine": 1, ease: "none", scrollTrigger: { trigger: tl, start: "top 75%", end: "bottom 60%", scrub: true } });
  }

  // contact card zooms forward like a product reveal
  gsap.fromTo(".contact__card", { scale: 0.82, rotateX: 25, transformPerspective: 1000 },
    { scale: 1, rotateX: 0, ease: "none", scrollTrigger: { trigger: ".contact", start: "top bottom", end: "center 60%", scrub: 0.8 } });

  addEventListener("load", () => ST.refresh());
})();
