// data/ja_kana.js — LANG_DATA.ja.kana（五十音完整表）
//
// 涵蓋清音 46、濁音 20、半濁音 5、拗音 33，共 104 個音，平假名與片假名並列。
// 每個音一筆，id 用 jk-<romaji>（拗音用 jk-kya 這種形式），供 LangStore 的 SRS 卡片使用。
//
// 欄位：
//   id       SRS 卡片 id
//   h        平假名
//   k        片假名
//   romaji   羅馬拼音（訓令式與平文式不同時採平文式，因為初學者查資料比較常遇到）
//   row      所屬行（a/ka/sa/ta/na/ha/ma/ya/ra/wa/n，濁音半濁音沿用母行 + 標記）
//   type     seion（清音）/ dakuon（濁音）/ handakuon（半濁音）/ youon（拗音）
//   tip      發音或字形提示（原創撰寫的繁中說明，只在有值得提醒時才寫）
//
// 發音提示的取向：只寫「中文母語者最常唸錯或寫錯」的地方，不逐字灌水。

window.LANG_DATA = window.LANG_DATA || {};
window.LANG_DATA.ja = window.LANG_DATA.ja || {};

window.LANG_DATA.ja.kana = [
  // ---- あ行 ----
  { id: 'jk-a', h: 'あ', k: 'ア', romaji: 'a', row: 'a', type: 'seion', tip: '嘴形比中文的「啊」小一點，不要張太開。' },
  { id: 'jk-i', h: 'い', k: 'イ', romaji: 'i', row: 'a', type: 'seion' },
  { id: 'jk-u', h: 'う', k: 'ウ', romaji: 'u', row: 'a', type: 'seion', tip: '嘴唇不圓，比中文的「烏」扁，接近沒有嘟嘴的「ㄨ」。' },
  { id: 'jk-e', h: 'え', k: 'エ', romaji: 'e', row: 'a', type: 'seion', tip: '是「ㄝ」不是「ㄟ」，尾巴不要滑音。' },
  { id: 'jk-o', h: 'お', k: 'オ', romaji: 'o', row: 'a', type: 'seion' },

  // ---- か行 ----
  { id: 'jk-ka', h: 'か', k: 'カ', romaji: 'ka', row: 'ka', type: 'seion' },
  { id: 'jk-ki', h: 'き', k: 'キ', romaji: 'ki', row: 'ka', type: 'seion' },
  { id: 'jk-ku', h: 'く', k: 'ク', romaji: 'ku', row: 'ka', type: 'seion' },
  { id: 'jk-ke', h: 'け', k: 'ケ', romaji: 'ke', row: 'ka', type: 'seion' },
  { id: 'jk-ko', h: 'こ', k: 'コ', romaji: 'ko', row: 'ka', type: 'seion' },

  // ---- さ行 ----
  { id: 'jk-sa', h: 'さ', k: 'サ', romaji: 'sa', row: 'sa', type: 'seion' },
  { id: 'jk-shi', h: 'し', k: 'シ', romaji: 'shi', row: 'sa', type: 'seion', tip: '不是 si，是「西」的音。片假名シ與ツ很像，看筆畫方向：シ由左下往右上。' },
  { id: 'jk-su', h: 'す', k: 'ス', romaji: 'su', row: 'sa', type: 'seion' },
  { id: 'jk-se', h: 'せ', k: 'セ', romaji: 'se', row: 'sa', type: 'seion' },
  { id: 'jk-so', h: 'そ', k: 'ソ', romaji: 'so', row: 'sa', type: 'seion', tip: '片假名ソ與ン易混：ソ的第二筆由上往下撇。' },

  // ---- た行 ----
  { id: 'jk-ta', h: 'た', k: 'タ', romaji: 'ta', row: 'ta', type: 'seion' },
  { id: 'jk-chi', h: 'ち', k: 'チ', romaji: 'chi', row: 'ta', type: 'seion', tip: '不是 ti，是「七」的音。' },
  { id: 'jk-tsu', h: 'つ', k: 'ツ', romaji: 'tsu', row: 'ta', type: 'seion', tip: '不是 tu，舌尖抵齒背再放開，像「ㄘ」。片假名ツ由上往下點兩點。' },
  { id: 'jk-te', h: 'て', k: 'テ', romaji: 'te', row: 'ta', type: 'seion' },
  { id: 'jk-to', h: 'と', k: 'ト', romaji: 'to', row: 'ta', type: 'seion' },

  // ---- な行 ----
  { id: 'jk-na', h: 'な', k: 'ナ', romaji: 'na', row: 'na', type: 'seion' },
  { id: 'jk-ni', h: 'に', k: 'ニ', romaji: 'ni', row: 'na', type: 'seion' },
  { id: 'jk-nu', h: 'ぬ', k: 'ヌ', romaji: 'nu', row: 'na', type: 'seion', tip: '平假名ぬ與め易混：ぬ右下多一個圈。' },
  { id: 'jk-ne', h: 'ね', k: 'ネ', romaji: 'ne', row: 'na', type: 'seion' },
  { id: 'jk-no', h: 'の', k: 'ノ', romaji: 'no', row: 'na', type: 'seion' },

  // ---- は行 ----
  { id: 'jk-ha', h: 'は', k: 'ハ', romaji: 'ha', row: 'ha', type: 'seion', tip: '當助詞時唸 wa，不唸 ha（例：わたしは → watashi wa）。' },
  { id: 'jk-hi', h: 'ひ', k: 'ヒ', romaji: 'hi', row: 'ha', type: 'seion' },
  { id: 'jk-fu', h: 'ふ', k: 'フ', romaji: 'fu', row: 'ha', type: 'seion', tip: '上下唇輕輕送氣，不是英文咬下唇的 f。' },
  { id: 'jk-he', h: 'へ', k: 'ヘ', romaji: 'he', row: 'ha', type: 'seion', tip: '當助詞時唸 e，不唸 he（表方向：がっこうへ → gakkou e）。' },
  { id: 'jk-ho', h: 'ほ', k: 'ホ', romaji: 'ho', row: 'ha', type: 'seion' },

  // ---- ま行 ----
  { id: 'jk-ma', h: 'ま', k: 'マ', romaji: 'ma', row: 'ma', type: 'seion' },
  { id: 'jk-mi', h: 'み', k: 'ミ', romaji: 'mi', row: 'ma', type: 'seion' },
  { id: 'jk-mu', h: 'む', k: 'ム', romaji: 'mu', row: 'ma', type: 'seion' },
  { id: 'jk-me', h: 'め', k: 'メ', romaji: 'me', row: 'ma', type: 'seion' },
  { id: 'jk-mo', h: 'も', k: 'モ', romaji: 'mo', row: 'ma', type: 'seion' },

  // ---- や行 ----
  { id: 'jk-ya', h: 'や', k: 'ヤ', romaji: 'ya', row: 'ya', type: 'seion' },
  { id: 'jk-yu', h: 'ゆ', k: 'ユ', romaji: 'yu', row: 'ya', type: 'seion' },
  { id: 'jk-yo', h: 'よ', k: 'ヨ', romaji: 'yo', row: 'ya', type: 'seion' },

  // ---- ら行 ----
  { id: 'jk-ra', h: 'ら', k: 'ラ', romaji: 'ra', row: 'ra', type: 'seion', tip: 'ら行介於中文的ㄌ與ㄖ之間，舌尖輕彈上顎一下，不要捲舌。' },
  { id: 'jk-ri', h: 'り', k: 'リ', romaji: 'ri', row: 'ra', type: 'seion' },
  { id: 'jk-ru', h: 'る', k: 'ル', romaji: 'ru', row: 'ra', type: 'seion', tip: '平假名る與ろ差在最後有沒有收成圈。' },
  { id: 'jk-re', h: 'れ', k: 'レ', romaji: 're', row: 'ra', type: 'seion' },
  { id: 'jk-ro', h: 'ろ', k: 'ロ', romaji: 'ro', row: 'ra', type: 'seion' },

  // ---- わ行 + ん ----
  { id: 'jk-wa', h: 'わ', k: 'ワ', romaji: 'wa', row: 'wa', type: 'seion' },
  { id: 'jk-wo', h: 'を', k: 'ヲ', romaji: 'wo', row: 'wa', type: 'seion', tip: '現代日語幾乎只當受格助詞用，發音等同 o。' },
  { id: 'jk-n', h: 'ん', k: 'ン', romaji: 'n', row: 'n', type: 'seion', tip: '獨立佔一拍。後接 b/p/m 時唸成 m（例：しんぶん 聽起來像 shimbun）。' },

  // ---- 濁音 が行 ----
  { id: 'jk-ga', h: 'が', k: 'ガ', romaji: 'ga', row: 'ka', type: 'dakuon' },
  { id: 'jk-gi', h: 'ぎ', k: 'ギ', romaji: 'gi', row: 'ka', type: 'dakuon' },
  { id: 'jk-gu', h: 'ぐ', k: 'グ', romaji: 'gu', row: 'ka', type: 'dakuon' },
  { id: 'jk-ge', h: 'げ', k: 'ゲ', romaji: 'ge', row: 'ka', type: 'dakuon' },
  { id: 'jk-go', h: 'ご', k: 'ゴ', romaji: 'go', row: 'ka', type: 'dakuon' },

  // ---- 濁音 ざ行 ----
  { id: 'jk-za', h: 'ざ', k: 'ザ', romaji: 'za', row: 'sa', type: 'dakuon' },
  { id: 'jk-ji', h: 'じ', k: 'ジ', romaji: 'ji', row: 'sa', type: 'dakuon', tip: '與ぢ同音，但現代日語幾乎都寫じ。' },
  { id: 'jk-zu', h: 'ず', k: 'ズ', romaji: 'zu', row: 'sa', type: 'dakuon' },
  { id: 'jk-ze', h: 'ぜ', k: 'ゼ', romaji: 'ze', row: 'sa', type: 'dakuon' },
  { id: 'jk-zo', h: 'ぞ', k: 'ゾ', romaji: 'zo', row: 'sa', type: 'dakuon' },

  // ---- 濁音 だ行 ----
  { id: 'jk-da', h: 'だ', k: 'ダ', romaji: 'da', row: 'ta', type: 'dakuon' },
  { id: 'jk-dji', h: 'ぢ', k: 'ヂ', romaji: 'ji', row: 'ta', type: 'dakuon', tip: '與じ同音，只在少數複合詞出現（如 はなぢ 鼻血）。' },
  { id: 'jk-dzu', h: 'づ', k: 'ヅ', romaji: 'zu', row: 'ta', type: 'dakuon', tip: '與ず同音，只在少數複合詞出現（如 つづく 続く）。' },
  { id: 'jk-de', h: 'で', k: 'デ', romaji: 'de', row: 'ta', type: 'dakuon' },
  { id: 'jk-do', h: 'ど', k: 'ド', romaji: 'do', row: 'ta', type: 'dakuon' },

  // ---- 濁音 ば行 ----
  { id: 'jk-ba', h: 'ば', k: 'バ', romaji: 'ba', row: 'ha', type: 'dakuon' },
  { id: 'jk-bi', h: 'び', k: 'ビ', romaji: 'bi', row: 'ha', type: 'dakuon' },
  { id: 'jk-bu', h: 'ぶ', k: 'ブ', romaji: 'bu', row: 'ha', type: 'dakuon' },
  { id: 'jk-be', h: 'べ', k: 'ベ', romaji: 'be', row: 'ha', type: 'dakuon' },
  { id: 'jk-bo', h: 'ぼ', k: 'ボ', romaji: 'bo', row: 'ha', type: 'dakuon' },

  // ---- 半濁音 ぱ行 ----
  { id: 'jk-pa', h: 'ぱ', k: 'パ', romaji: 'pa', row: 'ha', type: 'handakuon', tip: '右上是小圈○不是兩點，與ば行只差這裡。' },
  { id: 'jk-pi', h: 'ぴ', k: 'ピ', romaji: 'pi', row: 'ha', type: 'handakuon' },
  { id: 'jk-pu', h: 'ぷ', k: 'プ', romaji: 'pu', row: 'ha', type: 'handakuon' },
  { id: 'jk-pe', h: 'ぺ', k: 'ペ', romaji: 'pe', row: 'ha', type: 'handakuon' },
  { id: 'jk-po', h: 'ぽ', k: 'ポ', romaji: 'po', row: 'ha', type: 'handakuon' },

  // ---- 拗音（い段 + 小さやゆよ，兩個字合起來只佔一拍）----
  { id: 'jk-kya', h: 'きゃ', k: 'キャ', romaji: 'kya', row: 'ka', type: 'youon', tip: '小さい「ゃ」寫小一點，整組只算一拍。' },
  { id: 'jk-kyu', h: 'きゅ', k: 'キュ', romaji: 'kyu', row: 'ka', type: 'youon' },
  { id: 'jk-kyo', h: 'きょ', k: 'キョ', romaji: 'kyo', row: 'ka', type: 'youon' },
  { id: 'jk-gya', h: 'ぎゃ', k: 'ギャ', romaji: 'gya', row: 'ka', type: 'youon' },
  { id: 'jk-gyu', h: 'ぎゅ', k: 'ギュ', romaji: 'gyu', row: 'ka', type: 'youon' },
  { id: 'jk-gyo', h: 'ぎょ', k: 'ギョ', romaji: 'gyo', row: 'ka', type: 'youon' },
  { id: 'jk-sha', h: 'しゃ', k: 'シャ', romaji: 'sha', row: 'sa', type: 'youon' },
  { id: 'jk-shu', h: 'しゅ', k: 'シュ', romaji: 'shu', row: 'sa', type: 'youon' },
  { id: 'jk-sho', h: 'しょ', k: 'ショ', romaji: 'sho', row: 'sa', type: 'youon' },
  { id: 'jk-ja', h: 'じゃ', k: 'ジャ', romaji: 'ja', row: 'sa', type: 'youon' },
  { id: 'jk-ju', h: 'じゅ', k: 'ジュ', romaji: 'ju', row: 'sa', type: 'youon' },
  { id: 'jk-jo', h: 'じょ', k: 'ジョ', romaji: 'jo', row: 'sa', type: 'youon' },
  { id: 'jk-cha', h: 'ちゃ', k: 'チャ', romaji: 'cha', row: 'ta', type: 'youon' },
  { id: 'jk-chu', h: 'ちゅ', k: 'チュ', romaji: 'chu', row: 'ta', type: 'youon' },
  { id: 'jk-cho', h: 'ちょ', k: 'チョ', romaji: 'cho', row: 'ta', type: 'youon' },
  { id: 'jk-nya', h: 'にゃ', k: 'ニャ', romaji: 'nya', row: 'na', type: 'youon' },
  { id: 'jk-nyu', h: 'にゅ', k: 'ニュ', romaji: 'nyu', row: 'na', type: 'youon' },
  { id: 'jk-nyo', h: 'にょ', k: 'ニョ', romaji: 'nyo', row: 'na', type: 'youon' },
  { id: 'jk-hya', h: 'ひゃ', k: 'ヒャ', romaji: 'hya', row: 'ha', type: 'youon' },
  { id: 'jk-hyu', h: 'ひゅ', k: 'ヒュ', romaji: 'hyu', row: 'ha', type: 'youon' },
  { id: 'jk-hyo', h: 'ひょ', k: 'ヒョ', romaji: 'hyo', row: 'ha', type: 'youon' },
  { id: 'jk-bya', h: 'びゃ', k: 'ビャ', romaji: 'bya', row: 'ha', type: 'youon' },
  { id: 'jk-byu', h: 'びゅ', k: 'ビュ', romaji: 'byu', row: 'ha', type: 'youon' },
  { id: 'jk-byo', h: 'びょ', k: 'ビョ', romaji: 'byo', row: 'ha', type: 'youon' },
  { id: 'jk-pya', h: 'ぴゃ', k: 'ピャ', romaji: 'pya', row: 'ha', type: 'youon' },
  { id: 'jk-pyu', h: 'ぴゅ', k: 'ピュ', romaji: 'pyu', row: 'ha', type: 'youon' },
  { id: 'jk-pyo', h: 'ぴょ', k: 'ピョ', romaji: 'pyo', row: 'ha', type: 'youon' },
  { id: 'jk-mya', h: 'みゃ', k: 'ミャ', romaji: 'mya', row: 'ma', type: 'youon' },
  { id: 'jk-myu', h: 'みゅ', k: 'ミュ', romaji: 'myu', row: 'ma', type: 'youon' },
  { id: 'jk-myo', h: 'みょ', k: 'ミョ', romaji: 'myo', row: 'ma', type: 'youon' },
  { id: 'jk-rya', h: 'りゃ', k: 'リャ', romaji: 'rya', row: 'ra', type: 'youon' },
  { id: 'jk-ryu', h: 'りゅ', k: 'リュ', romaji: 'ryu', row: 'ra', type: 'youon' },
  { id: 'jk-ryo', h: 'りょ', k: 'リョ', romaji: 'ryo', row: 'ra', type: 'youon' }
];

