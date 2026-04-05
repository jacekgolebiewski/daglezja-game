// ── Firebase config ───────────────────────────────────────────────────────────
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
  renderSyncSection();
  renderCharList();
});
document.getElementById('s-gameplay').addEventListener('click', () => {
  renderGameplayView();
  showView('view-gameplay');
});
document.getElementById('btn-back-to-settings-gp').addEventListener('click', () => {
  showView('view-settings');
});

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

function loadMusic() {
  try {
    const raw = localStorage.getItem(MUSIC_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { enabled: false, url: '' };
  } catch(e) { return { enabled: false, url: '' }; }
}

function saveMusic(m) {
  localStorage.setItem(MUSIC_STORAGE_KEY, JSON.stringify(m));
}

const GP_SLIDERS = [
  { sliderId: 'sl-speed-start',   valId: 'val-speed-start',   key: 'speedStart',       unit: 'px/s'   },
  { sliderId: 'sl-speed-reward',  valId: 'val-speed-reward',  key: 'speedReward',      unit: 'px/s'   },
  { sliderId: 'sl-speed-penalty', valId: 'val-speed-penalty', key: 'speedPenalty',     unit: 'px/s'   },
  { sliderId: 'sl-max-gap',       valId: 'val-max-gap',       key: 'maxGap',           unit: 'blocks' },
  { sliderId: 'sl-dlg-first',     valId: 'val-dlg-first',     key: 'dialogueFirst',    unit: 'blocks' },
  { sliderId: 'sl-dlg-interval',  valId: 'val-dlg-interval',  key: 'dialogueInterval', unit: 'blocks' },
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

  // Music settings
  const music = loadMusic();
  const musicEnabledEl = document.getElementById('music-enabled');
  const musicUrlEl     = document.getElementById('music-url');
  musicEnabledEl.checked = !!music.enabled;
  musicUrlEl.value       = music.url || '';
  musicEnabledEl.onchange = () => {
    const m = loadMusic();
    m.enabled = musicEnabledEl.checked;
    saveMusic(m);
  };
  musicUrlEl.onchange = () => {
    const m = loadMusic();
    m.url = musicUrlEl.value.trim();
    saveMusic(m);
  };
}

document.getElementById('btn-gp-reset').addEventListener('click', () => {
  saveGP({ ...GP_DEFAULTS });
  renderGameplayView();
});

// ── Character list ────────────────────────────────────────────────────────────
function renderCharList() {
  const container = document.getElementById('char-list-items');
  container.innerHTML = '';

  const section = document.createElement('div');
  section.style.padding = '8px 16px 16px';

  const label = document.createElement('p');
  label.className   = 's-section-label';
  label.textContent = 'Game Characters';
  section.appendChild(label);

  const card = document.createElement('div');
  card.className = 's-card';

  CHARACTERS.forEach((ch, i) => {
    const row = document.createElement('div');
    row.className     = 's-row s-row-tappable';
    row.style.cssText = 'gap:10px';

    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'char-avatar-wrap';
    if (ch.imgs.default && ch.imgs.default.complete && ch.imgs.default.naturalWidth) {
      const img = document.createElement('img');
      img.src = ch.imgs.default.src;
      avatarWrap.appendChild(img);
    } else {
      avatarWrap.textContent = ch.moods.default;
    }

    const info = document.createElement('div');
    info.className = 'char-info';
    info.innerHTML = `<div class="char-name" style="color:${ch.color}">${ch.name}</div>`
                   + `<div class="char-sub">${Object.keys(ch._imgData).length} / 4 moods customised</div>`;

    const arrow = document.createElement('span');
    arrow.className   = 'char-arrow';
    arrow.textContent = '›';

    row.appendChild(avatarWrap);
    row.appendChild(info);

    if (CHARACTERS.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.className   = 'char-row-delete';
      delBtn.textContent = '×';
      delBtn.title       = 'Delete character';
      delBtn.addEventListener('click', e => { e.stopPropagation(); removeCharacter(i); });
      row.appendChild(delBtn);
    }

    row.appendChild(arrow);
    row.addEventListener('click', () => openCharEditor(i));
    card.appendChild(row);
  });

  section.appendChild(card);

  const addBtn = document.createElement('button');
  addBtn.className = 'btn-add-char';
  addBtn.innerHTML = '<span style="font-size:20px;line-height:1">+</span> Add Character';
  addBtn.addEventListener('click', addCharacter);
  container.appendChild(section);
  container.appendChild(addBtn);
}

// ── Character editor ──────────────────────────────────────────────────────────
const MOOD_META = {
  default: { label: 'Default', hint: 'Cover & dialogue' },
  happy:   { label: 'Happy',   hint: 'Correct answer'   },
  angry:   { label: 'Angry',   hint: 'Wrong answer'     },
  sad:     { label: 'Sad',     hint: 'Game over'        },
};

function openCharEditor(idx) {
  charEditIdx = idx;
  const ch    = CHARACTERS[idx];
  document.getElementById('char-title').textContent        = ch.name;
  document.getElementById('char-edit-name').value          = ch.name;
  document.getElementById('char-delete-btn').style.display = CHARACTERS.length > 1 ? 'block' : 'none';
  renderMoodGrid(ch);
  closeIactForm();
  renderInteractionsList();
  showView('view-char-edit');
}

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

document.getElementById('char-save-btn').addEventListener('click', () => {
  const name = document.getElementById('char-edit-name').value.trim();
  if (!name) return;
  CHARACTERS[charEditIdx].name = name;
  saveCharactersToStorage();
  showView('view-char-list');
  renderCharList();
});

document.getElementById('char-delete-btn').addEventListener('click', () => {
  removeCharacter(charEditIdx);
});

// ── Add / Remove characters ───────────────────────────────────────────────────
const NEW_CHAR_PALETTE = [
  { color: '#ff9500', moods: { default: '⭐', happy: '🌟', angry: '💥', sad: '😞' } },
  { color: '#ff2d55', moods: { default: '🦊', happy: '🎉', angry: '🔥', sad: '💔' } },
  { color: '#5856d6', moods: { default: '👾', happy: '🤩', angry: '😈', sad: '😔' } },
  { color: '#34aadc', moods: { default: '🐬', happy: '🥰', angry: '😤', sad: '😢' } },
  { color: '#4cd964', moods: { default: '🐸', happy: '😄', angry: '😠', sad: '😭' } },
];

function addCharacter() {
  const template = NEW_CHAR_PALETTE[CHARACTERS.length % NEW_CHAR_PALETTE.length];
  CHARACTERS.push({
    name: 'New Character', color: template.color,
    moods: { ...template.moods }, imgs: {}, _imgData: {},
  });
  saveCharactersToStorage();
  openCharEditor(CHARACTERS.length - 1);
}

function removeCharacter(idx) {
  if (CHARACTERS.length <= 1) return;
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
    _fbStorage = window.firebase.storage(window.firebase.initializeApp(FIREBASE_CONFIG));
    firebaseLoadAll();
  });
}

