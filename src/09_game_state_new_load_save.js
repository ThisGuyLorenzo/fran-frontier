'use strict';

// -----------------------------
    // Game state (new/load/save)
    // -----------------------------
    const SAVE_KEY = 'fernwood_save_v1';


    const BACKUP_KEY = SAVE_KEY + '_backups';

    function pushBackupRaw(raw){
      try{
        if (!raw) return;
        const arr = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
        arr.unshift({ t: Date.now(), raw });
        // Deduplicate identical saves and cap size
        const seen = new Set();
        const out = [];
        for (const it of arr){
          if (seen.has(it.raw)) continue;
          seen.add(it.raw);
          out.push(it);
          if (out.length >= 8) break;
        }
        localStorage.setItem(BACKUP_KEY, JSON.stringify(out));
      }catch(e){ /* ignore */ }
    }

    function loadBackups(){
      try{ return JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]'); }
      catch(e){ return []; }
    }


    function newGame(seedOverride=null){
      const seed = seedOverride ?? nowSeed();
      const S = {
        ver: 1,
        seed,
        scene: 'overworld',
        interior: makeInterior(),
        home: { chest: {}, return: null },
        transition: { active:false, t:0, dur:0.6, swapped:false, mid:null, end:null },
        time: {
          day: 1,
          season: 0,
          t01: 0.05,      // morning fraction (0..1)
          weather: 'sunny',
          cloudiness: 0,
          rainIntensity: 0,
          weatherText: 'Sunny skies'
        },
        visitedChunks: new Set(),
        discoveredBiomes: new Set([1]), // meadow from clearing
        knownArchways: [], // {tx,ty}
        deltas: {}, // chunkKey -> { removed:[keys], farms:{ "lx,ly": farmObj }, poiUsed:boolean, placed:[{tx,ty,type}] }
        world: new Map(), // chunk cache
        player: {
          name: 'Fran',
          x: 0 * TILE, // pixels
          y: 4 * TILE,
          dir: 0, // 0 down,1 up,2 left,3 right
          tool: 1, // hotbar selection 1..5
          health: 10,
          stamina: 100,
          hunger: 100,
          cold: 0,
          coins: 0,
          activeSeed: 'turnip_seed',
          equip: { head: null },
          tools: { hasWater:false, hasHoe:false, hasAxe:false, hasPick:false, pickTier: 0, axeTier: 0 },
          levels: { overall: 1, xp: 0, statPoints: 0 },
          skills: {
            gardening:{ level:1, xp:0 },
            foraging:{ level:1, xp:0 },
            mining:{ level:1, xp:0 },
            crafting:{ level:1, xp:0 },
            cooking:{ level:1, xp:0 },
            exploration:{ level:1, xp:0 },
          },
          alloc: { // stat point allocations
            maxHealth:0,
            maxStamina:0,
            moveSpeed:0,
            toolEff:0,
            harvestYield:0,
            luck:0,
            warmth:0,
            charm:0
          },
          perks: { greenThumb:false, berryKeen:false, softStrike:false, trailblazer:false, heartyMeals:false },
          buffs: [] // {id,name, duration, mods}
        },
        inv: {
          wood: 12,
          stone: 6,
          herb: 2,
          water: 3,
          turnip_seed: 10,
          flower: 2,
        }
      };
      // First day's weather
      rollWeather(S);
      // Start chunk discovery
      markDiscovery(S);
      return S;
    }

    function safeLocalStorage(){
      try{
        const k='__test__';
        localStorage.setItem(k,'1');
        localStorage.removeItem(k);
        return true;
      }catch(e){ return false; }
    }

    function saveGame(S){
      const payload = {
        ver: S.ver,
        seed: S.seed,
        time: S.time,
        visitedChunks: Array.from(S.visitedChunks),
        discoveredBiomes: Array.from(S.discoveredBiomes),
        knownArchways: S.knownArchways,
        deltas: S.deltas,
        player: S.player,
        inv: S.inv,
        scene: S.scene,
        home: S.home
      };
      try{
        if (safeLocalStorage()){
          const prev = localStorage.getItem(SAVE_KEY);
          if (prev) pushBackupRaw(prev);
          localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
          toast('💾 Saved to this browser.');
        } else {
          toast('⚠️ localStorage not available. Use Export Save instead.');
        }
      }catch(e){
        console.warn(e);
        toast('⚠️ Save failed (storage). Use Export Save instead.');
      }
    }

    function loadGame(){
      try{
        if (!safeLocalStorage()) return null;
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw);
        if (!p || p.ver !== 1) return null;
        const S = newGame(p.seed);
        // restore
        S.seed = p.seed;
        S.time = p.time;
        // Normalize older saves (weather fields)
        if (!S.time.weather){
          S.time.weather = S.time.raining ? 'rainy' : 'sunny';
        }
        if (typeof S.time.cloudiness !== 'number') S.time.cloudiness = (S.time.weather==='cloudy') ? 0.55 : (S.time.weather==='rainy') ? 0.85 : 0;
        if (typeof S.time.rainIntensity !== 'number') S.time.rainIntensity = (S.time.weather==='rainy') ? 1.0 : 0.0;
        S.time.raining = (S.time.weather==='rainy');
        S.visitedChunks = new Set(p.visitedChunks || []);
        S.discoveredBiomes = new Set(p.discoveredBiomes || []);
        S.knownArchways = p.knownArchways || [];
        S.deltas = p.deltas || {};
        S.player = p.player;
        S.scene = p.scene || 'overworld';
        S.home = p.home || { chest: {}, return: null };
        if (!S.home.chest) S.home.chest = {};
        // Ensure interior data exists
        S.interior = S.interior || makeInterior();
        S.transition = { active:false, t:0, dur:0.6, swapped:false, mid:null, end:null };

        // Tool unlock migration:
        // Older saves assumed tools were always available, so default to "owned" if flags are missing.
        if (!S.player.tools) S.player.tools = { hasWater:true, hasHoe:true, hasAxe:true, hasPick:true, pickTier:0, axeTier:0 };
        if (typeof S.player.tools.hasWater !== 'boolean') S.player.tools.hasWater = true;
        if (typeof S.player.tools.hasHoe   !== 'boolean') S.player.tools.hasHoe   = true;
        if (typeof S.player.tools.hasAxe   !== 'boolean') S.player.tools.hasAxe   = true;
        if (typeof S.player.tools.hasPick  !== 'boolean') S.player.tools.hasPick  = true;
        if (typeof S.player.tools.pickTier !== 'number')  S.player.tools.pickTier = 0;
        if (typeof S.player.tools.axeTier  !== 'number')  S.player.tools.axeTier  = 0;
        if (!toolUnlocked(S.player, S.player.tool)) S.player.tool = 1;

        S.inv = p.inv;
        toast('🌿 Welcome back, Fran.');
        return S;
      }catch(e){
        console.warn(e);
        return null;
      }
    }

    function exportSave(S){
      const payload = {
        ver: S.ver,
        seed: S.seed,
        time: S.time,
        visitedChunks: Array.from(S.visitedChunks),
        discoveredBiomes: Array.from(S.discoveredBiomes),
        knownArchways: S.knownArchways,
        deltas: S.deltas,
        player: S.player,
        inv: S.inv
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'fernwood_save.json';
      a.click();
      URL.revokeObjectURL(a.href);
      toast('📦 Save exported.');
    }

    function importSave(file, onDone){
      const reader = new FileReader();
      reader.onload = () => {
        try{
          const p = JSON.parse(String(reader.result));
          if (!p || p.ver !== 1) throw new Error('Bad save format');
          const S = newGame(p.seed);
          S.seed = p.seed;
          S.time = p.time;
        // Normalize older saves (weather fields)
        if (!S.time.weather){
          S.time.weather = S.time.raining ? 'rainy' : 'sunny';
        }
        if (typeof S.time.cloudiness !== 'number') S.time.cloudiness = (S.time.weather==='cloudy') ? 0.55 : (S.time.weather==='rainy') ? 0.85 : 0;
        if (typeof S.time.rainIntensity !== 'number') S.time.rainIntensity = (S.time.weather==='rainy') ? 1.0 : 0.0;
        S.time.raining = (S.time.weather==='rainy');
          S.visitedChunks = new Set(p.visitedChunks || []);
          S.discoveredBiomes = new Set(p.discoveredBiomes || []);
          S.knownArchways = p.knownArchways || [];
          S.deltas = p.deltas || {};
          S.player = p.player;
          S.inv = p.inv;
          toast('📥 Save imported.');
          onDone(S);
        }catch(e){
          console.warn(e);
          toast('⚠️ Could not import save.');
        }
      };
      reader.readAsText(file);
    }
