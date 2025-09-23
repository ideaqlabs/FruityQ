const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Track timers so we can clear them on end
let spawnFruitIntervalId = null;
let spawnBombIntervalId = null;
let timerIntervalId = null;
let gameInterval = null;

function resizeCanvas() {
  const container = document.getElementById("gameContainer");
  let rect = { width: window.innerWidth, height: window.innerHeight };

  if (container) {
    const r = container.getBoundingClientRect();
    if (r.width > 10 && r.height > 10) rect = r;
  }

  const isMobile = rect.height > rect.width;

  if (isMobile) {
    canvas.width = Math.min(rect.width * 0.95, 420);
    canvas.height = Math.min(rect.height * 0.9, 720);
  } else {
    canvas.width = Math.min(rect.width * 0.95, 900);
    canvas.height = Math.min(rect.height * 0.9, 600);
  }
}

  // also scale HUD width with canvas
  const hud = document.getElementById("hud");
  if (hud) hud.style.width = canvas.width + "px";
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
let keys = {};
let effects = [];
let touchTargetX = null;

const assets = {};
const fruitTypes = ["apple","orange","lemon","watermelon","grapes","strawberry"];

/* --- Asset preloader --- */
function loadAssets(callback) {
  const names = ["basket","bomb",...fruitTypes];
  let loaded = 0;
  names.forEach(n => {
    assets[n] = new Image();
    assets[n].src = `assets/${n}.png`;
    assets[n].onload = () => { if (++loaded === names.length) callback(); };
    assets[n].onerror = () => { if (++loaded === names.length) callback(); };
  });
}

/* --- Input handlers --- */
document.addEventListener("keydown", e => { keys[e.key] = true; });
document.addEventListener("keyup",   e => { keys[e.key] = false; });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touchX = e.touches[0].clientX - rect.left;
  touchTargetX = touchX - (basket ? basket.width/2 : 0);
}, { passive: false });

/* --- Start button --- */
document.getElementById("startBtn").addEventListener("click", () => {
  const gameContainer = document.getElementById("gameContainer");
  if (gameContainer) gameContainer.classList.remove("hidden");

  try {
    if (gameContainer.requestFullscreen) gameContainer.requestFullscreen();
    else if (gameContainer.webkitRequestFullscreen) gameContainer.webkitRequestFullscreen();
    else if (gameContainer.msRequestFullscreen) gameContainer.msRequestFullscreen();
  } catch (err) {
    console.warn("Fullscreen request failed:", err);
  }

  resizeCanvas();
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

  document.getElementById("gameUI").classList.remove("hidden");
}

function startGame() {
  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("gameOverScreen").classList.add("hidden");
  initGame();

  if (spawnFruitIntervalId) clearInterval(spawnFruitIntervalId);
  if (spawnBombIntervalId) clearInterval(spawnBombIntervalId);
  if (timerIntervalId) clearInterval(timerIntervalId);

  spawnFruitIntervalId = setInterval(spawnFruit, 1400);
  spawnBombIntervalId  = setInterval(spawnBomb, 5000);

  timerIntervalId = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      document.getElementById("timer").textContent = "Time: " + timeLeft;
    } else {
      endGame();
    }
  }, 1000);

  cancelAnimationFrame(gameInterval);
  gameInterval = requestAnimationFrame(gameLoop);
}

function endGame() {
  cancelAnimationFrame(gameInterval);
  gameInterval = null;

  if (spawnFruitIntervalId) { clearInterval(spawnFruitIntervalId); spawnFruitIntervalId = null; }
  if (spawnBombIntervalId)  { clearInterval(spawnBombIntervalId);  spawnBombIntervalId  = null; }
  if (timerIntervalId)      { clearInterval(timerIntervalId);      timerIntervalId      = null; }

  document.getElementById("gameUI").classList.add("hidden");
  document.getElementById("gameOverScreen").classList.remove("hidden");
  document.getElementById("finalScore").textContent = `Final Score: ${score}, Coins: ${coins}`;
}

/* --- Spawning --- */
function spawnFruit(){
  fruits.push({
    x: Math.random() * (canvas.width - 60),
    y: -60,
    size: Math.max(36, Math.floor(canvas.width * 0.07)),
    speed: 2 + Math.random() * 2,
    type: fruitTypes[Math.floor(Math.random() * fruitTypes.length)],
    angle: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.02
  });
}

