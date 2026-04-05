// ── Firebase config ────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyA2I0adFWW2FDNjCciyZc-_N81wiB94bMc',
  authDomain:        'daglezja-game.firebaseapp.com',
  projectId:         'daglezja-game',
  storageBucket:     'daglezja-game.firebasestorage.app',
  messagingSenderId: '426870914835',
  appId:             '1:426870914835:web:ccd599428a906e63d264e6',
};

let charEditIdx  = -1;
let cropCallback = null;
let _fbStorage   = null;

// ── New character palette ─────────────────────────────────────────────────────
const NEW_CHAR_PALETTE = [
  { color: '#ff9500', moods: { default: '⭐', happy: '🌟', angry: '💥', sad: '😞' } },
  { color: '#ff2d55', moods: { default: '🦊', happy: '🎉', angry: '🔥', sad: '💔' } },
  { color: '#5856d6', moods: { default: '👾', happy: '🤩', angry: '😈', sad: '😔' } },
  { color: '#34aadc', moods: { default: '🐬', happy: '🥰', angry: '😤', sad: '😢' } },
  { color: '#4cd964', moods: { default: '🐸', happy: '😄', angry: '😠', sad: '😭' } },
];

// ── localStorage persistence ──────────────────────────────────────────────────
function saveCharactersToStorage() {
  const data = CHARACTERS.map(ch => ({
    name:         ch.name,
    color:        ch.color,
    moods:        ch.moods,
    images:       ch._imgData,
    interactions: ch.interactions || [],
  }));
  localStorage.setItem(CHAR_STORAGE_KEY, JSON.stringify(data));
}

// ── Save button state ─────────────────────────────────────────────────────────
function setSaveBtn(state) {
  ['char-save-btn', 'gp-save-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled    = state === 'saving';
    el.className   = 'btn-save-cloud' + (state && state !== 'saving' ? ' ' + state : '');
    el.textContent = state === 'saving' ? 'Saving…'
                   : state === 'saved'  ? '✓ Saved to Cloud'
                   : state === 'error'  ? '⚠ Save Failed — Retry'
                   : 'Save to Cloud';
  });
}

async function triggerFirebaseSave() {
  if (!_fbStorage) return;
  setSaveBtn('saving');
  try {
    await firebaseSaveAll();
    setSaveBtn('saved');
    setTimeout(() => setSaveBtn('idle'), 3000);
  } catch(e) {
    setSaveBtn('error');
    console.error('Firebase save failed:', e);
  }
}

// ── View navigation ───────────────────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

document.getElementById('btn-back-to-game').addEventListener('click', () => {
  window.location.href = 'index.html';
});
document.getElementById('btn-back-to-settings').addEventListener('click', () => {
  showView('view-settings');
});
document.getElementById('btn-back-to-chars').addEventListener('click', () => {
  showView('view-char-list');
  renderCharList();
});
document.getElementById('s-characters').addEventListener('click', () => {
  showView('view-char-list');
  renderCharList();
});
document.getElementById('s-gameplay').addEventListener('click', () => {
  renderGameplayView();
  showView('view-gameplay');
});
document.getElementById('btn-back-to-settings-gp').addEventListener('click', () => {
  showView('view-settings');
});
document.getElementById('char-save-btn').addEventListener('click', triggerFirebaseSave);
document.getElementById('gp-save-btn').addEventListener('click', triggerFirebaseSave);

// ── Gameplay settings ─────────────────────────────────────────────────────────
function loadGP() {
  try {
    const raw = localStorage.getItem(GAMEPLAY_STORAGE_KEY);
    return raw ? Object.assign({}, GP_DEFAULTS, JSON.parse(raw)) : { ...GP_DEFAULTS };
  } catch(e) { return { ...GP_DEFAULTS }; }
}

function saveGP(gp) {
  localStorage.setItem(GAMEPLAY_STORAGE_KEY, JSON.stringify(gp));
}

