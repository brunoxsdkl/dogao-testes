const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameoverScreen = document.getElementById("gameoverScreen");
const checkinScreen = document.getElementById("checkinScreen");
const scoreEl = document.getElementById("score");
const soundButton = document.getElementById("soundButton");
const playButton = document.getElementById("playButton");
const againButton = document.getElementById("againButton");
const confirmFollowButton = document.getElementById("confirmFollowButton");
const closeCheckinButton = document.getElementById("closeCheckinButton");
const followStatusButton = document.getElementById("followStatusButton");
const characterOptions = document.getElementById("characterOptions");
const difficultyOptions = document.getElementById("difficultyOptions");
const titleCharacter = document.getElementById("titleCharacter");
const titleEmoji = document.getElementById("titleEmoji");
const heroCharacter = document.getElementById("heroCharacter");
const recordLine = document.getElementById("recordLine");
const lastScoreLine = document.getElementById("lastScoreLine");
const deviceLine = document.getElementById("deviceLine");
const resultEmoji = document.getElementById("resultEmoji");
const resultTitle = document.getElementById("resultTitle");
const newRecord = document.getElementById("newRecord");
const finalScore = document.getElementById("finalScore");
const bestScore = document.getElementById("bestScore");
const lastLogLine = document.getElementById("lastLogLine");

const STORAGE_KEYS = {
  highScore: "flappy_hotdog_highscore",
  deviceId: "flappy_hotdog_device_id",
  lastRun: "flappy_hotdog_last_run",
  runs: "flappy_hotdog_runs",
  instagramCheckin: "flappy_hotdog_instagram_checkin",
};

