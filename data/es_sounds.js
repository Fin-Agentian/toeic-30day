// data/es_sounds.js — LANG_DATA.es.sounds（西班牙語發音規則 22 條）+ 重音規則
//
// 西班牙語的好消息：拼字與發音幾乎一一對應，把這 22 條規則記熟之後，
// 看到任何生字都能唸出來 —— 這是西語比英語容易入門最大的原因。
//
// 欄位：
//   id / group 分類 / title 規則名稱 / rule 規則說明 / examples [{es, ipaHint, zh}]
//   trap 中文母語者常犯的錯（原創撰寫，只在真的容易錯的地方才寫）
//
// 發音提示用「近似中文注音／國語音」描述，不用 IPA，因為初學者看得懂比精確重要；
// 真正精確的音還是要靠 TTS 聽（本頁每條規則的例字都可以點來聽）。
// 腔調以西班牙標準（Castellano）為準，與拉丁美洲不同處會特別標註。

window.LANG_DATA = window.LANG_DATA || {};
window.LANG_DATA.es = window.LANG_DATA.es || {};

window.LANG_DATA.es.soundGroups = [
  { code: 'vowel', label: '母音', desc: '只有 5 個，而且永遠只有一種唸法。' },
  { code: 'tricky', label: '容易唸錯的子音', desc: '和英文長一樣但唸法不同的字母。' },
  { code: 'combo', label: '字母組合', desc: '兩個字母合起來變一個音。' },
  { code: 'stress', label: '重音規則', desc: '三條規則決定重音落在哪，沒有例外。' }
];