const GP_SLIDERS = [
  { sliderId: 'sl-speed-start',   valId: 'val-speed-start',   key: 'speedStart',       unit: 'px/s'   },
  { sliderId: 'sl-speed-reward',  valId: 'val-speed-reward',  key: 'speedReward',      unit: 'px/s'   },
  { sliderId: 'sl-speed-penalty', valId: 'val-speed-penalty', key: 'speedPenalty',     unit: 'px/s'   },
  { sliderId: 'sl-max-gap',       valId: 'val-max-gap',       key: 'maxGap',           unit: 'blocks' },
  { sliderId: 'sl-dlg-first',     valId: 'val-dlg-first',     key: 'dialogueFirst',    unit: 'blocks' },
  { sliderId: 'sl-dlg-interval',  valId: 'val-dlg-interval',  key: 'dialogueInterval', unit: 'blocks'     },
  { sliderId: 'sl-level-length',  valId: 'val-level-length',  key: 'levelLength',      unit: 'platforms'  },
];

function renderGameplayView() {
  const gp = loadGP();
  GP_SLIDERS.forEach(({ sliderId, valId, key, unit }) => {
    const slider = document.getElementById(sliderId);
    const valEl  = document.getElementById(valId);
    slider.value = gp[key];
    valEl.textContent = gp[key] + ' ' + unit;
    slider.oninput = () => {
      const val = Number(slider.value);
      valEl.textContent = val + ' ' + unit;
      const gp2 = loadGP();
      gp2[key] = val;
      saveGP(gp2);
    };
  });
}

document.getElementById('btn-gp-reset').addEventListener('click', () => {
  saveGP({ ...GP_DEFAULTS });
  renderGameplayView();
});

