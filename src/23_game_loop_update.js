'use strict';

// -----------------------------
    // Game loop update
    // -----------------------------
    let state = loadGame() || newGame();
    state.nav = null;

    // Gentle exploration XP: awarded for distance traveled (prevents per-frame XP spikes)
    let travelAcc = 0;

    // Cozy camera zoom (bigger, snugger visuals)
    let zoom = 3.0;
    let zoomTarget = 3.0;
    const ZOOM_MIN = 2.0;
    const ZOOM_MAX = 4.0;

    // Smooth follow camera (world pixels)
    let cam = { x: 0, y: 0 };
    let camLook = { x: 0, y: 0 }; // smoothed look-ahead direction

    // Cozy screen-space + world-space FX particles
    const fx = {
      leaves: [],
      rain: [],
      snow: [],
      fireflies: [],
      smoke: []
    };
    let fxTimers = { leaf:0, rain:0, snow:0, fly:0, smoke:0 };

    let last = performance.now();
    let autosaveT = 0;

    let hudAccum = 0;

    function update(dt){
      const S = state;
      const P = S.player;
      const stats = baseStats(P);

      // Pause movement if modal open
      const paused = anyModalOpen();

      // Ambient audio (rain) keeps running indoors/outdoors.
      // (Requires a user gesture to unlock in most browsers.)
      if (typeof AudioFX !== 'undefined' && AudioFX.update){
        AudioFX.update(S, dt);
      }


// Phase 2: scene fade transitions
if (S.transition && S.transition.active){
  S.transition.t += dt;
  const half = S.transition.dur / 2;
  if (!S.transition.swapped && S.transition.t >= half){
    S.transition.swapped = true;
    if (typeof S.transition.mid === 'function') S.transition.mid();
  }
  if (S.transition.t >= S.transition.dur){
    S.transition.active = false;
    if (typeof S.transition.end === 'function') S.transition.end();
  }
  // During transitions we freeze input/movement but still move camera/zoom
  updateCamera(S, dt);
  return;
}


      // Weather smoothing (clouds/rain fade in/out gently)
      if (typeof S.time.weather !== 'string'){
        // migration for older saves
        S.time.weather = S.time.raining ? 'rainy' : 'sunny';
      }
      const wType = S.time.weather;
      const targetCloud = (wType === 'sunny') ? 0.0 : (wType === 'cloudy') ? 0.55 : 0.85;
      const targetRain  = (wType === 'rainy') ? 1.0 : 0.0;
      const wLerp = 1 - Math.pow(0.001, dt * 1.2);
      S.time.cloudiness = (S.time.cloudiness ?? 0) + (targetCloud - (S.time.cloudiness ?? 0)) * wLerp;
      S.time.rainIntensity = (S.time.rainIntensity ?? 0) + (targetRain - (S.time.rainIntensity ?? 0)) * wLerp;
      S.time.raining = (wType === 'rainy');

      // time progression
      if (!paused){
        S.time.t01 += dt / DAY_LENGTH;
        if (S.time.t01 >= 1){
          // midnight: Fran dozes off
          toast('🌙 Fran got sleepy… a new day begins.');
          advanceDay(S, true);
        }
      }

      // survival meters
      if (!paused){
        // hunger slowly
        P.hunger -= dt * 0.18;
        if (P.hunger < 0){
          P.hunger = 0;
          P.health -= dt * 0.6;
        }
        // cold in frost biome (interior blocks cold)
        if (S.scene === 'interior'){
          // cozy indoors: cold drains away a bit faster
          P.cold -= dt * 18;
        } else {
          const b = tileBiomeKey(S, Math.floor(P.x/TILE), Math.floor(P.y/TILE));
          const nearFire = isNearWarmth(S);
          if (b === 6 && !nearFire){
            const warm = stats.warmth;
            const rate = 1.4 / (1 + warm*0.6);
            P.cold += dt * rate;
          } else {
            P.cold -= dt * 10;
          }
        }
        if (P.cold > 80){
          P.stamina -= dt * 2.0;
        }
        if (P.cold >= 100){
          P.health -= dt * 0.4;
        }
        if (P.health <= 0){
          // faint
          toast('😵 Fran fainted and woke up at home.');
          P.health = stats.maxHealth;
          P.x = 0; P.y = 4*TILE;
          advanceDay(S, true);
        }
      }

      tickBuffs(S, dt);

      // stamina regen
      if (!paused){
        const hungryPenalty = (P.hunger < 35) ? 0.45 : 1.0;
        const coldPenalty = (P.cold > 70) ? 0.6 : 1.0;
        const regen = stats.staminaRegen * hungryPenalty * coldPenalty;
        P.stamina = clamp(P.stamina + regen * dt, 0, stats.maxStamina);
      }

      // Movement
      if (!paused){
        const run = down('shift');
        const preX = P.x, preY = P.y;
        const moveCost = run ? 5.5 : 0;
        let spd = stats.moveSpeed * (run ? 1.35 : 1.0);

        // if very tired
        if (P.stamina < 8) spd *= 0.75;

        let mx = 0, my = 0;
        if (down('w') || down('arrowup')) my -= 1;
        if (down('s') || down('arrowdown')) my += 1;
        if (down('a') || down('arrowleft')) mx -= 1;
        if (down('d') || down('arrowright')) mx += 1;

        if (mx !== 0 || my !== 0){
          // Manual movement overrides click navigation.
          S.nav = null;

          const len = Math.hypot(mx,my) || 1;
          mx /= len; my /= len;

          // set facing
          if (Math.abs(mx) > Math.abs(my)) P.dir = (mx<0) ? 2 : 3;
          else P.dir = (my<0) ? 1 : 0;

          // stamina drain when running
          if (run && P.stamina > 0){
            P.stamina = Math.max(0, P.stamina - moveCost * dt);
          }

          moveWithCollisions(S, mx * spd * dt, my * spd * dt);
        } else if (S.nav && S.nav.kind === 'interact'){
          const goalTx = S.nav.approach.tx, goalTy = S.nav.approach.ty;
          const gx = goalTx * TILE;
          const gy = goalTy * TILE;
          let dx = gx - P.x;
          let dy = gy - P.y;
          const dist = Math.hypot(dx,dy);

          if (dist < 0.75){
            P.x = gx; P.y = gy;

            const pt2 = playerTile(S);
            const tgt = S.nav.target;
            if (Math.abs(pt2.tx - tgt.tx) + Math.abs(pt2.ty - tgt.ty) === 1){
              faceToward(P, pt2.tx, pt2.ty, tgt.tx, tgt.ty);
              interact(S, {tx:tgt.tx, ty:tgt.ty});
            }
            S.nav = null;
          } else {
            dx /= dist; dy /= dist;

            // set facing
            if (Math.abs(dx) > Math.abs(dy)) P.dir = (dx<0) ? 2 : 3;
            else P.dir = (dy<0) ? 1 : 0;

            // optional run-to-click (hold shift)
            if (run && P.stamina > 0){
              P.stamina = Math.max(0, P.stamina - moveCost * dt);
            }

            moveWithCollisions(S, dx * spd * dt, dy * spd * dt);

            const newDist = Math.hypot(gx - P.x, gy - P.y);
            if (newDist > (S.nav.lastDist - 0.2)) S.nav.stuck += dt;
            else S.nav.stuck = 0;
            S.nav.lastDist = newDist;

            if (S.nav.stuck > 0.9){
              toast("🚫 Can't reach that spot.");
              S.nav = null;
            }
          }
        }
        // velocity for camera smoothing
        const dd = Math.max(0.0001, dt);
        P.vx = (P.x - preX) / dd;
        P.vy = (P.y - preY) / dd;
      }

      // interactions
      if (pressE && !paused && !(S.transition && S.transition.active)){
        // Shift+E places campfire if available (quick shortcut)
        if (down('shift') && invCount(S,'campfire')>0){
          const t = targetTile(S);
          if (!isSolid(S,t.tx,t.ty)){
            invAdd(S,'campfire',-1);
            addPlaced(S,t.tx,t.ty,'campfire');
            awardXP(S,'crafting', 6);
            toast('🔥 Placed campfire.');
          } else {
            toast('🧺 No space to place.');
          }
        } else {
          interact(S);
        }
      }
      pressE = false;

      // sleep (Phase 2: sleep in bed, indoors)
      if (pressSpace && !paused){
        if (S.scene === 'interior'){
          const I = S.interior;
          const {tx,ty} = playerTile(S);
          if (Math.abs(tx-I.bed.tx)+Math.abs(ty-I.bed.ty) <= 2){
            if (!S.transition?.active) transitionSleep(S);
          } else {
            toast('🛏️ Get into bed to sleep.');
          }
        } else {
          toast('🏡 Sleep in your bed inside the cottage.');
        }
      }
      pressSpace = false;

      // discovery tick
      if (!paused){
        markDiscovery(S);
      }

      // autosave
      autosaveT += dt;
      if (autosaveT > 45){
        autosaveT = 0;
        saveGame(S);
      }

      // camera + cozy FX (always keeps the view snug and lively)
      updateCamera(S, dt);
      updateFX(S, dt);

      // Clamp vitals (gameplay logic; keep independent from HUD cadence)
      P.health  = clamp(P.health,  0, stats.maxHealth);
      P.stamina = clamp(P.stamina, 0, stats.maxStamina);
      P.hunger  = clamp(P.hunger,  0, 100);
      P.cold    = clamp(P.cold,    0, 100);

      // Hotbar highlight is cheap: keep it responsive
      renderHotbar(S);

      // HUD updates are DOM-heavy; update at a gentle cadence to avoid layout thrash
      hudAccum += dt;
      if (hudAccum >= 0.15){
        updateHUD(S);
        hudAccum = 0;
      }
    }

    function moveWithCollisions(S, dx,dy){
      const P = S.player;

      // axis move
      let nx = P.x + dx;
      let ny = P.y;

      if (!collides(S, nx, ny)){
        P.x = nx;
      } else {
        // slide attempt
        // no-op for x
      }

      nx = P.x;
      ny = P.y + dy;
      if (!collides(S, nx, ny)){
        P.y = ny;
      }

      // Gentle exploration XP for travel (distance-based, not per-frame)
      const dist = Math.hypot(dx,dy);
      if (dist > 0.001){
        travelAcc += dist;
        const step = 160; // pixels (~10 tiles)
        while (travelAcc >= step){
          travelAcc -= step;
          awardXP(S,'exploration', 1);
        }
      }
    }

    function collides(S, px,py){
      // player AABB about 12x12 inside tile
      const x0 = px + 2;
      const y0 = py + 4;
      const x1 = px + 14;
      const y1 = py + 15;

      const tx0 = Math.floor(x0 / TILE);
      const ty0 = Math.floor(y0 / TILE);
      const tx1 = Math.floor(x1 / TILE);
      const ty1 = Math.floor(y1 / TILE);

      for(let ty=ty0; ty<=ty1; ty++){
        for(let tx=tx0; tx<=tx1; tx++){
          if (isSolid(S, tx,ty)) return true;
        }
      }
      return false;
    }

    function isNearWarmth(S){
      // near cottage or campfire
      const P = S.player;
      const {tx,ty} = playerTile(S);

      // cottage warmth zone
      if (Math.hypot(tx,ty) < 12) return true;

      // campfire within 3 tiles
      for(let dy=-3; dy<=3; dy++){
        for(let dx=-3; dx<=3; dx++){
          const p = placedAt(S, tx+dx, ty+dy);
          if (p && p.type==='campfire') return true;
        }
      }
      return false;
    }
