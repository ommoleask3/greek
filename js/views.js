// ═══════════════════════════════════════════════════════════════════════════════
// VIEW MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
function showView(id) {
  ['import-view','home-view','level-view','main-view','session-end',
   'grammar-menu-view','grammar-list-view','grammar-lesson-view','conjugation-view'].forEach(v => {
    document.getElementById(v).classList.toggle('active', v === id);
  });
}

function showImport() { showView('import-view'); }

function splashDepart(callback) {
  const canvas = document.querySelector('.splash-canvas');
  if (!canvas || canvas.classList.contains('departing')) return;

  // Start slide-out, but keep home-view visible as overlay
  canvas.classList.add('departing');

  // Show target view alongside (home-view stays active as fixed overlay)
  callback();
  // Re-add active so home-view isn't hidden mid-animation
  document.getElementById('home-view').classList.add('active');

  setTimeout(() => {
    canvas.classList.remove('departing');
    document.getElementById('home-view').classList.remove('active');
  }, 550);
}

function splashArrive() {
  const canvas = document.querySelector('.splash-canvas');
  showView('home-view');
  if (!canvas) return;
  canvas.classList.add('arriving');
  setTimeout(() => canvas.classList.remove('arriving'), 550);
}

async function showLevelSelect() {
  // Reload words if needed
  if (WORDS.length === 0) {
    try { WORDS = await dbGetAll('words'); } catch {}
  }
  renderLevelGrids();
  showView('level-view');
}

function showMain() { showView('main-view'); }