function setSyncStatus(msg) {
  const el = document.getElementById('sync-status-text');
  if (el) el.textContent = msg;
}

async function firebaseSaveAll() {
  setSyncStatus('Uploading…');
  try {
    const root = _fbStorage.ref('characters');
    const meta = {};
    for (let i = 0; i < CHARACTERS.length; i++) {
      const ch = CHARACTERS[i];
      meta[i]  = { name: ch.name, color: ch.color, paths: {} };
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
    setSyncStatus('✓ Saved to Firebase');
  } catch(err) {
    setSyncStatus('Upload failed — check console');
    console.error(err);
  }
}

async function firebaseLoadAll() {
  setSyncStatus('Loading…');
  try {
    const metaUrl = await _fbStorage.ref('characters/meta.json').getDownloadURL();
    const meta    = await fetch(metaUrl).then(r => r.json());
    for (const [idx, charMeta] of Object.entries(meta)) {
      const i = parseInt(idx);
      if (!CHARACTERS[i]) continue;
      if (charMeta.name)  CHARACTERS[i].name  = charMeta.name;
      if (charMeta.color) CHARACTERS[i].color = charMeta.color;
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
    setSyncStatus('✓ Synced');
    renderCharList();
  } catch(err) {
    setSyncStatus(err.code === 'storage/object-not-found' ? 'No data yet — save first' : 'Load failed');
  }
}

function renderSyncSection() {
  const wrap = document.getElementById('char-drive-section');
  if (!FIREBASE_CONFIG.apiKey) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `
    <div style="padding:16px 16px 4px">
      <p class="s-section-label">Cloud Sync</p>
      <div class="drive-card">
        <div class="drive-row">
          <span class="drive-status" id="sync-status-text">
            ${_fbStorage ? 'Ready' : 'Connecting…'}
          </span>
        </div>
        <div class="drive-row">
          <button class="btn-drive" style="flex:1" id="sync-save-btn">↑ Save for everyone</button>
          <button class="btn-drive" style="flex:1" id="sync-load-btn">↓ Load latest</button>
        </div>
      </div>
    </div>`;
  document.getElementById('sync-save-btn').addEventListener('click', firebaseSaveAll);
  document.getElementById('sync-load-btn').addEventListener('click', firebaseLoadAll);
}

// ── Interaction CRUD ──────────────────────────────────────────────────────────
let iactEditIdx = -1;

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderInteractionsList() {
  const ch   = CHARACTERS[charEditIdx];
  const list = document.getElementById('interactions-list');
  list.innerHTML = '';

  if (!ch.interactions || ch.interactions.length === 0) {
    const p = document.createElement('p');
    p.className   = 'iact-empty';
    p.textContent = 'No interactions yet — add one below.';
    list.appendChild(p);
    return;
  }

  ch.interactions.forEach((iact, i) => {
    const item = document.createElement('div');
    item.className = 'iact-item';

    const textWrap = document.createElement('div');
    textWrap.className = 'iact-item-text';

    const q = document.createElement('div');
    q.className   = 'iact-q';
    q.textContent = iact.text;

    const resp = document.createElement('div');
    resp.className   = 'iact-responses';
    resp.textContent = `✓ ${iact.correct}   ✗ ${iact.wrong}`;

    textWrap.appendChild(q);
    textWrap.appendChild(resp);

    const btns = document.createElement('div');
    btns.className = 'iact-btns';

    const editBtn = document.createElement('button');
    editBtn.className   = 'btn-iact-edit';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openIactForm(i));

    const delBtn = document.createElement('button');
    delBtn.className   = 'btn-iact-del';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => deleteIact(i));

    btns.appendChild(editBtn);
    btns.appendChild(delBtn);
    item.appendChild(textWrap);
    item.appendChild(btns);
    list.appendChild(item);
  });
}

