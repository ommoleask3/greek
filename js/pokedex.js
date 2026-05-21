// ═══════════════════════════════════════════════════════════════════════════════
// POKEDEX (VOCABULARY BROWSER)
// ═══════════════════════════════════════════════════════════════════════════════
let pdexData = [];
let pdexFiltered = [];
let pdexSortCol = 'rank';
let pdexSortDir = 1; // 1 = ASC, -1 = DESC, 0 = none
let pdexHeatmap = false;
let pdexDir = 'en'; // 'en' or 'gr'
let pdexPage = 0;
let pdexPerPage = 50; // 0 = show all

const PDEX_COLUMNS = [
  { key: 'rank', label: '#', sortable: true },
  { key: 'gr', label: 'Ελληνικά', sortable: true, hasAudio: true },
  { key: 'en', label: 'English', sortable: true },
  {
    key: 'sentenceGr',
    label: 'Πρόταση GR',
    sortable: false,
    hasAudio: true,
    cssClass: 'pdex-sentence pdex-col-sentence-gr',
  },
  { key: 'sentenceEn', label: 'Πρόταση EN', sortable: false, cssClass: 'pdex-sentence pdex-col-sentence-en' },
  { key: 'seen', label: 'Seen', sortable: true },
  { key: 'ratio', label: '%', sortable: true },
  { key: 'firstSeen', label: 'First Seen', sortable: true },
  { key: 'lastSeen', label: 'Last Seen', sortable: true },
  { key: 'nextDue', label: 'Next Due', sortable: true, cssClass: 'pdex-col-desktop' },
];

// ── Entry point ──────────────────────────────────────────────────────────────
function showPokedex() {
  pdexSortCol = 'rank';
  pdexSortDir = 1;
  pdexHeatmap = false;
  pdexPage = 0;
  document.getElementById('pdex-search').value = '';
  document.getElementById('pdex-search-clear').classList.add('hidden');
  document.getElementById('pdex-heatmap-toggle').classList.remove('active');
  document.getElementById('pdex-table').classList.remove('heatmap-on');
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
  pdexPage = 0;
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
    const nextDue = (cd && cd.nextReview) || 0;

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
      nextDue,
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
  renderPagination();
}

function clearPokedexSearch() {
  document.getElementById('pdex-search').value = '';
  document.getElementById('pdex-search-clear').classList.add('hidden');
  pdexPage = 0;
  applyPokedexFilter('');
  document.getElementById('pdex-search').focus();
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
    if (col === 'firstSeen' || col === 'lastSeen' || col === 'nextDue') {
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
    else if (pdexSortDir === -1) {
      pdexSortDir = 0;
      pdexSortCol = null;
    }
  } else {
    pdexSortCol = colKey;
    pdexSortDir = 1;
  }
  pdexPage = 0;
  renderPokedexHeader();
  applyPokedexSort();
  renderPokedexBody();
  renderPagination();
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
  const total = pdexFiltered.length;

  // Compute page slice
  let start = 0;
  let end = total;
  if (pdexPerPage > 0) {
    start = pdexPage * pdexPerPage;
    end = Math.min(start + pdexPerPage, total);
  }

  const parts = [];
  for (let i = start; i < end; i++) {
    const row = pdexFiltered[i];
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

    // Ratio as percentage
    if (row.ratio < 0) {
      parts.push(`<td class="pdex-unseen">---</td>`);
    } else {
      parts.push(`<td>${Math.round(row.ratio * 100)}%</td>`);
    }

    // First seen
    parts.push(
      `<td${row.firstSeen ? '' : ' class="pdex-unseen"'}>${row.firstSeen ? pdexFormatDate(row.firstSeen) : '---'}</td>`,
    );

    // Last seen
    parts.push(
      `<td${row.lastSeen ? '' : ' class="pdex-unseen"'}>${row.lastSeen ? pdexFormatDate(row.lastSeen) : '---'}</td>`,
    );

    // Next due
    parts.push(
      `<td class="pdex-col-desktop${row.nextDue ? '' : ' pdex-unseen'}">${row.nextDue ? pdexFormatDateTime(row.nextDue) : '---'}</td>`,
    );

    parts.push(`</tr>`);
  }

  tbody.innerHTML = parts.join('');

  // Scroll table to top on page change
  document.getElementById('pdex-table-wrap').scrollTop = 0;
}

