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
// rank = dictionary frequency (1 = most common)
// wordAudio = filename of Greek word pronunciation audio (stored in IndexedDB)
// sentenceAudio = filename of example sentence audio (stored in IndexedDB)
// sentence = Greek example sentence (display text, [sound:] tags stripped)
// sentenceEn = English translation of sentence
```

### SRS card data (expanded)
```javascript
{
  interval, easeFactor, nextReview,
  reps,          // total successful reps
  streak,        // current consecutive correct streak (reset on wrong)
  complete       // bool: streak has hit 4+ (shown less frequently)
}
```

### Storage
- `greek_words_v1` (localStorage) → word objects with audio/sentence/rank fields
- `greek_srs_v1` (localStorage) → card data with streak + complete fields
- `greek_audio_db` (IndexedDB, store `audio`) → audio ArrayBuffers keyed by filename

### "Complete" logic
- `streak` increments on correct, resets to 0 on wrong
- When `streak >= 4`, set `complete = true`
- Complete cards still reviewed but weighted ~10% (appear ~1-in-10 sessions)

---

## 2. Import Changes (`extractWords` + `processApkg`)

### Extract additional fields during import
- `rank`: field names containing 'rank', 'frequency', 'freq', 'position', 'order', or numeric-only field
- `sentence`: field names containing 'sentence', 'example', 'context', 'usage'
- `sentenceEn`: field names containing 'sentence translation', 'example translation', 'english sentence'
- `wordAudio`: extract `[sound:x.mp3]` from the Greek word field via `/\[sound:([^\]]+)\]/`
- `sentenceAudio`: extract `[sound:x.mp3]` from the sentence field

### Extract audio files from ZIP
- Read `media` JSON from ZIP root → build map: `filename → zip entry`
- Extract each unique referenced audio file as ArrayBuffer → store in IndexedDB
- Show progress during extraction: "Extracting audio (234/2500)…"
- Gracefully handle missing files

### Strip `[sound:...]` tags from all display text after extraction

---

## 3. Level System UI

### Screen: Level Select (`#level-view`)
Shown after import and on every app load (replaces going straight to main view).

**5×5 grid of level tiles** (25 levels × 100 words each):
- "Level N" title + rank range (e.g. "1–100")
- Progress bar: X/100 words complete
- Lock overlay if locked (greyed, not clickable)
- Level 1 always unlocked; Level N+1 unlocks when ≥ 75/100 words in Level N are complete

**Custom range section** (below grid, collapsible/subtle):
- Two number inputs: "From" / "To" rank
- "Practice" button — bypasses lock, does not affect unlock progress

**Also on this screen:**
- Mode toggle (Both / EN→GR / GR→EN) — persists globally
- Volume accessible via audio controls (see §6)

---

## 4. Keyboard Shortcuts

| State | Key | Action |
|---|---|---|
| Card unflipped | `Space` | Flip card (rotateY reveal animation) |
| Card flipped | `Space` | Mark correct |
| Card flipped | `Backspace` | Mark wrong |
| Sentence visible, no translation | `Space` | Show translation (0.3s fade) |
| Translation visible | `Space` | Advance to next card (flipbook/page-turn animation) |
| Any state | `Enter` | Play current audio from start (if already playing, restart it) |

State machine variable `cardState`:
- `'question'` → `'answer'` → `'sentence'` → `'translation'` → (next card)

**Keyboard hint:** very faint one-liner shown below card on first card only, disappears after first answer.

---

## 5. Card Back — Sentence + Frequency Badge

### Frequency badge
- Tiny number, bottom-right of card back, no border/chip shape
- Colour: Gold (`#f5c518`) ranks 1–100 | Silver (`#a0a0b0`) 101–500 | Bronze (`#cd7f32`) 501–1000 | Grey (`#4a5170`) 1001+
- Only shown if rank data was imported

### Example sentence (on card back, below answer word)
- Smaller font (~0.95rem), muted colour
- Card grows slightly via `max-height` CSS transition (sentences are 5–10 words)
- **Correct answer:** Greek sentence appears instantly → `Space` → English translation fades in (0.3s) → `Space` → next card
- **Wrong answer:** `Space` → Greek sentence fades in (0.3s) → `Space` → English translation fades in (0.3s) → `Space` → next card
- Sentence audio plays when Greek sentence becomes visible
- If no sentence data: skip straight to next card on answer

---

## 6. Audio System

### Playback
- Single `<audio>` element reused for all playback
- `playAudio(filename)` — loads from IndexedDB, creates Blob URL, plays
- `stopAudio()` — pauses, resets, revokes Blob URL

