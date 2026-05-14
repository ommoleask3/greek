// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS & END
// ═══════════════════════════════════════════════════════════════════════════════
function updateProgress() {
  const pct = sessionTotal > 0 ? Math.max(0, (sessionDone / sessionTotal) * 100) : 0;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent =
    `${sessionDone} / ${sessionTotal} cards`;
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
