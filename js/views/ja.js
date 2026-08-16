/**
 * js/views/ja.js — 日語模組的全部畫面
 *
 * 一個檔註冊 6 個路由：ja / ja-kana / ja-vocab / ja-grammar / ja-quiz / ja-review。
 * 大部分邏輯都由 js/langui.js 的四個 view 工廠提供，本檔主要是「設定 + 日語專屬的
 * 五十音表與文法閱讀畫面」，所以雖然頁面多，程式碼很短。
 *
 * 另外提供 window.LangContent.ja.summary(store)，讓 #/hub 的日語卡片能顯示進度。
 *
 * 依賴：window.LangUI、window.LangStore、window.Util、window.LANG_DATA.ja
 */
(function () {
  'use strict';

  var LANG = 'ja';

  function h() { return Util.h.apply(null, arguments); }
  function D() { return (window.LANG_DATA && window.LANG_DATA.ja) || {}; }
  function store() { return window.LangStore.for(LANG); }
  function shuffle(a) { return Util.shuffle(a || []); }

  function kana() { return D().kana || []; }
  function vocab() { return D().vocab || []; }
  function grammar() { return D().grammar || []; }
  function particleQuiz() { return D().particleQuiz || []; }

  function kanaIds() { return kana().map(function (k) { return k.id; }); }
  function vocabIds() { return vocab().map(function (v) { return v.id; }); }

  // -----------------------------------------------------------------------
  // #/hub 的進度摘要
  // -----------------------------------------------------------------------

  window.LangContent = window.LangContent || {};
  window.LangContent.ja = {
    summary: function (st) {
      var all = kanaIds().concat(vocabIds());
      var s = st.cardStats(all);
      return { mastered: s.mastered, total: s.total, unit: '（音＋單字）' };
    }
  };

  // -----------------------------------------------------------------------
  // 學習總覽 #/ja
  // -----------------------------------------------------------------------

  var homeView = LangUI.createHome({
    lang: LANG,
    title: '日語學習總覽',
    subtitle: '從五十音開始，一路到 N5 的單字與文法',
    sections: function () {
      return [
        { id: 'kana', icon: '🈁', label: '五十音', hash: '#/ja-kana',
          desc: '清音 46・濁音 20・半濁音 5・拗音 33，共 104 音', ids: kanaIds() },
        { id: 'vocab', icon: '📚', label: 'N5 單字', hash: '#/ja-vocab',
          desc: vocab().length + ' 個 N5 核心單字，附例句與發音', ids: vocabIds() },
        { id: 'grammar', icon: '📐', label: 'N5 文法', hash: '#/ja-grammar',
          desc: grammar().length + ' 條句型，依「學完就能造句」的順序排列',
          lessonIds: grammar().map(function (g) { return g.id; }) },
        { id: 'quiz', icon: '✏️', label: '綜合測驗', hash: '#/ja-quiz',
          desc: '單字、讀音、助詞填空，錯的自動進錯題本' }
      ];
    },
    /** 依「先五十音、再單字、最後文法」的順序給下一步建議 */
    nextStep: function (state, st) {
      var kStats = st.cardStats(kanaIds());
      var seionIds = kana().filter(function (k) { return k.type === 'seion'; })
        .map(function (k) { return k.id; });
      var seion = st.cardStats(seionIds);

      if (seion.mastered < seionIds.length) {
        return {
          title: '先把清音 46 音搞定',
          detail: '目前熟練 ' + seion.mastered + ' / ' + seionIds.length +
            ' 個清音。五十音沒過關，後面的單字都會卡住 — 這是唯一需要硬記的一關，撐過去就好走了。',
          actionLabel: '練五十音', hash: '#/ja-kana'
        };
      }
      if (kStats.mastered < kStats.total) {
        return {
          title: '接著把濁音、半濁音與拗音補完',
          detail: '清音已經過關了。剩下的 ' + (kStats.total - kStats.mastered) +
            ' 個音多半是規則變化（加兩點、加小圈、配小ゃゅょ），比清音好記很多。',
          actionLabel: '繼續練五十音', hash: '#/ja-kana'
        };
      }
      var vStats = st.cardStats(vocabIds());
      if (vStats.mastered < vStats.total * 0.5) {
        return {
          title: '開始累積 N5 單字',
          detail: '五十音已經熟了，現在每天背 10 個單字。目前熟練 ' +
            vStats.mastered + ' / ' + vStats.total + ' 個。',
          actionLabel: '背單字', hash: '#/ja-vocab'
        };
      }
      var doneG = grammar().filter(function (g) { return st.isLessonDone(g.id); }).length;
      if (doneG < grammar().length) {
        return {
          title: '單字有底了，開始讀文法',
          detail: '已讀 ' + doneG + ' / ' + grammar().length +
            ' 條句型。有了單字再看文法，例句才看得懂，吸收會快很多。',
          actionLabel: '讀文法', hash: '#/ja-grammar'
        };
      }
      return {
        title: '該用測驗檢驗成果了',
        detail: '五十音、單字、文法都走過一輪。用綜合測驗找出還不穩的地方，錯的會自動進錯題本。',
        actionLabel: '做綜合測驗', hash: '#/ja-quiz'
      };
    }
  });

  // -----------------------------------------------------------------------
  // 五十音 #/ja-kana（三個分頁：表格 / 閃卡 / 測驗）
  // -----------------------------------------------------------------------

  var kanaDeck = LangUI.createDeck({
    lang: LANG,
    title: '五十音閃卡',
    subtitle: '看假名想讀音，記得就按「記得」，SRS 會自動安排複習',
    frontLabel: '假名', frontSubLabel: '羅馬拼音', backLabel: '片假名',
    alwaysShowFrontSub: false,
    items: function () {
      return kana().map(function (k) {
        return {
          id: k.id,
          front: k.h,
          frontSub: k.romaji,
          back: k.romaji,
          backSub: '片假名：' + k.k,
          example: k.tip || null,
          exampleZh: null
        };
      });
    },
    ttsTextOf: function (item) { return item.front; },
    groups: function () {
      return (D().kanaTypes || []).map(function (t) { return { code: t.code, label: t.label }; });
    }(),
    groupOf: function (item) {
      var k = kana().filter(function (x) { return x.id === item.id; })[0];
      return k ? k.type : '';
    }
  });

  var kanaDrill = LangUI.createDrill({
    lang: LANG,
    title: '五十音測驗',
    subtitle: '認讀練習。答錯的會進錯題本，隔天再考你一次。',
    unit: 'kana',
    counts: [10, 20, 30],
    modes: [
      { code: 'h2r', label: '平假名 → 讀音', hint: '看平假名選出正確的羅馬拼音。' },
      { code: 'r2h', label: '讀音 → 平假名', hint: '看羅馬拼音選出正確的平假名，比認讀難一點。' },
      { code: 'k2r', label: '片假名 → 讀音', hint: '片假名是外來語的關鍵，ソ/ン、シ/ツ 特別容易混。' },
      { code: 'h2k', label: '平假名 → 片假名', hint: '同一個音的兩種寫法互相對應。' }
    ],
    buildQuestions: function (mode, count) {
      var pool = kana();
      if (!pool.length) return [];
      var picked = shuffle(pool).slice(0, Math.min(count, pool.length));

      return picked.map(function (k) {
        var others = shuffle(pool.filter(function (x) { return x.id !== k.id; })).slice(0, 3);
        var prompt, correct, optionOf, ttsText;

        if (mode === 'r2h') {
          prompt = k.romaji; correct = k.h;
          optionOf = function (x) { return x.h; };
          ttsText = k.h;
        } else if (mode === 'k2r') {
          prompt = k.k; correct = k.romaji;
          optionOf = function (x) { return x.romaji; };
          ttsText = k.h;
        } else if (mode === 'h2k') {
          prompt = k.h; correct = k.k;
          optionOf = function (x) { return x.k; };
          ttsText = k.h;
        } else {
          prompt = k.h; correct = k.romaji;
          optionOf = function (x) { return x.romaji; };
          ttsText = k.h;
        }

        var opts = shuffle([correct].concat(others.map(optionOf)));
        // 去重後若不足 4 個選項就補到 4 個（濁音表裡 ji/zu 有同音字）
        var seen = {};
        opts = opts.filter(function (o) {
          if (seen[o]) return false;
          seen[o] = true;
          return true;
        });
        var backfill = shuffle(pool).map(optionOf);
        for (var i = 0; i < backfill.length && opts.length < 4; i++) {
          if (!seen[backfill[i]]) { seen[backfill[i]] = true; opts.push(backfill[i]); }
        }
        opts = shuffle(opts);

        return {
          id: k.id,
          prompt: prompt,
          promptSub: null,
          ttsText: ttsText,
          options: opts,
          answer: opts.indexOf(correct),
          explain: k.h + '（' + k.k + '）＝ ' + k.romaji + (k.tip ? '　' + k.tip : '')
        };
      });
    }
  });

  var kanaView = (function () {
    var TABS = [
      { code: 'table', label: '五十音表', icon: '📋' },
      { code: 'deck', label: '閃卡', icon: '🃏' },
      { code: 'drill', label: '測驗', icon: '✏️' }
    ];
    var S = null;
    var host = null;

    function buildTable() {
      var wrap = h('div');
      var types = D().kanaTypes || [];

      wrap.appendChild(h('div.card', {},
        h('div.card-title', {}, '建議學習順序'),
        h('div.card-body', {},
          (D().kanaPlan || []).map(function (p) {
            return h('div', { style: { marginTop: '10px' } },
              h('strong', {}, p.label),
              h('p.u-text-muted', { style: { fontSize: '0.85rem', marginTop: '2px' } }, p.note)
            );
          })
        )
      ));

      types.forEach(function (t) {
        var rows = kana().filter(function (k) { return k.type === t.code; });
        if (!rows.length) return;

        var grid = h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
            gap: '8px',
            marginTop: '12px'
          }
        }, rows.map(function (k) {
          return h('button', {
            type: 'button',
            class: 'card card-clickable',
            style: { textAlign: 'center', padding: '10px 6px', cursor: 'pointer' },
            title: k.tip || (k.h + ' = ' + k.romaji),
            onClick: function () {
              if (window.TTS && TTS.isSupported()) {
                var rate = 1.0;
                try { rate = store().get().settings.ttsRate; } catch (e) { rate = 1.0; }
                TTS.speak(k.h, { lang: 'ja-JP', rate: rate });
              }
              if (k.tip) Util.toast(k.h + '：' + k.tip, 'info');
            }
          },
            h('div', { style: { fontSize: '1.5rem', fontWeight: '700', lineHeight: '1.2' } }, k.h),
            h('div', { style: { fontSize: '1rem', color: 'var(--color-text-secondary)' } }, k.k),
            h('div', { style: { fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '2px' } }, k.romaji)
          );
        }));

        wrap.appendChild(h('div.card', {},
          h('div.card-title', {}, t.label + '（' + rows.length + ' 音）'),
          h('div.card-subtitle', {}, t.desc),
          grid,
          h('p.u-text-muted', { style: { fontSize: '0.8rem', marginTop: '10px' } },
            '點任一個字可以聽發音；有發音提示的字會跳出說明。')
        ));
      });

      return wrap;
    }

    function paint() {
      LangUI.clearNode(host);
      host.appendChild(LangUI.langHeader(LANG, '五十音',
        '共 ' + kana().length + ' 音。先讀表、再用閃卡記、最後用測驗檢查。'));

      var tabRow = h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', marginBottom: '16px' } });
      TABS.forEach(function (t) {
        tabRow.appendChild(h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (S.tab === t.code ? 'btn-primary' : 'btn-ghost'),
          onClick: function () { S.tab = t.code; paint(); }
        }, t.icon + ' ' + t.label));
      });
      host.appendChild(tabRow);

      var slot = h('div');
      host.appendChild(slot);

      if (S.tab === 'deck') kanaDeck.render(slot, {});
      else if (S.tab === 'drill') kanaDrill.render(slot, {});
      else slot.appendChild(buildTable());
    }

    return {
      render: function (container, params) {
        host = container;
        S = { tab: (params && params.tab) || 'table' };
        paint();
      },
      destroy: function () {
        try { kanaDeck.destroy(); } catch (e) { /* 尚未 render 過 */ }
        try { kanaDrill.destroy(); } catch (e) { /* 尚未 render 過 */ }
        if (window.TTS) TTS.stop();
        S = null;
        host = null;
      }
    };
  })();

  // -----------------------------------------------------------------------
  // N5 單字 #/ja-vocab
  // -----------------------------------------------------------------------

  var VOCAB_TOPICS = [
    { code: 'people', label: '人與家族' },
    { code: 'daily', label: '日常事物' },
    { code: 'place', label: '場所' },
    { code: 'time', label: '時間' },
    { code: 'adj', label: '形容詞' },
    { code: 'number', label: '數量' },
    { code: 'demo', label: '指示詞' }
  ];

  var vocabView = LangUI.createDeck({
    lang: LANG,
    title: 'N5 單字',
    subtitle: '正面是日文，翻面看中文與例句。每天固定量比一次衝刺有效。',
    frontLabel: '單字', frontSubLabel: '讀音', backLabel: '中文',
    alwaysShowFrontSub: false,
    items: function () {
      return vocab().map(function (v) {
        return {
          id: v.id,
          front: v.w,
          frontSub: v.kana + '　' + v.romaji,
          back: v.zh,
          backSub: '（' + v.pos + '）',
          example: v.ex ? (v.ex + '　' + (v.exKana || '')) : null,
          exampleZh: v.exZh || null
        };
      });
    },
    ttsTextOf: function (item) {
      var v = vocab().filter(function (x) { return x.id === item.id; })[0];
      return v ? (v.kana || v.w) : item.front;
    },
    groups: VOCAB_TOPICS,
    groupOf: function (item) {
      var v = vocab().filter(function (x) { return x.id === item.id; })[0];
      return v ? v.topic : '';
    }
  });

  // -----------------------------------------------------------------------
  // N5 文法 #/ja-grammar
  // -----------------------------------------------------------------------

  var grammarView = (function () {
    var S = null;
    var host = null;

    function card(g, st) {
      var done = st.isLessonDone(g.id);
      return h('div.card', { id: g.id },
        h('div.card-header', {},
          h('div', {},
            h('div.card-title', {}, g.title),
            h('div.card-subtitle', {}, g.pattern)
          ),
          done ? h('span.badge.badge-success', {}, '✓ 已讀') : null
        ),
        h('div.card-body', {},
          h('p', { style: { fontWeight: '600' } }, g.meaning),
          h('div', { style: { marginTop: '10px' } },
            h('strong', {}, '規則'),
            h('ul', { style: { margin: '6px 0 0 20px', display: 'flex', flexDirection: 'column', gap: '3px' } },
              g.formation.map(function (f) { return h('li', {}, f); }))
          ),
          h('div', { style: { marginTop: '12px' } },
            h('strong', {}, '例句'),
            g.examples.map(function (ex) {
              return h('div.card', { style: { marginTop: '8px', background: 'var(--color-surface-alt)' } },
                h('div.u-flex.u-items-center.u-gap-sm', { style: { flexWrap: 'wrap' } },
                  h('span', { style: { fontSize: '1.05rem', fontWeight: '600' } }, ex.ja),
                  LangUI.ttsButton(ex.kana || ex.ja, LANG, { small: true })
                ),
                h('div.u-text-muted', { style: { fontSize: '0.85rem', marginTop: '2px' } }, ex.kana),
                h('div', { style: { marginTop: '4px' } }, ex.zh)
              );
            })
          ),
          g.note ? h('p', { style: { marginTop: '12px' } },
            h('span.badge.badge-warning', {}, '注意'), ' ', g.note) : null
        ),
        h('div.card-actions', {},
          h('button', {
            type: 'button',
            class: 'btn btn-sm ' + (done ? 'btn-ghost' : 'btn-primary'),
            onClick: function () {
              if (done) return;
              try {
                st.completeLesson(g.id);
                Util.toast('已標記「' + g.title + '」為已讀', 'success');
              } catch (e) {
                Util.toast('標記失敗：' + e.message, 'error');
              }
              paint();
            }
          }, done ? '已讀過' : '標記為已讀')
        )
      );
    }

    function paint() {
      LangUI.clearNode(host);
      var st = store();
      var steps = D().grammarSteps || [];
      var all = grammar();
      var doneCount = all.filter(function (g) { return st.isLessonDone(g.id); }).length;

      host.appendChild(LangUI.langHeader(LANG, 'N5 文法',
        '共 ' + all.length + ' 條句型 · 已讀 ' + doneCount + ' 條'));

      host.appendChild(h('div.card', {},
        h('div.card-title', {}, '整體進度'),
        h('div', { style: { marginTop: '10px' } }, LangUI.progressBar(doneCount, all.length)),
        h('p.u-text-muted', { style: { fontSize: '0.85rem', marginTop: '6px' } },
          '句型依「學完就能立刻造句」的順序排列，建議照順序讀。')
      ));

      var chipRow = h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
      [{ code: 'all', label: '全部' }].concat(steps.map(function (s) {
        return { code: s.code, label: s.label };
      })).forEach(function (s) {
        var n = s.code === 'all' ? all.length
          : all.filter(function (g) { return g.step === s.code; }).length;
        chipRow.appendChild(h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (S.step === s.code ? 'btn-primary' : 'btn-ghost'),
          onClick: function () { S.step = s.code; paint(); }
        }, s.label + '（' + n + '）'));
      });
      host.appendChild(h('div.card', {},
        h('div.card-subtitle', { style: { marginTop: 0 } }, '階段'),
        h('div', { style: { marginTop: '8px' } }, chipRow)
      ));

      var shown = S.step === 'all' ? all : all.filter(function (g) { return g.step === S.step; });
      var currentStep = steps.filter(function (s) { return s.code === S.step; })[0];
      if (currentStep) {
        host.appendChild(h('p.u-text-muted', { style: { margin: '12px 0' } }, currentStep.desc));
      }

      var list = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } });
      shown.forEach(function (g) { list.appendChild(card(g, st)); });
      host.appendChild(list);
    }

    return {
      render: function (container, params) {
        host = container;
        S = { step: (params && params.step) || 'all' };
        paint();
      },
      destroy: function () {
        if (window.TTS) TTS.stop();
        S = null;
        host = null;
      }
    };
  })();

  // -----------------------------------------------------------------------
  // 綜合測驗 #/ja-quiz
  // -----------------------------------------------------------------------

  function distinctOptions(correct, candidates, optionOf) {
    var seen = {};
    seen[correct] = true;
    var out = [correct];
    for (var i = 0; i < candidates.length && out.length < 4; i++) {
      var v = optionOf(candidates[i]);
      if (v && !seen[v]) { seen[v] = true; out.push(v); }
    }
    return out;
  }

  var quizView = LangUI.createDrill({
    lang: LANG,
    title: '日語綜合測驗',
    subtitle: '單字、讀音與助詞。答錯的自動進錯題本，用 Leitner 排程複習。',
    unit: 'mixed',
    counts: [10, 20, 30],
    modes: [
      { code: 'w2zh', label: '看日文選中文', hint: '最基本的單字辨識。' },
      { code: 'zh2w', label: '看中文選日文', hint: '比認字難，要能主動想起來。' },
      { code: 'reading', label: '看漢字選讀音', hint: '日文漢字的讀音是初學最大的門檻。' },
      { code: 'particle', label: '助詞填空', hint: '從 ' + particleQuiz().length + ' 題手寫題庫抽題，每題附判斷理由。' }
    ],
    buildQuestions: function (mode, count) {
      if (mode === 'particle') {
        var bank = particleQuiz();
        if (!bank.length) return [];
        return shuffle(bank).slice(0, Math.min(count, bank.length)).map(function (q) {
          return {
            id: q.id,
            prompt: q.sentence,
            promptSub: q.kana,
            promptLarge: false,
            ttsText: null, // 句子挖空了，唸出來會很怪
            options: q.options.slice(),
            answer: q.answer,
            explain: q.zh + '　' + q.why
          };
        });
      }

      var pool = vocab();
      if (!pool.length) return [];

      if (mode === 'reading') {
        // 只考含漢字的字，純假名的字沒有「讀音題」可言
        pool = pool.filter(function (v) { return /[一-鿿]/.test(v.w); });
        if (!pool.length) return [];
      }

      var picked = shuffle(pool).slice(0, Math.min(count, pool.length));

      return picked.map(function (v) {
        var others = shuffle(pool.filter(function (x) { return x.id !== v.id; }));
        var prompt, correct, optionOf, promptSub, ttsText, explain;

        if (mode === 'zh2w') {
          prompt = v.zh; correct = v.w;
          optionOf = function (x) { return x.w; };
          promptSub = null; ttsText = null;
          explain = v.w + '（' + v.kana + '）= ' + v.zh;
        } else if (mode === 'reading') {
          prompt = v.w; correct = v.kana;
          optionOf = function (x) { return x.kana; };
          promptSub = v.zh; ttsText = v.kana;
          explain = v.w + ' 唸作 ' + v.kana + '（' + v.romaji + '）';
        } else {
          prompt = v.w; correct = v.zh;
          optionOf = function (x) { return x.zh; };
          promptSub = v.kana; ttsText = v.kana;
          explain = v.w + '（' + v.kana + '）= ' + v.zh;
        }

        if (v.ex) explain += '　例：' + v.ex + '（' + v.exZh + '）';

        var opts = shuffle(distinctOptions(correct, others, optionOf));
        return {
          id: v.id,
          prompt: prompt,
          promptSub: promptSub,
          ttsText: ttsText,
          options: opts,
          answer: opts.indexOf(correct),
          explain: explain
        };
      });
    }
  });

  // -----------------------------------------------------------------------
  // 錯題本 #/ja-review
  // -----------------------------------------------------------------------

  var reviewView = LangUI.createWrongBook({
    lang: LANG,
    title: '日語錯題本',
    /** 錯題 id 可能來自五十音、單字或助詞題庫，依前綴分流還原題目 */
    resolve: function (id) {
      if (/^jk-/.test(id)) {
        var k = kana().filter(function (x) { return x.id === id; })[0];
        if (!k) return null;
        var others = shuffle(kana().filter(function (x) { return x.id !== id; }));
        var opts = shuffle(distinctOptions(k.romaji, others, function (x) { return x.romaji; }));
        return {
          prompt: k.h, promptSub: '片假名：' + k.k, ttsText: k.h,
          options: opts, answer: opts.indexOf(k.romaji),
          explain: k.h + '（' + k.k + '）＝ ' + k.romaji + (k.tip ? '　' + k.tip : '')
        };
      }
      if (/^jv-/.test(id)) {
        var v = vocab().filter(function (x) { return x.id === id; })[0];
        if (!v) return null;
        var vOthers = shuffle(vocab().filter(function (x) { return x.id !== id; }));
        var vOpts = shuffle(distinctOptions(v.zh, vOthers, function (x) { return x.zh; }));
        return {
          prompt: v.w, promptSub: v.kana, ttsText: v.kana,
          options: vOpts, answer: vOpts.indexOf(v.zh),
          explain: v.w + '（' + v.kana + '）= ' + v.zh +
            (v.ex ? '　例：' + v.ex + '（' + v.exZh + '）' : '')
        };
      }
      if (/^jq-/.test(id)) {
        var q = particleQuiz().filter(function (x) { return x.id === id; })[0];
        if (!q) return null;
        return {
          prompt: q.sentence, promptSub: q.kana, ttsText: null,
          options: q.options.slice(), answer: q.answer,
          explain: q.zh + '　' + q.why
        };
      }
      return null;
    }
  });

  // -----------------------------------------------------------------------
  // 註冊
  // -----------------------------------------------------------------------

  window.Views = window.Views || {};
  window.Views.ja = homeView;
  window.Views['ja-kana'] = kanaView;
  window.Views['ja-vocab'] = vocabView;
  window.Views['ja-grammar'] = grammarView;
  window.Views['ja-quiz'] = quizView;
  window.Views['ja-review'] = reviewView;
})();
