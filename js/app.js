/**
 * js/app.js
 * App shell：hash router、導覽列同步、主題切換、頂欄倒數/Day 顯示。
 * 暴露：window.App = { navigate, currentRoute, registerView, start }
 * 依賴：window.Util（必要）、window.Store（選用，defensively 處理缺席情況）
 */
(function () {
  'use strict';

  var ROUTES = ['dashboard', 'plan', 'tips', 'quiz', 'reading', 'listening', 'vocab', 'mock', 'review', 'settings'];
  var DEFAULT_ROUTE = 'dashboard';
  var TOTAL_DAYS = 30;

  var ROUTE_LABELS = {
    dashboard: '儀表板',
    plan: '30 天計畫',
    tips: '技巧庫',
    quiz: '閱讀做題',
    reading: '閱讀診斷室',
    listening: '聽力練習',
    vocab: '單字卡',
    mock: '迷你模考',
    review: '錯題本',
    settings: '設定'
  };

  // 底部 tab bar 放不下的路由，收進「更多」選單
  var MORE_ROUTES = [
    { route: 'tips', label: '技巧庫', icon: '💡' },
    { route: 'vocab', label: '單字卡', icon: '📚' },
    { route: 'listening', label: '聽力練習', icon: '🎧' },
    { route: 'mock', label: '迷你模考', icon: '🎯' },
    { route: 'review', label: '錯題本', icon: '🔁' },
    { route: 'settings', label: '設定', icon: '⚙️' }
  ];

  var THEME_ORDER = ['light', 'dark', 'auto'];
  var THEME_ICON = { light: '☀️', dark: '🌙', auto: '🌓' };
  var THEME_LABEL = { light: '淺色模式', dark: '深色模式', auto: '跟隨系統' };

  var currentView = null;
  var currentRouteName = null;
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

  function updateTopbar() {
    if (!window.Util) return;
    var state = safeGetState();
    var today = Util.todayISO();
    var examDate = (state && state.examDate) || Util.addDays(today, TOTAL_DAYS);
    var startDate = (state && state.startDate) || today;

    var daysLeft = Util.diffDays(today, examDate);
    var dayNum = Util.clamp(Util.diffDays(startDate, today) + 1, 1, TOTAL_DAYS);

    var countdownEl = document.getElementById('countdownText');
    var dayEl = document.getElementById('dayText');

    if (countdownEl) {
      if (daysLeft > 0) countdownEl.textContent = '距考試 ' + daysLeft + ' 天';
      else if (daysLeft === 0) countdownEl.textContent = '考試就是今天！';
      else countdownEl.textContent = '考試已結束';
    }
    if (dayEl) {
      dayEl.textContent = 'Day ' + dayNum + '/' + TOTAL_DAYS;
    }
  }

  // -----------------------------------------------------------------
  // 導覽列 active 狀態
  // -----------------------------------------------------------------

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
      var closeModal = Util.modal({
        title: '更多功能',
        body: Util.h(
          'div',
          { class: 'more-menu' },
          MORE_ROUTES.map(function (r) {
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

  function routeLabel(name) {
    return ROUTE_LABELS[name] || name;
  }

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
              navigate('#/dashboard');
            }
          },
          '回儀表板'
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
    var name = parsed.route || DEFAULT_ROUTE;
    if (ROUTES.indexOf(name) === -1) name = DEFAULT_ROUTE;

    var container = document.getElementById('view');
    if (!container) {
      console.error('[App] 找不到 #view 容器');
      return;
    }

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
        window.location.hash = '#/' + DEFAULT_ROUTE;
      }
      renderRoute();
      updateTopbar();

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

  window.App = {
    navigate: navigate,
    currentRoute: currentRoute,
    registerView: registerView,
    start: start
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
