/* =========================================================
   Data Lab — six live-simulated data engineering concepts
   ========================================================= */
(function () {
  "use strict";
  const { createScene, C, box, text, dot, line, along, bezier, ease, clamp01, rand, pick, rr } = window.DE;

  const fontFor = (w) => (w < 760 ? 10 : 11.5);

  /* ---------------------------------------------------------
     1. Lakehouse ELT: raw → trusted → curated
     --------------------------------------------------------- */
  function lakehouse() {
    const parts = [];
    let spawn = 0, landed = 0, quarantined = 0, served = 0;
    const sources = ["REST APIs", "OLTP DBs", "S3 files", "Events"];
    const consumers = ["BI dashboards", "ML features", "GenAI / RAG"];
    const segColor = [C.dim, C.dim, C.dim, C.amber, C.amber, C.cyan, C.cyan, C.violet, C.violet, C.green];

    return (ctx, w, h, dt, t) => {
      const f = fontFor(w);
      const top = 46, bot = h - 40;
      const srcX = w * 0.02, srcW = w * 0.125;
      const sy = (i) => top + (bot - top - 30) * (i + 0.5) / sources.length;
      const ingX = w * 0.19, ingW = w * 0.12, midY = (top + bot - 30) / 2;
      const lw = w * 0.1, lTop = top, lH = bot - top - 80;
      const L = [
        { x: w * 0.36, n: "RAW", s: "as-landed", c: C.amber },
        { x: w * 0.505, n: "TRUSTED", s: "validated", c: C.cyan },
        { x: w * 0.65, n: "CURATED", s: "dbt models", c: C.violet },
      ];
      const lMid = lTop + lH / 2;
      const consX = w * 0.82, consW = w * 0.165;
      const cy = (i) => top + (bot - top - 30) * (i + 0.5) / consumers.length;
      const qY = bot - 46, qX = L[1].x - 6, qW = lw + 12;

      // spawn
      spawn -= dt;
      if (spawn <= 0) {
        spawn = rand(0.08, 0.2);
        const si = Math.floor(Math.random() * sources.length);
        const ci = Math.floor(Math.random() * consumers.length);
        const jy = rand(-lH * 0.38, lH * 0.38);
        const bad = Math.random() < 0.1;
        const pts = [
          [srcX + srcW, sy(si)], [ingX, midY + jy * 0.25], [ingX + ingW, midY + jy * 0.25],
          [L[0].x, lMid + jy], [L[0].x + lw, lMid + jy], [L[1].x, lMid + jy],
        ];
        if (bad) pts.push([L[1].x + lw / 2, lMid + jy], [L[1].x + lw / 2, qY + 18]);
        else pts.push([L[1].x + lw, lMid + jy], [L[2].x, lMid + jy], [L[2].x + lw, lMid + jy], [consX, cy(ci)]);
        parts.push({ pts, p: 0, sp: rand(0.14, 0.2) * (bad ? 1.3 : 1), bad });
        landed++;
      }

      // static links
      const off = -t * 30;
      for (let i = 0; i < sources.length; i++) line(ctx, [[srcX + srcW, sy(i)], [ingX, midY]], C.line, 1, [4, 6], off);
      line(ctx, [[ingX + ingW, midY], [L[0].x, lMid]], C.line, 1, [4, 6], off);
      for (let i = 0; i < consumers.length; i++) line(ctx, [[L[2].x + lw, lMid], [consX, cy(i)]], C.line, 1, [4, 6], off);

      // boxes
      sources.forEach((s, i) => box(ctx, srcX, sy(i) - 18, srcW, 36, { color: C.dim, label: s, font: f - 0.5 }));
      box(ctx, ingX, midY - 30, ingW, 60, { color: C.pink, label: "INGEST", sub: "Airflow+Glue", font: f, glow: 12 });
      L.forEach((l) => {
        ctx.save();
        rr(ctx, l.x, lTop, lw, lH, 12);
        const g = ctx.createLinearGradient(0, lTop, 0, lTop + lH);
        g.addColorStop(0, l.c + "22"); g.addColorStop(1, l.c + "05");
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = l.c; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.restore();
        text(ctx, l.n, l.x + lw / 2, lTop + 16, { color: l.c, size: f, weight: 700, align: "center" });
        text(ctx, l.s, l.x + lw / 2, lTop + 31, { color: C.muted, size: f - 2, align: "center" });
      });
      box(ctx, qX, qY, qW, 36, { color: C.red, label: "quarantine", font: f - 1, fill: "rgba(248,113,113,0.08)" });
      consumers.forEach((s, i) => box(ctx, consX, cy(i) - 20, consW, 40, { color: C.green, label: s, font: f - 0.5, glow: 6 }));

      // particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.p += q.sp * dt;
        const [x, y, seg] = along(q.pts, q.p);
        let col = segColor[Math.min(seg, segColor.length - 1)];
        if (q.bad && seg >= 6) col = C.red;
        dot(ctx, x, y, 2.6, col, 10);
        if (q.p >= 1) { parts.splice(i, 1); q.bad ? quarantined++ : served++; }
      }

      // footer metrics
      text(ctx, `batches landed ${landed.toLocaleString()}   ·   quarantined ${quarantined}   ·   served downstream ${served.toLocaleString()}`,
        w / 2, h - 14, { color: C.muted, size: f - 1, align: "center" });
    };
  }

  /* ---------------------------------------------------------
     2. Latency tiers: batch vs near-real-time vs streaming
     --------------------------------------------------------- */
  function latency() {
    const lanes = [
      { n: "BATCH", s: "scheduled", flush: 6, c: C.violet, sink: "Warehouse" },
      { n: "NEAR-REAL-TIME", s: "micro-batch", flush: 1.6, c: C.cyan, sink: "Lakehouse" },
      { n: "REAL-TIME", s: "stream", flush: 0, c: C.green, sink: "Live dashboard" },
    ].map((l) => ({ ...l, ev: [], out: [], buf: 0, timer: 0, lastArrive: -1, spawn: 0 }));

    return (ctx, w, h, dt, t) => {
      const f = fontFor(w);
      const bandH = (h - 20) / 3;
      const srcX = w * 0.02, srcW = w * 0.13, prX = w * 0.42, prW = w * 0.17, skX = w * 0.8, skW = w * 0.18;

      lanes.forEach((l, i) => {
        const y0 = 10 + i * bandH, cy = y0 + bandH / 2;
        if (i > 0) line(ctx, [[0, y0], [w, y0]], "rgba(148,163,184,0.08)");

        text(ctx, l.n, srcX, y0 + 16, { color: l.c, size: f, weight: 700 });
        text(ctx, l.s, srcX + ctx.measureText(l.n).width + 10, y0 + 16, { color: C.muted, size: f - 1.5 });

        // spawn identical event stream into every lane
        l.spawn -= dt;
        if (l.spawn <= 0) { l.spawn = rand(0.18, 0.35); l.ev.push({ p: 0, jy: rand(-10, 10) }); }

        line(ctx, [[srcX + srcW, cy], [prX, cy]], C.line, 1, [4, 6], -t * 30);
        line(ctx, [[prX + prW, cy], [skX, cy]], C.line, 1, [4, 6], -t * 30);
        box(ctx, srcX, cy - 16, srcW, 36, { color: C.dim, label: "events", font: f });

        // processor
        const label = l.flush ? (l.flush > 3 ? "batch job" : "micro-batch") : "stream proc";
        box(ctx, prX, cy - 22, prW, 48, { color: l.c, label, font: f, glow: l.flush ? 0 : 10 });
        if (l.flush) {
          const fill = clamp01(l.timer / l.flush);
          ctx.fillStyle = l.c + "33";
          rr(ctx, prX + 8, cy + 14, (prW - 16) * fill, 5, 3); ctx.fill();
          text(ctx, `buffer ${l.buf}`, prX + prW / 2, cy - 33, { color: C.muted, size: f - 2, align: "center" });
        }

        // events to processor
        for (let k = l.ev.length - 1; k >= 0; k--) {
          const e = l.ev[k]; e.p += dt * 0.9;
          const x = srcX + srcW + (prX - srcX - srcW) * e.p;
          dot(ctx, x, cy + e.jy * (1 - e.p), 2.3, C.text, 6);
          if (e.p >= 1) {
            l.ev.splice(k, 1);
            if (l.flush) l.buf++;
            else l.out.push({ p: 0, n: 1 });
          }
        }
        // flush timer
        if (l.flush) {
          l.timer += dt;
          if (l.timer >= l.flush) { l.timer = 0; if (l.buf) { l.out.push({ p: 0, n: l.buf }); l.buf = 0; } }
        }
        // outputs to sink
        for (let k = l.out.length - 1; k >= 0; k--) {
          const o = l.out[k]; o.p += dt * 1.1;
          const x = prX + prW + (skX - prX - prW) * ease(clamp01(o.p));
          if (o.n > 1) {
            const s = Math.min(26, 6 + o.n * 0.9);
            ctx.save(); ctx.shadowColor = l.c; ctx.shadowBlur = 14; ctx.fillStyle = l.c;
            rr(ctx, x - s / 2, cy - s / 2, s, s, 4); ctx.fill(); ctx.restore();
            text(ctx, String(o.n), x, cy, { color: "#050810", size: f - 2, weight: 700, align: "center" });
          } else dot(ctx, x, cy, 2.6, l.c, 10);
          if (o.p >= 1) { l.out.splice(k, 1); l.lastArrive = t; }
        }
        // sink + freshness
        box(ctx, skX, cy - 20, skW, 40, { color: l.c, label: l.sink, font: f - 0.5 });
        const age = l.lastArrive < 0 ? null : t - l.lastArrive;
        const fresh = age === null ? "waiting…" : age < 1 ? `fresh: ${Math.round(age * 1000)} ms` : `fresh: ${age.toFixed(1)} s`;
        text(ctx, fresh, skX + skW / 2, cy + 32, { color: age !== null && age < 1 ? C.green : C.muted, size: f - 1.5, align: "center" });
      });
    };
  }

  /* ---------------------------------------------------------
     3. Airflow DAG orchestration with retry
     --------------------------------------------------------- */
  function airflow() {
    const T = [
      { id: "extract_api", x: 0.09, y: 0.22, d: [] },
      { id: "extract_db", x: 0.09, y: 0.78, d: [] },
      { id: "validate_schema", x: 0.3, y: 0.5, d: [0, 1] },
      { id: "dbt_staging", x: 0.5, y: 0.5, d: [2] },
      { id: "dbt_marts", x: 0.7, y: 0.22, d: [3] },
      { id: "ml_features", x: 0.7, y: 0.78, d: [3] },
      { id: "refresh_bi", x: 0.9, y: 0.22, d: [4] },
      { id: "embed_docs", x: 0.9, y: 0.78, d: [5] },
    ];
    let run = 1041, done = 0, failIdx = 0, clock = 0;
    const log = [];
    const stamp = () => {
      const s = Math.floor(clock * 7) % 60, m = 2 + Math.floor(clock * 7 / 60);
      return `02:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };
    const push = (s, c) => { log.push({ s: `${stamp()}  ${s}`, c }); if (log.length > 4) log.shift(); };
    function reset() {
      T.forEach((k) => { k.st = "none"; k.timer = 0; k.att = 0; });
      failIdx = pick([0, 2, 3, 5]); done = 0; run++;
      push(`DAG run #${run} started`, C.muted);
    }
    reset();

    return (ctx, w, h, dt, t) => {
      clock += dt;
      const f = fontFor(w);
      const top = 40, areaH = h - 140;
      const nw = Math.max(108, w * 0.15), nh = 42;
      const P = (k) => [w * k.x, top + areaH * k.y];

      // --- scheduler ---
      T.forEach((k, i) => {
        if (k.st === "none" && k.d.every((j) => T[j].st === "success")) { k.st = "queued"; k.timer = 0.35; }
        else if (k.st === "queued" && (k.timer -= dt) <= 0) { k.st = "running"; k.timer = rand(0.9, 1.7); push(`▶ ${k.id} running`, C.cyan); }
        else if (k.st === "running" && (k.timer -= dt) <= 0) {
          if (i === failIdx && k.att === 0) { k.st = "retry"; k.timer = 1.1; k.att = 1; push(`↻ ${k.id} failed (timeout), retry 1/3`, C.amber); }
          else { k.st = "success"; push(`✓ ${k.id} success`, C.green); }
        } else if (k.st === "retry" && (k.timer -= dt) <= 0) { k.st = "running"; k.timer = rand(0.8, 1.3); push(`▶ ${k.id} running (attempt 2)`, C.cyan); }
      });
      if (T.every((k) => k.st === "success")) {
        if (done === 0) push(`DAG run #${run} ✓ success`, C.green);
        done += dt;
        if (done > 2.4) reset();
      }

      // header
      text(ctx, `DAG platform_refresh   ·   run #${run}   ·   schedule @hourly`, 14, 18, { color: C.muted, size: f - 0.5 });

      // edges
      T.forEach((k) => k.d.forEach((j) => {
        const u = T[j];
        const [ux, uy] = P(u), [vx, vy] = P(k);
        const p0 = [ux + nw / 2, uy], p3 = [vx - nw / 2, vy];
        const mx = (p0[0] + p3[0]) / 2;
        const p1 = [mx, p0[1]], p2 = [mx, p3[1]];
        ctx.save();
        ctx.strokeStyle = u.st === "success" ? "rgba(74,222,128,0.45)" : C.line; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(...p0); ctx.bezierCurveTo(...p1, ...p2, ...p3); ctx.stroke(); ctx.restore();
        if (u.st === "success" && (k.st === "queued" || k.st === "running")) {
          for (let n = 0; n < 3; n++) { const [x, y] = bezier(p0, p1, p2, p3, (t * 0.8 + n / 3) % 1); dot(ctx, x, y, 2.2, C.cyan, 8); }
        }
      }));

      // nodes
      T.forEach((k) => {
        const [x, y] = P(k);
        const col = { none: C.dim, queued: C.muted, running: C.cyan, retry: C.amber, success: C.green }[k.st];
        const pulse = k.st === "running" ? 10 + Math.sin(t * 8) * 6 : k.st === "retry" ? 12 : 0;
        box(ctx, x - nw / 2, y - nh / 2, nw, nh, { color: col, glow: pulse, label: k.id, font: f - 0.5, fill: k.st === "success" ? "rgba(74,222,128,0.07)" : C.panel });
        const tag = { none: "", queued: "queued", running: "running", retry: "up_for_retry", success: "✓ success" }[k.st];
        text(ctx, tag, x, y + nh / 2 + 11, { color: col, size: f - 2.5, align: "center" });
        if (k.st === "running") {
          ctx.save(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x + nw / 2 - 11, y - nh / 2 + 11, 5, t * 6, t * 6 + 4); ctx.stroke(); ctx.restore();
        }
      });

      // log panel
      const ly = h - 92;
      ctx.save(); rr(ctx, 12, ly, w - 24, 80, 10); ctx.fillStyle = "rgba(3,6,12,0.85)"; ctx.fill(); ctx.strokeStyle = C.line; ctx.stroke(); ctx.restore();
      log.forEach((l, i) => text(ctx, l.s, 24, ly + 15 + i * 17, { color: l.c, size: f - 1.5 }));
    };
  }

  /* ---------------------------------------------------------
     4. Spark: partitions → executors → shuffle → reduce
     --------------------------------------------------------- */
  function spark() {
    const keys = [C.cyan, C.pink, C.amber];
    const speeds = [1, 0.82, 1.12, 0.66];
    const CYCLE = 10;
    return (ctx, w, h, dt, t) => {
      const f = fontFor(w);
      const tc = t % CYCLE;
      const top = 70, bot = h - 34;
      const dsX = w * 0.02, dsW = w * 0.11, dsY = top + 20, dsH = bot - top - 40;
      const exX = w * 0.25, exW = w * 0.18, exH = 46;
      const exY = (i) => top + (bot - top) * (i + 0.5) / 4 - exH / 2;
      const rdX = w * 0.56, rdW = w * 0.16, rdH = 50;
      const rdY = (i) => top + (bot - top) * (i + 0.5) / 3 - rdH / 2;
      const outX = w * 0.83, outW = w * 0.15, outY = (top + bot) / 2 - 40, outH = 80;

      // stage headers
      const s1 = tc < 3.9, s2 = tc >= 3.9 && tc < 7.2;
      text(ctx, "STAGE 1 · narrow · map / filter", exX + exW / 2, 26, { color: s1 ? C.cyan : C.dim, size: f - 0.5, weight: 700, align: "center" });
      text(ctx, "STAGE 2 · wide · shuffle → aggregate", rdX + rdW / 2, 26, { color: s2 ? C.pink : C.dim, size: f - 0.5, weight: 700, align: "center" });
      text(ctx, "driver: lazy DAG → 2 stages, 7 tasks", w / 2, 48, { color: C.muted, size: f - 2, align: "center" });

      // dataset
      box(ctx, dsX, dsY, dsW, dsH, { color: C.dim });
      text(ctx, "dataset", dsX + dsW / 2, dsY - 10, { color: C.muted, size: f - 1, align: "center" });
      const rows = 16;
      const leaving = clamp01(tc / 1.4);
      for (let r = 0; r < rows; r++) {
        const part = Math.floor(r / 4);
        if (leaving > 0 && tc < 8.6 && leaving > part * 0.15) continue;
        ctx.fillStyle = keys[r % 3] + "88";
        ctx.fillRect(dsX + 8, dsY + 10 + r * ((dsH - 20) / rows), dsW - 16, (dsH - 20) / rows - 3);
      }

      // links
      for (let i = 0; i < 4; i++) line(ctx, [[dsX + dsW, dsY + dsH / 2], [exX, exY(i) + exH / 2]], C.line, 1);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++)
        line(ctx, [[exX + exW, exY(i) + exH / 2], [rdX, rdY(j) + rdH / 2]], tc > 3.9 && tc < 5.6 ? keys[j] + "40" : "rgba(148,163,184,0.08)", 1);
      for (let j = 0; j < 3; j++) line(ctx, [[rdX + rdW, rdY(j) + rdH / 2], [outX, outY + outH / 2]], C.line, 1);

      // executors
      for (let i = 0; i < 4; i++) {
        const y = exY(i);
        const prog = clamp01((tc - 1.4) * speeds[i] / 2.2);
        const doneEx = prog >= 1;
        box(ctx, exX, y, exW, exH, { color: doneEx ? C.green : prog > 0 ? C.cyan : C.dim, glow: prog > 0 && !doneEx ? 10 : 0 });
        text(ctx, `executor ${i + 1}`, exX + 10, y + 14, { color: C.text, size: f - 1, weight: 600 });
        text(ctx, i === 3 && prog > 0 && !doneEx ? "straggler" : `task p${i}`, exX + exW - 10, y + 14, { color: i === 3 && !doneEx && prog > 0 ? C.amber : C.muted, size: f - 2.5, align: "right" });
        ctx.fillStyle = "rgba(148,163,184,0.12)"; rr(ctx, exX + 10, y + 28, exW - 20, 7, 3); ctx.fill();
        ctx.fillStyle = doneEx ? C.green : C.cyan; rr(ctx, exX + 10, y + 28, (exW - 20) * prog, 7, 3); ctx.fill();
        // partition flight
        if (tc < 1.6) {
          const p = ease(clamp01((tc - i * 0.12) / 1.1));
          const x = dsX + dsW / 2 + (exX + 14 - dsX - dsW / 2) * p;
          const yy = dsY + dsH * (i + 0.5) / 4 + (y + exH / 2 - dsY - dsH * (i + 0.5) / 4) * p;
          for (let k = 0; k < 3; k++) { ctx.fillStyle = keys[k]; ctx.fillRect(x - 12 + k * 8, yy - 6, 6, 12); }
        }
        // shuffle packets
        if (tc > 3.9 && tc < 5.6) {
          for (let j = 0; j < 3; j++) {
            const p = ease(clamp01((tc - 3.9 - i * 0.08) / 1.4));
            const x = exX + exW + (rdX - exX - exW) * p;
            const yy = y + exH / 2 + (rdY(j) + rdH / 2 - y - exH / 2) * p;
            dot(ctx, x, yy, 3, keys[j], 10);
          }
        }
      }

      // reducers
      for (let j = 0; j < 3; j++) {
        const y = rdY(j);
        const prog = clamp01((tc - 5.6) / 1.4);
        box(ctx, rdX, y, rdW, rdH, { color: prog >= 1 ? C.green : tc > 3.9 ? keys[j] : C.dim, glow: prog > 0 && prog < 1 ? 10 : 0 });
        text(ctx, `reduce key ${"ABC"[j]}`, rdX + 10, y + 16, { color: C.text, size: f - 1, weight: 600 });
        ctx.fillStyle = "rgba(148,163,184,0.12)"; rr(ctx, rdX + 10, y + 32, rdW - 20, 7, 3); ctx.fill();
        ctx.fillStyle = keys[j]; rr(ctx, rdX + 10, y + 32, (rdW - 20) * prog, 7, 3); ctx.fill();
        if (tc > 7 && tc < 8.4) {
          const p = ease(clamp01((tc - 7) / 1.2));
          dot(ctx, rdX + rdW + (outX - rdX - rdW) * p, y + rdH / 2 + (outY + outH / 2 - y - rdH / 2) * p, 3.5, keys[j], 12);
        }
      }

      // output
      const written = tc > 8.2;
      box(ctx, outX, outY, outW, outH, { color: written ? C.green : C.dim, glow: written ? 14 : 0, label: "output", sub: "parquet · S3", font: f });
      if (written) text(ctx, "✓ job complete", outX + outW / 2, outY + outH + 16, { color: C.green, size: f - 1, align: "center" });
    };
  }

  /* ---------------------------------------------------------
     5. Data quality gate + PII masking + lineage
     --------------------------------------------------------- */
  function quality() {
    const checks = ["schema", "not_null", "unique", "accepted_values", "freshness"];
    const recs = [];
    let spawn = 0, passed = 0, quarantined = 0, masked = 0, flash = -1, flashOk = true, flashT = 0;
    return (ctx, w, h, dt, t) => {
      const f = fontFor(w);
      const beltY = h * 0.48, gateX = w * 0.38, maskX = w * 0.62, dstX = w * 0.82, dstW = w * 0.16;
      const qX = gateX - w * 0.07, qY = h - 74, qW = w * 0.14;
      const speed = w * 0.11;

      spawn -= dt;
      if (spawn <= 0) {
        spawn = rand(0.5, 0.8);
        recs.push({ x: -40, y: beltY, bad: Math.random() < 0.2 ? Math.floor(Math.random() * checks.length) : -1, pii: Math.random() < 0.35, gated: false, maskedNow: false, drop: 0 });
      }

      // belt
      line(ctx, [[0, beltY + 16], [dstX, beltY + 16]], "rgba(148,163,184,0.25)", 2);
      line(ctx, [[0, beltY + 20], [dstX, beltY + 20]], "rgba(148,163,184,0.25)", 1, [3, 9], -t * speed);

      // gate
      const gy0 = 70, gy1 = beltY + 22;
      ctx.save();
      const g = ctx.createLinearGradient(gateX - 14, 0, gateX + 14, 0);
      g.addColorStop(0, "transparent"); g.addColorStop(0.5, "rgba(34,211,238,0.25)"); g.addColorStop(1, "transparent");
      ctx.fillStyle = g; ctx.fillRect(gateX - 14, gy0, 28, gy1 - gy0); ctx.restore();
      line(ctx, [[gateX, gy0], [gateX, gy1]], C.cyan, 1.5);
      const scanY = gy0 + ((t * 120) % (gy1 - gy0));
      line(ctx, [[gateX - 16, scanY], [gateX + 16, scanY]], C.cyan, 2);
      text(ctx, "QUALITY GATE", gateX, 18, { color: C.cyan, size: f, weight: 700, align: "center" });

      // check list
      flashT -= dt;
      const cw = Math.min(118, w * 0.17);
      checks.forEach((c, i) => {
        const start = Math.max(8, Math.min(w - checks.length * cw - 8, gateX - (checks.length * cw) / 2));
        const cx = start + i * cw + cw / 2;
        const active = flashT > 0 && (flashOk || flash === i);
        const col = active ? (flashOk ? C.green : C.red) : C.dim;
        ctx.save(); rr(ctx, cx - cw / 2 + 3, 32, cw - 6, 22, 6);
        ctx.fillStyle = active ? col + "22" : "rgba(148,163,184,0.05)"; ctx.fill();
        ctx.strokeStyle = col; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.restore();
        text(ctx, c, cx, 43, { color: active ? col : C.muted, size: f - 2.5, align: "center" });
      });

      // mask station
      line(ctx, [[maskX, beltY - 34], [maskX, beltY + 22]], C.pink, 1.5, [3, 3]);
      text(ctx, "PII MASKING", maskX, beltY - 46, { color: C.pink, size: f - 1, weight: 700, align: "center" });

      // destinations
      box(ctx, dstX, beltY - 34, dstW, 68, { color: C.green, label: "TRUSTED", sub: "catalogued ✓", font: f, glow: 8 });
      text(ctx, "lineage: src → raw → trusted", dstX + dstW / 2, beltY + 48, { color: C.muted, size: f - 2.5, align: "center" });
      box(ctx, qX, qY, qW, 40, { color: C.red, label: "quarantine", font: f - 1, fill: "rgba(248,113,113,0.08)" });

      // records
      for (let i = recs.length - 1; i >= 0; i--) {
        const r = recs[i];
        if (!r.gated && r.x >= gateX - 17) {
          r.gated = true; flashT = 0.45; flash = r.bad; flashOk = r.bad < 0;
          if (r.bad >= 0) r.label = checks[r.bad];
        }
        if (r.gated && r.bad >= 0) {
          r.drop += dt;
          r.y = Math.min(qY + 8, r.y + dt * 140);
          r.x += (gateX - 17 - r.x) * Math.min(1, dt * 4);
          if (r.y >= qY + 8) { recs.splice(i, 1); quarantined++; continue; }
        } else r.x += speed * dt;
        if (r.pii && !r.maskedNow && r.x >= maskX - 17) { r.maskedNow = true; masked++; }
        if (r.x > dstX - 10) { recs.splice(i, 1); passed++; continue; }

        const bad = r.gated && r.bad >= 0;
        const col = bad ? C.red : r.gated ? C.green : C.muted;
        ctx.save(); rr(ctx, r.x, r.y - 12, 34, 24, 5);
        ctx.fillStyle = bad ? "rgba(248,113,113,0.15)" : "rgba(13,19,35,0.95)"; ctx.fill();
        ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
        for (let k = 0; k < 3; k++) {
          const isPii = r.pii && k === 2;
          ctx.fillStyle = isPii ? (r.maskedNow ? C.dim : C.pink) : bad && k === 1 ? C.red : C.cyan + "aa";
          ctx.fillRect(r.x + 5, r.y - 8 + k * 6, isPii && r.maskedNow ? 24 : 18 + ((k * 7) % 6), 3);
        }
        if (r.pii && r.maskedNow) text(ctx, "***", r.x + 17, r.y + 18, { color: C.pink, size: f - 3, align: "center" });
        if (bad && r.label) text(ctx, `✗ ${r.label}`, r.x + 44, r.y, { color: C.red, size: f - 2 });
      }

      text(ctx, `passed ${passed}   ·   quarantined ${quarantined}   ·   PII masked ${masked}`, w / 2, h - 14, { color: C.muted, size: f - 1, align: "center" });
    };
  }

  /* ---------------------------------------------------------
     6. CI/CD + Terraform + Kubernetes rolling deploy & autoscale
     --------------------------------------------------------- */
  function cicd() {
    const stages = ["git push", "lint · test", "docker build", "terraform apply", "deploy"];
    const CYCLE = 15;
    const shas = ["a3f9c1e", "7be20d4", "c41d9aa", "e09f3b7", "5d7a21c"];
    return (ctx, w, h, dt, t) => {
      const f = fontFor(w);
      const cyc = Math.floor(t / CYCLE), tc = t % CYCLE;
      const ver = 41 + cyc;
      const sw = w * 0.16, gap = (w - 24 - sw * 5) / 4, sy = 34, sh = 44;

      text(ctx, `commit ${shas[cyc % shas.length]} → main`, 14, 14, { color: C.muted, size: f - 1 });

      // pipeline stages: 1.1s each
      stages.forEach((s, i) => {
        const x = 12 + i * (sw + gap);
        const st = tc < i * 1.1 ? "wait" : tc < (i + 1) * 1.1 ? "run" : "ok";
        const col = st === "ok" ? C.green : st === "run" ? C.cyan : C.dim;
        box(ctx, x, sy, sw, sh, { color: col, label: (st === "ok" ? "✓ " : "") + s, font: f - 1, glow: st === "run" ? 12 : 0 });
        if (st === "run") {
          ctx.save(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.beginPath();
          ctx.arc(x + sw - 10, sy + 10, 4.5, t * 7, t * 7 + 4); ctx.stroke(); ctx.restore();
        }
        if (i < 4) {
          line(ctx, [[x + sw, sy + sh / 2], [x + sw + gap, sy + sh / 2]], st === "ok" ? "rgba(74,222,128,0.5)" : C.line, 1.4);
          if (tc > (i + 1) * 1.1 - 0.3 && tc < (i + 1) * 1.1 + 0.1) {
            const p = clamp01((tc - ((i + 1) * 1.1 - 0.3)) / 0.4);
            dot(ctx, x + sw + gap * p, sy + sh / 2, 3, C.cyan, 10);
          }
        }
      });

      // cluster
      const cx = 12, cyy = sy + sh + 40, cw = w - 24, ch = h - cyy - 16;
      ctx.save(); rr(ctx, cx, cyy, cw, ch, 14); ctx.fillStyle = "rgba(34,211,238,0.03)"; ctx.fill();
      ctx.setLineDash([5, 5]); ctx.strokeStyle = "rgba(34,211,238,0.35)"; ctx.stroke(); ctx.restore();
      text(ctx, "EKS cluster  ·  ns: data-platform  ·  deployment: etl-workers", cx + 14, cyy + 18, { color: C.cyan, size: f - 1, weight: 600 });
      // deploy arrow
      line(ctx, [[12 + 4 * (sw + gap) + sw / 2, sy + sh], [12 + 4 * (sw + gap) + sw / 2, cyy]], tc > 5.5 ? C.green : C.line, 1.4, [4, 4], -t * 20);

      // pod state as a function of time
      const base = 4, slots = 8;
      const roll = clamp01((tc - 5.5) / 3);            // rolling update progress
      const upgraded = Math.floor(roll * base + 1e-6);
      const scaleUp = clamp01((tc - 9) / 1.6), scaleDown = clamp01((tc - 12.8) / 1.4);
      const extra = Math.round(3 * scaleUp) - Math.round(3 * scaleDown);
      const load = 0.35 + 0.55 * scaleUp - 0.55 * scaleDown;

      const gridX = cx + 16, gridY = cyy + 38, pw = Math.min(110, (cw - 170) / 4 - 10), ph = Math.min(52, (ch - 60) / 2 - 10);
      for (let s = 0; s < slots; s++) {
        const px = gridX + (s % 4) * (pw + 10), py = gridY + Math.floor(s / 4) * (ph + 10);
        let state = "empty", v = ver;
        if (s < base) {
          if (tc < 5.5) { state = "run"; v = ver - 1; }
          else if (s < upgraded) state = "run";
          else if (s === upgraded && roll < 1) { const local = roll * base - upgraded; state = local < 0.5 ? "create" : "term"; v = local < 0.5 ? ver : ver - 1; }
          else { state = "run"; v = ver - 1; }
        } else if (s < base + extra) state = "run";
        else if (s < base + 3 && scaleUp > 0 && scaleDown < 1 && s === base + extra) state = scaleDown > 0 ? "term" : "create";

        ctx.save(); rr(ctx, px, py, pw, ph, 8);
        if (state === "empty") { ctx.setLineDash([3, 4]); ctx.strokeStyle = "rgba(148,163,184,0.12)"; ctx.stroke(); ctx.restore(); continue; }
        const col = state === "create" ? C.amber : state === "term" ? C.red : v === ver ? C.cyan : C.violet;
        ctx.fillStyle = col + "18"; ctx.fill(); ctx.strokeStyle = col; ctx.globalAlpha = state === "term" ? 0.5 + 0.5 * Math.sin(t * 12) : 1; ctx.stroke(); ctx.restore();
        text(ctx, "etl-pod", px + 10, py + ph / 2 - 8, { color: C.text, size: f - 1.5, weight: 600 });
        text(ctx, state === "create" ? "creating…" : state === "term" ? "terminating" : `v${v} · running`, px + 10, py + ph / 2 + 8, { color: col, size: f - 2.5 });
      }

      // HPA meter
      const mx = cx + cw - 130, my = gridY, mh = ph * 2 + 10;
      text(ctx, "HPA · cpu", mx + 50, my - 10, { color: C.muted, size: f - 2.5, align: "center" });
      ctx.save(); rr(ctx, mx + 36, my, 28, mh, 6); ctx.fillStyle = "rgba(148,163,184,0.08)"; ctx.fill(); ctx.restore();
      const lh = mh * load;
      ctx.save(); rr(ctx, mx + 36, my + mh - lh, 28, lh, 6);
      ctx.fillStyle = load > 0.7 ? C.amber : C.green; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10; ctx.fill(); ctx.restore();
      text(ctx, `${Math.round(load * 100)}%`, mx + 50, my + mh + 14, { color: C.text, size: f - 1.5, align: "center" });
      text(ctx, `replicas ${base + extra}`, mx + 50, my + mh + 30, { color: C.muted, size: f - 2.5, align: "center" });
    };
  }

  /* ---------------------------------------------------------
     Tab wiring
     --------------------------------------------------------- */
  const concepts = [
    {
      tab: "Lakehouse ELT", make: lakehouse,
      title: "Layered lakehouse: raw → trusted → curated",
      body: "Sources land untouched in RAW so you can always replay. They're validated and deduplicated into TRUSTED, then modelled with dbt into CURATED, analytics-ready datasets. Bad records are quarantined, not silently dropped.",
      prod: "At Norstella I built automated ingestion and transformation frameworks across raw, trusted and curated layers on Snowflake, Redshift and PostgreSQL.",
      chips: ["Snowflake", "Redshift", "dbt", "AWS Glue", "S3"],
      legend: [[C.dim, "landing"], [C.amber, "raw"], [C.cyan, "trusted"], [C.violet, "curated"], [C.green, "served"], [C.red, "quarantined"]],
    },
    {
      tab: "Batch vs Streaming", make: latency,
      title: "Batch, near-real-time and streaming",
      body: "Here the same event stream feeds three architectures. Batch buffers for hours, which is cheap and simple. Micro-batch lands data in minutes. Streaming processes every event as it arrives. Watch the freshness counters: choosing a tier means trading cost against latency.",
      prod: "I design and operate all three tiers in production, matching each use case to the latency it actually needs.",
      chips: ["Spark", "Glue", "Airflow", "Event streams"],
      legend: [[C.text, "event"], [C.violet, "batch flush"], [C.cyan, "micro-batch"], [C.green, "stream record"]],
    },
    {
      tab: "Airflow DAGs", make: airflow,
      title: "Orchestration with Airflow",
      body: "A DAG declares dependencies, and the scheduler runs each task once its upstreams succeed. Tasks with no dependency between them run in parallel. Transient failures retry automatically without re-running work that already succeeded, which keeps pipelines idempotent and observable.",
      prod: "Airflow orchestrates my real-time, near-real-time and batch architectures, from ingestion through dbt models to ML and GenAI feeds.",
      chips: ["Apache Airflow", "dbt", "Python", "SLAs", "Retries"],
      legend: [[C.dim, "none"], [C.muted, "queued"], [C.cyan, "running"], [C.amber, "up_for_retry"], [C.green, "success"]],
    },
    {
      tab: "Spark Internals", make: spark,
      title: "Distributed processing with Spark",
      body: "Spark splits data into partitions that executors process in parallel. Narrow transformations stay inside a partition. Wide ones like groupBy force a shuffle, where records move across the network by key. That shuffle is where most tuning effort goes.",
      prod: "I run Spark on AWS Glue for large-scale transformations, and I think about partitions and shuffles when designing jobs for cost and speed.",
      chips: ["PySpark", "AWS Glue", "Partitioning", "Shuffle", "Parquet"],
      legend: [[C.cyan, "key A"], [C.pink, "key B"], [C.amber, "key C / straggler"], [C.green, "complete"]],
    },
    {
      tab: "Quality & Governance", make: quality,
      title: "Data quality, privacy and lineage",
      body: "Every record passes contract checks: schema, nulls, uniqueness, accepted values and freshness. Failures go to quarantine with a reason. PII is masked before it reaches consumers, and lineage plus a catalogue make every dataset traceable.",
      prod: "I led data governance and security work at Norstella, covering data cataloguing, access controls and lineage tracking for compliance and traceability.",
      chips: ["dbt tests", "Data contracts", "PII masking", "RBAC", "Lineage"],
      legend: [[C.cyan, "field"], [C.pink, "PII field"], [C.green, "passed"], [C.red, "failed check"]],
    },
    {
      tab: "CI/CD + Kubernetes", make: cicd,
      title: "Pipelines as code, deployed to EKS",
      body: "A push to main triggers tests, builds a Docker image, applies Terraform and rolls new pods out one at a time with zero downtime. When load rises, the Horizontal Pod Autoscaler adds workers and removes them again when it falls.",
      prod: "I implemented containerised, parallelised ETL/ELT on Amazon EKS, with deployment and configuration automated through CI/CD and Terraform. This website deploys the same way via GitHub Actions.",
      chips: ["Docker", "Kubernetes / EKS", "Terraform", "GitLab CI", "Azure DevOps"],
      legend: [[C.violet, "old version"], [C.cyan, "new version"], [C.amber, "creating"], [C.red, "terminating"]],
    },
  ];

  const tabsEl = document.getElementById("labTabs");
  const infoEl = document.getElementById("labInfo");
  const legendEl = document.getElementById("labLegend");
  const canvas = document.getElementById("labCanvas");
  const scene = createScene(canvas, concepts[0].make());

  concepts.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "lab__tab"; b.setAttribute("role", "tab"); b.id = "lab-tab-" + i;
    b.setAttribute("aria-controls", "labInfo");
    b.innerHTML = `<span class="n">0${i + 1}</span>${c.tab}`;
    b.addEventListener("click", () => select(i));
    tabsEl.appendChild(b);
  });
  tabsEl.addEventListener("keydown", (e) => {
    const tabs = [...tabsEl.children], cur = tabs.indexOf(document.activeElement);
    if (cur < 0) return;
    let n = null;
    if (e.key === "ArrowRight") n = (cur + 1) % tabs.length;
    if (e.key === "ArrowLeft") n = (cur - 1 + tabs.length) % tabs.length;
    if (n !== null) { e.preventDefault(); tabs[n].focus(); select(n); }
  });

  function select(i) {
    const c = concepts[i];
    [...tabsEl.children].forEach((b, k) => { b.setAttribute("aria-selected", String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    infoEl.setAttribute("aria-labelledby", "lab-tab-" + i);
    infoEl.innerHTML = `<div class="fade-in">
      <h3>${c.title}</h3>
      <p>${c.body}</p>
      <div class="prod"><span>// in production</span>${c.prod}</div>
      <div class="chips">${c.chips.map((x) => `<span>${x}</span>`).join("")}</div>
    </div>`;
    legendEl.innerHTML = c.legend.map(([col, l]) => `<span><i style="background:${col};box-shadow:0 0 8px ${col}"></i>${l}</span>`).join("");
    scene.setFrame(c.make());
  }
  infoEl.setAttribute("role", "tabpanel");
  select(0);
})();
