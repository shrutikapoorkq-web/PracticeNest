
/* ─────────────────────────────────────────────
   PICTURE COMPOSITION IMAGE LIBRARY
   Uses picsum.photos — free, no API key, actively maintained.
   source.unsplash.com is DEPRECATED and dead (shut down 2021).
   Each scene maps to a curated picsum seed so the same
   scene always returns the same appropriate image.
───────────────────────────────────────────── */
const PICTURE_SCENES = [
  { id:"park",      seed:"park-kids",      label:"Children Playing in a Park",   emoji:"🌳🛝" },
  { id:"market",    seed:"busy-market",    label:"A Busy Colourful Market",       emoji:"🛒🥦" },
  { id:"birthday",  seed:"birthday-party", label:"A Birthday Party",              emoji:"🎂🎈" },
  { id:"beach",     seed:"sunny-beach",    label:"A Day at the Beach",            emoji:"🏖️🌊" },
  { id:"farm",      seed:"green-farm",     label:"Life on a Farm",                emoji:"🌾🐄" },
  { id:"rain",      seed:"rainy-day",      label:"A Rainy Day",                   emoji:"🌧️☔" },
  { id:"school",    seed:"school-class",   label:"Inside a Classroom",            emoji:"🏫📚" },
  { id:"forest",    seed:"forest-walk",    label:"A Walk in the Forest",          emoji:"🌲🦋" },
  { id:"festival",  seed:"festival-night", label:"A Festival Night",              emoji:"🎆🪔" },
  { id:"sports",    seed:"sports-field",   label:"Playing Sports",                emoji:"⚽🏏" },
];

const getImageUrl = (sceneIdOrSeed, w=700, h=380, forPrint=false) => {
  const scene = PICTURE_SCENES.find(s => s.id === sceneIdOrSeed || s.seed === sceneIdOrSeed);
  const seed = scene?.seed || sceneIdOrSeed || "kids-playing";
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
};
const getPrintImageUrl = (sceneId) => getImageUrl(sceneId, 1200, 650);

