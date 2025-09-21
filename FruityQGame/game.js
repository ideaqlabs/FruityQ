const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let score, coins, timeLeft, basket, fruits, bombs, keys, gameInterval, timerInterval;
const assets = {};

// preload images
function loadAssets() {
  const names = ["basket","bomb","apple","orange","lemon","watermelon","grapes","strawberry"];
  names.forEach(n => {
    assets[n] = new Image();
    assets[n].src = `assets/${n}.png`;
  });
}

loadAssets();

const fruitTypes = ["apple","orange","lemon","watermelon","grapes","strawberry"];

document.getElementById("startBtn").addEventListener("click", startGame);
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// mouse controls
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  basket.x = mouseX - basket.width/2;
});

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touchX = e.touches[0].clientX - rect.left;
  basket.x = touchX - basket.width/2;
}, { passive: false });

function initGame() {
  score = 0;
  coins = 0;
  timeLeft = 60;
  fruits = [];
  bombs = [];
  keys = {};
  basket = { x: canvas.width/2 - 50, y: canvas.height - 60, width: 100, height: 60, speed: 7 };
}

function startGame() {
  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("gameOverScreen").classList.add("hidden");
  document.getElementById("gameUI").classList.remove("hidden");

  initGame();
  gameInterval = requestAnimationFrame(gameLoop);

  timerInterval = setInterval(() => {
    if(timeLeft > 0){
      timeLeft--;
      document.getElementById("timer").textContent = "Time: " + timeLeft;
    } else {
      endGame();
    }
  }, 1000);

  setInterval(spawnFruit, 1500);
  setInterval(spawnBomb, 5000);
}

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
    type: fruitTypes[Math.floor(Math.random()*fruitTypes.length)]
  });
}

function spawnBomb(){
  bombs.push({
    x: Math.random() * (canvas.width - 50),
    y: -50,
    size: 50,
    speed: 2.5 + Math.random()*2,
  });
}

function update(){
  if(keys["ArrowLeft"] && basket.x > 0) basket.x -= basket.speed;
  if(keys["ArrowRight"] && basket.x + basket.width < canvas.width) basket.x += basket.speed;

  fruits.forEach(f => f.y += f.speed);
  bombs.forEach(b => b.y += b.speed);

  // fruits collision
  fruits = fruits.filter(f => {
    if(f.y + f.size > basket.y &&
       f.x + f.size/2 > basket.x &&
       f.x < basket.x + basket.width){
      score += 10;
      coins += 1;
      return false;
    }
    return f.y < canvas.height;
  });

  // bombs collision (negative impact)
  bombs = bombs.filter(b => {
    if(b.y + b.size > basket.y &&
       b.x + b.size/2 > basket.x &&
       b.x < basket.x + basket.width){
      score = Math.max(0, score - 15);
      coins = Math.max(0, coins - 5);
      return false;
    }
    return b.y < canvas.height;
  });
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // basket
  ctx.drawImage(assets.basket, basket.x, basket.y, basket.width, basket.height);

  // fruits
  fruits.forEach(f => {
    ctx.drawImage(assets[f.type], f.x, f.y, f.size, f.size);
  });

  // bombs
  bombs.forEach(b => {
    ctx.drawImage(assets.bomb, b.x, b.y, b.size, b.size);
  });
}

function gameLoop(){
  update();
  draw();
  document.getElementById("score").textContent = "Score: " + score;
  document.getElementById("coins").textContent = "Coins: " + coins;
  gameInterval = requestAnimationFrame(gameLoop);
}
