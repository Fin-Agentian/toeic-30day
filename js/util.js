/**
 * js/util.js
 * 通用工具函式庫。無外部依賴，純瀏覽器 API。
 * 暴露：window.Util
 */
(function () {
  'use strict';

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // ---------------------------------------------------------------------
  // DOM helpers
  // ---------------------------------------------------------------------

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /**
   * h(tag, attrs, ...children) — 建立 DOM 元素（hyperscript 風格）。
   * - tag 支援簡寫："div.card#main"（tag 預設 div，可疊加多個 .class，最多一個 #id）
   * - attrs：
   *    class / className: 字串或字串陣列
   *    style: 物件（camelCase 屬性）
   *    on*: 事件處理器，例如 onClick、onInput、onKeydown
   *    dataset: 物件，設定 data-* 屬性
   *    boolean 值：true 時設為屬性（如 disabled: true），false/null/undefined 略過
   *    value/checked/selected/disabled/required/readOnly: 以 DOM property 設定
   *    其餘: 以 setAttribute 設定
   * - children：字串 / 數字 / Node / 陣列（可巢狀）/ null（略過）
   */
  function h(tag, attrs) {
    var children = Array.prototype.slice.call(arguments, 2);
    attrs = attrs || {};

    var tagName = tag;
    var id = '';
    var classes = [];
    var shorthand = /^([a-zA-Z][a-zA-Z0-9]*)?((?:[.#][^.#]+)*)$/.exec(tag || 'div');
    if (shorthand && shorthand[2]) {
      tagName = shorthand[1] || 'div';
      var parts = shorthand[2].match(/[.#][^.#]+/g) || [];
      parts.forEach(function (p) {
        if (p.charAt(0) === '#') id = p.slice(1);
        else classes.push(p.slice(1));
      });
    }

    var el = document.createElement(tagName || 'div');
    if (id) el.id = id;
    if (classes.length) el.className = classes.join(' ');

    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined) return;

      if (key === 'class' || key === 'className') {
        var cls = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
        if (!cls) return;
        el.className = el.className ? el.className + ' ' + cls : cls;
        return;
      }
      if (key === 'style' && typeof value === 'object') {
        Object.keys(value).forEach(function (sk) {
          el.style[sk] = value[sk];
        });
        return;
      }
      if (key === 'dataset' && typeof value === 'object') {
        Object.keys(value).forEach(function (dk) {
          el.dataset[dk] = value[dk];
        });
        return;
      }
      if (/^on[A-Z]/.test(key) && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
        return;
      }
      if (key === 'value' || key === 'checked' || key === 'selected' ||
          key === 'disabled' || key === 'required' || key === 'readOnly') {
        el[key] = value;
        return;
      }
      if (typeof value === 'boolean') {
        if (value) el.setAttribute(key, '');
        return;
      }
      el.setAttribute(key, value);
    });

    function append(child) {
      if (child === null || child === undefined || child === false) return;
      if (Array.isArray(child)) {
        child.forEach(append);
        return;
      }
      if (child instanceof Node) {
        el.appendChild(child);
        return;
      }
      el.appendChild(document.createTextNode(String(child)));
    }
    children.forEach(append);

    return el;
  }

  function escapeHtml(str) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(str).replace(/[&<>"']/g, function (ch) {
      return map[ch];
    });
  }

  // ---------------------------------------------------------------------
  // Array helpers
  // ---------------------------------------------------------------------

  /** shuffle(arr) — Fisher-Yates，回傳新陣列，不改動原陣列 */
  function shuffle(arr) {
    var copy = (arr || []).slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  /** sample(arr, n) — 從 arr 隨機取 n 個不重複元素，回傳新陣列 */
  function sample(arr, n) {
    var pool = shuffle(arr || []);
    return pool.slice(0, clamp(n, 0, pool.length));
  }

  // ---------------------------------------------------------------------
  // Date helpers（一律以 ISO "YYYY-MM-DD" 字串表示日期，使用本地時區）
  // ---------------------------------------------------------------------

  function formatISO(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseISO(iso) {
    var parts = String(iso).split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  }

  function todayISO() {
    return formatISO(new Date());
  }

  function addDays(iso, n) {
    var d = parseISO(iso);
    d.setDate(d.getDate() + Number(n || 0));
    return formatISO(d);
  }

  /** diffDays(a, b) — 回傳 b - a 的天數（a、b 皆為 ISO 字串） */
  function diffDays(a, b) {
    var pa = String(a).split('-').map(Number);
    var pb = String(b).split('-').map(Number);
    var da = Date.UTC(pa[0], (pa[1] || 1) - 1, pa[2] || 1);
    var db = Date.UTC(pb[0], (pb[1] || 1) - 1, pb[2] || 1);
    return Math.round((db - da) / 86400000);
  }

  var WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];

  /** fmtDate(iso, {weekday}) — 預設輸出 "2026/08/17（一）" */
  function fmtDate(iso, opts) {
    opts = opts || {};
    var d = parseISO(iso);
    var base = d.getFullYear() + '/' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate());
    if (opts.weekday === false) return base;
    return base + '（' + WEEKDAYS_ZH[d.getDay()] + '）';
  }

  /** fmtTime(seconds) — 秒數轉 mm:ss */
  function fmtTime(seconds) {
    var total = Math.max(0, Math.floor(Number(seconds) || 0));
    var m = Math.floor(total / 60);
    var s = total % 60;
    return pad2(m) + ':' + pad2(s);
  }

  // ---------------------------------------------------------------------
  // Number helpers
  // ---------------------------------------------------------------------

  function clamp(n, min, max) {
    n = Number(n);
    if (Number.isNaN(n)) n = min;
    return Math.min(Math.max(n, min), max);
  }

  /** pct(part, total) — 回傳 0-100 的百分比整數 */
  function pct(part, total) {
    if (!total) return 0;
    return clamp(Math.round((part / total) * 100), 0, 100);
  }

  // ---------------------------------------------------------------------
  // Function helpers
  // ---------------------------------------------------------------------

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var ctx = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  var uidCounter = 0;
  function uid(prefix) {
    uidCounter += 1;
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + uidCounter.toString(36);
  }

  // ---------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------

  /** toast(msg, type) — type: 'info'|'success'|'warning'|'error'（預設 info） */
  function toast(msg, type) {
    var container = document.getElementById('toast-container');
    if (!container) {
      console.warn('[Util.toast] 找不到 #toast-container，訊息：', msg);
      return { close: function () {} };
    }
    type = type || 'info';
    var timer = null;
    var el = h(
      'div',
      { class: 'toast toast-' + type, role: 'status' },
      h('span', { class: 'toast-msg' }, msg),
      h(
        'button',
        {
          class: 'toast-close',
          'aria-label': '關閉通知',
          onClick: function () {
            removeToast();
          }
        },
        '×'
      )
    );
    container.appendChild(el);
    timer = setTimeout(removeToast, 3200);

    function removeToast() {
      clearTimeout(timer);
      if (!el.parentNode) return;
      el.classList.add('toast-leaving');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 200);
    }

    return { close: removeToast };
  }

  // ---------------------------------------------------------------------
  // Modal
  // ---------------------------------------------------------------------

  /**
   * modal({title, body, actions}) — body 可為字串或 Node；
   * actions: [{ label, class, onClick(close) }]。回傳 close() 函式。
   */
  function modal(opts) {
    opts = opts || {};
    var root = document.getElementById('modal-root');
    if (!root) {
      console.warn('[Util.modal] 找不到 #modal-root');
      return function () {};
    }

    var closed = false;
    var overlay = h('div', {
      class: 'modal-overlay',
      onClick: function (e) {
        if (e.target === overlay) close();
      }
    });

    var actionEls = (opts.actions || []).map(function (a) {
      return h(
        'button',
        {
          class: a.className || a.class || 'btn btn-ghost',
          onClick: function () {
            if (typeof a.onClick === 'function') a.onClick(close);
            else close();
          }
        },
        a.label
      );
    });

    var bodyEl = h('div', { class: 'modal-body' }, opts.body);

    var headerEl = opts.title
      ? h(
          'div',
          { class: 'modal-header' },
          h('h3', { class: 'modal-title' }, opts.title),
          h(
            'button',
            {
              class: 'modal-close',
              'aria-label': '關閉',
              onClick: function () {
                close();
              }
            },
            '×'
          )
        )
      : null;

    var dialog = h(
      'div',
      { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || '對話框' },
      headerEl,
      bodyEl,
      actionEls.length ? h('div', { class: 'modal-actions' }, actionEls) : null
    );

    overlay.appendChild(dialog);
    root.appendChild(overlay);
    document.body.classList.add('modal-open');

    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKeydown);

    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeydown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (!root.hasChildNodes()) document.body.classList.remove('modal-open');
    }

    return close;
  }

  // ---------------------------------------------------------------------
  // Router query helper
  // ---------------------------------------------------------------------

  /**
   * qs(hash) — 解析 "#/route?a=1&b=2" 形式字串。
   * 回傳 { route: "route", params: { a: "1", b: "2" } }。
   * 未帶參數時 hash 預設取 window.location.hash。
   */
  function qs(hash) {
    hash = hash === undefined ? window.location.hash || '' : hash || '';
    if (hash.charAt(0) === '#') hash = hash.slice(1);
    if (hash.charAt(0) === '/') hash = hash.slice(1);

    var qIndex = hash.indexOf('?');
    var route = qIndex === -1 ? hash : hash.slice(0, qIndex);
    var queryStr = qIndex === -1 ? '' : hash.slice(qIndex + 1);
    var params = {};

    if (queryStr) {
      queryStr.split('&').forEach(function (pair) {
        if (!pair) return;
        var idx = pair.indexOf('=');
        var k, v;
        if (idx === -1) {
          k = pair;
          v = '';
        } else {
          k = pair.slice(0, idx);
          v = pair.slice(idx + 1);
        }
        try {
          params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
        } catch (e) {
          params[k] = v;
        }
      });
    }

    return { route: route, params: params };
  }

  // ---------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------

  window.Util = {
    $: $,
    $$: $$,
    h: h,
    escapeHtml: escapeHtml,
    shuffle: shuffle,
    sample: sample,
    todayISO: todayISO,
    addDays: addDays,
    diffDays: diffDays,
    fmtDate: fmtDate,
    fmtTime: fmtTime,
    clamp: clamp,
    pct: pct,
    debounce: debounce,
    uid: uid,
    toast: toast,
    modal: modal,
    qs: qs
  };
})();
