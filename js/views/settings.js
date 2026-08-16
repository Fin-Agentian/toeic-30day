/**
 * js/views/settings.js
 * 設定頁：開始日/考試日/每日分鐘、TTS 語速與聲音、主題、資料匯出/匯入、重置、版本與資料集統計。
 * 暴露：window.Views.settings = { render(container, params), destroy() }
 * 依賴：window.Util、window.Store、window.TTS（選用）、window.TOEIC_DATA（可能缺檔）。
 */
(function () {
  'use strict';

  var APP_VERSION = '1.0.0';
  var TOTAL_DAYS = 30;
  var RATE_MIN = 0.8;
  var RATE_MAX = 1.2;
  var RATE_STEP = 0.1;
  var SAMPLE_TEXT = 'Please submit your quarterly report to the finance department by Friday afternoon.';
  var THEME_OPTIONS = [
    { value: 'light', label: '☀️ 淺色模式' },
    { value: 'dark', label: '🌙 深色模式' },
    { value: 'auto', label: '🌓 跟隨系統' }
  ];
  var THEME_ICON = { light: '☀️', dark: '🌙', auto: '🌓' };
  var THEME_LABEL = { light: '淺色模式', dark: '深色模式', auto: '跟隨系統' };

  // 本 view 目前渲染狀態（每次 render() 重新初始化）
  var container = null;
  var changeListener = null;
  var destroyed = false;
  var cachedVoices = [];

  // -----------------------------------------------------------------
  // 資料存取
  // -----------------------------------------------------------------

  function hasStore() {
    return !!(window.Store && typeof Store.get === 'function');
  }

  function getState() {
    return hasStore() ? Store.get() : null;
  }

  function td(key) {
    return (window.TOEIC_DATA && window.TOEIC_DATA[key]) || null;
  }

  function countArr(v) {
    return Array.isArray(v) ? v.length : 0;
  }

  function sumQuestions(arr) {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce(function (n, item) {
      return n + (item && Array.isArray(item.questions) ? item.questions.length : 0);
    }, 0);
  }

  function countPlanTasks(plan) {
    if (!plan || !Array.isArray(plan.days)) return 0;
    var n = 0;
    plan.days.forEach(function (d) {
      n += (d.tasks || []).length;
    });
    return n;
  }

  // -----------------------------------------------------------------
  // 共用小工具
  // -----------------------------------------------------------------

  function applyThemeToDocument(theme) {
    var root = document.documentElement;
    if (theme === 'dark' || theme === 'light') {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = THEME_ICON[theme] || THEME_ICON.auto;
      btn.setAttribute('aria-label', '目前主題：' + (THEME_LABEL[theme] || THEME_LABEL.auto) + '，點擊切換');
      btn.setAttribute('title', THEME_LABEL[theme] || THEME_LABEL.auto);
    }
  }

  function copyToClipboard(text, textareaEl) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(function () {
        Util.toast('已複製到剪貼簿', 'success');
      }, function () {
        fallbackCopy(textareaEl);
      });
      return;
    }
    fallbackCopy(textareaEl);
  }

  function fallbackCopy(textareaEl) {
    try {
      textareaEl.focus();
      textareaEl.select();
      var ok = document.execCommand('copy');
      Util.toast(ok ? '已複製到剪貼簿' : '複製失敗，請手動選取文字複製', ok ? 'success' : 'error');
    } catch (e) {
      Util.toast('複製失敗，請手動選取文字複製', 'error');
    }
  }

  // -----------------------------------------------------------------
  // 區塊：頁首
  // -----------------------------------------------------------------

  function buildHeader() {
    var dayIdx = hasStore() && typeof Store.getDayIndex === 'function' ? Store.getDayIndex() : 0;
    var daysToExam = hasStore() && typeof Store.daysToExam === 'function' ? Store.daysToExam() : null;
    var subtitleParts = ['Day ' + (dayIdx || 0) + '/' + TOTAL_DAYS];
    if (daysToExam !== null) subtitleParts.push('距考試 ' + daysToExam + ' 天');

    return Util.h(
      'div.view-header',
      {},
      Util.h(
        'div.view-title',
        {},
        Util.h('h1', {}, '設定'),
        Util.h('p.view-subtitle', {}, subtitleParts.join(' · '))
      )
    );
  }

  // -----------------------------------------------------------------
  // 區塊：學習計畫（開始日／考試日／每日分鐘）
  // -----------------------------------------------------------------

  function confirmStartDateChange(oldDate, newDate, inputEl) {
    var closeModal = Util.modal({
      title: '確定要變更開始日期嗎？',
      body: Util.h(
        'div',
        {},
        Util.h('p', {}, '變更開始日期會重新計算「今天是第幾天」，可能影響 30 天計畫的日期對應與今日任務顯示，但不會刪除任何已完成紀錄、答題歷史或單字進度。'),
        Util.h('p.u-text-muted', {}, '開始日期：' + oldDate + ' → ' + newDate)
      ),
      actions: [
        {
          label: '取消',
          class: 'btn btn-ghost',
          onClick: function (close) {
            inputEl.value = oldDate;
            close();
          }
        },
        {
          label: '確定變更',
          class: 'btn btn-primary',
          onClick: function (close) {
            Store.update('startDate', newDate);
            close();
            Util.toast('已更新開始日期', 'success');
          }
        }
      ]
    });
    return closeModal;
  }

  function buildPlanCard(state) {
    var startDateInput = Util.h('input.input', {
      type: 'date',
      id: 'settingsStartDate',
      value: state.startDate,
      onChange: function (e) {
        var newDate = e.target.value;
        if (!newDate || newDate === state.startDate) return;
        confirmStartDateChange(state.startDate, newDate, startDateInput);
      }
    });

    var examDateInput = Util.h('input.input', {
      type: 'date',
      id: 'settingsExamDate',
      value: state.examDate,
      onChange: function (e) {
        var newDate = e.target.value;
        if (!newDate) {
          e.target.value = state.examDate;
          Util.toast('考試日期不可留空', 'warning');
          return;
        }
        Store.update('examDate', newDate);
        Util.toast('已更新考試日期', 'success');
      }
    });

    var minutesInput = Util.h('input.input', {
      type: 'number',
      id: 'settingsDailyMinutes',
      min: '15',
      step: '15',
      value: String(state.dailyMinutes),
      onChange: function (e) {
        var n = parseInt(e.target.value, 10);
        if (isNaN(n) || n < 15) {
          e.target.value = String(state.dailyMinutes);
          Util.toast('請輸入至少 15 的整數分鐘數', 'warning');
          return;
        }
        Store.update('dailyMinutes', n);
        Util.toast('已更新每日可用時數', 'success');
      }
    });

    return Util.h(
      'div.card',
      {},
      Util.h('div.card-header', {}, Util.h('div.card-title', {}, '學習計畫')),
      Util.h(
        'div.card-body',
        {},
        Util.h(
          'div.field',
          {},
          Util.h('label.field-label', { for: 'settingsStartDate' }, '開始日期'),
          startDateInput,
          Util.h('p.field-hint', {}, '影響「今天是 Day 幾」的計算，變更前會請你確認。')
        ),
        Util.h(
          'div.field',
          {},
          Util.h('label.field-label', { for: 'settingsExamDate' }, '考試日期'),
          examDateInput,
          Util.h('p.field-hint', {}, '預設 2026-09-20，用於頁首「距考試 N 天」倒數。')
        ),
        Util.h(
          'div.field',
          {},
          Util.h('label.field-label', { for: 'settingsDailyMinutes' }, '每日可用分鐘'),
          minutesInput,
          Util.h('p.field-hint', {}, '用來評估每日任務量是否吃得消（僅供參考，不會自動調整計畫）。')
        )
      )
    );
  }

  // -----------------------------------------------------------------
  // 區塊：TTS 語音設定
  // -----------------------------------------------------------------

  function findVoiceByName(name) {
    if (!name) return null;
    for (var i = 0; i < cachedVoices.length; i++) {
      if (cachedVoices[i].name === name) return cachedVoices[i];
    }
    return null;
  }

  function populateVoiceSelect(selectEl, currentVoiceName, hintEl) {
    if (!window.TTS || typeof TTS.voices !== 'function') return;
    TTS.voices().then(function (list) {
      if (destroyed) return;
      cachedVoices = list || [];
      selectEl.innerHTML = '';
      selectEl.appendChild(Util.h('option', { value: '' }, '系統預設'));
      cachedVoices.forEach(function (v) {
        selectEl.appendChild(Util.h('option', { value: v.name }, v.name + '（' + v.lang + '）'));
      });
      selectEl.value = findVoiceByName(currentVoiceName) ? currentVoiceName : '';
      if (cachedVoices.length === 0) {
        selectEl.innerHTML = '';
        selectEl.appendChild(Util.h('option', { value: '' }, '沒有可用語音'));
        selectEl.disabled = true;
        // 沒有偵測到英文語音時，用同一段安裝提示取代原本的一般說明文字，而不是留一個空選單。
        if (hintEl) {
          hintEl.textContent = (window.TTS && TTS.NO_ENGLISH_VOICE_HINT) ||
            '未偵測到英文語音，建議在作業系統安裝英文語音。';
        }
      }
    });
  }

  function buildTtsCard(state) {
    var supported = !!(window.TTS && TTS.isSupported());
    var rate = typeof state.settings.ttsRate === 'number' ? state.settings.ttsRate : 1.0;

    var rateLabel = Util.h('span.badge.badge-primary', {}, '語速 ' + rate.toFixed(1) + 'x');
    var rateInput = Util.h('input', {
      type: 'range',
      id: 'settingsTtsRate',
      min: String(RATE_MIN),
      max: String(RATE_MAX),
      step: String(RATE_STEP),
      value: String(rate),
      style: { width: '100%' },
      onInput: function (e) {
        var v = parseFloat(e.target.value);
        rateLabel.textContent = '語速 ' + v.toFixed(1) + 'x';
      },
      onChange: function (e) {
        var v = parseFloat(e.target.value);
        if (isNaN(v)) return;
        Store.update('settings.ttsRate', v);
      }
    });

    var voiceSelect = Util.h('select.select', {
      id: 'settingsTtsVoice',
      disabled: !supported,
      onChange: function (e) {
        Store.update('settings.ttsVoice', e.target.value);
      }
    }, Util.h('option', { value: '' }, supported ? '載入中…' : '不支援語音朗讀'));

    var voiceHint = Util.h('p.field-hint', {}, '不同瀏覽器/系統提供的語音清單不同；留空表示由程式自動挑選。');

    if (supported) populateVoiceSelect(voiceSelect, state.settings.ttsVoice, voiceHint);

    var testBtn = Util.h('button.btn.btn-primary.btn-sm', {
      type: 'button',
      disabled: !supported,
      onClick: function () {
        if (!window.TTS) return;
        var voice = findVoiceByName(voiceSelect.value);
        TTS.stop();
        TTS.speak(SAMPLE_TEXT, { rate: parseFloat(rateInput.value), voice: voice || undefined });
      }
    }, '🔊 測試播放');

    var stopBtn = Util.h('button.btn.btn-ghost.btn-sm', {
      type: 'button',
      disabled: !supported,
      onClick: function () {
        if (window.TTS) TTS.stop();
      }
    }, '⏹ 停止');

    return Util.h(
      'div.card',
      {},
      Util.h('div.card-header', {}, Util.h('div.card-title', {}, '語音朗讀（TTS）')),
      Util.h(
        'div.card-body',
        {},
        !supported ? Util.h('p.u-text-muted', {}, '此瀏覽器不支援 Web Speech API，語音相關功能將無法發聲。') : null,
        Util.h(
          'div.field',
          {},
          Util.h(
            'div.u-flex.u-items-center.u-justify-between',
            {},
            Util.h('label.field-label', { for: 'settingsTtsRate' }, '語速（0.8x–1.2x）'),
            rateLabel
          ),
          rateInput,
          Util.h('p.field-hint', {}, '拖曳調整播放速度，鬆開後自動儲存。')
        ),
        Util.h(
          'div.field',
          {},
          Util.h('label.field-label', { for: 'settingsTtsVoice' }, '語音聲音'),
          voiceSelect,
          voiceHint
        ),
        Util.h('div.card-actions', {}, testBtn, stopBtn)
      )
    );
  }

  // -----------------------------------------------------------------
  // 區塊：主題
  // -----------------------------------------------------------------

  function buildThemeCard(state) {
    var themeSelect = Util.h(
      'select.select',
      {
        id: 'settingsTheme',
        onChange: function (e) {
          var value = e.target.value;
          Store.update('settings.theme', value);
          applyThemeToDocument(value);
          Util.toast('已切換主題：' + (THEME_LABEL[value] || value), 'success');
        }
      },
      THEME_OPTIONS.map(function (opt) {
        return Util.h('option', { value: opt.value, selected: opt.value === state.settings.theme }, opt.label);
      })
    );

    return Util.h(
      'div.card',
      {},
      Util.h('div.card-header', {}, Util.h('div.card-title', {}, '外觀')),
      Util.h(
        'div.card-body',
        {},
        Util.h(
          'div.field',
          {},
          Util.h('label.field-label', { for: 'settingsTheme' }, '主題'),
          themeSelect,
          Util.h('p.field-hint', {}, '跟隨系統會依裝置的淺色/深色設定自動切換，也可用頂欄按鈕快速切換。')
        )
      )
    );
  }

  // -----------------------------------------------------------------
  // 區塊：匯出 / 匯入
  // -----------------------------------------------------------------

  function buildExportCard() {
    var jsonStr = hasStore() ? Store.export() : '{}';

    var exportTextarea = Util.h('textarea.textarea', {
      id: 'settingsExportArea',
      rows: 8,
      readOnly: true,
      value: jsonStr,
      style: { fontFamily: 'monospace', fontSize: '0.78rem' }
    });

    var copyBtn = Util.h('button.btn.btn-primary.btn-sm', {
      type: 'button',
      onClick: function () {
        copyToClipboard(jsonStr, exportTextarea);
      }
    }, '📋 複製到剪貼簿');

    var downloadLink = Util.h('a.btn.btn-ghost.btn-sm', {
      href: 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr),
      download: 'toeic30-backup-' + Util.todayISO() + '.json'
    }, '⬇️ 下載 JSON 檔');

    return Util.h(
      'div.card',
      {},
      Util.h('div.card-header', {}, Util.h('div.card-title', {}, '資料匯出')),
      Util.h(
        'div.card-body',
        {},
        Util.h('p.field-hint', {}, '複製或下載目前的學習紀錄與設定，可作為備份或轉移到其他裝置。'),
        exportTextarea,
        Util.h('div.card-actions.u-mt-md', {}, copyBtn, downloadLink)
      )
    );
  }

  function buildImportCard() {
    var importTextarea = Util.h('textarea.textarea', {
      id: 'settingsImportArea',
      rows: 8,
      placeholder: '貼上先前匯出的 JSON 內容……',
      style: { fontFamily: 'monospace', fontSize: '0.78rem' }
    });

    var importBtn = Util.h('button.btn.btn-primary.btn-sm', {
      type: 'button',
      onClick: function () {
        var text = importTextarea.value.trim();
        if (!text) {
          Util.toast('請先貼上 JSON 內容', 'warning');
          return;
        }
        try {
          Store.import(text);
          Util.toast('匯入成功，已更新所有設定與紀錄', 'success');
        } catch (e) {
          Util.toast('匯入失敗：' + e.message, 'error');
        }
      }
    }, '📥 匯入');

    return Util.h(
      'div.card',
      {},
      Util.h('div.card-header', {}, Util.h('div.card-title', {}, '資料匯入')),
      Util.h(
        'div.card-body',
        {},
        Util.h('p.field-hint', {}, '貼上先前匯出的 JSON，會整份取代目前的紀錄與設定，請先確認來源正確。'),
        importTextarea,
        Util.h('div.card-actions.u-mt-md', {}, importBtn)
      )
    );
  }

  // -----------------------------------------------------------------
  // 區塊：重置
  // -----------------------------------------------------------------

  function openResetModal() {
    var confirmInput = Util.h('input.input', {
      type: 'text',
      placeholder: '輸入 RESET',
      'aria-label': '輸入 RESET 以確認重置',
      onInput: function (e) {
        var btn = Util.$('.js-settings-reset-confirm');
        if (btn) btn.disabled = e.target.value.trim() !== 'RESET';
      }
    });

    Util.modal({
      title: '確定要重置所有進度嗎？',
      body: Util.h(
        'div',
        {},
        Util.h('p', {}, '此動作無法復原，將清除所有作答紀錄、錯題本、單字 SRS 進度、連續天數與已完成任務，並把開始日期重設為今天。'),
        Util.h(
          'div.field',
          {},
          Util.h('label.field-label', {}, '請輸入 RESET 以確認'),
          confirmInput
        )
      ),
      actions: [
        { label: '取消', class: 'btn btn-ghost' },
        {
          label: '確定重置',
          class: 'btn btn-danger js-settings-reset-confirm',
          onClick: function (close) {
            if (confirmInput.value.trim() !== 'RESET') return;
            Store.reset();
            close();
            Util.toast('已重置所有進度', 'success');
          }
        }
      ]
    });

    var confirmBtn = Util.$('.js-settings-reset-confirm');
    if (confirmBtn) confirmBtn.disabled = true;
  }

  function buildResetCard() {
    return Util.h(
      'div.card',
      {},
      Util.h('div.card-header', {}, Util.h('div.card-title', {}, '重置')),
      Util.h(
        'div.card-body',
        {},
        Util.h('p.field-hint', {}, '清除所有本機儲存的學習紀錄與設定，回到初始狀態。建議重置前先匯出備份。'),
        Util.h(
          'div.card-actions',
          {},
          Util.h('button.btn.btn-danger.btn-sm', {
            type: 'button',
            onClick: openResetModal
          }, '🗑 重置所有進度')
        )
      )
    );
  }

  // -----------------------------------------------------------------
  // 區塊：版本與資料集統計
  // -----------------------------------------------------------------

  function statRow(label, value) {
    return Util.h('tr', {}, Util.h('td', {}, label), Util.h('td', {}, value));
  }

  function buildStatsCard(state) {
    var plan = td('plan');
    var listening = td('listening') || {};
    var isPersistent = hasStore() && typeof Store.isPersistent === 'function' ? Store.isPersistent() : true;
    var persistLabel = isPersistent ? '瀏覽器本機' : '僅本次工作階段';

    var rows = [
      statRow('技巧 Tips', countArr(td('tips')) + ' 則'),
      statRow('30 天計畫', (plan && Array.isArray(plan.days) ? plan.days.length : 0) + ' 天／' + countPlanTasks(plan) + ' 項任務'),
      statRow('單字 Vocab', countArr(td('vocab')) + ' 個'),
      statRow('P5 文法題', countArr(td('p5')) + ' 題'),
      statRow('P6 短文填空', countArr(td('p6')) + ' 篇／' + sumQuestions(td('p6')) + ' 題'),
      statRow('P7 閱讀測驗', countArr(td('p7')) + ' 篇／' + sumQuestions(td('p7')) + ' 題'),
      statRow('聽力 P1（照片描述）', countArr(listening.p1) + ' 題'),
      statRow('聽力 P2（應答問題）', countArr(listening.p2) + ' 題'),
      statRow('聽力 P3（簡短對話）', countArr(listening.p3) + ' 組／' + sumQuestions(listening.p3) + ' 題'),
      statRow('聽力 P4（簡短獨白）', countArr(listening.p4) + ' 組／' + sumQuestions(listening.p4) + ' 題')
    ];

    return Util.h(
      'div.card',
      {},
      Util.h(
        'div.card-header',
        {},
        Util.h('div.card-title', {}, '版本與資料集統計')
      ),
      Util.h(
        'div.card-body',
        {},
        Util.h(
          'p.u-text-muted',
          {},
          'App 版本 v' + APP_VERSION + ' · 資料格式版本 v' + (state.version != null ? state.version : '?')
        ),
        Util.h('p.u-text-muted', {}, '進度儲存：' + persistLabel),
        Util.h(
          'div.table-wrap.u-mt-md',
          {},
          Util.h(
            'table.table',
            {},
            Util.h('thead', {}, Util.h('tr', {}, Util.h('th', {}, '資料集'), Util.h('th', {}, '數量'))),
            Util.h('tbody', {}, rows)
          )
        )
      )
    );
  }

  // -----------------------------------------------------------------
  // 空狀態（Store 不可用時）
  // -----------------------------------------------------------------

  function storeMissingState() {
    return Util.h(
      'div.empty-state.empty-state-error',
      {},
      Util.h('div.empty-state-icon', { 'aria-hidden': 'true' }, '⚠️'),
      Util.h('h2', {}, '設定功能暫時無法使用'),
      Util.h('p', {}, '找不到儲存模組（Store），請重新整理頁面後再試一次。')
    );
  }

  // -----------------------------------------------------------------
  // 渲染主流程
  // -----------------------------------------------------------------

  function renderAll() {
    if (!container) return;
    container.innerHTML = '';

    if (!hasStore()) {
      container.appendChild(buildHeader());
      container.appendChild(storeMissingState());
      return;
    }

    var state = getState();

    container.appendChild(buildHeader());
    container.appendChild(Util.h('div.u-mt-md', {}, buildPlanCard(state)));
    container.appendChild(Util.h('div.u-mt-md', {}, buildTtsCard(state)));
    container.appendChild(Util.h('div.u-mt-md', {}, buildThemeCard(state)));
    container.appendChild(Util.h('div.u-mt-md', {}, buildExportCard()));
    container.appendChild(Util.h('div.u-mt-md', {}, buildImportCard()));
    container.appendChild(Util.h('div.u-mt-md', {}, buildResetCard()));
    container.appendChild(Util.h('div.u-mt-md', {}, buildStatsCard(state)));
  }

  // -----------------------------------------------------------------
  // Views 契約
  // -----------------------------------------------------------------

  function render(containerEl) {
    container = containerEl;
    destroyed = false;
    cachedVoices = [];

    changeListener = function () { renderAll(); };
    window.addEventListener('toeic30:change', changeListener);

    renderAll();
  }

  function destroy() {
    destroyed = true;
    if (changeListener) {
      window.removeEventListener('toeic30:change', changeListener);
      changeListener = null;
    }
    if (window.TTS && typeof TTS.stop === 'function') TTS.stop();
    container = null;
    cachedVoices = [];
  }

  window.Views = window.Views || {};
  window.Views.settings = { render: render, destroy: destroy };
})();
