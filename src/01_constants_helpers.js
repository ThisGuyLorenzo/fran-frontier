// Fran & the Fernwood Frontier — Cozy Browser Build
// Single-file, offline-friendly HTML5 canvas game (no external libraries).
// Save this as index.html and open it in a browser.

'use strict';

// -----------------------------
    // Constants & helpers
    // -----------------------------
    const CANVAS_W = 960;
    const CANVAS_H = 544;
    const TILE = 16;
    const CHUNK = 32;              // 32x32 tiles per chunk
    const WORLD_CLEARING_R = 10;   // tiles: starter clearing radius around cottage
    const DAY_LENGTH = 8 * 60;     // seconds per day (8 minutes)

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a,b,t) => a + (b-a) * t;
    const smooth = t => t*t*(3-2*t);

    function setZoomTarget(z){
      const nz = clamp(Math.round(z), ZOOM_MIN, ZOOM_MAX);
      if (nz !== zoomTarget){
        zoomTarget = nz;
        toast(`🔎 Zoom: ${zoomTarget}x`);
      }
    }

    const fmtTime = (t01) => {
      // 0..1 mapped to 6:00 -> 24:00
      const minutes = Math.floor( (6*60) + t01 * (18*60) );
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const hh = String(h).padStart(2,'0');
      const mm = String(m).padStart(2,'0');
      return hh + ':' + String(mm).padStart(2,'0');
    };

    const nowSeed = () => (Math.random() * 0x7fffffff) | 0;
