'use strict';

// -----------------------------
    // Rendering helpers
    // -----------------------------
    function drawSprite(img, wx,wy){
      ctx.drawImage(img, wx, wy);
    }

    const _visEnts = [];

    function drawWorld(S, camX, camY){
      const left = Math.floor(camX / TILE);
      const top  = Math.floor(camY / TILE);
      const right = left + Math.ceil((CANVAS_W / zoom) / TILE) + 3;
      const bottom= top  + Math.ceil((CANVAS_H / zoom) / TILE) + 3;

      const cx0 = Math.floor(left / CHUNK);
      const cy0 = Math.floor(top / CHUNK);
      const cx1 = Math.floor((right - 1) / CHUNK);
      const cy1 = Math.floor((bottom - 1) / CHUNK);

      // tiles + biome wash (chunk-batched to avoid per-tile tileToChunk/getChunk allocations)
      let lastWash = null;
      for(let cy=cy0; cy<=cy1; cy++){
        const chunkY = cy * CHUNK;
        const ty0 = Math.max(top, chunkY);
        const ty1 = Math.min(bottom, chunkY + CHUNK);

        for(let cx=cx0; cx<=cx1; cx++){
          const chunkX = cx * CHUNK;
          const tx0 = Math.max(left, chunkX);
          const tx1 = Math.min(right, chunkX + CHUNK);

          const ch = getChunk(S, cx, cy);

          for(let ty=ty0; ty<ty1; ty++){
            const ly = ty - chunkY;
            const row = ly * CHUNK;
            const wy = ty*TILE - camY;
            let wx = tx0*TILE - camX;

            for(let tx=tx0; tx<tx1; tx++){
              const lx = tx - chunkX;
              const i = row + lx;

              const g = ch.tiles[i];
              const b = ch.biomes[i];

              ctx.drawImage(SPR.tiles[g], wx, wy);

              const wash = (BIOMES[b] && BIOMES[b].wash) ? BIOMES[b].wash : 'rgba(0,0,0,0.08)';
              if (wash !== lastWash){
                ctx.fillStyle = wash;
                lastWash = wash;
              }
              ctx.fillRect(wx, wy, TILE, TILE);

              wx += TILE;
            }
          }
        }
      }

      // tilled soil background (iterate farms only; avoids scanning every visible tile)
      for(let cy=cy0; cy<=cy1; cy++){
        for(let cx=cx0; cx<=cx1; cx++){
          const ch = getChunk(S, cx, cy);
          if (!ch.farms || ch.farms.size===0) continue;

          const baseX = cx * CHUNK;
          const baseY = cy * CHUNK;

          for(const [lk, f] of ch.farms){
            if (!f || !f.tilled) continue;
            const comma = lk.indexOf(',');
            const lx = (comma>=0) ? (lk.slice(0, comma) | 0) : 0;
            const ly = (comma>=0) ? (lk.slice(comma+1) | 0) : 0;
            const tx = baseX + lx;
            const ty = baseY + ly;
            if (tx < left || tx >= right || ty < top || ty >= bottom) continue;

            const wx = tx*TILE - camX;
            const wy = ty*TILE - camY;

            ctx.globalAlpha = 0.85;
            ctx.fillStyle = 'rgba(138,106,58,.65)';
            ctx.fillRect(wx+2, wy+10, TILE-4, 4);
            ctx.fillStyle = 'rgba(107,79,42,.55)';
            ctx.fillRect(wx+2, wy+12, TILE-4, 2);

            // watered sparkle
            if (f.watered || S.time.raining){
              ctx.fillStyle = 'rgba(95,159,182,.45)';
              ctx.fillRect(wx+3, wy+11, 2, 1);
              ctx.fillRect(wx+11, wy+12, 1, 1);
            }
            ctx.globalAlpha = 1;
          }
        }
      }

      // cottage sprite
      // Tile-aligned to match isCottageTile() collision footprint (3x3 tiles at -1..1, -2..0).
      const cottagePx = (-1 * TILE) - camX;
      const cottagePy = (-2 * TILE) - camY;
      ctx.drawImage(SPR.cottage, Math.floor(cottagePx), Math.floor(cottagePy));

      // placed objects
      drawPlaced(S, camX,camY, left,top,right,bottom);

      // crops (iterate farms only)
      for(let cy=cy0; cy<=cy1; cy++){
        for(let cx=cx0; cx<=cx1; cx++){
          const ch = getChunk(S, cx, cy);
          if (!ch.farms || ch.farms.size===0) continue;

          const baseX = cx * CHUNK;
          const baseY = cy * CHUNK;

          for(const [lk, f] of ch.farms){
            if (!f || !f.tilled || !f.crop) continue;
            const comma = lk.indexOf(',');
            const lx = (comma>=0) ? (lk.slice(0, comma) | 0) : 0;
            const ly = (comma>=0) ? (lk.slice(comma+1) | 0) : 0;
            const tx = baseX + lx;
            const ty = baseY + ly;
            if (tx < left || tx >= right || ty < top || ty >= bottom) continue;

            const wx = tx*TILE - camX;
            const wy = ty*TILE - camY;

            const crop = f.crop;
            const stage = clamp(f.stage|0, 0, 3);
            const spr = SPR.crops[crop] ? SPR.crops[crop][stage] : null;
            if (spr){
              // Tiny crop sway for life (integer pixels to keep it crisp)
              const tt = performance.now()/1000;
              const sway = (stage > 0) ? Math.round(Math.sin(tt*1.2 + tx*0.6 + ty*0.35) * 1) : 0;
              ctx.drawImage(spr, wx + sway, wy);
            }
          }
        }
      }

      // entities (iterate ents only; stable tile-order via sort)
      _visEnts.length = 0;
      for(let cy=cy0; cy<=cy1; cy++){
        for(let cx=cx0; cx<=cx1; cx++){
          const ch = getChunk(S, cx, cy);
          if (!ch.ents || ch.ents.size===0) continue;

          const baseX = cx * CHUNK;
          const baseY = cy * CHUNK;

          for (const [lk, ent] of ch.ents){
            const comma = lk.indexOf(',');
            const lx = (comma>=0) ? (lk.slice(0, comma) | 0) : 0;
            const ly = (comma>=0) ? (lk.slice(comma+1) | 0) : 0;
            const tx = baseX + lx;
            const ty = baseY + ly;
            if (tx < left || tx >= right || ty < top || ty >= bottom) continue;
            if (isCottageTile(tx,ty)) continue;
            _visEnts.push({tx,ty,ent});
          }
        }
      }
      _visEnts.sort((a,b)=> (a.ty-b.ty) || (a.tx-b.tx));

      for (const E of _visEnts){
        const ent = E.ent;
        const wx = E.tx*TILE - camX;
        const wy = E.ty*TILE - camY;

        const spr = SPR.ents[ent.type];
        if (spr){
          ctx.drawImage(spr, wx, wy);
          // rare sparkle
          if (ent.type==='glowcap' || ent.type.startsWith('ore_') || ent.type==='ice'){
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(255,255,255,.7)';
            ctx.fillRect(wx+12, wy+3, 1,1);
            ctx.fillRect(wx+3, wy+6, 1,1);
            ctx.globalAlpha = 1;
          }
        }
      }

      // POIs (iterate chunks; avoids per-tile chunk lookups)
      for(let cy=cy0; cy<=cy1; cy++){
        for(let cx=cx0; cx<=cx1; cx++){
          const ch = getChunk(S, cx, cy);
          if (!ch.poi || ch.poi.used) continue;

          const tx = cx*CHUNK + ch.poi.lx;
          const ty = cy*CHUNK + ch.poi.ly;
          if (tx < left || tx >= right || ty < top || ty >= bottom) continue;

          const wx = tx*TILE - camX;
          const wy = ty*TILE - camY;
          const icon = poiIcon(ch.poi.type);

          ctx.globalAlpha = 0.95;
          ctx.fillStyle = 'rgba(255,255,255,.65)';
          ctx.fillRect(wx+2,wy+2,12,12);
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#2b2a26';
          ctx.font = '12px system-ui';
          ctx.fillText(icon, wx+4, wy+13);
        }
      }
    }

    function drawPlaced(S, camX,camY, left,top,right,bottom){
      // Draw placed objects by chunk (avoids scanning every visible tile and calling placedAt repeatedly)
      const cx0 = Math.floor(left / CHUNK);
      const cy0 = Math.floor(top / CHUNK);
      const cx1 = Math.floor((right - 1) / CHUNK);
      const cy1 = Math.floor((bottom - 1) / CHUNK);

      for(let cy=cy0; cy<=cy1; cy++){
        for(let cx=cx0; cx<=cx1; cx++){
          const d = S.deltas[key(cx,cy)];
          if (!d || !d.placed || d.placed.length===0) continue;

          for(const p of d.placed){
            if (p.tx < left || p.tx >= right || p.ty < top || p.ty >= bottom) continue;
            const wx = p.tx*TILE - camX;
            const wy = p.ty*TILE - camY;

            if (p.type === 'campfire'){
              // tiny flame pixels
              ctx.fillStyle = 'rgba(255,255,255,.55)';
              ctx.fillRect(wx+3, wy+11, 10, 3);
              ctx.fillStyle = '#6b4f2a';
              ctx.fillRect(wx+4, wy+12, 8, 2);
              ctx.fillStyle = '#c77a2b';
              ctx.fillRect(wx+7, wy+8, 2, 4);
              ctx.fillStyle = '#f1dc9b';
              ctx.fillRect(wx+8, wy+9, 1, 2);
            }
          }
        }
      }
    }

    function poiIcon(type){
      if (type==='picnic') return '🥪';
      if (type==='greenhouse') return '🏚️';
      if (type==='fairy') return '🧚';
      if (type==='well') return '🪣';
      if (type==='merchant') return '🛒';
      if (type==='shrine') return '⛩️';
      if (type==='archway') return '🪨';
      return '✨';
    }

    function drawPlayer(S, camX,camY){
      const P = S.player;
      const wx = Math.floor(P.x - camX);
      let wy = Math.floor(P.y - camY);
      // tiny cozy bob (purely visual)
      const moving = (Math.hypot(P.vx||0, P.vy||0) > 10);
      const t = performance.now()/1000;
      const cuteBob = moving ? Math.sin(t*10)*1 : Math.sin(t*2)*0.5;
      wy += cuteBob|0;
      const spr = SPR.fran[P.dir] || SPR.fran[0];
      ctx.drawImage(spr, wx, wy);
    }

    function drawLighting(S){
      // day/night overlay
      const nightAlpha = getNightAlpha(S);

      if (nightAlpha > 0.01){
        ctx.globalAlpha = nightAlpha;
        ctx.fillStyle = 'rgb(24, 30, 56)';
        ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.globalAlpha = 1;
      }

      // a tiny mist at dawn/dusk for softness
      const t = S.time.t01;
      const mist = clamp(1 - Math.abs(t-0.16)/0.10, 0, 1) * 0.06
                 + clamp(1 - Math.abs(t-0.86)/0.10, 0, 1) * 0.08;
      if (mist > 0.01){
        ctx.globalAlpha = mist;
        ctx.fillStyle = 'rgb(255, 245, 235)';
        ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.globalAlpha = 1;
      }

      // cloudy / rainy soft overlay
      const cloud = (S.time.cloudiness ?? 0);
      if (cloud > 0.02){
        ctx.globalAlpha = cloud * 0.07;
        ctx.fillStyle = 'rgb(95, 110, 125)';
        ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.globalAlpha = 1;
      }

      // rain overlay a touch deeper
      const rainI = (S.time.rainIntensity ?? 0);
      if (rainI > 0.05){
        ctx.globalAlpha = 0.06 + rainI*0.06;
        ctx.fillStyle = 'rgb(55, 75, 85)';
        ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.globalAlpha = 1;
      }

      return nightAlpha;
    }