/* ─────────────────────────────────────────────
   MATHS VISUAL HELPERS
   Render structured layouts instead of plain text
───────────────────────────────────────────── */
const GRADES = {
  "Nursery":{"color":"#FF9FF3","accent":"#FFEAA7"},
  "LKG":{"color":"#FFA8CC","accent":"#FD7B52"},
  "UKG":{"color":"#FFD93D","accent":"#FF6B6B"},
  "Grade 1":{"color":"#FD7B52","accent":"#FDDB92"},
  "Grade 2":{"color":"#FF6B6B","accent":"#FF8E53"},
  "Grade 3":{"color":"#6C63FF","accent":"#A855F7"},
  "Grade 4":{"color":"#00B894","accent":"#00CEC9"},
  "Grade 5":{"color":"#E84393","accent":"#FF6B9D"},
};
const SUBJECTS = {
  "English":{icon:"📖",color:"#4FACFE"},
  "Mathematics":{icon:"🔢",color:"#43E97B"},
  "Science/EVS":{icon:"🔬",color:"#F9CA24"},
  "Hindi":{icon:"🔤",color:"#A29BFE"},
  "Handwriting":{icon:"✍️",color:"#FF6B9D"},
  "Maths Games":{icon:"🎮",color:"#00CEC9"},
  "General Knowledge":{icon:"🌍",color:"#FDCB6E"},
  "Fun Learning":{icon:"🌈",color:"#FF9FF3"},
  "Pre-Maths":{icon:"🔢",color:"#FFD93D"},
  "Pre-Literacy":{icon:"📝",color:"#FFA8CC"},
  "Art & Craft":{icon:"🎨",color:"#FF6B9D"},
  "Phonics":{icon:"🔤",color:"#4FACFE"},
  "Phonics & Reading":{icon:"📖",color:"#4FACFE"},
  "Environmental Studies":{icon:"🌿",color:"#43E97B"},
  "Hindi Basics":{icon:"🔤",color:"#A29BFE"},
};
const TOPICS = {
  "Nursery":{"Fun Learning":["Colours Red Blue Yellow Green","Shapes Circle Square Triangle","My Family Members","Animals & Their Sounds","Fruits & Colours","My Body Parts","Big & Small","Day & Night"],"Pre-Maths":["Counting 1-5","Matching Same Objects","More or Less","Sorting by Colour","Patterns ABAB","Connect the Dots 1-5"],"Pre-Literacy":["Letter A-E Recognition","Letter F-J Recognition","Letter K-O Recognition","Letter P-T Recognition","Letter U-Z Recognition","Rhyming Fun"],"Art & Craft":["Colour the Animals","Colour the Fruits","Colour the Shapes","Trace & Colour","Dot Art Animals"]},
  "LKG":{"Phonics":["Letter Sounds A-E","Letter Sounds F-J","Letter Sounds K-O","Letter Sounds P-T","CVC Words at an ap","Sight Words Set 1","Sight Words Set 2"],"Mathematics":["Numbers 1-10 Tracing","Count & Match 1-10","Shapes Recognition","Patterns Colours Shapes","Big Small Tall Short","Missing Numbers 1-10"],"Environmental Studies":["My School","Animals Farm & Wild","Plants & Flowers","Seasons","Food Healthy & Junk","Transport","Festivals","Neighbourhood"],"Art & Craft":["Colour Alphabet","Trace Numbers","Colour Animals","Dot-to-Dot Animals"]},
  "UKG":{"Phonics & Reading":["CVC Words Short A cat bat","CVC Words Short I sit bit","CVC Words Short O dog log","Blends bl cl fl","Sight Words Set 3","Simple Sentences I can"],"Mathematics":["Numbers 1-20 Writing","Addition with Pictures","Subtraction with Pictures","Shapes 2D & 3D","Telling Time O Clock","Counting by 2s and 5s"],"Environmental Studies":["Living & Non-Living","Parts of a Plant","Animals & Their Babies","My Senses","Community Helpers","Healthy Habits"],"Hindi Basics":["स्वर अ आ इ ई","स्वर ए ऐ ओ औ","व्यंजन क ख ग घ","व्यंजन च छ ज झ","व्यंजन त थ द ध","सरल शब्द दो अक्षर"]},
  "Grade 1":{"English":["Phonics A-Z","Sight Words","Simple Nouns","Action Verbs","Adjectives","Simple Sentences","Capital Letters","Rhyming Words","Opposite Words","Singular & Plural"],"Mathematics":["Numbers 1-100","Addition Single Digit","Subtraction Single Digit","Basic Shapes","Patterns","Measurement","Time Morning Night","Money Coins","Data Tally"],"Science/EVS":["My Family","My School","Plants Around Us","Animals Around Us","Parts of Body","Food We Eat","Our Helpers","Transport"],"Hindi":["स्वर","व्यंजन","शब्द पहचान","सरल वाक्य","फल सब्जियां","जानवर","रंग","संख्याएं हिंदी"]},
  "Grade 2": {
    "English": ["Nouns – Common & Proper","Verbs – Action Words","Adjectives","Tenses – Present, Past, Future","Punctuation & Capitalisation","Synonyms & Antonyms","Reading Comprehension","Picture Composition","Prepositions","Articles","Pronouns","Conjunctions","Singular & Plural","Letter Writing","Poem Comprehension"],
    "Mathematics": ["Place Value – H, T, O","Addition with Carrying","Subtraction with Borrowing","Multiplication Tables 1–12","Division – Concept & Short","Fractions – Half, Quarter, Three-Quarters","Measurement – Length, Weight, Capacity","Geometry – 2D & 3D Shapes","Time – Clock & Calendar","Money – Indian Currency","Word Problems – Mixed","Data Handling – Pictographs & Bar Graphs"],
    "Science/EVS": ["Plants – Parts & Functions","Animals & Habitats","Our Body & Sense Organs","States of Matter","Air & Water","Our Community","Transport & Communication","Weather & Seasons","Food & Nutrition","Safety & First Aid"],
    "Hindi": ["संज्ञा (Nouns)","क्रिया (Verbs)","विशेषण (Adjectives)","वचन (Singular/Plural)","लिंग (Gender)","मात्राएँ (Matras)","पठन (Reading)","लेखन (Writing)"],
  },
  "Grade 3": {
    "English": ["All Tenses","Active & Passive Voice","Direct & Indirect Speech","Degrees of Comparison","Reading Comprehension – Inferential","Picture Composition","Essay Writing","Idioms & Phrases","Prefixes & Suffixes","Letter Writing – Formal","Story Writing","Prepositions – Advanced","Conjunctions – All Types","Poetry Analysis","Similes & Metaphors"],
    "Mathematics": ["Large Numbers – Up to 1 Lakh","Addition & Subtraction 4-digit","Multiplication – 2-digit × 2-digit","Long Division","Fractions – Equivalent, Add, Subtract","Decimals – Introduction","Percentages – Introduction","Geometry – Angles & Types","Perimeter & Area","Data Handling – Bar & Line Graphs","Mean (Average)","Money – Profit & Loss","Word Problems – Multi-Step","Roman Numerals","Patterns & Sequences"],
    "Science/EVS": ["Classification of Plants & Animals","Ecosystems & Food Chains","Human Body Systems","States of Matter & Changes","Simple Machines","Electricity – Basic Circuits","Light & Shadow","Sound – Properties","Solar System","Rocks & Soil","Conservation of Resources","Maps & Directions"],
    "Hindi": ["संज्ञा – सभी प्रकार","सर्वनाम","विशेषण – सभी प्रकार","क्रिया – काल","संधि (Basic)","समास (Basic)","निबंध लेखन","पत्र लेखन","गद्यांश","पद्यांश","मुहावरे","अलंकार (Basic)"],
  },
};
const LEVELS = ["Beginner","Intermediate","Advanced"];
const LM = {
  Beginner:     {color:"#00B894",bg:"#D4EFDF",pts:15,emoji:"🌱",stars:"★☆☆"},
  Intermediate: {color:"#F39C12",bg:"#FDEBD0",pts:25,emoji:"🌟",stars:"★★☆"},
  Advanced:     {color:"#E74C3C",bg:"#FADBD8",pts:40,emoji:"🔥",stars:"★★★"},
};
const THEMES = [
  {id:"sports",emoji:"⚽",label:"Sports"},{id:"space",emoji:"🚀",label:"Space"},
  {id:"animals",emoji:"🦁",label:"Animals"},{id:"superheroes",emoji:"🦸",label:"Superheroes"},
  {id:"princess",emoji:"👸",label:"Princess"},{id:"cooking",emoji:"🍳",label:"Cooking"},
  {id:"india",emoji:"🇮🇳",label:"India"},{id:"ocean",emoji:"🌊",label:"Ocean"},
];
const BADGES = [
  {id:"b1",emoji:"⭐",name:"First Star",    color:"#F1C40F",check:(d,p)=>d.length>=1},
  {id:"b2",emoji:"🥉",name:"Bronze Brain",  color:"#CD7F32",check:(d,p)=>d.length>=3},
  {id:"b3",emoji:"🥈",name:"Silver Scholar",color:"#A8A8A8",check:(d,p)=>d.length>=5},
  {id:"b4",emoji:"🥇",name:"Gold Champion", color:"#FFD700",check:(d,p)=>d.length>=10},
  {id:"b5",emoji:"🔢",name:"Maths Wizard",  color:"#43E97B",check:(d,p)=>d.filter(w=>w.subject==="Mathematics").length>=5},
  {id:"b6",emoji:"📖",name:"Word Master",   color:"#4FACFE",check:(d,p)=>d.filter(w=>w.subject==="English").length>=5},
  {id:"b7",emoji:"💯",name:"Perfect!",      color:"#E74C3C",check:(d,p)=>d.some(w=>w.pct>=95)},
  {id:"b8",emoji:"👑",name:"Grand Master",  color:"#9B59B6",check:(d,p)=>d.some(w=>w.level==="Advanced")},
  {id:"b9",emoji:"🔥",name:"On Fire!",      color:"#FF6B35",check:(d,p)=>{const t=new Date().toLocaleDateString("en-IN");return d.filter(w=>w.date===t).length>=3;}},
  {id:"b10",emoji:"💎",name:"Diamond Kid",  color:"#74B9FF",check:(d,p)=>p>=500},
];
const KID_THEMES = {
  default: {name:"Default",emoji:"🌈",bg:"linear-gradient(180deg,#FFF9F0,#F0EFFE)",header:"linear-gradient(135deg,#FD7B52,#FDDB92)",card:"#fff",accent:"#FD7B52"},
  space:   {name:"Space",  emoji:"🚀",bg:"linear-gradient(180deg,#0D0D2B,#1A1A4E)",header:"linear-gradient(135deg,#1A1A4E,#6C63FF)",card:"#1C1A3E",accent:"#A855F7",dark:true},
  jungle:  {name:"Jungle", emoji:"🦁",bg:"linear-gradient(180deg,#E8F5E9,#F1F8E9)",header:"linear-gradient(135deg,#2E7D32,#66BB6A)",card:"#fff",accent:"#2E7D32"},
  ocean:   {name:"Ocean",  emoji:"🌊",bg:"linear-gradient(180deg,#E3F2FD,#E8F5E9)",header:"linear-gradient(135deg,#0277BD,#26C6DA)",card:"#fff",accent:"#0277BD"},
  princess:{name:"Princess",emoji:"👑",bg:"linear-gradient(180deg,#FCE4EC,#FFF9E6)",header:"linear-gradient(135deg,#E91E63,#FF80AB)",card:"#fff",accent:"#E91E63"},
  robot:   {name:"Robot",  emoji:"🤖",bg:"linear-gradient(180deg,#ECEFF1,#E3F2FD)",header:"linear-gradient(135deg,#455A64,#78909C)",card:"#fff",accent:"#455A64"},
};

