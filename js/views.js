// ═══════════════════════════════════════════════════════════════════════════════
// VIEW MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
function showView(id) {
  [
    'import-view',
    'home-view',
    'level-view',
    'main-view',
    'session-end',
    'grammar-menu-view',
    'grammar-list-view',
    'grammar-lesson-view',
    'conjugation-view',
    'exam-view',
    'pokedex-view',
    'ai-exam-view',
  ].forEach((v) => {
    document.getElementById(v).classList.toggle('active', v === id);
  });
}

function showImport() {
  showView('import-view');
}

function splashDepart(callback) {
  callback();
}
function splashArrive() {
  showView('home-view');
}

async function showLevelSelect() {
  sessionThematic = null;
  // Reload words if needed
  if (WORDS.length === 0) {
    try {
      WORDS = await dbGetAll('words');
    } catch {}
  }
  renderLevelGrids();
  showView('level-view');
}

function showMain() {
  showView('main-view');
}
