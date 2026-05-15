class SimonGame {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.animId = null; this.running = true; this._last = null;
    this.setupCanvas(); this.init();
  }
  setupCanvas() { this.canvas.width = 400; this.canvas.height = 500; this.canvas.style.cssText = "width:100%;height:100%;display:block;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("simon_high")||0),
      difficulty: "medium", sequence: [], playerIdx: 0, showing: false, showIdx: 0, showTimer: 0,
      round: 1, locked: true
    };
    this.COLORS = [
      {id:"red",label:"Vermelho",fill:"#C81010",light:"#ff4444"},
      {id:"green",label:"Verde",fill:"#16a34a",light:"#4ade80"},
      {id:"blue",label:"Azul",fill:"#2563eb",light:"#60a5fa"},
      {id:"yellow",label:"Amarelo",fill:"#eab308",light:"#facc15"},
    ];
    this.PAD = 20; this.GAP = 12;
    this.createUI(); this.bindEvents(); this.render(); this._last = performance.now(); this.loop();
  }
  createUI() {
    const par = this.canvas.parentElement; this.ui = document.createElement("div"); this.ui.id = "simon-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;";
    this.ui.innerHTML = `
      <div style="position:absolute;top:8px;left:12px;right:12px;z-index:5;display:flex;justify-content:space-between;color:#fff;font-size:11px;font-family:'Press Start 2P',monospace;text-shadow:0 2px 4px rgba(0,0,0,0.5);">
        <span>🏆 <span id="simon-high">${this.state.highScore}</span></span>
        <span>📍 <span id="simon-round">1</span></span>
        <span>⭐ <span id="simon-score">0</span></span>
      </div>
      <section class="screen dino-start hidden" id="simon-startScreen">
        <div class="title-stack" style="animation:popIn 0.55s 0.15s both;">
          <h1 style="color:#facc15;font-size:clamp(32px,10vw,52px);margin:0;">Dogao</h1>
          <h2 style="color:white;font-size:clamp(36px,11vw,60px);margin:0;">Simon</h2>
        </div>
        <div style="font-size:clamp(48px,14vw,72px);margin:8px 0;animation:bob 1.8s ease-in-out infinite;">🔴🟡</div>
        <p style="color:rgba(254,240,138,0.9);font-size:10px;font-family:'Press Start 2P',monospace;margin:0 0 6px;">🏆 RECORDE: ${this.state.highScore}</p>
        <div class="chooser" style="width:min(100%,280px);margin:4px 0;"><p style="margin:0 0 6px;font-size:8px;">DIFICULDADE</p><div class="card-row" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;" id="simon-diffs"></div></div>
        <button class="play-button" style="min-width:180px;margin-top:6px;border:4px solid #fff3a3;border-radius:999px;padding:11px 24px;background:#facc15;color:#8b1d12;box-shadow:0 13px 24px rgba(0,0,0,0.32);font-size:clamp(20px,7vw,30px);cursor:pointer;pointer-events:auto;" id="simon-play">▶ JOGAR</button>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.52);font-size:8px;">REPITA A SEQUENCIA!</p>
      </section>
      <section class="screen dino-over hidden" id="simon-overScreen">
        <div class="gameover-card" style="width:min(80vw,300px);border:4px solid #facc15;border-radius:24px;padding:20px;background:white;color:#a80d0d;box-shadow:0 24px 70px rgba(0,0,0,0.34);animation:popIn 0.42s both;">
          <div style="font-size:40px;">😵</div>
          <h2 style="margin:4px 0 8px;font-size:26px;">ERROU!</h2>
          <p class="hidden" id="simon-newR" style="color:#eab308;font-size:9px;">★ NOVO RECORDE! ★</p>
          <div class="result-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px;">
            <div style="border-radius:16px;padding:12px 8px;background:#fef2f2;"><span style="color:#ef4444;font-size:7px;">RODADAS</span><strong id="simon-final" style="font-size:36px;">0</strong></div>
            <div style="border-radius:16px;padding:12px 8px;background:#fff7d1;"><span style="color:#ef4444;font-size:7px;">RECORDE</span><strong id="simon-best" style="font-size:36px;">0</strong></div>
          </div>
          <button class="again-button" style="border:2px solid #facc15;border-radius:999px;padding:10px 22px;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;box-shadow:0 8px 20px rgba(185,28,28,0.35);font-size:20px;cursor:pointer;pointer-events:auto;" id="simon-again">↻ DE NOVO!</button>
        </div>
      </section>
    `;
    par.appendChild(this.ui);
    this.scoreEl = document.getElementById("simon-score"); this.highEl = document.getElementById("simon-high");
    this.roundEl = document.getElementById("simon-round"); this.startScr = document.getElementById("simon-startScreen");
    this.overScr = document.getElementById("simon-overScreen"); this.finalEl = document.getElementById("simon-final");
    this.bestEl = document.getElementById("simon-best"); this.newREl = document.getElementById("simon-newR");

    this.diffs = [{id:"easy",label:"Facil",emoji:"😊"},{id:"medium",label:"Medio",emoji:"😤"},{id:"hard",label:"Dificil",emoji:"💀"}];
    const dEl = document.getElementById("simon-diffs");
    for (const d of this.diffs) {
      const b = document.createElement("button"); b.className="card"; b.type="button"; b.style.pointerEvents="auto";
      b.innerHTML=`<span class="emoji">${d.emoji}</span><span>${d.label}</span>`;
      b.addEventListener("click",()=>{this.state.difficulty=d.id;for(const x of dEl.children)x.classList.toggle("active",x===b);});
      dEl.appendChild(b);
    }
    document.getElementById("simon-play").addEventListener("click",()=>this.startGame());
    document.getElementById("simon-again").addEventListener("click",()=>this.startGame());
    this.startScr.classList.remove("hidden");
    this.state.difficulty = "medium";
  }
  startGame() {
    this.state.mode = "playing"; this.state.score = 0; this.state.round = 1; this.state.sequence = [];
    this.state.playerIdx = 0; this.state.showing = false; this.state.locked = true;
    this.curShowId = -1; this.showTimer = 0;
    this.scoreEl.textContent = "0"; this.roundEl.textContent = "1";
    this.startScr.classList.add("hidden"); this.overScr.classList.add("hidden");
    this.nextRound();
  }
  nextRound() {
    this.state.sequence.push(Math.floor(Math.random() * 4));
    this.state.playerIdx = 0;
    this.state.showing = true;
    this.state.showIdx = 0;
    this.state.locked = true;
    this.curShowId = -1;
    this._showStart = performance.now();
  }
  finishGame() {
    this.state.mode = "gameover";
    const r = this.state.round - 1;
    this.state.score = (r * 10) * (this.state.round || 1);
    const isR = this.state.score > this.state.highScore;
    if (isR) { this.state.highScore = this.state.score; localStorage.setItem("simon_high",String(this.state.highScore)); this.highEl.textContent = this.state.highScore; }
    this.finalEl.textContent = r; this.bestEl.textContent = `${Math.max(0, Math.floor(this.state.highScore / 10))} rod`;
    this.newREl.classList.toggle("hidden", !isR); this.overScr.classList.remove("hidden");
  }
  updateGame() {
    if (this.state.mode !== "playing") return;
    if (this.state.showing) {
      const delay = {easy:600,medium:450,hard:300}[this.state.difficulty] || 450;
      if (typeof this._showStart === "undefined") this._showStart = performance.now();
      const elapsed = performance.now() - this._showStart;
      const idx = Math.floor(elapsed / delay);
      if (idx >= this.state.sequence.length) {
        this.state.showing = false;
        this.state.locked = false;
        this.state.playerIdx = 0;
        this.curShowId = -1;
      } else {
        this.curShowId = this.state.sequence[idx];
      }
    }
  }
  handleTap(idx) {
    if (this.state.mode !== "playing" || this.state.showing || this.state.locked) return;
    this.curShowId = idx;
    setTimeout(() => { if (this.curShowId === idx) this.curShowId = -1; }, 200);
    if (idx === this.state.sequence[this.state.playerIdx]) {
      this.state.playerIdx++;
      if (this.state.playerIdx >= this.state.sequence.length) {
        this.state.round++;
        this.roundEl.textContent = this.state.round;
        this.state.score += this.state.round * 10;
        this.scoreEl.textContent = this.state.score;
        this.state.locked = true;
        setTimeout(() => this.nextRound(), 500);
      }
    } else {
      this.finishGame();
    }
  }
  render() {
    const ctx = this.ctx; const w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = "#0a0a1a"; ctx.fillRect(0,0,w,h);
    const gridW = Math.min(w - this.PAD * 2, h - this.PAD * 2 - 40);
    const cellW = (gridW - this.GAP) / 2;
    const ox = (w - gridW) / 2, oy = this.PAD + 30;
    for (let i = 0; i < 4; i++) {
      const c = this.COLORS[i];
      const col = i % 2, row = Math.floor(i / 2);
      const x = ox + col * (cellW + this.GAP), y = oy + row * (cellW + this.GAP);
      const isLit = this.curShowId === i;
      ctx.fillStyle = isLit ? c.light : c.fill;
      ctx.beginPath();
      const r = 14;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + cellW - r, y);
      ctx.quadraticCurveTo(x + cellW, y, x + cellW, y + r);
      ctx.lineTo(x + cellW, y + cellW - r);
      ctx.quadraticCurveTo(x + cellW, y + cellW, x + cellW - r, y + cellW);
      ctx.lineTo(x + r, y + cellW);
      ctx.quadraticCurveTo(x, y + cellW, x, y + cellW - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      if (isLit) { ctx.shadowColor = c.light; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0; }
    }
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px 'Press Start 2P',monospace"; ctx.textAlign = "center";
    ctx.fillText("SIMON", w/2, h - 14);
  }
  bindEvents() {
    this._clk = (e) => {
      if (this.state.mode !== "playing" || this.state.showing) return;
      const rect = this.canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) / rect.width * this.canvas.width;
      const sy = (e.clientY - rect.top) / rect.height * this.canvas.height;
      const gridW = Math.min(this.canvas.width - this.PAD * 2, this.canvas.height - this.PAD * 2 - 40);
      const cellW = (gridW - this.GAP) / 2;
      const ox = (this.canvas.width - gridW) / 2, oy = this.PAD + 30;
      for (let i = 0; i < 4; i++) {
        const col = i % 2, row = Math.floor(i / 2);
        const x = ox + col * (cellW + this.GAP), y = oy + row * (cellW + this.GAP);
        if (sx >= x && sx <= x + cellW && sy >= y && sy <= y + cellW) { this.handleTap(i); return; }
      }
    };
    this.canvas.addEventListener("click", this._clk);
    this.canvas.addEventListener("touchstart", (e) => { e.preventDefault(); const t = e.changedTouches[0]; this._clk(t); }, {passive:false});
  }
  loop() { this.updateGame(); this.render(); if(this.running)this.animId=requestAnimationFrame(()=>this.loop()); }
  destroy() { this.running=false; if(this.animId)cancelAnimationFrame(this.animId); this.canvas.removeEventListener("click",this._clk); if(this.ui)this.ui.remove(); }
}
