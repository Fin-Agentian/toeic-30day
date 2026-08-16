/**
 * js/platform.js — 多語言學習平台的語言註冊表
 *
 * window.Platform：定義平台上有哪些語言、各自的路由、TTS 語言碼與儲存命名空間。
 * 純資料 + 查詢函式，不碰 DOM、不讀寫 localStorage。
 *
 * 設計原則：
 * - 英語（TOEIC）沿用既有的 window.Store 與 'toeic30:state'，**完全不動**，
 *   使用者既有的學習進度零風險；日語／西班牙語各自有獨立命名空間（LangStore）。
 * - 每個語言宣告自己的路由清單，app.js 依「目前所在語言」切換側欄與底部 tab bar。
 * - 新增語言只要在 LANGUAGES 加一筆 + 提供對應的 views，不需要改 app.js。
 */
(function (window) {
  'use strict';

  var LANGUAGES = [
    {
      code: 'en',
      label: '多益英語',
      shortLabel: 'TOEIC',
      native: 'English',
      flag: '🇬🇧',
      accent: '#3B5BDB',
      ttsLang: 'en-US',
      engine: 'toeic',              // 用既有的 window.Store
      storageKey: 'toeic30:state',
      home: 'dashboard',
      tagline: '30 天衝刺：閱讀診斷、聽力、單字 SRS、模考與錯題本',
      level: '目標 700+',
      nav: [
        { route: 'dashboard', label: '儀表板', icon: '📊', tab: true },
        { route: 'plan', label: '30 天計畫', icon: '📅', tab: true },
        { route: 'tips', label: '技巧庫', icon: '💡' },
        { route: 'quiz', label: '閱讀做題', icon: '✏️', tab: true },
        { route: 'reading', label: '閱讀診斷室', icon: '📈', tab: true },
        { route: 'listening', label: '聽力練習', icon: '🎧' },
        { route: 'vocab', label: '單字卡', icon: '📚' },
        { route: 'mock', label: '迷你模考', icon: '🎯' },
        { route: 'review', label: '錯題本', icon: '🔁' },
        { route: 'settings', label: '設定', icon: '⚙️' }
      ]
    },
    {
      code: 'ja',
      label: '日本語',
      shortLabel: '日語',
      native: '日本語',
      flag: '🇯🇵',
      accent: '#D6336C',
      ttsLang: 'ja-JP',
      engine: 'lang',               // 用 window.LangStore
      storageKey: 'lang:ja:state',
      home: 'ja',
      tagline: '從零開始：五十音 → N5 單字文法',
      level: '入門 → N5',
      nav: [
        { route: 'ja', label: '學習總覽', icon: '🏠', tab: true },
        { route: 'ja-kana', label: '五十音', icon: '🈁', tab: true },
        { route: 'ja-vocab', label: 'N5 單字', icon: '📚', tab: true },
        { route: 'ja-grammar', label: 'N5 文法', icon: '📐', tab: true },
        { route: 'ja-quiz', label: '綜合測驗', icon: '✏️' },
        { route: 'ja-review', label: '錯題本', icon: '🔁' }
      ]
    },
    {
      code: 'es',
      label: 'Español',
      shortLabel: '西語',
      native: 'Español',
      flag: '🇪🇸',
      accent: '#E8590C',
      ttsLang: 'es-ES',
      engine: 'lang',
      storageKey: 'lang:es:state',
      home: 'es',
      tagline: '從零開始：發音規則 → 動詞變位 → 常用句型',
      level: '入門 → A1',
      nav: [
        { route: 'es', label: '學習總覽', icon: '🏠', tab: true },
        { route: 'es-sounds', label: '發音規則', icon: '🔤', tab: true },
        { route: 'es-verbs', label: '動詞變位', icon: '🔀', tab: true },
        { route: 'es-vocab', label: 'A1 單字', icon: '📚', tab: true },
        { route: 'es-phrases', label: '常用句型', icon: '💬' },
        { route: 'es-quiz', label: '綜合測驗', icon: '✏️' },
        { route: 'es-review', label: '錯題本', icon: '🔁' }
      ]
    }
  ];

  var HUB_ROUTE = 'hub';
  var LAST_LANG_KEY = 'platform:lastLang';

  // route → 語言 code 的反查表（建構一次）
  var ROUTE_TO_LANG = {};
  LANGUAGES.forEach(function (lang) {
    lang.nav.forEach(function (item) {
      ROUTE_TO_LANG[item.route] = lang.code;
    });
  });

  function languages() {
    return LANGUAGES.slice();
  }

  function byCode(code) {
    for (var i = 0; i < LANGUAGES.length; i++) {
      if (LANGUAGES[i].code === code) return LANGUAGES[i];
    }
    return null;
  }

  /** langOfRoute('ja-kana') → 'ja'；'hub' 或未知路由 → null */
  function langOfRoute(route) {
    return ROUTE_TO_LANG[route] || null;
  }

  /** 該語言的所有路由名稱，供 app.js 組 ROUTES 白名單 */
  function allRoutes() {
    var out = [HUB_ROUTE];
    LANGUAGES.forEach(function (lang) {
      lang.nav.forEach(function (item) {
        if (out.indexOf(item.route) === -1) out.push(item.route);
      });
    });
    return out;
  }

  /** 底部 tab bar 要顯示的項目（標了 tab:true 的，最多 4 個 + 「更多」） */
  function tabItems(code) {
    var lang = byCode(code);
    if (!lang) return [];
    return lang.nav.filter(function (i) { return i.tab; }).slice(0, 4);
  }

  /** 側欄放不下 / 不在 tab bar 的項目，收進「更多」選單 */
  function moreItems(code) {
    var lang = byCode(code);
    if (!lang) return [];
    var tabs = tabItems(code).map(function (i) { return i.route; });
    return lang.nav.filter(function (i) { return tabs.indexOf(i.route) === -1; });
  }

  // ---- 記住上次選的語言（純便利功能，讀寫失敗一律安靜略過）----

  function rememberLang(code) {
    try {
      if (window.localStorage) window.localStorage.setItem(LAST_LANG_KEY, code);
    } catch (e) {
      // 隱私模式 / 沙箱：記不住就算了，不影響功能
    }
  }

  function lastLang() {
    try {
      if (!window.localStorage) return null;
      var v = window.localStorage.getItem(LAST_LANG_KEY);
      return byCode(v) ? v : null;
    } catch (e) {
      return null;
    }
  }

  window.Platform = {
    HUB_ROUTE: HUB_ROUTE,
    languages: languages,
    byCode: byCode,
    langOfRoute: langOfRoute,
    allRoutes: allRoutes,
    tabItems: tabItems,
    moreItems: moreItems,
    rememberLang: rememberLang,
    lastLang: lastLang
  };
})(typeof window !== 'undefined' ? window : globalThis);
