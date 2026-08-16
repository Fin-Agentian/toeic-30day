/**
 * js/views/plan.js
 * 30 天計畫頁：階段時間軸 + 30 格月曆 + 選定日詳情（theme/minutes/tasks）。
 * 暴露：window.Views.plan = { render(container, params), destroy() }
 * 依賴：window.Util、window.Store、window.TOEIC_DATA.plan（可能缺檔）。
 */
(function () {
  'use strict';

  var TOTAL_DAYS = 30;

  var TYPE_LABEL = {
    tips: '技巧',
    quiz: '做題',
    listening: '聽力',
    vocab: '單字',
    mock: '模考',
    review: '錯題',
    read: '閱讀教材'
  };

  // 本 view 目前渲染狀態（每次 render() 重新初始化）
  var container = null;
  var selectedDay = 1;
  var changeListener = null;

  // -----------------------------------------------------------------
  // 資料存取 / 計算
  // -----------------------------------------------------------------

  function getPlan() {
    return (window.TOEIC_DATA && window.TOEIC_DATA.plan) || null;
  }

  function countAllTasks(plan) {
    var n = 0;
    plan.days.forEach(function (d) {
      n += (d.tasks || []).length;
    });
    return n;
  }

  function countCompletedTasks(plan, state) {
    var n = 0;
    plan.days.forEach(function (d) {
      (d.tasks || []).forEach(function (t) {
        if (state.completedTasks && state.completedTasks[t.id]) n += 1;
      });
    });
    return n;
  }

  function dayProgress(day, state) {
    var tasks = day.tasks || [];
    var done = tasks.filter(function (t) {
      return !!(state.completedTasks && state.completedTasks[t.id]);
    }).length;
    return { done: done, total: tasks.length };
  }

  /**
   * taskRoute(task) — 依 task.type / task.ref 決定「前往」按鈕導向的路由。
   * 帶上 task=<id>，目的頁完成後應呼叫 Store.completeTask(task) 自動勾選。
   * type: "read"（外部教材）或無法辨識的類型 → 回傳 null（無對應頁面，不顯示按鈕）。
   */
  function taskRoute(task) {
    var ref = task.ref || {};
    var qp = 'task=' + encodeURIComponent(task.id);
    switch (task.type) {
      case 'tips':
        return '#/tips?part=' + encodeURIComponent(ref.part || '') +
          (ref.count ? '&count=' + encodeURIComponent(ref.count) : '') + '&' + qp;
      case 'quiz':
        return '#/quiz?part=' + encodeURIComponent(ref.part || '') +
          '&count=' + encodeURIComponent(ref.count != null ? ref.count : '') + '&' + qp;
      case 'listening':
        return '#/listening?part=' + encodeURIComponent(ref.part || '') +
          '&count=' + encodeURIComponent(ref.count != null ? ref.count : '') + '&' + qp;
      case 'vocab':
        return '#/vocab?newWords=' + encodeURIComponent(ref.newWords != null ? ref.newWords : '') +
          '&review=' + (ref.review ? 'true' : 'false') + '&' + qp;
      case 'mock':
        return '#/mock?preset=' + encodeURIComponent(ref.preset || 'mini') + '&' + qp;
      case 'review':
        return '#/review?' + qp;
      default:
        return null;
    }
  }

  function goTo(hash) {
    if (window.App && typeof window.App.navigate === 'function') {
      window.App.navigate(hash);
    } else {
      window.location.hash = hash;
    }
  }

  /** 勾選/取消完成任務。取消時用 Store.set 產生新物件並移除該鍵（不可變）。 */
  function toggleTask(id, checked) {
    if (!window.Store) return;
    if (checked) {
      Store.completeTask(id);
    } else {
      Store.set(function (old) {
        var completedTasks = Object.assign({}, old.completedTasks);
        delete completedTasks[id];
        return Object.assign({}, old, { completedTasks: completedTasks });
      });
    }
  }

  // -----------------------------------------------------------------
  // UI 建構
  // -----------------------------------------------------------------

  function emptyState() {
    return Util.h(
      'div.empty-state',
      {},
      Util.h('div.empty-state-icon', { 'aria-hidden': 'true' }, '🗓️'),
      Util.h('h2', {}, '尚未載入 30 天計畫'),
      Util.h('p', {}, '計畫資料目前無法使用，請確認 data/plan.js 已正確載入後再重新整理。')
    );
  }

  function buildHeader(todayIdx, overallPct) {
    var daysToExam = window.Store && typeof Store.daysToExam === 'function' ? Store.daysToExam() : null;
    var subtitleParts = ['Day ' + (todayIdx || 0) + '/' + TOTAL_DAYS];
    if (daysToExam !== null) subtitleParts.push('距考試 ' + daysToExam + ' 天');

    return Util.h(
      'div.view-header',
      {},
      Util.h(
        'div.view-title',
        {},
        Util.h('h1', {}, '30 天計畫'),
        Util.h('p.view-subtitle', {}, subtitleParts.join(' · '))
      ),
      Util.h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', minWidth: '160px' } },
        Util.h('span.badge.badge-primary', {}, '整體完成 ' + overallPct + '%'),
        Util.h(
          'div.progress-bar',
          { style: { width: '160px' } },
          Util.h('div.progress-bar-fill', { style: { width: overallPct + '%' } })
        )
      )
    );
  }

  function buildPhases(plan, todayIdx) {
    var row = Util.h('div', {
      style: { display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }
    });
    (plan.phases || []).forEach(function (p) {
      var range = Array.isArray(p.days) ? p.days : [0, 0];
      var isActive = todayIdx >= range[0] && todayIdx <= range[1];
      row.appendChild(
        Util.h(
          'div.card',
          { style: { minWidth: '200px', flex: '0 0 auto' } },
          Util.h(
            'div.card-header',
            {},
            Util.h(
              'div',
              {},
              Util.h('div.card-title', {}, p.name),
              Util.h('div.card-subtitle', {}, 'Day ' + range[0] + '–' + range[1])
            ),
            isActive ? Util.h('span.badge.badge-success', {}, '進行中') : null
          ),
          Util.h('div.card-body', {}, p.goal || '')
        )
      );
    });
    return row;
  }

  function buildDayGrid(plan, state, todayIdx) {
    var grid = Util.h('div.day-grid', {});
    plan.days.forEach(function (d) {
      var prog = dayProgress(d, state);
      var ratio = prog.total ? prog.done / prog.total : 0;
      var dateISO = Util.addDays(state.startDate, d.day - 1);
      var mmdd = Util.fmtDate(dateISO, { weekday: false }).slice(5);

      var extraClasses = [];
      if (d.day === todayIdx) {
        extraClasses.push('is-today');
      } else if (d.day < todayIdx) {
        if (prog.total > 0 && prog.done === prog.total) extraClasses.push('is-done');
        else if (prog.done > 0) extraClasses.push('is-partial');
      } else {
        extraClasses.push('is-future');
      }

      var cellStyle = {};
      if (d.day === selectedDay && d.day !== todayIdx) {
        cellStyle.boxShadow = '0 0 0 2px var(--color-primary)';
      }

      var cell = Util.h(
        'button.calendar-cell',
        {
          type: 'button',
          class: extraClasses.join(' '),
          style: cellStyle,
          'aria-label': 'Day ' + d.day + '（' + mmdd + '）完成 ' + prog.done + '/' + prog.total,
          'aria-pressed': d.day === selectedDay ? 'true' : 'false',
          onClick: function () {
            selectedDay = d.day;
            renderAll();
          }
        },
        Util.h('span.cell-day', {}, String(d.day)),
        Util.h('span.cell-label', {}, mmdd),
        Util.h(
          'div.progress-bar',
          { style: { width: '100%', height: '4px', marginTop: '2px' } },
          Util.h('div.progress-bar-fill', { style: { width: Math.round(ratio * 100) + '%' } })
        )
      );
      grid.appendChild(cell);
    });
    return grid;
  }

  function buildTaskRow(task, state) {
    var done = !!(state.completedTasks && state.completedTasks[task.id]);
    var route = taskRoute(task);

    return Util.h(
      'div.checkbox-row',
      {
        style: {
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          padding: '10px 0',
          borderBottom: '1px solid var(--color-border)'
        }
      },
      Util.h('input', {
        type: 'checkbox',
        checked: done,
        'aria-label': (done ? '取消完成：' : '標記完成：') + task.label,
        onChange: function (e) {
          toggleTask(task.id, e.target.checked);
        }
      }),
      Util.h(
        'span',
        { style: { flex: '1 1 200px' } },
        Util.h('span', {}, task.label),
        Util.h('span.badge.badge-primary', { style: { marginLeft: '8px' } }, TYPE_LABEL[task.type] || task.type),
        Util.h('span.u-text-muted', { style: { marginLeft: '8px', fontSize: '0.78rem' } }, task.minutes + ' 分鐘')
      ),
      route
        ? Util.h('button.btn.btn-ghost.btn-sm', { type: 'button', onClick: function () { goTo(route); } }, '前往')
        : Util.h('span.u-text-muted', { style: { fontSize: '0.78rem' } }, (task.ref && task.ref.note) || '需自行安排')
    );
  }

  function buildDetail(plan, state, todayIdx) {
    var day = null;
    for (var i = 0; i < plan.days.length; i++) {
      if (plan.days[i].day === selectedDay) { day = plan.days[i]; break; }
    }
    if (!day) {
      return Util.h('div.empty-state', {}, Util.h('p', {}, '找不到這一天的計畫內容。'));
    }

    var prog = dayProgress(day, state);
    var dateISO = Util.addDays(state.startDate, day.day - 1);
    var badgeClass = prog.total > 0 && prog.done === prog.total ? 'badge-success'
      : (prog.done > 0 ? 'badge-warning' : '');

    var tasks = (day.tasks || []).map(function (t) { return buildTaskRow(t, state); });

    return Util.h(
      'div.card',
      {},
      Util.h(
        'div.card-header',
        {},
        Util.h(
          'div',
          {},
          Util.h('div.card-title', {}, 'Day ' + day.day + '　' + day.theme),
          Util.h('div.card-subtitle', {}, day.phase + ' · ' + Util.fmtDate(dateISO) + ' · 建議 ' + day.minutes + ' 分鐘')
        ),
        Util.h(
          'div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
          day.day !== todayIdx
            ? Util.h('button.btn.btn-ghost.btn-sm', {
                type: 'button',
                onClick: function () { selectedDay = todayIdx >= 1 && todayIdx <= TOTAL_DAYS ? todayIdx : 1; renderAll(); }
              }, '回到今天')
            : null,
          Util.h('span.badge', { class: badgeClass }, prog.done + '/' + prog.total)
        )
      ),
      Util.h(
        'div.card-body',
        {},
        tasks.length ? tasks : Util.h('p.u-text-muted', {}, '這天沒有安排任務。')
      )
    );
  }

  // -----------------------------------------------------------------
  // 渲染主流程
  // -----------------------------------------------------------------

  function renderAll() {
    if (!container) return;
    container.innerHTML = '';

    var plan = getPlan();
    if (!plan || !Array.isArray(plan.days) || plan.days.length === 0) {
      container.appendChild(emptyState());
      return;
    }

    var state = window.Store ? Store.get() : { completedTasks: {}, startDate: Util.todayISO() };
    var todayIdx = window.Store && typeof Store.getDayIndex === 'function' ? Store.getDayIndex() : 0;
    var total = countAllTasks(plan);
    var completed = countCompletedTasks(plan, state);
    var overallPct = Util.pct(completed, total);

    container.appendChild(buildHeader(todayIdx, overallPct));
    container.appendChild(buildPhases(plan, todayIdx));
    container.appendChild(Util.h('div.u-mt-md', {}, buildDayGrid(plan, state, todayIdx)));
    container.appendChild(Util.h('div.u-mt-md', {}, buildDetail(plan, state, todayIdx)));
  }

  // -----------------------------------------------------------------
  // Views 契約
  // -----------------------------------------------------------------

  function render(containerEl, params) {
    container = containerEl;

    var todayIdx = window.Store && typeof Store.getDayIndex === 'function' ? Store.getDayIndex() : 0;
    var requestedDay = params && params.day ? parseInt(params.day, 10) : NaN;
    if (!isNaN(requestedDay) && requestedDay >= 1 && requestedDay <= TOTAL_DAYS) {
      selectedDay = requestedDay;
    } else {
      selectedDay = todayIdx >= 1 && todayIdx <= TOTAL_DAYS ? todayIdx : 1;
    }

    changeListener = function () { renderAll(); };
    window.addEventListener('toeic30:change', changeListener);

    renderAll();
  }

  function destroy() {
    if (changeListener) {
      window.removeEventListener('toeic30:change', changeListener);
      changeListener = null;
    }
    container = null;
  }

  window.Views = window.Views || {};
  window.Views.plan = { render: render, destroy: destroy };
})();
