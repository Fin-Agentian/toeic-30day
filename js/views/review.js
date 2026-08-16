/**
 * js/views/review.js — 錯題本（#/review）
 * 合併 Store.wrongBook 與 p5/p6/p7/listening 各題資料（依 id 前綴 p5-/p6-/p7-/l1-/l2-/l3-/l4- 查表），
 * 提供篩選（Part / 只看未精通）、排序（次數 / 時間）、統計長條圖、
 * 查看詳解（含聽力逐字稿 + TTS）、單題重做、標記已精通、重做全部未精通（本 view 內逐題進行）。
 * params.task 存在時，進入頁面即視為完成當日任務（Store.completeTask）。
 * 純 IIFE，暴露 window.Views.review = { render, destroy }。
 */
(function () {
  'use strict';

  var LETTERS = ['A', 'B', 'C', 'D'];

  var PART_INFO = {
    p5: { short: 'P5', label: 'P5 單句填空', listening: false,
      data: function () { return (window.TOEIC_DATA && window.TOEIC_DATA.p5) || []; } },
    p6: { short: 'P6', label: 'P6 段落填空', listening: false,
      data: function () { return (window.TOEIC_DATA && window.TOEIC_DATA.p6) || []; } },
    p7: { short: 'P7', label: 'P7 閱讀理解', listening: false,
      data: function () { return (window.TOEIC_DATA && window.TOEIC_DATA.p7) || []; } },
    l1: { short: 'P1', label: 'P1 照片描述（聽力）', listening: true,
      data: function () { return (window.TOEIC_DATA && window.TOEIC_DATA.listening && window.TOEIC_DATA.listening.p1) || []; } },
    l2: { short: 'P2', label: 'P2 應答問題（聽力）', listening: true,
      data: function () { return (window.TOEIC_DATA && window.TOEIC_DATA.listening && window.TOEIC_DATA.listening.p2) || []; } },
    l3: { short: 'P3', label: 'P3 簡短對話（聽力）', listening: true,
      data: function () { return (window.TOEIC_DATA && window.TOEIC_DATA.listening && window.TOEIC_DATA.listening.p3) || []; } },
    l4: { short: 'P4', label: 'P4 簡短獨白（聽力）', listening: true,
      data: function () { return (window.TOEIC_DATA && window.TOEIC_DATA.listening && window.TOEIC_DATA.listening.p4) || []; } }
  };
  var PART_FILTER_CODES = ['all', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'];
  var SORT_OPTIONS = [
    { code: 'count_desc', label: '錯誤次數：多 → 少' },
    { code: 'time_desc', label: '最後作答：新 → 舊' }
  ];

  // ---- module-level 狀態（每次 render() 重新建立） ----
  var S = null;
  var container = null;

  // -----------------------------------------------------------------------
  // 小工具
  // -----------------------------------------------------------------------

  function stripLetterPrefix(s) {
    return String(s || '').replace(/^[A-D][.).:]?\s+/, '');
  }

  function idPrefixKind(id) {
    var m = /^(p5|p6|p7|l1|l2|l3|l4)-/.exec(String(id || ''));
    return m ? m[1] : null;
  }

  function fmtLastAt(iso) {
    if (!iso) return '—';
    var datePart = String(iso).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return String(iso);
    try { return Util.fmtDate(datePart, { weekday: false }); } catch (e) { return datePart; }
  }

  function summaryText(entry, fallbackId) {
    if (!entry) return '（找不到題目資料：' + fallbackId + '）';
    var s = String(entry.summary || '').replace(/\s+/g, ' ').trim();
    if (s.length > 60) s = s.slice(0, 60) + '…';
    return s || '（無題目摘要）';
  }

  // -----------------------------------------------------------------------
  // 題目資料整形：把各來源資料整理成統一的 entry 結構
  // -----------------------------------------------------------------------

  function buildEntry(id) {
    var kind = idPrefixKind(id);
    if (!kind) return null;
    var info = PART_INFO[kind];
    var subMatch = /-q(\d+)$/.exec(id);
    var subIndex = subMatch ? parseInt(subMatch[1], 10) : null;
    var parentId = subMatch ? id.slice(0, id.length - subMatch[0].length) : id;
    var arr = info.data();
    var parent = null;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === parentId) { parent = arr[i]; break; }
    }
    if (!parent) return null;

    if (kind === 'p5') {
      return {
        id: id, partShort: info.short, partLabel: info.label, listening: false,
        summary: parent.stem, stemNode: parent.stem,
        options: parent.options || [], answer: parent.answer, explanation_zh: parent.explanation_zh,
        category: info.short + '·' + (parent.tag || 'other')
      };
    }
    if (kind === 'p6') {
      var qs6 = parent.questions || [];
      var q6 = null;
      if (subIndex !== null) {
        q6 = qs6.filter(function (x) { return x.n === subIndex; })[0] || qs6[subIndex - 1] || null;
      } else {
        q6 = qs6[0] || null;
      }
      if (!q6) return null;
      return {
        id: id, partShort: info.short, partLabel: info.label, listening: false,
        summary: (parent.title || parent.id) + '（第 ' + (q6.n || subIndex || 1) + ' 格）',
        passageText: parent.passage, passageTitle: parent.title,
        options: q6.options || [], answer: q6.answer, explanation_zh: q6.explanation_zh,
        category: info.short + '·' + (q6.type || 'other')
      };
    }
    if (kind === 'p7') {
      var qs7 = parent.questions || [];
      var q7 = subIndex !== null ? (qs7[subIndex - 1] || null) : (qs7[0] || null);
      if (!q7) return null;
      return {
        id: id, partShort: info.short, partLabel: info.label, listening: false,
        summary: q7.q, stemNode: q7.q, passages: parent.passages || [],
        options: q7.options || [], answer: q7.answer, explanation_zh: q7.explanation_zh,
        category: info.short + '·' + (q7.skill || 'other')
      };
    }
    if (kind === 'l1') {
      var stmts = (parent.statements || []).map(stripLetterPrefix);
      return {
        id: id, partShort: info.short, partLabel: info.label, listening: true,
        summary: parent.scene_zh || '照片描述', sceneText: parent.scene_zh, sceneEn: parent.scene_en,
        options: stmts, answer: parent.answer, explanation_zh: parent.explanation_zh,
        category: info.short,
        transcriptLines: stmts.map(function (s, i) { return LETTERS[i] + '. ' + s; }),
        ttsItems: stmts.map(function (t, i) { return { text: LETTERS[i] + '. ' + t, pauseMs: 400 }; })
      };
    }
    if (kind === 'l2') {
      var resp = (parent.responses || []).map(stripLetterPrefix);
      var l2Items = [{ text: parent.question, pauseMs: 500 }];
      resp.forEach(function (t, i) { l2Items.push({ text: LETTERS[i] + '. ' + t, pauseMs: 300 }); });
      return {
        id: id, partShort: info.short, partLabel: info.label, listening: true,
        summary: parent.question, stemNode: parent.question,
        options: resp, answer: parent.answer, explanation_zh: parent.explanation_zh,
        category: info.short + (parent.trap ? ('·' + parent.trap) : ''),
        transcriptLines: ['Q: ' + parent.question].concat(resp.map(function (t, i) { return LETTERS[i] + '. ' + t; })),
        ttsItems: l2Items
      };
    }
    // l3 / l4
    var qsL = parent.questions || [];
    var qL = subIndex !== null ? (qsL[subIndex - 1] || null) : (qsL[0] || null);
    if (!qL) return null;
    var transcriptLines, ttsItems;
    if (kind === 'l3') {
      var script = parent.script || [];
      transcriptLines = script.map(function (line) { return line.s + '：' + line.t; });
      ttsItems = script.map(function (line) { return { text: line.t, gender: line.s === 'W' ? 'female' : 'male', pauseMs: 350 }; });
    } else {
      transcriptLines = [parent.script || ''];
      ttsItems = [{ text: parent.script || '', pauseMs: 0 }];
    }
    return {
      id: id, partShort: info.short, partLabel: info.label, listening: true,
      summary: qL.q, stemNode: qL.q, settingZh: parent.setting_zh,
      options: qL.options || [], answer: qL.answer, explanation_zh: qL.explanation_zh,
      category: info.short,
      transcriptLines: transcriptLines, ttsItems: ttsItems
    };
  }

  // -----------------------------------------------------------------------
  // 資料整理：wrongBook → items
  // -----------------------------------------------------------------------

  function loadItems() {
    var wb = S.wrongBook;
    return Object.keys(wb).map(function (id) {
      var rec = wb[id] || { count: 0, lastAt: null, mastered: false };
      var entry = buildEntry(id);
      var kind = idPrefixKind(id);
      return {
        id: id,
        count: rec.count || 0,
        lastAt: rec.lastAt || null,
        mastered: !!rec.mastered,
        partShort: entry ? entry.partShort : (kind && PART_INFO[kind] ? PART_INFO[kind].short : '？'),
        entry: entry
      };
    });
  }

  function refresh() {
    S.wrongBook = (Store.get().wrongBook) || {};
    S.items = loadItems();
    renderStats();
    renderList();
    renderCounts();
  }

  // -----------------------------------------------------------------------
  // 篩選 / 排序
  // -----------------------------------------------------------------------

  function filteredItems() {
    return S.items.filter(function (it) {
      if (S.filters.part !== 'all' && it.partShort !== S.filters.part) return false;
      if (S.filters.unmasteredOnly && it.mastered) return false;
      return true;
    });
  }

  function sortedItems(items) {
    var copy = items.slice();
    if (S.sort === 'time_desc') {
      copy.sort(function (a, b) { return (b.lastAt || '').localeCompare(a.lastAt || ''); });
    } else {
      copy.sort(function (a, b) { return (b.count - a.count) || (b.lastAt || '').localeCompare(a.lastAt || ''); });
    }
    return copy;
  }

  // -----------------------------------------------------------------------
  // 統計長條圖
  // -----------------------------------------------------------------------

  function computeStats() {
    var map = {};
    S.items.forEach(function (it) {
      var cat = (it.entry && it.entry.category) || (it.partShort + '·other');
      map[cat] = (map[cat] || 0) + it.count;
    });
    var arr = Object.keys(map).map(function (k) { return { label: k, count: map[k] }; });
    arr.sort(function (a, b) { return b.count - a.count; });
    return arr.slice(0, 8);
  }

  function renderStats() {
    var wrap = S.statsWrapEl;
    if (!wrap) return;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

    var stats = computeStats();
    if (!stats.length) {
      wrap.appendChild(Util.h('p.u-text-muted', {}, '目前沒有錯題資料可統計。'));
      return;
    }
    var max = stats.reduce(function (m, s) { return Math.max(m, s.count); }, 1);
    stats.forEach(function (s) {
      wrap.appendChild(Util.h('div.u-mt-md', { style: { marginTop: '10px' } },
        Util.h('div.u-flex.u-justify-between', {},
          Util.h('span', {}, s.label),
          Util.h('span.u-text-muted', {}, s.count + ' 次')
        ),
        Util.h('div.progress-bar', { style: { marginTop: '4px' } },
          Util.h('div.progress-bar-fill', { style: { width: Util.pct(s.count, max) + '%' } })
        )
      ));
    });
  }

  // -----------------------------------------------------------------------
  // 標記已精通
  // -----------------------------------------------------------------------

  function toggleMastered(id, value) {
    try {
      if (value) Store.markWrongMastered(id);
      else Store.update(['wrongBook', id, 'mastered'], false);
      Util.toast(value ? '已標記為精通' : '已取消精通標記', 'success');
    } catch (e) {
      Util.toast('更新失敗：' + e.message, 'error');
    }
    refresh();
  }

  // -----------------------------------------------------------------------
  // 題目內容渲染（查看 / 重做 共用）
  // -----------------------------------------------------------------------

  function renderOptionList(entry, opts) {
    var letters = LETTERS.slice(0, entry.options.length);
    return Util.h('div.option-list', {}, letters.map(function (L, i) {
      var isCorrect = i === entry.answer;
      var isSelected = opts.selected === i;
      var cls = ['option-btn'];
      if (opts.revealed) {
        if (isCorrect) cls.push('is-correct');
        else if (isSelected) cls.push('is-incorrect');
      } else if (isSelected) {
        cls.push('is-selected');
      }
      return Util.h('button', {
        class: cls,
        disabled: opts.revealed || !opts.onSelect,
        onClick: (!opts.revealed && opts.onSelect) ? function () { opts.onSelect(i); } : null
      },
        Util.h('span.option-label', {}, L),
        Util.h('span.option-text', {}, entry.options[i]),
        opts.revealed && isCorrect ? Util.h('span.option-mark', {}, '✓')
          : (opts.revealed && isSelected && !isCorrect ? Util.h('span.option-mark', {}, '✗') : null)
      );
    }));
  }

  function buildTtsControls(entry) {
    var supported = !!(window.TTS && TTS.isSupported());
    if (!supported) {
      return Util.h('p.u-text-muted', {}, '⚠️ 此瀏覽器不支援語音朗讀。');
    }
    var playing = false;
    var btn = Util.h('button.btn.btn-primary.btn-sm', {
      onClick: function () {
        if (playing) return;
        playing = true;
        btn.disabled = true;
        btn.textContent = '🔊 播放中…';
        var settings = (Store.get().settings) || {};
        var rate = Util.clamp(settings.ttsRate || 1.0, 0.8, 1.2);
        var items = (entry.ttsItems || []).map(function (it) {
          return Object.assign({}, it, { rate: rate });
        });
        TTS.speakSequence(items).then(function () {
          playing = false;
          btn.disabled = false;
          btn.textContent = '▶ 播放音檔';
        });
      }
    }, '▶ 播放音檔');
    return Util.h('div.u-flex.u-items-center.u-gap-sm', {}, btn,
      Util.h('span.u-text-muted', {}, '可重複播放'));
  }

  function buildQuestionBody(entry, opts) {
    var wrap = Util.h('div.u-flex-col', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } });

    if (entry.passageText) {
      wrap.appendChild(Util.h('div.card', {}, Util.h('div.card-body', {},
        Util.h('h3', {}, entry.passageTitle || '短文'),
        Util.h('p', { style: { whiteSpace: 'pre-wrap' } }, entry.passageText)
      )));
    }
    if (entry.passages && entry.passages.length) {
      entry.passages.forEach(function (p) {
        wrap.appendChild(Util.h('div.card', {}, Util.h('div.card-body', {},
          Util.h('div.u-flex.u-items-center.u-gap-sm', {},
            Util.h('h3', {}, p.title || ''), Util.h('span.badge.badge-primary', {}, p.kind || '')),
          Util.h('p', { style: { whiteSpace: 'pre-wrap' } }, p.text)
        )));
      });
    }
    if (entry.sceneText) {
      wrap.appendChild(Util.h('div.card', {}, Util.h('div.card-body', {},
        Util.h('h3', {}, '情境描述'),
        Util.h('p', {}, entry.sceneText),
        entry.sceneEn ? Util.h('p.u-text-secondary', {}, entry.sceneEn) : null
      )));
    }
    if (entry.settingZh) {
      wrap.appendChild(Util.h('p.u-text-secondary', {}, '情境：' + entry.settingZh));
    }
    if (entry.listening) {
      wrap.appendChild(buildTtsControls(entry));
    }
    if (entry.stemNode) {
      wrap.appendChild(Util.h('div.card', {}, Util.h('div.card-body', {},
        Util.h('p', { style: { fontWeight: '600' } }, entry.stemNode)
      )));
    }
    wrap.appendChild(renderOptionList(entry, opts));

    if (opts.revealed) {
      wrap.appendChild(Util.h('div.card', {}, Util.h('div.card-body', {},
        Util.h('h3', {}, '解析'),
        Util.h('p', {}, entry.explanation_zh || '（無解析）')
      )));
      if (entry.listening && entry.transcriptLines) {
        wrap.appendChild(Util.h('div.card', {}, Util.h('div.card-body', {},
          Util.h('h3', {}, '逐字稿'),
          entry.transcriptLines.map(function (l) { return Util.h('p', {}, l); })
        )));
      }
    }
    return wrap;
  }

  // -----------------------------------------------------------------------
  // Modal：查看
  // -----------------------------------------------------------------------

  function openViewModal(id) {
    var entry = buildEntry(id);
    if (!entry) {
      Util.toast('找不到此題目的資料（可能資料檔尚未載入或已異動）', 'warning');
      return;
    }
    var wb = (Store.get().wrongBook) || {};
    var mastered = !!(wb[id] && wb[id].mastered);
    var body = buildQuestionBody(entry, { revealed: true, selected: entry.answer, onSelect: null });
    S.activeModalClose = Util.modal({
      title: entry.partLabel + ' · ' + id,
      body: body,
      actions: [
        { label: '關閉', class: 'btn btn-ghost' },
        mastered
          ? { label: '取消已精通', class: 'btn btn-ghost', onClick: function (close) { toggleMastered(id, false); close(); } }
          : { label: '標記已精通', class: 'btn btn-primary', onClick: function (close) { toggleMastered(id, true); close(); } }
      ]
    });
  }

  // -----------------------------------------------------------------------
  // Modal：重做（單題 / 逐題佇列共用）
  // -----------------------------------------------------------------------

  function openRedoModal(id, onResolved) {
    var entry = buildEntry(id);
    if (!entry) {
      Util.toast('找不到此題目的資料，已略過：' + id, 'warning');
      onResolved(null);
      return;
    }
    var answered = false;
    var selectedIdx = null;
    var bodyWrap = Util.h('div');
    var closeModal = null;

    function isMasteredNow() {
      var wb = (Store.get().wrongBook) || {};
      return !!(wb[id] && wb[id].mastered);
    }

    function paint() {
      while (bodyWrap.firstChild) bodyWrap.removeChild(bodyWrap.firstChild);
      bodyWrap.appendChild(buildQuestionBody(entry, {
        revealed: answered,
        selected: selectedIdx,
        onSelect: answered ? null : function (i) { selectedIdx = i; answered = true; paint(); }
      }));

      if (answered) {
        var isCorrect = selectedIdx === entry.answer;
        var actionsRow = Util.h('div.u-flex.u-items-center.u-gap-sm.u-mt-md', { style: { flexWrap: 'wrap' } });
        actionsRow.appendChild(Util.h('span', {}, isCorrect ? '✅ 答對了！' : '❌ 還不熟悉，再接再厲！'));
        if (isCorrect && !isMasteredNow()) {
          actionsRow.appendChild(Util.h('button.btn.btn-primary.btn-sm', {
            onClick: function () { toggleMastered(id, true); paint(); }
          }, '標記已精通'));
        }
        actionsRow.appendChild(Util.h('button.btn.btn-ghost.btn-sm', {
          onClick: function () {
            if (closeModal) closeModal();
            onResolved(isCorrect);
          }
        }, '下一題 →'));
        bodyWrap.appendChild(actionsRow);
      }
    }

    paint();
    closeModal = Util.modal({ title: entry.partLabel + ' · 重做 · ' + id, body: bodyWrap, actions: [] });
    S.activeModalClose = closeModal;
  }

  function runRedoQueue(ids) {
    if (!ids.length) {
      Util.toast('目前沒有可重做的題目', 'info');
      return;
    }
    var queue = ids.slice();
    var total = queue.length;
    var correct = 0;
    var answeredCount = 0;

    function step() {
      if (queue.length === 0) {
        refresh();
        Util.toast('本輪重做完成：' + correct + ' / ' + answeredCount + ' 題答對', 'success');
        return;
      }
      var id = queue.shift();
      openRedoModal(id, function (wasCorrect) {
        if (wasCorrect !== null) {
          answeredCount += 1;
          if (wasCorrect) correct += 1;
        }
        step();
      });
    }
    step();
  }

  // -----------------------------------------------------------------------
  // 列表 / 表格
  // -----------------------------------------------------------------------

  function unmasteredIdsInScope() {
    return sortedItems(filteredItems().filter(function (it) { return !it.mastered; }))
      .map(function (it) { return it.id; });
  }

  function renderCounts() {
    if (S.countEl) {
      var total = S.items.length;
      var unmastered = S.items.filter(function (it) { return !it.mastered; }).length;
      S.countEl.textContent = '共 ' + total + ' 題錯題 · ' + unmastered + ' 題未精通';
    }
  }

  function buildRow(it) {
    var badgeClass = it.mastered ? 'badge-success' : 'badge-warning';
    var badgeText = it.mastered ? '已精通' : '未精通';
    return Util.h('tr', {},
      Util.h('td', {}, Util.h('span.badge.badge-primary', {}, it.partShort)),
      Util.h('td', {},
        Util.h('span', {
          style: { maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }
        }, summaryText(it.entry, it.id))
      ),
      Util.h('td', {}, String(it.count)),
      Util.h('td', {}, fmtLastAt(it.lastAt)),
      Util.h('td', {}, Util.h('span.badge.' + badgeClass, {}, badgeText)),
      Util.h('td', {},
        Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } },
          Util.h('button.btn.btn-ghost.btn-sm', { onClick: function () { openViewModal(it.id); } }, '查看'),
          Util.h('button.btn.btn-ghost.btn-sm', {
            onClick: function () { runRedoQueue([it.id]); }
          }, '重做'),
          Util.h('button', {
            class: 'btn btn-sm ' + (it.mastered ? 'btn-ghost' : 'btn-primary'),
            onClick: function () { toggleMastered(it.id, !it.mastered); }
          }, it.mastered ? '取消已精通' : '標記已精通')
        )
      )
    );
  }

  function renderList() {
    var wrap = S.listWrapEl;
    if (!wrap) return;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

    var items = sortedItems(filteredItems());
    var redoIds = unmasteredIdsInScope();

    wrap.appendChild(Util.h('div.u-flex.u-justify-between.u-items-center.u-mt-md', { style: { flexWrap: 'wrap', gap: '10px' } },
      Util.h('span.u-text-muted', {}, '目前篩選共 ' + items.length + ' 題，其中 ' + redoIds.length + ' 題未精通'),
      Util.h('button.btn.btn-primary.btn-sm', {
        disabled: redoIds.length === 0,
        onClick: function () { runRedoQueue(redoIds); }
      }, '重做全部未精通')
    ));

    if (!items.length) {
      wrap.appendChild(Util.h('div.empty-state', {},
        Util.h('div.empty-state-icon', {}, '🔍'),
        Util.h('h2', {}, '找不到符合條件的錯題'),
        Util.h('p', {}, '試試調整 Part 篩選或取消「只看未精通」。')
      ));
      return;
    }

    var table = Util.h('table.table', {},
      Util.h('thead', {}, Util.h('tr', {},
        Util.h('th', {}, '題型'), Util.h('th', {}, '題目摘要'), Util.h('th', {}, '錯誤次數'),
        Util.h('th', {}, '最後時間'), Util.h('th', {}, '狀態'), Util.h('th', {}, '操作')
      )),
      Util.h('tbody', {}, items.map(buildRow))
    );
    wrap.appendChild(Util.h('div.table-wrap.u-mt-md', {}, table));
  }

  // -----------------------------------------------------------------------
  // 篩選列
  // -----------------------------------------------------------------------

  function partLabel(code) { return code === 'all' ? '全部' : code; }

  function buildPartChips() {
    var row = Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
    PART_FILTER_CODES.forEach(function (code) {
      var count = code === 'all' ? S.items.length : S.items.filter(function (it) { return it.partShort === code; }).length;
      var isActive = S.filters.part === code;
      var btn = Util.h('button', {
        class: 'btn btn-sm ' + (isActive ? 'btn-primary' : 'btn-ghost'),
        onClick: function () {
          S.filters.part = code;
          rebuildFilterBar();
          renderList();
        }
      }, partLabel(code) + '（' + count + '）');
      row.appendChild(btn);
    });
    return row;
  }

  function buildFilterBar() {
    var unmasteredCheckbox = Util.h('label.checkbox-row', {},
      Util.h('input', {
        type: 'checkbox', checked: S.filters.unmasteredOnly,
        onChange: function (e) { S.filters.unmasteredOnly = e.target.checked; renderList(); }
      }),
      Util.h('span', {}, '只看未精通')
    );

    var sortSelect = Util.h('select.select', {
      onChange: function (e) { S.sort = e.target.value; renderList(); }
    }, SORT_OPTIONS.map(function (o) {
      return Util.h('option', { value: o.code, selected: o.code === S.sort }, o.label);
    }));

    return Util.h('div.card', {},
      Util.h('div.card-body', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
        Util.h('div', {},
          Util.h('div.card-subtitle', { style: { marginTop: '0' } }, 'Part'),
          buildPartChips()
        ),
        Util.h('div.u-flex.u-items-center.u-justify-between', { style: { flexWrap: 'wrap', gap: '10px' } },
          unmasteredCheckbox,
          Util.h('div.field', { style: { marginBottom: '0', minWidth: '220px' } },
            Util.h('label.field-label', {}, '排序'), sortSelect
          )
        )
      )
    );
  }

  function rebuildFilterBar() {
    if (!S.filterBarSlotEl) return;
    while (S.filterBarSlotEl.firstChild) S.filterBarSlotEl.removeChild(S.filterBarSlotEl.firstChild);
    S.filterBarSlotEl.appendChild(buildFilterBar());
  }

  // -----------------------------------------------------------------------
  // render / destroy
  // -----------------------------------------------------------------------

  function render(containerEl, params) {
    container = containerEl;
    params = params || {};

    S = {
      wrongBook: {},
      items: [],
      filters: { part: 'all', unmasteredOnly: false },
      sort: 'count_desc',
      countEl: null,
      statsWrapEl: null,
      filterBarSlotEl: null,
      listWrapEl: null,
      activeModalClose: null
    };

    if (params.task) {
      try { Store.completeTask(params.task); } catch (e) { /* 忽略單一任務完成失敗，不阻斷頁面渲染 */ }
    }

    S.wrongBook = (Store.get().wrongBook) || {};
    S.items = loadItems();

    container.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, '錯題本'),
        Util.h('p.view-subtitle', { id: 'reviewCount' }, '共 0 題錯題 · 0 題未精通')
      )
    ));
    S.countEl = Util.$('#reviewCount', container);

    if (!Object.keys(S.wrongBook).length) {
      container.appendChild(Util.h('div.empty-state', {},
        Util.h('div.empty-state-icon', {}, '🎉'),
        Util.h('h2', {}, '目前沒有錯題'),
        Util.h('p', {}, '太棒了！去做幾題累積練習量吧。'),
        Util.h('button.btn.btn-primary', {
          onClick: function () { if (window.App && App.navigate) App.navigate('#/quiz'); }
        }, '開始做題')
      ));
      renderCounts();
      return;
    }

    var statsCard = Util.h('div.card', {},
      Util.h('div.card-header', {}, Util.h('div.card-title', {}, '各 Part / 類別錯誤分佈'))
    );
    S.statsWrapEl = Util.h('div.card-body', {});
    statsCard.appendChild(S.statsWrapEl);
    container.appendChild(statsCard);

    S.filterBarSlotEl = Util.h('div');
    S.filterBarSlotEl.appendChild(buildFilterBar());
    container.appendChild(S.filterBarSlotEl);

    S.listWrapEl = Util.h('div');
    container.appendChild(S.listWrapEl);

    renderStats();
    renderList();
    renderCounts();
  }

  function destroy() {
    if (S && S.activeModalClose) {
      try { S.activeModalClose(); } catch (e) { /* 忽略關閉失敗 */ }
    }
    if (window.TTS) TTS.stop();
    S = null;
    container = null;
  }

  window.Views = window.Views || {};
  window.Views.review = { render: render, destroy: destroy };
})();
