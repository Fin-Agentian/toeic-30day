# API_infra.md — Store / SRS / TTS 介面文件

> 給 view 開發者（`js/views/*.js`）看的介面文件。只需依本文件呼叫，不需要讀
> `js/store.js` / `js/srs.js` / `js/tts.js` 的實作。三個模組都是純 IIFE，
> 掛在 `window.Store`、`window.SRS`、`window.TTS`，`index.html` 載入順序為
> `util → store → srs → tts → views/*.js → app.js`。
> Schema 定義以 `docs/DESIGN.md` §6 為準，本文件只講 API 用法。

---

## 1. `window.Store`

`localStorage`（key: `toeic30:state`）讀寫、狀態驗證、匯出/匯入、領域便利方法。
所有更新皆為**不可變**：`set()`/`update()`/領域方法都會產生新物件、寫入
storage、並觸發 `window` 事件 `toeic30:change`（`event.detail` = 更新後的
state 深拷貝）。`localStorage` 不存在時（例如 Node 測試環境）自動退回記憶體
物件，行為不變。

### 1.1 `Store.get()`

```js
Store.get() → State
```
回傳目前狀態的**深拷貝**。可放心讀取／解構，修改回傳值**不會**影響內部狀態，
也不會寫入 storage。

```js
const state = Store.get();
console.log(state.streak.current, state.settings.ttsRate);
```

### 1.2 `Store.set(patchFn)`

```js
Store.set(patchFn: (old: State) => State) → State
```
`patchFn` 收到目前狀態的深拷貝 `old`，必須回傳**新物件**（不可原地修改 `old`
後回傳同一參考——雖然回傳同一參考技術上可行，但違反專案不可變風格）。回傳值
會先經過 schema 驗證（缺必要欄位／型別錯誤會 `throw Error`），驗證通過才會
覆蓋內部狀態、寫入 storage、觸發 `toeic30:change`，並回傳新狀態的深拷貝。

```js
Store.set((old) => Object.assign({}, old, { dailyMinutes: 60 }));
```

### 1.3 `Store.update(path, value)`

```js
Store.update(path: string | string[], value: any) → State
```
不可變 set-in 便利函式。`path` 可用點號字串（`'settings.ttsRate'`）或陣列
（`['settings', 'ttsRate']`）。內部即呼叫 `Store.set()`，回傳新狀態深拷貝。

```js
Store.update('settings.ttsRate', 0.8);
Store.update(['settings', 'theme'], 'dark');
```

### 1.4 `Store.export()`

```js
Store.export() → string   // 格式化的 JSON
```
回傳目前狀態的 JSON 字串（給「設定」頁的匯出按鈕，用 Blob/下載或顯示於
textarea 供使用者複製）。

### 1.5 `Store.import(json)`

```js
Store.import(json: string) → State
```
解析 JSON 字串並整份取代狀態。會驗證：
1. JSON 可解析（否則 `throw Error('Store.import: 無法解析 JSON — ...')`）
2. schema 必要欄位／型別正確（否則 `throw Error('Store: ...')`）
3. `version` 與目前支援版本相符（否則 `throw Error('Store.import: 不支援的 version...')`）

成功後寫入 storage、觸發 `toeic30:change`，回傳新狀態深拷貝。**呼叫端務必
用 `try/catch` 包住並在頁內 toast 顯示錯誤**（不可用 `alert`）。

```js
try {
  Store.import(pastedJsonString);
  showToast('匯入成功');
} catch (e) {
  showToast('匯入失敗：' + e.message, 'error');
}
```

### 1.6 `Store.reset()`

```js
Store.reset() → State
```
清空並回到預設狀態（`startDate` 重設為呼叫當下的今天）。用於「設定」頁的
「重置」按鈕，**觸發前請先用頁內 modal 確認**（不可用 `confirm()`）。

### 1.7 `Store.completeTask(id)` / `Store.isTaskDone(id)`

```js
Store.completeTask(id: string) → State   // 記錄完成時間（ISO timestamp）
Store.isTaskDone(id: string) → boolean
```
用於 `plan.js` 勾選每日任務、其他 view 完成任務後導回勾選。`id` 對應
`data/plan.js` 裡 `tasks[].id`（例：`"d1-t1"`）。

