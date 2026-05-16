// ═══════════════════════════════════════════════════════════════════════════════
// CONJUGATION DRILL ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
let conjQueue = [];
let conjCurrent = null;
let conjMode = 'mc'; // 'mc' or 'typing'
let conjCorrect = 0;
let conjTotal = 0;
let conjSize = 20;
let conjAnswered = false;

function showConjugation() {
  conjCorrect = 0;
  conjTotal = 0;
  conjAnswered = false;
  buildConjQueue();
  showView('conjugation-view');
  updateConjModeUI();
  nextConjCard();
}

function buildConjQueue() {
  conjQueue = [];
  const persons = PERSONS;
  // Generate random verb+person pairs
  for (let i = 0; i < conjSize; i++) {
    const verb = VERB_TABLE[Math.floor(Math.random() * VERB_TABLE.length)];
    const person = persons[Math.floor(Math.random() * persons.length)];
    conjQueue.push({ verb, person, answer: verb.forms[person] });
  }
}

function nextConjCard() {
  conjAnswered = false;

  if (conjQueue.length === 0) {
    showConjEnd();
    return;
  }

  conjCurrent = conjQueue.shift();
  conjTotal++;
  renderConjCard();
}

function renderConjCard() {
  const card = document.getElementById('conj-card');
  const input = document.getElementById('conj-input');
  const feedback = document.getElementById('conj-feedback');
  feedback.innerHTML = '';
  feedback.className = 'conj-feedback';

  // Progress
  document.getElementById('conj-progress').textContent = `${conjTotal}/${conjSize}`;

  // Card content
  card.innerHTML = `
    <div class="conj-verb">${conjCurrent.verb.verb}</div>
    <div class="conj-verb-en">${conjCurrent.verb.en}</div>
    <div class="conj-person">${conjCurrent.person}</div>
  `;

  if (conjMode === 'typing') {
    input.innerHTML = `
      <input type="text" class="conj-text-input" id="conj-text-field"
             placeholder="${gt('Γράψε την κλίση...', 'Type the conjugation...')}"
             autocomplete="off" autocorrect="off" spellcheck="false">
      <button class="conj-submit" onclick="submitConjTyping()">${gt('Έλεγξε', 'Check')}</button>
    `;
    const field = document.getElementById('conj-text-field');
    field.focus();
    field.onkeydown = (e) => {
      if (e.key === 'Enter') submitConjTyping();
    };
  } else {
    const options = generateMCOptions(conjCurrent);
    input.innerHTML = options
      .map((o) => `<button class="conj-mc-btn" onclick="submitConjMC(this, '${escapeAttr(o)}')">${o}</button>`)
      .join('');
  }
}

function escapeAttr(s) {
  return s.replace(/'/g, "\\'");
}

function generateMCOptions(prompt) {
  const correct = prompt.answer;
  const distractors = new Set();

  // Get other forms of the same verb
  for (const person of PERSONS) {
    const form = prompt.verb.forms[person];
    if (form !== correct) distractors.add(form);
  }

  // Get same-person forms from other verbs if needed
  if (distractors.size < 3) {
    for (const v of VERB_TABLE) {
      if (v.verb !== prompt.verb.verb) {
        distractors.add(v.forms[prompt.person]);
      }
      if (distractors.size >= 5) break;
    }
  }

  // Pick 3 random distractors
  const distArr = [...distractors];
  shuffle(distArr);
  const options = [correct, ...distArr.slice(0, 3)];
  shuffle(options);
  return options;
}

// ─── Answer checking ────────────────────────────────────────────────────────
function submitConjTyping() {
  if (conjAnswered) return;
  const field = document.getElementById('conj-text-field');
  if (!field) return;
  const userAnswer = field.value.trim();
  if (!userAnswer) return;

  conjAnswered = true;
  const correct = conjCurrent.answer;
  const isCorrect = normalizeGreek(userAnswer) === normalizeGreek(correct);

  if (isCorrect) conjCorrect++;

  const feedback = document.getElementById('conj-feedback');
  field.disabled = true;

  if (isCorrect) {
    field.classList.add('correct');
    feedback.textContent = gt('Σωστά!', 'Correct!');
    feedback.className = 'conj-feedback correct';
  } else {
    field.classList.add('wrong');
    feedback.innerHTML = `${gt('Λάθος — ', 'Wrong — ')}<strong>${correct}</strong>`;
    feedback.className = 'conj-feedback wrong';
  }

  setTimeout(() => nextConjCard(), isCorrect ? 800 : 2000);
}

function submitConjMC(btn, answer) {
  if (conjAnswered) return;
  conjAnswered = true;

  const correct = conjCurrent.answer;
  const isCorrect = answer === correct;
  if (isCorrect) conjCorrect++;

  const feedback = document.getElementById('conj-feedback');
  const buttons = document.querySelectorAll('.conj-mc-btn');

  buttons.forEach((b) => {
    b.disabled = true;
    if (b.textContent === correct) b.classList.add('correct');
  });

  if (isCorrect) {
    feedback.textContent = gt('Σωστά!', 'Correct!');
    feedback.className = 'conj-feedback correct';
  } else {
    btn.classList.add('wrong');
    feedback.innerHTML = `${gt('Λάθος — ', 'Wrong — ')}<strong>${correct}</strong>`;
    feedback.className = 'conj-feedback wrong';
  }

  setTimeout(() => nextConjCard(), isCorrect ? 800 : 2000);
}

function normalizeGreek(s) {
  // Normalize unicode and lowercase for comparison
  return s.normalize('NFC').toLowerCase().trim();
}

// ─── Mode toggle ────────────────────────────────────────────────────────────
function setConjMode(mode) {
  conjMode = mode;
  updateConjModeUI();
  // Restart current card with new mode if mid-drill
  if (conjCurrent && !conjAnswered) {
    renderConjCard();
  }
}

function updateConjModeUI() {
  document.getElementById('conj-mode-typing').classList.toggle('active', conjMode === 'typing');
  document.getElementById('conj-mode-mc').classList.toggle('active', conjMode === 'mc');
}

// ─── End screen ─────────────────────────────────────────────────────────────
function showConjEnd() {
  const card = document.getElementById('conj-card');
  const input = document.getElementById('conj-input');
  const feedback = document.getElementById('conj-feedback');
  const pct = conjSize > 0 ? Math.round((conjCorrect / conjSize) * 100) : 0;

  card.innerHTML = `
    <div class="conj-end-title">${gt('Αποτελέσματα', 'Results')}</div>
    <div class="conj-end-score">${conjCorrect}/${conjSize}</div>
    <div class="conj-end-pct">${pct}%</div>
  `;
  input.innerHTML = `
    <button class="conj-submit" onclick="showConjugation()">${gt('Ξανά', 'Again')}</button>
    <button class="conj-submit secondary" onclick="showGrammarMenu()">${gt('Πίσω', 'Back')}</button>
  `;
  feedback.innerHTML = '';
  feedback.className = 'conj-feedback';
  document.getElementById('conj-progress').textContent = '';
}
