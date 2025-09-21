const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let score, coins, timeLeft, basket, fruits, bombs, keys, gameInterval, timerInterval;

const fruitEmojis = ["🍎","🍊","🍋","🍉","🍇","🍓"];
const bombEmoji = "💣";

document.getElementById("startBtn").addEventListener("click", startGame);
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

function initGame() {
  score = 0;
  coins = 0;
  timeLeft = 60;
  fruits = [];
  bombs = [];
  keys = {};
  basket = { x: canvas.width/2 - 50, y: canvas.height - 40, width: 100, height: 20, speed: 7 };
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

function restartGame() {
  startGame();
}

// spawn fruit
function spawnFruit(){
  fruits.push({
    x: Math.random() * (canvas.width - 40),
    y: -40,
    size: 40, // bigger size
    speed: 2 + Math.random()*2,
    emoji: fruitEmojis[Math.floor(Math.random()*fruitEmojis.length)]
  });
}

// spawn bomb
function spawnBomb(){
  bombs.push({
    x: Math.random() * (canvas.width - 40),
    y: -40,
    size: 40, // bigger size
    speed: 2.5 + Math.random()*2,
    emoji: bombEmoji
  });
}

function update(){
  // basket movement
  if(keys["ArrowLeft"] && basket.x > 0) basket.x -= basket.speed;
  if(keys["ArrowRight"] && basket.x + basket.width < canvas.width) basket.x += basket.speed;

  // fruits
  fruits.forEach(f => f.y += f.speed);
  bombs.forEach(b => b.y += b.speed);

  // check fruit collisions
  fruits = fruits.filter(f => {
    if(f.y + f.size > basket.y && f.x > basket.x && f.x < basket.x + basket.width){
      score += 10;
      coins += 1;
      return false;
    }
    return f.y < canvas.height;
  });

  // check bomb collisions
  bombs = bombs.filter(b => {
    if(b.y + b.size > basket.y && b.x > basket.x && b.x < basket.x + basket.width){
      coins = Math.max(0, coins - 5); // lose coins
      return false;
    }
    return b.y < canvas.height;
  });
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // basket
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(basket.x, basket.y, basket.width, basket.height);

  // fruits
  ctx.font = "36px Arial"; // bigger font
  fruits.forEach(f => ctx.fillText(f.emoji, f.x, f.y));

  // bombs
  ctx.font = "36px Arial"; // bigger font
  bombs.forEach(b => ctx.fillText(b.emoji, b.x, b.y));
}

function gameLoop(){
  update();
  draw();
  document.getElementById("score").textContent = "Score: " + score;
  document.getElementById("coins").textContent = "Coins: " + coins;
  gameInterval = requestAnimationFrame(gameLoop);
}
