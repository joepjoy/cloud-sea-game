"use strict";
/* Cloud Sea / flight.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- flight ---------- */
  var fwd = new T.Vector3(), camPos = new T.Vector3(0, 210, 660), camLook = new T.Vector3(), bumpT = 0, liftT = 0;
  var boostE = 1, boostLock = false, boostIdle = 0, mode = "fly", hintT = 0, GEAR = 2.5;
  // the highest island surface directly under the plane, or null over open sky
  function surfaceUnder(px, pz) {
    if (px === undefined) { px = me.pos.x; pz = me.pos.z; }
    var cx = Math.round(px / CELL), cz = Math.round(pz / CELL), best = null;
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) {
      var c = cellInfo(cx + i, cz + j); if (!c.exists) continue;
      var dx = px - c.x, dz = pz - c.z, d = Math.hypot(dx, dz); if (d > c.R) continue;
      var tt = terrainFor(c), f = d / tt.edge(Math.atan2(dz, dx)); if (f > 1) continue;
      var th = tt.h(dx, dz), water = !!(tt.lake && c.biome !== 6 && th < tt.lakeH - 0.3 && Math.hypot(dx - tt.lake.x, dz - tt.lake.z) < tt.lake.r * 1.3);
      var lava = !!(tt.lake && c.biome === 6 && th < tt.lakeH - 0.3 && Math.hypot(dx - tt.lake.x, dz - tt.lake.z) < tt.lake.r * 1.3);
      var y = c.y + (water || lava ? tt.lakeH : th);
      if (!best || y > best.y) best = { c: c, t: tt, dx: dx, dz: dz, d: d, f: f, y: y, water: water, lava: lava, slope: water ? 0 : tt.slope(dx, dz), bot: c.y - c.D * Math.pow(1 - Math.min(1, d / c.R), 0.9) - 4 };
    }
    return best;
  }
  function touchDown(s) {
    mode = s.water ? "water" : "ground"; me.pos.y = s.y + GEAR; blip(s.water ? 300 : 180);
    if (me.speed >= 74) { if (hintT <= 0) { toast("Too fast to land. Hold Ctrl to slow down."); hintT = 6; } return; }
    var key = s.c.key;
    if (save.lands.indexOf(key) < 0) { save.lands.push(key); save.stars++; persist(); toast("First landing on " + islandLabel(s.c) + ". +1 star"); blip(880, 0.1); }
    else if (hintT <= 0) { toast(s.water ? "On the water. Hold Shift to speed up and take off." : "On the ground. Hold Shift to speed up and take off."); hintT = 8; }
  }
  /* reset: remember the last clear-air position, and jump back to it if the plane gets stuck */
  var safe = null, safeT = 0, stuckT = 0;
  function resetPlane() {
    if (!started) return;
    if (onFoot) { boardPlane(true); return; }
    if (safe) { me.pos.set(safe.x, safe.y + 25, safe.z); me.yaw = safe.yaw; }
    else { me.pos.set(0, 230, 640); me.yaw = 0; }
    me.pitch = 0; me.roll = 0; me.speed = 80; me.throttle = Math.max(me.throttle, 0.5); mode = "fly"; stuckT = 0; bumpT = 1; hintT = 0;
    trails.forEach(function (t) { t.fresh = true; });
    camPos.copy(me.pos).add(cTmpV.set(Math.sin(me.yaw) * 30, 12, Math.cos(me.yaw) * 30));
    toast("Back in the air"); blip(520, 0.05);
  }
  function trackSafety(dt, s) {
    if (mode === "fly") {
      stuckT = 0; safeT -= dt;
      if (safeT <= 0 && (!s || me.pos.y - s.y > 45 || me.pos.y < s.bot - 5) && me.pos.y > -150) { safeT = 1.5; safe = { x: me.pos.x, y: me.pos.y, z: me.pos.z, yaw: me.yaw }; }
    } else {
      stuckT = me.speed < 4 ? stuckT + dt : 0;
      if (stuckT > 5) { stuckT = -6; toast("Stuck? Press R or tap Reset to get back in the air."); }
    }
  }
  function fly(dt, inp) {
    if (inp.boost && !boostLock && boostE > 0) { boostE = Math.max(0, boostE - dt * 0.4); boostIdle = 0; if (boostE <= 0) { boostLock = true; toast("Boost empty. It refills when you ease off."); } }
    else { inp.boost = false; boostIdle += dt; if (boostIdle > 0.8) boostE = Math.min(1, boostE + dt * 0.13); if (boostLock && boostE >= 0.3) boostLock = false; }
    me.throttle = clamp(me.throttle + inp.up * dt * 0.6, 0, 1);
    hintT -= dt; bumpT -= dt; liftT -= dt;
    var s, i;
    if (mode !== "fly") {
      // taxiing: throttle sets speed, the surface carries the plane
      var want = me.throttle * (mode === "water" ? 80 : 86) + (inp.boost ? 22 : 0);
      me.speed += (want - me.speed) * Math.min(1, dt * (want > me.speed ? (mode === "water" ? 1.5 : 1.1) : mode === "water" ? 1.2 : 0.85));
      me.yaw -= inp.sx * dt * (0.45 + Math.min(1, me.speed / 50) * 0.6);
      me.pitch += ((me.speed > 55 ? 0.07 : 0) - me.pitch) * Math.min(1, dt * 3);
      me.roll += (-inp.sx * 0.1 * Math.min(1, me.speed / 40) - me.roll) * Math.min(1, dt * 4);
      fwd.set(-Math.sin(me.yaw), 0, -Math.cos(me.yaw));
      var ox = me.pos.x, oz = me.pos.z;
      me.pos.x += fwd.x * me.speed * dt; me.pos.z += fwd.z * me.speed * dt;
      s = surfaceUnder();
      if (!s || s.f > 0.94 || s.lava) { if (me.speed > 34) { mode = "fly"; me.pitch = 0.18; me.pos.y += 1.5; return; } me.pos.x = ox; me.pos.z = oz; me.speed *= 0.5; s = surfaceUnder(); if (!s) { mode = "fly"; return; } }
      else if (!s.water && s.slope > 0.42) { if (me.speed > 34) { mode = "fly"; me.pitch = 0.28; me.pos.y += 2; return; } me.pos.x = ox; me.pos.z = oz; me.speed *= 0.6; s = surfaceUnder(); if (!s) { mode = "fly"; return; } }
      trackSafety(dt, s); mode = s.water ? "water" : "ground";
      var rest = s.y + GEAR - (s.water ? 0.45 - Math.sin(performance.now() * 0.0016) * 0.1 : 0);
      me.pos.y += (rest - me.pos.y) * Math.min(1, dt * 12);
      if ((me.speed > (mode === "water" ? 46 : 54) && inp.sy > 0.15) || me.speed > (mode === "water" ? 58 : 66)) { mode = "fly"; me.pitch = 0.22; me.pos.y += 1.2; blip(420); }
      return;
    }
    me.yaw -= inp.sx * 0.95 * dt;
    var wantPitch = inp.sy * 0.72;
    if (me.throttle < 0.25 && inp.sy <= 0.05) wantPitch -= 0.14 * (1 - me.throttle / 0.25);   // throttled back: the plane settles on its own
    if (me.pos.y < -235) { wantPitch = Math.max(wantPitch, 0.45); if (liftT <= 0) { toast("An updraft lifts you off the cloud sea"); liftT = 8; } }
    if (me.pos.y > 1500) wantPitch = Math.min(wantPitch, -0.2);
    me.pitch += (wantPitch - me.pitch) * Math.min(1, dt * 2.4);
    me.roll += (-inp.sx * 0.85 - me.roll) * Math.min(1, dt * 3.2);
    var want2 = 52 + me.throttle * 66 + (inp.boost ? 70 : 0) - Math.sin(me.pitch) * 16;
    if (me.throttle < 0.2) want2 -= (0.2 - me.throttle) * 60;
    me.speed += (want2 - me.speed) * Math.min(1, dt * (inp.boost ? 1.6 : 0.9));
    fwd.set(-Math.sin(me.yaw) * Math.cos(me.pitch), Math.sin(me.pitch), -Math.cos(me.yaw) * Math.cos(me.pitch));
    me.pos.addScaledVector(fwd, me.speed * dt);
    s = surfaceUnder(); trackSafety(dt, s);
    if (s && me.pos.y < s.y + GEAR && me.pos.y > s.bot) {
      if (me.pos.y > s.c.y - 12) {
        if (!s.lava && (s.water || s.slope < 0.24) && me.pitch > -0.55 && s.f < 0.92) touchDown(s);
        else { me.pos.y = s.y + GEAR; me.pitch = Math.max(me.pitch, 0.25); if (bumpT <= 0) { blip(140); bumpT = 1.2; if (s.lava && hintT <= 0) { toast("Lava! Not a place to land."); hintT = 5; } } }
      } else {
        var push = (s.c.R - s.d) + 2; me.pos.x += s.dx / (s.d || 1) * Math.min(push, 60 * dt + 2); me.pos.z += s.dz / (s.d || 1) * Math.min(push, 60 * dt + 2);
        me.yaw = angLerp(me.yaw, Math.atan2(-s.dx, -s.dz) + Math.PI, Math.min(1, dt * 3)); if (bumpT <= 0) { blip(140); bumpT = 1.2; }
      }
    }
  }
  function placePlane(g, pos, yaw, pitch, roll, spin) { g.position.copy(pos); g.rotation.set(pitch, yaw, roll); g.userData.prop.rotation.z += spin; }
  function chaseCamera(dt, boost) {
    var back = vehicle ? 40 : 30, up = vehicle ? 17 : 9, k = 1 - Math.exp(-dt * 4.2);
    _v.set(me.pos.x + Math.sin(me.yaw) * back, me.pos.y + up - Math.sin(me.pitch) * 9, me.pos.z + Math.cos(me.yaw) * back);
    camPos.lerp(_v, k); camera.position.copy(camPos);
    camLook.copy(me.pos).addScaledVector(fwd, 26); camera.lookAt(camLook); camera.rotateZ(me.roll * 0.28);
    var fov = boost ? 74 : 62; if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix(); }
  }

