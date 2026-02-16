'use strict';

// -----------------------------
    // Input
    // -----------------------------
    const keys = new Map();
    let pressE = false;
    let pressSpace = false;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;

      keys.set(e.key.toLowerCase(), true);

      const k = e.key.toLowerCase();

      // Hotbar tools
      if (k>='1' && k<='5'){
        setToolSafe(state, parseInt(k,10));
      }

      // Modals
      if (k === 'tab'){
        e.preventDefault();
        toggleModal(modalInventory, () => rebuildInventoryUI(state));
      }
      if (k === 'c'){
        toggleModal(modalCraft, () => rebuildCraftUI(state));
      }
      if (k === 'k'){
        toggleModal(modalSkills, () => rebuildSkillsUI(state));
      }
      if (k === 'j'){
        toggleModal(modalJournal, () => rebuildJournalUI(state));
      }
      if (k === 'm'){
        toggleModal(modalMap, () => rebuildMapUI(state));
      }
      if (k === 'escape'){
        if (anyModalOpen()) closeAll();
        else toggleModal(modalPause, () => rebuildPauseUI(state));
      }
      if (k === 'p'){
        toggleModal(modalPause, () => rebuildPauseUI(state));
      }

      // Zoom controls (snug camera): [ / ] or - / =
      if (k === '[' || k === '-' || k === '_'){
        // zoom out
        setZoomTarget(zoomTarget - 1);
      }
      if (k === ']' || k === '=' || k === '+'){
        // zoom in
        setZoomTarget(zoomTarget + 1);
      }

      if (k === 'e'){
        pressE = true;
      }
      if (k === ' '){
        pressSpace = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      keys.set(e.key.toLowerCase(), false);
    });

    // Mouse wheel zoom (snaps to integer zoom levels for crisp pixels)
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const dir = Math.sign(e.deltaY);
      if (dir > 0) setZoomTarget(zoomTarget - 1);
      else if (dir < 0) setZoomTarget(zoomTarget + 1);
    }, { passive: false });


    canvas.addEventListener('pointerdown', (e) => {
      // left click only; ignore when menus are open
      if (e.button !== 0) return;
      if (anyModalOpen()) return;
      const t = screenToTile(e);
      setClickInteractTarget(state, t.tx, t.ty);
    });


    function down(k){
      return !!keys.get(k);
    }

    // Click-to-walk + auto-interact (Phase 1)
    function screenToTile(e){
      const rect = canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
      const sy = (e.clientY - rect.top) * (CANVAS_H / rect.height);
      const wx = cam.x + (sx / zoom);
      const wy = cam.y + (sy / zoom);
      return { tx: Math.floor(wx / TILE), ty: Math.floor(wy / TILE) };
    }

    function faceToward(P, fromTx, fromTy, toTx, toTy){
      const dx = toTx - fromTx;
      const dy = toTy - fromTy;
      if (Math.abs(dx) > Math.abs(dy)) P.dir = (dx < 0) ? 2 : 3;
      else P.dir = (dy < 0) ? 1 : 0;
    }

    function setClickInteractTarget(S, tx, ty){
      const P = S.player;
      const pt = playerTile(S);

      // if already adjacent, interact immediately
      if (Math.abs(pt.tx - tx) + Math.abs(pt.ty - ty) === 1){
        faceToward(P, pt.tx, pt.ty, tx, ty);
        interact(S, {tx,ty});
        return;
      }

      // choose an adjacent tile we can stand on
      const candidates = [
        {tx:tx+1, ty},
        {tx:tx-1, ty},
        {tx, ty:ty+1},
        {tx, ty:ty-1},
      ].filter(c => !isSolid(S, c.tx, c.ty));

      if (!candidates.length){
        toast("🚫 Can't get close enough.");
        return;
      }

      candidates.sort((a,b)=>{
        const da = Math.abs(a.tx-pt.tx) + Math.abs(a.ty-pt.ty);
        const db = Math.abs(b.tx-pt.tx) + Math.abs(b.ty-pt.ty);
        return da - db;
      });

      S.nav = { kind:'interact', target:{tx,ty}, approach:candidates[0], lastDist: Infinity, stuck: 0 };
    }


    function toggleModal(modal, onOpen){
      if (modal.classList.contains('show')){
        hideModal(modal);
      } else {
        closeAll();
        showModal(modal);
        if (onOpen) onOpen();
      }
    }

    // Close buttons
    document.querySelectorAll('[data-close]').forEach(btn=>{
      btn.addEventListener('click', () => hideModal(el(btn.dataset.close)));
    });

    // Pause menu buttons
    function toggleFullscreen(){
      const target = el('gameShell');
      if (!document.fullscreenElement){
        (target.requestFullscreen || target.webkitRequestFullscreen || target.mozRequestFullScreen || target.msRequestFullscreen)?.call(target);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen)?.call(document);
      }
    }
    if (btnFullscreen) btnFullscreen.onclick = toggleFullscreen;
    if (btnToggleHUD) btnToggleHUD.onclick = ()=> {
      document.body.classList.toggle('minimalHUD');
      toast(document.body.classList.contains('minimalHUD') ? '🧺 Minimal HUD' : '🧺 HUD restored');
    };


    if (btnResetGame) btnResetGame.onclick = () => {
      if (!safeLocalStorage()){
        toast('⚠️ Storage not available in this browser.');
        return;
      }
      const ok = confirm('Reset to a fresh new game?\n\nThis will overwrite the current save (a backup will be kept).');
      if (!ok) return;
      const prev = localStorage.getItem(SAVE_KEY);
      if (prev) pushBackupRaw(prev);
      localStorage.removeItem(SAVE_KEY);
      state = newGame();
      state.nav = null;
      toast('🌱 Fresh start. Tools must be crafted!');
      closeAll();
    };

    if (btnRestoreBackup) btnRestoreBackup.onclick = () => {
      if (!safeLocalStorage()){
        toast('⚠️ Storage not available in this browser.');
        return;
      }
      const backups = loadBackups();
      if (!backups.length){
        toast('⏪ No previous saves yet.');
        return;
      }
      const lines = backups.slice(0,8).map((b,i)=> `${i+1}. ${new Date(b.t).toLocaleString()}`).join('\n');
      const ans = prompt('Load which previous save?\n\n' + lines + '\n\nEnter a number (1-' + Math.min(8,backups.length) + '):', '1');
      const n = parseInt(ans||'1', 10);
      const idx = clamp((isNaN(n)?1:n)-1, 0, Math.min(7,backups.length-1));
      localStorage.setItem(SAVE_KEY, backups[idx].raw);
      state = loadGame() || newGame();
      state.nav = null;
      toast('⏪ Loaded previous save.');
      closeAll();
    };

    // Inventory buttons
    el('btnSave').onclick = ()=> saveGame(state);
    el('btnExport').onclick = ()=> exportSave(state);
    el('btnNew').onclick = ()=> { if (confirm('Start a fresh world for Fran?')) { state = newGame(); closeAll(); toast('🌱 A new beginning.'); } };
    el('fileImport').addEventListener('change', (e)=>{
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      importSave(f, (S)=>{ state = S; closeAll(); });
    });

    el('btnFastTravel').onclick = ()=> fastTravel(state);

    function fastTravel(S){
      const P = S.player;
      if (!S.knownArchways.length){
        toast('🪨 No archways discovered yet.');
        return;
      }
      const {tx,ty} = playerTile(S);
      let best=null, bestD=1e9;
      for(const a of S.knownArchways){
        const d = Math.hypot(a.tx-tx, a.ty-ty);
        if (d < bestD){ bestD=d; best=a; }
      }
      const cost = 20;
      if (P.stamina < cost){
        toast('😮‍💨 Too tired to fast travel.');
        return;
      }
      P.stamina -= cost;
      P.x = best.tx * TILE;
      P.y = best.ty * TILE + TILE; // land in front
      S.time.t01 = clamp(S.time.t01 + 0.08, 0, 0.99);
      awardXP(S,'exploration', 8);
      toast('✨ Fast traveled via archway.');
      rebuildMapUI(S);
      markDiscovery(S);
    }
