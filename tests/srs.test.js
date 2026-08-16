'use strict';
/**
 * tests/srs.test.js — node tests/srs.test.js
 * 用 vm 載入 js/srs.js（純函式模組，無 window/localStorage 相依）。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRS_SRC = fs.readFileSync(path.join(__dirname, '../js/srs.js'), 'utf8');

function loadSRS() {
  const sandbox = { console: console };
  vm.createContext(sandbox);
  vm.runInContext(SRS_SRC, sandbox, { filename: 'srs.js' });
  return sandbox.SRS;
}

let pass = 0;
function test(name, fn) {
  fn();
  pass++;
  console.log('  ok - ' + name);
}

console.log('srs.test.js');

// ---- initCard ----
test('initCard() 產生 box1、seen0、wrong0 的新卡片', () => {
  const SRS = loadSRS();
  const card = SRS.initCard('2026-08-16');
  assert.deepEqual(card, { box: 1, due: '2026-08-16', seen: 0, wrong: 0 });
});

// ---- review：答對升箱、間隔正確 ----
test('review() 連續答對依 [0,1,3,7,14] 升箱，封頂 box5', () => {
  const SRS = loadSRS();
  let card = SRS.initCard('2026-08-16');

  card = SRS.review(card, true, '2026-08-16'); // -> box2, due +1
  assert.strictEqual(card.box, 2);
  assert.strictEqual(card.due, '2026-08-17');
  assert.strictEqual(card.seen, 1);

  card = SRS.review(card, true, '2026-08-16'); // -> box3, due +3
  assert.strictEqual(card.box, 3);
  assert.strictEqual(card.due, '2026-08-19');

  card = SRS.review(card, true, '2026-08-16'); // -> box4, due +7
  assert.strictEqual(card.box, 4);
  assert.strictEqual(card.due, '2026-08-23');

  card = SRS.review(card, true, '2026-08-16'); // -> box5, due +14
  assert.strictEqual(card.box, 5);
  assert.strictEqual(card.due, '2026-08-30');

  card = SRS.review(card, true, '2026-08-16'); // 已在 box5，維持封頂
  assert.strictEqual(card.box, 5);
  assert.strictEqual(card.due, '2026-08-30');
  assert.strictEqual(card.seen, 5);
});

// ---- review：答錯回 box1 ----
test('review() 答錯回 box1，due=當天，wrong 累加', () => {
  const SRS = loadSRS();
  let card = SRS.initCard('2026-08-16');
  card = SRS.review(card, true, '2026-08-16');
  card = SRS.review(card, true, '2026-08-16'); // box3
  assert.strictEqual(card.box, 3);

  card = SRS.review(card, false, '2026-08-20');
  assert.strictEqual(card.box, 1);
  assert.strictEqual(card.due, '2026-08-20');
  assert.strictEqual(card.wrong, 1);
  assert.strictEqual(card.seen, 3);
});

test('review() 對缺欄位的卡片有安全預設值', () => {
  const SRS = loadSRS();
  const card = SRS.review(null, true, '2026-08-16');
  assert.strictEqual(card.box, 2);
  assert.strictEqual(card.seen, 1);
  assert.strictEqual(card.wrong, 0);
});

// ---- isDue ----
test('isDue()：到期或已過期為 true，未到期為 false，無 due 視為 true', () => {
  const SRS = loadSRS();
  assert.strictEqual(SRS.isDue({ due: '2026-08-16' }, '2026-08-16'), true);
  assert.strictEqual(SRS.isDue({ due: '2026-08-10' }, '2026-08-16'), true);
  assert.strictEqual(SRS.isDue({ due: '2026-08-20' }, '2026-08-16'), false);
  assert.strictEqual(SRS.isDue(null, '2026-08-16'), true);
  assert.strictEqual(SRS.isDue({}, '2026-08-16'), true);
});

// ---- pickSession：複習優先排序 + 新字依 id 順序 ----
test('pickSession() 複習依到期日早到晚排序，新字依 id 順序，並各自受限流', () => {
  const SRS = loadSRS();
  const cards = {
    v0003: { box: 2, due: '2026-08-14', seen: 1, wrong: 0 }, // 已到期，最早
    v0005: { box: 1, due: '2026-08-15', seen: 1, wrong: 1 }, // 已到期，次早
    v0007: { box: 3, due: '2026-08-20', seen: 2, wrong: 0 }  // 尚未到期
  };
  const allIds = ['v0007', 'v0009', 'v0003', 'v0001', 'v0005'];
  const result = SRS.pickSession({
    cards: cards,
    allIds: allIds,
    todayISO: '2026-08-16',
    newLimit: 10,
    reviewLimit: 10
  });

  assert.deepEqual(result.reviewIds, ['v0003', 'v0005'], '依到期日早到晚');
  assert.deepEqual(result.newIds, ['v0001', 'v0009'], '新字（未建卡）依 id 字串順序');
});

test('pickSession() 遵守 newLimit / reviewLimit', () => {
  const SRS = loadSRS();
  const cards = {
    a: { box: 1, due: '2026-08-01' },
    b: { box: 1, due: '2026-08-02' },
    c: { box: 1, due: '2026-08-03' }
  };
  const allIds = ['a', 'b', 'c', 'd', 'e', 'f'];
  const result = SRS.pickSession({
    cards: cards,
    allIds: allIds,
    todayISO: '2026-08-16',
    newLimit: 2,
    reviewLimit: 1
  });
  assert.deepEqual(result.reviewIds, ['a']);
  assert.deepEqual(result.newIds, ['d', 'e']);
});

test('pickSession() 未到期的卡片不進 reviewIds', () => {
  const SRS = loadSRS();
  const cards = { a: { box: 1, due: '2099-01-01' } };
  const result = SRS.pickSession({ cards: cards, allIds: ['a'], todayISO: '2026-08-16' });
  assert.deepEqual(result.reviewIds, []);
  assert.deepEqual(result.newIds, []);
});

// ---- stats ----
test('stats() 統計各箱數量', () => {
  const SRS = loadSRS();
  const cards = {
    a: { box: 1 }, b: { box: 1 }, c: { box: 2 },
    d: { box: 5 }, e: { box: 5 }, f: { box: 3 }
  };
  const s = SRS.stats(cards);
  assert.deepEqual(s, { box1: 2, box2: 1, box3: 1, box4: 0, box5: 2, total: 6 });
});

test('stats() 對空物件回傳全 0', () => {
  const SRS = loadSRS();
  assert.deepEqual(SRS.stats({}), { box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, total: 0 });
  assert.deepEqual(SRS.stats(undefined), { box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, total: 0 });
});

console.log(`srs.test.js: ${pass} 個測試全數通過`);
