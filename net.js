"use strict";
/* Cloud Sea / net.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- rooms: each group has its own code; players in a room see only each other ---------- */
  var lobby = null, room = null, roomCode = "", peerList = [], remotes = new Map(), sendT = 0, myPeer = null, msgSeen = {}, pingSeen = {}, pings = [], msgLog = [], myQ = [0, 0], myPg = [0, 0, 0], seqQ = 0, seqPg = 0, pilotBuf = null;
  var QUICK = ["Follow me", "Land here", "Nice one!", "Wait for me", "Thank you"], ANIMS = ["Idle", "Walk", "Run", "Jump", "Wave", "PickUp"], CODE_WORDS = ["KITE", "WING", "GLIDE", "SWIFT", "LARK", "ORBIT", "SUMMIT", "BREEZE", "CLOUD", "ALPINE"];
  function labelSprite(text) {
    var c = document.createElement("canvas"); c.width = 256; c.height = 64; var g = c.getContext("2d");
    g.font = "800 30px Nunito, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 6; g.strokeStyle = "rgba(10,30,80,0.85)"; g.strokeText(text, 128, 32); g.fillStyle = "#fff"; g.fillText(text, 128, 32);
    var tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; var s = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, fog: false })); s.scale.set(34, 8.5, 1); s.position.y = 8; return s;
  }
  function cleanName(n) { return String(n === undefined || n === null ? "" : n).replace(/[^\w \-.]/g, "").slice(0, 14) || "Pilot"; }
  function num(v, lo, hi, def) { return typeof v === "number" && isFinite(v) ? clamp(v, lo, hi) : def; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function normCode(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9\-]/g, "").slice(0, 16); }
  function newCode() { return CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)] + "-" + (10 + Math.floor(Math.random() * 90)); }

  /* a remote player's pilot on foot: its own copy of the Blender model, with its own animation mixer */
  function makeRemotePilot(rm) {
    try {
      if (!window.PILOT_GLB || !T.GLTFLoader) return;
      if (!pilotBuf) { var bin = atob(window.PILOT_GLB), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); pilotBuf = u8.buffer; }
      new T.GLTFLoader().parse(pilotBuf.slice(0), "", function (gltf) {
        if (rm.dead) return;
        var o = gltf.scene, c = new T.Color(PLANE_COLORS[rm.ci]); o.scale.setScalar(PILOT_S); o.rotation.order = "YXZ"; o.visible = false;
        o.traverse(function (m) { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; if (m.material) { m.material.roughness = 0.85; m.material.metalness = 0; if (m.material.name === "Scarf") m.material.color.copy(c); if (m.material.name === "Jacket") m.material.color.setHex(0x8c5229).lerp(c, 0.45); } } });
        dressPilot(o, rm.ci, rm.hat, rm.jak);
        var mx = new T.AnimationMixer(o), acts = {}; gltf.animations.forEach(function (cl) { acts[cl.name] = mx.clipAction(cl); });
        o.add(labelSprite(rm.name)); o.children[o.children.length - 1].position.y = 2.6; o.children[o.children.length - 1].scale.set(26 / PILOT_S, 6.5 / PILOT_S, 1);
        scene.add(o); rm.pilot = o; rm.mixer = mx; rm.acts = acts; rm.cur = "";
      }, function () { /* no remote pilot model */ });
    } catch (e) { /* ignore */ }
  }
  function remoteAnim(rm, name) {
    var a = rm.acts && rm.acts[name]; if (!a || rm.cur === name) return;
    var o = rm.acts[rm.cur], once = name === "Jump" || name === "Wave" || name === "PickUp";
    a.setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity); a.clampWhenFinished = once; a.timeScale = once ? ONCE[name] || 1 : 1; a.reset().play(); if (o) o.crossFadeTo(a, 0.2, false); rm.cur = name;
  }
  function dropRemote(rm) { rm.dead = true; scene.remove(rm.g); if (rm.pilot) scene.remove(rm.pilot); }
  function peersNow() {
    var l = [];
    if (room && typeof room.peers === "function") { try { l = room.peers() || []; } catch (e) { l = []; } }
    if (!l.length && peerList.length) l = peerList;
    return Array.isArray(l) ? l : [];
  }
  function isHost() {   // the one player who simulates shared things: the lowest peer id in the room
    var me2 = null, lo = null; peersNow().forEach(function (p) { if (!p || p.kind !== "viewer") return; var id = String(p.peer); if (lo === null || id < lo) lo = id; if (p.isMe && p.sameTab) me2 = id; });
    return !room || me2 === null || me2 === lo;
  }
  function modeCode() { return onFoot ? 3 : mode === "water" ? 1 : mode === "ground" ? 2 : 0; }
  function publish() {
    var pl = [r1(me.pos.x), r1(me.pos.y), r1(me.pos.z), Math.round(me.yaw * 1000) / 1000, Math.round(me.pitch * 1000) / 1000, Math.round(me.roll * 1000) / 1000];
    var st = { m: modeCode(), pl: pl, n: cleanName(save.nick), c: colorIdx, v: vehicle, h: save.hat | 0, j: save.jak | 0, hc: myHc, hb: myHb, k: save.course, r: ringIdx, s: save.stars, q: myQ, pg: myPg };
    if (onFoot) { st.pp = [r1(pilot.pos.x), r1(pilot.pos.y), r1(pilot.pos.z), Math.round(pilot.yaw * 1000) / 1000]; st.a = Math.max(0, ANIMS.indexOf(pCur)); }
    var rc = raceState(); if (rc) st.rc = rc;
    room.presence(st).catch(function () { /* dropped update, the next one fixes it */ });
  }
  /* ---------- shared balloon hunt: every four minutes eight gold balloons appear for the whole room ---------- */
  var hunt = { ep: -1, c: null, meshes: [], done: false }, joinT = 0, myHc = null, myHb = [0, 0], huntLine = "";
  function clearHunt() { hunt.meshes.forEach(function (m) { if (m) scene.remove(m); }); hunt.meshes = []; hunt.c = null; hunt.ep = -1; huntLine = ""; }
  function updateHunt(list) {
    var ep = Math.floor(Date.now() / 240000);
    if (hunt.ep !== ep) { clearHunt(); hunt.ep = ep; hunt.done = false; myHb = [ep, 0]; myHc = null; }
    var lo = null, loMe = false, src = null, srcId = null, mask = myHb[1], counts = [{ n: "You", m: myHb[1] }], i;
    for (i = 0; i < list.length; i++) {
      var p = list[i]; if (!p || p.kind !== "viewer") continue;
      var id = String(p.peer), mine = !!(p.isMe && p.sameTab), pr = p.presence || {};
      if (lo === null || id < lo) { lo = id; loMe = mine; }
      if (mine) continue;
      if (Array.isArray(pr.hc) && pr.hc[0] === ep && pr.hc.length >= 4 && (srcId === null || id < srcId)) { srcId = id; src = pr.hc; }
      if (Array.isArray(pr.hb) && pr.hb[0] === ep) { var mk = Math.floor(num(pr.hb[1], 0, 255, 0)); mask |= mk; counts.push({ n: cleanName(pr.n), m: mk }); }
    }
    var want = null;
    if (src && (!hunt.c || (myPeer !== null && srcId < String(myPeer)))) want = [num(src[1], -1e7, 1e7, 0), num(src[2], 60, 700, 250), num(src[3], -1e7, 1e7, 0)];
    else if (!hunt.c && loMe && started && Date.now() - joinT > 4000) want = [Math.round(me.pos.x - Math.sin(me.yaw) * 500), Math.round(clamp(me.pos.y, 140, 520)), Math.round(me.pos.z - Math.cos(me.yaw) * 500)];
    if (want && (!hunt.c || want[0] !== hunt.c[0] || want[1] !== hunt.c[1] || want[2] !== hunt.c[2])) {
      var fresh = !hunt.c; hunt.meshes.forEach(function (m0) { if (m0) scene.remove(m0); }); hunt.meshes = []; hunt.c = want;
      myHc = [ep, want[0], want[1], want[2]]; var rr = mulberry(ep * 7 + 13);
      for (i = 0; i < 8; i++) { var a = rr() * TAU, d = 120 + rr() * 320, b = makeBalloon(0xffd23f); b.scale.setScalar(0.8); b.position.set(want[0] + Math.cos(a) * d, want[1] - 40 + rr() * 130, want[2] + Math.sin(a) * d); scene.add(b); hunt.meshes.push(b); }
      if (fresh) toast("Shared balloon hunt! Eight gold balloons for the whole room.");
    }
    if (!hunt.c) { huntLine = ""; return; }
    var left = 0;
    for (i = 0; i < 8; i++) {
      var m = hunt.meshes[i]; if (!m) continue;
      if (mask & (1 << i)) { scene.remove(m); hunt.meshes[i] = null; continue; }
      if (!onFoot && started && m.position.distanceTo(me.pos) < 24) { myHb = [ep, myHb[1] | (1 << i)]; scene.remove(m); hunt.meshes[i] = null; blip(660 + i * 60); continue; }
      left++;
    }
    if (left === 0 && !hunt.done) {
      hunt.done = true; save.stars++; persist(); counts.forEach(function (c) { var n = 0; for (var k = 0; k < 8; k++) if (c.m & (1 << k)) n++; c.k = n; }); counts.sort(function (x, y) { return y.k - x.k; });
      toast("Shared hunt complete. +1 star for everyone. " + counts[0].n + " popped the most: " + counts[0].k); blip(990); blip(1320, 0.12);
    }
    huntLine = hunt.done ? "Shared hunt done. Next one soon." : "Shared hunt: " + left + " gold balloon" + (left === 1 ? "" : "s") + " left";
  }
  function updateFriends(dt) {
    var rbar = $("roombar"); if (rbar && rbar.hidden !== !started) setRoomUI();
    if (!room) { clearHunt(); if (remotes.size) { remotes.forEach(dropRemote); remotes.clear(); } $("friends").hidden = true; return; }
    sendT -= dt; if (sendT <= 0 && started) { sendT = 0.1; publish(); }
    var list = peersNow(), seen = {}, rows = [], raceRows = [], now = Date.now();
    for (var i = 0; i < list.length; i++) {
      var p = list[i]; if (!p || p.kind !== "viewer") continue;
      if (p.isMe && p.sameTab) { myPeer = String(p.peer); continue; }
      var pr = p.presence || {}, pl = pr.pl; if (!Array.isArray(pl) || pl.length < 6) continue;
      var id = String(p.peer), rm = remotes.get(id), nm = cleanName(pr.n), ci = Math.floor(num(pr.c, 0, PLANE_COLORS.length - 1, 0));
      var rv = Math.floor(num(pr.v, 0, 1, 0)), rh = Math.floor(num(pr.h, 0, 3, 0)), rj = Math.floor(num(pr.j, 0, 4, 0));
      if (!rm || rm.name !== nm || rm.ci !== ci || rm.v !== rv || rm.hat !== rh || rm.jak !== rj) {
        if (rm) dropRemote(rm);
        var g = makePlane(PLANE_COLORS[ci], rv); g.add(labelSprite(nm)); scene.add(g);
        rm = { g: g, name: nm, ci: ci, v: rv, hat: rh, jak: rj, pos: new T.Vector3(num(pl[0], -1e7, 1e7, 0), num(pl[1], -600, 3000, 100), num(pl[2], -1e7, 1e7, 0)), yaw: 0, pitch: 0, roll: 0, pp: new T.Vector3(), pyaw: 0, pinit: false, pilot: null }; remotes.set(id, rm); makeRemotePilot(rm);
      }
      seen[id] = true;
      var k = Math.min(1, dt * 7), md = Math.floor(num(pr.m, 0, 3, 0));
      _v.set(num(pl[0], -1e7, 1e7, 0), num(pl[1], -600, 3000, 100), num(pl[2], -1e7, 1e7, 0));
      if (rm.pos.distanceToSquared(_v) > 250000) rm.pos.copy(_v); else rm.pos.lerp(_v, k);   // a long jump (reset, race grid) snaps instead of sliding
      rm.yaw = angLerp(rm.yaw, num(pl[3], -1e4, 1e4, 0), k); rm.pitch = lerp(rm.pitch, num(pl[4], -1.6, 1.6, 0), k); rm.roll = lerp(rm.roll, num(pl[5], -1.6, 1.6, 0), k);
      placePlane(rm.g, rm.pos, rm.yaw, rm.pitch, rm.roll, md === 0 ? dt * 40 : 0);
      var ppv = pr.pp;
      if (md === 3 && Array.isArray(ppv) && ppv.length >= 4 && rm.pilot) {
        _v.set(num(ppv[0], -1e7, 1e7, 0), num(ppv[1], -600, 3000, 0), num(ppv[2], -1e7, 1e7, 0));
        if (!rm.pinit || rm.pp.distanceToSquared(_v) > 400) { rm.pp.copy(_v); rm.pinit = true; } else rm.pp.lerp(_v, Math.min(1, dt * 9));
        rm.pyaw = angLerp(rm.pyaw, num(ppv[3], -1e4, 1e4, 0), Math.min(1, dt * 9));
        rm.pilot.visible = true; rm.pilot.position.copy(rm.pp); rm.pilot.rotation.set(0, rm.pyaw + Math.PI, 0);
        remoteAnim(rm, ANIMS[Math.floor(num(pr.a, 0, 5, 0))] || "Idle"); rm.mixer.update(dt);
      } else if (rm.pilot) { rm.pilot.visible = false; rm.pinit = false; }
      rows.push({ n: nm, s: Math.floor(num(pr.s, 0, 1e6, 0)), d: rm.pos.distanceTo(me.pos), foot: md === 3, k: Math.floor(num(pr.k, 0, 9999, 0)) + 1, r: Math.floor(num(pr.r, 0, 10, 0)) });
      // quick messages and pings: act on a new sequence number only once
      var q = pr.q, qs = Array.isArray(q) ? q[0] : 0;
      if (msgSeen[id] === undefined) msgSeen[id] = qs; else if (qs > 0 && qs !== msgSeen[id]) { msgSeen[id] = qs; showMsg(nm, QUICK[Math.floor(num(q[1], 0, QUICK.length - 1, 0))]); }
      var pg = pr.pg, ps = Array.isArray(pg) ? pg[0] : 0;
      if (pingSeen[id] === undefined) pingSeen[id] = ps; else if (ps > 0 && ps !== pingSeen[id]) { pingSeen[id] = ps; pings.push({ x: num(pg[1], -1e7, 1e7, 0), z: num(pg[2], -1e7, 1e7, 0), t: now, n: nm }); showMsg(nm, "pinged a spot on the map"); }
      if (pr.rc && pr.rc.id) raceRows.push({ id: id, n: nm, rc: pr.rc, pos: rm.pos });
    }
    remotes.forEach(function (rm2, id2) { if (!seen[id2]) { dropRemote(rm2); remotes.delete(id2); } });
    pings = pings.filter(function (q2) { return now - q2.t < 12000; });
    raceUpdate(dt, raceRows); updateHunt(list);
    var box = $("friends");
    if (!rows.length && !msgLog.length && !huntLine) { box.hidden = true; return; }
    box.hidden = false; box.textContent = "";
    if (huntLine) { var hl = document.createElement("div"); hl.textContent = huntLine; hl.style.color = "#ffd23f"; box.appendChild(hl); }
    if (rows.length) rows.push({ n: "You", s: save.stars, d: -1 });
    rows.sort(function (a, b) { return b.s - a.s; }).slice(0, 7).forEach(function (r) {
      var line = document.createElement("div"), sub = document.createElement("span");
      line.textContent = r.n + " \u2605" + r.s + " "; sub.textContent = r.d < 0 ? "" : Math.round(r.d) + " m \u00b7 " + (r.foot ? "on foot" : "course " + r.k + ", ring " + r.r); line.appendChild(sub); box.appendChild(line);
    });
    msgLog = msgLog.filter(function (m) { return now - m.t < 6000; });
    msgLog.forEach(function (m) { var line = document.createElement("div"); line.textContent = m.n + ": " + m.s; line.style.color = "#ffd23f"; box.appendChild(line); });
  }
  function showMsg(n, s) { msgLog.push({ n: n, s: s, t: Date.now() }); blip(880, 0.02); }
  function sendQuick(i) { if (!room) return; myQ = [++seqQ + Math.floor(Math.random() * 1e6) * 100, i]; showMsg("You", QUICK[i]); }
  function sendPing() { if (!room) return; myPg = [++seqPg + Math.floor(Math.random() * 1e6) * 100, r1(me.pos.x), r1(me.pos.z)]; pings.push({ x: me.pos.x, z: me.pos.z, t: Date.now(), n: "You" }); toast("Spot marked on everyone's map"); }

  /* joining and leaving */
  function setRoomUI() {
    var bar = $("roombar"); if (!bar) return;
    bar.hidden = !started; if (room) $("rb-code").textContent = roomCode;
    ["rb-lab", "rb-race", "rb-ping", "rb-say", "rb-copy", "rb-leave"].forEach(function (id) { $(id).hidden = !room; }); $("rb-join").textContent = room ? "Switch" : "Join";
    var sl = $("room-status"); if (sl) sl.textContent = room ? "In room " + roomCode : "";
  }
  function getLobby() {
    if (lobby && typeof lobby.join === "function") return Promise.resolve(lobby);
    try { if (window.claude && typeof window.claude.use === "function") return window.claude.use("room").then(function (r) { if (r) lobby = r; return r; }).catch(function () { return null; }); } catch (e) { /* none */ }
    return Promise.resolve(null);
  }
  function whyFailed(e) { var m = e && (e.message || e.code || e.name) ? String(e.message || e.code || e.name) : String(e || "unknown"); return m.slice(0, 90); }
  function joinRoom(code) {
    code = normCode(code); if (code.length < 3) { toast("Type a room code first, or press New room"); return; }
    if (room) leaveRoom(true);
    toast("Joining " + code + "...");
    getLobby().then(function (lb) {
      if (!lb || typeof lb.join !== "function") { toast("Rooms need an invite. Ask the game owner to invite you by email from the Share menu, then open the game while signed in to Claude. The public link cannot join rooms."); return; }
      var res; try { res = lb.join(("cloud-sea-" + code).toLowerCase()); } catch (e) { toast("Join failed: " + whyFailed(e)); return; }
      return Promise.resolve(res).then(function (ns) {
        if (!ns) { toast("Join failed: the room service gave no room"); return; }
        room = ns; roomCode = code; peerList = []; joinT = Date.now(); clearHunt();
        try { ns.onPeers(function (ch) { var l = ch && Array.isArray(ch.peers) ? ch.peers : Array.isArray(ch) ? ch : []; peerList = l; }, function (e) { var c = e && e.code; if (c === "not_granted" || c === "revoked") toast("The room service does not admit this view. Ask the game owner to invite you from the Share menu, and open the game while signed in to Claude."); else leaveRoom(true); }); } catch (e) { /* peers() is read directly */ }
        setRoomUI(); toast("In room " + code + ". Send the code to your friends."); blip(700, 0.04);
      });
    }).catch(function (e) { var c = e && e.code; toast(c === "not_permitted" || c === "not_granted" ? "This view is not allowed to use rooms. Ask the game owner to invite you by email from the Share menu." : "Join failed: " + whyFailed(e)); });
  }
  function leaveRoom(quiet) {
    var r = room; room = null; roomCode = ""; peerList = []; msgSeen = {}; pingSeen = {};
    try { if (r && typeof r.leave === "function") r.leave(); } catch (e) { /* ignore */ }
    raceCancel(); setRoomUI(); if (!quiet) toast("Left the room. Back to flying solo.");
  }
  (function connect() {
    try {
      if (!window.claude || typeof window.claude.use !== "function") return;
      window.claude.use("room").then(function (r) { if (r) lobby = r; }).catch(function () {});
    } catch (e) { /* flying solo */ }
  })();
  (function roomUI() {
    var bar = document.createElement("div"); bar.id = "roombar"; bar.className = "panel"; bar.hidden = true;
    bar.style.cssText = "position:absolute;left:12px;top:84px;max-width:min(430px,calc(100vw - 250px));z-index:12;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-weight:800;pointer-events:auto";
    bar.innerHTML = '<span id="rb-lab" hidden>Room <b id="rb-code"></b></span><input id="rb-in" type="text" maxlength="16" autocomplete="off" placeholder="Room code" style="width:104px;padding:6px 8px;border-radius:12px;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.25);color:#fff;font:700 14px/1 inherit;text-transform:uppercase"><button type="button" id="rb-join">Join</button><button type="button" id="rb-new">New room</button><button type="button" id="rb-race" hidden>Race</button><button type="button" id="rb-ping" hidden>Ping</button><button type="button" id="rb-say" hidden>Say</button><button type="button" id="rb-copy" hidden>Copy code</button><button type="button" id="rb-leave" hidden>Leave</button>';
    stage.appendChild(bar);
    var bs = bar.querySelectorAll("button"); for (var i = 0; i < bs.length; i++) bs[i].style.cssText = "padding:6px 12px;border-radius:14px;font:700 14px/1 inherit;cursor:pointer;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.16);color:#fff";
    var sayBox = document.createElement("div"); sayBox.hidden = true; sayBox.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;width:100%";
    QUICK.forEach(function (q, qi) { var qb = document.createElement("button"); qb.type = "button"; qb.textContent = q; qb.style.cssText = "padding:6px 10px;border-radius:14px;font:700 13px/1 inherit;cursor:pointer;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.16);color:#fff"; qb.addEventListener("click", function () { sendQuick(qi); sayBox.hidden = true; sayBox.style.display = "none"; }); sayBox.appendChild(qb); });
    sayBox.style.display = "none"; bar.appendChild(sayBox);
    $("rb-say").addEventListener("click", function () { var open = sayBox.style.display === "none"; sayBox.style.display = open ? "flex" : "none"; this.blur(); });
    $("rb-join").addEventListener("click", function () { joinRoom($("rb-in").value); this.blur(); });
    $("rb-in").addEventListener("keydown", function (ev) { if (ev.code === "Enter") { joinRoom(this.value); this.blur(); } });
    $("rb-new").addEventListener("click", function () { var c = newCode(); $("rb-in").value = c; joinRoom(c); this.blur(); });
    $("rb-race").addEventListener("click", function () { startRace(); this.blur(); });
    $("rb-ping").addEventListener("click", function () { sendPing(); this.blur(); });
    $("rb-copy").addEventListener("click", function () { try { navigator.clipboard.writeText(roomCode); toast("Code " + roomCode + " copied"); } catch (e) { toast("Room code: " + roomCode); } this.blur(); });
    $("rb-leave").addEventListener("click", function () { leaveRoom(); this.blur(); });
    $("b-create").addEventListener("click", function () { var c = newCode(); $("room-code").value = c; joinRoom(c); });
    $("b-join").addEventListener("click", function () { joinRoom($("room-code").value); });
  })();
