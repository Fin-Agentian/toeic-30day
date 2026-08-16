/**
 * js/store.js — TOEIC 30 天衝刺平台
 * window.Store：localStorage 狀態讀寫、schema 驗證、匯出/匯入、領域便利方法。
 * 依 docs/DESIGN.md §6。不可變更新（set 一律回傳新物件）。
 * 純 IIFE，不用 ES modules。無 fetch。
 */
(function (window) {
  'use strict';

  var STORAGE_KEY = 'toeic30:state';
  var STATE_VERSION = 1;
  var TOTAL_DAYS = 30;
  var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var QUIZ_MODES = ['quiz', 'listening', 'mock'];

  // ---- 記憶體 fallback（node / localStorage 不可用或受限環境時）----
  var memoryRaw = null;
  var currentState = null;
  var forcedMemoryMode = false;
  var warnedMemoryFallback = false;

  function warnMemoryFallbackOnce() {
    if (warnedMemoryFallback) return;
    warnedMemoryFallback = true;
    try {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('無法使用 localStorage，進度只保留在本次頁面');
      }
    } catch (e) {
      // 忽略沒有 console 的環境
    }
  }

  function switchToMemoryMode() {
    forcedMemoryMode = true;
    warnMemoryFallbackOnce();
  }

  // ---- 小工具 ----
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

  function diffDaysISO(aISO, bISO) {
    var msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((parseISODateUTC(bISO) - parseISODateUTC(aISO)) / msPerDay);
  }

  function isPlainObject(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
  }

  function deepClone(obj) {
    if (obj === undefined) return obj;
    return JSON.parse(JSON.stringify(obj));
  }

  // ---- localStorage 存取（含 node 記憶體 fallback；沙箱 iframe / 隱私模式下存取
  //      window.localStorage 本身或呼叫 getItem/setItem 都可能丟 SecurityError /
  //      QuotaExceededError，任一失敗即永久切換到記憶體模式，只 warn 一次，不拋錯）----
  function tryGetLocalStorage() {
    if (forcedMemoryMode) return null;
    try {
      if (typeof window === 'undefined' || !('localStorage' in window)) {
        switchToMemoryMode();
        return null;
      }
      var ls = window.localStorage;
      if (!ls || typeof ls.getItem !== 'function' || typeof ls.setItem !== 'function') {
        switchToMemoryMode();
        return null;
      }
      // 探測：部分沙箱環境屬性存在，但實際呼叫方法時才丟錯
      ls.getItem(STORAGE_KEY);
      return ls;
    } catch (e) {
      switchToMemoryMode();
      return null;
    }
  }

  function readRaw() {
    var ls = tryGetLocalStorage();
    if (ls) {
      try {
        return ls.getItem(STORAGE_KEY);
      } catch (e) {
        switchToMemoryMode();
        return memoryRaw;
      }
    }
    return memoryRaw;
  }

  function writeRaw(str) {
    var ls = tryGetLocalStorage();
    if (ls) {
      try {
        ls.setItem(STORAGE_KEY, str);
        return;
      } catch (e) {
        // 寫入失敗（配額等）→ 永久切換到記憶體，不中斷流程
        switchToMemoryMode();
      }
    }
    memoryRaw = str;
  }

  function isPersistent() {
    return !!tryGetLocalStorage();
  }

  // ---- schema ----
  function defaultState() {
    return {
      version: STATE_VERSION,
      startDate: todayISO(),
      examDate: '2026-09-20',
      dailyMinutes: 90,
      completedTasks: {},
      tipsMastered: {},
      quizHistory: [],
      wrongBook: {},
      vocab: {},
      streak: { current: 0, best: 0, lastActive: null },
      settings: { ttsRate: 1.0, ttsVoice: '', theme: 'light' }
    };
  }

  function validateState(state) {
    if (!isPlainObject(state)) {
      throw new Error('Store: state 必須是物件');
    }
    if (typeof state.version !== 'number') {
      throw new Error('Store: 缺少或錯誤的 version');
    }
    if (typeof state.startDate !== 'string' || !ISO_DATE_RE.test(state.startDate)) {
      throw new Error('Store: startDate 格式錯誤（需 YYYY-MM-DD）');
    }
    if (typeof state.examDate !== 'string' || !ISO_DATE_RE.test(state.examDate)) {
      throw new Error('Store: examDate 格式錯誤（需 YYYY-MM-DD）');
    }
    if (typeof state.dailyMinutes !== 'number') {
      throw new Error('Store: dailyMinutes 必須是數字');
    }
    if (!isPlainObject(state.completedTasks)) {
      throw new Error('Store: completedTasks 必須是物件');
    }
    if (!isPlainObject(state.tipsMastered)) {
      throw new Error('Store: tipsMastered 必須是物件');
    }
    if (!Array.isArray(state.quizHistory)) {
      throw new Error('Store: quizHistory 必須是陣列');
    }
    if (!isPlainObject(state.wrongBook)) {
      throw new Error('Store: wrongBook 必須是物件');
    }
    if (!isPlainObject(state.vocab)) {
      throw new Error('Store: vocab 必須是物件');
    }
    if (!isPlainObject(state.streak) ||
        typeof state.streak.current !== 'number' ||
        typeof state.streak.best !== 'number') {
      throw new Error('Store: streak 格式錯誤');
    }
    if (!isPlainObject(state.settings) || typeof state.settings.ttsRate !== 'number') {
      throw new Error('Store: settings 格式錯誤');
    }
  }

  function validateQuizPayload(payload) {
    if (!isPlainObject(payload)) {
      throw new Error('Store.recordQuiz: payload 必須是物件');
    }
    if (QUIZ_MODES.indexOf(payload.mode) === -1) {
      throw new Error('Store.recordQuiz: mode 必須是 quiz/listening/mock 之一');
    }
    if (typeof payload.total !== 'number' || payload.total < 0) {
      throw new Error('Store.recordQuiz: total 必須是非負數字');
    }
    if (typeof payload.correct !== 'number' || payload.correct < 0) {
      throw new Error('Store.recordQuiz: correct 必須是非負數字');
    }
    if (typeof payload.seconds !== 'number' || payload.seconds < 0) {
      throw new Error('Store.recordQuiz: seconds 必須是非負數字');
    }
    if (payload.wrongIds !== undefined && !Array.isArray(payload.wrongIds)) {
      throw new Error('Store.recordQuiz: wrongIds 必須是陣列');
    }
  }

  // ---- load / persist ----
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
      // 資料損毀 → 退回預設值，不中斷應用程式
      currentState = defaultState();
      persist(currentState);
    }
    return currentState;
  }

  function persist(state) {
    try {
      writeRaw(JSON.stringify(state));
    } catch (e) {
      // 寫入失敗，狀態仍保留在記憶體中，不拋出
    }
  }

  function dispatchChange() {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    var detail = deepClone(currentState);
    var evt;
    try {
      var CE = window.CustomEvent || (typeof CustomEvent !== 'undefined' ? CustomEvent : null);
      evt = CE ? new CE('toeic30:change', { detail: detail }) : { type: 'toeic30:change', detail: detail };
    } catch (e) {
      evt = { type: 'toeic30:change', detail: detail };
    }
    try {
      window.dispatchEvent(evt);
    } catch (e) {
      // 忽略非 DOM 環境的錯誤
    }
  }

  // ---- 核心 API ----
  function get() {
    return deepClone(loadState());
  }

  function set(patchFn) {
    if (typeof patchFn !== 'function') {
      throw new Error('Store.set: patchFn 必須是函式');
    }
    var old = deepClone(loadState());
    var next = patchFn(old);
    validateState(next);
    currentState = deepClone(next);
    persist(currentState);
    dispatchChange();
    return deepClone(currentState);
  }

  function setIn(obj, keys, value) {
    if (keys.length === 0) return value;
    var key = keys[0];
    var rest = keys.slice(1);
    var currentVal = obj ? obj[key] : undefined;
    var newVal = rest.length === 0
      ? value
      : setIn(isPlainObject(currentVal) || Array.isArray(currentVal) ? currentVal : {}, rest, value);
    if (Array.isArray(obj)) {
      var arrCopy = obj.slice();
      arrCopy[key] = newVal;
      return arrCopy;
    }
    var copy = Object.assign({}, obj);
    copy[key] = newVal;
    return copy;
  }

  function update(path, value) {
    var keys = Array.isArray(path) ? path.slice() : String(path).split('.');
    if (keys.length === 0) {
      throw new Error('Store.update: path 不可為空');
    }
    return set(function (old) {
      return setIn(old, keys, value);
    });
  }

  function exportState() {
    return JSON.stringify(loadState(), null, 2);
  }

  function importState(json) {
    var parsed;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      throw new Error('Store.import: 無法解析 JSON — ' + e.message);
    }
    validateState(parsed);
    if (parsed.version !== STATE_VERSION) {
      throw new Error('Store.import: 不支援的 version（預期 ' + STATE_VERSION + '，收到 ' + parsed.version + '）');
    }
    currentState = deepClone(parsed);
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

  // ---- 領域便利方法 ----
  function completeTask(id) {
    if (!id) {
      throw new Error('Store.completeTask: id 為必填');
    }
    return set(function (old) {
      var completedTasks = Object.assign({}, old.completedTasks);
      completedTasks[id] = new Date().toISOString();
      return Object.assign({}, old, { completedTasks: completedTasks });
    });
  }

  function isTaskDone(id) {
    var state = get();
    return !!(state.completedTasks && state.completedTasks[id]);
  }

  function computeNextStreak(streak, today) {
    var current = streak && typeof streak.current === 'number' ? streak.current : 0;
    var best = streak && typeof streak.best === 'number' ? streak.best : 0;
    var lastActive = (streak && streak.lastActive) || null;

    if (lastActive === today) {
      return { current: current, best: best, lastActive: lastActive };
    }
    var yesterday = addDaysISO(today, -1);
    if (lastActive === yesterday) {
      current = current + 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    return { current: current, best: best, lastActive: today };
  }

  function touchStreak(todayOverride) {
    var today = todayOverride || todayISO();
    return set(function (old) {
      return Object.assign({}, old, { streak: computeNextStreak(old.streak, today) });
    });
  }

  function recordQuiz(payload, todayOverride) {
    validateQuizPayload(payload);
    var wrongIds = Array.isArray(payload.wrongIds) ? payload.wrongIds.slice() : [];
    var nowIso = new Date().toISOString();
    var today = todayOverride || todayISO();

    return set(function (old) {
      var entry = {
        at: nowIso,
        mode: payload.mode,
        part: payload.part || '',
        total: payload.total,
        correct: payload.correct,
        seconds: payload.seconds,
        wrongIds: wrongIds
      };
      var quizHistory = old.quizHistory.concat([entry]);

      var wrongBook = Object.assign({}, old.wrongBook);
      wrongIds.forEach(function (id) {
        var existing = wrongBook[id] || { count: 0, lastAt: null, mastered: false };
        wrongBook[id] = {
          count: existing.count + 1,
          lastAt: nowIso,
          mastered: false
        };
      });

      var streak = computeNextStreak(old.streak, today);

      return Object.assign({}, old, {
        quizHistory: quizHistory,
        wrongBook: wrongBook,
        streak: streak
      });
    });
  }

  function markWrongMastered(id) {
    if (!id) {
      throw new Error('Store.markWrongMastered: id 為必填');
    }
    return set(function (old) {
      var existing = old.wrongBook[id] || { count: 0, lastAt: null, mastered: false };
      var wrongBook = Object.assign({}, old.wrongBook);
      wrongBook[id] = Object.assign({}, existing, { mastered: true });
      return Object.assign({}, old, { wrongBook: wrongBook });
    });
  }

  function getDayIndex(dateISO) {
    var state = loadState();
    var d = dateISO || todayISO();
    var idx = diffDaysISO(state.startDate, d) + 1;
    if (idx < 1) return 0;
    if (idx > TOTAL_DAYS) return TOTAL_DAYS;
    return idx;
  }

  function daysToExam(dateISO) {
    var state = loadState();
    var d = dateISO || todayISO();
    return diffDaysISO(d, state.examDate);
  }

  window.Store = {
    get: get,
    set: set,
    update: update,
    export: exportState,
    import: importState,
    reset: reset,
    completeTask: completeTask,
    isTaskDone: isTaskDone,
    recordQuiz: recordQuiz,
    markWrongMastered: markWrongMastered,
    touchStreak: touchStreak,
    getDayIndex: getDayIndex,
    daysToExam: daysToExam,
    isPersistent: isPersistent
  };
})(typeof window !== 'undefined' ? window : globalThis);
