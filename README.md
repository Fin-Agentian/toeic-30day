# 多語言學習平台

> 🌐 線上版（GitHub Pages）：<https://fin-agentian.github.io/toeic-30day/>　— 任何裝置開網址即可練習；進度存於各自瀏覽器，不與他人共用。

一個**純靜態網頁**的自學平台，首頁選語言後進入該語言的學習介面。無 build 流程、無後端、無帳號、無外部 CDN，所有進度存在瀏覽器 `localStorage`。

| 語言 | 範圍 | 內容 |
|---|---|---|
| 🇬🇧 **多益英語** | 目標 700+ | 30 天衝刺計畫、閱讀診斷室、Part 1–7 題庫、單字 SRS、迷你模考、錯題本 |
| 🇯🇵 **日本語** | 入門 → N5 | 五十音 104 音、N5 單字 120 個、N5 文法 30 條、助詞題庫、錯題本 |
| 🇪🇸 **Español** | 入門 → A1 | 發音規則 22 條、30 個動詞的現在式變位、A1 單字 120 個、常用句型 32 條、錯題本 |

**三個語言的進度完全獨立**（各自的 `localStorage` 命名空間），互不干擾，也各自可以單獨匯出備份或重置。

**共用的學習引擎**：三個語言都用同一套 Leitner 5 箱間隔複習（SRS）與三層檢討法錯題本（標錯因 → 排程重做 → 連續答對才算精通）。發音一律走瀏覽器內建的 Web Speech API，各語言帶自己的語言碼（en-US / ja-JP / es-ES）。

**英語模組的重心在閱讀**：做題會記錄每題秒數與考點，「閱讀診斷室」據此算出各考點正確率、配速與粗估 RC 分數，並排出「接下來該做什麼」。

詳細設計契約見 [`docs/DESIGN.md`](docs/DESIGN.md)；view 開發者介面文件見 [`docs/API_ui.md`](docs/API_ui.md)（Util / DOM）與 [`docs/API_infra.md`](docs/API_infra.md)（Store / SRS / TTS / Reading）。

## 架構：怎麼再加一個語言

```
js/platform.js    語言註冊表（路由、TTS 語言碼、儲存 key、導覽項目）
js/langstore.js   非英語模組的狀態層，LangStore.for('ja') 取得該語言的介面
js/langui.js      四個共用 view 工廠：SRS 閃卡 / 選擇題測驗 / 錯題本 / 學習總覽
js/views/hub.js   語言選擇入口
```

加一個新語言只要三步：在 `platform.js` 的 `LANGUAGES` 加一筆（含 nav 路由清單）、
寫該語言的 `data/*.js`、寫一支 `js/views/<code>.js` 用 `LangUI` 的工廠註冊那些路由。
`app.js` 不需要改 —— 路由白名單與導覽列都是從 `Platform` 讀出來的。

英語（TOEIC）刻意保留原本的 `window.Store` 與 `toeic30:state`，沒有被搬進這套架構，
因為它的資料模型（30 天計畫、閱讀考點統計、聽力 Part）和通用引擎差異太大，
強行統一只會讓兩邊都難維護 —— 而且不動它，既有使用者的進度就零風險。

## 如何開啟

**方式一：直接雙擊 `index.html`**
用 Chrome 或 Edge 開啟即可（`file://` 協定）。因為所有資料檔都以 `<script>` 標籤掛載全域變數（不使用 `fetch` 讀 JSON），不會被瀏覽器的本機 CORS 限制擋下。

**方式二：本機簡易伺服器**
```bash
cd TOEIC_Practice
python3 -m http.server 8000
```
再用瀏覽器打開 `http://localhost:8000`。

兩種方式功能完全相同，第二種只是比較接近正式部署環境。

## 單檔版 dist/

想在手機瀏覽器開啟、或只想要「一個檔案」就能整包帶走時，可以打包成單一 HTML：

```bash
node scripts/build_single.js
```

會依 `index.html` 中 `<link rel=stylesheet>` 與 `<script src>` 的順序，把 `css/*.css`、`data/*.js`、`js/**/*.js` 全部內容 inline 進去，輸出兩個檔案到 `dist/`：

