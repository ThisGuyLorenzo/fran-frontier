'use strict';

// -----------------------------
    // Modals content
    // -----------------------------
    function showModal(m){ m.classList.add('show'); }
    function hideModal(m){ m.classList.remove('show'); }
    function anyModalOpen(){
      return [modalInventory,modalCraft,modalSkills,modalJournal,modalMap,modalPause].some(m => m.classList.contains('show'));
    }
    function closeAll(){
      [modalInventory,modalCraft,modalSkills,modalJournal,modalMap,modalPause].forEach(hideModal);
      // Reset temporary UI modes
      state.ui = state.ui || {};
      state.ui.invMode = 'satchel';
      state.ui.chestTab = 'satchel';
    }


function openChestUI(S){
  // Only open if we're indoors and near chest (interact already checks)
  S.home = S.home || { chest:{}, return:null };
  S.ui = S.ui || {};
  S.ui.invMode = 'chest';
  S.ui.chestTab = S.ui.chestTab || 'satchel';
  toggleModal(modalInventory, () => rebuildInventoryUI(S));
}

function rebuildChestUI(S){
  const P = S.player;
  S.home = S.home || { chest:{}, return:null };
  const chest = S.home.chest || (S.home.chest = {});
  S.ui = S.ui || {};
  const tab = S.ui.chestTab || 'satchel';

  // Header text
  const h2 = modalInventory.querySelector('h2');
  const p = modalInventory.querySelector('.modalHeader p');
  if (h2) h2.textContent = 'Cottage Chest';
  if (p) p.textContent = 'Store supplies for tomorrow. Switch tabs to move items between your satchel and your chest.';

  moneyPill.textContent = `🪙 ${P.coins} coins`;
  invInfo.innerHTML = '';

  // Tabs
  invList.innerHTML = '';
  const tabs = document.createElement('div');
  tabs.style.display = 'flex';
  tabs.style.gap = '8px';
  tabs.style.marginBottom = '10px';

  const mkTab = (id,label) => {
    const b = document.createElement('button');
    b.className = 'btn ' + (tab===id ? 'primary' : '');
    b.textContent = label;
    b.onclick = () => { S.ui.chestTab = id; rebuildInventoryUI(S); };
    return b;
  };
  tabs.appendChild(mkTab('satchel','Satchel'));
  tabs.appendChild(mkTab('chest','Chest'));
  invList.appendChild(tabs);

  const list = document.createElement('div');
  list.className = 'list';
  list.style.gap = '10px';
  list.style.display = 'grid';
  list.style.gridTemplateColumns = '1fr';
  invList.appendChild(list);

  function renderRows(sourceObj, mode){
    const ids = Object.keys(sourceObj).filter(k=>sourceObj[k]>0).sort((a,b)=> (ITEMS[a]?.name||a).localeCompare(ITEMS[b]?.name||b));
    if (ids.length===0){
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<div><b>(empty)</b><div style="opacity:.85; font-size:13px;">Nothing here yet.</div></div>`;
      list.appendChild(row);
      return;
    }
    for(const id of ids){
      const it = ITEMS[id] || {name:id, icon:'📦', desc:''};
      const count = sourceObj[id] || 0;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<div><b>${it.icon} ${it.name}</b><div style="opacity:.85; font-size:13px;">x${count}</div></div>`;
      const right = document.createElement('div');
      right.style.display='flex';
      right.style.gap='8px';
      right.style.alignItems='center';

      const btnOne = document.createElement('button');
      btnOne.className='btn';
      btnOne.textContent = (mode==='store') ? 'Store' : 'Take';
      btnOne.onclick = () => {
        if (mode==='store'){
          if (invCount(S,id) <= 0) return;
          invAdd(S,id,-1);
          chest[id] = (chest[id]||0)+1;
        } else {
          if ((chest[id]||0) <= 0) return;
          chest[id] -= 1;
          if (chest[id] <= 0) delete chest[id];
          invAdd(S,id,1);
        }
        rebuildInventoryUI(S);
      };

      const btnAll = document.createElement('button');
      btnAll.className='btn';
      btnAll.textContent = (mode==='store') ? 'All' : 'All';
      btnAll.onclick = () => {
        if (mode==='store'){
          const n = invCount(S,id);
          if (n<=0) return;
          invAdd(S,id,-n);
          chest[id] = (chest[id]||0)+n;
        } else {
          const n = chest[id]||0;
          if (n<=0) return;
          delete chest[id];
          invAdd(S,id,n);
        }
        rebuildInventoryUI(S);
      };

      const btnInfo = document.createElement('button');
      btnInfo.className='btn';
      btnInfo.textContent='Info';
      btnInfo.onclick = () => {
        invInfo.innerHTML = `<b>${it.icon} ${it.name}</b><br><span style="opacity:.9">${it.desc||''}</span>`;
      };

      right.appendChild(btnInfo);
      right.appendChild(btnOne);
      right.appendChild(btnAll);
      row.appendChild(right);
      list.appendChild(row);
    }
  }

  if (tab === 'satchel'){
    renderRows(S.inv, 'store');
    invInfo.innerHTML = `<b>Satchel → Chest</b><br><span style="opacity:.9">Store items to free space.</span>`;
  } else {
    renderRows(chest, 'take');
    invInfo.innerHTML = `<b>Chest → Satchel</b><br><span style="opacity:.9">Take items back with you.</span>`;
  }
}

