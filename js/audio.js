// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════════════════════════════
async function playAudio(filename, ttsText) {
  // If user chose a TTS voice, always use TTS (skip indexed audio)
  if (prefs.voiceSource !== 'indexed') {
    if (ttsText) speakGreek(ttsText);
    return;
  }

  // Try stored audio file first
  if (filename) {
    try {
      const buf = await dbGet('audio', filename);
      if (buf) {
        const blob = new Blob([buf]);
        const newUrl = URL.createObjectURL(blob);

        const audioEl = document.getElementById('audio-el');
        audioEl.pause();
        audioEl.currentTime = 0;

        const oldUrl = currentBlobUrl;
        currentBlobUrl = newUrl;

        audioEl.src = newUrl;
        audioEl.volume = prefs.volume;
        audioEl.play().catch(() => {});

        if (oldUrl) URL.revokeObjectURL(oldUrl);

        document.getElementById('btn-speaker').classList.add('active');
        audioEl.onended = () => {
          document.getElementById('btn-speaker').classList.remove('active');
        };
        return;
      }
    } catch {}
  }

  // Fallback: TTS with Athina when no stored audio available
  if (ttsText) {
    speakGreek(ttsText, 'athina');
  }
}

function speakGreek(text, voiceOverride) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'el-GR';
  utter.rate = prefs.ttsRate || 0.85;
  utter.pitch = 1.0;
  utter.volume = prefs.volume;

  const voiceName = voiceOverride || prefs.voiceSource;
  const voices = speechSynthesis.getVoices();
  const greekVoices = voices.filter((v) => v.lang.startsWith('el'));
  const pick =
    greekVoices.find((v) => v.name.toLowerCase().includes(voiceName)) ||
    greekVoices.find((v) => /athina/i.test(v.name)) ||
    greekVoices[0];
  if (pick) utter.voice = pick;

  document.getElementById('btn-speaker').classList.add('active');
  utter.onend = () => document.getElementById('btn-speaker').classList.remove('active');
  speechSynthesis.speak(utter);
}

function stopAudio() {
  const audioEl = document.getElementById('audio-el');
  audioEl.pause();
  audioEl.currentTime = 0;
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  if (window.speechSynthesis) speechSynthesis.cancel();
  document.getElementById('btn-speaker').classList.remove('active');
}

function replayAudio() {
  const isSentenceState = cardState === 'sentence' || cardState === 'translation';
  const file = isSentenceState && sentenceAudioFile ? sentenceAudioFile : currentAudioFile;
  let ttsText = '';
  if (current) {
    ttsText = isSentenceState && current.word.sentence ? current.word.sentence : current.word.gr;
  }
  if (file || ttsText) {
    playAudio(file, ttsText);
  } else {
    const audioEl = document.getElementById('audio-el');
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
  }
}

function replayAudioSlow() {
  const isSentenceState = cardState === 'sentence' || cardState === 'translation';
  let ttsText = '';
  if (current) {
    ttsText = isSentenceState && current.word.sentence ? current.word.sentence : current.word.gr;
  }
  if (ttsText) {
    speakGreekSlow(ttsText);
  }
}

function speakGreekSlow(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'el-GR';
  utter.rate = Math.max(0.5, (prefs.ttsRate || 0.85) * 0.55);
  utter.pitch = 1.0;
  utter.volume = prefs.volume;

  const voiceName = prefs.voiceSource === 'indexed' ? 'athina' : prefs.voiceSource;
  const voices = speechSynthesis.getVoices();
  const greekVoices = voices.filter((v) => v.lang.startsWith('el'));
  const pick =
    greekVoices.find((v) => v.name.toLowerCase().includes(voiceName)) ||
    greekVoices.find((v) => /athina/i.test(v.name)) ||
    greekVoices[0];
  if (pick) utter.voice = pick;

  document.getElementById('btn-speaker').classList.add('active');
  utter.onend = () => document.getElementById('btn-speaker').classList.remove('active');
  speechSynthesis.speak(utter);
}

// -- Context-aware mobile replay (works in all views) -------------------------
function mobileReplay() {
  if (document.getElementById('ai-exam-view').classList.contains('active')) {
    if (aiExamAnswered && aiExamCurrent) speakGreek((aiExamCurrent.greekWords || []).join(' '));
  } else if (document.getElementById('exam-view').classList.contains('active')) {
    if (typeof examAnswered !== 'undefined' && examAnswered && typeof examCurrent !== 'undefined' && examCurrent) speakGreek(examCurrent.sentence);
  } else {
    replayAudio();
  }
}

function mobileReplaySlow() {
  if (document.getElementById('ai-exam-view').classList.contains('active')) {
    if (aiExamAnswered && aiExamCurrent) speakGreekSlow((aiExamCurrent.greekWords || []).join(' '));
  } else if (document.getElementById('exam-view').classList.contains('active')) {
    if (typeof examAnswered !== 'undefined' && examAnswered && typeof examCurrent !== 'undefined' && examCurrent) speakGreekSlow(examCurrent.sentence);
  } else {
    replayAudioSlow();
  }
}

function toggleAudioControls(e) {
  e.stopPropagation();
  audioControlsOpen = !audioControlsOpen;
  document.getElementById('volume-popover').classList.toggle('open', audioControlsOpen);
}

function setupVolumeSlider() {
  const slider = document.getElementById('volume-slider');
  slider.value = prefs.volume;
  slider.addEventListener('input', () => {
    prefs.volume = parseFloat(slider.value);
    document.getElementById('audio-el').volume = prefs.volume;
    savePrefs();
  });

  // Speed slider
  const speedSlider = document.getElementById('speed-slider');
  speedSlider.value = prefs.ttsRate || 0.85;
  speedSlider.addEventListener('input', () => {
    prefs.ttsRate = parseFloat(speedSlider.value);
    savePrefs();
  });

  // Voice select buttons
  const voiceBtns = document.querySelectorAll('#voice-select button');
  voiceBtns.forEach((btn) => {
    if (btn.dataset.voice === prefs.voiceSource) {
      voiceBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      voiceBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      prefs.voiceSource = btn.dataset.voice;
      savePrefs();
    });
  });

  document.addEventListener('click', (e) => {
    if (audioControlsOpen && !document.getElementById('audio-controls').contains(e.target)) {
      audioControlsOpen = false;
      document.getElementById('volume-popover').classList.remove('open');
    }
  });
}
