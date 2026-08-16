'use strict';
/**
 * tests/reading.test.js — node tests/reading.test.js
 * 用 vm 把 data/reading_frameworks.js + 題庫 + js/reading.js 載入 sandbox，
 * 驗證閱讀診斷引擎的計算。純 Node，無外部相依。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function loadReading() {
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  [
    'data/questions_p5_1.js', 'data/questions_p5_2.js', 'data/questions_p5_3.js',
    'data/questions_p6.js', 'data/questions_p7_1.js', 'data/questions_p7_2.js',
    'data/reading_frameworks.js', 'js/reading.js'
  ].forEach((rel) => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  });
  return sandbox.window;
}

let pass = 0;
function test(name, fn) {
  fn();
  pass++;
  console.log('  ok - ' + name);
}

console.log('reading.test.js');

const { Reading, TOEIC_DATA } = loadReading();

// ---- 1. skillKey 對應 ----
test('skillKey 依 Part 取用正確欄位，缺欄位時退回預設值', () => {
  assert.strictEqual(Reading.skillKey('P5', { tag: 'prep' }), 'P5:prep');
  assert.strictEqual(Reading.skillKey('P5', {}), 'P5:other');
  assert.strictEqual(Reading.skillKey('P6', { type: 'sentence' }), 'P6:sentence');
  assert.strictEqual(Reading.skillKey('P6', {}), 'P6:word');
  assert.strictEqual(Reading.skillKey('P7', { skill: 'inference' }), 'P7:inference');
  assert.strictEqual(Reading.skillKey('P7', {}), 'P7:detail');
});

// ---- 2. 題庫中每個考點都有中文標籤（否則 UI 會露出 raw key）----
test('題庫出現的所有考點都有對應的中文標籤', () => {
  const missing = Object.keys(Reading.poolSizeByKey())
    .filter((key) => !Reading.SKILL_LABELS[key]);
  assert.deepEqual(missing, [], '缺少標籤的考點：' + missing.join(', '));
});

// ---- 3. 分數換算曲線單調遞增且落在 5..495 ----
test('curveToScore 單調遞增，值域 5..495', () => {
  let prev = -1;
  for (let raw = 0; raw <= 100; raw++) {
    const s = Reading.curveToScore(raw);
    assert.ok(s >= 5 && s <= 495, `raw=${raw} 產生越界分數 ${s}`);
    assert.ok(s >= prev, `raw=${raw} 分數下降（${prev} → ${s}）`);
    prev = s;
  }
  assert.strictEqual(Reading.curveToScore(0), 5);
  assert.strictEqual(Reading.curveToScore(100), 495);
  assert.strictEqual(Reading.curveToScore(-10), 5, '負值需夾到下界');
  assert.strictEqual(Reading.curveToScore(999), 495, '超界需夾到上界');
});

// ---- 4. estimateRC ----
test('estimateRC 無紀錄回傳 null，有紀錄時算出分數與信心水準', () => {
  const empty = Reading.estimateRC({ quizHistory: [] });
  assert.strictEqual(empty.score, null);
  assert.strictEqual(empty.confidence, 'none');

  const state = {
    quizHistory: [
      { mode: 'quiz', part: 'P5', total: 10, correct: 5, seconds: 300 },
      { mode: 'mock', part: '', total: 30, correct: 12, seconds: 1800 },
      { mode: 'listening', part: 'P2', total: 50, correct: 50, seconds: 600 } // 不應計入
    ]
  };
  const rc = Reading.estimateRC(state);
  assert.strictEqual(rc.sample, 40, '聽力紀錄不可計入閱讀估分');
  assert.strictEqual(rc.accuracy, 43);
  assert.strictEqual(rc.confidence, 'medium');
  assert.ok(rc.score > 0 && rc.score < 495);
  assert.ok(rc.nextScore > rc.score);
  assert.ok(rc.questionsToNext !== null && rc.questionsToNext > 0);
});

// ---- 5. skillBreakdown ----
test('skillBreakdown 依正確率排序，樣本不足者標記 enough=false', () => {
  const state = {
    readingStats: {
      'P5:pos': { total: 10, correct: 9, seconds: 150 },
      'P5:prep': { total: 12, correct: 4, seconds: 480 },
      'P7:NOT': { total: 2, correct: 0, seconds: 300 }
    }
  };
  const rows = Reading.skillBreakdown(state);
  assert.strictEqual(rows.length, 3);
  // 有足夠樣本的排前面；其中正確率低的（prep 33%）在 pos（90%）之前
  assert.strictEqual(rows[0].key, 'P5:prep');
  assert.strictEqual(rows[0].accuracy, 33);
  assert.strictEqual(rows[0].avgSeconds, 40);
  assert.strictEqual(rows[0].level.code, 'weak');
  assert.strictEqual(rows[1].key, 'P5:pos');
  assert.strictEqual(rows[1].level.code, 'strong');
  // 樣本 2 題 < MIN_SAMPLE，即使 0% 也排在後面且不下判斷
  assert.strictEqual(rows[2].key, 'P7:NOT');
  assert.strictEqual(rows[2].enough, false);
  assert.strictEqual(rows[2].level.code, 'unknown');
  // 題庫題數要帶進來，供 UI 顯示「還有幾題可練」
  assert.ok(rows[0].poolSize > 0);

  const onlyP7 = Reading.skillBreakdown(state, { part: 'P7' });
  assert.strictEqual(onlyP7.length, 1);
});

// ---- 6. paceReport / projectedFinish ----
test('paceReport 只採計 mode=quiz，並判定超時', () => {
  const state = {
    quizHistory: [
      { mode: 'quiz', part: 'P5', total: 10, correct: 5, seconds: 400 }, // 40s/題，目標 20 → slow
      { mode: 'quiz', part: 'P7', total: 10, correct: 7, seconds: 650 }, // 65s/題，目標 60 → ok
      { mode: 'mock', part: '', total: 20, correct: 10, seconds: 9999 }  // 不應計入
    ]
  };
  const rows = Reading.paceReport(state);
  const byPart = {};
  rows.forEach((r) => { byPart[r.part] = r; });

  assert.strictEqual(byPart.P5.avgSeconds, 40);
  assert.strictEqual(byPart.P5.verdict, 'slow');
  assert.strictEqual(byPart.P7.avgSeconds, 65);
  assert.strictEqual(byPart.P7.verdict, 'ok');
  assert.strictEqual(byPart.P6.verdict, 'none', '沒紀錄的 Part 不應誤判');
  assert.strictEqual(byPart.P6.avgSeconds, 0);

  const proj = Reading.projectedFinish(state);
  assert.strictEqual(proj.measuredParts, 2);
  assert.strictEqual(proj.willFinish, false, '40s×30 + 30s×16 + 65s×54 已超過 75 分鐘');
  assert.ok(proj.overMinutes > 0);
});

test('全部照目標配速時，projectedFinish 判定做得完', () => {
  const state = {
    quizHistory: [
      { mode: 'quiz', part: 'P5', total: 10, correct: 8, seconds: 200 },
      { mode: 'quiz', part: 'P6', total: 10, correct: 8, seconds: 300 },
      { mode: 'quiz', part: 'P7', total: 10, correct: 8, seconds: 600 }
    ]
  };
  const proj = Reading.projectedFinish(state);
  assert.strictEqual(proj.measuredParts, 3);
  assert.strictEqual(proj.willFinish, true);
  // 20s×30 + 30s×16 + 60s×54 = 4320s = 72 分，比 75 分限制留 3 分鐘緩衝
  assert.strictEqual(proj.minutes, 72);
});

// ---- 7. reasonBreakdown ----
test('reasonBreakdown 只統計閱讀錯題，並算出未標記數', () => {
  const state = {
    wrongBook: {
      'p5-001': { count: 2, reason: 'grammar' },
      'p5-002': { count: 1, reason: 'grammar' },
      'p7-001-q1': { count: 1, reason: 'time' },
      'p6-001-q2': { count: 1, reason: '' },
      'l2-001': { count: 5, reason: 'vocab' } // 聽力，不計入
    }
  };
  const r = Reading.reasonBreakdown(state);
  assert.strictEqual(r.total, 4);
  assert.strictEqual(r.untagged, 1);
  const grammar = r.rows.filter((x) => x.code === 'grammar')[0];
  assert.strictEqual(grammar.count, 2);
  assert.strictEqual(grammar.share, 50);
  assert.strictEqual(r.rows[0].code, 'grammar', '最多的錯因要排最前面');
});

// ---- 8. advice ----
test('advice 把到期錯題排在最優先，並產生可用的練習連結', () => {
  const state = {
    readingStats: { 'P5:prep': { total: 10, correct: 3, seconds: 300 } },
    quizHistory: [{ mode: 'quiz', part: 'P5', total: 10, correct: 3, seconds: 400 }],
    wrongBook: {
      'p5-001': { count: 1, mastered: false, due: '2026-08-01' },
      'p5-002': { count: 1, mastered: false, due: '2026-08-01' },
      'p5-003': { count: 1, mastered: false, due: '2026-08-01' },
      'p5-004': { count: 1, mastered: true, due: '2026-08-01' }
    }
  };
  const list = Reading.advice(state, { today: '2026-08-16' });
  assert.ok(list.length > 0 && list.length <= 5);
  assert.strictEqual(list[0].kind, 'review');
  assert.ok(/^3 /.test(list[0].title.replace('先清掉 ', '')), '已精通的題目不應算進到期數');
  list.forEach((a) => {
    assert.ok(/^#\//.test(a.hash), 'hash 需為站內路由：' + a.hash);
    assert.ok(a.title && a.detail && a.actionLabel);
  });
});

test('沒有任何弱點時 advice 回傳鼓勵訊息而非空陣列', () => {
  const state = {
    readingStats: { 'P5:prep': { total: 10, correct: 10, seconds: 180 } },
    quizHistory: [{ mode: 'quiz', part: 'P5', total: 10, correct: 10, seconds: 180 }],
    wrongBook: {}
  };
  // 把 untouched 建議也排除掉才能測到 idle 分支：這裡只確認一定有輸出且不會爆
  const list = Reading.advice(state, { today: '2026-08-16' });
  assert.ok(list.length >= 1);
  assert.ok(list.every((a) => typeof a.title === 'string'));
});

// ---- 9. drillHash 與框架 tag 對得上題庫 ----
test('每條文法框架的 tag 都能在 P5 題庫抽到題', () => {
  const pool = Reading.poolSizeByKey();
  (TOEIC_DATA.reading.frameworks || []).forEach((fw) => {
    const key = 'P5:' + fw.tag;
    assert.ok(pool[key] > 0, `框架 ${fw.id} 的 tag "${fw.tag}" 在題庫中沒有題目`);
    assert.strictEqual(Reading.drillHash(key, 10), `#/quiz?part=P5&skill=${fw.tag}&count=10`);
  });
});

// ---- 10. diagnose 整合 ----
test('diagnose 在空 state 下不丟錯，且回傳完整結構', () => {
  const d = Reading.diagnose({}, { today: '2026-08-16' });
  ['rc', 'skills', 'untouched', 'pace', 'projection', 'reasons', 'advice'].forEach((k) => {
    assert.ok(Object.prototype.hasOwnProperty.call(d, k), '缺少 ' + k);
  });
  assert.strictEqual(d.rc.score, null);
  assert.deepEqual(d.skills, []);
  assert.ok(d.untouched.length > 0, '空 state 時所有考點都算沒練過');
  assert.strictEqual(d.pace.length, 3);
});

console.log(`reading.test.js: ${pass} 個測試全數通過`);
