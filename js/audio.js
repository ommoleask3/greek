// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════════════════════════════
async function playAudio(filename) {
  if (!filename) return;
  try {
    const buf = await dbGet('audio', filename);
    if (!buf) return;

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
  } catch {}
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
  // If sentence is visible, replay sentence audio; otherwise replay word audio
  const isSentenceState = (cardState === 'sentence' || cardState === 'translation');
  const file = isSentenceState && sentenceAudioFile ? sentenceAudioFile : currentAudioFile;
  if (file) {
    playAudio(file);
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
