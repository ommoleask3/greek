// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS & END
// ═══════════════════════════════════════════════════════════════════════════════
function updateProgress() {
  const done = sessionTotal - queue.length - 1;
  const pct = sessionTotal > 0 ? Math.max(0, (done / sessionTotal) * 100) : 0;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent =
    `${Math.max(0, done)} / ${sessionTotal} cards`;
}

function abandonSession() {
  stopAudio();
  queue = [];
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
      if (cd.nextReview <= now + 86400000) totalDue++;
    }
  }

  document.getElementById('session-stats').innerHTML =
    `Correct: <span>${sessionCorrect}</span> &nbsp;|&nbsp; Wrong: <span>${sessionWrong}</span><br>` +
    `Mastered this session: <span>${sessionMastered}</span><br>` +
    `Cards due tomorrow: <span>${totalDue}</span>`;
}