```js
Store.completeTask('d1-t1');
if (Store.isTaskDone('d1-t1')) { /* 顯示已完成樣式 */ }
```

### 1.8 `Store.recordQuiz(payload, todayISO?)`

```js
Store.recordQuiz(payload: {
  mode: 'quiz' | 'listening' | 'mock',
  part: string,          // 例如 'P5'、'P3'，選填（預設空字串）
  total: number,
  correct: number,
  seconds: number,
  wrongIds?: string[],   // 預設 []
  skillStats?: Array<{ key: string, correct: boolean, seconds: number }>  // 預設 []
}, todayISO?: string) → State
```
用於 `quiz.js` / `listening.js` / `mock.js` 交卷時呼叫一次。同一次呼叫會
**同時**：
- 附加一筆紀錄到 `quizHistory`（含 `at` 時間戳）
- 對每個 `wrongIds` 更新 `wrongBook[id]`：`count += 1`、`lastAt` 更新、
  `mastered` 重設為 `false`、`box` 回到 1、`due` 設為今天
- 依 `skillStats` 累加 `readingStats[key]` 的 `total` / `correct` / `seconds`
- 更新 `streak`（依 `lastActive` 判斷連續天數：同一天不變、前一天則
  `current += 1`、否則重置為 1；`best` 取歷史最大）

**`wrongIds` 會先經過 `normalizeWrongId()` 正規化**：P6/P7 的子題 key 一律存成
`<groupId>-q<n>`（例如傳入 `p6-001-2` 會存成 `p6-001-q2`），`review.js` 才查得到題目。

`skillStats[].key` 的格式是 `<Part>:<考點>`，用 `Reading.skillKey(part, question)` 產生
（P5 取 `tag`、P6 取 `type`、P7 取 `skill`）。`seconds` 是該題實際花掉的秒數。

`payload` 欄位不合法（`mode` 不在允許值內、`total`/`correct`/`seconds`
非非負數字、`wrongIds`/`skillStats` 非陣列）會 `throw Error`，呼叫端應在遞交前自行檢查
數值來源。`todayISO` 為選填的日期覆寫（測試/時區調整用），一般呼叫不需要帶。

```js
Store.recordQuiz({
  mode: 'quiz', part: 'P5', total: 10, correct: 8, seconds: 245,
  wrongIds: ['p5-003', 'p5-017'],
  skillStats: [
    { key: 'P5:prep', correct: false, seconds: 42 },
    { key: 'P5:pos',  correct: true,  seconds: 14 }
  ]
});
```

### 1.9 錯題本 API

```js
Store.markWrongMastered(id: string) → State
Store.reviewWrong(id: string, correct: boolean, todayISO?: string) → State
Store.setWrongReason(id: string, reason: string) → State
Store.flagWrong(id: string, reason?: string) → State
Store.dueWrongIds(todayISO?: string) → string[]
Store.normalizeWrongId(id: string) → string
Store.normalizeWrongEntry(entry: object, todayISO?: string) → WrongEntry
Store.WRONG_REASONS  // ['vocab','grammar','misread','time','guess']
```

以上方法都會先把 `id` 正規化，呼叫端不必自己處理格式。

- **`markWrongMastered(id)`** — 直接標記精通：`mastered = true`、`box = 5`，`count`/`lastAt` 保留。
- **`reviewWrong(id, correct)`** — 錯題本重做一題後更新 Leitner 排程。答對 `box + 1`、
  答錯回 `box 1`；`due` 依 box 對應 `[1, 2, 4, 7, 14]` 天後；`reviews` 累加，答對時 `rights` 也累加；
  升到 box 5 自動 `mastered = true`。
- **`setWrongReason(id, reason)`** — 標記錯因，傳空字串可清除。`reason` 不在 `WRONG_REASONS`
  內會 `throw Error`。
- **`flagWrong(id, reason?)`** — 不經過 `recordQuiz`，手動把一題丟進錯題本（用於「這題我是猜對的」）：
  `count` 至少為 1、`box = 1`、`due` 設為今天。
- **`dueWrongIds(today?)`** — 今天（含逾期）該複習且未精通的錯題 id，早到期的排前面。

```js
// 錯題本重做流程
Store.reviewWrong('p7-013-q1', userPickedIndex === answer);
Store.setWrongReason('p7-013-q1', 'time');
```

