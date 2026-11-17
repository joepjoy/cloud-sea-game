"use strict";
/* Cloud Sea / geometry.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- geometry assembly: one mesh per island ---------- */
  var _v = new T.Vector3(), _m = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new T.Vector3(), _c = new T.Color(), _c2 = new T.Color();
  function arr(g) { return (g.index ? g.toNonIndexed() : g).attributes.position.array; }
  var SH = {
    ico: arr(new T.IcosahedronGeometry(1, 0)), ico1: arr(new T.IcosahedronGeometry(1, 1)),
    cone6: arr(new T.ConeGeometry(1, 1, 6)), cone4: arr(new T.ConeGeometry(1, 1, 4)), cone12: arr(new T.ConeGeometry(1, 1, 12)),
    cyl: arr(new T.CylinderGeometry(1, 1, 1, 8)), taper: arr(new T.CylinderGeometry(0.7, 1, 1, 8)), box: arr(new T.BoxGeometry(1, 1, 1))
  };
  function Buf() { this.p = []; this.c = []; this.s = []; this.falls = []; this.trees = []; }
  var curSway = 0;
  function add(buf, shape, x, y, z, sx, sy, sz, color, ry, rx, rz) {
    _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _m.compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
    _c.set(color);
    for (var i = 0; i < shape.length; i += 9) {
      var k = 0.93 + 0.14 * Math.abs(Math.sin(i * 1.7 + x * 0.3 + z * 0.7));
      for (var j = 0; j < 9; j += 3) {
        _v.set(shape[i + j], shape[i + j + 1], shape[i + j + 2]).applyMatrix4(_m);
        buf.p.push(_v.x, _v.y, _v.z); buf.c.push(_c.r * k, _c.g * k, _c.b * k); buf.s.push(curSway);
      }
    }
  }
  function tri(buf, a, b, c, color, k) {
    _c.set(color);
    buf.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (var i = 0; i < 3; i++) { buf.c.push(_c.r * k, _c.g * k, _c.b * k); buf.s.push(0); }
  }
  function toGeometry(buf) {
    var g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(buf.p, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(buf.c, 3));
    g.setAttribute("sway", new T.Float32BufferAttribute(buf.s, 1));
    g.computeVertexNormals(); g.computeBoundingSphere();
    return g;
  }
  function tree(buf, kind, leaf, x, y, z, s, r) {
    var col = leaf[Math.floor(r() * leaf.length)];
    if (kind === "mixed") kind = r() < 0.5 ? "round" : "pine";
    if (kind === "round") {
      add(buf, SH.cyl, x, y + 2.2 * s, z, 0.7 * s, 4.6 * s, 0.7 * s, 0x7a5236);
      curSway = 1;
      add(buf, SH.ico, x, y + 6.6 * s, z, 3.6 * s, 3.1 * s, 3.6 * s, col, r() * 6);
      add(buf, SH.ico, x + 1.8 * s, y + 5.2 * s, z + 1.2 * s, 2.3 * s, 2.0 * s, 2.3 * s, col, r() * 6);
      add(buf, SH.ico, x - 1.6 * s, y + 5.6 * s, z - 1.0 * s, 2.1 * s, 1.8 * s, 2.1 * s, leaf[Math.floor(r() * leaf.length)], r() * 6);
    } else if (kind === "pine") {
      add(buf, SH.cyl, x, y + 1.5 * s, z, 0.6 * s, 3 * s, 0.6 * s, 0x6b4a34);
      curSway = 0.6;
      add(buf, SH.cone6, x, y + 4.4 * s, z, 3.4 * s, 4.6 * s, 3.4 * s, col, r() * 6);
      add(buf, SH.cone6, x, y + 7.0 * s, z, 2.7 * s, 4.4 * s, 2.7 * s, col, r() * 6);
      add(buf, SH.cone6, x, y + 9.6 * s, z, 1.9 * s, 4.2 * s, 1.9 * s, leaf === BIOMES[4].leaf ? 0xf4f8ff : col, r() * 6);
    } else if (kind === "cactus") {
      add(buf, SH.cyl, x, y + 3 * s, z, 0.9 * s, 6 * s, 0.9 * s, col);
      add(buf, SH.cyl, x + 1.6 * s, y + 3.6 * s, z, 0.55 * s, 2.6 * s, 0.55 * s, col);
      add(buf, SH.cyl, x + 0.9 * s, y + 2.6 * s, z, 0.5 * s, 1.6 * s, 0.5 * s, col, 0, 0, 1.57);
      add(buf, SH.ico, x, y + 6.3 * s, z, 0.5 * s, 0.5 * s, 0.5 * s, 0xff6fa3);
    } else {
      add(buf, SH.cyl, x + 0.8 * s, y + 4.4 * s, z, 0.5 * s, 9 * s, 0.5 * s, 0x9a7a52, 0, 0, -0.18);
      curSway = 1;
      for (var f = 0; f < 5; f++) { var fa = f / 5 * TAU; add(buf, SH.ico, x + 1.6 * s + Math.cos(fa) * 2.6 * s, y + 8.9 * s, z + Math.sin(fa) * 2.6 * s, 2.9 * s, 0.5 * s, 1.1 * s, col, -fa, 0, -0.35); }
      add(buf, SH.ico, x + 1.6 * s, y + 9.3 * s, z, 1.2 * s, 0.9 * s, 1.2 * s, col);
    }
    curSway = 0;
  }
  function house(buf, x, y, z, r) {
    var w = 5 + r() * 2.5, ry = r() * TAU, two = r() < 0.35, hgt = two ? 7.2 : 3.8, roofs = [0xd4523a, 0xc8553d, 0xe07a3f, 0x4f7fbf, 0x8a5cc2];
    var sn = Math.sin(ry), cs = Math.cos(ry);
    add(buf, SH.box, x, y + hgt / 2, z, w, hgt, w * 0.82, r() < 0.5 ? 0xfff4e0 : 0xf2e2c4, ry);
    add(buf, SH.cone4, x, y + hgt + 1.6, z, w * 0.84, 3.4, w * 0.72, roofs[Math.floor(r() * roofs.length)], ry + Math.PI / 4);
    add(buf, SH.box, x + cs * w * 0.22, y + hgt + 2.3, z - sn * w * 0.22, 0.9, 2.6, 0.9, 0x8a6a55, ry);
    add(buf, SH.box, x + sn * w * 0.415, y + 1.1, z + cs * w * 0.415, 1.3, 2.2, 0.15, 0x7a5236, ry);
    add(buf, SH.box, x + sn * w * 0.415 + cs * w * 0.27, y + (two ? 5 : 2.3), z + cs * w * 0.415 - sn * w * 0.27, 1.1, 1.1, 0.15, 0x8fd3ff, ry);
  }
  function landmark(buf, type, y, r) {
    var i, a;
    if (type === 0) { // windmill body; blades are a separate spinning mesh
      add(buf, SH.taper, 0, y + 14, 0, 6, 28, 6, 0xfdf6e6); add(buf, SH.cone12, 0, y + 31, 0, 5.6, 6, 5.6, 0xd4523a);
      add(buf, SH.box, 0, y + 3, 4.4, 2.4, 4.6, 0.6, 0x7a5236);
    } else if (type === 1) {
      for (i = 0; i < 5; i++) add(buf, SH.taper, 0, y + 5 + i * 9, 0, 6 - i * 0.7, 9, 6 - i * 0.7, i % 2 ? 0xe24a3b : 0xfdfdfd);
      add(buf, SH.cyl, 0, y + 50, 0, 3.4, 4, 3.4, 0xffe27a); add(buf, SH.cone12, 0, y + 55, 0, 4.4, 5, 4.4, 0x2f3f66);
      add(buf, SH.cyl, 0, y + 47.6, 0, 5, 0.8, 5, 0x2f3f66);
    } else if (type === 2) { // an arch wide enough to fly through
      add(buf, SH.box, -26, y + 28, 0, 9, 58, 9, 0xbdb6a6); add(buf, SH.box, 26, y + 28, 0, 9, 58, 9, 0xb1ab9c);
      add(buf, SH.box, 0, y + 61, 0, 70, 9, 10, 0xc6bfae); add(buf, SH.box, -26, y + 4, 0, 13, 5, 13, 0x9d978a); add(buf, SH.box, 26, y + 4, 0, 13, 5, 13, 0x9d978a);
      add(buf, SH.ico, 30, y + 69, 0, 6, 4, 6, 0x4fa647);
    } else if (type === 3) {
      add(buf, SH.taper, 0, y + 24, 0, 8, 50, 8, 0x7a5236);
      for (i = 0; i < 6; i++) { a = i / 6 * TAU; add(buf, SH.ico1, Math.cos(a) * 17, y + 50 + (i % 2) * 8, Math.sin(a) * 17, 19, 14, 19, i % 2 ? 0x3f9a4a : 0x58b356, a); }
      add(buf, SH.ico1, 0, y + 66, 0, 22, 16, 22, 0x67ba52);
    } else if (type === 4) {
      var cols = [0x7de8ff, 0xb59cff, 0x9af0e0];
      for (i = 0; i < 7; i++) { a = i / 7 * TAU; var d = i ? 9 + r() * 8 : 0, h = i ? 16 + r() * 22 : 52; add(buf, SH.ico, Math.cos(a) * d, y + h * 0.45, Math.sin(a) * d, 4 + r() * 3, h, 4 + r() * 3, cols[i % 3], r() * 6, (r() - 0.5) * 0.5, (r() - 0.5) * 0.5); }
    } else if (type === 5) {
      add(buf, SH.box, 0, y + 8, 0, 34, 16, 34, 0xc9c4b8); add(buf, SH.box, 0, y + 22, 0, 16, 16, 16, 0xd6d1c5); add(buf, SH.cone4, 0, y + 36, 0, 13, 12, 13, 0x4f7fbf, Math.PI / 4);
      for (i = 0; i < 4; i++) { var tx = (i % 2 ? 1 : -1) * 18, tz = (i < 2 ? 1 : -1) * 18; add(buf, SH.cyl, tx, y + 13, tz, 5, 26, 5, 0xbdb8ab); add(buf, SH.cone12, tx, y + 31, tz, 6, 10, 6, 0x4f7fbf); }
    } else {
      add(buf, SH.cyl, 0, y + 9, 0, 13, 18, 13, 0xf3efe6); add(buf, SH.ico1, 0, y + 18, 0, 13, 12, 13, 0xe9eef7);
      add(buf, SH.box, 6, y + 27, 0, 16, 3, 3, 0xd9a441, 0, 0, 0.6); add(buf, SH.cyl, 0, y + 1, 0, 16, 2, 16, 0xbdb8ab);
    }
  }
