// ═══════════════════════════════════════════════════════════════════════════════
// GITHUB SYNC
// ═══════════════════════════════════════════════════════════════════════════════
const SYNC_KEY = 'greek_sync_v1';
const GITHUB_API = 'https://api.github.com';

function getSyncConfig() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_KEY)) || null;
  } catch {
    return null;
  }
}

function saveSyncConfig(config) {
  localStorage.setItem(SYNC_KEY, JSON.stringify(config));
}

function clearSyncConfig() {
  localStorage.removeItem(SYNC_KEY);
}

function isSyncConfigured() {
  const c = getSyncConfig();
  return c && c.repo && c.token && c.device;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GITHUB API HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
async function ghFetch(path, config, options = {}) {
  const { headers: extraHeaders, ...rest } = options;
  const res = await fetch(`${GITHUB_API}/repos/${config.repo}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github.v3+json',
      ...(extraHeaders || {}),
    },
  });
  return res;
}

async function ghGetContents(path, config) {
  const res = await ghFetch(`/contents/${path}`, config);
  if (!res.ok) return null;
  return res.json();
}

async function ghPutFile(path, content, sha, message, config) {
  const body = { message, content: btoa(unescape(encodeURIComponent(content))) };
  if (sha) body.sha = sha;
  const res = await ghFetch(`/contents/${path}`, config, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MERGE ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════════
function mergeSRS(localSRS, deviceEntries) {
  // deviceEntries: array of {device, srs} objects (includes other devices, not self)
  // Returns { merged, conflicts } where conflicts is the count of real conflicts resolved
  const allSources = [{ device: '_local', srs: localSRS }, ...deviceEntries];
  const merged = {};
  let conflicts = 0;

  // Collect all unique card keys
  const allKeys = new Set();
  for (const source of allSources) {
    for (const key of Object.keys(source.srs)) {
      allKeys.add(key);
    }
  }

  for (const key of allKeys) {
    // Gather all entries for this key
    const entries = [];
    for (const source of allSources) {
      if (source.srs[key]) entries.push(source.srs[key]);
    }

    if (entries.length === 1) {
      merged[key] = entries[0];
      continue;
    }

    // Multiple entries — resolve conflict
    let winner = entries[0];
    let hadConflict = false;

    for (let i = 1; i < entries.length; i++) {
      const candidate = entries[i];
      const resolution = resolveCardConflict(winner, candidate);
      if (resolution.conflict) hadConflict = true;
      winner = resolution.winner;
    }

    if (hadConflict) conflicts++;
    merged[key] = winner;
  }

  return { merged, conflicts };
}

function resolveCardConflict(a, b) {
  const daysA = a.days || [];
  const daysB = b.days || [];

  // Check if one days[] fully contains the other
  const setA = new Set(daysA.map(String));
  const setB = new Set(daysB.map(String));

  const bContainsA = daysA.every((d) => setB.has(String(d)));
  const aContainsB = daysB.every((d) => setA.has(String(d)));

  if (bContainsA && !aContainsB) {
    // B is superset — take B
    return { winner: b, conflict: false };
  }
  if (aContainsB && !bContainsA) {
    // A is superset — take A
    return { winner: a, conflict: false };
  }
  if (aContainsB && bContainsA) {
    // Identical days — take higher seen (arbitrary tiebreak)
    return { winner: (a.seen || 0) >= (b.seen || 0) ? a : b, conflict: false };
  }

  // Real conflict: neither contains the other — take higher seen count
  return { winner: (a.seen || 0) >= (b.seen || 0) ? a : b, conflict: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════
async function syncPull() {
  const config = getSyncConfig();
  if (!config) return;

  try {
    // List files in progress/ directory
    const listing = await ghGetContents('progress', config);
    if (!listing || !Array.isArray(listing)) {
      showSnackbar('Pull failed — no progress folder found', 'error');
      return;
    }

    // Fetch each device's progress file (excluding our own)
    const deviceEntries = [];
    for (const file of listing) {
      if (!file.name.endsWith('.json')) continue;
      const deviceName = file.name.replace('.json', '');
      if (deviceName === config.device) continue; // skip our own file

      const fileData = await ghGetContents(`progress/${file.name}`, config);
      if (!fileData || !fileData.content) continue;

      try {
        const decoded = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
        const payload = JSON.parse(decoded);
        if (payload.srs) {
          deviceEntries.push({ device: deviceName, srs: payload.srs });
        }
      } catch {
        // Skip malformed files
      }
    }

    if (deviceEntries.length === 0) {
      showSnackbar('Pull complete — no other devices found', 'success');
      return;
    }

    // Merge with local
    const localSRS = loadSRS();
    const { merged, conflicts } = mergeSRS(localSRS, deviceEntries);
    saveSRS(merged);
    renderLevelGrids();

    if (conflicts > 0) {
      showSnackbar(`Pulled ✓ — ${conflicts} conflict${conflicts > 1 ? 's' : ''} auto-resolved`, 'warn');
    } else {
      showSnackbar(`Pulled & merged from ${deviceEntries.length} device${deviceEntries.length > 1 ? 's' : ''} ✓`, 'success');
    }
  } catch (err) {
    if (err.name === 'TypeError' || err.message.includes('fetch')) {
      showSnackbar('Pull failed — offline', 'error');
    } else {
      showSnackbar('Pull failed — ' + err.message, 'error');
    }
  }
}

async function syncPush() {
  const config = getSyncConfig();
  if (!config) return;

  try {
    // Pull first to get latest state
    const listing = await ghGetContents('progress', config);
    let pullConflicts = 0;

    if (listing && Array.isArray(listing)) {
      const deviceEntries = [];
      for (const file of listing) {
        if (!file.name.endsWith('.json')) continue;
        const deviceName = file.name.replace('.json', '');
        if (deviceName === config.device) continue;

        const fileData = await ghGetContents(`progress/${file.name}`, config);
        if (!fileData || !fileData.content) continue;

        try {
          const decoded = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
          const payload = JSON.parse(decoded);
          if (payload.srs) {
            deviceEntries.push({ device: deviceName, srs: payload.srs });
          }
        } catch {}
      }

      if (deviceEntries.length > 0) {
        const localSRS = loadSRS();
        const { merged, conflicts } = mergeSRS(localSRS, deviceEntries);
        pullConflicts = conflicts;
        saveSRS(merged);
        renderLevelGrids();
      }
    }

    // Now push our merged local state
    const filePath = `progress/${config.device}.json`;
    const payload = {
      version: 1,
      device: config.device,
      exported: new Date().toISOString(),
      srs: loadSRS(),
    };
    const content = JSON.stringify(payload, null, 2);
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const message = `AUTOSYNC ${config.device} ${timestamp}`;

    // Get current SHA if file exists
    let sha = null;
    const existing = await ghGetContents(filePath, config);
    if (existing && existing.sha) sha = existing.sha;

    const res = await ghPutFile(filePath, content, sha, message, config);

    if (res.ok || res.status === 201) {
      if (pullConflicts > 0) {
        showSnackbar(`Pushed ✓ — ${pullConflicts} conflict${pullConflicts > 1 ? 's' : ''} auto-resolved`, 'warn');
      } else {
        showSnackbar(`Pushed to ${config.device}.json ✓`, 'success');
      }
    } else if (res.status === 409) {
      showSnackbar('Push failed — pull first', 'error');
    } else {
      const body = await res.json().catch(() => ({}));
      showSnackbar('Push failed — ' + (body.message || res.status), 'error');
    }
  } catch (err) {
    if (err.name === 'TypeError' || err.message.includes('fetch')) {
      showSnackbar('Push failed — offline', 'error');
    } else {
      showSnackbar('Push failed — ' + err.message, 'error');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SNACKBAR
// ═══════════════════════════════════════════════════════════════════════════════
let snackbarTimer = null;

function showSnackbar(message, type = 'info') {
  const el = document.getElementById('snackbar');
  el.textContent = message;
  el.className = 'snackbar show snackbar-' + type;
  if (snackbarTimer) clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => {
    el.className = 'snackbar';
  }, 4000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function showSyncConfirm(action, callback) {
  const modal = document.getElementById('sync-confirm-modal');
  const msgEl = document.getElementById('sync-confirm-msg');
  msgEl.textContent = action === 'push' ? 'Push progress to GitHub?' : 'Pull progress from GitHub?';
  modal.classList.add('active');

  const okBtn = document.getElementById('sync-confirm-ok');
  const cancelBtn = document.getElementById('sync-confirm-cancel');

  function cleanup() {
    modal.classList.remove('active');
    okBtn.removeEventListener('click', onOk);
    cancelBtn.removeEventListener('click', onCancel);
  }

  function onOk() {
    cleanup();
    callback();
  }

  function onCancel() {
    cleanup();
  }

  okBtn.addEventListener('click', onOk);
  cancelBtn.addEventListener('click', onCancel);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC CONTROLS UI
// ═══════════════════════════════════════════════════════════════════════════════
function toggleSyncControls(event) {
  event.stopPropagation();
  const popover = document.getElementById('sync-popover');
  const isOpen = popover.classList.contains('open');

  if (isOpen) {
    popover.classList.remove('open');
  } else {
    popover.classList.add('open');
    // Populate fields from saved config
    const config = getSyncConfig();
    if (config) {
      document.getElementById('sync-repo').value = config.repo || '';
      document.getElementById('sync-token').value = config.token || '';
      document.getElementById('sync-device').value = config.device || '';
    }
  }
}

// Close popover when clicking outside
document.addEventListener('click', (e) => {
  const controls = document.getElementById('sync-controls');
  if (controls && !controls.contains(e.target)) {
    document.getElementById('sync-popover').classList.remove('open');
  }
});

function saveSyncSettings() {
  const repo = document.getElementById('sync-repo').value.trim();
  const token = document.getElementById('sync-token').value.trim();
  const device = document.getElementById('sync-device').value.trim();

  if (!repo || !token || !device) {
    showSnackbar('Please fill in all sync fields', 'error');
    return;
  }

  saveSyncConfig({ repo, token, device });
  showSnackbar('Sync settings saved ✓', 'success');
}

function clearSyncSettings() {
  clearSyncConfig();
  document.getElementById('sync-repo').value = '';
  document.getElementById('sync-token').value = '';
  document.getElementById('sync-device').value = '';
  showSnackbar('Sync settings cleared', 'info');
}
