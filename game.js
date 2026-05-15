const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameoverScreen = document.getElementById("gameoverScreen");
const scoreEl = document.getElementById("score");
const soundButton = document.getElementById("soundButton");
const playButton = document.getElementById("playButton");
const againButton = document.getElementById("againButton");
const characterOptions = document.getElementById("characterOptions");
const difficultyOptions = document.getElementById("difficultyOptions");
const titleCharacter = document.getElementById("titleCharacter");
const titleEmoji = document.getElementById("titleEmoji");
const heroCharacter = document.getElementById("heroCharacter");
const recordLine = document.getElementById("recordLine");
const resultEmoji = document.getElementById("resultEmoji");
const resultTitle = document.getElementById("resultTitle");
const newRecord = document.getElementById("newRecord");
const finalScore = document.getElementById("finalScore");
const bestScore = document.getElementById("bestScore");

const CHARACTERS = [
  { id: "hotdog", label: "Hot Dog", emoji: "🌭", description: "O classico!" },
  { id: "burger", label: "X-Burguer", emoji: "🍔", description: "Poderoso!" },
  {
    id: "dog",
    label: "Dogao",
    emoji: "🐕",
    image: "assets/dog-character.png",
    description: "Mascote!",
  },
];

const DIFFICULTIES = [
  { id: "easy", label: "Facil", emoji: "😊", description: "Canos parados" },
  { id: "medium", label: "Medio", emoji: "😤", description: "Alguns se mexem" },
  { id: "hard", label: "Dificil", emoji: "💀", description: "Canos loucos!" },
];

const state = {
  mode: "start",
  width: 390,
  height: 760,
  dpr: 1,
  frame: 0,
  score: 0,
  best: Number(localStorage.getItem("flappy_hotdog_highscore") || 0),
  muted: false,
  character: "hotdog",
  difficulty: "medium",
  groundOffset: 0,
  hotdog: { x: 86, y: 300, velocity: 0, rotation: 0 },
  pipes: [],
};

const dogCharacterImage = new Image();
dogCharacterImage.src = "assets/dog-character.png";

const CONSTANTS = {
  gravity: 0.13,
  jump: -4,
  pipeWidth: 65,
  gap: 200,
  speed: 1.2,
  characterWidth: 52,
  characterHeight: 30,
  groundHeight: 70,
};

let audioContext = null;
let musicTimer = null;

function setupOptions() {
  characterOptions.innerHTML = "";
  difficultyOptions.innerHTML = "";

  for (const character of CHARACTERS) {
    const button = document.createElement("button");
    button.className = "card";
    button.type = "button";
    button.dataset.id = character.id;
    const visual = character.image
      ? `<img class="character-thumb" src="${character.image}" alt="${character.label}" />`
      : `<span class="emoji">${character.emoji}</span>`;
    button.innerHTML = `
      ${visual}
      <span>${character.label}</span>
      <small>${character.description}</small>
    `;
    button.addEventListener("click", () => {
      state.character = character.id;
      updateMenu();
    });
    characterOptions.appendChild(button);
  }

  for (const difficulty of DIFFICULTIES) {
    const button = document.createElement("button");
    button.className = `card difficulty-${difficulty.id}`;
    button.type = "button";
    button.dataset.id = difficulty.id;
    button.innerHTML = `
      <span class="emoji">${difficulty.emoji}</span>
      <span>${difficulty.label}</span>
      <small>${difficulty.description}</small>
    `;
    button.addEventListener("click", () => {
      state.difficulty = difficulty.id;
      updateMenu();
    });
    difficultyOptions.appendChild(button);
  }

  updateMenu();
}