// 五十音的行分組（給 UI 做範圍篩選與五十音表排版用）
window.LANG_DATA.ja.kanaRows = [
  { code: 'a', label: 'あ行' },
  { code: 'ka', label: 'か行（含が・きゃ）' },
  { code: 'sa', label: 'さ行（含ざ・しゃ）' },
  { code: 'ta', label: 'た行（含だ・ちゃ）' },
  { code: 'na', label: 'な行（含にゃ）' },
  { code: 'ha', label: 'は行（含ば・ぱ・ひゃ）' },
  { code: 'ma', label: 'ま行（含みゃ）' },
  { code: 'ya', label: 'や行' },
  { code: 'ra', label: 'ら行（含りゃ）' },
  { code: 'wa', label: 'わ行' },
  { code: 'n', label: 'ん' }
];

window.LANG_DATA.ja.kanaTypes = [
  { code: 'seion', label: '清音', desc: '最基本的 46 音，先把這組背熟。' },
  { code: 'dakuon', label: '濁音', desc: '右上加兩點：か→が、さ→ざ、た→だ、は→ば。' },
  { code: 'handakuon', label: '半濁音', desc: '右上加小圈：は行 → ぱ行，只有 5 個。' },
  { code: 'youon', label: '拗音', desc: 'い段假名 + 小さゃゅょ，兩字合起來只佔一拍。' }
];

