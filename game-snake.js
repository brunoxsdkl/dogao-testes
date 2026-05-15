class SnakeGame {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.animId = null; this.running = true; this._last = null;
    this.CHARACTERS = [
      { id: "hotdog", label: "Hot Dog", emoji: "🌭" },
      { id: "burger", label: "X-Burguer", emoji: "🍔" },
      { id: "dog", label: "Dogao", emoji: "🐕" },
    ];
    this.BS = 20; this.COLS = 20; this.ROWS = 20;
    this.setupCanvas(); this.init();
  }
  setupCanvas() { this.canvas.width = 400; this.canvas.height = 400; this.canvas.style.cssText = "width:100%;height:100%;display:block;max-height:100%;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("snake_high")||0),
      character: "hotdog", difficulty: "medium", snake: [], food: null, dir: {x:1,y:0}, nextDir: {x:1,y:0}, frameCount: 0
    };
    this.createUI(); this.bindEvents(); this.render(); this._last = performance.now(); this.loop();
  }
  createUI() {
    const par = this.canvas.parentElement; this.ui = document.createElement("div"); this.ui.id = "snake-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;";
    this.ui.innerHTML = `
      <div style="position:absolute;top:8px;right:12px;z-index:5;color:#fff;font-size:11px;font-family:'Press Start 2P',monospace;text-shadow:0 2px 4px rgba(0,0,0,0.5);text-align:right;">
        <div>🏆 <span id="snk-high">${this.state.highScore}</span></div>
        <div>⭐ <span id="snk-score">0</span></div>
      </div>
      <section class="screen dino-start hidden" id="snk-startScreen">
        <div class="title-stack" style="animation:popIn 0.55s 0.15s both;">
          <h1 style="color:#facc15;font-size:clamp(32px,10vw,52px);margin:0;line-height:0.9;text-shadow:0 5px 0 rgba(0,0,0,0.2);">Dogao</h1>
          <h2 style="color:white;font-size:clamp(36px,11vw,60px);margin:0;line-height:0.9;text-shadow:0 5px 0 rgba(0,0,0,0.2);">Snake</h2>
        </div>
        <div style="font-size:clamp(48px,14vw,72px);margin:8px 0;animation:bob 1.8s ease-in-out infinite;">🐍</div>
        <p style="color:rgba(254,240,138,0.9);font-size:10px;font-family:'Press Start 2P',monospace;margin:0 0 6px;">🏆 RECORDE: ${this.state.highScore}</p>
        <div class="chooser" style="width:min(100%,340px);margin:4px 0;"><p style="margin:0 0 6px;font-size:8px;">PERSONAGEM</p><div class="card-row" id="snk-charOpts" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;"></div></div>
        <div class="chooser" style="width:min(100%,340px);margin:4px 0;"><p style="margin:0 0 6px;font-size:8px;">DIFICULDADE</p><div class="card-row" id="snk-diffOpts" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;"></div></div>
        <button class="play-button" style="min-width:180px;margin-top:6px;border:4px solid #fff3a3;border-radius:999px;padding:11px 24px;background:#facc15;color:#8b1d12;box-shadow:0 13px 24px rgba(0,0,0,0.32);font-size:clamp(20px,7vw,30px);cursor:pointer;pointer-events:auto;" id="snk-play">▶ JOGAR</button>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.52);font-size:8px;">SETAS: DIRECIONAR</p>
      </section>
      <section class="screen dino-over hidden" id="snk-overScreen">
        <div class="gameover-card" style="width:min(80vw,300px);border:4px solid #facc15;border-radius:24px;padding:20px;background:white;color:#a80d0d;box-shadow:0 24px 70px rgba(0,0,0,0.34);animation:popIn 0.42s both;">
          <div style="font-size:40px;">💥</div>
          <h2 style="margin:4px 0 8px;font-size:26px;">GAME OVER</h2>
          <p class="hidden" id="snk-newR" style="color:#eab308;font-size:9px;">★ NOVO RECORDE! ★</p>
          <div class="result-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px;">
            <div style="border-radius:16px;padding:12px 8px;background:#fef2f2;"><span style="color:#ef4444;font-size:7px;">PONTOS</span><strong id="snk-final" style="font-size:36px;font-family:'Fredoka One',sans-serif;">0</strong></div>
            <div style="border-radius:16px;padding:12px 8px;background:#fff7d1;"><span style="color:#ef4444;font-size:7px;">RECORDE</span><strong id="snk-best" style="font-size:36px;font-family:'Fredoka One',sans-serif;">0</strong></div>
          </div>
          <button class="again-button" style="border:2px solid #facc15;border-radius:999px;padding:10px 22px;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;box-shadow:0 8px 20px rgba(185,28,28,0.35);font-size:20px;cursor:pointer;pointer-events:auto;" id="snk-again">↻ DE NOVO!</button>
        </div>
      </section>
    `;
    par.appendChild(this.ui);
    this.scoreEl = document.getElementById("snk-score"); this.highEl = document.getElementById("snk-high");
    this.startScr = document.getElementById("snk-startScreen"); this.overScr = document.getElementById("snk-overScreen");
    this.finalEl = document.getElementById("snk-final"); this.bestEl = document.getElementById("snk-best"); this.newREl = document.getElementById("snk-newR");
    this.buildSel("snk-charOpts", this.CHARACTERS, (id)=>this.state.character=id);
    this.diffs = [{id:"easy",label:"Facil",emoji:"😊"},{id:"medium",label:"Medio",emoji:"😤"},{id:"hard",label:"Dificil",emoji:"💀"}];
    this.buildSel("snk-diffOpts", this.diffs, (id)=>this.state.difficulty=id);
    document.getElementById("snk-play").addEventListener("click",()=>this.startGame());
    document.getElementById("snk-again").addEventListener("click",()=>this.startGame());
    this.startScr.classList.remove("hidden");
  }
  buildSel(id, items, cb) {
    const el = document.getElementById(id);
    for (const item of items) {
      const b = document.createElement("button"); b.className="card"; b.type="button"; b.style.pointerEvents="auto";
      b.innerHTML = `<span class="emoji">${item.emoji}</span><span>${item.label}</span>`;
      b.addEventListener("click",()=>{cb(item.id); for(const x of el.children)x.classList.toggle("active",x===b);});
      el.appendChild(b);
    }
  }
  startGame() {
    this.state.mode = "playing"; this.state.score = 0; this.state.frameCount = 0;
    this.state.snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
    this.state.dir = {x:1,y:0}; this.state.nextDir = {x:1,y:0};
    this.state.food = null; this.placeFood();
    this.startScr.classList.add("hidden"); this.overScr.classList.add("hidden");
    this.scoreEl.textContent = "0";
  }
  placeFood() {
    while (true) {
      const f = {x:Math.floor(Math.random()*this.COLS),y:Math.floor(Math.random()*this.ROWS)};
      if (!this.state.snake.some(s=>s.x===f.x&&s.y===f.y)) { this.state.food = f; return; }
    }
  }
  gameOver() {
    this.state.mode = "gameover";
    const isR = this.state.score > this.state.highScore;
    if (isR) { this.state.highScore = this.state.score; localStorage.setItem("snake_high",String(this.state.highScore)); this.highEl.textContent = this.state.highScore; }
    this.finalEl.textContent = this.state.score; this.bestEl.textContent = this.state.highScore;
    this.newREl.classList.toggle("hidden", !isR); this.overScr.classList.remove("hidden");
  }
  updateGame() {
    if (this.state.mode !== "playing") return;
    const speeds = {easy:8,medium:5,hard:3};
    this.state.frameCount++;
    if (this.state.frameCount % speeds[this.state.difficulty] !== 0) return;
    this.state.dir = {...this.state.nextDir};
    const head = this.state.snake[0];
    const nx = head.x + this.state.dir.x, ny = head.y + this.state.dir.y;
    if (nx < 0 || nx >= this.COLS || ny < 0 || ny >= this.ROWS || this.state.snake.some(s=>s.x===nx&&s.y===ny)) { this.gameOver(); return; }
    this.state.snake.unshift({x:nx,y:ny});
    if (nx === this.state.food.x && ny === this.state.food.y) { this.state.score += 10; this.scoreEl.textContent = this.state.score; this.placeFood(); }
    else this.state.snake.pop();
  }
  render() {
    const ctx = this.ctx; const bs = this.BS;
    const w = this.canvas.width, h = this.canvas.height;
    const ox = Math.floor((w - this.COLS * bs) / 2), oy = Math.floor((h - this.ROWS * bs) / 2);
    ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0,0,w,h);
    for (let r = 0; r < this.ROWS; r++) for (let c = 0; c < this.COLS; c++) {
      ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.strokeRect(ox + c * bs, oy + r * bs, bs, bs);
    }
    this.state.snake.forEach((s,i) => {
      ctx.fillStyle = i === 0 ? "#facc15" : "#C81010";
      ctx.fillRect(ox + s.x * bs + 1, oy + s.y * bs + 1, bs - 2, bs - 2);
      if (i === 0) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ox + s.x * bs + 6, oy + s.y * bs + 7, 3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(ox + s.x * bs + 14, oy + s.y * bs + 7, 3, 0, Math.PI*2); ctx.fill(); }
    });
    if (this.state.food) {
      ctx.fillStyle = "#FFD700"; ctx.beginPath();
      ctx.arc(ox + this.state.food.x * bs + bs/2, oy + this.state.food.y * bs + bs/2, bs/2 - 2, 0, Math.PI*2);
      ctx.fill();
    }
  }
  bindEvents() {
    this._kd = (e) => {
      if (this.state.mode === "playing") {
        if (e.code === "ArrowUp" && this.state.dir.y !== 1) this.state.nextDir = {x:0,y:-1};
        if (e.code === "ArrowDown" && this.state.dir.y !== -1) this.state.nextDir = {x:0,y:1};
        if (e.code === "ArrowLeft" && this.state.dir.x !== 1) this.state.nextDir = {x:-1,y:0};
        if (e.code === "ArrowRight" && this.state.dir.x !== -1) this.state.nextDir = {x:1,y:0};
      }
      if ((e.code === "Space" || e.code === "Enter") && (this.state.mode === "start" || this.state.mode === "gameover")) this.startGame();
    };
    window.addEventListener("keydown", this._kd);
  }
  loop() { const n=performance.now(); const e=n-(this._last||n); this._last=n; const s=Math.max(1,Math.min(3,Math.round(e/16.67))); for(let i=0;i<s;i++)this.updateGame(); this.render(); if(this.running)this.animId=requestAnimationFrame(()=>this.loop()); }
  destroy() { this.running=false; if(this.animId)cancelAnimationFrame(this.animId); window.removeEventListener("keydown",this._kd); if(this.ui)this.ui.remove(); }
}
