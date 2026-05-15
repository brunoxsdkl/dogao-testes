class BlasterGame {
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
      { id: "easy", label: "Facil", emoji: "\uD83D\uDE0A", description: "Devagar" },
      { id: "medium", label: "Medio", emoji: "\uD83D\uDE24", description: "Normal" },
      { id: "hard", label: "Dificil", emoji: "\uD83D\uDC80", description: "Rapido!" },
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
      highScore: Number(localStorage.getItem("dogao_blaster_highscore") || 0),
      character: "hotdog",
      difficulty: "medium",
      muted: false,
      frame: 0,
      player: { x: 0, y: 0, width: 44, height: 36, fireTimer: 0 },
      bullets: [],
      enemies: [],
      stars: [],
      spawnTimer: 0,
    };

    this.CONSTANTS = {
      playerSpeed: 5,
      bulletSpeed: 6,
      enemyBaseSpeed: 1.2,
      fireInterval: 10,
      spawnBaseInterval: 40,
      canvasWidth: 390,
      canvasHeight: 760,
    };

    for (let i = 0; i < 50; i++) {
      this.state.stars.push({
        x: Math.random() * 390,
        y: Math.random() * 760,
        size: 0.5 + Math.random() * 1.5,
        speed: 0.3 + Math.random() * 0.8,
      });
    }

    this.createUI();
    this.showStartMenu();
    this.bindEvents();
    this.resetGame();
    this.render();
    this._last = performance.now();
    this.loop();
  }

  showStartMenu() {
    this.state.mode = "start";
    this.scoreEl.classList.remove("visible");
    this.gameoverScreen.classList.add("hidden");
    this.startScreen.classList.remove("hidden");
    this.updateMenu();
  }

  updateMenu() {
    this.recordLine.textContent = this.state.highScore > 0
      ? `\uD83C\uDFC6 RECORDE: ${this.state.highScore}`
      : "RECORDE: 0";
  }

  createUI() {
    const c = this.canvas.parentElement;
    this.ui = document.createElement("div");
    this.ui.id = "blaster-ui";
    this.ui.innerHTML = `
      <div class="score hidden" id="blaster-score" style="font-size:clamp(40px,12vw,60px);">0</div>
      <button class="sound-button" id="blaster-soundBtn" type="button" aria-label="Silenciar som">\uD83D\uDD0A</button>
      <section class="screen start-screen hidden" id="blaster-startScreen">
        <img class="brand-logo" src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
        <div class="title-stack">
          <h1>Dogao</h1>
          <h2>Blaster</h2>
        </div>
        <div class="hero-character" id="blaster-hero" style="font-size:clamp(48px,14vw,72px);margin:6px 0;animation:bob 1.8s ease-in-out infinite;">\uD83C\uDF2D</div>
        <p class="record" id="blaster-recordLine" style="min-height:16px;margin:0 0 6px;">\uD83C\uDFC6 RECORDE: ${this.state.highScore}</p>
        <div class="chooser"><p>ESCOLHA SEU PERSONAGEM</p><div class="card-row" id="blaster-charOptions"></div></div>
        <div class="chooser"><p>DIFICULDADE</p><div class="card-row" id="blaster-diffOptions"></div></div>
        <button class="play-button" id="blaster-playBtn" type="button">\u25B6 JOGAR</button>
        <p class="hint">ARRASTE PARA MOVER - ATIRE NOS INGREDIENTES</p>
      </section>
      <section class="screen gameover-screen hidden" id="blaster-gameoverScreen">
        <div class="gameover-card">
          <img src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
          <div style="font-size:48px;line-height:1;">\uD83D\uDCA5</div>
          <h2 style="margin:4px 0 8px;font-size:31px;line-height:1;">EXPLODIU!</h2>
          <p class="new-record hidden" id="blaster-newRecord">\u2605 NOVO RECORDE! \u2605</p>
          <div class="result-grid">
            <div><span>PONTOS</span><strong id="blaster-finalScore">0</strong></div>
            <div><span>RECORDE</span><strong id="blaster-bestScore">0</strong></div>
          </div>
          <button class="again-button" id="blaster-againBtn" type="button">\u21BB DE NOVO!</button>
          <p class="card-footer">O MEGA DOGAO - DESDE 2000</p>
        </div>
      </section>
    `;
    c.appendChild(this.ui);

    this.scoreEl = document.getElementById("blaster-score");
    this.soundBtn = document.getElementById("blaster-soundBtn");
    this.startScreen = document.getElementById("blaster-startScreen");
    this.gameoverScreen = document.getElementById("blaster-gameoverScreen");
    this.charOptions = document.getElementById("blaster-charOptions");
    this.diffOptions = document.getElementById("blaster-diffOptions");
    this.heroEl = document.getElementById("blaster-hero");
    this.recordLine = document.getElementById("blaster-recordLine");
    this.playBtn = document.getElementById("blaster-playBtn");
    this.againBtn = document.getElementById("blaster-againBtn");
    this.finalScore = document.getElementById("blaster-finalScore");
    this.bestScore = document.getElementById("blaster-bestScore");
    this.newRecord = document.getElementById("blaster-newRecord");

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

  playShoot() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("square", 600, now, 0.06, 0.1);
    this.tone("square", 300, now + 0.03, 0.05, 0.06);
  }

  playHit() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("sine", 880, now, 0.08, 0.12);
    this.tone("sine", 1320, now + 0.06, 0.1, 0.1);
  }

  playCrash() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("sawtooth", 200, now, 0.6, 0.35);
    this.tone("square", 50, now, 0.4, 0.4);
  }

  playMusic() {
    this.stopMusic();
    if (this.state.muted) return;
    const melody = [440, 554, 659, 554, 440, 440, 554, 659, 0, 659, 554, 440, 392, 349, 440, 554];
    let index = 0;
    this._musicTimer = setInterval(() => {
      const actx = this.audio();
      if (!actx || this.state.mode !== "playing") return;
      const note = melody[index % melody.length];
      if (note) this.tone("square", note, actx.currentTime, 0.14, 0.04);
      index++;
    }, 200);
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
    const h = this.CONSTANTS.canvasHeight;
    this.state.player.x = w / 2;
    this.state.player.y = h - 70;
    this.state.bullets = [];
    this.state.enemies = [];
    this.state.frame = 0;
    this.state.spawnTimer = 0;
  }

  startGame() {
    this.state.mode = "playing";
    this.state.score = 0;
    this.resetGame();
    this.scoreEl.textContent = "0";
    this.scoreEl.classList.add("visible");
    this.startScreen.classList.add("hidden");
    this.gameoverScreen.classList.add("hidden");
    this.playMusic();
  }

  gameOver() {
    if (this.state.mode !== "playing") return;
    this.state.mode = "gameover";
    this.stopMusic();
    this.playCrash();

    const isRecord = this.state.score > this.state.highScore;
    if (isRecord) {
      this.state.highScore = this.state.score;
      localStorage.setItem("dogao_blaster_highscore", String(this.state.highScore));
    }

    this.finalScore.textContent = this.state.score;
    this.bestScore.textContent = this.state.highScore;
    this.newRecord.classList.toggle("hidden", !isRecord);
    this.scoreEl.classList.remove("visible");
    this.gameoverScreen.classList.remove("hidden");
  }

  togglePause() {
    if (this.state.mode === "playing") {
      this.state.mode = "paused";
      this.stopMusic();
    } else if (this.state.mode === "paused") {
      this.state.mode = "playing";
      this.playMusic();
    }
  }

  fire() {
    this.state.bullets.push({
      x: this.state.player.x,
      y: this.state.player.y - 20,
      w: 4,
      h: 12,
    });
    this.playShoot();
  }

  spawnEnemy() {
    const w = this.CONSTANTS.canvasWidth;
    const speedMap = { easy: 0.8, medium: 1.2, hard: 1.8 };
    const baseSpeed = speedMap[this.state.difficulty] || 1.2;
    const speed = baseSpeed + Math.random() * 0.6 + Math.floor(this.state.score / 10) * 0.15;
    const size = 26 + Math.random() * 16;

    const FOOD_TYPES = [
      { id: "sausage", w: 18, h: 28 },
      { id: "bread", w: 30, h: 18 },
      { id: "tomato", w: 22, h: 22 },
      { id: "potato", w: 24, h: 18 },
      { id: "ketchup", w: 20, h: 26 },
    ];

    const food = FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)];
    const fast = Math.random() > 0.7;

    this.state.enemies.push({
      x: 20 + Math.random() * (w - 40),
      y: -size,
      food,
      w: food.w,
      h: food.h,
      speed: fast ? speed * 1.6 : speed,
      hp: 1,
      fast,
      wobble: Math.random() * Math.PI * 2,
      rot: Math.random() * 0.4 - 0.2,
    });
  }

  updateGame() {
    if (this.state.mode !== "playing") return;
    this.state.frame++;

    const speedMap = { easy: 4, medium: 5, hard: 7 };
    const pSpeed = speedMap[this.state.difficulty] || 5;

    if (this._pointerActive && this._pointerX != null) {
      const dx = this._pointerX - this.state.player.x;
      const dist = Math.abs(dx);
      if (dist > 3) {
        const move = Math.min(pSpeed, dist) * Math.sign(dx);
        this.state.player.x += move;
      }
    }

    this.state.player.x = Math.max(22, Math.min(this.CONSTANTS.canvasWidth - 22, this.state.player.x));

    this.state.player.fireTimer++;
    const fireInterval = { easy: 8, medium: 6, hard: 4 }[this.state.difficulty] || 6;
    if (this.state.player.fireTimer >= fireInterval) {
      this.state.player.fireTimer = 0;
      this.fire();
    }

    for (const b of this.state.bullets) {
      b.y -= this.CONSTANTS.bulletSpeed;
    }
    this.state.bullets = this.state.bullets.filter((b) => b.y > -20);

    this.state.spawnTimer++;
    const spawnInterval = Math.max(15, this.CONSTANTS.spawnBaseInterval - Math.floor(this.state.score / 8) * 2);
    if (this.state.spawnTimer >= spawnInterval) {
      this.state.spawnTimer = 0;
      this.spawnEnemy();
    }

    const bw = this.state.player.width;
    const ph = this.state.player.height;
    const px = this.state.player.x, py = this.state.player.y;

    for (const e of this.state.enemies) {
      e.y += e.speed;
      e.wobble += 0.05;
      if (e.fast) e.x += Math.sin(e.wobble) * 1.2;

      for (const b of this.state.bullets) {
        if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
          e.hp--;
          b.y = -99;
          if (e.hp <= 0) {
            e.y = this.CONSTANTS.canvasHeight + 99;
            this.state.score++;
            this.scoreEl.textContent = this.state.score;
            this.playHit();
          }
        }
      }

      if (px - bw / 2 + 6 < e.x + e.w && px + bw / 2 - 6 > e.x &&
          py - ph / 2 + 6 < e.y + e.h && py + ph / 2 - 6 > e.y) {
        this.gameOver();
      }
    }

    this.state.enemies = this.state.enemies.filter((e) => e.y < this.CONSTANTS.canvasHeight + 30);
  }

  drawCharacter(x, y) {
    const ctx = this.ctx;
    const id = this.state.character;
    const bw = this.state.player.width;
    const bh = this.state.player.height;
    const hw = bw / 2, hh = bh / 2;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(0, hh * 0.7, hw * 0.7, 4, 0, 0, Math.PI * 2); ctx.fill();

    if (id === "hotdog" || (id !== "burger" && id !== "dog")) {
      ctx.fillStyle = "#D4903C";
      ctx.beginPath(); ctx.ellipse(0, hh * 0.2, hw * 0.95, hh * 0.55, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = "#A0392B";
      ctx.beginPath(); ctx.ellipse(0, -hh * 0.15, hw * 0.85, hh * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#F1C40F"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-hw * 0.5, -hh * 0.1);
      for (let i = 0; i < 4; i++) {
        const lx = -hw * 0.5 + (i + 1) * (hw / 4);
        ctx.lineTo(lx, i % 2 === 0 ? -hh * 0.35 : hh * 0.15);
      }
      ctx.stroke();
      ctx.fillStyle = "#E8A84C";
      ctx.beginPath(); ctx.ellipse(0, -hh * 0.4, hw * 0.95, hh * 0.5, 0, Math.PI, Math.PI * 2); ctx.fill();
      this.drawBlasterFace(ctx, 0, "#7B2B20");
    } else if (id === "burger") {
      ctx.fillStyle = "#D4903C";
      ctx.beginPath(); ctx.ellipse(0, hh * 0.3, hw * 0.9, hh * 0.35, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = "#3CB371";
      ctx.beginPath(); ctx.ellipse(0, hh * 0.05, hw * 0.85, hh * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8B4513";
      ctx.beginPath(); ctx.ellipse(0, -hh * 0.15, hw * 0.8, hh * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#F4D03F";
      ctx.beginPath(); ctx.ellipse(0, -hh * 0.35, hw * 0.85, hh * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#E8A84C";
      ctx.beginPath(); ctx.ellipse(0, -hh * 0.55, hw * 0.95, hh * 0.45, 0, Math.PI, Math.PI * 2); ctx.fill();
      this.drawBlasterFace(ctx, -hh * 0.65, "#8B4513");
    } else if (id === "dog") {
      if (this.dogImage.complete && this.dogImage.naturalWidth) {
        ctx.drawImage(this.dogImage, -hw, -hh, bw, bh);
      } else {
        ctx.fillStyle = "#FF6600";
        ctx.beginPath(); ctx.ellipse(0, hh * 0.1, hw * 0.7, hh * 0.65, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, -hh * 0.4, hw * 0.55, hh * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#FFCC99";
        ctx.beginPath(); ctx.ellipse(0, -hh * 0.25, hw * 0.35, hh * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.ellipse(0, -hh * 0.3, hw * 0.1, hw * 0.08, 0, 0, Math.PI * 2); ctx.fill();
        this.drawBlasterFace(ctx, -hh * 0.55, "#222");
        ctx.strokeStyle = "#FF6600"; ctx.lineWidth = hw * 0.12; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(-hw * 0.45, hh * 0.3);
        ctx.quadraticCurveTo(-hw * 0.75, -hh * 0.1, -hw * 0.55, -hh * 0.35); ctx.stroke();
        ctx.fillStyle = "#D4903C";
        ctx.beginPath(); ctx.ellipse(hw * 0.3, -hh * 0.18, hw * 0.2, hh * 0.12, 0.3, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore();
  }

  drawBlasterFace(ctx, ey, mc) {
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(-5, ey, 4, 0, Math.PI * 2);
    ctx.arc(5, ey, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(-5, ey + 1.5, 2, 0, Math.PI * 2);
    ctx.arc(5, ey + 1.5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mc; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, ey + 6, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }

  drawEnemy(e) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
    ctx.rotate(e.rot);

    const id = e.food.id;
    const hw = e.w / 2, hh = e.h / 2;

    if (id === "sausage") {
      ctx.fillStyle = "#C0392B";
      ctx.beginPath();
      ctx.roundRect(-hw + 2, -hh, e.w - 4, e.h, hh);
      ctx.fill();
      ctx.fillStyle = "#E74C3C";
      ctx.beginPath();
      ctx.roundRect(-hw + 4, -hh + 3, e.w - 8, e.h - 6, hh - 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(-hw + 6, -hh + 4, 3, e.h - 8);
      ctx.fillStyle = "#922B21";
      ctx.beginPath();
      ctx.arc(-hw + 5, -hh + 4, 2, 0, Math.PI * 2);
      ctx.arc(-hw + 5, hh - 4, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === "bread") {
      ctx.fillStyle = "#F5DEB3";
      ctx.beginPath();
      ctx.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#D2B48C";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#DEB887";
      ctx.beginPath();
      ctx.ellipse(0, -2, hw * 0.7, hh * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#C4A265";
      ctx.beginPath();
      ctx.ellipse(0, 0, hw * 0.9, hh * 0.5, 0, Math.PI, 0);
      ctx.fill();
    } else if (id === "tomato") {
      ctx.fillStyle = "#E74C3C";
      ctx.beginPath();
      ctx.arc(0, 0, hw, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#C0392B";
      ctx.beginPath();
      ctx.arc(0, 0, hw - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#27AE60";
      ctx.beginPath();
      ctx.arc(0, -hh + 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.5, -hh * 0.3);
      ctx.lineTo(hw * 0.3, hh * 0.5);
      ctx.moveTo(-hw * 0.3, -hh * 0.5);
      ctx.lineTo(hw * 0.5, hh * 0.3);
      ctx.stroke();
    } else if (id === "potato") {
      ctx.fillStyle = "#F4D03F";
      ctx.beginPath();
      ctx.roundRect(-hw, -hh + 2, e.w, e.h - 4, 3);
      ctx.fill();
      ctx.fillStyle = "#E8C530";
      for (let i = 0; i < 4; i++) {
        const px = -hw + 3 + i * 6;
        ctx.fillRect(px, -hh + 4, 3, e.h - 8);
      }
      ctx.fillStyle = "#D4AC0D";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-hw + 5 + i * 6, -hh + 5, 1, e.h - 10);
      }
    } else if (id === "ketchup") {
      ctx.fillStyle = "#E74C3C";
      ctx.beginPath();
      ctx.roundRect(-hw, -hh, e.w, e.h, 3);
      ctx.fill();
      ctx.fillStyle = "#C0392B";
      ctx.fillRect(-hw + 3, -hh + 3, e.w - 6, e.h - 6);
      ctx.fillStyle = "white";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("K", 0, 0);
      ctx.fillStyle = "#922B21";
      ctx.beginPath();
      ctx.moveTo(-2, -hh);
      ctx.lineTo(2, -hh - 4);
      ctx.lineTo(2, -hh);
      ctx.fill();
    }

    if (e.fast) {
      ctx.strokeStyle = `rgba(255,200,50,${0.2 + Math.sin(this.state.frame * 0.15) * 0.15})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(hw, hh) + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    const w = this.CONSTANTS.canvasWidth;
    const h = this.CONSTANTS.canvasHeight;

    const spaceGrad = ctx.createLinearGradient(0, 0, 0, h);
    spaceGrad.addColorStop(0, "#0a0a2e");
    spaceGrad.addColorStop(0.5, "#1a1a4e");
    spaceGrad.addColorStop(1, "#0d0d1a");
    ctx.fillStyle = spaceGrad;
    ctx.fillRect(0, 0, w, h);

    for (const s of this.state.stars) {
      s.y += s.speed;
      if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
      ctx.fillStyle = `rgba(255,255,255,${0.4 + Math.sin(this.state.frame * 0.05 + s.x) * 0.3})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
    }

    if (this.state.mode === "start") return;

    for (const b of this.state.bullets) {
      const grad = ctx.createLinearGradient(b.x, b.y + b.h, b.x, b.y);
      grad.addColorStop(0, "rgba(255,200,50,0.8)");
      grad.addColorStop(1, "rgba(255,255,100,1)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(b.x - 1, b.y - b.h / 2, 2, b.h * 0.6);
    }

    for (const e of this.state.enemies) {
      this.drawEnemy(e);
    }

    this.drawCharacter(this.state.player.x, this.state.player.y);
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
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown") {
        e.preventDefault();
        if (this.state.mode === "start") this.startGame();
        else if (this.state.mode === "gameover") this.startGame();
      }
      if (e.code === "ArrowLeft" && this.state.mode === "playing") {
        this.state.player.x = Math.max(22, this.state.player.x - 10);
      }
      if (e.code === "ArrowRight" && this.state.mode === "playing") {
        this.state.player.x = Math.min(this.CONSTANTS.canvasWidth - 22, this.state.player.x + 10);
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
