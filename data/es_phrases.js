// data/es_phrases.js — LANG_DATA.es.phrases（A1 常用句型 32 條）
//
// 依「使用場合」分組，每一條都是可以直接開口用的整句，不是拆散的文法點。
// A1 階段記整句比記規則有效：先能講，文法之後自然會補上。
//
// 欄位：id / group 場合 / es 西語 / zh 中文 / pattern 可替換的句型（可選）
//       swaps 可替換的詞（可選，讓學習者知道怎麼舉一反三）/ note 補充說明（可選）
// 全部原創撰寫。

window.LANG_DATA = window.LANG_DATA || {};
window.LANG_DATA.es = window.LANG_DATA.es || {};

window.LANG_DATA.es.phraseGroups = [
  { code: 'greet', label: '打招呼與寒暄', desc: '見面第一句，先把這幾條練到不用想。' },
  { code: 'self', label: '自我介紹', desc: '講清楚你是誰、從哪來、做什麼。' },
  { code: 'ask', label: '提問與求助', desc: '聽不懂、想問路、想要東西時用。' },
  { code: 'shop', label: '購物與點餐', desc: '旅行中使用頻率最高的一組。' },
  { code: 'polite', label: '禮貌用語', desc: '西語文化很重視這些，加上去差很多。' }
];

