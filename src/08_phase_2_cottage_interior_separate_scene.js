'use strict';

// -----------------------------
// Phase 2: Cottage Interior (separate scene)
// -----------------------------
function makeInterior(){
  // Fixed-size interior "level" (single-room for now)
  // Cozy cottage-core proportions: wide enough for furniture, short enough to feel snug.
  const w = 12, h = 8;
  // Put the door on the bottom wall, centered.
  const door = {tx: Math.floor(w/2), ty: h-1};
  // Spawn slightly inside (Option B): 2 tiles in to avoid accidental re-trigger loops.
  const spawn = {tx: door.tx, ty: door.ty-2};

  // Furniture layout (cottage-core: bed tucked to a side, workbench near a wall, chest nearby)
  const bed = {tx: 2, ty: 2};
  const workbench = {tx: 8, ty: 2};
  const chest = {tx: 9, ty: 3};

  // Decorative tiles (non-solid; purely visual)
  const rug = {x0: 4, y0: 3, w: 4, h: 2};
  const window = {tx: Math.floor(w/2), ty: 0};
  return {
    w,h, door, spawn, bed, chest, workbench, rug, window
  };
}

function interiorSolid(S, tx,ty){
  const I = S.interior;
  // bounds
  if (tx < 0 || ty < 0 || tx >= I.w || ty >= I.h) return true;
  // walls (1-tile border), but keep the door tile passable/interactable
  if (tx === 0 || ty === 0 || tx === I.w-1 || ty === I.h-1){
    if (tx === I.door.tx && ty === I.door.ty) return false;
    return true;
  }
  // furniture collision
  if ((tx===I.bed.tx && ty===I.bed.ty) || (tx===I.chest.tx && ty===I.chest.ty) || (tx===I.workbench.tx && ty===I.workbench.ty)) return true;
  // doorway tile is interactable but not solid
  return false;
}

function startTransition(S, opts){
  if (!S.transition) S.transition = {};
  if (S.transition.active) return;
  S.nav = null;
  S.transition = {
    active: true,
    t: 0,
    dur: opts.dur ?? 0.6,
    swapped: false,
    mid: opts.mid || null,
    end: opts.end || null
  };
}

function transitionIntoCottage(S){
  startTransition(S, {
    dur: 0.6,
    mid: () => {
      // remember outside return position
      S.home = S.home || { chest:{} };
      const d = cottageDoorTile();
      S.home.return = { x: S.player.x, y: S.player.y, dir: S.player.dir, doorTx:d.tx, doorTy:d.ty };
      S.scene = 'interior';
      // spawn inside
      const I = S.interior;
      S.player.x = I.spawn.tx * TILE;
      S.player.y = I.spawn.ty * TILE;
      S.player.dir = 1; // face up
      // nudge camera instantly so transition feels clean
      cam.x = S.player.x - (CANVAS_W/zoom)/2 + TILE/2;
      cam.y = S.player.y - (CANVAS_H/zoom)/2 + TILE/2 - TILE*2;
    }
  });
}

function transitionOutOfCottage(S){
  startTransition(S, {
    dur: 0.6,
    mid: () => {
      const d = cottageDoorTile();
      S.scene = 'overworld';
      // exit position: 1 tile below door (Option B)
      S.player.x = d.tx * TILE;
      S.player.y = (d.ty + 1) * TILE;
      S.player.dir = 0; // face down
      cam.x = S.player.x - (CANVAS_W/zoom)/2 + TILE/2;
      cam.y = S.player.y - (CANVAS_H/zoom)/2 + TILE/2 - TILE*2;
    }
  });
}

function transitionSleep(S){
  startTransition(S, {
    dur: 0.8,
    mid: () => {
      toast('🛏️ Fran rests. A new day begins.');
      awardXP(S,'exploration', 5);
      advanceDay(S);
    }
  });
}

