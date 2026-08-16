// data/reading_frameworks.js — TOEIC_DATA.reading
//
// 閱讀（Part 5/6/7）強化教材：文法判斷框架、官方配速表、Part 7 題型攻略、錯因分類。
// 供 #/reading 閱讀診斷室與 #/quiz 結果頁引用。
//
// 內容全為原創撰寫的繁體中文教學材料，例句自行編寫，不含任何正式試題內容。
// 題型結構、題數與作答時間依 ETS TOEIC Listening & Reading 公開測驗簡介整理：
//   https://www.ets.org/toeic/test-takers/listening-reading/about.html
//
// 設計取向：使用者閱讀分數偏低（RC 約 120／495）時，最有效率的加分順序是
//   1) Part 5 文法判斷（考點固定、秒殺率最高）
//   2) Part 7 定位與同義改寫（題數最多，但需要配速支撐）
//   3) Part 6 篇章邏輯（題數少，靠 5/7 的底子自然帶起來）
// 因此 frameworks 以 Part 5 十大考點為主軸，每條都對得上 data/questions_p5_*.js 的 tag，
// 讓「診斷 → 讀框架 → 專項練習」形成一個閉環。

window.TOEIC_DATA = window.TOEIC_DATA || {};
window.TOEIC_DATA.reading = {

  // -------------------------------------------------------------------
  // 一、十大文法判斷框架（對應 P5 tag，可由診斷室直接連到專項練習）
  // -------------------------------------------------------------------
  frameworks: [
    {
      id: 'fw-pos',
      tag: 'pos',
      title: '詞性判斷：先看空格左右，不要讀整句',
      when: '四個選項是同字根的變化（success / successful / successfully / succeed）時，這題考詞性，不考語意。',
      steps: [
        '遮住選項，只看空格「前一個字」和「後一個字」。',
        '冠詞（a / an / the）、所有格（our / its）、形容詞之後 → 填名詞。',
        'be 動詞、感官動詞、become / remain 之後 → 填形容詞（當補語）。',
        '完整句子裡多出來的修飾語、或修飾形容詞與動詞的位置 → 填副詞。',
        '主詞後面沒有動詞、或 to / 助動詞之後 → 填動詞。'
      ],
      example: {
        en: 'The new filing system has made the office noticeably more ______.',
        zh: '新的檔案系統讓辦公室明顯更有效率。',
        point: 'more ______ 是比較級結構，中間只能放形容詞（efficient），不能放名詞 efficiency 或副詞 efficiently。'
      },
      trap: '看到 -ly 就直覺選副詞。副詞不能當 be 動詞的補語，也不能放在冠詞後面。',
      seconds: 15
    },
    {
      id: 'fw-tense',
      tag: 'tense',
      title: '時態：找時間線索字，找不到就看前後句',
      when: '選項是同一個動詞的不同時態（arrives / arrived / will arrive / has arrived）。',
      steps: [
        '掃描全句找時間標記：yesterday / last month → 過去式。',
        'since + 時間點、for + 一段時間、so far、recently → 現在完成式。',
        'next week、by tomorrow、soon → 未來式或未來完成式。',
        'every day、usually、each quarter → 現在簡單式。',
        '完全沒有線索時，看同段落其他句子的時態，商用文件通常前後一致。'
      ],
      example: {
        en: 'The maintenance team ______ the elevators three times since January.',
        zh: '維修團隊自一月以來已經檢查電梯三次。',
        point: 'since January 是完成式的招牌線索，選 has inspected。'
      },
      trap: 'by + 未來時間點常搭配未來完成式（will have finished），不是單純未來式。',
      seconds: 20
    },
    {
      id: 'fw-voice',
      tag: 'participle',
      title: '主動 vs. 被動：問「主詞是做的人還是被做的東西」',
      when: '選項同時出現 V-ing 與 V-ed／be + p.p. 的組合。',
      steps: [
        '找出空格的主詞是誰。',
        '主詞自己執行動作 → 主動（The manager approved…）。',
        '主詞承受動作 → 被動（The request was approved…）。',
        '動詞後面已經有受詞 → 幾乎不可能是被動。',
        '分詞當形容詞時：-ing 表「主動、令人…」，-ed 表「被動、感到…」。'
      ],
      example: {
        en: 'All invoices ______ before the end of the fiscal quarter.',
        zh: '所有發票須在本會計季結束前處理完畢。',
        point: 'invoices 是被處理的對象，且後面沒有受詞，選 must be processed。'
      },
      trap: 'interesting／interested、confusing／confused 這類分詞形容詞：修飾「事物」用 -ing，修飾「人的感受」用 -ed。',
      seconds: 20
    },
    {
      id: 'fw-agreement',
      tag: 'agreement',
      title: '主謂一致：把中間的修飾語整段刪掉再看',
      when: '選項只差在單複數（is / are、has / have、requires / require）。',
      steps: [
        '找到真正的主詞，把介系詞片語、關係子句整段用手遮掉。',
        'each / every / either / neither / one of + 名詞 → 視為單數。',
        'A and B → 複數；A as well as B、A along with B → 動詞跟著 A。',
        '不可數名詞（information、equipment、advice、staff 作整體）→ 單數。',
        'The number of… → 單數；A number of… → 複數。'
      ],
      example: {
        en: 'Each of the branch managers ______ required to submit a monthly summary.',
        zh: '每一位分店經理都必須繳交月報。',
        point: '主詞是 Each（單數），of the branch managers 只是修飾語，選 is。'
      },
      trap: '被 of 後面的複數名詞牽著走。決定動詞的是 of 前面的字。',
      seconds: 15
    },
    {
      id: 'fw-prep',
      tag: 'prep',
      title: '介系詞：先分「時間、地點、還是固定搭配」',
      when: '四個選項都是介系詞（in / on / at / by / for / during / within）。',
      steps: [
        '時間：at + 時刻、on + 日期或星期、in + 月份年份季節。',
        '期限：by = 不遲於（一次性動作）、until = 持續到（持續性動作）。',
        '期間：during + 名詞（during the meeting）、for + 一段長度（for two hours）、within = 在…之內。',
        '先確認空格後面是名詞還是子句 — 後面接子句就不是介系詞。',
        '確認是不是動詞或形容詞的固定搭配（depend on、responsible for、comply with）。'
      ],
      example: {
        en: 'Please submit the reimbursement form ______ five business days of your trip.',
        zh: '請於出差後五個工作天內繳交核銷單。',
        point: 'five business days 是一段長度且語意為「之內」，選 within。'
      },
      trap: 'by 與 until 最常混。「繳交、完成、抵達」用 by；「營業、等待、停留」用 until。',
      seconds: 20
    },
    {
      id: 'fw-conj',
      tag: 'conj',
      title: '連接詞 vs. 介系詞：看空格後面是「子句」還是「名詞」',
      when: 'although / despite、because / because of、while / during 這種成對出現在選項時。',
      steps: [
        '看空格後面到逗號為止，有沒有「主詞＋動詞」。',
        '有主詞動詞 → 用連接詞：because、although、while、if、unless、so that。',
        '只有名詞片語 → 用介系詞：because of、despite、in spite of、during。',
        '再確認邏輯方向：轉折（although、however）還是因果（because、therefore）。',
        'however、therefore、nevertheless 是副詞，不能直接連接兩個子句，前面要有句號或分號。'
      ],
      example: {
        en: '______ the heavy rain, the outdoor launch event proceeded as scheduled.',
        zh: '儘管下大雨，戶外發表會仍照原訂計畫進行。',
        point: '後面 the heavy rain 是名詞片語，不是子句，所以要用介系詞 Despite，不能用 Although。'
      },
      trap: '中文都翻成「雖然」，但 although 後接子句、despite 後接名詞，這是最高頻的送分題。',
      seconds: 20
    },
    {
      id: 'fw-relative',
      tag: 'relative',
      title: '關係詞：先看先行詞是人是物，再看後面缺什麼',
      when: '選項是 who / which / whose / where / that / what 的組合。',
      steps: [
        '找空格前面的先行詞：人 → who／whom，物 → which，人物皆可 → that。',
        '看關係子句裡缺什麼：缺主詞 → who／which；缺受詞 → whom／which（可省略）。',
        '子句完整、只是補充所有關係 → whose + 名詞。',
        '子句完整且先行詞是地點、時間、原因 → where / when / why。',
        '前面根本沒有先行詞 → what（等於 the thing that）。'
      ],
      example: {
        en: 'We hired a consultant ______ recommendations reduced shipping costs by 12 percent.',
        zh: '我們聘請了一位顧問，他的建議讓運費降低了 12%。',
        point: '空格後 recommendations 是完整名詞、子句也不缺主詞，是「顧問的建議」，選 whose。'
      },
      trap: '看到人就反射選 who。若後面緊接名詞且子句不缺元素，答案是 whose。',
      seconds: 25
    },
    {
      id: 'fw-verbal',
      tag: 'other',
      title: '不定詞 vs. 動名詞：記動詞的習慣，不要憑語感',
      when: '選項出現 to V 與 V-ing 並列。',
      steps: [
        '接 to V：plan、decide、agree、hope、offer、refuse、manage、afford。',
        '接 V-ing：avoid、finish、consider、suggest、recommend、enjoy、mind、postpone。',
        '介系詞（to 當介系詞時也算）後面一律 V-ing：look forward to seeing、be committed to improving。',
        '表目的用 in order to V／so as to V。',
        'be used to + V-ing（習慣於）vs. used to + V（過去經常），兩者不同。'
      ],
      example: {
        en: 'The board postponed ______ the merger until the audit is complete.',
        zh: '董事會將併購案延後到稽核完成之後。',
        point: 'postpone 後面固定接動名詞，選 approving。'
      },
      trap: 'look forward to、be dedicated to、object to 的 to 是介系詞，後面接 V-ing 不是原形動詞。',
      seconds: 20
    },
    {
      id: 'fw-comparison',
      tag: 'comparison',
      title: '比較級與最高級：找 than、the、範圍字',
      when: '選項是 large / larger / largest / more large 這類階梯。',
      steps: [
        '句中有 than → 比較級。',
        '有 the 且有範圍（in the region、of all applicants）→ 最高級。',
        'as ______ as 之間一律放原級。',
        'much / far / even / significantly 可以修飾比較級，very 不行。',
        '兩者之間用比較級，三者以上才用最高級。'
      ],
      example: {
        en: 'This year\'s conference attracted far ______ participants than last year\'s.',
        zh: '今年研討會吸引的參加者遠多於去年。',
        point: 'than 出現、且 far 修飾比較級，選 more。'
      },
      trap: 'more expensive 已經是比較級，不會再寫成 more expensiver；看到雙重比較級直接刪。',
      seconds: 15
    },
    {
      id: 'fw-pronoun',
      tag: 'pronoun',
      title: '代名詞：看空格在句中的「職位」',
      when: '選項是 he / him / his / himself 這種同一人稱的四種格。',
      steps: [
        '空格當主詞 → 主格（he、they）。',
        '空格在動詞或介系詞後面當受詞 → 受格（him、them）。',
        '空格後面接名詞 → 所有格（his、their）。',
        '空格後面沒有名詞、且要表示「…的東西」 → 所有格代名詞（his、theirs）。',
        '動作回到主詞自己身上 → 反身代名詞（himself、themselves）。'
      ],
      example: {
        en: 'Employees who complete the survey may keep the results for ______ own records.',
        zh: '完成問卷的員工可以自行保留結果作為紀錄。',
        point: '空格後面接名詞 own records，要用所有格 their。'
      },
      trap: 'its（它的）與 it\'s（it is）不同；TOEIC 幾乎不會把 it\'s 當正解。',
      seconds: 15
    }
  ],

  // -------------------------------------------------------------------
  // 二、閱讀配速表（Reading Section 共 75 分鐘、100 題）
  // -------------------------------------------------------------------
  pace: {
    totalMinutes: 75,
    totalQuestions: 100,
    parts: [
      {
        part: 'P5', name: 'Part 5 單句填空', count: 30, minutes: 10, secPerQ: 20,
        checkpoint: '第 130 題做完時，時鐘應該只走了 10 分鐘',
        tip: '文法題 15 秒、單字題 25 秒。看完選項 5 秒內判斷不出考點，直接猜同一個字母跳過並做記號。'
      },
      {
        part: 'P6', name: 'Part 6 段落填空', count: 16, minutes: 8, secPerQ: 30,
        checkpoint: '第 146 題做完時，累計 18 分鐘',
        tip: '先花 20 秒掃完整篇抓文體與目的，再回頭填空。句子插入題留到該篇最後做。'
      },
      {
        part: 'P7', name: 'Part 7 閱讀理解', count: 54, minutes: 55, secPerQ: 60,
        checkpoint: '單篇（147–175）應在 25 分鐘內結束，剩 30 分鐘給多篇',
        tip: '先讀題目再回文章定位。單篇每篇 2–3 分鐘、雙篇 4 分鐘、三篇 6 分鐘，超時就先劃記跳下一篇。'
      }
    ],
    rules: [
      '閱讀是「時間管理測驗」，不是「英文程度測驗」。分數低的人有一半失分來自沒做完，而不是不會。',
      'Part 5 每多花 1 分鐘，Part 7 就少 1 題有機會作答；前面省下的時間才是後面的分數。',
      '答案卡不要留白。跳過的題目先固定猜 C，回頭有時間再改。',
      '練習時一定要開計時。沒有計時的練習只練到英文，練不到考試。'
    ]
  },

  // -------------------------------------------------------------------
  // 三、Part 7 題型攻略（對應 data/questions_p7_*.js 的 skill 欄位）
  // -------------------------------------------------------------------
  p7Playbook: [
    {
      skill: 'main_idea',
      label: '主旨／目的題',
      signal: 'What is the purpose of…／Why was this notice written／What is being announced',
      steps: [
        '答案幾乎都在第一段前兩句，或信件的 Subject 行。',
        '讀完開頭直接作答，不要讀完整篇再回來。',
        '選項若只提到文章某一小段的細節，通常是錯的 — 主旨題要選涵蓋全文的那個。'
      ],
      seconds: 40,
      trap: '把文中真的有提到、但只佔一句話的細節，誤當成整篇主旨。'
    },
    {
      skill: 'detail',
      label: '細節查找題',
      signal: 'What time…／How much…／Who will…／According to the email, what…',
      steps: [
        '從題目抓一個「不會被改寫的關鍵字」：人名、日期、數字、地名、產品名。',
        '用眼睛掃文章找那個關鍵字，找到後只讀那一句和下一句。',
        '確認選項是不是那句話的同義改寫，而不是原字照抄 — TOEIC 正解多半換過字。'
      ],
      seconds: 45,
      trap: '文章出現兩個日期／兩個金額時，看清楚題目問的是哪一個事件的。'
    },
    {
      skill: 'vocab_in_context',
      label: '文中字義題',
      signal: 'The word "X" in paragraph 2, line 3, is closest in meaning to…',
      steps: [
        '一定要回原句讀，不能只憑單字的常見字義選。',
        '把四個選項輪流代入原句，讀起來語意通順的才是答案。',
        '這是 Part 7 最快的題型，30 秒內解決。'
      ],
      seconds: 30,
      trap: '選了該單字「最常見」的意思，但文中用的是次要字義。'
    },
    {
      skill: 'inference',
      label: '推論／暗示題',
      signal: 'What is suggested about…／What can be inferred／What is implied',
      steps: [
        '推論題沒有明說的答案，但一定有文字根據 — 不能靠常識腦補。',
        '用刪去法：四個選項逐一問「文章哪一句支持這個說法？」，講不出來的就刪。',
        '這類題最花時間，一篇文章裡留到最後做。'
      ],
      seconds: 75,
      trap: '選了「聽起來很合理但文章沒寫」的選項。TOEIC 的推論其實很保守。'
    },
    {
      skill: 'NOT',
      label: 'NOT／排除題',
      signal: 'What is NOT mentioned／Which of the following is NOT included',
      steps: [
        '先在題目上圈起 NOT，避免看反。',
        '這題等於要查四次。把三個「有提到」的逐一在文章打勾，剩下那個就是答案。',
        '如果卡超過 90 秒，先猜一個跳過 — 這是 CP 值最低的題型。'
      ],
      seconds: 90,
      trap: '找到一個選項在文中出現就急著選它 — 出現的那三個都是要排除的。'
    },
    {
      skill: 'cross_ref',
      label: '跨篇對照題（雙篇／三篇）',
      signal: '題目同時牽涉兩份文件，例如「符合資格的申請者可獲得多少折扣？」',
      steps: [
        '雙篇／三篇題組中，通常有 1–2 題必須合併兩份文件才能作答。',
        '先讀第一篇建立背景（誰、什麼事、什麼條件），第二篇通常是回覆或表單。',
        '看到題目裡的條件（日期、會員等級、數量）就去另一份文件對照那條規則。'
      ],
      seconds: 75,
      trap: '只在其中一份文件裡找答案，選到「單看一篇是對的、合起來是錯的」的選項。'
    },
    {
      skill: 'sentence_insert',
      label: '句子插入題（Part 6）',
      signal: '四個選項都是完整句子，要選最適合放進 [N] 的那一句',
      steps: [
        '先讀空格「前一句」和「後一句」，判斷這裡需要的是補充、轉折還是結論。',
        '看選項裡的指代詞與連接詞：this、these、however、in addition 必須有前文可以接。',
        '與文章主題無關、或與前後文時序矛盾的選項先刪。'
      ],
      seconds: 60,
      trap: '選了句子本身寫得最漂亮、但和前後文接不起來的那一句。'
    }
  ],

  // -------------------------------------------------------------------
  // 四、錯因分類（三層檢討法第一層；code 對齊 Store.WRONG_REASONS）
  // -------------------------------------------------------------------
  reasons: [
    { code: 'vocab', label: '單字不認識', icon: '📖',
      advice: '把這題的關鍵字加進單字卡，隔天用 SRS 複習。單字造成的錯最好補，也回收最快。' },
    { code: 'grammar', label: '文法規則不熟', icon: '📐',
      advice: '回閱讀診斷室讀對應的判斷框架，再做 10 題同考點專項練習。' },
    { code: 'misread', label: '看錯題目／選項', icon: '👀',
      advice: '作答時先圈題目的關鍵字（NOT、EXCEPT、疑問詞）。這類錯不用補英文，補習慣就好。' },
    { code: 'time', label: '時間不夠亂選', icon: '⏱️',
      advice: '不是實力問題而是配速問題。回配速表確認各 Part 的檢查點，練習時務必開計時。' },
    { code: 'guess', label: '沒把握用猜的', icon: '🎲',
      advice: '猜對也算不會 — 在結果頁把「其實是猜的」題目丟進錯題本，才不會被虛高的正確率騙過去。' }
  ]
};
