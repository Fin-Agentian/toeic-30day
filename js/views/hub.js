/**
 * js/views/hub.js — 語言選擇入口（#/hub）
 *
 * 平台首頁：列出所有語言，各自顯示目前進度摘要，選一個才進入該語言的學習介面。
 * 英語走 window.Store（TOEIC），日西走 LangStore；本檔負責把兩種來源
 * 收斂成同一種摘要卡片。任一語言的資料讀取失敗都只影響那張卡，不影響其他語言。
 *
 * 暴露：window.Views.hub = { render, destroy }
 */
(function () {
  'use strict';

  function h() { return Util.h.apply(null, arguments); }

  function goTo(hash) {
    if (window.App && typeof window.App.navigate === 'function') window.App.navigate(hash);
    else window.location.hash = hash;
  }

  /** 英語（TOEIC）的摘要：距考試天數、Day X/30、閱讀正確率、待複習錯題 */
  function summaryForToeic() {
    if (!window.Store) return null;
    var state = window.Store.get();
    var today = Util.todayISO();
    var daysLeft = Util.diffDays(today, state.examDate);
    var dayIdx = window.Store.getDayIndex();

    var due = 0;
    Object.keys(state.wrongBook || {}).forEach(function (id) {
      var e = state.wrongBook[id] || {};
      if (!e.mastered && (!e.due || e.due <= today)) due += 1;
    });

    var rcText = '—';
    if (window.Reading && typeof window.Reading.estimateRC === 'function') {
      var rc = window.Reading.estimateRC(state);
      if (rc.score !== null) rcText = String(rc.score);
    }

    return {
      started: (state.quizHistory || []).length > 0 ||
        Object.keys(state.completedTasks || {}).length > 0,
      streak: (state.streak && state.streak.current) || 0,
      due: due,
      stats: [
        { value: dayIdx ? ('Day ' + dayIdx + '/30') : '未開始', label: '學習進度' },
        { value: rcText, label: '粗估 RC 分數' },
        { value: daysLeft >= 0 ? (daysLeft + ' 天') : '已結束', label: '距考試' }
      ]
    };
  }

  /** 日西的摘要：連續天數、已熟練項目、待複習錯題 */
  function summaryForLang(code) {
    if (!window.LangStore) return null;
    var store = window.LangStore.for(code);
    var state = store.get();
    var counter = window.LangContent && window.LangContent[code];
    var totals = counter && typeof counter.summary === 'function'
      ? counter.summary(store)
      : { mastered: 0, total: 0, unit: '項目' };

    return {
      started: (state.quizHistory || []).length > 0 ||
        Object.keys(state.cards || {}).length > 0 ||
        Object.keys(state.lessonsDone || {}).length > 0,
      streak: (state.streak && state.streak.current) || 0,
      due: store.dueWrongIds().length,
      stats: [
        { value: state.streak.current + ' 天', label: '連續學習' },
        { value: totals.mastered + ' / ' + totals.total, label: '已熟練' + totals.unit },
        { value: String(store.dueWrongIds().length), label: '待複習錯題' }
      ]
    };
  }

  function summaryFor(lang) {
    try {
      return lang.engine === 'toeic' ? summaryForToeic() : summaryForLang(lang.code);
    } catch (e) {
      // 單一語言的資料有問題不該讓整個入口頁掛掉
      if (window.console && console.warn) console.warn('[hub] 讀取 ' + lang.code + ' 進度失敗', e);
      return null;
    }
  }

  function buildCard(lang) {
    var summary = summaryFor(lang);

    var statRow = h('div.stat-grid', { style: { marginTop: '14px' } },
      (summary ? summary.stats : []).map(function (s) {
        return h('div.stat-card', {},
          h('div.stat-value', { style: { fontSize: '1.15rem' } }, s.value),
          h('div.stat-label', {}, s.label)
        );
      })
    );

    return h('div.card.card-clickable', {
      style: { borderTop: '4px solid ' + lang.accent },
      onClick: function () { enter(lang); }
    },
      h('div.u-flex.u-items-center.u-justify-between', { style: { flexWrap: 'wrap', gap: '8px' } },
        h('div.u-flex.u-items-center.u-gap-sm', {},
          h('span', { style: { fontSize: '2rem' }, 'aria-hidden': 'true' }, lang.flag),
          h('div', {},
            h('div', { style: { fontWeight: '700', fontSize: '1.15rem' } }, lang.label),
            h('div.u-text-muted', { style: { fontSize: '0.85rem' } }, lang.native + ' · ' + lang.level)
          )
        ),
        summary && summary.due
          ? h('span.badge.badge-danger', {}, '🔁 ' + summary.due + ' 題待複習')
          : (summary && summary.streak
            ? h('span.badge.badge-success', {}, '🔥 連續 ' + summary.streak + ' 天')
            : h('span.badge', {}, '尚未開始'))
      ),
      h('p.u-text-muted', { style: { marginTop: '10px', fontSize: '0.9rem' } }, lang.tagline),
      summary ? statRow : h('p.u-text-muted', { style: { marginTop: '12px' } }, '（進度讀取失敗）'),
      h('div.card-actions', {},
        h('button.btn.btn-primary.btn-block', {
          type: 'button',
          onClick: function (e) {
            if (e && e.stopPropagation) e.stopPropagation();
            enter(lang);
          }
        }, (summary && summary.started) ? '繼續學習' : '開始學習')
      )
    );
  }

  function enter(lang) {
    if (window.Platform && window.Platform.rememberLang) window.Platform.rememberLang(lang.code);
    goTo('#/' + lang.home);
  }

  function render(container) {
    var languages = (window.Platform && window.Platform.languages()) || [];

    container.appendChild(h('div.view-header', {},
      h('div.view-title', {},
        h('h1', {}, '選擇要學的語言'),
        h('p.view-subtitle', {}, '三個語言的進度各自獨立儲存在這台裝置，互不影響')
      )
    ));

    if (!languages.length) {
      container.appendChild(h('div.empty-state', {},
        h('div.empty-state-icon', {}, '⚠️'),
        h('h2', {}, '找不到語言設定'),
        h('p', {}, '請確認 js/platform.js 已正確載入。')
      ));
      return;
    }

    var grid = h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }
    }, languages.map(buildCard));
    container.appendChild(grid);

    var last = window.Platform.lastLang && window.Platform.lastLang();
    if (last) {
      var lastLang = window.Platform.byCode(last);
      if (lastLang) {
        container.appendChild(h('div.card', { style: { marginTop: '20px' } },
          h('div.u-flex.u-items-center.u-justify-between', { style: { flexWrap: 'wrap', gap: '10px' } },
            h('span', {}, '上次你在學 ' + lastLang.flag + ' ' + lastLang.label),
            h('button.btn.btn-primary.btn-sm', {
              type: 'button',
              onClick: function () { enter(lastLang); }
            }, '接續上次')
          )
        ));
      }
    }

    container.appendChild(h('div.card', { style: { marginTop: '16px' } },
      h('div.card-title', {}, '關於這個平台'),
      h('div.card-body', {},
        h('p', {}, '純靜態網頁，無後端、無帳號、無外部連線。所有學習進度存在你自己瀏覽器的 localStorage，' +
          '換裝置或清除瀏覽資料就會消失 — 各語言頁面內都有「匯出進度」可以備份。'),
        h('p', { style: { marginTop: '8px' } },
          '發音使用瀏覽器內建的 Web Speech API，音色取決於你作業系統已安裝的語音；' +
          '缺少某語言的語音時，該語言頁面會顯示安裝指引。'),
        h('p.u-text-muted', { style: { marginTop: '8px', fontSize: '0.85rem' } },
          '所有題目、例句與教材皆為原創內容。TOEIC 為 ETS 註冊商標，本專案與 ETS 無隸屬或背書關係。')
      )
    ));
  }

  function destroy() {
    if (window.TTS) TTS.stop();
  }

  window.Views = window.Views || {};
  window.Views.hub = { render: render, destroy: destroy };
})();
