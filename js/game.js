// ── Funny questions ───────────────────────────────────────────────────────────
const QUESTIONS = [
  { text: "What's 1 + 1?",         answers: ["2, duh!",          "Uh... window?"],    correct: 0, happyLine: "GENIUS!! I knew I liked you!",      wrongLine: "IT'S TWO!! HOW?! HOW DID YOU..." },
  { text: "Hot dog = sandwich?",   answers: ["Yes. Obviously.",   "Never. Not ever."], correct: 0, happyLine: "Science agrees. You pass.",          wrongLine: "BREAD+FILLING=SANDWICH. AAAARGH!" },
  { text: "What moves faster?",    answers: ["Light, duh.",       "My grandma lol"],   correct: 0, happyLine: "Phew. I was worried for a sec.",     wrongLine: "YOUR GRANDMA CANNOT WIN PHYSICS!!" },
  { text: "Is this game too hard?",answers: ["A little... yes.",  "I EAT HARD GAMES!"],correct: 1, happyLine: "That's the spirit! Respect!",       wrongLine: "Said it's hard = penalty time >:)" },
  { text: "Best gaming snack?",    answers: ["Chips!",            "Celery sticks??"],  correct: 0, happyLine: "Correct. Celery cannot be trusted.", wrongLine: "CELERY?! IN THIS ECONOMY?!"        },
  { text: "Sides on a square?",    answers: ["4, obviously",      "It's a circle??"],  correct: 0, happyLine: "You are so smart I could CRY.",      wrongLine: "SQUARE ≠ CIRCLE. I QUIT."          },
  { text: "Best time to game?",    answers: ["Always. 24/7.",     "Maybe not 3AM..."], correct: 0, happyLine: "Absolutely CORRECT! Legend!",        wrongLine: "3 AM IS PEAK GAMING TIME!! WRONG!" },
  { text: "Cats or dogs?",         answers: ["DOGS!",             "Cats..."],          correct: 0, happyLine: "Dogs!! Yes!! CORRECT!!",             wrongLine: "CATS DON'T EVEN CARE ABOUT YOU!"   },
];

// ── Constants ─────────────────────────────────────────────────────────────────
const B            = 36;    // block size px
const GRAVITY      = 2100;  // px/s²
const JUMP_VY      = -600;  // px/s  (negative = upward)
const FLOAT_GRAV   = 0.38;  // gravity multiplier while holding & ascending
const PLAYER_SCR_X = 130;   // fixed screen X of player
const SPEED_MAX    = 850;   // px/s (hard cap, never adjusted)

// ── Gameplay-tunable values (overridden from localStorage) ────────────────────
let SPEED_START       = 320;  // px/s initial speed
let SPEED_REWARD      = 40;   // speed gained on correct NPC answer
let SPEED_PENALTY     = 30;   // speed lost on wrong NPC answer
let GAME_MAX_GAP      = 2;    // max gap between platforms (blocks, 1–3)
let DIALOGUE_FIRST    = 30;   // blocks until first encounter
let DIALOGUE_INTERVAL = 120;  // blocks between subsequent encounters

// ── Globals ───────────────────────────────────────────────────────────────────
const C   = document.getElementById('c');
const ctx = C.getContext('2d');

let W, H;
let state;           // 'cover' | 'avatar_select' | 'playing' | 'dead'
let player, cameraX, platforms;
let speed, speedRampTimer, speedTimer, score, best;
let holding, lastTime, jumpBuffer = 0;
const JUMP_BUFFER_SEC = 0.14;
let genX, genLastY, genLastRight;
let playerCharIdx;
let avatarHoverIdx;
let dlg;
let dlgBtns;
let npc;
let playerPathHistory;
let nextDialogueTrigger;
let screenShake;
let settingsBtn;
let playerMoodKey;
let playerMoodTimer;
let paused = false;
let pauseBtn = null;
let pauseOverlayBtns = null;
let deadBtns = null;
let avatarBackBtn = null;

let musicEnabled = false;
let musicVideoId = '';
let ytPlayer     = null;
let ytReady      = false;
let musicPlaying = false;
let musicBtn     = null;

best           = 0;
playerCharIdx  = -1;
playerMoodKey  = 'default';
playerMoodTimer = 0;
avatarHoverIdx = -1;
dlg            = null;
dlgBtns        = [];
npc            = null;
screenShake    = 0;
settingsBtn    = null;

// ── Resize / orientation ──────────────────────────────────────────────────────
function resize() {
  const sw = window.innerWidth, sh = window.innerHeight;
  if (sw < sh) {
    W = C.width  = sh;
    H = C.height = sw;
    C.style.transform = 'rotate(90deg) translateY(-100%)';
  } else {
    W = C.width  = sw;
    H = C.height = sh;
    C.style.transform = '';
  }
}

function toGame(sx, sy) {
  if (window.innerHeight > window.innerWidth) {
    return [sy, window.innerWidth - sx];
  }
  return [sx, sy];
}

window.addEventListener('resize', resize);
resize();

// ── Init / reset game ─────────────────────────────────────────────────────────
function init() {
  speed               = 0;
  speedRampTimer      = 0;
  speedTimer          = 0;
  score               = 0;
  cameraX             = 0;
  holding             = false;
  platforms           = [];
  dlg                 = null;
  dlgBtns             = [];
  npc                 = null;
  playerPathHistory   = [];
  screenShake         = 0;
  nextDialogueTrigger = DIALOGUE_FIRST;

  const groundY     = H - B;
  const groundWidth = Math.ceil(W / B) + 4;

  platforms.push({ wx: 0, y: groundY, wb: groundWidth, blockType: 0, decor: [
    { emoji: '🪴', slot: 1  },
    { emoji: '🌻', slot: 4  },
    { emoji: '🌿', slot: 7  },
    { emoji: '🌷', slot: 11 },
    { emoji: '🌱', slot: 14 },
    { emoji: '🪣', slot: 17 },
  ]});
  genX         = groundWidth * B;
  genLastY     = groundY;
  genLastRight = genX;

  player = {
    wx: cameraX + PLAYER_SCR_X,
    y:  groundY - B,
    vy: 0,
    w:  B,
    h:  B,
    onGround: true,
  };

  while (genX < cameraX + W * 5) genNext();
}

// ── Procedural platform generation ───────────────────────────────────────────
function genNext() {
  const gapB = 1 + Math.floor(Math.random() * GAME_MAX_GAP);
  const widB = 4 + Math.floor(Math.random() * 4);
  const dyB  = Math.floor(Math.random() * 5) - 2;
  const minY = H - B * 8;
  const maxY = H - B;
  const newY = Math.max(minY, Math.min(maxY, genLastY + dyB * B));
  const startX = genLastRight + gapB * B;

  platforms.push({ wx: startX, y: newY, wb: widB, decor: pickDecor(widB), blockType: Math.floor(Math.random() * 3) });
  genLastRight = startX + widB * B;
  genLastY     = newY;
  genX         = genLastRight;
}

// ── Platform decoration picker ────────────────────────────────────────────────
const DECOR_NATURE = [
  '🌱','🌿','🌸','🌻','🌷','🌾','🍀','🌵','🪴','🌲','🌳','🎋',
  '🌼','🌺','🍃','🪻','🫧','🌑','🍄','🌰','🪨','🪵',
];
const DECOR_MALL = [
  '🛒','🪣','🪚','🔨','🌡️','🪤','🧴','🧹','🪜','💧','🏷️','🎍',
];
function pickDecorEmoji() {
  return Math.random() < 0.85
    ? DECOR_NATURE[Math.floor(Math.random() * DECOR_NATURE.length)]
    : DECOR_MALL[Math.floor(Math.random() * DECOR_MALL.length)];
}
function pickDecor(wb) {
  if (Math.random() < 0.08) return [];
  const count = Math.min(wb, 1 + Math.floor(Math.random() * 4 * (0.4 + Math.random() * 0.6)));
  const items = [];
  const used  = new Set();
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.18) continue;
    let slot, tries = 0;
    do { slot = Math.floor(Math.random() * wb); tries++; } while (used.has(slot) && tries < 10);
    used.add(slot);
    items.push({ emoji: pickDecorEmoji(), slot, scale: 0.72 + Math.random() * 0.38 });
  }
  return items;
}