### 1.10 `Store.touchStreak(todayISO?)`

```js
Store.touchStreak(todayISO?: string) → State
```
單獨更新連續天數（例如使用者只是打開 App 看儀表板，未做任何測驗時，
`dashboard.js` 可呼叫此方法記一次「今日已到訪」）。邏輯與 `recordQuiz`
內建的 streak 更新相同。`todayISO` 選填。

### 1.11 `Store.getDayIndex(dateISO?)`

```js
Store.getDayIndex(dateISO?: string) → number   // 0..30
```
回傳「今天是 Day 幾」。以 `state.startDate` 為 Day 1 起算；`dateISO` 早於
`startDate` 回傳 `0`；超過 Day 30 一律封頂回傳 `30`。不帶參數時用瀏覽器
今天（本地時間 `YYYY-MM-DD`）。

```js
const dayIdx = Store.getDayIndex();       // 例：8
const plan = TOEIC_DATA.plan.days.find(d => d.day === dayIdx);
```

### 1.12 `Store.daysToExam(dateISO?)`

```js
Store.daysToExam(dateISO?: string) → number   // 可為負數（已過考試日）
```
回傳距 `state.examDate` 還有幾天。用於頁首「距考試 N 天」。

```js
const n = Store.daysToExam();
headerEl.textContent = `距考試 ${n} 天`;
```

### 1.13 監聽狀態變化

任何 `Store` 寫入方法（`set`/`update`/`import`/`reset`/`completeTask`/
`recordQuiz`/`markWrongMastered`/`touchStreak`）都會 `window.dispatchEvent`
一個 `toeic30:change` 事件，`event.detail` 是更新後狀態的深拷貝。

```js
window.addEventListener('toeic30:change', (e) => {
  renderStreakBadge(e.detail.streak);
});
```

### 1.14 State schema 速查（詳見 DESIGN.md §6）

```js
{
  version: 2,
  startDate: "YYYY-MM-DD",      // 預設 = 建立當下今天
  examDate: "2026-09-20",
  dailyMinutes: 90,
  completedTasks: { "d1-t1": "2026-08-17T10:00:00.000Z" },
  tipsMastered: { "P2-03": true },
  quizHistory: [ { at, mode, part, total, correct, seconds, wrongIds: [] } ],
  wrongBook: { "p5-001": {
    count: 2, lastAt, mastered: false,
    box: 1,                 // Leitner 1..5
    due: "2026-08-18",      // 下次該重做的日期
    reason: "",             // '' | 'vocab' | 'grammar' | 'misread' | 'time' | 'guess'
    reviews: 0, rights: 0   // 累計重做次數 / 其中答對次數
  } },
  readingStats: { "P5:prep": { total: 12, correct: 4, seconds: 340 } },
  vocab: { "v0001": { box: 1, due: "2026-08-18", seen: 3, wrong: 1 } },
  streak: { current: 0, best: 0, lastActive: null },
  settings: { ttsRate: 1.0, ttsVoice: "", theme: "light" }
}
```
`vocab` 欄位的每個卡片形狀與 `SRS` 模組的卡片形狀一致——`vocab.js` 建議直接把
`SRS.initCard()` / `SRS.review()` 的回傳值透過 `Store.update(['vocab', id], card)`
寫回。錯題的 Leitner 排程則不走 `SRS`（間隔不同），一律用 `Store.reviewWrong()`。

### 1.15 版本升級（migration）

`Store.STATE_VERSION` 目前為 `2`。`loadState()` 與 `import()` 都會先跑 `migrate(state)`
再驗證 schema，所以：
- 使用者瀏覽器裡的 v1 資料會在下次開啟時自動升級並寫回 localStorage
- 使用者匯出的 v1 備份仍然可以匯入

v1 → v2 做的事：正規化 `wrongBook` 與 `quizHistory[].wrongIds` 的錯題 key、
為每筆錯題補上 Leitner 欄位、新增空的 `readingStats`。
新增欄位時請在 `store.js` 的 `migrate()` 加一個 `if (version < N)` 分支，並在
`tests/store.test.js` 補一個對應的 migration 測試。

---

## 2. `window.SRS`

