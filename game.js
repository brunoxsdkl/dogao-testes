const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlay = document.getElementById("overlay");
const message = document.getElementById("message");
const startButton = document.getElementById("start");

const state = {
  mode: "ready",
  width: 360,
  height: 640,
  dpr: 1,
  time: 0,
  score: 0,
  best: Number(localStorage.getItem("sky-tap-best") || 0),
  speed: 152,
  gravity: 1120,
  jump: -365,
  bird: {
    x: 96,
    y: 260,
    radius: 18,
    velocity: 0,
    rotation: 0,
  },
  pipes: [],
  particles: [],
};

bestEl.textContent = state.best;

function resize() {
  const rect = canvas.getBoundingClientRect();
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = Math.max(320, rect.width);
  state.height = Math.max(520, rect.height);
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  state.bird.x = state.width * 0.28;
}

function resetGame() {
  state.mode = "playing";
  state.time = 0;
  state.score = 0;
  state.speed = 152;
  state.bird.y = state.height * 0.42;
  state.bird.velocity = 0;
  state.bird.rotation = 0;
  state.pipes = [];
  state.particles = [];
  scoreEl.textContent = "0";
  overlay.classList.add("hidden");
  spawnPipe(state.width + 80);
  spawnPipe(state.width + 300);
}

function spawnPipe(x = state.width + 80) {
  const ground = groundTop();
  const gap = Math.max(138, Math.min(178, state.height * 0.24));
  const margin = 78;
  const top = margin + Math.random() * Math.max(90, ground - gap - margin * 2);
  state.pipes.push({
    x,
    width: 70,
    top,
    gap,
    passed: false,
  });
}

function groundTop() {
  return state.height - 86;
}

function flap() {
  if (state.mode === "ready" || state.mode === "over") {
    resetGame();
    return;
  }

  state.bird.velocity = state.jump;
  for (let i = 0; i < 5; i += 1) {
    state.particles.push({
      x: state.bird.x - 12,
      y: state.bird.y + 8,
      vx: -80 - Math.random() * 80,
      vy: -40 + Math.random() * 80,
      life: 0.32,
    });
  }
}

function gameOver() {
  if (state.mode === "over") return;
  state.mode = "over";
  state.best = Math.max(state.best, state.score);
  localStorage.setItem("sky-tap-best", String(state.best));
  bestEl.textContent = state.best;
  message.textContent = `Fim de jogo. Pontos: ${state.score}`;
  startButton.textContent = "De novo";
  overlay.classList.remove("hidden");
}

function update(dt) {
  state.time += dt;

  if (state.mode === "ready") {
    state.bird.y = state.height * 0.42 + Math.sin(state.time * 4) * 10;
    state.bird.rotation = Math.sin(state.time * 4) * 0.12;
    return;
  }

  if (state.mode !== "playing") return;

  state.speed += dt * 2.2;
  state.bird.velocity += state.gravity * dt;
  state.bird.y += state.bird.velocity * dt;
  state.bird.rotation = Math.max(-0.5, Math.min(1.2, state.bird.velocity / 520));

  for (const pipe of state.pipes) {
    pipe.x -= state.speed * dt;

    if (!pipe.passed && pipe.x + pipe.width < state.bird.x) {
      pipe.passed = true;
      state.score += 1;
      scoreEl.textContent = state.score;
    }
  }

  if (state.pipes.length && state.pipes[0].x + state.pipes[0].width < -20) {
    state.pipes.shift();
  }

  const lastPipe = state.pipes[state.pipes.length - 1];
  if (lastPipe && lastPipe.x < state.width - 220) {
    spawnPipe();
  }

  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);

  if (state.bird.y - state.bird.radius < 0 || state.bird.y + state.bird.radius > groundTop()) {
    gameOver();
  }

  for (const pipe of state.pipes) {
    if (birdHitsPipe(pipe)) {
      gameOver();
      break;
    }
  }
}

function birdHitsPipe(pipe) {
  const bird = state.bird;
  const nearestX = Math.max(pipe.x, Math.min(bird.x, pipe.x + pipe.width));
  const inPipeX = Math.abs(bird.x - nearestX) < bird.radius;
  if (!inPipeX) return false;

  const topHit = bird.y - bird.radius < pipe.top;
  const bottomHit = bird.y + bird.radius > pipe.top + pipe.gap;
  return topHit || bottomHit;
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, state.height);
  sky.addColorStop(0, "#47b9ff");
  sky.addColorStop(0.62, "#8be3ff");
  sky.addColorStop(1, "#b7f278");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, state.width, state.height);

  drawCloud(state.width * 0.18, 120, 0.9);
  drawCloud(state.width * 0.72, 190, 1.08);
  drawCloud(state.width * 0.44, 300, 0.7);
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.globalAlpha = 0.84;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(x, y, 24 * scale, Math.PI, 0);
  ctx.arc(x + 25 * scale, y - 16 * scale, 30 * scale, Math.PI, 0);
  ctx.arc(x + 58 * scale, y, 24 * scale, Math.PI, 0);
  ctx.rect(x - 24 * scale, y, 106 * scale, 22 * scale);
  ctx.fill();
  ctx.restore();
}

function drawPipe(pipe) {
  const bottomY = pipe.top + pipe.gap;
  drawPipeSegment(pipe.x, 0, pipe.width, pipe.top, true);
  drawPipeSegment(pipe.x, bottomY, pipe.width, groundTop() - bottomY, false);
}

function drawPipeSegment(x, y, width, height, upsideDown) {
  const capHeight = 28;
  ctx.fillStyle = "#309b48";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#5ed76b";
  ctx.fillRect(x + 8, y, 14, height);
  ctx.fillStyle = "#24753a";
  ctx.fillRect(x + width - 12, y, 12, height);

  const capY = upsideDown ? y + height - capHeight : y;
  ctx.fillStyle = "#38b854";
  ctx.fillRect(x - 8, capY, width + 16, capHeight);
  ctx.strokeStyle = "rgba(15, 23, 42, 0.28)";
  ctx.lineWidth = 3;
  ctx.strokeRect(x - 8, capY, width + 16, capHeight);
}

function drawBird() {
  const bird = state.bird;
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  ctx.fillStyle = "#ffd84d";
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f9a826";
  ctx.beginPath();
  ctx.ellipse(-9, 4, 13, 8, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(8, -7, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(10, -7, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ff8a3d";
  ctx.beginPath();
  ctx.moveTo(16, 1);
  ctx.lineTo(33, 7);
  ctx.lineTo(16, 12);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawGround() {
  const y = groundTop();
  ctx.fillStyle = "#5ab343";
  ctx.fillRect(0, y, state.width, state.height - y);
  ctx.fillStyle = "#e7c76c";
  ctx.fillRect(0, y + 16, state.width, state.height - y - 16);

  ctx.fillStyle = "rgba(49, 83, 45, 0.22)";
  const offset = (state.time * state.speed * 0.42) % 34;
  for (let x = -34 - offset; x < state.width + 34; x += 34) {
    ctx.fillRect(x, y + 16, 18, 8);
  }
}

function drawParticles() {
  ctx.save();
  ctx.fillStyle = "rgba(255, 247, 177, 0.8)";
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / 0.32);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function render() {
  drawBackground();
  for (const pipe of state.pipes) drawPipe(pipe);
  drawParticles();
  drawBird();
  drawGround();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
window.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  flap();
});
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    flap();
  }
});
startButton.addEventListener("click", (event) => {
  event.stopPropagation();
  flap();
});

resize();
requestAnimationFrame(loop);
