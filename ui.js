"use strict";
/* Cloud Sea / ui.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- on-screen target markers ---------- */
  function marker(el, world, label) {
    if (!world) { el.style.display = "none"; return; }
    var w = stage.clientWidth, h = stage.clientHeight;
    _v.copy(world).project(camera);
    var behind = _v.z > 1, x = _v.x, y = _v.y;
    if (behind) { x = -x; y = -y; }
    var off = behind || Math.abs(x) > 0.92 || Math.abs(y) > 0.88;
    if (off) { var m = Math.max(Math.abs(x) / 0.92, Math.abs(y) / 0.88, 0.001); if (behind && m < 1) m = 0.001 + Math.max(Math.abs(x), Math.abs(y)) / 0.9 || 1; x /= m; y /= m; if (behind) { var l = Math.hypot(x, y) || 1; x = x / l * 0.9; y = y / l * 0.86; } }
    var px = (x * 0.5 + 0.5) * w, py = (-y * 0.5 + 0.5) * h;
    el.style.display = "flex"; el.classList.toggle("off", off);
    if (off) el.style.setProperty("--rot", (Math.atan2(-y, x) * 180 / Math.PI + 225) + "deg");
    el.style.transform = "translate(" + (px - 55) + "px," + (py - 14) + "px)";
    el.lastElementChild.textContent = label + " " + Math.round(world.distanceTo(me.pos)) + " m";
  }

  /* ---------- map: heading-up, click or N to enlarge ---------- */
  var mapC = $("map"), mctx = mapC.getContext("2d"), mapBig = false;
  function hex(c) { return "#" + c.toString(16).padStart(6, "0"); }
  function toggleMap() { mapBig = !mapBig; mapC.classList.toggle("big", mapBig); drawMap(); }
  mapC.addEventListener("click", toggleMap);
  mapC.addEventListener("keydown", function (ev) { if (ev.code === "Enter" || ev.code === "Space") { ev.preventDefault(); ev.stopPropagation(); toggleMap(); } });
  function drawMap() {
    var W = 512, c = W / 2, range = mapBig ? 6200 : 2300, k = (c - 16) / range, lim = c - 22, g = mctx, i;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
    g.save(); g.beginPath(); g.arc(c, c, c - 2, 0, TAU); g.clip();
    g.fillStyle = "rgba(14, 40, 96, 0.72)"; g.fillRect(0, 0, W, W);
    g.strokeStyle = "rgba(255,255,255,0.14)"; g.lineWidth = 2;
    for (i = 1; i <= 3; i++) { g.beginPath(); g.arc(c, c, (c - 16) * i / 3, 0, TAU); g.stroke(); }
    g.translate(c, c); g.rotate(me.yaw);
    function pt(x, z, clampIt) { var dx = (x - me.pos.x) * k, dz = (z - me.pos.z) * k, d = Math.hypot(dx, dz); if (clampIt && d > lim) { dx *= lim / d; dz *= lim / d; } return [dx, dz, d > lim]; }
    function dot(p, r, fill, stroke) { g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; g.stroke(); } }
    var cx = Math.round(me.pos.x / CELL), cz = Math.round(me.pos.z / CELL), span = Math.ceil(range / CELL) + 1, p;
    for (i = -span; i <= span; i++) for (var j = -span; j <= span; j++) {
      var ci = cellInfo(cx + i, cz + j); if (!ci.exists) continue;
      p = pt(ci.x, ci.z); if (Math.hypot(p[0], p[1]) > c + ci.R * k) continue;
      dot(p, Math.max(mapBig ? 3 : 5, ci.R * k), hex(BIOMES[ci.biome].g1), "rgba(255,255,255,0.55)");
      if (ci.R > 140) { var tm = terrainFor(ci); if (tm.strip) { var sp2 = pt(ci.x + tm.strip.x, ci.z + tm.strip.z); g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.beginPath(); g.moveTo(sp2[0] - tm.strip.cx * tm.strip.len * 0.5 * k, sp2[1] - tm.strip.cz * tm.strip.len * 0.5 * k); g.lineTo(sp2[0] + tm.strip.cx * tm.strip.len * 0.5 * k, sp2[1] + tm.strip.cz * tm.strip.len * 0.5 * k); g.stroke(); } if (tm.lake) dot(pt(ci.x + tm.lake.x, ci.z + tm.lake.z), Math.max(2, tm.lake.r * k), ci.biome === 6 ? "#ff7a2e" : "#5fd0e8"); }
      if (ci.lm >= 0) { if (markSet[ci.key]) dot(p, mapBig ? 5 : 8, "#ffd23f", "#14305f"); else dot(p, mapBig ? 5 : 8, "rgba(255,255,255,0.15)", "#ffffff"); }
    }
    var def = courseDef(curCourse());
    g.strokeStyle = "rgba(255,210,63,0.75)"; g.lineWidth = 4; g.beginPath();
    for (i = Math.min(9, ringIdx); i < 10; i++) { p = pt(def.pts[i].x, def.pts[i].z); if (i === Math.min(9, ringIdx)) g.moveTo(p[0], p[1]); else g.lineTo(p[0], p[1]); }
    g.stroke();
    p = pt(def.pts[Math.min(9, ringIdx)].x, def.pts[Math.min(9, ringIdx)].z, true); dot(p, 9, "#ffd23f", "#14305f");
    if (mission && mission.type === "mail") { var mc = mission.phase === 0 ? mission.a : mission.b; p = pt(mc.x, mc.z, true); dot(p, 10, mission.phase === 0 ? "#6ff0d2" : "#ff9ad5", "#14305f"); }
    for (i = 0; i < balloons.length; i++) { p = pt(balloons[i].position.x, balloons[i].position.z, true); dot(p, 7, "#6ff0d2", "#14305f"); }
    remotes.forEach(function (rm) {
      var q = pt(rm.pos.x, rm.pos.z, true); dot(q, mapBig ? 9 : 11, hex(PLANE_COLORS[rm.ci]), "#ffffff");
      g.save(); g.translate(q[0], q[1]); g.rotate(-me.yaw); g.font = "800 " + (mapBig ? 22 : 24) + "px Nunito, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "bottom"; g.lineWidth = 5; g.strokeStyle = "#14305f"; g.fillStyle = "#ffffff";
      var lab = rm.name + (q[2] ? " " + (Math.hypot(rm.pos.x - me.pos.x, rm.pos.z - me.pos.z) / 1000).toFixed(1) + " km" : ""); g.strokeText(lab, 0, -13); g.fillText(lab, 0, -13); g.restore();
    });
    hunt.meshes.forEach(function (hm) { if (hm) dot(pt(hm.position.x, hm.position.z, true), 7, "#ffd23f", "#ffffff"); });
    pings.forEach(function (pg2) { var q2 = pt(pg2.x, pg2.z, true), ph = ((Date.now() - pg2.t) % 1200) / 1200; g.strokeStyle = "#ffd23f"; g.lineWidth = 4; g.beginPath(); g.arc(q2[0], q2[1], 8 + ph * 16, 0, TAU); g.stroke(); dot(q2, 5, "#ffd23f", "#14305f"); });
    g.restore();
    // north marker on the rim, and you in the middle
    var nx = c + Math.sin(me.yaw) * (c - 20), ny = c - Math.cos(me.yaw) * (c - 20);
    g.fillStyle = "#ffffff"; g.font = "800 30px Nunito, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("N", nx, ny);
    g.fillStyle = "#ffffff"; g.strokeStyle = "#14305f"; g.lineWidth = 4; g.lineJoin = "round";
    g.beginPath(); g.moveTo(c, c - 20); g.lineTo(c + 13, c + 15); g.lineTo(c, c + 8); g.lineTo(c - 13, c + 15); g.closePath(); g.fill(); g.stroke();
    if (mapBig) { g.font = "700 20px Nunito, Arial, sans-serif"; g.fillStyle = "#ffffff"; g.fillText("You: " + Math.round(me.pos.x) + ", " + Math.round(me.pos.z) + "   Alt " + Math.round(me.pos.y) + " m", c, 40); }
    if (mapBig) { g.font = "700 20px Nunito, Arial, sans-serif"; g.fillStyle = "#cfe3ff"; g.fillText("Gold: rings and found landmarks   White ring: landmark to find   Mint: mission", c, W - 54); }
  }

  /* ---------- start, pause, logbook ---------- */
  var sw = $("swatches");
  PLANE_COLORS.forEach(function (c, i) {
    var lab = document.createElement("label"), inp = document.createElement("input"), dot = document.createElement("span");
    inp.type = "radio"; inp.name = "plane"; inp.id = "plane-" + i; inp.value = i; inp.setAttribute("aria-label", ["Red", "Amber", "Teal", "Blue", "Violet"][i]); if (i === save.color) inp.checked = true;
    dot.style.background = "#" + c.toString(16).padStart(6, "0");
    inp.addEventListener("change", function () { setColor(i); });
    lab.appendChild(inp); lab.appendChild(dot); sw.appendChild(lab);
  });
  function setColor(i) { colorIdx = clamp(i | 0, 0, PLANE_COLORS.length - 1); save.color = colorIdx; scene.remove(plane); plane = makePlane(PLANE_COLORS[colorIdx], vehicle); scene.add(plane); if (typeof tintPilot === "function") tintPilot(); }
  function setVehicle(v) { vehicle = v ? 1 : 0; save.veh = vehicle; persist(); setColor(colorIdx); $("b-veh").textContent = "Ride: " + (vehicle ? "dragon" : "plane"); toast(vehicle ? "You are riding a dragon. Flap away!" : "Back in the floatplane."); blip(vehicle ? 330 : 520, 0.06); }
  vehicle = save.veh ? 1 : 0; $("b-veh").textContent = "Ride: " + (vehicle ? "dragon" : "plane");
  $("b-veh").addEventListener("click", function () { setVehicle(!vehicle); this.blur(); });
  setColor(save.color); $("nick").value = save.nick; $("b-sound").textContent = "Sound: " + (save.sound ? "on" : "off");
  function begin() {
    if (started) return;
    save.nick = cleanName($("nick").value); persist(); started = true; $("ov-start").hidden = true;
    me.pos.set(0, 230, 640); me.yaw = 0; me.pitch = 0; me.speed = 80; mode = "fly"; if (onFoot) { onFoot = false; if (pilotObj) pilotObj.visible = false; } initAudio(); trails.forEach(function (t) { t.fresh = true; }); frame.prev = 0; slowT = 0; slowN = 0;
    if (audio && audio.ac.state === "suspended") audio.ac.resume();
    toast("Welcome, " + save.nick + ". The gold ring starts a course.");
  }
  function showPause(title, bodyNode) { paused = true; $("pause-title").textContent = title; var b = $("pause-body"); b.textContent = ""; if (bodyNode) b.appendChild(bodyNode); $("ov-pause").hidden = false; $("b-resume").focus(); }
  function togglePause() { if (!started) return; if (paused) { paused = false; $("ov-pause").hidden = true; } else showPause("Paused", looksNode()); }
  $("b-start").addEventListener("click", begin);
  $("b-resume").addEventListener("click", function () { paused = false; $("ov-pause").hidden = true; });
  $("b-reset").addEventListener("click", function () { resetPlane(); this.blur(); });
  $("b-pause").addEventListener("click", togglePause);
  $("b-sound").addEventListener("click", function () { initAudio(); setSound(!save.sound); });
  $("b-log").addEventListener("click", function () {
    var wrap = document.createElement("div"), p = document.createElement("p");
    p.textContent = save.stars + " stars. " + save.marks.length + " landmarks found. Plaques read: " + save.plaques.length + ". Crystals: " + (save.crystalCount || 0) + ". Islands landed on: " + save.lands.length + ". Ring courses finished: " + save.course + ".";
    wrap.appendChild(p);
    if (save.marks.length) { var ol = document.createElement("ol"); save.marks.slice(-40).forEach(function (m) { var li = document.createElement("li"); li.textContent = (cleanName(m.n).length ? String(m.n).slice(0, 40) : "Landmark") + (plaqueSet[m.k] ? "  \u2713 plaque read" : ""); ol.appendChild(li); }); wrap.appendChild(ol); }
    else { var p2 = document.createElement("p"); p2.textContent = "No landmarks yet. Look for windmills, lighthouses, arches and spires on the larger islands."; wrap.appendChild(p2); }
    if (!started) { $("ov-start").hidden = true; started = true; initAudio(); }
    showPause("Logbook", wrap);
  });
  $("b-full").addEventListener("click", function () { try { if (document.fullscreenElement) document.exitFullscreen(); else if (stage.requestFullscreen) { var p = stage.requestFullscreen(); if (p && p.catch) p.catch(function () {}); } } catch (e) { /* fullscreen refused */ } });

  function resize() { var w = stage.clientWidth || 800, h = stage.clientHeight || 600; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); makeTarget(); }
  $("b-gfx").addEventListener("click", function () { autoGfx = false; setGfx((tier + 2) % 3);  /* high -> medium -> light -> high */ });
  window.addEventListener("resize", resize); resize();
  /* first visit picks a tier from the device; after that the player's choice (or the auto step-down) is remembered */
  (function () {
    var touch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0), small = Math.min(screen.width, screen.height) < 700;
    var cores = navigator.hardwareConcurrency || 4, t0 = save.gfx >= 0 ? save.gfx : (touch || small || cores <= 4 ? 1 : 2);
    if (save.gfx >= 0) autoGfx = false;
    setGfx(t0);
  })();
  /* test rig: press F (or open the page with #fps) for a frame-rate readout */
  var fpsEl = document.createElement("div"); fpsEl.id = "fps";
  fpsEl.style.cssText = "position:absolute;left:8px;bottom:8px;z-index:20;font:12px/1.3 monospace;color:#fff;background:rgba(0,0,0,.55);padding:4px 7px;border-radius:6px;display:none;pointer-events:none";
  stage.appendChild(fpsEl); var fpsOn = /fps/.test(location.hash), fpsN = 0, fpsT = 0;
  if (fpsOn) fpsEl.style.display = "block";
  window.addEventListener("keydown", function (ev) { if (ev.code === "KeyV" && !ev.ctrlKey && !ev.metaKey) { fpsOn = !fpsOn; fpsEl.style.display = fpsOn ? "block" : "none"; } });
  function fpsTick(dt) { if (!fpsOn) return; fpsN++; fpsT += dt; if (fpsT >= 0.5) { fpsEl.textContent = Math.round(fpsN / fpsT) + " fps · " + Q.name + " · " + renderer.info.render.calls + " calls · " + Math.round(renderer.info.render.triangles / 1000) + "k tris"; fpsN = 0; fpsT = 0; } }

  /* ---------- swap in the Blender-made plane when it has loaded ---------- */
  (function loadPlane() {
    try {
      if (!window.PLANE_GLB || !T.GLTFLoader) return;
      var bin = atob(window.PLANE_GLB), u8 = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      new T.GLTFLoader().parse(u8.buffer, "", function (gltf) {
        planeProto = gltf.scene; setColor(colorIdx); trails.forEach(function (t) { t.fresh = true; });
        remotes.forEach(function (rm) { rm.name = null; });
      }, function () { /* keep the built-in plane */ });
    } catch (e) { /* keep the built-in plane */ }
  })();

  (function loadTrees() {
    try {
      if (!window.TREE_GLB || !T.GLTFLoader) return;
      var left = 2, got = {};
      ["pine", "leaf"].forEach(function (kind) {
        var bin = atob(window.TREE_GLB[kind]), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        new T.GLTFLoader().parse(u8.buffer, "", function (gltf) {
          gltf.scene.updateMatrixWorld(true); var o = {};
          gltf.scene.traverse(function (n) { if (n.isMesh) { var g = n.geometry.clone(); g.applyMatrix4(n.matrixWorld); if (!g.attributes.normal) g.computeVertexNormals(); o[(n.material && n.material.name) === "Bark" ? "trunk" : "crown"] = g; } });
          if (o.trunk && o.crown) got[kind] = o;
          if (--left === 0) {
            for (var k in got) { TREES[k].trunk = got[k].trunk; TREES[k].crown = got[k].crown; }
            islands.forEach(function (mesh) { scene.remove(mesh); mesh.geometry.dispose(); (mesh.userData.extra || []).forEach(function (g) { g.dispose(); }); });
            islands.clear(); lastCell = null; activeLake = null;
          }
        }, function () { left--; });
      });
    } catch (e) { /* keep the simple trees */ }
  })();