// ── Character list ────────────────────────────────────────────────────────────
function renderCharList() {
  const container = document.getElementById('char-list-items');
  container.innerHTML = '';

  const wrap = document.createElement('div');
  wrap.className = 'char-list-wrap';

  CHARACTERS.forEach((ch, i) => {
    const card = document.createElement('div');
    card.className = 'char-card';

    const avatar = document.createElement('div');
    avatar.className = 'char-avatar';
    avatar.style.background = ch.color + '22';
    if (ch.imgs.default && ch.imgs.default.complete && ch.imgs.default.naturalWidth) {
      const img = document.createElement('img');
      img.src = ch.imgs.default.src;
      avatar.appendChild(img);
    } else {
      avatar.textContent = ch.moods.default;
    }

    const info = document.createElement('div');
    info.className = 'char-info';

    const nameEl = document.createElement('div');
    nameEl.className   = 'char-name';
    nameEl.style.color = ch.color;
    nameEl.textContent = ch.name;

    const subEl = document.createElement('div');
    subEl.className = 'char-sub';
    const imgCount  = Object.keys(ch._imgData || {}).length;
    const iactCount = (ch.interactions || []).length;
    subEl.textContent = `${iactCount} interaction${iactCount !== 1 ? 's' : ''} · ${imgCount}/4 mood images`;

    info.appendChild(nameEl);
    info.appendChild(subEl);

    const right = document.createElement('div');
    right.className = 'char-card-right';

    if (CHARACTERS.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.className   = 'char-del-btn';
      delBtn.textContent = '×';
      delBtn.title       = 'Delete character';
      delBtn.addEventListener('click', e => { e.stopPropagation(); removeCharacter(i); });
      right.appendChild(delBtn);
    }

    const arrow = document.createElement('span');
    arrow.className   = 'char-arrow';
    arrow.textContent = '›';
    right.appendChild(arrow);

    card.appendChild(avatar);
    card.appendChild(info);
    card.appendChild(right);
    card.addEventListener('click', () => openCharEditor(i));
    wrap.appendChild(card);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-char';
  addBtn.innerHTML = '<span style="font-size:20px;line-height:1">+</span> Add Character';
  addBtn.addEventListener('click', addCharacter);
  wrap.appendChild(addBtn);

  container.appendChild(wrap);
}

// ── Character editor ──────────────────────────────────────────────────────────
const MOOD_META = {
  default: { label: 'Default', hint: 'Cover & dialogue' },
  happy:   { label: 'Happy',   hint: 'Correct answer'   },
  angry:   { label: 'Angry',   hint: 'Wrong answer'     },
  sad:     { label: 'Sad',     hint: 'Game over'        },
};

function renderHeroAvatar(ch) {
  const hero = document.getElementById('char-hero-avatar');
  hero.innerHTML = '';
  hero.style.background = ch.color + '33';
  if (ch.imgs.default && ch.imgs.default.complete && ch.imgs.default.naturalWidth) {
    const img = document.createElement('img');
    img.src = ch.imgs.default.src;
    hero.appendChild(img);
  } else {
    hero.textContent = ch.moods.default;
  }
  hero.onclick = () => pickImage('default');
}

function openCharEditor(idx) {
  charEditIdx = idx;
  const ch    = CHARACTERS[idx];
  document.getElementById('char-title').textContent       = ch.name;
  document.getElementById('char-edit-name').value         = ch.name;
  document.getElementById('char-delete-btn').style.display = CHARACTERS.length > 1 ? 'block' : 'none';
  renderHeroAvatar(ch);
  renderMoodGrid(ch);
  renderInteractionsList();
  showView('view-char-edit');
}

// Name auto-saves on blur
document.getElementById('char-edit-name').addEventListener('blur', () => {
  const name = document.getElementById('char-edit-name').value.trim();
  if (!name || charEditIdx < 0) return;
  CHARACTERS[charEditIdx].name = name;
  document.getElementById('char-title').textContent = name;
  saveCharactersToStorage();
});

function renderMoodGrid(ch) {
  const grid = document.getElementById('mood-grid');
  grid.innerHTML = '';
  ['default','happy','angry','sad'].forEach(mood => {
    const hasImg = !!(ch.imgs[mood] && ch.imgs[mood].complete && ch.imgs[mood].naturalWidth);
    const cell   = document.createElement('div');
    cell.className = 'mood-cell' + (hasImg ? ' has-img' : '');
    if (hasImg) {
      cell.innerHTML = `<img src="${ch.imgs[mood].src}" alt="${mood}" />`
                     + `<div class="mood-label">${MOOD_META[mood].label}</div>`
                     + `<div class="mood-hint">Tap to change</div>`;
    } else {
      cell.innerHTML = `<span class="mood-emoji">${ch.moods[mood]}</span>`
                     + `<div class="mood-label">${MOOD_META[mood].label}</div>`
                     + `<div class="mood-hint">${MOOD_META[mood].hint} · tap to add</div>`;
    }
    cell.addEventListener('click', () => pickImage(mood));
    grid.appendChild(cell);
  });
}

document.getElementById('char-delete-btn').addEventListener('click', () => {
  removeCharacter(charEditIdx);
});

// ── Add / Remove characters ───────────────────────────────────────────────────
function addCharacter() {
  const template = NEW_CHAR_PALETTE[CHARACTERS.length % NEW_CHAR_PALETTE.length];
  CHARACTERS.push({
    name: 'New Character', color: template.color,
    moods: { ...template.moods }, imgs: {}, _imgData: {},
    interactions: [],
  });
  saveCharactersToStorage();
  openCharEditor(CHARACTERS.length - 1);
}

function removeCharacter(idx) {
  if (CHARACTERS.length <= 1) return;
  if (!confirm(`Delete "${CHARACTERS[idx].name}"?`)) return;
  CHARACTERS.splice(idx, 1);
  saveCharactersToStorage();
  showView('view-char-list');
  renderCharList();
}

// ── Image picker → crop ───────────────────────────────────────────────────────
let pendingMood = null;
const fileInput = document.getElementById('img-file-input');

function pickImage(mood) {
  pendingMood     = mood;
  fileInput.value = '';
  fileInput.click();
}

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => openCropModal(ev.target.result, dataUrl => {
    const ch = CHARACTERS[charEditIdx];
    ch._imgData[pendingMood] = dataUrl;
    const img = new Image();
    img.onload = () => {
      ch.imgs[pendingMood] = img;
      saveCharactersToStorage();
      renderMoodGrid(ch);
      renderHeroAvatar(ch);
      document.getElementById('char-title').textContent = ch.name;
    };
    img.src = dataUrl;
  });
  reader.readAsDataURL(file);
});

