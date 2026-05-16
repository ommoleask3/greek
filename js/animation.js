// ═══════════════════════════════════════════════════════════════════════════════
// CARD TRANSITION (reuses the same flip animation as answer reveal)
// ═══════════════════════════════════════════════════════════════════════════════
function doPageTurn(onMidpoint, onReady) {
  const card = document.getElementById('card');
  const HALF = 250; // ms per half — matches the 0.5s transition split in two

  // Phase 1: flip to back (0° → 180°)
  card.classList.add('flipped');

  setTimeout(() => {
    // At 180° (back face showing): swap content and unflip
    onMidpoint();
    // Hide back-face answer during unflip so new answer isn't briefly visible
    const backWord = document.getElementById('back-word');
    const backLang = document.getElementById('back-lang');
    const savedWord = backWord.textContent;
    const savedLang = backLang.textContent;
    backWord.textContent = '';
    backLang.textContent = '';
    card.classList.remove('flipped');

    setTimeout(() => {
      // Restore back-face content after unflip completes
      backWord.textContent = savedWord;
      backLang.textContent = savedLang;
      if (onReady) onReady();
    }, HALF);
  }, HALF);
}
