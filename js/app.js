// ═══════════════════════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════════════════════
async function init() {
  loadPrefs();
  setupKeyboardShortcuts();
  setupVolumeSlider();

  // Check if we have words in IndexedDB
  try {
    const words = await dbGetAll('words');
    if (words && words.length > 0) {
      WORDS = words;
      updateGreekOnlyUI();
      showHome();
      return;
    }
  } catch {}

  // Fallback: check old localStorage key
  try {
    const raw = localStorage.getItem('greek_words_v1');
    if (raw) {
      const oldWords = JSON.parse(raw);
      if (oldWords && oldWords.length > 0) {
        // Assign rank if missing
        oldWords.forEach((w, i) => { if (!w.rank) w.rank = i + 1; });
        WORDS = oldWords;
        await dbPutBatch('words', WORDS);
        updateGreekOnlyUI();
        showHome();
        return;
      }
    }
  } catch {}

  showImport();
}

// Event wiring
document.getElementById('file-input').addEventListener('change', e => {
  if (e.target.files[0]) processApkg(e.target.files[0]);
});

const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) processApkg(e.dataTransfer.files[0]);
});

// Boot
init();
