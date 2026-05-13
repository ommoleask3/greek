// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL SELECT
// ═══════════════════════════════════════════════════════════════════════════════
function switchTab(dir) {
  activeTab = dir;
  document.getElementById('tab-en').classList.toggle('active', dir === 'en');
  document.getElementById('tab-gr').classList.toggle('active', dir === 'gr');
  document.getElementById('panel-en').classList.toggle('active', dir === 'en');
  document.getElementById('panel-gr').classList.toggle('active', dir === 'gr');
}

// Interpolate tile colour based on completion (0–100)
function tileStyle(completed, locked) {
  if (locked) return '';
  const t = Math.min(completed / 100, 1); // 0..1

  // Colour stops: dark → bronze → silver → gold
  // bg: #181c2a → #1e1810 → #1a1a20 → #1f1a08
  // border: #252a3d → #7c4a1a → #8a8a9a → #c9960c
  // glow: none → bronze → silver → gold
  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function lerpHex(c1, c2, t) {
    const p = (h) => parseInt(h, 16);
    const r = lerp(p(c1.slice(1,3)), p(c2.slice(1,3)), t);
    const g = lerp(p(c1.slice(3,5)), p(c2.slice(3,5)), t);
    const b = lerp(p(c1.slice(5,7)), p(c2.slice(5,7)), t);
    return `rgb(${r},${g},${b})`;
  }

  let bg, border, shadow, titleColor;

  if (t <= 0) {
    return ''; // pure CSS default
  } else if (t < 0.5) {
    // 0 → 50%: dark to bronze
    const u = t / 0.5;
    bg     = lerpHex('#181c2a', '#1e1608', u);
    border = lerpHex('#252a3d', '#8b5e1a', u);
    shadow = `0 0 ${Math.round(u * 8)}px rgba(139,94,26,${(u * 0.4).toFixed(2)})`;
    titleColor = lerpHex('#7c85a6', '#b07830', u);
  } else if (t < 1) {
    // 50% → 100%: bronze to gold
    const u = (t - 0.5) / 0.5;
    bg     = lerpHex('#1e1608', '#221a00', u);
    border = lerpHex('#8b5e1a', '#d4a017', u);
    shadow = `0 0 ${Math.round(8 + u * 14)}px rgba(212,160,23,${(0.4 + u * 0.45).toFixed(2)})`;
    titleColor = lerpHex('#b07830', '#f5c518', u);
  } else {
    // 100%: full gold
    bg     = '#231c00';
    border = '#f5c518';
    shadow = '0 0 22px rgba(245,197,24,0.85), 0 0 6px rgba(245,197,24,0.5)';
    titleColor = '#f5c518';
  }

  return `background:${bg}; border-color:${border}; box-shadow:${shadow}; --tile-title-color:${titleColor};`;
}

function getTileCounts(levelWords, dir, srs) {
  const now = Date.now();
  let newCount = 0, learningCount = 0, dueCount = 0;
  for (const w of levelWords) {
    const cd = srs[cardKey(w, dir)];
    const reps = cd ? (cd.reps || 0) : 0;
    const nextReview = cd ? (cd.nextReview || 0) : 0;
    if (reps === 0) {
      newCount++;
    } else if (reps <= 3 && nextReview <= now) {
      learningCount++;
    } else if (reps >= 4 && nextReview <= now) {
      dueCount++;
    }
  }
  return { newCount, learningCount, dueCount };
}

function renderLevelGrids() {
  renderGrid('en');
  renderGrid('gr');
}

function renderGrid(dir) {
  const srs = loadSRS();
  const grid = document.getElementById(`grid-${dir}`);
  grid.innerHTML = '';

  const maxRank = WORDS.length > 0 ? Math.max(...WORDS.map(w => w.rank || 0), 100) : 2500;
  const numLevels = Math.ceil(maxRank / 100);
  const levels = Math.min(numLevels, 25);

  for (let lvl = 1; lvl <= levels; lvl++) {
    const rankMin = (lvl - 1) * 100 + 1;
    const rankMax = lvl * 100;
    const levelWords = WORDS.filter(w => w.rank >= rankMin && w.rank <= rankMax);
    const total = levelWords.length;

    let completed = 0;
    for (const w of levelWords) {
      const cd = srs[cardKey(w, dir)];
      if (cd && cd.complete) completed++;
    }

    // Unlock logic: level 1 always unlocked; level N+1 unlocks when ≥75 complete in level N
    let locked = false;
    if (lvl > 1) {
      const prevMin = (lvl - 2) * 100 + 1;
      const prevMax = (lvl - 1) * 100;
      const prevWords = WORDS.filter(w => w.rank >= prevMin && w.rank <= prevMax);
      let prevCompleted = 0;
      for (const w of prevWords) {
        const cd = srs[cardKey(w, dir)];
        if (cd && cd.complete) prevCompleted++;
      }
      locked = prevCompleted < 75 && prevWords.length >= 75;
    }

    const pct = total > 0 ? Math.round((completed / 100) * 100) : 0;

    const tile = document.createElement('div');
    tile.className = 'level-tile' + (locked ? ' locked' : '');
    const style = tileStyle(completed, locked);
    if (style) tile.setAttribute('style', style);

    // Progress bar colour: blue at 0%, shifts to gold at 100%
    const barColor = completed >= 100
      ? 'linear-gradient(90deg,#c9960c,#f5c518)'
      : completed >= 50
        ? `linear-gradient(90deg,#a06820,#d4a017)`
        : 'linear-gradient(90deg,#4f7cff,#a78bfa)';

    const { newCount, learningCount, dueCount } = getTileCounts(levelWords, dir, srs);
    tile.innerHTML = `
      <div class="level-tile-title" style="color:var(--tile-title-color,#7c85a6)">Level ${lvl}</div>
      <div class="level-tile-range">${rankMin}–${rankMax}</div>
      <div class="level-tile-progress">${completed}/100 complete</div>
      <div class="level-tile-bar"><div class="level-tile-bar-fill" style="width:${pct}%;background:${barColor}"></div></div>
      <div class="tile-counts">
        ${!locked && newCount > 0      ? `<span class="tc-new">${newCount}</span>` : ''}
        ${!locked && learningCount > 0 ? `<span class="tc-learning">${learningCount}</span>` : ''}
        ${!locked && dueCount > 0      ? `<span class="tc-due">${dueCount}</span>` : ''}
      </div>
      ${locked ? '<div class="level-lock-icon">🔒</div>' : ''}
    `;
    if (!locked) {
      tile.addEventListener('click', () => startLevelSession(lvl, dir));
    }
    grid.appendChild(tile);
  }
}

function toggleCustomRange() {
  const header = document.getElementById('custom-range-toggle');
  const body = document.getElementById('custom-range-body');
  const open = body.classList.contains('open');
  body.classList.toggle('open', !open);
  header.classList.toggle('open', !open);
}

function setCustomDir(d) {
  customDir = d;
  ['en','gr','both'].forEach(id => {
    document.getElementById(`cdir-${id}`).classList.toggle('active', id === d);
  });
}

function startCustomRange() {
  const from = parseInt(document.getElementById('range-from').value, 10) || 1;
  const to = parseInt(document.getElementById('range-to').value, 10) || 100;
  sessionMode = customDir;
  sessionRankMin = Math.min(from, to);
  sessionRankMax = Math.max(from, to);
  sessionReadonly = true;
  startSession();
}

function startLevelSession(level, dir) {
  sessionMode = dir;
  sessionRankMin = (level - 1) * 100 + 1;
  sessionRankMax = level * 100;
  sessionReadonly = false;
  startSession();
}
