"""
Check whether every example sentence in the Anki deck is composed only of
words that appear as individual vocabulary entries in the same deck.

Uses Stanza (Stanford NLP) for Greek lemmatization — much more accurate than
spaCy for Greek verb conjugation/declension.

Deck field layout (from the "Greek Multi" model):
  [0] Rank           – numeric frequency rank
  [1] Greek Word     – the vocabulary word
  [2] English Meaning– English translation
  [3] Greek Example  – example sentence in Greek
  [4] English Example– sentence translation
  [5] Audio          – word audio
  [6] Audio2         – sentence audio
  [7] Silent         – silence file

Usage:
    python check_sentences.py [path_to.apkg]
"""

import glob
import html
import json
import os
import re
import sqlite3
import sys
import zipfile

import stanza

# ── Exact field indices for "Greek Multi" model ─────────────────────────────
RANK_IDX = 0
GREEK_WORD_IDX = 1
ENGLISH_MEANING_IDX = 2
GREEK_EXAMPLE_IDX = 3

# ── helpers ──────────────────────────────────────────────────────────────────

def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]*>", "", s)
    s = html.unescape(s)
    return s.strip()

def strip_sound(s: str) -> str:
    return re.sub(r"\[sound:[^\]]+\]", "", s)

def clean(s: str) -> str:
    return strip_html(strip_sound(s))


# ── extraction ───────────────────────────────────────────────────────────────

def extract_from_apkg(apkg_path: str):
    """Return (words, sentences) using the known field layout."""

    with zipfile.ZipFile(apkg_path) as z:
        db_name = None
        for name in z.namelist():
            if name in ('collection.anki21', 'collection.anki2'):
                db_name = name
                break
        if not db_name:
            raise RuntimeError('No collection database in .apkg')

        db_path = os.path.join(os.path.dirname(os.path.abspath(apkg_path)), '_temp_col.db')
        try:
            with open(db_path, 'wb') as f:
                f.write(z.read(db_name))

            conn = sqlite3.connect(db_path)
            rows = conn.execute("SELECT mid, flds FROM notes").fetchall()
            conn.close()
        finally:
            try:
                os.remove(db_path)
            except OSError:
                pass

    words = []
    sentences = []
    seen = set()

    for _mid, flds_str in rows:
        fields = flds_str.split('\x1f')
        if len(fields) <= max(RANK_IDX, GREEK_WORD_IDX, ENGLISH_MEANING_IDX, GREEK_EXAMPLE_IDX):
            continue

        gr = clean(fields[GREEK_WORD_IDX])
        en = clean(fields[ENGLISH_MEANING_IDX])
        if not gr or not en:
            continue

        key = en.lower() + '|' + gr.lower()
        if key in seen:
            continue
        seen.add(key)

        rank_str = clean(fields[RANK_IDX])
        try:
            rank = int(rank_str)
        except ValueError:
            continue

        words.append({'en': en, 'gr': gr, 'rank': rank})

        sentence = clean(fields[GREEK_EXAMPLE_IDX])
        if sentence:
            sentences.append({
                'rank': rank,
                'gr_word': gr,
                'en_word': en,
                'sentence': sentence,
            })

    words.sort(key=lambda w: w['rank'])
    sentences.sort(key=lambda s: s['rank'])
    return words, sentences


# ── analysis ─────────────────────────────────────────────────────────────────

