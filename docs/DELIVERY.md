# TOEIC 30 天衝刺平台｜交付報告

> 考試日：2026-09-20　交付日：2026-08-16

## 1. 一句話總結

一個**純靜態網頁**的 TOEIC 30 天自學平台：每天打開看今日任務、讀技巧、做題、練聽力、背單字、模考，所有進度自動存在瀏覽器裡，不需要安裝任何東西、不需要網路伺服器。

### 線上版（私人 Artifact，手機/任何裝置可開）

- <https://claude.ai/code/artifact/bdf67a24-47ae-48bf-b28d-17b26f0767a7>（與 `dist/toeic30.fragment.html` 同一份內容；進度存在該網頁自己的瀏覽器儲存空間，與本機版不互通，可用「設定 → 匯出/匯入」搬移）

### 開啟方式

| 情境 | 做法 |
|---|---|
| 電腦，最快 | 直接**雙擊 `index.html`**，用 Chrome 或 Edge 開啟即可（`file://` 協定就能跑，資料檔是 `<script>` 掛載不是 `fetch`，不會被本機 CORS 擋） |
| 電腦，較接近正式環境 | `cd TOEIC_Practice && python3 -m http.server 8765`，瀏覽器開 `http://localhost:8765` |
| 手機 | 優先方式：把 `dist/toeic30.html` 傳到手機（LINE／AirDrop／雲端硬碟皆可）用瀏覽器開啟即可離線使用，無需網路、無需伺服器。備用方式：手機與電腦連同一個 Wi-Fi，在電腦上執行 `python3 -m http.server 8765`，用手機瀏覽器開 `http://<電腦的區網 IP>:8765`。 |

- 建議瀏覽器：**Chrome 或 Edge**（Web Speech API 支援度最完整）。
- 聽力練習用瀏覽器 TTS 朗讀，**需要系統已安裝英文語音**，沒裝的話頁面會友善提示、不會擋住作答（詳見第 7 節）。

---

## 2. 平台功能總覽

9 個頁面，左側 sidebar（桌機）／底部 tab bar（手機）切換：

| 頁面 | 路由 | 做什麼 | 對應研究來源技巧 |
|---|---|---|---|
| 儀表板 | `#/dashboard` | 距考試倒數、Day X/30、今日任務清單、進度環、連續天數、弱點提示 | 「先裸考建立基準、依弱點分配時間」「模考不倒扣、追蹤連續天數維持動力」——彙整自 8 份研究員報告的共識結論 |
| 30 天計畫 | `#/plan` | 月曆格檢視＋每日任務清單，勾選任務即記錄完成時間 | Prepedu「30天四階段結構」、Studying.jp「前兩週單字文法＋後兩週模擬題」、WanDing「逐週單字→試題→刷題」 |
| 技巧庫 | `#/tips` | 依 Part 篩選／搜尋／優先度排序，可標記「已掌握」，附原始資料來源連結 | 彙整全部 20 大來源＋其他參考來源的具體技巧，逐條附 `sources` 連結可回溯查證 |
| 閱讀做題 | `#/quiz` | Part 5／6／7 測驗引擎：計時、逐題或整份交卷、中文詳解 | Redswan Tutor「P5 每題20秒、P6 每題30秒配速」、Prepedu／PTT「P5+P6 合計20分鐘」共識、MyToeicCoach「flow test 連貫性優先」 |
| 聽力練習 | `#/listening` | Part 1–4，Web Speech API 朗讀題目（預設只播一次可調），作答後顯示逐字稿與解析 | TILC「無人照片刪除人稱代名詞選項」、MyToeicCoach「圖表題三步驟」、eStudyMe「相似音陷阱字」 |
| 單字卡 | `#/vocab` | SRS 閃卡（Leitner 5 箱），依到期日排今日新字／複習字，附拼字、選擇小測 | Readle App／mybest「情境分類例句版單字書優於字母序」、PTT「三層循環背誦法」 |
| 迷你模考 | `#/mock` | 計時混合題組模考（mini／half），結束給總分、Part 正確率、弱點建議 | YOTTA友讀／Prepedu「每週1-2次整回計時模考」、PTT「模考不中斷訓練疲勞作答」 |
| 錯題本 | `#/review` | 彙整所有做題來源的錯題，可重做、標記已懂 | 工程師也能這樣過生活／Michelle Chang「檢討時間為做題時間3-4倍」、Prepedu「三層檢討法」 |
| 設定 | `#/settings` | 開始日／考試日／每日讀書時數／TTS 語速與語音／資料匯出匯入／重置 | 支援個人化排程與資料備份，對應 Studying.jp「先評估可投入時數再反推目標分數」 |

