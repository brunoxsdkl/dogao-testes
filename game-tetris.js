class TetrisGame {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.animId = null; this.running = true; this._last = null;
    this.CHARACTERS = [
      { id: "hotdog", label: "Hot Dog", emoji: "🌭" },
      { id: "burger", label: "X-Burguer", emoji: "🍔" },
      { id: "dog", label: "Dogao", emoji: "🐕" },
    ];
    this.themes = { hotdog: ["#C81010","#E82020","#F1C40F","#D4903C","#A0392B"], burger: ["#3CB371","#F4D03F","#8B4513","#E8A84C","#D4903C"], dog: ["#FF6600","#FFCC99","#D4903C","#E8A84C","#C0392B"] };
    this.COLS = 10; this.ROWS = 20; this.BS = 0;
    this.pieces = [
      [[1,1,1,1]], [[1,1],[1,1]], [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]], [[1,1,1],[0,1,0]], [[1,1,1],[1,0,0]], [[1,1,1],[0,0,1]]
    ];
    this.setupCanvas(); this.init();
  }
  setupCanvas() { this.canvas.width = 400; this.canvas.height = 600; this.canvas.style.cssText = "width:100%;height:100%;display:block;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("tetris_high")||0),
      character: "hotdog", difficulty: "medium", board: [], piece: null, pos: {x:0,y:0}, fallTime: 0, fallInterval: 500, frame: 0
    };
    for (let r = 0; r < this.ROWS; r++) { this.state.board[r] = []; for (let c = 0; c < this.COLS; c++) this.state.board[r][c] = 0; }
    const speedMap = { easy: 700, medium: 500, hard: 300 };
    this.state.fallInterval = speedMap[this.state.difficulty];
    this.createUI(); this.bindEvents(); this.render(); this._last = performance.now(); this.loop();
  }
  createUI() {
    const par = this.canvas.parentElement; this.ui = document.createElement("div"); this.ui.id = "tetris-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;";
    this.ui.innerHTML = `
      <div style="position:absolute;top:8px;right:12px;z-index:5;color:#fff;font-size:11px;font-family:'Press Start 2P',monospace;text-shadow:0 2px 4px rgba(0,0,0,0.5);text-align:right;">
        <div>🏆 <span id="tet-high">${this.state.highScore}</span></div>
        <div>⭐ <span id="tet-score">0</span></div>
      </div>
      <section class="screen dino-start hidden" id="tet-startScreen">
        <div class="title-stack" style="animation:popIn 0.55s 0.15s both;">
          <h1 style="color:#facc15;font-size:clamp(36px,11vw,60px);margin:0;line-height:0.9;text-shadow:0 5px 0 rgba(0,0,0,0.2);">Dogao</h1>
          <h2 style="color:white;font-size:clamp(40px,13vw,70px);margin:0;line-height:0.9;text-shadow:0 5px 0 rgba(0,0,0,0.2);">Tetris</h2>
        </div>
        <div style="font-size:clamp(48px,14vw,72px);margin:8px 0;animation:bob 1.8s ease-in-out infinite;">🧱</div>
        <p style="color:rgba(254,240,138,0.9);font-size:10px;font-family:'Press Start 2P',monospace;margin:0 0 6px;">🏆 RECORDE: ${this.state.highScore}</p>
        <div class="chooser" style="width:min(100%,340px);margin:4px 0;"><p style="margin:0 0 6px;font-size:8px;">PERSONAGEM</p><div class="card-row" id="tet-charOpts" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;"></div></div>
        <div class="chooser" style="width:min(100%,340px);margin:4px 0;"><p style="margin:0 0 6px;font-size:8px;">DIFICULDADE</p><div class="card-row" id="tet-diffOpts" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;"></div></div>
        <button class="play-button" style="min-width:180px;margin-top:6px;border:4px solid #fff3a3;border-radius:999px;padding:11px 24px;background:#facc15;color:#8b1d12;box-shadow:0 13px 24px rgba(0,0,0,0.32);font-size:clamp(20px,7vw,30px);cursor:pointer;pointer-events:auto;" id="tet-play">▶ JOGAR</button>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.52);font-size:8px;">SETAS: MOVER | ESPAÇO: GIRAR</p>
      </section>
      <section class="screen dino-over hidden" id="tet-overScreen">
        <div class="gameover-card" style="width:min(80vw,300px);border:4px solid #facc15;border-radius:24px;padding:20px;background:white;color:#a80d0d;box-shadow:0 24px 70px rgba(0,0,0,0.34);animation:popIn 0.42s both;">
          <div style="font-size:40px;">💥</div>
          <h2 style="margin:4px 0 8px;font-size:26px;">GAME OVER</h2>
          <p class="hidden" id="tet-newR" style="color:#eab308;font-size:9px;">★ NOVO RECORDE! ★</p>
          <div class="result-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px;">
            <div style="border-radius:16px;padding:12px 8px;background:#fef2f2;"><span style="color:#ef4444;font-size:7px;">PONTOS</span><strong id="tet-final" style="font-size:36px;font-family:'Fredoka One',sans-serif;">0</strong></div>
            <div style="border-radius:16px;padding:12px 8px;background:#fff7d1;"><span style="color:#ef4444;font-size:7px;">RECORDE</span><strong id="tet-best" style="font-size:36px;font-family:'Fredoka One',sans-serif;">0</strong></div>
          </div>
          <button class="again-button" style="border:2px solid #facc15;border-radius:999px;padding:10px 22px;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;box-shadow:0 8px 20px rgba(185,28,28,0.35);font-size:20px;cursor:pointer;pointer-events:auto;" id="tet-again">↻ DE NOVO!</button>
        </div>
      </section>
    `;
    par.appendChild(this.ui);
    this.scoreEl = document.getElementById("tet-score"); this.highEl = document.getElementById("tet-high");
    this.startScr = document.getElementById("tet-startScreen"); this.overScr = document.getElementById("tet-overScreen");
    this.finalEl = document.getElementById("tet-final"); this.bestEl = document.getElementById("tet-best");
    this.newREl = document.getElementById("tet-newR");
    this.buildOpts("tet-charOpts", this.CHARACTERS, (id) => { this.state.character = id; });
    this.diffs = [{id:"easy",label:"Facil",emoji:"😊"},{id:"medium",label:"Medio",emoji:"😤"},{id:"hard",label:"Dificil",emoji:"💀"}];
    this.buildOpts("tet-diffOpts", this.diffs, (id) => { this.state.difficulty = id; const m={easy:700,medium:500,hard:300}; this.state.fallInterval=m[id]; });
    document.getElementById("tet-play").addEventListener("click",()=>this.startGame());
    document.getElementById("tet-again").addEventListener("click",()=>this.startGame());
    this.startScr.classList.remove("hidden");
  }
  buildOpts(id, items, cb) {
    const el = document.getElementById(id); el.innerHTML = "";
    for (const item of items) {
      const b = document.createElement("button"); b.className = "card"; b.type = "button"; b.style.pointerEvents = "auto";
      b.innerHTML = `<span class="emoji">${item.emoji}</span><span>${item.label}</span>`;
      b.addEventListener("click", () => { cb(item.id); this.highlightOpts(id, item.id); });
      el.appendChild(b);
    }
  }
  highlightOpts(id, activeId) {
    const el = document.getElementById(id);
    for (const b of el.children) b.classList.toggle("active", b.dataset?.id === activeId || b.querySelector("span")?.textContent === activeId);
  }
  startGame() {
    this.state.mode = "playing"; this.state.score = 0; this.state.frame = 0; this.state.fallTime = 0;
    for (let r = 0; r < this.ROWS; r++) for (let c = 0; c < this.COLS; c++) this.state.board[r][c] = 0;
    this.spawnPiece();
    this.startScr.classList.add("hidden"); this.overScr.classList.add("hidden");
    this.scoreEl.textContent = "0";
  }
  spawnPiece() {
    const idx = Math.floor(Math.random() * this.pieces.length);
    this.state.piece = this.pieces[idx].map(r => [...r]);
    this.state.pos = { x: Math.floor((this.COLS - this.state.piece[0].length) / 2), y: 0 };
    if (this.collides(this.state.pos.x, this.state.pos.y, this.state.piece)) this.state.mode = "gameover";
  }
  collides(x, y, piece) {
    for (let r = 0; r < piece.length; r++) for (let c = 0; c < piece[r].length; c++) {
      if (!piece[r][c]) continue;
      const nx = x + c, ny = y + r;
      if (nx < 0 || nx >= this.COLS || ny >= this.ROWS) return true;
      if (ny >= 0 && this.state.board[ny][nx]) return true;
    }
    return false;
  }
  merge() {
    const p = this.state.piece, pos = this.state.pos;
    for (let r = 0; r < p.length; r++) for (let c = 0; c < p[r].length; c++) {
      if (p[r][c] && pos.y + r >= 0) this.state.board[pos.y + r][pos.x + c] = 1;
    }
    let cleared = 0;
    for (let r = this.ROWS - 1; r >= 0; r--) {
      if (this.state.board[r].every(c => c)) {
        this.state.board.splice(r, 1);
        this.state.board.unshift(new Array(this.COLS).fill(0));
        cleared++; r++;
      }
    }
    if (cleared) { this.state.score += cleared * 100 * cleared; this.scoreEl.textContent = this.state.score; }
    this.spawnPiece();
  }
  move(dx) { if (!this.state.piece) return; const x = this.state.pos.x + dx; if (!this.collides(x, this.state.pos.y, this.state.piece)) this.state.pos.x = x; }
  rotate() {
    if (!this.state.piece) return;
    const p = this.state.piece; const rot = p[0].map((_, i) => p.map(r => r[i]).reverse());
    if (!this.collides(this.state.pos.x, this.state.pos.y, rot)) this.state.piece = rot;
  }
  updateGame() {
    if (this.state.mode !== "playing") return;
    this.state.frame++;
    this.state.fallTime += 16.67;
    if (this.state.fallTime >= this.state.fallInterval) {
      this.state.fallTime = 0;
      if (!this.collides(this.state.pos.x, this.state.pos.y + 1, this.state.piece)) { this.state.pos.y++; }
      else { this.merge(); if (this.state.mode === "gameover") { this.gameOver(); } }
    }
  }
  gameOver() {
    this.state.mode = "gameover";
    const isR = this.state.score > this.state.highScore;
    if (isR) { this.state.highScore = this.state.score; localStorage.setItem("tetris_high",String(this.state.highScore)); this.highEl.textContent = this.state.highScore; }
    this.finalEl.textContent = this.state.score; this.bestEl.textContent = this.state.highScore;
    this.newREl.classList.toggle("hidden", !isR); this.overScr.classList.remove("hidden");
  }
  render() {
    const ctx = this.ctx; const cols = this.COLS, rows = this.ROWS;
    const w = this.canvas.width, h = this.canvas.height;
    this.BS = Math.floor(w / cols);
    const offX = Math.floor((w - cols * this.BS) / 2), offY = Math.floor((h - rows * this.BS) / 2);
    ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = offX + c * this.BS, y = offY + r * this.BS;
      ctx.strokeRect(x, y, this.BS, this.BS);
      if (this.state.board[r][c]) { ctx.fillStyle = "#C81010"; ctx.fillRect(x + 1, y + 1, this.BS - 2, this.BS - 2); ctx.fillStyle = "rgba(255,215,0,0.2)"; ctx.fillRect(x + 3, y + 3, this.BS - 6, this.BS - 6); }
    }
    if (this.state.piece && this.state.mode === "playing") {
      const p = this.state.piece, pos = this.state.pos; ctx.fillStyle = "#E82020";
      for (let r = 0; r < p.length; r++) for (let c = 0; c < p[r].length; c++) {
        if (!p[r][c]) continue;
        const x = offX + (pos.x + c) * this.BS, y = offY + (pos.y + r) * this.BS;
        ctx.fillRect(x + 1, y + 1, this.BS - 2, this.BS - 2);
        ctx.fillStyle = "rgba(255,215,0,0.2)"; ctx.fillRect(x + 3, y + 3, this.BS - 6, this.BS - 6); ctx.fillStyle = "#E82020";
      }
    }
  }
  bindEvents() {
    this._kd = (e) => {
      if (this.state.mode === "playing") {
        if (e.code === "ArrowLeft") this.move(-1);
        if (e.code === "ArrowRight") this.move(1);
        if (e.code === "ArrowDown") { if (!this.collides(this.state.pos.x, this.state.pos.y + 1, this.state.piece)) this.state.pos.y++; }
        if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); this.rotate(); }
      }
      if ((e.code === "Space" || e.code === "Enter") && (this.state.mode === "start" || this.state.mode === "gameover")) this.startGame();
    };
    window.addEventListener("keydown", this._kd);
  }
  loop() {
    const now = performance.now(); const e = now - (this._last || now); this._last = now;
    const steps = Math.max(1, Math.min(3, Math.round(e / 16.67)));
    for (let i = 0; i < steps; i++) this.updateGame();
    this.render();
    if (this.running) this.animId = requestAnimationFrame(() => this.loop());
  }
  destroy() {
    this.running = false; if (this.animId) cancelAnimationFrame(this.animId);
    window.removeEventListener("keydown", this._kd); if (this.ui) this.ui.remove();
  }
}
