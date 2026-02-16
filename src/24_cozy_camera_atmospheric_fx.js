'use strict';

// -----------------------------
    // Cozy camera + atmospheric FX
    // -----------------------------
    function getNightAlpha(S){
      const t = S.time.t01;
      const dusk = (t<0.15) ? (0.55 - t/0.15*0.55) :
                   (t>0.85) ? ((t-0.85)/0.15*0.65) : 0;
      return clamp(dusk, 0, 0.70);
    }

    function updateCamera(S, dt){
      // Smooth zoom toward target
      const zLerp = 1 - Math.pow(0.001, dt * 6);
      zoom = zoom + (zoomTarget - zoom) * zLerp;

      const P = S.player;
      const viewW = CANVAS_W / zoom;
      const viewH = CANVAS_H / zoom;

      // Look-ahead based on actual movement (prevents sudden jumps when tapping directions)
      const vx = P.vx || 0;
      const vy = P.vy || 0;
      const vlen = Math.hypot(vx, vy);
      const moving = vlen > 5;
      const targetLX = moving ? (vx / vlen) : 0;
      const targetLY = moving ? (vy / vlen) : 0;

      const lookSmooth = 1 - Math.pow(0.001, dt * 6);
      camLook.x = camLook.x + (targetLX - camLook.x) * lookSmooth;
      camLook.y = camLook.y + (targetLY - camLook.y) * lookSmooth;

      const lookAhead = TILE * 1.25; // cozy but stable
      const cozyOffsetY = TILE * 1.8; // Fran sits a touch lower on screen

      let desiredX = (P.x + TILE/2) - viewW/2 + camLook.x * lookAhead;
      let desiredY = (P.y + TILE/2) - viewH/2 + camLook.y * lookAhead - cozyOffsetY;

      // Micro "breathing" drift when standing still (adds life without jitter)
      if (S.scene !== 'interior' && !moving && !S.nav){
        const tt = performance.now()/1000;
        desiredX += Math.sin(tt*0.45) * 2.10;
        desiredY += Math.cos(tt*0.38) * 1.70;
      }

      // softer camera easing (less snap)
      const cLerp = 1 - Math.pow(0.001, dt * 4);
      cam.x = cam.x + (desiredX - cam.x) * cLerp;
      cam.y = cam.y + (desiredY - cam.y) * cLerp;

      // Clamp camera inside cottage interior bounds
      if (S.scene === 'interior' && S.interior){
        const I = S.interior;
        const roomW = I.w * TILE;
        const roomH = I.h * TILE;

        // If the room is smaller than the view, keep it perfectly centered.
        if (roomW <= viewW){
          cam.x = (roomW - viewW) / 2;
        } else {
          const maxX = roomW - viewW;
          cam.x = clamp(cam.x, -TILE, maxX + TILE);
        }

        if (roomH <= viewH){
          cam.y = (roomH - viewH) / 2;
        } else {
          const maxY = roomH - viewH;
          cam.y = clamp(cam.y, -TILE*2, maxY + TILE);
        }
      }
    }

    function worldToScreen(wx, wy, camX, camY){
      return { x: (wx - camX) * zoom, y: (wy - camY) * zoom };
    }

    function updateFX(S, dt){
      const nightA = getNightAlpha(S);

      // Leaves (always, gentle)
      fxTimers.leaf -= dt;
      if (fxTimers.leaf <= 0){
        fxTimers.leaf = 0.25 + Math.random()*0.35;
        if (fx.leaves.length < 22){
          fx.leaves.push({
            x: Math.random()*CANVAS_W,
            y: -10,
            vx: (-10 + Math.random()*20),
            vy: (8 + Math.random()*22),
            wob: Math.random()*6.28,
            s: 1 + Math.random()*2,
            a: 0.15 + Math.random()*0.12
          });
        }
      }
      for(let i=fx.leaves.length-1;i>=0;i--){
        const p = fx.leaves[i];
        p.wob += dt*1.4;
        p.x += (p.vx + Math.sin(p.wob)*8) * dt;
        p.y += p.vy * dt;
        if (p.y > CANVAS_H + 20){ fx.leaves.splice(i,1); }
      }

      // Rain streaks
      const rainI = (S.time.rainIntensity ?? 0);
      if (rainI > 0.08){
        fxTimers.rain -= dt;
        if (fxTimers.rain <= 0){
          fxTimers.rain = 0.03 - Math.min(0.02, rainI*0.02);
          const drops = 3 + Math.floor(rainI*7);
          for(let k=0;k<drops;k++){
            fx.rain.push({
              x: Math.random()*CANVAS_W,
              y: -10,
              vx: -40 - Math.random()*25,
              vy: 280 + Math.random()*120,
              a: 0.18 + Math.random()*0.10
            });
          }
        }
      }
      for(let i=fx.rain.length-1;i>=0;i--){
        const p = fx.rain[i];
        p.x += p.vx*dt;
        p.y += p.vy*dt;
        if (p.y > CANVAS_H + 20 || p.x < -40){ fx.rain.splice(i,1); }
      }
      if (rainI <= 0.01 && fx.rain.length > 80){
        fx.rain.splice(0, fx.rain.length-80);
      }

      // Snow (winter season OR frost biome nearby)
      const P = S.player;
      const b = tileBiomeKey(S, Math.floor(P.x/TILE), Math.floor(P.y/TILE));
      const snowy = (S.time.season === 3) || (b === 6);
      if (snowy){
        fxTimers.snow -= dt;
        if (fxTimers.snow <= 0){
          fxTimers.snow = 0.08;
          if (fx.snow.length < 90){
            fx.snow.push({
              x: Math.random()*CANVAS_W,
              y: -10,
              vx: -10 + Math.random()*20,
              vy: 18 + Math.random()*45,
              s: 1 + Math.random()*2,
              a: 0.18 + Math.random()*0.18
            });
          }
        }
      }
      for(let i=fx.snow.length-1;i>=0;i--){
        const p = fx.snow[i];
        p.x += p.vx*dt;
        p.y += p.vy*dt;
        if (p.y > CANVAS_H + 20){ fx.snow.splice(i,1); }
      }
      if (!snowy && fx.snow.length > 30){
        fx.snow.splice(0, fx.snow.length-30);
      }

      // Fireflies at night (subtle)
      if (nightA > 0.20){
        fxTimers.fly -= dt;
        if (fxTimers.fly <= 0){
          fxTimers.fly = 0.35 + Math.random()*0.45;
          if (fx.fireflies.length < 18){
            fx.fireflies.push({
              x: Math.random()*CANVAS_W,
              y: Math.random()*CANVAS_H,
              vx: (-12 + Math.random()*24),
              vy: (-10 + Math.random()*20),
              t: 1.2 + Math.random()*2.0
            });
          }
        }
      }
      for(let i=fx.fireflies.length-1;i>=0;i--){
        const p = fx.fireflies[i];
        p.t -= dt;
        p.x += p.vx*dt;
        p.y += p.vy*dt;
        // wrap softly
        if (p.x < -10) p.x = CANVAS_W+10;
        if (p.x > CANVAS_W+10) p.x = -10;
        if (p.y < -10) p.y = CANVAS_H+10;
        if (p.y > CANVAS_H+10) p.y = -10;
        if (p.t <= 0) fx.fireflies.splice(i,1);
      }

      // Chimney smoke (world-space, only when cottage is on-screen)
      fxTimers.smoke -= dt;
      if (fxTimers.smoke <= 0){
        fxTimers.smoke = 0.22 + Math.random()*0.22;
        const camX = Math.round(cam.x);
        const camY = Math.round(cam.y);
        // chimney world position based on cottage sprite placement
        // Cottage sprite top-left is tile-aligned at (-1*TILE, -2*TILE)
        const chimneyWX = (-1 * TILE) + 37;
        const chimneyWY = (-2 * TILE) + 6;

        const sc = worldToScreen(chimneyWX, chimneyWY, camX, camY);
        if (sc.x > -80 && sc.x < CANVAS_W+80 && sc.y > -120 && sc.y < CANVAS_H+80){
          fx.smoke.push({
            wx: chimneyWX + (-2 + Math.random()*4),
            wy: chimneyWY + (-2 + Math.random()*3),
            vx: -3 + Math.random()*6,
            vy: -18 - Math.random()*20,
            a: 0.10 + Math.random()*0.08,
            t: 2.0 + Math.random()*1.2
          });
        }
      }
      for(let i=fx.smoke.length-1;i>=0;i--){
        const p = fx.smoke[i];
        p.t -= dt;
        p.wx += p.vx*dt;
        p.wy += p.vy*dt;
        if (p.t <= 0) fx.smoke.splice(i,1);
      }
    }

    function drawFrameFX(S, nightA){
      // Warm edge light (sunrise/sunset), plus vignette
      const t = S.time.t01;

      // sunrise warmth
      const sunrise = clamp(1 - Math.abs(t-0.12)/0.10, 0, 1);
      const sunset  = clamp(1 - Math.abs(t-0.88)/0.10, 0, 1);
      const warmA = (sunrise*0.18 + sunset*0.20);

      // Indoor warmth: a gentle amber glow (screen-space)
      if (S.scene === 'interior'){
        ctx.save();
        const gIn = ctx.createRadialGradient(CANVAS_W*0.5, CANVAS_H*0.60, 40, CANVAS_W*0.5, CANVAS_H*0.60, CANVAS_W*0.8);
        gIn.addColorStop(0, 'rgba(255, 210, 160, 0.14)');
        gIn.addColorStop(1, 'rgba(0, 0, 0, 0.00)');
        ctx.fillStyle = gIn;
        ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.restore();
      }

      if (warmA > 0.01){
        const g = ctx.createRadialGradient(CANVAS_W*0.5, CANVAS_H*0.15, 10, CANVAS_W*0.5, CANVAS_H*0.2, CANVAS_W*0.75);
        g.addColorStop(0, `rgba(255, 214, 170, ${0.22*warmA})`);
        g.addColorStop(1, `rgba(255, 214, 170, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
      }

      // vignette
      ctx.globalAlpha = 0.35 + nightA*0.35;
      const vg = ctx.createRadialGradient(CANVAS_W/2, CANVAS_H/2, CANVAS_H*0.15, CANVAS_W/2, CANVAS_H/2, CANVAS_H*0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(30, 25, 18, 1)');
      ctx.fillStyle = vg;
      ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
      ctx.globalAlpha = 1;
    }

    function drawWorldLights(S, camX, camY, nightA){
      if (nightA <= 0.05) return;

      // Light rendering in screen space (after world render)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      function glow(wx, wy, r, col, a){
        const p = worldToScreen(wx, wy, camX, camY);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, `rgba(${col}, ${a})`);
        g.addColorStop(1, `rgba(${col}, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(p.x-r, p.y-r, r*2, r*2);
      }

      // Cottage windows glow (world positions based on sprite layout)
      const win1 = { wx: -16 + 17, wy: -56 + 33 };
      const win2 = { wx: -16 + 35, wy: -56 + 33 };
      const door = { wx: 0*TILE + TILE/2, wy: 1*TILE + TILE/2 };

      const a = 0.35 + nightA*0.55;
      glow(win1.wx, win1.wy, 120, '255, 200, 140', a);
      glow(win2.wx, win2.wy, 120, '255, 200, 140', a);
      glow(door.wx, door.wy, 160, '255, 190, 120', a*0.85);

      // Campfires
      const {tx,ty} = playerTile(S);
      for(let dy=-18; dy<=18; dy++){
        for(let dx=-18; dx<=18; dx++){
          const px = tx+dx, py=ty+dy;
          const p = placedAt(S, px, py);
          if (p && p.type==='campfire'){
            glow(px*TILE + TILE/2, py*TILE + TILE/2, 150, '255, 185, 110', a*0.75);
          }
        }
      }

      // A small personal lantern around Fran
      const P = S.player;
      glow(P.x + TILE/2, P.y + TILE/2, 90, '255, 215, 160', 0.18 + nightA*0.22);

      ctx.restore();
    }

    function drawWeatherFX(S, nightA){
      // Leaves (screen-space)
      ctx.save();
      ctx.globalAlpha = 1;

      // fireflies
      if (nightA > 0.15 && fx.fireflies.length){
        ctx.globalCompositeOperation = 'lighter';
        for(const p of fx.fireflies){
          ctx.globalAlpha = 0.20 + nightA*0.45;
          ctx.fillStyle = 'rgba(220, 255, 180, 1)';
          ctx.fillRect((p.x|0), (p.y|0), 2, 2);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }

      // smoke (world-space)
      if (fx.smoke.length){
        for(const p of fx.smoke){
          const camX = Math.round(cam.x);
          const camY = Math.round(cam.y);
          const s = worldToScreen(p.wx, p.wy, camX, camY);
          ctx.globalAlpha = p.a;
          ctx.fillStyle = 'rgba(255,255,255,1)';
          ctx.fillRect((s.x|0), (s.y|0), 3, 2);
        }
        ctx.globalAlpha = 1;
      }

      // leaves
      for(const p of fx.leaves){
        ctx.globalAlpha = p.a;
        ctx.fillStyle = 'rgba(90, 120, 80, 1)';
        ctx.fillRect((p.x|0), (p.y|0), p.s|0, p.s|0);
      }
      ctx.globalAlpha = 1;


      // clouds (soft layer, screen-space)
      const cloud = (S.time.cloudiness ?? 0);
      if (cloud > 0.05){
        const tt = performance.now()/1000;
        ctx.globalAlpha = 0.10 + cloud*0.18;
        ctx.fillStyle = 'rgba(230, 235, 240, 1)';
        for(let i=0;i<4;i++){
          const y = 18 + i*26 + Math.sin(tt*0.22 + i)*8;
          const x = ((tt*18) + i*240) % (CANVAS_W+420) - 420;
          ctx.fillRect(x, y, 340, 34);
        }
        ctx.globalAlpha = 1;
      }

      // rain
      if (fx.rain.length){
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = 'rgba(220, 240, 255, .25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(const p of fx.rain){
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 10, p.y + 18);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }


      // snow
      if (fx.snow.length){
        for(const p of fx.snow){
          ctx.globalAlpha = p.a;
          ctx.fillStyle = 'rgba(255,255,255,1)';
          ctx.fillRect((p.x|0), (p.y|0), p.s|0, p.s|0);
        }
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }
