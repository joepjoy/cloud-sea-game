"use strict";
/* Cloud Sea / forest.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- forests: Blender trees drawn in batches, with a cheap far version ---------- */
  var barkMat = new T.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.95 }), leafMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: T.DoubleSide }), farMat = new T.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9, side: T.DoubleSide });
  leafMat.onBeforeCompile = function (sh) {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n#ifdef USE_INSTANCING\n float sw = position.y * position.y * 0.0035; transformed.x += sin(uTime * 1.5 + instanceMatrix[3].x * 0.31 + instanceMatrix[3].z * 0.17) * sw; transformed.z += cos(uTime * 1.2 + instanceMatrix[3].z * 0.29) * sw * 0.7;\n#endif");
  };
  function lift(g, y) { g.translate(0, y, 0); return g; }
  var TREES = {
    pine: { trunk: lift(new T.CylinderGeometry(0.15, 0.4, 5, 6), 2.5), crown: lift(new T.ConeGeometry(3.2, 10, 7), 7.5), far: lift(new T.ConeGeometry(3.1, 10.5, 6, 1, true), 7.4) },
    leaf: { trunk: lift(new T.CylinderGeometry(0.26, 0.5, 5.4, 6), 2.7), crown: lift(new T.IcosahedronGeometry(3.4, 1), 8), far: lift(new T.IcosahedronGeometry(3.5, 0), 8) }
  };
  /* ---------- ground cover: grass tufts and flowers, only drawn on islands close to the camera ---------- */
  var tuftGeo = (function () {
    var pos = [], nor = [], k, g = new T.BufferGeometry();
    for (k = 0; k < 7; k++) { var a = k * 2.4, r0 = 0.05 + (k % 3) * 0.09, bx = Math.cos(a) * r0, bz = Math.sin(a) * r0, w = 0.07, hh = 0.55 + (k % 4) * 0.16, lean = 0.22 + (k % 2) * 0.2, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
      pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(a) * lean, hh, bz + Math.sin(a) * lean); nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0); }
    g.setAttribute("position", new T.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(nor, 3)); return g;
  })(), flowerGeo = lift(new T.IcosahedronGeometry(0.15, 0), 0.5);
  var tuftMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: T.DoubleSide }), flowerMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  tuftMat.onBeforeCompile = function (sh) {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = "uniform float uTime;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n#ifdef USE_INSTANCING\n float gs = position.y * position.y * 0.3; transformed.x += sin(uTime * 2.1 + instanceMatrix[3].x * 0.7 + instanceMatrix[3].z * 0.4) * gs; transformed.z += cos(uTime * 1.7 + instanceMatrix[3].z * 0.6) * gs * 0.6;\n#endif");
  };
  var FLOWERS = [0xffffff, 0xffe066, 0xff9ad5, 0xb79bff, 0xff7a6b];
  function plantCover(mesh, info, t) {
    if (info.R < 90 || info.biome === 3 || info.biome === 4 || info.biome === 6) return;
    var rr = mulberry(info.seed + 3131), want = Math.min(3200, Math.floor(info.R * 11)), pts = [], B = BIOMES[info.biome], sp = t.strip, tries = 0;
    while (pts.length < want && tries++ < want * 4) {
      var a = rr() * TAU, d = Math.sqrt(rr()) * info.R * 0.92, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (d > t.edge(a) * 0.9 || t.slope(x, z) > 0.5) continue;
      var h = t.h(x, z); if (h < t.lakeH + 0.8 || (t.lake && Math.hypot(x - t.lake.x, z - t.lake.z) < t.lake.r * 1.25)) continue;
      if (sp) { var dx = x - sp.x, dz = z - sp.z, al = dx * sp.cx + dz * sp.cz, pe = -dx * sp.cz + dz * sp.cx; if (Math.abs(al) < sp.len / 2 + 4 && Math.abs(pe) < sp.wid / 2 + 2) continue; }
      pts.push({ x: x, y: h - 0.05, z: z, f: rr() < 0.1, s: 0.8 + rr() * 0.9, ry: rr() * TAU, c: rr() });
    }
    var nt = 0, nf = 0; pts.forEach(function (p) { if (p.f) nf++; else nt++; });
    var tm = new T.InstancedMesh(tuftGeo, tuftMat, Math.max(1, nt)), fm = new T.InstancedMesh(flowerGeo, flowerMat, Math.max(1, nf)), it = 0, jf = 0;
    var c1 = new T.Color(B.g1).multiplyScalar(0.62), c2 = new T.Color(B.g1).lerp(new T.Color(B.g2), 0.45).multiplyScalar(0.85);
    pts.forEach(function (p) {
      _e.set(0, p.ry, 0); _q.setFromEuler(_e);
      if (p.f) { _m.compose(_v.set(p.x, p.y, p.z), _q, _s.set(p.s, p.s, p.s)); fm.setMatrixAt(jf, _m); _c.set(FLOWERS[Math.floor(p.c * FLOWERS.length)]); fm.setColorAt(jf++, _c); }
      else { _m.compose(_v.set(p.x, p.y, p.z), _q, _s.set(p.s * 1.3, p.s * (0.7 + p.c * 0.8), p.s * 1.3)); tm.setMatrixAt(it, _m); _c.copy(c1).lerp(c2, p.c); tm.setColorAt(it++, _c); }
    });
    tm.count = nt; fm.count = nf; [tm, fm].forEach(function (o) { o.frustumCulled = false; o.receiveShadow = true; o.visible = false; mesh.add(o); });
    mesh.userData.cover = [tm, fm];
  }
  function plantForest(mesh, list) {
    var f = mesh.userData.forest = { near: [], far: [] };
    ["pine", "leaf"].forEach(function (kind) {
      var items = list.filter(function (q) { return q.k === kind; }), n = items.length; if (!n) return;
      var G = TREES[kind], trunk = new T.InstancedMesh(G.trunk, barkMat, n), crown = new T.InstancedMesh(G.crown, leafMat, n), far = new T.InstancedMesh(G.far, farMat, n);
      for (var i = 0; i < n; i++) {
        var q = items[i]; _e.set(0, q.ry, 0); _q.setFromEuler(_e); _m.compose(_v.set(q.x, q.y, q.z), _q, _s.set(q.s * q.w, q.s, q.s * q.w));
        trunk.setMatrixAt(i, _m); crown.setMatrixAt(i, _m); far.setMatrixAt(i, _m); _c.set(q.c); crown.setColorAt(i, _c); far.setColorAt(i, _c);
      }
      [trunk, crown, far].forEach(function (o) { o.frustumCulled = false; mesh.add(o); });
      trunk.castShadow = true; crown.castShadow = true; far.visible = false;
      f.near.push(trunk, crown); f.far.push(far);
    });
  }
  function updateForests() {
    islands.forEach(function (m) {
      var f = m.userData.forest; if (!f) return; var c = m.userData.info;
      var near = Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < c.R + Q.near, i;
      for (i = 0; i < f.near.length; i++) f.near[i].visible = near; for (i = 0; i < f.far.length; i++) f.far[i].visible = !near;
      var cv = m.userData.cover; if (cv) { var cn = tier > 0 && Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < c.R + 320; cv[0].visible = cv[1].visible = cn; }
    });
  }
  var mistTex = null;
  function addMist(mesh, x, y, z, a, wide) {
    if (!mistTex) mistTex = glowTex("rgba(255,255,255,0.85)", "rgba(255,255,255,0.3)");
    for (var i = 0; i < wide; i++) {
      var mat = new T.SpriteMaterial({ map: mistTex, transparent: true, opacity: 0, depthWrite: false }), sp = new T.Sprite(mat);
      mesh.add(sp); mesh.userData.extra.push(mat);
      mesh.userData.mist.push({ s: sp, x: x, y: y, z: z, ox: Math.cos(a), oz: Math.sin(a), ph: i / wide + Math.random() * 0.1, big: wide > 3 });
    }
  }
  function makeIsland(info) {
    var r = mulberry(info.seed), t = terrainFor(info), big = info.R > 150;
    var mesh = new T.Mesh(terrainGeometry(t, info.D, big ? 60 : 40, big ? 120 : 84, r), terrainMat);
    mesh.position.set(info.x, info.y, info.z); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.extra = []; mesh.userData.mist = [];
    var buf = new Buf(); decorate(buf, info, t, r);
    var sats = 1 + Math.floor(r() * 3);
    for (var i = 0; i < sats; i++) {
      var a = r() * TAU, d = info.R * (1.12 + r() * 0.3), sr = 14 + r() * 24, sy = (r() - 0.55) * 60;
      var stn = makeTerrain(info.seed + i * 977 + 1, sr, info.biome, false), sg = terrainGeometry(stn, sr * (1.2 + r()), 12, 30, r), sm = new T.Mesh(sg, terrainMat);
      sm.position.set(Math.cos(a) * d, sy, Math.sin(a) * d); sm.castShadow = true; sm.receiveShadow = true; mesh.add(sm); mesh.userData.extra.push(sg);
      if (info.biome === 3) tree(buf, BIOMES[3].tree, BIOMES[3].leaf, Math.cos(a) * d + 2, sy + stn.h(2, 0) - 0.5, Math.sin(a) * d, 0.8, r); else buf.trees.push({ x: Math.cos(a) * d + 2, y: sy + stn.h(2, 0) - 0.4, z: Math.sin(a) * d, s: 0.55 + r() * 0.3, w: 1, ry: r() * TAU, k: info.biome === 1 || info.biome === 4 || info.biome === 6 ? "pine" : "leaf", c: info.biome === 4 ? 0x3d6a52 : info.biome === 1 ? 0x2f5d3a : BIOMES[info.biome].leaf[0] });
      var h0 = t.edge(a) * 0.93, h1 = d - sr * 0.75, y0 = info.R * 0.012 + 1, L = Math.hypot(h1 - h0, sy - y0 + 1);
      if (Math.abs(sy) < (h1 - h0) * 0.7 && info.biome !== 3 && h1 > h0 && h1 - h0 < 70) {
        var mid = (h0 + h1) / 2, slope = Math.atan2(sy + 1 - y0, h1 - h0), my = (y0 + sy + 1) / 2;
        add(buf, SH.box, Math.cos(a) * mid, my, Math.sin(a) * mid, L, 0.35, 3, 0x9a7a52, -a, 0, slope);
        add(buf, SH.box, Math.cos(a) * mid, my + 1.4, Math.sin(a) * mid, L, 0.15, 3.3, 0x6b4a34, -a, 0, slope);
        add(buf, SH.box, Math.cos(a) * h0, y0 + 2, Math.sin(a) * h0, 0.6, 5, 3.6, 0x6b4a34, -a); add(buf, SH.box, Math.cos(a) * h1, sy + 3, Math.sin(a) * h1, 0.6, 5, 3.6, 0x6b4a34, -a);
      }
    }
    plantForest(mesh, buf.trees); plantCover(mesh, info, t);
    var dg = toGeometry(buf), deco = new T.Mesh(dg, islandMat); deco.castShadow = true; deco.receiveShadow = true; mesh.add(deco); mesh.userData.extra.push(dg);
    buf.falls.forEach(function (f) {
      var g = new T.PlaneGeometry(f.w, f.h, 1, 1), m = new T.Mesh(g, fallMat), yTop = info.R * 0.012;
      m.position.set(f.x * 1.005, -f.h / 2 + yTop, f.z * 1.005); m.rotation.y = -f.a + Math.PI / 2; mesh.add(m); mesh.userData.extra.push(g);
      var m2 = new T.Mesh(g, fallMat); m2.position.set(f.x * 1.012, -f.h / 2 + yTop, f.z * 1.012); m2.rotation.y = -f.a + Math.PI / 2 + 0.5; m2.scale.x = 0.7; mesh.add(m2);
      addMist(mesh, f.x * 1.03, yTop - f.h, f.z * 1.03, f.a, 6); addMist(mesh, f.x * 1.01, yTop - 2, f.z * 1.01, f.a, 2);
    });
    if (t.lake) { var lg = lakeGeometry(t), lmesh = new T.Mesh(lg, lakeMat); lmesh.renderOrder = 2; mesh.add(lmesh); mesh.userData.extra.push(lg); mesh.userData.lake = lmesh; mesh.userData.lakeY = info.y + t.lakeH; for (var mi = 0; mi < 5; mi++) { var mm = new T.SpriteMaterial({ map: mistTex || (mistTex = glowTex("rgba(255,255,255,0.85)", "rgba(255,255,255,0.3)")), transparent: true, opacity: 0, depthWrite: false }), msp = new T.Sprite(mm); mesh.add(msp); mesh.userData.extra.push(mm); mesh.userData.mist.push({ s: msp, x: t.lake.x, y: t.lakeH + 5, z: t.lake.z, calm: t.lake.r, ph: mi / 5 }); } }
    if (info.lm === 0 && buf.lm) {
      var bb = new Buf();
      for (var b = 0; b < 4; b++) { add(bb, SH.box, 0, 0, 0, 1.3, 30, 0.5, 0x7a5236, 0, 0, b * Math.PI / 4); }
      for (b = 0; b < 4; b++) { var ang = b * Math.PI / 2; add(bb, SH.box, Math.cos(ang + 1.5708) * 9, Math.sin(ang + 1.5708) * 9, 0.3, 4.4, 11, 0.3, 0xfdf6e6, 0, 0, ang); }
      var blades = new T.Mesh(toGeometry(bb), islandMat); blades.castShadow = true;
      blades.position.set(buf.lm.x, buf.lm.y + 27, buf.lm.z + 6.4);
      mesh.add(blades); mesh.userData.blades = blades;
    }
    addActivities(mesh, info, t, buf);
    return mesh;
  }

