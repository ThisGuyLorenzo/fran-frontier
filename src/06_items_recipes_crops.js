'use strict';

// -----------------------------
    // Items, recipes, crops
    // -----------------------------
    const ITEMS = {
      wood: { name:'Wood', icon:'🪵', desc:'Warm, sturdy, smells like sunshine and sap.' },
      stone:{ name:'Stone', icon:'🪨', desc:'Good for crafting sturdy things.' },
      fiber:{ name:'Fiber', icon:'🧵', desc:'Soft plant fiber—useful for cozy crafts.' },
      flower:{ name:'Wildflowers', icon:'🌸', desc:'Soft-petal blooms for decor and wearable crafts.' },
      herb: { name:'Herbs', icon:'🌿', desc:'Wild herbs for tea and gentle remedies.' },
      berry:{ name:'Berries', icon:'🫐', desc:'Sweet for snacks, jams, and treats.' },
      mushroom:{ name:'Mushroom', icon:'🍄', desc:'A little forest gift. Some glow at night.' },
      glowcap:{ name:'Glowcap', icon:'✨', desc:'Moonmoss glade mushroom—faintly luminous.' },
      copper: { name:'Copper Ore', icon:'🟠', desc:'A soft metal for early upgrades.' },
      iron:   { name:'Iron Ore', icon:'⚪', desc:'Sturdy metal for stronger tools.' },
      ice:    { name:'Ice Crystal', icon:'🧊', desc:'Cold and clear. Better near a fire.' },
      honey:  { name:'Honeycomb', icon:'🍯', desc:'Golden sweetness from Honeyvale.' },
      water:  { name:'Water', icon:'💧', desc:'For watering and tea. Refill at wells.' },

      // Crops + foods
      turnip: { name:'Turnip', icon:'🥕', desc:'A humble crop. Great for soups.' , food: {hunger:+18, stamina:+6} },
      blueberry:{ name:'Blueberries', icon:'🫐', desc:'Summer sweetness.', food:{hunger:+12, stamina:+4} },
      pumpkin:{ name:'Pumpkin', icon:'🎃', desc:'Autumn comfort food.', food:{hunger:+22, stamina:+8} },
      snowroot:{ name:'Snowroot', icon:'🥔', desc:'A winter root with crisp bite.', food:{hunger:+16, stamina:+8} },

      tea: { name:'Herbal Tea', icon:'🍵', desc:'A cozy sip that calms the body.', food:{hunger:+6, stamina:+20}, buff:{ id:'tea', name:'Tea Warmth', duration: 180, mods:{ staminaRegen:+0.6 } } },
      jam: { name:'Berry Jam', icon:'🍯', desc:'A sweet boost for careful harvests.', food:{hunger:+10, stamina:+6}, buff:{ id:'jam', name:'Jam Focus', duration: 180, mods:{ harvestYield:+0.12 } } },
      sandwich: { name:'Picnic Sandwich', icon:'🥪', desc:'Found at a picnic spot. Instant comfort.', food:{hunger:+28, stamina:+10} },

      // Seeds
      turnip_seed:{ name:'Turnip Seeds', icon:'🌱', desc:'Plant in Spring.', seedOf:'turnip' },
      blueberry_seed:{ name:'Blueberry Seeds', icon:'🌿', desc:'Plant in Summer.', seedOf:'blueberry' },
      pumpkin_seed:{ name:'Pumpkin Seeds', icon:'🌰', desc:'Plant in Autumn.', seedOf:'pumpkin' },
      snowroot_seed:{ name:'Snowroot Seeds', icon:'❄️', desc:'Plant in Winter.', seedOf:'snowroot' },

      // Wearables
      flower_crown:{ name:'Flower Crown', icon:'🌸', desc:'A little luck woven into petals.', equip:{ slot:'head', mods:{ luck:+1 } } },

      // Placeables
      campfire:{ name:'Campfire', icon:'🔥', desc:'A warm little circle of comfort.', placeable:true }
    };

    const CROPS = {
      turnip:    { name:'Turnip', seasons:[0], stages:4, daysPerStage:1, harvest:'turnip', seed:'turnip_seed', xp: {gardening: 10}, sell: 6 },
      blueberry: { name:'Blueberry', seasons:[1], stages:4, daysPerStage:1, harvest:'blueberry', seed:'blueberry_seed', xp:{gardening: 12}, sell: 8 },
      pumpkin:   { name:'Pumpkin', seasons:[2], stages:4, daysPerStage:2, harvest:'pumpkin', seed:'pumpkin_seed', xp:{gardening: 14}, sell: 12 },
      snowroot:  { name:'Snowroot', seasons:[3], stages:4, daysPerStage:1, harvest:'snowroot', seed:'snowroot_seed', xp:{gardening: 12}, sell: 9 },
    };

    const RECIPES = [
      { id:'tea', name:'Brew Herbal Tea', icon:'🍵', kind:'cook',
        req:{ herb:2, water:1 }, out:{ tea:1 },
        xp:{ cooking: 14 }, note:'Stamina regen buff. Cottage-core classic.' },

      { id:'jam', name:'Make Berry Jam', icon:'🍯', kind:'cook',
        req:{ berry:3 }, out:{ jam:1 },
        xp:{ cooking: 14 }, note:'Harvest yield buff for gentle min-maxing.' },

      { id:'flower_crown', name:'Weave Flower Crown', icon:'🌸', kind:'craft',
        req:{ flower:5 }, out:{ flower_crown:1 },
        xp:{ crafting: 12 }, note:'Equip for a small luck boost.' },

      { id:'campfire', name:'Build Campfire', icon:'🔥', kind:'craft',
        req:{ wood:10, stone:5 }, out:{ campfire:1 },
        xp:{ crafting: 16 }, note:'Place it down for warmth and cozy vibes.' },


      { id:'tool_hatchet', name:'Craft Hatchet', icon:'🪓', kind:'craft',
        req:{ wood:5, stone:2 }, out:{}, xp:{ crafting: 14 },
        note:'Unlocks chopping trees for wood.',
        available:(S)=> !S.player.tools?.hasAxe,
        lockText:'Owned',
        apply:(S)=>{ S.player.tools.hasAxe = true; toast('🪓 Hatchet crafted!'); } },

      { id:'tool_pickaxe', name:'Craft Pickaxe', icon:'⛏️', kind:'craft',
        req:{ wood:5, stone:4 }, out:{}, xp:{ crafting: 14 },
        note:'Unlocks mining rocks for stone & ore.',
        available:(S)=> !S.player.tools?.hasPick,
        lockText:'Owned',
        apply:(S)=>{ S.player.tools.hasPick = true; toast('⛏️ Pickaxe crafted!'); } },

      { id:'tool_hoe', name:'Craft Hoe', icon:'🪴', kind:'craft',
        req:{ wood:4, fiber:2 }, out:{}, xp:{ crafting: 12 },
        note:'Unlocks tilling soil and planting seeds.',
        available:(S)=> !S.player.tools?.hasHoe,
        lockText:'Owned',
        apply:(S)=>{ S.player.tools.hasHoe = true; toast('🪴 Hoe crafted!'); } },

      { id:'tool_watering', name:'Craft Watering Can', icon:'💧', kind:'craft',
        req:{ wood:4, fiber:2 }, out:{}, xp:{ crafting: 12 },
        note:'Unlocks watering crops and refilling from water.',
        available:(S)=> !S.player.tools?.hasWater,
        lockText:'Owned',
        apply:(S)=>{ S.player.tools.hasWater = true; toast('💧 Watering Can crafted!'); } },

      { id:'copper_pick', name:'Upgrade Pickaxe (Copper)', icon:'⛏️', kind:'craft',
        req:{ copper:6, wood:4 }, out:{}, xp:{ crafting: 18 }, note:'Improves mining efficiency.',
        available:(S)=> !!S.player.tools?.hasPick,
        lockText:'Need Pickaxe',
        apply:(S)=>{ S.player.tools.pickTier = Math.max(S.player.tools.pickTier, 1); toast('⛏️ Pickaxe upgraded to Copper!'); } },

      { id:'copper_hatchet', name:'Upgrade Hatchet (Copper)', icon:'🪓', kind:'craft',
        req:{ copper:5, wood:4 }, out:{}, xp:{ crafting: 18 }, note:'Improves chopping efficiency.',
        available:(S)=> !!S.player.tools?.hasAxe,
        lockText:'Need Hatchet',
        apply:(S)=>{ S.player.tools.axeTier = Math.max(S.player.tools.axeTier, 1); toast('🪓 Hatchet upgraded to Copper!'); } },
    ];
