"""
Disambiguate particle English hints, remove duplicates/declensions, and
re-rank the deck sequentially. Also migrates the SRS progress JSON.

Usage:
    cd greek
    python misc/disambiguate_deck.py

References:
    - analysis_proposed_hints.txt   (reviewed disambiguation hints)
    - db_lint_plan.md               (full plan)
    - misc/insert_missing.py        (DB access pattern)
"""

import sqlite3, json, re, shutil, sys, os

sys.stdout.reconfigure(encoding='utf-8')

DB_PATH = 'curr_deck/collection.anki21'
BACKUP_PATH = DB_PATH + '.pre_disambig.bak'
SRS_PATH = 'greek_progress_2026-05-17.json'
SRS_OUT_PATH = 'greek_progress_2026-05-17.migrated.json'

# ═══════════════════════════════════════════════════════════════════════════════
# UPDATES: (rank, greek) -> new English meaning
# ═══════════════════════════════════════════════════════════════════════════════

UPDATES = {
    # === "so" ===
    (42, "έτσι"): "like this, this way (do it like this)",
    (60, "τόσο"): "so, that much (so beautiful)",
    (70, "λοιπόν"): "so, well then (so, what do we do?)",
    (195, "οπότε"): "so (consequence: it is raining, so take an umbrella)",
    (287, "ώστε"): "so that (purpose: he spoke loudly so that they would hear)",
    (900, "άρα"): "therefore (logical: 2+2=4, therefore...)",

    # === "to" ===
    (13, "σε"): "to, in, at (preposition: I go to school)",
    (17, "στο"): "to/in/at the (neut. contraction: at the house)",
    (168, "προς"): "toward (direction: toward the right)",
    (1427, "έως"): "until, up to (formal: until tomorrow)",

    # === "that" ===
    (14, "που"): "that, which, where (relative: the man that came)",
    (18, "ότι"): "that (after verbs: I know that...)",
    (34, "πως"): "that (informal: I think that...)",
    (248, "εκείνος"): "that one (demonstrative: that man over there)",
    (409, "οποίος"): "who, which (formal relative: the one who)",

    # === "as" ===
    (47, "σαν"): "like, as if (comparison: like a child)",
    (88, "όπως"): "as, just as (manner: as I said)",
    (140, "όσο"): "as much as, as long as (the more... the more)",
    (143, "ως"): "as (role: he works as a teacher)",
    (439, "καθώς"): "as, while (simultaneous: as he was leaving)",

    # === "about" ===
    (9, "για"): "for; about (general: for you; I talk about...)",
    (376, "περίπου"): "approximately (quantity: about 10)",
    (489, "σχετικά"): "regarding, about (topic: regarding the topic)",
    (1113, "περί"): "about, concerning (formal: about what?)",

    # === "not" ===
    (3, "δε(ν)"): "not (before verbs: I do not know)",
    (25, "όχι"): "no (standalone answer: Are you coming? No.)",
    (38, "μη(ν)"): "do not (prohibition: do not run!)",

    # === "when" ===
    (50, "όταν"): "when (conjunction: when I was young)",
    (180, "πότε"): "when? (question: when are you leaving?)",
    (1602, "άμα"): "when, if (colloquial: if you want)",

    # === "then" ===
    (77, "τότε"): "then, at that time (back then I was young)",
    (2875, "κατόπιν"): "then, afterwards (formal: after the fact)",

    # === "until" ===
    (114, "μέχρι"): "until, up to (until tomorrow)",
    (1150, "ώσπου"): "until (conjunction: wait until I come)",

    # === "therefore" ===
    (1654, "επομένως"): "therefore, consequently (formal: therefore, we must...)",

    # === "will" ===
    (4, "θα"): "will, would",
    (2098, "η διαθήκη"): "the will, testament",
    (2145, "η θέληση"): "the will, willpower",

    # === "where" ===
    (61, "πού"): "where? (question: where are you?)",
    (272, "όπου"): "wherever, where (relative: wherever you go)",

    # === "but" ===
    (90, "μα"): "but (mild/emotional); by (oath: by God!)",

    # === "just" ===
    (48, "μόνο"): "only (restriction: only you)",
    (129, "μόλις"): "just now; as soon as (I just arrived)",

    # === "may" ===
    (49, "μπορώ"): "can, to be able (I can go)",
    (89, "ας"): "let, let us (let us go; let it be)",
    (2789, "είθε"): "may, if only (wish: may you succeed)",

    # === "all" ===
    (55, "όλος"): "all, whole (adjective: the whole world)",
    (148, "όλο"): "constantly, all the time (adverb: he keeps crying)",
    (590, "παν"): "all, every- (prefix/archaic: gorgeous, all-beautiful)",

    # === "more" ===
    (66, "πιο"): "more (comparative + adj: more big = bigger)",
    (205, "περισσότερος"): "more (quantity: more money)",
    (522, "παραπάνω"): "more, further, extra (I cannot take any more)",

    # === "after" ===
    (226, "αφού"): "after (conjunction: after he left); since (reason: since you want to)",
    (1729, "αφότου"): "ever since (time: ever since he came)",

    # === "before" ===
    (966, "προτού"): "before (formal conjunction: before it starts)",

    # === "by" ===
    (379, "δίπλα"): "next to, beside (next to the school)",
    (1901, "διά"): "through; by (formal: by hand)",

    # === "on" ===
    (100, "πάνω"): "on, up, above (on the table)",
    (791, "επί"): "upon (formal); times (math: 3 times 4)",

    # === "her" ===
    (20, "της"): "her, hers (genitive: her book; I told her)",
    (631, "την"): "her (accusative object: I saw her)",

    # === "who" ===
    (255, "ποιος"): "who? (question: who is it?)",

    # === "or" ===
    (564, "είτε"): "either...or, whether...or",

    # === "each" ===
    (112, "κάθε"): "every, each (indeclinable: every day)",
    (736, "καθένας"): "each one, everyone (pronoun: each person individually)",

    # === "own" ===
    (147, "δικός"): "own (possessive: my own)",
    (156, "ίδιος"): "same, himself",

    # === stem groups ===
    (63, "το μέσο"): "medium; means (means of transport)",
    (435, "η μέση"): "middle; waist (in the middle)",
    (1497, "μέσα"): "inside (inside the house)",
    (1551, "μέσος"): "average, middle (average, mean)",
    (677, "το κόλπο"): "trick, ruse (I know a trick)",
    (762, "ο κόλπος"): "bay, gulf (the Saronic Gulf)",
}

