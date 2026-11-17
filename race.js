"use strict";
/* Cloud Sea / race.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- races: a shared countdown from the wall clock, a live standings list, a finish table ---------- */
  var race = null, raceCourse = -1, raceHold = false, raceSeen = {}, raceEl = null, raceT = 0, lastRows = [];
  function curCourse() { return raceCourse >= 0 ? raceCourse : save.course; }
  function raceState() { return race ? { id: race.id, c: race.c, s: race.s, ri: Math.min(10, ringIdx), f: race.fin } : null; }
  function startRace() {
    if (!room) { toast("Join or create a room first"); return; }
    if (race && !race.over) { toast("A race is already running"); return; }
    beginRace({ id: Math.floor(Math.random() * 1e9) + 1, c: save.course, s: Date.now() + 7000 });
  }
  function beginRace(r) {
    if (!started) return;
    raceSeen[r.id] = true;
    race = { id: r.id, c: r.c, s: r.s, fin: 0, over: false, overT: 0 }; raceCourse = r.c; loadCourse();
    var def = courseDef(r.c), p0 = def.pts[0], p1 = def.pts[1], dx = p1.x - p0.x, dz = p1.z - p0.z, l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    var ids = [], n; peersNow().forEach(function (p) { if (p && p.kind === "viewer") ids.push(String(p.peer)); });
    ids.sort(); n = Math.max(1, ids.length); var idx = Math.max(0, ids.indexOf(myPeer)), lat = (idx - (n - 1) / 2) * 28;
    if (onFoot) boardPlane(true);
    me.pos.set(p0.x - dx * 110 - dz * lat, p0.y, p0.z - dz * 110 + dx * lat); me.yaw = Math.atan2(-dx, -dz); me.pitch = 0; me.roll = 0; me.speed = 80; mode = "fly";
    raceHold = true; trails.forEach(function (t) { t.fresh = true; }); camPos.copy(me.pos).add(cTmpV.set(Math.sin(me.yaw) * 30, 12, Math.cos(me.yaw) * 30));
    toast("Race on course " + (r.c + 1) + ". Get ready on the grid.");
  }
  function raceFinish(t) {
    race.fin = Math.max(0.1, Math.round(t * 10) / 10); raceHold = false; save.stars++; persist();
    toast("Finished in " + race.fin.toFixed(1) + " s. +1 star"); blip(990); blip(1320, 0.12);
  }
  function raceCancel() { if (race) { race = null; raceCourse = -1; raceHold = false; loadCourse(); if (raceEl) raceEl.hidden = true; } }
  function raceUpdate(dt, rows) {
    var now = Date.now(), i;
    if (!race) {
      for (i = 0; i < rows.length; i++) { var rc = rows[i].rc; if (rc && rc.id && !raceSeen[rc.id] && now < rc.s + 12000 && rc.s > now - 20000) { beginRace({ id: rc.id, c: Math.floor(num(rc.c, 0, 99999, 0)), s: rc.s }); break; } }
      if (!race) return;
    }
    if (race.s > now) { raceHold = true; } else if (raceHold) { raceHold = false; courseRunning = true; courseTime = 0; toast("GO!"); blip(1040, 0.02); blip(1320, 0.1); }
    // standings: finished by time, then rings passed, then distance to the next ring
    var def = courseDef(race.c), table = [{ n: "You", f: race.fin, ri: Math.min(10, ringIdx), d: me.pos.distanceTo(def.pts[Math.min(9, ringIdx)]), me: true }];
    rows.forEach(function (r) { if (r.rc.id === race.id) { var ri = Math.floor(num(r.rc.ri, 0, 10, 0)); table.push({ n: r.n, f: num(r.rc.f, 0, 1e5, 0), ri: ri, d: r.pos.distanceTo(def.pts[Math.min(9, ri)]) }); } });
    table.sort(function (a, b) { if (a.f && b.f) return a.f - b.f; if (a.f) return -1; if (b.f) return 1; return b.ri - a.ri || a.d - b.d; });
    lastRows = table;
    var allDone = table.every(function (r) { return r.f > 0; });
    if (!race.over && (allDone || now > race.s + 180000)) { race.over = true; race.overT = now; }
    if (race.over && now - race.overT > 14000) { raceCancel(); return; }
    raceT -= dt; if (raceT > 0) return; raceT = 0.2; drawRace(now);
  }
  function drawRace(now) {
    if (!raceEl) {
      raceEl = document.createElement("div"); raceEl.id = "race"; raceEl.className = "panel";
      raceEl.style.cssText = "position:absolute;left:50%;top:92px;transform:translateX(-50%);z-index:13;min-width:230px;text-align:center;font-weight:800;pointer-events:none";
      stage.appendChild(raceEl);
    }
    raceEl.hidden = false; var html = "", left = race.s - now;
    if (left > 0) html += '<div style="font-size:44px;line-height:1.1">' + Math.ceil(left / 1000) + "</div>";
    else if (!race.over) html += '<div style="font-size:15px;color:#ffd23f">' + ((now - race.s) / 1000).toFixed(1) + " s</div>";
    else html += '<div style="font-size:16px;color:#ffd23f">Finish table</div>';
    lastRows.slice(0, 8).forEach(function (r, i) {
      var el = document.createElement("span"); el.textContent = r.n;
      html += '<div style="text-align:left;display:flex;justify-content:space-between;gap:14px' + (r.me ? ";color:#ffd23f" : "") + '"><span>' + (i + 1) + ". " + el.innerHTML + "</span><span>" + (r.f ? r.f.toFixed(1) + " s" : "ring " + Math.min(10, r.ri) + "/10") + "</span></div>";
    });
    raceEl.innerHTML = html;
  }
