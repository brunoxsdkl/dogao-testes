class SurvivorGame {
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
      { id: "easy", label: "Facil", emoji: "\uD83D\uDE0A", description: "Menos inimigos" },
      { id: "medium", label: "Medio", emoji: "\uD83D\uDE24", description: "Normal" },
      { id: "hard", label: "Dificil", emoji: "\uD83D\uDC80", description: "Muitos!" },
    ];

    this.dogImage = new Image();
    this.dogImage.src = "assets/dog-character-y2uiqon.png";

    this._audioCtx = null;
    this._musicTimer = null;

    this.setupCanvas();
    this.init();
  }

  setupCanvas() {
    this.canvas.width = 500;
    this.canvas.height = 500;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
  }

  init() {
    this.state = {
      mode: "start",
      score: 0,
      highScore: Number(localStorage.getItem("dogao_survivor_highscore") || 0),
      character: "hotdog",
      difficulty: "medium",
      muted: false,
      frame: 0,
      player: { x: 250, y: 250, size: 20 },
      enemies: [],
      xps: [],
      level: 1,
      xp: 0,
      xpNext: 5,
      spawnTimer: 0,
      kills: 0,
    };

    this.CONSTANTS = {
      worldSize: 500,
      playerSpeed: 2.5,
      enemySize: 14,
      cameraX: 0,
      cameraY: 0,
    };

    this.createUI();
    this.bindEvents();
    this.render();
    this._last = performance.now();
    this.loop();
  }

  createUI() {
    const c = this.canvas.parentElement;
    this.ui = document.createElement("div");
    this.ui.id = "survivor-ui";

    this.ui.innerHTML = `
      <div id="survivor-hud" style="position:absolute;top:0;left:0;right:0;z-index:5;display:none;pointer-events:none;">
        <div style="position:absolute;top:max(12px,env(safe-area-inset-top));left:12px;font-family:'Press Start 2P',monospace;font-size:9px;color:white;text-shadow:0 2px 4px rgba(0,0,0,0.5);">
          <div>\uD83C\uDF96 <span id="survivor-kills">0</span></div>
          <div style="margin-top:4px;">\u2B50 Lv.<span id="survivor-level">1</span></div>
        </div>
      </div>
      <button class="sound-button" id="survivor-soundBtn" type="button" aria-label="Silenciar som" style="top:max(12px,env(safe-area-inset-top));right:12px;">\uD83D\uDD0A</button>
      <section class="screen start-screen hidden" id="survivor-startScreen">
        <img class="brand-logo" src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
        <div class="title-stack">
          <h1>Dogao</h1>
          <h2>Survivor</h2>
        </div>
        <div class="hero-character" id="survivor-hero" style="font-size:clamp(48px,14vw,72px);margin:6px 0;animation:bob 1.8s ease-in-out infinite;">\uD83C\uDF2D</div>
        <p class="record" id="survivor-recordLine" style="min-height:16px;margin:0 0 6px;">\uD83C\uDFC6 RECORDE: ${this.state.highScore}</p>
        <p style="font-family:'Press Start 2P',monospace;font-size:6px;color:rgba(255,255,255,0.5);max-width:300px;line-height:1.5;margin:0 0 8px;">SOBREVIVA O MAXIMO<br/>Elimine inimigos roxos</p>
        <div class="chooser"><p>ESCOLHA SEU PERSONAGEM</p><div class="card-row" id="survivor-charOptions"></div></div>
        <div class="chooser"><p>DIFICULDADE</p><div class="card-row" id="survivor-diffOptions"></div></div>
        <button class="play-button" id="survivor-playBtn" type="button">\u25B6 JOGAR</button>
        <p class="hint">ARRASTE PARA MOVER</p>
      </section>
      <section class="screen gameover-screen hidden" id="survivor-gameoverScreen">
        <div class="gameover-card">
          <img src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
          <div style="font-size:48px;line-height:1;">\uD83D\uDC80</div>
          <h2 style="margin:4px 0 8px;font-size:31px;line-height:1;">MORREU!</h2>
          <p class="new-record hidden" id="survivor-newRecord">\u2605 NOVO RECORDE! \u2605</p>
          <div class="result-grid">
            <div><span>ELIMINACOES</span><strong id="survivor-finalScore">0</strong></div>
            <div><span>RECORDE</span><strong id="survivor-bestScore">0</strong></div>
          </div>
          <button class="again-button" id="survivor-againBtn" type="button">\u21BB DE NOVO!</button>
          <p class="card-footer">O MEGA DOGAO - DESDE 2000</p>
        </div>
      </section>
    `;
    c.appendChild(this.ui);

    this.soundBtn = document.getElementById("survivor-soundBtn");
    this.hud = document.getElementById("survivor-hud");
    this.killsEl = document.getElementById("survivor-kills");
    this.levelEl = document.getElementById("survivor-level");
    this.startScreen = document.getElementById("survivor-startScreen");
    this.gameoverScreen = document.getElementById("survivor-gameoverScreen");
    this.charOptions = document.getElementById("survivor-charOptions");
    this.diffOptions = document.getElementById("survivor-diffOptions");
    this.heroEl = document.getElementById("survivor-hero");
    this.recordLine = document.getElementById("survivor-recordLine");
    this.playBtn = document.getElementById("survivor-playBtn");
    this.againBtn = document.getElementById("survivor-againBtn");
    this.finalScore = document.getElementById("survivor-finalScore");
    this.bestScore = document.getElementById("survivor-bestScore");
    this.newRecord = document.getElementById("survivor-newRecord");

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

  playHit() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("square", 440, now, 0.08, 0.1);
    this.tone("square", 660, now + 0.04, 0.06, 0.08);
  }

  playKill() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("sine", 880, now, 0.1, 0.15);
    this.tone("sine", 1320, now + 0.06, 0.12, 0.12);
  }

  playHurt() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("sawtooth", 150, now, 0.3, 0.25);
  }

  playMusic() {
    this.stopMusic();
    if (this.state.muted) return;
    const melody = [330, 440, 523, 440, 330, 330, 440, 523, 0, 523, 440, 330, 294, 262, 330, 440, 523, 659, 523, 440, 523, 659, 0, 659, 523, 440, 330, 294, 262];
    let index = 0;
    this._musicTimer = setInterval(() => {
      const actx = this.audio();
      if (!actx || this.state.mode !== "playing") return;
      const note = melody[index % melody.length];
      if (note) this.tone("square", note, actx.currentTime, 0.12, 0.03);
      index++;
    }, 175);
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

  startGame() {
    this.state.mode = "playing";
    this.state.score = 0;
    this.state.kills = 0;
    this.state.level = 1;
    this.state.xp = 0;
    this.state.xpNext = 5;
    this.state.frame = 0;
    this.state.spawnTimer = 0;
    this.state.enemies = [];
    this.state.xps = [];
    this.state.player.x = 250;
    this.state.player.y = 250;

    this.startScreen.classList.add("hidden");
    this.gameoverScreen.classList.add("hidden");
    this.hud.style.display = "block";
    this.killsEl.textContent = "0";
    this.levelEl.textContent = "1";
    this.playMusic();
  }

  gameOver() {
    if (this.state.mode !== "playing") return;
    this.state.mode = "gameover";
    this.stopMusic();
    this.playHurt();

    const isRecord = this.state.kills > this.state.highScore;
    if (isRecord) {
      this.state.highScore = this.state.kills;
      localStorage.setItem("dogao_survivor_highscore", String(this.state.highScore));
    }

    this.finalScore.textContent = this.state.kills;
    this.bestScore.textContent = this.state.highScore;
    this.newRecord.classList.toggle("hidden", !isRecord);
    this.hud.style.display = "none";
    this.gameoverScreen.classList.remove("hidden");
  }

  spawnEnemy() {
    const ws = this.CONSTANTS.worldSize;
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const margin = 30;
    if (side === 0) { x = -margin; y = Math.random() * ws; }
    else if (side === 1) { x = ws + margin; y = Math.random() * ws; }
    else if (side === 2) { x = Math.random() * ws; y = -margin; }
    else { x = Math.random() * ws; y = ws + margin; }

    const speedMap = { easy: 0.4, medium: 0.6, hard: 0.9 };
    const baseSpeed = speedMap[this.state.difficulty] || 0.6;

    const diffMult = { easy: 0.7, medium: 1, hard: 1.4 };
    const sizeMap = { easy: 16, medium: 14, hard: 12 };

    this.state.enemies.push({
      x, y,
      size: sizeMap[this.state.difficulty] || 14,
      speed: baseSpeed + Math.random() * 0.3 + this.state.level * 0.05,
      hp: 1,
      color: Math.random() > 0.7 ? "#9B59B6" : "#C81010",
      flash: 0,
    });
  }

  spawnXp(x, y) {
    this.state.xps.push({ x, y, size: 5 });
  }

  updateGame() {
    if (this.state.mode !== "playing") return;
    this.state.frame++;

    const ws = this.CONSTANTS.worldSize;
    const ps = this.CONSTANTS.playerSpeed;

    const speedMap = { easy: 2, medium: 2.5, hard: 3 };
    const pSpeed = speedMap[this.state.difficulty] || 2.5;

    if (this._pointerActive && this._pointerX != null && this._pointerY != null) {
      const dx = this._pointerX - this.state.player.x;
      const dy = this._pointerY - this.state.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 5) {
        const move = Math.min(pSpeed, dist);
        this.state.player.x += (dx / dist) * move;
        this.state.player.y += (dy / dist) * move;
      }
    }

    this.state.player.x = Math.max(10, Math.min(ws - 10, this.state.player.x));
    this.state.player.y = Math.max(10, Math.min(ws - 10, this.state.player.y));

    const spawnRate = { easy: 45, medium: 30, hard: 20 };
    const si = spawnRate[this.state.difficulty] || 30;
    this.state.spawnTimer++;
    if (this.state.spawnTimer >= Math.max(10, si - this.state.level * 2)) {
      this.state.spawnTimer = 0;
      this.spawnEnemy();
    }

    for (const e of this.state.enemies) {
      const dx = this.state.player.x - e.x;
      const dy = this.state.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;
      }
      if (e.flash > 0) e.flash--;
    }

    const px = this.state.player.x, py = this.state.player.y;
    const pr = this.state.player.size;

    for (let i = this.state.enemies.length - 1; i >= 0; i--) {
      const e = this.state.enemies[i];
      const dist = Math.sqrt((px - e.x) ** 2 + (py - e.y) ** 2);
      if (dist < pr + e.size / 2) {
        this.gameOver();
        return;
      }

      for (let j = this.state.xps.length - 1; j >= 0; j--) {
        const xp = this.state.xps[j];
        const xd = px - xp.x, yd = py - xp.y;
        if (Math.sqrt(xd * xd + yd * yd) < pr + 8) {
          this.state.xp++;
          this.state.xps.splice(j, 1);
          this.playHit();
          if (this.state.xp >= this.state.xpNext) {
            this.state.xp = 0;
            this.state.xpNext = Math.floor(this.state.xpNext * 1.5);
            this.state.level++;
            this.levelEl.textContent = this.state.level;
          }
        }
      }
    }

    if (this.state.frame % 60 === 0 && this.state.enemies.length > 0) {
      const killIdx = Math.floor(Math.random() * this.state.enemies.length);
      if (this.state.enemies[killIdx].color === "#9B59B6") {
        this.spawnXp(this.state.enemies[killIdx].x, this.state.enemies[killIdx].y);
        this.state.enemies.splice(killIdx, 1);
        this.state.kills++;
        this.killsEl.textContent = this.state.kills;
        this.playKill();
      }
    }
  }

  drawCharacter(ctx, x, y) {
    const id = this.state.character;
    const s = this.state.player.size;
    const hw = s, hh = s;

    ctx.save();
    ctx.translate(x, y);

    if (id === "hotdog" || (id !== "burger" && id !== "dog")) {
      ctx.fillStyle = "#D4903C";
      ctx.beginPath(); ctx.ellipse(0, 2, hw * 0.85, hh * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#A0392B";
      ctx.beginPath(); ctx.ellipse(0, -4, hw * 0.75, hh * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#F1C40F"; ctx.lineWidth = 2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-hw * 0.4, -4);
      for (let i = 0; i < 3; i++) {
        const lx = -hw * 0.4 + (i + 1) * (hw * 0.8 / 3);
        ctx.lineTo(lx, i % 2 === 0 ? -hh * 0.3 : hh * 0.1);
      }
      ctx.stroke();
      ctx.fillStyle = "#E8A84C";
      ctx.beginPath(); ctx.ellipse(0, -hh * 0.35, hw * 0.85, hh * 0.45, 0, Math.PI, Math.PI * 2); ctx.fill();
    } else if (id === "burger") {
      ctx.fillStyle = "#D4903C";
      ctx.beginPath(); ctx.ellipse(0, 4, hw * 0.85, hh * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3CB371";
      ctx.beginPath(); ctx.ellipse(0, 0, hw * 0.8, hh * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8B4513";
      ctx.beginPath(); ctx.ellipse(0, -4, hw * 0.75, hh * 0.25, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#F4D03F";
      ctx.beginPath(); ctx.ellipse(0, -hh * 0.25, hw * 0.8, hh * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#E8A84C";
      ctx.beginPath(); ctx.ellipse(0, -hh * 0.45, hw * 0.9, hh * 0.4, 0, Math.PI, Math.PI * 2); ctx.fill();
    } else if (id === "dog") {
      if (this.dogImage.complete && this.dogImage.naturalWidth) {
        ctx.drawImage(this.dogImage, -hw, -hh, s * 2, s * 2);
      } else {
        ctx.fillStyle = "#FF6600";
        ctx.beginPath(); ctx.ellipse(0, 0, hw * 0.7, hh * 0.7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#FFCC99";
        ctx.beginPath(); ctx.ellipse(0, -4, hw * 0.35, hh * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#222";
        ctx.beginPath(); ctx.arc(0, -5, 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(-4, -6, 3, 0, Math.PI * 2);
    ctx.arc(4, -6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(-4, -5, 1.5, 0, Math.PI * 2);
    ctx.arc(4, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    const ws = this.CONSTANTS.worldSize;

    const grad = ctx.createRadialGradient(ws / 2, ws / 2, 10, ws / 2, ws / 2, ws / 1.5);
    grad.addColorStop(0, "#2d1b4e");
    grad.addColorStop(0.5, "#1a1a3e");
    grad.addColorStop(1, "#0a0a2e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ws, ws);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < ws; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, ws); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(ws, i); ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,215,0,0.08)";
    ctx.beginPath(); ctx.arc(ws / 2, ws / 2, ws * 0.35, 0, Math.PI * 2); ctx.fill();

    if (this.state.mode === "start") return;

    for (const xp of this.state.xps) {
      ctx.fillStyle = "#9B59B6";
      const pulse = Math.sin(this.state.frame * 0.08 + xp.x) * 2;
      ctx.beginPath(); ctx.arc(xp.x, xp.y, xp.size + pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#BB8FCE";
      ctx.beginPath(); ctx.arc(xp.x - 1, xp.y - 1, xp.size * 0.5, 0, Math.PI * 2); ctx.fill();
    }

    for (const e of this.state.enemies) {
      ctx.save();
      const glow = e.flash > 0 ? 4 : 0;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = glow;

      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size / 2, 0, Math.PI * 2);
      ctx.fill();

      if (e.color === "#9B59B6") {
        ctx.fillStyle = "#BB8FCE";
        ctx.beginPath(); ctx.arc(e.x - 2, e.y - 2, e.size * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.beginPath(); ctx.arc(e.x, e.y, e.size * 0.5, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(255,215,0,0.3)";
        ctx.beginPath(); ctx.arc(e.x - 1, e.y - 1, e.size * 0.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = "rgba(255,215,0,0.5)";
    ctx.shadowBlur = 12;
    this.drawCharacter(ctx, this.state.player.x, this.state.player.y);
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(this.state.player.x, this.state.player.y, this.state.player.size + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  bindEvents() {
    this._pd = (e) => {
      e.preventDefault();
      this._pointerActive = true;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      this._pointerX = (touch.clientX - rect.left) * (this.CONSTANTS.worldSize / rect.width);
      this._pointerY = (touch.clientY - rect.top) * (this.CONSTANTS.worldSize / rect.height);
      if (this.state.mode === "start") this.startGame();
      else if (this.state.mode === "gameover") this.startGame();
    };
    this._pm = (e) => {
      e.preventDefault();
      if (!this._pointerActive) return;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      this._pointerX = (touch.clientX - rect.left) * (this.CONSTANTS.worldSize / rect.width);
      this._pointerY = (touch.clientY - rect.top) * (this.CONSTANTS.worldSize / rect.height);
    };
    this._pu = (e) => { e.preventDefault(); this._pointerActive = false; this._pointerX = null; this._pointerY = null; };
    this._kd = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (this.state.mode === "start") this.startGame();
        else if (this.state.mode === "gameover") this.startGame();
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
