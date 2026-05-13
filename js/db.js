// ═══════════════════════════════════════════════════════════════════════════════
// INDEXEDDB
// ═══════════════════════════════════════════════════════════════════════════════
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('words')) db.createObjectStore('words', { keyPath: 'rank' });
      if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function dbGet(store, key) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function dbGetAll(store) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function dbPut(store, value, key) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = key !== undefined ? tx.objectStore(store).put(value, key) : tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

function dbPutBatch(store, entries) {
  // entries: array of {key, value} for audio store, or array of objects for words store
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    for (const entry of entries) {
      if (entry.key !== undefined) {
        os.put(entry.value, entry.key);
      } else {
        os.put(entry);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

function dbClearStore(store) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREFS & SRS
// ═══════════════════════════════════════════════════════════════════════════════
function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) Object.assign(prefs, JSON.parse(raw));
  } catch {}
}

function savePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function loadSRS() {
  try { return JSON.parse(localStorage.getItem(SRS_KEY)) || {}; }
  catch { return {}; }
}

function saveSRS(data) {
  localStorage.setItem(SRS_KEY, JSON.stringify(data));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS EXPORT / IMPORT
// ═══════════════════════════════════════════════════════════════════════════════
function exportProgress() {
  const srs = loadSRS();
  const date = new Date().toISOString().slice(0, 10);
  const payload = { version: 1, exported: new Date().toISOString(), srs };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `greek_progress_${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importProgress(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = ''; // reset so same file can be picked again

  const reader = new FileReader();
  reader.onload = e => {
    let payload;
    try {
      payload = JSON.parse(e.target.result);
      if (!payload.srs || typeof payload.srs !== 'object') throw new Error('Invalid format');
    } catch {
      alert('Could not read progress file — make sure it is a valid export from this app.');
      return;
    }

    const incoming = payload.srs;
    const current = loadSRS();
    const hasCurrentData = Object.keys(current).length > 0;

    if (!hasCurrentData) {
      // Nothing here yet — just replace
      saveSRS(incoming);
      renderLevelGrids();
      alert(`Progress imported: ${Object.keys(incoming).length} card entries loaded.`);
      return;
    }

    // Ask user how to handle conflict
    const choice = confirm(
      `You already have progress data on this device.\n\n` +
      `OK = Replace all (use imported file)\n` +
      `Cancel = Merge (keep best streak & sum seen/correct/incorrect)`
    );

    if (choice) {
      // Replace
      saveSRS(incoming);
    } else {
      // Merge: union of keys, per-card take best streak/complete, sum counts, union days
      const merged = Object.assign({}, current);
      for (const [key, inc] of Object.entries(incoming)) {
        if (!merged[key]) {
          merged[key] = inc;
        } else {
          const cur = merged[key];
          // SRS: keep higher streak/reps; if imported has more reps, trust its interval/easeFactor too
          if ((inc.reps || 0) > (cur.reps || 0)) {
            cur.interval = inc.interval;
            cur.easeFactor = inc.easeFactor;
            cur.nextReview = inc.nextReview;
            cur.reps = inc.reps;
          }
          cur.streak = Math.max(cur.streak || 0, inc.streak || 0);
          cur.complete = cur.complete || inc.complete;
          // Stats: sum
          cur.seen = (cur.seen || 0) + (inc.seen || 0);
          cur.correct = (cur.correct || 0) + (inc.correct || 0);
          cur.incorrect = (cur.incorrect || 0) + (inc.incorrect || 0);
          // Days: union
          const daySet = new Set([...(cur.days || []), ...(inc.days || [])]);
          cur.days = [...daySet].sort();
        }
      }
      saveSRS(merged);
    }

    renderLevelGrids();
    const count = Object.keys(incoming).length;
    alert(`Progress imported: ${count} card entries ${choice ? 'replaced' : 'merged'}.`);
  };
  reader.readAsText(file);
}

function cardKey(word, dir) {
  if (word.rank) return `r${word.rank}_${dir}`;
  return word.en.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_') + '_' + dir;
}

function getCardData(data, word, dir) {
  const key = cardKey(word, dir);
  if (!data[key]) data[key] = {
    phase: 'new',            // 'new' | 'learning' | 'review' | 'relearning'
    learningStep: 0,         // index into LEARNING_STEPS or LAPSE_STEPS
    interval: 0,             // days (for review scheduling)
    easeFactor: STARTING_EASE,
    nextReview: 0,           // timestamp
    lapseCount: 0,           // times a review card was failed
    leech: false,            // true if card has lapsed >= LEECH_THRESHOLD times
    graduated: false,        // true once first graduation (triggers gold animation)
    lastReview: 0,           // timestamp of most recent review
    seen: 0,
    correct: 0,
    incorrect: 0,
    days: []
  };
  const cd = data[key];
  // Ensure all fields exist
  if (cd.phase === undefined) cd.phase = 'new';
  if (cd.learningStep === undefined) cd.learningStep = 0;
  if (cd.lapseCount === undefined) cd.lapseCount = 0;
  if (cd.leech === undefined) cd.leech = false;
  if (cd.graduated === undefined) cd.graduated = false;
  if (cd.lastReview === undefined) cd.lastReview = 0;
  if (cd.seen === undefined) cd.seen = 0;
  if (cd.correct === undefined) cd.correct = 0;
  if (cd.incorrect === undefined) cd.incorrect = 0;
  if (cd.days === undefined) cd.days = [];
  return cd;
}
