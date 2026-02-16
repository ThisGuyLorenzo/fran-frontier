'use strict';

// -----------------------------
    // Discovery (fog-of-war)
    // -----------------------------
    function markDiscovery(S){
      const {tx,ty} = playerTile(S);
      const {cx,cy} = tileToChunk(tx,ty);
      const k = key(cx,cy);
      if (!S.visitedChunks.has(k)){
        S.visitedChunks.add(k);
        awardXP(S,'exploration', 10);
      }
      const b = tileBiomeKey(S, tx,ty);
      if (!S.discoveredBiomes.has(b)){
        S.discoveredBiomes.add(b);
        awardXP(S,'exploration', 25);
        toast(`🗺️ New biome: ${BIOMES[b].name}`);
      }
    }
