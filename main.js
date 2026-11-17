"use strict";
/* Cloud Sea / main.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- main loop ---------- */
  var last = null, hudT = 0, demoA = 0, slowT = 0, slowN = 0, flashT = 6, flash = 0;
  loadCourse();
  var frameErrs = 0;
  function frame(now) {
    requestAnimationFrame(frame);   // keep the loop alive even if one frame throws
    try { step(now); frameErrs = 0; }
    catch (err) {
      frameErrs++; if (window.console) console.error(err);
      if (frameErrs === 3 && started) { try { resetPlane(); } catch (e2) { /* ignore */ } toast("Something went wrong, so the plane was reset"); }
      if (frameErrs > 60) { frameErrs = 0; me.pos.set(0, 230, 640); mode = "fly"; }
    }
  }
  function step(now) {
    if (last === null) last = now;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    var inp = { sx: 0, sy: 0, up: 0, boost: false };
    if (!started) { // the title screen: the plane circles home on its own
      demoA += dt * 0.16; me.pos.set(Math.sin(demoA) * 470, 175 + Math.sin(demoA * 1.7) * 18, Math.cos(demoA) * 470); me.yaw = demoA + Math.PI / 2 + Math.PI; me.roll = 0.32; me.pitch = Math.cos(demoA * 1.7) * 0.05; me.speed = 70;
      fwd.set(-Math.sin(me.yaw), 0, -Math.cos(me.yaw));
    } else if (!paused) {
      if (onFoot) { inp = { sx: 0, sy: 0, up: 0, boost: false }; updateFoot(dt); } else if (raceHold) { inp = readInput(); me.speed = 80; } else { inp = readInput(); fly(dt, inp); } footPrompt(); updateRings(dt); updateMission(dt, now); checkLandmarks();
    }
    placePlane(plane, me.pos, me.yaw, me.pitch, me.roll, dt * (25 + me.speed * 0.4)); animateDragon(plane, now / 1000, me.speed); remotes.forEach(function (rr) { animateDragon(rr.g, now / 1000, 90); });
    if (onFoot) footCamera(dt); else chaseCamera(dt, inp.boost);
    refreshIslands();
    islands.forEach(function (m) { if (m.userData.blades) m.userData.blades.rotation.z += dt * 0.9; });
    updateClouds(dt, camera.position); updateSky(camera.position);
    rain.visible = wx.rain > 0.02;
    if (rain.visible) { rainMat.opacity = wx.rain * 0.55; rain.position.set(camera.position.x, camera.position.y - ((now * 0.35) % 400) + 200, camera.position.z); }
    uTime.value = now * 0.001; updateBirds(dt, now * 0.001); updateTrails(); updateMist(now * 0.001); updateForests();
    if (wx.rain > 0.6) { flashT -= dt; if (flashT <= 0) { flash = 0.2; flashT = 5 + Math.random() * 9; } }
    if (flash > 0) { hemi.intensity += 2.2 * LI * (flash / 0.2); flash -= dt; }
    updateFriends(dt); updateAudio();
    draw(); fpsTick((now - (step.prev || now)) / 1000 || 0.016);
    if (autoGfx && started && !paused && tier > 0) { slowT += (now - (step.prev || now)) / 1000; slowN++; if (slowN >= 150) { if (slowT / slowN > 0.036) { setGfx(tier - 1); toast("Graphics set to " + Q.name + " for a smoother flight"); } slowT = 0; slowN = 0; } }
    step.prev = now;
    if (started && !paused) {
      marker($("m-ring"), courseDef(curCourse()).pts[Math.min(9, ringIdx)], "Ring");
      marker($("m-quest"), questTarget(), questLabel());
      marker($("m-mission"), missionTarget(), mission && mission.type === "mail" ? "Mail" : "Balloon");
    } else { $("m-ring").style.display = "none"; $("m-mission").style.display = "none"; $("m-quest").style.display = "none"; }
    hudT -= dt;
    if (hudT <= 0) { hudT = 0.15; $("h-speed").textContent = Math.round(me.speed * 2.6) + " km/h"; $("h-alt").textContent = Math.round(me.pos.y + 470) + " m"; $("h-stars").textContent = save.stars; $("h-marks").textContent = save.marks.length; $("h-boost").style.width = Math.round(boostE * 100) + "%"; $("h-boost").parentNode.classList.toggle("empty", boostLock); drawMap(); $("g-state").textContent = mode === "water" ? "On the water. Shift to speed up, pull up past 140 km/h to take off" : mode === "ground" ? "On the ground. Shift to speed up, pull up past 140 km/h to take off" : me.throttle < 0.25 ? "Slow enough to land: touch down gently on a lake or airstrip" : "To land: hold Ctrl to slow down, then touch down on a lake or airstrip"; }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $("toast").classList.remove("on"); }
  }
  requestAnimationFrame(frame);
