// Простая бесконечная гоночная игра на canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayScore = document.getElementById('overlayScore');
const overlayRestart = document.getElementById('overlayRestart');
const scoreEl = document.getElementById('score');

const carSelect = document.getElementById('carSelect');
const carColorInput = document.getElementById('carColor');
const changeColorBtn = document.getElementById('changeColor');

const W = canvas.width;
const H = canvas.height;

let gameRunning = false;
let keys = {};
let obstacles = [];
let obstacleTimer = 0;
let obstacleInterval = 1000; // ms
let lastTime = 0;
let speed = 4;
let scroll = 0;
let score = 0;

// Машина игрока (разные формы для разных типов)
const carTypes = [
  { w: 60, h: 110, offset: 0 }, // спорткар — длинная
  { w: 62, h: 120, offset: 0 }, // седан
  { w: 70, h: 130, offset: 0 }  // внедорожник — шире
];

let player = {
  x: W/2 - 35,
  y: H - 160,
  color: '#0066ff',
  type: 0,
  w: carTypes[0].w,
  h: carTypes[0].h
};

// Нажатия клавиш
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

// UI
startBtn.onclick = () => startGame();
restartBtn.onclick = () => resetGame();
overlayRestart.onclick = () => resetGame();
carSelect.onchange = () => {
  player.type = Number(carSelect.value);
  player.w = carTypes[player.type].w;
  player.h = carTypes[player.type].h;
  // центруем чуть
  player.x = Math.max(30, Math.min(W - player.w - 30, player.x));
};
changeColorBtn.onclick = () => {
  player.color = carColorInput.value;
};

// Сброс и старт
function resetGame() {
  obstacles = [];
  obstacleTimer = 0;
  lastTime = performance.now();
  scroll = 0;
  score = 0;
  speed = 4;
  player.x = W/2 - player.w/2;
  player.y = H - player.h - 30;
  overlay.classList.add('hidden');
  gameRunning = true;
  requestAnimationFrame(loop);
}

function startGame() {
  if (!gameRunning) {
    resetGame();
  }
}

// Создание препятствия (шашки)
// obstacles: {x, y, w, h, speed}
function spawnObstacle() {
  // три полосы дороги: left, center, right
  const laneCount = 3;
  const laneWidth = (W - 80) / laneCount;
  const lane = Math.floor(Math.random() * laneCount);
  const x = 40 + lane * laneWidth + (laneWidth - 60)/2;
  const w = 60;
  const h = 40 + Math.random()*40; // разные по размеру
  obstacles.push({ x: x, y: -h - 10, w: w, h: h, speed: speed + Math.random()*1.5 });
}

// Столкновения AABB
function isCollide(a, b) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

// Рисуем дорогу и разметку
function drawRoad() {
  // фон дороги
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(20, 0, W - 40, H);

  // боковые бордюры
  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, 20, H);
  ctx.fillRect(W - 20, 0, 20, H);

  // разметка — пунктир по центру
  ctx.fillStyle = '#f2f2f2';
  const laneCount = 3;
  const laneWidth = (W - 80) / laneCount;
  for (let i = 1; i < laneCount; i++) {
    const x = 40 + i * laneWidth;
    // пунктир вертикальный
    for (let y = -50 + (scroll % 60); y < H; y += 40) {
      ctx.fillRect(x - 3, y, 6, 28);
    }
  }
}

// Рисуем игрока (машина — упрощенная форма)
function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  // корпус
  ctx.fillStyle = player.color;
  roundRect(ctx, 0, 0, player.w, player.h, 8, true, false);

  // окна
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(player.w*0.15, player.h*0.15, player.w*0.7, player.h*0.32);

  // колеса (черные прямоуг)
  const wheelW = Math.max(6, player.w*0.16);
  const wheelH = Math.max(8, player.h*0.12);
  ctx.fillStyle = '#111';
  ctx.fillRect(6, player.h - wheelH/1.3, wheelW, wheelH);
  ctx.fillRect(player.w - wheelW - 6, player.h - wheelH/1.3, wheelW, wheelH);

  ctx.restore();
}

// Вспомогательная функция для закругленного прямоугольника
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke === 'undefined') { stroke = true; }
  if (typeof radius === 'undefined') { radius = 5; }
  if (typeof radius === 'number') {
    radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else {
    var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// Основной цикл игры
function loop(ts) {
  if (!gameRunning) return;
  const dt = ts - lastTime;
  lastTime = ts;

  // управление
  const moveSpeed = 6;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    player.x -= moveSpeed;
    if (player.x < 30) player.x = 30;
  }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    player.x += moveSpeed;
    if (player.x + player.w > W - 30) player.x = W - 30 - player.w;
  }

  // обновление препятствий
  obstacleTimer += dt;
  if (obstacleTimer > obstacleInterval) {
    obstacleTimer = 0;
    spawnObstacle();
    // постепенно ускоряем игру и немного уменьшаем интервал
    speed += 0.08;
    obstacleInterval = Math.max(600, obstacleInterval - 6);
  }

  // передвижение
  obstacles.forEach(ob => {
    ob.y += ob.speed;
  });

  // убрать вышедшие
  obstacles = obstacles.filter(ob => ob.y < H + 200);

  // столкновения
  const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };
  let hit = false;
  for (let ob of obstacles) {
    const box = { x: ob.x, y: ob.y, w: ob.w, h: ob.h };
    if (isCollide(playerBox, box)) {
      hit = true;
      break;
    }
  }

  // очки: увеличиваем с течением времени
  score += dt * 0.01 * Math.max(1, speed/4);
  scoreEl.textContent = 'Очки: ' + Math.floor(score);

  // рисуем
  ctx.clearRect(0,0,W,H);
  drawRoad();

  // рисуем препятствия (шашки)
  for (let ob of obstacles) {
    // шашка — квадрат с шахматным узором (чёрно-белая)
    drawChecker(ob.x, ob.y, ob.w, ob.h);
  }

  // рисуем игрока
  drawPlayer();

  // партиклы/имитация движения
  scroll += speed;
  if (scroll > 99999) scroll = 0;

  if (hit) {
    gameOver();
    return;
  }

  requestAnimationFrame(loop);
}

function drawChecker(x,y,w,h) {
  // фон шашки
  ctx.fillStyle = '#fefefe';
  roundRect(ctx, x, y, w, h, 6, true, false);

  // нарисуем 4 квадратика внутри для шахматного эффекта
  const cw = w / 2;
  const ch = h / 2;
  ctx.fillStyle = '#111';
  ctx.fillRect(x, y, cw, ch);
  ctx.fillRect(x + cw, y + ch, cw, ch);
}

// При проигрыше
function gameOver() {
  gameRunning = false;
  overlay.classList.remove('hidden');
  overlayTitle.textContent = 'Вы проиграли';
  overlayScore.textContent = 'Очки: ' + Math.floor(score);
}

// Инициализация положения игрока
function init() {
  player.type = Number(carSelect.value);
  player.w = carTypes[player.type].w;
  player.h = carTypes[player.type].h;
  player.color = carColorInput.value;
  player.x = W/2 - player.w/2;
  player.y = H - player.h - 30;
  score = 0;
  scoreEl.textContent = 'Очки: 0';
}

init();

// Автостарт для удобства (но можно нажать Старт)
startGame();
