// ═══════════════════════════════════════════════════════════════════════════════
// POKEDEX (VOCABULARY BROWSER)
// ═══════════════════════════════════════════════════════════════════════════════
let pdexData = [];
let pdexFiltered = [];
let pdexSortCol = 'rank';
let pdexSortDir = 1; // 1 = ASC, -1 = DESC, 0 = none
let pdexHeatmap = false;
let pdexDir = 'en'; // 'en' or 'gr'

const PDEX_COLUMNS = [
  { key: 'rank', label: '#', sortable: true },
  { key: 'gr', label: 'Ελληνικά', sortable: true, hasAudio: true },
  { key: 'en', label: 'English', sortable: true },
  { key: 'sentenceGr', label: 'Πρόταση GR', sortable: false, hasAudio: true, cssClass: 'pdex-sentence pdex-col-sentence-gr' },
  { key: 'sentenceEn', label: 'Πρόταση EN', sortable: false, cssClass: 'pdex-sentence pdex-col-sentence-en' },
  { key: 'seen', label: 'Seen', sortable: true },
  { key: 'ratio', label: '\u2713 / \u2717', sortable: true },
  { key: 'firstSeen', label: 'First Seen', sortable: true },
  { key: 'lastSeen', label: 'Last Seen', sortable: true },
];

// ── Entry point ──────────────────────────────────────────────────────────────
function showPokedex() {
  pdexSortCol = 'rank';
  pdexSortDir = 1;
  pdexHeatmap = false;
  document.getElementById('pdex-search').value = '';
  document.getElementById('pdex-heatmap-toggle').classList.remove('active');
  document.getElementById('pdex-table').classList.remove('heatmap-on');
  // Reset dir toggle UI
  document.getElementById('pdex-dir-en').classList.toggle('active', pdexDir === 'en');
  document.getElementById('pdex-dir-gr').classList.toggle('active', pdexDir === 'gr');
  buildPokedexData();
  showView('pokedex-view');
  renderPokedexHeader();
  applyPokedexFilter('');
  if (!('ontouchstart' in window)) {
    document.getElementById('pdex-search').focus();
  }
}

// ── Direction toggle ─────────────────────────────────────────────────────────
function setPokedexDir(dir) {
  pdexDir = dir;
  document.getElementById('pdex-dir-en').classList.toggle('active', dir === 'en');
  document.getElementById('pdex-dir-gr').classList.toggle('active', dir === 'gr');
  buildPokedexData();
  applyPokedexFilter(document.getElementById('pdex-search').value);
}

// ── Build data from WORDS + SRS ──────────────────────────────────────────────
function buildPokedexData() {
  const srs = loadSRS();
  pdexData = WORDS.map((word) => {
    const key = cardKey(word, pdexDir);
    const cd = srs[key];

    const seen = (cd && cd.seen) || 0;
    const correct = (cd && cd.correct) || 0;
    const incorrect = (cd && cd.incorrect) || 0;
    const days = (cd && cd.days) || [];
    const firstSeen = days.length > 0 ? days[0] : 0;
    const lastSeen = days.length > 0 ? days[days.length - 1] : 0;
    const total = correct + incorrect;
    const ratio = total > 0 ? correct / total : -1;

    return {
      word,
      rank: word.rank || 0,
      gr: word.gr || '',
      en: word.en || '',
      sentenceGr: word.sentence || '',
      sentenceEn: word.sentenceEn || '',
      seen,
      correct,
      incorrect,
      firstSeen,
      lastSeen,
      ratio,
      grNorm: normalizeGreek(word.gr),
      enNorm: (word.en || '').toLowerCase().trim(),
    };
  });
}

// ── Greek text normalization ─────────────────────────────────────────────────
function normalizeGreek(str) {
  if (!str) return '';
  let s = str.toLowerCase().trim();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/\u03C2/g, '\u03C3');
  return s;
}

function isGreekText(str) {
  return /[\u0370-\u03FF\u1F00-\u1FFF]/.test(str);
}

// ── Search / filter ──────────────────────────────────────────────────────────
function applyPokedexFilter(query) {
  const q = query.trim();
  if (q === '') {
    pdexFiltered = pdexData.slice();
  } else if (isGreekText(q)) {
    const norm = normalizeGreek(q);
    pdexFiltered = pdexData.filter((row) => row.grNorm.includes(norm));
  } else {
    const norm = q.toLowerCase().trim();
    pdexFiltered = pdexData.filter((row) => row.enNorm.includes(norm));
  }
  applyPokedexSort();
  renderPokedexBody();
  updatePokedexCount();
}

// ── Sorting ──────────────────────────────────────────────────────────────────
function applyPokedexSort() {
  if (!pdexSortCol || pdexSortDir === 0) return;
  const col = pdexSortCol;
  const dir = pdexSortDir;

  pdexFiltered.sort((a, b) => {
    let va = col === 'ratio' ? a.ratio : a[col];
    let vb = col === 'ratio' ? b.ratio : b[col];

    // Push nullish / unseen to bottom
    if (col === 'rank') {
      if (!va && !vb) return 0;
      if (!va) return 1;
      if (!vb) return -1;
    }
    if (col === 'firstSeen' || col === 'lastSeen') {
      if (va === 0 && vb === 0) return 0;
      if (va === 0) return 1;
      if (vb === 0) return -1;
    }
    if (col === 'ratio') {
      if (va < 0 && vb < 0) return 0;
      if (va < 0) return 1;
      if (vb < 0) return -1;
    }

    if (typeof va === 'string' && typeof vb === 'string') {
      return dir * va.localeCompare(vb, 'el');
    }
    return dir * ((va || 0) - (vb || 0));
  });
}

