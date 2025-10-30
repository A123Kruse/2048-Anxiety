// life-bg.js — Full-screen Conway background
(() => {
  const canvas = document.getElementById('life-bg');
  const ctx = canvas.getContext('2d');

  // Tunables
  const FPS = 30;                  // evolution speed
  const STEPS_PER_FRAME = 2;       // advance multiple steps per frame for liveliness
  const FADE = 0.05;               // trail fade speed (higher = faster fade)
  const MIN_CELL = 3;              // min pixel size per cell
  const TARGET_GRID = 140;         // rough number of cells across the short side
  const PALETTE = [
    [250, 224, 187],  // warm sand
    [243, 201, 157],
    [234, 176, 128],
    [217, 156, 115],
    [255, 211, 153],
  ];

  let w=0, h=0, cols=0, rows=0, cell=4;
  let a, b;
  let raf, last=0;

  function resize(){
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    canvas.width  = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    canvas.style.width  = vw + 'px';
    canvas.style.height = vh + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);

    w = vw; h = vh;
    const short = Math.min(w, h);
    cell = Math.max(MIN_CELL, Math.floor(short / TARGET_GRID));
    cols = Math.max(8, Math.floor(w / cell));
    rows = Math.max(8, Math.floor(h / cell));
    a = new Uint8Array(cols*rows);
    b = new Uint8Array(cols*rows);
    ctx.clearRect(0,0,w,h);
    // seed a few random spots to start
    for (let i=0;i<12;i++){
      seedDisk(randInt(0, cols-1), randInt(0, rows-1), 4, 0.45);
    }
  }

  function idx(x,y){ return y*cols + x; }
  function wrap(x, max){ return (x + max) % max; }
  function randInt(lo, hi){ return (Math.random()*(hi-lo+1) | 0) + lo; }

  function setAlive(x,y){ a[idx(wrap(x,cols), wrap(y,rows))] = 1; }

  function seedDisk(cx, cy, r=4, d=0.6){
    for (let y=-r; y<=r; y++){
      for (let x=-r; x<=r; x++){
        if (x*x + y*y <= r*r && Math.random() < d) setAlive(cx+x, cy+y);
      }
    }
    // a couple of blinkers for motion
    for (let i=0;i<2;i++){
      const bx = cx + randInt(-3,3);
      const by = cy + randInt(-3,3);
      if (Math.random() < 0.5){ setAlive(bx-1,by); setAlive(bx,by); setAlive(bx+1,by); }
      else { setAlive(bx,by-1); setAlive(bx,by); setAlive(bx,by+1); }
    }
  }

  function step(){
    for (let y=0; y<rows; y++){
      for (let x=0; x<cols; x++){
        let n=0;
        for (let yy=-1; yy<=1; yy++){
          for (let xx=-1; xx<=1; xx++){
            if (!xx && !yy) continue;
            n += a[idx(wrap(x+xx,cols), wrap(y+yy,rows))];
          }
        }
        const alive = a[idx(x,y)] === 1;
        b[idx(x,y)] = (alive && (n===2 || n===3)) || (!alive && n===3) ? 1 : 0;
      }
    }
    const t=a; a=b; b=t;
  }

  function draw(){
    // fade previous frame slightly toward background
    ctx.fillStyle = `rgba(250, 248, 239, ${FADE})`; // close to 2048 page bg
    ctx.fillRect(0,0,w,h);

    const [r,g,b_] = PALETTE[(Math.random()*PALETTE.length)|0];
    ctx.fillStyle = `rgba(${r},${g},${b_},0.85)`;
    for (let y=0; y<rows; y++){
      for (let x=0; x<cols; x++){
        if (a[idx(x,y)]) ctx.fillRect(x*cell, y*cell, cell, cell);
      }
    }
  }

  function loop(ts){
    if (!last) last = ts;
    const stepMs = 1000 / FPS;
    if (ts - last >= stepMs){
      for (let i=0;i<STEPS_PER_FRAME;i++) step();
      draw();
      last = ts;
    }
    raf = requestAnimationFrame(loop);
  }

  // Map DOM rect to the Life grid and seed a ring around it
  function burstAroundElement(el){
    const r = el.getBoundingClientRect();
    // add margin so it clearly surrounds
    const m = 20;
    const left   = Math.max(0, r.left - m);
    const right  = Math.min(w, r.right + m);
    const top    = Math.max(0, r.top - m);
    const bottom = Math.min(h, r.bottom + m);

    const gx1 = Math.floor(left / cell), gx2 = Math.floor(right / cell);
    const gy1 = Math.floor(top  / cell), gy2 = Math.floor(bottom/ cell);

    const gaps = Math.max(8, Math.floor((gx2-gx1 + gy2-gy1)/6));

    // Top edge
    for (let x=gx1; x<=gx2; x+=randInt(2, Math.max(2, (gx2-gx1)/gaps|0))) seedDisk(x, gy1-2, randInt(2,4), 0.65);
    // Bottom edge
    for (let x=gx1; x<=gx2; x+=randInt(2, Math.max(2, (gx2-gx1)/gaps|0))) seedDisk(x, gy2+2, randInt(2,4), 0.65);
    // Left edge
    for (let y=gy1; y<=gy2; y+=randInt(2, Math.max(2, (gy2-gy1)/gaps|0))) seedDisk(gx1-2, y, randInt(2,4), 0.65);
    // Right edge
    for (let y=gy1; y<=gy2; y+=randInt(2, Math.max(2, (gy2-gy1)/gaps|0))) seedDisk(gx2+2, y, randInt(2,4), 0.65);
  }

  function init(){
    resize();
    cancelAnimationFrame(raf);
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => {
    const running = !!raf;
    if (running) cancelAnimationFrame(raf);
    resize();
    if (running) raf = requestAnimationFrame(loop);
  });

  // Expose API
  window.lifeBG = { init, burstAroundElement };
})();
