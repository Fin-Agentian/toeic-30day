/**
 * js/views/quiz.js
 * 閱讀測驗引擎（Part 5 / 6 / 7）。
 * 流程：設定面板 → 作答（逐題即時解析 / 交卷後解析，可選計時）→ 交卷 → 結果頁。
 * 支援 params.skill 做「考點專項練習」（P5 依 tag、P6 依 type、P7 依 skill 篩題）。
 * 每題記錄作答秒數，交卷時連同考點寫回 Store.recordQuiz({ skillStats })，
 * 供 #/reading 閱讀診斷室算各考點正確率與配速。
 * 暴露：window.Views.quiz = { render, destroy }
 */
(function () {
  'use strict';

  var PART_LABELS = { P5: 'Part 5 單句填空', P6: 'Part 6 段落填空', P7: 'Part 7 閱讀理解' };
  var WRONG_RATIO = 0.3;
  var OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  // 目標配速以 window.Reading 為單一來源；Reading 缺席時退回同樣的預設值
  var FALLBACK_PACE = { P5: 20, P6: 30, P7: 60 };

  function paceTarget(part) {
    var table = (window.Reading && window.Reading.PACE_TARGET) || FALLBACK_PACE;
    return table[part] || FALLBACK_PACE[part] || 30;
  }

  function skillKeyOf(part, q) {
    if (window.Reading && typeof window.Reading.skillKey === 'function') {
      return window.Reading.skillKey(part, q);
    }
    if (part === 'P5') return 'P5:' + ((q && q.tag) || 'other');
    if (part === 'P6') return 'P6:' + ((q && q.type) || 'word');
    return 'P7:' + ((q && q.skill) || 'detail');
  }

  function skillLabelOf(key) {
    if (window.Reading && typeof window.Reading.labelFor === 'function') {
      return window.Reading.labelFor(key);
    }
    return key;
  }

  /** 該 Part 的考點欄位值（P5:tag / P6:type / P7:skill） */
  function skillTagOf(part, q) {
    if (part === 'P5') return (q && q.tag) || 'other';
    if (part === 'P6') return (q && q.type) || 'word';
    return (q && q.skill) || 'detail';
  }

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

  /**
   * 子題 key。務必與 mock.js / listening.js / review.js 一致用 `<groupId>-q<n>`，
   * 否則寫進 wrongBook 的錯題在錯題本會查不到題目。
   */
  function subKeyFor(part, g, q, idx) {
    if (part === 'P5') return g.id;
    return g.id + '-q' + (part === 'P6' ? q.n : (idx + 1));
  }

  function wrongKeysForGroup(part, g) {
    if (part === 'P5') return [g.id];
    return (g.questions || []).map(function (q, i) { return subKeyFor(part, g, q, i); });
  }

  /** 這一組（P5 單題 / P6·P7 整篇）有沒有命中指定考點 */
  function groupHasSkill(part, g, skill) {
    if (!skill) return true;
    if (part === 'P5') return skillTagOf('P5', g) === skill;
    return (g.questions || []).some(function (q) { return skillTagOf(part, q) === skill; });
  }

  /** 該 Part 題庫中出現過的考點清單（含題數），供設定面板顯示 */
  function skillOptionsFor(part, pool) {
    var counts = {};
    (pool || []).forEach(function (g) {
      if (part === 'P5') {
        var t = skillTagOf('P5', g);
        counts[t] = (counts[t] || 0) + 1;
        return;
      }
      (g.questions || []).forEach(function (q) {
        var tag = skillTagOf(part, q);
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.keys(counts)
      .map(function (tag) {
        return { value: tag, count: counts[tag], label: skillLabelOf(part + ':' + tag) + '（' + counts[tag] + '）' };
      })
      .sort(function (a, b) { return b.count - a.count; });
  }

  /**
   * 優先抽 wrongBook 中未 mastered 者佔 30%（若有），其餘隨機不重複。
   * skill 有值時先把題庫縮到該考點（P6/P7 以「整篇含該考點」為單位）。
   */
  function sampleGroups(part, rawPool, countTarget, wrongBook, skill) {
    wrongBook = wrongBook || {};
    var pool = (rawPool || []).filter(function (g) { return groupHasSkill(part, g, skill); });
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
        skill: params.skill || null,
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

  function renderEmptyForPart(part, skill) {
    hostContainer.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {}, Util.h('h1', {}, PART_LABELS[part] || '閱讀做題'))
    ));
    hostContainer.appendChild(Util.h('div.empty-state', {},
      Util.h('div.empty-state-icon', {}, '📭'),
      Util.h('h2', {}, skill ? '這個考點目前沒有題目' : '這個 Part 目前沒有題目'),
      Util.h('p', {}, skill
        ? ('「' + skillLabelOf(part + ':' + skill) + '」在此 Part 的題庫中沒有題目，換個考點試試。')
        : '題庫資料尚未準備好，請稍後再試或選擇其他 Part。'),
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
      timerOn: true,
      skill: params.skill || ''
    };
    var taskId = params.task || null;

    hostContainer.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, '閱讀做題'),
        Util.h('p.view-subtitle', {}, '選擇 Part、考點、題數與作答模式後開始練習。做完會依考點更新閱讀診斷。')
      ),
      Util.h('button.btn.btn-ghost.btn-sm', {
        type: 'button',
        onClick: function () { if (window.App) window.App.navigate('#/reading'); }
      }, '📈 看閱讀診斷')
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
      var skillOpts = skillOptionsFor(draft.part, currentPool);
      // 換 Part 後舊考點可能不存在 → 自動退回「全部考點」
      if (draft.skill && !skillOpts.some(function (o) { return o.value === draft.skill; })) {
        draft.skill = '';
      }
      var skillToggle = [{ value: '', label: '全部考點' }].concat(skillOpts);
      var matchedGroups = currentPool.filter(function (g) {
        return groupHasSkill(draft.part, g, draft.skill);
      }).length;

      return Util.h('div.card', {},
        Util.h('div.card-body', {},
          Util.h('div.field', {},
            Util.h('label.field-label', {}, '選擇 Part'),
            toggleGroup(partOptions, draft.part, function (v) { draft.part = v; repaint(); })
          ),
          Util.h('div.field', {},
            Util.h('label.field-label', {}, '考點（專項練習）'),
            toggleGroup(skillToggle, draft.skill, function (v) { draft.skill = v; repaint(); }),
            Util.h('p.field-hint', {}, draft.skill
              ? (draft.part === 'P5'
                ? ('只抽「' + skillLabelOf(draft.part + ':' + draft.skill) + '」考點，共 ' + matchedGroups + ' 題。')
                : ('只抽含「' + skillLabelOf(draft.part + ':' + draft.skill) + '」的文章共 ' + matchedGroups +
                  ' 篇；同篇其他題型也會一起作答。'))
              : '選一個考點就會只抽該類型的題目，適合針對弱點做專項特訓。')
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
            Util.h('span', {}, '開啟計時（目標 ' + paceTarget(draft.part) + ' 秒／題，與正式考配速一致）')
          )
        ),
        Util.h('div.card-actions', {},
          Util.h('button.btn.btn-primary.btn-block', {
            type: 'button',
            disabled: !currentPool.length || !matchedGroups,
            onClick: function () {
              startSession({
                part: draft.part, count: draft.count, mode: draft.mode,
                timerOn: draft.timerOn, skill: draft.skill || null, task: taskId
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
    var groups = sampleGroups(cfg.part, pool, cfg.count, state.wrongBook, cfg.skill);

    clearNode(hostContainer);
    if (!groups.length) {
      renderEmptyForPart(cfg.part, cfg.skill);
      return;
    }

    var now = Date.now();
    session = {
      part: cfg.part,
      mode: cfg.mode,
      timerOn: !!cfg.timerOn,
      skill: cfg.skill || null,
      task: cfg.task || null,
      requestedCount: cfg.count,
      groups: groups,
      currentIndex: 0,
      answers: {},
      revealed: {},
      qSeconds: {},      // key → 該題花掉的秒數（第一次作答時定版）
      lastAnswerAt: now, // 上一次作答的時間戳，用來切分每題耗時
      activeMarker: null,
      elapsedSeconds: 0,
      startedAt: now,
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
          '第 ' + (session.currentIndex + 1) + ' / ' + total + ' 組 · 目標每題 ' +
          paceTarget(session.part) + ' 秒 · ' +
          (session.mode === 'immediate' ? '逐題即時解析' : '交卷後解析') +
          (session.skill ? ' · 專項：' + skillLabelOf(session.part + ':' + session.skill) : ''))
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

    // 每題耗時：以「距上一次作答」估算，只在第一次作答時定版（改答案不重算）。
    var now = Date.now();
    if (session.qSeconds[key] === undefined) {
      var qSeconds = Object.assign({}, session.qSeconds);
      qSeconds[key] = Math.max(1, Math.round((now - session.lastAnswerAt) / 1000));
      patch.qSeconds = qSeconds;
    }
    patch.lastAnswerAt = now;

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

  /** 解析展開時才顯示考點徽章（作答中先揭露考點等於送分） */
  function skillBadge(part, q, revealed) {
    if (!revealed) return null;
    return Util.h('span.badge.badge-primary', {}, skillLabelOf(part + ':' + skillTagOf(part, q)));
  }

  function buildP5Body(group) {
    var key = group.id;
    var selected = session.answers[key];
    var revealed = session.mode === 'immediate' && !!session.revealed[key];
    return Util.h('div.card', {},
      revealed ? Util.h('div.card-header', {}, skillBadge('P5', group, true)) : null,
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
    var key = subKeyFor('P6', group, q);
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
    var key = subKeyFor('P7', group, q, idx);
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

    var target = paceTarget(sess.part);

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
          explanation: g.explanation_zh, selected: sel,
          skillKey: skillKeyOf('P5', g),
          seconds: sess.qSeconds[key] || 0,
          targetSeconds: target
        });
        return;
      }
      (g.questions || []).forEach(function (q, idx) {
        var n = sess.part === 'P6' ? q.n : (idx + 1);
        var subKey = subKeyFor(sess.part, g, q, idx);
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
          explanation: q.explanation_zh, selected: subSel,
          skillKey: skillKeyOf(sess.part, q),
          seconds: sess.qSeconds[subKey] || 0,
          targetSeconds: target
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
      wrongIds: result.wrongIds,
      // 逐題考點 + 秒數 → state.readingStats，閱讀診斷室據此排弱點與配速
      skillStats: result.detail.map(function (d) {
        return { key: d.skillKey, correct: d.ok, seconds: d.seconds };
      })
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
          Util.h('th', {}, '#'), Util.h('th', {}, '題目'), Util.h('th', {}, '考點'),
          Util.h('th', {}, '用時'), Util.h('th', {}, '結果')
        )),
        Util.h('tbody', {}, result.detail.map(function (d, i) {
          var over = d.seconds > d.targetSeconds;
          return Util.h('tr', { style: { cursor: 'pointer' }, onClick: function () { openReviewModal(d); } },
            Util.h('td', {}, String(i + 1)),
            Util.h('td', {}, d.label),
            Util.h('td', {}, Util.h('span.badge', {}, skillLabelOf(d.skillKey))),
            Util.h('td', {}, d.seconds
              ? Util.h('span', { class: over ? 'badge badge-warning' : '' }, d.seconds + 's')
              : Util.h('span.u-text-muted', {}, '—')),
            Util.h('td', {}, d.ok
              ? Util.h('span.badge.badge-success', {}, '✓ 正確')
              : Util.h('span.badge.badge-danger', {}, '✗ 錯誤'))
          );
        }))
      )
    );
  }

  /** 交卷後的錯因標記列（三層檢討法第一層：先講清楚為什麼錯） */
  function buildReasonRow(d, onDone) {
    var reasons = (window.TOEIC_DATA && window.TOEIC_DATA.reading && window.TOEIC_DATA.reading.reasons) || [];
    if (!reasons.length) return null;
    var current = '';
    try {
      var wb = Store.get().wrongBook || {};
      current = (wb[d.key] && wb[d.key].reason) || '';
    } catch (e) {
      current = '';
    }

    var row = Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', marginTop: '8px' } });
    reasons.forEach(function (r) {
      row.appendChild(Util.h('button', {
        type: 'button',
        class: 'btn btn-sm ' + (current === r.code ? 'btn-primary' : 'btn-ghost'),
        onClick: function () {
          try {
            Store.setWrongReason(d.key, current === r.code ? '' : r.code);
            Util.toast(current === r.code ? '已取消錯因標記' : ('已標記錯因：' + r.label), 'success');
            if (onDone) onDone();
          } catch (e) {
            Util.toast('標記失敗：' + e.message, 'error');
          }
        }
      }, r.icon + ' ' + r.label));
    });

    return Util.h('div.card', { style: { marginTop: '14px', background: 'var(--color-surface-alt)' } },
      Util.h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, '這題為什麼錯？'),
      Util.h('p.u-text-muted', { style: { fontSize: '0.85rem' } },
        '標記錯因後，錯題本會統計你最常見的失分原因，並給對應的補強做法。'),
      row
    );
  }

  function openReviewModal(d) {
    var bodyWrap = Util.h('div');

    function paint() {
      clearNode(bodyWrap);
      bodyWrap.appendChild(Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', marginBottom: '10px' } },
        Util.h('span.badge.badge-primary', {}, skillLabelOf(d.skillKey)),
        d.seconds
          ? Util.h('span', {
            class: 'badge ' + (d.seconds > d.targetSeconds ? 'badge-warning' : 'badge-success')
          }, '用時 ' + d.seconds + ' 秒／目標 ' + d.targetSeconds + ' 秒')
          : null
      ));
      bodyWrap.appendChild(Util.h('p', { style: { fontWeight: 600, marginBottom: '12px' } }, d.stem));
      bodyWrap.appendChild(buildOptionList(d.options, d.selected, true, d.answer, function () {}));
      bodyWrap.appendChild(buildExplanation(d.explanation));

      if (!d.ok) {
        var reasonCard = buildReasonRow(d, paint);
        if (reasonCard) bodyWrap.appendChild(reasonCard);
      } else {
        // 蒙對的題目不該被正確率蓋掉 — 讓使用者主動丟回錯題本
        bodyWrap.appendChild(Util.h('div.card', { style: { marginTop: '14px', background: 'var(--color-surface-alt)' } },
          Util.h('p', { style: { fontWeight: 700, marginBottom: '4px' } }, '這題是真的會，還是猜的？'),
          Util.h('button.btn.btn-ghost.btn-sm', {
            type: 'button',
            onClick: function () {
              try {
                Store.flagWrong(d.key, 'guess');
                Util.toast('已加入錯題本（錯因：沒把握用猜的）', 'success');
              } catch (e) {
                Util.toast('加入失敗：' + e.message, 'error');
              }
            }
          }, '🎲 其實是猜的，加入錯題本')
        ));
      }
    }

    paint();
    Util.modal({
      title: d.ok ? '答對了 🎉' : '答錯了，一起看解析',
      body: bodyWrap,
      actions: [{ label: '關閉', class: 'btn btn-primary' }]
    });
  }

  /** 本次作答依考點分解，直接指出哪個考點該補 */
  function buildSkillSummary(result) {
    var map = {};
    result.detail.forEach(function (d) {
      if (!map[d.skillKey]) map[d.skillKey] = { total: 0, correct: 0, seconds: 0 };
      map[d.skillKey].total += 1;
      map[d.skillKey].correct += d.ok ? 1 : 0;
      map[d.skillKey].seconds += d.seconds || 0;
    });
    var rows = Object.keys(map).map(function (key) {
      var m = map[key];
      return { key: key, label: skillLabelOf(key), total: m.total, correct: m.correct, pct: Util.pct(m.correct, m.total) };
    }).sort(function (a, b) { return a.pct - b.pct || b.total - a.total; });

    if (rows.length < 2) return null;

    var list = Util.h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' } });
    rows.forEach(function (r) {
      var tone = r.pct >= 80 ? ' is-success' : (r.pct >= 50 ? ' is-warning' : ' is-danger');
      list.appendChild(Util.h('div', {},
        Util.h('div.u-flex.u-justify-between', {},
          Util.h('span', {}, r.label),
          Util.h('span.u-text-muted', {}, r.correct + '/' + r.total + '　' + r.pct + '%')
        ),
        Util.h('div.progress-bar', { style: { marginTop: '4px' } },
          Util.h('div', { class: 'progress-bar-fill' + tone, style: { width: r.pct + '%' } })
        )
      ));
    });

    var weakest = rows[0];
    return Util.h('div.card', {},
      Util.h('div.card-title', {}, '本次考點分解'),
      Util.h('div.card-subtitle', {}, '同一個 Part 裡，不同考點的熟練度差很多 — 專項練最快'),
      list,
      weakest.pct < 70 ? Util.h('div.card-actions', {},
        Util.h('button.btn.btn-primary.btn-sm', {
          type: 'button',
          onClick: function () {
            var part = weakest.key.split(':')[0];
            var tag = weakest.key.slice(part.length + 1);
            if (window.App) window.App.navigate('#/quiz?part=' + part + '&skill=' + encodeURIComponent(tag) + '&count=10');
          }
        }, '專攻「' + weakest.label + '」10 題')
      ) : null
    );
  }

  /** 配速卡：實際每題秒數 vs 目標，換算成整份 Reading 做不做得完 */
  function buildPaceCard(result) {
    var timed = result.detail.filter(function (d) { return d.seconds > 0; });
    if (!timed.length) return null;
    var target = paceTarget(session.part);
    var totalSec = timed.reduce(function (s, d) { return s + d.seconds; }, 0);
    var avg = Math.round(totalSec / timed.length);
    var over = timed.filter(function (d) { return d.seconds > target; });
    var ratio = target ? avg / target : 1;

    var verdict, tone;
    if (ratio > 1.5) { verdict = '明顯超時 — 照這個速度正式考的閱讀會做不完'; tone = 'danger'; }
    else if (ratio > 1.15) { verdict = '略慢，還有壓縮空間'; tone = 'warning'; }
    else if (ratio < 0.6 && Util.pct(result.correct, result.total) < 70) {
      verdict = '很快但正確率偏低，比較像在猜'; tone = 'warning';
    } else { verdict = '配速在目標範圍內，保持住'; tone = 'success'; }

    return Util.h('div.card', {},
      Util.h('div.card-title', {}, '配速分析'),
      Util.h('div.card-subtitle', {},
        PART_LABELS[session.part] + ' 的目標是每題 ' + target + ' 秒（Reading 全長 75 分鐘 100 題）'),
      Util.h('div.stat-grid', { style: { marginTop: '12px' } },
        Util.h('div.stat-card', {},
          Util.h('div.stat-value', {}, avg + 's'),
          Util.h('div.stat-label', {}, '平均每題')),
        Util.h('div.stat-card', {},
          Util.h('div.stat-value', {}, target + 's'),
          Util.h('div.stat-label', {}, '目標每題')),
        Util.h('div.stat-card', {},
          Util.h('div.stat-value', {}, over.length + ' 題'),
          Util.h('div.stat-label', {}, '超過目標秒數'))
      ),
      Util.h('p', { style: { marginTop: '12px' } },
        Util.h('span', { class: 'badge badge-' + tone }, verdict))
    );
  }

  function onRetry() {
    startSession({
      part: session.part, count: session.requestedCount,
      mode: session.mode, timerOn: session.timerOn,
      skill: session.skill, task: session.task
    });
  }

  function paintResult() {
    clearNode(hostContainer);
    var result = session.result;
    var pctVal = Util.pct(result.correct, result.total);

    hostContainer.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, PART_LABELS[session.part] + ' 結果'),
        Util.h('p.view-subtitle', {},
          '共 ' + result.total + ' 題 · 用時 ' + Util.fmtTime(session.elapsedSeconds) +
          (session.skill ? ' · 專項：' + skillLabelOf(session.part + ':' + session.skill) : ''))
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

    var paceCard = buildPaceCard(result);
    if (paceCard) hostContainer.appendChild(paceCard);

    var skillCard = buildSkillSummary(result);
    if (skillCard) hostContainer.appendChild(skillCard);

    if (result.wrongIds.length) {
      hostContainer.appendChild(Util.h('div.card', {},
        Util.h('div.card-title', {}, '別讓錯題停在這裡'),
        Util.h('div.card-subtitle', {},
          '這次答錯的 ' + result.wrongIds.length + ' 題已進入錯題本，並排入 1 天後的複習。' +
          '點下方表格任一列可以看解析並標記錯因。'),
        Util.h('div.card-actions', {},
          Util.h('button.btn.btn-ghost.btn-sm', {
            type: 'button',
            onClick: function () { if (window.App) window.App.navigate('#/review'); }
          }, '去錯題本檢討')
        )
      ));
    }

    hostContainer.appendChild(Util.h('h2', { style: { fontSize: '1.05rem', margin: '20px 0 10px' } }, '逐題結果'));
    hostContainer.appendChild(buildResultTable(result));

    hostContainer.appendChild(Util.h('div.u-flex.u-gap-sm.u-mt-md', { style: { flexWrap: 'wrap' } },
      Util.h('button.btn.btn-primary', { type: 'button', onClick: onRetry }, '再做一組'),
      Util.h('button.btn.btn-ghost', {
        type: 'button',
        onClick: function () { if (window.App) window.App.navigate('#/reading'); }
      }, '看閱讀診斷'),
      Util.h('button.btn.btn-ghost', {
        type: 'button',
        onClick: function () { if (window.App) window.App.navigate('#/dashboard'); }
      }, '回儀表板')
    ));
  }

  window.Views = window.Views || {};
  window.Views.quiz = { render: render, destroy: destroy };
})();
