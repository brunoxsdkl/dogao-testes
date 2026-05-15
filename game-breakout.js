class BreakoutGame {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.animId = null; this.running = true; this._last = null;
    this.CHARACTERS = [
      { id: "hotdog", label: "Hot Dog", emoji: "🌭" },
      { id: "burger", label: "X-Burguer", emoji: "🍔" },
      { id: "dog", label: "Dogao", emoji: "🐕" },
    ];
    this.setupCanvas(); this.init();
  }
  setupCanvas() { this.canvas.width = 600; this.canvas.height = 500; this.canvas.style.cssText = "width:100%;height:100%;display:block;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("break_high")||0),
      character: "hotdog", difficulty: "medium", lives: 3,
      paddle: {x:250,y:460,w:80,h:12}, ball: {x:290,y:445,r:7,dx:3,dy:-3}, bricks: []
    };
    this.spawnBricks();
    this.createUI(); this.bindEvents(); this.render(); this._last = performance.now(); this.loop();
  }
  spawnBricks() {
    this.state.bricks = [];
    const rows = 5, cols = 8, bw = 62, bh = 20, pad = 8, top = 40;
    const colors = ["#C81010","#E82020","#facc15","#D4903C","#C81010"];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      this.state.bricks.push({x: pad + c * (bw + pad), y: top + r * (bh + pad), w: bw, h: bh, alive: true, color: colors[r]});
    }
  }
  createUI() {
    const par = this.canvas.parentElement; this.ui = document.createElement("div"); this.ui.id = "brk-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;";
    this.ui.innerHTML = `
      <div style="position:absolute;top:8px;left:12px;right:12px;z-index:5;display:flex;justify-content:space-between;color:#fff;font-size:11px;font-family:'Press Start 2P',monospace;text-shadow:0 2px 4px rgba(0,0,0,0.5);">
        <span>🏆 <span id="brk-high">${this.state.highScore}</span></span>
        <span>❤️ <span id="brk-lives">3</span></span>
        <span>⭐ <span id="brk-score">0</span></span>
      </div>
      <section class="screen dino-start hidden" id="brk-startScreen">
        <div class="title-stack" style="animation:popIn 0.55s 0.15s both;">
          <h1 style="color:#facc15;font-size:clamp(32px,10vw,52px);margin:0;">Dogao</h1>
          <h2 style="color:white;font-size:clamp(36px,11vw,60px);margin:0;">Breakout</h2>
        </div>
        <div style="font-size:clamp(48px,14vw,72px);margin:8px 0;animation:bob 1.8s ease-in-out infinite;">🏓</div>
        <p style="color:rgba(254,240,138,0.9);font-size:10px;font-family:'Press Start 2P',monospace;margin:0 0 6px;">🏆 RECORDE: ${this.state.highScore}</p>
        <button class="play-button" style="min-width:180px;margin-top:6px;border:4px solid #fff3a3;border-radius:999px;padding:11px 24px;background:#facc15;color:#8b1d12;box-shadow:0 13px 24px rgba(0,0,0,0.32);font-size:clamp(20px,7vw,30px);cursor:pointer;pointer-events:auto;" id="brk-play">▶ JOGAR</button>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.52);font-size:8px;">SETAS: MOVER RАQUETE</p>
      </section>
      <section class="screen dino-over hidden" id="brk-overScreen">
        <div class="gameover-card" style="width:min(80vw,300px);border:4px solid #facc15;border-radius:24px;padding:20px;background:white;color:#a80d0d;box-shadow:0 24px 70px rgba(0,0,0,0.34);animation:popIn 0.42s both;">
          <div style="font-size:40px;">💥</div>
          <h2 style="margin:4px 0 8px;font-size:26px;">GAME OVER</h2>
          <p class="hidden" id="brk-newR" style="color:#eab308;font-size:9px;">★ NOVO RECORDE! ★</p>
          <div class="result-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px;">
            <div style="border-radius:16px;padding:12px 8px;background:#fef2f2;"><span style="color:#ef4444;font-size:7px;">PONTOS</span><strong id="brk-final" style="font-size:36px;">0</strong></div>
            <div style="border-radius:16px;padding:12px 8px;background:#fff7d1;"><span style="color:#ef4444;font-size:7px;">RECORDE</span><strong id="brk-best" style="font-size:36px;">0</strong></div>
          </div>
          <button class="again-button" style="border:2px solid #facc15;border-radius:999px;padding:10px 22px;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;box-shadow:0 8px 20px rgba(185,28,28,0.35);font-size:20px;cursor:pointer;pointer-events:auto;" id="brk-again">↻ DE NOVO!</button>
        </div>
      </section>
    `;
    par.appendChild(this.ui);
    this.scoreEl = document.getElementById("brk-score"); this.highEl = document.getElementById("brk-high");
    this.livesEl = document.getElementById("brk-lives"); this.startScr = document.getElementById("brk-startScreen");
    this.overScr = document.getElementById("brk-overScreen"); this.finalEl = document.getElementById("brk-final");
    this.bestEl = document.getElementById("brk-best"); this.newREl = document.getElementById("brk-newR");
    document.getElementById("brk-play").addEventListener("click",()=>this.startGame());
    document.getElementById("brk-again").addEventListener("click",()=>this.startGame());
    this.startScr.classList.remove("hidden");
  }
  startGame() {
    this.state.mode = "playing"; this.state.score = 0; this.state.lives = 3;
    this.state.paddle = {x:250,y:460,w:80,h:12}; this.state.ball = {x:290,y:445,r:7,dx:3,dy:-3};
    this.spawnBricks();
    this.scoreEl.textContent = "0"; this.livesEl.textContent = "3";
    this.startScr.classList.add("hidden"); this.overScr.classList.add("hidden");
  }
  gameOver() {
    this.state.mode = "gameover";
    const isR = this.state.score > this.state.highScore;
    if (isR) { this.state.highScore = this.state.score; localStorage.setItem("break_high",String(this.state.highScore)); this.highEl.textContent = this.state.highScore; }
    this.finalEl.textContent = this.state.score; this.bestEl.textContent = this.state.highScore;
    this.newREl.classList.toggle("hidden", !isR); this.overScr.classList.remove("hidden");
  }
  updateGame() {
    if (this.state.mode !== "playing") return;
    const b = this.state.ball, p = this.state.paddle;
    b.x += b.dx; b.y += b.dy;
    if (b.x - b.r < 0 || b.x + b.r > this.canvas.width) b.dx *= -1;
    if (b.y - b.r < 0) b.dy *= -1;
    if (b.y + b.r > this.canvas.height) { this.state.lives--; this.livesEl.textContent = this.state.lives; if (this.state.lives <= 0) { this.gameOver(); return; } b.x = p.x + p.w/2; b.y = p.y - 10; b.dy = -3; b.dx = (Math.random() > 0.5 ? 1 : -1) * 3; }
    if (b.y + b.r > p.y && b.y - b.r < p.y + p.h && b.x + b.r > p.x && b.x - b.r < p.x + p.w) { b.dy = -Math.abs(b.dy); b.y = p.y - b.r; }
    for (const br of this.state.bricks) {
      if (!br.alive) continue;
      if (b.x + b.r > br.x && b.x - b.r < br.x + br.w && b.y + b.r > br.y && b.y - b.r < br.y + br.h) {
        br.alive = false; b.dy *= -1; this.state.score += 10; this.scoreEl.textContent = this.state.score;
      }
    }
    if (!this.state.bricks.some(br => br.alive)) { this.spawnBricks(); this.state.score += 50; this.scoreEl.textContent = this.state.score; }
  }
  render() {
    const ctx = this.ctx; const w = this.canvas.width, h = this.canvas.height;
    const grad = ctx.createLinearGradient(0,0,0,h); grad.addColorStop(0,"#0a0a1a"); grad.addColorStop(1,"#1a0000");
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
    for (const br of this.state.bricks) {
      if (!br.alive) continue;
      ctx.fillStyle = br.color; ctx.fillRect(br.x, br.y, br.w, br.h);
      ctx.fillStyle = "rgba(255,215,0,0.15)"; ctx.fillRect(br.x+3, br.y+3, br.w-6, br.h-6);
    }
    ctx.fillStyle = "#facc15"; ctx.fillRect(this.state.paddle.x, this.state.paddle.y, this.state.paddle.w, this.state.paddle.h);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(this.state.ball.x, this.state.ball.y, this.state.ball.r, 0, Math.PI*2); ctx.fill();
  }
  bindEvents() {
    this._kd = (e) => {
      if (this.state.mode === "playing") {
        const speed = 7;
        if (e.code === "ArrowLeft") this.state.paddle.x = Math.max(0, this.state.paddle.x - speed);
        if (e.code === "ArrowRight") this.state.paddle.x = Math.min(this.canvas.width - this.state.paddle.w, this.state.paddle.x + speed);
      }
      if ((e.code === "Space" || e.code === "Enter") && (this.state.mode === "start" || this.state.mode === "gameover")) this.startGame();
      if (e.code === "Space") e.preventDefault();
    };
    window.addEventListener("keydown", this._kd);
  }
  loop() { const n=performance.now(); const e=n-(this._last||n); this._last=n; const s=Math.max(1,Math.min(3,Math.round(e/16.67))); for(let i=0;i<s;i++)this.updateGame(); this.render(); if(this.running)this.animId=requestAnimationFrame(()=>this.loop()); }
  destroy() { this.running=false; if(this.animId)cancelAnimationFrame(this.animId); window.removeEventListener("keydown",this._kd); if(this.ui)this.ui.remove(); }
}
