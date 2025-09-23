const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Track timers so we can clear them on end
let spawnFruitIntervalId = null;
let spawnBombIntervalId = null;
let timerIntervalId = null;

function resizeCanvas() {
  const container = document.getElementById("gameContainer");
  let rect = { width: window.innerWidth, height: window.innerHeight };

  if (container) {
    const r = container.getBoundingClientRect();
    // if container is hidden, r.width/r.height may be 0 — fall back to window
    if (r.width > 10 && r.height > 10) rect = r;
  }

  const isMobile = rect.height > rect.width; // portrait vs landscape

  if (isMobile) {
    canvas.width = Math.min(rect.width * 0.95, 420);
    canvas.height = Math.min(rect.height * 0.9, 720);
  } else {
    canvas.width = Math.min(rect.width * 0.95, 900);
    canvas.height = Math.min(rect.height * 0.9, 600);
  }

}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);
resizeCanvas(); // initial

// game state
let score = 0;
let coins = 0;
let timeLeft = 60;
let basket = null;
let fruits = [];
let bombs = [];
let keys = {};                      // initialize early so handlers don't crash
let effects = [];
let touchTargetX = null;            // smooth touch target

const assets = {};
const fruitTypes = ["apple","orange","lemon","watermelon","grapes","strawberry"];

/* --- Asset preloader --- */
function loadAssets(callback) {
  const names = ["basket","bomb","apple","orange","lemon","watermelon","grapes","strawberry"];
  let loaded = 0;
  names.forEach(n => {
    assets[n] = new Image();
    assets[n].src = `assets/${n}.png`;
    assets[n].onload = () => {
      loaded++;
      if (loaded === names.length) callback();
    };
    assets[n].onerror = () => {
      // still count errors to avoid hanging; caller should ensure assets exist
      loaded++;
      if (loaded === names.length) callback();
    };
  });
}

/* --- Input handlers --- */
// keyboard
document.addEventListener("keydown", e => { keys[e.key] = true; });
document.addEventListener("keyup",   e => { keys[e.key] = false; });

// mouse (instant follow)
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  // optional: enable/disable mouse direct move; currently direct
  if (basket) basket.x = mouseX - basket.width / 2;
});

// touch (slider style)
canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touchX = e.touches[0].clientX - rect.left;
  touchTargetX = touchX - (basket ? basket.width/2 : 0);
}, { passive: false });

/* --- Start button: unhide container & request fullscreen (MUST be in click) --- */
document.getElementById("startBtn").addEventListener("click", () => {
  const startBtn = document.getElementById("startBtn");
  startBtn.disabled = true; // prevent double clicks

  const gameContainer = document.getElementById("gameContainer");
  if (gameContainer) gameContainer.classList.remove("hidden"); // make visible before fullscreen & resize

  // Request fullscreen in the user gesture (important)
  try {
    if (gameContainer.requestFullscreen) gameContainer.requestFullscreen();
    else if (gameContainer.webkitRequestFullscreen) gameContainer.webkitRequestFullscreen();
    else if (gameContainer.msRequestFullscreen) gameContainer.msRequestFullscreen();
  } catch (err) {
    // some browsers may still reject; we'll continue anyway
    console.warn("Fullscreen request failed or blocked:", err);
  }

  // ensure canvas size matches container now
  resizeCanvas();

  // load images then start
  loadAssets(startGame);
});

/* --- Game lifecycle helpers --- */
function initGame() {
  score = 0;
  coins = 0;
  timeLeft = 60;
  fruits = [];
  bombs = [];
  effects = [];
  touchTargetX = null;

  // basket size scales slightly with canvas
  const bw = Math.max(80, Math.floor(canvas.width * 0.18));
  const bh = Math.max(40, Math.floor(canvas.height * 0.10));
  basket = {
    x: (canvas.width - bw) / 2,
    y: canvas.height - bh - 10,
    width: bw,
    height: bh,
    speed: Math.max(6, Math.floor(canvas.width * 0.015)),
    shake: 0
  };

  // show HUD container
  const gameUI = document.getElementById("gameUI");
  if (gameUI) gameUI.classList.remove("hidden");
}

function startGame() {
  // hide start screen; show container is already done in click handler
  const startScreen = document.getElementById("startScreen");
  if (startScreen) startScreen.classList.add("hidden");

  const gameOver = document.getElementById("gameOverScreen");
  if (gameOver) gameOver.classList.add("hidden");

  initGame();
  resizeCanvas(); // ensure correct canvas after possible fullscreen transition

  // clear previous intervals if any
  if (spawnFruitIntervalId) clearInterval(spawnFruitIntervalId);
  if (spawnBombIntervalId) clearInterval(spawnBombIntervalId);
  if (timerIntervalId) clearInterval(timerIntervalId);

  // spawn timers (store ids to clear later)
  spawnFruitIntervalId = setInterval(spawnFruit, 1400);
  spawnBombIntervalId  = setInterval(spawnBomb, 5000);

  // game timer
  timerIntervalId = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      const tEl = document.getElementById("timer");
      if (tEl) tEl.textContent = "Time: " + timeLeft;
    } else {
      endGame();
    }
  }, 1000);

  // start loop
  cancelAnimationFrame(gameInterval);
  gameInterval = requestAnimationFrame(gameLoop);
}

