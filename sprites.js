// Sprite GIF bursts shown above tiles via global `sprites`
(() => {
  const boardEl = document.getElementById('board');
  const layer = document.getElementById('spriteLayer');
  const SIZE = 4;

  // Point these to your GIFs (can be png/apng/webp if they animate)
  const EXPLOSIONS = [
      'assets/explosions/explosiongreen.gif',
      'assets/explosions/explosionpink.gif',
      'assets/explosions/explosionpurple.gif',
      'assets/explosions/explosionred.gif',
      'assets/explosions/explosionyellow.gif',
      
  ];

  // Map a board cell (r,c) to pixel pos inside sprite layer
  function cellCenter(r,c){
    const root = getComputedStyle(document.documentElement);
    const gap = parseFloat(root.getPropertyValue('--gap')) || 12;
    const sizeStr = root.getPropertyValue('--tile-size').trim();
    const layerRect = layer.getBoundingClientRect();
    const sampleTile = document.querySelector('.cell');
    const tileSize = sampleTile ? sampleTile.getBoundingClientRect().width :
                     (sizeStr.endsWith('px') ? parseFloat(sizeStr) : layerRect.width/4 - gap*0.75);

    const x = c * (tileSize + gap) + tileSize/2;
    const y = r * (tileSize + gap) + tileSize/2;
    return {x,y};
  }

  function pick(arr){ return arr[(Math.random() * arr.length) | 0]; }

  // value influences size slightly (bigger merges => bigger boom)
  function sizeForValue(value){
    const base = 72;
    const mult = Math.min(1.8, Math.max(1, Math.log2(value)/5)); // 2->~1, 2048->~1.8
    return base * mult;
  }

  function spawnGifAt(x, y, src, pxSize=80){
    const img = document.createElement('img');
    img.src = src;
    img.className = 'sprite';
    img.style.left = `${x}px`;
    img.style.top  = `${y}px`;
    img.style.width = `${pxSize}px`;
    img.style.height = `${pxSize}px`;
    layer.appendChild(img);

    const remove = () => img.remove();
    // remove after CSS fade; if GIF longer, no biggie—keeps it tidy
    img.addEventListener('animationend', remove, { once:true });
    // safety cleanup
    setTimeout(remove, 900);
  }

  function burstAtCell(r,c,value=4){
    const {x,y} = cellCenter(r,c);
    const src = pick(EXPLOSIONS);
    const sz = sizeForValue(value);
    spawnGifAt(x,y,src,sz);
  }

  window.sprites = { burstAtCell };
})();