// ── Crop tool ─────────────────────────────────────────────────────────────────
const cropModal  = document.getElementById('crop-modal');
const cropCanvas = document.getElementById('crop-canvas');
const cropCtx    = cropCanvas.getContext('2d');
const cs = { img: null, ox: 0, oy: 0, scale: 1, size: 280,
             dragging: false, dragSx: 0, dragSy: 0, dragOx: 0, dragOy: 0 };

function openCropModal(src, cb) {
  cropCallback = cb;
  const srcImg = new Image();
  srcImg.onload = () => {
    cs.img  = srcImg;
    const sz = Math.min(Math.floor(Math.min(window.innerWidth * 0.88, window.innerHeight * 0.52)), 320);
    cs.size  = sz;
    cropCanvas.width  = sz;
    cropCanvas.height = sz;
    const fill = Math.max(sz / srcImg.width, sz / srcImg.height);
    cs.scale = fill;
    cs.ox    = (sz - srcImg.width  * fill) / 2;
    cs.oy    = (sz - srcImg.height * fill) / 2;
    cropModal.classList.add('open');
    drawCropPreview();
  };
  srcImg.src = src;
}

function drawCropPreview() {
  cropCtx.clearRect(0, 0, cs.size, cs.size);
  cropCtx.drawImage(cs.img, cs.ox, cs.oy, cs.img.width * cs.scale, cs.img.height * cs.scale);
}

function cropZoom(factor, pivotX, pivotY) {
  const px = pivotX ?? cs.size / 2;
  const py = pivotY ?? cs.size / 2;
  cs.ox    = px + (cs.ox - px) * factor;
  cs.oy    = py + (cs.oy - py) * factor;
  cs.scale *= factor;
  drawCropPreview();
}

cropCanvas.addEventListener('pointerdown', e => {
  cropCanvas.setPointerCapture(e.pointerId);
  cs.dragging = true;
  cs.dragSx = e.clientX; cs.dragSy = e.clientY;
  cs.dragOx = cs.ox;     cs.dragOy = cs.oy;
});
cropCanvas.addEventListener('pointermove', e => {
  if (!cs.dragging) return;
  cs.ox = cs.dragOx + (e.clientX - cs.dragSx);
  cs.oy = cs.dragOy + (e.clientY - cs.dragSy);
  drawCropPreview();
});
cropCanvas.addEventListener('pointerup',     () => { cs.dragging = false; });
cropCanvas.addEventListener('pointercancel', () => { cs.dragging = false; });
cropCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  cropZoom(e.deltaY < 0 ? 1.1 : 0.9);
}, { passive: false });

let _lastPinchDist = 0;
cropCanvas.addEventListener('touchstart', e => {
  if (e.touches.length === 2) {
    _lastPinchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    cs.dragging = false;
  }
}, { passive: true });
cropCanvas.addEventListener('touchmove', e => {
  if (e.touches.length !== 2) return;
  const dist = Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY
  );
  if (_lastPinchDist > 0) cropZoom(dist / _lastPinchDist);
  _lastPinchDist = dist;
}, { passive: true });

document.getElementById('crop-cancel-btn').addEventListener('click', () => {
  cropModal.classList.remove('open');
  cropCallback = null;
});
document.getElementById('crop-ok-btn').addEventListener('click', () => {
  const out = document.createElement('canvas');
  out.width = 128; out.height = 128;
  const oc  = out.getContext('2d');
  const ratio = 128 / cs.size;
  oc.drawImage(cs.img,
    cs.ox * ratio, cs.oy * ratio,
    cs.img.width  * cs.scale * ratio,
    cs.img.height * cs.scale * ratio
  );
  const dataUrl = out.toDataURL('image/jpeg', 0.88);
  cropModal.classList.remove('open');
  if (cropCallback) { cropCallback(dataUrl); cropCallback = null; }
});

