'use strict';

// -----------------------------
// Toasts (DOM-stable: no flicker)
// -----------------------------
const toastQueue = [];
let toastId = 1;

function toast(msg){
  // Create once; keep DOM nodes stable so CSS animations don't restart every frame.
  const id = toastId++;
  const item = { id, msg, t: 4.2, el: null };
  toastQueue.push(item);

  if (!toastsEl) return;

  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  item.el = d;
  toastsEl.appendChild(d);
}

function tickToasts(dt){
  if (!dt || dt <= 0) return;

  for (let i = toastQueue.length - 1; i >= 0; i--){
    const it = toastQueue[i];
    it.t -= dt;

    // Fade out near the end (last 0.35s)
    if (it.el){
      if (it.t < 0.35){
        const a = Math.max(0, it.t / 0.35);
        it.el.style.opacity = String(a);
        it.el.style.transform = `translateY(${Math.round((1-a)*6)}px)`;
      } else {
        it.el.style.opacity = '';
        it.el.style.transform = '';
      }
    }

    if (it.t <= 0){
      if (it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el);
      toastQueue.splice(i, 1);
    }
  }

  // Keep only last 4 visible nodes (remove older DOM nodes if needed)
  if (toastsEl){
    while (toastsEl.children.length > 4){
      toastsEl.removeChild(toastsEl.firstChild);
    }
  }
}
