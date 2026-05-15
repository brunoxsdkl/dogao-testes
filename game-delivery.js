class DeliveryGame {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.animId = null; this.running = true; this._last = null;
    this._audioCtx = null; this._musicTimer = null;
    this.CHARACTERS = [
      { id: "hotdog", label: "Hot Dog", emoji: "🌭", color: "#C81010" },
      { id: "burger", label: "X-Burguer", emoji: "🍔", color: "#16a34a" },
      { id: "dog", label: "Dogao", emoji: "🐕", color: "#f59e0b" },
    ];
    this.setupCanvas(); this.init();
  }
  setupCanvas() { this.canvas.width = 480; this.canvas.height = 640; this.canvas.style.cssText = "width:100%;height:100%;display:block;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("delivery_high")||0),
      character: "hotdog", difficulty: "medium", lives: 3, deliveries: 0, combo: 0, frame: 0,
      bikeX: 240, bikeY: 580, targetX: 240, targetY: 580, movingX: false, movingY: false,
      cars: [], spawnTimer: 0, scrollY: 0
    };
    this.ROAD = { left: 100, right: 380, center: 240 };
    this.createUI(); this.bindEvents(); this.render(); this._last = performance.now(); this.loop();
  }
  createUI() {
    const par = this.canvas.parentElement; this.ui = document.createElement("div"); this.ui.id = "del-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;";
    this.ui.innerHTML = `
      <button class="sound-button" id="del-soundBtn" type="button" aria-label="Silenciar som" style="position:absolute;top:max(12px,env(safe-area-inset-top));right:12px;z-index:30;width:42px;height:42px;border-radius:50%;background:rgba(0,0,0,0.32);color:white;display:grid;place-items:center;font-size:20px;backdrop-filter:blur(5px);border:0;cursor:pointer;pointer-events:auto;">🔊</button>
      <div style="position:absolute;top:8px;left:12px;right:12px;z-index:5;display:none;justify-content:space-between;color:#fff;font-size:11px;font-family:'Press Start 2P',monospace;text-shadow:0 2px 4px rgba(0,0,0,0.5);" id="del-scorebar">
        <span>🏆 <span id="del-high">${this.state.highScore}</span></span>
        <span>❤️ <span id="del-lives">3</span></span>
        <span>📦 <span id="del-score">0</span></span>
      </div>
      <section class="screen dino-start hidden" id="del-startScreen">
        <div class="title-stack" style="animation:popIn 0.55s 0.15s both;">
          <h1 style="color:#facc15;font-size:clamp(32px,10vw,52px);margin:0;line-height:0.9;">Dogao</h1>
          <h2 style="color:white;font-size:clamp(24px,8vw,40px);margin:0;line-height:0.9;">Motoqueiro</h2>
          <h2 style="color:#facc15;font-size:clamp(24px,8vw,40px);margin:0;line-height:0.9;">Delivery</h2>
        </div>
        <div style="font-size:clamp(48px,14vw,72px);margin:8px 0;animation:bob 1.8s ease-in-out infinite;">🏍️</div>
        <p style="color:rgba(254,240,138,0.9);font-size:10px;font-family:'Press Start 2P',monospace;margin:0 0 6px;">🏆 RECORDE: ${this.state.highScore}</p>
        <div class="chooser" style="width:min(100%,340px);margin:4px 0;"><p style="margin:0 0 6px;font-size:8px;">PERSONAGEM</p><div class="card-row" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;" id="del-charOpts"></div></div>
        <div class="chooser" style="width:min(100%,280px);margin:4px 0;"><p style="margin:0 0 6px;font-size:8px;">DIFICULDADE</p><div class="card-row" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;" id="del-diffs"></div></div>
        <button class="play-button" style="min-width:180px;margin-top:6px;border:4px solid #fff3a3;border-radius:999px;padding:11px 24px;background:#facc15;color:#8b1d12;box-shadow:0 13px 24px rgba(0,0,0,0.32);font-size:clamp(20px,7vw,30px);cursor:pointer;pointer-events:auto;" id="del-play">▶ JOGAR</button>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.52);font-size:8px;">← → ou TOQUE: DESVIAR</p>
      </section>
      <section class="screen dino-over hidden" id="del-overScreen">
        <div class="gameover-card" style="width:min(80vw,300px);border:4px solid #facc15;border-radius:24px;padding:20px;background:white;color:#a80d0d;box-shadow:0 24px 70px rgba(0,0,0,0.34);animation:popIn 0.42s both;">
          <div style="font-size:40px;">💥</div>
          <h2 style="margin:4px 0 8px;font-size:26px;">ENTREGAS: ${this.state.deliveries}</h2>
          <p class="hidden" id="del-newR" style="color:#eab308;font-size:9px;">★ NOVO RECORDE! ★</p>
          <div class="result-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 8px;">
            <div style="border-radius:16px;padding:12px 8px;background:#fef2f2;"><span style="color:#ef4444;font-size:7px;">PONTOS</span><strong id="del-final" style="font-size:36px;">0</strong></div>
            <div style="border-radius:16px;padding:12px 8px;background:#fff7d1;"><span style="color:#ef4444;font-size:7px;">RECORDE</span><strong id="del-best" style="font-size:36px;">0</strong></div>
          </div>
          <button class="again-button" style="border:2px solid #facc15;border-radius:999px;padding:10px 22px;background:linear-gradient(90deg,#dc2626,#b91c1c);color:white;box-shadow:0 8px 20px rgba(185,28,28,0.35);font-size:20px;cursor:pointer;pointer-events:auto;" id="del-again">↻ DE NOVO!</button>
        </div>
      </section>
    `;
    par.appendChild(this.ui);
    this.scoreEl = document.getElementById("del-score"); this.highEl = document.getElementById("del-high");
    this.livesEl = document.getElementById("del-lives"); this.scorebar = document.getElementById("del-scorebar");
    this.startScr = document.getElementById("del-startScreen"); this.overScr = document.getElementById("del-overScreen");
    this.finalEl = document.getElementById("del-final"); this.bestEl = document.getElementById("del-best");
    this.newREl = document.getElementById("del-newR"); this.soundBtn = document.getElementById("del-soundBtn");
    this.buildSel("del-charOpts", this.CHARACTERS, (id)=>this.state.character=id);
    this.diffs = [{id:"easy",label:"Facil",emoji:"😊"},{id:"medium",label:"Medio",emoji:"😤"},{id:"hard",label:"Dificil",emoji:"💀"}];
    const dEl = document.getElementById("del-diffs");
    for (const d of this.diffs) {
      const b = document.createElement("button"); b.className="card"; b.type="button"; b.style.pointerEvents="auto";
      b.innerHTML=`<span class="emoji">${d.emoji}</span><span>${d.label}</span>`;
      b.addEventListener("click",()=>{this.state.difficulty=d.id;for(const x of dEl.children)x.classList.toggle("active",x===b);});
      dEl.appendChild(b);
    }
    document.getElementById("del-play").addEventListener("click",()=>this.startGame());
    document.getElementById("del-again").addEventListener("click",()=>this.startGame());
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
    this.state.mode = "playing"; this.state.score = 0; this.state.lives = 3; this.state.deliveries = 0;
    this.state.combo = 0; this.state.cars = []; this.state.frame = 0; this.state.spawnTimer = 0;
    this.state.bikeX = 240; this.state.bikeY = 580; this.state.targetX = 240; this.state.targetY = 580;
    this.scoreEl.textContent = "0"; this.livesEl.textContent = "3"; this.highEl.textContent = this.state.highScore;
    this.startScr.classList.add("hidden"); this.overScr.classList.add("hidden");
    this.scorebar.style.display = "flex"; this.playMusic();
  }
  gameOver() {
    this.state.mode = "gameover"; this.stopMusic(); this.playCrash();
    const pts = this.state.deliveries * 10 + this.state.score;
    const isR = pts > this.state.highScore;
    if (isR) { this.state.highScore = pts; localStorage.setItem("delivery_high",String(this.state.highScore)); this.highEl.textContent = this.state.highScore; }
    this.finalEl.textContent = pts; this.bestEl.textContent = this.state.highScore;
    this.newREl.classList.toggle("hidden", !isR); this.scorebar.style.display = "none";
    this.overScr.classList.remove("hidden");
  }
  updateGame() {
    if (this.state.mode !== "playing") return;
    this.state.frame++;
    const r = this.ROAD;
    const speed = {easy:2,medium:3,hard:4.5}[this.state.difficulty] || 3;
    const carRate = {easy:55,medium:38,hard:25}[this.state.difficulty] || 38;
    if (this.state.movingX) {
      const dx = this.state.targetX - this.state.bikeX;
      if (Math.abs(dx) > 2) this.state.bikeX += Math.sign(dx) * 4;
      else { this.state.bikeX = this.state.targetX; this.state.movingX = false; }
    }
    if (this.state.movingY) {
      const dy = this.state.targetY - this.state.bikeY;
      if (Math.abs(dy) > 2) this.state.bikeY += Math.sign(dy) * 4;
      else { this.state.bikeY = this.state.targetY; this.state.movingY = false; }
    }
    this.state.bikeX = Math.max(r.left + 18, Math.min(r.right - 18, this.state.bikeX));
    this.state.bikeY = Math.max(100, Math.min(620, this.state.bikeY));
    const w = this.canvas.width, h = this.canvas.height;
    this.state.spawnTimer++;
    if (this.state.spawnTimer >= carRate) {
      this.state.spawnTimer = 0;
      const dir = Math.random() > 0.5 ? 1 : -1;
      const laneX = r.left + 30 + Math.floor(Math.random() * 4) * 52;
      const laneY = dir === 1 ? -60 : h + 60;
      const isTruck = Math.random() > 0.6;
      this.state.cars.push({
        x: laneX, y: laneY, w: isTruck ? 44 : 32, h: isTruck ? 56 : 40, dir,
        type: isTruck ? "truck" : "car",
        color: ["#C81010","#2563eb","#16a34a","#D4903C","#7c3aed","#e11d48","#0891b2","#4f46e5"][Math.floor(Math.random()*8)],
        speed: speed + Math.random() * 0.8 + 0.3
      });
    }
    for (const c of this.state.cars) c.y += c.speed * c.dir;
    this.state.cars = this.state.cars.filter(c => c.y > -100 && c.y < h + 100);
    const bx = this.state.bikeX, by = this.state.bikeY;
    for (const c of this.state.cars) {
      if (bx - 14 < c.x + c.w && bx + 14 > c.x && by - 16 < c.y + c.h && by + 16 > c.y) {
        this.state.lives--; this.livesEl.textContent = this.state.lives; this.playCrash();
        this.state.cars = this.state.cars.filter(cc => cc !== c);
        this.state.combo = 0;
        if (this.state.lives <= 0) { this.gameOver(); return; }
      }
    }
    this.state.deliveries = Math.floor(this.state.frame / 180);
    const lastDel = Math.floor((this.state.frame - 1) / 180);
    if (this.state.deliveries > lastDel) { this.state.score += 10 + this.state.combo * 2; this.state.combo++; this.scoreEl.textContent = this.state.score; this.playScore(); }
  }
  drawBuildings() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, r = this.ROAD;
    ctx.fillStyle = "#3a7a3a"; ctx.fillRect(0, 0, r.left, h);
    ctx.fillRect(r.right, 0, w - r.right, h);
    ctx.fillStyle = "#5a5a3a"; ctx.fillRect(0, 0, r.left, h);
    ctx.fillRect(r.right, 0, w - r.right, h);
    const buildings = [
      {x:4,y:20,w:88,h:70,color:"#6b4c3b"},
      {x:4,y:104,w:88,h:90,color:"#5a5a6a"},
      {x:4,y:208,w:88,h:60,color:"#4a6b4a"},
      {x:4,y:282,w:88,h:100,color:"#6a4a5a"},
      {x:4,y:396,w:88,h:80,color:"#5a6a6a"},
      {x:4,y:490,w:88,h:70,color:"#6b5a4a"},
      {x:4,y:574,w:88,h:60,color:"#4a5a6a"},
      {x:r.right+4,y:20,w:88,h:85,color:"#5a6a4a"},
      {x:r.right+4,y:118,w:88,h:65,color:"#6a5a5a"},
      {x:r.right+4,y:196,w:88,h:95,color:"#4a6a6a"},
      {x:r.right+4,y:304,w:88,h:70,color:"#6b4b4b"},
      {x:r.right+4,y:388,w:88,h:85,color:"#5b6b4b"},
      {x:r.right+4,y:486,w:88,h:75,color:"#6a5b6a"},
      {x:r.right+4,y:574,w:88,h:60,color:"#4b5b6b"},
    ];
    for (const b of buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, 6);
      ctx.fillStyle = "rgba(255,215,0,0.2)";
      for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 3; c2++) {
        ctx.fillRect(b.x + 6 + c2 * 26, b.y + 14 + r2 * 22, 10, 12);
      }
    }
    ctx.fillStyle = "#888";
    ctx.fillRect(r.left - 6, 0, 6, h);
    ctx.fillRect(r.right, 0, 6, h);
  }
  drawRoadSurface() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, r = this.ROAD;
    ctx.fillStyle = "#555"; ctx.fillRect(r.left, 0, r.right - r.left, h);
    ctx.fillStyle = "#4a4a4a";
    for (let y = 0; y < h; y += 40) ctx.fillRect(r.left + 15, y, r.right - r.left - 30, 20);
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 1;
    ctx.setLineDash([20, 30]); ctx.beginPath(); ctx.moveTo(r.center, 0); ctx.lineTo(r.center, h); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#fff";
    for (let y = 0; y < h; y += 60) {
      ctx.fillRect(r.left + 8, y, 4, 30);
      ctx.fillRect(r.right - 12, y, 4, 30);
    }
  }
  drawCar(c) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(c.x + c.w/2, c.y + c.h/2);
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.roundRect(-c.w/2-2, -c.h/2-2, c.w+4, c.h+4, 3); ctx.fill();
    ctx.fillStyle = c.color;
    ctx.beginPath(); ctx.roundRect(-c.w/2, -c.h/2, c.w, c.h, 2); ctx.fill();
    ctx.fillStyle = "rgba(200,230,255,0.35)";
    if (c.type === "truck") {
      ctx.fillRect(-c.w/2+3, -c.h*0.3, c.w-6, c.h*0.25);
      ctx.fillRect(-c.w/2+3, c.h*0.05, c.w-6, c.h*0.25);
    } else {
      ctx.fillRect(-c.w/2+3, -c.h*0.35, c.w-6, c.h*0.4);
    }
    ctx.fillStyle = "#111";
    ctx.fillRect(-c.w/2+2, -c.h/2+2, 5, 4);
    ctx.fillRect(c.w/2-7, -c.h/2+2, 5, 4);
    ctx.fillRect(-c.w/2+2, c.h/2-6, 5, 4);
    ctx.fillRect(c.w/2-7, c.h/2-6, 5, 4);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-c.w/2-1, -c.h/2+3, 2, 2);
    ctx.fillRect(c.w/2-1, -c.h/2+3, 2, 2);
    ctx.restore();
  }
  drawBike() {
    const ctx = this.ctx; const bx = this.state.bikeX, by = this.state.bikeY;
    ctx.save(); ctx.translate(bx, by);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(0, 18, 18, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#C81010";
    ctx.beginPath(); ctx.roundRect(-10, -18, 20, 34, 4); ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-8, -16, 16, 5);
    ctx.fillRect(-8, 12, 16, 5);
    ctx.fillStyle = "#333";
    ctx.fillRect(-2, -6, 4, 14);
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.ellipse(-10, 16, 4, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, 16, 4, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.arc(0, -16, 4, 0, Math.PI, false); ctx.fill();
    ctx.strokeStyle = "#666"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-6, -20); ctx.lineTo(6, -20); ctx.stroke();
    const ch = this.CHARACTERS.find(c => c.id === this.state.character) || this.CHARACTERS[0];
    ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(ch.emoji, 0, -7);
    ctx.restore();
  }
  render() {
    const ctx = this.ctx; const w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = "#2d2d2d"; ctx.fillRect(0,0,w,h);
    this.drawBuildings();
    this.drawRoadSurface();
    for (const c of this.state.cars) this.drawCar(c);
    if (this.state.mode === "playing" || this.state.mode === "gameover") this.drawBike();
  }
  audio() {
    if (this.state.muted) return null;
    const actx = this._audioCtx;
    if (actx) { if (actx.state === "suspended") actx.resume(); return actx; }
    const newCtx = new (window.AudioContext || window.webkitAudioContext)();
    this._audioCtx = newCtx; return newCtx;
  }
  tone(type, freq, start, dur, vol) {
    const actx = this.audio(); if (!actx) return;
    const gain = actx.createGain(); gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur); gain.connect(actx.destination);
    const osc = actx.createOscillator(); osc.type = type;
    osc.frequency.setValueAtTime(freq, start); osc.connect(gain);
    osc.start(start); osc.stop(start + dur + 0.02);
  }
  playScore() { const a=this.audio(); if(!a)return; const n=a.currentTime; this.tone("square",880,n,0.08,0.1); this.tone("square",1320,n+0.05,0.08,0.08); }
  playCrash() { const a=this.audio(); if(!a)return; const n=a.currentTime; this.tone("sawtooth",350,n,0.4,0.28); this.tone("square",50,n,0.3,0.35); }
  playMusic() {
    this.stopMusic(); if (this.state.muted) return;
    const melody = [392,440,494,523,494,440,392,349,330,294,330,349,392,440,494,523,587,523,494,440,392,349,330,294];
    let i = 0;
    this._musicTimer = setInterval(() => {
      const a = this.audio(); if (!a || this.state.mode !== "playing") return;
      const n = melody[i % melody.length]; if (n) this.tone("square", n, a.currentTime, 0.1, 0.03);
      i++;
    }, 160);
  }
  stopMusic() { if (this._musicTimer) clearInterval(this._musicTimer); this._musicTimer = null; }
  toggleSound(e) {
    e.stopPropagation(); this.state.muted = !this.state.muted;
    this.soundBtn.textContent = this.state.muted ? "🔇" : "🔊";
    this.soundBtn.setAttribute("aria-label", this.state.muted ? "Ativar som" : "Silenciar som");
    if (this.state.muted) this.stopMusic();
    if (!this.state.muted && this.state.mode === "playing") this.playMusic();
  }
  bindEvents() {
    this._kd = (e) => {
      if (this.state.mode === "playing") {
        if (e.code === "ArrowLeft") { this.state.targetX = this.state.bikeX - 50; this.state.movingX = true; }
        if (e.code === "ArrowRight") { this.state.targetX = this.state.bikeX + 50; this.state.movingX = true; }
        if (e.code === "ArrowUp") { this.state.targetY = this.state.bikeY - 50; this.state.movingY = true; }
        if (e.code === "ArrowDown") { this.state.targetY = this.state.bikeY + 50; this.state.movingY = true; }
      }
      if ((e.code === "Space" || e.code === "Enter") && (this.state.mode === "start" || this.state.mode === "gameover")) this.startGame();
    };
    this._pd = (e) => {
      if (this.state.mode === "playing") {
        const rect = this.canvas.getBoundingClientRect();
        this.state.targetX = (e.clientX - rect.left) / rect.width * this.canvas.width;
        this.state.targetY = (e.clientY - rect.top) / rect.height * this.canvas.height;
        this.state.movingX = true; this.state.movingY = true;
      }
      if (this.state.mode === "start" || this.state.mode === "gameover") this.startGame();
    };
    this._soundFn = (e) => this.toggleSound(e);
    window.addEventListener("keydown", this._kd);
    this.canvas.addEventListener("pointerdown", this._pd);
    this.soundBtn.addEventListener("click", this._soundFn);
  }
  loop() { const n=performance.now(); const e=n-(this._last||n); this._last=n; const s=Math.max(1,Math.min(3,Math.round(e/16.67))); for(let i=0;i<s;i++)this.updateGame(); this.render(); if(this.running)this.animId=requestAnimationFrame(()=>this.loop()); }
  destroy() { this.running=false; if(this.animId)cancelAnimationFrame(this.animId); this.stopMusic(); window.removeEventListener("keydown",this._kd); this.canvas.removeEventListener("pointerdown",this._pd); this.soundBtn.removeEventListener("click",this._soundFn); if(this.ui)this.ui.remove(); }
}