function updateMenu() {
  const character = CHARACTERS.find((item) => item.id === state.character) || CHARACTERS[0];
  titleCharacter.textContent = character.label;
  titleEmoji.textContent = character.emoji;
  heroCharacter.innerHTML = character.image
    ? `<img src="${character.image}" alt="${character.label}" />`
    : character.emoji;
  recordLine.textContent = state.best > 0 ? `🏆 RECORDE: ${state.best}` : "RECORDE: 0";

  for (const button of characterOptions.children) {
    button.classList.toggle("active", button.dataset.id === state.character);
  }
  for (const button of difficultyOptions.children) {
    button.classList.toggle("active", button.dataset.id === state.difficulty);
  }
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

function groundTop() {
  return state.height - CONSTANTS.groundHeight;
}

function startGame() {
  state.mode = "playing";
  state.frame = 0;
  state.score = 0;
  state.groundOffset = 0;
  state.hotdog.x = state.width * 0.22;
  state.hotdog.y = state.height * 0.42;
  state.hotdog.velocity = 0;
  state.hotdog.rotation = 0;
  state.pipes = [];
  scoreEl.textContent = "0";
  scoreEl.classList.add("visible");
  startScreen.classList.add("hidden");
  gameoverScreen.classList.add("hidden");
  playMusic();
}

function flap() {
  if (state.mode === "playing") {
    state.hotdog.velocity = CONSTANTS.jump;
    playJump();
    return;
  }

  if (state.mode === "start" || state.mode === "gameover") {
    startGame();
  }
}

function gameOver() {
  if (state.mode !== "playing") return;

  state.mode = "gameover";
  stopMusic();
  playCrash();

  const isRecord = state.score > state.best;
  if (isRecord) {
    state.best = state.score;
    localStorage.setItem("flappy_hotdog_highscore", String(state.best));
  }

  const result = getResultMessage(state.score);
  resultEmoji.textContent = result.emoji;
  resultTitle.textContent = result.text;
  finalScore.textContent = state.score;
  bestScore.textContent = state.best;
  newRecord.classList.toggle("hidden", !isRecord);
  scoreEl.classList.remove("visible");
  gameoverScreen.classList.remove("hidden");
  updateMenu();
}

function getResultMessage(score) {
  if (score >= 20) return { emoji: "🏆", text: "INCRIVEL!" };
  if (score >= 10) return { emoji: "⭐", text: "MUITO BOM!" };
  if (score >= 5) return { emoji: "👏", text: "BOM JOGO!" };
  return { emoji: "💥", text: "O CACHORRO PEGOU!" };
}

function spawnPipe() {
  const topLimit = 80;
  const bottomLimit = groundTop() - CONSTANTS.gap - 60;
  const gapY = topLimit + Math.random() * Math.max(80, bottomLimit - topLimit);
  const dogSide = state.pipes.length % 4 === 2 ? (Math.random() > 0.5 ? "top" : "bottom") : null;

  let velocity = 0;
  let moving = false;
  if (state.difficulty === "medium") {
    moving = Math.random() < 0.42;
    velocity = moving ? (Math.random() > 0.5 ? 0.42 : -0.42) : 0;
  }
  if (state.difficulty === "hard") {
    moving = true;
    velocity = Math.random() > 0.5 ? 1.1 : -1.1;
  }

  state.pipes.push({
    x: state.width + 10,
    gapY,
    dogSide,
    scored: false,
    moving,
    velocity,
    minGap: topLimit,
    maxGap: bottomLimit,
  });
}

function updateGame() {
  if (state.mode !== "playing") return;

  state.frame += 1;
  state.groundOffset += CONSTANTS.speed;
  state.hotdog.velocity += CONSTANTS.gravity;
  state.hotdog.y += state.hotdog.velocity;

  const targetRotation = Math.min(1.3, Math.max(-0.45, state.hotdog.velocity * 0.055));
  state.hotdog.rotation += (targetRotation - state.hotdog.rotation) * 0.18;

  const interval = Math.max(130, 190 - Math.floor(state.score / 5) * 4);
  if (state.frame % interval === 0) spawnPipe();

  for (const pipe of state.pipes) {
    pipe.x -= CONSTANTS.speed;

    if (pipe.moving) {
      pipe.gapY += pipe.velocity;
      if (pipe.gapY <= pipe.minGap) {
        pipe.gapY = pipe.minGap;
        pipe.velocity = Math.abs(pipe.velocity);
      }
      if (pipe.gapY >= pipe.maxGap) {
        pipe.gapY = pipe.maxGap;
        pipe.velocity = -Math.abs(pipe.velocity);
      }
    }

    if (!pipe.scored && pipe.x + CONSTANTS.pipeWidth < state.hotdog.x) {
      pipe.scored = true;
      state.score += 1;
      scoreEl.textContent = state.score;
      playScore();
    }

    if (hitsPipe(pipe)) gameOver();
  }

  state.pipes = state.pipes.filter((pipe) => pipe.x > -CONSTANTS.pipeWidth - 20);

  if (
    state.hotdog.y + CONSTANTS.characterHeight * 0.5 > groundTop() ||
    state.hotdog.y - CONSTANTS.characterHeight * 0.5 < 0
  ) {
    gameOver();
  }
}

function hitsPipe(pipe) {
  const x = state.hotdog.x;
  const y = state.hotdog.y;
  const halfWidth = CONSTANTS.characterWidth * 0.38;
  const halfHeight = CONSTANTS.characterHeight * 0.38;

  const inX = x + halfWidth > pipe.x + 4 && x - halfWidth < pipe.x + CONSTANTS.pipeWidth - 4;
  if (!inX) return false;

  return y - halfHeight < pipe.gapY + 4 || y + halfHeight > pipe.gapY + CONSTANTS.gap - 4;
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, "#87CEEB");
  gradient.addColorStop(0.7, "#FFF0D0");
  gradient.addColorStop(1, "#FFD580");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.fillStyle = "rgba(200, 80, 60, 0.18)";
  const buildings = [
    { x: 0, w: 60, h: 120 },
    { x: 70, w: 50, h: 90 },
    { x: 130, w: 70, h: 150 },
    { x: 210, w: 45, h: 80 },
    { x: 265, w: 80, h: 130 },
    { x: 355, w: 55, h: 100 },
    { x: 420, w: 65, h: 160 },
    { x: 495, w: 40, h: 85 },
    { x: 545, w: 70, h: 115 },
  ];
  const buildingOffset = (state.groundOffset * 0.35) % 620;
  for (const building of buildings) {
    const x = ((building.x - buildingOffset) % 620 + 620) % 620 - 10;
    ctx.fillRect(x, groundTop() - building.h, building.w, building.h);
    ctx.fillRect(x + 620, groundTop() - building.h, building.w, building.h);
  }

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  const clouds = [
    { x: 80, y: 60, r: 22 },
    { x: 200, y: 40, r: 16 },
    { x: 380, y: 70, r: 25 },
    { x: 560, y: 35, r: 18 },
    { x: 700, y: 55, r: 20 },
    { x: 900, y: 45, r: 22 },
  ];

  for (const cloud of clouds) {
    const x = ((cloud.x - state.groundOffset * 0.45) % (state.width + 200) + state.width + 200) %
      (state.width + 200) -
      100;
    ctx.beginPath();
    ctx.arc(x, cloud.y, cloud.r, 0, Math.PI * 2);
    ctx.arc(x + cloud.r, cloud.y - cloud.r * 0.5, cloud.r * 0.8, 0, Math.PI * 2);
    ctx.arc(x + cloud.r * 1.8, cloud.y, cloud.r * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPipe(pipe) {
  const width = CONSTANTS.pipeWidth;
  const gapBottom = pipe.gapY + CONSTANTS.gap;

  if (pipe.gapY > 0) {
    const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + width, 0);
    gradient.addColorStop(0, "#CC1111");
    gradient.addColorStop(0.2, "#E82020");
    gradient.addColorStop(0.8, "#E82020");
    gradient.addColorStop(1, "#AA0E0E");
    ctx.fillStyle = gradient;
    drawRoundedRect(pipe.x, 0, width, pipe.gapY, 0);
    ctx.fill();
    ctx.strokeStyle = "#8B0000";
    ctx.lineWidth = 2;
    ctx.stroke();

    drawPipeCap(pipe.x - 6, pipe.gapY - 22, width + 12, 22);

    ctx.fillStyle = "rgba(255, 215, 0, 0.18)";
    for (let stripe = 1; stripe < 4; stripe += 1) {
      ctx.fillRect(pipe.x + stripe * 15, 0, 5, Math.max(0, pipe.gapY - 22));
    }
  }

  const lowerHeight = groundTop() - gapBottom;
  if (lowerHeight > 0) {
    const gradient = ctx.createLinearGradient(pipe.x, gapBottom, pipe.x + width, gapBottom);
    gradient.addColorStop(0, "#CC1111");
    gradient.addColorStop(0.2, "#E82020");
    gradient.addColorStop(0.8, "#E82020");
    gradient.addColorStop(1, "#AA0E0E");
    ctx.fillStyle = gradient;
    drawRoundedRect(pipe.x, gapBottom, width, lowerHeight, 0);
    ctx.fill();
    ctx.strokeStyle = "#8B0000";
    ctx.lineWidth = 2;
    ctx.stroke();

    drawPipeCap(pipe.x - 6, gapBottom, width + 12, 22);

    ctx.fillStyle = "rgba(255, 215, 0, 0.18)";
    for (let stripe = 1; stripe < 4; stripe += 1) {
      ctx.fillRect(pipe.x + stripe * 15, gapBottom + 22, 5, Math.max(0, lowerHeight - 22));
    }
  }

  if (pipe.dogSide === "top" && pipe.gapY > 30) {
    drawTinyDog(pipe.x + width / 2, pipe.gapY - 12, 38, false);
  }
  if (pipe.dogSide === "bottom" && lowerHeight > 30) {
    drawTinyDog(pipe.x + width / 2, gapBottom + 12, 38, true);
  }
}

function drawPipeCap(x, y, width, height) {
  ctx.fillStyle = "#FFD700";
  drawRoundedRect(x, y, width, height, 5);
  ctx.fill();
  ctx.strokeStyle = "#CCA800";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawTinyDog(x, y, size, upsideDown) {
  ctx.save();
  ctx.translate(x, y);
  if (upsideDown) ctx.scale(1, -1);

  ctx.fillStyle = "#C0392B";
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.45, size * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(size * 0.3, -size * 0.55, size * 0.32, size * 0.3, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#A93226";
  ctx.beginPath();
  ctx.ellipse(size * 0.18, -size * 0.8, size * 0.1, size * 0.22, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#E8A090";
  ctx.beginPath();
  ctx.ellipse(size * 0.55, -size * 0.5, size * 0.15, size * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.ellipse(size * 0.62, -size * 0.54, size * 0.07, size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(size * 0.35, -size * 0.62, size * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(size * 0.37, -size * 0.61, size * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7B1A10";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size * 0.55, -size * 0.42, size * 0.1, Math.PI + 0.3, -0.3);
  ctx.stroke();

  ctx.restore();
}

function drawGround() {
  const top = groundTop();
  const groundGradient = ctx.createLinearGradient(0, top, 0, state.height);
  groundGradient.addColorStop(0, "#CC1111");
  groundGradient.addColorStop(0.15, "#B80E0E");
  groundGradient.addColorStop(1, "#8B0000");
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, top, state.width, CONSTANTS.groundHeight);

  ctx.fillStyle = "#FFD700";
  ctx.fillRect(0, top, state.width, 5);

  ctx.setLineDash([30, 20]);
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, top + 18);
  ctx.lineTo(state.width, top + 18);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(255,220,0,0.08)";
  const tile = 50;
  const offset = state.groundOffset % (tile * 2);
  for (let x = -tile + offset; x < state.width + tile; x += tile) {
    ctx.fillRect(x, top + 5, tile / 2, CONSTANTS.groundHeight);
  }
}

function drawCharacter(x, y, rotation) {
  if (state.character === "burger") {
    drawBurger(x, y, rotation);
    return;
  }
  if (state.character === "dog") {
    drawDogImageCharacter(x, y, rotation);
    return;
  }
  drawHotDog(x, y, rotation);
}

function drawDogImageCharacter(x, y, rotation) {
  if (!dogCharacterImage.complete || !dogCharacterImage.naturalWidth) {
    drawDogCharacter(x, y, rotation);
    return;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const width = 68;
  const height = 68;
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(0, height * 0.38, width * 0.32, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(dogCharacterImage, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawHotDog(x, y, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const width = CONSTANTS.characterWidth;
  const height = CONSTANTS.characterHeight;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(2, halfHeight + 4, halfWidth * 0.8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#D4903C";
  ctx.beginPath();
  ctx.ellipse(0, halfHeight * 0.4, halfWidth, halfHeight * 0.6, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = "#B8752E";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#A0392B";
  ctx.beginPath();
  ctx.ellipse(0, 0, halfWidth * 0.85, halfHeight * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7B2B20";
  ctx.stroke();

  ctx.strokeStyle = "#F1C40F";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-halfWidth * 0.55, 0);
  for (let i = 0; i < 6; i += 1) {
    const lineX = -halfWidth * 0.55 + (i + 1) * ((halfWidth * 1.1) / 6);
    const lineY = i % 2 === 0 ? -halfHeight * 0.25 : halfHeight * 0.25;
    ctx.lineTo(lineX, lineY);
  }
  ctx.stroke();

  ctx.fillStyle = "#E8A84C";
  ctx.beginPath();
  ctx.ellipse(0, -halfHeight * 0.2, halfWidth, halfHeight * 0.55, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#D4903C";
  ctx.stroke();

  drawFace(-halfWidth * 0.18, halfWidth * 0.18, -halfHeight * 0.28, "#7B2B20");
  ctx.restore();
}

function drawBurger(x, y, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const width = CONSTANTS.characterWidth;
  const height = CONSTANTS.characterHeight + 10;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(2, halfHeight + 4, halfWidth * 0.8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#D4903C";
  ctx.beginPath();
  ctx.ellipse(0, halfHeight * 0.5, halfWidth, halfHeight * 0.45, 0, 0, Math.PI);
  ctx.fill();

  ctx.fillStyle = "#3CB371";
  ctx.beginPath();
  ctx.ellipse(0, halfHeight * 0.15, halfWidth * 0.92, halfHeight * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.ellipse(0, -halfHeight * 0.1, halfWidth * 0.85, halfHeight * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#F4D03F";
  ctx.beginPath();
  ctx.ellipse(0, -halfHeight * 0.3, halfWidth * 0.9, halfHeight * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#E8A84C";
  ctx.beginPath();
  ctx.ellipse(0, -halfHeight * 0.52, halfWidth, halfHeight * 0.55, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  drawFace(-halfWidth * 0.18, halfWidth * 0.18, -halfHeight * 0.62, "#8B4513");
  ctx.restore();
}

function drawDogCharacter(x, y, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const width = CONSTANTS.characterWidth + 8;
  const height = CONSTANTS.characterHeight + 15;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(2, halfHeight + 4, halfWidth * 0.8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FF6600";
  ctx.beginPath();
  ctx.ellipse(0, halfHeight * 0.1, halfWidth * 0.7, halfHeight * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, -halfHeight * 0.45, halfWidth * 0.55, halfHeight * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#FFCC99";
  ctx.beginPath();
  ctx.ellipse(0, -halfHeight * 0.3, halfWidth * 0.35, halfHeight * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.ellipse(0, -halfHeight * 0.35, halfWidth * 0.1, halfWidth * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  drawFace(-halfWidth * 0.15, halfWidth * 0.15, -halfHeight * 0.55, "#222");

  ctx.strokeStyle = "#FF6600";
  ctx.lineWidth = halfWidth * 0.12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-halfWidth * 0.5, halfHeight * 0.3);
  ctx.quadraticCurveTo(-halfWidth * 0.82, -halfHeight * 0.1, -halfWidth * 0.6, -halfHeight * 0.4);
  ctx.stroke();

  ctx.fillStyle = "#D4903C";
  ctx.beginPath();
  ctx.ellipse(halfWidth * 0.35, -halfHeight * 0.18, halfWidth * 0.2, halfHeight * 0.12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFace(leftEyeX, rightEyeX, eyeY, mouthColor) {
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(leftEyeX, eyeY, 5, 0, Math.PI * 2);
  ctx.arc(rightEyeX, eyeY, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(leftEyeX + 1, eyeY + 1.5, 2.5, 0, Math.PI * 2);
  ctx.arc(rightEyeX + 1, eyeY + 1.5, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(leftEyeX + 2, eyeY - 2, 1.2, 0, Math.PI * 2);
  ctx.arc(rightEyeX + 2, eyeY - 2, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = mouthColor;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, eyeY + 6, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

function render() {
  drawBackground();
  for (const pipe of state.pipes) drawPipe(pipe);
  drawGround();

  if (state.mode === "playing" || state.mode === "gameover") {
    drawCharacter(state.hotdog.x, state.hotdog.y, state.hotdog.rotation);
  } else {
    const floatY = state.height * 0.42 + Math.sin(Date.now() * 0.0025) * 14;
    const floatRotation = Math.sin(Date.now() * 0.002) * 0.08;
    drawCharacter(state.width * 0.22, floatY, floatRotation);
  }
}

function audio() {
  if (state.muted) return null;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function tone(type, frequency, start, duration, volume) {
  const actx = audio();
  if (!actx) return;
  const gain = actx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  gain.connect(actx.destination);
  const oscillator = actx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.connect(gain);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playJump() {
  const actx = audio();
  if (!actx) return;
  const now = actx.currentTime;
  tone("square", 380, now, 0.16, 0.22);
  tone("square", 700, now + 0.06, 0.1, 0.13);
}

function playScore() {
  const actx = audio();
  if (!actx) return;
  const now = actx.currentTime;
  tone("sine", 880, now, 0.1, 0.18);
  tone("sine", 1320, now + 0.08, 0.12, 0.14);
}

function playCrash() {
  const actx = audio();
  if (!actx) return;
  const now = actx.currentTime;
  tone("sawtooth", 400, now, 0.5, 0.36);
  tone("sine", 80, now, 0.3, 0.45);
}

function playMusic() {
  stopMusic();
  if (state.muted) return;
  const melody = [330, 392, 440, 392, 330, 330, 392, 440, 0, 440, 392, 330, 294, 262, 330, 392];
  let index = 0;
  musicTimer = window.setInterval(() => {
    const actx = audio();
    if (!actx || state.mode !== "playing") return;
    const note = melody[index % melody.length];
    if (note) tone("square", note, actx.currentTime, 0.16, 0.045);
    index += 1;
  }, 205);
}

function stopMusic() {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = null;
}

function toggleSound(event) {
  event.stopPropagation();
  state.muted = !state.muted;
  soundButton.textContent = state.muted ? "🔇" : "🔊";
  soundButton.setAttribute("aria-label", state.muted ? "Ativar som" : "Silenciar som");
  if (state.muted) stopMusic();
  if (!state.muted && state.mode === "playing") playMusic();
}

let last = performance.now();
function loop(now) {
  const elapsed = now - last;
  last = now;

  const steps = Math.max(1, Math.min(3, Math.round(elapsed / 16.67)));
  for (let i = 0; i < steps; i += 1) updateGame();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    flap();
  }
});
canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  flap();
});
playButton.addEventListener("click", (event) => {
  event.stopPropagation();
  startGame();
});
againButton.addEventListener("click", (event) => {
  event.stopPropagation();
  startGame();
});
soundButton.addEventListener("click", toggleSound);

setupOptions();
resize();
requestAnimationFrame(loop);
