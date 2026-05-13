// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT
// ═══════════════════════════════════════════════════════════════════════════════
function setStatus(msg, cls) {
  const el = document.getElementById('import-status');
  if (typeof msg === 'string') {
    el.textContent = msg;
  } else {
    el.innerHTML = '';
    el.appendChild(msg);
  }
  el.className = 'import-status' + (cls ? ' ' + cls : '');
}

async function processApkg(file) {
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  setStatus(spinner);
  document.getElementById('detected-fields').style.display = 'none';

  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js');

    setStatus('Unzipping…');
    let ab = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(ab);
    ab = null; // free RAM

    const dbEntry = zip.file('collection.anki21') || zip.file('collection.anki2');
    if (!dbEntry) throw new Error('No collection database found in .apkg file.');

    setStatus('Reading database…');
    const dbBytes = await dbEntry.async('uint8array');

    const SQL = await initSqlJs({
      locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
    });
    const db = new SQL.Database(dbBytes);

    setStatus('Extracting cards…');
    const { words, detectedFields, allFieldNames } = extractWords(db);
    db.close();
    console.log('All model field names:', allFieldNames);

    if (words.length === 0) throw new Error('No usable EN↔GR pairs found.');

    // Show detected fields summary
    showDetectedFields(detectedFields);

    // Save words to IndexedDB
    setStatus(`Saving ${words.length} words…`);
    await dbClearStore('words');
    await dbPutBatch('words', words);
    WORDS = words;

    // Extract audio from ZIP
    if (detectedFields.wordAudio || detectedFields.sentenceAudio) {
      await extractAudio(zip, words);
    }

    setStatus(`✓ Imported ${words.length} word pairs`, 'success');
    setTimeout(() => showLevelSelect(), 800);

  } catch (err) {
    setStatus('Error: ' + err.message, 'error');
    console.error(err);
  }
}

async function extractAudio(zip, words) {
  // Build media filename map
  const mediaEntry = zip.file('media');
  if (!mediaEntry) return;

  let mediaMap = {};
  try {
    const mediaJson = await mediaEntry.async('string');
    const raw = JSON.parse(mediaJson); // { "0": "filename.mp3", ... }
    // invert: filename -> zip entry name (which is the index number)
    for (const [idx, fname] of Object.entries(raw)) {
      mediaMap[fname] = idx;
    }
  } catch { return; }

  // Collect unique audio filenames
  const audioFiles = new Set();
  for (const w of words) {
    if (w.wordAudio) audioFiles.add(w.wordAudio);
    if (w.sentenceAudio) audioFiles.add(w.sentenceAudio);
  }

  if (audioFiles.size === 0) return;

  const fileList = [...audioFiles];
  const total = fileList.length;
  let done = 0;
  let skipped = 0;
  const BATCH = 100;

  await dbClearStore('audio');

  for (let i = 0; i < fileList.length; i += BATCH) {
    const batch = fileList.slice(i, i + BATCH);
    const entries = [];

    for (const fname of batch) {
      const zipIdx = mediaMap[fname];
      if (zipIdx === undefined) { skipped++; continue; }
      const entry = zip.file(zipIdx);
      if (!entry) { skipped++; continue; }
      try {
        const buf = await entry.async('arraybuffer');
        entries.push({ key: fname, value: buf });
        done++;
      } catch { skipped++; }
    }

    if (entries.length > 0) {
      await dbPutBatch('audio', entries);
    }

    setStatus(`Extracting audio (${done}/${total})…`);
    await new Promise(r => setTimeout(r, 0)); // yield to event loop
  }

  if (skipped > 0) {
    setStatus(`✓ Audio: ${done} files saved, ${skipped} missing`);
  }
}

