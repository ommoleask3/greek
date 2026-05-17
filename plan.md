# Plan: Thematic Lessons + Scrollable Row UI

## Context
Replace the 5-column level grid with a horizontally scrollable single row of tiles, then add thematic flashcard lessons in a second scrollable row below. Both rows get translucent fade-buttons at each end for scroll navigation. Thematic lessons get their own SRS progress (separate from ranked cards).

## UI Change: Scrollable Rows

### Current
- 5-column CSS grid showing all 25 level tiles at once (wraps into rows)

### New
- Single horizontal scrollable row (flex, `overflow-x: auto`, hidden scrollbar)
- Tiles keep their existing size/style — just arranged in one row
- Left/right scroll buttons: minimal, partially translucent, positioned at row edges
  - Appear only when there's content to scroll in that direction
  - Smooth scroll on click (`scrollBy` with `behavior: 'smooth'`)
  - Fade out via opacity transition when at scroll boundary
- Same pattern for thematic row below
- Mobile: touch-scroll naturally, buttons still visible but smaller

### HTML Structure (per row)
```html
<div class="scroll-row">
  <button class="scroll-btn scroll-btn--left">‹</button>
  <div class="scroll-row-track" id="grid-en">
    <!-- tiles rendered by JS -->
  </div>
  <button class="scroll-btn scroll-btn--right">›</button>
</div>
```

### CSS Key Points
- `.scroll-row`: `position: relative; display: flex; align-items: stretch;`
- `.scroll-row-track`: `display: flex; gap: 10px; overflow-x: auto; scroll-behavior: smooth; scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; }`
- `.scroll-btn`: `position: absolute; top: 0; bottom: 0; width: 32px; z-index: 2; background: rgba(15,17,23,0.7); border: none; color: #7c85a6; font-size: 1.2rem; cursor: pointer; transition: opacity 0.3s;`
- `.scroll-btn--left { left: 0; }` `.scroll-btn--right { right: 0; }`
- `.scroll-btn.hidden { opacity: 0; pointer-events: none; }`
- Level tiles get `min-width: 160px; flex-shrink: 0;` instead of grid sizing
- Mobile (`max-width: 500px`): buttons `width: 24px`, tiles `min-width: 140px`

### JS Scroll Logic
- On mount + on scroll event: check `scrollLeft === 0` → hide left btn; `scrollLeft + clientWidth >= scrollWidth` → hide right btn
- Button click: `track.scrollBy({ left: ±300, behavior: 'smooth' })`

## Thematic Lessons

### Data File: `js/thematic-data.js`

```js
const THEMATIC_LESSONS = [
  { id, title (Greek), titleEn, icon, words: [{en, gr, sentence, sentenceEn}...] }
]
```

Each word includes an example Greek sentence + English translation. Sentences should be varied, interesting, occasionally humorous/unexpected — not generic textbook filler.

7 lessons:
1. **Days of the week** (📅) — 7 words
2. **Telling the time** (🕐) — 20 words/phrases
3. **Restaurant & cafe menu** (🍽️) — 50 items
4. **Colours** (🎨) — 14 words
5. **Emotions** (😊) — 40 words
6. **Household nouns** (🏠) — 50 words (bathroom, kitchen, bedroom, office — everything you'd name in a room)
7. **Body parts** (🦴) — 20 words

### SRS for Thematic Cards
- Use the existing SRS system (`greek_srs_v1` localStorage) — `cardKey()` already handles words without `rank` by falling back to sanitized English key
- Set `sessionReadonly = false` so progress IS saved
- Thematic cards are completely independent of ranked cards (different keys since they lack `rank`)
- Tiles can show progress (graduated count / total)

### Session Integration
- New global: `let sessionThematic = null;`
- `startThematicSession(lesson)`: sets `sessionThematic`, `sessionMode = 'both'`, `sessionReadonly = false`, `sessionRankMin/Max = null`, calls `startSession()`
- `buildQueue()`: if `sessionThematic` is set, build cards from `sessionThematic.words` (both dirs), use standard SRS logic (new/due/learning filtering)
- `showLevelSelect()`: clears `sessionThematic = null`

### Thematic Tile Style
- Same base style as level tiles but with centered icon + title layout
- Shows progress bar + graduated count like level tiles
- Same scroll-row container

## Files to Create
- `js/thematic-data.js`

## Files to Modify
1. `index.html` — Replace `.level-grid` with scroll-row wrappers, add thematic section, add script tag
2. `js/state.js` — Add `let sessionThematic = null;`
3. `js/levels.js` — Rewrite `renderGrid()` to use flex row, add scroll button logic, add `renderThematicGrid()` + `startThematicSession()`
4. `js/session.js` — Add thematic branch at top of `buildQueue()`
5. `js/views.js` — Clear `sessionThematic` in `showLevelSelect()`
6. `css/styles.css` — Replace `.level-grid` grid styles with scroll-row flex styles, add scroll button styles, add thematic tile styles, add mobile responsive rules

## Verification
1. Level-select shows single scrollable row of level tiles with fade buttons
2. Scroll buttons appear/disappear correctly at boundaries
3. Thematic row below with 6 themed tiles, same scroll behavior
4. Click thematic tile → flashcard session with both directions, full SRS
5. Progress persists across sessions (separate from ranked cards)
6. Mobile: touch-scrollable, buttons smaller, tiles slightly narrower
7. Works even with no Anki deck imported (thematic tiles always available)
