'use strict';
/**
 * tests/langstore.test.js — node tests/langstore.test.js
 * 驗證 js/langstore.js（日西的狀態層）與 js/platform.js（語言註冊表）。
 * 重點在「各語言命名空間確實隔離」，因為那是這次改成多語言平台最關鍵的保證。
 * 純 Node，用 vm + localStorage shim，無外部相依。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function createLocalStorageShim() {
  const data = new Map();
  return {
    _data: data,
    getItem(k) { return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { data.set(k, String(v)); },
    removeItem(k) { data.delete(k); },
    clear() { data.clear(); }
  };
}

function load(opts) {
  opts = opts || {};
  const events = [];
  function CustomEventShim(type, params) {
    this.type = type;
    this.detail = params && params.detail;
  }
  const windowShim = {
    localStorage: opts.localStorage || createLocalStorageShim(),
    dispatchEvent(evt) { events.push(evt); return true; },
    CustomEvent: CustomEventShim
  };
  const sandbox = { window: windowShim, console };
  vm.createContext(sandbox);
  ['js/platform.js', 'js/srs.js', 'js/langstore.js'].forEach((rel) => {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  });
  return {
    Platform: sandbox.window.Platform,
    LangStore: sandbox.window.LangStore,
    SRS: sandbox.window.SRS,
    events,
    ls: windowShim.localStorage
  };
}

let pass = 0;
function test(name, fn) {
  fn();
  pass++;
  console.log('  ok - ' + name);
}

console.log('langstore.test.js');

// ---- Platform ----
test('Platform 列出三個語言，路由反查正確', () => {
  const { Platform } = load();
  const langs = Platform.languages();
  assert.deepEqual(langs.map((l) => l.code), ['en', 'ja', 'es']);

  assert.strictEqual(Platform.langOfRoute('dashboard'), 'en');
  assert.strictEqual(Platform.langOfRoute('reading'), 'en');
  assert.strictEqual(Platform.langOfRoute('ja-kana'), 'ja');
  assert.strictEqual(Platform.langOfRoute('es-verbs'), 'es');
  assert.strictEqual(Platform.langOfRoute('hub'), null, 'hub 不屬於任何語言');
  assert.strictEqual(Platform.langOfRoute('nonsense'), null);
});

test('Platform.allRoutes 涵蓋 hub 與所有語言路由，且不重複', () => {
  const { Platform } = load();
  const routes = Platform.allRoutes();
  assert.ok(routes.indexOf('hub') !== -1);
  ['dashboard', 'quiz', 'reading', 'ja', 'ja-kana', 'es', 'es-verbs'].forEach((r) => {
    assert.ok(routes.indexOf(r) !== -1, '缺少路由 ' + r);
  });
  assert.strictEqual(new Set(routes).size, routes.length, '路由不可重複');
});

test('每個語言的 storageKey 都不同，英語仍指向 toeic30:state', () => {
  const { Platform } = load();
  const keys = Platform.languages().map((l) => l.storageKey);
  assert.strictEqual(new Set(keys).size, keys.length, '儲存 key 不可重複');
  assert.strictEqual(Platform.byCode('en').storageKey, 'toeic30:state',
    '英語必須沿用既有 key，否則使用者的 TOEIC 進度會消失');
  assert.strictEqual(Platform.byCode('en').engine, 'toeic');
  assert.strictEqual(Platform.byCode('ja').engine, 'lang');
});

test('tabItems 最多 4 個，moreItems 補齊其餘不重複', () => {
  const { Platform } = load();
  ['en', 'ja', 'es'].forEach((code) => {
    const tabs = Platform.tabItems(code);
    const more = Platform.moreItems(code);
    const nav = Platform.byCode(code).nav;
    assert.ok(tabs.length <= 4, code + ' 的 tab 超過 4 個');
    assert.strictEqual(tabs.length + more.length, nav.length, code + ' 的 tab + more 應涵蓋全部 nav');
    const overlap = tabs.filter((t) => more.some((m) => m.route === t.route));
    assert.deepEqual(overlap, [], code + ' 的 tab 與 more 不可重疊');
  });
});

// ---- LangStore 基本行為 ----
test('LangStore.for 對非 lang 引擎的語言丟 Error', () => {
  const { LangStore } = load();
  assert.throws(() => LangStore.for('en'), /toeic/, '英語應該走 window.Store');
  assert.throws(() => LangStore.for('fr'), /未知的語言/);
});

test('預設 state 結構正確，且同語言重複取得是同一個 instance', () => {
  const { LangStore } = load();
  const ja = LangStore.for('ja');
  assert.strictEqual(ja, LangStore.for('ja'), '應該回傳同一個 instance');
  const s = ja.get();
  assert.strictEqual(s.version, 1);
  assert.strictEqual(s.lang, 'ja');
  assert.deepEqual(s.cards, {});
  assert.deepEqual(s.wrongBook, {});
  assert.deepEqual(s.quizHistory, []);
  assert.strictEqual(s.settings.dailyNew, 10);
});

test('get() 回傳深拷貝，外部改動不影響內部狀態', () => {
  const { LangStore } = load();
  const ja = LangStore.for('ja');
  const s1 = ja.get();
  s1.settings.dailyNew = 999;
  s1.cards['hack'] = {};
  const s2 = ja.get();
  assert.strictEqual(s2.settings.dailyNew, 10);
  assert.deepEqual(s2.cards, {});
});

// ---- 命名空間隔離（這次改版最重要的保證）----
test('日語與西班牙語的進度完全隔離，且都不碰 toeic30:state', () => {
  const { LangStore, ls } = load();
  const ja = LangStore.for('ja');
  const es = LangStore.for('es');

  ja.reviewCard('jk-a', true, '2026-08-16');
  es.reviewCard('esw-001', true, '2026-08-16');

  assert.deepEqual(Object.keys(ja.get().cards), ['jk-a']);
  assert.deepEqual(Object.keys(es.get().cards), ['esw-001'], '西語不該看到日語的卡片');

  const keys = Array.from(ls._data.keys());
  assert.ok(keys.indexOf('lang:ja:state') !== -1);
  assert.ok(keys.indexOf('lang:es:state') !== -1);
  assert.strictEqual(keys.indexOf('toeic30:state'), -1, 'LangStore 不該寫入 TOEIC 的 key');
});

test('重置某一個語言不影響其他語言', () => {
  const { LangStore } = load();
  const ja = LangStore.for('ja');
  const es = LangStore.for('es');
  ja.reviewCard('jk-a', true, '2026-08-16');
  es.reviewCard('esw-001', true, '2026-08-16');

  es.reset();
  assert.deepEqual(es.get().cards, {});
  assert.deepEqual(Object.keys(ja.get().cards), ['jk-a'], '日語進度不該被西語的重置清掉');
});

// ---- SRS 卡片 ----
test('reviewCard 用 SRS 升降箱，並更新連續天數', () => {
  const { LangStore } = load();
  const ja = LangStore.for('ja');

  ja.reviewCard('jk-ka', true, '2026-08-16');
  let c = ja.get().cards['jk-ka'];
  assert.strictEqual(c.box, 2);
  assert.strictEqual(c.due, '2026-08-17', 'box 2 間隔 1 天');
  assert.strictEqual(c.seen, 1);
  assert.strictEqual(ja.get().streak.current, 1);

  ja.reviewCard('jk-ka', false, '2026-08-17');
  c = ja.get().cards['jk-ka'];
  assert.strictEqual(c.box, 1, '答錯退回第 1 箱');
  assert.strictEqual(c.wrong, 1);
  assert.strictEqual(ja.get().streak.current, 2, '連續第二天學習');
});

test('pickSession 依 dailyNew 限制新卡，到期卡優先', () => {
  const { LangStore } = load();
  const ja = LangStore.for('ja');
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];

  let picked = ja.pickSession(ids, { todayISO: '2026-08-16', newLimit: 3 });
  assert.strictEqual(picked.reviewIds.length, 0);
  assert.strictEqual(picked.newIds.length, 3, '新卡受 newLimit 限制');

  ja.reviewCard('a', true, '2026-08-16'); // due 2026-08-17
  picked = ja.pickSession(ids, { todayISO: '2026-08-18', newLimit: 2 });
  assert.deepEqual(picked.reviewIds, ['a'], 'a 已到期應排進複習');
  assert.strictEqual(picked.newIds.length, 2);
});

test('cardStats 正確分類未學 / 學習中 / 已熟 / 到期', () => {
  const { LangStore } = load();
  const ja = LangStore.for('ja');
  const ids = ['x', 'y', 'z'];

  // x 連續答對 4 次 → box 5（已熟）
  ['2026-08-16', '2026-08-17', '2026-08-20', '2026-08-27'].forEach((d) => {
    ja.reviewCard('x', true, d);
  });
  ja.reviewCard('y', false, '2026-08-16'); // box 1，隔天到期

  const stats = ja.cardStats(ids);
  assert.strictEqual(stats.total, 3);
  assert.strictEqual(stats.mastered, 1, 'x 應為已熟');
  assert.strictEqual(stats.learning, 1, 'y 仍在學習中');
  assert.strictEqual(stats.unseen, 1, 'z 尚未學');
});

// ---- 測驗與錯題本 ----
test('recordQuiz 寫入歷史與錯題本，錯題排進第 1 箱', () => {
  const { LangStore } = load();
  const es = LangStore.for('es');
  es.recordQuiz({
    mode: 'quiz', unit: 'verbs', total: 5, correct: 3, seconds: 40,
    wrongIds: ['esvb-esv-ser-0', 'esvb-esv-ir-2']
  }, '2026-08-16');

  const s = es.get();
  assert.strictEqual(s.quizHistory.length, 1);
  assert.strictEqual(s.quizHistory[0].unit, 'verbs');
  assert.strictEqual(s.wrongBook['esvb-esv-ser-0'].count, 1);
  assert.strictEqual(s.wrongBook['esvb-esv-ser-0'].box, 1);
  assert.strictEqual(s.wrongBook['esvb-esv-ser-0'].due, '2026-08-16', '答錯當天就到期');
  assert.strictEqual(s.streak.current, 1);
});

test('recordQuiz 對不合法 payload 丟 Error', () => {
  const { LangStore } = load();
  const es = LangStore.for('es');
  assert.throws(() => es.recordQuiz(null), /payload/);
  assert.throws(() => es.recordQuiz({ total: -1, correct: 0 }), /total/);
  assert.throws(() => es.recordQuiz({ total: 1, correct: 'x' }), /correct/);
  assert.throws(() => es.recordQuiz({ total: 1, correct: 1, wrongIds: 'nope' }), /wrongIds/);
});

test('reviewWrong 依 Leitner 升降箱，到第 5 箱自動精通', () => {
  const { LangStore } = load();
  const ja = LangStore.for('ja');
  ja.recordQuiz({ total: 1, correct: 0, wrongIds: ['jq-01'] }, '2026-08-16');

  ja.reviewWrong('jq-01', true, '2026-08-16');
  let e = ja.get().wrongBook['jq-01'];
  assert.strictEqual(e.box, 2);
  assert.strictEqual(e.due, '2026-08-18', 'box 2 間隔 2 天');
  assert.strictEqual(e.reviews, 1);
  assert.strictEqual(e.rights, 1);

  ja.reviewWrong('jq-01', false, '2026-08-18');
  e = ja.get().wrongBook['jq-01'];
  assert.strictEqual(e.box, 1);
  assert.strictEqual(e.rights, 1, '答錯不增加 rights');
  assert.strictEqual(e.reviews, 2);

  ['2026-08-19', '2026-08-20', '2026-08-22', '2026-08-26'].forEach((d) => {
    ja.reviewWrong('jq-01', true, d);
  });
  e = ja.get().wrongBook['jq-01'];
  assert.strictEqual(e.box, 5);
  assert.strictEqual(e.mastered, true);
});

test('dueWrongIds 排除已精通與未到期的題目', () => {
  const { LangStore } = load();
  const ja = LangStore.for('ja');
  ja.recordQuiz({ total: 3, correct: 0, wrongIds: ['q1', 'q2', 'q3'] }, '2026-08-16');
  ja.reviewWrong('q2', true, '2026-08-16');   // due 2026-08-18
  ja.markWrongMastered('q3');

  assert.deepEqual(ja.dueWrongIds('2026-08-16'), ['q1']);
  assert.deepEqual(ja.dueWrongIds('2026-08-19').sort(), ['q1', 'q2']);
});

test('setWrongReason 驗證錯因值域', () => {
  const { LangStore } = load();
  const ja = LangStore.for('ja');
  ja.recordQuiz({ total: 1, correct: 0, wrongIds: ['q9'] }, '2026-08-16');
  ja.setWrongReason('q9', 'grammar');
  assert.strictEqual(ja.get().wrongBook['q9'].reason, 'grammar');
  ja.setWrongReason('q9', '');
  assert.strictEqual(ja.get().wrongBook['q9'].reason, '');
  assert.throws(() => ja.setWrongReason('q9', 'bogus'), /錯因/);
});

// ---- 課程 / 匯出匯入 ----
test('completeLesson 記錄完成時間並更新連續天數', () => {
  const { LangStore } = load();
  const es = LangStore.for('es');
  assert.strictEqual(es.isLessonDone('es-s01'), false);
  es.completeLesson('es-s01');
  assert.strictEqual(es.isLessonDone('es-s01'), true);
  assert.ok(es.get().lessonsDone['es-s01']);
  assert.strictEqual(es.get().streak.current, 1);
});

test('export / import round-trip，且拒絕別的語言的備份', () => {
  const { LangStore } = load();
  const ja = LangStore.for('ja');
  const es = LangStore.for('es');

  ja.reviewCard('jk-a', true, '2026-08-16');
  ja.completeLesson('jg-01');
  const backup = ja.export();

  ja.reset();
  assert.deepEqual(ja.get().cards, {});

  ja.import(backup);
  assert.deepEqual(Object.keys(ja.get().cards), ['jk-a']);
  assert.strictEqual(ja.isLessonDone('jg-01'), true);

  assert.throws(() => es.import(backup), /不能匯入/, '日語備份不該能匯入西語');
  assert.throws(() => ja.import('not json'), /JSON/);
});

test('資料損毀時退回預設值而不是拋錯', () => {
  const ls = createLocalStorageShim();
  ls.setItem('lang:ja:state', '{ this is not valid json');
  const { LangStore } = load({ localStorage: ls });
  const s = LangStore.for('ja').get();
  assert.strictEqual(s.version, 1);
  assert.deepEqual(s.cards, {});
});

test('狀態變更會發出帶語言代碼的 lang:change 事件', () => {
  const { LangStore, events } = load();
  LangStore.for('ja').reviewCard('jk-a', true, '2026-08-16');
  const last = events[events.length - 1];
  assert.strictEqual(last.type, 'lang:change');
  assert.strictEqual(last.detail.lang, 'ja');
  assert.ok(last.detail.state.cards['jk-a']);
});

console.log(`langstore.test.js: ${pass} 個測試全數通過`);