# ═══════════════════════════════════════════════════════════════════════════════
# DELETIONS: set of (rank, greek) to remove
# ═══════════════════════════════════════════════════════════════════════════════

DELETIONS = {
    # Exact duplicates (keep lower rank)
    (2233, "η βρύση"),
    (2301, "ούτε"),
    (2886, "γκρι"),

    # Regular adj/adverb pairs (remove predictable adverb)
    (545, "αριστερά"),
    (706, "σκληρά"),
    (2634, "ίσια"),
    (1874, "ακριβά"),
    (1504, "ανατολικά"),
    (915, "βόρεια"),
    (1690, "δυτικά"),
    (960, "νότια"),
    (1383, "χαμηλά"),
    (2156, "φοβερά"),
    (970, "τεράστια"),
    (429, "τόσος"),
    (385, "πόσος"),

    # Synonym / contraction / plural duplicates
    (421, "επάνω"),
    (43, "στον"),
    (1234, "σύμφωνοι"),
}


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def strip_html(s):
    return re.sub(r'<[^>]*>', '', s).strip()


def get_field_names(models):
    """Return {model_id_str: [field_name_lower, ...]}"""
    result = {}
    for mid, m in models.items():
        result[mid] = [f['name'].lower() for f in m['flds']]
    return result


def get_rank(names, fields):
    for i, n in enumerate(names):
        if n in ('rank', 'frequency', 'freq'):
            try:
                return int(strip_html(fields[i]).strip())
            except:
                pass
    return 0


def get_field_idx(names, hint):
    for i, n in enumerate(names):
        if hint in n:
            return i
    return -1


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

print(f'Backing up {DB_PATH} -> {BACKUP_PATH}')
shutil.copy2(DB_PATH, BACKUP_PATH)

conn = sqlite3.connect(DB_PATH)

# Read model info
col = conn.execute('SELECT models FROM col LIMIT 1').fetchone()
models = json.loads(col[0])
model_fields = get_field_names(models)

# Read all notes with their rank
rows = conn.execute('SELECT id, mid, flds FROM notes').fetchall()

notes = []  # (rank, note_id, mid, flds, fields, names)
for note_id, mid, flds in rows:
    fields = flds.split('\x1f')
    names = model_fields.get(str(mid), [])
    rank = get_rank(names, fields)
    notes.append((rank, note_id, mid, flds, fields, names))

