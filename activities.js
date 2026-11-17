"use strict";
/* Cloud Sea / activities.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- things to do on foot: read landmark plaques, collect crystals ---------- */
  var PLAQUES = [
    "The old windmill grinds no grain these days. It turns so that anyone flying past knows someone is home.",
    "A lighthouse for a sea of clouds. Its lamp has guided tired pilots to a safe landing for a hundred years.",
    "The Sky Arch. They say the first pilot to fly through it did so with both eyes shut. Nobody believes that.",
    "The Elder Tree stood here before the islands rose. Please do not carve your name into it.",
    "The Crystal Spire hums when the wind is right. Stand still and listen.",
    "A castle with no king. The floating kingdom drifted away long ago, and only the view stayed behind.",
    "The Observatory watches the stars from above the clouds. Visitors are welcome, especially on clear nights."
  ];
  var crystalGeo = new T.OctahedronGeometry(1, 0), crystalMat = new T.MeshBasicMaterial({ color: 0x9ff6ff }), crystalGlow = new T.SpriteMaterial({ map: glowTex("rgba(150,245,255,0.95)", "rgba(80,200,255,0)"), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false });
  var postGeo = new T.BoxGeometry(0.28, 2.6, 0.28), boardGeo = new T.BoxGeometry(2.0, 1.2, 0.16), postMat = new T.MeshLambertMaterial({ color: 0x6b4a34 }), boardMat = new T.MeshLambertMaterial({ color: 0xf1e2bd });
  var plaqueStar = new T.Mesh(new T.OctahedronGeometry(0.55, 0), new T.MeshBasicMaterial({ color: 0xffd23f }));
  var _wp = new T.Vector3();
  function addActivities(mesh, info, t, buf) {
    var rr = mulberry(info.seed + 555), acts = { plaque: null, crystals: [] }, i, k;
    mesh.userData.acts = acts;
    if (info.lm >= 0 && buf.lm) {   // a plaque on flat ground beside the landmark
      var L = buf.lm, best = null;
      for (k = 0; k < 28 && !best; k++) {
        var a = k * 0.9, d = 13 + Math.floor(k / 7) * 5, x = L.x + Math.cos(a) * d, z = L.z + Math.sin(a) * d, h = t.h(x, z);
        if (Math.hypot(x, z) < info.R * 0.8 && t.slope(x, z) < 0.35 && h > t.lakeH + 1 && !(t.lake && Math.hypot(x - t.lake.x, z - t.lake.z) < t.lake.r * 1.5)) best = { x: x, y: h, z: z };
      }
      if (best) {
        var g = new T.Group(), post = new T.Mesh(postGeo, postMat), board = new T.Mesh(boardGeo, boardMat), star = plaqueStar.clone();
        post.position.y = 1.3; board.position.y = 2.3; star.position.y = 4.3; g.add(post); g.add(board); g.add(star);
        g.position.set(best.x, best.y, best.z); g.rotation.y = Math.atan2(L.x - best.x, L.z - best.z); post.castShadow = true;
        mesh.add(g); acts.plaque = { x: best.x, y: best.y, z: best.z, g: g, star: star, key: info.key, name: info.name || LANDMARKS[info.lm], lm: info.lm };
        star.visible = !plaqueSet[info.key];
      }
    }
    if (info.R > 140) {   // five crystals on the highest, driest points
      var cand = [];
      for (i = 0; i < 70; i++) {
        var ca = rr() * TAU, cd = Math.sqrt(rr()) * info.R * 0.8, cx = Math.cos(ca) * cd, cz = Math.sin(ca) * cd;
        if (cd > t.edge(ca) * 0.86) continue;
        if (t.lake && Math.hypot(cx - t.lake.x, cz - t.lake.z) < t.lake.r * 1.5) continue;
        if (t.slope(cx, cz) > 0.9) continue;
        cand.push({ x: cx, z: cz, y: t.h(cx, cz) });
      }
      cand.sort(function (p, q) { return q.y - p.y; });
      var chosen = [];
      cand.forEach(function (p) { if (chosen.length < 5 && chosen.every(function (q) { return Math.hypot(p.x - q.x, p.z - q.z) > 34; })) chosen.push(p); });
      chosen.forEach(function (p, n) {
        var key = info.key + "#" + n; if (crystalSet[key]) return;
        var m = new T.Mesh(crystalGeo, crystalMat); m.scale.set(0.7, 1.3, 0.7); var gl = new T.Sprite(crystalGlow); gl.scale.set(6, 6, 1); m.add(gl);
        m.position.set(p.x, p.y + 2.2, p.z); mesh.add(m); acts.crystals.push({ m: m, key: key, y: p.y + 2.2, ph: n * 1.7 });
      });
    }
    if (typeof addVillager === "function") addVillager(mesh, info, t, acts);
  }
  function updateActivities(dt) {
    var now = performance.now() * 0.001;
    islands.forEach(function (mesh) {
      var a = mesh.userData.acts, c = mesh.userData.info; if (!a || !c) return;
      var near = Math.hypot(pilot.pos.x - c.x, pilot.pos.z - c.z) < c.R + 40;
      if (!near) return;
      for (var i = a.crystals.length - 1; i >= 0; i--) {
        var cr = a.crystals[i]; cr.m.rotation.y += dt * 1.6; cr.m.position.y = cr.y + Math.sin(now * 2 + cr.ph) * 0.35;
        _wp.copy(cr.m.position).add(mesh.position);
        if (Math.hypot(_wp.x - pilot.pos.x, _wp.z - pilot.pos.z) < 3.4 && Math.abs(_wp.y - pilot.pos.y - 1.3) < 4.5) collectCrystal(mesh, a, i);
      }
    });
  }
  function collectCrystal(mesh, a, i) {
    var cr = a.crystals[i]; mesh.remove(cr.m); a.crystals.splice(i, 1);
    crystalSet[cr.key] = true; save.crystals.push(cr.key); if (save.crystals.length > 600) save.crystals.shift();
    save.crystalCount = (save.crystalCount || 0) + 1; footOnce("PickUp");
    var n = save.crystalCount, star = n % 5 === 0; if (star) save.stars++;
    persist(); toast("Crystal " + n + (star ? ". +1 star for every five" : "")); blip(1180, 0.02); blip(1560, 0.12);
  }
  function nearPlaque() {
    var found = null;
    islands.forEach(function (mesh) {
      var a = mesh.userData.acts; if (found || !a || !a.plaque) return;
      var p = a.plaque; _wp.set(p.x, p.y, p.z).add(mesh.position);
      if (Math.hypot(_wp.x - pilot.pos.x, _wp.z - pilot.pos.z) < 6 && Math.abs(_wp.y - pilot.pos.y) < 9) found = p;
    });
    return found;
  }
  function readPlaque(p) {
    var wrap = document.createElement("div"), q = document.createElement("p");
    q.textContent = PLAQUES[p.lm] || "A quiet place with a lovely view."; wrap.appendChild(q);
    var first = !plaqueSet[p.key];
    if (first) {
      plaqueSet[p.key] = true; save.plaques.push(p.key); save.stars++; p.star.visible = false; persist();
      var r = document.createElement("p"); r.textContent = "Logbook entry completed. +1 star."; wrap.appendChild(r); blip(990); blip(1320, 0.12);
    }
    showPause(String(p.name || "Landmark").slice(0, 40), wrap);
  }
