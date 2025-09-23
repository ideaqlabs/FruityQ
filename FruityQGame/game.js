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
  let coins = 0;
  let timeLeft = 60;
  let basket = null;
  let fruits = [];
  let bombs = [];
  let effects = [];
  let keys = {};
  let touchTargetX = null;

  const assets = {};
  const fruitTypes = ["apple","orange","lemon","watermelon","grapes","strawberry"];

  // Resize canvas to fit container or window; maintain sensible sizes
  function resizeCanvas() {
    // Prefer gameContainer rect when visible; else fallback to window
    let rect = { width: window.innerWidth, height: window.innerHeight };
    if (gameContainer) {
      const r = gameContainer.getBoundingClientRect();
      if (r.width > 20 && r.height > 20) rect = r;
    }

    const isPortrait = rect.height > rect.width;
    if (isPortrait) {
      // mobile portrait
      canvas.width = Math.min(Math.floor(rect.width * 0.95), 420);
      canvas.height = Math.min(Math.floor(rect.height * 0.88), 720);
    } else {
      // desktop landscape
      canvas.width = Math.min(Math.floor(rect.width * 0.75), 900);
      canvas.height = Math.min(Math.floor(rect.height * 0.7), 600);
    }

    // scale the visible CSS size to match logical pixel size (keeps crispness)
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";

    // update HUD width to match canvas
    if (hud) hud.style.width = canvas.width + "px";

    // reposition basket proportionally if needed
    if (basket) {
      basket.y = canvas.height - basket.height - 10;
      basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));
    }
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
  });
  window.addEventListener("orientationchange", () => {
    setTimeout(resizeCanvas, 60);
  });

  // Asset loader
  function loadAssets(cb) {
    const names = ["basket", "bomb", ...fruitTypes];
    let loaded = 0;
    names.forEach(name => {
      const img = new Image();
      img.src = `assets/${name}.png`;
      img.onload = () => {
        assets[name] = img;
        loaded++;
        if (loaded === names.length) cb();
      };
      img.onerror = () => {
        // still count to avoid hanging; leave fallback behavior in draw()
        assets[name] = null;
        loaded++;
        if (loaded === names.length) cb();
      };
    });
  }

  /* ---------- Input handlers ---------- */
  document.addEventListener("keydown", e => { keys[e.key] = true; });
  document.addEventListener("keyup", e => { keys[e.key] = false; });

  // Mouse direct follow (desktop)
  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    if (basket) basket.x = mx - basket.width / 2;
  });

  // Touch slider-style
  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const tx = e.touches[0].clientX - rect.left;
    touchTargetX = tx - (basket ? basket.width / 2 : 0);
  }, { passive: false });

  /* ---------- Game lifecycle ---------- */
  function initGameState() {
    score = 0; coins = 0; timeLeft = 60;
    fruits = []; bombs = []; effects = [];
    touchTargetX = null;
    keys = {};

    // set basket size relative to canvas
    const bw = Math.max(80, Math.floor(canvas.width * 0.18));
    const bh = Math.max(40, Math.floor(canvas.height * 0.11));
    basket = {
      x: (canvas.width - bw) / 2,
      y: canvas.height - bh - 10,
      width: bw,
      height: bh,
      speed: Math.max(6, Math.floor(canvas.width * 0.015)),
      shake: 0
    };

    // ensure HUD matches canvas width
    if (hud) hud.style.width = canvas.width + "px";
  }

  function startGameLoop() {
    // clear previous intervals if any
    if (spawnFruitInterval) clearInterval(spawnFruitInterval);
    if (spawnBombInterval) clearInterval(spawnBombInterval);
    if (timerInterval) clearInterval(timerInterval);

    // spawn intervals
    spawnFruitInterval = setInterval(spawnFruit, 1400);
    spawnBombInterval = setInterval(spawnBomb, 5000);

    // timer
    timerInterval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        const tEl = document.getElementById("timer");
        if (tEl) tEl.textContent = "Time: " + timeLeft;
      } else {
        endGame();
      }
    }, 1000);

    // start RAF loop
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(gameLoop);
  }

  function stopGameLoop() {
    cancelAnimationFrame(rafId); rafId = null;
    if (spawnFruitInterval) { clearInterval(spawnFruitInterval); spawnFruitInterval = null; }
    if (spawnBombInterval)  { clearInterval(spawnBombInterval);  spawnBombInterval  = null; }
    if (timerInterval)      { clearInterval(timerInterval);      timerInterval      = null; }
  }

  function startGame() {
    // Show the in-game UI
    if (gameUI) gameUI.classList.remove("hidden");
    if (gameOverScreen) gameOverScreen.classList.add("hidden");

    initGameState();
    resizeCanvas();
    startGameLoop();
  }

  function endGame() {
    stopGameLoop();
    // hide game UI
    if (gameUI) gameUI.classList.add("hidden");
    // show overlay inside container (works in fullscreen)
    if (gameOverScreen) {
      gameOverScreen.classList.remove("hidden");
      finalScoreEl.textContent = `Final Score: ${score}, Coins: ${coins}`;
    }
  }

  function restartGame() {
    // from Play Again button: hide overlay and start again (assets already loaded)
    if (gameOverScreen) gameOverScreen.classList.add("hidden");
    startGame();
  }

  /* ---------- Spawning ---------- */
  function spawnFruit() {
    fruits.push({
      x: Math.random() * Math.max(20, (canvas.width - 80)),
      y: -60,
      size: Math.max(36, Math.floor(canvas.width * 0.08)),
      speed: 2 + Math.random() * 1.8,
      type: fruitTypes[Math.floor(Math.random() * fruitTypes.length)],
      angle: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.03
    });
  }
  function spawnBomb() {
    bombs.push({
      x: Math.random() * Math.max(20, (canvas.width - 80)),
      y: -60,
      size: Math.max(40, Math.floor(canvas.width * 0.09)),
      speed: 2.5 + Math.random() * 2,
      angle: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.04
    });
  }

  /* ---------- Visual effects ---------- */
  function addEffect(x, y, text, color = "white") {
    effects.push({ x, y, text, color, alpha: 1, lifetime: 60 });
  }

  /* ---------- Update & Draw ---------- */
  function update() {
    // keyboard
    if (keys["ArrowLeft"] || keys["a"]) basket.x -= basket.speed;
    if (keys["ArrowRight"] || keys["d"]) basket.x += basket.speed;

    // touch smoothing
    if (touchTargetX !== null) {
      basket.x += (touchTargetX - basket.x) * 0.18;
    }

    // clamp basket
    basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));

    // update falling + rotation
    for (const f of fruits) { f.y += f.speed; f.angle += f.rotationSpeed; }
    for (const b of bombs)  { b.y += b.speed;  b.angle += b.rotationSpeed; }

    // collisions (reverse loops)
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      if (f.y + f.size > basket.y &&
          f.x + f.size/2 > basket.x &&
          f.x < basket.x + basket.width) {
        score += 10;
        addEffect(f.x + f.size/2, f.y, "+10", "lime");
        fruits.splice(i, 1);
      } else if (f.y > canvas.height + 80) {
        fruits.splice(i, 1);
      }
    }

    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      if (b.y + b.size > basket.y &&
          b.x + b.size/2 > basket.x &&
          b.x < basket.x + basket.width) {
        score = Math.max(0, score - 40);
        addEffect(b.x + b.size/2, b.y, "-40", "red");
        basket.shake = 10;
        bombs.splice(i, 1);
      } else if (b.y > canvas.height + 80) {
        bombs.splice(i, 1);
      }
    }

    // coins (0.25 per 100 points as before)
    coins = Math.floor(score / 100) * 0.25;

    // update effects
    for (const e of effects) { e.y -= 0.6; e.alpha -= 0.02; e.lifetime--; }
    effects = effects.filter(e => e.lifetime > 0);

    if (basket.shake > 0) basket.shake--;
  }

  function draw() {
    // background
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000822";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // watermark behind assets (subtle)
    ctx.save();
    const watermarkSize = Math.max(16, Math.floor(canvas.width * 0.15));
    ctx.font = `bold ${watermarkSize}px "Gill Sans", Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("IdeaQLabs", canvas.width / 2, canvas.height / 2);
    ctx.restore();

    // draw basket (shake)
    const shakeX = basket.shake ? (Math.random() - 0.5) * 10 : 0;
    if (assets.basket) {
      ctx.drawImage(assets.basket, basket.x + shakeX, basket.y, basket.width, basket.height);
    } else {
      ctx.fillStyle = "#FFD166";
      ctx.fillRect(basket.x + shakeX, basket.y, basket.width, basket.height);
    }

    // draw fruits (rotated)
    for (const f of fruits) {
      ctx.save();
      ctx.translate(f.x + f.size/2, f.y + f.size/2);
      ctx.rotate(f.angle);
      if (assets[f.type]) {
        ctx.drawImage(assets[f.type], -f.size/2, -f.size/2, f.size, f.size);
      } else {
        ctx.fillStyle = "#FF6B6B";
        ctx.fillRect(-f.size/2, -f.size/2, f.size, f.size);
      }
      ctx.restore();
    }

    // draw bombs (rotated)
    for (const b of bombs) {
      ctx.save();
      ctx.translate(b.x + b.size/2, b.y + b.size/2);
      ctx.rotate(b.angle);
      if (assets.bomb) {
        ctx.drawImage(assets.bomb, -b.size/2, -b.size/2, b.size, b.size);
      } else {
        ctx.fillStyle = "#333";
        ctx.fillRect(-b.size/2, -b.size/2, b.size, b.size);
      }
      ctx.restore();
    }

    // floating effects
    ctx.font = "20px Poppins, Arial, sans-serif";
    ctx.textAlign = "center";
    for (const e of effects) {
      ctx.globalAlpha = Math.max(0, e.alpha);
      ctx.fillStyle = e.color;
      ctx.fillText(e.text, e.x, e.y);
      ctx.globalAlpha = 1;
    }
  }

  function gameLoop() {
    update();
    draw();
    const scoreEl = document.getElementById("score");
    const coinsEl = document.getElementById("coins");
    if (scoreEl) scoreEl.textContent = "Score: " + score;
    if (coinsEl) coinsEl.textContent = "Coins: " + coins;
    rafId = requestAnimationFrame(gameLoop);
  }

  /* ---------- Hooks ---------- */
  // Start button: hide start screen, show container, request fullscreen, load assets & start
  startBtn.addEventListener("click", () => {
    // hide start overlay and show container (immediately)
    if (startScreen) startScreen.classList.add("hidden");
    if (gameContainer) gameContainer.classList.remove("hidden");

    // request fullscreen on the game container (user gesture)
    try {
      if (gameContainer.requestFullscreen) gameContainer.requestFullscreen();
      else if (gameContainer.webkitRequestFullscreen) gameContainer.webkitRequestFullscreen();
      else if (gameContainer.msRequestFullscreen) gameContainer.msRequestFullscreen();
    } catch (err) {
      console.warn("Fullscreen request blocked:", err);
    }

    // ensure canvas sizing is correct then load assets
    resizeCanvas();
    loadAssets(() => { startGame(); });
  });

  // Play Again button
  playAgainBtn.addEventListener("click", () => {
    if (gameOverScreen) gameOverScreen.classList.add("hidden");
    startGame();
  });

  // If user exits fullscreen, resize canvas to window
  document.addEventListener("fullscreenchange", () => { setTimeout(resizeCanvas, 80); });
  document.addEventListener("webkitfullscreenchange", () => { setTimeout(resizeCanvas, 80); });
  document.addEventListener("msfullscreenchange", () => { setTimeout(resizeCanvas, 80); });

  // Expose restartGame for older onclick usage if present
  window.restartGame = restartGame;

  // initial state: only show start screen
  (function initial() {
    if (gameContainer) gameContainer.classList.add("hidden");
    if (gameUI) gameUI.classList.add("hidden");
    if (gameOverScreen) gameOverScreen.classList.add("hidden");
    resizeCanvas();
  })();

})();
