const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const container = document.getElementById("gameContainer");
  const rect = container.getBoundingClientRect();

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
resizeCanvas(); // call at load

let score, coins, timeLeft, basket, fruits, bombs, keys, gameInterval, timerInterval;
const assets = {};
let effects = [];
let touchTargetX = null; // for smooth slider movement

// preload assets
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
  });
}

const fruitTypes = ["apple","orange","lemon","watermelon","grapes","strawberry"];

document.getElementById("startBtn").addEventListener("click", () => {
  loadAssets(startGame);
});

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// mouse controls
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  basket.x = mouseX - basket.width/2;
});

// touch controls → slider, not teleport
canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  touchTargetX = e.touches[0].clientX - rect.left - basket.width / 2;
}, { passive: false });

function initGame() {
  score = 0;
  coins = 0;
  timeLeft = 60;
  fruits = [];
  bombs = [];
  keys = {};
  effects = [];
  basket = { x: canvas.width/2 - 50, y: canvas.height - 60, width: 100, height: 60, speed: 7, shake: 0 };
  touchTargetX = basket.x;
}

function startGame() {
  const gameContainer = document.getElementById("gameContainer");

  // Request fullscreen for the whole container (UI + canvas)
  if (gameContainer.requestFullscreen) {
    gameContainer.requestFullscreen();
  } else if (gameContainer.webkitRequestFullscreen) {
    gameContainer.webkitRequestFullscreen();
  } else if (gameContainer.msRequestFullscreen) {
    gameContainer.msRequestFullscreen();
  }

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("gameOverScreen").classList.add("hidden");
  document.getElementById("gameUI").classList.remove("hidden");

  initGame();
  resizeCanvas(); // adjust after fullscreen
  gameInterval = requestAnimationFrame(gameLoop);

  timerInterval = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      document.getElementById("timer").textContent = "Time: " + timeLeft;
    } else {
      endGame();
    }
  }, 1000);

  setInterval(spawnFruit, 1500);
  setInterval(spawnBomb, 5000);
}

// Re-adjust when entering/exiting fullscreen
document.addEventListener("fullscreenchange", resizeCanvas);
document.addEventListener("webkitfullscreenchange", resizeCanvas);
document.addEventListener("msfullscreenchange", resizeCanvas);

function endGame() {
  cancelAnimationFrame(gameInterval);
  clearInterval(timerInterval);
  document.getElementById("gameUI").classList.add("hidden");
  document.getElementById("gameOverScreen").classList.remove("hidden");
  document.getElementById("finalScore").textContent = `Final Score: ${score}, Coins: ${coins}`;
}

function restartGame() { startGame(); }

function spawnFruit(){
  fruits.push({
    x: Math.random() * (canvas.width - 50),
    y: -50,
    size: 50,
    speed: 2 + Math.random()*2,
    type: fruitTypes[Math.floor(Math.random()*fruitTypes.length)],
    angle: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.02 // slow rotation
  });
}

function spawnBomb(){
  bombs.push({
    x: Math.random() * (canvas.width - 50),
    y: -50,
    size: 50,
    speed: 2.5 + Math.random()*2,
    angle: 0,
    rotationSpeed: (Math.random() - 0.5) * 0.02
  });
}

// Add effect
function addEffect(x, y, text, color="white") {
  effects.push({ x, y, text, color, alpha: 1, lifetime: 60 }); // 60 frames ≈ 1s
}

function update() {
  if (keys["ArrowLeft"] && basket.x > 0) basket.x -= basket.speed;
  if (keys["ArrowRight"] && basket.x + basket.width < canvas.width) basket.x += basket.speed;

  // smooth touch slide
  if (touchTargetX !== null) {
    basket.x += (touchTargetX - basket.x) * 0.2; // lerp smoothing
  }

  fruits.forEach(f => {
    f.y += f.speed;
    f.angle += f.rotationSpeed;
  });
  bombs.forEach(b => {
    b.y += b.speed;
    b.angle += b.rotationSpeed;
  });

  // handle fruits
  for (let i = fruits.length - 1; i >= 0; i--) {
    let f = fruits[i];
    if (f.y + f.size > basket.y &&
        f.x + f.size/2 > basket.x &&
        f.x < basket.x + basket.width) {
      score += 10;
      addEffect(f.x + f.size/2, f.y, "+10", "lime");
      fruits.splice(i, 1);
    } else if (f.y > canvas.height) {
      fruits.splice(i, 1);
    }
  }

  // handle bombs
  for (let i = bombs.length - 1; i >= 0; i--) {
    let b = bombs[i];
    if (b.y + b.size > basket.y &&
        b.x + b.size/2 > basket.x &&
        b.x < basket.x + basket.width) {
      score = Math.max(0, score - 40);
      addEffect(b.x + b.size/2, b.y, "-40", "red");
      basket.shake = 10;
      bombs.splice(i, 1);
    } else if (b.y > canvas.height) {
      bombs.splice(i, 1);
    }
  }

  coins = Math.floor(score / 100) * 0.25;

  // update effects
  effects.forEach(e => {
    e.y -= 0.5;
    e.alpha -= 0.02;
    e.lifetime--;
  });
  effects = effects.filter(e => e.lifetime > 0);

  if (basket.shake > 0) basket.shake--;
}

// ✅ draw function
function draw() {
  ctx.fillStyle = "#000822"; // deep blue
  ctx.globalAlpha = 1;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // watermark
  ctx.save();
  let fontSize = Math.floor(canvas.width * 0.15);
  ctx.font = `bold ${fontSize}px "Gill Sans", Arial, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("IdeaQLabs", canvas.width / 2, canvas.height / 2);
  ctx.restore();

  // basket
  let shakeX = basket.shake ? (Math.random() - 0.5) * 10 : 0;
  ctx.drawImage(assets.basket, basket.x + shakeX, basket.y, basket.width, basket.height);

  // fruits
  fruits.forEach(f => {
    ctx.save();
    ctx.translate(f.x + f.size/2, f.y + f.size/2);
    ctx.rotate(f.angle);
    ctx.drawImage(assets[f.type], -f.size/2, -f.size/2, f.size, f.size);
    ctx.restore();
  });

  // bombs
  bombs.forEach(b => {
    ctx.save();
    ctx.translate(b.x + b.size/2, b.y + b.size/2);
    ctx.rotate(b.angle);
    ctx.drawImage(assets.bomb, -b.size/2, -b.size/2, b.size, b.size);
    ctx.restore();
  });

  // floating effects
  ctx.font = "20px Poppins, Arial, sans-serif";
  ctx.textAlign = "center";
  effects.forEach(e => {
    ctx.globalAlpha = e.alpha;
    ctx.fillStyle = e.color;
    ctx.fillText(e.text, e.x, e.y);
    ctx.globalAlpha = 1;
  });
}

function gameLoop(){
  update();
  draw();
  document.getElementById("score").textContent = "Score: " + score;
  document.getElementById("coins").textContent = "Coins: " + coins;
  gameInterval = requestAnimationFrame(gameLoop);
}
