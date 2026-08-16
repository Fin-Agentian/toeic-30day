/**
 * js/views/es.js — 西班牙語模組的全部畫面
 *
 * 註冊 7 個路由：es / es-sounds / es-verbs / es-vocab / es-phrases / es-quiz / es-review。
 * 結構與 js/views/ja.js 對稱，同樣把大部分工作交給 js/langui.js 的 view 工廠，
 * 本檔只負責西語專屬的發音規則、動詞變位表與句型清單畫面。
 *
 * 動詞變位是 A1 最大的關卡，所以 es-verbs 除了看變位表，也提供「填變位」的專項練習。
 *
 * 依賴：window.LangUI、window.LangStore、window.Util、window.LANG_DATA.es
 */
(function () {
  'use strict';

  var LANG = 'es';

  function h() { return Util.h.apply(null, arguments); }
  function D() { return (window.LANG_DATA && window.LANG_DATA.es) || {}; }
  function store() { return window.LangStore.for(LANG); }
  function shuffle(a) { return Util.shuffle(a || []); }

  function sounds() { return D().sounds || []; }
  function verbs() { return D().verbs || []; }
  function vocab() { return D().vocab || []; }
  function phrases() { return D().phrases || []; }
  function persons() { return D().persons || []; }

  function vocabIds() { return vocab().map(function (v) { return v.id; }); }
  /** 每個動詞的每個人稱各是一張 SRS 卡：esvb-<verbId>-<personIndex> */
  function verbCardIds() {
    var out = [];
    verbs().forEach(function (v) {
      for (var i = 0; i < 6; i++) out.push('esvb-' + v.id + '-' + i);
    });
    return out;
  }

  function verbOfCardId(id) {
    var m = /^esvb-(.+)-(\d)$/.exec(id);
    if (!m) return null;
    var v = verbs().filter(function (x) { return x.id === m[1]; })[0];
    return v ? { verb: v, person: parseInt(m[2], 10) } : null;
  }

  // -----------------------------------------------------------------------
  // #/hub 的進度摘要
  // -----------------------------------------------------------------------

  window.LangContent = window.LangContent || {};
  window.LangContent.es = {
    summary: function (st) {
      var all = vocabIds().concat(verbCardIds());
      var s = st.cardStats(all);
      return { mastered: s.mastered, total: s.total, unit: '（單字＋變位）' };
    }
  };

  // -----------------------------------------------------------------------
  // 學習總覽 #/es
  // -----------------------------------------------------------------------

  var homeView = LangUI.createHome({
    lang: LANG,
    title: '西班牙語學習總覽',
    subtitle: '拼字即發音 → 動詞變位 → 開口說整句',
    sections: function () {
      return [
        { id: 'sounds', icon: '🔤', label: '發音規則', hash: '#/es-sounds',
          desc: sounds().length + ' 條規則，學完看到生字就能唸',
          lessonIds: sounds().map(function (s) { return s.id; }) },
        { id: 'verbs', icon: '🔀', label: '動詞變位', hash: '#/es-verbs',
          desc: verbs().length + ' 個高頻動詞的現在式六個人稱', ids: verbCardIds() },
        { id: 'vocab', icon: '📚', label: 'A1 單字', hash: '#/es-vocab',
          desc: vocab().length + ' 個 A1 核心單字，名詞都附冠詞標示陰陽性', ids: vocabIds() },
        { id: 'phrases', icon: '💬', label: '常用句型', hash: '#/es-phrases',
          desc: phrases().length + ' 條可以直接開口用的整句',
          lessonIds: phrases().map(function (p) { return p.id; }) }
      ];
    },
    nextStep: function (state, st) {
      var soundDone = sounds().filter(function (s) { return st.isLessonDone(s.id); }).length;
      if (soundDone < sounds().length) {
        return {
          title: '先把發音規則讀完',
          detail: '已讀 ' + soundDone + ' / ' + sounds().length +
            ' 條。西語拼字與發音幾乎一一對應，這 ' + sounds().length +
            ' 條讀完，之後看到任何生字都唸得出來 — 這是西語最划算的一筆投資。',
          actionLabel: '讀發音規則', hash: '#/es-sounds'
        };
      }
      var vb = st.cardStats(verbCardIds());
      if (vb.mastered < vb.total * 0.3) {
        return {
          title: '開始練動詞變位',
          detail: '發音過關了。西語的動詞會依「誰做的」改字尾，這是 A1 最大的關卡。' +
            '目前熟練 ' + vb.mastered + ' / ' + vb.total + ' 個變位形。先從 -ar 規則動詞開始。',
          actionLabel: '練動詞變位', hash: '#/es-verbs'
        };
      }
      var vs = st.cardStats(vocabIds());
      if (vs.mastered < vs.total * 0.5) {
        return {
          title: '累積 A1 單字',
          detail: '動詞有基礎了，接著補單字量。目前熟練 ' + vs.mastered + ' / ' + vs.total +
            ' 個。記名詞時務必連 el／la 一起記。',
          actionLabel: '背單字', hash: '#/es-vocab'
        };
      }
      var ph = phrases().filter(function (p) { return st.isLessonDone(p.id); }).length;
      if (ph < phrases().length) {
        return {
          title: '把句型練到能直接開口',
          detail: '已讀 ' + ph + ' / ' + phrases().length +
            ' 條。A1 階段記整句比記規則有效 — 先能講出來，文法之後自然會補上。',
          actionLabel: '讀常用句型', hash: '#/es-phrases'
        };
      }
      return {
        title: '用測驗檢驗成果',
        detail: '發音、變位、單字、句型都走過一輪了。用綜合測驗找出還不穩的地方。',
        actionLabel: '做綜合測驗', hash: '#/es-quiz'
      };
    }
  });

  // -----------------------------------------------------------------------
  // 發音規則 #/es-sounds
  // -----------------------------------------------------------------------

  var soundsView = (function () {
    var S = null;
    var host = null;

    function card(s, st) {
      var done = st.isLessonDone(s.id);
      return h('div.card', {},
        h('div.card-header', {},
          h('div', {}, h('div.card-title', {}, s.title)),
          done ? h('span.badge.badge-success', {}, '✓ 已讀') : null
        ),
        h('div.card-body', {},
          h('p', {}, s.rule),
          h('div', { style: { marginTop: '12px' } },
            s.examples.map(function (ex) {
              return h('div.card', { style: { marginTop: '8px', background: 'var(--color-surface-alt)' } },
                h('div.u-flex.u-items-center.u-gap-sm', { style: { flexWrap: 'wrap' } },
                  h('span', { style: { fontSize: '1.15rem', fontWeight: '700' } }, ex.es),
                  LangUI.ttsButton(ex.es, LANG, { small: true }),
                  h('span.u-text-muted', {}, ex.zh)
                ),
                ex.hint ? h('div.u-text-muted', { style: { fontSize: '0.85rem', marginTop: '4px' } },
                  '唸法：' + ex.hint) : null
              );
            })
          ),
          s.trap ? h('p', { style: { marginTop: '12px' } },
            h('span.badge.badge-warning', {}, '常見錯誤'), ' ', s.trap) : null
        ),
        h('div.card-actions', {},
          h('button', {
            type: 'button',
            class: 'btn btn-sm ' + (done ? 'btn-ghost' : 'btn-primary'),
            onClick: function () {
              if (done) return;
              try { st.completeLesson(s.id); Util.toast('已標記為已讀', 'success'); }
              catch (e) { Util.toast('標記失敗：' + e.message, 'error'); }
              paint();
            }
          }, done ? '已讀過' : '標記為已讀')
        )
      );
    }

    function paint() {
      LangUI.clearNode(host);
      var st = store();
      var groups = D().soundGroups || [];
      var all = sounds();
      var done = all.filter(function (s) { return st.isLessonDone(s.id); }).length;

      host.appendChild(LangUI.langHeader(LANG, '西語發音規則',
        '共 ' + all.length + ' 條 · 已讀 ' + done + ' 條'));
      host.appendChild(LangUI.voiceNotice(LANG));

      host.appendChild(h('div.card', {},
        h('div.card-title', {}, '為什麼要先讀這個'),
        h('div.card-body', {},
          h('p', {}, '西班牙語的拼字和發音幾乎一對一 —— 不像英文的 through / though / tough ' +
            '同樣 -ough 卻三種唸法。把這 ' + all.length + ' 條規則記熟之後，你看到任何沒學過的西語單字都唸得出來。'),
          h('div', { style: { marginTop: '10px' } }, LangUI.progressBar(done, all.length))
        )
      ));

      var chipRow = h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
      [{ code: 'all', label: '全部' }].concat(groups).forEach(function (g) {
        var n = g.code === 'all' ? all.length : all.filter(function (s) { return s.group === g.code; }).length;
        chipRow.appendChild(h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (S.group === g.code ? 'btn-primary' : 'btn-ghost'),
          onClick: function () { S.group = g.code; paint(); }
        }, g.label + '（' + n + '）'));
      });
      host.appendChild(h('div.card', {},
        h('div.card-subtitle', { style: { marginTop: 0 } }, '分類'),
        h('div', { style: { marginTop: '8px' } }, chipRow)
      ));

      var cur = groups.filter(function (g) { return g.code === S.group; })[0];
      if (cur) host.appendChild(h('p.u-text-muted', { style: { margin: '12px 0' } }, cur.desc));

      var shown = S.group === 'all' ? all : all.filter(function (s) { return s.group === S.group; });
      var list = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } });
      shown.forEach(function (s) { list.appendChild(card(s, st)); });
      host.appendChild(list);
    }

    return {
      render: function (container, params) {
        host = container;
        S = { group: (params && params.group) || 'all' };
        paint();
      },
      destroy: function () {
        if (window.TTS) TTS.stop();
        S = null; host = null;
      }
    };
  })();

  // -----------------------------------------------------------------------
  // 動詞變位 #/es-verbs（變位表 + 填變位練習兩個分頁）
  // -----------------------------------------------------------------------

  /**
   * 產生動詞變位題。抽成獨立函式，讓「動詞變位練習」與「綜合測驗」共用同一套出題邏輯。
   * scope: all / regular / irregular / stem
   */
  function buildConjugationQuestions(scope, count) {
    var pool = verbs();
    if (scope === 'regular') {
      pool = pool.filter(function (v) { return ['ar', 'er', 'ir'].indexOf(v.type) !== -1; });
    } else if (scope === 'irregular') {
      pool = pool.filter(function (v) { return v.type === 'irregular'; });
    } else if (scope === 'stem') {
      pool = pool.filter(function (v) { return ['e-ie', 'o-ue', 'e-i'].indexOf(v.type) !== -1; });
    }
    if (!pool.length) return [];

    var slots = [];
    pool.forEach(function (v) {
      for (var i = 0; i < 6; i++) slots.push({ verb: v, person: i });
    });
    var picked = shuffle(slots).slice(0, Math.min(count, slots.length));

    return picked.map(function (slot) {
      var v = slot.verb;
      var correct = v.forms[slot.person];
      var p = persons()[slot.person];

      // 干擾選項優先取「同一個動詞的其他人稱」，這樣才真的在考變位而不是考認字
      var seen = {};
      seen[correct] = true;
      var opts = [correct];
      shuffle(v.forms).forEach(function (f) {
        if (opts.length < 4 && !seen[f]) { seen[f] = true; opts.push(f); }
      });
      // 還不夠 4 個就從別的動詞借同一人稱的形態（例如 dar 只有 6 個形但有重複）
      if (opts.length < 4) {
        shuffle(verbs()).forEach(function (other) {
          if (opts.length >= 4) return;
          var f = other.forms[slot.person];
          if (f && !seen[f]) { seen[f] = true; opts.push(f); }
        });
      }
      opts = shuffle(opts);

      return {
        id: 'esvb-' + v.id + '-' + slot.person,
        prompt: v.inf + '　→　' + p.label,
        promptSub: v.zh + '（' + p.zh + '）',
        promptLarge: false,
        ttsText: correct,
        options: opts,
        answer: opts.indexOf(correct),
        explain: v.inf + '（' + v.zh + '）的 ' + p.label + ' 是 ' + correct + '。' + v.note
      };
    });
  }

  var verbDrill = LangUI.createDrill({
    lang: LANG,
    title: '動詞變位練習',
    subtitle: '給你原形和人稱，選出正確的變位形。答錯的進錯題本。',
    unit: 'verbs',
    counts: [10, 20, 30],
    modes: [
      { code: 'all', label: '全部動詞', hint: '規則與不規則混合出題。' },
      { code: 'regular', label: '只練規則動詞', hint: '-ar / -er / -ir 三組規則變化，先把這些練到反射。' },
      { code: 'irregular', label: '只練不規則', hint: '最常用的動詞往往最不規則，只能靠反覆練。' },
      { code: 'stem', label: '只練字幹變化', hint: 'e→ie、o→ue、e→i。注意 nosotros/vosotros 不變化。' }
    ],
    buildQuestions: buildConjugationQuestions
  });

  var verbsView = (function () {
    var TABS = [
      { code: 'table', label: '變位表', icon: '📋' },
      { code: 'serestar', label: 'ser vs estar', icon: '⚖️' },
      { code: 'drill', label: '練習', icon: '✏️' }
    ];
    var S = null;
    var host = null;

    function endingsCard() {
      var rows = (D().endings || []).map(function (e) {
        return h('tr', {},
          h('td', {}, h('strong', {}, '-' + e.type)),
          h('td', {}, e.model),
          h('td', {}, e.endings.join('　'))
        );
      });
      return h('div.card', {},
        h('div.card-title', {}, '三組規則字尾'),
        h('div.card-subtitle', {}, '把原形的 -ar/-er/-ir 去掉，換上對應人稱的字尾就完成了'),
        h('div.table-wrap.u-mt-md', {},
          h('table.table', {},
            h('thead', {}, h('tr', {},
              h('th', {}, '類型'), h('th', {}, '範本'),
              h('th', {}, 'yo / tú / él / nosotros / vosotros / ellos'))),
            h('tbody', {}, rows)
          )
        ),
        h('p.u-text-muted', { style: { fontSize: '0.85rem', marginTop: '10px' } },
          '注意 -er 和 -ir 只差在 nosotros（-emos／-imos）和 vosotros（-éis／-ís），其餘完全相同。')
      );
    }

    function verbCard(v, st) {
      var ids = [];
      for (var i = 0; i < 6; i++) ids.push('esvb-' + v.id + '-' + i);
      var stats = st.cardStats(ids);

      var cells = v.forms.map(function (f, i) {
        var p = persons()[i];
        var card = st.get().cards['esvb-' + v.id + '-' + i];
        return h('div', {
          style: {
            padding: '8px 10px',
            borderRadius: '8px',
            background: card && card.box >= 5 ? 'var(--color-success-soft)' : 'var(--color-surface-alt)'
          }
        },
          h('div.u-text-muted', { style: { fontSize: '0.72rem' } }, p.label),
          h('div.u-flex.u-items-center.u-gap-sm', {},
            h('strong', { style: { fontSize: '1.02rem' } }, f),
            LangUI.ttsButton(f, LANG, { small: true })
          )
        );
      });

      var typeLabel = (D().verbTypes || []).filter(function (t) { return t.code === v.type; })[0];

      return h('div.card', {},
        h('div.card-header', {},
          h('div', {},
            h('div.card-title', {}, v.inf + '　' + v.zh),
            h('div.card-subtitle', {}, typeLabel ? typeLabel.label : v.type)
          ),
          h('span', {
            class: 'badge ' + (stats.mastered === 6 ? 'badge-success' : 'badge-warning')
          }, '熟練 ' + stats.mastered + '/6')
        ),
        h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '8px',
            marginTop: '12px'
          }
        }, cells),
        v.note ? h('p', { style: { marginTop: '10px', fontSize: '0.9rem' } }, '💡 ' + v.note) : null,
        v.ex ? h('div.card', { style: { marginTop: '10px', background: 'var(--color-surface-alt)' } },
          h('div.u-flex.u-items-center.u-gap-sm', { style: { flexWrap: 'wrap' } },
            h('span', { style: { fontWeight: '600' } }, v.ex),
            LangUI.ttsButton(v.ex, LANG, { small: true })),
          h('div.u-text-muted', { style: { marginTop: '2px' } }, v.exZh)
        ) : null
      );
    }

    function serEstarCard() {
      var se = D().serEstar;
      if (!se) return h('div');

      function block(title, rows, tone) {
        return h('div.card', { style: { background: 'var(--color-surface-alt)' } },
          h('div.card-title', {}, h('span', { class: 'badge ' + tone }, title)),
          h('div.table-wrap.u-mt-md', {},
            h('table.table', {},
              h('thead', {}, h('tr', {}, h('th', {}, '用途'), h('th', {}, '例句'), h('th', {}, '中文'))),
              h('tbody', {}, rows.map(function (r) {
                return h('tr', {},
                  h('td', {}, r.use),
                  h('td', {}, h('div.u-flex.u-items-center.u-gap-sm', {},
                    h('span', {}, r.ex), LangUI.ttsButton(r.ex, LANG, { small: true }))),
                  h('td', {}, r.zh)
                );
              }))
            )
          )
        );
      }

      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
        h('div.card', {},
          h('div.card-title', {}, se.title),
          h('div.card-body', {}, h('p', {}, se.intro))
        ),
        block('用 ser', se.ser, 'badge-primary'),
        block('用 estar', se.estar, 'badge-success'),
        h('div.card', {},
          h('div.card-title', {}, '同一個形容詞，換動詞就換意思'),
          h('div.card-body', {},
            se.contrast.map(function (c) {
              return h('div', { style: { marginTop: '10px' } },
                h('div.u-flex.u-items-center.u-gap-sm', { style: { flexWrap: 'wrap' } },
                  h('strong', {}, c.es), LangUI.ttsButton(c.es, LANG, { small: true })),
                h('div.u-text-muted', { style: { marginTop: '2px' } }, c.zh)
              );
            })
          )
        )
      );
    }

    function paint() {
      LangUI.clearNode(host);
      var st = store();
      var stats = st.cardStats(verbCardIds());

      host.appendChild(LangUI.langHeader(LANG, '動詞變位',
        verbs().length + ' 個高頻動詞 · 已熟練 ' + stats.mastered + ' / ' + stats.total + ' 個變位形'));

      var tabRow = h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', marginBottom: '16px' } });
      TABS.forEach(function (t) {
        tabRow.appendChild(h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (S.tab === t.code ? 'btn-primary' : 'btn-ghost'),
          onClick: function () { S.tab = t.code; paint(); }
        }, t.icon + ' ' + t.label));
      });
      host.appendChild(tabRow);

      if (S.tab === 'drill') {
        var slot = h('div');
        host.appendChild(slot);
        verbDrill.render(slot, {});
        return;
      }
      if (S.tab === 'serestar') {
        host.appendChild(serEstarCard());
        return;
      }

      host.appendChild(endingsCard());

      var typeRow = h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
      [{ code: 'all', label: '全部' }].concat(D().verbTypes || []).forEach(function (t) {
        var n = t.code === 'all' ? verbs().length
          : verbs().filter(function (v) { return v.type === t.code; }).length;
        if (!n) return;
        typeRow.appendChild(h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (S.type === t.code ? 'btn-primary' : 'btn-ghost'),
          onClick: function () { S.type = t.code; paint(); }
        }, t.label + '（' + n + '）'));
      });
      host.appendChild(h('div.card', {},
        h('div.card-subtitle', { style: { marginTop: 0 } }, '變化類型'),
        h('div', { style: { marginTop: '8px' } }, typeRow)
      ));

      var cur = (D().verbTypes || []).filter(function (t) { return t.code === S.type; })[0];
      if (cur) host.appendChild(h('p.u-text-muted', { style: { margin: '12px 0' } }, cur.desc));

      var shown = S.type === 'all' ? verbs() : verbs().filter(function (v) { return v.type === S.type; });
      var list = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } });
      shown.forEach(function (v) { list.appendChild(verbCard(v, st)); });
      host.appendChild(list);
    }

    return {
      render: function (container, params) {
        host = container;
        S = { tab: (params && params.tab) || 'table', type: 'all' };
        paint();
      },
      destroy: function () {
        try { verbDrill.destroy(); } catch (e) { /* 尚未 render 過 */ }
        if (window.TTS) TTS.stop();
        S = null; host = null;
      }
    };
  })();

  // -----------------------------------------------------------------------
  // A1 單字 #/es-vocab
  // -----------------------------------------------------------------------

  var vocabView = LangUI.createDeck({
    lang: LANG,
    title: 'A1 單字',
    subtitle: '名詞都附 el／la — 陰陽性必須跟著單字一起記，否則之後冠詞和形容詞都會錯。',
    frontLabel: '單字', frontSubLabel: '詞性', backLabel: '中文',
    alwaysShowFrontSub: true,
    items: function () {
      return vocab().map(function (v) {
        return {
          id: v.id,
          front: v.w,
          frontSub: v.gender ? (v.gender === 'f' ? '陰性名詞' : '陽性名詞') : v.pos,
          back: v.zh,
          backSub: null,
          example: v.ex || null,
          exampleZh: v.exZh || null
        };
      });
    },
    ttsTextOf: function (item) { return item.front; },
    groups: function () { return D().vocabTopics || []; }(),
    groupOf: function (item) {
      var v = vocab().filter(function (x) { return x.id === item.id; })[0];
      return v ? v.topic : '';
    }
  });

  // -----------------------------------------------------------------------
  // 常用句型 #/es-phrases
  // -----------------------------------------------------------------------

  var phrasesView = (function () {
    var S = null;
    var host = null;

    function paint() {
      LangUI.clearNode(host);
      var st = store();
      var groups = D().phraseGroups || [];
      var all = phrases();
      var done = all.filter(function (p) { return st.isLessonDone(p.id); }).length;

      host.appendChild(LangUI.langHeader(LANG, '常用句型',
        '共 ' + all.length + ' 條 · 已讀 ' + done + ' 條'));
      host.appendChild(LangUI.voiceNotice(LANG));

      host.appendChild(h('div.card', {},
        h('div.card-title', {}, '整句記，不要拆開記'),
        h('div.card-body', {},
          h('p', {}, 'A1 階段最有效的方式是把整句練到不用想就能講出來。' +
            '先能開口，文法規則之後自然會補上 —— 反過來先學規則再造句，開口的時間會晚很多。'),
          h('div', { style: { marginTop: '10px' } }, LangUI.progressBar(done, all.length))
        )
      ));

      var chipRow = h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
      [{ code: 'all', label: '全部' }].concat(groups).forEach(function (g) {
        var n = g.code === 'all' ? all.length : all.filter(function (p) { return p.group === g.code; }).length;
        chipRow.appendChild(h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (S.group === g.code ? 'btn-primary' : 'btn-ghost'),
          onClick: function () { S.group = g.code; paint(); }
        }, g.label + '（' + n + '）'));
      });
      host.appendChild(h('div.card', {},
        h('div.card-subtitle', { style: { marginTop: 0 } }, '場合'),
        h('div', { style: { marginTop: '8px' } }, chipRow)
      ));

      var cur = groups.filter(function (g) { return g.code === S.group; })[0];
      if (cur) host.appendChild(h('p.u-text-muted', { style: { margin: '12px 0' } }, cur.desc));

      var shown = S.group === 'all' ? all : all.filter(function (p) { return p.group === S.group; });
      var list = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } });
      shown.forEach(function (p) {
        var isDone = st.isLessonDone(p.id);
        list.appendChild(h('div.card', {},
          h('div.u-flex.u-items-center.u-justify-between', { style: { flexWrap: 'wrap', gap: '8px' } },
            h('div.u-flex.u-items-center.u-gap-sm', { style: { flexWrap: 'wrap' } },
              h('span', { style: { fontSize: '1.15rem', fontWeight: '700' } }, p.es),
              LangUI.ttsButton(p.es, LANG, { small: true })
            ),
            h('button', {
              type: 'button',
              class: 'btn btn-sm ' + (isDone ? 'btn-ghost' : 'btn-primary'),
              onClick: function () {
                if (isDone) return;
                try { st.completeLesson(p.id); } catch (e) { /* 忽略 */ }
                paint();
              }
            }, isDone ? '✓ 已讀' : '標記已讀')
          ),
          h('div', { style: { marginTop: '4px' } }, p.zh),
          p.pattern ? h('div.u-text-muted', { style: { marginTop: '6px', fontSize: '0.88rem' } },
            '句型：' + p.pattern) : null,
          p.swaps ? h('div.u-text-muted', { style: { marginTop: '2px', fontSize: '0.88rem' } },
            '可替換：' + p.swaps.join('、')) : null,
          p.note ? h('div', { style: { marginTop: '6px', fontSize: '0.88rem' } }, '💡 ' + p.note) : null
        ));
      });
      host.appendChild(list);
    }

    return {
      render: function (container, params) {
        host = container;
        S = { group: (params && params.group) || 'all' };
        paint();
      },
      destroy: function () {
        if (window.TTS) TTS.stop();
        S = null; host = null;
      }
    };
  })();

  // -----------------------------------------------------------------------
  // 綜合測驗 #/es-quiz
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
    title: '西班牙語綜合測驗',
    subtitle: '單字、陰陽性與動詞變位。答錯的自動進錯題本。',
    unit: 'mixed',
    counts: [10, 20, 30],
    modes: [
      { code: 'w2zh', label: '看西語選中文', hint: '最基本的單字辨識。' },
      { code: 'zh2w', label: '看中文選西語', hint: '要能主動想起來，比認字難。' },
      { code: 'gender', label: '判斷陰陽性', hint: '名詞該配 el 還是 la — 這關係到整句的形容詞變化。' },
      { code: 'conj', label: '動詞變位', hint: '給原形和人稱，選出正確的變位形。' }
    ],
    buildQuestions: function (mode, count) {
      if (mode === 'conj') {
        return buildConjugationQuestions('all', count);
      }
      if (mode === 'gender') {
        var nouns = vocab().filter(function (v) { return v.gender; });
        if (!nouns.length) return [];
        return shuffle(nouns).slice(0, Math.min(count, nouns.length)).map(function (v) {
          var opts = ['el ' + v.base, 'la ' + v.base];
          var correct = (v.gender === 'f' ? 'la ' : 'el ') + v.base;
          return {
            id: v.id,
            prompt: v.base,
            promptSub: v.zh,
            promptLarge: false,
            ttsText: v.w,
            options: opts,
            answer: opts.indexOf(correct),
            explain: v.w + ' 是' + (v.gender === 'f' ? '陰性' : '陽性') + '名詞。' +
              (v.ex ? '例：' + v.ex + '（' + v.exZh + '）' : '')
          };
        });
      }

      var pool = vocab();
      if (!pool.length) return [];
      var picked = shuffle(pool).slice(0, Math.min(count, pool.length));

      return picked.map(function (v) {
        var others = shuffle(pool.filter(function (x) { return x.id !== v.id; }));
        var prompt, correct, optionOf, ttsText;

        if (mode === 'zh2w') {
          prompt = v.zh; correct = v.w;
          optionOf = function (x) { return x.w; };
          ttsText = null;
        } else {
          prompt = v.w; correct = v.zh;
          optionOf = function (x) { return x.zh; };
          ttsText = v.w;
        }

        var opts = shuffle(distinctOptions(correct, others, optionOf));
        return {
          id: v.id,
          prompt: prompt,
          promptSub: null,
          promptLarge: false,
          ttsText: ttsText,
          options: opts,
          answer: opts.indexOf(correct),
          explain: v.w + ' = ' + v.zh + (v.ex ? '　例：' + v.ex + '（' + v.exZh + '）' : '')
        };
      });
    }
  });

  // -----------------------------------------------------------------------
  // 錯題本 #/es-review
  // -----------------------------------------------------------------------

  var reviewView = LangUI.createWrongBook({
    lang: LANG,
    title: '西班牙語錯題本',
    resolve: function (id) {
      if (/^esvb-/.test(id)) {
        var parsed = verbOfCardId(id);
        if (!parsed) return null;
        var v = parsed.verb;
        var p = persons()[parsed.person];
        var correct = v.forms[parsed.person];
        var seen = {};
        seen[correct] = true;
        var opts = [correct];
        shuffle(v.forms).forEach(function (f) {
          if (opts.length < 4 && !seen[f]) { seen[f] = true; opts.push(f); }
        });
        opts = shuffle(opts);
        return {
          prompt: v.inf + '　→　' + p.label,
          promptSub: v.zh + '（' + p.zh + '）',
          ttsText: correct,
          options: opts,
          answer: opts.indexOf(correct),
          explain: v.inf + ' 的 ' + p.label + ' 是 ' + correct + '。' + v.note
        };
      }
      if (/^esw-/.test(id)) {
        var w = vocab().filter(function (x) { return x.id === id; })[0];
        if (!w) return null;
        var others = shuffle(vocab().filter(function (x) { return x.id !== id; }));
        var wOpts = shuffle(distinctOptions(w.zh, others, function (x) { return x.zh; }));
        return {
          prompt: w.w, promptSub: null, ttsText: w.w,
          options: wOpts, answer: wOpts.indexOf(w.zh),
          explain: w.w + ' = ' + w.zh + (w.ex ? '　例：' + w.ex + '（' + w.exZh + '）' : '')
        };
      }
      return null;
    }
  });

  // -----------------------------------------------------------------------
  // 註冊
  // -----------------------------------------------------------------------

  window.Views = window.Views || {};
  window.Views.es = homeView;
  window.Views['es-sounds'] = soundsView;
  window.Views['es-verbs'] = verbsView;
  window.Views['es-vocab'] = vocabView;
  window.Views['es-phrases'] = phrasesView;
  window.Views['es-quiz'] = quizView;
  window.Views['es-review'] = reviewView;
})();
