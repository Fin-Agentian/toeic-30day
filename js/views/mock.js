/**
 * js/views/mock.js
 * 迷你模考頁：preset "mini"（P5×15 + P6×1 篇 + P7 single×2，25 分鐘）
 * 與 "half"（P5×30 + P6×2 + P7×5，含 double×1，55 分鐘），亦支援自訂。
 * 全程單一倒數計時器，時間到自動交卷；題目導覽格（答題卡風格：已答/未答/標記）；
 * 交卷後顯示總分、Part 正確率、用時 vs 建議配速，錯題寫入 wrongBook（Store.recordQuiz mode:'mock'）、
 * 弱點建議連到 #/tips?part=。
 * 暴露：window.Views.mock = { render(container, params), destroy() }
 * 依賴：window.Util、window.Store、window.TOEIC_DATA.p5/p6/p7（皆可能缺檔）。
 * 不 import js/views/quiz.js（尚未存在也不依賴其內部），P6/P7 呈現邏輯本檔自行實作。
 */
(function () {
  'use strict';

  var OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  var PACE_SEC = { P5: 20, P6: 55, P7: 70 }; // 建議配速：每小題秒數
  var WEAKNESS_THRESHOLD = 75; // 正確率低於此百分比視為弱點

  var PRESETS = {
    mini: { key: 'mini', label: '迷你模考', desc: 'P5×15、P6×1 篇、P7 單篇×2', minutes: 25, p5: 15, p6: 1, p7: 2, p7Require: { single: 2 } },
    half: { key: 'half', label: '半回模考', desc: 'P5×30、P6×2 篇、P7×5（含雙篇 1）', minutes: 55, p5: 30, p6: 2, p7: 5, p7Require: { double: 1 } }
  };

  // -----------------------------------------------------------------
  // 模組狀態（每次 render() 重新初始化）
  // -----------------------------------------------------------------
  var container = null;
  var phase = 'setup'; // 'setup' | 'running' | 'result'
  var selectedPresetKey = 'mini';
  var customCfg = { p5: 15, p6: 1, p7: 2, minutes: 25 };
  var session = null; // 進行中的模考資料
  var result = null; // 交卷後的統計結果
  var taskId = null;
  var timerId = null;
  var timerTextEl = null;

  // -----------------------------------------------------------------
  // 資料存取 / 題組建構
  // -----------------------------------------------------------------

  function getData(part) {
    var d = window.TOEIC_DATA;
    if (!d || !Array.isArray(d[part])) return [];
    return d[part];
  }

  function pickP7(pool, total, requireTypes) {
    var chosen = [];
    var usedIds = {};
    Object.keys(requireTypes || {}).forEach(function (type) {
      var need = requireTypes[type];
      var candidates = Util.shuffle(pool.filter(function (it) { return it.type === type; }));
      for (var i = 0; i < need && i < candidates.length; i++) {
        if (!usedIds[candidates[i].id]) {
          chosen.push(candidates[i]);
          usedIds[candidates[i].id] = true;
        }
      }
    });
    var remaining = total - chosen.length;
    var order = ['single', 'double', 'triple'];
    for (var oi = 0; oi < order.length && remaining > 0; oi++) {
      var restCandidates = Util.shuffle(pool.filter(function (it) {
        return it.type === order[oi] && !usedIds[it.id];
      }));
      for (var j = 0; j < restCandidates.length && remaining > 0; j++) {
        chosen.push(restCandidates[j]);
        usedIds[restCandidates[j].id] = true;
        remaining -= 1;
      }
    }
    var rank = { single: 0, double: 1, triple: 2 };
    return chosen.sort(function (a, b) { return (rank[a.type] || 9) - (rank[b.type] || 9); });
  }

  function makeP5Group(q) {
    return {
      id: q.id, part: 'P5', title: null, passageText: null, passages: null,
      items: [{ uid: q.id, sourceId: q.id, part: 'P5', stem: q.stem, options: q.options, answer: q.answer, explanation_zh: q.explanation_zh }]
    };
  }

  function makeP6Group(p) {
    var items = (p.questions || []).map(function (q) {
      return {
        uid: p.id + '-q' + q.n, sourceId: p.id + '-q' + q.n, part: 'P6',
        stem: '第 ' + q.n + ' 格', options: q.options, answer: q.answer, explanation_zh: q.explanation_zh, markerN: q.n
      };
    });
    return { id: p.id, part: 'P6', title: p.title, passageText: p.passage, passages: null, items: items };
  }

  function makeP7Group(item) {
    var items = (item.questions || []).map(function (q, idx) {
      var n = idx + 1;
      return {
        uid: item.id + '-q' + n, sourceId: item.id + '-q' + n, part: 'P7',
        stem: q.q, options: q.options, answer: q.answer, explanation_zh: q.explanation_zh, skill: q.skill
      };
    });
    var typeLabel = item.type === 'double' ? '雙篇' : (item.type === 'triple' ? '三篇' : '單篇');
    return { id: item.id, part: 'P7', title: typeLabel + '閱讀', passageText: null, passages: item.passages, items: items };
  }

  function buildSession(cfg) {
    var p5Pool = getData('p5');
    var p6Pool = getData('p6');
    var p7Pool = getData('p7');

    var groups = []
      .concat(Util.sample(p5Pool, cfg.p5).map(makeP5Group))
      .concat(Util.sample(p6Pool, cfg.p6).map(makeP6Group))
      .concat(pickP7(p7Pool, cfg.p7, cfg.p7Require || {}).map(makeP7Group));

    var items = [];
    groups.forEach(function (g, gi) {
      g.items.forEach(function (it, ii) {
        it.groupIndex = gi;
        it.indexInGroup = ii;
        it.number = items.length + 1;
        items.push(it);
      });
    });

    var suggestedSeconds = items.reduce(function (sum, it) { return sum + (PACE_SEC[it.part] || 30); }, 0);

    return {
      groups: groups, items: items, total: items.length, suggestedSeconds: suggestedSeconds,
      availability: { p5: p5Pool.length, p6: p6Pool.length, p7: p7Pool.length }
    };
  }

  function currentConfig() {
    if (selectedPresetKey === 'custom') {
      return {
        key: 'custom', label: '自訂模考',
        minutes: Util.clamp(customCfg.minutes, 5, 180),
        p5: Util.clamp(customCfg.p5, 0, 200), p6: Util.clamp(customCfg.p6, 0, 20), p7: Util.clamp(customCfg.p7, 0, 20),
        p7Require: {}
      };
    }
    var p = PRESETS[selectedPresetKey] || PRESETS.mini;
    return { key: p.key, label: p.label, minutes: p.minutes, p5: p.p5, p6: p.p6, p7: p.p7, p7Require: p.p7Require };
  }

  // -----------------------------------------------------------------
  // 動作
  // -----------------------------------------------------------------

  function goTo(hash) {
    if (window.App && typeof window.App.navigate === 'function') window.App.navigate(hash);
    else window.location.hash = hash;
  }

  function updateSession(patch) {
    session = Object.assign({}, session, patch);
  }

  function onStartClick() {
    var cfg = currentConfig();
    var built = buildSession(cfg);
    if (built.total === 0) {
      Util.toast('目前沒有可用的題目可以開始模考，請確認 data/questions_*.js 已正確載入。', 'error');
      return;
    }
    session = {
      config: cfg, groups: built.groups, items: built.items, suggestedSeconds: built.suggestedSeconds,
      durationSec: cfg.minutes * 60, remainingSec: cfg.minutes * 60, startedAt: Date.now(),
      currentGroupIndex: 0, answers: {}, marked: {}
    };
    result = null;
    phase = 'running';
    renderAll();
    startTimer();
  }

  function selectAnswer(uid, idx) {
    var answers = Object.assign({}, session.answers);
    answers[uid] = idx;
    updateSession({ answers: answers });
    renderAll();
  }

  function toggleMark(uid) {
    var marked = Object.assign({}, session.marked);
    marked[uid] = !marked[uid];
    updateSession({ marked: marked });
    renderAll();
  }

  function goToGroup(idx) {
    updateSession({ currentGroupIndex: Util.clamp(idx, 0, session.groups.length - 1) });
    renderAll();
  }

  function confirmSubmit() {
    var unanswered = session.items.length - Object.keys(session.answers).length;
    var body = unanswered > 0
      ? ('尚有 ' + unanswered + ' 題未作答，確定要交卷嗎？交卷後將無法修改答案。')
      : '確定要交卷嗎？交卷後將無法修改答案。';
    Util.modal({
      title: '交卷確認',
      body: body,
      actions: [
        { label: '取消', class: 'btn btn-ghost' },
        { label: '確定交卷', class: 'btn btn-primary', onClick: function (close) { close(); finishExam(false); } }
      ]
    });
  }

  function finishExam(auto) {
    stopTimer();
    if (!session) return;

    var elapsedRaw = Math.floor((Date.now() - session.startedAt) / 1000);
    var elapsed = Math.min(session.durationSec, Math.max(0, elapsedRaw));
    var partStats = {};
    var wrongIds = [];
    var correctCount = 0;

    session.items.forEach(function (it) {
      var stat = partStats[it.part] || { correct: 0, total: 0 };
      stat.total += 1;
      var picked = session.answers.hasOwnProperty(it.uid) ? session.answers[it.uid] : null;
      if (picked !== null && picked === it.answer) {
        stat.correct += 1;
        correctCount += 1;
      } else {
        wrongIds.push(it.sourceId);
      }
      partStats[it.part] = stat;
    });

    var newState = null;
    if (window.Store && typeof Store.recordQuiz === 'function') {
      try {
        newState = Store.recordQuiz({
          mode: 'mock', part: '', total: session.items.length, correct: correctCount, seconds: elapsed, wrongIds: wrongIds
        });
      } catch (e) {
        Util.toast('紀錄成績時發生錯誤：' + e.message, 'error');
      }
    }
    if (taskId && window.Store && typeof Store.completeTask === 'function') {
      try { Store.completeTask(taskId); } catch (e) { /* 忽略：任務勾選失敗不影響交卷結果 */ }
    }

    result = {
      total: session.items.length, correct: correctCount, seconds: elapsed,
      suggestedSeconds: session.suggestedSeconds, partStats: partStats, auto: !!auto,
      streak: newState ? newState.streak : null
    };

    phase = 'result';
    renderAll();
    Util.toast(auto ? '時間到，已自動交卷' : '交卷成功', 'success');
  }

  // -----------------------------------------------------------------
  // 計時器
  // -----------------------------------------------------------------

  function startTimer() {
    stopTimer();
    timerId = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function stopTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') tick();
  }

  function tick() {
    if (!session) { stopTimer(); return; }
    var remaining = Math.max(0, session.durationSec - Math.floor((Date.now() - session.startedAt) / 1000));
    updateSession({ remainingSec: remaining });
    if (timerTextEl && timerTextEl.isConnected) {
      timerTextEl.textContent = Util.fmtTime(remaining);
      timerTextEl.style.color = remaining <= 60 ? 'var(--color-danger)' : '';
    }
    if (remaining <= 0) finishExam(true);
  }

  // -----------------------------------------------------------------
  // UI：設定畫面
  // -----------------------------------------------------------------

  function emptyState() {
    return Util.h('div.empty-state', {},
      Util.h('div.empty-state-icon', { 'aria-hidden': 'true' }, '🎯'),
      Util.h('h2', {}, '目前沒有可用的題庫'),
      Util.h('p', {}, '找不到 P5 / P6 / P7 題目資料，請確認 data/questions_*.js 已正確載入後再重新整理。')
    );
  }

  function renderPresetCard(key, label, desc) {
    var isSelected = selectedPresetKey === key;
    var style = isSelected ? { boxShadow: '0 0 0 2px var(--color-primary)' } : {};
    return Util.h('div.card.card-clickable', {
      style: style,
      onClick: function () { selectedPresetKey = key; renderAll(); }
    },
      Util.h('div.card-header', {},
        Util.h('div', {}, Util.h('div.card-title', {}, label), Util.h('div.card-subtitle', {}, desc)),
        isSelected ? Util.h('span.badge.badge-primary', {}, '已選擇') : null
      )
    );
  }

  function renderCustomFields() {
    if (selectedPresetKey !== 'custom') return null;
    return Util.h('div.card', {},
      Util.h('div.card-body', {},
        Util.h('div.field', {},
          Util.h('label.field-label', { for: 'mockP5' }, 'P5 題數'),
          Util.h('input.input', { id: 'mockP5', type: 'number', min: '0', step: '1', value: customCfg.p5, onInput: function (e) { customCfg.p5 = toPosInt(e.target.value, customCfg.p5); } })
        ),
        Util.h('div.field', {},
          Util.h('label.field-label', { for: 'mockP6' }, 'P6 篇數'),
          Util.h('input.input', { id: 'mockP6', type: 'number', min: '0', step: '1', value: customCfg.p6, onInput: function (e) { customCfg.p6 = toPosInt(e.target.value, customCfg.p6); } })
        ),
        Util.h('div.field', {},
          Util.h('label.field-label', { for: 'mockP7' }, 'P7 組數'),
          Util.h('input.input', { id: 'mockP7', type: 'number', min: '0', step: '1', value: customCfg.p7, onInput: function (e) { customCfg.p7 = toPosInt(e.target.value, customCfg.p7); } })
        ),
        Util.h('div.field', {},
          Util.h('label.field-label', { for: 'mockMinutes' }, '時限（分鐘）'),
          Util.h('input.input', { id: 'mockMinutes', type: 'number', min: '5', step: '5', value: customCfg.minutes, onInput: function (e) { customCfg.minutes = toPosInt(e.target.value, customCfg.minutes); } }),
          Util.h('p.field-hint', {}, '題數若超過題庫可用量，會自動取可用的全部題目。')
        )
      )
    );
  }

  function toPosInt(v, fallback) {
    var n = parseInt(v, 10);
    return (isNaN(n) || n < 0) ? fallback : n;
  }

  function renderSetup() {
    var avail = { p5: getData('p5').length, p6: getData('p6').length, p7: getData('p7').length };

    if (avail.p5 === 0 && avail.p6 === 0 && avail.p7 === 0) {
      container.appendChild(emptyState());
      return;
    }

    container.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, '迷你模考'),
        Util.h('p.view-subtitle', {}, '選擇模考規模，計時開始後全程只有一個倒數計時器，時間到會自動交卷。')
      )
    ));

    container.appendChild(Util.h('p.u-text-muted', {}, '目前題庫可用量：P5 ' + avail.p5 + ' 題 · P6 ' + avail.p6 + ' 篇 · P7 ' + avail.p7 + ' 組'));

    var grid = Util.h('div', { style: { display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' } },
      renderPresetCard('mini', PRESETS.mini.label + '（25 分鐘）', PRESETS.mini.desc),
      renderPresetCard('half', PRESETS.half.label + '（55 分鐘）', PRESETS.half.desc),
      renderPresetCard('custom', '自訂模考', '自行設定各 Part 題數與時限')
    );
    container.appendChild(Util.h('div.u-mt-md', {}, grid));

    var custom = renderCustomFields();
    if (custom) container.appendChild(Util.h('div.u-mt-md', {}, custom));

    container.appendChild(Util.h('div.u-mt-md.u-flex.u-justify-between.u-items-center', {},
      Util.h('p.u-text-muted', {}, '作答期間可用題目導覽格跳題、標記待複查的題目。'),
      Util.h('button.btn.btn-primary', { type: 'button', onClick: onStartClick }, '開始模考 ▶')
    ));
  }

  // -----------------------------------------------------------------
  // UI：作答畫面
  // -----------------------------------------------------------------

  function renderNavigator() {
    var grid = Util.h('div.day-grid', {});
    session.items.forEach(function (it) {
      var answered = session.answers.hasOwnProperty(it.uid);
      var marked = !!session.marked[it.uid];
      var isCurrentGroup = it.groupIndex === session.currentGroupIndex;
      var cls = [];
      if (isCurrentGroup) cls.push('is-today');
      else if (marked) cls.push('is-partial');
      else if (answered) cls.push('is-done');
      else cls.push('is-future');

      grid.appendChild(Util.h('button.calendar-cell', {
        type: 'button',
        class: cls.join(' '),
        'aria-label': '第 ' + it.number + ' 題' + (answered ? '（已作答）' : '（未作答）') + (marked ? '（已標記）' : ''),
        onClick: function () { goToGroup(it.groupIndex); }
      },
        Util.h('span.cell-day', {}, String(it.number)),
        Util.h('span.cell-label', {}, marked ? '🚩 標記' : (answered ? '已答' : '未答'))
      ));
    });
    return grid;
  }

  function renderOptions(it) {
    var list = Util.h('div.option-list', {});
    var selected = session.answers.hasOwnProperty(it.uid) ? session.answers[it.uid] : null;
    (it.options || []).forEach(function (opt, idx) {
      list.appendChild(Util.h('button.option-btn', {
        type: 'button',
        class: selected === idx ? 'is-selected' : '',
        onClick: function () { selectAnswer(it.uid, idx); }
      },
        Util.h('span.option-label', {}, OPTION_LETTERS[idx] || String(idx + 1)),
        Util.h('span.option-text', {}, opt)
      ));
    });
    return list;
  }

  function renderQuestionBlock(it, stemText) {
    var marked = !!session.marked[it.uid];
    var row = Util.h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' } },
      Util.h('p', { style: { fontWeight: '600', margin: '0' } }, stemText),
      Util.h('button.btn.btn-ghost.btn-sm', {
        type: 'button', 'aria-pressed': marked ? 'true' : 'false',
        onClick: function () { toggleMark(it.uid); }
      }, marked ? '🚩 取消標記' : '🏳️ 標記待查')
    );
    return Util.h('div', { style: { marginTop: '14px' } }, row, renderOptions(it));
  }

  function renderGroupBody(group) {
    var body = Util.h('div.card-body', {});

    if (group.part === 'P5') {
      body.appendChild(renderQuestionBlock(group.items[0], group.items[0].stem));
    } else if (group.part === 'P6') {
      body.appendChild(Util.h('div.u-text-secondary', { style: { whiteSpace: 'pre-wrap', lineHeight: '1.7' } }, group.passageText || ''));
      group.items.forEach(function (it) { body.appendChild(renderQuestionBlock(it, it.stem)); });
    } else {
      (group.passages || []).forEach(function (p) {
        body.appendChild(Util.h('div.card', { style: { background: 'var(--color-surface-alt)', marginBottom: '10px' } },
          Util.h('div.card-header', {}, Util.h('div.card-title', {}, p.title || p.kind || '')),
          Util.h('div.card-body', { style: { whiteSpace: 'pre-wrap', lineHeight: '1.7' } }, p.text || '')
        ));
      });
      group.items.forEach(function (it, idx) { body.appendChild(renderQuestionBlock(it, (idx + 1) + '. ' + it.stem)); });
    }

    return Util.h('div.card', {},
      Util.h('div.card-header', {},
        Util.h('div', {}, Util.h('div.card-title', {}, group.title || (group.part + ' 文法填空')), Util.h('div.card-subtitle', {}, group.part + (group.part === 'P5' ? '' : '（共 ' + group.items.length + ' 題）')))
      ),
      body
    );
  }

  function renderRunning() {
    var group = session.groups[session.currentGroupIndex];
    var answeredCount = Object.keys(session.answers).length;
    var total = session.items.length;

    timerTextEl = Util.h('span', {}, Util.fmtTime(session.remainingSec));
    if (session.remainingSec <= 60) timerTextEl.style.color = 'var(--color-danger)';

    container.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, session.config.label),
        Util.h('p.view-subtitle', {}, '已答 ' + answeredCount + ' / ' + total + ' 題')
      ),
      Util.h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
        Util.h('div.pill.pill-countdown', {}, Util.h('span', { 'aria-hidden': 'true' }, '⏱️ '), timerTextEl),
        Util.h('button.btn.btn-primary', { type: 'button', onClick: confirmSubmit }, '交卷')
      )
    ));

    container.appendChild(Util.h('div.progress-bar', { style: { marginBottom: '14px' } },
      Util.h('div.progress-bar-fill', { style: { width: Util.pct(answeredCount, total) + '%' } })
    ));

    container.appendChild(renderNavigator());

    container.appendChild(Util.h('div.u-mt-md', {}, renderGroupBody(group)));

    container.appendChild(Util.h('div.u-mt-md.u-flex.u-justify-between', {},
      Util.h('button.btn.btn-ghost', {
        type: 'button', disabled: session.currentGroupIndex <= 0,
        onClick: function () { goToGroup(session.currentGroupIndex - 1); }
      }, '⬅ 上一組'),
      Util.h('button.btn.btn-ghost', {
        type: 'button', disabled: session.currentGroupIndex >= session.groups.length - 1,
        onClick: function () { goToGroup(session.currentGroupIndex + 1); }
      }, '下一組 ➡')
    ));
  }

  // -----------------------------------------------------------------
  // UI：結果畫面
  // -----------------------------------------------------------------

  function weaknessParts(partStats) {
    return Object.keys(partStats).map(function (p) {
      var s = partStats[p];
      return { part: p, total: s.total, correct: s.correct, pct: Util.pct(s.correct, s.total) };
    }).filter(function (p) { return p.total > 0 && p.pct < WEAKNESS_THRESHOLD; })
      .sort(function (a, b) { return a.pct - b.pct; });
  }

  function buildWeaknessCard(weak) {
    if (!weak.length) {
      return Util.h('div.card', {}, Util.h('div.card-body', {}, Util.h('p', {}, '🎉 各 Part 正確率都不錯，維持這個節奏！')));
    }
    var body = Util.h('div.card-body', {});
    weak.forEach(function (w) {
      body.appendChild(Util.h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--color-border)' } },
        Util.h('span', {}, w.part + ' 正確率 ' + w.pct + '%（' + w.correct + '/' + w.total + '）'),
        Util.h('button.btn.btn-ghost.btn-sm', { type: 'button', onClick: function () { goTo('#/tips?part=' + encodeURIComponent(w.part)); } }, '看技巧建議')
      ));
    });
    return Util.h('div.card', {}, Util.h('div.card-header', {}, Util.h('div.card-title', {}, '弱點建議')), body);
  }

  function renderWrongReview() {
    var wrongItems = session.items.filter(function (it) {
      var picked = session.answers.hasOwnProperty(it.uid) ? session.answers[it.uid] : null;
      return picked !== it.answer;
    });
    if (!wrongItems.length) {
      return Util.h('div.empty-state', {}, Util.h('div.empty-state-icon', {}, '🎉'), Util.h('h2', {}, '全部答對！'), Util.h('p', {}, '這次模考沒有錯題，太厲害了。'));
    }
    var wrap = Util.h('div', {});
    wrongItems.forEach(function (it) {
      var picked = session.answers.hasOwnProperty(it.uid) ? session.answers[it.uid] : null;
      var list = Util.h('div.option-list', {});
      (it.options || []).forEach(function (opt, idx) {
        var cls = idx === it.answer ? 'is-correct' : (idx === picked ? 'is-incorrect' : '');
        list.appendChild(Util.h('button.option-btn', { type: 'button', class: cls, disabled: true },
          Util.h('span.option-label', {}, OPTION_LETTERS[idx] || String(idx + 1)),
          Util.h('span.option-text', {}, opt),
          idx === it.answer ? Util.h('span.option-mark', {}, '✓') : (idx === picked ? Util.h('span.option-mark', {}, '✗') : null)
        ));
      });
      wrap.appendChild(Util.h('div.card', { style: { marginBottom: '12px' } },
        Util.h('div.card-header', {},
          Util.h('div.card-title', {}, it.part + ' · ' + it.sourceId),
          picked === null ? Util.h('span.badge.badge-warning', {}, '未作答') : null
        ),
        Util.h('div.card-body', {},
          Util.h('p', { style: { fontWeight: '600' } }, it.stem),
          list,
          Util.h('p.u-text-muted', { style: { marginTop: '8px' } }, '解析：' + (it.explanation_zh || '（無）'))
        )
      ));
    });
    return wrap;
  }

  function paceBadge(usedSec, suggestedSec) {
    var diff = usedSec - suggestedSec;
    if (diff <= 0) return Util.h('span.badge.badge-success', {}, '比建議配速快 ' + Util.fmtTime(-diff));
    return Util.h('span.badge.badge-warning', {}, '比建議配速慢 ' + Util.fmtTime(diff));
  }

  function renderResult() {
    var pct = Util.pct(result.correct, result.total);

    container.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, '模考結果'),
        Util.h('p.view-subtitle', {}, session.config.label + (result.auto ? '（時間到自動交卷）' : ''))
      )
    ));

    container.appendChild(Util.h('div.stat-grid', {},
      Util.h('div.stat-card', {}, Util.h('div.stat-value', {}, pct + '%'), Util.h('div.stat-label', {}, '總正確率')),
      Util.h('div.stat-card', {}, Util.h('div.stat-value', {}, result.correct + '/' + result.total), Util.h('div.stat-label', {}, '答對題數')),
      Util.h('div.stat-card', {}, Util.h('div.stat-value', {}, Util.fmtTime(result.seconds)), Util.h('div.stat-label', {}, '實際用時')),
      Util.h('div.stat-card', {}, Util.h('div.stat-value', {}, Util.fmtTime(result.suggestedSeconds)), Util.h('div.stat-label', {}, '建議用時'))
    ));

    container.appendChild(Util.h('div.u-mt-md.u-text-center', {}, paceBadge(result.seconds, result.suggestedSeconds)));

    var tableWrap = Util.h('div.table-wrap', { style: { marginTop: '16px' } });
    var table = Util.h('table.table', {},
      Util.h('thead', {}, Util.h('tr', {}, Util.h('th', {}, 'Part'), Util.h('th', {}, '對/共'), Util.h('th', {}, '正確率')))
    );
    var tbody = Util.h('tbody', {});
    Object.keys(result.partStats).sort().forEach(function (p) {
      var s = result.partStats[p];
      tbody.appendChild(Util.h('tr', {},
        Util.h('td', {}, p), Util.h('td', {}, s.correct + '/' + s.total), Util.h('td', {}, Util.pct(s.correct, s.total) + '%')
      ));
    });
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    container.appendChild(Util.h('div.u-mt-md', {}, buildWeaknessCard(weaknessParts(result.partStats))));

    container.appendChild(Util.h('div.u-mt-md.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } },
      Util.h('button.btn.btn-primary', { type: 'button', onClick: function () { phase = 'setup'; session = null; result = null; renderAll(); } }, '再考一次'),
      Util.h('button.btn.btn-ghost', { type: 'button', onClick: function () { goTo('#/review'); } }, '查看錯題本'),
      Util.h('button.btn.btn-ghost', { type: 'button', onClick: function () { goTo('#/dashboard'); } }, '回到儀表板')
    ));

    container.appendChild(Util.h('h2.u-mt-md', {}, '錯題詳解'));
    container.appendChild(renderWrongReview());
  }

  // -----------------------------------------------------------------
  // 渲染主流程 / Views 契約
  // -----------------------------------------------------------------

  function renderAll() {
    if (!container) return;
    container.innerHTML = '';
    timerTextEl = null;
    if (phase === 'running' && session) renderRunning();
    else if (phase === 'result' && result) renderResult();
    else renderSetup();
  }

  function render(containerEl, params) {
    container = containerEl;
    taskId = (params && params.task) || null;
    var presetParam = params && params.preset;
    if (presetParam === 'mini' || presetParam === 'half') selectedPresetKey = presetParam;
    else if (!PRESETS[selectedPresetKey]) selectedPresetKey = 'mini';
    phase = 'setup';
    session = null;
    result = null;
    renderAll();
  }

  function destroy() {
    stopTimer();
    if (window.TTS && typeof TTS.stop === 'function') TTS.stop();
    timerTextEl = null;
    container = null;
  }

  window.Views = window.Views || {};
  window.Views.mock = { render: render, destroy: destroy };
})();
