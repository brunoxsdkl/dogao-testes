class WhackGame {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.animId = null; this.running = true; this._last = null;
    this.setupCanvas(); this.init();
  }
  setupCanvas() { this.canvas.width = 400; this.canvas.height = 500; this.canvas.style.cssText = "width:100%;height:100%;display:block;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("whack_high")||0),
      timeLeft: 30, difficulty: "medium", holes: [], moleTimer: 0, gameTimer: null
    };
    this.HOLES = [
      {x:70,y:140},{x:200,y:140},{x:330,y:140},
      {x:70,y:260},{x:200,y:260},{x:330,y:260},
      {x:70,y:380},{x:200,y:380},{x:330,y:380},
    ];
    this.createUI(); this.bindEvents(); this.render(); this._last = performance.now(); this.loop();
  }
  createUI() {
    const par = this.canvas.parentElement; this.ui = document.createElement("div"); this.ui.id = "whack-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;";
    this.ui.innerHTML = `
      <div style="position:absolute;top:8px;left:12px;right:12px;z-index:5;display:flex;justify-content:space-between;color:#fff;font-size:11px;font-family:'Press Start 2P',monospace;text-shadow:0 2px 4px rgba(0,0,0,0.5);">
        <span>🏆 <span id="whack-high">${this.state.highScore}</span></span>
        <span>⏱ <span id="whack-time">30</span>s</span>
        <span>⭐ <span id="whack-score">0</span></span>
      </div>
      <section class="screen dino-start hidden" id="whack-startScreen">
        <div class="title-stack" style="animation:popIn 0.55s 0.15s both;">
          <h1 style="color:#facc15;font-size:clamp(32px,10vw,52px);margin:0;">Dogao</h1>
          <h2 style="color:white;font-size:clamp(36px,11vw,60px);margin:0;">Whack</h2>
        </div>
        <div style="font-size:clamp(48px,14vw,72px);margin:8px 0;animation:bob 1.8s ease-in-out infinite;">🔨</div>
        <p style="color:rgba(254,240,138,0.9);font-size:10px;font-family:'Press Start 2P',monospace;margin:0 0 6px;">🏆 RECORDE: ${this.state.highScore}</p>
        <div class="chooser" style="width:min(100%,280px);margin:4px 0;"><p style="margin:0 0 6px;font-size:8px;">DIFICULDADE</p><div class="card-row" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;" id="whack-diffs"></div></div>
        <button class="play-button" style="min-width:180px;margin-top:6px;border:4px solid #fff3a3;border-radius:999px;padding:11px 24px;background:#facc15;color:#8b1d12;box-shadow:0 13px 24px rgba(0,0,0,0.32);font-size:clamp(20px,7vw,30px);cursor:pointer;pointer-events:auto;" id="whack-play">▶ JOGAR</button>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.52);font-size:8px;">TOQUE: ACERTAR</p>
      </section>
      <section class="screen dino-over hidden" id="whack-overScreen">
        <div class="gameover-card" style="width:min(80vw,300px);border:4px solid #facc15;border-radius:24px;padding:20px;background:white;color:#a80d0d;box-shadow:0 24px 70px rgba(0,0,0,0.34);animation:popIn 0.42s both;">
          <div style="font-size:40px;">⏰</div>
          <h2 style="margin:4px 0 8px;font-size:26px;">FIM DE TEMPO!</h2>
          <p class="hidden" id="whack-newR" style="color:#eab308;font-size:9px;">★ NOVO RECORDE! ★</p>
          <div class="result-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px;">
            <div style="border-radius:16px;padding:12px 8px;background:#fef2f2;"><span style="color:#ef4444;font-size:7px;">ACERTOS</span><strong id="whack-final" style="font-size:36px;">0</strong></div>
            <div style="border-radius:16px;padding:12px 8px;background:#fff7d1;"><span style="color:#ef4444;font-size:7px;">RECORDE</span><strong id="whack-best" style="font-size:36px;">0</strong></div>
          </div>
          <button class="again-button" style="border:2px solid #facc15;border-radius:999px;padding:10px 22px;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;box-shadow:0 8px 20px rgba(185,28,28,0.35);font-size:20px;cursor:pointer;pointer-events:auto;" id="whack-again">↻ DE NOVO!</button>
        </div>
      </section>
    `;
    par.appendChild(this.ui);
    this.scoreEl = document.getElementById("whack-score"); this.highEl = document.getElementById("whack-high");
    this.timeEl = document.getElementById("whack-time"); this.startScr = document.getElementById("whack-startScreen");
    this.overScr = document.getElementById("whack-overScreen"); this.finalEl = document.getElementById("whack-final");
    this.bestEl = document.getElementById("whack-best"); this.newREl = document.getElementById("whack-newR");

    this.diffs = [{id:"easy",label:"Facil",emoji:"😊"},{id:"medium",label:"Medio",emoji:"😤"},{id:"hard",label:"Dificil",emoji:"💀"}];
    const dEl = document.getElementById("whack-diffs");
    for (const d of this.diffs) {
      const b = document.createElement("button"); b.className="card"; b.type="button"; b.style.pointerEvents="auto";
      b.innerHTML=`<span class="emoji">${d.emoji}</span><span>${d.label}</span>`;
      b.addEventListener("click",()=>{this.state.difficulty=d.id;for(const x of dEl.children)x.classList.toggle("active",x===b);});
      dEl.appendChild(b);
    }
    document.getElementById("whack-play").addEventListener("click",()=>this.startGame());
    document.getElementById("whack-again").addEventListener("click",()=>this.startGame());
    this.startScr.classList.remove("hidden");
    this.state.difficulty = "medium";
  }
  startGame() {
    this.state.mode = "playing"; this.state.score = 0; this.state.timeLeft = 30; this.state.moleTimer = 0;
    this.state.holes = this.HOLES.map(h=>({...h,active:false,timer:0}));
    this.scoreEl.textContent = "0"; this.timeEl.textContent = "30";
    this.startScr.classList.add("hidden"); this.overScr.classList.add("hidden");
    this.state.gameTimer = setInterval(() => {
      this.state.timeLeft--;
      this.timeEl.textContent = this.state.timeLeft;
      if (this.state.timeLeft <= 0) { this.finishGame(); }
    }, 1000);
  }
  finishGame() {
    if (this.state.gameTimer) { clearInterval(this.state.gameTimer); this.state.gameTimer = null; }
    this.state.mode = "gameover";
    for (const h of this.state.holes) h.active = false;
    const isR = this.state.score > this.state.highScore;
    if (isR) { this.state.highScore = this.state.score; localStorage.setItem("whack_high",String(this.state.highScore)); this.highEl.textContent = this.state.highScore; }
    this.finalEl.textContent = this.state.score; this.bestEl.textContent = this.state.highScore;
    this.newREl.classList.toggle("hidden", !isR); this.overScr.classList.remove("hidden");
  }
  updateGame() {
    if (this.state.mode !== "playing") return;
    const spawnRate = {easy:70,medium:45,hard:25}[this.state.difficulty] || 45;
    const dur = {easy:80,medium:55,hard:40}[this.state.difficulty] || 55;
    this.state.moleTimer++;
    if (this.state.moleTimer >= spawnRate) {
      this.state.moleTimer = 0;
      const inactive = this.state.holes.filter(h => !h.active);
      if (inactive.length > 0) {
        const pick = inactive[Math.floor(Math.random() * inactive.length)];
        pick.active = true; pick.timer = 0;
      }
    }
    for (const h of this.state.holes) {
      if (h.active) { h.timer++; if (h.timer >= dur) h.active = false; }
    }
  }
  render() {
    const ctx = this.ctx; const w = this.canvas.width, h = this.canvas.height;
    const grad = ctx.createLinearGradient(0,0,0,h); grad.addColorStop(0,"#0a0a1a"); grad.addColorStop(1,"#1a3a0a");
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
    const grdY = 420; ctx.fillStyle = "#3d2b1f"; ctx.fillRect(0,grdY,w,h-grdY);
    ctx.strokeStyle = "#5c4033"; ctx.lineWidth = 2;
    for (const h of this.state.holes) {
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 38, 16, 0, 0, Math.PI*2); ctx.fillStyle = "#1a0f0a"; ctx.fill(); ctx.stroke();
      if (h.active) {
        const em = this.state.difficulty === "hard" ? "👾" : "🐭";
        ctx.font = "44px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(em, h.x, h.y - 4);
      }
    }
  }
  bindEvents() {
    this._clk = (e) => {
      if (this.state.mode !== "playing") return;
      const rect = this.canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) / rect.width * this.canvas.width;
      const sy = (e.clientY - rect.top) / rect.height * this.canvas.height;
      for (const h of this.state.holes) {
        if (h.active && Math.abs(sx - h.x) < 40 && Math.abs(sy - h.y) < 30) {
          h.active = false; this.state.score++; this.scoreEl.textContent = this.state.score;
          break;
        }
      }
    };
    this.canvas.addEventListener("click", this._clk);
    this.canvas.addEventListener("touchstart", (e) => { e.preventDefault(); const t = e.changedTouches[0]; this._clk(t); }, {passive:false});
  }
  loop() { const n=performance.now(); const e=n-(this._last||n); this._last=n; const s=Math.max(1,Math.min(3,Math.round(e/16.67))); for(let i=0;i<s;i++)this.updateGame(); this.render(); if(this.running)this.animId=requestAnimationFrame(()=>this.loop()); }
  destroy() { this.running=false; if(this.animId)cancelAnimationFrame(this.animId); if(this.state.gameTimer)clearInterval(this.state.gameTimer); this.canvas.removeEventListener("click",this._clk); if(this.ui)this.ui.remove(); }
}