function cycleSort(colKey) {
  if (pdexSortCol === colKey) {
    if (pdexSortDir === 1) pdexSortDir = -1;
    else if (pdexSortDir === -1) { pdexSortDir = 0; pdexSortCol = null; }
  } else {
    pdexSortCol = colKey;
    pdexSortDir = 1;
  }
  renderPokedexHeader();
  applyPokedexSort();
  renderPokedexBody();
}

// ── Render header ────────────────────────────────────────────────────────────
function renderPokedexHeader() {
  const thead = document.getElementById('pdex-thead');
  let html = '<tr>';
  for (const col of PDEX_COLUMNS) {
    const arrow =
      pdexSortCol === col.key && pdexSortDir !== 0
        ? `<span class="pdex-sort-arrow">${pdexSortDir === 1 ? '\u25B2' : '\u25BC'}</span>`
        : '';
    const onclick = col.sortable ? ` onclick="cycleSort('${col.key}')"` : '';
    const cls = [];
    if (col.cssClass) cls.push(col.cssClass);
    if (!col.sortable) cls.push('no-sort');
    const clsAttr = cls.length ? ` class="${cls.join(' ')}"` : '';
    html += `<th${clsAttr}${onclick}>${col.label}${arrow}</th>`;
  }
  html += '</tr>';
  thead.innerHTML = html;
}

// ── Render body ──────────────────────────────────────────────────────────────
function renderPokedexBody() {
  const tbody = document.getElementById('pdex-tbody');
  const rows = pdexFiltered;
  const parts = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const trStyle = pdexHeatmap ? heatmapStyle(row.ratio) : '';
    parts.push(`<tr${trStyle}>`);

    // Rank
    parts.push(`<td>${row.rank || '---'}</td>`);

    // GR word + play
    parts.push(
      `<td><div class="pdex-cell-audio"><span>${escHtml(row.gr)}</span>` +
      `<button class="pdex-play-btn" onclick="pdexPlayWord(${i})" title="Play">&#9654;</button>` +
      `</div></td>`,
    );

    // EN word
    parts.push(`<td>${escHtml(row.en)}</td>`);

    // GR sentence + play
    parts.push(`<td class="pdex-sentence pdex-col-sentence-gr">`);
    if (row.sentenceGr) {
      parts.push(
        `<div class="pdex-cell-audio"><span>${escHtml(row.sentenceGr)}</span>` +
        `<button class="pdex-play-btn" onclick="pdexPlaySentence(${i})" title="Play">&#9654;</button>` +
        `</div>`,
      );
    }
    parts.push(`</td>`);

    // EN sentence
    parts.push(`<td class="pdex-sentence pdex-col-sentence-en">${escHtml(row.sentenceEn)}</td>`);

    // Seen
    parts.push(`<td${row.seen === 0 ? ' class="pdex-unseen"' : ''}>${row.seen || '---'}</td>`);

    // Correct / Incorrect
    if (row.seen === 0) {
      parts.push(`<td class="pdex-unseen">---</td>`);
    } else {
      parts.push(`<td>${row.correct} / ${row.incorrect}</td>`);
    }

    // First seen
    parts.push(`<td${row.firstSeen ? '' : ' class="pdex-unseen"'}>${row.firstSeen ? pdexFormatDate(row.firstSeen) : '---'}</td>`);

    // Last seen
    parts.push(`<td${row.lastSeen ? '' : ' class="pdex-unseen"'}>${row.lastSeen ? pdexFormatDate(row.lastSeen) : '---'}</td>`);

    parts.push(`</tr>`);
  }

  tbody.innerHTML = parts.join('');
}

// ── Heatmap ──────────────────────────────────────────────────────────────────
function togglePokedexHeatmap() {
  pdexHeatmap = !pdexHeatmap;
  document.getElementById('pdex-heatmap-toggle').classList.toggle('active', pdexHeatmap);
  document.getElementById('pdex-table').classList.toggle('heatmap-on', pdexHeatmap);
  renderPokedexBody();
}

function heatmapStyle(ratio) {
  if (ratio < 0) return '';
  const r = Math.round(42 - ratio * 21);
  const g = Math.round(21 + ratio * 21);
  return ` style="background:rgb(${r},${g},21)"`;
}

// ── Audio ────────────────────────────────────────────────────────────────────
function pdexPlayWord(filteredIndex) {
  const row = pdexFiltered[filteredIndex];
  if (row) playAudio(row.word.wordAudio, row.word.gr);
}

function pdexPlaySentence(filteredIndex) {
  const row = pdexFiltered[filteredIndex];
  if (row && row.word.sentence) playAudio(row.word.sentenceAudio, row.word.sentence);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pdexFormatDate(ts) {
  if (!ts) return '---';
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function updatePokedexCount() {
  const el = document.getElementById('pdex-count');
  const total = pdexData.length;
  const shown = pdexFiltered.length;
  el.textContent = shown === total ? `${total} λέξεις` : `${shown} / ${total} λέξεις`;
}

// ── Search input listener (debounced) ────────────────────────────────────────
(function () {
  let timer = null;
  document.getElementById('pdex-search').addEventListener('input', function () {
    const val = this.value;
    clearTimeout(timer);
    timer = setTimeout(() => applyPokedexFilter(val), 150);
  });
})();
