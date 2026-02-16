'use strict';

// -----------------------------
    // Biomes + ground types
    // -----------------------------
    const BIOMES = [
      { id:'forest', name:'Whispering Forest',  key:0, ground:'#6f9f6b', accent:'#517b4d', hint:'Mossy shade • Mushrooms • Soft birdsong' },
      { id:'meadow', name:'Golden Meadow',      key:1, ground:'#90b96a', accent:'#6d8f4f', hint:'Wildflowers • Bees • Warm breeze' },
      { id:'lake',   name:'Crystal Lake',       key:2, ground:'#7aa9b6', accent:'#5c8794', hint:'Reeds • Fishing • Gentle ripples' },
      { id:'stone',  name:'Stone Hollow',       key:3, ground:'#9aa0a4', accent:'#6f777b', hint:'Rocks • Ores • Quiet echoes' },
      { id:'bramble',name:'Brambleridge Grove', key:4, ground:'#6c9b7b', accent:'#4c7c5f', hint:'Thornbush • Berries • Hidden shrines' },
      { id:'moon',   name:'Moonmoss Glade',     key:5, ground:'#6c7aa8', accent:'#4f5c87', hint:'Glowcaps • Night blooms • Soft hum' },
      { id:'frost',  name:'Frostwood',          key:6, ground:'#c9d7e6', accent:'#97aac0', hint:'Snow hush • Ice crystals • Cozy fires' },
      { id:'honey',  name:'Honeyvale Orchard',  key:7, ground:'#b6a56a', accent:'#8f7f4f', hint:'Fruit trees • Beehives • Sweet air' },
    ];
    function hexToRgba(hex, a){
      if (!hex) return `rgba(0,0,0,${a})`;
      const s = String(hex).trim();
      if (s.startsWith('rgba') || s.startsWith('rgb')){
        const nums = s.match(/[\d.]+/g);
        if (!nums || nums.length < 3) return s;
        return `rgba(${nums[0]},${nums[1]},${nums[2]},${a})`;
      }
      let h = s.replace('#','');
      if (h.length === 3) h = h.split('').map(c=>c+c).join('');
      const n = parseInt(h, 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = (n) & 255;
      return `rgba(${r},${g},${b},${a})`;
    }

    // Precompute cozy biome wash colors (avoids per-tile globalAlpha toggles during render)
    for (const b of BIOMES){
      b.wash = hexToRgba(b.ground, 0.08);
    }


    const GROUND = {
      GRASS: 0,
      WATER: 1,
      STONE: 2,
      SNOW: 3,
      MOSS: 4,
      THORN: 5,
      ORCH: 6,
      SHORE: 7
    };

    function biomeAt(tx, ty, seed){
      // tx,ty in tile coords
      const d = Math.hypot(tx, ty) / 340; // distance rings
      const n = fbm(tx * 0.020, ty * 0.020, seed);
      const n2= fbm(tx * 0.045, ty * 0.045, seed+999);

      // Starter clearing: cozy meadow
      if (Math.hypot(tx, ty) <= WORLD_CLEARING_R) return 1; // meadow

      // Rare orchard pockets
      const orchardChance = (n > 0.82 && n2 > 0.65);

      if (d < 0.35){
        if (orchardChance && d > 0.18) return 7; // honeyvale
        if (n < 0.38) return 0; // forest
        if (n < 0.72) return 1; // meadow
        return 2;               // lake
      } else if (d < 0.58){
        if (orchardChance && d > 0.45) return 7;
        if (n < 0.26) return 1;
        if (n < 0.52) return 0;
        if (n < 0.72) return 3; // stone
        return 4;               // bramble
      } else if (d < 0.78){
        if (orchardChance) return 7;
        if (n < 0.30) return 4;
        if (n < 0.55) return 3;
        return 5; // moonmoss
      } else {
        if (orchardChance && n > 0.9) return 7;
        return 6; // frostwood
      }
    }

    function groundAt(tx, ty, biomeKey, seed){
      // per-tile water/shore variation
      const w = fbm(tx * 0.060, ty * 0.060, seed+4242);
      if (biomeKey === 2){ // lake
        if (w < 0.46) return GROUND.WATER;
        if (w < 0.52) return GROUND.SHORE;
        return GROUND.GRASS;
      }
      if (biomeKey === 3){ // stone hollow
        return (w < 0.12) ? GROUND.STONE : GROUND.STONE;
      }
      if (biomeKey === 6){ // frostwood
        return (w < 0.18) ? GROUND.STONE : GROUND.SNOW;
      }
      if (biomeKey === 5){ // moon
        return (w < 0.16) ? GROUND.MOSS : GROUND.MOSS;
      }
      if (biomeKey === 4){ // bramble
        return (w < 0.2) ? GROUND.THORN : GROUND.GRASS;
      }
      if (biomeKey === 7){ // orchard
        return (w < 0.18) ? GROUND.ORCH : GROUND.ORCH;
      }
      return GROUND.GRASS;
    }

    const SEASONS = ['Spring','Summer','Autumn','Winter'];
