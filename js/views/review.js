/**
 * js/views/review.js — 錯題本（#/review）
 *
 * 合併 Store.wrongBook 與 p5/p6/p7/listening 各題資料（依 id 前綴 p5-/p6-/p7-/l1-/l2-/l3-/l4- 查表）。
 *
 * 三層檢討法（本頁的核心流程）：
 *   第一層「為什麼錯」— 每題標記錯因（單字／文法／看錯／沒時間／用猜的），統計出主要失分型態
 *   第二層「重做一次」— Leitner 排程：答對往上一箱（1→2→4→7→14 天後再見），答錯退回第 1 箱明天再見
 *   第三層「排進複習」— 只有連續答對到第 5 箱才算精通，避免「看過解析就以為會了」
 *
 * 提供：今日到期佇列、Part / 錯因 / 未精通篩選、排序、錯因與考點分佈圖、
 * 查看詳解（含聽力逐字稿 + TTS）、單題或整批重做。
 * params.task 存在時，進入頁面即視為完成當日任務；params.due=1 時預設只看今日到期。
 * 純 IIFE，暴露 window.Views.review = { render, destroy }。
 */
(function () {
  'use strict';

  var LETTERS = ['A', 'B', 'C', 'D'];

  // 與 store.js 的 WRONG_INTERVAL_DAYS 對應，只用於顯示文案
  var BOX_LABELS = ['第 1 箱', '第 2 箱', '第 3 箱', '第 4 箱', '已精通'];

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
    { code: 'due_asc', label: '複習排程：先到期的優先' },
    { code: 'count_desc', label: '錯誤次數：多 → 少' },
    { code: 'time_desc', label: '最後作答：新 → 舊' }
  ];

  function reasonDefs() {
    return (window.TOEIC_DATA && window.TOEIC_DATA.reading && window.TOEIC_DATA.reading.reasons) || [];
  }

  function reasonDef(code) {
    var defs = reasonDefs();
    for (var i = 0; i < defs.length; i++) {
      if (defs[i].code === code) return defs[i];
    }
    return null;
  }

  /** 把 store 的 wrongBook 項目補齊欄位；Store 較舊時退回本地預設值 */
  function normalizeEntry(rec, today) {
    if (window.Store && typeof Store.normalizeWrongEntry === 'function') {
      return Store.normalizeWrongEntry(rec, today);
    }
    rec = rec || {};
    return {
      count: rec.count || 0, lastAt: rec.lastAt || null, mastered: !!rec.mastered,
      box: rec.box || 1, due: rec.due || today, reason: rec.reason || '',
      reviews: rec.reviews || 0, rights: rec.rights || 0
    };
  }

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
    var today = S.today;
    return Object.keys(wb).map(function (id) {
      var rec = normalizeEntry(wb[id], today);
      var entry = buildEntry(id);
      var kind = idPrefixKind(id);
      return {
        id: id,
        count: rec.count,
        lastAt: rec.lastAt,
        mastered: rec.mastered,
        box: rec.box,
        due: rec.due,
        reason: rec.reason,
        reviews: rec.reviews,
        rights: rec.rights,
        isDue: !rec.mastered && (rec.due || today) <= today,
        partShort: entry ? entry.partShort : (kind && PART_INFO[kind] ? PART_INFO[kind].short : '？'),
        entry: entry
      };
    });
  }

  function refresh() {
    S.wrongBook = (Store.get().wrongBook) || {};
    S.items = loadItems();
    renderStats();
    renderReasonStats();
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
      if (S.filters.dueOnly && !it.isDue) return false;
      if (S.filters.reason && it.reason !== S.filters.reason) return false;
      return true;
    });
  }

  function sortedItems(items) {
    var copy = items.slice();
    if (S.sort === 'time_desc') {
      copy.sort(function (a, b) { return (b.lastAt || '').localeCompare(a.lastAt || ''); });
    } else if (S.sort === 'due_asc') {
      copy.sort(function (a, b) {
        // 未精通且已到期的優先，其次依到期日、再依錯誤次數
        if (a.isDue !== b.isDue) return a.isDue ? -1 : 1;
        var d = (a.due || '').localeCompare(b.due || '');
        return d || (b.count - a.count);
      });
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

  /** 錯因分佈：告訴使用者「主要不是不會，而是 XXX」 */
  function renderReasonStats() {
    var wrap = S.reasonWrapEl;
    if (!wrap) return;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

    var defs = reasonDefs();
    if (!defs.length) {
      wrap.appendChild(Util.h('p.u-text-muted', {}, '教材資料未載入，無法顯示錯因分類。'));
      return;
    }

    var total = S.items.length;
    var counts = {};
    var untagged = 0;
    S.items.forEach(function (it) {
      if (!it.reason) { untagged += 1; return; }
      counts[it.reason] = (counts[it.reason] || 0) + 1;
    });

    if (untagged === total) {
      wrap.appendChild(Util.h('p', {},
        '這 ' + total + ' 題都還沒標記錯因。點每一列的「查看」或「重做」，在解析下方選一個錯因 — ' +
        '「單字不會」和「時間不夠」要用完全不同的方法補，分清楚才知道該練什麼。'));
      return;
    }

    var rows = defs.map(function (d) {
      return { def: d, count: counts[d.code] || 0 };
    }).filter(function (r) { return r.count > 0; })
      .sort(function (a, b) { return b.count - a.count; });

    rows.forEach(function (r, idx) {
      var share = Util.pct(r.count, total);
      wrap.appendChild(Util.h('div', { style: { marginTop: idx === 0 ? '0' : '12px' } },
        Util.h('div.u-flex.u-justify-between', {},
          Util.h('button.btn.btn-ghost.btn-sm', {
            onClick: function () {
              S.filters.reason = S.filters.reason === r.def.code ? '' : r.def.code;
              rebuildFilterBar();
              renderList();
            }
          }, r.def.icon + ' ' + r.def.label),
          Util.h('span.u-text-muted', {}, r.count + ' 題（' + share + '%）')
        ),
        Util.h('div.progress-bar', { style: { marginTop: '4px' } },
          Util.h('div.progress-bar-fill', { style: { width: share + '%' } })
        ),
        idx === 0 ? Util.h('p', { style: { fontSize: '0.85rem', marginTop: '6px' } },
          '👉 ' + r.def.advice) : null
      ));
    });

    if (untagged) {
      wrap.appendChild(Util.h('p.u-text-muted', { style: { marginTop: '12px' } },
        '還有 ' + untagged + ' 題未標記錯因。'));
    }
  }

  /** 錯因選擇列（查看 / 重做 modal 內共用） */
  function buildReasonPicker(id, onChange) {
    var defs = reasonDefs();
    if (!defs.length) return null;
    var wb = (Store.get().wrongBook) || {};
    var current = (wb[id] && wb[id].reason) || '';

    var row = Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap', marginTop: '8px' } });
    defs.forEach(function (d) {
      row.appendChild(Util.h('button', {
        class: 'btn btn-sm ' + (current === d.code ? 'btn-primary' : 'btn-ghost'),
        onClick: function () {
          try {
            Store.setWrongReason(id, current === d.code ? '' : d.code);
            Util.toast(current === d.code ? '已取消錯因標記' : ('已標記：' + d.label), 'success');
          } catch (e) {
            Util.toast('標記失敗：' + e.message, 'error');
          }
          refresh();
          if (onChange) onChange();
        }
      }, d.icon + ' ' + d.label));
    });

    var currentDef = reasonDef(current);
    return Util.h('div.card', { style: { background: 'var(--color-surface-alt)' } },
      Util.h('div.card-body', {},
        Util.h('h3', {}, '第一層：這題為什麼錯？'),
        row,
        currentDef ? Util.h('p', { style: { marginTop: '10px' } }, '👉 ' + currentDef.advice) : null
      )
    );
  }

  // -----------------------------------------------------------------------
  // 標記已精通
  // -----------------------------------------------------------------------

  function toggleMastered(id, value) {
    try {
      if (value) {
        Store.markWrongMastered(id);
      } else {
        // 取消精通＝退回第 1 箱、今天就該重做，否則到期日還停在 14 天後
        Store.set(function (old) {
          var wrongBook = Object.assign({}, old.wrongBook);
          wrongBook[id] = Object.assign({}, normalizeEntry(wrongBook[id], S.today), {
            mastered: false, box: 1, due: S.today
          });
          return Object.assign({}, old, { wrongBook: wrongBook });
        });
      }
      Util.toast(value ? '已標記為精通' : '已取消精通標記，排回今日複習', 'success');
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
    var bodyWrap = Util.h('div');

    function paint() {
      while (bodyWrap.firstChild) bodyWrap.removeChild(bodyWrap.firstChild);
      bodyWrap.appendChild(buildQuestionBody(entry, { revealed: true, selected: entry.answer, onSelect: null }));
      var picker = buildReasonPicker(id, paint);
      if (picker) bodyWrap.appendChild(picker);
    }
    paint();

    S.activeModalClose = Util.modal({
      title: entry.partLabel + ' · ' + id,
      body: bodyWrap,
      actions: [
        { label: '關閉', class: 'btn btn-ghost' },
        { label: '重做這題', class: 'btn btn-primary',
          onClick: function (close) { close(); runRedoQueue([id]); } },
        mastered
          ? { label: '取消已精通', class: 'btn btn-ghost', onClick: function (close) { toggleMastered(id, false); close(); } }
          : null
      ].filter(Boolean)
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
    var scheduled = false; // 只在第一次作答時更新 Leitner，重畫不重複計分
    var selectedIdx = null;
    var bodyWrap = Util.h('div');
    var closeModal = null;

    function currentRec() {
      var wb = (Store.get().wrongBook) || {};
      return normalizeEntry(wb[id], S.today);
    }

    function paint() {
      while (bodyWrap.firstChild) bodyWrap.removeChild(bodyWrap.firstChild);
      bodyWrap.appendChild(buildQuestionBody(entry, {
        revealed: answered,
        selected: selectedIdx,
        onSelect: answered ? null : function (i) {
          selectedIdx = i;
          answered = true;
          if (!scheduled) {
            scheduled = true;
            try {
              // 第二層：答對往上一箱、答錯退回第 1 箱，由 Store 算下次到期日
              Store.reviewWrong(id, selectedIdx === entry.answer);
            } catch (e) {
              Util.toast('更新複習排程失敗：' + e.message, 'error');
            }
          }
          paint();
        }
      }));

      if (answered) {
        var isCorrect = selectedIdx === entry.answer;
        var rec = currentRec();
        var scheduleText = rec.mastered
          ? '🎓 連續答對，已升到第 5 箱 → 標記為精通'
          : ('📅 ' + BOX_LABELS[rec.box - 1] + '，下次複習：' + rec.due);

        bodyWrap.appendChild(Util.h('div.card', { style: { marginTop: '14px' } },
          Util.h('div.card-body', {},
            Util.h('h3', {}, isCorrect ? '✅ 答對了' : '❌ 還不熟，明天再來一次'),
            Util.h('p', {}, scheduleText),
            Util.h('p.u-text-muted', { style: { fontSize: '0.85rem', marginTop: '4px' } },
              '累計重做 ' + rec.reviews + ' 次，答對 ' + rec.rights + ' 次。')
          )
        ));

        if (!isCorrect) {
          var picker = buildReasonPicker(id, paint);
          if (picker) bodyWrap.appendChild(picker);
        }

        bodyWrap.appendChild(Util.h('div.u-flex.u-items-center.u-gap-sm.u-mt-md', { style: { flexWrap: 'wrap' } },
          Util.h('button.btn.btn-primary.btn-sm', {
            onClick: function () {
              if (closeModal) closeModal();
              onResolved(isCorrect);
            }
          }, '下一題 →')
        ));
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

  function dueIdsInScope() {
    return sortedItems(filteredItems().filter(function (it) { return it.isDue; }))
      .map(function (it) { return it.id; });
  }

  function renderCounts() {
    if (S.countEl) {
      var total = S.items.length;
      var unmastered = S.items.filter(function (it) { return !it.mastered; }).length;
      var due = S.items.filter(function (it) { return it.isDue; }).length;
      S.countEl.textContent = '共 ' + total + ' 題錯題 · ' + unmastered + ' 題未精通 · 今天該複習 ' + due + ' 題';
    }
  }

  function buildRow(it) {
    var statusBadge = it.mastered
      ? Util.h('span.badge.badge-success', {}, '已精通')
      : (it.isDue
        ? Util.h('span.badge.badge-danger', {}, '今天該複習')
        : Util.h('span.badge.badge-warning', {}, BOX_LABELS[it.box - 1]));
    var rDef = reasonDef(it.reason);

    return Util.h('tr', {},
      Util.h('td', {}, Util.h('span.badge.badge-primary', {}, it.partShort)),
      Util.h('td', {},
        Util.h('span', {
          style: { maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }
        }, summaryText(it.entry, it.id))
      ),
      Util.h('td', {}, rDef
        ? Util.h('span.badge', { title: rDef.advice }, rDef.icon + ' ' + rDef.label)
        : Util.h('span.u-text-muted', {}, '未標記')),
      Util.h('td', {}, String(it.count)),
      Util.h('td', {}, it.mastered ? '—' : (it.due || '—')),
      Util.h('td', {}, statusBadge),
      Util.h('td', {},
        Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } },
          Util.h('button.btn.btn-ghost.btn-sm', { onClick: function () { openViewModal(it.id); } }, '查看'),
          Util.h('button', {
            class: 'btn btn-sm ' + (it.isDue ? 'btn-primary' : 'btn-ghost'),
            onClick: function () { runRedoQueue([it.id]); }
          }, '重做'),
          it.mastered
            ? Util.h('button.btn.btn-ghost.btn-sm', {
              onClick: function () { toggleMastered(it.id, false); }
            }, '取消已精通')
            : null
        )
      ),
      Util.h('td', {}, fmtLastAt(it.lastAt))
    );
  }

  function renderList() {
    var wrap = S.listWrapEl;
    if (!wrap) return;
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

    var items = sortedItems(filteredItems());
    var redoIds = unmasteredIdsInScope();
    var dueIds = dueIdsInScope();

    wrap.appendChild(Util.h('div.u-flex.u-justify-between.u-items-center.u-mt-md', { style: { flexWrap: 'wrap', gap: '10px' } },
      Util.h('span.u-text-muted', {},
        '目前篩選共 ' + items.length + ' 題 · ' + dueIds.length + ' 題今天到期 · ' + redoIds.length + ' 題未精通'),
      Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } },
        Util.h('button.btn.btn-primary.btn-sm', {
          disabled: dueIds.length === 0,
          onClick: function () { runRedoQueue(dueIds); }
        }, '複習今日到期（' + dueIds.length + '）'),
        Util.h('button.btn.btn-ghost.btn-sm', {
          disabled: redoIds.length === 0,
          onClick: function () { runRedoQueue(redoIds); }
        }, '重做全部未精通')
      )
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
        Util.h('th', {}, '題型'), Util.h('th', {}, '題目摘要'), Util.h('th', {}, '錯因'),
        Util.h('th', {}, '錯誤次數'), Util.h('th', {}, '下次複習'), Util.h('th', {}, '狀態'),
        Util.h('th', {}, '操作'), Util.h('th', {}, '最後作答')
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

  function buildReasonChips() {
    var defs = reasonDefs();
    if (!defs.length) return null;
    var row = Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } });
    var all = [{ code: '', label: '全部', icon: '' }].concat(defs);
    all.forEach(function (d) {
      var count = d.code === ''
        ? S.items.length
        : S.items.filter(function (it) { return it.reason === d.code; }).length;
      row.appendChild(Util.h('button', {
        class: 'btn btn-sm ' + (S.filters.reason === d.code ? 'btn-primary' : 'btn-ghost'),
        onClick: function () {
          S.filters.reason = d.code;
          rebuildFilterBar();
          renderList();
        }
      }, (d.icon ? d.icon + ' ' : '') + d.label + '（' + count + '）'));
    });
    return row;
  }

  function buildFilterBar() {
    var dueCount = S.items.filter(function (it) { return it.isDue; }).length;
    var dueCheckbox = Util.h('label.checkbox-row', {},
      Util.h('input', {
        type: 'checkbox', checked: S.filters.dueOnly,
        onChange: function (e) { S.filters.dueOnly = e.target.checked; renderList(); }
      }),
      Util.h('span', {}, '只看今天該複習（' + dueCount + '）')
    );

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

    var reasonChips = buildReasonChips();

    return Util.h('div.card', {},
      Util.h('div.card-body', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } },
        Util.h('div', {},
          Util.h('div.card-subtitle', { style: { marginTop: '0' } }, 'Part'),
          buildPartChips()
        ),
        reasonChips ? Util.h('div', {},
          Util.h('div.card-subtitle', { style: { marginTop: '0' } }, '錯因'),
          reasonChips
        ) : null,
        Util.h('div.u-flex.u-items-center.u-justify-between', { style: { flexWrap: 'wrap', gap: '10px' } },
          Util.h('div.u-flex.u-gap-sm', { style: { flexWrap: 'wrap' } }, dueCheckbox, unmasteredCheckbox),
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
      today: Util.todayISO(),
      wrongBook: {},
      items: [],
      // params.due=1（例如從閱讀診斷室的「先清掉 N 題到期錯題」點進來）→ 預設只看今日到期
      filters: { part: 'all', unmasteredOnly: false, dueOnly: params.due === '1' || params.due === 1, reason: '' },
      sort: 'due_asc',
      countEl: null,
      statsWrapEl: null,
      reasonWrapEl: null,
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

    // 今日到期提示：進頁面第一眼就知道該做什麼
    var dueNow = S.items.filter(function (it) { return it.isDue; });
    if (dueNow.length) {
      container.appendChild(Util.h('div.card', {},
        Util.h('div.card-title', {}, '📅 今天有 ' + dueNow.length + ' 題該複習'),
        Util.h('div.card-subtitle', {},
          '答對就往上一箱（1 → 2 → 4 → 7 → 14 天後再見），答錯退回第 1 箱明天重來。' +
          '連續答對到第 5 箱才算真的會。'),
        Util.h('div.card-actions', {},
          Util.h('button.btn.btn-primary', {
            onClick: function () {
              runRedoQueue(sortedItems(S.items.filter(function (it) { return it.isDue; }))
                .map(function (it) { return it.id; }));
            }
          }, '開始複習')
        )
      ));
    }

    var reasonCard = Util.h('div.card', {},
      Util.h('div.card-header', {},
        Util.h('div', {},
          Util.h('div.card-title', {}, '錯因分佈'),
          Util.h('div.card-subtitle', {}, '第一層檢討：先分清楚為什麼錯，才知道要補什麼')
        )
      )
    );
    S.reasonWrapEl = Util.h('div.card-body', {});
    reasonCard.appendChild(S.reasonWrapEl);
    container.appendChild(reasonCard);

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
    renderReasonStats();
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