所有狀態（完成任務、錯題、單字複習進度、連續天數等）不可變地更新並持久化在 `localStorage`（key 前綴 `toeic30:`），可在「設定」頁匯出成 JSON 備份、或匯入還原。

---

## 3. 30 天計畫摘要

### 四階段（依 `data/plan.js` 的 `phases` 定義）

| 階段 | 天數 | 目標 | 每日大致內容 | 模考節點 |
|---|---|---|---|---|
| 診斷與基礎 | Day 1–7 | 用一次裸考迷你模考建立基準分數，同步打好 Part1/Part2 聽力與 Part5 文法基礎，養成每日背單字的習慣 | 讀技巧＋Part1/2聽力練習＋Part5文法練習＋每日20字SRS | Day 1：迷你模考（裸考診斷） |
| 弱點強化 | Day 8–16 | 針對診斷結果加強 Part3/Part4 聽力理解與 Part6/Part7 閱讀技巧，開始精聽跟讀，並鞏固單字記憶策略 | Part3/4聽力＋Part6/7閱讀＋跟讀練習＋每日20字SRS＋每3-4天錯題檢討 | Day 14：第一次半回模考 |
| 模考實戰 | Day 17–25 | 每3天一次整回模考（mini／half交替），嚴格計時訓練臨場節奏，配合三層檢討法持續補強錯題本 | 配速練習＋整回模考＋詳解檢討（3-4倍時間）＋每日20字SRS | Day 17（mini）、20、23（half） |
| 衝刺與調整 | Day 26–30 | 停止學習新技巧，全力複習錯題本、保持輕量模考手感，調整作息與心態迎接考試 | 錯題本複習為主＋輕量刷題維持手感＋考前作息調整＋考場物品清單 | Day 26：最後一次半回模考 |

### 每日時間量（實際彙總自 `data/plan.js` 30 天 `minutes` 欄位）

| 階段 | 天數 | 平均分鐘/天 | 範圍（最少–最多） |
|---|---|---|---|
| 診斷與基礎 | 7 | 78.6 | 53–123 |
| 弱點強化 | 9 | 75.2 | 59–135 |
| 模考實戰 | 9 | 92.7 | 63–145 |
| 衝刺與調整 | 5 | 83.8 | 60–145 |
| **全部 30 天** | 30 | **82.7** | 53–145 |

模考當天（Day 1、14、17、20、23、26，共 6 次：2 次 mini＋4 次 half）時間明顯較長（含詳解檢討），符合研究共識「檢討時間為做題時間 3–4 倍」；非模考日大多落在 55–85 分鐘。

### 最後一週策略（Day 26–30）

- 不再學新技巧，全力複習錯題本（三層檢討法，重做尚未標記已懂的題目）。
- 輕量刷題維持手感即可，不追求新題量。
- Day 28 起調整作息，把精神最好的時段調到考試當天時段，考前一晚不熬夜。
- Day 30 做最後一次考場物品清單與答題卡策略確認（2B鉛筆、不留白統一塗同一選項等）。

### 今天就開始：Day 1 四件事

| 順序 | 任務 | 時間 |
|---|---|---|
| 1 | 起點裸考｜迷你模考診斷（建立聽力＋閱讀基準分數） | 25 分鐘 |
| 2 | 讀應考心態與讀書計畫技巧（General）4 條 | 10 分鐘 |
| 3 | Part 5 文法診斷 15 題（找出目前最弱的文法點） | 18 分鐘 |
| 4 | 背 20 個核心單字＋複習到期單字（SRS 第一輪） | 20 分鐘 |

打開 `index.html` → 儀表板點「開始今日任務」，四件事共約 73 分鐘。

---

## 4. 前 20 大熱門來源精華

彙整自 8 份研究員報告（112 筆原始來源，去重後 98 筆），依熱門度／具體度／可信度排名。完整 20 名清單與「其他值得參考來源」請見 [`research/top20_sources.md`](../research/top20_sources.md)。

