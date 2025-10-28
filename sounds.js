// Merge sounds via global `sounds`
(() => {
  // Add as many as you like; random one plays per merge
  const MERGE_SOUNDS = [
    'assets/sfx/chilled-synth-effect-297468.mp3',
      'assets/sfx/sidechained-synth-89131.mp3',
      'assets/sfx/bass-synth-125-bpm-35986.mp3',
      'assets/sfx/green-diamond-synth-loop-65020.mp3',

    
  ];

  // light-weight pool of HTMLAudio elements
  const pool = MERGE_SOUNDS.map(src => {
    const a = new Audio(src);
    a.preload = 'auto';
    a.volume = 0.35;
    return a;
  });

  function playMerge(value=4){
    if (!pool.length) return;
    // slight pitch/tempo variation for juice
    const a = pool[(Math.random()*pool.length)|0].cloneNode();
    // For mp3 via HTMLAudio, playbackRate works in most modern browsers
    const base = 1.0;
    const boost = Math.min(0.4, Math.max(0, (Math.log2(value) - 2) * 0.04)); // bigger value => slightly higher pitch
    a.playbackRate = base + boost + (Math.random()*0.06 - 0.03);
    a.volume = 0.28 + Math.min(0.22, (Math.log2(value)-2) * 0.02);
    // Fire & forget
    a.play().catch(()=>{ /* ignore if blocked */ });
  }

  window.sounds = { playMerge };
})();
