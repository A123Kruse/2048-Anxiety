/* ===== 2048 GAME (FX: life, lifeBG, sprites, sounds, shake, mascot) ===== */
/* ===== Idle Punish Auto-Move (timeout + watchdog) + Theme Palettes ===== */

const SIZE = 4;
const SPAWN_VALUES = [2, 2, 2, 2, 4];

const tilesLayer = document.getElementById("tiles");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const newGameBtn = document.getElementById("newGame");
const overlay = document.getElementById("gameOver");
const tryAgainBtn = document.getElementById("tryAgain");
const gameOverTitle = document.getElementById("gameOverTitle");
const gameOverText = document.getElementById("gameOverText");
const boardEl = document.getElementById("board");

let grid, score, best, mergingMap;
let moving = false;

/* ---------- Theme palette shifting ---------- */
const THEME_COUNT = 5;
function applyThemeForScore(score) {
    const themeIndex = Math.floor(score / 2500) % THEME_COUNT;
    document.documentElement.setAttribute("data-theme", String(themeIndex));
}

/* ---------- Idle punish system (timeout + watchdog) ---------- */
const IDLE_MS = 3000;
let idleTimerId = null;
let lastActivityTs = 0;
let watchdogId = null;

function nowTs() { return (performance && performance.now) ? performance.now() : Date.now(); }
function markActivity() { lastActivityTs = nowTs(); }

function resetIdleTimer() {
    markActivity();
    if (idleTimerId) clearTimeout(idleTimerId);
    idleTimerId = setTimeout(onIdleTimeout, IDLE_MS);
}

function onIdleTimeout() {
    const gameEnded = !overlay.classList.contains("hidden");
    if (moving || gameEnded || !canMove()) { resetIdleTimer(); return; }
    // punish!
    if (window.mascot) mascot.onIdleWarning();
    rapidShake(420);
    punishAutoMove();
    if (window.mascot) mascot.onAutoMove();
    resetIdleTimer();
}

// Watchdog: fires every 250ms and triggers punishment if, for any reason,
// the one-shot timeout didn’t. This makes idle auto-move bulletproof.
function startIdleWatchdog() {
    if (watchdogId) clearInterval(watchdogId);
    watchdogId = setInterval(() => {
        const gameEnded = !overlay.classList.contains("hidden");
        if (gameEnded || moving || !canMove()) return;
        if (nowTs() - lastActivityTs < IDLE_MS) return;
        // double-check to avoid fighting with timeout
        try {
            if (window.mascot) mascot.onIdleWarning();
            rapidShake(420);
            punishAutoMove();
            if (window.mascot) mascot.onAutoMove();
        } finally {
            resetIdleTimer(); // re-arm both mechanisms
        }
    }, 250);
}

// treat any user interaction as activity
["keydown", "mousedown", "mouseup", "mousemove", "wheel", "touchstart", "touchmove", "pointerdown", "pointermove"]
    .forEach(evt => window.addEventListener(evt, markActivity, { passive: true }));

/* ---------- Shake helpers ---------- */
function updateShake() {
    if (!window.shake) return;
    const filled = (SIZE * SIZE - emptyCells().length) / (SIZE * SIZE);
    shake.setFill(filled);
}
function rapidShake(ms = 400) {
    if (!window.shake) return;
    shake.pulse(0.95, ms);
    let i = 0;
    const n = 3, iv = setInterval(() => {
        shake.pulse(0.7, 120);
        if (++i >= n) clearInterval(iv);
    }, 90);
}

/* ---------- Init ---------- */
function init() {
    grid = new Array(SIZE * SIZE).fill(0);
    score = 0;
    mergingMap = new Map();

    updateScore(0);
    spawnRandom(); spawnRandom();
    render(true);
    hideOverlay();
    applyThemeForScore(0);

    if (window.life) life.init();
    if (window.shake) shake.init(boardEl);
    if (window.lifeBG) lifeBG.init();
    if (window.mascot) mascot.onStart();

    updateShake();
    resetIdleTimer();
    startIdleWatchdog();
}

/* ---------- Score & storage ---------- */
function getBest() { const b = localStorage.getItem("best2048"); return b ? parseInt(b, 10) : 0; }
function setBest(v) { localStorage.setItem("best2048", String(v)); }

function updateScore(delta) {
    score += delta;
    scoreEl.textContent = score;
    best = Math.max(getBest(), score);
    bestEl.textContent = best;
    applyThemeForScore(score);
    if (best > getBest()) setBest(best);
}

/* ---------- Grid helpers ---------- */
const idx = (r, c) => r * SIZE + c;
const rcFromIdx = (i) => [Math.floor(i / SIZE), i % SIZE];

