// ═══════════════════════════════════════════════════════════════════════════════
// VIEW MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════
function showView(id) {
  ['import-view','level-view','main-view','session-end'].forEach(v => {
    document.getElementById(v).classList.toggle('active', v === id);
  });
}

function showImport() { showView('import-view'); }

async function showLevelSelect() {
  // Reload words if needed
  if (WORDS.length === 0) {
    try { WORDS = await dbGetAll('words'); } catch {}
  }
  renderLevelGrids();
  showView('level-view');
}

function showMain() { showView('main-view'); }
