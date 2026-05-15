class DinoGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.animId = null;
    this.running = true;
    this._last = null;

    this.uiContainer = null;

    this.setupCanvas();
    this.init();
  }

  setupCanvas() {
    this.canvas.width = 800;
    this.canvas.height = 300;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.maxHeight = "300px";
    this.canvas.style.display = "block";
    this.canvas.style.margin = "0 auto";
  }

  init() {
    const state = {
      mode: "start",
      score: 0,
      highScore: Number(localStorage.getItem("dino_highscore") || 0),
      speed: 6,
      baseSpeed: 6,
      groundOffset: 0,
      dino: { x: 60, y: 0, width: 40, height: 48, vy: 0, jumping: false, ducking: false },
      obstacles: [],
      clouds: [],
      frame: 0,
      ground: [],
      gameTime: 0,
    };

    const CONSTANTS = {
      gravity: 0.6,
      jumpForce: -12,
      groundY: 250,
      minObstacleInterval: 60,
      maxObstacleInterval: 120,
      maxSpeed: 13,
    };

    this.state = state;
    this.CONSTANTS = CONSTANTS;
    this._keys = {};

    this.createUI();
    this.bindEvents();
    this.resetPositions();
    this.render();
  }

  createUI() {
    const container = this.canvas.parentElement;
    this.uiContainer = document.createElement("div");
    this.uiContainer.id = "dino-ui";
    this.uiContainer.style.cssText = `
      position: absolute; top: 0; left: 0; right: 0;
      pointer-events: none; font-family: 'Press Start 2P', monospace;
    `;
    this.uiContainer.innerHTML = `
      <div style="display:flex;justify-content:flex-end;padding:12px 16px;gap:16px;font-size:14px;color:#535353;">
        <span>🏆 <span id="dino-high">${this.state.highScore}</span></span>
        <span>⭐ <span id="dino-score">0</span></span>
      </div>
      <div id="dino-start" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:auto;cursor:pointer;">
        <div style="font-size:48px;margin-bottom:8px;">🦖</div>
        <div style="font-size:12px;color:#535353;background:rgba(255,255,255,0.9);padding:10px 20px;border-radius:8px;border:2px solid #535353;">
          PRESSIONE ESPAÇO<br><small style="font-size:8px;color:#999;">OU CLIQUE PARA COMEÇAR</small>
        </div>
      </div>
      <div id="dino-gameover" class="hidden" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:auto;cursor:pointer;">
        <div style="font-size:32px;margin-bottom:8px;">💀</div>
        <div style="font-size:11px;color:#535353;background:rgba(255,255,255,0.9);padding:10px 20px;border-radius:8px;border:2px solid #535353;">
          GAME OVER<br><small style="font-size:8px;color:#999;">PRESSIONE ESPAÇO</small>
        </div>
      </div>
    `;
    container.appendChild(this.uiContainer);

    this.scoreEl = document.getElementById("dino-score");
    this.highEl = document.getElementById("dino-high");
    this.startEl = document.getElementById("dino-start");
    this.gameoverEl = document.getElementById("dino-gameover");
  }

  resetPositions() {
    const g = this.CONSTANTS.groundY;
    this.state.dino.y = g - this.state.dino.height;
    this.state.dino.vy = 0;
    this.state.obstacles = [];
    this.state.clouds = [];
    this.state.ground = [];

    for (let x = 0; x < this.canvas.width + 100; x += 20) {
      this.state.ground.push({ x, y: g });
    }

    for (let i = 0; i < 4; i++) {
      this.state.clouds.push({
        x: Math.random() * this.canvas.width,
        y: 20 + Math.random() * 60,
        size: 20 + Math.random() * 30,
        speed: 0.3 + Math.random() * 0.3,
      });
    }
  }

  startGame() {
    this.state.mode = "playing";
    this.state.score = 0;
    this.state.speed = this.state.baseSpeed;
    this.state.gameTime = 0;
    this.state.frame = 0;
    this.state.dino.y = this.CONSTANTS.groundY - this.state.dino.height;
    this.state.dino.vy = 0;
    this.state.dino.jumping = false;
    this.state.obstacles = [];
    this.resetPositions();
    this.scoreEl.textContent = "0";
    this.startEl.classList.add("hidden");
    this.gameoverEl.classList.add("hidden");
  }

  gameOver() {
    if (this.state.mode !== "playing") return;
    this.state.mode = "gameover";

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem("dino_highscore", String(this.state.highScore));
      this.highEl.textContent = this.state.highScore;
    }

    this.gameoverEl.classList.remove("hidden");
  }

  jump() {
    if (this.state.mode === "start") {
      this.startGame();
      return;
    }
    if (this.state.mode === "gameover") {
      this.startGame();
      return;
    }
    if (this.state.mode === "playing") {
      if (!this.state.dino.jumping) {
        this.state.dino.vy = this.CONSTANTS.jumpForce;
        this.state.dino.jumping = true;
      }
    }
  }

  duck() {
    if (this.state.mode === "playing" && this.state.dino.jumping) {
      this.state.dino.vy += 2;
    }
    if (this.state.mode === "playing" && !this.state.dino.jumping) {
      this.state.dino.ducking = true;
    }
  }

  unduck() {
    this.state.dino.ducking = false;
  }

  spawnObstacle() {
    const types = [
      {
        width: 20 + Math.random() * 10,
        height: 35 + Math.random() * 15,
        color: "#535353",
      },
      {
        width: 30 + Math.random() * 15,
        height: 25 + Math.random() * 10,
        color: "#6B6B6B",
      },
    ];
    const type = types[Math.floor(Math.random() * types.length)];

    this.state.obstacles.push({
      x: this.canvas.width + 20,
      y: this.CONSTANTS.groundY - type.height,
      width: type.width,
      height: type.height,
      color: type.color,
      passed: false,
    });
  }

  updateGame() {
    if (this.state.mode !== "playing") return;

    this.state.frame++;
    this.state.gameTime += 1 / 60;

    this.state.speed = Math.min(
      this.CONSTANTS.maxSpeed,
      this.state.baseSpeed + Math.floor(this.state.gameTime / 5) * 0.5
    );

    this.state.groundOffset += this.state.speed;

    this.state.dino.vy += this.CONSTANTS.gravity;
    this.state.dino.y += this.state.dino.vy;

    if (this.state.dino.y >= this.CONSTANTS.groundY - this.state.dino.height) {
      this.state.dino.y = this.CONSTANTS.groundY - this.state.dino.height;
      this.state.dino.vy = 0;
      this.state.dino.jumping = false;
    }

    const dinoH = this.state.dino.ducking ? this.state.dino.height * 0.6 : this.state.dino.height;
    const dinoW = this.state.dino.ducking ? this.state.dino.width * 1.3 : this.state.dino.width;

    const interval = Math.max(
      this.CONSTANTS.minObstacleInterval,
      this.CONSTANTS.maxObstacleInterval - Math.floor(this.state.gameTime / 3) * 3
    );
    if (this.state.frame % interval === 0) {
      this.spawnObstacle();
    }

    for (const obs of this.state.obstacles) {
      obs.x -= this.state.speed;

      if (!obs.passed && obs.x + obs.width < this.state.dino.x) {
        obs.passed = true;
        this.state.score++;
        this.scoreEl.textContent = this.state.score;
      }

      const dinoLeft = this.state.dino.x;
      const dinoRight = this.state.dino.x + dinoW;
      const dinoTop = this.state.dino.y;
      const dinoBottom = this.state.dino.y + dinoH;

      const obsLeft = obs.x;
      const obsRight = obs.x + obs.width;
      const obsTop = obs.y;
      const obsBottom = obs.y + obs.height;

      if (dinoLeft < obsRight && dinoRight > obsLeft &&
          dinoTop < obsBottom && dinoBottom > obsTop) {
        this.gameOver();
      }
    }

    this.state.obstacles = this.state.obstacles.filter((obs) => obs.x > -100);

    for (const cloud of this.state.clouds) {
      cloud.x -= cloud.speed;
      if (cloud.x + cloud.size < -50) {
        cloud.x = this.canvas.width + 50;
        cloud.y = 20 + Math.random() * 60;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(0, 0, w, h);

    for (const cloud of this.state.clouds) {
      ctx.fillStyle = "rgba(200, 200, 200, 0.6)";
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.4, cloud.y - cloud.size * 0.2, cloud.size * 0.35, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.8, cloud.y, cloud.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    const gY = this.CONSTANTS.groundY;
    ctx.strokeStyle = "#535353";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, gY);
    ctx.lineTo(w, gY);
    ctx.stroke();

    const dashOffset = this.state.groundOffset % 20;
    ctx.strokeStyle = "#a0a0a0";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(-dashOffset, gY + 8);
    ctx.lineTo(w, gY + 8);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const obs of this.state.obstacles) {
      ctx.fillStyle = obs.color;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

      ctx.fillStyle = "rgba(0,0,0,0.1)";
      ctx.fillRect(obs.x + 3, obs.y + 3, obs.width - 6, obs.height - 6);

      ctx.fillStyle = "#444";
      ctx.fillRect(obs.x + obs.width * 0.2, obs.y + obs.height * 0.1, obs.width * 0.15, obs.height * 0.3);

      if (obs.height > 35) {
        ctx.fillStyle = "#444";
        ctx.fillRect(obs.x + obs.width * 0.65, obs.y + obs.height * 0.15, obs.width * 0.15, obs.height * 0.25);
      }
    }

    const dino = this.state.dino;
    const dinoH = dino.ducking ? dino.height * 0.6 : dino.height;
    const dinoW = dino.ducking ? dino.width * 1.3 : dino.width;
    const dinoY = dino.ducking ? dino.y + dino.height - dinoH : dino.y;

    ctx.save();

    const bounceOffset = (this.state.mode === "playing" || this.state.mode === "start")
      ? Math.abs(Math.sin(this.state.frame * 0.1)) * 2 : 0;

    if (dino.ducking) {
      ctx.fillStyle = "#535353";
      ctx.beginPath();
      ctx.ellipse(dino.x + dinoW / 2, dinoY + dinoH / 2, dinoW / 2, dinoH / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#444";
      ctx.beginPath();
      ctx.ellipse(dino.x + dinoW * 0.3, dinoY + dinoH * 0.3, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(dino.x + dinoW * 0.3, dinoY + dinoH * 0.3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(dino.x + dinoW * 0.3, dinoY + dinoH * 0.3, 1.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#535353";
      ctx.beginPath();
      ctx.ellipse(dino.x + dinoW / 2, dinoY + dinoH / 2 - bounceOffset, dinoW / 2, dinoH / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#444";
      ctx.beginPath();
      ctx.rect(dino.x + dinoW * 0.15, dinoY + dinoH * 0.1, dinoW * 0.7, dinoH * 0.15);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(dino.x + dinoW * 0.3, dinoY + dinoH * 0.25 - bounceOffset, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(dino.x + dinoW * 0.3, dinoY + dinoH * 0.25 - bounceOffset, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(dino.x + dinoW * 0.32, dinoY + dinoH * 0.23 - bounceOffset, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#535353";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dino.x + dinoW * 0.55, dinoY + dinoH * 0.45 - bounceOffset, 4, 0.1, Math.PI - 0.1);
      ctx.stroke();

      if (this.state.dino.jumping) {
        const legPhase = this.state.frame * 0.3;
        ctx.strokeStyle = "#535353";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(dino.x + dinoW * 0.3, dinoY + dinoH);
        ctx.lineTo(dino.x + dinoW * 0.3 - 5 + Math.sin(legPhase) * 3, dinoY + dinoH + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(dino.x + dinoW * 0.7, dinoY + dinoH);
        ctx.lineTo(dino.x + dinoW * 0.7 + 5 - Math.sin(legPhase) * 3, dinoY + dinoH + 8);
        ctx.stroke();
      } else {
        const legPhase = Math.floor(this.state.frame / 6) % 2;
        ctx.strokeStyle = "#535353";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        const lx1 = dino.x + dinoW * 0.3;
        const lx2 = dino.x + dinoW * 0.7;
        const by = dinoY + dinoH;
        ctx.beginPath();
        ctx.moveTo(lx1, by);
        ctx.lineTo(lx1 + (legPhase === 0 ? 6 : -4), by + 10);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(lx2, by);
        ctx.lineTo(lx2 + (legPhase === 0 ? -4 : 6), by + 10);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  bindEvents() {
    this._keydownFn = (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        this.jump();
      }
      if (e.code === "ArrowDown") {
        e.preventDefault();
        this.duck();
      }
    };
    this._keyupFn = (e) => {
      if (e.code === "ArrowDown") {
        this.unduck();
      }
    };
    this._pointerFn = (e) => {
      e.preventDefault();
      this.jump();
    };
    this._startClickFn = (e) => {
      e.stopPropagation();
      this.jump();
    };
    this._gameoverClickFn = (e) => {
      e.stopPropagation();
      this.jump();
    };

    window.addEventListener("keydown", this._keydownFn);
    window.addEventListener("keyup", this._keyupFn);
    this.canvas.addEventListener("pointerdown", this._pointerFn);
    if (this.startEl) this.startEl.addEventListener("click", this._startClickFn);
    if (this.gameoverEl) this.gameoverEl.addEventListener("click", this._gameoverClickFn);
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
    window.removeEventListener("keydown", this._keydownFn);
    window.removeEventListener("keyup", this._keyupFn);
    this.canvas.removeEventListener("pointerdown", this._pointerFn);
    if (this.startEl) this.startEl.removeEventListener("click", this._startClickFn);
    if (this.gameoverEl) this.gameoverEl.removeEventListener("click", this._gameoverClickFn);
    if (this.uiContainer) this.uiContainer.remove();
  }
}
