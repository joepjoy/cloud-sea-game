"use strict";
/* Cloud Sea / fauna.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- birds ---------- */
  var birdMat = new T.MeshBasicMaterial({ color: 0x27304d, side: T.DoubleSide }), wingGeo = new T.BufferGeometry();
  wingGeo.setAttribute("position", new T.Float32BufferAttribute([0, 0, -0.5, 3.4, 0, 0.2, 0, 0, 0.9], 3));
  var flocks = [];
  for (var fi = 0; fi < 5; fi++) {
    var flock = { c: new T.Vector3(0, 1e6, 0), rad: 200, a: fi * 1.3, sp: 0.16 + fi * 0.02, birds: [] };
    for (var bi = 0; bi < 7; bi++) {
      var bg = new T.Group(), wl = new T.Mesh(wingGeo, birdMat), wr = new T.Mesh(wingGeo, birdMat); wr.scale.x = -1; bg.add(wl); bg.add(wr);
      bg.userData = { l: wl, r: wr, o: new T.Vector3((bi % 2 ? 1 : -1) * Math.ceil(bi / 2) * 6, -Math.ceil(bi / 2) * 1.2, Math.ceil(bi / 2) * 7), ph: bi * 0.9 }; scene.add(bg); flock.birds.push(bg);
    }
    flocks.push(flock);
  }
  function updateBirds(dt, t) {
    for (var i = 0; i < flocks.length; i++) {
      var f = flocks[i];
      if (Math.hypot(f.c.x - me.pos.x, f.c.z - me.pos.z) > 1700 && islands.size) {
        var pick = Math.floor(Math.random() * islands.size), n = 0;
        islands.forEach(function (m) { if (n++ === pick) { var c = m.userData.info; f.c.set(c.x, c.y + terrainFor(c).peakH + 40 + Math.random() * 80, c.z); f.rad = c.R + 50 + Math.random() * 120; } });
      }
      f.a += f.sp * dt;
      var cs = Math.cos(f.a), sn = Math.sin(f.a), yaw = Math.PI - f.a;
      for (var j = 0; j < f.birds.length; j++) {
        var b = f.birds[j], o = b.userData.o;
        b.position.set(f.c.x + cs * f.rad + o.x * Math.cos(yaw) + o.z * Math.sin(yaw), f.c.y + o.y + Math.sin(t * 0.9 + b.userData.ph) * 3, f.c.z + sn * f.rad - o.x * Math.sin(yaw) + o.z * Math.cos(yaw));
        b.rotation.y = yaw; var flap = Math.sin(t * 8 + b.userData.ph) * 0.75; b.userData.l.rotation.z = flap; b.userData.r.rotation.z = -flap;
      }
    }
  }

  /* ---------- wingtip trails ---------- */
  var TRAIL_N = 46, trails = [];
  [-7.4, 7.4].forEach(function (side) {
    var g = new T.BufferGeometry(), pos = new Float32Array(TRAIL_N * 3), colr = new Float32Array(TRAIL_N * 3);
    for (var i = 0; i < TRAIL_N; i++) { var k = 1 - i / TRAIL_N; colr[i * 3] = colr[i * 3 + 1] = colr[i * 3 + 2] = k; }
    g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("color", new T.BufferAttribute(colr, 3));
    var line = new T.Line(g, new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, fog: false })); line.frustumCulled = false; scene.add(line);
    trails.push({ line: line, pos: pos, side: side, fresh: true });
  });
  function updateTrails() {
    for (var i = 0; i < trails.length; i++) {
      var tr = trails[i]; _v.set(tr.side, 1.55, -0.4); plane.localToWorld(_v);
      if (tr.fresh) { for (var k = 0; k < TRAIL_N; k++) { tr.pos[k * 3] = _v.x; tr.pos[k * 3 + 1] = _v.y; tr.pos[k * 3 + 2] = _v.z; } tr.fresh = false; }
      else { tr.pos.copyWithin(3, 0, (TRAIL_N - 1) * 3); tr.pos[0] = _v.x; tr.pos[1] = _v.y; tr.pos[2] = _v.z; }
      tr.line.geometry.attributes.position.needsUpdate = true;
      tr.line.material.opacity = clamp((me.speed - 70) / 90, 0.12, 0.75);
    }
  }

