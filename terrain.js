"use strict";
/* Cloud Sea / terrain.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- alpine terrain: every island is a small mountain landscape ---------- */
  function fbm(x, z) { var a = 0.5, s = 0, i; for (i = 0; i < 4; i++) { s += a * vnoise(x, z); x = x * 2.03 + 17.1; z = z * 2.03 + 9.7; a *= 0.5; } return s / 0.9375; }
  function ridged(x, z) { var a = 0.5, s = 0, i, v; for (i = 0; i < 4; i++) { v = 1 - Math.abs(2 * vnoise(x, z) - 1); s += a * v * v; x = x * 2.1 + 31.7; z = z * 2.1 + 13.3; a *= 0.5; } return s / 0.9375; }
  var PEAK = [0.6, 0.7, 0.62, 0.45, 1.05, 0.66, 0.8, 0.5];
  function terrainFor(c) { return c.t || (c.t = makeTerrain(c.seed, c.R, c.biome, true, c.cx === 0 && c.cz === 0)); }
  // Six island shapes: 0 single peak, 1 crater, 2 twin peaks, 3 cliff plateau, 4 long ridge, 5 lowland with a big lake
  function makeTerrain(seed, R, biome, full, home) {
    var r = mulberry((seed ^ 0x5bd1e995) >>> 0), t = { R: R, biome: biome };
    var p0 = r() * TAU, p1 = r() * TAU, p2 = r() * TAU, ox = r() * 900, oz = r() * 900;
    var ell = full ? r() * 0.26 : 0.05, ea = r() * TAU, lob = 0.5 + r() * 0.7, norm = 1 / (1 + ell);
    t.edge = function (a) { return R * norm * (1 + ell * Math.cos(2 * (a - ea))) * (0.79 + lob * (0.1 * Math.sin(a * 2 + p0) + 0.065 * Math.sin(a * 3 + p1)) + 0.04 * Math.sin(a * 6 + p2) + 0.02 * Math.sin(a * 13 + p0)); };
    var arch = !full || home ? 0 : biome === 6 ? 1 : biome === 3 ? 3 : Math.floor(r() * 6);
    if (biome === 4 && (arch === 3 || arch === 5)) arch = 2;
    t.arch = arch;
    var pa = r() * TAU, cpa = Math.cos(pa), spa = Math.sin(pa), px = cpa * R * 0.3, pz = spa * R * 0.3, side = r() < 0.5 ? 1 : -1;
    t.peakH = R * PEAK[biome] * (0.75 + r() * 0.4) * (full ? 1 : 0.7) * (arch === 5 ? 0.4 : 1);
    var base0 = R * 0.085; t.lakeH = arch === 1 ? base0 + t.peakH * 0.28 : base0; t.lake = null; t.site = null; t.strip = null;
    var la = arch === 1 ? r() * TAU : (arch === 4 || arch === 2) ? pa + side * Math.PI / 2 : pa + Math.PI + (r() - 0.5) * 0.9;
    if (full && R > 95 && biome !== 3) { var ld = arch === 1 ? 0 : arch === 5 ? R * 0.28 : R * 0.36; t.lake = { x: Math.cos(la) * ld, z: Math.sin(la) * ld, r: R * (arch === 5 ? 0.3 : 0.2 + r() * 0.07), depth: 7 + R * 0.03, a: la }; }
    var sa = arch === 0 || arch === 5 ? pa + side * (Math.PI / 2 - 0.35) : arch === 1 ? la + 2 : arch === 3 ? la + 1.2 : la + Math.PI + 0.7;
    if (full && R > 100) { var sd = arch === 1 ? R * 0.62 : R * 0.4; t.site = { x: Math.cos(sa) * sd, z: Math.sin(sa) * sd, r: Math.max(28, R * (arch === 1 ? 0.12 : 0.17)), h: base0 + 5 }; }
    if (full && R > 140) { var ta = arch === 0 || arch === 5 ? pa - side * (Math.PI / 2 - 0.2) : arch === 1 ? la - 2 : arch === 3 ? la - 1.2 : la + Math.PI - 0.7, td = R * (arch === 1 ? 0.62 : 0.44), dir = ta + Math.PI / 2; t.strip = { x: Math.cos(ta) * td, z: Math.sin(ta) * td, cx: Math.cos(dir), cz: Math.sin(dir), dir: dir, len: Math.min(150, R * (arch === 1 ? 0.42 : 0.6)), wid: 22, h: base0 + 4 }; }
    t.snowH = biome === 4 ? t.peakH * 0.3 : (biome === 3 || biome === 5 || biome === 6 || t.peakH < 85) ? 1e5 : t.peakH * 0.74;
    var lk = t.lake, st = t.site, sp = t.strip, ux = Math.cos(la), uz = Math.sin(la);
    t.h = function (x, z) {
      var d = Math.hypot(x, z), f = Math.min(1, d / t.edge(Math.atan2(z, x))), rim = 1 - sstep(0.7, 1, f);
      var h = R * 0.045 + fbm(x * 0.011 + ox, z * 0.011 + oz) * R * 0.1, rid = ridged(x * 0.014 + ox, z * 0.014 + oz), m, q1, q2, pk;
      if (arch === 1) { q1 = (d / R - 0.43) / 0.15; m = t.peakH * 0.9 * Math.exp(-q1 * q1) * (0.55 + 0.45 * rid) + rid * t.peakH * 0.05; }
      else if (arch === 2) { q1 = Math.hypot(x - px, z - pz) / (R * 0.42); q2 = Math.hypot(x + px * 0.95, z + pz * 0.95) / (R * 0.36); pk = Math.max(Math.exp(-q1 * q1 * 2.3), Math.exp(-q2 * q2 * 2.3) * 0.72); m = pk * t.peakH * (0.42 + 0.58 * rid) + (1 - pk) * rid * t.peakH * 0.12; }
      else if (arch === 3) { q1 = (x * cpa + z * spa) / R + (fbm(x * 0.02 + ox + 50, z * 0.02 + oz) - 0.5) * 0.28; m = t.peakH * 0.62 * sstep(-0.05, 0.09, q1) * (0.86 + 0.14 * rid); }
      else if (arch === 4) { q1 = (-x * spa + z * cpa) / (R * 0.17); q2 = (x * cpa + z * spa) / R; m = t.peakH * Math.exp(-q1 * q1) * (0.5 + 0.5 * rid) * Math.max(0, 1 - q2 * q2 * 1.3) + rid * t.peakH * 0.06; }
      else if (arch === 5) { m = rid * t.peakH * 0.6 + fbm(x * 0.02 + ox + 9, z * 0.02 + oz + 4) * t.peakH * 0.5; }
      else { q1 = (x - px) / (R * 0.5); q2 = (z - pz) / (R * 0.5); pk = Math.exp(-(q1 * q1 + q2 * q2) * 2.3); m = pk * t.peakH * (0.42 + 0.58 * rid) + (1 - pk) * rid * t.peakH * 0.14; }
      if (biome === 3) m = (Math.floor(m / 20) + sstep(0.72, 1, (m / 20) % 1)) * 20;
      h += m;
      if (st) { var sq = Math.hypot(x - st.x, z - st.z) / st.r; if (sq < 1.6) h = lerp(h, st.h, 1 - sstep(0.85, 1.6, sq)); }
      if (sp) { var al = Math.abs((x - sp.x) * sp.cx + (z - sp.z) * sp.cz), ac = Math.abs((x - sp.x) * sp.cz - (z - sp.z) * sp.cx); if (al < sp.len / 2 + 22 && ac < sp.wid / 2 + 22) h = lerp(h, sp.h, (1 - sstep(sp.len / 2, sp.len / 2 + 22, al)) * (1 - sstep(sp.wid / 2, sp.wid / 2 + 22, ac))); }
      if (lk) {
        var qx = x - lk.x, qz = z - lk.z, q = Math.hypot(qx, qz) / lk.r;
        if (q < 1.7) h = lerp(h, t.lakeH - lk.depth * (1 - sstep(0, 1.05, q)), 1 - sstep(0.8, 1.7, q));
        var along = qx * ux + qz * uz, across = Math.abs(qx * uz - qz * ux);
        if (along > 0 && across < 17) h = lerp(h, Math.min(h, t.lakeH - 1.6), 1 - sstep(8, 17, across));
      }
      return h * rim + R * 0.012;
    };
    t.slope = function (x, z) { return Math.hypot(t.h(x + 2, z) - t.h(x - 2, z), t.h(x, z + 2) - t.h(x, z - 2)) / 4; };
    t.onStrip = function (x, z, pad) { return !!sp && Math.abs((x - sp.x) * sp.cx + (z - sp.z) * sp.cz) < sp.len / 2 + pad && Math.abs((x - sp.x) * sp.cz - (z - sp.z) * sp.cx) < sp.wid / 2 + pad; };
    return t;
  }
  function terrainGeometry(t, D, NR, S, r) {
    var B = BIOMES[t.biome], pos = [], col = [], rock = [], ap = [], idx = [], g1 = new T.Color(B.g1), rk = new T.Color(B.rock1), i, j, a, e, x, z, hh;
    if (t.biome === 0 || t.biome === 1 || t.biome === 5 || t.biome === 7) g1.lerp(new T.Color(0x4a6e30), 0.32);
    var lakeAttr = t.lake ? t.lakeH : -1000;
    function v(x, y, z, hv, under) { pos.push(x, y, z); col.push(g1.r, g1.g, g1.b); rock.push(rk.r, rk.g, rk.b); var la = lakeAttr; if (t.lake && !under) { var qx = x - t.lake.x, qz = z - t.lake.z, al = qx * Math.cos(t.lake.a) + qz * Math.sin(t.lake.a), ac = Math.abs(qx * Math.sin(t.lake.a) - qz * Math.cos(t.lake.a)); if ((Math.hypot(qx, qz) > t.lake.r * 1.9 && !(al > 0 && ac < 20)) || Math.hypot(x, z) > t.edge(Math.atan2(z, x)) * 0.8) la = -1000; } ap.push(hv, la, t.snowH, under); }
    hh = t.h(0, 0); v(0, hh, 0, hh, 0);
    for (j = 1; j <= NR; j++) for (i = 0; i < S; i++) { a = i / S * TAU; e = t.edge(a) * j / NR; x = Math.cos(a) * e; z = Math.sin(a) * e; hh = t.h(x, z); v(x, hh, z, hh, 0); }
    var TT = [0.04, 0.1, 0.18, 0.28, 0.4, 0.53, 0.67, 0.82], q1 = r() * TAU, q2 = r() * TAU;
    for (j = 0; j < TT.length; j++) for (i = 0; i < S; i++) {
      a = i / S * TAU; var tt = TT[j], jag = j === 0 ? 1 : (j % 2 ? 1.05 : 0.93) + 0.17 * Math.sin(a * 5 + tt * 8 + q2) + 0.1 * Math.sin(a * 9 + q1 + tt * 5) + 0.05 * Math.sin(a * 17 + q1);
      e = t.edge(a) * Math.pow(1 - tt, 0.8) * jag; v(Math.cos(a) * e, -D * tt * (0.88 + 0.24 * Math.abs(Math.sin(a * 4 + q1))), Math.sin(a) * e, -tt * 100, 1);
    }
    var rings = NR + TT.length, tip = 1 + rings * S; v((r() - 0.5) * t.R * 0.25, -D, (r() - 0.5) * t.R * 0.25, -100, 1);
    for (i = 0; i < S; i++) {
      var n = (i + 1) % S; idx.push(0, 1 + n, 1 + i);
      for (j = 0; j < rings - 1; j++) { var A = 1 + j * S + i, Bq = 1 + j * S + n, C = 1 + (j + 1) * S + i, Dq = 1 + (j + 1) * S + n; idx.push(A, Bq, C, Bq, Dq, C); }
      idx.push(1 + (rings - 1) * S + i, 1 + (rings - 1) * S + n, tip);
    }
    var g = new T.BufferGeometry(); g.setIndex(idx);
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
    g.setAttribute("aRock", new T.Float32BufferAttribute(rock, 3)); g.setAttribute("aP", new T.Float32BufferAttribute(ap, 4));
    g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  }
  function lakeGeometry(t) {
    var lk = t.lake, pos = [], dep = [], idx = [], S = 44, NR = 9, i, j, a, e, x, z, rad = lk.r * 1.3, W3 = BIOMES[t.biome].water, tint = [];
    pos.push(lk.x, t.lakeH, lk.z); dep.push(t.lakeH - t.h(lk.x, lk.z));
    for (j = 1; j <= NR; j++) for (i = 0; i < S; i++) { a = i / S * TAU; e = rad * j / NR; x = lk.x + Math.cos(a) * e; z = lk.z + Math.sin(a) * e; pos.push(x, t.lakeH, z); dep.push(t.lakeH - t.h(x, z)); }
    for (i = 0; i < S; i++) { var n = (i + 1) % S; idx.push(0, 1 + n, 1 + i); for (j = 0; j < NR - 1; j++) { var A = 1 + j * S + i, B = 1 + j * S + n, C = 1 + (j + 1) * S + i, Dq = 1 + (j + 1) * S + n; idx.push(A, B, C, B, Dq, C); } }
    // the outlet stream, from the lake to the island's edge
    var ux = Math.cos(lk.a), uz = Math.sin(lk.a), s0 = lk.r * 0.9, s1 = t.edge(lk.a) * 0.99 - Math.hypot(lk.x, lk.z), base = pos.length / 3, N = 14;
    for (i = 0; i <= N; i++) { var s = lerp(s0, s1, i / N), cx = lk.x + ux * s, cz = lk.z + uz * s, y = t.h(cx, cz) + 0.75; pos.push(cx - uz * 5.2, y, cz + ux * 5.2, cx + uz * 5.2, y, cz - ux * 5.2); dep.push(1.3, 1.3); }
    for (i = 0; i < N; i++) { var k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    var g = new T.BufferGeometry(); g.setIndex(idx); g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); for (i = 0; i < pos.length / 3; i++) tint.push(W3[0], W3[1], W3[2]);
    g.setAttribute("aDepth", new T.Float32BufferAttribute(dep, 1)); g.setAttribute("aTint", new T.Float32BufferAttribute(tint, 3)); g.computeBoundingSphere(); return g;
  }
  function decorate(buf, c, t, r) {
    var B = BIOMES[c.biome], R = c.R, lm = c.lm, st = t.site, i, n, a, e, x, z, h, s;
    function spot(maxF) { a = r() * TAU; e = t.edge(a) * Math.sqrt(r()) * maxF; x = Math.cos(a) * e; z = Math.sin(a) * e; h = t.h(x, z); }
    function dry() { return !t.lake || h > t.lakeH + 1.2; }
    function offSite(pad) { return (!st || Math.hypot(x - st.x, z - st.z) > st.r * pad) && !t.onStrip(x, z, 9); }
    var pineShare = [0.55, 0.85, 0.25, 0, 1, 0, 1, 0.06][c.biome], PINE = c.biome === 4 ? [0x3d6a52, 0x4d7a64, 0x35604a] : c.biome === 6 ? [0x3b3a2c, 0x4a4532, 0x33342a] : [0x2f5d3a, 0x2a5136, 0x3a6b40, 0x35603c], nx = r() * 50, nz = r() * 50;
    n = Math.floor(R * R * B.treeD / 95);
    for (i = 0; i < n; i++) {
      spot(0.9); if (!dry() || !offSite(1.05) || t.slope(x, z) > 0.62 || h > t.snowH + (c.biome === 4 ? 45 : 6)) continue;
      if (c.biome === 3) { if (i % 4 === 0) tree(buf, B.tree, B.leaf, x, h - 0.6, z, 0.75 + r() * 0.9, r); continue; }
      if (fbm(x * 0.03 + nx, z * 0.03 + nz) < (c.biome === 1 ? 0.3 : 0.42)) continue;
      var pine = r() < pineShare; _c.set(pine ? PINE[Math.floor(r() * PINE.length)] : B.leaf[Math.floor(r() * B.leaf.length)]); if (!pine) _c.multiplyScalar(0.8);
      buf.trees.push({ x: x, y: h - 0.5, z: z, s: (pine ? 0.75 : 0.62) * (0.7 + r() * 0.9), w: 0.85 + r() * 0.3, ry: r() * TAU, k: pine ? "pine" : "leaf", c: _c.getHex() });
    }
    n = Math.floor(R / 2.5);
    for (i = 0; i < n; i++) { spot(0.93); if (!dry() || !offSite(0.9) || t.slope(x, z) > 0.5 || h > t.snowH) continue; s = 1.1 + r() * 1.1; if (c.biome === 3) add(buf, SH.ico, x, h + s * 0.3, z, s * 1.3, s * 0.8, s * 1.1, 0xc79a62, r() * 6); else { curSway = 0.5; add(buf, SH.ico, x, h + s * 0.4, z, s * 1.4, s * 0.9, s * 1.4, c.biome === 2 ? 0x8a5a2c : 0x2c5e34, r() * 6); curSway = 0; } }
    if (c.biome !== 3 && c.biome !== 4 && c.biome !== 6) { var fc = [0xff6fa3, 0xffd23f, 0xffffff, 0xb48cff, 0xff8a4c]; n = Math.floor(R / 1.5); for (i = 0; i < n; i++) { spot(0.93); if (!dry() || t.slope(x, z) > 0.3 || h > t.snowH - 10 || t.onStrip(x, z, 2)) continue; add(buf, SH.ico, x, h + 0.45, z, 0.55, 0.55, 0.55, fc[Math.floor(r() * fc.length)]); } }
    n = Math.floor(R / 6);
    for (i = 0; i < n; i++) { spot(0.92); if (!dry() || !offSite(1)) continue; s = 1.5 + r() * 3.5; add(buf, SH.ico, x, h + s * 0.25, z, s, s * 0.8, s * 1.2, 0x9aa0a8, r() * 6, r() * 2); }
    if (c.biome === 1) for (i = 0; i < 12; i++) { spot(0.85); if (!dry() || t.slope(x, z) > 0.4) continue; s = 0.8 + r(); add(buf, SH.cyl, x, h + 0.8 * s, z, 0.45 * s, 1.6 * s, 0.45 * s, 0xf6f0e2); add(buf, SH.cone6, x, h + 2.1 * s, z, 1.7 * s, 1.2 * s, 1.7 * s, 0xd9412f); }
    if (c.biome === 4) for (i = 0; i < 9; i++) { spot(0.85); if (!dry()) continue; s = 3 + r() * 7; add(buf, SH.ico, x, h + s * 0.6, z, s * 0.3, s, s * 0.3, 0xbfe6ff, r() * 6, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5); }
    var L = st ? { x: st.x, y: t.h(st.x, st.z), z: st.z } : { x: 0, y: t.h(0, 0), z: 0 };
    if (st && B.village && lm !== 2 && lm !== 5) {
      var hn = 6 + Math.floor(r() * 7);
      for (i = 0; i < hn; i++) { a = i / hn * TAU + r() * 0.4; e = st.r * (0.5 + r() * 0.5); x = st.x + Math.cos(a) * e; z = st.z + Math.sin(a) * e; h = t.h(x, z); if (dry()) house(buf, x, h - 0.3, z, r); }
      if (lm < 0) { add(buf, SH.cyl, L.x, L.y + 7, L.z, 2.2, 14, 2.2, 0xf2e2c4); add(buf, SH.cone12, L.x, L.y + 17, L.z, 3.2, 6, 3.2, 0xd4523a); }
      x = L.x + st.r * 0.28; z = L.z + st.r * 0.2; h = t.h(x, z);
      add(buf, SH.cyl, x, h + 0.8, z, 1.6, 1.6, 1.6, 0xb9b3a6); add(buf, SH.cone6, x, h + 4, z, 2.1, 1.3, 2.1, 0x7a5236); add(buf, SH.box, x - 1.3, h + 2.4, z, 0.25, 2.4, 0.25, 0x7a5236); add(buf, SH.box, x + 1.3, h + 2.4, z, 0.25, 2.4, 0.25, 0x7a5236);
    }
    if (t.strip) {
      var sp = t.strip, sy = t.h(sp.x, sp.z), ry = -sp.dir;
      add(buf, SH.box, sp.x, sy + 0.12, sp.z, sp.len, 0.3, sp.wid * 0.8, c.biome === 4 ? 0x8f9bb4 : 0x9a8a68, ry);
      for (i = -3; i <= 3; i++) add(buf, SH.box, sp.x + sp.cx * i * sp.len / 8, sy + 0.3, sp.z + sp.cz * i * sp.len / 8, sp.len / 20, 0.12, 1.1, 0xf4efe2, ry);
      for (i = -4; i <= 4; i++) for (var es = -1; es <= 1; es += 2) add(buf, SH.box, sp.x + sp.cx * i * sp.len / 9 - sp.cz * es * (sp.wid * 0.4 + 0.9), sy + 0.45, sp.z + sp.cz * i * sp.len / 9 + sp.cx * es * (sp.wid * 0.4 + 0.9), 0.5, 0.7, 0.5, i === -4 || i === 4 ? 0xff5a4a : 0xffe27a, ry);
      for (i = -1; i <= 1; i += 2) { add(buf, SH.box, sp.x + sp.cx * i * (sp.len / 2 - 3), sy + 0.3, sp.z + sp.cz * i * (sp.len / 2 - 3), 2.2, 0.12, sp.wid * 0.66, 0xf4efe2, ry); }
      x = sp.x - sp.cz * (sp.wid / 2 + 4); z = sp.z + sp.cx * (sp.wid / 2 + 4); h = t.h(x, z);
      add(buf, SH.cyl, x, h + 4, z, 0.18, 8, 0.18, 0xdddddd); curSway = 0.8; add(buf, SH.cone6, x + sp.cx * 1.8, h + 7.6, z + sp.cz * 1.8, 0.8, 3.6, 0.8, 0xff7a3d, ry, 0, -1.5708); curSway = 0;
      add(buf, SH.box, x + sp.cx * 12, h + 2, z + sp.cz * 12, 7, 4, 6, 0xb5553c, ry); add(buf, SH.cone4, x + sp.cx * 12, h + 5.4, z + sp.cz * 12, 5.6, 2.8, 4.8, 0x7a5236, ry + Math.PI / 4);
    }
    if (lm >= 0) { var p0 = buf.p.length; landmark(buf, lm, L.y - 1, r); for (i = p0; i < buf.p.length; i += 3) { buf.p[i] += L.x; buf.p[i + 2] += L.z; } buf.lm = L; }
    if (t.lake && c.biome !== 6) { e = t.edge(t.lake.a) * 1.0; buf.falls.push({ x: Math.cos(t.lake.a) * e, z: Math.sin(t.lake.a) * e, a: t.lake.a, w: 10, h: c.D * 0.66 }); }
    n = 24; curSway = 0.5;
    for (i = 0; i < n; i++) { a = r() * TAU; e = t.edge(a); s = 5 + r() * 24; add(buf, SH.box, Math.cos(a) * e, R * 0.012 - s / 2, Math.sin(a) * e, 0.6 + r() * 1.2, s, 0.6, r() < 0.5 ? B.dirt : B.leaf[0], -a); }
    curSway = 0; n = 7 + Math.floor(r() * 6);
    for (i = 0; i < n; i++) { a = r() * TAU; var ff = 0.15 + r() * 0.6; e = R * ff; s = R * (0.04 + r() * 0.05); add(buf, SH.cone6, Math.cos(a) * e, -c.D * (1 - ff) * 0.72 - s * 2, Math.sin(a) * e, s, s * 5, s, B.rock2, r() * 6, Math.PI); }
    n = 4 + Math.floor(r() * 5);
    for (i = 0; i < n; i++) { a = r() * TAU; e = R * (0.3 + r() * 0.8); s = 3 + r() * 7; add(buf, SH.ico, Math.cos(a) * e, -c.D * (0.5 + r() * 0.6), Math.sin(a) * e, s, s * 1.3, s, B.rock1, r() * 6, r() * 6); }
  }
  var islandMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, side: T.DoubleSide });
  var uTime = { value: 0 };
  islandMat.onBeforeCompile = function (sh) {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = "attribute float sway;\nuniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n transformed.x += sin(uTime * 1.7 + position.x * 0.31 + position.z * 0.23) * 0.5 * sway;\n transformed.z += cos(uTime * 1.3 + position.z * 0.29 + position.x * 0.17) * 0.35 * sway;");
  };
  var fallMat = new T.ShaderMaterial({
    uniforms: { uTime: uTime }, transparent: true, side: T.DoubleSide, depthWrite: false,
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform float uTime; varying vec2 vU; void main(){ float s = sin(vU.x*26.0 + sin(vU.y*9.0)*1.5)*0.5+0.5; float f = fract(vU.y*5.0 + uTime*0.9 + s*0.35); float streak = smoothstep(0.0,0.35,f)*smoothstep(1.0,0.55,f); vec3 c = mix(vec3(0.62,0.86,1.0), vec3(1.0), streak*0.8 + s*0.2); float a = (0.55 + 0.4*streak) * smoothstep(0.0,0.06,vU.y) * smoothstep(0.0,0.2,vU.x) * smoothstep(1.0,0.8,vU.x) * (0.35 + 0.65*smoothstep(0.0,0.5,vU.y)); gl_FragColor = vec4(c, a); }"
  });
  csFrag(fallMat);
  var terrainMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0, side: T.DoubleSide });
  terrainMat.onBeforeCompile = function (sh) {
    sh.vertexShader = "attribute vec3 aRock;\nattribute vec4 aP;\nvarying vec3 vLP;\nvarying vec3 vWN;\nvarying vec3 vRock;\nvarying vec4 vP;\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n vLP = transformed; vWN = normal; vRock = aRock; vP = aP;");
    var noise = "varying vec3 vLP;\nvarying vec3 vWN;\nvarying vec3 vRock;\nvarying vec4 vP;\nfloat th21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\nfloat tvn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(th21(i), th21(i+vec2(1.0,0.0)), f.x), mix(th21(i+vec2(0.0,1.0)), th21(i+vec2(1.0,1.0)), f.x), f.y); }\nfloat tfbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * tvn(p); p = p * 2.03 + 17.0; a *= 0.5; } return s; }\n";
    var colour = [
      "float hgt = vP.x; float n1 = tfbm(vLP.xz * 0.02), n2 = tfbm(vLP.xz * 0.13 + 7.0), n3 = tvn(vLP.xz * 1.1);",
      "float slope = 1.0 - clamp(normalize(vWN).y, 0.0, 1.0);",
      "vec3 grass = vColor.rgb * mix(0.68, 1.06, n1) * mix(0.9, 1.07, n3); grass = mix(grass, grass * vec3(1.16, 1.06, 0.68), smoothstep(0.5, 0.8, n2) * 0.5);",
      "float strata = sin(vLP.y * 0.42 + n1 * 7.0) * 0.5 + 0.5; float streak = tvn(vec2(atan(vLP.z, vLP.x) * 38.0, vLP.y * 0.07));",
      "vec3 rockc = mix(vRock, vec3(0.56, 0.54, 0.52), 0.22) * mix(0.8, 1.06, strata * 0.35 + streak * 0.65) * mix(0.9, 1.1, n3) * mix(0.82, 1.08, n1); vec3 tc;",
      "if (vP.w > 0.5) { float dep = clamp(-hgt / 100.0, 0.0, 1.0); tc = mix(rockc, rockc * vec3(0.45, 0.5, 0.78), dep * 0.85); tc = mix(grass * 0.62, tc, smoothstep(0.0, 0.07, dep)); }",
      "else { float rk = smoothstep(0.24, 0.46, slope + (n2 - 0.5) * 0.16); tc = mix(grass, rockc, rk);",
      "  tc = mix(tc, mix(grass, rockc, 0.55) * 0.92, smoothstep(0.14, 0.24, slope) * (1.0 - rk) * 0.6);",
      "  float shore = 1.0 - smoothstep(vP.y + 0.3, vP.y + 2.2, hgt); tc = mix(tc, vec3(0.78, 0.72, 0.56) * mix(0.85, 1.05, n3), shore * (1.0 - rk));",
      "  tc = mix(tc, tc * vec3(0.45, 0.78, 0.82), smoothstep(vP.y, vP.y - 4.0, hgt));",
      "  float sn = smoothstep(vP.z - 6.0, vP.z + 16.0, hgt + (n1 - 0.5) * 30.0) * (1.0 - smoothstep(0.52, 0.8, slope)); tc = mix(tc, vec3(0.95, 0.97, 1.0) * mix(0.92, 1.0, n3), sn); }",
      "diffuseColor.rgb = tc * 0.7;"
    ].join("\n");
    sh.fragmentShader = sh.fragmentShader.replace("void main() {", noise + "void main() {").replace("#include <color_fragment>", colour)
      .replace("#include <normal_fragment_begin>", "#include <normal_fragment_begin>\n float bx = tvn(vLP.xz * 0.6 + 3.1) - tvn(vLP.xz * 0.6 - 3.1), bz = tvn(vLP.zx * 0.6 + 5.7) - tvn(vLP.zx * 0.6 - 5.7); normal = normalize(normal + mat3(viewMatrix) * vec3(bx, 0.0, bz) * 0.4);");
  };
  var lakeMat = new T.ShaderMaterial({
    uniforms: { uTime: uTime, sunDir: { value: new T.Vector3(0, 1, 0) }, skyTop: { value: new T.Color(0x1e6fd9) }, skyHor: { value: new T.Color(0xa8dcff) }, fogCol: { value: new T.Color(0xa8dcff) }, fogFar: { value: 2600 }, light: { value: 1 }, glint: { value: 1 } },
    transparent: true, depthWrite: false,
    vertexShader: "attribute float aDepth; attribute vec3 aTint; varying float vD; varying vec3 vW; varying vec3 vT; void main(){ vD = aDepth; vT = aTint; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: "uniform float uTime; uniform vec3 sunDir; uniform vec3 skyTop; uniform vec3 skyHor; uniform vec3 fogCol; uniform float fogFar; uniform float light; uniform float glint; varying float vD; varying vec3 vW; varying vec3 vT; void main(){ if (vD < 0.0) discard; float lava = step(0.95, vT.r) * step(vT.g, 0.6); vec2 p = vW.xz; vec3 n = normalize(vec3((sin(p.x*0.31+uTime*0.9)+sin(p.y*0.47-uTime*0.7)+0.5*sin((p.x+p.y)*0.9+uTime*1.3))*0.012, 1.0, (cos(p.y*0.37+uTime*0.8)+cos(p.x*0.53-uTime*0.6)+0.5*cos((p.x-p.y)*1.1+uTime*1.1))*0.012)); vec3 v = normalize(cameraPosition - vW); float fr = 0.06 + 0.94 * pow(1.0 - max(dot(n, v), 0.0), 3.2); vec3 rd = reflect(-v, n); vec3 refl = mix(skyHor, skyTop, clamp(rd.y * 1.5, 0.0, 1.0)); vec3 body = mix(vT, vT * vec3(0.14, 0.42, 0.62), smoothstep(0.0, 13.0, vD)) * light; body = mix(body, mix(vec3(1.0, 0.75, 0.2), vec3(0.95, 0.18, 0.02), smoothstep(0.0, 6.0, vD + sin(p.x * 0.35 + uTime * 0.4) * cos(p.y * 0.3 - uTime * 0.3) * 3.0)) * 1.25, lava); vec3 c = mix(body, refl, fr * (1.0 - lava)); c += (1.0 - lava) * vec3(1.0, 0.96, 0.85) * pow(max(dot(reflect(-sunDir, n), v), 0.0), 140.0) * glint; float foam = smoothstep(0.35, 0.0, vD) * (0.5 + 0.5 * sin(p.x * 1.7 + p.y * 1.3 + uTime * 2.0)); c = mix(c, vec3(1.0) * light, foam * 0.35); float f = smoothstep(fogFar * 0.2, fogFar, distance(cameraPosition, vW)); gl_FragColor = vec4(mix(c, fogCol, f), mix(0.55, 0.96, smoothstep(0.0, 2.5, vD))); }"
  });
  csFrag(lakeMat);
  var reflRT = new T.WebGLRenderTarget(960, 540), reflCam = new T.PerspectiveCamera(), reflPlane = new T.Plane(new T.Vector3(0, 1, 0), 0), reflM = new T.Matrix4(), activeLake = null;
  var lakeMatR = new T.ShaderMaterial({
    uniforms: Object.assign({}, lakeMat.uniforms, { tRefl: { value: reflRT.texture }, reflM: { value: reflM } }), transparent: true, depthWrite: false,
    vertexShader: lakeMat.vertexShader,
    fragmentShader: "uniform sampler2D tRefl; uniform mat4 reflM; " + lakeMat.fragmentShader.replace("vec3 refl = mix(skyHor, skyTop, clamp(rd.y * 1.5, 0.0, 1.0));", "vec4 rc = reflM * vec4(vW, 1.0); vec2 ruv = rc.xy / rc.w + n.xz * 0.28; vec3 refl = texture2D(tRefl, clamp(ruv, 0.003, 0.997)).rgb; fr = mix(fr, max(fr, 0.5), smoothstep(0.0, 1.5, vD));")
  });
  csFrag(lakeMatR);