// ── Interactions — inline editable with drag-to-reorder ───────────────────────
let dragSrcCard   = null;
let touchDragCard = null;
let touchDragIdx  = null;

function autoResize(ta) {
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

function renderInteractionsList() {
  const ch   = CHARACTERS[charEditIdx];
  const list = document.getElementById('interactions-list');
  list.innerHTML = '';

  if (!ch.interactions || ch.interactions.length === 0) {
    const empty = document.createElement('div');
    empty.className   = 'iact-empty';
    empty.textContent = 'No interactions yet — tap + Add to create one.';
    list.appendChild(empty);
    return;
  }

  ch.interactions.forEach((iact, i) => {
    list.appendChild(buildIactCard(ch, iact, i));
  });
}

function buildIactCard(ch, iact, i) {
  const card = document.createElement('div');
  card.className  = 'iact-card';
  card.dataset.idx = i;

  // ── Drag handle (2×3 dot grid)
  const handle = document.createElement('div');
  handle.className = 'iact-drag-handle';
  handle.title     = 'Drag to reorder';
  handle.innerHTML =
    '<div class="drag-dot-row"><span class="drag-dot"></span><span class="drag-dot"></span></div>' +
    '<div class="drag-dot-row"><span class="drag-dot"></span><span class="drag-dot"></span></div>' +
    '<div class="drag-dot-row"><span class="drag-dot"></span><span class="drag-dot"></span></div>';

  // ── Editable fields
  const fields = document.createElement('div');
  fields.className = 'iact-fields';

  function makeField(labelText, fieldKey, value, maxLen, extraLabelClass, extraTaClass) {
    const wrap = document.createElement('div');
    wrap.className = 'iact-field';

    const label = document.createElement('label');
    label.className   = 'iact-label' + (extraLabelClass ? ' ' + extraLabelClass : '');
    label.textContent = labelText;

    const ta = document.createElement('textarea');
    ta.className  = 'iact-textarea' + (extraTaClass ? ' ' + extraTaClass : '');
    ta.value      = value;
    ta.maxLength  = maxLen;
    ta.rows       = 1;
    ta.placeholder = labelText;

    ta.addEventListener('input', () => {
      autoResize(ta);
      const idx = parseInt(card.dataset.idx);
      ch.interactions[idx][fieldKey] = ta.value;
      saveCharactersToStorage();
    });

    ta.addEventListener('blur', () => {
      const idx = parseInt(card.dataset.idx);
      if (ch.interactions[idx]) {
        ch.interactions[idx][fieldKey] = ta.value.trim();
        ta.value = ta.value.trim();
        autoResize(ta);
        saveCharactersToStorage();
      }
    });

    wrap.appendChild(label);
    wrap.appendChild(ta);
    return { wrap, ta };
  }

  const { wrap: wText, ta: taText } = makeField('Question',  'text',    iact.text,    120);
  const { wrap: wOk,   ta: taOk   } = makeField('✓ Correct', 'correct', iact.correct,  80, 'correct-label', 'correct-textarea');
  const { wrap: wBad,  ta: taBad  } = makeField('✗ Wrong',   'wrong',   iact.wrong,    80, 'wrong-label',   'wrong-textarea');

  fields.appendChild(wText);
  fields.appendChild(wOk);
  fields.appendChild(wBad);

  // Auto-resize after paint
  requestAnimationFrame(() => [taText, taOk, taBad].forEach(autoResize));

  // ── Delete button
  const delBtn = document.createElement('button');
  delBtn.className   = 'iact-del-btn';
  delBtn.textContent = '␡';
  delBtn.title       = 'Delete interaction';
  delBtn.addEventListener('click', () => {
    const idx = parseInt(card.dataset.idx);
    if (!confirm('Delete this interaction?')) return;
    ch.interactions.splice(idx, 1);
    saveCharactersToStorage();
    renderInteractionsList();
  });

  card.appendChild(handle);
  card.appendChild(fields);
  card.appendChild(delBtn);

  // ── Desktop drag — only drag when initiated from handle
  handle.addEventListener('mousedown', () => {
    card.setAttribute('draggable', 'true');
    const reset = () => {
      card.setAttribute('draggable', 'false');
      document.removeEventListener('mouseup', reset);
    };
    document.addEventListener('mouseup', reset);
  });

  card.addEventListener('dragstart', e => {
    dragSrcCard = card;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => card.classList.add('dragging'), 0);
  });

  card.addEventListener('dragend', () => {
    card.setAttribute('draggable', 'false');
    card.classList.remove('dragging');
    document.querySelectorAll('.iact-card').forEach(c => c.classList.remove('drag-over'));
    dragSrcCard = null;
  });

  card.addEventListener('dragover', e => {
    e.preventDefault();
    if (card !== dragSrcCard) card.classList.add('drag-over');
  });

  card.addEventListener('dragleave', () => card.classList.remove('drag-over'));

  card.addEventListener('drop', e => {
    e.preventDefault();
    if (!dragSrcCard || dragSrcCard === card) return;
    const srcIdx = parseInt(dragSrcCard.dataset.idx);
    const dstIdx = parseInt(card.dataset.idx);
    const [item] = ch.interactions.splice(srcIdx, 1);
    ch.interactions.splice(dstIdx, 0, item);
    saveCharactersToStorage();
    renderInteractionsList();
  });

  // ── Touch drag — initiated from handle
  handle.addEventListener('touchstart', e => {
    e.preventDefault();
    touchDragCard = card;
    touchDragIdx  = parseInt(card.dataset.idx);
    card.classList.add('dragging');
  }, { passive: false });

  return card;
}

