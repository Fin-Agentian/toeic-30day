# UI / App Shell API 文件（給 view 開發者看）

> 本文件是 view 開發者唯一需要參考的介面文件（另見 `css/style.css` 原始碼與 `docs/DESIGN.md` 的資料 schema）。
> 你只需要呼叫 `window.Util.*`、讀寫 `window.Store`（見 A3 文件）、並暴露 `window.Views.<name> = { render, destroy }`。
> 全站不使用 ES modules，所有檔案以一般 `<script>` 標籤載入，彼此靠掛在 `window` 上的全域溝通。

---

## 1. Util（`window.Util`，由 `js/util.js` 提供）

### DOM

#### `Util.$(selector, root?)`
`document.querySelector` 的簡寫。`root` 預設 `document`。
```js
var el = Util.$('.card');
var input = Util.$('#ttsRate', formEl);
```

#### `Util.$$(selector, root?)`
回傳 **陣列**（非 NodeList）。
```js
Util.$$('.option-btn').forEach(function (btn) { btn.disabled = true; });
```

#### `Util.h(tag, attrs, ...children)`
Hyperscript 風格 DOM 產生器，回傳真正的 `Element`（不是字串）。

- `tag`：一般標籤名稱，或簡寫 `"div.card#main"`（`div` 可省略、`.class` 可疊加多個、`#id` 最多一個）。
- `attrs`（可省略 / 傳 `{}`）：
  - `class` / `className`：字串或字串陣列
  - `style`：物件，camelCase 屬性直接指定給 `el.style`
  - `on*`：事件處理器，如 `onClick`、`onInput`、`onChange`、`onKeydown`（key 需符合 `on` + 大寫字母開頭）
  - `dataset`：物件，設定多個 `data-*`
  - `value` / `checked` / `selected` / `disabled` / `required` / `readOnly`：以 DOM property 賦值（適合表單元件）
  - 其餘 boolean 值：`true` 時以 `setAttribute(key, '')` 設定空屬性；`false`/`null`/`undefined` 略過
  - 其餘字串/數字：以 `setAttribute` 設定
- `children`：字串 / 數字 / `Node` / 陣列（可巢狀）/ `null`（略過，方便條件式渲染）

```js
var card = Util.h('div.card',
  { onClick: function () { Util.toast('點到卡片了'); } },
  Util.h('div.card-header', {},
    Util.h('h3.card-title', {}, '今日任務'),
    Util.h('span.badge.badge-primary', {}, '3/5')
  ),
  Util.h('div.card-body', {}, '完成今天的技巧複習與 10 題文法練習。'),
  isLocked ? null : Util.h('button.btn.btn-primary', { onClick: onStart }, '開始')
);
container.appendChild(card);
```

#### `Util.escapeHtml(str)`
逸出 `& < > " '`，用於**你必須用字串拼接 innerHTML** 的少數情況（一般請優先用 `h()` 避免 XSS）。
```js
container.innerHTML = '<p>' + Util.escapeHtml(userInputText) + '</p>';
```

### 陣列

#### `Util.shuffle(arr)`
Fisher-Yates 洗牌，**回傳新陣列**，不改動原陣列（符合不可變模式）。
```js
var shuffledOptions = Util.shuffle(question.options);
```

#### `Util.sample(arr, n)`
從陣列隨機取 `n` 個不重複元素（`n` 會被 clamp 到 `[0, arr.length]`），回傳新陣列。
```js
var todaysWords = Util.sample(TOEIC_DATA.vocab, 20);
```

### 日期（一律用 `"YYYY-MM-DD"` ISO 字串，採本地時區）

#### `Util.todayISO()` → `"2026-08-16"`

#### `Util.addDays(iso, n)` → 新的 ISO 字串
```js
var tomorrow = Util.addDays(Util.todayISO(), 1);
```

#### `Util.diffDays(a, b)` → 整數，`b - a` 的天數
```js
var daysLeft = Util.diffDays(Util.todayISO(), state.examDate); // 正數＝還沒到
```

