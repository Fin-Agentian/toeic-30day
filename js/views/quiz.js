/**
 * js/views/quiz.js
 * 閱讀測驗引擎（Part 5 / 6 / 7）。
 * 流程：設定面板 → 作答（逐題即時解析 / 交卷後解析，可選計時）→ 交卷 → 結果頁。
 * 暴露：window.Views.quiz = { render, destroy }
 */
(function () {
  'use strict';

  var PART_LABELS = { P5: 'Part 5 單句填空', P6: 'Part 6 段落填空', P7: 'Part 7 閱讀理解' };
  var SUGGESTED_SECONDS = { P5: 30, P6: 45, P7: 60 };
  var WRONG_RATIO = 0.3;
  var OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  var KIND_LABELS = {
    email: '電子郵件', notice: '公告', article: '文章', ad: '廣告', form: '表單',
    chat: '對話串', memo: '備忘錄', schedule: '時程表', invoice: '發票', letter: '信件'
  };
  var SKILL_LABELS = {
    main_idea: '主旨', detail: '細節', inference: '推論', NOT: 'NOT 題',
    vocab_in_context: '字義', sentence_insert: '句子插入', cross_ref: '交叉對照'
  };

  // ---- module state（每次 render 重新建立）----
  var hostContainer = null;
  var session = null;
  var timerId = null;

  // ---------------------------------------------------------------------
  // 小工具
  // ---------------------------------------------------------------------

  function clearNode(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function truncate(str, n) {
    str = str || '';
    return str.length > n ? str.slice(0, n) + '…' : str;
  }

  function getPool(part) {
    var data = window.TOEIC_DATA;
    if (!data) return [];
    if (part === 'P5') return Array.isArray(data.p5) ? data.p5 : [];
    if (part === 'P6') return Array.isArray(data.p6) ? data.p6 : [];
    if (part === 'P7') return Array.isArray(data.p7) ? data.p7 : [];
    return [];
  }

  function normalizePart(raw) {
    if (!raw) return null;
    var p = String(raw).toUpperCase();
    return (p === 'P5' || p === 'P6' || p === 'P7') ? p : null;
  }

  function normalizeCount(raw) {
    if (raw === undefined || raw === null || raw === '') return null;
    if (String(raw).toLowerCase() === 'all') return 'all';
    var n = parseInt(raw, 10);
    if (!isFinite(n) || isNaN(n) || n <= 0) return null;
    return n;
  }

  function groupQuestionCount(part, g) {
    if (part === 'P5') return 1;
    return (g.questions || []).length || 1;
  }

  function wrongKeysForGroup(part, g) {
    if (part === 'P5') return [g.id];
    if (part === 'P6') {
      return (g.questions || []).map(function (q) { return g.id + '-' + q.n; });
    }
    return (g.questions || []).map(function (q, i) { return g.id + '-' + (i + 1); });
  }

  /** 優先抽 wrongBook 中未 mastered 者佔 30%（若有），其餘隨機不重複。 */
  function sampleGroups(part, pool, countTarget, wrongBook) {
    wrongBook = wrongBook || {};
    if (!pool.length) return [];
    if (countTarget === 'all') return Util.shuffle(pool);

    var target = Util.clamp(countTarget, 1, 99999);
    var wrongCandidates = pool.filter(function (g) {
      return wrongKeysForGroup(part, g).some(function (k) {
        var w = wrongBook[k];
        return !!w && !w.mastered;
      });
    });
    var wrongGoal = Math.floor(target * WRONG_RATIO);

    var selected = [];
    var qCount = 0;
    Util.shuffle(wrongCandidates).forEach(function (g) {
      if (qCount >= wrongGoal) return;
      selected.push(g);
      qCount += groupQuestionCount(part, g);
    });

    var selectedIds = {};
    selected.forEach(function (g) { selectedIds[g.id] = true; });
    var remaining = Util.shuffle(pool.filter(function (g) { return !selectedIds[g.id]; }));

    var i = 0;
    while (qCount < target && i < remaining.length) {
      selected.push(remaining[i]);
      qCount += groupQuestionCount(part, remaining[i]);
      i += 1;
    }
    return Util.shuffle(selected);
  }

  function countTotalQuestions(groups, part) {
    var total = 0;
    groups.forEach(function (g) { total += groupQuestionCount(part, g); });
    return total;
  }

  function cleanupTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function updateSession(patch) {
    session = Object.assign({}, session, patch);
  }

  /** 以 Date.now() 差值計算實際經過秒數，避免背景分頁節流 setInterval 導致計時失準。 */
  function computeElapsedSeconds() {
    if (!session || !session.startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
  }

  // ---------------------------------------------------------------------
  // 入口
  // ---------------------------------------------------------------------

  function render(container, params) {
    clearNode(container);
    cleanupTimer();
    hostContainer = container;
    session = null;
    params = params || {};

    var pools = { P5: getPool('P5'), P6: getPool('P6'), P7: getPool('P7') };

    if (!pools.P5.length && !pools.P6.length && !pools.P7.length) {
      renderEmptyNoData();
      return;
    }

    var directPart = normalizePart(params.part);
    if (directPart && pools[directPart].length) {
      startSession({
        part: directPart,
        count: normalizeCount(params.count) || 10,
        mode: 'immediate',
        timerOn: true,
        task: params.task || null
      });
      return;
    }

    renderSetup(pools, params);
  }

  function destroy() {
    cleanupTimer();
    session = null;
    hostContainer = null;
  }

  function renderEmptyNoData() {
    hostContainer.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {}, Util.h('h1', {}, '閱讀做題'))
    ));
    hostContainer.appendChild(Util.h('div.empty-state', {},
      Util.h('div.empty-state-icon', {}, '📭'),
      Util.h('h2', {}, '目前沒有題庫資料'),
      Util.h('p', {}, '請確認 Part 5／6／7 的題庫資料檔已正確載入。')
    ));
  }

  function renderEmptyForPart(part) {
    hostContainer.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {}, Util.h('h1', {}, PART_LABELS[part] || '閱讀做題'))
    ));
    hostContainer.appendChild(Util.h('div.empty-state', {},
      Util.h('div.empty-state-icon', {}, '📭'),
      Util.h('h2', {}, '這個 Part 目前沒有題目'),
      Util.h('p', {}, '題庫資料尚未準備好，請稍後再試或選擇其他 Part。'),
      Util.h('button.btn.btn-primary', {
        type: 'button',
        onClick: function () { render(hostContainer, {}); }
      }, '回設定頁')
    ));
  }

  // ---------------------------------------------------------------------
  // 設定面板
  // ---------------------------------------------------------------------

  function toggleGroup(options, current, onSelect) {
    return Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } },
      options.map(function (opt) {
        var active = opt.value === current;
        return Util.h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (active ? 'btn-primary' : 'btn-ghost'),
          disabled: !!opt.disabled,
          onClick: function () { onSelect(opt.value); }
        }, opt.label);
      })
    );
  }

  function renderSetup(pools, params) {
    var draft = {
      part: normalizePart(params.part) ||
        (pools.P5.length ? 'P5' : (pools.P6.length ? 'P6' : (pools.P7.length ? 'P7' : 'P5'))),
      count: normalizeCount(params.count) || 10,
      mode: 'immediate',
      timerOn: true
    };
    var taskId = params.task || null;

    hostContainer.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, '閱讀做題'),
        Util.h('p.view-subtitle', {}, '選擇 Part、題數與作答模式後開始練習。')
      )
    ));

    var bodyHost = Util.h('div');
    hostContainer.appendChild(bodyHost);

    function repaint() {
      clearNode(bodyHost);
      bodyHost.appendChild(buildCard());
    }

    function buildCard() {
      var partOptions = [
        { value: 'P5', label: 'Part 5 單句', disabled: !pools.P5.length },
        { value: 'P6', label: 'Part 6 段落', disabled: !pools.P6.length },
        { value: 'P7', label: 'Part 7 文章', disabled: !pools.P7.length }
      ];
      var countOptions = [
        { value: 5, label: '5 題' }, { value: 10, label: '10 題' },
        { value: 20, label: '20 題' }, { value: 'all', label: '全部' }
      ];
      var modeOptions = [
        { value: 'immediate', label: '逐題即時解析' }, { value: 'end', label: '交卷後解析' }
      ];
      var currentPool = pools[draft.part] || [];

      return Util.h('div.card', {},
        Util.h('div.card-body', {},
          Util.h('div.field', {},
            Util.h('label.field-label', {}, '選擇 Part'),
            toggleGroup(partOptions, draft.part, function (v) { draft.part = v; repaint(); })
          ),
          Util.h('div.field', {},
            Util.h('label.field-label', {}, '題數'),
            toggleGroup(countOptions, draft.count, function (v) { draft.count = v; repaint(); }),
            Util.h('p.field-hint', {},
              currentPool.length
                ? ('題庫共 ' + currentPool.length + (draft.part === 'P5'
                  ? ' 題。'
                  : ' 篇文章；Part 6/7 以整篇文章為單位抽取，題數為概略目標。'))
                : '此 Part 目前沒有題目資料。')
          ),
          Util.h('div.field', {},
            Util.h('label.field-label', {}, '解析模式'),
            toggleGroup(modeOptions, draft.mode, function (v) { draft.mode = v; repaint(); })
          ),
          Util.h('label.checkbox-row', {},
            Util.h('input', {
              type: 'checkbox',
              checked: draft.timerOn,
              onChange: function (e) { draft.timerOn = e.target.checked; }
            }),
            Util.h('span', {}, '開啟計時（建議 ' + SUGGESTED_SECONDS[draft.part] + ' 秒／題）')
          )
        ),
        Util.h('div.card-actions', {},
          Util.h('button.btn.btn-primary.btn-block', {
            type: 'button',
            disabled: !currentPool.length,
            onClick: function () {
              startSession({
                part: draft.part, count: draft.count, mode: draft.mode,
                timerOn: draft.timerOn, task: taskId
              });
            }
          }, '開始測驗')
        )
      );
    }

    repaint();
  }

  // ---------------------------------------------------------------------
  // 作答流程
  // ---------------------------------------------------------------------

  function startSession(cfg) {
    cleanupTimer();
    var pool = getPool(cfg.part);
    var state = Store.get();
    var groups = sampleGroups(cfg.part, pool, cfg.count, state.wrongBook);

    clearNode(hostContainer);
    if (!groups.length) {
      renderEmptyForPart(cfg.part);
      return;
    }

    session = {
      part: cfg.part,
      mode: cfg.mode,
      timerOn: !!cfg.timerOn,
      task: cfg.task || null,
      requestedCount: cfg.count,
      groups: groups,
      currentIndex: 0,
      answers: {},
      revealed: {},
      activeMarker: null,
      elapsedSeconds: 0,
      startedAt: Date.now(),
      phase: 'running',
      result: null
    };

    if (session.timerOn) {
      timerId = setInterval(function () {
        updateSession({ elapsedSeconds: computeElapsedSeconds() });
        var el = Util.$('#quizTimer', hostContainer);
        if (el) el.textContent = Util.fmtTime(session.elapsedSeconds);
      }, 1000);
    }

    paintRunning();
  }

  function paintRunning() {
    clearNode(hostContainer);
    hostContainer.appendChild(buildRunHeader());
    hostContainer.appendChild(buildProgressBar());
    hostContainer.appendChild(buildGroupBody(session.groups[session.currentIndex]));
    hostContainer.appendChild(buildRunFooter());
  }

  function buildRunHeader() {
    var total = session.groups.length;
    return Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, PART_LABELS[session.part] + ' 測驗'),
        Util.h('p.view-subtitle', {},
          '第 ' + (session.currentIndex + 1) + ' / ' + total + ' 組 · 建議每題約 ' +
          SUGGESTED_SECONDS[session.part] + ' 秒 · ' +
          (session.mode === 'immediate' ? '逐題即時解析' : '交卷後解析'))
      ),
      session.timerOn ? Util.h('span.pill', { id: 'quizTimer' }, Util.fmtTime(session.elapsedSeconds)) : null
    );
  }

  function buildProgressBar() {
    var total = session.groups.length;
    var ratio = total ? (session.currentIndex + 1) / total : 0;
    return Util.h('div.progress-bar', { style: { marginBottom: '16px' } },
      Util.h('div.progress-bar-fill', { style: { width: Math.round(ratio * 100) + '%' } })
    );
  }

  function buildGroupBody(group) {
    if (session.part === 'P5') return buildP5Body(group);
    if (session.part === 'P6') return buildP6Body(group);
    return buildP7Body(group);
  }

  function buildRunFooter() {
    var atFirst = session.currentIndex === 0;
    var atLast = session.currentIndex >= session.groups.length - 1;
    return Util.h('div.u-flex.u-justify-between.u-items-center.u-mt-md', { style: { flexWrap: 'wrap', gap: '10px' } },
      Util.h('button.btn.btn-ghost', { type: 'button', disabled: atFirst, onClick: goPrev }, '← 上一題'),
      Util.h('div.u-flex.u-gap-sm', {},
        Util.h('button.btn.btn-ghost', { type: 'button', disabled: atLast, onClick: goNext }, '下一題 →'),
        Util.h('button.btn.btn-primary', { type: 'button', onClick: onSubmitClick }, '交卷')
      )
    );
  }

  function goPrev() {
    if (session.currentIndex > 0) {
      updateSession({ currentIndex: session.currentIndex - 1 });
      paintRunning();
    }
  }

  function goNext() {
    if (session.currentIndex < session.groups.length - 1) {
      updateSession({ currentIndex: session.currentIndex + 1 });
      paintRunning();
    }
  }

  function setActiveMarker(n) {
    if (!session || session.activeMarker === n) return;
    updateSession({ activeMarker: n });
    paintRunning();
  }

  function selectAnswer(key, idx) {
    if (session.mode === 'immediate' && session.revealed[key]) return;
    var answers = Object.assign({}, session.answers);
    answers[key] = idx;
    var patch = { answers: answers };
    if (session.mode === 'immediate') {
      var revealed = Object.assign({}, session.revealed);
      revealed[key] = true;
      patch.revealed = revealed;
    }
    updateSession(patch);
    paintRunning();
  }

  // ---------------------------------------------------------------------
  // 共用元件：選項清單 / 解析
  // ---------------------------------------------------------------------

  function buildOptionList(options, selected, revealed, correctIndex, onSelect) {
    return Util.h('div.option-list', {},
      (options || []).map(function (opt, i) {
        var classes = ['option-btn'];
        if (revealed) {
          if (i === correctIndex) classes.push('is-correct');
          else if (i === selected) classes.push('is-incorrect');
        } else if (i === selected) {
          classes.push('is-selected');
        }
        var showMark = revealed && (i === correctIndex || i === selected);
        return Util.h('button', {
          type: 'button',
          class: classes.join(' '),
          disabled: revealed,
          onClick: function () { onSelect(i); }
        },
          Util.h('span.option-label', {}, OPTION_LETTERS[i] || String(i + 1)),
          Util.h('span.option-text', {}, opt),
          showMark ? Util.h('span.option-mark', {}, i === correctIndex ? '✓' : '✗') : null
        );
      })
    );
  }

  function buildExplanation(text) {
    return Util.h('div.card', { style: { marginTop: '14px', background: 'var(--color-surface-alt)' } },
      Util.h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, '解析'),
      Util.h('p', {}, text || '（此題暫無解析）')
    );
  }

  // ---------------------------------------------------------------------
  // Part 5
  // ---------------------------------------------------------------------

  function buildP5Body(group) {
    var key = group.id;
    var selected = session.answers[key];
    var revealed = session.mode === 'immediate' && !!session.revealed[key];
    return Util.h('div.card', {},
      Util.h('div.card-body', {},
        Util.h('p', { style: { fontSize: '1.08rem', lineHeight: '1.8', marginBottom: '16px' } }, group.stem)
      ),
      buildOptionList(group.options, selected, revealed, group.answer, function (i) { selectAnswer(key, i); }),
      revealed ? buildExplanation(group.explanation_zh) : null
    );
  }

  // ---------------------------------------------------------------------
  // Part 6
  // ---------------------------------------------------------------------

  function renderPassageWithMarkers(text) {
    var raw = text || '';
    var segments = raw.split(/(\[\d\])/g);
    return segments.map(function (seg) {
      var m = /^\[(\d)\]$/.exec(seg);
      if (!m) return seg;
      var n = Number(m[1]);
      var active = session.activeMarker === n;
      return Util.h('span.badge.badge-primary', {
        style: active ? { boxShadow: '0 0 0 2px var(--color-primary)' } : {}
      }, '[' + n + ']');
    });
  }

  function buildP6SubQuestion(group, q) {
    var key = group.id + '-' + q.n;
    var selected = session.answers[key];
    var revealed = session.mode === 'immediate' && !!session.revealed[key];
    var prompt = q.type === 'sentence'
      ? ('選出最適合插入 [' + q.n + '] 位置的句子')
      : ('選出最適合填入 [' + q.n + '] 空格的選項');
    return Util.h('div.card', {
      onMouseenter: function () { setActiveMarker(q.n); },
      onFocusin: function () { setActiveMarker(q.n); }
    },
      Util.h('div.card-header', {},
        Util.h('span.badge.badge-primary', {}, '第 ' + q.n + ' 題'),
        q.type === 'sentence' ? Util.h('span.badge.badge-warning', {}, '句子插入') : null
      ),
      Util.h('p', { style: { fontWeight: 600, marginBottom: '10px' } }, prompt),
      buildOptionList(q.options, selected, revealed, q.answer, function (i) { selectAnswer(key, i); }),
      revealed ? buildExplanation(q.explanation_zh) : null
    );
  }

  function buildP6Body(group) {
    var passageCard = Util.h('div.card', { style: { flex: '1 1 360px', minWidth: '260px' } },
      Util.h('div.card-header', {}, Util.h('div.card-title', {}, group.title || 'Part 6 短文')),
      Util.h('div.card-body', { style: { whiteSpace: 'pre-wrap', lineHeight: '1.9' } },
        renderPassageWithMarkers(group.passage))
    );
    var questionsCol = Util.h('div.u-flex-col.u-gap-md', { style: { flex: '1 1 320px', minWidth: '260px' } },
      (group.questions || []).map(function (q) { return buildP6SubQuestion(group, q); })
    );
    return Util.h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' } },
      passageCard, questionsCol);
  }

  // ---------------------------------------------------------------------
  // Part 7
  // ---------------------------------------------------------------------

  function buildP7SubQuestion(group, q, idx) {
    var n = idx + 1;
    var key = group.id + '-' + n;
    var selected = session.answers[key];
    var revealed = session.mode === 'immediate' && !!session.revealed[key];
    return Util.h('div.card', {},
      Util.h('div.card-header', {},
        Util.h('span.badge', {}, '第 ' + n + ' 題'),
        q.skill ? Util.h('span.badge.badge-primary', {}, SKILL_LABELS[q.skill] || q.skill) : null
      ),
      Util.h('p', { style: { fontWeight: 600, marginBottom: '10px' } }, q.q),
      buildOptionList(q.options, selected, revealed, q.answer, function (i) { selectAnswer(key, i); }),
      revealed ? buildExplanation(q.explanation_zh) : null
    );
  }

  function buildP7Body(group) {
    var passageCol = Util.h('div.u-flex-col.u-gap-md', { style: { flex: '1 1 360px', minWidth: '260px' } },
      (group.passages || []).map(function (p, i) {
        return Util.h('div.card', {},
          Util.h('div.card-header', {},
            Util.h('div.card-title', {}, p.title || ('文件 ' + (i + 1))),
            Util.h('span.badge.badge-primary', {}, KIND_LABELS[p.kind] || p.kind || '')
          ),
          Util.h('div.card-body', { style: { whiteSpace: 'pre-wrap', lineHeight: '1.9' } }, p.text || '')
        );
      })
    );
    var questionsCol = Util.h('div.u-flex-col.u-gap-md', { style: { flex: '1 1 320px', minWidth: '260px' } },
      (group.questions || []).map(function (q, idx) { return buildP7SubQuestion(group, q, idx); })
    );
    return Util.h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-start' } },
      passageCol, questionsCol);
  }

  // ---------------------------------------------------------------------
  // 交卷與結果
  // ---------------------------------------------------------------------

  function onSubmitClick() {
    var totalQ = countTotalQuestions(session.groups, session.part);
    var answeredQ = Object.keys(session.answers).length;
    if (answeredQ < totalQ) {
      Util.modal({
        title: '尚有題目未作答',
        body: '目前已作答 ' + answeredQ + ' / ' + totalQ + ' 題，確定要交卷嗎？未作答的題目視為答錯。',
        actions: [
          { label: '繼續作答', class: 'btn btn-ghost' },
          {
            label: '確定交卷', class: 'btn btn-danger',
            onClick: function (close) { close(); submitQuiz(); }
          }
        ]
      });
    } else {
      submitQuiz();
    }
  }

  function scoreSession(sess) {
    var total = 0;
    var correct = 0;
    var wrongIds = [];
    var detail = [];

    sess.groups.forEach(function (g) {
      if (sess.part === 'P5') {
        var key = g.id;
        var sel = sess.answers[key];
        var ok = sel === g.answer;
        total += 1;
        if (ok) correct += 1; else wrongIds.push(key);
        detail.push({
          key: key, label: truncate(g.stem, 60), ok: ok,
          stem: g.stem, options: g.options, answer: g.answer,
          explanation: g.explanation_zh, selected: sel
        });
        return;
      }
      (g.questions || []).forEach(function (q, idx) {
        var n = sess.part === 'P6' ? q.n : (idx + 1);
        var subKey = g.id + '-' + n;
        var subSel = sess.answers[subKey];
        var subOk = subSel === q.answer;
        total += 1;
        if (subOk) correct += 1; else wrongIds.push(subKey);
        var stemText = sess.part === 'P6'
          ? ((g.title || g.id) + ' · 第 ' + n + ' 題')
          : (q.q || ((g.title || g.id) + ' 第 ' + n + ' 題'));
        detail.push({
          key: subKey, label: truncate(stemText, 60), ok: subOk,
          stem: q.q || stemText, options: q.options, answer: q.answer,
          explanation: q.explanation_zh, selected: subSel
        });
      });
    });

    return { total: total, correct: correct, wrongIds: wrongIds, detail: detail };
  }

  function submitQuiz() {
    cleanupTimer();
    var finalElapsed = computeElapsedSeconds();
    updateSession({ elapsedSeconds: finalElapsed });
    var result = scoreSession(session);
    Store.recordQuiz({
      mode: 'quiz',
      part: session.part,
      total: result.total,
      correct: result.correct,
      seconds: finalElapsed,
      wrongIds: result.wrongIds
    });
    if (session.task) {
      Store.completeTask(session.task);
      Util.toast('任務已完成，做得好！', 'success');
    }
    updateSession({ phase: 'result', result: result });
    paintResult();
  }

  function buildResultTable(result) {
    return Util.h('div.table-wrap', {},
      Util.h('table.table', {},
        Util.h('thead', {}, Util.h('tr', {},
          Util.h('th', {}, '#'), Util.h('th', {}, '題目'), Util.h('th', {}, '結果')
        )),
        Util.h('tbody', {}, result.detail.map(function (d, i) {
          return Util.h('tr', { style: { cursor: 'pointer' }, onClick: function () { openReviewModal(d); } },
            Util.h('td', {}, String(i + 1)),
            Util.h('td', {}, d.label),
            Util.h('td', {}, d.ok
              ? Util.h('span.badge.badge-success', {}, '✓ 正確')
              : Util.h('span.badge.badge-danger', {}, '✗ 錯誤'))
          );
        }))
      )
    );
  }

  function openReviewModal(d) {
    var body = Util.h('div', {},
      Util.h('p', { style: { fontWeight: 600, marginBottom: '12px' } }, d.stem),
      buildOptionList(d.options, d.selected, true, d.answer, function () {}),
      buildExplanation(d.explanation)
    );
    Util.modal({
      title: d.ok ? '答對了 🎉' : '答錯了，一起看解析',
      body: body,
      actions: [{ label: '關閉', class: 'btn btn-primary' }]
    });
  }

  function onRetry() {
    startSession({
      part: session.part, count: session.requestedCount,
      mode: session.mode, timerOn: session.timerOn, task: session.task
    });
  }

  function paintResult() {
    clearNode(hostContainer);
    var result = session.result;
    var pctVal = Util.pct(result.correct, result.total);

    hostContainer.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, PART_LABELS[session.part] + ' 結果'),
        Util.h('p.view-subtitle', {}, '共 ' + result.total + ' 題 · 用時 ' + Util.fmtTime(session.elapsedSeconds))
      )
    ));

    hostContainer.appendChild(Util.h('div.stat-grid', {},
      Util.h('div.stat-card', {},
        Util.h('div.stat-value', {}, result.correct + ' / ' + result.total),
        Util.h('div.stat-label', {}, '答對題數')),
      Util.h('div.stat-card', {},
        Util.h('div.stat-value', {}, pctVal + '%'),
        Util.h('div.stat-label', {}, '正確率')),
      Util.h('div.stat-card', {},
        Util.h('div.stat-value', {}, Util.fmtTime(session.elapsedSeconds)),
        Util.h('div.stat-label', {}, '用時'))
    ));

    var fillClass = 'progress-bar-fill' + (pctVal >= 70 ? ' is-success' : pctVal >= 40 ? ' is-warning' : ' is-danger');
    hostContainer.appendChild(Util.h('div.progress-bar', { style: { margin: '16px 0 20px' } },
      Util.h('div', { class: fillClass, style: { width: pctVal + '%' } })
    ));

    hostContainer.appendChild(buildResultTable(result));

    hostContainer.appendChild(Util.h('div.u-flex.u-gap-sm.u-mt-md', { style: { flexWrap: 'wrap' } },
      Util.h('button.btn.btn-primary', { type: 'button', onClick: onRetry }, '再做一組'),
      Util.h('button.btn.btn-ghost', {
        type: 'button',
        onClick: function () { if (window.App) window.App.navigate('#/dashboard'); }
      }, '回儀表板')
    ));
  }

  window.Views = window.Views || {};
  window.Views.quiz = { render: render, destroy: destroy };
})();
