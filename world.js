"use strict";
/* Cloud Sea / world.js  (shared scope with the other game scripts, loaded in order) */
  /* ---------- regions ---------- */
  var BIOMES = [
    { name: "meadow",   g1: 0x6fae45, g2: 0x9be063, dirt: 0x4f8f3a, rock1: 0xb9a184, rock2: 0x666b90, hill: 0.10, tree: "round", leaf: [0x3f9a4a, 0x2f8243, 0x58b356], treeD: 0.55, village: true, water: [0.3, 0.86, 0.8] },
    { name: "forest",   g1: 0x3c7436, g2: 0x67ba52, dirt: 0x34703a, rock1: 0x8f8a7c, rock2: 0x585f85, hill: 0.13, tree: "mixed", leaf: [0x2f7d3e, 0x256b3a, 0x3f9a4a], treeD: 1.5, village: false, water: [0.16, 0.6, 0.52] },
    { name: "autumn",   g1: 0xb89a48, g2: 0xd3cf62, dirt: 0x8b8a3d, rock1: 0xb08a6a, rock2: 0x6b6488, hill: 0.10, tree: "round", leaf: [0xe8813a, 0xd9502f, 0xf2b53c], treeD: 0.9, village: true, water: [0.25, 0.62, 0.62] },
    { name: "desert",   g1: 0xe2c485, g2: 0xdcb873, dirt: 0xc99a5c, rock1: 0xd07a4e, rock2: 0x8b5a70, hill: 0.06, tree: "cactus", leaf: [0x5fa052, 0x4c8f4a], treeD: 0.2, village: false, water: [0.3, 0.8, 0.7] },
    { name: "snow",     g1: 0xeef4fc, g2: 0xdbe8fb, dirt: 0xb9c9e6, rock1: 0x8f9bb4, rock2: 0x566386, hill: 0.24, tree: "pine", leaf: [0x2f6d55, 0x275c4c], treeD: 0.6, village: false, water: [0.6, 0.88, 0.97] },
    { name: "tropical", g1: 0x4fbf5a, g2: 0x8be37d, dirt: 0xead9a0, rock1: 0xd3b183, rock2: 0x5f7190, hill: 0.08, tree: "palm", leaf: [0x2fa56a, 0x3fbf78], treeD: 0.6, village: true, water: [0.2, 0.92, 0.78] },
    { name: "volcanic", g1: 0x4b4744, g2: 0x5a5550, dirt: 0x3a3432, rock1: 0x3d3838, rock2: 0x24222e, hill: 0.1, tree: "pine", leaf: [0x4a4a38], treeD: 0.1, village: false, water: [1.0, 0.42, 0.08] },
    { name: "blossom",  g1: 0x86c765, g2: 0xa6dc7a, dirt: 0x5a9a4a, rock1: 0xc4ab9c, rock2: 0x6b6488, hill: 0.1, tree: "round", leaf: [0xf7a8c8, 0xf58fb8, 0xfbc4d8, 0xffe1ec], treeD: 0.95, village: true, water: [0.42, 0.82, 0.92] }
  ];
  var LANDMARKS = ["Windmill", "Lighthouse", "Sky Arch", "Elder Tree", "Crystal Spire", "Castle", "Observatory"];
  var SYL = ["ae", "lo", "ri", "ka", "mi", "tor", "sel", "vyn", "da", "no", "esh", "ula", "bri", "zan", "fey", "ost"];
  function placeName(r) { var n = "", k = 2 + Math.floor(r() * 2); for (var i = 0; i < k; i++) n += SYL[Math.floor(r() * SYL.length)]; return n.charAt(0).toUpperCase() + n.slice(1); }

  var cellCache = new Map();
  function cellInfo(cx, cz) {
    var key = cx + "," + cz, c = cellCache.get(key);
    if (c) return c;
    var r = mulberry(Math.floor(hash3(cx, cz, 1) * 4294967296));
    if (cx === 0 && cz === 0) c = { exists: true, x: 0, z: 0, y: 30, R: 265, D: 360, biome: 0, lm: 0 };
    else {
      c = { exists: hash3(cx, cz, 2) < 0.68 };
      c.x = cx * CELL + (r() - 0.5) * CELL * 0.42; c.z = cz * CELL + (r() - 0.5) * CELL * 0.42;
      c.R = 80 + Math.pow(r(), 1.3) * 175;
      c.y = -40 + vnoise(cx * 0.31, cz * 0.31) * 240 + r() * 130;
      c.D = c.R * (1.05 + r() * 0.8);
      c.biome = clamp(Math.floor((vnoise(cx * 0.47 + 40, cz * 0.47 + 40) * 1.5 - 0.25) * 8), 0, 7);
      c.lm = (c.R > 115 && r() < 0.34) ? Math.floor(r() * LANDMARKS.length) : -1;
    }
    c.cx = cx; c.cz = cz; c.key = key; c.seed = Math.floor(r() * 4294967296);
    if (c.lm >= 0) c.name = (c.lm === 0 && cx === 0 && cz === 0) ? "Home Windmill" : LANDMARKS[c.lm] + " of " + placeName(r);
    cellCache.set(key, c);
    return c;
  }
  // push a point up and out of any island it would sit inside
  function clearOfIslands(x, y, z, pad) {
    var cx = Math.round(x / CELL), cz = Math.round(z / CELL);
    for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) {
      var c = cellInfo(cx + i, cz + j); if (!c.exists) continue;
      var dd = Math.hypot(x - c.x, z - c.z); if (dd < c.R + pad && y > c.y - c.D - pad) { var need = c.y + (dd < c.R ? terrainFor(c).h(x - c.x, z - c.z) : 0) + 40 + pad * 0.5; if (y < need) y = need; }
    }
    return y;
  }