// ── Choice path generation ────────────────────────────────────────────────────
function generateChoicePaths() {
  const forkDist = W * (1.3 + Math.random() * 0.7);
  const forkX = Math.round((cameraX + forkDist) / B) * B;

  platforms = platforms.filter(p => p.wx + p.wb * B <= forkX);

  const lastEnd = platforms.reduce((mx, p) => Math.max(mx, p.wx + p.wb * B), cameraX);
  if (forkX > lastEnd) {
    platforms.push({ wx: lastEnd, y: H - B * 2, wb: Math.ceil((forkX - lastEnd) / B) });
  }

  const count  = 5;
  const pw     = 3 + Math.floor(Math.random() * 3);
  const step   = (pw + 2 + Math.floor(Math.random() * 3)) * B;
  const upperY = H - B * (4 + Math.floor(Math.random() * 3));
  const lowerY = H - B;
  const pathFlip = Math.random() < 0.5;

  for (let i = 0; i < count; i++) {
    const x = forkX + i * step;
    platforms.push({ wx: x, y: upperY, wb: pw, choiceIdx: pathFlip ? 1 : 0 });
    platforms.push({ wx: x, y: lowerY, wb: pw, choiceIdx: pathFlip ? 0 : 1 });
  }

  genLastRight = forkX + count * step;
  genLastY     = lowerY;
  genX         = genLastRight;
}

// ── Dialogue system ───────────────────────────────────────────────────────────
function triggerDialogue() {
  if (npc || dlg) return;
  const pool    = CHARACTERS.map((_, i) => i).filter(i => i !== playerCharIdx && CHARACTERS[i].interactions && CHARACTERS[i].interactions.length > 0);
  if (!pool.length) return;
  const charIdx = pool[Math.floor(Math.random() * pool.length)];
  const ch      = CHARACTERS[charIdx];

  const iact = ch.interactions[Math.floor(Math.random() * ch.interactions.length)];
  const flip = Math.random() < 0.5;
  const question = {
    text:      iact.text,
    answers:   flip ? [iact.correct, iact.wrong] : [iact.wrong, iact.correct],
    correct:   flip ? 0 : 1,
    happyLine: iact.correct,
    wrongLine: iact.wrong,
  };

  // NPC starts off-screen left and approaches the player
  npc = {
    charIdx, question,
    phase: 'approaching', // approaching | following | talking | reacting | leaving
    wx:    cameraX - B * 3,
    y:     player.y,
    timer: 0,
    moodKey: 'default',
  };
}

function startDialogueSpeechBubble() {
  dlg = {
    phase: 'typing', charIdx: npc.charIdx, question: npc.question,
    typeIdx: 0, typeTimer: 0,
    selectedAnswer: -1, reactTimer: 0,
    charBounce: 0, charBounceV: 0,
    shakeX: 0, shakeTimer: 0,
    stars: [],
  };
  generateChoicePaths();
  dlgBtns = [];
  state   = 'dialogue';
  npc.phase = 'talking';
}

// NPC shadow-player: approaches player, follows briefly, then leaves after answer
function updateNpc(dt) {
  if (!npc) return;

  // Follow the player's exact path: look up the Y the player had when at npc.wx
  const hist = playerPathHistory;
  if (hist.length > 0 && npc.wx <= hist[hist.length - 1].wx) {
    let lo = 0, hi = hist.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (hist[mid].wx <= npc.wx) lo = mid; else hi = mid;
    }
    const a = hist[lo], b = hist[Math.min(lo + 1, hist.length - 1)];
    const denom = b.wx - a.wx;
    const t = denom > 0 ? Math.max(0, Math.min(1, (npc.wx - a.wx) / denom)) : 0;
    npc.y = a.y + (b.y - a.y) * t;
  } else {
    npc.y = player.y; // fallback before enough history is recorded
  }

  const npcScreenX    = npc.wx - cameraX;
  const targetScreenX = PLAYER_SCR_X - B * 1.5;

  if (npc.phase === 'approaching') {
    // Move faster than camera so NPC catches up from behind
    npc.wx += speed * 1.5 * dt;
    if (npcScreenX >= targetScreenX) {
      npc.wx    = cameraX + targetScreenX; // snap into position
      npc.phase = 'following';
      npc.timer = 0;
    }
  } else if (npc.phase === 'following') {
    // Match camera speed — NPC stays at fixed screen offset behind player
    npc.wx += speed * dt;
    npc.timer += dt;
    if (npc.timer >= 0.5) {
      startDialogueSpeechBubble();
    }
  } else if (npc.phase === 'talking') {
    // Lock to fixed screen position while dialogue is active
    npc.wx = cameraX + targetScreenX;
  } else if (npc.phase === 'reacting') {
    // Stay visible briefly so player sees face, then begin exit
    npc.wx = cameraX + targetScreenX;
    npc.timer += dt;
    if (npc.timer >= 0.4) {
      npc.phase = 'leaving';
      npc.timer = 0;
    }
  } else if (npc.phase === 'leaving') {
    // Slow down — camera pulls away, NPC drifts off left naturally
    npc.wx += speed * 0.25 * dt;
    if (npc.wx - cameraX < -B * 4) {
      npc = null;
    }
  }
}

function updateDialogue(dt) {
  if (dlg.phase === 'typing') {
    dlg.typeTimer += dt;
    const full = dlg.question.text.length;
    dlg.typeIdx = Math.min(full, Math.floor(dlg.typeTimer * 32));
    if (dlg.typeIdx >= full) dlg.phase = 'choices';

  } else if (dlg.phase === 'reacting') {
    dlg.reactTimer += dt;

    if (dlg.charBounce < 0 || dlg.charBounceV < 0) {
      dlg.charBounceV += 1500 * dt;
      dlg.charBounce  += dlg.charBounceV * dt;
      if (dlg.charBounce >= 0) {
        dlg.charBounce  = 0;
        dlg.charBounceV = dlg.charBounceV < -40 ? dlg.charBounceV * -0.42 : 0;
      }
    }

    if (dlg.selectedAnswer !== dlg.question.correct) {
      dlg.shakeTimer += dt;
      dlg.shakeX = Math.sin(dlg.shakeTimer * 46) * Math.max(0, 1 - dlg.reactTimer / 1.6) * 12;
    }

    for (const s of dlg.stars) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 400 * dt; s.life -= dt;
    }
    dlg.stars = dlg.stars.filter(s => s.life > 0);

    if (dlg.reactTimer >= 2.2) {
      platforms.forEach(p => { delete p.choiceIdx; });
      state = 'playing';
      dlg   = null;
      if (npc) { npc.phase = 'reacting'; npc.timer = 0; }
    }
  }
}

