import sqlite3, json, re, shutil, time, hashlib

db_path = 'Learning_Greek_for_Beginners_2500_Most_Common_Greek_Words/collection.anki21'
backup_path = db_path + '.bak2'

shutil.copy2(db_path, backup_path)
print(f'Backup created: {backup_path}')

conn = sqlite3.connect(db_path)

col = conn.execute('SELECT models FROM col LIMIT 1').fetchone()
models = json.loads(col[0])
model_fields = {}
MODEL_ID = None
for mid, m in models.items():
    model_fields[mid] = [f['name'].lower() for f in m['flds']]
    MODEL_ID = int(mid)

DECK_ID = conn.execute('SELECT DISTINCT did FROM cards LIMIT 1').fetchone()[0]

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

def get_field_idx(names, hint):
    for i, n in enumerate(names):
        if hint in n:
            return i
    return -1

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 1: Fix articles and translations in top 500 (using OLD ranks)
# ═══════════════════════════════════════════════════════════════════════════════

article_fixes = {
    84: 'δύο',             # was "το δύο"
    115: 'τα λεφτά',       # was "το λεφτά"
    231: 'τρεις',          # was "το τρεις"
    435: 'τέσσερις',       # was "το τέσσερις"
    483: 'ο αδερφός',      # was "το αδερφός"
}

translation_fixes = {
    55: 'medium; means; middle',
    189: 'help; assistance',
}

updated_art = 0
updated_en = 0

for note_id, mid, flds in rows:
    fields = flds.split('\x1f')
    names = model_fields.get(str(mid), [])
    rank = get_rank(names, fields)
    if rank == 0:
        continue

    gr_idx = get_field_idx(names, 'greek word')
    en_idx = get_field_idx(names, 'english meaning')
    changed = False

    if rank in article_fixes and gr_idx >= 0:
        fields[gr_idx] = article_fixes[rank]
        updated_art += 1
        changed = True

    if rank in translation_fixes and en_idx >= 0:
        fields[en_idx] = translation_fixes[rank]
        updated_en += 1
        changed = True

    if changed:
        new_flds = '\x1f'.join(fields)
        conn.execute('UPDATE notes SET flds = ? WHERE id = ?', (new_flds, note_id))

print(f'Article fixes: {updated_art}')
print(f'Translation fixes: {updated_en}')

# ═══════════════════════════════════════════════════════════════════════════════
# PHASE 2: Insert new words and renumber ALL ranks sequentially
# ═══════════════════════════════════════════════════════════════════════════════

# New words: (insert_before_old_rank, greek, english, sentence_gr, sentence_en)
# "insert_before_old_rank=58" means this new word goes right before old rank 58
new_words = [
    (58,  'φέρνω',        'bring',          'Μπορείς να μου φέρεις ένα ποτήρι νερό;', 'Can you bring me a glass of water?'),
    (96,  'πλένω',        'wash',           'Πλένω τα χέρια μου πριν φάω.', 'I wash my hands before I eat.'),
    (140, 'μαγειρεύω',    'cook',           'Η μαμά μαγειρεύει κάτι νόστιμο απόψε.', 'Mom is cooking something delicious tonight.'),
    (165, 'η ντομάτα',    'tomato',         'Βάλε ντομάτα στη σαλάτα.', 'Put tomato in the salad.'),
    (175, 'η ελιά',       'olive',          'Η Ελλάδα είναι γνωστή για τις ελιές της.', 'Greece is known for its olives.'),
    (185, 'κολυμπάω',     'swim',           'Κολυμπάω στη θάλασσα κάθε καλοκαίρι.', 'I swim in the sea every summer.'),
    (210, 'χτίζω',        'build',          'Χτίζουν ένα καινούργιο σπίτι.', 'They are building a new house.'),
    (225, 'νοικιάζω',     'rent',           'Νοικιάζω ένα διαμέρισμα στο κέντρο.', 'I rent an apartment in the center.'),
    (240, 'η ομπρέλα',    'umbrella',       'Πάρε την ομπρέλα, θα βρέξει.', 'Take the umbrella, it will rain.'),
    (250, 'η βρύση',      'tap; faucet',    'Κλείσε τη βρύση, τρέχει νερό!', 'Close the tap, the water is running!'),
    (265, 'σκουπίζω',     'wipe; sweep',    'Σκουπίζω το πάτωμα κάθε πρωί.', 'I sweep the floor every morning.'),
    (275, 'το κρεμμύδι',  'onion',          'Κόβω κρεμμύδι και κλαίω.', 'I cut an onion and I cry.'),
    (285, 'γκρι',         'grey',           'Ο ουρανός είναι γκρι σήμερα.', 'The sky is grey today.'),
    (295, 'πορτοκαλί',    'orange (color)', 'Φοράει ένα πορτοκαλί φόρεμα.', 'She is wearing an orange dress.'),
]

