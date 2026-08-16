/**
 * js/langui.js — 多語言學習模組的共用 UI 引擎
 *
 * 日語與西班牙語的頁面幾乎都是同三種形狀，所以抽成三個 view 工廠，
 * 各語言只要傳設定物件進來，不必各寫一份：
 *
 *   LangUI.createDeck(cfg)      SRS 閃卡（五十音、單字都用這個）
 *   LangUI.createDrill(cfg)     選擇題測驗（認讀、動詞變位、綜合測驗）
 *   LangUI.createWrongBook(cfg) 錯題本（Leitner 排程 + 錯因標記）
 *   LangUI.createHome(cfg)      該語言的學習總覽首頁
 *
 * 四個工廠都回傳 { render(container, params), destroy() }，可直接註冊給 App。
 * 進度一律走 LangStore.for(cfg.lang)，發音一律走 TTS 並帶上該語言的 ttsLang。
 *
 * 依賴：window.Util、window.Platform、window.LangStore、window.SRS、window.TTS（選用）。
 */
(function (window) {
  'use strict';

  var OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  // 錯因分類：code 必須與 LangStore.WRONG_REASONS 一致
  var REASONS = [
    { code: 'vocab', label: '字彙不熟', icon: '📖', advice: '把這個字加回單字卡，明天用 SRS 再遇到一次。' },
    { code: 'grammar', label: '規則不熟', icon: '📐', advice: '回頭讀一次對應的文法／變位規則，再做同類型練習。' },
    { code: 'misread', label: '看錯選項', icon: '👀', advice: '作答前先把題目關鍵字圈出來，這類錯不用補實力，補習慣就好。' },
    { code: 'time', label: '想太久亂選', icon: '⏱️', advice: '先求穩再求快。這個階段寧可慢，也不要養成猜的習慣。' },
    { code: 'guess', label: '沒把握用猜的', icon: '🎲', advice: '猜對也算不會，讓它留在錯題本裡多見幾次。' }
  ];

  var BOX_LABELS = ['第 1 箱', '第 2 箱', '第 3 箱', '第 4 箱', '已精通'];

  // -----------------------------------------------------------------------
  // 共用小工具
  // -----------------------------------------------------------------------

  function h() { return Util.h.apply(null, arguments); }

  function clearNode(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function goTo(hash) {
    if (window.App && typeof window.App.navigate === 'function') window.App.navigate(hash);
    else window.location.hash = hash;
  }

  function langMeta(code) {
    return (window.Platform && window.Platform.byCode(code)) || { ttsLang: 'en-US', label: code, accent: '#3B5BDB' };
  }

  function storeFor(code) {
    return window.LangStore.for(code);
  }

  function reasonDef(code) {
    for (var i = 0; i < REASONS.length; i++) {
      if (REASONS[i].code === code) return REASONS[i];
    }
    return null;
  }

  function shuffle(arr) { return Util.shuffle(arr || []); }

  function pct(a, b) { return Util.pct(a, b); }

  /**
   * ttsButton(text, langCode, opts) — 發音按鈕。
   * 沒有 TTS 支援或該語言沒裝語音時仍可點，只是瀏覽器可能唸得不標準；
   * 缺語音的提示由呼叫端用 voiceNotice() 顯示一次即可，不要每顆按鈕都嘮叨。
   */
  function ttsButton(text, langCode, opts) {
    opts = opts || {};
    var meta = langMeta(langCode);
    var label = opts.label || '🔊';
    var btn = h('button', {
      type: 'button',
      class: 'btn btn-ghost ' + (opts.small ? 'btn-sm' : ''),
      'aria-label': '播放發音',
      title: '播放發音',
      onClick: function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!window.TTS || !TTS.isSupported()) {
          Util.toast('此瀏覽器不支援語音朗讀', 'warning');
          return;
        }
        var rate = opts.rate;
        if (typeof rate !== 'number') {
          try { rate = storeFor(langCode).get().settings.ttsRate; } catch (err) { rate = 1.0; }
        }
        btn.disabled = true;
        TTS.speak(text, { lang: meta.ttsLang, rate: Util.clamp(rate, 0.5, 1.5) })
          .then(function () { btn.disabled = false; })
          .catch(function () { btn.disabled = false; });
      }
    }, label);
    return btn;
  }

  /** voiceNotice(langCode) — 系統缺該語言語音時顯示的一次性提示（非同步塞入） */
  function voiceNotice(langCode) {
    var wrap = h('div');
    if (!window.TTS || !TTS.isSupported() || typeof TTS.hasVoiceFor !== 'function') return wrap;
    var meta = langMeta(langCode);
    TTS.hasVoiceFor(meta.ttsLang).then(function (has) {
      if (has) return;
      wrap.appendChild(h('div.card', { style: { background: 'var(--color-surface-alt)' } },
        h('p.u-text-muted', { style: { fontSize: '0.85rem' } },
          '⚠️ ' + (TTS.voiceHintFor ? TTS.voiceHintFor(meta.ttsLang) : '未偵測到此語言的語音'))
      ));
    });
    return wrap;
  }

  /** langHeader — 各語言頁面共用的標題列，右側固定有「切換語言」回 hub */
  function langHeader(langCode, title, subtitle, extraActions) {
    var meta = langMeta(langCode);
    return h('div.view-header', {},
      h('div.view-title', {},
        h('h1', {}, title),
        subtitle ? h('p.view-subtitle', {}, subtitle) : null
      ),
      h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', alignItems: 'center' } },
        extraActions || null,
        h('button.btn.btn-ghost.btn-sm', {
          type: 'button',
          title: '回語言選擇',
          onClick: function () { goTo('#/' + window.Platform.HUB_ROUTE); }
        }, meta.flag + ' 切換語言')
      )
    );
  }

  /** progressStrip — 未學 / 學習中 / 已熟 / 今日到期 四格統計 */
  function progressStrip(stats) {
    return h('div.stat-grid', {},
      h('div.stat-card', {},
        h('div.stat-value', {}, String(stats.mastered)),
        h('div.stat-label', {}, '已熟練')),
      h('div.stat-card', {},
        h('div.stat-value', {}, String(stats.learning)),
        h('div.stat-label', {}, '學習中')),
      h('div.stat-card', {},
        h('div.stat-value', {}, String(stats.unseen)),
        h('div.stat-label', {}, '尚未學')),
      h('div.stat-card', {},
        h('div.stat-value', {}, String(stats.due)),
        h('div.stat-label', {}, '今日待複習'))
    );
  }

  function progressBar(value, total) {
    var p = pct(value, total);
    var cls = p >= 80 ? ' is-success' : (p >= 40 ? ' is-warning' : ' is-danger');
    return h('div.progress-bar', {}, h('div', { class: 'progress-bar-fill' + cls, style: { width: p + '%' } }));
  }

  function emptyState(icon, title, desc, actionLabel, actionHash) {
    return h('div.empty-state', {},
      h('div.empty-state-icon', { 'aria-hidden': 'true' }, icon),
      h('h2', {}, title),
      h('p', {}, desc),
      actionLabel ? h('button.btn.btn-primary', {
        type: 'button',
        onClick: function () { goTo(actionHash); }
      }, actionLabel) : null
    );
  }

  // -----------------------------------------------------------------------
  // 1. createDeck — SRS 閃卡
  // -----------------------------------------------------------------------

  /**
   * cfg = {
   *   lang, route, title, subtitle,
   *   items(): Item[]                         // { id, front, frontSub?, back, backSub?, example?, exampleZh?, group? }
   *   ttsTextOf(item): string                 // 要朗讀的文字（預設 item.front）
   *   groups?: [{ code, label }]              // 可選的分組篩選（例如 topic / 五十音行）
   *   groupOf?(item): string
   *   backHash?: string
   * }
   */
  function createDeck(cfg) {
    var S = null;
    var host = null;

    function allItems() {
      try { return cfg.items() || []; } catch (e) { return []; }
    }

    function scopedItems() {
      var items = allItems();
      if (!S.group || !cfg.groupOf) return items;
      return items.filter(function (it) { return cfg.groupOf(it) === S.group; });
    }

    function ttsText(item) {
      return cfg.ttsTextOf ? cfg.ttsTextOf(item) : item.front;
    }

    function startSession(mode) {
      var store = storeFor(cfg.lang);
      var ids = scopedItems().map(function (i) { return i.id; });
      var picked = store.pickSession(ids, {});
      var queue;
      if (mode === 'review') queue = picked.reviewIds.slice();
      else if (mode === 'new') queue = picked.newIds.slice();
      else queue = picked.reviewIds.concat(picked.newIds);

      if (!queue.length) {
        Util.toast(mode === 'review' ? '目前沒有到期的複習卡' : '這個範圍已經沒有新卡了', 'info');
        return;
      }
      S.session = {
        queue: queue,
        index: 0,
        flipped: false,
        right: 0,
        wrong: 0,
        total: queue.length
      };
      paint();
    }

    function endSession() {
      S.session = null;
      paint();
    }

    function answerCard(correct) {
      var sess = S.session;
      var id = sess.queue[sess.index];
      try {
        storeFor(cfg.lang).reviewCard(id, correct);
      } catch (e) {
        Util.toast('儲存進度失敗：' + e.message, 'error');
      }
      if (correct) sess.right += 1; else sess.wrong += 1;
      sess.index += 1;
      sess.flipped = false;
      paint();
    }

    function itemById(id) {
      var items = allItems();
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) return items[i];
      }
      return null;
    }

    // ---- 畫面 ----

    function buildGroupChips() {
      if (!cfg.groups || !cfg.groups.length) return null;
      var row = h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
      [{ code: '', label: '全部' }].concat(cfg.groups).forEach(function (g) {
        var count = g.code === ''
          ? allItems().length
          : allItems().filter(function (it) { return cfg.groupOf(it) === g.code; }).length;
        row.appendChild(h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (S.group === g.code ? 'btn-primary' : 'btn-ghost'),
          onClick: function () { S.group = g.code; paint(); }
        }, g.label + '（' + count + '）'));
      });
      return row;
    }

    function paintOverview() {
      var store = storeFor(cfg.lang);
      var items = scopedItems();
      var ids = items.map(function (i) { return i.id; });
      var stats = store.cardStats(ids);
      var picked = store.pickSession(ids, {});

      host.appendChild(langHeader(cfg.lang, cfg.title, cfg.subtitle));
      host.appendChild(voiceNotice(cfg.lang));

      var chips = buildGroupChips();
      if (chips) {
        host.appendChild(h('div.card', {},
          h('div.card-subtitle', { style: { marginTop: 0 } }, '範圍'),
          h('div', { style: { marginTop: '8px' } }, chips)
        ));
      }

      if (!items.length) {
        host.appendChild(emptyState('📭', '這個範圍沒有內容', '換一個範圍試試。'));
        return;
      }

      host.appendChild(progressStrip(stats));
      host.appendChild(h('div.card', {},
        h('div.card-title', {}, '整體進度'),
        h('div', { style: { marginTop: '10px' } }, progressBar(stats.mastered, stats.total)),
        h('p.u-text-muted', { style: { marginTop: '6px', fontSize: '0.85rem' } },
          '已熟練 ' + stats.mastered + ' / ' + stats.total + '（' + pct(stats.mastered, stats.total) + '%）')
      ));

      host.appendChild(h('div.card', {},
        h('div.card-title', {}, '今天要背什麼'),
        h('div.card-subtitle', {},
          '待複習 ' + picked.reviewIds.length + ' 張 · 新卡 ' + picked.newIds.length +
          ' 張（每日新卡上限可在下方調整）'),
        h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', marginTop: '12px' } },
          h('button.btn.btn-primary', {
            type: 'button',
            disabled: !(picked.reviewIds.length + picked.newIds.length),
            onClick: function () { startSession('all'); }
          }, '開始今日進度（' + (picked.reviewIds.length + picked.newIds.length) + ' 張）'),
          h('button.btn.btn-ghost', {
            type: 'button',
            disabled: !picked.reviewIds.length,
            onClick: function () { startSession('review'); }
          }, '只複習到期（' + picked.reviewIds.length + '）'),
          h('button.btn.btn-ghost', {
            type: 'button',
            disabled: !picked.newIds.length,
            onClick: function () { startSession('new'); }
          }, '只學新卡（' + picked.newIds.length + '）')
        )
      ));

      // 每日新卡上限
      var current = store.get().settings.dailyNew || 10;
      var row = h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
      [5, 10, 20, 30].forEach(function (n) {
        row.appendChild(h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (current === n ? 'btn-primary' : 'btn-ghost'),
          onClick: function () {
            store.set(function (old) {
              return Object.assign({}, old, {
                settings: Object.assign({}, old.settings, { dailyNew: n })
              });
            });
            paint();
          }
        }, n + ' 張'));
      });
      host.appendChild(h('div.card', {},
        h('div.card-title', {}, '每日新卡上限'),
        h('div.card-subtitle', {}, '剛開始建議 10 張。複習量會自己長出來，新卡開太多隔天會被複習淹沒。'),
        h('div', { style: { marginTop: '10px' } }, row)
      ));

      host.appendChild(buildListCard(items, store));
    }

    function buildListCard(items, store) {
      var state = store.get();
      var today = store.todayISO();
      var rows = items.map(function (it) {
        var card = state.cards[it.id];
        var status = !card
          ? h('span.badge', {}, '未學')
          : (card.box >= 5
            ? h('span.badge.badge-success', {}, '已熟練')
            : h('span', {
              class: 'badge ' + ((!card.due || card.due <= today) ? 'badge-danger' : 'badge-warning')
            }, BOX_LABELS[Math.max(0, Math.min(4, card.box - 1))]));
        return h('tr', {},
          h('td', {}, h('span', { style: { fontSize: '1.1rem', fontWeight: '600' } }, it.front)),
          h('td', {}, it.frontSub || ''),
          h('td', {}, it.back),
          h('td', {}, status),
          h('td', {}, card && card.due ? card.due : '—'),
          h('td', {}, ttsButton(ttsText(it), cfg.lang, { small: true }))
        );
      });

      return h('div.card', {},
        h('div.card-title', {}, '完整清單'),
        h('div.table-wrap.u-mt-md', {},
          h('table.table', {},
            h('thead', {}, h('tr', {},
              h('th', {}, cfg.frontLabel || '正面'),
              h('th', {}, cfg.frontSubLabel || '讀音'),
              h('th', {}, cfg.backLabel || '意思'),
              h('th', {}, '狀態'),
              h('th', {}, '下次複習'),
              h('th', {}, '發音')
            )),
            h('tbody', {}, rows)
          )
        )
      );
    }

    function paintSession() {
      var sess = S.session;

      if (sess.index >= sess.queue.length) {
        host.appendChild(langHeader(cfg.lang, cfg.title + ' · 完成', null));
        host.appendChild(h('div.card', {},
          h('div.card-title', {}, '🎉 這一輪結束'),
          h('div.stat-grid', { style: { marginTop: '12px' } },
            h('div.stat-card', {},
              h('div.stat-value', {}, sess.right + ' / ' + sess.total),
              h('div.stat-label', {}, '記得的')),
            h('div.stat-card', {},
              h('div.stat-value', {}, pct(sess.right, sess.total) + '%'),
              h('div.stat-label', {}, '正確率'))
          ),
          h('p', { style: { marginTop: '12px' } },
            sess.wrong === 0
              ? '全部答對，這批卡片會往後排更久才再出現。'
              : ('答錯的 ' + sess.wrong + ' 張已退回第 1 箱，明天會再遇到。')),
          h('div.card-actions', {},
            h('button.btn.btn-primary', { type: 'button', onClick: endSession }, '回總覽')
          )
        ));
        return;
      }

      var id = sess.queue[sess.index];
      var item = itemById(id);
      if (!item) { // 資料異動導致卡片消失 → 跳過，不讓使用者卡住
        sess.index += 1;
        paint();
        return;
      }

      host.appendChild(langHeader(cfg.lang, cfg.title,
        '第 ' + (sess.index + 1) + ' / ' + sess.total + ' 張'));
      host.appendChild(h('div.progress-bar', { style: { marginBottom: '16px' } },
        h('div.progress-bar-fill', { style: { width: pct(sess.index, sess.total) + '%' } })
      ));

      var face = h('div.card', {
        style: { textAlign: 'center', padding: '32px 16px', cursor: 'pointer', minHeight: '180px' },
        onClick: function () { if (!sess.flipped) { sess.flipped = true; paint(); } }
      },
        h('div', { style: { fontSize: '2.6rem', fontWeight: '700', lineHeight: '1.3' } }, item.front),
        item.frontSub && (sess.flipped || cfg.alwaysShowFrontSub)
          ? h('div.u-text-muted', { style: { marginTop: '6px', fontSize: '1rem' } }, item.frontSub)
          : null,
        sess.flipped
          ? h('div', { style: { marginTop: '18px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' } },
            h('div', { style: { fontSize: '1.3rem', fontWeight: '600' } }, item.back),
            item.backSub ? h('div.u-text-muted', { style: { marginTop: '4px' } }, item.backSub) : null,
            item.example
              ? h('div', { style: { marginTop: '14px' } },
                h('div', { style: { fontSize: '1.05rem' } }, item.example),
                item.exampleZh ? h('div.u-text-muted', { style: { marginTop: '2px' } }, item.exampleZh) : null)
              : null
          )
          : h('p.u-text-muted', { style: { marginTop: '20px' } }, '點一下翻面')
      );
      host.appendChild(face);

      host.appendChild(h('div.u-flex.u-justify-center.u-gap-sm', { style: { marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center', display: 'flex' } },
        ttsButton(ttsText(item), cfg.lang, { label: '🔊 播放發音' })
      ));

      if (sess.flipped) {
        host.appendChild(h('div.u-flex.u-gap-sm', { style: { marginTop: '16px', flexWrap: 'wrap' } },
          h('button.btn.btn-danger.btn-block', {
            type: 'button',
            style: { flex: '1 1 140px' },
            onClick: function () { answerCard(false); }
          }, '✗ 還不熟'),
          h('button.btn.btn-primary.btn-block', {
            type: 'button',
            style: { flex: '1 1 140px' },
            onClick: function () { answerCard(true); }
          }, '✓ 記得')
        ));
      }

      host.appendChild(h('div.u-flex.u-justify-between.u-mt-md', { style: { flexWrap: 'wrap', gap: '8px' } },
        h('span.u-text-muted', {}, '本輪：✓ ' + sess.right + '　✗ ' + sess.wrong),
        h('button.btn.btn-ghost.btn-sm', { type: 'button', onClick: endSession }, '結束這一輪')
      ));
    }

    function paint() {
      clearNode(host);
      if (S.session) paintSession();
      else paintOverview();
    }

    function render(container, params) {
      host = container;
      S = { group: (params && params.group) || '', session: null };
      paint();
    }

    function destroy() {
      if (window.TTS) TTS.stop();
      S = null;
      host = null;
    }

    return { render: render, destroy: destroy };
  }

  // -----------------------------------------------------------------------
  // 2. createDrill — 選擇題測驗
  // -----------------------------------------------------------------------

  /**
   * cfg = {
   *   lang, title, subtitle, unit,
   *   modes: [{ code, label, hint }]           // 出題模式（例如「看假名選讀音」/「聽發音選假名」）
   *   buildQuestions(mode, count): Question[]  // { id, prompt, promptSub?, ttsText?, options[], answer, explain? }
   *   counts?: number[]                        // 可選題數，預設 [10, 20, 全部]
   * }
   */
  function createDrill(cfg) {
    var S = null;
    var host = null;

    function paintSetup() {
      var counts = cfg.counts || [10, 20, 30];
      host.appendChild(langHeader(cfg.lang, cfg.title, cfg.subtitle));
      host.appendChild(voiceNotice(cfg.lang));

      var modeRow = h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
      (cfg.modes || []).forEach(function (m) {
        modeRow.appendChild(h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (S.mode === m.code ? 'btn-primary' : 'btn-ghost'),
          onClick: function () { S.mode = m.code; paint(); }
        }, m.label));
      });

      var countRow = h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
      counts.forEach(function (n) {
        countRow.appendChild(h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (S.count === n ? 'btn-primary' : 'btn-ghost'),
          onClick: function () { S.count = n; paint(); }
        }, n + ' 題'));
      });

      var activeMode = (cfg.modes || []).filter(function (m) { return m.code === S.mode; })[0];

      host.appendChild(h('div.card', {},
        h('div.card-body', {},
          h('div.field', {},
            h('label.field-label', {}, '出題方式'),
            modeRow,
            activeMode && activeMode.hint ? h('p.field-hint', {}, activeMode.hint) : null
          ),
          h('div.field', {},
            h('label.field-label', {}, '題數'),
            countRow
          )
        ),
        h('div.card-actions', {},
          h('button.btn.btn-primary.btn-block', {
            type: 'button',
            onClick: start
          }, '開始測驗')
        )
      ));
    }

    function start() {
      var qs;
      try {
        qs = cfg.buildQuestions(S.mode, S.count) || [];
      } catch (e) {
        Util.toast('出題失敗：' + e.message, 'error');
        return;
      }
      if (!qs.length) {
        Util.toast('這個範圍目前出不了題', 'warning');
        return;
      }
      S.session = {
        questions: qs,
        index: 0,
        answers: {},
        startedAt: Date.now(),
        finished: false
      };
      paint();
    }

    function select(idx) {
      var sess = S.session;
      var q = sess.questions[sess.index];
      if (sess.answers[sess.index] !== undefined) return;
      sess.answers[sess.index] = idx;
      paint();
    }

    function next() {
      var sess = S.session;
      if (sess.index < sess.questions.length - 1) {
        sess.index += 1;
        paint();
      } else {
        finish();
      }
    }

    function finish() {
      var sess = S.session;
      var wrongIds = [];
      var correct = 0;
      sess.questions.forEach(function (q, i) {
        if (sess.answers[i] === q.answer) correct += 1;
        else wrongIds.push(q.id);
      });
      var seconds = Math.max(0, Math.round((Date.now() - sess.startedAt) / 1000));
      try {
        storeFor(cfg.lang).recordQuiz({
          mode: 'quiz', unit: cfg.unit || S.mode,
          total: sess.questions.length, correct: correct,
          seconds: seconds, wrongIds: wrongIds
        });
      } catch (e) {
        Util.toast('紀錄成績失敗：' + e.message, 'error');
      }
      sess.finished = true;
      sess.correct = correct;
      sess.seconds = seconds;
      sess.wrongIds = wrongIds;
      paint();
    }

    function paintRunning() {
      var sess = S.session;
      var q = sess.questions[sess.index];
      var picked = sess.answers[sess.index];
      var revealed = picked !== undefined;

      host.appendChild(langHeader(cfg.lang, cfg.title,
        '第 ' + (sess.index + 1) + ' / ' + sess.questions.length + ' 題'));
      host.appendChild(h('div.progress-bar', { style: { marginBottom: '16px' } },
        h('div.progress-bar-fill', { style: { width: pct(sess.index, sess.questions.length) + '%' } })
      ));

      host.appendChild(h('div.card', {},
        h('div.card-body', { style: { textAlign: 'center', padding: '24px 16px' } },
          h('div', { style: { fontSize: q.promptLarge === false ? '1.15rem' : '2.2rem', fontWeight: '700' } }, q.prompt),
          q.promptSub ? h('div.u-text-muted', { style: { marginTop: '6px' } }, q.promptSub) : null,
          q.ttsText ? h('div', { style: { marginTop: '12px' } },
            ttsButton(q.ttsText, cfg.lang, { label: '🔊 播放', small: true })) : null
        )
      ));

      host.appendChild(h('div.option-list', { style: { marginTop: '14px' } },
        q.options.map(function (opt, i) {
          var classes = ['option-btn'];
          if (revealed) {
            if (i === q.answer) classes.push('is-correct');
            else if (i === picked) classes.push('is-incorrect');
          }
          return h('button', {
            type: 'button',
            class: classes.join(' '),
            disabled: revealed,
            onClick: function () { select(i); }
          },
            h('span.option-label', {}, OPTION_LETTERS[i] || String(i + 1)),
            h('span.option-text', {}, opt),
            revealed && (i === q.answer || i === picked)
              ? h('span.option-mark', {}, i === q.answer ? '✓' : '✗') : null
          );
        })
      ));

      if (revealed) {
        var ok = picked === q.answer;
        host.appendChild(h('div.card', { style: { marginTop: '14px', background: 'var(--color-surface-alt)' } },
          h('p', { style: { fontWeight: '700' } }, ok ? '✅ 答對了' : '❌ 答錯了'),
          q.explain ? h('p', { style: { marginTop: '4px' } }, q.explain) : null
        ));
        host.appendChild(h('div.u-flex.u-justify-end.u-mt-md', {},
          h('button.btn.btn-primary', { type: 'button', onClick: next },
            sess.index < sess.questions.length - 1 ? '下一題 →' : '看結果')
        ));
      }
    }

    function paintResult() {
      var sess = S.session;
      var p = pct(sess.correct, sess.questions.length);

      host.appendChild(langHeader(cfg.lang, cfg.title + ' · 結果', null));
      host.appendChild(h('div.stat-grid', {},
        h('div.stat-card', {},
          h('div.stat-value', {}, sess.correct + ' / ' + sess.questions.length),
          h('div.stat-label', {}, '答對題數')),
        h('div.stat-card', {},
          h('div.stat-value', {}, p + '%'),
          h('div.stat-label', {}, '正確率')),
        h('div.stat-card', {},
          h('div.stat-value', {}, Util.fmtTime(sess.seconds)),
          h('div.stat-label', {}, '用時'))
      ));

      host.appendChild(h('div.progress-bar', { style: { margin: '16px 0' } },
        h('div', {
          class: 'progress-bar-fill' + (p >= 80 ? ' is-success' : (p >= 50 ? ' is-warning' : ' is-danger')),
          style: { width: p + '%' }
        })
      ));

      if (sess.wrongIds.length) {
        host.appendChild(h('div.card', {},
          h('div.card-title', {}, '答錯的 ' + sess.wrongIds.length + ' 題已進錯題本'),
          h('div.card-subtitle', {}, '明天會排進複習佇列，連續答對到第 5 箱才算真的會。'),
          h('div.card-actions', {},
            h('button.btn.btn-ghost.btn-sm', {
              type: 'button',
              onClick: function () { goTo('#/' + cfg.lang + '-review'); }
            }, '去錯題本')
          )
        ));
      }

      var rows = sess.questions.map(function (q, i) {
        var ok = sess.answers[i] === q.answer;
        return h('tr', {},
          h('td', {}, String(i + 1)),
          h('td', {}, q.prompt),
          h('td', {}, q.options[q.answer]),
          h('td', {}, ok
            ? h('span.badge.badge-success', {}, '✓')
            : h('span.badge.badge-danger', {}, '✗ 你選了 ' +
              (sess.answers[i] !== undefined ? q.options[sess.answers[i]] : '未作答')))
        );
      });
      host.appendChild(h('div.table-wrap.u-mt-md', {},
        h('table.table', {},
          h('thead', {}, h('tr', {},
            h('th', {}, '#'), h('th', {}, '題目'), h('th', {}, '正解'), h('th', {}, '結果'))),
          h('tbody', {}, rows)
        )
      ));

      host.appendChild(h('div.u-flex.u-gap-sm.u-mt-md', { style: { flexWrap: 'wrap' } },
        h('button.btn.btn-primary', { type: 'button', onClick: start }, '再來一組'),
        h('button.btn.btn-ghost', {
          type: 'button',
          onClick: function () { S.session = null; paint(); }
        }, '回設定')
      ));
    }

    function paint() {
      clearNode(host);
      if (!S.session) paintSetup();
      else if (S.session.finished) paintResult();
      else paintRunning();
    }

    function render(container, params) {
      host = container;
      params = params || {};
      var defaultMode = (cfg.modes && cfg.modes[0] && cfg.modes[0].code) || 'default';
      S = {
        mode: params.mode || defaultMode,
        count: parseInt(params.count, 10) || (cfg.counts ? cfg.counts[0] : 10),
        session: null
      };
      paint();
    }

    function destroy() {
      if (window.TTS) TTS.stop();
      S = null;
      host = null;
    }

    return { render: render, destroy: destroy };
  }

  // -----------------------------------------------------------------------
  // 3. createWrongBook — 錯題本
  // -----------------------------------------------------------------------

  /**
   * cfg = {
   *   lang, title, subtitle,
   *   resolve(id): { prompt, promptSub?, ttsText?, options[], answer, explain? } | null
   * }
   */
  function createWrongBook(cfg) {
    var S = null;
    var host = null;
    var changeHandler = null;

    function items() {
      var store = storeFor(cfg.lang);
      var state = store.get();
      var today = store.todayISO();
      return Object.keys(state.wrongBook || {}).map(function (id) {
        var e = store.normalizeWrongEntry(state.wrongBook[id], today);
        return {
          id: id,
          entry: e,
          resolved: cfg.resolve(id),
          isDue: !e.mastered && (e.due || today) <= today
        };
      }).sort(function (a, b) {
        if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
        var d = (a.entry.due || '').localeCompare(b.entry.due || '');
        return d || (b.entry.count - a.entry.count);
      });
    }

    function openRedo(id, onDone) {
      var q = cfg.resolve(id);
      if (!q) {
        Util.toast('找不到這題的資料，已略過', 'warning');
        if (onDone) onDone(null);
        return;
      }
      var store = storeFor(cfg.lang);
      var answered = false;
      var scheduled = false;
      var picked = null;
      var wrap = h('div');
      var close = null;

      function paintModal() {
        clearNode(wrap);
        wrap.appendChild(h('div', { style: { textAlign: 'center', marginBottom: '12px' } },
          h('div', { style: { fontSize: '1.9rem', fontWeight: '700' } }, q.prompt),
          q.promptSub ? h('div.u-text-muted', { style: { marginTop: '4px' } }, q.promptSub) : null,
          q.ttsText ? h('div', { style: { marginTop: '8px' } },
            ttsButton(q.ttsText, cfg.lang, { label: '🔊 播放', small: true })) : null
        ));

        wrap.appendChild(h('div.option-list', {},
          q.options.map(function (opt, i) {
            var classes = ['option-btn'];
            if (answered) {
              if (i === q.answer) classes.push('is-correct');
              else if (i === picked) classes.push('is-incorrect');
            }
            return h('button', {
              type: 'button',
              class: classes.join(' '),
              disabled: answered,
              onClick: function () {
                picked = i;
                answered = true;
                if (!scheduled) {
                  scheduled = true;
                  try { store.reviewWrong(id, i === q.answer); }
                  catch (e) { Util.toast('更新排程失敗：' + e.message, 'error'); }
                }
                paintModal();
              }
            },
              h('span.option-label', {}, OPTION_LETTERS[i] || String(i + 1)),
              h('span.option-text', {}, opt)
            );
          })
        ));

        if (answered) {
          var ok = picked === q.answer;
          var rec = store.normalizeWrongEntry(store.get().wrongBook[id], store.todayISO());
          wrap.appendChild(h('div.card', { style: { marginTop: '14px' } },
            h('div.card-body', {},
              h('h3', {}, ok ? '✅ 答對了' : '❌ 還不熟，明天再來一次'),
              q.explain ? h('p', { style: { marginTop: '4px' } }, q.explain) : null,
              h('p', { style: { marginTop: '6px' } }, rec.mastered
                ? '🎓 連續答對，已升到第 5 箱 → 標記為精通'
                : ('📅 ' + BOX_LABELS[rec.box - 1] + '，下次複習：' + rec.due)),
              h('p.u-text-muted', { style: { fontSize: '0.85rem', marginTop: '4px' } },
                '累計重做 ' + rec.reviews + ' 次，答對 ' + rec.rights + ' 次。')
            )
          ));

          if (!ok) wrap.appendChild(buildReasonPicker(id, paintModal));

          wrap.appendChild(h('div.u-flex.u-justify-end.u-mt-md', {},
            h('button.btn.btn-primary.btn-sm', {
              type: 'button',
              onClick: function () { if (close) close(); if (onDone) onDone(ok); }
            }, '下一題 →')
          ));
        }
      }

      paintModal();
      close = Util.modal({ title: '重做 · ' + id, body: wrap, actions: [] });
      S.activeModalClose = close;
    }

    function buildReasonPicker(id, onChange) {
      var store = storeFor(cfg.lang);
      var current = (store.get().wrongBook[id] || {}).reason || '';
      var row = h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', marginTop: '8px' } });
      REASONS.forEach(function (r) {
        row.appendChild(h('button', {
          type: 'button',
          class: 'btn btn-sm ' + (current === r.code ? 'btn-primary' : 'btn-ghost'),
          onClick: function () {
            try { store.setWrongReason(id, current === r.code ? '' : r.code); }
            catch (e) { Util.toast('標記失敗：' + e.message, 'error'); }
            if (onChange) onChange();
          }
        }, r.icon + ' ' + r.label));
      });
      var def = reasonDef(current);
      return h('div.card', { style: { marginTop: '12px', background: 'var(--color-surface-alt)' } },
        h('div.card-body', {},
          h('h3', {}, '為什麼錯？'),
          row,
          def ? h('p', { style: { marginTop: '8px' } }, '👉 ' + def.advice) : null
        )
      );
    }

    function runQueue(ids) {
      if (!ids.length) {
        Util.toast('目前沒有可重做的題目', 'info');
        return;
      }
      var queue = ids.slice();
      var right = 0;
      var done = 0;
      function step() {
        if (!queue.length) {
          Util.toast('本輪完成：' + right + ' / ' + done + ' 題答對', 'success');
          paint();
          return;
        }
        openRedo(queue.shift(), function (ok) {
          if (ok !== null) { done += 1; if (ok) right += 1; }
          step();
        });
      }
      step();
    }

    function paint() {
      clearNode(host);
      var list = items();
      var due = list.filter(function (i) { return i.isDue; });
      var unmastered = list.filter(function (i) { return !i.entry.mastered; });

      host.appendChild(langHeader(cfg.lang, cfg.title,
        '共 ' + list.length + ' 題 · ' + unmastered.length + ' 題未精通 · 今天該複習 ' + due.length + ' 題'));

      if (!list.length) {
        host.appendChild(emptyState('🎉', '目前沒有錯題', '去做幾題測驗累積練習量吧。',
          '開始測驗', '#/' + cfg.lang + '-quiz'));
        return;
      }

      if (due.length) {
        host.appendChild(h('div.card', {},
          h('div.card-title', {}, '📅 今天有 ' + due.length + ' 題該複習'),
          h('div.card-subtitle', {},
            '答對往上一箱（1 → 2 → 4 → 7 → 14 天後再見），答錯退回第 1 箱明天重來。'),
          h('div.card-actions', {},
            h('button.btn.btn-primary', {
              type: 'button',
              onClick: function () { runQueue(due.map(function (i) { return i.id; })); }
            }, '開始複習')
          )
        ));
      }

      // 錯因分佈
      var counts = {};
      var untagged = 0;
      list.forEach(function (i) {
        if (!i.entry.reason) untagged += 1;
        else counts[i.entry.reason] = (counts[i.entry.reason] || 0) + 1;
      });
      var reasonBody = h('div.card-body', {});
      if (untagged === list.length) {
        reasonBody.appendChild(h('p', {},
          '這 ' + list.length + ' 題都還沒標記錯因。重做時在解析下方選一個，之後就知道自己主要輸在哪。'));
      } else {
        REASONS.forEach(function (r) {
          var c = counts[r.code] || 0;
          if (!c) return;
          reasonBody.appendChild(h('div', { style: { marginTop: '10px' } },
            h('div.u-flex.u-justify-between', {},
              h('span', {}, r.icon + ' ' + r.label),
              h('span.u-text-muted', {}, c + ' 題（' + pct(c, list.length) + '%）')),
            h('div.progress-bar', { style: { marginTop: '4px' } },
              h('div.progress-bar-fill', { style: { width: pct(c, list.length) + '%' } }))
          ));
        });
        if (untagged) {
          reasonBody.appendChild(h('p.u-text-muted', { style: { marginTop: '10px' } },
            '還有 ' + untagged + ' 題未標記錯因。'));
        }
      }
      host.appendChild(h('div.card', {},
        h('div.card-header', {}, h('div.card-title', {}, '錯因分佈')),
        reasonBody
      ));

      host.appendChild(h('div.u-flex.u-justify-between.u-items-center.u-mt-md',
        { style: { flexWrap: 'wrap', gap: '10px' } },
        h('span.u-text-muted', {}, '共 ' + list.length + ' 題'),
        h('button.btn.btn-ghost.btn-sm', {
          type: 'button',
          disabled: !unmastered.length,
          onClick: function () { runQueue(unmastered.map(function (i) { return i.id; })); }
        }, '重做全部未精通（' + unmastered.length + '）')
      ));

      var rows = list.map(function (it) {
        var q = it.resolved;
        var rDef = reasonDef(it.entry.reason);
        return h('tr', {},
          h('td', {}, q ? q.prompt : ('（找不到資料：' + it.id + '）')),
          h('td', {}, q ? q.options[q.answer] : '—'),
          h('td', {}, rDef ? (rDef.icon + ' ' + rDef.label) : h('span.u-text-muted', {}, '未標記')),
          h('td', {}, String(it.entry.count)),
          h('td', {}, it.entry.mastered ? '—' : (it.entry.due || '—')),
          h('td', {}, it.entry.mastered
            ? h('span.badge.badge-success', {}, '已精通')
            : (it.isDue
              ? h('span.badge.badge-danger', {}, '今天該複習')
              : h('span.badge.badge-warning', {}, BOX_LABELS[it.entry.box - 1]))),
          h('td', {}, h('button.btn.btn-ghost.btn-sm', {
            type: 'button',
            disabled: !q,
            onClick: function () { runQueue([it.id]); }
          }, '重做'))
        );
      });
      host.appendChild(h('div.table-wrap.u-mt-md', {},
        h('table.table', {},
          h('thead', {}, h('tr', {},
            h('th', {}, '題目'), h('th', {}, '正解'), h('th', {}, '錯因'),
            h('th', {}, '錯次'), h('th', {}, '下次複習'), h('th', {}, '狀態'), h('th', {}, '操作'))),
          h('tbody', {}, rows)
        )
      ));
    }

    function render(container) {
      host = container;
      S = { activeModalClose: null };
      paint();
      changeHandler = function (e) {
        if (e && e.detail && e.detail.lang && e.detail.lang !== cfg.lang) return;
        if (!S) return;
        paint();
      };
      window.addEventListener('lang:change', changeHandler);
    }

    function destroy() {
      if (changeHandler) {
        window.removeEventListener('lang:change', changeHandler);
        changeHandler = null;
      }
      if (S && S.activeModalClose) {
        try { S.activeModalClose(); } catch (e) { /* 忽略關閉失敗 */ }
      }
      if (window.TTS) TTS.stop();
      S = null;
      host = null;
    }

    return { render: render, destroy: destroy };
  }

  // -----------------------------------------------------------------------
  // 4. createHome — 該語言的學習總覽
  // -----------------------------------------------------------------------

  /**
   * cfg = {
   *   lang, title, subtitle,
   *   sections(): [{ id, icon, label, desc, hash, ids?, lessonIds? }]   // ids 有值時顯示 SRS 進度
   *   nextStep(state): { title, detail, actionLabel, hash } | null      // 「接下來學什麼」
   * }
   */
  function createHome(cfg) {
    var host = null;
    var changeHandler = null;

    function paint() {
      clearNode(host);
      var store = storeFor(cfg.lang);
      var state = store.get();
      var meta = langMeta(cfg.lang);

      host.appendChild(langHeader(cfg.lang, cfg.title, cfg.subtitle));
      host.appendChild(voiceNotice(cfg.lang));

      // 連續天數 + 總覽
      var sections = cfg.sections() || [];
      var totalCards = 0;
      var totalMastered = 0;
      sections.forEach(function (s) {
        if (!s.ids) return;
        var st = store.cardStats(s.ids);
        totalCards += st.total;
        totalMastered += st.mastered;
      });
      var dueCount = store.dueWrongIds().length;

      host.appendChild(h('div.stat-grid', {},
        h('div.stat-card', {},
          h('div.stat-value', {}, String(state.streak.current)),
          h('div.stat-label', {}, '連續學習天數'),
          h('div.u-text-muted', { style: { fontSize: '0.75rem', marginTop: '2px' } },
            '最佳 ' + state.streak.best + ' 天')),
        h('div.stat-card', {},
          h('div.stat-value', {}, totalMastered + ' / ' + totalCards),
          h('div.stat-label', {}, '已熟練項目')),
        h('div.stat-card', {},
          h('div.stat-value', {}, String(dueCount)),
          h('div.stat-label', {}, '待複習錯題'))
      ));

      // 接下來學什麼
      var next = cfg.nextStep ? cfg.nextStep(state, store) : null;
      if (next) {
        host.appendChild(h('div.card', {},
          h('div.card-title', {}, '👉 接下來'),
          h('div.card-subtitle', {}, next.title),
          h('p', { style: { marginTop: '8px' } }, next.detail),
          h('div.card-actions', {},
            h('button.btn.btn-primary', {
              type: 'button',
              onClick: function () { goTo(next.hash); }
            }, next.actionLabel)
          )
        ));
      }

      if (dueCount) {
        host.appendChild(h('div.card', {},
          h('div.card-title', {}, '🔁 有 ' + dueCount + ' 題錯題今天到期'),
          h('div.card-subtitle', {}, '先把錯過的清掉，再學新的東西。'),
          h('div.card-actions', {},
            h('button.btn.btn-primary.btn-sm', {
              type: 'button',
              onClick: function () { goTo('#/' + cfg.lang + '-review'); }
            }, '去錯題本')
          )
        ));
      }

      // 各單元進度
      var grid = h('div', {
        style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }
      });
      sections.forEach(function (s) {
        var body = [];
        if (s.ids) {
          var st = store.cardStats(s.ids);
          body.push(h('div', { style: { marginTop: '10px' } }, progressBar(st.mastered, st.total)));
          body.push(h('p.u-text-muted', { style: { fontSize: '0.82rem', marginTop: '4px' } },
            '已熟練 ' + st.mastered + ' / ' + st.total +
            (st.due ? ('　·　今日待複習 ' + st.due) : '')));
        }
        if (s.lessonIds) {
          var doneCount = s.lessonIds.filter(function (id) { return store.isLessonDone(id); }).length;
          body.push(h('div', { style: { marginTop: '10px' } }, progressBar(doneCount, s.lessonIds.length)));
          body.push(h('p.u-text-muted', { style: { fontSize: '0.82rem', marginTop: '4px' } },
            '已讀 ' + doneCount + ' / ' + s.lessonIds.length + ' 課'));
        }
        grid.appendChild(h('div.card.card-clickable', {
          onClick: function () { goTo(s.hash); }
        },
          h('div.u-flex.u-items-center.u-gap-sm', {},
            h('span', { style: { fontSize: '1.4rem' } }, s.icon),
            h('strong', {}, s.label)
          ),
          h('p.u-text-muted', { style: { fontSize: '0.85rem', marginTop: '4px' } }, s.desc),
          body
        ));
      });
      host.appendChild(h('div', { style: { marginTop: '16px' } }, grid));

      // 資料管理
      host.appendChild(h('div.card', {},
        h('div.card-title', {}, '這個語言的學習資料'),
        h('div.card-subtitle', {},
          '存在瀏覽器的 ' + meta.storageKey + '，與其他語言完全獨立。'),
        h('div.u-flex.u-gap-sm', { style: { marginTop: '12px', flexWrap: 'wrap' } },
          h('button.btn.btn-ghost.btn-sm', {
            type: 'button',
            onClick: function () {
              var json = store.export();
              Util.modal({
                title: '匯出 ' + meta.label + ' 進度',
                body: h('textarea.textarea', {
                  readOnly: true, rows: 12,
                  style: { width: '100%', fontFamily: 'monospace', fontSize: '0.75rem' },
                  value: json
                }),
                actions: [{ label: '關閉', class: 'btn btn-primary' }]
              });
            }
          }, '匯出進度'),
          h('button.btn.btn-ghost.btn-sm', {
            type: 'button',
            onClick: function () {
              var ta = h('textarea.textarea', {
                rows: 10, placeholder: '貼上先前匯出的 JSON',
                style: { width: '100%', fontFamily: 'monospace', fontSize: '0.75rem' }
              });
              Util.modal({
                title: '匯入 ' + meta.label + ' 進度',
                body: ta,
                actions: [
                  { label: '取消', class: 'btn btn-ghost' },
                  {
                    label: '匯入', class: 'btn btn-primary',
                    onClick: function (close) {
                      try {
                        store.import(ta.value);
                        Util.toast('匯入成功', 'success');
                        close();
                        paint();
                      } catch (e) {
                        Util.toast('匯入失敗：' + e.message, 'error');
                      }
                    }
                  }
                ]
              });
            }
          }, '匯入進度'),
          h('button.btn.btn-danger.btn-sm', {
            type: 'button',
            onClick: function () {
              Util.modal({
                title: '確定要重置嗎？',
                body: '這會清除「' + meta.label + '」的所有學習進度（其他語言不受影響），且無法復原。',
                actions: [
                  { label: '取消', class: 'btn btn-ghost' },
                  {
                    label: '確定重置', class: 'btn btn-danger',
                    onClick: function (close) {
                      store.reset();
                      Util.toast('已重置', 'success');
                      close();
                      paint();
                    }
                  }
                ]
              });
            }
          }, '重置這個語言')
        )
      ));
    }

    function render(container, params) {
      host = container;
      if (params && params.task) {
        try { storeFor(cfg.lang).completeLesson(params.task); } catch (e) { /* 不阻斷渲染 */ }
      }
      try { storeFor(cfg.lang).touchStreak(); } catch (e) { /* 不阻斷渲染 */ }
      paint();
      changeHandler = function (e) {
        if (e && e.detail && e.detail.lang && e.detail.lang !== cfg.lang) return;
        if (host) paint();
      };
      window.addEventListener('lang:change', changeHandler);
    }

    function destroy() {
      if (changeHandler) {
        window.removeEventListener('lang:change', changeHandler);
        changeHandler = null;
      }
      if (window.TTS) TTS.stop();
      host = null;
    }

    return { render: render, destroy: destroy };
  }

  window.LangUI = {
    REASONS: REASONS.slice(),
    BOX_LABELS: BOX_LABELS.slice(),
    h: h,
    goTo: goTo,
    clearNode: clearNode,
    langMeta: langMeta,
    storeFor: storeFor,
    shuffle: shuffle,
    ttsButton: ttsButton,
    voiceNotice: voiceNotice,
    langHeader: langHeader,
    progressStrip: progressStrip,
    progressBar: progressBar,
    emptyState: emptyState,
    createDeck: createDeck,
    createDrill: createDrill,
    createWrongBook: createWrongBook,
    createHome: createHome
  };
})(typeof window !== 'undefined' ? window : globalThis);
