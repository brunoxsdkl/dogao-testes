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
    id: "whack",
    name: "Dogao Whack",
    emoji: "🔨",
    description: "Acerte as toupeiras",
    color: "#16a34a",
  },
  {
    id: "tap",
    name: "Dogao Tap",
    emoji: "🎯",
    description: "Toque nos alvos rapidinho",
    color: "#2563eb",
  },
  {
    id: "simon",
    name: "Dogao Simon",
    emoji: "🔴🟡",
    description: "Repita a sequencia de cores",
    color: "#7c3aed",
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
      <div class="game-card-body">
        <strong class="game-card-name">${game.name}</strong>
        <small class="game-card-desc">${game.description}</small>
      </div>
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
    case "whack": gameInstances[id] = new WhackGame(canvas); break;
    case "tap": gameInstances[id] = new TapGame(canvas); break;
    case "simon": gameInstances[id] = new SimonGame(canvas); break;
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
