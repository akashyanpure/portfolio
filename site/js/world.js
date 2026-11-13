/* =========================================================
   World — a fixed WebGL particle field that morphs between
   data-engineering shapes as the visitor scrolls.
   Shapes: 0 galaxy · 1 lakehouse layers · 2 Airflow DAG ·
           3 Spark partitions · 4 warehouse · 5 neural net · 6 ring
   API: window.World.setTarget(v) / setOpacity(v) / setZoom(v)
   ========================================================= */
(function () {
  "use strict";
  const canvas = document.getElementById("world");
  if (!window.THREE || !canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  if (!renderer.getContext()) return;

  const reduced = window.DE && window.DE.reducedMotion;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const N = small ? 3200 : 8000; // fewer, finer dots on phones so shapes stay crisp
  const TAU = Math.PI * 2;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
  camera.position.set(0, 0, 13);
  const group = new THREE.Group();
  scene.add(group);

  /* ---------- deterministic random ---------- */
  let seed = 7;
  const R = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const gauss = () => { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
  const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
  const K = { cyan: hex(0x22d3ee), violet: hex(0xa78bfa), pink: hex(0xf472b6), amber: hex(0xfbbf24), green: hex(0x4ade80), blue: hex(0x60a5fa), white: hex(0xe7edf7), indigo: hex(0x818cf8) };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const dim = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const sphereDir = () => { const z = R() * 2 - 1, a = R() * TAU, r = Math.sqrt(1 - z * z); return [Math.cos(a) * r, Math.sin(a) * r, z]; };

  /* ---------- shape generators: (i) => [x,y,z, r,g,b] ---------- */
  function galaxy(i) {
    if (i < N * 0.86) {
      const arm = i % 3, r = Math.pow(R(), 0.65) * 6.6;
      const ang = (arm * TAU) / 3 + r * 0.78 + gauss() * 0.22 * (1 + r * 0.1);
      const y = gauss() * 0.22 * (1.2 - r / 7);
      const c = r < 3.4 ? mix(K.white, K.cyan, r / 3.4) : mix(K.cyan, r > 5 ? K.pink : K.violet, (r - 3.4) / 3.2);
      return [Math.cos(ang) * r, y, Math.sin(ang) * r, ...c];
    }
    const d = sphereDir(), rr = 8 + R() * 6;
    return [d[0] * rr, d[1] * rr, d[2] * rr, ...dim(K.indigo, 0.6)];
  }

  function layers(i) {
    const ys = [2.1, 0, -2.1], cols = [K.amber, K.cyan, K.violet];
    if (R() < 0.13) { // vertical streams flowing between layers
      const col = Math.floor(R() * 10), row = Math.floor(R() * 4);
      const x = -3.4 + col * 0.76, z = -1.6 + row * 1.07, y = 2.1 - R() * 4.2;
      return [x, y, z, ...dim(mix(K.white, K.cyan, R()), 0.85)];
    }
    const k = i % 3;
    let x = (R() - 0.5) * 7.8, z = (R() - 0.5) * 4.8;
    const edge = R() < 0.22;
    if (edge) { if (R() < 0.5) x = Math.sign(x) * 3.9; else z = Math.sign(z) * 2.4; }
    x = Math.round(x / 0.26) * 0.26 + gauss() * 0.02;
    z = Math.round(z / 0.26) * 0.26 + gauss() * 0.02;
    const y = ys[k] + Math.sin(x * 0.7 + z) * 0.05;
    return [x, y, z, ...(edge ? mix(cols[k], K.white, 0.35) : dim(cols[k], 0.8))];
  }

  const dagNodes = [[-5.2, 1.5, 0], [-5.2, -1.5, 0.6], [-2.6, 0, 0], [0, 0, -0.4], [2.6, 1.8, 0.4], [2.6, -1.8, -0.4], [5.2, 1.8, 0], [5.2, -1.8, 0.2]];
  const dagEdges = [[0, 2], [1, 2], [2, 3], [3, 4], [3, 5], [4, 6], [5, 7]];
  const dagCols = [K.green, K.green, K.green, K.cyan, K.cyan, K.cyan, K.violet, K.violet];
  function dag(i) {
    if (i < N * 0.52) {
      const n = i % dagNodes.length, d = sphereDir(), r = 0.55 * Math.cbrt(R());
      const p = dagNodes[n];
      const shell = r > 0.45;
      return [p[0] + d[0] * r * 1.25, p[1] + d[1] * r, p[2] + d[2] * r, ...(shell ? mix(dagCols[n], K.white, 0.3) : dim(dagCols[n], 0.75))];
    }
    const e = dagEdges[i % dagEdges.length], a = dagNodes[e[0]], b = dagNodes[e[1]], t = R();
    const dx = b[0] - a[0];
    const p0 = a, p1 = [a[0] + dx * 0.5, a[1], a[2]], p2 = [b[0] - dx * 0.5, b[1], b[2]], p3 = b, u = 1 - t;
    const P = [0, 1, 2].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
    return [P[0] + gauss() * 0.025, P[1] + gauss() * 0.025, P[2] + gauss() * 0.025, ...dim(mix(K.violet, K.cyan, t), 0.7)];
  }

  function cubes(i) {
    const xs = [-4.3, -1.45, 1.45, 4.3], ys = [-1.45, 1.45], zs = [-1.45, 1.45];
    const c = i % 16, cx = xs[c % 4], cy = ys[(c >> 2) % 2], cz = zs[(c >> 3) % 2];
    const s = 0.82, col = [K.cyan, K.pink, K.amber][c % 3];
    let x, y, z;
    if (R() < 0.55) { // edges → crisp wireframe
      const e = Math.floor(R() * 12), t = R() * 2 - 1, axis = e >> 2, sa = e & 1 ? 1 : -1, sb = e & 2 ? 1 : -1;
      if (axis === 0) { x = t; y = sa; z = sb; } else if (axis === 1) { x = sa; y = t; z = sb; } else { x = sa; y = sb; z = t; }
      return [cx + x * s, cy + y * s, cz + z * s, ...mix(col, K.white, 0.25)];
    }
    const f = Math.floor(R() * 6), u = R() * 2 - 1, v = R() * 2 - 1, sg = f & 1 ? 1 : -1;
    if (f < 2) { x = sg; y = u; z = v; } else if (f < 4) { x = u; y = sg; z = v; } else { x = u; y = v; z = sg; }
    return [cx + x * s, cy + y * s, cz + z * s, ...dim(col, 0.5)];
  }

  function warehouse(i) {
    const disks = [2.2, 0, -2.2], rad = 3, hh = 0.55;
    const k = i % 3, cy = disks[k], a = R() * TAU;
    const col = mix(K.blue, K.cyan, k / 2);
    const q = R();
    if (q < 0.5) { // side wall
      const y = cy + (R() * 2 - 1) * hh;
      return [Math.cos(a) * rad, y, Math.sin(a) * rad, ...dim(col, 0.65)];
    }
    if (q < 0.78) { // rims
      const y = cy + (R() < 0.5 ? hh : -hh);
      return [Math.cos(a) * rad, y + gauss() * 0.02, Math.sin(a) * rad, ...mix(col, K.white, 0.4)];
    }
    // top cap with a snowflake-like six-spoke pattern on the uppermost disk
    if (k === 0 && R() < 0.6) {
      const spoke = Math.floor(R() * 6), t = R() * rad * 0.85, ang = (spoke * TAU) / 6;
      const br = t > 0.9 && R() < 0.4 ? (R() < 0.5 ? 0.5 : -0.5) : 0;
      const bt = br ? R() * 0.6 : 0;
      return [Math.cos(ang) * t + Math.cos(ang + br) * bt, cy + hh, Math.sin(ang) * t + Math.sin(ang + br) * bt, ...mix(K.cyan, K.white, 0.5)];
    }
    const r = Math.sqrt(R()) * rad;
    return [Math.cos(a) * r, cy + hh, Math.sin(a) * r, ...dim(col, 0.4)];
  }

  const nnSizes = [5, 8, 8, 5, 3];
  const nnNodes = nnSizes.map((n, l) => {
    const x = -5.6 + (l * 11.2) / (nnSizes.length - 1);
    return Array.from({ length: n }, (_, j) => [x, (j - (n - 1) / 2) * 0.95, Math.sin(j * 1.7 + l) * 0.7]);
  });
  function neural(i) {
    if (i < N * 0.38) {
      const l = i % nnSizes.length, nodes = nnNodes[l], p = nodes[Math.floor(R() * nodes.length)];
      const d = sphereDir(), r = 0.22 * Math.cbrt(R());
      return [p[0] + d[0] * r, p[1] + d[1] * r, p[2] + d[2] * r, ...mix(K.pink, K.violet, l / 4)];
    }
    const l = Math.floor(R() * (nnSizes.length - 1));
    const a = nnNodes[l][Math.floor(R() * nnSizes[l])], b = nnNodes[l + 1][Math.floor(R() * nnSizes[l + 1])], t = R();
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, ...dim(K.cyan, 0.42)];
  }

  function ring(i) {
    if (i < N * 0.6) {
      const u = R() * TAU, v = R() * TAU, rr = 0.35 + Math.abs(gauss()) * 0.25, Rr = 5;
      return [(Rr + rr * Math.cos(v)) * Math.cos(u), rr * Math.sin(v), (Rr + rr * Math.cos(v)) * Math.sin(u), ...dim(mix(K.cyan, K.violet, (Math.sin(u) + 1) / 2), 0.9)];
    }
    const d = sphereDir(), r = 9 + R() * 9;
    return [d[0] * r, d[1] * r, d[2] * r, ...dim(mix(K.indigo, K.cyan, R()), 0.55)];
  }

  const gens = [galaxy, layers, dag, cubes, warehouse, neural, ring];
  // per-shape framing: tilt, scale, desktop x-offset (text sits left), camera distance
  const cfg = [
    { rx: 0.42, s: 0.95, ox: 0.95, z: 13 },
    { rx: 0.45, s: 0.66, ox: 1, z: 13.5 },
    { rx: 0.1, s: 0.72, ox: 1, z: 13.5 },
    { rx: 0.32, s: 0.6, ox: 1, z: 14 },
    { rx: 0.36, s: 0.74, ox: 1, z: 14 },
    { rx: 0.08, s: 0.7, ox: 1, z: 13.5 },
    { rx: 1.05, s: 1.0, ox: 0, z: 13 },
  ];

  const shapes = gens.map((g) => {
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const v = g(i); pos[i * 3] = v[0]; pos[i * 3 + 1] = v[1]; pos[i * 3 + 2] = v[2]; col[i * 3] = v[3]; col[i * 3 + 1] = v[4]; col[i * 3 + 2] = v[5]; }
    return { pos, col };
  });
  const rnd = new Float32Array(N);
  for (let i = 0; i < N; i++) rnd[i] = R();

  /* ---------- geometry + material ---------- */
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(new Float32Array(shapes[0].pos), 3);
  const colAttr = new THREE.BufferAttribute(new Float32Array(shapes[0].col), 3);
  posAttr.setUsage(THREE.DynamicDrawUsage); colAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posAttr);
  geo.setAttribute("aColor", colAttr);
  geo.setAttribute("aRand", new THREE.BufferAttribute(rnd, 1));

  const uniforms = {
    uTime: { value: 0 }, uSize: { value: 4.1 }, uPR: { value: 1 }, uFit: { value: 1 },
    uOpacity: { value: 1 }, uPulse: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aColor; attribute float aRand;
      uniform float uTime, uSize, uPR, uPulse, uFit;
      varying vec3 vColor; varying float vFade;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.78 + 0.22 * sin(uTime * 1.7 + aRand * 60.0);
        float wave = pow(max(0.0, sin(position.x * 0.8 - uTime * 2.6)), 8.0);
        float pulse = 1.0 + uPulse * 1.4 * wave;
        gl_PointSize = uSize * uPR * uFit * (0.55 + aRand * 0.9) * tw * pulse * (12.0 / -mv.z);
        vColor = aColor * 1.45 * (1.0 + uPulse * 0.8 * wave);
        vFade = smoothstep(42.0, 6.0, -mv.z);
      }`,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor; varying float vFade;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = pow(smoothstep(0.5, 0.0, d), 1.15) + smoothstep(0.16, 0.0, d) * 0.5;
        gl_FragColor = vec4(vColor, a * uOpacity * vFade);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  group.add(points);

  /* ---------- state ---------- */
  const st = { target: 0, cur: 0, opT: 1, op: 1, zoomT: 0, zoom: 0, mx: 0, my: 0, sx: 0, sy: 0 };
  addEventListener("pointermove", (e) => { st.mx = e.clientX / innerWidth - 0.5; st.my = e.clientY / innerHeight - 0.5; }, { passive: true });

  let lastW = 0, lastH = 0;
  function resize() {
    const w = innerWidth, h = innerHeight;
    // ignore mobile address-bar show/hide (height-only jitter): re-allocating the
    // WebGL buffer on every scroll causes flicker and memory churn on iOS
    if (w === lastW && Math.abs(h - lastH) < 160) return;
    lastW = w; lastH = h;
    const pr = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    uniforms.uPR.value = pr;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => x * x * (3 - 2 * x);
  let last = performance.now(), time = 0, raf = 0, lastCur = -1;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    st.cur += (st.target - st.cur) * k;
    if (Math.abs(st.target - st.cur) < 0.0005) st.cur = st.target;
    st.op += (st.opT - st.op) * (1 - Math.exp(-dt * 4));
    st.zoom += (st.zoomT - st.zoom) * (1 - Math.exp(-dt * 5));
    st.sx += (st.mx - st.sx) * (1 - Math.exp(-dt * 2.5));
    st.sy += (st.my - st.sy) * (1 - Math.exp(-dt * 2.5));

    const a = Math.min(gens.length - 1, Math.floor(st.cur)), b = Math.min(gens.length - 1, a + 1), t = st.cur - a;

    // morph positions/colours with a per-particle stagger so shapes "assemble"
    if (st.cur !== lastCur || !reduced) {
      const A = shapes[a], B = shapes[b], P = posAttr.array, Cc = colAttr.array;
      const wob = reduced ? 0 : 0.035;
      for (let i = 0; i < N; i++) {
        const d = rnd[i] * 0.4;
        const lt = t <= 0 ? 0 : t >= 1 ? 1 : smooth(Math.min(1, Math.max(0, (t - d) / 0.6)));
        const j = i * 3;
        const w1 = Math.sin(time * 0.9 + rnd[i] * 50) * wob;
        // mid-flight particles bulge outward a little for a sense of depth
        const lift = Math.sin(lt * Math.PI) * 0.9 * (rnd[i] - 0.5);
        P[j] = A.pos[j] + (B.pos[j] - A.pos[j]) * lt + w1;
        P[j + 1] = A.pos[j + 1] + (B.pos[j + 1] - A.pos[j + 1]) * lt + lift;
        P[j + 2] = A.pos[j + 2] + (B.pos[j + 2] - A.pos[j + 2]) * lt + lift * 2 - w1;
        Cc[j] = A.col[j] + (B.col[j] - A.col[j]) * lt;
        Cc[j + 1] = A.col[j + 1] + (B.col[j + 1] - A.col[j + 1]) * lt;
        Cc[j + 2] = A.col[j + 2] + (B.col[j + 2] - A.col[j + 2]) * lt;
      }
      posAttr.needsUpdate = true; colAttr.needsUpdate = true;
      lastCur = st.cur;
    }

    // framing
    const ca = cfg[a], cb = cfg[b], ts = smooth(t);
    const aspect = camera.aspect, wide = aspect > 1.05;
    const fit = Math.max(0.5, Math.min(1, aspect / 1.55));
    // dot size follows the shape scale, otherwise small screens turn shapes into blobs
    uniforms.uFit.value = Math.max(0.52, Math.min(1, aspect / 1.2));
    const s = lerp(ca.s, cb.s, ts) * fit;
    group.scale.setScalar(s * (wide ? 1 : 1.0));
    const ox = lerp(ca.ox, cb.ox, ts);
    group.position.x = wide ? ox * Math.min(3.5, 2.2 * aspect) : 0;
    const myA = a === 0 ? 2.6 : a === 6 ? 0 : -2.2, myB = b === 0 ? 2.6 : b === 6 ? 0 : -2.2;
    group.position.y = wide ? 0 : lerp(myA, myB, ts);
    const sway = reduced ? 0 : Math.sin(time * 0.22) * 0.35;
    group.rotation.y = sway + Math.sin(t * Math.PI) * 1.1 + st.sx * 0.5;
    group.rotation.x = lerp(ca.rx, cb.rx, ts) + st.sy * 0.25;
    if (a === 6 && !reduced) group.rotation.z = Math.sin(time * 0.15) * 0.2; else group.rotation.z *= 0.95;

    camera.position.z = lerp(ca.z, cb.z, ts) + st.zoom;
    camera.position.x = st.sx * 0.8;
    camera.position.y = -st.sy * 0.5;
    camera.lookAt(0, wide ? 0 : group.position.y * 0.2, 0);

    uniforms.uTime.value = time;
    uniforms.uOpacity.value = st.op;
    uniforms.uPulse.value = Math.max(0, 1 - Math.abs(st.cur - 5) * 1.5); // neural-net "thinking" pulse

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); stop(); canvas.style.opacity = "0"; });
  canvas.addEventListener("webglcontextrestored", () => { canvas.style.opacity = ""; start(); });
  start();

  window.World = {
    setTarget(v) { st.target = Math.max(0, Math.min(gens.length - 1, v)); },
    setOpacity(v) { st.opT = v; },
    setZoom(v) { st.zoomT = v; },
  };
  document.documentElement.classList.add("has-world");
})();
