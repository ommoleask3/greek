// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS & END
// ═══════════════════════════════════════════════════════════════════════════════
function updateProgress() {
  // Anki-style remaining counts: new + learning + review
  // Count new and review cards left in the main queue
  const srs = loadSRS();
  let newCount = 0, learnCount = 0, reviewCount = 0;
  for (const c of queue) {
    const cd = getCardData(srs, c.word, c.dir);
    if (cd.phase === 'new') newCount++;
    else if (cd.phase === 'learning' || cd.phase === 'relearning') learnCount++;
    else reviewCount++;
  }
  // Also count cards in the delayed queue (intraday learning)
  learnCount += delayedQueue.length;

  const el = document.getElementById('queue-counts');
  const newEl = document.getElementById('count-new');
  const learnEl = document.getElementById('count-learn');
  const reviewEl = document.getElementById('count-review');
  newEl.textContent = newCount;
  learnEl.textContent = learnCount;
  reviewEl.textContent = reviewCount;

  // Underline the current card's queue type
  newEl.classList.remove('count-current');
  learnEl.classList.remove('count-current');
  reviewEl.classList.remove('count-current');
  if (current) {
    const cd = getCardData(srs, current.word, current.dir);
    if (cd.phase === 'new') newEl.classList.add('count-current');
    else if (cd.phase === 'learning' || cd.phase === 'relearning') learnEl.classList.add('count-current');
    else reviewEl.classList.add('count-current');
  }
}

function abandonSession() {
  stopAudio();
  if (waitingTimer) { clearInterval(waitingTimer); waitingTimer = null; }
  queue = [];
  delayedQueue = [];
  showLevelSelect();
}

function showEnd() {
  stopAudio();
  showView('session-end');

  const srs = loadSRS();
  const now = Date.now();
  const dirs = sessionMode === 'both' ? ['en','gr'] : [sessionMode];
  let totalDue = 0;
  const checkWords = sessionRankMin !== null
    ? WORDS.filter(w => w.rank >= sessionRankMin && w.rank <= sessionRankMax)
    : WORDS;
  for (const word of checkWords) {
    for (const dir of dirs) {
      const cd = getCardData(srs, word, dir);
      if (cd.phase !== 'new' && cd.nextReview > now && cd.nextReview <= now + 86400000) totalDue++;
    }
  }

  const learningLeft = delayedQueue.length;
  delayedQueue = []; // clear so they get picked up next session

  let stats =
    `Correct: <span>${sessionCorrect}</span> &nbsp;|&nbsp; Wrong: <span>${sessionWrong}</span><br>` +
    `Graduated this session: <span>${sessionGraduated}</span><br>` +
    `Cards due tomorrow: <span>${totalDue}</span>`;
  if (learningLeft > 0) {
    stats += `<br>Learning (come back soon): <span>${learningLeft}</span>`;
  }
  document.getElementById('session-stats').innerHTML = stats;
}