#### `Util.fmtDate(iso, {weekday}?)` → `"2026/08/17（一）"`
`weekday: false` 時省略星期，回傳 `"2026/08/17"`。

#### `Util.fmtTime(seconds)` → `"mm:ss"`，用於計時器顯示
```js
timerEl.textContent = Util.fmtTime(secondsElapsed); // "05:32"
```

### 數字

#### `Util.clamp(n, min, max)`

#### `Util.pct(part, total)` → 0–100 整數（`total` 為 0 時回傳 0）
```js
var ratio = Util.pct(correctCount, totalCount) + '%';
```

### 其他

#### `Util.debounce(fn, wait)` → 回傳 debounce 過的函式（用於搜尋輸入等）
```js
searchInput.addEventListener('input', Util.debounce(function (e) {
  renderList(e.target.value);
}, 250));
```

#### `Util.uid(prefix?)` → 不重複字串，如 `"opt-l9k2x3-1"`

#### `Util.toast(msg, type?)`
`type`: `'info'`（預設）`'success'` `'warning'` `'error'`。3.2 秒後自動消失，右下角堆疊顯示。回傳 `{ close }` 可提早關閉。
```js
Util.toast('已儲存設定', 'success');
Util.toast('這一題答錯了，加入錯題本', 'warning');
```

#### `Util.modal({ title, body, actions })` → 回傳 `close()` 函式
- `body`：字串或 `Node`（可用 `Util.h(...)` 建立複雜內容）
- `actions`：`[{ label, class?, onClick(close) }]`；未指定 `onClick` 時按鈕點擊即關閉
- 按 `Esc` 或點擊遮罩皆會關閉；不使用瀏覽器原生 `confirm()`
```js
var close = Util.modal({
  title: '確定要重置所有進度嗎？',
  body: '此動作無法復原，將清除所有作答紀錄與單字進度。',
  actions: [
    { label: '取消', class: 'btn btn-ghost' },
    { label: '確定重置', class: 'btn btn-danger', onClick: function (close) {
        Store.reset();
        close();
        Util.toast('已重置', 'success');
      } }
  ]
});
```

#### `Util.qs(hash?)`
解析 `"#/quiz?part=P5&count=10"` 形式字串。省略參數時解析 `window.location.hash`。
```js
Util.qs('#/quiz?part=P5&count=10&task=d1-t1');
// → { route: "quiz", params: { part: "P5", count: "10", task: "d1-t1" } }
```
`App` 的路由系統已經幫你呼叫過 `Util.qs`，你的 `render(container, params)` 直接拿到的 `params` 就是這裡的 `.params`。

---

## 2. App（`window.App`，由 `js/app.js` 提供）

Hash router + 全域 App shell（頂欄、側欄、底部 tab bar、主題）。**view 開發者通常不需要直接呼叫這些函式**，但可用於頁面內導頁按鈕。

#### `App.navigate(hash)`
```js
App.navigate('#/quiz?part=P5&count=10&task=d1-t1');
```

#### `App.currentRoute()` → 目前路由名稱字串，例如 `"quiz"`；尚未渲染時為 `null`

#### `App.registerView(name, viewObj)`
以程式方式註冊 view（等同 `window.Views[name] = viewObj`）。**一般 view 檔案請直接寫 `window.Views.<name> = {...}`**，不必呼叫這個函式；它主要提供給需要動態註冊的情境。

#### `App.start()`
初始化 router 與頂欄，`DOMContentLoaded` 時已自動呼叫一次，不需要自己再呼叫。

### 路由清單
`dashboard`（預設）`plan` `tips` `quiz` `listening` `vocab` `mock` `review` `settings`。
未知路由會顯示 dashboard 內容（不改變網址）；對應的 `window.Views.<name>` 不存在時，`#view` 會顯示「此頁面尚未完成」的友善空狀態，不會拋錯。

---

## 3. Views 契約

