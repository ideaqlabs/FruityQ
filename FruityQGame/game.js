// game.js - complete, copy/replace
(function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const gameContainer = document.getElementById("gameContainer");
  const startScreen = document.getElementById("startScreen");
  const startBtn = document.getElementById("startBtn");
  const gameUI = document.getElementById("gameUI");
  const hud = document.getElementById("hud");
  const canvasWrapper = document.getElementById("canvasWrapper");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const finalScoreEl = document.getElementById("finalScore");
  const playAgainBtn = document.getElementById("playAgainBtn");

  // timers/ids
  let spawnFruitInterval = null;
  let spawnBombInterval = null;
  let timerInterval = null;
  let rafId = null;

  // game state
  let score = 0;
  let sessionCoins = 0;      // will be computed at end from score
  let totalCoins = 0;        // persistent coins across sessions
  let timeLeft = 60;
  let basket = null;
  let fruits = [];
  let bombs = [];
  let effects = [];
  let keys = {};
  let touchTargetX = null;

  const assets = {};
  const fruitTypes = ["apple","orange","lemon","watermelon","grapes","strawberry"];

  let gamePaused = false;
  let lastTime = performance.now();

  // ---------- Ensure a "Total Coins" header exists above canvas ----------
  // This will create an element with id="totalCoinsHeader" if not already present
  function ensureTotalCoinsHeader() {
    if (!canvasWrapper && gameContainer) {
      // fallback: use gameContainer if canvasWrapper is missing
      if (!document.getElementById("totalCoinsHeader")) {
        const h = document.createElement("div");
        h.id = "totalCoinsHeader";
        h.style.textAlign = "center";
        h.style.marginBottom = "6px";
        h.style.fontWeight = "600";
        h.style.fontSize = "16px";
        h.textContent = "Total Coins: 0";
        gameContainer.insertBefore(h, canvas);
      }
      return;
    }

    if (!document.getElementById("totalCoinsHeader")) {
      const header = document.createElement("div");
      header.id = "totalCoinsHeader";
      header.style.textAlign = "center";
      header.style.marginBottom = "6px";
      header.style.fontWeight = "600";
      header.style.fontSize = "16px";
      header.textContent = "Total Coins: 0";
      // insert before canvas so it appears above it
      canvasWrapper.insertBefore(header, canvas);
    }
  }

  // ---------- Pause / Resume helpers ----------
  function pauseGame() {
    gamePaused = true;
    // stop spawning and timer while paused
    if (spawnFruitInterval) { clearInterval(spawnFruitInterval); spawnFruitInterval = null; }
    if (spawnBombInterval)  { clearInterval(spawnBombInterval);  spawnBombInterval  = null; }
    if (timerInterval)      { clearInterval(timerInterval);      timerInterval      = null; }
    // rAF is left running (it skips updates) so resume is smoother
  }

  function resumeGame() {
    if (!gamePaused) return;
    gamePaused = false;
    lastTime = performance.now();

    // restart spawn intervals if game running
    if (!spawnFruitInterval) spawnFruitInterval = setInterval(spawnFruit, 1400);
    if (!spawnBombInterval)  spawnBombInterval  = setInterval(spawnBomb, 5000);

    // resume timer if time remains
    if (!timerInterval && ti
