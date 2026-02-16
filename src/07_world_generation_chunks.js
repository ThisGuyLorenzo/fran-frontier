'use strict';

// -----------------------------
    // World generation (chunks)
    // -----------------------------
    function key(cx,cy){ return cx+','+cy; }
    function tileToChunk(tx,ty){
      const cx = Math.floor(tx / CHUNK);
      const cy = Math.floor(ty / CHUNK);
      const lx = tx - cx*CHUNK;
      const ly = ty - cy*CHUNK;
      return {cx,cy,lx,ly};
    }

    function idx(lx,ly){ return ly*CHUNK + lx; }

    function isCottageTile(tx,ty){
      // Cottage collision footprint.
      // The cottage sprite is 48x48px (3x3 tiles). Keep collision aligned to the sprite
      // so you can walk right up to the walls and still reach the door.
      // Tiles covered: x = -1..1, y = -2..0
      const x0 = -1, y0 = -2, w = 3, h = 3;
      return (tx>=x0 && tx < x0+w && ty>=y0 && ty < y0+h);
    }

    function cottageDoorTile(){
      // Door is visually on the bottom row of the sprite, which aligns to tile y=0
      // when the sprite is drawn at (-1*TILE, -2*TILE).
      return {tx:0, ty:0};
    }
