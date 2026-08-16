# TOEIC 30 天衝刺平台 — 設計契約（DESIGN.md）

> 所有 builder / content worker 都必須遵守本文件。修改 schema 需先更新本文件。
> 考試日：2026-09-20。今天：2026-08-16。使用者語言：繁體中文（台灣）。

## 1. 目標
一個**純靜態網頁**學習平台（無 build step、無後端），使用者每天打開即可：
看今天任務 → 讀技巧 → 做題（P5/P6/P7 + 聽力 P1–P4 用瀏覽器 TTS）→ 背單字（SRS）→ 記錄進度/錯題。
必須能用 `file://` 直接雙擊 `index.html` 開啟（Chrome/Edge），也可用 `python3 -m http.server` 服務。

## 2. 技術限制（硬性）
- 純 HTML/CSS/JS（ES2020），**不用 ES modules、不用 fetch 讀本地 JSON**（file:// 會被 CORS 擋）。
- 資料檔一律是 `data/*.js`，以 `window.TOEIC_DATA.<key> = ...` 掛載（見 §5）。
- 無任何外部 CDN / 字型 / 圖片；圖示用 inline SVG 或 emoji。
- 狀態存 `localStorage`，key 前綴 `toeic30:`。所有狀態更新採不可變模式（產生新物件再存）。
- 檔案 < 800 行；一個 view 一個檔案。
- 所有 JS 檔案 `node --check` 必須通過。
- 不用 `alert/confirm/prompt`（用頁內 modal / toast）。

