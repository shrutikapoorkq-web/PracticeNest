

// ═══════════════════════════════════════════════
// SMART DB LAYER — localStorage now, Firebase-ready later
// ═══════════════════════════════════════════════
const DB = {
  // Save any value
  set: (key, val) => { try { localStorage.setItem('practicenest_v2_'+key, JSON.stringify(val)); } catch{} },
  // Get a value
  get: (key, fallback=null) => { try { const v=localStorage.getItem('practicenest_v2_'+key); return v?JSON.parse(v):fallback; } catch{ return fallback; } },
  // Delete
  del: (key) => { try { localStorage.removeItem('practicenest_v2_'+key); } catch{} },

  // Save a completed worksheet session
  saveSession: (session) => {
    // session: {grade, subject, topic, level, score, total, pct, timeSpent, date}
    const sessions = DB.get('sessions', []);
    sessions.unshift({...session, id: Date.now()});
    DB.set('sessions', sessions.slice(0, 500)); // keep last 500
  },

  // Get sessions for a specific topic
  getTopicSessions: (subject, topic) => {
    return DB.get('sessions', []).filter(s => s.subject===subject && s.topic===topic);
  },

  // Get all sessions for a grade
  getGradeSessions: (grade) => {
    return DB.get('sessions', []).filter(s => s.grade===grade);
  },

  // Get adaptive level recommendation for a topic
  getAdaptiveLevel: (subject, topic, currentLevel) => {
    const sessions = DB.getTopicSessions(subject, topic);
    if (sessions.length < 2) return currentLevel; // not enough data
    const recent = sessions.slice(0, 3); // last 3 attempts
    const avgPct = recent.reduce((a,b) => a+b.pct, 0) / recent.length;
    const levels = ['Beginner','Intermediate','Advanced'];
    const idx = levels.indexOf(currentLevel);
    if (avgPct >= 80 && idx < 2) return levels[idx+1]; // promote
    if (avgPct < 40 && idx > 0) return levels[idx-1];  // demote
    return currentLevel;
  },

  // Get smart suggestions for parent
  getSmartSuggestions: (grade) => {
    const sessions = DB.getGradeSessions(grade);
    if (sessions.length === 0) return [];

    // Group by subject+topic
    const topicMap = {};
    sessions.forEach(s => {
      const key = s.subject+'||'+s.topic;
      if (!topicMap[key]) topicMap[key] = {subject:s.subject, topic:s.topic, sessions:[], level:s.level};
      topicMap[key].sessions.push(s);
    });

    const suggestions = [];

    Object.values(topicMap).forEach(({subject, topic, sessions, level}) => {
      const avg = sessions.reduce((a,b)=>a+b.pct,0)/sessions.length;
      const attempts = sessions.length;
      const lastPct = sessions[0]?.pct || 0;
      const improving = sessions.length >= 2 && sessions[0].pct > sessions[1].pct;
      const avgTime = sessions.reduce((a,b)=>a+(b.timeSpent||0),0)/sessions.length;

      if (avg < 50 && attempts >= 2) {
        suggestions.push({type:'struggling', subject, topic, level, avg:Math.round(avg), attempts,
          message: `Needs more practice — averaging ${Math.round(avg)}% across ${attempts} attempts`,
          action: 'Practice again', priority: 1});
      } else if (avg >= 80 && attempts >= 2) {
        const levels = ['Beginner','Intermediate','Advanced'];
        const nextLevel = levels[levels.indexOf(level)+1];
        if (nextLevel) suggestions.push({type:'ready_to_advance', subject, topic, level, nextLevel,
          avg:Math.round(avg), message: `Ready to move up — scoring ${Math.round(avg)}%!`,
          action: `Try ${nextLevel}`, priority: 2});
      } else if (!improving && attempts >= 3) {
        suggestions.push({type:'plateau', subject, topic, level, avg:Math.round(avg),
          message: `Score has plateaued at ${Math.round(avg)}% — try a different approach`,
          action: 'Try new worksheet', priority: 3});
      } else if (improving) {
        suggestions.push({type:'improving', subject, topic, level, avg:Math.round(avg),
          message: `Great improvement! Up to ${sessions[0].pct}% — keep going!`,
          action: 'Continue', priority: 4});
      }
    });

    // Also suggest topics not yet attempted
    return suggestions.sort((a,b) => a.priority - b.priority).slice(0, 6);
  },

  // Get performance summary for weekly AI report
  getWeekSummary: (grade) => {
    const oneWeekAgo = Date.now() - 7*24*60*60*1000;
    const sessions = DB.getGradeSessions(grade).filter(s => s.id > oneWeekAgo);
    if (sessions.length === 0) return null;
    const subjects = [...new Set(sessions.map(s=>s.subject))];
    const avgScore = Math.round(sessions.reduce((a,b)=>a+b.pct,0)/sessions.length);
    const totalTime = sessions.reduce((a,b)=>a+(b.timeSpent||0),0);
    const subjectBreakdown = subjects.map(sub => {
      const ss = sessions.filter(s=>s.subject===sub);
      return {subject:sub, count:ss.length, avg:Math.round(ss.reduce((a,b)=>a+b.pct,0)/ss.length)};
    });
    return {sessions:sessions.length, avgScore, totalTime, subjects:subjectBreakdown,
      topSubject: subjectBreakdown.sort((a,b)=>b.avg-a.avg)[0]?.subject,
      needsWork: subjectBreakdown.sort((a,b)=>a.avg-b.avg)[0]?.subject};
  }
};


// ═══════════════════════════════════════════════
// SAMPLE WORKSHEETS — instant load, no API needed
// 2 samples per major topic across grades
// ═══════════════════════════════════════════════
const SAMPLE_WS = {
  "Mathematics||Fractions": {
    Beginner: {title:"Fractions — Beginner",grade:"Grade 2",subject:"Mathematics",level:"Beginner",
      time_suggested:"20 mins",total_marks:20,
      instructions:"Circle the correct answer or fill in the blanks.",
      mascot_tip:"A fraction means equal parts of a whole!",
      fun_fact:"Pizza is divided into fractions every day!",
      did_you_know:"The word fraction comes from the Latin word 'fractus' meaning broken.",
      sections:[{heading:"Identify the Fraction",section_label:"A",questions:[
        {id:1,type:"mcq",prompt:"What fraction is shaded if 1 out of 4 equal parts is coloured?",options:["1/2","1/4","1/3","2/4"],answer:"1/4",marks:2},
        {id:2,type:"mcq",prompt:"Which fraction means half?",options:["1/4","2/3","1/2","3/4"],answer:"1/2",marks:2},
        {id:3,type:"fill",prompt:"If a pizza has 8 slices and you eat 3, you ate ___ of the pizza.",answer:"3/8",marks:2},
        {id:4,type:"fill",prompt:"3 out of 4 equal parts = ___",answer:"3/4",marks:2},
        {id:5,type:"mcq",prompt:"Which is the biggest fraction?",options:["1/4","1/2","1/8","1/3"],answer:"1/2",marks:2},
      ]},{heading:"Draw & Colour",section_label:"B",questions:[
        {id:6,type:"short",prompt:"Divide a rectangle into 2 equal parts and colour 1 part. What fraction is coloured?",answer:"1/2",marks:2},
        {id:7,type:"short",prompt:"Divide a circle into 4 equal parts and colour 3 parts. What fraction is coloured?",answer:"3/4",marks:2},
        {id:8,type:"fill",prompt:"1/2 of 8 = ___",answer:"4",marks:2},
        {id:9,type:"fill",prompt:"1/4 of 12 = ___",answer:"3",marks:2},
        {id:10,type:"mcq",prompt:"Which fraction is equal to 2/4?",options:["1/3","1/2","2/3","3/4"],answer:"1/2",marks:2},
      ]}]
    },
    Intermediate: {title:"Fractions — Intermediate",grade:"Grade 3",subject:"Mathematics",level:"Intermediate",
      time_suggested:"25 mins",total_marks:30,
      instructions:"Solve all questions. Show your working for word problems.",
      mascot_tip:"To compare fractions with same denominator, compare numerators!",
      fun_fact:"Ancient Egyptians only used unit fractions like 1/2, 1/3, 1/4!",
      did_you_know:"Fractions are used every day in cooking recipes.",
      sections:[{heading:"Fractions — Compare & Calculate",section_label:"A",questions:[
        {id:1,type:"mcq",prompt:"Which is greater: 3/5 or 2/5?",options:["3/5","2/5","Both equal","Cannot say"],answer:"3/5",marks:2},
        {id:2,type:"fill",prompt:"1/3 + 1/3 = ___",answer:"2/3",marks:2},
        {id:3,type:"fill",prompt:"3/4 − 1/4 = ___",answer:"2/4 or 1/2",marks:2},
        {id:4,type:"mcq",prompt:"What is 1/2 of 20?",options:["5","10","15","8"],answer:"10",marks:2},
        {id:5,type:"fill",prompt:"Convert to equivalent fraction: 1/2 = ___/8",answer:"4",marks:2},
      ]},{heading:"Word Problems",section_label:"B",questions:[
        {id:6,type:"word_problem",prompt:"Priya had a bar of chocolate with 12 pieces. She ate 1/3 of it. How many pieces did she eat?",answer:"4 pieces (12 ÷ 3 = 4)",marks:4},
        {id:7,type:"word_problem",prompt:"A ribbon is 3/4 m long. Rani cuts off 1/4 m. How much ribbon is left?",answer:"2/4 m = 1/2 m",marks:4},
        {id:8,type:"mcq",prompt:"Which set of fractions is in ascending order?",options:["3/4, 1/2, 1/4","1/4, 1/2, 3/4","1/2, 1/4, 3/4","3/4, 1/4, 1/2"],answer:"1/4, 1/2, 3/4",marks:3},
        {id:9,type:"fill",prompt:"3/8 + 2/8 = ___",answer:"5/8",marks:3},
        {id:10,type:"short",prompt:"Write any two fractions equivalent to 1/2.",answer:"2/4, 3/6, 4/8 (any two)",marks:4},
      ]}]
    }
  },
  "Mathematics||Addition with Carrying": {
    Beginner: {title:"Addition — Beginner",grade:"Grade 1",subject:"Mathematics",level:"Beginner",
      time_suggested:"15 mins",total_marks:20,
      instructions:"Add the numbers. Write your answer in the box.",
      mascot_tip:"Start from the ones place and move left!",
      fun_fact:"Addition is one of the oldest maths skills — even cavemen counted!",
      did_you_know:"The + symbol was first used in the 1400s.",
      sections:[{heading:"Simple Addition",section_label:"A",questions:[
        {id:1,type:"column_sum",prompt:"Add:",layout:"column_sum",layout_nums:[23,45],layout_op:"+",answer:"68",marks:2},
        {id:2,type:"column_sum",prompt:"Add:",layout:"column_sum",layout_nums:[37,26],layout_op:"+",answer:"63",marks:2},
        {id:3,type:"fill",prompt:"15 + 8 = ___",answer:"23",marks:2},
        {id:4,type:"fill",prompt:"___ + 14 = 30",answer:"16",marks:2},
        {id:5,type:"mcq",prompt:"What is 47 + 36?",options:["73","83","84","72"],answer:"83",marks:2},
      ]},{heading:"Word Problems",section_label:"B",questions:[
        {id:6,type:"word_problem",prompt:"Ravi has 24 marbles. His friend gives him 19 more. How many does he have now?",answer:"43 marbles",marks:4},
        {id:7,type:"word_problem",prompt:"A shop sold 56 toys on Monday and 37 on Tuesday. How many toys were sold in all?",answer:"93 toys",marks:4},
        {id:8,type:"fill",prompt:"99 + 1 = ___",answer:"100",marks:2},
        {id:9,type:"fill",prompt:"68 + ___ = 100",answer:"32",marks:2},
      ]}]
    }
  },
  "English||Tenses – Present, Past, Future": {
    Beginner: {title:"Tenses — Beginner",grade:"Grade 2",subject:"English",level:"Beginner",
      time_suggested:"20 mins",total_marks:20,
      instructions:"Choose the correct tense or fill in the blank.",
      mascot_tip:"Present = now, Past = already happened, Future = will happen!",
      fun_fact:"English has 12 tenses but we use just 3 main ones every day!",
      did_you_know:"The word 'tense' comes from Latin 'tempus' meaning time.",
      sections:[{heading:"Identify the Tense",section_label:"A",questions:[
        {id:1,type:"mcq",prompt:"'She plays cricket.' — This is in which tense?",options:["Past","Present","Future","Perfect"],answer:"Present",marks:2},
        {id:2,type:"mcq",prompt:"'They went to school.' — This is in which tense?",options:["Present","Future","Past","Perfect"],answer:"Past",marks:2},
        {id:3,type:"mcq",prompt:"'I will eat lunch.' — This is in which tense?",options:["Past","Present","Future","None"],answer:"Future",marks:2},
        {id:4,type:"fill",prompt:"Change to past tense: 'She walks to school.' → She ___ to school.",answer:"walked",marks:2},
        {id:5,type:"fill",prompt:"Change to future tense: 'He reads a book.' → He ___ a book.",answer:"will read",marks:2},
      ]},{heading:"Fill in the Blanks",section_label:"B",questions:[
        {id:6,type:"fill",prompt:"Yesterday, Anu ___ (eat) her lunch quickly.",answer:"ate",marks:2},
        {id:7,type:"fill",prompt:"Every morning, the sun ___ (rise) in the east.",answer:"rises",marks:2},
        {id:8,type:"fill",prompt:"Tomorrow, we ___ (visit) the zoo.",answer:"will visit",marks:2},
        {id:9,type:"mcq",prompt:"Which sentence is in present continuous tense?",options:["She ran fast.","She runs fast.","She is running fast.","She will run fast."],answer:"She is running fast.",marks:2},
        {id:10,type:"short",prompt:"Write one sentence each in Present, Past and Future tense about your school.",answer:"Accept any correct sentences.",marks:2},
      ]}]
    }
  },
  "English||Reading Comprehension": {
    Beginner: {title:"Reading Comprehension — Beginner",grade:"Grade 2",subject:"English",level:"Beginner",
      time_suggested:"25 mins",total_marks:20,
      instructions:"Read the passage carefully, then answer the questions.",
      mascot_tip:"Read the passage twice before answering!",
      fun_fact:"Reading improves your vocabulary by 10 new words every day!",
      did_you_know:"Children who read for 20 minutes a day score higher in all subjects.",
      sections:[{heading:"Read the Passage",section_label:"A",questions:[
        {id:1,type:"passage",prompt:"The Clever Crow\n\nOne hot summer day, a thirsty crow found a pitcher with a little water at the bottom. The crow tried to drink the water but his beak could not reach it. He did not give up. He looked around and found some pebbles. He picked them up one by one and dropped them into the pitcher. The water rose up slowly. At last he was able to drink the water. The crow was very happy.\n\nMoral: Where there is a will, there is a way.",answer:"",marks:0},
      ]},{heading:"Answer the Questions",section_label:"B",questions:[
        {id:2,type:"short",prompt:"Why was the crow thirsty?",answer:"It was a hot summer day.",marks:3},
        {id:3,type:"short",prompt:"What problem did the crow face?",answer:"The water was at the bottom and his beak could not reach it.",marks:3},
        {id:4,type:"short",prompt:"How did the crow solve his problem?",answer:"He dropped pebbles into the pitcher to make the water rise.",marks:4},
        {id:5,type:"mcq",prompt:"What is the moral of the story?",options:["Crows are clever","Where there is a will, there is a way","Never give up drinking water","Pebbles are useful"],answer:"Where there is a will, there is a way",marks:4},
        {id:6,type:"fill",prompt:"The crow dropped ___ into the pitcher.",answer:"pebbles",marks:3},
        {id:7,type:"short",prompt:"Write one word from the passage that means 'a container for liquids'.",answer:"pitcher",marks:3},
      ]}]
    }
  },
  "Hindi||संज्ञा (Nouns)": {
    Beginner: {title:"संज्ञा — Beginner",grade:"Grade 2",subject:"Hindi",level:"Beginner",
      time_suggested:"20 mins",total_marks:20,
      instructions:"सभी प्रश्नों के उत्तर दीजिए।",
      mascot_tip:"किसी व्यक्ति, वस्तु या स्थान के नाम को संज्ञा कहते हैं!",
      fun_fact:"हिन्दी में तीन प्रकार की संज्ञाएं होती हैं।",
      did_you_know:"संज्ञा शब्द संस्कृत के 'सम्+ज्ञा' से बना है जिसका अर्थ है 'सही ज्ञान'।",
      sections:[{heading:"संज्ञा पहचानिए",section_label:"क",questions:[
        {id:1,type:"mcq",prompt:"निम्न में से संज्ञा कौन सी है?",options:["दौड़ना","सुंदर","दिल्ली","तेज़"],answer:"दिल्ली",marks:2},
        {id:2,type:"mcq",prompt:"'राम स्कूल जाता है।' — इस वाक्य में संज्ञा कौन सी है?",options:["जाता","स्कूल","है","वाक्य"],answer:"स्कूल",marks:2},
        {id:3,type:"fill",prompt:"'___ एक मीठा फल है।' — रिक्त स्थान में संज्ञा भरिए।",answer:"आम (या कोई फल का नाम)",marks:2},
        {id:4,type:"fill",prompt:"नीचे दिए शब्दों में से संज्ञा छाँटिए: चलना, किताब, लाल — उत्तर: ___",answer:"किताब",marks:2},
        {id:5,type:"mcq",prompt:"व्यक्तिवाचक संज्ञा का उदाहरण कौन सा है?",options:["लड़का","गाय","गंगा","फूल"],answer:"गंगा",marks:2},
      ]},{heading:"रिक्त स्थान भरिए",section_label:"ख",questions:[
        {id:6,type:"fill",prompt:"मेरे ___ का नाम सुरेश है। (पिता के लिए संज्ञा)",answer:"पिता / पापा / बाबा",marks:2},
        {id:7,type:"short",prompt:"पाँच जातिवाचक संज्ञाओं के नाम लिखिए।",answer:"नदी, पहाड़, लड़की, कुत्ता, शहर (कोई भी पाँच)",marks:4},
        {id:8,type:"mcq",prompt:"'भारत' किस प्रकार की संज्ञा है?",options:["जातिवाचक","व्यक्तिवाचक","भाववाचक","समूहवाचक"],answer:"व्यक्तिवाचक",marks:2},
        {id:9,type:"fill",prompt:"'बचपन' किस प्रकार की संज्ञा है? ___",answer:"भाववाचक",marks:2},
      ]}]
    }
  },
  "Science/EVS||Plants – Parts & Functions": {
    Beginner: {title:"Plants — Beginner",grade:"Grade 2",subject:"Science/EVS",level:"Beginner",
      time_suggested:"20 mins",total_marks:20,
      instructions:"Answer all questions based on what you know about plants.",
      mascot_tip:"Plants make their own food using sunlight — they are nature's cooks!",
      fun_fact:"The world's tallest tree is a redwood called Hyperion — it's 115 metres tall!",
      did_you_know:"Plants produce oxygen which all animals need to breathe.",
      sections:[{heading:"Parts of a Plant",section_label:"A",questions:[
        {id:1,type:"mcq",prompt:"Which part of the plant takes in water from the soil?",options:["Leaf","Flower","Root","Stem"],answer:"Root",marks:2},
        {id:2,type:"mcq",prompt:"Which part carries water from roots to leaves?",options:["Root","Stem","Flower","Fruit"],answer:"Stem",marks:2},
        {id:3,type:"fill",prompt:"Plants make their food in the ___ using sunlight.",answer:"leaves",marks:2},
        {id:4,type:"fill",prompt:"The ___ helps the plant to reproduce.",answer:"flower",marks:2},
        {id:5,type:"mcq",prompt:"What do plants need to make food?",options:["Only water","Sunlight, water and air","Only sunlight","Only soil"],answer:"Sunlight, water and air",marks:2},
      ]},{heading:"True or False & Short Answer",section_label:"B",questions:[
        {id:6,type:"mcq",prompt:"Roots always grow upward. True or False?",options:["True","False"],answer:"False",marks:2},
        {id:7,type:"short",prompt:"Name two plants we eat the roots of.",answer:"Carrot, radish, beetroot, turnip (any two)",marks:2},
        {id:8,type:"short",prompt:"Name two plants we eat the leaves of.",answer:"Spinach, cabbage, coriander, mint (any two)",marks:2},
        {id:9,type:"fill",prompt:"The process by which plants make food is called ___.",answer:"photosynthesis",marks:2},
        {id:10,type:"mcq",prompt:"Which part of a plant stores food?",options:["Stem","Leaves","Roots","Flower"],answer:"Roots",marks:2},
      ]}]
    }
  }
};

// Check if a sample exists for a topic
const getSampleWs = (subject, topic, level) => {
  const key = subject+'||'+topic;
  return SAMPLE_WS[key]?.[level] || null;
};


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
const MathLayouts = {
  columnSum: ({ nums, op="+", ans="" }) => (
    <div style={{fontFamily:"'Courier New',monospace",background:"#F8F9FF",border:"2px solid #E8E6FF",borderRadius:12,padding:"14px 20px",display:"inline-block",minWidth:160,marginTop:8}}>
      {nums.map((n,i)=>(
        <div key={i} style={{textAlign:"right",fontSize:20,fontWeight:700,color:"#333",borderBottom:i===nums.length-1?"2px solid #6C63FF":"none",paddingBottom:i===nums.length-1?4:0,marginBottom:i===nums.length-1?4:0}}>
          {i===0?"":op} {n}
        </div>
      ))}
      <div style={{textAlign:"right",fontSize:20,fontWeight:900,color:"#6C63FF",minWidth:80,borderBottom:"3px double #6C63FF",paddingBottom:2}}>
        {ans||"?"}
      </div>
    </div>
  ),
  placeValueChart: ({ value, headers=["Th","H","T","O"] }) => {
    const digits = String(value).padStart(headers.length,"0").split("");
    return (
      <div style={{display:"inline-flex",border:"2px solid #6C63FF",borderRadius:10,overflow:"hidden",marginTop:8}}>
        {headers.map((h,i)=>(
          <div key={i} style={{minWidth:52,textAlign:"center",borderRight:i<headers.length-1?"2px solid #6C63FF":"none"}}>
            <div style={{background:"#6C63FF",color:"#fff",padding:"4px 8px",fontSize:12,fontWeight:800}}>{h}</div>
            <div style={{padding:"8px",fontSize:20,fontWeight:900,color:"#333"}}>{digits[i]||"_"}</div>
          </div>
        ))}
      </div>
    );
  },
  fractionBar: ({ num, den, label="" }) => {
    const filled = Math.round((num/den)*100);
    return (
      <div style={{marginTop:8}}>
        {label&&<div style={{fontSize:13,color:"#888",marginBottom:4}}>{label}</div>}
        <div style={{display:"flex",gap:2,marginBottom:6}}>
          {Array.from({length:den}).map((_,i)=>(
            <div key={i} style={{flex:1,height:32,background:i<num?"#6C63FF":"#E8E6FF",border:"2px solid #A29BFE",borderRadius:4}}/>
          ))}
        </div>
        <div style={{fontSize:15,fontWeight:800,color:"#6C63FF",textAlign:"center"}}>
          <span style={{fontSize:18}}>{num}</span>
          <span style={{display:"block",borderTop:"2px solid #6C63FF",width:30,margin:"2px auto"}}/>
          <span style={{fontSize:18}}>{den}</span>
        </div>
      </div>
    );
  },
  numberLine: ({ min=0, max=10, marks=[], label="" }) => (
    <div style={{marginTop:10,padding:"10px 4px"}}>
      {label&&<div style={{fontSize:13,color:"#888",marginBottom:6}}>{label}</div>}
      <div style={{position:"relative",height:40}}>
        <div style={{position:"absolute",top:18,left:0,right:0,height:3,background:"#6C63FF",borderRadius:2}}/>
        {[min,...marks,max].map((v,i,arr)=>{
          const pct=(v-min)/(max-min)*100;
          return(
            <div key={i} style={{position:"absolute",left:`${pct}%`,transform:"translateX(-50%)",textAlign:"center"}}>
              <div style={{width:3,height:12,background:"#6C63FF",margin:"12px auto 0"}}/>
              <div style={{fontSize:12,fontWeight:700,color:"#444",marginTop:2}}>{v}</div>
            </div>
          );
        })}
      </div>
    </div>
  ),
  gridMult: ({ a, b }) => {
    const aH = Math.floor(a/10)*10; const aO = a%10;
    const bH = Math.floor(b/10)*10; const bO = b%10;
    return (
      <div style={{marginTop:8,display:"inline-block"}}>
        <div style={{fontFamily:"'Courier New'",fontSize:14}}>
          <table style={{borderCollapse:"collapse"}}>
            <tbody>
              <tr>
                <td style={{border:"2px solid #6C63FF",padding:"8px 12px",background:"#6C63FF",color:"#fff",fontWeight:800}}>×</td>
                <td style={{border:"2px solid #6C63FF",padding:"8px 16px",background:"#E8E6FF",fontWeight:800,textAlign:"center"}}>{aH}</td>
                <td style={{border:"2px solid #6C63FF",padding:"8px 16px",background:"#E8E6FF",fontWeight:800,textAlign:"center"}}>{aO}</td>
              </tr>
              <tr>
                <td style={{border:"2px solid #6C63FF",padding:"8px 12px",background:"#E8E6FF",fontWeight:800}}>{bH}</td>
                <td style={{border:"2px solid #6C63FF",padding:"8px 16px",color:"#888",textAlign:"center"}}>{aH*bH||"?"}</td>
                <td style={{border:"2px solid #6C63FF",padding:"8px 16px",color:"#888",textAlign:"center"}}>{aO*bH||"?"}</td>
              </tr>
              <tr>
                <td style={{border:"2px solid #6C63FF",padding:"8px 12px",background:"#E8E6FF",fontWeight:800}}>{bO}</td>
                <td style={{border:"2px solid #6C63FF",padding:"8px 16px",color:"#888",textAlign:"center"}}>{aH*bO||"?"}</td>
                <td style={{border:"2px solid #6C63FF",padding:"8px 16px",color:"#888",textAlign:"center"}}>{aO*bO||"?"}</td>
              </tr>
            </tbody>
          </table>
          <div style={{marginTop:6,fontSize:13,color:"#6C63FF",fontWeight:700}}>Sum of all boxes = {a*b}</div>
        </div>
      </div>
    );
  },
};

/* ─────────────────────────────────────────────
   CONSTANTS
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
const ReviewCard = memo(({item, gc, ga, lm, isSelected, isApproved, isFailed,
  statusColor, statusLabel, reviewLoading, compareItem,
  onApprove, onReject, onDelete, onMoveNextWeek, onToggleSelect, onExpandToggle, expanded}) => {

  const isLoadingBg = item.status==="loading" && !item.wsData;
  const cardBorder  = isSelected?"#6C63FF":isApproved?"#00B894":isFailed?"#E74C3C":"#eee";
  const headerBg    = isSelected?"#F5F3FF":isApproved?"#F0FFF8":`linear-gradient(135deg,${gc}08,${ga}08)`;

  return(
    <div className="card" style={{marginBottom:12,overflow:"hidden",
      border:`2px solid ${cardBorder}`,
      boxShadow:isSelected?"0 0 0 3px #6C63FF33":undefined,
      transition:"border .2s,box-shadow .2s"}}>

      {/* Card header */}
      <div style={{padding:"10px 14px",background:headerBg,display:"flex",gap:10,alignItems:"flex-start"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
            <span style={{fontFamily:"'Fredoka One'",fontSize:15,color:"#333"}}>{item.topic}</span>
            <span style={{background:lm?.bg,color:lm?.color,borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:800}}>{lm?.emoji} {item.level}</span>
            <span style={{background:statusColor+"22",color:statusColor,borderRadius:20,padding:"1px 9px",fontSize:11,fontWeight:700}}>{statusLabel}</span>
            {item.attempt>1&&<span style={{background:"#F39C12",color:"#fff",borderRadius:20,padding:"1px 8px",fontSize:10}}>Attempt {item.attempt}</span>}
            {item.wsData?._cached&&<span style={{background:"#00B894",color:"#fff",borderRadius:20,padding:"1px 8px",fontSize:10}}>⚡ Cached</span>}
          </div>
          <div style={{fontSize:12,color:"#888"}}>{item.subject}</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
          {isApproved&&<span style={{background:"#6C63FF22",color:"#6C63FF",borderRadius:20,padding:"1px 8px",fontSize:11,cursor:"pointer"}} onClick={()=>onToggleSelect(item.id)}>{isSelected?"☑ Selected":"☐ Select"}</span>}
          {item.wsData&&<button className="btn" onClick={onExpandToggle} style={{background:"#F0EFFE",color:"#6C63FF",padding:"4px 10px",borderRadius:20,fontSize:12}}>{expanded?"▲ Hide":"▼ Preview"}</button>}
          <div style={{position:"relative"}}>
            <button className="btn" onClick={e=>{e.stopPropagation();const el=e.currentTarget.nextSibling;el.style.display=el.style.display==="block"?"none":"block";}}
              style={{background:"#F0F0F0",color:"#888",padding:"4px 9px",borderRadius:50,fontSize:13,lineHeight:1}}>⋯</button>
            <div style={{display:"none",position:"absolute",right:0,top:"100%",background:"#fff",borderRadius:10,boxShadow:"0 4px 20px #00000020",padding:6,zIndex:50,minWidth:160,marginTop:4}}>
              <button className="btn" onClick={()=>onMoveNextWeek(item)} style={{display:"block",width:"100%",padding:"7px 14px",textAlign:"left",background:"none",color:"#F39C12",fontSize:12,borderRadius:8}}>📅 Move to Next Week</button>
              <button className="btn" onClick={()=>onDelete(item.id)} style={{display:"block",width:"100%",padding:"7px 14px",textAlign:"left",background:"none",color:"#E74C3C",fontSize:12,borderRadius:8}}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      </div>

      {isLoadingBg&&<div style={{padding:14,textAlign:"center",color:"#bbb",background:"#FAFAFF",fontSize:12}}><span className="spin" style={{fontSize:20,display:"inline-block"}}>✏️</span><div style={{marginTop:4}}>Building 15 questions…</div></div>}
      {isFailed&&<div style={{padding:"10px 14px",background:"#FFF5F5",display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontSize:20}}>⚠️</span>
        <div style={{flex:1}}><div style={{fontWeight:700,color:"#E74C3C",fontSize:13}}>Generation failed</div><div style={{fontSize:12,color:"#aaa"}}>API error or rate limit. Try again.</div></div>
        <button className="btn" onClick={()=>onReject(item,"")} style={{background:"#E74C3C",color:"#fff",padding:"6px 14px",borderRadius:50,fontSize:12}}>Retry ↺</button>
      </div>}

      {/* Action buttons */}
      {item.wsData&&!isApproved&&(
        <div style={{padding:"10px 14px",display:"flex",gap:8,flexWrap:"wrap"}}>
          <button className="btn" onClick={()=>onApprove(item.id)} style={{flex:1,background:"#00B894",color:"#fff",padding:"9px 14px",borderRadius:50,fontSize:13,fontWeight:800}}>✅ Approve</button>
          <button className="btn" onClick={()=>onReject(item,"")} style={{flex:1,background:"#F0F0F0",color:"#888",padding:"9px 14px",borderRadius:50,fontSize:13}}>↺ Regenerate</button>
          <button className="btn" onClick={()=>onReject(item,"open")} style={{background:"#FFF9E6",color:"#D4A017",padding:"9px 14px",borderRadius:50,fontSize:13,border:"1.5px solid #F9CA24"}}>✏️ Note</button>
        </div>
      )}
      {isApproved&&<div style={{padding:"8px 14px",background:"#F0FFF8",fontSize:12,color:"#00B894",fontWeight:700}}>✅ Approved — ready for {item.topic}</div>}
    </div>
  );
}, (prev, next) => {
  // Custom equality: only re-render if THIS item changed
  return prev.item === next.item &&
         prev.isSelected === next.isSelected &&
         prev.expanded === next.expanded &&
         prev.isApproved === next.isApproved;
});

