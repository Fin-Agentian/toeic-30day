/**
 * js/app.js
 * App shell：hash router、導覽列同步、主題切換、頂欄倒數/Day 顯示。
 *
 * 多語言：路由清單與導覽列都由 window.Platform 驅動 —— 進到哪個語言的路由，
 * 側欄與底部 tab bar 就換成那個語言的項目；`#/hub` 是語言選擇入口，也是預設路由。
 * 頂欄的「距考試 N 天 / Day X/30」只對英語（TOEIC）有意義，其他語言改顯示連續天數。
 *
 * 暴露：window.App = { navigate, currentRoute, currentLang, registerView, start }
 * 依賴：window.Util（必要）、window.Platform（必要）、window.Store / window.LangStore（選用）
 */
(function () {
  'use strict';

  var TOTAL_DAYS = 30;
  var FALLBACK_ROUTES = ['hub', 'dashboard', 'plan', 'tips', 'quiz', 'reading',
    'listening', 'vocab', 'mock', 'review', 'settings'];

  function platform() {
    return window.Platform || null;
  }

  function routes() {
    var p = platform();
    return p ? p.allRoutes() : FALLBACK_ROUTES;
  }

  function defaultRoute() {
    var p = platform();
    return p ? p.HUB_ROUTE : 'dashboard';
  }

  /** 路由的中文名稱：先問 Platform 的 nav 表，找不到才退回硬編清單 */
  function routeLabel(name) {
    if (name === 'hub') return '選擇語言';
    var p = platform();
    if (p) {
      var langs = p.languages();
      for (var i = 0; i < langs.length; i++) {
        for (var j = 0; j < langs[i].nav.length; j++) {
          if (langs[i].nav[j].route === name) return langs[i].nav[j].label;
        }
      }
    }
    return name;
  }

  var THEME_ORDER = ['light', 'dark', 'auto'];
  var THEME_ICON = { light: '☀️', dark: '🌙', auto: '🌓' };
  var THEME_LABEL = { light: '淺色模式', dark: '深色模式', auto: '跟隨系統' };

  var currentView = null;
  var currentRouteName = null;
  var currentLangCode = null;
  var topbarTimer = null;
  var started = false;

  // -----------------------------------------------------------------
  // 防禦式存取 Store（A3 尚未提供時也不能讓 app.js 崩潰）
  // -----------------------------------------------------------------

  function hasStore() {
    return !!(window.Store && typeof window.Store.get === 'function');
  }

  function safeGetState() {
    if (hasStore()) {
      try {
        var state = window.Store.get();
        if (state) return state;
      } catch (e) {
        console.error('[App] Store.get() 失敗', e);
      }
    }
    var today = window.Util ? window.Util.todayISO() : new Date().toISOString().slice(0, 10);
    return {
      startDate: today,
      examDate: window.Util ? window.Util.addDays(today, TOTAL_DAYS) : today,
      settings: { theme: 'auto' }
    };
  }

  function safeSetTheme(theme) {
    if (hasStore() && typeof window.Store.set === 'function') {
      try {
        window.Store.set(function (old) {
          old = old || {};
          var oldSettings = old.settings || {};
          var newSettings = Object.assign({}, oldSettings, { theme: theme });
          return Object.assign({}, old, { settings: newSettings });
        });
        return;
      } catch (e) {
        console.error('[App] Store.set() 失敗', e);
      }
    }
    console.warn('[App] Store 尚未載入，主題僅套用於畫面，不會被保存');
  }

  // -----------------------------------------------------------------
  // 主題
  // -----------------------------------------------------------------

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'dark' || theme === 'light') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = THEME_ICON[theme] || THEME_ICON.auto;
      btn.setAttribute('aria-label', '目前主題：' + (THEME_LABEL[theme] || THEME_LABEL.auto) + '，點擊切換');
      btn.setAttribute('title', THEME_LABEL[theme] || THEME_LABEL.auto);
    }
  }

  function getCurrentTheme() {
    var state = safeGetState();
    return (state && state.settings && state.settings.theme) || 'auto';
  }

  function bindThemeToggle() {
    var btn = document.getElementById('themeToggle');
    applyTheme(getCurrentTheme());
    if (!btn) return;
    btn.addEventListener('click', function () {
      var current = getCurrentTheme();
      var idx = THEME_ORDER.indexOf(current);
      var next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      safeSetTheme(next);
      applyTheme(next);
    });
  }

  // -----------------------------------------------------------------
  // 頂欄：倒數天數 / Day X/30
  // -----------------------------------------------------------------

  /**
   * 頂欄右側的兩顆膠囊。英語（TOEIC）沿用「距考試 N 天 / Day X/30」；
   * 日西沒有考試日概念，改顯示「連續學習 N 天 / 待複習 N 題」；
   * 在 #/hub 則整組隱藏，因為那時還沒有「目前語言」。
   */
  function updateTopbar() {
    if (!window.Util) return;
    var countdownPill = document.getElementById('countdownPill');
    var dayPill = document.getElementById('dayPill');
    var countdownEl = document.getElementById('countdownText');
    var dayEl = document.getElementById('dayText');
    var brandName = document.getElementById('brandName');

    var p = platform();
    var lang = (p && currentLangCode) ? p.byCode(currentLangCode) : null;

    if (brandName) {
      brandName.textContent = lang ? (lang.flag + ' ' + lang.label) : '多語言學習平台';
    }

    // hub：沒有語言脈絡，隱藏兩顆膠囊
    if (!lang) {
      if (countdownPill) countdownPill.style.display = 'none';
      if (dayPill) dayPill.style.display = 'none';
      return;
    }
    if (countdownPill) countdownPill.style.display = '';
    if (dayPill) dayPill.style.display = '';

    if (lang.engine === 'toeic') {
      var state = safeGetState();
      var today = Util.todayISO();
      var examDate = (state && state.examDate) || Util.addDays(today, TOTAL_DAYS);
      var startDate = (state && state.startDate) || today;
      var daysLeft = Util.diffDays(today, examDate);
      var dayNum = Util.clamp(Util.diffDays(startDate, today) + 1, 1, TOTAL_DAYS);

      if (countdownEl) {
        if (daysLeft > 0) countdownEl.textContent = '距考試 ' + daysLeft + ' 天';
        else if (daysLeft === 0) countdownEl.textContent = '考試就是今天！';
        else countdownEl.textContent = '考試已結束';
      }
      if (dayEl) dayEl.textContent = 'Day ' + dayNum + '/' + TOTAL_DAYS;
      return;
    }

    // 日語 / 西班牙語
    try {
      var store = window.LangStore.for(lang.code);
      var s = store.get();
      if (countdownEl) countdownEl.textContent = '🔥 連續 ' + s.streak.current + ' 天';
      if (dayEl) dayEl.textContent = '待複習 ' + store.dueWrongIds().length + ' 題';
    } catch (e) {
      if (countdownEl) countdownEl.textContent = lang.label;
      if (dayEl) dayEl.textContent = lang.level || '';
    }
  }

  // -----------------------------------------------------------------
  // 導覽列：依目前語言重建側欄與底部 tab bar
  // -----------------------------------------------------------------

  function navLink(item, isTab) {
    var a = document.createElement('a');
    a.href = '#/' + item.route;
    a.setAttribute('data-route', item.route);
    if (isTab) a.className = 'tab-item';
    var icon = document.createElement('span');
    icon.className = isTab ? 'tab-icon' : 'nav-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon;
    var label = document.createElement('span');
    if (isTab) label.className = 'tab-label';
    label.textContent = item.label;
    a.appendChild(icon);
    a.appendChild(label);
    return a;
  }

  /** 側欄：語言的完整 nav；最上面固定一個「切換語言」回 hub */
  function rebuildSidebar(langCode) {
    var ul = document.querySelector('#sidebar .sidebar-nav');
    if (!ul) return;
    ul.innerHTML = '';

    var hubLi = document.createElement('li');
    hubLi.appendChild(navLink({ route: platform().HUB_ROUTE, label: '選擇語言', icon: '🌐' }, false));
    ul.appendChild(hubLi);

    var p = platform();
    var lang = langCode ? p.byCode(langCode) : null;
    if (!lang) return;

    var divider = document.createElement('li');
    divider.className = 'sidebar-divider';
    divider.setAttribute('aria-hidden', 'true');
    divider.textContent = lang.flag + ' ' + lang.label;
    ul.appendChild(divider);

    lang.nav.forEach(function (item) {
      var li = document.createElement('li');
      li.appendChild(navLink(item, false));
      ul.appendChild(li);
    });
  }

  /** 底部 tab bar：該語言標了 tab:true 的前 4 個 + 「更多」 */
  function rebuildTabbar(langCode) {
    var bar = document.querySelector('.bottom-tabbar');
    if (!bar) return;
    bar.innerHTML = '';

    var p = platform();
    if (!langCode) {
      // hub：只放一個「選擇語言」，避免空白 tab bar
      bar.appendChild(navLink({ route: p.HUB_ROUTE, label: '選擇語言', icon: '🌐' }, true));
      return;
    }

    p.tabItems(langCode).forEach(function (item) {
      bar.appendChild(navLink(item, true));
    });

    var moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.id = 'moreTabBtn';
    moreBtn.className = 'tab-item tab-item-more';
    var mIcon = document.createElement('span');
    mIcon.className = 'tab-icon';
    mIcon.setAttribute('aria-hidden', 'true');
    mIcon.textContent = '⋯';
    var mLabel = document.createElement('span');
    mLabel.className = 'tab-label';
    mLabel.textContent = '更多';
    moreBtn.appendChild(mIcon);
    moreBtn.appendChild(mLabel);
    bar.appendChild(moreBtn);
    bindMoreMenu(); // tab bar 每次重建，「更多」按鈕是新元素，要重新綁定
  }

  /** 語言變了才重建導覽列，同語言內切頁只更新 active 狀態 */
  function syncNavForLang(langCode) {
    if (currentLangCode === langCode) return;
    currentLangCode = langCode;
    rebuildSidebar(langCode);
    rebuildTabbar(langCode);
  }

  function updateNavActive(name) {
    if (!window.Util) return;
    Util.$$('[data-route]').forEach(function (el) {
      var isActive = el.getAttribute('data-route') === name;
      el.classList.toggle('is-active', isActive);
      if (el.tagName === 'A') {
        if (isActive) el.setAttribute('aria-current', 'page');
        else el.removeAttribute('aria-current');
      }
    });
  }

  // -----------------------------------------------------------------
  // 側欄（手機版抽屜）與「更多」選單
  // -----------------------------------------------------------------

  function bindSidebarToggle() {
    var toggleBtn = document.getElementById('sidebarToggle');
    var sidebar = document.getElementById('sidebar');
    var backdrop = document.getElementById('sidebarBackdrop');
    if (!toggleBtn || !sidebar) return;

    function setOpen(open) {
      sidebar.classList.toggle('is-open', open);
      if (backdrop) backdrop.classList.toggle('is-open', open);
      toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggleBtn.addEventListener('click', function () {
      setOpen(!sidebar.classList.contains('is-open'));
    });
    if (backdrop) {
      backdrop.addEventListener('click', function () {
        setOpen(false);
      });
    }
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a[data-route]')) setOpen(false);
    });
  }

  function bindMoreMenu() {
    var btn = document.getElementById('moreTabBtn');
    if (!btn || !window.Util) return;
    btn.addEventListener('click', function () {
      var p = platform();
      var items = (p && currentLangCode) ? p.moreItems(currentLangCode) : [];
      items = items.concat([{ route: p ? p.HUB_ROUTE : 'hub', label: '切換語言', icon: '🌐' }]);
      var closeModal = Util.modal({
        title: '更多功能',
        body: Util.h(
          'div',
          { class: 'more-menu' },
          items.map(function (r) {
            return Util.h(
              'button',
              {
                class: 'more-menu-item',
                onClick: function () {
                  navigate('#/' + r.route);
                  closeModal();
                }
              },
              Util.h('span', { class: 'more-menu-icon', 'aria-hidden': 'true' }, r.icon),
              Util.h('span', { class: 'more-menu-label' }, r.label)
            );
          })
        )
      });
    });
  }

  // -----------------------------------------------------------------
  // Route rendering
  // -----------------------------------------------------------------

  function renderMissingView(container, name) {
    container.appendChild(
      Util.h(
        'div',
        { class: 'empty-state' },
        Util.h('div', { class: 'empty-state-icon', 'aria-hidden': 'true' }, '🚧'),
        Util.h('h2', {}, '此頁面尚未完成'),
        Util.h('p', {}, '「' + routeLabel(name) + '」頁面正在準備中，請稍後再回來看看。'),
        Util.h(
          'button',
          {
            class: 'btn btn-primary',
            onClick: function () {
              // 回目前語言的首頁；還沒選語言就回入口
              var p = platform();
              var lang = (p && currentLangCode) ? p.byCode(currentLangCode) : null;
              navigate('#/' + (lang ? lang.home : defaultRoute()));
            }
          },
          '回首頁'
        )
      )
    );
  }

  function renderErrorView(container, name, err) {
    container.innerHTML = '';
    container.appendChild(
      Util.h(
        'div',
        { class: 'empty-state empty-state-error' },
        Util.h('div', { class: 'empty-state-icon', 'aria-hidden': 'true' }, '⚠️'),
        Util.h('h2', {}, '頁面發生錯誤'),
        Util.h('p', {}, '「' + routeLabel(name) + '」載入時發生問題，請重新整理頁面再試一次。'),
        Util.h(
          'button',
          {
            class: 'btn btn-primary',
            onClick: function () {
              window.location.reload();
            }
          },
          '重新整理'
        )
      )
    );
    console.error('[App] view render error @' + name, err);
  }

  function focusContainerNoScroll(container) {
    try {
      container.focus({ preventScroll: true });
    } catch (e) {
      container.focus();
    }
  }

  function renderRoute() {
    if (!window.Util) {
      console.error('[App] window.Util 未載入，無法啟動路由');
      return;
    }
    var parsed = Util.qs(window.location.hash);
    var name = parsed.route || defaultRoute();
    if (routes().indexOf(name) === -1) name = defaultRoute();

    var container = document.getElementById('view');
    if (!container) {
      console.error('[App] 找不到 #view 容器');
      return;
    }

    // 先切導覽列再渲染內容：進到某語言的路由就換成那個語言的側欄與 tab bar，
    // #/hub 則收起語言選單。同語言內換頁不會重建 DOM。
    var p = platform();
    var langCode = p ? p.langOfRoute(name) : null;
    syncNavForLang(langCode);
    if (langCode && p) p.rememberLang(langCode);

    if (currentView && typeof currentView.destroy === 'function') {
      try {
        currentView.destroy();
      } catch (e) {
        console.error('[App] destroy() 失敗 @' + currentRouteName, e);
      }
    }

    container.innerHTML = '';

    var view = window.Views && window.Views[name];
    if (!view || typeof view.render !== 'function') {
      renderMissingView(container, name);
      currentView = null;
      currentRouteName = name;
      updateNavActive(name);
      updateTopbar();
      focusContainerNoScroll(container);
      window.scrollTo(0, 0);
      return;
    }

    try {
      view.render(container, parsed.params);
      currentView = view;
    } catch (e) {
      renderErrorView(container, name, e);
      currentView = null;
    }

    currentRouteName = name;
    updateNavActive(name);
    updateTopbar();
    focusContainerNoScroll(container);
    window.scrollTo(0, 0);
  }

  // -----------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------

  function navigate(hash) {
    if (!hash) return;
    if (hash.charAt(0) !== '#') hash = '#' + hash;
    if (window.location.hash === hash) {
      renderRoute();
    } else {
      window.location.hash = hash;
    }
  }

  function currentRoute() {
    return currentRouteName;
  }

  function registerView(name, view) {
    window.Views = window.Views || {};
    window.Views[name] = view;
  }

  function showFatalError(err) {
    console.error('[App] start() 初始化失敗', err);
    var container = document.getElementById('view');
    if (!container) return;
    // 刻意不依賴 Util（初始化失敗時 Util 也可能尚未就緒），只用原生 DOM API
    container.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'empty-state empty-state-error';
    var icon = document.createElement('div');
    icon.className = 'empty-state-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⚠️';
    var h2 = document.createElement('h2');
    h2.textContent = '應用程式初始化失敗';
    var p = document.createElement('p');
    p.textContent = '很抱歉，頁面初始化時發生問題，請重新整理頁面再試一次。';
    var btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = '重新整理';
    btn.addEventListener('click', function () {
      window.location.reload();
    });
    wrap.appendChild(icon);
    wrap.appendChild(h2);
    wrap.appendChild(p);
    wrap.appendChild(btn);
    container.appendChild(wrap);
  }

  function start() {
    if (started) return;
    started = true;

    try {
      if (!document.getElementById('view')) {
        console.error('[App] 找不到 #view 容器，App 無法啟動');
        return;
      }

      window.addEventListener('hashchange', renderRoute);
      bindThemeToggle();
      bindSidebarToggle();
      bindMoreMenu();

      if (!window.location.hash) {
        window.location.hash = '#/' + defaultRoute();
      }
      renderRoute();
      updateTopbar();

      // 學習狀態變動（任一語言）時同步頂欄的連續天數／待複習題數
      window.addEventListener('lang:change', updateTopbar);
      window.addEventListener('toeic30:change', updateTopbar);

      if (topbarTimer) clearInterval(topbarTimer);
      topbarTimer = setInterval(updateTopbar, 60000);
    } catch (e) {
      try {
        showFatalError(e);
      } catch (e2) {
        console.error('[App] showFatalError() 亦失敗', e2);
      }
    }
  }

  function currentLang() {
    return currentLangCode;
  }

  window.App = {
    navigate: navigate,
    currentRoute: currentRoute,
    currentLang: currentLang,
    registerView: registerView,
    start: start
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
