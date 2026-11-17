"use strict";
/* Cloud Sea / core.js  (shared scope with the other game scripts, loaded in order) */
  var $ = function (id) { return document.getElementById(id); };
  var T = THREE, TAU = Math.PI * 2;
  var SEED = 1337, CELL = 720, VIEW_CELLS = 3;

  /* ---------- deterministic randomness: every player sees the same world ---------- */
  function hash3(x, z, k) {
    var h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(k | 0, 1274126177) + SEED) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function sstep(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function vnoise(x, z) {
    var xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
    fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
    return lerp(lerp(hash3(xi, zi, 9), hash3(xi + 1, zi, 9), fx), lerp(hash3(xi, zi + 1, 9), hash3(xi + 1, zi + 1, 9), fx), fz);
  }
  function angLerp(a, b, t) { var d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return a + d * t; }

  /* custom shaders write linear light; this makes them encode for the screen the same way built-in materials do */
  function csFrag(m) { m.fragmentShader = m.fragmentShader.replace(/\}\s*$/, "\n#include <colorspace_fragment>\n}"); return m; }