function extractWords(db) {
  const colRes = db.exec("SELECT models FROM col LIMIT 1");
  if (!colRes.length) return { words: [], detectedFields: {}, allFieldNames: [] };

  const models = JSON.parse(colRes[0].values[0][0]);
  const modelFields = {};
  const allFieldNames = [];
  for (const mid in models) {
    const names = models[mid].flds.map(f => f.name);
    modelFields[mid] = names.map(n => n.toLowerCase());
    allFieldNames.push(...names);
  }

  const notesRes = db.exec("SELECT mid, flds FROM notes");
  if (!notesRes.length) return { words: [], detectedFields: {}, allFieldNames };

  const words = [];
  const seen = new Set();
  const detectedFields = { rank: false, sentence: false, sentenceEn: false, wordAudio: false, sentenceAudio: false };

  let autoRank = 1;

  let debugLogged = false;
  for (const [mid, flds] of notesRes[0].values) {
    const fields = flds.split('\x1f');
    const names = modelFields[mid] || [];

    const enIdx = findFieldIndex(names, fields, 'en');
    const grIdx = findFieldIndex(names, fields, 'gr');

    // Debug: log field mapping for first note only
    if (!debugLogged) {
      debugLogged = true;
      const rankIdx2 = findRankIndex(names, fields);
      const sentIdx2 = findSentenceIndex(names, fields);
      const sentEnIdx2 = findSentenceEnIndex(names, fields);
      const audioIdx2 = findAudioIndex(names, fields, 'audio');
      const audio2Idx2 = findAudioIndex(names, fields, 'audio2');
      console.log('Field names:', names);
      console.log('Field values (first note):', fields);
      console.log('Mapped fields:', {
        en: `[${enIdx}] ${names[enIdx]}`,
        gr: `[${grIdx}] ${names[grIdx]}`,
        rank: `[${rankIdx2}] ${names[rankIdx2]}`,
        sentence: `[${sentIdx2}] ${names[sentIdx2]}`,
        sentenceEn: `[${sentEnIdx2}] ${names[sentEnIdx2]}`,
        audio: `[${audioIdx2}] ${names[audioIdx2]}`,
        audio2: `[${audio2Idx2}] ${names[audio2Idx2]}`,
      });
    }

    if (enIdx === -1 || grIdx === -1 || enIdx === grIdx) continue;

    let en = stripHtml(stripSound(fields[enIdx])).trim();
    let gr = stripHtml(stripSound(fields[grIdx])).trim();
    if (!en || !gr) continue;

    const key = en.toLowerCase() + '|' + gr.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // Extract rank
    let rank = autoRank++;
    const rankIdx = findRankIndex(names, fields);
    if (rankIdx !== -1) {
      const rv = parseInt(stripHtml(fields[rankIdx]).trim(), 10);
      if (!isNaN(rv) && rv > 0) { rank = rv; detectedFields.rank = true; }
    }

    // Extract sentence
    let sentence = '';
    let sentenceEn = '';
    const sentIdx = findSentenceIndex(names, fields);
    if (sentIdx !== -1) {
      sentence = stripHtml(stripSound(fields[sentIdx])).trim();
      detectedFields.sentence = true;
    }
    const sentEnIdx = findSentenceEnIndex(names, fields);
    if (sentEnIdx !== -1) {
      sentenceEn = stripHtml(stripSound(fields[sentEnIdx])).trim();
      detectedFields.sentenceEn = true;
    }

    // Extract audio filenames — check dedicated Audio/Audio2 fields first, then fallback to sound tags in word/sentence fields
    let wordAudio = '';
    let sentenceAudio = '';

    const audioIdx = findAudioIndex(names, fields, 'audio');
    const audio2Idx = findAudioIndex(names, fields, 'audio2');

    if (audioIdx !== -1) {
      wordAudio = extractSoundTag(fields[audioIdx]) || fields[audioIdx].trim();
    }
    if (audio2Idx !== -1) {
      sentenceAudio = extractSoundTag(fields[audio2Idx]) || fields[audio2Idx].trim();
    }

    // Fallback: sound tags embedded in word/sentence fields
    if (!wordAudio) wordAudio = extractSoundTag(fields[grIdx]) || extractSoundTag(fields[enIdx]) || '';
    if (!sentenceAudio && sentIdx !== -1) sentenceAudio = extractSoundTag(fields[sentIdx]) || '';

    if (wordAudio) detectedFields.wordAudio = true;
    if (sentenceAudio) detectedFields.sentenceAudio = true;

    words.push({ en, gr, rank, sentence, sentenceEn, wordAudio, sentenceAudio });
  }

  // Sort by rank for consistent ordering
  words.sort((a, b) => a.rank - b.rank);

  return { words, detectedFields, allFieldNames };
}

