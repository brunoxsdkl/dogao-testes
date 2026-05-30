class RacingGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = null;
    this.animId = null;
    this.running = true;
    this._last = null;

    this.score = 0;
    this.highScore = parseInt(localStorage.getItem("racing_high") || "0");
    this.gameState = "start"; // start | countdown | playing | paused | gameover

    this.speed = 0;
    this.baseSpeed = 0.36;
    this.speedLimit = 2.35;
    this.laneWidth = 2.8;
    this.lanes = [-2.8, 0, 2.8];
    this.currentLane = 1;
    this.targetX = 0;
    this.playerX = 0;
    this.playerY = -0.3;
    this.distance = 0;

    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
    this.scenery = [];
    this.spawnTimer = 0;
    this.collectTimer = 0;
    this.sceneryTimer = 0;

    this.lives = 3;
    this.combo = 0;
    this.turbo = 0;
    this.invincibleTimer = 0;
    this.flashTimer = 0;
    this._touchStartX = null;
    this._audioCtx = null;
  }

  setupCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.parentElement.clientWidth;
    const h = this.canvas.parentElement.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.w = w;
    this.h = h;
    this.dpr = dpr;
  }

  init() {
    this.setupCanvas();
    this.setupThree();
    this.buildScene();
    this.createUI();
    this.bindControls();
    this._last = performance.now();
    this.tick();
  }

  setupThree() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(this.w, this.h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x69b7ff);
    this.scene.fog = new THREE.Fog(0x8bd0ff, 34, 96);

    this.camera = new THREE.PerspectiveCamera(65, this.w / this.h, 0.1, 150);
    this.camera.position.set(0, 5.4, 9.2);
    this.camera.lookAt(0, 0, -5);

    const ambient = new THREE.AmbientLight(0xffffff, 0.72);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff0c4, 2.3);
    sun.position.set(-15, 32, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    sun.shadow.camera.left = -28;
    sun.shadow.camera.right = 28;
    sun.shadow.camera.top = 28;
    sun.shadow.camera.bottom = -28;
    this.scene.add(sun);
    this.sun = sun;

    const hemi = new THREE.HemisphereLight(0x94dfff, 0x344214, 0.65);
    this.scene.add(hemi);

    this._resizeHandler = () => {
      const w2 = this.canvas.parentElement.clientWidth;
      const h2 = this.canvas.parentElement.clientHeight;
      this.w = w2;
      this.h = h2;
      this.canvas.style.width = w2 + "px";
      this.canvas.style.height = h2 + "px";
      this.renderer.setSize(w2, h2);
      this.camera.aspect = w2 / h2;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", this._resizeHandler);
  }

  buildScene() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(120, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0x7dccff, side: THREE.BackSide })
    );
    this.scene.add(sky);

    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(6, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.9 })
    );
    sunDisc.position.set(-22, 28, -62);
    sunDisc.lookAt(this.camera.position);
    this.scene.add(sunDisc);

    const roadTex = this.makeRoadTexture();
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, 120);

    const roadMat = new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.86, metalness: 0.03 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 420), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.5, -70);
    road.receiveShadow = true;
    this.scene.add(road);
    this.road = road;

    const shoulderMat = new THREE.MeshStandardMaterial({ color: 0xd7b66f, roughness: 1 });
    for (let side = -1; side <= 1; side += 2) {
      const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 420), shoulderMat);
      shoulder.rotation.x = -Math.PI / 2;
      shoulder.position.set(side * 6.3, -0.49, -70);
      shoulder.receiveShadow = true;
      this.scene.add(shoulder);
    }

    const grassMat = new THREE.MeshStandardMaterial({ color: 0x3fa348, roughness: 1 });
    for (let side = -1; side <= 1; side += 2) {
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(45, 420), grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(side * 19, -0.52, -70);
      grass.receiveShadow = true;
      this.scene.add(grass);
    }

    this.addGuardrails();
    this.addCityScenery();
    this.createPlayer();
  }

  addGuardrails() {
    const railMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.45, metalness: 0.2 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.7 });
    for (let side = -1; side <= 1; side += 2) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 420), railMat);
      rail.position.set(side * 5.45, 0.05, -70);
      rail.castShadow = true;
      this.scene.add(rail);

      for (let i = 0; i < 46; i++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), postMat);
        post.position.set(side * 5.45, -0.05, 12 - i * 8.8);
        post.castShadow = true;
        this.scene.add(post);
      }
    }
  }

  addCityScenery() {
    const buildingColors = [0xf97316, 0xfacc15, 0x38bdf8, 0xa78bfa, 0xfb7185, 0x34d399];
    for (let i = 0; i < 38; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const z = 8 - i * 6 - Math.random() * 3;
      if (i % 3 === 0) this.scene.add(this.makeBillboard(side * (8.3 + Math.random() * 1.8), z, i));
      const w = 1.4 + Math.random() * 1.6;
      const h = 2.0 + Math.random() * 4.8;
      const d = 1.2 + Math.random() * 1.6;
      const color = buildingColors[i % buildingColors.length];
      const b = this.makeBuilding(w, h, d, color);
      b.position.set(side * (10 + Math.random() * 7), h / 2 - 0.5, z);
      b.rotation.y = (Math.random() - 0.5) * 0.16;
      this.scene.add(b);
      this.scenery.push(b);
    }

    for (let i = 0; i < 46; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const tree = this.makeTree();
      tree.position.set(side * (6.7 + Math.random() * 3.5), -0.45, 10 - i * 4.5);
      this.scene.add(tree);
      this.scenery.push(tree);
    }
  }

  makeBuilding(w, h, d, color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.04 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w * 1.08, 0.18, d * 1.08),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 })
    );
    roof.position.y = h / 2 + 0.12;
    roof.castShadow = true;
    group.add(roof);

    const windowMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x6ee7ff, emissiveIntensity: 0.22, roughness: 0.2 });
    const rows = Math.max(2, Math.floor(h / 0.65));
    const cols = Math.max(2, Math.floor(w / 0.42));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.18) continue;
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.025), windowMat);
        win.position.set(-w / 2 + 0.28 + c * 0.38, -h / 2 + 0.42 + r * 0.54, d / 2 + 0.018);
        group.add(win);
      }
    }
    return group;
  }

  makeBillboard(x, z, i) {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x374151 })
    );
    pole.position.y = 0.3;
    group.add(pole);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.85, 0.08),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xffdd33 : 0xef4444, roughness: 0.45, emissive: i % 2 ? 0x221600 : 0x2a0000, emissiveIntensity: 0.18 })
    );
    board.position.y = 1.35;
    group.add(board);
    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.12, 0.09),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    accent.position.y = 1.5;
    group.add(accent);
    group.position.set(x, -0.5, z);
    group.rotation.y = x > 0 ? -0.42 : 0.42;
    return group;
  }

  makeTree() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 1 })
    );
    trunk.position.y = 0.0;
    trunk.castShadow = true;
    group.add(trunk);
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.15, 7),
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 1 })
    );
    crown.position.y = 0.78;
    crown.castShadow = true;
    group.add(crown);
    return group;
  }

  createPlayer() {
    this.player = new THREE.Group();

    const sausageMat = new THREE.MeshStandardMaterial({ color: 0x9a4b1f, roughness: 0.62, metalness: 0.03 });
    const sausage = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.65, 18), sausageMat);
    sausage.rotation.z = Math.PI / 2;
    sausage.position.y = 0.34;
    sausage.castShadow = true;
    this.player.add(sausage);

    const bunMat = new THREE.MeshStandardMaterial({ color: 0xf3b34d, roughness: 0.82 });
    const bunLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.52, 1.85), bunMat);
    bunLeft.position.set(-0.72, 0.16, 0);
    bunLeft.castShadow = true;
    this.player.add(bunLeft);
    const bunRight = bunLeft.clone();
    bunRight.position.set(0.72, 0.16, 0);
    this.player.add(bunRight);

    const mustardMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffc400, emissiveIntensity: 0.22 });
    for (let i = -4; i <= 4; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), mustardMat);
      dot.position.set(Math.sin(i * 0.9) * 0.16, 0.62, i * 0.18);
      this.player.add(dot);
    }

    const ketchupMat = new THREE.MeshStandardMaterial({ color: 0xdc143c, emissive: 0xdc143c, emissiveIntensity: 0.18 });
    for (let i = -4; i <= 4; i++) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), ketchupMat);
      dot.position.set(0.2 + Math.cos(i * 0.9) * 0.08, 0.66, i * 0.18);
      this.player.add(dot);
    }

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8, metalness: 0.15 });
    this.wheels = [];
    const wheelPositions = [[-0.55, 0.05, -0.6], [0.55, 0.05, -0.6], [-0.55, 0.05, 0.6], [0.55, 0.05, 0.6]];
    for (const pos of wheelPositions) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      this.player.add(wheel);
      this.wheels.push(wheel);
    }

    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.16), new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.35, metalness: 0.12 }));
    spoiler.position.set(0, 0.72, 0.88);
    spoiler.castShadow = true;
    this.player.add(spoiler);

    const glow = new THREE.PointLight(0xffdd55, 0.7, 4);
    glow.position.set(0, 0.4, 1.05);
    this.player.add(glow);

    this.player.position.set(0, this.playerY, 0);
    this.scene.add(this.player);
  }

  makeRoadTexture() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 512;
    const ctx = c.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, "#252a31");
    grad.addColorStop(0.5, "#3a4048");
    grad.addColorStop(1, "#252a31");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 512);

    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 650; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 512;
      const v = 70 + Math.random() * 70;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(7, 0, 3, 512);
    ctx.fillRect(118, 0, 3, 512);

    ctx.fillStyle = "#f9f871";
    for (let y = 0; y < 512; y += 48) {
      ctx.fillRect(42, y, 4, 24);
      ctx.fillRect(82, y + 10, 4, 24);
    }

    ctx.fillStyle = "rgba(255,255,255,0.11)";
    ctx.fillRect(17, 0, 1, 512);
    ctx.fillRect(110, 0, 1, 512);
    return new THREE.CanvasTexture(c);
  }

  createUI() {
    this.uiContainer = document.createElement("div");
    this.uiContainer.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:10;font-family:'Fredoka One',sans-serif;color:white;`;

    this.scoreEl = document.createElement("div");
    this.scoreEl.style.cssText = `
      position:absolute;top:14px;left:14px;right:14px;display:none;gap:10px;align-items:center;justify-content:space-between;
      font-size:16px;text-shadow:0 2px 0 rgba(0,0,0,.25);
    `;
    this.scoreEl.innerHTML = `
      <div style="background:rgba(15,23,42,.48);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(10px);border-radius:16px;padding:10px 12px;">🏁 <span id="raceScore">0</span></div>
      <div style="background:rgba(15,23,42,.48);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(10px);border-radius:16px;padding:10px 12px;">❤️ <span id="raceLives">3</span></div>
      <div style="background:rgba(15,23,42,.48);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(10px);border-radius:16px;padding:10px 12px;">⚡ <span id="raceTurbo">0</span>%</div>
    `;
    this.uiContainer.appendChild(this.scoreEl);

    this.pauseButton = document.createElement("button");
    this.pauseButton.textContent = "⏸";
    this.pauseButton.style.cssText = `position:absolute;right:16px;bottom:16px;width:52px;height:52px;border-radius:18px;border:1px solid rgba(255,255,255,.35);background:rgba(15,23,42,.48);color:white;font-size:22px;pointer-events:auto;backdrop-filter:blur(10px);`;
    this.pauseButton.addEventListener("click", () => this.togglePause());
    this.uiContainer.appendChild(this.pauseButton);

    this.startOverlay = this.makeOverlay(`
      <div style="font-size:64px;margin-bottom:4px;filter:drop-shadow(0 8px 0 rgba(0,0,0,.18));">🌭</div>
      <div style="font-size:34px;line-height:1;">Dogão Racing</div>
      <div style="font-size:12px;margin:14px 0 8px;opacity:.78;font-family:'Press Start 2P',monospace">PISTA NOVA • CIDADE • TURBO</div>
      <div style="font-size:10px;opacity:.7;font-family:'Press Start 2P',monospace;line-height:1.8">TOQUE PARA COMEÇAR<br/>← lado esquerdo • lado direito →<br/>ESPAÇO ativa turbo</div>
    `);
    this.uiContainer.appendChild(this.startOverlay);

    this.countdownOverlay = this.makeOverlay(`<div id="raceCountdown" style="font-size:86px;text-shadow:0 8px 0 rgba(0,0,0,.25);">3</div>`, false, true);
    this.countdownOverlay.style.display = "none";
    this.uiContainer.appendChild(this.countdownOverlay);

    this.pauseOverlay = this.makeOverlay(`
      <div style="font-size:52px;margin-bottom:4px;">⏸</div>
      <div style="font-size:28px;">PAUSADO</div>
      <div style="margin-top:14px;font-size:12px;opacity:.7;font-family:'Press Start 2P',monospace">toque para continuar</div>
    `);
    this.pauseOverlay.style.display = "none";
    this.uiContainer.appendChild(this.pauseOverlay);

    this.gameoverOverlay = this.makeOverlay(`
      <div style="font-size:58px;margin-bottom:4px;">💥</div>
      <div style="font-size:26px;">FIM DA CORRIDA</div>
      <div id="racingFinalScore" style="font-size:52px;margin:8px 0;">0</div>
      <div id="racingBestScore" style="font-size:14px;opacity:.75;font-family:'Press Start 2P',monospace">Recorde: 0</div>
      <div style="margin-top:16px;font-size:13px;opacity:.72;font-family:'Press Start 2P',monospace">TOQUE PARA REINICIAR</div>
    `, true);
    this.uiContainer.appendChild(this.gameoverOverlay);

    this.canvas.parentElement.appendChild(this.uiContainer);
    this.updateHud();
  }

  makeOverlay(html, clickable = false, transparent = false) {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.style.cssText = `
      position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:${transparent ? "rgba(15,23,42,.18)" : "linear-gradient(135deg,rgba(127,29,29,.82),rgba(15,23,42,.84))"};
      backdrop-filter:blur(6px);text-align:center;font-family:'Fredoka One',sans-serif;color:white;
      ${clickable ? "" : "pointer-events:auto;"}
    `;
    if (clickable) div.style.display = "none";
    div.addEventListener("click", () => {
      if (this.gameState === "start") this.startCountdown();
      else if (this.gameState === "paused") this.togglePause();
      else if (this.gameState === "gameover") this.restartGame();
    });
    return div;
  }

  bindControls() {
    const onTouch = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches ? e.touches[0] : e;
      const x = (touch.clientX - rect.left) / rect.width;
      this.handleInput(x);
    };

    const onTouchStart = (e) => {
      if (this.gameState === "start") { this.startCountdown(); return; }
      if (this.gameState === "gameover") { this.restartGame(); return; }
      if (this.gameState === "paused") { this.togglePause(); return; }
      onTouch(e);
    };

    this.canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    this.canvas.addEventListener("click", (e) => {
      if (this.gameState === "start") { this.startCountdown(); return; }
      if (this.gameState === "gameover") { this.restartGame(); return; }
      if (this.gameState === "paused") { this.togglePause(); return; }
      const rect = this.canvas.getBoundingClientRect();
      this.handleInput((e.clientX - rect.left) / rect.width);
    });

    this._keyHandler = (e) => {
      if (this.gameState === "start" && (e.key === " " || e.key === "Enter")) { e.preventDefault(); this.startCountdown(); return; }
      if (this.gameState === "gameover" && (e.key === " " || e.key === "Enter")) { e.preventDefault(); this.restartGame(); return; }
      if (e.key === "p" || e.key === "P" || e.key === "Escape") { this.togglePause(); return; }
      if (this.gameState !== "playing") return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") this.moveLane(-1);
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") this.moveLane(1);
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); this.useTurbo(); }
    };
    window.addEventListener("keydown", this._keyHandler);
  }

  handleInput(x) {
    if (this.gameState !== "playing") return;
    if (x < 0.4) this.moveLane(-1);
    else if (x > 0.6) this.moveLane(1);
    else this.useTurbo();
  }

  moveLane(dir) {
    this.currentLane = Math.max(0, Math.min(2, this.currentLane + dir));
    this.targetX = this.lanes[this.currentLane];
  }

  startCountdown() {
    this.gameState = "countdown";
    this.startOverlay.style.display = "none";
    this.countdownOverlay.style.display = "flex";
    let n = 3;
    const el = this.countdownOverlay.querySelector("#raceCountdown");
    el.textContent = String(n);
    const timer = setInterval(() => {
      n--;
      if (n > 0) el.textContent = String(n);
      else if (n === 0) el.textContent = "VAI!";
      else { clearInterval(timer); this.countdownOverlay.style.display = "none"; this.startGame(); }
    }, 650);
  }

  startGame() {
    this.gameState = "playing";
    this.scoreEl.style.display = "flex";
    this.pauseButton.style.display = "block";
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.turbo = 35;
    this.speed = this.baseSpeed;
    this.distance = 0;
    this.spawnTimer = 0.2;
    this.collectTimer = 0.7;
    this.sceneryTimer = 0;
    this.invincibleTimer = 1.2;
    this.currentLane = 1;
    this.targetX = 0;
    this.playerX = 0;
    this.player.position.set(0, this.playerY, 0);
    this.clearObjects();
    this._last = performance.now();
    this.updateHud();
  }

  restartGame() {
    this.gameoverOverlay.style.display = "none";
    this.startCountdown();
  }

  togglePause() {
    if (this.gameState === "playing") {
      this.gameState = "paused";
      this.pauseOverlay.style.display = "flex";
      this.pauseButton.textContent = "▶";
    } else if (this.gameState === "paused") {
      this.gameState = "playing";
      this.pauseOverlay.style.display = "none";
      this.pauseButton.textContent = "⏸";
      this._last = performance.now();
    }
  }

  clearObjects() {
    for (const o of this.obstacles) this.scene.remove(o.mesh);
    for (const o of this.collectibles) this.scene.remove(o.mesh);
    for (const p of this.particles) this.scene.remove(p.mesh);
    this.obstacles = [];
    this.collectibles = [];
    this.particles = [];
  }

  gameOver() {
    this.gameState = "gameover";
    const finalScore = Math.floor(this.score);
    const isNew = finalScore > this.highScore;
    if (isNew) this.highScore = finalScore;
    localStorage.setItem("racing_high", String(this.highScore));
    this.gameoverOverlay.querySelector("#racingFinalScore").textContent = finalScore;
    this.gameoverOverlay.querySelector("#racingBestScore").textContent = (isNew ? "🏆 NOVO " : "") + "Recorde: " + this.highScore;
    this.gameoverOverlay.style.display = "flex";
    this.scoreEl.style.display = "none";
    this.pauseButton.style.display = "none";
  }

  tick() {
    if (!this.running) return;
    this.animId = requestAnimationFrame(() => this.tick());
    const now = performance.now();
    const dt = Math.min((now - this._last) / 1000, 0.05);
    this._last = now;
    this.update(dt, now);
    this.renderer.render(this.scene, this.camera);
  }

  update(dt, now) {
    if (this.gameState !== "playing") {
      this.animateIdle(now);
      return;
    }

    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;
    this.turbo = Math.min(100, this.turbo + dt * 5);
    this.speed = Math.min(this.speedLimit, this.baseSpeed + this.distance * 0.000025 + (this.turboActive ? 0.65 : 0));
    if (this.turboActive) {
      this.turboDrain -= dt;
      this.turbo = Math.max(0, this.turbo - dt * 34);
      if (this.turboDrain <= 0 || this.turbo <= 0) this.turboActive = false;
    }

    this.distance += this.speed * dt * 22;
    this.road.material.map.offset.y -= this.speed * dt * 1.6;

    const diff = this.targetX - this.playerX;
    this.playerX += diff * Math.min(1, dt * 11);
    this.player.position.x = this.playerX;
    this.player.position.y = this.playerY + Math.sin(now * 0.012) * 0.025;
    this.player.rotation.z = -diff * 0.16;
    this.player.rotation.x = this.turboActive ? -0.09 : 0;
    this.player.visible = !(this.invincibleTimer > 0 && Math.floor(now / 100) % 2 === 0);
    for (const w of this.wheels) w.rotation.y -= dt * this.speed * 18;

    const shake = this.turboActive ? Math.sin(now * 0.04) * 0.035 : 0;
    this.camera.position.x += (this.playerX * 0.18 + shake - this.camera.position.x) * 0.06;
    this.camera.position.y += (4.8 + this.speed * 0.75 - this.camera.position.y) * 0.05;
    this.camera.position.z += (8.8 - this.camera.position.z) * 0.05;
    this.camera.lookAt(this.player.position.x * 0.28, 0.12, -6.2);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      this.spawnTimer = Math.max(0.34, 0.9 - this.speed * 0.17 + Math.random() * 0.45);
    }

    this.collectTimer -= dt;
    if (this.collectTimer <= 0) {
      this.spawnCollectible();
      this.collectTimer = 0.75 + Math.random() * 0.9;
    }

    this.updateObstacles(dt);
    this.updateCollectibles(dt, now);
    this.updateParticles(dt);

    this.score += dt * (3.2 + this.speed * 2.4) + (this.turboActive ? dt * 4 : 0);
    this.updateHud();
  }

  animateIdle(now) {
    if (this.player) {
      this.player.rotation.y = Math.sin(now * 0.001) * 0.1;
      this.player.position.y = this.playerY + Math.sin(now * 0.003) * 0.04;
    }
  }

  updateObstacles(dt) {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.mesh.position.z += this.speed * dt * 17.5;
      if (obs.spin) obs.mesh.rotation.y += dt * obs.spin;
      const dx = obs.mesh.position.x - this.playerX;
      const dz = obs.mesh.position.z - this.player.position.z;
      if (Math.abs(dx) < obs.hitX && Math.abs(dz) < obs.hitZ && dz > -0.55) {
        if (this.invincibleTimer <= 0) this.takeHit(obs.mesh.position);
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
        continue;
      }
      if (obs.mesh.position.z > 16) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }
  }

  updateCollectibles(dt, now) {
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.mesh.position.z += this.speed * dt * 17.5;
      col.mesh.rotation.y += dt * 3.6;
      col.mesh.position.y = col.baseY + Math.sin(now * 0.004 + col.phase) * 0.15;
      const dx = col.mesh.position.x - this.playerX;
      const dz = col.mesh.position.z - this.player.position.z;
      if (Math.abs(dx) < 1.2 && Math.abs(dz) < 1.5 && dz > -0.5) {
        this.combo++;
        this.score += col.points + this.combo;
        this.turbo = Math.min(100, this.turbo + col.turbo);
        this.spawnParticles(col.mesh.position, col.color, 12);
        this.scene.remove(col.mesh);
        this.collectibles.splice(i, 1);
        continue;
      }
      if (col.mesh.position.z > 16) {
        this.scene.remove(col.mesh);
        this.collectibles.splice(i, 1);
      }
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt + this.speed * dt * 10;
      p.mesh.scale.multiplyScalar(0.96);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  takeHit(pos) {
    this.lives--;
    this.combo = 0;
    this.invincibleTimer = 1.4;
    this.flashTimer = 0.3;
    this.turboActive = false;
    this.spawnParticles(pos, 0xff3333, 22);
    if (navigator.vibrate) navigator.vibrate(120);
    if (this.lives <= 0) this.gameOver();
    else this.updateHud();
  }

  useTurbo() {
    if (this.turbo >= 25 && !this.turboActive) {
      this.turboActive = true;
      this.turboDrain = 1.3;
      this.spawnParticles(this.player.position, 0xffdd33, 14);
      if (navigator.vibrate) navigator.vibrate(35);
    }
  }

  updateHud() {
    const s = this.scoreEl?.querySelector("#raceScore");
    const l = this.scoreEl?.querySelector("#raceLives");
    const t = this.scoreEl?.querySelector("#raceTurbo");
    if (s) s.textContent = String(Math.floor(this.score));
    if (l) l.textContent = String(this.lives);
    if (t) t.textContent = String(Math.floor(this.turbo));
  }

  spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const x = this.lanes[lane];
    if (lane === this.currentLane && Math.random() < 0.35) return;

    const group = new THREE.Group();
    const type = Math.random();
    if (type < 0.72) {
      const colors = [0xe74c3c, 0x3498db, 0x22c55e, 0xf59e0b, 0x8b5cf6, 0x14b8a6];
      const color = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.38, 1.85), mat);
      body.position.y = 0.38;
      body.castShadow = true;
      group.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.34, 0.72), new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.22, metalness: 0.04 }));
      cabin.position.set(0, 0.72, -0.22);
      cabin.castShadow = true;
      group.add(cabin);
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 }));
      bumper.position.set(0, 0.22, 0.95);
      group.add(bumper);
    } else {
      const coneMat = new THREE.MeshStandardMaterial({ color: 0xff7a00, roughness: 0.62, emissive: 0x331000, emissiveIntensity: 0.12 });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.95, 16), coneMat);
      cone.position.y = 0.05;
      cone.castShadow = true;
      group.add(cone);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      stripe.position.y = 0.2;
      group.add(stripe);
      group.spin = 1.4;
    }
    group.position.set(x, 0, -15 - Math.random() * 8);
    this.scene.add(group);
    this.obstacles.push({ mesh: group, lane, hitX: type < 0.72 ? 1.25 : 0.85, hitZ: type < 0.72 ? 1.6 : 1.05, spin: group.spin || 0 });
  }

  spawnCollectible() {
    const lane = Math.floor(Math.random() * 3);
    const x = this.lanes[lane];
    const types = [
      { color: 0xdc143c, points: 7, turbo: 7, geo: () => new THREE.SphereGeometry(0.26, 12, 12) },
      { color: 0xffd700, points: 7, turbo: 9, geo: () => new THREE.CylinderGeometry(0.16, 0.16, 0.34, 12) },
      { color: 0xff8c00, points: 11, turbo: 12, geo: () => new THREE.BoxGeometry(0.36, 0.14, 0.36) },
      { color: 0x34d399, points: 15, turbo: 18, geo: () => new THREE.TorusGeometry(0.22, 0.08, 8, 18) },
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    const mat = new THREE.MeshStandardMaterial({ color: type.color, emissive: type.color, emissiveIntensity: 0.42, roughness: 0.3 });
    const mesh = new THREE.Mesh(type.geo(), mat);
    mesh.position.set(x, 0.82, -12 - Math.random() * 7);
    mesh.castShadow = true;
    const light = new THREE.PointLight(type.color, 0.45, 2.5);
    mesh.add(light);
    this.scene.add(mesh);
    this.collectibles.push({ mesh, points: type.points, turbo: type.turbo, color: type.color, baseY: 0.82, phase: Math.random() * Math.PI * 2 });
  }

  spawnParticles(position, color, count) {
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.055 + Math.random() * 0.055, 6, 6),
        new THREE.MeshBasicMaterial({ color })
      );
      mesh.position.copy(position);
      mesh.position.y += 0.45;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2.2,
        vz: (Math.random() - 0.5) * 3,
        life: 0.45 + Math.random() * 0.45,
      });
    }
  }

  destroy() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this._resizeHandler) window.removeEventListener("resize", this._resizeHandler);
    if (this._keyHandler) window.removeEventListener("keydown", this._keyHandler);
    if (this.renderer) this.renderer.dispose();
    if (this.uiContainer && this.uiContainer.parentElement) this.uiContainer.parentElement.removeChild(this.uiContainer);
  }
}