function getOrCreateDeviceId() {
  let id = localStorage.getItem(STORAGE_KEYS.deviceId);
  if (!id) {
    id = `dogao-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(STORAGE_KEYS.deviceId, id);
  }
  return id;
}

function readJson(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback }
  catch { return fallback }
}

function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)) }

function saveRun(score, character, difficulty) {
  const run = { score, character, difficulty, deviceId: state.deviceId, playedAt: new Date().toISOString(), userAgent: navigator.userAgent }
  const runs = readJson(STORAGE_KEYS.runs, []);
  runs.unshift(run);
  writeJson(STORAGE_KEYS.runs, runs.slice(0, 20));
  writeJson(STORAGE_KEYS.lastRun, run);
  return run;
}

function formatDateTime(value) {
  if (!value) return "sem partida salva";
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
  } catch { return "partida salva" }
}

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
  width: 390, height: 760, dpr: 1, frame: 0,
  score: 0, best: Number(localStorage.getItem(STORAGE_KEYS.highScore) || 0),
  deviceId: getOrCreateDeviceId(),
  lastRun: readJson(STORAGE_KEYS.lastRun, null),
  instagramCheckin: readJson(STORAGE_KEYS.instagramCheckin, null),
  muted: false, character: "hotdog", difficulty: "medium",
  groundOffset: 0,
  hotdog: { x: 86, y: 300, v: 0, rot: 0, trail: [] },
  pipes: [],
  particles: [],
  coins: [],
  floatTexts: [],
  shake: 0,
  combo: 0,
  shield: false,
};

const dogCharacterImage = new Image();
dogCharacterImage.src = "assets/dog-character-y2uiqon.png";

const C = {
  gravity: 0.13, jump: -4, pipeW: 65, gap: 200, speed: 1.2,
  charW: 52, charH: 30, groundH: 70,
};

let audioContext = null;
let musicTimer = null;

function setupOptions() {
  characterOptions.innerHTML = "";
  difficultyOptions.innerHTML = "";

  for (const char of CHARACTERS) {
    const btn = document.createElement("button");
    btn.className = "card"; btn.type = "button"; btn.dataset.id = char.id;
    const visual = char.image ? `<img class="character-thumb" src="${char.image}" alt="${char.label}" />` : `<span class="emoji">${char.emoji}</span>`;
    btn.innerHTML = `${visual}<span>${char.label}</span><small>${char.description}</small>`;
    btn.addEventListener("click", () => { state.character = char.id; updateMenu() });
    characterOptions.appendChild(btn);
  }

  for (const diff of DIFFICULTIES) {
    const btn = document.createElement("button");
    btn.className = `card difficulty-${diff.id}`; btn.type = "button"; btn.dataset.id = diff.id;
    btn.innerHTML = `<span class="emoji">${diff.emoji}</span><span>${diff.label}</span><small>${diff.description}</small>`;
    btn.addEventListener("click", () => { state.difficulty = diff.id; updateMenu() });
    difficultyOptions.appendChild(btn);
  }
  updateMenu();
}

function updateMenu() {
  const char = CHARACTERS.find(c => c.id === state.character) || CHARACTERS[0];
  titleCharacter.textContent = char.label;
  titleEmoji.textContent = char.emoji;
  heroCharacter.innerHTML = char.image ? `<img src="${char.image}" alt="${char.label}" />` : char.emoji;
  recordLine.textContent = state.best > 0 ? `🏆 RECORDE: ${state.best}` : "RECORDE: 0";
  lastScoreLine.textContent = state.lastRun ? `${state.lastRun.score} pontos - ${formatDateTime(state.lastRun.playedAt)}` : "0 pontos";
  deviceLine.textContent = `ID ${state.deviceId.slice(-10).toUpperCase()}`;
  updateFollowStatus();
  for (const btn of characterOptions.children) btn.classList.toggle("active", btn.dataset.id === state.character);
  for (const btn of difficultyOptions.children) btn.classList.toggle("active", btn.dataset.id === state.difficulty);
}

function updateFollowStatus() {
  if (state.instagramCheckin) {
    followStatusButton.textContent = `Check-in feito em ${formatDateTime(state.instagramCheckin.checkedAt)}`;
    followStatusButton.classList.add("done"); return;
  }
  followStatusButton.textContent = "Check-in Instagram pendente";
  followStatusButton.classList.remove("done");
}

function openCheckin() {
  startScreen.classList.add("hidden"); gameoverScreen.classList.add("hidden"); checkinScreen.classList.remove("hidden");
}

function closeCheckin() { window.open("https://www.instagram.com/omegadogaocwb/", "_blank", "noopener,noreferrer") }

function showStartMenu() {
  state.mode = "start"; scoreEl.classList.remove("visible"); gameoverScreen.classList.add("hidden");
  checkinScreen.classList.add("hidden"); startScreen.classList.remove("hidden"); updateMenu();
}

function initializeAccessGate() {
  if (state.instagramCheckin) { showStartMenu(); return }
  openCheckin();
}

function confirmInstagramCheckin() {
  state.instagramCheckin = { profile: "https://www.instagram.com/omegadogaocwb/", deviceId: state.deviceId, checkedAt: new Date().toISOString() };
  writeJson(STORAGE_KEYS.instagramCheckin, state.instagramCheckin); showStartMenu();
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = Math.max(320, Math.floor(rect.width));
  state.height = Math.max(520, Math.floor(rect.height));
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  state.hotdog.x = state.width * 0.22;
}

function groundTop() { return state.height - C.groundH }

function addParticles(x, y, count, color, spread = 3) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * spread + 1
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 1, decay: 0.02 + Math.random() * 0.02, r: 2 + Math.random() * 3, color })
  }
}

function addFloat(x, y, text, color = '#ffd700') {
  state.floatTexts.push({ x, y, text, color, life: 1, vy: -1.2 })
}

function startGame() {
  state.mode = "playing"; state.frame = 0; state.score = 0; state.groundOffset = 0;
  state.hotdog.x = state.width * 0.22; state.hotdog.y = state.height * 0.42;
  state.hotdog.v = 0; state.hotdog.rot = 0; state.hotdog.trail = [];
  state.pipes = []; state.particles = []; state.coins = []; state.floatTexts = [];
  state.shake = 0; state.combo = 0; state.shield = false;
  scoreEl.textContent = "0"; scoreEl.classList.add("visible");
  startScreen.classList.add("hidden"); gameoverScreen.classList.add("hidden"); checkinScreen.classList.add("hidden");
  playMusic();
}

function requestStartGame() {
  if (!state.instagramCheckin) { openCheckin(); return }
  startGame();
}

function flap() {
  if (state.mode === "playing") {
    state.hotdog.v = C.jump;
    playJump();
    addParticles(state.hotdog.x - 15, state.hotdog.y, 4, 'rgba(255,255,255,0.5)', 2);
    return;
  }
  if (state.mode === "start" || state.mode === "gameover") requestStartGame();
}

function gameOver() {
  if (state.mode !== "playing") return;
  if (state.shield) {
    state.shield = false; state.hotdog.v = C.jump;
    addFloat(state.hotdog.x, state.hotdog.y - 30, 'ESCUDO!', '#00ff88');
    addParticles(state.hotdog.x, state.hotdog.y, 20, '#00ff88', 5);
    return;
  }

  state.mode = "gameover";
  state.shake = 8;
  stopMusic(); playCrash();
  addParticles(state.hotdog.x, state.hotdog.y, 30, '#ff4444', 6);
  addParticles(state.hotdog.x, state.hotdog.y, 15, '#ffaa00', 4);

  const isRecord = state.score > state.best;
  if (isRecord) { state.best = state.score; localStorage.setItem(STORAGE_KEYS.highScore, String(state.best)) }
  state.lastRun = saveRun(state.score, state.character, state.difficulty);

  const result = getResultMessage(state.score);
  resultEmoji.textContent = result.emoji;
  resultTitle.textContent = result.text;
  finalScore.textContent = state.score;
  bestScore.textContent = state.best;
  lastLogLine.textContent = `Salvo no dispositivo ${state.deviceId.slice(-10).toUpperCase()} em ${formatDateTime(state.lastRun.playedAt)}.`;
  newRecord.classList.toggle("hidden", !isRecord);
  scoreEl.classList.remove("visible");
  gameoverScreen.classList.remove("hidden");
  updateMenu();
}

function getResultMessage(score) {
  if (score >= 30) return { emoji: "🏆", text: "LENDARIO!" };
  if (score >= 20) return { emoji: "🏆", text: "INCRIVEL!" };
  if (score >= 10) return { emoji: "⭐", text: "MUITO BOM!" };
  if (score >= 5) return { emoji: "👏", text: "BOM JOGO!" };
  return { emoji: "💥", text: "O CACHORRO PEGOU!" };
}

function spawnCoin() {
  if (state.frame % 60 !== 0) return;
  const gapTop = 120;
  const gapBot = groundTop() - 80;
  state.coins.push({ x: state.width + 20, y: gapTop + Math.random() * (gapBot - gapTop), r: 10, collected: false, bob: Math.random() * Math.PI * 2 });
}

function spawnPipe() {
  const topLimit = 80;
  const bottomLimit = groundTop() - C.gap - 60;
  const gapY = topLimit + Math.random() * Math.max(80, bottomLimit - topLimit);
  let velocity = 0, moving = false;
  if (state.difficulty === "medium") { moving = Math.random() < 0.42; velocity = moving ? (Math.random() > 0.5 ? 0.42 : -0.42) : 0 }
  if (state.difficulty === "hard") { moving = true; velocity = Math.random() > 0.5 ? 1.1 : -1.1 }

  state.pipes.push({
    x: state.width + 10, gapY, scored: false, moving, velocity, minGap: topLimit, maxGap: bottomLimit,
    spawnedShield: false,
  });
}

function updateGame() {
  if (state.mode !== "playing") return;

  state.frame += 1;
  const speedMult = 1 + state.score * 0.012;
  const currentSpeed = C.speed * Math.min(speedMult, 2.5);
  state.groundOffset += currentSpeed;

  state.hotdog.v += C.gravity;
  state.hotdog.y += state.hotdog.v;
  const targetRot = Math.min(1.3, Math.max(-0.45, state.hotdog.v * 0.055));
  state.hotdog.rot += (targetRot - state.hotdog.rot) * 0.18;
  state.hotdog.trail.push({ x: state.hotdog.x, y: state.hotdog.y });
  if (state.hotdog.trail.length > 10) state.hotdog.trail.shift();

  if (state.shake > 0) state.shake *= 0.82;
  if (state.shake < 0.5) state.shake = 0;

  const interval = Math.max(100, 190 - Math.floor(state.score / 5) * 4);
  if (state.frame % interval === 0) spawnPipe();
  spawnCoin();

  for (const coin of state.coins) {
    coin.x -= currentSpeed;
    coin.bob += 0.05;
    if (!coin.collected) {
      const dx = state.hotdog.x - coin.x, dy = state.hotdog.y - coin.y;
      if (Math.hypot(dx, dy) < C.charW * 0.5 + coin.r) {
        coin.collected = true;
        state.score += 1;
        state.combo += 1;
        scoreEl.textContent = state.score;
        playScore();
        addParticles(coin.x, coin.y, 10, '#ffd700', 4);
        addFloat(coin.x, coin.y - 15, `+1`, '#ffd700');
        if (state.combo >= 5 && !state.shield && Math.random() < 0.3) {
          state.shield = true;
          addFloat(state.hotdog.x, state.hotdog.y - 40, '🛡️ ESCUDO!', '#00ff88');
        }
      }
    }
  }
  state.coins = state.coins.filter(c => c.x > -20 && !c.collected);

  for (const pipe of state.pipes) {
    pipe.x -= currentSpeed;
    if (pipe.moving) {
      pipe.gapY += pipe.velocity;
      if (pipe.gapY <= pipe.minGap) { pipe.gapY = pipe.minGap; pipe.velocity = Math.abs(pipe.velocity) }
      if (pipe.gapY >= pipe.maxGap) { pipe.gapY = pipe.maxGap; pipe.velocity = -Math.abs(pipe.velocity) }
    }
    if (!pipe.scored && pipe.x + C.pipeW < state.hotdog.x) {
      pipe.scored = true;
      state.score += 1;
      state.combo += 1;
      scoreEl.textContent = state.score;
      playScore();
      addFloat(state.width * 0.5, state.hotdog.y - 50, `+${state.combo}`, state.combo >= 5 ? '#ff6b6b' : '#fff');
    }
    if (hitsPipe(pipe)) gameOver();
  }
  state.pipes = state.pipes.filter(p => p.x > -C.pipeW - 20);

  if (state.hotdog.y + C.charH * 0.5 > groundTop() || state.hotdog.y - C.charH * 0.5 < 0) {
    gameOver();
  }
  state.hotdog.y = Math.max(state.hotdog.y, C.charH * 0.5);
}

function hitsPipe(pipe) {
  const x = state.hotdog.x, y = state.hotdog.y;
  const hw = C.charW * 0.38, hh = C.charH * 0.38;
  const inX = x + hw > pipe.x + 4 && x - hw < pipe.x + C.pipeW - 4;
  if (!inX) return false;
  return y - hh < pipe.gapY + 4 || y + hh > pipe.gapY + C.gap - 4;
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, state.height);
  grad.addColorStop(0, "#87CEEB"); grad.addColorStop(0.6, "#FFF0D0"); grad.addColorStop(1, "#FFD580");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, state.width, state.height);

  ctx.fillStyle = "rgba(200, 80, 60, 0.18)";
  const buildings = [
    { x: 0, w: 60, h: 120 }, { x: 70, w: 50, h: 90 }, { x: 130, w: 70, h: 150 },
    { x: 210, w: 45, h: 80 }, { x: 265, w: 80, h: 130 }, { x: 355, w: 55, h: 100 },
    { x: 420, w: 65, h: 160 }, { x: 490, w: 50, h: 95 }, { x: 550, w: 60, h: 140 },
    { x: 620, w: 45, h: 75 }, { x: 670, w: 70, h: 130 },
  ];
  const off = (state.groundOffset * 0.35) % 720;
  for (const b of buildings) {
    for (const dx of [0, 720]) {
      const x = b.x - off + dx;
      if (x > -b.w && x < state.width) ctx.fillRect(x, groundTop() - b.h, b.w, b.h);
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  const clouds = [
    { x: 80, y: 60, r: 22 }, { x: 260, y: 40, r: 16 }, { x: 450, y: 70, r: 25 },
    { x: 620, y: 35, r: 18 }, { x: 800, y: 55, r: 20 }, { x: 950, y: 45, r: 22 },
  ];
  for (const cloud of clouds) {
    const x = ((cloud.x - state.groundOffset * 0.45) % (state.width + 200) + state.width + 200) % (state.width + 200) - 100;
    ctx.beginPath(); ctx.arc(x, cloud.y, cloud.r, 0, Math.PI * 2);
    ctx.arc(x + cloud.r, cloud.y - cloud.r * 0.5, cloud.r * 0.8, 0, Math.PI * 2);
    ctx.arc(x + cloud.r * 1.8, cloud.y, cloud.r * 0.9, 0, Math.PI * 2); ctx.fill();
  }
}

function drawPipe(pipe) {
  const w = C.pipeW;
  const gapB = pipe.gapY + C.gap;
  const grad = ctx.createLinearGradient(pipe.x, 0, pipe.x + w, 0);
  grad.addColorStop(0, "#CC1111"); grad.addColorStop(0.2, "#E82020"); grad.addColorStop(0.8, "#E82020"); grad.addColorStop(1, "#AA0E0E");

  if (pipe.gapY > 0) {
    ctx.fillStyle = grad; drawRoundedRect(pipe.x, 0, w, pipe.gapY, 0); ctx.fill();
    ctx.strokeStyle = "#8B0000"; ctx.lineWidth = 2; ctx.stroke();
    drawPipeCap(pipe.x - 6, pipe.gapY - 22, w + 12, 22);
    ctx.fillStyle = "rgba(255,215,0,0.18)";
    for (let s = 1; s < 4; s++) ctx.fillRect(pipe.x + s * 15, 0, 5, Math.max(0, pipe.gapY - 22));
  }

  const lh = groundTop() - gapB;
  if (lh > 0) {
    ctx.fillStyle = grad; drawRoundedRect(pipe.x, gapB, w, lh, 0); ctx.fill();
    ctx.strokeStyle = "#8B0000"; ctx.lineWidth = 2; ctx.stroke();
    drawPipeCap(pipe.x - 6, gapB, w + 12, 22);
    ctx.fillStyle = "rgba(255,215,0,0.18)";
    for (let s = 1; s < 4; s++) ctx.fillRect(pipe.x + s * 15, gapB + 22, 5, Math.max(0, lh - 22));
  }
}

function drawPipeCap(x, y, w, h) {
  ctx.fillStyle = "#FFD700"; drawRoundedRect(x, y, w, h, 5); ctx.fill();
  ctx.strokeStyle = "#CCA800"; ctx.lineWidth = 1.5; ctx.stroke();
}

function drawGround() {
  const top = groundTop();
  const g = ctx.createLinearGradient(0, top, 0, state.height);
  g.addColorStop(0, "#CC1111"); g.addColorStop(0.15, "#B80E0E"); g.addColorStop(1, "#8B0000");
  ctx.fillStyle = g; ctx.fillRect(0, top, state.width, C.groundH);
  ctx.fillStyle = "#FFD700"; ctx.fillRect(0, top, state.width, 5);
  ctx.setLineDash([30, 20]); ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, top + 18); ctx.lineTo(state.width, top + 18); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,220,0,0.08)";
  const offset = state.groundOffset % 100;
  for (let x = -50 + offset; x < state.width + 50; x += 100) ctx.fillRect(x, top + 5, 50, C.groundH);
}

function drawCoins() {
  for (const coin of state.coins) {
    if (coin.collected) continue;
    const pulse = 1 + Math.sin(coin.bob) * 0.12;
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', coin.x, coin.y + 1);
    ctx.shadowBlur = 0;
  }
}

function drawCharacter(x, y, rot) {
  if (state.character === "burger") { drawBurger(x, y, rot); return }
  if (state.character === "dog") { drawDogImageCharacter(x, y, rot); return }
  drawHotDog(x, y, rot);
}

function drawDogImageCharacter(x, y, rot) {
  if (!dogCharacterImage.complete || !dogCharacterImage.naturalWidth) { drawDogCharacter(x, y, rot); return }
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.ellipse(0, 26, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(dogCharacterImage, -34, -34, 68, 68); ctx.restore();
}

function drawHotDog(x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const hw = C.charW / 2, hh = C.charH / 2;
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.beginPath(); ctx.ellipse(2, hh + 4, hw * 0.8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#D4903C"; ctx.beginPath(); ctx.ellipse(0, hh * 0.4, hw, hh * 0.6, 0, 0, Math.PI); ctx.fill(); ctx.strokeStyle = "#B8752E"; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = "#A0392B"; ctx.beginPath(); ctx.ellipse(0, 0, hw * 0.85, hh * 0.45, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#7B2B20"; ctx.stroke();
  ctx.strokeStyle = "#F1C40F"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-hw * 0.55, 0);
  for (let i = 0; i < 6; i++) { const lx = -hw * 0.55 + (i + 1) * ((hw * 1.1) / 6); const ly = i % 2 === 0 ? -hh * 0.25 : hh * 0.25; ctx.lineTo(lx, ly) }
  ctx.stroke();
  ctx.fillStyle = "#E8A84C"; ctx.beginPath(); ctx.ellipse(0, -hh * 0.2, hw, hh * 0.55, 0, Math.PI, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#D4903C"; ctx.stroke();
  drawFace(-hw * 0.18, hw * 0.18, -hh * 0.28, "#7B2B20");
  if (state.shield) {
    ctx.strokeStyle = `rgba(0,255,136,${0.4 + Math.sin(state.frame * 0.1) * 0.3})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, Math.max(hw, hh) + 6, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawBurger(x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const hw = C.charW / 2, hh = (C.charH + 10) / 2;
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.beginPath(); ctx.ellipse(2, hh + 4, hw * 0.8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#D4903C"; ctx.beginPath(); ctx.ellipse(0, hh * 0.5, hw, hh * 0.45, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = "#3CB371"; ctx.beginPath(); ctx.ellipse(0, hh * 0.15, hw * 0.92, hh * 0.25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#8B4513"; ctx.beginPath(); ctx.ellipse(0, -hh * 0.1, hw * 0.85, hh * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#F4D03F"; ctx.beginPath(); ctx.ellipse(0, -hh * 0.3, hw * 0.9, hh * 0.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#E8A84C"; ctx.beginPath(); ctx.ellipse(0, -hh * 0.52, hw, hh * 0.55, 0, Math.PI, Math.PI * 2); ctx.fill();
  drawFace(-hw * 0.18, hw * 0.18, -hh * 0.62, "#8B4513"); ctx.restore();
}

function drawDogCharacter(x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  const hw = (C.charW + 8) / 2, hh = (C.charH + 15) / 2;
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.beginPath(); ctx.ellipse(2, hh + 4, hw * 0.8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FF6600"; ctx.beginPath(); ctx.ellipse(0, hh * 0.1, hw * 0.7, hh * 0.65, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#111"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -hh * 0.45, hw * 0.55, hh * 0.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#FFCC99"; ctx.beginPath(); ctx.ellipse(0, -hh * 0.3, hw * 0.35, hh * 0.28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#222"; ctx.beginPath(); ctx.ellipse(0, -hh * 0.35, hw * 0.1, hw * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  drawFace(-hw * 0.15, hw * 0.15, -hh * 0.55, "#222");
  ctx.strokeStyle = "#FF6600"; ctx.lineWidth = hw * 0.12; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-hw * 0.5, hh * 0.3); ctx.quadraticCurveTo(-hw * 0.82, -hh * 0.1, -hw * 0.6, -hh * 0.4); ctx.stroke();
  ctx.fillStyle = "#D4903C"; ctx.beginPath(); ctx.ellipse(hw * 0.35, -hh * 0.18, hw * 0.2, hh * 0.12, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFace(lx, rx, ey, mc) {
  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.arc(lx, ey, 5, 0, Math.PI * 2); ctx.arc(rx, ey, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath(); ctx.arc(lx + 1, ey + 1.5, 2.5, 0, Math.PI * 2); ctx.arc(rx + 1, ey + 1.5, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.arc(lx + 2, ey - 2, 1.2, 0, Math.PI * 2); ctx.arc(rx + 2, ey - 2, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = mc; ctx.lineWidth = 1.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, ey + 6, 4, 0.2, Math.PI - 0.2); ctx.stroke();
}

function render() {
  if (state.shake > 0.5) {
    ctx.save(); ctx.translate((Math.random() - 0.5) * state.shake * 2, (Math.random() - 0.5) * state.shake * 2)
  }

  drawBackground();
  drawCoins();
  for (const pipe of state.pipes) drawPipe(pipe);
  drawGround();

  const b = state.hotdog;
  for (let i = 0; i < b.trail.length; i++) {
    const t = b.trail[i], a = i / b.trail.length;
    ctx.fillStyle = `rgba(255,200,100,${a * 0.15})`;
    ctx.beginPath(); ctx.arc(t.x, t.y, 6 * a, 0, Math.PI * 2); ctx.fill();
  }

  if (state.mode === "playing" || state.mode === "gameover") {
    drawCharacter(b.x, b.y, b.rot);
  } else {
    const fy = state.height * 0.42 + Math.sin(Date.now() * 0.0025) * 14;
    const fr = Math.sin(Date.now() * 0.002) * 0.08;
    drawCharacter(state.width * 0.22, fy, fr);
  }

  for (const p of state.particles) {
    ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const ft of state.floatTexts) {
    ctx.globalAlpha = ft.life;
    ctx.fillStyle = ft.color; ctx.font = 'bold 20px "Fredoka One", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;

  if (state.shield && state.mode === 'playing') {
    ctx.fillStyle = `rgba(0,255,136,${0.2 + Math.sin(state.frame * 0.08) * 0.1})`;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('🛡️ ESCUDO', state.width - 10, 10);
  }

  if (state.shake > 0.5) ctx.restore();
}

function audio() {
  if (state.muted) return null;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function tone(type, freq, start, dur, vol) {
  const a = audio(); if (!a) return;
  const g = a.createGain(); g.gain.setValueAtTime(vol, start); g.gain.exponentialRampToValueAtTime(0.0001, start + dur); g.connect(a.destination);
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, start); o.connect(g); o.start(start); o.stop(start + dur + 0.02);
}

function playJump() {
  const a = audio(); if (!a) return; const n = a.currentTime;
  tone("square", 380, n, 0.16, 0.22); tone("square", 700, n + 0.06, 0.1, 0.13);
}

function playScore() {
  const a = audio(); if (!a) return; const n = a.currentTime;
  tone("sine", 880 + state.combo * 20, n, 0.08, 0.14);
  tone("sine", 1200 + state.combo * 30, n + 0.06, 0.1, 0.12);
  if (state.combo > 0 && state.combo % 5 === 0) {
    setTimeout(() => { tone("sine", 1400, a.currentTime, 0.12, 0.18) }, 120);
  }
}

function playCrash() {
  const a = audio(); if (!a) return; const n = a.currentTime;
  tone("sawtooth", 400, n, 0.5, 0.36); tone("sine", 80, n, 0.3, 0.45);
}

function playMusic() {
  stopMusic(); if (state.muted) return;
  const m = [330, 392, 440, 392, 330, 330, 392, 440, 0, 440, 392, 330, 294, 262, 330, 392];
  let i = 0;
  musicTimer = window.setInterval(() => {
    const a = audio(); if (!a || state.mode !== "playing") return;
    const note = m[i % m.length]; if (note) tone("square", note, a.currentTime, 0.16, 0.045);
    i++;
  }, 205);
}

function stopMusic() { if (musicTimer) window.clearInterval(musicTimer); musicTimer = null }

function toggleSound(event) {
  event.stopPropagation(); state.muted = !state.muted;
  soundButton.textContent = state.muted ? "🔇" : "🔊";
  soundButton.setAttribute("aria-label", state.muted ? "Ativar som" : "Silenciar som");
  if (state.muted) stopMusic(); if (!state.muted && state.mode === "playing") playMusic();
}

function updateParticles() {
  for (const p of state.particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= p.decay }
  state.particles = state.particles.filter(p => p.life > 0);
  for (const ft of state.floatTexts) { ft.y += ft.vy; ft.life -= 0.018 }
  state.floatTexts = state.floatTexts.filter(ft => ft.life > 0);
}

let last = performance.now();
function loop(now) {
  const elapsed = now - last; last = now;
  const steps = Math.max(1, Math.min(3, Math.round(elapsed / 16.67)));
  for (let i = 0; i < steps; i++) updateGame();
  updateParticles();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") { event.preventDefault(); flap() }
});
canvas.addEventListener("pointerdown", (event) => { event.preventDefault(); flap() });
playButton.addEventListener("click", (event) => { event.stopPropagation(); requestStartGame() });
againButton.addEventListener("click", (event) => { event.stopPropagation(); startGame() });
soundButton.addEventListener("click", toggleSound);
confirmFollowButton.addEventListener("click", (event) => { event.stopPropagation(); confirmInstagramCheckin() });
closeCheckinButton.addEventListener("click", (event) => { event.stopPropagation(); closeCheckin() });
followStatusButton.addEventListener("click", (event) => { event.stopPropagation(); openCheckin() });

setupOptions();
resize();
initializeAccessGate();
requestAnimationFrame(loop);