### Auto-play triggers
- **GR→EN card loads:** play `wordAudio` immediately
- **EN→GR card flips:** play `wordAudio` when Greek answer revealed
- **Sentence becomes visible:** play `sentenceAudio`
- **Advancing to next card:** `stopAudio()` first (before page-turn animation starts)

### Enter key behaviour
- `Enter` at any point during a card: play the most contextually relevant audio from the start
  - Before sentence shown: replay `wordAudio`
  - After sentence shown: replay `sentenceAudio`
  - If audio is already playing: stop it and restart from beginning (not pause/resume — always restart)

### Audio controls (fixed bottom-right, near bag icon)
- Near-invisible at rest (opacity ~0.2), full opacity on hover or when active
- Speaker icon: click = toggle play/stop for current clip
- Volume: click speaker → small popover with slider appears above, dismisses on outside click
- Volume persists to `greek_prefs_v1` (localStorage)

---

## 7. Card Transitions

### Answer reveal (existing flip — kept)
- `rotateY(180deg)` on the `.card` element, 0.5s cubic-bezier
- Triggered by Space when `cardState === 'question'`

### Next-card transition (new — book page turn)
- Right half of the card folds over the left half, like turning a page
- Implementation: an absolutely-positioned right-half overlay (`width: 50%`, `left: 50%`) rotates `rotateY(-180deg)` with `transform-origin: left center`, ~400ms
- At the halfway point (200ms, when the flap is edge-on): swap the new card content in underneath
- The flap then continues rotating to complete the turn, revealing the new card
- `cardState` set to `'loading'` during transition to block inputs
- Triggered when advancing from `'translation'` state (or from `'answer'` if no sentence data)

---

## 8. "Complete" Animation

When streak hits exactly 4 for the first time:
1. Card border + glow transitions to gold (~0.3s)
2. Card shrinks (CSS scale) and flies toward bag icon in bottom-right (~400ms CSS keyframe)
3. Bag icon pulses on landing, then fades back to near-invisible (opacity ~0.15)
4. Next card loads normally
5. Session-end screen shows total mastered count (no live counter during session)

All via pure CSS keyframes + JS class toggling — no library.

---

## 8. HTML Structure Changes

### New/modified views
- `#level-view` — new, shown after import and on load
- `#main-view` — gains sentence elements, freq badge, audio controls, bag icon
- `#session-end` — gains "Return to levels" button + mastered count

### New card-back elements
```html
<div class="freq-badge" id="freq-badge"></div>        <!-- tiny coloured number, bottom-right -->
<div class="card-answer" id="back-word"></div>         <!-- answer word (existing) -->
<div class="sentence" id="sentence-gr"></div>          <!-- Greek sentence, hidden initially -->
<div class="sentence-en" id="sentence-en"></div>       <!-- English translation, hidden initially -->
```

### Fixed UI elements
```html
<audio id="audio-el"></audio>
<div id="audio-controls"><!-- speaker icon + volume popover --></div>
<div id="bag-icon">🎒</div>   <!-- mastered word target for fly animation -->
```

---

## 9. State Machine

```
cardState:
  'loading'      — between cards (flip animation in progress, inputs blocked)
  'question'     — front showing, Space to flip
  'answer'       — flipped, Space=correct / Backspace=wrong
  'sentence'     — sentence visible, Space to show translation
  'translation'  — translation visible, Space to advance
```

---

## 10. Key Implementation Notes

- **IndexedDB wrapper:** `openAudioDB()`, `saveAudio(filename, arrayBuffer)`, `loadAudio(filename)` — async, Promise-based
- **Session cap:** 40 cards. Level sessions: only words from that level's rank range. Custom range: spans levels, still capped at 40
- **New card ordering:** fresh cards sorted ascending by rank before shuffle
- **`cardKey` stability:** keep existing `word.en` based key format — SRS data is preserved
- **Back-compat:** missing rank/audio/sentence fields → app works, just no badge/audio/sentence shown
- **`greek_audio_v1` localStorage key** from old plan is superseded by IndexedDB — remove if present on load

---

## 11. Verification Checklist
1. Import .apkg → words saved, audio extraction progress shown, then level grid appears
2. Level 1 unlocked, others locked
3. Enter Level 1 → only rank 1–100 cards
4. Space flips, Space=correct, Backspace=wrong
5. GR→EN: word audio plays on card load; EN→GR: plays on flip
6. Correct → sentence instant, Space → translation 0.3s fade, Space → next card
7. Wrong → Space → sentence 0.3s fade, Space → translation 0.3s fade, Space → next card
8. 4th correct streak → gold glow → card flies to bag → bag pulses
9. 75/100 complete in Level 1 → Level 2 tile unlocks
10. Custom range → session uses only those ranks
11. Volume persists across page reload
12. Speaker toggle plays/stops audio mid-sentence
