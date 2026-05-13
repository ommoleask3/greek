// ═══════════════════════════════════════════════════════════════════════════════
// KEYBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // Only act when main-view is visible
    if (!document.getElementById('main-view').classList.contains('active')) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      replayAudio();
      return;
    }

    // Answer buttons: 1=Again, 2=Hard, 3=Good, 4=Easy
    if (cardState === 'answer') {
      if (e.key === '1') { e.preventDefault(); answer('again'); return; }
      if (e.key === '2') { e.preventDefault(); answer('hard'); return; }
      if (e.key === '3') { e.preventDefault(); answer('good'); return; }
      if (e.key === '4') { e.preventDefault(); answer('easy'); return; }
    }

    if (e.key === ' ') {
      e.preventDefault();
      switch (cardState) {
        case 'question':      flipCard(); break;
        case 'answer-wrong':  advanceFromAnswer(); break;
        case 'sentence':      advanceFromSentence(); break;
        case 'translation':   advanceFromTranslation(); break;
        case 'no-sentence':   nextCard(true); break;
      }
    }
  });
}
