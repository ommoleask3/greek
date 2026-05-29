// =============================================================================
// AI EXAM -- static badge construction exercises (no API)
// =============================================================================

// -- Question history persistence ---------------------------------------------
const AI_HISTORY_MAX = 500;

function getAiHistory() {
  try {
    return JSON.parse(localStorage.getItem(AI_HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveAiHistoryEntry(entry) {
  const history = getAiHistory();
  history.push(entry);
  while (history.length > AI_HISTORY_MAX) history.shift();
  localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(history));
}

// -- Entry points -------------------------------------------------------------
function startAiExamFromLevels() {
  const from = parseInt(document.getElementById('range-from').value, 10) || 1;
  const to = parseInt(document.getElementById('range-to').value, 10) || 100;
  const rankMin = Math.min(from, to);
  const rankMax = Math.max(from, to);
  const questions = AI_EXAM_DATA.filter((q) => q.rank >= rankMin && q.rank <= rankMax);
  if (questions.length === 0) {
    showSnackbar(gt('Δεν υπάρχουν ερωτήσεις για αυτό το εύρος', 'No questions for this range'));
    return;
  }
  aiExamFromPokedex = false;
  showAiExamSetup(questions);
}

function startAiExamFromPokedex() {
  if (pdexFiltered.length === 0) return;
  const pageStart = pdexPerPage > 0 ? pdexPage * pdexPerPage : 0;
  const pageEnd =
    pdexPerPage > 0 ? Math.min(pageStart + pdexPerPage, pdexFiltered.length) : pdexFiltered.length;
  const pageSize = pageEnd - pageStart;
  if (pageSize === 0) return;

  const fromVal = parseInt(document.getElementById('pdex-row-from').value, 10) || 1;
  const toVal = parseInt(document.getElementById('pdex-row-to').value, 10) || pageSize;
  const from = Math.max(1, Math.min(fromVal, pageSize));
  const to = Math.max(from, Math.min(toVal, pageSize));
  const selectedWords = pdexFiltered.slice(pageStart + from - 1, pageStart + to).map((r) => r.word);
  if (selectedWords.length === 0) return;

  const selectedRanks = new Set(selectedWords.map((w) => w.rank).filter(Boolean));
  const questions = AI_EXAM_DATA.filter((q) => selectedRanks.has(q.rank));
  if (questions.length === 0) {
    showSnackbar(gt('Δεν υπάρχουν ερωτήσεις για αυτές τις λέξεις', 'No questions for these words'));
    return;
  }
  aiExamFromPokedex = true;
  showAiExamSetup(questions);
}

// -- Setup screen -------------------------------------------------------------
let aiExamPool = []; // all available questions for this session

function showAiExamSetup(questions) {
  aiExamPool = questions;
  aiExamQueue = [];
  aiExamCurrent = null;
  aiExamCorrect = 0;
  aiExamTotal = 0;
  aiExamAnswered = false;

  showView('ai-exam-view');
  document.getElementById('ai-exam-setup').style.display = 'flex';
  document.getElementById('ai-exam-question').style.display = 'none';

  const desc = document.getElementById('ai-exam-desc');
  desc.textContent = `${questions.length} ${gt('ερωτήσεις διαθέσιμες', 'questions available')}`;
  document.getElementById('ai-exam-key-status').textContent = '';
}

// -- Start exam ---------------------------------------------------------------
function aiExamStart() {
  if (aiExamPool.length === 0) return;

  const shuffled = [...aiExamPool];
  shuffle(shuffled);
  aiExamQueue = shuffled.slice(0, Math.min(aiExamSessionSize, shuffled.length));
  aiExamCorrect = 0;
  aiExamTotal = 0;

  document.getElementById('ai-exam-setup').style.display = 'none';
  document.getElementById('ai-exam-question').style.display = 'flex';

  // Restore action buttons (may have been replaced by results screen)
  const actionsEl = document.querySelector('#ai-exam-question .ai-construct-actions');
  actionsEl.innerHTML = `
    <button class="conj-submit secondary" onclick="aiConstructUndo()">${gt('Αναίρεση', 'Undo')}</button>
    <button class="conj-submit" onclick="aiConstructSubmit()">${gt('Έλεγξε', 'Check')}</button>
  `;

  aiExamNextQuestion();
}

// -- Next question ------------------------------------------------------------
function aiExamNextQuestion() {
  aiExamAnswered = false;
  document.getElementById('ai-exam-feedback').innerHTML = '';
  document.getElementById('ai-exam-feedback').className = 'conj-feedback';
  document.getElementById('ai-exam-expected').textContent = '';
  const oldNext = document.querySelector('#ai-exam-question .ai-next-btn');
  if (oldNext) oldNext.remove();

  if (aiExamQueue.length === 0) {
    showAiExamEnd();
    return;
  }

  aiExamCurrent = aiExamQueue.shift();
  aiExamTotal++;

  document.getElementById('ai-exam-progress').textContent =
    `${aiExamTotal}/${aiExamTotal + aiExamQueue.length}`;

  renderConstructQuestion();
}

// -- Badge text helper (strip punctuation + lowercase for hint-free display) --
function badgeText(word) {
  return word.replace(/[.,;:!?·«»""''()]/g, '').toLowerCase();
}

// -- Construction mode --------------------------------------------------------
let constructBuilt = [];
let constructAllBadges = [];

function renderConstructQuestion() {
  constructBuilt = [];

  const correctWords = aiExamCurrent.greekWords;
  const distractors = aiExamCurrent.distractors || [];

  constructAllBadges = correctWords.map((w, i) => ({
    text: w,
    isTarget: true,
    targetIndex: i,
  }));
  for (const d of distractors) {
    constructAllBadges.push({ text: d, isTarget: false, targetIndex: -1 });
  }
  shuffle(constructAllBadges);

  document.getElementById('ai-construct-prompt').textContent = aiExamCurrent.english;

  renderConstructBadges();
  renderConstructBuilt();
}

function renderConstructBadges() {
  const container = document.getElementById('ai-construct-badges');
  container.innerHTML = '';
  constructAllBadges.forEach((badge, i) => {
    const el = document.createElement('span');
    el.className = 'ai-badge' + (constructBuilt.includes(i) ? ' used' : '');
    el.textContent = badgeText(badge.text);
    el.onclick = () => aiConstructSelect(i);
    container.appendChild(el);
  });
}

function renderConstructBuilt() {
  const container = document.getElementById('ai-construct-built');
  container.innerHTML = '';
  if (constructBuilt.length === 0) {
    container.innerHTML =
      '<span style="color:#4a5170;font-size:0.8rem;">' +
      gt('Πάτησε λέξεις για να φτιάξεις την πρόταση...', 'Tap words to build the sentence...') +
      '</span>';
    return;
  }
  constructBuilt.forEach((badgeIdx, pos) => {
    const el = document.createElement('span');
    el.className = 'ai-badge placed';
    el.textContent = badgeText(constructAllBadges[badgeIdx].text);
    el.onclick = () => aiConstructRemove(pos);
    container.appendChild(el);
  });
}

function aiConstructSelect(badgeIdx) {
  if (aiExamAnswered) return;
  if (constructBuilt.includes(badgeIdx)) return;
  constructBuilt.push(badgeIdx);
  renderConstructBadges();
  renderConstructBuilt();
}

function aiConstructUndo() {
  if (aiExamAnswered) return;
  if (constructBuilt.length === 0) return;
  constructBuilt.pop();
  renderConstructBadges();
  renderConstructBuilt();
}

function aiConstructRemove(pos) {
  if (aiExamAnswered) return;
  constructBuilt.splice(pos, 1);
  renderConstructBadges();
  renderConstructBuilt();
}

function aiConstructSubmit() {
  if (aiExamAnswered) return;
  if (constructBuilt.length === 0) return;

  aiExamAnswered = true;

  const userWords = constructBuilt.map((i) => constructAllBadges[i].text);
  const correctWords = aiExamCurrent.greekWords;

  const clean = (s) => normalizeGreek(s.replace(/[.,;:!?·«»""''()]/g, '')).replace(/\u03C2/g, '\u03C3');
  const normUser = userWords.map((w) => clean(w));
  const normCorrect = correctWords.map((w) => clean(w));
  const isCorrect =
    normUser.length === normCorrect.length && normUser.every((w, i) => w === normCorrect[i]);

  if (isCorrect) aiExamCorrect++;

  const feedbackEl = document.getElementById('ai-exam-feedback');
  const expectedEl = document.getElementById('ai-exam-expected');

  if (isCorrect) {
    feedbackEl.textContent = gt('Σωστά!', 'Correct!');
    feedbackEl.className = 'conj-feedback correct';
  } else {
    feedbackEl.textContent = gt('Λάθος', 'Wrong');
    feedbackEl.className = 'conj-feedback wrong';
  }

  expectedEl.textContent = `${gt('Σωστή απάντηση:', 'Correct answer:')} ${correctWords.join(' ')}`;

  // Color badges
  const builtContainer = document.getElementById('ai-construct-built');
  const badges = builtContainer.querySelectorAll('.ai-badge');
  badges.forEach((el, i) => {
    if (i < correctWords.length && clean(userWords[i]) === clean(correctWords[i])) {
      el.classList.add('correct-badge');
    } else {
      el.classList.add('wrong-badge');
    }
    el.classList.remove('placed');
  });

  // TTS: play the correct Greek sentence
  speakGreek(correctWords.join(' '));

  // Mobile: show "Next" button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'conj-submit ai-next-btn';
  nextBtn.textContent = gt('Συνέχεια', 'Next');
  nextBtn.onclick = () => aiExamNextQuestion();
  expectedEl.after(nextBtn);

  // Save to history
  saveAiHistoryEntry({
    timestamp: Date.now(),
    mode: 'construct',
    question: { english: aiExamCurrent.english, greekWords: correctWords },
    userAnswer: userWords,
    correct: isCorrect,
  });
}

// -- Results ------------------------------------------------------------------
function showAiExamEnd() {
  const pct = aiExamTotal > 0 ? Math.round((aiExamCorrect / aiExamTotal) * 100) : 0;

  const prompt = document.getElementById('ai-construct-prompt');
  prompt.innerHTML = `
    <div class="conj-end-title">${gt('Αποτελέσματα', 'Results')}</div>
    <div class="conj-end-score">${aiExamCorrect}/${aiExamTotal}</div>
    <div class="conj-end-pct">${pct}%</div>
  `;

  document.getElementById('ai-construct-built').innerHTML = '';
  document.getElementById('ai-construct-badges').innerHTML = '';

  const actionsEl = document.querySelector('#ai-exam-question .ai-construct-actions');
  actionsEl.innerHTML = `
    <button class="conj-submit" onclick="aiExamStart()">${gt('Ξανά', 'Again')}</button>
    <button class="conj-submit secondary" onclick="aiExamBack()">${gt('Πίσω', 'Back')}</button>
  `;

  document.getElementById('ai-exam-feedback').innerHTML = '';
  document.getElementById('ai-exam-feedback').className = 'conj-feedback';
  document.getElementById('ai-exam-expected').textContent = '';
  document.getElementById('ai-exam-progress').textContent = '';
}

// -- Navigation ---------------------------------------------------------------
function aiExamBack() {
  if (aiExamFromPokedex) {
    aiExamFromPokedex = false;
    reopenPokedex();
  } else {
    showLevelSelect();
  }
}