function spawnBomb(){
  bombs.push({
    x: Math.random() * (canvas.width - 60),
    y: -60,
    size: Math.max(40, Math.floor(canvas.width * 0.08)),
    speed: 2.5 + Math.random() * 2,
    angle: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.03
  });
}

/* --- Update & Draw --- */
function update() {
  if (keys["ArrowLeft"] || keys["a"])  basket.x -= basket.speed;
  if (keys["ArrowRight"] || keys["d"]) basket.x += basket.speed;
  basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));

  if (touchTargetX !== null) {
    basket.x += (touchTargetX - basket.x) * 0.18;
    basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));
  }

  for (const f of fruits) { f.y += f.speed; f.angle += f.rotationSpeed; }
  for (const b of bombs)  { b.y += b.speed;  b.angle += b.rotationSpeed; }

  for (let i = fruits.length - 1; i >= 0; i--) {
    const f = fruits[i];
    if (f.y + f.size > basket.y && f.x + f.size/2 > basket.x && f.x < basket.x + basket.width) {
      score += 10;
      addEffect(f.x + f.size/2, f.y, "+10", "lime");
      fruits.splice(i, 1);
    } else if (f.y > canvas.height + 80) fruits.splice(i, 1);
  }

  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    if (b.y + b.size > basket.y && b.x + b.size/2 > basket.x && b.x < basket.x + basket.width) {
      score = Math.max(0, score - 40);
      addEffect(b.x + b.size/2, b.y, "-40", "red");
      basket.shake = 10;
      bombs.splice(i, 1);
    } else if (b.y > canvas.height + 80) bombs.splice(i, 1);
  }

  coins = Math.floor(score / 100) * 0.25;

  for (const e of effects) { e.y -= 0.6; e.alpha -= 0.02; e.lifetime--; }
  effects = effects.filter(e => e.lifetime > 0);

  if (basket.shake > 0) basket.shake--;
}

function draw() {
  ctx.fillStyle = "#000822";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.font = `bold ${Math.floor(canvas.width * 0.15)}px Poppins, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("IdeaQLabs", canvas.width/2, canvas.height/2);
  ctx.restore();

  let shakeX = basket.shake ? (Math.random() - 0.5) * 10 : 0;
  if (assets.basket && assets.basket.complete) {
    ctx.drawImage(assets.basket, basket.x + shakeX, basket.y, basket.width, basket.height);
  }

  for (const f of fruits) {
    ctx.save();
    ctx.translate(f.x + f.size/2, f.y + f.size/2);
    ctx.rotate(f.angle);
    if (assets[f.type]) ctx.drawImage(assets[f.type], -f.size/2, -f.size/2, f.size, f.size);
    ctx.restore();
  }

  for (const b of bombs) {
    ctx.save();
    ctx.translate(b.x + b.size/2, b.y + b.size/2);
    ctx.rotate(b.angle);
    if (assets.bomb) ctx.drawImage(assets.bomb, -b.size/2, -b.size/2, b.size, b.size);
    ctx.restore();
  }

  ctx.font = "20px Poppins, Arial, sans-serif";
  ctx.textAlign = "center";
  for (const e of effects) {
    ctx.globalAlpha = Math.max(0, e.alpha);
    ctx.fillStyle = e.color;
    ctx.fillText(e.text, e.x, e.y);
    ctx.globalAlpha = 1;
  }
}

/* --- Effects helper --- */
function addEffect(x, y, text, color) {
  effects.push({ x, y, text, color, alpha: 1, lifetime: 60 });
}

/* --- Loop --- */
function gameLoop() {
  update();
  draw();
  document.getElementById("score").textContent = "Score: " + score;
  document.getElementById("coins").textContent = "Coins: " + coins;
  gameInterval = requestAnimationFrame(gameLoop);
}

/* --- Fullscreen resize --- */
document.addEventListener("fullscreenchange", () => setTimeout(resizeCanvas,80));
document.addEventListener("webkitfullscreenchange", () => setTimeout(resizeCanvas,80));
document.addEventListener("msfullscreenchange", () => setTimeout(resizeCanvas,80));