window.LANG_DATA.es.phrases = [
  // ---- 打招呼 ----
  { id: 'esp-01', group: 'greet', es: 'Hola.', zh: '你好。',
    note: 'h 不發音，唸「歐拉」。任何時間都能用。' },
  { id: 'esp-02', group: 'greet', es: 'Buenos días.', zh: '早安。',
    note: '用到中午為止。注意是複數形 días。' },
  { id: 'esp-03', group: 'greet', es: 'Buenas tardes.', zh: '午安、下午好。',
    note: '中午過後到天黑前。' },
  { id: 'esp-04', group: 'greet', es: 'Buenas noches.', zh: '晚安。',
    note: '天黑後見面和道別都可以用，這點和英文不同。' },
  { id: 'esp-05', group: 'greet', es: '¿Cómo estás?', zh: '你好嗎？',
    pattern: '¿Cómo está usted?', note: '對不熟的人或長輩用 usted 版本比較禮貌。' },
  { id: 'esp-06', group: 'greet', es: 'Muy bien, gracias. ¿Y tú?', zh: '很好，謝謝。你呢？',
    note: '回答時記得反問回去，這是西語對話的基本禮節。' },
  { id: 'esp-07', group: 'greet', es: 'Hasta luego.', zh: '待會見、再見。',
    note: '最通用的道別語，不一定真的等一下會見面。' },
  { id: 'esp-08', group: 'greet', es: 'Hasta mañana.', zh: '明天見。' },
  { id: 'esp-09', group: 'greet', es: 'Mucho gusto.', zh: '幸會、很高興認識你。',
    note: '初次見面握手時說。' },

  // ---- 自我介紹 ----
  { id: 'esp-10', group: 'self', es: 'Me llamo Ana.', zh: '我叫安娜。',
    pattern: 'Me llamo ＿＿.', swaps: ['你的名字'],
    note: '字面是「我把自己叫作…」。也可以說 Soy Ana.' },
  { id: 'esp-11', group: 'self', es: '¿Cómo te llamas?', zh: '你叫什麼名字？',
    note: '禮貌版：¿Cómo se llama usted?' },
  { id: 'esp-12', group: 'self', es: 'Soy de Taiwán.', zh: '我來自台灣。',
    pattern: 'Soy de ＿＿.', swaps: ['España', 'Japón', 'Estados Unidos'],
    note: '講來源用 ser + de。' },
  { id: 'esp-13', group: 'self', es: 'Tengo veinticinco años.', zh: '我二十五歲。',
    pattern: 'Tengo ＿＿ años.',
    note: '西語講年齡用 tener（有）不是 ser（是），這點和中英文都不同。' },
  { id: 'esp-14', group: 'self', es: 'Soy estudiante.', zh: '我是學生。',
    pattern: 'Soy ＿＿.', swaps: ['profesor', 'médico', 'ingeniero'],
    note: '講職業時前面不加冠詞，不說 Soy un estudiante。' },
  { id: 'esp-15', group: 'self', es: 'Hablo un poco de español.', zh: '我會說一點西班牙語。',
    note: '旅行時非常實用的一句，能讓對方放慢速度。' },
  { id: 'esp-16', group: 'self', es: 'Estoy aprendiendo español.', zh: '我正在學西班牙語。',
    note: 'estar + 現在分詞 = 正在進行。' },
  { id: 'esp-17', group: 'self', es: 'Vivo en Taipéi.', zh: '我住在台北。',
    pattern: 'Vivo en ＿＿.' },

  // ---- 提問與求助 ----
  { id: 'esp-18', group: 'ask', es: 'No entiendo.', zh: '我不懂。',
    note: '聽不懂時最重要的一句，先講這句對方就會換方式說。' },
  { id: 'esp-19', group: 'ask', es: '¿Puedes hablar más despacio, por favor?', zh: '可以請你說慢一點嗎？',
    note: '學語言時最實用的請求。' },
  { id: 'esp-20', group: 'ask', es: '¿Cómo se dice ＿＿ en español?', zh: '＿＿ 的西班牙語怎麼說？',
    note: '學新字的萬用句型。' },
  { id: 'esp-21', group: 'ask', es: '¿Dónde está el baño?', zh: '廁所在哪裡？',
    pattern: '¿Dónde está ＿＿?', swaps: ['la estación', 'el hotel', 'el banco'],
    note: '問位置用 estar 不用 ser。' },
  { id: 'esp-22', group: 'ask', es: '¿Hablas inglés?', zh: '你會說英語嗎？' },
  { id: 'esp-23', group: 'ask', es: '¿Me puedes ayudar?', zh: '你可以幫我嗎？' },
  { id: 'esp-24', group: 'ask', es: '¿Qué hora es?', zh: '現在幾點？',
    note: '回答用 Son las tres.（三點）；只有一點時說 Es la una.' },
  { id: 'esp-25', group: 'ask', es: 'Estoy perdido.', zh: '我迷路了。',
    note: '女生說 Estoy perdida，形容詞要跟著性別變。' },

  // ---- 購物與點餐 ----
  { id: 'esp-26', group: 'shop', es: '¿Cuánto cuesta?', zh: '這個多少錢？',
    pattern: '¿Cuánto cuestan?', note: '問複數物品時動詞變 cuestan。' },
  { id: 'esp-27', group: 'shop', es: 'Quiero esto, por favor.', zh: '我要這個，麻煩了。',
    note: '不知道東西怎麼說時，指著它講這句就行。' },
  { id: 'esp-28', group: 'shop', es: 'Un café con leche, por favor.', zh: '請給我一杯拿鐵。',
    pattern: 'Un／Una ＿＿, por favor.',
    note: '點餐最簡單的說法：數量 + 品項 + por favor。' },
  { id: 'esp-29', group: 'shop', es: 'La cuenta, por favor.', zh: '麻煩結帳。' },
  { id: 'esp-30', group: 'shop', es: '¿Puedo pagar con tarjeta?', zh: '我可以刷卡嗎？' },

  // ---- 禮貌用語 ----
  { id: 'esp-31', group: 'polite', es: 'Por favor. / Gracias. / De nada.', zh: '請。／謝謝。／不客氣。',
    note: '這三個是西語世界的基本禮貌，用得比英文還頻繁。' },
  { id: 'esp-32', group: 'polite', es: 'Perdón. / Lo siento.', zh: '不好意思（借過、引起注意）。／對不起（道歉）。',
    note: 'Perdón 用於輕微打擾，Lo siento 用於真的做錯事或表達遺憾。' }
];
