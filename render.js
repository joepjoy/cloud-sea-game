"use strict";
/* Cloud Sea / render.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- post-processing: sun rays, glow, grading, vignette (one pass) ---------- */
  /* quality tiers: 0 light, 1 medium, 2 high. post = sun rays/glow/grade pass, refl = lake mirror, near = forest detail distance */
  var TIERS = [
    { name: "light",  pr: 1,    shadow: 0,    post: false, refl: false, near: 320 },
    { name: "medium", pr: 1.25, shadow: 1024, post: true,  refl: false, near: 520 },
    { name: "high",   pr: 1.75, shadow: 2048, post: true,  refl: true,  near: 750 }
  ];
  var autoGfx = true, tier = 2, Q = TIERS[2], gfxHigh = true, rt = null, postScene = new T.Scene(), postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var postMat = new T.ShaderMaterial({
    uniforms: { tD: { value: null }, sunPos: { value: new T.Vector2(0.5, 0.8) }, sunVis: { value: 0 }, px: { value: new T.Vector2(1 / 1280, 1 / 720) }, tint: { value: new T.Color(0xfff0d0) } },
    vertexShader: "varying vec2 vU; void main(){ vU = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: "uniform sampler2D tD; uniform vec2 sunPos; uniform float sunVis; uniform vec2 px; uniform vec3 tint; varying vec2 vU; void main(){ vec3 col = texture2D(tD, vU).rgb; if (sunVis > 0.01) { vec2 d = (vU - sunPos) / 30.0 * 0.9; vec2 p = vU; float rays = 0.0; for (int i = 0; i < 30; i++) { p -= d; vec3 s = texture2D(tD, p).rgb; rays += max(dot(s, vec3(0.333)) - 0.8, 0.0) * (1.0 - float(i) / 30.0); } col += tint * rays * 0.085 * sunVis; } vec3 b = vec3(0.0); for (int j = 0; j < 8; j++) { float a = float(j) * 0.7854; vec2 o = vec2(cos(a), sin(a)); b += max(texture2D(tD, vU + o * px * 5.0).rgb - 0.8, 0.0) + max(texture2D(tD, vU + o * px * 12.0).rgb - 0.8, 0.0); } col += b / 16.0 * 1.1; vec3 x = col * 1.12; vec3 aces = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); col = mix(col, aces, 0.6); float g = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(g), col, 1.14); col = mix(col * vec3(0.94, 0.98, 1.06), col * vec3(1.06, 1.02, 0.94), smoothstep(0.25, 0.8, g)); col = pow(col, vec3(0.97)); col *= 1.0 - 0.3 * pow(length(vU - 0.5) * 1.25, 2.4); gl_FragColor = vec4(col, 1.0); }",
    depthTest: false, depthWrite: false
  });
  csFrag(postMat);
  postScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), postMat));
  function makeTarget() {
    if (rt) { rt.dispose(); rt = null; }
    if (!gfxHigh) return;
    try {
      var size = renderer.getDrawingBufferSize(new T.Vector2());
      rt = new T.WebGLRenderTarget(size.x, size.y, { samples: 4, type: T.HalfFloatType });
      postMat.uniforms.tD.value = rt.texture; postMat.uniforms.px.value.set(1 / size.x, 1 / size.y);
    } catch (e) { rt = null; }
  }
  function setGfx(t) {
    tier = clamp(t | 0, 0, 2); Q = TIERS[tier]; gfxHigh = Q.post;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr));
    renderer.shadowMap.enabled = Q.shadow > 0; sun.castShadow = Q.shadow > 0;
    if (Q.shadow) { sun.shadow.mapSize.set(Q.shadow, Q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    islandMat.needsUpdate = true; terrainMat.needsUpdate = true;
    resize(); $("b-gfx").textContent = "Graphics: " + Q.name;
    try { save.gfx = tier; persist(); } catch (e) { /* ignore */ }
  }
  var mistK = 0, rv1 = new T.Vector3(), BIAS = new T.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  function pickLake() {
    var best = null, bd = 1300 * 1300;
    islands.forEach(function (m) {
      if (!m.userData.lake) return; var c = m.userData.info, d = (c.x - camera.position.x) * (c.x - camera.position.x) + (c.z - camera.position.z) * (c.z - camera.position.z);
      if (d < bd && camera.position.y > m.userData.lakeY + 1.5) { bd = d; best = m; }
    });
    if (activeLake && (activeLake !== best || !Q.refl) && activeLake.userData.lake) activeLake.userData.lake.material = lakeMat;
    activeLake = Q.refl ? best : null;
    if (activeLake) activeLake.userData.lake.material = lakeMatR;
  }
  function renderReflection() {
    var L = activeLake.userData.lakeY, p = camera.position;
    reflCam.copy(camera); camera.getWorldDirection(rv1);
    reflCam.position.set(p.x, 2 * L - p.y, p.z); reflCam.up.set(0, 1, 0);
    reflCam.lookAt(p.x + rv1.x * 100, 2 * L - (p.y + rv1.y * 100), p.z + rv1.z * 100);
    reflCam.updateMatrixWorld(true); reflCam.matrixWorldInverse.copy(reflCam.matrixWorld).invert();
    reflM.copy(BIAS).multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
    reflPlane.constant = -(L - 0.7);
    var hidden = [];
    islands.forEach(function (m) { if (m.userData.lake && m.userData.lake.visible) { m.userData.lake.visible = false; hidden.push(m.userData.lake); } });
    var seaV = sea.visible, rainV = rain.visible; sea.visible = false; rain.visible = false;
    renderer.clippingPlanes = [reflPlane]; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(reflRT); renderer.render(scene, reflCam); renderer.setRenderTarget(null);
    renderer.clippingPlanes = []; renderer.shadowMap.autoUpdate = true;
    sea.visible = seaV; rain.visible = rainV; for (var i = 0; i < hidden.length; i++) hidden[i].visible = true;
  }
  function updateMist(t) {
    islands.forEach(function (m) {
      var ms = m.userData.mist; if (!ms || !ms.length) return;
      var c = m.userData.info; if (Math.abs(c.x - me.pos.x) > 1700 || Math.abs(c.z - me.pos.z) > 1700) return;
      for (var i = 0; i < ms.length; i++) {
        var q = ms[i]; if (q.calm) { var ca = t * 0.05 + q.ph * 6.283; q.s.position.set(q.x + Math.cos(ca) * q.calm * 0.6, q.y + Math.sin(t * 0.3 + q.ph * 9) * 1.5, q.z + Math.sin(ca * 1.3) * q.calm * 0.6); q.s.scale.set(q.calm * 1.5, q.calm * 0.5, 1); q.s.material.opacity = 0.34 * mistK; continue; }
        var k = (t * (q.big ? 0.22 : 0.4) + q.ph) % 1, sc = q.big ? 16 + k * 46 : 6 + k * 12;
        q.s.position.set(q.x + q.ox * k * (q.big ? 14 : 4) + Math.sin(q.ph * 40) * 4, q.y + k * (q.big ? 26 : 6), q.z + q.oz * k * (q.big ? 14 : 4) + Math.cos(q.ph * 40) * 4);
        q.s.scale.set(sc, sc, 1); q.s.material.opacity = Math.sin(k * Math.PI) * (q.big ? 0.5 : 0.4);
      }
    });
  }
  function draw() {
    pickLake(); if (activeLake) renderReflection();
    if (gfxHigh && rt) {
      _v.copy(sunSprite.position).project(camera);
      var vis = (_v.z < 1 && sunDir.y > -0.05) ? (1 - wx.over) * sstep(1.7, 1.0, Math.max(Math.abs(_v.x), Math.abs(_v.y))) : 0;
      postMat.uniforms.sunPos.value.set(_v.x * 0.5 + 0.5, _v.y * 0.5 + 0.5); postMat.uniforms.sunVis.value = vis;
      renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    } else renderer.render(scene, camera);
  }