# Re-read notes after phase 1 edits
rows = conn.execute('SELECT id, mid, flds FROM notes').fetchall()

# Build list of (old_rank, note_id) for existing notes
existing = []
for note_id, mid, flds in rows:
    fields = flds.split('\x1f')
    names = model_fields.get(str(mid), [])
    rank = get_rank(names, fields)
    if rank > 0:
        existing.append((rank, note_id, mid, flds))

existing.sort(key=lambda x: x[0])

# Build merged list: interleave new words at the right positions
# Each entry is either ('existing', old_rank, note_id, mid, flds) or ('new', data...)
merged = []
new_by_pos = {}
for insert_before, gr, en, sg, se in new_words:
    new_by_pos.setdefault(insert_before, []).append((gr, en, sg, se))

for old_rank, note_id, mid, flds in existing:
    # Insert any new words that go before this old rank
    if old_rank in new_by_pos:
        for gr, en, sg, se in new_by_pos[old_rank]:
            merged.append(('new', gr, en, sg, se))
        del new_by_pos[old_rank]
    merged.append(('existing', note_id, mid, flds))

# Any remaining new words (if insert_before was beyond all existing ranks)
for insert_before in sorted(new_by_pos.keys()):
    for gr, en, sg, se in new_by_pos[insert_before]:
        merged.append(('new', gr, en, sg, se))

# Now assign sequential ranks 1, 2, 3, ...
def make_guid(s):
    h = hashlib.sha1(s.encode('utf-8')).digest()
    chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+,-./:;<=>?@[]^_`{|}~'
    result = ''
    num = int.from_bytes(h[:8], 'big')
    while num > 0 and len(result) < 10:
        num, rem = divmod(num, len(chars))
        result += chars[rem]
    return result

def make_checksum(s):
    h = hashlib.sha1(s.encode('utf-8')).hexdigest()
    return int(h[:8], 16)

base_id = int(time.time() * 1000)
now_secs = int(time.time())
shifted = 0
inserted = 0

for new_rank_idx, entry in enumerate(merged):
    new_rank = new_rank_idx + 1

    if entry[0] == 'existing':
        _, note_id, mid, flds = entry
        fields = flds.split('\x1f')
        names = model_fields.get(str(mid), [])
        rank_field_idx = get_field_idx(names, 'rank')
        old_rank = get_rank(names, fields)

        if rank_field_idx >= 0 and old_rank != new_rank:
            fields[rank_field_idx] = str(new_rank)
            new_flds = '\x1f'.join(fields)
            conn.execute('UPDATE notes SET flds = ? WHERE id = ?', (new_flds, note_id))
            shifted += 1

    elif entry[0] == 'new':
        _, gr, en, sg, se = entry
        note_id = base_id + inserted * 2
        card_id = base_id + inserted * 2 + 1

        flds = '\x1f'.join([str(new_rank), gr, en, sg, se, '', '', ''])
        guid = make_guid(f'{gr}_{en}_{new_rank}')
        sfld = gr
        csum = make_checksum(sfld)

        conn.execute(
            'INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            (note_id, guid, MODEL_ID, now_secs, -1, '', flds, sfld, csum, 0, '')
        )
        conn.execute(
            'INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (card_id, note_id, DECK_ID, 0, now_secs, -1, 0, 0, new_rank, 0, 0, 0, 0, 0, 0, 0, 0, '{}')
        )
        inserted += 1
        print(f'  Inserted rank {new_rank}: {gr} = {en}')

conn.commit()
conn.close()

print()
print(f'=== Summary ===')
print(f'Article fixes (top 500): {updated_art}')
print(f'Translation fixes (top 500): {updated_en}')
print(f'Existing ranks renumbered: {shifted}')
print(f'New words inserted: {inserted}')
print(f'Total entries now: {len(merged)}')
print()
print('Done! Backup saved as collection.anki21.bak2')
