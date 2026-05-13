// ═══════════════════════════════════════════════════════════════════════════════
// GRAMMAR ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
const GRAMMAR_PROGRESS_KEY = 'greek_grammar_v1';

function loadGrammarProgress() {
  try { return JSON.parse(localStorage.getItem(GRAMMAR_PROGRESS_KEY)) || {}; }
  catch { return {}; }
}

function saveGrammarProgress(data) {
  localStorage.setItem(GRAMMAR_PROGRESS_KEY, JSON.stringify(data));
}

// ─── Localized text helper ──────────────────────────────────────────────────
function gt(gr, en) {
  return prefs.greekOnly ? gr : en;
}

// ─── Home splash ────────────────────────────────────────────────────────────
function showHome() {
  showView('home-view');
}

// ─── Grammar menu ───────────────────────────────────────────────────────────
function showGrammarMenu() {
  showView('grammar-menu-view');
}

// ─── Grammar lesson list ────────────────────────────────────────────────────
function showGrammarList() {
  renderLessonList();
  showView('grammar-list-view');
}

function renderLessonList() {
  const container = document.getElementById('grammar-list');
  const progress = loadGrammarProgress();
  container.innerHTML = '';

  GRAMMAR_LESSONS.forEach((lesson, i) => {
    const completed = progress[lesson.id]?.completed;
    const exerciseCount = lesson.sections.filter(s => s.type === 'exercise').length;
    const doneCount = progress[lesson.id]?.exercises || 0;
    const hasContent = lesson.sections.length > 0;

    const card = document.createElement('div');
    card.className = 'grammar-lesson-card' + (completed ? ' completed' : '') + (!hasContent ? ' empty' : '');
    card.onclick = () => { if (hasContent) showGrammarLesson(lesson.id); };
    card.innerHTML = `
      <div class="glc-number">${i + 1}</div>
      <div class="glc-body">
        <div class="glc-title">${prefs.greekOnly ? lesson.title : lesson.titleEn}</div>
        <div class="glc-desc">${prefs.greekOnly ? lesson.description : lesson.descriptionEn}</div>
        ${exerciseCount > 0 ? `<div class="glc-progress">${doneCount}/${exerciseCount} ${gt('ασκήσεις', 'exercises')}</div>` : ''}
      </div>
      ${!hasContent ? `<div class="glc-badge">${gt('Σύντομα', 'Coming soon')}</div>` : ''}
      ${completed ? '<div class="glc-check">✓</div>' : ''}
    `;
    container.appendChild(card);
  });
}

// ─── Individual lesson renderer ─────────────────────────────────────────────
let currentLessonId = null;

function showGrammarLesson(id) {
  currentLessonId = id;
  const lesson = GRAMMAR_LESSONS.find(l => l.id === id);
  if (!lesson) return;

  const container = document.getElementById('lesson-content');
  container.innerHTML = `<h2 class="lesson-title">${prefs.greekOnly ? lesson.title : lesson.titleEn}</h2>`;

  lesson.sections.forEach((section, i) => {
    const el = document.createElement('div');
    el.className = 'lesson-section';

    switch (section.type) {
      case 'text':
        el.className += ' lesson-text';
        el.innerHTML = prefs.greekOnly ? section.content : (section.contentEn || section.content);
        break;

      case 'table':
        el.className += ' lesson-table-wrap';
        el.innerHTML = renderGrammarTable(section);
        break;

      case 'exercise':
        el.className += ' lesson-exercise';
        el.innerHTML = renderExercise(section, i);
        break;
    }

    container.appendChild(el);
  });

  showView('grammar-lesson-view');
}