function emptyCells() {
    const out = [];
    for (let i = 0; i < grid.length; i++) if (grid[i] === 0) out.push(i);
    return out;
}
function spawnRandom() {
    const e = emptyCells(); if (!e.length) return false;
    const at = e[(Math.random() * e.length) | 0];
    grid[at] = SPAWN_VALUES[(Math.random() * SPAWN_VALUES.length) | 0];
    mergingMap.set(at, { type: "new" });
    return true;
}

/* ---------- Simulator used by heuristics ---------- */
function simulateMove(dir, srcGrid) {
    const g = srcGrid.slice();
    const lines = [];
    let moved = false;
    let gained = 0;

    if (dir === "left" || dir === "right") {
        for (let r = 0; r < SIZE; r++) {
            const L = []; for (let c = 0; c < SIZE; c++) L.push(idx(r, c));
            lines.push(dir === "left" ? L : L.reverse());
        }
    } else {
        for (let c = 0; c < SIZE; c++) {
            const L = []; for (let r = 0; r < SIZE; r++) L.push(idx(r, c));
            lines.push(dir === "up" ? L : L.reverse());
        }
    }

    for (const line of lines) {
        const values = line.map(i => g[i]);
        const comp = [];
        for (let i = 0; i < values.length; i++) if (values[i] !== 0) comp.push(values[i]);

        const out = [0, 0, 0, 0];
        let write = 0;
        for (let read = 0; read < comp.length; read++) {
            if (read < comp.length - 1 && comp[read] === comp[read + 1]) {
                const v = comp[read] * 2;
                out[write] = v;
                gained += v;
                read++;
            } else {
                out[write] = comp[read];
            }
            write++;
        }
        for (let i = 0; i < line.length; i++) {
            const to = line[i], before = g[to], after = out[i] || 0;
            if (before !== after) moved = true;
            g[to] = after;
        }
    }

    const empties = g.filter(v => v === 0).length;
    return { moved, gained, newGrid: g, empties };
}

/* ---------- Punish auto-move (choose the WORST move) ---------- */
function punishAutoMove() {
    if (moving) return;

    const dirs = ["left", "up", "right", "down"];
    const beforeEmpties = grid.filter(v => v === 0).length;

    let worst = null;
    for (const d of dirs) {
        const s = simulateMove(d, grid);
        if (!s.moved) continue;

        // Score to MINIMIZE: favor fewer empties and low gain.
        // Also slightly penalize increasing empties to be extra mean.
        const emptyDelta = s.empties - beforeEmpties; // negative is "worse"
        const score = emptyDelta * 1000 + s.gained;   // lower is worse
        if (!worst || score < worst.score) worst = { dir: d, score };
    }

    // If all moves look equal or none (edge case), just pick a bad-ish direction
    let chosen = worst ? worst.dir : dirs.find(d => simulateMove(d, grid).moved) || "left";
    move(chosen);
}

/* ---------- Optional: helpful auto (not used for punishment, but keep for future) ---------- */
function autoMove() {
    if (moving) return;

    const dirs = ["left", "up", "right", "down"];
    const beforeEmpties = grid.filter(v => v === 0).length;

    let bestPick = null;
    for (const d of dirs) {
        const s = simulateMove(d, grid);
        if (!s.moved) continue;
        const emptyGain = s.empties - beforeEmpties;
        const score = emptyGain * 1000 + s.gained; // higher is better
        if (!bestPick || score > bestPick.score) bestPick = { dir: d, score };
    }

    let chosen = bestPick ? bestPick.dir : null;
    if (!chosen) {
        const options = dirs.filter(d => simulateMove(d, grid).moved);
        if (options.length) chosen = options[(Math.random() * options.length) | 0];
    }
    if (!chosen) chosen = "left";
    move(chosen);
}

