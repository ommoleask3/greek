// ═══════════════════════════════════════════════════════════════════════════════
// CARD TRANSITION (reuses the same flip animation as answer reveal)
// ═══════════════════════════════════════════════════════════════════════════════
function doPageTurn(onMidpoint, onReady) {
  const card = document.getElementById('card');
  const HALF = 250; // ms per half — matches the 0.5s transition split in two

  // Phase 1: flip to back (0° → 180°)
  card.classList.remove('complete-glow', 'flying');
  card.classList.add('flipped');

  setTimeout(() => {
    // At 180° (back face showing): swap content and unflip
    onMidpoint();
    card.classList.remove('flipped');

    setTimeout(() => {
      if (onReady) onReady();
    }, HALF);
  }, HALF);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLETE ANIMATION
// ═══════════════════════════════════════════════════════════════════════════════
function triggerCompleteAnimation(answering, correct) {
  const card = document.getElementById('card');
  card.classList.add('complete-glow');

  setTimeout(() => {
    card.classList.add('flying');

    // Pulse bag
    setTimeout(() => {
      const bag = document.getElementById('bag-icon');
      bag.classList.add('pulse');
      setTimeout(() => bag.classList.remove('pulse'), 600);
    }, 350);
  }, 300);
}