每個 `js/views/<name>.js` 檔案須在**檔案載入時**直接掛上：
```js
(function () {
  'use strict';

  function render(container, params) {
    // params 來自網址 query，例如 { part: "P5", count: "10" }
    container.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {}, Util.h('h1', {}, '閱讀做題'))
    ));
    // ... 建立內容並 appendChild 到 container
  }

  function destroy() {
    // 選用：清除 setInterval/setTimeout、移除非 container 內的事件監聽（例如 document 上的）
    // router 已經會自動清空 container.innerHTML，不需要你手動清空
  }

  window.Views = window.Views || {};
  window.Views.quiz = { render: render, destroy: destroy };
})();
```

- `render(container, params)`：`container` 是已清空的 `<main id="view">`；直接 `appendChild` 你建立的節點即可（**不要**用字串塞 `innerHTML`，除非搭配 `Util.escapeHtml`）。
- `destroy()`：**選用**。router 切換路由前會呼叫上一個 view 的 `destroy()`（若存在）。用來清 timer、TTS 播放、`document`/`window` 層級的事件監聽；`container` 本身的清空由 router 負責。
- 缺資料時（`TOEIC_DATA.xxx` 尚未載入或為空）**必須**顯示友善空狀態（用 `.empty-state`，見下），不可拋出例外，否則 router 會顯示錯誤畫面。
- 每個 view 檔案 < 800 行；需要拆分時抽成同資料夾內的輔助檔案並在 `index.html` 於該 view 之前加一行 `<script>`（需同時更新 `docs/DESIGN.md` §3）。

---

## 4. CSS Class 速查表

所有變數與元件定義在 `css/style.css`，深色模式透過 `<html data-theme="dark">` / `="light"` 或系統 `prefers-color-scheme` 自動切換（由 `App` 的主題切換按鈕控制，寫入 `Store.settings.theme`）。

### 版面
| Class | 說明 |
|---|---|
| `.main-view` | `#view` 容器本身既有的 class，一般不需再包一層 |
| `.view-header` / `.view-title` / `.view-subtitle` | 頁面標題列（左標題、右可放操作按鈕） |
| `.stat-grid` / `.stat-card` / `.stat-value` / `.stat-label` | 統計卡片格線（如儀表板的今日進度、連續天數） |

```html
<div class="view-header">
  <div class="view-title">
    <h1>儀表板</h1>
    <p class="view-subtitle">Day 5 / 30 · 距考試 35 天</p>
  </div>
  <button class="btn btn-primary">開始今日任務</button>
</div>
<div class="stat-grid">
  <div class="stat-card"><div class="stat-value">72%</div><div class="stat-label">本週正確率</div></div>
  <div class="stat-card"><div class="stat-value">🔥 6</div><div class="stat-label">連續天數</div></div>
</div>
```

### 按鈕
`.btn` + 一個修飾：`.btn-primary` `.btn-ghost` `.btn-danger`；尺寸 `.btn-sm`；`.btn-block`（100% 寬）。
```html
<button class="btn btn-primary">送出答案</button>
<button class="btn btn-ghost btn-sm">略過</button>
<button class="btn btn-danger">刪除紀錄</button>
```
純圖示按鈕（頂欄用）：`.icon-btn`（44×44 觸控區）。

### 卡片
`.card`（`.card-header` `.card-title` `.card-subtitle` `.card-body` `.card-footer`/`.card-actions`）；可點擊卡片加 `.card-clickable`。
```html
<div class="card card-clickable">
  <div class="card-header">
    <div><div class="card-title">P2-03 間接問句</div><div class="card-subtitle">聽力 · 高優先</div></div>
    <span class="badge badge-warning">未掌握</span>
  </div>
  <div class="card-body">被問到 wh- 問句時，常見誤答是選相似發音的選項……</div>
  <div class="card-actions"><button class="btn btn-ghost btn-sm">標記已掌握</button></div>
</div>
```

### Badge / Pill
`.badge`（`.badge-primary` `.badge-success` `.badge-warning` `.badge-danger`，無修飾為中性灰）；`.pill`（頂欄倒數/Day 用，`.pill-countdown`）。
```html
<span class="badge badge-success">已掌握</span>
<span class="pill pill-countdown">⏳ 距考試 35 天</span>
```

