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

    if (e.key === ' ') {
      e.preventDefault();
      switch (cardState) {
        case 'question':      flipCard(); break;
        case 'answer':        answer(true); break;
        case 'answer-wrong':  advanceFromAnswer(); break;
        case 'sentence':      advanceFromSentence(); break;
        case 'translation':   advanceFromTranslation(); break;
        case 'no-sentence':   nextCard(true); break;
      }
    }

    if (e.key === 'Backspace') {
      if (cardState === 'answer') {
        e.preventDefault();
        answer(false);
      }
    }
  });
}