def analyse(words, sentences, nlp):
    """For each sentence, check if every word's lemma is found in the deck vocabulary."""

    # ── Step 1: Collect all deck word variants ───────────────────────────────
    # Build a list of individual Greek word parts from the deck, expanding
    # parenthesized forms and comma/slash-separated entries.
    vocab_parts = []  # all individual parts we need to lemmatize
    for w in words:
        gr = w['gr'].strip()
        expanded = [gr]
        paren_match = re.match(r'^(.+)\((.+)\)$', gr)
        if paren_match:
            base, suffix = paren_match.groups()
            expanded = [base.strip(), (base + suffix).strip()]

        for variant in expanded:
            for part in re.split(r'[,/]', variant):
                part = part.strip()
                if part:
                    vocab_parts.append(part)

    # ── Step 2: Batch-lemmatize vocab words ──────────────────────────────────
    # Join all vocab parts into one big text separated by newlines (each line
    # becomes a separate sentence for Stanza).
    print("  Lemmatizing deck vocabulary (batch)...")
    sys.stdout.flush()
    vocab_text = '\n'.join(vocab_parts)
    vocab_doc = nlp(vocab_text)

    known_lemmas = set()
    known_surface = set()

    for sent in vocab_doc.sentences:
        for tok in sent.words:
            if tok.upos == 'PUNCT':
                continue
            known_lemmas.add(tok.lemma.lower())
            known_surface.add(tok.text.lower())
    # Also add the raw parts as surface forms
    for p in vocab_parts:
        known_surface.add(p.lower())

    print(f"  {len(known_lemmas)} lemmas, {len(known_surface)} surface forms from vocab")
    sys.stdout.flush()

    # ── Step 3: Batch-lemmatize ALL sentences ────────────────────────────────
    # Join all sentences with newlines and process in one call.
    print("  Lemmatizing all sentences (batch)...")
    sys.stdout.flush()
    all_sentence_texts = [s['sentence'] for s in sentences]
    big_text = '\n'.join(all_sentence_texts)
    sent_doc = nlp(big_text)

    # Map each Stanza sentence back to our sentence list.
    # Stanza should produce one sentence per newline-separated line.
    # Collect per-sentence token info.
    sent_tokens = []  # list of lists of (surface, lemma, upos)
    for stanza_sent in sent_doc.sentences:
        toks = []
        for tok in stanza_sent.words:
            toks.append((tok.text, tok.lemma, tok.upos))
        sent_tokens.append(toks)

    # Stanza may split differently than our newlines. If counts don't match,
    # fall back to processing individually (shouldn't happen with newline sep).
    if len(sent_tokens) != len(sentences):
        print(f"  WARNING: Stanza produced {len(sent_tokens)} sentences, expected {len(sentences)}.")
        print(f"  Falling back to individual processing...")
        sys.stdout.flush()
        sent_tokens = []
        for s in sentences:
            doc = nlp(s['sentence'])
            toks = []
            for st_sent in doc.sentences:
                for tok in st_sent.words:
                    toks.append((tok.text, tok.lemma, tok.upos))
            sent_tokens.append(toks)

    # ── Step 4: Enrich vocab set with contextual lemmas ──────────────────────
    # If a sentence token's surface form matches a known deck word, also add
    # whatever lemma Stanza assigned it in context.
    for toks in sent_tokens:
        for surf, lemma, upos in toks:
            if upos == 'PUNCT':
                continue
            if surf.lower() in known_surface:
                known_lemmas.add(lemma.lower())

    print(f"  Final: {len(known_lemmas)} lemmas, {len(known_surface)} surface forms\n")
    sys.stdout.flush()

    # ── Step 5: Check each sentence ──────────────────────────────────────────
    problems = []
    ok_count = 0

    for s, toks in zip(sentences, sent_tokens):
        unknown = []
        for surf, lemma, upos in toks:
            if upos in ('PUNCT', 'SYM', 'X'):
                continue

            lemma_l = lemma.lower()
            surf_l = surf.lower()

            if lemma_l not in known_lemmas and surf_l not in known_surface:
                unknown.append((surf, lemma))

        if unknown:
            problems.append({
                'rank': s['rank'],
                'gr_word': s['gr_word'],
                'en_word': s['en_word'],
                'sentence': s['sentence'],
                'unknown': unknown,
            })
        else:
            ok_count += 1

    return problems, ok_count


# ── output ───────────────────────────────────────────────────────────────────

def print_report(problems, ok_count, total):
    print("=" * 70)
    print("SENTENCE ANALYSIS REPORT")
    print("=" * 70)
    print(f"Total sentences checked : {total}")
    if total:
        print(f"Sentences OK            : {ok_count}  ({100*ok_count/total:.1f}%)")
        print(f"Sentences with unknowns : {len(problems)}  ({100*len(problems)/total:.1f}%)")
    print("=" * 70)

    if not problems:
        print("\nAll sentences use only vocabulary from the deck!")
        return

    # Collect all unknown lemmas across all sentences
    all_unknown = {}
    for p in problems:
        for surface, lemma in p['unknown']:
            if lemma not in all_unknown:
                all_unknown[lemma] = {'count': 0, 'surfaces': set()}
            all_unknown[lemma]['count'] += 1
            all_unknown[lemma]['surfaces'].add(surface)

    print(f"\n{'─' * 70}")
    print(f"MOST COMMON UNKNOWN WORDS (top 50)")
    print(f"{'─' * 70}")
    for lemma, info in sorted(all_unknown.items(), key=lambda x: -x[1]['count'])[:50]:
        surfaces = ', '.join(sorted(info['surfaces']))
        print(f"  {lemma:<25} (appears {info['count']}x) forms: {surfaces}")

    print(f"\n{'─' * 70}")
    print(f"TOTAL UNIQUE UNKNOWN LEMMAS: {len(all_unknown)}")
    print(f"{'─' * 70}")

    print(f"\n{'─' * 70}")
    print("SENTENCES WITH UNKNOWN WORDS (by rank)")
    print(f"{'─' * 70}")
    for p in problems:
        unknown_str = ', '.join(f"{s} -> {l}" for s, l in p['unknown'])
        print(f"\n  Rank {p['rank']}: {p['gr_word']} ({p['en_word']})")
        print(f"  Sentence: {p['sentence']}")
        print(f"  Unknown:  {unknown_str}")


# ── entry ────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) > 1:
        apkg = sys.argv[1]
    else:
        apkgs = glob.glob("*.apkg")
        if not apkgs:
            print("No .apkg file found in current directory. Pass path as argument.")
            sys.exit(1)
        apkg = apkgs[0]

    print(f"Loading: {apkg}")
    words, sentences = extract_from_apkg(apkg)
    print(f"Extracted {len(words)} words, {len(sentences)} sentences\n")

    if not sentences:
        print("No example sentences found in this deck.")
        sys.exit(0)

    print("Loading Stanza Greek model...")
    sys.stdout.flush()
    nlp = stanza.Pipeline('el', processors='tokenize,pos,lemma', verbose=False)

    problems, ok_count = analyse(words, sentences, nlp)
    print_report(problems, ok_count, len(sentences))


if __name__ == '__main__':
    main()
