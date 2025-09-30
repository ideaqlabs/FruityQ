(function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const gameContainer = document.getElementById("gameContainer");
  const startScreen = document.getElementById("startScreen");
  const startBtn = document.getElementById("startBtn");
  const gameUI = document.getElementById("gameUI");
  const hud = document.getElementById("hud");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const finalScoreEl = document.getElementById("finalScore");
  const playAgainBtn = document.getElementById("playAgainBtn");

  let spawnFruitInterval = null;
  let spawnBombInterval = null;
  let timerInterval = null;
  let rafId = null;

  let score = 0;
  let coins = 0;          // coins earned in current game
  let totalCoins = 0;     // cumulative coins across all sessions
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

  // ------------------- Helpers -------------------
  function formatCoins(n) {
    if (n == null) return "0";
    const str = Number(n).toFixed(2);
    return str.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }

  function pauseGame() {
    gamePaused = true;
    clearInterval(spawnFruitInterval);
    spawnFruitInterval = null;
    clearInterval(spawnBombInterval);
    spawnBombInterval = null;
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function resumeGame() {
    if (!gamePaused) return;
    gamePaused = false;
    lastTime = performance.now();

    if (!spawnFruitInterval) spawnFruitInterval = setInterval(spawnFruit, 1400);
    if (!spawnBombInterval) spawnBombInterval = setInterval(spawnBomb, 5000);

    if (!timerInterval && timeLeft > 0) {
      timerInterval = setInterval(() => {
        if (!gamePaused) {
          if (timeLeft > 0) {
            timeLeft--;
            document.getElementById("timer").textContent = "Time: " + timeLeft;
          } else {
            endGame();
          }
        }
      }, 1000);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseGame();
    else resumeGame();
  });
  window.addEventListener("blur", pauseGame);
  window.addEventListener("focus", resumeGame);

  function resizeCanvas() {
    let rect = { width: window.innerWidth, height: window.innerHeight };
    if (gameContainer) {
      const r = gameContainer.getBoundingClientRect();
      if (r.width > 20 && r.height > 20) rect = r;
    }

    const isPortrait = rect.height > rect.width;
    if (isPortrait) {
      canvas.width = Math.min(Math.floor(rect.width * 0.95), 420);
      canvas.height = Math.min(Math.floor(rect.height * 0.88), 720);
    } else {
      canvas.width = Math.min(Math.floor(rect.width * 0.75), 900);
      canvas.height = Math.min(Math.floor(rect.height * 0.7), 600);
    }

    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";

    if (hud) hud.style.width = canvas.width + "px";

    if (basket) {
      basket.y = canvas.height - basket.height - 10;
      basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));
    }
  }

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 60));

  function loadAssets(cb) {
    const names = ["basket", "bomb", ...fruitTypes];
    let loaded = 0;
    names.forEach(name => {
      const img = new Image();
      img.src = `assets/${name}.png`;
      img.onload = () => { assets[name] = img; loaded++; if (loaded === names.length) cb(); };
      img.onerror = () => { assets[name] = null; loaded++; if (loaded === names.length) cb(); };
    });
  }

  // --------------- Input handlers ----------------
  document.addEventListener("keydown", e => { keys[e.key] = true; });
  document.addEventListener("keyup", e => { keys[e.key] = false; });

  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    if (basket) basket.x = mx - basket.width / 2;
  });

  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    touchTargetX = e.touches[0].clientX - rect.left - (basket ? basket.width/2 : 0);
  }, { passive: false });

  // ----------------- Game lifecycle -----------------
  function initGameState() {
    score = 0;
    coins = 0;
    timeLeft = 60;
    fruits = [];
    bombs = [];
    effects = [];
    keys = {};
    touchTargetX = null;

    totalCoins = parseFloat(localStorage.getItem("playerCoins") || "0") || 0;

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

    document.getElementById("score").textContent = "Score: 0";
    document.getElementById("coins").textContent = "Coins: 0";
    document.getElementById("totalCoins").textContent = "Total Coins: " + formatCoins(totalCoins);
    document.getElementById("timer").textContent = "Time: " + timeLeft;
  }

  function startGameLoop() {
    clearInterval(spawnFruitInterval);
    clearInterval(spawnBombInterval);
    clearInterval(timerInterval);

    spawnFruitInterval = setInterval(spawnFruit, 1400);
    spawnBombInterval = setInterval(spawnBomb, 5000);

    timerInterval = setInterval(() => {
      if (!gamePaused) {
        if (timeLeft > 0) {
          timeLeft--;
          document.getElementById("timer").textContent = "Time: " + timeLeft;
        } else {
          endGame();
        }
      }
    }, 1000);

    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(gameLoop);
  }

  function stopGameLoop() {
    cancelAnimationFrame(rafId);
    clearInterval(spawnFruitInterval);
    clearInterval(spawnBombInterval);
    clearInterval(timerInterval);
    spawnFruitInterval = spawnBombInterval = timerInterval = null;
  }

  function startGame() {
    startScreen.classList.add("hidden");
    gameContainer.classList.remove("hidden");
    gameUI.classList.remove("hidden");
    gameOverScreen.classList.add("hidden");

    initGameState();
    resizeCanvas();
    startGameLoop();

    // request fullscreen
    try { gameContainer.requestFullscreen(); } catch(e) {}
  }

  function endGame() {
    stopGameLoop();

    coins = Math.floor(score / 100) * 0.25;
    totalCoins += coins;
    localStorage.setItem("playerCoins", totalCoins.toFixed(2));

    document.getElementById("coins").textContent = "Coins: " + formatCoins(coins);
    document.getElementById("totalCoins").textContent = "Total Coins: " + formatCoins(totalCoins);

    finalScoreEl.textContent = `Final Score: ${score}, Coins this game: ${formatCoins(coins)}, Total Coins: ${formatCoins(totalCoins)}`;

    gameOverScreen.classList.remove("hidden");
  }

  function restartGame() {
    gameOverScreen.classList.add("hidden");
    startGame();
  }

  // --------------- Spawning -----------------
  function spawnFruit() {
    fruits.push({
      x: Math.random() * Math.max(20, canvas.width-80),
      y: -60,
      size: Math.max(36, Math.floor(canvas.width * 0.08)),
      speed: 2 + Math.random()*1.8,
      type: fruitTypes[Math.floor(Math.random()*fruitTypes.length)],
      angle: 0,
      rotationSpeed: (Math.random()-0.5)*0.03
    });
  }
  function spawnBomb() {
    bombs.push({
      x: Math.random() * Math.max(20, canvas.width-80),
      y: -60,
      size: Math.max(40, Math.floor(canvas.width * 0.09)),
      speed: 2.5 + Math.random()*2,
      angle: 0,
      rotationSpeed: (Math.random()-0.5)*0.04
    });
  }

  function addEffect(x, y, text, color="white") {
    effects.push({x, y, text, color, alpha: 1, lifetime: 60});
  }

  // --------------- Update & Draw -----------------
  function update(delta=1) {
    if (keys["ArrowLeft"] || keys["a"]) basket.x -= basket.speed * delta;
    if (keys["ArrowRight"] || keys["d"]) basket.x += basket.speed * delta;

    if (touchTargetX !== null) basket.x += (touchTargetX - basket.x)*0.18*delta;

    basket.x = Math.max(0, Math.min(canvas.width - basket.width, basket.x));

    for (const f of fruits) { f.y += f.speed*delta; f.angle += f.rotationSpeed*delta; }
    for (const b of bombs) { b.y += b.speed*delta; b.angle += b.rotationSpeed*delta; }

    for (let i=fruits.length-1; i>=0; i--) {
      const f = fruits[i];
      if (f.y+f.size > basket.y && f.x+f.size/2>basket.x && f.x<basket.x+basket.width) {
        score += 10;
        addEffect(f.x+f.size/2, f.y, "+10", "lime");
        fruits.splice(i,1);
      } else if (f.y>canvas.height+80) fruits.splice(i,1);
    }

    for (let i=bombs.length-1; i>=0; i--) {
      const b = bombs[i];
      if (b.y+b.size > basket.y && b.x+b.size/2>basket.x && b.x<basket.x+basket.width) {
        score = Math.max(0, score-40);
        addEffect(b.x+b.size/2, b.y, "-40", "red");
        basket.shake = 10;
        bombs.splice(i,1);
      } else if (b.y>canvas.height+80) bombs.splice(i,1);
    }

    for (const e of effects) {
      e.y -= 0.6*delta;
      e.alpha -= 0.02*delta;
      e.lifetime -= Math.ceil(1*delta);
    }
    effects = effects.filter(e=>e.lifetime>0);

    if (basket.shake>0) basket.shake = Math.max(0, basket.shake - Math.ceil(1*delta));
  }

  function draw() {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000822";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.save();
    const watermarkSize = Math.max(16, Math.floor(canvas.width*0.15));
    ctx.font = `bold ${watermarkSize}px "Gill Sans", Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("IdeaQLabs", canvas.width/2, canvas.height/2);
    ctx.restore();

    const shakeX = basket.shake ? (Math.random()-0.5)*10 : 0;
    if (assets.basket) ctx.drawImage(assets.basket, basket.x+shakeX, basket.y, basket.width, basket.height);
    else ctx.fillRect(basket.x+shakeX, basket.y, basket.width, basket.height);

    for (const f of fruits) {
      ctx.save();
      ctx.translate(f.x+f.size/2,f.y+f.size/2);
      ctx.rotate(f.angle);
      if (assets[f.type]) ctx.drawImage(assets[f.type], -f.size/2, -f.size/2, f.size, f.size);
      else ctx.fillRect(-f.size/2,-f.size/2,f.size,f.size);
      ctx.restore();
    }

    for (const b of bombs) {
      ctx.save();
      ctx.translate(b.x+b.size/2,b.y+b.size/2);
      ctx.rotate(b.angle);
      if (assets.bomb) ctx.drawImage(assets.bomb, -b.size/2, -b.size/2, b.size, b.size);
      else ctx.fillRect(-b.size/2,-b.size/2,b.size,b.size);
      ctx.restore();
    }

    ctx.font = "20px Poppins, Arial, sans-serif";
    ctx.textAlign = "center";
    for (const e of effects) {
      ctx.globalAlpha = Math.max(0,e.alpha);
      ctx.fillStyle = e.color;
      ctx.fillText(e.text,e.x,e.y);
      ctx.globalAlpha = 1;
    }
  }

  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    if (!gamePaused) {
      let deltaMs = timestamp - lastTime;
      deltaMs = Math.min(200, Math.max(0, deltaMs));
      lastTime = timestamp;
      const delta = deltaMs/16.67;

      update(delta);
      draw();

      const coinsEl = document.getElementById("coins");
      const totalEl = document.getElementById("totalCoins");
      if (coinsEl) coinsEl.textContent = "Coins: " + formatCoins(Math.floor(score/100)*0.25);
      if (totalEl) totalEl.textContent = "Total Coins: " + formatCoins(totalCoins + Math.floor(score/100)*0.25);

      document.getElementById("score").textContent = "Score: " + score;
    } else lastTime = timestamp;

    rafId = requestAnimationFrame(gameLoop);
  }

  // --------------- Hooks -----------------
  startBtn.addEventListener("click", () => {
    loadAssets(() => startGame());
  });

  playAgainBtn.addEventListener("click", restartGame);

  window.addEventListener("fullscreenchange", ()=>setTimeout(resizeCanvas,80));
  window.addEventListener("webkitfullscreenchange", ()=>setTimeout(resizeCanvas,80));
  window.addEventListener("msfullscreenchange", ()=>setTimeout(resizeCanvas,80));

  window.restartGame = restartGame;

  (function initial() {
    gameContainer.classList.add("hidden");
    gameUI.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    resizeCanvas();
  })();
})();
