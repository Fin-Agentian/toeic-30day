// data/es_verbs.js — LANG_DATA.es.verbs（現在式動詞變位）+ 變位規則說明
//
// A1 階段最大的關卡就是動詞變位。西語動詞會依「誰做的」改字尾，六個人稱六種形態，
// 但規則性很強：先背 -ar/-er/-ir 三組規則字尾，再處理不規則動詞。
//
// 六個人稱固定順序（本檔所有 forms 陣列都照這個順序）：
//   0 yo（我）        1 tú（你）        2 él/ella/usted（他/她/您）
//   3 nosotros（我們）4 vosotros（你們）5 ellos/ustedes（他們/您們）
//
// 欄位：
//   id / inf 原形 / zh 中文 / type 分類 / forms 六個變位 / note 說明
//   type：ar / er / ir（完全規則）、e-ie / o-ue / e-i（字幹變化）、irregular（不規則）
//
// 全部為 A1 最高頻的 20 個動詞。變位為西班牙語標準現在式（presente de indicativo）。

window.LANG_DATA = window.LANG_DATA || {};
window.LANG_DATA.es = window.LANG_DATA.es || {};

window.LANG_DATA.es.persons = [
  { code: 'yo', label: 'yo', zh: '我' },
  { code: 'tu', label: 'tú', zh: '你' },
  { code: 'el', label: 'él / ella / usted', zh: '他 / 她 / 您' },
  { code: 'nosotros', label: 'nosotros', zh: '我們' },
  { code: 'vosotros', label: 'vosotros', zh: '你們' },
  { code: 'ellos', label: 'ellos / ustedes', zh: '他們 / 您們' }
];

window.LANG_DATA.es.verbTypes = [
  { code: 'ar', label: '-ar 規則', desc: '最大的一組，約六成的西語動詞屬於這類。' },
  { code: 'er', label: '-er 規則', desc: '字尾與 -ar 只差母音 e/a。' },
  { code: 'ir', label: '-ir 規則', desc: '和 -er 幾乎一樣，只有 nosotros / vosotros 不同。' },
  { code: 'e-ie', label: '字幹 e→ie', desc: '重音落在字幹時 e 變 ie，nosotros/vosotros 不變。' },
  { code: 'o-ue', label: '字幹 o→ue', desc: '同上，但變化的是 o → ue。' },
  { code: 'e-i', label: '字幹 e→i', desc: '只出現在 -ir 動詞。' },
  { code: 'irregular', label: '不規則', desc: '最常用的動詞往往最不規則，只能背。' }
];

// 三組規則字尾（教學用；UI 會把它排成表格）
window.LANG_DATA.es.endings = [
  { type: 'ar', model: 'hablar', endings: ['-o', '-as', '-a', '-amos', '-áis', '-an'] },
  { type: 'er', model: 'comer', endings: ['-o', '-es', '-e', '-emos', '-éis', '-en'] },
  { type: 'ir', model: 'vivir', endings: ['-o', '-es', '-e', '-imos', '-ís', '-en'] }
];

