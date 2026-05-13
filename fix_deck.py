import sqlite3, json, re, shutil

db_path = 'Learning_Greek_for_Beginners_2500_Most_Common_Greek_Words/collection.anki21'
backup_path = db_path + '.bak'

# Backup first
shutil.copy2(db_path, backup_path)
print(f'Backup created: {backup_path}')

conn = sqlite3.connect(db_path)

# Get model info
col = conn.execute('SELECT models FROM col LIMIT 1').fetchone()
models = json.loads(col[0])
model_fields = {}
for mid, m in models.items():
    model_fields[mid] = [f['name'].lower() for f in m['flds']]

rows = conn.execute('SELECT id, mid, flds FROM notes').fetchall()

def strip_html(s):
    return re.sub(r'<[^>]*>', '', s).strip()

def get_rank(names, fields):
    for i, n in enumerate(names):
        if n in ('rank', 'frequency', 'freq'):
            try:
                return int(strip_html(fields[i]).strip())
            except:
                pass
    return 0

def get_en_idx(names, fields):
    for i, n in enumerate(names):
        if 'english' in n and 'example' not in n and 'sentence' not in n:
            return i
    for i, n in enumerate(names):
        if n in ('en', 'front', 'meaning', 'word', 'translation'):
            return i
    return -1

def get_gr_idx(names, fields):
    for i, n in enumerate(names):
        if 'greek' in n and 'example' not in n and 'sentence' not in n:
            return i
    for i, n in enumerate(names):
        if n in ('gr', 'back', 'target'):
            return i
    return -1

# === REMOVALS (by rank) ===
remove_ranks = {889, 720, 100, 120, 154, 267, 468, 2369, 230, 1375}

# === TRANSLATION UPDATES (by rank -> new english) ===
translation_updates = {
    1: 'to (subjunctive); here (you go)',
    2: 'the (masc. article)',
    4: 'will, would',
    9: 'for; about',
    11: 'what; how (excl.)',
    13: 'that; which; where',
    28: 'that (conjunction)',
    38: 'do; make',
    40: 'like; as; when',
    52: 'so; that much',
    54: 'come; come on',
    64: 'a little; a bit',
    69: 'say; tell',
    79: 'let; may',
    80: 'but; by (oath)',
    132: 'as; until; up to',
    146: 'new; young',
    157: 'anymore; no longer',
    198: 'beyond; across',
    214: 'against; during; according to',
    245: '(not) even',
    260: 'so; so that; therefore',
    284: 'stay; live; remain',
    296: 'hey; man (informal)',
    301: 'very; too (much)',
    313: 'bring; bear; behave',
    344: 'despite; than; minus',
    352: 'put; set',
    422: 'slowly; quietly; as if!',
    480: 'under (formal)',
    507: 'live; be alive',
    548: 'instead of; in exchange for',
    550: 'due to; because of',
    624: "come on; let's go",
    639: 'work; project; film',
    721: 'on; upon; times (math)',
    820: 'therefore; so; then',
    906: 'strength; Rome',
    924: "even if; at least; let's say",
    984: 'next; following; henceforth',
    1013: 'about; approximately',
    1117: 'news (item)',
    1184: 'move; set in motion',
    1360: 'inside; in; means',
    1404: 'for; in favor of; over',
    1688: 'term; condition; mountain',
    1727: 'through; by (formal)',
    1783: 'act; take action',
}

# === GREEK FIELD FIXES (latin chars -> correct greek) ===
latin_greek_fixes = {
    572: 'την',
    2069: 'ούτε',
}

# === ARTICLE FIXES (ordinals: το -> ο) ===
article_fixes = {
    560: 'ο δεύτερος',
    680: 'ο τρίτος',
    1085: 'ο πέμπτος',
    1466: 'ο τέταρτος',
}

# Process
removed = 0
updated_en = 0
updated_gr = 0
updated_art = 0

for note_id, mid, flds in rows:
    fields = flds.split('\x1f')
    names = model_fields.get(str(mid), [])
    rank = get_rank(names, fields)
    en_idx = get_en_idx(names, fields)
    gr_idx = get_gr_idx(names, fields)

    if rank in remove_ranks:
        conn.execute('DELETE FROM notes WHERE id = ?', (note_id,))
        conn.execute('DELETE FROM cards WHERE nid = ?', (note_id,))
        removed += 1
        continue

    changed = False

    if rank in translation_updates and en_idx >= 0:
        fields[en_idx] = translation_updates[rank]
        updated_en += 1
        changed = True

    if rank in latin_greek_fixes and gr_idx >= 0:
        fields[gr_idx] = latin_greek_fixes[rank]
        updated_gr += 1
        changed = True

    if rank in article_fixes and gr_idx >= 0:
        fields[gr_idx] = article_fixes[rank]
        updated_art += 1
        changed = True

    if changed:
        new_flds = '\x1f'.join(fields)
        conn.execute('UPDATE notes SET flds = ? WHERE id = ?', (new_flds, note_id))

conn.commit()
conn.close()

print(f'Removed: {removed} entries')
print(f'Translation updates: {updated_en}')
print(f'Greek field fixes (latin chars): {updated_gr}')
print(f'Article fixes: {updated_art}')
print(f'Total changes: {removed + updated_en + updated_gr + updated_art}')
print()
print('Done! Backup saved as collection.anki21.bak')