function App() {
  const [screen, setScreen]       = useState("splash");
  const [userPlan,setUserPlan]     = useState("free");
  const [showPricing,setShowPricing] = useState(false);
  const [wsCache,setWsCache]         = useState({});
  const [pregenRunning,setPregenRunning] = useState(false);
  const [pregenProg,setPregenProg]   = useState({done:0,total:0,current:""});
  const [adaptiveLevel,setAdaptiveLevel] = useState("Intermediate");
  const [topicMastery,setTopicMastery]   = useState({});
  const [showTopicIntro,setShowTopicIntro] = useState(false);
  const [topicIntroData,setTopicIntroData] = useState(null);
  const [currentQIdx,setCurrentQIdx] = useState(0);
  const [wsStartTime,setWsStartTime] = useState(null);
  const [wsTimeSpent,setWsTimeSpent] = useState(0);
  const [audioEnabled,setAudioEnabled] = useState(true);
  const [kidLevel,setKidLevel]       = useState(1);
  const [kidName,setKidName]         = useState("Champ");
  const [kidAvatar,setKidAvatar]     = useState("🦁");
  const [weeklySummary,setWeeklySummary] = useState(null);
  const [summaryLoading,setSummaryLoading] = useState(false);
  const [schedAgent,setSchedAgent]   = useState(null);
  const [schedType,setSchedType]     = useState("daily");
  const [grade, setGrade]         = useState(null);
  const [theme, setTheme]         = useState(null);
  const [picked, setPicked]       = useState({});   // {sub||topic: {Beginner,Intermediate,Advanced}}
  const [approved, setApproved]   = useState([]);   // approved items for kid
  const [wsData, setWsData]       = useState(null);
  const [wsLoading, setWsLoading] = useState(false);
  const [loadStep, setLoadStep]   = useState(0);
  const [activeWs, setActiveWs]   = useState(null);
  const [answers, setAnswers]     = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore]         = useState(null);
  const [reviewItems, setReviewItems]       = useState([]); // {id, sub, topic, level, status:"pending"|"approved"|"rejected", wsData, note, attempt}
  const [reviewLoading, setReviewLoading]   = useState(null);
  const [bgLoading, setBgLoading]           = useState(false);  // parallel background loading
  const [showDownload, setShowDownload]     = useState(false);  // download/send modal
  const [showPrintPreview, setShowPrintPreview] = useState(false); // full-screen print preview
  const [selectedForPrint, setSelectedForPrint] = useState(new Set()); // ids selected for print
  const [nextWeekItems, setNextWeekItems]         = useState([]);       // moved to next week
  const [compareItem, setCompareItem]       = useState(null); // {id, oldWs, newWs, note}
  const [rejectNote, setRejectNote]         = useState("");
  const [rejectTarget, setRejectTarget]     = useState(null);
  const [stars, setStars]   = useState(120);
  const [done, setDone]     = useState([]);
  const buildChatInit = () => {
    const summary = grade ? DB.getWeekSummary(grade) : null;
    if (summary && summary.sessions > 0) {
      const needsWork = summary.needsWork ? ` I see ${summary.needsWork} needs more practice.` : '';
      return [{role:"assistant",
        content:`👋 Welcome back! 📊 This week: ${summary.sessions} worksheets, avg score ${summary.avgScore}%.${needsWork}\n\nWhat would you like to work on today?`,
        chips:["Show suggestions","Build schedule","Add a topic","Hindi practice"]}];
    }
    return [{role:"assistant",content:"👋 Hi! I'm PracticeNest, your smart worksheet assistant!\n\n💡 Try: 'Maths fractions Grade 2' or 'English tenses Grade 3 Advanced'\n\nI remember your child's progress and suggest the right level automatically!",chips:["Grade 2 Maths","Grade 3 English","Hindi topics","Show smart suggestions"]}];
  };
  const CHAT_INIT = buildChatInit();
  const [chat, setChat]               = useState(CHAT_INIT);
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatWsReady, setChatWsReady] = useState(null);
  const [chatSlots, setChatSlots]     = useState({grade:null,subject:null,topic:null,level:null,theme:null});
  const [chatQueue, setChatQueue]     = useState([]);
  const [chatPhase, setChatPhase]     = useState("collecting");
  const [expandedSub, setExpandedSub] = useState(null);
  const [builderTab, setBuilderTab]     = useState("create");   // "create"|"pending"|"approved"
  const [scheduleType, setScheduleType] = useState("weekly");   // "daily"|"weekly"|"custom"
  const [customRange, setCustomRange]   = useState({from:"",to:""});
  const [lastSchedule, setLastSchedule] = useState(null);       // for Copy Last Schedule
  const [dashTab, setDashTab]           = useState("overview"); // "overview"|"subjects"|"activity"
  const [streak, setStreak]             = useState(3);
  const [showNotif,setShowNotif]         = useState(false);
  const [notifications,setNotifications] = useState([{id:1,icon:"🔥",text:"Welcome to PracticeNest! 🎉 10 mins a day, real progress!",time:"Now",read:false}]);
  const [calSelectedDay,setCalSelectedDay] = useState(null);
  const [kidTheme,setKidTheme]           = useState("default");
  const [showThemePicker,setShowThemePicker] = useState(false);
  const [darkMode,setDarkMode]           = useState(false);
  const [showConfetti,setShowConfetti]   = useState(false);
  const [showCertModal,setShowCertModal] = useState(false);
  const [certMonth,setCertMonth]         = useState(null);
  const [listenActive,setListenActive]   = useState(false);
  const [analytics,setAnalytics]         = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("practicenest_analytics")||"{}"); }catch{ return {}; }
  });
  const [crashLog,setCrashLog]           = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("practicenest_crashes")||"[]"); }catch{ return []; }
  });
  const [safetyBlocked,setSafetyBlocked] = useState(null);
  const [editModalItem,setEditModalItem]   = useState(null);  // worksheet being edited
  const [editMoveDate,setEditMoveDate]     = useState("");    // custom date for move
  const chatRef = useRef(null);
  useEffect(()=>{chatRef.current?.scrollIntoView({behavior:"smooth"});},[chat]);

  const LOAD_STEPS = [
    "📚 Curriculum Agent loading topic data…",
    "🔍 Referencing NCERT + K5Learning formats…",
    "🏅 Applying Olympiad question patterns…",
    "✏️ Worksheet Agent building 15 questions…",
    "🎨 Adding theme & visual layouts…",
    "✅ Generating answer key…",
  ];
  useEffect(()=>{
    let t;
    if(wsLoading) t=setInterval(()=>setLoadStep(s=>s<LOAD_STEPS.length-1?s+1:s),1600);
    else setLoadStep(0);
    return()=>clearInterval(t);
  },[wsLoading]);

  const pk = (s,t)=>`${s}||${t}`;
  const toggle = (s,t,lv)=>setPicked(p=>{const k=pk(s,t);const c=p[k]||{};return{...p,[k]:{...c,[lv]:!c[lv]}};});
  const pickedLevels=(s,t)=>picked[pk(s,t)]||{};
  const hasAny=(s,t)=>{const x=pickedLevels(s,t);return x.Beginner||x.Intermediate||x.Advanced;};
  const allPicked=useCallback(()=>Object.entries(picked).filter(([,l])=>l.Beginner||l.Intermediate||l.Advanced).map(([k,levels])=>{const[s,t]=k.split("||");return{subject:s,topic:t,levels};}), [picked]);

  const cacheKey=(g,sub,t,lv,i)=>`ws|v1|${g}|${sub}|${t}|${lv}|${i}`;
  const getFromCache=(g,sub,t,lv)=>{
    for(let i=0;i<3;i++){
      const k=cacheKey(g,sub,t,lv,i);
      if(wsCache[k])return{...wsCache[k],_cached:true};
      try{const s=localStorage.getItem(k);if(s){const p=JSON.parse(s);setWsCache(c=>({...c,[k]:p}));return{...p,_cached:true};}}catch{}
    }return null;
  };
  const saveToCache=(g,sub,t,lv,ws)=>{
    let idx=0;while(idx<3){try{if(!localStorage.getItem(cacheKey(g,sub,t,lv,idx)))break;}catch{}idx++;}
    if(idx>=3)idx=0;
    const k=cacheKey(g,sub,t,lv,idx);
    setWsCache(c=>({...c,[k]:{...ws,_cached:true}}));
    try{localStorage.setItem(k,JSON.stringify(ws));}catch{}
  };


  // ═══════════════════════════════════════════════
  // ADAPTIVE ENGINE — runs after each worksheet submit
  // ═══════════════════════════════════════════════
  const saveAndAdapt = useCallback((subject, topic, level, pct, timeSpent) => {
    // 1. Save session to DB
    DB.saveSession({grade: grade||"Grade 2", subject, topic, level, pct,
      timeSpent, date: new Date().toLocaleDateString("en-IN"), id: Date.now()});

    // 2. Update local topicMastery
    setTopicMastery(prev => {
      const key = subject+"||"+topic;
      const old = prev[key] || {attempts:0, avgPct:0, bestPct:0, lastPct:0, level};
      const newAttempts = old.attempts + 1;
      const newAvg = Math.round((old.avgPct * old.attempts + pct) / newAttempts);
      return {...prev, [key]: {
        attempts: newAttempts,
        avgPct: newAvg,
        bestPct: Math.max(old.bestPct, pct),
        lastPct: pct,
        level,
        timeSpent,
      }};
    });

    // 3. Update analytics
    setAnalytics(prev => {
      const updated = {...prev,
        events: [...(prev.events||[]).slice(-500), {e:"ws_complete", subject, topic, level, pct, timeSpent, t:Date.now()}],
        counts: {...(prev.counts||{}), [subject]: ((prev.counts||{})[subject]||0)+1}
      };
      try { localStorage.setItem("practicenest_analytics", JSON.stringify(updated)); } catch{}
      return updated;
    });

    // 4. Auto-adapt level
    const newLevel = DB.getAdaptiveLevel(subject, topic, level);
    if (newLevel !== level) {
      setAdaptiveLevel(newLevel);
      const up = levels.indexOf(newLevel) > levels.indexOf(level);
      setNotifications(n => [{
        id: Date.now(), read: false,
        icon: up ? "🚀" : "💪",
        text: up
          ? `Great work on ${topic}! Moving up to ${newLevel} 🎉`
          : `Let's build more confidence on ${topic} with ${newLevel} level`,
        time: "Just now"
      }, ...n.slice(0,9)]);
    }
  }, [grade]);


  // ═══════════════════════════════════════════════
  // SMART SUGGESTIONS — for parent dashboard
  // ═══════════════════════════════════════════════
  const renderSmartSuggestions = () => {
    const suggestions = DB.getSmartSuggestions(grade||"Grade 2");
    if (suggestions.length === 0) return (
      <div style={{textAlign:"center",padding:"20px 0",color:"#ccc"}}>
        <div style={{fontSize:32}}>🤖</div>
        <div style={{fontSize:13,marginTop:6}}>Complete a few worksheets to get smart suggestions!</div>
      </div>
    );
    return (
      <div>
        {suggestions.map((s,i) => {
          const colors = {struggling:"#E74C3C", ready_to_advance:"#00B894", plateau:"#F39C12", improving:"#6C63FF"};
          const icons  = {struggling:"⚠️", ready_to_advance:"🚀", plateau:"📊", improving:"📈"};
          const color  = colors[s.type]||"#6C63FF";
          return (
            <div key={i} className="card" style={{padding:"12px 14px",marginBottom:8,borderLeft:`4px solid ${color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,color:color,fontWeight:800,marginBottom:2}}>
                    {icons[s.type]} {SUBJECTS[s.subject]?.icon} {s.subject}
                  </div>
                  <div style={{fontWeight:800,fontSize:13,color:"#333",marginBottom:2}}>{s.topic}</div>
                  <div style={{fontSize:12,color:"#666"}}>{s.message}</div>
                </div>
                <button className="btn" onClick={()=>{
                  setTheme(null);
                  openWorksheetWithIntro(s.subject, s.topic, s.nextLevel||s.level);
                }} style={{background:color,color:"#fff",padding:"6px 14px",borderRadius:50,fontSize:11,fontWeight:800,flexShrink:0}}>
                  {s.action}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };


  const generateWsData = async(subject,topic,level,themeId,attempt=1,prevNote="")=>{
    // Try sample worksheet first (instant, no API)
    if(attempt===1 && !prevNote && !themeId) {
      const sample = getSampleWs(subject, topic, level);
      if(sample) return {...sample, _sample:true};
    }
    const gr=grade||"Grade 2";
    if(attempt===1&&!prevNote){
      const cached=getFromCache(gr,subject,topic,level);
      if(cached)return cached;
    }
    const thm=THEMES.find(t=>t.id===themeId)?.label||null;
    const sys=buildPrompt(gr,subject,topic,level,thm,attempt,prevNote);
    const raw=await callClaude(sys,`Generate worksheet: ${gr}, ${subject}, "${topic}", ${level}.`,3000);
    let clean=raw.replace(/```json|```/g,"").trim();
    const js=clean.indexOf("{"),je=clean.lastIndexOf("}");
    if(js>=0&&je>js)clean=clean.slice(js,je+1);
    const ws=JSON.parse(clean);
    // Safety check on generated content (for child-facing worksheets)
    const wsText = JSON.stringify(ws).slice(0,1000);
    const safety = await safetyCheck(wsText);
    if(!safety.safe){
      logError({message:`Safety filter blocked: ${safety.reason}`,stack:""},"safety_filter");
      setSafetyBlocked({subject,topic,reason:safety.reason});
      throw new Error("Content blocked by safety filter: " + safety.reason);
    }
    if(attempt===1&&!prevNote)saveToCache(gr,subject,topic,level,ws);
    // Track worksheet generation
    track("ws_generated", {subject, topic, level, grade:gr, cached:false});
    return ws;
  };

  const buildReviewQueue = async()=>{
    const items = allPicked().flatMap(({subject,topic,levels})=>
      LEVELS.filter(l=>levels[l]).map(l=>({
        id:`${subject}||${topic}||${l}||${Date.now()+Math.random()}`,
        subject,topic,level:l,status:"loading",wsData:null,note:"",attempt:1
      }))
    );
    setReviewItems(items);
    setBgLoading(true);
    go("review");

    for(let i=0; i<items.length; i++){
      const item = items[i];
      let loaded = false;
      for(let attempt=0; attempt<3; attempt++){
        try{
          if(attempt>0) await new Promise(r=>setTimeout(r,3000*attempt)); // 3s, 6s backoff
          const data = await generateWsData(item.subject,item.topic,item.level,theme,1,"");
          setReviewItems(ri=>ri.map(r=>r.id===item.id?{...r,wsData:data,status:"loaded"}:r));
          loaded = true;
          break;
        } catch(e){
          console.warn(`Worksheet ${i+1} attempt ${attempt+1} failed:`,e.message);
        }
      }
      if(!loaded){
        setReviewItems(ri=>ri.map(r=>r.id===item.id?{...r,status:"failed"}:r));
      }
      if(i < items.length-1) await new Promise(r=>setTimeout(r,1500));
    }
    setBgLoading(false);
  };

  const loadReviewItem = async(item)=>{
    setReviewLoading(item.id);
    try {
      const data = await generateWsData(item.subject,item.topic,item.level,theme,item.attempt,item.note);
      setReviewItems(ri=>ri.map(r=>r.id===item.id?{...r,wsData:data,status:"loaded"}:r));
    } catch(e) {
      console.error(e);
    }
    setReviewLoading(null);
  };

  const approveItem = (id)=>{
    setReviewItems(ri=>ri.map(r=>r.id===id?{...r,status:"approved"}:r));
  };

  const approveWithoutReview = (id)=>{
    setReviewItems(ri=>ri.map(r=>{
      if(r.id!==id) return r;
      return {...r, status: r.wsData ? "approved" : "auto-approved"};
    }));
  };

  const approveAllItems = ()=>{
    setReviewItems(ri=>ri.map(r=>
      (r.status==="loaded"||r.status==="auto-approved"||r.wsData) ? {...r,status:"approved"} : r
    ));
  };

  const buildPrintHTML = (apps) => {
    const sheets = apps.map((item,idx)=>{
      const ws = item.wsData;
      const sections = (ws.sections||[]).map(sec=>{
        const qs = (sec.questions||[]).map((q,qi)=>{
          const opts = q.options
            ? q.options.map((o,oi)=>`<span style="display:inline-block;padding:4px 14px;border:1.5px solid #bbb;border-radius:20px;margin:3px 4px;font-size:13px;">${String.fromCharCode(65+oi)}. ${o}</span>`).join("")
            : "";
          const blank = (q.type==="fill"||q.type==="short"||q.type==="calculate"||q.type==="word_problem")
            ? `<div style="border-bottom:1.5px solid #aaa;margin-top:22px;height:28px;"></div>`
            : "";
          return `<div style="margin-bottom:14px;padding:10px 12px;border:1px solid #e8e6ff;border-radius:8px;background:#fff;">
            <div style="font-weight:700;color:#222;margin-bottom:6px;font-size:14px;">Q${qi+1}. ${q.question||""}</div>
            ${opts?"<div style='margin-top:6px;flex-wrap:wrap;'>"+opts+"</div>":""}
            ${blank}
          </div>`;
        }).join("");
        return `<div style="margin-bottom:22px;">
          <div style="font-weight:800;font-size:14px;color:#6C63FF;background:#F0EFFE;padding:7px 14px;border-radius:8px;margin-bottom:10px;">
            ${sec.title||""}  <span style="font-size:12px;color:#999;float:right;">${(sec.questions||[]).length} questions</span>
          </div>
          ${qs}
        </div>`;
      }).join("");

      return `<div style="font-family:Arial,sans-serif;padding:28px 32px;max-width:760px;margin:0 auto;${idx>0?"page-break-before:always;":""}">
        <!-- Header -->
        <div style="border-bottom:3px solid #6C63FF;padding-bottom:14px;margin-bottom:22px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-size:11px;color:#999;letter-spacing:1px;text-transform:uppercase;">PracticeNest · NCERT/CBSE</div>
              <div style="font-size:20px;font-weight:900;color:#6C63FF;margin-top:2px;">${item.subject} — ${item.topic}</div>
              <div style="font-size:13px;color:#555;margin-top:3px;">${ws.grade||grade||""} · ${item.level} · ${ws.time_suggested||"30 min"}</div>
            </div>
            <div style="text-align:right;font-size:11px;color:#999;">
              Worksheet ${idx+1} of ${apps.length}
            </div>
          </div>
          <div style="display:flex;gap:40px;margin-top:14px;">
            <div style="font-size:13px;color:#444;">Name: <span style="display:inline-block;width:180px;border-bottom:1.5px solid #999;">&nbsp;</span></div>
            <div style="font-size:13px;color:#444;">Date: <span style="display:inline-block;width:110px;border-bottom:1.5px solid #999;">&nbsp;</span></div>
            <div style="font-size:13px;color:#444;">Score: <span style="display:inline-block;width:60px;border-bottom:1.5px solid #999;">&nbsp;</span> / ${ws.total_marks||40}</div>
          </div>
        </div>
        ${sections}
        <!-- Footer -->
        <div style="margin-top:24px;padding-top:10px;border-top:1px solid #eee;font-size:11px;color:#bbb;display:flex;justify-content:space-between;">
          <span>PracticeNest · 10 mins a day</span>
          <span>Generated ${new Date().toLocaleDateString("en-IN")}</span>
        </div>
      </div>`;
    }).join("\n");

    return `<!DOCTYPE html><html lang="en"><head>
      <meta charset="UTF-8"/>
      <title>PracticeNest Worksheets — ${new Date().toLocaleDateString("en-IN")}</title>
      <style>
        *{box-sizing:border-box;}
        body{margin:0;padding:0;background:#fff;font-family:Arial,sans-serif;}
        @media print{
          @page{margin:12mm;size:A4 portrait;}
          body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
          .no-print{display:none!important;}
        }
        @media screen{
          body{background:#e8e6f0;padding:24px;}
          .sheet{background:#fff;border-radius:8px;box-shadow:0 2px 16px #0002;margin:0 auto 32px;max-width:800px;}
        }
      </style>
    </head><body>
      <div class="no-print" style="position:fixed;top:0;left:0;right:0;background:#6C63FF;color:#fff;padding:12px 24px;display:flex;justify-content:space-between;align-items:center;z-index:99;font-family:Arial;">
        <span style="font-weight:700;font-size:15px;">📚 PracticeNest — ${apps.length} Worksheet${apps.length>1?"s":""} Ready</span>
        <button onclick="window.print()" style="background:#fff;color:#6C63FF;border:none;padding:8px 20px;border-radius:20px;font-weight:700;font-size:13px;cursor:pointer;">⬇️ Download / Save as PDF</button>
      </div>
      <div style="height:56px;" class="no-print"></div>
      ${sheets}
    </body></html>`;
  };

  // Memoised print HTML — only rebuilds when approved items change
  const memoizedPrintHTML = useMemo(()=>{
    const apps = reviewItems.filter(r=>(r.status==="approved"||r.status==="auto-approved")&&r.wsData);
    return apps.length > 0 ? buildPrintHTML(apps) : null;
  }, [reviewItems]);

  const printAllApproved = ()=>{
    const apps = reviewItems.filter(r=>(r.status==="approved"||r.status==="auto-approved")&&r.wsData);
    if(!apps.length){ return; }
    setShowDownload(false);
    setShowPrintPreview(true);
  };

  const triggerPrint = ()=>{
    const apps = reviewItems.filter(r=>(r.status==="approved"||r.status==="auto-approved")&&r.wsData);
    const html = buildPrintHTML(apps);
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;width:0;height:0;border:0;left:-9999px;top:-9999px;";
    document.body.appendChild(iframe);
    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();
    iframe.onload = ()=>{
      try{ iframe.contentWindow.focus(); iframe.contentWindow.print(); }
      catch(e){ window.print(); }
      setTimeout(()=>document.body.removeChild(iframe), 3000);
    };
  };

  const openRejectModal = (item)=>{
    setRejectTarget(item);
    setRejectNote("");
  };

  const confirmReject = async()=>{
    const item = rejectTarget;
    setRejectTarget(null);
    const newAttempt = item.attempt+1;
    const updatedItem = {...item,status:"regenerating",attempt:newAttempt,note:rejectNote,wsData:null};
    setReviewItems(ri=>ri.map(r=>r.id===item.id?updatedItem:r));
    setReviewLoading(item.id);
    try {
      const newData = await generateWsData(item.subject,item.topic,item.level,theme,newAttempt,rejectNote);
      if(item.wsData) {
        setCompareItem({id:item.id,oldWs:item.wsData,newWs:newData,note:rejectNote});
      }
      setReviewItems(ri=>ri.map(r=>r.id===item.id?{...r,wsData:newData,status:"loaded",attempt:newAttempt}:r));
    } catch(e){
      setReviewItems(ri=>ri.map(r=>r.id===item.id?{...r,status:"loaded",wsData:null}:r));
    }
    setReviewLoading(null);
  };

  const finalApproveAll = ()=>{
    const apps = reviewItems.filter(r=>r.status==="approved"&&r.wsData);
    setApproved(apps);
    if(apps.length>0) setLastSchedule({items:allPicked(), themeId:theme, gradeId:grade, date:new Date().toLocaleDateString("en-IN")});
    setShowDownload(true);  // show download/send modal instead of navigating away
  };

  const sendToKidAndClose = ()=>{
    setShowDownload(false);
    go("p-home");
  };

  const copyLastSchedule = ()=>{
    if(!lastSchedule) return;
    setGrade(lastSchedule.gradeId);
    setTheme(lastSchedule.themeId);
    const restored = {};
    lastSchedule.items.forEach(({subject,topic,levels})=>{
      restored[`${subject}||${topic}`] = levels;
    });
    setPicked(restored);
    setBuilderTab("create");
    go("builder");
  };

  const openWorksheet = async(subject,topic,level,wsDataOverride=null)=>{
    setActiveWs({subject,topic,level});
    setAnswers({}); setSubmitted(false); setScore(null);
    setScreen("worksheet");
    if(wsDataOverride){setWsData(wsDataOverride);return;}
    setWsLoading(true); setWsData(null);
    try {
      const data = await generateWsData(subject,topic,level,theme);
      setWsData(data);
    } catch { setWsData(null); }
    setWsLoading(false);
  };

  const submitWs = ()=>{
    if(!wsData) return;
    let earned=0,total=0;
    wsData.sections?.forEach(sec=>sec.questions?.forEach(q=>{
      total+=(q.marks||2);
      const a=answers[q.id];
      if(!a) return;
      if(q.type==="mcq"&&a===q.answer) earned+=(q.marks||2);
      else if(q.type==="truefalse"&&a===q.answer) earned+=(q.marks||2);
      else if(q.type==="fill"&&a.trim().toLowerCase()===q.answer?.toLowerCase()) earned+=(q.marks||2);
      else if(["short","find_copy","calculate","word_problem","picture_write","classify"].includes(q.type)&&a.trim().length>4) earned+=Math.round((q.marks||2)*0.8);
      else if(q.type==="match"&&a.trim().length>2) earned+=Math.round((q.marks||2)*0.6);
    }));
    const pct=total?Math.round((earned/total)*100):0;
    const pts=Math.round((pct/100)*(LM[activeWs?.level||"Beginner"].pts));
    if(pct>=70) fireConfetti();
    setScore({earned,total,pct,pts});
    setStars(s=>s+pts);
    setDone(d=>[...d,{...activeWs,earned,total,pct,pts,date:new Date().toLocaleDateString("en-IN")}]);
    setSubmitted(true);
    // Smart: save session + adapt level
    const timeSpent = wsStartTime ? Math.round((Date.now()-wsStartTime)/1000) : 0;
    setWsTimeSpent(timeSpent);
    saveAndAdapt(activeWs.subject, activeWs.topic, activeWs.level, pct, timeSpent);
  };

  const TOPIC_MAP = [
    {p:/\bplace value\b|\bh\.?t\.?o\b|\bplace val|\bones[,\s]tens|\btens[,\s]ones|\bhundreds place\b/,                  subject:"Mathematics", topic:"Place Value – H, T, O"},
    {p:/\bfractions?\b|\bfracton\b|\bfraksh|\bhalf\b|\bquarter\b|\bnumerator\b|\bdenominator\b/,                                                   subject:"Mathematics", topic:"Fractions"},
    {p:/\baddition\b|\badition\b|\baddision\b|\badding\b|\bcarry\b|\bcarrying\b|\bsum\b/,                                                          subject:"Mathematics", topic:"Addition with Carrying"},
    {p:/\bsubtraction\b|\bsubstraction\b|\bsubtarction\b|\bsubtracting\b|\bborrow|\bminus\b|\bdifference\b/,                                               subject:"Mathematics", topic:"Subtraction with Borrowing"},
    {p:/\bmultiplication\b|\bmultipication\b|\bmultplicat\b|\bmultiplying\b|\btimes table|\bmultiply\b/,                                                   subject:"Mathematics", topic:"Multiplication Tables 1–12"},
    {p:/\bdivision\b|\bdivison\b|\bdivision\b|\bdivide\b|\bdivisor\b|\bquotient\b|\bremainder\b/,                                                  subject:"Mathematics", topic:"Division – Concept & Short"},
    {p:/\blarge number|\blakh\b|\blac\b|\blacs\b|\bhundred thousand\b/,                                                           subject:"Mathematics", topic:"Large Numbers – Up to 1 Lakh"},
    {p:/\bdecimals?\b|\bdecimal point\b|\bdecimle\b|\bdecamal\b/,                                                                                      subject:"Mathematics", topic:"Decimals – Introduction"},
    {p:/\bpercentage\b|\bpercent\b|\bpercantage\b|\bpercantege\b/,                                                                                      subject:"Mathematics", topic:"Percentages – Introduction"},
    {p:/\bgeometry\b|\bgeomatry\b|\bjeometry\b|\b2d shapes\b|\b3d shapes\b|\bcircle\b|\btriangle\b|\bsquare\b|\brectangle\b|\bpolygon\b/,          subject:"Mathematics", topic:"Geometry – 2D & 3D Shapes"},
    {p:/\bangle\b|\bangles\b|\bacute\b|\bobtuse\b|\bright angle\b/,                                                       subject:"Mathematics", topic:"Geometry – Angles & Types"},
    {p:/\bperimeter\b|\bperimetre\b|\bpermeter\b|\barea\b/,                                                                                          subject:"Mathematics", topic:"Perimeter & Area"},
    {p:/\bmeasurement\b|\bmeasurment\b|\bmeashure|\bweight\b|\bcapacity\b/,                                                                         subject:"Mathematics", topic:"Measurement – Length, Weight, Capacity"},
    {p:/\btime\b|\bclock\b|\bcalendar\b|\bhour\b|\bminute\b|\bam pm\b/,                                                  subject:"Mathematics", topic:"Time – Clock & Calendar"},
    {p:/\bmoney\b|\brunpee\b|\brupee|\bpaise\b|\bcurrency\b/,                                                                        subject:"Mathematics", topic:"Money – Indian Currency"},
    {p:/\bprofit\b|\bloss\b|\bprofit and loss\b/,                                                                         subject:"Mathematics", topic:"Money – Profit & Loss"},
    {p:/\bdata\b|\bbar graph\b|\bpictograph\b|\btally\b|\bchart\b/,                                                       subject:"Mathematics", topic:"Data Handling – Pictographs & Bar Graphs"},
    {p:/\bmean\b|\baverage\b/,                                                                                            subject:"Mathematics", topic:"Mean (Average)"},
    {p:/\bword problem|\bstory problem\b|\bstory sum\b/,                                                                  subject:"Mathematics", topic:"Word Problems – Mixed"},
    {p:/\bpattern\b|\bsequence\b|\bnumber pattern\b/,                                                                     subject:"Mathematics", topic:"Patterns & Sequences"},
    {p:/\broman numeral|\broman\b/,                                                                                       subject:"Mathematics", topic:"Roman Numerals"},
    {p:/\btenses?\b|\btences\b|\btinse\b|\bpast tense\b|\bpresent tense\b|\bfuture tense\b|\bcontinuous tense\b/,                    subject:"English", topic:"Tenses – Present, Past, Future"},
    {p:/\bnouns?\b|\bnaun\b|\bnown\b|\bproper noun\b|\bcommon noun\b/,                                                              subject:"English", topic:"Nouns – Common & Proper"},
    {p:/\bverbs?\b|\bvarb\b|\baction word\b/,                                                                              subject:"English", topic:"Verbs – Action Words"},
    {p:/\badjectives?\b|\bajective\b|\badjectiv\b|\bdescribing word\b|\bcomparative\b|\bsuperlative\b/,                                subject:"English", topic:"Adjectives"},
    {p:/\bactive voice\b|\bpassive voice\b/,                                                                              subject:"English", topic:"Active & Passive Voice"},
    {p:/\bdirect speech\b|\bindirect speech\b|\breported speech\b|\bnarration\b/,                                         subject:"English", topic:"Direct & Indirect Speech"},
    {p:/\bcomprehension\b|\bcomperhension\b|\breading comp|\bpassage\b|\bread and answer\b/,                                     subject:"English", topic:"Reading Comprehension"},
    {p:/\bpicture composition\b|\bpicture writing\b|\bdescribe.*picture\b/,                                               subject:"English", topic:"Picture Composition"},
    {p:/\bessay\b|\bparagraph writing\b|\bcomposition\b/,                                                                 subject:"English", topic:"Essay Writing"},
    {p:/\bletter writing\b|\bformal letter\b|\binformal letter\b/,                                                        subject:"English", topic:"Letter Writing – Formal"},
    {p:/\bstory writing\b|\bcreative writing\b|\bnarrative\b/,                                                            subject:"English", topic:"Story Writing"},
    {p:/\bidiom\b|\bidioms\b|\bidioms and phrases\b/,                                                                     subject:"English", topic:"Idioms & Phrases"},
    {p:/\bprefix\b|\bsuffix\b|\bprefixes\b|\bsuffixes\b/,                                                                subject:"English", topic:"Prefixes & Suffixes"},
    {p:/\bsynonym\b|\bantonym\b|\bopposite word\b/,                                                                       subject:"English", topic:"Synonyms & Antonyms"},
    {p:/\bpunctuation\b|\bpunctation\b|\bpunctuaton\b|\bcapital letter\b|\bfull stop\b/,                                                                subject:"English", topic:"Punctuation & Capitalisation"},
    {p:/\bpronouns?\b|\bpronowns?\b/,                                                                                        subject:"English", topic:"Pronouns"},
    {p:/\bprepositions?\b|\bpreposision\b|\bprepositon\b/,                                                                                subject:"English", topic:"Prepositions"},
    {p:/\bconjunctions?\b|\bconjuction\b|\bconjuntion\b/,                                                                                subject:"English", topic:"Conjunctions"},
    {p:/\barticle\b|\ba an the\b/,                                                                                        subject:"English", topic:"Articles"},
    {p:/\bsingular\b|\bplural\b|\bsingular plural\b/,                                                                     subject:"English", topic:"Singular & Plural"},
    {p:/\bsimile\b|\bmetaphor\b|\bfigure of speech\b/,                                                                   subject:"English", topic:"Similes & Metaphors"},
    {p:/\bpoem\b|\bpoetry\b|\brhyme\b|\bpoem comprehension\b/,                                                           subject:"English", topic:"Poetry Analysis"},
    {p:/\bplants?\b|\bparts of plant\b|\bphotosynthesis\b|\bfotosynthesis\b/,                                                     subject:"Science/EVS", topic:"Plants – Parts & Functions"},
    {p:/\banimals?\b|\bannimals?\b|\bhabitat\b|\bwild animal\b/,                                                              subject:"Science/EVS", topic:"Animals & Habitats"},
    {p:/\bbody\b|\bsense organ\b|\bsenses\b|\bhygiene\b/,                                                                 subject:"Science/EVS", topic:"Our Body & Sense Organs"},
    {p:/\bstates of matter\b|\bsolid\b|\bliquid\b|\bgas\b|\bmelting\b|\bevaporation\b/,                                  subject:"Science/EVS", topic:"States of Matter"},
    {p:/\bfood chain\b|\becosystem\b|\bproducer\b|\bconsumer\b|\bdecomposer\b/,                                           subject:"Science/EVS", topic:"Ecosystems & Food Chains"},
    {p:/\bfood\b|\bnutrition\b|\bhealthy food\b|\bvitamins\b/,                                                            subject:"Science/EVS", topic:"Food & Nutrition"},
    {p:/\bair\b|\bwater\b|\bpollution\b|\bdrinking water\b/,                                                              subject:"Science/EVS", topic:"Air & Water"},
    {p:/\bsimple machine\b|\blever\b|\bpulley\b|\binclined plane\b/,                                                     subject:"Science/EVS", topic:"Simple Machines"},
    {p:/\belectricity\b|\belektricity\b|\belectrisity\b|\bcircuit\b|\bconductor\b|\binsulator\b/,                                                        subject:"Science/EVS", topic:"Electricity – Basic Circuits"},
    {p:/\bsolar system\b|\bplanet\b|\bplanets\b|\bsun\b|\bmoon\b/,                                                       subject:"Science/EVS", topic:"Solar System"},
    {p:/\btransport\b|\bcommunication\b|\brail\b|\bair travel\b/,                                                        subject:"Science/EVS", topic:"Transport & Communication"},
    {p:/\bweather\b|\bwether\b|\bwhether\b|\bseason\b|\bmonsoon\b/,                                                                              subject:"Science/EVS", topic:"Weather & Seasons"},
    {p:/\brock\b|\bsoil\b|\bminerals\b/,                                                                                  subject:"Science/EVS", topic:"Rocks & Soil"},
    {p:/\bsangya\b|\bsanghya\b|\bsanhya\b|\bsangiya\b|\bsangna\b|\bsangia\b|\bsunghya\b|\bसंज्ञा\b|\bnoun hindi\b|\bhindi noun\b/,                        subject:"Hindi", topic:"संज्ञा (Nouns)"},
    {p:/\bkriya\b|\bkirya\b|\bkria\b|\bkrya\b|\bक्रिया\b|\bverb hindi\b|\bhindi verb\b/,                                                             subject:"Hindi", topic:"क्रिया (Verbs)"},
    {p:/\bvisheshan\b|\bविशेषण\b|\badjective hindi\b/,                                                                   subject:"Hindi", topic:"विशेषण (Adjectives)"},
    {p:/\bvachan\b|\bवचन\b/,                                                                                              subject:"Hindi", topic:"वचन (Singular/Plural)"},
    {p:/\bvyakaran\b|\bव्याकरण\b|\bhindi grammar\b/,                                                                     subject:"Hindi", topic:"व्याकरण (Grammar)"},
    {p:/\bnibandh\b|\bनिबंध\b|\bhindi essay\b/,                                                                          subject:"Hindi", topic:"निबंध लेखन"},
    {p:/\bpatra\b|\bपत्र\b|\bhindi letter\b/,                                                                            subject:"Hindi", topic:"पत्र लेखन"},
    {p:/\bmuhavare\b|\bमुहावरे\b|\bidiom hindi\b/,                                                                       subject:"Hindi", topic:"मुहावरे"},
    {p:/\bkaal\b|\bकाल\b|\bhindi tense\b/,                                                                               subject:"Hindi", topic:"काल (Tenses)"},
    {p:/\bsarvnam\b|\bसर्वनाम\b|\bpronoun hindi\b/,                                                                      subject:"Hindi", topic:"सर्वनाम (Pronouns)"},
  ];

  const extractSlotsFromText = (text) => {
    const t = text.toLowerCase();
    const s = {};

    if(/grade 2|class 2|std 2|g2\b/.test(t))  s.grade = "Grade 2";
    if(/grade 3|class 3|std 3|g3\b/.test(t))  s.grade = "Grade 3";

    if(/\bmath\b|maths\b|mathematics\b/.test(t)) s.subject = "Mathematics";
    if(/\benglish\b/.test(t))                    s.subject = "English";
    if(/\bscience\b|\bevs\b/.test(t))            s.subject = "Science/EVS";
    if(/\bhindi\b/.test(t))                      s.subject = "Hindi";

    if(/\bbeginner\b|\beasy\b|\bsimple\b/.test(t))      s.level = "Beginner";
    if(/\bintermediate\b|\bmedium\b/.test(t))            s.level = "Intermediate";
    if(/\badvanced\b|\bhard\b|\bolympiad\b/.test(t))     s.level = "Advanced";

    if(/\bsports?\b|\bcricket\b|\bfootball\b/.test(t))  s.theme = "sports";
    if(/\bspace\b|\brocket\b|\bplanet\b/.test(t))        s.theme = "space";
    if(/\banimals?\b|\bjungle\b/.test(t))                s.theme = "animals";
    if(/\bindia\b|\bindian\b|\bfestival\b/.test(t))      s.theme = "india";
    if(/\bocean\b|\bsea\b|\bfish\b/.test(t))             s.theme = "ocean";
    if(/\bcooking\b|\bfood\b|\brecipe\b/.test(t))        s.theme = "cooking";
    if(/\bsuperher/.test(t))                             s.theme = "superheroes";
    if(/\bprincess\b|\bfairy\b/.test(t))                 s.theme = "princess";
    if(/\brobots?\b|\btech\b/.test(t))                   s.theme = "robots";
    if(/no theme|skip theme|any theme|no\s*$|without theme/.test(t)) s.theme = "none";

    for(const entry of TOPIC_MAP) {
      if(entry.p.test(t)) {
        s.topic = entry.topic;
        if(!s.subject) s.subject = entry.subject;
        break;
      }
    }

    return s;
  };

  const matchTopicToken = (token) => {
    const t = token.toLowerCase().trim();
    for(const entry of TOPIC_MAP) {
      if(entry.p.test(t)) return {topic:entry.topic, subject:entry.subject};
    }
    return null;
  };

  const NOISE_WORDS = /^(create|make|generate|please|worksheet|worksheets|for|and|all|topics|topic|level|levels|one|two|three|a|an|the|intermediate|advanced?|beginner|easy|medium|hard|i|want|need|give|me|my|kid|child|grade|class|std|do|also|add|more|this|that|\d+)$/;

  const extractMultipleSpecs = (text) => {
    const t = text.toLowerCase();

    const base = extractSlotsFromText(text);

    const raw = t
      .replace(/\bcreate\b.*$/,'')           // drop "create 1 worksheet..." tail
      .replace(/\.\s*create\b.*$/,'')        // drop ". create..." tail
      .replace(/\bplease\b/g,'')
      .trim();

    const parts = raw
      .split(/,|\band\b|&|\bplus\b|\bas well as\b/)
      .map(p => p.trim())
      .filter(p => p.length > 1);

    const specs       = [];
    const unrecognised = [];

    parts.forEach(part => {
      const tokens = part.split(/\s+/).filter(w => !NOISE_WORDS.test(w));
      if(tokens.length === 0) return;

      const partSlots = extractSlotsFromText(part);

      if(partSlots.topic) {
        specs.push({
          grade:   partSlots.grade   || base.grade,
          subject: partSlots.subject || base.subject,
          topic:   partSlots.topic,
          level:   partSlots.level   || base.level,
          theme:   partSlots.theme   !== undefined ? partSlots.theme : base.theme,
        });
      } else if(partSlots.grade || partSlots.level || partSlots.theme) {
      } else {
        const cleanToken = part
          .replace(/grade \d+|class \d+|std \d+/g,'')
          .replace(/\bbeginner\b|\bintermediate\b|\badvanced?\b|\beasy\b|\bmedium\b|\bhard\b/g,'')
          .trim();
        if(cleanToken.length > 1) unrecognised.push(cleanToken);
      }
    });

    const result = specs.length > 0 ? specs : (base.topic ? [base] : []);
    result._unrecognised = unrecognised;
    return result;
  };

  const mergeSlots = (existing, extracted) => ({
    grade:   extracted.grade   || existing.grade,
    subject: extracted.subject || existing.subject,
    topic:   extracted.topic   || existing.topic,
    level:   extracted.level   || existing.level,
    theme:   extracted.theme   !== undefined ? extracted.theme : existing.theme,
  });

  const extractAllLevels = (text) => {
    const t = text.toLowerCase();
    const levels = [];
    if(/\badvance[d]?\b/.test(t))    levels.push("Advanced");
    if(/\bintermediate\b|\bmedium\b/.test(t)) levels.push("Intermediate");
    if(/\bbeginner\b|\beasy\b/.test(t))      levels.push("Beginner");
    return [...new Set(levels)]; // deduplicate, preserve order
  };

  const isMultiLevelForAll = (text) => {
    const t = text.toLowerCase();
    const levels = extractAllLevels(t);
    if(levels.length < 2) return false;
    const hasForAll = /for all|all topics|each topic|every topic|all of them|\beach\b|\bfor all\b/.test(t);
    const hasTopicList = /,/.test(t) || /\band\b/.test(t);
    return hasForAll || hasTopicList;
  };

  const isMoreIntent  = (text) => /\byes\b|yeah|sure|yep|\badd more\b|\badd another\b|another|\bmore\b|also|plus|next|ok\b/i.test(text);
  const isDoneIntent  = (text) => /\bno\b|nope|done|that'?s (all|it)|finish|generate|build|go ahead|start|enough|stop|nothing|all done/i.test(text);

  const isQueueDupeIntent = (text) => {
    const t = text.toLowerCase();
    const levels = extractAllLevels(t);
    if(levels.length === 0) return false;
    const hasForAll = /for all|all topics|same topics|each topic|every topic|all of them|also add|add.*too\b|add.*level|\btoo\b|as well/.test(t);
    return hasForAll; // levels.length >= 1 already checked
  };

  const isRemoveIntent = (text) =>
    /\bremove\b|\bdelete\b|\bdrop\b|\btake out\b|\bcancel\b|\bno more\b|\bdont want\b|\bdon'?t want\b|\bskip\b/i.test(text);

  const extractRemoveTopic = (text) => {
    return text.toLowerCase()
      .replace(/\bremove\b|\bdelete\b|\bdrop\b|\btake out\b|\bcancel\b|\bskip\b/gi, "")
      .replace(/\bworksheet[s]?\b|\bthe\b|\bplease\b|\ball\b/gi, "")
      .replace(/\blevel\b|\badvanced?\b|\bintermediate\b|\bbeginner\b/gi, "")
      .replace(/\bmaths?\b/g, "mathematics")   // normalise maths→mathematics
      .replace(/\bevs\b/g,   "science")         // normalise evs→science
      .replace(/\bhindi grammar\b/g, "hindi")  // normalise
      .trim();
  };

  const topicMatchesRemove = (item, removeStr) => {
    const r       = removeStr.toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();
    const topicL  = item.topic.toLowerCase().replace(/[^a-z0-9 ]/g,"");
    const subjectL= item.subject.toLowerCase().replace(/[^a-z0-9 ]/g,"");
    if(!r) return false;
    if(topicL.includes(r) || r.includes(topicL)) return true;
    if(subjectL.includes(r) || r.includes(subjectL.split("/")[0])) return true;
    const rWords   = r.split(/\s+/).filter(w=>w.length>2);
    const topWords = topicL.split(/[\s–\-&]+/).filter(w=>w.length>2);
    return rWords.some(rw => topWords.some(tw => tw.includes(rw) || rw.includes(tw)));
  };

  const expandTopicsToLevels = (specs, levels, baseGrade, baseTheme) =>
    specs.flatMap(sp => levels.map(lv => ({
      grade:   sp.grade   || baseGrade || "Grade 2",
      subject: sp.subject,
      topic:   sp.topic,
      level:   lv,
      theme:   sp.theme   || baseTheme || null,
    })));

  const generateQueuedWorksheets = async(queue) => {
    setChatPhase("generating");
    setChatLoading(true);
    setChat(m=>[...m,{
      role:"assistant",
      content:`🚀 Building ${queue.length} worksheet${queue.length>1?"s":""} now! Adding to your Review queue…`,
      chips:[]
    }]);

    const newReviewItems = queue.map(item => ({
      id: `${item.subject}||${item.topic}||${item.level}||${Date.now()+Math.random()}`,
      subject: item.subject, topic: item.topic, level: item.level,
      status:"pending", wsData:null, note:"", attempt:1
    }));

    if(queue[0]?.grade) setGrade(queue[0].grade);
    if(queue[0]?.theme && queue[0].theme !== "none") setTheme(queue[0].theme);
    setReviewItems(newReviewItems);
    setChatWsReady(queue.length);
    setChatLoading(false);

    const summary = queue.map((q,i)=>`${i+1}. ${q.subject} — ${q.topic} (${q.level})`).join("\n");
    setChat(m=>[...m,{
      role:"assistant",
      content:`✅ ${queue.length} worksheet${queue.length>1?"s":""} added to Review!\n\n${summary}\n\nGo to Review to preview and approve them for your child. 👇`,
      chips:["Go to Review","Add More Worksheets"]
    }]);

    setChatSlots({grade:null,subject:null,topic:null,level:null,theme:null});
    setChatQueue([]);
    setChatPhase("collecting");
  };

  const sendChat = async(overrideMsg=null)=>{
    const msg = (overrideMsg||chatInput).trim();
    if(!msg) return;
    setChatInput("");

    if(msg==="Go to Review")      { go("review"); return; }
    if(msg==="Show suggestions"||msg==="Show smart suggestions") {
      const sugg = DB.getSmartSuggestions(grade||"Grade 2");
      if(sugg.length===0) {
        setChat(m=>[...m,{role:"user",content:msg,chips:[]},{role:"assistant",
          content:"Complete a few worksheets first and I'll give you personalised suggestions based on your child's performance! 📊",
          chips:["Grade 2 Maths","Grade 3 English","Hindi practice"]}]);
      } else {
        const lines = sugg.slice(0,3).map((s,i)=>`${i+1}. ${s.subject} — ${s.topic}: ${s.message}`).join("\n");
        setChat(m=>[...m,{role:"user",content:msg,chips:[]},{role:"assistant",
          content:`📊 Based on your child's history:\n\n${lines}\n\nWould you like to build a worksheet for any of these?`,
          chips:sugg.slice(0,3).map(s=>s.topic)}]);
      }
      return;
    }
    if(msg==="Generate All Now" || msg==="Generate All") {
      setChat(m=>[...m,{role:"user",content:msg,chips:[]}]);
      await generateQueuedWorksheets(chatQueue);
      return;
    }
    if(msg==="Add More Worksheets"||msg==="Add More") {
      setChat(m=>[...m,
        {role:"user",content:msg,chips:[]},
        {role:"assistant",content:"Sure! What's the next topic? 😊",chips:["English","Mathematics","Science/EVS","Hindi"]}
      ]);
      setChatPhase("collecting");
      setChatSlots(prev=>({grade:prev.grade,subject:null,topic:null,level:null,theme:prev.theme}));
      return;
    }
    if(msg==="Remove Another") {
      const qSum = chatQueue.map((q,i)=>`  ${i+1}. ${q.subject} — ${q.topic} (${q.level})`).join("\n");
      setChat(m=>[...m,
        {role:"user",content:msg,chips:[]},
        {role:"assistant",content:`Which one would you like to remove?\n\n${qSum}`,chips:[]}
      ]);
      return;
    }

    const schedKeywords = /(schedule|plan|daily|weekly|custom date|day by day|week plan|build a schedule|create a schedule|set up schedule|setup schedule|schedule for|plan for|organise|organize)/i;
    if(schedKeywords.test(msg)){
      const isWeekly = /weekly|whole week|full week/i.test(msg);
      const isCustom = /custom|specific date|particular date/i.test(msg);
      const sType = isWeekly ? "weekly" : isCustom ? "custom" : "daily";
      setChat(m=>[...m,
        {role:"user",content:msg,chips:[]},
        {role:"assistant",content:`Sure! Let me launch the Scheduling Agent for you. 🗓️

I'll set it up for a **${sType}** schedule — you can add topics day by day and I'll build your worksheet plan.`,chips:[]}
      ]);
      setSchedType(sType);
      setSchedAgent({phase:"picking_grade", grade:grade||null, schedType:sType, days:[], currentDayIdx:0, weekTopics:[]});
      setTimeout(()=>go("sched-agent"), 800);
      return;
    }

    if(isRemoveIntent(msg) && chatQueue.length > 0) {
      const removeStr  = extractRemoveTopic(msg);
      const toRemove   = chatQueue.filter(item => topicMatchesRemove(item, removeStr));
      const newQueue   = chatQueue.filter(item => !topicMatchesRemove(item, removeStr));

      setChat(m=>[...m,{role:"user",content:msg,chips:[]}]);

      if(toRemove.length === 0) {
        const qSum = chatQueue.map((q,i)=>`  ${i+1}. ${q.subject} — ${q.topic} (${q.level})`).join("\n");
        setChat(m=>[...m,{role:"assistant",
          content:`Hmm, I couldn't find "${removeStr}" in your list. Here's what's queued:\n${qSum}\n\nWhich one would you like to remove?`,
          chips:[]}]);
        return;
      }

      setChatQueue(newQueue);
      const removedNames = [...new Set(toRemove.map(r=>r.topic))].join(", ");

      if(newQueue.length === 0) {
        setChatPhase("collecting");
        setChatSlots({grade:chatSlots.grade,subject:null,topic:null,level:null,theme:chatSlots.theme});
        setChat(m=>[...m,{role:"assistant",
          content:`✅ Removed ${removedNames}. Your list is now empty. What topic would you like to add?`,
          chips:["English","Mathematics","Science/EVS","Hindi"]}]);
        return;
      }

      setChatPhase("asking_more");
      const qSum = newQueue.map((q,i)=>`  ${i+1}. ${q.subject} — ${q.topic} (${q.level})`).join("\n");
      setChat(m=>[...m,{role:"assistant",
        content:`✅ Removed ${removedNames} (${toRemove.length} worksheet${toRemove.length>1?"s":""}).\n\n📋 Updated list (${newQueue.length}):\n${qSum}\n\nGenerate all ${newQueue.length}, or make more changes?`,
        chips:["Generate All Now","Add More","Remove Another"]}]);
      return;
    }

    setChat(m=>[...m,{role:"user",content:msg,chips:[]}]);
    setChatLoading(true);

    const phase = chatPhase;

    if(phase==="asking_count") {
      const n = Math.min(Math.max(parseInt(msg)||1, 1), 10);
      const copies = Array.from({length:n}, ()=>({...chatSlots}));
      const newQueue = [...chatQueue, ...copies];
      setChatQueue(newQueue);
      const nextSlots = {grade:chatSlots.grade, subject:null, topic:null, level:null, theme:chatSlots.theme};
      setChatSlots(nextSlots);
      setChatPhase("asking_more");
      const qSum = newQueue.map((q,i)=>`  ${i+1}. ${q.subject} — ${q.topic} (${q.level})`).join("\n");
      setChat(m=>[...m,{role:"assistant",
        content:`✅ Added ${n} worksheet${n>1?"s":""} for ${chatSlots.topic}!\n\n📋 Your list:\n${qSum}\n\nAdd another subject/topic, or generate all ${newQueue.length}?`,
        chips:["Yes, add more","No, generate now"]}]);
      setChatLoading(false);
      return;
    }

    if(phase==="asking_more") {

      if(isQueueDupeIntent(msg) && chatQueue.length > 0) {
        const t = msg.toLowerCase();
        const newLevel = /\badvanced\b/.test(t) ? "Advanced"
                       : /\bbeginner\b/.test(t) ? "Beginner"
                       : /\bintermediate\b/.test(t) ? "Intermediate"
                       : null;
        if(newLevel) {
          const uniqueTopics = [];
          const seen = new Set();
          chatQueue.forEach(q => {
            const key = `${q.subject}|${q.topic}`;
            if(!seen.has(key)) { seen.add(key); uniqueTopics.push(q); }
          });
          const dupes = uniqueTopics.map(q => ({...q, level:newLevel}));
          const newQueue = [...chatQueue, ...dupes];
          setChatQueue(newQueue);
          setChatPhase("asking_more");
          const qSum = newQueue.map((q,i) => `  ${i+1}. ${q.subject} — ${q.topic} (${q.level})`).join("\n");
          setChat(m=>[...m,{role:"assistant",
            content:`✅ Added ${newLevel} versions for all ${uniqueTopics.length} topics!\n\n📋 Full list (${newQueue.length} worksheets):\n${qSum}\n\nGenerate all ${newQueue.length}, or add more?`,
            chips:["Generate All Now","Add More"]}]);
          setChatLoading(false);
          return;
        }
      }

      if(isDoneIntent(msg) && !isMoreIntent(msg)) {
        await generateQueuedWorksheets(chatQueue);
        setChatLoading(false);
        return;
      }

      const carried  = {grade:chatSlots.grade, subject:null, topic:null, level:null, theme:chatSlots.theme};
      const fromMsg  = extractSlotsFromText(msg);
      const newSlots = mergeSlots(carried, fromMsg);
      setChatSlots(newSlots);
      setChatPhase("collecting");
      await handleCollecting(msg, newSlots);
      setChatLoading(false);
      return;
    }

    if(isQueueDupeIntent(msg) && chatQueue.length > 0) {
      const t = msg.toLowerCase();
      const newLevel = /\badvance[d]?\b/.test(t) ? "Advanced"
                     : /\bbeginner\b|\beasy\b/.test(t) ? "Beginner"
                     : /\bintermediate\b|\bmedium\b/.test(t) ? "Intermediate" : null;
      if(newLevel) {
        const seen = new Set();
        const unique = chatQueue.filter(q=>{ const k=`${q.subject}|${q.topic}`; return seen.has(k)?false:(seen.add(k),true); });
        const dupes  = unique.map(q=>({...q,level:newLevel}));
        const newQueue = [...chatQueue,...dupes];
        setChatQueue(newQueue);
        setChatPhase("asking_more");
        const qSum = newQueue.map((q,i)=>`  ${i+1}. ${q.subject} — ${q.topic} (${q.level})`).join("\n");
        setChat(m=>[...m,{role:"assistant",
          content:`✅ Added ${newLevel} copies for all ${unique.length} topics!\n\n📋 Full list (${newQueue.length}):\n${qSum}\n\nGenerate all ${newQueue.length}, or add more?`,
          chips:["Generate All Now","Add More"]}]);
        setChatLoading(false);
        return;
      }
    }

    const extracted = extractSlotsFromText(msg);
    const merged    = mergeSlots(chatSlots, extracted);
    setChatSlots(merged);
    await handleCollecting(msg, merged);
    setChatLoading(false);
  };

  const handleCollecting = async(msg, slots)=>{

    const multiSpecs   = extractMultipleSpecs(msg);
    const allLevels    = extractAllLevels(msg);
    const complete     = multiSpecs.filter(sp=>sp.subject && sp.topic);
    const hasMultiLvl  = isMultiLevelForAll(msg) && allLevels.length >= 2;
    const unrecognised = multiSpecs._unrecognised || [];

    if(unrecognised.length > 0 && complete.length > 0) {
      const knownNames = complete.map(s=>s.topic).join(", ");
      const unknownList = unrecognised.map(u=>`"${u}"`).join(", ");
      setChatSlots({...slots, _pendingMulti: complete.map(sp=>({
        grade:  sp.grade  || slots.grade,
        subject:sp.subject,
        topic:  sp.topic,
        level:  sp.level  || null,
        theme:  sp.theme  || slots.theme || null,
      }))});
      setChatPhase("collecting");
      setChat(m=>[...m,{role:"assistant",
        content:`Got ${complete.length} topic${complete.length>1?"s":""} so far: ${knownNames} ✓\n\nI didn't recognise ${unknownList} — could you clarify? For example, is it a Hindi topic, a subject name, or something else?`,
        chips:["It's a Hindi topic","Skip it","English topic","Science topic"]}]);
      return;
    }
    if(unrecognised.length > 0 && complete.length === 0) {
      const unknownList = unrecognised.map(u=>`"${u}"`).join(", ");
      setChat(m=>[...m,{role:"assistant",
        content:`I didn't quite catch ${unknownList}. Could you tell me more — is this a Maths, English, Science, or Hindi topic? 😊`,
        chips:["Mathematics","English","Science/EVS","Hindi"]}]);
      return;
    }

    if(complete.length >= 1 && hasMultiLvl) {
      const baseGrade = complete.find(s=>s.grade)?.grade || slots.grade || null;
      const baseTheme = complete.find(s=>s.theme)?.theme || slots.theme || null;
      const resolved  = expandTopicsToLevels(complete, allLevels, baseGrade, baseTheme);
      const needsGrade = resolved.some(r=>!r.grade);
      if(needsGrade) {
        setChatSlots({...slots, _pendingMulti:resolved});
        setChat(m=>[...m,{role:"assistant",
          content:`Got ${complete.length} topic${complete.length>1?"s":""} × ${allLevels.length} levels = ${resolved.length} worksheets! Which grade? 🎓`,
          chips:["Grade 2","Grade 3"]}]);
        return;
      }
      const newQueue = [...chatQueue, ...resolved];
      setChatQueue(newQueue);
      setChatPhase("asking_more");
      setChatSlots({grade:resolved[0].grade,subject:null,topic:null,level:null,theme:resolved[0].theme||null});
      const qSum = newQueue.map((q,i)=>`  ${i+1}. ${q.subject} — ${q.topic} (${q.level})`).join("\n");
      setChat(m=>[...m,{role:"assistant",
        content:`🎉 ${complete.length} topic${complete.length>1?"s":""} × ${allLevels.length} levels = ${resolved.length} worksheets!\n\n📋 Queue:\n${qSum}\n\nGenerate all ${newQueue.length}, or add more?`,
        chips:["Generate All Now","Add More"]}]);
      return;
    }

    if(complete.length > 1) {
      const resolvedLevel = allLevels[0] || slots.level || null;
      const resolved = complete.map(sp=>({
        grade:   sp.grade   || slots.grade   || null,
        subject: sp.subject,
        topic:   sp.topic,
        level:   resolvedLevel,
        theme:   sp.theme   || slots.theme   || null,
      }));
      const needsGrade = resolved.some(r=>!r.grade);
      const needsLevel = resolved.some(r=>!r.level);
      if(needsGrade || needsLevel) {
        const ask = needsGrade ? "grade" : "level";
        const chips = ask==="grade" ? ["Grade 2","Grade 3"] : ["Beginner","Intermediate","Advanced"];
        setChatSlots({...slots, _pendingMulti:resolved});
        setChat(m=>[...m,{role:"assistant",
          content:`Got ${resolved.length} topics! Just one thing — what ${ask==="grade"?"grade":"difficulty level"}? 🎯`,
          chips}]);
        return;
      }
      const newQueue = [...chatQueue, ...resolved];
      setChatQueue(newQueue);
      setChatPhase("asking_more");
      setChatSlots({grade:resolved[0].grade,subject:null,topic:null,level:null,theme:resolved[0].theme||null});
      const qSum = newQueue.map((q,i)=>`  ${i+1}. ${q.subject} — ${q.topic} (${q.level})`).join("\n");
      setChat(m=>[...m,{role:"assistant",
        content:`🎉 Got ${resolved.length} worksheets!\n\n📋 Queue:\n${qSum}\n\nAdd more or generate all ${newQueue.length}?`,
        chips:["Add More","Generate All Now"]}]);
      return;
    }

    if(slots._pendingMulti) {
      const pending = slots._pendingMulti;
      const resolved = pending.map(sp=>({
        ...sp,
        grade: sp.grade || slots.grade || "Grade 2",
        level: sp.level || slots.level || "Intermediate",
      }));
      const newQueue = [...chatQueue,...resolved];
      setChatQueue(newQueue);
      setChatPhase("asking_more");
      setChatSlots({grade:resolved[0].grade,subject:null,topic:null,level:null,theme:resolved[0].theme||null});
      const qSum = newQueue.map((q,i)=>`  ${i+1}. ${q.subject} — ${q.topic} (${q.level})`).join("\n");
      setChat(m=>[...m,{role:"assistant",
        content:`✅ All ${resolved.length} added!\n\n📋 Queue:\n${qSum}\n\nAdd more or generate all ${newQueue.length}?`,
        chips:["Add More","Generate All Now"]}]);
      return;
    }

    const missing = [];
    if(!slots.grade)   missing.push("grade");
    if(!slots.subject) missing.push("subject");
    if(!slots.topic)   missing.push("topic");
    if(!slots.level)   missing.push("level");

    if(missing.length===0) {
      setChatPhase("asking_count");
      setChat(m=>[...m,{role:"assistant",
        content:`How many worksheets for ${slots.topic} (${slots.level})? 📄`,
        chips:["1","2","3"]}]);
      return;
    }

    const firstMissing = missing[0];

    const effectiveMissing = (firstMissing==="subject" && slots.topic)
      ? missing[1] || null  // skip subject, ask next thing
      : firstMissing;

    if(!effectiveMissing) {
      setChatPhase("asking_count");
      setChat(m=>[...m,{role:"assistant",
        content:`How many worksheets for ${slots.topic} (${slots.level})? 📄`,
        chips:["1","2","3"]}]);
      return;
    }

    const directQ = {
      grade:   {q:`Which grade? 🎓`, chips:["Grade 2","Grade 3"]},
      subject: {q:`Which subject? 📚`, chips:["English","Mathematics","Science/EVS","Hindi"]},
      topic:   {q:`What topic? 📖`, chips:[]},
      level:   {q:`What difficulty level? 🎯`, chips:["Beginner","Intermediate","Advanced"]},
    };

    const filledCtx = Object.entries(slots).filter(([k,v])=>v&&!["theme","_pendingMulti"].includes(k)).map(([k,v])=>v).join(", ");
    const ctxPrefix = filledCtx ? `Got it — ${filledCtx}! ` : "";

    if(firstMissing==="subject" && slots.topic) {
    }

    if(effectiveMissing==="topic" && slots.subject) {
      const gradeCtx = slots.grade ? ` for ${slots.grade}` : "";
      const NCERT_TOPICS = {
        "English":      ["Nouns","Verbs","Adjectives","Tenses","Reading Comprehension","Essay Writing","Active & Passive Voice","Direct & Indirect Speech","Prepositions","Conjunctions","Punctuation","Synonyms & Antonyms","Story Writing","Letter Writing","Idioms & Phrases"],
        "Mathematics":  ["Fractions","Multiplication Tables","Addition with Carrying","Subtraction with Borrowing","Place Value","Division","Large Numbers","Decimals","Geometry","Measurement","Time & Calendar","Money","Data Handling","Word Problems","Perimeter & Area"],
        "Science/EVS":  ["Plants","Animals & Habitats","Our Body & Senses","States of Matter","Food & Nutrition","Air & Water","Simple Machines","Electricity","Solar System","Ecosystems & Food Chains","Weather & Seasons","Transport & Communication"],
        "Hindi":        ["संज्ञा (Nouns)","क्रिया (Verbs)","विशेषण (Adjectives)","वचन (Singular/Plural)","पत्र लेखन","निबंध लेखन","मुहावरे","पठन बोध"],
      };
      const topicSuggestions = (NCERT_TOPICS[slots.subject]||[]).slice(0,4);
      setChat(m=>[...m,{role:"assistant",
        content:`${ctxPrefix}Which ${slots.subject} topic${gradeCtx}? 📖`,
        chips:topicSuggestions}]);
      return;
    }

    const dq = directQ[effectiveMissing];
    setChat(m=>[...m,{role:"assistant",
      content:`${ctxPrefix}${dq.q}`,
      chips:dq.chips}]);
  };

  const generateWeeklySummary=async()=>{
    setSummaryLoading(true);
    const doneData=done.slice(-20).map(d=>`${d.subject}/${d.topic}:${d.pct}%`).join(",")||"No practice yet";
    try{
      const raw=await callClaude('Return ONLY JSON: {"consistency":"X/7 days","improvements":["topic"],"weakAreas":["topic"],"focusNextWeek":["topic"],"motivationalNote":"1 sentence"}',`Grade:${grade}. Data:${doneData}. Stars:${stars}.`,500);
      const clean=raw.replace(/```json|```/g,"").trim();
      setWeeklySummary(JSON.parse(clean.slice(clean.indexOf("{"),clean.lastIndexOf("}")+1)));
    }catch{setWeeklySummary({consistency:"3/7 days",improvements:["Practice"],weakAreas:["Review needed"],focusNextWeek:["Any topic"],motivationalNote:"Keep up the great work! Every worksheet builds knowledge."});}
    setSummaryLoading(false);
  };

  const openWorksheetWithIntro=async(sub,t,lv,wsDataOverride)=>{
    setActiveWs({subject:sub,topic:t,level:lv});
    setAnswers({});setSubmitted(false);setScore(null);setCurrentQIdx(0);setWsTimeSpent(0);setWsStartTime(Date.now());
    track("ws_start", {subject:sub, topic:t, level:lv, grade:grade||"unknown"});
    try{
      const raw=await callClaude(`Return ONLY JSON:{"title":"${t}","emoji":"📚","explanation":"2-3 simple sentences","example":"One example","tip":"1 memory tip","readyPhrase":"Encouraging phrase"}`,`Topic:${t}, Subject:${sub}`,400);
      const clean=raw.replace(/```json|```/g,"").trim();
      setTopicIntroData(JSON.parse(clean.slice(clean.indexOf("{"),clean.lastIndexOf("}")+1)));
    }catch{setTopicIntroData({title:t,emoji:"📚",explanation:`Let's learn about ${t}!`,example:"We'll see examples in the worksheet.",tip:"Read each question carefully!",readyPhrase:"Let's go! 🚀"});}
    if(wsDataOverride)setWsData(wsDataOverride);
    else{setWsLoading(true);setWsData(null);generateWsData(sub,t,lv,theme).then(d=>{setWsData(d);setWsLoading(false);}).catch(()=>setWsLoading(false));}
    setShowTopicIntro(true);go("worksheet");
  };

  const preGenerateGrade=async(targetGrade)=>{
    setPregenRunning(true);
    const todo=[];
    Object.keys(TOPICS[targetGrade]||{}).forEach(sub=>(TOPICS[targetGrade][sub]||[]).slice(0,5).forEach(t=>['Beginner','Intermediate','Advanced'].forEach(lv=>{if(!getFromCache(targetGrade,sub,t,lv))todo.push({sub,t,lv});})));
    setPregenProg({done:0,total:todo.length,current:""});
    for(let i=0;i<todo.length;i++){
      const{sub,t,lv}=todo[i];
      setPregenProg(p=>({...p,done:i,current:`${sub} — ${t}`}));
      try{if(i>0)await new Promise(r=>setTimeout(r,1800));const ws=await generateWsData(sub,t,lv,theme);saveToCache(targetGrade,sub,t,lv,ws);}catch{}
    }
    setPregenRunning(false);setPregenProg(p=>({...p,done:todo.length,current:"✅ Done!"}));
  };

  const earnedBadges=useMemo(()=>BADGES.filter(b=>b.check(done,stars)),[done,stars]);
  const nextReward=REWARDS.find(r=>r.pts>stars);
  useEffect(()=>{
    const handler=(msg,src,line,col,err)=>{logError(err||{message:msg,stack:`${src}:${line}:${col}`},"onerror");return false;};
    const rejHandler=e=>logError(e.reason||{message:"Unhandled rejection"},"promise");
    window.addEventListener("error",handler);
    window.addEventListener("unhandledrejection",rejHandler);
    return()=>{window.removeEventListener("error",handler);window.removeEventListener("unhandledrejection",rejHandler);};
  },[logError]);
  const go=useCallback(s=>{setScreen(s);track("screen_view",{screen:s});}, [track]);
  const startListening=(onResult)=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Voice input not supported.");return;}
    const rec=new SR();rec.lang="en-IN";rec.interimResults=false;
    setListenActive(true);
    rec.onresult=e=>{onResult(e.results[0][0].transcript);setListenActive(false);};
    rec.onerror=()=>setListenActive(false);rec.onend=()=>setListenActive(false);
    rec.start();
  };
  const toggleDark=()=>setDarkMode(d=>!d);
  const dm=darkMode?{bg:"#0F0E17",card:"#1C1A2E",text:"#E8E6F0",sub:"#666",border:"#2A2840"}:{bg:"#F0EFFE",card:"#fff",text:"#333",sub:"#888",border:"#E8E6FF"};

  // ── ANALYTICS TRACKER ──
  const track = useCallback((event, data={}) => {
    const now = Date.now();
    const key  = `${event}|${data.subject||""}|${data.topic||""}`;
    setAnalytics(prev => {
      const updated = {
        ...prev,
        events: [...(prev.events||[]).slice(-500), {e:event, ...data, t:now}],
        counts: {...(prev.counts||{}), [key]:(prev.counts?.[key]||0)+1},
        lastSeen: {...(prev.lastSeen||{}), [event]:now},
      };
      try{ localStorage.setItem("practicenest_analytics", JSON.stringify(updated)); }catch{}
      return updated;
    });
  }, []);

  // ── CHILD SAFETY FILTER ──
  // Runs on every AI response before it's shown to a child
  const safetyCheck = useCallback(async (wsText) => {
    const BLOCKLIST = [
      /\bviolent\b|\bkill\b|\bblood\b|\bweapon\b|\bgun\b|\bbomb\b/i,
      /\bsexual\b|\bnaked\b|\bintimate\b/i,
      /\bhate\b.*\b(religion|caste|race)\b|\b(caste|religion)\b.*\bhate\b/i,
      /\bsuicide\b|\bself.harm\b/i,
    ];
    // Fast local check first
    const flagged = BLOCKLIST.find(rx => rx.test(wsText));
    if(flagged) return {safe:false, reason:"Local filter flagged inappropriate content."};
    // AI moderation for anything that passed local check (only for child-facing content)
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({
          model:"claude-haiku-4-5-20251001", max_tokens:60,
          messages:[{role:"user",content:`Is this educational worksheet content safe for children aged 4-12? Respond ONLY with JSON {"safe":true/false,"reason":"brief reason if unsafe"}.\n\nContent to check: ${wsText.slice(0,500)}`}]
        })
      });
      const d = await resp.json();
      const txt = d.content?.[0]?.text||'{"safe":true}';
      const clean = txt.slice(txt.indexOf('{'), txt.lastIndexOf('}')+1);
      return JSON.parse(clean);
    } catch { return {safe:true}; } // fail open — don't block on API error
  }, []);

  // ── ERROR LOGGER ──
  const logError = useCallback((error, context="unknown") => {
    const entry = {
      msg: error?.message || String(error),
      stack: error?.stack?.slice(0,300) || "",
      context,
      screen,
      grade: grade||"none",
      t: new Date().toISOString(),
    };
    setCrashLog(prev => {
      const updated = [entry, ...prev].slice(0,50); // keep last 50
      try{ localStorage.setItem("practicenest_crashes", JSON.stringify(updated)); }catch{}
      return updated;
    });
    // Track as analytics event
    track("error", {context, msg:entry.msg.slice(0,80)});
  }, [screen, grade, track]);

  const gc=grade?GRADES[grade]?.color:"#6C63FF";
  const ga=grade?GRADES[grade]?.accent:"#A855F7";

  /* ─────── CSS ─────── */
  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#F0EFFE;font-family:'Nunito',sans-serif}
    ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}
    .btn{cursor:pointer;border:none;font-family:'Nunito';font-weight:800;transition:all .18s}
    .btn:hover{transform:translateY(-1px);filter:brightness(1.05)}
    .btn:active{transform:scale(.98)}
    .card{background:#fff;border-radius:18px;box-shadow:0 3px 20px #00000010}
    .chip{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:50px;border:2px solid;font-size:13px;font-weight:700;cursor:pointer;font-family:'Nunito';transition:all .15s}
    .chip:hover{transform:scale(1.03)}
    @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}.confetti-piece{position:fixed;width:10px;height:10px;top:-10px;animation:confettiFall 3s ease-in forwards;z-index:9999;pointer-events:none;border-radius:2px}.slide-up{animation:slideUp .35s cubic-bezier(.16,1,.3,1)}.skeleton{background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}.skeleton-card{height:80px;border-radius:12px;margin-bottom:10px}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    @keyframes pop{0%{transform:scale(.8)}60%{transform:scale(1.08)}100%{transform:scale(1)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .fadeUp{animation:fadeUp .3s ease both}
    .pop{animation:pop .4s ease both}
    .spin{animation:spin 1.2s linear infinite;display:inline-block}
    .pulse{animation:pulse 1.5s ease infinite}
    @media print{.no-print{display:none!important}body{background:white}.card{box-shadow:none}img{max-width:100%!important;page-break-inside:avoid}h1,h2,h3{page-break-after:avoid}.ws-section{page-break-inside:avoid}@page{margin:1.5cm;size:A4}}
  `;
  const inp={width:"100%",padding:"11px 15px",borderRadius:12,border:"2px solid #E8E6FF",fontSize:14,fontFamily:"'Nunito'",outline:"none"};
  const Hdr=({title,back,actions})=>(
    <div className="no-print" style={{background:"#fff",boxShadow:"0 2px 16px #00000009",padding:"13px 18px",display:"flex",alignItems:"center",gap:10,position:"sticky",top:0,zIndex:99}}>
      {back&&<button className="btn" onClick={()=>go(back)} style={{background:"#F0EFFE",color:"#6C63FF",padding:"8px 15px",borderRadius:50,fontSize:14}}>← Back</button>}
      <span style={{fontFamily:"'Fredoka One'",fontSize:18,color:"#333",flex:1}}>{title}</span>
      {actions}
    </div>
  );
  const ST=({c,children})=><div style={{fontFamily:"'Fredoka One'",fontSize:16,color:c||"#6C63FF",margin:"16px 0 10px"}}>{children}</div>;

  /* ─────── WORKSHEET RENDERER ─────── */
  const renderWs=(wsObj, submittedMode=false, answersObj={})=>{
    if(!wsObj) return null;
    const lm=LM[activeWs?.level||"Beginner"];
    const setAns=(qid,val)=>{if(!submittedMode)setAnswers(a=>({...a,[qid]:val}));};
    const isCorrect=(q)=>{
      if(!submittedMode) return null;
      const a=answersObj[q.id]||answers[q.id];
      if(q.type==="mcq") return a===q.answer;
      if(q.type==="truefalse") return a===q.answer;
      if(q.type==="fill") return a?.trim().toLowerCase()===q.answer?.toLowerCase();
      return null;
    };

    return (
      <div style={{maxWidth:800,margin:"0 auto"}}>
        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${gc},${ga})`,borderRadius:20,padding:"22px 26px",marginBottom:16,color:"#fff",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:-10,top:-10,fontSize:100,opacity:.1}}>
            {THEMES.find(t=>t.id===theme)?.emoji||"📚"}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:11,opacity:.8,fontWeight:700,letterSpacing:1,marginBottom:4}}>🎒 PRACTICENEST · NCERT/CBSE</div>
              <div style={{fontFamily:"'Fredoka One'",fontSize:24,lineHeight:1.2,marginBottom:6}}>{wsObj.title}</div>
              <div style={{fontSize:13,opacity:.9}}>{wsObj.grade} · {wsObj.subject} · {wsObj.level}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{background:"rgba(255,255,255,.25)",borderRadius:12,padding:"10px 14px",textAlign:"center"}}>
                <div style={{fontSize:11,opacity:.8}}>Total Marks</div>
                <div style={{fontFamily:"'Fredoka One'",fontSize:26}}>{wsObj.total_marks||40}</div>
              </div>
              <div style={{background:"rgba(255,255,255,.2)",borderRadius:10,padding:"5px 12px",fontSize:12,textAlign:"center"}}>
                ⏱ {wsObj.time_suggested}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:14,marginTop:16,flexWrap:"wrap"}}>
            {["Name","Class","Date","Score"].map(f=>(
              <div key={f} style={{flex:1,minWidth:90}}>
                <div style={{fontSize:11,opacity:.7,marginBottom:2}}>{f}:</div>
                <div style={{borderBottom:"2px solid rgba(255,255,255,.5)",paddingBottom:3,fontSize:14,fontWeight:700,color:f==="Score"&&submittedMode?"#fff":"transparent"}}>
                  {f==="Score"&&submittedMode&&score?`${score.earned}/${score.total} (${score.pct}%)`:"."}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Picture for Picture Composition — picsum.photos seed-based, always loads */}
        {wsObj.picture_scene&&renderPictureScene()}

        {/* Passage for comprehension */}
        {wsObj.passage&&(
          <div style={{background:"linear-gradient(135deg,#FFF9E6,#FFFDE7)",border:"2px solid #F9CA24",borderRadius:16,padding:"18px 20px",marginBottom:16}}>
            <div style={{fontFamily:"'Fredoka One'",fontSize:17,color:"#D4A017",marginBottom:8}}>📜 {wsObj.passage.title}</div>
            <div style={{fontSize:15,color:"#444",lineHeight:1.9,whiteSpace:"pre-wrap"}}>{wsObj.passage.text}</div>
            <div style={{marginTop:10,fontSize:12,color:"#aaa"}}>Word count: ~{wsObj.passage.word_count}</div>
          </div>
        )}

        {/* Mascot + instructions */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div style={{background:"#FFF9E6",border:"2px dashed #F9CA24",borderRadius:14,padding:"12px 16px",display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:26}}>🦉</span>
            <div><div style={{fontWeight:800,color:"#D4A017",fontSize:12}}>Wise Owl says:</div><div style={{fontSize:13,color:"#555",marginTop:2,lineHeight:1.5}}>{wsObj.mascot_tip}</div></div>
          </div>
          <div style={{background:"#F0EFFE",border:"2px solid #C4B9FF",borderRadius:14,padding:"12px 16px"}}>
            <div style={{fontWeight:800,color:"#6C63FF",fontSize:12,marginBottom:4}}>📋 Instructions:</div>
            <div style={{fontSize:13,color:"#555",lineHeight:1.5}}>{wsObj.instructions}</div>
            <div style={{marginTop:6,display:"flex",gap:5,flexWrap:"wrap"}}>
              {[`${wsObj.total_marks}m`,wsObj.time_suggested,"15 Qs"].map(t=>(
                <span key={t} style={{background:"#6C63FF",color:"#fff",borderRadius:20,padding:"1px 9px",fontSize:11,fontWeight:700}}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Sections */}
        {wsObj.sections?.map((sec,si)=>(
          <div key={si} style={{marginBottom:20}}>
            <div style={{background:`linear-gradient(135deg,${gc}22,${gc}11)`,borderRadius:12,padding:"9px 16px",marginBottom:12,borderLeft:`4px solid ${gc}`}}>
              <span style={{fontFamily:"'Fredoka One'",fontSize:14,color:gc}}>Section {sec.section_label}: {sec.heading}</span>
            </div>
            {sec.questions?.map((q,qi)=>{
              const correct=isCorrect(q);
              const curAns=answers[q.id];
              const qbg=submittedMode?(correct===true?"#F0FFF8":correct===false?"#FFF5F5":"#FAFAFA"):"#fff";
              const qborder=submittedMode?(correct===true?"2px solid #00B894":correct===false?"2px solid #E74C3C":"2px solid transparent"):"2px solid transparent";
              return (
                <div key={q.id} className="card fadeUp" style={{padding:"14px 16px",marginBottom:10,background:qbg,border:qborder,animationDelay:`${qi*0.03}s`}}>
                  <div style={{display:"flex",gap:10}}>
                    <div style={{width:30,height:30,borderRadius:50,background:`linear-gradient(135deg,${gc},${ga})`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,flexShrink:0}}>{q.id}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,gap:8}}>
                        <div style={{fontWeight:700,fontSize:14,color:"#333",lineHeight:1.55,flex:1,whiteSpace:"pre-wrap"}}>{q.prompt}</div>
                        <span style={{background:lm.bg,color:lm.color,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:800,flexShrink:0,height:"fit-content"}}>[{q.marks}m]</span>
                      </div>

                      {/* Visual Maths Layouts */}
                      {q.layout==="column_sum"&&q.layout_nums&&(
                        <div style={{marginBottom:10}}>
                          <MathLayouts.columnSum nums={q.layout_nums} op={q.layout_op||"+"} ans={submittedMode?q.answer:""}/>
                        </div>
                      )}
                      {q.layout==="column_sub"&&q.layout_nums&&(
                        <div style={{marginBottom:10}}>
                          <MathLayouts.columnSum nums={q.layout_nums} op="−" ans={submittedMode?q.answer:""}/>
                        </div>
                      )}
                      {q.layout==="place_value"&&q.layout_value&&(
                        <div style={{marginBottom:10}}>
                          <MathLayouts.placeValueChart value={q.layout_value}/>
                        </div>
                      )}
                      {q.layout==="fraction_bar"&&(
                        <div style={{marginBottom:10}}>
                          <MathLayouts.fractionBar num={q.layout_num||1} den={q.layout_den||4}/>
                        </div>
                      )}
                      {q.layout==="number_line"&&(
                        <div style={{marginBottom:10}}>
                          <MathLayouts.numberLine min={q.layout_min||0} max={q.layout_max||10} marks={q.layout_marks||[]}/>
                        </div>
                      )}
                      {q.layout==="grid_mult"&&q.layout_a&&(
                        <div style={{marginBottom:10}}>
                          <MathLayouts.gridMult a={q.layout_a} b={q.layout_b}/>
                        </div>
                      )}

                      {/* Nursery activity types */}
                      {q.type==="nursery_colour"&&(
                        <div style={{background:"#FFF5FF",borderRadius:10,padding:10,marginTop:6}}>
                          <div style={{fontSize:11,color:"#FF6B9D",fontWeight:800,marginBottom:6}}>🎨 Choose colour:</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{["🔴 Red","🟠 Orange","🟡 Yellow","🟢 Green","🔵 Blue","🟣 Purple","🩷 Pink"].map(c=>(
                            <button key={c} className="btn" onClick={()=>setAns(q.id,c.split(" ")[1])} style={{padding:"4px 9px",borderRadius:20,fontSize:11,fontWeight:700,background:curAns===c.split(" ")[1]?"#FF9FF3":"#fff",border:`2px solid ${curAns===c.split(" ")[1]?"#FF69B4":"#FFD6F0"}`,color:curAns===c.split(" ")[1]?"#fff":"#555"}}>{c}</button>
                          ))}</div>
                        </div>
                      )}
                      {q.type==="nursery_count"&&(
                        <div style={{marginTop:8,textAlign:"center"}}>
                          <div style={{fontSize:34,marginBottom:8}}>{q.visual||"🍎🍎🍎"}</div>
                          <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap"}}>{Array.from({length:10},(_,i)=>i+1).map(n=>(
                            <button key={n} className="btn" onClick={()=>setAns(q.id,String(n))} style={{width:40,height:40,borderRadius:50,fontSize:17,fontWeight:900,background:curAns===String(n)?"#FF9FF3":"#FFF0FB",color:curAns===String(n)?"#fff":"#FF69B4",border:`2px solid ${curAns===String(n)?"#FF69B4":"#FFD6F0"}`}}>{n}</button>
                          ))}</div>
                        </div>
                      )}
                      {q.type==="nursery_match"&&(
                        <div style={{marginTop:6}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center"}}>
                            <div>{(q.left_col||[]).map((it,i)=><div key={i} style={{background:"#FFF0FB",borderRadius:8,padding:"6px 8px",marginBottom:4,fontSize:14,fontWeight:700,textAlign:"center",border:"2px solid #FF9FF3"}}>{it}</div>)}</div>
                            <div style={{fontSize:20,color:"#FF9FF3"}}>↔</div>
                            <div>{(q.right_col||[]).map((it,i)=><div key={i} style={{background:"#FFF0FB",borderRadius:8,padding:"6px 8px",marginBottom:4,fontSize:12,fontWeight:700,textAlign:"center",border:"2px solid #FFD6F0"}}>{it}</div>)}</div>
                          </div>
                          <input value={curAns||""} onChange={e=>setAns(q.id,e.target.value)} disabled={submittedMode} placeholder="Write matches here…" style={{...inp,marginTop:6,fontSize:12}}/>
                        </div>
                      )}
                      {(q.type==="nursery_trace"||q.type==="nursery_draw"||q.type==="nursery_tick"||q.type==="nursery_circle")&&(
                        <div style={{marginTop:6}}>
                          {[1,2,3].map(n=>(<div key={n} style={{position:"relative",height:40,marginBottom:4}}><div style={{position:"absolute",bottom:5,left:0,right:0,height:2,background:"#FFD6F0"}}/><div style={{position:"absolute",bottom:21,left:0,right:0,height:1,borderTop:"1.5px dashed #FFE8FA"}}/><div style={{position:"absolute",left:4,bottom:7,fontSize:10,color:"#ddd"}}>{n===1?"Trace…":"Practice…"}</div></div>))}
                          <input value={curAns||""} onChange={e=>setAns(q.id,e.target.value)} disabled={submittedMode} placeholder="Done! ✓" style={{...inp,fontSize:11,marginTop:2}}/>
                        </div>
                      )}
                      {/* MCQ */}
                      {q.type==="mcq"&&q.options&&(
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                          {q.options.map((opt,oi)=>{
                            const sel=curAns===opt;
                            const isC=submittedMode&&opt===q.answer;
                            const isW=submittedMode&&sel&&opt!==q.answer;
                            return(
                              <div key={oi} onClick={()=>setAns(q.id,opt)}
                                style={{padding:"9px 12px",borderRadius:11,border:`2px solid ${isC?"#00B894":isW?"#E74C3C":sel?gc:"#E8E6FF"}`,background:isC?"#D4EFDF":isW?"#FADBD8":sel?"#F0EFFE":"#fff",cursor:submittedMode?"default":"pointer",display:"flex",gap:7,alignItems:"center"}}>
                                <span style={{width:22,height:22,borderRadius:50,background:isC?"#00B894":isW?"#E74C3C":sel?gc:"#E8E6FF",color:isC||isW||sel?"#fff":"#888",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,flexShrink:0}}>
                                  {String.fromCharCode(65+oi)}
                                </span>
                                <span style={{fontSize:13,color:"#444",lineHeight:1.3}}>{opt.replace(/^[A-D]\.\s*/,"")}</span>
                                {isC&&<span style={{marginLeft:"auto",color:"#00B894"}}>✓</span>}
                                {isW&&<span style={{marginLeft:"auto",color:"#E74C3C"}}>✗</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* True/False */}
                      {q.type==="truefalse"&&(
                        <div style={{display:"flex",gap:10,marginTop:4}}>
                          {["true","false"].map(v=>{
                            const sel=curAns===v;
                            const isC=submittedMode&&v===q.answer;
                            const isW=submittedMode&&sel&&v!==q.answer;
                            return(
                              <button key={v} className="btn" onClick={()=>setAns(q.id,v)}
                                style={{flex:1,padding:"9px",borderRadius:11,border:`2px solid ${isC?"#00B894":isW?"#E74C3C":sel?gc:"#E8E6FF"}`,background:isC?"#D4EFDF":isW?"#FADBD8":sel?"#F0EFFE":"#fff",color:"#333",fontSize:14}}>
                                {v==="true"?"✅ True":"❌ False"}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Fill */}
                      {q.type==="fill"&&(
                        <div style={{marginTop:4}}>
                          <div style={{position:"relative"}}>
                            <input value={curAns||""} onChange={e=>setAns(q.id,e.target.value)} disabled={submittedMode}
                              placeholder="Write your answer…"
                              style={{...inp,paddingRight:44,borderColor:submittedMode&&correct===true?"#00B894":submittedMode&&correct===false?"#E74C3C":"#E8E6FF",background:submittedMode?"#FAFAFA":"#fff"}}/>
                            {!submittedMode&&<button className="btn" onClick={()=>startListening(t=>setAns(q.id,t))}
                              style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",width:28,height:28,borderRadius:50,background:listenActive?"#E74C3C":"#6C63FF",color:"#fff",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {listenActive?<span className="pulse" style={{width:8,height:8,borderRadius:50,background:"#fff",display:"block"}}/>:"🎤"}
                            </button>}
                          </div>
                          {submittedMode&&q.answer&&<div style={{marginTop:5,fontSize:13,color:"#00B894",fontWeight:700,background:"#F0FFF8",padding:"5px 10px",borderRadius:7}}>✓ {q.answer}</div>}
                        </div>
                      )}

                      {/* Find & Copy */}
                      {q.type==="find_copy"&&(
                        <div style={{marginTop:4}}>
                          <div style={{fontSize:12,color:"#888",marginBottom:4,fontStyle:"italic"}}>📍 Find it in the passage above and copy it below:</div>
                          <input value={curAns||""} onChange={e=>setAns(q.id,e.target.value)} disabled={submittedMode}
                            placeholder="Copy the word/phrase from the passage…" style={{...inp}}/>
                          {submittedMode&&q.answer&&<div style={{marginTop:5,fontSize:13,color:"#00B894",fontWeight:700,background:"#F0FFF8",padding:"5px 10px",borderRadius:7}}>✓ Expected: {q.answer}</div>}
                        </div>
                      )}

                      {/* Short / Calculate / Word problem */}
                      {["short","calculate","word_problem"].includes(q.type)&&(
                        <div style={{marginTop:4}}>
                          {q.type==="word_problem"&&<div style={{fontSize:12,color:"#888",marginBottom:5,background:"#F9F9FF",padding:"6px 10px",borderRadius:8,borderLeft:"3px solid #E8E6FF"}}>✏️ Show your working below</div>}
                          {q.type==="calculate"&&<div style={{fontSize:12,color:"#888",marginBottom:5,background:"#F9F9FF",padding:"6px 10px",borderRadius:8,borderLeft:"3px solid #E8E6FF"}}>✏️ Show all steps</div>}
                          <div style={{position:"relative"}}>
                            <textarea value={curAns||""} onChange={e=>setAns(q.id,e.target.value)} disabled={submittedMode}
                              placeholder={q.type==="word_problem"?"Answer + working… or 🎤 speak":"Write your answer… or 🎤 speak"}
                              style={{...inp,resize:"none",minHeight:q.type==="short"?68:52,paddingRight:44,background:submittedMode?"#FAFAFA":"#fff"}}/>
                            {!submittedMode&&<button className="btn" onClick={()=>startListening(t=>setAns(q.id,(curAns?curAns+" ":"")+t))}
                              style={{position:"absolute",right:8,bottom:8,width:28,height:28,borderRadius:50,background:listenActive?"#E74C3C":"#6C63FF",color:"#fff",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {listenActive?<span className="pulse" style={{width:8,height:8,borderRadius:50,background:"#fff",display:"block"}}/>:"🎤"}
                            </button>}
                          </div>
                          {submittedMode&&q.answer&&(
                            <div style={{marginTop:5,background:"#F0EFFE",borderRadius:8,padding:"7px 11px"}}>
                              <div style={{fontSize:11,fontWeight:800,color:"#6C63FF",marginBottom:3}}>💡 Sample answer:</div>
                              <div style={{fontSize:13,color:"#555",whiteSpace:"pre-wrap"}}>{q.answer}</div>
                              {q.working&&<div style={{fontSize:12,color:"#888",marginTop:4,fontStyle:"italic"}}>Working: {q.working}</div>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Picture Write */}
                      {q.type==="picture_write"&&(
                        <div style={{marginTop:4}}>
                          {/* Level-based scaffold */}
                          {q.sentence_starters&&q.sentence_starters.length>0&&activeWs?.level==="Beginner"&&(
                            <div style={{background:"#FFF9E6",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
                              <div style={{fontWeight:800,color:"#D4A017",fontSize:12,marginBottom:6}}>📝 Sentence Starters:</div>
                              {q.sentence_starters.map((s,i)=>(
                                <div key={i} style={{fontSize:13,color:"#555",padding:"3px 0",borderBottom:"1px dashed #F0E0A0"}}>{s}</div>
                              ))}
                            </div>
                          )}
                          {q.guide_questions&&activeWs?.level==="Intermediate"&&(
                            <div style={{background:"#F0EFFE",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
                              <div style={{fontWeight:800,color:"#6C63FF",fontSize:12,marginBottom:6}}>🗺️ Plan your answer:</div>
                              {q.guide_questions.map((gq,i)=>(
                                <div key={i} style={{fontSize:13,color:"#555",padding:"3px 0"}}>{i+1}. {gq}</div>
                              ))}
                            </div>
                          )}
                          {q.story_structure&&activeWs?.level==="Advanced"&&(
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                              {Object.entries(q.story_structure).map(([k,v])=>(
                                <div key={k} style={{background:"#F0EFFE",borderRadius:10,padding:"8px 10px"}}>
                                  <div style={{fontWeight:800,color:"#6C63FF",fontSize:11,textTransform:"uppercase",marginBottom:4}}>{k}</div>
                                  <div style={{fontSize:12,color:"#888"}}>{v}</div>
                                </div>
                              ))}
                            </div>
                          )}
                          {q.word_bank&&q.word_bank.length>0&&(activeWs?.level==="Beginner"||activeWs?.level==="Intermediate")&&(
                            <div style={{marginBottom:8}}>
                              <div style={{fontSize:12,fontWeight:800,color:"#D4A017",marginBottom:5}}>📚 Word Bank:</div>
                              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                                {q.word_bank.map(w=>(
                                  <span key={w} style={{background:"#fff",border:"2px solid #F9CA24",borderRadius:20,padding:"3px 12px",fontSize:13,fontWeight:700,color:"#555"}}>{w}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Writing lines */}
                          <textarea value={curAns||""} onChange={e=>setAns(q.id,e.target.value)} disabled={submittedMode}
                            placeholder="Write your composition here…"
                            style={{...inp,resize:"none",minHeight:180,lineHeight:2,background:submittedMode?"#FAFAFA":"#fff",backgroundImage:submittedMode?"none":"repeating-linear-gradient(transparent,transparent 31px,#E8E6FF 31px,#E8E6FF 32px)"}}/>
                          {submittedMode&&q.answer&&(
                            <div style={{marginTop:6,background:"#F0EFFE",borderRadius:8,padding:"8px 12px"}}>
                              <div style={{fontSize:11,fontWeight:800,color:"#6C63FF",marginBottom:4}}>💡 Sample composition:</div>
                              <div style={{fontSize:13,color:"#555",lineHeight:1.7}}>{q.answer}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Match */}
                      {q.type==="match"&&(
                        <div style={{background:"#F8F8FF",borderRadius:11,padding:12,marginTop:4}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:6,marginBottom:6}}>
                            <div style={{fontWeight:800,color:gc,fontSize:12}}>Column A</div>
                            <div/>
                            <div style={{fontWeight:800,color:gc,fontSize:12}}>Column B</div>
                          </div>
                          {(q.left_col||[]).map((l,li)=>(
                            <div key={li} style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,marginBottom:7,alignItems:"center"}}>
                              <div style={{background:"#F0EFFE",borderRadius:8,padding:"6px 10px",fontSize:13,fontWeight:600,color:"#333"}}>{li+1}. {l}</div>
                              <span style={{color:"#ccc",fontSize:16}}>→</span>
                              <div style={{background:submittedMode?"#E8F8F5":"#fff",border:"2px dashed #E8E6FF",borderRadius:8,padding:"6px 10px",fontSize:13,color:submittedMode?"#00B894":"#aaa"}}>
                                {submittedMode?(q.right_col||[])[li]||"_____":"_____"}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Classify */}
                      {q.type==="classify"&&(
                        <div style={{marginTop:4}}>
                          {q.items&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                            <div style={{fontSize:12,color:"#888",width:"100%",marginBottom:4}}>Sort these items:</div>
                            {q.items.map(item=><span key={item} style={{background:"#F0EFFE",borderRadius:20,padding:"4px 12px",fontSize:13,fontWeight:600,color:"#6C63FF"}}>{item}</span>)}
                          </div>}
                          {q.categories&&<div style={{display:"grid",gridTemplateColumns:`repeat(${q.categories.length},1fr)`,gap:8,marginBottom:8}}>
                            {q.categories.map(cat=>(
                              <div key={cat} style={{background:"#F5F3FF",borderRadius:10,padding:"8px",minHeight:50}}>
                                <div style={{fontWeight:800,fontSize:12,color:"#6C63FF",marginBottom:4}}>{cat}</div>
                                {submittedMode&&<div style={{fontSize:12,color:"#555"}}>{q.answer||""}</div>}
                              </div>
                            ))}
                          </div>}
                          <textarea value={curAns||""} onChange={e=>setAns(q.id,e.target.value)} disabled={submittedMode}
                            placeholder="Write items in each category…" style={{...inp,resize:"none",minHeight:60}}/>
                          {submittedMode&&q.answer&&<div style={{marginTop:5,background:"#F0FFF8",borderRadius:7,padding:"5px 10px",fontSize:13,color:"#2a9d5c",fontWeight:600}}>✓ {q.answer}</div>}
                        </div>
                      )}

                      {/* Explanation */}
                      {submittedMode&&q.explanation&&(
                        <div style={{marginTop:7,fontSize:12,color:"#888",fontStyle:"italic",borderLeft:"3px solid #E8E6FF",paddingLeft:9,lineHeight:1.5}}>📝 {q.explanation}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Fun facts */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          {[{icon:"💡",t:"Fun Fact!",tx:wsObj.fun_fact,bg:"#FFF9E6",tc:"#D4A017"},{icon:"🌟",t:"Did You Know?",tx:wsObj.did_you_know,bg:"#F0EFFE",tc:"#6C63FF"}].map(f=>(
            <div key={f.t} style={{background:f.bg,borderRadius:14,padding:14}}>
              <div style={{fontWeight:800,color:f.tc,marginBottom:5,fontSize:13}}>{f.icon} {f.t}</div>
              <div style={{fontSize:13,color:"#555",lineHeight:1.6}}>{f.tx}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ════════════════ SCREENS ════════════════ */

  if(showPricing) return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:darkMode?"#0F0E17":"#F0EFFE",minHeight:"100vh",transition:"background .3s",color:darkMode?"#E8E6F0":"#333"}}>
      <style>{CSS}</style>
      <div style={{background:"linear-gradient(135deg,#6C63FF,#E84393)",padding:"16px 20px",color:"#fff",textAlign:"center",position:"relative"}}>
        <button onClick={()=>setShowPricing(false)} style={{position:"absolute",left:16,top:14,background:"rgba(255,255,255,.2)",border:"none",color:"#fff",padding:"6px 14px",borderRadius:50,cursor:"pointer",fontSize:13}}>← Back</button>
        <div style={{fontFamily:"'Fredoka One'",fontSize:22}}>Choose Your Plan 🎓</div>
        <div style={{opacity:.8,fontSize:13,marginTop:4}}>India's smartest NCERT worksheet app</div>
      </div>
      <div style={{maxWidth:760,margin:"0 auto",padding:"20px 16px 60px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        {PLANS.map(plan=>(
          <div key={plan.id} className="card" style={{padding:"16px",border:`3px solid ${plan.popular?plan.color:"#E8E6FF"}`,position:"relative",transform:plan.popular?"scale(1.03)":"none"}}>
            {plan.popular&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:plan.color,color:"#fff",padding:"3px 14px",borderRadius:50,fontSize:10,fontWeight:900,whiteSpace:"nowrap"}}>⭐ POPULAR</div>}
            <div style={{textAlign:"center",marginBottom:12}}>
              <div style={{fontSize:32,marginBottom:4}}>{plan.emoji}</div>
              <div style={{fontFamily:"'Fredoka One'",fontSize:16,color:"#333"}}>{plan.name}</div>
              <div style={{fontFamily:"'Fredoka One'",fontSize:24,color:plan.color,marginTop:4}}>{plan.price===0?"Free":`₹${plan.price}/mo`}</div>
            </div>
            {plan.features.map((f,i)=><div key={i} style={{fontSize:11,color:"#555",padding:"2px 0",display:"flex",gap:4}}><span style={{color:plan.color,fontWeight:900}}>✓</span>{f}</div>)}
            <button className="btn" onClick={()=>{setUserPlan(plan.id);setShowPricing(false);}} style={{width:"100%",padding:"9px",marginTop:10,background:`linear-gradient(135deg,${plan.color},${plan.color}bb)`,color:"#fff",borderRadius:50,fontWeight:800,fontSize:12}}>{plan.cta}</button>
          </div>
        ))}
      </div>
    </div>
  );

  // ── CONFETTI OVERLAY (global) ──
  const CONFETTI_COLORS = ["#FF6B6B","#4FACFE","#43E97B","#F9CA24","#A855F7","#FF9FF3","#FD7B52","#00CEC9"];


  const renderPictureScene = () => {
    if(!wsObj?.picture_scene) return null;

          const sceneId = wsObj.picture_scene.scene_id || "park";
          const sceneObj = PICTURE_SCENES.find(s=>s.id===sceneId) || PICTURE_SCENES[0];
          const imgUrl = getImageUrl(sceneId, 700, 380);
          return (
            <div style={{marginBottom:16,borderRadius:16,overflow:"hidden",boxShadow:"0 4px 24px #00000018"}}>
              <div style={{position:"relative"}}>
                <img
                  src={imgUrl}
                  alt={wsObj.picture_scene.scene_label}
                  style={{width:"100%",height:300,objectFit:"cover",display:"block"}}
                />
                <div style={{position:"absolute",top:12,left:12,background:"rgba(0,0,0,.55)",borderRadius:30,padding:"5px 14px",color:"#fff",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",gap:6}}>
                  <span>{sceneObj.emoji}</span>
                  <span>{wsObj.picture_scene.scene_label}</span>
                </div>
                <div style={{position:"absolute",top:12,right:12,background:"#F9CA24",borderRadius:30,padding:"5px 14px",color:"#333",fontSize:12,fontWeight:800}}>
                  👀 Study this picture!
                </div>
              </div>
              <div style={{background:`linear-gradient(135deg,${gc},${ga})`,padding:"12px 18px",color:"#fff",display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:22,flexShrink:0}}>🖼️</span>
                <div>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:15,marginBottom:3}}>{wsObj.picture_scene.scene_label}</div>
                  <div style={{fontSize:13,opacity:.88,lineHeight:1.5}}>{wsObj.picture_scene.description}</div>
                </div>
              </div>
            </div>
          );

  };

  const renderAnalytics = () => {
const events = analytics.events||[];
          const counts = analytics.counts||{};
          // Subject popularity
          const subjectCounts = {};
          events.filter(e=>e.e==="ws_complete").forEach(e=>{
            subjectCounts[e.subject]=(subjectCounts[e.subject]||0)+1;
          });
          const topSubjects = Object.entries(subjectCounts).sort((a,b)=>b[1]-a[1]).slice(0,6);
          // Avg score by subject
          const subjectScores = {};
          events.filter(e=>e.e==="ws_complete"&&e.pct).forEach(e=>{
            if(!subjectScores[e.subject]) subjectScores[e.subject]={sum:0,n:0};
            subjectScores[e.subject].sum+=e.pct; subjectScores[e.subject].n+=1;
          });
          // Screen drop-off
          const screenViews = {};
          events.filter(e=>e.e==="screen_view").forEach(e=>{ screenViews[e.screen]=(screenViews[e.screen]||0)+1; });
          // Avg time on worksheet
          const completedWithTime = events.filter(e=>e.e==="ws_complete"&&e.timeSpent>0);
          const avgTime = completedWithTime.length ? Math.round(completedWithTime.reduce((a,b)=>a+b.timeSpent,0)/completedWithTime.length) : 0;
          // Topic popularity
          const topicCounts = {};
          events.filter(e=>e.e==="ws_complete").forEach(e=>{ topicCounts[e.topic]=(topicCounts[e.topic]||0)+1; });
          const topTopics = Object.entries(topicCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);

          return(
            <div style={{padding:"16px 0"}}>
              {/* Summary stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                {[
                  {label:"Worksheets Done",val:events.filter(e=>e.e==="ws_complete").length,icon:"📄"},
                  {label:"Avg Score",val:completedWithTime.length?`${Math.round(completedWithTime.reduce((a,b)=>a+(b.pct||0),0)/completedWithTime.length)}%`:"—",icon:"📊"},
                  {label:"Avg Time",val:avgTime?`${Math.floor(avgTime/60)}m ${avgTime%60}s`:"—",icon:"⏱️"},
                ].map(s=>(
                  <div key={s.label} className="card" style={{padding:"12px 8px",textAlign:"center"}}>
                    <div style={{fontSize:22}}>{s.icon}</div>
                    <div style={{fontFamily:"'Fredoka One'",fontSize:20,color:"#6C63FF"}}>{s.val}</div>
                    <div style={{fontSize:10,color:"#aaa",marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Top subjects */}
              {topSubjects.length>0&&(
                <div className="card" style={{padding:"14px 16px",marginBottom:12}}>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:14,color:"#333",marginBottom:10}}>🏆 Most Popular Subjects</div>
                  {topSubjects.map(([sub,count])=>{
                    const max = topSubjects[0][1];
                    const sc = SUBJECTS[sub]?.color||"#6C63FF";
                    const avg = subjectScores[sub] ? Math.round(subjectScores[sub].sum/subjectScores[sub].n) : null;
    return (
<div key={sub} style={{marginBottom:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                          <span style={{fontWeight:700,color:"#333"}}>{SUBJECTS[sub]?.icon} {sub}</span>
                          <span style={{color:"#aaa"}}>{count} done {avg?`· ${avg}% avg`:""}</span>
                        </div>
                        <div style={{height:6,background:"#F0EFFE",borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${Math.round((count/max)*100)}%`,background:sc,borderRadius:3,transition:"width .5s"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Top topics */}
              {topTopics.length>0&&(
                <div className="card" style={{padding:"14px 16px",marginBottom:12}}>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:14,color:"#333",marginBottom:8}}>📖 Top Topics</div>
                  {topTopics.map(([topic,count],i)=>(
                    <div key={topic} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<topTopics.length-1?"1px solid #F5F5F5":"none",fontSize:13}}>
                      <span style={{color:"#555",fontWeight:600}}>{i+1}. {topic}</span>
                      <span style={{color:"#6C63FF",fontWeight:800}}>{count}×</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Screen usage */}
              {Object.keys(screenViews).length>0&&(
                <div className="card" style={{padding:"14px 16px",marginBottom:12}}>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:14,color:"#333",marginBottom:8}}>📱 Screen Usage</div>
                  {Object.entries(screenViews).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([sc,n])=>(
                    <div key={sc} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,color:"#555"}}>
                      <span>{sc}</span><span style={{fontWeight:700,color:"#6C63FF"}}>{n} visits</span>
                    </div>
                  ))}
                </div>
              )}

              {events.length===0&&(
                <div style={{textAlign:"center",padding:"40px 0",color:"#ccc"}}>
                  <div style={{fontSize:40,marginBottom:8}}>📈</div>
                  <div>Analytics data appears here as you use the app</div>
                </div>
              )}

              {/* Export */}
              <button className="btn" onClick={()=>{
                const blob=new Blob([JSON.stringify({events,counts,screenViews,topSubjects,topTopics,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
                const url=URL.createObjectURL(blob);
                const a=document.createElement("a");a.href=url;a.download="practicenest_analytics.json";a.click();URL.revokeObjectURL(url);
              }} style={{width:"100%",padding:"11px",background:"#F0EFFE",color:"#6C63FF",borderRadius:12,fontWeight:800,fontSize:13}}>
                ⬇️ Export Analytics Data (JSON)
              </button>
            </div>
          
    );
  };

  const ConfettiOverlay = showConfetti ? (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"}}>
      {Array.from({length:60},(_,i)=>(
        <div key={i} className="confetti-piece" style={{
          left:`${Math.random()*100}%`,
          background:CONFETTI_COLORS[i%CONFETTI_COLORS.length],
          animationDelay:`${Math.random()*1.5}s`,
          animationDuration:`${2+Math.random()*1.5}s`,
          width:`${6+Math.random()*8}px`,
          height:`${6+Math.random()*8}px`,
          borderRadius:Math.random()>.5?"50%":"2px",
          transform:`rotate(${Math.random()*360}deg)`,
        }}/>
      ))}
    </div>
  ) : null;

  // ── MONTHLY CERTIFICATE MODAL ──
  const buildCertModal = () => {
    if(!showCertModal || !certMonth) return null;

    const monthDone = done.filter(w=>w.date&&w.date.includes(certMonth));
    const totalWs   = monthDone.length;
    const avgScore  = totalWs ? Math.round(monthDone.reduce((a,b)=>a+b.pct,0)/totalWs) : 0;
    const totalStars= monthDone.reduce((a,b)=>a+b.pts,0);
    const subjectSet= [...new Set(monthDone.map(w=>w.subject))];
    const today     = new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
    const gradeColor= grade?GRADES[grade]?.color:"#6C63FF";
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
        onClick={()=>setShowCertModal(false)}>
        <div onClick={e=>e.stopPropagation()}
          style={{background:"#fff",borderRadius:20,maxWidth:440,width:"100%",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,.4)"}}>
          {/* Certificate header */}
          <div style={{background:`linear-gradient(135deg,${gradeColor},#A855F7)`,padding:"28px 24px",textAlign:"center",color:"#fff",position:"relative"}}>
            <div style={{fontSize:48,marginBottom:6}}>🏆</div>
            <div style={{fontFamily:"'Fredoka One'",fontSize:13,letterSpacing:3,opacity:.8,marginBottom:4}}>PRACTICENEST · CERTIFICATE OF ACHIEVEMENT</div>
            <div style={{fontFamily:"'Fredoka One'",fontSize:26}}>Well Done, {kidName}!</div>
            <div style={{opacity:.85,fontSize:13,marginTop:4}}>{grade} · {certMonth}</div>
            {/* Decorative stars */}
            {["⭐","🌟","✨"].map((s,i)=><span key={i} style={{position:"absolute",fontSize:20,opacity:.4,top:i*20+10,left:i===0?10:i===2?10:"auto",right:i===1?10:"auto"}}>{s}</span>)}
          </div>
          {/* Stats */}
          <div style={{padding:"20px 24px"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16,textAlign:"center"}}>
              {[{val:totalWs,label:"Worksheets",icon:"📄"},{val:`${avgScore}%`,label:"Avg Score",icon:"📊"},{val:`${totalStars}⭐`,label:"Stars Earned",icon:"🌟"}].map(s=>(
                <div key={s.label} style={{background:"#F9F9FF",borderRadius:12,padding:"12px 8px"}}>
                  <div style={{fontSize:22}}>{s.icon}</div>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:20,color:gradeColor,marginTop:2}}>{s.val}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:1}}>{s.label}</div>
                </div>
              ))}
            </div>
            {subjectSet.length>0&&(
              <div style={{marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:800,color:"#aaa",marginBottom:6}}>SUBJECTS COVERED</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {subjectSet.map(s=><span key={s} style={{background:SUBJECTS[s]?.color+"22",color:SUBJECTS[s]?.color||"#6C63FF",borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700}}>{SUBJECTS[s]?.icon} {s}</span>)}
                </div>
              </div>
            )}
            <div style={{background:"#FFF9E6",borderRadius:10,padding:"10px 14px",border:"1.5px solid #F9CA2444",marginBottom:14,fontSize:12,color:"#D4A017",fontWeight:600,textAlign:"center",fontStyle:"italic"}}>
              "Every worksheet is a step towards excellence. Keep going, {kidName}! 🚀"
            </div>
            <div style={{fontSize:11,color:"#ccc",textAlign:"center",marginBottom:14}}>Issued by PracticeNest · {today}</div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn" onClick={()=>{
                const el=document.getElementById("cert-content");
                if(el&&window.print) window.print();
              }} style={{flex:1,background:`linear-gradient(135deg,${gradeColor},#A855F7)`,color:"#fff",padding:"11px",borderRadius:12,fontWeight:800,fontSize:13}}>
                ⬇️ Download Certificate
              </button>
              <button className="btn" onClick={()=>setShowCertModal(false)} style={{flex:1,background:"#F0F0F0",color:"#888",padding:"11px",borderRadius:12,fontWeight:700,fontSize:13}}>Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  
  };
  const CertificateModal = buildCertModal();

  // ── PARENT BOTTOM TAB BAR ──
  const ParentNav = (active) => (
    <div style={{position:"fixed",bottom:0,left:0,right:0,height:62,background:darkMode?"#1C1A2E":"#fff",
      borderTop:`1px solid ${darkMode?"#2A2840":"#EEE"}`,display:"flex",zIndex:100,
      boxShadow:"0 -2px 16px rgba(0,0,0,.08)",fontFamily:"'Nunito',sans-serif"}}>
      {[
        {id:"p-home",   icon:"🏠", label:"Home"},
        {id:"sched-agent",icon:"🗓️",label:"Schedule",fn:()=>{setSchedAgent(null);go("sched-agent");}},
        {id:"review",   icon:"📄", label:"Review",   fn:()=>{if(allPicked().length>0)buildReviewQueue();else go("review");}},
        {id:"chat",     icon:"💬", label:"Chat"},
        {id:"dashboard",icon:"📊", label:"Progress"},
      ].map(t=>{
        const isActive = active===t.id;
        const gc2 = grade?GRADES[grade]?.color||"#6C63FF":"#6C63FF";
        return(
          <button key={t.id} className="btn" onClick={t.fn||(()=>go(t.id))}
            style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              gap:2,background:"none",color:isActive?gc2:darkMode?"#666":"#aaa",
              borderTop:isActive?`3px solid ${gc2}`:"3px solid transparent",
              transition:"all .15s",paddingTop:4}}>
            <span style={{fontSize:20,lineHeight:1}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:isActive?800:600,lineHeight:1}}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );

  if(screen==="splash") return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"linear-gradient(135deg,#6C63FF,#FF6B6B)",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24,padding:24}}>
      <style>{CSS}</style>
      <div className="pop" style={{textAlign:"center",color:"#fff"}}>
        <img src="data:image/png;base64,/9j/4QCARXhpZgAATU0AKgAAAAgABAEAAAQAAAABAAAB7AEBAAQAAAABAAACHQEyAAIAAAAUAAAAPodpAAQAAAABAAAAUgAAAAAyMDI2OjAzOjI1IDEzOjMwOjUzAAABkAMAAgAAABQAAABkAAAAADIwMjY6MDM6MjUgMTM6Mjk6NTAA/+AAEEpGSUYAAQEAAAEAAQAA/+IB2ElDQ19QUk9GSUxFAAEBAAAByAAAAAAEMAAAbW50clJHQiBYWVogB+AAAQABAAAAAAAAYWNzcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAPbWAAEAAAAA0y0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJZGVzYwAAAPAAAAAkclhZWgAAARQAAAAUZ1hZWgAAASgAAAAUYlhZWgAAATwAAAAUd3RwdAAAAVAAAAAUclRSQwAAAWQAAAAoZ1RSQwAAAWQAAAAoYlRSQwAAAWQAAAAoY3BydAAAAYwAAAA8bWx1YwAAAAAAAAABAAAADGVuVVMAAAAIAAAAHABzAFIARwBCWFlaIAAAAAAAAG+iAAA49QAAA5BYWVogAAAAAAAAYpkAALeFAAAY2lhZWiAAAAAAAAAkoAAAD4QAALbPWFlaIAAAAAAAAPbWAAEAAAAA0y1wYXJhAAAAAAAEAAAAAmZmAADypwAADVkAABPQAAAKWwAAAAAAAAAAbWx1YwAAAAAAAAABAAAADGVuVVMAAAAgAAAAHABHAG8AbwBnAGwAZQAgAEkAbgBjAC4AIAAyADAAMQA2/9sAQwADAgIDAgIDAwMDBAMDBAUIBQUEBAUKBwcGCAwKDAwLCgsLDQ4SEA0OEQ4LCxAWEBETFBUVFQwPFxgWFBgSFBUU/9sAQwEDBAQFBAUJBQUJFA0LDRQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQU/8AAEQgCHQHsAwEiAAIRAQMRAf/EAB0AAQACAgMBAQAAAAAAAAAAAAAHCAUGAQQJAwL/xABkEAABAwMCAwQFBwQJDQsLBQABAAIDBAURBgcIEiETMUFRFCJhcYEJFTJCUpGxI3KhwRYzYnOCkrLR0xgkJTVDY2R0k7O0wtIXGTQ3RlN1g8Ph8SY2VFV2lJWio6TwKEdWZYX/xAAdAQEAAwEAAwEBAAAAAAAAAAAABQYHBAECAwgJ/8QASBEAAgEDAgMEBgcDCgUEAwAAAAECAwQRBSEGEjFBUWFxE4GRocHRFCIyQmKx8AcV4SMkM1JTgpKywvEWF0NyoiY0NURUY3P/2gAMAwEAAhEDEQA/APTVERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBFymCfBAcIueU+SYK8g4Rc4KYXgHCLnC4QBEReQERF4AREQBERAEREAREQBERAER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N0HQkeqAvNq17q7z6sfeIa/erVUfoFynocUggg52sI5XeqwYJB7lM/CVupre18Stj0pqPXN91bar/Zq4RxXqpEjYqiHs5GuZho6lvMOvmouHDFfT6LvvQxUO1prO7x08yz2OraLO8dnZvFV56Razhc3Xy3K+be7OWuPfncW23ds1VFpC+1DLda5n5pojJK8iTk7icNZ9w8grHudzePxWibm0b9IcdW7EDfUhu1DQ3No8CXRx5P8AGLlgduta3S67vbi2e41j5aWjNM+hpnfRhj5fW5R7eZpKwbiC3rVNQrycvqwSaXg+VPHreWSeouVW5qNv7KT9WxJ9yulNZbdU19bM2npKaN0ssrzgNaBklRrsxS12pay/bhXISwv1A5sNvpZCfyFDET2fTzccu/8AFalu7q+DcLXMG38Vwit+n6AtqtQV0kojaQMEU4JPf3Z9p9i3a1b02i83eksGjLTU6hig5Ip6qlxDRUcQwMmR30sDua0HOFGq1q0bZqMfrTWX3KPVZfROT38ku89YUakaGFH609/KPn4/kbvebiyz2uur5CAylgkndnya0u/UrL8AOkZdNcMWm62pbit1BJUX2c46kzyFzCf+rDFTLfytnbtxWW6gd/X96nhtMHnzTSBn61d+Pic2S2StlBoe4bgWaiqtP00Nrko4nOmdAYmNZyuEbTykY6g93irxwVQjCnVuZbZaXs/3O3TKc5UJcqy2+zw/3J4RadtzvHojd2jmqtGaptmo4ocCUUNQHviz3c7PpNz7QFuK1HKe6O1pxeGEREPAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAFU75QbePUm3mltFaY0zeDpqq1hd/m+ovceRJS07WguDHfVc4vaObvABxjvFsVHm+uxOlOIbQk+ltWUjpaYvE1NVQENnpJgCGyxuwcHqQQcggkEEFfCvCc6UoweG1szot5wp1ozqLMU90ef9FsNovRtDW3aos0mpbpHG+onrLjmqqahzRk4Ds5ccLR9D8Umh4uWmr6SDSkfMR2Qacs64HM0MHxxnC2PZ+e+6b311ttzT6ok1po7S7TTi7V0PJMydrgzsmuBPMAQ9pyT9DphTFerVpicuF0tlBXSHvZLTMkcffkL82XtB0bmpa6pzVpPDUlNrHqaa9WNvI3u1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Ze+H3T2jbrquj9Poqr0m1Xih9aEv5nOja1rj645SRjPhkLaq3hM2yrLnNWfMD6Zs7y+ekpaqWKnmP7qNrsFbXqXZnR2rNH27S9wssTrJbeQ0VNC90XoxY0taWOaQQQCR8UPBHukNyde6N3RsegdwG2i9uvME0tBebOHRSZjbl3bQnuBH1hgZWJ1BoHWm2N61Rq/a3UNnuFqrql1fdbDeGhzRK3PadnO05Z9b1XdykXb7h60Ptne33izWuU3YsMTa2tqpKmWNh72tLyeUH2LF3fhT20vV5qrlNY5YpKyV09XBTV00UFTI45c6SNrgCSeqAzu2u8Fq1vtrZ9V176fT8dbmJ8VXUNaxkwcWlrXnAcCR08wQt/BBAIOQfFR/rDYXQ+t9GW3SlyskYsNukbLS0lM8xCMjIwCOuDk588rfoomQRMijaGxsaGtaPAAYAQ8n6REQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREB+JoY6iMsljbIw97XtBB+BX7AAAAGAPAIiAIiIAiIgCIiAIiIAvy6Nj3Nc5rXFvUEjJHuX6RAEREAREQBfOKnigc50cTI3O6uLGgE+9fREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQH//2Q==" alt="PracticeNest" style={{width:150,height:150,objectFit:"contain",marginBottom:4,filter:"drop-shadow(0 6px 20px rgba(0,0,0,.3))"}} />
        <div style={{fontFamily:"'Fredoka One'",fontSize:42,color:"#fff",marginTop:6}}>PracticeNest</div>
        <div style={{opacity:.9,fontSize:15,marginTop:2,fontWeight:700}}>10 minutes a day. Real progress.</div>
      </div>
      <div style={{background:"rgba(255,255,255,.15)",borderRadius:16,padding:"14px 18px",maxWidth:390,width:"100%"}}>
        <div style={{color:"rgba(255,255,255,.7)",fontSize:11,fontWeight:800,letterSpacing:1,marginBottom:8}}>🤖 AI AGENTS</div>
        {[["📚","Curriculum","NCERT+K5+Olympiad"],["✏️","Worksheet","15Q+visual layouts"],["🔍","Review","Per-sheet approve/reject"],["🏆","Scoring","12 badges+points"]].map(([e,n,s])=>(
          <div key={n} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:16}}>{e}</span>
            <div style={{flex:1}}><div style={{color:"#fff",fontSize:13,fontWeight:700}}>{n}</div><div style={{color:"rgba(255,255,255,.6)",fontSize:11}}>{s}</div></div>
            <span style={{background:"#00B894",borderRadius:20,padding:"1px 9px",fontSize:11,color:"#fff",fontWeight:800}}>ON</span>
          </div>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,width:"100%",maxWidth:300}}>
        <button className="btn" onClick={()=>go("p-login")} style={{padding:"14px",borderRadius:14,background:"#fff",color:"#6C63FF",fontSize:16}}>👨‍👩‍👧 Parent Login</button>
        <button className="btn" onClick={()=>go("k-login")} style={{padding:"14px",borderRadius:14,background:"rgba(255,255,255,.2)",color:"#fff",border:"2px solid rgba(255,255,255,.4)",fontSize:16}}>🧒 Kid Login</button>
        <button className="btn" onClick={()=>setShowPricing(true)} style={{padding:"10px",borderRadius:14,background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.85)",fontSize:13,fontWeight:700}}>💰 Plans & Pricing</button>
      </div>
    </div>
  );

  if(screen==="p-login") return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"#F0EFFE",display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <style>{CSS}</style>
      <div className="card fadeUp" style={{padding:36,maxWidth:380,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:52}}>👨‍👩‍👧</div>
        <div style={{fontFamily:"'Fredoka One'",fontSize:26,color:"#333",margin:"8px 0"}}>PracticeNest Parent</div>
        <p style={{color:"#888",fontSize:14,marginBottom:22}}>10 minutes a day. Real progress.</p>
        <input style={inp} placeholder="Email address"/>
        <input type="password" style={{...inp,marginTop:10}} placeholder="Password"/>
        <button className="btn" onClick={()=>go("p-home")} style={{width:"100%",padding:14,borderRadius:12,background:"linear-gradient(135deg,#6C63FF,#A855F7)",color:"#fff",fontSize:16,marginTop:14}}>Sign In →</button>
        <button className="btn" onClick={()=>go("splash")} style={{background:"none",color:"#aaa",fontSize:14,padding:10,marginTop:6,width:"100%"}}>← Back</button>
      </div>
    </div>
  );

  if(screen==="p-home") {
    const today = new Date();
    const todayStr = today.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const gradeColor = grade ? GRADES[grade]?.color : "#6C63FF";

    const calendarMonth = today.getMonth();
    const calendarYear  = today.getFullYear();

    const schedMap = {};

    if(schedAgent?.days) {
      schedAgent.days.forEach(d => {
        let dateKey = null;
        if(d.date && /\d{4}-\d{2}-\d{2}/.test(d.date)) {
          dateKey = d.date;
        } else {
          const offset = (d.day||1) - 1;
          const dt = new Date(today);
          dt.setDate(dt.getDate() + offset);
          dateKey = dt.toLocaleDateString("en-CA");
        }
        if(dateKey) {
          if(!schedMap[dateKey]) schedMap[dateKey] = [];
          (d.items||[]).forEach(item => schedMap[dateKey].push({...item, status:"scheduled"}));
        }
      });
    }

    approved.forEach(item => {
      const key = todayStr;
      if(!schedMap[key]) schedMap[key] = [];
      const alreadyMapped = Object.values(schedMap).some(arr => arr.some(x=>x.subject===item.subject&&x.topic===item.topic));
      if(!alreadyMapped) schedMap[key].push({...item, status:"approved"});
    });

    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay  = new Date(calendarYear, calendarMonth + 1, 0);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = lastDay.getDate();

    const calCells = [];
    for(let i=0; i<startDow; i++) calCells.push(null); // empty prefix
    for(let d=1; d<=daysInMonth; d++) calCells.push(d);
    while(calCells.length % 7 !== 0) calCells.push(null); // empty suffix

    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];


    const getCellDate = (d) => {
      if(!d) return null;
      const dt = new Date(calendarYear, calendarMonth, d);
      return dt.toLocaleDateString("en-CA");
    };

    const selectedDateItems = calSelectedDay ? (schedMap[getCellDate(calSelectedDay)] || []) : [];

    const todayItems = schedMap[todayStr] || [];
    const totalScheduled = Object.values(schedMap).reduce((a,v)=>a+v.length,0);
    const unread = notifications.filter(n=>!n.read).length;

    return (
      <div style={{fontFamily:"'Nunito',sans-serif",background:"#F0EFFE",minHeight:"100vh"}}>
        <style>{CSS}</style>

        {/* ── TOP HEADER ── */}
        <div style={{background:`linear-gradient(135deg,${gradeColor||"#6C63FF"},#A855F7)`,padding:"16px 18px 20px",color:"#fff"}}>
          <div style={{maxWidth:720,margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div>
                <div style={{fontSize:11,opacity:.7,letterSpacing:1,fontWeight:800}}>PRACTICENEST · PARENT DASHBOARD</div>
                <div style={{fontFamily:"'Fredoka One'",fontSize:24,marginTop:2}}>
                  Good {today.getHours()<12?"Morning":"Afternoon"}! 👋
                </div>
                {grade&&<div style={{fontSize:12,opacity:.8,marginTop:1}}>{grade} · {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button className="btn" onClick={()=>setDarkMode(d=>!d)} title="Toggle dark mode"
                  style={{width:34,height:34,borderRadius:50,background:"rgba(255,255,255,.2)",color:"#fff",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer",flexShrink:0}}>
                  {darkMode?"☀️":"🌙"}
                </button>
                <div style={{position:"relative",cursor:"pointer"}} onClick={()=>setShowNotif(s=>!s)}>
                  <div style={{width:36,height:36,borderRadius:50,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🔔</div>
                  {unread>0&&<span style={{position:"absolute",top:-2,right:-2,background:"#E74C3C",color:"#fff",borderRadius:50,width:16,height:16,fontSize:9,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>{unread}</span>}
                </div>
                <button className="btn" onClick={()=>go("splash")} style={{background:"rgba(255,255,255,.2)",color:"#fff",padding:"6px 12px",borderRadius:50,fontSize:12}}>Exit</button>
              </div>
            </div>
            {/* Stats row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[
                {icon:"🔥",val:`${streak}d`,label:"Streak"},
                {icon:"📋",val:totalScheduled,label:"Scheduled"},
                {icon:"✅",val:approved.length,label:"Approved"},
                {icon:"⭐",val:stars,label:"Stars"},
              ].map(s=>(
                <div key={s.label} style={{background:"rgba(255,255,255,.18)",borderRadius:12,padding:"10px 6px",textAlign:"center"}}>
                  <div style={{fontSize:16}}>{s.icon}</div>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:20,color:"#fff"}}>{s.val}</div>
                  <div style={{fontSize:10,opacity:.75,color:"#fff",fontWeight:700}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Notification dropdown */}
        {showNotif&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:200}} onClick={()=>setShowNotif(false)}>
            <div style={{position:"absolute",top:110,right:18,width:290,background:"#fff",borderRadius:14,boxShadow:"0 8px 40px #00000022",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
              <div style={{padding:"10px 14px",borderBottom:"1px solid #F0F0F0",fontWeight:800,color:"#333",display:"flex",justifyContent:"space-between",fontSize:13}}>
                <span>🔔 Notifications</span>
                <button onClick={()=>setNotifications(n=>n.map(x=>({...x,read:true})))} style={{background:"none",border:"none",fontSize:11,color:"#6C63FF",cursor:"pointer",fontWeight:700}}>Mark all read</button>
              </div>
              {notifications.slice(0,5).map(n=>(
                <div key={n.id} onClick={()=>setNotifications(ns=>ns.map(x=>x.id===n.id?{...x,read:true}:x))}
                  style={{padding:"10px 14px",borderBottom:"1px solid #F9F9F9",background:n.read?"#fff":"#F5F3FF",cursor:"pointer",display:"flex",gap:8}}>
                  <span style={{fontSize:18,flexShrink:0}}>{n.icon}</span>
                  <div><div style={{fontSize:12,color:"#333",fontWeight:n.read?600:800}}>{n.text}</div><div style={{fontSize:10,color:"#aaa",marginTop:1}}>{n.time}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{maxWidth:720,margin:"0 auto",padding:"16px 16px 80px"}}>

          {/* ════════════════════════════════════════
              CALENDAR SECTION
          ════════════════════════════════════════ */}
          <div className="card" style={{padding:"16px",marginBottom:16,overflow:"hidden",background:darkMode?"#1C1A2E":"#fff",border:darkMode?"1px solid #2A2840":"none"}}>
            {/* Calendar header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontFamily:"'Fredoka One'",fontSize:17,color:"#333"}}>
                📅 {monthNames[calendarMonth]} {calendarYear}
              </div>
              <div style={{display:"flex",gap:6}}>
                <button className="btn" onClick={()=>{setSchedAgent(null);go("sched-agent");}}
                  style={{background:`linear-gradient(135deg,${gradeColor||"#6C63FF"},#A855F7)`,color:"#fff",padding:"7px 14px",borderRadius:50,fontSize:12,fontWeight:800}}>
                  ➕ Add Schedule
                </button>
              </div>
            </div>

            {/* Legend */}
            <div style={{display:"flex",gap:12,marginBottom:10,flexWrap:"wrap"}}>
              {[
                {color:"#6C63FF",label:"Scheduled"},
                {color:"#00B894",label:"Approved"},
                {color:"#F39C12",label:"Today"},
              ].map(l=>(
                <div key={l.label} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#888"}}>
                  <div style={{width:10,height:10,borderRadius:3,background:l.color,flexShrink:0}}/>
                  {l.label}
                </div>
              ))}
            </div>

            {/* Day-of-week headers */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
              {dayNames.map(d=>(
                <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:800,color:"#aaa",padding:"2px 0"}}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {calCells.map((d,idx)=>{
                if(!d) return <div key={idx}/>;
                const dateStr = getCellDate(d);
                const cellItems = schedMap[dateStr] || [];
                const isToday = dateStr === todayStr;
                const isSelected = calSelectedDay === d;
                const hasItems = cellItems.length > 0;
                const hasSched = cellItems.some(x=>x.status==="scheduled");
                const hasApproved = cellItems.some(x=>x.status==="approved");

                return(
                  <div key={idx} onClick={()=>setCalSelectedDay(isSelected?null:d)}
                    style={{
                      borderRadius:8,padding:"4px 2px",cursor:hasItems?"pointer":"default",
                      background:isSelected?"#6C63FF":isToday?"#FFF9E6":hasItems?"#F5F3FF":"transparent",
                      border:`2px solid ${isSelected?"#6C63FF":isToday?"#F9CA24":hasItems?"#E8E6FF":"transparent"}`,
                      minHeight:48,position:"relative",transition:"all .15s"
                    }}>
                    {/* Day number */}
                    <div style={{textAlign:"center",fontSize:12,fontWeight:isToday||isSelected?900:600,
                      color:isSelected?"#fff":isToday?"#D4A017":"#333",marginBottom:2}}>
                      {d}
                    </div>
                    {/* Dot indicators */}
                    {hasItems&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:2,justifyContent:"center",padding:"0 2px"}}>
                        {cellItems.slice(0,4).map((item,ii)=>(
                          <div key={ii} style={{
                            width:7,height:7,borderRadius:50,flexShrink:0,
                            background:isSelected?"rgba(255,255,255,.8)":
                              item.status==="approved"?"#00B894":
                              SUBJECTS[item.subject]?.color||"#6C63FF"
                          }}/>
                        ))}
                        {cellItems.length>4&&(
                          <div style={{fontSize:8,color:isSelected?"rgba(255,255,255,.8)":"#aaa",fontWeight:700,lineHeight:"7px"}}>+{cellItems.length-4}</div>
                        )}
                      </div>
                    )}
                    {/* Today indicator */}
                    {isToday&&!isSelected&&(
                      <div style={{position:"absolute",top:2,right:3,width:5,height:5,borderRadius:50,background:"#F9CA24"}}/>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected day detail panel */}
            {calSelectedDay&&(
              <div className="fadeUp" style={{marginTop:14,borderTop:"1.5px solid #F0EFFE",paddingTop:12}}>
                <div style={{fontFamily:"'Fredoka One'",fontSize:15,color:"#333",marginBottom:8}}>
                  📋 {monthNames[calendarMonth]} {calSelectedDay} — {selectedDateItems.length} worksheet{selectedDateItems.length!==1?"s":""}
                </div>
                {selectedDateItems.length===0?(
                  <div style={{textAlign:"center",padding:"12px 0",color:"#ccc",fontSize:13}}>
                    No worksheets scheduled for this day.
                    <div style={{marginTop:8}}>
                      <button className="btn" onClick={()=>{setSchedAgent(null);go("sched-agent");}}
                        style={{background:"#F0EFFE",color:"#6C63FF",padding:"7px 14px",borderRadius:50,fontSize:12,fontWeight:700}}>
                        ➕ Schedule for this day
                      </button>
                    </div>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {selectedDateItems.map((item,i)=>{
                      const sc = SUBJECTS[item.subject]?.color||"#6C63FF";
                      const lm = LM[item.level]||LM.Intermediate;
                      return(
                        <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 10px",background:"#F9F9FF",borderRadius:10,border:`1.5px solid ${sc}22`}}>
                          <div style={{width:32,height:32,borderRadius:50,background:`linear-gradient(135deg,${sc},${sc}bb)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                            {SUBJECTS[item.subject]?.icon||"📄"}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:800,fontSize:13,color:"#333"}}>{item.topic}</div>
                            <div style={{fontSize:11,color:"#888",marginTop:1}}>{item.subject} · <span style={{color:lm.color,fontWeight:700}}>{item.level}</span></div>
                          </div>
                          <span style={{
                            background:item.status==="approved"?"#00B89422":"#6C63FF22",
                            color:item.status==="approved"?"#00B894":"#6C63FF",
                            borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:800
                          }}>{item.status==="approved"?"✅ Approved":"📋 Scheduled"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ════════════════ TODAY'S WORKSHEETS ════════════════ */}
          <div className="card" style={{padding:"14px 16px",marginBottom:14,borderTop:"4px solid #6C63FF"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:"'Fredoka One'",fontSize:15,color:"#333"}}>☀️ Today's Worksheets</div>
              <button className="btn" onClick={()=>{setSchedAgent(null);go("sched-agent");}}
                style={{background:"#6C63FF22",color:"#6C63FF",padding:"5px 14px",borderRadius:50,fontSize:12,border:"2px solid #6C63FF33",display:"flex",alignItems:"center",gap:4}}>
                ✏️ Edit
              </button>
            </div>
            {todayItems.length===0&&approved.length===0?(
              <div style={{textAlign:"center",padding:"16px 0",color:"#ccc"}}>
                <div style={{fontSize:32,marginBottom:6}}>📭</div>
                <div style={{fontSize:13}}>No worksheets for today yet</div>
                <button className="btn" onClick={()=>go("builder")} style={{marginTop:10,background:"#6C63FF",color:"#fff",padding:"8px 18px",borderRadius:50,fontSize:13}}>Build Schedule →</button>
              </div>
            ):(
              (todayItems.length>0?todayItems:approved).map((item,i)=>{
                const sc=SUBJECTS[item.subject]?.color||"#6C63FF";
                const lm=LM[item.level]||LM.Intermediate;
                const isDone=done.some(d=>d.subject===item.subject&&d.topic===item.topic&&d.level===item.level);
                const doneData=done.find(d=>d.subject===item.subject&&d.topic===item.topic&&d.level===item.level);
                const listLen=(todayItems.length>0?todayItems:approved).length;
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<listLen-1?"1px solid #F5F5F5":"none"}}>
                    <div style={{width:34,height:34,borderRadius:50,background:isDone?"#00B894":`linear-gradient(135deg,${sc},${sc}bb)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,color:"#fff"}}>
                      {isDone?"✓":SUBJECTS[item.subject]?.icon||"📄"}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800,fontSize:13,color:isDone?"#aaa":"#333",textDecoration:isDone?"line-through":"none"}}>{item.topic}</div>
                      <div style={{fontSize:11,color:"#aaa"}}>{item.subject} · <span style={{color:lm.color,fontWeight:700}}>{lm.emoji} {item.level}</span></div>
                    </div>
                    {isDone
                      ?<span style={{fontWeight:900,color:doneData?.pct>=80?"#00B894":doneData?.pct>=50?"#F39C12":"#E74C3C",fontSize:13}}>{doneData?.pct}%</span>
                      :<button className="btn" onClick={()=>{setEditModalItem({...item,dayIdx:0,itemIdx:i});setEditMoveDate("");}}
                          style={{background:"#F0F0F0",color:"#888",borderRadius:50,padding:"3px 11px",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:3}}>
                          ⋯
                        </button>
                    }
                  </div>
                );
              })
            )}
          </div>

          {/* ════════════════ EDIT WORKSHEET MODAL ════════════════ */}
          {editModalItem&&(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 0 0 0"}}
              onClick={()=>setEditModalItem(null)}>
              <div className="card pop" style={{width:"100%",maxWidth:520,borderRadius:"20px 20px 0 0",padding:"20px 20px 36px",background:"#fff"}}
                onClick={e=>e.stopPropagation()}>

                {/* Handle bar */}
                <div style={{width:40,height:4,background:"#E0E0E0",borderRadius:2,margin:"0 auto 16px"}}/>

                {/* Header */}
                <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:18}}>
                  <div style={{width:40,height:40,borderRadius:50,background:`linear-gradient(135deg,${SUBJECTS[editModalItem.subject]?.color||"#6C63FF"},${SUBJECTS[editModalItem.subject]?.color||"#6C63FF"}bb)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                    {SUBJECTS[editModalItem.subject]?.icon||"📄"}
                  </div>
                  <div>
                    <div style={{fontWeight:900,fontSize:15,color:"#333"}}>{editModalItem.topic}</div>
                    <div style={{fontSize:12,color:"#888"}}>{editModalItem.subject} · {editModalItem.level}</div>
                  </div>
                </div>

                <div style={{fontSize:12,fontWeight:800,color:"#aaa",letterSpacing:.5,marginBottom:10}}>WHAT WOULD YOU LIKE TO DO?</div>

                <div style={{display:"flex",flexDirection:"column",gap:0,borderRadius:14,overflow:"hidden",border:"1.5px solid #F0F0F0"}}>

                  {/* Option 1 — Move to Next Week (+7 days) */}
                  <button className="btn" onClick={()=>{
                    // Calculate the date exactly 7 days from the item's current scheduled date
                    const currentDay = schedAgent?.days?.[editModalItem.dayIdx||0];
                    let baseDateStr = currentDay?.date;
                    // If baseDateStr is a real YYYY-MM-DD date, use it; else use today
                    let baseDate;
                    if(baseDateStr && /\d{4}-\d{2}-\d{2}/.test(baseDateStr)){
                      baseDate = new Date(baseDateStr + "T00:00:00");
                    } else {
                      // Approximate: day index offset from today
                      baseDate = new Date();
                      baseDate.setDate(baseDate.getDate() + (editModalItem.dayIdx||0));
                    }
                    // Add exactly 7 days
                    const nextWeekDate = new Date(baseDate);
                    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
                    const nextWeekStr = nextWeekDate.toLocaleDateString("en-CA"); // YYYY-MM-DD
                    const nextWeekLabel = nextWeekDate.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});

                    setSchedAgent(prev=>{
                      const prev2 = prev || {phase:"picking_topics",grade,schedType:"custom",days:[],currentDayIdx:0,weekTopics:[]};
                      const days = [...prev2.days];
                      // Remove from current day
                      const fromDay = days[editModalItem.dayIdx||0];
                      if(fromDay){
                        days[editModalItem.dayIdx||0] = {...fromDay, items: fromDay.items.filter((_,j)=>j!==editModalItem.itemIdx)};
                      }
                      // Find or create the +7 day slot
                      let targetIdx = days.findIndex(d => d.date === nextWeekStr);
                      if(targetIdx < 0){
                        days.push({day: days.length+1, date: nextWeekStr, items:[]});
                        targetIdx = days.length - 1;
                      }
                      days[targetIdx] = {...days[targetIdx], items:[...days[targetIdx].items, {subject:editModalItem.subject, topic:editModalItem.topic, level:editModalItem.level}]};
                      return {...prev2, days};
                    });
                    setNotifications(n=>[{id:Date.now(),icon:"📅",text:`"${editModalItem.topic}" moved to next week (${nextWeekLabel})`,time:"Just now",read:false},...n]);
                    setEditModalItem(null);
                  }}
                    style={{background:"#fff",padding:"16px 18px",textAlign:"left",display:"flex",alignItems:"center",gap:14,borderBottom:"1px solid #F5F5F5",borderRadius:0}}>
                    <div style={{width:40,height:40,borderRadius:50,background:"#E8F4FD",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📅</div>
                    <div>
                      <div style={{fontWeight:800,color:"#333",fontSize:14}}>Move to next week</div>
                      <div style={{fontSize:12,color:"#888",marginTop:2}}>Reschedule exactly 7 days later — shows on calendar</div>
                    </div>
                    <span style={{marginLeft:"auto",color:"#ccc",fontSize:18}}>›</span>
                  </button>

                  {/* Option 2 — Move to custom date */}
                  <div style={{background:"#fff",padding:"14px 18px",borderBottom:"1px solid #F5F5F5"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:editMoveDate?"10px":"0"}}>
                      <div style={{width:40,height:40,borderRadius:50,background:"#EEF0FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🗓️</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,color:"#333",fontSize:14}}>Move to a specific date</div>
                        <div style={{fontSize:12,color:"#888",marginTop:2}}>Pick any date on the calendar</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginTop:10}}>
                      <input type="date" value={editMoveDate} onChange={e=>setEditMoveDate(e.target.value)}
                        style={{flex:1,padding:"9px 12px",borderRadius:10,border:"2px solid #E8E6FF",fontFamily:"'Nunito'",fontSize:13,outline:"none"}}/>
                      <button className="btn" disabled={!editMoveDate} onClick={()=>{
                        if(!editMoveDate) return;
                        // Add to schedAgent on chosen date
                        setSchedAgent(prev=>{
                          const prev2 = prev || {phase:"picking_topics",grade,schedType:"custom",days:[],currentDayIdx:0,weekTopics:[]};
                          const days=[...prev2.days];
                          // Remove from current day
                          if(days[editModalItem.dayIdx||0]){
                            days[editModalItem.dayIdx||0]={...days[editModalItem.dayIdx||0],items:days[editModalItem.dayIdx||0].items.filter((_,j)=>j!==editModalItem.itemIdx)};
                          }
                          // Find or create slot for chosen date
                          let targetIdx = days.findIndex(d=>d.date===editMoveDate);
                          if(targetIdx<0){
                            days.push({day:days.length+1,date:editMoveDate,items:[]});
                            targetIdx=days.length-1;
                          }
                          days[targetIdx]={...days[targetIdx],items:[...days[targetIdx].items,{subject:editModalItem.subject,topic:editModalItem.topic,level:editModalItem.level}]};
                          return {...prev2,days};
                        });
                        setNotifications(n=>[{id:Date.now(),icon:"🗓️",text:`"${editModalItem.topic}" moved to ${new Date(editMoveDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}`,time:"Just now",read:false},...n]);
                        setEditModalItem(null);
                      }}
                        style={{background:editMoveDate?"#6C63FF":"#E8E6FF",color:editMoveDate?"#fff":"#aaa",padding:"9px 18px",borderRadius:50,fontWeight:800,fontSize:13}}>
                        Move →
                      </button>
                    </div>
                  </div>

                  {/* Option 3 — Delete */}
                  <button className="btn" onClick={()=>{
                    if(schedAgent?.days){
                      setSchedAgent(prev=>{
                        const days=[...prev.days];
                        const fromDay=prev.days[editModalItem.dayIdx||0];
                        days[editModalItem.dayIdx||0]={...fromDay,items:fromDay.items.filter((_,j)=>j!==editModalItem.itemIdx)};
                        return {...prev,days};
                      });
                    } else {
                      setApproved(prev=>prev.filter((_,j)=>j!==editModalItem.itemIdx));
                    }
                    setNotifications(n=>[{id:Date.now(),icon:"🗑️",text:`"${editModalItem.topic}" removed from schedule`,time:"Just now",read:false},...n]);
                    setEditModalItem(null);
                  }}
                    style={{background:"#FFF5F5",padding:"16px 18px",textAlign:"left",display:"flex",alignItems:"center",gap:14,borderBottom:"1px solid #F5F5F5",borderRadius:0}}>
                    <div style={{width:40,height:40,borderRadius:50,background:"#FDEDED",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🗑️</div>
                    <div>
                      <div style={{fontWeight:800,color:"#E74C3C",fontSize:14}}>Delete worksheet</div>
                      <div style={{fontSize:12,color:"#aaa",marginTop:2}}>Remove from today's schedule</div>
                    </div>
                    <span style={{marginLeft:"auto",color:"#E74C3C",fontSize:18}}>›</span>
                  </button>

                  {/* Option 4 — Add more */}
                  <button className="btn" onClick={()=>{setEditModalItem(null);setSchedAgent(prev=>({...(prev||{phase:"picking_topics",grade,schedType:"daily",days:[{day:1,date:"Day 1",items:[]}],currentDayIdx:0,weekTopics:[]}),phase:"picking_topics"}));go("sched-agent");}}
                    style={{background:"#F0FFF8",padding:"16px 18px",textAlign:"left",display:"flex",alignItems:"center",gap:14,borderRadius:0}}>
                    <div style={{width:40,height:40,borderRadius:50,background:"#D4EFDF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>➕</div>
                    <div>
                      <div style={{fontWeight:800,color:"#00B894",fontSize:14}}>Add more worksheets</div>
                      <div style={{fontSize:12,color:"#aaa",marginTop:2}}>Go to scheduling agent to add topics</div>
                    </div>
                    <span style={{marginLeft:"auto",color:"#00B894",fontSize:18}}>›</span>
                  </button>

                </div>

                <button className="btn" onClick={()=>setEditModalItem(null)}
                  style={{width:"100%",marginTop:14,padding:"12px",background:"#F5F5F5",color:"#888",borderRadius:12,fontSize:14,fontWeight:700}}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              QUICK ACTIONS
          ════════════════════════════════════════ */}
          <div style={{fontFamily:"'Fredoka One'",fontSize:15,color:"#333",marginBottom:10}}>⚡ Quick Actions</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {[
              {icon:"📋",label:"Build Schedule",    color:"#6C63FF", fn:()=>{setSchedAgent(null);go("sched-agent");}},
              {icon:"💬",label:"Chat Assistant",    color:"#FF6B6B", fn:()=>go("chat")},
              {icon:"📄",label:"Review Worksheets", color:"#F39C12", fn:()=>{if(allPicked().length>0)buildReviewQueue();else go("builder");}},
              {icon:"📦",label:"Worksheet Bank",    color:"#00CEC9", fn:()=>go("repository")},
              {icon:"📊",label:"Progress",          color:"#F9CA24", fn:()=>go("dashboard")},
            ].map(a=>(
              <button key={a.label} className="btn card" onClick={a.fn}
                style={{padding:"14px 16px",cursor:"pointer",borderLeft:`4px solid ${a.color}`,textAlign:"left",display:"flex",gap:10,alignItems:"center"}}>
                <span style={{fontSize:24}}>{a.icon}</span>
                <span style={{fontFamily:"'Fredoka One'",fontSize:13,color:"#333"}}>{a.label}</span>
              </button>
            ))}
          </div>

        </div>
      {ParentNav("p-home")}
      </div>
    );
  }

  if(screen==="builder") {
    const suggestions = grade ? (() => {
      const result = [];
      const subjects = Object.keys(TOPICS[grade]||{});
      const shuffled = [...subjects].sort(()=>Math.random()-.5);
      for(const subj of shuffled){
        const unexploredTopics = (TOPICS[grade][subj]||[]).filter(t=>!hasAny(subj,t));
        if(unexploredTopics.length>0){
          const t = unexploredTopics[Math.floor(Math.random()*unexploredTopics.length)];
          result.push({subj, topic:t});
        }
        if(result.length>=6) break;
      }
      return result;
    })() : [];

    const pendingCount  = reviewItems.filter(r=>r.status!=="approved").length;
    const approvedCount = reviewItems.filter(r=>r.status==="approved").length;
    const pickedCount   = allPicked().flatMap(({levels})=>LEVELS.filter(l=>levels[l])).length;

    const tabStyle = (active,col="#6C63FF")=>({
      padding:"9px 18px", borderRadius:50, border:"none", cursor:"pointer",
      fontFamily:"'Nunito'", fontWeight:800, fontSize:13,
      background:active?col:"#fff", color:active?"#fff":col,
      boxShadow:active?"0 3px 10px "+col+"44":"none", transition:"all .18s"
    });

    return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"#F0EFFE",minHeight:"100vh"}}>
      <style>{CSS}</style>
      <Hdr title="📋 Schedule Builder" back="p-home"
        actions={lastSchedule&&<button className="btn" onClick={copyLastSchedule}
          style={{background:"#FFF9E6",color:"#D4A017",padding:"7px 14px",borderRadius:50,fontSize:12,border:"2px solid #F9CA24"}}>
          ♻️ Copy Last Schedule
        </button>}/>

      {/* Tab bar */}
      <div style={{background:"#fff",boxShadow:"0 1px 8px #00000008",padding:"10px 18px",display:"flex",gap:8,position:"sticky",top:60,zIndex:90,maxWidth:680,margin:"0 auto",borderRadius:"0 0 16px 16px"}}>
        {[
          {id:"create",  label:`✏️ Create`,   badge:pickedCount>0?pickedCount:null,  col:"#6C63FF"},
          {id:"pending", label:`⏳ Pending`,   badge:pendingCount>0?pendingCount:null, col:"#F39C12"},
          {id:"approved",label:`✅ Approved`,  badge:approvedCount>0?approvedCount:null,col:"#00B894"},
        ].map(t=>(
          <div key={t.id} style={{position:"relative"}}>
            <button style={tabStyle(builderTab===t.id,t.col)} onClick={()=>setBuilderTab(t.id)}>{t.label}</button>
            {t.badge&&<span style={{position:"absolute",top:-4,right:-4,background:"#E74C3C",color:"#fff",borderRadius:50,width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900}}>{t.badge}</span>}
          </div>
        ))}
      </div>

      <div style={{maxWidth:680,margin:"0 auto",padding:"18px 16px 80px"}}>

        {/* ── TAB: CREATE ── */}
        {builderTab==="create"&&<>

          {/* Grade */}
          <ST>1. Select Grade</ST>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:6}}>
            {Object.entries(GRADES).map(([g,{color}])=>(
              <span key={g} className="chip" onClick={()=>{setGrade(g);setExpandedSub(null);}}
                style={{background:grade===g?color:"#fff",color:grade===g?"#fff":color,borderColor:color,fontSize:15,padding:"8px 22px"}}>
                {grade===g?"✓ ":""}{g}
              </span>
            ))}
          </div>

          {grade&&<>
            {/* Schedule Type */}
            <ST>2. Schedule Type</ST>
            <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
              {[
                {id:"daily",  icon:"☀️", label:"Daily",        sub:"1 topic/day"},
                {id:"weekly", icon:"📅", label:"Weekly",       sub:"7-day auto-plan"},
                {id:"custom", icon:"🗓️",label:"Custom Range",  sub:"Pick dates"},
              ].map(st=>(
                <div key={st.id} onClick={()=>setScheduleType(st.id)} style={{flex:1,minWidth:100,background:scheduleType===st.id?"#6C63FF":"#fff",color:scheduleType===st.id?"#fff":"#333",border:`2px solid ${scheduleType===st.id?"#6C63FF":"#E8E6FF"}`,borderRadius:14,padding:"11px 14px",cursor:"pointer",transition:"all .15s",textAlign:"center"}}>
                  <div style={{fontSize:22,marginBottom:4}}>{st.icon}</div>
                  <div style={{fontWeight:800,fontSize:13}}>{st.label}</div>
                  <div style={{fontSize:11,opacity:.7,marginTop:2}}>{st.sub}</div>
                </div>
              ))}
            </div>
            {scheduleType==="custom"&&(
              <div style={{display:"flex",gap:10,marginBottom:10}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>From</label>
                  <input type="date" value={customRange.from} onChange={e=>setCustomRange(c=>({...c,from:e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"2px solid #E8E6FF",fontFamily:"'Nunito'",fontSize:14,outline:"none"}}/>
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,fontWeight:700,color:"#888",display:"block",marginBottom:4}}>To</label>
                  <input type="date" value={customRange.to} onChange={e=>setCustomRange(c=>({...c,to:e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",borderRadius:10,border:"2px solid #E8E6FF",fontFamily:"'Nunito'",fontSize:14,outline:"none"}}/>
                </div>
              </div>
            )}

            {/* Theme */}
            <ST>3. Theme (Optional)</ST>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:6}}>
              <span className="chip" onClick={()=>setTheme(null)} style={{background:!theme?"#333":"#fff",color:!theme?"#fff":"#888",borderColor:"#ddd"}}>✕ No Theme</span>
              {THEMES.map(t=>(
                <span key={t.id} className="chip" onClick={()=>setTheme(theme===t.id?null:t.id)}
                  style={{background:theme===t.id?"#333":"#fff",color:theme===t.id?"#fff":"#555",borderColor:"#ddd"}}>
                  {t.emoji} {t.label}
                </span>
              ))}
            </div>

            {/* Smart Suggestions */}
            {suggestions.length>0&&(
              <div style={{background:"linear-gradient(135deg,#FFF9E6,#FFFDE7)",border:"2px solid #F9CA24",borderRadius:16,padding:"14px 16px",marginBottom:14}}>
                <div style={{fontWeight:800,color:"#D4A017",fontSize:14,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                  💡 Smart Suggestions — Topics not yet explored
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {suggestions.map(({subj,topic},i)=>{
                    const sc=SUBJECTS[subj]?.color||"#888";
                    return(
                      <div key={i} style={{background:"#fff",border:`2px solid ${sc}44`,borderRadius:12,padding:"8px 12px",cursor:"pointer"}}
                        onClick={()=>{
                          setExpandedSub(subj);
                          toggle(subj,topic,"Intermediate");
                          window.scrollBy({top:300,behavior:"smooth"});
                        }}>
                        <div style={{fontSize:11,color:sc,fontWeight:800,marginBottom:2}}>{SUBJECTS[subj]?.icon} {subj}</div>
                        <div style={{fontSize:13,fontWeight:700,color:"#333"}}>{topic}</div>
                        <div style={{fontSize:11,color:"#aaa",marginTop:2}}>+ Add Intermediate</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Topics */}
            <ST>4. Pick Topics & Difficulty Levels</ST>
            {Object.entries(SUBJECTS).map(([subj,{icon,color}])=>{
              const topics=(TOPICS[grade]||{})[subj]||[];
              const open=expandedSub===subj;
              const cnt=topics.filter(t=>hasAny(subj,t)).length;
              const totalT=topics.length;
              const pct=Math.round((cnt/totalT)*100);
              return(
                <div key={subj} style={{background:"#fff",borderRadius:16,overflow:"hidden",marginBottom:10,boxShadow:"0 2px 12px #00000008"}}>
                  <div onClick={()=>setExpandedSub(open?null:subj)}
                    style={{padding:"13px 18px",background:open?color:"#fff",color:open?"#fff":"#333",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
                    <span style={{fontFamily:"'Fredoka One'",fontSize:16,display:"flex",alignItems:"center",gap:8}}>
                      {icon} {subj}
                      <span style={{background:open?"rgba(255,255,255,.25)":color+"22",color:open?"#fff":color,borderRadius:20,padding:"1px 9px",fontSize:11,fontWeight:800}}>
                        {cnt}/{totalT}
                      </span>
                    </span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {/* Mini progress bar */}
                      <div style={{width:50,height:6,background:open?"rgba(255,255,255,.3)":"#F0F0F0",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:open?"#fff":color,borderRadius:3}}/>
                      </div>
                      <span style={{fontSize:14}}>{open?"▲":"▼"}</span>
                    </div>
                  </div>
                  {open&&topics.map(topic=>{
                    const sel=pickedLevels(subj,topic);
                    const anyOn=sel.Beginner||sel.Intermediate||sel.Advanced;
                    return(
                      <div key={topic} style={{borderTop:"1px solid #F5F3FF",padding:"9px 16px 10px 26px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,background:anyOn?"#FAFAFF":"#fff"}}>
                        <span style={{fontWeight:anyOn?800:600,fontSize:13,color:anyOn?"#333":"#666",flex:1}}>{topic}</span>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {LEVELS.map(lv=>{
                            const on=!!sel[lv];
                            return(
                              <span key={lv} className="chip" onClick={()=>toggle(subj,topic,lv)}
                                style={{background:on?LM[lv].color:LM[lv].bg,color:on?"#fff":LM[lv].color,borderColor:LM[lv].color,fontSize:11,padding:"3px 10px"}}>
                                {on?"✓":LM[lv].emoji} {lv}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>}

          {allPicked().length>0&&(
            <button className="btn" onClick={buildReviewQueue}
              style={{width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#6C63FF,#A855F7)",color:"#fff",fontSize:16,marginTop:12,boxShadow:"0 4px 20px #6C63FF44"}}>
              Preview & Approve {pickedCount} Worksheet{pickedCount!==1?"s":""} →
            </button>
          )}
        </>}

        {/* ── TAB: PENDING REVIEW ── */}
        {builderTab==="pending"&&(
          <div>
            <div className="card" style={{padding:14,marginBottom:14,borderLeft:"4px solid #F39C12",background:"#FFFDE7"}}>
              <div style={{fontWeight:800,color:"#F39C12",fontSize:14}}>⏳ Pending Review</div>
              <div style={{fontSize:13,color:"#888",marginTop:3}}>These worksheets have been generated but not yet approved.</div>
            </div>
            {reviewItems.filter(r=>r.status!=="approved").length===0?(
              <div style={{textAlign:"center",padding:40,color:"#ccc"}}>
                <div style={{fontSize:44}}>📭</div>
                <div style={{marginTop:10}}>No pending worksheets.</div>
                <button className="btn" onClick={()=>setBuilderTab("create")} style={{marginTop:12,background:"#6C63FF",color:"#fff",padding:"9px 20px",borderRadius:50,fontSize:14}}>Build a Schedule →</button>
              </div>
            ):reviewItems.filter(r=>r.status!=="approved").map(item=>{
              const lm=LM[item.level];
              return(
                <div key={item.id} className="card" style={{padding:14,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:11,color:gc,fontWeight:800}}>{item.subject}</div>
                    <div style={{fontWeight:800,fontSize:14,color:"#333"}}>{item.topic}</div>
                    <span style={{background:lm.bg,color:lm.color,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:800}}>{lm.emoji} {item.level}</span>
                  </div>
                  <button className="btn" onClick={()=>{go("review");}}
                    style={{background:"#F39C12",color:"#fff",padding:"8px 16px",borderRadius:50,fontSize:13}}>Review →</button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: APPROVED ── */}
        {builderTab==="approved"&&(
          <div>
            <div className="card" style={{padding:14,marginBottom:14,borderLeft:"4px solid #00B894",background:"#F0FFF8"}}>
              <div style={{fontWeight:800,color:"#00B894",fontSize:14}}>✅ Approved Worksheets</div>
              <div style={{fontSize:13,color:"#888",marginTop:3}}>These have been sent to your child.</div>
            </div>
            {approved.length===0?(
              <div style={{textAlign:"center",padding:40,color:"#ccc"}}>
                <div style={{fontSize:44}}>📂</div>
                <div style={{marginTop:10}}>No approved worksheets yet.</div>
              </div>
            ):approved.map(item=>{
              const lm=LM[item.level];
              const d=done.find(x=>x.subject===item.subject&&x.topic===item.topic&&x.level===item.level);
              return(
                <div key={item.id} className="card" style={{padding:14,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,borderLeft:`3px solid ${d?"#00B894":"#E8E6FF"}`}}>
                  <div>
                    <div style={{fontSize:11,color:gc,fontWeight:800}}>{item.subject}</div>
                    <div style={{fontWeight:800,fontSize:14,color:"#333"}}>{item.topic}</div>
                    <span style={{background:lm.bg,color:lm.color,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:800}}>{lm.emoji} {item.level}</span>
                  </div>
                  <div style={{textAlign:"right"}}>
                    {d?<div style={{fontWeight:900,fontSize:16,color:d.pct>=80?"#00B894":d.pct>=50?"#F9CA24":"#E74C3C"}}>{d.pct}% ✓</div>
                      :<span style={{background:"#F5F5F5",color:"#aaa",borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:700}}>Not started</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    {ParentNav("builder")}
    </div>
  );}
  /* REVIEW SCREEN — per worksheet approve/reject */
  if(screen==="review") {
    const totalItems    = reviewItems.length;
    const loadedCount   = reviewItems.filter(r=>r.wsData).length;
    const approvedCount = reviewItems.filter(r=>r.status==="approved"||r.status==="auto-approved").length;
    const allApproved   = approvedCount===totalItems && totalItems>0;
    const loadPct       = totalItems>0 ? Math.round((loadedCount/totalItems)*100) : 0;
    const selectedIds   = selectedForPrint;
    const selectedApproved = reviewItems.filter(r=>selectedIds.has(r.id)&&(r.status==="approved"||r.status==="auto-approved")&&r.wsData);

    const toggleSelect = (id)=>{
      setSelectedForPrint(prev=>{
        const s = new Set(prev);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
      });
    };
    const selectAll = ()=> setSelectedForPrint(new Set(reviewItems.filter(r=>r.status==="approved"||r.status==="auto-approved").map(r=>r.id)));
    const clearSelection = ()=> setSelectedForPrint(new Set());

    const deleteItem = (id)=>{
      setReviewItems(ri=>ri.filter(r=>r.id!==id));
      setSelectedForPrint(prev=>{ const s=new Set(prev); s.delete(id); return s; });
    };

    const moveToNextWeek = (item)=>{
      // Calculate exactly 7 days from today
      const nextWeekDate = new Date();
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      const nextWeekStr   = nextWeekDate.toLocaleDateString("en-CA"); // YYYY-MM-DD
      const nextWeekLabel = nextWeekDate.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"});

      // Add to schedAgent so it appears on the calendar
      setSchedAgent(prev=>{
        const prev2 = prev || {phase:"picking_topics",grade,schedType:"custom",days:[],currentDayIdx:0,weekTopics:[]};
        const days = [...prev2.days];
        let targetIdx = days.findIndex(d=>d.date===nextWeekStr);
        if(targetIdx < 0){
          days.push({day:days.length+1, date:nextWeekStr, items:[]});
          targetIdx = days.length - 1;
        }
        days[targetIdx] = {...days[targetIdx], items:[...days[targetIdx].items, {subject:item.subject, topic:item.topic, level:item.level, status:"scheduled"}]};
        return {...prev2, days};
      });

      // Keep in nextWeekItems tray for the review screen UI
      setNextWeekItems(nw=>[...nw, {...item, status:"pending", wsData:null, scheduledDate:nextWeekStr}]);
      setReviewItems(ri=>ri.filter(r=>r.id!==item.id));
      setSelectedForPrint(prev=>{ const s=new Set(prev); s.delete(item.id); return s; });
      setNotifications(n=>[{id:Date.now(),icon:"📅",text:`"${item.topic}" moved to next week (${nextWeekLabel}) — visible on calendar`,time:"Just now",read:false},...n]);
    };

    const previewSelected = ()=>{
      if(selectedApproved.length===0) return;
      setShowPrintPreview(true);
    };

    return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"#F0EFFE",minHeight:"100vh"}}>
      <style>{CSS}</style>
      <Hdr title="📄 Review Worksheets" back="builder"
        actions={
          <div style={{display:"flex",gap:8}}>
            {approvedCount>0&&(
              <button className="btn" onClick={finalApproveAll}
                style={{background:"linear-gradient(135deg,#00B894,#00CEC9)",color:"#fff",padding:"7px 14px",borderRadius:50,fontSize:12}}>
                Done ({approvedCount} ✅) →
              </button>
            )}
          </div>
        }/>

      {/* Loading progress bar */}
      {bgLoading&&(
        <div style={{background:"#fff",padding:"8px 16px",borderBottom:"1px solid #EEE",position:"sticky",top:60,zIndex:88}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:12,fontWeight:800,color:"#6C63FF"}}><span className="pulse">⟳</span> Loading {loadedCount}/{totalItems}…</span>
            <span style={{fontSize:12,color:"#aaa"}}>{loadPct}%</span>
          </div>
          <div style={{height:5,background:"#F0EFFE",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${loadPct}%`,background:"linear-gradient(90deg,#6C63FF,#A855F7)",borderRadius:3,transition:"width .6s"}}/>
          </div>
          <div style={{fontSize:11,color:"#aaa",marginTop:2}}>Start reviewing — others load in background</div>
        </div>
      )}

      <div style={{maxWidth:780,margin:"0 auto",padding:"14px 14px 100px"}}>

        {/* ── Bulk action bar ── */}
        <div className="card" style={{padding:"10px 14px",marginBottom:12,borderLeft:"4px solid #6C63FF"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:12,color:"#555"}}>{totalItems} total · {approvedCount} approved · {loadedCount} loaded</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button className="btn" onClick={approveAllItems}
                style={{background:"#00B89422",color:"#00B894",padding:"5px 12px",borderRadius:50,fontSize:11,border:"2px solid #00B89444"}}>
                ✅ Approve All
              </button>
            </div>
          </div>

          {/* Selection bar for print */}
          {approvedCount>0&&(
            <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #F0F0F0",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:12,color:"#666",display:"flex",alignItems:"center",gap:8}}>
                <span>⬇️ Select worksheets to download:</span>
                <button className="btn" onClick={selectAll} style={{background:"none",color:"#6C63FF",fontSize:11,padding:"2px 8px",border:"1.5px solid #6C63FF",borderRadius:20}}>All</button>
                {selectedIds.size>0&&<button className="btn" onClick={clearSelection} style={{background:"none",color:"#aaa",fontSize:11,padding:"2px 8px",border:"1.5px solid #ddd",borderRadius:20}}>Clear</button>}
              </div>
              {selectedIds.size>0&&(
                <button className="btn" onClick={previewSelected}
                  style={{background:"linear-gradient(135deg,#6C63FF,#A855F7)",color:"#fff",padding:"7px 16px",borderRadius:50,fontSize:12,fontWeight:800}}>
                  ⬇️ Download {selectedIds.size} Selected →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Next-week bin */}
        {nextWeekItems.length>0&&(
          <div className="card" style={{padding:"10px 14px",marginBottom:12,borderLeft:"4px solid #F39C12",background:"#FFFDE7"}}>
            <div style={{fontWeight:800,color:"#F39C12",fontSize:13,marginBottom:6}}>📅 Moved to Next Week ({nextWeekItems.length})</div>
            {nextWeekItems.map((it,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderTop:i>0?"1px solid #FFF0B3":"none"}}>
                <span style={{fontSize:12,color:"#555"}}>{it.subject} — {it.topic} ({it.level})</span>
                <button className="btn" onClick={()=>{setNextWeekItems(nw=>nw.filter((_,j)=>j!==i));setReviewItems(ri=>[...ri,{...it,id:`${it.subject}||${it.topic}||${it.level}||${Date.now()}`,status:"pending",wsData:null}]);}}
                  style={{background:"#F39C12",color:"#fff",padding:"3px 10px",borderRadius:20,fontSize:11}}>↩ Restore</button>
              </div>
            ))}
          </div>
        )}

        {/* Worksheet cards */}
        {reviewItems.map((item,idx)=>{
          const lm          = LM[item.level];
          const isLoadingBg = item.status==="loading" && !item.wsData;
          const isApproved  = item.status==="approved" || item.status==="auto-approved";
          const isFailed    = item.status==="failed";
          const isSelected  = selectedIds.has(item.id) && isApproved;
          const statusColor = {pending:"#aaa",loading:"#A855F7",loaded:"#F39C12",approved:"#00B894","auto-approved":"#00CEC9",rejected:"#E74C3C",regenerating:"#6C63FF",failed:"#E74C3C"}[item.status]||"#aaa";
          const statusLabel = {pending:"Not loaded",loading:"Loading…",loaded:"Ready to review",approved:"✅ Approved","auto-approved":"⚡ Quick-approved",rejected:"❌ Rejected",regenerating:"⟳ Regenerating",failed:"⚠️ Failed — Retry"}[item.status]||"";

          return(
            <div key={item.id} className="card" style={{marginBottom:12,overflow:"hidden",
              border:`2px solid ${isSelected?"#6C63FF":isApproved?"#00B894":isFailed?"#E74C3C":"#eee"}`,
              boxShadow:isSelected?"0 0 0 3px #6C63FF33":undefined,
              transition:"border .2s,box-shadow .2s"}}>

              <div style={{padding:"10px 14px",background:isSelected?"#F5F3FF":isApproved?"#F0FFF8":`linear-gradient(135deg,${gc}08,${ga}08)`,display:"flex",gap:10,alignItems:"flex-start"}}>

                {/* Checkbox for print selection */}
                {isApproved&&(
                  <div onClick={()=>toggleSelect(item.id)}
                    style={{width:22,height:22,borderRadius:6,border:`2px solid ${isSelected?"#6C63FF":"#ccc"}`,background:isSelected?"#6C63FF":"#fff",flexShrink:0,marginTop:2,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"all .15s"}}>
                    {isSelected&&<span style={{color:"#fff",fontSize:13,fontWeight:900}}>✓</span>}
                  </div>
                )}
                {!isApproved&&<div style={{width:22,flexShrink:0}}/>}

                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:gc,fontWeight:800,letterSpacing:.3}}>{idx+1}/{totalItems} · {item.subject}</div>
                  <div style={{fontWeight:800,fontSize:14,color:"#333"}}>{item.topic}</div>
                  <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>
                    <span style={{background:lm.bg,color:lm.color,borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:800}}>{lm.emoji} {item.level}</span>
                    <span style={{background:statusColor+"22",color:statusColor,borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700}}>{statusLabel}</span>
                    {isApproved&&<span style={{background:"#6C63FF22",color:"#6C63FF",borderRadius:20,padding:"1px 8px",fontSize:11,cursor:"pointer"}} onClick={()=>toggleSelect(item.id)}>{isSelected?"☑ Selected for download":"☐ Select"}</span>}
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",flexShrink:0}}>
                  {isLoadingBg&&<span className="pulse" style={{color:"#A855F7",fontSize:11,fontWeight:700}}>⟳ Loading…</span>}
                  {(item.status==="pending"||isFailed)&&(
                    <button className="btn" onClick={()=>loadReviewItem(item)} disabled={reviewLoading===item.id}
                      style={{background:isFailed?"#E74C3C":"#6C63FF",color:"#fff",padding:"5px 12px",borderRadius:50,fontSize:11}}>
                      {reviewLoading===item.id?<span className="pulse">…</span>:isFailed?"↺ Retry":"Load →"}
                    </button>
                  )}
                  {item.status==="loaded"&&(
                    <>
                      <button className="btn" onClick={()=>approveItem(item.id)} style={{background:"#00B894",color:"#fff",padding:"5px 10px",borderRadius:50,fontSize:11}}>✅</button>
                      <button className="btn" onClick={()=>approveWithoutReview(item.id)} style={{background:"#00CEC9",color:"#fff",padding:"5px 10px",borderRadius:50,fontSize:11}}>⚡</button>
                      <button className="btn" onClick={()=>openRejectModal(item)} style={{background:"#E74C3C",color:"#fff",padding:"5px 10px",borderRadius:50,fontSize:11}}>❌</button>
                    </>
                  )}
                  {isApproved&&(
                    <button className="btn" onClick={()=>openRejectModal(item)} style={{background:"#FFF3CD",color:"#856404",padding:"4px 9px",borderRadius:50,fontSize:11}}>↩</button>
                  )}
                  {item.status==="regenerating"&&<span className="pulse" style={{color:"#6C63FF",fontSize:11}}>⟳</span>}

                  {/* ⋯ More menu — delete / move to next week */}
                  <div style={{position:"relative"}}>
                    <button className="btn"
                      onClick={e=>{
                        e.stopPropagation();
                        const el = e.currentTarget.nextSibling;
                        el.style.display = el.style.display==="block" ? "none" : "block";
                      }}
                      style={{background:"#F0F0F0",color:"#888",padding:"4px 9px",borderRadius:50,fontSize:13,lineHeight:1}}>
                      ⋯
                    </button>
                    <div style={{display:"none",position:"absolute",right:0,top:"100%",background:"#fff",borderRadius:10,boxShadow:"0 4px 20px #00000020",padding:6,zIndex:50,minWidth:160,marginTop:4}}>
                      <button className="btn" onClick={()=>moveToNextWeek(item)}
                        style={{display:"block",width:"100%",padding:"7px 14px",textAlign:"left",background:"none",color:"#F39C12",fontSize:12,borderRadius:8}}>
                        📅 Move to Next Week
                      </button>
                      <button className="btn" onClick={()=>deleteItem(item.id)}
                        style={{display:"block",width:"100%",padding:"7px 14px",textAlign:"left",background:"none",color:"#E74C3C",fontSize:12,borderRadius:8}}>
                        🗑️ Delete Worksheet
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isLoadingBg&&(
                <div style={{padding:14,textAlign:"center",color:"#bbb",background:"#FAFAFF",fontSize:12}}>
                  <span className="spin" style={{fontSize:20,display:"inline-block"}}>✏️</span>
                  <div style={{marginTop:4}}>Building 15 questions…</div>
                </div>
              )}
              {isFailed&&(
                <div style={{padding:10,textAlign:"center",background:"#FFF5F5",fontSize:12,color:"#E74C3C"}}>
                  ⚠️ Failed to load — click Retry
                </div>
              )}
              {item.wsData&&(
                <div style={{maxHeight:isApproved?180:500,overflowY:"auto",padding:"0 12px 10px",borderTop:"1px solid #F5F5F5"}}>
                  {isApproved&&<div style={{fontSize:10,color:"#aaa",padding:"4px 0",textAlign:"center"}}>Approved ✅</div>}
                  {renderWs(item.wsData,false,{})}
                </div>
              )}
            </div>
          );
        })}

        {/* All approved CTA */}
        {allApproved&&(
          <div className="card pop" style={{padding:18,textAlign:"center",borderTop:"4px solid #00B894",marginTop:4}}>
            <div style={{fontSize:28,marginBottom:4}}>🎉</div>
            <div style={{fontFamily:"'Fredoka One'",fontSize:16,color:"#00B894",marginBottom:10}}>All {totalItems} approved!</div>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
              <button className="btn" onClick={()=>{selectAll();setShowPrintPreview(true);}}
                style={{background:"linear-gradient(135deg,#6C63FF,#A855F7)",color:"#fff",padding:"10px 20px",borderRadius:50,fontSize:13}}>
                ⬇️ Download All Worksheets
              </button>
              <button className="btn" onClick={finalApproveAll}
                style={{background:"linear-gradient(135deg,#00B894,#00CEC9)",color:"#fff",padding:"10px 20px",borderRadius:50,fontSize:13}}>
                📲 Send to Kid
              </button>
            </div>
          </div>
        )}
      </div>

      {/* REJECT MODAL */}
      {rejectTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div className="card pop" style={{padding:24,maxWidth:400,width:"100%"}}>
            <div style={{fontFamily:"'Fredoka One'",fontSize:18,color:"#E74C3C",marginBottom:6}}>❌ Reject & Regenerate</div>
            <div style={{fontSize:12,color:"#666",marginBottom:10}}>{rejectTarget.topic} · {rejectTarget.level} · Attempt #{rejectTarget.attempt+1}</div>
            <textarea value={rejectNote} onChange={e=>setRejectNote(e.target.value)}
              placeholder="Note for AI: 'Make harder', 'More word problems'…"
              style={{...inp,resize:"none",minHeight:65,marginBottom:12}}/>
            <div style={{display:"flex",gap:8}}>
              <button className="btn" onClick={()=>setRejectTarget(null)} style={{flex:1,background:"#F0F0F0",color:"#888",padding:"9px",borderRadius:10}}>Cancel</button>
              <button className="btn" onClick={confirmReject} style={{flex:2,background:"linear-gradient(135deg,#6C63FF,#A855F7)",color:"#fff",padding:"9px",borderRadius:10,fontSize:13}}>⟳ Regenerate</button>
            </div>
          </div>
        </div>
      )}

      {/* COMPARE MODAL */}
      {compareItem&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:300,overflowY:"auto",padding:14}}>
          <div style={{maxWidth:1100,margin:"0 auto"}}>
            <div className="card" style={{padding:"11px 14px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"'Fredoka One'",fontSize:16,color:"#333"}}>🔄 Old vs New</div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn" onClick={()=>{approveItem(compareItem.id);setCompareItem(null);}} style={{background:"#00B894",color:"#fff",padding:"7px 14px",borderRadius:50,fontSize:12}}>✅ Keep New</button>
                <button className="btn" onClick={()=>setCompareItem(null)} style={{background:"#eee",color:"#888",padding:"7px 14px",borderRadius:50,fontSize:12}}>Close</button>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{background:"#FFF5F5",border:"2px solid #E74C3C",borderRadius:8,padding:"6px 10px",marginBottom:6,fontWeight:800,color:"#E74C3C",fontSize:12,textAlign:"center"}}>❌ Previous</div>
                <div style={{background:"#fff",borderRadius:10,padding:10,maxHeight:540,overflowY:"auto"}}>{renderWs(compareItem.oldWs,false,{})}</div>
              </div>
              <div>
                <div style={{background:"#F0FFF8",border:"2px solid #00B894",borderRadius:8,padding:"6px 10px",marginBottom:6,fontWeight:800,color:"#00B894",fontSize:12,textAlign:"center"}}>✅ New Version</div>
                <div style={{background:"#fff",borderRadius:10,padding:10,maxHeight:540,overflowY:"auto"}}>{renderWs(compareItem.newWs,false,{})}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOWNLOAD / SEND MODAL */}
      {showDownload&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div className="card pop" style={{padding:26,maxWidth:360,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:38,marginBottom:4}}>🎉</div>
            <div style={{fontFamily:"'Fredoka One'",fontSize:18,color:"#333",marginBottom:3}}>
              {reviewItems.filter(r=>r.status==="approved"||r.status==="auto-approved").length} Approved!
            </div>
            <div style={{fontSize:12,color:"#888",marginBottom:16}}>What would you like to do?</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button className="btn" onClick={()=>{selectAll();setShowDownload(false);setShowPrintPreview(true);}}
                style={{background:"linear-gradient(135deg,#6C63FF,#A855F7)",color:"#fff",padding:"12px",borderRadius:11,fontSize:13}}>
                👁️ Preview &amp; Print / Save PDF
                <div style={{fontSize:10,opacity:.8,marginTop:2}}>Select which to include · then print</div>
              </button>
              <button className="btn" onClick={sendToKidAndClose}
                style={{background:"linear-gradient(135deg,#00B894,#00CEC9)",color:"#fff",padding:"12px",borderRadius:11,fontSize:13}}>
                📲 Send to Kid's Dashboard
              </button>
              <button className="btn" onClick={()=>{selectAll();setShowDownload(false);setShowPrintPreview(true);sendToKidAndClose();}}
                style={{background:"#F0EFFE",color:"#6C63FF",padding:"12px",borderRadius:11,fontSize:12,border:"2px solid #6C63FF33"}}>
                👁️ + 📲 Both
              </button>
              <button className="btn" onClick={()=>setShowDownload(false)} style={{background:"none",color:"#bbb",fontSize:11,padding:"5px"}}>← Back</button>
            </div>
          </div>
        </div>
      )}
    {ParentNav("review")}
    </div>
  );}

  if(showPrintPreview) {
    const allApprovedItems = reviewItems.filter(r=>(r.status==="approved"||r.status==="auto-approved")&&r.wsData);
    const apps = selectedForPrint.size > 0
      ? allApprovedItems.filter(r=>selectedForPrint.has(r.id))
      : allApprovedItems;
    const LEVEL_COLORS = {Beginner:"#27AE60",Intermediate:"#F39C12",Advanced:"#E74C3C"};

    return (
      <div style={{fontFamily:"'Arial',sans-serif",background:"#E8E6F0",minHeight:"100vh"}}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');
          body{margin:0;padding:0;}
          .ws-page{background:#fff;max-width:760px;margin:0 auto 32px;border-radius:10px;box-shadow:0 3px 20px #0002;overflow:hidden;}
          .ws-section-title{font-weight:800;font-size:14px;color:#6C63FF;background:#F0EFFE;padding:7px 14px;border-radius:7px;margin-bottom:10px;}
          .ws-q{margin-bottom:12px;padding:10px 14px;border:1.5px solid #E8E6FF;border-radius:8px;background:#fff;}
          .ws-q-text{font-weight:700;color:#222;font-size:14px;margin-bottom:6px;}
          .ws-option{display:inline-block;padding:4px 14px;border:1.5px solid #bbb;border-radius:20px;margin:3px 4px;font-size:13px;}
          .ws-blank{border-bottom:1.5px solid #aaa;margin-top:22px;height:24px;display:block;}
          @media print{
            @page{margin:12mm;size:A4 portrait;}
            body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
            .no-print{display:none!important;}
            .ws-page{box-shadow:none!important;border-radius:0!important;margin:0!important;page-break-after:always;}
            .ws-page:last-child{page-break-after:avoid;}
          }
        `}</style>

        {/* Sticky top bar */}
        <div className="no-print" style={{position:"fixed",top:0,left:0,right:0,background:"#6C63FF",color:"#fff",zIndex:99,padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 2px 12px #6C63FF66"}}>
          <div>
            <div style={{fontFamily:"'Nunito'",fontWeight:900,fontSize:16}}>📄 Print Preview — {apps.length} Worksheet{apps.length!==1?"s":""}</div>
            <div style={{fontSize:11,opacity:.8,marginTop:1}}>Scroll to review · Use Print button to save as PDF</div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={triggerPrint}
              style={{background:"#fff",color:"#6C63FF",border:"none",padding:"9px 20px",borderRadius:50,fontWeight:800,fontSize:13,cursor:"pointer",boxShadow:"0 2px 8px #0002"}}>
              🖨️ Print / Save as PDF
            </button>
            <button onClick={()=>setShowPrintPreview(false)}
              style={{background:"rgba(255,255,255,.2)",color:"#fff",border:"2px solid rgba(255,255,255,.4)",padding:"9px 16px",borderRadius:50,fontWeight:700,fontSize:13,cursor:"pointer"}}>
              ← Back
            </button>
          </div>
        </div>

        {/* Spacer for fixed bar */}
        <div className="no-print" style={{height:60}}/>

        {/* Table of contents */}
        <div className="no-print" style={{maxWidth:760,margin:"16px auto",background:"#fff",borderRadius:10,padding:"14px 18px",boxShadow:"0 2px 10px #0001"}}>
          <div style={{fontWeight:800,color:"#333",marginBottom:10,fontSize:14}}>📋 Contents ({apps.length} worksheets)</div>
          {apps.map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:i<apps.length-1?"1px solid #F5F5F5":"none"}}>
              <span style={{background:"#6C63FF",color:"#fff",borderRadius:50,width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,flexShrink:0}}>{i+1}</span>
              <span style={{flex:1,fontWeight:700,fontSize:13,color:"#333"}}>{item.subject} — {item.topic}</span>
              <span style={{background:LEVEL_COLORS[item.level]+"22",color:LEVEL_COLORS[item.level],borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:800}}>{item.level}</span>
              <span style={{fontSize:12,color:"#aaa"}}>{item.wsData?.total_marks||40} marks</span>
            </div>
          ))}
        </div>

        {/* Worksheet pages */}
        {apps.map((item,idx)=>{
          const ws = item.wsData;
          return (
            <div key={idx} className="ws-page" style={{padding:28}}>
              {/* Worksheet header */}
              <div style={{borderBottom:"3px solid #6C63FF",paddingBottom:14,marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:10,color:"#999",letterSpacing:1,textTransform:"uppercase",fontFamily:"Nunito"}}>PracticeNest · NCERT/CBSE · Worksheet {idx+1}/{apps.length}</div>
                    <div style={{fontSize:20,fontWeight:900,color:"#6C63FF",marginTop:2,fontFamily:"Nunito"}}>{item.subject} — {item.topic}</div>
                    <div style={{fontSize:13,color:"#555",marginTop:3}}>{ws.grade||grade} · {item.level} · {ws.time_suggested||"30 min"} · {ws.total_marks||40} marks</div>
                  </div>
                  <div style={{background:LEVEL_COLORS[item.level]+"15",border:`2px solid ${LEVEL_COLORS[item.level]}`,borderRadius:8,padding:"6px 14px",textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:900,color:LEVEL_COLORS[item.level]}}>{item.level}</div>
                    <div style={{fontSize:10,color:LEVEL_COLORS[item.level],fontWeight:700}}>{item.level==="Beginner"?"🌱":item.level==="Intermediate"?"🌟":"🔥"}</div>
                  </div>
                </div>
                {/* Name/Date/Score row */}
                <div style={{display:"flex",gap:24,marginTop:14,flexWrap:"wrap"}}>
                  {["Name","Class","Date","Score"].map(f=>(
                    <div key={f} style={{fontSize:13,color:"#555"}}>
                      {f}: <span style={{display:"inline-block",width:f==="Name"?160:f==="Score"?80:100,borderBottom:"1.5px solid #aaa"}}>&nbsp;&nbsp;&nbsp;</span>
                      {f==="Score"&&<span style={{fontSize:12,color:"#aaa"}}>&nbsp;/ {ws.total_marks||40}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sections */}
              {(ws.sections||[]).map((sec,si)=>(
                <div key={si} style={{marginBottom:22}}>
                  <div className="ws-section-title">{sec.title} <span style={{float:"right",fontSize:11,color:"#999",fontWeight:600}}>{(sec.questions||[]).reduce((a,q)=>a+(q.marks||2),0)} marks</span></div>
                  {(sec.questions||[]).map((q,qi)=>(
                    <div key={qi} className="ws-q">
                      <div className="ws-q-text">Q{qi+1}. {q.question||""} <span style={{float:"right",fontSize:11,color:"#999",fontWeight:600}}>[{q.marks||2}m]</span></div>
                      {/* MCQ options */}
                      {q.options&&(
                        <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
                          {q.options.map((o,oi)=>(
                            <span key={oi} className="ws-option">{String.fromCharCode(65+oi)}. {o}</span>
                          ))}
                        </div>
                      )}
                      {/* Answer blanks for written questions */}
                      {(q.type==="fill"||q.type==="short")&&<span className="ws-blank"/>}
                      {(q.type==="calculate"||q.type==="word_problem")&&(
                        <div style={{marginTop:10}}>
                          <div style={{fontSize:11,color:"#aaa",marginBottom:4}}>Working space:</div>
                          <div style={{border:"1px dashed #ddd",borderRadius:6,height:56,marginBottom:4}}/>
                          <div style={{fontSize:12,color:"#555"}}>Answer: <span className="ws-blank" style={{width:120,display:"inline-block"}}/></div>
                        </div>
                      )}
                      {q.type==="truefalse"&&(
                        <div style={{display:"flex",gap:12,marginTop:6}}>
                          {["True","False"].map(tf=><span key={tf} className="ws-option">{tf}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {/* Footer */}
              <div style={{marginTop:18,paddingTop:8,borderTop:"1px solid #eee",display:"flex",justifyContent:"space-between",fontSize:11,color:"#ccc"}}>
                <span>PracticeNest · NCERT Worksheet</span>
                <span>Generated {new Date().toLocaleDateString("en-IN")}</span>
              </div>
            </div>
          );
        })}

        {/* Bottom print bar */}
        <div className="no-print" style={{maxWidth:760,margin:"0 auto 40px",textAlign:"center"}}>
          <button onClick={triggerPrint}
            style={{background:"linear-gradient(135deg,#6C63FF,#A855F7)",color:"#fff",border:"none",padding:"14px 36px",borderRadius:50,fontWeight:800,fontSize:16,cursor:"pointer",boxShadow:"0 4px 20px #6C63FF44"}}>
            ⬇️ Download All {apps.length} Worksheets / Save as PDF
          </button>
          <div style={{fontSize:12,color:"#aaa",marginTop:8}}>In the print dialog → select "Save as PDF" to download</div>
        </div>
      </div>
    );
  }

  if(screen==="sched-agent"){
    const sa = schedAgent || {phase:"picking_grade", grade:null, schedType:"daily", days:[], currentDayIdx:0, weekTopics:[]};
    const gc2 = GRADES[sa.grade]?.color || "#6C63FF";
    const todayItems = sa.days[sa.currentDayIdx]?.items || [];
    const totalWs = sa.days.reduce((a,d)=>a+(d.items||[]).length, 0);

    const setPhase = (phase, extra={}) => setSchedAgent(p=>({...p, phase, ...extra}));

    const addTopicToDay = (sub, t, lv) => setSchedAgent(p=>{
      const days = [...p.days];
      const idx  = p.currentDayIdx;
      if(!days[idx]) days[idx] = {day:idx+1, date:`Day ${idx+1}`, items:[]};
      if(days[idx].items.some(x=>x.subject===sub&&x.topic===t&&x.level===lv)) return p;
      days[idx] = {...days[idx], items:[...days[idx].items, {subject:sub, topic:t, level:lv}]};
      return {...p, days};
    });

    const removeTopicFromDay = (dayIdx, itemIdx) => setSchedAgent(p=>{
      const days = [...p.days];
      days[dayIdx] = {...days[dayIdx], items: days[dayIdx].items.filter((_,j)=>j!==itemIdx)};
      return {...p, days};
    });

    const goToNextDay = () => setSchedAgent(p=>{
      const nextIdx = p.currentDayIdx + 1;
      const days = [...p.days];
      if(!days[nextIdx]) days[nextIdx] = {day:nextIdx+1, date:`Day ${nextIdx+1}`, items:[]};
      return {...p, days, currentDayIdx:nextIdx, phase:"picking_topics"};
    });

    const sameAsYesterday = () => setSchedAgent(p=>{
      const days = [...p.days];
      const prev = days[p.currentDayIdx-1]?.items || [];
      days[p.currentDayIdx] = {...(days[p.currentDayIdx]||{}), items:[...prev]};
      return {...p, days, phase:"picking_topics"};
    });

    const launchReview = () => {
      sa.days.flatMap(d=>d.items||[]).forEach(item=>
        setPicked(p=>({...p, [`${item.subject}||${item.topic}`]:{...p[`${item.subject}||${item.topic}`],[item.level]:true}}))
      );
      buildReviewQueue();
    };

    const buildWeeklySchedule = () => {
      const topics = sa.weekTopics || [];
      // Build real dates for the next 7 days starting from today
      const today = new Date();
      const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
      const schedule = Array.from({length:7}, (_,i)=>{
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toLocaleDateString("en-CA"); // YYYY-MM-DD for calendar
        const label = `${dayNames[d.getDay()]} ${d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}`;
        return {day:i+1, date:dateStr, label, items:[]};
      });
      // Distribute topics round-robin across all 7 days
      topics.forEach((item,i) => { schedule[i % 7].items.push(item); });
      setSchedAgent(p=>({...p, days:schedule, phase:"weekly_preview"}));
    };

    return(
      <div style={{fontFamily:"'Nunito',sans-serif",background:"#F0EFFE",minHeight:"100vh"}}>
        <style>{CSS}</style>
        <Hdr title="🗓️ Build Your Schedule" back="p-home"/>
        <div style={{maxWidth:680,margin:"0 auto",padding:"14px 16px 80px"}}>

          {/* ── PHASE: picking_grade ── */}
          {sa.phase==="picking_grade"&&(
            <div className="fadeUp">
              <div style={{fontFamily:"'Fredoka One'",fontSize:20,color:"#333",marginBottom:4}}>📅 Let's build your schedule!</div>
              <div style={{color:"#888",fontSize:13,marginBottom:16}}>Choose a type and grade to get started.</div>

              <div style={{fontFamily:"'Fredoka One'",fontSize:15,color:"#555",marginBottom:8}}>Schedule Type</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
                {[["daily","☀️","Daily","Plan day by day"],["weekly","📅","Weekly","Auto-plan a full week"],["custom","🗓️","Custom Dates","Pick specific dates"]].map(([id,icon,label,desc])=>(
                  <div key={id} onClick={()=>setSchedType(id)}
                    style={{background:schedType===id?gc2:"#fff",color:schedType===id?"#fff":"#333",
                      border:`2px solid ${schedType===id?gc2:"#E8E6FF"}`,borderRadius:14,padding:"14px 10px",
                      cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                    <div style={{fontSize:28,marginBottom:4}}>{icon}</div>
                    <div style={{fontWeight:800,fontSize:13}}>{label}</div>
                    <div style={{fontSize:10,opacity:.7,marginTop:3}}>{desc}</div>
                  </div>
                ))}
              </div>

              <div style={{fontFamily:"'Fredoka One'",fontSize:15,color:"#555",marginBottom:8}}>Select Grade</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
                {Object.entries(GRADES).map(([g,{color}])=>(
                  <span key={g} className="chip"
                    onClick={()=>{setGrade(g);setSchedAgent({phase:"picking_topics",grade:g,schedType,days:[{day:1,date:"Day 1",items:[]}],currentDayIdx:0,weekTopics:[]});}}
                    style={{background:sa.grade===g?color:"#fff",color:sa.grade===g?"#fff":color,borderColor:color,fontSize:13,padding:"7px 16px"}}>
                    {sa.grade===g?"✓ ":""}{g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── PHASE: picking_topics (daily / custom) ── */}
          {sa.phase==="picking_topics"&&sa.grade&&schedType!=="weekly"&&(
            <div className="fadeUp">
              {/* Day header */}
              <div className="card" style={{padding:"12px 16px",marginBottom:14,borderLeft:`4px solid ${gc2}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:18,color:gc2}}>
                    ☀️ Day {sa.currentDayIdx+1} {sa.days[sa.currentDayIdx]?.date&&sa.days[sa.currentDayIdx].date!==`Day ${sa.currentDayIdx+1}`?`· ${sa.days[sa.currentDayIdx].date}`:""}
                  </div>
                  <div style={{fontSize:12,color:"#888",marginTop:2}}>{sa.grade} · Add as many topics as you like</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:22,color:gc2}}>{todayItems.length}</div>
                  <div style={{fontSize:10,color:"#aaa"}}>topics today</div>
                </div>
              </div>

              {/* Topics added today */}
              {todayItems.length>0&&(
                <div style={{background:"#F0FFF8",borderRadius:12,padding:"10px 14px",marginBottom:12,border:"1.5px solid #00B89433"}}>
                  <div style={{fontSize:11,fontWeight:800,color:"#00B894",marginBottom:6}}>✅ Today's topics ({todayItems.length}):</div>
                  {todayItems.map((item,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",fontSize:13}}>
                      <span>{SUBJECTS[item.subject]?.icon} <strong>{item.topic}</strong> <span style={{color:LM[item.level]?.color,fontSize:11}}>({item.level})</span></span>
                      <button className="btn" onClick={()=>removeTopicFromDay(sa.currentDayIdx,i)}
                        style={{background:"#FFE8E8",color:"#E74C3C",borderRadius:20,padding:"2px 9px",fontSize:11}}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Level selector */}
              <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center"}}>
                <span style={{fontSize:12,color:"#888",fontWeight:700,flexShrink:0}}>Level:</span>
                {["Beginner","Intermediate","Advanced"].map(lv=>(
                  <span key={lv} className="chip" onClick={()=>setAdaptiveLevel(lv)}
                    style={{background:adaptiveLevel===lv?LM[lv].color:LM[lv].bg,color:adaptiveLevel===lv?"#fff":LM[lv].color,
                      borderColor:LM[lv].color,fontSize:11,padding:"3px 10px"}}>
                    {LM[lv].emoji} {lv}
                  </span>
                ))}
              </div>

              {/* Topic grid - all subjects */}
              {Object.entries(TOPICS[sa.grade]||{}).map(([sub,topics])=>(
                <div key={sub} style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:800,color:SUBJECTS[sub]?.color||"#888",marginBottom:4}}>
                    {SUBJECTS[sub]?.icon} {sub}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {topics.map(t=>{
                      const already = todayItems.some(x=>x.subject===sub&&x.topic===t&&x.level===adaptiveLevel);
                      return(
                        <span key={t} className="chip" onClick={()=>!already&&addTopicToDay(sub,t,adaptiveLevel)}
                          style={{background:already?"#E8FFE8":SUBJECTS[sub]?.color+"11",
                            color:already?"#00B894":SUBJECTS[sub]?.color||"#555",
                            borderColor:already?"#00B894":SUBJECTS[sub]?.color||"#ddd",
                            fontSize:11,padding:"3px 10px",
                            textDecoration:already?"line-through":"none",opacity:already?.7:1}}>
                          {already?"✓ ":""}{t}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* End of day actions */}
              {todayItems.length>0&&(
                <div className="card" style={{padding:"14px 16px",marginTop:14,borderTop:`3px solid ${gc2}`}}>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:15,color:"#333",marginBottom:10}}>
                    ✅ Day {sa.currentDayIdx+1} done! What next?
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <button className="btn" onClick={()=>setPhase("eod_options")}
                      style={{background:`linear-gradient(135deg,${gc2},${gc2}bb)`,color:"#fff",padding:"12px 16px",borderRadius:12,fontSize:14,fontWeight:800,textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:20}}>🎯</span>
                      <div><div>Done with Day {sa.currentDayIdx+1}</div><div style={{fontSize:11,opacity:.85}}>See options for what to do next</div></div>
                      <span style={{marginLeft:"auto"}}>→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PHASE: eod_options — end-of-day decision ── */}
          {sa.phase==="eod_options"&&(
            <div className="fadeUp">
              <div className="card" style={{padding:"16px 18px",marginBottom:14,borderTop:`4px solid ${gc2}`}}>
                <div style={{fontSize:28,textAlign:"center",marginBottom:8}}>🌟</div>
                <div style={{fontFamily:"'Fredoka One'",fontSize:18,color:gc2,textAlign:"center",marginBottom:4}}>
                  Day {sa.currentDayIdx+1} Scheduled!
                </div>
                <div style={{fontSize:12,color:"#888",textAlign:"center",marginBottom:14}}>
                  {todayItems.length} topic{todayItems.length!==1?"s":""} · {totalWs} total so far
                </div>
                {/* Today's summary */}
                <div style={{background:"#F9F9FF",borderRadius:10,padding:"10px 12px",marginBottom:14}}>
                  {todayItems.map((item,i)=>(
                    <div key={i} style={{fontSize:12,color:"#555",padding:"2px 0",display:"flex",gap:6}}>
                      <span>{SUBJECTS[item.subject]?.icon}</span>
                      <span><strong>{item.topic}</strong> <span style={{color:LM[item.level]?.color}}>({item.level})</span></span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{fontFamily:"'Fredoka One'",fontSize:15,color:"#555",marginBottom:10}}>What would you like to do?</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>

                {/* Option 1: Add more today */}
                <button className="btn" onClick={()=>setPhase("picking_topics")}
                  style={{background:"#fff",border:"2px solid #6C63FF",borderRadius:14,padding:"14px 18px",textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:28}}>➕</span>
                  <div>
                    <div style={{fontWeight:800,color:"#6C63FF",fontSize:14}}>Add more topics to Day {sa.currentDayIdx+1}</div>
                    <div style={{fontSize:12,color:"#888",marginTop:2}}>Keep adding worksheets to today</div>
                  </div>
                </button>

                {/* Option 2: Review now */}
                <button className="btn" onClick={launchReview}
                  style={{background:"#fff",border:"2px solid #00B894",borderRadius:14,padding:"14px 18px",textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:28}}>📄</span>
                  <div>
                    <div style={{fontWeight:800,color:"#00B894",fontSize:14}}>Review & approve worksheets now</div>
                    <div style={{fontSize:12,color:"#888",marginTop:2}}>Go preview and approve all {totalWs} worksheet{totalWs!==1?"s":""}</div>
                  </div>
                </button>

                {/* Option 3: Schedule tomorrow (if under 14 days) */}
                {sa.currentDayIdx<13&&(
                  <button className="btn" onClick={goToNextDay}
                    style={{background:"#fff",border:`2px solid ${gc2}`,borderRadius:14,padding:"14px 18px",textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                    <span style={{fontSize:28}}>📅</span>
                    <div>
                      <div style={{fontWeight:800,color:gc2,fontSize:14}}>Schedule Day {sa.currentDayIdx+2}</div>
                      <div style={{fontSize:12,color:"#888",marginTop:2}}>
                        {sa.currentDayIdx+1}/14 days done · {13-sa.currentDayIdx} more days available
                      </div>
                    </div>
                    <div style={{marginLeft:"auto",display:"flex",gap:4}}>
                      <button className="btn" onClick={e=>{e.stopPropagation();sameAsYesterday();}}
                        style={{background:"#FFF9E6",color:"#D4A017",borderRadius:20,padding:"4px 10px",fontSize:11,border:"1.5px solid #F9CA24",fontFamily:"'Nunito'"}}>
                        📋 Same as today
                      </button>
                    </div>
                  </button>
                )}

                {sa.currentDayIdx>=13&&(
                  <div style={{background:"#FFF9E6",borderRadius:12,padding:"10px 14px",border:"1.5px solid #F9CA2444",fontSize:13,color:"#D4A017",fontWeight:700,textAlign:"center"}}>
                    ⚠️ Maximum 14 days reached. Please review your worksheets.
                  </div>
                )}
              </div>

              {/* Full schedule overview */}
              {sa.days.filter(d=>(d.items||[]).length>0).length>0&&(
                <div style={{marginTop:16,background:"#fff",borderRadius:12,padding:"14px 16px",border:"1.5px solid #E8E6FF"}}>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:14,color:"#333",marginBottom:8}}>📋 Full Schedule ({totalWs} worksheets)</div>
                  {sa.days.filter(d=>(d.items||[]).length>0).map((d,di)=>(
                    <div key={di} style={{padding:"6px 0",borderBottom:"1px solid #F5F5F5"}}>
                      <div style={{fontWeight:800,fontSize:12,color:gc2,marginBottom:3}}>
                        Day {d.day} {d.date&&d.date!==`Day ${d.day}`?`· ${d.date}`:""}
                        <span style={{fontWeight:600,color:"#aaa",marginLeft:6}}>({d.items.length} topic{d.items.length!==1?"s":""})</span>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {d.items.map((item,ii)=>(
                          <span key={ii} style={{background:gc2+"18",color:gc2,borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:700}}>
                            {SUBJECTS[item.subject]?.icon} {item.topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PHASE: picking_topics for WEEKLY ── */}
          {sa.phase==="picking_topics"&&sa.grade&&schedType==="weekly"&&(
            <div className="fadeUp">
              <div className="card" style={{padding:"12px 16px",marginBottom:14,borderLeft:`4px solid ${gc2}`}}>
                <div style={{fontFamily:"'Fredoka One'",fontSize:17,color:gc2}}>📅 Weekly Schedule — Pick Topics</div>
                <div style={{fontSize:12,color:"#888",marginTop:2}}>Select topics for the week. I'll distribute them across all 7 days automatically.</div>
              </div>

              {/* Level */}
              <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center"}}>
                <span style={{fontSize:12,color:"#888",fontWeight:700,flexShrink:0}}>Level:</span>
                {["Beginner","Intermediate","Advanced"].map(lv=>(
                  <span key={lv} className="chip" onClick={()=>setAdaptiveLevel(lv)}
                    style={{background:adaptiveLevel===lv?LM[lv].color:LM[lv].bg,color:adaptiveLevel===lv?"#fff":LM[lv].color,
                      borderColor:LM[lv].color,fontSize:11,padding:"3px 10px"}}>
                    {LM[lv].emoji} {lv}
                  </span>
                ))}
              </div>

              {/* Selected topics */}
              {(sa.weekTopics||[]).length>0&&(
                <div style={{background:"#F0FFF8",borderRadius:10,padding:"10px 12px",marginBottom:10,border:"1.5px solid #00B89433"}}>
                  <div style={{fontSize:11,fontWeight:800,color:"#00B894",marginBottom:5}}>✅ Selected for the week ({sa.weekTopics.length}):</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {(sa.weekTopics||[]).map((item,i)=>(
                      <span key={i} style={{background:"#fff",border:"1.5px solid #00B894",borderRadius:20,padding:"2px 10px",fontSize:11,display:"flex",alignItems:"center",gap:4}}>
                        {SUBJECTS[item.subject]?.icon} {item.topic}
                        <button onClick={()=>setSchedAgent(p=>({...p,weekTopics:p.weekTopics.filter((_,j)=>j!==i)}))}
                          style={{background:"none",border:"none",color:"#E74C3C",cursor:"pointer",fontSize:12,lineHeight:1}}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {Object.entries(TOPICS[sa.grade]||{}).map(([sub,topics])=>(
                <div key={sub} style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:800,color:SUBJECTS[sub]?.color||"#888",marginBottom:4}}>
                    {SUBJECTS[sub]?.icon} {sub}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {topics.map(t=>{
                      const already=(sa.weekTopics||[]).some(x=>x.subject===sub&&x.topic===t);
                      return(
                        <span key={t} className="chip"
                          onClick={()=>{
                            if(already) setSchedAgent(p=>({...p,weekTopics:p.weekTopics.filter(x=>!(x.subject===sub&&x.topic===t))}));
                            else setSchedAgent(p=>({...p,weekTopics:[...(p.weekTopics||[]),{subject:sub,topic:t,level:adaptiveLevel}]}));
                          }}
                          style={{background:already?SUBJECTS[sub]?.color:SUBJECTS[sub]?.color+"11",
                            color:already?"#fff":SUBJECTS[sub]?.color||"#555",
                            borderColor:SUBJECTS[sub]?.color||"#ddd",fontSize:11,padding:"3px 10px"}}>
                          {already?"✓ ":""}{t}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}

              {(sa.weekTopics||[]).length>0&&(
                <button className="btn" onClick={buildWeeklySchedule}
                  style={{width:"100%",background:`linear-gradient(135deg,${gc2},${gc2}bb)`,color:"#fff",padding:"13px",borderRadius:12,fontSize:14,fontWeight:800,marginTop:10}}>
                  📅 Build Weekly Schedule ({sa.weekTopics.length} topics → 7 days) →
                </button>
              )}
            </div>
          )}

          {/* ── PHASE: weekly_preview — editable weekly schedule ── */}
          {sa.phase==="weekly_preview"&&(
            <div className="fadeUp">
              <div className="card" style={{padding:"12px 16px",marginBottom:14,borderLeft:`4px solid ${gc2}`}}>
                <div style={{fontFamily:"'Fredoka One'",fontSize:17,color:gc2}}>📅 Your Weekly Schedule</div>
                <div style={{fontSize:12,color:"#888",marginTop:2}}>Topics spread across 7 days (today → next 7 days). Tap ✕ to remove any topic.</div>
              </div>

              {sa.days.map((d,di)=>(
                <div key={di} className="card" style={{padding:"12px 14px",marginBottom:10,borderLeft:`3px solid ${gc2}`}}>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:14,color:gc2,marginBottom:6}}>
                    {d.label||d.date} <span style={{fontWeight:600,color:"#aaa",fontSize:12}}>({d.items.length} worksheet{d.items.length!==1?"s":""})</span>
                  </div>
                  {d.items.length===0?(
                    <div style={{fontSize:12,color:"#ccc",fontStyle:"italic"}}>No topics — add from below</div>
                  ):(
                    d.items.map((item,ii)=>(
                      <div key={ii} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0",fontSize:13}}>
                        <span>{SUBJECTS[item.subject]?.icon} <strong>{item.topic}</strong> <span style={{color:LM[item.level]?.color,fontSize:11}}>({item.level})</span></span>
                        <button className="btn" onClick={()=>removeTopicFromDay(di,ii)}
                          style={{background:"#FFE8E8",color:"#E74C3C",borderRadius:20,padding:"2px 8px",fontSize:10}}>✕</button>
                      </div>
                    ))
                  )}
                </div>
              ))}

              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button className="btn" onClick={()=>setPhase("picking_topics")}
                  style={{flex:1,background:"#F0EFFE",color:"#6C63FF",padding:"11px",borderRadius:12,fontSize:13,fontWeight:800}}>
                  ← Edit Topics
                </button>
                <button className="btn" onClick={launchReview}
                  style={{flex:2,background:`linear-gradient(135deg,${gc2},${gc2}bb)`,color:"#fff",padding:"11px",borderRadius:12,fontSize:13,fontWeight:800}}>
                  ✅ Approve & Review Worksheets →
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  }

  if(screen==="chat") {
    const REQUIRED_SLOTS = ["grade","subject","topic","level"];
    const filledRequired = REQUIRED_SLOTS.filter(k=>chatSlots[k]);
    const allRequired = filledRequired.length === REQUIRED_SLOTS.length;
    const slotColors = {grade:"#6C63FF",subject:"#4FACFE",topic:"#43E97B",level:"#F39C12",theme:"#F9CA24"};

    return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"#F0EFFE",minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      <style>{CSS}</style>
      <Hdr title="💬 Worksheet Chat Assistant" back="p-home"/>

      {/* ── SLOT PROGRESS TRACKER ── */}
      <div style={{background:"#fff",borderBottom:"1px solid #EEE",padding:"10px 16px",maxWidth:680,width:"100%",margin:"0 auto"}}>
        <div style={{fontSize:11,fontWeight:800,color:"#aaa",letterSpacing:.5,marginBottom:7}}>WORKSHEET DETAILS COLLECTED</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {[
            {key:"grade",   icon:"🎓", label:"Grade"},
            {key:"subject", icon:"📚", label:"Subject"},
            {key:"topic",   icon:"📖", label:"Topic"},
            {key:"level",   icon:"🎯", label:"Level"},
            {key:"theme",   icon:"🎨", label:"Theme", optional:true},
          ].map(({key,icon,label,optional})=>{
            const val = chatSlots[key];
            const filled = !!val && val !== "none";
            return (
              <div key={key} style={{
                display:"flex",alignItems:"center",gap:5,
                padding:"5px 12px",borderRadius:50,
                border:`2px solid ${filled?slotColors[key]:"#E8E6FF"}`,
                background:filled?slotColors[key]+"18":"#F9F9F9",
                transition:"all .3s"
              }}>
                <span style={{fontSize:13}}>{icon}</span>
                <div>
                  <div style={{fontSize:9,fontWeight:800,color:filled?slotColors[key]:"#ccc",lineHeight:1,letterSpacing:.3}}>
                    {label}{optional?" (opt)":""}
                  </div>
                  <div style={{fontSize:11,fontWeight:800,color:filled?"#333":"#bbb",lineHeight:1.2,marginTop:1}}>
                    {val && val!=="none" ? val : "—"}
                  </div>
                </div>
                {filled&&<span style={{color:slotColors[key],fontSize:12,fontWeight:900}}>✓</span>}
              </div>
            );
          })}
          {/* Overall progress pill */}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,padding:"5px 14px",borderRadius:50,background:allRequired?"#00B894":"#F0EFFE",color:allRequired?"#fff":"#6C63FF",fontSize:12,fontWeight:800}}>
            {filledRequired.length}/4 {allRequired?"✓ Ready!":"required"}
          </div>
        </div>

        {/* ── QUEUE BASKET ── shows worksheets collected so far */}
        {chatQueue.length>0&&(
          <div style={{marginTop:8,background:"linear-gradient(135deg,#F0FFF8,#E8F8F5)",border:"2px solid #00B894",borderRadius:12,padding:"9px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{fontWeight:800,color:"#00B894",fontSize:12}}>
                🗂️ Worksheet Queue — {chatQueue.length} added
              </div>
              {chatPhase==="generating"&&<span className="pulse" style={{color:"#00B894",fontSize:11,fontWeight:700}}>⟳ Generating…</span>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {chatQueue.map((q,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"#fff",borderRadius:8,padding:"5px 10px"}}>
                  <span style={{width:18,height:18,borderRadius:50,background:"#00B894",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,flexShrink:0}}>{i+1}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#333",flex:1}}>{q.subject} — {q.topic}</span>
                  <span style={{background:LM[q.level]?.bg,color:LM[q.level]?.color,borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:800}}>{LM[q.level]?.emoji} {q.level}</span>
                  <button onClick={()=>setChatQueue(cq=>cq.filter((_,j)=>j!==i))}
                    style={{background:"none",border:"none",color:"#E74C3C",fontSize:14,cursor:"pointer",padding:"0 2px",lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
            {chatPhase==="asking_more"&&(
              <button className="btn" onClick={()=>generateQueuedWorksheets(chatQueue)}
                style={{width:"100%",marginTop:8,background:"linear-gradient(135deg,#00B894,#00CEC9)",color:"#fff",padding:"9px",borderRadius:10,fontSize:13}}>
                🚀 Generate All {chatQueue.length} Worksheets Now →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── MESSAGES ── */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 16px 8px",maxWidth:680,width:"100%",margin:"0 auto"}}>
        {chat.map((m,i)=>(
          <div key={i} className="fadeUp" style={{animationDelay:`${i*0.02}s`}}>
            {/* Message bubble */}
            <div style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:m.chips?.length>0?6:14}}>
              {m.role==="assistant"&&(
                <div style={{width:34,height:34,borderRadius:50,background:"linear-gradient(135deg,#6C63FF,#FF6B6B)",display:"flex",alignItems:"center",justifyContent:"center",marginRight:8,flexShrink:0,fontSize:16,boxShadow:"0 3px 10px #6C63FF44"}}>🤖</div>
              )}
              <div style={{
                maxWidth:"78%",padding:"12px 16px",
                borderRadius:m.role==="user"?"18px 18px 4px 18px":"4px 18px 18px 18px",
                background:m.role==="user"?"linear-gradient(135deg,#6C63FF,#A855F7)":"#fff",
                color:m.role==="user"?"#fff":"#333",
                fontSize:14,lineHeight:1.75,whiteSpace:"pre-wrap",
                boxShadow:m.role==="user"?"0 3px 14px #6C63FF44":"0 2px 10px #00000009"
              }}>
                {m.content}
              </div>
            </div>
            {/* Quick-reply chips */}
            {m.chips?.length>0&&i===chat.length-1&&!chatLoading&&(
              <div style={{display:"flex",flexWrap:"wrap",gap:7,paddingLeft:42,marginBottom:14}}>
                {m.chips.map((chip,ci)=>(
                  <button key={ci} className="btn" onClick={()=>sendChat(chip)}
                    style={{padding:"7px 15px",borderRadius:50,background:"#fff",
                      border:"2px solid #6C63FF",color:"#6C63FF",fontSize:13,
                      boxShadow:"0 2px 8px #6C63FF22",fontFamily:"'Nunito'"}}>
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {chatLoading&&(
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:14}}>
            <div style={{width:34,height:34,borderRadius:50,background:"linear-gradient(135deg,#6C63FF,#FF6B6B)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🤖</div>
            <div style={{background:"#fff",borderRadius:"4px 18px 18px 18px",padding:"12px 16px",boxShadow:"0 2px 10px #00000009",display:"flex",gap:5,alignItems:"center"}}>
              {[0,1,2].map(d=>(
                <div key={d} className="pulse" style={{width:8,height:8,borderRadius:50,background:"#C4B9FF",animationDelay:`${d*0.2}s`}}/>
              ))}
            </div>
          </div>
        )}
        <div ref={chatRef}/>
      </div>

      {/* ── INPUT BAR ── */}
      <div style={{background:"#fff",borderTop:"1px solid #EEE",padding:"12px 16px",maxWidth:680,width:"100%",margin:"0 auto"}}>
        {/* Hint strip */}
        <div style={{fontSize:11,color:"#aaa",marginBottom:7,display:"flex",gap:10,overflowX:"auto",whiteSpace:"nowrap",paddingBottom:2}}>
          {["Grade 2 Maths fractions","Grade 3 English tenses Advanced","Hindi nouns Grade 2 Beginner","Science EVS plants Grade 3"].map(h=>(
            <span key={h} onClick={()=>sendChat(h)} style={{cursor:"pointer",background:"#F5F3FF",color:"#8B7EC8",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,flexShrink:0}}>{h}</span>
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          <input
            value={chatInput}
            onChange={e=>setChatInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()}
            placeholder="Type anything… e.g. 'Maths' or 'Grade 3 English tenses Advanced'"
            style={{...inp,flex:1,borderColor:"#C4B9FF"}}
            disabled={chatLoading}
          />
          <button className="btn" onClick={()=>sendChat()}
            disabled={chatLoading||!chatInput.trim()}
            style={{width:46,height:46,borderRadius:50,background:chatLoading||!chatInput.trim()?"#E8E6FF":"linear-gradient(135deg,#6C63FF,#A855F7)",color:chatLoading||!chatInput.trim()?"#aaa":"#fff",fontSize:20,flexShrink:0,transition:"all .2s"}}>
            ↑
          </button>
        </div>
        {/* Reset */}
        {(chatSlots.grade||chatSlots.subject||chatSlots.topic||chatSlots.level||chatQueue.length>0)&&(
          <button className="btn" onClick={()=>{
            setChatSlots({grade:null,subject:null,topic:null,level:null,theme:null});
            setChatQueue([]);
            setChatPhase("collecting");
            setChat(m=>[...m,{role:"assistant",content:"Sure, let's start fresh! Which grade? 😊",chips:["Grade 2","Grade 3"]}]);
          }} style={{marginTop:8,background:"none",color:"#ccc",fontSize:12,padding:"3px 0",width:"100%",textAlign:"center"}}>
            ↺ Start over
          </button>
        )}
      </div>
      {ParentNav("chat")}
    </div>
  );}

  if(screen==="k-login") return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"linear-gradient(135deg,#FDDB92,#FD7B52)",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{CSS}</style>
      <div className="card pop" style={{padding:36,maxWidth:360,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:60}}>🧒</div>
        <div style={{fontFamily:"'Fredoka One'",fontSize:28,color:"#333",margin:"8px 0"}}>Hi there, Champ!</div>
        <input style={inp} placeholder="Your name"/>
        <input type="password" style={{...inp,marginTop:10}} placeholder="Password"/>
        <button className="btn" onClick={()=>go("k-home")} style={{width:"100%",padding:14,borderRadius:12,background:"linear-gradient(135deg,#FD7B52,#FDDB92)",color:"#fff",fontSize:16,marginTop:14}}>Let's Go! 🚀</button>
        <button className="btn" onClick={()=>go("splash")} style={{background:"none",color:"#aaa",fontSize:14,padding:10,marginTop:6,width:"100%"}}>← Back</button>
      </div>
    </div>
  );

  if(screen==="k-home") {
    const kt = KID_THEMES[kidTheme]||KID_THEMES.default;
    return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:kt.bg,minHeight:"100vh",color:kt.dark?"#E8E6F0":"#333",transition:"background .4s"}}>
      <style>{CSS}</style>
      {/* Theme picker overlay */}
      {showThemePicker&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={()=>setShowThemePicker(false)}>
          <div className="slide-up" style={{background:kt.dark?"#1C1A2E":"#fff",borderRadius:"20px 20px 0 0",padding:"20px 20px 40px",width:"100%",maxWidth:480}}
            onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,background:"#ddd",borderRadius:2,margin:"0 auto 16px"}}/>
            <div style={{fontFamily:"'Fredoka One'",fontSize:18,color:kt.dark?"#fff":"#333",marginBottom:14}}>🎨 Pick Your Theme</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {Object.entries(KID_THEMES).map(([id,t])=>(
                <div key={id} onClick={()=>{setKidTheme(id);setShowThemePicker(false);}}
                  style={{borderRadius:14,overflow:"hidden",cursor:"pointer",border:`3px solid ${kidTheme===id?"#FFD700":"transparent"}`,boxShadow:kidTheme===id?"0 0 0 2px #FFD700":undefined}}>
                  <div style={{background:t.header,height:44,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{t.emoji}</div>
                  <div style={{background:t.card,padding:"6px",textAlign:"center",fontSize:12,fontWeight:800,color:t.dark?"#E8E6F0":"#333"}}>{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div style={{background:kt.header,padding:"20px 20px 28px",color:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",maxWidth:680,margin:"0 auto"}}>
          <div>
            <div style={{fontFamily:"'Fredoka One'",fontSize:24}}>Hello, {kidName}! {kt.emoji}</div>
            <div style={{opacity:.85,fontSize:13}}>Ready to earn stars today?</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn" onClick={()=>setShowThemePicker(true)} style={{background:"rgba(255,255,255,.2)",color:"#fff",padding:"7px 12px",borderRadius:50,fontSize:16}} title="Change theme">🎨</button>
            <button className="btn" onClick={()=>go("splash")} style={{background:"rgba(255,255,255,.2)",color:"#fff",padding:"7px 14px",borderRadius:50,fontSize:13}}>Exit</button>
          </div>
        </div>
      </div>
      <div style={{maxWidth:680,margin:"-14px auto 0",padding:"0 16px"}}>
        <div className="card" style={{padding:"16px 18px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontFamily:"'Fredoka One'",fontSize:22,color:"#FD7B52"}}>⭐ {stars} Stars</div>
            {nextReward&&<div style={{fontSize:12,color:"#aaa"}}>Next: {nextReward.emoji} at {nextReward.pts}⭐</div>}
          </div>
          {nextReward&&<div style={{height:9,background:"#F5F5F5",borderRadius:9,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(100,Math.round((stars/nextReward.pts)*100))}%`,background:"linear-gradient(90deg,#FD7B52,#FDDB92)",borderRadius:9,transition:"width .6s"}}/>
          </div>}
          {earnedBadges.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10}}>
            {earnedBadges.map(b=><span key={b.id} style={{background:b.color+"22",border:`2px solid ${b.color}`,borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:800,color:b.color}}>{b.emoji} {b.name}</span>)}
          </div>}
        </div>
        <div style={{fontFamily:"'Fredoka One'",fontSize:20,color:"#333",marginBottom:12}}>📚 Your Worksheets</div>
        {approved.length===0?(
          <div className="card" style={{padding:40,textAlign:"center",color:"#bbb"}}>
            <div style={{fontSize:44,marginBottom:10}}>😴</div>
            Ask your parent to approve worksheets for you!
          </div>
        ):approved.map(item=>{
          const isDone=done.some(d=>d.subject===item.subject&&d.topic===item.topic&&d.level===item.level);
          const pct2=done.find(d=>d.subject===item.subject&&d.topic===item.topic&&d.level===item.level)?.pct;
          const lm=LM[item.level];
          const subColor=SUBJECTS[item.subject]?.color||gc;
          return(
            <div key={item.id} className="card" style={{overflow:"hidden",marginBottom:12}}>
              <div style={{background:subColor,padding:"10px 16px",color:"#fff",display:"flex",justifyContent:"space-between"}}>
                <span style={{fontFamily:"'Fredoka One'",fontSize:14}}>{item.subject}</span>
                <span style={{fontSize:11,opacity:.8}}>{grade}</span>
              </div>
              <div style={{padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontWeight:800,color:"#333",fontSize:14}}>{item.topic}</div>
                  <span style={{background:lm.bg,color:lm.color,borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:800}}>{lm.emoji} {item.level}</span>
                </div>
                <button className="btn" disabled={isDone}
                  onClick={()=>openWorksheetWithIntro(item.subject,item.topic,item.level,item.wsData)}
                  style={{background:isDone?"#F5F5F5":lm.color,color:isDone?"#aaa":"#fff",border:"none",padding:"9px 18px",borderRadius:50,fontSize:13,opacity:isDone?.7:1}}>
                  {isDone?`✓ ${pct2}%`:`Start · +${lm.pts}⭐`}
                </button>
              </div>
            </div>
          );
        })}
        <div style={{fontFamily:"'Fredoka One'",fontSize:20,color:"#333",margin:"18px 0 10px"}}>🎁 Rewards</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
          {REWARDS.map(r=>{
            const u=stars>=r.pts;
            return(
              <div key={r.pts} className="card" style={{padding:14,opacity:u?1:.45,borderTop:`3px solid ${u?"#FD7B52":"#ddd"}`}}>
                <div style={{fontSize:28}}>{r.emoji}</div>
                <div style={{fontWeight:800,fontSize:13,color:u?"#C0392B":"#aaa",marginTop:4}}>{r.label}</div>
                <div style={{fontSize:11,color:"#ccc",marginTop:2}}>{r.pts}⭐ needed</div>
                {u&&<div style={{color:"#00B894",fontSize:12,fontWeight:800,marginTop:4}}>✅ Unlocked!</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if(showTopicIntro&&topicIntroData){
    const intro=topicIntroData;
    const subColor=SUBJECTS[activeWs?.subject]?.color||"#6C63FF";
    return(
      <div style={{fontFamily:"'Nunito',sans-serif",background:"linear-gradient(180deg,#FFF9E6,#F0EFFE)",minHeight:"100vh",display:"flex",flexDirection:"column"}}>
        <style>{CSS}</style>
        <div style={{background:`linear-gradient(135deg,${subColor},${subColor}bb)`,padding:"16px 18px 22px",color:"#fff"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <button className="btn" onClick={()=>{setShowTopicIntro(false);go("k-home");}} style={{background:"rgba(255,255,255,.2)",color:"#fff",padding:"5px 12px",borderRadius:50,fontSize:12}}>← Back</button>
            <button className="btn" onClick={()=>setAudioEnabled(a=>!a)} style={{background:"rgba(255,255,255,.2)",color:"#fff",padding:"5px 10px",borderRadius:50,fontSize:18}}>{audioEnabled?"🔊":"🔇"}</button>
          </div>
          <div style={{textAlign:"center"}}><div style={{fontSize:60,marginBottom:4}}>{intro.emoji}</div><div style={{fontFamily:"'Fredoka One'",fontSize:24}}>{intro.title}</div><div style={{fontSize:12,opacity:.8,marginTop:2}}>{activeWs?.subject} · {activeWs?.level}</div></div>
        </div>
        <div style={{maxWidth:480,margin:"0 auto",padding:"18px 16px",flex:1}}>
          <div className="card pop" style={{padding:"16px 18px",marginBottom:12,borderTop:`4px solid ${subColor}`}}>
            <div style={{fontFamily:"'Fredoka One'",fontSize:16,color:subColor,marginBottom:6}}>📖 What is {intro.title}?</div>
            <div style={{fontSize:15,color:"#333",lineHeight:1.8,fontWeight:600}}>{intro.explanation}</div>
          </div>
          <div className="card" style={{padding:"14px 16px",marginBottom:12,background:"#FFFDE7",border:"2px solid #F9CA2444"}}>
            <div style={{fontFamily:"'Fredoka One'",fontSize:14,color:"#D4A017",marginBottom:4}}>💡 Example</div>
            <div style={{fontSize:14,color:"#555",lineHeight:1.7}}>{intro.example}</div>
          </div>
          <div className="card" style={{padding:"12px 14px",marginBottom:18,background:"#F0EFFE",border:"2px solid #6C63FF33"}}>
            <div style={{fontFamily:"'Fredoka One'",fontSize:13,color:"#6C63FF",marginBottom:2}}>🧠 Remember!</div>
            <div style={{fontSize:12,color:"#555"}}>{intro.tip}</div>
          </div>
          {audioEnabled&&<button className="btn" onClick={()=>speak(`${intro.explanation} ${intro.example}`)} style={{width:"100%",padding:"9px",background:"#fff",color:subColor,border:`2px solid ${subColor}44`,borderRadius:12,fontSize:13,marginBottom:10}}>🔊 Hear it again</button>}
          <button className="btn" onClick={()=>setShowTopicIntro(false)} style={{width:"100%",padding:"14px",background:`linear-gradient(135deg,${subColor},${subColor}bb)`,color:"#fff",borderRadius:14,fontFamily:"'Fredoka One'",fontSize:19,boxShadow:`0 6px 20px ${subColor}44`}}>{intro.readyPhrase||"Let's Start! 🚀"}</button>
        </div>
      </div>
    );
  }

  if(screen==="worksheet") return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"#F0EFFE",minHeight:"100vh"}}>
      <style>{CSS}</style>
      <Hdr title={activeWs?.topic||"Worksheet"} back={approved.length>0?"k-home":"review"}
        actions={!wsLoading&&wsData&&<button className="btn no-print" onClick={()=>window.print()} style={{background:gc,color:"#fff",padding:"7px 16px",borderRadius:50,fontSize:13}}>🖨️ Print</button>}/>
      <div style={{maxWidth:800,margin:"0 auto",padding:"20px 16px 80px"}}>
        {wsLoading?(
          <div style={{textAlign:"center",padding:60}}>
            <div className="spin" style={{fontSize:60}}>✏️</div>
            <div style={{fontFamily:"'Fredoka One'",fontSize:22,marginTop:18,color:"#333"}}>Building Your Worksheet…</div>
            <div style={{marginTop:16,maxWidth:380,margin:"16px auto 0"}}>
              {LOAD_STEPS.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",opacity:loadStep>=i?1:.25,transition:"opacity .5s"}}>
                  <div style={{width:20,height:20,borderRadius:50,background:loadStep>i?"#00B894":loadStep===i?gc:"#ddd",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:900,flexShrink:0}}>
                    {loadStep>i?"✓":i+1}
                  </div>
                  <span style={{fontSize:13,color:loadStep>=i?"#333":"#aaa",textAlign:"left"}}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        ):(
          <>
            {renderWs(wsData, submitted, answers)}
            {wsData&&!submitted&&(
              <button className="btn" onClick={submitWs}
                style={{width:"100%",padding:15,borderRadius:16,background:`linear-gradient(135deg,${gc},${ga})`,color:"#fff",fontSize:17,marginTop:8,boxShadow:`0 4px 20px ${gc}55`}}>
                Submit Worksheet ✓
              </button>
            )}
            {submitted&&score&&(
              <div className="card pop" style={{padding:28,textAlign:"center",background:`linear-gradient(135deg,${gc}11,${ga}11)`,border:`3px solid ${gc}`,marginTop:8}}>
                <div style={{fontSize:52}}>{score.pct>=90?"🏆":score.pct>=70?"🌟":score.pct>=50?"👍":"💪"}</div>
                <div style={{fontFamily:"'Fredoka One'",fontSize:26,color:gc,margin:"8px 0"}}>
                  {score.pct>=90?"Outstanding!":score.pct>=70?"Great Job!":score.pct>=50?"Good Effort!":"Keep Practising!"}
                </div>
                <div style={{fontSize:20,fontWeight:900,color:"#333"}}>{score.earned}/{score.total} marks ({score.pct}%)</div>
                <div style={{color:"#F9CA24",fontSize:18,fontWeight:800,marginBottom:16}}>+{score.pts} ⭐ Stars!</div>
                <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                  <button className="btn" onClick={()=>window.print()} style={{background:gc,color:"#fff",padding:"10px 22px",borderRadius:50,fontSize:14}}>🖨️ Print</button>
                  <button className="btn" onClick={()=>go(approved.length>0?"k-home":"review")} style={{background:"#F0EFFE",color:"#6C63FF",padding:"10px 22px",borderRadius:50,fontSize:14}}>← Back</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  if(screen==="repository"){
    return(
      <div style={{fontFamily:"'Nunito',sans-serif",background:"#F0EFFE",minHeight:"100vh"}}>
        <style>{CSS}</style>
        <Hdr title="📦 Worksheet Bank" back="p-home"/>
        <div style={{maxWidth:720,margin:"0 auto",padding:"16px 16px 60px"}}>
          <div className="card" style={{padding:"16px",marginBottom:14,borderLeft:"4px solid #6C63FF"}}>
            <div style={{fontFamily:"'Fredoka One'",fontSize:16,color:"#6C63FF",marginBottom:6}}>⚡ Instant Worksheets</div>
            <div style={{fontSize:13,color:"#555",marginBottom:12}}>Pre-generate worksheets so they load in under 1ms instead of 8-12 seconds.</div>
            {pregenRunning&&(
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#00B894",marginBottom:4}}>
                  <span className="pulse">⚙️ Generating…</span><span>{pregenProg.done}/{pregenProg.total}</span>
                </div>
                <div style={{height:6,background:"#E0F8F4",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pregenProg.total>0?Math.round((pregenProg.done/pregenProg.total)*100):0}%`,background:"#00B894",borderRadius:3,transition:"width .5s"}}/>
                </div>
                <div style={{fontSize:11,color:"#00B894",marginTop:4}}>{pregenProg.current}</div>
              </div>
            )}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {Object.keys(GRADES).map(g=>(
                <button key={g} className="btn" onClick={()=>preGenerateGrade(g)} disabled={pregenRunning}
                  style={{background:GRADES[g]?.color,color:"#fff",padding:"8px 16px",borderRadius:50,fontSize:12,fontWeight:800,opacity:pregenRunning?.6:1}}>
                  ⚡ Pre-gen {g}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {Object.keys(GRADES).map(gr=>{
              const totalCached=Object.keys(TOPICS[gr]||{}).reduce((acc,sub)=>{
                (TOPICS[gr][sub]||[]).forEach(t=>['Beginner','Intermediate','Advanced'].forEach(lv=>{for(let i=0;i<3;i++){if(wsCache[cacheKey(gr,sub,t,lv,i)]){acc++;break;}}}));
                return acc;
              },0);
              const totalPossible=Object.keys(TOPICS[gr]||{}).reduce((a,sub)=>a+(TOPICS[gr][sub]||[]).length*3,0);
              return(
                <div key={gr} className="card" style={{padding:"12px",borderTop:`4px solid ${GRADES[gr]?.color}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontWeight:800,color:"#333",fontSize:13}}>{gr}</div>
                    <span style={{fontWeight:800,color:totalCached>0?"#00B894":"#aaa",fontSize:12}}>{totalCached}/{totalPossible}</span>
                  </div>
                  <div style={{height:5,background:"#F0EFFE",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${totalPossible>0?Math.round((totalCached/totalPossible)*100):0}%`,background:GRADES[gr]?.color,borderRadius:3}}/>
                  </div>
                  {Object.keys(SUBJECTS).filter(s=>(TOPICS[gr]||{})[s]).slice(0,5).map(sub=>{
                    let c=0;(TOPICS[gr][sub]||[]).forEach(t=>['Beginner','Intermediate','Advanced'].forEach(lv=>{for(let i=0;i<3;i++){if(wsCache[cacheKey(gr,sub,t,lv,i)]){c++;break;}}}));
                    return(<div key={sub} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"2px 0",color:"#666"}}><span>{SUBJECTS[sub]?.icon} {sub}</span><span style={{fontWeight:700,color:c>0?"#00B894":"#ccc"}}>{c}</span></div>);
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  if(screen==="dashboard") {
    const today = new Date().toLocaleDateString("en-IN");
    const todayDone = done.filter(w=>w.date===today);
    const pendingReview = reviewItems.filter(r=>r.status!=="approved").length;

    const subjectHealth = Object.keys(SUBJECTS).map(subj=>{
      const subDone = done.filter(w=>w.subject?.includes(subj.split("/")[0])||w.subject===subj);
      const subApproved = approved.filter(a=>a.subject===subj).length;
      const avgScore = subDone.length ? Math.round(subDone.reduce((a,b)=>a+b.pct,0)/subDone.length) : null;
      let status, statusColor, statusBg;
      if(!subApproved)                          { status="Not Started"; statusColor="#aaa";    statusBg="#F9F9F9"; }
      else if(!subDone.length)                  { status="Assigned";    statusColor="#6C63FF"; statusBg="#F0EFFE"; }
      else if(avgScore>=80)                     { status="Strong 💪";   statusColor="#00B894"; statusBg="#F0FFF8"; }
      else if(avgScore>=60)                     { status="Good 👍";     statusColor="#F39C12"; statusBg="#FFFDE7"; }
      else                                      { status="Needs Practice 📖"; statusColor="#E74C3C"; statusBg="#FFF5F5"; }
      return { subj, icon:SUBJECTS[subj]?.icon, color:SUBJECTS[subj]?.color, subDone, subApproved, avgScore, status, statusColor, statusBg };
    });

    const dtStyle=(active)=>({padding:"8px 16px",borderRadius:50,border:"none",cursor:"pointer",fontFamily:"'Nunito'",fontWeight:800,fontSize:13,background:active?"#6C63FF":"#fff",color:active?"#fff":"#6C63FF",transition:"all .15s"});

    return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"#F0EFFE",minHeight:"100vh"}}>
      <style>{CSS}</style>
      {/* Hero header */}
      <div style={{background:"linear-gradient(135deg,#6C63FF,#A855F7)",padding:"0 0 20px"}}>
        <div style={{maxWidth:760,margin:"0 auto",padding:"16px 18px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",color:"#fff",marginBottom:18}}>
            <div>
              <div style={{fontSize:11,opacity:.7,letterSpacing:1,fontWeight:700}}>PRACTICENEST · PARENT DASHBOARD</div>
              <div style={{fontFamily:"'Fredoka One'",fontSize:22,marginTop:2}}>📊 Control Center</div>
            </div>
            <button className="btn no-print" onClick={()=>go("p-home")} style={{background:"rgba(255,255,255,.2)",color:"#fff",padding:"8px 16px",borderRadius:50,fontSize:13}}>← Home</button>
          </div>

          {/* Quick stat cards */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {[
              {icon:"🔥",label:"Practice Streak",value:`${streak} days`,  sub:"Keep it up!",      color:"#FF6B35"},
              {icon:"✅",label:"Completed Today", value:todayDone.length,  sub:`of ${approved.length} assigned`,color:"#00B894"},
              {icon:"⏳",label:"Pending Review",  value:pendingReview,     sub:"worksheets",       color:"#F39C12"},
              {icon:"⭐",label:"All-Time Stars",   value:stars,             sub:`${done.length} worksheets`,color:"#F9CA24"},
            ].map(s=>(
              <div key={s.label} style={{background:"rgba(255,255,255,.18)",borderRadius:14,padding:"12px 14px",backdropFilter:"blur(4px)"}}>
                <div style={{fontSize:24,marginBottom:4}}>{s.icon}</div>
                <div style={{fontFamily:"'Fredoka One'",fontSize:22,color:"#fff"}}>{s.value}</div>
                <div style={{fontSize:11,opacity:.8,color:"#fff",marginTop:2,fontWeight:700}}>{s.label}</div>
                <div style={{fontSize:10,opacity:.6,color:"#fff",marginTop:1}}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{background:"#fff",boxShadow:"0 2px 8px #00000008",padding:"10px 18px",display:"flex",gap:8,maxWidth:760,margin:"0 auto",borderRadius:"0 0 14px 14px",position:"sticky",top:0,zIndex:90}}>
        {[{id:"overview",label:"📋 Overview"},{id:"suggestions",label:"💡 Suggestions"},{id:"subjects",label:"📚 Subjects"},{id:"activity",label:"📜 Activity"}].map(t=>(
          <button key={t.id} style={dtStyle(dashTab===t.id)} onClick={()=>setDashTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div style={{maxWidth:760,margin:"0 auto",padding:"18px 16px 80px",display:"grid",gridTemplateColumns:"1fr 280px",gap:18,alignItems:"start"}}>

        {/* ── MAIN COLUMN ── */}
        <div>

          {/* OVERVIEW TAB */}
          {dashTab==="overview"&&<>
            {/* Subject progress strip */}
            <div className="card" style={{padding:"16px 18px",marginBottom:14}}>
              <div style={{fontFamily:"'Fredoka One'",fontSize:16,color:"#333",marginBottom:12}}>📚 Subject Overview</div>
              {subjectHealth.map(({subj,icon,color,subDone,avgScore,status,statusColor,statusBg})=>(
                <div key={subj} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,padding:"10px 12px",background:statusBg,borderRadius:12,border:`1.5px solid ${statusColor}33`}}>
                  <span style={{fontSize:24}}>{icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:13,color:"#333"}}>{subj}</div>
                    <div style={{height:6,background:"#F0F0F0",borderRadius:3,marginTop:5,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${avgScore||0}%`,background:color,borderRadius:3,transition:"width .8s"}}/>
                    </div>
                    <div style={{fontSize:11,color:"#aaa",marginTop:3}}>{subDone.length} worksheets · avg {avgScore||0}%</div>
                  </div>
                  <span style={{background:statusBg,border:`2px solid ${statusColor}`,color:statusColor,borderRadius:20,padding:"3px 11px",fontSize:11,fontWeight:800,whiteSpace:"nowrap"}}>{status}</span>
                </div>
              ))}
            </div>

            {/* Today's summary */}
            <div className="card" style={{padding:"16px 18px",marginBottom:14}}>
              <div style={{fontFamily:"'Fredoka One'",fontSize:16,color:"#333",marginBottom:10}}>☀️ Today at a Glance</div>
              {todayDone.length===0?(
                <div style={{textAlign:"center",padding:"20px",color:"#ccc"}}>
                  <div style={{fontSize:36}}>😴</div>
                  <div style={{marginTop:8,fontSize:14}}>No activity today yet.</div>
                  <button className="btn" onClick={()=>go("builder")} style={{marginTop:10,background:"#6C63FF",color:"#fff",padding:"9px 18px",borderRadius:50,fontSize:13}}>Build Today's Schedule →</button>
                </div>
              ):todayDone.map((w,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:i<todayDone.length-1?"1px solid #F5F5F5":"none"}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:"#333"}}>{w.topic}</div>
                    <div style={{fontSize:12,color:"#aaa"}}>{w.subject} · {w.level}</div>
                  </div>
                  <div style={{fontWeight:900,color:w.pct>=80?"#00B894":w.pct>=50?"#F9CA24":"#E74C3C",fontSize:16}}>{w.pct}%</div>
                </div>
              ))}
            </div>

            {/* Badges */}
            <div className="card" style={{padding:"16px 18px"}}>
              <div style={{fontFamily:"'Fredoka One'",fontSize:16,color:"#333",marginBottom:10}}>🏅 Badges ({earnedBadges.length}/{BADGES.length})</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                {BADGES.map(b=>{
                  const e=earnedBadges.find(x=>x.id===b.id);
                  return(
                    <div key={b.id} title={b.name} style={{textAlign:"center",opacity:e?1:.25,background:e?b.color+"11":"#F9F9F9",borderRadius:12,padding:"10px 6px",border:`2px solid ${e?b.color:"#eee"}`}}>
                      <div style={{fontSize:22}}>{b.emoji}</div>
                      <div style={{fontSize:10,color:"#555",fontWeight:700,marginTop:3,lineHeight:1.2}}>{b.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>}

          {/* SUBJECTS TAB */}
                    {/* SUGGESTIONS TAB */}
          {dashTab==="suggestions"&&(
            <div>
              <div className="card" style={{padding:"12px 14px",marginBottom:10,borderLeft:"4px solid #6C63FF",background:"#F5F3FF"}}>
                <div style={{fontFamily:"'Fredoka One'",fontSize:14,color:"#6C63FF",marginBottom:2}}>💡 AI Smart Suggestions</div>
                <div style={{fontSize:12,color:"#888"}}>Personalised based on your child's actual performance</div>
              </div>
              {renderSmartSuggestions()}
            </div>
          )}

          {dashTab==="subjects"&&<>
            {subjectHealth.map(({subj,icon,color,subDone,subApproved,avgScore,status,statusColor,statusBg})=>(
              <div key={subj} className="card" style={{padding:"16px 18px",marginBottom:12,borderTop:`4px solid ${color}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontFamily:"'Fredoka One'",fontSize:17,color:"#333"}}>{icon} {subj}</div>
                  <span style={{background:statusBg,border:`2px solid ${statusColor}`,color:statusColor,borderRadius:20,padding:"4px 13px",fontSize:12,fontWeight:800}}>{status}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
                  {[{l:"Assigned",v:subApproved},{l:"Completed",v:subDone.length},{l:"Avg Score",v:avgScore?`${avgScore}%`:"—"}].map(s=>(
                    <div key={s.l} style={{background:"#F9F9F9",borderRadius:10,padding:"8px",textAlign:"center"}}>
                      <div style={{fontWeight:900,fontSize:18,color:color}}>{s.v}</div>
                      <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{s.l}</div>
                    </div>
                  ))}
                </div>
                {subDone.length>0&&(
                  <div style={{height:8,background:"#F0F0F0",borderRadius:4,overflow:"hidden",marginBottom:8}}>
                    <div style={{height:"100%",width:`${avgScore||0}%`,background:`linear-gradient(90deg,${color},${color}aa)`,borderRadius:4,transition:"width 1s"}}/>
                  </div>
                )}
                {/* Recent topic scores */}
                {subDone.slice(-3).reverse().map((w,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#555",padding:"4px 0",borderTop:"1px dashed #F0F0F0"}}>
                    <span>{w.topic} · {w.level}</span>
                    <span style={{fontWeight:800,color:w.pct>=80?"#00B894":w.pct>=50?"#F39C12":"#E74C3C"}}>{w.pct}%</span>
                  </div>
                ))}
                <button className="btn" onClick={()=>{setGrade(grade||"Grade 2");setExpandedSub(subj);setBuilderTab("create");go("builder");}}
                  style={{marginTop:10,background:color+"22",color:color,padding:"7px 16px",borderRadius:50,fontSize:12,width:"100%",border:`2px solid ${color}44`}}>
                  + Add more {subj} topics
                </button>
              </div>
            ))}
          </>}

          {/* ACTIVITY TAB */}
          {dashTab==="activity"&&<>
            <div className="card" style={{padding:"16px 18px"}}>
              <div style={{fontFamily:"'Fredoka One'",fontSize:16,color:"#333",marginBottom:12}}>📜 All Activity</div>
              {done.length===0?(
                <div style={{textAlign:"center",padding:32,color:"#ccc"}}><div style={{fontSize:40}}>📭</div><div style={{marginTop:8}}>No worksheets completed yet.</div></div>
              ):[...done].reverse().map((w,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<done.length-1?"1px solid #F5F5F5":"none"}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:"#333"}}>{w.topic}</div>
                    <div style={{fontSize:12,color:"#aaa"}}>{w.subject} · {w.level} · {w.date}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:900,color:w.pct>=80?"#00B894":w.pct>=50?"#F9CA24":"#E74C3C",fontSize:16}}>{w.pct}%</div>
                    <div style={{fontSize:12,color:"#F9CA24",fontWeight:700}}>+{w.pts}⭐</div>
                  </div>
                </div>
              ))}
            </div>
          </>}
        </div>

        {/* ── SIDEBAR: QUICK ACTIONS ── */}
        <div style={{position:"sticky",top:70}}>
          <div className="card" style={{padding:"16px 18px",marginBottom:14}}>
            <div style={{fontFamily:"'Fredoka One'",fontSize:15,color:"#333",marginBottom:12}}>⚡ Quick Actions</div>
            {[
              {icon:"📋",label:"Build New Schedule",    color:"#6C63FF", fn:()=>go("builder")},
              {icon:"💬",label:"Chat Agent",            color:"#FF6B6B", fn:()=>go("chat")},
              {icon:"📄",label:"Review Worksheets",     color:"#F39C12", fn:()=>go("review"),badge:pendingReview>0?pendingReview:null},
              {icon:"🧒",label:"Preview Kid's View",    color:"#00CEC9", fn:()=>go("k-home")},
            ].map(a=>(
              <button key={a.label} className="btn" onClick={a.fn}
                style={{width:"100%",padding:"10px 14px",borderRadius:12,background:a.color+"11",border:`2px solid ${a.color}33`,color:a.color,fontSize:13,textAlign:"left",marginBottom:8,display:"flex",alignItems:"center",gap:8,position:"relative"}}>
                <span style={{fontSize:18}}>{a.icon}</span>
                <span style={{flex:1}}>{a.label}</span>
                {a.badge&&<span style={{background:a.color,color:"#fff",borderRadius:50,padding:"1px 7px",fontSize:11,fontWeight:900}}>{a.badge}</span>}
                <span style={{color:"#ccc"}}>›</span>
              </button>
            ))}
          </div>

          {/* Copy Last Schedule */}
          {lastSchedule&&(
            <div className="card" style={{padding:"14px 16px",marginBottom:14,borderTop:"3px solid #F9CA24"}}>
              <div style={{fontWeight:800,color:"#D4A017",fontSize:13,marginBottom:6}}>♻️ Last Schedule</div>
              <div style={{fontSize:12,color:"#888",marginBottom:4}}>{lastSchedule.gradeId} · {lastSchedule.date}</div>
              <div style={{fontSize:12,color:"#555",marginBottom:10}}>{lastSchedule.items.length} topics · {lastSchedule.themeId?THEMES.find(t=>t.id===lastSchedule.themeId)?.label+" theme":"No theme"}</div>
              <button className="btn" onClick={copyLastSchedule}
                style={{width:"100%",background:"#FFF9E6",color:"#D4A017",padding:"8px",borderRadius:10,fontSize:13,border:"2px solid #F9CA24"}}>
                Copy & Reuse →
              </button>
            </div>
          )}

          {/* Streak card */}
          <div className="card" style={{padding:"14px 16px",background:"linear-gradient(135deg,#FFF3E0,#FFCC02)",border:"2px solid #F9CA24"}}>
            <div style={{fontSize:32,marginBottom:4}}>🔥</div>
            <div style={{fontFamily:"'Fredoka One'",fontSize:20,color:"#D4A017"}}>{streak}-Day Streak!</div>
            <div style={{fontSize:12,color:"#888",marginTop:4}}>Keep the schedule going to maintain the streak.</div>
          </div>
        </div>

      </div>
    </div>
        {/* ── ANALYTICS TAB ── */}
        {dashTab==="analytics"&&renderAnalytics()}

        {/* ── SAFETY / CRASH LOG TAB ── */}
        {dashTab==="crashes"&&(
          <div style={{padding:"16px 0"}}>
            <div className="card" style={{padding:"14px 16px",marginBottom:12,borderLeft:"4px solid #00B894"}}>
              <div style={{fontFamily:"'Fredoka One'",fontSize:15,color:"#00B894",marginBottom:4}}>🛡️ Child Safety Filter</div>
              <div style={{fontSize:13,color:"#555",marginBottom:8}}>Every AI-generated worksheet is scanned for inappropriate content before being shown.</div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{width:10,height:10,borderRadius:50,background:"#00B894"}}/>
                <span style={{fontSize:12,color:"#555",fontWeight:700}}>Active — Local + AI moderation enabled</span>
              </div>
            </div>
            {crashLog.length===0?(
              <div style={{textAlign:"center",padding:"30px 0",color:"#ccc"}}>
                <div style={{fontSize:40,marginBottom:8}}>✅</div>
                <div style={{fontSize:14,fontWeight:700}}>No errors logged</div>
                <div style={{fontSize:12,marginTop:4}}>The app is running smoothly!</div>
              </div>
            ):(
              <div>
                <div style={{fontFamily:"'Fredoka One'",fontSize:15,color:"#E74C3C",marginBottom:8}}>⚠️ Error Log ({crashLog.length})</div>
                {crashLog.slice(0,10).map((e,i)=>(
                  <div key={i} className="card" style={{padding:"10px 12px",marginBottom:8,borderLeft:"3px solid #E74C3C"}}>
                    <div style={{fontWeight:800,fontSize:12,color:"#E74C3C",marginBottom:2}}>{e.context}</div>
                    <div style={{fontSize:11,color:"#555",marginBottom:2,fontFamily:"monospace"}}>{e.msg}</div>
                    <div style={{fontSize:10,color:"#aaa"}}>{e.t} · Screen: {e.screen}</div>
                  </div>
                ))}
                <button className="btn" onClick={()=>{setCrashLog([]);localStorage.removeItem("practicenest_crashes");}}
                  style={{width:"100%",padding:"9px",background:"#FFF5F5",color:"#E74C3C",borderRadius:10,fontWeight:700,fontSize:13,border:"1.5px solid #E74C3C33"}}>
                  🗑️ Clear Error Log
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
      </div>
      {ParentNav("dashboard")}
    </div>
  );}

  return (
    <div>
      {ConfettiOverlay}
      {CertificateModal}
      {safetyBlocked&&(
        <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:"#E74C3C",color:"#fff",padding:"12px 20px",borderRadius:50,zIndex:500,display:"flex",gap:10,alignItems:"center",boxShadow:"0 4px 20px #E74C3C44",maxWidth:340,width:"90%"}}>
          <span style={{fontSize:20,flexShrink:0}}>🛡️</span>
          <div style={{flex:1}}><div style={{fontWeight:800,fontSize:13}}>Content Blocked</div><div style={{fontSize:11,opacity:.85}}>{safetyBlocked.topic}: {safetyBlocked.reason}</div></div>
          <button onClick={()=>setSafetyBlocked(null)} style={{background:"rgba(255,255,255,.2)",border:"none",color:"#fff",borderRadius:50,width:24,height:24,cursor:"pointer",fontSize:14}}>✕</button>
        </div>
      )}
    </div>

  );}
}