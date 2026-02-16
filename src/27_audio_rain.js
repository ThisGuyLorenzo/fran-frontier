'use strict';

// -----------------------------
// Ambient Audio: Procedural Rain
// -----------------------------
// No external assets. Uses WebAudio noise through filters.
// Browsers require a user gesture to start audio; we unlock on first key/pointer.

const AudioFX = (() => {
  const A = {
    enabled: true,
    unlocked: false,
    ctx: null,
    listenersAttached: false,
    noiseBuf: null,
    rain: {
      src: null,
      gain: null,
      hp: null,
      lp: null
    },
    steps: {
      lastX: null,
      lastY: null,
      acc: 0
    }
  };

  function clamp01(v){ return Math.max(0, Math.min(1, v)); }

  function init(){
    if (A.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    A.ctx = ctx;

    // Create a short noise buffer and loop it.
    const dur = 2.0;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i=0; i<len; i++){
      // Slightly softened white noise
      data[i] = (Math.random()*2 - 1) * 0.55;
    }

    A.noiseBuf = buf;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    // Filters for "rain" (band-limited noise): highpass to cut rumble, lowpass to reduce hiss
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 200;
    hp.Q.value = 0.7;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4200;
    lp.Q.value = 0.6;

    const gain = ctx.createGain();
    gain.gain.value = 0;

    src.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);

    try{ src.start(); }catch(e){ /* ignore */ }

    A.rain.src = src;
    A.rain.hp = hp;
    A.rain.lp = lp;
    A.rain.gain = gain;
  }

  function unlock(){
    if (!A.enabled) return;
    if (!A.ctx) init();
    if (!A.ctx) return;

    // Resume if needed
    if (A.ctx.state === 'suspended'){
      A.ctx.resume().catch(()=>{});
    }
    A.unlocked = true;
  }

  function setEnabled(v){
    A.enabled = !!v;
    if (!A.enabled && A.ctx && A.rain.gain){
      A.rain.gain.gain.setTargetAtTime(0, A.ctx.currentTime, 0.05);
    }
  }


  // Quick procedural footstep (no assets): tiny noise + low thump
  function playStep(indoor){
    if (!A.enabled || !A.ctx || !A.unlocked || !A.noiseBuf) return;
    const ctx = A.ctx;
    const t = ctx.currentTime;

    // Noise "scrape"
    const src = ctx.createBufferSource();
    src.buffer = A.noiseBuf;
    src.loop = false;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = indoor ? 340 : 520;
    bp.Q.value = 1.1;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = indoor ? 1200 : 1800;
    lp.Q.value = 0.7;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0, t);
    const peak = indoor ? 0.045 : 0.060;
    g.gain.linearRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    src.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    g.connect(ctx.destination);

    // Random offset so each step sounds a bit different
    const off = Math.random() * 1.6;
    try{ src.start(t, off, 0.10); }catch(e){}
    try{ src.stop(t + 0.12); }catch(e){}

    // Low thump
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(indoor ? 95 : 115, t);

    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0, t);
    og.gain.linearRampToValueAtTime(indoor ? 0.020 : 0.028, t + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(og);
    og.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.10);
  }

  function update(S, dt){
    if (!A.enabled || !A.ctx || !A.unlocked || !A.rain.gain || !S || !S.time) return;

    // Footsteps: derived from player distance traveled
    if (typeof dt === 'number' && S.player && !(S.transition && S.transition.active)){
      const P = S.player;
      if (A.steps.lastX === null){
        A.steps.lastX = P.x;
        A.steps.lastY = P.y;
        A.steps.acc = 0;
      } else {
        const dx = P.x - A.steps.lastX;
        const dy = P.y - A.steps.lastY;
        const moved = Math.hypot(dx, dy);
        A.steps.lastX = P.x;
        A.steps.lastY = P.y;

        const v = Math.hypot(P.vx||0, P.vy||0);
        const moving = v > 8;

        // Slightly faster cadence when running
        const stepDist = (v > 62) ? 10 : 14;

        if (moving){
          A.steps.acc += moved;
          if (A.steps.acc >= stepDist){
            A.steps.acc = 0;
            playStep(S.scene === 'interior');
          }
        } else {
          A.steps.acc = 0;
        }
      }
    }


    const weather = S.time.weather || (S.time.raining ? 'rainy' : 'sunny');
    const rainI = (weather === 'rainy') ? clamp01(S.time.rainIntensity ?? 1) : 0;
    const indoor = (S.scene === 'interior');

    // Indoor is slightly muffled + quieter, but still audible.
    const maxGain = indoor ? 0.11 : 0.16;
    const targetGain = rainI * maxGain;

    const t = A.ctx.currentTime;
    A.rain.gain.gain.setTargetAtTime(targetGain, t, 0.12);

    // Muffle highs indoors
    const lpHz = indoor ? 2600 : 4200;
    A.rain.lp.frequency.setTargetAtTime(lpHz, t, 0.2);
  }

  function attachUnlockListeners(){
    if (A.listenersAttached) return;
    A.listenersAttached = true;

    const handler = () => unlock();
    window.addEventListener('pointerdown', handler, { passive:true });
    window.addEventListener('keydown', handler, { passive:true });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') unlock();
    });
  }

  attachUnlockListeners();

  return { update, unlock, setEnabled };
})();
