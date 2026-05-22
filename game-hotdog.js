class HotDogGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.animId = null;
    this.running = true;

    this.startScreen = null;
    this.gameoverScreen = null;
    this.checkinScreen = null;
    this.scoreEl = null;
    this.soundButton = null;
    this.playButton = null;
    this.againButton = null;
    this.confirmFollowButton = null;
    this.closeCheckinButton = null;
    this.followStatusButton = null;
    this.characterOptions = null;
    this.difficultyOptions = null;
    this.titleCharacter = null;
    this.titleEmoji = null;
    this.heroCharacter = null;
    this.recordLine = null;
    this.lastScoreLine = null;
    this.deviceLine = null;
    this.resultEmoji = null;
    this.resultTitle = null;
    this.newRecord = null;
    this.finalScore = null;
    this.bestScore = null;
    this.lastLogLine = null;

    this.setupDOM();
    this.init();
  }

  setupDOM() {
    const container = this.canvas.parentElement;

    const ui = document.createElement("div");
    ui.id = "hotdog-ui";
    ui.innerHTML = `
      <div class="score hidden" id="hd-score">0</div>
      <button class="sound-button" id="hd-soundButton" type="button" aria-label="Silenciar som">🔊</button>

      <section class="screen start-screen hidden" id="hd-startScreen">
        <img class="brand-logo" src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
        <div class="title-stack">
          <h1>Flappy</h1>
          <h2><span id="hd-titleCharacter">Hot Dog</span> <span id="hd-titleEmoji">🌭</span></h2>
        </div>
        <div class="hero-character" id="hd-heroCharacter">🌭</div>
        <p class="record" id="hd-recordLine">RECORDE: 0</p>
        <div class="device-log" id="hd-deviceLog">
          <span>ULTIMA PARTIDA</span>
          <strong id="hd-lastScoreLine">0 pontos</strong>
          <small id="hd-deviceLine">dispositivo local</small>
        </div>
        <div class="chooser"><p>ESCOLHA SEU PERSONAGEM</p><div class="card-row" id="hd-characterOptions"></div></div>
        <div class="chooser"><p>DIFICULDADE</p><div class="card-row" id="hd-difficultyOptions"></div></div>
        <button class="play-button" id="hd-playButton" type="button">▶ JOGAR</button>
        <p class="hint">TOQUE OU PRESSIONE ESPACO</p>
        <footer>PATROCINADO POR <strong>O MEGA DOGAO</strong> DESDE 2000</footer>
      </section>

      <section class="screen gameover-screen hidden" id="hd-gameoverScreen">
        <div class="gameover-card">
          <img src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
          <div class="result-emoji" id="hd-resultEmoji">💥</div>
          <h2 id="hd-resultTitle">O CACHORRO PEGOU!</h2>
          <p class="new-record hidden" id="hd-newRecord">★ NOVO RECORDE! ★</p>
          <div class="result-grid">
            <div><span>PONTOS</span><strong id="hd-finalScore">0</strong></div>
            <div><span>RECORDE</span><strong id="hd-bestScore">0</strong></div>
          </div>
          <p class="last-log" id="hd-lastLogLine">Pontuacao salva neste dispositivo.</p>
          <button class="again-button" id="hd-againButton" type="button">↻ DE NOVO!</button>
          <p class="card-footer">O MEGA DOGAO - DESDE 2000</p>
        </div>
      </section>
    `;
    container.appendChild(ui);

    this.scoreEl = document.getElementById("hd-score");
    this.soundButton = document.getElementById("hd-soundButton");
    this.startScreen = document.getElementById("hd-startScreen");
    this.gameoverScreen = document.getElementById("hd-gameoverScreen");
    this.playButton = document.getElementById("hd-playButton");
    this.againButton = document.getElementById("hd-againButton");
    this.characterOptions = document.getElementById("hd-characterOptions");
    this.difficultyOptions = document.getElementById("hd-difficultyOptions");
    this.titleCharacter = document.getElementById("hd-titleCharacter");
    this.titleEmoji = document.getElementById("hd-titleEmoji");
    this.heroCharacter = document.getElementById("hd-heroCharacter");
    this.recordLine = document.getElementById("hd-recordLine");
    this.lastScoreLine = document.getElementById("hd-lastScoreLine");
    this.deviceLine = document.getElementById("hd-deviceLine");
    this.resultEmoji = document.getElementById("hd-resultEmoji");
    this.resultTitle = document.getElementById("hd-resultTitle");
    this.newRecord = document.getElementById("hd-newRecord");
    this.finalScore = document.getElementById("hd-finalScore");
    this.bestScore = document.getElementById("hd-bestScore");
    this.lastLogLine = document.getElementById("hd-lastLogLine");
  }

  init() {
    const STORAGE_KEYS = {
      highScore: "flappy_hotdog_highscore",
      deviceId: "flappy_hotdog_device_id",
      lastRun: "flappy_hotdog_last_run",
      runs: "flappy_hotdog_runs",
    };

    const CHARACTERS = [
      { id: "hotdog", label: "Hot Dog", emoji: "🌭", description: "O classico!" },
      { id: "burger", label: "X-Burguer", emoji: "🍔", description: "Poderoso!" },
      { id: "dog", label: "Dogao", emoji: "🐕", image: "assets/dog-character-y2uiqon.png", description: "Mascote!" },
    ];

    const DIFFICULTIES = [
      { id: "easy", label: "Facil", emoji: "😊", description: "Canos parados" },
      { id: "medium", label: "Medio", emoji: "😤", description: "Alguns se mexem" },
      { id: "hard", label: "Dificil", emoji: "💀", description: "Canos loucos!" },
    ];

    const state = {
      mode: "start",
      width: 390,
      height: 760,
      dpr: 1,
      frame: 0,
      score: 0,
      best: Number(localStorage.getItem(STORAGE_KEYS.highScore) || 0),
      deviceId: this.getOrCreateDeviceId(STORAGE_KEYS),
      lastRun: this.readJson(STORAGE_KEYS.lastRun, null),
      muted: false,
      character: "hotdog",
      difficulty: "medium",
      groundOffset: 0,
      hotdog: { x: 86, y: 300, velocity: 0, rotation: 0 },
      pipes: [],
    };

    const dogCharacterImage = new Image();
    dogCharacterImage.src = "assets/dog-character-y2uiqon.png";

    const CONSTANTS = {
      gravity: 0.13,
      jump: -4.2,
      pipeWidth: 65,
      gap: 200,
      speed: 1.2,
      characterWidth: 58,
      characterHeight: 36,
      groundHeight: 70,
      gapMin: 110,
      speedMax: 3.2,
    };

    let audioContext = null;
    let musicTimer = null;

    this.state = state;
    this.CONSTANTS = CONSTANTS;
    this.STORAGE_KEYS = STORAGE_KEYS;
    this.CHARACTERS = CHARACTERS;
    this.DIFFICULTIES = DIFFICULTIES;
    this.dogCharacterImage = dogCharacterImage;
    this._audioContextRef = { current: null };
    this.musicTimerRef = null;

    this.setupCanvas();
    this.setupOptions();
    this.resize();
    this.initializeAccessGate();
    this.bindEvents();
    this.loop();
  }

  getOrCreateDeviceId(STORAGE_KEYS) {
    let id = localStorage.getItem(STORAGE_KEYS.deviceId);
    if (!id) {
      id = `dogao-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(STORAGE_KEYS.deviceId, id);
    }
    return id;
  }

  readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  saveRun(score, character, difficulty) {
    const run = {
      score,
      character,
      difficulty,
      deviceId: this.state.deviceId,
      playedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    const runs = this.readJson(this.STORAGE_KEYS.runs, []);
    runs.unshift(run);
    this.writeJson(this.STORAGE_KEYS.runs, runs.slice(0, 20));
    this.writeJson(this.STORAGE_KEYS.lastRun, run);
    return run;
  }

  formatDateTime(value) {
    if (!value) return "sem partida salva";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
    } catch {
      return "partida salva";
    }
  }

  setupCanvas() {
    this.canvas.width = 390;
    this.canvas.height = 760;
    this._bgCanvas = null;
  }

  setupOptions() {
    this.characterOptions.innerHTML = "";
    this.difficultyOptions.innerHTML = "";

    for (const character of this.CHARACTERS) {
      const button = document.createElement("button");
      button.className = "card";
      button.type = "button";
      button.dataset.id = character.id;
      const visual = character.image
        ? `<img class="character-thumb" src="${character.image}" alt="${character.label}" />`
        : `<span class="emoji">${character.emoji}</span>`;
      button.innerHTML = `${visual}<span>${character.label}</span><small>${character.description}</small>`;
      button.addEventListener("click", () => {
        this.state.character = character.id;
        this.updateMenu();
      });
      this.characterOptions.appendChild(button);
    }

    for (const difficulty of this.DIFFICULTIES) {
      const button = document.createElement("button");
      button.className = `card difficulty-${difficulty.id}`;
      button.type = "button";
      button.dataset.id = difficulty.id;
      button.innerHTML = `<span class="emoji">${difficulty.emoji}</span><span>${difficulty.label}</span><small>${difficulty.description}</small>`;
      button.addEventListener("click", () => {
        this.state.difficulty = difficulty.id;
        this.updateMenu();
      });
      this.difficultyOptions.appendChild(button);
    }

    this.updateMenu();
  }

  updateMenu() {
    const character = this.CHARACTERS.find((c) => c.id === this.state.character) || this.CHARACTERS[0];
    this.titleCharacter.textContent = character.label;
    this.titleEmoji.textContent = character.emoji;
    this.heroCharacter.innerHTML = character.image
      ? `<img src="${character.image}" alt="${character.label}" />`
      : character.emoji;
    this.recordLine.textContent = this.state.best > 0 ? `🏆 RECORDE: ${this.state.best}` : "RECORDE: 0";
    this.lastScoreLine.textContent = this.state.lastRun
      ? `${this.state.lastRun.score} pontos - ${this.formatDateTime(this.state.lastRun.playedAt)}`
      : "0 pontos";
    this.deviceLine.textContent = `ID ${this.state.deviceId.slice(-10).toUpperCase()}`;

    for (const button of this.characterOptions.children) {
      button.classList.toggle("active", button.dataset.id === this.state.character);
    }
    for (const button of this.difficultyOptions.children) {
      button.classList.toggle("active", button.dataset.id === this.state.difficulty);
    }
  }

  showStartMenu() {
    this.state.mode = "start";
    this.scoreEl.classList.remove("visible");
    this.gameoverScreen.classList.add("hidden");
    this.startScreen.classList.remove("hidden");
    this.updateMenu();
  }

  initializeAccessGate() {
    this.showStartMenu();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const aw = Math.max(320, Math.floor(rect.width));
    const ah = Math.max(520, Math.floor(rect.height));
    this._scale = Math.min(aw / 390, ah / 760);
    this.state.width = 390;
    this.state.height = 760;
    const cw = Math.round(390 * this._scale);
    const ch = Math.round(760 * this._scale);
    this.canvas.style.width = cw + "px";
    this.canvas.style.height = ch + "px";
    this.canvas.style.margin = "0";
    this.canvas.style.position = "static";
    this.canvas.parentElement.style.background = "#1a1a2e";
    this.canvas.parentElement.style.display = "flex";
    this.canvas.parentElement.style.alignItems = "center";
    this.canvas.parentElement.style.justifyContent = "center";
    this.canvas.width = Math.floor(cw * this.state.dpr);
    this.canvas.height = Math.floor(ch * this.state.dpr);
    this.ctx.setTransform(this.state.dpr, 0, 0, this.state.dpr, 0, 0);
    this._bgCanvas = null;
    this._gndCanvas = null;
  }

  groundTop() {
    return this.state.height - this.CONSTANTS.groundHeight;
  }

  startGame() {
    this.state.mode = "playing";
    this.state.frame = 0;
    this.state.score = 0;
    this.state.groundOffset = 0;
    this.state.hotdog.x = this.state.width * 0.22;
    this.state.hotdog.y = this.state.height * 0.42;
    this.state.hotdog.velocity = 0;
    this.state.hotdog.rotation = 0;
    this.state.pipes = [];
    this.scoreEl.classList.remove("visible");
    this.startScreen.classList.add("hidden");
    this.gameoverScreen.classList.add("hidden");
    this.checkinScreen.classList.add("hidden");
    this.playMusic();
  }

  requestStartGame() {
    this.startGame();
  }

  flap() {
    if (this.state.mode === "playing") {
      this.state.hotdog.velocity = this.CONSTANTS.jump;
      this.playJump();
      return;
    }
    if (this.state.mode === "start" || this.state.mode === "gameover") {
      this.requestStartGame();
    }
  }

  gameOver() {
    if (this.state.mode !== "playing") return;
    this.state.mode = "gameover";
    this.stopMusic();
    this.playCrash();

    const isRecord = this.state.score > this.state.best;
    if (isRecord) {
      this.state.best = this.state.score;
      localStorage.setItem(this.STORAGE_KEYS.highScore, String(this.state.best));
    }
    this.state.lastRun = this.saveRun(this.state.score, this.state.character, this.state.difficulty);

    const result = this.getResultMessage(this.state.score);
    this.resultEmoji.textContent = result.emoji;
    this.resultTitle.textContent = result.text;
    this.finalScore.textContent = this.state.score;
    this.bestScore.textContent = this.state.best;
    this.lastLogLine.textContent = `Salvo no dispositivo ${this.state.deviceId.slice(-10).toUpperCase()} em ${this.formatDateTime(this.state.lastRun.playedAt)}.`;
    this.newRecord.classList.toggle("hidden", !isRecord);
    this.scoreEl.classList.remove("visible");
    this.gameoverScreen.classList.remove("hidden");
    this.updateMenu();
  }

  getResultMessage(score) {
    if (score >= 20) return { emoji: "🏆", text: "INCRIVEL!" };
    if (score >= 10) return { emoji: "⭐", text: "MUITO BOM!" };
    if (score >= 5) return { emoji: "👏", text: "BOM JOGO!" };
    return { emoji: "💥", text: "O CACHORRO PEGOU!" };
  }

  spawnPipe(dynamicGap) {
    const gap = dynamicGap || this.CONSTANTS.gap;
    const topLimit = 80;
    const bottomLimit = this.groundTop() - gap - 60;
    const gapY = topLimit + Math.random() * Math.max(60, bottomLimit - topLimit);

    let velocity = 0;
    let moving = false;
    const prog = this.getProg(this.state.score);
    if (this.state.difficulty === "medium" || prog.speed > 1.8) {
      moving = Math.random() < 0.42;
      velocity = moving ? (Math.random() > 0.5 ? 0.42 : -0.42) : 0;
    }
    if (this.state.difficulty === "hard" || prog.speed > 2.4) {
      moving = true;
      velocity = Math.random() > 0.5 ? 1.1 : -1.1;
    }

    this.state.pipes.push({
      x: this.state.width + 10,
      gapY,
      gapSize: gap,
      scored: false,
      moving,
      velocity,
      minGap: topLimit,
      maxGap: bottomLimit,
    });
  }

  getProg(s) {
    const p = Math.min(1, s / 40);
    return {
      speed: 1.2 + p * 2.0,
      gap: Math.max(this.CONSTANTS.gapMin, 200 - p * 90),
      interval: Math.max(80, 190 - p * 110),
      pipeSpeed: p * 1.8,
    };
  }

  updateGame() {
    if (this.state.mode !== "playing") return;

    this.state.frame += 1;
    const prog = this.getProg(this.state.score);
    this.state.groundOffset += prog.speed;
    this.state.hotdog.velocity += this.CONSTANTS.gravity;
    this.state.hotdog.y += this.state.hotdog.velocity;

    const targetRotation = Math.min(1.3, Math.max(-0.45, this.state.hotdog.velocity * 0.055));
    this.state.hotdog.rotation += (targetRotation - this.state.hotdog.rotation) * 0.18;

    if (this.state.frame % Math.floor(prog.interval) === 0) this.spawnPipe(prog.gap);

    for (const pipe of this.state.pipes) {
      pipe.x -= prog.speed;

      if (pipe.moving) {
        pipe.gapY += pipe.velocity;
        if (pipe.gapY <= pipe.minGap) { pipe.gapY = pipe.minGap; pipe.velocity = Math.abs(pipe.velocity); }
        if (pipe.gapY >= pipe.maxGap) { pipe.gapY = pipe.maxGap; pipe.velocity = -Math.abs(pipe.velocity); }
      }

      if (!pipe.scored && pipe.x + this.CONSTANTS.pipeWidth < this.state.hotdog.x) {
        pipe.scored = true;
        this.state.score += 1;
        this.scoreEl.textContent = this.state.score;
        this.playScore();
      }

      if (this.hitsPipe(pipe)) this.gameOver();
    }

    this.state.pipes = this.state.pipes.filter((pipe) => pipe.x > -this.CONSTANTS.pipeWidth - 20);

    if (this.state.hotdog.y + this.CONSTANTS.characterHeight * 0.5 > this.groundTop() ||
        this.state.hotdog.y - this.CONSTANTS.characterHeight * 0.5 < 0) {
      this.gameOver();
    }
  }

  hitsPipe(pipe) {
    const x = this.state.hotdog.x;
    const y = this.state.hotdog.y;
    const halfWidth = this.CONSTANTS.characterWidth * 0.38;
    const halfHeight = this.CONSTANTS.characterHeight * 0.38;

    const inX = x + halfWidth > pipe.x + 4 && x - halfWidth < pipe.x + this.CONSTANTS.pipeWidth - 4;
    if (!inX) return false;

    return y - halfHeight < pipe.gapY + 4 || y + halfHeight > pipe.gapY + pipe.gapSize - 4;
  }

  drawRoundedRect(x, y, width, height, radius) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  drawBackground() {
    const ctx = this.ctx;
    const W = this.state.width;
    const H = this.state.height;
    const gt = this.groundTop();

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#87CEEB");
    grad.addColorStop(0.7, "#FFF0D0");
    grad.addColorStop(1, "#FFD580");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(200, 80, 60, 0.18)";
    const buildings = [
      { x: 0, w: 60, h: 120 }, { x: 70, w: 50, h: 90 }, { x: 130, w: 70, h: 150 },
      { x: 210, w: 45, h: 80 }, { x: 265, w: 80, h: 130 }, { x: 355, w: 55, h: 100 },
      { x: 420, w: 65, h: 160 }, { x: 495, w: 40, h: 85 }, { x: 545, w: 70, h: 115 },
    ];
    const buildingOffset = (this.state.groundOffset * 0.35) % 620;
    for (const b of buildings) {
      const x = ((b.x - buildingOffset) % 620 + 620) % 620 - 10;
      ctx.fillRect(x, gt - b.h, b.w, b.h);
      ctx.fillRect(x + 620, gt - b.h, b.w, b.h);
    }

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    const clouds = [
      { x: 80, y: 60, r: 22 }, { x: 200, y: 40, r: 16 }, { x: 380, y: 70, r: 25 },
      { x: 560, y: 35, r: 18 }, { x: 700, y: 55, r: 20 }, { x: 900, y: 45, r: 22 },
    ];
    for (const cloud of clouds) {
      const x = ((cloud.x - this.state.groundOffset * 0.45) % (W + 200) + W + 200) % (W + 200) - 100;
      ctx.beginPath();
      ctx.arc(x, cloud.y, cloud.r, 0, Math.PI * 2);
      ctx.arc(x + cloud.r, cloud.y - cloud.r * 0.5, cloud.r * 0.8, 0, Math.PI * 2);
      ctx.arc(x + cloud.r * 1.8, cloud.y, cloud.r * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPipe(pipe) {
    const ctx = this.ctx;
    const w = this.CONSTANTS.pipeWidth;
    const gapBot = pipe.gapY + pipe.gapSize;

    ctx.fillStyle = "#CC1111";
    if (pipe.gapY > 0) {
      ctx.fillRect(pipe.x, 0, w, pipe.gapY);
      ctx.fillStyle = "#8B0000";
      ctx.fillRect(pipe.x, 0, w, 2);
      ctx.fillRect(pipe.x, pipe.gapY - 24, w, 2);
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(pipe.x - 6, pipe.gapY - 24, w + 12, 24);
      ctx.strokeStyle = "#CCA800"; ctx.lineWidth = 1.5;
      ctx.strokeRect(pipe.x - 6, pipe.gapY - 24, w + 12, 24);
    }

    const lh = this.groundTop() - gapBot;
    if (lh > 0) {
      ctx.fillStyle = "#CC1111";
      ctx.fillRect(pipe.x, gapBot, w, lh);
      ctx.fillStyle = "#8B0000";
      ctx.fillRect(pipe.x, gapBot, w, 2);
      ctx.fillRect(pipe.x, gapBot + lh - 2, w, 2);
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(pipe.x - 6, gapBot, w + 12, 24);
      ctx.strokeStyle = "#CCA800"; ctx.lineWidth = 1.5;
      ctx.strokeRect(pipe.x - 6, gapBot, w + 12, 24);
    }
  }

  drawPipeCap(x, y, width, height) {
    const ctx = this.ctx;
    ctx.fillStyle = "#FFD700";
    this.drawRoundedRect(x, y, width, height, 5);
    ctx.fill();
    ctx.strokeStyle = "#CCA800"; ctx.lineWidth = 1.5; ctx.stroke();
  }

  drawTinyDog(x, y, size, upsideDown) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    if (upsideDown) ctx.scale(1, -1);
    ctx.fillStyle = "#C0392B";
    ctx.beginPath(); ctx.ellipse(0, 0, size * 0.45, size * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(size * 0.3, -size * 0.55, size * 0.32, size * 0.3, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#A93226";
    ctx.beginPath(); ctx.ellipse(size * 0.18, -size * 0.8, size * 0.1, size * 0.22, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#E8A090";
    ctx.beginPath(); ctx.ellipse(size * 0.55, -size * 0.5, size * 0.15, size * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.ellipse(size * 0.62, -size * 0.54, size * 0.07, size * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(size * 0.35, -size * 0.62, size * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(size * 0.37, -size * 0.61, size * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#7B1A10"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(size * 0.55, -size * 0.42, size * 0.1, Math.PI + 0.3, -0.3); ctx.stroke();
    ctx.restore();
  }

  drawGround() {
    const ctx = this.ctx;
    const top = this.groundTop();
    const gh = this.CONSTANTS.groundHeight;

    if (!this._gndCanvas || this._gndCanvas.width !== this.state.width) {
      this._gndCanvas = document.createElement("canvas");
      this._gndCanvas.width = this.state.width;
      this._gndCanvas.height = gh + 5;
      const gc = this._gndCanvas.getContext("2d");
      const gg = gc.createLinearGradient(0, 0, 0, gh + 5);
      gg.addColorStop(0, "#CC1111"); gg.addColorStop(0.15, "#B80E0E"); gg.addColorStop(1, "#8B0000");
      gc.fillStyle = gg;
      gc.fillRect(0, 0, this.state.width, gh + 5);
      gc.fillStyle = "#FFD700";
      gc.fillRect(0, 0, this.state.width, 5);
      gc.fillStyle = "rgba(255,220,0,0.08)";
      for (let x = 0; x < this.state.width + 50; x += 100) {
        gc.fillRect(x, 5, 50, gh);
      }
    }

    ctx.drawImage(this._gndCanvas, 0, top);
  }

  drawCharacter(x, y, rotation) {
    if (this.state.character === "burger") { this.drawBurger(x, y, rotation); return; }
    if (this.state.character === "dog") { this.drawDogImageCharacter(x, y, rotation); return; }
    this.drawHotDog(x, y, rotation);
  }

  drawDogImageCharacter(x, y, rotation) {
    const ctx = this.ctx;
    if (!this.dogCharacterImage.complete || !this.dogCharacterImage.naturalWidth) {
      this.drawDogCharacter(x, y, rotation);
      return;
    }
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rotation);
    const width = 68, height = 68;
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.beginPath(); ctx.ellipse(0, height * 0.38, width * 0.32, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(this.dogCharacterImage, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  drawHotDog(x, y, rotation) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
    const hw = this.CONSTANTS.characterWidth / 2, hh = this.CONSTANTS.characterHeight / 2;
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath(); ctx.ellipse(2, hh + 4, hw * 0.8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#D4903C";
    ctx.beginPath(); ctx.ellipse(0, hh * 0.4, hw, hh * 0.6, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = "#B8752E"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#A0392B";
    ctx.beginPath(); ctx.ellipse(0, 0, hw * 0.85, hh * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#7B2B20"; ctx.stroke();
    ctx.strokeStyle = "#F1C40F"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-hw * 0.55, 0);
    for (let i = 0; i < 6; i++) {
      const lx = -hw * 0.55 + (i + 1) * ((hw * 1.1) / 6);
      const ly = i % 2 === 0 ? -hh * 0.25 : hh * 0.25;
      ctx.lineTo(lx, ly);
    }
    ctx.stroke();
    ctx.fillStyle = "#E8A84C";
    ctx.beginPath(); ctx.ellipse(0, -hh * 0.2, hw, hh * 0.55, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#D4903C"; ctx.stroke();
    this.drawFace(-hw * 0.18, hw * 0.18, -hh * 0.28, "#7B2B20");
    ctx.restore();
  }

  drawBurger(x, y, rotation) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
    const hw = this.CONSTANTS.characterWidth / 2, hh = (this.CONSTANTS.characterHeight + 10) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath(); ctx.ellipse(2, hh + 4, hw * 0.8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#D4903C";
    ctx.beginPath(); ctx.ellipse(0, hh * 0.5, hw, hh * 0.45, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = "#3CB371";
    ctx.beginPath(); ctx.ellipse(0, hh * 0.15, hw * 0.92, hh * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8B4513";
    ctx.beginPath(); ctx.ellipse(0, -hh * 0.1, hw * 0.85, hh * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#F4D03F";
    ctx.beginPath(); ctx.ellipse(0, -hh * 0.3, hw * 0.9, hh * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#E8A84C";
    ctx.beginPath(); ctx.ellipse(0, -hh * 0.52, hw, hh * 0.55, 0, Math.PI, Math.PI * 2); ctx.fill();
    this.drawFace(-hw * 0.18, hw * 0.18, -hh * 0.62, "#8B4513");
    ctx.restore();
  }

  drawDogCharacter(x, y, rotation) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
    const hw = (this.CONSTANTS.characterWidth + 8) / 2, hh = (this.CONSTANTS.characterHeight + 15) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath(); ctx.ellipse(2, hh + 4, hw * 0.8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FF6600";
    ctx.beginPath(); ctx.ellipse(0, hh * 0.1, hw * 0.7, hh * 0.65, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#111"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -hh * 0.45, hw * 0.55, hh * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FFCC99";
    ctx.beginPath(); ctx.ellipse(0, -hh * 0.3, hw * 0.35, hh * 0.28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.ellipse(0, -hh * 0.35, hw * 0.1, hw * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    this.drawFace(-hw * 0.15, hw * 0.15, -hh * 0.55, "#222");
    ctx.strokeStyle = "#FF6600"; ctx.lineWidth = hw * 0.12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-hw * 0.5, hh * 0.3); ctx.quadraticCurveTo(-hw * 0.82, -hh * 0.1, -hw * 0.6, -hh * 0.4); ctx.stroke();
    ctx.fillStyle = "#D4903C";
    ctx.beginPath(); ctx.ellipse(hw * 0.35, -hh * 0.18, hw * 0.2, hh * 0.12, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawFace(lx, rx, ey, mc) {
    const ctx = this.ctx;
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(lx, ey, 5, 0, Math.PI * 2); ctx.arc(rx, ey, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(lx + 1, ey + 1.5, 2.5, 0, Math.PI * 2); ctx.arc(rx + 1, ey + 1.5, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(lx + 2, ey - 2, 1.2, 0, Math.PI * 2); ctx.arc(rx + 2, ey - 2, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = mc; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, ey + 6, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  }

  render() {
    this.drawBackground();
    const w = this.state.width + this.CONSTANTS.pipeWidth + 20;
    for (const pipe of this.state.pipes) {
      if (pipe.x > -this.CONSTANTS.pipeWidth - 20 && pipe.x < w) this.drawPipe(pipe);
    }
    this.drawGround();

    if (this.state.mode === "playing" || this.state.mode === "gameover") {
      this.drawCharacter(this.state.hotdog.x, this.state.hotdog.y, this.state.hotdog.rotation);
    } else {
      const floatY = this.state.height * 0.42 + Math.sin(Date.now() * 0.0025) * 14;
      const floatRotation = Math.sin(Date.now() * 0.002) * 0.08;
      this.drawCharacter(this.state.width * 0.22, floatY, floatRotation);
    }

    if (this.state.mode === "playing") {
      const ctx = this.ctx;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      const size = Math.min(this.state.width, this.state.height);
      const fontSize = Math.max(48, size * 0.16);

      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 18;
      ctx.font = `bold ${fontSize}px "Fredoka One", system-ui, sans-serif`;
      ctx.fillStyle = "#facc15";
      ctx.fillText(this.state.score, this.state.width / 2, 20);

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  audio() {
    if (this.state.muted) return null;
    const actx = this._audioContextRef.current;
    if (actx) {
      if (actx.state === "suspended") actx.resume();
      return actx;
    }
    const newCtx = new (window.AudioContext || window.webkitAudioContext)();
    this._audioContextRef.current = newCtx;
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

  playJump() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("square", 380, now, 0.16, 0.22);
    this.tone("square", 700, now + 0.06, 0.1, 0.13);
  }

  playScore() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("sine", 880, now, 0.1, 0.18);
    this.tone("sine", 1320, now + 0.08, 0.12, 0.14);
  }

  playCrash() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("sawtooth", 400, now, 0.5, 0.36);
    this.tone("sine", 80, now, 0.3, 0.45);
  }

  playMusic() {
    this.stopMusic();
    if (this.state.muted) return;
    const melody = [330, 392, 440, 392, 330, 330, 392, 440, 0, 440, 392, 330, 294, 262, 330, 392];
    let index = 0;
    this.musicTimerRef = setInterval(() => {
      const actx = this.audio();
      if (!actx || this.state.mode !== "playing") return;
      const note = melody[index % melody.length];
      if (note) this.tone("square", note, actx.currentTime, 0.16, 0.045);
      index++;
    }, 205);
  }

  stopMusic() {
    if (this.musicTimerRef) clearInterval(this.musicTimerRef);
    this.musicTimerRef = null;
  }

  toggleSound(event) {
    event.stopPropagation();
    this.state.muted = !this.state.muted;
    this.soundButton.textContent = this.state.muted ? "🔇" : "🔊";
    this.soundButton.setAttribute("aria-label", this.state.muted ? "Ativar som" : "Silenciar som");
    if (this.state.muted) this.stopMusic();
    if (!this.state.muted && this.state.mode === "playing") this.playMusic();
  }

  bindEvents() {
    this._resizeFn = () => this.resize();
    this._keydownFn = (event) => {
      if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        this.flap();
      }
    };
    this._pointerFn = (event) => { event.preventDefault(); this.flap(); };
    this._playFn = (event) => { event.stopPropagation(); this.requestStartGame(); };
    this._againFn = (event) => { event.stopPropagation(); this.startGame(); };
    this._soundFn = (event) => this.toggleSound(event);
    this._confirmFn = (event) => { event.stopPropagation(); this.confirmInstagramCheckin(); };
    this._closeCheckinFn = (event) => { event.stopPropagation(); this.closeCheckin(); };
    this._followFn = (event) => { event.stopPropagation(); this.openCheckin(); };

    window.addEventListener("resize", this._resizeFn);
    window.addEventListener("keydown", this._keydownFn);
    this.canvas.addEventListener("pointerdown", this._pointerFn);
    this.playButton.addEventListener("click", this._playFn);
    this.againButton.addEventListener("click", this._againFn);
    this.soundButton.addEventListener("click", this._soundFn);
  }

  loop() {
    const now = performance.now();
    const elapsed = now - (this._last || now);
    this._last = now;

    const steps = Math.max(1, Math.min(3, Math.round(elapsed / 16.67)));
    for (let i = 0; i < steps; i++) this.updateGame();
    this.render();

    if (this.running) {
      this.animId = requestAnimationFrame(() => this.loop());
    }
  }

  destroy() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.stopMusic();
    window.removeEventListener("resize", this._resizeFn);
    window.removeEventListener("keydown", this._keydownFn);
    this.canvas.removeEventListener("pointerdown", this._pointerFn);
    this.playButton.removeEventListener("click", this._playFn);
    this.againButton.removeEventListener("click", this._againFn);
    this.soundButton.removeEventListener("click", this._soundFn);
    const ui = document.getElementById("hotdog-ui");
    if (ui) ui.remove();
  }
}
