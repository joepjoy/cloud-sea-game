"use strict";
/* Cloud Sea / foot.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- on foot: get out of the plane, explore the island, swim, jump, climb back in ---------- */
  var onFoot = false, pilotObj = null, pMixer = null, pActs = {}, pCur = "", pOnce = "", pOnceT = 0, footCamYaw = 0, footDist = 8, planeMode = "ground";
  var WALK_V = 4.4, RUN_V = 10.5, PILOT_S = 1.3, JUMP_V = 8.2, GRAV = 24, pilotMats = {};
  var pilot = { pos: new T.Vector3(), yaw: 0, speed: 0, vy: 0, air: false, fall: -1, kind: "ok" };
  var ONCE = { Jump: 1.9, Wave: 1.0, PickUp: 1.6 };
  (function loadPilot() {
    try {
      if (!window.PILOT_GLB || !T.GLTFLoader) return;
      var bin = atob(window.PILOT_GLB), u8 = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      new T.GLTFLoader().parse(u8.buffer, "", function (gltf) {
        pilotObj = gltf.scene; pilotObj.scale.setScalar(PILOT_S); pilotObj.visible = false; pilotObj.rotation.order = "YXZ";
        pilotObj.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material) { o.material.roughness = 0.85; o.material.metalness = 0; pilotMats[o.material.name] = o.material; } } });
        scene.add(pilotObj); pMixer = new T.AnimationMixer(pilotObj);
        gltf.animations.forEach(function (c) { pActs[c.name] = pMixer.clipAction(c); });
        tintPilot(); footAnim("Idle");
      }, function () { /* no pilot model: the walk still works, the pilot is just not drawn */ });
    } catch (e) { /* ignore */ }
  })();
  /* jacket and scarf follow the plane colour, so friends can tell each other apart */
  function tintPilot() { dressPilot(pilotObj, colorIdx, save.hat | 0, save.jak | 0); }
  function footAnim(name, scale) {
    var a = pActs[name]; if (!a) return;
    if (pCur !== name) { var o = pActs[pCur]; a.setLoop(T.LoopRepeat, Infinity); a.clampWhenFinished = false; a.reset().play(); if (o) o.crossFadeTo(a, 0.2, false); pCur = name; }
    a.timeScale = scale || 1;
  }
  function footOnce(name) {
    var a = pActs[name]; if (!a || pOnceT > 0) return;
    var o = pActs[pCur]; a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = ONCE[name] || 1; a.reset().play(); if (o && o !== a) o.crossFadeTo(a, 0.12, false);
    pCur = name; pOnce = name; pOnceT = a.getClip().duration / a.timeScale;
  }
  /* what is under the pilot at x,z: solid ground, shallow water (wade), deep water (swim), or something that blocks */
  function footProbe(x, z) {
    var s = surfaceUnder(x, z); if (!s) return { k: "none" };
    if (s.f >= 0.95) return { k: "edge", s: s };
    if (s.lava) return { k: "lava", s: s };
    if (s.water) {
      var bed = s.c.y + s.t.h(s.dx, s.dz), depth = s.y - bed;
      return depth < 1.1 ? { k: "wade", s: s, y: bed } : { k: "swim", s: s, y: s.y - 1.5 };
    }
    if (s.slope >= 1.0) return { k: "steep", s: s };
    return { k: "ok", s: s, y: s.y };
  }
  function walkable(p) { return p.k === "ok" || p.k === "wade" || p.k === "swim"; }
  function exitPlane() {
    if (!((mode === "ground" || mode === "water") && me.speed < 8)) { toast("Slow down and stop first (hold Ctrl)"); return; }
    var fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw), tries = [[-fz, fx], [fz, -fx], [-fx, -fz], [fx, fz]], pr = null, i, d = 6.5, tx = 0, tz = 0;
    for (i = 0; i < tries.length; i++) {
      tx = me.pos.x + tries[i][0] * d; tz = me.pos.z + tries[i][1] * d; pr = footProbe(tx, tz);
      if (walkable(pr)) break; pr = null;
    }
    if (!pr) { toast("No safe spot to step out here. Try flat ground or open water."); return; }
    planeMode = mode; me.speed = 0; me.throttle = 0; onFoot = true;
    pilot.pos.set(tx, pr.y, tz); pilot.yaw = Math.atan2(-tries[i][0], -tries[i][1]) + Math.PI; pilot.speed = 0; pilot.vy = 0; pilot.air = false; pilot.fall = -1; pilot.kind = pr.k; pOnceT = 0;
    footCamYaw = pilot.yaw; if (pilotObj) pilotObj.visible = true; footAnim("Idle");
    camPos.copy(camera.position); blip(660, 0.05);
    toast("On foot. W/S walk, A/D turn, Shift run, Space jump, Q wave, F near the plane to climb back in.");
  }
  function boardPlane(force) {
    if (!onFoot) return;
    var d = Math.hypot(pilot.pos.x - me.pos.x, pilot.pos.z - me.pos.z);
    if (d > 12 && !force) { toast("Walk back to your plane first (" + Math.round(d) + " m away), or press R"); return; }
    onFoot = false; if (pilotObj) pilotObj.visible = false; mode = planeMode; me.speed = 0; me.throttle = Math.min(me.throttle, 0.1); bumpT = 0;
    toast(force ? "Back at the plane" : "Back in the plane. Shift to speed up, pull up to take off."); blip(520, 0.05);
  }
  function toggleFoot() {
    if (!started) return;
    if (!onFoot) { exitPlane(); return; }
    var vg = nearVillager(); if (vg) { talkVillager(vg); return; }
    var pl = nearPlaque(); if (pl) readPlaque(pl); else boardPlane(false);
  }
  function readFoot() {
    var sx = 0, sy = 0, run = !!(keys.ShiftLeft || keys.ShiftRight) || tBoost, jump = !!keys.Space || tSlow;
    if (keys.ArrowLeft || keys.KeyA) sx -= 1; if (keys.ArrowRight || keys.KeyD) sx += 1;
    if (keys.ArrowUp || keys.KeyW) sy += 1; if (keys.ArrowDown || keys.KeyS) sy -= 1;
    if (sx === 0 && sy === 0 && stickV.id !== null) { sx = stickV.x; sy = -stickV.y; }
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < pads.length; i++) {
      var gp = pads[i]; if (!gp || !gp.connected) continue;
      var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0; if (Math.abs(ax) > 0.15 || Math.abs(ay) > 0.15) { sx = ax; sy = -ay; }
      if (gp.buttons[7] && gp.buttons[7].value > 0.4) run = true;
      if (gp.buttons[0] && gp.buttons[0].pressed) jump = true;
      var xb = !!(gp.buttons[2] && gp.buttons[2].pressed); if (xb && !readFoot.xb && !paused) toggleFoot(); readFoot.xb = xb;
      break;
    }
    var jp = jump && !readFoot.jp; readFoot.jp = jump;
    return { sx: clamp(sx, -1, 1), sy: clamp(sy, -1, 1), run: run, jump: jp };
  }
  function updateFoot(dt) {
    var inp = readFoot(); hintT -= dt;
    if (pOnceT > 0) { pOnceT -= dt; if (pOnceT <= 0) { pOnce = ""; pCur = ""; } }
    var locked = pOnce === "PickUp" || pOnce === "Wave";
    if (pilot.fall >= 0) { updateFall(dt); return; }
    pilot.yaw -= (locked ? 0 : inp.sx) * dt * 2.5;
    var here = footProbe(pilot.pos.x, pilot.pos.z), swim = here.k === "swim", wade = here.k === "wade";
    var top = swim ? WALK_V * 0.62 : wade ? WALK_V * 0.7 : WALK_V, topRun = swim ? WALK_V * 0.9 : wade ? RUN_V * 0.55 : RUN_V;
    var want = locked ? 0 : inp.sy > 0.1 ? (inp.run ? topRun : top) * inp.sy : inp.sy < -0.1 ? WALK_V * 0.5 * inp.sy : 0;
    pilot.speed += (want - pilot.speed) * Math.min(1, dt * 9);
    if (Math.abs(pilot.speed) > 0.05) {
      var fx = -Math.sin(pilot.yaw), fz = -Math.cos(pilot.yaw), nx = pilot.pos.x + fx * pilot.speed * dt, nz = pilot.pos.z + fz * pilot.speed * dt, pr = footProbe(nx, nz);
      if (!walkable(pr)) {
        if (pr.k === "edge" || pr.k === "none") { pilot.fall = 0; pilot.vy = 0; toast("Whoa! You stepped off the edge."); return; }
        var px = footProbe(nx, pilot.pos.z), pz = footProbe(pilot.pos.x, nz);
        if (walkable(px)) nz = pilot.pos.z; else if (walkable(pz)) nx = pilot.pos.x;
        else { nx = pilot.pos.x; nz = pilot.pos.z; pilot.speed = 0; if (hintT <= 0) { toast(pr.k === "lava" ? "Lava! Too hot to walk on." : "Too steep to climb. Turn around."); hintT = 4; } }
      }
      pilot.pos.x = nx; pilot.pos.z = nz;
    }
    var g = footProbe(pilot.pos.x, pilot.pos.z); if (g.y === undefined) g = here;
    if (g.k !== pilot.kind) { if (g.k === "swim") toast("Swimming. The plane is waiting on shore."); pilot.kind = g.k; }
    if (inp.jump && !pilot.air && !locked && g.k !== "swim") { pilot.vy = JUMP_V; pilot.air = true; footOnce("Jump"); blip(300, 0.02); }
    if (pilot.air) {
      pilot.pos.y += pilot.vy * dt; pilot.vy -= GRAV * dt;
      if (g.y !== undefined && pilot.vy < 0 && pilot.pos.y <= g.y) { pilot.pos.y = g.y; pilot.air = false; pilot.vy = 0; }
    } else if (g.y !== undefined) pilot.pos.y += (g.y - pilot.pos.y) * Math.min(1, dt * (swim ? 5 : 14));
    var sp = Math.abs(pilot.speed);
    if (pOnceT <= 0 && !pilot.air) {
      if (swim) footAnim(sp < 0.4 ? "Idle" : "Walk", clamp(sp / WALK_V * 1.2, 0.5, 1));
      else if (sp < 0.4) footAnim("Idle"); else if (sp < WALK_V * 1.25) footAnim("Walk", clamp(sp / WALK_V, 0.4, 1.4)); else footAnim("Run", clamp(sp / RUN_V, 0.7, 1.3));
    }
    if (pMixer) pMixer.update(dt);
    if (pilotObj) { pilotObj.position.copy(pilot.pos); pilotObj.rotation.set(0, pilot.yaw + Math.PI, 0); }
    footCamYaw = angLerp(footCamYaw, pilot.yaw, 1 - Math.exp(-dt * (sp > 0.5 ? 1.8 : 0.35)));
    updateActivities(dt); updateQuests(dt);
  }
  /* walked off an edge: fall for a moment, then go back to the plane, no penalty */
  function updateFall(dt) {
    pilot.fall += dt; pilot.vy -= 30 * dt; pilot.pos.y += pilot.vy * dt;
    pilot.pos.x += -Math.sin(pilot.yaw) * pilot.speed * dt * 0.5; pilot.pos.z += -Math.cos(pilot.yaw) * pilot.speed * dt * 0.5;
    if (pilotObj) { pilotObj.position.copy(pilot.pos); pilotObj.rotation.x += dt * 2; }
    if (pilot.fall > 1.3) { pilot.fall = -1; if (pilotObj) pilotObj.rotation.x = 0; boardPlane(true); toast("Back at the plane. No harm done."); }
  }
  function footCamera(dt) {
    var k = 1 - Math.exp(-dt * 6), hx = pilot.pos.x, hy = pilot.pos.y + 2.4, hz = pilot.pos.z;
    var dx = Math.sin(footCamYaw) * footDist, dy = 1.4 + footDist * 0.22, dz = Math.cos(footCamYaw) * footDist, f = 1, g, y;
    for (; f > 0.2; f -= 0.1) {   // pull the camera in when the ground would block the view
      g = surfaceUnder(hx + dx * f, hz + dz * f); y = hy + dy * f - 1.2;
      if (!g || y > g.y + 0.4) break;
    }
    _v.set(hx + dx * f, hy + dy * f, hz + dz * f);
    g = surfaceUnder(_v.x, _v.z); if (g && _v.y < g.y + 1.3 && pilot.fall < 0) _v.y = g.y + 1.3;
    camPos.lerp(_v, k); camera.position.copy(camPos);
    camLook.set(hx, pilot.pos.y + 1.9, hz); camera.lookAt(camLook);
    if (Math.abs(camera.fov - 60) > 0.1) { camera.fov += (60 - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  }
  /* the little action button: get out / get in / read the plaque */
  var actBtn = $("b-act"), actMode = "", tb = $("t-boost"), ts = $("t-slow");
  actBtn.addEventListener("click", function () { toggleFoot(); actBtn.blur(); });
  function footPrompt() {
    var m = "";
    if (onFoot) {
      var pl = nearPlaque();
      if (nearVillager()) m = "Talk  (F)"; else if (pl) m = "Read the plaque  (F)"; else if (Math.hypot(pilot.pos.x - me.pos.x, pilot.pos.z - me.pos.z) < 12) m = "Get in the plane  (F)";
    } else if ((mode === "ground" || mode === "water") && me.speed < 8 && !paused) m = "Get out and explore  (F)";
    if (m !== actMode) { actMode = m; actBtn.hidden = !m; actBtn.textContent = m; }
    var want = onFoot ? "Run" : "Boost"; if (tb.textContent !== want) { tb.textContent = want; ts.textContent = onFoot ? "Jump" : "Slow"; $("t-up").textContent = onFoot ? "Wave" : "Faster"; }
  }
  canvas.addEventListener("pointermove", function (ev) { if (onFoot && ev.buttons & 1 && ev.pointerType === "mouse") footCamYaw -= ev.movementX * 0.006; });
  canvas.addEventListener("wheel", function (ev) { if (onFoot) { footDist = clamp(footDist + ev.deltaY * 0.01, 3.5, 16); ev.preventDefault(); } }, { passive: false });
  window.addEventListener("keydown", function (ev) { if (ev.code === "KeyQ" && onFoot && !paused && !ev.ctrlKey && !ev.metaKey) footOnce("Wave"); });
