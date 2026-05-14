"""
Insert 390 missing words from the top-2500 website list into the Anki deck.

For each word inserted at rank N:
  - all existing ranks >= N are shifted up by 1
  - all remaining insertions with rank >= N are also shifted up by 1

Deck field layout (from the "Greek Multi" model):
  [0] Rank           – numeric frequency rank
  [1] Greek Word     – the vocabulary word
  [2] English Meaning– English translation
  [3] Greek Example  – example sentence in Greek
  [4] English Example– sentence translation
  [5] Audio          – word audio
  [6] Audio2         – sentence audio
  [7] Silent         – silence file
"""

import sqlite3, json, re, shutil, time, hashlib

DB_PATH = 'curr_deck/collection.anki21'
BACKUP_PATH = DB_PATH + '.pre_insert.bak'

# ═══════════════════════════════════════════════════════════════════════════════
# NEW WORDS: (target_rank, greek, english, greek_sentence, english_sentence)
# ═══════════════════════════════════════════════════════════════════════════════

NEW_WORDS = [
    # --- Block 1: ranks 10-466 ---
    (10, "σου", "you (sg.); your (sg.)", "Το όνομά σου είναι πολύ όμορφο.", "Your name is very beautiful."),
    (15, "του", "him, it; his, its", "Του μίλησα χθες στο τηλέφωνο.", "I spoke to him yesterday on the phone."),
    (18, "της", "her", "Της έδωσα ένα δώρο για τα γενέθλιά της.", "I gave her a gift for her birthday."),
    (25, "τους", "them; their", "Τους είπα να έρθουν στις οκτώ.", "I told them to come at eight."),
    (26, "σας", "you (pl.); your (pl.)", "Σας ευχαριστώ πολύ για τη βοήθεια.", "Thank you very much for your help."),
    (27, "μας", "us; our", "Ελάτε στο σπίτι μας απόψε.", "Come to our house tonight."),
    (40, "εσύ", "you (sg.)", "Εσύ τι θέλεις να κάνεις σήμερα;", "What do you want to do today?"),
    (50, "όλα", "everything", "Όλα θα πάνε καλά, μην ανησυχείς.", "Everything will be fine, don't worry."),
    (57, "αυτοί; αυτές; αυτά", "these, those; they", "Αυτοί μένουν στην Αθήνα.", "They live in Athens."),
    (84, "όλοι", "everyone", "Όλοι ήρθαν στο πάρτι.", "Everyone came to the party."),
    (100, "ωραία", "nicely, beautifully; great!", "Ωραία, τότε πάμε!", "Great, let's go then!"),
    (152, "η Ελλάδα", "Greece", "Η Ελλάδα έχει υπέροχες παραλίες.", "Greece has wonderful beaches."),
    (154, "εσείς", "you (pl.)", "Εσείς από πού είστε;", "Where are you from?"),
    (158, "εμείς", "we", "Εμείς θα πάμε διακοπές τον Αύγουστο.", "We will go on holiday in August."),
    (191, "περισσότερος", "more", "Χρειαζόμαστε περισσότερο χρόνο.", "We need more time."),
    (216, "ορίστε", "here you are, there you go; excuse me?", "Ορίστε, πάρτε τα κλειδιά σας.", "Here you are, take your keys."),
    (236, "χαίρομαι", "I am happy, glad; I enjoy", "Χαίρομαι που σε γνωρίζω.", "I am glad to meet you."),
    (237, "τέλεια", "perfectly; great!", "Τα πήγες τέλεια στις εξετάσεις!", "You did great in the exams!"),
    (255, "τα χρήματα", "the money", "Δεν έχω αρκετά χρήματα μαζί μου.", "I don't have enough money with me."),
    (257, "σοβαρά", "seriously", "Σοβαρά; Δεν το πιστεύω!", "Seriously? I don't believe it!"),
    (264, "αργότερα", "later", "Θα σε πάρω τηλέφωνο αργότερα.", "I will call you later."),
    (300, "εννοείται", "sure, of course", "Εννοείται πως θα έρθω στο πάρτι σου.", "Of course I'll come to your party."),
    (305, "το αστείο", "the joke", "Μου είπε ένα πολύ αστείο αστείο.", "He told me a very funny joke."),
    (307, "τα νέα", "the news", "Ακούσατε τα νέα; Παντρεύεται η Μαρία!", "Did you hear the news? Maria is getting married!"),
    (309, "οι γονείς", "the parents", "Οι γονείς μου ζουν στη Θεσσαλονίκη.", "My parents live in Thessaloniki."),
    (313, "νοιάζω", "I mind, care", "Δε με νοιάζει τι λένε οι άλλοι.", "I don't care what others say."),
    (320, "ο Έλληνας; η Ελληνίδα", "the Greek person", "Ο Έλληνας αγαπάει το φαγητό και την παρέα.", "The Greek person loves food and company."),
    (335, "ακούγομαι", "I sound", "Ακούγεσαι κουρασμένος, είσαι καλά;", "You sound tired, are you OK?"),
    (339, "το μισό", "the half", "Φάε το μισό και δώσε μου το υπόλοιπο.", "Eat half and give me the rest."),
    (361, "βρίσκομαι", "I am (placed, located); I am found", "Η τράπεζα βρίσκεται δίπλα στο σχολείο.", "The bank is located next to the school."),
    (377, "τα ρούχα", "the clothes", "Βάλε τα βρώμικα ρούχα στο πλυντήριο.", "Put the dirty clothes in the washing machine."),
    (380, "τελευταία", "lately", "Τελευταία δουλεύω πάρα πολύ.", "Lately I've been working too much."),
    (400, "τα ελληνικά", "Greek (language)", "Μαθαίνω ελληνικά εδώ και δύο χρόνια.", "I've been learning Greek for two years."),
    (416, "χάλια", "awful, terrible", "Είμαι χάλια σήμερα, δεν κοιμήθηκα καλά.", "I'm awful today, I didn't sleep well."),
    (419, "τα μαλλιά", "the hair", "Έκοψε τα μαλλιά της πολύ κοντά.", "She cut her hair very short."),
    (435, "ρωτάω", "I ask", "Θέλω να σε ρωτήσω κάτι.", "I want to ask you something."),
    (457, "το μυστικό", "the secret", "Μπορείς να κρατήσεις ένα μυστικό;", "Can you keep a secret?"),
    (463, "κρατάω", "I hold, keep", "Κράτα μου μια θέση, σε παρακαλώ.", "Save me a seat, please."),
    (466, "λιγότερος", "less", "Πρέπει να τρώω λιγότερο ζάχαρη.", "I need to eat less sugar."),

    # --- Block 2: ranks 478-881 ---
    (478, "ένα εκατομμύριο", "one million", "Κέρδισε ένα εκατομμύριο στο λαχείο.", "He won one million in the lottery."),
    (479, "το γλυκό", "the dessert, confection", "Τι γλυκό θέλετε; Μπακλαβά ή γαλακτομπούρεκο;", "What dessert would you like? Baklava or galaktoboureko?"),
    (489, "αφορά", "it is about, concerns, relates to", "Αυτό αφορά όλους μας.", "This concerns all of us."),
    (500, "λέγομαι", "I am called", "Λέγομαι Γιάννης, εσύ;", "My name is Yiannis, and you?"),
    (511, "ζητάω", "I ask for, request", "Ζητάω συγγνώμη για την καθυστέρηση.", "I apologize for the delay."),
    (514, "τέσσερα", "four", "Έχω τέσσερα αδέρφια.", "I have four siblings."),
    (536, "η μαλακία; οι μαλακίες", "bullshit, nonsense; stupid thing", "Μη λες μαλακίες, σοβαρέψου.", "Don't talk nonsense, be serious."),
    (541, "ειδικά", "particularly, especially", "Μου αρέσει η μουσική, ειδικά η ελληνική.", "I like music, especially Greek music."),
    (552, "δυνατά", "loudly; hard", "Μίλα πιο δυνατά, δεν σε ακούω.", "Speak louder, I can't hear you."),
    (567, "το ναρκωτικό", "the drug (illegal)", "Τα ναρκωτικά καταστρέφουν ζωές.", "Drugs destroy lives."),
    (568, "τα Χριστούγεννα", "Christmas", "Τα Χριστούγεννα θα τα περάσουμε στο χωριό.", "We will spend Christmas in the village."),
    (575, "ο κώλος", "the arse, ass", "Κάθεσαι όλη μέρα στον κώλο σου.", "You sit on your arse all day."),
    (597, "χειρότερος", "worse", "Σήμερα ο καιρός είναι χειρότερος από χθες.", "Today the weather is worse than yesterday."),
    (611, "η Αμερική", "America", "Θέλει να πάει στην Αμερική για σπουδές.", "She wants to go to America to study."),
    (639, "το Σάββατο", "Saturday", "Το Σάββατο θα πάμε στη θάλασσα.", "On Saturday we will go to the sea."),
    (640, "ελληνικός", "Greek (adj.)", "Η ελληνική κουζίνα είναι από τις καλύτερες.", "Greek cuisine is one of the best."),
    (679, "βαθιά", "deeply", "Πήρε μια βαθιά ανάσα πριν μιλήσει.", "She took a deep breath before speaking."),
    (691, "η Αθήνα", "Athens", "Η Αθήνα είναι η πρωτεύουσα της Ελλάδας.", "Athens is the capital of Greece."),
    (692, "το Παρίσι", "Paris", "Πήγαν στο Παρίσι για το ταξίδι του μέλιτος.", "They went to Paris for their honeymoon."),
    (704, "ο κόλπος", "the bay, gulf; trick, ruse", "Ο κόλπος της Θεσσαλονίκης είναι πανέμορφος.", "The gulf of Thessaloniki is beautiful."),
    (714, "μυστικά", "secretly", "Βρίσκονταν μυστικά εδώ και μήνες.", "They had been meeting secretly for months."),
    (718, "κρύος", "cold", "Ο καφές σου είναι κρύος, να σου ζεστάνω άλλον;", "Your coffee is cold, shall I warm you another?"),
    (720, "εντωμεταξύ", "meanwhile, in the meantime", "Εντωμεταξύ, ετοίμασε τη σαλάτα.", "Meanwhile, prepare the salad."),
    (727, "ηλίθια", "stupidly, foolishly", "Φέρθηκα ηλίθια και ζητάω συγγνώμη.", "I acted stupidly and I apologize."),
    (738, "η Τρίτη", "Tuesday", "Η συνάντηση είναι την Τρίτη.", "The meeting is on Tuesday."),
    (740, "ο μαλάκας", "the wanker, idiot", "Τι μαλάκας είναι αυτός ο τύπος!", "What an idiot that guy is!"),
    (749, "εξαφανίζομαι", "I disappear", "Εξαφανίστηκε χωρίς να πει τίποτα.", "He disappeared without saying anything."),
    (760, "περιγράφω", "I describe", "Μπορείς να μου περιγράψεις τι έγινε;", "Can you describe to me what happened?"),
    (761, "το Λονδίνο", "London", "Έζησα στο Λονδίνο για τρία χρόνια.", "I lived in London for three years."),
    (766, "αποκλείεται", "it's out of the question, no way", "Αποκλείεται να μην το ήξερε.", "There's no way he didn't know."),
    (792, "δίκαιος", "fair, just", "Δεν είναι δίκαιο αυτό που γίνεται.", "What's happening isn't fair."),
    (807, "ξυπνάω", "I wake up", "Ξυπνάω κάθε μέρα στις εφτά.", "I wake up every day at seven."),
    (822, "οι ΗΠΑ; οι Ηνωμένες Πολιτείες Αμερικής", "the USA", "Οι ΗΠΑ είναι μια μεγάλη χώρα.", "The USA is a big country."),
    (823, "αγαπημένος", "favourite; dear, beloved", "Ποιο είναι το αγαπημένο σου φαγητό;", "What is your favourite food?"),
    (831, "επίπεδος", "flat, even", "Η πίστα πρέπει να είναι επίπεδη.", "The track must be flat."),
    (841, "βόρεια", "north, northward", "Η Θεσσαλονίκη βρίσκεται βόρεια της Αθήνας.", "Thessaloniki is north of Athens."),
    (855, "θαυμάσια", "wonderfully; great", "Τα πήγες θαυμάσια στη συνέντευξη.", "You did great at the interview."),
    (863, "η πολιτική", "the politics; policy", "Δεν με ενδιαφέρει η πολιτική.", "I'm not interested in politics."),
    (881, "ωχ", "ouch!; oops!", "Ωχ, ξέχασα τα κλειδιά μου.", "Oops, I forgot my keys."),

    # --- Block 3: ranks 882-1242 ---
    (882, "νότια", "south, southward", "Η Κρήτη βρίσκεται νότια της Ελλάδας.", "Crete is south of Greece."),
    (891, "τεράστια", "enormous, huge; immensely", "Αυτό το κτίριο είναι τεράστιο.", "This building is enormous."),
    (910, "τα σκουπίδια", "the rubbish, trash", "Πέταξε τα σκουπίδια πριν φύγεις.", "Throw out the rubbish before you leave."),
    (918, "απαίσια", "awfully, terribly", "Ένιωσα απαίσια μετά από αυτό που έγινε.", "I felt terrible after what happened."),
    (935, "το υπόλοιπο", "the rest, remainder", "Φάε λίγο τώρα και κράτα το υπόλοιπο για αργότερα.", "Eat some now and keep the rest for later."),
    (954, "ο διάβολος", "the devil", "Τι διάβολο γίνεται εδώ;", "What the devil is going on here?"),
    (960, "συναντάω", "I meet", "Θα τη συναντήσω στις πέντε στο καφέ.", "I will meet her at five at the cafe."),
    (965, "ισχύει", "it is valid; is in force; applies", "Η προσφορά ισχύει μέχρι τέλος του μήνα.", "The offer is valid until the end of the month."),
    (973, "η λογική", "the logic", "Δεν υπάρχει καμία λογική σε αυτό που λες.", "There is no logic in what you're saying."),
    (978, "ο Τούρκος; η Τουρκάλα", "the Turkish person", "Ο Τούρκος γείτονάς μας είναι πολύ φιλικός.", "Our Turkish neighbour is very friendly."),
    (993, "απασχολημένος", "busy, occupied", "Είμαι πολύ απασχολημένος αυτή τη βδομάδα.", "I'm very busy this week."),
    (998, "παραγγέλνω", "I order, place an order", "Θα παραγγείλουμε πίτσα απόψε.", "We'll order pizza tonight."),
    (1013, "τα γυαλιά", "the glasses", "Χωρίς τα γυαλιά μου δεν βλέπω τίποτα.", "Without my glasses I can't see anything."),
    (1014, "η Γαλλία", "France", "Η Γαλλία είναι γνωστή για τα κρασιά της.", "France is known for its wines."),
    (1015, "ήσυχα", "quietly", "Μίλα ήσυχα, κοιμάται το μωρό.", "Speak quietly, the baby is sleeping."),
    (1017, "θυμωμένος", "angry", "Ο μπαμπάς είναι θυμωμένος μαζί μου.", "Dad is angry with me."),
    (1035, "εμφανίζομαι", "I show up, appear", "Εμφανίστηκε ξαφνικά στην πόρτα μου.", "He showed up suddenly at my door."),
    (1040, "η Δευτέρα", "Monday", "Η Δευτέρα είναι η πιο δύσκολη μέρα.", "Monday is the hardest day."),
    (1059, "η Αγγλία", "England", "Σπούδασε στην Αγγλία.", "She studied in England."),
    (1075, "παντρεμένος", "married", "Είναι παντρεμένος με τρία παιδιά.", "He is married with three children."),
    (1079, "χάνομαι", "I get lost, am lost; disappear", "Χάθηκα στο κέντρο γιατί δεν είχα χάρτη.", "I got lost in the centre because I didn't have a map."),
    (1105, "οι οδηγίες", "the instructions, directions", "Διάβασε τις οδηγίες πριν αρχίσεις.", "Read the instructions before you start."),
    (1106, "η Κυριακή", "Sunday", "Την Κυριακή πάμε στην εκκλησία.", "On Sunday we go to church."),
    (1107, "κακά", "badly", "Τα πήγε κακά στο διαγώνισμα.", "He did badly on the test."),
    (1108, "οι ειδήσεις", "the news, headlines", "Είδες τις ειδήσεις σήμερα;", "Did you watch the news today?"),
    (1115, "χρωστάω", "I owe", "Σου χρωστάω είκοσι ευρώ.", "I owe you twenty euros."),
    (1118, "πλένω", "I wash", "Πλένω τα πιάτα κάθε βράδυ.", "I wash the dishes every evening."),
    (1127, "οι συνθήκες", "the conditions, circumstances", "Οι συνθήκες εργασίας δεν είναι καλές.", "The working conditions are not good."),
    (1128, "σύμφωνοι", "ok, agreed", "Σύμφωνοι, τα λέμε αύριο.", "Agreed, we'll talk tomorrow."),
    (1131, "ερωτευμένος", "in love, enamoured", "Είναι ερωτευμένος με τη συμμαθήτριά του.", "He is in love with his classmate."),
    (1138, "ο Χριστός; Χριστός", "Christ", "Χριστός ανέστη! Αληθώς ανέστη!", "Christ is risen! Truly He is risen!"),
    (1158, "μέτριος", "medium; moderate; mediocre", "Θέλω έναν μέτριο καφέ, παρακαλώ.", "I'd like a medium coffee, please."),
    (1160, "η Πέμπτη", "Thursday", "Θα σε δω την Πέμπτη.", "I'll see you on Thursday."),
    (1197, "κολυμπάω", "I swim", "Κολυμπάω στη θάλασσα κάθε καλοκαίρι.", "I swim in the sea every summer."),
    (1198, "κουβεντιάζω", "I chat", "Κάτσαμε και κουβεντιάσαμε για ώρες.", "We sat and chatted for hours."),
    (1210, "παρεπιπτόντως", "by the way, incidentally", "Παρεπιπτόντως, τη γνωρίζεις τη Μαρία;", "By the way, do you know Maria?"),
    (1219, "η Ευρώπη", "Europe", "Η Ελλάδα βρίσκεται στη νότια Ευρώπη.", "Greece is in southern Europe."),
    (1227, "η γκόμενα", "the chick, babe", "Είδες τη γκόμενα του Νίκου;", "Have you seen Nikos's girlfriend?"),
    (1242, "το φορτηγάκι", "the van", "Μετακόμισαν με ένα μικρό φορτηγάκι.", "They moved with a small van."),

    # --- Block 4: ranks 1253-1611 ---
    (1253, "γεννιέμαι", "I am born", "Γεννήθηκα στην Αθήνα το 1990.", "I was born in Athens in 1990."),
    (1278, "βιομηχανικός", "industrial", "Αυτή είναι μια βιομηχανική περιοχή.", "This is an industrial area."),
    (1285, "σούπερ", "super", "Πέρασα σούπερ στο πάρτι!", "I had a super time at the party!"),
    (1289, "δημόσια; δημοσίως", "publicly", "Ζήτησε δημόσια συγγνώμη.", "He apologized publicly."),
    (1305, "το μεσημεριανό", "the lunch", "Τι θα φάμε για μεσημεριανό;", "What are we eating for lunch?"),
    (1308, "ένα χιλιάρικο", "one thousand, one grand", "Μου χρωστάει ένα χιλιάρικο.", "He owes me a grand."),
    (1315, "το αρχίδι", "the testicle, ball", "Τον πόνεσε το αρχίδι του.", "His ball was hurting."),
    (1316, "μαλώνω", "I argue, quarrel", "Μαλώνουν συνέχεια για ανοησίες.", "They argue all the time about nonsense."),
    (1317, "η μερίδα", "the portion, helping", "Η μερίδα ήταν πολύ μεγάλη.", "The portion was very big."),
    (1318, "το αντηλιακό", "the sun cream", "Μη ξεχάσεις να βάλεις αντηλιακό.", "Don't forget to put on sun cream."),
    (1325, "τα δεδομένα", "the data", "Τα δεδομένα δείχνουν βελτίωση.", "The data shows improvement."),
    (1327, "ποιανού", "whose", "Ποιανού είναι αυτό το αυτοκίνητο;", "Whose car is this?"),
    (1329, "απίστευτα", "incredibly, amazingly", "Είναι απίστευτα έξυπνος.", "He is incredibly smart."),
    (1346, "τα ψώνια", "the shopping", "Πρέπει να κάνω τα ψώνια μου.", "I need to do my shopping."),
    (1398, "αργός", "slow", "Το ίντερνετ είναι πολύ αργό σήμερα.", "The internet is very slow today."),
    (1407, "η φάρμα", "the farm", "Ο παππούς μου έχει μια φάρμα στη Λάρισα.", "My grandfather has a farm in Larissa."),
    (1409, "ονομάζομαι", "I am named", "Ονομάζομαι Ελένη.", "My name is Eleni."),
    (1419, "η φυσική", "the physics", "Η φυσική ήταν το αγαπημένο μου μάθημα.", "Physics was my favourite subject."),
    (1422, "οικονομικά", "financially, economically; economics", "Οικονομικά δεν πάμε καλά φέτος.", "Financially we're not doing well this year."),
    (1426, "ετοιμάζομαι", "I get ready, prepare myself", "Ετοιμάζομαι να βγω, περίμενε.", "I'm getting ready to go out, wait."),
    (1437, "βαριά", "heavily", "Αναστέναξε βαριά και κάθισε.", "He sighed heavily and sat down."),
    (1440, "τρελαίνομαι", "I go mad", "Τρελαίνομαι για σοκολάτα!", "I'm crazy about chocolate!"),
    (1445, "η Αφρική", "Africa", "Η Αφρική είναι η δεύτερη μεγαλύτερη ήπειρος.", "Africa is the second largest continent."),
    (1450, "ενδιαφέρομαι", "I am interested in", "Ενδιαφέρομαι για την ιστορία.", "I am interested in history."),
    (1470, "η Γερμανία", "Germany", "Πήγε στη Γερμανία για δουλειά.", "He went to Germany for work."),
    (1472, "η Κίνα", "China", "Η Κίνα έχει τεράστιο πληθυσμό.", "China has a huge population."),
    (1478, "παράξενα", "strangely", "Με κοίταξε παράξενα.", "She looked at me strangely."),
    (1480, "λογικά", "logically", "Λογικά θα φτάσει στις δέκα.", "Logically he should arrive at ten."),
    (1499, "σκάω; σκάζω", "I burst, explode; I show up (slang); shut up! (σκάσε)", "Σκάσε, μιλάω στο τηλέφωνο!", "Shut up, I'm on the phone!"),
    (1518, "φιλάκια", "kisses!", "Φιλάκια, τα λέμε αύριο!", "Kisses, talk to you tomorrow!"),
    (1531, "καφέ", "brown", "Φοράει ένα καφέ παλτό.", "She is wearing a brown coat."),
    (1542, "δυτικά", "west, westward", "Η Πάτρα είναι δυτικά της Ελλάδας.", "Patras is in western Greece."),
    (1549, "εξωτερικός", "outside, exterior, external", "Οι εξωτερικοί τοίχοι χρειάζονται βάψιμο.", "The exterior walls need painting."),
    (1557, "χωράω", "I fit, accommodate", "Δε χωράω σε αυτό το παντελόνι πια.", "I don't fit in these trousers anymore."),
    (1558, "ο τουρίστας; η τουρίστρια", "the tourist", "Οι τουρίστες φωτογραφίζουν την Ακρόπολη.", "The tourists photograph the Acropolis."),
    (1579, "συνηθισμένος", "used to, accustomed to; customary", "Δεν είμαι συνηθισμένος στη ζέστη.", "I'm not used to the heat."),
    (1598, "αναπτύσσω", "I develop", "Αναπτύσσουμε μια νέα εφαρμογή.", "We are developing a new app."),
    (1605, "το υγρό", "the liquid, fluid", "Μην πιεις αυτό το υγρό!", "Don't drink that liquid!"),
    (1610, "το τέταρτο", "the quarter", "Είναι τρεις και τέταρτο.", "It's a quarter past three."),
    (1611, "η Ιταλία", "Italy", "Η Ιταλία είναι γνωστή για τα ζυμαρικά.", "Italy is known for pasta."),

    # --- Block 5: ranks 1628-1898 ---
    (1628, "κουνιέμαι", "I move about; get a move on; wag", "Κουνήσου, θα αργήσουμε!", "Get a move on, we'll be late!"),
    (1658, "το φροντιστήριο", "the cram school, tutoring school", "Πηγαίνει φροντιστήριο για μαθηματικά.", "She goes to tutoring school for maths."),
    (1669, "η Τετάρτη", "Wednesday", "Θα πάμε σινεμά την Τετάρτη.", "We'll go to the cinema on Wednesday."),
    (1678, "το μπιφτέκι", "the burger", "Θέλω ένα μπιφτέκι με πατάτες.", "I want a burger with chips."),
    (1682, "εξακολουθώ", "I go on, continue", "Εξακολουθεί να μου τηλεφωνεί κάθε μέρα.", "He continues to call me every day."),
    (1698, "ακυρώνω", "I cancel", "Πρέπει να ακυρώσω το ραντεβού μου.", "I need to cancel my appointment."),
    (1700, "τα κοσμήματα", "the jewellery", "Τα κοσμήματα αυτά ανήκαν στη γιαγιά μου.", "This jewellery belonged to my grandmother."),
    (1703, "τα γαλλικά", "French (language)", "Μιλάει γαλλικά πολύ καλά.", "She speaks French very well."),
    (1715, "το ζόρι", "the strain; slog", "Με το ζόρι τελείωσα τη δουλειά.", "I barely finished the work."),
    (1723, "ξεκάθαρα", "clearly, plainly", "Του το είπα ξεκάθαρα.", "I told him clearly."),
    (1724, "φυσιολογικά", "normally, naturally", "Φυσιολογικά φτάνει σε μισή ώρα.", "Normally it takes half an hour."),
    (1726, "η οπτική", "the point of view; optics", "Από τη δική μου οπτική, έχεις δίκιο.", "From my point of view, you're right."),
    (1753, "φέρομαι", "I behave; treat (somebody)", "Φέρσου σωστά στους μεγαλύτερους.", "Behave properly towards elders."),
    (1756, "ξανασυμβαίνω", "I happen again, recur", "Αυτό δεν πρέπει να ξανασυμβεί.", "This must not happen again."),
    (1761, "το διαδίκτυο", "the internet", "Βρήκα τις πληροφορίες στο διαδίκτυο.", "I found the information on the internet."),
    (1780, "σιγουρεύομαι", "I make sure, ensure", "Σιγουρέψου ότι κλείδωσες την πόρτα.", "Make sure you locked the door."),
    (1781, "περίφημα", "great, brilliantly", "Τα πάει περίφημα στη δουλειά.", "He's doing brilliantly at work."),
    (1790, "η τεχνική", "the technique", "Αυτή η τεχνική μαγειρέματος είναι παραδοσιακή.", "This cooking technique is traditional."),
    (1791, "εκπλήσσομαι", "I am surprised, astonished", "Εκπλήσσομαι που δεν το ήξερες.", "I'm surprised you didn't know."),
    (1797, "μαγικά", "magically", "Το πρόβλημα λύθηκε μαγικά.", "The problem was solved magically."),
    (1819, "ιατρικός", "medical", "Χρειάζεται ιατρική βοήθεια.", "He needs medical help."),
    (1823, "απαραίτητα", "necessarily", "Δεν είναι απαραίτητα σωστό αυτό.", "That's not necessarily correct."),
    (1829, "το βραδινό", "the dinner, supper", "Τι θα φτιάξεις για βραδινό;", "What will you make for dinner?"),
    (1838, "συγκεντρώνομαι", "I concentrate, focus; assemble", "Δεν μπορώ να συγκεντρωθώ με τόσο θόρυβο.", "I can't concentrate with so much noise."),
    (1845, "εκρήγνυμαι", "I explode", "Το ηφαίστειο εξερράγη το πρωί.", "The volcano erupted in the morning."),
    (1851, "το πέος", "the penis", "Αυτό είναι ιατρικό βιβλίο για την ανατομία του πέους.", "This is a medical book about the anatomy of the penis."),
    (1852, "χρονικός", "time (adj.), of time; chronic", "Δεν υπάρχει χρονικό περιθώριο.", "There is no time margin."),
    (1858, "υπομονετικός", "patient", "Πρέπει να είσαι πιο υπομονετικός.", "You need to be more patient."),
    (1863, "η ενημέρωση", "the update; briefing", "Θα κάνουμε μια ενημέρωση στις δέκα.", "We will have a briefing at ten."),
    (1864, "διορθώνω", "I correct; mend", "Μπορείς να διορθώσεις αυτό το λάθος;", "Can you correct this mistake?"),
    (1866, "το σύμπτωμα", "the symptom", "Ο πυρετός είναι κοινό σύμπτωμα.", "Fever is a common symptom."),
    (1870, "ο μπάσταρδος", "the bastard", "Αυτός ο μπάσταρδος μας κορόιδεψε.", "That bastard cheated us."),
    (1872, "εκρηκτικός", "explosive", "Η κατάσταση είναι εκρηκτική.", "The situation is explosive."),
    (1873, "καίγομαι", "I burn, swelter; get a sunburn", "Κάηκα στον ήλιο γιατί ξέχασα αντηλιακό.", "I got sunburnt because I forgot sun cream."),
    (1874, "ενθουσιασμένος", "excited, enthusiastic", "Τα παιδιά είναι ενθουσιασμένα με το ταξίδι.", "The children are excited about the trip."),
    (1877, "παραδοσιακός", "traditional", "Αυτό είναι ένα παραδοσιακό ελληνικό πιάτο.", "This is a traditional Greek dish."),
    (1878, "εμπνέω", "I inspire", "Η ιστορία της με εμπνέει.", "Her story inspires me."),
    (1885, "η Ιαπωνία", "Japan", "Η Ιαπωνία φημίζεται για την τεχνολογία της.", "Japan is famous for its technology."),
    (1886, "σπασμένος", "broken", "Το παράθυρο είναι σπασμένο.", "The window is broken."),
    (1887, "η Ρωσία", "Russia", "Η Ρωσία είναι η μεγαλύτερη χώρα στον κόσμο.", "Russia is the biggest country in the world."),
    (1889, "βρώμικος", "dirty", "Τα ρούχα σου είναι βρώμικα.", "Your clothes are dirty."),
    (1898, "ώριμος", "mature; ripe", "Τα φρούτα δεν είναι ακόμα ώριμα.", "The fruit is not ripe yet."),

    # --- Block 6: ranks 1904-2134 ---
    (1904, "κερνάω", "I treat (somebody), pay (for somebody)", "Σε κερνάω έναν καφέ.", "I'm treating you to a coffee."),
    (1915, "φανταστικά", "fantastically", "Πέρασα φανταστικά στη Μύκονο.", "I had a fantastic time in Mykonos."),
    (1918, "αράζω", "I hang out, chill out", "Θα αράξουμε στην παραλία όλη μέρα.", "We'll chill out on the beach all day."),
    (1932, "η Ισπανία", "Spain", "Η Ισπανία έχει υπέροχο κλίμα.", "Spain has a wonderful climate."),
    (1939, "αρνούμαι", "I deny; refuse, say no", "Αρνήθηκε να μας βοηθήσει.", "He refused to help us."),
    (1949, "αγνοώ", "I ignore", "Τον αγνόησε τελείως.", "She ignored him completely."),
    (1951, "φοβερά", "tremendously, terribly; awesome", "Ήταν φοβερά ωραίο το φιλμ!", "The film was terribly good!"),
    (1963, "το Βερολίνο", "Berlin", "Πήγαμε στο Βερολίνο πέρυσι.", "We went to Berlin last year."),
    (1978, "κοντός", "short", "Ο Γιώργος είναι κοντός αλλά δυνατός.", "Giorgos is short but strong."),
    (1984, "η εκδήλωση", "the event; manifestation", "Η εκδήλωση θα γίνει στο δημαρχείο.", "The event will take place at the town hall."),
    (1996, "αμάν", "good grief!, oh dear!; oh no!", "Αμάν πια, βαρέθηκα!", "Oh come on, I'm bored!"),
    (1998, "ζεστά", "warmly; cosily", "Ντύσου ζεστά, κάνει κρύο.", "Dress warmly, it's cold."),
    (1999, "η Ινδία", "India", "Η Ινδία είναι μια χώρα με πλούσιο πολιτισμό.", "India is a country with a rich culture."),
    (2002, "ώπα", "oops; hang on", "Ώπα, τι έγινε εδώ;", "Hang on, what happened here?"),
    (2006, "υψηλός", "high, lofty", "Οι τιμές είναι πολύ υψηλές.", "The prices are very high."),
    (2007, "η ηθική", "the ethics, morality", "Η ηθική αυτής της πράξης αμφισβητείται.", "The ethics of this action are questionable."),
    (2018, "η βρύση", "the tap, faucet", "Κλείσε τη βρύση, τρέχει νερό.", "Turn off the tap, the water is running."),
    (2019, "παγκόσμια; παγκοσμίως", "globally, universally", "Η κλιματική αλλαγή αφορά παγκοσμίως.", "Climate change is a global concern."),
    (2020, "η δραστηριότητα", "the activity", "Ποια είναι η αγαπημένη σου δραστηριότητα;", "What is your favourite activity?"),
    (2030, "διπλά", "doubly, twice as", "Πλήρωσε τα διπλά από ό,τι έπρεπε.", "He paid double what he should have."),
    (2032, "ξεκουράζομαι", "I rest", "Ξεκουράσου λίγο, δούλεψες πολύ.", "Rest a bit, you've worked a lot."),
    (2033, "το κολιέ", "the necklace", "Της χάρισε ένα χρυσό κολιέ.", "He gave her a gold necklace."),
    (2036, "κουράζομαι", "I get tired", "Κουράζομαι εύκολα με τη ζέστη.", "I get tired easily in the heat."),
    (2037, "ευχαριστημένος", "pleased, satisfied", "Είμαι ευχαριστημένος με τη δουλειά σου.", "I'm pleased with your work."),
    (2038, "στεγνός", "dry", "Τα ρούχα είναι στεγνά, μάζεψέ τα.", "The clothes are dry, take them in."),
    (2046, "παγωμένος", "frozen, chilled; freezing", "Θέλω μια μπίρα παγωμένη.", "I want a chilled beer."),
    (2048, "πολεμάω", "I battle, fight", "Πολέμησαν γενναία για την ελευθερία.", "They fought bravely for freedom."),
    (2050, "ενοχλητικός", "annoying", "Αυτός ο θόρυβος είναι πολύ ενοχλητικός.", "This noise is very annoying."),
    (2076, "εντοπίζω", "I locate, detect; track down", "Η αστυνομία εντόπισε τον ύποπτο.", "The police located the suspect."),
    (2078, "βελτιώνω", "I improve, enhance", "Θέλω να βελτιώσω τα ελληνικά μου.", "I want to improve my Greek."),
    (2084, "η ανησυχία", "the anxiety, unease", "Η ανησυχία του αυξάνεται μέρα με τη μέρα.", "His anxiety is increasing day by day."),
    (2085, "ένα δισεκατομμύριο", "one billion", "Η εταιρεία αξίζει ένα δισεκατομμύριο.", "The company is worth one billion."),
    (2092, "το οστό", "the bone", "Έσπασε ένα οστό στο πόδι του.", "He broke a bone in his leg."),
    (2093, "ο γαλαξίας", "the galaxy", "Ο γαλαξίας μας λέγεται Γαλαξίας.", "Our galaxy is called the Milky Way."),
    (2094, "η δίωξη", "the persecution; prosecution", "Η δίωξη ναρκωτικών ερευνά την υπόθεση.", "The drug prosecution unit is investigating the case."),
    (2097, "η ιστοσελίδα", "the website, webpage", "Επισκέψου την ιστοσελίδα μας.", "Visit our website."),
    (2105, "αναγκάζω", "I force, compel", "Κανείς δεν σε αναγκάζει να μείνεις.", "Nobody is forcing you to stay."),
    (2109, "βασίζομαι", "I rely on, depend on; am based on", "Βασίζομαι σε σένα.", "I rely on you."),
    (2119, "η καφετέρια", "the cafe", "Θα σε περιμένω στην καφετέρια.", "I'll wait for you at the cafe."),
    (2121, "πρακτικά", "practically", "Πρακτικά είναι αδύνατο.", "Practically it's impossible."),
    (2126, "η εκδοχή", "the version, variant", "Ποια είναι η δική σου εκδοχή;", "What is your version?"),
    (2127, "προηγουμένως", "previously, formerly", "Όπως ανέφερα προηγουμένως.", "As I mentioned previously."),
    (2128, "συνδέομαι", "I am connected", "Αυτά τα δύο θέματα συνδέονται.", "These two issues are connected."),
    (2134, "η αντίθεση", "the contrast; opposition", "Σε αντίθεση με εσένα, εγώ σηκώνομαι νωρίς.", "In contrast to you, I get up early."),

    # --- Block 7: ranks 2139-2316 ---
    (2139, "καταθέτω", "I testify; deposit money", "Κατέθεσε χρήματα στον λογαριασμό της.", "She deposited money in her account."),
    (2146, "η προτεραιότητα", "the priority", "Η υγεία είναι η πρώτη προτεραιότητα.", "Health is the first priority."),
    (2151, "ισχυρίζομαι", "I claim, maintain", "Ισχυρίζεται ότι δεν ήταν εκεί.", "He claims he wasn't there."),
    (2154, "περιλαμβάνω", "I include, encompass", "Η τιμή περιλαμβάνει πρωινό.", "The price includes breakfast."),
    (2158, "αρχικός", "initial; original", "Ο αρχικός μας σχεδιασμός άλλαξε.", "Our initial plan changed."),
    (2161, "η στενή", "the narrow (street); prison (slang)", "Περπατήσαμε σε μια στενή δίπλα στο λιμάνι.", "We walked along a narrow street by the port."),
    (2174, "τα ισπανικά", "Spanish (language)", "Μαθαίνει ισπανικά εδώ και ένα χρόνο.", "She has been learning Spanish for a year."),
    (2177, "άθλια", "miserably; awfully, terribly", "Ένιωσα άθλια όλη τη μέρα.", "I felt awful all day."),
    (2186, "μοιράζομαι", "I share", "Μοιραζόμαστε το ίδιο δωμάτιο.", "We share the same room."),
    (2189, "σεξουαλικά", "sexually", "Η σεξουαλική αγωγή διδάσκεται στα σχολεία.", "Sex education is taught in schools."),
    (2191, "μετακομίζω", "I relocate, move house", "Μετακόμισα στη Θεσσαλονίκη πέρυσι.", "I moved to Thessaloniki last year."),
    (2193, "επιλέγω", "I choose, select", "Επέλεξε αυτό που σου αρέσει.", "Choose what you like."),
    (2198, "σοκάρω", "I shock", "Τα νέα μας σόκαραν.", "The news shocked us."),
    (2202, "αποτυγχάνω", "I fail", "Απέτυχε στις εξετάσεις δύο φορές.", "He failed the exams twice."),
    (2203, "η Μόσχα", "Moscow", "Η Μόσχα είναι πολύ κρύα τον χειμώνα.", "Moscow is very cold in winter."),
    (2204, "περαιτέρω", "further, to a greater extent", "Δε θα συζητήσω περαιτέρω.", "I will not discuss this further."),
    (2206, "το τρέξιμο", "the run, jog", "Κάνω τρέξιμο κάθε πρωί.", "I go for a run every morning."),
    (2207, "απειλώ", "I threaten, menace", "Τον απείλησε ότι θα τον καταγγείλει.", "She threatened to report him."),
    (2208, "θετικός", "positive", "Προσπαθώ να είμαι θετικός.", "I try to be positive."),
    (2212, "η διακοπή", "the interruption; power cut", "Είχαμε διακοπή ρεύματος χθες βράδυ.", "We had a power cut last night."),
    (2216, "πληγώνω", "I hurt, injure", "Δεν ήθελα να σε πληγώσω.", "I didn't want to hurt you."),
    (2218, "εφευρίσκω", "I invent", "Ποιος εφηύρε τον ηλεκτρισμό;", "Who invented electricity?"),
    (2220, "κατευθύνομαι", "I head for, head towards", "Κατευθύνθηκε προς την έξοδο.", "He headed towards the exit."),
    (2221, "κινούμαι", "I move, get moving", "Πρέπει να κινηθούμε γρήγορα.", "We need to move quickly."),
    (2225, "ανακατεύομαι", "I get involved; meddle; feel sick", "Μην ανακατεύεσαι στις δουλειές μου.", "Don't meddle in my business."),
    (2229, "ο πυρήνας", "the core, nucleus, kernel", "Ο πυρήνας του προβλήματος είναι αλλού.", "The core of the problem is elsewhere."),
    (2230, "το ιατρείο", "the doctor's office, medical practice", "Το ιατρείο ανοίγει στις εννιά.", "The doctor's office opens at nine."),
    (2231, "ακουστός", "audible", "Η μουσική ήταν μόλις ακουστή.", "The music was barely audible."),
    (2235, "κρύβομαι", "I hide, conceal myself", "Τα παιδιά κρύβονται πίσω από το δέντρο.", "The children are hiding behind the tree."),
    (2236, "η ανακούφιση", "the relief", "Ένιωσε μεγάλη ανακούφιση μετά τα αποτελέσματα.", "She felt great relief after the results."),
    (2238, "το πλυντήριο", "the washing machine", "Το πλυντήριο χάλασε πάλι.", "The washing machine broke again."),
    (2239, "αποκτάω", "I obtain, acquire", "Απέκτησαν ένα σπίτι στο νησί.", "They acquired a house on the island."),
    (2241, "αναστατωμένος", "upset, distressed", "Είναι πολύ αναστατωμένη με τα νέα.", "She is very upset about the news."),
    (2244, "η περιοδεία", "the tour", "Η μπάντα κάνει περιοδεία στην Ευρώπη.", "The band is touring Europe."),
    (2245, "το σπέρμα", "the semen, sperm", "Η τράπεζα σπέρματος βρίσκεται στο νοσοκομείο.", "The sperm bank is at the hospital."),
    (2246, "η ιδιοφυΐα", "the genius", "Ο Αϊνστάιν ήταν ιδιοφυΐα.", "Einstein was a genius."),
    (2253, "σηκώνομαι", "I get up, stand up", "Σηκώθηκε νωρίς σήμερα.", "He got up early today."),
    (2255, "επιβιώνω", "I survive", "Επιβίωσε από ένα σοβαρό ατύχημα.", "He survived a serious accident."),
    (2263, "συμπεριφέρομαι", "I behave; treat (somebody)", "Συμπεριφέρσου σωστά στους φίλους σου.", "Treat your friends properly."),
    (2264, "το σύνδρομο", "the syndrome", "Αυτό το σύνδρομο είναι σπάνιο.", "This syndrome is rare."),
    (2267, "η αναβολή", "the postponement", "Η αναβολή του αγώνα ήταν αναγκαία.", "The postponement of the match was necessary."),
    (2269, "το άλμπουμ", "the album", "Το νέο τους άλμπουμ είναι καταπληκτικό.", "Their new album is amazing."),
    (2276, "η διάρρηξη", "the burglary", "Έγινε μια διάρρηξη στο διπλανό μαγαζί.", "There was a burglary at the shop next door."),
    (2278, "αναλύω", "I analyse", "Πρέπει να αναλύσουμε τα δεδομένα.", "We need to analyse the data."),
    (2283, "ελάχιστα", "very little, barely, hardly", "Ξέρω ελάχιστα για το θέμα.", "I know very little about the subject."),
    (2287, "η παραίσθηση", "the hallucination", "Νόμιζε ότι είχε παραίσθηση.", "He thought he was having a hallucination."),
    (2288, "κλειδωμένος", "locked", "Η πόρτα ήταν κλειδωμένη.", "The door was locked."),
    (2295, "το ναυτικό", "the navy", "Υπηρέτησε στο ναυτικό.", "He served in the navy."),
    (2298, "απογίνομαι", "what becomes of (someone)", "Τι θα απογίνω χωρίς εσένα;", "What will become of me without you?"),
    (2300, "άθλιος", "miserable, wretched, pathetic", "Οι συνθήκες ζωής ήταν άθλιες.", "The living conditions were miserable."),
    (2302, "το δοχείο", "the container, vessel", "Βάλε το νερό στο δοχείο.", "Put the water in the container."),
    (2305, "ο μπάρμαν", "the barman", "Ο μπάρμαν φτιάχνει καταπληκτικά κοκτέιλ.", "The barman makes amazing cocktails."),
    (2306, "η κυκλοφορία", "the traffic; circulation; release", "Η κυκλοφορία είναι τρελή στο κέντρο.", "The traffic is crazy in the centre."),
    (2307, "κρυμμένος", "hidden, concealed", "Βρήκε ένα κρυμμένο δωμάτιο.", "He found a hidden room."),
    (2311, "αποκλειστικά", "exclusively, solely", "Αυτό αφορά αποκλειστικά εσένα.", "This concerns exclusively you."),
    (2313, "η φράση", "the phrase, idiom; quote", "Αυτή η φράση δεν βγάζει νόημα.", "This phrase doesn't make sense."),
    (2315, "το συμβάν", "the incident", "Η αστυνομία ερευνά το συμβάν.", "The police are investigating the incident."),
    (2316, "το αδιέξοδο", "the dead end; standoff, stalemate", "Φτάσαμε σε αδιέξοδο.", "We reached a dead end."),

    # --- Block 8: ranks 2319-2437 ---
    (2319, "επικοινωνώ", "I communicate; contact", "Επικοινώνησε μαζί μας αν χρειαστείς βοήθεια.", "Contact us if you need help."),
    (2321, "ο ενήλικος; ο ενήλικας", "the adult", "Κάθε ενήλικας έχει δικαιώματα.", "Every adult has rights."),
    (2331, "ίσια", "straight, straight ahead", "Πήγαινε ίσια και μετά στρίψε δεξιά.", "Go straight and then turn right."),
    (2334, "ψεύτικα", "fakely, in a fake way", "Χαμογελούσε ψεύτικα.", "She was smiling fakely."),
    (2336, "η αποκάλυψη", "the revelation; apocalypse", "Η αποκάλυψη αυτή μας σόκαρε.", "This revelation shocked us."),
    (2338, "βρεγμένος", "wet", "Μη κάτσεις στο βρεγμένο παγκάκι.", "Don't sit on the wet bench."),
    (2349, "η μάρκα", "the brand, make", "Τι μάρκα είναι τα παπούτσια σου;", "What brand are your shoes?"),
    (2350, "οι αποσκευές", "the luggage, baggage", "Χάσαμε τις αποσκευές μας στο αεροδρόμιο.", "We lost our luggage at the airport."),
    (2354, "το βέλος", "the arrow, bolt", "Το βέλος χτύπησε τον στόχο.", "The arrow hit the target."),
    (2356, "παρόμοια", "similarly", "Σκέφτονται παρόμοια.", "They think similarly."),
    (2358, "η Τουρκία", "Turkey", "Η Τουρκία είναι γείτονας της Ελλάδας.", "Turkey is a neighbour of Greece."),
    (2361, "το πλάνο", "the plan", "Ποιο είναι το πλάνο για αύριο;", "What is the plan for tomorrow?"),
    (2362, "απαλά", "gently, softly", "Της μίλησε απαλά.", "He spoke to her gently."),
    (2363, "το χόμπι", "the hobby", "Η ζωγραφική είναι το χόμπι μου.", "Painting is my hobby."),
    (2366, "παράνομα", "illegally", "Παρκάρεις παράνομα.", "You're parking illegally."),
    (2368, "η διάσωση", "the rescue", "Η ομάδα διάσωσης έφτασε γρήγορα.", "The rescue team arrived quickly."),
    (2369, "διαβεβαιώνω", "I assert that; I assure (somebody) that", "Σε διαβεβαιώνω ότι θα το φροντίσω.", "I assure you I'll take care of it."),
    (2371, "διαρκώς", "constantly; perpetually", "Παραπονιέται διαρκώς.", "He complains constantly."),
    (2372, "η λεπίδα", "the blade", "Η λεπίδα του μαχαιριού είναι κοφτερή.", "The blade of the knife is sharp."),
    (2374, "η πρακτική", "the practice; internship", "Κάνει πρακτική σε μια εταιρεία.", "She's doing an internship at a company."),
    (2375, "η βαρύτητα", "the gravity; importance", "Η βαρύτητα στη Σελήνη είναι μικρότερη.", "Gravity on the Moon is weaker."),
    (2377, "ο άνθρακας", "the carbon; coal", "Ο άνθρακας ήταν σημαντική πηγή ενέργειας.", "Coal was an important energy source."),
    (2378, "η κριτική", "the criticism; review, critique", "Η κριτική της ταινίας ήταν θετική.", "The review of the film was positive."),
    (2379, "ακουμπάω", "I touch; I lean/rest (something) against", "Μην ακουμπάς τον τοίχο, είναι βαμμένος.", "Don't touch the wall, it's freshly painted."),
    (2380, "ντυμένος", "dressed, clothed", "Ήταν ντυμένος στα μαύρα.", "He was dressed in black."),
    (2382, "η κούπα", "the cup, mug", "Θέλω μια κούπα ζεστή σοκολάτα.", "I want a mug of hot chocolate."),
    (2386, "ποινικός", "penal, criminal", "Ποινική δίωξη ασκήθηκε εναντίον του.", "Criminal charges were filed against him."),
    (2387, "το πρωτότυπο", "the original; prototype", "Αυτό είναι το πρωτότυπο, όχι αντίγραφο.", "This is the original, not a copy."),
    (2389, "η αλληλογραφία", "the correspondence", "Η αλληλογραφία φτάνει κάθε πρωί.", "The correspondence arrives every morning."),
    (2391, "το κύτταρο", "the cell (biological)", "Τα κύτταρα αναπαράγονται συνεχώς.", "Cells reproduce constantly."),
    (2394, "το συκώτι", "the liver", "Πονάει στο συκώτι.", "He has pain in his liver."),
    (2395, "συναισθηματικά", "emotionally", "Αυτό τον επηρέασε συναισθηματικά.", "This affected him emotionally."),
    (2396, "η τάση", "the trend, tendency; voltage", "Η τάση είναι να δουλεύουμε από το σπίτι.", "The trend is to work from home."),
    (2398, "μπερδεμένος", "confused; confusing", "Είμαι μπερδεμένος με τις οδηγίες.", "I'm confused by the instructions."),
    (2399, "φοβισμένος", "scared, frightened", "Το παιδί είναι φοβισμένο από τη θύελλα.", "The child is scared of the storm."),
    (2400, "το σκάνδαλο", "the scandal", "Το σκάνδαλο έγινε πρώτο θέμα.", "The scandal became front-page news."),
    (2404, "η συγχώρεση", "the forgiveness", "Ζήτησε συγχώρεση από τους γονείς του.", "He asked forgiveness from his parents."),
    (2405, "το σουτιέν", "the bra", "Αγόρασε ένα καινούργιο σουτιέν.", "She bought a new bra."),
    (2407, "ξεφορτώνομαι", "I get rid of", "Πρέπει να ξεφορτωθούμε αυτά τα παλιά έπιπλα.", "We need to get rid of this old furniture."),
    (2408, "το φίλτρο", "the filter", "Πρέπει να αλλάξεις το φίλτρο του νερού.", "You need to change the water filter."),
    (2410, "το επιδόρπιο", "the dessert, pudding", "Τι θέλετε για επιδόρπιο;", "What would you like for dessert?"),
    (2412, "προσεύχομαι", "I pray", "Προσεύχεται κάθε βράδυ.", "She prays every night."),
    (2414, "η ατάκα", "the line (of dialogue); catchphrase", "Αυτή η ατάκα είναι από αυτή την ταινία.", "That line is from that film."),
    (2415, "η ροή", "the flow", "Η ροή του ποταμού είναι δυνατή.", "The flow of the river is strong."),
    (2417, "εναλλακτικός", "alternative", "Υπάρχει εναλλακτική λύση;", "Is there an alternative solution?"),
    (2418, "εγκεφαλικός", "cerebral; stroke (medical)", "Ο παππούς μου έπαθε εγκεφαλικό.", "My grandfather had a stroke."),
    (2422, "η επίδραση", "the impact, effect", "Η επίδραση της τεχνολογίας είναι τεράστια.", "The impact of technology is enormous."),
    (2425, "η υποψία", "the suspicion, inkling", "Η αστυνομία έχει υποψίες.", "The police have suspicions."),
    (2426, "η βελόνα", "the needle", "Φοβάμαι τις βελόνες.", "I'm afraid of needles."),
    (2430, "πλαστικός", "plastic", "Χρησιμοποιούμε λιγότερες πλαστικές σακούλες.", "We use fewer plastic bags."),
    (2431, "έντονα", "intensely", "Με κοίταξε έντονα.", "He looked at me intensely."),
    (2432, "η επιβεβαίωση", "the confirmation, validation", "Περιμένω την επιβεβαίωση του ραντεβού.", "I'm waiting for the confirmation of the appointment."),
    (2434, "μπροστινός", "front, frontal", "Κάθισε στο μπροστινό κάθισμα.", "He sat in the front seat."),
    (2437, "τσεκάρω", "I check", "Τσέκαρε αν κλείδωσες την πόρτα.", "Check if you locked the door."),

    # --- Block 9: ranks 2439-2500 ---
    (2439, "το μπέρδεμα", "the muddle, mix-up, mess", "Έγινε ένα μεγάλο μπέρδεμα με τα εισιτήρια.", "There was a big mix-up with the tickets."),
    (2441, "εγκαίρως", "in time, in a timely manner", "Φτάσαμε εγκαίρως στο αεροδρόμιο.", "We arrived at the airport in time."),
    (2445, "χαλαρά", "loosely; casually, leisurely", "Πέρασε το Σαββατοκύριακο χαλαρά.", "He spent the weekend leisurely."),
    (2447, "η συμμαχία", "the alliance", "Οι δύο χώρες σχημάτισαν συμμαχία.", "The two countries formed an alliance."),
    (2449, "η προσέγγιση", "the approach", "Χρειαζόμαστε μια νέα προσέγγιση.", "We need a new approach."),
    (2450, "το αίτημα", "the request", "Το αίτημά σας εγκρίθηκε.", "Your request has been approved."),
    (2451, "ιδού", "here it is, there you go", "Ιδού τα αποτελέσματα.", "Here are the results."),
    (2452, "το πουλόβερ", "the jumper, sweater", "Φόρεσε ένα ζεστό πουλόβερ.", "Put on a warm sweater."),
    (2453, "η απόκτηση", "the acquisition, obtainment", "Η απόκτηση σπιτιού είναι δύσκολη.", "Acquiring a house is difficult."),
    (2454, "χαμηλός", "low", "Μίλα πιο χαμηλά, παρακαλώ.", "Speak more quietly, please."),
    (2456, "χαρακτηριστικά", "characteristically", "Γέλασε χαρακτηριστικά.", "He laughed characteristically."),
    (2457, "στρογγυλός", "round, circular", "Κάθισαν γύρω από ένα στρογγυλό τραπέζι.", "They sat around a round table."),
    (2459, "το βάζο", "the vase; jar", "Βάλε τα λουλούδια στο βάζο.", "Put the flowers in the vase."),
    (2460, "το βραχιόλι", "the bracelet", "Φοράει ένα ασημένιο βραχιόλι.", "She wears a silver bracelet."),
    (2462, "ο φράχτης; ο φράκτης", "the fence", "Χρειάζεται ο φράχτης βάψιμο.", "The fence needs painting."),
    (2466, "ο θαυμαστής; η θαυμάστρια", "the admirer", "Έχει πολλούς θαυμαστές.", "She has many admirers."),
    (2467, "το άνοιγμα", "the opening", "Το άνοιγμα του μαγαζιού είναι αύριο.", "The opening of the shop is tomorrow."),
    (2472, "έντονος", "intense", "Είχε μια έντονη συζήτηση μαζί του.", "She had an intense discussion with him."),
    (2475, "το φαΐ", "the food, the meal", "Το φαΐ ήταν νοστιμότατο.", "The food was delicious."),
    (2477, "σκάβω", "I dig", "Σκάβει στον κήπο για να φυτέψει λουλούδια.", "He's digging in the garden to plant flowers."),
    (2479, "ο εξωγήινος", "the alien, extraterrestrial", "Πιστεύεις στους εξωγήινους;", "Do you believe in aliens?"),
    (2480, "το τόξο", "the bow; arc, arch", "Ο Ρομπέν Χουντ χρησιμοποιούσε τόξο.", "Robin Hood used a bow."),
    (2481, "παλιότερα", "formerly, in the past", "Παλιότερα ζούσαμε στην Πάτρα.", "In the past we lived in Patras."),
    (2483, "η ειλικρίνεια", "the truthfulness, honesty, sincerity", "Εκτιμώ την ειλικρίνειά σου.", "I appreciate your honesty."),
    (2486, "αρσενικός", "male, masculine", "Το αρσενικό λιοντάρι είναι μεγαλύτερο.", "The male lion is bigger."),
    (2487, "τυχαίος", "random", "Δεν ήταν τυχαίο αυτό που έγινε.", "What happened was not random."),
    (2489, "η συμμετοχή", "the participation, involvement", "Η συμμετοχή σου είναι σημαντική.", "Your participation is important."),
    (2490, "συναισθηματικός", "sentimental", "Είναι πολύ συναισθηματικό άτομο.", "He is a very sentimental person."),
    (2491, "ο οργανισμός", "the organism; organization", "Ο ανθρώπινος οργανισμός είναι πολύπλοκος.", "The human organism is complex."),
    (2493, "το σκηνικό", "the film set, scenery; setting", "Το σκηνικό της ταινίας ήταν εντυπωσιακό.", "The film set was impressive."),
    (2495, "η περίμετρος", "the circumference, perimeter", "Η περίμετρος του κτιρίου είναι φρουρούμενη.", "The perimeter of the building is guarded."),
    (2496, "η ελιά", "the olive", "Η ελιά είναι σύμβολο της Ελλάδας.", "The olive is a symbol of Greece."),
    (2497, "τυλίγω", "I wrap", "Τύλιξε το δώρο με χρωματιστό χαρτί.", "She wrapped the gift in coloured paper."),
    (2498, "γκρι", "grey", "Ο ουρανός είναι γκρι σήμερα.", "The sky is grey today."),
    (2500, "έκτακτος", "emergency", "Υπάρχει έκτακτη ανάγκη.", "There is an emergency."),
]