### Progress
- Bar：`.progress-bar` 外層（軌道）+ `.progress-bar-fill`（用 inline `style.width` 或 `style="width:72%"` 控制百分比；可加 `.is-success`/`.is-warning`/`.is-danger` 換色）。
```html
<div class="progress-bar"><div class="progress-bar-fill" style="width: 72%"></div></div>
```
- Ring：`.progress-ring`（`viewBox="0 0 100 100"`, `cx=50 cy=50 r=40`，圓周 ≈ `251.2`）＋ `.progress-ring-track`（底色）＋ `.progress-ring-value`（用 `stroke-dasharray` / `stroke-dashoffset` 控制進度，JS 算法：`offset = circumference * (1 - ratio)`）＋ 可選 `.progress-ring-label`（文字需再 `rotate(90deg)` 轉回正向，因整個 svg 已 `rotate(-90deg)` 讓 0% 從正上方開始）。
```html
<svg class="progress-ring" viewBox="0 0 100 100">
  <circle class="progress-ring-track" cx="50" cy="50" r="40"></circle>
  <circle class="progress-ring-value" cx="50" cy="50" r="40"
          style="stroke-dasharray: 251.2; stroke-dashoffset: 70.3"></circle>
  <text class="progress-ring-label" x="50" y="58">72%</text>
</svg>
```
```js
var circumference = 2 * Math.PI * 40; // 251.2
valueCircle.style.strokeDasharray = circumference;
valueCircle.style.strokeDashoffset = circumference * (1 - ratio); // ratio: 0~1
```

### 表格
`.table-wrap`（`overflow-x:auto`，寬表格必包這層以免撐破版面）> `.table`。
```html
<div class="table-wrap">
  <table class="table">
    <thead><tr><th>日期</th><th>模式</th><th>正確率</th></tr></thead>
    <tbody><tr><td>08/16</td><td>P5</td><td>80%</td></tr></tbody>
  </table>
</div>
```

### 選項按鈕（做題 / 聽力作答）
`.option-list` 包住多個 `.option-btn`；狀態修飾（作答後套用）：`.is-selected`（使用者選的，尚未公布正確答案時）`.is-correct`（正確答案）`.is-incorrect`（使用者選錯的那個）。內部慣用結構：`.option-label`（A/B/C/D 圓形字母）+ `.option-text` + 可選 `.option-mark`（✓/✗ 圖示）。
```html
<div class="option-list">
  <button class="option-btn is-correct" disabled>
    <span class="option-label">A</span><span class="option-text">their</span><span class="option-mark">✓</span>
  </button>
  <button class="option-btn is-incorrect" disabled>
    <span class="option-label">B</span><span class="option-text">them</span><span class="option-mark">✗</span>
  </button>
  <button class="option-btn"><span class="option-label">C</span><span class="option-text">theirs</span></button>
</div>
```

### 月曆格（30 天計畫）
`.calendar-grid`（7 欄週曆版）或 `.day-grid`（1–30 天流式排列，`auto-fill`）；格子用 `.calendar-cell`，內部放 `.cell-day`（數字）+ `.cell-label`（主題/完成度）；狀態：`.is-today` `.is-done` `.is-partial` `.is-future` `.is-empty`（月曆版補空白格用，隱藏但保留版面）。
```html
<div class="day-grid">
  <div class="calendar-cell is-done"><span class="cell-day">1</span><span class="cell-label">診斷期</span></div>
  <div class="calendar-cell is-today"><span class="cell-day">5</span><span class="cell-label">文法加強</span></div>
  <div class="calendar-cell is-future"><span class="cell-day">6</span><span class="cell-label">聽力P3</span></div>
</div>
```

