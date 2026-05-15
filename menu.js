const GAMES = [
  {
    id: "hotdog",
    name: "Hot Dog Dash",
    emoji: "\uD83C\uDF2D",
    description: "Flappy Bird com hot dog",
    color: "#c81010",
  },
  {
    id: "dino",
    name: "Dino Runner",
    emoji: "\uD83E\uDD96",
    description: "Pule obstaculos igual no Chrome",
    color: "#535353",
  },
  {
    id: "blaster",
    name: "Dogao Blaster",
    emoji: "\uD83D\uDE80",
    description: "Atire nos inimigos do espaco",
    color: "#2d1b4e",
  },
  {
    id: "catch",
    name: "Hot Dog Catch",
    emoji: "\uD83E\uDDCA",
    description: "Pegue os ingredientes!",
    color: "#228B22",
  },
  {
    id: "survivor",
    name: "Dogao Survivor",
    emoji: "\u2694\uFE0F",
    description: "Sobreviva a horda de inimigos",
    color: "#9B59B6",
  },
];

const socialScreen = document.getElementById("socialScreen");
const menuScreen = document.getElementById("menuScreen");
const gameContainer = document.getElementById("gameContainer");
const backButton = document.getElementById("backButton");
const gameList = document.getElementById("gameList");

let currentGame = null;
let gameInstances = {};

function closeSocial() {
  socialScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
}

document.getElementById("socialSkip").addEventListener("click", closeSocial);
document.getElementById("socialInsta").addEventListener("click", closeSocial);
document.getElementById("socialFace").addEventListener("click", closeSocial);

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
    case "blaster": gameInstances[id] = new BlasterGame(canvas); break;
    case "catch": gameInstances[id] = new CatchGame(canvas); break;
    case "survivor": gameInstances[id] = new SurvivorGame(canvas); break;
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