# ═══════════════════════════════════════════════════════════════════════════════
# INSERTION LOGIC
# ═══════════════════════════════════════════════════════════════════════════════

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

# --- Main ---

print(f'Backing up {DB_PATH} -> {BACKUP_PATH}')
shutil.copy2(DB_PATH, BACKUP_PATH)

conn = sqlite3.connect(DB_PATH)

# Read model info
col = conn.execute('SELECT models FROM col LIMIT 1').fetchone()
models = json.loads(col[0])
model_fields = {}
MODEL_ID = None
for mid, m in models.items():
    model_fields[mid] = [f['name'].lower() for f in m['flds']]
    MODEL_ID = int(mid)

DECK_ID = conn.execute('SELECT DISTINCT did FROM cards LIMIT 1').fetchone()[0]

# Read all existing notes
rows = conn.execute('SELECT id, mid, flds FROM notes').fetchall()
existing = []
for note_id, mid, flds in rows:
    fields = flds.split('\x1f')
    names = model_fields.get(str(mid), [])
    rank = get_rank(names, fields)
    if rank > 0:
        existing.append((rank, note_id, mid, flds))

existing.sort(key=lambda x: x[0])
print(f'Existing notes: {len(existing)}')
print(f'New words to insert: {len(NEW_WORDS)}')

# Build merged list
# Sort new words by their target rank
new_sorted = sorted(NEW_WORDS, key=lambda x: x[0])

# Group new words by insertion rank
new_by_pos = {}
for target_rank, gr, en, sg, se in new_sorted:
    new_by_pos.setdefault(target_rank, []).append((gr, en, sg, se))

merged = []
for old_rank, note_id, mid, flds in existing:
    # Insert any new words that go before this old rank
    if old_rank in new_by_pos:
        for gr, en, sg, se in new_by_pos[old_rank]:
            merged.append(('new', gr, en, sg, se))
        del new_by_pos[old_rank]
    merged.append(('existing', note_id, mid, flds))

# Any remaining new words (beyond all existing ranks)
for pos in sorted(new_by_pos.keys()):
    for gr, en, sg, se in new_by_pos[pos]:
        merged.append(('new', gr, en, sg, se))

# Assign sequential ranks and write
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

conn.commit()
conn.close()

print()
print(f'=== Summary ===')
print(f'Existing ranks renumbered: {shifted}')
print(f'New words inserted: {inserted}')
print(f'Total entries now: {len(merged)}')
print()
print(f'Done! Backup saved as {BACKUP_PATH}')
