// ═══════════════════════════════════════════════════════════════════════════════
// SESSION
// ═══════════════════════════════════════════════════════════════════════════════
function startSession() {
  document.getElementById('session-end').classList.remove('active');
  showMain();
  buildQueue();

  if (queue.length === 0) {
    document.getElementById('progress-label').textContent = 'No cards due — come back later!';
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
  if (WORDS.length === 0) { queue = []; return; }

  const srs = loadSRS();
  const now = Date.now();
  const dirs = sessionMode === 'both' ? ['en','gr'] : [sessionMode];
  const due = [], fresh = [];

  const wordsInRange = sessionRankMin !== null
    ? WORDS.filter(w => w.rank >= sessionRankMin && w.rank <= sessionRankMax)
    : WORDS;

  // Sort by rank ascending for fresh cards
  const sorted = [...wordsInRange].sort((a, b) => (a.rank || 0) - (b.rank || 0));

  for (const word of sorted) {
    for (const dir of dirs) {
      const cd = getCardData(srs, word, dir);
      if (cd.nextReview <= now) {
        const card = { word, dir };
        if (cd.reps === 0) fresh.push(card);
        else due.push(card);
      }
    }
  }

  shuffle(due);
  queue = [...due, ...fresh].slice(0, 20);
  sessionTotal = queue.length;
  sessionCorrect = 0;
  sessionWrong = 0;
  sessionMastered = 0;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function nextCard(animate) {
  if (queue.length === 0) { showEnd(); return; }

  const next = queue.shift();
  cardState = 'loading';
  stopAudio();

  const doSwap = () => {
    current = next;
    loadCardContent(current);
    updateProgress();
    // cardState stays 'loading' until doPageTurn calls onReady after phase2

    // Always track audio files for current card
    currentAudioFile = current.word.wordAudio || null;
    sentenceAudioFile = current.word.sentenceAudio || null;
  };

  const doReady = () => {
    cardState = 'question';
    // Track 'seen' (not for readonly/custom-range sessions)
    if (!sessionReadonly) {
      const srs = loadSRS();
      const cd = getCardData(srs, current.word, current.dir);
      cd.seen = (cd.seen || 0) + 1;
      const today = new Date().toISOString().slice(0, 10);
      if (!cd.days.includes(today)) cd.days.push(today);
      saveSRS(srs);
    }
    // GR→EN: play word audio after card is fully visible
    if (current.dir === 'gr' && current.word.wordAudio) {
      playAudio(current.word.wordAudio);
    }
  };

  if (animate) {
    doPageTurn(doSwap, doReady);
  } else {
    // First card: just reset card state without animation
    const card = document.getElementById('card');
    card.classList.remove('flipped', 'complete-glow', 'flying');
    document.getElementById('btn-row').classList.remove('visible');
    resetSentence();
    doSwap();
    doReady();
  }
}

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

  // EN→GR: play word audio on flip
  if (current.dir === 'en' && current.word.wordAudio) {
    playAudio(current.word.wordAudio);
    currentAudioFile = current.word.wordAudio;
  }
}

function onCardClick() {
  switch (cardState) {
    case 'question':      flipCard(); break;
    case 'answer-wrong':  advanceFromAnswer(); break;
    case 'sentence':      advanceFromSentence(); break;
    case 'translation':   advanceFromTranslation(); break;
    case 'no-sentence':   nextCard(true); break;
  }
}

function answer(correct) {
  if (cardState !== 'answer' || !current) return;

  const answering = current;
  let justCompleted = false;

  if (sessionReadonly) {
    // Custom range: track session counts only, no SRS writes
    if (correct) sessionCorrect++;
    else { sessionWrong++; queue.push(answering); }
  } else {
    const srs = loadSRS();
    const cd = getCardData(srs, answering.word, answering.dir);
    const wasComplete = cd.complete;

    if (correct) {
      sessionCorrect++;
      cd.correct = (cd.correct || 0) + 1;
      cd.reps = (cd.reps || 0) + 1;
      cd.streak = (cd.streak || 0) + 1;

      // Anki SM-2: initial learning steps 1→2→3 days, then multiply by easeFactor
      if (cd.reps === 1)      { cd.interval = 1; }
      else if (cd.reps === 2) { cd.interval = 2; }
      else if (cd.reps === 3) { cd.interval = 3; }
      else {
        // Graduating review: new_interval = max(prev+1, round(prev * easeFactor))
        const next = Math.round(cd.interval * cd.easeFactor);
        cd.interval = Math.max(cd.interval + 1, next);
      }
      // Ease only increases once card has graduated (reps >= 4)
      if (cd.reps >= 4) {
        cd.easeFactor = Math.min(4.0, Math.max(1.3, (cd.easeFactor || 2.5) + 0.1));
      }

      if (cd.reps >= 4 && !wasComplete) {
        cd.complete = true;
        justCompleted = true;
        sessionMastered++;
      }
    } else {
      sessionWrong++;
      cd.incorrect = (cd.incorrect || 0) + 1;
      cd.streak = 0;
      cd.reps = 0;
      cd.interval = 1;
      // Anki "Again": ease -= 0.2 (min 1.3)
      cd.easeFactor = Math.max(1.3, (cd.easeFactor || 2.5) - 0.2);
      queue.push(answering); // re-queue wrong cards
    }

    cd.nextReview = Date.now() + cd.interval * 86400000;
    saveSRS(srs);
  }

  document.getElementById('btn-row').classList.remove('visible');
  cardState = 'sentence';

  // Show sentence immediately on correct, after Space on wrong
  if (answering.word.sentence) {
    const sgr = document.getElementById('sentence-gr');
    sgr.textContent = answering.word.sentence;

    if (correct) {
      // Correct: sentence fades in instantly
      requestAnimationFrame(() => { sgr.classList.add('visible'); });
      if (answering.word.sentenceAudio) {
        playAudio(answering.word.sentenceAudio);
        currentAudioFile = answering.word.wordAudio || null;
        sentenceAudioFile = answering.word.sentenceAudio;
      }
      cardState = 'sentence';
    } else {
      // Wrong: sentence will appear on next Space press
      cardState = 'answer-wrong'; // special state: wrong answer given, sentence not yet shown
    }
  } else {
    // No sentence: proceed straight after a short pause
    cardState = 'no-sentence';
  }

  if (justCompleted) {
    triggerCompleteAnimation(answering, correct);
  }
}

function advanceFromAnswer() {
  // Called when Space is pressed after wrong answer (to show sentence)
  if (!current) return;
  const sgr = document.getElementById('sentence-gr');
  if (current.word.sentence) {
    sgr.textContent = current.word.sentence;
    requestAnimationFrame(() => { sgr.classList.add('visible'); });
    if (current.word.sentenceAudio) {
      playAudio(current.word.sentenceAudio);
      sentenceAudioFile = current.word.sentenceAudio;
    }
    cardState = 'sentence';
  } else {
    nextCard(true);
  }
}

function advanceFromSentence() {
  // Show translation
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