## 3. 檔案結構
```
index.html
css/style.css              # 主題變數、版面、元件
js/store.js                # localStorage 讀寫、狀態 schema、匯出/匯入
js/util.js                 # 日期、shuffle、格式化、DOM helper (h(), $(), $$())
js/tts.js                  # Web Speech API 封裝（play/stop/rate/voice 選擇）
js/srs.js                  # Leitner 5 箱 SRS 演算法（純函式，單字用）
js/reading.js              # 閱讀診斷引擎（純函式）：考點正確率、配速、RC 粗估、錯因、行動建議
js/app.js                  # hash router、導覽列、初始化、view 註冊
js/views/dashboard.js      # 儀表板：倒數、今日任務、進度環、連續天數、弱點
js/views/plan.js           # 30 天計畫：月曆格 + 每日任務清單 + 勾選
js/views/tips.js           # 技巧庫：Part 篩選、搜尋、priority、已掌握、來源連結
js/views/quiz.js           # 閱讀測驗引擎：P5/P6/P7，計時（含每題秒數）、考點專項、逐題/交卷、解析
js/views/reading.js        # 閱讀診斷室：RC 粗估、考點排行、配速分析、文法框架與題型攻略
js/views/listening.js      # 聽力：P1–P4，TTS 播放（預設只播一次）、作答、逐字稿
js/views/vocab.js          # 單字：閃卡 SRS、今日新字/複習、拼字/選擇小測
js/views/mock.js           # 迷你模考：計時混合題組，結束給分數與弱點
js/views/review.js         # 錯題本：三層檢討法（錯因分類 → Leitner 重做排程 → 精通判定）
js/views/settings.js       # 開始日、考試日、每日時數、TTS 語速、匯出/匯入/重置
data/tips.js               # TOEIC_DATA.tips
data/plan.js               # TOEIC_DATA.plan
data/vocab_1.js            # TOEIC_DATA.vocab  ids v0001–v0350（topics: office, hr, finance, marketing, general-A）
data/vocab_2.js            # TOEIC_DATA.vocab  ids v0351–v0700（topics: travel, logistics, manufacturing, tech, real_estate, dining, health, general-B）
data/questions_p5_1.js     # TOEIC_DATA.p5     ids p5-001–p5-050（tags: pos, pronoun, agreement, tense, participle）
data/questions_p5_2.js     # TOEIC_DATA.p5     ids p5-051–p5-100（tags: prep, conj, relative, comparison）
data/questions_p5_3.js     # TOEIC_DATA.p5     ids p5-101–p5-160（tags: vocab, other + 混合）
data/questions_p6.js       # TOEIC_DATA.p6     ids p6-001–p6-012
data/questions_p7_1.js     # TOEIC_DATA.p7     ids p7-001–p7-012（single）
data/questions_p7_2.js     # TOEIC_DATA.p7     ids p7-013–p7-020（double ×5, triple ×3）
data/listening_1.js        # TOEIC_DATA.listening.p1（l1-001–l1-020）+ .p2（l2-001–l2-060）
data/listening_2.js        # TOEIC_DATA.listening.p3（l3-001–l3-015）
data/listening_3.js        # TOEIC_DATA.listening.p4（l4-001–l4-015）
data/reading_frameworks.js # TOEIC_DATA.reading：10 條文法判斷框架、配速表、Part 6/7 題型攻略、錯因分類
scripts/validate_data.js   # node scripts/validate_data.js → 載入所有 data/*.js（vm sandbox）驗證 §5 schema、id 唯一、answer 範圍
tests/*.test.js            # node 可直接執行的純函式測試（store 用 localStorage shim）
docs/API.md                # util / Store / SRS / TTS / Views 介面文件（builder 產出，view 開發者依此實作）
README.md
```
**資料檔分塊規則**：陣列型資料一律用附加模式，例如
`window.TOEIC_DATA = window.TOEIC_DATA || {}; window.TOEIC_DATA.p5 = (window.TOEIC_DATA.p5 || []).concat([ ... ]);`
listening 用 `window.TOEIC_DATA.listening = window.TOEIC_DATA.listening || {}; window.TOEIC_DATA.listening.p3 = (window.TOEIC_DATA.listening.p3 || []).concat([...]);`
tips/plan 單檔直接指定。`index.html` 依上表順序載入 **全部** data 檔（缺檔時 view 需顯示友善空狀態而非崩潰）。
`index.html` 載入順序：css → data/*.js → util → store → srs → reading → tts → views/*.js → app.js。

## 4. 頁面 / 路由（hash）
`#/dashboard`（預設）`#/plan` `#/tips` `#/quiz` `#/reading` `#/listening` `#/vocab` `#/mock` `#/review` `#/settings`
每個 view 檔案暴露 `window.Views.<name> = { render(container, params) , destroy?() }`。
導覽列：桌機左側 sidebar，手機底部 tab bar（≥ 5 個主要入口 + 更多）。

## 5. 資料 Schema（嚴格）

### 5.1 tips（`window.TOEIC_DATA.tips` = Tip[]）
```js
{ id: "P2-03",                 // 唯一；前綴 = part
  part: "P1"|"P2"|"P3"|"P4"|"P5"|"P6"|"P7"|"General"|"Vocab"|"Time"|"Plan",
  title_zh: "", title_en: "",
  detail_zh: "3–6 句具體可操作",
  steps: ["", ""], pitfalls: [""], example: "英文例子或空字串",
  priority: "high"|"medium"|"low",
  sources: ["https://..."] }
```

### 5.2 plan（`window.TOEIC_DATA.plan`）
```js
{ examDate: "2026-09-20", totalDays: 30,
  phases: [ { name: "診斷期", days: [1,3], goal: "" }, ... ],   // days = [起, 訖]（含）
  days: [ { day: 1, phase: "診斷期", theme: "一句話主題", minutes: 90,
            tasks: [ { id: "d1-t1", type: "tips"|"quiz"|"listening"|"vocab"|"mock"|"review"|"read",
                       label: "讀 Part 2 技巧 5 條", minutes: 15,
                       ref: { part: "P2", count: 5 } } ] } ] }
```
`ref` 依 type：tips→`{part, count|ids}`；quiz→`{part:"P5"|"P6"|"P7", count}`；listening→`{part:"P1".."P4", count}`；
vocab→`{newWords:20, review:true}`；mock→`{preset:"mini"|"half"}`；review→`{}`；read→`{note:"外部教材說明"}`。
點任務按鈕會導向對應 view 並帶參數（例：`#/quiz?part=P5&count=10&task=d1-t1`），完成後自動勾選 task。

### 5.3 vocab（`window.TOEIC_DATA.vocab` = Word[]）
```js
{ id: "v0001", word: "invoice", pos: "n.", zh: "發票、請款單",
  example: "Please find the attached invoice for last month's services.",
  example_zh: "請查收上個月服務的附件發票。",
  topic: "finance"|"office"|"hr"|"marketing"|"travel"|"logistics"|"manufacturing"|"tech"|"real_estate"|"dining"|"health"|"general",
  level: "core"|"advanced", collocations: ["issue an invoice"] }
```

### 5.4 questions_p5（`window.TOEIC_DATA.p5` = P5[]）
```js
{ id: "p5-001", stem: "The manager asked all employees to submit ______ reports by Friday.",
  options: ["they","their","them","theirs"], answer: 1,   // 0-based
  explanation_zh: "空格後接名詞 reports，需所有格...", tag: "pronoun"|"pos"|"tense"|"prep"|"conj"|"vocab"|"agreement"|"relative"|"participle"|"comparison"|"other",
  difficulty: 1|2|3 }
```

### 5.5 questions_p6（`window.TOEIC_DATA.p6` = P6[]）
```js
{ id: "p6-001", title: "Email: Office relocation", passage: "text with [1] [2] [3] [4] markers",
  questions: [ { n: 1, options: ["","","",""], answer: 0, explanation_zh: "", type: "word"|"sentence" } ] } // 4 題，含 1 題 sentence 插入
```

### 5.6 questions_p7（`window.TOEIC_DATA.p7` = P7[]）
```js
{ id: "p7-001", type: "single"|"double"|"triple",
  passages: [ { kind: "email"|"notice"|"article"|"ad"|"form"|"chat"|"memo"|"schedule"|"invoice"|"letter", title: "", text: "" } ],
  questions: [ { q: "What is the purpose of the email?", options: ["","","",""], answer: 2, explanation_zh: "",
                 skill: "main_idea"|"detail"|"inference"|"NOT"|"vocab_in_context"|"sentence_insert"|"cross_ref" } ] }
```

### 5.7 listening（`window.TOEIC_DATA.listening`）
```js
{ p1: [ { id:"l1-001", scene_zh:"照片描述（因無圖，以中文描述場景，作答者據此判斷）", scene_en:"", statements:["A ...","B ...","C ...","D ..."], answer:0, explanation_zh:"" } ],
  p2: [ { id:"l2-001", question:"Where is the meeting?", responses:["","",""], answer:1, explanation_zh:"", trap:"similar_sound"|"wh_word"|"indirect"|"yes_no"|"other" } ],
  p3: [ { id:"l3-001", speakers:["M","W"], script:[ {s:"M", t:"..."}, {s:"W", t:"..."} ], setting_zh:"",
          questions:[ { q:"", options:["","","",""], answer:0, explanation_zh:"" } ] } ],   // 3 題
  p4: [ { id:"l4-001", kind:"announcement"|"voicemail"|"talk"|"ad"|"news"|"tour", script:"獨白全文", setting_zh:"",
          questions:[ { q:"", options:["","","",""], answer:0, explanation_zh:"" } ] } ] } // 3 題
```
TTS：p3 依 speaker 交替用不同 voice（男/女若可得）；p2 先唸 question 再唸 A/B/C；預設語速 1.0，可調 0.8–1.2。

### 5.8 reading（`window.TOEIC_DATA.reading`）
```js
{ frameworks: [ { id: "fw-prep", tag: "prep",     // tag 必須存在於 p5 題庫，否則專項練習抽不到題
                  title, when, steps: [string,…≥3],
                  example: { en, zh, point }, trap, seconds } ],   // ≥ 10 條
  pace: { totalMinutes: 75, totalQuestions: 100,
          parts: [ { part: "P5"|"P6"|"P7", name, count, minutes, secPerQ, checkpoint, tip } ],  // count 加總 = 100
          rules: [string] },
  p7Playbook: [ { skill, label, signal, steps: [string,…≥2], seconds, trap } ],  // ≥ 5 條
                // skill 需存在於 p7 題庫；例外：sentence_insert 對應 p6 的 type=sentence
  reasons: [ { code, label, icon, advice } ] }   // code 需與 store.js 的 WRONG_REASONS 完全一致
```
每題目標秒數的**單一來源**是 `js/reading.js` 的 `PACE_TARGET`（P5 20s / P6 30s / P7 60s），
`quiz.js`、`mock.js`、`#/reading` 皆引用之，不得各自寫死。

`scripts/validate_data.js` 會交叉檢查 frameworks 的 tag、p7Playbook 的 skill 是否真的存在於題庫。

## 6. localStorage 狀態（`toeic30:state`）
```js
{ version: 2, startDate: "2026-08-17", examDate: "2026-09-20", dailyMinutes: 90,
  completedTasks: { "d1-t1": "2026-08-17T10:00:00Z" },
  tipsMastered: { "P2-03": true },
  quizHistory: [ { at, mode:"quiz"|"listening"|"mock", part, total, correct, seconds, wrongIds:[] } ],
  wrongBook: { "p5-001": { count: 2, lastAt, mastered:false,
                           box: 1..5, due: "2026-08-18",         // 錯題 Leitner 排程
                           reason: ""|"vocab"|"grammar"|"misread"|"time"|"guess",
                           reviews: 0, rights: 0 } },
  readingStats: { "P5:prep": { total: 12, correct: 4, seconds: 340 } },  // 依考點累積
  vocab: { "v0001": { box: 1..5, due: "2026-08-18", seen: 3, wrong: 1 } },
  streak: { current: 0, best: 0, lastActive: "2026-08-17" },
  settings: { ttsRate: 1.0, ttsVoice: "", theme: "light"|"dark"|"auto" } }
```

**錯題 id 格式（硬性）**：P5 用題目 id（`p5-001`）；P6/P7/聽力的子題一律 `<groupId>-q<n>`
（`p6-001-q2`、`p7-013-q1`、`l3-004-q1`）。`review.js` 依此格式反查題目，格式不符會顯示「找不到題目資料」。
`Store.recordQuiz()` 寫入前會呼叫 `normalizeWrongId()` 正規化，v1 → v2 migration 也會修正既有資料。

**錯題 Leitner 間隔**：box 1..5 對應 `[1, 2, 4, 7, 14]` 天（比單字 SRS 密，因為只有 30 天）。
答對 box +1、答錯回 box 1；升到 box 5 自動 `mastered = true`。

`store.js` API：
- 核心：`Store.get()`, `Store.set(patchFn)`（不可變）, `Store.update(path, value)`, `Store.export()`, `Store.import(json)`, `Store.reset()`
- 任務／統計：`Store.completeTask(id)`, `Store.isTaskDone(id)`, `Store.recordQuiz(payload)`, `Store.touchStreak()`, `Store.getDayIndex()`, `Store.daysToExam()`
- 錯題本：`Store.markWrongMastered(id)`, `Store.reviewWrong(id, correct)`, `Store.setWrongReason(id, reason)`, `Store.flagWrong(id, reason)`, `Store.dueWrongIds(today)`, `Store.normalizeWrongId(id)`, `Store.normalizeWrongEntry(entry)`

`recordQuiz(payload)` 的 `payload.skillStats`（選填）為 `[{ key: "P5:prep", correct: bool, seconds: n }]`，
會累加進 `readingStats`；`js/reading.js` 依此算考點正確率、平均秒數與行動建議。

**版本升級**：`STATE_VERSION` 提升時，於 `store.js` 的 `migrate(state)` 補上對應分支；
`loadState()` 與 `import()` 都會先跑 migration 再驗證，舊備份因此仍可還原。

## 7. UI / 視覺
- 主題：清爽專業，主色 藍靛 `#3B5BDB`，成功綠、警示橘、錯誤紅；深色模式跟隨系統 + 手動切換。
- 響應式：≥1024 sidebar；<768 底部 tab bar；觸控目標 ≥ 44px。
- 每頁頂部顯示：距考試 N 天、今日 Day X/30。
- 空狀態、載入、錯誤都要有友善文字。
- 中文字型用系統字型堆疊（-apple-system, "Noto Sans TC", "Microsoft JhengHei", sans-serif）。

## 8. 內容數量目標
tips ≥ 60；plan 30 天完整；vocab ≥ 600（core ≥ 400）；p5 ≥ 150；p6 ≥ 12 篇（48 題）；p7 ≥ 20 組（單 12 / 雙 5 / 三 3，≥ 90 題）；
listening p1 ≥ 20、p2 ≥ 60、p3 ≥ 15 組、p4 ≥ 15 組。所有題目附繁中解析。

## 9. 驗收（Phase 4）
- `node scripts/validate_data.js` 全綠；`node --check` 全部 JS。
- Chrome 開 `index.html`：console 0 error；9 個路由皆可渲染；完成任務→勾選持久化；做題→歷史/錯題本更新；TTS 可發聲；匯出/匯入 round-trip。
