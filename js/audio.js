// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════════════════════════════
async function playAudio(filename, ttsText) {
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

  // Fallback: TTS for words without stored audio
  if (ttsText) {
    speakGreek(ttsText);
  }
}

function speakGreek(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'el-GR';
  utter.rate = 0.9;
  utter.pitch = 1.2;
  utter.volume = prefs.volume;
  // Try to pick a female Greek voice
  const voices = speechSynthesis.getVoices();
  const female = voices.find(v => v.lang.startsWith('el') && /female/i.test(v.name));
  const greek = female || voices.find(v => v.lang.startsWith('el'));
  if (greek) utter.voice = greek;
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
  document.getElementById('btn-speaker').classList.remove('active');
}

function replayAudio() {
  const audioEl = document.getElementById('audio-el');
  const isSentenceState = (cardState === 'sentence' || cardState === 'translation');
  const file = isSentenceState && sentenceAudioFile ? sentenceAudioFile : currentAudioFile;
  // Build TTS fallback text from current card
  let ttsText = '';
  if (current) {
    if (isSentenceState && current.word.sentence) {
      ttsText = current.word.sentence;
    } else {
      ttsText = current.word.gr;
    }
  }
  if (file || ttsText) {
    playAudio(file, ttsText);
  } else {
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
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

  document.addEventListener('click', e => {
    if (audioControlsOpen && !document.getElementById('audio-controls').contains(e.target)) {
      audioControlsOpen = false;
      document.getElementById('volume-popover').classList.remove('open');
    }
  });
}