// ── Pagination ───────────────────────────────────────────────────────────────
function pdexTotalPages() {
  if (pdexPerPage <= 0) return 1;
  return Math.max(1, Math.ceil(pdexFiltered.length / pdexPerPage));
}

function renderPagination() {
  const total = pdexFiltered.length;
  const pages = pdexTotalPages();
  const showAll = pdexPerPage <= 0;

  document.getElementById('pdex-prev').disabled = showAll || pdexPage <= 0;
  document.getElementById('pdex-next').disabled = showAll || pdexPage >= pages - 1;

  const info = document.getElementById('pdex-page-info');
  if (showAll || pages <= 1) {
    info.textContent = `${total} λέξεις`;
  } else {
    const start = pdexPage * pdexPerPage + 1;
    const end = Math.min((pdexPage + 1) * pdexPerPage, total);
    info.textContent = `${start}–${end} / ${total}`;
  }
}

function pdexPrevPage() {
  if (pdexPage > 0) {
    pdexPage--;
    renderPokedexBody();
    renderPagination();
  }
}

function pdexNextPage() {
  if (pdexPage < pdexTotalPages() - 1) {
    pdexPage++;
    renderPokedexBody();
    renderPagination();
  }
}

function pdexSetPerPage(val) {
  pdexPerPage = parseInt(val, 10) || 0;
  pdexPage = 0;
  renderPokedexBody();
  renderPagination();
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
  // ~26% max brightness: red rgb(66,28,28) → green rgb(28,66,28)
  const r = Math.round(66 - ratio * 38);
  const g = Math.round(28 + ratio * 38);
  return ` style="background:rgb(${r},${g},28)"`;
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

function pdexFormatDateTime(ts) {
  if (!ts) return '---';
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

function updatePokedexCount() {
  const el = document.getElementById('pdex-count');
  const total = pdexData.length;
  const shown = pdexFiltered.length;
  el.textContent = shown === total ? `${total} λέξεις` : `${shown} / ${total} λέξεις`;
}

// ── Launch custom session from pokedex ────────────────────────────────────────
function launchPokedexSession() {
  if (pdexFiltered.length === 0) return;
  // Row numbers are relative to the current page
  const pageStart = pdexPerPage > 0 ? pdexPage * pdexPerPage : 0;
  const pageEnd = pdexPerPage > 0 ? Math.min(pageStart + pdexPerPage, pdexFiltered.length) : pdexFiltered.length;
  const pageSize = pageEnd - pageStart;
  if (pageSize === 0) return;

  const fromVal = parseInt(document.getElementById('pdex-row-from').value, 10) || 1;
  const toVal = parseInt(document.getElementById('pdex-row-to').value, 10) || pageSize;
  const from = Math.max(1, Math.min(fromVal, pageSize));
  const to = Math.max(from, Math.min(toVal, pageSize));
  const words = pdexFiltered.slice(pageStart + from - 1, pageStart + to).map((r) => r.word);
  if (words.length === 0) return;

  sessionCustomWords = words;
  sessionMode = pdexDir;
  sessionRankMin = null;
  sessionRankMax = null;
  sessionReadonly = true;
  sessionFromPokedex = true;
  startSession();
}

// ── Re-open pokedex preserving filter state ──────────────────────────────────
function reopenPokedex() {
  // Rebuild data (SRS may have changed) but keep search/sort/page/heatmap
  buildPokedexData();
  showView('pokedex-view');
  // Re-apply current search filter
  applyPokedexFilter(document.getElementById('pdex-search').value);
  renderPokedexHeader();
}

// ── Search input listener (debounced) ────────────────────────────────────────
(function () {
  let timer = null;
  const input = document.getElementById('pdex-search');
  const clearBtn = document.getElementById('pdex-search-clear');
  input.addEventListener('input', function () {
    const val = this.value;
    clearBtn.classList.toggle('hidden', val.length === 0);
    clearTimeout(timer);
    pdexPage = 0;
    timer = setTimeout(() => applyPokedexFilter(val), 150);
  });
})();
