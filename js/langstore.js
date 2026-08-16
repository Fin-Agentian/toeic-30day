/**
 * js/langstore.js — 日語 / 西班牙語的狀態層
 *
 * window.LangStore.for(langCode) 回傳一個介面與 window.Store 高度相似的物件，
 * 讓日西的 views 用同一套寫法操作自己的進度。每個語言各有獨立的 localStorage key
 * （見 Platform.LANGUAGES[].storageKey），彼此不干擾，也完全不碰 TOEIC 的
 * 'toeic30:state' —— 英語模組維持原本的 window.Store，既有進度零風險。
 *
 * 與 store.js 的差異：
 * - 不含 TOEIC 專屬欄位（30 天計畫、readingStats、tipsMastered…）
 * - cards 是「所有可 SRS 的學習項目」共用一張表（五十音、單字、動詞變位都放這裡），
 *   靠 id 前綴區分（jk-a / jv-0001 / esv-0001 / esvb-hablar…）
 * - 卡片形狀與 window.SRS 完全一致，直接餵給 SRS.review() / SRS.pickSession()
 *
 * 不可變更新：set() 一律回傳新物件。純 IIFE，無 ES modules、無 fetch。
 */
(function (window) {
  'use strict';

  var STATE_VERSION = 1;
  var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var WRONG_INTERVAL_DAYS = [1, 2, 4, 7, 14];
  var WRONG_MAX_BOX = 5;
  var WRONG_REASONS = ['vocab', 'grammar', 'misread', 'time', 'guess'];

  // ---- 小工具（與 store.js 相同語意，刻意各自獨立以免互相牽動）----

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseISODateUTC(iso) {
    var p = String(iso).split('-').map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2]);
  }

  function addDaysISO(iso, n) {
    var d = new Date(parseISODateUTC(iso) + n * 86400000);
    return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
  }

  function isPlainObject(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
  }

  function deepClone(obj) {
    if (obj === undefined) return obj;
    return JSON.parse(JSON.stringify(obj));
  }

  function wrongDueFrom(box, today) {
    var idx = Math.max(1, Math.min(WRONG_MAX_BOX, box)) - 1;
    return addDaysISO(today, WRONG_INTERVAL_DAYS[idx]);
  }

  function normalizeWrongEntry(entry, todayOverride) {
    var today = todayOverride || todayISO();
    var e = isPlainObject(entry) ? entry : {};
    var box = typeof e.box === 'number' && e.box >= 1 && e.box <= WRONG_MAX_BOX ? Math.round(e.box) : 1;
    return {
      count: typeof e.count === 'number' ? e.count : 0,
      lastAt: e.lastAt || null,
      mastered: !!e.mastered,
      box: e.mastered ? WRONG_MAX_BOX : box,
      due: typeof e.due === 'string' && ISO_DATE_RE.test(e.due) ? e.due : today,
      reason: WRONG_REASONS.indexOf(e.reason) === -1 ? '' : e.reason,
      reviews: typeof e.reviews === 'number' ? e.reviews : 0,
      rights: typeof e.rights === 'number' ? e.rights : 0
    };
  }

  function computeNextStreak(streak, today) {
    var current = streak && typeof streak.current === 'number' ? streak.current : 0;
    var best = streak && typeof streak.best === 'number' ? streak.best : 0;
    var lastActive = (streak && streak.lastActive) || null;
    if (lastActive === today) return { current: current, best: best, lastActive: lastActive };
    current = lastActive === addDaysISO(today, -1) ? current + 1 : 1;
    return { current: current, best: Math.max(best, current), lastActive: today };
  }

  // ---- 每個語言一個 instance ----

  var instances = {};

  function createInstance(langCode, storageKey) {
    var currentState = null;
    var memoryRaw = null;
    var forcedMemoryMode = false;
    var warned = false;

    function warnOnce() {
      if (warned) return;
      warned = true;
      try {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[LangStore:' + langCode + '] 無法使用 localStorage，進度只保留在本次頁面');
        }
      } catch (e) { /* 沒有 console 的環境 */ }
    }

    function tryLS() {
      if (forcedMemoryMode) return null;
      try {
        if (typeof window === 'undefined' || !('localStorage' in window)) {
          forcedMemoryMode = true; warnOnce(); return null;
        }
        var ls = window.localStorage;
        if (!ls || typeof ls.getItem !== 'function' || typeof ls.setItem !== 'function') {
          forcedMemoryMode = true; warnOnce(); return null;
        }
        ls.getItem(storageKey); // 探測：沙箱下可能此時才丟 SecurityError
        return ls;
      } catch (e) {
        forcedMemoryMode = true; warnOnce(); return null;
      }
    }

    function readRaw() {
      var ls = tryLS();
      if (!ls) return memoryRaw;
      try {
        return ls.getItem(storageKey);
      } catch (e) {
        forcedMemoryMode = true; warnOnce(); return memoryRaw;
      }
    }

    function writeRaw(str) {
      var ls = tryLS();
      if (ls) {
        try { ls.setItem(storageKey, str); return; } catch (e) { forcedMemoryMode = true; warnOnce(); }
      }
      memoryRaw = str;
    }

    function defaultState() {
      return {
        version: STATE_VERSION,
        lang: langCode,
        startDate: todayISO(),
        cards: {},          // id → SRS 卡片 { box, due, seen, wrong }
        lessonsDone: {},    // 課程/單元 id → 完成時間 ISO
        quizHistory: [],    // { at, mode, unit, total, correct, seconds, wrongIds[] }
        wrongBook: {},      // id → { count, lastAt, mastered, box, due, reason, reviews, rights }
        streak: { current: 0, best: 0, lastActive: null },
        settings: { ttsRate: 1.0, dailyNew: 10, showRomaji: true }
      };
    }

    function validateState(s) {
      if (!isPlainObject(s)) throw new Error('LangStore: state 必須是物件');
      if (typeof s.version !== 'number') throw new Error('LangStore: 缺少 version');
      if (typeof s.startDate !== 'string' || !ISO_DATE_RE.test(s.startDate)) {
        throw new Error('LangStore: startDate 格式錯誤');
      }
      ['cards', 'lessonsDone', 'wrongBook', 'streak', 'settings'].forEach(function (k) {
        if (!isPlainObject(s[k])) throw new Error('LangStore: ' + k + ' 必須是物件');
      });
      if (!Array.isArray(s.quizHistory)) throw new Error('LangStore: quizHistory 必須是陣列');
      if (typeof s.settings.ttsRate !== 'number') throw new Error('LangStore: settings.ttsRate 必須是數字');
    }

    function loadState() {
      if (currentState) return currentState;
      var raw = readRaw();
      if (!raw) {
        currentState = defaultState();
        persist(currentState);
        return currentState;
      }
      try {
        var parsed = JSON.parse(raw);
        validateState(parsed);
        currentState = parsed;
      } catch (e) {
        currentState = defaultState();   // 損毀 → 退回預設值，不中斷 App
        persist(currentState);
      }
      return currentState;
    }

    function persist(s) {
      try { writeRaw(JSON.stringify(s)); } catch (e) { /* 寫入失敗仍保留在記憶體 */ }
    }

    function dispatchChange() {
      if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
      try {
        var CE = window.CustomEvent || (typeof CustomEvent !== 'undefined' ? CustomEvent : null);
        var detail = { lang: langCode, state: deepClone(currentState) };
        var evt = CE ? new CE('lang:change', { detail: detail }) : { type: 'lang:change', detail: detail };
        window.dispatchEvent(evt);
      } catch (e) { /* 非 DOM 環境 */ }
    }

    function get() { return deepClone(loadState()); }

    function set(patchFn) {
      if (typeof patchFn !== 'function') throw new Error('LangStore.set: patchFn 必須是函式');
      var next = patchFn(deepClone(loadState()));
      validateState(next);
      currentState = deepClone(next);
      persist(currentState);
      dispatchChange();
      return deepClone(currentState);
    }

    function reset() {
      currentState = defaultState();
      persist(currentState);
      dispatchChange();
      return deepClone(currentState);
    }

    function isPersistent() { return !!tryLS(); }

    // ---- 課程完成 ----

    function completeLesson(id) {
      if (!id) throw new Error('LangStore.completeLesson: id 為必填');
      var today = todayISO();
      return set(function (old) {
        var lessonsDone = Object.assign({}, old.lessonsDone);
        lessonsDone[id] = new Date().toISOString();
        return Object.assign({}, old, {
          lessonsDone: lessonsDone,
          streak: computeNextStreak(old.streak, today)
        });
      });
    }

    function isLessonDone(id) {
      var s = loadState();
      return !!(s.lessonsDone && s.lessonsDone[id]);
    }

    // ---- SRS 卡片（五十音 / 單字 / 動詞變位共用）----

    /** reviewCard(id, correct) — 用 window.SRS 更新一張卡片並寫回 */
    function reviewCard(id, correct, todayOverride) {
      if (!id) throw new Error('LangStore.reviewCard: id 為必填');
      if (!window.SRS) throw new Error('LangStore.reviewCard: 需要 window.SRS');
      var today = todayOverride || todayISO();
      return set(function (old) {
        var cards = Object.assign({}, old.cards);
        var existing = cards[id] || window.SRS.initCard(today);
        cards[id] = window.SRS.review(existing, !!correct, today);
        return Object.assign({}, old, {
          cards: cards,
          streak: computeNextStreak(old.streak, today)
        });
      });
    }

    /**
     * pickSession(allIds, opts) — 依 SRS 排出今天要學的新卡與要複習的卡。
     * allIds 由呼叫端提供（例如「所有 N5 單字 id」或「所有平假名 id」）。
     */
    function pickSession(allIds, opts) {
      opts = opts || {};
      if (!window.SRS) return { newIds: [], reviewIds: [] };
      var s = loadState();
      return window.SRS.pickSession({
        cards: s.cards,
        allIds: allIds || [],
        todayISO: opts.todayISO || todayISO(),
        newLimit: typeof opts.newLimit === 'number' ? opts.newLimit : (s.settings.dailyNew || 10),
        reviewLimit: typeof opts.reviewLimit === 'number' ? opts.reviewLimit : Infinity
      });
    }

    /** cardStats(ids) — 這批 id 的學習概況（未學 / 學習中 / 已熟 / 今日到期） */
    function cardStats(ids) {
      var s = loadState();
      var today = todayISO();
      var out = { total: (ids || []).length, unseen: 0, learning: 0, mastered: 0, due: 0 };
      (ids || []).forEach(function (id) {
        var c = s.cards[id];
        if (!c) { out.unseen += 1; return; }
        if (c.box >= 5) out.mastered += 1; else out.learning += 1;
        if (!c.due || c.due <= today) out.due += 1;
      });
      return out;
    }

    // ---- 測驗與錯題本 ----

    function recordQuiz(payload, todayOverride) {
      if (!isPlainObject(payload)) throw new Error('LangStore.recordQuiz: payload 必須是物件');
      if (typeof payload.total !== 'number' || payload.total < 0) {
        throw new Error('LangStore.recordQuiz: total 必須是非負數字');
      }
      if (typeof payload.correct !== 'number' || payload.correct < 0) {
        throw new Error('LangStore.recordQuiz: correct 必須是非負數字');
      }
      if (payload.wrongIds !== undefined && !Array.isArray(payload.wrongIds)) {
        throw new Error('LangStore.recordQuiz: wrongIds 必須是陣列');
      }
      var wrongIds = Array.isArray(payload.wrongIds) ? payload.wrongIds.slice() : [];
      var nowIso = new Date().toISOString();
      var today = todayOverride || todayISO();

      return set(function (old) {
        var quizHistory = old.quizHistory.concat([{
          at: nowIso,
          mode: payload.mode || 'quiz',
          unit: payload.unit || '',
          total: payload.total,
          correct: payload.correct,
          seconds: typeof payload.seconds === 'number' ? payload.seconds : 0,
          wrongIds: wrongIds
        }]);

        var wrongBook = Object.assign({}, old.wrongBook);
        wrongIds.forEach(function (id) {
          var e = normalizeWrongEntry(wrongBook[id], today);
          wrongBook[id] = Object.assign({}, e, {
            count: e.count + 1, lastAt: nowIso, mastered: false, box: 1, due: today
          });
        });

        return Object.assign({}, old, {
          quizHistory: quizHistory,
          wrongBook: wrongBook,
          streak: computeNextStreak(old.streak, today)
        });
      });
    }

    function reviewWrong(id, correct, todayOverride) {
      if (!id) throw new Error('LangStore.reviewWrong: id 為必填');
      var today = todayOverride || todayISO();
      return set(function (old) {
        var e = normalizeWrongEntry(old.wrongBook[id], today);
        var nextBox = correct ? Math.min(WRONG_MAX_BOX, e.box + 1) : 1;
        var wrongBook = Object.assign({}, old.wrongBook);
        wrongBook[id] = Object.assign({}, e, {
          box: nextBox,
          due: wrongDueFrom(nextBox, today),
          mastered: nextBox >= WRONG_MAX_BOX,
          reviews: e.reviews + 1,
          rights: e.rights + (correct ? 1 : 0)
        });
        return Object.assign({}, old, { wrongBook: wrongBook });
      });
    }

    function setWrongReason(id, reason) {
      if (!id) throw new Error('LangStore.setWrongReason: id 為必填');
      var r = reason || '';
      if (r && WRONG_REASONS.indexOf(r) === -1) {
        throw new Error('LangStore.setWrongReason: 未知的錯因 ' + r);
      }
      var today = todayISO();
      return set(function (old) {
        var wrongBook = Object.assign({}, old.wrongBook);
        wrongBook[id] = Object.assign({}, normalizeWrongEntry(wrongBook[id], today), { reason: r });
        return Object.assign({}, old, { wrongBook: wrongBook });
      });
    }

    function markWrongMastered(id) {
      if (!id) throw new Error('LangStore.markWrongMastered: id 為必填');
      var today = todayISO();
      return set(function (old) {
        var wrongBook = Object.assign({}, old.wrongBook);
        wrongBook[id] = Object.assign({}, normalizeWrongEntry(wrongBook[id], today), {
          mastered: true, box: WRONG_MAX_BOX, due: wrongDueFrom(WRONG_MAX_BOX, today)
        });
        return Object.assign({}, old, { wrongBook: wrongBook });
      });
    }

    function dueWrongIds(todayOverride) {
      var today = todayOverride || todayISO();
      var wb = loadState().wrongBook || {};
      return Object.keys(wb).filter(function (id) {
        var e = normalizeWrongEntry(wb[id], today);
        return !e.mastered && (e.due || today) <= today;
      }).sort(function (a, b) {
        var ea = normalizeWrongEntry(wb[a], today);
        var eb = normalizeWrongEntry(wb[b], today);
        if (ea.due !== eb.due) return ea.due < eb.due ? -1 : 1;
        return eb.count - ea.count;
      });
    }

    function touchStreak(todayOverride) {
      var today = todayOverride || todayISO();
      return set(function (old) {
        return Object.assign({}, old, { streak: computeNextStreak(old.streak, today) });
      });
    }

    // ---- 匯出 / 匯入 ----

    function exportState() { return JSON.stringify(loadState(), null, 2); }

    function importState(json) {
      var parsed;
      try {
        parsed = JSON.parse(json);
      } catch (e) {
        throw new Error('LangStore.import: 無法解析 JSON — ' + e.message);
      }
      validateState(parsed);
      if (parsed.version !== STATE_VERSION) {
        throw new Error('LangStore.import: 不支援的 version（預期 ' + STATE_VERSION + '）');
      }
      if (parsed.lang && parsed.lang !== langCode) {
        throw new Error('LangStore.import: 這是「' + parsed.lang + '」的備份，不能匯入到「' + langCode + '」');
      }
      currentState = deepClone(parsed);
      persist(currentState);
      dispatchChange();
      return deepClone(currentState);
    }

    return {
      lang: langCode,
      storageKey: storageKey,
      get: get,
      set: set,
      reset: reset,
      export: exportState,
      import: importState,
      isPersistent: isPersistent,
      completeLesson: completeLesson,
      isLessonDone: isLessonDone,
      reviewCard: reviewCard,
      pickSession: pickSession,
      cardStats: cardStats,
      recordQuiz: recordQuiz,
      reviewWrong: reviewWrong,
      setWrongReason: setWrongReason,
      markWrongMastered: markWrongMastered,
      dueWrongIds: dueWrongIds,
      touchStreak: touchStreak,
      normalizeWrongEntry: normalizeWrongEntry,
      todayISO: todayISO,
      WRONG_REASONS: WRONG_REASONS.slice()
    };
  }

  /** LangStore.for('ja') — 取得該語言的狀態介面（同一語言重複呼叫回傳同一個 instance） */
  function forLang(langCode) {
    if (instances[langCode]) return instances[langCode];
    var meta = window.Platform && window.Platform.byCode(langCode);
    if (!meta) throw new Error('LangStore.for: 未知的語言 ' + langCode);
    if (meta.engine !== 'lang') {
      throw new Error('LangStore.for: 「' + langCode + '」使用 ' + meta.engine + ' 引擎，請改用對應的 Store');
    }
    instances[langCode] = createInstance(langCode, meta.storageKey);
    return instances[langCode];
  }

  window.LangStore = {
    for: forLang,
    STATE_VERSION: STATE_VERSION,
    WRONG_REASONS: WRONG_REASONS.slice()
  };
})(typeof window !== 'undefined' ? window : globalThis);
