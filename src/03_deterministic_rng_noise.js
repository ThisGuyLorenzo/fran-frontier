'use strict';

// -----------------------------
    // Deterministic RNG & noise
    // -----------------------------
    function hash32(n){
      n |= 0;
      n = (n ^ 61) ^ (n >>> 16);
      n = n + (n << 3);
      n = n ^ (n >>> 4);
      n = n * 0x27d4eb2d;
      n = n ^ (n >>> 15);
      return n | 0;
    }

    function rand2(ix, iy, seed){
      // 0..1 deterministic
      const n = hash32(ix * 374761393 + iy * 668265263 + seed * 1442695041);
      return ((n >>> 0) / 4294967296);
    }

    function noise2(x, y, seed){
      // Value noise with bilinear interpolation
      const x0 = Math.floor(x), y0 = Math.floor(y);
      const xf = x - x0, yf = y - y0;
      const r00 = rand2(x0, y0, seed);
      const r10 = rand2(x0+1, y0, seed);
      const r01 = rand2(x0, y0+1, seed);
      const r11 = rand2(x0+1, y0+1, seed);
      const u = smooth(xf), v = smooth(yf);
      return lerp( lerp(r00, r10, u), lerp(r01, r11, u), v );
    }

    function fbm(x, y, seed){
      // Fractal Brownian Motion (few octaves)
      let amp = 0.5, freq = 1.0, sum = 0.0;
      for(let i=0;i<4;i++){
        sum += amp * noise2(x*freq, y*freq, seed + i*1013);
        freq *= 2.0;
        amp *= 0.5;
      }
      return sum; // ~0..1
    }
