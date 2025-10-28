// Screen shake based on board fill % (and optional pulses).
// Usage:
//   shake.init(document.getElementById('board')); // once
//   shake.setFill(fillRatio); // 0..1
//   shake.pulse( strength=1, ms=160 ); // optional

(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const shake = (() => {
    let host, rafId, lastTs=0;
    // Tunables
    const MAX_PX = 8;       // max translation at 100% fill (px)
    const MIN_PX = 0.0;     // base when empty
    const FREQ = 26;        // Hz-ish wobble
    const SMOOTH = 0.12;    // smoothing toward target
    const ROT_MAX_DEG = 0.6;// subtle rotation at high fill

    // State
    let target = 0;         // 0..1 based on fill
    let current = 0;        // smoothed intensity
    let pulseAmp = 0;       // transient bump 0..1
    let pulseDecay = 0.015; // per ms decay

    function init(el){
      host = el;
      host.style.willChange = 'transform';
      cancelAnimationFrame(rafId);
      lastTs = 0;
      rafId = requestAnimationFrame(loop);
    }

    function setFill(fillRatio){
      // clamp 0..1, ease a little so it ramps near the end-game
      const f = Math.min(1, Math.max(0, fillRatio));
      target = Math.pow(f, 1.2);
    }

    function pulse(strength=1, ms=160){
      // adds a quick burst on merge; decay proportional to ms
      pulseAmp = Math.max(pulseAmp, Math.min(1, strength));
      pulseDecay = 1 / Math.max(60, ms); // higher ms -> slower decay
    }

    function loop(ts){
      if (!lastTs) lastTs = ts;
      const dt = ts - lastTs;
      lastTs = ts;

      if (prefersReduced) {
        // Keep transforms off for accessibility
        host.style.transform = '';
        rafId = requestAnimationFrame(loop);
        return;
      }

      // smooth toward target + pulse
      current += ((target + pulseAmp) - current) * SMOOTH;

      // decay pulse
      if (pulseAmp > 0) {
        pulseAmp = Math.max(0, pulseAmp - pulseDecay * dt);
      }

      // generate shake using simple trig noise
      const t = ts / 1000;
      const ampPx = MIN_PX + current * (MAX_PX - MIN_PX);
      const dx = (Math.sin(t * Math.PI * FREQ) + Math.sin(t * Math.PI * (FREQ*0.73))) * 0.5 * ampPx;
      const dy = (Math.cos(t * Math.PI * (FREQ*0.88)) + Math.sin(t * Math.PI * (FREQ*0.61))) * 0.5 * ampPx;
      const rot = (Math.sin(t * Math.PI * (FREQ*0.41))) * (ROT_MAX_DEG * current);

      host.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`;

      rafId = requestAnimationFrame(loop);
    }

    return { init, setFill, pulse };
  })();

  window.shake = shake;
})();