function endGame() {
  cancelAnimationFrame(gameInterval);
  gameInterval = null;  // prevent hanging loop

  if (spawnFruitIntervalId) { clearInterval(spawnFruitIntervalId); spawnFruitIntervalId = null; }
  if (spawnBombIntervalId)  { clearInterval(spawnBombIntervalId);  spawnBombIntervalId  = null; }
  if (timerIntervalId)      { clearInterval(timerIntervalId);      timerIntervalId      = null; }

  document.getElementById("gameUI").classList.add("hidden");
  const gameOver = document.getElementById("gameOverScreen");
  if (gameOver) {
    gameOver.classList.remove("hidden");
    document.getElementById("finalScore").textContent = `Final Score: ${score}, Coins: ${coins}`;
  }

  const startBtn = document.getElementById("startBtn");
  if (startBtn) startBtn.disabled = false;
}


/* --- Spawning --- */
function spawnFruit(){
  fruits.push({
    x: Math.random() * Math.max(10, (canvas.width - 60)),
    y: -60,
    size: Math.max(36, Math.floor(canvas.width * 0.07)),
    speed: 2 + Math.random() * 2,
    type: fruitTypes[Math.floor(Math.random() * fruitTypes.length)],
    angle: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.03
  });
}

function spawnBomb(){
  bombs.push({
    x: Math.random() * Math.max(10, (canvas.width - 60)),
    y: -60,
    size: Math.max(40, Math.floor(canvas.width * 0.08)),
    speed: 2.5 + Math.random() * 2,
    angle: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.03
  });
}

/* --- Visual effects --- */
function addEffect(x, y, text, color = "white") {
  effects.push({ x, y, text, color, alpha: 1, lifetime: 60 });
}

/* --- Update & Draw --- */
function update() {
  // keyboard movement
  if (keys["ArrowLeft"] || keys["a"])  basket.x -= basket.speed;
  if (keys["ArrowRight"] || keys["d"]) basket.x += basket.speed;

  // clamp basket
  basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));

  // smooth touch sliding toward touchTargetX
  if (touchTargetX !== null) {
    // lerp towards target
    basket.x += (touchTargetX - basket.x) * 0.18;
    // clamp
    basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));
  }

  // update falling assets and their rotation
  for (const f of fruits) { f.y += f.speed; f.angle += f.rotationSpeed; }
  for (const b of bombs)  { b.y += b.speed;  b.angle += b.rotationSpeed;  }

  // collisions (reverse loop for safe splice)
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

  // coins (0.25 per 100 score as you had)
  coins = Math.floor(score / 100) * 0.25;

  // update effects
  for (const e of effects) {
    e.y -= 0.6;
    e.alpha -= 0.02;
    e.lifetime--;
  }
  effects = effects.filter(e => e.lifetime > 0);

  if (basket.shake > 0) basket.shake--;
}

function draw() {
  // deep blue background, full opacity
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000822";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // watermark (behind assets)
  ctx.save();
  let fontSize = Math.floor(canvas.width * 0.15); // 15% width
  ctx.font = `bold ${fontSize}px "Gill Sans", Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.6)"; // 60% visibility
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("IdeaQLabs", canvas.width / 2, canvas.height / 2);
  ctx.restore();

  // draw basket (with shake)
  let shakeX = basket.shake ? (Math.random() - 0.5) * 10 : 0;
  if (assets.basket && assets.basket.complete) {
    ctx.drawImage(assets.basket, basket.x + shakeX, basket.y, basket.width, basket.height);
  } else {
    // fallback box
    ctx.fillStyle = "#FFD166";
    ctx.fillRect(basket.x + shakeX, basket.y, basket.width, basket.height);
  }

  // draw fruits (rotated)
  for (const f of fruits) {
    ctx.save();
    ctx.translate(f.x + f.size/2, f.y + f.size/2);
    ctx.rotate(f.angle);
    if (assets[f.type] && assets[f.type].complete) {
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
    if (assets.bomb && assets.bomb.complete) {
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

/* --- Main loop --- */
let gameInterval = null;
function gameLoop() {
  update();
  draw();
  const scoreEl = document.getElementById("score");
  const coinsEl = document.getElementById("coins");
  if (scoreEl) scoreEl.textContent = "Score: " + score;
  if (coinsEl) coinsEl.textContent = "Coins: " + coins;
  gameInterval = requestAnimationFrame(gameLoop);
}

/* --- Fullscreen resize handling --- */
document.addEventListener("fullscreenchange", () => {
  // small delay helps the browser stabilize layout in some cases
  setTimeout(() => {
    resizeCanvas();
  }, 80);
});
document.addEventListener("webkitfullscreenchange", () => setTimeout(resizeCanvas,80));
document.addEventListener("msfullscreenchange", () => setTimeout(resizeCanvas,80));
