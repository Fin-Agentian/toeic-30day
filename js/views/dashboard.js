/**
 * js/views/dashboard.js — TOEIC 30 天衝刺平台
 * window.Views.dashboard：儀表板（倒數、今日任務、30 天進度環、連續天數、
 * 近 7 天正確率、弱點提醒、今日單字到期數）。
 * 依 docs/API_ui.md / docs/API_infra.md 介面撰寫，純 IIFE，不用 ES modules。
 */
(function () {
  'use strict';

  var TASK_ICONS = {
    tips: '💡',
    quiz: '✏️',
    listening: '🎧',
    vocab: '📚',
    mock: '🎯',
    review: '🔁',
    read: '📖'
  };

  var TASK_TYPE_LABELS = {
    tips: '技巧',
    quiz: '做題',
    listening: '聽力',
    vocab: '單字',
    mock: '模考',
    review: '複習',
    read: '閱讀'
  };

  var WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];

  var changeHandler = null;

  // -----------------------------------------------------------------------
  // 小工具
  // -----------------------------------------------------------------------

  function goTo(hash) {
    if (window.App && typeof window.App.navigate === 'function') {
      window.App.navigate(hash);
    } else {
      window.location.hash = hash;
    }
  }

  /** qp({a:1,b:undefined}) → "a=1"（略過 undefined/null/''） */
  function qp(obj) {
    return Object.keys(obj)
      .filter(function (k) {
        var v = obj[k];
        return v !== undefined && v !== null && v !== '';
      })
      .map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]);
      })
      .join('&');
  }

  function isoWeekday(iso) {
    var parts = String(iso).split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1).getDay();
  }

  function isDone(state, id) {
    return !!(state.completedTasks && state.completedTasks[id]);
  }

  function taskHash(task) {
    var ref = task.ref || {};
    var id = task.id;
    switch (task.type) {
      case 'tips':
        return '#/tips?' + qp({ part: ref.part, count: ref.count, task: id });
      case 'quiz':
        return '#/quiz?' + qp({ part: ref.part, count: ref.count, task: id });
      case 'listening':
        return '#/listening?' + qp({ part: ref.part, count: ref.count, task: id });
      case 'vocab':
        return '#/vocab?' + qp({ task: id });
      case 'mock':
        return '#/mock?' + qp({ preset: ref.preset, task: id });
      case 'review':
        return '#/review?' + qp({ task: id });
      default:
        return null;
    }
  }

  function weaknessTargetHash(part) {
    var listeningParts = ['P1', 'P2', 'P3', 'P4'];
    if (listeningParts.indexOf(part) !== -1) {
      return '#/listening?' + qp({ part: part, count: 10 });
    }
    return '#/quiz?' + qp({ part: part, count: 10 });
  }

  function emptyBlock(icon, title, desc, isError) {
    return Util.h(
      'div',
      { class: 'empty-state' + (isError ? ' empty-state-error' : '') },
      Util.h('div.empty-state-icon', { 'aria-hidden': 'true' }, icon),
      Util.h('h2', {}, title),
      Util.h('p', {}, desc)
    );
  }

  // -----------------------------------------------------------------------
  // 「讀」型任務：彈出說明 modal，可直接標記完成
  // -----------------------------------------------------------------------

  function openReadTask(task, state) {
    var ref = task.ref || {};
    var done = isDone(state, task.id);
    var actions = [{ label: '關閉', class: 'btn btn-ghost' }];
    if (!done) {
      actions.push({
        label: '標記完成',
        class: 'btn btn-primary',
        onClick: function (close) {
          if (window.Store) window.Store.completeTask(task.id);
          close();
          Util.toast('已標記完成', 'success');
        }
      });
    }
    Util.modal({
      title: task.label || '閱讀任務',
      body: Util.h(
        'div',
        {},
        Util.h('p', {}, ref.note || '這個任務沒有額外說明，請依計畫自行閱讀對應教材。'),
        done ? Util.h('p.u-text-muted', {}, '（已標記完成）') : null
      ),
      actions: actions
    });
  }

  // -----------------------------------------------------------------------
  // 區塊建構
  // -----------------------------------------------------------------------

  function buildHeader(dayIndex, daysToExam) {
    var dayLabel = dayIndex > 0 ? 'Day ' + dayIndex + ' / 30' : '尚未開始';
    var examLabel = daysToExam >= 0 ? '距考試 ' + daysToExam + ' 天' : '已過考試日 ' + Math.abs(daysToExam) + ' 天';
    return Util.h(
      'div.view-header',
      {},
      Util.h(
        'div.view-title',
        {},
        Util.h('h1', {}, '儀表板'),
        Util.h('p.view-subtitle', {}, dayLabel + ' · ' + examLabel)
      )
    );
  }

  function buildStartGuide() {
    return Util.h(
      'div.card',
      {},
      Util.h(
        'div.card-header',
        {},
        Util.h(
          'div',
          {},
          Util.h('div.card-title', {}, '你的 30 天計畫尚未開始'),
          Util.h('div.card-subtitle', {}, '開始日期還沒到（或尚未設定），先去「設定」頁確認開始日期。')
        ),
        Util.h('span.badge.badge-warning', {}, '待設定')
      ),
      Util.h(
        'div.card-actions',
        {},
        Util.h('button.btn.btn-primary', { onClick: function () { goTo('#/settings'); } }, '前往設定')
      )
    );
  }

  function buildHeroCard(state, daysToExam, dayIndex, dailyGoalMinutes, todayDay) {
    var firstTask = null;
    if (todayDay && Array.isArray(todayDay.tasks)) {
      firstTask = todayDay.tasks.filter(function (t) { return !isDone(state, t.id); })[0] || null;
    }

    var ctaBtn = null;
    if (todayDay) {
      ctaBtn = Util.h(
        'button.btn.btn-primary',
        {
          onClick: function () {
            var hash = firstTask ? taskHash(firstTask) : null;
            if (firstTask && firstTask.type === 'read') {
              openReadTask(firstTask, state);
            } else if (hash) {
              goTo(hash);
            } else {
              goTo('#/plan');
            }
          }
        },
        firstTask ? '開始今日任務' : '今日任務已完成 🎉'
      );
    }

    return Util.h(
      'div.card',
      {},
      Util.h(
        'div.stat-grid',
        {},
        Util.h(
          'div.stat-card',
          {},
          Util.h('div.stat-value', {}, daysToExam >= 0 ? String(daysToExam) : '0'),
          Util.h('div.stat-label', {}, daysToExam >= 0 ? '距考試天數' : '考試已結束')
        ),
        Util.h(
          'div.stat-card',
          {},
          Util.h('div.stat-value', {}, dayIndex > 0 ? 'Day ' + dayIndex : '—'),
          Util.h('div.stat-label', {}, '/ 30 天計畫')
        ),
        Util.h(
          'div.stat-card',
          {},
          Util.h('div.stat-value', {}, dailyGoalMinutes + ' 分'),
          Util.h('div.stat-label', {}, '今日目標時間')
        )
      ),
      ctaBtn ? Util.h('div.card-actions', {}, ctaBtn) : null
    );
  }

  function buildTaskItem(task, state) {
    var done = isDone(state, task.id);
    var icon = TASK_ICONS[task.type] || '📌';
    var typeLabel = TASK_TYPE_LABELS[task.type] || task.type;

    function handleClick() {
      if (task.type === 'read') {
        openReadTask(task, state);
        return;
      }
      var hash = taskHash(task);
      if (hash) goTo(hash);
    }

    return Util.h(
      'li',
      {},
      Util.h(
        'button.card.card-clickable',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            textAlign: 'left',
            padding: '14px 16px'
          },
          onClick: handleClick
        },
        Util.h('span', { 'aria-hidden': 'true', style: { fontSize: '1.4rem' } }, icon),
        Util.h(
          'div',
          { style: { flex: '1' } },
          Util.h('div', { style: { fontWeight: '600' } }, task.label),
          Util.h('div.u-text-muted', { style: { fontSize: '0.8rem' } }, typeLabel + ' · ' + task.minutes + ' 分鐘')
        ),
        done ? Util.h('span.badge.badge-success', {}, '✓ 已完成') : Util.h('span.badge', {}, '未完成')
      )
    );
  }

  function buildTasksCard(plan, todayDay, dayIndex, state) {
    var headerBadge = null;
    if (todayDay && Array.isArray(todayDay.tasks)) {
      var total = todayDay.tasks.length;
      var doneCount = todayDay.tasks.filter(function (t) { return isDone(state, t.id); }).length;
      headerBadge = Util.h('span.badge.badge-primary', {}, doneCount + ' / ' + total + ' 完成');
    }

    var card = Util.h(
      'div.card',
      {},
      Util.h(
        'div.card-header',
        {},
        Util.h(
          'div',
          {},
          Util.h('div.card-title', {}, '今日任務'),
          Util.h('div.card-subtitle', {}, todayDay ? todayDay.theme : '尚無安排')
        ),
        headerBadge
      )
    );

    if (!plan || !Array.isArray(plan.days) || !plan.days.length) {
      card.appendChild(emptyBlock('📭', '尚未載入計畫資料', '計畫資料檔尚未提供，稍後再試一次。'));
      return card;
    }

    if (!todayDay) {
      var msg = dayIndex === 0
        ? '開始日期尚未到，前往「設定」調整後即可看到每日任務。'
        : '找不到第 ' + dayIndex + ' 天的任務安排。';
      card.appendChild(emptyBlock('📭', '今天沒有安排任務', msg));
      return card;
    }

    var list = Util.h('ul', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } });
    todayDay.tasks.forEach(function (task) {
      list.appendChild(buildTaskItem(task, state));
    });
    card.appendChild(list);
    return card;
  }

  function planTotals(plan, state) {
    var total = 0;
    var done = 0;
    if (plan && Array.isArray(plan.days)) {
      plan.days.forEach(function (d) {
        (d.tasks || []).forEach(function (t) {
          total += 1;
          if (isDone(state, t.id)) done += 1;
        });
      });
    }
    return { total: total, done: done };
  }

  function computeVocabDue(state) {
    var vocabData = window.TOEIC_DATA && Array.isArray(window.TOEIC_DATA.vocab) ? window.TOEIC_DATA.vocab : [];
    if (!vocabData.length || !window.SRS) return 0;
    var allIds = vocabData.map(function (w) { return w.id; });
    var pick = window.SRS.pickSession({ cards: state.vocab || {}, allIds: allIds });
    return pick.reviewIds.length;
  }

  function buildOverviewCard(state, plan) {
    var totals = planTotals(plan, state);
    var ratio = totals.total ? totals.done / totals.total : 0;
    var circumference = 251.2;
    var offset = circumference * (1 - ratio);
    var pctText = Util.pct(totals.done, totals.total) + '%';

    var ringBlock = Util.h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' } },
      Util.h(
        'svg.progress-ring',
        { viewBox: '0 0 100 100' },
        Util.h('circle.progress-ring-track', { cx: 50, cy: 50, r: 40 }),
        Util.h('circle.progress-ring-value', {
          cx: 50,
          cy: 50,
          r: 40,
          style: { strokeDasharray: String(circumference), strokeDashoffset: String(offset) }
        }),
        Util.h('text.progress-ring-label', { x: 50, y: 58 }, pctText)
      ),
      Util.h('div.u-text-muted', {}, totals.done + ' / ' + totals.total + ' 個任務完成')
    );

    var srsDue = computeVocabDue(state);

    var statGrid = Util.h(
      'div',
      { style: { flex: '1 1 260px' } },
      Util.h(
        'div.stat-grid',
        {},
        Util.h(
          'div.stat-card',
          {},
          Util.h('div.stat-value', {}, '🔥 ' + (state.streak.current || 0)),
          Util.h('div.stat-label', {}, '連續天數（最佳 ' + (state.streak.best || 0) + '）')
        ),
        Util.h(
          'div.stat-card',
          {},
          Util.h('div.stat-value', {}, String(srsDue)),
          Util.h('div.stat-label', {}, '今日到期單字')
        )
      )
    );

    return Util.h(
      'div.card',
      {},
      Util.h('div.card-title', {}, '學習概況'),
      Util.h(
        'div.u-mt-md',
        { style: { display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' } },
        ringBlock,
        statGrid
      ),
      Util.h(
        'div.card-actions',
        {},
        Util.h('button.btn.btn-ghost.btn-sm', { onClick: function () { goTo('#/vocab'); } }, '前往背單字')
      )
    );
  }

  function buildWeeklyChart(state) {
    var today = Util.todayISO();
    var days = [];
    for (var i = 6; i >= 0; i--) {
      days.push(Util.addDays(today, -i));
    }

    var stats = days.map(function (d) {
      var correct = 0;
      var total = 0;
      (state.quizHistory || []).forEach(function (entry) {
        var entryDate = String(entry.at || '').slice(0, 10);
        if (entryDate === d) {
          correct += entry.correct;
          total += entry.total;
        }
      });
      return { date: d, total: total, pct: total ? Util.pct(correct, total) : null };
    });

    var hasAny = stats.some(function (s) { return s.total > 0; });

    var body;
    if (hasAny) {
      var barWidth = 28;
      var gap = 10;
      var chartH = 90;
      var svgWidth = stats.length * (barWidth + gap);
      var marks = [];
      stats.forEach(function (s, idx) {
        var x = idx * (barWidth + gap);
        var barH = s.pct === null ? 4 : Math.max(4, Math.round((s.pct / 100) * chartH));
        var y = chartH - barH;
        marks.push(
          Util.h('rect', {
            x: x,
            y: y,
            width: barWidth,
            height: barH,
            rx: 4,
            style: { fill: s.pct === null ? 'var(--color-border)' : 'var(--color-primary)' }
          })
        );
        marks.push(
          Util.h(
            'text',
            {
              x: x + barWidth / 2,
              y: chartH + 16,
              'text-anchor': 'middle',
              style: { fontSize: '10px', fill: 'var(--color-text-muted)' }
            },
            WEEKDAYS_ZH[isoWeekday(s.date)]
          )
        );
      });
      body = Util.h(
        'svg',
        {
          viewBox: '0 0 ' + svgWidth + ' ' + (chartH + 24),
          style: { width: '100%', maxWidth: svgWidth + 20 + 'px', height: chartH + 24 + 'px' }
        },
        marks
      );
    } else {
      body = Util.h('div.u-text-muted', {}, '最近 7 天還沒有做題紀錄，快去挑戰練習題吧。');
    }

    return Util.h(
      'div.card',
      {},
      Util.h('div.card-title', {}, '近 7 天正確率'),
      Util.h('div.u-mt-md', {}, body)
    );
  }

  /**
   * 閱讀強化卡：把閱讀診斷室最重要的一條建議搬到儀表板，
   * 讓「今天閱讀該練什麼」在首頁就看得到，不用先進診斷室。
   */
  function buildReadingCard(state) {
    var card = Util.h(
      'div.card',
      {},
      Util.h('div.card-header', {},
        Util.h('div', {},
          Util.h('div.card-title', {}, '📈 閱讀強化'),
          Util.h('div.card-subtitle', {}, '閱讀是目前的主戰場 — 這裡只顯示最該先做的那一件事')
        ),
        Util.h('button.btn.btn-ghost.btn-sm', { onClick: function () { goTo('#/reading'); } }, '完整診斷')
      )
    );

    if (!window.Reading || typeof window.Reading.diagnose !== 'function') {
      card.appendChild(Util.h('div.u-mt-md.u-text-muted', {}, '閱讀診斷模組尚未載入。'));
      return card;
    }

    var d;
    try {
      d = window.Reading.diagnose(state, { today: Util.todayISO() });
    } catch (e) {
      card.appendChild(Util.h('div.u-mt-md.u-text-muted', {}, '無法計算閱讀診斷：' + (e && e.message)));
      return card;
    }

    var rcText = d.rc.score === null ? '—' : String(d.rc.score);
    var paceText = d.projection.measuredParts === 0
      ? '尚無計時'
      : (d.projection.willFinish ? '做得完' : '超時 ' + d.projection.overMinutes + ' 分');

    card.appendChild(Util.h('div.stat-grid', { style: { marginTop: '12px' } },
      Util.h('div.stat-card', {},
        Util.h('div.stat-value', {}, rcText),
        Util.h('div.stat-label', {}, '粗估 RC 分數')),
      Util.h('div.stat-card', {},
        Util.h('div.stat-value', {}, d.rc.accuracy + '%'),
        Util.h('div.stat-label', {}, '閱讀正確率')),
      Util.h('div.stat-card', {},
        Util.h('div.stat-value', {}, paceText),
        Util.h('div.stat-label', {}, '75 分鐘完成度'))
    ));

    var top = d.advice[0];
    if (top) {
      card.appendChild(Util.h('div.card', { style: { marginTop: '14px', background: 'var(--color-surface-alt)' } },
        Util.h('div.u-flex.u-items-center.u-gap-sm', { style: { flexWrap: 'wrap' } },
          Util.h('span', { style: { fontSize: '1.1rem' } }, top.icon),
          Util.h('strong', {}, top.title)
        ),
        Util.h('p', { style: { marginTop: '6px' } }, top.detail),
        Util.h('div.u-flex.u-gap-sm', { style: { marginTop: '10px', flexWrap: 'wrap' } },
          Util.h('button.btn.btn-primary.btn-sm', { onClick: function () { goTo(top.hash); } }, top.actionLabel)
        )
      ));
    }

    return card;
  }

  function buildWeaknessCard(state) {
    var stats = {};
    (state.quizHistory || []).forEach(function (entry) {
      var part = entry.part;
      if (!part) return;
      if (!stats[part]) stats[part] = { correct: 0, total: 0 };
      stats[part].correct += entry.correct;
      stats[part].total += entry.total;
    });

    var arr = Object.keys(stats)
      .map(function (part) {
        var s = stats[part];
        return { part: part, pct: Util.pct(s.correct, s.total), total: s.total };
      })
      .filter(function (s) { return s.total > 0; });

    arr.sort(function (a, b) { return a.pct - b.pct || b.total - a.total; });
    var weakest = arr.slice(0, 3);

    var card = Util.h(
      'div.card',
      {},
      Util.h('div.card-title', {}, '弱點提醒'),
      Util.h('div.card-subtitle', {}, '依做題紀錄找出正確率最低的 Part')
    );

    if (!weakest.length) {
      card.appendChild(Util.h('div.u-mt-md.u-text-muted', {}, '尚未有足夠的做題紀錄，去挑戰練習題累積數據吧。'));
      card.appendChild(
        Util.h(
          'div.card-actions',
          {},
          Util.h('button.btn.btn-primary.btn-sm', { onClick: function () { goTo('#/quiz'); } }, '開始做題')
        )
      );
      return card;
    }

    var list = Util.h('ul', { style: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' } });
    weakest.forEach(function (w) {
      list.appendChild(
        Util.h(
          'li',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' } },
          Util.h(
            'div',
            {},
            Util.h('div', { style: { fontWeight: '600' } }, w.part),
            Util.h('div.u-text-muted', { style: { fontSize: '0.8rem' } }, '正確率 ' + w.pct + '%（' + w.total + ' 題）')
          ),
          Util.h(
            'button.btn.btn-ghost.btn-sm',
            { onClick: function () { goTo(weaknessTargetHash(w.part)); } },
            '前往練習'
          )
        )
      );
    });
    card.appendChild(list);
    return card;
  }

  // -----------------------------------------------------------------------
  // render / destroy
  // -----------------------------------------------------------------------

  function renderContent(container) {
    container.innerHTML = '';

    if (!window.Store || !window.Util) {
      container.appendChild(emptyBlock('⚠️', '無法載入儀表板', '核心模組尚未載入，請重新整理頁面。', true));
      return;
    }

    try {
      var state = window.Store.get();
      var plan = window.TOEIC_DATA && window.TOEIC_DATA.plan;
      var dayIndex = window.Store.getDayIndex();
      var daysToExam = window.Store.daysToExam();
      var todayDay = null;
      if (plan && Array.isArray(plan.days)) {
        todayDay = plan.days.filter(function (d) { return d.day === dayIndex; })[0] || null;
      }
      var dailyGoalMinutes = todayDay ? todayDay.minutes : state.dailyMinutes;

      container.appendChild(buildHeader(dayIndex, daysToExam));

      if (dayIndex === 0) {
        container.appendChild(buildStartGuide());
      }

      container.appendChild(buildHeroCard(state, daysToExam, dayIndex, dailyGoalMinutes, todayDay));
      container.appendChild(buildTasksCard(plan, todayDay, dayIndex, state));
      container.appendChild(buildOverviewCard(state, plan));
      container.appendChild(buildWeeklyChart(state));
      container.appendChild(buildReadingCard(state));
      container.appendChild(buildWeaknessCard(state));
    } catch (e) {
      container.innerHTML = '';
      container.appendChild(emptyBlock('⚠️', '儀表板載入失敗', '資料格式異常：' + (e && e.message ? e.message : '未知錯誤'), true));
    }
  }

  function render(container) {
    if (changeHandler) {
      window.removeEventListener('toeic30:change', changeHandler);
    }
    changeHandler = function () {
      renderContent(container);
    };
    window.addEventListener('toeic30:change', changeHandler);

    if (window.Store && typeof window.Store.touchStreak === 'function') {
      try {
        window.Store.touchStreak();
      } catch (e) {
        // 忽略：不影響頁面渲染
      }
    }

    renderContent(container);
  }

  function destroy() {
    if (changeHandler) {
      window.removeEventListener('toeic30:change', changeHandler);
      changeHandler = null;
    }
  }

  window.Views = window.Views || {};
  window.Views.dashboard = { render: render, destroy: destroy };
})();
