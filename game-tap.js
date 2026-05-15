class TapGame {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.animId = null; this.running = true; this._last = null;
    this.setupCanvas(); this.init();
  }
  setupCanvas() { this.canvas.width = 400; this.canvas.height = 500; this.canvas.style.cssText = "width:100%;height:100%;display:block;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("tap_high")||0),
      difficulty: "medium", targets: [], spawnTimer: 0, maxTargets: 1, combo: 0, missed: 0
    };
    this.createUI(); this.bindEvents(); this.render(); this._last = performance.now(); this.loop();
  }
  createUI() {
    const par = this.canvas.parentElement; this.ui = document.createElement("div"); this.ui.id = "tap-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;";
    this.ui.innerHTML = `
      <div style="position:absolute;top:8px;left:12px;right:12px;z-index:5;display:flex;justify-content:space-between;color:#fff;font-size:11px;font-family:'Press Start 2P',monospace;text-shadow:0 2px 4px rgba(0,0,0,0.5);">
        <span>🏆 <span id="tap-high">${this.state.highScore}</span></span>
        <span>🔥 <span id="tap-combo">0</span></span>
        <span>⭐ <span id="tap-score">0</span></span>
      </div>
      <section class="screen dino-start hidden" id="tap-startScreen">
        <div class="title-stack" style="animation:popIn 0.55s 0.15s both;">
          <h1 style="color:#facc15;font-size:clamp(32px,10vw,52px);margin:0;">Dogao</h1>
          <h2 style="color:white;font-size:clamp(36px,11vw,60px);margin:0;">Tap Target</h2>
        </div>
        <div style="font-size:clamp(48px,14vw,72px);margin:8px 0;animation:bob 1.8s ease-in-out infinite;">🎯</div>
        <p style="color:rgba(254,240,138,0.9);font-size:10px;font-family:'Press Start 2P',monospace;margin:0 0 6px;">🏆 RECORDE: ${this.state.highScore}</p>
        <div class="chooser" style="width:min(100%,280px);margin:4px 0;"><p style="margin:0 0 6px;font-size:8px;">DIFICULDADE</p><div class="card-row" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;" id="tap-diffs"></div></div>
        <button class="play-button" style="min-width:180px;margin-top:6px;border:4px solid #fff3a3;border-radius:999px;padding:11px 24px;background:#facc15;color:#8b1d12;box-shadow:0 13px 24px rgba(0,0,0,0.32);font-size:clamp(20px,7vw,30px);cursor:pointer;pointer-events:auto;" id="tap-play">▶ JOGAR</button>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.52);font-size:8px;">TOQUE NOS ALVOS!</p>
      </section>
      <section class="screen dino-over hidden" id="tap-overScreen">
        <div class="gameover-card" style="width:min(80vw,300px);border:4px solid #facc15;border-radius:24px;padding:20px;background:white;color:#a80d0d;box-shadow:0 24px 70px rgba(0,0,0,0.34);animation:popIn 0.42s both;">
          <div style="font-size:40px;">💥</div>
          <h2 style="margin:4px 0 8px;font-size:26px;">VOCE PERDEU!</h2>
          <p class="hidden" id="tap-newR" style="color:#eab308;font-size:9px;">★ NOVO RECORDE! ★</p>
          <div class="result-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px;">
            <div style="border-radius:16px;padding:12px 8px;background:#fef2f2;"><span style="color:#ef4444;font-size:7px;">PONTOS</span><strong id="tap-final" style="font-size:36px;">0</strong></div>
            <div style="border-radius:16px;padding:12px 8px;background:#fff7d1;"><span style="color:#ef4444;font-size:7px;">RECORDE</span><strong id="tap-best" style="font-size:36px;">0</strong></div>
          </div>
          <button class="again-button" style="border:2px solid #facc15;border-radius:999px;padding:10px 22px;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;box-shadow:0 8px 20px rgba(185,28,28,0.35);font-size:20px;cursor:pointer;pointer-events:auto;" id="tap-again">↻ DE NOVO!</button>
        </div>
      </section>
    `;
    par.appendChild(this.ui);
    this.scoreEl = document.getElementById("tap-score"); this.highEl = document.getElementById("tap-high");
    this.comboEl = document.getElementById("tap-combo"); this.startScr = document.getElementById("tap-startScreen");
    this.overScr = document.getElementById("tap-overScreen"); this.finalEl = document.getElementById("tap-final");
    this.bestEl = document.getElementById("tap-best"); this.newREl = document.getElementById("tap-newR");

    this.diffs = [{id:"easy",label:"Facil",emoji:"😊"},{id:"medium",label:"Medio",emoji:"😤"},{id:"hard",label:"Dificil",emoji:"💀"}];
    const dEl = document.getElementById("tap-diffs");
    for (const d of this.diffs) {
      const b = document.createElement("button"); b.className="card"; b.type="button"; b.style.pointerEvents="auto";
      b.innerHTML=`<span class="emoji">${d.emoji}</span><span>${d.label}</span>`;
      b.addEventListener("click",()=>{this.state.difficulty=d.id;for(const x of dEl.children)x.classList.toggle("active",x===b);});
      dEl.appendChild(b);
    }
    document.getElementById("tap-play").addEventListener("click",()=>this.startGame());
    document.getElementById("tap-again").addEventListener("click",()=>this.startGame());
    this.startScr.classList.remove("hidden");
    this.state.difficulty = "medium";
  }
  startGame() {
    this.state.mode = "playing"; this.state.score = 0; this.state.combo = 0; this.state.missed = 0;
    this.state.targets = []; this.state.spawnTimer = 0; this.state.maxTargets = 1;
    this.scoreEl.textContent = "0"; this.comboEl.textContent = "0";
    this.startScr.classList.add("hidden"); this.overScr.classList.add("hidden");
  }
  finishGame() {
    this.state.mode = "gameover";
    const isR = this.state.score > this.state.highScore;
    if (isR) { this.state.highScore = this.state.score; localStorage.setItem("tap_high",String(this.state.highScore)); this.highEl.textContent = this.state.highScore; }
    this.finalEl.textContent = this.state.score; this.bestEl.textContent = this.state.highScore;
    this.newREl.classList.toggle("hidden", !isR); this.overScr.classList.remove("hidden");
  }
  updateGame() {
    if (this.state.mode !== "playing") return;
    const w = this.canvas.width, h = this.canvas.height;
    const speeds = {easy:180,medium:120,hard:70};
    const spawnRates = {easy:50,medium:35,hard:20};
    const maxLife = speeds[this.state.difficulty] || 120;

    if (this.state.maxTargets < 8 && this.state.score > this.state.maxTargets * 30) this.state.maxTargets++;
    this.state.spawnTimer++;
    if (this.state.spawnTimer >= spawnRates[this.state.difficulty] && this.state.targets.length < this.state.maxTargets) {
      this.state.spawnTimer = 0;
      const margin = 30;
      this.state.targets.push({
        x: margin + Math.random() * (w - margin * 2),
        y: margin + Math.random() * (h - margin * 2),
        r: 22, life: 0, maxLife
      });
    }
    for (const t of this.state.targets) { t.life++; t.r = 22 * (1 - t.life / t.maxLife * 0.4); }
    const before = this.state.targets.length;
    this.state.targets = this.state.targets.filter(t => t.life < t.maxLife);
    const missedNow = before - this.state.targets.length;
    if (missedNow > 0) { this.state.combo = 0; this.comboEl.textContent = "0"; this.state.missed += missedNow; if (this.state.missed >= 3) this.finishGame(); }
  }
  render() {
    const ctx = this.ctx; const w = this.canvas.width, h = this.canvas.height;
    const grad = ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w); grad.addColorStop(0,"#1a1a3e"); grad.addColorStop(1,"#0a0a1a");
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
    for (const t of this.state.targets) {
      const alpha = Math.max(0.3, 1 - t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#C81010"; ctx.beginPath(); ctx.arc(t.x, t.y, t.r + 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(t.x - t.r*0.25, t.y - t.r*0.25, t.r*0.35, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      if (this.state.missed >= 2) {
        ctx.fillStyle = "rgba(255,0,0,0.15)"; ctx.fillRect(0,0,w,h);
      }
    }
  }
  bindEvents() {
    this._clk = (e) => {
      if (this.state.mode !== "playing") return;
      const rect = this.canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) / rect.width * this.canvas.width;
      const sy = (e.clientY - rect.top) / rect.height * this.canvas.height;
      for (let i = this.state.targets.length - 1; i >= 0; i--) {
        const t = this.state.targets[i];
        const dist = Math.hypot(sx - t.x, sy - t.y);
        if (dist < t.r + 10) {
          this.state.targets.splice(i, 1);
          this.state.combo++;
          this.comboEl.textContent = this.state.combo;
          const bonus = Math.min(this.state.combo, 10);
          this.state.score += 10 + bonus;
          this.scoreEl.textContent = this.state.score;
          return;
        }
      }
      this.state.combo = 0; this.comboEl.textContent = "0";
    };
    this.canvas.addEventListener("click", this._clk);
    this.canvas.addEventListener("touchstart", (e) => { e.preventDefault(); const t = e.changedTouches[0]; this._clk(t); }, {passive:false});
  }
  loop() { const n=performance.now(); const e=n-(this._last||n); this._last=n; const s=Math.max(1,Math.min(3,Math.round(e/16.67))); for(let i=0;i<s;i++)this.updateGame(); this.render(); if(this.running)this.animId=requestAnimationFrame(()=>this.loop()); }
  destroy() { this.running=false; if(this.animId)cancelAnimationFrame(this.animId); this.canvas.removeEventListener("click",this._clk); if(this.ui)this.ui.remove(); }
}
