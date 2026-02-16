'use strict';

// -----------------------------
    // Buffs / derived stats
    // -----------------------------
    function baseStats(P){
      const maxHealth = 10 + P.alloc.maxHealth;
      const maxStamina = 100 + P.alloc.maxStamina*5;
      const moveSpeed = 52 + P.alloc.moveSpeed*2 + (P.perks.trailblazer ? 3 : 0);
      const toolEff = 1.0 + P.alloc.toolEff*0.06 + (P.playerToolBonus || 0);
      const harvestYield = 0.0 + P.alloc.harvestYield*0.02 + (P.perks.berryKeen ? 0.03 : 0);
      const luck = 0.0 + P.alloc.luck*0.4 + (P.perks.trailblazer ? 0.2 : 0);
      const warmth = 0.0 + P.alloc.warmth*0.6;
      const charm = 0.0 + P.alloc.charm*0.4;
      let staminaRegen = 7.5;

      // equipment
      if (P.equip.head === 'flower_crown') {
        // small luck boost
      }

      // buffs modify
      let mods = { maxHealth:0, maxStamina:0, moveSpeed:0, toolEff:0, harvestYield:0, luck:0, warmth:0, charm:0, staminaRegen:0 };
      for(const b of P.buffs){
        for(const [k,v] of Object.entries(b.mods || {})){
          mods[k] = (mods[k] || 0) + v;
        }
      }
      // Equip mods
      const head = P.equip.head ? ITEMS[P.equip.head] : null;
      if (head && head.equip && head.equip.mods){
        for(const [k,v] of Object.entries(head.equip.mods)){
          mods[k] = (mods[k] || 0) + v;
        }
      }

      return {
        maxHealth: maxHealth + (mods.maxHealth||0),
        maxStamina: maxStamina + (mods.maxStamina||0),
        moveSpeed: moveSpeed + (mods.moveSpeed||0),
        toolEff: toolEff + (mods.toolEff||0),
        harvestYield: harvestYield + (mods.harvestYield||0),
        luck: luck + (mods.luck||0),
        warmth: warmth + (mods.warmth||0),
        charm: charm + (mods.charm||0),
        staminaRegen: staminaRegen + (mods.staminaRegen||0)
      };
    }

    function tickBuffs(S, dt){
      const P = S.player;
      if (!P.buffs.length) return;
      for(let i=P.buffs.length-1; i>=0; i--){
        P.buffs[i].duration -= dt;
        if (P.buffs[i].duration <= 0){
          toast(`⏳ ${P.buffs[i].name} faded.`);
          P.buffs.splice(i,1);
        }
      }
    }

    function addBuff(S, buff){
      const P = S.player;
      // refresh if exists
      const i = P.buffs.findIndex(b => b.id === buff.id);
      const dur = P.perks.heartyMeals ? Math.floor(buff.duration * 1.5) : buff.duration;
      if (i >= 0){
        P.buffs[i].duration = dur;
      } else {
        P.buffs.push({ ...buff, duration: dur });
      }
      toast(`✨ Buff: ${buff.name}`);
    }
