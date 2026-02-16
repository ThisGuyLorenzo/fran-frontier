'use strict';

// -----------------------------
    // Time, weather, day advance
    // -----------------------------
    function rollWeather(S){
      // Starts sunny (day 1), then gently varies by season into sunny / cloudy / rainy.
      const firstDay = (S.time.day === 1 && S.time.season === 0);
      let weather = 'sunny';
      if (!firstDay){
        const d = S.time.day + S.time.season*99;
        const r = rand2(d, 777, S.seed+555);

        // season bias: spring a bit wetter, winter a bit calmer (snow visuals handled elsewhere)
        const rainyP  = (S.time.season === 0) ? 0.20 : (S.time.season === 1) ? 0.26 : (S.time.season === 2) ? 0.18 : 0.12;
        const cloudyP = (S.time.season === 2) ? 0.44 : 0.36;

        if (r < rainyP) weather = 'rainy';
        else if (r < rainyP + cloudyP) weather = 'cloudy';
        else weather = 'sunny';
      }

      S.time.weather = weather;
      if (typeof S.time.cloudiness !== 'number') S.time.cloudiness = 0;
      if (typeof S.time.rainIntensity !== 'number') S.time.rainIntensity = 0;

      S.time.weatherText =
        (weather === 'sunny')  ? 'Sunny skies' :
        (weather === 'cloudy') ? 'Cloudy & calm' :
                                 'Rainy day • Crops auto-water';

      // backwards-compatible flag (used by some effects)
      S.time.raining = (weather === 'rainy');
    }

    function advanceDay(S, forced=false){
      const P = S.player;
      S.time.day += 1;
      if (S.time.day > 7){
        S.time.day = 1;
        S.time.season = (S.time.season + 1) % 4;
        toast(`📅 New season: ${SEASONS[S.time.season]}!`);
      }
      S.time.t01 = 0.05;
      rollWeather(S);

      // Restore gently
      P.stamina = baseStats(P).maxStamina;
      P.health = Math.min(baseStats(P).maxHealth, P.health + 2);
      P.hunger = Math.max(40, P.hunger - 18);
      P.cold = Math.max(0, P.cold - 30);

      // Grow crops in all cached chunks + deltas
      growCropsEverywhere(S);

      // Autosave occasionally
      if (!forced) saveGame(S);
    }

    function growCropsEverywhere(S){
      // iterate deltas farms (not all chunks)
      for(const [k, d] of Object.entries(S.deltas)){
        if (!d.farms) continue;
        for(const [lk, f] of Object.entries(d.farms)){
          if (!f || !f.tilled || !f.crop) continue;
          const crop = CROPS[f.crop];
          if (!crop) continue;

          // if wrong season, pause growth (gentle)
          if (!crop.seasons.includes(S.time.season)){
            // keeps plant but doesn't grow
            d.farms[lk] = { ...f, watered:false };
            continue;
          }

          const watered = f.watered || S.time.raining;
          const growthBoost = S.player.perks.greenThumb ? 0.25 : 0.0;
          let prog = f.prog || 0;
          let stage = f.stage || 0;

          if (watered){
            prog += 1.0 + growthBoost;
            // advance stages based on daysPerStage (allows fractional boosts)
            while (prog >= crop.daysPerStage){
              prog -= crop.daysPerStage;
              stage += 1;
            }
          }
          stage = Math.min(stage, crop.stages-1);
          const ready = (stage >= crop.stages-1);
          d.farms[lk] = { ...f, watered:false, prog, stage: Math.min(stage, crop.stages-1), ready };
        }
        // keep cache updated if chunk exists
        if (S.world.has(k)){
          const ch = S.world.get(k);
          for(const [lk, f] of Object.entries(d.farms)){
            ch.farms.set(lk, f);
          }
        }
      }
    }