// Document-level touch move/end for mobile drag
document.addEventListener('touchmove', e => {
  if (!touchDragCard) return;
  e.preventDefault();
  const touch = e.touches[0];
  // Temporarily hide dragged card so elementFromPoint can see card underneath
  touchDragCard.style.visibility = 'hidden';
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  touchDragCard.style.visibility = '';
  const target = el?.closest('.iact-card');
  document.querySelectorAll('.iact-card').forEach(c => c.classList.remove('drag-over'));
  if (target && target !== touchDragCard) target.classList.add('drag-over');
}, { passive: false });

document.addEventListener('touchend', e => {
  if (!touchDragCard) return;
  const touch = e.changedTouches[0];
  touchDragCard.style.visibility = 'hidden';
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  touchDragCard.style.visibility = '';
  const target = el?.closest('.iact-card');

  if (target && target !== touchDragCard) {
    const ch     = CHARACTERS[charEditIdx];
    const dstIdx = parseInt(target.dataset.idx);
    const [item] = ch.interactions.splice(touchDragIdx, 1);
    ch.interactions.splice(dstIdx, 0, item);
    saveCharactersToStorage();
    renderInteractionsList();
  } else {
    touchDragCard.classList.remove('dragging');
    document.querySelectorAll('.iact-card').forEach(c => c.classList.remove('drag-over'));
  }
  touchDragCard = null;
  touchDragIdx  = null;
}, { passive: true });

