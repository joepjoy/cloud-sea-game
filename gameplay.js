"use strict";
/* Cloud Sea / gameplay.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- ring courses: a fixed chain everyone shares ---------- */
  var courseCache = [];
  function courseDef(k) {
    for (var c = courseCache.length; c <= k; c++) {
      var r = mulberry(c * 7919 + SEED), prev = courseCache[c - 1], pts = [];
      var x = prev ? prev.end.x : 0, y = prev ? prev.end.y : 215, z = prev ? prev.end.z : 420, h = prev ? prev.end.h + (r() - 0.5) * 1.2 : 0;
      if (prev) { x += -Math.sin(h) * 520; z += -Math.cos(h) * 520; }
      for (var i = 0; i < 10; i++) {
        y = clamp(y + (r() - 0.5) * 80, 40, 520); y = clearOfIslands(x, y, z, 45);
        pts.push(new T.Vector3(x, y, z));
        h += (r() - 0.5) * 0.95; x += -Math.sin(h) * 155; z += -Math.cos(h) * 155;
      }
      courseCache.push({ pts: pts, end: { x: x, y: y, z: z, h: h } });
    }
    return courseCache[k];
  }
  var ringGeo = new T.TorusGeometry(17, 1.5, 8, 28), ringNext = new T.MeshBasicMaterial({ color: 0xffd23f, fog: false }), ringLater = new T.MeshBasicMaterial({ color: 0xffe9a3, transparent: true, opacity: 0.4 });
  var ringMeshes = [], ringIdx = 0, courseTime = 0, courseRunning = false;
  for (var rm = 0; rm < 10; rm++) { var rmesh = new T.Mesh(ringGeo, ringLater); scene.add(rmesh); ringMeshes.push(rmesh); }
  function loadCourse() {
    var def = courseDef(curCourse()); ringIdx = 0; courseRunning = false; courseTime = 0;
    for (var i = 0; i < 10; i++) { var m = ringMeshes[i]; m.position.copy(def.pts[i]); m.lookAt(def.pts[Math.min(9, i + 1)].clone().add(i === 9 ? def.pts[9].clone().sub(def.pts[8]) : new T.Vector3())); m.visible = true; m.material = i === 0 ? ringNext : ringLater; }
  }
  function updateRings(dt) {
    var def = courseDef(curCourse());
    if (raceCourse >= 0) { if (raceHold) { raceTexts(); return; } if (race && race.s <= Date.now() && !race.fin) courseTime = (Date.now() - race.s) / 1000; }
    else if (courseRunning) courseTime += dt;
    var target = def.pts[ringIdx];
    if (me.pos.distanceTo(target) < 19 && !(raceCourse >= 0 && race && race.fin)) {
      ringMeshes[ringIdx].visible = false; blip(660 + ringIdx * 60); boostE = Math.min(1, boostE + 0.25);
      if (ringIdx === 0 && raceCourse < 0) { courseRunning = true; courseTime = 0; }
      ringIdx++;
      if (ringIdx >= 10 && raceCourse >= 0) { if (!race.fin) raceFinish(courseTime); courseRunning = false; ringIdx = 9; }
      else if (ringIdx >= 10) {
        var t = Math.round(courseTime * 10) / 10, key = "c" + save.course, best = save.best[key];
        if (!best || t < best) save.best[key] = t;
        save.stars++; toast("Course " + (save.course + 1) + " done in " + t.toFixed(1) + "s" + (!best ? "" : t < best ? ", a new best" : ", best " + best.toFixed(1) + "s") + ". +1 star");
        save.course++; persist(); loadCourse();
      } else ringMeshes[ringIdx].material = ringNext;
    }
    raceTexts();
    ringNext.color.setHSL(0.13, 1, 0.58 + 0.1 * Math.sin(performance.now() * 0.006));
  }
  function raceTexts() {
    if (raceCourse >= 0) { $("g-ring").textContent = race && race.fin ? "Race finished in " + race.fin.toFixed(1) + "s" : race && race.s > Date.now() ? "Race: get ready" : "Race: ring " + (ringIdx + 1) + " of 10, " + courseTime.toFixed(1) + "s"; return; }
    var bestNow = save.best["c" + save.course];
    $("g-ring").textContent = "Ring course " + (save.course + 1) + ": " + (courseRunning ? "ring " + (ringIdx + 1) + " of 10, " + courseTime.toFixed(1) + "s" : "fly through the gold ring to start") + (bestNow ? " (best " + bestNow.toFixed(1) + "s)" : "");
    ringNext.color.setHSL(0.13, 1, 0.58 + 0.1 * Math.sin(performance.now() * 0.006));
  }

  /* ---------- missions ---------- */
  var beaconGeo = new T.CylinderGeometry(13, 13, 520, 16, 1, true);
  var beacon = new T.Mesh(beaconGeo, new T.MeshBasicMaterial({ color: 0x6ff0d2, transparent: true, opacity: 0.4, side: T.DoubleSide, depthWrite: false, fog: false })); beacon.visible = false; scene.add(beacon);
  var balloons = [], mission = null, missionWait = 2, missionCount = 0;
  function makeBalloon(color) {
    var g = new T.Group(), env = new T.Mesh(new T.SphereGeometry(9, 12, 10), new T.MeshLambertMaterial({ color: color })); env.scale.y = 1.22; g.add(env);
    var band = new T.Mesh(new T.CylinderGeometry(9.1, 9.1, 3, 12, 1, true), new T.MeshLambertMaterial({ color: 0xfff4dc })); g.add(band);
    var basket = new T.Mesh(new T.BoxGeometry(3.4, 2.6, 3.4), new T.MeshLambertMaterial({ color: 0x9a6b3d })); basket.position.y = -15; g.add(basket);
    var neck = new T.Mesh(new T.CylinderGeometry(3.6, 1.6, 5, 8, 1, true), new T.MeshLambertMaterial({ color: color, side: T.DoubleSide })); neck.position.y = -11; g.add(neck);
    return g;
  }
  function pickIsland(fromX, fromZ, minCells, maxCells, r, avoidKey) {
    var cx = Math.round(fromX / CELL), cz = Math.round(fromZ / CELL);
    for (var tries = 0; tries < 60; tries++) {
      var a = r() * TAU, d = minCells + r() * (maxCells - minCells), c = cellInfo(cx + Math.round(Math.cos(a) * d), cz + Math.round(Math.sin(a) * d));
      if (c.exists && c.key !== avoidKey && c.R > 80) return c;
    }
    return cellInfo(0, 0);
  }
  function islandLabel(c) { return c.name || ("the " + BIOMES[c.biome].name + " island"); }
  function startMission() {
    var r = Math.random; missionCount++;
    if (missionCount % 2 === 1) {
      var a = pickIsland(me.pos.x, me.pos.z, 1, 2.4, r), b = pickIsland(a.x, a.z, 2, 3.6, r, a.key);
      mission = { type: "mail", phase: 0, a: a, b: b };
      toast("New mission: collect the mail");
    } else {
      mission = { type: "balloons", left: 5 };
      var cols = [0xe8493a, 0xffb52e, 0x4b7bec, 0xb166e8, 0x2fb7a3];
      for (var i = 0; i < 5; i++) {
        var ang = me.yaw + (i - 2) * 0.5 + (r() - 0.5) * 0.4, d = 420 + r() * 520;
        var x = me.pos.x - Math.sin(ang) * d, z = me.pos.z - Math.cos(ang) * d, y = clearOfIslands(x, clamp(me.pos.y + (r() - 0.5) * 220, 20, 520), z, 40);
        var g = makeBalloon(cols[i]); g.position.set(x, y, z); g.userData.bob = r() * 6; g.userData.base = y; scene.add(g); balloons.push(g);
      }
      toast("New mission: tag five balloons");
    }
  }
  function missionTarget() {
    if (!mission) return null;
    if (mission.type === "mail") { var c = mission.phase === 0 ? mission.a : mission.b; return _target.set(c.x, c.y + 70, c.z); }
    var best = null, bd = 1e12;
    for (var i = 0; i < balloons.length; i++) { var d = balloons[i].position.distanceToSquared(me.pos); if (d < bd) { bd = d; best = balloons[i]; } }
    return best ? _target.copy(best.position) : null;
  }
  var _target = new T.Vector3();
  function updateMission(dt, now) {
    if (!mission) { missionWait -= dt; beacon.visible = false; $("g-mission").textContent = "Mission: a new one is on its way"; if (missionWait <= 0) startMission(); return; }
    if (mission.type === "mail") {
      var c = mission.phase === 0 ? mission.a : mission.b;
      beacon.visible = true; beacon.position.set(c.x, c.y + 260, c.z); beacon.material.color.setHex(mission.phase === 0 ? 0x6ff0d2 : 0xff9ad5);
      beacon.material.opacity = 0.32 + 0.12 * Math.sin(now * 0.004);
      $("g-mission").textContent = mission.phase === 0 ? "Mail run: collect the mail at " + islandLabel(mission.a) + " (green light)" : "Mail run: deliver to " + islandLabel(mission.b) + " (pink light)";
      if (Math.hypot(me.pos.x - c.x, me.pos.z - c.z) < 44 && me.pos.y > c.y && me.pos.y < c.y + 520) {
        blip(880);
        if (mission.phase === 0) { mission.phase = 1; toast("Mail on board. Deliver it to " + islandLabel(mission.b)); }
        else { save.stars++; persist(); toast("Mail delivered. +1 star"); mission = null; missionWait = 5; }
      }
    } else {
      beacon.visible = false;
      for (var i = balloons.length - 1; i >= 0; i--) {
        var b = balloons[i]; b.userData.bob += dt; b.position.y = b.userData.base + Math.sin(b.userData.bob * 0.7) * 5; b.position.x += 2.5 * dt;
        if (b.position.distanceTo(me.pos) < 20) { scene.remove(b); balloons.splice(i, 1); mission.left--; blip(520 + (5 - mission.left) * 90); if (mission.left > 0) toast(mission.left + " balloon" + (mission.left === 1 ? "" : "s") + " to go"); }
      }
      $("g-mission").textContent = "Balloon chase: tag " + mission.left + " more";
      if (mission.left <= 0) { save.stars++; persist(); toast("All five tagged. +1 star"); mission = null; missionWait = 5; }
    }
  }

  /* ---------- landmarks ---------- */
  function checkLandmarks() {
    islands.forEach(function (mesh) {
      var c = mesh.userData.info;
      if (c.lm < 0 || markSet[c.key]) return;
      if (Math.hypot(me.pos.x - c.x, me.pos.z - c.z) < c.R + 90 && Math.abs(me.pos.y - c.y - 40) < 190) {
        markSet[c.key] = true; save.marks.push({ k: c.key, n: c.name }); persist(); toast("Discovered: " + c.name); blip(990); blip(1320, 0.12);
      }
    });
  }

