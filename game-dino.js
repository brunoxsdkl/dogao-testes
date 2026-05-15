class DinoGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.animId = null;
    this.running = true;
    this._last = null;

    this.CHARACTERS = [
      { id: "hotdog", label: "Hot Dog", emoji: "🌭", description: "O classico!" },
      { id: "burger", label: "X-Burguer", emoji: "🍔", description: "Poderoso!" },
      { id: "dog", label: "Dogao", emoji: "🐕", image: "assets/dog-character-y2uiqon.png", description: "Mascote!" },
    ];

    this.dogImage = new Image();
    this.dogImage.src = "assets/dog-character-y2uiqon.png";

    this.setupCanvas();
    this.init();
  }

  setupCanvas() {
    this.canvas.width = 800;
    this.canvas.height = 400;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
  }

  init() {
    this.state = {
      mode: "start",
      score: 0,
      highScore: Number(localStorage.getItem("dogao_runner_highscore") || 0),
      speed: 5,
      baseSpeed: 5,
      groundOffset: 0,
      character: "hotdog",
      runner: { x: 80, y: 0, width: 50, height: 55, vy: 0, jumping: false },
      obstacles: [],
      buildings: [],
      frame: 0,
      gameTime: 0,
    };

    this.CONSTANTS = {
      gravity: 0.55,
      jumpForce: -11,
      groundY: 340,
      minInterval: 50,
      maxInterval: 110,
      maxSpeed: 12,
    };

    this.createUI();
    this.bindEvents();
    this.resetPositions();
    this.render();
    this._last = performance.now();
    this.loop();
  }

  createUI() {
    const c = this.canvas.parentElement;
    this.ui = document.createElement("div");
    this.ui.id = "dino-ui";
    this.ui.style.cssText = `position:absolute;top:0;left:0;right:0;pointer-events:none;font-family:'Press Start 2P',monospace;`;
    this.ui.innerHTML = `
      <div style="position:absolute;top:8px;left:50%;transform:translateX(-50%);display:flex;gap:20px;font-size:13px;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,0.5);z-index:5;">
        <span>🏆 <span id="dr-high">${this.state.highScore}</span></span>
        <span>⭐ <span id="dr-score">0</span></span>
      </div>
      <div id="dr-char-select" style="position:absolute;top:40px;left:50%;transform:translateX(-50%);display:flex;gap:8px;pointer-events:auto;z-index:5;"></div>
      <div id="dr-start" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:auto;cursor:pointer;z-index:10;">
        <div style="font-size:40px;margin-bottom:6px;">🌭</div>
        <div style="font-size:11px;color:#fff;background:rgba(200,16,16,0.9);padding:10px 22px;border-radius:10px;border:2px solid #facc15;">
          PRESSIONE ESPAÇO<br><small style="font-size:7px;color:rgba(255,255,255,0.7);">ESCOLHA O PERSONAGEM ACIMA</small>
        </div>
      </div>
      <div id="dr-gameover" class="hidden" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:auto;cursor:pointer;z-index:10;">
        <div style="font-size:28px;margin-bottom:6px;">💥</div>
        <div style="font-size:11px;color:#fff;background:rgba(200,16,16,0.9);padding:10px 22px;border-radius:10px;border:2px solid #facc15;">
          GAME OVER<br><small style="font-size:7px;color:rgba(255,255,255,0.7);">PRESSIONE ESPAÇO</small>
        </div>
      </div>
    `;
    c.appendChild(this.ui);

    this.scoreEl = document.getElementById("dr-score");
    this.highEl = document.getElementById("dr-high");
    this.startEl = document.getElementById("dr-start");
    this.gameoverEl = document.getElementById("dr-gameover");
    this.charSelectEl = document.getElementById("dr-char-select");

    for (const ch of this.CHARACTERS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = ch.emoji;
      btn.style.cssText = `
        width:36px;height:36px;border-radius:50%;border:2px solid rgba(255,255,255,0.3);
        background:rgba(0,0,0,0.3);font-size:18px;cursor:pointer;pointer-events:auto;
        transition:all 0.2s;display:grid;place-items:center;
      `;
      btn.title = ch.label;
      if (ch.id === this.state.character) btn.style.borderColor = "#facc15";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.state.character = ch.id;
        for (const b of this.charSelectEl.children) b.style.borderColor = "rgba(255,255,255,0.3)";
        btn.style.borderColor = "#facc15";
      });
      this.charSelectEl.appendChild(btn);
    }
  }

  resetPositions() {
    this.state.runner.y = this.CONSTANTS.groundY - this.state.runner.height;
    this.state.runner.vy = 0;
    this.state.obstacles = [];

    this.state.buildings = [];
    for (let i = 0; i < 8; i++) {
      this.state.buildings.push({
        x: i * 110 + Math.random() * 40,
        w: 50 + Math.random() * 50,
        h: 60 + Math.random() * 120,
        color: ["#C81010","#B80E0E","#A0392B","#8B0000","#CC1111","#D4903C","#E82020","#AA0E0E"][i % 8],
        windows: Math.floor(2 + Math.random() * 4),
      });
    }
  }

  startGame() {
    this.state.mode = "playing";
    this.state.score = 0;
    this.state.speed = this.state.baseSpeed;
    this.state.gameTime = 0;
    this.state.frame = 0;
    this.state.runner.y = this.CONSTANTS.groundY - this.state.runner.height;
    this.state.runner.vy = 0;
    this.state.runner.jumping = false;
    this.state.obstacles = [];
    this.startEl.classList.add("hidden");
    this.gameoverEl.classList.add("hidden");
  }

  gameOver() {
    if (this.state.mode !== "playing") return;
    this.state.mode = "gameover";
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("dogao_runner_highscore", String(this.state.highScore));
      this.highEl.textContent = this.state.highScore;
    }
    this.gameoverEl.classList.remove("hidden");
  }

  jump() {
    if (this.state.mode === "start") { this.startGame(); return; }
    if (this.state.mode === "gameover") { this.startGame(); return; }
    if (this.state.mode === "playing" && !this.state.runner.jumping) {
      this.state.runner.vy = this.CONSTANTS.jumpForce;
      this.state.runner.jumping = true;
    }
  }

  spawnObstacle() {
    const types = [
      { w: 18, h: 30, color: "#C81010", detail: "#8B0000" },
      { w: 14, h: 38, color: "#E82020", detail: "#AA0E0E" },
      { w: 22, h: 25, color: "#D4903C", detail: "#B8752E" },
      { w: 16, h: 35, color: "#CC1111", detail: "#8B0000" },
      { w: 20, h: 28, color: "#FF6600", detail: "#CC5500" },
    ];
    const t = types[Math.floor(Math.random() * types.length)];
    this.state.obstacles.push({
      x: this.canvas.width + 20,
      y: this.CONSTANTS.groundY - t.h,
      w: t.w, h: t.h, color: t.color, detail: t.detail, passed: false,
    });
  }

  updateGame() {
    if (this.state.mode !== "playing") return;

    this.state.frame++;
    this.state.gameTime += 1 / 60;
    this.state.speed = Math.min(this.CONSTANTS.maxSpeed, this.state.baseSpeed + Math.floor(this.state.gameTime / 5) * 0.4);
    this.state.groundOffset += this.state.speed;

    this.state.runner.vy += this.CONSTANTS.gravity;
    this.state.runner.y += this.state.runner.vy;
    if (this.state.runner.y >= this.CONSTANTS.groundY - this.state.runner.height) {
      this.state.runner.y = this.CONSTANTS.groundY - this.state.runner.height;
      this.state.runner.vy = 0;
      this.state.runner.jumping = false;
    }

    const interval = Math.max(this.CONSTANTS.minInterval, this.CONSTANTS.maxInterval - Math.floor(this.state.gameTime / 3) * 3);
    if (this.state.frame % interval === 0) this.spawnObstacle();

    const r = this.state.runner;
    const rLeft = r.x + 8, rRight = r.x + r.width - 8;
    const rTop = r.y + 6, rBottom = r.y + r.height - 4;

    for (const o of this.state.obstacles) {
      o.x -= this.state.speed;
      if (!o.passed && o.x + o.w < r.x) { o.passed = true; this.state.score++; this.scoreEl.textContent = this.state.score; }
      if (rLeft < o.x + o.w && rRight > o.x && rTop < o.y + o.h && rBottom > o.y) this.gameOver();
    }

    this.state.obstacles = this.state.obstacles.filter((o) => o.x > -80);

    for (const b of this.state.buildings) {
      b.x -= this.state.speed * 0.3;
      if (b.x + b.w < -20) { b.x = this.canvas.width + 20 + Math.random() * 60; b.h = 60 + Math.random() * 120; }
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, 0, this.CONSTANTS.groundY);
    grad.addColorStop(0, "#87CEEB");
    grad.addColorStop(0.6, "#FFF0D0");
    grad.addColorStop(1, "#FFD580");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, this.CONSTANTS.groundY);

    for (const b of this.state.buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, this.CONSTANTS.groundY - b.h, b.w, b.h);

      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, this.CONSTANTS.groundY - b.h, b.w, b.h);

      ctx.fillStyle = "rgba(255,215,0,0.25)";
      const cols = 2;
      const rows = b.windows;
      const ww = 12, wh = 14, padX = 6, padY = 10;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = b.x + padX + c * (ww + padX);
          const wy = this.CONSTANTS.groundY - b.h + padY + r * (wh + padY);
          if (wx + ww < b.x + b.w - 4 && wy + wh < this.CONSTANTS.groundY - 4) {
            ctx.fillRect(wx, wy, ww, wh);
          }
        }
      }
    }

    const gY = this.CONSTANTS.groundY;
    const gGrad = ctx.createLinearGradient(0, gY, 0, h);
    gGrad.addColorStop(0, "#CC1111");
    gGrad.addColorStop(0.2, "#B80E0E");
    gGrad.addColorStop(1, "#8B0000");
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, gY, w, h - gY);

    ctx.fillStyle = "#FFD700";
    ctx.fillRect(0, gY, w, 4);

    ctx.setLineDash([25, 18]);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gY + 14);
    ctx.lineTo(w, gY + 14);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(255,220,0,0.06)";
    const tile = 40;
    const off = this.state.groundOffset % (tile * 2);
    for (let x = -tile + off; x < w + tile; x += tile) {
      ctx.fillRect(x, gY + 4, tile / 3, h - gY);
    }

    for (const o of this.state.obstacles) {
      ctx.fillStyle = o.color;
      ctx.beginPath();
      ctx.roundRect(o.x, o.y, o.w, o.h, 3);
      ctx.fill();

      ctx.fillStyle = "rgba(255,215,0,0.3)";
      for (let i = 0; i < 2; i++) {
        ctx.fillRect(o.x + 3 + i * 7, o.y + 3, 4, Math.max(4, o.h * 0.3));
      }

      ctx.fillStyle = o.detail;
      ctx.fillRect(o.x + 1, o.y + o.h - 4, o.w, 3);
    }

    this.drawCharacter(this.state.runner.x, this.state.runner.y);
  }

  drawCharacter(x, y) {
    const id = this.state.character;
    if (id === "hotdog") this.drawHotDog(x, y);
    else if (id === "burger") this.drawBurger(x, y);
    else if (id === "dog") this.drawDog(x, y);
  }

  drawHotDog(x, y) {
    const ctx = this.ctx;
    const w = this.state.runner.width;
    const h = this.state.runner.height;
    const hw = w / 2, hh = h / 2;
    const bounce = this.state.runner.jumping ? 0 : Math.abs(Math.sin(this.state.frame * 0.12)) * 3;

    ctx.save();
    ctx.translate(x + hw, y + hh + (this.state.mode !== "gameover" ? -bounce : 0));

    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(2, hh * 0.6 + 4, hw * 0.7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#D4903C";
    ctx.beginPath();
    ctx.ellipse(0, hh * 0.2, hw * 0.9, hh * 0.55, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#B8752E"; ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = "#A0392B";
    ctx.beginPath();
    ctx.ellipse(0, -hh * 0.15, hw * 0.8, hh * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#7B2B20"; ctx.stroke();

    ctx.strokeStyle = "#F1C40F"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-hw * 0.5, -hh * 0.1);
    for (let i = 0; i < 5; i++) {
      const lx = -hw * 0.5 + (i + 1) * ((hw) / 5);
      const ly = i % 2 === 0 ? -hh * 0.3 : hh * 0.15;
      ctx.lineTo(lx, ly);
    }
    ctx.stroke();

    ctx.fillStyle = "#E8A84C";
    ctx.beginPath();
    ctx.ellipse(0, -hh * 0.4, hw * 0.9, hh * 0.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#D4903C"; ctx.stroke();

    if (this.state.runner.jumping) {
      const p = this.state.frame * 0.25;
      ctx.strokeStyle = "#7B2B20"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-hw * 0.3, hh * 0.5);
      ctx.lineTo(-hw * 0.3 - 4 + Math.sin(p) * 3, hh * 0.5 + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hw * 0.3, hh * 0.5);
      ctx.lineTo(hw * 0.3 + 4 - Math.sin(p) * 3, hh * 0.5 + 10); ctx.stroke();
    } else {
      const phase = Math.floor(this.state.frame / 5) % 2;
      ctx.strokeStyle = "#7B2B20"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-hw * 0.3, hh * 0.5);
      ctx.lineTo(-hw * 0.3 + (phase === 0 ? 5 : -3), hh * 0.5 + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hw * 0.3, hh * 0.5);
      ctx.lineTo(hw * 0.3 + (phase === 0 ? -3 : 5), hh * 0.5 + 10); ctx.stroke();
    }

    this.drawFace(ctx, -hw * 0.2, hw * 0.2, -hh * 0.35, "#7B2B20", bounce);
    ctx.restore();
  }

  drawBurger(x, y) {
    const ctx = this.ctx;
    const w = this.state.runner.width;
    const h = this.state.runner.height;
    const hw = w / 2, hh = h / 2;
    const bounce = this.state.runner.jumping ? 0 : Math.abs(Math.sin(this.state.frame * 0.12)) * 3;

    ctx.save();
    ctx.translate(x + hw, y + hh + (this.state.mode !== "gameover" ? -bounce : 0));

    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(2, hh * 0.6 + 4, hw * 0.7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

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

    if (this.state.runner.jumping) {
      const p = this.state.frame * 0.25;
      ctx.strokeStyle = "#8B4513"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-hw * 0.3, hh * 0.5);
      ctx.lineTo(-hw * 0.3 - 4 + Math.sin(p) * 3, hh * 0.5 + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hw * 0.3, hh * 0.5);
      ctx.lineTo(hw * 0.3 + 4 - Math.sin(p) * 3, hh * 0.5 + 10); ctx.stroke();
    } else {
      const phase = Math.floor(this.state.frame / 5) % 2;
      ctx.strokeStyle = "#8B4513"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-hw * 0.3, hh * 0.5);
      ctx.lineTo(-hw * 0.3 + (phase === 0 ? 5 : -3), hh * 0.5 + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hw * 0.3, hh * 0.5);
      ctx.lineTo(hw * 0.3 + (phase === 0 ? -3 : 5), hh * 0.5 + 10); ctx.stroke();
    }

    this.drawFace(ctx, -hw * 0.2, hw * 0.2, -hh * 0.65, "#8B4513", bounce);
    ctx.restore();
  }

  drawDog(x, y) {
    const ctx = this.ctx;
    if (this.dogImage.complete && this.dogImage.naturalWidth) {
      this.drawDogImage(x, y);
      return;
    }
    const w = this.state.runner.width + 6;
    const h = this.state.runner.height + 8;
    const hw = w / 2, hh = h / 2;
    const bounce = this.state.runner.jumping ? 0 : Math.abs(Math.sin(this.state.frame * 0.12)) * 3;

    ctx.save();
    ctx.translate(x + hw, y + hh + (this.state.mode !== "gameover" ? -bounce : 0));

    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(2, hh * 0.5 + 4, hw * 0.7, 4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#FF6600";
    ctx.beginPath(); ctx.ellipse(0, hh * 0.05, hw * 0.65, hh * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#111"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -hh * 0.4, hw * 0.5, hh * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#FFCC99";
    ctx.beginPath(); ctx.ellipse(0, -hh * 0.25, hw * 0.3, hh * 0.25, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.ellipse(0, -hh * 0.3, hw * 0.1, hw * 0.08, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = "#FF6600"; ctx.lineWidth = hw * 0.12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-hw * 0.45, hh * 0.25);
    ctx.quadraticCurveTo(-hw * 0.75, -hh * 0.1, -hw * 0.55, -hh * 0.35); ctx.stroke();

    ctx.fillStyle = "#D4903C";
    ctx.beginPath(); ctx.ellipse(hw * 0.3, -hh * 0.15, hw * 0.2, hh * 0.1, 0.3, 0, Math.PI * 2); ctx.fill();

    if (this.state.runner.jumping) {
      const p = this.state.frame * 0.25;
      ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-hw * 0.3, hh * 0.5);
      ctx.lineTo(-hw * 0.3 - 4 + Math.sin(p) * 3, hh * 0.5 + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hw * 0.3, hh * 0.5);
      ctx.lineTo(hw * 0.3 + 4 - Math.sin(p) * 3, hh * 0.5 + 10); ctx.stroke();
    } else {
      const phase = Math.floor(this.state.frame / 5) % 2;
      ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-hw * 0.3, hh * 0.5);
      ctx.lineTo(-hw * 0.3 + (phase === 0 ? 5 : -3), hh * 0.5 + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hw * 0.3, hh * 0.5);
      ctx.lineTo(hw * 0.3 + (phase === 0 ? -3 : 5), hh * 0.5 + 10); ctx.stroke();
    }

    this.drawFace(ctx, -hw * 0.15, hw * 0.15, -hh * 0.45, "#222", bounce);
    ctx.restore();
  }

  drawDogImage(x, y) {
    const ctx = this.ctx;
    const w = 68, h = 68;
    const bounce = this.state.runner.jumping ? 0 : Math.abs(Math.sin(this.state.frame * 0.12)) * 3;
    ctx.save();
    ctx.translate(x + this.state.runner.width / 2, y + this.state.runner.height / 2 + (this.state.mode !== "gameover" ? -bounce : 0));
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.beginPath(); ctx.ellipse(0, h * 0.38, w * 0.32, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.drawImage(this.dogImage, -w / 2, -h / 2, w, h);
    if (this.state.runner.jumping) {
      const p = this.state.frame * 0.25;
      ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-15, h * 0.35);
      ctx.lineTo(-15 - 4 + Math.sin(p) * 3, h * 0.35 + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, h * 0.35);
      ctx.lineTo(15 + 4 - Math.sin(p) * 3, h * 0.35 + 10); ctx.stroke();
    } else {
      const phase = Math.floor(this.state.frame / 5) % 2;
      ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-15, h * 0.35);
      ctx.lineTo(-15 + (phase === 0 ? 5 : -3), h * 0.35 + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(15, h * 0.35);
      ctx.lineTo(15 + (phase === 0 ? -3 : 5), h * 0.35 + 10); ctx.stroke();
    }
    ctx.restore();
  }

  drawFace(ctx, lx, rx, ey, mc, bounce) {
    const by = ey - (this.state.mode !== "gameover" ? bounce * 0.5 : 0);
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(lx, by, 4.5, 0, Math.PI * 2); ctx.arc(rx, by, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath(); ctx.arc(lx + 1, by + 1.5, 2.2, 0, Math.PI * 2); ctx.arc(rx + 1, by + 1.5, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(lx + 1.5, by - 1.5, 1, 0, Math.PI * 2); ctx.arc(rx + 1.5, by - 1.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = mc; ctx.lineWidth = 1.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(0, by + 5, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
  }

  bindEvents() {
    this._kd = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); this.jump(); }
    };
    this._pd = (e) => { e.preventDefault(); this.jump(); };
    this._sc = (e) => { e.stopPropagation(); this.jump(); };
    this._gc = (e) => { e.stopPropagation(); this.jump(); };

    window.addEventListener("keydown", this._kd);
    this.canvas.addEventListener("pointerdown", this._pd);
    if (this.startEl) this.startEl.addEventListener("click", this._sc);
    if (this.gameoverEl) this.gameoverEl.addEventListener("click", this._gc);
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
    window.removeEventListener("keydown", this._kd);
    this.canvas.removeEventListener("pointerdown", this._pd);
    if (this.startEl) this.startEl.removeEventListener("click", this._sc);
    if (this.gameoverEl) this.gameoverEl.removeEventListener("click", this._gc);
    if (this.ui) this.ui.remove();
  }
}
