/**
 * js/views/listening.js
 * 聽力練習（Part 1–4）：設定 → 播放（TTS）→ 作答 → 解析 → 結果。
 * 暴露 window.Views.listening = { render, destroy }
 * 依 docs/DESIGN.md §5.7、§3；依 docs/API_ui.md、docs/API_infra.md 呼叫 Util / Store / TTS。
 */
(function () {
  'use strict';

  var LETTERS = ['A', 'B', 'C', 'D'];
  var PART_META = [
    { key: 'P1', label: 'Part 1 照片描述', dataKey: 'p1' },
    { key: 'P2', label: 'Part 2 應答問題', dataKey: 'p2' },
    { key: 'P3', label: 'Part 3 簡短對話', dataKey: 'p3' },
    { key: 'P4', label: 'Part 4 簡短獨白', dataKey: 'p4' }
  ];
  var P4_KIND_LABELS = {
    announcement: '公告', voicemail: '語音留言', talk: '簡短演講',
    ad: '廣告', news: '新聞', tour: '導覽解說'
  };

  // ---- module-level 狀態（每次 render() 重新建立） ----
  var S = null;
  var container = null;
  var timerId = null;
  var timerStartTs = null;

  // ---------------------------------------------------------------------
  // 小工具
  // ---------------------------------------------------------------------

  function stripLetterPrefix(s) {
    return String(s || '').replace(/^[A-D][.).:]?\s+/, '');
  }

  function pickCountOptions(total) {
    if (!total || total <= 0) return [];
    var candidates = [5, 10, 15, 20, 30, 40, 50];
    var opts = candidates.filter(function (n) { return n < total; });
    opts.push(total);
    opts = opts.filter(function (n, i) { return opts.indexOf(n) === i; });
    opts.sort(function (a, b) { return a - b; });
    return opts;
  }

  function getData(partKey) {
    var listening = window.TOEIC_DATA && window.TOEIC_DATA.listening;
    if (!listening) return [];
    var meta = null;
    for (var i = 0; i < PART_META.length; i++) {
      if (PART_META[i].key === partKey) { meta = PART_META[i]; break; }
    }
    if (!meta) return [];
    return listening[meta.dataKey] || [];
  }

  function ttsReady() {
    return !!(window.TTS && TTS.isSupported());
  }

  // 非阻擋檢查：目前瀏覽器是否偵測得到英文語音。結果只影響提示文字顯示，不影響播放/作答流程。
  function checkEnglishVoice() {
    if (!ttsReady() || typeof TTS.hasEnglishVoice !== 'function') return;
    TTS.hasEnglishVoice().then(function (has) {
      if (!S || S.phase !== 'session') return;
      S.hasEnglishVoiceChecked = true;
      S.hasEnglishVoice = has;
      rerender();
    });
  }

  function stopTimer() {
    if (timerId) { window.clearInterval(timerId); timerId = null; }
    timerStartTs = null;
  }

  function startTimer() {
    stopTimer();
    // 用 Date.now() 差值計算已花費秒數，避免背景分頁被瀏覽器節流 setInterval 導致計時不準。
    timerStartTs = Date.now() - (S.elapsedSec || 0) * 1000;
    timerId = window.setInterval(function () {
      if (!S) return;
      S.elapsedSec = Math.floor((Date.now() - timerStartTs) / 1000);
      var el = Util.$('#lsTimer', container);
      if (el) el.textContent = Util.fmtTime(S.elapsedSec);
    }, 1000);
  }

  // ---------------------------------------------------------------------
  // 資料整形：把各 Part 原始資料整理成統一的 unit 結構
  // unit: { id, kind, raw, questions:[{qid, prompt, options, answer, explanation_zh}], transcriptLines:[...] }
  // ---------------------------------------------------------------------

  function buildUnit(part, item) {
    if (part === 'P1') {
      var statements = (item.statements || []).map(stripLetterPrefix);
      return {
        id: item.id, kind: 'P1', raw: item,
        questions: [{
          qid: item.id, prompt: null, options: statements,
          answer: item.answer, explanation_zh: item.explanation_zh
        }],
        transcriptLines: statements.map(function (s, i) { return LETTERS[i] + '. ' + s; })
      };
    }
    if (part === 'P2') {
      var responses = (item.responses || []).map(stripLetterPrefix);
      return {
        id: item.id, kind: 'P2', raw: item,
        questions: [{
          qid: item.id, prompt: null, options: responses,
          answer: item.answer, explanation_zh: item.explanation_zh
        }],
        transcriptLines: ['Q: ' + item.question].concat(
          responses.map(function (r, i) { return LETTERS[i] + '. ' + r; })
        )
      };
    }
    if (part === 'P3') {
      var qs3 = (item.questions || []).map(function (q, i) {
        return {
          qid: item.id + '-q' + (i + 1), prompt: q.q, options: q.options,
          answer: q.answer, explanation_zh: q.explanation_zh
        };
      });
      return {
        id: item.id, kind: 'P3', raw: item, questions: qs3,
        transcriptLines: (item.script || []).map(function (line) { return line.s + '：' + line.t; })
      };
    }
    // P4
    var qs4 = (item.questions || []).map(function (q, i) {
      return {
        qid: item.id + '-q' + (i + 1), prompt: q.q, options: q.options,
        answer: q.answer, explanation_zh: q.explanation_zh
      };
    });
    return {
      id: item.id, kind: 'P4', raw: item, questions: qs4,
      transcriptLines: [item.script || '']
    };
  }

  function buildAudioItems(unit) {
    var rate = S.rate;
    if (unit.kind === 'P1') {
      return unit.questions[0].options.map(function (text, i) {
        return { text: LETTERS[i] + '. ' + text, rate: rate, pauseMs: 400 };
      });
    }
    if (unit.kind === 'P2') {
      var items = [{ text: unit.raw.question, rate: rate, pauseMs: 500 }];
      unit.questions[0].options.forEach(function (text, i) {
        items.push({ text: LETTERS[i] + '. ' + text, rate: rate, pauseMs: 300 });
      });
      return items;
    }
    if (unit.kind === 'P3') {
      return (unit.raw.script || []).map(function (line) {
        return { text: line.t, gender: line.s === 'W' ? 'female' : 'male', rate: rate, pauseMs: 350 };
      });
    }
    return [{ text: unit.raw.script || '', rate: rate, pauseMs: 0 }];
  }

  // ---------------------------------------------------------------------
  // 播放控制
  // ---------------------------------------------------------------------

  function playUnit(unit) {
    if (!S || S.isPlayingUnitId) return;
    var used = S.playsUsedMap[unit.id] || 0;
    if (used >= S.playCount) { Util.toast('已達播放次數上限', 'warning'); return; }
    if (!ttsReady()) { Util.toast('此瀏覽器不支援語音朗讀', 'warning'); return; }

    S.isPlayingUnitId = unit.id;
    var token = (S.playToken = (S.playToken || 0) + 1);
    rerender();

    TTS.speakSequence(buildAudioItems(unit)).then(function () {
      if (!S || S.playToken !== token) return;
      var newMap = Object.assign({}, S.playsUsedMap);
      newMap[unit.id] = (newMap[unit.id] || 0) + 1;
      S.playsUsedMap = newMap;
      S.isPlayingUnitId = null;
      rerender();
    });
  }

  function stopPlayback() {
    if (window.TTS) TTS.stop();
    if (!S) return;
    S.isPlayingUnitId = null;
    rerender();
  }

  // ---------------------------------------------------------------------
  // 作答
  // ---------------------------------------------------------------------

  function selectAnswer(q, optIdx) {
    if (!S || S.answers.hasOwnProperty(q.qid)) return;
    var next = Object.assign({}, S.answers);
    next[q.qid] = optIdx;
    S.answers = next;
    rerender();
  }

  function isUnitAnswered(unit) {
    return unit.questions.every(function (q) { return S.answers.hasOwnProperty(q.qid); });
  }

  function currentUnit() { return S.units[S.index]; }

  // ---------------------------------------------------------------------
  // 渲染：setup
  // ---------------------------------------------------------------------

  function renderHeader(subtitle) {
    container.appendChild(Util.h('div.view-header', {},
      Util.h('div.view-title', {},
        Util.h('h1', {}, '聽力練習'),
        subtitle ? Util.h('p.view-subtitle', {}, subtitle) : null
      )
    ));
  }

  function renderSetup() {
    renderHeader('設定 Part、題數與播放參數，開始聽力練習。');

    var available = PART_META.map(function (p) {
      return { key: p.key, label: p.label, n: getData(p.key).length };
    });
    var hasAnyData = available.some(function (a) { return a.n > 0; });
    if (!hasAnyData) {
      container.appendChild(Util.h('div.empty-state', {},
        Util.h('div.empty-state-icon', {}, '🎧'),
        Util.h('h2', {}, '尚無聽力題目資料'),
        Util.h('p', {}, '請確認 data/listening_*.js 是否已載入。')
      ));
      return;
    }

    var currentMeta = available.filter(function (a) { return a.key === S.part; })[0];
    if (!currentMeta || currentMeta.n === 0) {
      currentMeta = available.filter(function (a) { return a.n > 0; })[0];
      S.part = currentMeta.key;
    }
    var countOptions = pickCountOptions(currentMeta.n);
    if (countOptions.indexOf(S.count) === -1) {
      if (S.count >= 1 && S.count <= currentMeta.n) {
        // 指定題數在合法範圍內但不在預設選項中（例如 URL 帶入 count=3）：直接併入選項，
        // 確保下拉選單有一個選項與 S.count 一致，不會靜默改掉使用者指定的題數。
        countOptions.push(S.count);
        countOptions = countOptions.filter(function (n, i) { return countOptions.indexOf(n) === i; });
        countOptions.sort(function (a, b) { return a - b; });
      } else {
        // 超出範圍：選最接近的既有選項，並讓 S.count 與畫面選取狀態保持一致。
        S.count = countOptions.reduce(function (best, n) {
          return Math.abs(n - S.count) < Math.abs(best - S.count) ? n : best;
        }, countOptions[0]);
      }
    }

    var partSelect = Util.h('select.select', {
      id: 'lsPart',
      onChange: function (e) { S.part = e.target.value; rerender(); }
    }, available.map(function (a) {
      return Util.h('option', { value: a.key, selected: a.key === S.part, disabled: a.n === 0 },
        a.label + (a.n === 0 ? '（無資料）' : '（' + a.n + ' 組）'));
    }));

    var countSelect = Util.h('select.select', {
      id: 'lsCount',
      onChange: function (e) { S.count = parseInt(e.target.value, 10); }
    }, countOptions.map(function (n) {
      return Util.h('option', { value: n, selected: n === S.count }, n + ' 組');
    }));

    var playSelect = Util.h('select.select', {
      id: 'lsPlayCount',
      onChange: function (e) { S.playCount = parseInt(e.target.value, 10); }
    }, [1, 2].map(function (n) {
      return Util.h('option', { value: n, selected: n === S.playCount }, n + ' 次');
    }));

    var rateLabel = Util.h('span', {}, S.rate.toFixed(1) + 'x');
    var rateInput = Util.h('input.input', {
      type: 'range', min: '0.8', max: '1.2', step: '0.1', value: String(S.rate),
      onInput: function (e) {
        S.rate = parseFloat(e.target.value);
        rateLabel.textContent = S.rate.toFixed(1) + 'x';
      }
    });

    var transcriptCheckbox = Util.h('input', {
      type: 'checkbox', checked: S.showTranscriptAfter,
      onChange: function (e) { S.showTranscriptAfter = e.target.checked; }
    });

    var noTTSNotice = !ttsReady()
      ? Util.h('p.u-text-muted', {}, '⚠️ 此瀏覽器不支援語音朗讀，將直接顯示逐字稿供閱讀作答。')
      : null;

    container.appendChild(Util.h('div.card', {},
      Util.h('div.card-body', {},
        Util.h('div.field', {}, Util.h('label.field-label', { for: 'lsPart' }, '選擇 Part'), partSelect),
        Util.h('div.field', {}, Util.h('label.field-label', { for: 'lsCount' }, '題數'), countSelect),
        Util.h('div.field', {}, Util.h('label.field-label', { for: 'lsPlayCount' }, '播放次數'), playSelect),
        Util.h('div.field', {},
          Util.h('label.field-label', {}, '語速'),
          Util.h('div.u-flex.u-items-center.u-gap-sm', {}, rateInput, rateLabel)
        ),
        Util.h('label.checkbox-row', {}, transcriptCheckbox, Util.h('span', {}, '作答後顯示逐字稿')),
        noTTSNotice,
        Util.h('div.card-actions', {},
          Util.h('button.btn.btn-primary.btn-block', { onClick: startSession }, '開始聽力練習')
        )
      )
    ));
  }

  function startSession() {
    var raw = getData(S.part);
    var n = Util.clamp(S.count, 1, raw.length || 1);
    var picked = raw.length ? Util.sample(raw, n) : [];
    S.units = picked.map(function (item) { return buildUnit(S.part, item); });
    S.index = 0;
    S.answers = {};
    S.playsUsedMap = {};
    S.isPlayingUnitId = null;
    S.sceneExpanded = {};
    S.elapsedSec = 0;
    S.resultSummary = null;
    S.hasEnglishVoiceChecked = false;
    S.hasEnglishVoice = null;
    if (S.units.length === 0) {
      Util.toast('此 Part 目前沒有可用題目', 'warning');
      return;
    }
    S.phase = 'session';
    startTimer();
    checkEnglishVoice();
    rerender();
  }

  function resetToSetup() {
    S.phase = 'setup';
    S.units = [];
    S.answers = {};
    S.index = 0;
    S.resultSummary = null;
    rerender();
  }

  // ---------------------------------------------------------------------
  // 渲染：session
  // ---------------------------------------------------------------------

  function renderOptions(q, hideText) {
    var answered = S.answers.hasOwnProperty(q.qid);
    var selected = S.answers[q.qid];
    return Util.h('div.option-list', {}, q.options.map(function (optText, i) {
      var isCorrect = i === q.answer;
      var isSelected = selected === i;
      var cls = ['option-btn'];
      if (answered) {
        if (isCorrect) cls.push('is-correct');
        else if (isSelected) cls.push('is-incorrect');
      } else if (isSelected) {
        cls.push('is-selected');
      }
      var showText = !hideText || answered;
      return Util.h('button', { class: cls, disabled: answered, onClick: function () { selectAnswer(q, i); } },
        Util.h('span.option-label', {}, LETTERS[i]),
        showText ? Util.h('span.option-text', {}, optText) : null,
        answered && isCorrect ? Util.h('span.option-mark', {}, '✓')
          : (answered && isSelected && !isCorrect ? Util.h('span.option-mark', {}, '✗') : null)
      );
    }));
  }

  function playbackControls(unit, noTTS) {
    if (noTTS) {
      return Util.h('div.card', {}, Util.h('div.card-body', {},
        Util.h('p.u-text-muted', {}, '⚠️ 此瀏覽器不支援語音朗讀，請閱讀下方逐字稿作答。')
      ));
    }
    var used = S.playsUsedMap[unit.id] || 0;
    var remaining = S.playCount - used;
    var playing = S.isPlayingUnitId === unit.id;
    var label = used === 0 ? '▶ 播放音檔' : '▶ 重播（剩 ' + Math.max(remaining, 0) + ' 次）';
    return Util.h('div.card', {}, Util.h('div.card-body', {},
      Util.h('div.u-flex.u-items-center.u-gap-sm', {},
        playing
          ? Util.h('button.btn.btn-danger', { onClick: stopPlayback }, '■ 停止播放')
          : Util.h('button.btn.btn-primary', {
              disabled: remaining <= 0 || !!S.isPlayingUnitId,
              onClick: function () { playUnit(unit); }
            }, label),
        Util.h('span.u-text-muted', {}, playing ? '🔊 播放中…' : ('已播放 ' + used + ' / ' + S.playCount + ' 次'))
      )
    ));
  }

  function sceneEnToggle(unit) {
    var expanded = !!S.sceneExpanded[unit.id];
    return Util.h('div', {},
      Util.h('button.btn.btn-ghost.btn-sm', {
        onClick: function () {
          var next = Object.assign({}, S.sceneExpanded);
          next[unit.id] = !expanded;
          S.sceneExpanded = next;
          rerender();
        }
      }, expanded ? '收合英文原文' : '展開英文原文'),
      expanded ? Util.h('p.u-text-secondary', {}, unit.raw.scene_en) : null
    );
  }

  function transcriptPanel(unit) {
    return Util.h('div.card', {}, Util.h('div.card-body', {},
      Util.h('h3', {}, '逐字稿'),
      Util.h('div.u-flex-col.u-gap-sm', {},
        unit.transcriptLines.map(function (line) { return Util.h('p', {}, line); })
      )
    ));
  }

  function explanationPanel(unit) {
    return Util.h('div.card', {}, Util.h('div.card-body', {},
      Util.h('h3', {}, '解析'),
      unit.questions.map(function (q, i) {
        var correctLetter = LETTERS[q.answer];
        var yourIdx = S.answers[q.qid];
        var yourLetter = yourIdx !== undefined ? LETTERS[yourIdx] : '—';
        var isRight = yourIdx === q.answer;
        return Util.h('div', { class: i > 0 ? ['u-mt-md'] : null },
          unit.questions.length > 1 ? Util.h('p.u-text-secondary', {}, '第 ' + (i + 1) + ' 題') : null,
          Util.h('p', {},
            Util.h('strong', {}, '正確答案：' + correctLetter),
            '　你的答案：' + yourLetter + (isRight ? '（答對 ✓）' : '（答錯 ✗）')
          ),
          Util.h('p.u-text-secondary', {}, q.explanation_zh || '')
        );
      })
    ));
  }

  function unitCard(unit, noTTS) {
    var answered = isUnitAnswered(unit);
    var body = [];

    if (unit.kind === 'P1') {
      body.push(Util.h('div.card', {}, Util.h('div.card-body', {},
        Util.h('h3', {}, '情境描述'),
        Util.h('p', {}, unit.raw.scene_zh || ''),
        unit.raw.scene_en ? sceneEnToggle(unit) : null
      )));
      body.push(playbackControls(unit, noTTS));
      body.push(Util.h('div.card', {}, Util.h('div.card-body', {},
        Util.h('h3', {}, '選出符合描述的敘述'),
        renderOptions(unit.questions[0], !noTTS)
      )));
    } else if (unit.kind === 'P2') {
      body.push(playbackControls(unit, noTTS));
      body.push(Util.h('div.card', {}, Util.h('div.card-body', {},
        Util.h('h3', {}, '選出最適合的回答'),
        renderOptions(unit.questions[0], !noTTS)
      )));
    } else {
      var kindLabel = unit.kind === 'P4' ? (P4_KIND_LABELS[unit.raw.kind] || unit.raw.kind) : null;
      body.push(Util.h('div.card', {}, Util.h('div.card-body', {},
        Util.h('div.u-flex.u-items-center.u-gap-sm', {},
          Util.h('h3', {}, unit.kind === 'P3' ? '簡短對話' : '簡短獨白'),
          kindLabel ? Util.h('span.badge.badge-primary', {}, kindLabel) : null
        ),
        unit.raw.setting_zh ? Util.h('p.u-text-secondary', {}, '情境：' + unit.raw.setting_zh) : null
      )));
      body.push(playbackControls(unit, noTTS));
      body.push(Util.h('div.card', {}, Util.h('div.card-body', {},
        Util.h('p.u-text-muted', {}, '💡 小技巧：播放前可先閱讀下方題目與選項，掌握重點方向。'),
        unit.questions.map(function (q, i) {
          return Util.h('div', { class: i > 0 ? ['u-mt-md'] : null },
            Util.h('h4', {}, '第 ' + (i + 1) + ' 題：' + q.prompt),
            renderOptions(q, false)
          );
        })
      )));
    }

    var showTranscriptNow = answered
      ? S.showTranscriptAfter
      : (noTTS && (unit.kind === 'P3' || unit.kind === 'P4'));
    if (showTranscriptNow) body.push(transcriptPanel(unit));
    if (answered) body.push(explanationPanel(unit));

    return Util.h('div', {}, body);
  }

  function goToIndex(newIndex) {
    if (window.TTS) TTS.stop();
    S.isPlayingUnitId = null;
    S.playToken = (S.playToken || 0) + 1;
    S.index = newIndex;
    rerender();
  }

  function renderSession() {
    var unit = currentUnit();
    renderHeader('Part ' + S.part.slice(1) + ' · 第 ' + (S.index + 1) + ' / ' + S.units.length + ' 題組');

    container.appendChild(Util.h('div.u-flex.u-items-center.u-gap-sm.u-mt-md', {},
      Util.h('span.pill', {}, '⏱ ', Util.h('span', { id: 'lsTimer' }, Util.fmtTime(S.elapsedSec))),
      Util.h('div.progress-bar', { style: { flex: '1' } },
        Util.h('div.progress-bar-fill', { style: { width: Util.pct(S.index, S.units.length) + '%' } })
      ),
      Util.h('span.u-text-muted', {}, (S.index + 1) + '/' + S.units.length)
    ));

    if (ttsReady() && S.hasEnglishVoiceChecked && !S.hasEnglishVoice) {
      container.appendChild(Util.h('div.card.u-mt-md', {}, Util.h('div.card-body', {},
        Util.h('p.u-text-muted', {}, '⚠️ ' + ((window.TTS && TTS.NO_ENGLISH_VOICE_HINT) ||
          '未偵測到英文語音，播放可能不標準；建議在作業系統安裝英文語音，或作答後閱讀逐字稿練習。'))
      )));
    }

    container.appendChild(unitCard(unit, !ttsReady()));

    var answered = isUnitAnswered(unit);
    container.appendChild(Util.h('div.u-flex.u-justify-between.u-mt-md', {},
      Util.h('button.btn.btn-ghost', {
        disabled: S.index === 0,
        onClick: function () { goToIndex(S.index - 1); }
      }, '← 上一組'),
      S.index < S.units.length - 1
        ? Util.h('button.btn.btn-primary', {
            disabled: !answered,
            onClick: function () { goToIndex(S.index + 1); }
          }, '下一組 →')
        : Util.h('button.btn.btn-primary', { disabled: !answered, onClick: finishSession }, '完成，查看結果')
    ));
  }

  function finishSession() {
    stopTimer();
    if (window.TTS) TTS.stop();

    var total = 0, correct = 0, wrongIds = [];
    S.units.forEach(function (u) {
      u.questions.forEach(function (q) {
        total += 1;
        var ans = S.answers[q.qid];
        if (ans === q.answer) correct += 1;
        else wrongIds.push(q.qid);
      });
    });

    try {
      if (window.Store) {
        Store.recordQuiz({
          mode: 'listening', part: S.part, total: total, correct: correct,
          seconds: S.elapsedSec, wrongIds: wrongIds
        });
        if (S.taskId) Store.completeTask(S.taskId);
      }
    } catch (e) {
      Util.toast('紀錄成績失敗：' + e.message, 'error');
    }

    S.resultSummary = { total: total, correct: correct, seconds: S.elapsedSec };
    S.phase = 'result';
    rerender();
  }

  function renderResult() {
    renderHeader('本次聽力練習結果');
    var r = S.resultSummary || { total: 0, correct: 0, seconds: 0 };
    var pct = Util.pct(r.correct, r.total);

    container.appendChild(Util.h('div.stat-grid', {},
      Util.h('div.stat-card', {}, Util.h('div.stat-value', {}, pct + '%'), Util.h('div.stat-label', {}, '正確率')),
      Util.h('div.stat-card', {}, Util.h('div.stat-value', {}, r.correct + '/' + r.total), Util.h('div.stat-label', {}, '答對題數')),
      Util.h('div.stat-card', {}, Util.h('div.stat-value', {}, Util.fmtTime(r.seconds)), Util.h('div.stat-label', {}, '花費時間'))
    ));

    if (S.taskId) {
      container.appendChild(Util.h('p.u-text-secondary.u-mt-md', {}, '✅ 已完成今日任務。'));
    }

    container.appendChild(Util.h('div.u-flex.u-gap-sm.u-mt-md', {},
      Util.h('button.btn.btn-primary', { onClick: resetToSetup }, '再練習一組'),
      Util.h('button.btn.btn-ghost', {
        onClick: function () { if (window.App && App.navigate) App.navigate('#/review'); }
      }, '查看錯題本')
    ));
  }

  // ---------------------------------------------------------------------
  // 主渲染分派
  // ---------------------------------------------------------------------

  function rerender() {
    if (!container) return;
    container.innerHTML = '';
    if (S.phase === 'setup') renderSetup();
    else if (S.phase === 'session') renderSession();
    else renderResult();
  }

  function render(containerEl, params) {
    container = containerEl;
    var settings = (window.Store && Store.get().settings) || {};
    var p = params || {};
    var initialPart = /^P[1-4]$/.test(p.part || '') ? p.part : 'P1';
    var parsedCount = parseInt(p.count, 10);
    var initialCount = isNaN(parsedCount) || parsedCount <= 0 ? 10 : parsedCount;

    S = {
      phase: 'setup',
      part: initialPart,
      count: initialCount,
      playCount: 1,
      rate: Util.clamp(settings.ttsRate || 1.0, 0.8, 1.2),
      showTranscriptAfter: true,
      units: [],
      index: 0,
      answers: {},
      playsUsedMap: {},
      isPlayingUnitId: null,
      playToken: 0,
      elapsedSec: 0,
      sceneExpanded: {},
      resultSummary: null,
      taskId: p.task || null,
      hasEnglishVoiceChecked: false,
      hasEnglishVoice: null
    };

    rerender();
  }

  function destroy() {
    stopTimer();
    if (window.TTS) TTS.stop();
    if (S) S.playToken = (S.playToken || 0) + 1;
    S = null;
    container = null;
  }

  window.Views = window.Views || {};
  window.Views.listening = { render: render, destroy: destroy };
})();
