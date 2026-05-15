class MemoryGame {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.animId = null; this.running = true; this._last = null;
    this.CHARACTERS = [
      { id: "hotdog", label: "Hot Dog", emoji: "🌭" },
      { id: "burger", label: "X-Burguer", emoji: "🍔" },
      { id: "dog", label: "Dogao", emoji: "🐕" },
    ];
    this.EMOJIS = ["🌭","🍔","🐕","🌭","🍔","🐕","⭐","🔥","💎","⭐","🔥","💎","🎮","🎯","🚀","🎮","🎯","🚀","👑","⚽","🏆","👑","⚽","🏆"];
    this.COLS = 6; this.ROWS = 4; this.setupCanvas(); this.init();
  }
  setupCanvas() { this.canvas.width = 480; this.canvas.height = 400; this.canvas.style.cssText = "width:100%;height:100%;display:block;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("mem_high")||0),
      character: "hotdog", difficulty: "medium", cards: [], flipped: [], matched: new Set(), attempts: 0, canFlip: true
    };
    this.createUI(); this.bindEvents(); this.render(); this._last = performance.now(); this.loop();
  }
  shuffleCards() { const a = [...this.EMOJIS]; for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
  createUI() {
    const par = this.canvas.parentElement; this.ui = document.createElement("div"); this.ui.id = "mem-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;";
    this.ui.innerHTML = `
      <div style="position:absolute;top:8px;left:12px;right:12px;z-index:5;display:flex;justify-content:space-between;color:#fff;font-size:11px;font-family:'Press Start 2P',monospace;text-shadow:0 2px 4px rgba(0,0,0,0.5);">
        <span>🏆 <span id="mem-high">${this.state.highScore}</span></span>
        <span>👆 <span id="mem-att">0</span></span>
        <span>✓ <span id="mem-pairs">0</span></span>
      </div>
      <section class="screen dino-start hidden" id="mem-startScreen">
        <div class="title-stack" style="animation:popIn 0.55s 0.15s both;">
          <h1 style="color:#facc15;font-size:clamp(32px,10vw,52px);margin:0;">Dogao</h1>
          <h2 style="color:white;font-size:clamp(36px,11vw,60px);margin:0;">Memory</h2>
        </div>
        <div style="font-size:clamp(48px,14vw,72px);margin:8px 0;animation:bob 1.8s ease-in-out infinite;">🧠</div>
        <p style="color:rgba(254,240,138,0.9);font-size:10px;font-family:'Press Start 2P',monospace;margin:0 0 6px;">🏆 RECORDE: ${this.state.highScore}</p>
        <button class="play-button" style="min-width:180px;margin-top:6px;border:4px solid #fff3a3;border-radius:999px;padding:11px 24px;background:#facc15;color:#8b1d12;box-shadow:0 13px 24px rgba(0,0,0,0.32);font-size:clamp(20px,7vw,30px);cursor:pointer;pointer-events:auto;" id="mem-play">▶ JOGAR</button>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.52);font-size:8px;">CLIQUE: VIRAR CARTA</p>
      </section>
      <section class="screen dino-over hidden" id="mem-overScreen">
        <div class="gameover-card" style="width:min(80vw,300px);border:4px solid #facc15;border-radius:24px;padding:20px;background:white;color:#a80d0d;box-shadow:0 24px 70px rgba(0,0,0,0.34);animation:popIn 0.42s both;">
          <div style="font-size:40px;">🎉</div>
          <h2 style="margin:4px 0 8px;font-size:26px;">PARABENS!</h2>
          <p class="hidden" id="mem-newR" style="color:#eab308;font-size:9px;">★ NOVO RECORDE! ★</p>
          <div class="result-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px;">
            <div style="border-radius:16px;padding:12px 8px;background:#fef2f2;"><span style="color:#ef4444;font-size:7px;">PONTOS</span><strong id="mem-final" style="font-size:36px;">0</strong></div>
            <div style="border-radius:16px;padding:12px 8px;background:#fff7d1;"><span style="color:#ef4444;font-size:7px;">RECORDE</span><strong id="mem-best" style="font-size:36px;">0</strong></div>
          </div>
          <button class="again-button" style="border:2px solid #facc15;border-radius:999px;padding:10px 22px;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;box-shadow:0 8px 20px rgba(185,28,28,0.35);font-size:20px;cursor:pointer;pointer-events:auto;" id="mem-again">↻ DE NOVO!</button>
        </div>
      </section>
    `;
    par.appendChild(this.ui);
    this.scoreEl = document.getElementById("mem-att"); this.highEl = document.getElementById("mem-high");
    this.pairEl = document.getElementById("mem-pairs"); this.startScr = document.getElementById("mem-startScreen");
    this.overScr = document.getElementById("mem-overScreen"); this.finalEl = document.getElementById("mem-final");
    this.bestEl = document.getElementById("mem-best"); this.newREl = document.getElementById("mem-newR");
    document.getElementById("mem-play").addEventListener("click",()=>this.startGame());
    document.getElementById("mem-again").addEventListener("click",()=>this.startGame());
    this.startScr.classList.remove("hidden");
  }
  startGame() {
    this.state.mode = "playing"; this.state.attempts = 0; this.state.matched = new Set(); this.state.flipped = []; this.state.canFlip = true;
    const emojis = this.shuffleCards();
    this.state.cards = emojis.map((e,i)=>({emoji:e,id:i,flipped:false,matched:false}));
    this.scoreEl.textContent = "0"; this.pairEl.textContent = "0";
    this.startScr.classList.add("hidden"); this.overScr.classList.add("hidden");
  }
  flipCard(idx) {
    if (!this.state.canFlip || this.state.mode !== "playing") return;
    const card = this.state.cards[idx];
    if (!card || card.flipped || card.matched) return;
    card.flipped = true; this.state.flipped.push(idx);
    if (this.state.flipped.length === 2) {
      this.state.attempts++; this.scoreEl.textContent = this.state.attempts;
      this.state.canFlip = false;
      const [a,b] = this.state.flipped;
      if (this.state.cards[a].emoji === this.state.cards[b].emoji) {
        this.state.cards[a].matched = true; this.state.cards[b].matched = true;
        this.state.matched.add(a); this.state.matched.add(b);
        this.pairEl.textContent = this.state.matched.size / 2;
        this.state.flipped = []; this.state.canFlip = true;
        if (this.state.matched.size === this.state.cards.length) { this.finishGame(); }
      } else {
        setTimeout(() => { this.state.cards[a].flipped = false; this.state.cards[b].flipped = false; this.state.flipped = []; this.state.canFlip = true; }, 800);
      }
    }
  }
  finishGame() {
    const pts = Math.max(100 - this.state.attempts * 2 + 50, 10);
    this.state.score = pts;
    const isR = pts > this.state.highScore;
    if (isR) { this.state.highScore = pts; localStorage.setItem("mem_high",String(this.state.highScore)); this.highEl.textContent = this.state.highScore; }
    this.finalEl.textContent = pts; this.bestEl.textContent = this.state.highScore;
    this.newREl.classList.toggle("hidden", !isR); this.overScr.classList.remove("hidden");
  }
  render() {
    const ctx = this.ctx; const w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0,0,w,h);
    if (this.state.mode !== "playing") return;
    const cw = w / this.COLS, ch = h / this.ROWS, pad = 4;
    for (const card of this.state.cards) {
      const col = card.id % this.COLS, row = Math.floor(card.id / this.COLS);
      const x = col * cw + pad, y = row * ch + pad, ww = cw - pad*2, hh = ch - pad*2;
      if (card.matched) { ctx.fillStyle = "rgba(34,197,94,0.25)"; ctx.fillRect(x,y,ww,hh); }
      if (card.flipped || card.matched) {
        ctx.fillStyle = card.matched ? "rgba(34,197,94,0.3)" : "#facc15";
        ctx.fillRect(x,y,ww,hh);
        ctx.font = `${Math.min(ww,hh)*0.5}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#000"; ctx.fillText(card.emoji, x + ww/2, y + hh/2);
      } else {
        ctx.fillStyle = "#C81010"; ctx.fillRect(x,y,ww,hh);
        ctx.fillStyle = "rgba(250,204,21,0.2)"; ctx.fillRect(x+4,y+4,ww-8,hh-8);
        ctx.fillStyle = "#facc15"; ctx.font = `${Math.min(ww,hh)*0.3}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("?", x + ww/2, y + hh/2);
      }
    }
  }
  bindEvents() {
    this._clk = (e) => {
      if (this.state.mode !== "playing") return;
      const rect = this.canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) / rect.width * this.canvas.width;
      const sy = (e.clientY - rect.top) / rect.height * this.canvas.height;
      const col = Math.floor(sx / (this.canvas.width / this.COLS));
      const row = Math.floor(sy / (this.canvas.height / this.ROWS));
      const idx = row * this.COLS + col;
      if (idx >= 0 && idx < this.state.cards.length) this.flipCard(idx);
    };
    this.canvas.addEventListener("click", this._clk);
    this._kd = (e) => { if ((e.code === "Space" || e.code === "Enter") && (this.state.mode === "start" || this.state.mode === "gameover")) this.startGame(); };
    window.addEventListener("keydown", this._kd);
  }
  loop() { this.render(); if(this.running)this.animId=requestAnimationFrame(()=>this.loop()); }
  destroy() { this.running=false; if(this.animId)cancelAnimationFrame(this.animId); window.removeEventListener("keydown",this._kd); this.canvas.removeEventListener("click",this._clk); if(this.ui)this.ui.remove(); }
}
