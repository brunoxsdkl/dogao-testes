class RacingGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = null;
    this.animId = null;
    this.running = true;
    this._last = null;

    this.score = 0;
    this.highScore = parseInt(localStorage.getItem("racing_high") || "0");
    this.gameState = "start"; // start | playing | gameover

    this.speed = 0;
    this.baseSpeed = 0.3;
    this.laneWidth = 2.8;
    this.lanes = [-2.8, 0, 2.8];
    this.currentLane = 1;
    this.targetX = 0;
    this.playerX = 0;
    this.playerY = -0.3;
    this.distance = 0;

    this.obstacles = [];
    this.collectibles = [];
    this.roadSegments = [];
    this.spawnTimer = 0;
    this.collectTimer = 0;

    this.tilt = 0;
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
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(this.w, this.h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x87ceeb);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 40, 80);

    this.camera = new THREE.PerspectiveCamera(65, this.w / this.h, 0.1, 120);
    this.camera.position.set(0, 5, 9);
    this.camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.8);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    this.scene.add(sun);
    this.sun = sun;

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3e1f00, 0.4);
    this.scene.add(hemi);

    // resize handler
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
    // Ground / road
    const roadTex = this.makeRoadTexture();
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(1, 200);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.9,
      metalness: 0,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(10, 400), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.5, -50);
    road.receiveShadow = true;
    this.scene.add(road);
    this.road = road;

    // Grass on sides
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,
      roughness: 1,
    });
    for (let side = -1; side <= 1; side += 2) {
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(30, 400), grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(side * 6.5, -0.5, -50);
      grass.receiveShadow = true;
      this.scene.add(grass);
    }

    // Road edges (guardrails)
    const railMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6 });
    for (let side = -1; side <= 1; side += 2) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 400), railMat);
      rail.position.set(side * 5.2, 0.1, -50);
      this.scene.add(rail);
    }

    // Player car - hot dog on wheels!
    this.player = new THREE.Group();

    // Sausage body
    const sausageMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 });
    const sausage = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.6, 12), sausageMat);
    sausage.rotation.z = Math.PI / 2;
    sausage.position.y = 0.3;
    sausage.castShadow = true;
    this.player.add(sausage);

    // Bun left
    const bunMat = new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.8 });
    const bunLeft = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.8), bunMat);
    bunLeft.position.set(-0.7, 0.15, 0);
    bunLeft.castShadow = true;
    this.player.add(bunLeft);

    // Bun right
    const bunRight = bunLeft.clone();
    bunRight.position.set(0.7, 0.15, 0);
    this.player.add(bunRight);

    // Mustard stripe
    const mustardMat = new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.2 });
    const mustard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 1.7), mustardMat);
    mustard.position.set(0, 0.55, 0);
    this.player.add(mustard);

    // Ketchup squiggle (small spheres)
    const ketchupMat = new THREE.MeshStandardMaterial({ color: 0xdc143c, emissive: 0xdc143c, emissiveIntensity: 0.15 });
    for (let i = -0.7; i <= 0.7; i += 0.35) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), ketchupMat);
      dot.position.set(0.15, 0.58, i);
      this.player.add(dot);
    }

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const wheelPositions = [
      [-0.5, 0.05, -0.6],
      [0.5, 0.05, -0.6],
      [-0.5, 0.05, 0.6],
      [0.5, 0.05, 0.6],
    ];
    for (const pos of wheelPositions) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 8), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      this.player.add(wheel);
    }

    // Hot dog flag/antenna
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.02), flagMat);
    flag.position.set(0, 0.85, 0.9);
    this.player.add(flag);

    this.player.position.set(0, this.playerY, 0);
    this.scene.add(this.player);

    // Oncoming traffic indicator - some trees/decoration on sides
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x2d5a1e, roughness: 1 });
    for (let i = 0; i < 30; i++) {
      const side2 = Math.random() > 0.5 ? 1 : -1;
      const tree = new THREE.Mesh(new THREE.ConeGeometry(0.4 + Math.random() * 0.3, 0.8 + Math.random() * 0.5, 6), treeMat);
      tree.position.set(side2 * (6 + Math.random() * 4), -0.1, -Math.random() * 80);
      this.scene.add(tree);
    }
  }

  makeRoadTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 256;
    const ctx = c.getContext("2d");

    // Asphalt
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(0, 0, 64, 256);

    // Lane markings - dashed center
    ctx.fillStyle = "#cccccc";
    for (let y = 0; y < 256; y += 24) {
      ctx.fillRect(30, y, 4, 12);
    }

    // Lane edges - solid
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(4, 0, 2, 256);
    ctx.fillRect(58, 0, 2, 256);

    return new THREE.CanvasTexture(c);
  }

  createUI() {
    this.uiContainer = document.createElement("div");
    this.uiContainer.style.cssText = `
      position: absolute; inset: 0; pointer-events: none; z-index: 10;
      font-family: 'Fredoka One', sans-serif; color: white;
    `;

    // Score
    this.scoreEl = document.createElement("div");
    this.scoreEl.style.cssText = `
      position: absolute; top: 16px; left: 0; right: 0; text-align: center;
      font-size: 32px; text-shadow: 0 3px 0 rgba(0,0,0,0.3); display: none;
    `;
    this.scoreEl.textContent = "0";
    this.uiContainer.appendChild(this.scoreEl);

    // Start overlay
    this.startOverlay = this.makeOverlay(`
      <div style="font-size:52px;margin-bottom:4px;">🌭</div>
      <div style="font-size:28px;">Dogão Racing</div>
      <div style="font-size:12px;margin:12px 0;opacity:0.6;font-family:'Press Start 2P',monospace">
        TOQUE PARA ACELERAR
      </div>
      <div style="font-size:10px;opacity:0.4;font-family:'Press Start 2P',monospace">
        ← toque lado esquerdo • lado direito →
      </div>
    `);
    this.uiContainer.appendChild(this.startOverlay);

    // Game over overlay
    this.gameoverOverlay = this.makeOverlay(`
      <div style="font-size:52px;margin-bottom:4px;">💥</div>
      <div style="font-size:24px;">DEU RUIM!</div>
      <div id="racingFinalScore" style="font-size:48px;margin:8px 0;">0</div>
      <div id="racingBestScore" style="font-size:14px;opacity:0.6;font-family:'Press Start 2P',monospace">
        Recorde: 0
      </div>
      <div style="margin-top:16px;font-size:14px;opacity:0.6;font-family:'Press Start 2P',monospace">
        TOQUE PARA REINICIAR
      </div>
    `, true);
    this.uiContainer.appendChild(this.gameoverOverlay);

    this.canvas.parentElement.appendChild(this.uiContainer);
  }

  makeOverlay(html, clickable = false) {
    const div = document.createElement("div");
    div.innerHTML = html;
    div.style.cssText = `
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; background: rgba(140,0,0,0.75);
      backdrop-filter: blur(4px); text-align: center;
      font-family: 'Fredoka One', sans-serif; color: white;
      ${clickable ? "" : "pointer-events: auto;"}
    `;
    if (clickable) {
      div.style.pointerEvents = "auto";
      div.style.cursor = "pointer";
    }
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
      if (this.gameState === "start") {
        this.startGame();
        return;
      }
      if (this.gameState === "gameover") {
        this.restartGame();
        return;
      }
      onTouch(e);
    };

    const onTouchEnd = (e) => {
      if (this.gameState !== "playing") return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      const x = (touch.clientX - rect.left) / rect.width;
      this.handleInput(x);
    };

    this.canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    this.canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    this._keyHandler = (e) => {
      if (this.gameState === "start" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        this.startGame();
        return;
      }
      if (this.gameState === "gameover" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        this.restartGame();
        return;
      }
      if (this.gameState !== "playing") return;
      if (e.key === "ArrowLeft" || e.key === "a") {
        this.currentLane = Math.max(0, this.currentLane - 1);
        this.targetX = this.lanes[this.currentLane];
      }
      if (e.key === "ArrowRight" || e.key === "d") {
        this.currentLane = Math.min(2, this.currentLane + 1);
        this.targetX = this.lanes[this.currentLane];
      }
    };
    window.addEventListener("keydown", this._keyHandler);

    // Click for desktop
    this.canvas.addEventListener("click", (e) => {
      if (this.gameState === "start") { this.startGame(); return; }
      if (this.gameState === "gameover") { this.restartGame(); return; }
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      this.handleInput(x);
    });
  }

  handleInput(x) {
    if (this.gameState !== "playing") return;
    if (x < 0.4) {
      this.currentLane = Math.max(0, this.currentLane - 1);
      this.targetX = this.lanes[this.currentLane];
    } else if (x > 0.6) {
      this.currentLane = Math.min(2, this.currentLane + 1);
      this.targetX = this.lanes[this.currentLane];
    }
  }

  startGame() {
    this.gameState = "playing";
    this.startOverlay.style.display = "none";
    this.scoreEl.style.display = "block";
    this.score = 0;
    this.speed = this.baseSpeed;
    this.distance = 0;
    this.spawnTimer = 0;
    this.collectTimer = 0;
    this.currentLane = 1;
    this.targetX = 0;
    this.playerX = 0;
    this.clearObjects();
    this._last = performance.now();
  }

  restartGame() {
    this.gameoverOverlay.style.display = "none";
    this.startGame();
  }

  clearObjects() {
    for (const o of this.obstacles) this.scene.remove(o.mesh);
    for (const o of this.collectibles) this.scene.remove(o.mesh);
    this.obstacles = [];
    this.collectibles = [];
  }

  gameOver() {
    this.gameState = "gameover";
    const isNew = this.score > this.highScore;
    if (isNew) this.highScore = this.score;
    localStorage.setItem("racing_high", String(this.highScore));

    this.gameoverOverlay.querySelector("#racingFinalScore").textContent = this.score;
    this.gameoverOverlay.querySelector("#racingBestScore").textContent =
      (isNew ? "🏆 NOVO " : "") + "Recorde: " + this.highScore;
    this.gameoverOverlay.style.display = "flex";
    this.scoreEl.style.display = "none";
  }

  tick() {
    if (!this.running) return;
    this.animId = requestAnimationFrame(() => this.tick());

    const now = performance.now();
    const dt = Math.min((now - this._last) / 1000, 0.05);
    this._last = now;

    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    if (this.gameState !== "playing") return;

    // Speed increases over time
    this.speed = this.baseSpeed + this.distance * 0.00002;
    const speedLimit = 1.8;
    if (this.speed > speedLimit) this.speed = speedLimit;

    this.distance += this.speed * dt * 20;

    // Move road
    this.road.position.z += this.speed * dt * 15;
    if (this.road.position.z > 10) this.road.position.z -= 20;

    // Smooth lane change
    const diff = this.targetX - this.playerX;
    this.playerX += diff * Math.min(1, dt * 10);
    this.player.position.x = this.playerX;
    this.player.position.y = this.playerY + Math.sin(now * 0.003) * 0.02;

    // Slight roll on lane change
    this.player.rotation.z = -diff * 0.15;

    // Camera follow
    const camTargetZ = this.player.position.z + 6;
    const camTargetY = 4 + this.speed * 0.5;
    this.camera.position.z += (camTargetZ - this.camera.position.z) * 0.05;
    this.camera.position.y += (camTargetY - this.camera.position.y) * 0.05;
    this.camera.lookAt(this.player.position.x * 0.3, 0, this.player.position.z - 5);

    // Spawn obstacles
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      this.spawnTimer = 0.8 + Math.random() * 0.6 / (this.speed * 0.5);
    }

    // Spawn collectibles
    this.collectTimer -= dt;
    if (this.collectTimer <= 0) {
      this.spawnCollectible();
      this.collectTimer = 1.0 + Math.random() * 0.8;
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.mesh.position.z += this.speed * dt * 15;

      // Check collision
      const dx = obs.mesh.position.x - this.playerX;
      const dz = obs.mesh.position.z - this.player.position.z;
      if (Math.abs(dx) < 1.4 && Math.abs(dz) < 1.8 && dz > -0.5) {
        this.gameOver();
        return;
      }

      if (obs.mesh.position.z > 15) {
        this.scene.remove(obs.mesh);
        this.obstacles.splice(i, 1);
      }
    }

    // Update collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.mesh.position.z += this.speed * dt * 15;
      col.mesh.rotation.y += dt * 3;

      // Check collection
      const dx = col.mesh.position.x - this.playerX;
      const dz = col.mesh.position.z - this.player.position.z;
      if (Math.abs(dx) < 1.2 && Math.abs(dz) < 1.5 && dz > -0.5) {
        this.score += col.points;
        this.scoreEl.textContent = String(this.score);
        // Scale pop effect
        col.mesh.scale.set(1.5, 1.5, 1.5);
        setTimeout(() => this.scene.remove(col.mesh), 50);
        this.collectibles.splice(i, 1);
        continue;
      }

      // Bobbing
      col.mesh.position.y = col.baseY + Math.sin(now * 0.004 + col.phase) * 0.15;

      if (col.mesh.position.z > 15) {
        this.scene.remove(col.mesh);
        this.collectibles.splice(i, 1);
      }
    }

    // Score over time
    this.score += dt * 2;
    this.scoreEl.textContent = String(Math.floor(this.score));
  }

  spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const x = this.lanes[lane];
    // Don't spawn directly on player
    if (lane === this.currentLane && this.obstacles.length > 0) return;

    const colors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });

    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 1.8), mat);
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.3 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.7), cabinMat);
    cabin.position.set(0, 0.7, -0.2);
    group.add(cabin);

    group.position.set(x, 0, -8 - Math.random() * 5);
    this.scene.add(group);
    this.obstacles.push({ mesh: group, lane });
  }

  spawnCollectible() {
    const lane = Math.floor(Math.random() * 3);
    const x = this.lanes[lane];
    const types = [
      { color: 0xdc143c, points: 5, name: "ketchup", geo: () => new THREE.SphereGeometry(0.25, 8, 8) },
      { color: 0xffd700, points: 5, name: "mustard", geo: () => new THREE.CylinderGeometry(0.15, 0.15, 0.3, 8) },
      { color: 0xff8c00, points: 8, name: "cheese", geo: () => new THREE.BoxGeometry(0.3, 0.12, 0.3) },
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    const mat = new THREE.MeshStandardMaterial({
      color: type.color,
      emissive: type.color,
      emissiveIntensity: 0.3,
    });
    const mesh = new THREE.Mesh(type.geo(), mat);
    mesh.position.set(x, 0.8, -8 - Math.random() * 4);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.collectibles.push({ mesh, points: type.points, baseY: 0.8, phase: Math.random() * Math.PI * 2 });
  }

  destroy() {
    this.running = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this._resizeHandler) window.removeEventListener("resize", this._resizeHandler);
    if (this._keyHandler) window.removeEventListener("keydown", this._keyHandler);

    // Dispose Three.js resources
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.uiContainer && this.uiContainer.parentElement) {
      this.uiContainer.parentElement.removeChild(this.uiContainer);
    }
  }
}
