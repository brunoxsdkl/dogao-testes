class PacmanGame {
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
      { id: "easy", label: "Facil", emoji: "\uD83D\uDE0A", description: "Fantasma devagar" },
      { id: "medium", label: "Medio", emoji: "\uD83D\uDE24", description: "Normal" },
      { id: "hard", label: "Dificil", emoji: "\uD83D\uDC80", description: "Fantasma rapido!" },
    ];

    this.dogImage = new Image();
    this.dogImage.src = "assets/dog-character-y2uiqon.png";

    this._audioCtx = null;
    this._musicTimer = null;

    this.GHOST_COLORS = ["#E74C3C", "#E67E22", "#9B59B6", "#3498DB"];

    this.setupCanvas();
    this.init();
  }

  setupCanvas() {
    this.canvas.width = 500;
    this.canvas.height = 600;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
  }

  init() {
    this.COLS = 15;
    this.ROWS = 15;

    this.FOOD_TYPES = [
      { id: "sausage", color: "#C0392B", points: 10 },
      { id: "tomato", color: "#E74C3C", points: 15 },
      { id: "carrot", color: "#E67E22", points: 20 },
      { id: "bread", color: "#D2B48C", points: 10 },
      { id: "burger", color: "#8B4513", points: 25 },
    ];

    const RAW_MAZE = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,0,1,1],
      [1,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
      [1,0,1,0,1,0,0,0,1,0,1,0,0,1,1],
      [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
      [1,1,0,0,0,0,0,0,0,0,0,0,0,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,0,0,0,0,0,0,0,0,0,0,0,1,1],
      [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
      [1,0,1,0,1,0,0,0,1,0,1,0,0,1,1],
      [1,0,1,0,0,0,0,0,0,0,0,1,0,0,1],
      [1,0,0,0,0,1,0,1,0,0,0,0,0,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ];

    this.maze = RAW_MAZE.map(row => [...row]);
    this.foods = [];
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (this.maze[r][c] === 0 && Math.random() < 0.4) {
          const ft = this.FOOD_TYPES[Math.floor(Math.random() * this.FOOD_TYPES.length)];
          this.foods.push({ r, c, type: ft, eaten: false });
        }
      }
    }

    this.state = {
      mode: "start",
      score: 0,
      highScore: Number(localStorage.getItem("dogao_pacman_highscore") || 0),
      character: "hotdog",
      difficulty: "medium",
      muted: false,
      frame: 0,
      player: { r: 7, c: 7, dir: 0, nextDir: 0, moving: false, mouthOpen: 0 },
      ghosts: [],
      foods: this.foods,
      totalFood: this.foods.length,
      eatenFood: 0,
      lives: 3,
      immune: 0,
      combo: 1,
    };

    this.CONSTANTS = {
      cellSize: 0,
      offsetX: 0,
      offsetY: 0,
      playerSpeed: 3.5,
      ghostBaseSpeed: 1.2,
    };

    this.createUI();
    this.showStartMenu();
    this.bindEvents();
    this.resize();
    this.render();
    this._last = performance.now();
    this.loop();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cw = this.COLS, ch = this.ROWS;

    const margin = 12;
    const availW = w - margin * 2;
    const availH = h - margin * 2;
    const cellSize = Math.min(availW / cw, availH / ch);
    this.CONSTANTS.cellSize = cellSize;
    this.CONSTANTS.offsetX = (w - cellSize * cw) / 2;
    this.CONSTANTS.offsetY = (h - cellSize * ch) / 2;
  }

  createUI() {
    const c = this.canvas.parentElement;
    this.ui = document.createElement("div");
    this.ui.id = "pacman-ui";

    this.ui.innerHTML = `
      <div id="pacman-hud" style="position:absolute;top:max(8px,env(safe-area-inset-top));left:0;right:0;z-index:5;display:none;justify-content:space-between;padding:0 14px;pointer-events:none;font-family:'Press Start 2P',monospace;font-size:8px;color:white;text-shadow:0 2px 4px rgba(0,0,0,0.5);">
        <span>\uD83C\uDF2D <span id="pacman-score">0</span></span>
        <span>\uD83C\uDFC6 <span id="pacman-high">${this.state.highScore}</span></span>
      </div>
      <button class="sound-button" id="pacman-soundBtn" type="button" aria-label="Silenciar som" style="top:max(10px,env(safe-area-inset-top));right:10px;">\uD83D\uDD0A</button>
      <section class="screen start-screen hidden" id="pacman-startScreen">
        <img class="brand-logo" src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
        <div class="title-stack">
          <h1 style="color:#facc15;font-size:clamp(32px,10vw,52px);">Pac Dogao</h1>
          <h2 style="color:white;font-size:clamp(28px,9vw,44px);">Come os alimentos!</h2>
        </div>
        <div class="hero-character" id="pacman-hero" style="font-size:clamp(48px,14vw,72px);margin:4px 0;animation:bob 1.8s ease-in-out infinite;">\uD83C\uDF2D</div>
        <p class="record" id="pacman-recordLine" style="min-height:16px;margin:0 0 4px;">\uD83C\uDFC6 RECORDE: ${this.state.highScore}</p>
        <p style="font-family:'Press Start 2P',monospace;font-size:5px;color:rgba(255,255,255,0.5);max-width:280px;line-height:1.4;margin:0 0 6px;">ARRASTE NO CANVAS PARA DIRECIONAR<br/>EVITE OS FANTASMAS VERMELHOS</p>
        <div class="chooser"><p>PERSONAGEM</p><div class="card-row" id="pacman-charOptions"></div></div>
        <div class="chooser"><p>DIFICULDADE</p><div class="card-row" id="pacman-diffOptions"></div></div>
        <button class="play-button" id="pacman-playBtn" type="button">\u25B6 JOGAR</button>
        <p class="hint">SETAS OU ARRASTE PARA MOVER</p>
      </section>
      <section class="screen gameover-screen hidden" id="pacman-gameoverScreen">
        <div class="gameover-card">
          <img src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
          <div style="font-size:48px;line-height:1;">\uD83D\uDC7B</div>
          <h2 style="margin:4px 0 8px;font-size:31px;line-height:1;">FANTASMA PEGOU!</h2>
          <p class="new-record hidden" id="pacman-newRecord">\u2605 NOVO RECORDE! \u2605</p>
          <div class="result-grid">
            <div><span>PONTOS</span><strong id="pacman-finalScore">0</strong></div>
            <div><span>RECORDE</span><strong id="pacman-bestScore">0</strong></div>
          </div>
          <button class="again-button" id="pacman-againBtn" type="button">\u21BB DE NOVO!</button>
          <p class="card-footer">O MEGA DOGAO - DESDE 2000</p>
        </div>
      </section>
    `;
    c.appendChild(this.ui);

    this.hud = document.getElementById("pacman-hud");
    this.scoreEl = document.getElementById("pacman-score");
    this.highEl = document.getElementById("pacman-high");
    this.soundBtn = document.getElementById("pacman-soundBtn");
    this.startScreen = document.getElementById("pacman-startScreen");
    this.gameoverScreen = document.getElementById("pacman-gameoverScreen");
    this.charOptions = document.getElementById("pacman-charOptions");
    this.diffOptions = document.getElementById("pacman-diffOptions");
    this.heroEl = document.getElementById("pacman-hero");
    this.recordLine = document.getElementById("pacman-recordLine");
    this.playBtn = document.getElementById("pacman-playBtn");
    this.againBtn = document.getElementById("pacman-againBtn");
    this.finalScore = document.getElementById("pacman-finalScore");
    this.bestScore = document.getElementById("pacman-bestScore");
    this.newRecord = document.getElementById("pacman-newRecord");

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

  showStartMenu() {
    this.state.mode = "start";
    this.scoreEl.classList.remove("visible");
    this.gameoverScreen.classList.add("hidden");
    this.startScreen.classList.remove("hidden");
    this.recordLine.textContent = this.state.highScore > 0
      ? `\uD83C\uDFC6 RECORDE: ${this.state.highScore}`
      : "RECORDE: 0";
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

  playChomp() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("square", 260, now, 0.08, 0.12);
    this.tone("square", 520, now + 0.04, 0.06, 0.08);
  }

  playDeath() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("sawtooth", 400, now, 0.3, 0.25);
    this.tone("sawtooth", 200, now + 0.1, 0.3, 0.2);
    this.tone("sine", 80, now + 0.2, 0.4, 0.3);
  }

  playWin() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tone("square", f, now + i * 0.12, 0.1, 0.1);
    });
  }

  playMusic() {
    this.stopMusic();
    if (this.state.muted) return;
    const melody = [262, 330, 392, 330, 262, 262, 330, 392, 330, 262, 0, 392, 523, 392, 330, 262];
    let index = 0;
    this._musicTimer = setInterval(() => {
      const actx = this.audio();
      if (!actx || this.state.mode !== "playing") return;
      const note = melody[index % melody.length];
      if (note) this.tone("square", note, actx.currentTime, 0.12, 0.035);
      index++;
    }, 180);
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

  resetLevel() {
    this.state.player.r = 7;
    this.state.player.c = 7;
    this.state.player.dir = 0;
    this.state.player.nextDir = 0;
    this.state.player.moving = false;
    this.state.immune = 30;
    this.state.combo = 1;

    const ghostSpawns = [{ r: 1, c: 7 }, { r: 13, c: 7 }, { r: 7, c: 1 }, { r: 7, c: 13 }];
    const speedMap = { easy: 0.6, medium: 0.9, hard: 1.3 };
    const gs = speedMap[this.state.difficulty] || 0.9;

    this.state.ghosts = [];
    for (let i = 0; i < 3; i++) {
      this.state.ghosts.push({
        r: ghostSpawns[i].r, c: ghostSpawns[i].c,
        dir: 0, color: this.GHOST_COLORS[i % this.GHOST_COLORS.length],
        speed: gs + i * 0.1, scatterTimer: 0,
      });
    }
  }

  startGame() {
    this.state.mode = "playing";
    this.state.score = 0;
    this.state.lives = 3;
    this.state.eatenFood = 0;
    this.state.combo = 1;

    for (const f of this.state.foods) f.eaten = false;

    this.resetLevel();
    this.scoreEl.textContent = "0";
    this.startScreen.classList.add("hidden");
    this.gameoverScreen.classList.add("hidden");
    this.hud.style.display = "flex";
    this.playMusic();
  }

  gameOver() {
    if (this.state.mode !== "playing") return;
    this.state.mode = "gameover";
    this.stopMusic();
    this.playDeath();

    const isRecord = this.state.score > this.state.highScore;
    if (isRecord) {
      this.state.highScore = this.state.score;
      localStorage.setItem("dogao_pacman_highscore", String(this.state.highScore));
      this.highEl.textContent = this.state.highScore;
    }

    this.finalScore.textContent = this.state.score;
    this.bestScore.textContent = this.state.highScore;
    this.newRecord.classList.toggle("hidden", !isRecord);
    this.hud.style.display = "none";
    this.gameoverScreen.classList.remove("hidden");
  }

  dirVectors(d) {
    const vecs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    return vecs[d] || [0, 0];
  }

  isWalkable(r, c) {
    if (r < 0 || r >= this.ROWS || c < 0 || c >= this.COLS) return false;
    return this.maze[r][c] !== 1;
  }

  updateGame() {
    if (this.state.mode !== "playing") return;
    this.state.frame++;

    if (this.state.immune > 0) this.state.immune--;

    const speed = this.CONSTANTS.playerSpeed;
    const p = this.state.player;
    let dr = 0, dc = 0;

    if (p.nextDir !== p.dir) {
      const v = this.dirVectors(p.nextDir);
      if (this.isWalkable(Math.round(p.r) + v[0], Math.round(p.c) + v[1])) {
        p.dir = p.nextDir;
      }
    }

    const v = this.dirVectors(p.dir);
    dr = v[0]; dc = v[1];
    const targetR = p.r + dr * speed * 0.05;
    const targetC = p.c + dc * speed * 0.05;

    const nearR = Math.round(targetR);
    const nearC = Math.round(targetC);

    if (this.isWalkable(nearR, nearC)) {
      p.r = targetR;
      p.c = targetC;
      p.moving = true;
    } else {
      const snapR = Math.round(p.r);
      const snapC = Math.round(p.c);
      if (Math.abs(p.r - snapR) < 0.15 && Math.abs(p.c - snapC) < 0.15) {
        p.r = snapR;
        p.c = snapC;
      } else {
        p.r += dr * speed * 0.04;
        p.c += dc * speed * 0.04;
      }
      p.moving = false;
    }

    p.mouthOpen = (Math.sin(this.state.frame * 0.15) + 1) * 0.4;

    const pr = Math.round(p.r), pc = Math.round(p.c);
    for (const f of this.state.foods) {
      if (!f.eaten && f.r === pr && f.c === pc) {
        f.eaten = true;
        this.state.eatenFood++;
        this.state.score += f.type.points * this.state.combo;
        this.state.combo = Math.min(4, this.state.combo + 1);
        this.scoreEl.textContent = this.state.score;
        this.playChomp();
      }
    }

    for (const g of this.state.ghosts) {
      const gdr = Math.sign(this.state.player.r - g.r);
      const gdc = Math.sign(this.state.player.c - g.c);

      const gs = g.speed * 0.04;
      const canR = this.isWalkable(Math.round(g.r + gdr), Math.round(g.c));
      const canC = this.isWalkable(Math.round(g.r), Math.round(g.c + gdc));

      if (canR && (Math.random() > 0.3 || !canC)) {
        g.r += gdr * gs;
      } else if (canC) {
        g.c += gdc * gs;
      } else {
        g.c += (Math.random() > 0.5 ? 1 : -1) * gs * 0.5;
      }

      g.r = Math.max(0.5, Math.min(this.ROWS - 1.5, g.r));
      g.c = Math.max(0.5, Math.min(this.COLS - 1.5, g.c));

      const gpr = Math.round(g.r), gpc = Math.round(g.c);
      if (this.isWalkable(gpr, gpc)) {
        g.r = gpr;
        g.c = gpc;
      }
    }

    const pr2 = Math.round(p.r), pc2 = Math.round(p.c);
    if (this.state.immune <= 0) {
      for (const g of this.state.ghosts) {
        const gr = Math.round(g.r), gc = Math.round(g.c);
        if (pr2 === gr && pc2 === gc) {
          this.state.lives--;
          if (this.state.lives <= 0) {
            this.gameOver();
            return;
          }
          this.resetLevel();
          return;
        }
      }
    }

    if (this.state.eatenFood >= this.state.totalFood) {
      this.playWin();
      this.gameOver();
    }
  }

  drawFood(f, cellSize, ox, oy) {
    const ctx = this.ctx;
    const cx = ox + f.c * cellSize + cellSize / 2;
    const cy = oy + f.r * cellSize + cellSize / 2;
    const s = cellSize * 0.35;

    ctx.save();
    ctx.translate(cx, cy);

    if (f.type.id === "sausage") {
      ctx.fillStyle = "#C0392B";
      ctx.beginPath();
      ctx.roundRect(-s * 0.4, -s * 0.7, s * 0.8, s * 1.4, s * 0.4);
      ctx.fill();
      ctx.fillStyle = "#E74C3C";
      ctx.fillRect(-s * 0.25, -s * 0.55, s * 0.15, s * 1.1);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(-s * 0.15, -s * 0.5, s * 0.08, s * 1.0);
    } else if (f.type.id === "tomato") {
      ctx.fillStyle = "#E74C3C";
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#27AE60";
      ctx.beginPath();
      ctx.arc(0, -s * 0.55, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, -s * 0.1);
      ctx.lineTo(s * 0.15, s * 0.2);
      ctx.stroke();
    } else if (f.type.id === "carrot") {
      ctx.fillStyle = "#E67E22";
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.7);
      ctx.lineTo(-s * 0.4, s * 0.5);
      ctx.lineTo(s * 0.4, s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#27AE60";
      ctx.beginPath();
      ctx.arc(0, -s * 0.7, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#D35400";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.3);
      ctx.lineTo(s * 0.1, s * 0.1);
      ctx.stroke();
    } else if (f.type.id === "bread") {
      ctx.fillStyle = "#F5DEB3";
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.6, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#D2B48C";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#DEB887";
      ctx.beginPath();
      ctx.ellipse(0, -1, s * 0.35, s * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.type.id === "burger") {
      ctx.fillStyle = "#D4903C";
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.4, s * 0.5, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3CB371";
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.1, s * 0.45, s * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#E74C3C";
      ctx.beginPath();
      ctx.ellipse(0, s * 0.1, s * 0.4, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#F4D03F";
      ctx.beginPath();
      ctx.ellipse(0, s * 0.35, s * 0.5, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawPacmanCharacter(cx, cy, r, mouthOpen) {
    const ctx = this.ctx;
    const s = this.CONSTANTS.cellSize * 0.4;
    const id = this.state.character;

    ctx.save();
    ctx.translate(cx, cy);

    let angle = 0;
    if (r === 0) angle = -Math.PI / 2;
    else if (r === 1) angle = Math.PI / 2;
    else if (r === 2) angle = Math.PI;
    else if (r === 3) angle = 0;
    ctx.rotate(angle);

    const mouth = 0.2 + mouthOpen * 0.35;

    if (id === "hotdog" || (id !== "burger" && id !== "dog")) {
      ctx.fillStyle = "#F4D03F";
      ctx.beginPath();
      ctx.arc(0, 0, s, mouth, Math.PI * 2 - mouth);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#D4AC0D";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.arc(s * 0.25, -s * 0.3, s * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#A0392B";
      ctx.beginPath();
      ctx.ellipse(-s * 0.15, 0, s * 0.2, s * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#F1C40F";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.05);
      for (let i = 0; i < 3; i++) {
        ctx.lineTo(-s * 0.3 + (i + 1) * (s * 0.2), i % 2 === 0 ? -s * 0.15 : s * 0.08);
      }
      ctx.stroke();
    } else if (id === "burger") {
      ctx.fillStyle = "#F4D03F";
      ctx.beginPath();
      ctx.arc(0, 0, s, mouth, Math.PI * 2 - mouth);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#D4AC0D";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#D4903C";
      ctx.beginPath(); ctx.ellipse(0, -s * 0.2, s * 0.35, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3CB371";
      ctx.beginPath(); ctx.ellipse(0, -s * 0.05, s * 0.3, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.arc(s * 0.2, -s * 0.3, s * 0.08, 0, Math.PI * 2); ctx.fill();
    } else if (id === "dog") {
      if (this.dogImage.complete && this.dogImage.naturalWidth) {
        ctx.drawImage(this.dogImage, -s, -s, s * 2, s * 2);
      } else {
        ctx.fillStyle = "#F4D03F";
        ctx.beginPath();
        ctx.arc(0, 0, s, mouth, Math.PI * 2 - mouth);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#FF6600";
        ctx.beginPath(); ctx.arc(s * 0.1, -s * 0.2, s * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(s * 0.25, -s * 0.3, s * 0.06, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore();
  }

  drawGhost(cx, cy, color) {
    const ctx = this.ctx;
    const s = this.CONSTANTS.cellSize * 0.35;

    ctx.save();
    ctx.translate(cx, cy + s * 0.1);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -s * 0.15, s * 0.55, Math.PI, 0);
    ctx.lineTo(s * 0.55, s * 0.4);
    ctx.quadraticCurveTo(s * 0.35, s * 0.6, s * 0.15, s * 0.4);
    ctx.quadraticCurveTo(-0.05, s * 0.55, -s * 0.15, s * 0.4);
    ctx.quadraticCurveTo(-s * 0.35, s * 0.6, -s * 0.55, s * 0.4);
    ctx.lineTo(-s * 0.55, -s * 0.15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.15, s * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.2, -s * 0.15, s * 0.18, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(-s * 0.2, -s * 0.12, s * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.2, -s * 0.12, s * 0.09, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const cs = this.CONSTANTS.cellSize;
    const ox = this.CONSTANTS.offsetX;
    const oy = this.CONSTANTS.offsetY;

    ctx.fillStyle = "#1a0a00";
    ctx.fillRect(0, 0, w, h);

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const x = ox + c * cs;
        const y = oy + r * cs;

        if (this.maze[r][c] === 1) {
          const gradient = ctx.createLinearGradient(x, y, x + cs, y + cs);
          gradient.addColorStop(0, "#C81010");
          gradient.addColorStop(0.5, "#E82020");
          gradient.addColorStop(1, "#8B0000");
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, cs, cs);
          ctx.strokeStyle = "rgba(255,215,0,0.15)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cs, cs);
        } else {
          ctx.fillStyle = "#2a0f00";
          ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = "rgba(255,215,0,0.04)";
          ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        }
      }
    }

    if (this.state.mode === "start") return;

    for (const f of this.state.foods) {
      if (!f.eaten) this.drawFood(f, cs, ox, oy);
    }

    for (const g of this.state.ghosts) {
      const gx = ox + g.c * cs + cs / 2;
      const gy = oy + g.r * cs + cs / 2;
      this.drawGhost(gx, gy, g.color);
    }

    const px = ox + this.state.player.c * cs + cs / 2;
    const py = oy + this.state.player.r * cs + cs / 2;

    if (this.state.immune > 0 && Math.floor(this.state.immune / 4) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }
    this.drawPacmanCharacter(px, py, this.state.player.dir, this.state.player.mouthOpen);
    ctx.globalAlpha = 1;
  }

  bindEvents() {
    let startX = 0, startY = 0;

    this._pd = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      if (this.state.mode === "start") this.startGame();
      else if (this.state.mode === "gameover") this.startGame();
    };

    this._pu = (e) => {
      e.preventDefault();
      if (startX === 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);
      if (absDx < 15 && absDy < 15) return;

      if (absDx > absDy) {
        this.state.player.nextDir = dx > 0 ? 3 : 2;
      } else {
        this.state.player.nextDir = dy > 0 ? 1 : 0;
      }
      startX = 0;
      startY = 0;
    };

    this._pm = (e) => {
      e.preventDefault();
      if (this.state.mode === "playing" && this._pointerActive) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;
        if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
          if (Math.abs(dx) > Math.abs(dy)) {
            this.state.player.nextDir = dx > 0 ? 3 : 2;
          } else {
            this.state.player.nextDir = dy > 0 ? 1 : 0;
          }
        }
      }
    };

    this._kd = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (this.state.mode === "start") this.startGame();
        else if (this.state.mode === "gameover") this.startGame();
      }
      if (this.state.mode === "playing") {
        if (e.code === "ArrowUp") { e.preventDefault(); this.state.player.nextDir = 0; }
        if (e.code === "ArrowDown") { e.preventDefault(); this.state.player.nextDir = 1; }
        if (e.code === "ArrowLeft") { e.preventDefault(); this.state.player.nextDir = 2; }
        if (e.code === "ArrowRight") { e.preventDefault(); this.state.player.nextDir = 3; }
      }
    };

    this._play = (e) => { e.stopPropagation(); this.startGame(); };
    this._again = (e) => { e.stopPropagation(); this.startGame(); };
    this._soundToggle = (e) => this.toggleSound(e);

    this._resize = () => this.resize();

    this.canvas.addEventListener("pointerdown", this._pd);
    this.canvas.addEventListener("pointerup", this._pu);
    this.canvas.addEventListener("pointermove", this._pm);
    this.canvas.addEventListener("touchstart", this._pd, { passive: false });
    this.canvas.addEventListener("touchend", this._pu, { passive: false });
    this.canvas.addEventListener("touchmove", this._pm, { passive: false });
    window.addEventListener("keydown", this._kd);
    window.addEventListener("resize", this._resize);
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
    this.canvas.removeEventListener("pointerup", this._pu);
    this.canvas.removeEventListener("pointermove", this._pm);
    this.canvas.removeEventListener("touchstart", this._pd);
    this.canvas.removeEventListener("touchend", this._pu);
    this.canvas.removeEventListener("touchmove", this._pm);
    window.removeEventListener("keydown", this._kd);
    window.removeEventListener("resize", this._resize);
    if (this.playBtn) this.playBtn.removeEventListener("click", this._play);
    if (this.againBtn) this.againBtn.removeEventListener("click", this._again);
    if (this.soundBtn) this.soundBtn.removeEventListener("click", this._soundToggle);
    if (this.ui) this.ui.remove();
  }
}
