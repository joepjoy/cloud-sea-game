"use strict";
/* Cloud Sea / input.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- input ---------- */
  var keys = {}, mouse = { x: 0, y: 0, on: false }, stickV = { x: 0, y: 0, id: null }, tBoost = false, tSlow = false, tUp = false, started = false, paused = false;
  var STEER = { ArrowLeft: 1, ArrowRight: 1, ArrowUp: 1, ArrowDown: 1, KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, Space: 1, ShiftLeft: 1, ShiftRight: 1, ControlLeft: 1, ControlRight: 1 };
  document.addEventListener("keydown", function (ev) {
    var tag = (ev.target && ev.target.tagName) || "";
    if (tag === "INPUT") { if (ev.code === "Enter" && !started) begin(); return; }
    if (STEER[ev.code]) { keys[ev.code] = true; if (started) ev.preventDefault(); if (ev.code.indexOf("Arrow") === 0 || ev.code.indexOf("Key") === 0) mouse.on = false; return; }
    if (ev.code === "Enter" && !started) { ev.preventDefault(); begin(); }
    else if (ev.code === "KeyP" || ev.code === "Escape") togglePause();
    else if (ev.code === "KeyR" && !ev.ctrlKey && !ev.metaKey && !paused) resetPlane();
    else if ((ev.code === "KeyE" || ev.code === "KeyF") && !ev.ctrlKey && !ev.metaKey && started && !paused) toggleFoot();
    else if (/^Digit[1-5]$/.test(ev.code) && started && !paused && room) sendQuick(+ev.code.charAt(5) - 1);
    else if (ev.code === "KeyG" && started && !paused && room) sendPing();
    else if (ev.code === "KeyM") setSound(!save.sound);
    else if (ev.code === "KeyN") toggleMap();
    else if (ev.code === "KeyT") { timeSkip += DAY / 8; toast("Time skips ahead (only for you)"); }
  });
  document.addEventListener("keyup", function (ev) { keys[ev.code] = false; });
  window.addEventListener("blur", function () { keys = {}; });
  canvas.addEventListener("pointermove", function (ev) {
    if (ev.pointerType !== "mouse") return;
    var r = canvas.getBoundingClientRect(); mouse.x = clamp(((ev.clientX - r.left) / r.width - 0.5) * 2.4, -1, 1); mouse.y = clamp(((ev.clientY - r.top) / r.height - 0.5) * 2.4, -1, 1); mouse.on = true;
  });
  canvas.addEventListener("pointerleave", function () { mouse.on = false; });
  var stick = $("stick"), knob = stick.querySelector("i");
  function stickMove(ev) { var r = stick.getBoundingClientRect(), x = (ev.clientX - r.left - 60) / 50, y = (ev.clientY - r.top - 60) / 50, l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } stickV.x = x; stickV.y = y; knob.style.transform = "translate(" + x * 40 + "px," + y * 40 + "px)"; }
  stick.addEventListener("pointerdown", function (ev) { stickV.id = ev.pointerId; try { stick.setPointerCapture(ev.pointerId); } catch (e) { /* optional */ } stickMove(ev); });
  stick.addEventListener("pointermove", function (ev) { if (stickV.id === ev.pointerId) stickMove(ev); });
  function stickEnd(ev) { if (stickV.id === ev.pointerId) { stickV.id = null; stickV.x = stickV.y = 0; knob.style.transform = ""; } }
  stick.addEventListener("pointerup", stickEnd); stick.addEventListener("pointercancel", stickEnd);
  function hold(btn, set) { btn.addEventListener("pointerdown", function (ev) { ev.preventDefault(); set(true); }); ["pointerup", "pointercancel", "pointerleave"].forEach(function (n) { btn.addEventListener(n, function () { set(false); }); }); }
  hold($("t-up"), function (v) { tUp = v; if (v && typeof onFoot !== "undefined" && onFoot) footOnce("Wave"); }); hold($("t-boost"), function (v) { tBoost = v; }); hold($("t-slow"), function (v) { tSlow = v; });
  function readInput() {
    var sx = 0, sy = 0, up = 0, boost = !!keys.Space || tBoost;
    if (keys.ArrowLeft || keys.KeyA) sx -= 1; if (keys.ArrowRight || keys.KeyD) sx += 1;
    if (keys.ArrowUp || keys.KeyW) sy += 1; if (keys.ArrowDown || keys.KeyS) sy -= 1;
    if (keys.ShiftLeft || keys.ShiftRight || tUp) up += 1; if (keys.ControlLeft || keys.ControlRight || tSlow) up -= 1;
    if (sx === 0 && sy === 0) {
      if (stickV.id !== null) { sx = stickV.x; sy = -stickV.y; }
      else if (mouse.on) { sx = Math.abs(mouse.x) < 0.07 ? 0 : mouse.x; sy = Math.abs(mouse.y) < 0.07 ? 0 : -mouse.y; }
    }
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (var i = 0; i < pads.length; i++) {
      var gp = pads[i]; if (!gp || !gp.connected) continue;
      var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.abs(ax) > 0.12 || Math.abs(ay) > 0.12) { sx = ax; sy = -ay; }
      if (gp.buttons[7] && gp.buttons[7].value > 0.1) up += gp.buttons[7].value; if (gp.buttons[6] && gp.buttons[6].value > 0.1) up -= gp.buttons[6].value;
      if (gp.buttons[0] && gp.buttons[0].pressed) boost = true;
      var yb = !!(gp.buttons[3] && gp.buttons[3].pressed); if (yb && !readInput.yb && !paused) resetPlane(); readInput.yb = yb;
      break;
    }
    return { sx: clamp(sx, -1, 1), sy: clamp(sy, -1, 1), up: clamp(up, -1, 1), boost: boost };
  }

