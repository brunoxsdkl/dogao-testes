class DeliveryGame {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d");
    this.animId = null; this.running = true; this._last = null;
    this._audioCtx = null; this._musicTimer = null;
    this.CHARACTERS = [
      { id: "hotdog", label: "Hot Dog", emoji: "🌭" },
      { id: "burger", label: "X-Burguer", emoji: "🍔" },
      { id: "dog", label: "Dogao", emoji: "🐕" },
    ];
    this.setupCanvas(); this.init();
  }
  setupCanvas() { this.canvas.width = 400; this.canvas.height = 600; this.canvas.style.cssText = "width:100%;height:100%;display:block;"; }
  init() {
    this.state = {
      mode: "start", score: 0, highScore: Number(localStorage.getItem("delivery_high")||0),
      character: "hotdog", difficulty: "medium", lives: 3, deliveries: 0, combo: 0,
      bike: { x: 200, y: 520, w: 20, h: 36, speed: 4 },
      cars: [], roadOffset: 0, frame: 0, spawnTimer: 0,
      targetX: 200, moving: false
    };
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
    this.state.bike.x = 200; this.state.targetX = 200;
    this.scoreEl.textContent = "0"; this.livesEl.textContent = "3"; this.highEl.textContent = this.state.highScore;
    this.startScr.classList.add("hidden"); this.overScr.classList.add("hidden");
    this.scorebar.style.display = "flex";
    this.playMusic();
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
    const w = this.canvas.width, h = this.canvas.height;
    const speed = {easy:2.5,medium:3.5,hard:5}[this.state.difficulty] || 3.5;
    const carRate = {easy:70,medium:50,hard:35}[this.state.difficulty] || 50;

    if (this.state.moving) {
      const dx = this.state.targetX - this.state.bike.x;
      if (Math.abs(dx) > 2) this.state.bike.x += Math.sign(dx) * this.state.bike.speed;
      else { this.state.bike.x = this.state.targetX; this.state.moving = false; }
    }
    this.state.bike.x = Math.max(30 + this.state.bike.w/2, Math.min(w - 30 - this.state.bike.w/2, this.state.bike.x));

    this.state.spawnTimer++;
    if (this.state.spawnTimer >= carRate) {
      this.state.spawnTimer = 0;
      const lane = 60 + Math.floor(Math.random() * 4) * 80;
      const type = Math.random() > 0.55 ? "car" : "truck";
      const cw = type === "truck" ? 36 : 26, ch = 44;
      this.state.cars.push({
        x: lane, y: -ch, w: cw, h: ch, type,
        color: ["#C81010","#2563eb","#16a34a","#D4903C","#7c3aed"][Math.floor(Math.random()*5)],
        speed: speed + (Math.random() * 0.8 + 0.3)
      });
    }

    for (const c of this.state.cars) c.y += c.speed;
    this.state.cars = this.state.cars.filter(c => c.y < h + 60);

    const b = this.state.bike;
    for (const c of this.state.cars) {
      if (b.x - b.w/2 + 4 < c.x + c.w - 4 && b.x + b.w/2 - 4 > c.x + 4 &&
          b.y - b.h/2 + 4 < c.y + c.h - 4 && b.y + b.h/2 - 4 > c.y + 4) {
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
  render() {
    const ctx = this.ctx; const w = this.canvas.width, h = this.canvas.height;
    ctx.fillStyle = "#2d2d2d"; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "#444"; ctx.fillRect(140,0,120,h);
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 2; ctx.setLineDash([20,16]);
    ctx.beginPath(); ctx.moveTo(200,0); ctx.lineTo(200,h); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(145,0); ctx.lineTo(145,h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(255,0); ctx.lineTo(255,h); ctx.stroke();
    this.state.roadOffset = (this.state.roadOffset + 2) % 60;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let y = -this.state.roadOffset; y < h; y += 60) ctx.fillRect(195, y, 10, 30);
    ctx.fillStyle = "rgba(255,215,0,0.06)";
    for (let y = -this.state.roadOffset; y < h; y += 30) { ctx.fillRect(145, y, 2, 15); ctx.fillRect(253, y, 2, 15); }

    for (const c of this.state.cars) {
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 5); ctx.fill();
      ctx.fillStyle = "rgba(255,215,0,0.2)";
      if (c.type === "truck") { ctx.fillRect(c.x+4, c.y+6, c.w-8, 8); ctx.fillRect(c.x+4, c.y+c.h-14, c.w-8, 8); }
      else { ctx.fillRect(c.x+4, c.y+4, c.w-8, 5); ctx.fillRect(c.x+4, c.y+c.h-9, c.w-8, 5); }
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(c.x + c.w/2 - 1, c.y + 2, 2, 4);
    }

    if (this.state.mode === "playing" || this.state.mode === "gameover") {
      const b = this.state.bike;
      ctx.save(); ctx.translate(b.x, b.y);
      ctx.fillStyle = "#C81010"; ctx.beginPath(); ctx.roundRect(-b.w/2, -b.h/2, b.w, b.h, 8); ctx.fill();
      ctx.fillStyle = "#facc15"; ctx.fillRect(-b.w/2 + 3, -b.h/2 + 3, b.w-6, 6);
      ctx.fillRect(-b.w/2 + 3, b.h/2 - 9, b.w-6, 6);
      ctx.fillStyle = "#333"; ctx.beginPath(); ctx.ellipse(0, 0, 4, b.h/2 - 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(this.CHARACTERS.find(c=>c.id===this.state.character)?.emoji || "🌭", 0, -2);
      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(b.x, b.y + b.h/2 + 4, b.w/2, 4, 0, 0, Math.PI*2); ctx.fill();
    }
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
  playJump() { const a=this.audio(); if(!a)return; const n=a.currentTime; this.tone("square",520,n,0.1,0.14); this.tone("square",780,n+0.04,0.08,0.1); }
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
        if (e.code === "ArrowLeft") { this.state.targetX = this.state.bike.x - 80; this.state.moving = true; }
        if (e.code === "ArrowRight") { this.state.targetX = this.state.bike.x + 80; this.state.moving = true; }
      }
      if ((e.code === "Space" || e.code === "Enter") && (this.state.mode === "start" || this.state.mode === "gameover")) this.startGame();
    };
    this._pd = (e) => {
      if (this.state.mode === "playing") {
        const rect = this.canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / rect.width * this.canvas.width;
        this.state.targetX = mx; this.state.moving = true;
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
