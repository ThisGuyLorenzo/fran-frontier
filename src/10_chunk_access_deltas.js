'use strict';

// -----------------------------
    // Chunk access + deltas
    // -----------------------------
    function getChunk(S, cx,cy){
      const k = key(cx,cy);
      if (S.world.has(k)) return S.world.get(k);

      const ch = generateChunk(cx,cy,S);

      // Apply deltas (removed ents / farms / poi used / placed items)
      const d = S.deltas[k];
      if (d){
        if (d.removed){
          for(const localKey of d.removed){
            ch.ents.delete(localKey);
          }
        }
        if (d.farms){
          for(const [lk, f] of Object.entries(d.farms)){
            ch.farms.set(lk, f);
          }
        }
        if (typeof d.poiUsed === 'boolean' && ch.poi){
          ch.poi.used = d.poiUsed;
        }
        if (d.placed){
          // placed is applied during render via lookup; also used for solidity
          ch.placed = d.placed.slice();
        }
      }

      S.world.set(k, ch);
      return ch;
    }

    function recordRemoved(S, tx,ty){
      const {cx,cy,lx,ly} = tileToChunk(tx,ty);
      const k = key(cx,cy);
      S.deltas[k] = S.deltas[k] || {};
      S.deltas[k].removed = S.deltas[k].removed || [];
      const lk = lx+','+ly;
      if (!S.deltas[k].removed.includes(lk)){
        S.deltas[k].removed.push(lk);
      }
    }

    function setFarm(S, tx,ty, farmObj){
      const {cx,cy,lx,ly} = tileToChunk(tx,ty);
      const k = key(cx,cy);
      S.deltas[k] = S.deltas[k] || {};
      S.deltas[k].farms = S.deltas[k].farms || {};
      S.deltas[k].farms[lx+','+ly] = farmObj;
      // update cache if exists
      if (S.world.has(k)){
        S.world.get(k).farms.set(lx+','+ly, farmObj);
      }
    }

    function setPoiUsed(S, cx,cy, used){
      const k = key(cx,cy);
      S.deltas[k] = S.deltas[k] || {};
      S.deltas[k].poiUsed = used;
      if (S.world.has(k)){
        const ch = S.world.get(k);
        if (ch.poi) ch.poi.used = used;
      }
    }

    function addPlaced(S, tx,ty, type){
      const {cx,cy,lx,ly} = tileToChunk(tx,ty);
      const k = key(cx,cy);
      S.deltas[k] = S.deltas[k] || {};
      S.deltas[k].placed = S.deltas[k].placed || [];
      S.deltas[k].placed.push({tx,ty,type});
      if (S.world.has(k)){
        const ch = S.world.get(k);
        ch.placed = ch.placed || [];
        ch.placed.push({tx,ty,type});
      }
    }

    function placedAt(S, tx,ty){
      const {cx,cy} = tileToChunk(tx,ty);
      const k = key(cx,cy);
      const d = S.deltas[k];
      if (!d || !d.placed) return null;
      for(const p of d.placed){
        if (p.tx===tx && p.ty===ty) return p;
      }
      return null;
    }
