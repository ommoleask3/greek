// ═══════════════════════════════════════════════════════════════════════════════
// EXAM DATA — hand-crafted cloze sentences per level
// Each entry: { gr, en, cards: [{ sentence, sentenceEn }] }
// gr = the word blanked out, en = English hint shown during exam
// Each card is a separate exam item highlighting a different usage
// ═══════════════════════════════════════════════════════════════════════════════
const EXAM_DATA = {
  // Level 1: ranks 1–100
  1: [
    // ── να (rank 1): subjunctive marker / "here you go" ──
    { gr: 'να', en: 'to (subjunctive); here (you go)', cards: [
      { sentence: 'Θέλω να μάθω κιθάρα μέχρι το καλοκαίρι.', sentenceEn: 'I want to learn guitar by summer.' },
      { sentence: 'Να τα κλειδιά σου, τα βρήκα κάτω από τον καναπέ.', sentenceEn: 'Here are your keys, I found them under the sofa.' },
      { sentence: 'Πρέπει να φύγουμε πριν βρέξει.', sentenceEn: 'We need to leave before it rains.' },
    ]},
    // ── ο (rank 2): masculine article ──
    { gr: 'ο', en: 'the (masc. article)', cards: [
      { sentence: 'Ο γάτος κοιμάται πάνω στο πληκτρολόγιο ξανά.', sentenceEn: 'The cat is sleeping on the keyboard again.' },
      { sentence: 'Ο καφές κρύωσε ενώ μιλούσα στο τηλέφωνο.', sentenceEn: 'The coffee got cold while I was talking on the phone.' },
    ]},
    // ── θα (rank 4): future / conditional ──
    { gr: 'θα', en: 'will, would', cards: [
      { sentence: 'Θα πάμε διακοπές στην Κρήτη τον Αύγουστο.', sentenceEn: 'We will go on holiday to Crete in August.' },
      { sentence: 'Θα ήθελα ένα ποτήρι κρύο νερό, παρακαλώ.', sentenceEn: 'I would like a glass of cold water, please.' },
      { sentence: 'Αν είχα λεφτά, θα αγόραζα σκάφος.', sentenceEn: 'If I had money, I would buy a boat.' },
    ]},
    // ── και (rank 6): and ──
    { gr: 'και', en: 'and', cards: [
      { sentence: 'Αγόρασα ψωμί και τυρί από τον φούρνο.', sentenceEn: 'I bought bread and cheese from the bakery.' },
      { sentence: 'Η Μαρία και ο Νίκος παντρεύτηκαν πέρσι.', sentenceEn: 'Maria and Nikos got married last year.' },
    ]},
    // ── μου (rank 7): my / mine ──
    { gr: 'μου', en: 'my, mine', cards: [
      { sentence: 'Η αδερφή μου σπουδάζει ιατρική στη Θεσσαλονίκη.', sentenceEn: 'My sister studies medicine in Thessaloniki.' },
      { sentence: 'Το σπίτι μου είναι κοντά στη θάλασσα.', sentenceEn: 'My house is near the sea.' },
      { sentence: 'Δώσε μου πέντε λεπτά να ετοιμαστώ.', sentenceEn: 'Give me five minutes to get ready.' },
    ]},
    // ── με (rank 8): with / me ──
    { gr: 'με', en: 'with; me', cards: [
      { sentence: 'Πίνω πάντα τον καφέ με γάλα.', sentenceEn: 'I always drink coffee with milk.' },
      { sentence: 'Ο Γιώργος με πήρε τηλέφωνο χθες βράδυ.', sentenceEn: 'Giorgos called me last night.' },
      { sentence: 'Με τέτοιον καιρό δεν βγαίνω ούτε στο μπαλκόνι.', sentenceEn: 'With this weather I don\'t even go out to the balcony.' },
    ]},
    // ── για (rank 9): for / about ──
    { gr: 'για', en: 'for; about', cards: [
      { sentence: 'Αυτό το δώρο είναι για τα γενέθλιά σου.', sentenceEn: 'This gift is for your birthday.' },
      { sentence: 'Μιλούσαμε για την ταινία που είδαμε χθες.', sentenceEn: 'We were talking about the film we saw yesterday.' },
      { sentence: 'Φεύγω για Αθήνα με το πρωινό τρένο.', sentenceEn: 'I\'m leaving for Athens on the morning train.' },
    ]},
    // ── σου (rank 10): your / you ──
    { gr: 'σου', en: 'you (sg.); your (sg.)', cards: [
      { sentence: 'Το τηλέφωνό σου χτυπάει, δεν το ακούς;', sentenceEn: 'Your phone is ringing, can\'t you hear it?' },
      { sentence: 'Σου είπα να κλείσεις τραπέζι από νωρίς.', sentenceEn: 'I told you to book a table early.' },
    ]},
    // ── εγώ (rank 11): I ──
    { gr: 'εγώ', en: 'I; ego', cards: [
      { sentence: 'Εγώ θα μαγειρέψω, εσύ πλένεις τα πιάτα.', sentenceEn: 'I\'ll cook, you wash the dishes.' },
      { sentence: 'Ποιος έφαγε το τελευταίο κομμάτι; Εγώ δεν ήμουν!', sentenceEn: 'Who ate the last piece? It wasn\'t me!' },
    ]},
    // ── τι (rank 12): what / how (exclamatory) ──
    { gr: 'τι', en: 'what; how (excl.)', cards: [
      { sentence: 'Τι ώρα φεύγει το πλοίο για Μύκονο;', sentenceEn: 'What time does the boat to Mykonos leave?' },
      { sentence: 'Τι ωραίο ηλιοβασίλεμα, βγάλε φωτογραφία!', sentenceEn: 'What a beautiful sunset, take a photo!' },
      { sentence: 'Τι έγινε; Γιατί φωνάζουν οι γείτονες;', sentenceEn: 'What happened? Why are the neighbours yelling?' },
    ]},
    // ── σε (rank 13): to / in / at ──
    { gr: 'σε', en: 'to, in, at', cards: [
      { sentence: 'Πάμε σε ένα καφενείο στην πλατεία;', sentenceEn: 'Shall we go to a cafe in the square?' },
      { sentence: 'Σε τρεις μέρες έχουμε εξετάσεις.', sentenceEn: 'In three days we have exams.' },
      { sentence: 'Σε περιμένω στη στάση του λεωφορείου.', sentenceEn: 'I\'m waiting for you at the bus stop.' },
    ]},
    // ── που (rank 14): that / which / where (relative) ──
    { gr: 'που', en: 'that, which, where (relative)', cards: [
      { sentence: 'Ο φίλος που μένει στο Βερολίνο έρχεται Ελλάδα.', sentenceEn: 'The friend that lives in Berlin is coming to Greece.' },
      { sentence: 'Η ταβέρνα που τρώγαμε μικροί έκλεισε.', sentenceEn: 'The taverna where we used to eat as kids closed down.' },
      { sentence: 'Χάρηκα που σε είδα μετά από τόσο καιρό!', sentenceEn: 'I was glad that I saw you after so long!' },
    ]},
    // ── του (rank 16): his / its / him ──
    { gr: 'του', en: 'him, it; his, its', cards: [
      { sentence: 'Το αυτοκίνητο του Κώστα χάλασε στον αυτοκινητόδρομο.', sentenceEn: 'Kostas\'s car broke down on the motorway.' },
      { sentence: 'Του είπα να μην τρέχει στις σκάλες.', sentenceEn: 'I told him not to run on the stairs.' },
    ]},
    // ── στο (rank 17): to/in/at the (neut.) ──
    { gr: 'στο', en: 'to/in/at the (neut.)', cards: [
      { sentence: 'Ξέχασα το πορτοφόλι μου στο ταξί.', sentenceEn: 'I forgot my wallet in the taxi.' },
      { sentence: 'Πάμε στο σινεμά απόψε;', sentenceEn: 'Shall we go to the cinema tonight?' },
    ]},
    // ── ότι (rank 18): that (complement) ──
    { gr: 'ότι', en: 'that (after verbs)', cards: [
      { sentence: 'Νομίζω ότι θα βρέξει αύριο.', sentenceEn: 'I think that it will rain tomorrow.' },
      { sentence: 'Μου είπε ότι αλλάζει δουλειά τον Σεπτέμβρη.', sentenceEn: 'She told me that she\'s changing jobs in September.' },
    ]},
    // ── από (rank 19): from / than ──
    { gr: 'από', en: 'from; than', cards: [
      { sentence: 'Ήρθα από τη Σμύρνη με το φέρι.', sentenceEn: 'I came from Izmir by ferry.' },
      { sentence: 'Η Σοφία είναι ψηλότερη από τον αδερφό της.', sentenceEn: 'Sofia is taller than her brother.' },
      { sentence: 'Ένα από τα παιδιά ξέχασε την τσάντα του.', sentenceEn: 'One of the children forgot their bag.' },
    ]},
    // ── της (rank 20): her / hers ──
    { gr: 'της', en: 'her, hers', cards: [
      { sentence: 'Η φωνή της ακούγεται παντού στο σπίτι.', sentenceEn: 'Her voice can be heard everywhere in the house.' },
      { sentence: 'Της αρέσει να διαβάζει πριν κοιμηθεί.', sentenceEn: 'She likes to read before sleeping.' },
    ]},
    // ── ναι (rank 21): yes ──
    { gr: 'ναι', en: 'yes', cards: [
      { sentence: 'Ναι, μπορούμε να φύγουμε τώρα.', sentenceEn: 'Yes, we can leave now.' },
      { sentence: 'Ναι ρε, σοβαρά σου μιλάω!', sentenceEn: 'Yeah man, I\'m serious!' },
    ]},
    // ── εδώ (rank 23): here ──
    { gr: 'εδώ', en: 'here', cards: [
      { sentence: 'Έλα εδώ να δεις τι βρήκα στον κήπο.', sentenceEn: 'Come here to see what I found in the garden.' },
      { sentence: 'Εδώ κοντά υπάρχει ένα φαρμακείο;', sentenceEn: 'Is there a pharmacy nearby here?' },
    ]},
    // ── αν (rank 24): if ──
    { gr: 'αν', en: 'if', cards: [
      { sentence: 'Αν θες, μπορείς να μείνεις σπίτι μας.', sentenceEn: 'If you want, you can stay at our place.' },
      { sentence: 'Δεν ξέρω αν προλαβαίνω το τρένο.', sentenceEn: 'I don\'t know if I\'ll make the train.' },
    ]},
    // ── όχι (rank 25): no ──
    { gr: 'όχι', en: 'no', cards: [
      { sentence: 'Όχι, ευχαριστώ, δεν θέλω επιδόρπιο.', sentenceEn: 'No, thanks, I don\'t want dessert.' },
      { sentence: 'Όχι άλλο κρασί, οδηγώ απόψε.', sentenceEn: 'No more wine, I\'m driving tonight.' },
    ]},
    // ── αλλά (rank 26): but ──
    { gr: 'αλλά', en: 'but', cards: [
      { sentence: 'Ήθελα να πάω στη γιορτή, αλλά αρρώστησα.', sentenceEn: 'I wanted to go to the party, but I got sick.' },
      { sentence: 'Ο καιρός είναι ωραίος αλλά κάνει κρύο.', sentenceEn: 'The weather is nice but it\'s cold.' },
    ]},
    // ── τους (rank 28): them / their ──
    { gr: 'τους', en: 'them; their', cards: [
      { sentence: 'Τους κάλεσα στο σπίτι για φαγητό.', sentenceEn: 'I invited them to the house for dinner.' },
      { sentence: 'Οι γονείς τους μένουν στα Ιωάννινα.', sentenceEn: 'Their parents live in Ioannina.' },
    ]},
    // ── πολύ (rank 29): very ──
    { gr: 'πολύ', en: 'very', cards: [
      { sentence: 'Η σούπα είναι πολύ αλμυρή σήμερα.', sentenceEn: 'The soup is very salty today.' },
      { sentence: 'Μου αρέσει πολύ η μουσική αυτή.', sentenceEn: 'I like this music very much.' },
    ]},
    // ── σας (rank 30): you (pl.) / your (pl.) ──
    { gr: 'σας', en: 'you (pl.); your (pl.)', cards: [
      { sentence: 'Σας ευχαριστώ για τη βοήθειά σας.', sentenceEn: 'Thank you for your help.' },
      { sentence: 'Μπορώ να σας κάνω μια ερώτηση;', sentenceEn: 'May I ask you a question?' },
    ]},
    // ── μας (rank 32): us / our ──
    { gr: 'μας', en: 'us; our', cards: [
      { sentence: 'Η γειτονιά μας έχει πολλά δέντρα.', sentenceEn: 'Our neighbourhood has lots of trees.' },
      { sentence: 'Μας είπε ότι θα αργήσει μία ώρα.', sentenceEn: 'He told us he\'d be an hour late.' },
    ]},
    // ── τώρα (rank 33): now ──
    { gr: 'τώρα', en: 'now', cards: [
      { sentence: 'Τώρα κατάλαβα τι εννοούσες χθες.', sentenceEn: 'Now I understand what you meant yesterday.' },
      { sentence: 'Φεύγω τώρα, θα τα πούμε αργότερα.', sentenceEn: 'I\'m leaving now, we\'ll talk later.' },
    ]},
    // ── πως (rank 34): that (informal) ──
    { gr: 'πως', en: 'that (informal)', cards: [
      { sentence: 'Μου φαίνεται πως θα χιονίσει απόψε.', sentenceEn: 'It seems to me that it\'ll snow tonight.' },
      { sentence: 'Λέει πως δεν πρόλαβε να φάει μεσημέρι.', sentenceEn: 'He says that he didn\'t have time to eat lunch.' },
    ]},
    // ── κάτι (rank 36): something ──
    { gr: 'κάτι', en: 'something', cards: [
      { sentence: 'Μυρίζει κάτι περίεργο στην κουζίνα.', sentenceEn: 'Something smells weird in the kitchen.' },
      { sentence: 'Θέλω να σου πω κάτι σημαντικό.', sentenceEn: 'I want to tell you something important.' },
    ]},
    // ── καλά (rank 41): well ──
    { gr: 'καλά', en: 'well', cards: [
      { sentence: 'Κοιμήθηκα πολύ καλά χθες βράδυ.', sentenceEn: 'I slept very well last night.' },
      { sentence: 'Καλά, ας το κάνουμε όπως λες εσύ.', sentenceEn: 'Fine, let\'s do it your way.' },
    ]},
    // ── έτσι (rank 42): like this / this way ──
    { gr: 'έτσι', en: 'like this, this way', cards: [
      { sentence: 'Κράτα το μαχαίρι έτσι, είναι πιο εύκολο.', sentenceEn: 'Hold the knife like this, it\'s easier.' },
      { sentence: 'Έτσι κι αλλιώς δεν θα πρόλαβαίναμε.', sentenceEn: 'Either way we wouldn\'t have made it in time.' },
    ]},
    // ── εκεί (rank 44): there ──
    { gr: 'εκεί', en: 'there', cards: [
      { sentence: 'Βλέπεις εκεί πέρα το βουνό; Εκεί πάμε.', sentenceEn: 'See that mountain over there? That\'s where we\'re going.' },
      { sentence: 'Άφησε τα κλειδιά εκεί πάνω στο ράφι.', sentenceEn: 'Leave the keys up there on the shelf.' },
    ]},
    // ── εσύ (rank 45): you (sg.) ──
    { gr: 'εσύ', en: 'you (sg.)', cards: [
      { sentence: 'Εσύ τι θα παραγγείλεις; Εγώ θέλω σουβλάκι.', sentenceEn: 'What will you order? I want souvlaki.' },
      { sentence: 'Εσύ φταις που αργήσαμε, όχι εγώ!', sentenceEn: 'It\'s your fault we\'re late, not mine!' },
    ]},
    // ── σαν (rank 46): like / as if ──
    { gr: 'σαν', en: 'like, as if', cards: [
      { sentence: 'Μιλάει σαν να ξέρει τα πάντα.', sentenceEn: 'He talks as if he knows everything.' },
      { sentence: 'Η θάλασσα ήταν σαν καθρέφτης σήμερα.', sentenceEn: 'The sea was like a mirror today.' },
    ]},
    // ── μόνο (rank 47): only ──
    { gr: 'μόνο', en: 'only', cards: [
      { sentence: 'Έμεινε μόνο ένα κομμάτι τούρτα.', sentenceEn: 'Only one piece of cake is left.' },
      { sentence: 'Μόνο εσύ μπορείς να λύσεις αυτό το πρόβλημα.', sentenceEn: 'Only you can solve this problem.' },
    ]},
    // ── όταν (rank 49): when (conjunction) ──
    { gr: 'όταν', en: 'when (conjunction)', cards: [
      { sentence: 'Όταν ήμουν μικρός, παίζαμε στο δρόμο.', sentenceEn: 'When I was little, we played in the street.' },
      { sentence: 'Πάντα βάζω μουσική όταν μαγειρεύω.', sentenceEn: 'I always put on music when I cook.' },
    ]},
    // ── μαζί (rank 50): together / with ──
    { gr: 'μαζί', en: 'together; with', cards: [
      { sentence: 'Πάμε μαζί στο σούπερ μάρκετ;', sentenceEn: 'Shall we go to the supermarket together?' },
      { sentence: 'Πήρε μαζί της ομπρέλα γιατί βρέχει.', sentenceEn: 'She took an umbrella with her because it\'s raining.' },
    ]},
    // ── πώς (rank 51): how (question) ──
    { gr: 'πώς', en: 'how', cards: [
      { sentence: 'Πώς λέγεται αυτό στα ελληνικά;', sentenceEn: 'How do you say this in Greek?' },
      { sentence: 'Πώς πας στη δουλειά, με μετρό ή λεωφορείο;', sentenceEn: 'How do you get to work, by metro or bus?' },
    ]},
    // ── ή (rank 57): or ──
    { gr: 'ή', en: 'or', cards: [
      { sentence: 'Προτιμάς τσάι ή καφέ;', sentenceEn: 'Do you prefer tea or coffee?' },
      { sentence: 'Πρέπει να φύγω στις πέντε ή στις έξι.', sentenceEn: 'I need to leave at five or six.' },
    ]},
    // ── ποτέ (rank 58): never ──
    { gr: 'ποτέ', en: 'never', cards: [
      { sentence: 'Δεν έχω πάει ποτέ στην Ιαπωνία.', sentenceEn: 'I\'ve never been to Japan.' },
      { sentence: 'Ποτέ μην πεις ποτέ!', sentenceEn: 'Never say never!' },
    ]},
    // ── τόσο (rank 59): so / that much ──
    { gr: 'τόσο', en: 'so, that much', cards: [
      { sentence: 'Δεν περίμενα να είναι τόσο νόστιμο.', sentenceEn: 'I didn\'t expect it to be so tasty.' },
      { sentence: 'Γιατί αργείς τόσο κάθε πρωί;', sentenceEn: 'Why do you take so long every morning?' },
    ]},
    // ── πού (rank 60): where? ──
    { gr: 'πού', en: 'where?', cards: [
      { sentence: 'Πού βάζω αυτές τις βαλίτσες;', sentenceEn: 'Where do I put these suitcases?' },
      { sentence: 'Από πού είσαι, αν επιτρέπεται;', sentenceEn: 'Where are you from, if you don\'t mind?' },
    ]},
    // ── έλα (rank 61): come / come on ──
    { gr: 'έλα', en: 'come; come on', cards: [
      { sentence: 'Έλα γρήγορα, ξεκινάει η ταινία!', sentenceEn: 'Come quickly, the film is starting!' },
      { sentence: 'Έλα μωρέ, μην τα παίρνεις στα σοβαρά.', sentenceEn: 'Come on, don\'t take it seriously.' },
    ]},
    // ── πιο (rank 65): more (comparative) ──
    { gr: 'πιο', en: 'more (comparative)', cards: [
      { sentence: 'Η σημερινή μέρα ήταν πιο ζεστή από χθες.', sentenceEn: 'Today was warmer than yesterday.' },
      { sentence: 'Μίλα πιο αργά, δεν καταλαβαίνω.', sentenceEn: 'Speak more slowly, I don\'t understand.' },
    ]},
    // ── πίσω (rank 72): back / behind ──
    { gr: 'πίσω', en: 'back, behind', cards: [
      { sentence: 'Κάτσε πίσω, δεν χωράμε μπροστά.', sentenceEn: 'Sit in the back, there\'s no room up front.' },
      { sentence: 'Γύρισε πίσω, ξέχασες το πορτοφόλι!', sentenceEn: 'Go back, you forgot your wallet!' },
    ]},
    // ── λίγο (rank 73): a little ──
    { gr: 'λίγο', en: 'a little; a bit', cards: [
      { sentence: 'Περίμενε λίγο, δεν τελείωσα ακόμα.', sentenceEn: 'Wait a bit, I haven\'t finished yet.' },
      { sentence: 'Βάλε λίγο αλάτι στη σαλάτα.', sentenceEn: 'Put a little salt on the salad.' },
    ]},
    // ── γεια (rank 75): hello ──
    { gr: 'γεια', en: 'hello', cards: [
      { sentence: 'Γεια σου Μαρία, τι κάνεις;', sentenceEn: 'Hello Maria, how are you?' },
      { sentence: 'Γεια σας, θα ήθελα ένα εισιτήριο.', sentenceEn: 'Hello, I\'d like a ticket.' },
    ]},
    // ── τότε (rank 76): then ──
    { gr: 'τότε', en: 'then, at that time', cards: [
      { sentence: 'Τότε δεν υπήρχαν κινητά τηλέφωνα.', sentenceEn: 'Back then mobile phones didn\'t exist.' },
      { sentence: 'Αν δεν θέλεις πίτσα, τότε τι θέλεις;', sentenceEn: 'If you don\'t want pizza, then what do you want?' },
    ]},
    // ── μετά (rank 77): after ──
    { gr: 'μετά', en: 'after', cards: [
      { sentence: 'Μετά το φαγητό πάμε βόλτα στο λιμάνι.', sentenceEn: 'After the meal let\'s walk to the harbour.' },
      { sentence: 'Τα λέμε μετά, τρέχω τώρα!', sentenceEn: 'Let\'s talk after, I\'m in a rush now!' },
    ]},
    // ── πριν (rank 80): before ──
    { gr: 'πριν', en: 'before, prior', cards: [
      { sentence: 'Πλύνε τα χέρια σου πριν φας.', sentenceEn: 'Wash your hands before you eat.' },
      { sentence: 'Πριν δέκα χρόνια ζούσα στο Λονδίνο.', sentenceEn: 'Ten years ago I lived in London.' },
    ]},
    // ── απλά (rank 81): simply ──
    { gr: 'απλά', en: 'simply', cards: [
      { sentence: 'Απλά δεν μου αρέσει ο χειμώνας.', sentenceEn: 'I simply don\'t like winter.' },
      { sentence: 'Δεν θύμωσα, απλά κουράστηκα.', sentenceEn: 'I\'m not angry, I\'m simply tired.' },
    ]},
    // ── ίσως (rank 86): maybe ──
    { gr: 'ίσως', en: 'maybe, perhaps', cards: [
      { sentence: 'Ίσως πάμε Πάρο φέτος αντί για Νάξο.', sentenceEn: 'Maybe we\'ll go to Paros this year instead of Naxos.' },
      { sentence: 'Αυτό είναι ίσως το καλύτερο βιβλίο που διάβασα.', sentenceEn: 'This is perhaps the best book I\'ve read.' },
    ]},
    // ── όπως (rank 87): as / just as ──
    { gr: 'όπως', en: 'as, just as', cards: [
      { sentence: 'Κάντο όπως σου είπα, αλλιώς θα χαλάσει.', sentenceEn: 'Do it as I told you, otherwise it\'ll break.' },
      { sentence: 'Όπως βλέπεις, δεν υπάρχει κανείς εδώ.', sentenceEn: 'As you can see, there\'s nobody here.' },
    ]},
    // ── ας (rank 88): let / let us ──
    { gr: 'ας', en: 'let, let us', cards: [
      { sentence: 'Ας φύγουμε πριν γίνει κίνηση.', sentenceEn: 'Let\'s leave before it gets busy.' },
      { sentence: 'Ας πούμε ότι έχεις δίκιο, μετά τι;', sentenceEn: 'Let\'s say you\'re right, then what?' },
    ]},
    // ── μα (rank 89): but (mild) / by (oath) ──
    { gr: 'μα', en: 'but (mild); by (oath)', cards: [
      { sentence: 'Μα δεν σου είπα τίποτα κακό!', sentenceEn: 'But I didn\'t say anything bad to you!' },
      { sentence: 'Μα τον Θεό, λέω αλήθεια.', sentenceEn: 'By God, I\'m telling the truth.' },
    ]},
    // ── πάω (rank 93): go ──
    { gr: 'πάω', en: 'go', cards: [
      { sentence: 'Πάω στο γυμναστήριο κάθε Τρίτη βράδυ.', sentenceEn: 'I go to the gym every Tuesday night.' },
      { sentence: 'Πάω σπίτι, πονάει το κεφάλι μου.', sentenceEn: 'I\'m going home, my head hurts.' },
    ]},
    // ── δύο (rank 94): two ──
    { gr: 'δύο', en: 'two', cards: [
      { sentence: 'Θέλω δύο εισιτήρια για τη Σαντορίνη.', sentenceEn: 'I want two tickets to Santorini.' },
      { sentence: 'Περίμενε δύο λεπτά, πρέπει να κλείσω το φούρνο.', sentenceEn: 'Wait two minutes, I need to turn off the oven.' },
    ]},
    // ── έξω (rank 97): outside ──
    { gr: 'έξω', en: 'outside, out', cards: [
      { sentence: 'Βγαίνουμε έξω ή μένουμε σπίτι;', sentenceEn: 'Are we going out or staying home?' },
      { sentence: 'Κάνει κρύο έξω, πάρε μπουφάν.', sentenceEn: 'It\'s cold outside, take a jacket.' },
    ]},
    // ── πάνω (rank 99): on / up / above ──
    { gr: 'πάνω', en: 'on, up, above', cards: [
      { sentence: 'Τα κλειδιά είναι πάνω στο τραπέζι.', sentenceEn: 'The keys are on the table.' },
      { sentence: 'Ο γάτος πήδηξε πάνω στο ψυγείο.', sentenceEn: 'The cat jumped up on the fridge.' },
    ]},
  ],
};
