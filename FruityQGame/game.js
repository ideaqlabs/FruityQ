(function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const gameContainer = document.getElementById("gameContainer");
  const startScreen = document.getElementById("startScreen");
  const startBtn = document.getElementById("startBtn");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const finalScoreEl = document.getElementById("finalScore");
  const playAgainBtn = document.getElementById("playAgainBtn");

  const scoreEl = document.getElementById("score");
  const timerEl = document.getElementById("timer");
  const coinsEl = document.getElementById("coins");
  const totalEl = document.getElementById("totalCoins");

  let spawnFruitInterval = null;
  let spawnBombInterval = null;
  let timerInterval = null;
  let rafId = null;

  let score = 0;
  let coins = 0;
  let totalCoins = 0;
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

  // ---------- Helpers ----------
  function formatCoins(n) {
    return Number(n).toFixed(2).replace(/\.00$/, "");
  }

  function pauseGame() {
    gamePaused = true;
    clearInterval(spawnFruitInterval);
    clearInterval(spawnBombInterval);
    clearInterval(timerInterval);
  }

  function resumeGame() {
    if (!gamePaused) return;
    gamePaused = false;

    if (!spawnFruitInterval) spawnFruitInterval = setInterval(spawnFruit, 1400);
    if (!spawnBombInterval) spawnBombInterval = setInterval(spawnBomb, 5000);

    if (!timerInterval && timeLeft > 0) {
      timerInterval = setInterval(() => {
        if (!gamePaused) {
          if (timeLeft > 0) {
            timeLeft--;
            timerEl.textContent = "Time: " + timeLeft;
          } else endGame();
        }
      }, 1000);
    }
  }

  document.addEventListener("visibilitychange", () => document.hidden ? pauseGame() : resumeGame());
  window.addEventListener("blur", pauseGame);
  window.addEventListener("focus", resumeGame);

  function resizeCanvas() {
    const rect = gameContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height - 60; // leave space for HUD

    const bw = Math.max(80, Math.floor(canvas.width * 0.18));
    const bh = Math.max(40, Math.floor(canvas.height * 0.11));
    if (basket) {
      basket.width = bw;
      basket.height = bh;
      basket.y = canvas.height - bh - 10;
      basket.x = Math.max(0, Math.min(canvas.width - bw, basket.x));
    }
  }
  window.addEventListener("resize", resizeCanvas);

  // ---------- Load Assets ----------
  function loadAssets(callback) {
    const names = ["basket", "bomb", ...fruitTypes];
    let loaded = 0;
    names.forEach(name => {
      const img = new Image();
      img.src = `assets/${name}.png`;
      img.onload = () => { assets[name] = img; loaded++; if (loaded === names.length) callback(); };
      img.onerror = () => { assets[name] = null; loaded++; if (loaded === names.length) callback(); };
    });
  }

  // ---------- Input ----------
  document.addEventListener("keydown", e => keys[e.key] = true);
  document.addEventListener("keyup", e => keys[e.key] = false);
  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    if (basket) basket.x = e.clientX - rect.left - basket.width/2;
  });
  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    touchTargetX = e.touches[0].clientX - rect.left - basket.width/2;
  }, { passive: false });

  // ---------- Game ----------
  function initGameState() {
    score = 0; coins = 0; timeLeft = 60;
    fruits = []; bombs = []; effects = [];
    keys = {}; touchTargetX = null;
    totalCoins = parseFloat(localStorage.getItem("playerCoins") || "0");

    const bw = Math.max(80, Math.floor(canvas.width * 0.18));
    const bh = Math.max(40, Math.floor(canvas.height * 0.11));
    basket = { x: (canvas.width-bw)/2, y: canvas.height-bh-10, width: bw, height: bh, speed: Math.max(6, canvas.width*0.015), shake: 0 };

    scoreEl.textContent = "Score: 0";
    coinsEl.textContent = "Coins: 0";
    totalEl.textContent = "Total Coins: " + formatCoins(totalCoins);
    timerEl.textContent = "Time: " + timeLeft;
  }

  function startGameLoop() {
    clearInterval(spawnFruitInterval); clearInterval(spawnBombInterval); clearInterval(timerInterval);
    spawnFruitInterval = setInterval(spawnFruit, 1400);
    spawnBombInterval = setInterval(spawnBomb, 5000);
    timerInterval = setInterval(() => {
      if (!gamePaused) {
        if (timeLeft > 0) { timeLeft--; timerEl.textContent = "Time: " + timeLeft; } 
        else endGame();
      }
    }, 1000);
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    startScreen.classList.add("hidden");
    gameContainer.classList.remove("hidden");
    initGameState();
    resizeCanvas();
    startGameLoop();
    try { gameContainer.requestFullscreen(); } catch(e) {}
  }

  function endGame() {
    stopGameLoop();
    coins = Math.floor(score / 100) * 0.25;
    totalCoins += coins;
    localStorage.setItem("playerCoins", totalCoins.toFixed(2));
    coinsEl.textContent = "Coins: " + formatCoins(coins);
    totalEl.textContent = "Total Coins: " + formatCoins(totalCoins);
    finalScoreEl.textContent = `Final Score: ${score}, Coins: ${formatCoins(coins)}, Total Coins: ${formatCoins(totalCoins)}`;
    gameOverScreen.classList.remove("hidden");
  }

  function stopGameLoop() {
    cancelAnimationFrame(rafId);
    clearInterval(spawnFruitInterval); clearInterval(spawnBombInterval); clearInterval(timerInterval);
  }

  function restartGame() {
    gameOverScreen.classList.add("hidden");
    startGame();
  }

  // ---------- Spawning ----------
  function spawnFruit() {
    fruits.push({ x: Math.random()*(canvas.width-50), y: -50, size: 40, speed: 2+Math.random()*2, type: fruitTypes[Math.floor(Math.random()*fruitTypes.length)], angle: 0, rotationSpeed: (Math.random()-0.5)*0.03 });
  }
  function spawnBomb() {
    bombs.push({ x: Math.random()*(canvas.width-50), y: -50, size: 40, speed: 2+Math.random()*2, angle:0, rotationSpeed: (Math.random()-0.5)*0.04 });
  }

  function addEffect(x,y,text,color="white"){ effects.push({x,y,text,color,alpha:1,lifetime:60}); }

  // ---------- Update & Draw ----------
  function update(delta=1) {
    if (keys["ArrowLeft"] || keys["a"]) basket.x -= basket.speed*delta;
    if (keys["ArrowRight"] || keys["d"]) basket.x += basket.speed*delta;
    if (touchTargetX!==null) basket.x += (touchTargetX - basket.x)*0.18*delta;
    basket.x = Math.max(0, Math.min(canvas.width-basket.width, basket.x));

    for (const f of fruits){ f.y+=f.speed*delta; f.angle+=f.rotationSpeed*delta; }
    for (const b of bombs){ b.y+=b.speed*delta; b.angle+=b.rotationSpeed*delta; }

    for (let i=fruits.length-1;i>=0;i--){
      const f=fruits[i];
      if(f.y+f.size>basket.y && f.x+f.size/2>basket.x && f.x<basket.x+basket.width){ score+=10; addEffect(f.x+f.size/2,f.y,"+10","lime"); fruits.splice(i,1); } 
      else if(f.y>canvas.height+80) fruits.splice(i,1);
    }

    for (let i=bombs.length-1;i>=0;i--){
      const b=bombs[i];
      if(b.y+b.size>basket.y && b.x+b.size/2>basket.x && b.x<basket.x+basket.width){ score=Math.max(0,score-40); addEffect(b.x+b.size/2,b.y,"-40","red"); basket.shake=10; bombs.splice(i,1); } 
      else if(b.y>canvas.height+80) bombs.splice(i,1);
    }

    for(const e of effects){ e.y-=0.6*delta; e.alpha-=0.02*delta; e.lifetime-=1; }
    effects=effects.filter(e=>e.lifetime>0);
    if(basket.shake>0) basket.shake=Math.max(0,basket.shake-1);
  }

  function draw() {
    ctx.fillStyle="#000822"; ctx.fillRect(0,0,canvas.width,canvas.height);

    const shakeX = basket.shake?(Math.random()-0.5)*10:0;
    if(assets.basket) ctx.drawImage(assets.basket,basket.x+shakeX,basket.y,basket.width,basket.height);
    else ctx.fillRect(basket.x+shakeX,basket.y,basket.width,basket.height);

    for(const f of fruits){
      ctx.save(); ctx.translate(f.x+f.size/2,f.y+f.size/2); ctx.rotate(f.angle);
      if(assets[f.type]) ctx.drawImage(assets[f.type],-f.size/2,-f.size/2,f.size,f.size);
      else ctx.fillRect(-f.size/2,-f.size/2,f.size,f.size);
      ctx.restore();
    }

    for(const b of bombs){
      ctx.save(); ctx.translate(b.x+b.size/2,b.y+b.size/2); ctx.rotate(b.angle);
      if(assets.bomb) ctx.drawImage(assets.bomb,-b.size/2,-b.size/2,b.size,b.size);
      else ctx.fillRect(-b.size/2,-b.size/2,b.size,b.size);
      ctx.restore();
    }

    ctx.font="20px Poppins, Arial, sans-serif"; ctx.textAlign="center";
    for(const e of effects){ ctx.globalAlpha=Math.max(0,e.alpha); ctx.fillStyle=e.color; ctx.fillText(e.text,e.x,e.y); ctx.globalAlpha=1; }

    scoreEl.textContent="Score: "+score;
    coinsEl.textContent="Coins: "+formatCoins(Math.floor(score/100)*0.25);
    totalEl.textContent="Total Coins: "+formatCoins(totalCoins+Math.floor(score/100)*0.25);
  }

  function gameLoop(timestamp){
    if(!lastTime) lastTime=timestamp;
    if(!gamePaused){
      const delta=Math.min(200,Math.max(0,timestamp-lastTime))/16.67;
      lastTime=timestamp;
      update(delta); draw();
    } else lastTime=timestamp;
    rafId=requestAnimationFrame(gameLoop);
  }

  // ---------- Event Listeners ----------
  startBtn.addEventListener("click",()=>loadAssets(startGame));
  playAgainBtn.addEventListener("click",restartGame);
  window.addEventListener("fullscreenchange",()=>setTimeout(resizeCanvas,80));
})();
