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
    this.TRACKS = [
      { id: "interlagos", label: "Interlagos", emoji: "\uD83C\uDFC1", description: "Curvas tecnicas" },
      { id: "monza", label: "Monza", emoji: "\uD83C\uDFCE\uFE0F", description: "Retas rapidas" },
      { id: "mônaco", label: "Monaco", emoji: "\uD83C\uDF0A", description: "Ruas estreitas" },
    ];

    this.dogImage = new Image();
    this.dogImage.src = "assets/dog-character-y2uiqon.png";
    this._audioCtx = null;
    this._musicTimer = null;

    this.SEGMENT_LENGTH = 200;
    this.VISIBLE = 300;
    this.ROAD_W = 2000;
    this.TOTAL_SEGMENTS = 3000;
    this.maxSpeed = 9;
    this.segments = [];
    this.currentTrackId = "interlagos";

    this.generateTrack("interlagos");
    this.setupCanvas();
    this.init();
  }

  // ── Track generation ──
  buildProfile(id) {
    const S = (len) => ({ type: "s", len });
    const C = (len, curve) => ({ type: "c", len, curve });
    const profiles = {
      interlagos: [
        S(80), C(70, 0.7), S(60), C(50, -0.5),
        S(40), C(80, 0.6), S(100), C(60, -0.8),
        S(50), C(40, 0.3), S(70), C(55, -0.4),
        S(90), C(45, 0.9), S(60), C(50, -0.3),
        S(30), C(65, 0.5), S(80),
      ],
      monza: [
        S(120), C(40, 0.4), S(150), C(35, -0.3),
        S(180), C(45, 0.5), S(100), C(30, -0.2),
        S(200), C(50, 0.6), S(140), C(40, -0.4),
        S(160), C(35, 0.3), S(120),
      ],
      mônaco: [
        S(40), C(50, 1.0), S(20), C(40, -0.9),
        S(30), C(60, 0.8), S(25), C(35, -1.1),
        S(20), C(45, 0.7), S(35), C(50, -0.8),
        S(15), C(40, 1.2), S(25), C(30, -0.6),
        S(40), C(55, 0.9), S(20), C(45, -1.0),
        S(30),
      ],
    };
    return profiles[id] || profiles.interlagos;
  }

  generateTrack(trackId) {
    this.currentTrackId = trackId;
    const profile = this.buildProfile(trackId);
    this.segments = [];
    // Build segments from profile
    for (const p of profile) {
      for (let i = 0; i < p.len; i++) {
        const t = i / p.len;
        // Smooth easing in/out of curves
        let curve = 0;
        if (p.type === "c") {
          const ease = Math.sin(t * Math.PI);
          curve = p.curve * ease;
        }
        this.segments.push({ curve, y: 0 });
      }
    }
    // Fill to TOTAL_SEGMENTS with straights
    while (this.segments.length < this.TOTAL_SEGMENTS) {
      this.segments.push({ curve: 0, y: 0 });
    }
    // Truncate if too long
    if (this.segments.length > this.TOTAL_SEGMENTS) {
      this.segments.length = this.TOTAL_SEGMENTS;
    }
    // Pre-compute deterministic object placement
    this.segments.forEach((seg, i) => {
      const h = (i * 16807 + trackId.length) % 2147483647;
      seg.hasTreeL = (h % 5) === 0;
      seg.hasTreeR = (h % 7) === 0;
      seg.hasGrandstand = (i > 100 && i < 130) || (i > 800 && i < 840) || (i > 1500 && i < 1530);
      seg.hasBarrierL = Math.abs(seg.curve) > 0.3 && (h % 3) !== 0;
      seg.hasBarrierR = Math.abs(seg.curve) > 0.3 && (h % 5) !== 0;
      seg.startFinish = i < 15;
    });
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
    this.tone("sawtooth", 95 + Math.random() * 15, now, 0.04, 0.025);
  }

  playOvertake() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    this.tone("square", 660, now, 0.05, 0.05);
    this.tone("square", 880, now + 0.04, 0.05, 0.04);
  }

  playFinish() {
    const actx = this.audio();
    if (!actx) return;
    const now = actx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => this.tone("square", f, now + i * 0.15, 0.15, 0.09));
  }

  playMusic() {
    if (this.state.muted || this._musicTimer) return;
    const notes = [330, 370, 392, 330, 262, 294, 330, 392, 440, 392, 330, 294, 262];
    let i = 0;
    this._musicTimer = setInterval(() => {
      const actx = this.audio();
      if (!actx || this.state.mode !== "playing") return;
      this.tone("square", notes[i % notes.length], actx.currentTime, 0.1, 0.018);
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

  // ── Init & UI ──
  init() {
    this.state = {
      mode: "start",
      score: 0,
      highScore: Number(localStorage.getItem("dogao_f3d_highscore") || 0),
      character: "hotdog",
      difficulty: "medium",
      track: "interlagos",
      muted: false,
      frame: 0,
      laps: 0,
      maxLaps: 3,
      raceOver: false,
      finished: false,
      position: 1,
      player: { segment: 0, x: 0, speed: 0, steer: 0 },
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
    this.ui.id = "f3d-ui";
    this.ui.style.cssText = "position:absolute;top:0;left:0;right:0;bottom:0;z-index:5;overflow:hidden;pointer-events:none;";
    this.ui.innerHTML = `
      <div id="f3d-hud" style="position:absolute;top:max(4px,env(safe-area-inset-top));left:0;right:0;display:none;justify-content:space-between;padding:0 10px;pointer-events:none;font-family:'Press Start 2P',monospace;font-size:6px;color:white;text-shadow:0 2px 4px rgba(0,0,0,0.5);z-index:6;">
        <span><span id="f3d-pos">P1</span></span>
        <span><span id="f3d-lap">V 1/3</span></span>
        <span>\uD83C\uDFC6 <span id="f3d-score">0</span></span>
        <span><span id="f3d-speed">0 km/h</span></span>
      </div>
      <button class="sound-button" id="f3d-soundBtn" type="button" aria-label="Silenciar som" style="top:max(4px,env(safe-area-inset-top));right:4px;width:36px;height:36px;font-size:16px;">\uD83D\uDD0A</button>
      <div id="f3d-controls" style="position:absolute;bottom:max(12px,env(safe-area-inset-bottom));left:0;right:0;display:none;justify-content:space-between;padding:0 20px;z-index:10;pointer-events:none;">
        <button id="f3d-leftBtn" type="button" style="width:70px;height:70px;border-radius:50%;background:rgba(255,215,0,0.2);border:3px solid rgba(255,215,0,0.35);color:white;font-size:26px;display:grid;place-items:center;pointer-events:auto;touch-action:none;">\u25C0</button>
        <div style="width:70px;"></div>
        <button id="f3d-rightBtn" type="button" style="width:70px;height:70px;border-radius:50%;background:rgba(255,215,0,0.2);border:3px solid rgba(255,215,0,0.35);color:white;font-size:26px;display:grid;place-items:center;pointer-events:auto;touch-action:none;">\u25B6</button>
      </div>
      <section class="screen start-screen hidden" id="f3d-startScreen">
        <img class="brand-logo" src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
        <div><h1 style="color:#E74C3C;font-size:clamp(22px,7vw,40px);text-shadow:0 0 20px rgba(231,76,60,0.3);margin:0;">Formula Dogao 3D</h1></div>
        <div class="hero-character" id="f3d-hero" style="font-size:clamp(32px,9vw,50px);margin:2px 0;animation:bob 1.2s ease-in-out infinite;">\uD83C\uDFCE\uFE0F</div>
        <p class="record" id="f3d-recordLine" style="min-height:14px;margin:0 0 4px;">\uD83C\uDFC6 RECORDE: ${this.state.highScore}</p>
        <div class="chooser"><p>PISTA</p><div class="card-row" id="f3d-trackOptions"></div></div>
        <div class="chooser"><p>PERSONAGEM</p><div class="card-row" id="f3d-charOptions"></div></div>
        <div class="chooser"><p>DIFICULDADE</p><div class="card-row" id="f3d-diffOptions"></div></div>
        <button class="play-button" id="f3d-playBtn" type="button">CORRER!</button>
      </section>
      <section class="screen gameover-screen hidden" id="f3d-gameoverScreen">
        <div class="gameover-card">
          <img src="https://media.base44.com/images/public/6a065f6a3432e7e768396f1e/5e5cdcc9f_file_00000000419071f5977aff8a7d657fd9.png" alt="O Mega Dogao" />
          <div style="font-size:44px;line-height:1;" id="f3d-resultEmoji">\uD83C\uDFC6</div>
          <h2 style="margin:4px 0 8px;font-size:clamp(22px,6vw,32px);line-height:1;" id="f3d-resultTitle">VOCE VENCEU!</h2>
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
    this.trackOptions = document.getElementById("f3d-trackOptions");
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

    this.renderOptions(this.trackOptions, this.TRACKS, "track");
    this.renderOptions(this.charOptions, this.CHARACTERS, "character");
    this.renderOptions(this.diffOptions, this.DIFFICULTIES, "difficulty");
    this.updateHighlights();
  }

  renderOptions(container, items, key) {
    container.innerHTML = "";
    for (const item of items) {
      const btn = document.createElement("button");
      btn.className = "card";
      if (key === "character") {
        let vis = item.image
          ? `<img class="character-thumb" src="${item.image}" alt="${item.label}" />`
          : `<span style="font-size:26px;">${item.emoji}</span>`;
        btn.innerHTML = `${vis}<span>${item.label}</span><small>${item.description}</small>`;
      } else {
        btn.innerHTML = `<span class="emoji">${item.emoji}</span><span>${item.label}</span><small>${item.description}</small>`;
      }
      btn.addEventListener("click", () => {
        this.state[key] = item.id;
        if (key === "track") {
          this.generateTrack(item.id);
          this.heroEl.textContent = item.emoji;
        } else if (key === "character") {
          this.heroEl.innerHTML = item.image
            ? `<img src="${item.image}" style="width:min(20vw,70px);height:min(20vw,70px);object-fit:contain;filter:drop-shadow(0 10px 12px rgba(0,0,0,0.26));" />`
            : `<span style="font-size:clamp(32px,9vw,50px);">${item.emoji}</span>`;
        }
        this.updateHighlights();
      });
      btn.dataset.id = item.id;
      container.appendChild(btn);
    }
  }

  updateHighlights() {
    const update = (container, key) => {
      for (const b of container.children) b.classList.toggle("active", b.dataset.id === this.state[key]);
    };
    update(this.trackOptions, "track");
    update(this.charOptions, "character");
    update(this.diffOptions, "difficulty");
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
    this.generateTrack(this.state.track);
    this.state.mode = "playing";
    this.state.score = 0;
    this.state.laps = 0;
    this.state.raceOver = false;
    this.state.finished = false;
    this.state.frame = 0;
    this.state.engineTimer = 0;
    this.state.player.segment = 0;
    this.state.player.x = 0;
    this.state.player.speed = 0;
    this.state.player.steer = 0;

    const diffMap = { easy: 3.2, medium: 4.2, hard: 5.4 };
    const baseAI = diffMap[this.state.difficulty] || 4.2;
    const aiSpeeds = [baseAI * 0.82, baseAI * 0.90, baseAI * 1.0, baseAI * 1.10];
    const offsets = [180, 400, 650, 950];
    const aiColors = ["#E67E22", "#3498DB", "#9B59B6", "#2ECC71"];
    const aiNames = ["Laranja", "Azul", "Roxo", "Verde"];
    this.state.cars = [];
    for (let i = 0; i < 4; i++) {
      this.state.cars.push({
        segment: offsets[i], x: (Math.random() - 0.5) * 0.5,
        speed: aiSpeeds[i], baseSpeed: aiSpeeds[i],
        color: aiColors[i], name: aiNames[i],
        isAI: true, laps: 0, finished: false,
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
      localStorage.setItem("dogao_f3d_highscore", String(this.state.highScore));
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
    if (this.state.mode !== "playing" || this.state.raceOver) return;
    this.state.frame++;
    const p = this.state.player;

    // Steering
    const steerSpeed = 0.045;
    p.x += p.steer * steerSpeed;
    const maxX = 1.3;
    if (p.x < -maxX) p.x = -maxX;
    if (p.x > maxX) p.x = maxX;

    // Curve push
    const segIdx = Math.floor(p.segment) % this.segments.length;
    const curSeg = this.segments[segIdx];
    p.x += curSeg.curve * 0.18;

    // Speed
    const accel = 0.055;
    const friction = 0.986;
    const steerDrag = 1 - Math.abs(p.steer) * 0.22;
    p.speed += accel * steerDrag;
    if (p.speed > this.maxSpeed) p.speed = this.maxSpeed;
    p.speed *= friction;

    // Curve slowdown
    const cf = Math.max(0.25, 1 - Math.abs(curSeg.curve) * 1.3);
    p.speed *= (0.97 + 0.03 * cf);

    // Advance
    p.segment += p.speed * 0.3;
    if (p.segment >= this.TOTAL_SEGMENTS) {
      p.laps++;
      p.segment -= this.TOTAL_SEGMENTS;
      if (p.laps >= this.state.maxLaps) { this.state.raceOver = true; this.state.finished = true; }
    }

    // Engine sound
    if (this.state.engineTimer <= 0) {
      this.playEngine();
      this.state.engineTimer = 7 + Math.floor(Math.random() * 3);
    } else {
      this.state.engineTimer--;
    }

    // ── AI ──
    const halfX = 0.8;
    for (const car of this.state.cars) {
      if (car.finished) continue;
      const ci = Math.floor(car.segment) % this.segments.length;
      const cs = this.segments[ci];
      const ccf = Math.max(0.25, 1 - Math.abs(cs.curve) * 1.3);
      car.speed = car.baseSpeed * ccf * (0.96 + Math.random() * 0.08);
      // Steer toward center
      if (car.x > 0.08) car.x -= 0.006;
      else if (car.x < -0.08) car.x += 0.006;
      car.x += cs.curve * 0.12;
      // Nudge for overtaking
      const dSeg = car.segment - p.segment;
      if (Math.abs(dSeg) < 60) {
        car.x += dSeg > 0 ? 0.015 : -0.015;
      }
      if (car.x < -halfX) car.x = -halfX;
      if (car.x > halfX) car.x = halfX;
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
    this.state.score += Math.round(p.speed * 0.6 + (5 - pos) * 0.3);
    if (this.scoreEl) this.scoreEl.textContent = this.state.score;

    const prev = this._prevPos || pos;
    if (pos < prev) this.playOvertake();
    this._prevPos = pos;

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
    const horizon = Math.floor(H * 0.43);

    // Sky gradient
    const sg = ctx.createLinearGradient(0, 0, 0, horizon + 30);
    sg.addColorStop(0, "#0b0b24");
    sg.addColorStop(0.35, "#d45c3a");
    sg.addColorStop(0.65, "#f0b060");
    sg.addColorStop(1, "#f5d898");
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, W, horizon + 30);

    if (this.state.mode === "start") return;

    const p = this.state.player;
    const baseSeg = Math.floor(p.segment);
    const segs = this.segments;
    const nsegs = segs.length;
    const persp = 0.0028;
    const rwm = 0.065;

    // Project segments far→near
    const proj = [];
    let cumX = 0;
    for (let n = 0; n <= this.VISIBLE; n++) {
      const idx = (baseSeg + n) % nsegs;
      const s = segs[idx];
      if (n > 0) cumX += s.curve;
      const z = n * this.SEGMENT_LENGTH;
      const scale = 1 / (1 + z * persp);
      const dx = (cumX - p.x * 20) * scale * rwm;
      const sy = horizon + (H - horizon) * scale;
      const sw = this.ROAD_W * scale * rwm;
      proj[n] = { x: cX + dx, y: sy, w: sw, scale, sx: dx, idx, s, cumX };
    }

    // Draw far→near
    for (let n = this.VISIBLE; n >= 1; n--) {
      const cur = proj[n];
      const prev = proj[n - 1];
      if (!cur || !prev) continue;

      const x1 = cur.x, y1 = cur.y, w1 = cur.w;
      const x2 = prev.x, y2 = prev.y, w2 = prev.w;

      // Grass
      ctx.fillStyle = (Math.floor(n / 4) % 2 === 0) ? "#1a5c1a" : "#166016";
      ctx.beginPath();
      ctx.moveTo(x1 - w1 - 3000, y1);
      ctx.lineTo(x2 - w2 - 3000, y2);
      ctx.lineTo(x2 + w2 + 3000, y2);
      ctx.lineTo(x1 + w1 + 3000, y1);
      ctx.fill();

      // Road
      ctx.fillStyle = (Math.floor(n / 3) % 2 === 0) ? "#4a4a4a" : "#444";
      ctx.beginPath();
      ctx.moveTo(x1 - w1, y1);
      ctx.lineTo(x2 - w2, y2);
      ctx.lineTo(x2 + w2, y2);
      ctx.lineTo(x1 + w1, y1);
      ctx.fill();

      // Road edge detail (subtle lighter line)
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = Math.max(1, 2 * cur.scale);
      ctx.beginPath(); ctx.moveTo(x1 - w1 + 4 * cur.scale, y1); ctx.lineTo(x2 - w2 + 4 * cur.scale, y2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1 + w1 - 4 * cur.scale, y1); ctx.lineTo(x2 + w2 - 4 * cur.scale, y2); ctx.stroke();

      // Rumble strips (red/white)
      if (cur.scale > 0.01) {
        const rc = Math.floor(n / 2) % 2 === 0 ? "#E74C3C" : "#fff";
        ctx.strokeStyle = rc;
        ctx.lineWidth = Math.max(1.5, 4 * cur.scale);
        ctx.beginPath(); ctx.moveTo(x1 - w1, y1); ctx.lineTo(x2 - w2, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1 + w1, y1); ctx.lineTo(x2 + w2, y2); ctx.stroke();
      }

      // Center line (dashed yellow)
      if (n % 8 < 4) {
        ctx.strokeStyle = "rgba(255,215,0,0.35)";
        ctx.lineWidth = Math.max(1, 2.5 * cur.scale);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }

      // ── Objects at road edges ──
      if (cur.scale < 0.008) continue;

      // Trees
      const seg = cur.s;
      const ts = Math.min(1, cur.scale * 80);
      if (ts > 0.04) {
        if (seg.hasTreeL) {
          const tx = x1 - w1 - 150 * cur.scale;
          const ty = y1;
          ctx.fillStyle = "#5c3a1e";
          ctx.fillRect(tx - 2 * cur.scale, ty - 15 * cur.scale, 4 * cur.scale, 15 * cur.scale);
          ctx.fillStyle = "#2d7a2d";
          ctx.beginPath();
          ctx.arc(tx, ty - 22 * cur.scale, 14 * cur.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#3a9a3a";
          ctx.beginPath();
          ctx.arc(tx + 4 * cur.scale, ty - 25 * cur.scale, 9 * cur.scale, 0, Math.PI * 2);
          ctx.fill();
        }
        if (seg.hasTreeR) {
          const tx = x1 + w1 + 150 * cur.scale;
          const ty = y1;
          ctx.fillStyle = "#5c3a1e";
          ctx.fillRect(tx - 2 * cur.scale, ty - 15 * cur.scale, 4 * cur.scale, 15 * cur.scale);
          ctx.fillStyle = "#2d7a2d";
          ctx.beginPath();
          ctx.arc(tx, ty - 22 * cur.scale, 14 * cur.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#3a9a3a";
          ctx.beginPath();
          ctx.arc(tx + 3 * cur.scale, ty - 24 * cur.scale, 8 * cur.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Grandstands
      if (seg.hasGrandstand && ts > 0.06) {
        const gx = x1 - w1 - 200 * cur.scale;
        const gy = y1;
        const gw = 80 * cur.scale;
        const gh = 40 * cur.scale;
        // Structure
        ctx.fillStyle = "#666";
        ctx.fillRect(gx - gw / 2, gy - gh, gw, gh);
        // Roof
        ctx.fillStyle = "#888";
        ctx.fillRect(gx - gw / 2 - 5 * cur.scale, gy - gh - 4 * cur.scale, gw + 10 * cur.scale, 5 * cur.scale);
        // People (dots)
        ctx.fillStyle = "#facc15";
        for (let i = 0; i < 5; i++) {
          const px = gx - gw / 2 + 6 * cur.scale + i * 15 * cur.scale;
          ctx.beginPath();
          ctx.arc(px, gy - gh / 2, 3 * cur.scale, 0, Math.PI * 2);
          ctx.fill();
        }
        // Right grandstand
        const gx2 = x1 + w1 + 200 * cur.scale;
        ctx.fillStyle = "#666";
        ctx.fillRect(gx2 - gw / 2, gy - gh, gw, gh);
        ctx.fillStyle = "#888";
        ctx.fillRect(gx2 - gw / 2 - 5 * cur.scale, gy - gh - 4 * cur.scale, gw + 10 * cur.scale, 5 * cur.scale);
        ctx.fillStyle = "#facc15";
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(gx2 - gw / 2 + 6 * cur.scale + i * 15 * cur.scale, gy - gh / 2, 3 * cur.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Barriers on curves
      if (seg.hasBarrierL && ts > 0.05) {
        const bx = x1 - w1 - 8 * cur.scale;
        ctx.strokeStyle = "#E74C3C";
        ctx.lineWidth = 5 * cur.scale;
        ctx.beginPath();
        ctx.moveTo(bx, y1);
        ctx.lineTo(x2 - w2 - 8 * cur.scale, y2);
        ctx.stroke();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2 * cur.scale;
        ctx.setLineDash([6 * cur.scale, 6 * cur.scale]);
        ctx.beginPath();
        ctx.moveTo(bx, y1);
        ctx.lineTo(x2 - w2 - 8 * cur.scale, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (seg.hasBarrierR && ts > 0.05) {
        const bx = x1 + w1 + 8 * cur.scale;
        ctx.strokeStyle = "#E74C3C";
        ctx.lineWidth = 5 * cur.scale;
        ctx.beginPath();
        ctx.moveTo(bx, y1);
        ctx.lineTo(x2 + w2 + 8 * cur.scale, y2);
        ctx.stroke();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2 * cur.scale;
        ctx.setLineDash([6 * cur.scale, 6 * cur.scale]);
        ctx.beginPath();
        ctx.moveTo(bx, y1);
        ctx.lineTo(x2 + w2 + 8 * cur.scale, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Start/finish line (checkered on first segments)
      if (seg.startFinish && ts > 0.06) {
        for (let j = 0; j < 6; j++) {
          const t1 = j / 6, t2 = (j + 1) / 6;
          const lx = x1 - w1 + (x1 + w1 - (x1 - w1)) * t1;
          const rx = x1 - w1 + (x1 + w1 - (x1 - w1)) * t2;
          ctx.fillStyle = j % 2 === 0 ? "#fff" : "#222";
          ctx.beginPath();
          ctx.moveTo(lx, y1);
          ctx.lineTo(rx, y1);
          ctx.lineTo(rx - (rx - lx) * 0.4, y1 - 8 * cur.scale);
          ctx.lineTo(lx - (lx - rx) * 0.4, y1 - 8 * cur.scale);
          ctx.fill();
        }
      }
    }

    // ── AI cars ──
    for (const car of this.state.cars) {
      if (car.finished) continue;
      const cSeg = Math.floor(car.segment);
      let dn = cSeg - baseSeg;
      if (dn < 0) dn += nsegs;
      if (dn <= 1 || dn > this.VISIBLE - 4) continue;
      const pt = proj[dn];
      if (!pt || pt.scale < 0.012 || pt.y < horizon - 5) continue;

      const dxCar = (car.x - p.x) * 20 * pt.scale * rwm;
      const sx = cX + dxCar;
      const sy = pt.y - 14 * pt.scale;
      const sc = pt.scale;

      const cw = 30 * sc;
      const ch = 48 * sc;
      ctx.save();
      ctx.translate(sx, sy);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(1, 3, cw * 0.5, ch * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rear wing
      ctx.fillStyle = car.color;
      ctx.fillRect(-cw * 0.48, -ch * 0.52, cw * 0.96, ch * 0.08);

      // Body
      ctx.fillStyle = car.color;
      ctx.beginPath();
      ctx.moveTo(cw * 0.44, -ch * 0.46);
      ctx.lineTo(cw * 0.48, -ch * 0.05);
      ctx.lineTo(cw * 0.44, ch * 0.48);
      ctx.lineTo(-cw * 0.44, ch * 0.48);
      ctx.lineTo(-cw * 0.48, -ch * 0.05);
      ctx.lineTo(-cw * 0.44, -ch * 0.46);
      ctx.fill();

      // Cockpit
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.ellipse(0, ch * 0.04, cw * 0.16, ch * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wheels
      ctx.fillStyle = "#111";
      const wr = cw * 0.1;
      ctx.beginPath(); ctx.arc(-cw * 0.38, -ch * 0.38, wr, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cw * 0.38, -ch * 0.38, wr, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-cw * 0.38, ch * 0.38, wr, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cw * 0.38, ch * 0.38, wr, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    // ── Player car (rear 3/4 view, drawn last) ──
    const pY = H - 115;
    const pS = 1.45;
    ctx.save();

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cX + 3, pY + 5, 32 * pS, 15 * pS, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(cX, pY);

    // Rear wing assembly
    ctx.fillStyle = "#E74C3C";
    // Main wing
    ctx.fillRect(-35 * pS, -45 * pS, 70 * pS, 9 * pS);
    // Endplates
    ctx.fillRect(-35 * pS, -46 * pS, 4 * pS, 11 * pS);
    ctx.fillRect(31 * pS, -46 * pS, 4 * pS, 11 * pS);
    // Wing supports
    ctx.fillStyle = "#888";
    ctx.fillRect(-10 * pS, -36 * pS, 3 * pS, 8 * pS);
    ctx.fillRect(7 * pS, -36 * pS, 3 * pS, 8 * pS);

    // Main body
    ctx.fillStyle = "#E74C3C";
    ctx.beginPath();
    ctx.moveTo(27 * pS, -38 * pS);
    ctx.quadraticCurveTo(29 * pS, -6 * pS, 25 * pS, 26 * pS);
    ctx.lineTo(-25 * pS, 26 * pS);
    ctx.quadraticCurveTo(-29 * pS, -6 * pS, -27 * pS, -38 * pS);
    ctx.fill();

    // Engine cover
    ctx.fillStyle = "#C0392B";
    ctx.fillRect(-8 * pS, -34 * pS, 16 * pS, 6 * pS);

    // Diffuser
    ctx.fillStyle = "#555";
    ctx.fillRect(-14 * pS, 23 * pS, 28 * pS, 5 * pS);
    ctx.fillStyle = "#666";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-10 * pS + i * 7 * pS, 24 * pS, 3 * pS, 4 * pS);
    }

    // Exhaust
    ctx.fillStyle = "#888";
    ctx.fillRect(-4 * pS, 26 * pS, 3 * pS, 4 * pS);
    ctx.fillRect(1 * pS, 26 * pS, 3 * pS, 4 * pS);

    // Halo
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -5 * pS, 19 * pS, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();

    // Driver helmet
    const char = this.CHARACTERS.find(c => c.id === this.state.character);
    if (char) {
      ctx.save();
      ctx.translate(0, -7 * pS);
      ctx.font = `${24 * pS}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(char.emoji, 0, 0);
      ctx.restore();
    }

    // Rear wheels
    ctx.fillStyle = "#111";
    const wr2 = 7 * pS;
    ctx.beginPath(); ctx.arc(-23 * pS, 22 * pS, wr2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(23 * pS, 22 * pS, wr2, 0, Math.PI * 2); ctx.fill();

    // Rear tire branding
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(-23 * pS, 22 * pS, wr2 * 0.6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(23 * pS, 22 * pS, wr2 * 0.6, 0, Math.PI * 2); ctx.stroke();

    // Front wheels (partially visible)
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(-19 * pS, -29 * pS, wr2 * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(19 * pS, -29 * pS, wr2 * 0.7, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    // ── Speed particles ──
    if (p.speed > 4) {
      const intensity = Math.min(1, (p.speed - 4) / 5);
      ctx.globalAlpha = intensity * 0.05;
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const lx = Math.random() * W;
        const ly = H * 0.2 + Math.random() * H * 0.5;
        const len = 15 + Math.random() * 90;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx + (cX - lx) * 0.003, ly - len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ── Tachometer ──
    const rpm = Math.min(1, p.speed / this.maxSpeed);
    const ax = 36, ay = H - 36, ar = 26;
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ax, ay, ar, Math.PI * 0.75, Math.PI * 2.25);
    ctx.stroke();
    const arcColor = rpm > 0.85 ? "#E74C3C" : (rpm > 0.7 ? "#facc15" : "#2ECC71");
    ctx.strokeStyle = arcColor;
    ctx.beginPath();
    ctx.arc(ax, ay, ar, Math.PI * 0.75, Math.PI * 0.75 + rpm * Math.PI * 1.5);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "4px 'Press Start 2P',monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(p.speed * 14)}`, ax, ay);

    // ── Gear indicator ──
    const gear = Math.min(6, Math.max(1, Math.floor(p.speed / 1.5) + 1));
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "10px 'Press Start 2P',monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(`${gear}`, W - 10, H - 30);

    // ── Track name overlay ──
    const trackInfo = this.TRACKS.find(t => t.id === this.currentTrackId);
    if (trackInfo) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.font = "6px 'Press Start 2P',monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText(trackInfo.label.toUpperCase(), W - 10, 8);
    }
  }

  // ── Events ──
  bindEvents() {
    this._pd = (e) => {
      e.preventDefault();
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      if (this.state.mode === "start") { this.startGame(); return; }
      if (this.state.mode === "gameover") return;
      const rect = this.canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      this.state.player.steer = touch.clientX < cx ? -1 : 1;
    };
    this._pm = (e) => {
      if (this.state.mode !== "playing") return;
      e.preventDefault();
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      const rect = this.canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      this.state.player.steer = touch.clientX < cx ? -1 : 1;
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
