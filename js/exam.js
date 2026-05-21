// ═══════════════════════════════════════════════════════════════════════════════
// EXAM ENGINE — fill-the-gap typing exercise
// ═══════════════════════════════════════════════════════════════════════════════
let examQueue = [];
let examCurrent = null;
let examCorrect = 0;
let examTotal = 0;
let examSize = 20;
let examAnswered = false;
let examCurrentLevel = 1;

function startExam(level) {
  const data = EXAM_DATA[level];
  if (!data || data.length === 0) return;

  examCurrentLevel = level;
  examCorrect = 0;
  examTotal = 0;
  examAnswered = false;
  buildExamQueue(data);
  showView('exam-view');
  nextExamCard();
}

function buildExamQueue(levelData) {
  // Flatten all cards from all words in this level
  const allCards = [];
  for (const entry of levelData) {
    for (const card of entry.cards) {
      const blanked = blankWordInSentence(card.sentence, entry.gr);
      if (!blanked) continue;
      allCards.push({
        gr: entry.gr,
        en: entry.en,
        sentence: card.sentence,
        sentenceEn: card.sentenceEn,
        before: blanked.before,
        after: blanked.after,
        blankWord: blanked.word,
      });
    }
  }
  shuffle(allCards);
  examQueue = allCards.slice(0, examSize);
}

// Find the target Greek word in the sentence and split around it
function blankWordInSentence(sentence, greekWord) {
  // Normalise for comparison
  const normTarget = normalizeGreek(greekWord);
  // Split into tokens preserving separators
  const parts = sentence.split(/(\s+)/);
  for (let i = 0; i < parts.length; i++) {
    const token = parts[i];
    // Strip leading/trailing punctuation for comparison
    const stripped = token.replace(/^[^α-ωά-ώϊϋΐΰ]+|[^α-ωά-ώϊϋΐΰ]+$/gi, '');
    if (normalizeGreek(stripped) === normTarget) {
      const before = parts.slice(0, i).join('');
      const after = parts.slice(i + 1).join('');
      return { before, word: token, after };
    }
  }
  // Try case-insensitive partial: word might have accent differences
  for (let i = 0; i < parts.length; i++) {
    const token = parts[i];
    const stripped = token.replace(/^[^α-ωά-ώϊϋΐΰ]+|[^α-ωά-ώϊϋΐΰ]+$/gi, '');
    if (stripped.length > 0 && normalizeGreek(stripped).includes(normTarget)) {
      const before = parts.slice(0, i).join('');
      const after = parts.slice(i + 1).join('');
      return { before, word: token, after };
    }
  }
  return null;
}

function nextExamCard() {
  examAnswered = false;
  if (examQueue.length === 0) {
    showExamEnd();
    return;
  }
  examCurrent = examQueue.shift();
  examTotal++;
  renderExamCard();
}

function renderExamCard() {
  const sentenceEl = document.getElementById('exam-sentence');
  const inputEl = document.getElementById('exam-input');
  const feedbackEl = document.getElementById('exam-feedback');
  const hintEl = document.getElementById('exam-hint');
  feedbackEl.innerHTML = '';
  feedbackEl.className = 'conj-feedback';

  // Progress
  document.getElementById('exam-progress').textContent =
    `${examTotal}/${Math.min(examSize, examTotal + examQueue.length)}`;

  // Sentence with blank
  sentenceEl.innerHTML =
    `<span class="exam-before">${examCurrent.before}</span>` +
    `<span class="exam-blank"></span>` +
    `<span class="exam-after">${examCurrent.after}</span>`;

  // English hint
  hintEl.textContent = examCurrent.en;

  // Clear translation from previous card
  const transEl = document.getElementById('exam-translation');
  if (transEl) {
    transEl.textContent = '';
    transEl.classList.remove('visible');
  }

  // Input
  inputEl.innerHTML = `<input type="text" class="exam-text-input" id="exam-text-field"
            placeholder="Γράψε τη λέξη..."
            autocomplete="off" autocorrect="off" spellcheck="false">
     <button class="conj-submit" onclick="submitExam()">Έλεγξε</button>`;

  const field = document.getElementById('exam-text-field');
  field.focus();
  field.onkeydown = (e) => {
    if (e.key === 'Enter') submitExam();
  };
}

function submitExam() {
  if (examAnswered) return;
  const field = document.getElementById('exam-text-field');
  if (!field) return;
  const userAnswer = field.value.trim();
  if (!userAnswer) return;

  examAnswered = true;
  // Strip punctuation, normalize, and collapse ς→σ so either sigma form is accepted
  const sigmaFold = (s) => normalizeGreek(s).replace(/ς/g, 'σ');
  const normUser = sigmaFold(userAnswer.replace(/[^α-ωά-ώϊϋΐΰς]/gi, ''));
  const normCorrect = sigmaFold(examCurrent.gr);
  const isCorrect = normUser === normCorrect;

  if (isCorrect) examCorrect++;

  const feedbackEl = document.getElementById('exam-feedback');
  const sentenceEl = document.getElementById('exam-sentence');
  field.disabled = true;

  // Reveal the full sentence with word highlighted
  sentenceEl.innerHTML =
    `<span class="exam-before">${examCurrent.before}</span>` +
    `<span class="exam-revealed ${isCorrect ? 'correct' : 'wrong'}">${examCurrent.blankWord}</span>` +
    `<span class="exam-after">${examCurrent.after}</span>`;

  if (isCorrect) {
    field.classList.add('correct');
    feedbackEl.textContent = gt('Σωστά!', 'Correct!');
    feedbackEl.className = 'conj-feedback correct';
  } else {
    field.classList.add('wrong');
    feedbackEl.innerHTML = `${gt('Λάθος — ', 'Wrong — ')}<strong>${examCurrent.gr}</strong>`;
    feedbackEl.className = 'conj-feedback wrong';
  }

  // Store English translation but don't show yet — revealed on Space press
  const transEl = document.getElementById('exam-translation');
  if (transEl) {
    transEl.textContent = examCurrent.sentenceEn;
    transEl.classList.remove('visible');
  }

  // Play TTS with full sentence
  speakGreek(examCurrent.sentence);
}

function showExamEnd() {
  const sentenceEl = document.getElementById('exam-sentence');
  const inputEl = document.getElementById('exam-input');
  const feedbackEl = document.getElementById('exam-feedback');
  const hintEl = document.getElementById('exam-hint');
  const transEl = document.getElementById('exam-translation');
  const pct = examSize > 0 ? Math.round((examCorrect / examTotal) * 100) : 0;

  sentenceEl.innerHTML = `
    <div class="conj-end-title">${gt('Αποτελέσματα', 'Results')}</div>
    <div class="conj-end-score">${examCorrect}/${examTotal}</div>
    <div class="conj-end-pct">${pct}%</div>
  `;
  hintEl.textContent = '';
  if (transEl) transEl.textContent = '';
  inputEl.innerHTML = `
    <button class="conj-submit" onclick="startExam(examCurrentLevel)">${gt('Ξανά', 'Again')}</button>
    <button class="conj-submit secondary" onclick="showLevelSelect()">${gt('Πίσω', 'Back')}</button>
  `;
  feedbackEl.innerHTML = '';
  feedbackEl.className = 'conj-feedback';
  document.getElementById('exam-progress').textContent = '';
}