Leitner 5 箱間隔複習演算法，**純函式**、不讀寫 `localStorage`、不依賴
`Store`。卡片形狀：`{ box: 1..5, due: "YYYY-MM-DD", seen: number, wrong: number }`，
與 `state.vocab[id]` 對齊。箱位對應間隔天數 `[0, 1, 3, 7, 14]`（index = box-1）。

### 2.1 `SRS.initCard(todayISO?)`

```js
SRS.initCard(todayISO?: string) → Card
// → { box: 1, due: todayISO(今天), seen: 0, wrong: 0 }
```
建立新單字卡（第一次背，立即到期可複習）。

### 2.2 `SRS.review(card, correct, todayISO?)`

```js
SRS.review(card: Card | null, correct: boolean, todayISO?: string) → Card
```
回答一次後的新卡片（**不修改傳入的 `card`，回傳新物件**）：
- 答對：`box = min(5, box + 1)`，`due = today + interval[box]`
- 答錯：`box = 1`，`due = today`，`wrong += 1`
- `seen` 一律 `+1`

`card` 為 `null`/欠缺欄位時視為 `{ box:1, seen:0, wrong:0 }`。

```js
let card = state.vocab['v0001'] || SRS.initCard();
card = SRS.review(card, true);   // 使用者答對
Store.update(['vocab', 'v0001'], card);
```

### 2.3 `SRS.isDue(card, todayISO?)`

```js
SRS.isDue(card: Card | null, todayISO?: string) → boolean
```
`card.due <= todayISO` 為 `true`；`card` 或 `card.due` 不存在也回傳 `true`
（尚未排程的卡片視為到期，方便新卡直接排進今日複習）。

### 2.4 `SRS.pickSession(opts)`

```js
SRS.pickSession(opts: {
  cards: { [id]: Card },     // 通常是 state.vocab
  allIds: string[],          // 全部單字 id（例如 TOEIC_DATA.vocab.map(w => w.id)）
  todayISO?: string,
  newLimit?: number,         // 預設不限
  reviewLimit?: number       // 預設不限
}) → { newIds: string[], reviewIds: string[] }
```
`allIds` 中若在 `cards` 有紀錄且已到期 → 進 `reviewIds`（依 `due` 早到晚
排序，同 `due` 依 id 排序）；若 `cards` 中沒有紀錄 → 視為新字，進
`newIds`（依 id 字串順序）。已建卡但未到期的字**兩邊都不會出現**。
`vocab.js` 應優先安排 `reviewIds`，再補 `newIds`。

```js
const allIds = TOEIC_DATA.vocab.map(w => w.id);
const { newIds, reviewIds } = SRS.pickSession({
  cards: Store.get().vocab,
  allIds: allIds,
  newLimit: 20,
  reviewLimit: 30
});
const sessionIds = reviewIds.concat(newIds); // 複習優先
```

### 2.5 `SRS.stats(cards)`

```js
SRS.stats(cards: { [id]: Card }) → { box1, box2, box3, box4, box5, total }
```
各箱數量統計，供儀表板/單字頁顯示進度分佈。

```js
const dist = SRS.stats(Store.get().vocab);
// { box1: 12, box2: 5, box3: 3, box4: 0, box5: 0, total: 20 }
```

---

## 3. `window.TTS`

封裝 `window.speechSynthesis`。**沒有語音合成支援時**（`isSupported()` 為
`false`），所有方法安全 no-op，回傳已 resolve 的 `Promise`（不會拋錯、不會
卡住呼叫端邏輯）。長文字會依句尾標點（`.!?`）自動分段依序播放，避免 Chrome
單一 utterance 過長時中途被截斷的已知問題。

### 3.1 `TTS.isSupported()`

```js
TTS.isSupported() → boolean
```
呼叫任何播放功能前可先檢查，用於 UI 顯示「此瀏覽器不支援語音朗讀」提示。

### 3.2 `TTS.voices()`

```js
TTS.voices() → Promise<SpeechSynthesisVoice[]>
```
回傳英文語音清單（`lang` 以 `en` 開頭）。Chrome 首次載入語音清單常是非同步
（`voiceschanged` 事件），此方法已處理：若當下清單已非空直接回傳，否則等待
`voiceschanged`（最多等 1 秒逾時保底）。不支援時回傳 `Promise<[]>`。

