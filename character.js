// character.js — a lil' buddy that reacts to your gameplay.
(() => {
  const board = document.getElementById('board');

  // Swap these with your own GIFs/PNGs/WebPs
  const SPRITES = {
    idle:      'assets/mascot/idle.gif',
    blink:     'assets/mascot/blink.gif',
    think:     'assets/mascot/think.gif',
    cheer:     'assets/mascot/cheer.gif',
    wow:       'assets/mascot/wow.gif',
    panic:     'assets/mascot/panic.gif',
    sleep:     'assets/mascot/sleep.gif',
    thumbsUp:  'assets/mascot/thumbs.gif',
    rip:       'assets/mascot/rip.gif'
  };

  // Speech snippets
  const LINES = {
      start: ["here we go again", "here to lose again?", "hope you're quicker than last time","Hydraulic suspension guarantees a nice smooth ride."],
      mergeSmall: ["...", "*yawn", "smh", "call me when you get a big one", "hold on I got to take a phone call", "I am rubber you are glue",
          "You fight like a Dairy Farmer", "With you around, I'd prefer to be fumigated.", "I'm not arguing, I'm just explaining why I'm right.",
          "Have you stopped wearing diapers yet?", "let me just upload that one to my cringe compilation", "You play worse than Bonzi Buddy TM",
          "I like my steak chicken-fried", "I found a three-dollar bill", "I was thrown off a subway because I had expectorated", "My craving for peanuts will never be satiated.",
          "I fear our government's funds are being misappropriated.", "I haven't fed my dog for so long, he's emaciated.", "My entire wardrobe is color-coordinated.","Chinese food's best when not monosodium-glutamated."],
      mergeBig: ["I've seen better", "You're no match for my brains, you poor fool.", "boom!", "I set my blender to frappe.","I like music that's syncopated."],
      idleWarn: ["uh… you there?", "tick-tock slow poke", "i'm bored 😴", "moves have you heard of them?", "my grandma moves faster than you...and she's dead",
          "I usually see people like you passed-out on tavern floors.", "I'd have a good comeback, but it's hard to get motivated."],
      autoMove: ["BORING!!!", "move", "i'm bored", "1 2 3 more moves for me", "if you don't move I will", "Imma start scrolling Insta reels if you keep this up", "I had my cat laminated.",
          "Support your local PTA.", "Plan for your future with an IRA.", "Your mother wears a toupee!", "Remember, pedestrians always have the right of way.","Throughout the Caribbean, my great deeds are celebrated!"],
      win: ["I am rapidly approaching your loaction...start running", "its about time","I'll meet you in the foyer."],
      lose: ["skill issue", "have you tried getting good", "I once owned a dog that was smarter than you he walked into a moving bus", "do you suffer from small brain syndrome?",
          "I hope you have a boat ready for a quick escape.", "I sent a letter to the King of Portugal, who never replied this was a similar experience",
          "We had a Little League team, but I never participated", "You should let your conscience be your guide.", "I'm waiting for these feelings of nausea to subside.", "Can you go cross-eyed?",
          "Perhaps you should switch to decaffeinated.", "Heaven preserve me! You look like something that's died!","The only way you'll be preserved is in formaldehyde."]
  };

  // DOM
  const el = document.createElement('div');
  el.id = 'mascot';
  el.innerHTML = `
    <img id="mascot-img" alt="mascot" />
    <div id="mascot-bubble"></div>
  `;
  document.body.appendChild(el);

  const img = el.querySelector('#mascot-img');
  const bubble = el.querySelector('#mascot-bubble');

    // helpers
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];

    function say(text, ms = 1200) {
        bubble.textContent = text;
        bubble.classList.add('show');

        // cancel any previous pending hide so we don't "un-tilt" mid-speech
        clearTimeout(say._t);

        // random tilt between 10° and 15°, random left/right
        const deg = (10 + Math.random() * 5) * (Math.random() < 0.5 ? -1 : 1);
        el.style.setProperty('--talk-rot', `${deg.toFixed(1)}deg`);
        el.classList.add('talking');

        // hide bubble + reset tilt when the line ends
        say._t = setTimeout(() => {
            bubble.classList.remove('show');
            el.classList.remove('talking');     // snaps back to 0deg via CSS
        }, ms);
    }

  function setSprite(src){
    // Restart GIF by swapping src
    if (img.dataset.src !== src){
      img.dataset.src = src;
      img.src = src;
    } else {
      img.src = ''; img.src = src;
    }
  }

  // simple state machine
  let idleBlinkTimer = null;
  function loopIdleBlink(){
    clearTimeout(idleBlinkTimer);
    idleBlinkTimer = setTimeout(()=>{
      setSprite(Math.random()<0.6? SPRITES.blink : SPRITES.idle);
      loopIdleBlink();
    }, 2500 + Math.random()*2000);
  }

  const API = {
    onStart(){
      // stick the buddy near the board’s top-left corner
      try {
        const r = board.getBoundingClientRect();
        el.style.left = `${r.left - 80}px`;
        el.style.top  = `${r.top  - 40}px`;
      } catch {}
      setSprite(SPRITES.idle);
      say(pick(LINES.start), 1200);
      loopIdleBlink();
    },
    onMove(dir){
      setSprite(SPRITES.think);
      setTimeout(()=> setSprite(SPRITES.idle), 350);
    },
    onMerge(value){
      if (value >= 128) {
        setSprite(SPRITES.wow); say(pick(LINES.mergeBig), 1200);
      } else {
        setSprite(SPRITES.cheer); say(pick(LINES.mergeSmall), 900);
      }
      setTimeout(()=> setSprite(SPRITES.idle), 700);
    },
    onIdleWarning(){ // fires a moment before auto-move
      setSprite(SPRITES.think); say(pick(LINES.idleWarn), 1400);
    },
    onAutoMove(){   // when your idle timer takes a move
      setSprite(SPRITES.panic); say(pick(LINES.autoMove), 1000);
      setTimeout(()=> setSprite(SPRITES.idle), 700);
    },
    onGameOver(win){
      setSprite(win ? SPRITES.cheer : SPRITES.rip);
      say(win ? pick(LINES.win) : pick(LINES.lose), 1800);
    }
  };

  window.mascot = API;
})();