window.LANG_DATA.es.verbs = [
  // ---- -ar 規則 ----
  { id: 'esv-hablar', inf: 'hablar', zh: '說話', type: 'ar',
    forms: ['hablo', 'hablas', 'habla', 'hablamos', 'habláis', 'hablan'],
    note: '-ar 動詞的標準範本。把 hablar 的 -ar 去掉剩 habl-，再加六個字尾。',
    ex: 'Hablo un poco de español.', exZh: '我會說一點西班牙語。' },
  { id: 'esv-trabajar', inf: 'trabajar', zh: '工作', type: 'ar',
    forms: ['trabajo', 'trabajas', 'trabaja', 'trabajamos', 'trabajáis', 'trabajan'],
    note: '完全照 -ar 規則，沒有例外。',
    ex: 'Ella trabaja en un hospital.', exZh: '她在醫院工作。' },
  { id: 'esv-estudiar', inf: 'estudiar', zh: '學習', type: 'ar',
    forms: ['estudio', 'estudias', 'estudia', 'estudiamos', 'estudiáis', 'estudian'],
    note: '注意字幹是 estudi-，所以 yo 是 estudio（不是 estudo）。',
    ex: 'Estudio español todos los días.', exZh: '我每天學西班牙語。' },
  { id: 'esv-comprar', inf: 'comprar', zh: '購買', type: 'ar',
    forms: ['compro', 'compras', 'compra', 'compramos', 'compráis', 'compran'],
    note: '規則 -ar 動詞。',
    ex: 'Compramos pan en la panadería.', exZh: '我們在麵包店買麵包。' },
  { id: 'esv-necesitar', inf: 'necesitar', zh: '需要', type: 'ar',
    forms: ['necesito', 'necesitas', 'necesita', 'necesitamos', 'necesitáis', 'necesitan'],
    note: '後面可以直接接名詞或原形動詞：Necesito dormir.（我需要睡覺。）',
    ex: 'Necesito ayuda, por favor.', exZh: '我需要幫忙，麻煩了。' },

  // ---- -er 規則 ----
  { id: 'esv-comer', inf: 'comer', zh: '吃', type: 'er',
    forms: ['como', 'comes', 'come', 'comemos', 'coméis', 'comen'],
    note: '-er 動詞的標準範本。和 -ar 的差別只在字尾的母音（as→es、amos→emos）。',
    ex: '¿Qué comes normalmente?', exZh: '你平常吃什麼？' },
  { id: 'esv-beber', inf: 'beber', zh: '喝', type: 'er',
    forms: ['bebo', 'bebes', 'bebe', 'bebemos', 'bebéis', 'beben'],
    note: '規則 -er 動詞。',
    ex: 'Bebo café por la mañana.', exZh: '我早上喝咖啡。' },
  { id: 'esv-aprender', inf: 'aprender', zh: '學會、學習', type: 'er',
    forms: ['aprendo', 'aprendes', 'aprende', 'aprendemos', 'aprendéis', 'aprenden'],
    note: '常搭配 a + 原形：aprender a nadar（學游泳）。',
    ex: 'Aprendemos español juntos.', exZh: '我們一起學西班牙語。' },
  { id: 'esv-leer', inf: 'leer', zh: '閱讀', type: 'er',
    forms: ['leo', 'lees', 'lee', 'leemos', 'leéis', 'leen'],
    note: '字幹是 le-，所以會出現兩個 e 相連（leer、lees），這是正常的。',
    ex: 'Leo un libro cada mes.', exZh: '我每個月讀一本書。' },

  // ---- -ir 規則 ----
  { id: 'esv-vivir', inf: 'vivir', zh: '居住、生活', type: 'ir',
    forms: ['vivo', 'vives', 'vive', 'vivimos', 'vivís', 'viven'],
    note: '-ir 動詞的標準範本。和 -er 只有 nosotros（-imos）和 vosotros（-ís）不同，其餘完全一樣。',
    ex: 'Vivo en Taipéi.', exZh: '我住在台北。' },
  { id: 'esv-escribir', inf: 'escribir', zh: '書寫', type: 'ir',
    forms: ['escribo', 'escribes', 'escribe', 'escribimos', 'escribís', 'escriben'],
    note: '規則 -ir 動詞。',
    ex: 'Escribo un correo a mi amigo.', exZh: '我寫一封信給我朋友。' },
  { id: 'esv-abrir', inf: 'abrir', zh: '打開', type: 'ir',
    forms: ['abro', 'abres', 'abre', 'abrimos', 'abrís', 'abren'],
    note: '規則 -ir 動詞。',
    ex: 'La tienda abre a las nueve.', exZh: '這家店九點開門。' },

  // ---- 字幹變化 e → ie ----
  { id: 'esv-querer', inf: 'querer', zh: '想要、愛', type: 'e-ie',
    forms: ['quiero', 'quieres', 'quiere', 'queremos', 'queréis', 'quieren'],
    note: '重音落在字幹的四個人稱（yo/tú/él/ellos）e 變 ie；nosotros 和 vosotros 保持原樣。這種「鞋子形」變化很常見。',
    ex: 'Quiero un café con leche.', exZh: '我要一杯拿鐵。' },
  { id: 'esv-pensar', inf: 'pensar', zh: '想、認為', type: 'e-ie',
    forms: ['pienso', 'piensas', 'piensa', 'pensamos', 'pensáis', 'piensan'],
    note: '同 querer 的 e→ie 模式，但字尾走 -ar 規則。',
    ex: 'Pienso que es una buena idea.', exZh: '我認為這是個好主意。' },
  { id: 'esv-empezar', inf: 'empezar', zh: '開始', type: 'e-ie',
    forms: ['empiezo', 'empiezas', 'empieza', 'empezamos', 'empezáis', 'empiezan'],
    note: '常搭配 a + 原形：empezar a trabajar（開始工作）。',
    ex: 'La clase empieza a las ocho.', exZh: '課八點開始。' },

  // ---- 字幹變化 o → ue ----
  { id: 'esv-poder', inf: 'poder', zh: '能夠、可以', type: 'o-ue',
    forms: ['puedo', 'puedes', 'puede', 'podemos', 'podéis', 'pueden'],
    note: '後面直接接原形動詞。¿Puedo...? 是問「我可以…嗎」最常用的句型。',
    ex: '¿Puedo pagar con tarjeta?', exZh: '我可以刷卡嗎？' },
  { id: 'esv-dormir', inf: 'dormir', zh: '睡覺', type: 'o-ue',
    forms: ['duermo', 'duermes', 'duerme', 'dormimos', 'dormís', 'duermen'],
    note: 'o→ue 加上 -ir 字尾。nosotros/vosotros 一樣不變化。',
    ex: 'Duermo ocho horas cada noche.', exZh: '我每晚睡八小時。' },
  { id: 'esv-volver', inf: 'volver', zh: '返回', type: 'o-ue',
    forms: ['vuelvo', 'vuelves', 'vuelve', 'volvemos', 'volvéis', 'vuelven'],
    note: 'o→ue 加上 -er 字尾。',
    ex: 'Vuelvo a casa a las seis.', exZh: '我六點回家。' },

  // ---- 字幹變化 e → i ----
  { id: 'esv-pedir', inf: 'pedir', zh: '要求、點餐', type: 'e-i',
    forms: ['pido', 'pides', 'pide', 'pedimos', 'pedís', 'piden'],
    note: 'e→i 只發生在 -ir 動詞。點餐時最常用的動詞。',
    ex: 'Pido la cuenta, por favor.', exZh: '麻煩結帳。' },

  // ---- 不規則（最常用也最不規則）----
  { id: 'esv-ser', inf: 'ser', zh: '是（本質、身分）', type: 'irregular',
    forms: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
    note: '完全不規則，必須背。用於本質性的描述：身分、國籍、職業、個性、時間。',
    ex: 'Soy de Taiwán y soy estudiante.', exZh: '我來自台灣，我是學生。' },
  { id: 'esv-estar', inf: 'estar', zh: '在、處於（狀態、位置）', type: 'irregular',
    forms: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
    note: '和 ser 都翻成「是」，但用於位置與暫時狀態。ser 是「本質」，estar 是「現況」。',
    ex: 'Estoy cansado hoy.', exZh: '我今天很累。' },
  { id: 'esv-tener', inf: 'tener', zh: '擁有', type: 'irregular',
    forms: ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen'],
    note: 'yo 是不規則的 tengo，其餘走 e→ie。年齡也用 tener：Tengo 25 años.（我 25 歲。）',
    ex: 'Tengo dos hermanos.', exZh: '我有兩個兄弟姊妹。' },
  { id: 'esv-ir', inf: 'ir', zh: '去', type: 'irregular',
    forms: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
    note: '完全不規則。ir + a + 原形 = 即將要做（近未來）：Voy a comer.（我要去吃飯。）',
    ex: 'Voy al mercado los sábados.', exZh: '我週六去市場。' },
  { id: 'esv-hacer', inf: 'hacer', zh: '做、製作', type: 'irregular',
    forms: ['hago', 'haces', 'hace', 'hacemos', 'hacéis', 'hacen'],
    note: '只有 yo 不規則（hago），其餘照 -er 規則。天氣也用 hace：Hace calor.（天氣熱。）',
    ex: '¿Qué haces este fin de semana?', exZh: '你這個週末要做什麼？' },
  { id: 'esv-decir', inf: 'decir', zh: '說、告訴', type: 'irregular',
    forms: ['digo', 'dices', 'dice', 'decimos', 'decís', 'dicen'],
    note: 'yo 不規則（digo）＋ 字幹 e→i。兩種不規則疊在一起。',
    ex: 'Dice que llega tarde.', exZh: '他說他會遲到。' },
  { id: 'esv-venir', inf: 'venir', zh: '來', type: 'irregular',
    forms: ['vengo', 'vienes', 'viene', 'venimos', 'venís', 'vienen'],
    note: '和 tener 同模式：yo 是 -go 結尾，其餘 e→ie。',
    ex: '¿Vienes conmigo?', exZh: '你要跟我一起來嗎？' },
  { id: 'esv-saber', inf: 'saber', zh: '知道、會（技能）', type: 'irregular',
    forms: ['sé', 'sabes', 'sabe', 'sabemos', 'sabéis', 'saben'],
    note: 'yo 是很特別的 sé。saber + 原形 = 會做某事：Sé nadar.（我會游泳。）',
    ex: 'No sé dónde está.', exZh: '我不知道它在哪裡。' },
  { id: 'esv-ver', inf: 'ver', zh: '看見', type: 'irregular',
    forms: ['veo', 'ves', 've', 'vemos', 'veis', 'ven'],
    note: '只有 yo 多一個 e（veo），其餘接近規則 -er。',
    ex: 'Veo una película esta noche.', exZh: '我今晚要看一部電影。' },
  { id: 'esv-dar', inf: 'dar', zh: '給', type: 'irregular',
    forms: ['doy', 'das', 'da', 'damos', 'dais', 'dan'],
    note: 'yo 是 doy（和 soy、voy、estoy 同樣以 -oy 結尾，這四個一起記）。',
    ex: 'Te doy mi número.', exZh: '我給你我的號碼。' },
  { id: 'esv-salir', inf: 'salir', zh: '出去、離開', type: 'irregular',
    forms: ['salgo', 'sales', 'sale', 'salimos', 'salís', 'salen'],
    note: 'yo 是 salgo，其餘完全照 -ir 規則。',
    ex: 'Salgo de casa a las siete.', exZh: '我七點出門。' }
];