| 檔案 | 用途 |
|---|---|
| `dist/toeic30.html` | 完整獨立 HTML（含 `<!DOCTYPE>` / `<head>` / meta viewport / favicon），可直接雙擊開啟，也可傳到手機（如透過通訊 App、雲端硬碟）用瀏覽器打開，無需網路、無需伺服器 |
| `dist/toeic30.fragment.html` | 片段版，不含 `<!DOCTYPE>`/`<html>`/`<head>`/`<body>` 標籤，只有 `<title>` + `<style>` + body 內容 + `<script>`，供嵌入到會自行提供 HTML 骨架的容器（例如既有的 CMS / iframe 內容區） |

兩者內容與功能都與 `index.html` + 各分散檔案完全相同，只是打包成單檔（約 1MB），不需要額外執行 `npm install`（此腳本無任何相依套件）。每次 `data/`、`css/`、`js/` 內容更動後，需重新執行此指令才會反映到 `dist/`。

## 功能一覽

### 平台

| 頁面 | 路由 | 說明 |
|---|---|---|
| 語言選擇 | `#/hub` | 預設首頁。三個語言各顯示自己的進度摘要，選一個進入 |

### 🇯🇵 日本語

| 頁面 | 路由 | 說明 |
|---|---|---|
| 學習總覽 | `#/ja` | 連續天數、各單元進度、依「五十音 → 單字 → 文法」給下一步建議、匯出匯入 |
| 五十音 | `#/ja-kana` | 三分頁：五十音表（點字聽發音）／SRS 閃卡／認讀測驗（4 種出題方向） |
| N5 單字 | `#/ja-vocab` | 120 字 SRS 閃卡，可依主題篩選，附例句與 TTS 發音 |
| N5 文法 | `#/ja-grammar` | 30 條句型，分五階，含規則、例句與易錯提醒，可標記已讀 |
| 綜合測驗 | `#/ja-quiz` | 4 種模式：看日文選中文／看中文選日文／看漢字選讀音／助詞填空 |
| 錯題本 | `#/ja-review` | Leitner 排程重做 + 錯因分類 |

### 🇪🇸 Español

| 頁面 | 路由 | 說明 |
|---|---|---|
| 學習總覽 | `#/es` | 同日語，依「發音 → 變位 → 單字 → 句型」給下一步建議 |
| 發音規則 | `#/es-sounds` | 22 條規則分四類（母音／易錯子音／字母組合／重音），每條附可聽的例字 |
| 動詞變位 | `#/es-verbs` | 三分頁：變位表（30 個動詞 × 6 人稱，逐格 SRS 追蹤）／ser vs estar 對照／填變位練習 |
| A1 單字 | `#/es-vocab` | 120 字 SRS 閃卡，名詞一律附 el／la |
| 常用句型 | `#/es-phrases` | 32 條可直接開口用的整句，分五種場合 |
| 綜合測驗 | `#/es-quiz` | 4 種模式：看西語選中文／看中文選西語／判斷陰陽性／動詞變位 |
| 錯題本 | `#/es-review` | 同日語 |

### 🇬🇧 多益英語

| 頁面 | 路由 | 說明 |
|---|---|---|
| 儀表板 | `#/dashboard` | 距考試倒數、Day X/30、今日任務清單、30 天進度環、連續天數、弱點提示 |
| 30 天計畫 | `#/plan` | 月曆格檢視 + 每日任務清單，勾選任務即記錄完成時間 |
| 技巧庫 | `#/tips` | 依 Part 篩選 / 搜尋 / priority 排序，可標記「已掌握」，附原始資料來源連結 |
| 閱讀做題 | `#/quiz` | Part 5 / 6 / 7 測驗引擎：**考點專項練習**、每題計時、逐題或整份交卷、中文詳解、交卷後的配速與考點分解 |
| 閱讀診斷室 | `#/reading` | **粗估 RC 分數、考點正確率排行、配速分析、十大文法判斷框架、Part 6/7 題型攻略** |
| 聽力練習 | `#/listening` | Part 1–4，用 Web Speech API 朗讀題目（預設只播一次可調），作答後顯示逐字稿與解析 |
| 單字卡 | `#/vocab` | SRS 閃卡，依 Leitner 5 箱排今日新字 / 複習字，另附拼字、選擇小測 |
| 迷你模考 | `#/mock` | 計時混合題組模考（mini / half），結束後給總分、Part 正確率、弱點建議 |
| 錯題本 | `#/review` | 三層檢討法：**標記錯因 → Leitner 排程重做 → 連續答對才算精通**，附錯因分佈與今日到期佇列 |
| 設定 | `#/settings` | 開始日 / 考試日 / 每日讀書時數 / TTS 語速與語音 / 資料匯出匯入 / 重置 |

