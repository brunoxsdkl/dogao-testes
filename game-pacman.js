class PacmanGame {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.animId = null; this.running = true; this._last = null;
    this.CHARACTERS = [
      { id: "hotdog", label: "Hot Dog", emoji: "🌭" },
      { id: "burger", label: "X-Burguer", emoji: "🍔" },
      { id: "dog", label: "Dogao", emoji: "🐕" },
    ];
    this.BS = 20; this.COLS = 19; this.ROWS = 19;
    this.MAP_TEMPLATE = [
      "WWWWWWWWWWWWWWWWWWW",
      "W........W........W",
      "W.WW.WWW.W.WWW.WW.W",
      "WoW..W.....W..WoW",
      "W.WW.WWW.W.WWW.WW.W",
      "W..................W",
      "W.WW.W.WWWWW.W.WW.W",
      "W....W...W...W....W",
      "WWWW.WW.W.W.WW.WWWW",
      "   W.W..   ..W.W   ",
      "WWWW.W.WWWWW.W.WWWW",
      "W............ ....W",
      "W.WW.WWW.W.WWW.WW.W",
      "W..oW.....W..Wo..W",
      "WW.W.WWW.W.WWW.W.WW",
      "W....W...W...W....W",
      "W.WWWWW.W.WWWWW.W.W",
      "W..................W",
      "WWWWWWWWWWWWWWWWWWW",
    ];
    this.setupCanvas(); this.init();
  }
  setupCanvas() { this.canvas.width = this.COLS * this.BS; this.canvas.height = this.ROWS * this.BS; this.canvas.style.cssText = "width:100%;height:100%;display:block;max-height:100%;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("pac_high")||0),
      character: "hotdog", difficulty: "medium", lives: 3,
      map: [], pacman: {x:1,y:1,dx:1,dy:0,nextDx:1,nextDy:0}, ghosts: [], dots: 0, eatenDots: 0, level: 1
    };
    this.buildMap();
    this.createUI(); this.bindEvents(); this.render(); this._last = performance.now(); this.loop();
  }
  buildMap() {
    this.state.map = [];
    for (let r = 0; r < this.ROWS; r++) {
      const row = [];
      for (let c = 0; c < this.COLS; c++) {
        const ch = this.MAP_TEMPLATE[r]?.[c] || " ";
        if (ch === "o") { row.push({type:"dot"}); this.state.dots++; }
        else if (ch === ".") { row.push({type:"dot"}); this.state.dots++; }
        else if (ch === "W") { row.push({type:"wall"}); }
        else { row.push({type:"empty"}); }
      }
      this.state.map.push(row);
    }
    this.state.ghosts = [
      {x:9,y:9,dx:1,dy:0,color:"#ff69b4",scatter:false},
      {x:10,y:9,dx:-1,dy:0,color:"#00bfff",scatter:false},
      {x:9,y:10,dx:0,dy:1,color:"#ff6347",scatter:false},
      {x:10,y:10,dx:0,dy:-1,color:"#ffa500",scatter:false},
    ];
  }
  createUI() {
    const par = this.canvas.parentElement; this.ui = document.createElement("div"); this.ui.id = "pac-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;";
    this.ui.innerHTML = `
      <div style="position:absolute;top:0;left:0;right:0;z-index:5;display:flex;justify-content:space-between;padding:4px 12px;color:#fff;font-size:11px;font-family:'Press Start 2P',monospace;text-shadow:0 2px 4px rgba(0,0,0,0.5);background:rgba(0,0,0,0.4);">
        <span>🏆 <span id="pac-high">${this.state.highScore}</span></span>
        <span>❤️ <span id="pac-lives">3</span></span>
        <span>⭐ <span id="pac-score">0</span></span>
      </div>
      <section class="screen dino-start hidden" id="pac-startScreen">
        <div class="title-stack" style="animation:popIn 0.55s 0.15s both;">
          <h1 style="color:#facc15;font-size:clamp(32px,10vw,52px);margin:0;text-shadow:0 5px 0 rgba(0,0,0,0.2);">Dogao</h1>
          <h2 style="color:white;font-size:clamp(36px,11vw,60px);margin:0;text-shadow:0 5px 0 rgba(0,0,0,0.2);">Pac-Man</h2>
        </div>
        <div style="font-size:clamp(48px,14vw,72px);margin:8px 0;animation:bob 1.8s ease-in-out infinite;">👻</div>
        <p style="color:rgba(254,240,138,0.9);font-size:10px;font-family:'Press Start 2P',monospace;margin:0 0 6px;">🏆 RECORDE: ${this.state.highScore}</p>
        <button class="play-button" style="min-width:180px;margin-top:6px;border:4px solid #fff3a3;border-radius:999px;padding:11px 24px;background:#facc15;color:#8b1d12;box-shadow:0 13px 24px rgba(0,0,0,0.32);font-size:clamp(20px,7vw,30px);cursor:pointer;pointer-events:auto;" id="pac-play">▶ JOGAR</button>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.52);font-size:8px;">SETAS: DIRECIONAR</p>
      </section>
      <section class="screen dino-over hidden" id="pac-overScreen">
        <div class="gameover-card" style="width:min(80vw,300px);border:4px solid #facc15;border-radius:24px;padding:20px;background:white;color:#a80d0d;box-shadow:0 24px 70px rgba(0,0,0,0.34);animation:popIn 0.42s both;">
          <div style="font-size:40px;">💀</div>
          <h2 style="margin:4px 0 8px;font-size:26px;">GAME OVER</h2>
          <p class="hidden" id="pac-newR" style="color:#eab308;font-size:9px;">★ NOVO RECORDE! ★</p>
          <div class="result-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px;">
            <div style="border-radius:16px;padding:12px 8px;background:#fef2f2;"><span style="color:#ef4444;font-size:7px;">PONTOS</span><strong id="pac-final" style="font-size:36px;">0</strong></div>
            <div style="border-radius:16px;padding:12px 8px;background:#fff7d1;"><span style="color:#ef4444;font-size:7px;">RECORDE</span><strong id="pac-best" style="font-size:36px;">0</strong></div>
          </div>
          <button class="again-button" style="border:2px solid #facc15;border-radius:999px;padding:10px 22px;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;box-shadow:0 8px 20px rgba(185,28,28,0.35);font-size:20px;cursor:pointer;pointer-events:auto;" id="pac-again">↻ DE NOVO!</button>
        </div>
      </section>
    `;
    par.appendChild(this.ui);
    this.scoreEl = document.getElementById("pac-score"); this.highEl = document.getElementById("pac-high");
    this.livesEl = document.getElementById("pac-lives"); this.startScr = document.getElementById("pac-startScreen");
    this.overScr = document.getElementById("pac-overScreen"); this.finalEl = document.getElementById("pac-final");
    this.bestEl = document.getElementById("pac-best"); this.newREl = document.getElementById("pac-newR");
    document.getElementById("pac-play").addEventListener("click",()=>this.startGame());
    document.getElementById("pac-again").addEventListener("click",()=>this.startGame());
    this.startScr.classList.remove("hidden");
  }
  startGame() {
    this.state.mode = "playing"; this.state.score = 0; this.state.lives = 3; this.state.dots = 0; this.state.eatenDots = 0;
    this.livesEl.textContent = "3"; this.scoreEl.textContent = "0";
    this.buildMap(); this.state.pacman = {x:1,y:1,dx:1,dy:0,nextDx:1,nextDy:0};
    this.startScr.classList.add("hidden"); this.overScr.classList.add("hidden");
  }
  gameOver() {
    this.state.mode = "gameover";
    const isR = this.state.score > this.state.highScore;
    if (isR) { this.state.highScore = this.state.score; localStorage.setItem("pac_high",String(this.state.highScore)); this.highEl.textContent = this.state.highScore; }
    this.finalEl.textContent = this.state.score; this.bestEl.textContent = this.state.highScore;
    this.newREl.classList.toggle("hidden", !isR); this.overScr.classList.remove("hidden");
  }
  updateGame() {
    if (this.state.mode !== "playing") return;
    const p = this.state.pacman; const map = this.state.map;
    if (this.canMove(p.x + p.nextDx, p.y + p.nextDy, map)) { p.dx = p.nextDx; p.dy = p.nextDy; }
    if (this.canMove(p.x + p.dx, p.y + p.dy, map)) { p.x += p.dx; p.y += p.dy; } else { p.dx = 0; p.dy = 0; }
    if (p.x < 0) p.x = this.COLS - 1; if (p.x >= this.COLS) p.x = 0;
    if (map[p.y] && map[p.y][p.x] && map[p.y][p.x].type === "dot" && !map[p.y][p.x].eaten) {
      map[p.y][p.x].eaten = true; this.state.score += 10; this.state.eatenDots++; this.scoreEl.textContent = this.state.score;
    }
    const ghostSpeed = {easy:0.3,medium:0.5,hard:0.7}[this.state.difficulty] || 0.5;
    for (const g of this.state.ghosts) {
      if (this.canMove(g.x + g.dx, g.y + g.dy, map)) { g.x += g.dx * ghostSpeed; g.y += g.dy * ghostSpeed; }
      else { const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]; const d = dirs[Math.floor(Math.random()*4)]; g.dx = d.x; g.dy = d.y; }
      g.x = Math.max(0, Math.min(this.COLS - 1, g.x)); g.y = Math.max(0, Math.min(this.ROWS - 1, g.y));
      if (Math.floor(g.x) === Math.floor(p.x) && Math.floor(g.y) === Math.floor(p.y)) {
        this.state.lives--; this.livesEl.textContent = this.state.lives;
        if (this.state.lives <= 0) { this.gameOver(); return; }
        p.x = 1; p.y = 1; p.dx = 1; p.dy = 0;
      }
    }
    if (this.state.eatenDots >= this.state.dots) { this.state.score += 100; this.buildMap(); this.state.pacman = {x:1,y:1,dx:1,dy:0,nextDx:1,nextDy:0}; this.state.level++; }
  }
  canMove(x, y, map) { const rx=Math.round(x), ry=Math.round(y); return ry>=0 && ry<this.ROWS && rx>=0 && rx<this.COLS && map[ry] && map[ry][rx] && map[ry][rx].type !== "wall"; }
  render() {
    const ctx = this.ctx; const bs = this.BS; const w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = "#0a0a1a"; ctx.fillRect(0,0,w,h);
    for (let r = 0; r < this.ROWS; r++) for (let c = 0; c < this.COLS; c++) {
      const cell = this.state.map[r]?.[c];
      if (!cell) continue;
      if (cell.type === "wall") { ctx.fillStyle = "#003366"; ctx.fillRect(c*bs, r*bs, bs, bs); ctx.fillStyle = "rgba(0,100,200,0.15)"; ctx.fillRect(c*bs+1, r*bs+1, bs-2, bs-2); }
      if (cell.type === "dot" && !cell.eaten) { ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(c*bs+bs/2, r*bs+bs/2, 4, 0, Math.PI*2); ctx.fill(); }
    }
    ctx.fillStyle = "#FFD700"; ctx.beginPath();
    const px = this.state.pacman.x * bs + bs/2, py = this.state.pacman.y * bs + bs/2;
    ctx.arc(px, py, bs/2 - 2, 0.2, 1.4 * Math.PI); ctx.lineTo(px, py); ctx.fill();
    for (const g of this.state.ghosts) {
      ctx.fillStyle = g.color; ctx.beginPath();
      const gx = g.x * bs + bs/2, gy = g.y * bs + bs/2;
      ctx.arc(gx, gy, bs/2 - 2, Math.PI, 0); ctx.lineTo(gx + bs/2 - 2, gy + bs/2); ctx.lineTo(gx - bs/2 + 2, gy + bs/2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(gx - 4, gy - 3, 3, 0, Math.PI*2); ctx.arc(gx + 4, gy - 3, 3, 0, Math.PI*2); ctx.fill();
    }
  }
  bindEvents() {
    this._kd = (e) => {
      if (this.state.mode === "playing") {
        if (e.code === "ArrowUp") { this.state.pacman.nextDx = 0; this.state.pacman.nextDy = -1; }
        if (e.code === "ArrowDown") { this.state.pacman.nextDx = 0; this.state.pacman.nextDy = 1; }
        if (e.code === "ArrowLeft") { this.state.pacman.nextDx = -1; this.state.pacman.nextDy = 0; }
        if (e.code === "ArrowRight") { this.state.pacman.nextDx = 1; this.state.pacman.nextDy = 0; }
      }
      if ((e.code === "Space" || e.code === "Enter") && (this.state.mode === "start" || this.state.mode === "gameover")) this.startGame();
      if (e.code === "Space") e.preventDefault();
    };
    window.addEventListener("keydown", this._kd);
  }
  loop() { const n=performance.now(); const e=n-(this._last||n); this._last=n; const s=Math.max(1,Math.min(3,Math.round(e/16.67))); for(let i=0;i<s;i++)this.updateGame(); this.render(); if(this.running)this.animId=requestAnimationFrame(()=>this.loop()); }
  destroy() { this.running=false; if(this.animId)cancelAnimationFrame(this.animId); window.removeEventListener("keydown",this._kd); if(this.ui)this.ui.remove(); }
}