// ser vs estar 的判斷指南（A1 最大的困惑點，值得單獨一張表）
window.LANG_DATA.es.serEstar = {
  title: 'ser 還是 estar？',
  intro: '兩個都翻成中文的「是」，但用錯意思會變。判準：講「這是什麼東西」用 ser，講「現在怎麼樣、在哪裡」用 estar。',
  ser: [
    { use: '身分、職業', ex: 'Soy profesor.', zh: '我是老師。' },
    { use: '國籍、來源', ex: 'Es de México.', zh: '他來自墨西哥。' },
    { use: '個性、本質特徵', ex: 'María es simpática.', zh: '瑪麗亞人很好。' },
    { use: '時間、日期', ex: 'Son las tres.', zh: '現在三點。' },
    { use: '所有權', ex: 'El libro es mío.', zh: '這本書是我的。' }
  ],
  estar: [
    { use: '位置', ex: 'El banco está aquí.', zh: '銀行在這裡。' },
    { use: '暫時的身心狀態', ex: 'Estoy cansado.', zh: '我很累。' },
    { use: '情緒', ex: 'Está contenta hoy.', zh: '她今天很開心。' },
    { use: '進行中的動作', ex: 'Estoy comiendo.', zh: '我正在吃飯。' }
  ],
  contrast: [
    { es: 'Es aburrido. / Está aburrido.', zh: '他很無聊（個性）。／他覺得無聊（現在）。' },
    { es: 'Es guapo. / Está guapo.', zh: '他長得帥（本質）。／他今天很帥（打扮）。' },
    { es: 'La sopa es rica. / La sopa está rica.', zh: '湯是好料理（本質）。／這湯很好喝（現在嚐起來）。' }
  ]
};
