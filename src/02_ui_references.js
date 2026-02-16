'use strict';

// -----------------------------
    // UI references
    // -----------------------------
    const el = (id) => document.getElementById(id);
    const canvas = el('game');
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;

    // Fit the fixed internal canvas to the full-screen shell (cover, no distortion).
    const shell = el('gameShell');
    function fitCanvas(){
      const r = shell.getBoundingClientRect();
      const scale = Math.max(r.width / CANVAS_W, r.height / CANVAS_H);
      canvas.style.width = (CANVAS_W * scale) + 'px';
      canvas.style.height = (CANVAS_H * scale) + 'px';
      canvas.style.left = '50%';
      canvas.style.top = '50%';
      canvas.style.transform = 'translate(-50%,-50%)';
    }
    window.addEventListener('resize', fitCanvas);
    document.addEventListener('fullscreenchange', fitCanvas);

    fitCanvas();

    const statusRow = el('statusRow');
    const dayLine = el('dayLine');
    const weatherLine = el('weatherLine');
    const biomeLine = el('biomeLine');
    const hintLine = el('hintLine');
    const hintText = el('hintText');
    const xpFill = el('xpFill');
    const xpText = el('xpText');
    const hotbarEl = el('hotbar');
    const toastsEl = el('toasts');

    const modalInventory = el('modalInventory');
    const modalCraft = el('modalCraft');
    const modalSkills = el('modalSkills');
    const modalJournal = el('modalJournal');
    const modalMap = el('modalMap');
    const modalPause = el('modalPause');
    const pauseWeatherLine = el('pauseWeatherLine');
    const btnFullscreen = el('btnFullscreen');
    const btnToggleHUD = el('btnToggleHUD');
    const btnResetGame = el('btnResetGame');
    const btnRestoreBackup = el('btnRestoreBackup');

    const invList = el('invList');
    const invInfo = el('invInfo');
    const activeSeedLine = el('activeSeedLine');
    const moneyPill = el('moneyPill');

    const craftList = el('craftList');

    const lvlLine = el('lvlLine');
    const pointsLine = el('pointsLine');
    const perkPill = el('perkPill');
    const statList = el('statList');
    const skillList = el('skillList');

    const bioList = el('bioList');
    const resList = el('resList');

    const mapCanvas = el('mapCanvas');
    const mapCtx = mapCanvas.getContext('2d');
    mapCtx.imageSmoothingEnabled = false;