function generateChunk(cx,cy, S){
      const tiles = new Uint8Array(CHUNK*CHUNK);
      const biomes = new Uint8Array(CHUNK*CHUNK);
      const ents = new Map();
      const poi = null;

      for(let ly=0; ly<CHUNK; ly++){
        for(let lx=0; lx<CHUNK; lx++){
          const tx = cx*CHUNK + lx;
          const ty = cy*CHUNK + ly;

          let b = biomeAt(tx,ty, S.seed);
          let g = groundAt(tx,ty,b,S.seed);

          // Cottage area overrides
          if (isCottageTile(tx,ty)){
            b = 1;
            g = GROUND.GRASS;
          }

          tiles[idx(lx,ly)] = g;
          biomes[idx(lx,ly)] = b;

          // Resource entities (skip water, cottage, clearing center)
          if (g === GROUND.WATER) continue;
          if (isCottageTile(tx,ty)) continue;

          // Starter clearing: fewer obstacles
          const dist0 = Math.hypot(tx,ty);
          const clear = dist0 <= WORLD_CLEARING_R;

          const r = rand2(tx,ty,S.seed+1337);
          const r2= rand2(tx,ty,S.seed+7331);

          const place = (type, hp, solid=true, extra=null) => {
            ents.set(lx+','+ly, { type, hp, solid, ...extra });
          };

          // Place POIs rarely (handled later)
          // Place resources
          if (clear){
            // cozy clearing: more flowers, fewer blockers
            if (r < 0.09) place('flower', 1, false);
            else if (r < 0.11) place('bush', 1, true);
            else if (r < 0.13) place('mushroom', 1, false);
            continue;
          }

          switch(b){
            case 0: // forest
              if (r < 0.10) place('tree', 3, true);
              else if (r < 0.18) place('mushroom', 1, false);
              else if (r < 0.28) place('flower', 1, false);
              else if (r < 0.33) place('bush', 1, true);
              break;
            case 1: // meadow
              if (r < 0.06) place('tree', 3, true);
              else if (r < 0.22) place('flower', 1, false);
              else if (r < 0.26) place('bush', 1, true);
              break;
            case 2: // lake
              if (g === GROUND.SHORE && r < 0.10) place('bush', 1, true);
              if (g !== GROUND.WATER && r > 0.88) place('flower', 1, false);
              break;
            case 3: // stone
              if (r < 0.12) place('rock', 3, true);
              else if (r < 0.145) place(r2 < 0.55 ? 'ore_copper' : 'ore_iron', 4, true);
              break;
            case 4: // bramble
              if (r < 0.13) place('berry_bush', 1, true);
              else if (r < 0.19) place('bush', 1, true);
              else if (r < 0.28) place('flower', 1, false);
              else if (r < 0.31) place('mushroom', 1, false);
              break;
            case 5: // moonmoss
              if (r < 0.10) place('glowcap', 1, false);
              else if (r < 0.16) place('mushroom', 1, false);
              else if (r < 0.21) place('bush', 1, true);
              break;
            case 6: // frost
              if (r < 0.075) place('pine', 3, true);
              else if (r < 0.12) place('ice', 2, false);
              else if (r < 0.16) place('rock', 3, true);
              break;
            case 7: // orchard
              if (r < 0.08) place('tree', 3, true);
              else if (r < 0.12) place('beehive', 2, true);
              else if (r < 0.22) place('flower', 1, false);
              break;
          }
        }
      }

      // POI generation per chunk
      const distChunks = Math.hypot(cx,cy);
      let poiObj = null;
      const pr = rand2(cx,cy,S.seed+9090);
      if (distChunks > 2 && pr < 0.06){
        const types = ['picnic','greenhouse','fairy','well','merchant','shrine','archway'];
        const t = types[Math.floor(rand2(cx,cy,S.seed+2222) * types.length)];
        // pick a tile location for the POI
        const px0 = Math.floor(rand2(cx,cy,S.seed+3333) * (CHUNK-6)) + 3;
        const py0 = Math.floor(rand2(cx,cy,S.seed+4444) * (CHUNK-6)) + 3;

        // ensure not water-ish
        const groundHere = tiles[idx(px0,py0)];
        if (groundHere !== GROUND.WATER){
          poiObj = { type:t, lx:px0, ly:py0, used:false };
          // POIs are not stored in ents (they may overlap visuals). We'll draw separately.
        }
      }

      return { cx,cy, tiles, biomes, ents, farms: new Map(), poi: poiObj };
    }