notes.sort(key=lambda x: x[0])

# --- Phase 1: Apply English hint updates ---
updated = 0
for rank, note_id, mid, flds, fields, names in notes:
    greek = fields[1].strip() if len(fields) > 1 else ''
    key = (rank, greek)

    if key in UPDATES:
        en_idx = get_field_idx(names, 'english')
        if en_idx < 0:
            en_idx = 2  # fallback: field index 2 is English

        old_en = fields[en_idx]
        new_en = UPDATES[key]

        if old_en != new_en:
            print(f'  UPDATE rank {rank:>5} {greek:<25} EN: "{old_en}" -> "{new_en}"')
            fields[en_idx] = new_en
            new_flds = '\x1f'.join(fields)
            conn.execute('UPDATE notes SET flds = ? WHERE id = ?', (new_flds, note_id))
            updated += 1

# --- Phase 2: Delete cards ---
deleted_ranks = set()
deleted = 0
for rank, note_id, mid, flds, fields, names in notes:
    greek = fields[1].strip() if len(fields) > 1 else ''
    key = (rank, greek)

    if key in DELETIONS:
        print(f'  DELETE rank {rank:>5} {greek:<25} EN: "{fields[2] if len(fields) > 2 else ""}"')
        # Delete cards referencing this note, then the note itself
        conn.execute('DELETE FROM cards WHERE nid = ?', (note_id,))
        conn.execute('DELETE FROM notes WHERE id = ?', (note_id,))
        deleted_ranks.add(rank)
        deleted += 1

conn.commit()

# --- Phase 3: Re-rank remaining notes sequentially ---
# Re-read notes after deletions
rows = conn.execute('SELECT id, mid, flds FROM notes').fetchall()
remaining = []
for note_id, mid, flds in rows:
    fields = flds.split('\x1f')
    names = model_fields.get(str(mid), [])
    rank = get_rank(names, fields)
    remaining.append((rank, note_id, mid, flds, fields, names))

remaining.sort(key=lambda x: x[0])

# Build old_rank -> new_rank mapping
rank_map = {}  # old_rank -> new_rank
renumbered = 0
for new_rank_idx, (old_rank, note_id, mid, flds, fields, names) in enumerate(remaining):
    new_rank = new_rank_idx + 1
    rank_map[old_rank] = new_rank

    if old_rank != new_rank:
        rank_idx = get_field_idx(names, 'rank')
        if rank_idx < 0:
            rank_idx = 0  # fallback: field 0 is rank

        fields[rank_idx] = str(new_rank)
        new_flds = '\x1f'.join(fields)
        conn.execute('UPDATE notes SET flds = ? WHERE id = ?', (new_flds, note_id))
        renumbered += 1

conn.commit()
conn.close()

# --- Phase 4: Migrate SRS progress JSON ---
if os.path.exists(SRS_PATH):
    with open(SRS_PATH, 'r', encoding='utf-8') as f:
        progress = json.load(f)

    srs = progress.get('srs', {})
    new_srs = {}
    migrated = 0
    dropped = 0

    for key, val in srs.items():
        # Parse key: r{rank}_{dir}
        m = re.match(r'^r(\d+)_(en|gr)$', key)
        if m:
            old_rank = int(m.group(1))
            direction = m.group(2)

            if old_rank in deleted_ranks:
                print(f'  SRS DROP {key} (card deleted)')
                dropped += 1
                continue

            if old_rank in rank_map:
                new_rank = rank_map[old_rank]
                new_key = f'r{new_rank}_{direction}'
                if new_key != key:
                    migrated += 1
                new_srs[new_key] = val
            else:
                # rank not found in DB — keep as-is
                new_srs[key] = val
        else:
            # Non-rank-based key — keep as-is
            new_srs[key] = val

    progress['srs'] = new_srs
    with open(SRS_OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)

    print(f'\n  SRS migrated: {migrated} keys remapped, {dropped} dropped')
    print(f'  Written to {SRS_OUT_PATH}')
else:
    print(f'\n  SRS file not found at {SRS_PATH}, skipping migration')

# --- Summary ---
print(f'\n=== Summary ===')
print(f'English hints updated: {updated}')
print(f'Cards deleted: {deleted}')
print(f'Ranks renumbered: {renumbered}')
print(f'Total notes remaining: {len(remaining)}')
print(f'\nDone! Backup saved as {BACKUP_PATH}')
