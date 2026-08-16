// data/plan.js — TOEIC_DATA.plan（30 天讀書計畫）
//
// 依據 research/study_plan_insights.md 彙整的多來源共識設計，重點引用：
// - Prepedu 一個月讀書計畫（30天四階段結構、RC黃金配速 P5+P6=20分鐘/P7=55分鐘）
//   https://prepedu.com/zh-hant/blog/one-month-of-preparation-for-toeic-test
// - Studying.jp（每日時數與分數增幅量化對照、前兩週單字文法+後兩週模擬題）
//   https://studying.jp/toeic/about-more/1month.html
// - vocus 42天400→850（每日固定排程、最後一週停止背新單字改複習錯題）
//   https://vocus.cc/article/66208cd4fd89780001caabcc
// - WanDing 500→875（逐週單字打底→銜接試題→強化刷題）
//   https://wanding.pixnet.net/blog/post/48988987
// - PTT 930分準備心得（分大題計時記錄找弱點、模考不中斷訓練疲勞作答）
//   https://www.pttweb.cc/bbs/TOEIC/M.1737536233.A.C8F
//
// 結構：Day1 先做迷你模考建立基準分數 → 每天固定 20 個新字＋複習（SRS）→
// 每 3–4 天一次錯題本檢討（三層檢討法）→ 第三週起每 3 天一次模考（mini/half 交替，
// half 至少 3 次）→ 最後一週（Day26–30）不再學新技巧，只複習錯題與保持輕量模考手感、
// 調整作息。76 條技巧依 Part 週次分配：第一週 General/Time/Plan/P1/P2/P5，
// 第二週 P3/P4/P6/P7/Vocab，第三週起回顧高 priority 技巧。
window.TOEIC_DATA = window.TOEIC_DATA || {};
window.TOEIC_DATA.plan = {
  "examDate": "2026-09-20",
  "totalDays": 30,
  "phases": [
    {
      "name": "診斷與基礎",
      "days": [
        1,
        7
      ],
      "goal": "用一次裸考迷你模考建立基準分數，同步打好 Part1/Part2 聽力與 Part5 文法基礎，養成每日背單字的習慣。"
    },
    {
      "name": "弱點強化",
      "days": [
        8,
        16
      ],
      "goal": "針對診斷結果加強 Part3/Part4 聽力理解與 Part6/Part7 閱讀技巧，開始精聽跟讀，並鞏固單字記憶策略。"
    },
    {
      "name": "模考實戰",
      "days": [
        17,
        25
      ],
      "goal": "每 3 天一次整回模考（mini／half 交替），嚴格計時訓練臨場節奏，配合三層檢討法持續補強錯題本。"
    },
    {
      "name": "衝刺與調整",
      "days": [
        26,
        30
      ],
      "goal": "停止學習新技巧，全力複習錯題本、保持輕量模考手感，調整作息與心態迎接考試。"
    }
  ],
  "days": [
    {
      "day": 1,
      "phase": "診斷與基礎",
      "theme": "起點診斷：迷你模考建立基準分數",
      "minutes": 73,
      "tasks": [
        {
          "id": "d1-t1",
          "type": "mock",
          "label": "起點裸考｜迷你模考診斷（先建立聽力＋閱讀基準分數，之後每次模考都跟它比較進步幅度）",
          "minutes": 25,
          "ref": {
            "preset": "mini"
          }
        },
        {
          "id": "d1-t2",
          "type": "tips",
          "label": "讀應考心態與讀書計畫技巧（General）4 條",
          "minutes": 10,
          "ref": {
            "part": "General",
            "count": 4
          }
        },
        {
          "id": "d1-t3",
          "type": "quiz",
          "label": "Part 5 文法診斷 15 題（找出目前最弱的文法點）",
          "minutes": 18,
          "ref": {
            "part": "P5",
            "count": 15
          }
        },
        {
          "id": "d1-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字（SRS 第一輪，今天沒有到期字很正常）",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 2,
      "phase": "診斷與基礎",
      "theme": "應考心態收尾＋考場時間分配觀念建立",
      "minutes": 56,
      "tasks": [
        {
          "id": "d2-t1",
          "type": "tips",
          "label": "讀應考心態技巧（General）剩餘 3 條",
          "minutes": 8,
          "ref": {
            "part": "General",
            "count": 3
          }
        },
        {
          "id": "d2-t2",
          "type": "tips",
          "label": "讀考場時間分配技巧（Time）4 條（RC 黃金配速：P5+P6 共 20 分鐘、P7 留 55 分鐘）",
          "minutes": 10,
          "ref": {
            "part": "Time",
            "count": 4
          }
        },
        {
          "id": "d2-t3",
          "type": "quiz",
          "label": "Part 5 文法練習 15 題（詞性與代名詞）",
          "minutes": 18,
          "ref": {
            "part": "P5",
            "count": 15
          }
        },
        {
          "id": "d2-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 3,
      "phase": "診斷與基礎",
      "theme": "時間分配收尾＋讀書計畫技巧＋Part1 照片描述起步",
      "minutes": 53,
      "tasks": [
        {
          "id": "d3-t1",
          "type": "tips",
          "label": "讀考場時間分配技巧（Time）剩餘 3 條",
          "minutes": 8,
          "ref": {
            "part": "Time",
            "count": 3
          }
        },
        {
          "id": "d3-t2",
          "type": "tips",
          "label": "讀讀書計畫與教材選擇技巧（Plan）4 條（教材別貪多，單字書文法書各一本反覆讀）",
          "minutes": 10,
          "ref": {
            "part": "Plan",
            "count": 4
          }
        },
        {
          "id": "d3-t3",
          "type": "listening",
          "label": "Part 1 照片描述練習 10 題（先讀技巧再作答）",
          "minutes": 15,
          "ref": {
            "part": "P1",
            "count": 10
          }
        },
        {
          "id": "d3-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 4,
      "phase": "診斷與基礎",
      "theme": "讀書計畫技巧收尾＋Part2 應答起步＋第一次錯題檢討",
      "minutes": 68,
      "tasks": [
        {
          "id": "d4-t1",
          "type": "tips",
          "label": "讀讀書計畫技巧（Plan）剩餘 4 條",
          "minutes": 10,
          "ref": {
            "part": "Plan",
            "count": 4
          }
        },
        {
          "id": "d4-t2",
          "type": "listening",
          "label": "Part 2 應答題練習 15 題（熟悉 Wh 疑問句與間接回答的新趨勢）",
          "minutes": 18,
          "ref": {
            "part": "P2",
            "count": 15
          }
        },
        {
          "id": "d4-t3",
          "type": "review",
          "label": "第一次錯題本檢討：用三層檢討法（表面層看錯什麼→技巧層該用什麼解法→根本層單字/文法/理解力）整理前 3 天的錯題",
          "minutes": 20,
          "ref": {}
        },
        {
          "id": "d4-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 5,
      "phase": "診斷與基礎",
      "theme": "Part1 技巧總整理＋加強練習",
      "minutes": 68,
      "tasks": [
        {
          "id": "d5-t1",
          "type": "tips",
          "label": "讀 Part 1 照片描述技巧 6 條（無人／有人照片判讀原則）",
          "minutes": 15,
          "ref": {
            "part": "P1",
            "count": 6
          }
        },
        {
          "id": "d5-t2",
          "type": "listening",
          "label": "Part 1 照片描述練習 10 題（活用剛讀的技巧重新作答）",
          "minutes": 15,
          "ref": {
            "part": "P1",
            "count": 10
          }
        },
        {
          "id": "d5-t3",
          "type": "quiz",
          "label": "Part 5 文法練習 15 題（時態與主詞動詞一致）",
          "minutes": 18,
          "ref": {
            "part": "P5",
            "count": 15
          }
        },
        {
          "id": "d5-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 6,
      "phase": "診斷與基礎",
      "theme": "Part2 技巧總整理＋週末加強練習日",
      "minutes": 123,
      "tasks": [
        {
          "id": "d6-t1",
          "type": "tips",
          "label": "讀 Part 2 應答技巧 6 條（間接回答與相似音陷阱）",
          "minutes": 15,
          "ref": {
            "part": "P2",
            "count": 6
          }
        },
        {
          "id": "d6-t2",
          "type": "listening",
          "label": "Part 2 應答題練習 25 題（混合三種提問句型，加深熟練度）",
          "minutes": 28,
          "ref": {
            "part": "P2",
            "count": 25
          }
        },
        {
          "id": "d6-t3",
          "type": "quiz",
          "label": "Part 5 文法練習 30 題（週末加強：時態、代名詞、介系詞綜合）",
          "minutes": 35,
          "ref": {
            "part": "P5",
            "count": 30
          }
        },
        {
          "id": "d6-t4",
          "type": "quiz",
          "label": "Part 7 閱讀練習 2 組熱身（先建立長文閱讀耐力，抓段落主旨）",
          "minutes": 20,
          "ref": {
            "part": "P7",
            "count": 2
          }
        },
        {
          "id": "d6-t5",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 25,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 7,
      "phase": "診斷與基礎",
      "theme": "第一週總複習：Part5 文法技巧總整理＋錯題複習",
      "minutes": 109,
      "tasks": [
        {
          "id": "d7-t1",
          "type": "tips",
          "label": "讀 Part 5 文法技巧 8 條（本週文法要點總整理）",
          "minutes": 20,
          "ref": {
            "part": "P5",
            "count": 8
          }
        },
        {
          "id": "d7-t2",
          "type": "review",
          "label": "複習本週所有錯題（Part5＋Part1＋Part2），把已經學會的題目標記掉",
          "minutes": 25,
          "ref": {}
        },
        {
          "id": "d7-t3",
          "type": "listening",
          "label": "Part 1 照片描述複習 5 題",
          "minutes": 8,
          "ref": {
            "part": "P1",
            "count": 5
          }
        },
        {
          "id": "d7-t4",
          "type": "listening",
          "label": "Part 2 應答題複習 10 題",
          "minutes": 12,
          "ref": {
            "part": "P2",
            "count": 10
          }
        },
        {
          "id": "d7-t5",
          "type": "quiz",
          "label": "Part 5 文法練習 20 題（活用剛複習的技巧重新作答）",
          "minutes": 24,
          "ref": {
            "part": "P5",
            "count": 20
          }
        },
        {
          "id": "d7-t6",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字（第一週結束，檢查連續天數）",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 8,
      "phase": "弱點強化",
      "theme": "Part3 對話理解起步＋Part6 短文填空起步",
      "minutes": 66,
      "tasks": [
        {
          "id": "d8-t1",
          "type": "tips",
          "label": "讀 Part 3 對話理解技巧 4 條（先讀題幹再聽對話，才知道要抓什麼重點）",
          "minutes": 10,
          "ref": {
            "part": "P3",
            "count": 4
          }
        },
        {
          "id": "d8-t2",
          "type": "tips",
          "label": "讀 Part 6 短文填空技巧 3 條（詞彙題看上下文、句子插入題要雙向檢查）",
          "minutes": 8,
          "ref": {
            "part": "P6",
            "count": 3
          }
        },
        {
          "id": "d8-t3",
          "type": "listening",
          "label": "Part 3 三人對話理解練習 2 組（含逐字稿，先盲聽再對答案）",
          "minutes": 12,
          "ref": {
            "part": "P3",
            "count": 2
          }
        },
        {
          "id": "d8-t4",
          "type": "quiz",
          "label": "Part 6 短文填空練習 2 篇（共 8 題）",
          "minutes": 16,
          "ref": {
            "part": "P6",
            "count": 2
          }
        },
        {
          "id": "d8-t5",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 9,
      "phase": "弱點強化",
      "theme": "Part3 技巧收尾＋Part7 閱讀起步＋跟讀入門",
      "minutes": 66,
      "tasks": [
        {
          "id": "d9-t1",
          "type": "tips",
          "label": "讀 Part 3 對話理解技巧剩餘 3 條（同義詞替換、圖表題三步驟：先看標題→聽數字→比對圖表）",
          "minutes": 8,
          "ref": {
            "part": "P3",
            "count": 3
          }
        },
        {
          "id": "d9-t2",
          "type": "tips",
          "label": "讀 Part 7 閱讀技巧 3 條（先看題幹再回文章找關鍵字，別整篇從頭讀）",
          "minutes": 8,
          "ref": {
            "part": "P7",
            "count": 3
          }
        },
        {
          "id": "d9-t3",
          "type": "quiz",
          "label": "Part 7 閱讀練習 2 組",
          "minutes": 20,
          "ref": {
            "part": "P7",
            "count": 2
          }
        },
        {
          "id": "d9-t4",
          "type": "read",
          "label": "精聽跟讀入門：用今天 Part 3 逐字稿做跟讀 10 分鐘（先盲聽作答→對照逐字稿分析生字→邊看稿跟讀 3–4 遍）",
          "minutes": 10,
          "ref": {
            "note": "四步驟影子跟讀法：①盲聽並作答②對照逐字稿分析生字與表達③邊看稿跟讀音檔3–4遍④脫稿只靠聲音跟讀整段。同一句可重複到完全跟上語速。"
          }
        },
        {
          "id": "d9-t5",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 10,
      "phase": "弱點強化",
      "theme": "Part4 獨白理解起步＋Part6 加強",
      "minutes": 62,
      "tasks": [
        {
          "id": "d10-t1",
          "type": "tips",
          "label": "讀 Part 4 獨白理解技巧 3 條（掌握場景關鍵詞：announcement／voicemail／talk）",
          "minutes": 8,
          "ref": {
            "part": "P4",
            "count": 3
          }
        },
        {
          "id": "d10-t2",
          "type": "listening",
          "label": "Part 4 獨白理解練習 3 組",
          "minutes": 18,
          "ref": {
            "part": "P4",
            "count": 3
          }
        },
        {
          "id": "d10-t3",
          "type": "quiz",
          "label": "Part 6 短文填空練習 2 篇",
          "minutes": 16,
          "ref": {
            "part": "P6",
            "count": 2
          }
        },
        {
          "id": "d10-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 11,
      "phase": "弱點強化",
      "theme": "Part4 技巧收尾＋Part7 雙篇起步＋第二次錯題檢討",
      "minutes": 60,
      "tasks": [
        {
          "id": "d11-t1",
          "type": "tips",
          "label": "讀 Part 4 獨白理解技巧剩餘 3 條（數字/圖表題要特別留意、留意轉折語氣後的重點）",
          "minutes": 8,
          "ref": {
            "part": "P4",
            "count": 3
          }
        },
        {
          "id": "d11-t2",
          "type": "quiz",
          "label": "Part 7 閱讀練習 1 組（練習在多份文件間交叉對照找答案）",
          "minutes": 12,
          "ref": {
            "part": "P7",
            "count": 1
          }
        },
        {
          "id": "d11-t3",
          "type": "review",
          "label": "第二次錯題本檢討：聚焦本週聽力與 Part6/Part7 錯題，記錄易混淆的陷阱",
          "minutes": 20,
          "ref": {}
        },
        {
          "id": "d11-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 12,
      "phase": "弱點強化",
      "theme": "Part6 技巧收尾＋單字策略＋跟讀練習",
      "minutes": 64,
      "tasks": [
        {
          "id": "d12-t1",
          "type": "tips",
          "label": "讀 Part 6 短文填空技巧剩餘 3 條（篇章連貫性優先於單句文法，flow test 概念）",
          "minutes": 8,
          "ref": {
            "part": "P6",
            "count": 3
          }
        },
        {
          "id": "d12-t2",
          "type": "tips",
          "label": "讀單字記憶策略技巧（Vocab）3 條（情境分類例句版單字書、三層循環背誦法）",
          "minutes": 8,
          "ref": {
            "part": "Vocab",
            "count": 3
          }
        },
        {
          "id": "d12-t3",
          "type": "listening",
          "label": "Part 4 獨白理解練習 3 組",
          "minutes": 18,
          "ref": {
            "part": "P4",
            "count": 3
          }
        },
        {
          "id": "d12-t4",
          "type": "read",
          "label": "精聽跟讀：用今天 Part 4 逐字稿做跟讀 10 分鐘（獨白語速較快，先確認每句都聽懂再跟讀）",
          "minutes": 10,
          "ref": {
            "note": "獨白題句子較長，先用逐字稿盲點式抓生字，再跟讀 3–4 遍，重點放在語調與連音。"
          }
        },
        {
          "id": "d12-t5",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 13,
      "phase": "弱點強化",
      "theme": "Part7 技巧收尾＋單字策略收尾＋週末混合練習",
      "minutes": 105,
      "tasks": [
        {
          "id": "d13-t1",
          "type": "tips",
          "label": "讀 Part 7 閱讀技巧 3 條（NOT 題、句子插入題、同義詞替換）",
          "minutes": 8,
          "ref": {
            "part": "P7",
            "count": 3
          }
        },
        {
          "id": "d13-t2",
          "type": "tips",
          "label": "讀單字記憶策略技巧剩餘 3 條（善用零碎時間、拼字測驗鞏固記憶）",
          "minutes": 8,
          "ref": {
            "part": "Vocab",
            "count": 3
          }
        },
        {
          "id": "d13-t3",
          "type": "listening",
          "label": "Part 3 對話理解練習 4 組",
          "minutes": 24,
          "ref": {
            "part": "P3",
            "count": 4
          }
        },
        {
          "id": "d13-t4",
          "type": "quiz",
          "label": "Part 6 短文填空練習 2 篇",
          "minutes": 16,
          "ref": {
            "part": "P6",
            "count": 2
          }
        },
        {
          "id": "d13-t5",
          "type": "quiz",
          "label": "Part 7 閱讀練習 2 組（今天練習跨文件比對）",
          "minutes": 24,
          "ref": {
            "part": "P7",
            "count": 2
          }
        },
        {
          "id": "d13-t6",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字（週末多花點時間鞏固）",
          "minutes": 25,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 14,
      "phase": "弱點強化",
      "theme": "第二週總結：第一次全真半回模考（聽力＋閱讀不中斷）",
      "minutes": 135,
      "tasks": [
        {
          "id": "d14-t1",
          "type": "mock",
          "label": "第一次半回模考（約 55 分鐘，聽力＋閱讀綜合，體驗不中斷作答的臨場節奏）",
          "minutes": 55,
          "ref": {
            "preset": "half"
          }
        },
        {
          "id": "d14-t2",
          "type": "review",
          "label": "半回模考詳解檢討：花模考時間的 3–4 倍逐題檢討，分類錯題（單字不會/文法不熟/看錯題/時間不夠）並記入錯題本",
          "minutes": 40,
          "ref": {}
        },
        {
          "id": "d14-t3",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        },
        {
          "id": "d14-t4",
          "type": "read",
          "label": "整理今天模考的時間分配紀錄：各大題分別花多久、錯幾題，找出耗時異常或錯誤率高的部分",
          "minutes": 20,
          "ref": {
            "note": "分大題計時記錄花費時間與錯題數，比籠統多寫題更能精準抓弱點，這份紀錄之後每次模考都要更新比較。"
          }
        }
      ]
    },
    {
      "day": 15,
      "phase": "模考實戰",
      "theme": "模考後修復日：聽力查漏補缺＋高優先技巧複習",
      "minutes": 60,
      "tasks": [
        {
          "id": "d15-t1",
          "type": "review",
          "label": "第三次錯題本檢討：聚焦昨天半回模考的錯題",
          "minutes": 20,
          "ref": {}
        },
        {
          "id": "d15-t2",
          "type": "tips",
          "label": "複習 Part 5 高優先技巧 3 條（鞏固前兩週學過的易混淆詞性與慣用搭配）",
          "minutes": 8,
          "ref": {
            "part": "P5",
            "count": 3
          }
        },
        {
          "id": "d15-t3",
          "type": "listening",
          "label": "Part 2 應答題練習 10 題（收尾練習，涵蓋剩餘常見句型）",
          "minutes": 12,
          "ref": {
            "part": "P2",
            "count": 10
          }
        },
        {
          "id": "d15-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 16,
      "phase": "模考實戰",
      "theme": "高優先技巧複習收尾＋Part7 技巧補完＋跟讀練習",
      "minutes": 59,
      "tasks": [
        {
          "id": "d16-t1",
          "type": "tips",
          "label": "讀 Part 7 閱讀技巧剩餘 3 條（跨文件對照題、修辭意圖題）",
          "minutes": 8,
          "ref": {
            "part": "P7",
            "count": 3
          }
        },
        {
          "id": "d16-t2",
          "type": "tips",
          "label": "複習應考心態高優先技巧 2 條（保持答題節奏，不因單題卡關影響全場）",
          "minutes": 5,
          "ref": {
            "part": "General",
            "count": 2
          }
        },
        {
          "id": "d16-t3",
          "type": "quiz",
          "label": "Part 6 短文填空練習 2 篇",
          "minutes": 16,
          "ref": {
            "part": "P6",
            "count": 2
          }
        },
        {
          "id": "d16-t4",
          "type": "read",
          "label": "精聽跟讀：用今天 Part 3 逐字稿做跟讀 10 分鐘，持續累積跟讀量",
          "minutes": 10,
          "ref": {
            "note": "同一句可能要重複練習到完全跟上語速為止，每天固定累積，語感才會內化成直覺反應。"
          }
        },
        {
          "id": "d16-t5",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 17,
      "phase": "模考實戰",
      "theme": "模考週開跑：迷你模考熱身＋Part4/Part7 混合練習",
      "minutes": 83,
      "tasks": [
        {
          "id": "d17-t1",
          "type": "mock",
          "label": "迷你模考（約 25 分鐘，檢查前兩週學習成效）",
          "minutes": 25,
          "ref": {
            "preset": "mini"
          }
        },
        {
          "id": "d17-t2",
          "type": "listening",
          "label": "Part 4 獨白理解練習 3 組",
          "minutes": 18,
          "ref": {
            "part": "P4",
            "count": 3
          }
        },
        {
          "id": "d17-t3",
          "type": "quiz",
          "label": "Part 7 閱讀練習 2 組",
          "minutes": 20,
          "ref": {
            "part": "P7",
            "count": 2
          }
        },
        {
          "id": "d17-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 18,
      "phase": "模考實戰",
      "theme": "Part5/Part7 時間配速練習＋第四次錯題檢討",
      "minutes": 82,
      "tasks": [
        {
          "id": "d18-t1",
          "type": "quiz",
          "label": "Part 5 文法配速練習 15 題（目標每題 20–30 秒內作答完畢）",
          "minutes": 18,
          "ref": {
            "part": "P5",
            "count": 15
          }
        },
        {
          "id": "d18-t2",
          "type": "quiz",
          "label": "Part 7 閱讀練習 2 組（練習跨文件交叉比對）",
          "minutes": 24,
          "ref": {
            "part": "P7",
            "count": 2
          }
        },
        {
          "id": "d18-t3",
          "type": "review",
          "label": "第四次錯題本檢討",
          "minutes": 20,
          "ref": {}
        },
        {
          "id": "d18-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 19,
      "phase": "模考實戰",
      "theme": "聽力 Part4 收尾＋Part7 挑戰＋跟讀練習",
      "minutes": 63,
      "tasks": [
        {
          "id": "d19-t1",
          "type": "listening",
          "label": "Part 4 獨白理解練習 3 組（收尾，涵蓋剩餘場景類型）",
          "minutes": 18,
          "ref": {
            "part": "P4",
            "count": 3
          }
        },
        {
          "id": "d19-t2",
          "type": "quiz",
          "label": "Part 7 閱讀練習 1 組（練習跨多份文件交叉比對細節）",
          "minutes": 15,
          "ref": {
            "part": "P7",
            "count": 1
          }
        },
        {
          "id": "d19-t3",
          "type": "read",
          "label": "精聽跟讀：用今天 Part 4 逐字稿做跟讀 10 分鐘",
          "minutes": 10,
          "ref": {
            "note": "獨白題常考數字與行動要求，跟讀時特別留意這類細節句與轉折語氣。"
          }
        },
        {
          "id": "d19-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 20,
      "phase": "模考實戰",
      "theme": "第二次全真半回模考：聽力閱讀不中斷作答",
      "minutes": 130,
      "tasks": [
        {
          "id": "d20-t1",
          "type": "mock",
          "label": "第二次半回模考（約 55 分鐘，嚴格計時不中斷，練習疲勞作答下仍維持答題品質）",
          "minutes": 55,
          "ref": {
            "preset": "half"
          }
        },
        {
          "id": "d20-t2",
          "type": "review",
          "label": "半回模考詳解檢討：分類錯題原因（單字不會/文法不熟/看錯題/時間不夠），花 3–4 倍時間逐題檢討",
          "minutes": 40,
          "ref": {}
        },
        {
          "id": "d20-t3",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        },
        {
          "id": "d20-t4",
          "type": "read",
          "label": "更新時間分配紀錄：比較這次跟第一次半回模考各大題花費時間與正確率的差異",
          "minutes": 15,
          "ref": {
            "note": "持續追蹤分大題計時紀錄，確認上次找到的弱點這次是否有改善。"
          }
        }
      ]
    },
    {
      "day": 21,
      "phase": "模考實戰",
      "theme": "模考後查漏補缺：Part5/6 綜合練習＋第五次錯題檢討",
      "minutes": 97,
      "tasks": [
        {
          "id": "d21-t1",
          "type": "review",
          "label": "第五次錯題本檢討：延續昨日模考錯題，聚焦仍然不熟的 Part",
          "minutes": 25,
          "ref": {}
        },
        {
          "id": "d21-t2",
          "type": "quiz",
          "label": "Part 5 文法練習 20 題",
          "minutes": 24,
          "ref": {
            "part": "P5",
            "count": 20
          }
        },
        {
          "id": "d21-t3",
          "type": "quiz",
          "label": "Part 6 短文填空練習 2 篇",
          "minutes": 16,
          "ref": {
            "part": "P6",
            "count": 2
          }
        },
        {
          "id": "d21-t4",
          "type": "listening",
          "label": "Part 3 對話理解練習 2 組",
          "minutes": 12,
          "ref": {
            "part": "P3",
            "count": 2
          }
        },
        {
          "id": "d21-t5",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 22,
      "phase": "模考實戰",
      "theme": "Part7 集中衝刺＋Part4 收尾＋跟讀練習",
      "minutes": 78,
      "tasks": [
        {
          "id": "d22-t1",
          "type": "listening",
          "label": "Part 4 獨白理解練習 3 組（補滿本月獨白練習量）",
          "minutes": 18,
          "ref": {
            "part": "P4",
            "count": 3
          }
        },
        {
          "id": "d22-t2",
          "type": "quiz",
          "label": "Part 7 閱讀練習 3 組",
          "minutes": 30,
          "ref": {
            "part": "P7",
            "count": 3
          }
        },
        {
          "id": "d22-t3",
          "type": "read",
          "label": "精聽跟讀：用今天 Part 4 逐字稿做跟讀 10 分鐘（試著脫稿跟讀整段內容）",
          "minutes": 10,
          "ref": {
            "note": "進入模考期後持續每天跟讀，讓語感內化成聽到就懂的直覺反應，不再需要中文翻譯。"
          }
        },
        {
          "id": "d22-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 23,
      "phase": "模考實戰",
      "theme": "第三次全真半回模考：檢驗兩週進步幅度",
      "minutes": 145,
      "tasks": [
        {
          "id": "d23-t1",
          "type": "mock",
          "label": "第三次半回模考（約 55 分鐘，嚴格計時檢驗兩週來的進步幅度）",
          "minutes": 55,
          "ref": {
            "preset": "half"
          }
        },
        {
          "id": "d23-t2",
          "type": "review",
          "label": "半回模考詳解檢討：鞏固目前最弱的 Part，把新錯題分類記入錯題本",
          "minutes": 35,
          "ref": {}
        },
        {
          "id": "d23-t3",
          "type": "quiz",
          "label": "Part 7 閱讀練習 2 組",
          "minutes": 24,
          "ref": {
            "part": "P7",
            "count": 2
          }
        },
        {
          "id": "d23-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 24,
      "phase": "模考實戰",
      "theme": "聽力 Part3 收尾＋Part6 補完＋第六次錯題檢討",
      "minutes": 80,
      "tasks": [
        {
          "id": "d24-t1",
          "type": "listening",
          "label": "Part 3 對話理解練習 4 組（收尾，補滿本月對話練習量）",
          "minutes": 24,
          "ref": {
            "part": "P3",
            "count": 4
          }
        },
        {
          "id": "d24-t2",
          "type": "quiz",
          "label": "Part 6 短文填空練習 2 篇（收尾，補滿本月短文練習量）",
          "minutes": 16,
          "ref": {
            "part": "P6",
            "count": 2
          }
        },
        {
          "id": "d24-t3",
          "type": "review",
          "label": "第六次錯題本檢討",
          "minutes": 20,
          "ref": {}
        },
        {
          "id": "d24-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 25,
      "phase": "模考實戰",
      "theme": "模考實戰週收尾：聽力＋閱讀全面複習",
      "minutes": 76,
      "tasks": [
        {
          "id": "d25-t1",
          "type": "listening",
          "label": "Part 3 對話理解練習 3 組（收尾，補滿本月對話練習量）",
          "minutes": 18,
          "ref": {
            "part": "P3",
            "count": 3
          }
        },
        {
          "id": "d25-t2",
          "type": "quiz",
          "label": "Part 5 文法練習 15 題",
          "minutes": 18,
          "ref": {
            "part": "P5",
            "count": 15
          }
        },
        {
          "id": "d25-t3",
          "type": "listening",
          "label": "Part 1 照片描述複習 5 題",
          "minutes": 8,
          "ref": {
            "part": "P1",
            "count": 5
          }
        },
        {
          "id": "d25-t4",
          "type": "listening",
          "label": "Part 2 應答題複習 10 題",
          "minutes": 12,
          "ref": {
            "part": "P2",
            "count": 10
          }
        },
        {
          "id": "d25-t5",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 26,
      "phase": "衝刺與調整",
      "theme": "衝刺期最後一次半回模考：練習臨場節奏，之後全力複習",
      "minutes": 145,
      "tasks": [
        {
          "id": "d26-t1",
          "type": "mock",
          "label": "第四次半回模考（約 55 分鐘，考前最後一次整回節奏演練，之後轉為純複習）",
          "minutes": 55,
          "ref": {
            "preset": "half"
          }
        },
        {
          "id": "d26-t2",
          "type": "review",
          "label": "錯題本複習：本階段起不再學新技巧，檢討時間拉長到作答時間的 3–4 倍，把每題都搞懂為止",
          "minutes": 35,
          "ref": {}
        },
        {
          "id": "d26-t3",
          "type": "quiz",
          "label": "Part 7 閱讀練習 3 組（補滿本月 Part7 練習量）",
          "minutes": 30,
          "ref": {
            "part": "P7",
            "count": 3
          }
        },
        {
          "id": "d26-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 27,
      "phase": "衝刺與調整",
      "theme": "錯題本總複習＋輕量刷題維持手感",
      "minutes": 82,
      "tasks": [
        {
          "id": "d27-t1",
          "type": "review",
          "label": "第七次錯題本總複習：重做尚未標記已懂的題目",
          "minutes": 30,
          "ref": {}
        },
        {
          "id": "d27-t2",
          "type": "quiz",
          "label": "Part 5 文法輕量練習 10 題（維持手感，不求多只求穩）",
          "minutes": 12,
          "ref": {
            "part": "P5",
            "count": 10
          }
        },
        {
          "id": "d27-t3",
          "type": "quiz",
          "label": "Part 7 閱讀練習 2 組（補滿本月 Part7 練習量）",
          "minutes": 20,
          "ref": {
            "part": "P7",
            "count": 2
          }
        },
        {
          "id": "d27-t4",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    },
    {
      "day": 28,
      "phase": "衝刺與調整",
      "theme": "考前作息調整開始＋錯題本複習",
      "minutes": 72,
      "tasks": [
        {
          "id": "d28-t1",
          "type": "review",
          "label": "錯題本複習：挑出還沒完全搞懂的題目集中重做",
          "minutes": 25,
          "ref": {}
        },
        {
          "id": "d28-t2",
          "type": "listening",
          "label": "Part 2 應答題輕量複習 10 題（維持聽力手感）",
          "minutes": 12,
          "ref": {
            "part": "P2",
            "count": 10
          }
        },
        {
          "id": "d28-t3",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        },
        {
          "id": "d28-t4",
          "type": "read",
          "label": "考前作息調整：從今天起把精神最好的時段調整到考試當天的時段，晚上不熬夜",
          "minutes": 15,
          "ref": {
            "note": "考前1–2週開始調整生理時鐘，讓大腦在正式考試時段最清醒；考前一晚務必睡眠充足，避免熬夜衝刺反而在考場注意力渙散。"
          }
        }
      ]
    },
    {
      "day": 29,
      "phase": "衝刺與調整",
      "theme": "輕量複習日：放鬆心情、保持手感即可",
      "minutes": 60,
      "tasks": [
        {
          "id": "d29-t1",
          "type": "review",
          "label": "第八次錯題本輕量複習：只看已標記高頻錯誤的題目，不做新題",
          "minutes": 20,
          "ref": {}
        },
        {
          "id": "d29-t2",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字（輕量掃過即可）",
          "minutes": 20,
          "ref": {
            "newWords": 20,
            "review": true
          }
        },
        {
          "id": "d29-t3",
          "type": "quiz",
          "label": "Part 5 輕量練習 10 題（保持手感即可，不需追求數量）",
          "minutes": 12,
          "ref": {
            "part": "P5",
            "count": 10
          }
        }
      ]
    },
    {
      "day": 30,
      "phase": "衝刺與調整",
      "theme": "考前最後提醒：物品清單、作息與答題卡策略",
      "minutes": 60,
      "tasks": [
        {
          "id": "d30-t1",
          "type": "read",
          "label": "考前物品與作息總檢查：文具、證件、答題卡策略一次看完",
          "minutes": 20,
          "ref": {
            "note": "物品清單：筆芯較粗、圓鈍筆頭的 2B 鉛筆或專用畫卡筆（不要用自動鉛筆，避免要來回塗畫浪費時間）、橡皮擦、身分證件與准考證、手錶。作息：考前一晚務必睡眠充足，避免熬夜衝刺。答題卡策略：先在題本上輕圈答案，寫完一個題組（或聽力測驗全部結束）再一次性畫卡；聽力結束後絕對不能回頭修改或補畫聽力答案卡，就算漏畫也不行；考試剩最後幾分鐘來不及作答的題目，統一塗同一個選項（例如都塗 B），不要留白，因為 TOEIC 答錯不倒扣。"
          }
        },
        {
          "id": "d30-t2",
          "type": "review",
          "label": "第九次錯題本最後瀏覽：只看高頻錯誤重點，保持信心，不做新題",
          "minutes": 20,
          "ref": {}
        },
        {
          "id": "d30-t3",
          "type": "vocab",
          "label": "背 20 個核心單字＋複習到期單字（輕量掃過，保持語感）",
          "minutes": 15,
          "ref": {
            "newWords": 20,
            "review": true
          }
        }
      ]
    }
  ]
};
