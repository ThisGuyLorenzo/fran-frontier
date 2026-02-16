'use strict';

// -----------------------------
    // Inventory helpers
    // -----------------------------
    function invCount(S, id){ return S.inv[id] | 0; }
    function invAdd(S, id, n){
      S.inv[id] = (S.inv[id] | 0) + n;
      if (S.inv[id] <= 0) delete S.inv[id];
    }
    function invHas(S, req){
      for(const [id,n] of Object.entries(req)){
        if ((S.inv[id] | 0) < n) return false;
      }
      return true;
    }
    function invSpend(S, req){
      for(const [id,n] of Object.entries(req)){
        invAdd(S,id,-n);
      }
    }
