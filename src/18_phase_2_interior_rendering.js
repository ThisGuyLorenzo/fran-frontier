'use strict';

// -----------------------------
// Phase 2: Interior rendering
// -----------------------------
function drawInterior(S, camX, camY){
  const I = S.interior;
  // --- background tiles ---
  const door = I.door;
  const rug = I.rug;

  for(let ty=0; ty<I.h; ty++){
    for(let tx=0; tx<I.w; tx++){
      const wx = tx*TILE - camX;
      const wy = ty*TILE - camY;

      // walls (1-tile border), but the door tile is an opening
      const border = (tx===0 || ty===0 || tx===I.w-1 || ty===I.h-1);
      const isDoor = (tx===door.tx && ty===door.ty);
      const isWall = border && !isDoor;

      // rug area (soft woven pattern)
      const onRug = (rug && tx>=rug.x0 && tx<rug.x0+rug.w && ty>=rug.y0 && ty<rug.y0+rug.h);

      if (isWall){
        // warm wood walls
        ctx.fillStyle = 'rgba(107,79,42,0.92)';
        ctx.fillRect(wx, wy, TILE, TILE);
        // subtle plank shading
        ctx.fillStyle = (tx%2===0) ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(wx, wy, TILE, TILE);
      } else if (onRug){
        // rug base
        ctx.fillStyle = ((tx+ty)&1) ? 'rgba(196,128,154,0.92)' : 'rgba(205,142,165,0.92)';
        ctx.fillRect(wx, wy, TILE, TILE);
        // stitched border
        if (tx===rug.x0 || tx===rug.x0+rug.w-1 || ty===rug.y0 || ty===rug.y0+rug.h-1){
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.fillRect(wx+2, wy+2, TILE-4, TILE-4);
        }
      } else {
        // wood floor (cozy, slightly varied)
        ctx.fillStyle = ((tx+ty)&1) ? 'rgba(243,234,214,0.96)' : 'rgba(247,241,227,0.96)';
        ctx.fillRect(wx, wy, TILE, TILE);
        // faint plank line
        ctx.fillStyle = 'rgba(107,79,42,0.08)';
        ctx.fillRect(wx, wy+TILE-2, TILE, 1);
      }
    }
  }

  // --- window (top wall) + light beam ---
  if (I.window){
    const w = I.window;
    const wx = w.tx*TILE - camX;
    const wy = w.ty*TILE - camY;
    // cut-out window frame
    ctx.fillStyle = 'rgba(66,45,26,0.85)';
    ctx.fillRect(wx+3, wy+2, TILE-6, TILE-4);
    ctx.fillStyle = 'rgba(185,228,255,0.55)';
    ctx.fillRect(wx+4, wy+3, TILE-8, TILE-6);
    // light beam onto the floor
    const g = ctx.createLinearGradient(wx+TILE/2, wy+TILE, wx+TILE/2, wy+TILE*5);
    g.addColorStop(0, 'rgba(255,245,220,0.28)');
    g.addColorStop(1, 'rgba(255,245,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(wx-TILE*1.2, wy+TILE, TILE*2.4, TILE*4);
  }

  // --- door on bottom wall ---
  {
    const wx = door.tx*TILE - camX;
    const wy = door.ty*TILE - camY;
    // opening
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(wx+3, wy+2, TILE-6, TILE-4);
    // little entry mat inside
    ctx.fillStyle = 'rgba(95,159,182,0.25)';
    ctx.fillRect(wx+4, wy-4, TILE-8, 5);
  }

  // --- furniture ---
  // bed (simple: wood frame + quilt)
  {
    const b = I.bed;
    const wx = b.tx*TILE - camX;
    const wy = b.ty*TILE - camY;
    // frame
    ctx.fillStyle = 'rgba(92,63,35,0.9)';
    ctx.fillRect(wx+3, wy+7, TILE-6, TILE-9);
    // quilt
    ctx.fillStyle = 'rgba(216,138,165,0.95)';
    ctx.fillRect(wx+4, wy+8, TILE-8, TILE-11);
    // pillow
    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    ctx.fillRect(wx+6, wy+9, TILE-12, TILE*0.32);
    // tiny stitched pattern
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(wx+6, wy+TILE*0.72, TILE-12, 1);
  }

  // workbench (wood tabletop + tools)
  {
    const wb = I.workbench;
    const wx = wb.tx*TILE - camX;
    const wy = wb.ty*TILE - camY;
    // legs
    ctx.fillStyle = 'rgba(76,52,30,0.9)';
    ctx.fillRect(wx+4, wy+9, 3, TILE-10);
    ctx.fillRect(wx+TILE-7, wy+9, 3, TILE-10);
    // tabletop
    ctx.fillStyle = 'rgba(138,106,58,0.95)';
    ctx.fillRect(wx+3, wy+7, TILE-6, 6);
    // tool hints (little pixels)
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(wx+6, wy+8, 2, 2);
    ctx.fillRect(wx+9, wy+9, 2, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(wx+TILE-8, wy+8, 3, 3);
  }

  // chest (wood box + latch)
  {
    const c = I.chest;
    const wx = c.tx*TILE - camX;
    const wy = c.ty*TILE - camY;
    ctx.fillStyle = 'rgba(138,106,58,0.95)';
    ctx.fillRect(wx+4, wy+9, TILE-8, TILE-12);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(wx+4, wy+TILE*0.55, TILE-8, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(wx+TILE*0.48, wy+TILE*0.6, 3, 6);
  }


  // --- warm ambient glow (subtle) ---
  const gx = (-camX) + I.w*TILE*0.25;
  const gy = (-camY) + I.h*TILE*0.55;
  const grad = ctx.createRadialGradient(gx, gy, 10, gx, gy, I.w*TILE*0.8);
  grad.addColorStop(0, 'rgba(255, 210, 160, 0.10)');
  grad.addColorStop(1, 'rgba(255, 210, 160, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(-camX, -camY, I.w*TILE, I.h*TILE);
}

function drawInteractHighlight(S, camX,camY){
      const t = targetTile(S);
      const wx = t.tx*TILE - camX;
      const wy = t.ty*TILE - camY;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = 'rgba(255,255,255,.65)';
      ctx.lineWidth = 1 / zoom;
      ctx.strokeRect(wx, wy, TILE, TILE);
      ctx.globalAlpha = 1;
    }