function rebuildInventoryUI(S){
      if (state.ui && state.ui.invMode === 'chest'){
        return rebuildChestUI(S);
      }
      const P = S.player;
      // restore header for normal inventory
      const h2 = modalInventory.querySelector('h2');
      const p = modalInventory.querySelector('.modalHeader p');
      if (h2) h2.textContent = 'Satchel Inventory';
      if (p) p.textContent = 'Click seeds to set your active seed. Click food to eat. Your cottage-core life is built from little daily choices.';
      invList.innerHTML = '';
      moneyPill.textContent = `🪙 ${P.coins} coins`;

      const ids = Object.keys(S.inv).sort((a,b)=> (ITEMS[a]?.name||a).localeCompare(ITEMS[b]?.name||b));
      if (ids.length === 0){
        invList.innerHTML = `<div class="row"><div><b>(empty)</b><div style="opacity:.85; font-size:13px;">Go explore—your satchel loves treasures.</div></div></div>`;
      }

      for(const id of ids){
        const it = ITEMS[id] || {name:id, icon:'📦', desc:''};
        const row = document.createElement('div');
        row.className='row';
        const count = invCount(S,id);
        row.innerHTML = `<div>
          <b>${it.icon} ${it.name}</b>
          <div style="opacity:.85; font-size:13px;">x${count}</div>
        </div>`;
        const right = document.createElement('div');
        right.style.display='flex';
        right.style.gap='8px';
        right.style.alignItems='center';

        const btnInfo = document.createElement('button');
        btnInfo.className='btn';
        btnInfo.textContent='Info';
        btnInfo.onclick = () => {
          invInfo.innerHTML = `<b>${it.icon} ${it.name}</b><br/><span style="opacity:.9;">${it.desc || ''}</span>`;
        };
        right.appendChild(btnInfo);

        // Seed select
        if (it.seedOf){
          const btn = document.createElement('button');
          btn.className='btn';
          btn.textContent = (P.activeSeed===id) ? 'Active' : 'Set Seed';
          btn.disabled = (P.activeSeed===id);
          btn.onclick = () => {
            P.activeSeed = id;
            toast(`🌱 Active seed: ${it.name}`);
            rebuildInventoryUI(S);
          };
          right.appendChild(btn);
        }

        // Eat
        if (it.food){
          const btn = document.createElement('button');
          btn.className='btn';
          btn.textContent='Eat';
          btn.onclick = () => {
            eatItem(S,id);
            rebuildInventoryUI(S);
          };
          right.appendChild(btn);
        }

        // Equip
        if (it.equip){
          const btn = document.createElement('button');
          btn.className='btn';
          const equipped = (P.equip[it.equip.slot] === id);
          btn.textContent = equipped ? 'Unequip' : 'Equip';
          btn.onclick = () => {
            if (equipped) P.equip[it.equip.slot] = null;
            else P.equip[it.equip.slot] = id;
            toast(equipped ? '👒 Unequipped.' : '👒 Equipped.');
            rebuildInventoryUI(S);
          };
          right.appendChild(btn);
        }

        // Place
        if (it.placeable){
          const btn = document.createElement('button');
          btn.className='btn';
          btn.textContent='Place';
          btn.onclick = () => {
            // place at target tile if empty
            const t = targetTile(S);
            if (isSolid(S,t.tx,t.ty)){ toast('🧺 No space to place it there.'); return; }
            invAdd(S,id,-1);
            addPlaced(S,t.tx,t.ty,id);
            toast(`🏕️ Placed ${it.name}.`);
            awardXP(S,'crafting', 6);
            rebuildInventoryUI(S);
          };
          right.appendChild(btn);
        }

        row.appendChild(right);
        invList.appendChild(row);
      }

      const active = P.activeSeed ? ITEMS[P.activeSeed] : null;
      activeSeedLine.textContent = active ? `${active.icon} ${active.name}` : '🌱 None';
    }

    function eatItem(S, id){
      const it = ITEMS[id];
      if (!it || !it.food) return;
      if (invCount(S,id) <= 0) return;

      invAdd(S,id,-1);
      const P = S.player;
      P.hunger = clamp(P.hunger + (it.food.hunger||0), 0, 100);
      P.stamina = clamp(P.stamina + (it.food.stamina||0), 0, baseStats(P).maxStamina);
      if (it.buff) addBuff(S, it.buff);
      awardXP(S,'cooking', 4);
      toast(`${it.icon} Ate ${it.name}.`);
    }

    function rebuildCraftUI(S){
      craftList.innerHTML = '';
      for(const r of RECIPES){
        const row = document.createElement('div');
        row.className='row';

        const reqStr = Object.entries(r.req||{}).map(([id,n])=> `${ITEMS[id]?.icon||'📦'} ${ITEMS[id]?.name||id} x${n}`).join(' · ');
        row.innerHTML = `<div>
          <b>${r.icon} ${r.name}</b>
          <div style="opacity:.85; font-size:13px; margin-top:2px;">${reqStr || '—'}</div>
          <div style="opacity:.78; font-size:12.5px; margin-top:4px;">${r.note || ''}</div>
        </div>`;

        const btn = document.createElement('button');
        btn.className='btn';
        const okReq = invHas(S, r.req||{});
        const okAvail = r.available ? r.available(S) : true;
        btn.textContent = (!okAvail && r.lockText) ? r.lockText : 'Make';
        btn.disabled = !(okReq && okAvail);
        btn.onclick = () => {
          if (!invHas(S, r.req||{})) return;
          invSpend(S, r.req||{});
          for(const [id,n] of Object.entries(r.out||{})){
            invAdd(S,id,n);
          }
          if (r.apply) r.apply(S);

          // XP
          if (r.xp){
            for(const [sk,amt] of Object.entries(r.xp)){
              awardXP(S, sk, amt);
            }
          }
          toast('🧺 Crafted with care.');
          rebuildCraftUI(S);
        };
        row.appendChild(btn);
        craftList.appendChild(row);
      }
    }

    function rebuildSkillsUI(S){
      const P = S.player;
      lvlLine.textContent = `Overall Level ${P.levels.overall}`;
      pointsLine.textContent = `Stat Points: ${P.levels.statPoints}`;

      const perks = [];
      if (P.perks.greenThumb) perks.push('Green Thumb');
      if (P.perks.berryKeen) perks.push('Berry Keen');
      if (P.perks.softStrike) perks.push('Soft Strike');
      if (P.perks.trailblazer) perks.push('Trailblazer');
      if (P.perks.heartyMeals) perks.push('Hearty Meals');
      perkPill.textContent = `🌿 Perks: ${perks.length ? perks.join(', ') : 'none yet'}`;

      // Stats list
      const statsMeta = [
        {id:'maxHealth', label:'Max Health', icon:'❤️', desc:'+1 HP per point', step:1},
        {id:'maxStamina', label:'Max Stamina', icon:'🍃', desc:'+5 stamina per point', step:1},
        {id:'moveSpeed', label:'Move Speed', icon:'👣', desc:'+3 speed per point', step:1},
        {id:'toolEff', label:'Tool Efficiency', icon:'🛠️', desc:'+0.06 efficiency per point', step:1},
        {id:'harvestYield', label:'Harvest Yield', icon:'🌾', desc:'+2% bonus chance per point', step:1},
        {id:'luck', label:'Luck', icon:'✨', desc:'+0.4 luck per point', step:1},
        {id:'warmth', label:'Warmth', icon:'🔥', desc:'+0.6 warmth per point', step:1},
        {id:'charm', label:'Charm', icon:'💬', desc:'+0.4 charm per point', step:1},
      ];

      statList.innerHTML = '';
      for(const s of statsMeta){
        const row = document.createElement('div');
        row.className='row';
        const val = P.alloc[s.id] | 0;
        row.innerHTML = `<div>
          <b>${s.icon} ${s.label}</b>
          <div style="opacity:.85; font-size:13px;">${s.desc}</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="pill">Allocated: <b>${val}</b></span>
        </div>`;
        const btn = document.createElement('button');
        btn.className='btn';
        btn.textContent = '+';
        btn.disabled = (P.levels.statPoints <= 0);
        btn.onclick = () => {
          if (P.levels.statPoints <= 0) return;
          P.levels.statPoints -= 1;
          P.alloc[s.id] = (P.alloc[s.id] | 0) + 1;
          toast(`${s.icon} Increased ${s.label}.`);
          rebuildSkillsUI(S);
        };
        row.lastElementChild.appendChild(btn);
        statList.appendChild(row);
      }

      // Skill lines
      skillList.innerHTML='';
      const order = ['gardening','foraging','mining','crafting','cooking','exploration'];
      for(const id of order){
        const sk = P.skills[id];
        const need = needSkill(sk.level);
        const pct = clamp(sk.xp / need, 0, 1);
        const row = document.createElement('div');
        row.className='row';
        row.innerHTML = `<div>
          <b>📘 ${capitalize(id)} — Lv ${sk.level}</b>
          <div style="opacity:.85; font-size:13px;">${sk.xp} / ${need}</div>
        </div>
        <div class="bar" style="width:180px;"><i style="width:${(pct*100).toFixed(1)}%"></i></div>`;
        skillList.appendChild(row);
      }
    }

    function rebuildJournalUI(S){
      bioList.innerHTML='';
      for(const b of Array.from(S.discoveredBiomes).sort((a,b)=>a-b)){
        const row = document.createElement('div');
        row.className='row';
        row.innerHTML = `<div><b>🗺️ ${BIOMES[b].name}</b><div style="opacity:.85; font-size:13px;">${BIOMES[b].hint}</div></div>`;
        bioList.appendChild(row);
      }
      if (bioList.children.length===0){
        bioList.innerHTML = `<div class="row"><div><b>No biomes yet</b><div style="opacity:.85; font-size:13px;">Step outside the clearing!</div></div></div>`;
      }

      resList.innerHTML='';
      const ids = Object.keys(S.inv).sort((a,b)=> (ITEMS[a]?.name||a).localeCompare(ITEMS[b]?.name||b));
      for(const id of ids){
        const it = ITEMS[id] || {name:id, icon:'📦'};
        const row = document.createElement('div');
        row.className='row';
        row.innerHTML = `<div><b>${it.icon} ${it.name}</b><div style="opacity:.85; font-size:13px;">x${invCount(S,id)}</div></div>`;
        resList.appendChild(row);
      }
      if (resList.children.length===0){
        resList.innerHTML = `<div class="row"><div><b>No resources yet</b><div style="opacity:.85; font-size:13px;">Forage flowers and chop a tree.</div></div></div>`;
      }
    }

    function rebuildMapUI(S){
      // Map shows visited chunks around player; color by biome
      const P = S.player;
      const {tx,ty} = playerTile(S);
      const {cx,cy} = tileToChunk(tx,ty);

      // Determine bounds
      const span = 20; // chunks around player
      const minx = cx - span, maxx = cx + span;
      const miny = cy - span, maxy = cy + span;

      const w = mapCanvas.width;
      const h = mapCanvas.height;
      mapCtx.clearRect(0,0,w,h);

      // parchment background
      mapCtx.fillStyle = 'rgba(247,241,227,.9)';
      mapCtx.fillRect(0,0,w,h);

      const cell = Math.floor(Math.min(w/(2*span+1), h/(2*span+1)));
      const ox = Math.floor(w/2 - cell/2);
      const oy = Math.floor(h/2 - cell/2);

      // draw visited chunks
      for(let y=miny; y<=maxy; y++){
        for(let x=minx; x<=maxx; x++){
          const k = key(x,y);
          if (!S.visitedChunks.has(k)) continue;

          // sample biome from center tile of chunk
          const sx = x*CHUNK + Math.floor(CHUNK/2);
          const sy = y*CHUNK + Math.floor(CHUNK/2);
          const b = biomeAt(sx,sy,S.seed);
          const col = BIOMES[b].ground;

          const px = ox + (x-cx)*cell;
          const py = oy + (y-cy)*cell;

          mapCtx.fillStyle = col;
          mapCtx.globalAlpha = 0.8;
          mapCtx.fillRect(px, py, cell, cell);
          mapCtx.globalAlpha = 1;
        }

    function rebuildPauseUI(S){
      if (!pauseWeatherLine) return;
      const w = S.time.weather || (S.time.raining ? 'rainy' : 'sunny');
      const icon = (w==='sunny') ? '☀️' : (w==='cloudy' ? '☁️' : '☔');
      pauseWeatherLine.textContent = icon + ' ' + (S.time.weatherText || w);
    }

      }

      // draw archways
      for(const a of S.knownArchways){
        const ac = tileToChunk(a.tx,a.ty);
        const px = ox + (ac.cx-cx)*cell;
        const py = oy + (ac.cy-cy)*cell;
        mapCtx.fillStyle = 'rgba(255,255,255,.9)';
        mapCtx.fillRect(px+cell*0.25, py+cell*0.25, cell*0.5, cell*0.5);
      }

      // draw player
      mapCtx.fillStyle = '#2b2a26';
      mapCtx.fillRect(ox+cell*0.35, oy+cell*0.35, cell*0.3, cell*0.3);

      // doodled border
      mapCtx.strokeStyle = 'rgba(107,79,42,.55)';
      mapCtx.lineWidth = 2;
      mapCtx.strokeRect(8,8,w-16,h-16);
    }
