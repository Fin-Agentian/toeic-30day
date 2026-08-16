'use strict';
/**
 * tests/store.test.js — node tests/store.test.js
 * 用 vm 載入 js/store.js 到 sandbox（window + localStorage 記憶體 shim），
 * 用 assert 驗證主要行為。純 Node，無外部相依。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const STORE_SRC = fs.readFileSync(path.join(__dirname, '../js/store.js'), 'utf8');

function pad2(n) { return n < 10 ? '0' + n : String(n); }
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function createLocalStorageShim() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
    clear() { data.clear(); }
  };
}

function loadStore(opts) {
  opts = opts || {};
  const events = [];
  function CustomEventShim(type, params) {
    this.type = type;
    this.detail = params && params.detail;
  }
  const windowShim = {
    // opts.localStorage 可傳入預先塞好資料的 shim（用於測 migration）
    localStorage: opts.withLocalStorage === false
      ? undefined
      : (opts.localStorage || createLocalStorageShim()),
    dispatchEvent(evt) { events.push(evt); },
    CustomEvent: CustomEventShim
  };
  const sandbox = { window: windowShim, console: console };
  vm.createContext(sandbox);
  vm.runInContext(STORE_SRC, sandbox, { filename: 'store.js' });
  return { Store: sandbox.window.Store, events: events };
}

let pass = 0;
function test(name, fn) {
  fn();
  pass++;
  console.log('  ok - ' + name);
}

console.log('store.test.js');

// ---- 1. 預設 schema ----
test('預設 state 符合 schema，startDate = 今天', () => {
  const { Store } = loadStore();
  const state = Store.get();
  assert.strictEqual(state.version, 2);
  assert.deepEqual(state.readingStats, {});
  assert.strictEqual(state.startDate, todayISO());
  assert.strictEqual(state.examDate, '2026-09-20');
  assert.strictEqual(state.dailyMinutes, 90);
  assert.deepEqual(state.completedTasks, {});
  assert.deepEqual(state.quizHistory, []);
  assert.strictEqual(state.streak.current, 0);
  assert.strictEqual(state.settings.ttsRate, 1.0);
});

// ---- 2. get() 回傳深拷貝，呼叫端不可直接改到內部狀態 ----
test('get() 回傳的物件不可變更內部狀態', () => {
  const { Store } = loadStore();
  const s1 = Store.get();
  s1.dailyMinutes = 9999;
  s1.completedTasks['hack'] = 'x';
  const s2 = Store.get();
  assert.strictEqual(s2.dailyMinutes, 90);
  assert.deepEqual(s2.completedTasks, {});
});

// ---- 3. set() 不可變更新 + 觸發事件 ----
test('set() 用 patchFn 回傳新物件，並觸發 toeic30:change', () => {
  const { Store, events } = loadStore();
  const before = Store.get();
  const after = Store.set((old) => Object.assign({}, old, { dailyMinutes: 60 }));
  assert.strictEqual(after.dailyMinutes, 60);
  assert.strictEqual(before.dailyMinutes, 90, '舊快照不應被動到');
  assert.strictEqual(Store.get().dailyMinutes, 60);
  assert.ok(events.length >= 1);
  assert.strictEqual(events[events.length - 1].type, 'toeic30:change');
});

// ---- 4. set() 驗證回傳物件，壞資料丟 Error ----
test('set() 對不合法的回傳物件丟 Error', () => {
  const { Store } = loadStore();
  assert.throws(() => Store.set(() => ({})), /Store/);
  assert.throws(() => Store.set(() => null), /Store/);
});

test('set() 要求 patchFn 是函式', () => {
  const { Store } = loadStore();
  assert.throws(() => Store.set('not-a-fn'), /patchFn/);
});

// ---- 5. update() 便利函式（不可變 set-in）----
test('update() 可用點路徑不可變更新巢狀欄位', () => {
  const { Store } = loadStore();
  const before = Store.get();
  const after = Store.update('settings.ttsRate', 0.8);
  assert.strictEqual(after.settings.ttsRate, 0.8);
  assert.strictEqual(before.settings.ttsRate, 1.0, '舊快照不應被動到');
  assert.strictEqual(Store.get().settings.ttsRate, 0.8);
  assert.strictEqual(Store.get().settings.theme, 'light', '未變更欄位應保留');
});

// ---- 6. completeTask / isTaskDone ----
test('completeTask 標記完成，isTaskDone 反映狀態', () => {
  const { Store } = loadStore();
  assert.strictEqual(Store.isTaskDone('d1-t1'), false);
  Store.completeTask('d1-t1');
  assert.strictEqual(Store.isTaskDone('d1-t1'), true);
  assert.strictEqual(Store.isTaskDone('d1-t2'), false);
  const ts = Store.get().completedTasks['d1-t1'];
  assert.ok(typeof ts === 'string' && !isNaN(Date.parse(ts)));
});

// ---- 7. recordQuiz 同時更新 wrongBook 與 streak ----
test('recordQuiz 更新 quizHistory / wrongBook / streak（含連續天數）', () => {
  const { Store } = loadStore();

  Store.recordQuiz(
    { mode: 'quiz', part: 'P5', total: 10, correct: 8, seconds: 120, wrongIds: ['p5-001', 'p5-002'] },
    '2026-08-16'
  );
  let state = Store.get();
  assert.strictEqual(state.quizHistory.length, 1);
  assert.strictEqual(state.quizHistory[0].mode, 'quiz');
  assert.strictEqual(state.quizHistory[0].correct, 8);
  assert.strictEqual(state.wrongBook['p5-001'].count, 1);
  assert.strictEqual(state.wrongBook['p5-001'].mastered, false);
  assert.strictEqual(state.wrongBook['p5-002'].count, 1);
  assert.strictEqual(state.streak.current, 1);
  assert.strictEqual(state.streak.best, 1);
  assert.strictEqual(state.streak.lastActive, '2026-08-16');

  // 隔天再次答錯同一題 → count 累加，streak 連續 +1
  Store.recordQuiz(
    { mode: 'quiz', part: 'P5', total: 5, correct: 4, seconds: 60, wrongIds: ['p5-001'] },
    '2026-08-17'
  );
  state = Store.get();
  assert.strictEqual(state.wrongBook['p5-001'].count, 2);
  assert.strictEqual(state.streak.current, 2);
  assert.strictEqual(state.streak.best, 2);

  // 跳過一天 → streak 斷掉重算，但 best 保留
  Store.recordQuiz(
    { mode: 'listening', part: 'P2', total: 5, correct: 5, seconds: 60, wrongIds: [] },
    '2026-08-20'
  );
  state = Store.get();
  assert.strictEqual(state.streak.current, 1);
  assert.strictEqual(state.streak.best, 2);
});

test('recordQuiz 對不合法 payload 丟 Error', () => {
  const { Store } = loadStore();
  assert.throws(() => Store.recordQuiz({ mode: 'bad', total: 1, correct: 1, seconds: 1 }), /mode/);
  assert.throws(() => Store.recordQuiz({ mode: 'quiz', total: -1, correct: 1, seconds: 1 }), /total/);
  assert.throws(() => Store.recordQuiz(null), /payload/);
});

// ---- 8. markWrongMastered ----
test('markWrongMastered 標記錯題已掌握', () => {
  const { Store } = loadStore();
  Store.recordQuiz({ mode: 'quiz', part: 'P5', total: 1, correct: 0, seconds: 10, wrongIds: ['p5-005'] }, '2026-08-16');
  assert.strictEqual(Store.get().wrongBook['p5-005'].mastered, false);
  Store.markWrongMastered('p5-005');
  const entry = Store.get().wrongBook['p5-005'];
  assert.strictEqual(entry.mastered, true);
  assert.strictEqual(entry.count, 1, 'count 應保留');
});

// ---- 8b. v2：錯題 ID 正規化、Leitner 排程、錯因、閱讀考點統計 ----
test('normalizeWrongId 把舊版 P6/P7 子題 key 補上 q，其餘不動', () => {
  const { Store } = loadStore();
  assert.strictEqual(Store.normalizeWrongId('p6-001-2'), 'p6-001-q2');
  assert.strictEqual(Store.normalizeWrongId('p7-013-1'), 'p7-013-q1');
  assert.strictEqual(Store.normalizeWrongId('p6-001-q2'), 'p6-001-q2', '已是新格式不應重複加工');
  assert.strictEqual(Store.normalizeWrongId('p5-001'), 'p5-001', 'P5 沒有子題');
  assert.strictEqual(Store.normalizeWrongId('l3-004-q1'), 'l3-004-q1', '聽力本來就是新格式');
});

test('recordQuiz 寫入時就把錯題 ID 正規化，且新錯題排進第 1 箱', () => {
  const { Store } = loadStore();
  Store.recordQuiz(
    { mode: 'quiz', part: 'P6', total: 4, correct: 2, seconds: 100, wrongIds: ['p6-001-2', 'p7-003-1'] },
    '2026-08-16'
  );
  const state = Store.get();
  assert.ok(state.wrongBook['p6-001-q2'], '應存成 -q 格式，否則錯題本查不到題目');
  assert.ok(state.wrongBook['p7-003-q1']);
  assert.strictEqual(state.wrongBook['p6-001-2'], undefined, '不應留下舊格式 key');
  assert.strictEqual(state.wrongBook['p6-001-q2'].box, 1);
  assert.strictEqual(state.wrongBook['p6-001-q2'].due, '2026-08-16', '答錯當天就到期');
  assert.strictEqual(state.quizHistory[0].wrongIds[0], 'p6-001-q2');
});

test('recordQuiz 依 skillStats 累積 readingStats', () => {
  const { Store } = loadStore();
  Store.recordQuiz({
    mode: 'quiz', part: 'P5', total: 3, correct: 2, seconds: 90, wrongIds: ['p5-002'],
    skillStats: [
      { key: 'P5:prep', correct: true, seconds: 18 },
      { key: 'P5:prep', correct: false, seconds: 45 },
      { key: 'P5:tense', correct: true, seconds: 27 }
    ]
  }, '2026-08-16');

  let stats = Store.get().readingStats;
  assert.deepEqual(stats['P5:prep'], { total: 2, correct: 1, seconds: 63 });
  assert.deepEqual(stats['P5:tense'], { total: 1, correct: 1, seconds: 27 });

  // 第二次作答要累加，不是覆蓋
  Store.recordQuiz({
    mode: 'quiz', part: 'P5', total: 1, correct: 1, seconds: 20, wrongIds: [],
    skillStats: [{ key: 'P5:prep', correct: true, seconds: 20 }]
  }, '2026-08-17');
  stats = Store.get().readingStats;
  assert.deepEqual(stats['P5:prep'], { total: 3, correct: 2, seconds: 83 });
});

test('reviewWrong 依 Leitner 升降箱，連續答對到第 5 箱自動標記精通', () => {
  const { Store } = loadStore();
  Store.recordQuiz({ mode: 'quiz', part: 'P5', total: 1, correct: 0, seconds: 10, wrongIds: ['p5-007'] }, '2026-08-16');

  Store.reviewWrong('p5-007', true, '2026-08-16');
  let e = Store.get().wrongBook['p5-007'];
  assert.strictEqual(e.box, 2);
  assert.strictEqual(e.due, '2026-08-18', 'box 2 間隔 2 天');
  assert.strictEqual(e.reviews, 1);
  assert.strictEqual(e.rights, 1);
  assert.strictEqual(e.mastered, false);

  // 答錯 → 退回第 1 箱、明天再見
  Store.reviewWrong('p5-007', false, '2026-08-18');
  e = Store.get().wrongBook['p5-007'];
  assert.strictEqual(e.box, 1);
  assert.strictEqual(e.due, '2026-08-19');
  assert.strictEqual(e.reviews, 2);
  assert.strictEqual(e.rights, 1);

  // 連續答對四次爬到第 5 箱
  ['2026-08-19', '2026-08-20', '2026-08-22', '2026-08-26'].forEach((day) => {
    Store.reviewWrong('p5-007', true, day);
  });
  e = Store.get().wrongBook['p5-007'];
  assert.strictEqual(e.box, 5);
  assert.strictEqual(e.mastered, true, '爬到第 5 箱即視為精通');

  // 再次答錯（例如模考又錯）→ recordQuiz 應把它拉回第 1 箱並取消精通
  Store.recordQuiz({ mode: 'mock', part: '', total: 1, correct: 0, seconds: 30, wrongIds: ['p5-007'] }, '2026-08-27');
  e = Store.get().wrongBook['p5-007'];
  assert.strictEqual(e.mastered, false);
  assert.strictEqual(e.box, 1);
});

test('setWrongReason / flagWrong 管理錯因，未知錯因丟 Error', () => {
  const { Store } = loadStore();
  Store.recordQuiz({ mode: 'quiz', part: 'P5', total: 1, correct: 0, seconds: 10, wrongIds: ['p5-009'] }, '2026-08-16');

  Store.setWrongReason('p5-009', 'grammar');
  assert.strictEqual(Store.get().wrongBook['p5-009'].reason, 'grammar');
  Store.setWrongReason('p5-009', '');
  assert.strictEqual(Store.get().wrongBook['p5-009'].reason, '', '空字串可清除標記');
  assert.throws(() => Store.setWrongReason('p5-009', 'nonsense'), /錯因/);

  // flagWrong：把猜對的題目手動丟進錯題本
  Store.flagWrong('p7-002-1', 'guess');
  const e = Store.get().wrongBook['p7-002-q1'];
  assert.ok(e, 'flagWrong 也要正規化 id');
  assert.strictEqual(e.count, 1);
  assert.strictEqual(e.reason, 'guess');
  assert.strictEqual(e.box, 1);
});

test('dueWrongIds 只回傳未精通且已到期的錯題，早到期的優先', () => {
  const { Store } = loadStore();
  Store.recordQuiz({
    mode: 'quiz', part: 'P5', total: 3, correct: 0, seconds: 60,
    wrongIds: ['p5-011', 'p5-012', 'p5-013']
  }, '2026-08-16');

  Store.reviewWrong('p5-012', true, '2026-08-16'); // → due 2026-08-18
  Store.markWrongMastered('p5-013');

  assert.deepEqual(Store.dueWrongIds('2026-08-16'), ['p5-011'], '未到期與已精通都要排除');
  assert.deepEqual(Store.dueWrongIds('2026-08-19').sort(), ['p5-011', 'p5-012']);
});

// ---- 8c. v1 → v2 migration ----
test('載入 v1 舊資料時自動升級：補 readingStats、正規化錯題 key、補 Leitner 欄位', () => {
  const shim = createLocalStorageShim();
  const v1 = {
    version: 1,
    startDate: '2026-08-01',
    examDate: '2026-09-20',
    dailyMinutes: 90,
    completedTasks: { 'd1-t1': '2026-08-01T10:00:00Z' },
    tipsMastered: {},
    quizHistory: [
      { at: '2026-08-01T10:00:00Z', mode: 'quiz', part: 'P6', total: 4, correct: 2, seconds: 100,
        wrongIds: ['p6-001-2', 'p5-001'] }
    ],
    wrongBook: {
      'p6-001-2': { count: 3, lastAt: '2026-08-01T10:00:00Z', mastered: false },
      'p5-001': { count: 1, lastAt: '2026-08-01T10:00:00Z', mastered: true }
    },
    vocab: { v0001: { box: 2, due: '2026-08-05', seen: 3, wrong: 1 } },
    streak: { current: 2, best: 5, lastActive: '2026-08-01' },
    settings: { ttsRate: 1.0, ttsVoice: '', theme: 'dark' }
  };
  shim.setItem('toeic30:state', JSON.stringify(v1));

  const { Store } = loadStore({ localStorage: shim });
  const state = Store.get();

  assert.strictEqual(state.version, 2);
  assert.deepEqual(state.readingStats, {}, '新欄位要補上');
  assert.ok(state.wrongBook['p6-001-q2'], '舊 key 要正規化');
  assert.strictEqual(state.wrongBook['p6-001-2'], undefined);
  assert.strictEqual(state.wrongBook['p6-001-q2'].count, 3, '錯誤次數要保留');
  assert.strictEqual(state.wrongBook['p6-001-q2'].box, 1, '補上 Leitner 欄位');
  assert.ok(state.wrongBook['p6-001-q2'].due);
  assert.strictEqual(state.wrongBook['p6-001-q2'].reason, '');
  assert.strictEqual(state.wrongBook['p5-001'].mastered, true, '既有的精通標記要保留');
  assert.strictEqual(state.wrongBook['p5-001'].box, 5, '已精通者直接放到第 5 箱');
  assert.deepEqual(state.quizHistory[0].wrongIds, ['p6-001-q2', 'p5-001'], '歷史紀錄也要正規化');
  // 其餘欄位原封不動
  assert.strictEqual(state.startDate, '2026-08-01');
  assert.strictEqual(state.streak.best, 5);
  assert.strictEqual(state.settings.theme, 'dark');
  assert.strictEqual(state.vocab.v0001.box, 2);

  // 升級結果要寫回 localStorage，下次載入不用重跑
  assert.strictEqual(JSON.parse(shim.getItem('toeic30:state')).version, 2);
});

test('migration 遇到新舊 key 並存時合併而不是覆蓋', () => {
  const shim = createLocalStorageShim();
  shim.setItem('toeic30:state', JSON.stringify({
    version: 1,
    startDate: '2026-08-01', examDate: '2026-09-20', dailyMinutes: 90,
    completedTasks: {}, tipsMastered: {}, quizHistory: [],
    wrongBook: {
      'p7-001-1': { count: 2, lastAt: '2026-08-01T00:00:00Z', mastered: false },
      'p7-001-q1': { count: 3, lastAt: '2026-08-05T00:00:00Z', mastered: false }
    },
    vocab: {}, streak: { current: 0, best: 0, lastActive: null },
    settings: { ttsRate: 1.0, ttsVoice: '', theme: 'light' }
  }));

  const { Store } = loadStore({ localStorage: shim });
  const entry = Store.get().wrongBook['p7-001-q1'];
  assert.strictEqual(entry.count, 5, '兩筆 count 要加總，不能有一筆消失');
  assert.strictEqual(entry.lastAt, '2026-08-05T00:00:00Z', '取較新的作答時間');
});

test('import 可接受 v1 舊備份並升級', () => {
  const { Store } = loadStore();
  const v1Json = JSON.stringify({
    version: 1,
    startDate: '2026-07-01', examDate: '2026-09-20', dailyMinutes: 60,
    completedTasks: {}, tipsMastered: {}, quizHistory: [],
    wrongBook: { 'p6-002-3': { count: 1, lastAt: null, mastered: false } },
    vocab: {}, streak: { current: 0, best: 0, lastActive: null },
    settings: { ttsRate: 1.2, ttsVoice: '', theme: 'auto' }
  });
  const state = Store.import(v1Json);
  assert.strictEqual(state.version, 2);
  assert.strictEqual(state.dailyMinutes, 60);
  assert.ok(state.wrongBook['p6-002-q3']);
  assert.deepEqual(state.readingStats, {});
});

// ---- 9. getDayIndex / daysToExam 邊界 ----
test('getDayIndex 邊界：開始前為 0、Day1 起算、超過 30 封頂為 30', () => {
  const { Store } = loadStore();
  Store.set((old) => Object.assign({}, old, { startDate: '2026-08-10', examDate: '2026-09-20' }));

  assert.strictEqual(Store.getDayIndex('2026-08-09'), 0, '開始前一天');
  assert.strictEqual(Store.getDayIndex('2026-08-10'), 1, 'Day 1');
  assert.strictEqual(Store.getDayIndex('2026-08-11'), 2, 'Day 2');
  assert.strictEqual(Store.getDayIndex('2026-09-08'), 30, 'Day 30（start+29 天）');
  assert.strictEqual(Store.getDayIndex('2026-09-09'), 30, '超過 30 天封頂');
  assert.strictEqual(Store.getDayIndex('2026-12-01'), 30, '遠超過也封頂在 30');
});

test('daysToExam 回傳距考試天數', () => {
  const { Store } = loadStore();
  Store.set((old) => Object.assign({}, old, { examDate: '2026-09-20' }));
  const expected = Math.round((Date.UTC(2026, 8, 20) - Date.UTC(2026, 7, 10)) / 86400000);
  assert.strictEqual(Store.daysToExam('2026-08-10'), expected);
  assert.strictEqual(Store.daysToExam('2026-09-20'), 0);
  assert.strictEqual(Store.daysToExam('2026-09-21'), -1);
});

// ---- 10. import 拒絕壞資料 / 匯出匯入 round-trip ----
test('import 對壞資料 / 版本不符丟 Error', () => {
  const { Store } = loadStore();
  assert.throws(() => Store.import('not json'), /JSON/);
  assert.throws(() => Store.import(JSON.stringify({ version: 1 })), /Store/);
  assert.throws(() => Store.import(JSON.stringify(Object.assign({}, Store.get(), { version: 999 }))), /version/);
});

test('export / import round-trip 還原相同狀態', () => {
  const { Store } = loadStore();
  Store.completeTask('d1-t1');
  Store.recordQuiz({ mode: 'quiz', part: 'P5', total: 10, correct: 7, seconds: 90, wrongIds: ['p5-001'] }, '2026-08-16');
  Store.update('settings.ttsRate', 0.9);
  const before = Store.get();
  const json = Store.export();

  Store.reset();
  assert.notDeepStrictEqual(Store.get(), before);

  Store.import(json);
  assert.deepStrictEqual(Store.get(), before);
});

// ---- 11. reset() ----
test('reset() 回到預設狀態', () => {
  const { Store } = loadStore();
  Store.completeTask('d1-t1');
  assert.strictEqual(Store.isTaskDone('d1-t1'), true);
  Store.reset();
  assert.strictEqual(Store.isTaskDone('d1-t1'), false);
  assert.strictEqual(Store.get().dailyMinutes, 90);
});

// ---- 12. localStorage 不存在時退回記憶體 ----
test('localStorage 不存在時退回記憶體物件，行為不變', () => {
  const { Store } = loadStore({ withLocalStorage: false });
  Store.completeTask('d1-t1');
  assert.strictEqual(Store.isTaskDone('d1-t1'), true);
  assert.strictEqual(Store.get().dailyMinutes, 90);
});

// ---- 13. localStorage 持久化：新的 Store 實例可讀到舊資料 ----
test('資料經由 localStorage 在不同 Store 實例間持久化', () => {
  const events = [];
  function CustomEventShim(type, params) { this.type = type; this.detail = params && params.detail; }
  const sharedLocalStorage = createLocalStorageShim();
  function boot() {
    const windowShim = { localStorage: sharedLocalStorage, dispatchEvent: (e) => events.push(e), CustomEvent: CustomEventShim };
    const sandbox = { window: windowShim, console };
    vm.createContext(sandbox);
    vm.runInContext(STORE_SRC, sandbox, { filename: 'store.js' });
    return sandbox.window.Store;
  }
  const store1 = boot();
  store1.completeTask('d1-t1');

  const store2 = boot();
  assert.strictEqual(store2.isTaskDone('d1-t1'), true);
});

// ---- 14. 存取 window.localStorage 本身丟 SecurityError（沙箱 iframe）----
test('localStorage getter 丟 SecurityError 時，Store.get/set 仍正常運作且 isPersistent() 為 false', () => {
  const events = [];
  function CustomEventShim(type, params) { this.type = type; this.detail = params && params.detail; }
  const windowShim = { dispatchEvent: (e) => events.push(e), CustomEvent: CustomEventShim };
  Object.defineProperty(windowShim, 'localStorage', {
    get() {
      const err = new Error('沙箱環境不允許存取 localStorage');
      err.name = 'SecurityError';
      throw err;
    },
    configurable: true
  });
  const sandbox = { window: windowShim, console };
  vm.createContext(sandbox);
  vm.runInContext(STORE_SRC, sandbox, { filename: 'store.js' });
  const Store = sandbox.window.Store;

  assert.strictEqual(Store.isPersistent(), false);
  Store.completeTask('d1-t1');
  assert.strictEqual(Store.isTaskDone('d1-t1'), true);
  assert.strictEqual(Store.get().dailyMinutes, 90);
  assert.strictEqual(Store.isPersistent(), false);
});

// ---- 15. localStorage.setItem 丟 QuotaExceededError（隱私模式等）----
test('setItem 丟 QuotaExceededError 時，Store.get/set 仍正常運作且 isPersistent() 為 false', () => {
  const events = [];
  function CustomEventShim(type, params) { this.type = type; this.detail = params && params.detail; }
  const throwingLocalStorage = {
    getItem() { return null; },
    setItem() {
      const err = new Error('配額已滿');
      err.name = 'QuotaExceededError';
      throw err;
    },
    removeItem() {},
    clear() {}
  };
  const windowShim = {
    localStorage: throwingLocalStorage,
    dispatchEvent: (e) => events.push(e),
    CustomEvent: CustomEventShim
  };
  const sandbox = { window: windowShim, console };
  vm.createContext(sandbox);
  vm.runInContext(STORE_SRC, sandbox, { filename: 'store.js' });
  const Store = sandbox.window.Store;

  Store.completeTask('d1-t1');
  assert.strictEqual(Store.isTaskDone('d1-t1'), true);
  assert.strictEqual(Store.get().dailyMinutes, 90);
  assert.strictEqual(Store.isPersistent(), false);
});

console.log(`store.test.js: ${pass} 個測試全數通過`);