function findFieldIndex(names, values, lang) {
  // Words to exclude: fields that are clearly example/sentence/audio, not the main word field
  const excludeWords = ['example', 'sentence', 'context', 'usage', 'audio'];
  const isExcluded = n => excludeWords.some(w => n.includes(w));

  const enHints = ['english meaning', 'english word', 'english', 'meaning', 'translation', 'en', 'front', 'word'];
  const grHints = ['greek word', 'greek', 'gr', 'back', 'target', 'ελληνικά'];
  const hints = lang === 'en' ? enHints : grHints;

  for (const hint of hints) {
    const i = names.findIndex(n => n.includes(hint) && !isExcluded(n.replace(hint, '')));
    if (i !== -1 && i < values.length) return i;
  }
  // Script-based fallback
  if (lang === 'gr') {
    return values.findIndex(v => /[\u0370-\u03FF\u1F00-\u1FFF]/.test(stripHtml(v)));
  } else {
    return values.findIndex(v => v && /^[A-Za-z\s\-\/,.']+$/.test(stripHtml(v).trim()) && stripHtml(v).trim().length > 0);
  }
}

function findRankIndex(names, values) {
  // Exact name "Rank" first, then broader hints
  const hints = ['rank', 'frequency', 'freq', 'position', 'order'];
  for (const hint of hints) {
    const i = names.findIndex(n => n === hint || n.startsWith(hint));
    if (i !== -1 && i < values.length) return i;
  }
  // Field whose stripped value is purely numeric
  return values.findIndex(v => /^\d+$/.test(stripHtml(v).trim()));
}

function findSentenceIndex(names, values) {
  // Look for Greek example: "Greek Example", "Greek Sentence", "Example", "Sentence" — but NOT "English *"
  const hints = ['greek example', 'greek sentence', 'example sentence', 'sentence gr', 'example gr'];
  for (const hint of hints) {
    const i = names.findIndex(n => n.includes(hint));
    if (i !== -1 && i < values.length && values[i]) return i;
  }
  // Broader: any field with 'example' or 'sentence' that doesn't start with 'english' or 'audio'
  const broad = ['example', 'sentence', 'context', 'usage'];
  for (const hint of broad) {
    const i = names.findIndex(n => n.includes(hint) && !n.startsWith('english') && !n.startsWith('audio') && !n.includes('audio'));
    if (i !== -1 && i < values.length && values[i]) return i;
  }
  return -1;
}

function findSentenceEnIndex(names, values) {
  // "English Example", "English Sentence", "Sentence Translation", "Example Translation"
  const hints = ['english example', 'english sentence', 'sentence translation', 'example translation', 'sentence en', 'example en'];
  for (const hint of hints) {
    const i = names.findIndex(n => n.includes(hint));
    if (i !== -1 && i < values.length && values[i]) return i;
  }
  return -1;
}

function findAudioIndex(names, values, audioHint) {
  // Find an audio field by name hint (e.g. 'audio', 'audio2')
  const i = names.findIndex(n => n === audioHint);
  if (i !== -1 && i < values.length && values[i]) return i;
  // Partial match
  const j = names.findIndex(n => n.includes(audioHint));
  if (j !== -1 && j < values.length && values[j]) return j;
  return -1;
}

function stripHtml(str) {
  if (!str) return '';
  const tmp = document.createElement('textarea');
  tmp.innerHTML = str.replace(/<[^>]*>/g, '');
  return tmp.value.trim();
}

function stripSound(str) {
  if (!str) return '';
  return str.replace(/\[sound:[^\]]+\]/g, '');
}

function extractSoundTag(str) {
  if (!str) return '';
  const m = str.match(/\[sound:([^\]]+)\]/);
  return m ? m[1] : '';
}

function showDetectedFields(df) {
  const el = document.getElementById('detected-fields');
  const lines = [
    `Rank/frequency: <span class="${df.rank ? 'found' : 'missing'}">${df.rank ? '✓ found' : '✗ not found'}</span>`,
    `Example sentence: <span class="${df.sentence ? 'found' : 'missing'}">${df.sentence ? '✓ found' : '✗ not found'}</span>`,
    `Sentence translation: <span class="${df.sentenceEn ? 'found' : 'missing'}">${df.sentenceEn ? '✓ found' : '✗ not found'}</span>`,
    `Word audio: <span class="${df.wordAudio ? 'found' : 'missing'}">${df.wordAudio ? '✓ found' : '✗ not found'}</span>`,
    `Sentence audio: <span class="${df.sentenceAudio ? 'found' : 'missing'}">${df.sentenceAudio ? '✓ found' : '✗ not found'}</span>`,
  ];
  el.innerHTML = '<strong>Detected fields:</strong><br>' + lines.join('<br>');
  el.style.display = 'block';
}

async function useBuiltinWords() {
  WORDS = BUILTIN_WORDS.map((w, i) => ({ ...w, rank: i + 1, sentence: '', sentenceEn: '', wordAudio: '', sentenceAudio: '' }));
  await dbClearStore('words');
  await dbPutBatch('words', WORDS);
  showLevelSelect();
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load: ' + src));
    document.head.appendChild(s);
  });
}
