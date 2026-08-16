/**
 * js/srs.js — TOEIC 30 天衝刺平台
 * window.SRS：Leitner 5 箱間隔複習演算法。純函式，無副作用、不依賴 Store/localStorage。
 * 卡片形狀對齊 docs/DESIGN.md §6 的 vocab 狀態：{ box, due, seen, wrong }。
 */
(function (window) {
  'use strict';

  var MIN_BOX = 1;
  var MAX_BOX = 5;
  var INTERVAL_DAYS = [0, 1, 3, 7, 14]; // index = box - 1

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseISODateUTC(iso) {
    var parts = String(iso).split('-').map(Number);
    return Date.UTC(parts[0], parts[1] - 1, parts[2]);
  }

  function addDaysISO(iso, n) {
    var t = parseISODateUTC(iso) + n * 24 * 60 * 60 * 1000;
    var d = new Date(t);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }

  function clampBox(box) {
    if (typeof box !== 'number' || isNaN(box)) return MIN_BOX;
    return Math.max(MIN_BOX, Math.min(MAX_BOX, Math.round(box)));
  }

  function initCard(todayOverride) {
    var today = todayOverride || todayISO();
    return { box: MIN_BOX, due: today, seen: 0, wrong: 0 };
  }

  function review(card, correct, todayISO_) {
    var today = todayISO_ || todayISO();
    var prevBox = card && typeof card.box === 'number' ? clampBox(card.box) : MIN_BOX;
    var seen = card && typeof card.seen === 'number' ? card.seen : 0;
    var wrong = card && typeof card.wrong === 'number' ? card.wrong : 0;

    var nextBox;
    if (correct) {
      nextBox = Math.min(MAX_BOX, prevBox + 1);
    } else {
      nextBox = MIN_BOX;
      wrong = wrong + 1;
    }

    var interval = INTERVAL_DAYS[nextBox - 1];
    return {
      box: nextBox,
      due: addDaysISO(today, interval),
      seen: seen + 1,
      wrong: wrong
    };
  }

  function isDue(card, todayISO_) {
    var today = todayISO_ || todayISO();
    if (!card || !card.due) return true;
    return card.due <= today;
  }

  function pickSession(opts) {
    opts = opts || {};
    var cardsMap = opts.cards || {};
    var allIds = Array.isArray(opts.allIds) ? opts.allIds : [];
    var today = opts.todayISO || todayISO();
    var newLimit = typeof opts.newLimit === 'number' ? opts.newLimit : Infinity;
    var reviewLimit = typeof opts.reviewLimit === 'number' ? opts.reviewLimit : Infinity;

    var reviewCandidates = [];
    var newCandidates = [];

    allIds.forEach(function (id) {
      var card = cardsMap[id];
      if (card) {
        if (isDue(card, today)) {
          reviewCandidates.push({ id: id, due: card.due || today });
        }
      } else {
        newCandidates.push(id);
      }
    });

    reviewCandidates.sort(function (a, b) {
      if (a.due < b.due) return -1;
      if (a.due > b.due) return 1;
      return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
    });

    newCandidates.sort(function (a, b) {
      return a < b ? -1 : (a > b ? 1 : 0);
    });

    return {
      newIds: newCandidates.slice(0, newLimit),
      reviewIds: reviewCandidates.slice(0, reviewLimit).map(function (c) { return c.id; })
    };
  }

  function stats(cards) {
    cards = cards || {};
    var result = { box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, total: 0 };
    Object.keys(cards).forEach(function (id) {
      var box = clampBox(cards[id] && cards[id].box);
      result['box' + box] += 1;
      result.total += 1;
    });
    return result;
  }

  window.SRS = {
    initCard: initCard,
    review: review,
    isDue: isDue,
    pickSession: pickSession,
    stats: stats
  };
})(typeof window !== 'undefined' ? window : globalThis);
