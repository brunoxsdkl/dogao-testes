class Formula3DGame {
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

    // ── Track setup ──
    this.SEGMENT_LENGTH = 200;
    this.VISIBLE = 250;
    this.ROAD_W = 2000;
    this.TOTAL_SEGMENTS = 3000;
    this.FOV_DEPTH = 0.8;
    this.CAMERA_HEIGHT = 1000;
    this.maxSpeed = 8;
    this._lastWorldX = 0;
    this.segments = [];
    this.generateTrack();

    this.setupCanvas();
    this.init();
  }

  generateTrack() {
    this.segments = [];
    // Build road profile: straight → curve → straight → curve ...
    const profile = [];
    const total = this.TOTAL_SEGMENTS;
    let remaining = total;
    while (remaining > 0) {
      const straight = 100 + Math.floor(Math.random() * 200);
      const cLen = Math.min(straight, remaining);
      profile.push({ type: "straight", len: cLen, curve: 0 });
      remaining -= cLen;
      if (remaining <= 0) break;
      const dir = Math.random() > 0.5 ? 1 : -1;
      const curveLen = 60 + Math.floor(Math.random() * 120);
      const cLen2 = Math.min(curveLen, remaining);
      profile.push({ type: "curve", len: cLen2, curve: dir * (0.3 + Math.random() * 0.5) });
      remaining -= cLen2;
    }

    // Build segments from profile
    let totalCurve = 0;
    let totalHill = 0;
    for (const p of profile) {
      for (let i = 0; i < p.len; i++) {
        totalCurve += p.curve;
        totalHill += Math.sin(this.segments.length * 0.04) * 1.5;
        this.segments.push({
          curve: p.curve,
          worldX: totalCurve,
          worldY: totalHill,
          color: { road: "#555", grass: "#1a5c1a", rumble: i % 2 === 0 ? "#E74C3C" : "#fff" },
        });
      }
    }
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
    this.tone("sawtooth", 90 + Math.random() * 20, now, 0.05, 0.03);
  }

  playOvertake() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("square", 660, now, 0.06, 0.06);
    this.tone("square", 880, now + 0.05, 0.06, 0.05);
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
    const notes = [330, 370, 392, 330, 262, 294, 330, 392, 440, 392, 330, 294, 262];
    let i = 0;
    this._musicTimer = setInterval(() => {
      const actx = this.audio();
      if (!actx || this.state.mode !== "playing") return;
      const note = notes[i % notes.length];
      if (note) this.tone("square", note, actx.currentTime, 0.1, 0.02);
      i++;
    }, 180);
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
    this.state = {
      mode: "start",
      score: 0,
      highScore: Number(localStorage.getItem("dogao_formula3d_highscore") || 0),
      character: "hotdog",
      difficulty: "medium",
      muted: false,
      frame: 0,
      laps: 0,
      maxLaps: 3,
      raceOver: false,
      position: 1,
      player: { segment: 0, x: 0, speed: 0, steer: 0, percent: 0 },
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
    this.ui.id = "formula3d-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;z-index:5;overflow:hidden;pointer-events:none;";
    this.ui.innerHTML = `
      <div id="f3d-hud" style="position:absolute;top:max(4px,env(safe-area-inset-top));left:0;right:0;display:none;justify-content:space-between;padding:0 10px;pointer-events:none;font-family:'Press Start 2P',monospace;font-size:7px;color:white;text-shadow:0 2px 4px rgba(0,0,0,0.5);z-index:6;">
        <span><span id="f3d-pos">P1</span></span>
        <span><span id="f3d-lap">V 1/3</span></span>
        <span>\uD83C\uDFC6 <span id="f3d-score">0</span></span>
        <span><span id="f3d-speed">0 km/h</span></span>
      </div>
      <button class="sound-button" id="f3d-soundBtn" type="button" aria-label="Silenciar som" style="top:max(4px,env(safe-area-inset-top));right:4px;width:36px;height:36px;font-size:16px;">\uD83D\uDD0A</button>
      <div id="f3d-controls" style="position:absolute;bottom:max(12px,env(safe-area-inset-bottom));left:0;right:0;display:none;justify-content:space-between;padding:0 20px;z-index:10;pointer-events:none;">
        <button id="f3d-leftBtn" type="button" style="width:72px;height:72px;border-radius:50%;background:rgba(255,215,0,0.2);border:3px solid rgba(255,215,0,0.35);color:white;font-size:28px;display:grid;place-items:center;pointer-events:auto;touch-action:none;">\u25C0</button>
        <div style="width:72px;"></div>
        <button id="f3d-rightBtn" type="button" style="width:72px;height:72px;border-radius:50%;background:rgba(255,215,0,0.2);border:3px solid rgba(255,215,0,0.35);color:white;font-size:28px;display:grid;place-items:center;pointer-events:auto;touch-action:none;">\u25B6</button>
      </div>
      <section class="screen start-screen hidden" id="f3d-startScreen">
        <img class="brand-logo" src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
        <div>
          <h1 style="color:#E74C3C;font-size:clamp(24px,8vw,42px);text-shadow:0 0 20px rgba(231,76,60,0.3);">Formula Dogao 3D</h1>
          <h2 style="color:white;font-size:clamp(16px,4vw,24px);">Corrida em 3a pessoa!</h2>
        </div>
        <div class="hero-character" id="f3d-hero" style="font-size:clamp(36px,10vw,56px);margin:4px 0;animation:bob 1.2s ease-in-out infinite;">\uD83C\uDFCE\uFE0F</div>
        <p class="record" id="f3d-recordLine" style="min-height:16px;margin:0 0 4px;">\uD83C\uDFC6 RECORDE: ${this.state.highScore}</p>
        <p style="font-family:'Press Start 2P',monospace;font-size:5px;color:rgba(255,255,255,0.5);max-width:280px;line-height:1.4;margin:0 0 6px;">TOQUE ESQUERDA/DIREITA PARA DIRECIONAR<br/>ULTrapasse TODOS PARA VENCER!</p>
        <div class="chooser"><p>PERSONAGEM</p><div class="card-row" id="f3d-charOptions"></div></div>
        <div class="chooser"><p>DIFICULDADE</p><div class="card-row" id="f3d-diffOptions"></div></div>
        <button class="play-button" id="f3d-playBtn" type="button">CORRER!</button>
      </section>
      <section class="screen gameover-screen hidden" id="f3d-gameoverScreen">
        <div class="gameover-card">
          <img src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
          <div style="font-size:48px;line-height:1;" id="f3d-resultEmoji">\uD83C\uDFC6</div>
          <h2 style="margin:4px 0 8px;font-size:clamp(24px,7vw,36px);line-height:1;" id="f3d-resultTitle">VOCE VENCEU!</h2>
          <p class="new-record hidden" id="f3d-newRecord">\u2605 NOVO RECORDE! \u2605</p>
          <div class="result-grid">
            <div><span>PONTOS</span><strong id="f3d-finalScore">0</strong></div>
            <div><span>RECORDE</span><strong id="f3d-bestScore">0</strong></div>
          </div>
          <button class="play-button" id="f3d-againBtn" type="button">CORRER NOVAMENTE</button>
          <p class="card-footer">O MEGA DOGAO - DESDE 2000</p>
        </div>
      </section>
    `;
    c.appendChild(this.ui);

    this.hudEl = document.getElementById("f3d-hud");
    this.posEl = document.getElementById("f3d-pos");
    this.lapEl = document.getElementById("f3d-lap");
    this.scoreEl = document.getElementById("f3d-score");
    this.speedEl = document.getElementById("f3d-speed");
    this.soundBtn = document.getElementById("f3d-soundBtn");
    this.leftBtn = document.getElementById("f3d-leftBtn");
    this.rightBtn = document.getElementById("f3d-rightBtn");
    this.startScreen = document.getElementById("f3d-startScreen");
    this.gameoverScreen = document.getElementById("f3d-gameoverScreen");
    this.charOptions = document.getElementById("f3d-charOptions");
    this.diffOptions = document.getElementById("f3d-diffOptions");
    this.heroEl = document.getElementById("f3d-hero");
    this.recordLine = document.getElementById("f3d-recordLine");
    this.playBtn = document.getElementById("f3d-playBtn");
    this.againBtn = document.getElementById("f3d-againBtn");
    this.finalScore = document.getElementById("f3d-finalScore");
    this.bestScore = document.getElementById("f3d-bestScore");
    this.newRecord = document.getElementById("f3d-newRecord");
    this.resultEmoji = document.getElementById("f3d-resultEmoji");
    this.resultTitle = document.getElementById("f3d-resultTitle");

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
          : `<span style="font-size:clamp(36px,10vw,56px);">${ch.emoji}</span>`;
        this.updateHighlights();
      });
      btn.dataset.id = ch.id;
      this.charOptions.appendChild(btn);
    }
    for (const d of this.DIFFICULTIES) {
      const btn = document.createElement("button");
      btn.className = "card";
      btn.innerHTML = `<span class="emoji">${d.emoji}</span><span>${d.label}</span><small>${d.description}</small>`;
      btn.addEventListener("click", () => { this.state.difficulty = d.id; this.updateHighlights(); });
      btn.dataset.id = d.id;
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
    this.hudEl.style.display = "none";
    document.getElementById("f3d-controls").style.display = "none";
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
    this.state.player.segment = 0;
    this.state.player.x = 0;
    this.state.player.speed = 0;
    this.state.player.steer = 0;
    this.state.player.percent = 0;

    const diffMap = { easy: 3.5, medium: 4.5, hard: 5.5 };
    const baseAI = diffMap[this.state.difficulty] || 4.5;
    const aiSpeeds = [baseAI * 0.85, baseAI * 0.92, baseAI * 1.0, baseAI * 1.08];
    const offsets = [200, 450, 700, 1000];
    const aiColors = ["#E67E22", "#3498DB", "#9B59B6", "#2ECC71"];
    this.state.cars = [];
    for (let i = 0; i < 4; i++) {
      this.state.cars.push({
        segment: offsets[i],
        x: (Math.random() - 0.5) * 0.6,
        speed: aiSpeeds[i],
        baseSpeed: aiSpeeds[i],
        color: aiColors[i],
        isAI: true,
        laps: 0,
        finished: false,
      });
    }
    this.state.player.laps = 0;

    this.hudEl.style.display = "flex";
    document.getElementById("f3d-controls").style.display = "flex";
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
      localStorage.setItem("dogao_formula3d_highscore", String(this.state.highScore));
    }
    const won = this.state.position === 1;
    this.resultEmoji.textContent = won ? "\uD83C\uDFC6" : "\uD83D\uDE22";
    this.resultTitle.textContent = won ? "VOCE VENCEU!" : "VOCE PERDEU!";
    this.finalScore.textContent = this.state.score;
    this.bestScore.textContent = this.state.highScore;
    this.newRecord.classList.toggle("hidden", !isRecord);
    this.gameoverScreen.classList.remove("hidden");
    this.hudEl.style.display = "none";
    document.getElementById("f3d-controls").style.display = "none";
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
    window.removeEventListener("keyup", this._keyUp);
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
    if (this.ui) this.ui.remove();
  }

  // ── Update ──
  updateGame() {
    if (this.state.mode !== "playing") return;
    if (this.state.raceOver) return;
    this.state.frame++;
    const p = this.state.player;

    // Steering
    const steerSpeed = 0.04;
    const maxX = 1.2;
    p.x += p.steer * steerSpeed;
    if (p.x < -maxX) p.x = -maxX;
    if (p.x > maxX) p.x = maxX;

    // Curve push
    const seg = this.segments[p.segment % this.segments.length];
    p.x += seg.curve * 0.15;

    // Speed
    const accel = 0.06;
    const maxSpeed = 8;
    const friction = 0.985;
    const steerDrag = 1 - Math.abs(p.steer) * 0.2;
    p.speed += accel * steerDrag;
    if (p.speed > maxSpeed) p.speed = maxSpeed;
    p.speed *= friction;

    // Curve slowdown
    const curveFactor = Math.max(0.3, 1 - Math.abs(seg.curve) * 1.2);
    p.speed *= (0.97 + 0.03 * curveFactor);

    // Advance
    p.segment += p.speed * 0.3;
    if (p.segment >= this.TOTAL_SEGMENTS) {
      p.laps++;
      p.segment -= this.TOTAL_SEGMENTS;
      if (p.laps >= this.state.maxLaps) this.state.raceOver = true;
    }

    // Engine sound
    if (this.state.engineTimer <= 0) {
      this.playEngine();
      this.state.engineTimer = 8;
    } else {
      this.state.engineTimer--;
    }

    // ── AI ──
    for (const car of this.state.cars) {
      if (car.finished) continue;
      const cSeg = this.segments[car.segment % this.segments.length];
      const cCurveFactor = Math.max(0.3, 1 - Math.abs(cSeg.curve) * 1.2);
      car.speed = car.baseSpeed * cCurveFactor * (0.97 + Math.random() * 0.06);

      // Steer toward center
      if (car.x > 0.1) car.x -= 0.005;
      else if (car.x < -0.1) car.x += 0.005;
      car.x += cSeg.curve * 0.1;

      // Overtaking nudge
      const pTotal = p.segment + p.laps * this.TOTAL_SEGMENTS;
      const cTotal = car.segment + car.laps * this.TOTAL_SEGMENTS;
      const dist = Math.abs(cTotal - pTotal);
      if (dist < 80) {
        car.x += car.segment > p.segment ? 0.02 : -0.02;
      }

      // Clamp x
      if (car.x < -maxX) car.x = -maxX;
      if (car.x > maxX) car.x = maxX;

      car.segment += car.speed * 0.3;
      if (car.segment >= this.TOTAL_SEGMENTS) {
        car.laps++;
        car.segment -= this.TOTAL_SEGMENTS;
        if (car.laps >= this.state.maxLaps) car.finished = true;
      }
    }

    // ── Positions ──
    const totalP = p.segment + p.laps * this.TOTAL_SEGMENTS;
    let pos = 1;
    for (const car of this.state.cars) {
      const totalC = car.segment + car.laps * this.TOTAL_SEGMENTS;
      if (totalC > totalP) pos++;
    }
    this.state.position = pos;
    this.posEl.textContent = `P${pos}`;
    this.lapEl.textContent = `V ${Math.min(p.laps + 1, this.state.maxLaps)}/${this.state.maxLaps}`;
    this.speedEl.textContent = `${Math.round(p.speed * 14)} km/h`;
    this.state.score += Math.round(p.speed * 0.8 + (5 - pos) * 0.5);
    if (this.scoreEl) this.scoreEl.textContent = this.state.score;

    // Overtake sound
    const prev = this._prevPos || pos;
    if (pos < prev) this.playOvertake();
    this._prevPos = pos;

    // Game over check
    if (this.state.raceOver || (pos > 1 && this.state.cars.filter(c => c.finished).length >= 3)) {
      this.gameOver();
    }
  }

  // ── Render ──
  render() {
    const ctx = this.ctx;
    const W = this.canvas.width / this.dpr;
    const H = this.canvas.height / this.dpr;
    const cX = W / 2;
    const horizon = Math.floor(H * 0.44);

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon + 20);
    skyGrad.addColorStop(0, "#0d0d2b");
    skyGrad.addColorStop(0.4, "#e8734a");
    skyGrad.addColorStop(1, "#f0c878");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, horizon + 20);

    if (this.state.mode === "start") return;

    const p = this.state.player;
    const baseSeg = Math.floor(p.segment);
    const segs = this.segments;
    const nsegs = segs.length;
    const persp = 0.0025;
    const roadWMult = 0.07;

    // Compute projected segment data from far to near
    const proj = [];
    let cumX = 0;
    for (let n = 0; n <= this.VISIBLE; n++) {
      const idx = (baseSeg + n) % nsegs;
      const s = segs[idx];
      if (n > 0) cumX += s.curve;
      const z = n * this.SEGMENT_LENGTH;
      const scale = 1 / (1 + z * persp);
      const dx = (cumX - p.x * 25) * scale * roadWMult;
      const sy = horizon + (H - horizon) * scale;
      const sw = this.ROAD_W * scale * roadWMult;
      proj[n] = { x: cX + dx, y: sy, w: sw, scale, idx, s };
    }

    // Draw from far to near
    for (let n = this.VISIBLE; n >= 1; n--) {
      const cur = proj[n];
      const prev = proj[n - 1];
      if (!cur || !prev) continue;

      const x1 = cur.x, y1 = cur.y, w1 = cur.w;
      const x2 = prev.x, y2 = prev.y, w2 = prev.w;

      // Grass
      ctx.fillStyle = (Math.floor(n / 5) % 2 === 0) ? "#1a5c1a" : "#176017";
      ctx.beginPath();
      ctx.moveTo(x1 - w1 - 3000, y1);
      ctx.lineTo(x2 - w2 - 3000, y2);
      ctx.lineTo(x2 + w2 + 3000, y2);
      ctx.lineTo(x1 + w1 + 3000, y1);
      ctx.fill();

      // Road
      const roadShade = Math.floor(n / 3) % 2 === 0 ? "#555" : "#4d4d4d";
      ctx.fillStyle = roadShade;
      ctx.beginPath();
      ctx.moveTo(x1 - w1, y1);
      ctx.lineTo(x2 - w2, y2);
      ctx.lineTo(x2 + w2, y2);
      ctx.lineTo(x1 + w1, y1);
      ctx.fill();

      // Rumble strips
      const rc = Math.floor(n / 2) % 2 === 0 ? "#E74C3C" : "#fff";
      ctx.strokeStyle = rc;
      ctx.lineWidth = Math.max(1.5, 4 * cur.scale);
      ctx.beginPath();
      ctx.moveTo(x1 - w1, y1);
      ctx.lineTo(x2 - w2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1 + w1, y1);
      ctx.lineTo(x2 + w2, y2);
      ctx.stroke();

      // Center line
      if (n % 6 < 3) {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = Math.max(1, 2.5 * cur.scale);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // ── AI cars ──
    for (const car of this.state.cars) {
      if (car.finished) continue;
      const cSeg = Math.floor(car.segment);
      let dn = cSeg - baseSeg;
      if (dn < 0) dn += nsegs;
      if (dn <= 0 || dn > this.VISIBLE - 3) continue;
      const pt = proj[dn];
      if (!pt || pt.scale < 0.015 || pt.y < horizon - 5) continue;

      const dxCar = (car.x - p.x) * 25 * pt.scale * roadWMult;
      const sx = cX + dxCar;
      const sy = pt.y - 12 * pt.scale;
      const sc = pt.scale;

      const cw = 28 * sc;
      const ch = 44 * sc;
      ctx.save();
      ctx.translate(sx, sy);

      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.ellipse(1, 2, cw * 0.5, ch * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.moveTo(cw * 0.45, -ch * 0.5);
      ctx.lineTo(cw * 0.5, -ch * 0.05);
      ctx.lineTo(cw * 0.45, ch * 0.5);
      ctx.lineTo(-cw * 0.45, ch * 0.5);
      ctx.lineTo(-cw * 0.5, -ch * 0.05);
      ctx.lineTo(-cw * 0.45, -ch * 0.5);
      ctx.fill();

      ctx.fillStyle = car.color;
      ctx.fillRect(-cw * 0.48, -ch * 0.55, cw * 0.96, ch * 0.08);

      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.ellipse(0, ch * 0.05, cw * 0.17, ch * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111";
      const wr = cw * 0.11;
      ctx.beginPath(); ctx.arc(-cw * 0.38, -ch * 0.38, wr, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cw * 0.38, -ch * 0.38, wr, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-cw * 0.38, ch * 0.38, wr, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cw * 0.38, ch * 0.38, wr, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    // ── Player car (third person view from behind) ──
    const pY = H - 120;
    const pS = 1.5;
    ctx.save();

    // Ground shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(cX + 3, pY + 5, 34 * pS, 16 * pS, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(cX, pY);

    // Rear wing
    ctx.fillStyle = "#E74C3C";
    ctx.fillRect(-36 * pS, -46 * pS, 72 * pS, 10 * pS);

    // Body
    ctx.fillStyle = "#E74C3C";
    ctx.beginPath();
    ctx.moveTo(28 * pS, -40 * pS);
    ctx.quadraticCurveTo(30 * pS, -8 * pS, 26 * pS, 28 * pS);
    ctx.lineTo(-26 * pS, 28 * pS);
    ctx.quadraticCurveTo(-30 * pS, -8 * pS, -28 * pS, -40 * pS);
    ctx.fill();

    // Engine cover detail
    ctx.fillStyle = "#C0392B";
    ctx.fillRect(-9 * pS, -35 * pS, 18 * pS, 7 * pS);

    // Halo
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -6 * pS, 20 * pS, Math.PI * 0.12, Math.PI * 0.88);
    ctx.stroke();

    // Driver helmet (character)
    const char = this.CHARACTERS.find(c => c.id === this.state.character);
    if (char) {
      ctx.save();
      ctx.translate(0, -8 * pS);
      ctx.font = `${26 * pS}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(char.emoji, 0, 0);
      ctx.restore();
    }

    // Rear wheels
    ctx.fillStyle = "#111";
    const wr2 = 7.5 * pS;
    ctx.beginPath(); ctx.arc(-24 * pS, 24 * pS, wr2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(24 * pS, 24 * pS, wr2, 0, Math.PI * 2); ctx.fill();

    // Front wheels (partially visible behind)
    ctx.beginPath(); ctx.arc(-20 * pS, -30 * pS, wr2 * 0.75, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(20 * pS, -30 * pS, wr2 * 0.75, 0, Math.PI * 2); ctx.fill();

    // Exhaust pipe
    ctx.fillStyle = "#777";
    ctx.fillRect(-3 * pS, 28 * pS, 6 * pS, 5 * pS);

    ctx.restore();

    // ── Speed lines ──
    if (p.speed > 3.5) {
      const intensity = Math.min(1, (p.speed - 3.5) / 4);
      ctx.strokeStyle = `rgba(255,255,255,${intensity * 0.06})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        const lx = Math.random() * W;
        const ly = H * 0.25 + Math.random() * H * 0.4;
        const len = 20 + Math.random() * 80;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + (cX - lx) * 0.005, ly - len);
        ctx.stroke();
      }
    }

    // ── Tachometer ──
    const rpm = Math.min(1, p.speed / this.maxSpeed);
    const arcX = 38, arcY = H - 38, arcR = 28;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(arcX, arcY, arcR, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();
    ctx.strokeStyle = rpm > 0.8 ? "#E74C3C" : "#facc15";
    ctx.beginPath();
    ctx.arc(arcX, arcY, arcR, Math.PI * 0.75, Math.PI * 0.75 + rpm * Math.PI * 1.5);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "5px 'Press Start 2P',monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(rpm * 100)}%`, arcX, arcY + 3);
  }

  // ── Events ──
  bindEvents() {
    this._pd = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      if (this.state.mode === "start") { this.startGame(); return; }
      if (this.state.mode === "gameover") return;
      const cx = rect.left + rect.width / 2;
      this.state.player.steer = touch.clientX < cx ? -1 : (touch.clientX > cx ? 1 : 0);
    };
    this._pm = (e) => {
      if (this.state.mode !== "playing") return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      const cx = rect.left + rect.width / 2;
      this.state.player.steer = touch.clientX < cx ? -1 : (touch.clientX > cx ? 1 : 0);
    };
    this._pu = (e) => { e.preventDefault(); this.state.player.steer = 0; };
    this._kd = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (this.state.mode === "start") this.startGame();
        else if (this.state.mode === "gameover") this.startGame();
      }
      if (this.state.mode === "playing") {
        if (e.code === "ArrowLeft") { e.preventDefault(); this.state.player.steer = -1; }
        if (e.code === "ArrowRight") { e.preventDefault(); this.state.player.steer = 1; }
      }
    };
    this._keyUp = (e) => {
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") this.state.player.steer = 0;
    };
    this._play = (e) => { e.stopPropagation(); this.startGame(); };
    this._again = (e) => { e.stopPropagation(); this.startGame(); };
    this._resize = () => this.setupCanvas();
    this._soundToggle = (e) => this.toggleSound(e);
    this._leftDown = () => { this.state.player.steer = -1; };
    this._rightDown = () => { this.state.player.steer = 1; };
    this._steerUp = () => { this.state.player.steer = 0; };
    this._leftTouch = (e) => { e.preventDefault(); this.state.player.steer = -1; };
    this._rightTouch = (e) => { e.preventDefault(); this.state.player.steer = 1; };

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
