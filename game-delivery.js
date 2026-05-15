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
  setupCanvas() { this.canvas.width = 400; this.canvas.height = 600; this.canvas.style.cssText = "width:100%;height:100%;display:block;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("delivery_high")||0),
      character: "hotdog", difficulty: "medium", lives: 3, deliveries: 0, combo: 0,
      bikeX: 200, targetX: 200, moving: false, cars: [], frame: 0, spawnTimer: 0, scrollY: 0,
      horizon: 155, roadTopW: 60, roadBotW: 300
    };
    this.BUILDINGS = [];
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 6; i++) {
        this.BUILDINGS.push({
          side, z: i * 80 + Math.random() * 30,
          w: 35 + Math.random() * 25, h: 80 + Math.random() * 140,
          color: ["#1a1a2e","#16213e","#0f3460","#533483","#2d2d44","#1f1f35"][Math.floor(Math.random()*6)],
          windows: Math.floor(2 + Math.random() * 3)
        });
      }
    }
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
  projectX(z, x) {
    const s = this.state;
    const t = 1 - z / 600;
    const center = s.horizon + (s.canvas.height - s.horizon) * (1 - t);
    const roadW = s.roadTopW + (s.roadBotW - s.roadTopW) * (1 - t);
    return s.canvas.width / 2 + (x - s.canvas.width / 2) * roadW / s.roadBotW;
  }
  projectY(z) {
    const s = this.state;
    const t = 1 - z / 600;
    return s.horizon + (s.canvas.height - s.horizon) * (1 - t);
  }
  scale(z) { return 1 - z / 600; }
  startGame() {
    this.state.mode = "playing"; this.state.score = 0; this.state.lives = 3; this.state.deliveries = 0;
    this.state.combo = 0; this.state.cars = []; this.state.frame = 0; this.state.spawnTimer = 0; this.state.scrollY = 0;
    this.state.bikeX = 200; this.state.targetX = 200;
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
    const w = this.canvas.width;
    const speed = {easy:2.5,medium:3.5,hard:5}[this.state.difficulty] || 3.5;
    const carRate = {easy:65,medium:45,hard:30}[this.state.difficulty] || 45;
    this.state.scrollY = (this.state.scrollY + speed * 0.5) % 600;
    if (this.state.moving) {
      const dx = this.state.targetX - this.state.bikeX;
      if (Math.abs(dx) > 3) this.state.bikeX += Math.sign(dx) * 5;
      else { this.state.bikeX = this.state.targetX; this.state.moving = false; }
    }
    const roadEdge = 50;
    this.state.bikeX = Math.max(roadEdge + 20, Math.min(w - roadEdge - 20, this.state.bikeX));
    this.state.spawnTimer++;
    if (this.state.spawnTimer >= carRate) {
      this.state.spawnTimer = 0;
      const laneOff = -60 + Math.floor(Math.random() * 3) * 60;
      const type = Math.random() > 0.5 ? "car" : "truck";
      this.state.cars.push({
        z: -50, x: w / 2 + laneOff, type,
        color: ["#C81010","#2563eb","#16a34a","#D4903C","#7c3aed","#e11d48"][Math.floor(Math.random()*6)],
        speed: speed + (Math.random() * 0.6 + 0.4), wobble: Math.random() * 0.3 - 0.15
      });
    }
    for (const c of this.state.cars) c.z += c.speed;
    this.state.cars = this.state.cars.filter(c => c.z < 600);
    const bz = 520, bx = this.state.bikeX;
    for (const c of this.state.cars) {
      const cz = c.z;
      if (cz < 0 || cz > 600) continue;
      const ch = c.type === "truck" ? 100 : 70, cw = c.type === "truck" ? 50 : 38;
      const dx = Math.abs(bx - c.x), dz = Math.abs(bz - cz);
      if (dx < cw / 2 + 14 && dz < ch / 2 + 16) {
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
  drawRoad() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, s = this.state;
    ctx.fillStyle = "#87CEEB"; ctx.fillRect(0, 0, w, s.horizon);
    ctx.fillStyle = "#b4d9e8"; ctx.fillRect(0, s.horizon - 2, w, 4);
    const grad = ctx.createLinearGradient(0, s.horizon, 0, h);
    grad.addColorStop(0, "#4a4a4a"); grad.addColorStop(0.3, "#3a3a3a"); grad.addColorStop(1, "#2a2a2a");
    ctx.fillStyle = grad; ctx.fillRect(0, s.horizon, w, h - s.horizon);
    for (const b of this.BUILDINGS) {
      const t = 1 - b.z / 600;
      if (t <= 0 || t >= 1) continue;
      const by = s.horizon + (h - s.horizon) * (1 - t);
      const bw = b.w * t;
      const bh = b.h * t;
      const bx = b.side === -1
        ? w / 2 - (s.roadBotW / 2 + b.w) * t - bw / 2
        : w / 2 + (s.roadBotW / 2) * t - bw / 2;
      ctx.fillStyle = b.color;
      ctx.fillRect(bx, by - bh, bw, bh);
      ctx.strokeStyle = "rgba(255,215,0,0.08)"; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by - bh, bw, bh);
      ctx.fillStyle = "rgba(255,215,0,0.15)";
      const ww = 4 * t, wh = 6 * t, pad = 3 * t;
      for (let r = 0; r < b.windows && r < 4; r++) {
        for (let c = 0; c < 2; c++) {
          const lx = bx + pad + c * (ww + pad * 2);
          const ly = by - bh + pad + r * (wh + pad * 2);
          if (lx + ww < bx + bw - 2 && ly + wh < by - 2) ctx.fillRect(lx, ly, Math.max(1, ww), Math.max(1, wh));
        }
      }
    }
    for (let seg = 0; seg < 40; seg++) {
      const z1 = (seg / 40) * 600 + s.scrollY % 75;
      if (z1 > 600) continue;
      const t = 1 - z1 / 600;
      if (t <= 0) continue;
      const yy = s.horizon + (h - s.horizon) * (1 - t);
      const rw = s.roadTopW + (s.roadBotW - s.roadTopW) * (1 - t);
      const lx = w / 2 - rw / 2, rx = w / 2 + rw / 2;
      ctx.strokeStyle = "#facc15"; ctx.lineWidth = Math.max(1, 2 * t);
      ctx.beginPath(); ctx.moveTo(lx, yy); ctx.lineTo(rx, yy); ctx.stroke();
    }
    const topT = 0.08;
    const lt = w / 2 - (s.roadTopW + (s.roadBotW - s.roadTopW) * (1 - topT)) / 2;
    const rt = w / 2 + (s.roadTopW + (s.roadBotW - s.roadTopW) * (1 - topT)) / 2;
    const yt = s.horizon + (h - s.horizon) * (1 - topT);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lt, yt); ctx.lineTo(w/2 - s.roadBotW/2, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rt, yt); ctx.lineTo(w/2 + s.roadBotW/2, h); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.setLineDash([10, 20]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(w/2, s.horizon + 10); ctx.lineTo(w/2, h); ctx.stroke();
    ctx.setLineDash([]);
  }
  drawCar(c) {
    const ctx = this.ctx, h = this.canvas.height, s = this.state;
    if (c.z < 0 || c.z > 600) return;
    const t = this.scale(c.z);
    if (t <= 0.02) return;
    const sy = this.projectY(c.z);
    const sx = this.projectX(c.z, c.x);
    const isTruck = c.type === "truck";
    const cw = (isTruck ? 50 : 38) * t;
    const ch = (isTruck ? 100 : 70) * t;
    const wob = Math.sin(c.z * 0.15 + c.wobble) * 2 * t;
    ctx.save(); ctx.translate(sx + wob, sy - ch/2);
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.roundRect(-cw/2-2, -2, cw+4, ch+4, 4*t); ctx.fill();
    ctx.fillStyle = c.color;
    ctx.beginPath(); ctx.roundRect(-cw/2, 0, cw, ch, 3*t); ctx.fill();
    if (isTruck) {
      ctx.fillStyle = "rgba(200,200,255,0.3)";
      ctx.fillRect(-cw/2+3*t, ch*0.15, cw-6*t, ch*0.35);
      ctx.fillRect(-cw/2+3*t, ch*0.55, cw-6*t, ch*0.2);
    } else {
      ctx.fillStyle = "rgba(200,200,255,0.35)";
      ctx.fillRect(-cw/2+3*t, ch*0.2, cw-6*t, ch*0.35);
    }
    ctx.fillStyle = "#111";
    const wr = 3*t, wh = 4*t;
    ctx.fillRect(-cw/2+2*t, ch - wh - 2*t, cw*0.25, wh);
    ctx.fillRect(-cw/2+2*t, 2*t, cw*0.25, wh);
    ctx.fillRect(cw/2-2*t - cw*0.25, ch - wh - 2*t, cw*0.25, wh);
    ctx.fillRect(cw/2-2*t - cw*0.25, 2*t, cw*0.25, wh);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-cw/2+1, ch*0.02, 2*t, 2*t);
    ctx.fillRect(cw/2-1-2*t, ch*0.02, 2*t, 2*t);
    ctx.fillRect(-cw/2+1, ch-2*t-2*t, 2*t, 2*t);
    ctx.fillRect(cw/2-1-2*t, ch-2*t-2*t, 2*t, 2*t);
    ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 8*t;
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(0, ch + 3*t, cw*0.35, 2*t, 0, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
  drawBike() {
    const ctx = this.ctx, s = this.state, h = this.canvas.height;
    const bz = 520, bx = s.bikeX;
    const t = this.scale(bz);
    const sy = this.projectY(bz) - 10;
    const sx = this.projectX(bz, bx);
    const sc = 1.2 * t * (s.canvas.width / 400);
    ctx.save(); ctx.translate(sx, sy);
    ctx.scale(sc, sc);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath(); ctx.ellipse(0, 34, 22, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.roundRect(-14, 6, 28, 26, 6); ctx.fill();
    ctx.fillStyle = "#555"; ctx.fillRect(-12, 10, 24, 8);
    ctx.fillStyle = "#C81010"; ctx.beginPath(); ctx.roundRect(-4, 0, 8, 14, 2); ctx.fill();
    ctx.strokeStyle = "#888"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-16, 18); ctx.quadraticCurveTo(-20, 24, -20, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, 18); ctx.quadraticCurveTo(20, 24, 20, 30); ctx.stroke();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.ellipse(-18, 31, 4, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(18, 31, 4, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#666"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(8, -4); ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.arc(0, -8, 4, 0, Math.PI, false); ctx.fill();
    const ch = this.CHARACTERS.find(c => c.id === s.character) || this.CHARACTERS[0];
    ctx.font = "18px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(ch.emoji, 0, -6);
    ctx.restore();
  }
  render() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0,0,w,h);
    this.drawRoad();
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
        if (e.code === "ArrowLeft") { this.state.targetX = this.state.bikeX - 70; this.state.moving = true; }
        if (e.code === "ArrowRight") { this.state.targetX = this.state.bikeX + 70; this.state.moving = true; }
      }
      if ((e.code === "Space" || e.code === "Enter") && (this.state.mode === "start" || this.state.mode === "gameover")) this.startGame();
    };
    this._pd = (e) => {
      if (this.state.mode === "playing") {
        const rect = this.canvas.getBoundingClientRect();
        this.state.targetX = (e.clientX - rect.left) / rect.width * this.canvas.width;
        this.state.moving = true;
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
