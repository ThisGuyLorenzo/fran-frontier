'use strict';

// -----------------------------
    // XP / leveling
    // -----------------------------
    function needOverall(level){
      return Math.floor(100 + level*70 + level*level*10);
    }
    function needSkill(level){
      return Math.floor(35 + level*30 + level*level*3);
    }

    function awardXP(S, skillId, amt){
      const P = S.player;
      const sk = P.skills[skillId];
      if (!sk) return;

      // Overall XP always grows too (scaled)
      P.levels.xp += Math.floor(amt * 0.85);

      // skill XP
      sk.xp += amt;

      // level up skill
      while(sk.level < 20){
        const need = needSkill(sk.level);
        if (sk.xp < need) break;
        sk.xp -= need;
        sk.level += 1;
        toast(`📘 ${capitalize(skillId)} Lv ${sk.level}!`);

        // perk unlock at level 5
        if (sk.level === 5){
          if (skillId === 'gardening') P.perks.greenThumb = true;
          if (skillId === 'foraging') P.perks.berryKeen = true;
          if (skillId === 'mining') P.perks.softStrike = true;
          if (skillId === 'exploration') P.perks.trailblazer = true;
          if (skillId === 'cooking') P.perks.heartyMeals = true;
          if (skillId === 'crafting') { /* could add perk later */ }
          toast('🌿 New perk unlocked!');
        }
      }

      // level up overall
      while(P.levels.overall < 50){
        const need = needOverall(P.levels.overall);
        if (P.levels.xp < need) break;
        P.levels.xp -= need;
        P.levels.overall += 1;
        P.levels.statPoints += 1;
        // a gentle stamina bump every few levels
        if (P.levels.overall % 3 === 0) P.alloc.maxStamina += 2;
        toast(`✨ Overall Level ${P.levels.overall}! +1 Stat Point`);
      }
    }

    function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }
