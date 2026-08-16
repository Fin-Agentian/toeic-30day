/**
 * js/store.js — TOEIC 30 天衝刺平台
 * window.Store：localStorage 狀態讀寫、schema 驗證、匯出/匯入、領域便利方法。
 * 依 docs/DESIGN.md §6。不可變更新（set 一律回傳新物件）。
 * 純 IIFE，不用 ES modules。無 fetch。
 */
(function (window) {
  'use strict';

  var STORAGE_KEY = 'toeic30:state';
  var STATE_VERSION = 2;
  var TOTAL_DAYS = 30;
  var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var QUIZ_MODES = ['quiz', 'listening', 'mock'];

  // 錯題 Leitner 排程：box 1..5，index = box - 1，單位為天。
  // 比單字 SRS 更密（30 天衝刺內要讓錯題至少再遇到 2–3 次），box 5 視為精通。
  var WRONG_INTERVAL_DAYS = [1, 2, 4, 7, 14];
  var WRONG_MAX_BOX = 5;

  // 錯因分類（review 三層檢討法用）：''（未標記）或以下五種
  var WRONG_REASONS = ['vocab', 'grammar', 'misread', 'time', 'guess'];

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

  /**
   * normalizeWrongId(id) — 統一 P6/P7 子題 key 為 `<groupId>-q<n>`。
   * 舊版 quiz.js 寫入的是 `p6-001-2` / `p7-001-1`（缺 q），而 mock.js、listening.js
   * 與 review.js 都用 `-q<n>`，導致這些錯題在錯題本查不到題目。此函式同時供
   * migration 與 recordQuiz 寫入前使用，確保新舊資料都落在同一格式。
   */
  function normalizeWrongId(id) {
    var s = String(id || '');
    var m = /^(p[67]-\d+)-(\d+)$/.exec(s);
    return m ? (m[1] + '-q' + m[2]) : s;
  }

  /** 錯題 Leitner：依 box 算下次到期日 */
  function wrongDueFrom(box, today) {
    var idx = Math.max(1, Math.min(WRONG_MAX_BOX, box)) - 1;
    return addDaysISO(today, WRONG_INTERVAL_DAYS[idx]);
  }

  /** 補齊錯題項目缺少的欄位（box / due / reason / reviews / rights） */
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
      readingStats: {},
      vocab: {},
      streak: { current: 0, best: 0, lastActive: null },
      settings: { ttsRate: 1.0, ttsVoice: '', theme: 'light' }
    };
  }

  /**
   * migrate(state) — 把舊版 state 就地升級到 STATE_VERSION，回傳新物件。
   * v1 → v2：
   *   1. wrongBook / quizHistory.wrongIds 的 P6/P7 子題 key 補上 `q`（見 normalizeWrongId）
   *   2. wrongBook 每筆補上 Leitner 欄位（box/due/reason/reviews/rights）
   *   3. 新增 readingStats（依考點累積正確率與秒數）
   * 無法辨識的 version（例如未來版本或損毀）交由 loadState 的 try/catch 退回預設值。
   */
  function migrate(state) {
    if (!isPlainObject(state)) return state;
    var version = typeof state.version === 'number' ? state.version : 0;
    if (version >= STATE_VERSION) return state;

    var today = todayISO();
    var next = Object.assign({}, state);

    if (version < 2) {
      var oldBook = isPlainObject(state.wrongBook) ? state.wrongBook : {};
      var newBook = {};
      Object.keys(oldBook).forEach(function (rawId) {
        var id = normalizeWrongId(rawId);
        var incoming = normalizeWrongEntry(oldBook[rawId], today);
        var existing = newBook[id];
        // 正規化後可能與既有 key 相撞（舊 `p6-001-2` 與新 `p6-001-q2` 並存）→ 合併
        newBook[id] = existing
          ? Object.assign({}, existing, {
            count: existing.count + incoming.count,
            lastAt: (existing.lastAt || '') > (incoming.lastAt || '') ? existing.lastAt : incoming.lastAt,
            mastered: existing.mastered && incoming.mastered,
            box: Math.min(existing.box, incoming.box),
            due: (existing.due || today) < (incoming.due || today) ? existing.due : incoming.due,
            reason: existing.reason || incoming.reason,
            reviews: existing.reviews + incoming.reviews,
            rights: existing.rights + incoming.rights
          })
          : incoming;
      });
      next.wrongBook = newBook;

      next.quizHistory = (Array.isArray(state.quizHistory) ? state.quizHistory : []).map(function (entry) {
        if (!isPlainObject(entry) || !Array.isArray(entry.wrongIds)) return entry;
        return Object.assign({}, entry, { wrongIds: entry.wrongIds.map(normalizeWrongId) });
      });

      if (!isPlainObject(next.readingStats)) next.readingStats = {};
    }

    next.version = STATE_VERSION;
    return next;
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
    if (!isPlainObject(state.readingStats)) {
      throw new Error('Store: readingStats 必須是物件');
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
    if (payload.skillStats !== undefined && !Array.isArray(payload.skillStats)) {
      throw new Error('Store.recordQuiz: skillStats 必須是陣列');
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
      var parsed = migrate(JSON.parse(raw));
      validateState(parsed);
      if (parsed.version !== STATE_VERSION) {
        throw new Error('Store: 不支援的 version ' + parsed.version);
      }
      currentState = parsed;
      persist(currentState); // 升級後立即寫回，避免每次載入都重跑 migration
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
    var received = isPlainObject(parsed) && typeof parsed.version === 'number' ? parsed.version : '（未知）';
    // 舊版備份（v1）先升級再驗證，讓使用者換版本後仍能還原進度
    parsed = migrate(parsed);
    validateState(parsed);
    if (parsed.version !== STATE_VERSION) {
      throw new Error('Store.import: 不支援的 version（預期 ' + STATE_VERSION + '，收到 ' + received + '）');
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

  /**
   * recordQuiz(payload) — 記錄一次作答。
   * payload: { mode, part, total, correct, seconds, wrongIds?, skillStats? }
   *   skillStats: [{ key: 'P5:prep'|'P6:sentence'|'P7:inference', correct: boolean, seconds: number }]
   *   → 累積到 state.readingStats，供閱讀診斷室（Reading.diagnose）算各考點正確率與配速。
   * 錯題一律回到 box 1（今天到期），並取消先前的「已精通」標記。
   */
  function recordQuiz(payload, todayOverride) {
    validateQuizPayload(payload);
    var wrongIds = (Array.isArray(payload.wrongIds) ? payload.wrongIds : []).map(normalizeWrongId);
    var skillStats = Array.isArray(payload.skillStats) ? payload.skillStats : [];
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
        var existing = normalizeWrongEntry(wrongBook[id], today);
        wrongBook[id] = Object.assign({}, existing, {
          count: existing.count + 1,
          lastAt: nowIso,
          mastered: false,
          box: 1,
          due: today
        });
      });

      var readingStats = Object.assign({}, old.readingStats);
      skillStats.forEach(function (s) {
        if (!s || typeof s.key !== 'string' || !s.key) return;
        var prev = readingStats[s.key] || { total: 0, correct: 0, seconds: 0 };
        readingStats[s.key] = {
          total: prev.total + 1,
          correct: prev.correct + (s.correct ? 1 : 0),
          seconds: prev.seconds + (typeof s.seconds === 'number' && s.seconds > 0 ? Math.round(s.seconds) : 0)
        };
      });

      var streak = computeNextStreak(old.streak, today);

      return Object.assign({}, old, {
        quizHistory: quizHistory,
        wrongBook: wrongBook,
        readingStats: readingStats,
        streak: streak
      });
    });
  }

  function markWrongMastered(id) {
    if (!id) {
      throw new Error('Store.markWrongMastered: id 為必填');
    }
    var today = todayISO();
    return set(function (old) {
      var existing = normalizeWrongEntry(old.wrongBook[normalizeWrongId(id)], today);
      var wrongBook = Object.assign({}, old.wrongBook);
      wrongBook[normalizeWrongId(id)] = Object.assign({}, existing, {
        mastered: true,
        box: WRONG_MAX_BOX,
        due: wrongDueFrom(WRONG_MAX_BOX, today)
      });
      return Object.assign({}, old, { wrongBook: wrongBook });
    });
  }

  /**
   * reviewWrong(id, correct) — 錯題本重做一題後更新 Leitner 排程。
   * 答對 → box +1（到 5 即自動標記精通）；答錯 → 退回 box 1，明天再見。
   */
  function reviewWrong(id, correct, todayOverride) {
    if (!id) {
      throw new Error('Store.reviewWrong: id 為必填');
    }
    var today = todayOverride || todayISO();
    var key = normalizeWrongId(id);
    return set(function (old) {
      var existing = normalizeWrongEntry(old.wrongBook[key], today);
      var nextBox = correct ? Math.min(WRONG_MAX_BOX, existing.box + 1) : 1;
      var wrongBook = Object.assign({}, old.wrongBook);
      wrongBook[key] = Object.assign({}, existing, {
        box: nextBox,
        due: wrongDueFrom(nextBox, today),
        mastered: nextBox >= WRONG_MAX_BOX,
        reviews: existing.reviews + 1,
        rights: existing.rights + (correct ? 1 : 0)
      });
      return Object.assign({}, old, { wrongBook: wrongBook });
    });
  }

  /**
   * setWrongReason(id, reason) — 標記錯因（三層檢討法第一層：先分類為什麼錯）。
   * reason 需為 WRONG_REASONS 之一，傳空字串可清除標記。
   */
  function setWrongReason(id, reason) {
    if (!id) {
      throw new Error('Store.setWrongReason: id 為必填');
    }
    var r = reason || '';
    if (r && WRONG_REASONS.indexOf(r) === -1) {
      throw new Error('Store.setWrongReason: 未知的錯因 ' + r);
    }
    var today = todayISO();
    var key = normalizeWrongId(id);
    return set(function (old) {
      var existing = normalizeWrongEntry(old.wrongBook[key], today);
      var wrongBook = Object.assign({}, old.wrongBook);
      wrongBook[key] = Object.assign({}, existing, { reason: r });
      return Object.assign({}, old, { wrongBook: wrongBook });
    });
  }

  /**
   * flagWrong(id, reason) — 手動把一題丟進錯題本（不經過 recordQuiz）。
   * 用於「這題我猜對的」：正確率會騙人，蒙對的題目一樣要排進複習佇列。
   */
  function flagWrong(id, reason) {
    if (!id) {
      throw new Error('Store.flagWrong: id 為必填');
    }
    var r = reason || '';
    if (r && WRONG_REASONS.indexOf(r) === -1) {
      throw new Error('Store.flagWrong: 未知的錯因 ' + r);
    }
    var today = todayISO();
    var nowIso = new Date().toISOString();
    var key = normalizeWrongId(id);
    return set(function (old) {
      var existing = normalizeWrongEntry(old.wrongBook[key], today);
      var wrongBook = Object.assign({}, old.wrongBook);
      wrongBook[key] = Object.assign({}, existing, {
        count: Math.max(1, existing.count),
        lastAt: nowIso,
        mastered: false,
        box: 1,
        due: today,
        reason: r || existing.reason
      });
      return Object.assign({}, old, { wrongBook: wrongBook });
    });
  }

  /** dueWrongIds(today) — 今天（含逾期）該複習、且尚未精通的錯題 id，早到期的排前面 */
  function dueWrongIds(todayOverride) {
    var today = todayOverride || todayISO();
    var wb = loadState().wrongBook || {};
    return Object.keys(wb)
      .filter(function (id) {
        var e = normalizeWrongEntry(wb[id], today);
        return !e.mastered && (e.due || today) <= today;
      })
      .sort(function (a, b) {
        var da = normalizeWrongEntry(wb[a], today).due;
        var db = normalizeWrongEntry(wb[b], today).due;
        if (da !== db) return da < db ? -1 : 1;
        return normalizeWrongEntry(wb[b], today).count - normalizeWrongEntry(wb[a], today).count;
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
    reviewWrong: reviewWrong,
    setWrongReason: setWrongReason,
    flagWrong: flagWrong,
    dueWrongIds: dueWrongIds,
    normalizeWrongId: normalizeWrongId,
    normalizeWrongEntry: normalizeWrongEntry,
    touchStreak: touchStreak,
    getDayIndex: getDayIndex,
    daysToExam: daysToExam,
    isPersistent: isPersistent,
    WRONG_REASONS: WRONG_REASONS.slice(),
    STATE_VERSION: STATE_VERSION
  };
})(typeof window !== 'undefined' ? window : globalThis);