// 學習順序建議（原創；依「先能拼出單字」的實用度排，不是單純照表順序）
window.LANG_DATA.ja.kanaPlan = [
  { id: 'jkp-1', label: '第 1 步：あ・か・さ行（15 音）', rows: ['a', 'ka', 'sa'], type: 'seion',
    note: '這 15 個音就能拼出 あさ（早上）、かさ（傘）、いか（花枝）等字。' },
  { id: 'jkp-2', label: '第 2 步：た・な・は行（15 音）', rows: ['ta', 'na', 'ha'], type: 'seion',
    note: '注意 ち(chi)、つ(tsu)、ふ(fu) 三個不規則讀音。' },
  { id: 'jkp-3', label: '第 3 步：ま・や・ら・わ行 + ん（16 音）', rows: ['ma', 'ya', 'ra', 'wa', 'n'], type: 'seion',
    note: '清音到此完成 46 音，可以開始讀簡單單字了。' },
  { id: 'jkp-4', label: '第 4 步：濁音與半濁音（25 音）', rows: null, type: 'dakuon+handakuon',
    note: '只是加兩點或小圈，記規則不必死背：か→が、は→ば→ぱ。' },
  { id: 'jkp-5', label: '第 5 步：拗音（33 音）', rows: null, type: 'youon',
    note: '記住「い段 + 小ゃゅょ」的組合規則就好，不用一個一個背。' },
  { id: 'jkp-6', label: '第 6 步：片假名', rows: null, type: 'katakana',
    note: '外來語幾乎都用片假名。ソ/ン、シ/ツ 這兩組最容易搞混，多練幾次。' }
];
