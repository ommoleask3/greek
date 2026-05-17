// ═══════════════════════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════════════════════
function startSession() {
  document.getElementById('session-end').classList.remove('active');
  showMain();
  buildQueue();

  if (queue.length === 0 && delayedQueue.length === 0) {
    document.getElementById('queue-counts').textContent = 'Δεν υπάρχουν κάρτες — επέστρεψε αργότερα!';
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
  if (WORDS.length === 0) {
    queue = [];
    delayedQueue = [];
    return;
  }

  const srs = loadSRS();
  const now = Date.now();
  const dirs = sessionMode === 'both' ? ['en', 'gr'] : [sessionMode];
  const due = [],
    fresh = [];

  const wordsInRange =
    sessionRankMin !== null ? WORDS.filter((w) => w.rank >= sessionRankMin && w.rank <= sessionRankMax) : WORDS;

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
  // Log cards that are review phase but NOT due (to see what the tile might be counting)
  const notYetDue = [];
  for (const word of sorted) {
    for (const dir of dirs) {
      const cd = getCardData(srs, word, dir);
      if (cd.phase === 'review' && cd.nextReview > now) {
        notYetDue.push({
          key: `r${word.rank}_${dir}`,
          nextReview: cd.nextReview,
          dueIn: ((cd.nextReview - now) / 3600000).toFixed(1) + 'h',
        });
      }
    }
  }

  if (sessionReadonly) {
    // Custom range: sort by nextReview ascending (most overdue first, new cards last)
    fresh.sort((a, b) => {
      const cdA = getCardData(srs, a.word, a.dir);
      const cdB = getCardData(srs, b.word, b.dir);
      const nrA = cdA.phase === 'new' ? Infinity : cdA.nextReview;
      const nrB = cdB.phase === 'new' ? Infinity : cdB.nextReview;
      return nrA - nrB;
    });
    queue = fresh;
  } else {
    // Session = all due cards + new cards to fill up to 20
    const newCount = Math.max(0, 20 - due.length);
    const newCards = fresh.slice(0, newCount);
    // Anki-style interleave: proportionally mix due and new cards
    // so learning cards have time to become re-due between new cards
    queue = interleave(due, newCards);
  }
  delayedQueue = [];

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

// Anki Intersperser: proportionally distribute shorter array into longer one
// e.g. 3 due + 17 new → due cards spaced evenly among new cards
function interleave(a, b) {
  if (a.length === 0) return [...b];
  if (b.length === 0) return [...a];
  // Ensure 'longer' is the bigger array
  let longer, shorter;
  if (a.length >= b.length) {
    longer = a;
    shorter = b;
  } else {
    longer = b;
    shorter = a;
  }
  const result = [];
  const ratio = (longer.length + 1) / (shorter.length + 1);
  let li = 0,
    si = 0,
    acc = 0;
  while (li < longer.length || si < shorter.length) {
    acc += 1;
    if (si < shorter.length && acc >= ratio) {
      result.push(shorter[si++]);
      acc -= ratio;
    } else if (li < longer.length) {
      result.push(longer[li++]);
    } else {
      result.push(shorter[si++]);
    }
  }
  return result;
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
// Anki-style 3-tier priority:
//   1. Intraday learning cards that are due NOW
//   2. Main queue (new + review cards, interleaved)
//   3. Learning cards within learn-ahead window (show early, never wait)
// ═══════════════════════════════════════════════════════════════════════════════
function nextCard(animate) {
  // Clear any waiting timer
  if (waitingTimer) {
    clearInterval(waitingTimer);
    waitingTimer = null;
  }

  const now = Date.now();
  const learnAheadCutoff = now + LEARN_AHEAD_SECS * 1000;

  // Helper: check if a delayed queue entry is the same card we just showed
  const isSameCard = (entry) =>
    current && entry.card.word === current.word && entry.card.dir === current.dir;

  // --- Tier 1: learning card that is due now (skip same-card if alternatives exist) ---
  let readyIdx = -1;
  let fallbackIdx = -1;
  let earliestTime = Infinity;
  for (let i = 0; i < delayedQueue.length; i++) {
    if (delayedQueue[i].dueTime <= now) {
      if (!isSameCard(delayedQueue[i])) {
        readyIdx = i;
        break;
      } else if (fallbackIdx < 0) {
        fallbackIdx = i; // same card, use only if no alternative
      }
    }
    if (delayedQueue[i].dueTime < earliestTime) {
      earliestTime = delayedQueue[i].dueTime;
    }
  }
  // Use same card only if it's the sole option (no main queue, no other delayed cards)
  if (readyIdx < 0 && fallbackIdx >= 0 && queue.length === 0 && delayedQueue.length <= 1) {
    readyIdx = fallbackIdx;
  }

  let next;
  if (readyIdx >= 0) {
    next = delayedQueue.splice(readyIdx, 1)[0].card;

    // --- Tier 2: main queue (new / review) ---
  } else if (queue.length > 0) {
    next = queue.shift();

    // --- Tier 3: learn-ahead — show earliest learning card early, no timer ---
  } else if (delayedQueue.length > 0) {
    // Find the card with the earliest due time within learn-ahead window
    // Prefer a different card than the one just shown
    let bestIdx = -1;
    let bestTime = Infinity;
    let sameBestIdx = -1;
    let sameBestTime = Infinity;
    for (let i = 0; i < delayedQueue.length; i++) {
      if (delayedQueue[i].dueTime < bestTime && !isSameCard(delayedQueue[i])) {
        bestTime = delayedQueue[i].dueTime;
        bestIdx = i;
      }
      if (delayedQueue[i].dueTime < sameBestTime) {
        sameBestTime = delayedQueue[i].dueTime;
        sameBestIdx = i;
      }
    }
    // Use a different card if available within learn-ahead, else fall back to same card
    if (bestIdx >= 0 && bestTime <= learnAheadCutoff) {
      next = delayedQueue.splice(bestIdx, 1)[0].card;
    } else if (sameBestIdx >= 0 && sameBestTime <= learnAheadCutoff) {
      next = delayedQueue.splice(sameBestIdx, 1)[0].card;
    } else {
      // All delayed cards are beyond 20-min learn-ahead — session complete
      showEnd();
      return;
    }
  } else {
    // Nothing left at all
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
      cd.days.push(now); // timestamps for FSRS migration readiness
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
  if (!word.rank) {
    badge.textContent = '';
    return;
  }
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
    const elapsed = cd.lastReview > 0 ? Math.max(cd.interval, (Date.now() - cd.lastReview) / 86400000) : cd.interval;

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

  document.getElementById('btn-row').classList.remove('visible');

  // Show sentence flow
  if (answering.word.sentence) {
    const sgr = document.getElementById('sentence-gr');
    sgr.textContent = answering.word.sentence;

    requestAnimationFrame(() => {
      sgr.classList.add('visible');
    });
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
    delayedQueue.push({ card: answering, dueTime: cd.nextReview });
  } else if (choice === 'good') {
    const nextStep = cd.learningStep + 1;
    if (nextStep < LEARNING_STEPS.length) {
      // Advance to next learning step
      cd.phase = 'learning';
      cd.learningStep = nextStep;
      cd.nextReview = Date.now() + LEARNING_STEPS[nextStep] * 1000;
      delayedQueue.push({ card: answering, dueTime: cd.nextReview });
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
    cd.easeFactor = clampEase(cd.easeFactor - 0.2);
    cd.lapseCount++;
    cd.interval = Math.max(1, Math.floor(cd.interval * LAPSE_NEW_INTERVAL));
    cd.phase = 'relearning';
    cd.learningStep = 0;
    cd.nextReview = now + LAPSE_STEPS[0] * 1000;
    delayedQueue.push({ card: answering, dueTime: cd.nextReview });

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
    const newInt = clampInterval(
      fuzzInterval(Math.max(cd.interval + 1, Math.round((cd.interval + delay / 2) * cd.easeFactor))),
    );
    cd.interval = newInt;
    cd.nextReview = now + cd.interval * 86400000;
  } else if (choice === 'easy') {
    cd.easeFactor = clampEase(cd.easeFactor + 0.15);
    const newInt = clampInterval(
      fuzzInterval(Math.max(cd.interval + 1, Math.round((cd.interval + delay) * cd.easeFactor * EASY_BONUS))),
    );
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
    delayedQueue.push({ card: answering, dueTime: cd.nextReview });
  } else if (choice === 'good') {
    const nextStep = cd.learningStep + 1;
    if (nextStep < LAPSE_STEPS.length) {
      cd.learningStep = nextStep;
      cd.nextReview = Date.now() + LAPSE_STEPS[nextStep] * 1000;
      delayedQueue.push({ card: answering, dueTime: cd.nextReview });
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
    case 'question':
      flipCard();
      break;
    case 'answer-wrong':
      advanceFromAnswer();
      break;
    case 'sentence':
      advanceFromSentence();
      break;
    case 'translation':
      advanceFromTranslation();
      break;
    case 'no-sentence':
      nextCard(true);
      break;
  }
}

function advanceFromAnswer() {
  if (!current) return;
  const sgr = document.getElementById('sentence-gr');
  if (current.word.sentence) {
    sgr.textContent = current.word.sentence;
    requestAnimationFrame(() => {
      sgr.classList.add('visible');
    });
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
    requestAnimationFrame(() => {
      sen.classList.add('visible');
    });
    cardState = 'translation';
  } else {
    nextCard(true);
  }
}

function advanceFromTranslation() {
  nextCard(true);
}
