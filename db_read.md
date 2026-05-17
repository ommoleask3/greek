# Reading the Anki deck database

## Location
The unpacked Anki deck lives in `curr_deck/` (from commit `5979b044`).

## Database file
`curr_deck/collection.anki21` — SQLite database.

## Access (Python, Windows)
```python
import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')

db = r'C:\Users\OliverLeask\Desktop\greek\curr_deck\collection.anki21'
conn = sqlite3.connect(db)
cur = conn.cursor()
```

**Important:** Use Windows-style paths (`r'C:\...'`) — MSYS/Git Bash paths (`/c/...`) don't work with Windows Python.

## Tables
| Table | Rows | Purpose |
|-------|------|---------|
| notes | 2918 | One per word |
| cards | 5432 | Anki cards (multiple per note) |
| col   | 1    | Collection metadata |
| revlog| 0    | Review log (empty) |

## Note field structure
Fields are separated by `\x1f` (unit separator):

```
fields = row[0].split('\x1f')
```

| Index | Content | Example |
|-------|---------|---------|
| 0 | Rank (frequency) | `"1"` |
| 1 | Greek word | `"να"` |
| 2 | English meaning | `"to (subjunctive); here (you go)"` |
| 3 | Greek example sentence | `"Θα του πω να σου τηλεφωνήσει.<br>"` |
| 4 | English example sentence | `"I'll tell him to call you."` |
| 5 | Word audio | `"[sound:hypertts-...]"` |
| 6 | Sentence audio | `"[sound:google-...]"` |
| 7 | Silence filler | `"2-seconds-of-silence.mp3"` |

## Quick query: all words
```python
cur.execute('SELECT flds FROM notes')
for row in cur.fetchall():
    fields = row[0].split('\x1f')
    rank, greek, english = fields[0], fields[1], fields[2]
```
