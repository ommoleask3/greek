// ═══════════════════════════════════════════════════════════════════════════════
// BUILT-IN WORDS (fallback)
// ═══════════════════════════════════════════════════════════════════════════════
const BUILTIN_WORDS = [
  { en: 'yes', gr: 'ναι' },
  { en: 'no', gr: 'όχι' },
  { en: 'hello', gr: 'γεια σου' },
  { en: 'goodbye', gr: 'αντίο' },
  { en: 'please', gr: 'παρακαλώ' },
  { en: 'thank you', gr: 'ευχαριστώ' },
  { en: 'sorry', gr: 'συγγνώμη' },
  { en: 'excuse me', gr: 'με συγχωρείτε' },
  { en: 'I', gr: 'εγώ' },
  { en: 'you', gr: 'εσύ' },
  { en: 'he', gr: 'αυτός' },
  { en: 'she', gr: 'αυτή' },
  { en: 'we', gr: 'εμείς' },
  { en: 'they', gr: 'αυτοί' },
  { en: 'what', gr: 'τι' },
  { en: 'where', gr: 'πού' },
  { en: 'when', gr: 'πότε' },
  { en: 'who', gr: 'ποιος' },
  { en: 'how', gr: 'πώς' },
  { en: 'why', gr: 'γιατί' },
  { en: 'is', gr: 'είναι' },
  { en: 'I am', gr: 'είμαι' },
  { en: 'I have', gr: 'έχω' },
  { en: 'I want', gr: 'θέλω' },
  { en: 'I know', gr: 'ξέρω' },
  { en: 'I go', gr: 'πάω' },
  { en: 'I eat', gr: 'τρώω' },
  { en: 'I drink', gr: 'πίνω' },
  { en: 'I speak', gr: 'μιλάω' },
  { en: 'I understand', gr: 'καταλαβαίνω' },
  { en: 'good', gr: 'καλός' },
  { en: 'bad', gr: 'κακός' },
  { en: 'big', gr: 'μεγάλος' },
  { en: 'small', gr: 'μικρός' },
  { en: 'new', gr: 'νέος' },
  { en: 'old', gr: 'παλιός' },
  { en: 'hot', gr: 'ζεστός' },
  { en: 'cold', gr: 'κρύος' },
  { en: 'beautiful', gr: 'όμορφος' },
  { en: 'much / many', gr: 'πολύς' },
  { en: 'little / few', gr: 'λίγος' },
  { en: 'water', gr: 'νερό' },
  { en: 'food', gr: 'φαγητό' },
  { en: 'bread', gr: 'ψωμί' },
  { en: 'coffee', gr: 'καφές' },
  { en: 'wine', gr: 'κρασί' },
  { en: 'house', gr: 'σπίτι' },
  { en: 'street', gr: 'δρόμος' },
  { en: 'car', gr: 'αυτοκίνητο' },
  { en: 'city', gr: 'πόλη' },
  { en: 'country', gr: 'χώρα' },
  { en: 'day', gr: 'μέρα' },
  { en: 'night', gr: 'νύχτα' },
  { en: 'time', gr: 'ώρα' },
  { en: 'today', gr: 'σήμερα' },
  { en: 'tomorrow', gr: 'αύριο' },
  { en: 'yesterday', gr: 'χθες' },
  { en: 'now', gr: 'τώρα' },
  { en: 'here', gr: 'εδώ' },
  { en: 'there', gr: 'εκεί' },
  { en: 'man', gr: 'άντρας' },
  { en: 'woman', gr: 'γυναίκα' },
  { en: 'child', gr: 'παιδί' },
  { en: 'friend', gr: 'φίλος' },
  { en: 'name', gr: 'όνομα' },
  { en: 'money', gr: 'χρήματα' },
  { en: 'work', gr: 'δουλειά' },
  { en: 'school', gr: 'σχολείο' },
  { en: 'book', gr: 'βιβλίο' },
  { en: 'phone', gr: 'τηλέφωνο' },
  { en: 'door', gr: 'πόρτα' },
  { en: 'number', gr: 'αριθμός' },
  { en: 'one', gr: 'ένα' },
  { en: 'two', gr: 'δύο' },
  { en: 'three', gr: 'τρία' },
  { en: 'four', gr: 'τέσσερα' },
  { en: 'five', gr: 'πέντε' },
  { en: 'ten', gr: 'δέκα' },
  { en: 'hundred', gr: 'εκατό' },
  { en: 'and', gr: 'και' },
  { en: 'or', gr: 'ή' },
  { en: 'but', gr: 'αλλά' },
  { en: 'because', gr: 'γιατί' },
  { en: 'with', gr: 'με' },
  { en: 'without', gr: 'χωρίς' },
  { en: 'in', gr: 'σε' },
  { en: 'on', gr: 'πάνω' },
  { en: 'under', gr: 'κάτω' },
  { en: 'before', gr: 'πριν' },
  { en: 'after', gr: 'μετά' },
  { en: 'very', gr: 'πολύ' },
  { en: 'also', gr: 'επίσης' },
  { en: 'only', gr: 'μόνο' },
  { en: 'always', gr: 'πάντα' },
  { en: 'never', gr: 'ποτέ' },
  { en: 'maybe', gr: 'ίσως' },
  { en: 'open', gr: 'ανοιχτό' },
  { en: 'closed', gr: 'κλειστό' },
  { en: 'right', gr: 'σωστό' },
  { en: 'wrong', gr: 'λάθος' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ANKI SM-2 CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const LEARNING_STEPS = [60, 600]; // seconds: 1min, 10min
const GRADUATING_INTERVAL = 1; // days after final learning step
const EASY_INTERVAL = 4; // days when Easy pressed during learning
const STARTING_EASE = 2.5;
const MINIMUM_EASE = 1.3;
const HARD_MULTIPLIER = 1.2;
const EASY_BONUS = 1.3;
const LAPSE_NEW_INTERVAL = 0.5; // multiplier on old interval (0.5 = keep 50%)
const LAPSE_STEPS = [600]; // seconds: 10min relearning
const MAX_INTERVAL = 36500; // ~100 years
const LEECH_THRESHOLD = 8; // flag card as leech after this many lapses
const LEARN_AHEAD_SECS = 1200; // 20min — show learning cards early (Anki default)

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & STATE
// ═══════════════════════════════════════════════════════════════════════════════
const SRS_KEY = 'greek_srs_v1';
const PREFS_KEY = 'greek_prefs_v1';
const DB_NAME = 'greek_db';
const DB_VER = 1;

let WORDS = []; // loaded from IndexedDB on session start
let dbPromise = null; // cached IndexedDB promise

// Session state
let queue = [];
let delayedQueue = []; // [{card, dueTime}] for learning/relearning cards
let waitingTimer = null; // timer ID for countdown display
let current = null;
let cardState = 'loading'; // loading | question | answer | answer-wrong | sentence | translation | no-sentence
let sessionCorrect = 0;
let sessionWrong = 0;
let sessionGraduated = 0; // cards that graduated learning → review this session
let sessionMode = 'en'; // 'en' | 'gr' | 'both'
let sessionRankMin = null;
let sessionRankMax = null;
let sessionReadonly = false; // true for custom range — no SRS/stats updates
let sessionThematic = null; // null or THEMATIC_LESSONS entry when in thematic mode

// Prefs
let prefs = { volume: 1, firstCardSeen: false, voiceSource: 'indexed', ttsRate: 0.85, greekOnly: false };

// Audio
let currentBlobUrl = null;
let currentAudioFile = null; // for Enter key replay
let sentenceAudioFile = null;
let audioControlsOpen = false;

// Custom range dir
let customDir = 'en';

// Active level tab
let activeTab = 'en';
