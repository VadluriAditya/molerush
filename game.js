// MoleRush -- whack-a-mole reaction game. 30-second round, moles score, bombs cost you.

const COLS = 3;
const ROWS = 3;
const HOLES = COLS * ROWS;
const CANVAS_W = 360;
const CANVAS_H = 460;
const GRID_TOP = 90;
const CELL = CANVAS_W / COLS;
const HOLE_R = 46;
const ROUND_MS = 30000;
const BOMB_CHANCE = 0.28;
const MAX_ACTIVE = 2;

let state;

function emptyHoles() {
  return Array.from({ length: HOLES }, () => ({ kind: null, hideAt: 0 }));
}

function freshState() {
  return {
    holes: emptyHoles(),
    score: 0,
    elapsed: 0,
    sinceSpawn: 0,
    timeLeft: ROUND_MS,
    over: false,
    best: state ? state.best : Number(localStorage.getItem("molerush.best") || 0),
  };
}

function newGame() {
  state = freshState();
  render();
}

function upDuration(elapsed) {
  return Math.max(380, 950 - elapsed / 45);
}

function spawnInterval(elapsed) {
  return Math.max(350, 750 - elapsed / 60);
}

function activeCount() {
  return state.holes.filter(h => h.kind).length;
}

function tick(dtMs) {
  if (state.over) return;
  state.elapsed += dtMs;
  state.timeLeft -= dtMs;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.over = true;
    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem("molerush.best", String(state.best));
    }
    return;
  }

  state.sinceSpawn += dtMs;
  if (state.sinceSpawn >= spawnInterval(state.elapsed) && activeCount() < MAX_ACTIVE) {
    state.sinceSpawn = 0;
    const emptyIdx = state.holes.map((h, i) => (h.kind ? -1 : i)).filter(i => i >= 0);
    if (emptyIdx.length) {
      const i = emptyIdx[Math.floor(Math.random() * emptyIdx.length)];
      state.holes[i] = {
        kind: Math.random() < BOMB_CHANCE ? "bomb" : "mole",
        hideAt: state.elapsed + upDuration(state.elapsed),
      };
    }
  }

  for (const h of state.holes) {
    if (h.kind && state.elapsed >= h.hideAt) {
      h.kind = null;
    }
  }
}

function whack(i) {
  if (state.over) return;
  const h = state.holes[i];
  if (!h || !h.kind) return;
  if (h.kind === "mole") {
    state.score += 1;
  } else {
    state.score = Math.max(0, state.score - 3);
  }
  h.kind = null;
}

function holeCenter(i) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  return { x: col * CELL + CELL / 2, y: GRID_TOP + row * (CELL - 4) + CELL / 2 };
}

function draw() {
  const canvas = document.getElementById("game");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0d0e13";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = "#ece7e1";
  ctx.font = "bold 22px -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Score " + state.score, 16, 34);
  ctx.textAlign = "right";
  ctx.fillText(Math.ceil(state.timeLeft / 1000) + "s", CANVAS_W - 16, 34);
  ctx.textAlign = "center";
  ctx.fillStyle = "#8b8794";
  ctx.font = "13px -apple-system, sans-serif";
  ctx.fillText("Best " + state.best, CANVAS_W / 2, 34);

  for (let i = 0; i < HOLES; i++) {
    const { x, y } = holeCenter(i);
    ctx.beginPath();
    ctx.ellipse(x, y + 18, HOLE_R, 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#1c1e26";
    ctx.fill();
    ctx.strokeStyle = "#2c2f3a";
    ctx.lineWidth = 2;
    ctx.stroke();

    const h = state.holes[i];
    if (h.kind === "mole") {
      ctx.beginPath();
      ctx.ellipse(x, y, HOLE_R - 8, HOLE_R - 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#e8a33d";
      ctx.fill();
      ctx.fillStyle = "#0d0e13";
      ctx.beginPath();
      ctx.arc(x - 12, y - 6, 4, 0, Math.PI * 2);
      ctx.arc(x + 12, y - 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a4a1f";
      ctx.fillRect(x - 8, y + 10, 16, 4);
    } else if (h.kind === "bomb") {
      ctx.beginPath();
      ctx.arc(x, y, HOLE_R - 10, 0, Math.PI * 2);
      ctx.fillStyle = "#2a2d36";
      ctx.fill();
      ctx.strokeStyle = "#d8556a";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#d8556a";
      ctx.font = "bold 20px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("!", x, y + 7);
    }
  }

  if (state.over) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#ece7e1";
    ctx.textAlign = "center";
    ctx.font = "bold 30px -apple-system, sans-serif";
    ctx.fillText("Time's Up", CANVAS_W / 2, CANVAS_H / 2 - 10);
    ctx.font = "18px -apple-system, sans-serif";
    ctx.fillText("Score " + state.score + "  ·  Tap to retry", CANVAS_W / 2, CANVAS_H / 2 + 26);
  }
}

function render() {
  draw();
}

let rafId = null;
let lastT = null;
function loop(t) {
  if (lastT == null) lastT = t;
  const dt = t - lastT;
  lastT = t;
  tick(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

function startLoop() {
  if (rafId != null) cancelAnimationFrame(rafId);
  lastT = null;
  rafId = requestAnimationFrame(loop);
}

function holeAtPoint(x, y) {
  for (let i = 0; i < HOLES; i++) {
    const c = holeCenter(i);
    const dx = x - c.x, dy = y - c.y;
    if (Math.sqrt(dx * dx + dy * dy) < HOLE_R) return i;
  }
  return -1;
}

window.COLS = COLS;
window.ROWS = ROWS;
window.HOLES = HOLES;
window.CANVAS_W = CANVAS_W;
window.CANVAS_H = CANVAS_H;
window.ROUND_MS = ROUND_MS;
window.newGame = newGame;
window.whack = whack;
window.tick = tick;
window.draw = draw;
window.holeAtPoint = holeAtPoint;
window.getState = () => state;

newGame();
startLoop();

document.addEventListener("click", (e) => {
  if (state.over) { newGame(); return; }
  const canvas = document.getElementById("game");
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
  const y = (e.clientY - rect.top) * (CANVAS_H / rect.height);
  const i = holeAtPoint(x, y);
  if (i >= 0) whack(i);
});
