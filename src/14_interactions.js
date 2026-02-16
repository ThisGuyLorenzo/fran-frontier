'use strict';

// -----------------------------
    // Interactions
    // -----------------------------
    const TOOL = {
      1: { id:'hand', name:'Hands', icon:'🖐️' },
      2: { id:'water', name:'Watering Can', icon:'🫗' },
      3: { id:'hoe', name:'Hoe', icon:'🧑‍🌾' },
      4: { id:'axe', name:'Hatchet', icon:'🪓' },
      5: { id:'pick', name:'Pickaxe', icon:'⛏️' }
    };

    function toolUnlocked(P, idx){
      if (idx === 1) return true; // hand
      const t = TOOL[idx]?.id;
      const tools = P.tools || {};
      if (t === 'water') return !!tools.hasWater;
      if (t === 'hoe')   return !!tools.hasHoe;
      if (t === 'axe')   return !!tools.hasAxe;
      if (t === 'pick')  return !!tools.hasPick;
      return true;
    }

    function setToolSafe(S, idx){
      const P = S.player;
      if (toolUnlocked(P, idx)){
        P.tool = idx;
      } else {
        P.tool = 1;
        toast(`🔒 ${TOOL[idx].name} not crafted yet.`);
      }
    }


    function facingVec(dir){
      if (dir===0) return {x:0,y:1};
      if (dir===1) return {x:0,y:-1};
      if (dir===2) return {x:-1,y:0};
      return {x:1,y:0};
    }

    function playerTile(S){
      return { tx: Math.floor(S.player.x / TILE), ty: Math.floor(S.player.y / TILE) };
    }

    function targetTile(S){
      const {tx,ty} = playerTile(S);
      const f = facingVec(S.player.dir);
      return { tx: tx + f.x, ty: ty + f.y };
    }

    function entityAt(S, tx,ty){
      const {cx,cy,lx,ly} = tileToChunk(tx,ty);
      const ch = getChunk(S,cx,cy);
      return ch.ents.get(lx+','+ly) || null;
    }

    function farmAt(S, tx,ty){
      const {cx,cy,lx,ly} = tileToChunk(tx,ty);
      const ch = getChunk(S,cx,cy);
      return ch.farms.get(lx+','+ly) || null;
    }

    function tileGround(S, tx,ty){
      const {cx,cy,lx,ly} = tileToChunk(tx,ty);
      const ch = getChunk(S,cx,cy);
      return ch.tiles[idx(lx,ly)];
    }

    function tileBiomeKey(S, tx,ty){
      const {cx,cy,lx,ly} = tileToChunk(tx,ty);
      const ch = getChunk(S,cx,cy);
      return ch.biomes[idx(lx,ly)];
    }

    function isWater(S, tx,ty){
      if (S.scene === 'interior') return false;
      return tileGround(S,tx,ty) === GROUND.WATER;
    }

    function isSolid(S, tx,ty){
      if (S.scene === 'interior'){
        return interiorSolid(S, tx,ty);
      }
      if (isWater(S,tx,ty)) return true;
      if (isCottageTile(tx,ty)) return true;
      const ent = entityAt(S,tx,ty);
      if (ent && ent.solid) return true;
      const p = placedAt(S,tx,ty);
      if (p && p.type === 'campfire') return true; // small collision
      return false;
    }

    function inRange(a,b, r){ return Math.hypot(a.x-b.x, a.y-b.y) <= r; }

    function interact(S, tOverride){
      const P = S.player;
      const stats = baseStats(P);

      if (!toolUnlocked(P, P.tool)) P.tool = 1;
      const t = tOverride || targetTile(S);
      const tool = TOOL[P.tool].id;

      // Tool unlock gating (Phase 1): you start with only your hands.
      if (tool !== 'hand'){
        const T = (P.tools || {});
        if (tool === 'water' && !T.hasWater){ toast('🔒 Craft a Watering Can to use water.'); return; }
        if (tool === 'hoe'   && !T.hasHoe){   toast('🔒 Craft a Hoe to till and plant.'); return; }
        if (tool === 'axe'   && !T.hasAxe){   toast('🔒 Craft a Hatchet to chop trees.'); return; }
        if (tool === 'pick'  && !T.hasPick){  toast('🔒 Craft a Pickaxe to mine stone & ore.'); return; }
      }

      // Phase 2: Cottage interior interactions
      if (S.scene === 'overworld'){
        const door = cottageDoorTile();
        if (t.tx===door.tx && t.ty===door.ty){
          hintText.innerHTML = '<b>Home sweet cottage.</b> Press <span class="kbd">E</span> to enter.';
          if (!anyModalOpen() && !S.transition?.active){
            transitionIntoCottage(S);
          }
          return;
        }
      } else if (S.scene === 'interior'){
        const I = S.interior;
        // door (exit)
        if (t.tx===I.door.tx && t.ty===I.door.ty){
          hintText.innerHTML = '<b>Front door.</b> Press <span class="kbd">E</span> to step outside.';
          if (!anyModalOpen() && !S.transition?.active){
            transitionOutOfCottage(S);
          }
          return;
        }
        // chest
        if (t.tx===I.chest.tx && t.ty===I.chest.ty){
          hintText.innerHTML = '<b>Chest.</b> Press <span class="kbd">E</span> to open storage.';
          openChestUI(S);
          return;
        }
        // workbench (crafting)
        if (t.tx===I.workbench.tx && t.ty===I.workbench.ty){
          hintText.innerHTML = '<b>Workbench.</b> Press <span class="kbd">E</span> to craft.';
          // Treat the workbench as a diegetic "craft" station.
          // (Crafting is still also available via <span class="kbd">C</span>.)
          toggleModal(modalCraft, () => rebuildCraftUI(S));
          return;
        }
        // bed
        if (t.tx===I.bed.tx && t.ty===I.bed.ty){
          hintText.innerHTML = '<b>Bed.</b> Press <span class="kbd">Space</span> to sleep.';
          // sleeping handled by Space in update()
          return;
        }
      }

      // Placeable campfire
      if (tool === 'hand'){
        // if holding a placeable? We keep it simple: place campfire if player has one and presses Shift+E
        // handled via key combo in input
      }

      // If POI on this tile
      const {cx,cy,lx,ly} = tileToChunk(t.tx,t.ty);
      const ch = getChunk(S,cx,cy);
      if (ch.poi && !ch.poi.used && ch.poi.lx === lx && ch.poi.ly === ly){
        return usePOI(S, ch);
      }

      // If placed object
      const placed = placedAt(S, t.tx,t.ty);
      if (placed && placed.type === 'campfire'){
        toast('🔥 Cozy warmth. You feel safe here.');
        // campfire warmth buff
        addBuff(S, { id:'campfire_warmth', name:'Campfire Warmth', duration: 90, mods:{ warmth:+1.5, staminaRegen:+1.5 } });
        awardXP(S,'exploration', 6);
        return;
      }

      const ent = entityAt(S, t.tx,t.ty);
      const farm = farmAt(S, t.tx,t.ty);
      const ground = tileGround(S, t.tx,t.ty);

      // Farming interactions
      if (tool === 'hoe'){
        const staminaCost = 4;
        if (P.stamina < staminaCost){ toast('😮‍💨 Too tired to hoe.'); return; }
        if (ground === GROUND.WATER || isCottageTile(t.tx,t.ty)){ toast('🌊 Not here.'); return; }

        const entBlock = entityAt(S, t.tx, t.ty);
        if (entBlock){ toast('🌿 Clear the spot first.'); return; }

        if (!farm){
          // till ground
          P.stamina -= staminaCost;
          setFarm(S,t.tx,t.ty,{ tilled:true, watered:false, crop:null, stage:0, prog:0, plantedDay:S.time.day, plantedSeason:S.time.season, ready:false });
          awardXP(S,'gardening', 6);
          toast('🧑‍🌾 Tilled soil.');
          return;
        } else {
          // plant if tilled and no crop
          if (farm.tilled && !farm.crop){
            const seed = P.activeSeed;
            if (!seed || !ITEMS[seed] || !ITEMS[seed].seedOf){ toast('🌱 No active seed. Open inventory to select one.'); return; }
            if (invCount(S,seed) <= 0){ toast('🌱 Out of seeds.'); return; }

            const cropId = ITEMS[seed].seedOf;
            const crop = CROPS[cropId];
            if (!crop){ toast('🌱 That seed seems odd…'); return; }
            if (!crop.seasons.includes(S.time.season)){
              toast('📅 Wrong season for that crop.');
              return;
            }
            invAdd(S,seed,-1);
            P.stamina -= staminaCost;
            const f2 = { ...farm, crop: cropId, stage:0, prog:0, watered:false, ready:false, plantedDay:S.time.day, plantedSeason:S.time.season };
            setFarm(S,t.tx,t.ty,f2);
            awardXP(S,'gardening', 8);
            toast(`🌱 Planted ${crop.name}.`);
            return;
          }
          if (farm.ready){
            // harvest
            const crop = CROPS[farm.crop];
            if (!crop){ return; }
            P.stamina -= 3;
            const bonusChance = clamp(stats.harvestYield + (stats.luck*0.04), 0, 0.35);
            const amount = 1 + (Math.random() < bonusChance ? 1 : 0);
            invAdd(S, crop.harvest, amount);
            awardXP(S,'gardening', crop.xp.gardening + (amount-1)*4);
            toast(`🥕 Harvested ${crop.name}${amount>1?' (bonus!)':''}.`);
            const f3 = { ...farm, crop:null, stage:0, prog:0, watered:false, ready:false };
            setFarm(S,t.tx,t.ty,f3);
            return;
          }
          toast('🪴 Soil is ready. Water, grow, harvest.');
          return;
        }
      }

      if (tool === 'water'){
        const staminaCost = 3;
        if (P.stamina < staminaCost){ toast('😮‍💨 Too tired to water.'); return; }
        // Refill from natural water
        if (tileGround(S, t.tx, t.ty) === GROUND.WATER){
          invAdd(S,'water', 5);
          P.stamina -= 1;
          toast('💧 Refilled water at the lake.');
          awardXP(S,'exploration', 4);
          return;
        }
        const f = farmAt(S, t.tx,t.ty);
        if (!f || !f.tilled){ toast('💧 Water tilled soil.'); return; }
        if (invCount(S,'water') <= 0){
          toast('💧 Out of water. Find a well POI to refill.');
          return;
        }
        invAdd(S,'water', -1);
        P.stamina -= staminaCost;
        setFarm(S,t.tx,t.ty,{ ...f, watered:true });
        awardXP(S,'gardening', 4);
        toast('💧 Watered.');
        return;
      }

      // Resource interactions
      if (ent){
        if (ent.type === 'tree' || ent.type === 'pine'){
          if (tool !== 'axe'){ toast('🪓 A hatchet would help.'); return; }
          const staminaCost = S.player.perks.softStrike ? 6 : 8;
          if (P.stamina < staminaCost){ toast('😮‍💨 Too tired to chop.'); return; }
          P.stamina -= staminaCost;
          const dmg = 1 + (P.tools.axeTier>=1 ? 1 : 0);
          ent.hp -= dmg;
          awardXP(S,'foraging', 3);
          if (ent.hp <= 0){
            recordRemoved(S,t.tx,t.ty);
            // remove from cache chunk too
            getChunk(S,cx,cy).ents.delete(lx+','+ly);
            const woodGain = 3 + (Math.random() < 0.25 + stats.luck*0.02 ? 1 : 0);
            invAdd(S,'wood', woodGain);
            awardXP(S,'foraging', 8);
            toast(`🪵 +${woodGain} wood`);
          } else {
            toast('🪓 Chop…');
          }
          return;
        }

        if (ent.type === 'rock' || ent.type.startsWith('ore_')){
          if (tool !== 'pick'){ toast('⛏️ A pickaxe would help.'); return; }
          const staminaCost = S.player.perks.softStrike ? 6 : 8;
          if (P.stamina < staminaCost){ toast('😮‍💨 Too tired to mine.'); return; }
          P.stamina -= staminaCost;
          const dmg = 1 + (P.tools.pickTier>=1 ? 1 : 0);
          ent.hp -= dmg;
          awardXP(S,'mining', 6);
          if (ent.hp <= 0){
            recordRemoved(S,t.tx,t.ty);
            getChunk(S,cx,cy).ents.delete(lx+','+ly);
            if (ent.type === 'ore_copper'){
              const gain = 2 + (Math.random()<0.2?1:0);
              invAdd(S,'copper', gain);
              toast(`🟠 +${gain} copper ore`);
            } else if (ent.type === 'ore_iron'){
              const gain = 2 + (Math.random()<0.15?1:0);
              invAdd(S,'iron', gain);
              toast(`⚪ +${gain} iron ore`);
            } else {
              const gain = 2 + (Math.random()<0.25?1:0);
              invAdd(S,'stone', gain);
              toast(`🪨 +${gain} stone`);
            }
            return;
          } else {
            toast('⛏️ Tap…');
          }
          return;
        }

        // foraging nodes
        if (tool !== 'hand' && tool !== 'hoe'){
          // allow with hands best
        }
        if (ent.type === 'flower'){
          recordRemoved(S,t.tx,t.ty);
          getChunk(S,cx,cy).ents.delete(lx+','+ly);
          invAdd(S,'flower', 1);
          awardXP(S,'foraging', 6);
          toast('🌸 Picked flowers.');
          return;
        }
        if (ent.type === 'bush'){
          recordRemoved(S,t.tx,t.ty);
          getChunk(S,cx,cy).ents.delete(lx+','+ly);
          invAdd(S,'fiber', 1 + (Math.random()<0.35?1:0));
          awardXP(S,'foraging', 6);
          toast('🧵 Gathered fiber.');
          return;
        }
        if (ent.type === 'berry_bush'){
          recordRemoved(S,t.tx,t.ty);
          getChunk(S,cx,cy).ents.delete(lx+','+ly);
          const base = 2 + (Math.random()<0.4?1:0);
          const extra = P.perks.berryKeen ? 1 : 0;
          invAdd(S,'berry', base + extra);
          awardXP(S,'foraging', 8);
          toast(`🫐 +${base+extra} berries`);
          return;
        }
        if (ent.type === 'mushroom'){
          recordRemoved(S,t.tx,t.ty);
          getChunk(S,cx,cy).ents.delete(lx+','+ly);
          invAdd(S,'mushroom', 1);
          awardXP(S,'foraging', 7);
          toast('🍄 Mushroom for the pantry.');
          return;
        }
        if (ent.type === 'glowcap'){
          recordRemoved(S,t.tx,t.ty);
          getChunk(S,cx,cy).ents.delete(lx+','+ly);
          invAdd(S,'glowcap', 1);
          awardXP(S,'foraging', 10);
          toast('✨ Glowcap collected.');
          return;
        }
        if (ent.type === 'ice'){
          recordRemoved(S,t.tx,t.ty);
          getChunk(S,cx,cy).ents.delete(lx+','+ly);
          invAdd(S,'ice', 1 + (Math.random()<0.25?1:0));
          awardXP(S,'mining', 8);
          toast('🧊 Ice crystal.');
          return;
        }
        if (ent.type === 'beehive'){
          // a small risk-free "sting" (just stamina loss)
          const staminaCost = 5;
          if (P.stamina < staminaCost){ toast('😮‍💨 Too tired.'); return; }
          P.stamina -= staminaCost;
          recordRemoved(S,t.tx,t.ty);
          getChunk(S,cx,cy).ents.delete(lx+','+ly);
          invAdd(S,'honey', 1 + (Math.random()<0.35?1:0));
          awardXP(S,'foraging', 12);
          toast('🍯 Honeycomb collected (sweet!).');
          return;
        }
      }

      // If no entity, generic: forage herbs sometimes
      if (tool === 'hand'){
        const b = tileBiomeKey(S, t.tx,t.ty);
        const r = Math.random();
        if (b===0 || b===4 || b===5){
          if (r < 0.35){
            invAdd(S,'herb', 1);
            awardXP(S,'foraging', 6);
            toast('🌿 Found herbs.');
            return;
          }
        }
      }

      toast('…Nothing to do there.');
    }

    function usePOI(S, ch){
      const P = S.player;
      const {cx,cy} = ch;

      switch(ch.poi.type){
        case 'picnic':
          invAdd(S,'sandwich', 1);
          awardXP(S,'exploration', 18);
          toast('🥪 Found an abandoned picnic—still delicious.');
          break;
        case 'well':
          // refill water
          invAdd(S,'water', 5);
          awardXP(S,'exploration', 10);
          toast('💧 Refilled water at the old well.');
          break;
        case 'fairy':
          addBuff(S, { id:'fairy_bless', name:'Fairy Ring Blessing', duration: 240, mods:{ luck:+1.2, moveSpeed:+3 } });
          awardXP(S,'exploration', 22);
          toast('🧚 Tiny lights dance—luck feels brighter.');
          break;
        case 'shrine':
          // grant a stat point or skill xp
          P.levels.statPoints += 1;
          awardXP(S,'exploration', 12);
          toast('⛩️ A bramble shrine grants +1 Stat Point.');
          break;
        case 'merchant':
          // simple trade: convert a few resources to coins and vice versa
          openMerchant(S);
          break;
        case 'greenhouse':
          toast('🏚️ A ruined greenhouse… someday you could restore it.');
          awardXP(S,'exploration', 10);
          break;
        case 'archway':
          const tx = cx*CHUNK + ch.poi.lx;
          const ty = cy*CHUNK + ch.poi.ly;
          S.knownArchways.push({tx,ty});
          toast('🪨 Mossy archway discovered! (Fast travel enabled.)');
          awardXP(S,'exploration', 25);
          break;
      }

      ch.poi.used = true;
      setPoiUsed(S, cx,cy, true);
    }

    // Merchant modal via craft modal quick hack
    function openMerchant(S){
      // We'll repurpose the crafting modal content for a simple shop UI
      showModal(modalCraft);
      const P = S.player;
      const priceMod = clamp(1.0 - (baseStats(P).charm * 0.04), 0.75, 1.0);

      const offers = [
        { buy:'turnip_seed',  qty:5, cost: 6 },
        { buy:'blueberry_seed', qty:5, cost: 8 },
        { buy:'pumpkin_seed', qty:3, cost: 10 },
        { buy:'snowroot_seed', qty:5, cost: 9 },
        { buy:'water', qty:5, cost: 4 },
      ];
      const sells = [
        { sell:'turnip', price: 3 },
        { sell:'blueberry', price: 4 },
        { sell:'pumpkin', price: 6 },
        { sell:'snowroot', price: 4 },
        { sell:'honey', price: 7 },
        { sell:'copper', price: 3 },
        { sell:'iron', price: 4 },
      ];

      craftList.innerHTML = '';
      const head = document.createElement('div');
      head.className = 'row';
      head.innerHTML = `<div><b>🛒 Traveling Merchant Wagon</b><div style="opacity:.85; font-size:13px; margin-top:2px;">Trade gently. Charm lowers prices a little.</div></div>
                        <div class="pill">🪙 Coins: <b>${P.coins}</b></div>`;
      craftList.appendChild(head);

      const buyBox = document.createElement('div');
      buyBox.className = 'panel';
      buyBox.style.padding = '12px';
      buyBox.style.marginTop = '10px';
      buyBox.innerHTML = `<div style="font-weight:900; margin-bottom:10px;">Buy</div>`;
      const buyList = document.createElement('div');
      buyList.className='list';

      for(const o of offers){
        const cost = Math.ceil(o.cost * priceMod);
        const row = document.createElement('div');
        row.className='row';
        row.innerHTML = `<div><b>${ITEMS[o.buy].icon} ${ITEMS[o.buy].name}</b><div style="opacity:.85; font-size:13px;">x${o.qty} for 🪙 ${cost}</div></div>`;
        const btn = document.createElement('button');
        btn.className='btn';
        btn.textContent='Buy';
        btn.disabled = (P.coins < cost);
        btn.onclick = () => {
          if (P.coins < cost) return;
          P.coins -= cost;
          invAdd(S,o.buy,o.qty);
          toast('🛒 Purchased.');
          openMerchant(S);
        };
        row.appendChild(btn);
        buyList.appendChild(row);
      }
      buyBox.appendChild(buyList);
      craftList.appendChild(buyBox);

      const sellBox = document.createElement('div');
      sellBox.className='panel';
      sellBox.style.padding='12px';
      sellBox.style.marginTop='10px';
      sellBox.innerHTML = `<div style="font-weight:900; margin-bottom:10px;">Sell</div>`;
      const sellList = document.createElement('div');
      sellList.className='list';

      for(const s of sells){
        const price = Math.max(1, Math.floor(s.price * (1 + baseStats(P).charm*0.02)));
        const count = invCount(S,s.sell);
        const row = document.createElement('div');
        row.className='row';
        row.innerHTML = `<div><b>${ITEMS[s.sell].icon} ${ITEMS[s.sell].name}</b><div style="opacity:.85; font-size:13px;">You have ${count} • 🪙 ${price} each</div></div>`;
        const btn = document.createElement('button');
        btn.className='btn';
        btn.textContent='Sell 1';
        btn.disabled = (count <= 0);
        btn.onclick = () => {
          if (invCount(S,s.sell) <= 0) return;
          invAdd(S,s.sell,-1);
          P.coins += price;
          toast('🪙 Sold.');
          openMerchant(S);
        };
        row.appendChild(btn);
        sellList.appendChild(row);
      }
      sellBox.appendChild(sellList);
      craftList.appendChild(sellBox);

      moneyPill.textContent = `🪙 ${P.coins} coins`;
    }