| 排名 | 來源 | 連結 | 一句話重點 |
|---|---|---|---|
| 1 | Prepedu（PREP Education） | [多益一個月讀書計畫](https://prepedu.com/zh-hant/blog/one-month-of-preparation-for-toeic-test) | 30天四階段讀書計畫＋P5+P6=20分鐘、P7=55分鐘黃金配速，內容涵蓋最廣 |
| 2 | 阿滴英文 | [多益改新制後還能考滿分990嗎](https://www.youtube.com/watch?v=1Kz7AYuYHfU) | 四度990滿分實證心得，觸及率最高的中文YouTube來源 |
| 3 | ETS Global | [How to prepare for the TOEIC L&R test](https://etsglobal.org/About-us/News/5-Tips-to-Prepare-for-the-TOEIC-R-Listening-and-Reading-Test) | 唯一官方權威來源，說明四種口音、200題架構第一手資訊 |
| 4 | 時代國際英日韓語（TILC） | [多益聽力Part3/4關鍵技巧](https://online.tilc.com.tw/posts/toeic-27) | 技巧拆解到陷阱選項分類與作答節奏秒數，適合初中階考生 |
| 5 | MyToeicCoach | [TOEIC Part 6 Guide](https://www.mytoeiccoach.com/toeic-part6-guide) | Part3/4/6拆解最細緻，圖表題與flow test講解深入 |
| 6 | PTT TOEIC板 | [新制多益閱讀時間分配](https://www.ptt.cc/bbs/TOEIC/M.1533477895.A.C08.html) | 台灣最老牌考生社群，正序vs倒序作答長年被引用討論 |
| 7 | eStudyMe | [Grammar TOEIC](https://estudyme.com/en/grammar-toeic/) | 詞性判斷口訣與字首字尾判斷法整理具體 |
| 8 | FamousJames Adventures | [TOEIC Part 5 Grammar & Vocabulary Tips](https://www.famousjamesadventures.com/blog/mastering-toeic-part-5-incomplete-sentences-strategy-and-tips) | 實際範例句拆解解題流程，Part6雙向承接檢查步驟清楚 |
| 9 | WORD UP 聰明學習 | [多益閱讀寫不完？準備秘訣](https://blog.wordup.com.tw/blog/2021/03/17/toeic-reading-part-preparation/) | 台灣長青教材站，畫卡與時間分配建議被多篇來源交叉引用 |
| 10 | Dcard 多益高分版 | [一個月準備期，多益900分心得](https://www.dcard.tw/f/exam/p/233677545) | 台灣年輕族群社群，真實430→900分躍進歷程 |
| 11 | Sakablog | [TOEIC990点を取った勉強法](https://sakachanblog.com/toeic990) | 日本滿分考生，影子跟讀＋文法1000題本刷題法 |
| 12 | vocus：一個月400→850 | [多益一個月從400衝刺到850](https://vocus.cc/article/66208cd4fd89780001caabcc) | 42天400→850完整排程，每日閱讀75分鐘＋聽力45分鐘 |
| 13 | Redswan Tutor | [TOEIC Test Structure: 7-Part Breakdown](https://redswantutor.com/toeic-test-structure-complete-7-part-breakdown-with-time-management-guide/) | 逐Part秒數配速表，「標記後不回頭」原則 |
| 14 | WanDing：500→875 | [多益準備一個月從500到875](https://wanding.pixnet.net/blog/post/48988987) | 逐週讀書計畫拆解到早中晚時段，三指神功畫卡技巧 |
| 15 | 語言中心 Language-Center | [新多益閱讀句子填空高分技巧](https://www.language-center.com.tw/toeic/exam/skill-1.html) | 指出新制已不能純靠位置判斷詞性，需搭配語意判斷 |
| 16 | Mogeul | [토익 LC 만점 전략](https://mogeul.com/career/%ED%86%A0%EC%9D%B5-lc-%EB%A7%8C%EC%A0%90-%EC%A0%84%EB%9E%B5-%ED%8C%8C%ED%8A%B8%EB%B3%84-%EA%B3%B5%EB%9E%B5%EB%B6%80%ED%84%B0-%EC%89%90%EB%8F%84%EC%9E%89-%EC%99%84%EB%B2%BD-%EC%A0%95%EB%A6%AC/) | 韓國視角LC全Part策略＋四步驟shadowing練習法 |
| 17 | AmazingTalker（韓語版） | [토익 시간분배 꿀팁](https://www.amazingtalker.co.kr/blog/ko/kr-en/48889/) | 高分群「逆序解題法」：先攻Part7雙三篇連鎖閱讀 |
| 18 | Engoo | [How To Stop Running Out of Time on TOEIC Reading](https://engoo.com/blog/study/how-to-stop-running-out-of-time-on-toeic-reading/) | 多語言版交叉驗證「先做Part7、字彙題優先」作答順序 |
| 19 | Studying.jp | [TOEIC本番まで1カ月！勉強のコツ](https://studying.jp/toeic/about-more/1month.html) | 唯一將讀書時數量化成分數期望值的來源 |
| 20 | 30-Day TOEIC Preparation Template | [Notion範本](https://www.notion.com/templates/30-day-toeic-preparation) | Notion範本評分4.85/5，唯一以工具形式呈現的來源 |

### 跨來源共識的 10 條核心應考技巧

1. **先寫一份裸考建立基準分數**，之後每次模考都跟基準比較進步幅度——[EnglishClub](https://www.englishclub.com/esl-exams/ets-toeic-tips.php)、[WanDing](https://wanding.pixnet.net/blog/post/48988987)
2. **30天拆成「前半打基礎、後半模考實戰」兩大段**（四週結構）——[Prepedu](https://prepedu.com/zh-hant/blog/one-month-of-preparation-for-toeic-test)、[Studying.jp](https://studying.jp/toeic/about-more/1month.html)、[WanDing](https://wanding.pixnet.net/blog/post/48988987)
3. **RC黃金配速：Part5+6合計20分鐘、Part7留55分鐘以上**——[Prepedu](https://prepedu.com/zh-hant/blog/time-management-in-toeic-exam)、[Redswan Tutor](https://redswantutor.com/toeic-test-structure-complete-7-part-breakdown-with-time-management-guide/)、[AmazingTalker](https://www.amazingtalker.co.kr/blog/ko/kr-en/48889/)
4. **每週安排1-2次整回計時模考，全程不中途休息**，訓練疲勞作答——[YOTTA友讀](https://www.yottau.com.tw/article/1351)、[PTT](https://www.ptt.cc/bbs/TOEIC/M.1584622253.A.2D2.html)
5. **檢討時間為做題時間的3-4倍**，用三層檢討法（表面層→技巧層→根本層）建立錯題本——[工程師也能這樣過生活](https://drshawnchang.pixnet.net/blog/post/294622400)、[Michelle Chang](https://medium.com/@cheezzya/toeic-990-sharing-a2ccfb9bda28)、[Prepedu](https://prepedu.com/zh-hant/blog/toeic-reading-strategies)
6. **分大題計時記錄**，找出耗時異常或錯誤率高的Part，比籠統多寫題更精準抓弱點——[PTT網頁版：多益930準備](https://www.pttweb.cc/bbs/TOEIC/M.1737536233.A.C8F)
7. **聽力靠四步驟影子跟讀法＋倍速練習（1.1→1.5倍速）雙軌並行**，並減少英翻中——[Mogeul](https://mogeul.com/career/%ED%86%A0%EC%9D%B5-lc-%EB%A7%8C%EC%A0%90-%EC%A0%84%EB%9E%B5-%ED%8C%8C%ED%8A%B8%EB%B3%84-%EA%B3%B5%EB%9E%B5%EB%B6%80%ED%84%B0-%EC%89%90%EB%8F%84%EC%9E%89-%EC%99%84%EB%B2%BD-%EC%A0%95%EB%A6%AC/)、[Sakablog](https://sakachanblog.com/toeic990)、[Dcard](https://www.dcard.tw/f/talk/p/224926365)
8. **最後一週停止背新單字、不學新技巧**，改成每天複習錯題筆記——[Prepedu](https://prepedu.com/zh-hant/blog/one-month-of-preparation-for-toeic-test)、[vocus](https://vocus.cc/article/66208cd4fd89780001caabcc)
9. **依目標分數反推所需單字量，選情境分類例句版單字書**優於字母序字典式單字書——[mybest](https://tw.my-best.com/115754)、[Readle App](https://readle-app.com/zh-hant/blog/toeic-vocabulary-list/)
10. **最後幾分鐘未做完的題目統一塗同一選項（不留白，不倒扣分）**；聽力結束後絕不可回頭補畫答案卡——[CRL, INSA Lyon](https://crl.insa-lyon.fr/sites/crl/files/time_management_for_the_new_format_toeic_test.pdf)、[Prepedu](https://prepedu.com/zh-hant/blog/toeic-same-answer-guessing-strategy-analysis)、[Zeús](https://zeus229.pixnet.net/blog/post/188593842)

完整彙整脈絡另見 [`research/study_plan_insights.md`](../research/study_plan_insights.md)。

---

## 5. 內容規模

以下數字全部來自 `node scripts/validate_data.js` 實際輸出（2026-08-16 執行）：

| 內容 | 數量 |
|---|---|
| 應考技巧（tips） | 76 條（P1=6、P2=6、P3=7、P4=6、P5=8、P6=6、P7=9、General=7、Vocab=6、Time=7、Plan=8） |
| 30天計畫（plan） | 30 天完整 |
| 單字（vocab） | 700 字（core=497、advanced=203） |
| Part 5 題目 | 160 題 |
| Part 6 | 12 篇／48 題 |
| Part 7 | 21 組／92 題（single=13、double=5、triple=3） |
| 聽力 Part 1 | 20 題 |
| 聽力 Part 2 | 60 題 |
| 聽力 Part 3 | 15 組 |
| 聽力 Part 4 | 15 組 |

全部達到或超過 `docs/DESIGN.md` §8 訂的內容數量目標（tips≥60、vocab≥600/core≥400、p5≥150、p6≥12篇、p7≥20組/≥90題、聽力p1≥20/p2≥60/p3≥15/p4≥15）。

---

## 6. 驗證證據

### 自動化驗證

| 項目 | 結果 |
|---|---|
| `node scripts/validate_data.js` | 全綠，無錯誤（見第5節數量統計） |
| `find . -name '*.js' \| xargs node --check` | 全部 JS 檔語法檢查通過 |
| `node tests/srs.test.js` | 10 個測試全數通過（SRS Leitner 演算法） |
| `node tests/store.test.js` | 19 個測試全數通過（Store 狀態管理） |
| **測試總數** | **29 個，全數通過** |

### 瀏覽器實測項目（截圖見 `docs/screenshots/`）

- [x] 9 個路由（dashboard/plan/tips/quiz/listening/vocab/mock/review/settings）皆可渲染
- [x] 做題 → 錯題本自動更新
- [x] 完成任務 → 自動勾選並持久化
- [x] SRS 單字卡排程（新字／到期複習字）
- [x] 聽力 TTS 發聲
- [x] 迷你模考流程（計時、給分、弱點建議）
- [x] 資料匯出／匯入 round-trip
- [x] 手機版版面無溢出（見 `mobile_dashboard.png`、`mobile_plan.png`）

已存截圖：

| 截圖 | 內容 |
|---|---|
| [`docs/screenshots/desktop_dashboard.png`](screenshots/desktop_dashboard.png) | 桌機版儀表板 |
| [`docs/screenshots/desktop_tips.png`](screenshots/desktop_tips.png) | 桌機版技巧庫 |
| [`docs/screenshots/mobile_dashboard.png`](screenshots/mobile_dashboard.png) | 手機版儀表板 |
| [`docs/screenshots/mobile_plan.png`](screenshots/mobile_plan.png) | 手機版30天計畫 |

---

## 7. 已知限制與建議

| 限制 | 說明 | 建議 |
|---|---|---|
| Part 1 無真實照片 | 聽力Part1（照片描述）用中文場景描述取代實際照片，因純靜態專案不含圖片素材 | 作答時依文字場景描述判斷，正式考前務必搭配官方全真試題練習真實照片題 |
| 聽力非真人錄音 | 所有聽力題目用瀏覽器 Web Speech API（TTS）朗讀，音色、語調、連音與真人考題有落差 | 建議搭配官方全真試題（ETS官方或坊間全真模擬題）的真人錄音聽力，本平台適合練解題邏輯與逐字稿精讀 |
| TTS 語音依作業系統而定 | 聽力發音品質、可選語音完全取決於電腦/手機已安裝的英文語音，未安裝英文語音時頁面會提示「未偵測到英文語音」 | 依 `README.md`「聽力語音（TTS）需求與安裝英文語音」段落，在 Windows／macOS 系統設定中安裝英文語音 |
| 單機儲存 | 所有進度存在瀏覽器 `localStorage`，**清除瀏覽器資料、換瀏覽器或換裝置都會遺失進度** | 定期到「設定」頁用「匯出」存一份 JSON 備份；換裝置或清資料前務必先匯出，之後用「匯入」還原 |

---

## 8. 之後可擴充

- **加題方式**：在對應 `data/*.js` 檔案用附加模式 `window.TOEIC_DATA.<key> = (window.TOEIC_DATA.<key> || []).concat([...])` 加入新題目，id 依現有區段規則接續編號（例如 p5 新題接在 `p5-161` 之後），加完務必重跑 `node scripts/validate_data.js` 確認 schema、id 唯一性、答案範圍都正確。
- **調整30天計畫**：直接編輯 `data/plan.js` 的 `days` / `phases` 陣列（例如改任務內容、時數、模考節點），改完一樣要跑 `node --check data/plan.js` 與 `node scripts/validate_data.js`。
- **手機單檔版**：已建置完成，執行 `node scripts/build_single.js` 會把 `index.html` + 所有 `css/js/data` inline 成 `dist/toeic30.html`（完整獨立單檔）與 `dist/toeic30.fragment.html`（片段版）。若之後改動 `data/`、`css/`、`js/` 原始碼，需重新執行這個指令才會反映到 `dist/`（詳見 `README.md`「單檔版 dist/」小節）。
