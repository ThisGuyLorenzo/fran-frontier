'use strict';

// -----------------------------
    // Render
    // -----------------------------
    function render(){
      const S = state;
      const P = S.player;

      // camera
      const camX = Math.round(cam.x);
      const camY = Math.round(cam.y);

      // clear
      ctx.setTransform(1,0,0,1,0,0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0,0,CANVAS_W,CANVAS_H);


  // world/interior render in a scaled "snug" view
  ctx.setTransform(zoom, 0, 0, zoom, 0, 0);
  if (S.scene === 'interior'){
    drawInterior(S, camX, camY);
    drawInteractHighlight(S, camX, camY);
    drawPlayer(S, camX, camY);
  } else {
    drawWorld(S, camX, camY);
    drawInteractHighlight(S, camX, camY);
    drawPlayer(S, camX, camY);
  }
  ctx.setTransform(1,0,0,1,0,0);

  // cinematic cozy overlays
  let nightA = 0;
  if (S.scene !== 'interior'){
    nightA = drawLighting(S);
    drawWorldLights(S, camX, camY, nightA);
    drawWeatherFX(S, nightA);
  } else {
    // subtle indoor vignette
    drawFrameFX(S, 0.2);
  }
  if (S.scene !== 'interior'){
    drawFrameFX(S, nightA);
  }

  // Phase 2: fade transitions overlay
  if (S.transition && S.transition.active){
    const half = S.transition.dur/2;
    const t = S.transition.t;
    let a = t < half ? (t/half) : (1 - (t-half)/half);
    a = clamp(a, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
  }
}
