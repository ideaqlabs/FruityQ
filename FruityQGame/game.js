const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let score = 0;
let coins = 0;
let timeLeft = 60;
let basket = { x: canvas.width/2 - 40, y: canvas.height - 40, width: 80, height: 20, speed: 6 };
let fruits = [];
let bombs = [];
let keys = {};

const fruitEmojis = ["🍎","🍊","🍋","🍉","🍇","🍓"];
const bombEmoji = "💣";

// smooth basket movement
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// spawn fruit
function spawnFruit(){
  fruits.push({
    x: Math.random() * (canvas.width - 30),
    y: -30,
    size: 30,
    speed: 2 + Math.random()*2,
    emoji: fruitEmojis[Math.floor(Math.random()*fruitEmojis.length)]
  });
}

// spawn bomb
function spawnBomb(){
  bombs.push({
    x: Math.random() * (canvas.width - 30),
    y: -30,
    size: 30,
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

  // check collisions
  fruits = fruits.filter(f => {
    if(f.y + f.size > basket.y && f.x > basket.x && f.x < basket.x + basket.width){
      score += 10;
      coins += 1;
      return false;
    }
    return f.y < canvas.height;
  });

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
  ctx.fillStyle = "#444";
  ctx.fillRect(basket.x, basket.y, basket.width, basket.height);

  // fruits
  ctx.font = "24px Arial";
  fruits.forEach(f => ctx.fillText(f.emoji, f.x, f.y));

  // bombs
  bombs.forEach(b => ctx.fillText(b.emoji, b.x, b.y));
}

function gameLoop(){
  update();
  draw();
  document.getElementById("score").textContent = "Score: " + score;
  document.getElementById("coins").textContent = "Coins: " + coins;
  requestAnimationFrame(gameLoop);
}

// timer
setInterval(() => {
  if(timeLeft > 0){
    timeLeft--;
    document.getElementById("timer").textContent = "Time: " + timeLeft;
  } else {
    alert("Game Over! Final Score: " + score + ", Coins: " + coins);
    document.location.reload();
  }
},1000);

// spawn loop
setInterval(spawnFruit, 1500);
setInterval(spawnBomb, 5000);

gameLoop();
