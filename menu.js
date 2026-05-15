const GAMES = [
  {
    id: "hotdog",
    name: "Hot Dog Dash",
    emoji: "🌭",
    description: "Flappy Bird com hot dog",
    color: "#c81010",
  },
  {
    id: "dino",
    name: "Dino Runner",
    emoji: "🦖",
    description: "Pule obstaculos igual no Chrome",
    color: "#535353",
  },
  {
    id: "tetris",
    name: "Dogao Tetris",
    emoji: "🧱",
    description: "Empilhe blocos como um pro",
    color: "#2563eb",
  },
  {
    id: "invaders",
    name: "Space Invaders",
    emoji: "👾",
    description: "Acerte os aliens espaciais",
    color: "#7c3aed",
  },
  {
    id: "snake",
    name: "Dogao Snake",
    emoji: "🐍",
    description: "Cobrinha classica recarregada",
    color: "#16a34a",
  },
  {
    id: "breakout",
    name: "Dogao Breakout",
    emoji: "🏓",
    description: "Quebre tijolos com a bolinha",
    color: "#dc2626",
  },
  {
    id: "memory",
    name: "Dogao Memory",
    emoji: "🧠",
    description: "Teste sua memoria",
    color: "#d97706",
  },
  {
    id: "pacman",
    name: "Dogao Pac-Man",
    emoji: "👻",
    description: "Fuja dos fantasmas no labirinto",
    color: "#facc15",
  },
];

const menuScreen = document.getElementById("menuScreen");
const gameContainer = document.getElementById("gameContainer");
const backButton = document.getElementById("backButton");
const gameList = document.getElementById("gameList");

let currentGame = null;
let gameInstances = {};

function renderMenu() {
  gameList.innerHTML = "";
  for (const game of GAMES) {
    const card = document.createElement("button");
    card.className = "game-card";
    card.type = "button";
    card.style.setProperty("--card-color", game.color);
    card.innerHTML = `
      <span class="game-card-emoji">${game.emoji}</span>
      <strong class="game-card-name">${game.name}</strong>
      <small class="game-card-desc">${game.description}</small>
    `;
    card.addEventListener("click", () => launchGame(game.id));
    gameList.appendChild(card);
  }
}

function launchGame(id) {
  currentGame = id;
  menuScreen.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  backButton.classList.remove("hidden");

  gameContainer.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.id = "gameCanvas";
  gameContainer.appendChild(canvas);

  if (gameInstances[id]) {
    gameInstances[id].destroy();
  }

  switch (id) {
    case "hotdog": gameInstances[id] = new HotDogGame(canvas); break;
    case "dino": gameInstances[id] = new DinoGame(canvas); break;
    case "tetris": gameInstances[id] = new TetrisGame(canvas); break;
    case "invaders": gameInstances[id] = new InvadersGame(canvas); break;
    case "snake": gameInstances[id] = new SnakeGame(canvas); break;
    case "breakout": gameInstances[id] = new BreakoutGame(canvas); break;
    case "memory": gameInstances[id] = new MemoryGame(canvas); break;
    case "pacman": gameInstances[id] = new PacmanGame(canvas); break;
  }
}

function goBack() {
  if (currentGame && gameInstances[currentGame]) {
    gameInstances[currentGame].destroy();
    gameInstances[currentGame] = null;
  }
  currentGame = null;
  gameContainer.innerHTML = "";
  gameContainer.classList.add("hidden");
  backButton.classList.add("hidden");
  menuScreen.classList.remove("hidden");
}

backButton.addEventListener("click", goBack);

renderMenu();