### 3.3 `TTS.pickVoice(gender)`

```js
TTS.pickVoice(gender: 'male' | 'female' | null) → Promise<SpeechSynthesisVoice | null>
```
依名稱啟發式挑一個語音：`gender:'female'` 比對名稱含
`female`/`samantha`/`zira`/`google us english`/... 等；`gender:'male'`
比對 `male`/`david`/`daniel`/`alex`/...；都找不到時退而找第一個
`lang === 'en-US'`，再退而回傳清單第一個；`gender` 為 `null`/未知直接回傳
清單第一個。清單為空回傳 `null`。

### 3.4 `TTS.speak(text, opts?)`

```js
TTS.speak(text: string, opts?: {
  rate?: number,             // 預設 1.0（建議 0.8–1.2）
  voice?: SpeechSynthesisVoice,  // 直接指定 voice，優先於 gender
  gender?: 'male' | 'female' | null
}) → Promise<void>
```
播放一段文字，**播放完（`onend`）或發生錯誤（`onerror`）都會 resolve**（不
reject，呼叫端不需要 catch）。長文字自動依句子分段依序播放。未指定
`opts.voice` 時會用 `opts.gender` 呼叫 `pickVoice()` 自動挑選。

```js
await TTS.speak(question.stem, { rate: Store.get().settings.ttsRate });
```

### 3.5 `TTS.speakSequence(items)`

```js
TTS.speakSequence(items: Array<{
  text: string,
  gender?: 'male' | 'female' | null,
  voice?: SpeechSynthesisVoice,
  rate?: number,
  pauseMs?: number           // 播完這段後的停頓，預設 0
}>) → Promise<void>
```
依序播放多段文字，各段可指定不同語音/性別（例如 Part 3 對話依 speaker
交替男女聲）。全部播完才 resolve。

```js
// Part 3：M/W 對話逐句交替播放
await TTS.speakSequence(
  script.map((line) => ({
    text: line.t,
    gender: line.s === 'M' ? 'male' : 'female',
    pauseMs: 300
  }))
);

// Part 2：先唸 question 再唸 A/B/C
await TTS.speakSequence([
  { text: item.question, pauseMs: 500 },
  { text: 'A. ' + item.responses[0], pauseMs: 300 },
  { text: 'B. ' + item.responses[1], pauseMs: 300 },
  { text: 'C. ' + item.responses[2], pauseMs: 0 }
]);
```

### 3.6 `TTS.stop()`

```js
TTS.stop() → void
```
立即停止目前播放與佇列中的段落（`speechSynthesis.cancel()`）。用於使用者
按下「停止」或切換題目時清掉還在播的語音。不支援時安全 no-op。

---

## 4. `window.Reading`（`js/reading.js`）

閱讀（Part 5/6/7）診斷引擎。**純函式**：只吃傳進來的 `state`（`Store.get()` 的結果）
與 `window.TOEIC_DATA`，不讀寫 localStorage、不碰 DOM，因此可直接在 node 測試。

### 4.1 常數

```js
Reading.PACE_TARGET   // { P5: 20, P6: 30, P7: 60 } — 每題目標秒數，全站單一來源
Reading.SKILL_LABELS  // { 'P5:prep': '介系詞', 'P7:inference': '推論題', … }
Reading.PART_LABELS   // { P5: 'Part 5 單句填空', … }
Reading.MIN_SAMPLE    // 5 — 少於這個題數不下強弱判斷
```
`quiz.js`、`mock.js` 與 `#/reading` 都必須引用 `PACE_TARGET`，不要各自寫死秒數。

### 4.2 考點對應

```js
Reading.skillKey(part: 'P5'|'P6'|'P7', question: object) → string   // 'P5:prep'
Reading.labelFor(key: string) → string                              // '介系詞'
Reading.partOfKey(key) → 'P5' | 'P6' | 'P7'
Reading.tagOfKey(key)  → 'prep'
Reading.poolSizeByKey() → { 'P5:prep': 15, … }   // 題庫中各考點有幾題
Reading.drillHash(key, count?) → '#/quiz?part=P5&skill=prep&count=10'
Reading.frameworkForTag(tag) → Framework | null  // 取對應的文法判斷框架
```
`skillKey` 的來源欄位：P5 用 `tag`、P6 用 `type`、P7 用 `skill`，缺欄位時退回預設值
（`P5:other` / `P6:word` / `P7:detail`），不會產生 undefined key。