function openIactForm(idx) {
  iactEditIdx = idx;
  const ch    = CHARACTERS[charEditIdx];
  const iact  = idx >= 0 ? ch.interactions[idx] : { text: '', correct: '', wrong: '' };

  const formWrap = document.getElementById('interaction-form');
  formWrap.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'iact-form';

  const txtInput = document.createElement('input');
  txtInput.type = 'text'; txtInput.id = 'iact-text';
  txtInput.placeholder = 'Question text'; txtInput.maxLength = 120;
  txtInput.value = iact.text;

  const okInput = document.createElement('input');
  okInput.type = 'text'; okInput.id = 'iact-correct';
  okInput.placeholder = 'Correct response'; okInput.maxLength = 80;
  okInput.value = iact.correct;

  const badInput = document.createElement('input');
  badInput.type = 'text'; badInput.id = 'iact-wrong';
  badInput.placeholder = 'Wrong response'; badInput.maxLength = 80;
  badInput.value = iact.wrong;

  const btnRow = document.createElement('div');
  btnRow.className = 'iact-form-btns';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button'; saveBtn.className = 'btn-iact-save';
  saveBtn.textContent = idx >= 0 ? 'Update' : 'Add';
  saveBtn.addEventListener('click', saveIact);

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button'; cancelBtn.className = 'btn-iact-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', closeIactForm);

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(cancelBtn);
  card.appendChild(txtInput);
  card.appendChild(okInput);
  card.appendChild(badInput);
  card.appendChild(btnRow);
  formWrap.appendChild(card);

  document.getElementById('btn-add-interaction').style.display = 'none';
  txtInput.focus();
}

function closeIactForm() {
  const formWrap = document.getElementById('interaction-form');
  if (formWrap) formWrap.innerHTML = '';
  const addBtn = document.getElementById('btn-add-interaction');
  if (addBtn) addBtn.style.display = '';
  iactEditIdx = -1;
}

function saveIact() {
  const text    = (document.getElementById('iact-text')?.value    || '').trim();
  const correct = (document.getElementById('iact-correct')?.value || '').trim();
  const wrong   = (document.getElementById('iact-wrong')?.value   || '').trim();
  if (!text || !correct || !wrong) return;

  const ch = CHARACTERS[charEditIdx];
  if (!ch.interactions) ch.interactions = [];

  if (iactEditIdx >= 0) {
    ch.interactions[iactEditIdx] = { text, correct, wrong };
  } else {
    ch.interactions.push({ text, correct, wrong });
  }

  saveCharactersToStorage();
  closeIactForm();
  renderInteractionsList();
}

function deleteIact(idx) {
  const ch = CHARACTERS[charEditIdx];
  ch.interactions.splice(idx, 1);
  saveCharactersToStorage();
  renderInteractionsList();
}

document.getElementById('btn-add-interaction').addEventListener('click', () => openIactForm(-1));

// ── Boot ──────────────────────────────────────────────────────────────────────
loadCharactersFromStorage();
initFirebase();
document.getElementById('s-version').textContent = VERSION;
