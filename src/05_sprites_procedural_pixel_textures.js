'use strict';

// -----------------------------
    // Sprites (procedural pixel textures)
    // -----------------------------
    function makeTileSprite(base, accent){
      const c = document.createElement('canvas');
      c.width = TILE; c.height = TILE;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;

      g.fillStyle = base;
      g.fillRect(0,0,TILE,TILE);

      // Soft dithering specks
      for(let i=0;i<24;i++){
        const x = (Math.random()*TILE)|0;
        const y = (Math.random()*TILE)|0;
        g.fillStyle = (Math.random()<0.55) ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.07)';
        g.fillRect(x,y,1,1);
      }
      for(let i=0;i<10;i++){
        const x = (Math.random()*TILE)|0;
        const y = (Math.random()*TILE)|0;
        g.fillStyle = accent;
        g.globalAlpha = 0.18;
        g.fillRect(x,y,1,1);
        g.globalAlpha = 1;
      }
      return c;
    }

    function makeSprite(drawFn, w=TILE, h=TILE){
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      drawFn(g);
      return c;
    }

    function px(g, x,y,w,h, col){ g.fillStyle = col; g.fillRect(x,y,w,h); }

    function makeTreeSprite(leaf, leaf2, trunk){
      return makeSprite(g=>{
        // canopy
        px(g,4,2,8,2, leaf2);
        px(g,3,4,10,4, leaf);
        px(g,4,8,8,3, leaf2);
        // sparkle berries
        px(g,6,6,1,1,'rgba(255,255,255,.55)');
        px(g,9,7,1,1,'rgba(255,255,255,.35)');
        // trunk
        px(g,7,11,2,4, trunk);
        px(g,6,14,4,2, trunk);
      });
    }

    function makePineSprite(leaf, leaf2, trunk){
      return makeSprite(g=>{
        px(g,7,2,2,2, leaf2);
        px(g,6,4,4,2, leaf);
        px(g,5,6,6,2, leaf2);
        px(g,4,8,8,2, leaf);
        px(g,3,10,10,2, leaf2);
        px(g,7,12,2,4, trunk);
        px(g,6,15,4,1, trunk);
      });
    }

    function makeRockSprite(col1, col2){
      return makeSprite(g=>{
        px(g,4,8,8,6,col1);
        px(g,5,7,6,1,col1);
        px(g,6,6,4,1,col1);
        px(g,5,10,2,2,col2);
        px(g,9,12,2,2,col2);
        px(g,7,9,2,1,'rgba(255,255,255,.25)');
      });
    }

    function makeOreSprite(rock1, rock2, ore){
      return makeSprite(g=>{
        px(g,4,8,8,6,rock1);
        px(g,5,7,6,1,rock1);
        px(g,6,6,4,1,rock1);
        px(g,5,10,2,2,rock2);
        px(g,9,12,2,2,rock2);
        px(g,6,11,1,1,ore);
        px(g,8,10,1,1,ore);
        px(g,10,13,1,1,ore);
      });
    }

    function makeBushSprite(col1, col2){
      return makeSprite(g=>{
        px(g,3,10,10,4,col1);
        px(g,4,9,8,1,col1);
        px(g,5,8,6,1,col1);
        px(g,5,12,2,1,col2);
        px(g,9,11,2,1,col2);
      });
    }

    function makeFlowerSprite(petal, petal2, stem){
      return makeSprite(g=>{
        px(g,7,12,2,3,stem);
        px(g,6,10,4,2,stem);
        px(g,6,8,4,2,petal);
        px(g,7,7,2,1,petal2);
        px(g,6,9,1,1,'rgba(255,255,255,.35)');
      });
    }

    function makeMushroomSprite(cap, cap2, stem){
      return makeSprite(g=>{
        px(g,6,12,4,3,stem);
        px(g,5,11,6,1,stem);
        px(g,4,8,8,3,cap);
        px(g,5,7,6,1,cap2);
        px(g,6,9,1,1,'rgba(255,255,255,.35)');
        px(g,9,9,1,1,'rgba(255,255,255,.25)');
      });
    }

    function makeGlowyMushroomSprite(cap, glow, stem){
      return makeSprite(g=>{
        px(g,6,12,4,3,stem);
        px(g,5,11,6,1,stem);
        px(g,4,8,8,3,cap);
        px(g,5,7,6,1,glow);
        px(g,6,9,1,1,'rgba(255,255,255,.55)');
        px(g,9,9,1,1,'rgba(255,255,255,.40)');
      });
    }

    function makeIceCrystalSprite(ice1, ice2){
      return makeSprite(g=>{
        px(g,7,3,2,10,ice1);
        px(g,6,6,1,5,ice2);
        px(g,9,6,1,5,ice2);
        px(g,7,2,2,1,'rgba(255,255,255,.75)');
        px(g,7,13,2,2,ice1);
      });
    }

    function makeBeehiveSprite(honey, honey2, dark){
      return makeSprite(g=>{
        px(g,5,7,6,6,honey);
        px(g,6,6,4,1,honey2);
        px(g,6,9,4,1,honey2);
        px(g,6,12,4,1,honey2);
        px(g,7,10,2,2,dark);
      });
    }

    function makeArchwaySprite(stone, stone2, moss){
      return makeSprite(g=>{
        px(g,3,7,10,8,stone);
        px(g,4,8,8,6,stone2);
        px(g,6,9,4,5,'rgba(0,0,0,.25)'); // hole
        px(g,4,7,2,2,moss);
        px(g,10,7,2,2,moss);
      });
    }

    function makeCottageSprite(){
      // 48x48
      return makeSprite(g=>{
        // roof
        px(g,6,8,36,18,'#b46b5d');
        px(g,8,10,32,14,'#c77a6b');
        // chimney
        px(g,34,4,6,10,'#9a7a6a');
        px(g,35,5,4,8,'#ad8b7a');
        // walls
        px(g,10,24,28,18,'#e8ddc6');
        px(g,12,26,24,14,'#f2ead6');
        // door
        px(g,22,32,8,10,'#7a5a3a');
        px(g,23,33,6,8,'#8a6a3a');
        px(g,28,37,1,1,'rgba(255,255,255,.45)');
        // windows
        px(g,14,30,6,6,'#86b7c6');
        px(g,32,30,6,6,'#86b7c6');
        px(g,15,31,4,4,'rgba(255,255,255,.45)');
        px(g,33,31,4,4,'rgba(255,255,255,.45)');
        // flower boxes
        px(g,14,37,6,2,'#6b4f2a');
        px(g,32,37,6,2,'#6b4f2a');
        px(g,15,36,1,1,'#d88aa5');
        px(g,17,36,1,1,'#d88aa5');
        px(g,33,36,1,1,'#d88aa5');
        px(g,35,36,1,1,'#d88aa5');
      }, 48, 48);
    }

    function makeFranSprite(dir){
      // 16x16 extra-cute chibi sprite (Fran). dir: 0=down,1=up,2=left,3=right
      // Palette: warm hair, rosy cheeks, big eyes, cozy pinafore + apron, little bow.
      const hair1 = '#5a3727';
      const hair2 = '#724534';
      const skin  = '#f3c9b5';
      const eye   = '#2b2a26';
      const eye2  = '#3a3a34';
      const white = '#ffffff';
      const dress = '#8fb9a6';   // sage
      const apron = '#f3ead6';   // linen
      const boots = '#6b4f2a';
      const bow   = '#d88aa5';   // dusty rose
      const blush = 'rgba(216,138,165,.75)';
      return makeSprite(g=>{
        // hair cap
        px(g,4,2,8,4,hair1);
        px(g,3,3,10,3,hair1);
        // hair highlight
        px(g,5,3,6,2,hair2);

        // cute bow (top)
        px(g,7,1,2,1,bow);
        px(g,6,2,1,1,bow);
        px(g,9,2,1,1,bow);

        // face
        px(g,5,5,6,4,skin);

        // cheeks
        px(g,5,7,1,1,blush);
        px(g,10,7,1,1,blush);

        // eyes (big & sparkly)
        if(dir===0){ // down
          px(g,6,6,2,2,eye);
          px(g,9,6,2,2,eye);
          px(g,6,6,1,1,eye2);
          px(g,9,6,1,1,eye2);
          px(g,7,6,1,1,white);
          px(g,10,6,1,1,white);
          // tiny smile
          px(g,8,8,1,1,eye);
        } else if(dir===1){ // up (eyes slightly higher)
          px(g,6,5,2,2,eye);
          px(g,9,5,2,2,eye);
          px(g,7,5,1,1,white);
          px(g,10,5,1,1,white);
        } else if(dir===2){ // left
          px(g,6,6,2,2,eye);
          px(g,7,6,1,1,white);
          px(g,7,8,1,1,eye);
        } else { // right
          px(g,9,6,2,2,eye);
          px(g,10,6,1,1,white);
          px(g,8,8,1,1,eye);
        }

        // hair sides
        if(dir!==1){
          px(g,3,5,2,4,hair1);
          px(g,11,5,2,4,hair1);
        } else {
          // ponytail in back
          px(g,11,3,2,5,hair1);
          px(g,12,4,1,3,hair2);
        }

        // body: dress/pinafore
        px(g,6,9,4,5,dress);
        // apron front
        px(g,7,10,2,3,apron);
        px(g,6,12,4,2,apron);

        // arms
        if(dir===2){
          px(g,4,10,1,3,skin);
        } else if(dir===3){
          px(g,11,10,1,3,skin);
        } else {
          px(g,4,10,1,3,skin);
          px(g,11,10,1,3,skin);
        }

        // boots
        px(g,6,14,2,2,boots);
        px(g,8,14,2,2,boots);
      });
    }

    const SPR = {
      tiles: {},
      ents: {},
      crops: {},
      fran: [makeFranSprite(0), makeFranSprite(1), makeFranSprite(2), makeFranSprite(3)],
      cottage: makeCottageSprite()
    };

    function initSprites(){
      // Ground tiles (we blend by biome; water etc are special)
      SPR.tiles[GROUND.GRASS] = makeTileSprite('#87b978', '#6b8d5f');
      SPR.tiles[GROUND.SHORE] = makeTileSprite('#9cc3b3', '#6e9988');
      SPR.tiles[GROUND.WATER] = makeTileSprite('#5f9fb6', '#3f7f95');
      SPR.tiles[GROUND.STONE] = makeTileSprite('#9aa0a4', '#6f777b');
      SPR.tiles[GROUND.SNOW]  = makeTileSprite('#d6e2ee', '#a6bdd2');
      SPR.tiles[GROUND.MOSS]  = makeTileSprite('#6f7fb6', '#4e5c8f');
      SPR.tiles[GROUND.THORN] = makeTileSprite('#6a9270', '#4e6f54');
      SPR.tiles[GROUND.ORCH]  = makeTileSprite('#bda96f', '#927f4e');

      // Entities
      SPR.ents.tree = makeTreeSprite('#5e8e58', '#7aa36e', '#6b4f2a');
      SPR.ents.pine = makePineSprite('#5e8e58', '#7aa36e', '#6b4f2a');
      SPR.ents.rock = makeRockSprite('#9aa0a4', '#6f777b');
      SPR.ents.ore_copper = makeOreSprite('#9aa0a4', '#6f777b', '#c47a4b');
      SPR.ents.ore_iron   = makeOreSprite('#9aa0a4', '#6f777b', '#c9c9c9');
      SPR.ents.bush = makeBushSprite('#5e8e58', '#7aa36e');
      SPR.ents.berry_bush = makeBushSprite('#4f7a52', '#d88aa5');
      SPR.ents.flower = makeFlowerSprite('#d88aa5', '#f1b8c8', '#6d8f4f');
      SPR.ents.mushroom = makeMushroomSprite('#c77a6b', '#e0a395', '#e8ddc6');
      SPR.ents.glowcap = makeGlowyMushroomSprite('#5f9fb6', '#a7e6ff', '#e8ddc6');
      SPR.ents.ice = makeIceCrystalSprite('#86b7c6', '#d6f2ff');
      SPR.ents.beehive = makeBeehiveSprite('#e7c66a', '#f1dc9b', '#6b4f2a');
      SPR.ents.archway = makeArchwaySprite('#9aa0a4','#6f777b','#7aa36e');
      SPR.ents.shrine = makeArchwaySprite('#bda96f','#927f4e','#d88aa5');

      // Crops (stages)
      function cropStages(base, leaf){
        const arr=[];
        for(let s=0;s<4;s++){
          arr.push(makeSprite(g=>{
            // tilled dirt base
            px(g,2,10,12,4,'#8a6a3a');
            px(g,2,12,12,2,'#6b4f2a');
            if(s===0){
              px(g,8,9,1,1,leaf);
            } else if(s===1){
              px(g,7,8,2,2,leaf);
            } else if(s===2){
              px(g,6,7,4,3,leaf);
              px(g,8,6,1,1,'rgba(255,255,255,.35)');
            } else {
              // mature with bulb
              px(g,6,8,4,4,base);
              px(g,6,7,4,2,leaf);
              px(g,7,9,1,1,'rgba(255,255,255,.35)');
            }
          }));
        }
        return arr;
      }
      SPR.crops.turnip = cropStages('#f2ead6','#7aa36e');
      SPR.crops.blueberry = cropStages('#5f6bb6','#7aa36e');
      SPR.crops.pumpkin = cropStages('#c77a2b','#7aa36e');
      SPR.crops.snowroot = cropStages('#d6e2ee','#86b7c6');
    }
    initSprites();
