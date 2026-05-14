// ═══════════════════════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════════════════════
function startSession() {
  document.getElementById('session-end').classList.remove('active');
  showMain();
  buildQueue();

  if (queue.length === 0 && delayedQueue.length === 0) {
    document.getElementById('progress-label').textContent = 'Δεν υπάρχουν κάρτες — επέστρεψε αργότερα!';
    document.getElementById('front-word').textContent = '';
    document.getElementById('front-lang').textContent = '';
    cardState = 'loading';
    return;
  }

  // Show/hide keyboard hint
  if (!prefs.firstCardSeen) {
    document.getElementById('kbd-hint').style.display = 'block';
  } else {
    document.getElementById('kbd-hint').style.display = 'none';
  }

  nextCard();
}

function buildQueue() {
  if (WORDS.length === 0) { queue = []; delayedQueue = []; return; }

  const srs = loadSRS();
  const now = Date.now();
  const dirs = sessionMode === 'both' ? ['en','gr'] : [sessionMode];
  const due = [], fresh = [];

  const wordsInRange = sessionRankMin !== null
    ? WORDS.filter(w => w.rank >= sessionRankMin && w.rank <= sessionRankMax)
    : WORDS;

  const sorted = [...wordsInRange].sort((a, b) => (a.rank || 0) - (b.rank || 0));

  for (const word of sorted) {
    for (const dir of dirs) {
      const cd = getCardData(srs, word, dir);
      const card = { word, dir };

      if (sessionReadonly) {
        // Custom range: include every card regardless of due date
        fresh.push(card);
      } else if (cd.phase === 'new') {
        fresh.push(card);
      } else if ((cd.phase === 'learning' || cd.phase === 'relearning') && cd.nextReview <= now) {
        due.push(card);
      } else if (cd.phase === 'review' && cd.nextReview <= now) {
        due.push(card);
      }
    }
  }

  shuffle(due);

  if (sessionReadonly) {
    // Custom range: all cards in range, shuffled
    shuffle(fresh);
    queue = fresh;
  } else {
    // Session = all due cards + new cards to fill up to 20
    const newCount = Math.max(0, 20 - due.length);
    queue = [...due, ...fresh.slice(0, newCount)];
  }
  delayedQueue = [];

  sessionTotal = queue.length;
  sessionDone = 0;
  sessionCorrect = 0;
  sessionWrong = 0;
  sessionGraduated = 0;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERVAL MATH (Anki SM-2)
// ═══════════════════════════════════════════════════════════════════════════════
function fuzzInterval(interval) {
  if (interval < 3) return interval;
  const fuzz = Math.round(interval * 0.05);
  return interval + Math.floor(Math.random() * (fuzz * 2 + 1)) - fuzz;
}

function clampInterval(days) {
  return Math.min(MAX_INTERVAL, Math.max(1, days));
}

function clampEase(ease) {
  return Math.min(4.0, Math.max(MINIMUM_EASE, ease));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function formatSeconds(secs) {
  if (secs < 60) return '< 1m';
  if (secs < 3600) return Math.round(secs / 60) + 'm';
  return Math.round(secs / 3600) + 'h';
}

function formatInterval(days) {
  if (days < 1) return '< 1d';
  if (days === 1) return '1d';
  if (days < 7) return days + 'd';
  if (days < 30) return (days / 7).toFixed(1).replace(/\.0$/, '') + 'w';
  if (days < 365) return (days / 30).toFixed(1).replace(/\.0$/, '') + 'mo';
  return (days / 365).toFixed(1).replace(/\.0$/, '') + 'y';
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEXT CARD
// ═══════════════════════════════════════════════════════════════════════════════
function nextCard(animate) {
  // Clear any waiting timer
  if (waitingTimer) { clearInterval(waitingTimer); waitingTimer = null; }

  // Check delayed queue for cards that are due now
  const now = Date.now();
  let readyIdx = -1;
  let earliestTime = Infinity;
  for (let i = 0; i < delayedQueue.length; i++) {
    if (delayedQueue[i].dueTime <= now) {
      readyIdx = i;
      break;
    }
    if (delayedQueue[i].dueTime < earliestTime) {
      earliestTime = delayedQueue[i].dueTime;
    }
  }

  let next;
  if (readyIdx >= 0) {
    // A delayed card is ready
    next = delayedQueue.splice(readyIdx, 1)[0].card;
  } else if (queue.length > 0) {
    // Pull from main queue
    next = queue.shift();
  } else if (delayedQueue.length > 0 && shouldWaitForDelayed(now)) {
    // "Again" cards skip the timer — show them immediately
    const againIdx = delayedQueue.findIndex(e => e.wasAgain);
    if (againIdx >= 0) {
      next = delayedQueue.splice(againIdx, 1)[0].card;
    } else {
      // Wait for non-again cards due within 60s
      showWaitingState(earliestTime);
      return;
    }
  } else {
    // Session complete
    showEnd();
    return;
  }

  cardState = 'loading';
  stopAudio();

  const doSwap = () => {
    current = next;
    loadCardContent(current);
    updateProgress();
    currentAudioFile = current.word.wordAudio || null;
    sentenceAudioFile = current.word.sentenceAudio || null;
  };

  const doReady = () => {
    cardState = 'question';
    if (!sessionReadonly) {
      const srs = loadSRS();
      const cd = getCardData(srs, current.word, current.dir);
      cd.seen = (cd.seen || 0) + 1;
      const now = Date.now();
      cd.lastReview = now;
      cd.days.push(now);  // timestamps for FSRS migration readiness
      saveSRS(srs);
    }
    if (current.dir === 'gr') {
      playAudio(current.word.wordAudio, current.word.gr);
    }
  };

  if (animate) {
    doPageTurn(doSwap, doReady);
  } else {
    const card = document.getElementById('card');
    card.classList.remove('flipped', 'complete-glow', 'flying');
    document.getElementById('btn-row').classList.remove('visible');
    resetSentence();
    doSwap();
    doReady();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WAITING LOGIC
// ═══════════════════════════════════════════════════════════════════════════════
function shouldWaitForDelayed(now) {
  // Wait if any delayed card was an "again" or is due within 60s
  for (const entry of delayedQueue) {
    if (entry.wasAgain || entry.dueTime - now <= 60000) return true;
  }
  return false;
}

function showWaitingState(nextDueTime) {
  cardState = 'waiting';
  const card = document.getElementById('card');
  card.classList.remove('flipped', 'complete-glow', 'flying');
  document.getElementById('btn-row').classList.remove('visible');
  document.getElementById('card-hint').style.display = 'none';

  const frontWord = document.getElementById('front-word');
  document.getElementById('front-lang').textContent = '';
  document.getElementById('card-type-badge').textContent = '';

  function updateCountdown() {
    const remaining = Math.max(0, nextDueTime - Date.now());
    if (remaining <= 0) {
      clearInterval(waitingTimer);
      waitingTimer = null;
      nextCard(false);
      return;
    }
    const secs = Math.ceil(remaining / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    frontWord.textContent = `Επόμενη κάρτα σε ${m}:${s.toString().padStart(2, '0')}`;
  }

  updateCountdown();
  waitingTimer = setInterval(updateCountdown, 1000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARD CONTENT
// ═══════════════════════════════════════════════════════════════════════════════
function loadCardContent(c) {
  const isEnGr = c.dir === 'en';
  const card = document.getElementById('card');
  card.classList.remove('flipped', 'complete-glow', 'flying');
  document.getElementById('btn-row').classList.remove('visible');
  document.getElementById('front-lang').textContent = isEnGr ? 'English' : 'Eλληνικά';
  document.getElementById('front-word').textContent = isEnGr ? c.word.en : c.word.gr;
  document.getElementById('back-lang').textContent = isEnGr ? 'Eλληνικά' : 'English';
  document.getElementById('back-word').textContent = isEnGr ? c.word.gr : c.word.en;
  resetSentence();
  updateFreqBadge(c.word);

  // Phase badge
  const badge = document.getElementById('card-type-badge');
  const srs = loadSRS();
  const cd = getCardData(srs, c.word, c.dir);
  switch (cd.phase) {
    case 'new':
      badge.textContent = 'New';
      badge.className = 'card-type-badge new-card';
      break;
    case 'learning':
      badge.textContent = 'Learning';
      badge.className = 'card-type-badge learning-card';
      break;
    case 'review':
      badge.textContent = cd.leech ? 'Leech' : 'Review';
      badge.className = cd.leech ? 'card-type-badge leech-card' : 'card-type-badge review-card';
      break;
    case 'relearning':
      badge.textContent = cd.leech ? 'Leech' : 'Relearn';
      badge.className = cd.leech ? 'card-type-badge leech-card' : 'card-type-badge relearning-card';
      break;
  }
}

function resetSentence() {
  const sgr = document.getElementById('sentence-gr');
  const sen = document.getElementById('sentence-en');
  sgr.classList.remove('visible');
  sen.classList.remove('visible');
  sgr.textContent = '';
  sen.textContent = '';
}

function updateFreqBadge(word) {
  const badge = document.getElementById('freq-badge');
  if (!word.rank) { badge.textContent = ''; return; }
  const rank = word.rank;
  let color;
  if (rank <= 100) color = '#f5c518';
  else if (rank <= 500) color = '#a0a0b0';
  else if (rank <= 1000) color = '#cd7f32';
  else color = '#4a5170';
  badge.textContent = `#${rank}`;
  badge.style.color = color;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLIP & INTERVAL HINTS
// ═══════════════════════════════════════════════════════════════════════════════
function flipCard() {
  if (cardState !== 'question' || !current) return;
  document.getElementById('card').classList.add('flipped');
  document.getElementById('btn-row').classList.add('visible');
  cardState = 'answer';

  // Dismiss keyboard hint on first flip
  if (!prefs.firstCardSeen) {
    prefs.firstCardSeen = true;
    savePrefs();
    document.getElementById('kbd-hint').style.display = 'none';
  }

  // EN→GR: play word audio on flip (TTS fallback for words without audio files)
  if (current.dir === 'en') {
    playAudio(current.word.wordAudio, current.word.gr);
    currentAudioFile = current.word.wordAudio;
  }

  updateIntervalHints();
}

function updateIntervalHints() {
  if (!current) return;
  const srs = loadSRS();
  const cd = getCardData(srs, current.word, current.dir);
  const btnHard = document.getElementById('btn-hard');
  const btnAgain = document.getElementById('btn-again');
  const btnGood = document.getElementById('btn-good');
  const btnEasy = document.getElementById('btn-easy');

  if (sessionReadonly) {
    // Custom range: only Λάθος (Incorrect) / Σωστό (Correct)
    btnHard.style.display = 'none';
    btnEasy.style.display = 'none';
    btnAgain.childNodes[0].textContent = 'Λάθος';
    btnGood.childNodes[0].textContent = 'Σωστό';
    document.getElementById('hint-again').textContent = '';
    document.getElementById('hint-good').textContent = '';
    return;
  }

  // Restore normal session buttons
  btnEasy.style.display = '';
  btnAgain.childNodes[0].textContent = 'Ξανά';
  btnGood.childNodes[0].textContent = 'Καλά';

  if (cd.phase === 'new' || cd.phase === 'learning') {
    // Learning: show Again/Good/Easy (no Hard)
    btnHard.style.display = 'none';

    // Again → step 0
    document.getElementById('hint-again').textContent = formatSeconds(LEARNING_STEPS[0]);

    // Good → next step, or graduate
    const nextStep = cd.learningStep + 1;
    if (nextStep < LEARNING_STEPS.length) {
      document.getElementById('hint-good').textContent = formatSeconds(LEARNING_STEPS[nextStep]);
    } else {
      document.getElementById('hint-good').textContent = formatInterval(GRADUATING_INTERVAL);
    }

    // Easy → graduate immediately
    document.getElementById('hint-easy').textContent = formatInterval(EASY_INTERVAL);
    document.getElementById('hint-hard').textContent = '';

  } else if (cd.phase === 'relearning') {
    // Relearning: Again/Good/Easy (no Hard)
    btnHard.style.display = 'none';

    document.getElementById('hint-again').textContent = formatSeconds(LAPSE_STEPS[0]);

    const nextStep = cd.learningStep + 1;
    if (nextStep < LAPSE_STEPS.length) {
      document.getElementById('hint-good').textContent = formatSeconds(LAPSE_STEPS[nextStep]);
    } else {
      // Graduate back to review with the lapse interval
      const lapseInt = cd.interval || 1;
      document.getElementById('hint-good').textContent = formatInterval(lapseInt);
    }

    document.getElementById('hint-easy').textContent = formatInterval(Math.max(cd.interval || 1, EASY_INTERVAL));
    document.getElementById('hint-hard').textContent = '';

  } else {
    // Review: show all 4 buttons
    btnHard.style.display = '';

    // Late review bonus: use elapsed time as base if overdue
    const elapsed = cd.lastReview > 0
      ? Math.max(cd.interval, (Date.now() - cd.lastReview) / 86400000)
      : cd.interval;

    // Again
    document.getElementById('hint-again').textContent = formatSeconds(LAPSE_STEPS[0]);

    // Hard
    const hardInt = clampInterval(Math.max(cd.interval + 1, Math.round(elapsed * HARD_MULTIPLIER)));
    document.getElementById('hint-hard').textContent = formatInterval(hardInt);

    // Good
    const goodInt = clampInterval(Math.max(cd.interval + 1, Math.round(elapsed * cd.easeFactor)));
    document.getElementById('hint-good').textContent = formatInterval(goodInt);

    // Easy
    const easyInt = clampInterval(Math.max(cd.interval + 1, Math.round(elapsed * cd.easeFactor * EASY_BONUS)));
    document.getElementById('hint-easy').textContent = formatInterval(easyInt);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANSWER (Anki SM-2)
// ═══════════════════════════════════════════════════════════════════════════════
function answer(choice) {
  // choice: 'again' | 'hard' | 'good' | 'easy'
  if (cardState !== 'answer' || !current) return;

  const answering = current;
  let justGraduated = false;
  const isCorrect = choice !== 'again';

  if (isCorrect) sessionCorrect++;
  else sessionWrong++;

  const dqBefore = delayedQueue.length;

  if (!sessionReadonly) {
    const srs = loadSRS();
    const cd = getCardData(srs, answering.word, answering.dir);

    if (isCorrect) cd.correct = (cd.correct || 0) + 1;
    else cd.incorrect = (cd.incorrect || 0) + 1;

    if (cd.phase === 'new' || cd.phase === 'learning') {
      // ─── LEARNING / NEW ───
      justGraduated = handleLearning(cd, choice, answering);

    } else if (cd.phase === 'review') {
      // ─── REVIEW ───
      handleReview(cd, choice, answering);

    } else if (cd.phase === 'relearning') {
      // ─── RELEARNING ───
      handleRelearning(cd, choice, answering);
    }

    saveSRS(srs);
  } else {
    // Custom range (readonly): no SRS writes
    if (choice === 'again') queue.push(answering);
  }

  // Card is "done" if it was NOT re-queued
  const requeued = delayedQueue.length > dqBefore || (sessionReadonly && choice === 'again');
  if (!requeued) sessionDone++;

  document.getElementById('btn-row').classList.remove('visible');

  // Show sentence flow
  if (answering.word.sentence) {
    const sgr = document.getElementById('sentence-gr');
    sgr.textContent = answering.word.sentence;

    requestAnimationFrame(() => { sgr.classList.add('visible'); });
    playAudio(answering.word.sentenceAudio, answering.word.sentence);
    currentAudioFile = answering.word.wordAudio || null;
    sentenceAudioFile = answering.word.sentenceAudio;
    cardState = 'sentence';
  } else {
    cardState = 'no-sentence';
  }

}

// ─── Learning / New card handler ─────────────────────────────────────────────
function handleLearning(cd, choice, answering) {
  let justGraduated = false;

  if (choice === 'again') {
    // Reset to step 0, re-queue after LEARNING_STEPS[0]
    cd.phase = 'learning';
    cd.learningStep = 0;
    cd.nextReview = Date.now() + LEARNING_STEPS[0] * 1000;
    delayedQueue.push({ card: answering, dueTime: cd.nextReview, wasAgain: choice === 'again' });

  } else if (choice === 'good') {
    const nextStep = cd.learningStep + 1;
    if (nextStep < LEARNING_STEPS.length) {
      // Advance to next learning step
      cd.phase = 'learning';
      cd.learningStep = nextStep;
      cd.nextReview = Date.now() + LEARNING_STEPS[nextStep] * 1000;
      delayedQueue.push({ card: answering, dueTime: cd.nextReview, wasAgain: choice === 'again' });
    } else {
      // Graduate: learning → review
      cd.phase = 'review';
      cd.interval = GRADUATING_INTERVAL;
      cd.nextReview = Date.now() + cd.interval * 86400000;
      cd.learningStep = 0;
      if (!cd.graduated) {
        cd.graduated = true;
        justGraduated = true;
        sessionGraduated++;
      }
    }

  } else if (choice === 'easy') {
    // Graduate immediately with easy interval
    cd.phase = 'review';
    cd.interval = EASY_INTERVAL;
    cd.easeFactor = clampEase(cd.easeFactor + 0.15);
    cd.nextReview = Date.now() + cd.interval * 86400000;
    cd.learningStep = 0;
    if (!cd.graduated) {
      cd.graduated = true;
      justGraduated = true;
      sessionGraduated++;
    }
  }

  return justGraduated;
}

// ─── Review card handler ─────────────────────────────────────────────────────
function handleReview(cd, choice, answering) {
  // Anki SM-2 late review bonus:
  //   delay = days overdue (0 if answered on time)
  //   Hard:  no bonus            → interval * HARD_MULTIPLIER
  //   Good:  half the delay      → (interval + delay/2) * easeFactor
  //   Easy:  full delay           → (interval + delay) * easeFactor * EASY_BONUS
  const now = Date.now();
  const actualElapsed = cd.lastReview > 0 ? (now - cd.lastReview) / 86400000 : cd.interval;
  const delay = Math.max(0, actualElapsed - cd.interval);

  if (choice === 'again') {
    // Lapse: enter relearning
    cd.easeFactor = clampEase(cd.easeFactor - 0.20);
    cd.lapseCount++;
    cd.interval = Math.max(1, Math.floor(cd.interval * LAPSE_NEW_INTERVAL));
    cd.phase = 'relearning';
    cd.learningStep = 0;
    cd.nextReview = now + LAPSE_STEPS[0] * 1000;
    delayedQueue.push({ card: answering, dueTime: cd.nextReview, wasAgain: true });

    // Leech detection
    if (cd.lapseCount >= LEECH_THRESHOLD && cd.lapseCount % 4 === 0) {
      cd.leech = true;
    }

  } else if (choice === 'hard') {
    cd.easeFactor = clampEase(cd.easeFactor - 0.15);
    const newInt = clampInterval(fuzzInterval(Math.max(cd.interval + 1, Math.round(cd.interval * HARD_MULTIPLIER))));
    cd.interval = newInt;
    cd.nextReview = now + cd.interval * 86400000;

  } else if (choice === 'good') {
    const newInt = clampInterval(fuzzInterval(Math.max(cd.interval + 1, Math.round((cd.interval + delay / 2) * cd.easeFactor))));
    cd.interval = newInt;
    cd.nextReview = now + cd.interval * 86400000;

  } else if (choice === 'easy') {
    cd.easeFactor = clampEase(cd.easeFactor + 0.15);
    const newInt = clampInterval(fuzzInterval(Math.max(cd.interval + 1, Math.round((cd.interval + delay) * cd.easeFactor * EASY_BONUS))));
    cd.interval = newInt;
    cd.nextReview = now + cd.interval * 86400000;
  }
}

// ─── Relearning card handler ─────────────────────────────────────────────────
function handleRelearning(cd, choice, answering) {
  if (choice === 'again') {
    // Reset to step 0
    cd.learningStep = 0;
    cd.nextReview = Date.now() + LAPSE_STEPS[0] * 1000;
    delayedQueue.push({ card: answering, dueTime: cd.nextReview, wasAgain: choice === 'again' });

  } else if (choice === 'good') {
    const nextStep = cd.learningStep + 1;
    if (nextStep < LAPSE_STEPS.length) {
      cd.learningStep = nextStep;
      cd.nextReview = Date.now() + LAPSE_STEPS[nextStep] * 1000;
      delayedQueue.push({ card: answering, dueTime: cd.nextReview, wasAgain: choice === 'again' });
    } else {
      // Graduate back to review with the lapse interval
      cd.phase = 'review';
      cd.nextReview = Date.now() + cd.interval * 86400000;
      cd.learningStep = 0;
    }

  } else if (choice === 'easy') {
    // Graduate immediately back to review
    cd.phase = 'review';
    cd.interval = Math.max(cd.interval, EASY_INTERVAL);
    cd.nextReview = Date.now() + cd.interval * 86400000;
    cd.learningStep = 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARD INTERACTION FLOW
// ═══════════════════════════════════════════════════════════════════════════════
function onCardClick() {
  switch (cardState) {
    case 'question':      flipCard(); break;
    case 'answer-wrong':  advanceFromAnswer(); break;
    case 'sentence':      advanceFromSentence(); break;
    case 'translation':   advanceFromTranslation(); break;
    case 'no-sentence':   nextCard(true); break;
  }
}

function advanceFromAnswer() {
  if (!current) return;
  const sgr = document.getElementById('sentence-gr');
  if (current.word.sentence) {
    sgr.textContent = current.word.sentence;
    requestAnimationFrame(() => { sgr.classList.add('visible'); });
    playAudio(current.word.sentenceAudio, current.word.sentence);
    sentenceAudioFile = current.word.sentenceAudio;
    cardState = 'sentence';
  } else {
    nextCard(true);
  }
}

function advanceFromSentence() {
  if (!current) return;
  if (current.word.sentenceEn) {
    const sen = document.getElementById('sentence-en');
    sen.textContent = current.word.sentenceEn;
    requestAnimationFrame(() => { sen.classList.add('visible'); });
    cardState = 'translation';
  } else {
    nextCard(true);
  }
}

function advanceFromTranslation() {
  nextCard(true);
}
