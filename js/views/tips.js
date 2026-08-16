/**
 * js/views/tips.js — 技巧庫（#/tips）
 * Part 篩選（含數量）、priority 篩選、關鍵字搜尋、「只看未掌握」切換；
 * 卡片顯示 title/detail/steps/pitfalls/example/sources、「已掌握」toggle（Store.tipsMastered）。
 * params.part 為預設 Part 篩選；params.count + params.task 存在時顯示本日任務進度條，
 * 累積「已掌握」或「已閱讀」達 count 條後自動 Store.completeTask(task) 並 toast。
 * 純 IIFE，暴露 window.Views.tips = { render, destroy }。
 */
(function () {
  'use strict';

  var PART_CODES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'General', 'Vocab', 'Time', 'Plan'];
  var PRIORITY_CODES = ['high', 'medium', 'low'];
  var PRIORITY_LABEL = { high: '高', medium: '中', low: '低' };
  var PRIORITY_BADGE = { high: 'badge-danger', medium: 'badge-warning', low: 'badge' };

  // 單一 module-level 執行狀態，每次 render() 重新初始化
  var S = null;

  function partLabel(code) {
    return code === 'all' ? '全部' : code;
  }

  function priorityLabel(code) {
    return code === 'all' ? '全部' : (PRIORITY_LABEL[code] || code);
  }

  function sourceHost(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      return String(url || '');
    }
  }

  function matchesKeyword(tip, kwLower) {
    if (!kwLower) return true;
    var hay = [tip.title_zh || '', tip.title_en || '', tip.detail_zh || '']
      .concat(tip.steps || [])
      .join('  ')
      .toLowerCase();
    return hay.indexOf(kwLower) !== -1;
  }

  function filterTips() {
    var f = S.filters;
    var kwLower = f.keyword.trim().toLowerCase();
    return S.allTips.filter(function (t) {
      if (f.part !== 'all' && t.part !== f.part) return false;
      if (f.priority !== 'all' && t.priority !== f.priority) return false;
      if (f.unmasteredOnly && S.masteredMap[t.id]) return false;
      if (!matchesKeyword(t, kwLower)) return false;
      return true;
    });
  }

  // -----------------------------------------------------------------------
  // 任務進度（params.count + params.task）
  // -----------------------------------------------------------------------

  function taskScopeTips() {
    if (!S.taskPart) return S.allTips;
    return S.allTips.filter(function (t) { return t.part === S.taskPart; });
  }

  function taskDoneCount() {
    var scope = taskScopeTips();
    var n = 0;
    scope.forEach(function (t) {
      if (S.masteredMap[t.id] || S.sessionReadIds[t.id]) n += 1;
    });
    return n;
  }

  function refreshProgress() {
    if (!S.taskCount) return;
    var done = Math.min(taskDoneCount(), S.taskCount);
    var pct = Util.pct(done, S.taskCount);
    S.progressFillEl.style.width = pct + '%';
    S.progressFillEl.classList.toggle('is-success', done >= S.taskCount);
    S.progressTextEl.textContent = done + ' / ' + S.taskCount + (done >= S.taskCount ? '（已完成！）' : '');

    if (done >= S.taskCount && !Store.isTaskDone(S.taskId)) {
      Store.completeTask(S.taskId);
      Util.toast('已完成本日任務：閱讀 ' + S.taskCount + ' 條技巧', 'success');
    }
  }

  // -----------------------------------------------------------------------
  // 卡片
  // -----------------------------------------------------------------------

  function toggleMastered(tip) {
    var next = !S.masteredMap[tip.id];
    var newState = Store.update(['tipsMastered', tip.id], next);
    S.masteredMap = newState.tipsMastered;
    if (next) delete S.sessionReadIds[tip.id]; // 已掌握本身即涵蓋已讀
    renderList();
    refreshProgress();
  }

  function toggleRead(tip, checked) {
    if (checked) S.sessionReadIds[tip.id] = true;
    else delete S.sessionReadIds[tip.id];
    refreshProgress();
    // 只需更新這張卡片本身的視覺狀態，不必整份重建列表
  }

  function buildStepsList(steps) {
    if (!steps || !steps.length) return null;
    return Util.h('div.u-mt-md', {},
      Util.h('div', { class: 'card-subtitle' }, '步驟'),
      Util.h('ol', { style: { margin: '6px 0 0', paddingLeft: '20px', color: 'var(--color-text-secondary)' } },
        steps.map(function (s) { return Util.h('li', {}, s); })
      )
    );
  }

  function buildPitfalls(pitfalls) {
    if (!pitfalls || !pitfalls.length) return null;
    return Util.h('div.u-mt-md', {
      style: {
        background: 'var(--color-warning-soft)',
        borderLeft: '3px solid var(--color-warning)',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px'
      }
    },
      Util.h('div', { style: { fontWeight: '700', color: 'var(--color-warning)' } }, '⚠ 常見陷阱'),
      Util.h('ul', { style: { margin: '6px 0 0', paddingLeft: '20px', color: 'var(--color-text-secondary)' } },
        pitfalls.map(function (p) { return Util.h('li', {}, p); })
      )
    );
  }

  function buildExample(example) {
    if (!example) return null;
    return Util.h('div.u-mt-md', {},
      Util.h('div', { class: 'card-subtitle' }, '例句'),
      Util.h('div', {
        style: {
          marginTop: '4px',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          background: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          color: 'var(--color-text)'
        }
      }, example)
    );
  }

  function buildSources(sources) {
    if (!sources || !sources.length) return null;
    return Util.h('div.u-mt-md', {},
      Util.h('div', { class: 'card-subtitle' }, '參考來源'),
      Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', marginTop: '4px' } },
        sources.map(function (url) {
          return Util.h('a', {
            href: url,
            target: '_blank',
            rel: 'noopener',
            class: 'badge badge-primary',
            style: { textDecoration: 'none' }
          }, '🔗 ' + sourceHost(url));
        })
      )
    );
  }

  function renderTipCard(tip) {
    var isMastered = !!S.masteredMap[tip.id];
    var isRead = !!S.sessionReadIds[tip.id];
    var priorityBadgeClass = PRIORITY_BADGE[tip.priority] || 'badge';

    var badges = Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', flexShrink: '0' } },
      Util.h('span', { class: 'badge badge-primary' }, tip.part),
      Util.h('span', { class: 'badge ' + priorityBadgeClass }, priorityLabel(tip.priority) + '優先'),
      isMastered
        ? Util.h('span', { class: 'badge badge-success' }, '已掌握')
        : Util.h('span', { class: 'badge badge-warning' }, '未掌握')
    );

    var readRow = null;
    if (S.taskCount) {
      readRow = Util.h('label', { class: 'checkbox-row' },
        Util.h('input', {
          type: 'checkbox',
          checked: isMastered || isRead,
          disabled: isMastered,
          onChange: function (e) { toggleRead(tip, e.target.checked); }
        }),
        Util.h('span', {}, '已閱讀（計入今日任務）')
      );
    }

    return Util.h('div.card', {},
      Util.h('div.card-header', {},
        Util.h('div', {},
          Util.h('div.card-title', {}, tip.title_zh || tip.id),
          Util.h('div.card-subtitle', {}, tip.title_en || '')
        ),
        badges
      ),
      Util.h('div.card-body', {},
        Util.h('p', {}, tip.detail_zh || ''),
        buildStepsList(tip.steps),
        buildPitfalls(tip.pitfalls),
        buildExample(tip.example),
        buildSources(tip.sources),
        readRow
      ),
      Util.h('div.card-actions', {},
        Util.h('button', {
          class: 'btn btn-sm ' + (isMastered ? 'btn-ghost' : 'btn-primary'),
          onClick: function () { toggleMastered(tip); }
        }, isMastered ? '取消已掌握' : '標記已掌握')
      )
    );
  }

  function renderList() {
    var listWrap = S.listWrapEl;
    while (listWrap.firstChild) listWrap.removeChild(listWrap.firstChild);

    var tips = filterTips();
    if (!tips.length) {
      listWrap.appendChild(Util.h('div.empty-state', {},
        Util.h('div.empty-state-icon', {}, '🔍'),
        Util.h('h2', {}, '找不到符合條件的技巧'),
        Util.h('p', {}, '試試調整 Part、優先度或關鍵字篩選條件。')
      ));
      return;
    }
    tips.forEach(function (tip) {
      listWrap.appendChild(renderTipCard(tip));
    });
  }

  // -----------------------------------------------------------------------
  // 篩選列
  // -----------------------------------------------------------------------

  function setActiveChip(chipList, activeCode) {
    chipList.forEach(function (item) {
      var active = item.code === activeCode;
      item.el.classList.toggle('btn-primary', active);
      item.el.classList.toggle('btn-ghost', !active);
    });
  }

  function buildPartChips() {
    var codes = ['all'].concat(PART_CODES);
    var chips = [];
    var row = Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
    codes.forEach(function (code) {
      var count = code === 'all' ? S.allTips.length : S.allTips.filter(function (t) { return t.part === code; }).length;
      var isActive = S.filters.part === code;
      var btn = Util.h('button', {
        class: 'btn btn-sm ' + (isActive ? 'btn-primary' : 'btn-ghost'),
        onClick: function () {
          S.filters.part = code;
          setActiveChip(S.partChips, code);
          renderList();
        }
      }, partLabel(code) + '（' + count + '）');
      chips.push({ code: code, el: btn });
      row.appendChild(btn);
    });
    S.partChips = chips;
    return row;
  }

  function buildPriorityChips() {
    var codes = ['all'].concat(PRIORITY_CODES);
    var chips = [];
    var row = Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
    codes.forEach(function (code) {
      var isActive = S.filters.priority === code;
      var btn = Util.h('button', {
        class: 'btn btn-sm ' + (isActive ? 'btn-primary' : 'btn-ghost'),
        onClick: function () {
          S.filters.priority = code;
          setActiveChip(S.priorityChips, code);
          renderList();
        }
      }, priorityLabel(code));
      chips.push({ code: code, el: btn });
      row.appendChild(btn);
    });
    S.priorityChips = chips;
    return row;
  }

  function buildFilterBar() {
    var searchInput = Util.h('input', {
      class: 'input',
      type: 'search',
      placeholder: '搜尋標題、內容或步驟關鍵字…',
      value: S.filters.keyword,
      onInput: function (e) {
        var val = e.target.value;
        clearTimeout(S.searchTimer);
        S.searchTimer = setTimeout(function () {
          S.filters.keyword = val;
          renderList();
        }, 250);
      }
    });

    var unmasteredCheckbox = Util.h('label', { class: 'checkbox-row' },
      Util.h('input', {
        type: 'checkbox',
        checked: S.filters.unmasteredOnly,
        onChange: function (e) {
          S.filters.unmasteredOnly = e.target.checked;
          renderList();
        }
      }),
      Util.h('span', {}, '只看未掌握')
    );

    return Util.h('div.card', {},
      Util.h('div.card-body', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
        Util.h('div', {},
          Util.h('div', { class: 'card-subtitle u-mt-md', style: { marginTop: '0' } }, 'Part'),
          buildPartChips()
        ),
        Util.h('div', {},
          Util.h('div', { class: 'card-subtitle' }, '優先度'),
          buildPriorityChips()
        ),
        Util.h('div.field', { style: { marginBottom: '0' } },
          Util.h('label', { class: 'field-label' }, '關鍵字搜尋'),
          searchInput
        ),
        unmasteredCheckbox
      )
    );
  }

  function buildTaskProgress() {
    if (!S.taskCount) return null;

    S.progressFillEl = Util.h('div.progress-bar-fill', { style: { width: '0%' } });
    S.progressTextEl = Util.h('div.u-text-secondary.u-text-center.u-mt-md', {}, '0 / ' + S.taskCount);

    var card = Util.h('div.card', {},
      Util.h('div.card-header', {},
        Util.h('div', {},
          Util.h('div.card-title', {}, '本日任務：閱讀 ' + S.taskCount + ' 條'),
          Util.h('div.card-subtitle', {}, S.taskPart ? ('範圍：Part ' + S.taskPart) : '範圍：全部技巧')
        )
      ),
      Util.h('div.card-body', {},
        Util.h('div.progress-bar', {}, S.progressFillEl),
        S.progressTextEl
      )
    );
    return card;
  }

  // -----------------------------------------------------------------------
  // render / destroy
  // -----------------------------------------------------------------------

  function render(container, params) {
    params = params || {};
    var data = (window.TOEIC_DATA && window.TOEIC_DATA.tips) || [];

    S = {
      allTips: data,
      masteredMap: (Store.get().tipsMastered) || {},
      sessionReadIds: {},
      filters: {
        part: params.part && PART_CODES.indexOf(params.part) !== -1 ? params.part : 'all',
        priority: 'all',
        keyword: '',
        unmasteredOnly: false
      },
      taskPart: params.part || '',
      taskCount: parseInt(params.count, 10) || 0,
      taskId: params.task || '',
      searchTimer: null,
      listWrapEl: null,
      progressFillEl: null,
      progressTextEl: null,
      partChips: [],
      priorityChips: []
    };
    if (!S.taskId) S.taskCount = 0; // task/count 必須成對出現才啟用進度追蹤

    container.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, '技巧庫'),
        Util.h('p.view-subtitle', {}, '依 Part、優先度篩選作答與聽力技巧，讀完就標記已掌握。')
      )
    ));

    if (!S.allTips.length) {
      container.appendChild(Util.h('div.empty-state', {},
        Util.h('div.empty-state-icon', {}, '📭'),
        Util.h('h2', {}, '尚無技巧資料'),
        Util.h('p', {}, '技巧資料尚未載入，請確認 data/tips.js 已正確引入。')
      ));
      return;
    }

    var progressCard = buildTaskProgress();
    if (progressCard) container.appendChild(progressCard);

    container.appendChild(buildFilterBar());

    S.listWrapEl = Util.h('div.u-flex-col', { style: { gap: '0' } });
    container.appendChild(S.listWrapEl);

    renderList();
    refreshProgress();
  }

  function destroy() {
    if (S && S.searchTimer) clearTimeout(S.searchTimer);
    S = null;
  }

  window.Views = window.Views || {};
  window.Views.tips = { render: render, destroy: destroy };
})();
