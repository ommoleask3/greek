// ═══════════════════════════════════════════════════════════════════════════════
// GRAMMAR LESSON DATA
// ═══════════════════════════════════════════════════════════════════════════════
// Each lesson has sections: text, table, exercise
// Exercises: fill-blank (with options) or multiple-choice
// Greek words can use gw() for hoverable tooltips

const GRAMMAR_LESSONS = [
  {
    id: 'articles-gender',
    title: 'Άρθρα & Γένος',
    titleEn: 'Articles & Gender',
    description: 'Οριστικά και αόριστα άρθρα',
    descriptionEn: 'Definite and indefinite articles',
    sections: [
      {
        type: 'text',
        content:
          'Στα ελληνικά, κάθε ουσιαστικό έχει <strong>γένος</strong>: αρσενικό, θηλυκό ή ουδέτερο. Το άρθρο αλλάζει ανάλογα με το γένος.',
        contentEn:
          'In Greek, every noun has a <strong>gender</strong>: masculine, feminine, or neuter. The article changes based on gender.',
      },
      {
        type: 'text',
        content: '<strong>Οριστικά άρθρα</strong> (the):',
        contentEn: '<strong>Definite articles</strong> (the):',
      },
      {
        type: 'table',
        headers: ['', 'Αρσενικό (m)', 'Θηλυκό (f)', 'Ουδέτερο (n)'],
        rows: [
          [
            'Ενικός',
            '<span class="gw" data-en="the (m)">ο</span>',
            '<span class="gw" data-en="the (f)">η</span>',
            '<span class="gw" data-en="the (n)">το</span>',
          ],
          [
            'Πληθυντικός',
            '<span class="gw" data-en="the (m.pl)">οι</span>',
            '<span class="gw" data-en="the (f.pl)">οι</span>',
            '<span class="gw" data-en="the (n.pl)">τα</span>',
          ],
        ],
      },
      {
        type: 'text',
        content: '<strong>Αόριστα άρθρα</strong> (a/an) — μόνο ενικός:',
        contentEn: '<strong>Indefinite articles</strong> (a/an) — singular only:',
      },
      {
        type: 'table',
        headers: ['Αρσενικό', 'Θηλυκό', 'Ουδέτερο'],
        rows: [
          [
            '<span class="gw" data-en="a (m)">ένας</span>',
            '<span class="gw" data-en="a (f)">μία / μια</span>',
            '<span class="gw" data-en="a (n)">ένα</span>',
          ],
        ],
      },
      {
        type: 'text',
        content:
          '<strong>Πώς αναγνωρίζουμε το γένος;</strong> Συνήθεις καταλήξεις:<br>Αρσενικά: -ος, -ης, -ας → <span class="gw" data-en="man" data-info="m">ο άντρας</span>, <span class="gw" data-en="student" data-info="m">ο μαθητής</span><br>Θηλυκά: -α, -η, -ση → <span class="gw" data-en="woman" data-info="f">η γυναίκα</span>, <span class="gw" data-en="city" data-info="f">η πόλη</span><br>Ουδέτερα: -ο, -ι, -μα → <span class="gw" data-en="book" data-info="n">το βιβλίο</span>, <span class="gw" data-en="child" data-info="n">το παιδί</span>',
        contentEn:
          '<strong>How to recognize gender?</strong> Common endings:<br>Masculine: -ος, -ης, -ας → <span class="gw" data-en="man" data-info="m">ο άντρας</span>, <span class="gw" data-en="student" data-info="m">ο μαθητής</span><br>Feminine: -α, -η, -ση → <span class="gw" data-en="woman" data-info="f">η γυναίκα</span>, <span class="gw" data-en="city" data-info="f">η πόλη</span><br>Neuter: -ο, -ι, -μα → <span class="gw" data-en="book" data-info="n">το βιβλίο</span>, <span class="gw" data-en="child" data-info="n">το παιδί</span>',
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: '___ σπίτι είναι μεγάλο. (the house is big)',
        answer: 'Το',
        options: ['Ο', 'Η', 'Το', 'Οι'],
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: '___ γυναίκα μιλάει ελληνικά. (the woman speaks Greek)',
        answer: 'Η',
        options: ['Ο', 'Η', 'Το', 'Ένα'],
      },
      {
        type: 'exercise',
        kind: 'multiple-choice',
        question: 'Ποιο είναι το σωστό άρθρο; ___ καφές',
        questionEn: 'Which is the correct article? ___ καφές',
        correct: 0,
        options: ['ο', 'η', 'το', 'ένα'],
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: 'Θέλω ___ βιβλίο. (I want a book)',
        answer: 'ένα',
        options: ['ένας', 'μία', 'ένα', 'το'],
      },
    ],
  },
  {
    id: 'present-tense-1',
    title: 'Ενεστώτας: ρήματα σε -ω',
    titleEn: 'Present Tense: -ω verbs',
    description: 'Κλίση ρημάτων πρώτης συζυγίας',
    descriptionEn: 'Group 1 verb conjugation',
    sections: [
      {
        type: 'text',
        content:
          'Τα πιο συνηθισμένα ρήματα τελειώνουν σε <strong>-ω</strong>. Η κλίση είναι κανονική — αλλάζει μόνο η κατάληξη.',
        contentEn:
          'The most common verbs end in <strong>-ω</strong>. Conjugation is regular — only the ending changes.',
      },
      {
        type: 'text',
        content: '<strong>Κατάληξη:</strong> -ω, -εις, -ει, -ουμε, -ετε, -ουν',
        contentEn: '<strong>Pattern:</strong> -ω, -εις, -ει, -ουμε, -ετε, -ουν',
      },
      {
        type: 'table',
        headers: ['Πρόσωπο', 'θέλω (want)', 'γράφω (write)', 'κατάληξη'],
        rows: [
          [
            'εγώ',
            '<span class="gw" data-en="I want">θέλω</span>',
            '<span class="gw" data-en="I write">γράφω</span>',
            '-ω',
          ],
          [
            'εσύ',
            '<span class="gw" data-en="you want">θέλεις</span>',
            '<span class="gw" data-en="you write">γράφεις</span>',
            '-εις',
          ],
          [
            'αυτός/ή/ό',
            '<span class="gw" data-en="he/she wants">θέλει</span>',
            '<span class="gw" data-en="he/she writes">γράφει</span>',
            '-ει',
          ],
          [
            'εμείς',
            '<span class="gw" data-en="we want">θέλουμε</span>',
            '<span class="gw" data-en="we write">γράφουμε</span>',
            '-ουμε',
          ],
          [
            'εσείς',
            '<span class="gw" data-en="you want (pl)">θέλετε</span>',
            '<span class="gw" data-en="you write (pl)">γράφετε</span>',
            '-ετε',
          ],
          [
            'αυτοί/ές/ά',
            '<span class="gw" data-en="they want">θέλουν</span>',
            '<span class="gw" data-en="they write">γράφουν</span>',
            '-ουν',
          ],
        ],
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: 'Εμείς ___ νερό. (We drink water)',
        answer: 'πίνουμε',
        options: ['πίνω', 'πίνεις', 'πίνουμε', 'πίνουν'],
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: 'Αυτοί ___ ένα βιβλίο. (They write a book)',
        answer: 'γράφουν',
        options: ['γράφω', 'γράφει', 'γράφετε', 'γράφουν'],
      },
      {
        type: 'exercise',
        kind: 'multiple-choice',
        question: 'Εσύ ___ ελληνικά; (Do you know Greek?)',
        questionEn: 'Εσύ ___ ελληνικά? (Do you know Greek?)',
        correct: 1,
        options: ['ξέρω', 'ξέρεις', 'ξέρει', 'ξέρουμε'],
      },
    ],
  },
  {
    id: 'present-tense-2',
    title: 'Ενεστώτας: ρήματα σε -ώ/-άω',
    titleEn: 'Present Tense: -ώ/-άω verbs',
    description: 'Κλίση ρημάτων δεύτερης συζυγίας',
    descriptionEn: 'Group 2 verb conjugation',
    sections: [
      {
        type: 'text',
        content:
          'Η δεύτερη ομάδα ρημάτων τελειώνει σε <strong>-ώ</strong> ή <strong>-άω</strong>. Έχουν διαφορετικές καταλήξεις από τα ρήματα σε -ω.',
        contentEn:
          'The second group of verbs ends in <strong>-ώ</strong> or <strong>-άω</strong>. They have different endings from -ω verbs.',
      },
      {
        type: 'text',
        content:
          '<strong>-άω ρήματα:</strong> -άω, -άς, -άει, -άμε, -άτε, -άνε<br><strong>-ώ ρήματα:</strong> -ώ, -είς, -εί, -ούμε, -είτε, -ούν',
        contentEn:
          '<strong>-άω verbs:</strong> -άω, -άς, -άει, -άμε, -άτε, -άνε<br><strong>-ώ verbs:</strong> -ώ, -είς, -εί, -ούμε, -είτε, -ούν',
      },
      {
        type: 'table',
        headers: ['Πρόσωπο', 'μιλάω (speak)', 'μπορώ (can)'],
        rows: [
          ['εγώ', '<span class="gw" data-en="I speak">μιλάω</span>', '<span class="gw" data-en="I can">μπορώ</span>'],
          [
            'εσύ',
            '<span class="gw" data-en="you speak">μιλάς</span>',
            '<span class="gw" data-en="you can">μπορείς</span>',
          ],
          [
            'αυτός/ή/ό',
            '<span class="gw" data-en="he/she speaks">μιλάει</span>',
            '<span class="gw" data-en="he/she can">μπορεί</span>',
          ],
          [
            'εμείς',
            '<span class="gw" data-en="we speak">μιλάμε</span>',
            '<span class="gw" data-en="we can">μπορούμε</span>',
          ],
          [
            'εσείς',
            '<span class="gw" data-en="you speak (pl)">μιλάτε</span>',
            '<span class="gw" data-en="you can (pl)">μπορείτε</span>',
          ],
          [
            'αυτοί/ές/ά',
            '<span class="gw" data-en="they speak">μιλάνε</span>',
            '<span class="gw" data-en="they can">μπορούν</span>',
          ],
        ],
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: 'Εσείς ___ ελληνικά; (Do you speak Greek?)',
        answer: 'μιλάτε',
        options: ['μιλάω', 'μιλάς', 'μιλάτε', 'μιλάνε'],
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: 'Αυτή ___ να τραγουδήσει. (She can sing)',
        answer: 'μπορεί',
        options: ['μπορώ', 'μπορείς', 'μπορεί', 'μπορούν'],
      },
      {
        type: 'exercise',
        kind: 'multiple-choice',
        question: 'Εμείς ___ τα παιδιά μας. (We love our children)',
        questionEn: 'Εμείς ___ τα παιδιά μας. (We love our children)',
        correct: 2,
        options: ['αγαπάω', 'αγαπάς', 'αγαπάμε', 'αγαπάνε'],
      },
    ],
  },
  {
    id: 'to-be-to-have',
    title: 'Είμαι & Έχω',
    titleEn: 'To Be & To Have',
    description: 'Τα δύο πιο σημαντικά ρήματα',
    descriptionEn: 'The two most important verbs',
    sections: [
      {
        type: 'text',
        content:
          'Τα ρήματα <span class="gw" data-en="to be">είμαι</span> και <span class="gw" data-en="to have">έχω</span> είναι τα πιο χρήσιμα στα ελληνικά. Το «είμαι» είναι ανώμαλο, το «έχω» ακολουθεί κανονική κλίση.',
        contentEn:
          'The verbs <span class="gw" data-en="to be">είμαι</span> and <span class="gw" data-en="to have">έχω</span> are the most useful in Greek. "Είμαι" is irregular, "έχω" follows a regular pattern.',
      },
      {
        type: 'table',
        headers: ['Πρόσωπο', 'είμαι (to be)', 'έχω (to have)'],
        rows: [
          ['εγώ', '<span class="gw" data-en="I am">είμαι</span>', '<span class="gw" data-en="I have">έχω</span>'],
          [
            'εσύ',
            '<span class="gw" data-en="you are">είσαι</span>',
            '<span class="gw" data-en="you have">έχεις</span>',
          ],
          [
            'αυτός/ή/ό',
            '<span class="gw" data-en="he/she is">είναι</span>',
            '<span class="gw" data-en="he/she has">έχει</span>',
          ],
          [
            'εμείς',
            '<span class="gw" data-en="we are">είμαστε</span>',
            '<span class="gw" data-en="we have">έχουμε</span>',
          ],
          [
            'εσείς',
            '<span class="gw" data-en="you are (pl)">είστε</span>',
            '<span class="gw" data-en="you have (pl)">έχετε</span>',
          ],
          [
            'αυτοί/ές/ά',
            '<span class="gw" data-en="they are">είναι</span>',
            '<span class="gw" data-en="they have">έχουν</span>',
          ],
        ],
      },
      {
        type: 'text',
        content:
          'Πρόσεξε: <span class="gw" data-en="he/she is">είναι</span> = <span class="gw" data-en="they are">είναι</span>. Ίδια μορφή για 3ο ενικό και 3ο πληθυντικό!',
        contentEn:
          'Notice: <span class="gw" data-en="he/she is">είναι</span> = <span class="gw" data-en="they are">είναι</span>. Same form for 3rd singular and 3rd plural!',
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: 'Εμείς ___ Έλληνες. (We are Greek)',
        answer: 'είμαστε',
        options: ['είμαι', 'είσαι', 'είμαστε', 'είναι'],
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: 'Εσύ ___ αυτοκίνητο; (Do you have a car?)',
        answer: 'έχεις',
        options: ['έχω', 'έχεις', 'έχει', 'έχουμε'],
      },
      {
        type: 'exercise',
        kind: 'multiple-choice',
        question: 'Αυτοί ___ καλά. (They are well)',
        questionEn: 'Αυτοί ___ καλά. (They are well)',
        correct: 3,
        options: ['είμαι', 'είσαι', 'είστε', 'είναι'],
      },
    ],
  },
  {
    id: 'cases',
    title: 'Πτώσεις: ονομαστική & αιτιατική',
    titleEn: 'Cases: Nominative & Accusative',
    description: 'Πότε αλλάζουν τα άρθρα και τα ουσιαστικά',
    descriptionEn: 'When articles and nouns change form',
    sections: [
      {
        type: 'text',
        content:
          'Τα ελληνικά έχουν <strong>πτώσεις</strong> — η μορφή του ουσιαστικού αλλάζει ανάλογα με τη θέση του στην πρόταση. Οι δύο πιο σημαντικές:<br><br><strong>Ονομαστική</strong> = υποκείμενο (ποιος κάνει)<br><strong>Αιτιατική</strong> = αντικείμενο (τι δέχεται την ενέργεια)',
        contentEn:
          'Greek has <strong>cases</strong> — the form of nouns changes based on their role in the sentence. The two most important:<br><br><strong>Nominative</strong> = subject (who does it)<br><strong>Accusative</strong> = object (what receives the action)',
      },
      {
        type: 'table',
        headers: ['', 'Αρσ. (m)', 'Θηλ. (f)', 'Ουδ. (n)'],
        rows: [
          [
            'Ονομαστική (ο/η/το)',
            'ο, τον → <strong>ο</strong>',
            'η, την → <strong>η</strong>',
            'το → <strong>το</strong>',
          ],
          ['Αιτιατική', '<strong>τον</strong>', '<strong>την</strong>', '<strong>το</strong>'],
        ],
      },
      {
        type: 'text',
        content:
          'Παράδειγμα:<br><span class="gw" data-en="the man" data-info="nom.">Ο άντρας</span> βλέπει <span class="gw" data-en="the woman" data-info="acc.">την γυναίκα</span>.<br>(The man sees the woman)',
        contentEn:
          'Example:<br><span class="gw" data-en="the man" data-info="nom.">Ο άντρας</span> βλέπει <span class="gw" data-en="the woman" data-info="acc.">την γυναίκα</span>.<br>(The man sees the woman)',
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: 'Βλέπω ___ δρόμο. (I see the street — m.acc.)',
        answer: 'τον',
        options: ['ο', 'τον', 'την', 'το'],
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: '___ γυναίκα πίνει καφέ. (The woman drinks coffee — f.nom.)',
        answer: 'Η',
        options: ['Η', 'Την', 'Ο', 'Το'],
      },
    ],
  },
  {
    id: 'pronouns',
    title: 'Αντωνυμίες',
    titleEn: 'Pronouns',
    description: 'Προσωπικές και κτητικές αντωνυμίες',
    descriptionEn: 'Personal and possessive pronouns',
    sections: [
      {
        type: 'text',
        content:
          '<strong>Προσωπικές αντωνυμίες</strong> — Στα ελληνικά μπορείς να παραλείψεις το υποκείμενο γιατί το ρήμα δείχνει ποιος μιλάει.',
        contentEn:
          '<strong>Personal pronouns</strong> — In Greek you can often drop the subject pronoun because the verb ending shows who is speaking.',
      },
      {
        type: 'table',
        headers: ['Πρόσωπο', 'Υποκείμενο', 'Αντικείμενο (αδύνατο)', 'Αντικείμενο (δυνατό)'],
        rows: [
          [
            'εγώ',
            '<span class="gw" data-en="I">εγώ</span>',
            '<span class="gw" data-en="me">με</span>',
            '<span class="gw" data-en="me (strong)">εμένα</span>',
          ],
          [
            'εσύ',
            '<span class="gw" data-en="you">εσύ</span>',
            '<span class="gw" data-en="you (obj)">σε</span>',
            '<span class="gw" data-en="you (strong)">εσένα</span>',
          ],
          [
            'αυτός',
            '<span class="gw" data-en="he">αυτός</span>',
            '<span class="gw" data-en="him">τον</span>',
            '<span class="gw" data-en="him (strong)">αυτόν</span>',
          ],
          [
            'αυτή',
            '<span class="gw" data-en="she">αυτή</span>',
            '<span class="gw" data-en="her">την</span>',
            '<span class="gw" data-en="her (strong)">αυτήν</span>',
          ],
          [
            'αυτό',
            '<span class="gw" data-en="it">αυτό</span>',
            '<span class="gw" data-en="it (obj)">το</span>',
            '<span class="gw" data-en="it (strong)">αυτό</span>',
          ],
          [
            'εμείς',
            '<span class="gw" data-en="we">εμείς</span>',
            '<span class="gw" data-en="us">μας</span>',
            '<span class="gw" data-en="us (strong)">εμάς</span>',
          ],
          [
            'εσείς',
            '<span class="gw" data-en="you (pl)">εσείς</span>',
            '<span class="gw" data-en="you (pl obj)">σας</span>',
            '<span class="gw" data-en="you (pl strong)">εσάς</span>',
          ],
          [
            'αυτοί',
            '<span class="gw" data-en="they (m)">αυτοί</span>',
            '<span class="gw" data-en="them">τους</span>',
            '<span class="gw" data-en="them (strong)">αυτούς</span>',
          ],
        ],
      },
      {
        type: 'text',
        content:
          'Η αδύνατη μορφή μπαίνει <strong>πριν</strong> το ρήμα: <span class="gw" data-en="him">Τον</span> <span class="gw" data-en="I see">βλέπω</span>. (I see him)<br>Η δυνατή μορφή χρησιμοποιείται για έμφαση: Βλέπω <span class="gw" data-en="him (strong)">αυτόν</span>, όχι εσένα.',
        contentEn:
          'The weak form goes <strong>before</strong> the verb: <span class="gw" data-en="him">Τον</span> <span class="gw" data-en="I see">βλέπω</span>. (I see him)<br>The strong form is used for emphasis: Βλέπω <span class="gw" data-en="him (strong)">αυτόν</span>, όχι εσένα.',
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: '___ βλέπω κάθε μέρα. (I see her every day)',
        answer: 'Την',
        options: ['Τον', 'Την', 'Το', 'Μας'],
      },
      {
        type: 'exercise',
        kind: 'multiple-choice',
        question: 'Αυτός ___ αγαπάει. (He loves us)',
        questionEn: 'Αυτός ___ αγαπάει. (He loves us)',
        correct: 2,
        options: ['σε', 'τους', 'μας', 'με'],
      },
    ],
  },
  {
    id: 'negation-questions',
    title: 'Άρνηση & Ερωτήσεις',
    titleEn: 'Negation & Questions',
    description: 'Πώς λέμε «όχι» και κάνουμε ερωτήσεις',
    descriptionEn: 'How to say "no" and ask questions',
    sections: [
      {
        type: 'text',
        content:
          '<strong>Άρνηση:</strong> Βάζουμε <span class="gw" data-en="not">δεν</span> πριν το ρήμα.<br><br><span class="gw" data-en="I know">Ξέρω</span> → <span class="gw" data-en="not">Δεν</span> <span class="gw" data-en="I know">ξέρω</span> (I don\'t know)<br><span class="gw" data-en="he wants">Θέλει</span> → <span class="gw" data-en="not">Δεν</span> <span class="gw" data-en="he wants">θέλει</span> (He doesn\'t want)',
        contentEn:
          '<strong>Negation:</strong> Put <span class="gw" data-en="not">δεν</span> before the verb.<br><br><span class="gw" data-en="I know">Ξέρω</span> → <span class="gw" data-en="not">Δεν</span> <span class="gw" data-en="I know">ξέρω</span> (I don\'t know)<br><span class="gw" data-en="he wants">Θέλει</span> → <span class="gw" data-en="not">Δεν</span> <span class="gw" data-en="he wants">θέλει</span> (He doesn\'t want)',
      },
      {
        type: 'text',
        content:
          '<strong>Ερωτήσεις:</strong> Η σειρά λέξεων δεν αλλάζει — μόνο ο τόνος φωνής (και το ερωτηματικό ;).<br><br>Μιλάς ελληνικά. → Μιλάς ελληνικά; (Do you speak Greek?)<br><br>Ερωτηματικές λέξεις: <span class="gw" data-en="what">τι</span>, <span class="gw" data-en="where">πού</span>, <span class="gw" data-en="when">πότε</span>, <span class="gw" data-en="how">πώς</span>, <span class="gw" data-en="why">γιατί</span>, <span class="gw" data-en="who">ποιος</span>',
        contentEn:
          '<strong>Questions:</strong> Word order doesn\'t change — just intonation (and the question mark ;).<br><br>Μιλάς ελληνικά. → Μιλάς ελληνικά; (Do you speak Greek?)<br><br>Question words: <span class="gw" data-en="what">τι</span>, <span class="gw" data-en="where">πού</span>, <span class="gw" data-en="when">πότε</span>, <span class="gw" data-en="how">πώς</span>, <span class="gw" data-en="why">γιατί</span>, <span class="gw" data-en="who">ποιος</span>',
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: "___ θέλω καφέ. (I don't want coffee)",
        answer: 'Δεν',
        options: ['Δεν', 'Μη', 'Όχι', 'Ναι'],
      },
      {
        type: 'exercise',
        kind: 'multiple-choice',
        question: '___ είναι αυτός; (Who is he?)',
        questionEn: '___ είναι αυτός; (Who is he?)',
        correct: 1,
        options: ['Τι', 'Ποιος', 'Πού', 'Πότε'],
      },
    ],
  },
  {
    id: 'prepositions-syntax',
    title: 'Προθέσεις & Σύνταξη',
    titleEn: 'Prepositions & Syntax',
    description: 'Βασικές προθέσεις και σειρά λέξεων',
    descriptionEn: 'Basic prepositions and word order',
    sections: [
      {
        type: 'text',
        content:
          '<strong>Σειρά λέξεων:</strong> Τα ελληνικά ακολουθούν Υποκείμενο-Ρήμα-Αντικείμενο (SVO), όπως τα αγγλικά:<br><br><span class="gw" data-en="the man" data-info="subject">Ο άντρας</span> <span class="gw" data-en="reads" data-info="verb">διαβάζει</span> <span class="gw" data-en="the book" data-info="object">το βιβλίο</span>.',
        contentEn:
          '<strong>Word order:</strong> Greek follows Subject-Verb-Object (SVO), like English:<br><br><span class="gw" data-en="the man" data-info="subject">Ο άντρας</span> <span class="gw" data-en="reads" data-info="verb">διαβάζει</span> <span class="gw" data-en="the book" data-info="object">το βιβλίο</span>.',
      },
      {
        type: 'text',
        content: '<strong>Βασικές προθέσεις:</strong>',
        contentEn: '<strong>Common prepositions:</strong>',
      },
      {
        type: 'table',
        headers: ['Ελληνικά', 'English', 'Παράδειγμα'],
        rows: [
          ['<span class="gw" data-en="in/to">σε</span>', 'in, to, at', 'Πάω <strong>στο</strong> σχολείο (σε+το)'],
          ['<span class="gw" data-en="from">από</span>', 'from', 'Είμαι <strong>από</strong> την Αθήνα'],
          ['<span class="gw" data-en="with">με</span>', 'with', 'Πάω <strong>με</strong> τον φίλο μου'],
          ['<span class="gw" data-en="for">για</span>', 'for', 'Αυτό είναι <strong>για</strong> σένα'],
          ['<span class="gw" data-en="without">χωρίς</span>', 'without', '<strong>Χωρίς</strong> ζάχαρη'],
        ],
      },
      {
        type: 'text',
        content:
          '<strong>Σημαντικό:</strong> Η πρόθεση <span class="gw" data-en="in/to">σε</span> + άρθρο → συγχωνεύονται:<br>σε + τον = <strong>στον</strong>, σε + την = <strong>στην</strong>, σε + το = <strong>στο</strong>',
        contentEn:
          '<strong>Important:</strong> The preposition <span class="gw" data-en="in/to">σε</span> + article → contract:<br>σε + τον = <strong>στον</strong>, σε + την = <strong>στην</strong>, σε + το = <strong>στο</strong>',
      },
      {
        type: 'exercise',
        kind: 'fill-blank',
        prompt: 'Πάω ___ σπίτι. (I go to the house — σε+το)',
        answer: 'στο',
        options: ['σε', 'στο', 'στην', 'στον'],
      },
      {
        type: 'exercise',
        kind: 'multiple-choice',
        question: 'Είμαι ___ την Ελλάδα. (I am from Greece)',
        questionEn: 'Είμαι ___ την Ελλάδα. (I am from Greece)',
        correct: 0,
        options: ['από', 'με', 'σε', 'για'],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CONJUGATION VERB DATA
// ═══════════════════════════════════════════════════════════════════════════════
const VERB_TABLE = [
  {
    verb: 'θέλω',
    en: 'to want',
    group: 1,
    forms: {
      εγώ: 'θέλω',
      εσύ: 'θέλεις',
      'αυτός/ή/ό': 'θέλει',
      εμείς: 'θέλουμε',
      εσείς: 'θέλετε',
      'αυτοί/ές/ά': 'θέλουν',
    },
  },
  {
    verb: 'κάνω',
    en: 'to do/make',
    group: 1,
    forms: {
      εγώ: 'κάνω',
      εσύ: 'κάνεις',
      'αυτός/ή/ό': 'κάνει',
      εμείς: 'κάνουμε',
      εσείς: 'κάνετε',
      'αυτοί/ές/ά': 'κάνουν',
    },
  },
  {
    verb: 'ξέρω',
    en: 'to know',
    group: 1,
    forms: {
      εγώ: 'ξέρω',
      εσύ: 'ξέρεις',
      'αυτός/ή/ό': 'ξέρει',
      εμείς: 'ξέρουμε',
      εσείς: 'ξέρετε',
      'αυτοί/ές/ά': 'ξέρουν',
    },
  },
  {
    verb: 'πίνω',
    en: 'to drink',
    group: 1,
    forms: {
      εγώ: 'πίνω',
      εσύ: 'πίνεις',
      'αυτός/ή/ό': 'πίνει',
      εμείς: 'πίνουμε',
      εσείς: 'πίνετε',
      'αυτοί/ές/ά': 'πίνουν',
    },
  },
  {
    verb: 'γράφω',
    en: 'to write',
    group: 1,
    forms: {
      εγώ: 'γράφω',
      εσύ: 'γράφεις',
      'αυτός/ή/ό': 'γράφει',
      εμείς: 'γράφουμε',
      εσείς: 'γράφετε',
      'αυτοί/ές/ά': 'γράφουν',
    },
  },
  {
    verb: 'παίρνω',
    en: 'to take',
    group: 1,
    forms: {
      εγώ: 'παίρνω',
      εσύ: 'παίρνεις',
      'αυτός/ή/ό': 'παίρνει',
      εμείς: 'παίρνουμε',
      εσείς: 'παίρνετε',
      'αυτοί/ές/ά': 'παίρνουν',
    },
  },
  {
    verb: 'βλέπω',
    en: 'to see',
    group: 1,
    forms: {
      εγώ: 'βλέπω',
      εσύ: 'βλέπεις',
      'αυτός/ή/ό': 'βλέπει',
      εμείς: 'βλέπουμε',
      εσείς: 'βλέπετε',
      'αυτοί/ές/ά': 'βλέπουν',
    },
  },
  {
    verb: 'λέω',
    en: 'to say',
    group: 1,
    forms: { εγώ: 'λέω', εσύ: 'λες', 'αυτός/ή/ό': 'λέει', εμείς: 'λέμε', εσείς: 'λέτε', 'αυτοί/ές/ά': 'λένε' },
  },
  {
    verb: 'τρώω',
    en: 'to eat',
    group: 1,
    forms: { εγώ: 'τρώω', εσύ: 'τρως', 'αυτός/ή/ό': 'τρώει', εμείς: 'τρώμε', εσείς: 'τρώτε', 'αυτοί/ές/ά': 'τρώνε' },
  },
  {
    verb: 'πάω',
    en: 'to go',
    group: 1,
    forms: { εγώ: 'πάω', εσύ: 'πας', 'αυτός/ή/ό': 'πάει', εμείς: 'πάμε', εσείς: 'πάτε', 'αυτοί/ές/ά': 'πάνε' },
  },
  {
    verb: 'μιλάω',
    en: 'to speak',
    group: 2,
    forms: {
      εγώ: 'μιλάω',
      εσύ: 'μιλάς',
      'αυτός/ή/ό': 'μιλάει',
      εμείς: 'μιλάμε',
      εσείς: 'μιλάτε',
      'αυτοί/ές/ά': 'μιλάνε',
    },
  },
  {
    verb: 'αγαπάω',
    en: 'to love',
    group: 2,
    forms: {
      εγώ: 'αγαπάω',
      εσύ: 'αγαπάς',
      'αυτός/ή/ό': 'αγαπάει',
      εμείς: 'αγαπάμε',
      εσείς: 'αγαπάτε',
      'αυτοί/ές/ά': 'αγαπάνε',
    },
  },
  {
    verb: 'ρωτάω',
    en: 'to ask',
    group: 2,
    forms: {
      εγώ: 'ρωτάω',
      εσύ: 'ρωτάς',
      'αυτός/ή/ό': 'ρωτάει',
      εμείς: 'ρωτάμε',
      εσείς: 'ρωτάτε',
      'αυτοί/ές/ά': 'ρωτάνε',
    },
  },
  {
    verb: 'μπορώ',
    en: 'to be able',
    group: 2,
    forms: {
      εγώ: 'μπορώ',
      εσύ: 'μπορείς',
      'αυτός/ή/ό': 'μπορεί',
      εμείς: 'μπορούμε',
      εσείς: 'μπορείτε',
      'αυτοί/ές/ά': 'μπορούν',
    },
  },
  {
    verb: 'ζω',
    en: 'to live',
    group: 2,
    forms: { εγώ: 'ζω', εσύ: 'ζεις', 'αυτός/ή/ό': 'ζει', εμείς: 'ζούμε', εσείς: 'ζείτε', 'αυτοί/ές/ά': 'ζουν' },
  },
  {
    verb: 'οδηγώ',
    en: 'to drive',
    group: 2,
    forms: {
      εγώ: 'οδηγώ',
      εσύ: 'οδηγείς',
      'αυτός/ή/ό': 'οδηγεί',
      εμείς: 'οδηγούμε',
      εσείς: 'οδηγείτε',
      'αυτοί/ές/ά': 'οδηγούν',
    },
  },
  {
    verb: 'είμαι',
    en: 'to be',
    group: 0,
    forms: {
      εγώ: 'είμαι',
      εσύ: 'είσαι',
      'αυτός/ή/ό': 'είναι',
      εμείς: 'είμαστε',
      εσείς: 'είστε',
      'αυτοί/ές/ά': 'είναι',
    },
  },
  {
    verb: 'έχω',
    en: 'to have',
    group: 0,
    forms: { εγώ: 'έχω', εσύ: 'έχεις', 'αυτός/ή/ό': 'έχει', εμείς: 'έχουμε', εσείς: 'έχετε', 'αυτοί/ές/ά': 'έχουν' },
  },
  {
    verb: 'δίνω',
    en: 'to give',
    group: 1,
    forms: {
      εγώ: 'δίνω',
      εσύ: 'δίνεις',
      'αυτός/ή/ό': 'δίνει',
      εμείς: 'δίνουμε',
      εσείς: 'δίνετε',
      'αυτοί/ές/ά': 'δίνουν',
    },
  },
  {
    verb: 'ακούω',
    en: 'to hear',
    group: 1,
    forms: {
      εγώ: 'ακούω',
      εσύ: 'ακούς',
      'αυτός/ή/ό': 'ακούει',
      εμείς: 'ακούμε',
      εσείς: 'ακούτε',
      'αυτοί/ές/ά': 'ακούνε',
    },
  },
];

const PERSONS = ['εγώ', 'εσύ', 'αυτός/ή/ό', 'εμείς', 'εσείς', 'αυτοί/ές/ά'];
