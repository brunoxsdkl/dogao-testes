class FormulaGame {
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
      { id: "easy", label: "Facil", emoji: "\uD83D\uDE0A", description: "Adversarios devagar" },
      { id: "medium", label: "Medio", emoji: "\uD83D\uDE24", description: "Normal" },
      { id: "hard", label: "Dificil", emoji: "\uD83D\uDC80", description: "Adversarios rapidos!" },
    ];

    this.dogImage = new Image();
    this.dogImage.src = "assets/dog-character-y2uiqon.png";

    this._audioCtx = null;
    this._musicTimer = null;

    // ── Track waypoints (closed circuit) ──
    this.ROAD_WIDTH = 80;
    this.WAYPOINTS = [
      { x: 600, y: 80 },
      { x: 950, y: 110 },
      { x: 1120, y: 280 },
      { x: 1170, y: 500 },
      { x: 1120, y: 720 },
      { x: 950, y: 870 },
      { x: 600, y: 920 },
      { x: 250, y: 870 },
      { x: 80, y: 720 },
      { x: 30, y: 500 },
      { x: 80, y: 280 },
      { x: 250, y: 110 },
    ];

    this.trackPoints = [];
    this.trackLength = 0;
    this.generateTrack();

    this.setupCanvas();
    this.init();
  }

  catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    const x = 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );
    const y = 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );
    return { x, y };
  }

  generateTrack() {
    const pts = this.WAYPOINTS;
    const n = pts.length;
    this.trackPoints = [];
    const segs = 24;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      for (let j = 0; j < segs; j++) {
        const tp = this.catmullRom(p0, p1, p2, p3, j / segs);
        this.trackPoints.push({ x: tp.x, y: tp.y });
      }
    }
    // Close the loop — ensure last point connects smoothly
    const last = this.catmullRom(
      pts[n - 1], pts[0], pts[1], pts[2], 0
    );
    this.trackPoints.push(last);

    // Pre-compute cumulative distance (track progress) and angle for each point
    let dist = 0;
    for (let i = 0; i < this.trackPoints.length; i++) {
      const p = this.trackPoints[i];
      if (i > 0) {
        const prev = this.trackPoints[i - 1];
        dist += Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
      }
      p.dist = dist;
      // Pre-compute angle (direction) from previous point to this one
      if (i > 0) {
        const prev = this.trackPoints[i - 1];
        p.angle = Math.atan2(p.y - prev.y, p.x - prev.x);
      } else {
        const next = this.trackPoints[1];
        p.angle = Math.atan2(next.y - p.y, next.x - p.x);
      }
    }
    this.trackLength = dist;

    // Pre-compute road edges
    const rw2 = this.ROAD_WIDTH / 2;
    for (const p of this.trackPoints) {
      const perpX = -Math.sin(p.angle);
      const perpY = Math.cos(p.angle);
      p.lx = p.x + perpX * rw2;
      p.ly = p.y + perpY * rw2;
      p.rx = p.x - perpX * rw2;
      p.ry = p.y - perpY * rw2;
    }
  }

  getTrackPoint(progress) {
    const len = this.trackLength;
    let p = progress % len;
    if (p < 0) p += len;
    const pts = this.trackPoints;
    // Binary search for speed
    let lo = 0, hi = pts.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].dist <= p) lo = mid;
      else hi = mid;
    }
    const a = pts[lo], b = pts[Math.min(hi, pts.length - 1)];
    const segLen = b.dist - a.dist;
    const t = segLen > 0 ? (p - a.dist) / segLen : 0;
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      angle: a.angle + (b.angle - a.angle) * t,
      lx: a.lx + (b.lx - a.lx) * t,
      ly: a.ly + (b.ly - a.ly) * t,
      rx: a.rx + (b.rx - a.rx) * t,
      ry: a.ry + (b.ry - a.ry) * t,
    };
  }

  getWorldPos(progress, line) {
    const tp = this.getTrackPoint(progress);
    const perpX = -Math.sin(tp.angle);
    const perpY = Math.cos(tp.angle);
    const offset = line * this.ROAD_WIDTH / 2;
    return {
      x: tp.x + perpX * offset,
      y: tp.y + perpY * offset,
      angle: tp.angle,
    };
  }

  setupCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.display = "block";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr = dpr;
  }

  audio() {
    if (this.state && this.state.muted) return null;
    if (this._audioCtx) {
      if (this._audioCtx.state === "suspended") this._audioCtx.resume();
      return this._audioCtx;
    }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    this._audioCtx = new C();
    return this._audioCtx;
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

  playEngine() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("sawtooth", 80, now, 0.06, 0.04);
    this.tone("square", 160, now + 0.01, 0.05, 0.02);
  }

  playOvertake() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("square", 660, now, 0.08, 0.08);
    this.tone("square", 880, now + 0.06, 0.08, 0.06);
  }

  playCrash() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("sawtooth", 120, now, 0.2, 0.12);
    this.tone("square", 80, now, 0.15, 0.1);
  }

  playFinish() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tone("square", f, now + i * 0.15, 0.15, 0.1);
    });
  }

  playMusic() {
    if (this.state.muted) return;
    if (this._musicTimer) return;
    const notes = [262, 294, 330, 349, 392, 349, 330, 294, 262, 330, 392, 523, 392, 330, 294, 262];
    let i = 0;
    this._musicTimer = setInterval(() => {
      const actx = this.audio();
      if (!actx || this.state.mode !== "playing") return;
      const note = notes[i % notes.length];
      if (note) this.tone("square", note, actx.currentTime, 0.12, 0.025);
      i++;
    }, 200);
  }

  stopMusic() {
    if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
  }

  toggleSound(event) {
    if (event) event.stopPropagation();
    this.state.muted = !this.state.muted;
    this.soundBtn.textContent = this.state.muted ? "\uD83D\uDD07" : "\uD83D\uDD0A";
    this.soundBtn.setAttribute("aria-label", this.state.muted ? "Ativar som" : "Silenciar som");
    if (this.state.muted) this.stopMusic();
    else if (this.state.mode === "playing") this.playMusic();
  }

  init() {
    const positions = [1, 2, 3, 4];
    this.state = {
      mode: "start",
      score: 0,
      highScore: Number(localStorage.getItem("dogao_formula_highscore") || 0),
      character: "hotdog",
      difficulty: "medium",
      muted: false,
      frame: 0,
      laps: 0,
      maxLaps: 3,
      raceOver: false,
      position: 1,
      player: { progress: 0, line: 0, speed: 0, steerInput: 0 },
      cars: [],
      engineTimer: 0,
    };

    this.createUI();
    this.showStartMenu();
    this.setupCanvas();
    this.bindEvents();
    this._last = performance.now();
    this.loop();
  }

  createUI() {
    const c = this.canvas.parentElement;
    this.ui = document.createElement("div");
    this.ui.id = "formula-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;z-index:5;overflow:hidden;pointer-events:none;";

    this.ui.innerHTML = `
      <div id="formula-hud" style="position:absolute;top:max(4px,env(safe-area-inset-top));left:0;right:0;display:none;justify-content:space-between;padding:0 10px;pointer-events:none;font-family:'Press Start 2P',monospace;font-size:7px;color:white;text-shadow:0 2px 4px rgba(0,0,0,0.5);z-index:6;">
        <span><span id="formula-pos">P1</span></span>
        <span><span id="formula-lap">V 1/3</span></span>
        <span>\uD83C\uDFC6 <span id="formula-score">0</span></span>
        <span><span id="formula-speed">0 km/h</span></span>
      </div>
      <button class="sound-button" id="formula-soundBtn" type="button" aria-label="Silenciar som" style="top:max(4px,env(safe-area-inset-top));right:4px;width:36px;height:36px;font-size:16px;">\uD83D\uDD0A</button>
      <div id="formula-controls" style="position:absolute;bottom:max(12px,env(safe-area-inset-bottom));left:0;right:0;display:none;justify-content:space-between;padding:0 20px;z-index:10;pointer-events:none;">
        <button id="formula-leftBtn" type="button" style="width:80px;height:80px;border-radius:50%;background:rgba(255,215,0,0.2);border:3px solid rgba(255,215,0,0.35);color:white;font-size:32px;display:grid;place-items:center;pointer-events:auto;touch-action:none;">\u25C0</button>
        <div style="width:80px;"></div>
        <button id="formula-rightBtn" type="button" style="width:80px;height:80px;border-radius:50%;background:rgba(255,215,0,0.2);border:3px solid rgba(255,215,0,0.35);color:white;font-size:32px;display:grid;place-items:center;pointer-events:auto;touch-action:none;">\u25B6</button>
      </div>
      <section class="screen start-screen hidden" id="formula-startScreen">
        <img class="brand-logo" src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
        <div>
          <h1 style="color:#E74C3C;font-size:clamp(28px,9vw,48px);text-shadow:0 0 20px rgba(231,76,60,0.3);">Formula Dogao</h1>
          <h2 style="color:white;font-size:clamp(18px,5vw,28px);">Corrida de F1!</h2>
        </div>
        <div class="hero-character" id="formula-hero" style="font-size:clamp(40px,12vw,64px);margin:4px 0;animation:bob 1.2s ease-in-out infinite;">\uD83C\uDFCE\uFE0F</div>
        <p class="record" id="formula-recordLine" style="min-height:16px;margin:0 0 4px;">\uD83C\uDFC6 RECORDE: ${this.state.highScore}</p>
        <p style="font-family:'Press Start 2P',monospace;font-size:5px;color:rgba(255,255,255,0.5);max-width:280px;line-height:1.4;margin:0 0 6px;">TOQUE ESQUERDA/DIREITA PARA DIRECIONAR<br/>ULTrapasse TODOS PARA VENCER!</p>
        <div class="chooser"><p>PERSONAGEM</p><div class="card-row" id="formula-charOptions"></div></div>
        <div class="chooser"><p>DIFICULDADE</p><div class="card-row" id="formula-diffOptions"></div></div>
        <button class="play-button" id="formula-playBtn" type="button">CORRER!</button>
      </section>
      <section class="screen gameover-screen hidden" id="formula-gameoverScreen">
        <div class="gameover-card">
          <img src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
          <div style="font-size:48px;line-height:1;" id="formula-resultEmoji">\uD83C\uDFC6</div>
          <h2 style="margin:4px 0 8px;font-size:clamp(24px,7vw,36px);line-height:1;" id="formula-resultTitle">VOCE VENCEU!</h2>
          <p class="new-record hidden" id="formula-newRecord">\u2605 NOVO RECORDE! \u2605</p>
          <div class="result-grid">
            <div><span>PONTOS</span><strong id="formula-finalScore">0</strong></div>
            <div><span>RECORDE</span><strong id="formula-bestScore">0</strong></div>
          </div>
          <button class="play-button" id="formula-againBtn" type="button">CORRER NOVAMENTE</button>
          <p class="card-footer">O MEGA DOGAO - DESDE 2000</p>
        </div>
      </section>
    `;
    c.appendChild(this.ui);

    this.hudEl = document.getElementById("formula-hud");
    this.posEl = document.getElementById("formula-pos");
    this.lapEl = document.getElementById("formula-lap");
    this.speedEl = document.getElementById("formula-speed");
    this.soundBtn = document.getElementById("formula-soundBtn");
    this.leftBtn = document.getElementById("formula-leftBtn");
    this.rightBtn = document.getElementById("formula-rightBtn");
    this.startScreen = document.getElementById("formula-startScreen");
    this.gameoverScreen = document.getElementById("formula-gameoverScreen");
    this.charOptions = document.getElementById("formula-charOptions");
    this.diffOptions = document.getElementById("formula-diffOptions");
    this.heroEl = document.getElementById("formula-hero");
    this.recordLine = document.getElementById("formula-recordLine");
    this.playBtn = document.getElementById("formula-playBtn");
    this.againBtn = document.getElementById("formula-againBtn");
    this.finalScore = document.getElementById("formula-finalScore");
    this.bestScore = document.getElementById("formula-bestScore");
    this.newRecord = document.getElementById("formula-newRecord");
    this.resultEmoji = document.getElementById("formula-resultEmoji");
    this.resultTitle = document.getElementById("formula-resultTitle");

    this.charOptions.innerHTML = "";
    this.diffOptions.innerHTML = "";
    for (const ch of this.CHARACTERS) {
      const btn = document.createElement("button");
      btn.className = "card";
      let vis = ch.image
        ? `<img class="character-thumb" src="${ch.image}" alt="${ch.label}" />`
        : `<span style="font-size:28px;">${ch.emoji}</span>`;
      btn.innerHTML = `${vis}<span>${ch.label}</span><small>${ch.description}</small>`;
      btn.addEventListener("click", () => {
        this.state.character = ch.id;
        this.heroEl.innerHTML = ch.image
          ? `<img src="${ch.image}" style="width:min(22vw,80px);height:min(22vw,80px);object-fit:contain;filter:drop-shadow(0 10px 12px rgba(0,0,0,0.26));" />`
          : `<span style="font-size:clamp(40px,12vw,64px);">${ch.emoji}</span>`;
        this.updateOptionHighlights();
      });
      btn.dataset.id = ch.id;
      this.charOptions.appendChild(btn);
    }
    for (const d of this.DIFFICULTIES) {
      const btn = document.createElement("button");
      btn.className = "card";
      btn.innerHTML = `<span class="emoji">${d.emoji}</span><span>${d.label}</span><small>${d.description}</small>`;
      btn.addEventListener("click", () => { this.state.difficulty = d.id; this.updateOptionHighlights(); });
      btn.dataset.id = d.id;
      this.diffOptions.appendChild(btn);
    }
    this.updateOptionHighlights();
  }

  updateOptionHighlights() {
    for (const b of this.charOptions.children) b.classList.toggle("active", b.dataset.id === this.state.character);
    for (const b of this.diffOptions.children) b.classList.toggle("active", b.dataset.id === this.state.difficulty);
  }

  showStartMenu() {
    this.state.mode = "start";
    this.hudEl.style.display = "none";
    document.getElementById("formula-controls").style.display = "none";
    this.gameoverScreen.classList.add("hidden");
    this.startScreen.classList.remove("hidden");
    this.recordLine.textContent = this.state.highScore > 0
      ? `\uD83C\uDFC6 RECORDE: ${this.state.highScore}`
      : "";
  }

  startGame() {
    this.state.mode = "playing";
    this.state.score = 0;
    this.state.laps = 0;
    this.state.raceOver = false;
    this.state.frame = 0;
    this.state.engineTimer = 0;
    this.state.player.progress = 0;
    this.state.player.line = 0;
    this.state.player.speed = 0;
    this.state.player.steerInput = 0;

    const diffMap = { easy: 0.7, medium: 0.85, hard: 1.05 };
    const aiSpeed = diffMap[this.state.difficulty] || 0.85;
    const aiSpeeds = [3.0, 3.5, 4.0, 4.5].map(s => s * aiSpeed);
    const aiStartPositions = [
      this.trackLength * 0.25,
      this.trackLength * 0.5,
      this.trackLength * 0.75,
      this.trackLength * 0.95,
    ];
    this.state.cars = [];
    const aiColors = ["#E67E22", "#3498DB", "#9B59B6", "#2ECC71"];
    for (let i = 0; i < 4; i++) {
      this.state.cars.push({
        progress: aiStartPositions[i],
        line: (Math.random() - 0.5) * 0.6,
        speed: aiSpeeds[i],
        baseSpeed: aiSpeeds[i],
        color: aiColors[i],
        isAI: true,
        laps: 0,
        finished: false,
      });
    }
    this.state.player.laps = 0;

    this.scoreEl = document.getElementById("formula-score");
    this.hudEl.style.display = "flex";
    document.getElementById("formula-controls").style.display = "flex";
    this.startScreen.classList.add("hidden");
    this.gameoverScreen.classList.add("hidden");
    this.audio();
    if (!this.state.muted) this.playMusic();
  }

  gameOver() {
    if (this.state.mode !== "playing") return;
    this.state.mode = "gameover";
    this.stopMusic();
    if (!this.state.muted) this.playFinish();

    const isRecord = this.state.score > this.state.highScore;
    if (isRecord) {
      this.state.highScore = this.state.score;
      localStorage.setItem("dogao_formula_highscore", String(this.state.highScore));
    }

    const won = this.state.position === 1;
    this.resultEmoji.textContent = won ? "\uD83C\uDFC6" : "\uD83D\uDE22";
    this.resultTitle.textContent = won ? "VOCE VENCEU!" : "VOCE PERDEU!";
    this.finalScore.textContent = this.state.score;
    this.bestScore.textContent = this.state.highScore;
    this.newRecord.classList.toggle("hidden", !isRecord);
    this.gameoverScreen.classList.remove("hidden");
    this.hudEl.style.display = "none";
    document.getElementById("formula-controls").style.display = "none";
  }

  destroy() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.stopMusic();
    this.canvas.removeEventListener("pointerdown", this._pd);
    this.canvas.removeEventListener("pointermove", this._pm);
    this.canvas.removeEventListener("pointerup", this._pu);
    this.canvas.removeEventListener("touchstart", this._pd);
    this.canvas.removeEventListener("touchmove", this._pm);
    this.canvas.removeEventListener("touchend", this._pu);
    window.removeEventListener("keydown", this._kd);
    window.removeEventListener("resize", this._resize);
    if (this.playBtn) this.playBtn.removeEventListener("click", this._play);
    if (this.againBtn) this.againBtn.removeEventListener("click", this._again);
    if (this.soundBtn) this.soundBtn.removeEventListener("click", this._soundToggle);
    if (this.leftBtn) this.leftBtn.removeEventListener("pointerdown", this._leftDown);
    if (this.rightBtn) this.rightBtn.removeEventListener("pointerdown", this._rightDown);
    if (this.leftBtn) this.leftBtn.removeEventListener("pointerup", this._steerUp);
    if (this.rightBtn) this.rightBtn.removeEventListener("pointerup", this._steerUp);
    if (this.leftBtn) this.leftBtn.removeEventListener("touchstart", this._leftTouch);
    if (this.rightBtn) this.rightBtn.removeEventListener("touchstart", this._rightTouch);
    if (this.leftBtn) this.leftBtn.removeEventListener("touchend", this._steerUp);
    if (this.rightBtn) this.rightBtn.removeEventListener("touchend", this._steerUp);
    if (this.ui) this.ui.remove();
  }

  // ── Update ──
  updateGame() {
    if (this.state.mode !== "playing") return;
    if (this.state.raceOver) return;
    this.state.frame++;

    const p = this.state.player;
    const dt = 1;
    const accel = 0.05;
    const maxSpeed = 6;
    const friction = 0.99;
    const steerSpeed = 0.04;

    // Steering from buttons / keyboard
    p.line += p.steerInput * steerSpeed * dt;
    const halfRoad = 0.85;
    if (p.line < -halfRoad) p.line = -halfRoad;
    if (p.line > halfRoad) p.line = halfRoad;

    // Speed
    const steerFactor = 1 - Math.abs(p.steerInput) * 0.15;
    p.speed += accel * steerFactor * dt;
    if (p.speed > maxSpeed) p.speed = maxSpeed;
    p.speed *= friction;
    // Curve slowdown
    const playerTP = this.getTrackPoint(p.progress);
    const playerAngleDiff = this.getTrackPoint(p.progress + 5).angle - playerTP.angle;
    const playerNormDiff = Math.atan2(Math.sin(playerAngleDiff), Math.cos(playerAngleDiff));
    const playerCurveFactor = Math.max(0.5, 1 - Math.abs(playerNormDiff) * 0.5);
    p.speed *= (0.96 + 0.04 * playerCurveFactor);

    // Progress along track
    p.progress += p.speed * dt;

    if (p.progress >= this.trackLength) {
      p.laps++;
      p.progress -= this.trackLength;
      if (p.laps >= this.state.maxLaps) {
        this.state.raceOver = true;
      }
    }

    if (this.state.engineTimer <= 0) {
      this.playEngine();
      this.state.engineTimer = 10;
    } else {
      this.state.engineTimer--;
    }

    // ── AI cars ──
    for (const car of this.state.cars) {
      if (car.finished) continue;
      // Speed modulation for curves — slow down in sharp turns
      const tp = this.getTrackPoint(car.progress);
      const angleDiff = this.getTrackPoint(car.progress + 5).angle - tp.angle;
      const normDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      const curveFactor = Math.max(0.4, 1 - Math.abs(normDiff) * 0.8);
      car.speed = car.baseSpeed * curveFactor * (0.97 + Math.random() * 0.06);

      // Steer toward center, avoid walls
      if (car.line > 0.1) car.line -= 0.003;
      else if (car.line < -0.1) car.line += 0.003;

      // Overtaking: nudge away from player if too close
      const playerProg = p.progress + p.laps * this.trackLength;
      const carProg = car.progress + car.laps * this.trackLength;
      const dist = Math.abs(carProg - playerProg);
      if (dist < this.ROAD_WIDTH * 0.5) {
        car.line += car.progress > p.progress ? 0.01 : -0.01;
      }
      if (car.line < -halfRoad) car.line = -halfRoad;
      if (car.line > halfRoad) car.line = halfRoad;

      car.progress += car.speed * dt;

      if (car.progress >= this.trackLength) {
        car.laps++;
        car.progress -= this.trackLength;
        if (car.laps >= this.state.maxLaps) car.finished = true;
      }
    }

    // ── Positions ──
    const totalPlayer = p.progress + p.laps * this.trackLength;
    let pos = 1;
    for (const car of this.state.cars) {
      const totalCar = car.progress + car.laps * this.trackLength;
      if (totalCar > totalPlayer) pos++;
    }
    this.state.position = pos;
    this.posEl.textContent = `P${pos}`;
    this.lapEl.textContent = `V ${Math.min(p.laps + 1, this.state.maxLaps)}/${this.state.maxLaps}`;
    this.speedEl.textContent = `${Math.round(p.speed * 20)} km/h`;

    // Score: points per frame based on speed and position
    this.state.score += Math.round(p.speed * 0.5 + (5 - pos) * 0.5);
    if (this.scoreEl) this.scoreEl.textContent = this.state.score;

    // Overtake check
    const prevPos = this._prevPos || pos;
    if (pos < prevPos) this.playOvertake();
    this._prevPos = pos;

    // Check race end
    if (this.state.raceOver || (pos > 1 && this.state.cars.filter(c => c.finished).length >= 3)) {
      this.gameOver();
    }
  }

  // ── Render ──
  render() {
    const ctx = this.ctx;
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;

    ctx.fillStyle = "#1a5c1a";
    ctx.fillRect(0, 0, W, H);

    if (this.state.mode === "start") return;

    const playerPos = this.getWorldPos(this.state.player.progress, this.state.player.line);
    const cx = playerPos.x;
    const cy = playerPos.y;

    // Draw visible track segments
    const viewDist = Math.max(W, H) * 0.7;
    const segLen = this.trackLength / this.trackPoints.length;

    // Find which track segments are visible
    const pts = this.trackPoints;
    const playerIdx = this.findTrackIndex(this.state.player.progress);
    const rw = this.ROAD_WIDTH;

    // Draw grass around track
    ctx.save();
    ctx.translate(W / 2 - cx, H / 2 - cy);

    // Road surface — draw segments in visible range
    const lookahead = Math.floor(viewDist / segLen) + 20;
    for (let i = -lookahead; i <= lookahead; i++) {
      const idx = (playerIdx + i + pts.length) % pts.length;
      const nextIdx = (idx + 1) % pts.length;
      const a = pts[idx], b = pts[nextIdx];

      // Skip if behind player (for efficiency — still check visibility)
      const ax = a.x - cx, ay = a.y - cy;
      const bx = b.x - cx, by = b.y - cy;
      const midX = (a.x + b.x) / 2 - cx;
      const midY = (a.y + b.y) / 2 - cy;
      if (midX < -viewDist || midX > viewDist || midY < -viewDist || midY > viewDist) continue;

      // Road quad
      ctx.beginPath();
      ctx.moveTo(a.lx, a.ly);
      ctx.lineTo(b.lx, b.ly);
      ctx.lineTo(b.rx, b.ry);
      ctx.lineTo(a.rx, a.ry);
      ctx.closePath();
      ctx.fillStyle = "#444";
      ctx.fill();

      // Curb (outer edge)
      const stripeW = rw * 0.03;
      // Left curb
      ctx.beginPath();
      ctx.moveTo(a.lx, a.ly);
      ctx.lineTo(b.lx, b.ly);
      ctx.strokeStyle = (Math.floor(i / 3) % 2 === 0) ? "#E74C3C" : "white";
      ctx.lineWidth = stripeW * 2;
      ctx.stroke();

      // Right curb
      ctx.beginPath();
      ctx.moveTo(a.rx, a.ry);
      ctx.lineTo(b.rx, b.ry);
      ctx.strokeStyle = (Math.floor(i / 3) % 2 === 0) ? "#E74C3C" : "white";
      ctx.stroke();

      // Center line (dashed)
      if (i % 6 < 3) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = rw * 0.015;
        ctx.stroke();
      }
    }

    // ── Start/finish line ──
    const sfIdx = this.findTrackIndex(0);
    const sfA = pts[sfIdx], sfB = pts[(sfIdx + 1) % pts.length];
    const sfDX = sfB.x - sfA.x, sfDY = sfB.y - sfA.y;
    const sfLen = Math.sqrt(sfDX * sfDX + sfDY * sfDY);
    if (sfLen > 0) {
      for (let j = 0; j < 8; j++) {
        const t1 = j / 8, t2 = (j + 1) / 8;
        const x1 = sfA.lx + (sfA.rx - sfA.lx) * t1;
        const y1 = sfA.ly + (sfA.ry - sfA.ly) * t1;
        const x2 = sfA.lx + (sfA.rx - sfA.lx) * t2;
        const y2 = sfA.ly + (sfA.ry - sfA.ly) * t2;
        const midX1 = (sfA.x + sfB.x) / 2;
        const midY1 = (sfA.y + sfB.y) / 2;
        const cx1 = midX1 + (x1 - midX1) * 0.3;
        const cy1 = midY1 + (y1 - midY1) * 0.3;
        const cx2 = midX1 + (x2 - midX1) * 0.3;
        const cy2 = midY1 + (y2 - midY1) * 0.3;
        ctx.fillStyle = (Math.floor(j / 1) % 2 === 0) ? "white" : "#222";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(cx2, cy2);
        ctx.lineTo(cx1, cy1);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ── Draw AI cars ──
    for (const car of this.state.cars) {
      if (car.finished) continue;
      const pos = this.getWorldPos(car.progress, car.line);
      const dx = pos.x - cx, dy = pos.y - cy;
      const screenDist = Math.sqrt(dx * dx + dy * dy);
      if (screenDist < viewDist) {
        this.drawF1Car(ctx, pos.x, pos.y, pos.angle, car.color, null);
      }
    }

    // ── Draw player car ──
    this.drawF1Car(ctx, playerPos.x, playerPos.y, playerPos.angle, "#E74C3C", this.state.character);

    ctx.restore();

    // ── Minimap ──
    this.drawMinimap(ctx, W, H);
  }

  findTrackIndex(progress) {
    const pts = this.trackPoints;
    let p = progress % this.trackLength;
    if (p < 0) p += this.trackLength;
    let lo = 0, hi = pts.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].dist <= p) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  drawF1Car(ctx, x, y, angle, color, character) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const s = 1;
    const l = 18 * s;
    const w = 7 * s;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(2, 2, l * 0.55, w * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rear wing
    ctx.fillStyle = color;
    ctx.fillRect(-l * 0.5, -w * 0.85, l * 0.15, w * 1.7);

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(l * 0.45, 0);
    ctx.quadraticCurveTo(l * 0.4, -w * 0.5, l * 0.1, -w * 0.55);
    ctx.lineTo(-l * 0.35, -w * 0.55);
    ctx.quadraticCurveTo(-l * 0.5, -w * 0.5, -l * 0.5, -w * 0.3);
    ctx.lineTo(-l * 0.5, w * 0.3);
    ctx.quadraticCurveTo(-l * 0.5, w * 0.5, -l * 0.35, w * 0.55);
    ctx.lineTo(l * 0.1, w * 0.55);
    ctx.quadraticCurveTo(l * 0.4, w * 0.5, l * 0.45, 0);
    ctx.closePath();
    ctx.fill();

    // Nose cone
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(l * 0.45, -w * 0.2);
    ctx.lineTo(l * 0.8, -w * 0.08);
    ctx.lineTo(l * 0.8, w * 0.08);
    ctx.lineTo(l * 0.45, w * 0.2);
    ctx.closePath();
    ctx.fill();

    // Front wing
    ctx.fillStyle = color;
    ctx.fillRect(l * 0.55, -w * 0.9, l * 0.12, w * 0.25);
    ctx.fillRect(l * 0.55, w * 0.65, l * 0.12, w * 0.25);

    // Cockpit / driver
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.ellipse(l * 0.05, 0, w * 0.25, w * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Driver character
    if (character) {
      const charData = this.CHARACTERS.find(c => c.id === character);
      if (charData) {
        ctx.save();
        ctx.translate(l * 0.05, 0);
        ctx.scale(0.5, 0.5);
        ctx.font = "16px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.fillText(charData.emoji, 0, 0);
        ctx.restore();
      }
    }

    // Wheels
    ctx.fillStyle = "#111";
    const wheelR = w * 0.25;
    // Rear left
    ctx.beginPath(); ctx.arc(-l * 0.35, -w * 0.55, wheelR, 0, Math.PI * 2); ctx.fill();
    // Rear right
    ctx.beginPath(); ctx.arc(-l * 0.35, w * 0.55, wheelR, 0, Math.PI * 2); ctx.fill();
    // Front left
    ctx.beginPath(); ctx.arc(l * 0.25, -w * 0.55, wheelR * 0.85, 0, Math.PI * 2); ctx.fill();
    // Front right
    ctx.beginPath(); ctx.arc(l * 0.25, w * 0.55, wheelR * 0.85, 0, Math.PI * 2); ctx.fill();

    // Tire highlights
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    for (const [wx, wy] of [[-l * 0.35, -w * 0.55], [-l * 0.35, w * 0.55], [l * 0.25, -w * 0.55], [l * 0.25, w * 0.55]]) {
      ctx.beginPath(); ctx.arc(wx, wy, wheelR, -Math.PI * 0.8, Math.PI * 0.3); ctx.stroke();
    }

    // Halo
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(l * 0.05, -w * 0.15, w * 0.3, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    ctx.restore();
  }

  drawMinimap(ctx, W, H) {
    const mmSize = 100;
    const mmX = W - mmSize - 10;
    const mmY = H - mmSize - 10;
    const mmPad = 4;
    const mmDrawSize = mmSize - mmPad * 2;

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.moveTo(mmX + 8, mmY);
    ctx.lineTo(mmX + mmSize - 8, mmY);
    ctx.quadraticCurveTo(mmX + mmSize, mmY, mmX + mmSize, mmY + 8);
    ctx.lineTo(mmX + mmSize, mmY + mmSize - 8);
    ctx.quadraticCurveTo(mmX + mmSize, mmY + mmSize, mmX + mmSize - 8, mmY + mmSize);
    ctx.lineTo(mmX + 8, mmY + mmSize);
    ctx.quadraticCurveTo(mmX, mmY + mmSize, mmX, mmY + mmSize - 8);
    ctx.lineTo(mmX, mmY + 8);
    ctx.quadraticCurveTo(mmX, mmY, mmX + 8, mmY);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Find bounds of track
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of this.trackPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(mmDrawSize / rangeX, mmDrawSize / rangeY);
    const ox = mmX + mmPad + (mmDrawSize - rangeX * scale) / 2;
    const oy = mmY + mmPad + (mmDrawSize - rangeY * scale) / 2;

    // Draw track outline on minimap
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < this.trackPoints.length; i++) {
      const p = this.trackPoints[i];
      const px = ox + (p.x - minX) * scale;
      const py = oy + (p.y - minY) * scale;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Player dot
    const pp = this.getWorldPos(this.state.player.progress, 0);
    const ppx = ox + (pp.x - minX) * scale;
    const ppy = oy + (pp.y - minY) * scale;
    ctx.fillStyle = "#E74C3C";
    ctx.beginPath();
    ctx.arc(ppx, ppy, 3, 0, Math.PI * 2);
    ctx.fill();

    // AI dots
    for (const car of this.state.cars) {
      if (car.finished) continue;
      const cp = this.getWorldPos(car.progress, 0);
      const cpx = ox + (cp.x - minX) * scale;
      const cpy = oy + (cp.y - minY) * scale;
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.arc(cpx, cpy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Event binding ──
  bindEvents() {
    this._pd = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      this._touchX = touch.clientX;
      this._touchY = touch.clientY;
      if (this.state.mode === "start") { this.startGame(); return; }
      if (this.state.mode === "gameover") return;
      // Determine steer direction from touch position relative to canvas center
      const cx = rect.left + rect.width / 2;
      this.state.player.steerInput = touch.clientX < cx ? -1 : (touch.clientX > cx ? 1 : 0);
    };
    this._pm = (e) => {
      e.preventDefault();
      if (this.state.mode !== "playing") return;
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      const cx = rect.left + rect.width / 2;
      this.state.player.steerInput = touch.clientX < cx ? -1 : (touch.clientX > cx ? 1 : 0);
    };
    this._pu = (e) => {
      e.preventDefault();
      this.state.player.steerInput = 0;
    };
    this._kd = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (this.state.mode === "start") this.startGame();
        else if (this.state.mode === "gameover") this.startGame();
      }
      if (this.state.mode === "playing") {
        if (e.code === "ArrowLeft") { e.preventDefault(); this.state.player.steerInput = -1; }
        if (e.code === "ArrowRight") { e.preventDefault(); this.state.player.steerInput = 1; }
      }
    };
    this._keyUp = (e) => {
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        this.state.player.steerInput = 0;
      }
    };

    this._play = (e) => { e.stopPropagation(); this.startGame(); };
    this._again = (e) => { e.stopPropagation(); this.startGame(); };
    this._resize = () => this.setupCanvas();
    this._soundToggle = (e) => this.toggleSound(e);

    this._leftDown = () => { this.state.player.steerInput = -1; };
    this._rightDown = () => { this.state.player.steerInput = 1; };
    this._steerUp = () => { this.state.player.steerInput = 0; };
    this._leftTouch = (e) => { e.preventDefault(); this.state.player.steerInput = -1; };
    this._rightTouch = (e) => { e.preventDefault(); this.state.player.steerInput = 1; };

    this.canvas.addEventListener("pointerdown", this._pd);
    this.canvas.addEventListener("pointermove", this._pm);
    this.canvas.addEventListener("pointerup", this._pu);
    this.canvas.addEventListener("touchstart", this._pd, { passive: false });
    this.canvas.addEventListener("touchmove", this._pm, { passive: false });
    this.canvas.addEventListener("touchend", this._pu, { passive: false });
    window.addEventListener("keydown", this._kd);
    window.addEventListener("keyup", this._keyUp);
    window.addEventListener("resize", this._resize);
    if (this.playBtn) this.playBtn.addEventListener("click", this._play);
    if (this.againBtn) this.againBtn.addEventListener("click", this._again);
    if (this.soundBtn) this.soundBtn.addEventListener("click", this._soundToggle);
    if (this.leftBtn) this.leftBtn.addEventListener("pointerdown", this._leftDown);
    if (this.rightBtn) this.rightBtn.addEventListener("pointerdown", this._rightDown);
    if (this.leftBtn) this.leftBtn.addEventListener("pointerup", this._steerUp);
    if (this.rightBtn) this.rightBtn.addEventListener("pointerup", this._steerUp);
    if (this.leftBtn) this.leftBtn.addEventListener("touchstart", this._leftTouch, { passive: false });
    if (this.rightBtn) this.rightBtn.addEventListener("touchstart", this._rightTouch, { passive: false });
    if (this.leftBtn) this.leftBtn.addEventListener("touchend", this._steerUp);
    if (this.rightBtn) this.rightBtn.addEventListener("touchend", this._steerUp);
  }

  // ── Loop ──
  loop() {
    const now = performance.now();
    const e = now - (this._last || now);
    this._last = now;
    const steps = Math.max(1, Math.min(3, Math.round(e / 16.67)));
    for (let i = 0; i < steps; i++) this.updateGame();
    this.render();
    if (this.running) this.animId = requestAnimationFrame(() => this.loop());
  }
}
