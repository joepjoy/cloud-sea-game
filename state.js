"use strict";
/* Cloud Sea / state.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- world streaming ---------- */
  var islands = new Map(), queue = [], lastCell = null;
  function refreshIslands() {
    var cx = Math.round(me.pos.x / CELL), cz = Math.round(me.pos.z / CELL), key = cx + "," + cz;
    if (key === lastCell && queue.length === 0) return;
    if (key !== lastCell) {
      lastCell = key; queue = [];
      for (var i = -VIEW_CELLS; i <= VIEW_CELLS; i++) for (var j = -VIEW_CELLS; j <= VIEW_CELLS; j++) {
        if (i * i + j * j > VIEW_CELLS * VIEW_CELLS + 2) continue;
        var c = cellInfo(cx + i, cz + j); if (c.exists && !islands.has(c.key)) queue.push({ c: c, d: i * i + j * j });
      }
      queue.sort(function (a, b) { return a.d - b.d; });
      islands.forEach(function (mesh, k) {
        var c2 = mesh.userData.info; if (Math.abs(c2.cx - cx) > VIEW_CELLS + 1 || Math.abs(c2.cz - cz) > VIEW_CELLS + 1) { scene.remove(mesh); mesh.geometry.dispose(); if (mesh.userData.blades) mesh.userData.blades.geometry.dispose(); (mesh.userData.extra || []).forEach(function (g) { g.dispose(); }); islands.delete(k); }
      });
    }
    var q = queue.shift();
    if (q && !islands.has(q.c.key)) { var m = makeIsland(q.c); m.userData.info = q.c; scene.add(m); islands.set(q.c.key, m); }
  }

  /* ---------- saved progress (this browser only) ---------- */
  var save = { stars: 0, marks: [], lands: [], course: 0, best: {}, nick: "", color: 0, sound: true, gfx: -1, crystals: [], plaques: [], crystalCount: 0, veh: 0, hat: 0, jak: 0, quests: [], music: true };
  try { var raw = localStorage.getItem("cloud-sea-save"); if (raw) { var o = JSON.parse(raw); for (var sk in save) if (o && o[sk] !== undefined && typeof o[sk] === typeof save[sk]) save[sk] = o[sk]; } } catch (e) { /* no storage: progress lasts this visit */ }
  function persist() { try { localStorage.setItem("cloud-sea-save", JSON.stringify(save)); } catch (e) { /* ignore */ } }
  var crystalSet = {}, plaqueSet = {};
  save.crystals = Array.isArray(save.crystals) ? save.crystals.slice(-600) : []; save.plaques = Array.isArray(save.plaques) ? save.plaques.slice(-300) : [];
  save.crystals.forEach(function (k) { crystalSet[k] = true; }); save.plaques.forEach(function (k) { plaqueSet[k] = true; });
  var markSet = {}; save.lands = Array.isArray(save.lands) ? save.lands.slice(0, 500) : []; save.marks = Array.isArray(save.marks) ? save.marks.slice(0, 300) : []; save.marks.forEach(function (m) { if (m && m.k) markSet[m.k] = true; });

  /* ---------- toast + HUD ---------- */
  var toastT = 0;
  function toast(text) { $("toast").textContent = text; $("toast").classList.add("on"); toastT = 3.4; }