window.LANG_DATA.es.sounds = [
  // ---- 母音 ----
  { id: 'es-s01', group: 'vowel', title: '五個母音，永遠只有一種唸法',
    rule: 'a=ㄚ、e=ㄝ、i=ㄧ、o=ㄛ、u=ㄨ。不像英文同一個字母有好幾種唸法，西語母音永遠不變。',
    examples: [
      { es: 'casa', zh: '房子', hint: 'ㄎㄚ-ㄙㄚ' },
      { es: 'mesa', zh: '桌子', hint: 'ㄇㄝ-ㄙㄚ' },
      { es: 'libro', zh: '書', hint: 'ㄌㄧ-ㄅㄨㄛ' }
    ],
    trap: '英文的母音會滑音（如 no 唸成 nou），西語不會。o 就是短促的ㄛ，不要拖成ㄡ。' },

  { id: 'es-s02', group: 'vowel', title: '母音不弱化',
    rule: '不管重音在不在該音節，每個母音都要唸得一樣清楚飽滿。',
    examples: [
      { es: 'teléfono', zh: '電話', hint: '四個音節每個母音都清楚' },
      { es: 'chocolate', zh: '巧克力', hint: 'ㄑㄧㄡ-ㄎㄛ-ㄌㄚ-ㄊㄝ' }
    ],
    trap: '英文非重音母音會弱化成含糊的 ə（如 banana 的前兩個 a），西語沒有這回事。' },

  { id: 'es-s03', group: 'vowel', title: '雙母音（強弱組合算一個音節）',
    rule: 'a/e/o 是強母音，i/u 是弱母音。強+弱 或 弱+弱 合成一個音節；強+強 要拆成兩個音節。',
    examples: [
      { es: 'bueno', zh: '好的', hint: 'bue 是一個音節：ㄅㄨㄝ' },
      { es: 'agua', zh: '水', hint: 'a-gua 兩音節' },
      { es: 'leer', zh: '閱讀', hint: 'le-er 兩音節（兩個強母音要拆開）' }
    ],
    trap: '算音節會影響重音位置，所以雙母音要能分辨。' },

  // ---- 容易唸錯的子音 ----
  { id: 'es-s04', group: 'tricky', title: 'h 永遠不發音',
    rule: '西語的 h 是啞音，完全不唸，不管在字首還是字中。',
    examples: [
      { es: 'hola', zh: '你好', hint: '唸「歐拉」，不是「后拉」' },
      { es: 'hospital', zh: '醫院', hint: '唸「歐斯必踏」' },
      { es: 'hermano', zh: '兄弟', hint: '唸「艾兒馬諾」' }
    ],
    trap: '這是最常見的初學錯誤。看到 h 就當它不存在。' },

  { id: 'es-s05', group: 'tricky', title: 'j 唸喉嚨音（類似注音的ㄏ但更後面）',
    rule: 'j 的音在喉嚨深處摩擦，像用力吐氣的ㄏ。',
    examples: [
      { es: 'trabajo', zh: '工作', hint: 'ㄊㄨㄚ-ㄅㄚ-ㄏㄡ' },
      { es: 'hijo', zh: '兒子', hint: '「伊后」（h 不發音、j 發喉音）' },
      { es: 'jueves', zh: '星期四', hint: 'ㄏㄨㄝ-ㄅㄝㄙ' }
    ],
    trap: '不要唸成英文的 j（像 jump 的音），那是完全不同的音。' },

  { id: 'es-s06', group: 'tricky', title: 'c 看後面的母音決定唸法',
    rule: 'c + a/o/u → ㄎ；c + e/i → 西班牙唸「θ（咬舌的 th）」、拉美唸「ㄙ」。',
    examples: [
      { es: 'casa', zh: '房子', hint: 'ㄎㄚㄙㄚ' },
      { es: 'cine', zh: '電影院', hint: '西班牙：θi-ne；拉美：si-ne' },
      { es: 'cocina', zh: '廚房', hint: 'co 唸ㄎㄛ、ci 唸θi/si' }
    ],
    trap: '同一個字裡 c 可能有兩種唸法（cocina），要逐個看後面的母音。' },

  { id: 'es-s07', group: 'tricky', title: 'g 看後面的母音決定唸法',
    rule: 'g + a/o/u → ㄍ；g + e/i → 和 j 一樣的喉嚨音。',
    examples: [
      { es: 'gato', zh: '貓', hint: 'ㄍㄚㄊㄡ' },
      { es: 'gente', zh: '人們', hint: '唸成 hen-te（喉音）' },
      { es: 'gimnasio', zh: '健身房', hint: 'gi 唸喉音' }
    ],
    trap: 'g 和 c 的規則平行：後面接 e/i 就變音。記一條等於記兩條。' },

  { id: 'es-s08', group: 'tricky', title: 'z 的唸法',
    rule: 'z 在西班牙唸咬舌的 θ，在拉丁美洲唸ㄙ。z 後面接什麼母音都一樣。',
    examples: [
      { es: 'zapato', zh: '鞋子', hint: '西班牙：θa-pa-to；拉美：sa-pa-to' },
      { es: 'plaza', zh: '廣場', hint: 'pla-θa / pla-sa' }
    ],
    trap: '兩種腔調都是對的，選一種用就好。本網站的 TTS 語音設為 es-ES（西班牙）。' },

  { id: 'es-s09', group: 'tricky', title: 'b 和 v 唸法完全相同',
    rule: '兩個字母都唸ㄅ。西語母語者靠背拼字來區分，不是靠聽。',
    examples: [
      { es: 'vivir', zh: '居住', hint: '唸 bi-bir' },
      { es: 'beber', zh: '喝', hint: '唸 be-ber' },
      { es: 'vaca', zh: '母牛', hint: '唸 ba-ca' }
    ],
    trap: '不要用英文的 v（咬下唇）。西語沒有那個音。' },

  { id: 'es-s10', group: 'tricky', title: 'r 有兩種：輕彈與顫音',
    rule: '字中的單個 r 是舌尖輕彈一下；rr、以及字首的 r，要彈出連續顫音。',
    examples: [
      { es: 'pero', zh: '但是', hint: '單彈：pe-ro' },
      { es: 'perro', zh: '狗', hint: '顫音：pe-rrro' },
      { es: 'rojo', zh: '紅色', hint: '字首 r 也要顫音' }
    ],
    trap: 'pero（但是）和 perro（狗）只差在顫音，是最經典的最小差異對。顫音練不出來不用急，先把單彈的 r 唸準，溝通上不會誤會。' },

  { id: 'es-s11', group: 'tricky', title: 'd 在字中會軟化',
    rule: '字首的 d 是ㄉ；夾在母音之間或字尾的 d 會軟化成接近英文 the 的 th。',
    examples: [
      { es: 'dos', zh: '二', hint: '字首：ㄉㄡㄙ' },
      { es: 'nada', zh: '沒什麼', hint: '中間的 d 軟化：na-tha' },
      { es: 'usted', zh: '您', hint: '字尾 d 很輕，幾乎聽不到' }
    ],
    trap: '初學階段一律唸ㄉ也聽得懂，但學會軟化會讓口音自然很多。' },

  { id: 'es-s12', group: 'tricky', title: 'ñ 是獨立的字母',
    rule: '唸法接近「ㄋㄧ」連在一起，像中文的「尼」但更黏。',
    examples: [
      { es: 'español', zh: '西班牙語', hint: 'es-pa-ñol' },
      { es: 'año', zh: '年', hint: 'a-ño（注意：ano 沒有波浪號是完全不同的字）' },
      { es: 'mañana', zh: '明天／早上', hint: 'ma-ña-na' }
    ],
    trap: 'ñ 和 n 是兩個不同的字母，波浪號不能省略，會變成別的字。' },

  // ---- 字母組合 ----
  { id: 'es-s13', group: 'combo', title: 'll 唸成 y',
    rule: '兩個 l 連在一起唸成類似注音ㄧ的音（部分地區唸成類似「居」）。',
    examples: [
      { es: 'llamar', zh: '呼叫、打電話', hint: 'ya-mar' },
      { es: 'calle', zh: '街道', hint: 'ca-ye' },
      { es: 'lluvia', zh: '雨', hint: 'yu-bia' }
    ],
    trap: '不要唸成兩個 l。ll 是一個音。' },

  { id: 'es-s14', group: 'combo', title: 'qu 的 u 不發音',
    rule: 'qu 只出現在 e/i 前面，整組唸ㄎ，中間的 u 是啞的。',
    examples: [
      { es: 'que', zh: '什麼、that', hint: '唸 ke，不是 kwe' },
      { es: 'aquí', zh: '這裡', hint: 'a-ki' },
      { es: 'quince', zh: '十五', hint: 'kin-θe / kin-se' }
    ],
    trap: '英文 queen 的 qu 唸 kw，西語不是。' },

  { id: 'es-s15', group: 'combo', title: 'gu + e/i 的 u 也不發音',
    rule: '要讓 g 在 e/i 前面保持ㄍ的音，就寫成 gue/gui，這時 u 不發音。',
    examples: [
      { es: 'guitarra', zh: '吉他', hint: 'gi-ta-rra（不是 gwi）' },
      { es: 'guerra', zh: '戰爭', hint: 'ge-rra' }
    ],
    trap: '如果真的要唸出 u 的音，要在 u 上加兩點：güe / güi（如 pingüino 企鵝）。' },

  { id: 'es-s16', group: 'combo', title: 'ch 唸ㄑ',
    rule: '接近中文的「切」的聲母，和英文 chair 的 ch 相同。',
    examples: [
      { es: 'chico', zh: '男孩', hint: 'ㄑㄧ-ㄎㄡ' },
      { es: 'noche', zh: '夜晚', hint: 'no-che' },
      { es: 'ocho', zh: '八', hint: 'o-cho' }
    ],
    trap: '這條和英文一樣，不用特別記。' },

  { id: 'es-s17', group: 'combo', title: 'y 的兩種身分',
    rule: '單獨一個 y 是「和」，唸ㄧ；在字裡當子音時唸法同 ll。',
    examples: [
      { es: 'y', zh: '和', hint: '唸 i' },
      { es: 'yo', zh: '我', hint: '唸 yo' },
      { es: 'playa', zh: '海灘', hint: 'pla-ya' }
    ],
    trap: '「pan y agua（麵包和水）」的 y 就只是一個ㄧ音。' },

  { id: 'es-s18', group: 'combo', title: 'x 的唸法',
    rule: '多數情況唸 ks；在少數源自原住民語的字（尤其墨西哥地名）唸喉音 h。',
    examples: [
      { es: 'taxi', zh: '計程車', hint: 'tak-si' },
      { es: 'examen', zh: '考試', hint: 'ek-sa-men' },
      { es: 'México', zh: '墨西哥', hint: '唸 Mé-hi-co（喉音）' }
    ],
    trap: 'México 是最有名的例外，記住這個字就好。' },

  // ---- 重音規則 ----
  { id: 'es-s19', group: 'stress', title: '規則一：字尾是母音、n 或 s → 重音在倒數第二音節',
    rule: '這涵蓋了大多數西語單字，包含幾乎所有的動詞現在式變化。',
    examples: [
      { es: 'casa', zh: '房子', hint: 'CA-sa' },
      { es: 'hablan', zh: '他們說', hint: 'HA-blan' },
      { es: 'libros', zh: '書（複數）', hint: 'LI-bros' }
    ],
    trap: '記住「母音、n、s」這三個結尾，因為名詞複數(-s)和動詞(-n)都落在這一類。' },

  { id: 'es-s20', group: 'stress', title: '規則二：字尾是其他子音 → 重音在最後一個音節',
    rule: '字尾是 r、l、d、z 等子音時，重音落在最後。',
    examples: [
      { es: 'hablar', zh: '說（原形）', hint: 'ha-BLAR' },
      { es: 'español', zh: '西班牙語', hint: 'es-pa-ÑOL' },
      { es: 'ciudad', zh: '城市', hint: 'ciu-DAD' }
    ],
    trap: '動詞原形都以 -ar/-er/-ir 結尾，所以重音一律在最後，這點很好記。' },

  { id: 'es-s21', group: 'stress', title: '規則三：有重音符號就聽它的',
    rule: '寫了 á é í ó ú 的地方就是重音所在，直接覆蓋前兩條規則。',
    examples: [
      { es: 'teléfono', zh: '電話', hint: 'te-LÉ-fo-no' },
      { es: 'está', zh: '（他）在', hint: 'es-TÁ' },
      { es: 'inglés', zh: '英語', hint: 'in-GLÉS' }
    ],
    trap: '重音符號不是裝飾。esta（這個）和 está（在）是不同的字，寫錯意思就變了。' },

  { id: 'es-s22', group: 'stress', title: '重音符號也用來區分同音字',
    rule: '有些單音節字加重音符號純粹是為了和另一個字區分，唸法一樣。',
    examples: [
      { es: 'tu / tú', zh: '你的 / 你', hint: '唸法相同，意思不同' },
      { es: 'el / él', zh: '（冠詞）the / 他', hint: '唸法相同' },
      { es: 'si / sí', zh: '如果 / 是的', hint: '唸法相同' }
    ],
    trap: '寫作時容易漏掉，但這幾組是 A1 階段最常用的字，值得一開始就記清楚。' }
];
