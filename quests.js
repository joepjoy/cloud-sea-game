"use strict";
/* Cloud Sea / quests.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- villagers with small errands, and how your pilot is dressed ---------- */
  var questSet = {}, quest = null, _qp = new T.Vector3();
  save.quests = Array.isArray(save.quests) ? save.quests.slice(-300) : []; save.quests.forEach(function (k) { questSet[k] = true; });
  var LOST = ["lantern", "compass", "kite", "teapot", "music box", "spyglass"];
  var VILL_COL = [0xd9534f, 0x3f8fd2, 0x58a55c, 0xe0a63a, 0x8e6bbf, 0x2bb3a3];
  var villGeo = { body: new T.CylinderGeometry(0.45, 0.62, 1.5, 8), head: new T.SphereGeometry(0.42, 10, 8), hat: new T.ConeGeometry(0.62, 0.55, 8), item: new T.BoxGeometry(0.7, 0.9, 0.7) };
  var skinMat = new T.MeshLambertMaterial({ color: 0xf0c8a0 }), strawMat = new T.MeshLambertMaterial({ color: 0xe8d28a }), itemMat = new T.MeshBasicMaterial({ color: 0xffd23f });
  var itemGlow = new T.SpriteMaterial({ map: glowTex("rgba(255,220,90,0.95)", "rgba(255,180,40,0)"), transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false });
  var bangMat = new T.MeshBasicMaterial({ color: 0x6ff0d2 });
  function addVillager(mesh, info, t, acts) {
    if (!t.strip || info.R <= 140) return;
    var sp = t.strip, rr = mulberry(info.seed + 909), spot = null, k, x, z, h;
    for (k = 0; k < 8 && !spot; k++) {
      var side = k % 2 ? -1 : 1, along = (Math.floor(k / 2) - 1.5) * sp.len * 0.22, off = sp.wid / 2 + 7 + Math.floor(k / 4) * 5;
      x = sp.x + sp.cx * along - sp.cz * off * side; z = sp.z + sp.cz * along + sp.cx * off * side; h = t.h(x, z);
      if (t.slope(x, z) < 0.5 && h > t.lakeH + 1 && Math.hypot(x, z) < info.R * 0.85 && !(t.lake && Math.hypot(x - t.lake.x, z - t.lake.z) < t.lake.r * 1.4)) spot = { x: x, y: h, z: z };
    }
    if (!spot) return;
    var item = null;
    for (k = 0; k < 60 && !item; k++) {
      var a = rr() * TAU, d = info.R * (0.25 + rr() * 0.45); x = Math.cos(a) * d; z = Math.sin(a) * d;
      if (d > t.edge(a) * 0.8 || t.slope(x, z) > 0.55) continue; h = t.h(x, z);
      if (h < t.lakeH + 1 || (t.lake && Math.hypot(x - t.lake.x, z - t.lake.z) < t.lake.r * 1.5) || Math.hypot(x - spot.x, z - spot.z) < 50) continue;
      item = { x: x, y: h, z: z };
    }
    if (!item) return;
    var col = VILL_COL[Math.floor(rr() * VILL_COL.length)], g = new T.Group();
    var body = new T.Mesh(villGeo.body, new T.MeshLambertMaterial({ color: col })), head = new T.Mesh(villGeo.head, skinMat), hat = new T.Mesh(villGeo.hat, strawMat), bang = new T.Mesh(plaqueStar.geometry, bangMat);
    body.position.y = 0.75; head.position.y = 1.85; hat.position.y = 2.35; bang.position.y = 3.6; body.castShadow = true; g.add(body); g.add(head); g.add(hat); g.add(bang);
    g.position.set(spot.x, spot.y, spot.z); mesh.add(g);
    var im = new T.Mesh(villGeo.item, itemMat), gl = new T.Sprite(itemGlow); gl.scale.set(7, 7, 1); im.add(gl); im.position.set(item.x, item.y + 1.2, item.z); im.visible = false; mesh.add(im);
    acts.vill = { x: spot.x, y: spot.y, z: spot.z, g: g, bang: bang, item: im, key: info.key, what: LOST[Math.floor(rr() * LOST.length)], mesh: mesh };
    bang.visible = !questSet[info.key];
  }
  function nearVillager() {
    var found = null;
    islands.forEach(function (mesh) {
      var a = mesh.userData.acts; if (found || !a || !a.vill) return;
      var v = a.vill; _qp.set(v.x, v.y, v.z).add(mesh.position);
      if (Math.hypot(_qp.x - pilot.pos.x, _qp.z - pilot.pos.z) < 6 && Math.abs(_qp.y - pilot.pos.y) < 9) found = v;
    });
    return found;
  }
  function say(title, text) { var q = document.createElement("p"); q.textContent = text; showPause(title, q); }
  function talkVillager(v) {
    if (questSet[v.key]) { say("Villager", "Thank you again for finding my " + v.what + ". Safe skies!"); return; }
    if (quest && quest.v === v && quest.stage === 1) {
      questSet[v.key] = true; save.quests.push(v.key); save.stars += 2; persist(); v.bang.visible = false; quest = null; blip(990); blip(1320, 0.12);
      var n = save.quests.length; say("Errand done", "You found my " + v.what + "! Here are 2 stars." + (n === 3 ? " You have helped three villagers: the crown is unlocked in the Pause menu." : n === 1 ? " The wizard hat is unlocked in the Pause menu." : "")); return;
    }
    if (quest && quest.v !== v) { quest.v.item.visible = false; }
    quest = { v: v, stage: 0 }; v.item.visible = true;
    say("Villager", "Hello, pilot! I dropped my " + v.what + " somewhere on this island. It glows gold. Could you walk over, pick it up and bring it back? Follow the gold marker.");
  }
  function updateQuests(dt) {
    if (!quest) return;
    var v = quest.v; if (islands.get(v.key) !== v.mesh) { quest = null; return; }
    if (quest.stage === 0) {
      v.item.rotation.y += dt * 2; _qp.copy(v.item.position).add(v.mesh.position);
      if (onFoot && Math.hypot(_qp.x - pilot.pos.x, _qp.z - pilot.pos.z) < 3.4 && Math.abs(_qp.y - pilot.pos.y - 1.2) < 5) { quest.stage = 1; v.item.visible = false; footOnce("PickUp"); toast("Got the " + v.what + ". Take it back to the villager."); blip(1180, 0.02); blip(1560, 0.12); }
    }
  }
  function questTarget() {
    if (!quest) return null; var v = quest.v;
    if (quest.stage === 0) _qp.copy(v.item.position).add(v.mesh.position); else _qp.set(v.x, v.y + 2, v.z).add(v.mesh.position);
    return _qp;
  }
  function questLabel() { return quest && quest.stage === 0 ? "Lost " + quest.v.what : "Villager"; }

  /* ---------- pilot looks: hats and jackets, shown to friends too ---------- */
  var HATS = ["flying cap", "explorer hat", "wizard hat", "crown"], JACKETS = ["match the plane", "brown leather", "navy", "forest green", "red"], JAK_COL = [0, 0x8c5229, 0x2c3550, 0x2f6b46, 0xb43a3a];
  function hatOpen(i) { return i < 2 || (i === 2 && save.quests.length >= 1) || (i === 3 && save.quests.length >= 3); }
  function makeHat(i) {
    var g = new T.Group(), m;
    function add(geo, col, y, o) { m = new T.Mesh(geo, new T.MeshStandardMaterial(Object.assign({ color: col, roughness: 0.8 }, o || {}))); m.position.y = y; m.castShadow = true; g.add(m); return m; }
    if (i === 1) { add(new T.CylinderGeometry(0.33, 0.33, 0.025, 14), 0xb9935a, 0.3); add(new T.CylinderGeometry(0.17, 0.19, 0.16, 12), 0xb9935a, 0.39); add(new T.CylinderGeometry(0.195, 0.195, 0.04, 12), 0x5a3b22, 0.33); }
    else if (i === 2) { add(new T.CylinderGeometry(0.34, 0.34, 0.025, 14), 0x3b3f9a, 0.3); add(new T.ConeGeometry(0.19, 0.55, 12), 0x3b3f9a, 0.58); add(new T.SphereGeometry(0.045, 8, 6), 0xffd23f, 0.87, { emissive: 0xffd23f, emissiveIntensity: 0.6 }); }
    else if (i === 3) { add(new T.CylinderGeometry(0.19, 0.18, 0.1, 12, 1, true), 0xffd23f, 0.35, { metalness: 0.9, roughness: 0.3, side: T.DoubleSide }); for (var k = 0; k < 6; k++) { var s = add(new T.ConeGeometry(0.04, 0.12, 5), 0xffd23f, 0.45, { metalness: 0.9, roughness: 0.3 }); s.position.x = Math.cos(k * TAU / 6) * 0.18; s.position.z = Math.sin(k * TAU / 6) * 0.18; } }
    return g;
  }
  function dressPilot(root, ci, hat, jak) {
    if (!root) return; var c = new T.Color(PLANE_COLORS[ci] || PLANE_COLORS[0]), bone = null;
    root.traverse(function (o) {
      if (o.isBone && /^Head/.test(o.name) && !bone) bone = o;
      if (o.isMesh && o.material) { if (o.material.name === "Scarf") o.material.color.copy(c); if (o.material.name === "Jacket") { if (jak > 0 && JAK_COL[jak]) o.material.color.setHex(JAK_COL[jak]); else o.material.color.setHex(0x8c5229).lerp(c, 0.45); } }
    });
    if (bone) { if (bone.userData.hat) { bone.remove(bone.userData.hat); bone.userData.hat = null; } if (hat > 0) { bone.userData.hat = makeHat(hat); bone.add(bone.userData.hat); } }
  }
  function looksNode() {
    var wrap = document.createElement("div"); wrap.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:6px 0 12px";
    function btn(label, fn) { var b = document.createElement("button"); b.type = "button"; b.textContent = label(); b.style.cssText = "padding:8px 14px;border-radius:12px;font-weight:800;cursor:pointer"; b.addEventListener("click", function () { fn(); b.textContent = label(); persist(); tintPilot(); }); wrap.appendChild(b); }
    btn(function () { return "Hat: " + HATS[save.hat]; }, function () { do { save.hat = (save.hat + 1) % HATS.length; } while (!hatOpen(save.hat)); });
    btn(function () { return "Jacket: " + JACKETS[save.jak]; }, function () { save.jak = (save.jak + 1) % JACKETS.length; });
    var note = document.createElement("p"); note.style.cssText = "width:100%;margin:0;font-size:14px;opacity:.8"; note.textContent = "Help villagers to unlock more hats: 1 errand for the wizard hat, 3 for the crown. Errands done: " + save.quests.length + "."; wrap.appendChild(note);
    return wrap;
  }