document.getElementById('btn-add-interaction').addEventListener('click', () => {
  const ch = CHARACTERS[charEditIdx];
  if (!ch.interactions) ch.interactions = [];
  ch.interactions.push({ text: '', correct: '', wrong: '' });
  saveCharactersToStorage();
  renderInteractionsList();
  // Focus and scroll to the new card
  requestAnimationFrame(() => {
    const cards   = document.querySelectorAll('.iact-card');
    const newCard = cards[cards.length - 1];
    newCard?.querySelector('.iact-textarea')?.focus();
    newCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});

// ── Firebase sync ─────────────────────────────────────────────────────────────
function loadScriptsSeq(urls, cb) {
  if (!urls.length) { cb(); return; }
  const s = document.createElement('script');
  s.src    = urls[0];
  s.onload = () => loadScriptsSeq(urls.slice(1), cb);
  document.head.appendChild(s);
}

function initFirebase() {
  if (!FIREBASE_CONFIG.apiKey) return;
  const VER = '10.12.0';
  loadScriptsSeq([
    `https://www.gstatic.com/firebasejs/${VER}/firebase-app-compat.js`,
    `https://www.gstatic.com/firebasejs/${VER}/firebase-storage-compat.js`,
  ], () => {
    const app  = window.firebase.apps.length
                 ? window.firebase.app()
                 : window.firebase.initializeApp(FIREBASE_CONFIG);
    _fbStorage = window.firebase.storage(app);
    // Auto-load on startup
    setSaveBtn('saving');
    firebaseLoadAll()
      .then(() => {
        setSaveBtn('idle');
        renderCharList();
      })
      .catch(err => {
        if (err?.code === 'storage/object-not-found') {
          setSaveBtn('idle'); // No cloud data yet — that's OK
        } else {
          setSaveBtn('error');
          console.error('Firebase load failed:', err);
        }
      });
  });
}

async function firebaseSaveAll() {
  const root = _fbStorage.ref('characters');
  const meta = {};
  for (let i = 0; i < CHARACTERS.length; i++) {
    const ch = CHARACTERS[i];
    meta[i] = {
      name:         ch.name,
      color:        ch.color,
      moods:        ch.moods,
      interactions: ch.interactions || [],
      paths:        {},
    };
    for (const mood of ['default','happy','angry','sad']) {
      if (!ch._imgData[mood]) continue;
      const b64  = ch._imgData[mood].split(',')[1];
      const bin  = atob(b64);
      const arr  = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
      const path = `char-${i}-${mood}.jpg`;
      await root.child(path).put(arr.buffer, { contentType: 'image/jpeg' });
      meta[i].paths[mood] = path;
    }
  }
  const metaBlob = new Blob([JSON.stringify(meta)], { type: 'application/json' });
  await root.child('meta.json').put(metaBlob, { contentType: 'application/json' });

  const gpBlob = new Blob([JSON.stringify(loadGP())], { type: 'application/json' });
  await _fbStorage.ref('gameplay.json').put(gpBlob, { contentType: 'application/json' });
}

async function firebaseLoadAll() {
  const metaUrl = await _fbStorage.ref('characters/meta.json').getDownloadURL();
  const meta    = await fetch(metaUrl).then(r => r.json());

  for (const [idx, charMeta] of Object.entries(meta)) {
    const i = parseInt(idx);
    // Extend CHARACTERS array if cloud has more than local
    while (CHARACTERS.length <= i) {
      const tpl = NEW_CHAR_PALETTE[CHARACTERS.length % NEW_CHAR_PALETTE.length];
      CHARACTERS.push({ name: 'New Character', color: tpl.color,
                        moods: { ...tpl.moods }, imgs: {}, _imgData: {}, interactions: [] });
    }
    if (charMeta.name)         CHARACTERS[i].name         = charMeta.name;
    if (charMeta.color)        CHARACTERS[i].color        = charMeta.color;
    if (charMeta.moods)        CHARACTERS[i].moods        = charMeta.moods;
    if (charMeta.interactions) CHARACTERS[i].interactions = charMeta.interactions;

    for (const [mood, path] of Object.entries(charMeta.paths || {})) {
      const url  = await _fbStorage.ref(`characters/${path}`).getDownloadURL();
      const blob = await fetch(url).then(r => r.blob());
      await new Promise(res => {
        const fr = new FileReader();
        fr.onload = ev => {
          const dataUrl = ev.target.result;
          CHARACTERS[i]._imgData[mood] = dataUrl;
          const img = new Image();
          img.onload = () => { CHARACTERS[i].imgs[mood] = img; res(); };
          img.src = dataUrl;
        };
        fr.readAsDataURL(blob);
      });
    }
  }
  saveCharactersToStorage();

  try {
    const gpUrl = await _fbStorage.ref('gameplay.json').getDownloadURL();
    const gp    = await fetch(gpUrl).then(r => r.json());
    saveGP(Object.assign({}, GP_DEFAULTS, gp));
  } catch(e) { /* no gameplay data in cloud yet — keep local */ }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadCharactersFromStorage();
document.getElementById('s-version').textContent = VERSION;
renderCharList();
initFirebase(); // loads from Firebase on start; after load, re-renders