/* ---------- Real move (mutates grid, renders, FX) ---------- */
function move(dir) {
    mergingMap.clear();
    let moved = false, gained = 0;
    const lines = [];

    if (dir === "left" || dir === "right") {
        for (let r = 0; r < SIZE; r++) {
            const L = []; for (let c = 0; c < SIZE; c++) L.push(idx(r, c));
            lines.push(dir === "left" ? L : L.reverse());
        }
    } else {
        for (let c = 0; c < SIZE; c++) {
            const L = []; for (let r = 0; r < SIZE; r++) L.push(idx(r, c));
            lines.push(dir === "up" ? L : L.reverse());
        }
    }

    const mergedPositions = [];

    for (const line of lines) {
        const values = line.map(i => grid[i]);
        const comp = [], compIdx = [];
        for (let i = 0; i < values.length; i++) if (values[i] !== 0) { comp.push(values[i]); compIdx.push(line[i]); }

        const out = [0, 0, 0, 0];
        let write = 0;
        for (let read = 0; read < comp.length; read++) {
            if (read < comp.length - 1 && comp[read] === comp[read + 1]) {
                const v = comp[read] * 2;
                out[write] = v;
                gained += v;
                mergedPositions.push(line[write]);
                read++;
            } else {
                out[write] = comp[read];
            }
            write++;
        }
        for (let i = 0; i < line.length; i++) {
            const to = line[i], before = grid[to], after = out[i] || 0;
            if (before !== after) moved = true;
            grid[to] = after;
        }
    }

    if (mergedPositions.length) {
        for (const at of mergedPositions) {
            mergingMap.set(at, { type: "merged" });
            const [r, c] = rcFromIdx(at);

            if (window.life) life.burstAtCell(r, c);
            const val = grid[at] || 4;
            if (window.sprites) sprites.burstAtCell(r, c, val);
            if (window.sounds) sounds.playMerge(val);
            if (window.lifeBG) lifeBG.burstAroundElement(boardEl);
            if (window.mascot) mascot.onMerge(val);

            if (window.shake) {
                const s = Math.min(1, Math.log2(val) / 11);
                shake.pulse(0.35 + s * 0.45, 140 + s * 120);
            }
        }
    }

    if (gained) updateScore(gained);
    if (moved) spawnRandom();
    render();
    if (!canMove())
        showOverlay(isWin() ? "You win!" : "Game Over",
            isWin() ? "You reached 2048!" : "No more moves available.");

    resetIdleTimer(); // every move (manual or auto) counts as activity
}

function canMove() {
    if (emptyCells().length) return true;
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const v = grid[idx(r, c)];
            if ((r + 1 < SIZE && grid[idx(r + 1, c)] === v) ||
                (c + 1 < SIZE && grid[idx(r, c + 1)] === v)) return true;
        }
    }
    return false;
}
function isWin() { return grid.some(v => v >= 2048); }

/* ---------- Rendering ---------- */
function posToLeftTop(r, c) {
    const root = getComputedStyle(document.documentElement);
    const gap = root.getPropertyValue("--gap").trim() || "12px";
    const size = root.getPropertyValue("--tile-size").trim() || "100px";
    return { left: `calc(${c} * (${size} + ${gap}))`, top: `calc(${r} * (${size} + ${gap}))` };
}
function tileClass(v) { const base = `tile tile-${v}`; return v >= 1024 ? `${base} tile-big` : base; }

function render() {
    tilesLayer.innerHTML = "";
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const v = grid[idx(r, c)]; if (!v) continue;
            const el = document.createElement("div");
            el.className = tileClass(v);
            if (String(v).length >= 4) el.classList.add("tile-big");
            const { left, top } = posToLeftTop(r, c);
            el.style.left = left; el.style.top = top; el.textContent = v;
            if (mergingMap.has(idx(r, c))) {
                const t = mergingMap.get(idx(r, c)).type;
                if (t === "new") el.classList.add("new");
                if (t === "merged") el.classList.add("merged");
            }
            tilesLayer.appendChild(el);
        }
    }
    updateShake();
}

/* ---------- Input ---------- */
const KEYS = {
    ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
    a: "left", d: "right", w: "up", s: "down", h: "left", l: "right", k: "up", j: "down"
};

window.addEventListener("keydown", (e) => {
    const dir = KEYS[e.key];
    if (!dir || moving) return;
    if (!overlay.classList.contains("hidden")) return;

    e.preventDefault();
    moving = true;
    move(dir);
    if (window.mascot) mascot.onMove(dir);
    setTimeout(() => (moving = false), 120);

    resetIdleTimer();
});

let touchStart = null; const MIN_SWIPE = 24;
boardEl.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
    resetIdleTimer();
}, { passive: true });

boardEl.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    if (!overlay.classList.contains("hidden")) { touchStart = null; return; }

    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < MIN_SWIPE) { touchStart = null; return; }
    const dir = ax > ay ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    if (!moving) {
        moving = true;
        move(dir);
        if (window.mascot) mascot.onMove(dir);
        setTimeout(() => (moving = false), 120);
    }
    touchStart = null;
    resetIdleTimer();
}, { passive: true });

/* ---------- Overlay ---------- */
function showOverlay(t, txt) {
    gameOverTitle.textContent = t;
    gameOverText.textContent = txt;
    overlay.classList.remove("hidden");
    if (window.mascot) mascot.onGameOver(t === "You win!");
}
function hideOverlay() { overlay.classList.add("hidden"); }

/* ---------- Boot ---------- */
window.addEventListener("load", () => {
    bestEl.textContent = getBest();
    init();
});
newGameBtn.addEventListener("click", () => { init(); resetIdleTimer(); });
tryAgainBtn.addEventListener("click", () => { init(); resetIdleTimer(); });
