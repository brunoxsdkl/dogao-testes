class InvadersGame {
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
  setupCanvas() { this.canvas.width = 600; this.canvas.height = 600; this.canvas.style.cssText = "width:100%;height:100%;display:block;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("invaders_high")||0),
      character: "hotdog", difficulty: "medium", player: {x:270,y:540,w:50,h:40}, enemies: [], bullets: [],
      enemyDir: 1, enemyDrop: 0, shotTimer: 0, frame: 0, lives: 3
    };
    this.spawnEnemies();
    this.CONSTANTS = { bulletSpeed: -5, enemyShootInterval: 60, playerSpeed: 4 };
    this.createUI(); this.bindEvents(); this.render(); this._last = performance.now(); this.loop();
  }
  spawnEnemies() {
    this.state.enemies = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      this.state.enemies.push({ x: 40 + c * 65, y: 40 + r * 50, w: 50, h: 40, alive: true });
    }
  }
  createUI() {
    const par = this.canvas.parentElement; this.ui = document.createElement("div"); this.ui.id = "inv-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;";
    this.ui.innerHTML = `
      <div style="position:absolute;top:8px;left:12px;right:12px;z-index:5;display:flex;justify-content:space-between;color:#fff;font-size:11px;font-family:'Press Start 2P',monospace;text-shadow:0 2px 4px rgba(0,0,0,0.5);">
        <span>🏆 <span id="inv-high">${this.state.highScore}</span></span>
        <span>❤️ <span id="inv-lives">3</span></span>
        <span>⭐ <span id="inv-score">0</span></span>
      </div>
      <section class="screen dino-start hidden" id="inv-startScreen">
        <div class="title-stack" style="animation:popIn 0.55s 0.15s both;">
          <h1 style="color:#facc15;font-size:clamp(32px,10vw,52px);margin:0;line-height:0.9;text-shadow:0 5px 0 rgba(0,0,0,0.2);">Dogao</h1>
          <h2 style="color:white;font-size:clamp(36px,11vw,60px);margin:0;line-height:0.9;text-shadow:0 5px 0 rgba(0,0,0,0.2);">Invaders</h2>
        </div>
        <div style="font-size:clamp(48px,14vw,72px);margin:8px 0;animation:bob 1.8s ease-in-out infinite;">👾</div>
        <p style="color:rgba(254,240,138,0.9);font-size:10px;font-family:'Press Start 2P',monospace;margin:0 0 6px;">🏆 RECORDE: ${this.state.highScore}</p>
        <div class="chooser" style="width:min(100%,340px);margin:4px 0;"><p style="margin:0 0 6px;font-size:8px;">PERSONAGEM</p><div class="card-row" id="inv-charOpts" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;"></div></div>
        <button class="play-button" style="min-width:180px;margin-top:6px;border:4px solid #fff3a3;border-radius:999px;padding:11px 24px;background:#facc15;color:#8b1d12;box-shadow:0 13px 24px rgba(0,0,0,0.32);font-size:clamp(20px,7vw,30px);cursor:pointer;pointer-events:auto;" id="inv-play">▶ JOGAR</button>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.52);font-size:8px;">SETAS: MOVER | ESPAÇO: ATIRAR</p>
      </section>
      <section class="screen dino-over hidden" id="inv-overScreen">
        <div class="gameover-card" style="width:min(80vw,300px);border:4px solid #facc15;border-radius:24px;padding:20px;background:white;color:#a80d0d;box-shadow:0 24px 70px rgba(0,0,0,0.34);animation:popIn 0.42s both;">
          <div style="font-size:40px;">💥</div>
          <h2 style="margin:4px 0 8px;font-size:26px;">GAME OVER</h2>
          <p class="hidden" id="inv-newR" style="color:#eab308;font-size:9px;">★ NOVO RECORDE! ★</p>
          <div class="result-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px;">
            <div style="border-radius:16px;padding:12px 8px;background:#fef2f2;"><span style="color:#ef4444;font-size:7px;">PONTOS</span><strong id="inv-final" style="font-size:36px;font-family:'Fredoka One',sans-serif;">0</strong></div>
            <div style="border-radius:16px;padding:12px 8px;background:#fff7d1;"><span style="color:#ef4444;font-size:7px;">RECORDE</span><strong id="inv-best" style="font-size:36px;font-family:'Fredoka One',sans-serif;">0</strong></div>
          </div>
          <button class="again-button" style="border:2px solid #facc15;border-radius:999px;padding:10px 22px;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;box-shadow:0 8px 20px rgba(185,28,28,0.35);font-size:20px;cursor:pointer;pointer-events:auto;" id="inv-again">↻ DE NOVO!</button>
        </div>
      </section>
    `;
    par.appendChild(this.ui);
    this.scoreEl = document.getElementById("inv-score"); this.highEl = document.getElementById("inv-high");
    this.livesEl = document.getElementById("inv-lives"); this.startScr = document.getElementById("inv-startScreen");
    this.overScr = document.getElementById("inv-overScreen"); this.finalEl = document.getElementById("inv-final");
    this.bestEl = document.getElementById("inv-best"); this.newREl = document.getElementById("inv-newR");
    const cEl = document.getElementById("inv-charOpts");
    for (const ch of this.CHARACTERS) {
      const b = document.createElement("button"); b.className = "card"; b.type = "button"; b.style.pointerEvents = "auto";
      b.innerHTML = `<span class="emoji">${ch.emoji}</span><span>${ch.label}</span>`;
      b.addEventListener("click", () => { this.state.character = ch.id; for (const x of cEl.children) x.classList.toggle("active", x===b); });
      cEl.appendChild(b);
    }
    document.getElementById("inv-play").addEventListener("click",()=>this.startGame());
    document.getElementById("inv-again").addEventListener("click",()=>this.startGame());
    this.startScr.classList.remove("hidden");
  }
  startGame() {
    this.state.mode = "playing"; this.state.score = 0; this.state.lives = 3; this.state.frame = 0;
    this.state.bullets = []; this.state.enemyDir = 1; this.state.shotTimer = 0;
    this.state.player = {x:270,y:540,w:50,h:40}; this.spawnEnemies();
    this.scoreEl.textContent = "0"; this.livesEl.textContent = "3";
    this.startScr.classList.add("hidden"); this.overScr.classList.add("hidden");
  }
  shoot() {
    if (this.state.mode !== "playing") return;
    this.state.bullets.push({ x: this.state.player.x + 22, y: this.state.player.y, w: 5, h: 12 });
  }
  gameOver() {
    this.state.mode = "gameover";
    const isR = this.state.score > this.state.highScore;
    if (isR) { this.state.highScore = this.state.score; localStorage.setItem("invaders_high",String(this.state.highScore)); this.highEl.textContent = this.state.highScore; }
    this.finalEl.textContent = this.state.score; this.bestEl.textContent = this.state.highScore;
    this.newREl.classList.toggle("hidden", !isR); this.overScr.classList.remove("hidden");
  }
  updateGame() {
    if (this.state.mode !== "playing") return;
    this.state.frame++;
    let hitEdge = false;
    for (const e of this.state.enemies) { if (!e.alive) continue; e.x += this.state.enemyDir * (1 + Math.floor(this.state.score/20) * 0.3); if (e.x <= 10 || e.x + e.w >= this.canvas.width - 10) hitEdge = true; }
    if (hitEdge) { this.state.enemyDir *= -1; for (const e of this.state.enemies) if (e.alive) e.y += 15; }
    this.state.shotTimer++;
    if (this.state.shotTimer >= Math.max(20, this.CONSTANTS.enemyShootInterval - Math.floor(this.state.score/10))) {
      this.state.shotTimer = 0;
      const alive = this.state.enemies.filter(e => e.alive);
      if (alive.length) { const s = alive[Math.floor(Math.random()*alive.length)]; this.state.bullets.push({x:s.x+s.w/2,y:s.y+s.h,w:4,h:8,enemy:true}); }
    }
    for (const b of this.state.bullets) {
      b.y += b.enemy ? 3 : this.CONSTANTS.bulletSpeed;
      if (b.enemy) {
        if (b.x < this.state.player.x + this.state.player.w && b.x + b.w > this.state.player.x && b.y + b.h > this.state.player.y && b.y < this.state.player.y + this.state.player.h) {
          b.remove = true; this.state.lives--; this.livesEl.textContent = this.state.lives;
          if (this.state.lives <= 0) this.gameOver();
        }
      } else {
        for (const e of this.state.enemies) {
          if (!e.alive || e.remove) continue;
          if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
            e.alive = false; b.remove = true; this.state.score += 10; this.scoreEl.textContent = this.state.score;
          }
        }
      }
    }
    this.state.bullets = this.state.bullets.filter(b => !b.remove && b.y > -20 && b.y < this.canvas.height + 20);
    if (!this.state.enemies.some(e => e.alive)) { this.spawnEnemies(); }
  }
  render() {
    const ctx = this.ctx; const w = this.canvas.width, h = this.canvas.height;
    const grad = ctx.createLinearGradient(0,0,0,h); grad.addColorStop(0,"#0a0a1a"); grad.addColorStop(1,"#1a0000");
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
    for (const e of this.state.enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = "#C81010"; ctx.beginPath(); ctx.ellipse(e.x+e.w/2,e.y+e.h/2,e.w/2,e.h/2,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#E82020"; ctx.beginPath(); ctx.ellipse(e.x+e.w/2-4,e.y+e.h/2-4,6,6,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "#FFD700"; ctx.fillRect(e.x+e.w/2-8,e.y+e.h-8,16,4);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(e.x+e.w/2-5,e.y+e.h/2-6,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x+e.w/2+5,e.y+e.h/2-6,3,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = "#facc15"; ctx.fillRect(this.state.player.x,this.state.player.y,this.state.player.w,this.state.player.h);
    ctx.fillStyle = "#C81010"; ctx.fillRect(this.state.player.x+5,this.state.player.y-6,10,8); ctx.fillRect(this.state.player.x+35,this.state.player.y-6,10,8);
    for (const b of this.state.bullets) {
      ctx.fillStyle = b.enemy ? "#ff4444" : "#FFD700"; ctx.fillRect(b.x,b.y,b.w,b.h);
    }
  }
  bindEvents() {
    this._kd = (e) => {
      if (this.state.mode === "playing") {
        if (e.code === "ArrowLeft") this.state.player.x = Math.max(0, this.state.player.x - this.CONSTANTS.playerSpeed);
        if (e.code === "ArrowRight") this.state.player.x = Math.min(this.canvas.width - this.state.player.w, this.state.player.x + this.CONSTANTS.playerSpeed);
        if (e.code === "Space") { e.preventDefault(); this.shoot(); }
      }
      if ((e.code === "Space" || e.code === "Enter") && (this.state.mode === "start" || this.state.mode === "gameover")) this.startGame();
    };
    window.addEventListener("keydown", this._kd);
  }
  loop() { const n=performance.now(); const e=n-(this._last||n); this._last=n; const s=Math.max(1,Math.min(3,Math.round(e/16.67))); for(let i=0;i<s;i++)this.updateGame(); this.render(); if(this.running) this.animId=requestAnimationFrame(()=>this.loop()); }
  destroy() { this.running=false; if(this.animId)cancelAnimationFrame(this.animId); window.removeEventListener("keydown",this._kd); if(this.ui)this.ui.remove(); }
}
