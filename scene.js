"use strict";
/* Cloud Sea / scene.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- scene ---------- */
  var canvas = $("view"), stage = $("stage");
  var renderer;
  renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
  T.ColorManagement.enabled = true; renderer.outputColorSpace = T.SRGBColorSpace;   // colours are blended in linear light and encoded once, at the end
  var LI = Math.PI;   // light units changed in newer Three.js: scale to keep the same brightness
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  var scene = new T.Scene();
  scene.fog = new T.Fog(0xa8dcff, 500, 2600);
  var camera = new T.PerspectiveCamera(62, 1, 1, 9000);
  var hemi = new T.HemisphereLight(0xbfe3ff, 0x8a6f5a, 0.9 * LI); scene.add(hemi);
  var sun = new T.DirectionalLight(0xfff2d6, 1.0 * LI); scene.add(sun); scene.add(sun.target);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap;
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0012; sun.shadow.normalBias = 1.6;
  var sc = sun.shadow.camera; sc.left = -620; sc.right = 620; sc.top = 620; sc.bottom = -620; sc.near = 10; sc.far = 3400; sc.updateProjectionMatrix();

  var skyMat = new T.ShaderMaterial({
    uniforms: { top: { value: new T.Color(0x1e6fd9) }, hor: { value: new T.Color(0xa8dcff) }, sunDir: { value: new T.Vector3(0, 1, 0) }, sunCol: { value: new T.Color(0x000000) } },
    vertexShader: "varying float h; varying vec3 vD; void main(){ vD = normalize(position); h = vD.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; varying float h; varying vec3 vD; void main(){ float t = pow(clamp(h*1.15+0.08,0.0,1.0),0.62); vec3 c = mix(hor, top, t); float sd = max(dot(normalize(vD), sunDir), 0.0); c += sunCol * (pow(sd, 6.0) * 0.35 + pow(sd, 48.0) * 0.6) * (1.0 - 0.6 * t); c += hor * 0.12 * exp(-abs(h) * 9.0); gl_FragColor = vec4(c,1.0); }",
    side: T.BackSide, depthWrite: false, fog: false
  });
  csFrag(skyMat);
  var sky = new T.Mesh(new T.SphereGeometry(7000, 24, 14), skyMat); sky.frustumCulled = false; scene.add(sky);
  // image-based lighting: bake the live sky gradient into an environment map every few seconds
  var envScene = new T.Scene(), envMat = skyMat.clone(), pmrem = new T.PMREMGenerator(renderer), envRT = null, envLast = -1e9;
  envScene.add(new T.Mesh(new T.SphereGeometry(50, 16, 8), envMat));
  function updateEnv(top, hor, now) {
    if (now - envLast < (typeof tier !== "undefined" && tier === 0 ? 60000 : 20000)) return; envLast = now;
    envMat.uniforms.top.value.copy(top); envMat.uniforms.hor.value.copy(hor); envMat.uniforms.sunDir.value.copy(skyMat.uniforms.sunDir.value); envMat.uniforms.sunCol.value.copy(skyMat.uniforms.sunCol.value);
    var old = envRT; envRT = pmrem.fromScene(envScene, 0, 0.1, 200); scene.environment = envRT.texture; if (old) old.dispose();
  }
  function glowTex(inner, outer) {
    var c = document.createElement("canvas"); c.width = c.height = 128; var g = c.getContext("2d");
    var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(0.22, inner); gr.addColorStop(0.3, outer); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); var tx = new T.CanvasTexture(c); tx.colorSpace = T.SRGBColorSpace; return tx;
  }
  var sunSprite = new T.Sprite(new T.SpriteMaterial({ map: glowTex("rgba(255,252,235,1)", "rgba(255,225,150,0.45)"), fog: false, depthWrite: false, transparent: true })); sunSprite.scale.set(1500, 1500, 1); scene.add(sunSprite);
  var moonSprite = new T.Sprite(new T.SpriteMaterial({ map: glowTex("rgba(235,242,255,1)", "rgba(170,195,255,0.25)"), fog: false, depthWrite: false, transparent: true })); moonSprite.scale.set(700, 700, 1); scene.add(moonSprite);
  var starGeo = new T.BufferGeometry(), sp = [], sr = mulberry(77);
  for (var si = 0; si < 900; si++) { var u = sr() * 2 - 1, th = sr() * TAU, q = Math.sqrt(1 - u * u); sp.push(q * Math.cos(th) * 6000, Math.abs(u) * 6000 + 100, q * Math.sin(th) * 6000); }
  starGeo.setAttribute("position", new T.Float32BufferAttribute(sp, 3));
  var starMat = new T.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  var stars = new T.Points(starGeo, starMat); stars.frustumCulled = false; scene.add(stars);

  // the floor of the world: a haze far below the cloud tops
  var seaMat = new T.ShaderMaterial({
    uniforms: { uTime: uTime, deep: { value: new T.Color(0x1552a8) }, shallow: { value: new T.Color(0x4f9be6) }, fogCol: { value: new T.Color(0xa8dcff) }, sunDir: { value: new T.Vector3(0, 1, 0) }, glint: { value: 1 } },
    vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: "uniform float uTime; uniform vec3 deep; uniform vec3 shallow; uniform vec3 fogCol; uniform vec3 sunDir; uniform float glint; varying vec3 vW; void main(){ vec2 p = vW.xz*0.0035; float w = sin(p.x*3.1+uTime*0.5)+sin(p.y*4.3-uTime*0.42)+0.5*sin((p.x+p.y)*7.7+uTime*0.8)+0.25*sin((p.x-p.y)*15.0-uTime*1.1); vec3 c = mix(deep, shallow, clamp(w*0.14+0.5,0.0,1.0)); vec3 v = normalize(cameraPosition - vW); vec3 n = normalize(vec3(cos(p.x*24.0+uTime)*0.25, 1.0, cos(p.y*21.0-uTime*0.8)*0.25)); vec3 n2 = normalize(n + vec3(sin(vW.x*0.21+uTime*1.3)*0.06, 0.0, cos(vW.z*0.19-uTime*1.1)*0.06)); float fr = pow(1.0 - max(dot(n2, v), 0.0), 4.0); c = mix(c, fogCol, fr * 0.55); float rdv = max(dot(reflect(-sunDir, n2), v), 0.0); float sp = pow(rdv, 60.0) + 0.35 * pow(rdv, 9.0); c += vec3(1.0,0.95,0.8)*sp*0.8*glint; float fl = smoothstep(0.93, 1.0, sin(vW.x*0.035+w*1.7)*sin(vW.z*0.031-w*1.3+uTime*0.12)); c = mix(c, vec3(1.0), fl * 0.22 * glint); float f = smoothstep(1800.0, 7500.0, distance(cameraPosition, vW)); gl_FragColor = vec4(mix(c, fogCol, f), 1.0); }"
  });
  csFrag(seaMat);
  var sea = new T.Mesh(new T.PlaneGeometry(26000, 26000), seaMat); sea.rotation.x = -Math.PI / 2; sea.position.y = -1100; scene.add(sea);

  /* ---------- clouds: instanced puffs that wrap around the player ---------- */
  var CLOUD_RANGE = 2700, puffGeo = new T.IcosahedronGeometry(1, 2);
  var cloudMat = new T.ShaderMaterial({
    uniforms: { sunDir: { value: new T.Vector3(0, 1, 0) }, lit: { value: new T.Color(0xffffff) }, shade: { value: new T.Color(0x8fa3dc) }, fogCol: { value: new T.Color(0xa8dcff) }, fogFar: { value: 2600 } },
    vertexShader: "varying vec3 vN; varying vec3 vW; void main(){ vec3 p = position; vec4 c = instanceMatrix * vec4(0.0,0.0,0.0,1.0); float n = sin(p.x*4.7+c.x*0.011)*sin(p.y*5.3+c.z*0.013)*sin(p.z*4.9+c.y*0.017) + 0.5*sin(p.x*9.1+c.z*0.02)*sin(p.z*8.3+c.x*0.02); p += normal * n * 0.17; vec4 w = modelMatrix * instanceMatrix * vec4(p,1.0); vW = w.xyz; vN = normalize(mat3(instanceMatrix) * (normal + vec3(n*0.25))); gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: "uniform vec3 sunDir; uniform vec3 lit; uniform vec3 shade; uniform vec3 fogCol; uniform float fogFar; varying vec3 vN; varying vec3 vW; void main(){ vec3 n = normalize(vN); float l = dot(n, sunDir)*0.5+0.5; float band = smoothstep(0.34,0.5,l)*0.6 + smoothstep(0.62,0.74,l)*0.4; float up = n.y*0.5+0.5; vec3 c = mix(shade, lit, clamp(band*0.8 + up*0.25, 0.0, 1.0)); vec3 v = normalize(cameraPosition - vW); float rim = pow(1.0 - max(dot(v, n), 0.0), 3.0); c += lit * rim * 0.16 * max(dot(-v, sunDir)*0.5+0.5, 0.0); float f = smoothstep(fogFar*0.45, fogFar*1.6, distance(cameraPosition, vW)); gl_FragColor = vec4(mix(c, fogCol, f*0.9), 1.0); }"
  });
  csFrag(cloudMat);
  var clusters = [], puffTotal = 0, cr = mulberry(4242);
  for (var ci = 0; ci < 104; ci++) {
    var low = ci < 62, np = low ? 9 + Math.floor(cr() * 7) : 6 + Math.floor(cr() * 8), cl = { x: (cr() * 2 - 1) * CLOUD_RANGE, z: (cr() * 2 - 1) * CLOUD_RANGE, y: low ? -330 + cr() * 110 : -60 + cr() * 620, puffs: [], start: puffTotal, drift: 3 + cr() * 5 };
    var spread = low ? 210 : 120;
    for (var pi = 0; pi < np; pi++) { var ps = (low ? 85 : 48) * (0.6 + cr() * 0.9); cl.puffs.push({ x: (cr() + cr() - 1) * spread, y: (cr() - 0.5) * ps * 0.5, z: (cr() + cr() - 1) * spread * 0.7, sx: ps * (1 + cr() * 0.4), sy: ps * (low ? 0.6 : 0.72), sz: ps }); }
    puffTotal += np; clusters.push(cl);
  }
  var clouds = new T.InstancedMesh(puffGeo, cloudMat, puffTotal); clouds.frustumCulled = false; scene.add(clouds);
  function updateClouds(dt, cam) {
    for (var i = 0; i < clusters.length; i++) {
      var cl = clusters[i]; cl.x += cl.drift * dt;
      if (cl.x - cam.x > CLOUD_RANGE) cl.x -= 2 * CLOUD_RANGE; else if (cl.x - cam.x < -CLOUD_RANGE) cl.x += 2 * CLOUD_RANGE;
      if (cl.z - cam.z > CLOUD_RANGE) cl.z -= 2 * CLOUD_RANGE; else if (cl.z - cam.z < -CLOUD_RANGE) cl.z += 2 * CLOUD_RANGE;
      for (var j = 0; j < cl.puffs.length; j++) { var p = cl.puffs[j]; _m.makeScale(p.sx, p.sy, p.sz); _m.setPosition(cl.x + p.x, cl.y + p.y, cl.z + p.z); clouds.setMatrixAt(cl.start + j, _m); }
    }
    clouds.instanceMatrix.needsUpdate = true;
  }

  /* ---------- rain ---------- */
  var RAIN_N = 1400, rainPos = new Float32Array(RAIN_N * 6), rr = mulberry(5);
  for (var ri = 0; ri < RAIN_N; ri++) { var rx = (rr() - 0.5) * 500, ry = (rr() - 0.5) * 400, rz = (rr() - 0.5) * 500; rainPos.set([rx, ry, rz, rx + 1.5, ry - 9, rz], ri * 6); }
  var rainGeo = new T.BufferGeometry(); rainGeo.setAttribute("position", new T.BufferAttribute(rainPos, 3));
  var rainMat = new T.LineBasicMaterial({ color: 0xd8e8ff, transparent: true, opacity: 0, fog: false });
  var rain = new T.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; rain.visible = false; scene.add(rain);

