'use strict';

// -----------------------------
    // Main loop
    // -----------------------------
    function loop(t){
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      update(dt);
      render();
      tickToasts(dt);
      requestAnimationFrame(loop);
    }

    // Initial UI build
    renderHotbar(state);
    updateHUD(state);
    // Initialize camera position instantly
    cam.x = state.player.x - (CANVAS_W/zoom)/2 + TILE/2;
    cam.y = state.player.y - (CANVAS_H/zoom)/2 + TILE/2 - TILE*2;

    // seed hint
    toast('🌿 Fran & the Fernwood Frontier — Explore, Gather, Grow.');

    requestAnimationFrame(loop);
