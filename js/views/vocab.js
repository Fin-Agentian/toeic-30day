/**
 * js/views/vocab.js — TOEIC 30 天衝刺平台
 * 單字 SRS（Leitner 5 箱）：首頁統計 → 今日學習閃卡 → 小測 → 瀏覽單字。
 * 依 docs/API_ui.md（Util / CSS class）與 docs/API_infra.md（Store / SRS / TTS）。
 * 純 IIFE，暴露 window.Views.vocab = { render, destroy }。
 */
(function () {
  'use strict';

  var TOPIC_LABELS = {
    office: '辦公室', hr: '人資', finance: '財務', marketing: '行銷',
    travel: '旅遊', logistics: '物流', manufacturing: '製造', tech: '科技',
    real_estate: '不動產', dining: '餐飲', health: '健康', general: '一般'
  };
  var INTERVAL_LABELS = ['每日', '1 天後', '3 天後', '7 天後', '14 天後'];
  var DEFAULT_NEW_LIMIT = 20;
  var QUIZ_SIZE = 10;

  // ---- module 狀態（每次 render() 重建）----
  var viewContainer = null;
  var vocabList = [];
  var vocabMap = {};
  var viewState = null;
  var keydownHandler = null;

  // ---------------------------------------------------------------------
  // 資料準備
  // ---------------------------------------------------------------------

  function loadVocabData() {
    var list = (window.TOEIC_DATA && Array.isArray(window.TOEIC_DATA.vocab)) ? window.TOEIC_DATA.vocab : [];
    var map = {};
    list.forEach(function (w) { map[w.id] = w; });
    return { list: list, map: map };
  }

  function topicLabel(topic) {
    return TOPIC_LABELS[topic] || topic || '其他';
  }

  function ttsRate() {
    var s = Store.get();
    return (s && s.settings && typeof s.settings.ttsRate === 'number') ? s.settings.ttsRate : 1.0;
  }

  function speakText(text) {
    if (!text) return;
    TTS.speak(text, { rate: ttsRate() });
  }

  // ---------------------------------------------------------------------
  // render / destroy（view 契約）
  // ---------------------------------------------------------------------

  function render(container, params) {
    viewContainer = container;
    var data = loadVocabData();
    vocabList = data.list;
    vocabMap = data.map;

    params = params || {};
    var newLimitParam = parseInt(params.newWords, 10);

    viewState = {
      screen: 'home',
      taskId: params.task ? String(params.task) : null,
      newLimit: (isFinite(newLimitParam) && newLimitParam >= 0) ? newLimitParam : DEFAULT_NEW_LIMIT,
      session: null,
      quiz: null,
      browse: { topic: '', q: '' }
    };

    keydownHandler = handleKeydown;
    document.addEventListener('keydown', keydownHandler);

    renderScreen();
  }

  function destroy() {
    if (keydownHandler) {
      document.removeEventListener('keydown', keydownHandler);
      keydownHandler = null;
    }
    TTS.stop();
    viewContainer = null;
    viewState = null;
  }

  function handleKeydown(e) {
    if (!viewState || viewState.screen !== 'session') return;
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      toggleFlip();
      return;
    }
    if (!viewState.session || !viewState.session.flipped) return;
    if (e.key === '1') { e.preventDefault(); gradeCurrent(true); }
    else if (e.key === '2') { e.preventDefault(); gradeCurrent(false); }
  }

  // ---------------------------------------------------------------------
  // 畫面切換
  // ---------------------------------------------------------------------

  function renderScreen() {
    if (!viewContainer) return;
    viewContainer.innerHTML = '';
    if (!vocabList.length) {
      viewContainer.appendChild(buildEmptyState());
      return;
    }
    switch (viewState.screen) {
      case 'session': viewContainer.appendChild(buildSession()); break;
      case 'summary': viewContainer.appendChild(buildSummary()); break;
      case 'quiz': viewContainer.appendChild(buildQuizScreen()); break;
      case 'quizSummary': viewContainer.appendChild(buildQuizSummary()); break;
      case 'browse': viewContainer.appendChild(buildBrowse()); break;
      default: viewContainer.appendChild(buildHome());
    }
  }

  function goHome() {
    viewState.screen = 'home';
    viewState.session = null;
    viewState.quiz = null;
    renderScreen();
  }

  function buildEmptyState() {
    return Util.h('div.empty-state', {},
      Util.h('div.empty-state-icon', { 'aria-hidden': 'true' }, '📭'),
      Util.h('h2', {}, '尚無單字資料'),
      Util.h('p', {}, '單字資料檔尚未載入，請確認 data/vocab_*.js 是否存在。')
    );
  }

  // ---------------------------------------------------------------------
  // 首頁統計
  // ---------------------------------------------------------------------

  function buildHome() {
    var state = Store.get();
    var cards = state.vocab || {};
    var stats = SRS.stats(cards);
    var today = Util.todayISO();
    var dueCount = 0;
    var newAvailable = 0;
    vocabList.forEach(function (w) {
      var c = cards[w.id];
      if (c) { if (SRS.isDue(c, today)) dueCount += 1; }
      else { newAvailable += 1; }
    });

    var frag = Util.h('div', {},
      Util.h('div.view-header', {},
        Util.h('div.view-title', {},
          Util.h('h1', {}, '單字卡'),
          Util.h('p.view-subtitle', {}, 'Leitner 5 箱間隔複習 · 共 ' + vocabList.length + ' 個單字')
        )
      ),
      Util.h('div.stat-grid', {},
        Util.h('div.stat-card', {}, Util.h('div.stat-value', {}, String(vocabList.length)), Util.h('div.stat-label', {}, '總字數')),
        Util.h('div.stat-card', {}, Util.h('div.stat-value', {}, String(stats.total)), Util.h('div.stat-label', {}, '已學單字')),
        Util.h('div.stat-card', {}, Util.h('div.stat-value', {}, String(dueCount)), Util.h('div.stat-label', {}, '今日待複習')),
        Util.h('div.stat-card', {}, Util.h('div.stat-value', {}, String(newAvailable)), Util.h('div.stat-label', {}, '尚未學習'))
      ),
      buildBoxCard(stats),
      buildStartCard(dueCount, newAvailable),
      Util.h('div.card', {},
        Util.h('div.card-header', {}, Util.h('div', {}, Util.h('div.card-title', {}, '其他練習'))),
        Util.h('div.card-body', {}, '從已學過的單字抽考小測，或直接瀏覽整個單字庫。'),
        Util.h('div.card-actions', {},
          Util.h('button.btn.btn-ghost', { onClick: startQuiz }, '📝 單字小測'),
          Util.h('button.btn.btn-ghost', { onClick: startBrowse }, '🔎 瀏覽單字')
        )
      )
    );
    return frag;
  }

  function buildBoxCard(stats) {
    var rows = [1, 2, 3, 4, 5].map(function (box) {
      var count = stats['box' + box];
      var pct = Util.pct(count, vocabList.length || 1);
      return Util.h('div.u-mt-md', {},
        Util.h('div.u-flex.u-justify-between', {},
          Util.h('span', {}, '箱 ' + box + '（' + INTERVAL_LABELS[box - 1] + '）'),
          Util.h('span.u-text-muted', {}, String(count) + ' 字')
        ),
        Util.h('div.progress-bar', {},
          Util.h('div.progress-bar-fill', { style: { width: pct + '%' } })
        )
      );
    });
    return Util.h('div.card', {},
      Util.h('div.card-header', {}, Util.h('div', {}, Util.h('div.card-title', {}, '各箱單字數量'))),
      Util.h('div.card-body', {}, rows)
    );
  }

  function buildStartCard(dueCount, newAvailable) {
    var taskNote = viewState.taskId
      ? Util.h('p.field-hint', {}, '完成本次學習後會自動勾選今日任務。')
      : null;
    return Util.h('div.card', {},
      Util.h('div.card-header', {}, Util.h('div', {}, Util.h('div.card-title', {}, '開始今日學習'))),
      Util.h('div.card-body', {},
        Util.h('p', {}, '今日複習：' + dueCount + ' 字 · 可學新字：' + newAvailable + ' 字'),
        Util.h('div.field', {},
          Util.h('label.field-label', { for: 'vocabNewLimit' }, '今日新字上限'),
          Util.h('input.input', {
            id: 'vocabNewLimit', type: 'number', min: '0', max: '100', step: '1',
            value: String(viewState.newLimit)
          }),
          Util.h('p.field-hint', {}, '複習到期的單字一律排入，不受此上限限制。')
        ),
        taskNote
      ),
      Util.h('div.card-actions', {},
        Util.h('button.btn.btn-primary.btn-block', { onClick: onStartSessionClick }, '🚀 開始今日學習')
      )
    );
  }

  function onStartSessionClick() {
    var input = Util.$('#vocabNewLimit', viewContainer);
    var limit = input ? Util.clamp(parseInt(input.value, 10) || 0, 0, 999) : viewState.newLimit;
    viewState.newLimit = limit;

    var state = Store.get();
    var picked = SRS.pickSession({
      cards: state.vocab || {},
      allIds: vocabList.map(function (w) { return w.id; }),
      newLimit: limit,
      reviewLimit: Infinity
    });
    var ids = picked.reviewIds.concat(picked.newIds);
    if (!ids.length) {
      Util.toast('今天沒有待複習或新字了，太棒了！', 'success');
      return;
    }
    viewState.session = { ids: ids, index: 0, flipped: false, remembered: 0, forgot: 0 };
    viewState.screen = 'session';
    renderScreen();
  }

  // ---------------------------------------------------------------------
  // 閃卡 session
  // ---------------------------------------------------------------------

  function buildSession() {
    var s = viewState.session;
    // 卡片 id 於資料中找不到時（資料異動）略過，純迴圈不觸發額外 render
    while (s.index < s.ids.length && !vocabMap[s.ids[s.index]]) { s.index += 1; }
    if (s.index >= s.ids.length) {
      applySessionCompletion();
      return buildSummary();
    }
    var word = vocabMap[s.ids[s.index]];

    var total = s.ids.length;
    var pct = Util.pct(s.index, total);

    return Util.h('div', {},
      Util.h('div.view-header', {},
        Util.h('div.view-title', {}, Util.h('h1', {}, '今日學習')),
        Util.h('button.btn.btn-ghost.btn-sm', { onClick: goHome }, '‹ 回總覽')
      ),
      Util.h('div.u-mt-md', {},
        Util.h('div.u-flex.u-justify-between', {},
          Util.h('span.u-text-muted', {}, '第 ' + (s.index + 1) + ' / ' + total + ' 張'),
          Util.h('span.u-text-muted', {}, '記得 ' + s.remembered + ' · 不記得 ' + s.forgot)
        ),
        Util.h('div.progress-bar', {}, Util.h('div.progress-bar-fill', { style: { width: pct + '%' } }))
      ),
      buildFlashcard(word, s.flipped),
      Util.h('p.u-text-center.u-text-muted.u-mt-md', {}, '點卡片或按空白鍵翻面 · 按 1 記得 / 2 不記得'),
      Util.h('div.u-flex.u-gap-md.u-justify-between.u-mt-md', {},
        Util.h('button.btn.btn-danger.btn-block', { disabled: !s.flipped, onClick: function () { gradeCurrent(false); } }, '🙁 不記得（2）'),
        Util.h('button.btn.btn-primary.btn-block', { disabled: !s.flipped, onClick: function () { gradeCurrent(true); } }, '😀 記得（1）')
      )
    );
  }

  function buildFlashcard(word, flipped) {
    var front = Util.h('div.flashcard-front', {},
      Util.h('div.flashcard-word', {}, word.word),
      Util.h('div.flashcard-pos', {}, word.pos),
      Util.h('button.icon-btn', {
        'aria-label': '播放單字發音',
        onClick: function (e) { e.stopPropagation(); speakText(word.word); }
      }, '🔊')
    );
    var back = Util.h('div.flashcard-back', {},
      Util.h('div.flashcard-zh', {}, word.zh),
      Util.h('div.flashcard-example', {}, word.example),
      Util.h('div.flashcard-example.u-text-secondary', {}, word.example_zh),
      word.collocations && word.collocations.length
        ? Util.h('p.u-text-muted.u-mt-md', {}, '常見搭配：' + word.collocations.join('、'))
        : null,
      Util.h('button.icon-btn', {
        'aria-label': '播放例句發音',
        onClick: function (e) { e.stopPropagation(); speakText(word.example); }
      }, '🔊')
    );
    return Util.h('div.flashcard' + (flipped ? '.is-flipped' : ''), { onClick: toggleFlip },
      Util.h('div.flashcard-inner', {}, front, back)
    );
  }

  function toggleFlip() {
    if (!viewState.session) return;
    viewState.session.flipped = !viewState.session.flipped;
    renderScreen();
  }

  function gradeCurrent(correct) {
    var s = viewState.session;
    if (!s || !s.flipped) return;
    var id = s.ids[s.index];
    var state = Store.get();
    var card = (state.vocab && state.vocab[id]) || SRS.initCard();
    var updated = SRS.review(card, correct, Util.todayISO());
    Store.update(['vocab', id], updated);

    if (correct) s.remembered += 1; else s.forgot += 1;
    s.index += 1;
    s.flipped = false;

    if (s.index >= s.ids.length) {
      finishSession();
      return;
    }
    renderScreen();
  }

  function applySessionCompletion() {
    viewState.screen = 'summary';
    try { Store.touchStreak(); } catch (e) { /* 忽略非致命錯誤，維持畫面可用 */ }
    if (viewState.taskId) {
      Store.completeTask(viewState.taskId);
      Util.toast('今日單字任務已完成！', 'success');
    }
  }

  function finishSession() {
    applySessionCompletion();
    renderScreen();
  }

  function buildSummary() {
    var s = viewState.session;
    return Util.h('div', {},
      Util.h('div.view-header', {}, Util.h('div.view-title', {}, Util.h('h1', {}, '學習完成'))),
      Util.h('div.empty-state', {},
        Util.h('div.empty-state-icon', { 'aria-hidden': 'true' }, '🎉'),
        Util.h('h2', {}, '本次學習了 ' + s.ids.length + ' 個單字'),
        Util.h('p', {}, '記得 ' + s.remembered + ' 個 · 不記得 ' + s.forgot + ' 個，不記得的單字已排回箱 1。'),
        Util.h('button.btn.btn-primary', { onClick: goHome }, '回總覽')
      )
    );
  }

  // ---------------------------------------------------------------------
  // 小測
  // ---------------------------------------------------------------------

  function startQuiz() {
    var state = Store.get();
    var learnedIds = Object.keys(state.vocab || {}).filter(function (id) { return !!vocabMap[id]; });
    if (learnedIds.length < 4) {
      Util.toast('已學單字太少（至少需要 4 個），請先完成幾次今日學習。', 'warning');
      return;
    }
    var pickedIds = Util.sample(learnedIds, Math.min(QUIZ_SIZE, learnedIds.length));
    var questions = pickedIds.map(buildQuizQuestion);

    viewState.quiz = { questions: questions, index: 0, answered: false, correctCount: 0, wrongIds: [] };
    viewState.screen = 'quiz';
    renderScreen();
  }

  function buildQuizQuestion(id) {
    var word = vocabMap[id];
    var direction = Math.random() < 0.5 ? 'en2zh' : 'zh2en';
    var pool = vocabList.filter(function (w) { return w.id !== id; });
    var distractors = Util.sample(pool, 3);
    var candidates = distractors.concat([word]);
    var options = Util.shuffle(candidates.map(function (w) {
      return { text: direction === 'en2zh' ? w.zh : w.word, isCorrect: w.id === id };
    }));
    return { id: id, word: word, direction: direction, options: options };
  }

  function buildQuizScreen() {
    var q = viewState.quiz;
    var question = q.questions[q.index];
    var total = q.questions.length;
    var promptText = question.direction === 'en2zh'
      ? question.word.word + '（' + question.word.pos + '）'
      : question.word.zh;
    var promptLabel = question.direction === 'en2zh' ? '請選出正確的中文意思' : '請選出正確的英文單字';

    var optionButtons = question.options.map(function (opt, i) {
      var cls = 'option-btn';
      if (q.answered) {
        if (opt.isCorrect) cls += ' is-correct';
        else if (opt.selected) cls += ' is-incorrect';
      }
      return Util.h('button.' + cls.split(' ').join('.'), {
        disabled: q.answered,
        onClick: function () { answerQuiz(opt); }
      },
        Util.h('span.option-label', {}, String.fromCharCode(65 + i)),
        Util.h('span.option-text', {}, opt.text),
        q.answered && opt.isCorrect ? Util.h('span.option-mark', {}, '✓') : null,
        q.answered && opt.selected && !opt.isCorrect ? Util.h('span.option-mark', {}, '✗') : null
      );
    });

    return Util.h('div', {},
      Util.h('div.view-header', {},
        Util.h('div.view-title', {}, Util.h('h1', {}, '單字小測')),
        Util.h('button.btn.btn-ghost.btn-sm', { onClick: goHome }, '‹ 回總覽')
      ),
      Util.h('p.u-text-muted', {}, '第 ' + (q.index + 1) + ' / ' + total + ' 題 · 答對 ' + q.correctCount + ' 題'),
      Util.h('div.card', {},
        Util.h('div.card-body', {},
          Util.h('p.u-text-muted', {}, promptLabel),
          Util.h('h2', {}, promptText)
        )
      ),
      Util.h('div.option-list.u-mt-md', {}, optionButtons),
      q.answered
        ? Util.h('button.btn.btn-primary.btn-block.u-mt-md', { onClick: nextQuizQuestion }, q.index + 1 >= total ? '看結果' : '下一題')
        : null
    );
  }

  function answerQuiz(opt) {
    var q = viewState.quiz;
    if (q.answered) return;
    q.answered = true;
    opt.selected = true;

    var question = q.questions[q.index];
    if (opt.isCorrect) {
      q.correctCount += 1;
    } else {
      q.wrongIds.push(question.id);
      var state = Store.get();
      var card = (state.vocab && state.vocab[question.id]) || SRS.initCard();
      Store.update(['vocab', question.id], SRS.review(card, false, Util.todayISO()));
    }
    renderScreen();
  }

  function nextQuizQuestion() {
    var q = viewState.quiz;
    q.index += 1;
    if (q.index >= q.questions.length) {
      viewState.screen = 'quizSummary';
      try { Store.touchStreak(); } catch (e) { /* 忽略非致命錯誤 */ }
    } else {
      q.answered = false;
    }
    renderScreen();
  }

  function buildQuizSummary() {
    var q = viewState.quiz;
    var total = q.questions.length;
    var wrongWords = q.wrongIds.map(function (id) { return vocabMap[id]; }).filter(Boolean);

    return Util.h('div', {},
      Util.h('div.view-header', {}, Util.h('div.view-title', {}, Util.h('h1', {}, '小測結果'))),
      Util.h('div.empty-state', {},
        Util.h('div.empty-state-icon', { 'aria-hidden': 'true' }, q.correctCount === total ? '🏆' : '📝'),
        Util.h('h2', {}, '答對 ' + q.correctCount + ' / ' + total + ' 題'),
        Util.h('p', {}, '答錯的單字已降回箱 1，會提早安排複習。')
      ),
      wrongWords.length ? Util.h('div.card', {},
        Util.h('div.card-header', {}, Util.h('div', {}, Util.h('div.card-title', {}, '本次答錯的單字'))),
        Util.h('div.card-body', {}, wrongWords.map(function (w) {
          return Util.h('p', {}, w.word + '　' + w.zh);
        }))
      ) : null,
      Util.h('div.u-mt-md', {}, Util.h('button.btn.btn-primary', { onClick: goHome }, '回總覽'))
    );
  }

  // ---------------------------------------------------------------------
  // 瀏覽
  // ---------------------------------------------------------------------

  function startBrowse() {
    viewState.browse = { topic: '', q: '' };
    viewState.screen = 'browse';
    renderScreen();
  }

  function buildBrowse() {
    var topics = [];
    vocabList.forEach(function (w) { if (topics.indexOf(w.topic) === -1) topics.push(w.topic); });
    topics.sort();

    var resultsEl = Util.h('div.u-mt-md', {});

    var topicSelect = Util.h('select.select', {
      id: 'vocabTopicSelect',
      onChange: function (e) { viewState.browse.topic = e.target.value; renderBrowseResults(resultsEl); }
    },
      Util.h('option', { value: '' }, '全部主題'),
      topics.map(function (t) { return Util.h('option', { value: t }, topicLabel(t)); })
    );

    var searchInput = Util.h('input.input', {
      id: 'vocabSearchInput', type: 'search', placeholder: '搜尋英文單字或中文意思…',
      onInput: Util.debounce(function (e) {
        viewState.browse.q = e.target.value;
        renderBrowseResults(resultsEl);
      }, 250)
    });

    var frag = Util.h('div', {},
      Util.h('div.view-header', {},
        Util.h('div.view-title', {}, Util.h('h1', {}, '瀏覽單字')),
        Util.h('button.btn.btn-ghost.btn-sm', { onClick: goHome }, '‹ 回總覽')
      ),
      Util.h('div.u-flex.u-gap-md', {},
        Util.h('div.field', { style: { flex: '1 1 200px' } },
          Util.h('label.field-label', { for: 'vocabTopicSelect' }, '主題'), topicSelect),
        Util.h('div.field', { style: { flex: '2 1 260px' } },
          Util.h('label.field-label', { for: 'vocabSearchInput' }, '搜尋'), searchInput)
      ),
      resultsEl
    );
    renderBrowseResults(resultsEl);
    return frag;
  }

  function renderBrowseResults(resultsEl) {
    var topic = viewState.browse.topic;
    var q = viewState.browse.q.trim().toLowerCase();
    var filtered = vocabList.filter(function (w) {
      if (topic && w.topic !== topic) return false;
      if (!q) return true;
      return w.word.toLowerCase().indexOf(q) !== -1 || w.zh.toLowerCase().indexOf(q) !== -1;
    });

    resultsEl.innerHTML = '';
    if (!filtered.length) {
      resultsEl.appendChild(Util.h('div.empty-state', {},
        Util.h('div.empty-state-icon', { 'aria-hidden': 'true' }, '🔍'),
        Util.h('h2', {}, '沒有符合的單字'),
        Util.h('p', {}, '試試更換主題或搜尋關鍵字。')
      ));
      return;
    }

    var truncated = filtered.length > 300;
    var shown = truncated ? filtered.slice(0, 300) : filtered;
    var state = Store.get();
    var cards = state.vocab || {};

    var rows = shown.map(function (w) {
      var card = cards[w.id];
      var statusText = card ? ('箱 ' + card.box) : '尚未學習';
      return Util.h('tr', {},
        Util.h('td', {},
          Util.h('button.icon-btn', { 'aria-label': '播放發音', onClick: function () { speakText(w.word); } }, '🔊'),
          ' ' + w.word
        ),
        Util.h('td', {}, w.pos),
        Util.h('td', {}, w.zh),
        Util.h('td', {}, topicLabel(w.topic)),
        Util.h('td', {}, w.level === 'advanced' ? '進階' : '核心'),
        Util.h('td', {}, statusText)
      );
    });

    resultsEl.appendChild(Util.h('p.u-text-muted', {}, '共 ' + filtered.length + ' 筆' + (truncated ? '（僅顯示前 300 筆，請縮小搜尋範圍）' : '')));
    resultsEl.appendChild(Util.h('div.table-wrap', {},
      Util.h('table.table', {},
        Util.h('thead', {}, Util.h('tr', {},
          Util.h('th', {}, '單字'), Util.h('th', {}, '詞性'), Util.h('th', {}, '中文'),
          Util.h('th', {}, '主題'), Util.h('th', {}, '程度'), Util.h('th', {}, '狀態')
        )),
        Util.h('tbody', {}, rows)
      )
    ));
  }

  window.Views = window.Views || {};
  window.Views.vocab = { render: render, destroy: destroy };
})();
