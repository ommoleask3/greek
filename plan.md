# Greek Flashcards — Major Feature Addition Plan

## Context
The app currently has basic SRS flashcards with .apkg import. The user wants a major upgrade adding: level-based progression (25 levels × 100 words), keyboard shortcuts, audio playback, example sentences with translations, "complete" card detection (4 correct in a row), frequency badges, custom range decks, and completion animations.

---

## File to Modify
`greek_flashcards.html` — single file, all changes inline.

---

## 1. Data Model Changes

### WORDS array (expanded during import)
```javascript
{ en, gr, wordAudio, sentenceAudio, sentence, sentenceEn, rank }
// rank = dictionary frequency (1 = most common) — used as stable unique ID
// wordAudio = filename of Greek word pronunciation audio (stored in IndexedDB)
// sentenceAudio = filename of example sentence audio (stored in IndexedDB)
// sentence = Greek example sentence (display text, [sound:] tags stripped)
// sentenceEn = English translation of sentence
```

### SRS card data (expanded)
```javascript
{
  interval, easeFactor, nextReview,
  reps,     // total successful reps
  streak,   // current consecutive correct streak (reset on wrong)
  complete  // bool: streak has hit 4+ — interval gets extra 3x multiplier on next review
}
```

### Storage — ALL large data in IndexedDB, localStorage stays small
- `greek_srs_v1` (localStorage) → SRS card data only (~small, keyed by cardKey)
- `greek_prefs_v1` (localStorage) → mode, volume, firstCardSeen flag
- **IndexedDB `greek_db` with 3 stores:**
  - `words` → word objects `{ en, gr, sentence, sentenceEn, wordAudio, sentenceAudio, rank }`, key = `rank`
  - `audio` → audio ArrayBuffers, key = filename
  - *(SRS stays in localStorage for simplicity — it's text-only and stays small)*

> **Why:** `greek_words_v1` in localStorage for 2500 words with sentences could hit 1–3MB, dangerously close to the 5MB limit shared with SRS data. Moving words to IndexedDB eliminates this risk entirely.

### "Complete" logic — tracked independently per direction
- Each card direction (`en` and `gr`) has its own `streak` and `complete` flag
- `cardKey` format: `"r{rank}_en"` and `"r{rank}_gr"` — completely separate SRS entries
- Completing `"r42_en"` ("before" → "πριν") does **not** affect `"r42_gr"` ("πριν" → "before") and vice versa
- When `streak` reaches 4: set `complete = true` for that direction's card only
- On next review interval calculation, multiply result by 3× if `complete = true`
- This naturally pushes complete cards far into the future via the existing SRS

### `cardKey` format
- Primary: `"r{rank}_{dir}"` e.g. `"r42_en"`, `"r42_gr"`
- Fallback (no rank): `"{en_slug}_{dir}"` e.g. `"hello_en"`
- Avoids collisions from special characters in English text

---

## 2. Import Changes (`extractWords` + `processApkg`)

### Memory management during import
The 100MB .apkg loads entirely into RAM. JSZip + sql.js each hold copies, peaking at ~300–500MB. Mitigate by:
- Explicitly `null`-ing the raw ArrayBuffer after JSZip loads it
- `null`-ing the JSZip object after the DB bytes are extracted
- `null`-ing the DB bytes after sql.js loads them
- Calling `db.close()` immediately after extraction

### Extract additional fields during import
- `rank`: field names containing 'rank', 'frequency', 'freq', 'position', 'order', or a field whose stripped value is purely numeric
- `sentence`: field names containing 'sentence', 'example', 'context', 'usage'
- `sentenceEn`: field names containing 'sentence translation', 'example translation', 'english sentence'
- `wordAudio`: first `[sound:x]` match in the Greek word field
- `sentenceAudio`: first `[sound:x]` match in the sentence field

### Field detection safety net
- After parsing, log all model field names to console
- On the import screen, show a small "Detected fields" summary: which of rank/sentence/audio were found and which weren't — so the user knows what to expect before entering a session

### Strip `[sound:...]` tags from all display text after extraction

### Save words to IndexedDB
- Open `greek_db`, store `words`
- Write all word objects in a **single transaction** (not one transaction per word)
- Show progress: "Saving words…"

### Extract and save audio files
- Read `media` JSON from ZIP root → build map: `filename → zip entry index`
- Collect all unique audio filenames referenced across all words (up to ~5000)
- Extract and write to IndexedDB `audio` store in **batches of 100** per transaction
- Show progress: "Extracting audio (500/5000)…"
- Gracefully skip missing files — note count of skipped files in success message
- After each batch, yield to the event loop (`await new Promise(r => setTimeout(r, 0))`) to keep UI responsive

---

## 3. Level System UI

### Screen: Level Select (`#level-view`)
Shown after import and on every app load. Two **separate** 5×5 grids, one for each direction, shown as two tabs or panels side by side:

- **EN → GR** tab (left)
- **GR → EN** tab (right)

Each grid is fully independent — separate progress, separate unlock logic, separate complete tracking.

**Each tile shows:**
- "Level N" title + rank range (e.g. "1–100")
- Progress bar: X/100 words complete **for that direction**
- Lock overlay if locked
- Level 1 always unlocked; Level N+1 unlocks when ≥ 75/100 words in Level N are `complete = true` **for that direction**

Clicking a tile starts a session for that level **in that direction only** (no "Both" mode from the level screen — "Both" is available only from custom range).

**Custom range section** (below both grids, collapsed by default):
- Two number inputs: "From" / "To" rank
- Direction selector: EN→GR / GR→EN / Both
- "Practice" button — bypasses lock, does not affect unlock progress

**Also on this screen:**
- Audio controls visible (see §6)

---

## 4. Keyboard Shortcuts

| State | Key | Action |
|---|---|---|
| Card unflipped | `Space` | Flip card (rotateY reveal) |
| Card flipped | `Space` | Mark correct |
| Card flipped | `Backspace` | Mark wrong |
| Sentence visible, no translation | `Space` | Show translation (0.3s fade) |
| Translation visible | `Space` | Advance to next card (page-turn) |
| Any state | `Enter` | Restart current audio from beginning |

State machine variable `cardState`:
- `'loading'` → `'question'` → `'answer'` → `'sentence'` → `'translation'` → (loading → question…)

**Session direction:** Level sessions are always single-direction (set by which tile was clicked). Custom range sessions can be EN→GR, GR→EN, or Both. The active direction is stored in `sessionMode` for the duration of the session.

**Keyboard hint:** very faint one-liner below card, shown on first card only, clears after first keypress. Stored in `greek_prefs_v1`.

---

## 5. Card Back — Sentence + Frequency Badge

### Frequency badge
- Tiny number, absolute bottom-right of card back, no border/chip shape
- Colour: Gold (`#f5c518`) ranks 1–100 | Silver (`#a0a0b0`) 101–500 | Bronze (`#cd7f32`) 501–1000 | Grey (`#4a5170`) 1001+
- Only shown if rank data was imported

### Example sentence (on card back, below answer word)
- Hidden initially; revealed via `opacity` + `transform: translateY(4px→0)` transition — smoother than `max-height`
- Smaller font (~0.9rem), muted colour; card grows naturally via `height: auto`
- **Correct answer:** Greek sentence fades in instantly → `Space` → English translation fades in (0.3s) → `Space` → next card
- **Wrong answer:** `Space` → Greek sentence fades in (0.3s) → `Space` → English translation fades in (0.3s) → `Space` → next card
- Sentence audio (`sentenceAudio`) plays when Greek sentence becomes visible
- If no sentence data: skip straight to next card on answer (state jumps from `'answer'` to `'loading'`)

---

## 6. Audio System

### Playback
- Single `<audio id="audio-el">` element reused for all playback
- Current Blob URL tracked in `let currentBlobUrl = null`
- `playAudio(filename)`:
  1. Load ArrayBuffer from IndexedDB `audio` store
  2. Create new Blob URL
  3. Stop existing audio, then revoke **old** Blob URL (not new one)
  4. Set `audio.src`, `audio.volume`, call `audio.play()`
  5. Store new Blob URL in `currentBlobUrl`
- `stopAudio()`: pause, reset `currentTime`, revoke `currentBlobUrl`, set to null

### Autoplay unlock
- Browsers block autoplay until a user gesture occurs
- On **first keypress or click anywhere**, call `audio.play().then(() => audio.pause())` to silently unlock the audio context
- Until unlocked, show a very subtle "press any key to enable audio" note alongside the keyboard hint

### Auto-play triggers
- **GR→EN card loads:** play `wordAudio` immediately (after autoplay unlock)
- **EN→GR card flips:** play `wordAudio` when Greek answer revealed
- **Sentence becomes visible:** play `sentenceAudio`
- **Advancing to next card:** `stopAudio()` first, then start page-turn animation

### Enter key behaviour
- Before sentence shown: restart `wordAudio` from beginning
- After sentence shown: restart `sentenceAudio` from beginning
- Always restarts — never pauses/resumes

### Audio controls (fixed bottom-right, near bag icon)
- Near-invisible at rest (opacity ~0.2), full opacity on hover or when audio is active
- Speaker icon: click = toggle play/stop for current clip
- Volume: click speaker → small popover with slider appears above, dismisses on outside click
- Volume persists to `greek_prefs_v1`

---

## 7. Card Transitions

### Answer reveal (existing — kept)
- `rotateY(180deg)` on `.card` element, 0.5s cubic-bezier
- Space when `cardState === 'question'`

### Next-card transition (page turn)
- Right half folds over left half like turning a book page
- An absolutely-positioned `.page-flap` div (`width: 50%`, `right: 0`, `overflow: hidden`) shows a snapshot of the right half of the current card
- CSS: `rotateY(-180deg)` with `transform-origin: left center`, 400ms ease-in-out
- At 200ms (flap edge-on): swap new card content in underneath, clear sentence/badge elements
- Flap completes rotation to reveal new card; flap element is then hidden
- `cardState = 'loading'` for the full 400ms — no inputs accepted
- If a "complete" animation is also triggered, it runs first (~700ms), page-turn follows

---

## 8. "Complete" Animation

When `streak` reaches exactly 4 for the first time on a card:
1. Card border + box-shadow transitions to gold (~0.3s CSS transition)
2. Card scales down + flies via CSS `@keyframes` toward the bag icon (bottom-right), ~400ms
3. Bag icon `scale` pulses briefly, then fades back to opacity ~0.15
4. Page-turn to next card begins after fly animation completes
5. Session-end screen shows total words mastered this session

Pure CSS keyframes + JS class toggling — no library.

---

## 9. HTML Structure

### Views
- `#import-view` — existing, unchanged
- `#level-view` — new
- `#main-view` — expanded
- `#session-end` — gains "Return to levels" + mastered count

### Card back additions
```html
<div class="freq-badge" id="freq-badge"></div>
<div class="card-answer" id="back-word"></div>
<div class="sentence" id="sentence-gr"></div>
<div class="sentence-translation" id="sentence-en"></div>
```

### Fixed elements (always in DOM)
```html
<audio id="audio-el"></audio>
<div id="audio-controls">
  <button id="btn-speaker">🔊</button>
  <div id="volume-popover" hidden>
    <input type="range" id="volume-slider" min="0" max="1" step="0.01">
  </div>
</div>
<div id="bag-icon">🎒</div>
<div class="page-flap" id="page-flap"></div>  <!-- page-turn overlay -->
```

---

## 10. State Machine

```
cardState:
  'loading'      — animation in progress, all inputs blocked
  'question'     — front showing; Space=flip, Enter=audio
  'answer'       — flipped; Space=correct, Backspace=wrong, Enter=audio
  'sentence'     — sentence visible; Space=show translation, Enter=audio
  'translation'  — translation visible; Space=next card, Enter=audio
```

---

## 11. Key Implementation Notes

- **IndexedDB wrapper:** `openDB()` returns a cached promise; `dbGet(store, key)`, `dbPut(store, key, value)`, `dbGetAll(store)`, `dbPutBatch(store, entries)` — all Promise-based
- **Words loaded into memory on session start:** `await dbGetAll('words')` populates `WORDS` array once per session. 2500 objects with text fields is ~1–2MB in RAM — fine.
- **Session cap:** 40 cards. Level sessions: rank range = `[(level-1)*100 + 1, level*100]`. Custom range: user-defined, still capped at 40.
- **Fresh card ordering:** sort ascending by `rank` before shuffling within same-rank groups
- **`cardKey` stability:** new format `r{rank}_{dir}` for imported words; old `slug_dir` format kept as fallback for built-in words. Existing SRS data from old keys is simply not found → treated as new cards (acceptable one-time reset)
- **Back-compat:** missing rank/audio/sentence → no badge/audio/sentence shown, app fully functional

---

## 12. Verification Checklist
1. Import .apkg → field detection summary shown → audio extraction progress → level select appears
2. Two grids shown (EN→GR and GR→EN), each with Level 1 unlocked, others locked
3. Click EN→GR Level 1 → only rank 1–100 EN→GR cards; GR→EN cards not included
4. Space flips; Space=correct, Backspace=wrong
5. GR→EN: word audio plays on card load; EN→GR: plays on flip
6. Correct → sentence instant, Space → translation 0.3s, Space → page-turn to next card
7. Wrong → Space → sentence 0.3s, Space → translation 0.3s, Space → page-turn
8. 4th correct streak → gold glow → card flies to bag → bag pulses → page-turn
9. 75/100 complete in EN→GR Level 1 → EN→GR Level 2 unlocks (GR→EN Level 1 unaffected)
10. Completing "before" (EN→GR) does NOT complete "πριν" (GR→EN) — verified by checking SRS keys
11. Custom range with "Both" → both directions mixed in one session
12. Volume persists across page reload
13. Enter replays audio from start at any point
14. Autoplay unlock prompt shown; clears after first keypress
15. RAM usage during import stays reasonable (null refs cleared after each step)