const PLANS=[
  {id:"free",name:"Free Explorer",emoji:"🌱",color:"#00B894",price:0,cta:"Start Free",features:["10 worksheets/month","Grades 2-3","Basic subjects"]},
  {id:"pro",name:"Pro Learner",emoji:"⭐",color:"#6C63FF",price:199,cta:"7-Day Free Trial",popular:true,features:["100 worksheets/month","All grades Nursery-5","All subjects","3 child profiles"]},
  {id:"premium",name:"Genius Family",emoji:"🏆",color:"#E84393",price:399,cta:"14-Day Free Trial",features:["Unlimited worksheets","5 child profiles","Priority support"]},
];
const REWARDS=[
  {pts:50,emoji:"🎮",label:"Extra 15 min screen time"},
  {pts:100,emoji:"🍦",label:"Choose your treat!"},
  {pts:200,emoji:"🎲",label:"Pick Friday's activity"},
  {pts:500,emoji:"🎉",label:"Special Day Out!"},
];

/* ─────────────────────────────────────────────
   WORKSHEET SYSTEM PROMPTS (per subject)
───────────────────────────────────────────── */
const buildPrompt = (grade, subject, topic, level, theme, attempt=1, prevNote="") => {
  const isMaths = subject==="Mathematics";
  const isComp  = topic.toLowerCase().includes("comprehension");
  const isPic   = topic.toLowerCase().includes("picture composition");
  const themeStr = theme ? `Apply "${theme}" theme throughout — use ${theme} scenarios for all examples.` : "Use Indian everyday contexts (rupees, cricket, festivals, NCERT).";
  const noRepeat = attempt>1 ? `IMPORTANT: This is attempt #${attempt}. Parent rejected the previous worksheet. DO NOT repeat the same questions. ${prevNote?"Parent's note: "+prevNote:"Generate completely fresh questions."}` : "";

  const isNurseryKG=["Nursery","LKG","UKG"].includes(grade);
  if(isNurseryKG) return `Create a ${grade} worksheet. Topic: ${topic}. ${noRepeat}
Picture-based ONLY. Activities: colour/circle/match/trace/tick/count. Max 3 words. 10 questions. Use emojis.
Return ONLY JSON:{"title":"${topic}","grade":"${grade}","subject":"${subject}","topic":"${topic}","level":"${level}","mascot_tip":"Let's have fun! 🌟","instructions":"Look and do!","total_marks":10,"time_suggested":"15 minutes","nursery_mode":true,"sections":[{"section_label":"A","heading":"Let's Learn! 🌈","marks_each":1,"questions":[{"id":1,"type":"nursery_colour","marks":1,"prompt":"🎨 Colour the apple RED 🍎","answer":"Red"},{"id":2,"type":"nursery_match","marks":1,"prompt":"🔗 Match animal to sound!","left_col":["🐄 Cow","🐶 Dog","🐱 Cat"],"right_col":["Woof!","Meow!","Moo!"],"answer":"Cow-Moo"},{"id":3,"type":"nursery_count","marks":1,"prompt":"Count the 🍎","visual":"🍎🍎🍎","answer":"3"},{"id":4,"type":"nursery_colour","marks":1,"prompt":"🎨 Colour sun YELLOW ☀️","answer":"Yellow"},{"id":5,"type":"nursery_tick","marks":1,"prompt":"✅ Tick the FRUIT","visual":"apple car banana","answer":"apple banana"},{"id":6,"type":"nursery_match","marks":1,"prompt":"🔗 Match colours!","left_col":["🔴","🔵","🟡"],"right_col":["Ball","Sky","Sun"],"answer":"Red-Ball"},{"id":7,"type":"nursery_trace","marks":1,"prompt":"✏️ Trace: A a a a","answer":"traced"},{"id":8,"type":"nursery_count","marks":1,"prompt":"Count stars ⭐⭐⭐⭐","answer":"4"},{"id":9,"type":"nursery_colour","marks":1,"prompt":"🎨 Colour your favourite animal!","answer":"any"},{"id":10,"type":"nursery_draw","marks":1,"prompt":"✏️ Draw a happy face 😊","answer":"drawn"}]}],"fun_fact":"You are a STAR! ⭐","did_you_know":"Colours make our world beautiful! 🌈"}`;

  if(isPic) return `You are an expert CBSE/NCERT Picture Composition worksheet creator for ${grade}.
${noRepeat}
Topic: Picture Composition | Level: ${level} | ${themeStr}

Generate EXACTLY 15 questions for a picture composition worksheet.
The worksheet has TWO parts:
PART A (Questions 1-8): Language & Vocabulary questions about the picture
PART B (Questions 9-15): The actual writing task with scaffolding

For the picture, pick ONE vivid scene from: birthday party, park, market, beach, farm, rain, classroom, forest, festival, sports.

LEVEL SCAFFOLDING:
- Beginner: 10 guiding words word bank + 5 sentence starters ("I can see ___", "The _____ is ___") + 6 writing lines
- Intermediate: 4 guiding questions (Who? What? Where? How do they feel?) + paragraph plan + 10 writing lines  
- Advanced: Story structure (Beginning/Middle/End boxes) + title + 15 writing lines, no starters

Return ONLY valid JSON:
{
  "title": "Picture Composition Worksheet",
  "grade": "${grade}", "subject": "English", "topic": "Picture Composition", "level": "${level}",
  "mascot_tip": "Look carefully at the picture before writing! 🦉",
  "instructions": "Study the picture and complete all activities.",
  "total_marks": 40, "time_suggested": "40 minutes",
  "picture_scene": {
    "scene_id": "park",
    "scene_label": "Children Playing in a Park",
    "description": "Detailed 3-sentence description of what students should imagine seeing"
  },
  "sections": [
    {
      "section_label": "A",
      "heading": "Section A — Vocabulary & Language (based on the picture above)",
      "marks_each": 2,
      "questions": [
        {"id":1,"type":"mcq","marks":2,"prompt":"What would be the best TITLE for this picture?","options":["A. Fun at School","B. A Day in the Park","C. Swimming Together","D. The Long Journey"],"answer":"B. A Day in the Park","explanation":"The picture shows children in a park."},
        {"id":2,"type":"fill","marks":2,"prompt":"The children in the picture look very ______. (happy / sad / tired)","answer":"happy"},
        {"id":3,"type":"truefalse","marks":1,"prompt":"The picture shows children playing outdoors.","answer":"true"},
        {"id":4,"type":"mcq","marks":2,"prompt":"Which adjective BEST describes the park?","options":["A. dark","B. noisy","C. colourful","D. empty"],"answer":"C. colourful"},
        {"id":5,"type":"fill","marks":2,"prompt":"Write ONE word to describe the weather in the picture: ___","answer":"sunny"},
        {"id":6,"type":"mcq","marks":2,"prompt":"What are the children doing in the picture?","options":["A. sleeping","B. playing","C. studying","D. eating"],"answer":"B. playing"},
        {"id":7,"type":"fill","marks":2,"prompt":"How many children can you see? Write in words: ___","answer":"answers may vary"},
        {"id":8,"type":"short","marks":3,"prompt":"Write TWO things you would see, hear, and smell if you were in this picture.","answer":"See: children, trees. Hear: laughter, birds. Smell: flowers, fresh air."}
      ]
    },
    {
      "section_label": "B",
      "heading": "Section B — Writing Task",
      "marks_each": 0,
      "questions": [
        {"id":9,"type":"picture_write","marks":20,"prompt":"Write about the picture using the scaffolding below.",
         "word_bank":["playing","laughing","colourful","sunny","running","swings","flowers","together","happy","park"],
         "sentence_starters":["The picture shows ___","I can see ___","The children are ___","The weather is ___","In the background, I can see ___"],
         "guide_questions":["Who can you see in the picture?","What are they doing?","What does the place look like?","How do the people feel?"],
         "story_structure":{"beginning":"Set the scene — where are they? who is there?","middle":"What is happening? What are they doing?","end":"How does the story end? How do they feel?"},
         "lines":15,
         "answer":"Sample: The picture shows a beautiful park. I can see children playing happily on the swings and slides. The weather is sunny and bright. There are colourful flowers all around. The children are laughing and running together. It looks like a wonderful day out!"}
      ]
    }
  ],
  "fun_fact": "Writing about pictures helps build both vocabulary and imagination!",
  "did_you_know": "Looking at a picture for 1 minute before writing helps you write 3x more!"
}`;

  if(isComp) return `You are an expert CBSE/NCERT Reading Comprehension worksheet creator for ${grade}.
${noRepeat}
Topic: Reading Comprehension | Level: ${level} | ${themeStr}

Create a passage of EXACTLY 110-130 words. Then 15 questions that follow this EXACT progression:
Q1-3: LITERAL (answers directly in the text — "find and copy" style)
Q4-5: VOCABULARY (word meaning in context, synonym/antonym from passage)
Q6-8: TRUE/FALSE (based on passage — 2 true, 1 false)
Q9-11: INFERENTIAL (Why? How do you know? What does this tell us about...?)
Q12: PREDICTION (What would happen if...? What happens next?)
Q13: PERSONAL CONNECT (Have you ever...? What would YOU do?)
Q14: TITLE (Write a suitable title / Why is the title appropriate?)
Q15: SUMMARY (Write 2-3 sentences to summarise the passage)

For ${level}:
- Beginner: simple vocabulary, direct questions, 1-2 sentence answers
- Intermediate: richer vocabulary, 2-3 sentence inferences
- Advanced: complex inference, idiom in passage, extended answers

Return ONLY valid JSON:
{
  "title": "Reading Comprehension Worksheet",
  "grade": "${grade}", "subject": "English", "topic": "Reading Comprehension", "level": "${level}",
  "mascot_tip": "Read the passage TWICE before answering! 🦉",
  "instructions": "Read the passage carefully, then answer all 15 questions.",
  "total_marks": 40, "time_suggested": "35 minutes",
  "passage": {
    "title": "passage title",
    "text": "Full 110-130 word passage here. Use paragraphs. Use Indian names and contexts.",
    "word_count": 115
  },
  "sections": [
    {
      "section_label": "A", "heading": "Section A — Find & Copy (Literal Questions)",
      "marks_each": 2,
      "questions": [
        {"id":1,"type":"find_copy","marks":2,"prompt":"Find and copy ONE word from the passage that means 'very happy'.","answer":"[word from your passage]","explanation":"Literal — directly in text"},
        {"id":2,"type":"find_copy","marks":2,"prompt":"According to the passage, what did [character] do every morning?","answer":"[answer from passage]"},
        {"id":3,"type":"fill","marks":2,"prompt":"Complete the sentence using the passage: '[Character] lived in a ___ near the ___.'","answer":"[from passage]"}
      ]
    },
    {
      "section_label": "B", "heading": "Section B — Vocabulary",
      "marks_each": 2,
      "questions": [
        {"id":4,"type":"mcq","marks":2,"prompt":"In the passage, the word '___' means:","options":["A. opt1","B. opt2","C. opt3","D. opt4"],"answer":"A. opt1"},
        {"id":5,"type":"fill","marks":2,"prompt":"Find a word in the passage that is the OPPOSITE of 'dark'.","answer":"[from passage]"}
      ]
    },
    {
      "section_label": "C", "heading": "Section C — True or False",
      "marks_each": 1,
      "questions": [
        {"id":6,"type":"truefalse","marks":1,"prompt":"Statement from passage","answer":"true"},
        {"id":7,"type":"truefalse","marks":1,"prompt":"Statement from passage","answer":"true"},
        {"id":8,"type":"truefalse","marks":1,"prompt":"False statement about passage","answer":"false"}
      ]
    },
    {
      "section_label": "D", "heading": "Section D — Think & Answer (Inferential)",
      "marks_each": 3,
      "questions": [
        {"id":9,"type":"short","marks":3,"prompt":"Why do you think [character] [action]? Use clues from the passage.","answer":"[inference answer]"},
        {"id":10,"type":"short","marks":3,"prompt":"What does the word '___' tell us about [character's] feelings?","answer":"[answer]"},
        {"id":11,"type":"short","marks":3,"prompt":"How do you know that [character] was [trait]? Give TWO clues from the passage.","answer":"[two clues]"}
      ]
    },
    {
      "section_label": "E", "heading": "Section E — Beyond the Passage",
      "marks_each": 4,
      "questions": [
        {"id":12,"type":"short","marks":4,"prompt":"Prediction: What do you think happened after the story ended? Give a reason.","answer":"[prediction]"},
        {"id":13,"type":"short","marks":3,"prompt":"Personal connect: Have you ever been in a situation like [character]? What did you do?","answer":"[personal response]"},
        {"id":14,"type":"short","marks":3,"prompt":"Suggest a different title for the passage. Explain why you chose it.","answer":"[title + reason]"},
        {"id":15,"type":"short","marks":4,"prompt":"Write 2-3 sentences to summarise the passage in your own words.","answer":"[summary]"}
      ]
    }
  ],
  "fun_fact": "Readers who visualise what they read understand 40% more!",
  "did_you_know": "CBSE comprehension questions always move from easy to challenging — always read the whole passage first!"
}`;

  if(isMaths) return `You are an expert NCERT/CBSE Mathematics worksheet creator for ${grade}.
${noRepeat}
Topic: ${topic} | Level: ${level} | ${themeStr}

CRITICAL MATHS FORMATTING RULES:
1. Column sums: Use "layout":"column" with "nums" array — the renderer will show proper aligned columns
2. Place value: Use "layout":"place_value" with "value" — shows H|T|O chart
3. Fractions: Use "layout":"fraction_bar" with "num","den" — shows shaded bar
4. Number line: Use "layout":"number_line" with "min","max","marks"
5. Grid method: Use "layout":"grid_mult" with "a","b"
6. For word problems ALWAYS include "working" field showing step-by-step
7. All MCQ must have 4 options labeled A. B. C. D.
8. Olympiad-style HOT questions for Advanced level

EXACT SECTIONS for maths:
Section A: 3 MCQ questions (2 marks each)
Section B: 3 Fill-in-the-blank with layout hints (2 marks each)
Section C: 2 True/False (1 mark each)
Section D: 4 Calculation questions — show working space (3 marks each)
Section E: 3 Word Problems (3 marks each, Indian context)

Return ONLY valid JSON:
{
  "title": "${topic} Worksheet",
  "grade": "${grade}", "subject": "Mathematics", "topic": "${topic}", "level": "${level}",
  "mascot_tip": "Always show your working — you get marks for steps! 🦉",
  "instructions": "Show all working. Circle your final answers.",
  "total_marks": 40, "time_suggested": "35 minutes",
  "sections": [
    {
      "section_label": "A", "heading": "Section A — Multiple Choice Questions (2 marks each)",
      "marks_each": 2,
      "questions": [
        {"id":1,"type":"mcq","marks":2,"prompt":"What is the value of the digit 7 in 4,763?","options":["A. 7","B. 70","C. 700","D. 7,000"],"answer":"C. 700","explanation":"7 is in the hundreds place → 700"},
        {"id":2,"type":"mcq","marks":2,"prompt":"...","options":["A.","B.","C.","D."],"answer":"A."},
        {"id":3,"type":"mcq","marks":2,"prompt":"...","options":["A.","B.","C.","D."],"answer":"B."}
      ]
    },
    {
      "section_label": "B", "heading": "Section B — Fill in the Blanks (2 marks each)",
      "marks_each": 2,
      "questions": [
        {"id":4,"type":"fill","marks":2,"prompt":"Write 5,463 in expanded form: ___ + ___ + ___ + ___","answer":"5000 + 400 + 60 + 3","layout":"none"},
        {"id":5,"type":"fill","marks":2,"prompt":"Show this number on the place value chart:","layout":"place_value","layout_value":324,"answer":"H=3, T=2, O=4"},
        {"id":6,"type":"fill","marks":2,"prompt":"Shade 3/4 of this fraction bar:","layout":"fraction_bar","layout_num":3,"layout_den":4,"answer":"3 out of 4 parts shaded"}
      ]
    },
    {
      "section_label": "C", "heading": "Section C — True or False (1 mark each)",
      "marks_each": 1,
      "questions": [
        {"id":7,"type":"truefalse","marks":1,"prompt":"356 + 178 = 534","answer":"false","explanation":"356 + 178 = 534 is incorrect; the correct answer is 534. Wait — check: 6+8=14 carry 1; 5+7+1=13 carry 1; 3+1+1=5 → 534. Actually TRUE."},
        {"id":8,"type":"truefalse","marks":1,"prompt":"The digit in the tens place of 4,829 is 2.","answer":"true"}
      ]
    },
    {
      "section_label": "D", "heading": "Section D — Calculations (show all steps) (3 marks each)",
      "marks_each": 3,
      "questions": [
        {"id":9,"type":"calculate","marks":3,"prompt":"Solve using column method:","layout":"column_sum","layout_nums":["347","268"],"layout_op":"+","answer":"615","working":"7+8=15, write 5 carry 1. 4+6+1=11, write 1 carry 1. 3+2+1=6. Answer: 615"},
        {"id":10,"type":"calculate","marks":3,"prompt":"Use the GRID METHOD to solve 34 × 23:","layout":"grid_mult","layout_a":34,"layout_b":23,"answer":"782","working":"30×20=600, 4×20=80, 30×3=90, 4×3=12. Total=600+80+90+12=782"},
        {"id":11,"type":"calculate","marks":3,"prompt":"Mark these fractions on the number line: 1/4, 1/2, 3/4","layout":"number_line","layout_min":0,"layout_max":1,"layout_marks":[],"answer":"0 ——1/4——1/2——3/4—— 1"},
        {"id":12,"type":"calculate","marks":3,"prompt":"Solve and show working:  824 − 367 = ?","layout":"column_sub","layout_nums":["824","367"],"layout_op":"−","answer":"457","working":"4<7, borrow: 14-7=7. 1<6+1, borrow: 11-7=4. 7-3=4. Wait — 8-1-3=4. Answer: 457"}
      ]
    },
    {
      "section_label": "E", "heading": "Section E — Word Problems (3 marks each)",
      "marks_each": 3,
      "questions": [
        {"id":13,"type":"word_problem","marks":3,"prompt":"Priya had ₹450. She bought a book for ₹127 and a pen for ₹38. How much money did she have left?","answer":"₹285","working":"Total spent = 127+38 = ₹165. Money left = 450-165 = ₹285"},
        {"id":14,"type":"word_problem","marks":3,"prompt":"A packet has 24 biscuits. How many biscuits are in 15 packets?","answer":"360 biscuits","working":"24 × 15 = 360"},
        {"id":15,"type":"word_problem","marks":3,"prompt":"A water tank holds 1,500 litres. 375 litres were used on Monday and 486 litres on Tuesday. How much water is left?","answer":"639 litres","working":"Used = 375+486 = 861. Left = 1500-861 = 639"}
      ]
    }
  ],
  "fun_fact": "The word 'mathematics' comes from the Greek word 'mathema' meaning knowledge!",
  "did_you_know": "Showing your working can earn you partial marks even if your final answer is wrong!"
}`;

  if(subject==="Handwriting"){
    const isHindi=topic.includes("सुलेख")||topic.includes("मात्रा")||topic.includes("अक्षर")||topic.includes("हिंदी");
    return `Create a ${grade} Handwriting worksheet. Topic: "${topic}" | Level: ${level}. ${noRepeat}
${isHindi?"Hindi Devanagari: letter tracing, matras, words, sentences.":"English Cursive: letter formation, joins, words, sentences. Show practice lines as: _ _ _ _ _ (3 rows per item)."}
Return ONLY JSON: {"title":"${topic}","grade":"${grade}","subject":"Handwriting","topic":"${topic}","level":"${level}","mascot_tip":"Practice makes perfect! ✍️","instructions":"Trace first, then write on the lines below.","total_marks":30,"time_suggested":"20 minutes","sections":[{"section_label":"A","heading":"Letter Practice","marks_each":2,"questions":[{"id":1,"type":"fill","marks":2,"prompt":"${isHindi?"अ — Trace and write: अ _ _ _ / _ _ _ _ / _ _ _ _":"a — Trace: a _ _ _ / _ _ _ _ / _ _ _ _"}","answer":"neat letters"},{"id":2,"type":"fill","marks":2,"prompt":"item 2 with 3 lines","answer":"neat"},{"id":3,"type":"fill","marks":2,"prompt":"item 3","answer":"neat"},{"id":4,"type":"fill","marks":2,"prompt":"item 4","answer":"neat"},{"id":5,"type":"fill","marks":2,"prompt":"item 5","answer":"neat"}]},{"section_label":"B","heading":"Words","marks_each":2,"questions":[{"id":6,"type":"fill","marks":2,"prompt":"${isHindi?"घर _ _ _ / _ _ _ _":"cat _ _ _ / _ _ _ _"}","answer":"neat"},{"id":7,"type":"fill","marks":2,"prompt":"word 2","answer":"neat"},{"id":8,"type":"fill","marks":2,"prompt":"word 3","answer":"neat"},{"id":9,"type":"fill","marks":2,"prompt":"word 4","answer":"neat"}]},{"section_label":"C","heading":"Sentences","marks_each":4,"questions":[{"id":10,"type":"short","marks":4,"prompt":"${isHindi?"लिखिए: मेरा नाम ___ है।":"Copy: The cat sat on the mat."}","answer":"neat copy"},{"id":11,"type":"short","marks":4,"prompt":"sentence 2","answer":"neat"},{"id":12,"type":"short","marks":4,"prompt":"sentence 3","answer":"neat"}]}],"fun_fact":"${isHindi?"हिंदी में 52 अक्षर हैं!":"Cursive writing was invented for speed!"}","did_you_know":"${isHindi?"सुलेख से एकाग्रता बढ़ती है!":"Good handwriting improves memory!"}"}`;
  }

  if(subject==="Maths Games"){
    const isCross=topic.toLowerCase().includes("crossword");
    const isSudoku=topic.toLowerCase().includes("sudoku");
    const isMake10=topic.toLowerCase().includes("make 10")||topic.toLowerCase().includes("number bond");
    return `Create a fun ${grade} Maths Games worksheet. Topic: "${topic}" | Level: ${level}. ${noRepeat}
${isCross?"CROSSWORD: Math problems as clues (ACROSS and DOWN), answers fill numbered squares.":isSudoku?"SUDOKU: Provide partial grid, rules, solution key.":isMake10?"NUMBER BONDS / MAKE 10: Ten-frame visuals (■=filled □=empty), bond trees.":"Fun maths game/puzzle for the topic."}
Return ONLY JSON: {"title":"${topic}","grade":"${grade}","subject":"Maths Games","topic":"${topic}","level":"${level}","mascot_tip":"Let's play maths! 🎮","instructions":"Have fun solving!","total_marks":30,"time_suggested":"25 minutes","sections":[{"section_label":"A","heading":"Round 1 🎯","marks_each":2,"questions":[{"id":1,"type":"calculate","marks":2,"prompt":"${isCross?"1 ACROSS: 6 × 4 = ?":"Game question 1"}","answer":"24"},{"id":2,"type":"fill","marks":2,"prompt":"q 2","answer":"answer"},{"id":3,"type":"fill","marks":2,"prompt":"q 3","answer":"answer"},{"id":4,"type":"fill","marks":2,"prompt":"q 4","answer":"answer"},{"id":5,"type":"fill","marks":2,"prompt":"q 5","answer":"answer"}]},{"section_label":"B","heading":"Round 2 🔥","marks_each":2,"questions":[{"id":6,"type":"calculate","marks":2,"prompt":"challenge 1","answer":"answer"},{"id":7,"type":"calculate","marks":2,"prompt":"challenge 2","answer":"answer"},{"id":8,"type":"calculate","marks":2,"prompt":"challenge 3","answer":"answer"},{"id":9,"type":"calculate","marks":2,"prompt":"challenge 4","answer":"answer"},{"id":10,"type":"calculate","marks":2,"prompt":"challenge 5","answer":"answer"}]},{"section_label":"C","heading":"Brain Busters 🧠","marks_each":4,"questions":[{"id":11,"type":"word_problem","marks":4,"prompt":"tricky 1","answer":"answer"},{"id":12,"type":"word_problem","marks":4,"prompt":"tricky 2","answer":"answer"},{"id":13,"type":"word_problem","marks":4,"prompt":"tricky 3","answer":"answer"}]}],"fun_fact":"Puzzles make your brain stronger!","did_you_know":"${isSudoku?"Sudoku was popularised in Japan in 1984!":"Maths puzzles are used by NASA scientists!"}"}`;
  }

  if(subject==="General Knowledge"){
    return `Create a ${grade} GK quiz. Topic: "${topic}" | Level: ${level}. ${noRepeat}
Indian context: festivals, sports (cricket/hockey/Olympics), geography (Himalayas/rivers), freedom fighters, national symbols, ISRO/space.
Return ONLY JSON: {"title":"${topic} Quiz","grade":"${grade}","subject":"General Knowledge","topic":"${topic}","level":"${level}","mascot_tip":"Think carefully! 🌍","instructions":"Answer all questions!","total_marks":40,"time_suggested":"25 minutes","sections":[{"section_label":"A","heading":"MCQ (2m)","marks_each":2,"questions":[{"id":1,"type":"mcq","marks":2,"prompt":"National animal of India?","options":["A. Lion","B. Tiger","C. Elephant","D. Peacock"],"answer":"B. Tiger","explanation":"Bengal Tiger — national animal since 1973."},{"id":2,"type":"mcq","marks":2,"prompt":"MCQ about ${topic}","options":["A.","B.","C.","D."],"answer":"A.","explanation":"fact"},{"id":3,"type":"mcq","marks":2,"prompt":"MCQ 3","options":["A.","B.","C.","D."],"answer":"B.","explanation":"fact"}]},{"section_label":"B","heading":"True/False (1m)","marks_each":1,"questions":[{"id":4,"type":"truefalse","marks":1,"prompt":"Hockey is India's national sport.","answer":"true","explanation":"Hockey — not cricket!"},{"id":5,"type":"truefalse","marks":1,"prompt":"statement 2","answer":"false","explanation":"fact"},{"id":6,"type":"truefalse","marks":1,"prompt":"statement 3","answer":"true","explanation":"fact"},{"id":7,"type":"truefalse","marks":1,"prompt":"statement 4","answer":"true","explanation":"fact"}]},{"section_label":"C","heading":"Fill (2m)","marks_each":2,"questions":[{"id":8,"type":"fill","marks":2,"prompt":"Highest mountain: ______","answer":"Mount Everest"},{"id":9,"type":"fill","marks":2,"prompt":"fill 2","answer":"answer"},{"id":10,"type":"fill","marks":2,"prompt":"fill 3","answer":"answer"}]},{"section_label":"D","heading":"Match (3m)","marks_each":3,"questions":[{"id":11,"type":"match","marks":3,"prompt":"Match Festival to State:","left_col":["Pongal","Bihu","Onam"],"right_col":["Tamil Nadu","Assam","Kerala"],"answer":"Pongal-TN, Bihu-Assam, Onam-Kerala"},{"id":12,"type":"match","marks":3,"prompt":"match 2","left_col":["a","b","c"],"right_col":["x","y","z"],"answer":"matches"}]},{"section_label":"E","heading":"Short Answer (4m)","marks_each":4,"questions":[{"id":13,"type":"short","marks":4,"prompt":"Name 3 Indian rivers.","answer":"Ganga, Yamuna, Brahmaputra"},{"id":14,"type":"short","marks":4,"prompt":"short answer 2","answer":"answer"},{"id":15,"type":"short","marks":4,"prompt":"HOT: Why is ${topic} important?","answer":"sample"}]}],"fun_fact":"India has 22 official languages!","did_you_know":"India's Mangalyaan reached Mars on its very first attempt — 2014!"}`;
  }

  if(subject==="Hindi"||subject==="Hindi Basics"){
    return `You are an NCERT Hindi worksheet creator for ${grade}. Topic: "${topic}" | Level: ${level}. ${noRepeat}
Write ALL questions in Hindi (Devanagari script). 15 questions.
Return ONLY JSON: {"title":"${topic} कार्यपत्रक","grade":"${grade}","subject":"Hindi","topic":"${topic}","level":"${level}","mascot_tip":"ध्यान से पढ़ो! 🦉","instructions":"सभी प्रश्नों के उत्तर दीजिए।","total_marks":40,"time_suggested":"30 minutes","sections":[{"section_label":"A","heading":"खण्ड अ — बहुविकल्पीय (2 अंक)","marks_each":2,"questions":[{"id":1,"type":"mcq","marks":2,"prompt":"${topic} से संबंधित प्रश्न","options":["A. विकल्प1","B. विकल्प2","C. विकल्प3","D. विकल्प4"],"answer":"A. विकल्प1","explanation":"कारण"},{"id":2,"type":"mcq","marks":2,"prompt":"प्रश्न 2","options":["A.","B.","C.","D."],"answer":"B."},{"id":3,"type":"mcq","marks":2,"prompt":"प्रश्न 3","options":["A.","B.","C.","D."],"answer":"C."}]},{"section_label":"B","heading":"खण्ड ब — रिक्त स्थान (2 अंक)","marks_each":2,"questions":[{"id":4,"type":"fill","marks":2,"prompt":"रिक्त स्थान भरिए: ___ ","answer":"उत्तर"},{"id":5,"type":"fill","marks":2,"prompt":"रिक्त 2","answer":"उत्तर"},{"id":6,"type":"fill","marks":2,"prompt":"रिक्त 3","answer":"उत्तर"}]},{"section_label":"C","heading":"खण्ड स — सही/गलत (1 अंक)","marks_each":1,"questions":[{"id":7,"type":"truefalse","marks":1,"prompt":"हिंदी कथन","answer":"true"},{"id":8,"type":"truefalse","marks":1,"prompt":"कथन 2","answer":"false"},{"id":9,"type":"truefalse","marks":1,"prompt":"कथन 3","answer":"true"}]},{"section_label":"D","heading":"खण्ड द — मिलान (3 अंक)","marks_each":3,"questions":[{"id":10,"type":"match","marks":3,"prompt":"मिलान करिए:","left_col":["item1","item2","item3"],"right_col":["ans1","ans2","ans3"],"answer":"मिलान"},{"id":11,"type":"classify","marks":3,"prompt":"वर्गीकरण:","items":["w1","w2","w3","w4"],"categories":["वर्ग1","वर्ग2"],"answer":"sorted"},{"id":12,"type":"short","marks":3,"prompt":"दो वाक्य लिखिए","answer":"उत्तर"}]},{"section_label":"E","heading":"खण्ड इ — लघु उत्तर (4 अंक)","marks_each":4,"questions":[{"id":13,"type":"short","marks":4,"prompt":"परिभाषा और उदाहरण","answer":"उत्तर"},{"id":14,"type":"short","marks":4,"prompt":"लघु उत्तर","answer":"उत्तर"},{"id":15,"type":"short","marks":4,"prompt":"HOT: अनुच्छेद लेखन","answer":"उत्तर"}]}],"fun_fact":"हिंदी विश्व की तीसरी सबसे अधिक बोली जाने वाली भाषा है!","did_you_know":"हिंदी में 52 अक्षर होते हैं।"}`;
  }

  return `You are an expert NCERT/CBSE ${subject} worksheet creator for ${grade}.
${noRepeat}
Topic: ${topic} | Level: ${level} | ${themeStr}

Create EXACTLY 15 questions across 5 sections:
Section A: 3 MCQ (2 marks, 4 options each)
Section B: 3 Fill-in-the-blank (2 marks)
Section C: 3 True/False (1 mark)
Section D: 3 Match/Classify/Label (3 marks)
Section E: 3 Short Answer (4 marks, 2-3 sentences)

Rules: Indian contexts, NCERT aligned, age-appropriate for ${grade}, curriculum-accurate.
${level==="Advanced"?"Include 2 Olympiad-style HOT questions in Section E.":""}

Return ONLY valid JSON matching this structure (adapt content to ${subject}):
{
  "title":"${topic} Worksheet",
  "grade":"${grade}","subject":"${subject}","topic":"${topic}","level":"${level}",
  "mascot_tip":"tip in 15 words",
  "instructions":"instructions in 20 words",
  "total_marks":40,"time_suggested":"30 minutes",
  "sections":[
    {"section_label":"A","heading":"Section A — Multiple Choice (2 marks each)","marks_each":2,
     "questions":[
       {"id":1,"type":"mcq","marks":2,"prompt":"question","options":["A. o1","B. o2","C. o3","D. o4"],"answer":"A. o1","explanation":"reason"},
       {"id":2,"type":"mcq","marks":2,"prompt":"question","options":["A.","B.","C.","D."],"answer":"B."},
       {"id":3,"type":"mcq","marks":2,"prompt":"question","options":["A.","B.","C.","D."],"answer":"C."}
     ]},
    {"section_label":"B","heading":"Section B — Fill in the Blanks (2 marks each)","marks_each":2,
     "questions":[
       {"id":4,"type":"fill","marks":2,"prompt":"sentence with ___","answer":"word"},
       {"id":5,"type":"fill","marks":2,"prompt":"sentence with ___","answer":"word"},
       {"id":6,"type":"fill","marks":2,"prompt":"sentence with ___","answer":"word"}
     ]},
    {"section_label":"C","heading":"Section C — True or False (1 mark each)","marks_each":1,
     "questions":[
       {"id":7,"type":"truefalse","marks":1,"prompt":"statement","answer":"true","explanation":"reason"},
       {"id":8,"type":"truefalse","marks":1,"prompt":"statement","answer":"false"},
       {"id":9,"type":"truefalse","marks":1,"prompt":"statement","answer":"true"}
     ]},
    {"section_label":"D","heading":"Section D — Match / Classify (3 marks)","marks_each":3,
     "questions":[
       {"id":10,"type":"match","marks":3,"prompt":"Match Column A with Column B:","left_col":["a","b","c"],"right_col":["x","y","z"],"answer":"a-x, b-y, c-z"},
       {"id":11,"type":"classify","marks":3,"prompt":"Sort these into two groups:","items":["item1","item2","item3","item4","item5","item6"],"categories":["cat1","cat2"],"answer":"cat1: item1,item3,item5 cat2: item2,item4,item6"},
       {"id":12,"type":"short","marks":3,"prompt":"question","answer":"answer"}
     ]},
    {"section_label":"E","heading":"Section E — Short Answer (4 marks each)","marks_each":4,
     "questions":[
       {"id":13,"type":"short","marks":4,"prompt":"explain in 2-3 sentences","answer":"sample answer"},
       {"id":14,"type":"short","marks":4,"prompt":"explain in 2-3 sentences","answer":"sample answer"},
       {"id":15,"type":"short","marks":4,"prompt":"HOT: explain with reasoning","answer":"sample answer"}
     ]}
  ],
  "fun_fact":"fact about topic",
  "did_you_know":"second fact"
}`;
};

async function callClaude(system, user, maxT=3000) {
  const apiKey = localStorage.getItem("pn_api_key")||"";
  if(!apiKey){throw new Error("No API key set. Please go to Settings to add your Anthropic API key.");}
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "anthropic-version":"2023-06-01",
      "anthropic-dangerous-direct-browser-access":"true"
    },
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:maxT,system,messages:[{role:"user",content:user}]})
  });
  if(!r.ok){
    const err = await r.text();
    throw new Error(`API ${r.status}: ${err.slice(0,200)}`);
  }
  const d = await r.json();
  if(d.error) throw new Error(d.error.message||"API error");
  return d.content?.map(c=>c.text||"").join("")||"";
}

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────
   MEMOISED REVIEW CARD — only re-renders when its own
   item changes, not when any other card updates
───────────────────────────────────────────────────────── */