### 4.3 分析

```js
Reading.skillBreakdown(state, opts?) → Row[]
// Row: { key, part, tag, label, total, correct, accuracy, avgSeconds, targetSeconds,
//        overPace, enough, level: { code, label, tone }, poolSize }
// 依「有足夠樣本 → 正確率低 → 題數多」排序，弱點在最前面。opts.part 可過濾。

Reading.untouchedSkills(state) → { key, label, part, tag, poolSize }[]  // 完全沒練過的考點

Reading.paceReport(state) → Pace[]   // 每個 Part 一筆，只採計 mode='quiz' 的紀錄
// Pace: { part, label, targetSeconds, avgSeconds, questions, sessions, accuracy,
//         ratio, verdict: 'none'|'ok'|'warn'|'slow'|'rush', verdictText }

Reading.projectedFinish(state) → { minutes, limitMinutes, overMinutes, measuredParts, willFinish }
// 用目前配速推估 100 題要多久；沒資料的 Part 以目標配速代入

Reading.estimateRC(state) → { score, accuracy, sample, confidence, nextScore, questionsToNext }
// score 為 5..495 的粗估值（無紀錄時為 null）；confidence: 'none'|'low'|'medium'|'high'
Reading.curveToScore(rawOutOf100) → number   // 換算曲線本身，單調遞增、夾在 5..495

Reading.reasonBreakdown(state) → { rows: [{ code, label, icon, advice, count, share }],
                                   untagged, total }   // 只統計 p5/p6/p7 的錯題
```

### 4.4 行動建議與整合

```js
Reading.advice(state, { today? }) → Advice[]   // 最多 5 條，已依優先序排好
// Advice: { priority, kind, icon, title, detail, actionLabel, hash, frameworkId?, skillKey? }

Reading.diagnose(state, { today? }) → { rc, skills, untouched, pace, projection, reasons, advice }
```
`advice` 的優先序（分數低時回收最快的順序）：
到期錯題 → Part 5 弱考點 → 配速嚴重超時 → Part 7 弱題型 → 沒練過的考點；
完全沒有弱點時回傳一條鼓勵訊息，不會回空陣列。`hash` 一律是站內路由，可直接餵給 `App.navigate()`。

```js
const d = Reading.diagnose(Store.get(), { today: Util.todayISO() });
if (d.advice[0]) App.navigate(d.advice[0].hash);
```

---

## 5. 測試

- `node tests/store.test.js` — 覆蓋：預設 schema、`get()` 不可變、
  `set()`/`update()` 不可變與驗證失敗丟錯、`completeTask`/`isTaskDone`、
  `recordQuiz` 同時更新 `wrongBook`/`readingStats`/`streak`（含連續與斷streak情境）、
  錯題 id 正規化、`reviewWrong` 的 Leitner 升降箱、`setWrongReason`/`flagWrong`/`dueWrongIds`、
  v1 → v2 migration（含新舊 key 並存時的合併）、`markWrongMastered`、
  `getDayIndex`/`daysToExam` 邊界、`import` 拒絕壞資料與接受 v1 舊備份、
  `export`/`import` round-trip、`reset()`、無 `localStorage` 時退回記憶體、跨實例持久化。
- `node tests/srs.test.js` — 覆蓋：`initCard`、`review` 升箱/降箱與間隔天數、
  `isDue` 邊界、`pickSession` 排序與 `newLimit`/`reviewLimit`、`stats`。
- `node tests/reading.test.js` — 覆蓋：`skillKey` 對應與預設值、題庫所有考點都有中文標籤、
  `curveToScore` 單調性與值域、`estimateRC`（排除聽力紀錄）、`skillBreakdown` 排序與樣本門檻、
  `paceReport`/`projectedFinish`、`reasonBreakdown`、`advice` 優先序與連結格式、
  每條文法框架的 tag 都能在題庫抽到題、`diagnose` 在空 state 下不丟錯。

三者皆為純 Node 腳本（用 `vm` 載入原始檔到 sandbox，`store.test.js`
另外 shim `window.localStorage`），無需額外測試框架即可執行。