所有狀態（完成任務、錯題、單字複習進度、連續天數等）都不可變地更新並持久化在 `localStorage`（key 前綴 `toeic30:`），可在「設定」頁匯出成 JSON 備份，或匯入還原。

## 資料檔說明

`data/*.js` 一律以 `window.TOEIC_DATA.<key> = ...`（或附加模式 `.concat([...])`）掛載內容，`index.html` 依固定順序載入，缺檔時各 view 會顯示友善空狀態而非崩潰。

| 檔案 | 掛載鍵 | 內容 |
|---|---|---|
| `data/tips.js` | `TOEIC_DATA.tips` | 應考技巧卡片（P1–P7 / General / Vocab / Time / Plan） |
| `data/plan.js` | `TOEIC_DATA.plan` | 30 天讀書計畫（每日主題、任務、時數） |
| `data/vocab_1.js`, `data/vocab_2.js` | `TOEIC_DATA.vocab` | 單字（含例句、詞性、主題分類、搭配詞） |
| `data/questions_p5_1.js` ~ `_3.js` | `TOEIC_DATA.p5` | Part 5 單句填空題 |
| `data/questions_p6.js` | `TOEIC_DATA.p6` | Part 6 短文填空（含句子插入題） |
| `data/questions_p7_1.js`, `_2.js` | `TOEIC_DATA.p7` | Part 7 閱讀理解（single / double / triple） |
| `data/listening_1.js` | `TOEIC_DATA.listening.p1` + `.p2` | 照片描述、應答問題 |
| `data/listening_2.js` | `TOEIC_DATA.listening.p3` | 簡短對話 |
| `data/listening_3.js` | `TOEIC_DATA.listening.p4` | 簡短獨白 |
| `data/reading_frameworks.js` | `TOEIC_DATA.reading` | 十大文法判斷框架、閱讀配速表、Part 6/7 題型攻略、錯因分類（原創教材） |

日語與西班牙語的資料掛在另一個全域變數 `window.LANG_DATA.<語言代碼>`：

| 檔案 | 掛載鍵 | 內容 |
|---|---|---|
| `data/ja_kana.js` | `LANG_DATA.ja.kana` | 五十音 104 音 + 分類、行分組、學習順序建議 |
| `data/ja_vocab_1.js` | `LANG_DATA.ja.vocab` | N5 單字 120 個（含讀音、羅馬拼音、詞性、例句） |
| `data/ja_grammar.js` | `LANG_DATA.ja.grammar` | N5 文法 30 條 + 五個學習階段 |
| `data/ja_quiz_bank.js` | `LANG_DATA.ja.particleQuiz` | 助詞填空 24 題（手寫，每題附判斷理由） |
| `data/es_sounds.js` | `LANG_DATA.es.sounds` | 發音規則 22 條 + 四個分類 |
| `data/es_verbs.js` | `LANG_DATA.es.verbs` | 30 個動詞的現在式六人稱變位、三組規則字尾、ser vs estar 對照 |
| `data/es_vocab_1.js` | `LANG_DATA.es.vocab` | A1 單字 120 個（名詞含冠詞與陰陽性） |
| `data/es_phrases.js` | `LANG_DATA.es.phrases` | 常用句型 32 條 + 五種場合 |

完整 schema 定義見 `docs/DESIGN.md` §5。

### 閱讀強化怎麼運作

1. **做題時**：`#/quiz` 記錄每題花掉的秒數，以及該題的考點（P5 用 `tag`、P6 用 `type`、P7 用 `skill`）。
2. **交卷後**：結果頁直接給配速分析（實際 vs 目標秒數）與本次考點分解，弱的考點可一鍵開專項練習；
   答錯的題目可標記錯因，答對的題目可標記「其實是猜的」丟回錯題本。
