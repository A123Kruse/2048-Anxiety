(() => {
    const SIZE = 4;
    const fxCanvas = document.getElementById('fx');
    const boardEl = document.getElementById('board');

    const life = (() => {
        let ctx, w, h, cols, rows, cellSize, a, b, rafId, last;
        const STEP_MS = 1000 / 30, STEPS_PER_FRAME = 2, FADE_ALPHA = 0.06;

        function getCSSLifePalette() {
            const cs = getComputedStyle(document.documentElement);
            const read = v => cs.getPropertyValue(v).trim();
            const falls = ['#ffc778', '#ffaa6e', '#ed915a', '#cd8255', '#ffd68c'];
            const hexes = ['--life1', '--life2', '--life3', '--life4', '--life5']
                .map((k, i) => read(k) || falls[i]);
            return hexes.map(hex => {
                const n = hex.replace('#', '');
                const r = parseInt(n.substr(0, 2), 16),
                    g = parseInt(n.substr(2, 2), 16),
                    b = parseInt(n.substr(4, 2), 16);
                return [r, g, b];
            });
        }
        let PALETTE = getCSSLifePalette();

        const themeObs = new MutationObserver(() => { PALETTE = getCSSLifePalette(); });
        themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        function resize() {
            const pad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--board-pad')) || 12;
            const rect = boardEl.getBoundingClientRect();
            fxCanvas.width = Math.max(1, Math.floor(rect.width - pad * 2));
            fxCanvas.height = Math.max(1, Math.floor(rect.height - pad * 2));
            w = fxCanvas.width; h = fxCanvas.height;
            cellSize = Math.max(3, Math.floor(Math.min(w, h) / 80));
            cols = Math.max(1, Math.floor(w / cellSize));
            rows = Math.max(1, Math.floor(h / cellSize));
            a = new Uint8Array(cols * rows);
            b = new Uint8Array(cols * rows);
            ctx = fxCanvas.getContext('2d');
            ctx.clearRect(0, 0, w, h);
        }

        function mapCell(r, c) { const x = Math.round((c + 0.5) * (cols / SIZE)), y = Math.round((r + 0.5) * (rows / SIZE)); return { x, y }; }
        function setAlive(x, y) { const ix = ((y + rows) % rows) * cols + ((x + cols) % cols); a[ix] = 1; }
        function setBlinker(cx, cy, hor) { if (hor) { setAlive(cx - 1, cy); setAlive(cx, cy); setAlive(cx + 1, cy); } else { setAlive(cx, cy - 1); setAlive(cx, cy); setAlive(cx, cy + 1); } }
        function seedDisk(cx, cy, r = 3, d = 0.6) {
            for (let y = -r; y <= r; y++)for (let x = -r; x <= r; x++)if (x * x + y * y <= r * r && Math.random() < d) setAlive(cx + x, cy + y);
            for (let i = 0; i < 2; i++) { const ox = cx + ((Math.random() * 6 - 3) | 0), oy = cy + ((Math.random() * 6 - 3) | 0); setBlinker(ox, oy, Math.random() < 0.5); }
        }

        function step() {
            for (let y = 0; y < rows; y++)for (let x = 0; x < cols; x++) {
                const i = y * cols + x; let n = 0;
                for (let yy = -1; yy <= 1; yy++)for (let xx = -1; xx <= 1; xx++) { if (!xx && !yy) continue; const nx = (x + xx + cols) % cols, ny = (y + yy + rows) % rows; n += a[ny * cols + nx]; }
                const alive = a[i] === 1;
                b[i] = (alive && (n === 2 || n === 3)) || (!alive && n === 3) ? 1 : 0;
            }
            const t = a; a = b; b = t;
        }

        function draw() {
            const [r, g, b_] = PALETTE[(Math.random() * PALETTE.length) | 0];
            ctx.fillStyle = `rgba(187,173,160,${FADE_ALPHA})`;
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = `rgba(${r},${g},${b_},0.8)`;
            for (let y = 0; y < rows; y++)for (let x = 0; x < cols; x++)if (a[y * cols + x]) ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }

        function loop(ts) {
            if (!last) last = ts;
            const dt = ts - last;
            if (dt >= STEP_MS) { for (let i = 0; i < STEPS_PER_FRAME; i++)step(); draw(); last = ts; }
            rafId = requestAnimationFrame(loop);
        }

        function burstAtCell(r, c) { const { x, y } = mapCell(r, c); seedDisk(x, y, 3 + (Math.random() * 2 | 0), 0.55); }
        function init() { resize(); cancelAnimationFrame(rafId); last = 0; rafId = requestAnimationFrame(loop); }
        window.addEventListener('resize', () => { const was = rafId != null; if (was) cancelAnimationFrame(rafId); resize(); if (was) rafId = requestAnimationFrame(loop); });
        return { init, burstAtCell };
    })();
    window.life = life;
})();
