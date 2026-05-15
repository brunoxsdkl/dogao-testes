class CatchGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.animId = null;
    this.running = true;
    this._last = null;

    this.CHARACTERS = [
      { id: "hotdog", label: "Hot Dog", emoji: "\uD83C\uDF2D", description: "O classico!" },
      { id: "burger", label: "X-Burguer", emoji: "\uD83C\uDF54", description: "Poderoso!" },
      { id: "dog", label: "Dogao", emoji: "\uD83D\uDC15", image: "assets/dog-character-y2uiqon.png", description: "Mascote!" },
    ];

    this.DIFFICULTIES = [
      { id: "easy", label: "Facil", emoji: "\uD83D\uDE0A", description: "Mais tempo" },
      { id: "medium", label: "Medio", emoji: "\uD83D\uDE24", description: "Normal" },
      { id: "hard", label: "Dificil", emoji: "\uD83D\uDC80", description: "Tudo rapido!" },
    ];

    this.dogImage = new Image();
    this.dogImage.src = "assets/dog-character-y2uiqon.png";

    this._audioCtx = null;
    this._musicTimer = null;

    this.setupCanvas();
    this.init();
  }

  setupCanvas() {
    this.canvas.width = 390;
    this.canvas.height = 760;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
  }

  init() {
    this.state = {
      mode: "start",
      score: 0,
      highScore: Number(localStorage.getItem("dogao_catch_highscore") || 0),
      character: "hotdog",
      difficulty: "medium",
      muted: false,
      frame: 0,
      timeLeft: 30,
      player: { x: 0, width: 80, height: 40, y: 0 },
      items: [],
      goodItems: 0,
      badItems: 0,
    };

    this.CONSTANTS = {
      canvasWidth: 390,
      canvasHeight: 760,
      groundY: 700,
      playerY: 670,
      itemSpeed: 1.5,
      spawnInterval: 30,
    };

    this.createUI();
    this.bindEvents();
    this.resetGame();
    this.render();
    this._last = performance.now();
    this.loop();
  }

  createUI() {
    const c = this.canvas.parentElement;
    this.ui = document.createElement("div");
    this.ui.id = "catch-ui";

    const goodEmoji = "🥬";
    this.ui.innerHTML = `
      <div class="score hidden" id="catch-score" style="font-size:clamp(32px,10vw,48px);">0</div>
      <button class="sound-button" id="catch-soundBtn" type="button" aria-label="Silenciar som">\uD83D\uDD0A</button>
      <div id="catch-timer" style="position:absolute;top:max(20px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:8;font-family:'Press Start 2P',monospace;font-size:12px;color:rgba(255,255,255,0.85);display:none;text-shadow:0 2px 4px rgba(0,0,0,0.5);">⏱ 30</div>
      <section class="screen start-screen hidden" id="catch-startScreen">
        <img class="brand-logo" src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
        <div class="title-stack">
          <h1>Hot Dog</h1>
          <h2>Catch</h2>
        </div>
        <div class="hero-character" id="catch-hero" style="font-size:clamp(48px,14vw,72px);margin:6px 0;animation:bob 1.8s ease-in-out infinite;">${goodEmoji}</div>
        <p class="record" id="catch-recordLine" style="min-height:16px;margin:0 0 6px;">\uD83C\uDFC6 RECORDE: ${this.state.highScore}</p>
        <p style="font-family:'Press Start 2P',monospace;font-size:6px;color:rgba(255,255,255,0.5);max-width:300px;line-height:1.5;margin:0 0 8px;">PEGUE OS INGREDIENTES ${goodEmoji}🥩🧀<br/>EVITE AS BOMBAS 💣</p>
        <div class="chooser"><p>ESCOLHA SEU PERSONAGEM</p><div class="card-row" id="catch-charOptions"></div></div>
        <div class="chooser"><p>DIFICULDADE</p><div class="card-row" id="catch-diffOptions"></div></div>
        <button class="play-button" id="catch-playBtn" type="button">\u25B6 JOGAR</button>
        <p class="hint">ARRASTE PARA MOVER O CESTO</p>
      </section>
      <section class="screen gameover-screen hidden" id="catch-gameoverScreen">
        <div class="gameover-card">
          <img src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
          <div style="font-size:48px;line-height:1;">\uD83D\uDCA5</div>
          <h2 style="margin:4px 0 8px;font-size:31px;line-height:1;">FIM DE TEMPO!</h2>
          <p class="new-record hidden" id="catch-newRecord">\u2605 NOVO RECORDE! \u2605</p>
          <div class="result-grid">
            <div><span>PONTOS</span><strong id="catch-finalScore">0</strong></div>
            <div><span>RECORDE</span><strong id="catch-bestScore">0</strong></div>
          </div>
          <button class="again-button" id="catch-againBtn" type="button">\u21BB DE NOVO!</button>
          <p class="card-footer">O MEGA DOGAO - DESDE 2000</p>
        </div>
      </section>
    `;
    c.appendChild(this.ui);

    this.scoreEl = document.getElementById("catch-score");
    this.soundBtn = document.getElementById("catch-soundBtn");
    this.timerEl = document.getElementById("catch-timer");
    this.startScreen = document.getElementById("catch-startScreen");
    this.gameoverScreen = document.getElementById("catch-gameoverScreen");
    this.charOptions = document.getElementById("catch-charOptions");
    this.diffOptions = document.getElementById("catch-diffOptions");
    this.heroEl = document.getElementById("catch-hero");
    this.recordLine = document.getElementById("catch-recordLine");
    this.playBtn = document.getElementById("catch-playBtn");
    this.againBtn = document.getElementById("catch-againBtn");
    this.finalScore = document.getElementById("catch-finalScore");
    this.bestScore = document.getElementById("catch-bestScore");
    this.newRecord = document.getElementById("catch-newRecord");

    this.buildOptions();
  }

  buildOptions() {
    this.charOptions.innerHTML = "";
    this.diffOptions.innerHTML = "";

    for (const ch of this.CHARACTERS) {
      const btn = document.createElement("button");
      btn.className = "card";
      btn.type = "button";
      btn.dataset.id = ch.id;
      const vis = ch.image
        ? `<img class="character-thumb" src="${ch.image}" alt="${ch.label}" />`
        : `<span class="emoji">${ch.emoji}</span>`;
      btn.innerHTML = `${vis}<span>${ch.label}</span><small>${ch.description}</small>`;
      btn.addEventListener("click", () => {
        this.state.character = ch.id;
        this.heroEl.innerHTML = ch.image
          ? `<img src="${ch.image}" style="width:min(22vw,80px);height:min(22vw,80px);object-fit:contain;filter:drop-shadow(0 10px 12px rgba(0,0,0,0.26));" />`
          : ch.emoji;
        this.updateHighlights();
      });
      this.charOptions.appendChild(btn);
    }

    for (const d of this.DIFFICULTIES) {
      const btn = document.createElement("button");
      btn.className = `card difficulty-${d.id}`;
      btn.type = "button";
      btn.dataset.id = d.id;
      btn.innerHTML = `<span class="emoji">${d.emoji}</span><span>${d.label}</span><small>${d.description}</small>`;
      btn.addEventListener("click", () => {
        this.state.difficulty = d.id;
        this.updateHighlights();
      });
      this.diffOptions.appendChild(btn);
    }

    this.updateHighlights();
  }

  updateHighlights() {
    for (const b of this.charOptions.children) b.classList.toggle("active", b.dataset.id === this.state.character);
    for (const b of this.diffOptions.children) b.classList.toggle("active", b.dataset.id === this.state.difficulty);
  }

  audio() {
    if (this.state.muted) return null;
    const actx = this._audioCtx;
    if (actx) {
      if (actx.state === "suspended") actx.resume();
      return actx;
    }
    const newCtx = new (window.AudioContext || window.webkitAudioContext)();
    this._audioCtx = newCtx;
    return newCtx;
  }

  tone(type, freq, start, dur, vol) {
    const actx = this.audio();
    if (!actx) return;
    const gain = actx.createGain();
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    gain.connect(actx.destination);
    const osc = actx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.connect(gain);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  playCatch() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("square", 880, now, 0.08, 0.12);
    this.tone("square", 1100, now + 0.05, 0.08, 0.1);
  }

  playBomb() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("sawtooth", 200, now, 0.3, 0.25);
    this.tone("square", 100, now + 0.1, 0.2, 0.2);
  }

  playGameOver() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("sawtooth", 300, now, 0.5, 0.3);
    this.tone("sine", 80, now, 0.4, 0.35);
  }

  playMusic() {
    this.stopMusic();
    if (this.state.muted) return;
    const melody = [392, 523, 587, 523, 392, 392, 523, 587, 0, 587, 523, 392, 349, 330, 392, 523];
    let index = 0;
    this._musicTimer = setInterval(() => {
      const actx = this.audio();
      if (!actx || this.state.mode !== "playing") return;
      const note = melody[index % melody.length];
      if (note) this.tone("square", note, actx.currentTime, 0.13, 0.04);
      index++;
    }, 190);
  }

  stopMusic() {
    if (this._musicTimer) clearInterval(this._musicTimer);
    this._musicTimer = null;
  }

  toggleSound(event) {
    event.stopPropagation();
    this.state.muted = !this.state.muted;
    this.soundBtn.textContent = this.state.muted ? "\uD83D\uDD07" : "\uD83D\uDD0A";
    this.soundBtn.setAttribute("aria-label", this.state.muted ? "Ativar som" : "Silenciar som");
    if (this.state.muted) this.stopMusic();
    if (!this.state.muted && this.state.mode === "playing") this.playMusic();
  }

  resetGame() {
    const w = this.CONSTANTS.canvasWidth;
    this.state.player.x = w / 2;
    this.state.player.y = this.CONSTANTS.playerY;
    this.state.items = [];
    this.state.frame = 0;
    this.state.goodItems = 0;
    this.state.badItems = 0;
  }

  startGame() {
    this.state.mode = "playing";
    this.state.score = 0;
    const timeMap = { easy: 40, medium: 30, hard: 20 };
    this.state.timeLeft = timeMap[this.state.difficulty] || 30;
    this.resetGame();
    this.scoreEl.textContent = "0";
    this.scoreEl.classList.add("visible");
    this.timerEl.style.display = "block";
    this.timerEl.textContent = "\u23F1 " + this.state.timeLeft;
    this.startScreen.classList.add("hidden");
    this.gameoverScreen.classList.add("hidden");
    this.playMusic();
    this._timerAccum = 0;
  }

  gameOver() {
    if (this.state.mode !== "playing") return;
    this.state.mode = "gameover";
    this.stopMusic();
    this.playGameOver();

    const isRecord = this.state.score > this.state.highScore;
    if (isRecord) {
      this.state.highScore = this.state.score;
      localStorage.setItem("dogao_catch_highscore", String(this.state.highScore));
    }

    this.finalScore.textContent = this.state.score;
    this.bestScore.textContent = this.state.highScore;
    this.newRecord.classList.toggle("hidden", !isRecord);
    this.scoreEl.classList.remove("visible");
    this.timerEl.style.display = "none";
    this.gameoverScreen.classList.remove("hidden");
  }

  spawnItem() {
    const w = this.CONSTANTS.canvasWidth;
    const isGood = Math.random() > 0.25;
    const x = 15 + Math.random() * (w - 30);

    const goodFoods = ["🥬", "🥩", "🧀", "🧅", "🌶️", "🥫", "🥖"];
    const badFoods = ["💣", "🪨", "☠️"];

    const emoji = isGood
      ? goodFoods[Math.floor(Math.random() * goodFoods.length)]
      : badFoods[Math.floor(Math.random() * badFoods.length)];

    const speedMap = { easy: 0.8, medium: 1.2, hard: 1.8 };
    const baseSpeed = speedMap[this.state.difficulty] || 1.2;

    this.state.items.push({
      x, y: -20,
      size: 26,
      speed: baseSpeed + Math.random() * 0.5 + this.state.score * 0.02,
      emoji,
      good: isGood,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  updateGame() {
    if (this.state.mode !== "playing") return;
    this.state.frame++;

    this._timerAccum += 16.67;
    if (this._timerAccum >= 1000) {
      this._timerAccum -= 1000;
      this.state.timeLeft--;
      this.timerEl.textContent = "\u23F1 " + this.state.timeLeft;
      if (this.state.timeLeft <= 0) {
        this.gameOver();
        return;
      }
    }

    const w = this.CONSTANTS.canvasWidth;
    if (this._pointerActive && this._pointerX != null) {
      const speedMap = { easy: 6, medium: 5, hard: 4 };
      const pSpeed = speedMap[this.state.difficulty] || 5;
      const dx = this._pointerX - this.state.player.x;
      const dist = Math.abs(dx);
      if (dist > 3) {
        const move = Math.min(pSpeed * 1.5, dist) * Math.sign(dx);
        this.state.player.x += move;
      }
    }
    this.state.player.x = Math.max(40, Math.min(w - 40, this.state.player.x));

    const interval = Math.max(18, this.CONSTANTS.spawnInterval - Math.floor(this.state.score / 5) * 2);
    if (this.state.frame % interval === 0) this.spawnItem();

    for (const item of this.state.items) {
      item.y += item.speed;
      item.wobble += 0.04;
      item.x += Math.sin(item.wobble) * 0.4;

      const pw = this.state.player.width;
      const pw2 = pw / 2;
      const is2 = item.size / 2;
      if (item.y + is2 > this.state.player.y &&
          item.y - is2 < this.state.player.y + this.state.player.height &&
          item.x + is2 > this.state.player.x - pw2 &&
          item.x - is2 < this.state.player.x + pw2) {
        item.caught = true;
        if (item.good) {
          this.state.score++;
          this.state.goodItems++;
          this.scoreEl.textContent = this.state.score;
          this.playCatch();
        } else {
          this.state.badItems++;
          this.playBomb();
          this.state.score = Math.max(0, this.state.score - 2);
          this.scoreEl.textContent = this.state.score;
        }
      }
    }
    this.state.items = this.state.items.filter((item) => item.y < this.CONSTANTS.canvasHeight + 30 && !item.caught);
  }

  drawBasket(x, y) {
    const ctx = this.ctx;
    const w = this.state.player.width;
    const h = this.state.player.height;
    const hw = w / 2, hh = h / 2;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, w, h * 0.6, 6);
    ctx.fill();
    ctx.strokeStyle = "#6B3410";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#A0522D";
    ctx.beginPath();
    ctx.roundRect(-hw + 4, -hh + 4, w - 8, h * 0.4, 4);
    ctx.fill();

    ctx.fillStyle = "rgba(139,69,19,0.3)";
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-hw + 8 + i * 24, -hh + 6, 2, h * 0.35);
    }

    const id = this.state.character;
    if (id === "hotdog" || id === "burger") {
      ctx.fillStyle = "#D4903C";
      ctx.beginPath(); ctx.arc(0, -hh - 14, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#A0392B";
      ctx.beginPath(); ctx.arc(0, -hh - 14, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(-2, -hh - 16, 1.5, 0, Math.PI * 2);
      ctx.arc(2, -hh - 16, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.arc(-2, -hh - 15, 0.8, 0, Math.PI * 2);
      ctx.arc(2, -hh - 15, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    const w = this.CONSTANTS.canvasWidth;
    const h = this.CONSTANTS.canvasHeight;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#87CEEB");
    grad.addColorStop(0.3, "#B0E0E6");
    grad.addColorStop(0.6, "#FFF0D0");
    grad.addColorStop(1, "#90EE90");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 5; i++) {
      const cx = 40 + i * 80 + Math.sin(this.state.frame * 0.01 + i) * 10;
      const cy = 50 + i * 60;
      ctx.beginPath(); ctx.arc(cx, cy, 18 + Math.sin(this.state.frame * 0.02 + i) * 5, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = "#228B22";
    ctx.fillRect(0, this.CONSTANTS.groundY, w, h - this.CONSTANTS.groundY);

    ctx.fillStyle = "#2E8B57";
    ctx.fillRect(0, this.CONSTANTS.groundY, w, 3);

    ctx.fillStyle = "rgba(0,100,0,0.15)";
    for (let i = 0; i < 6; i++) {
      const gx = (i * 65 + this.state.frame * 0.2) % (w + 30) - 15;
      ctx.beginPath(); ctx.arc(gx, this.CONSTANTS.groundY + 8 + (i % 3) * 10, 4, 0, Math.PI * 2); ctx.fill();
    }

    if (this.state.mode === "start") return;

    for (const item of this.state.items) {
      const is = item.size;
      ctx.font = `${is}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.emoji, item.x, item.y);
    }

    this.drawBasket(this.state.player.x, this.state.player.y);
  }

  bindEvents() {
    this._pd = (e) => {
      e.preventDefault();
      this._pointerActive = true;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      this._pointerX = (touch.clientX - rect.left) * (this.CONSTANTS.canvasWidth / rect.width);
      if (this.state.mode === "start") this.startGame();
      else if (this.state.mode === "gameover") this.startGame();
    };
    this._pm = (e) => {
      e.preventDefault();
      if (!this._pointerActive) return;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      this._pointerX = (touch.clientX - rect.left) * (this.CONSTANTS.canvasWidth / rect.width);
    };
    this._pu = (e) => { e.preventDefault(); this._pointerActive = false; this._pointerX = null; };
    this._kd = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (this.state.mode === "start") this.startGame();
        else if (this.state.mode === "gameover") this.startGame();
      }
      if (e.code === "ArrowLeft" && this.state.mode === "playing") {
        this.state.player.x = Math.max(40, this.state.player.x - 12);
      }
      if (e.code === "ArrowRight" && this.state.mode === "playing") {
        this.state.player.x = Math.min(this.CONSTANTS.canvasWidth - 40, this.state.player.x + 12);
      }
    };
    this._play = (e) => { e.stopPropagation(); this.startGame(); };
    this._again = (e) => { e.stopPropagation(); this.startGame(); };
    this._soundToggle = (e) => this.toggleSound(e);

    this.canvas.addEventListener("pointerdown", this._pd);
    this.canvas.addEventListener("pointermove", this._pm);
    this.canvas.addEventListener("pointerup", this._pu);
    this.canvas.addEventListener("pointerleave", this._pu);
    this.canvas.addEventListener("touchstart", this._pd, { passive: false });
    this.canvas.addEventListener("touchmove", this._pm, { passive: false });
    this.canvas.addEventListener("touchend", this._pu, { passive: false });
    window.addEventListener("keydown", this._kd);
    if (this.playBtn) this.playBtn.addEventListener("click", this._play);
    if (this.againBtn) this.againBtn.addEventListener("click", this._again);
    if (this.soundBtn) this.soundBtn.addEventListener("click", this._soundToggle);
  }

  loop() {
    const now = performance.now();
    const e = now - (this._last || now);
    this._last = now;
    const steps = Math.max(1, Math.min(3, Math.round(e / 16.67)));
    for (let i = 0; i < steps; i++) this.updateGame();
    this.render();
    if (this.running) this.animId = requestAnimationFrame(() => this.loop());
  }

  destroy() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.stopMusic();
    this.canvas.removeEventListener("pointerdown", this._pd);
    this.canvas.removeEventListener("pointermove", this._pm);
    this.canvas.removeEventListener("pointerup", this._pu);
    this.canvas.removeEventListener("pointerleave", this._pu);
    this.canvas.removeEventListener("touchstart", this._pd);
    this.canvas.removeEventListener("touchmove", this._pm);
    this.canvas.removeEventListener("touchend", this._pu);
    window.removeEventListener("keydown", this._kd);
    if (this.playBtn) this.playBtn.removeEventListener("click", this._play);
    if (this.againBtn) this.againBtn.removeEventListener("click", this._again);
    if (this.soundBtn) this.soundBtn.removeEventListener("click", this._soundToggle);
    if (this.ui) this.ui.remove();
  }
}