function renderGrammarTable(section) {
  const headers = section.headers.map(h => `<th>${h}</th>`).join('');
  const rows = section.rows.map(row => {
    const cells = row.map((cell, i) => `<td${i === 0 ? ' class="row-header"' : ''}>${cell}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<table class="grammar-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderExercise(section, idx) {
  const id = `exercise-${idx}`;

  if (section.kind === 'fill-blank') {
    const options = section.options.map(o =>
      `<button class="ex-option" onclick="checkFillBlank(this, '${id}', '${section.answer}')">${o}</button>`
    ).join('');
    return `
      <div class="exercise-block" id="${id}">
        <div class="ex-label">${gt('Συμπλήρωσε:', 'Fill in:')}</div>
        <div class="ex-prompt">${section.prompt}</div>
        <div class="ex-options">${options}</div>
        <div class="ex-feedback"></div>
      </div>
    `;
  }

  if (section.kind === 'multiple-choice') {
    const options = section.options.map((o, i) =>
      `<button class="ex-option" onclick="checkMC(this, '${id}', ${section.correct})">${o}</button>`
    ).join('');
    return `
      <div class="exercise-block" id="${id}">
        <div class="ex-label">${gt('Επίλεξε:', 'Choose:')}</div>
        <div class="ex-prompt">${prefs.greekOnly ? section.question : (section.questionEn || section.question)}</div>
        <div class="ex-options">${options}</div>
        <div class="ex-feedback"></div>
      </div>
    `;
  }

  return '';
}

// ─── Exercise checking ──────────────────────────────────────────────────────
function checkFillBlank(btn, exId, correctAnswer) {
  const block = document.getElementById(exId);
  if (block.classList.contains('answered')) return;
  block.classList.add('answered');

  const feedback = block.querySelector('.ex-feedback');
  const buttons = block.querySelectorAll('.ex-option');

  if (btn.textContent.trim() === correctAnswer) {
    btn.classList.add('correct');
    feedback.textContent = gt('Σωστά!', 'Correct!');
    feedback.className = 'ex-feedback correct';
    markExerciseDone();
  } else {
    btn.classList.add('wrong');
    buttons.forEach(b => { if (b.textContent.trim() === correctAnswer) b.classList.add('correct'); });
    feedback.textContent = gt('Λάθος — ', 'Wrong — ') + correctAnswer;
    feedback.className = 'ex-feedback wrong';
  }
}

function checkMC(btn, exId, correctIndex) {
  const block = document.getElementById(exId);
  if (block.classList.contains('answered')) return;
  block.classList.add('answered');

  const feedback = block.querySelector('.ex-feedback');
  const buttons = block.querySelectorAll('.ex-option');
  const clickedIndex = Array.from(buttons).indexOf(btn);

  if (clickedIndex === correctIndex) {
    btn.classList.add('correct');
    feedback.textContent = gt('Σωστά!', 'Correct!');
    feedback.className = 'ex-feedback correct';
    markExerciseDone();
  } else {
    btn.classList.add('wrong');
    buttons[correctIndex].classList.add('correct');
    feedback.textContent = gt('Λάθος — ', 'Wrong — ') + buttons[correctIndex].textContent;
    feedback.className = 'ex-feedback wrong';
  }
}

function markExerciseDone() {
  if (!currentLessonId) return;
  const progress = loadGrammarProgress();
  if (!progress[currentLessonId]) progress[currentLessonId] = { exercises: 0, completed: false };
  progress[currentLessonId].exercises++;

  const lesson = GRAMMAR_LESSONS.find(l => l.id === currentLessonId);
  const totalExercises = lesson ? lesson.sections.filter(s => s.type === 'exercise').length : 0;
  if (totalExercises > 0 && progress[currentLessonId].exercises >= totalExercises) {
    progress[currentLessonId].completed = true;
  }

  saveGrammarProgress(progress);
}

// ─── Greek-only toggle ──────────────────────────────────────────────────────
function toggleGreekOnly() {
  prefs.greekOnly = !prefs.greekOnly;
  savePrefs();
  updateGreekOnlyUI();
}

function updateGreekOnlyUI() {
  const toggle = document.getElementById('greek-only-toggle');
  if (toggle) {
    toggle.classList.toggle('active', prefs.greekOnly);
    toggle.querySelector('.toggle-label').textContent = prefs.greekOnly ? 'Ελληνικά μόνο' : 'Greek only';
  }
}

// ─── Tooltip helper for lesson content ──────────────────────────────────────
// Usage in lesson HTML: <span class="gw" data-en="want" data-info="verb, θέλω">θέλω</span>
// Tooltips are CSS-only, defined in styles.css