function answerDialogue(idx) {
  if (!dlg || dlg.phase !== 'choices') return;
  dlg.selectedAnswer = idx;
  dlg.phase          = 'reacting';
  dlg.reactTimer     = 0;

  // NPC shows happy or angry face immediately on answer
  if (npc) npc.moodKey = idx === dlg.question.correct ? 'happy' : 'angry';

  if (idx === dlg.question.correct) {
    speedRampTimer = Infinity;
    speed = Math.max(SPEED_START, speed - SPEED_REWARD);
    dlg.charBounceV = -420;
    const cx = 36, cy = 28;
    const colours = ['#fbbf24', '#a3e635', '#22d3ee', '#f472b6', '#c084fc', '#fb923c'];
    for (let i = 0; i < 26; i++) {
      dlg.stars.push({
        x:    cx + (Math.random() - 0.5) * 70,
        y:    cy + (Math.random() - 0.5) * 24,
        vx:   (Math.random() - 0.5) * 240,
        vy:   -160 - Math.random() * 180,
        life: 0.9 + Math.random() * 0.5,
        color: colours[Math.floor(Math.random() * colours.length)],
        size:  3 + Math.random() * 4,
      });
    }
  } else {
    speedRampTimer = Infinity;
    speed = Math.min(SPEED_MAX, speed + SPEED_PENALTY);
    screenShake = 18;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (playerMoodTimer > 0) {
    playerMoodTimer -= dt;
    if (playerMoodTimer <= 0) playerMoodKey = 'default';
  } else if (Math.random() < 0.004) {
    playerMoodKey   = Math.random() < 0.5 ? 'happy' : 'angry';
    playerMoodTimer = 0.5;
  }

  const RAMP_DURATION = 4;
  if (speedRampTimer < RAMP_DURATION) {
    speedRampTimer += dt;
    speed = SPEED_START * Math.min(speedRampTimer / RAMP_DURATION, 1);
  }

  cameraX  += speed * dt;
  player.wx = cameraX + PLAYER_SCR_X;

  const gMult = (holding && player.vy < 0) ? FLOAT_GRAV : 1;
  player.vy   = Math.min(player.vy + GRAVITY * gMult * dt, 1400);

  const prevBottom = player.y + player.h;
  player.y        += player.vy * dt;
  const curBottom  = player.y + player.h;

  jumpBuffer = Math.max(0, jumpBuffer - dt);

  player.onGround = false;
  for (const p of platforms) {
    if (player.wx + player.w <= p.wx || player.wx >= p.wx + p.wb * B) continue;
    const pTop = p.y;
    if (player.vy >= 0 && prevBottom <= pTop + 2 && curBottom >= pTop) {
      player.y        = pTop - player.h;
      player.onGround = true;
      if (jumpBuffer > 0 || holding) {
        player.vy       = JUMP_VY;
        player.onGround = false;
        jumpBuffer      = 0;
      } else {
        player.vy = 0;
      }
      break;
    }
  }

  if (dlg && player.onGround && (dlg.phase === 'typing' || dlg.phase === 'choices')) {
    for (const p of platforms) {
      if (p.choiceIdx === undefined) continue;
      if (player.wx + player.w <= p.wx || player.wx >= p.wx + p.wb * B) continue;
      if (Math.abs(player.y + player.h - p.y) < 4) {
        if (dlg.phase !== 'choices') { dlg.typeIdx = dlg.question.text.length; dlg.phase = 'choices'; }
        answerDialogue(p.choiceIdx);
        break;
      }
    }
  }

  // Record player's path so NPC can follow it with spatial delay
  playerPathHistory.push({ wx: player.wx, y: player.y });
  if (playerPathHistory.length > 300) playerPathHistory.shift();

  updateNpc(dt);

  score = Math.floor(cameraX / B);
  if (score > best) best = score;

  if (player.y > H + B * 3) {
    state = 'dead';
    musicPause();
  }

  if (score >= nextDialogueTrigger) {
    nextDialogueTrigger = score + DIALOGUE_INTERVAL;
    if (!npc && !dlg) triggerDialogue();
    return;
  }

  while (genX < cameraX + W * 5) genNext();
  platforms = platforms.filter(p => p.wx + p.wb * B > cameraX - B * 2);
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, W, H);

  if (state !== 'cover' && state !== 'avatar_select') {
    drawBackground();
  } else {
    ctx.fillStyle = '#0c1a0c';
    ctx.fillRect(0, 0, W, H);
  }

  if (state !== 'cover' && state !== 'avatar_select') {
    if (screenShake > 0) {
      ctx.save();
      ctx.translate(
        (Math.random() * 2 - 1) * screenShake,
        (Math.random() * 2 - 1) * screenShake * 0.5
      );
    }
    drawPlatforms();
    drawNpc();
    drawPlayer();
    drawHUD();
    if (screenShake > 0) ctx.restore();
  }

  if (state === 'cover')         drawCover();
  if (state === 'avatar_select') drawAvatarSelect();
  if (state === 'dead')          drawDead();
  if (state === 'dialogue')      drawDialogue();
  if (paused)                    drawPauseOverlay();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0,    '#5ab8d8');
  sky.addColorStop(0.60, '#aaddf0');
  sky.addColorStop(1,    '#c8edd0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const off1 = (cameraX * 0.14) % (W * 2);
  ctx.fillStyle = '#b8da80';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) {
    const wx = x + off1;
    const y  = H * 0.66 + Math.sin(wx * 0.0042) * H * 0.07 + Math.sin(wx * 0.0021 + 1.2) * H * 0.04;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  const off2 = (cameraX * 0.28) % (W * 2);
  ctx.fillStyle = '#8ec85a';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) {
    const wx = x + off2;
    const y  = H * 0.74 + Math.sin(wx * 0.0055 + 0.6) * H * 0.05 + Math.sin(wx * 0.0028 + 2.0) * H * 0.03;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();

  const drift = (cameraX * 0.08) % (W * 1.4);
  const clouds = [
    { px: 0.06, py: 0.09, r: 26 },
    { px: 0.24, py: 0.05, r: 20 },
    { px: 0.44, py: 0.12, r: 32 },
    { px: 0.65, py: 0.07, r: 24 },
    { px: 0.83, py: 0.11, r: 28 },
  ];
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  for (const c of clouds) {
    const cx = ((c.px * W * 1.4 - drift) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.1;
    const cy = H * c.py;
    const r  = c.r;
    ctx.beginPath();
    ctx.arc(cx,             cy,            r,         0, Math.PI * 2);
    ctx.arc(cx + r * 0.88,  cy + r * 0.18, r * 0.72,  0, Math.PI * 2);
    ctx.arc(cx - r * 0.70,  cy + r * 0.24, r * 0.62,  0, Math.PI * 2);
    ctx.fill();
  }

  const treeOff = (cameraX * 0.28) % (W * 2.5);
  const treeDefs = [
    { px: 0.04, h: 0.13, w: 28 }, { px: 0.13, h: 0.10, w: 22 },
    { px: 0.22, h: 0.15, w: 32 }, { px: 0.35, h: 0.11, w: 24 },
    { px: 0.48, h: 0.14, w: 30 }, { px: 0.60, h: 0.09, w: 20 },
    { px: 0.70, h: 0.13, w: 28 }, { px: 0.82, h: 0.12, w: 26 },
    { px: 0.94, h: 0.10, w: 22 },
  ];
  ctx.fillStyle = '#4a7a2a';
  for (const t of treeDefs) {
    const tx   = ((t.px * W * 2.5 - treeOff) % (W * 2.5) + W * 2.5) % (W * 2.5) - W * 0.1;
    const th   = H * t.h;
    const baseY = H * 0.76;
    for (let tier = 0; tier < 3; tier++) {
      const ty  = baseY - th * (0.35 + tier * 0.22);
      const by  = baseY - th * (tier * 0.18);
      const hw  = t.w * (1 - tier * 0.18);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + hw, by);
      ctx.lineTo(tx - hw, by);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(tx - 2, baseY - th * 0.08, 4, th * 0.1);
  }

  drawGlasshouse();
}

function drawPot(cx, baseY, potW, potH, plantColor) {
  const rimH = potH * 0.18;
  const botW = potW * 0.72;
  ctx.fillStyle = '#c1440e';
  ctx.beginPath();
  ctx.moveTo(cx - potW / 2, baseY - potH + rimH);
  ctx.lineTo(cx + potW / 2, baseY - potH + rimH);
  ctx.lineTo(cx + botW / 2, baseY);
  ctx.lineTo(cx - botW / 2, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d9541a';
  ctx.fillRect(cx - potW / 2, baseY - potH, potW, rimH + 1);
  ctx.fillStyle = plantColor || '#2e8b22';
  ctx.beginPath();
  ctx.arc(cx, baseY - potH - potW * 0.28, potW * 0.32, 0, Math.PI * 2);
  ctx.fill();
}

function drawGlasshouse() {
  const ghW   = 380;
  const baseY = H - B;
  const ghH   = baseY * 0.60;
  const sx    = -cameraX;

  if (sx + ghW < -60 || sx > W + 60) return;

  const frameCol = '#5c3d1a';
  const panelW   = 55;
  const panelH   = 55;

  const peakX = sx + ghW / 2;
  const roofH = H * 0.14;
  const peakY = baseY - ghH - roofH;

  ctx.fillStyle = 'rgba(190,238,255,0.32)';
  ctx.beginPath();
  ctx.moveTo(sx,        baseY - ghH);
  ctx.lineTo(peakX,     peakY);
  ctx.lineTo(sx + ghW,  baseY - ghH);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = frameCol;
  ctx.lineWidth   = 1.5;
  const rafterCount = Math.floor(ghW / panelW);
  for (let r = 0; r <= rafterCount; r++) {
    const rx = sx + (r / rafterCount) * ghW;
    ctx.beginPath(); ctx.moveTo(rx, baseY - ghH); ctx.lineTo(peakX, peakY); ctx.stroke();
  }
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx, baseY - ghH); ctx.lineTo(peakX, peakY); ctx.lineTo(sx + ghW, baseY - ghH);
  ctx.stroke();

  ctx.fillStyle = 'rgba(190,238,255,0.36)';
  ctx.fillRect(sx, baseY - ghH, ghW, ghH);

  ctx.strokeStyle = frameCol;
  ctx.lineWidth   = 2;
  for (let wx = sx; wx <= sx + ghW + 1; wx += panelW) {
    ctx.beginPath(); ctx.moveTo(wx, baseY - ghH); ctx.lineTo(wx, baseY); ctx.stroke();
  }
  for (let wy = baseY - ghH; wy <= baseY + 1; wy += panelH) {
    ctx.beginPath(); ctx.moveTo(sx, wy); ctx.lineTo(sx + ghW, wy); ctx.stroke();
  }

  const shelfX = sx + panelW * 0.3;
  const shelfY = baseY - ghH * 0.55;
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(shelfX, shelfY, 80, 6);
  ctx.fillRect(shelfX, shelfY + 38, 80, 6);
  ctx.fillRect(shelfX, shelfY, 6, 44);
  ctx.fillRect(shelfX + 74, shelfY, 6, 44);
  drawPot(shelfX + 18, shelfY,      22, 20, '#3cb05e');
  drawPot(shelfX + 44, shelfY,      22, 20, '#e8a020');
  drawPot(shelfX + 68, shelfY,      18, 16, '#2e8b22');
  drawPot(shelfX + 22, shelfY + 38, 22, 20, '#c0392b');
  drawPot(shelfX + 60, shelfY + 38, 22, 20, '#27ae60');

  const treeX    = sx + ghW * 0.72;
  const treeBaseY = baseY;
  const treeH    = ghH * 0.52;
  ctx.fillStyle  = '#2d6e1a';
  for (let tier = 0; tier < 4; tier++) {
    const ty = treeBaseY - treeH * (0.28 + tier * 0.20);
    const by = treeBaseY - treeH * (tier * 0.16);
    const hw = (treeH * 0.28) * (1 - tier * 0.16);
    ctx.beginPath();
    ctx.moveTo(treeX, ty);
    ctx.lineTo(treeX + hw, by);
    ctx.lineTo(treeX - hw, by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#6B3A1F';
  ctx.fillRect(treeX - 4, treeBaseY - treeH * 0.12, 8, treeH * 0.14);

  const floorPotX = sx + ghW * 0.52;
  drawPot(floorPotX,      baseY, 28, 26, '#e74c3c');
  drawPot(floorPotX + 34, baseY, 24, 22, '#27ae60');

  ctx.fillStyle = '#4a9fd4';
  ctx.beginPath();
  ctx.ellipse(shelfX + 5, baseY - 18, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a9fd4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(shelfX + 14, baseY - 22);
  ctx.quadraticCurveTo(shelfX + 28, baseY - 36, shelfX + 20, baseY - 12);
  ctx.stroke();

  const doorW = B * 2.2, doorH = ghH * 0.58;
  const doorX = sx + ghW - doorW - 4;
  const doorY = baseY - doorH;

  const signW = doorW + 20, signH = 22;
  const signX = doorX - 10;
  const signY = doorY - signH - 6;
  ctx.fillStyle = '#8B5E1A';
  roundRect(signX, signY, signW, signH, 4);
  ctx.fill();
  ctx.fillStyle = '#f5e0a0';
  ctx.font = `bold 11px "Georgia", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DAGLEZJA', signX + signW / 2, signY + signH / 2);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = 'rgba(200,245,210,0.55)';
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.strokeStyle = frameCol;
  ctx.lineWidth   = 2.5;
  ctx.strokeRect(doorX, doorY, doorW, doorH);
  ctx.beginPath();
  ctx.moveTo(doorX + doorW / 2, doorY);
  ctx.lineTo(doorX + doorW / 2, baseY);
  ctx.stroke();

  ctx.strokeStyle = frameCol;
  ctx.lineWidth   = 4;
  ctx.strokeRect(sx, baseY - ghH, ghW, ghH);
}

// ── Floor block renderer ──────────────────────────────────────────────────────
function drawFloorBlock(bx, by, type) {
  const GRASS_H = 7;
  if (type === 0) {
    ctx.fillStyle = '#8B5E2F';
    ctx.fillRect(bx + 1, by + GRASS_H, B - 2, B - GRASS_H - 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + 6,    by + GRASS_H + 7);  ctx.lineTo(bx + B - 6, by + GRASS_H + 7);
    ctx.moveTo(bx + 4,    by + GRASS_H + 15); ctx.lineTo(bx + B - 4, by + GRASS_H + 15);
    ctx.stroke();
    ctx.fillStyle = '#52a843';
    ctx.fillRect(bx + 1, by, B - 2, GRASS_H + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.fillRect(bx + 3, by + 1, B - 6, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(bx + 1, by + B - 4, B - 2, 3);
  } else if (type === 1) {
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(bx + 1, by + 1, B - 2, B - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(bx + 1, by + 1, B - 2, 5);
    ctx.fillRect(bx + 1, by + 1, 5, B - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.fillRect(bx + 1, by + B - 5, B - 2, 4);
    ctx.fillRect(bx + B - 5, by + 1, 4, B - 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx + B * 0.3, by + 4); ctx.lineTo(bx + B * 0.45, by + B * 0.55);
    ctx.moveTo(bx + B * 0.6, by + B * 0.35); ctx.lineTo(bx + B * 0.75, by + B - 5);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#a0622a';
    ctx.fillRect(bx + 1, by + 1, B - 2, B - 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.13)';
    ctx.lineWidth = 1;
    for (let gy = by + 7; gy < by + B - 4; gy += 6) {
      ctx.beginPath(); ctx.moveTo(bx + 2, gy); ctx.lineTo(bx + B - 2, gy); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(bx + 1, by + 1, B - 2, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(bx + 1, by + B - 4, B - 2, 3);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, B - 1, B - 1);
}

function drawPlatforms() {
  const SANS = 'system-ui, -apple-system, sans-serif';

  for (const p of platforms) {
    const sx = p.wx - cameraX;
    const pw = p.wb * B;
    if (sx + pw < -B || sx > W + B) continue;

    const isChoice = p.choiceIdx !== undefined;

    if (isChoice) {
      const topCol  = p.choiceIdx === 0 ? '#22c55e' : '#0dd4b0';
      const botCol  = p.choiceIdx === 0 ? '#166534' : '#0a7a6a';
      const GRASS_H = 7;
      for (let i = 0; i < p.wb; i++) {
        const bx = sx + i * B;
        if (bx + B < -B || bx > W + B) continue;
        ctx.fillStyle = botCol;
        ctx.fillRect(bx + 1, p.y + GRASS_H, B - 2, B - GRASS_H - 1);
        ctx.fillStyle = topCol;
        ctx.fillRect(bx + 1, p.y, B - 2, GRASS_H + 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(bx + 3, p.y + 1, B - 6, 3);
        ctx.strokeStyle = 'rgba(0,0,0,0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, p.y + 0.5, B - 1, B - 1);
      }
    } else {
      const bt = p.blockType !== undefined ? p.blockType : 0;
      for (let i = 0; i < p.wb; i++) {
        const bx = sx + i * B;
        if (bx + B < -B || bx > W + B) continue;
        drawFloorBlock(bx, p.y, bt);
      }
    }

    if (!isChoice && p.decor && p.decor.length > 0) {
      const baseDecorSz = Math.min(B * 0.58, 20);
      ctx.fillStyle    = '#000';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      for (const d of p.decor) {
        const dx = sx + d.slot * B + B / 2;
        if (dx < -B || dx > W + B) continue;
        ctx.font = `${Math.round(baseDecorSz * (d.scale || 1))}px serif`;
        ctx.fillText(d.emoji, dx, p.y - 5);
      }
      ctx.textBaseline = 'alphabetic';
    }

    if (isChoice && dlg && dlg.question) {
      const topCol    = p.choiceIdx === 0 ? '#22c55e' : '#0dd4b0';
      const platLeft  = sx;
      const platRight = sx + pw;
      if (platRight > 0 && platLeft < W) {
        const labelX   = (Math.max(platLeft, 0) + Math.min(platRight, W)) / 2;
        const fontSize = Math.min(13, W * 0.031);
        const labelTxt = dlg.question.answers[p.choiceIdx] || '';
        ctx.font       = `700 ${fontSize}px ${SANS}`;
        const tw       = ctx.measureText(labelTxt).width;
        const padX = 10, padY = 5, pilH = fontSize + padY * 2, pilR = pilH / 2;
        const pilX = labelX - tw / 2 - padX;
        const pilY = p.y - pilH - 8;
        ctx.fillStyle = topCol;
        roundRect(pilX, pilY, tw + padX * 2, pilH, pilR);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelTxt, labelX, pilY + pilH / 2);
        ctx.textBaseline = 'alphabetic';
      }
    }
  }
}

function drawPlayer() {
  const sx   = player.wx - cameraX;
  const char = playerCharIdx >= 0 ? CHARACTERS[playerCharIdx] : null;
  const mood = playerMoodKey || 'default';

  ctx.fillStyle = char ? char.color : '#22c55e';
  roundRect(sx, player.y, player.w, player.h, 8);
  ctx.fill();

  const imgObj = char && (char.imgs[mood] || char.imgs.default);
  if (imgObj && imgObj.complete && imgObj.naturalWidth) {
    ctx.save();
    roundRect(sx, player.y, player.w, player.h, 3);
    ctx.clip();
    ctx.drawImage(imgObj, sx, player.y, player.w, player.h);
    ctx.restore();
  } else if (char) {
    const emojiSz = Math.floor(player.w * 0.82);
    ctx.font         = `${emojiSz}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char.moods[mood] || char.moods.default, sx + player.w / 2, player.y + player.h / 2);
    ctx.textBaseline = 'alphabetic';
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(sx + player.w - 11, player.y + 6,  5, 4);
    ctx.fillRect(sx + player.w - 11, player.y + 15, 5, 4);
  }
}

function drawNpc() {
  if (!npc) return;
  const sx = npc.wx - cameraX;
  if (sx + B < 0 || sx > W) return;
  const ch = CHARACTERS[npc.charIdx];

  ctx.fillStyle = ch ? ch.color : '#60a5fa';
  roundRect(sx, npc.y, B, B, 8);
  ctx.fill();

  const imgObj = ch && (ch.imgs[npc.moodKey] || ch.imgs.default);
  if (imgObj && imgObj.complete && imgObj.naturalWidth) {
    ctx.save();
    roundRect(sx, npc.y, B, B, 3);
    ctx.clip();
    ctx.drawImage(imgObj, sx, npc.y, B, B);
    ctx.restore();
  } else if (ch) {
    const emojiSz = Math.floor(B * 0.82);
    ctx.font         = `${emojiSz}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch.moods[npc.moodKey] || ch.moods.default, sx + B / 2, npc.y + B / 2);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawHUD() {
  const SANS = 'system-ui, -apple-system, sans-serif';

  // Score — top right
  const scoreW = 100, scoreH = 30, scoreR = 15;
  const scx = W - scoreW - 12, scy = 10;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  roundRect(scx, scy, scoreW, scoreH, scoreR);
  ctx.fill();
  ctx.fillStyle    = '#1a5c1f';
  ctx.font         = `700 18px ${SANS}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(score + ' m', scx + scoreW / 2, scy + scoreH / 2);
  ctx.textBaseline = 'alphabetic';

  // Speed bar — top left
  const pct  = (speed - SPEED_START) / (SPEED_MAX - SPEED_START);
  const bw = 88, bh = 30, bx = 12, by = 10, br = 15;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  roundRect(bx, by, bw, bh, br);
  ctx.fill();
  ctx.save();
  roundRect(bx, by, bw, bh, br);
  ctx.clip();
  ctx.fillStyle = pct > 0.7 ? '#ef4444' : pct > 0.35 ? '#f59e0b' : '#22c55e';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(bx, by, bw * pct, bh);
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.fillStyle    = '#1a5c1f';
  ctx.font         = `600 10px ${SANS}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SPEED', bx + bw / 2, by + bh / 2);
  ctx.textBaseline = 'alphabetic';

  // Pause button — top centre
  const pbSz = 30, pbX = W / 2 - pbSz / 2, pbY = 10;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  roundRect(pbX, pbY, pbSz, pbSz, pbSz / 2);
  ctx.fill();
  ctx.fillStyle = '#1a5c1f';
  const barW = 4, barH = 12;
  const barGap = 5;
  const b1x = pbX + pbSz / 2 - barGap / 2 - barW;
  const b2x = pbX + pbSz / 2 + barGap / 2;
  const bBarY = pbY + (pbSz - barH) / 2;
  ctx.fillRect(b1x, bBarY, barW, barH);
  ctx.fillRect(b2x, bBarY, barW, barH);
  pauseBtn = { x: pbX, y: pbY, w: pbSz, h: pbSz };

  // Music button — right of pause button (only when music is configured)
  if (musicEnabled && musicVideoId) {
    const mbSz = 30, mbX = pbX + pbSz + 6, mbY = 10;
    ctx.fillStyle = musicPlaying ? 'rgba(255,255,255,0.88)' : 'rgba(220,220,220,0.70)';
    roundRect(mbX, mbY, mbSz, mbSz, mbSz / 2);
    ctx.fill();
    ctx.fillStyle    = musicPlaying ? '#1a5c1f' : '#8e8e93';
    ctx.font         = `700 15px ${SANS}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', mbX + mbSz / 2, mbY + mbSz / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    musicBtn = { x: mbX, y: mbY, w: mbSz, h: mbSz };
  } else {
    musicBtn = null;
  }
}

function drawPauseOverlay() {
  const SANS = 'system-ui, -apple-system, sans-serif';

  ctx.fillStyle = 'rgba(0,0,0,0.52)';
  ctx.fillRect(0, 0, W, H);

  const cardW = Math.min(280, W * 0.58), cardH = Math.min(210, H * 0.52);
  const cardX = W / 2 - cardW / 2, cardY = H / 2 - cardH / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  roundRect(cardX, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,92,31,0.12)';
  ctx.lineWidth = 1;
  roundRect(cardX, cardY, cardW, cardH, 20);
  ctx.stroke();

  ctx.fillStyle    = '#1a5c1f';
  ctx.font         = `700 ${Math.min(22, W * 0.055)}px ${SANS}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', W / 2, cardY + cardH * 0.25);
  ctx.textBaseline = 'alphabetic';

  const btnW = cardW * 0.72, btnH = 42;
  const btnX = W / 2 - btnW / 2;

  // Resume button (green)
  const resumeY = cardY + cardH * 0.42;
  ctx.fillStyle = '#22c55e';
  roundRect(btnX, resumeY, btnW, btnH, btnH / 2);
  ctx.fill();
  ctx.fillStyle    = '#fff';
  ctx.font         = `700 ${Math.min(15, W * 0.038)}px ${SANS}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶  Resume', W / 2, resumeY + btnH / 2);
  ctx.textBaseline = 'alphabetic';

  // Home button (outlined)
  const homeY = resumeY + btnH + 12;
  ctx.fillStyle = 'rgba(26,92,31,0.07)';
  roundRect(btnX, homeY, btnW, btnH, btnH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,92,31,0.35)';
  ctx.lineWidth   = 1.5;
  roundRect(btnX, homeY, btnW, btnH, btnH / 2);
  ctx.stroke();
  ctx.fillStyle    = '#1a5c1f';
  ctx.font         = `600 ${Math.min(15, W * 0.038)}px ${SANS}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⌂  Home', W / 2, homeY + btnH / 2);
  ctx.textBaseline = 'alphabetic';

  pauseOverlayBtns = {
    resume: { x: btnX, y: resumeY, w: btnW, h: btnH },
    home:   { x: btnX, y: homeY,   w: btnW, h: btnH },
  };
}

function drawFirTree(cx, topY, treeH, treeW, color) {
  ctx.fillStyle = color;
  const trunkW = treeW * 0.055;
  const trunkH = treeH * 0.17;
  ctx.fillRect(cx - trunkW / 2, topY + treeH * 0.83, trunkW, trunkH);

  const layers = [
    { ty: 0.00, by: 0.32, hw: 0.22 },
    { ty: 0.17, by: 0.54, hw: 0.46 },
    { ty: 0.36, by: 0.72, hw: 0.70 },
    { ty: 0.55, by: 0.85, hw: 0.92 },
  ];
  for (const l of layers) {
    const ty  = topY + treeH * l.ty;
    const by  = topY + treeH * l.by;
    const hw  = treeW / 2 * l.hw;
    const segs = 18;
    ctx.beginPath();
    ctx.moveTo(cx, ty);
    for (let i = 1; i <= segs; i++) {
      const t   = i / segs;
      const x   = cx + hw * t;
      const y   = ty + (by - ty) * t;
      const jag = hw * (i % 2 === 0 ? 0.13 : -0.06);
      ctx.lineTo(x + jag, y);
    }
    ctx.lineTo(cx - hw, by);
    for (let i = segs - 1; i >= 1; i--) {
      const t   = i / segs;
      const x   = cx - hw * t;
      const y   = ty + (by - ty) * t;
      const jag = hw * (i % 2 === 0 ? 0.13 : -0.06);
      ctx.lineTo(x - jag, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function drawCover() {
  const SANS = 'system-ui, -apple-system, sans-serif';
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0,    '#5ab8d8');
  sky.addColorStop(0.65, '#aaddf0');
  sky.addColorStop(1,    '#c8edd0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const coverClouds = [
    { cx: W * 0.12, cy: H * 0.10, r: 22 },
    { cx: W * 0.32, cy: H * 0.06, r: 18 },
    { cx: W * 0.68, cy: H * 0.08, r: 24 },
    { cx: W * 0.86, cy: H * 0.11, r: 20 },
  ];
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const c of coverClouds) {
    ctx.beginPath();
    ctx.arc(c.cx,              c.cy,            c.r,         0, Math.PI * 2);
    ctx.arc(c.cx + c.r * 0.88, c.cy + c.r * 0.18, c.r * 0.72, 0, Math.PI * 2);
    ctx.arc(c.cx - c.r * 0.70, c.cy + c.r * 0.24, c.r * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#8ec85a';
  ctx.fillRect(0, H * 0.82, W, H * 0.18);
  ctx.fillStyle = '#5cb85c';
  ctx.fillRect(0, H * 0.82, W, 8);

  const treeH    = Math.min(H * 0.52, W * 0.30);
  const treeW    = treeH * 0.72;
  const treeTopY = H * 0.04;
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle   = '#1a5c1f';
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.83, treeW * 0.38, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawFirTree(W / 2, treeTopY, treeH, treeW, '#1a5c1f');

  const textCX  = W * 0.5;
  const treeBase = treeTopY + treeH;

  const titleSize = Math.min(68, W * 0.135);
  ctx.fillStyle   = '#1a5c1f';
  ctx.font        = `bold italic ${titleSize}px Georgia, serif`;
  ctx.textAlign   = 'center';
  ctx.shadowColor = 'rgba(26,92,31,0.22)';
  ctx.shadowBlur  = 10;
  ctx.fillText('DAGLEZJA', textCX, treeBase + titleSize * 0.95);
  ctx.shadowBlur  = 0;

  const subSize    = Math.min(13, W * 0.032);
  const brandBottom = treeBase + titleSize * 0.95;
  ctx.fillStyle   = '#2d7a35';
  ctx.font        = `${subSize}px Georgia, serif`;
  ctx.fillText('CENTRUM OGRODNICZE i KWIACIARNIA', textCX, brandBottom + subSize * 1.8);

  const divY = brandBottom + subSize * 3.2;
  ctx.strokeStyle = '#1a5c1f55';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(textCX - 80, divY);
  ctx.lineTo(textCX + 80, divY);
  ctx.stroke();

  ctx.fillStyle = '#1a5c1f';
  ctx.font      = `700 ${Math.min(20, W * 0.050)}px ${SANS}`;
  ctx.fillText('Tap to play', textCX, divY + Math.min(30, H * 0.082));

  ctx.fillStyle = 'rgba(26,92,31,0.55)';
  ctx.font      = `400 ${Math.min(11, W * 0.028)}px ${SANS}`;
  ctx.fillText('tap & hold to float higher', textCX, divY + Math.min(48, H * 0.132));

  if (best > 0) {
    ctx.fillStyle = '#b45309';
    ctx.font      = `600 ${Math.min(12, W * 0.030)}px ${SANS}`;
    ctx.fillText('Best  ' + best + ' m', textCX, divY + Math.min(68, H * 0.186));
  }

  ctx.fillStyle = 'rgba(26,92,31,0.35)';
  ctx.font      = `400 ${Math.min(10, W * 0.025)}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${VERSION} · ${VERSION_DATE}`, W / 2, H - 10);

  // Settings button — bottom-left pill
  const sBtnW = 110, sBtnH = 34, sBtnX = 14, sBtnY = H - sBtnH - 14;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  roundRect(sBtnX, sBtnY, sBtnW, sBtnH, sBtnH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,92,31,0.22)';
  ctx.lineWidth   = 1;
  roundRect(sBtnX, sBtnY, sBtnW, sBtnH, sBtnH / 2);
  ctx.stroke();
  ctx.fillStyle    = '#1a5c1f';
  ctx.font         = `600 ${Math.min(13, W * 0.032)}px ${SANS}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚙  Settings', sBtnX + sBtnW / 2, sBtnY + sBtnH / 2);
  ctx.textBaseline = 'alphabetic';
  settingsBtn = { x: sBtnX, y: sBtnY, w: sBtnW, h: sBtnH };
}

function cardLayout() {
  const n    = CHARACTERS.length;
  const cols = Math.min(5, n);
  const rows = Math.ceil(n / cols);
  const titleH = H * 0.22;
  const botH   = 20;
  const padX   = 10, padY = 4;
  const gap    = 4;
  const maxCellW = (W - padX * 2 - gap * 4) / 5;
  const maxCellH = (H - titleH - padY * 2 - botH - gap * 2) / 3;
  const cellSize = Math.min(maxCellW, maxCellH);
  const gridW  = cols * cellSize + gap * (cols - 1);
  const gridH  = rows * cellSize + gap * Math.max(0, rows - 1);
  const startX = (W - gridW) / 2;
  const startY = titleH + padY + ((H - titleH - padY * 2 - botH) - gridH) / 2;
  return { cellSize, gap, startX, startY, cols, rows };
}

function cardPosition(i) {
  const { cellSize, gap, startX, startY, cols, rows } = cardLayout();
  const row = Math.floor(i / cols);
  const col = i % cols;
  const n   = CHARACTERS.length;
  const rowCols = (row === rows - 1 && n % cols !== 0) ? n % cols : cols;
  const rowW    = rowCols * cellSize + (rowCols - 1) * gap;
  const cx = (W - rowW) / 2 + col * (cellSize + gap);
  const cy = startY + row * (cellSize + gap);
  return { cx, cy, cardW: cellSize, cardH: cellSize };
}

function getCardAtPoint(px, py) {
  for (let i = 0; i < CHARACTERS.length; i++) {
    const { cx, cy, cardW, cardH } = cardPosition(i);
    if (px >= cx && px <= cx + cardW && py >= cy && py <= cy + cardH) return i;
  }
  return -1;
}

function drawAvatarSelect() {
  const SANS = 'system-ui, -apple-system, sans-serif';
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#5ab8d8');
  sky.addColorStop(1, '#c8edd0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle    = '#1a5c1f';
  ctx.font         = `700 ${Math.min(24, W * 0.058)}px ${SANS}`;
  ctx.textAlign    = 'center';
  ctx.fillText('Choose your character', W / 2, H * 0.10);
  ctx.fillStyle = 'rgba(26,92,31,0.55)';
  ctx.font      = `400 ${Math.min(11, W * 0.027)}px ${SANS}`;
  ctx.fillText("your pick won't show up to bother you", W / 2, H * 0.16);

  for (let i = 0; i < CHARACTERS.length; i++) {
    const ch      = CHARACTERS[i];
    const { cx, cy, cardW, cardH } = cardPosition(i);
    const isHover = avatarHoverIdx === i;

    ctx.fillStyle = isHover ? ch.color + '44' : 'rgba(255,255,255,0.72)';
    roundRect(cx, cy, cardW, cardH, 10);
    ctx.fill();
    ctx.strokeStyle = isHover ? ch.color : 'rgba(26,92,31,0.18)';
    ctx.lineWidth   = isHover ? 2 : 1;
    roundRect(cx, cy, cardW, cardH, 10);
    ctx.stroke();

    const emojiSz = cardW * 0.52;
    const imgObj  = ch.imgs.default;
    if (imgObj && imgObj.complete && imgObj.naturalWidth) {
      const isz = cardW * 0.64;
      const ix  = cx + cardW / 2 - isz / 2;
      const iy  = cy + cardH * 0.06;
      ctx.save();
      roundRect(ix, iy, isz, isz, 6);
      ctx.clip();
      ctx.drawImage(imgObj, ix, iy, isz, isz);
      ctx.restore();
    } else {
      ctx.font         = `${emojiSz}px serif`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch.moods.default, cx + cardW / 2, cy + cardH * 0.40);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.fillStyle = isHover ? ch.color : '#1a5c1f';
    ctx.font      = `600 ${Math.min(12, cardW * 0.135)}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(ch.name, cx + cardW / 2, cy + cardH * 0.80);
    ctx.fillStyle = isHover ? ch.color : 'rgba(26,92,31,0.45)';
    ctx.font      = `400 ${Math.min(9, cardW * 0.100)}px ${SANS}`;
    ctx.fillText('tap to play', cx + cardW / 2, cy + cardH * 0.93);
  }

  // Back button — top-left
  const bkW = 90, bkH = 32, bkX = 14, bkY = 14;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  roundRect(bkX, bkY, bkW, bkH, bkH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,92,31,0.22)';
  ctx.lineWidth   = 1;
  roundRect(bkX, bkY, bkW, bkH, bkH / 2);
  ctx.stroke();
  ctx.fillStyle    = '#1a5c1f';
  ctx.font         = `600 ${Math.min(13, W * 0.032)}px ${SANS}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('← Back', bkX + bkW / 2, bkY + bkH / 2);
  ctx.textBaseline = 'alphabetic';
  avatarBackBtn = { x: bkX, y: bkY, w: bkW, h: bkH };
}

function wrapText(text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '', lineY = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, lineY);
      line  = word;
      lineY += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, cx, lineY);
}

function drawDialogue() {
  if (!dlg) return;
  const SANS = 'system-ui, -apple-system, sans-serif';
  const ch   = CHARACTERS[dlg.charIdx];
  const q    = dlg.question;
  const barH = Math.min(56, H * 0.15);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillRect(0, 0, W, barH);
  ctx.fillStyle = ch.color;
  ctx.fillRect(0, barH - 3, W, 3);

  const moodKey = dlg.phase === 'reacting'
    ? (dlg.selectedAnswer === q.correct ? 'happy' : 'angry') : 'default';
  const emojiSz = Math.min(36, barH * 0.74);
  const avatarX = 12 + dlg.shakeX;
  const avatarY = barH / 2 - emojiSz / 2 + dlg.charBounce;
  const dlgImg  = ch.imgs[moodKey] || ch.imgs.default;
  if (dlgImg && dlgImg.complete && dlgImg.naturalWidth) {
    ctx.save();
    roundRect(avatarX, avatarY, emojiSz, emojiSz, 6);
    ctx.clip();
    ctx.drawImage(dlgImg, avatarX, avatarY, emojiSz, emojiSz);
    ctx.restore();
  } else {
    ctx.font         = `${emojiSz}px serif`;
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(ch.moods[moodKey] || ch.moods.default, avatarX, avatarY);
    ctx.textBaseline = 'alphabetic';
  }

  const textX = avatarX + emojiSz + 12;
  ctx.fillStyle = ch.color;
  ctx.font      = `700 ${Math.min(10, W * 0.026)}px ${SANS}`;
  ctx.textAlign = 'left';
  ctx.fillText(ch.name.toUpperCase(), textX, barH * 0.34);

  let txt, col;
  if (dlg.phase === 'reacting') {
    const ok = dlg.selectedAnswer === q.correct;
    txt = ok ? q.happyLine : q.wrongLine;
    col = ok ? '#4ade80' : '#f87171';
  } else {
    txt = q.text.slice(0, dlg.typeIdx) + (dlg.typeIdx < q.text.length ? '▌' : '');
    col = '#ffffff';
  }
  ctx.fillStyle = dlg.phase === 'reacting' ? col : '#1a1a1a';
  ctx.font      = `600 ${Math.min(14, W * 0.034)}px ${SANS}`;
  const maxTW   = W - textX - 16;
  let label     = txt;
  while (ctx.measureText(label).width > maxTW && label.length > 4) label = label.slice(0, -1);
  if (label !== txt) label += '…';
  ctx.fillText(label, textX, barH * 0.76);

  for (const s of dlg.stars) {
    ctx.globalAlpha = Math.max(0, Math.min(1, s.life * 1.4));
    ctx.fillStyle   = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  dlgBtns = [];
}

function drawDead() {
  const SANS = 'system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(200,237,208,0.72)';
  ctx.fillRect(0, 0, W, H);

  const isNewBest = score > 0 && score >= best;
  const cardW = Math.min(320, W * 0.72);
  const cardH = Math.min(isNewBest ? 230 : 210, H * 0.58);
  const cardX = W / 2 - cardW / 2, cardY = H / 2 - cardH / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  roundRect(cardX, cardY, cardW, cardH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,92,31,0.14)';
  ctx.lineWidth   = 1;
  roundRect(cardX, cardY, cardW, cardH, 20);
  ctx.stroke();

  ctx.textAlign = 'center';

  ctx.fillStyle    = 'rgba(26,92,31,0.45)';
  ctx.font         = `500 ${Math.min(12, W * 0.030)}px ${SANS}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('game over', W / 2, cardY + cardH * 0.18);

  ctx.fillStyle = '#1a5c1f';
  ctx.font      = `700 ${Math.min(52, W * 0.11)}px ${SANS}`;
  ctx.fillText(score + ' m', W / 2, cardY + cardH * 0.42);

  if (isNewBest) {
    ctx.fillStyle = '#b45309';
    ctx.font      = `600 ${Math.min(13, W * 0.032)}px ${SANS}`;
    ctx.fillText('✦ New best!', W / 2, cardY + cardH * 0.57);
  }
  ctx.textBaseline = 'alphabetic';

  // Retry button (green)
  const btnW = cardW * 0.72, btnH = 38;
  const btnX = W / 2 - btnW / 2;
  const retryY = cardY + cardH * (isNewBest ? 0.66 : 0.62);
  ctx.fillStyle = '#22c55e';
  roundRect(btnX, retryY, btnW, btnH, btnH / 2);
  ctx.fill();
  ctx.fillStyle    = '#fff';
  ctx.font         = `700 ${Math.min(14, W * 0.035)}px ${SANS}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Play Again', W / 2, retryY + btnH / 2);
  ctx.textBaseline = 'alphabetic';

  // Home button (outlined)
  const homeY = retryY + btnH + 10;
  ctx.fillStyle = 'rgba(26,92,31,0.07)';
  roundRect(btnX, homeY, btnW, btnH, btnH / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,92,31,0.30)';
  ctx.lineWidth   = 1.5;
  roundRect(btnX, homeY, btnW, btnH, btnH / 2);
  ctx.stroke();
  ctx.fillStyle    = '#1a5c1f';
  ctx.font         = `600 ${Math.min(14, W * 0.035)}px ${SANS}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⌂  Home', W / 2, homeY + btnH / 2);
  ctx.textBaseline = 'alphabetic';

  deadBtns = {
    retry: { x: btnX, y: retryY, w: btnW, h: btnH },
    home:  { x: btnX, y: homeY,  w: btnW, h: btnH },
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Input ─────────────────────────────────────────────────────────────────────
function inBtn(btn, px, py) {
  return btn && px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h;
}

function togglePause() {
  if (state !== 'playing' && state !== 'dialogue') return;
  paused = !paused;
  if (!paused) {
    pauseOverlayBtns = null;
    musicPlay();
  } else {
    musicPause();
  }
}

function goHome() {
  paused = false;
  pauseOverlayBtns = null;
  deadBtns = null;
  state = 'cover';
  musicPause();
}

function press(px, py) {
  holding = true;

  // ── Pause overlay (blocks everything else) ──────────────────────────────────
  if (paused) {
    if (pauseOverlayBtns) {
      if (inBtn(pauseOverlayBtns.resume, px, py)) { togglePause(); return; }
      if (inBtn(pauseOverlayBtns.home,   px, py)) { goHome(); return; }
    }
    return; // tap outside overlay does nothing
  }

  // ── Cover ────────────────────────────────────────────────────────────────────
  if (state === 'cover') {
    if (inBtn(settingsBtn, px, py)) { window.location.href = 'settings.html'; return; }
    state = 'avatar_select';
    return;
  }

  // ── Avatar select ────────────────────────────────────────────────────────────
  if (state === 'avatar_select') {
    if (inBtn(avatarBackBtn, px, py)) { state = 'cover'; return; }
    const idx = getCardAtPoint(px, py);
    if (idx >= 0) { playerCharIdx = idx; init(); state = 'playing'; lastTime = 0; musicPlay(); }
    return;
  }

  // ── Dead screen ──────────────────────────────────────────────────────────────
  if (state === 'dead') {
    if (deadBtns) {
      if (inBtn(deadBtns.home, px, py)) { goHome(); return; }
    }
    // tap anywhere else = retry
    init(); state = 'playing'; lastTime = 0; musicPlay();
    return;
  }

  // ── Dialogue ─────────────────────────────────────────────────────────────────
  if (state === 'dialogue') {
    if (dlg.phase === 'typing') { dlg.typeIdx = dlg.question.text.length; dlg.phase = 'choices'; }
    if (player.onGround) { player.vy = JUMP_VY; player.onGround = false; }
    return;
  }

  // ── Playing ──────────────────────────────────────────────────────────────────
  if (state === 'playing') {
    if (inBtn(pauseBtn, px, py)) { togglePause(); return; }
    if (musicBtn && inBtn(musicBtn, px, py)) { toggleMusic(); return; }
    if (player.onGround) { player.vy = JUMP_VY; player.onGround = false; jumpBuffer = 0; }
    else                 { jumpBuffer = JUMP_BUFFER_SEC; }
  }
}
function release() { holding = false; }

C.addEventListener('pointerdown', e => { e.preventDefault(); const [gx,gy] = toGame(e.clientX, e.clientY); press(gx, gy); }, { passive: false });
C.addEventListener('pointermove', e => { if (state === 'avatar_select') { const [gx,gy] = toGame(e.clientX, e.clientY); avatarHoverIdx = getCardAtPoint(gx, gy); } });
C.addEventListener('pointerup',     release);
C.addEventListener('pointercancel', release);

document.addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); togglePause(); return; }
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); press(-1, -1); }
});
document.addEventListener('keyup', e => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) release();
});

// ── Loop ──────────────────────────────────────────────────────────────────────
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = lastTime === 0 ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  if (!paused && (state === 'playing' || state === 'dialogue')) update(dt);
  if (!paused && state === 'dialogue') updateDialogue(dt);
  if (screenShake > 0.4) screenShake *= 1 - Math.min(1, dt * 8);
  else                   screenShake = 0;
  draw();
}

// ── YouTube Music ─────────────────────────────────────────────────────────────
function extractYouTubeId(url) {
  const patterns = [/[?&]v=([^&#]+)/, /youtu\.be\/([^?&#]+)/, /\/embed\/([^?&#]+)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function loadMusicSettings() {
  try {
    const raw = localStorage.getItem(MUSIC_STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    musicEnabled = !!s.enabled;
    musicVideoId = extractYouTubeId(s.url || '') || '';
  } catch(e) {}
  if (musicEnabled && musicVideoId) initYouTubeMusic();
}

function initYouTubeMusic() {
  if (document.getElementById('yt-music-host')) return;
  const div = document.createElement('div');
  div.id = 'yt-music-host';
  div.style.cssText = 'position:fixed;bottom:0;left:0;width:1px;height:1px;opacity:0.01;pointer-events:none;overflow:hidden;';
  document.body.appendChild(div);
  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function() {
  if (!musicEnabled || !musicVideoId) return;
  ytPlayer = new YT.Player('yt-music-host', {
    width: 1, height: 1,
    videoId: musicVideoId,
    playerVars: {
      autoplay: 0, loop: 1, playlist: musicVideoId,
      controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, iv_load_policy: 3,
    },
    events: {
      onReady: () => {
        ytReady = true;
        if (state === 'playing' || state === 'dialogue') musicPlay();
      },
    },
  });
};

function musicPlay() {
  if (!musicEnabled || !ytReady || !ytPlayer) return;
  ytPlayer.playVideo();
  musicPlaying = true;
}

function musicPause() {
  if (!ytReady || !ytPlayer) return;
  ytPlayer.pauseVideo();
  musicPlaying = false;
}

function toggleMusic() {
  if (musicPlaying) musicPause();
  else musicPlay();
}

// ── Gameplay settings loader ──────────────────────────────────────────────────
function loadGameplaySettings() {
  try {
    const raw = localStorage.getItem(GAMEPLAY_STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.speedStart       === 'number') SPEED_START       = s.speedStart;
    if (typeof s.speedReward      === 'number') SPEED_REWARD      = s.speedReward;
    if (typeof s.speedPenalty     === 'number') SPEED_PENALTY     = s.speedPenalty;
    if (typeof s.maxGap           === 'number') GAME_MAX_GAP      = s.maxGap;
    if (typeof s.dialogueInterval === 'number') DIALOGUE_INTERVAL = s.dialogueInterval;
    if (typeof s.dialogueFirst    === 'number') DIALOGUE_FIRST    = s.dialogueFirst;
  } catch(e) { /* ignore corrupt data */ }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadCharactersFromStorage();
loadGameplaySettings();
loadMusicSettings();
state    = 'cover';
lastTime = 0;
requestAnimationFrame(loop);