3. **累積起來**：`#/reading` 依 `readingStats` 算出各考點正確率排行、整份 Reading 75 分鐘做不做得完、
   粗估 RC 分數，並排出依「投入時間 → 分數回收」順序的行動清單。
4. **錯題不流失**：錯題進 Leitner 排程（1 → 2 → 4 → 7 → 14 天），答錯退回第 1 箱，
   連續答對爬到第 5 箱才標記精通。

目標配速（P5 20 秒 / P6 30 秒 / P7 60 秒／題）定義在 `js/reading.js` 的 `PACE_TARGET`，
依 Reading Section 75 分鐘 100 題換算，是全站唯一來源。

> 分數換算與所有練習題、例句、解析皆為原創學習內容，不含任何正式試題；粗估分數僅供追蹤趨勢，非官方換算。
> TOEIC 為 Educational Testing Service（ETS）的註冊商標，本專案與 ETS 無隸屬或背書關係。

## 如何驗證

```bash
# 1. 所有 JS 檔語法檢查
find . -name '*.js' -not -path '*/node_modules/*' | xargs -n1 node --check

# 2. 英語資料檔 schema 驗證（id 唯一性、answer 範圍、必填欄位、考點與題庫交叉檢查）
node scripts/validate_data.js

# 3. 日語 / 西班牙語資料驗證（五十音數量、動詞變位是否符合宣告的規則、
#    名詞是否都標了陰陽性、日文欄位是否混入非日文字元等）
node scripts/validate_lang_data.js

# 4. 純函式單元測試
node tests/srs.test.js         # Leitner SRS 演算法
node tests/store.test.js       # 英語 Store：狀態管理、錯題 ID 正規化、v1→v2 migration
node tests/reading.test.js     # 閱讀診斷引擎
node tests/langstore.test.js   # 語言註冊表 + 日西狀態層（重點：命名空間隔離）
```

全部純 Node 執行，不需要安裝任何套件（無 `package.json` / `node_modules`）。

> `validate_lang_data.js` 會擋掉日文欄位裡混進拉丁字母或其他語言字元的情況 ——
> 這類雜訊在人工校對時很容易漏掉，但機器一抓就出來。

## 瀏覽器需求

- 建議使用 **Chrome** 或 **Edge**（Web Speech API 支援度最完整）。
- 聽力練習（Part 1–4）的 TTS 發音需要系統已安裝**英文語音**；詳見下方「聽力語音（TTS）需求與安裝英文語音」。
- 需啟用 JavaScript；不支援 IE。
- 響應式版面：≥1024px 顯示側邊欄，<768px 顯示底部 tab bar。

## 聽力語音（TTS）需求與安裝英文語音

聽力練習（`#/listening`）與設定頁的「測試播放」都是用瀏覽器內建的 Web Speech API（`speechSynthesis`）朗讀英文，音色與可用語音完全取決於**作業系統**已安裝的語音清單（`speechSynthesis.getVoices()`），不是由本網站提供或下載。若系統沒有安裝任何英文語音，聽力頁與設定頁會顯示「未偵測到英文語音」的友善提示（不會阻擋作答），建議：

- **Windows**：設定 → 時間與語言 → 語音 → 新增語音 → 搜尋並安裝 `English (United States)`。
- **macOS**：系統設定 → 輔助使用 → 朗讀內容 → 系統聲音 → 管理聲音，勾選或下載一個英文語音。
- 安裝完成後重新整理頁面即可套用；若暫時無法安裝，也可以在作答後閱讀逐字稿練習。

`js/tts.js` 內部的挑選順序：優先找 `lang` 以 `en` 開頭的語音 → 找不到時退回 `lang` 中含 `en`（不分大小寫，涵蓋 `en_US`、`en-US` 等寫法）的語音 → 再退回系統預設語音；即使找不到任何英文語音、必須使用預設語音發音，`utterance.lang` 仍會固定設為 `en-US`，讓瀏覽器盡量以英文發音規則朗讀。

**開啟方式**：可直接用瀏覽器雙擊打開 `index.html`（`file://` 協定即可運作，見上方「如何開啟」）；若瀏覽器對 `file://` 有額外安全限制導致功能異常，改用 `python3 -m http.server` 起本機伺服器後改用 `http://localhost:8000` 開啟即可。
