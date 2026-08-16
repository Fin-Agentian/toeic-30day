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
  wrongIds?: string[]    // 預設 []
}, todayISO?: string) → State
```
用於 `quiz.js` / `listening.js` / `mock.js` 交卷時呼叫一次。同一次呼叫會
**同時**：
- 附加一筆紀錄到 `quizHistory`（含 `at` 時間戳）
- 對每個 `wrongIds` 更新 `wrongBook[id]`：`count += 1`、`lastAt` 更新、
  `mastered` 重設為 `false`
- 更新 `streak`（依 `lastActive` 判斷連續天數：同一天不變、前一天則
  `current += 1`、否則重置為 1；`best` 取歷史最大）

`payload` 欄位不合法（`mode` 不在允許值內、`total`/`correct`/`seconds`
非非負數字、`wrongIds` 非陣列）會 `throw Error`，呼叫端應在遞交前自行檢查
數值來源。`todayISO` 為選填的日期覆寫（測試/時區調整用），一般呼叫不需要帶。

```js
Store.recordQuiz({
  mode: 'quiz', part: 'P5', total: 10, correct: 8, seconds: 245,
  wrongIds: ['p5-003', 'p5-017']
});
```

### 1.9 `Store.markWrongMastered(id)`

```js
Store.markWrongMastered(id: string) → State
```
用於 `review.js`（錯題本）「標記已懂」按鈕。將 `wrongBook[id].mastered`
設為 `true`（`count`/`lastAt` 保留）。若該 id 尚無 `wrongBook` 紀錄，會建立
一筆 `{ count: 0, lastAt: null, mastered: true }`。

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
  version: 1,
  startDate: "YYYY-MM-DD",      // 預設 = 建立當下今天
  examDate: "2026-09-20",
  dailyMinutes: 90,
  completedTasks: { "d1-t1": "2026-08-17T10:00:00.000Z" },
  tipsMastered: { "P2-03": true },
  quizHistory: [ { at, mode, part, total, correct, seconds, wrongIds: [] } ],
  wrongBook: { "p5-001": { count: 2, lastAt, mastered: false } },
  vocab: { "v0001": { box: 1, due: "2026-08-18", seen: 3, wrong: 1 } },
  streak: { current: 0, best: 0, lastActive: null },
  settings: { ttsRate: 1.0, ttsVoice: "", theme: "light" }
}
```
`vocab` 欄位的每個卡片形狀與 `SRS` 模組的卡片形狀一致——`vocab.js` 建議直接把
`SRS.initCard()` / `SRS.review()` 的回傳值透過 `Store.update(['vocab', id], card)`
寫回。

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

## 4. 測試

- `node tests/store.test.js` — 覆蓋：預設 schema、`get()` 不可變、
  `set()`/`update()` 不可變與驗證失敗丟錯、`completeTask`/`isTaskDone`、
  `recordQuiz` 同時更新 `wrongBook`/`streak`（含連續與斷streak情境）、
  `markWrongMastered`、`getDayIndex`/`daysToExam` 邊界、`import` 拒絕壞
  資料與版本不符、`export`/`import` round-trip、`reset()`、無
  `localStorage` 時退回記憶體、`localStorage` 跨實例持久化。
- `node tests/srs.test.js` — 覆蓋：`initCard`、`review` 升箱/降箱與間隔天數、
  `isDue` 邊界、`pickSession` 排序與 `newLimit`/`reviewLimit`、`stats`。

兩者皆為純 Node 腳本（用 `vm` 載入原始檔到 sandbox，`store.test.js`
另外 shim `window.localStorage`），無需額外測試框架即可執行。
