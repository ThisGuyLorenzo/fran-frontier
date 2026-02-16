'use strict';

// -----------------------------
    // UI Rendering
    // -----------------------------
    function hearts(n, max){
      const full = Math.round(clamp(n,0,max));
      const out=[];
      for(let i=0;i<max;i++){
        out.push(i<full ? '❤️' : '🤍');
      }
      return out.join('');
    }

    function updateHUD(S){
      const P = S.player;
      const stats = baseStats(P);

      // Clamp vitals to max
      P.health = clamp(P.health, 0, stats.maxHealth);
      P.stamina = clamp(P.stamina, 0, stats.maxStamina);
      P.hunger = clamp(P.hunger, 0, 100);
      P.cold = clamp(P.cold, 0, 100);

      // Status chips
      statusRow.innerHTML = `
        <div class="statChip"><span class="icon">❤️</span><span><b>${Math.round(P.health)}</b>/${Math.round(stats.maxHealth)}</span></div>
        <div class="statChip"><span class="icon">🍃</span><span><b>${Math.round(P.stamina)}</b>/${Math.round(stats.maxStamina)}</span></div>
        <div class="statChip"><span class="icon">🍞</span><span><b>${Math.round(P.hunger)}</b>/100</span></div>
        <div class="statChip"><span class="icon">❄️</span><span><b>${Math.round(P.cold)}</b>/100</span></div>
        <div class="statChip"><span class="icon">🪙</span><span><b>${P.coins}</b></span></div>
      `;

      // Day line
      dayLine.textContent = `Day ${S.time.day} • ${SEASONS[S.time.season]} • ${fmtTime(S.time.t01)}`;
      const w = S.time.weather || (S.time.raining ? 'rainy' : 'sunny');
      const icon = (w==='sunny') ? '☀️' : (w==='cloudy' ? '☁️' : '☔');
      weatherLine.textContent = icon + ' ' + (S.time.weatherText || w);

      // Update pause menu weather if open
      // Biome / location line
      if (S.scene === 'interior'){
        biomeLine.textContent = "Fran Cottage";
        hintLine.textContent = "Warm, safe, and cozy";
      } else {
        const b = tileBiomeKey(S, Math.floor(P.x/TILE), Math.floor(P.y/TILE));
        biomeLine.textContent = BIOMES[b].name;
        hintLine.textContent = BIOMES[b].hint;
      }

      // XP bar
      const need = needOverall(P.levels.overall);
      const pct = clamp(P.levels.xp / need, 0, 1);
      xpFill.style.width = (pct*100).toFixed(1) + '%';
      xpText.textContent = `Lv ${P.levels.overall} • ${P.levels.xp} / ${need}`;

      // Hotbar is updated in the main update loop (keeps tool highlight responsive).

      // Hint near cottage
      const {tx,ty} = playerTile(S);
      const door = cottageDoorTile();
      if (Math.abs(tx-door.tx)+Math.abs(ty-door.ty) <= 2){
        hintText.innerHTML = '<b>Home sweet cottage.</b> Press <span class="kbd">E</span> to enter. Sleep in your bed indoors with <span class="kbd">Space</span>.';
      }
    }

    function renderHotbar(S){
      const P = S.player;
      if (!hotbarEl.dataset.built){
        hotbarEl.dataset.built = '1';
        hotbarEl.innerHTML = '';
        for(let i=1;i<=5;i++){
          const div = document.createElement('div');
          div.className = 'slot';
          div.id = 'slot'+i;
          div.innerHTML = `<small>${i}</small><span>${TOOL[i].icon}</span>`;
          div.onclick = ()=>{ setToolSafe(state, i); };
          hotbarEl.appendChild(div);
        }
      }
      for(let i=1;i<=5;i++){
        const s = el('slot'+i);
        if (!s) continue;
        s.classList.toggle('active', P.tool===i);
        s.classList.toggle('locked', !toolUnlocked(P, i));
      }
    }
