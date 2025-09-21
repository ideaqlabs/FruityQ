// FruityQ game logic - split file version
update(dt){
// desired velocity towards target
const desired = (this.targetX - this.x);
// acceleration proportional to distance, capped by max speed
const accel = desired * (18 + upgrades.magnet * 3); // tuning factor
this.vx += accel * dt;
// clamp velocity
const vmax = this.maxSpeed;
if(this.vx > vmax) this.vx = vmax; if(this.vx < -vmax) this.vx = -vmax;
// integrate
this.x += this.vx * dt;
// apply damping for smooth stopping
this.vx *= Math.pow(this.friction, dt*60);
// clamp position
this.x = clamp(this.x, this.w/2, canvas.clientWidth - this.w/2);
}
};


// Entities
const FRUIT_TYPES = [
{emoji:'🍎', value:1, size:34, rarity:0.55, color:'#ff4d4d'},
{emoji:'🍊', value:2, size:36, rarity:0.22, color:'#ff9a2a'},
{emoji:'🍐', value:3, size:34, rarity:0.13, color:'#6fe08f'},
{emoji:'🍍', value:6, size:42, rarity:0.07, color:'#ffe56b'},
];
function pickFruit(){ const r=Math.random(); let a=0; for(const f of FRUIT_TYPES){ a+=f.rarity; if(r<a) return {...f}; } return {...FRUIT_TYPES[0]}; }


let entities = []; // fruit, bombs, particles, text


function spawnFruit(){ const f = pickFruit(); entities.push({type:'fruit', x:rand(40, canvas.clientWidth-40), y:-40, vx:rand(-30,30), vy:rand(80+level*6,140+level*22), size:f.size, emoji:f.emoji, value:f.value, color:f.color, rotation:rand(-0.8,0.8)}); }


function spawnBomb(){ entities.push({type:'bomb', x:rand(40, canvas.clientWidth-40), y:-40, vx:rand(-30,30), vy:rand(140+level*8,200+level*30), size:40, emoji:'💣', rotation:rand(-0.8,0.8)}); }


function spawnParticles(x,y,count=10,color='#fff'){ for(let i=0;i<count;i++) entities.push({type:'p', x,y, vx:rand(-220,220), vy:rand(-260,-20), life:rand(0.45,1.0), r:rand(2,6), color}); }
function spawnText(x,y,txt,color='#ffd166'){ entities.push({type:'text', x,y, txt, life:0.9, color}); }


// Combo
let combo=0, comboTimer=0;
function addCombo(){ combo++; comboTimer=1.6; }


// Timing and spawn control
let lastSpawn=0, spawnInterval=0.85, lastTime=0, timeElapsed=0, remaining=ROUND_TIME;


function resetGame(){ entities=[]; coins=0; score=0; level=1; combo=0; comboTimer=0; timeElapsed=0; lastSpawn=0; remaining=ROUND_TIME; updateHUD(); }


function endRound(){ running=false; // show end screen
const tpl = $('endTemplate'); const clone = tpl.content.cloneNode(true); const container = document.createElement('div'); container.id='endOverlay'; container.appendChild(clone); document.body.appendChild(container);
$('finalScore').textContent = `Score: ${Math.floor(score)}`; $('finalCoins').textContent = `Coins: ${Math.floor(coins)}`;
$('playAgain').addEventListener('click', ()=>{ container.remove(); resetGame(); startGame(); });
}


function gameTick(t){ if(!running){ lastTime=t; requestAnimationFrame(gameTick); return; } if(paused){ lastTime=t; requestAnimationFrame(gameTick); return; }
const dt = Math.min((t-lastTime)/1000, 0.05); lastTime=t; timeElapsed += dt; remaining -= dt; if(remaining < 0){ remaining = 0; updateHUD(); endRound(); return; }
// level scaling
const newLevel = Math.floor((timeElapsed)/12) + 1; if(newLevel !== level) level=newLevel;
updateHUD();
// spawn logic (fruits + occasional bombs)
lastSpawn += dt; const inv = spawnInterval * Math.max(0.45, 1 - level*0.03 - upgrades.slow*0.02);
if(lastSpawn > inv){ lastSpawn = 0; // spawn fruit mostly
if(Math.random() < Math.min(0.12 + level*0.01, 0.28)){ spawnBomb(); } else spawnFruit(); }


// update entities
for(let i=entities.length-1;i>=0;i--){ const e=entities[i]; if(e.type==='fruit'){ e.vy += 260*dt; e.x += e.vx*dt; e.y += e.vy*dt; e.rotation += 0.12*dt;
const bx=player.x, by=player.y, catchW=player.w*0.5; if(e.y + e.size/2 >= by - player.h/2 && e.y - e.size/2 < by + player.h/2 && Math.abs(e.x - bx) < catchW)
