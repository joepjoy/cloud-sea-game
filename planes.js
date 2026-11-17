"use strict";
/* Cloud Sea / planes.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- planes ---------- */
  var PLANE_COLORS = [0xe8493a, 0xffb52e, 0x2fb7a3, 0x4b7bec, 0xb166e8];
  var planeProto = null, planeMats = {};
  function planeMat(name, color) {
    var key = name === "Body" ? "Body" + color : name; if (planeMats[key]) return planeMats[key];
    var cols = { Body: color, Trim: 0xfff4dc, Dark: 0x2c3550, Glass: 0x9fdcff, Metal: 0xb8bec9 };
    return (planeMats[key] = new T.MeshStandardMaterial({ color: cols[name] !== undefined ? cols[name] : 0xfff4dc, roughness: name === "Glass" ? 0.08 : name === "Metal" ? 0.35 : 0.42, metalness: name === "Metal" ? 0.85 : 0.05 }));
  }
  function makeBlenderPlane(color) {
    var g = new T.Group(), model = planeProto.clone(true), prop = null; g.add(model);
    model.traverse(function (o) {
      if (o.name === "Prop") prop = o;
      if (o.isMesh) { o.castShadow = true; o.material = planeMat((o.material && o.material.name) || "Trim", color); }
    });
    if (!prop) { prop = new T.Group(); prop.position.set(0, 0, -4.62); g.add(prop); }
    var disc = new T.Mesh(new T.CircleGeometry(2.75, 24), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, side: T.DoubleSide, depthWrite: false })); prop.add(disc);
    g.userData.prop = prop; g.rotation.order = "YXZ";
    return g;
  }
  function makePlane(color, veh) {
    if (veh === 1) return makeDragon(color);
    if (planeProto) return makeBlenderPlane(color);
    var g = new T.Group(), body = new T.MeshLambertMaterial({ color: color }), cream = new T.MeshLambertMaterial({ color: 0xfff4dc }), dark = new T.MeshLambertMaterial({ color: 0x2c3550 }), glass = new T.MeshLambertMaterial({ color: 0x9fdcff });
    function part(geo, mat, x, y, z, rx, ry, rz) { var m = new T.Mesh(geo, mat); m.castShadow = true; m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; }
    part(new T.CylinderGeometry(1.25, 0.55, 8, 10), body, 0, 0, 0.6, Math.PI / 2);
    part(new T.ConeGeometry(1.25, 1.6, 10), cream, 0, 0, -4.1, -Math.PI / 2);
    part(new T.SphereGeometry(1.05, 10, 8), glass, 0, 0.75, -1.2).scale.set(0.85, 0.8, 1.5);
    part(new T.BoxGeometry(15, 0.28, 2.5), cream, 0, 1.55, -1.1);
    part(new T.BoxGeometry(2.4, 0.3, 2.5), body, -6.3, 1.56, -1.1); part(new T.BoxGeometry(2.4, 0.3, 2.5), body, 6.3, 1.56, -1.1);
    part(new T.BoxGeometry(0.18, 1.7, 0.18), dark, -2.6, 0.75, -1.1, 0, 0, 0.5); part(new T.BoxGeometry(0.18, 1.7, 0.18), dark, 2.6, 0.75, -1.1, 0, 0, -0.5);
    part(new T.BoxGeometry(5.2, 0.2, 1.5), cream, 0, 0.25, 4.1); part(new T.BoxGeometry(0.2, 2.1, 1.7), body, 0, 1.2, 4.2);
    part(new T.CylinderGeometry(0.55, 0.55, 0.4, 10), dark, -1.5, -1.45, -1.4, 0, 0, Math.PI / 2); part(new T.CylinderGeometry(0.55, 0.55, 0.4, 10), dark, 1.5, -1.45, -1.4, 0, 0, Math.PI / 2);
    part(new T.BoxGeometry(3.3, 0.16, 0.16), dark, 0, -1.2, -1.4); part(new T.BoxGeometry(0.16, 0.9, 0.16), dark, -1, -0.8, -1.4); part(new T.BoxGeometry(0.16, 0.9, 0.16), dark, 1, -0.8, -1.4);
    var prop = new T.Group(); prop.position.set(0, 0, -4.95);
    var blade = new T.Mesh(new T.BoxGeometry(0.34, 5.4, 0.1), dark); prop.add(blade); var blade2 = blade.clone(); blade2.rotation.z = Math.PI / 2; prop.add(blade2);
    var disc = new T.Mesh(new T.CircleGeometry(2.7, 20), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, side: T.DoubleSide, depthWrite: false })); prop.add(disc);
    g.add(prop); g.userData.prop = prop; g.rotation.order = "YXZ";
    return g;
  }

  /* ---------- the dragon: a second vehicle, built from simple shapes, wings flap with speed ---------- */
  var vehicle = 0;
  function makeDragon(color) {
    var g = new T.Group(), hue = new T.Color(color);
    var skin = new T.MeshStandardMaterial({ color: color, roughness: 0.6, metalness: 0.05 });
    var belly = new T.MeshStandardMaterial({ color: 0xffe3a8, roughness: 0.7 });
    var horn = new T.MeshStandardMaterial({ color: 0xf6efe0, roughness: 0.5 });
    var mem = new T.MeshStandardMaterial({ color: hue.clone().offsetHSL(0.02, 0.0, 0.14), roughness: 0.8, side: T.DoubleSide, emissive: hue.clone().multiplyScalar(0.12) });
    var eye = new T.MeshBasicMaterial({ color: 0xffd23f });
    function ball(r, x, y, z, sx, sy, sz, mat, parent) { var m = new T.Mesh(new T.SphereGeometry(r, 12, 9), mat || skin); m.position.set(x, y, z); m.scale.set(sx || 1, sy || 1, sz || 1); m.castShadow = true; (parent || g).add(m); return m; }
    function cone(r, h, x, y, z, rx, ry, rz, mat, parent) { var m = new T.Mesh(new T.ConeGeometry(r, h, 7), mat || horn); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); (parent || g).add(m); return m; }
    ball(1.5, 0, 0, 0.2, 1, 0.95, 2.5);                 // torso
    ball(1.2, 0, -0.55, 0.0, 0.95, 0.7, 2.3, belly);    // belly
    var neck = [], head = new T.Group(); g.add(head);
    [[0, 0.8, -3.4, 1.0], [0, 1.5, -4.6, 0.85], [0, 2.1, -5.7, 0.72]].forEach(function (n) { neck.push(ball(n[3], n[0], n[1], n[2])); });
    head.position.set(0, 2.45, -6.9);
    ball(0.95, 0, 0, 0, 0.95, 0.85, 1.35, skin, head); ball(0.55, 0, -0.18, -1.15, 0.9, 0.65, 1.1, skin, head);
    cone(0.18, 1.5, -0.55, 0.65, 0.5, -0.9, 0, -0.35, horn, head); cone(0.18, 1.5, 0.55, 0.65, 0.5, -0.9, 0, 0.35, horn, head);
    var e1 = ball(0.16, -0.5, 0.25, -0.55, 1, 1, 1, eye, head), e2 = ball(0.16, 0.5, 0.25, -0.55, 1, 1, 1, eye, head); e1.castShadow = e2.castShadow = false;
    for (var i = 0; i < 7; i++) cone(0.3 - i * 0.018, 0.9 - i * 0.05, 0, 1.35 - i * 0.03 + (i > 3 ? 0.1 : 0), -3.6 + i * 1.05, 0, 0, 0, horn);   // back spikes
    var tail = [], tp = g, tx = 0, tz = 2.4, tr = 1.0;
    for (i = 0; i < 7; i++) { var seg = new T.Group(); seg.position.set(0, 0, i === 0 ? 2.4 : 1.35); tp.add(seg); ball(tr, 0, 0, 0.7, 0.85, 0.8, 1.2, skin, seg); tail.push(seg); tp = seg; tr *= 0.82; }
    cone(0.5, 1.5, 0, 0, 1.6, Math.PI / 2, 0, 0, horn, tail[6]);
    [-1, 1].forEach(function (sd) { var leg = ball(0.45, sd * 1.0, -1.1, -0.9, 0.7, 1.1, 1.0, skin); ball(0.4, sd * 1.0, -1.7, -1.5, 0.7, 0.5, 1.2, skin); });
    var wings = [];
    [-1, 1].forEach(function (sd) {
      var piv = new T.Group(); piv.position.set(sd * 1.2, 1.0, -0.9); g.add(piv);
      var sh = new T.Shape(); [[0, 1.4], [3.2, 3.0], [6, 3.4], [11, 4.4], [9.2, 1.8], [10.2, -0.8], [6.8, 0.6], [6.4, -2.4], [3.6, -0.2], [2.6, -3.0], [0, -2.2]].forEach(function (q, k) { if (k === 0) sh.moveTo(q[0], q[1]); else sh.lineTo(q[0], q[1]); }); sh.closePath();
      var geo = new T.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2);
      var m = new T.Mesh(geo, mem); m.castShadow = true; m.scale.x = sd; piv.add(m);
      [[10.8, 4.2, -0.3], [9.6, 0, 0], [6.2, -2.3, 0]].forEach(function (b) { var bx = b[0] * sd, bz = -b[1] - 0.0; var L = Math.hypot(b[0], b[1]); var bone = new T.Mesh(new T.CylinderGeometry(0.1, 0.16, L, 5), skin); bone.position.set(bx / 2, 0.05, bz / 2); bone.rotation.set(Math.PI / 2, 0, 0); bone.lookAt(new T.Vector3(bx, 0.05, bz).add(piv.position)); bone.rotateX(Math.PI / 2); piv.add(bone); });
      wings.push({ piv: piv, sd: sd });
    });
    var prop = new T.Group(); g.add(prop);
    g.userData.prop = prop; g.userData.dragon = { wings: wings, tail: tail, neck: neck, head: head, ph: Math.random() * 6 }; g.rotation.order = "YXZ";
    g.scale.setScalar(1.5);
    return g;
  }
  function animateDragon(g, t, speed) {
    var d = g.userData.dragon; if (!d) return;
    var rate = 3.2 + Math.min(speed, 160) * 0.025, f = Math.sin(t * rate + d.ph), glide = speed > 120 ? 0.3 : 1;
    d.wings.forEach(function (w) { w.piv.rotation.z = -w.sd * (f * 0.75 * glide + 0.1); w.piv.rotation.x = Math.cos(t * rate + d.ph) * 0.12 * glide; });
    d.tail.forEach(function (sg, i) { sg.rotation.y = Math.sin(t * 2.1 - i * 0.7 + d.ph) * 0.17; sg.rotation.x = Math.sin(t * rate + d.ph - i * 0.4) * 0.05; });
    d.head.rotation.x = Math.sin(t * rate + d.ph + 0.8) * 0.06; d.neck.forEach(function (n, i) { n.position.y += 0; });
  }
  var colorIdx = 0, plane = makePlane(PLANE_COLORS[0], 0); scene.add(plane);
  var me = { pos: new T.Vector3(0, 190, 620), yaw: 0, pitch: 0, roll: 0, speed: 80, throttle: 0.45 };

