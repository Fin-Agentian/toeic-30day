# TOEIC 30 天衝刺平台

一個**純靜態網頁**的 TOEIC 自學平台：每天打開後可以看今日任務、讀應考技巧、做閱讀題（Part 5/6/7）、練聽力（Part 1–4，用瀏覽器 TTS 發音）、背單字（Leitner 5 箱間隔複習 SRS）、做迷你模考，並自動累積錯題本與學習進度。無 build 流程、無後端、無外部 CDN，所有狀態存在瀏覽器 `localStorage`。

詳細設計契約見 [`docs/DESIGN.md`](docs/DESIGN.md)；view 開發者介面文件見 [`docs/API_ui.md`](docs/API_ui.md)（Util / DOM）與 [`docs/API_infra.md`](docs/API_infra.md)（Store / SRS / TTS）。

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

| 頁面 | 路由 | 說明 |
|---|---|---|
| 儀表板 | `#/dashboard` | 距考試倒數、Day X/30、今日任務清單、30 天進度環、連續天數、弱點提示 |
| 30 天計畫 | `#/plan` | 月曆格檢視 + 每日任務清單，勾選任務即記錄完成時間 |
| 技巧庫 | `#/tips` | 依 Part 篩選 / 搜尋 / priority 排序，可標記「已掌握」，附原始資料來源連結 |
| 閱讀做題 | `#/quiz` | Part 5 / 6 / 7 測驗引擎：計時、逐題或整份交卷、中文詳解 |
| 聽力練習 | `#/listening` | Part 1–4，用 Web Speech API 朗讀題目（預設只播一次可調），作答後顯示逐字稿與解析 |
| 單字卡 | `#/vocab` | SRS 閃卡，依 Leitner 5 箱排今日新字 / 複習字，另附拼字、選擇小測 |
| 迷你模考 | `#/mock` | 計時混合題組模考（mini / half），結束後給總分、Part 正確率、弱點建議 |
| 錯題本 | `#/review` | 彙整所有做題來源的錯題，可重做、標記已懂 |
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

完整 schema 定義見 `docs/DESIGN.md` §5。

## 如何驗證

```bash
# 1. 所有 JS 檔語法檢查
find . -name '*.js' -not -path '*/node_modules/*' | xargs -n1 node --check

# 2. 資料檔 schema 驗證（id 唯一性、answer 範圍、必填欄位等）
node scripts/validate_data.js

# 3. 純函式單元測試（SRS 演算法、Store 狀態管理）
node tests/srs.test.js
node tests/store.test.js
```

全部純 Node 執行，不需要安裝任何套件（無 `package.json` / `node_modules`）。

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
