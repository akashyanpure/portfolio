/* =========================================================
   AI section — next-token lab + animated RAG pipeline
   ========================================================= */
(function () {
  "use strict";
  const { createScene, C, box, text, dot, line, ease, clamp01, rr } = window.DE;

  /* ---------------- next-token prediction ---------------- */
  const prompts = [
    {
      label: "Reliable AI starts with…",
      tokens: ["Reliable", " AI", " starts", " with", " reliable"],
      cands: [[" data", 4.1], [" pipelines", 3.3], [" engineers", 2.6], [" evaluation", 2.0], [" luck", 0.2]],
    },
    {
      label: "The best hire for your data team is…",
      tokens: ["The", " best", " hire", " for", " your", " data", " team", " is"],
      cands: [[" Akash", 3.7], [" someone", 3.0], [" experienced", 2.6], [" a", 2.0], [" available", 1.3]],
    },
    {
      label: "SELECT * FROM",
      tokens: ["SELECT", " *", " FROM"],
      cands: [[" orders", 3.0], [" events", 2.8], [" users", 2.6], [" customers", 2.3], [" prod", 0.4]],
    },
  ];

  const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const tokenId = (s) => 100 + (hash(s) % 50000);

  const picker = document.getElementById("promptPicker");
  const tokEl = document.getElementById("attnTokens");
  const svg = document.getElementById("attnSvg");
  const attnBox = document.getElementById("attn");
  const probsEl = document.getElementById("probs");
  const temp = document.getElementById("temp");
  const tempOut = document.getElementById("tempOut");
  const sampleBtn = document.getElementById("sampleBtn");

  let current = 0, tokens = [], focus = 0, picked = -1;

  prompts.forEach((p, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("role", "radio"); b.textContent = p.label;
    b.addEventListener("click", () => loadPrompt(i));
    picker.appendChild(b);
  });

  function loadPrompt(i) {
    current = i; picked = -1;
    [...picker.children].forEach((b, k) => b.setAttribute("aria-checked", String(k === i)));
    tokens = prompts[i].tokens.slice();
    focus = tokens.length - 1;
    sampleBtn.textContent = "Sample token";
    renderTokens(); renderProbs();
  }

  function renderTokens(newIdx = -1) {
    tokEl.innerHTML = "";
    tokens.forEach((t, i) => {
      const s = document.createElement("span");
      s.className = "tok" + (i === newIdx ? " is-new" : "");
      s.tabIndex = 0;
      s.innerHTML = `${t.replace(/ /g, "·")}<span class="id">#${tokenId(t)}</span>`;
      const set = () => { focus = i; drawAttention(); };
      s.addEventListener("mouseenter", set); s.addEventListener("focus", set);
      tokEl.appendChild(s);
    });
    requestAnimationFrame(drawAttention);
  }

  /** Causal self-attention weights for the focus token (toy but deterministic). */
  function attentionFor(i) {
    const scores = [];
    for (let j = 0; j <= i; j++) {
      const base = (hash(tokens[i] + "|" + tokens[j]) % 1000) / 1000;
      const recency = j === i ? 0.6 : j === i - 1 ? 0.9 : 0;
      const content = /data|AI|reliable|Reliable|team|hire|FROM|best/.test(tokens[j]) ? 1.1 : 0;
      scores.push(base * 1.6 + recency + content);
    }
    const m = Math.max(...scores), ex = scores.map((s) => Math.exp((s - m) * 1.6)), z = ex.reduce((a, b) => a + b, 0);
    return ex.map((e) => e / z);
  }

  function drawAttention() {
    const box0 = attnBox.getBoundingClientRect();
    const chips = [...tokEl.children];
    chips.forEach((c, i) => c.classList.toggle("is-focus", i === focus));
    if (!chips[focus]) return;
    const weights = attentionFor(focus);
    const fr = chips[focus].getBoundingClientRect();
    const fx = fr.left + fr.width / 2 - box0.left, fy = fr.top - box0.top;
    let out = "";
    weights.forEach((wt, j) => {
      if (j === focus) return;
      const r = chips[j].getBoundingClientRect();
      const x = r.left + r.width / 2 - box0.left, y = r.top - box0.top;
      const lift = Math.min(62, 16 + Math.abs(fx - x) * 0.28);
      const cy = Math.min(y, fy) - lift;
      out += `<path d="M${x},${y} Q${(x + fx) / 2},${cy} ${fx},${fy}" fill="none" stroke="url(#ag)" stroke-width="${(1 + wt * 9).toFixed(2)}" stroke-linecap="round" opacity="${(0.25 + wt * 1.6).toFixed(2)}"/>`;
      // label at the true curve midpoint so near and far arcs don't collide
      if (wt > 0.14) out += `<text x="${(x + fx) / 2}" y="${(y + fy) / 4 + cy / 2 - 4}" fill="#e7edf7" font-size="10" font-family="JetBrains Mono, monospace" text-anchor="middle">${wt.toFixed(2)}</text>`;
    });
    svg.innerHTML = `<defs><linearGradient id="ag" x1="0" x2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>` + out;
  }
  addEventListener("resize", () => requestAnimationFrame(drawAttention));

  function softmax(T) {
    const c = prompts[current].cands;
    const ex = c.map(([, l]) => Math.exp(l / T)), z = ex.reduce((a, b) => a + b, 0);
    return ex.map((e) => e / z);
  }

  function renderProbs() {
    const T = +temp.value;
    tempOut.textContent = T.toFixed(2) + (T < 0.4 ? " · near-greedy" : T > 1.3 ? " · creative / risky" : " · balanced");
    const p = softmax(T), c = prompts[current].cands;
    if (probsEl.children.length !== c.length) {
      probsEl.innerHTML = c.map(() => `<div class="prob"><span class="prob__label"></span><span class="prob__bar"><span class="prob__fill" style="width:0"></span></span><span class="prob__val"></span></div>`).join("");
    }
    [...probsEl.children].forEach((row, i) => {
      row.classList.toggle("is-picked", i === picked);
      row.querySelector(".prob__label").textContent = c[i][0].replace(/ /g, "·");
      row.querySelector(".prob__fill").style.width = (p[i] * 100).toFixed(1) + "%";
      row.querySelector(".prob__val").textContent = (p[i] * 100).toFixed(1) + "%";
    });
  }

  temp.addEventListener("input", renderProbs);
  sampleBtn.addEventListener("click", () => {
    if (picked >= 0) { loadPrompt(current); return; }
    const p = softmax(+temp.value);
    let r = Math.random(), i = 0;
    while (i < p.length - 1 && (r -= p[i]) > 0) i++;
    picked = i;
    tokens.push(prompts[current].cands[i][0]);
    focus = tokens.length - 1;
    renderTokens(tokens.length - 1);
    renderProbs();
    sampleBtn.textContent = "Reset ↺";
  });
  loadPrompt(0);

  /* ---------------- RAG pipeline animation ---------------- */
  const docs = [
    { n: "runbook.md", c: C.cyan, center: [0.28, 0.33] },
    { n: "dbt_docs.html", c: C.violet, center: [0.74, 0.3] },
    { n: "incident.pdf", c: C.pink, center: [0.45, 0.76] },
  ];
  const CHUNKS = 4, CYCLE = 17;
  // deterministic jitter for point positions
  const jitter = (k, a) => (((Math.sin(k * 12.9898 + a * 78.233) * 43758.5453) % 1) + 1) % 1 - 0.5;
  const chunks = [];
  docs.forEach((d, di) => {
    for (let j = 0; j < CHUNKS; j++) {
      const k = di * CHUNKS + j;
      chunks.push({ d: di, k, px: d.center[0] + jitter(k, 1) * 0.2, py: d.center[1] + jitter(k, 2) * 0.24 });
    }
  });
  const query = [0.33, 0.47];
  const nearest = chunks
    .map((c) => ({ c, dist: Math.hypot(c.px - query[0], c.py - query[1]) }))
    .sort((a, b) => a.dist - b.dist).slice(0, 3)
    .map((o, i) => ({ ...o, cos: (0.93 - i * 0.04 - o.dist * 0.1).toFixed(2) }));
  const QUESTION = "How do I backfill a failed DAG?";
  const ANSWER = "Clear the failed task instances, then run `airflow dags backfill` over the missed date range. Keep tasks idempotent so re-runs are safe. [1][3]";

  const stepsEl = document.getElementById("ragSteps").children;
  let lastPhase = -1;
  function setPhase(ph) {
    if (ph === lastPhase) return;
    lastPhase = ph;
    [...stepsEl].forEach((li, i) => { li.classList.toggle("is-active", i === ph); li.classList.toggle("is-done", i < ph); });
  }

  createScene(document.getElementById("ragCanvas"), (ctx, w, h, dt, t) => {
    const f = w < 600 ? 9.5 : 10.5;
    const tc = t % CYCLE;
    const fade = tc > CYCLE - 0.6 ? (CYCLE - tc) / 0.6 : 1;
    ctx.globalAlpha = fade;

    const phase = tc < 2.6 ? 0 : tc < 5.4 ? 1 : tc < 6.8 ? 2 : tc < 9.6 ? 3 : 4;
    setPhase(phase);

    // regions
    const space = { x: w * 0.47, y: 22, w: w * 0.5, h: 238 };
    const docX = w * 0.03, docW = Math.max(46, w * 0.08), docH = 58;
    const docY = (i) => 30 + i * 78;
    const colX = w * 0.17, colW = w * 0.085, chH = 13;
    const colY = (k) => 26 + k * 19 + Math.floor(k / CHUNKS) * 4;
    const emb = { x: w * 0.29, y: 104, w: w * 0.14, h: 58 };
    const SP = (c) => [space.x + c[0] * space.w, space.y + c[1] * space.h];
    const llm = { x: w * 0.55, y: 280, w: w * 0.16, h: 46 };
    const qb = { x: w * 0.03, y: 282, w: w * 0.44, h: 42 };
    const ans = { x: w * 0.03, y: 338, w: w * 0.94, h: h - 348 };

    // vector space frame
    ctx.save(); rr(ctx, space.x, space.y, space.w, space.h, 12); ctx.fillStyle = "rgba(34,211,238,0.025)"; ctx.fill();
    ctx.strokeStyle = C.line; ctx.stroke(); ctx.clip();
    ctx.strokeStyle = "rgba(148,163,184,0.06)";
    for (let gx = 0; gx < space.w; gx += 24) { ctx.beginPath(); ctx.moveTo(space.x + gx, space.y); ctx.lineTo(space.x + gx, space.y + space.h); ctx.stroke(); }
    for (let gy = 0; gy < space.h; gy += 24) { ctx.beginPath(); ctx.moveTo(space.x, space.y + gy); ctx.lineTo(space.x + space.w, space.y + gy); ctx.stroke(); }
    ctx.restore();
    text(ctx, "embedding space · vector index", space.x + 10, space.y + 12, { color: C.muted, size: f - 1.5 });

    // documents
    docs.forEach((d, i) => {
      const y = docY(i);
      box(ctx, docX, y, docW, docH, { color: d.c, r: 6 });
      for (let l = 0; l < 4; l++) { ctx.fillStyle = d.c + "55"; ctx.fillRect(docX + 7, y + 10 + l * 10, docW - 14 - (l % 2) * 8, 3); }
      text(ctx, d.n, docX + docW / 2, y + docH + 9, { color: C.muted, size: f - 2.5, align: "center" });
    });

    // embedding model
    box(ctx, emb.x, emb.y, emb.w, emb.h, { color: C.violet, label: "embedding", sub: "model", font: f, glow: phase === 1 || phase === 3 ? 14 : 0 });
    if (phase === 1) text(ctx, "text → [0.12, -0.83, …]", emb.x + emb.w / 2, emb.y + emb.h + 12, { color: C.violet, size: f - 2.5, align: "center" });

    // chunks: split, embed, settle
    chunks.forEach((c) => {
      const d = docs[c.d];
      const tSplit = clamp01((tc - 0.3 - c.k * 0.12) / 0.8);
      const tEmb = (tc - 2.6 - c.k * 0.2) / 0.55;   // 0..1 to model, 1..2 to space
      const [px, py] = SP([c.px, c.py]);
      if (tEmb < 0) {
        if (tSplit <= 0) return;
        const sx = docX + docW / 2, sy = docY(c.d) + docH / 2;
        const p = ease(tSplit);
        const x = sx + (colX - sx) * p, y = sy + (colY(c.k) - sy) * p;
        ctx.fillStyle = d.c + "33"; ctx.strokeStyle = d.c;
        rr(ctx, x, y, colW, chH, 3); ctx.fill(); ctx.stroke();
        text(ctx, `chunk ${c.k + 1}`, x + colW / 2, y + chH / 2 + 0.5, { color: C.text, size: f - 3, align: "center" });
      } else if (tEmb < 2) {
        const a = tEmb < 1 ? [colX + colW, colY(c.k) + chH / 2] : [emb.x + emb.w / 2, emb.y + emb.h / 2];
        const b = tEmb < 1 ? [emb.x + emb.w / 2, emb.y + emb.h / 2] : [px, py];
        const p = ease(tEmb % 1);
        dot(ctx, a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, 3, d.c, 10);
      } else {
        dot(ctx, px, py, 3.6, d.c, phase === 2 ? 14 : 6);
      }
    });

    // cluster halos while indexing
    if (phase >= 2) {
      docs.forEach((d) => {
        const [cx, cy] = SP(d.center);
        ctx.save(); ctx.globalAlpha = fade * 0.5;
        ctx.strokeStyle = d.c; ctx.setLineDash([3, 5]);
        ctx.beginPath(); ctx.ellipse(cx, cy, space.w * 0.13, space.h * 0.17, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      });
    }

    // question
    if (tc > 6.8) {
      box(ctx, qb.x, qb.y, qb.w, qb.h, { color: C.text, label: "Q: " + QUESTION, font: f - 1, align: "left", fill: "rgba(231,237,247,0.05)" });
    }
    // query embedding + retrieval
    const [qx, qy] = SP(query);
    if (tc > 7.2) {
      const p = clamp01((tc - 7.2) / 1.1);
      if (p < 1) {
        const a = p < 0.5 ? [qb.x + qb.w * 0.6, qb.y] : [emb.x + emb.w / 2, emb.y + emb.h];
        const b = p < 0.5 ? [emb.x + emb.w / 2, emb.y + emb.h] : [qx, qy];
        const k = ease((p % 0.5) * 2);
        dot(ctx, a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 4, "#fff", 14);
      } else {
        const r = 5 + Math.sin(t * 6) * 1.2;
        ctx.save(); ctx.translate(qx, qy); ctx.rotate(t);
        ctx.fillStyle = "#fff"; ctx.shadowColor = "#fff"; ctx.shadowBlur = 16;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) { const rad = i % 2 ? r * 0.45 : r * 1.4, an = (i * Math.PI) / 5; ctx.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); }
        ctx.closePath(); ctx.fill(); ctx.restore();
        text(ctx, "query", qx + 12, qy - 10, { color: C.text, size: f - 2 });
        const lp = clamp01((tc - 8.3) / 0.8);
        nearest.forEach((n, i) => {
          const [nx, ny] = SP([n.c.px, n.c.py]);
          line(ctx, [[qx, qy], [qx + (nx - qx) * lp, qy + (ny - qy) * lp]], "rgba(255,255,255,0.75)", 1.2, [3, 3]);
          if (lp >= 1) {
            ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(nx, ny, 7, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
            text(ctx, `[${i + 1}] cos ${n.cos}`, nx + 10, ny + 10, { color: C.text, size: f - 2.5 });
          }
        });
      }
    }

    // generation
    if (tc > 9.6) {
      box(ctx, llm.x, llm.y, llm.w, llm.h, { color: C.green, label: "LLM", sub: "context + question", font: f, glow: 10 + Math.sin(t * 6) * 6 });
      const fp = clamp01((tc - 9.6) / 1.2);
      if (fp < 1) {
        nearest.forEach((n, i) => {
          const [nx, ny] = SP([n.c.px, n.c.py]);
          const k = ease(clamp01(fp * 1.3 - i * 0.12));
          dot(ctx, nx + (llm.x + llm.w / 2 - nx) * k, ny + (llm.y - ny) * k, 3.4, docs[n.c.d].c, 12);
        });
        line(ctx, [[qb.x + qb.w, qb.y + qb.h / 2], [llm.x, llm.y + llm.h / 2]], C.line, 1, [4, 4], -t * 30);
      }
      // answer typing
      const chars = Math.floor(clamp01((tc - 10.9) / 4.2) * ANSWER.length);
      ctx.save(); rr(ctx, ans.x, ans.y, ans.w, ans.h, 10); ctx.fillStyle = "rgba(74,222,128,0.06)"; ctx.fill();
      ctx.strokeStyle = "rgba(74,222,128,0.4)"; ctx.stroke(); ctx.restore();
      if (tc > 10.9) {
        text(ctx, "A:", ans.x + 10, ans.y + 15, { color: C.green, size: f - 1, weight: 700 });
        // wrap
        ctx.font = `500 ${f - 1}px "JetBrains Mono", monospace`;
        const maxW = ans.w - 44, words = ANSWER.slice(0, chars).split(" "), lines = [];
        let cur = "";
        words.forEach((wd) => { const tryS = cur ? cur + " " + wd : wd; if (ctx.measureText(tryS).width > maxW) { lines.push(cur); cur = wd; } else cur = tryS; });
        lines.push(cur);
        lines.slice(0, 3).forEach((l, i) => text(ctx, l + (i === lines.length - 1 && chars < ANSWER.length ? "▌" : ""), ans.x + 34, ans.y + 15 + i * 15, { color: C.text, size: f - 1 }));
        if (chars >= ANSWER.length) text(ctx, "grounded ✓  hallucination risk ↓", ans.x + ans.w - 10, ans.y + ans.h - 10, { color: C.green, size: f - 2.5, align: "right" });
      }
    }
    ctx.globalAlpha = 1;
  });
})();