### 閃卡（單字 SRS）
`.flashcard`（外層，固定尺寸）> `.flashcard-inner`（實際翻轉的元素，點擊它或外層切換 `.is-flipped`）> `.flashcard-front` / `.flashcard-back`。文字用 `.flashcard-word` `.flashcard-pos` `.flashcard-zh` `.flashcard-example`。
```html
<div class="flashcard" id="fc1">
  <div class="flashcard-inner">
    <div class="flashcard-front">
      <div class="flashcard-word">invoice</div>
      <div class="flashcard-pos">n.</div>
    </div>
    <div class="flashcard-back">
      <div class="flashcard-zh">發票、請款單</div>
      <div class="flashcard-example">Please find the attached invoice.</div>
    </div>
  </div>
</div>
```
```js
// 翻面：切換外層 .flashcard 的 is-flipped（不是 .flashcard-inner）
fc1.addEventListener('click', function () { fc1.classList.toggle('is-flipped'); });
```

### 空狀態 / 錯誤狀態
`.empty-state`（置中圖示 + 標題 + 說明文字 + 可選按鈕），錯誤變化加 `.empty-state-error`。
```html
<div class="empty-state">
  <div class="empty-state-icon">📭</div>
  <h2>目前沒有錯題</h2>
  <p>太棒了！去做幾題累積練習量吧。</p>
  <button class="btn btn-primary">開始做題</button>
</div>
```

### 表單元件
`.field`（`.field-label` + 控制項 + 可選 `.field-hint`）；控制項：`.input` `.select` `textarea.textarea`；`.checkbox-row`（勾選框列，內含原生 `<input type="checkbox">`）。
```html
<div class="field">
  <label class="field-label" for="dailyMinutes">每日可用時數（分鐘）</label>
  <input class="input" id="dailyMinutes" type="number" min="15" step="15">
  <p class="field-hint">會用來調整每日任務量。</p>
</div>
<label class="checkbox-row"><input type="checkbox"><span>啟用深色模式自動跟隨系統</span></label>
```

### Toast / Modal
容器已內建於 `index.html`（`#toast-container`、`#modal-root`），**一律透過 `Util.toast()` / `Util.modal()` 呼叫**，不要手刻 DOM 或使用 `alert/confirm/prompt`。

### 工具類別
`.u-flex` `.u-flex-col` `.u-items-center` `.u-justify-between` `.u-gap-sm` `.u-gap-md` `.u-mt-md` `.u-text-muted` `.u-text-secondary` `.u-text-center` `.u-sr-only`（螢幕閱讀器專用文字，視覺隱藏）。

---

## 5. 響應式與 Layout 慣例
- `≥1024px`：桌機側欄常駐（`.sidebar`），底部 tab bar 隱藏。
- `<1024px`：`.sidebar` 為左側抽屜（漢堡選單 `#sidebarToggle` 開關，帶 `.sidebar-backdrop` 遮罩），底部顯示 `.bottom-tabbar`。
- 所有互動元件（按鈕、選項、tab）觸控目標 ≥ 44px（已內建於 `.btn` `.icon-btn` `.option-btn` `.tab-item` 等）。
- 寬內容（表格、题干含長英文例句、月曆）務必包一層 `overflow-x:auto`（表格請用既有的 `.table-wrap`），避免撐破版面造成整頁橫向捲動。
- view 內請用 `Util.h()` 組出的節點 `appendChild` 進 `container`；避免用 `container.innerHTML = "..."` 整段字串塞入（除非內容已用 `Util.escapeHtml` 處理過使用者資料）。

---

## 6. 主題（深色模式）
- 狀態存在 `Store.get().settings.theme`：`"light"` | `"dark"` | `"auto"`。
- 頂欄 `#themeToggle` 按鈕會依序切換 `light → dark → auto → light …`，並呼叫 `Store.set(...)` 持久化。
- `auto` 時移除 `<html>` 的 `data-theme` 屬性，改由 `prefers-color-scheme` 媒體查詢決定外觀。
- view 開發者不需自行處理主題邏輯，寫 CSS 變數（`var(--color-*)`）即可自動適應兩種主題；若要新增顏色變數，統一加在 `css/style.css` 的 §2（`:root` / 對應 dark 區塊）。
