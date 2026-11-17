"use strict";
/* Cloud Sea / sky.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- sky, day and weather: driven by the shared clock ---------- */
  var DAY = 420, SLOT = 80, timeSkip = 0, T0 = Date.now() / 1000;
  function weatherAt(slot) { return slot <= 0 ? WEATHER[0] : WEATHER[Math.floor(hash3(slot, 3, 5) * WEATHER.length)]; }
  var WEATHER = [
    { name: "Clear", over: 0, rain: 0, far: 2600 }, { name: "Clear", over: 0.05, rain: 0, far: 2600 }, { name: "Fair", over: 0.2, rain: 0, far: 2400 },
    { name: "Overcast", over: 0.75, rain: 0, far: 1900 }, { name: "Rain", over: 0.95, rain: 1, far: 1300 }, { name: "Mist", over: 0.45, rain: 0, far: 800 }, { name: "Fair", over: 0.25, rain: 0, far: 2500 }
  ];
  var C_DAY_T = new T.Color(0x1e6fd9), C_DAY_H = new T.Color(0xa8dcff), C_DUSK_T = new T.Color(0x35489e), C_DUSK_H = new T.Color(0xffa56b), C_NIGHT_T = new T.Color(0x070b24), C_NIGHT_H = new T.Color(0x1a2752), C_GREY = new T.Color(0x8c98a6);
  var cTop = new T.Color(), cHor = new T.Color(), cCloud = new T.Color(), cTmp = new T.Color(), sunDir = new T.Vector3(), wx = { over: 0, rain: 0, far: 2600, name: "Clear" };
  function updateSky(camPos) {
    var secs = Date.now() / 1000 - T0, u = ((secs + DAY * 0.07 + timeSkip) % DAY) / DAY;
    var dayT = u < 0.7 ? 0.25 + u / 0.7 * 0.5 : 0.75 + (u - 0.7) / 0.3 * 0.5;
    var th = (dayT - 0.25) * TAU, e = Math.sin(th);
    sunDir.set(Math.cos(th) * 0.85, e, 0.42).normalize();
    var slot = Math.floor(secs / SLOT), f = (secs / SLOT) - slot, wa = weatherAt(slot), wb = weatherAt(slot + 1), k = sstep(0.8, 1, f);
    wx.over = lerp(wa.over, wb.over, k); wx.rain = lerp(wa.rain, wb.rain, k); wx.far = lerp(wa.far, wb.far, k); wx.name = k < 0.5 ? wa.name : wb.name;
    var kd = sstep(0, 0.35, e), kn = sstep(0, -0.25, e), bright = e >= 0 ? 0.45 + 0.55 * kd : 0.45 * (1 - kn) + 0.3 * kn;
    if (e >= 0) { cTop.copy(C_DUSK_T).lerp(C_DAY_T, kd); cHor.copy(C_DUSK_H).lerp(C_DAY_H, kd); } else { cTop.copy(C_DUSK_T).lerp(C_NIGHT_T, kn); cHor.copy(C_DUSK_H).lerp(C_NIGHT_H, kn); }
    cTmp.copy(C_GREY).multiplyScalar(0.2 + 0.8 * bright); cTop.lerp(cTmp, wx.over * 0.8); cHor.lerp(cTmp, wx.over * 0.85);
    skyMat.uniforms.top.value.copy(cTop); skyMat.uniforms.hor.value.copy(cHor);
    scene.fog.color.copy(cHor); scene.fog.far = wx.far; scene.fog.near = wx.far * 0.09;
    seaMat.uniforms.deep.value.copy(cTop).multiplyScalar(0.72); seaMat.uniforms.shallow.value.copy(cTop).lerp(cHor, 0.45); seaMat.uniforms.fogCol.value.copy(cHor); seaMat.uniforms.sunDir.value.copy(sunDir); seaMat.uniforms.glint.value = (e > 0 ? 1 : 0.25) * (1 - wx.over);
    renderer.setClearColor(cHor);
    sun.color.setHex(0xfff2d6).lerp(cTmp.set(0xff9a55), 1 - kd); sun.intensity = (Math.sqrt(Math.max(0, e)) * (1 - wx.over * 0.65) * 0.95 + (e < 0 ? 0.12 * kn : 0)) * LI;
    skyMat.uniforms.sunDir.value.copy(sunDir); skyMat.uniforms.sunCol.value.copy(sun.color).multiplyScalar((e > -0.1 ? 1 : 0) * (1 - wx.over * 0.9) * 0.55);
    sun.position.copy(me.pos).addScaledVector(e >= 0 ? sunDir : cTmpV.copy(sunDir).negate(), 1500); sun.target.position.copy(me.pos);
    hemi.intensity = (0.12 + 0.28 * bright) * LI; scene.environmentIntensity = 0.35 + 0.9 * bright; updateEnv(cTop, cHor, performance.now()); hemi.color.copy(cHor).lerp(cTmp.set(0xffffff), 0.5); hemi.groundColor.setHex(0x8a6f5a).lerp(cTop, 0.4);
    cCloud.setHex(0xffffff); if (e >= 0) cCloud.lerp(cTmp.set(0xffc9a0), 1 - kd); else cCloud.copy(cTmp.set(0xffc9a0)).lerp(cTmp.set(0x39456f), kn);
    cCloud.multiplyScalar(1 - wx.over * 0.38); var cu = cloudMat.uniforms; cu.lit.value.copy(cCloud); cu.shade.value.copy(cCloud).multiplyScalar(0.7).lerp(cTmp.copy(cTop).lerp(cHor, 0.5), 0.42); cu.sunDir.value.copy(e >= 0 ? sunDir : cTmpV.copy(sunDir).negate()); cu.fogCol.value.copy(cHor); cu.fogFar.value = wx.far;
    var lu = lakeMat.uniforms; lu.skyTop.value.copy(cTop); lu.skyHor.value.copy(cHor); lu.fogCol.value.copy(cHor); lu.fogFar.value = wx.far; lu.light.value = 0.25 + 0.75 * bright; lu.sunDir.value.copy(e >= 0 ? sunDir : cTmpV.copy(sunDir).negate()); lu.glint.value = (e > 0 ? 1 : 0.3) * (1 - wx.over);
    mistK = Math.min(1, (1 - kd) * 0.9 + wx.over * 0.6 + (e < 0 ? 0.4 : 0));
    starMat.opacity = kn * (1 - wx.over);
    sky.position.copy(camPos); stars.position.copy(camPos); sea.position.x = camPos.x; sea.position.z = camPos.z;
    sunSprite.position.copy(camPos).addScaledVector(sunDir, 6200); sunSprite.material.opacity = (e > -0.12 ? 1 : 0) * (1 - wx.over * 0.9);
    moonSprite.position.copy(camPos).addScaledVector(sunDir, -6200); moonSprite.material.opacity = kn * (1 - wx.over * 0.8);
    var hrs = (dayT * 24) % 24, hh = Math.floor(hrs), mm = Math.floor((hrs - hh) * 60);
    $("h-clock").textContent = (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm; $("h-weather").textContent = wx.name;
  }
  var cTmpV = new T.Vector3();

